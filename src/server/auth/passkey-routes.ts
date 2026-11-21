import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import type { Database } from "../database.js";
import {
  buildPasskeyAddedNotice,
  buildPasskeyRemovedNotice,
  type Email,
} from "../email/emails.js";
import type { SendEmail } from "../email/send-email.js";
import type { ReachDatabase } from "../reach.js";
import { passkeyChallenges, passkeys, users } from "../schema.js";
import {
  buildPasskeyChallengeSweep,
  deleteExpiredPasskeyChallenges,
} from "./passkey-challenge-sweep.js";
import { createSignIn, insertFailedSignInEntry } from "./sign-in-routes.js";
import {
  countSecondFactors,
  countSignInMethods,
  LastSecondFactorError,
  LastSignInMethodError,
  loadSignInMethodsForUpdate,
} from "./sign-in-methods-routes.js";
import {
  markSignInTwoStep,
  runAsSignedInUser,
  runAsSignedInUserAddingSecondFactor,
} from "./signed-in-parent.js";

export class PasskeyNotVerifiedError extends Error {
  override readonly name = "PasskeyNotVerifiedError";
  readonly statusCode = 400;

  constructor(options?: ErrorOptions) {
    super("Wizzaroo couldn't check that passkey. Try again.", options);
  }
}

export class PasskeyNotRecognisedError extends Error {
  override readonly name = "PasskeyNotRecognisedError";
  readonly statusCode = 401;

  constructor() {
    super("That passkey doesn't belong to a Wizzaroo account");
  }
}

export class PasskeyNotFoundError extends Error {
  override readonly name = "PasskeyNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("You have no such passkey");
  }
}

const relyingPartyName = "Wizzaroo";
const passkeyChallengeLifetimeMinutes = 5;
const longestPasskeyName = 40;
const passkeyUserHandleBytes = 32;

export interface PasskeyRegistrationBody {
  name: string;
  response: RegistrationResponseJSON;
}

interface PasskeySignInBody {
  response: AuthenticationResponseJSON;
}

interface PasskeyParams {
  passkeyId: string;
}

const base64UrlString = {
  type: "string",
  minLength: 1,
  pattern: "^[A-Za-z0-9_-]+$",
} as const;

export const passkeyRegistrationBodySchema = {
  type: "object",
  required: ["name", "response"],
  additionalProperties: false,
  properties: {
    name: { type: "string", pattern: "\\S", maxLength: longestPasskeyName },
    response: {
      type: "object",
      required: ["id", "rawId", "type", "response", "clientExtensionResults"],
      properties: {
        id: base64UrlString,
        rawId: base64UrlString,
        type: { const: "public-key" },
        clientExtensionResults: { type: "object" },
        response: {
          type: "object",
          required: ["clientDataJSON", "attestationObject"],
          properties: {
            clientDataJSON: base64UrlString,
            attestationObject: base64UrlString,
            transports: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
} as const;

/** A passkey's answer to a challenge, as the browser sends it. */
export const passkeyAssertionSchema = {
  type: "object",
  required: ["id", "rawId", "type", "response", "clientExtensionResults"],
  properties: {
    id: base64UrlString,
    rawId: base64UrlString,
    type: { const: "public-key" },
    clientExtensionResults: { type: "object" },
    response: {
      type: "object",
      required: ["clientDataJSON", "authenticatorData", "signature"],
      properties: {
        clientDataJSON: base64UrlString,
        authenticatorData: base64UrlString,
        signature: base64UrlString,
        userHandle: { type: "string" },
      },
    },
  },
} as const;

const passkeySignInBodySchema = {
  type: "object",
  required: ["response"],
  additionalProperties: false,
  properties: { response: passkeyAssertionSchema },
} as const;

const passkeyParamsSchema = {
  type: "object",
  required: ["passkeyId"],
  properties: { passkeyId: base64UrlString },
} as const;

/** One insert, whatever the table holds: expired challenges are swept apart from it (#331). */
const createPasskeyChallenge = async (
  database: ReachDatabase,
  challenge: string,
  userId: string | null,
): Promise<void> => {
  await database.insert(passkeyChallenges).values({
    challenge,
    userId,
    expiresAt: sql`now() + make_interval(mins => ${passkeyChallengeLifetimeMinutes})`,
  });
};

const readClientDataChallenge = (clientDataJSON: string): string => {
  let clientData: unknown;
  try {
    clientData = JSON.parse(isoBase64URL.toUTF8String(clientDataJSON));
  } catch (error) {
    throw new PasskeyNotVerifiedError({ cause: error });
  }
  if (
    typeof clientData !== "object" ||
    clientData === null ||
    !("challenge" in clientData) ||
    typeof clientData.challenge !== "string"
  ) {
    throw new PasskeyNotVerifiedError();
  }
  return clientData.challenge;
};

const consumePasskeyChallenge = async (
  database: ReachDatabase,
  clientDataJSON: string,
  userId: string | null,
): Promise<string> => {
  const challenge = readClientDataChallenge(clientDataJSON);
  const usedChallenges = await database
    .delete(passkeyChallenges)
    .where(
      and(
        eq(passkeyChallenges.challenge, challenge),
        userId === null
          ? isNull(passkeyChallenges.userId)
          : eq(passkeyChallenges.userId, userId),
      ),
    )
    .returning({
      isLive: sql<boolean>`${passkeyChallenges.expiresAt} > now()`,
    });
  if (usedChallenges.at(0)?.isLive !== true) {
    throw new PasskeyNotVerifiedError();
  }
  return challenge;
};

/**
 * An adult may keep as many passkeys as they like, several of them in one password manager, so each is registered
 * under a user handle of its own: random, so never the account id (#238), and new each time, so a password manager
 * keeps a new passkey beside the adult's others rather than in place of one. Sign-in finds a passkey by its credential
 * id, never its user handle. A signed-in browser shows the adult's email address as the passkey's account name; options
 * for someone holding only a hand-off code name no one.
 */
export const buildPasskeyRegistrationOptions = async (
  database: ReachDatabase,
  userId: string,
  relyingPartyId: string,
  { isNamedByEmail }: { isNamedByEmail: boolean },
): Promise<PublicKeyCredentialCreationOptionsJSON> => {
  const [user] = await database
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  const options = await generateRegistrationOptions({
    rpName: relyingPartyName,
    rpID: relyingPartyId,
    userName: isNamedByEmail ? user.email : relyingPartyName,
    userID: crypto.getRandomValues(new Uint8Array(passkeyUserHandleBytes)),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });
  await createPasskeyChallenge(database, options.challenge, userId);
  return options;
};

interface NewPasskey extends PasskeyRegistrationBody {
  userId: string;
}

export interface RelyingParty {
  expectedOrigin: string;
  relyingPartyId: string;
}

export interface AddedPasskey {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

/** A new passkey whose answer to its challenge has been checked, ready to save. */
export type VerifiedPasskey = typeof passkeys.$inferInsert;

/** Spends the challenge and checks the new passkey's answer to it, saving nothing yet. */
export const verifyNewPasskey = async (
  database: ReachDatabase,
  { userId, name, response }: NewPasskey,
  { expectedOrigin, relyingPartyId }: RelyingParty,
): Promise<VerifiedPasskey> => {
  const expectedChallenge = await consumePasskeyChallenge(
    database,
    response.response.clientDataJSON,
    userId,
  );
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID: relyingPartyId,
    requireUserVerification: true,
  }).catch((error: unknown) => {
    throw new PasskeyNotVerifiedError({ cause: error });
  });
  if (!verification.verified) {
    throw new PasskeyNotVerifiedError();
  }
  const { credential } = verification.registrationInfo;
  return {
    id: credential.id,
    userId,
    name: name.trim(),
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    signCount: credential.counter,
    transports: credential.transports ?? [],
  };
};

/** Saves a passkey verifyNewPasskey checked. One whose credential is already saved is refused. */
export const insertVerifiedPasskey = async (
  database: ReachDatabase,
  verifiedPasskey: VerifiedPasskey,
): Promise<AddedPasskey> => {
  const addedPasskeys = await database
    .insert(passkeys)
    .values(verifiedPasskey)
    .onConflictDoNothing()
    .returning({
      id: passkeys.id,
      name: passkeys.name,
      createdAt: passkeys.createdAt,
      lastUsedAt: passkeys.lastUsedAt,
    });
  const addedPasskey = addedPasskeys.at(0);
  if (addedPasskey === undefined) {
    throw new PasskeyNotVerifiedError();
  }
  return addedPasskey;
};

/** Checks a passkey's answer to a challenge and counts its use, giving whose passkey it is. */
const verifyPasskeyAssertion = async (
  database: ReachDatabase,
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  { expectedOrigin, relyingPartyId }: RelyingParty,
  narrow: (matchingPasskey: SQL | undefined) => SQL | undefined,
): Promise<string> => {
  const matchingPasskeys = await database
    .select({
      userId: passkeys.userId,
      publicKey: passkeys.publicKey,
      signCount: passkeys.signCount,
      transports: passkeys.transports,
    })
    .from(passkeys)
    .innerJoin(users, eq(users.id, passkeys.userId))
    .where(narrow(eq(passkeys.id, response.id)));
  const passkey = matchingPasskeys.at(0);
  if (passkey === undefined) {
    throw new PasskeyNotRecognisedError();
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID: relyingPartyId,
    requireUserVerification: true,
    credential: {
      id: response.id,
      publicKey: isoBase64URL.toBuffer(passkey.publicKey),
      counter: passkey.signCount,
      transports: passkey.transports,
    },
  }).catch((error: unknown) => {
    throw new PasskeyNotVerifiedError({ cause: error });
  });
  if (!verification.verified) {
    throw new PasskeyNotVerifiedError();
  }

  await database
    .update(passkeys)
    .set({
      signCount: verification.authenticationInfo.newCounter,
      lastUsedAt: sql`now()`,
    })
    .where(eq(passkeys.id, response.id));
  return passkey.userId;
};

/** Checks that a signed-in adult answered the challenge they were just given with one of their own passkeys. */
export const verifyOwnPasskeyAssertion = async (
  reachDatabase: ReachDatabase,
  userId: string,
  response: AuthenticationResponseJSON,
  relyingParty: RelyingParty,
): Promise<void> => {
  const expectedChallenge = await consumePasskeyChallenge(
    reachDatabase,
    response.response.clientDataJSON,
    userId,
  );
  await verifyPasskeyAssertion(
    reachDatabase,
    response,
    expectedChallenge,
    relyingParty,
    (matchingPasskey) => and(matchingPasskey, eq(passkeys.userId, userId)),
  );
};

/**
 * Where a notice of a passkey added or removed goes (#239): the adult's confirmed address, or null for an unconfirmed
 * one, which is sent nothing. As a password change's notice is, it is sent before the change is saved, so if it can't
 * be sent nothing changes, and between two transactions, so no send holds a database connection (#329).
 */
export const findPasskeyNoticeAddress = async (
  database: ReachDatabase,
  userId: string,
): Promise<string | null> => {
  const [user] = await database
    .select({ email: users.email, emailConfirmedAt: users.emailConfirmedAt })
    .from(users)
    .where(eq(users.id, userId));
  return user.emailConfirmedAt === null ? null : user.email;
};

/** Sends a passkey notice to its address, if it has one, giving whether it was sent. */
export const sendPasskeyNotice = async (
  sendEmail: SendEmail,
  noticeTo: string | null,
  notice: (to: string) => Email,
): Promise<boolean> => {
  if (noticeTo === null) {
    return false;
  }
  await sendEmail(notice(noticeTo));
  return true;
};

/** Refuses to remove a passkey that isn't the adult's, or the last way in or last second factor they have. */
const checkPasskeyRemovable = async (
  transaction: ReachDatabase,
  userId: string,
  passkeyId: string,
): Promise<void> => {
  const signInMethods = await loadSignInMethodsForUpdate(transaction, userId);
  if (!signInMethods.passkeyIds.includes(passkeyId)) {
    throw new PasskeyNotFoundError();
  }
  if (countSignInMethods(signInMethods) <= 1) {
    throw new LastSignInMethodError();
  }
  if (
    signInMethods.needsSecondFactor &&
    countSecondFactors(signInMethods) <= 1
  ) {
    throw new LastSecondFactorError();
  }
};

interface PasskeyRouteParts {
  database: Database;
  sendEmail: SendEmail;
  publicUrl: URL;
  /** When the expired-challenge sweep thinks it is, in milliseconds; tests move it on. */
  clock?: () => number;
}

export const registerPasskeyRoutes = (
  server: FastifyInstance,
  { database, sendEmail, publicUrl, clock = Date.now }: PasskeyRouteParts,
): void => {
  const relyingPartyId = publicUrl.hostname;
  const expectedOrigin = publicUrl.origin;
  // Each route that makes a challenge may start a sweep, but this server sweeps at most once a minute (#331).
  const sweepExpiredChallenges = buildPasskeyChallengeSweep(
    () => deleteExpiredPasskeyChallenges(database),
    server.log,
    clock,
  );

  server.post(
    "/api/passkey-registration-options",
    { config: { reach: "user" } },
    async (request) => {
      sweepExpiredChallenges();
      return runAsSignedInUserAddingSecondFactor(
        database,
        request,
        async ({ userId }, reachDatabase) =>
          buildPasskeyRegistrationOptions(
            reachDatabase,
            userId,
            relyingPartyId,
            { isNamedByEmail: true },
          ),
      );
    },
  );

  server.post<{ Body: PasskeyRegistrationBody }>(
    "/api/passkeys",
    {
      config: { reach: "user" },
      schema: { body: passkeyRegistrationBodySchema },
    },
    async (request, reply) => {
      const { verifiedPasskey, noticeTo } =
        await runAsSignedInUserAddingSecondFactor(
          database,
          request,
          async ({ userId }, reachDatabase) => ({
            verifiedPasskey: await verifyNewPasskey(
              reachDatabase,
              { userId, ...request.body },
              { expectedOrigin, relyingPartyId },
            ),
            noticeTo: await findPasskeyNoticeAddress(reachDatabase, userId),
          }),
        );
      const isNoticeSent = await sendPasskeyNotice(sendEmail, noticeTo, (to) =>
        buildPasskeyAddedNotice({
          to,
          passkeyName: verifiedPasskey.name,
          addedAt: new Date(),
          isFromHandOff: false,
        }),
      );
      const newPasskey = await runAsSignedInUserAddingSecondFactor(
        database,
        request,
        async (signedInUser, reachDatabase) => {
          const { userId, signInTokenHash } = signedInUser;
          const addedPasskey = await insertVerifiedPasskey(
            reachDatabase,
            verifiedPasskey,
          );
          await insertAuditLogEntry(reachDatabase, {
            action: "passkey.added",
            actor: buildUserActor(signedInUser),
            target: { type: "passkey", id: addedPasskey.id },
          });
          // Proving a new passkey proves a second factor, so this sign-in counts as one made with it.
          await markSignInTwoStep(reachDatabase, signInTokenHash);
          request.log.info({ userId, isNoticeSent }, "auth.passkey.created");

          return addedPasskey;
        },
      );
      return reply.code(201).send(newPasskey);
    },
  );

  server.post(
    "/api/passkey-sign-in-options",
    {
      config: {
        reach: "none",
        noReachReason:
          "It is how a passkey sign-in is made, so no one is known yet",
      },
    },
    async () => {
      sweepExpiredChallenges();
      const options = await generateAuthenticationOptions({
        rpID: relyingPartyId,
        userVerification: "required",
      });
      await createPasskeyChallenge(database, options.challenge, null);
      return options;
    },
  );

  server.post<{ Body: PasskeySignInBody }>(
    "/api/passkey-sign-ins",
    {
      config: {
        reach: "none",
        noReachReason:
          "It is how a passkey sign-in is made, so no one is known yet",
      },
      schema: { body: passkeySignInBodySchema },
    },
    async (request, reply) => {
      const { response } = request.body;
      const expectedChallenge = await consumePasskeyChallenge(
        database,
        response.response.clientDataJSON,
        null,
      );
      const userId = await verifyPasskeyAssertion(
        database,
        response,
        expectedChallenge,
        { expectedOrigin, relyingPartyId },
        (matchingPasskey) => and(matchingPasskey, isNull(users.deactivatedAt)),
      ).catch(async (error: unknown) => {
        if (error instanceof PasskeyNotRecognisedError) {
          await insertFailedSignInEntry(database, request, { step: "passkey" });
          request.log.info("auth.sign-in.refused");
        }
        throw error;
      });
      await createSignIn(database, request, reply, {
        userId,
        isTwoStep: true,
        method: "passkey",
      });
      request.log.info({ userId, method: "passkey" }, "auth.sign-in.created");

      return reply.code(204).send();
    },
  );

  server.post(
    "/api/passkey-confirmation-options",
    { config: { reach: "user" } },
    async (request) => {
      sweepExpiredChallenges();
      return runAsSignedInUser(
        database,
        request,
        async ({ userId }, reachDatabase) => {
          const userPasskeys = await reachDatabase
            .select({ id: passkeys.id, transports: passkeys.transports })
            .from(passkeys)
            .where(eq(passkeys.userId, userId));
          if (userPasskeys.length === 0) {
            throw new PasskeyNotFoundError();
          }
          const options = await generateAuthenticationOptions({
            rpID: relyingPartyId,
            userVerification: "required",
            allowCredentials: userPasskeys,
          });
          await createPasskeyChallenge(
            reachDatabase,
            options.challenge,
            userId,
          );
          return options;
        },
      );
    },
  );

  // Someone signed in with a password proves this sign-in with a passkey they already have, without signing in again.
  server.post<{ Body: PasskeySignInBody }>(
    "/api/passkey-confirmations",
    { config: { reach: "user" }, schema: { body: passkeySignInBodySchema } },
    async (request, reply) => {
      await runAsSignedInUser(
        database,
        request,
        async ({ userId, signInTokenHash }, reachDatabase) => {
          await verifyOwnPasskeyAssertion(
            reachDatabase,
            userId,
            request.body.response,
            { expectedOrigin, relyingPartyId },
          );
          await markSignInTwoStep(reachDatabase, signInTokenHash);
          request.log.info({ userId }, "auth.sign-in.confirmed-with-passkey");
        },
      );
      return reply.code(204).send();
    },
  );

  server.delete<{ Params: PasskeyParams }>(
    "/api/passkeys/:passkeyId",
    { config: { reach: "user" }, schema: { params: passkeyParamsSchema } },
    async (request, reply) => {
      const { passkeyId } = request.params;
      const { passkeyName, noticeTo } = await runAsSignedInUser(
        database,
        request,
        async ({ userId }, reachDatabase) =>
          reachDatabase.transaction(async (transaction) => {
            await checkPasskeyRemovable(transaction, userId, passkeyId);
            const [passkey] = await transaction
              .select({ name: passkeys.name })
              .from(passkeys)
              .where(
                and(eq(passkeys.id, passkeyId), eq(passkeys.userId, userId)),
              );
            return {
              passkeyName: passkey.name,
              noticeTo: await findPasskeyNoticeAddress(transaction, userId),
            };
          }),
      );
      const isNoticeSent = await sendPasskeyNotice(sendEmail, noticeTo, (to) =>
        buildPasskeyRemovedNotice({
          to,
          passkeyName,
          removedAt: new Date(),
        }),
      );
      await runAsSignedInUser(
        database,
        request,
        async (signedInUser, reachDatabase) => {
          const { userId } = signedInUser;
          await reachDatabase.transaction(async (transaction) => {
            // Checked again under the lock, since the adult's sign-in methods may have changed while the notice was sent.
            await checkPasskeyRemovable(transaction, userId, passkeyId);
            await transaction
              .delete(passkeys)
              .where(
                and(eq(passkeys.id, passkeyId), eq(passkeys.userId, userId)),
              );
            await insertAuditLogEntry(transaction, {
              action: "passkey.removed",
              actor: buildUserActor(signedInUser),
              target: { type: "passkey", id: passkeyId },
            });
          });
          request.log.info({ userId, isNoticeSent }, "auth.passkey.deleted");
        },
      );
      return reply.code(204).send();
    },
  );
};
