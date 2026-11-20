import { hash } from "@node-rs/argon2";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Database } from "../database.js";
import {
  type EmailAfterCommit,
  type SendEmail,
  sendEmailAfterCommit,
} from "../email/send-email.js";
import { findLiveInvite } from "../people/invites.js";
import { invites, users } from "../schema.js";
import { deleteOtherSignIns } from "./account-tokens.js";
import { createEmailAddressCheck } from "./email-address-check-routes.js";
import { isPasswordLongEnough } from "./password.js";
import { PasswordTooShortError } from "./password-change-routes.js";
import { createSignIn } from "./sign-in-routes.js";
import { buildSecondFactorSetupReopening } from "./signed-in-parent.js";

export class InviteNotFoundError extends Error {
  override readonly name = "InviteNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("That Invite has expired, been used or been replaced by a newer one");
  }
}

interface InviteAcceptanceBody {
  token: string;
  password: string;
}

const inviteAcceptanceBodySchema = {
  type: "object",
  required: ["token", "password"],
  additionalProperties: false,
  properties: {
    token: { type: "string", minLength: 1 },
    password: { type: "string" },
  },
} as const;

interface InviteRouteParts {
  database: Database;
  sendEmail: SendEmail;
  publicUrl: URL;
}

/** Whoever opens a live Invite sets the password for the Teacher or Parent login the Admin or a Teacher made for them. */
export const registerInviteRoutes = (
  server: FastifyInstance,
  { database, sendEmail, publicUrl }: InviteRouteParts,
): void => {
  server.post<{ Body: InviteAcceptanceBody }>(
    "/api/invite-acceptances",
    {
      config: {
        reach: "none",
        noReachReason:
          "The new adult has no password yet: its credential is the Invite token",
      },
      schema: { body: inviteAcceptanceBodySchema },
    },
    async (request, reply) => {
      const { token, password } = request.body;
      if (!isPasswordLongEnough(password)) {
        throw new PasswordTooShortError();
      }

      // The token is looked up first, so a wrong one costs one indexed lookup and no argon2 hash (#330).
      if ((await findLiveInvite(database, token)) === undefined) {
        request.log.info("auth.invite.refused");
        throw new InviteNotFoundError();
      }
      const passwordHash = await hash(password);
      const accepted = await database.transaction(async (transaction) => {
        // Found again, and locked, so two requests with one Invite can't both accept it: the second waits, then finds
        // it accepted.
        const invite = await findLiveInvite(transaction, token);
        if (invite === undefined) {
          return undefined;
        }
        // Opening a link that was emailed to the address proves it, so only a copied link needs the address checked.
        const isEmailProven = invite.emailedTo === invite.email;
        await transaction
          .update(users)
          .set({
            passwordHash,
            emailConfirmedAt: isEmailProven ? sql`now()` : null,
            // A new Teacher sets up a passkey or TOTP from this sign-in, within the days that follow (#243).
            secondFactorSetupUntil: buildSecondFactorSetupReopening(),
          })
          .where(eq(users.id, invite.userId));
        await transaction
          .update(invites)
          .set({ acceptedAt: sql`now()` })
          .where(eq(invites.id, invite.id));
        // Setting the login's password ends every sign-in made before it, as a password reset does (#245).
        await deleteOtherSignIns(transaction, invite.userId);
        const checkEmail: EmailAfterCommit | undefined = isEmailProven
          ? undefined
          : await createEmailAddressCheck(transaction, database, {
              publicUrl,
              userId: invite.userId,
              email: invite.email,
            });
        return { userId: invite.userId, checkEmail };
      });
      if (accepted === undefined) {
        request.log.info("auth.invite.refused");
        throw new InviteNotFoundError();
      }
      const acceptedUserId = accepted.userId;
      request.log.info({ userId: acceptedUserId }, "auth.invite.accepted");
      if (accepted.checkEmail !== undefined) {
        // Once the acceptance is committed, so the send holds no database connection (#329). The login is made either
        // way: an address check that can't be sent is taken back and logged, and they ask for another once signed in.
        await sendEmailAfterCommit(sendEmail, accepted.checkEmail).catch(
          (error: unknown) => {
            request.log.error(
              { err: error, userId: acceptedUserId },
              "auth.invite.email-address-check-failed",
            );
          },
        );
      }

      await createSignIn(database, request, reply, {
        userId: acceptedUserId,
        isTwoStep: false,
        method: "invite",
      });
      request.log.info(
        { userId: acceptedUserId, method: "invite" },
        "auth.sign-in.created",
      );
      return reply.code(204).send();
    },
  );
};
