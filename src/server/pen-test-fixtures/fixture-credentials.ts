import { createECDH, createHmac } from "node:crypto";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";
import { buildRecoveryCodes } from "../auth/two-factor.js";
import {
  picturePasswordLength,
  picturePasswordPictures,
  type PicturePasswordPicture,
} from "../children/picture-password.js";
import type { PenTestFixturePlan } from "./fixture-plan.js";

export interface FixturePasskey {
  credentialId: string;
  publicKey: string;
  privateKeyJwk: JsonWebKey;
}

export interface PenTestFixtureCredentials {
  passwords: ReadonlyMap<string, string>;
  totpSecrets: ReadonlyMap<string, string>;
  recoveryCodes: ReadonlyMap<string, string[]>;
  passkeys: ReadonlyMap<string, FixturePasskey>;
  familyDeviceTokens: ReadonlyMap<string, string>;
  inviteTokens: ReadonlyMap<string, string>;
  picturePasswords: ReadonlyMap<string, PicturePasswordPicture[]>;
}

const sha256Bytes = 32;
const passwordBytes = 18;
const totpSecretBytes = 20;
const secretTokenBytes = 32;
const credentialIdBytes = 16;
const recoveryCodeBytes = 128;

const coseKey = { keyType: 1, algorithm: 3, curve: -1, x: -2, y: -3 } as const;
const coseEllipticCurveKeyType = 2;
const coseEs256Algorithm = -7;
const coseP256Curve = 1;
const p256CoordinateBytes = 32;

export const deriveFixtureBytes = (
  seed: string,
  purpose: string,
  fixtureId: string,
  length: number,
): Buffer =>
  Buffer.concat(
    Array.from({ length: Math.ceil(length / sha256Bytes) }, (_, block) =>
      createHmac("sha256", seed)
        .update(`${purpose}:${fixtureId}:${String(block)}`)
        .digest(),
    ),
  ).subarray(0, length);

const buildByteReader = (bytes: Buffer) => {
  let position = 0;
  return (alphabetLength: number): number => {
    const byte = bytes.readUInt8(position);
    position += 1;
    return byte % alphabetLength;
  };
};

const buildPasskey = (seed: string, userId: string): FixturePasskey => {
  const privateKey = deriveFixtureBytes(
    seed,
    "passkey-private-key",
    userId,
    p256CoordinateBytes,
  );
  const keyAgreement = createECDH("prime256v1");
  keyAgreement.setPrivateKey(privateKey);
  const publicPoint = keyAgreement.getPublicKey();
  const x = publicPoint.subarray(1, 1 + p256CoordinateBytes);
  const y = publicPoint.subarray(1 + p256CoordinateBytes);
  const cosePublicKey = isoCBOR.encode(
    new Map<number, number | Uint8Array>([
      [coseKey.keyType, coseEllipticCurveKeyType],
      [coseKey.algorithm, coseEs256Algorithm],
      [coseKey.curve, coseP256Curve],
      [coseKey.x, new Uint8Array(x)],
      [coseKey.y, new Uint8Array(y)],
    ]),
  );
  return {
    credentialId: deriveFixtureBytes(
      seed,
      "passkey-credential-id",
      userId,
      credentialIdBytes,
    ).toString("base64url"),
    publicKey: isoBase64URL.fromBuffer(cosePublicKey),
    privateKeyJwk: {
      kty: "EC",
      crv: "P-256",
      d: privateKey.toString("base64url"),
      x: x.toString("base64url"),
      y: y.toString("base64url"),
    },
  };
};

const buildPicturePassword = (
  seed: string,
  childId: string,
): PicturePasswordPicture[] => {
  const pickPicture = buildByteReader(
    deriveFixtureBytes(
      seed,
      "picture-password",
      childId,
      picturePasswordLength,
    ),
  );
  return Array.from(
    { length: picturePasswordLength },
    () => picturePasswordPictures[pickPicture(picturePasswordPictures.length)],
  );
};

export const buildPenTestFixtureCredentials = (
  plan: PenTestFixturePlan,
  seed: string,
): PenTestFixtureCredentials => {
  const derive = (purpose: string, fixtureId: string, length: number) =>
    deriveFixtureBytes(seed, purpose, fixtureId, length);
  const adultsWith = (
    signInMethod: "hasPassword" | "hasTotp" | "hasPasskey",
  ): string[] =>
    plan.adults.filter((adult) => adult[signInMethod]).map(({ id }) => id);

  return {
    passwords: new Map(
      adultsWith("hasPassword").map((userId) => [
        userId,
        derive("password", userId, passwordBytes).toString("base64url"),
      ]),
    ),
    totpSecrets: new Map(
      adultsWith("hasTotp").map((userId) => [
        userId,
        derive("totp-secret", userId, totpSecretBytes).toString("hex"),
      ]),
    ),
    recoveryCodes: new Map(
      adultsWith("hasTotp").map((userId) => [
        userId,
        buildRecoveryCodes(
          buildByteReader(derive("recovery-codes", userId, recoveryCodeBytes)),
        ),
      ]),
    ),
    passkeys: new Map(
      adultsWith("hasPasskey").map((userId) => [
        userId,
        buildPasskey(seed, userId),
      ]),
    ),
    familyDeviceTokens: new Map(
      plan.familyDevices.map(({ id }) => [
        id,
        derive("family-device-token", id, secretTokenBytes).toString(
          "base64url",
        ),
      ]),
    ),
    inviteTokens: new Map(
      plan.invites.map(({ id }) => [
        id,
        derive("invite-token", id, secretTokenBytes).toString("base64url"),
      ]),
    ),
    picturePasswords: new Map(
      plan.children.map(({ id }) => [id, buildPicturePassword(seed, id)]),
    ),
  };
};
