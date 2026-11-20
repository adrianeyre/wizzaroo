import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  appLoginRole,
  buildScramVerifier,
  findPrivilegedLoginRefusal,
  listPools,
  openDatabase,
  poolConnectionTimeoutMs,
  readAppLogin,
} from "./database.js";

// The SCRAM-SHA-256 exchange in RFC 7677, section 3: user "user", password "pencil".
const rfc7677 = {
  password: "pencil",
  salt: "W22ZaJ0SNY7soEsUEjb6gQ==",
  authMessage: [
    "n=user,r=rOprNGfwEbeRWgbNEkqO",
    "r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096",
    "c=biws,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0",
  ].join(","),
  clientProof: "dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=",
  serverSignature: "6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4=",
};

const readVerifier = (verifier: string) => {
  const match = /^SCRAM-SHA-256\$(\d+):([^$]+)\$([^:]+):(.+)$/.exec(verifier);
  if (match === null) {
    throw new Error(`not a SCRAM-SHA-256 verifier: ${verifier}`);
  }
  return {
    iterations: Number(match[1]),
    salt: match[2],
    storedKey: Buffer.from(match[3], "base64"),
    serverKey: Buffer.from(match[4], "base64"),
  };
};

describe("buildScramVerifier", () => {
  it("builds the verifier that accepts RFC 7677's client proof and signs as its server does", () => {
    const verifier = readVerifier(
      buildScramVerifier(rfc7677.password, Buffer.from(rfc7677.salt, "base64")),
    );
    const clientSignature = createHmac("sha256", verifier.storedKey)
      .update(rfc7677.authMessage)
      .digest();
    const clientKey = Buffer.from(rfc7677.clientProof, "base64").map(
      (byte, index) => byte ^ clientSignature[index],
    );

    expect(verifier.iterations).toBe(4096);
    expect(verifier.salt).toBe(rfc7677.salt);
    expect(createHash("sha256").update(clientKey).digest()).toEqual(
      verifier.storedKey,
    );
    expect(
      createHmac("sha256", verifier.serverKey)
        .update(rfc7677.authMessage)
        .digest("base64"),
    ).toBe(rfc7677.serverSignature);
  });

  it("salts each verifier afresh, so the same password never gives the same verifier", () => {
    expect(buildScramVerifier("a-generated-password")).not.toBe(
      buildScramVerifier("a-generated-password"),
    );
  });

  it("holds nothing but the verifier's own characters, so it can't end the literal it is sent in", () => {
    expect(buildScramVerifier("it's a password")).toMatch(
      /^SCRAM-SHA-256\$4096:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/,
    );
  });

  it("refuses a password outside printable ASCII, whose SASLprep form could differ", () => {
    expect(() => buildScramVerifier("pässword")).toThrow(
      "The app's database password must be printable ASCII",
    );
  });
});

describe("readAppLogin", () => {
  it("reads the app's password from DATABASE_URL, decoded", () => {
    expect(
      readAppLogin(
        `postgres://${appLoginRole}:a%40generated%2Fpassword@postgres:5432/wizzaroo`,
      ),
    ).toEqual({ password: "a@generated/password" });
  });

  it("reads no password from a URL without one, as development's trusted database", () => {
    expect(
      readAppLogin(`postgres://${appLoginRole}@localhost:54320/wizzaroo`),
    ).toEqual({ password: undefined });
  });

  it("refuses a DATABASE_URL that logs in as any role but the app's, the owner's included", () => {
    expect(() =>
      readAppLogin("postgres://wizzaroo:the-owner's@postgres:5432/wizzaroo"),
    ).toThrow(
      `DATABASE_URL must log in as ${appLoginRole}, the role migrate sets up for the app, not "wizzaroo"`,
    );
  });
});

describe("findPrivilegedLoginRefusal", () => {
  const leastPrivileged = {
    loginRole: appLoginRole,
    isSuperuser: false,
    bypassesRowLevelSecurity: false,
    ownsATable: false,
  };

  it("serves on a login that is no superuser, isn't exempt from row-level security and owns no table", () => {
    expect(findPrivilegedLoginRefusal(leastPrivileged)).toBeUndefined();
  });

  it("refuses the superuser the Postgres image makes, naming everything it can do", () => {
    expect(
      findPrivilegedLoginRefusal({
        loginRole: "wizzaroo",
        isSuperuser: true,
        bypassesRowLevelSecurity: true,
        ownsATable: true,
      }),
    ).toBe(
      `DATABASE_URL logs in as "wizzaroo", which is or can become a superuser, exempt from row-level security, the owner of the tables. Log the app in as ${appLoginRole}, which migrate sets up, and keep the owner's URL in DATABASE_OWNER_URL`,
    );
  });

  it.each([
    ["isSuperuser", "a superuser"],
    ["bypassesRowLevelSecurity", "exempt from row-level security"],
    ["ownsATable", "the owner of the tables"],
  ] as const)("refuses a login where %s alone holds", (privilege, named) => {
    expect(
      findPrivilegedLoginRefusal({ ...leastPrivileged, [privilege]: true }),
    ).toContain(`which is or can become ${named}.`);
  });
});

describe("openDatabase", () => {
  it("gives up waiting for a pool's connection after a few seconds, so no query waits for ever behind a held pool (#329)", async () => {
    const database = openDatabase(
      "postgres://wizzaroo_app@localhost:54320/wizzaroo",
    );
    try {
      expect(
        listPools(database).map(
          ({ options }) => options.connectionTimeoutMillis,
        ),
      ).toEqual([poolConnectionTimeoutMs, poolConnectionTimeoutMs]);
      expect(poolConnectionTimeoutMs).toBe(10_000);
    } finally {
      await Promise.all(listPools(database).map((pool) => pool.end()));
    }
  });
});
