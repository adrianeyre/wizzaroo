import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { hash, verify, type Options } from "@node-rs/argon2";
import { hashSecretToken } from "./secret-token.js";

const totpSecretBytes = 20;
const totpStepSeconds = 30;
const totpDigits = 6;
const totpDriftSteps = 1;
const totpIssuer = "Wizzaroo";
const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const base32BitsPerCharacter = 5;
const setupKeyGroupLength = 4;

const recoveryCodeAlphabet = "abcdefghjkmnpqrstuvwxyz23456789";
const recoveryCodeGroupLength = 4;
const recoveryCodeGroups = 3;
const recoveryCodeCount = 10;

const totpCodeShape = /^\d{6}$/;
const ignoredCodeCharacters = /[\s-]/g;

interface TotpUriParts {
  secret: string;
  email: string;
}

interface TotpCodeCheck {
  secret: string;
  code: string;
  now: Date;
}

const encodeBase32 = (bytes: Buffer): string => {
  let encoded = "";
  let pendingBits = 0;
  let pendingValue = 0;
  for (const byte of bytes) {
    pendingValue = ((pendingValue << 8) | byte) & 0xfff;
    pendingBits += 8;
    while (pendingBits >= base32BitsPerCharacter) {
      pendingBits -= base32BitsPerCharacter;
      encoded += base32Alphabet.charAt((pendingValue >>> pendingBits) & 0x1f);
    }
  }
  if (pendingBits > 0) {
    encoded += base32Alphabet.charAt(
      (pendingValue << (base32BitsPerCharacter - pendingBits)) & 0x1f,
    );
  }
  return encoded;
};

const splitIntoGroups = (text: string, groupLength: number): string[] =>
  text.match(new RegExp(`.{1,${String(groupLength)}}`, "g")) ?? [];

const removeIgnoredCodeCharacters = (code: string): string =>
  code.replaceAll(ignoredCodeCharacters, "");

export const buildTotpSecret = (): string =>
  randomBytes(totpSecretBytes).toString("hex");

export const buildTotpSetupKey = (secret: string): string =>
  splitIntoGroups(
    encodeBase32(Buffer.from(secret, "hex")),
    setupKeyGroupLength,
  ).join(" ");

export const buildTotpUri = ({ secret, email }: TotpUriParts): string => {
  const label = `${encodeURIComponent(totpIssuer)}:${encodeURIComponent(email)}`;
  const parameters = new URLSearchParams({
    secret: encodeBase32(Buffer.from(secret, "hex")),
    issuer: totpIssuer,
    algorithm: "SHA1",
    digits: String(totpDigits),
    period: String(totpStepSeconds),
  });
  return `otpauth://totp/${label}?${parameters.toString()}`;
};

export const getTotpStep = (date: Date): number =>
  Math.floor(date.getTime() / 1000 / totpStepSeconds);

export const buildTotpCode = (secret: string, step: number): string => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", Buffer.from(secret, "hex"))
    .update(counter)
    .digest();
  const offset = digest.readUInt8(digest.length - 1) & 0xf;
  const truncated = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(truncated % 10 ** totpDigits).padStart(totpDigits, "0");
};

export const isTotpCodeShaped = (code: string): boolean =>
  totpCodeShape.test(removeIgnoredCodeCharacters(code));

export const findTotpStep = ({
  secret,
  code,
  now,
}: TotpCodeCheck): number | undefined => {
  const typedCode = removeIgnoredCodeCharacters(code);
  if (!totpCodeShape.test(typedCode)) {
    return undefined;
  }
  const currentStep = getTotpStep(now);
  const candidateSteps = [
    currentStep - totpDriftSteps,
    currentStep,
    currentStep + totpDriftSteps,
  ];
  return candidateSteps.find((step) =>
    timingSafeEqual(
      Buffer.from(buildTotpCode(secret, step)),
      Buffer.from(typedCode),
    ),
  );
};

type PickCharacterIndex = (alphabetLength: number) => number;

const buildRecoveryCode = (pickCharacterIndex: PickCharacterIndex): string => {
  const characterCount = recoveryCodeGroupLength * recoveryCodeGroups;
  const characters = Array.from({ length: characterCount }, () =>
    recoveryCodeAlphabet.charAt(
      pickCharacterIndex(recoveryCodeAlphabet.length),
    ),
  ).join("");
  return splitIntoGroups(characters, recoveryCodeGroupLength).join("-");
};

export const buildRecoveryCodes = (
  pickCharacterIndex: PickCharacterIndex = randomInt,
): string[] =>
  Array.from({ length: recoveryCodeCount }, () =>
    buildRecoveryCode(pickCharacterIndex),
  );

// Each recovery code is salted and stretched with argon2id, as passwords are, so a copy of recovery_codes is searched
// one guess, one code, one stored hash at a time (#255). A code carries about 59.5 bits, far more than a password, and
// a code is checked against each of the adult's (at most ten) hashes, so these costs are lighter than a password's:
// 8 MiB and one pass, about 1.3 ms a check, where a password's library defaults take about 7 ms.
const recoveryCodeHashOptions: Options = {
  memoryCost: 8192,
  timeCost: 1,
  parallelism: 1,
};
const argon2idPrefix = "$argon2id$";

/**
 * The SHA-256 a recovery code was once stored as. It is never stored now: it is what argon2 hashes, so the hashes
 * kept before #255 are stretched as they stand on start-up, and every code is checked the same way.
 */
const digestRecoveryCode = (code: string): string =>
  hashSecretToken(removeIgnoredCodeCharacters(code).toLowerCase());

export const hashRecoveryCode = (code: string): Promise<string> =>
  hash(digestRecoveryCode(code), recoveryCodeHashOptions);

/** For the pen-test fixtures alone, whose salts come from their seed so loading them twice gives the same rows. */
export const hashRecoveryCodeWithSalt = (
  code: string,
  salt: Buffer,
): Promise<string> =>
  hash(digestRecoveryCode(code), { ...recoveryCodeHashOptions, salt });

export const isStretchedRecoveryCodeHash = (codeHash: string): boolean =>
  codeHash.startsWith(argon2idPrefix);

/** Stretches a hash kept before #255, one SHA-256 of a code, into the form every code is now checked against. */
export const stretchRecoveryCodeDigest = (digest: string): Promise<string> =>
  hash(digest, recoveryCodeHashOptions);

/** False for a hash that isn't argon2id, such as one SHA-256 kept before #255 that start-up hasn't stretched yet. */
export const isRecoveryCodeRight = async (
  codeHash: string,
  code: string,
): Promise<boolean> =>
  isStretchedRecoveryCodeHash(codeHash) &&
  verify(codeHash, digestRecoveryCode(code));
