import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  penTestDeploymentDirectory,
  penTestFixtureSeedFile,
  penTestOrigin,
} from "../pen-test-deployment/pen-test-deployment.js";
import { buildPenTestFixtureCredentials } from "../pen-test-fixtures/fixture-credentials.js";
import { buildPenTestFixturePlan } from "../pen-test-fixtures/fixture-plan.js";
import {
  buildCurlCookieJar,
  buildPenTestCredentialsPackage,
  CredentialOnCommandLineError,
  listPenTestIdentities,
  PenTestCredentialUnreadableError,
  readSignInHandle,
  UnknownPenTestIdentityError,
} from "./credentials-package.js";
import {
  PenTestSignInRefusedError,
  signInAsPenTestFixture,
} from "./sign-in-as-pen-test-fixture.js";

class CookiesToTerminalError extends Error {
  override readonly name = "CookiesToTerminalError";

  constructor() {
    super(
      "The cookies are a credential, so they aren't written to a terminal. Send them to a file: pnpm --silent pen-test:sign-in <identity> >identity.cookies. Nothing was signed in",
    );
  }
}

const writePackageCommand = "package";
const signInCommand = "sign-in";
const penTestCredentialsPackageFile = join(
  penTestDeploymentDirectory,
  "credentials-package.env",
);

const isRefusal = (error: unknown): error is Error =>
  error instanceof CredentialOnCommandLineError ||
  error instanceof UnknownPenTestIdentityError ||
  error instanceof PenTestCredentialUnreadableError ||
  error instanceof PenTestSignInRefusedError ||
  error instanceof CookiesToTerminalError;

const writePenTestCredentialsPackage = async (): Promise<void> => {
  if (!existsSync(penTestFixtureSeedFile)) {
    throw new Error(
      `${penTestFixtureSeedFile} doesn't exist, so the fixtures were never loaded and have no credentials. Run pnpm pen-test:seed first`,
    );
  }
  const seed = (await readFile(penTestFixtureSeedFile, "utf8")).trim();
  const plan = buildPenTestFixturePlan(new Date());
  await writeFile(
    penTestCredentialsPackageFile,
    buildPenTestCredentialsPackage(
      plan,
      buildPenTestFixtureCredentials(plan, seed),
      seed,
    ),
    { mode: 0o600 },
  );
  process.stdout.write(
    `Wrote the credentials package for ${String(listPenTestIdentities(plan).length)} fixture identities to ${penTestCredentialsPackageFile}, readable only by you. None of it is printed.\n`,
  );
};

const signInFromTerminal = async (
  commandArguments: string[],
): Promise<void> => {
  const plan = buildPenTestFixturePlan(new Date());
  const handle = readSignInHandle(
    commandArguments,
    listPenTestIdentities(plan),
  );
  if (process.stdout.isTTY) {
    throw new CookiesToTerminalError();
  }
  const origin = new URL(penTestOrigin);
  const cookies = await signInAsPenTestFixture({
    handle,
    environment: process.env,
    origin,
    plan,
  });
  process.stdout.write(buildCurlCookieJar(cookies, origin));
};

const [command, ...commandArguments] = process.argv.slice(2);
try {
  if (command === writePackageCommand) {
    await writePenTestCredentialsPackage();
  } else if (command === signInCommand) {
    await signInFromTerminal(commandArguments);
  } else {
    throw new Error(`Say ${writePackageCommand} or ${signInCommand}`);
  }
} catch (error) {
  if (!isRefusal(error)) {
    throw error;
  }
  process.stderr.write(`${error.message}.\n`);
  process.exitCode = 1;
}
