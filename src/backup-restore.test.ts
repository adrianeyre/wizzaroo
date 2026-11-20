import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable, Writable } from "node:stream";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  GenericContainer,
  getContainerRuntimeClient,
  Network,
  type StartedNetwork,
  type StartedTestContainer,
} from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashSecretToken } from "./server/auth/secret-token.js";
import { signInCookieName } from "./server/auth/signed-in-parent.js";
import {
  appLoginRole,
  migrateDatabase,
  openDatabase,
  openDatabaseWithSchema,
} from "./server/database.js";
import { buildHttpServer } from "./server/http-server.js";
import {
  buildPenTestFixturePlan,
  penTestFixtureIds,
} from "./server/pen-test-fixtures/fixture-plan.js";
import { seedPenTestFixtures } from "./server/pen-test-fixtures/seed-pen-test-fixtures.js";
import {
  auditLogEntries,
  characters,
  children,
  confirmedDeletions,
  deletionRequests,
  families,
  schools,
  signIns,
  users,
} from "./server/schema.js";

const postgresImage = "postgres:18-alpine";
const containersStartTimeoutMs = 300_000;
const remote = "/tmp/backups";
const offsiteRemote = "/tmp/offsite-backups";
const identityFile = "/tmp/backup-identity.txt";
const deletionsDirectory = "wizzaroo-deletions";
const keptNights = 2;
const olderBackups = [
  "wizzaroo-2026-01-01T020000Z.dump.age",
  "wizzaroo-2026-01-02T020000Z.dump.age",
  "wizzaroo-2026-01-03T020000Z.dump.age",
];

const hasContainerRuntime = await getContainerRuntimeClient().then(
  () => true,
  () => false,
);

if (!hasContainerRuntime) {
  console.warn(
    "SKIPPED src/backup-restore.test.ts: no container runtime, so no backup was taken or restored",
  );
}

const buildPostgresEnvironment = (
  container: StartedPostgreSqlContainer,
  host: string,
): Record<string, string> => ({
  PGHOST: host,
  PGUSER: container.getUsername(),
  PGPASSWORD: container.getPassword(),
  PGDATABASE: container.getDatabase(),
});

const backupRole = "wizzaroo_backup";
// The folders these tests send to delete whatever they hold, as no locked bucket would, so they turn the off-site
// check off by name, as the pen-test deployment does. The I4 block turns it back on (#317).
const offsiteLockCheckOff = { BACKUP_OFFSITE_LOCK_CHECK: "off-for-a-stand-in" };
const backupRolePassword = randomBytes(24).toString("hex");

describe.skipIf(!hasContainerRuntime)("the nightly backup", () => {
  let network: StartedNetwork;
  let source: StartedPostgreSqlContainer;
  let target: StartedPostgreSqlContainer;
  let backup: StartedTestContainer;
  let ageRecipient: string;

  const listBackupsOn = async (backupsRemote: string): Promise<string[]> => {
    const listing = await backup.exec(["ls", "-1", backupsRemote]);
    return listing.stdout.split("\n").filter((name) => name !== "");
  };

  const setUpBackupRole = (environment: Record<string, string> = {}) =>
    backup.exec(["backup-role.sh"], {
      env: {
        ...buildPostgresEnvironment(source, "source"),
        BACKUP_PGPASSWORD: backupRolePassword,
        ...environment,
      },
    });

  const runBackup = (environment: Record<string, string> = {}) =>
    backup.exec(["backup.sh"], {
      env: {
        ...buildPostgresEnvironment(source, "source"),
        PGUSER: backupRole,
        PGPASSWORD: backupRolePassword,
        BACKUP_AGE_RECIPIENT: ageRecipient,
        BACKUP_RCLONE_REMOTE: remote,
        BACKUP_RCLONE_OFFSITE_REMOTE: offsiteRemote,
        BACKUP_KEEP_NIGHTS: String(keptNights),
        ...offsiteLockCheckOff,
        ...environment,
      },
    });

  beforeAll(async () => {
    network = await new Network().start();
    const [startedSource, startedTarget, backupImage] = await Promise.all([
      new PostgreSqlContainer(postgresImage)
        .withNetwork(network)
        .withNetworkAliases("source")
        .start(),
      new PostgreSqlContainer(postgresImage)
        .withNetwork(network)
        .withNetworkAliases("target")
        .start(),
      GenericContainer.fromDockerfile(resolve("backup")).build(),
    ]);
    source = startedSource;
    target = startedTarget;
    backup = await backupImage
      .withNetwork(network)
      .withCommand(["sleep", "infinity"])
      .start();

    const database = await openDatabaseWithSchema(source.getConnectionUri());
    const [{ familyId }] = await database
      .insert(families)
      .values({ name: "The Backed-up Family" })
      .returning({ familyId: families.id });
    const [{ schoolId }] = await database
      .insert(schools)
      .values({ name: "The Backed-up School", town: "Safeharbour" })
      .returning({ schoolId: schools.id });
    const [{ childId }] = await database
      .insert(children)
      .values({
        familyId,
        schoolId,
        nickname: "Kept Safe",
        birthMonth: 3,
        birthYear: 2019,
        picturePasswordHash: "a-picture-password-hash",
      })
      .returning({ childId: children.id });
    await database.insert(characters).values({ childId, name: "Lifeboat" });
    await database.$client.end();
    const backupRoleSetUp = await setUpBackupRole();
    if (backupRoleSetUp.exitCode !== 0) {
      throw new Error(
        `backup-role.sh exited ${String(backupRoleSetUp.exitCode)}: ${backupRoleSetUp.output}`,
      );
    }

    await backup.exec(["age-keygen", "-o", identityFile]);
    ageRecipient = (
      await backup.exec(["age-keygen", "-y", identityFile])
    ).stdout.trim();
    for (const backupsRemote of [remote, offsiteRemote]) {
      await backup.exec([
        "sh",
        "-c",
        `mkdir -p ${backupsRemote} && cd ${backupsRemote} && touch ${olderBackups.join(" ")}`,
      ]);
    }
  }, containersStartTimeoutMs);

  afterAll(async () => {
    await Promise.all([backup.stop(), source.stop(), target.stop()]);
    await network.stop();
  });

  it("sends an encrypted dump to both targets and keeps only the set number of nights on the pruned one", async () => {
    const run = await runBackup();
    const remoteBackups = await listBackupsOn(remote);
    const offsiteBackups = await listBackupsOn(offsiteRemote);
    const newBackup = remoteBackups.find(
      (name) => !olderBackups.includes(name),
    );
    const header = await backup.exec([
      "head",
      "-c",
      "21",
      `${remote}/${String(newBackup)}`,
    ]);

    expect(run.exitCode, run.stderr).toBe(0);
    expect(remoteBackups).toHaveLength(keptNights);
    expect(remoteBackups).toContain("wizzaroo-2026-01-03T020000Z.dump.age");
    expect(newBackup).toMatch(/^wizzaroo-\d{4}-\d{2}-\d{2}T\d{6}Z\.dump\.age$/);
    expect(header.stdout).toBe("age-encryption.org/v1");
    expect(offsiteBackups).toEqual([...olderBackups, newBackup]);
  });

  it("restores the latest backup into an empty database, data, policies and all", async () => {
    const restore = await backup.exec(["restore.sh", "latest"], {
      env: {
        ...buildPostgresEnvironment(target, "target"),
        BACKUP_AGE_IDENTITY_FILE: identityFile,
        BACKUP_RCLONE_REMOTE: remote,
      },
    });
    const restored = drizzle({
      connection: { connectionString: target.getConnectionUri() },
    });
    const restoredChildren = await restored
      .select({ nickname: children.nickname, characterName: characters.name })
      .from(children)
      .innerJoin(characters, eq(characters.childId, children.id));
    const policies = await restored.execute<{ policyCount: number }>(
      sql`select count(*)::integer as "policyCount" from pg_policies where tablename = 'children'`,
    );
    await restored.$client.end();

    expect(restore.exitCode, restore.stderr).toBe(0);
    expect(restoredChildren).toEqual([
      { nickname: "Kept Safe", characterName: "Lifeboat" },
    ]);
    // The reach's own, a Teacher's read, the server role's written-down one, and the one holding DELETE to
    // the Admin (#281).
    expect(policies.rows).toEqual([{ policyCount: 4 }]);
  });

  it("sets the backup's role up again on every start, still a reader that can't write, and still taking a backup", async () => {
    const setUpAgain = await setUpBackupRole();
    const write = await backup.exec(
      [
        "psql",
        "--no-psqlrc",
        "--command",
        "insert into families (name) values ('Written by the backup')",
      ],
      {
        env: {
          ...buildPostgresEnvironment(source, "source"),
          PGUSER: backupRole,
          PGPASSWORD: backupRolePassword,
        },
      },
    );
    const run = await runBackup({
      BACKUP_RCLONE_REMOTE: "/tmp/after-setting-the-role-up-again",
      BACKUP_RCLONE_OFFSITE_REMOTE:
        "/tmp/offsite-after-setting-the-role-up-again",
    });

    expect(setUpAgain.exitCode, setUpAgain.output).toBe(0);
    expect(setUpAgain.stdout).toContain(
      "backup.role.finished role=wizzaroo_backup",
    );
    expect(write.exitCode).not.toBe(0);
    expect(write.stderr).toContain("permission denied for table families");
    expect(run.exitCode, run.stderr).toBe(0);
  });

  it("refuses to set up the backup's role without a password of its own", async () => {
    const withoutOne = await setUpBackupRole({ BACKUP_PGPASSWORD: "" });
    const withTheSuperusers = await setUpBackupRole({
      BACKUP_PGPASSWORD: source.getPassword(),
    });

    expect(withoutOne.exitCode).not.toBe(0);
    expect(withoutOne.stderr).toContain("set BACKUP_PGPASSWORD");
    expect(withTheSuperusers.exitCode).not.toBe(0);
    expect(withTheSuperusers.stderr).toContain(
      "backup.role.failed reason=superuser-password",
    );
  });

  it("refuses to take a backup with the superuser's password under the backup's role", async () => {
    const run = await runBackup({ PGPASSWORD: source.getPassword() });

    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain("password authentication failed");
  });

  it("fails loudly when the pruned target is unreachable, and still sends the dump off-site", async () => {
    const offsiteWhileNasIsDown = "/tmp/offsite-while-nas-is-down";
    const run = await runBackup({
      BACKUP_RCLONE_REMOTE: "unreachable-nas:wizzaroo",
      BACKUP_RCLONE_OFFSITE_REMOTE: offsiteWhileNasIsDown,
    });

    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain(
      "backup.upload.failed remote=unreachable-nas:wizzaroo",
    );
    expect(await listBackupsOn(offsiteWhileNasIsDown)).toHaveLength(1);
  });

  it("fails loudly when the off-site target is unreachable, and still sends and prunes on the NAS", async () => {
    const nasWhileOffsiteIsDown = "/tmp/nas-while-offsite-is-down";
    await backup.exec([
      "sh",
      "-c",
      `mkdir -p ${nasWhileOffsiteIsDown} && cd ${nasWhileOffsiteIsDown} && touch ${olderBackups.join(" ")}`,
    ]);
    const run = await runBackup({
      BACKUP_RCLONE_REMOTE: nasWhileOffsiteIsDown,
      BACKUP_RCLONE_OFFSITE_REMOTE: "unreachable-offsite:wizzaroo",
    });

    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain(
      "backup.upload.failed remote=unreachable-offsite:wizzaroo",
    );
    expect(await listBackupsOn(nasWhileOffsiteIsDown)).toHaveLength(keptNights);
  });

  it("refuses to run without somewhere to send the backups", async () => {
    const run = await runBackup({ BACKUP_RCLONE_REMOTE: "" });

    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain("set BACKUP_RCLONE_REMOTE");
  });

  it("refuses to run without an off-site target", async () => {
    const run = await runBackup({ BACKUP_RCLONE_OFFSITE_REMOTE: "" });

    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain("set BACKUP_RCLONE_OFFSITE_REMOTE");
  });

  describe("pen test D3: a deleted Family and the nightly backups", () => {
    const d3DatabaseName = "pen_test_d3";
    const d3Seed = "d3d3".repeat(16);
    const d3Moment = new Date();
    const nasStandIn = "/tmp/d3-nas-stand-in";
    const offsiteBucketStandIn = "/tmp/d3-offsite-bucket-stand-in";
    const productionKeptNights = 30;
    const restoreTimeoutMs = 120_000;
    const millisecondsPerDay = 86_400_000;
    const ids = penTestFixtureIds;
    const familyBParentIds =
      buildPenTestFixturePlan(d3Moment).families.find(
        ({ id }) => id === ids.familyB,
      )?.parentIds ?? [];
    const lastNightsBackup = `wizzaroo-${new Date(d3Moment.getTime() - millisecondsPerDay).toISOString().slice(0, 10)}T020000Z.dump.age`;
    let afterDeletionBackup: string;
    let restoredDatabaseCount = 0;

    const listDumpsOn = async (backupsRemote: string): Promise<string[]> =>
      (await listBackupsOn(backupsRemote)).filter((name) =>
        name.endsWith(".dump.age"),
      );

    const listDeletionsOn = async (
      backupsRemote: string,
    ): Promise<string[]> => {
      const listing = await backup.exec([
        "ls",
        "-1",
        `${backupsRemote}/${deletionsDirectory}`,
      ]);
      return listing.stdout.split("\n").filter((name) => name !== "");
    };

    const buildD3SourceUrl = (): string => {
      const sourceUrl = new URL(source.getConnectionUri());
      sourceUrl.pathname = `/${d3DatabaseName}`;
      return sourceUrl.href;
    };

    const d3SourceEnvironment = (): Record<string, string> => ({
      ...buildPostgresEnvironment(source, "source"),
      PGDATABASE: d3DatabaseName,
    });

    const familyBDeletions = [
      `family-${ids.familyB}`,
      `child-${ids.childBYear3}`,
      ...familyBParentIds.map((id) => `user-${id}`),
    ].toSorted();

    const runD3Backup = () =>
      runBackup({
        PGDATABASE: d3DatabaseName,
        BACKUP_RCLONE_REMOTE: nasStandIn,
        BACKUP_RCLONE_OFFSITE_REMOTE: offsiteBucketStandIn,
        BACKUP_KEEP_NIGHTS: String(productionKeptNights),
      });

    const assertExecSucceeded = (
      step: string,
      { exitCode, stderr }: { exitCode: number; stderr: string },
    ): void => {
      if (exitCode !== 0) {
        throw new Error(`${step} exited ${String(exitCode)}: ${stderr}`);
      }
    };

    const backUpThenDeleteFamilyB = async (): Promise<number> => {
      const sourceUrl = new URL(buildD3SourceUrl());
      const appUrl = new URL(sourceUrl);
      appUrl.username = appLoginRole;
      appUrl.password = "the-backup-probes-app-database-password";
      await migrateDatabase(sourceUrl.href, appUrl.href);
      const d3Database = openDatabase(appUrl.href);
      const clientDirectory = await mkdtemp(join(tmpdir(), "wizzaroo-d3-"));
      const d3Server = await buildHttpServer({
        database: d3Database,
        clientDirectory,
        sendEmail: () => Promise.resolve(),
        publicUrl: new URL("https://wizzaroo.example"),
        isSecondSchoolGateMet: true,
      });
      try {
        await seedPenTestFixtures({
          database: d3Database,
          isSecondSchoolGateMet: true,
          input: Readable.from([`${d3Seed}\n`]),
          output: new Writable({
            write: (_chunk, _encoding, callback) => {
              callback();
            },
          }),
          moment: d3Moment,
        });
        assertExecSucceeded(
          "the backup before the deletion",
          await runD3Backup(),
        );
        assertExecSucceeded(
          "naming that backup last night's",
          await backup.exec([
            "sh",
            "-c",
            `mv ${nasStandIn}/wizzaroo-*.dump.age ${nasStandIn}/${lastNightsBackup} && mv ${offsiteBucketStandIn}/wizzaroo-*.dump.age ${offsiteBucketStandIn}/${lastNightsBackup}`,
          ]),
        );
        const adminToken = randomBytes(32).toString("base64url");
        await d3Database.insert(signIns).values({
          tokenHash: hashSecretToken(adminToken),
          userId: ids.admin,
          expiresAt: sql`now() + interval '1 hour'`,
          isTwoStep: true,
        });
        const confirmed = await d3Server.inject({
          method: "POST",
          url: `/api/admin/deletion-requests/${ids.deletionRequestFamilyB}/confirmation`,
          cookies: { [signInCookieName]: adminToken },
        });
        return confirmed.statusCode;
      } finally {
        await d3Server.close();
        await rm(clientDirectory, { recursive: true });
      }
    };

    const restoreD3Backup = async (backupsRemote: string, name: string) => {
      restoredDatabaseCount += 1;
      const restoredDatabaseName = `d3_restored_${String(restoredDatabaseCount)}`;
      const targetEnvironment = buildPostgresEnvironment(target, "target");
      assertExecSucceeded(
        "creating an empty database",
        await backup.exec(["createdb", restoredDatabaseName], {
          env: targetEnvironment,
        }),
      );
      const restore = await backup.exec(["restore.sh", name], {
        env: {
          ...targetEnvironment,
          PGDATABASE: restoredDatabaseName,
          BACKUP_AGE_IDENTITY_FILE: identityFile,
          BACKUP_RCLONE_REMOTE: backupsRemote,
        },
      });
      assertExecSucceeded(`restoring ${name} from ${backupsRemote}`, restore);
      const restoredUrl = new URL(target.getConnectionUri());
      restoredUrl.pathname = `/${restoredDatabaseName}`;
      const restored = drizzle({
        connection: { connectionString: restoredUrl.href },
      });
      try {
        const familyIds = (
          await restored.select({ id: families.id }).from(families)
        ).map(({ id }) => id);
        const familyBChildIds = (
          await restored
            .select({ id: children.id })
            .from(children)
            .where(eq(children.familyId, ids.familyB))
        ).map(({ id }) => id);
        const familyBParentsWithPasswords = (
          await restored
            .select({ id: users.id, passwordHash: users.passwordHash })
            .from(users)
        )
          .filter(
            ({ id, passwordHash }) =>
              familyBParentIds.includes(id) && passwordHash !== null,
          )
          .map(({ id }) => id);
        const familyBDeletionRequestIds = (
          await restored
            .select({ id: deletionRequests.id })
            .from(deletionRequests)
            .where(eq(deletionRequests.familyId, ids.familyB))
        ).map(({ id }) => id);
        const restoredDeletions = (
          await restored
            .select({
              targetType: confirmedDeletions.targetType,
              targetId: confirmedDeletions.targetId,
            })
            .from(confirmedDeletions)
        )
          .map(({ targetType, targetId }) => `${targetType}-${targetId}`)
          .toSorted();
        const familyBDeletionEntries = await restored
          .select({ id: auditLogEntries.id })
          .from(auditLogEntries)
          .where(
            and(
              eq(auditLogEntries.action, "family.deleted"),
              eq(auditLogEntries.targetId, ids.familyB),
            ),
          );
        return {
          hasFamilyA1: familyIds.includes(ids.familyA1),
          hasFamilyB: familyIds.includes(ids.familyB),
          familyBChildIds,
          familyBParentsWithPasswords,
          familyBDeletionRequestIds,
          familyBDeletionEntryCount: familyBDeletionEntries.length,
          restoredDeletions,
          restoreOutput: restore.stdout,
        };
      } finally {
        await restored.$client.end();
      }
    };

    beforeAll(async () => {
      const sourceDatabase = drizzle({
        connection: { connectionString: source.getConnectionUri() },
      });
      await sourceDatabase.execute(
        sql.raw(`create database ${d3DatabaseName}`),
      );
      await sourceDatabase.$client.end();
      await backup.exec(["mkdir", "-p", nasStandIn, offsiteBucketStandIn]);

      const confirmedStatus = await backUpThenDeleteFamilyB();
      if (confirmedStatus !== 204) {
        throw new Error(
          `the Admin's confirmation of Family B's deletion answered ${String(confirmedStatus)}`,
        );
      }
      assertExecSucceeded("the backup after the deletion", await runD3Backup());
      const nasBackups = await listDumpsOn(nasStandIn);
      const newBackup = nasBackups.find((name) => name !== lastNightsBackup);
      if (newBackup === undefined) {
        throw new Error("the backup after the deletion reached no target");
      }
      afterDeletionBackup = newBackup;
    }, containersStartTimeoutMs);

    it("keeps the backup taken before Family B's deletion on the NAS stand-in, which prunes only past BACKUP_KEEP_NIGHTS, and on the bucket stand-in, which it never prunes", async () => {
      expect(await listDumpsOn(nasStandIn)).toEqual([
        lastNightsBackup,
        afterDeletionBackup,
      ]);
      expect(await listDumpsOn(offsiteBucketStandIn)).toEqual([
        lastNightsBackup,
        afterDeletionBackup,
      ]);
    });

    it("sends Family B's confirmed deletion to both stand-ins by id alone, one file for the Family, Eli and each of its Parents, holding only when", async () => {
      for (const backupsRemote of [nasStandIn, offsiteBucketStandIn]) {
        const sent = await listDeletionsOn(backupsRemote);
        const familyBFile = await backup.exec([
          "cat",
          `${backupsRemote}/${deletionsDirectory}/family-${ids.familyB}`,
        ]);

        expect(sent, backupsRemote).toEqual(familyBDeletions);
        expect(familyBFile.stdout, backupsRemote).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\n$/,
        );
      }
    });

    it(
      "leaves Family B out of a restore of the backup taken after its deletion, from either stand-in",
      async () => {
        for (const backupsRemote of [nasStandIn, offsiteBucketStandIn]) {
          const restored = await restoreD3Backup(backupsRemote, "latest");

          expect(restored.hasFamilyA1, backupsRemote).toBe(true);
          expect(restored.hasFamilyB, backupsRemote).toBe(false);
          expect(restored.familyBChildIds, backupsRemote).toEqual([]);
          expect(restored.familyBParentsWithPasswords, backupsRemote).toEqual(
            [],
          );
        }
      },
      restoreTimeoutMs,
    );

    it(
      "keeps Family B out of a restore of the backup taken before its deletion, from either stand-in: no Eli, no parentB account or password and no deletion request waiting again, with the ids it was deleted by restored to say so (regression)",
      async () => {
        for (const backupsRemote of [nasStandIn, offsiteBucketStandIn]) {
          const restored = await restoreD3Backup(
            backupsRemote,
            lastNightsBackup,
          );

          expect(restored.hasFamilyA1, backupsRemote).toBe(true);
          expect(restored.hasFamilyB, backupsRemote).toBe(false);
          expect(restored.familyBChildIds, backupsRemote).toEqual([]);
          expect(restored.familyBParentsWithPasswords, backupsRemote).toEqual(
            [],
          );
          expect(restored.familyBDeletionRequestIds, backupsRemote).toEqual([]);
          expect(restored.restoredDeletions, backupsRemote).toEqual(
            familyBDeletions,
          );
          expect(restored.restoreOutput, backupsRemote).toContain(
            `backup.restore.deletions.applied sent=${String(familyBDeletions.length)} recorded=${String(familyBDeletions.length)} remaining=0`,
          );
        }
      },
      restoreTimeoutMs,
    );

    it(
      "keeps Family B out of a restore of any backup once the Admin has confirmed its deletion",
      async () => {
        for (const backupsRemote of [nasStandIn, offsiteBucketStandIn]) {
          const restored = await restoreD3Backup(
            backupsRemote,
            lastNightsBackup,
          );

          expect(restored.hasFamilyB, backupsRemote).toBe(false);
          expect(restored.familyBChildIds, backupsRemote).toEqual([]);
          expect(restored.familyBParentsWithPasswords, backupsRemote).toEqual(
            [],
          );
        }
      },
      restoreTimeoutMs,
    );

    it(
      "keeps Family B out of a restore of last night's backup when the deletion was sent on its own, before any later backup, as the backup container does within a minute of it",
      async () => {
        const nasBeforeTheNight = "/tmp/d3-nas-before-the-night";
        const bucketBeforeTheNight = "/tmp/d3-bucket-before-the-night";
        assertExecSucceeded(
          "keeping only last night's backup",
          await backup.exec([
            "sh",
            "-c",
            `mkdir -p ${nasBeforeTheNight} ${bucketBeforeTheNight} && cp ${nasStandIn}/${lastNightsBackup} ${nasBeforeTheNight}/ && cp ${offsiteBucketStandIn}/${lastNightsBackup} ${bucketBeforeTheNight}/`,
          ]),
        );
        const sent = await backup.exec(["send-deletions.sh"], {
          env: {
            ...d3SourceEnvironment(),
            BACKUP_RCLONE_REMOTE: nasBeforeTheNight,
            BACKUP_RCLONE_OFFSITE_REMOTE: bucketBeforeTheNight,
          },
        });
        assertExecSucceeded("sending the deletions", sent);

        expect(await listDumpsOn(nasBeforeTheNight)).toEqual([
          lastNightsBackup,
        ]);
        for (const backupsRemote of [nasBeforeTheNight, bucketBeforeTheNight]) {
          const restored = await restoreD3Backup(backupsRemote, "latest");

          expect(restored.hasFamilyA1, backupsRemote).toBe(true);
          expect(restored.hasFamilyB, backupsRemote).toBe(false);
          expect(restored.familyBChildIds, backupsRemote).toEqual([]);
          expect(restored.familyBParentsWithPasswords, backupsRemote).toEqual(
            [],
          );
        }
      },
      restoreTimeoutMs,
    );

    it(
      "sends a deletion confirmed after the night's backup to both targets within the check interval, without waiting for the next night",
      async () => {
        const watchedNas = "/tmp/d3-watched-nas";
        const watchedBucket = "/tmp/d3-watched-bucket";
        const nightlyLog = "/tmp/d3-nightly.log";
        const healthMarker = "/tmp/backup-succeeded";
        const awayFromNow = (new Date().getUTCHours() + 12) % 24;
        const deletedId = randomUUID();
        const waitFor = async (
          step: string,
          isDone: () => Promise<boolean>,
        ): Promise<void> => {
          for (let attempt = 0; attempt < 60; attempt += 1) {
            if (await isDone()) {
              return;
            }
            await new Promise((resolveWait) => setTimeout(resolveWait, 1_000));
          }
          const log = await backup.exec(["cat", nightlyLog]);
          throw new Error(`${step} never happened: ${log.stdout}`);
        };
        assertExecSucceeded(
          "making the watched stand-ins",
          await backup.exec(["mkdir", "-p", watchedNas, watchedBucket]),
        );
        const started = await backup.exec(
          [
            "sh",
            "-c",
            `rm -f ${healthMarker}; timeout 150 nightly.sh >${nightlyLog} 2>&1 & echo $!`,
          ],
          {
            env: {
              ...d3SourceEnvironment(),
              BACKUP_AGE_RECIPIENT: ageRecipient,
              BACKUP_RCLONE_REMOTE: watchedNas,
              BACKUP_RCLONE_OFFSITE_REMOTE: watchedBucket,
              BACKUP_KEEP_NIGHTS: String(productionKeptNights),
              BACKUP_HOUR_UTC: String(awayFromNow),
              BACKUP_DELETIONS_CHECK_SECONDS: "1",
              ...offsiteLockCheckOff,
            },
          },
        );
        assertExecSucceeded("starting nightly.sh", started);
        try {
          await waitFor(
            "the backup nightly.sh takes when it starts",
            async () =>
              (await backup.exec(["test", "-e", healthMarker])).exitCode === 0,
          );
          const dumpsBefore = await listDumpsOn(watchedNas);
          const d3Source = drizzle({
            connection: { connectionString: buildD3SourceUrl() },
          });
          try {
            await d3Source
              .insert(confirmedDeletions)
              .values({ targetType: "child", targetId: deletedId });
          } finally {
            await d3Source.$client.end();
          }
          await waitFor("sending the new deletion to both targets", async () =>
            (
              await Promise.all(
                [watchedNas, watchedBucket].map(listDeletionsOn),
              )
            ).every((sent) => sent.includes(`child-${deletedId}`)),
          );

          expect(await listDeletionsOn(watchedNas)).toEqual(
            [...familyBDeletions, `child-${deletedId}`].toSorted(),
          );
          expect(await listDumpsOn(watchedNas)).toEqual(dumpsBefore);
          expect(
            (await backup.exec(["test", "-e", healthMarker])).exitCode,
          ).toBe(0);
        } finally {
          await backup.exec(["kill", started.stdout.trim()]);
        }
      },
      restoreTimeoutMs,
    );
  });

  describe("pen test I4: the off-site key and Object Lock, against the throwaway bucket", () => {
    const bucketStandInAlias = "i4-offsite-bucket-stand-in";
    const bucketStandInPort = 8080;
    const bucketStandInDirectory = "/tmp/i4-offsite-bucket-stand-in";
    const bucketName = "wizzaroo-backups-i4";
    const bucketRemote = `offsite:${bucketName}`;
    const nasStandIn = "/tmp/i4-nas-stand-in";
    const bucketAccessKeyId = randomBytes(12).toString("hex");
    const bucketSecretAccessKey = randomBytes(24).toString("hex");
    const bucketRemoteEnvironment = {
      RCLONE_CONFIG: "/dev/null",
      RCLONE_CONFIG_OFFSITE_TYPE: "s3",
      RCLONE_CONFIG_OFFSITE_PROVIDER: "Rclone",
      RCLONE_CONFIG_OFFSITE_ENDPOINT: `http://${bucketStandInAlias}:${String(bucketStandInPort)}`,
      RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID: bucketAccessKeyId,
      RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY: bucketSecretAccessKey,
      RCLONE_CONFIG_OFFSITE_USE_MULTIPART_UPLOADS: "false",
    };
    let bucketStandIn: StartedTestContainer;

    const listBucketFiles = async (): Promise<string[]> => {
      const listing = await backup.exec(
        ["rclone", "lsf", "--files-only", bucketRemote],
        { env: bucketRemoteEnvironment },
      );
      return listing.stdout.split("\n").filter((name) => name !== "");
    };

    // With the off-site check on, as it is in production, where nothing sets BACKUP_OFFSITE_LOCK_CHECK.
    const runBackupToTheBucketStandIn = () =>
      runBackup({
        ...bucketRemoteEnvironment,
        BACKUP_RCLONE_REMOTE: nasStandIn,
        BACKUP_RCLONE_OFFSITE_REMOTE: bucketRemote,
        BACKUP_OFFSITE_LOCK_CHECK: "",
      });

    beforeAll(async () => {
      const backupImage = await GenericContainer.fromDockerfile(
        resolve("backup"),
      ).build();
      bucketStandIn = await backupImage
        .withNetwork(network)
        .withNetworkAliases(bucketStandInAlias)
        .withExposedPorts(bucketStandInPort)
        .withCommand([
          "sh",
          "-c",
          `mkdir -p ${bucketStandInDirectory}/${bucketName} && exec rclone serve s3 --addr=:${String(bucketStandInPort)} --auth-key=${bucketAccessKeyId},${bucketSecretAccessKey} ${bucketStandInDirectory}`,
        ])
        .start();
    }, containersStartTimeoutMs);

    afterAll(async () => {
      await bucketStandIn.stop();
    });

    it("finds the backup's off-site credential can delete what it sends to the throwaway bucket, says so, and fails the night, still sending the backup to both targets (regression)", async () => {
      const filesBefore = await listBucketFiles();
      const run = await runBackupToTheBucketStandIn();
      const sentBackups = (await listBucketFiles()).filter(
        (name) => !filesBefore.includes(name),
      );
      const probes = await backup.exec(
        [
          "rclone",
          "lsf",
          "--files-only",
          `${bucketRemote}/wizzaroo-lock-probes`,
        ],
        { env: bucketRemoteEnvironment },
      );

      expect(run.exitCode).toBe(1);
      expect(run.stderr).toMatch(
        /^backup\.offsite\.delete-allowed remote=offsite:wizzaroo-backups-i4 probe=wizzaroo-lock-probes\/wizzaroo-[0-9TZ-]+\.dump\.age\.probe: /m,
      );
      expect(run.stdout).not.toContain("backup.offsite.delete-refused");
      expect(sentBackups).toHaveLength(1);
      expect(
        (await listBackupsOn(nasStandIn)).filter(
          (name) => name === sentBackups[0],
        ),
      ).toEqual(sentBackups);
      expect(probes.stdout).toBe("");
    });

    it("fails the night, loudly, when the off-site credential can delete the backup it sent", async () => {
      const run = await runBackupToTheBucketStandIn();

      expect(run.exitCode).not.toBe(0);
    });

    it("skips the check only when told by name that the off-site target is a stand-in, and says so (regression)", async () => {
      const run = await runBackup({
        ...bucketRemoteEnvironment,
        BACKUP_RCLONE_REMOTE: nasStandIn,
        BACKUP_RCLONE_OFFSITE_REMOTE: bucketRemote,
      });

      expect(run.exitCode, run.stderr).toBe(0);
      expect(run.stderr).toContain(
        "backup.offsite.lock-check.skipped remote=offsite:wizzaroo-backups-i4 reason=stand-in",
      );
    });

    it("can't stand in for Object Lock: the deploying page's check, run against the throwaway bucket, deletes its probe and never says the delete was refused", async () => {
      const check = await backup.exec(
        [
          "sh",
          "-c",
          'rclone touch "$BACKUP_RCLONE_OFFSITE_REMOTE/wizzaroo-probe" && ! rclone deletefile "$BACKUP_RCLONE_OFFSITE_REMOTE/wizzaroo-probe" && echo "delete refused, as it should be"',
        ],
        {
          env: {
            ...bucketRemoteEnvironment,
            BACKUP_RCLONE_OFFSITE_REMOTE: bucketRemote,
          },
        },
      );

      expect(check.exitCode).not.toBe(0);
      expect(check.stdout).not.toContain("delete refused");
      expect(await listBucketFiles()).not.toContain("wizzaroo-probe");
    });
  });
});
