import { asc, count, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Database } from "../database.js";
import { passkeys, recoveryCodes, totpSecrets, users } from "../schema.js";
import { runAsSignedInUser } from "./signed-in-parent.js";

export class LastSignInMethodError extends Error {
  override readonly name = "LastSignInMethodError";
  readonly statusCode = 409;

  constructor() {
    super(
      "That's the last way you have to sign in, so Wizzaroo kept it. Add another first.",
    );
  }
}

interface ParentPasskey {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

interface ParentSignInMethods {
  hasPassword: boolean;
  passkeys: ParentPasskey[];
  isTwoFactorOn: boolean;
  recoveryCodesLeft: number;
}

export class LastSecondFactorError extends Error {
  override readonly name = "LastSecondFactorError";
  readonly statusCode = 409;

  constructor() {
    super(
      "Teachers and the Admin need a passkey or two-factor authentication, so Wizzaroo kept this one. Add another first.",
    );
  }
}

interface LockedSignInMethods {
  hasPassword: boolean;
  passkeyIds: string[];
  isTwoFactorOn: boolean;
  needsSecondFactor: boolean;
}

const isTwoFactorOnFor = async (
  database: Pick<Database, "select">,
  userId: string,
): Promise<boolean> => {
  const [{ totpSecretCount }] = await database
    .select({ totpSecretCount: count() })
    .from(totpSecrets)
    .where(eq(totpSecrets.userId, userId));
  return totpSecretCount > 0;
};

export const loadSignInMethodsForUpdate = async (
  transaction: Pick<Database, "select">,
  userId: string,
): Promise<LockedSignInMethods> => {
  // The account row is locked first, so every change to an adult's sign-in methods waits for the one before it.
  const [user] = await transaction
    .select({
      passwordHash: users.passwordHash,
      roles: users.roles,
    })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  const userPasskeys = await transaction
    .select({ id: passkeys.id })
    .from(passkeys)
    .where(eq(passkeys.userId, userId));
  return {
    hasPassword: user.passwordHash !== null,
    passkeyIds: userPasskeys.map(({ id }) => id),
    isTwoFactorOn: await isTwoFactorOnFor(transaction, userId),
    needsSecondFactor:
      user.roles.includes("admin") || user.roles.includes("teacher"),
  };
};

export const countSecondFactors = ({
  passkeyIds,
  isTwoFactorOn,
}: LockedSignInMethods): number => passkeyIds.length + (isTwoFactorOn ? 1 : 0);

export const countSignInMethods = ({
  hasPassword,
  passkeyIds,
}: LockedSignInMethods): number => (hasPassword ? 1 : 0) + passkeyIds.length;

export const registerSignInMethodsRoutes = (
  server: FastifyInstance,
  database: Database,
): void => {
  server.get(
    "/api/sign-in-methods",
    { config: { reach: "user" } },
    async (request): Promise<ParentSignInMethods> => {
      return runAsSignedInUser(
        database,
        request,
        async ({ userId }, reachDatabase) => {
          const [user] = await reachDatabase
            .select({ passwordHash: users.passwordHash })
            .from(users)
            .where(eq(users.id, userId));
          const userPasskeys = await reachDatabase
            .select({
              id: passkeys.id,
              name: passkeys.name,
              createdAt: passkeys.createdAt,
              lastUsedAt: passkeys.lastUsedAt,
            })
            .from(passkeys)
            .where(eq(passkeys.userId, userId))
            .orderBy(asc(passkeys.createdAt));
          const [{ recoveryCodesLeft }] = await reachDatabase
            .select({ recoveryCodesLeft: count() })
            .from(recoveryCodes)
            .where(eq(recoveryCodes.userId, userId));
          return {
            hasPassword: user.passwordHash !== null,
            passkeys: userPasskeys,
            isTwoFactorOn: await isTwoFactorOnFor(reachDatabase, userId),
            recoveryCodesLeft,
          };
        },
      );
    },
  );
};
