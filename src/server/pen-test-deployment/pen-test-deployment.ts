import { join, resolve } from "node:path";

export interface PenTestSecrets {
  postgresPassword: string;
  appDatabasePassword: string;
  backupPostgresPassword: string;
  ageRecipient: string;
  offsiteBucketAccessKeyId: string;
  offsiteBucketSecretAccessKey: string;
  /** 64 hex characters, as openssl rand -hex 32 prints them (#254). */
  totpSecretKey: string;
}

export const penTestProjectName = "wizzaroo-pen-test";
export const penTestOrigin = "http://localhost:43310";
export const penTestMailUrl = "http://localhost:43380";

export const repositoryDirectory = resolve(import.meta.dirname, "../../..");
export const penTestDeploymentDirectory = join(
  repositoryDirectory,
  ".pen-test-deployment",
);
export const penTestEnvFile = join(penTestDeploymentDirectory, ".env");
export const penTestAgeIdentityFile = join(
  penTestDeploymentDirectory,
  "age-identity.txt",
);
export const penTestFixtureSeedFile = join(
  penTestDeploymentDirectory,
  "fixture-seed.txt",
);

const penTestComposeFiles = [
  "docker-compose.yml",
  "docker-compose.pen-test.yml",
];

// GITHUB_TOKEN reaches only the app image's build, as the BuildKit secret its install of @adrianeyre/email-client
// reads from GitHub Packages; no container is given it.
const dockerClientVariable =
  /^(PATH|PATHEXT|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMDATA|PROGRAMFILES|SYSTEMROOT|SYSTEMDRIVE|TEMP|TMP|TMPDIR|XDG_RUNTIME_DIR|DOCKER_[A-Z0-9_]+|BUILDX_[A-Z0-9_]+|GITHUB_TOKEN)$/i;

const backupPostgresPasswordVariable = "BACKUP_POSTGRES_PASSWORD";
const totpSecretKeyVariable = "TOTP_SECRET_KEY";
const tunnelTokenVariable = "CLOUDFLARE_TUNNEL_TOKEN";

// Compose refuses its file without a tunnel token, whether or not the tunnel profile is on (pen test I3, #309). The
// pen-test deployment runs no tunnel, so it names none: this placeholder only lets Compose read the file.
export const penTestTunnelTokenPlaceholder =
  "none-the-pen-test-deployment-runs-no-tunnel";

/**
 * The email platform stand-in's address on the pen-test deployment's internal mail network, and the key it takes. The
 * stand-in sends nothing anywhere, so its key guards nothing but the stand-in.
 */
export const penTestEmailPlatformVariables = [
  ["EMAIL_BASE_URL", "http://email-platform-stand-in:8025"],
  ["EMAIL_API_KEY", "ek_the-pen-test-email-platform-stand-in-key"],
] as const;

export const buildPenTestEnvFile = (secrets: PenTestSecrets): string =>
  [
    `POSTGRES_PASSWORD=${secrets.postgresPassword}`,
    `APP_DATABASE_PASSWORD=${secrets.appDatabasePassword}`,
    `${backupPostgresPasswordVariable}=${secrets.backupPostgresPassword}`,
    ...penTestEmailPlatformVariables.map(([name, value]) => `${name}=${value}`),
    `${totpSecretKeyVariable}=${secrets.totpSecretKey}`,
    `${tunnelTokenVariable}=${penTestTunnelTokenPlaceholder}`,
    `BACKUP_AGE_RECIPIENT=${secrets.ageRecipient}`,
    "BACKUP_RCLONE_REMOTE=/srv/nas-stand-in/wizzaroo-backups",
    "BACKUP_RCLONE_OFFSITE_REMOTE=offsite:wizzaroo-backups-pen-test",
    "BACKUP_RCLONE_CONFIG_FILE=./unused-by-the-pen-test-deployment",
    `OFFSITE_BUCKET_ACCESS_KEY_ID=${secrets.offsiteBucketAccessKeyId}`,
    `OFFSITE_BUCKET_SECRET_ACCESS_KEY=${secrets.offsiteBucketSecretAccessKey}`,
    "",
  ].join("\n");

const addMissingVariable = (
  envFile: string,
  name: string,
  value: string,
): string =>
  envFile.split("\n").some((line) => line.startsWith(`${name}=`))
    ? envFile
    : `${envFile === "" || envFile.endsWith("\n") ? envFile : `${envFile}\n`}${name}=${value}\n`;

// A .env written before the backup had a Postgres role of its own lacks its
// password, so standing the deployment up again adds one rather than failing.
export const addMissingBackupPostgresPassword = (
  envFile: string,
  backupPostgresPassword: string,
): string =>
  addMissingVariable(
    envFile,
    backupPostgresPasswordVariable,
    backupPostgresPassword,
  );

// Likewise a .env written before TOTP secrets were sealed (#254) lacks the key.
// The deployment's database then holds secrets as issued, which the app seals on start-up.
export const addMissingTotpSecretKey = (
  envFile: string,
  totpSecretKey: string,
): string => addMissingVariable(envFile, totpSecretKeyVariable, totpSecretKey);

// And a .env written before #309 lacks the tunnel token's placeholder.
export const addMissingTunnelTokenPlaceholder = (envFile: string): string =>
  addMissingVariable(
    envFile,
    tunnelTokenVariable,
    penTestTunnelTokenPlaceholder,
  );

// And a .env written while Wizzaroo sent its own email over SMTP lacks the email platform stand-in's address and key.
export const addMissingEmailPlatformVariables = (envFile: string): string =>
  penTestEmailPlatformVariables.reduce(
    (withVariables, [name, value]) =>
      addMissingVariable(withVariables, name, value),
    envFile,
  );

export const buildDockerClientEnvironment = (
  environment: NodeJS.ProcessEnv,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(environment).filter(
      (entry): entry is [string, string] =>
        dockerClientVariable.test(entry[0]) && entry[1] !== undefined,
    ),
  );

export const buildComposeArguments = (
  envFile: string,
  command: string[],
): string[] => [
  "compose",
  "--project-name",
  penTestProjectName,
  "--project-directory",
  repositoryDirectory,
  "--env-file",
  envFile,
  ...penTestComposeFiles.flatMap((file) => [
    "--file",
    join(repositoryDirectory, file),
  ]),
  ...command,
];

export const readAgeRecipient = (ageIdentity: string): string => {
  const recipient = /^# public key: (age1[0-9a-z]+)$/m.exec(ageIdentity)?.[1];
  if (recipient === undefined) {
    throw new Error("age-keygen printed no public key");
  }
  return recipient;
};
