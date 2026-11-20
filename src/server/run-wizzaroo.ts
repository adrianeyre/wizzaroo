import { resolve } from "node:path";
import { startAuditLogPurge } from "./audit/audit-log.js";
import {
  loadMigrationVars,
  loadVars,
  type LoadVarsOptions,
  type Vars,
} from "./config/vars.js";
import {
  listPools,
  migrateDatabase,
  openDatabase,
  refusePrivilegedLogin,
  type Database,
} from "./database.js";
import {
  buildEmailSender,
  createEmailPlatformClient,
} from "./email/send-email.js";
import { protectStoredSecondFactors } from "./auth/stored-second-factors.js";
import { buildHttpServer } from "./http-server.js";
import { OwnerSeedRefusedError } from "./owner/owner-seed.js";
import { seedOwner } from "./owner/seed-owner.js";
import { downloadVoices, streamVoiceFile } from "./voices/voice-files.js";
import {
  PenTestFixturesRefusedError,
  seedPenTestFixtures,
} from "./pen-test-fixtures/seed-pen-test-fixtures.js";
import { loadRequestRatePolicy } from "./rate-limit/request-rate-policy.js";

const migrateCommand = "migrate";
const seedOwnerCommand = "seed-owner";
const downloadVoicesCommand = "download-voices";
const seedPenTestFixturesCommand = "seed-pen-test-fixtures";

const endDatabase = async (database: Database): Promise<void> => {
  await Promise.all(listPools(database).map((pool) => pool.end()));
};

/** Production runs this in a container of its own, so the app's container never holds the owner's password. */
const migrateFromTerminal = async (): Promise<void> => {
  const { databaseUrl, databaseOwnerUrl } = loadMigrationVars();
  await migrateDatabase(databaseOwnerUrl, databaseUrl);
  process.stdout.write("Applied the schema and set up the app's roles.\n");
};

const startServer = async (vars: Vars, database: Database): Promise<void> => {
  // Before anything listens: an unset or unreadable policy stops the server rather than leaving the routes unlimited.
  const requestRatePolicy = loadRequestRatePolicy();
  const server = await buildHttpServer({
    database,
    clientDirectory: resolve("dist/client"),
    sendEmail: buildEmailSender(createEmailPlatformClient(vars.email)),
    publicUrl: vars.publicUrl,
    isSecondSchoolGateMet: vars.isSecondSchoolGateMet,
    requestRatePolicy,
    totpSecretKey: vars.totpSecretKey,
    tunnelProxyAddress: vars.tunnelProxyAddress,
    streamMissingVoiceFile: vars.isFetchingMissingVoices
      ? streamVoiceFile
      : undefined,
  });
  // Before anything listens: second factors kept from before #254 and #255 are sealed and stretched, never checked as they were.
  await protectStoredSecondFactors(database, vars.totpSecretKey, server.log);
  const stopAuditLogPurge = startAuditLogPurge(database, server.log);
  process.once("SIGTERM", () => {
    stopAuditLogPurge();
    void server.close();
  });
  await server.listen({ host: "0.0.0.0", port: vars.port });
};

const runTerminalCommand = async (
  database: Database,
  command: () => Promise<void>,
): Promise<void> => {
  try {
    await command();
  } catch (error) {
    if (
      !(error instanceof OwnerSeedRefusedError) &&
      !(error instanceof PenTestFixturesRefusedError)
    ) {
      throw error;
    }
    process.stderr.write(`${error.message}.\n`);
    process.exitCode = 1;
  } finally {
    await endDatabase(database);
  }
};

const terminalCommands = new Map<
  string,
  (vars: Vars, database: Database) => Promise<void>
>([
  [
    seedOwnerCommand,
    (_vars, database) =>
      runTerminalCommand(database, () =>
        seedOwner({ database, input: process.stdin, output: process.stdout }),
      ),
  ],
  [
    seedPenTestFixturesCommand,
    (vars, database) =>
      runTerminalCommand(database, () =>
        seedPenTestFixtures({
          database,
          isSecondSchoolGateMet: vars.isSecondSchoolGateMet,
          totpSecretKey: vars.totpSecretKey,
          input: process.stdin,
          output: process.stdout,
          moment: new Date(),
        }),
      ),
  ],
]);

/** Serves, or runs a terminal command, as the app's own login, never as the owner. */
const runAsTheApp = async (
  command: string | undefined,
  options: LoadVarsOptions,
): Promise<void> => {
  const vars = loadVars(options);
  if (vars.databaseOwnerUrl !== undefined) {
    // Development migrates on start; production's app is never given the owner's URL.
    await migrateDatabase(vars.databaseOwnerUrl, vars.databaseUrl);
  }
  const database = openDatabase(vars.databaseUrl);
  try {
    await refusePrivilegedLogin(database);
  } catch (error) {
    await endDatabase(database);
    throw error;
  }
  await (terminalCommands.get(command ?? "") ?? startServer)(vars, database);
};

/** Runs the command a terminal named, or serves when it named none. Only development's entry point passes isDevelopment. */
export const runWizzaroo = (
  command: string | undefined,
  options: LoadVarsOptions,
): Promise<void> => {
  if (command === migrateCommand) {
    return migrateFromTerminal();
  }
  // Needs no database: it only fetches Read it to me's pinned voices (ADR 0062).
  if (command === downloadVoicesCommand) {
    return downloadVoices();
  }
  return runAsTheApp(command, options);
};
