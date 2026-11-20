import { pbkdf2Sync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  hashPicturePassword,
  isPicturePasswordRight,
  type PicturePasswordPicture,
} from "./picture-password.js";

const picturePassword: PicturePasswordPicture[] = ["cat", "moon", "cat"];

const parsePicturePasswordHash = (picturePasswordHash: string) => {
  const [algorithm, iterations, salt, derivedKey] =
    picturePasswordHash.split("$");
  return { algorithm, iterations: Number(iterations), salt, derivedKey };
};

describe("hashPicturePassword", () => {
  it("stores a PBKDF2-SHA256 hash that any device can recompute from the pictures, the salt and the iterations", async () => {
    const { algorithm, iterations, salt, derivedKey } =
      parsePicturePasswordHash(await hashPicturePassword(picturePassword));

    const recomputedKey = pbkdf2Sync(
      "cat moon cat",
      Buffer.from(salt, "hex"),
      iterations,
      32,
      "sha256",
    ).toString("hex");

    expect(algorithm).toBe("pbkdf2-sha256");
    expect(iterations).toBe(100_000);
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(derivedKey).toBe(recomputedKey);
  });

  it("salts every hash, so two Children with the same pictures get different hashes", async () => {
    const firstHash = await hashPicturePassword(picturePassword);
    const secondHash = await hashPicturePassword(picturePassword);

    expect(firstHash).not.toBe(secondHash);
  });

  it("gives a different hash for the same pictures in a different order", async () => {
    const hash = await hashPicturePassword(picturePassword);
    const { salt, iterations, derivedKey } = parsePicturePasswordHash(hash);

    const reorderedKey = pbkdf2Sync(
      "moon cat cat",
      Buffer.from(salt, "hex"),
      iterations,
      32,
      "sha256",
    ).toString("hex");

    expect(derivedKey).not.toBe(reorderedKey);
  });
});

describe("isPicturePasswordRight", () => {
  it("accepts the pictures a hash was made from, in the same order", async () => {
    const hash = await hashPicturePassword(picturePassword);

    expect(await isPicturePasswordRight(["cat", "moon", "cat"], hash)).toBe(
      true,
    );
  });

  it("refuses the same pictures in another order, and other pictures", async () => {
    const hash = await hashPicturePassword(picturePassword);

    expect(await isPicturePasswordRight(["moon", "cat", "cat"], hash)).toBe(
      false,
    );
    expect(await isPicturePasswordRight(["dog", "moon", "cat"], hash)).toBe(
      false,
    );
  });

  it("checks a hash made elsewhere from its own salt and iterations", async () => {
    const salt = "000102030405060708090a0b0c0d0e0f";
    const derivedKey = pbkdf2Sync(
      "sun tree sun",
      Buffer.from(salt, "hex"),
      1_000,
      32,
      "sha256",
    ).toString("hex");

    expect(
      await isPicturePasswordRight(
        ["sun", "tree", "sun"],
        ["pbkdf2-sha256", "1000", salt, derivedKey].join("$"),
      ),
    ).toBe(true);
  });

  it.each([
    "argon2id$1000$00$00",
    "pbkdf2-sha256$1000$00",
    "pbkdf2-sha256$1000$00$00$00",
  ])("refuses to check %s, which isn't a hash Wizzaroo made", async (hash) => {
    await expect(isPicturePasswordRight(picturePassword, hash)).rejects.toThrow(
      "That isn't a Picture Password hash Wizzaroo made",
    );
  });
});
