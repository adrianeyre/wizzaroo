export const picturePasswordPictures = [
  "cat",
  "dog",
  "fish",
  "star",
  "moon",
  "sun",
  "apple",
  "tree",
  "rocket",
] as const;

export type PicturePasswordPicture = (typeof picturePasswordPictures)[number];

export const picturePasswordLength = 3;

const hashAlgorithm = "pbkdf2-sha256";
const hashIterations = 100_000;
const saltBytes = 16;
const hashBits = 256;

const buildHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const readHexBytes = (hex: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(hex.match(/[0-9a-f]{2}/g) ?? [], (pair) =>
    Number.parseInt(pair, 16),
  );

const derivePicturePasswordKey = async (
  picturePassword: readonly PicturePasswordPicture[],
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<string> => {
  const picturePasswordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(picturePassword.join(" ")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    picturePasswordKey,
    hashBits,
  );
  return buildHex(new Uint8Array(derivedBits));
};

export const hashPicturePasswordWithSalt = async (
  picturePassword: readonly PicturePasswordPicture[],
  salt: Uint8Array<ArrayBuffer>,
): Promise<string> =>
  [
    hashAlgorithm,
    String(hashIterations),
    buildHex(salt),
    await derivePicturePasswordKey(picturePassword, salt, hashIterations),
  ].join("$");

export const hashPicturePassword = (
  picturePassword: readonly PicturePasswordPicture[],
): Promise<string> =>
  hashPicturePasswordWithSalt(
    picturePassword,
    crypto.getRandomValues(new Uint8Array(saltBytes)),
  );

export const isPicturePasswordRight = async (
  picturePassword: readonly PicturePasswordPicture[],
  picturePasswordHash: string,
): Promise<boolean> => {
  const hashParts = picturePasswordHash.split("$");
  if (hashParts.length !== 4 || hashParts[0] !== hashAlgorithm) {
    throw new Error("That isn't a Picture Password hash Wizzaroo made");
  }
  const [, iterations, salt, derivedKey] = hashParts;
  const recomputedKey = await derivePicturePasswordKey(
    picturePassword,
    readHexBytes(salt),
    Number(iterations),
  );
  return recomputedKey === derivedKey;
};
