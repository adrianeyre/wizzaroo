import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type PooledDatabase = NodePgDatabase & { $client: Pool };

/**
 * The server's connections. A query outside any reach runs on the database itself, as `wizzaroo_server`;
 * a reach opens on `$reach`, whose login holds the reach and nothing more, so `RESET ROLE` inside it gives back no more (ADR 0027).
 */
export type Database = PooledDatabase & { $reach: PooledDatabase };

/** The role the app logs in as: no superuser, no BYPASSRLS, owning nothing, holding the reach and able to become `wizzaroo_server`. */
export const appLoginRole = "wizzaroo_app";

/** The role credential checks and staff writes run as, outside any reach, with the grants and policies the schema writes down. */
export const serverRole = "wizzaroo_server";

/** The whole database as one schema, applied once to an empty database and changed in place, with no migrations (see its header). */
export const schemaFile = resolve("src/server/schema.sql");

/** Any number, so long as it's the same everywhere: two processes applying the schema at once take turns on it. */
const schemaLockKey = 7_420_051;

const scramIterations = 4096;
const scramSaltBytes = 16;
const printableAscii = /^[\x20-\x7e]*$/;

/**
 * A SCRAM-SHA-256 verifier for a password, as Postgres stores it (RFC 5802, RFC 7677),
 * so `ALTER ROLE … PASSWORD` sends the verifier and the password itself never reaches the database's logs.
 */
export const buildScramVerifier = (
  password: string,
  salt: Buffer = randomBytes(scramSaltBytes),
): string => {
  if (!printableAscii.test(password)) {
    // SASLprep leaves printable ASCII as it is, so the verifier built here matches what every client sends.
    throw new Error(
      "The app's database password must be printable ASCII, as the generated ones are",
    );
  }
  const saltedPassword = pbkdf2Sync(
    password,
    salt,
    scramIterations,
    32,
    "sha256",
  );
  const clientKey = createHmac("sha256", saltedPassword)
    .update("Client Key")
    .digest();
  const storedKey = createHash("sha256").update(clientKey).digest();
  const serverKey = createHmac("sha256", saltedPassword)
    .update("Server Key")
    .digest();
  return `SCRAM-SHA-256$${String(scramIterations)}:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`;
};

/** Reads the app's login role and password from DATABASE_URL, refusing any role but the app's. */
export const readAppLogin = (
  databaseUrl: string,
): { password: string | undefined } => {
  const url = new URL(databaseUrl);
  const username = decodeURIComponent(url.username);
  if (username !== appLoginRole) {
    throw new Error(
      `DATABASE_URL must log in as ${appLoginRole}, the role migrate sets up for the app, not "${username}"`,
    );
  }
  const password = decodeURIComponent(url.password);
  return { password: password === "" ? undefined : password };
};

/** The roles are the cluster's, not the database's, so a restore into a new Postgres brings none: migrate makes them so every time. */
const buildRoleStatements = (appPassword: string | undefined): string[] => [
  `DO $$
BEGIN
	IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wizzaroo_reach') THEN
		CREATE ROLE "wizzaroo_reach" NOLOGIN;
	END IF;
	IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${serverRole}') THEN
		CREATE ROLE "${serverRole}" NOLOGIN;
	END IF;
	IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${appLoginRole}') THEN
		CREATE ROLE "${appLoginRole}" NOLOGIN;
	END IF;
END
$$`,
  `ALTER ROLE "wizzaroo_reach" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
  `ALTER ROLE "${serverRole}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`,
  `ALTER ROLE "${appLoginRole}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD ${
    appPassword === undefined ? "NULL" : `'${buildScramVerifier(appPassword)}'`
  }`,
  // Logged in, the app holds the reach's grants and policies and nothing else, so RESET ROLE inside a reach keeps it to the reach.
  `GRANT "wizzaroo_reach" TO "${appLoginRole}" WITH INHERIT TRUE, SET TRUE`,
  // It can become wizzaroo_server for the queries run outside any reach, but holds none of its grants until it does.
  `GRANT "${serverRole}" TO "${appLoginRole}" WITH INHERIT FALSE, SET TRUE`,
];

/** Opens one pool as whoever the URL logs in as: the owner, in the migrate command and the tests' set-up. */
export const openOwnerDatabase = (ownerUrl: string): Database => {
  const ownerDatabase = drizzle({
    client: new Pool({ connectionString: ownerUrl }),
  });
  return Object.assign(ownerDatabase, { $reach: ownerDatabase });
};

/**
 * Applies schema.sql in one transaction, unless the database already has tables, as one made earlier or restored from
 * a backup does. There are no migrations: a changed schema means a new database (docs/guide/development.md).
 */
export const applySchema = async (ownerDatabase: Database): Promise<void> => {
  const schema = await readFile(schemaFile, "utf8");
  const client = await ownerDatabase.$client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [schemaLockKey]);
    const {
      rows: [{ hasTables }],
    } = await client.query<{ hasTables: boolean }>(
      `SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public') AS "hasTables"`,
    );
    if (!hasTables) {
      await client.query(schema);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/** Applies the schema as the tables' owner. The server never serves on this: its reach would run on the owner's session. */
export const openDatabaseWithSchema = async (
  ownerUrl: string,
): Promise<Database> => {
  const ownerDatabase = openOwnerDatabase(ownerUrl);
  await applySchema(ownerDatabase);
  return ownerDatabase;
};

/** Applies the schema as the owner, then makes the app's roles and gives its login the password in DATABASE_URL. */
export const migrateDatabase = async (
  ownerUrl: string,
  databaseUrl: string,
): Promise<void> => {
  const { password } = readAppLogin(databaseUrl);
  const ownerDatabase = await openDatabaseWithSchema(ownerUrl);
  try {
    for (const statement of buildRoleStatements(password)) {
      await ownerDatabase.execute(sql.raw(statement));
    }
  } finally {
    await ownerDatabase.$client.end();
  }
};

/**
 * How long a query waits for one of a pool's connections before it fails, in milliseconds (#329). node-postgres waits
 * for ever by default, so a pool held by something slow stopped every query behind it, /health included.
 */
export const poolConnectionTimeoutMs = 10_000;

/** Opens the server's two pools as the app's login: one that becomes wizzaroo_server from its first statement, and one for reaches. */
export const openDatabase = (databaseUrl: string): Database => {
  const serverDatabase = drizzle({
    client: new Pool({
      connectionString: databaseUrl,
      // Set at log-in, so RESET ROLE on this pool gives back wizzaroo_server, never more.
      options: `-c role=${serverRole}`,
      connectionTimeoutMillis: poolConnectionTimeoutMs,
    }),
  });
  const reachDatabase = drizzle({
    client: new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: poolConnectionTimeoutMs,
    }),
  });
  return Object.assign(serverDatabase, { $reach: reachDatabase });
};

export const listPools = (database: Database): Pool[] =>
  database.$reach.$client === database.$client
    ? [database.$client]
    : [database.$client, database.$reach.$client];

export interface LoginPrivileges {
  loginRole: string;
  isSuperuser: boolean;
  bypassesRowLevelSecurity: boolean;
  ownsATable: boolean;
}

/** Why the server won't serve on a login, or undefined when it may: a superuser, a BYPASSRLS role or the tables' owner would undo row-level security. */
export const findPrivilegedLoginRefusal = ({
  loginRole,
  isSuperuser,
  bypassesRowLevelSecurity,
  ownsATable,
}: LoginPrivileges): string | undefined => {
  const privileges = [
    ...(isSuperuser ? ["a superuser"] : []),
    ...(bypassesRowLevelSecurity ? ["exempt from row-level security"] : []),
    ...(ownsATable ? ["the owner of the tables"] : []),
  ];
  if (privileges.length === 0) {
    return undefined;
  }
  return `DATABASE_URL logs in as "${loginRole}", which is or can become ${privileges.join(", ")}. Log the app in as ${appLoginRole}, which migrate sets up, and keep the owner's URL in DATABASE_OWNER_URL`;
};

/** Refuses to serve on a login that is, or can become, a superuser, a BYPASSRLS role or the owner of a table in public. */
export const refusePrivilegedLogin = async (
  database: Database,
): Promise<void> => {
  const { rows } = await database.$reach.execute<{
    loginRole: string;
    isSuperuser: boolean | null;
    bypassesRowLevelSecurity: boolean | null;
    ownsATable: boolean | null;
  }>(
    sql`select session_user as "loginRole",
          bool_or(r.rolsuper) as "isSuperuser",
          bool_or(r.rolbypassrls) as "bypassesRowLevelSecurity",
          bool_or(exists (
            select from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relowner = r.oid
          )) as "ownsATable"
        from pg_roles r
        where pg_has_role(session_user, r.oid, 'MEMBER')`,
  );
  const [privileges] = rows;
  const refusal = findPrivilegedLoginRefusal({
    loginRole: privileges.loginRole,
    isSuperuser: privileges.isSuperuser === true,
    bypassesRowLevelSecurity: privileges.bypassesRowLevelSecurity === true,
    ownsATable: privileges.ownsATable === true,
  });
  if (refusal !== undefined) {
    throw new Error(refusal);
  }
};
