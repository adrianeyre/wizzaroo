import { describe, expect, it } from "vitest";
import { hashSecretToken } from "./secret-token.js";
import {
  buildRecoveryCodes,
  buildTotpCode,
  buildTotpSecret,
  buildTotpSetupKey,
  buildTotpUri,
  findTotpStep,
  getTotpStep,
  hashRecoveryCode,
  isRecoveryCodeRight,
  isStretchedRecoveryCodeHash,
  isTotpCodeShaped,
  stretchRecoveryCodeDigest,
} from "./two-factor.js";

const rfc6238Secret = Buffer.from("12345678901234567890").toString("hex");

describe("buildTotpCode", () => {
  it.each([
    { unixSeconds: 59, code: "287082" },
    { unixSeconds: 1_111_111_109, code: "081804" },
    { unixSeconds: 1_111_111_111, code: "050471" },
    { unixSeconds: 1_234_567_890, code: "005924" },
    { unixSeconds: 2_000_000_000, code: "279037" },
    { unixSeconds: 20_000_000_000, code: "353130" },
  ])(
    "gives $code at $unixSeconds seconds, as RFC 6238's SHA-1 test vectors do in six digits",
    ({ unixSeconds, code }) => {
      const step = getTotpStep(new Date(unixSeconds * 1000));

      expect(buildTotpCode(rfc6238Secret, step)).toBe(code);
    },
  );
});

describe("findTotpStep", () => {
  const now = new Date(1_234_567_890 * 1000);
  const currentStep = getTotpStep(now);

  it("accepts the code for now, and the codes either side for a clock that drifts by one step", () => {
    for (const step of [currentStep - 1, currentStep, currentStep + 1]) {
      const code = buildTotpCode(rfc6238Secret, step);

      expect(findTotpStep({ secret: rfc6238Secret, code, now })).toBe(step);
    }
  });

  it("refuses a code two steps away", () => {
    const code = buildTotpCode(rfc6238Secret, currentStep - 2);

    expect(findTotpStep({ secret: rfc6238Secret, code, now })).toBeUndefined();
  });

  it("accepts a code typed with spaces, as authenticator apps show them", () => {
    expect(
      findTotpStep({ secret: rfc6238Secret, code: " 005 924 ", now }),
    ).toBe(currentStep);
  });

  it.each(["", "12345", "1234567", "abcdef"])(
    "refuses %j, which isn't six digits",
    (code) => {
      expect(
        findTotpStep({ secret: rfc6238Secret, code, now }),
      ).toBeUndefined();
    },
  );
});

describe("isTotpCodeShaped", () => {
  it("tells a six-digit code from a recovery code", () => {
    expect(isTotpCodeShaped("123 456")).toBe(true);
    expect(isTotpCodeShaped(buildRecoveryCodes()[0])).toBe(false);
  });
});

describe("buildTotpSecret", () => {
  it("makes a new 160-bit secret every time", () => {
    const secrets = new Set([buildTotpSecret(), buildTotpSecret()]);

    expect(secrets.size).toBe(2);
    for (const secret of secrets) {
      expect(secret).toMatch(/^[0-9a-f]{40}$/);
    }
  });
});

describe("buildTotpSetupKey", () => {
  it("writes the secret in base32, as RFC 4648 does, in groups of four to type into an app", () => {
    const secret = Buffer.from("foobar").toString("hex");

    expect(buildTotpSetupKey(secret)).toBe("MZXW 6YTB OI");
  });
});

describe("buildTotpUri", () => {
  it("names Wizzaroo and the Parent's email address, and gives the secret in base32", () => {
    const uri = buildTotpUri({
      secret: rfc6238Secret,
      email: "parent@example.com",
    });

    expect(uri).toBe(
      "otpauth://totp/Wizzaroo:parent%40example.com?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Wizzaroo&algorithm=SHA1&digits=6&period=30",
    );
  });
});

describe("buildRecoveryCodes", () => {
  it("makes ten different codes, in letters and digits that can't be mistaken for each other", () => {
    const codes = buildRecoveryCodes();

    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(
        /^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/,
      );
    }
  });
});

describe("hashRecoveryCode and isRecoveryCodeRight", () => {
  it("accepts a code however the Parent types its case, spaces and hyphens", async () => {
    const codeHash = await hashRecoveryCode("abcd-efgh-jkmn");

    expect(await isRecoveryCodeRight(codeHash, "abcd-efgh-jkmn")).toBe(true);
    expect(await isRecoveryCodeRight(codeHash, " ABCD EFGH JKMN ")).toBe(true);
    expect(await isRecoveryCodeRight(codeHash, "abcd-efgh-jkmp")).toBe(false);
  });

  it("salts each hash with argon2id, so one code hashes differently each time and never as one SHA-256", async () => {
    const first = await hashRecoveryCode("abcd-efgh-jkmn");
    const second = await hashRecoveryCode("abcd-efgh-jkmn");

    expect(first).toMatch(/^\$argon2id\$v=19\$m=8192,t=1,p=1\$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain(hashSecretToken("abcdefghjkmn"));
    expect(isStretchedRecoveryCodeHash(first)).toBe(true);
  });

  it("accepts a code whose hash was kept as one SHA-256 before #255 once that hash is stretched, and not before", async () => {
    const keptDigest = hashSecretToken("abcdefghjkmn");
    const stretched = await stretchRecoveryCodeDigest(keptDigest);

    expect(isStretchedRecoveryCodeHash(keptDigest)).toBe(false);
    expect(await isRecoveryCodeRight(keptDigest, "abcd-efgh-jkmn")).toBe(false);
    expect(await isRecoveryCodeRight(stretched, "abcd-efgh-jkmn")).toBe(true);
  });
});
