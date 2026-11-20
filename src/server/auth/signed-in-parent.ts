import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import type { YearGroup } from "../../curriculum/year-groups.js";
import type { Database } from "../database.js";
import {
  runWithinReach,
  type CallerReach,
  type ReachDatabase,
} from "../reach.js";
import {
  assertRouteDeclaresReach,
  type SignedInReach,
} from "../route-reach.js";
import {
  familyParents,
  passkeys,
  signIns,
  teacherYearGroups,
  teachers,
  users,
  type UserRole,
  totpSecrets,
} from "../schema.js";
import { hashSecretToken } from "./secret-token.js";
import { isSignInLive, lastUsedRefreshSeconds } from "./sign-in-lifetimes.js";

/** `__Host-`, so only Wizzaroo's own host can set it: it must be Secure, on `Path=/`, with no `Domain` (#248). */
export const signInCookieName = "__Host-wizzaroo_sign_in";

/**
 * How long a Teacher or the Admin with no second factor may set one up from a password alone: from the account being
 * made, from accepting an Invite, or from using a reset link the Admin sent. After that a password, or the mailbox a
 * reset link goes to, no longer leads to staff reach (#243).
 */
export const secondFactorSetupDays = 7;

export class NotSignedInError extends Error {
  override readonly name = "NotSignedInError";
  readonly statusCode = 401;

  constructor() {
    super("Sign in to Wizzaroo first");
  }
}

export class NotAParentError extends Error {
  override readonly name = "NotAParentError";
  readonly statusCode = 403;

  constructor() {
    super("Only a Parent can do this");
  }
}

export class NotTheAdminError extends Error {
  override readonly name = "NotTheAdminError";
  readonly statusCode = 403;

  constructor() {
    super("Only the Admin can do this");
  }
}

export class NotAdminOrTeacherError extends Error {
  override readonly name = "NotAdminOrTeacherError";
  readonly statusCode = 403;

  constructor() {
    super("Only the Admin or a Teacher can do this");
  }
}

export class SecondFactorRequiredError extends Error {
  override readonly name = "SecondFactorRequiredError";
  readonly statusCode = 403;
  readonly code = "second-factor-required";

  constructor() {
    super(
      "Teachers and the Admin sign in with a passkey or two-factor authentication. Set one up, then sign in with it",
    );
  }
}

/** The same refusal as a staff route's, since the sign-in still has its second factor to prove. */
export class SecondFactorProofRequiredError extends Error {
  override readonly name = "SecondFactorProofRequiredError";
  readonly statusCode = 403;
  readonly code = "second-factor-required";

  constructor() {
    super(
      "You already have a passkey or two-factor authentication. Use it to confirm this sign-in before you add another",
    );
  }
}

/** The same refusal's status, with its own code, since no second factor the sign-in could prove would help. */
export class SecondFactorSetupClosedError extends Error {
  override readonly name = "SecondFactorSetupClosedError";
  readonly statusCode = 403;
  readonly code = "second-factor-setup-closed";

  constructor() {
    super(
      `Teachers and the Admin set up a passkey or two-factor authentication within ${String(secondFactorSetupDays)} days of getting their login, and those days have passed. Ask the Admin to send you a password reset link, then set one up within ${String(secondFactorSetupDays)} days of using it`,
    );
  }
}

export interface Teaching {
  schoolId: string;
  yearGroups: YearGroup[];
}

export interface SignedInUser {
  userId: string;
  roles: UserRole[];
  familyId: string | null;
  isAdmin: boolean;
  teaching: Teaching | null;
  signInTokenHash: string;
  isTwoStep: boolean;
}

export interface SignedInParent extends SignedInUser {
  familyId: string;
}

/** Teachers and the Admin see many Families' Children, so a password alone isn't enough for them. */
export const needsSecondFactor = (
  signedInUser: Pick<SignedInUser, "roles" | "isTwoStep">,
): boolean =>
  !signedInUser.isTwoStep &&
  (signedInUser.roles.includes("admin") ||
    signedInUser.roles.includes("teacher"));

/**
 * Staff may set up a second factor from a sign-in that never proved one only while the account has none to prove.
 * Otherwise a staff password, or a reset link to a staff mailbox, would enrol its own and stand in for the one they have.
 */
export const mayAddSecondFactor = (
  signedInUser: Pick<SignedInUser, "roles" | "isTwoStep">,
  accountSecondFactors: number,
): boolean => !needsSecondFactor(signedInUser) || accountSecondFactors === 0;

/**
 * The account's passkeys and TOTP, counted as the database owner, as the sign-in itself is. Each is its own query with
 * a plain `where`, since a column inside a `sql` template of a one-table select is written unqualified, and a subquery
 * would then read its own table's columns in place of the outer one's.
 */
export const selectAccountSecondFactors = (
  database: Pick<Database, "select">,
  userId: string,
) => ({
  passkeys: database
    .select({ secondFactors: count() })
    .from(passkeys)
    .where(eq(passkeys.userId, userId)),
  totp: database
    .select({ secondFactors: count() })
    .from(totpSecrets)
    .where(eq(totpSecrets.userId, userId)),
});

const countAccountSecondFactors = async (
  database: Database,
  userId: string,
): Promise<number> => {
  const queries = selectAccountSecondFactors(database, userId);
  const [{ secondFactors: passkeyCount }] = await queries.passkeys;
  const [{ secondFactors: totpCount }] = await queries.totp;
  return passkeyCount + totpCount;
};

/** The value of `second_factor_setup_until` that keeps a staff account's first setup open `secondFactorSetupDays` from now. */
export const buildSecondFactorSetupReopening = () =>
  sql`now() + make_interval(days => ${secondFactorSetupDays})`;

/** Whether the account's first setup is still open, read with Postgres's clock as every other expiry is. */
const isAccountSecondFactorSetupOpen = async (
  database: Database,
  userId: string,
): Promise<boolean> => {
  const [{ isOpen }] = await database
    .select({
      isOpen: sql<boolean>`now() < greatest(${users.createdAt} + make_interval(days => ${secondFactorSetupDays}), ${users.secondFactorSetupUntil})`,
    })
    .from(users)
    .where(eq(users.id, userId));
  return isOpen;
};

export interface AccountSecondFactors {
  /** The account's passkeys, and 1 for TOTP if it is on. */
  count: number;
  /** Whether a staff account with none may still set up its first from a password alone. */
  isFirstSetupOpen: boolean;
}

/**
 * Why a sign-in may not add a second factor, or undefined when it may. A staff sign-in that hasn't proved one proves
 * the one the account has first, and with none it sets one up only while the account's first setup is open.
 */
export const findSecondFactorAddingRefusal = (
  signedInUser: Pick<SignedInUser, "roles" | "isTwoStep">,
  { count, isFirstSetupOpen }: AccountSecondFactors,
):
  SecondFactorProofRequiredError | SecondFactorSetupClosedError | undefined => {
  if (!mayAddSecondFactor(signedInUser, count)) {
    return new SecondFactorProofRequiredError();
  }
  if (needsSecondFactor(signedInUser) && !isFirstSetupOpen) {
    return new SecondFactorSetupClosedError();
  }
  return undefined;
};

const loadAccountSecondFactors = async (
  database: Database,
  userId: string,
): Promise<AccountSecondFactors> => {
  const count = await countAccountSecondFactors(database, userId);
  return {
    count,
    isFirstSetupOpen:
      count === 0 && (await isAccountSecondFactorSetupOpen(database, userId)),
  };
};

export const markSignInTwoStep = async (
  database: Pick<ReachDatabase, "update">,
  signInTokenHash: string,
): Promise<void> => {
  await database
    .update(signIns)
    .set({ isTwoStep: true })
    .where(eq(signIns.tokenHash, signInTokenHash));
};

/** Whoever holds this sign-in, whatever their roles, checked as the database owner since no one is known yet. */
export const loadSignedInUser = async (
  database: Database,
  request: FastifyRequest,
): Promise<SignedInUser> => {
  const token = request.cookies[signInCookieName];
  if (token === undefined) {
    throw new NotSignedInError();
  }

  const signInTokenHash = hashSecretToken(token);
  const signedInUsers = await database
    .select({
      userId: users.id,
      roles: users.roles,
      familyId: familyParents.familyId,
      teachingSchoolId: teachers.schoolId,
      teachingYearGroups: sql<
        YearGroup[] | null
      >`(select array_agg(${teacherYearGroups.yearGroup} order by ${teacherYearGroups.yearGroup}) from ${teacherYearGroups} where ${teacherYearGroups.userId} = ${users.id})`,
      isTwoStep: signIns.isTwoStep,
      // By the database's clock, as every other expiry is.
      ageSeconds: sql<number>`extract(epoch from now() - ${signIns.createdAt})::float8`,
      idleSeconds: sql<number>`extract(epoch from now() - ${signIns.lastUsedAt})::float8`,
    })
    .from(signIns)
    .innerJoin(users, eq(users.id, signIns.userId))
    .leftJoin(familyParents, eq(familyParents.userId, users.id))
    .leftJoin(teachers, eq(teachers.userId, users.id))
    .where(
      and(
        eq(signIns.tokenHash, signInTokenHash),
        gt(signIns.expiresAt, sql`now()`),
        isNull(users.deactivatedAt),
      ),
    );
  const signedInUser = signedInUsers.at(0);
  // A sign-in left unused too long, or a staff one past its lifetime, is refused like one that has expired (#244).
  if (signedInUser === undefined || !isSignInLive(signedInUser)) {
    throw new NotSignedInError();
  }
  if (signedInUser.idleSeconds >= lastUsedRefreshSeconds) {
    await database
      .update(signIns)
      .set({ lastUsedAt: sql`now()` })
      .where(eq(signIns.tokenHash, signInTokenHash));
  }

  const { userId, roles, familyId, teachingSchoolId, teachingYearGroups } =
    signedInUser;
  return {
    userId,
    roles,
    familyId: roles.includes("parent") ? familyId : null,
    isAdmin: roles.includes("admin"),
    teaching:
      roles.includes("teacher") &&
      teachingSchoolId !== null &&
      teachingYearGroups !== null
        ? { schoolId: teachingSchoolId, yearGroups: teachingYearGroups }
        : null,
    signInTokenHash,
    isTwoStep: signedInUser.isTwoStep,
  };
};

/** Refuses a signed-in adult the rung a route declares, with that rung's own refusal. */
const refuseBelowReach = (
  signedInUser: SignedInUser,
  reach: SignedInReach,
): void => {
  if (reach === "user") {
    return;
  }
  // Teachers and the Admin may reach data only once their sign-in used a second factor.
  if (needsSecondFactor(signedInUser)) {
    throw new SecondFactorRequiredError();
  }
  if (reach === "parent" && signedInUser.familyId === null) {
    throw new NotAParentError();
  }
  if (
    reach === "staff" &&
    !signedInUser.isAdmin &&
    signedInUser.teaching === null
  ) {
    throw new NotAdminOrTeacherError();
  }
  if (reach === "admin" && !signedInUser.isAdmin) {
    throw new NotTheAdminError();
  }
};

const checkedSignedInUsers = new WeakMap<FastifyRequest, SignedInUser>();

/** The route's onRequest check: refuses a caller below the route's declared reach before anything reads the request. */
export const checkSignedInUserReach = async (
  database: Database,
  request: FastifyRequest,
  reach: SignedInReach,
): Promise<void> => {
  const signedInUser = await loadSignedInUser(database, request);
  refuseBelowReach(signedInUser, reach);
  checkedSignedInUsers.set(request, signedInUser);
};

/** The caller the route's onRequest check let through, once, or else loaded and checked again. */
const takeSignedInUser = async (
  database: Database,
  request: FastifyRequest,
  reach: SignedInReach,
): Promise<SignedInUser> => {
  assertRouteDeclaresReach(request, reach);
  const checkedSignedInUser = checkedSignedInUsers.get(request);
  if (checkedSignedInUser !== undefined) {
    checkedSignedInUsers.delete(request);
    return checkedSignedInUser;
  }
  const signedInUser = await loadSignedInUser(database, request);
  refuseBelowReach(signedInUser, reach);
  return signedInUser;
};

/** For a route that declares the reach "parent" and works out its own reach, as the Family export does. */
export const loadSignedInParent = async (
  database: Database,
  request: FastifyRequest,
): Promise<SignedInParent> => {
  const signedInAdult = await takeSignedInUser(database, request, "parent");
  const { familyId } = signedInAdult;
  if (familyId === null) {
    throw new NotAParentError();
  }
  return { ...signedInAdult, familyId };
};

const toCallerReach = ({
  userId,
  familyId,
  isAdmin,
}: SignedInUser): CallerReach => ({ userId, familyId, isAdmin });

/** For an adult's own sign-in methods and account, which every role has, with or without a second factor yet. */
export const runAsSignedInUser = async <Result>(
  database: Database,
  request: FastifyRequest,
  work: (
    signedInUser: SignedInUser,
    reachDatabase: ReachDatabase,
  ) => Promise<Result>,
): Promise<Result> => {
  const signedInUser = await takeSignedInUser(database, request, "user");
  return runWithinReach(
    database,
    toCallerReach(signedInUser),
    (reachDatabase) => work(signedInUser, reachDatabase),
  );
};

/**
 * For the routes that add a passkey or turn on TOTP. A staff sign-in that hasn't proved the second factor the
 * account already has proves it first (`/api/passkey-confirmations`), so a password alone never enrols a new one.
 * A staff account with none sets up its first from a password alone only within `secondFactorSetupDays`.
 */
export const runAsSignedInUserAddingSecondFactor = async <Result>(
  database: Database,
  request: FastifyRequest,
  work: (
    signedInUser: SignedInUser,
    reachDatabase: ReachDatabase,
  ) => Promise<Result>,
): Promise<Result> => {
  const signedInUser = await takeSignedInUser(database, request, "user");
  if (needsSecondFactor(signedInUser)) {
    const refusal = findSecondFactorAddingRefusal(
      signedInUser,
      await loadAccountSecondFactors(database, signedInUser.userId),
    );
    if (refusal !== undefined) {
      throw refusal;
    }
  }
  return runWithinReach(
    database,
    toCallerReach(signedInUser),
    (reachDatabase) => work(signedInUser, reachDatabase),
  );
};

/** For anything a Parent, a Teacher or the Admin reaches, within the reach their sign-in gives them. */
export const runAsSignedInAdult = async <Result>(
  database: Database,
  request: FastifyRequest,
  work: (
    signedInAdult: SignedInUser,
    reachDatabase: ReachDatabase,
  ) => Promise<Result>,
): Promise<Result> => {
  const signedInAdult = await takeSignedInUser(database, request, "adult");
  return runWithinReach(
    database,
    toCallerReach(signedInAdult),
    (reachDatabase) => work(signedInAdult, reachDatabase),
  );
};

/**
 * For a Parent route. The work still learns the Parent's roles, but the database's reach is the Parent's own Family
 * alone, with an Admin's or a Teacher's reach off, so a query that forgets its Family filter still can't cross a
 * Family (#261, ADR 0027).
 */
export const runAsSignedInParent = async <Result>(
  database: Database,
  request: FastifyRequest,
  work: (
    signedInParent: SignedInParent,
    reachDatabase: ReachDatabase,
  ) => Promise<Result>,
): Promise<Result> => {
  const signedInParent = await loadSignedInParent(database, request);
  return runWithinReach(
    database,
    { ...toCallerReach(signedInParent), isAdmin: false, isOwnFamilyOnly: true },
    (reachDatabase) => work(signedInParent, reachDatabase),
  );
};

export const runAsSignedInAdmin = async <Result>(
  database: Database,
  request: FastifyRequest,
  work: (
    adminUserId: string,
    reachDatabase: ReachDatabase,
    signedInAdmin: SignedInUser,
  ) => Promise<Result>,
): Promise<Result> => {
  const signedInAdult = await takeSignedInUser(database, request, "admin");
  return runWithinReach(
    database,
    toCallerReach(signedInAdult),
    (reachDatabase) => work(signedInAdult.userId, reachDatabase, signedInAdult),
  );
};

/** The Admin or a Teacher, the two roles that bring people into Wizzaroo. */
export const runAsSignedInStaff = async <Result>(
  database: Database,
  request: FastifyRequest,
  work: (
    signedInStaff: SignedInUser,
    reachDatabase: ReachDatabase,
  ) => Promise<Result>,
): Promise<Result> => {
  const signedInAdult = await takeSignedInUser(database, request, "staff");
  return runWithinReach(
    database,
    toCallerReach(signedInAdult),
    (reachDatabase) => work(signedInAdult, reachDatabase),
  );
};
