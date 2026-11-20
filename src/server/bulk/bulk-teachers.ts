import { inArray } from "drizzle-orm";
import { isYearGroup, type YearGroup } from "../../curriculum/year-groups.js";
import { buildUserActor } from "../audit/audit-log.js";
import { isEmailAddress, normaliseEmail } from "../auth/email-address.js";
import type { SignedInUser } from "../auth/signed-in-parent.js";
import type { Database } from "../database.js";
import type { ReachDatabase } from "../reach.js";
import {
  createTeacher,
  longestPersonNameLength,
} from "../people/create-people.js";
import { createInvite } from "../people/invites.js";
import { isPlainName } from "../plain-names.js";
import { schools, users } from "../schema.js";
import { writeCsv, readCsvRecords } from "./csv.js";
import {
  matchSchool,
  mostBulkRows,
  type InviteEmail,
  type PreviewedRow,
} from "./bulk-rows.js";

export const teacherHeadings = [
  "name",
  "email",
  "school",
  "year_groups",
] as const;

export const teacherTemplate = writeCsv([
  [...teacherHeadings],
  ["Sam Patel", "sam.patel@school.example", "Hillside Primary", "2;3"],
]);

interface ValidTeacherRow {
  name: string;
  email: string;
  schoolId: string;
  schoolName: string;
  yearGroups: YearGroup[];
}

export interface TeacherRow extends PreviewedRow {
  teacher: ValidTeacherRow | null;
}

const readYearGroups = (typed: string): YearGroup[] | undefined => {
  const parts = typed
    .split(/[;\s]+/)
    .filter((part) => part !== "")
    .map((part) => Number(part.replace(/^year/i, "")));
  if (parts.length === 0 || !parts.every(isYearGroup)) {
    return undefined;
  }
  return [...new Set(parts)].toSorted((first, second) => first - second);
};

/** Marks every row valid or names its problem, without creating anything. */
export const previewTeachers = async (
  database: Pick<ReachDatabase, "select">,
  csv: string,
): Promise<TeacherRow[]> => {
  const records = readCsvRecords(csv, teacherHeadings, {
    mostRows: mostBulkRows,
  });
  const allSchools = await database
    .select({ id: schools.id, name: schools.name })
    .from(schools);
  const typedEmails = records.map(({ cells }) =>
    normaliseEmail(cells.get("email") ?? ""),
  );
  const takenEmails = new Set(
    typedEmails.length === 0
      ? []
      : (
          await database
            .select({ email: users.email })
            .from(users)
            .where(inArray(users.email, typedEmails))
        ).map(({ email }) => email),
  );
  const seenEmails = new Set<string>();

  return records.map(({ rowNumber, cells }): TeacherRow => {
    const name = cells.get("name") ?? "";
    const email = normaliseEmail(cells.get("email") ?? "");
    const typedSchool = cells.get("school") ?? "";
    const typedYearGroups = cells.get("year_groups") ?? "";
    const summary = `${name} <${email}>, ${typedSchool}, Years ${typedYearGroups}`;
    const reject = (problem: string): TeacherRow => ({
      rowNumber,
      summary,
      problem,
      teacher: null,
    });

    if (name === "" || name.length > longestPersonNameLength) {
      return reject("The name is missing or too long");
    }
    if (!isPlainName(name)) {
      return reject(
        "The name can't hold a line break, a link or a control character",
      );
    }
    if (!isEmailAddress(email)) {
      return reject(`"${cells.get("email") ?? ""}" isn't an email address`);
    }
    if (takenEmails.has(email)) {
      return reject("Someone in Wizzaroo already uses this email address");
    }
    if (seenEmails.has(email)) {
      return reject("This email address is on an earlier row too");
    }
    seenEmails.add(email);
    const school = matchSchool(typedSchool, allSchools);
    if (school.kind === "problem") {
      return reject(school.problem);
    }
    const yearGroups = readYearGroups(typedYearGroups);
    if (yearGroups === undefined) {
      return reject(
        `"${typedYearGroups}" isn't a list of Year Groups from 1 to 6, such as 2;3`,
      );
    }
    return {
      rowNumber,
      summary,
      problem: null,
      teacher: {
        name,
        email,
        schoolId: school.id,
        schoolName: school.name,
        yearGroups,
      },
    };
  });
};

interface TeacherCreation {
  rows: TeacherRow[];
  inviteEmails: InviteEmail[];
}

export const createTeachersFromCsv = async (
  reachDatabase: ReachDatabase,
  ownerDatabase: Pick<Database, "select">,
  {
    csv,
    sendInvites,
    admin,
    publicUrl,
  }: {
    csv: string;
    sendInvites: boolean;
    admin: SignedInUser;
    publicUrl: URL;
  },
): Promise<TeacherCreation> => {
  const rows = await previewTeachers(reachDatabase, csv);
  const inviteEmails: InviteEmail[] = [];
  for (const { teacher } of rows) {
    if (teacher === null) {
      continue;
    }
    const userId = await createTeacher(reachDatabase, ownerDatabase, {
      ...teacher,
      createdBy: buildUserActor(admin),
    });
    if (sendInvites) {
      const { invite, email } = await createInvite(reachDatabase, publicUrl, {
        userId,
        role: "teacher",
        name: teacher.name,
        email: teacher.email,
        schoolName: teacher.schoolName,
        createdByUserId: admin.userId,
        isEmailed: true,
      });
      if (email !== null) {
        inviteEmails.push({ inviteId: invite.id, email });
      }
    }
  }
  return { rows, inviteEmails };
};
