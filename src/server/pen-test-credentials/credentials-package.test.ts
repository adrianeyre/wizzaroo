import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { describe, expect, it } from "vitest";
import { isPasswordLongEnough } from "../auth/password.js";
import { buildTotpSetupKey } from "../auth/two-factor.js";
import { buildPenTestFixtureCredentials } from "../pen-test-fixtures/fixture-credentials.js";
import {
  buildPenTestFixturePlan,
  penTestFixtureIds,
} from "../pen-test-fixtures/fixture-plan.js";
import {
  buildCookieHeader,
  buildCurlCookieJar,
  buildPasskeyAssertion,
  buildPenTestCredentialsPackage,
  buildPenTestCredentialVariable,
  CredentialOnCommandLineError,
  listPenTestIdentities,
  PenTestCredentialUnreadableError,
  readPenTestSignInCredential,
  readSetCookies,
  readSignInHandle,
  UnknownPenTestIdentityError,
  type PenTestFixtureHandle,
} from "./credentials-package.js";

const ids = penTestFixtureIds;
const plan = buildPenTestFixturePlan(new Date("2026-11-17T10:30:00.000Z"));
const seed = "0123456789abcdef".repeat(4);
const credentials = buildPenTestFixtureCredentials(plan, seed);
const credentialsPackage = buildPenTestCredentialsPackage(
  plan,
  credentials,
  seed,
);
const environment = parseEnv(credentialsPackage);
const identities = listPenTestIdentities(plan);
const origin = new URL("http://localhost:43310");

const isFixtureHandle = (text: string): text is PenTestFixtureHandle =>
  Object.hasOwn(penTestFixtureIds, text);

const getFixtureHandle = (fixtureId: string): PenTestFixtureHandle => {
  const handle = Object.keys(penTestFixtureIds)
    .filter(isFixtureHandle)
    .find((candidate) => penTestFixtureIds[candidate] === fixtureId);
  if (handle === undefined) {
    throw new Error(`the fixture ${fixtureId} has no handle`);
  }
  return handle;
};

const findCredential = <Credential>(
  fixtureCredentials: ReadonlyMap<string, Credential>,
  fixtureId: string,
): Credential => {
  const credential = fixtureCredentials.get(fixtureId);
  if (credential === undefined) {
    throw new Error(`the fixture ${fixtureId} has no credential`);
  }
  return credential;
};

const buildEnvironmentWithout = (variable: string) =>
  Object.fromEntries(
    Object.entries(environment).filter(([name]) => name !== variable),
  );

const catchRefusal = (refuse: () => unknown): unknown => {
  try {
    refuse();
  } catch (error) {
    return error;
  }
  throw new Error("nothing was refused");
};

describe("listPenTestIdentities", () => {
  it("lists every fixture adult and every Family Device, and nothing that can't sign in", () => {
    expect(identities).toEqual([
      "admin",
      "teacherAYear3",
      "teacherAYears5And6",
      "teacherBYear3",
      "teacherADeactivated",
      "parentA1",
      "coParentA1",
      "parentA2PasskeyOnly",
      "coParentA2Invited",
      "parentB",
      "coParentBInviteExpired",
      "familyDeviceA1",
      "familyDeviceA1Revoked",
      "familyDeviceA2",
      "familyDeviceB",
    ]);
  });
});

describe("buildPenTestCredentialVariable", () => {
  it.each([
    ["admin", "PASSWORD", "PEN_TEST_ADMIN_PASSWORD"],
    [
      "teacherAYears5And6",
      "PASSKEY_PRIVATE_KEY_JWK",
      "PEN_TEST_TEACHER_A_YEARS5_AND6_PASSKEY_PRIVATE_KEY_JWK",
    ],
    [
      "familyDeviceA1Revoked",
      "TOKEN",
      "PEN_TEST_FAMILY_DEVICE_A1_REVOKED_TOKEN",
    ],
    [
      "inviteCoParentA2Pending",
      "TOKEN",
      "PEN_TEST_INVITE_CO_PARENT_A2_PENDING_TOKEN",
    ],
  ] as const)("names %s's %s as %s", (handle, credentialName, variable) => {
    expect(buildPenTestCredentialVariable(handle, credentialName)).toBe(
      variable,
    );
  });
});

describe("buildPenTestCredentialsPackage", () => {
  it("holds every credential the seed derives for the fixtures, as it derives them", () => {
    const expected: Record<string, string> = {};
    const name = buildPenTestCredentialVariable;
    for (const [userId, password] of credentials.passwords) {
      expected[name(getFixtureHandle(userId), "PASSWORD")] = password;
    }
    for (const [userId, secret] of credentials.totpSecrets) {
      expected[name(getFixtureHandle(userId), "TOTP_SECRET")] = secret;
      expected[name(getFixtureHandle(userId), "TOTP_SETUP_KEY")] =
        buildTotpSetupKey(secret);
    }
    for (const [userId, codes] of credentials.recoveryCodes) {
      expected[name(getFixtureHandle(userId), "RECOVERY_CODES")] =
        codes.join(",");
    }
    for (const [userId, passkey] of credentials.passkeys) {
      expected[name(getFixtureHandle(userId), "PASSKEY_CREDENTIAL_ID")] =
        passkey.credentialId;
      expected[name(getFixtureHandle(userId), "PASSKEY_PRIVATE_KEY_JWK")] =
        JSON.stringify(passkey.privateKeyJwk);
    }
    for (const [fixtureId, token] of [
      ...credentials.inviteTokens,
      ...credentials.familyDeviceTokens,
    ]) {
      expected[name(getFixtureHandle(fixtureId), "TOKEN")] = token;
    }
    for (const [childId, pictures] of credentials.picturePasswords) {
      expected[name(getFixtureHandle(childId), "PICTURE_PASSWORD")] =
        pictures.join(",");
    }

    expect(environment).toMatchObject(expected);
    expect(Object.keys(environment).sort()).toEqual(
      [
        ...Object.keys(expected),
        "PEN_TEST_CO_PARENT_A2_INVITED_NEW_PASSWORD",
        "PEN_TEST_CO_PARENT_B_INVITE_EXPIRED_NEW_PASSWORD",
      ].sort(),
    );
  });

  it("gives each adult with neither a password nor a passkey a password to accept their Invite with, long enough and their own", () => {
    const newPasswords = [
      environment.PEN_TEST_CO_PARENT_A2_INVITED_NEW_PASSWORD,
      environment.PEN_TEST_CO_PARENT_B_INVITE_EXPIRED_NEW_PASSWORD,
    ];
    const otherSeedPackage = parseEnv(
      buildPenTestCredentialsPackage(plan, credentials, "f".repeat(64)),
    );

    for (const newPassword of newPasswords) {
      expect(isPasswordLongEnough(newPassword ?? "")).toBe(true);
    }
    expect(new Set(newPasswords).size).toBe(2);
    expect(
      otherSeedPackage.PEN_TEST_CO_PARENT_A2_INVITED_NEW_PASSWORD,
    ).not.toBe(newPasswords[0]);
  });

  it("keeps the seed out of the package, and says what it is on its first lines", () => {
    expect(credentialsPackage).not.toContain(seed);
    expect(credentialsPackage).toMatch(/^# The pen-test credentials package/);
    expect(credentialsPackage).toContain("Never paste a value");
  });

  it("writes every value so a POSIX shell can source it unchanged", () => {
    const lines = credentialsPackage
      .split("\n")
      .filter((line) => line !== "" && !line.startsWith("#"));

    for (const line of lines) {
      expect(line).toMatch(/^PEN_TEST_[A-Z0-9_]+='[^'\n]*'$/);
    }
  });
});

describe("readSignInHandle", () => {
  it("takes the one fixture identity named on the command line", () => {
    expect(readSignInHandle(["parentA1"], identities)).toBe("parentA1");
    expect(readSignInHandle(["familyDeviceB"], identities)).toBe(
      "familyDeviceB",
    );
  });

  const password = findCredential(credentials.passwords, ids.parentA1);

  it.each([
    [["parentA1", "--password", password]],
    [["parentA1", `--password=${password}`]],
    [[`--password=${password}`, "parentA1"]],
    [["parentA1", "-p", password]],
    [["parentA1", password]],
    [["--", "parentA1"]],
  ])(
    "refuses a credential passed as a flag or an argument, %#, without repeating it",
    (commandArguments) => {
      const refusal = catchRefusal(() =>
        readSignInHandle(commandArguments, identities),
      );

      expect(refusal).toBeInstanceOf(CredentialOnCommandLineError);
      expect(String(refusal)).toContain("from the environment");
      expect(String(refusal)).not.toContain(password);
    },
  );

  it.each([[[password]], [["schoolA"]], [["childA1Year3"]], [[]]])(
    "refuses an argument that names no fixture identity, %#, without repeating it",
    (commandArguments) => {
      const refusal = catchRefusal(() =>
        readSignInHandle(commandArguments, identities),
      );

      expect(refusal).toBeInstanceOf(UnknownPenTestIdentityError);
      expect(String(refusal)).not.toContain(password);
      expect(String(refusal)).toContain("parentA1");
    },
  );
});

describe("readPenTestSignInCredential", () => {
  it("signs a Parent with TOTP in by their password and their TOTP secret", () => {
    expect(readPenTestSignInCredential(plan, "parentA1", environment)).toEqual({
      method: "password",
      email: "parent-a1@pen-test.example",
      password: findCredential(credentials.passwords, ids.parentA1),
      totpSecret: findCredential(credentials.totpSecrets, ids.parentA1),
    });
  });

  it("signs an adult with a password and no TOTP in by their password alone", () => {
    expect(
      readPenTestSignInCredential(plan, "teacherBYear3", environment),
    ).toEqual({
      method: "password",
      email: "teacher-b-year-3@pen-test.example",
      password: findCredential(credentials.passwords, ids.teacherBYear3),
      totpSecret: undefined,
    });
  });

  it("signs an adult with a passkey in by it, even when they have a password too", () => {
    for (const handle of [
      "teacherAYears5And6",
      "parentA2PasskeyOnly",
    ] as const) {
      const passkey = findCredential(
        credentials.passkeys,
        penTestFixtureIds[handle],
      );

      expect(readPenTestSignInCredential(plan, handle, environment)).toEqual({
        method: "passkey",
        passkey: {
          credentialId: passkey.credentialId,
          privateKeyJwk: passkey.privateKeyJwk,
        },
      });
    }
  });

  it("signs an adult who has never signed in in by accepting their Invite", () => {
    expect(
      readPenTestSignInCredential(plan, "coParentA2Invited", environment),
    ).toEqual({
      method: "invite",
      token: findCredential(
        credentials.inviteTokens,
        ids.inviteCoParentA2Pending,
      ),
      newPassword: environment.PEN_TEST_CO_PARENT_A2_INVITED_NEW_PASSWORD,
    });
  });

  it("signs a Family Device in by its token", () => {
    expect(
      readPenTestSignInCredential(plan, "familyDeviceA1Revoked", environment),
    ).toEqual({
      method: "family-device",
      token: findCredential(
        credentials.familyDeviceTokens,
        ids.familyDeviceA1Revoked,
      ),
    });
  });

  it.each([
    ["parentA1", "PEN_TEST_PARENT_A1_PASSWORD"],
    ["parentA1", "PEN_TEST_PARENT_A1_TOTP_SECRET"],
    [
      "parentA2PasskeyOnly",
      "PEN_TEST_PARENT_A2_PASSKEY_ONLY_PASSKEY_PRIVATE_KEY_JWK",
    ],
    ["coParentA2Invited", "PEN_TEST_INVITE_CO_PARENT_A2_PENDING_TOKEN"],
    ["familyDeviceB", "PEN_TEST_FAMILY_DEVICE_B_TOKEN"],
  ] as const)(
    "names the variable %s's sign-in needs when the environment lacks %s",
    (handle, variable) => {
      expect(() =>
        readPenTestSignInCredential(
          plan,
          handle,
          buildEnvironmentWithout(variable),
        ),
      ).toThrow(new PenTestCredentialUnreadableError(variable));
    },
  );

  it("names the variable, and never its value, when a passkey's private key isn't a key", () => {
    const variable = "PEN_TEST_TEACHER_A_YEARS5_AND6_PASSKEY_PRIVATE_KEY_JWK";

    for (const unreadableKey of ["not json", '{"kty":"EC"}', "null"]) {
      const refusal = catchRefusal(() =>
        readPenTestSignInCredential(plan, "teacherAYears5And6", {
          ...environment,
          [variable]: unreadableKey,
        }),
      );

      expect(refusal).toEqual(new PenTestCredentialUnreadableError(variable));
      expect(String(refusal)).not.toContain(unreadableKey);
    }
  });

  it("refuses a fixture that isn't an identity", () => {
    expect(() =>
      readPenTestSignInCredential(plan, "childA1Year3", environment),
    ).toThrow(UnknownPenTestIdentityError);
  });
});

describe("buildPasskeyAssertion", () => {
  it("signs a challenge so the fixture's stored public key verifies it, as a user verified on this origin", async () => {
    const storedPasskey = findCredential(
      credentials.passkeys,
      ids.parentA2PasskeyOnly,
    );
    const credential = readPenTestSignInCredential(
      plan,
      "parentA2PasskeyOnly",
      environment,
    );
    if (credential.method !== "passkey") {
      throw new Error("the passkey-only Parent signs in some other way");
    }
    const challenge = isoBase64URL.fromBuffer(new Uint8Array(32).fill(7));

    const verification = await verifyAuthenticationResponse({
      response: buildPasskeyAssertion({
        passkey: credential.passkey,
        challenge,
        origin,
      }),
      expectedChallenge: challenge,
      expectedOrigin: origin.origin,
      expectedRPID: origin.hostname,
      requireUserVerification: true,
      credential: {
        id: storedPasskey.credentialId,
        publicKey: isoBase64URL.toBuffer(storedPasskey.publicKey),
        counter: 0,
      },
    });

    expect(verification.verified).toBe(true);
  });
});

describe("cookies", () => {
  const setCookieHeaders = [
    "__Host-wizzaroo_sign_in=sign-in-token; Path=/; HttpOnly; Secure; SameSite=Strict",
    "wizzaroo_pending_sign_in=; Max-Age=0; Path=/api/sign-in; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict",
    "wizzaroo_family_device=device-token; Max-Age=34560000; Path=/api/play; HttpOnly; Secure; SameSite=Strict",
  ];

  it("reads the cookies a response sets, with their paths, and drops the ones it clears", () => {
    expect(readSetCookies(setCookieHeaders)).toEqual([
      { name: "__Host-wizzaroo_sign_in", value: "sign-in-token", path: "/" },
      {
        name: "wizzaroo_family_device",
        value: "device-token",
        path: "/api/play",
      },
    ]);
  });

  it("sends them back as one Cookie header", () => {
    expect(buildCookieHeader(readSetCookies(setCookieHeaders))).toBe(
      "__Host-wizzaroo_sign_in=sign-in-token; wizzaroo_family_device=device-token",
    );
  });

  it("writes them as a cookie jar curl reads, kept to the deployment's host and each cookie's path", () => {
    expect(
      buildCurlCookieJar(readSetCookies(setCookieHeaders), origin).split("\n"),
    ).toEqual([
      "# Netscape HTTP Cookie File",
      "#HttpOnly_localhost\tFALSE\t/\tTRUE\t0\t__Host-wizzaroo_sign_in\tsign-in-token",
      "#HttpOnly_localhost\tFALSE\t/api/play\tTRUE\t0\twizzaroo_family_device\tdevice-token",
      "",
    ]);
  });
});

describe("docs/pen-test/credentials-package.md", () => {
  it("names every variable in the credentials package", async () => {
    const page = await readFile(
      new URL("../../../docs/pen-test/credentials-package.md", import.meta.url),
      "utf8",
    );

    for (const variable of Object.keys(environment)) {
      expect(page).toContain(`\`${variable}\``);
    }
  });
});
