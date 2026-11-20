import { eq, inArray } from "drizzle-orm";
import {
  describeSchoolYear,
  findSchoolYear,
  isYearGroup,
  receptionYear,
  type YearGroupAdjustment,
} from "../../curriculum/year-groups.js";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import { isEmailAddress, normaliseEmail } from "../auth/email-address.js";
import type { SignedInUser } from "../auth/signed-in-parent.js";
import type { Database } from "../database.js";
import type { ReachDatabase } from "../reach.js";
import {
  createParent,
  longestPersonNameLength,
} from "../people/create-people.js";
import { createInvite } from "../people/invites.js";
import { isPlainName } from "../plain-names.js";
import { loadSeenParentIds } from "../reach-rules.js";
import {
  children,
  familyParents,
  schoolParents,
  schools,
  users,
} from "../schema.js";
import {
  matchSchool,
  mostBulkRows,
  type InviteEmail,
  type PreviewedRow,
} from "./bulk-rows.js";
import { readCsvRecords, writeCsv } from "./csv.js";

const childHeadings = [
  "child_name",
  "birth_month",
  "birth_year",
  "year_group_adjustment",
  "parent_1_name",
  "parent_1_email",
  "parent_2_name",
  "parent_2_email",
] as const;

export const listFamilyHeadings = (staff: SignedInUser): string[] =>
  staff.isAdmin ? ["school", ...childHeadings] : [...childHeadings];

export const buildFamilyTemplate = (staff: SignedInUser): string => {
  const example = [
    "Mia",
    "3",
    "2020",
    "",
    "Jo Smith",
    "jo.smith@example.com",
    "Alex Smith",
    "alex.smith@example.com",
  ];
  return writeCsv([
    listFamilyHeadings(staff),
    staff.isAdmin ? ["Hillside Primary", ...example] : example,
  ]);
};

const earliestBirthYear = 2000;
const latestBirthYear = 2100;

interface RowParent {
  name: string;
  email: string;
  existing: { userId: string; familyId: string } | null;
}

interface RowChild {
  nickname: string;
  birthMonth: number;
  birthYear: number;
  yearGroupAdjustment: YearGroupAdjustment;
}

interface ValidFamilyRow {
  schoolId: string;
  schoolName: string;
  child: RowChild | null;
  parents: RowParent[];
}

export interface FamilyRow extends PreviewedRow {
  family: ValidFamilyRow | null;
  parentEmails: string[];
}

const readAdjustment = (typed: string): YearGroupAdjustment | undefined => {
  const adjustments: Record<string, YearGroupAdjustment> = {
    "": 0,
    "0": 0,
    "-1": -1,
    "+1": 1,
    "1": 1,
  };
  return adjustments[typed];
};

const readWholeNumber = (typed: string): number | undefined =>
  /^\d+$/.test(typed) ? Number(typed) : undefined;

const childKey = (familyKey: string, child: RowChild): string =>
  `${familyKey}|${child.nickname.toLowerCase()}|${String(child.birthMonth)}|${String(child.birthYear)}`;

/** Rows that share a Parent's email are one Family, however the rows are linked. */
const groupRowsIntoFamilies = (rows: readonly FamilyRow[]): number[][] => {
  const leaders = rows.map((_, index) => index);
  const findLeader = (index: number): number => {
    while (leaders[index] !== index) {
      index = leaders[index];
    }
    return index;
  };
  const firstRowByEmail = new Map<string, number>();
  rows.forEach(({ parentEmails }, index) => {
    for (const email of parentEmails) {
      const first = firstRowByEmail.get(email);
      if (first === undefined) {
        firstRowByEmail.set(email, index);
      } else {
        leaders[findLeader(index)] = findLeader(first);
      }
    }
  });
  const groups = new Map<number, number[]>();
  rows.forEach((_, index) => {
    const leader = findLeader(index);
    groups.set(leader, [...(groups.get(leader) ?? []), index]);
  });
  return [...groups.values()];
};

interface ExistingAdult {
  userId: string;
  roles: string[];
  familyId: string | null;
}

// Run as the database owner, like any email address check: a row may name a Parent outside the uploader's reach, which is then refused.
const loadExistingAdults = async (
  database: Pick<Database, "select">,
  emails: string[],
): Promise<Map<string, ExistingAdult>> => {
  if (emails.length === 0) {
    return new Map();
  }
  const adults = await database
    .select({
      userId: users.id,
      email: users.email,
      roles: users.roles,
      familyId: familyParents.familyId,
    })
    .from(users)
    .leftJoin(familyParents, eq(familyParents.userId, users.id))
    .where(inArray(users.email, emails));
  return new Map(adults.map(({ email, ...adult }) => [email, adult]));
};

// Run as the database owner too, for the Families of those existing Parents.
const loadExistingChildKeys = async (
  database: Pick<Database, "select">,
  familyIds: string[],
): Promise<Set<string>> => {
  if (familyIds.length === 0) {
    return new Set();
  }
  const familyChildren = await database
    .select({
      familyId: children.familyId,
      nickname: children.nickname,
      birthMonth: children.birthMonth,
      birthYear: children.birthYear,
    })
    .from(children)
    .where(inArray(children.familyId, familyIds));
  return new Set(
    familyChildren.flatMap(({ familyId, nickname, birthMonth, birthYear }) =>
      birthMonth === null || birthYear === null
        ? []
        : [
            childKey(familyId, {
              nickname,
              birthMonth,
              birthYear,
              yearGroupAdjustment: 0,
            }),
          ],
    ),
  );
};

interface PreviewParts {
  staff: SignedInUser;
  csv: string;
  moment: Date;
  ownerDatabase: Pick<Database, "select">;
  /** The upload itself, rather than its preview: a Teacher's preview never says an address is taken (#278, #291). */
  isUpload?: boolean;
}

export const notPlainNameProblem = (label: string): string =>
  `${label}'s name can't hold a line break, a link or a control character`;

export const takenOutsideReachProblem = (label: string): string =>
  `Someone in Wizzaroo already uses ${label}'s email, so the Admin adds this row`;

/** Marks every row valid or names its problem; a Family goes through only if every one of its rows is valid. */
export const previewFamilies = async (
  database: Pick<ReachDatabase, "select">,
  { staff, csv, moment, ownerDatabase, isUpload = false }: PreviewParts,
): Promise<FamilyRow[]> => {
  // A Teacher's file may keep the Admin's School column, which is ignored.
  const records = readCsvRecords(csv, listFamilyHeadings(staff), {
    optionalHeadings: staff.isAdmin ? [] : ["school"],
    mostRows: mostBulkRows,
  });
  const allSchools = await database
    .select({ id: schools.id, name: schools.name })
    .from(schools);
  const typedEmails = records.flatMap(({ cells }) =>
    ["parent_1_email", "parent_2_email"]
      .map((heading) => normaliseEmail(cells.get(heading) ?? ""))
      .filter((email) => email !== ""),
  );
  const existingAdults = await loadExistingAdults(ownerDatabase, typedEmails);
  const existingChildKeys = await loadExistingChildKeys(ownerDatabase, [
    ...new Set(
      [...existingAdults.values()].flatMap(({ familyId }) =>
        familyId === null ? [] : [familyId],
      ),
    ),
  ]);
  const seenParentIds = staff.isAdmin
    ? undefined
    : await loadSeenParentIds(database, staff, moment);

  const rows = records.map(({ rowNumber, cells }): FamilyRow => {
    const read = (heading: string): string => cells.get(heading) ?? "";
    const typedParents = [1, 2]
      .map((number) => ({
        name: read(`parent_${String(number)}_name`),
        typedEmail: read(`parent_${String(number)}_email`),
      }))
      .filter(({ name, typedEmail }) => name !== "" || typedEmail !== "");
    const parentEmails = typedParents
      .map(({ typedEmail }) => normaliseEmail(typedEmail))
      .filter((email) => email !== "");
    const childName = read("child_name");
    const summary = [
      childName === ""
        ? "No Child"
        : `${childName}, born ${read("birth_month")}/${read("birth_year")}`,
      ...typedParents.map(({ name, typedEmail }) => `${name} <${typedEmail}>`),
    ].join("; ");
    const reject = (problem: string): FamilyRow => ({
      rowNumber,
      summary,
      problem,
      family: null,
      parentEmails,
    });

    const { teaching } = staff;
    const school =
      staff.isAdmin || teaching === null
        ? matchSchool(read("school"), allSchools)
        : (() => {
            const own = allSchools.find(({ id }) => id === teaching.schoolId);
            return own?.name === null || own === undefined
              ? ({
                  kind: "problem",
                  problem: "Your School needs its name first",
                } as const)
              : ({ kind: "found", id: own.id, name: own.name } as const);
          })();
    if (school.kind === "problem") {
      return reject(school.problem);
    }

    let child: RowChild | null = null;
    if (
      childName !== "" ||
      read("birth_month") !== "" ||
      read("birth_year") !== ""
    ) {
      const birthMonth = readWholeNumber(read("birth_month"));
      const birthYear = readWholeNumber(read("birth_year"));
      const yearGroupAdjustment = readAdjustment(read("year_group_adjustment"));
      if (childName === "" || childName.length > 30) {
        return reject(
          "The Child's first name or nickname is missing or too long",
        );
      }
      if (birthMonth === undefined || birthMonth < 1 || birthMonth > 12) {
        return reject(
          `"${read("birth_month")}" isn't a birth month from 1 to 12`,
        );
      }
      if (
        birthYear === undefined ||
        birthYear < earliestBirthYear ||
        birthYear > latestBirthYear
      ) {
        return reject(`"${read("birth_year")}" isn't a birth year`);
      }
      if (yearGroupAdjustment === undefined) {
        return reject(
          "The Year Group adjustment can only be -1, 0, +1 or empty",
        );
      }
      child = {
        nickname: childName,
        birthMonth,
        birthYear,
        yearGroupAdjustment,
      };
      const schoolYear = findSchoolYear(child, moment);
      if (schoolYear < receptionYear) {
        return reject("This Child is too young for Reception");
      }
      if (
        !staff.isAdmin &&
        !(
          isYearGroup(schoolYear) &&
          teaching?.yearGroups.includes(schoolYear) === true
        )
      ) {
        return reject(
          `This Child works out as ${describeSchoolYear(schoolYear)}, outside your Year Groups`,
        );
      }
    }

    if (typedParents.length === 0) {
      return reject("Each row needs at least one Parent");
    }
    const parents: RowParent[] = [];
    for (const [index, { name, typedEmail }] of typedParents.entries()) {
      const label = `Parent ${String(index + 1)}`;
      const email = normaliseEmail(typedEmail);
      if (!isEmailAddress(email)) {
        return reject(
          `${label}'s email "${typedEmail}" isn't an email address`,
        );
      }
      if (!isPlainName(name)) {
        return reject(notPlainNameProblem(label));
      }
      const found = existingAdults.get(email);
      const isParent =
        found !== undefined &&
        found.roles.includes("parent") &&
        found.familyId !== null;
      // A Teacher adds a Child only to a Family in their reach, whatever School its Parent is at (#265, #277, ADR 0027).
      // Every other address with an account, staff included, is one they can't use, and it gets one answer that names
      // no role and no School. Their preview treats it as an address no one has, so it can't be used to look addresses
      // up; the upload then skips its row (#278, #291).
      const isTakenOutsideReach =
        found !== undefined &&
        seenParentIds !== undefined &&
        !(isParent && seenParentIds.has(found.userId));
      if (isTakenOutsideReach && isUpload) {
        return reject(takenOutsideReachProblem(label));
      }
      const existing = isTakenOutsideReach ? undefined : found;
      if (existing === undefined) {
        if (name === "" || name.length > longestPersonNameLength) {
          return reject(`${label}'s name is missing or too long`);
        }
        parents.push({ name, email, existing: null });
        continue;
      }
      if (!isParent || existing.familyId === null) {
        return reject(`${label}'s email belongs to someone who isn't a Parent`);
      }
      parents.push({
        name,
        email,
        existing: { userId: existing.userId, familyId: existing.familyId },
      });
    }
    const existingFamilyIds = new Set(
      parents.flatMap(({ existing }) =>
        existing === null ? [] : [existing.familyId],
      ),
    );
    if (existingFamilyIds.size > 1) {
      return reject("The two Parents are already in different Families");
    }
    const existingFamilyId = [...existingFamilyIds].at(0);
    if (
      child !== null &&
      existingFamilyId !== undefined &&
      existingChildKeys.has(childKey(existingFamilyId, child))
    ) {
      return reject(
        "This Family already has a Child with this name, birth month and year, so it looks like a duplicate",
      );
    }
    return {
      rowNumber,
      summary,
      problem: null,
      family: { schoolId: school.id, schoolName: school.name, child, parents },
      parentEmails,
    };
  });

  for (const group of groupRowsIntoFamilies(rows)) {
    const groupRows = group.map((index) => rows[index]);
    const existingFamilyIds = new Set(
      groupRows.flatMap(({ family }) =>
        (family?.parents ?? []).flatMap(({ existing }) =>
          existing === null ? [] : [existing.familyId],
        ),
      ),
    );
    const childKeys = new Set<string>();
    for (const row of groupRows) {
      const rowChild = row.family?.child ?? null;
      if (rowChild === null) {
        continue;
      }
      const key = childKey("file", rowChild);
      if (childKeys.has(key)) {
        row.problem =
          "This Child is on an earlier row of the same Family too, so it looks like a duplicate";
        row.family = null;
      }
      childKeys.add(key);
    }
    const firstProblemRow = groupRows.find(({ problem }) => problem !== null);
    const groupProblem =
      existingFamilyIds.size > 1
        ? "These rows link Parents who are already in different Families"
        : firstProblemRow === undefined
          ? undefined
          : `Skipped with the rest of its Family, because row ${String(firstProblemRow.rowNumber)} has a problem`;
    // Siblings are never split: one bad row holds back its whole Family.
    for (const row of groupProblem === undefined ? [] : groupRows) {
      row.problem ??= groupProblem ?? null;
      row.family = null;
    }
  }
  return rows;
};

interface FamilyCreation {
  rows: FamilyRow[];
  inviteEmails: InviteEmail[];
}

/** Previews within the uploader's reach, then creates as the owner, since a Teacher's connection only reads (ADR 0027). */
export const createFamiliesFromCsv = async (
  reachDatabase: ReachDatabase,
  {
    staff,
    csv,
    sendInvites,
    publicUrl,
    moment,
    ownerDatabase,
  }: Omit<PreviewParts, "ownerDatabase"> & {
    sendInvites: boolean;
    publicUrl: URL;
    ownerDatabase: Database;
  },
): Promise<FamilyCreation> => {
  const rows = await previewFamilies(reachDatabase, {
    staff,
    csv,
    moment,
    ownerDatabase,
    isUpload: true,
  });
  return ownerDatabase.transaction(async (transaction) => {
    const inviteEmails: InviteEmail[] = [];
    for (const group of groupRowsIntoFamilies(rows)) {
      const validRows = group.flatMap((index) => {
        const { family } = rows[index];
        return family === null ? [] : [family];
      });
      if (validRows.length !== group.length) {
        continue;
      }
      let familyId =
        validRows
          .flatMap(({ parents }) => parents)
          .find(({ existing }) => existing !== null)?.existing?.familyId ??
        null;
      const handledEmails = new Set<string>();
      for (const { parents, schoolId, schoolName } of validRows) {
        for (const parent of parents) {
          if (handledEmails.has(parent.email)) {
            continue;
          }
          handledEmails.add(parent.email);
          if (parent.existing !== null) {
            await transaction
              .insert(schoolParents)
              .values({ userId: parent.existing.userId, schoolId })
              .onConflictDoNothing();
            continue;
          }
          const created = await createParent(transaction, ownerDatabase, {
            name: parent.name,
            email: parent.email,
            schoolId,
            familyId,
            createdBy: buildUserActor(staff),
          });
          familyId = created.familyId;
          if (sendInvites) {
            const { invite, email } = await createInvite(
              transaction,
              publicUrl,
              {
                userId: created.userId,
                role: "parent",
                name: parent.name,
                email: parent.email,
                schoolName,
                createdByUserId: staff.userId,
                isEmailed: true,
              },
            );
            if (email !== null) {
              inviteEmails.push({ inviteId: invite.id, email });
            }
          }
        }
      }
      if (familyId === null) {
        throw new Error(
          "a valid Family from the upload ended up with no Family",
        );
      }
      for (const { child, schoolId } of validRows) {
        if (child !== null) {
          const [{ id: childId }] = await transaction
            .insert(children)
            .values({
              familyId,
              schoolId,
              nickname: child.nickname,
              birthMonth: child.birthMonth,
              birthYear: child.birthYear,
              yearGroupAdjustment: child.yearGroupAdjustment,
            })
            .returning({ id: children.id });
          await insertAuditLogEntry(transaction, {
            action: "child.created",
            actor: buildUserActor(staff),
            target: { type: "child", id: childId },
          });
        }
      }
    }
    return { rows, inviteEmails };
  });
};
