import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import type { Database } from "../database.js";
import { buildTwoFactorTurnedOffNotice } from "../email/emails.js";
import type { SendEmail } from "../email/send-email.js";
import { recoveryCodes, totpSecrets, totpSetups, users } from "../schema.js";
import { isCodePaused, recordWrongCode } from "./sign-in-code-limits.js";
import {
  countSecondFactors,
  LastSecondFactorError,
  loadSignInMethodsForUpdate,
} from "./sign-in-methods-routes.js";
import {
  markSignInTwoStep,
  runAsSignedInUser,
  runAsSignedInUserAddingSecondFactor,
} from "./signed-in-parent.js";
import {
  openTotpSecret,
  sealTotpSecret,
  type TotpSecretKey,
} from "./totp-secret-box.js";
import {
  buildRecoveryCodes,
  buildTotpSecret,
  buildTotpSetupKey,
  buildTotpUri,
  findTotpStep,
  hashRecoveryCode,
  isRecoveryCodeRight,
  isTotpCodeShaped,
} from "./two-factor.js";

export class TwoFactorAlreadyOnError extends Error {
  override readonly name = "TwoFactorAlreadyOnError";
  readonly statusCode = 409;

  constructor() {
    super("Two-factor authentication is already on");
  }
}

export class TwoFactorNotOnError extends Error {
  override readonly name = "TwoFactorNotOnError";
  readonly statusCode = 409;

  constructor() {
    super("Two-factor authentication is already off");
  }
}

export class TotpSetupNotFoundError extends Error {
  override readonly name = "TotpSetupNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("Start setting up two-factor authentication again");
  }
}

export class WrongTwoFactorCodeError extends Error {
  override readonly name = "WrongTwoFactorCodeError";
  readonly statusCode = 403;

  constructor() {
    super("That code didn't work");
  }
}

/** The sign-in step's answer while an adult's codes are paused, so turning two-factor off tells a caller no more (#257). */
export class TwoFactorCodesPausedError extends Error {
  override readonly name = "TwoFactorCodesPausedError";
  readonly statusCode = 429;

  constructor() {
    super("Too many tries for this account. Wait a while, then try again");
  }
}

const totpSetupLifetimeMinutes = 10;

// The database's clock decides when a pause ends, as it does at the sign-in step.
const databaseNow = sql<Date>`now()`.mapWith(totpSecrets.codePauseEndsAt);

interface TotpSetup {
  setupKey: string;
  setupUri: string;
}

interface TwoFactorCodeBody {
  code: string;
}

export const twoFactorCodeBodySchema = {
  type: "object",
  required: ["code"],
  additionalProperties: false,
  properties: { code: { type: "string", minLength: 1, maxLength: 40 } },
} as const;

interface TwoFactorCodeRedemption {
  userId: string;
  /** totp_secrets.secret as stored: sealed under the key (#254). */
  sealedTotpSecret: string;
  totpSecretKey: TotpSecretKey;
  code: string;
}

/** Spends the one of the adult's recovery codes that the typed code matches, if any (#255). */
const redeemRecoveryCode = async (
  transaction: Pick<Database, "select" | "delete">,
  userId: string,
  code: string,
): Promise<boolean> => {
  // Locked, so two requests racing with one code can't both spend it.
  const storedCodes = await transaction
    .select({ id: recoveryCodes.id, codeHash: recoveryCodes.codeHash })
    .from(recoveryCodes)
    .where(eq(recoveryCodes.userId, userId))
    .for("update");
  for (const storedCode of storedCodes) {
    // One at a time: each check is an argon2 hash, and at most one of them matches.
    if (await isRecoveryCodeRight(storedCode.codeHash, code)) {
      const spentCodes = await transaction
        .delete(recoveryCodes)
        .where(eq(recoveryCodes.id, storedCode.id))
        .returning({ id: recoveryCodes.id });
      return spentCodes.length > 0;
    }
  }
  return false;
};

export const redeemTwoFactorCode = async (
  transaction: Pick<Database, "select" | "update" | "delete">,
  { userId, sealedTotpSecret, totpSecretKey, code }: TwoFactorCodeRedemption,
): Promise<boolean> => {
  if (!isTotpCodeShaped(code)) {
    return redeemRecoveryCode(transaction, userId, code);
  }

  // A secret that doesn't open, under another key or written behind the server's back, makes no code.
  const totpSecret = openTotpSecret(totpSecretKey, {
    userId,
    sealedSecret: sealedTotpSecret,
  });
  if (totpSecret === undefined) {
    return false;
  }
  const step = findTotpStep({ secret: totpSecret, code, now: new Date() });
  if (step === undefined) {
    return false;
  }
  const updatedSecrets = await transaction
    .update(totpSecrets)
    .set({ lastUsedStep: step })
    .where(
      and(
        eq(totpSecrets.userId, userId),
        or(
          isNull(totpSecrets.lastUsedStep),
          lt(totpSecrets.lastUsedStep, step),
        ),
      ),
    )
    .returning({ userId: totpSecrets.userId });
  return updatedSecrets.length > 0;
};

interface TwoFactorRouteParts {
  database: Database;
  sendEmail: SendEmail;
  totpSecretKey: TotpSecretKey;
}

type TurnOffRefusal = "wrong-code" | "codes-paused";

/** A right code, with the address its notice goes to, or null for an unconfirmed one; or why the code was refused. */
type TurnOffOutcome =
  | { kind: "code-proved"; noticeTo: string | null }
  | { kind: "refused"; refusal: TurnOffRefusal };

export const registerTwoFactorRoutes = (
  server: FastifyInstance,
  { database, sendEmail, totpSecretKey }: TwoFactorRouteParts,
): void => {
  server.post(
    "/api/totp-setups",
    { config: { reach: "user" } },
    async (request): Promise<TotpSetup> => {
      return runAsSignedInUserAddingSecondFactor(
        database,
        request,
        async ({ userId }, reachDatabase) => {
          const [user] = await reachDatabase
            .select({ email: users.email, totpUserId: totpSecrets.userId })
            .from(users)
            .leftJoin(totpSecrets, eq(totpSecrets.userId, users.id))
            .where(eq(users.id, userId));
          if (user.totpUserId !== null) {
            throw new TwoFactorAlreadyOnError();
          }

          const secret = buildTotpSecret();
          const sealedSecret = sealTotpSecret(totpSecretKey, {
            userId,
            secret,
          });
          const expiresAt = sql`now() + make_interval(mins => ${totpSetupLifetimeMinutes})`;
          await reachDatabase
            .insert(totpSetups)
            .values({ userId, secret: sealedSecret, expiresAt })
            .onConflictDoUpdate({
              target: totpSetups.userId,
              set: { secret: sealedSecret, expiresAt },
            });
          request.log.info({ userId }, "auth.totp-setup.created");

          return {
            setupKey: buildTotpSetupKey(secret),
            setupUri: buildTotpUri({ secret, email: user.email }),
          };
        },
      );
    },
  );

  server.post<{ Body: TwoFactorCodeBody }>(
    "/api/two-factor",
    { config: { reach: "user" }, schema: { body: twoFactorCodeBodySchema } },
    async (request, reply) => {
      const turnedOn = await runAsSignedInUserAddingSecondFactor(
        database,
        request,
        async (signedInUser, reachDatabase) => {
          const { userId, signInTokenHash } = signedInUser;
          const liveSetups = await reachDatabase
            .select({ secret: totpSetups.secret })
            .from(totpSetups)
            .where(
              and(
                eq(totpSetups.userId, userId),
                gt(totpSetups.expiresAt, sql`now()`),
              ),
            );
          const setup = liveSetups.at(0);
          // A setup sealed under another key can't make the code the app shows, so it is started again.
          const setupSecret =
            setup === undefined
              ? undefined
              : openTotpSecret(totpSecretKey, {
                  userId,
                  sealedSecret: setup.secret,
                });
          if (setup === undefined || setupSecret === undefined) {
            throw new TotpSetupNotFoundError();
          }
          const step = findTotpStep({
            secret: setupSecret,
            code: request.body.code,
            now: new Date(),
          });
          if (step === undefined) {
            request.log.info({ userId }, "auth.two-factor.refused");
            throw new WrongTwoFactorCodeError();
          }

          const newRecoveryCodes = buildRecoveryCodes();
          const newRecoveryCodeHashes = await Promise.all(
            newRecoveryCodes.map((recoveryCode) =>
              hashRecoveryCode(recoveryCode),
            ),
          );
          await reachDatabase.transaction(async (transaction) => {
            const turnedOnSecrets = await transaction
              .insert(totpSecrets)
              .values({ userId, secret: setup.secret, lastUsedStep: step })
              .onConflictDoNothing({ target: totpSecrets.userId })
              .returning({ userId: totpSecrets.userId });
            if (turnedOnSecrets.length === 0) {
              throw new TwoFactorAlreadyOnError();
            }
            await transaction
              .delete(totpSetups)
              .where(eq(totpSetups.userId, userId));
            await transaction
              .delete(recoveryCodes)
              .where(eq(recoveryCodes.userId, userId));
            await transaction.insert(recoveryCodes).values(
              newRecoveryCodeHashes.map((codeHash) => ({
                codeHash,
                userId,
              })),
            );
            // The code just entered proves the second factor, so this sign-in counts as one made with it.
            await markSignInTwoStep(transaction, signInTokenHash);
            await insertAuditLogEntry(transaction, {
              action: "two-factor.turned-on",
              actor: buildUserActor(signedInUser),
              target: { type: "user", id: userId },
            });
          });
          request.log.info({ userId }, "auth.two-factor.turned-on");

          return { recoveryCodes: newRecoveryCodes };
        },
      );
      return reply.code(201).send(turnedOn);
    },
  );

  server.delete<{ Body: TwoFactorCodeBody }>(
    "/api/two-factor",
    { config: { reach: "user" }, schema: { body: twoFactorCodeBodySchema } },
    async (request, reply) => {
      // A refusal is returned rather than thrown, so the wrong code it counts and its Audit Log entry are kept (#257).
      const { userId, outcome } = await runAsSignedInUser(
        database,
        request,
        async (signedInUser, reachDatabase) => {
          const { userId } = signedInUser;
          const turnOffOutcome = await reachDatabase.transaction(
            async (transaction): Promise<TurnOffOutcome> => {
              const signInMethods = await loadSignInMethodsForUpdate(
                transaction,
                userId,
              );
              // Locked, so codes racing for one adult are counted one after another, as at the sign-in step.
              const lockedSecret = (
                await transaction
                  .select({
                    secret: totpSecrets.secret,
                    wrongCodesAt: totpSecrets.wrongCodesAt,
                    codePauseEndsAt: totpSecrets.codePauseEndsAt,
                    now: databaseNow,
                  })
                  .from(totpSecrets)
                  .where(eq(totpSecrets.userId, userId))
                  .for("update")
              ).at(0);
              if (lockedSecret === undefined) {
                throw new TwoFactorNotOnError();
              }
              if (
                signInMethods.needsSecondFactor &&
                countSecondFactors(signInMethods) <= 1
              ) {
                throw new LastSecondFactorError();
              }

              const refuse = async (
                refusal: TurnOffRefusal,
              ): Promise<TurnOffOutcome> => {
                await insertAuditLogEntry(transaction, {
                  action: "two-factor.turn-off-refused",
                  actor: buildUserActor(signedInUser),
                  target: { type: "user", id: userId },
                  detail: refusal,
                });
                return { kind: "refused", refusal };
              };
              // Wrong codes count against the adult, wherever they are sent, so while codes are paused none is checked (#257).
              if (
                isCodePaused(lockedSecret.codePauseEndsAt, lockedSecret.now)
              ) {
                return refuse("codes-paused");
              }
              const isCodeRedeemed = await redeemTwoFactorCode(transaction, {
                userId,
                sealedTotpSecret: lockedSecret.secret,
                totpSecretKey,
                code: request.body.code,
              });
              if (!isCodeRedeemed) {
                await transaction
                  .update(totpSecrets)
                  .set(
                    recordWrongCode(
                      lockedSecret.wrongCodesAt,
                      lockedSecret.now,
                    ),
                  )
                  .where(eq(totpSecrets.userId, userId));
                return refuse("wrong-code");
              }

              const [user] = await transaction
                .select({
                  email: users.email,
                  emailConfirmedAt: users.emailConfirmedAt,
                })
                .from(users)
                .where(eq(users.id, userId));
              return {
                kind: "code-proved",
                noticeTo: user.emailConfirmedAt === null ? null : user.email,
              };
            },
          );
          return { userId, outcome: turnOffOutcome };
        },
      );
      if (outcome.kind === "refused") {
        const { refusal } = outcome;
        if (refusal === "codes-paused") {
          request.log.warn(
            { userId, outcome: refusal },
            "auth.two-factor.refused",
          );
          throw new TwoFactorCodesPausedError();
        }
        request.log.info(
          { userId, outcome: refusal },
          "auth.two-factor.refused",
        );
        throw new WrongTwoFactorCodeError();
      }

      // Sent before the change is saved, as a password change's notice is, so if it can't be sent TOTP stays on. It goes
      // between the two reaches, so a slow mail server holds no database connection (#329). The code is spent either way.
      if (outcome.noticeTo !== null) {
        await sendEmail(
          buildTwoFactorTurnedOffNotice({
            to: outcome.noticeTo,
            turnedOffAt: new Date(),
          }),
        );
      }
      await runAsSignedInUser(
        database,
        request,
        async (signedInUser, reachDatabase) =>
          reachDatabase.transaction(async (transaction) => {
            // Checked again under the lock, since the adult's sign-in methods may have changed while the notice was sent.
            const signInMethods = await loadSignInMethodsForUpdate(
              transaction,
              signedInUser.userId,
            );
            if (
              signInMethods.needsSecondFactor &&
              countSecondFactors(signInMethods) <= 1
            ) {
              throw new LastSecondFactorError();
            }
            const turnedOffSecrets = await transaction
              .delete(totpSecrets)
              .where(eq(totpSecrets.userId, signedInUser.userId))
              .returning({ userId: totpSecrets.userId });
            if (turnedOffSecrets.length === 0) {
              throw new TwoFactorNotOnError();
            }
            await transaction
              .delete(recoveryCodes)
              .where(eq(recoveryCodes.userId, signedInUser.userId));
            await insertAuditLogEntry(transaction, {
              action: "two-factor.turned-off",
              actor: buildUserActor(signedInUser),
              target: { type: "user", id: signedInUser.userId },
            });
          }),
      );
      request.log.info({ userId }, "auth.two-factor.turned-off");
      return reply.code(204).send();
    },
  );
};
