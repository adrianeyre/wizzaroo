import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { insertAuditLogEntry } from "../audit/audit-log.js";
import type { Database } from "../database.js";
import { buildPasskeyAddedNotice } from "../email/emails.js";
import type { SendEmail } from "../email/send-email.js";
import type { ReachDatabase } from "../reach.js";
import { passkeyChallenges, passkeyHandOffs, users } from "../schema.js";
import {
  buildPasskeyRegistrationOptions,
  findPasskeyNoticeAddress,
  insertVerifiedPasskey,
  passkeyRegistrationBodySchema,
  sendPasskeyNotice,
  verifyNewPasskey,
  type PasskeyRegistrationBody,
} from "./passkey-routes.js";
import { buildSecretToken, hashSecretToken } from "./secret-token.js";
import { runAsSignedInUserAddingSecondFactor } from "./signed-in-parent.js";

export class PasskeyHandOffNotFoundError extends Error {
  override readonly name = "PasskeyHandOffNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("That code has expired or has already been used");
  }
}

export const passkeyHandOffLifetimeMinutes = 10;

const addPasskeyFragmentName = "add-passkey";

interface PasskeyHandOffTokenBody {
  token: string;
}

type PasskeyHandOffBody = PasskeyHandOffTokenBody & PasskeyRegistrationBody;

const tokenSchema = { type: "string", minLength: 1, maxLength: 64 } as const;

const passkeyHandOffTokenBodySchema = {
  type: "object",
  required: ["token"],
  additionalProperties: false,
  properties: { token: tokenSchema },
} as const;

const passkeyHandOffBodySchema = {
  ...passkeyRegistrationBodySchema,
  required: ["token", ...passkeyRegistrationBodySchema.required],
  properties: {
    token: tokenSchema,
    ...passkeyRegistrationBodySchema.properties,
  },
} as const;

export interface PasskeyHandOff {
  url: string;
  expiresAt: Date;
}

const buildPasskeyHandOffUrl = (publicUrl: URL, token: string): URL =>
  new URL(`/parent/#${addPasskeyFragmentName}=${token}`, publicUrl);

interface LiveHandOff {
  userId: string;
  challenge: string | null;
}

/** Locks the code's row, so requests for its options at once take turns and leave one challenge between them. */
const findLiveHandOff = async (
  database: ReachDatabase,
  token: string,
): Promise<LiveHandOff> => {
  const liveHandOffs = await database
    .select({
      userId: passkeyHandOffs.userId,
      challenge: passkeyHandOffs.challenge,
    })
    .from(passkeyHandOffs)
    .innerJoin(users, eq(users.id, passkeyHandOffs.userId))
    .where(
      and(
        eq(passkeyHandOffs.tokenHash, hashSecretToken(token)),
        gt(passkeyHandOffs.expiresAt, sql`now()`),
        isNull(users.deactivatedAt),
      ),
    )
    .for("update", { of: passkeyHandOffs });
  const liveHandOff = liveHandOffs.at(0);
  if (liveHandOff === undefined) {
    throw new PasskeyHandOffNotFoundError();
  }
  return liveHandOff;
};

const deleteHandOff = async (
  database: ReachDatabase,
  token: string,
): Promise<void> => {
  const usedHandOffs = await database
    .delete(passkeyHandOffs)
    .where(eq(passkeyHandOffs.tokenHash, hashSecretToken(token)))
    .returning({ tokenHash: passkeyHandOffs.tokenHash });
  if (usedHandOffs.length === 0) {
    throw new PasskeyHandOffNotFoundError();
  }
};

interface PasskeyHandOffRouteParts {
  database: Database;
  sendEmail: SendEmail;
  publicUrl: URL;
}

export const registerPasskeyHandOffRoutes = (
  server: FastifyInstance,
  { database, sendEmail, publicUrl }: PasskeyHandOffRouteParts,
): void => {
  const relyingPartyId = publicUrl.hostname;
  const expectedOrigin = publicUrl.origin;

  server.post(
    "/api/passkey-hand-offs",
    { config: { reach: "user" } },
    async (request, reply) => {
      const handOff = await runAsSignedInUserAddingSecondFactor(
        database,
        request,
        async ({ userId }, reachDatabase): Promise<PasskeyHandOff> => {
          const token = buildSecretToken();
          await reachDatabase
            .delete(passkeyHandOffs)
            .where(eq(passkeyHandOffs.userId, userId));
          const [created] = await reachDatabase
            .insert(passkeyHandOffs)
            .values({
              tokenHash: hashSecretToken(token),
              userId,
              expiresAt: sql`now() + make_interval(mins => ${passkeyHandOffLifetimeMinutes})`,
            })
            .returning({ expiresAt: passkeyHandOffs.expiresAt });
          request.log.info({ userId }, "auth.passkey-hand-off.created");
          return {
            url: buildPasskeyHandOffUrl(publicUrl, token).href,
            expiresAt: created.expiresAt,
          };
        },
      );
      return reply.code(201).send(handOff);
    },
  );

  server.post<{ Body: PasskeyHandOffTokenBody }>(
    "/api/passkey-hand-off-registration-options",
    {
      config: {
        reach: "none",
        noReachReason:
          "The phone isn't signed in (ADR 0036): its credential is the hand-off token from the signed-in computer",
      },
      schema: { body: passkeyHandOffTokenBodySchema },
    },
    async (request) => {
      await database
        .delete(passkeyHandOffs)
        .where(lt(passkeyHandOffs.expiresAt, sql`now()`));
      const { token } = request.body;
      // Whoever holds the code learns nothing about the account that registering a passkey doesn't need (#238), and
      // asking again replaces the code's earlier challenge rather than adding one.
      return database.transaction(async (transaction) => {
        const { userId, challenge } = await findLiveHandOff(transaction, token);
        if (challenge !== null) {
          await transaction
            .delete(passkeyChallenges)
            .where(eq(passkeyChallenges.challenge, challenge));
        }
        const options = await buildPasskeyRegistrationOptions(
          transaction,
          userId,
          relyingPartyId,
          { isNamedByEmail: false },
        );
        await transaction
          .update(passkeyHandOffs)
          .set({ challenge: options.challenge })
          .where(eq(passkeyHandOffs.tokenHash, hashSecretToken(token)));
        return options;
      });
    },
  );

  server.post<{ Body: PasskeyHandOffBody }>(
    "/api/passkey-hand-off-passkeys",
    {
      config: {
        reach: "none",
        noReachReason:
          "The phone isn't signed in (ADR 0036): its credential is the hand-off token from the signed-in computer",
      },
      schema: { body: passkeyHandOffBodySchema },
    },
    async (request, reply) => {
      const { token, name, response } = request.body;
      // The code's answer is checked first, and its challenge spent, but the code is kept until the passkey is saved.
      const { userId, verifiedPasskey, noticeTo } = await database.transaction(
        async (transaction) => {
          const liveHandOff = await findLiveHandOff(transaction, token);
          return {
            userId: liveHandOff.userId,
            verifiedPasskey: await verifyNewPasskey(
              transaction,
              { userId: liveHandOff.userId, name, response },
              { expectedOrigin, relyingPartyId },
            ),
            noticeTo: await findPasskeyNoticeAddress(
              transaction,
              liveHandOff.userId,
            ),
          };
        },
      );
      // Sent before the passkey is saved, so if it can't be sent none is added and the code still works, and between
      // the two transactions, so a slow mail server holds no database connection (#329).
      const isNoticeSent = await sendPasskeyNotice(sendEmail, noticeTo, (to) =>
        buildPasskeyAddedNotice({
          to,
          passkeyName: verifiedPasskey.name,
          addedAt: new Date(),
          isFromHandOff: true,
        }),
      );
      const addedPasskey = await database.transaction(async (transaction) => {
        // Found live again and spent here, so two requests with one code can't both add a passkey.
        await findLiveHandOff(transaction, token);
        await deleteHandOff(transaction, token);
        const passkey = await insertVerifiedPasskey(
          transaction,
          verifiedPasskey,
        );
        const [{ roles }] = await transaction
          .select({ roles: users.roles })
          .from(users)
          .where(eq(users.id, userId));
        await insertAuditLogEntry(transaction, {
          action: "passkey.added",
          actor: { type: "user", id: userId, roles },
          target: { type: "passkey", id: passkey.id },
          detail: "hand-off",
        });
        request.log.info({ userId, isNoticeSent }, "auth.passkey.created");
        return passkey;
      });
      return reply.code(201).send(addedPasskey);
    },
  );
};
