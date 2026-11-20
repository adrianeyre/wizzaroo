import { and, desc, eq, gt, isNull, not, sql, type SQL } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import type { Database } from "../database.js";
import type { ReachDatabase } from "../reach.js";
import { hashSecretToken, buildSecretToken } from "../auth/secret-token.js";
import {
  buildParentInviteEmail,
  buildTeacherInviteEmail,
  type Email,
} from "../email/emails.js";
import type { EmailAfterCommit } from "../email/send-email.js";
import { familyJoinRequests, invites, passkeys, users } from "../schema.js";

export class InviteAlreadyAcceptedError extends Error {
  override readonly name = "InviteAlreadyAcceptedError";
  readonly statusCode = 409;

  constructor() {
    super(
      "They've already set up their login, so an Invite can't be sent to them. If they can't sign in, send them a password reset",
    );
  }
}

export class FamilyJoinNotAgreedError extends Error {
  override readonly name = "FamilyJoinNotAgreedError";
  readonly statusCode = 409;

  constructor() {
    super(
      "Their Family's Parents haven't agreed to them joining yet. Their Invite is emailed to them once one of them does",
    );
  }
}

export const inviteLifetimeDays = 7;

const acceptInviteFragmentName = "accept-invite";

export const inviteStatuses = [
  "not-sent",
  "pending",
  "accepted",
  "expired",
  "email-failed",
] as const;

export type InviteStatus = (typeof inviteStatuses)[number];

export type InvitedRole = "teacher" | "parent";

export interface InvitePlan {
  userId: string;
  role: InvitedRole;
  name: string;
  email: string;
  schoolName: string;
  createdByUserId: string;
  isEmailed: boolean;
}

export interface CreatedInvite {
  invite: { id: string; url: string; expiresAt: Date };
  email: Email | null;
}

type Writer = Pick<ReachDatabase, "insert" | "delete" | "select">;

const loginUsers = alias(users, "login_users");
const loginPasskeys = alias(passkeys, "login_passkeys");
const acceptedInvites = alias(invites, "accepted_invites");

/**
 * A column with its table's name always written in front of it.
 * Drizzle leaves the table's name off the columns in a select list that reads one table with no join,
 * where a correlated subquery's `"id"` then means its own table's column instead of the outer one (#249).
 * It strips only the columns at the top of the select list's SQL, so a column wrapped in SQL of its own keeps its table's name,
 * with no `sql.identifier` built from a name.
 */
const qualified = (column: AnyPgColumn): SQL => sql`${column}`;

/**
 * Whether an adult has a login: a password, a passkey or an Invite they once accepted.
 * An Invite is only for an adult with none, so whoever opens one can never set the password of an adult who already signs in (#249).
 * It reads every adult's passkeys and Invites, so only the owner and the Admin's reach see the whole answer;
 * staff lists ask `wizzaroo_user_has_login` instead.
 * Every column is written with its table's name, so it means the same in a select list as in a where clause.
 */
export const userHasLogin = (userIdColumn: AnyPgColumn) => {
  const userId = qualified(userIdColumn);
  return sql<boolean>`(exists (select from ${users} ${loginUsers} where ${qualified(loginUsers.id)} = ${userId} and ${qualified(loginUsers.passwordHash)} is not null)
    or exists (select from ${passkeys} ${loginPasskeys} where ${qualified(loginPasskeys.userId)} = ${userId})
    or exists (select from ${invites} ${acceptedInvites} where ${qualified(acceptedInvites.userId)} = ${userId} and ${qualified(acceptedInvites.acceptedAt)} is not null))`;
};

/** Whether an adult has a login, as the database answers a staff reach about an adult it shows them. */
export const userHasLoginWithinReach = (userIdColumn: AnyPgColumn) =>
  sql<boolean>`wizzaroo_user_has_login(${qualified(userIdColumn)})`;

const buildInviteUrl = (publicUrl: URL, token: string): URL =>
  new URL(`/parent/#${acceptInviteFragmentName}=${token}`, publicUrl);

/**
 * Replaces any pending Invite for the adult with a fresh single-use one, and builds its email when it is to be sent.
 * Refuses an adult who already has a login, so it runs as the owner or the Admin's reach, which see every adult's passkeys and Invites.
 * The caller sends the email, so a whole batch can be created before any mail goes out.
 */
export const createInvite = async (
  transaction: Writer,
  publicUrl: URL,
  {
    userId,
    role,
    name,
    email,
    schoolName,
    createdByUserId,
    isEmailed,
  }: InvitePlan,
): Promise<CreatedInvite> => {
  const [invitedUser] = await transaction
    .select({ hasLogin: userHasLogin(users.id) })
    .from(users)
    .where(eq(users.id, userId));
  if (invitedUser.hasLogin) {
    throw new InviteAlreadyAcceptedError();
  }
  // An adult a Teacher asked to add to a Family has no Invite until one of its Parents agrees (#264).
  const waitingToJoin = await transaction
    .select({ userId: familyJoinRequests.userId })
    .from(familyJoinRequests)
    .where(
      and(
        eq(familyJoinRequests.userId, userId),
        isNull(familyJoinRequests.agreedAt),
      ),
    );
  if (waitingToJoin.length > 0) {
    throw new FamilyJoinNotAgreedError();
  }
  await transaction
    .delete(invites)
    .where(and(eq(invites.userId, userId), isNull(invites.acceptedAt)));

  const token = buildSecretToken();
  const inviteUrl = buildInviteUrl(publicUrl, token);
  const [invite] = await transaction
    .insert(invites)
    .values({
      tokenHash: hashSecretToken(token),
      userId,
      createdByUserId,
      emailedTo: isEmailed ? email : null,
      expiresAt: sql`now() + make_interval(days => ${inviteLifetimeDays})`,
    })
    .returning({ id: invites.id, expiresAt: invites.expiresAt });
  const buildEmail =
    role === "teacher" ? buildTeacherInviteEmail : buildParentInviteEmail;
  return {
    invite: { ...invite, url: inviteUrl.href },
    email: isEmailed
      ? buildEmail({
          to: email,
          name,
          schoolName,
          inviteUrl,
          lifetimeDays: inviteLifetimeDays,
        })
      : null,
  };
};

export interface LatestInvite {
  expiresAt: Date;
  isEmailFailed: boolean;
}

interface InviteStatusParts {
  hasLogin: boolean;
  latestInvite: LatestInvite | null;
}

export const findInviteStatus = (
  { hasLogin, latestInvite }: InviteStatusParts,
  moment: Date,
): InviteStatus => {
  if (hasLogin) {
    return "accepted";
  }
  if (latestInvite === null) {
    return "not-sent";
  }
  // A bulk upload's Invite whose email failed is shown as such, so staff send a new one (#293).
  if (latestInvite.isEmailFailed) {
    return "email-failed";
  }
  return latestInvite.expiresAt > moment ? "pending" : "expired";
};

/** Each adult's latest unaccepted Invite: when it expires, and whether its email failed. */
export const loadLatestInvites = async (
  database: Pick<ReachDatabase, "select">,
): Promise<Map<string, LatestInvite>> => {
  const unaccepted = await database
    .select({
      userId: invites.userId,
      expiresAt: invites.expiresAt,
      emailFailedAt: invites.emailFailedAt,
    })
    .from(invites)
    .where(isNull(invites.acceptedAt))
    .orderBy(desc(invites.expiresAt));
  const latest = new Map<string, LatestInvite>();
  for (const { userId, expiresAt, emailFailedAt } of unaccepted) {
    if (!latest.has(userId)) {
      latest.set(userId, { expiresAt, isEmailFailed: emailFailedAt !== null });
    }
  }
  return latest;
};

/**
 * Marks an Invite whose email couldn't be sent, so the lists show it wasn't (#293).
 * Run as the owner, after the upload's transaction, since a bulk upload's emails go out once the reply has.
 */
export const markInviteEmailFailed = async (
  database: Pick<Database, "update">,
  inviteId: string,
): Promise<void> => {
  await database
    .update(invites)
    .set({ emailFailedAt: sql`now()` })
    .where(and(eq(invites.id, inviteId), isNull(invites.acceptedAt)));
};

/**
 * An Invite's email, to send once the transaction that made the Invite has committed, so the send holds no database
 * connection (#329). One that can't be sent marks its Invite, as a bulk upload's does (#293), so the lists show it
 * wasn't sent and staff send a new one.
 */
export const buildInviteEmailAfterCommit = (
  database: Pick<Database, "update">,
  { invite, email }: CreatedInvite,
): EmailAfterCommit[] =>
  email === null
    ? []
    : [{ email, undo: () => markInviteEmailFailed(database, invite.id) }];

/**
 * Run as the database owner: whoever opens an Invite isn't signed in yet.
 * A live Invite is refused once its adult has a login, however they came by it.
 */
export const findLiveInvite = async (
  transaction: Pick<Database, "select">,
  token: string,
) => {
  const liveInvites = await transaction
    .select({
      id: invites.id,
      userId: invites.userId,
      emailedTo: invites.emailedTo,
      email: users.email,
    })
    .from(invites)
    .innerJoin(users, eq(users.id, invites.userId))
    .where(
      and(
        eq(invites.tokenHash, hashSecretToken(token)),
        isNull(invites.acceptedAt),
        gt(invites.expiresAt, sql`now()`),
        isNull(users.deactivatedAt),
        not(userHasLogin(users.id)),
      ),
    )
    .for("update", { of: invites });
  return liveInvites.at(0);
};
