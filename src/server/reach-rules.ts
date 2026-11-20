import { and, eq, inArray, isNull, notExists, or, sql } from "drizzle-orm";
import { findSchoolYear, isYearGroup } from "../curriculum/year-groups.js";
import type { SignedInUser } from "./auth/signed-in-parent.js";
import type { ReachDatabase } from "./reach.js";
import {
  children,
  familyParents,
  schoolParents,
  schools,
  users,
} from "./schema.js";

export class ChildNotFoundError extends Error {
  override readonly name = "ChildNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("There's no such Child within your reach");
  }
}

export class ReadOnlyReachError extends Error {
  override readonly name = "ReadOnlyReachError";
  readonly statusCode = 403;

  constructor() {
    super(
      "Teachers can lock what a Child plays, but only the Child's Parents change anything else",
    );
  }
}

export class NotTheChildsTeacherError extends Error {
  override readonly name = "NotTheChildsTeacherError";
  readonly statusCode = 403;

  constructor() {
    super("Only the Child's Teachers and the Admin set Teacher locks");
  }
}

export class PersonNotFoundError extends Error {
  override readonly name = "PersonNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("There's no such person within your reach");
  }
}

export class SchoolNotFoundError extends Error {
  override readonly name = "SchoolNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("There's no such School within your reach");
  }
}

type Reader = Pick<ReachDatabase, "select">;

/** Who is asking, as the reach rules need it: always taken from their sign-in, never from the request. */
export type Caller = Pick<
  SignedInUser,
  "userId" | "isAdmin" | "familyId" | "teaching"
>;

export interface ChildPlacement {
  id: string;
  familyId: string;
  schoolId: string;
  birthMonth: number | null;
  birthYear: number | null;
  yearGroupAdjustment: -1 | 0 | 1;
}

export const childPlacementColumns = {
  id: children.id,
  familyId: children.familyId,
  schoolId: children.schoolId,
  birthMonth: children.birthMonth,
  birthYear: children.birthYear,
  yearGroupAdjustment: children.yearGroupAdjustment,
};

/** The Child's school year today, or null while their birth month and year haven't been given yet. */
export const findChildSchoolYear = (
  { birthMonth, birthYear, yearGroupAdjustment }: ChildPlacement,
  moment: Date,
): number | null =>
  birthMonth === null || birthYear === null
    ? null
    : findSchoolYear({ birthMonth, birthYear, yearGroupAdjustment }, moment);

const isInTeachersYearGroups = (
  caller: Caller,
  child: ChildPlacement,
  moment: Date,
): boolean => {
  const { teaching } = caller;
  if (teaching?.schoolId !== child.schoolId) {
    return false;
  }
  const schoolYear = findChildSchoolYear(child, moment);
  return isYearGroup(schoolYear) && teaching.yearGroups.includes(schoolYear);
};

/** A Parent sees their own Family, a Teacher the Children in their Year Groups at their School, and the Admin everyone. */
export const canSeeChild = (
  caller: Caller,
  child: ChildPlacement,
  moment: Date,
): boolean =>
  caller.isAdmin ||
  caller.familyId === child.familyId ||
  isInTeachersYearGroups(caller, child, moment);

/** Only a Child's own Parents, and the Admin, change how they play. */
export const canChangeChild = (
  caller: Caller,
  child: ChildPlacement,
): boolean => caller.isAdmin || caller.familyId === child.familyId;

/** A Child's Teachers, and the Admin, lock what they play; their locks outrank the Parents' switches. */
export const canLockChildPlay = (
  caller: Caller,
  child: ChildPlacement,
  moment: Date,
): boolean => caller.isAdmin || isInTeachersYearGroups(caller, child, moment);

/** Narrows the database read before the Year Group check, so a Teacher never loads another School's Children. */
export const buildCandidateChildrenFilter = (caller: Caller) => {
  if (caller.isAdmin) {
    return undefined;
  }
  const filters = [
    caller.familyId === null
      ? undefined
      : eq(children.familyId, caller.familyId),
    caller.teaching === null
      ? undefined
      : eq(children.schoolId, caller.teaching.schoolId),
  ].filter((filter) => filter !== undefined);
  return filters.length === 0 ? sql`false` : or(...filters);
};

export const loadSeenChildPlacements = async (
  database: Reader,
  caller: Caller,
  moment: Date,
): Promise<ChildPlacement[]> => {
  const candidates = await database
    .select(childPlacementColumns)
    .from(children)
    .where(buildCandidateChildrenFilter(caller));
  return candidates.filter((child) => canSeeChild(caller, child, moment));
};

export const loadSeenChild = async (
  database: Reader,
  caller: Caller,
  childId: string,
  moment: Date,
): Promise<ChildPlacement> => {
  const child = (
    await database
      .select(childPlacementColumns)
      .from(children)
      .where(eq(children.id, childId))
  ).at(0);
  if (child === undefined || !canSeeChild(caller, child, moment)) {
    throw new ChildNotFoundError();
  }
  return child;
};

/** A Child the caller may change, or why not: unseen Children are not found, and Teachers are read-only. */
export const loadChangeableChild = async (
  database: Reader,
  caller: Caller,
  childId: string,
  moment: Date,
): Promise<ChildPlacement> => {
  const child = await loadSeenChild(database, caller, childId, moment);
  if (!canChangeChild(caller, child)) {
    throw new ReadOnlyReachError();
  }
  return child;
};

export const loadLockableChild = async (
  database: Reader,
  caller: Caller,
  childId: string,
  moment: Date,
): Promise<ChildPlacement> => {
  const child = await loadSeenChild(database, caller, childId, moment);
  if (!canLockChildPlay(caller, child, moment)) {
    throw new NotTheChildsTeacherError();
  }
  return child;
};

/**
 * The Parents a caller reaches: the Admin every Parent; a Teacher the Parents of the Children in their Year Groups,
 * and their School's Parents with no Children yet; a Parent only the Parents of their own Family.
 */
export const loadSeenParentIds = async (
  database: Reader,
  caller: Caller,
  moment: Date,
): Promise<Set<string>> => {
  if (caller.isAdmin) {
    const everyParent = await database
      .select({ userId: users.id })
      .from(users)
      .where(sql`'parent' = any(${users.roles})`);
    return new Set(everyParent.map(({ userId }) => userId));
  }

  const seenFamilyIds = new Set(
    (await loadSeenChildPlacements(database, caller, moment)).map(
      ({ familyId }) => familyId,
    ),
  );
  if (caller.familyId !== null) {
    seenFamilyIds.add(caller.familyId);
  }
  const parentsOfSeenFamilies =
    seenFamilyIds.size === 0
      ? []
      : await database
          .select({ userId: familyParents.userId })
          .from(familyParents)
          .where(inArray(familyParents.familyId, [...seenFamilyIds]));

  const parentsWithNoChildren =
    caller.teaching === null
      ? []
      : await database
          .select({ userId: schoolParents.userId })
          .from(schoolParents)
          .leftJoin(
            familyParents,
            eq(familyParents.userId, schoolParents.userId),
          )
          .where(
            and(
              eq(schoolParents.schoolId, caller.teaching.schoolId),
              or(
                isNull(familyParents.familyId),
                notExists(
                  database
                    .select({ id: children.id })
                    .from(children)
                    .where(eq(children.familyId, familyParents.familyId)),
                ),
              ),
            ),
          );

  return new Set(
    [...parentsOfSeenFamilies, ...parentsWithNoChildren].map(
      ({ userId }) => userId,
    ),
  );
};

export const assertParentSeen = async (
  database: Reader,
  caller: Caller,
  parentUserId: string,
  moment: Date,
): Promise<void> => {
  const seenParentIds = await loadSeenParentIds(database, caller, moment);
  if (!seenParentIds.has(parentUserId)) {
    throw new PersonNotFoundError();
  }
};

/** The Schools a Parent belongs to: the one that invited them, and every School one of their Children attends. */
export const loadOwnSchoolIds = async (
  database: Reader,
  caller: Caller,
): Promise<string[]> => {
  const schoolIds = new Set<string>();
  const parentSchoolRows = await database
    .select({ schoolId: schoolParents.schoolId })
    .from(schoolParents)
    .where(eq(schoolParents.userId, caller.userId));
  for (const { schoolId } of parentSchoolRows) {
    schoolIds.add(schoolId);
  }
  if (caller.familyId !== null) {
    const childSchools = await database
      .select({ schoolId: children.schoolId })
      .from(children)
      .where(eq(children.familyId, caller.familyId));
    for (const { schoolId } of childSchools) {
      schoolIds.add(schoolId);
    }
  }
  return [...schoolIds];
};

/** The Schools a caller reaches: the Admin all of them, a Teacher theirs, a Parent their own and their Children's. */
export const loadSeenSchoolIds = async (
  database: Reader,
  caller: Caller,
): Promise<string[] | "every-school"> => {
  if (caller.isAdmin) {
    return "every-school";
  }
  const ownSchoolIds = await loadOwnSchoolIds(database, caller);
  return caller.teaching === null
    ? ownSchoolIds
    : [...new Set([caller.teaching.schoolId, ...ownSchoolIds])];
};

export const assertSchoolSeen = async (
  database: Reader,
  caller: Caller,
  schoolId: string,
): Promise<void> => {
  const school = (
    await database
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.id, schoolId))
  ).at(0);
  const seenSchoolIds = await loadSeenSchoolIds(database, caller);
  if (
    school === undefined ||
    (seenSchoolIds !== "every-school" && !seenSchoolIds.includes(schoolId))
  ) {
    throw new SchoolNotFoundError();
  }
};
