import { and, eq, gt, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { insertAuditLogEntry } from "../audit/audit-log.js";
import type { Database } from "../database.js";
import {
  buildEmailAddressChangedNotice,
  buildEmailAddressChangeRequestedNotice,
  buildEmailAddressCheckEmail,
  buildEmailAddressInUseNote,
} from "../email/emails.js";
import {
  type EmailAfterCommit,
  type SendEmail,
  sendEmailAfterCommit,
} from "../email/send-email.js";
import { emailAddressChecks, users } from "../schema.js";
import {
  accountProofSchemaProperties,
  checkAccountProof,
  readAccountProof,
  type AccountProofBody,
} from "./account-proof.js";
import {
  deleteOtherSignIns,
  deleteOutstandingAccountTokens,
} from "./account-tokens.js";
import { isEmailAddress, normaliseEmail } from "./email-address.js";
import { buildSecretToken, hashSecretToken } from "./secret-token.js";
import {
  runAsSignedInAdult,
  runAsSignedInUser,
  signInCookieName,
} from "./signed-in-parent.js";
import type { TotpSecretKey } from "./totp-secret-box.js";

export class NotAnEmailAddressError extends Error {
  override readonly name = "NotAnEmailAddressError";
  readonly statusCode = 400;

  constructor() {
    super("That isn't an email address");
  }
}

export class EmailAddressTakenError extends Error {
  override readonly name = "EmailAddressTakenError";
  readonly statusCode = 409;

  constructor() {
    super("Another Parent already uses that email address");
  }
}

export class EmailAddressCheckNotFoundError extends Error {
  override readonly name = "EmailAddressCheckNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("That link has expired or has already been used");
  }
}

const emailAddressCheckLifetimeHours = 24;

const confirmEmailFragmentName = "confirm-email";

interface ParentEmailAddress {
  email: string;
  isConfirmed: boolean;
}

interface EmailAddressCheckBody extends AccountProofBody {
  email: string;
}

interface EmailAddressConfirmationBody {
  token: string;
}

const emailAddressCheckBodySchema = {
  type: "object",
  required: ["email"],
  additionalProperties: false,
  properties: {
    email: { type: "string", minLength: 1 },
    ...accountProofSchemaProperties,
  },
} as const;

const emailAddressConfirmationBodySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: { token: { type: "string", minLength: 1 } },
} as const;

const buildEmailAddressConfirmationUrl = (publicUrl: URL, token: string): URL =>
  new URL(`/parent/#${confirmEmailFragmentName}=${token}`, publicUrl);

const isEmailAddressTakenByAnotherUser = async (
  database: Pick<Database, "select">,
  userId: string,
  email: string,
): Promise<boolean> => {
  const otherUsers = await database
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, userId)))
    .limit(1);
  return otherUsers.length > 0;
};

interface EmailAddressCheckParts {
  publicUrl: URL;
  userId: string;
  email: string;
}

/**
 * Writes the check and hands back its email, to send once the transaction has committed, so the send holds no database
 * connection (#329). An email that can't be sent takes its link back with it, through `database`, which runs outside
 * the transaction that wrote it.
 */
export const createEmailAddressCheck = async (
  transaction: Pick<Database, "delete" | "insert">,
  database: Pick<Database, "delete">,
  { publicUrl, userId, email }: EmailAddressCheckParts,
): Promise<EmailAfterCommit> => {
  const token = buildSecretToken();
  const tokenHash = hashSecretToken(token);
  await transaction
    .delete(emailAddressChecks)
    .where(eq(emailAddressChecks.userId, userId));
  await transaction.insert(emailAddressChecks).values({
    tokenHash,
    userId,
    email,
    expiresAt: sql`now() + make_interval(hours => ${emailAddressCheckLifetimeHours})`,
  });
  return {
    email: buildEmailAddressCheckEmail({
      to: email,
      confirmationUrl: buildEmailAddressConfirmationUrl(publicUrl, token),
      lifetimeHours: emailAddressCheckLifetimeHours,
    }),
    undo: async () => {
      await database
        .delete(emailAddressChecks)
        .where(eq(emailAddressChecks.tokenHash, tokenHash));
    },
  };
};

interface EmailAddressCheckRouteParts {
  database: Database;
  sendEmail: SendEmail;
  publicUrl: URL;
  totpSecretKey: TotpSecretKey;
}

export const registerEmailAddressCheckRoutes = (
  server: FastifyInstance,
  {
    database,
    sendEmail,
    publicUrl,
    totpSecretKey,
  }: EmailAddressCheckRouteParts,
): void => {
  const relyingParty = {
    relyingPartyId: publicUrl.hostname,
    expectedOrigin: publicUrl.origin,
  };

  server.get(
    "/api/email-address",
    { config: { reach: "user" } },
    async (request): Promise<ParentEmailAddress> => {
      return runAsSignedInUser(
        database,
        request,
        async ({ userId }, reachDatabase) => {
          const [user] = await reachDatabase
            .select({
              email: users.email,
              emailConfirmedAt: users.emailConfirmedAt,
            })
            .from(users)
            .where(eq(users.id, userId));
          return {
            email: user.email,
            isConfirmed: user.emailConfirmedAt !== null,
          };
        },
      );
    },
  );

  // The email address decides where every reset link and notice goes, so moving it takes a fresh proof of the account,
  // and a staff sign-in that hasn't used a second factor can't move it at all.
  server.post<{ Body: EmailAddressCheckBody }>(
    "/api/email-address-checks",
    {
      config: { reach: "adult" },
      schema: { body: emailAddressCheckBodySchema },
    },
    async (request, reply) => {
      const email = normaliseEmail(request.body.email);
      const asked = await runAsSignedInAdult(
        database,
        request,
        async ({ userId, roles }, reachDatabase) => {
          if (!isEmailAddress(email)) {
            throw new NotAnEmailAddressError();
          }
          const [user] = await reachDatabase
            .select({
              email: users.email,
              emailConfirmedAt: users.emailConfirmedAt,
            })
            .from(users)
            .where(eq(users.id, userId));
          const isMove = email !== user.email;
          // A link to the address the account already has moves nothing, so it needs no proof.
          if (isMove) {
            try {
              await checkAccountProof(
                reachDatabase,
                readAccountProof(request.body, roles),
                { userId, relyingParty, totpSecretKey },
              );
            } catch (error) {
              request.log.info({ userId }, "auth.email-address-check.refused");
              throw error;
            }
          }
          // The answer is the same whether or not another account has the address, so it tells no one which do (#253):
          // only the new address's mailbox hears that it is taken.
          const isTaken = await isEmailAddressTakenByAnotherUser(
            database,
            userId,
            email,
          );
          return {
            userId,
            isTaken,
            noticeTo:
              isMove && user.emailConfirmedAt !== null ? user.email : null,
          };
        },
      );

      // The address the account has now hears of the move first, so a session alone can't move it unseen (#251). It is
      // sent between the two reaches, holding no database connection, and before anything is saved, so if it can't be
      // sent nothing changes (#329).
      if (asked.noticeTo !== null) {
        await sendEmail(
          buildEmailAddressChangeRequestedNotice({
            to: asked.noticeTo,
            newEmail: email,
            happenedAt: new Date(),
          }),
        );
      }
      const { userId, isTaken } = asked;
      const linkEmail = await runAsSignedInAdult(
        database,
        request,
        async (_signedInAdult, reachDatabase) =>
          reachDatabase.transaction(async (transaction) => {
            if (isTaken) {
              await transaction
                .delete(emailAddressChecks)
                .where(eq(emailAddressChecks.userId, userId));
              return { email: buildEmailAddressInUseNote({ to: email }) };
            }
            return createEmailAddressCheck(transaction, database, {
              publicUrl,
              userId,
              email,
            });
          }),
      );
      // Once the check is committed, so the send holds no database connection (#329).
      await sendEmailAfterCommit(sendEmail, linkEmail);
      request.log.info({ userId, isTaken }, "auth.email-address-check.created");
      return reply.code(204).send();
    },
  );

  server.post<{ Body: EmailAddressConfirmationBody }>(
    "/api/email-address-confirmations",
    {
      config: {
        reach: "none",
        noReachReason:
          "The link is opened from a mailbox, often on another device: its credential is the emailed token",
      },
      schema: { body: emailAddressConfirmationBodySchema },
    },
    async (request): Promise<{ email: string }> => {
      const tokenHash = hashSecretToken(request.body.token);
      const foundCheck = (
        await database
          .select({
            userId: emailAddressChecks.userId,
            email: emailAddressChecks.email,
            isLive: sql<boolean>`${emailAddressChecks.expiresAt} > now()`,
            previousEmail: users.email,
            isPreviousConfirmed: sql<boolean>`${users.emailConfirmedAt} is not null`,
          })
          .from(emailAddressChecks)
          .innerJoin(users, eq(users.id, emailAddressChecks.userId))
          .where(eq(emailAddressChecks.tokenHash, tokenHash))
      ).at(0);
      if (!foundCheck?.isLive) {
        if (foundCheck !== undefined) {
          // An expired link is used up by trying it, as it always was.
          await database
            .delete(emailAddressChecks)
            .where(eq(emailAddressChecks.tokenHash, tokenHash));
        }
        request.log.info("auth.email-address-check.refused");
        throw new EmailAddressCheckNotFoundError();
      }
      if (
        await isEmailAddressTakenByAnotherUser(
          database,
          foundCheck.userId,
          foundCheck.email,
        )
      ) {
        throw new EmailAddressTakenError();
      }
      // The old address hears of it, since every later notice goes to the new one (#251). Sent before the change is
      // saved, holding no database connection, so if it can't be sent nothing changes and the link still works (#329).
      if (
        foundCheck.previousEmail !== foundCheck.email &&
        foundCheck.isPreviousConfirmed
      ) {
        await sendEmail(
          buildEmailAddressChangedNotice({
            to: foundCheck.previousEmail,
            newEmail: foundCheck.email,
            happenedAt: new Date(),
          }),
        );
      }
      const confirmedCheck = await database.transaction(async (transaction) => {
        // Used only while still live, so two requests with one link can't both use it.
        const usedChecks = await transaction
          .delete(emailAddressChecks)
          .where(
            and(
              eq(emailAddressChecks.tokenHash, tokenHash),
              gt(emailAddressChecks.expiresAt, sql`now()`),
            ),
          )
          .returning({
            userId: emailAddressChecks.userId,
            email: emailAddressChecks.email,
          });
        const usedCheck = usedChecks.at(0);
        if (usedCheck === undefined) {
          return undefined;
        }
        const { userId, email } = usedCheck;
        if (
          await isEmailAddressTakenByAnotherUser(transaction, userId, email)
        ) {
          throw new EmailAddressTakenError();
        }
        const [previous] = await transaction
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, userId));
        const [{ roles }] = await transaction
          .update(users)
          .set({ email, emailConfirmedAt: sql`now()` })
          .where(eq(users.id, userId))
          .returning({ roles: users.roles });
        if (previous.email !== email) {
          await insertAuditLogEntry(transaction, {
            action: "email-address.changed",
            actor: { type: "user", id: userId, roles },
            target: { type: "user", id: userId },
          });
          // A reset link sent to the old address dies with it (#252), and so does every sign-in made before the move
          // (#245), but for the adult's own sign-in if this browser has one.
          await deleteOutstandingAccountTokens(transaction, userId);
          const signInToken = request.cookies[signInCookieName];
          await deleteOtherSignIns(
            transaction,
            userId,
            signInToken === undefined
              ? undefined
              : hashSecretToken(signInToken),
          );
        }
        return { userId, email };
      });
      if (confirmedCheck === undefined) {
        request.log.info("auth.email-address-check.refused");
        throw new EmailAddressCheckNotFoundError();
      }
      request.log.info(
        { userId: confirmedCheck.userId },
        "auth.email-address.confirmed",
      );

      return { email: confirmedCheck.email };
    },
  );
};
