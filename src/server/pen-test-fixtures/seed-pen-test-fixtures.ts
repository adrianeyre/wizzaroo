import { createHash } from "node:crypto";
import type { Readable, Writable } from "node:stream";
import { text } from "node:stream/consumers";
import { hash } from "@node-rs/argon2";
import {
  count,
  getTableColumns,
  inArray,
  notLike,
  sql,
  type SQL,
} from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { hashSecretToken } from "../auth/secret-token.js";
import {
  sealTotpSecret,
  totpSecretIvBytes,
  type TotpSecretKey,
} from "../auth/totp-secret-box.js";
import { hashRecoveryCodeWithSalt } from "../auth/two-factor.js";
import { hashPicturePasswordWithSalt } from "../children/picture-password.js";
import { refreshRoomShowcases } from "../children/room-showcases.js";
import { loadTotpSecretKey } from "../config/vars.js";
import type { Database } from "../database.js";
import {
  characters,
  children,
  confirmedDeletions,
  deletionRequests,
  families,
  familyDevices,
  familyParents,
  invites,
  passkeys,
  playEvents,
  recoveryCodes,
  schoolParents,
  schools,
  teacherYearGroups,
  teachers,
  totpSecrets,
  users,
} from "../schema.js";
import {
  buildPenTestFixtureCredentials,
  deriveFixtureBytes,
  type PenTestFixtureCredentials,
} from "./fixture-credentials.js";
import {
  buildPenTestFixturePlan,
  penTestFixtureEmailDomain,
  type PenTestFixturePlan,
} from "./fixture-plan.js";

export class PenTestFixturesRefusedError extends Error {
  override name = "PenTestFixturesRefusedError";
}

const fixtureSeedShape = /^[0-9a-f]{64}$/;
const saltBytes = 16;
const uuidBytes = 16;

interface PenTestFixtureSeeding {
  database: Database;
  isSecondSchoolGateMet: boolean;
  input: Readable;
  output: Writable;
  moment: Date;
  /** Read from TOTP_SECRET_KEY when not given, as the server reads it. */
  totpSecretKey?: TotpSecretKey;
}

const buildExcludedColumns = (table: PgTable): Record<string, SQL> =>
  Object.fromEntries(
    Object.entries(getTableColumns(table))
      // Postgres works a generated column out itself, and refuses an update that sets one.
      .filter(([, column]) => column.generated === undefined)
      .map(([key, column]) => [
        key,
        sql`excluded.${sql.identifier(column.name)}`,
      ]),
  );

const getFixtureCredential = <Credential>(
  credentials: ReadonlyMap<string, Credential>,
  fixtureId: string,
): Credential => {
  const credential = credentials.get(fixtureId);
  if (credential === undefined) {
    throw new Error(`The fixture ${fixtureId} has no credential`);
  }
  return credential;
};

const buildPasswordHash = (
  seed: string,
  userId: string,
  password: string | undefined,
): Promise<string> | null =>
  password === undefined
    ? null
    : hash(password, {
        salt: deriveFixtureBytes(seed, "password-salt", userId, saltBytes),
      });

/** A version 4 shaped uuid from the seed, so a fixture row that needs an id of its own keeps it from load to load. */
const deriveFixtureUuid = (
  seed: string,
  purpose: string,
  fixtureId: string,
): string => {
  const bytes = deriveFixtureBytes(seed, purpose, fixtureId, uuidBytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
};

// Each TOTP secret is sealed as the server seals it (#254), with an IV from the seed rather than a random one, so loading
// the fixtures twice gives the same rows. The secret comes from the same seed and adult, so one IV seals one secret.
const buildSealedTotpSecrets = (
  credentials: PenTestFixtureCredentials,
  seed: string,
  totpSecretKey: TotpSecretKey,
) =>
  [...credentials.totpSecrets].map(([userId, secret]) => ({
    userId,
    secret: sealTotpSecret(
      totpSecretKey,
      { userId, secret },
      deriveFixtureBytes(seed, "totp-secret-iv", userId, totpSecretIvBytes),
    ),
    lastUsedStep: null,
    wrongCodesAt: [],
    codePauseEndsAt: null,
    pendingSignInsStartedAt: [],
  }));

// Each recovery code is argon2id as the server hashes it (#255), with a salt and a row id from the seed.
const buildRecoveryCodeRows = (
  credentials: PenTestFixtureCredentials,
  seed: string,
) =>
  Promise.all(
    [...credentials.recoveryCodes].flatMap(([userId, codes]) =>
      codes.map(async (code, index) => {
        const fixtureId = `${userId}:${String(index)}`;
        return {
          id: deriveFixtureUuid(seed, "recovery-code-id", fixtureId),
          codeHash: await hashRecoveryCodeWithSalt(
            code,
            deriveFixtureBytes(
              seed,
              "recovery-code-salt",
              fixtureId,
              saltBytes,
            ),
          ),
          userId,
        };
      }),
    ),
  );

/** A passkey handle that is the same on every load from one seed, so reloading leaves the users rows as they were. */
const buildFixturePasskeyUserHandle = (
  seed: string,
  userId: string,
): string => {
  const hex = createHash("sha256")
    .update(`passkey-user-handle:${seed}:${userId}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const buildFixtureRows = async (
  plan: PenTestFixturePlan,
  credentials: PenTestFixtureCredentials,
  seed: string,
  totpSecretKey: TotpSecretKey,
) => ({
  users: await Promise.all(
    plan.adults.map(async (adult) => ({
      id: adult.id,
      email: adult.email,
      passwordHash: await buildPasswordHash(
        seed,
        adult.id,
        credentials.passwords.get(adult.id),
      ),
      roles: adult.roles,
      emailConfirmedAt: adult.emailConfirmedAt,
      name: adult.name,
      lastLoginAt: null,
      deactivatedAt: adult.deactivatedAt,
      // Reloading closes a probe's reopened setup, so a staff fixture 30 days old has its first setup closed (#243).
      secondFactorSetupUntil: null,
      passkeyUserHandle: buildFixturePasskeyUserHandle(seed, adult.id),
      createdAt: adult.createdAt,
    })),
  ),
  children: await Promise.all(
    plan.children.map(async (child) => ({
      id: child.id,
      familyId: child.familyId,
      schoolId: child.schoolId,
      nickname: child.nickname,
      birthMonth: child.birthMonth,
      birthYear: child.birthYear,
      yearGroupAdjustment: child.yearGroupAdjustment,
      phonicsProgrammeId: child.phonicsProgrammeId,
      picturePasswordHash: await hashPicturePasswordWithSalt(
        getFixtureCredential(credentials.picturePasswords, child.id),
        new Uint8Array(
          deriveFixtureBytes(
            seed,
            "picture-password-salt",
            child.id,
            saltBytes,
          ),
        ),
      ),
      syncedLimits: {},
      classmateVisitsAllowed: child.classmateVisitsAllowed,
      createdAt: child.createdAt,
    })),
  ),
  passkeys: [...credentials.passkeys].map(([userId, passkey]) => ({
    id: passkey.credentialId,
    userId,
    name: "Fixture passkey",
    publicKey: passkey.publicKey,
    signCount: 0,
    transports: ["internal"],
    createdAt: plan.day,
    lastUsedAt: null,
  })),
  totpSecrets: buildSealedTotpSecrets(credentials, seed, totpSecretKey),
  adultsWithoutTotp: plan.adults
    .filter(({ id }) => !credentials.totpSecrets.has(id))
    .map(({ id }) => id),
  recoveryCodes: await buildRecoveryCodeRows(credentials, seed),
  familyDevices: plan.familyDevices.map((familyDevice) => ({
    ...familyDevice,
    tokenHash: hashSecretToken(
      getFixtureCredential(credentials.familyDeviceTokens, familyDevice.id),
    ),
  })),
  invites: plan.invites.map((invite) => ({
    ...invite,
    tokenHash: hashSecretToken(
      getFixtureCredential(credentials.inviteTokens, invite.id),
    ),
  })),
});

const upsertPenTestFixtures = async (
  database: Database,
  plan: PenTestFixturePlan,
  seed: string,
  totpSecretKey: TotpSecretKey,
): Promise<void> => {
  const credentials = buildPenTestFixtureCredentials(plan, seed);
  const rows = await buildFixtureRows(plan, credentials, seed, totpSecretKey);

  await database.transaction(async (transaction) => {
    const [{ outsiders }] = await transaction
      .select({ outsiders: count() })
      .from(users)
      .where(notLike(users.email, `%@${penTestFixtureEmailDomain}`));
    if (outsiders > 0) {
      throw new PenTestFixturesRefusedError(
        `This database holds adults whose email addresses aren't at ${penTestFixtureEmailDomain}, so it isn't the pen-test deployment's. Nothing was loaded`,
      );
    }
    // Loading the fixtures again brings back any the Admin deleted, so their ids leave the ledger a restore deletes again (#280).
    await transaction
      .delete(confirmedDeletions)
      .where(
        inArray(confirmedDeletions.targetId, [
          ...plan.families.map(({ id }) => id),
          ...plan.children.map(({ id }) => id),
          ...plan.adults.map(({ id }) => id),
        ]),
      );
    await transaction
      .insert(schools)
      .values(plan.schools)
      .onConflictDoUpdate({
        target: schools.id,
        set: buildExcludedColumns(schools),
      });
    await transaction
      .insert(users)
      .values(rows.users)
      .onConflictDoUpdate({
        target: users.id,
        set: buildExcludedColumns(users),
      });
    await transaction
      .insert(teachers)
      .values(
        plan.teachers.map(({ userId, schoolId }) => ({ userId, schoolId })),
      )
      .onConflictDoUpdate({
        target: teachers.userId,
        set: buildExcludedColumns(teachers),
      });
    await transaction
      .insert(teacherYearGroups)
      .values(
        plan.teachers.flatMap(({ userId, yearGroups }) =>
          yearGroups.map((yearGroup) => ({ userId, yearGroup })),
        ),
      )
      .onConflictDoNothing();
    await transaction
      .insert(families)
      .values(
        plan.families.map(({ id, name, createdAt }) => ({
          id,
          name,
          createdAt,
        })),
      )
      .onConflictDoUpdate({
        target: families.id,
        set: buildExcludedColumns(families),
      });
    await transaction
      .insert(familyParents)
      .values(
        plan.families.flatMap(({ id, parentIds }) =>
          parentIds.map((userId) => ({ userId, familyId: id })),
        ),
      )
      .onConflictDoUpdate({
        target: familyParents.userId,
        set: buildExcludedColumns(familyParents),
      });
    await transaction
      .insert(schoolParents)
      .values(
        plan.families.flatMap(({ schoolId, parentIds }) =>
          parentIds.map((userId) => ({ userId, schoolId })),
        ),
      )
      .onConflictDoNothing();
    await transaction
      .insert(children)
      .values(rows.children)
      .onConflictDoUpdate({
        target: children.id,
        set: buildExcludedColumns(children),
      });
    await transaction
      .insert(characters)
      .values(
        plan.children.map(({ id, characterName }) => ({
          childId: id,
          name: characterName,
          loadout: {},
        })),
      )
      .onConflictDoUpdate({
        target: characters.childId,
        set: buildExcludedColumns(characters),
      });
    await transaction
      .insert(passkeys)
      .values(rows.passkeys)
      .onConflictDoUpdate({
        target: passkeys.id,
        set: buildExcludedColumns(passkeys),
      });
    // Loading again puts every fixture adult's TOTP back as the plan has it, on or off, with no step used yet, and no wrong code or pending sign-in counted against them.
    await transaction
      .insert(totpSecrets)
      .values(rows.totpSecrets)
      .onConflictDoUpdate({
        target: totpSecrets.userId,
        set: buildExcludedColumns(totpSecrets),
      });
    await transaction
      .delete(totpSecrets)
      .where(inArray(totpSecrets.userId, rows.adultsWithoutTotp));
    // Every fixture adult's recovery codes go back to the plan's: any used are back, and any a probe made are gone.
    await transaction.delete(recoveryCodes).where(
      inArray(
        recoveryCodes.userId,
        plan.adults.map(({ id }) => id),
      ),
    );
    await transaction.insert(recoveryCodes).values(rows.recoveryCodes);
    await transaction
      .insert(familyDevices)
      .values(rows.familyDevices)
      .onConflictDoUpdate({
        target: familyDevices.id,
        set: buildExcludedColumns(familyDevices),
      });
    await transaction
      .insert(invites)
      .values(rows.invites)
      .onConflictDoUpdate({
        target: invites.id,
        set: buildExcludedColumns(invites),
      });
    await transaction
      .insert(deletionRequests)
      .values(plan.deletionRequests)
      .onConflictDoUpdate({
        target: deletionRequests.id,
        set: buildExcludedColumns(deletionRequests),
      });
    await transaction
      .insert(playEvents)
      .values(plan.playEvents)
      .onConflictDoUpdate({
        target: playEvents.id,
        set: buildExcludedColumns(playEvents),
      });
    for (const { id } of plan.families) {
      await refreshRoomShowcases(transaction, id, plan.day);
    }
  });
};

export const seedPenTestFixtures = async ({
  database,
  isSecondSchoolGateMet,
  input,
  output,
  moment,
  totpSecretKey = loadTotpSecretKey(),
}: PenTestFixtureSeeding): Promise<void> => {
  if (!isSecondSchoolGateMet) {
    throw new PenTestFixturesRefusedError(
      "The pen-test fixtures hold two Schools, so they load only where SECOND_SCHOOL_GATE_MET is true, as on the pen-test deployment. Nothing was loaded",
    );
  }
  const seed = (await text(input)).trim();
  if (!fixtureSeedShape.test(seed)) {
    throw new PenTestFixturesRefusedError(
      "The fixture seed on standard input must be 64 lower-case hex characters, as pnpm pen-test:seed generates. Nothing was loaded",
    );
  }

  const plan = buildPenTestFixturePlan(moment);
  await upsertPenTestFixtures(database, plan, seed, totpSecretKey);
  output.write(
    `Loaded the pen-test fixtures for ${plan.day.toISOString().slice(0, 10)}: ${String(plan.schools.length)} Schools, ${String(plan.adults.length)} adults, ${String(plan.families.length)} Families, ${String(plan.children.length)} Children, ${String(plan.familyDevices.length)} Family Devices, ${String(plan.invites.length)} Invites and ${String(plan.playEvents.length)} play events. Their credentials come from the seed, and none is printed.\n`,
  );
};
