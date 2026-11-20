import { isIP } from "node:net";
import {
  isTotpSecretKeyShaped,
  parseTotpSecretKey,
  type TotpSecretKey,
} from "../auth/totp-secret-box.js";

/** Where the email platform that sends Wizzaroo's emails runs, and the API key it gave Wizzaroo (ADR 0069). */
export interface EmailPlatformVars {
  baseUrl: URL;
  apiKey: string;
}

export interface Vars {
  databaseUrl: string;
  /** Set where the app migrates its own database, as in development; production's app is never given it. */
  databaseOwnerUrl: string | undefined;
  port: number;
  publicUrl: URL;
  email: EmailPlatformVars;
  isSecondSchoolGateMet: boolean;
  /** Seals each adult's TOTP secret, so a copy of the database alone makes no codes (#254). */
  totpSecretKey: TotpSecretKey;
  /**
   * cloudflared's fixed address on Compose's `tunnel` network, the only socket whose `CF-Connecting-IP` is believed
   * (#332). Required outside development; development names none, so the header is never believed there.
   */
  tunnelProxyAddress: string | null;
  /**
   * Development only: the server fetches a Read it to me voice it hasn't got when a device first asks for it
   * (ADR 0067). Production never does; its voices come from the one-shot `voices` service.
   */
  isFetchingMissingVoices: boolean;
}

const highestPort = 65_535;

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} must be set`);
  }
  return value;
};

/** The shortest secret the server starts with, spaces at either end not counted (#306). */
export const shortestSecretLength = 8;

const refuseWeakSecret = (description: string, value: string): void => {
  if (value.trim().length < shortestSecretLength) {
    throw new Error(
      `${description} must be at least ${String(shortestSecretLength)} characters, not counting spaces at either end`,
    );
  }
};

const secret = (name: string): string => {
  const value = required(name);
  refuseWeakSecret(name, value);
  return value;
};

/**
 * Refuses a weak password inside a database URL. A URL with no password is left to Postgres, which refuses it unless it
 * trusts the connection, as only development's does.
 */
const refuseWeakDatabasePassword = (name: string, value: string): void => {
  if (!URL.canParse(value)) {
    return;
  }
  const { password } = new URL(value);
  if (password === "") {
    return;
  }
  let decoded = password;
  try {
    decoded = decodeURIComponent(password);
  } catch {
    // A password that isn't valid percent-encoding is checked as written; the database refuses it either way.
  }
  refuseWeakSecret(`${name}'s password`, decoded);
};

const databaseUrl = (name: string): string => {
  const value = required(name);
  refuseWeakDatabasePassword(name, value);
  return value;
};

/**
 * .env.example's own secrets. Anyone can read them, so the server refuses them outside development (#308). vars.test.ts
 * keeps this list in step with the file.
 */
export const exampleSecrets: ReadonlyMap<string, string> = new Map([
  ["EMAIL_API_KEY", "ek_development_key_from_the_local_email_platform"],
  [
    "TOTP_SECRET_KEY",
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  ],
]);

const refuseExampleSecrets = (): void => {
  for (const [name, exampleValue] of exampleSecrets) {
    if (process.env[name] === exampleValue) {
      throw new Error(
        `${name} is .env.example's development value, which anyone can read. Set a secret of your own`,
      );
    }
  }
};

const optional = (name: string): string | undefined => {
  const value = process.env[name];
  return value === "" ? undefined : value;
};

const flag = (name: string, fallback: boolean): boolean => {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }
  if (value !== "true" && value !== "false") {
    throw new Error(`${name} must be true or false, not "${value}"`);
  }
  return value === "true";
};

const port = (name: string, fallback: number): number => {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > highestPort) {
    throw new Error(`${name} must be a port number, not "${value}"`);
  }
  return parsed;
};

const readUrl = (name: string): URL => {
  const value = required(name);
  if (!URL.canParse(value)) {
    throw new Error(`${name} must be a URL, not "${value}"`);
  }
  return new URL(value);
};

/** The email platform's address, such as https://mail.example.com: an http or https URL. */
const readEmailBaseUrl = (name: string): URL => {
  const url = readUrl(name);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${name} must be an http or https URL, not "${url.href}"`);
  }
  return url;
};

const totpSecretKeyName = "TOTP_SECRET_KEY";

/** The key that seals TOTP secrets. Unset or malformed stops the server, so no secret is kept unsealed (#254). */
export const loadTotpSecretKey = (): TotpSecretKey => {
  const value = required(totpSecretKeyName);
  if (!isTotpSecretKeyShaped(value)) {
    throw new Error(
      `${totpSecretKeyName} must be 64 hexadecimal characters: 32 random bytes, as openssl rand -hex 32 prints them`,
    );
  }
  return parseTotpSecretKey(value);
};

const tunnelProxyAddressName = "TUNNEL_PROXY_ADDRESS";

/**
 * The one proxy the server believes `CF-Connecting-IP` from (#332). Outside development it must be set, so a server
 * can't start believing the header from every socket or from none by accident. Development may leave it unset, and
 * then believes it from no socket.
 */
export const loadTunnelProxyAddress = (
  isDevelopment: boolean,
): string | null => {
  const value = isDevelopment
    ? optional(tunnelProxyAddressName)
    : required(tunnelProxyAddressName);
  if (value === undefined) {
    return null;
  }
  if (isIP(value) === 0) {
    throw new Error(
      `${tunnelProxyAddressName} must be cloudflared's IP address on the tunnel network, not "${value}"`,
    );
  }
  return value;
};

export interface MigrationVars {
  databaseUrl: string;
  databaseOwnerUrl: string;
}

/** What the migrate command reads: the owner's URL to migrate with, and the app's, whose password its login is given. */
export const loadMigrationVars = (): MigrationVars => ({
  databaseUrl: databaseUrl("DATABASE_URL"),
  databaseOwnerUrl: databaseUrl("DATABASE_OWNER_URL"),
});

export interface LoadVarsOptions {
  /** Set only by development's entry point, src/server/development.ts, never by a variable: accepts .env.example's own secrets. */
  isDevelopment: boolean;
}

export const loadVars = (
  { isDevelopment }: LoadVarsOptions = { isDevelopment: false },
): Vars => {
  if (!isDevelopment) {
    refuseExampleSecrets();
  }
  const databaseOwnerUrl = optional("DATABASE_OWNER_URL");
  if (databaseOwnerUrl !== undefined) {
    refuseWeakDatabasePassword("DATABASE_OWNER_URL", databaseOwnerUrl);
  }
  return {
    databaseUrl: databaseUrl("DATABASE_URL"),
    databaseOwnerUrl,
    port: port("PORT", 4310),
    publicUrl: readUrl("PUBLIC_URL"),
    email: {
      baseUrl: readEmailBaseUrl("EMAIL_BASE_URL"),
      apiKey: secret("EMAIL_API_KEY"),
    },
    isSecondSchoolGateMet: flag("SECOND_SCHOOL_GATE_MET", false),
    totpSecretKey: loadTotpSecretKey(),
    tunnelProxyAddress: loadTunnelProxyAddress(isDevelopment),
    isFetchingMissingVoices: isDevelopment,
  };
};
