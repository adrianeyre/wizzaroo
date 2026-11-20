import { and, asc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import { runAsSignedInParent } from "../auth/signed-in-parent.js";
import type { Database } from "../database.js";
import { buildFamilyJoinedNotice } from "../email/emails.js";
import {
  type EmailAfterCommit,
  type SendEmail,
  sendEmailsAfterCommit,
} from "../email/send-email.js";
import type { ReachDatabase } from "../reach.js";
import {
  familyJoinRequests,
  familyParents,
  schoolParents,
  users,
} from "../schema.js";
import { loadNamedSchool } from "./create-people.js";
import { buildInviteEmailAfterCommit, createInvite } from "./invites.js";

export class FamilyJoinNeedsEmailedInviteError extends Error {
  override readonly name = "FamilyJoinNeedsEmailedInviteError";
  readonly statusCode = 409;

  constructor() {
    super(
      "A Teacher can't copy the Invite of an adult joining a Family. It's emailed to them once one of the Family's Parents agrees",
    );
  }
}

export class FamilyJoinRequestNotFoundError extends Error {
  override readonly name = "FamilyJoinRequestNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("There's no such adult waiting to join your Family");
  }
}

export interface WaitingAdult {
  userId: string;
  name: string | null;
  email: string;
  requestedAt: Date;
}

interface FamilyJoinParams {
  userId: string;
}

const familyJoinParamsSchema = {
  type: "object",
  required: ["userId"],
  properties: { userId: { type: "string", format: "uuid" } },
} as const;

/** Run as the owner: the addresses of a Family's adults who can still sign in, to tell them who is joining it. */
export const loadFamilyAdultEmails = async (
  ownerDatabase: Pick<Database, "select">,
  familyId: string,
  exceptUserIds: string[] = [],
): Promise<string[]> =>
  (
    await ownerDatabase
      .select({ email: users.email })
      .from(familyParents)
      .innerJoin(users, eq(users.id, familyParents.userId))
      .where(
        and(
          eq(familyParents.familyId, familyId),
          isNull(users.deactivatedAt),
          exceptUserIds.length === 0
            ? undefined
            : notInArray(users.id, exceptUserIds),
        ),
      )
      .orderBy(asc(users.email))
  ).map(({ email }) => email);

/** Whether a Teacher ever asked for this adult to join a Family, agreed or not. */
export const hasFamilyJoinRequest = async (
  ownerDatabase: Pick<Database, "select">,
  userId: string,
): Promise<boolean> =>
  (
    await ownerDatabase
      .select({ userId: familyJoinRequests.userId })
      .from(familyJoinRequests)
      .where(eq(familyJoinRequests.userId, userId))
  ).length > 0;

/** Run as the owner: whether the adult is still waiting for a Family's Parents to agree, and so holds no credential. */
export const isWaitingToJoinAFamily = async (
  ownerDatabase: Pick<Database, "select">,
  userId: string,
): Promise<boolean> =>
  (
    await ownerDatabase
      .select({ userId: familyJoinRequests.userId })
      .from(familyJoinRequests)
      .where(
        and(
          eq(familyJoinRequests.userId, userId),
          isNull(familyJoinRequests.agreedAt),
        ),
      )
  ).length > 0;

/** Within the Parent's own reach, so the policies check the Family as well as the API. */
const assertWaitingToJoin = async (
  reachDatabase: Pick<ReachDatabase, "select">,
  familyId: string,
  userId: string,
): Promise<void> => {
  const waiting = await reachDatabase
    .select({ userId: familyJoinRequests.userId })
    .from(familyJoinRequests)
    .where(
      and(
        eq(familyJoinRequests.userId, userId),
        eq(familyJoinRequests.familyId, familyId),
        isNull(familyJoinRequests.agreedAt),
      ),
    );
  if (waiting.length === 0) {
    throw new FamilyJoinRequestNotFoundError();
  }
};

type OwnerTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Locks the waiting request as the owner, so two Parents answering at once can't both act on it. */
const lockWaitingRequest = async (
  ownerTransaction: OwnerTransaction,
  familyId: string,
  userId: string,
) => {
  const waiting = (
    await ownerTransaction
      .select({ requestedByUserId: familyJoinRequests.requestedByUserId })
      .from(familyJoinRequests)
      .where(
        and(
          eq(familyJoinRequests.userId, userId),
          eq(familyJoinRequests.familyId, familyId),
          isNull(familyJoinRequests.agreedAt),
        ),
      )
      .for("update")
  ).at(0);
  const isInAFamily =
    (
      await ownerTransaction
        .select({ userId: familyParents.userId })
        .from(familyParents)
        .where(eq(familyParents.userId, userId))
    ).length > 0;
  if (waiting === undefined || isInAFamily) {
    throw new FamilyJoinRequestNotFoundError();
  }
  return waiting;
};

interface FamilyJoinRouteParts {
  database: Database;
  sendEmail: SendEmail;
  publicUrl: URL;
}

/**
 * A Family's Parents answer a Teacher's request to add an adult to their Family (#264). Only their agreement links the
 * adult to the Family and emails them their Invite; turning it down removes the login, which never had an Invite.
 */
export const registerFamilyJoinRoutes = (
  server: FastifyInstance,
  { database, sendEmail, publicUrl }: FamilyJoinRouteParts,
): void => {
  server.get(
    "/api/family-join-requests",
    { config: { reach: "parent" } },
    async (request): Promise<WaitingAdult[]> =>
      runAsSignedInParent(
        database,
        request,
        async ({ familyId }, reachDatabase) => {
          const waiting = await reachDatabase
            .select({
              userId: familyJoinRequests.userId,
              requestedAt: familyJoinRequests.requestedAt,
            })
            .from(familyJoinRequests)
            .where(
              and(
                eq(familyJoinRequests.familyId, familyId),
                isNull(familyJoinRequests.agreedAt),
              ),
            )
            .orderBy(asc(familyJoinRequests.requestedAt));
          if (waiting.length === 0) {
            return [];
          }
          // The adult isn't in the Family yet, so their name and address are read as the owner, for these ids only.
          const adults = await database
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(
              inArray(
                users.id,
                waiting.map(({ userId }) => userId),
              ),
            );
          return waiting.flatMap(({ userId, requestedAt }) => {
            const adult = adults.find(({ id }) => id === userId);
            return adult === undefined
              ? []
              : [{ userId, name: adult.name, email: adult.email, requestedAt }];
          });
        },
      ),
  );

  // A PUT, not a bodiless POST, so a page on another host can't send it without a preflight.
  server.put<{ Params: FamilyJoinParams }>(
    "/api/family-join-requests/:userId/agreement",
    { config: { reach: "parent" }, schema: { params: familyJoinParamsSchema } },
    async (request, reply) => {
      const emails = await runAsSignedInParent(
        database,
        request,
        async (parent, reachDatabase) => {
          const { userId } = request.params;
          const { familyId } = parent;
          await assertWaitingToJoin(reachDatabase, familyId, userId);
          // Linking the adult and making their Invite run as the owner once the Family is checked (ADR 0027).
          const agreed = await database.transaction(
            async (ownerTransaction) => {
              const waiting = await lockWaitingRequest(
                ownerTransaction,
                familyId,
                userId,
              );
              const [adult] = await ownerTransaction
                .select({ name: users.name, email: users.email })
                .from(users)
                .where(eq(users.id, userId));
              const membership = (
                await ownerTransaction
                  .select({ schoolId: schoolParents.schoolId })
                  .from(schoolParents)
                  .where(eq(schoolParents.userId, userId))
                  .limit(1)
              ).at(0);
              if (membership === undefined) {
                throw new FamilyJoinRequestNotFoundError();
              }
              const school = await loadNamedSchool(
                ownerTransaction,
                membership.schoolId,
              );
              await ownerTransaction
                .insert(familyParents)
                .values({ userId, familyId });
              await ownerTransaction
                .update(familyJoinRequests)
                .set({ agreedAt: sql`now()`, agreedByUserId: parent.userId })
                .where(eq(familyJoinRequests.userId, userId));
              await insertAuditLogEntry(ownerTransaction, {
                action: "family-join.agreed",
                actor: buildUserActor(parent),
                target: { type: "user", id: userId },
                detail: familyId,
              });
              const createdInvite = await createInvite(
                ownerTransaction,
                publicUrl,
                {
                  userId,
                  role: "parent",
                  name: adult.name ?? adult.email,
                  email: adult.email,
                  schoolName: school.name,
                  createdByUserId: waiting.requestedByUserId ?? parent.userId,
                  isEmailed: true,
                },
              );
              const otherAdultEmails = await loadFamilyAdultEmails(
                ownerTransaction,
                familyId,
                [userId, parent.userId],
              );
              return [
                ...buildInviteEmailAfterCommit(database, createdInvite),
                ...otherAdultEmails.map((to): EmailAfterCommit => ({
                  email: buildFamilyJoinedNotice({
                    to,
                    joinedEmail: adult.email,
                  }),
                })),
              ];
            },
          );
          request.log.info(
            { userId: parent.userId, joinedUserId: userId },
            "people.family-join.agreed",
          );
          return agreed;
        },
      );
      // Once the adult has joined and their Invite is committed, so no send holds a database connection (#329).
      await sendEmailsAfterCommit(sendEmail, emails);
      return reply.code(204).send();
    },
  );

  server.delete<{ Params: FamilyJoinParams }>(
    "/api/family-join-requests/:userId",
    { config: { reach: "parent" }, schema: { params: familyJoinParamsSchema } },
    async (request, reply) => {
      await runAsSignedInParent(
        database,
        request,
        async (parent, reachDatabase) => {
          const { userId } = request.params;
          const { familyId } = parent;
          await assertWaitingToJoin(reachDatabase, familyId, userId);
          // The login was made for this Family alone and never had an Invite, so turning it down removes it.
          await database.transaction(async (ownerTransaction) => {
            await lockWaitingRequest(ownerTransaction, familyId, userId);
            await insertAuditLogEntry(ownerTransaction, {
              action: "family-join.turned-down",
              actor: buildUserActor(parent),
              target: { type: "user", id: userId },
              detail: familyId,
            });
            await ownerTransaction.delete(users).where(eq(users.id, userId));
          });
          request.log.info(
            { userId: parent.userId, turnedDownUserId: userId },
            "people.family-join.turned-down",
          );
        },
      );
      return reply.code(204).send();
    },
  );
};
