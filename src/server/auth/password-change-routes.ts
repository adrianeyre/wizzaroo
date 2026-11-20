import { hash, verify } from "@node-rs/argon2";
import { and, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import type { Database } from "../database.js";
import { buildPasswordChangedNotice } from "../email/emails.js";
import type { SendEmail } from "../email/send-email.js";
import { signOutFamilyDevicesMadeBy } from "../family-devices/family-devices-made-by.js";
import { users } from "../schema.js";
import {
  deleteOtherSignIns,
  deleteOutstandingAccountTokens,
} from "./account-tokens.js";
import { isPasswordLongEnough, shortestPasswordLength } from "./password.js";
import {
  countSignInMethods,
  LastSignInMethodError,
  loadSignInMethodsForUpdate,
} from "./sign-in-methods-routes.js";
import { runAsSignedInUser } from "./signed-in-parent.js";

export class WrongCurrentPasswordError extends Error {
  override readonly name = "WrongCurrentPasswordError";
  readonly statusCode = 403;

  constructor() {
    super("That isn't your current password");
  }
}

export class PasswordTooShortError extends Error {
  override readonly name = "PasswordTooShortError";
  readonly statusCode = 400;

  constructor() {
    super(
      `A new password needs at least ${String(shortestPasswordLength)} characters`,
    );
  }
}

export class PasswordAlreadySetError extends Error {
  override readonly name = "PasswordAlreadySetError";
  readonly statusCode = 409;

  constructor() {
    super("You already have a password, so change it instead");
  }
}

interface NewPasswordBody {
  newPassword: string;
}

interface PasswordRemovalBody {
  currentPassword: string;
}

interface PasswordChangeBody {
  currentPassword: string;
  newPassword: string;
}

const passwordChangeBodySchema = {
  type: "object",
  required: ["currentPassword", "newPassword"],
  additionalProperties: false,
  properties: {
    currentPassword: { type: "string", minLength: 1 },
    newPassword: { type: "string" },
  },
} as const;

const newPasswordBodySchema = {
  type: "object",
  required: ["newPassword"],
  additionalProperties: false,
  properties: { newPassword: { type: "string" } },
} as const;

const passwordRemovalBodySchema = {
  type: "object",
  required: ["currentPassword"],
  additionalProperties: false,
  properties: { currentPassword: { type: "string", minLength: 1 } },
} as const;

export const isCurrentPasswordRight = async (
  passwordHash: string | null,
  currentPassword: string,
): Promise<boolean> =>
  passwordHash !== null && (await verify(passwordHash, currentPassword));

interface PasswordChangeRouteParts {
  database: Database;
  sendEmail: SendEmail;
}

export const registerPasswordChangeRoutes = (
  server: FastifyInstance,
  { database, sendEmail }: PasswordChangeRouteParts,
): void => {
  server.put<{ Body: PasswordChangeBody }>(
    "/api/password",
    { config: { reach: "user" }, schema: { body: passwordChangeBodySchema } },
    async (request, reply) => {
      const checked = await runAsSignedInUser(
        database,
        request,
        async ({ userId }, reachDatabase) => {
          const { currentPassword, newPassword } = request.body;
          if (!isPasswordLongEnough(newPassword)) {
            throw new PasswordTooShortError();
          }

          const [user] = await reachDatabase
            .select({
              email: users.email,
              emailConfirmedAt: users.emailConfirmedAt,
              passwordHash: users.passwordHash,
            })
            .from(users)
            .where(eq(users.id, userId));
          if (
            !(await isCurrentPasswordRight(user.passwordHash, currentPassword))
          ) {
            request.log.info({ userId }, "auth.password-change.refused");
            throw new WrongCurrentPasswordError();
          }

          return {
            newPasswordHash: await hash(newPassword),
            noticeTo: user.emailConfirmedAt === null ? null : user.email,
          };
        },
      );

      // Sent before the change is saved, so if it can't be sent the password stays as it was. It goes between the two
      // reaches, so a slow mail server holds no database connection (#329).
      if (checked.noticeTo !== null) {
        await sendEmail(
          buildPasswordChangedNotice({
            to: checked.noticeTo,
            changedAt: new Date(),
          }),
        );
      }
      await runAsSignedInUser(
        database,
        request,
        async (signedInUser, reachDatabase) => {
          const { userId, signInTokenHash } = signedInUser;
          const { newPasswordHash, noticeTo } = checked;
          const isNoticeSent = noticeTo !== null;
          await reachDatabase.transaction(async (transaction) => {
            await transaction
              .update(users)
              .set({ passwordHash: newPasswordHash })
              .where(eq(users.id, userId));
            await deleteOtherSignIns(transaction, userId, signInTokenHash);
            await deleteOutstandingAccountTokens(transaction, userId);
            await insertAuditLogEntry(transaction, {
              action: "password.changed",
              actor: buildUserActor(signedInUser),
              target: { type: "user", id: userId },
            });
            // The Family Devices this adult's sign-ins made go with those sign-ins (#303).
            await signOutFamilyDevicesMadeBy(
              transaction,
              userId,
              buildUserActor(signedInUser),
              "password change",
            );
          });
          request.log.info({ userId, isNoticeSent }, "auth.password.changed");
        },
      );
      return reply.code(204).send();
    },
  );

  server.post<{ Body: NewPasswordBody }>(
    "/api/password",
    { config: { reach: "user" }, schema: { body: newPasswordBodySchema } },
    async (request, reply) => {
      await runAsSignedInUser(
        database,
        request,
        async (signedInUser, reachDatabase) => {
          const { userId, signInTokenHash } = signedInUser;
          const { newPassword } = request.body;
          if (!isPasswordLongEnough(newPassword)) {
            throw new PasswordTooShortError();
          }

          const newPasswordHash = await hash(newPassword);
          const setUsers = await reachDatabase
            .update(users)
            .set({ passwordHash: newPasswordHash })
            .where(and(eq(users.id, userId), isNull(users.passwordHash)))
            .returning({ id: users.id });
          if (setUsers.length === 0) {
            throw new PasswordAlreadySetError();
          }
          // A new way in ends the sign-ins made before it, as changing or removing the password does (#245).
          await deleteOtherSignIns(reachDatabase, userId, signInTokenHash);
          await deleteOutstandingAccountTokens(reachDatabase, userId);
          await insertAuditLogEntry(reachDatabase, {
            action: "password.created",
            actor: buildUserActor(signedInUser),
            target: { type: "user", id: userId },
          });
          request.log.info({ userId }, "auth.password.created");
        },
      );
      return reply.code(204).send();
    },
  );

  server.delete<{ Body: PasswordRemovalBody }>(
    "/api/password",
    { config: { reach: "user" }, schema: { body: passwordRemovalBodySchema } },
    async (request, reply) => {
      await runAsSignedInUser(
        database,
        request,
        async (signedInUser, reachDatabase) => {
          const { userId, signInTokenHash } = signedInUser;
          const [user] = await reachDatabase
            .select({ passwordHash: users.passwordHash })
            .from(users)
            .where(eq(users.id, userId));
          if (
            !(await isCurrentPasswordRight(
              user.passwordHash,
              request.body.currentPassword,
            ))
          ) {
            request.log.info({ userId }, "auth.password-removal.refused");
            throw new WrongCurrentPasswordError();
          }

          await reachDatabase.transaction(async (transaction) => {
            const signInMethods = await loadSignInMethodsForUpdate(
              transaction,
              userId,
            );
            if (countSignInMethods(signInMethods) <= 1) {
              throw new LastSignInMethodError();
            }
            await transaction
              .update(users)
              .set({ passwordHash: null })
              .where(eq(users.id, userId));
            await deleteOtherSignIns(transaction, userId, signInTokenHash);
            await deleteOutstandingAccountTokens(transaction, userId);
            await insertAuditLogEntry(transaction, {
              action: "password.removed",
              actor: buildUserActor(signedInUser),
              target: { type: "user", id: userId },
            });
          });
          request.log.info({ userId }, "auth.password.deleted");
        },
      );
      return reply.code(204).send();
    },
  );
};
