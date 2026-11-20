import { createHash } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { type AuditLogEntry, insertAuditLogEntry } from "../audit/audit-log.js";
import type { ReachDatabase } from "../reach.js";
import {
  buildPasswordChangedNotice,
  buildPasswordResetEmail,
} from "../email/emails.js";
import {
  type EmailAfterCommit,
  type SendEmail,
  sendEmailAfterCommit,
} from "../email/send-email.js";
import {
  type RequestRateLimits,
  TooManyRequestsError,
} from "../rate-limit/request-rate-limit.js";
import { signOutFamilyDevicesMadeBy } from "../family-devices/family-devices-made-by.js";
import { passwordResets, pendingSignIns, signIns, users } from "../schema.js";
import { deleteOutstandingAccountTokens } from "./account-tokens.js";
import { normaliseEmail } from "./email-address.js";
import { isPasswordLongEnough } from "./password.js";
import { PasswordTooShortError } from "./password-change-routes.js";
import { buildSecretToken, hashSecretToken } from "./secret-token.js";
import {
  buildSecondFactorSetupReopening,
  secondFactorSetupDays,
} from "./signed-in-parent.js";

export class PasswordResetNotFoundError extends Error {
  override readonly name = "PasswordResetNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("That link has expired or has already been used");
  }
}

const passwordResetLifetimeHours = 1;

const resetPasswordFragmentName = "reset-password";

interface PasswordResetRequestBody {
  email: string;
}

interface PasswordResetBody {
  token: string;
  newPassword: string;
}

const passwordResetRequestBodySchema = {
  type: "object",
  required: ["email"],
  additionalProperties: false,
  properties: { email: { type: "string", minLength: 1 } },
} as const;

const passwordResetBodySchema = {
  type: "object",
  required: ["token", "newPassword"],
  additionalProperties: false,
  properties: {
    token: { type: "string", minLength: 1 },
    newPassword: { type: "string" },
  },
} as const;

const buildPasswordResetUrl = (publicUrl: URL, token: string): URL =>
  new URL(`/parent/#${resetPasswordFragmentName}=${token}`, publicUrl);

export interface PasswordResetRouteParts {
  database: ReachDatabase;
  sendEmail: SendEmail;
  publicUrl: URL;
}

interface PasswordResetRequestRouteParts extends PasswordResetRouteParts {
  requestRateLimits: RequestRateLimits;
}

interface PasswordResetTarget {
  userId: string;
  email: string;
  /** Only for a link the Admin sends: using it reopens a staff account's first second-factor setup (#243). */
  opensSecondFactorSetup?: boolean;
}

/**
 * The same one-hour, single-use link whoever asks for it: the adult themselves, the Admin, or a Parent's Teacher. The
 * reset is committed here, and its email handed back to send after, so no send holds a database connection while the
 * mail server answers (#329). An email that can't be sent takes its link back with it.
 */
export const createPasswordReset = async (
  {
    database,
    publicUrl,
  }: Pick<PasswordResetRouteParts, "database" | "publicUrl">,
  { userId, email, opensSecondFactorSetup = false }: PasswordResetTarget,
  auditLogEntry?: AuditLogEntry,
): Promise<EmailAfterCommit> => {
  const token = buildSecretToken();
  const tokenHash = hashSecretToken(token);
  await database.transaction(async (transaction) => {
    await transaction
      .delete(passwordResets)
      .where(eq(passwordResets.userId, userId));
    await transaction.insert(passwordResets).values({
      tokenHash,
      userId,
      expiresAt: sql`now() + make_interval(hours => ${passwordResetLifetimeHours})`,
      opensSecondFactorSetup,
    });
    if (auditLogEntry !== undefined) {
      await insertAuditLogEntry(transaction, auditLogEntry);
    }
  });
  return {
    email: buildPasswordResetEmail({
      to: email,
      resetUrl: buildPasswordResetUrl(publicUrl, token),
      lifetimeHours: passwordResetLifetimeHours,
    }),
    undo: async () => {
      await database
        .delete(passwordResets)
        .where(eq(passwordResets.tokenHash, tokenHash));
    },
  };
};

/** Commits a reset, then emails its link, holding no database connection while it is sent (#329). */
export const sendPasswordReset = async (
  passwordResetRouteParts: PasswordResetRouteParts,
  target: PasswordResetTarget,
  auditLogEntry?: AuditLogEntry,
): Promise<void> => {
  await sendEmailAfterCommit(
    passwordResetRouteParts.sendEmail,
    await createPasswordReset(passwordResetRouteParts, target, auditLogEntry),
  );
};

/** A reset's token as it is stored, with what using it needs, or undefined for a token no reset holds. */
const findPasswordReset = async (database: ReachDatabase, token: string) => {
  const foundResets = await database
    .select({
      isLive: sql<boolean>`${passwordResets.expiresAt} > now()`,
      email: users.email,
    })
    .from(passwordResets)
    .innerJoin(users, eq(users.id, passwordResets.userId))
    .where(eq(passwordResets.tokenHash, hashSecretToken(token)));
  return foundResets.at(0);
};

const findConfirmedUserId = async (
  database: ReachDatabase,
  email: string,
): Promise<string | undefined> => {
  const confirmedUsers = await database
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.email, email),
        isNotNull(users.emailConfirmedAt),
        isNull(users.deactivatedAt),
      ),
    );
  return confirmedUsers.at(0)?.id;
};

const emailPasswordResetLink = async (
  passwordResetRouteParts: PasswordResetRouteParts,
  log: FastifyBaseLogger,
  email: string,
): Promise<void> => {
  const userId = await findConfirmedUserId(
    passwordResetRouteParts.database,
    email,
  );
  if (userId === undefined) {
    log.info("auth.password-reset.no-confirmed-account");
    return;
  }

  await sendPasswordReset(
    passwordResetRouteParts,
    { userId, email },
    {
      action: "password-reset.requested",
      actor: { type: "none" },
      target: { type: "user", id: userId },
    },
  );
  log.info({ userId }, "auth.password-reset.created");
};

/** Once for each run of refusals, so a flood of requests leaves a trace without writing a row for each. */
const recordResetRequestsRefused = async (
  database: ReachDatabase,
  log: FastifyBaseLogger,
  email: string,
): Promise<void> => {
  const userId = await findConfirmedUserId(database, email);
  if (userId === undefined) {
    log.warn("auth.password-reset.rate-limited.no-confirmed-account");
    return;
  }
  await insertAuditLogEntry(database, {
    action: "password-reset.rate-limited",
    actor: { type: "none" },
    target: { type: "user", id: userId },
  });
  log.warn({ userId }, "auth.password-reset.rate-limited");
};

export const registerPasswordResetRoutes = (
  server: FastifyInstance,
  {
    requestRateLimits,
    ...passwordResetRouteParts
  }: PasswordResetRequestRouteParts,
): void => {
  const { database, sendEmail } = passwordResetRouteParts;

  server.post<{ Body: PasswordResetRequestBody }>(
    "/api/password-reset-requests",
    {
      config: {
        reach: "none",
        noReachReason:
          "The adult has forgotten their password, so they can't be signed in, and it answers the same whatever the address",
      },
      schema: { body: passwordResetRequestBodySchema },
    },
    async (request, reply) => {
      const email = normaliseEmail(request.body.email);
      // Counted for every address, with an account or without, so a refusal can't reveal which have one.
      // Keyed on its hash, so the counters hold no addresses and a long one costs no more memory than a short one.
      const accountAnswer = requestRateLimits.resetRequestsPerAccount.take(
        createHash("sha256").update(email).digest("hex"),
      );
      if (accountAnswer !== "allowed") {
        if (accountAnswer === "first-refusal") {
          // Not awaited either, so the refusal is the same whether or not the address has an account.
          void recordResetRequestsRefused(database, request.log, email).catch(
            (error: unknown) => {
              request.log.error(
                { err: error },
                "auth.password-reset.rate-limit-entry-failed",
              );
            },
          );
        }
        throw new TooManyRequestsError();
      }
      // Not awaited, so neither the answer nor its timing can reveal which addresses have accounts.
      void emailPasswordResetLink(
        passwordResetRouteParts,
        request.log,
        email,
      ).catch((error: unknown) => {
        request.log.error({ err: error }, "auth.password-reset.failed");
      });

      return reply.code(204).send();
    },
  );

  server.post<{ Body: PasswordResetBody }>(
    "/api/password-resets",
    {
      config: {
        reach: "none",
        noReachReason:
          "The adult has forgotten their password: its credential is the emailed reset token",
      },
      schema: { body: passwordResetBodySchema },
    },
    async (request, reply) => {
      const { token, newPassword } = request.body;
      if (!isPasswordLongEnough(newPassword)) {
        throw new PasswordTooShortError();
      }

      // The token is looked up first, so a wrong one costs one indexed lookup and no argon2 hash (#330).
      const foundReset = await findPasswordReset(database, token);
      if (!foundReset?.isLive) {
        if (foundReset !== undefined) {
          // An expired link is used up by trying it, as it always was.
          await database
            .delete(passwordResets)
            .where(eq(passwordResets.tokenHash, hashSecretToken(token)));
        }
        request.log.info("auth.password-reset.refused");
        throw new PasswordResetNotFoundError();
      }

      const newPasswordHash = await hash(newPassword);
      // Sent before the change is saved, and holding no database connection, so a slow mail server holds nothing but
      // this request (#329). If it can't be sent, the password stays as it was and the link still works.
      await sendEmail(
        buildPasswordChangedNotice({
          to: foundReset.email,
          changedAt: new Date(),
        }),
      );
      const resetUserId = await database.transaction(async (transaction) => {
        // Used only while still live, so two requests with one link can't both set a password.
        const usedResets = await transaction
          .delete(passwordResets)
          .where(
            and(
              eq(passwordResets.tokenHash, hashSecretToken(token)),
              gt(passwordResets.expiresAt, sql`now()`),
            ),
          )
          .returning({
            userId: passwordResets.userId,
            opensSecondFactorSetup: passwordResets.opensSecondFactorSetup,
          });
        const usedReset = usedResets.at(0);
        if (usedReset === undefined) {
          return undefined;
        }

        const { userId, opensSecondFactorSetup } = usedReset;
        const [user] = await transaction
          .update(users)
          .set({
            passwordHash: newPasswordHash,
            // A link the reset-request route sent leaves the setup as it was, so a mailbox alone can't reopen it.
            ...(opensSecondFactorSetup
              ? { secondFactorSetupUntil: buildSecondFactorSetupReopening() }
              : {}),
          })
          .where(eq(users.id, userId))
          .returning({ roles: users.roles });
        await transaction.delete(signIns).where(eq(signIns.userId, userId));
        // An email change a stolen session asked for dies with it (#252).
        await deleteOutstandingAccountTokens(transaction, userId);
        await insertAuditLogEntry(transaction, {
          action: "password.reset",
          actor: { type: "user", id: userId, roles: user.roles },
          target: { type: "user", id: userId },
          ...(opensSecondFactorSetup
            ? {
                detail: `second-factor setup open ${String(secondFactorSetupDays)} days`,
              }
            : {}),
        });
        await transaction
          .delete(pendingSignIns)
          .where(eq(pendingSignIns.userId, userId));
        // The Family Devices this adult's sign-ins made go with those sign-ins (#303).
        await signOutFamilyDevicesMadeBy(
          transaction,
          userId,
          { type: "user", id: userId, roles: user.roles },
          "password reset",
        );
        return userId;
      });
      if (resetUserId === undefined) {
        request.log.info("auth.password-reset.refused");
        throw new PasswordResetNotFoundError();
      }
      request.log.info({ userId: resetUserId }, "auth.password.reset");

      return reply.code(204).send();
    },
  );
};
