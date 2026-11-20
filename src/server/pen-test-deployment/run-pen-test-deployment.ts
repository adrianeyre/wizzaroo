import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import {
  addMissingBackupPostgresPassword,
  addMissingEmailPlatformVariables,
  addMissingTotpSecretKey,
  addMissingTunnelTokenPlaceholder,
  buildComposeArguments,
  buildDockerClientEnvironment,
  buildPenTestEnvFile,
  penTestAgeIdentityFile,
  penTestDeploymentDirectory,
  penTestEnvFile,
  penTestFixtureSeedFile,
  penTestMailUrl,
  penTestOrigin,
  penTestProjectName,
  readAgeRecipient,
  repositoryDirectory,
} from "./pen-test-deployment.js";

const standUpCommand = "up";
const tearDownCommand = "down";
const seedFixturesCommand = "seed";
const projectLabel = `label=com.docker.compose.project=${penTestProjectName}`;
const dockerClientEnvironment = buildDockerClientEnvironment(process.env);

const runDocker = async (
  dockerArguments: string[],
  stdout: "inherit" | "pipe",
  input?: string,
): Promise<string> => {
  const docker = spawn("docker", dockerArguments, {
    cwd: repositoryDirectory,
    env: dockerClientEnvironment,
    stdio: [input === undefined ? "ignore" : "pipe", stdout, "inherit"],
  });
  docker.stdin?.end(input);
  let output = "";
  docker.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    docker.once("error", reject);
    docker.once("close", resolve);
  });
  if (exitCode !== 0) {
    throw new Error(
      `docker ${dockerArguments.join(" ")} failed with exit code ${String(exitCode)}`,
    );
  }
  return output;
};

const listDockerObjects = async (listArguments: string[]): Promise<string[]> =>
  (
    await runDocker(
      [...listArguments, "--quiet", "--filter", projectLabel],
      "pipe",
    )
  )
    .split("\n")
    .filter((line) => line !== "");

const generateSecret = (): string => randomBytes(32).toString("hex");

const createPenTestSecrets = async (): Promise<void> => {
  const backupImage = (
    await runDocker(
      ["build", "--quiet", "--tag", `${penTestProjectName}-backup`, "backup"],
      "pipe",
    )
  ).trim();
  const ageIdentity = await runDocker(
    ["run", "--rm", "--network", "none", backupImage, "age-keygen"],
    "pipe",
  );
  await mkdir(penTestDeploymentDirectory, { recursive: true, mode: 0o700 });
  await writeFile(penTestAgeIdentityFile, ageIdentity, { mode: 0o600 });
  await writeFile(
    penTestEnvFile,
    buildPenTestEnvFile({
      postgresPassword: generateSecret(),
      appDatabasePassword: generateSecret(),
      backupPostgresPassword: generateSecret(),
      ageRecipient: readAgeRecipient(ageIdentity),
      offsiteBucketAccessKeyId: generateSecret(),
      offsiteBucketSecretAccessKey: generateSecret(),
      totpSecretKey: generateSecret(),
    }),
    { mode: 0o600 },
  );
  process.stdout.write(
    `Generated the pen-test deployment's secrets and backup key in ${penTestDeploymentDirectory}\n`,
  );
};

const addMissingPenTestSecrets = async (): Promise<void> => {
  const envFile = await readFile(penTestEnvFile, "utf8");
  const withBackupPassword = addMissingBackupPostgresPassword(
    envFile,
    generateSecret(),
  );
  const completedEnvFile = addMissingEmailPlatformVariables(
    addMissingTunnelTokenPlaceholder(
      addMissingTotpSecretKey(withBackupPassword, generateSecret()),
    ),
  );
  if (completedEnvFile !== envFile) {
    await writeFile(penTestEnvFile, completedEnvFile, { mode: 0o600 });
    process.stdout.write(
      `Generated the secrets an older ${penTestEnvFile} lacked\n`,
    );
  }
};

const standUpPenTestDeployment = async (): Promise<void> => {
  if (existsSync(penTestEnvFile)) {
    await addMissingPenTestSecrets();
  } else {
    await createPenTestSecrets();
  }
  await runDocker(
    buildComposeArguments(penTestEnvFile, [
      "up",
      "--detach",
      "--build",
      "--wait",
    ]),
    "inherit",
  );
  process.stdout.write(
    `The pen-test deployment ${penTestProjectName} is up at ${penTestOrigin}, and its mail at ${penTestMailUrl}\n`,
  );
};

const seedPenTestFixtures = async (): Promise<void> => {
  if (!existsSync(penTestEnvFile)) {
    throw new Error(
      `${penTestEnvFile} doesn't exist, so ${penTestProjectName} was never stood up and there is nowhere to load the fixtures. Run pnpm pen-test:up first`,
    );
  }
  if (!existsSync(penTestFixtureSeedFile)) {
    await writeFile(penTestFixtureSeedFile, generateSecret(), { mode: 0o600 });
    process.stdout.write(
      `Generated the fixture seed, which every fixture credential comes from, in ${penTestFixtureSeedFile}\n`,
    );
  }
  await runDocker(
    buildComposeArguments(penTestEnvFile, [
      "exec",
      "--no-TTY",
      "app",
      "node",
      "dist/src/server/index.js",
      "seed-pen-test-fixtures",
    ]),
    "inherit",
    await readFile(penTestFixtureSeedFile, "utf8"),
  );
};

const tearDownPenTestDeployment = async (): Promise<void> => {
  const containers = await listDockerObjects(["ps", "--all"]);
  if (containers.length > 0) {
    await runDocker(["rm", "--force", "--volumes", ...containers], "pipe");
  }
  const volumes = await listDockerObjects(["volume", "ls"]);
  if (volumes.length > 0) {
    await runDocker(["volume", "rm", ...volumes], "pipe");
  }
  const networks = await listDockerObjects(["network", "ls"]);
  if (networks.length > 0) {
    await runDocker(["network", "rm", ...networks], "pipe");
  }

  const leftOver = [
    ...(await listDockerObjects(["ps", "--all"])),
    ...(await listDockerObjects(["volume", "ls"])),
    ...(await listDockerObjects(["network", "ls"])),
  ];
  if (leftOver.length > 0) {
    throw new Error(
      `Tearing down ${penTestProjectName} left these behind: ${leftOver.join(", ")}`,
    );
  }
  await rm(penTestDeploymentDirectory, { recursive: true, force: true });

  process.stdout.write(
    [
      `Removed ${String(containers.length)} containers, ${String(volumes.length)} volumes and ${String(networks.length)} networks of ${penTestProjectName}.`,
      `No container, volume or network labelled ${penTestProjectName} is left.`,
      `Deleted ${penTestDeploymentDirectory}, with the deployment's secrets and backup key.`,
      "",
    ].join("\n"),
  );
};

const command = process.argv[2];
if (command === standUpCommand) {
  await standUpPenTestDeployment();
} else if (command === seedFixturesCommand) {
  await seedPenTestFixtures();
} else if (command === tearDownCommand) {
  await tearDownPenTestDeployment();
} else {
  throw new Error(
    `Say ${standUpCommand}, ${seedFixturesCommand} or ${tearDownCommand}, not "${command}"`,
  );
}
