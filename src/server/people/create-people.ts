import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { YearGroup } from "../../curriculum/year-groups.js";
import { insertAuditLogEntry, type AuditActor } from "../audit/audit-log.js";
import {
  EmailAddressTakenError,
  NotAnEmailAddressError,
} from "../auth/email-address-check-routes.js";
import { isEmailAddress, normaliseEmail } from "../auth/email-address.js";
import type { Database } from "../database.js";
import { isPlainName, NameNotPlainError } from "../plain-names.js";
import type { ReachDatabase } from "../reach.js";
import {
  families,
  familyJoinRequests,
  familyParents,
  schoolParents,
  schools,
  teacherYearGroups,
  teachers,
  users,
} from "../schema.js";

export class SchoolNotNamedError extends Error {
  override readonly name = "SchoolNotNamedError";
  readonly statusCode = 409;

  constructor() {
    super("Give the School its name and town before bringing anyone into it");
  }
}

export class NameMissingError extends Error {
  override readonly name = "NameMissingError";
  readonly statusCode = 400;

  constructor() {
    super("Give their name");
  }
}

type Writer = Pick<ReachDatabase, "select" | "insert" | "update">;

export const longestPersonNameLength = 60;

export const readEmailAddress = (typedEmail: string): string => {
  const email = normaliseEmail(typedEmail);
  if (!isEmailAddress(email)) {
    throw new NotAnEmailAddressError();
  }
  return email;
};

export const readPersonName = (typedName: string): string => {
  const name = typedName.trim();
  if (name === "" || name.length > longestPersonNameLength) {
    throw new NameMissingError();
  }
  if (!isPlainName(name)) {
    throw new NameNotPlainError();
  }
  return name;
};

/** A School's name for Invites, which only a named School can send. */
export const loadNamedSchool = async (
  database: Pick<ReachDatabase, "select">,
  schoolId: string,
): Promise<{ id: string; name: string }> => {
  const school = (
    await database
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(eq(schools.id, schoolId))
  ).at(0);
  if (school === undefined || school.name === null) {
    throw new SchoolNotNamedError();
  }
  return { id: school.id, name: school.name };
};

/** Run as the database owner: an email address must be free across every account, not only those in reach. */
export const findUserIdByEmail = async (
  database: Pick<Database, "select">,
  email: string,
): Promise<string | undefined> => {
  const user = (
    await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
  ).at(0);
  return user?.id;
};

interface NewTeacher {
  name: string;
  email: string;
  schoolId: string;
  yearGroups: YearGroup[];
}

interface Creator {
  createdBy: AuditActor;
}

// New rows get their ids here rather than from RETURNING: a Teacher's reach can't see a new Parent until they're linked to the School.
export const createTeacher = async (
  transaction: Writer,
  ownerDatabase: Pick<Database, "select">,
  { name, email, schoolId, yearGroups, createdBy }: NewTeacher & Creator,
): Promise<string> => {
  if ((await findUserIdByEmail(ownerDatabase, email)) !== undefined) {
    throw new EmailAddressTakenError();
  }
  const userId = randomUUID();
  await transaction
    .insert(users)
    .values({ id: userId, email, name, roles: ["teacher"] });
  await transaction.insert(teachers).values({ userId, schoolId });
  await transaction
    .insert(teacherYearGroups)
    .values(yearGroups.map((yearGroup) => ({ userId, yearGroup })));
  await insertAuditLogEntry(transaction, {
    action: "teacher.created",
    actor: createdBy,
    target: { type: "user", id: userId },
  });
  return userId;
};

interface NewParent {
  name: string;
  email: string;
  schoolId: string;
  familyId: string | null;
}

/** A Parent's login at the School that brings them in, with no Family yet. */
const insertParentLogin = async (
  transaction: Writer,
  ownerDatabase: Pick<Database, "select">,
  { name, email, schoolId }: Omit<NewParent, "familyId">,
): Promise<string> => {
  if ((await findUserIdByEmail(ownerDatabase, email)) !== undefined) {
    throw new EmailAddressTakenError();
  }
  const userId = randomUUID();
  await transaction
    .insert(users)
    .values({ id: userId, email, name, roles: ["parent"] });
  await transaction
    .insert(schoolParents)
    .values({ userId, schoolId })
    .onConflictDoNothing();
  return userId;
};

/** A Parent joins the Family they are linked to, as a household's second adult, or starts a Family of their own. */
export const createParent = async (
  transaction: Writer,
  ownerDatabase: Pick<Database, "select">,
  { name, email, schoolId, familyId, createdBy }: NewParent & Creator,
): Promise<{ userId: string; familyId: string }> => {
  const userId = await insertParentLogin(transaction, ownerDatabase, {
    name,
    email,
    schoolId,
  });
  const parentFamilyId = familyId ?? randomUUID();
  if (familyId === null) {
    await transaction.insert(families).values({ id: parentFamilyId, name });
  }
  await transaction
    .insert(familyParents)
    .values({ userId, familyId: parentFamilyId });
  await insertAuditLogEntry(transaction, {
    action: "parent.created",
    actor: createdBy,
    target: { type: "user", id: userId },
    detail: parentFamilyId,
  });
  return { userId, familyId: parentFamilyId };
};

interface AskingToJoin {
  familyId: string;
  requestedByUserId: string;
}

/**
 * A household's next adult brought in by a Teacher: a login at the School, in no Family, with a request to join one.
 * They join it, and get an Invite, only once one of its Parents agrees, so a Teacher's read-only reach never makes
 * them a Parent of the Family (#264).
 */
export const createParentAskingToJoin = async (
  transaction: Writer,
  ownerDatabase: Pick<Database, "select">,
  {
    name,
    email,
    schoolId,
    familyId,
    requestedByUserId,
    createdBy,
  }: Omit<NewParent, "familyId"> & AskingToJoin & Creator,
): Promise<string> => {
  const userId = await insertParentLogin(transaction, ownerDatabase, {
    name,
    email,
    schoolId,
  });
  await transaction
    .insert(familyJoinRequests)
    .values({ userId, familyId, requestedByUserId });
  await insertAuditLogEntry(transaction, {
    action: "parent.created",
    actor: createdBy,
    target: { type: "user", id: userId },
    detail: `asks to join ${familyId}`,
  });
  return userId;
};
