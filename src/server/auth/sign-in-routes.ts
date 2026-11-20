import type { CookieSerializeOptions } from "@fastify/cookie";
import { hash, verify } from "@node-rs/argon2";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  findClientIpAddress,
  insertAuditLogEntry,
} from "../audit/audit-log.js";
import type { Database } from "../database.js";
import { buildSignInCodesPausedNotice } from "../email/emails.js";
import type { SendEmail } from "../email/send-email.js";
import {
  buildEmailAddressKey,
  TooManyRequestsError,
  type RequestRateLimits,
} from "../rate-limit/request-rate-limit.js";
import { pendingSignIns, signIns, totpSecrets, users } from "../schema.js";
import { normaliseEmail } from "./email-address.js";
import { buildSecretToken, hashSecretToken } from "./secret-token.js";
import {
  isCodePaused,
  mostWrongCodesAWindow,
  recordPendingSignInStart,
  recordWrongCode,
} from "./sign-in-code-limits.js";
import { parentSignInLifetime } from "./sign-in-lifetimes.js";
import { signInCookieName } from "./signed-in-parent.js";
import type { TotpSecretKey } from "./totp-secret-box.js";
import {
  redeemTwoFactorCode,
  twoFactorCodeBodySchema,
} from "./two-factor-routes.js";

export class WrongEmailOrPasswordError extends Error {
  override readonly name = "WrongEmailOrPasswordError";
  readonly statusCode = 401;

  constructor() {
    super("That email address and password don't match an account");
  }
}

export class NoPendingSignInError extends Error {
  override readonly name = "NoPendingSignInError";
  readonly statusCode = 401;

  constructor() {
    super("Sign in with your email address and password again");
  }
}

export class WrongSignInCodeError extends Error {
  override readonly name = "WrongSignInCodeError";
  readonly statusCode = 401;

  constructor() {
    super("That code didn't work");
  }
}

/** One answer whichever per-adult limit fired, so it tells a caller no more than that one did (#256). */
export class TooManySignInTriesError extends Error {
  override readonly name = "TooManySignInTriesError";
  readonly statusCode = 429;

  constructor() {
    super("Too many tries for this account. Wait a while, then try again");
  }
}

// The longest any sign-in lasts. A staff sign-in, and one left unused, is refused sooner when it is used (#244).
const signInLifetimeSeconds = parentSignInLifetime.lifetimeSeconds;
const pendingSignInLifetimeMinutes = 5;
const mostFailedSignInCodes = 5;
const secondsPerMinute = 60;

const pendingSignInCookieName = "wizzaroo_pending_sign_in";

export const signInCookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
};

const pendingSignInCookieOptions: CookieSerializeOptions = {
  ...signInCookieOptions,
  path: "/api/sign-in",
};

interface SignInBody {
  email: string;
  password: string;
}

interface SignInCodeBody {
  code: string;
}

const signInBodySchema = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", minLength: 1 },
    password: { type: "string", minLength: 1 },
  },
} as const;

interface CodePause {
  /** The address to tell, only once it is confirmed, as for every email about an account. */
  confirmedEmail: string | undefined;
  pausedAt: Date;
  pauseEndsAt: Date;
}

type SignInCodeOutcome =
  | { kind: "no-pending-sign-in" }
  | { kind: "paused"; userId: string }
  | { kind: "refused"; userId: string; pause: CodePause | undefined }
  | { kind: "accepted"; userId: string };

interface SignInRouteParts {
  database: Database;
  sendEmail: SendEmail;
  requestRateLimits: RequestRateLimits;
  totpSecretKey: TotpSecretKey;
}

export type SignInMethod =
  "password" | "password-and-code" | "passkey" | "invite";

type FailedSignInStep = "password" | "code" | "passkey";

interface SignInParts {
  userId: string;
  isTwoStep: boolean;
  method: SignInMethod;
}

export const createSignIn = async (
  database: Database,
  request: FastifyRequest,
  reply: FastifyReply,
  { userId, isTwoStep, method }: SignInParts,
): Promise<void> => {
  const token = buildSecretToken();
  await database.transaction(async (transaction) => {
    await transaction.insert(signIns).values({
      tokenHash: hashSecretToken(token),
      userId,
      expiresAt: sql`now() + make_interval(secs => ${signInLifetimeSeconds})`,
      isTwoStep,
    });
    const [{ roles }] = await transaction
      .update(users)
      .set({ lastLoginAt: sql`now()` })
      .where(eq(users.id, userId))
      .returning({ roles: users.roles });
    await insertAuditLogEntry(transaction, {
      action: "sign-in.succeeded",
      actor: { type: "user", id: userId, roles },
      target: { type: "user", id: userId },
      detail: method,
      ipAddress: findClientIpAddress(request),
    });
  });
  reply.setCookie(signInCookieName, token, {
    ...signInCookieOptions,
    maxAge: signInLifetimeSeconds,
  });
};

/** Written before the refusal is thrown, outside any transaction the refusal would roll back. */
export const insertFailedSignInEntry = (
  database: Database,
  request: FastifyRequest,
  { step, userId }: { step: FailedSignInStep; userId?: string },
): Promise<void> =>
  insertAuditLogEntry(database, {
    action: "sign-in.failed",
    actor: { type: "none" },
    target: userId === undefined ? undefined : { type: "user", id: userId },
    detail: step,
    ipAddress: findClientIpAddress(request),
  });

// The database's clock decides every window, as it decides when a pending sign-in expires.
const databaseNow = sql<Date>`now()`.mapWith(totpSecrets.codePauseEndsAt);

/** False, with nothing written, when the adult has started as many pending sign-ins as the limits allow (#256). */
const createPendingSignIn = async (
  database: Database,
  reply: FastifyReply,
  userId: string,
): Promise<boolean> => {
  const token = buildSecretToken();
  const isStarted = await database.transaction(async (transaction) => {
    // Locking the adult's TOTP row makes pending sign-ins started at once for one adult count one after another.
    const lockedSecrets = await transaction
      .select({
        pendingSignInsStartedAt: totpSecrets.pendingSignInsStartedAt,
        now: databaseNow,
      })
      .from(totpSecrets)
      .where(eq(totpSecrets.userId, userId))
      .for("update");
    const lockedSecret = lockedSecrets.at(0);
    if (lockedSecret !== undefined) {
      const pendingSignInsStartedAt = recordPendingSignInStart(
        lockedSecret.pendingSignInsStartedAt,
        lockedSecret.now,
      );
      if (pendingSignInsStartedAt === undefined) {
        return false;
      }
      await transaction
        .update(totpSecrets)
        .set({ pendingSignInsStartedAt })
        .where(eq(totpSecrets.userId, userId));
    }
    await transaction.insert(pendingSignIns).values({
      tokenHash: hashSecretToken(token),
      userId,
      expiresAt: sql`now() + make_interval(mins => ${pendingSignInLifetimeMinutes})`,
    });
    return true;
  });
  if (isStarted) {
    reply.setCookie(pendingSignInCookieName, token, {
      ...pendingSignInCookieOptions,
      maxAge: pendingSignInLifetimeMinutes * secondsPerMinute,
    });
  }
  return isStarted;
};

const checkSignInCode = (
  database: Database,
  pendingSignInToken: string,
  code: string,
  totpSecretKey: TotpSecretKey,
): Promise<SignInCodeOutcome> =>
  database.transaction(async (transaction) => {
    const tokenHash = hashSecretToken(pendingSignInToken);
    // The lock covers the adult's TOTP row too, so codes for one adult are counted one after another, whichever pending sign-in carries them.
    const livePendingSignIns = await transaction
      .select({
        userId: pendingSignIns.userId,
        failedAttempts: pendingSignIns.failedAttempts,
        email: users.email,
        emailConfirmedAt: users.emailConfirmedAt,
        totpSecret: totpSecrets.secret,
        wrongCodesAt: totpSecrets.wrongCodesAt,
        codePauseEndsAt: totpSecrets.codePauseEndsAt,
        now: databaseNow,
      })
      .from(pendingSignIns)
      .innerJoin(users, eq(users.id, pendingSignIns.userId))
      .innerJoin(totpSecrets, eq(totpSecrets.userId, pendingSignIns.userId))
      .where(
        and(
          eq(pendingSignIns.tokenHash, tokenHash),
          gt(pendingSignIns.expiresAt, sql`now()`),
          isNull(users.deactivatedAt),
        ),
      )
      .for("update");
    const pendingSignIn = livePendingSignIns.at(0);
    if (pendingSignIn === undefined) {
      return { kind: "no-pending-sign-in" };
    }

    const { userId, failedAttempts, email, totpSecret, now } = pendingSignIn;
    // Wrong codes count against the adult, so while their codes are paused no code is checked at all, the right one included (#256).
    if (isCodePaused(pendingSignIn.codePauseEndsAt, now)) {
      return { kind: "paused", userId };
    }

    const isCodeRedeemed = await redeemTwoFactorCode(transaction, {
      userId,
      sealedTotpSecret: totpSecret,
      totpSecretKey,
      code,
    });
    const wrongCode = isCodeRedeemed
      ? undefined
      : recordWrongCode(pendingSignIn.wrongCodesAt, now);
    if (wrongCode !== undefined) {
      await transaction
        .update(totpSecrets)
        .set(wrongCode)
        .where(eq(totpSecrets.userId, userId));
    }
    const isCodePausedNow =
      wrongCode !== undefined && wrongCode.codePauseEndsAt !== null;
    const isSignInOver =
      isCodeRedeemed ||
      failedAttempts + 1 >= mostFailedSignInCodes ||
      isCodePausedNow;
    await (isSignInOver
      ? transaction
          .delete(pendingSignIns)
          .where(eq(pendingSignIns.tokenHash, tokenHash))
      : transaction
          .update(pendingSignIns)
          .set({ failedAttempts: failedAttempts + 1 })
          .where(eq(pendingSignIns.tokenHash, tokenHash)));
    if (wrongCode === undefined) {
      return { kind: "accepted", userId };
    }
    const pause =
      wrongCode.codePauseEndsAt === null
        ? undefined
        : {
            confirmedEmail:
              pendingSignIn.emailConfirmedAt === null ? undefined : email,
            pausedAt: now,
            pauseEndsAt: wrongCode.codePauseEndsAt,
          };
    return { kind: "refused", userId, pause };
  });

/** Once for each run of refusals, so guessing leaves a trace without writing a row for each refused request (#246). */
const recordFailedSignInsRefused = async (
  database: Database,
  request: FastifyRequest,
  email: string,
): Promise<void> => {
  const matchingUsers = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  const user = matchingUsers.at(0);
  if (user === undefined) {
    request.log.warn("auth.sign-in.rate-limited.no-account");
    return;
  }
  await insertAuditLogEntry(database, {
    action: "sign-in.rate-limited",
    actor: { type: "none" },
    target: { type: "user", id: user.id },
  });
  request.log.warn({ userId: user.id }, "auth.sign-in.rate-limited");
};

/** Tells the adult their codes are paused. A mail server that fails is logged, and the code is still refused. */
const sendCodePauseNotice = async (
  sendEmail: SendEmail,
  request: FastifyRequest,
  userId: string,
  { confirmedEmail, pausedAt, pauseEndsAt }: CodePause,
): Promise<void> => {
  if (confirmedEmail === undefined) {
    return;
  }
  try {
    await sendEmail(
      buildSignInCodesPausedNotice({
        to: confirmedEmail,
        wrongCodes: mostWrongCodesAWindow,
        pausedAt,
        pauseEndsAt,
      }),
    );
  } catch (error) {
    request.log.error(
      { err: error, userId },
      "auth.sign-in.code-pause-notice-failed",
    );
  }
};

export const registerSignInRoutes = async (
  server: FastifyInstance,
  { database, sendEmail, requestRateLimits, totpSecretKey }: SignInRouteParts,
): Promise<void> => {
  const absentUserPasswordHash = await hash(buildSecretToken());

  server.post<{ Body: SignInBody }>(
    "/api/sign-in",
    {
      config: {
        reach: "none",
        noReachReason: "It is how a sign-in is made, so no one is known yet",
      },
      schema: { body: signInBodySchema },
    },
    async (request, reply) => {
      const { password } = request.body;
      const email = normaliseEmail(request.body.email);
      // Counted for every address, with an account or without, so a refusal can't reveal which have one. The try is
      // counted before the password is checked, so tries sent at once can't all be checked before one is counted, and a
      // refused try spends no argon2, the right password's included. A right password gives its try back (#246).
      const accountKey = buildEmailAddressKey(email);
      const accountAnswer =
        requestRateLimits.failedSignInsPerAccount.take(accountKey);
      if (accountAnswer !== "allowed") {
        if (accountAnswer === "first-refusal") {
          // Not awaited, so the refusal is the same whether or not the address has an account.
          void recordFailedSignInsRefused(database, request, email).catch(
            (error: unknown) => {
              request.log.error(
                { err: error },
                "auth.sign-in.rate-limit-entry-failed",
              );
            },
          );
        }
        throw new TooManyRequestsError();
      }

      const matchingUsers = await database
        .select({
          id: users.id,
          passwordHash: users.passwordHash,
          totpUserId: totpSecrets.userId,
        })
        .from(users)
        .leftJoin(totpSecrets, eq(totpSecrets.userId, users.id))
        .where(and(eq(users.email, email), isNull(users.deactivatedAt)));
      const user = matchingUsers.at(0);

      // An unknown email is still checked against a hash, so the response time can't reveal which emails have accounts.
      const passwordHash = user?.passwordHash ?? absentUserPasswordHash;
      const isPasswordRight = await verify(passwordHash, password);
      if (user === undefined || !isPasswordRight) {
        await insertFailedSignInEntry(database, request, {
          step: "password",
          userId: user?.id,
        });
        request.log.info("auth.sign-in.refused");
        throw new WrongEmailOrPasswordError();
      }
      requestRateLimits.failedSignInsPerAccount.giveBack(accountKey);

      if (user.totpUserId !== null) {
        const isStarted = await createPendingSignIn(database, reply, user.id);
        if (!isStarted) {
          request.log.info(
            { userId: user.id },
            "auth.sign-in.pending-sign-ins-limited",
          );
          throw new TooManySignInTriesError();
        }
        request.log.info({ userId: user.id }, "auth.sign-in.code-requested");
        return reply.code(202).send({ secondStep: "two-factor-code" });
      }

      await createSignIn(database, request, reply, {
        userId: user.id,
        isTwoStep: false,
        method: "password",
      });
      request.log.info(
        { userId: user.id, method: "password" },
        "auth.sign-in.created",
      );
      return reply.code(204).send();
    },
  );

  server.post<{ Body: SignInCodeBody }>(
    "/api/sign-in/two-factor-code",
    {
      config: {
        reach: "none",
        noReachReason:
          "The second step of a password sign-in: its credential is the pending sign-in cookie the password step set",
      },
      schema: { body: twoFactorCodeBodySchema },
    },
    async (request, reply) => {
      const pendingSignInToken = request.cookies[pendingSignInCookieName];
      if (pendingSignInToken === undefined) {
        throw new NoPendingSignInError();
      }

      const outcome = await checkSignInCode(
        database,
        pendingSignInToken,
        request.body.code,
        totpSecretKey,
      );
      if (outcome.kind === "no-pending-sign-in") {
        throw new NoPendingSignInError();
      }
      if (outcome.kind === "paused") {
        request.log.info(
          { userId: outcome.userId },
          "auth.sign-in.code-paused",
        );
        throw new TooManySignInTriesError();
      }
      if (outcome.kind === "refused") {
        await insertFailedSignInEntry(database, request, {
          step: "code",
          userId: outcome.userId,
        });
        request.log.info("auth.sign-in.code-refused");
        if (outcome.pause !== undefined) {
          request.log.warn(
            { userId: outcome.userId, pauseEndsAt: outcome.pause.pauseEndsAt },
            "auth.sign-in.codes-paused",
          );
          await sendCodePauseNotice(
            sendEmail,
            request,
            outcome.userId,
            outcome.pause,
          );
        }
        throw new WrongSignInCodeError();
      }

      await createSignIn(database, request, reply, {
        userId: outcome.userId,
        isTwoStep: true,
        method: "password-and-code",
      });
      request.log.info(
        { userId: outcome.userId, method: "password-and-code" },
        "auth.sign-in.created",
      );
      return reply
        .clearCookie(pendingSignInCookieName, pendingSignInCookieOptions)
        .code(204)
        .send();
    },
  );

  server.post(
    "/api/sign-out",
    {
      config: {
        reach: "none",
        noReachReason:
          "Its credential is the sign-in cookie it ends, and it has to clear that cookie even for a sign-in a wrapper would refuse",
      },
    },
    async (request, reply) => {
      const token = request.cookies[signInCookieName];
      if (token !== undefined) {
        await database.transaction(async (transaction) => {
          const endedSignIns = await transaction
            .delete(signIns)
            .where(eq(signIns.tokenHash, hashSecretToken(token)))
            .returning({ userId: signIns.userId });
          const endedSignIn = endedSignIns.at(0);
          if (endedSignIn === undefined) {
            return;
          }
          const [{ roles }] = await transaction
            .select({ roles: users.roles })
            .from(users)
            .where(eq(users.id, endedSignIn.userId));
          await insertAuditLogEntry(transaction, {
            action: "sign-out",
            actor: { type: "user", id: endedSignIn.userId, roles },
            target: { type: "user", id: endedSignIn.userId },
          });
        });
      }
      return reply
        .clearCookie(signInCookieName, signInCookieOptions)
        .code(204)
        .send();
    },
  );
};
