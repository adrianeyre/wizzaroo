import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// A TOTP secret is kept sealed with AES-256-GCM under TOTP_SECRET_KEY, which the database never holds,
// so a copy of the database alone makes no codes (#254). The adult's id is the additional data, so a
// sealed secret copied onto another adult's row doesn't open there.
const cipherName = "aes-256-gcm";
const keyBytes = 32;
const ivBytes = 12;
const tagBytes = 16;
export const totpSecretIvBytes = ivBytes;
const sealedVersion = "v1";
const keyShape = new RegExp(`^[0-9a-fA-F]{${String(keyBytes * 2)}}$`);
const base64UrlShape = /^[A-Za-z0-9_-]+$/;

/** 32 bytes read from TOTP_SECRET_KEY, wrapped so a stray Buffer can't stand in for it. */
export interface TotpSecretKey {
  readonly bytes: Buffer;
}

interface TotpSecretToSeal {
  userId: string;
  secret: string;
}

interface SealedTotpSecret {
  userId: string;
  sealedSecret: string;
}

export const isTotpSecretKeyShaped = (value: string): boolean =>
  keyShape.test(value);

/** Throws, naming nothing secret, unless the value is 64 hexadecimal characters. */
export const parseTotpSecretKey = (value: string): TotpSecretKey => {
  if (!isTotpSecretKeyShaped(value)) {
    throw new Error(
      `a TOTP secret key is ${String(keyBytes * 2)} hexadecimal characters`,
    );
  }
  return { bytes: Buffer.from(value, "hex") };
};

/** Whether a stored value is in the sealed form, whichever key sealed it. Anything else is a secret held as issued. */
export const isSealedTotpSecret = (storedSecret: string): boolean =>
  storedSecret.startsWith(`${sealedVersion}.`);

export const sealTotpSecret = (
  key: TotpSecretKey,
  { userId, secret }: TotpSecretToSeal,
  /**
   * A fresh random IV unless given. Only the pen-test fixtures give one, derived from the seed the secret itself comes
   * from, so loading them twice gives the same rows; one IV never seals two different secrets for one adult.
   */
  iv: Buffer = randomBytes(ivBytes),
): string => {
  if (iv.length !== ivBytes) {
    throw new Error(`a TOTP secret's IV is ${String(ivBytes)} bytes`);
  }
  const cipher = createCipheriv(cipherName, key.bytes, iv, {
    authTagLength: tagBytes,
  });
  cipher.setAAD(Buffer.from(userId));
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [
    sealedVersion,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
};

/**
 * The secret as issued, or undefined when the stored value doesn't open: sealed under another key,
 * for another adult, changed, or not sealed at all. Start-up seals every secret still held as issued,
 * so after that a value that isn't sealed is one written behind the server's back, and it is refused.
 */
export const openTotpSecret = (
  key: TotpSecretKey,
  { userId, sealedSecret }: SealedTotpSecret,
): string | undefined => {
  const parts = sealedSecret.split(".");
  if (parts.length !== 4) {
    return undefined;
  }
  const [version, ...encodedParts] = parts;
  if (
    version !== sealedVersion ||
    !encodedParts.every((part) => base64UrlShape.test(part))
  ) {
    return undefined;
  }
  const [iv, ciphertext, tag] = encodedParts.map((part) =>
    Buffer.from(part, "base64url"),
  );
  if (iv.length !== ivBytes || tag.length !== tagBytes) {
    return undefined;
  }
  try {
    const decipher = createDecipheriv(cipherName, key.bytes, iv, {
      authTagLength: tagBytes,
    });
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return undefined;
  }
};
