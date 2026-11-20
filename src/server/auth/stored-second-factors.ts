import { and, eq, not, like } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import type { Database } from "../database.js";
import { recoveryCodes, totpSecrets, totpSetups } from "../schema.js";
import {
  isSealedTotpSecret,
  openTotpSecret,
  sealTotpSecret,
  type TotpSecretKey,
} from "./totp-secret-box.js";
import {
  isStretchedRecoveryCodeHash,
  stretchRecoveryCodeDigest,
} from "./two-factor.js";

export interface StoredSecondFactorsProtected {
  /** TOTP secrets, and secrets being set up, that were held as issued and are now sealed (#254). */
  sealedTotpSecrets: number;
  /** Sealed secrets that don't open under this key, such as after a restore without the key. */
  unreadableTotpSecrets: number;
  /** Recovery code hashes kept as one SHA-256 that are now stretched with argon2id (#255). */
  stretchedRecoveryCodes: number;
}

interface StoredSecret {
  userId: string;
  secret: string;
}

const argon2idPattern = "$argon2id$%";

type TotpSecretTable = typeof totpSecrets | typeof totpSetups;

const sealPlainSecrets = async (
  database: Database,
  table: TotpSecretTable,
  totpSecretKey: TotpSecretKey,
): Promise<{ sealed: number; unreadable: number }> => {
  const storedSecrets: StoredSecret[] = await database
    .select({ userId: table.userId, secret: table.secret })
    .from(table);
  let sealed = 0;
  let unreadable = 0;
  for (const { userId, secret } of storedSecrets) {
    if (isSealedTotpSecret(secret)) {
      if (
        openTotpSecret(totpSecretKey, { userId, sealedSecret: secret }) ===
        undefined
      ) {
        unreadable += 1;
      }
      continue;
    }
    // Only a value still as it was read is replaced, so a secret changed meanwhile is left to the next start.
    const updated = await database
      .update(table)
      .set({ secret: sealTotpSecret(totpSecretKey, { userId, secret }) })
      .where(and(eq(table.userId, userId), eq(table.secret, secret)))
      .returning({ userId: table.userId });
    sealed += updated.length;
  }
  return { sealed, unreadable };
};

const stretchSha256RecoveryCodes = async (
  database: Database,
): Promise<number> => {
  const keptCodes = await database
    .select({ id: recoveryCodes.id, codeHash: recoveryCodes.codeHash })
    .from(recoveryCodes)
    .where(not(like(recoveryCodes.codeHash, argon2idPattern)));
  let stretched = 0;
  for (const { id, codeHash } of keptCodes) {
    if (isStretchedRecoveryCodeHash(codeHash)) {
      continue;
    }
    const stretchedHash = await stretchRecoveryCodeDigest(codeHash);
    const updated = await database
      .update(recoveryCodes)
      .set({ codeHash: stretchedHash })
      .where(
        and(eq(recoveryCodes.id, id), eq(recoveryCodes.codeHash, codeHash)),
      )
      .returning({ id: recoveryCodes.id });
    stretched += updated.length;
  }
  return stretched;
};

/**
 * Run once on start-up, before the server listens, as `wizzaroo_server`. A migration holds no key and can't run argon2,
 * so the second factors stored before #254 and #255 are sealed and stretched here. Until then neither is accepted:
 * a code is never checked against a secret held as issued or a hash that is one SHA-256.
 */
export const protectStoredSecondFactors = async (
  database: Database,
  totpSecretKey: TotpSecretKey,
  log: FastifyBaseLogger,
): Promise<StoredSecondFactorsProtected> => {
  const secrets = await sealPlainSecrets(database, totpSecrets, totpSecretKey);
  const setups = await sealPlainSecrets(database, totpSetups, totpSecretKey);
  const outcome: StoredSecondFactorsProtected = {
    sealedTotpSecrets: secrets.sealed + setups.sealed,
    unreadableTotpSecrets: secrets.unreadable + setups.unreadable,
    stretchedRecoveryCodes: await stretchSha256RecoveryCodes(database),
  };
  log.info(outcome, "auth.stored-second-factors.protected");
  if (outcome.unreadableTotpSecrets > 0) {
    // Those adults sign in with a recovery code or a passkey, then set TOTP up again.
    log.warn(
      { unreadableTotpSecrets: outcome.unreadableTotpSecrets },
      "auth.totp-secrets.unreadable-with-this-key",
    );
  }
  return outcome;
};
