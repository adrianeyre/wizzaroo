import { randomInt } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import type { Database } from "../database.js";
import {
  buildEmailAddressKey,
  TooManyRequestsError,
  type RequestRateLimits,
} from "../rate-limit/request-rate-limit.js";
import { signInCodes, users } from "../schema.js";
import {
  accountProofSchemaProperties,
  checkAccountProof,
  readAccountProof,
  type AccountProofBody,
} from "./account-proof.js";
import { hashSecretToken } from "./secret-token.js";
import { createSignIn, insertFailedSignInEntry } from "./sign-in-routes.js";
import { runAsSignedInUser } from "./signed-in-parent.js";
import type { TotpSecretKey } from "./totp-secret-box.js";

export class SignInCodeNotFoundError extends Error {
  override readonly name = "SignInCodeNotFoundError";
  readonly statusCode = 401;

  constructor() {
    super("That code is wrong, has expired or has already been used");
  }
}

export const signInCodeLifetimeMinutes = 10;

/** Crockford's base32: no I, L, O or U, so a code read off one screen and typed on another is hard to get wrong. */
const signInCodeAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/** 50 bits, alive for 10 minutes, behind the sign-in routes' per-address limit: guessing one is out of reach. */
const signInCodeLength = 10;
const signInCodeGroupLength = 5;

/** Makes a code shown in two groups of five, such as `7KQ2M-X9TPA`. */
export const buildSignInCode = (): string =>
  Array.from({ length: signInCodeLength }, (_, index) =>
    index === signInCodeGroupLength
      ? `-${signInCodeAlphabet[randomInt(signInCodeAlphabet.length)]}`
      : signInCodeAlphabet[randomInt(signInCodeAlphabet.length)],
  ).join("");

/**
 * Reads a code however it was typed: in any case, with or without its dash or spaces, and with the letters Crockford's
 * base32 leaves out read as the digits they look like.
 */
export const normaliseSignInCode = (typedCode: string): string =>
  typedCode
    .toUpperCase()
    .replaceAll(/[\s-]/gu, "")
    .replaceAll("O", "0")
    .replaceAll(/[IL]/gu, "1");

const hashSignInCode = (typedCode: string): string =>
  hashSecretToken(normaliseSignInCode(typedCode));

export interface SignInCode {
  code: string;
  url: string;
  expiresAt: Date;
}

interface SignInCodeSignInBody {
  code: string;
}

const signInCodeBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: accountProofSchemaProperties,
} as const;

const signInCodeSignInBodySchema = {
  type: "object",
  required: ["code"],
  additionalProperties: false,
  properties: { code: { type: "string", minLength: 1, maxLength: 40 } },
} as const;

const signInCodeFragmentName = "sign-in-code";

const buildSignInCodeUrl = (publicUrl: URL, code: string): URL =>
  new URL(`/parent/#${signInCodeFragmentName}=${code}`, publicUrl);

interface SignInCodeRouteParts {
  database: Database;
  publicUrl: URL;
  requestRateLimits: RequestRateLimits;
  totpSecretKey: TotpSecretKey;
}

export const registerSignInCodeRoutes = (
  server: FastifyInstance,
  {
    database,
    publicUrl,
    requestRateLimits,
    totpSecretKey,
  }: SignInCodeRouteParts,
): void => {
  const relyingParty = {
    relyingPartyId: publicUrl.hostname,
    expectedOrigin: publicUrl.origin,
  };

  // A sign-in code makes a sign-in on another device, which outlives the one making it, so making one takes a fresh
  // proof of the account, as making a Family Device does. A staff adult proves it with a second factor (ADR 0073).
  server.post<{ Body: AccountProofBody }>(
    "/api/sign-in-codes",
    { config: { reach: "user" }, schema: { body: signInCodeBodySchema } },
    async (request, reply) => {
      const signInCode = await runAsSignedInUser(
        database,
        request,
        async (signedInUser, reachDatabase): Promise<SignInCode> => {
          const { userId, roles } = signedInUser;
          const proof = readAccountProof(request.body, roles);
          const [user] = await reachDatabase
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, userId));
          // A wrong proof counts against the account as a wrong password at sign-in does (#246).
          const accountKey = buildEmailAddressKey(user.email);
          if (
            requestRateLimits.failedSignInsPerAccount.take(accountKey) !==
            "allowed"
          ) {
            request.log.info({ userId }, "auth.sign-in-code.proof-limited");
            throw new TooManyRequestsError();
          }
          try {
            await checkAccountProof(reachDatabase, proof, {
              userId,
              relyingParty,
              totpSecretKey,
            });
          } catch (error) {
            request.log.info({ userId }, "auth.sign-in-code.refused");
            throw error;
          }
          requestRateLimits.failedSignInsPerAccount.giveBack(accountKey);

          const code = buildSignInCode();
          return reachDatabase.transaction(async (transaction) => {
            await transaction
              .delete(signInCodes)
              .where(eq(signInCodes.userId, userId));
            const [created] = await transaction
              .insert(signInCodes)
              .values({
                codeHash: hashSignInCode(code),
                userId,
                isTwoStep: proof.kind !== "password",
                expiresAt: sql`now() + make_interval(mins => ${signInCodeLifetimeMinutes})`,
              })
              .returning({ expiresAt: signInCodes.expiresAt });
            await insertAuditLogEntry(transaction, {
              action: "sign-in-code.created",
              actor: buildUserActor(signedInUser),
              target: { type: "user", id: userId },
              detail: proof.kind,
            });
            request.log.info({ userId }, "auth.sign-in-code.created");
            return {
              code,
              url: buildSignInCodeUrl(publicUrl, code).href,
              expiresAt: created.expiresAt,
            };
          });
        },
      );
      return reply.code(201).send(signInCode);
    },
  );

  server.post<{ Body: SignInCodeSignInBody }>(
    "/api/sign-in-code-sign-ins",
    {
      config: {
        reach: "none",
        noReachReason:
          "It is how a device signs in with a code from another, so no one is known yet",
      },
      schema: { body: signInCodeSignInBodySchema },
    },
    async (request, reply) => {
      await database
        .delete(signInCodes)
        .where(lt(signInCodes.expiresAt, sql`now()`));
      const codeHash = hashSignInCode(request.body.code);
      // Spent as it is read, so two requests with one code can't both sign in.
      const spentCode = await database.transaction(async (transaction) => {
        const liveCodes = await transaction
          .select({
            userId: signInCodes.userId,
            isTwoStep: signInCodes.isTwoStep,
          })
          .from(signInCodes)
          .innerJoin(users, eq(users.id, signInCodes.userId))
          .where(
            and(
              eq(signInCodes.codeHash, codeHash),
              gt(signInCodes.expiresAt, sql`now()`),
              isNull(users.deactivatedAt),
            ),
          )
          .for("update", { of: signInCodes });
        await transaction
          .delete(signInCodes)
          .where(eq(signInCodes.codeHash, codeHash));
        return liveCodes.at(0);
      });
      if (spentCode === undefined) {
        await insertFailedSignInEntry(database, request, {
          step: "sign-in-code",
        });
        request.log.info("auth.sign-in.refused");
        throw new SignInCodeNotFoundError();
      }
      await createSignIn(database, request, reply, {
        userId: spentCode.userId,
        isTwoStep: spentCode.isTwoStep,
        method: "sign-in-code",
      });
      request.log.info(
        { userId: spentCode.userId, method: "sign-in-code" },
        "auth.sign-in.created",
      );
      return reply.code(204).send();
    },
  );
};
