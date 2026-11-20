import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addMissingBackupPostgresPassword,
  addMissingTotpSecretKey,
  addMissingEmailPlatformVariables,
  addMissingTunnelTokenPlaceholder,
  buildComposeArguments,
  buildDockerClientEnvironment,
  buildPenTestEnvFile,
  penTestOrigin,
  penTestProjectName,
  readAgeRecipient,
  repositoryDirectory,
  penTestTunnelTokenPlaceholder,
} from "./pen-test-deployment.js";

const runFile = promisify(execFile);

const secrets = {
  postgresPassword: "a-generated-postgres-password",
  appDatabasePassword: "a-generated-app-database-password",
  backupPostgresPassword: "a-generated-backup-postgres-password",
  ageRecipient:
    "age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p",
  offsiteBucketAccessKeyId: "a-generated-access-key-id",
  offsiteBucketSecretAccessKey: "a-generated-secret-access-key",
  totpSecretKey: "a".repeat(64),
};

const ageKeygenOutput = [
  "# created: 2026-11-17T10:00:00Z",
  `# public key: ${secrets.ageRecipient}`,
  "AGE-SECRET-KEY-1NOTAREALKEYNOTAREALKEYNOTAREALKEYNOTAREALKEYNOTAREAL",
  "",
].join("\n");

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readObject = (value: unknown): Record<string, unknown> =>
  isObject(value) ? value : {};

const readArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const hasDockerCompose = await runFile("docker", ["compose", "version"]).then(
  () => true,
  () => false,
);

if (!hasDockerCompose) {
  console.warn(
    "SKIPPED the pen-test deployment's Compose checks: no docker compose, so the merged configuration was not read",
  );
}

describe("the pen-test deployment's .env", () => {
  it("carries the generated secrets and points every target at a stand-in", () => {
    const envFile = buildPenTestEnvFile(secrets);

    expect(envFile.split("\n")).toEqual([
      "POSTGRES_PASSWORD=a-generated-postgres-password",
      "APP_DATABASE_PASSWORD=a-generated-app-database-password",
      "BACKUP_POSTGRES_PASSWORD=a-generated-backup-postgres-password",
      "EMAIL_BASE_URL=http://email-platform-stand-in:8025",
      "EMAIL_API_KEY=ek_the-pen-test-email-platform-stand-in-key",
      `TOTP_SECRET_KEY=${secrets.totpSecretKey}`,
      "CLOUDFLARE_TUNNEL_TOKEN=none-the-pen-test-deployment-runs-no-tunnel",
      `BACKUP_AGE_RECIPIENT=${secrets.ageRecipient}`,
      "BACKUP_RCLONE_REMOTE=/srv/nas-stand-in/wizzaroo-backups",
      "BACKUP_RCLONE_OFFSITE_REMOTE=offsite:wizzaroo-backups-pen-test",
      "BACKUP_RCLONE_CONFIG_FILE=./unused-by-the-pen-test-deployment",
      "OFFSITE_BUCKET_ACCESS_KEY_ID=a-generated-access-key-id",
      "OFFSITE_BUCKET_SECRET_ACCESS_KEY=a-generated-secret-access-key",
      "",
    ]);
  });

  it("adds the backup's own Postgres password to a .env written before it had one, and leaves the rest as it was", () => {
    const olderEnvFile = buildPenTestEnvFile(secrets)
      .split("\n")
      .filter((line) => !line.startsWith("BACKUP_POSTGRES_PASSWORD="))
      .join("\n");

    expect(
      addMissingBackupPostgresPassword(olderEnvFile, "a-new-backup-password"),
    ).toBe(`${olderEnvFile}BACKUP_POSTGRES_PASSWORD=a-new-backup-password\n`);
    expect(
      addMissingBackupPostgresPassword(
        olderEnvFile.trimEnd(),
        "a-new-backup-password",
      ),
    ).toBe(`${olderEnvFile}BACKUP_POSTGRES_PASSWORD=a-new-backup-password\n`);
  });

  it("keeps the backup's Postgres password a .env already has", () => {
    const envFile = buildPenTestEnvFile(secrets);

    expect(
      addMissingBackupPostgresPassword(envFile, "a-new-backup-password"),
    ).toBe(envFile);
  });

  it("adds a TOTP secret key to a .env written before secrets were sealed, and keeps one a .env already has", () => {
    const envFile = buildPenTestEnvFile(secrets);
    const olderEnvFile = envFile
      .split("\n")
      .filter((line) => !line.startsWith("TOTP_SECRET_KEY="))
      .join("\n");

    expect(addMissingTotpSecretKey(olderEnvFile, "c".repeat(64))).toBe(
      `${olderEnvFile}TOTP_SECRET_KEY=${"c".repeat(64)}\n`,
    );
    expect(addMissingTotpSecretKey(envFile, "c".repeat(64))).toBe(envFile);
  });

  it("adds the tunnel token's placeholder to a .env written before Compose refused its file without one, and keeps one a .env already has (#309)", () => {
    const envFile = buildPenTestEnvFile(secrets);
    const olderEnvFile = envFile
      .split("\n")
      .filter((line) => !line.startsWith("CLOUDFLARE_TUNNEL_TOKEN="))
      .join("\n");

    expect(addMissingTunnelTokenPlaceholder(olderEnvFile)).toBe(
      `${olderEnvFile}CLOUDFLARE_TUNNEL_TOKEN=${penTestTunnelTokenPlaceholder}\n`,
    );
    expect(addMissingTunnelTokenPlaceholder(envFile)).toBe(envFile);
  });

  it("adds the email platform stand-in's address and key to a .env written while Wizzaroo sent over SMTP, and keeps those a .env already has", () => {
    const envFile = buildPenTestEnvFile(secrets);
    const olderEnvFile = envFile
      .split("\n")
      .filter((line) => !line.startsWith("EMAIL_"))
      .join("\n");

    expect(addMissingEmailPlatformVariables(olderEnvFile)).toBe(
      `${olderEnvFile}EMAIL_BASE_URL=http://email-platform-stand-in:8025\nEMAIL_API_KEY=ek_the-pen-test-email-platform-stand-in-key\n`,
    );
    expect(addMissingEmailPlatformVariables(envFile)).toBe(envFile);
  });

  it("names no production host, mail provider or tunnel, the tunnel token being a placeholder that says so", () => {
    const envFile = buildPenTestEnvFile(secrets)
      .replace(`CLOUDFLARE_TUNNEL_TOKEN=${penTestTunnelTokenPlaceholder}\n`, "")
      .toLowerCase();

    for (const production of [
      "adrianeyre",
      "resend",
      "backblaze",
      "b2",
      "192.168.",
      "nas:",
      "cloudflare",
      "second_school_gate_met",
    ]) {
      expect(envFile).not.toContain(production);
    }
  });
});

describe("the environment handed to the Docker client", () => {
  it("keeps only what the Docker client needs, so no secret in the shell but the app build's GitHub Packages token reaches Compose", () => {
    const environment = buildDockerClientEnvironment({
      PATH: "/usr/bin",
      Path: "C:\\Windows",
      HOME: "/home/owner",
      DOCKER_HOST: "unix:///var/run/docker.sock",
      DOCKER_CONTEXT: "default",
      XDG_RUNTIME_DIR: "/run/user/1000",
      GITHUB_TOKEN: "a-token-with-read-packages",
      POSTGRES_PASSWORD: "the-production-database-password",
      EMAIL_API_KEY: "the-production-email-platform-key",
      CLOUDFLARE_TUNNEL_TOKEN: "the-production-tunnel-token",
      BACKUP_RCLONE_REMOTE: "nas:wizzaroo-backups",
      BACKUP_RCLONE_OFFSITE_REMOTE: "offsite:wizzaroo-backups-k3x9",
      SECOND_SCHOOL_GATE_MET: "true",
      COMPOSE_PROFILES: "tunnel",
      COMPOSE_FILE: "docker-compose.yml",
      COMPOSE_PROJECT_NAME: "wizzaroo",
      COMPOSE_ENV_FILES: ".env",
    });

    expect(environment).toEqual({
      PATH: "/usr/bin",
      Path: "C:\\Windows",
      HOME: "/home/owner",
      DOCKER_HOST: "unix:///var/run/docker.sock",
      DOCKER_CONTEXT: "default",
      XDG_RUNTIME_DIR: "/run/user/1000",
      GITHUB_TOKEN: "a-token-with-read-packages",
    });
  });
});

describe("the Compose command line", () => {
  it("always names the pen-test project, its own .env and both Compose files before the command", () => {
    expect(
      buildComposeArguments("/somewhere/.env", ["up", "--detach"]),
    ).toEqual([
      "compose",
      "--project-name",
      "wizzaroo-pen-test",
      "--project-directory",
      repositoryDirectory,
      "--env-file",
      "/somewhere/.env",
      "--file",
      join(repositoryDirectory, "docker-compose.yml"),
      "--file",
      join(repositoryDirectory, "docker-compose.pen-test.yml"),
      "up",
      "--detach",
    ]);
  });
});

describe("reading the backup key's recipient", () => {
  it("reads the public key age-keygen prints", () => {
    expect(readAgeRecipient(ageKeygenOutput)).toBe(secrets.ageRecipient);
  });

  it("refuses output that holds no public key", () => {
    expect(() => readAgeRecipient("age-keygen: error")).toThrow(
      "age-keygen printed no public key",
    );
  });
});

describe.skipIf(!hasDockerCompose)(
  "the pen-test deployment's Compose configuration",
  () => {
    let scratchDirectory: string;
    let envFile: string;
    let penTestConfig: Record<string, unknown>;
    let productionConfig: Record<string, unknown>;

    const loadComposeConfig = async (
      composeArguments: string[],
    ): Promise<Record<string, unknown>> => {
      const { stdout } = await runFile(
        "docker",
        [...composeArguments, "config", "--format", "json"],
        {
          cwd: repositoryDirectory,
          env: buildDockerClientEnvironment(process.env),
        },
      );
      return readObject(JSON.parse(stdout));
    };

    const readServices = (config: Record<string, unknown>) =>
      Object.entries(readObject(config.services)).map(([name, service]) => ({
        name,
        service: readObject(service),
      }));

    beforeAll(async () => {
      scratchDirectory = await mkdtemp(join(tmpdir(), "wizzaroo-pen-test-"));
      envFile = join(scratchDirectory, ".env");
      await writeFile(envFile, buildPenTestEnvFile(secrets));
      const allProfiles = ["--profile", "tunnel", "--profile", "drill"];
      penTestConfig = await loadComposeConfig([
        ...buildComposeArguments(envFile, []),
        ...allProfiles,
      ]);
      productionConfig = await loadComposeConfig([
        "compose",
        "--project-directory",
        repositoryDirectory,
        "--env-file",
        envFile,
        "--file",
        join(repositoryDirectory, "docker-compose.yml"),
        ...allProfiles,
      ]);
    });

    afterAll(async () => {
      await rm(scratchDirectory, { recursive: true, force: true });
    });

    it("is its own project, with its own Postgres volume", () => {
      expect(penTestConfig).toMatchObject({
        name: penTestProjectName,
        volumes: {
          "postgres-data": { name: "wizzaroo-pen-test_postgres-data" },
        },
      });
      expect(productionConfig).toMatchObject({
        name: "wizzaroo",
        volumes: { "postgres-data": { name: "wizzaroo_postgres-data" } },
      });
    });

    it("leaves a way out of Docker only to the cloudflared and email platform stand-ins, and downloads no voices (ADR 0062)", () => {
      const networks = readObject(penTestConfig.networks);
      const networksWithAWayOut = Object.entries(networks)
        .filter(([, network]) => readObject(network).internal !== true)
        .map(([name]) => name);
      const servicesWithAWayOut = readServices(penTestConfig)
        .filter(({ service }) =>
          Object.keys(readObject(service.networks)).some((network) =>
            networksWithAWayOut.includes(network),
          ),
        )
        .map(({ name }) => name)
        .sort();

      expect(networksWithAWayOut).toEqual(["edge"]);
      expect(servicesWithAWayOut).toEqual([
        "cloudflared-stand-in",
        "email-platform-stand-in",
      ]);
      const voices = readServices(penTestConfig).find(
        ({ name }) => name === "voices",
      );
      expect(voices?.service.command).toEqual(["--eval", ""]);
    });

    it("publishes only the stand-in origin and the email platform stand-in, on loopback, and not the app", () => {
      const publishedPorts = readServices(penTestConfig).flatMap(
        ({ name, service }) =>
          readArray(service.ports).map((port) => {
            const { host_ip, published, target } = readObject(port);
            return `${name} ${String(host_ip)}:${String(published)}->${String(target)}`;
          }),
      );

      expect(publishedPorts.sort()).toEqual([
        "cloudflared-stand-in 127.0.0.1:43310->80",
        "email-platform-stand-in 127.0.0.1:43380->8025",
      ]);
    });

    it("mounts no path from the host, so no production file can be read into it", () => {
      const mounts = readServices(penTestConfig).flatMap(({ name, service }) =>
        readArray(service.volumes).map((volume) => {
          const { type, source } = readObject(volume);
          return `${name} ${String(type)} ${String(source)}`;
        }),
      );

      expect(mounts.sort()).toEqual([
        "app volume voice-models",
        "backup volume nas-stand-in",
        "offsite-bucket-stand-in volume offsite-bucket-stand-in",
        "postgres volume postgres-data",
        "stand-in-directories volume nas-stand-in",
        "stand-in-directories volume offsite-bucket-stand-in",
        "voices volume voice-models",
      ]);
    });

    it("meets the second-School gate on the pen-test deployment and nowhere else", () => {
      expect(penTestConfig).toMatchObject({
        services: {
          app: {
            environment: {
              SECOND_SCHOOL_GATE_MET: "true",
              PUBLIC_URL: penTestOrigin,
              EMAIL_BASE_URL: "http://email-platform-stand-in:8025",
            },
          },
        },
      });
      expect(productionConfig).toMatchObject({
        services: { app: { environment: { SECOND_SCHOOL_GATE_MET: "" } } },
      });
    });

    it("sends the app's emails to the email platform stand-in on the pen-test deployment, and to the one .env names in production", () => {
      const readAppEnvironment = (config: Record<string, unknown>) =>
        readObject(
          readObject(readObject(readObject(config.services).app).environment),
        );

      expect(readAppEnvironment(penTestConfig)).toMatchObject({
        EMAIL_BASE_URL: "http://email-platform-stand-in:8025",
        EMAIL_API_KEY: "ek_the-pen-test-email-platform-stand-in-key",
      });
      expect(readAppEnvironment(productionConfig)).not.toHaveProperty(
        "SMTP_HOST",
      );
      expect(readAppEnvironment(productionConfig)).toHaveProperty(
        "EMAIL_BASE_URL",
      );
    });

    it("gives the backup a Postgres role and password of its own, and the superuser's password only to Postgres, migrate, backup-role and the restore drill, which have no way out", () => {
      for (const config of [penTestConfig, productionConfig]) {
        const services = readServices(config);
        const servicesWithTheSuperusersPassword = services
          .filter(({ service }) =>
            Object.values(readObject(service.environment)).some(
              (value) =>
                typeof value === "string" &&
                value.includes(secrets.postgresPassword),
            ),
          )
          .map(({ name }) => name)
          .sort();
        const backupRole = services.find(({ name }) => name === "backup-role");

        expect(servicesWithTheSuperusersPassword).toEqual([
          "backup-role",
          "migrate",
          "postgres",
          "restore-drill",
        ]);
        expect(config).toMatchObject({
          services: {
            backup: {
              environment: {
                PGUSER: "wizzaroo_backup",
                PGPASSWORD: secrets.backupPostgresPassword,
              },
            },
            "backup-role": {
              command: ["backup-role.sh"],
              environment: {
                PGUSER: "wizzaroo",
                BACKUP_PGPASSWORD: secrets.backupPostgresPassword,
              },
            },
          },
        });
        expect(Object.keys(readObject(backupRole?.service.networks))).toEqual([
          "database",
        ]);
        expect(readObject(readObject(config.networks).database)).toMatchObject({
          internal: true,
        });
      }
    });

    it("bounds every service's log, in production and on the pen-test deployment, at three files of 10 MB (#282)", () => {
      const listLogging = (config: Record<string, unknown>) =>
        readServices(config).map(({ name, service }) => ({
          name,
          logging: service.logging,
        }));
      const bounded = {
        driver: "json-file",
        options: { "max-size": "10m", "max-file": "3" },
      };

      for (const config of [productionConfig, penTestConfig]) {
        const services = listLogging(config);

        expect(services.length).toBeGreaterThan(0);
        expect(services).toEqual(
          services.map(({ name }) => ({ name, logging: bounded })),
        );
      }
    });

    it("checks the production backup's off-site key every night, which nothing in docker-compose.yml can turn off (#317)", () => {
      const productionBackup = readServices(productionConfig).find(
        ({ name }) => name === "backup",
      );

      expect(
        Object.keys(readObject(productionBackup?.service.environment)),
      ).not.toContain("BACKUP_OFFSITE_LOCK_CHECK");
    });

    it("sends backups to the stand-in NAS and bucket, with no rclone config file and only a placeholder for the tunnel token", () => {
      expect(penTestConfig).toMatchObject({
        services: {
          backup: {
            environment: {
              RCLONE_CONFIG: "/dev/null",
              BACKUP_RCLONE_REMOTE: "/srv/nas-stand-in/wizzaroo-backups",
              BACKUP_RCLONE_OFFSITE_REMOTE: "offsite:wizzaroo-backups-pen-test",
              RCLONE_CONFIG_OFFSITE_ENDPOINT:
                "http://offsite-bucket-stand-in:8080",
              BACKUP_OFFSITE_LOCK_CHECK: "off-for-a-stand-in",
            },
          },
          cloudflared: {
            environment: { TUNNEL_TOKEN: penTestTunnelTokenPlaceholder },
          },
        },
      });
    });
  },
);
