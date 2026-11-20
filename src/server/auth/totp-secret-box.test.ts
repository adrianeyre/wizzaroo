import { describe, expect, it } from "vitest";
import {
  isSealedTotpSecret,
  isTotpSecretKeyShaped,
  openTotpSecret,
  parseTotpSecretKey,
  sealTotpSecret,
} from "./totp-secret-box.js";

const key = parseTotpSecretKey("0f".repeat(32));
const otherKey = parseTotpSecretKey("f0".repeat(32));
const userId = "e2000000-0000-4000-8000-ad0000000011";
const otherUserId = "e2000000-0000-4000-8000-ad0000000031";
const secret = "3132333435363738393031323334353637383930";

const flipCharacter = (text: string, index: number): string =>
  `${text.slice(0, index)}${text.charAt(index) === "A" ? "B" : "A"}${text.slice(index + 1)}`;

describe("parseTotpSecretKey", () => {
  it("takes 64 hexadecimal characters, in either case, as 32 bytes", () => {
    expect(parseTotpSecretKey("AB".repeat(32)).bytes).toHaveLength(32);
    expect(isTotpSecretKeyShaped("ab".repeat(32))).toBe(true);
  });

  it.each([
    { value: "", reason: "empty" },
    { value: "ab".repeat(31), reason: "too short" },
    { value: "ab".repeat(33), reason: "too long" },
    { value: `${"ab".repeat(31)}zz`, reason: "not hexadecimal" },
    { value: ` ${"ab".repeat(32)}`, reason: "padded" },
  ])("refuses a value that is $reason", ({ value }) => {
    expect(() => parseTotpSecretKey(value)).toThrow(
      "a TOTP secret key is 64 hexadecimal characters",
    );
  });
});

describe("sealTotpSecret and openTotpSecret", () => {
  it("opens a sealed secret, for the same adult under the same key, as it was issued", () => {
    const sealedSecret = sealTotpSecret(key, { userId, secret });

    expect(openTotpSecret(key, { userId, sealedSecret })).toBe(secret);
  });

  it("keeps neither the secret nor its hex in the sealed form, and seals it differently each time", () => {
    const first = sealTotpSecret(key, { userId, secret });
    const second = sealTotpSecret(key, { userId, secret });

    expect(first).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(first).not.toContain(secret);
    expect(first).not.toBe(second);
    expect(isSealedTotpSecret(first)).toBe(true);
  });

  it("doesn't open under another key", () => {
    const sealedSecret = sealTotpSecret(key, { userId, secret });

    expect(openTotpSecret(otherKey, { userId, sealedSecret })).toBeUndefined();
  });

  it("doesn't open for another adult, so a sealed secret copied onto their row makes no codes", () => {
    const sealedSecret = sealTotpSecret(key, { userId, secret });

    expect(
      openTotpSecret(key, { userId: otherUserId, sealedSecret }),
    ).toBeUndefined();
  });

  it("doesn't open once any part of it is changed", () => {
    const sealedSecret = sealTotpSecret(key, { userId, secret });
    const [version, iv, ciphertext, tag] = sealedSecret.split(".");
    const changed = [
      [version, flipCharacter(iv, 0), ciphertext, tag],
      [version, iv, flipCharacter(ciphertext, 0), tag],
      [version, iv, ciphertext, flipCharacter(tag, 0)],
      ["v2", iv, ciphertext, tag],
      [version, iv, ciphertext],
      [version, iv, `${ciphertext}!`, tag],
    ].map((parts) => parts.join("."));

    for (const changedSecret of changed) {
      expect(
        openTotpSecret(key, { userId, sealedSecret: changedSecret }),
      ).toBeUndefined();
    }
  });

  it("refuses a secret held as issued, from before secrets were sealed", () => {
    expect(isSealedTotpSecret(secret)).toBe(false);
    expect(
      openTotpSecret(key, { userId, sealedSecret: secret }),
    ).toBeUndefined();
  });
});
