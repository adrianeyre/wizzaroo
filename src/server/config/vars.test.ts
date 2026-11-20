import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleSecrets, loadMigrationVars, loadVars } from "./vars.js";

const repositoryDirectory = join(import.meta.dirname, "../../..");

describe("loadVars", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the database, the port, the public URL and the email platform from the environment", () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgres://wizzaroo_app@db.internal:5432/wizzaroo",
    );
    vi.stubEnv("DATABASE_OWNER_URL", undefined);
    vi.stubEnv("PORT", "8080");
    vi.stubEnv("PUBLIC_URL", "https://wizzaroo.example");
    vi.stubEnv("EMAIL_BASE_URL", "https://mail.wizzaroo.example");
    vi.stubEnv("EMAIL_API_KEY", "ek_the-email-platform-key");
    vi.stubEnv("TOTP_SECRET_KEY", "5e".repeat(32));
    vi.stubEnv("TUNNEL_PROXY_ADDRESS", "172.30.0.2");

    expect(loadVars()).toEqual({
      databaseUrl: "postgres://wizzaroo_app@db.internal:5432/wizzaroo",
      databaseOwnerUrl: undefined,
      port: 8080,
      publicUrl: new URL("https://wizzaroo.example"),
      email: {
        baseUrl: new URL("https://mail.wizzaroo.example"),
        apiKey: "ek_the-email-platform-key",
      },
      isSecondSchoolGateMet: false,
      totpSecretKey: { bytes: Buffer.from("5e".repeat(32), "hex") },
      tunnelProxyAddress: "172.30.0.2",
      isFetchingMissingVoices: false,
    });
  });

  it("fetches a missing Read it to me voice only in development (ADR 0067)", () => {
    vi.stubEnv("TUNNEL_PROXY_ADDRESS", "172.30.0.2");

    expect(loadVars().isFetchingMissingVoices).toBe(false);
    expect(loadVars({ isDevelopment: true }).isFetchingMissingVoices).toBe(
      true,
    );
  });

  it("names the one proxy CF-Connecting-IP is believed from outside development, and refuses anything but an IP address", () => {
    vi.stubEnv("TUNNEL_PROXY_ADDRESS", "fd00:30::2");
    expect(loadVars().tunnelProxyAddress).toBe("fd00:30::2");

    for (const value of ["cloudflared", "172.30.0.2/24", "172.30.0.256"]) {
      vi.stubEnv("TUNNEL_PROXY_ADDRESS", value);
      expect(() => loadVars()).toThrow(
        `TUNNEL_PROXY_ADDRESS must be cloudflared's IP address on the tunnel network, not "${value}"`,
      );
    }
  });

  it("lets development name no proxy, so CF-Connecting-IP is believed from no socket there", () => {
    vi.stubEnv("TUNNEL_PROXY_ADDRESS", "");

    expect(loadVars({ isDevelopment: true }).tunnelProxyAddress).toBeNull();
    expect(() => loadVars()).toThrow("TUNNEL_PROXY_ADDRESS must be set");
  });

  it("reads the owner's URL only where it is given, to migrate before starting, as in development", () => {
    vi.stubEnv("DATABASE_OWNER_URL", "");
    expect(loadVars().databaseOwnerUrl).toBeUndefined();

    vi.stubEnv(
      "DATABASE_OWNER_URL",
      "postgres://wizzaroo@localhost:54320/wizzaroo",
    );
    expect(loadVars().databaseOwnerUrl).toBe(
      "postgres://wizzaroo@localhost:54320/wizzaroo",
    );
  });

  it("refuses a second School until SECOND_SCHOOL_GATE_MET says the gate is met", () => {
    vi.stubEnv("SECOND_SCHOOL_GATE_MET", undefined);
    expect(loadVars().isSecondSchoolGateMet).toBe(false);

    vi.stubEnv("SECOND_SCHOOL_GATE_MET", "true");
    expect(loadVars().isSecondSchoolGateMet).toBe(true);

    vi.stubEnv("SECOND_SCHOOL_GATE_MET", "yes");
    expect(() => loadVars()).toThrow(
      'SECOND_SCHOOL_GATE_MET must be true or false, not "yes"',
    );
  });

  it("listens on port 4310 when PORT is unset or empty", () => {
    vi.stubEnv("PORT", undefined);
    expect(loadVars().port).toBe(4310);

    vi.stubEnv("PORT", "");
    expect(loadVars().port).toBe(4310);
  });

  it("reaches the email platform at an http or https URL", () => {
    vi.stubEnv("EMAIL_BASE_URL", "http://email-platform:4320");
    expect(loadVars().email.baseUrl).toEqual(
      new URL("http://email-platform:4320"),
    );

    vi.stubEnv("EMAIL_BASE_URL", "https://mail.wizzaroo.example/");
    expect(loadVars().email.baseUrl).toEqual(
      new URL("https://mail.wizzaroo.example/"),
    );
  });

  it.each([
    { value: "mail.wizzaroo.example", message: "must be a URL" },
    {
      value: "ftp://mail.wizzaroo.example",
      message: "must be an http or https URL",
    },
  ])('refuses an EMAIL_BASE_URL of "$value"', ({ value, message }) => {
    vi.stubEnv("EMAIL_BASE_URL", value);

    expect(() => loadVars()).toThrow(`EMAIL_BASE_URL ${message}`);
  });

  it.each([
    "DATABASE_URL",
    "PUBLIC_URL",
    "EMAIL_BASE_URL",
    "EMAIL_API_KEY",
    "TOTP_SECRET_KEY",
    "TUNNEL_PROXY_ADDRESS",
  ])("refuses to start without %s", (name) => {
    vi.stubEnv(name, "");

    expect(() => loadVars()).toThrow(`${name} must be set`);
  });

  it.each([
    { value: "5e".repeat(31), reason: "too short" },
    { value: "5e".repeat(33), reason: "too long" },
    { value: "the-totp-secret-key", reason: "not hexadecimal" },
    { value: "z".repeat(64), reason: "64 characters that aren't hexadecimal" },
  ])(
    "refuses to start with a TOTP_SECRET_KEY that is $reason, naming it but not its value",
    ({ value }) => {
      vi.stubEnv("TOTP_SECRET_KEY", value);

      expect(() => loadVars()).toThrow(
        "TOTP_SECRET_KEY must be 64 hexadecimal characters: 32 random bytes, as openssl rand -hex 32 prints them",
      );
    },
  );

  it.each(["http", "3000.5", "-1", "65536"])(
    'refuses to start on a PORT of "%s"',
    (value) => {
      vi.stubEnv("PORT", value);

      expect(() => loadVars()).toThrow(
        `PORT must be a port number, not "${value}"`,
      );
    },
  );

  it.each(["x", "   ", "seven77", "  short  "])(
    'refuses to start with an EMAIL_API_KEY of "%s", naming it but not its value',
    (value) => {
      vi.stubEnv("EMAIL_API_KEY", value);

      expect(() => loadVars()).toThrow(
        "EMAIL_API_KEY must be at least 8 characters, not counting spaces at either end",
      );
    },
  );

  it.each([
    { name: "DATABASE_URL", role: "wizzaroo_app" },
    { name: "DATABASE_OWNER_URL", role: "wizzaroo" },
  ])(
    "refuses to start with a password in $name of one character, of spaces or under 8 characters",
    ({ name, role }) => {
      for (const password of ["x", "%20%20%20", "seven77"]) {
        vi.stubEnv(name, `postgres://${role}:${password}@postgres/wizzaroo`);

        expect(() => loadVars()).toThrow(
          `${name}'s password must be at least 8 characters, not counting spaces at either end`,
        );
      }
    },
  );

  it("starts on a database URL with no password, which only a Postgres that trusts the connection accepts", () => {
    vi.stubEnv("DATABASE_URL", "postgres://wizzaroo_app@localhost/wizzaroo");
    vi.stubEnv("DATABASE_OWNER_URL", "postgres://wizzaroo@localhost/wizzaroo");

    expect(loadVars()).toMatchObject({
      databaseUrl: "postgres://wizzaroo_app@localhost/wizzaroo",
      databaseOwnerUrl: "postgres://wizzaroo@localhost/wizzaroo",
    });
  });

  it("knows every secret .env.example holds, at its value there", async () => {
    const example = parseEnv(
      await readFile(join(repositoryDirectory, ".env.example"), "utf8"),
    );

    expect(Object.fromEntries(exampleSecrets)).toEqual({
      EMAIL_API_KEY: example.EMAIL_API_KEY,
      TOTP_SECRET_KEY: example.TOTP_SECRET_KEY,
    });
  });

  it.each([...exampleSecrets])(
    "refuses %s at its .env.example value outside development, and accepts it in development",
    (name, exampleValue) => {
      vi.stubEnv(name, exampleValue);

      expect(() => loadVars()).toThrow(
        `${name} is .env.example's development value, which anyone can read. Set a secret of your own`,
      );
      expect(() => loadVars({ isDevelopment: true })).not.toThrow();
    },
  );

  it("refuses a PUBLIC_URL that isn't a URL", () => {
    vi.stubEnv("PUBLIC_URL", "wizzaroo.example");

    expect(() => loadVars()).toThrow(
      'PUBLIC_URL must be a URL, not "wizzaroo.example"',
    );
  });
});

describe("loadMigrationVars", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the owner's URL to migrate with and the app's, whose login it sets up", () => {
    vi.stubEnv(
      "DATABASE_OWNER_URL",
      "postgres://wizzaroo:the-owner@postgres:5432/wizzaroo",
    );
    vi.stubEnv(
      "DATABASE_URL",
      "postgres://wizzaroo_app:the-app-password@postgres:5432/wizzaroo",
    );

    expect(loadMigrationVars()).toEqual({
      databaseOwnerUrl: "postgres://wizzaroo:the-owner@postgres:5432/wizzaroo",
      databaseUrl:
        "postgres://wizzaroo_app:the-app-password@postgres:5432/wizzaroo",
    });
  });

  it.each(["DATABASE_OWNER_URL", "DATABASE_URL"])(
    "refuses to migrate with a one-character password in %s",
    (name) => {
      vi.stubEnv("DATABASE_OWNER_URL", "postgres://wizzaroo@postgres/wizzaroo");
      vi.stubEnv("DATABASE_URL", "postgres://wizzaroo_app@postgres/wizzaroo");
      vi.stubEnv(name, "postgres://someone:x@postgres/wizzaroo");

      expect(() => loadMigrationVars()).toThrow(
        `${name}'s password must be at least 8 characters, not counting spaces at either end`,
      );
    },
  );

  it.each(["DATABASE_OWNER_URL", "DATABASE_URL"])(
    "refuses to migrate without %s",
    (name) => {
      vi.stubEnv("DATABASE_OWNER_URL", "postgres://wizzaroo@postgres/wizzaroo");
      vi.stubEnv("DATABASE_URL", "postgres://wizzaroo_app@postgres/wizzaroo");
      vi.stubEnv(name, "");

      expect(() => loadMigrationVars()).toThrow(`${name} must be set`);
    },
  );
});
