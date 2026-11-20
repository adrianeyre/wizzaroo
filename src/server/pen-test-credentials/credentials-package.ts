import { createHash, createPrivateKey, sign } from "node:crypto";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { buildTotpSetupKey } from "../auth/two-factor.js";
import {
  deriveFixtureBytes,
  type PenTestFixtureCredentials,
} from "../pen-test-fixtures/fixture-credentials.js";
import {
  penTestFixtureIds,
  type FixtureAdult,
  type PenTestFixturePlan,
} from "../pen-test-fixtures/fixture-plan.js";

export type PenTestFixtureHandle = keyof typeof penTestFixtureIds;

type PenTestCredentialName =
  | "PASSWORD"
  | "TOTP_SECRET"
  | "TOTP_SETUP_KEY"
  | "RECOVERY_CODES"
  | "PASSKEY_CREDENTIAL_ID"
  | "PASSKEY_PRIVATE_KEY_JWK"
  | "NEW_PASSWORD"
  | "TOKEN"
  | "PICTURE_PASSWORD";

export type PenTestEnvironment = Readonly<Record<string, string | undefined>>;

export interface SoftPasskey {
  credentialId: string;
  privateKeyJwk: PasskeyPrivateKeyJwk;
}

interface PasskeyPrivateKeyJwk {
  kty: string;
  crv: string;
  d: string;
  x: string;
  y: string;
}

export type PenTestSignInCredential =
  | {
      method: "password";
      email: string;
      password: string;
      totpSecret: string | undefined;
    }
  | { method: "passkey"; passkey: SoftPasskey }
  | { method: "invite"; token: string; newPassword: string }
  | { method: "family-device"; token: string };

export interface PenTestCookie {
  name: string;
  value: string;
  path: string;
}

export class CredentialOnCommandLineError extends Error {
  override readonly name = "CredentialOnCommandLineError";

  constructor() {
    super(
      "Give pnpm pen-test:sign-in one fixture identity and nothing else. Its credentials come from the environment, never from the command line, where shell history and ps keep them. Nothing was signed in",
    );
  }
}

export class UnknownPenTestIdentityError extends Error {
  override readonly name = "UnknownPenTestIdentityError";

  constructor(identityHandles: readonly PenTestFixtureHandle[]) {
    super(
      `That isn't a fixture identity. Sign in as one of ${identityHandles.join(", ")}. Nothing was signed in`,
    );
  }
}

export class PenTestCredentialUnreadableError extends Error {
  override readonly name = "PenTestCredentialUnreadableError";

  constructor(variable: string) {
    super(
      `${variable} isn't set to what the credentials package holds. Load the package into the environment as docs/pen-test/credentials-package.md says. Nothing was signed in`,
    );
  }
}

const newPasswordBytes = 18;
const credentialPrefix = "PEN_TEST";
const listSeparator = ",";
const userPresentAndVerifiedFlags = 0x05;
const signCounterBytes = 4;

const packageHeader = [
  "# The pen-test credentials package: every fixture identity's credentials, derived from the fixture seed.",
  "# Synthetic, and good only on the pen-test deployment. Never paste a value into an issue, a findings note, a commit, a log or a prompt.",
];

const isPenTestFixtureHandle = (text: string): text is PenTestFixtureHandle =>
  Object.hasOwn(penTestFixtureIds, text);

const fixtureHandles = Object.keys(penTestFixtureIds).filter(
  isPenTestFixtureHandle,
);

const getFixtureHandle = (fixtureId: string): PenTestFixtureHandle => {
  const handle = fixtureHandles.find(
    (candidate) => penTestFixtureIds[candidate] === fixtureId,
  );
  if (handle === undefined) {
    throw new Error(`The fixture ${fixtureId} has no handle`);
  }
  return handle;
};

const isInvitedOnly = (adult: FixtureAdult): boolean =>
  !adult.hasPassword && !adult.hasPasskey;

const digestSha256 = (data: Uint8Array): Buffer =>
  createHash("sha256").update(data).digest();

export const buildPenTestCredentialVariable = (
  handle: PenTestFixtureHandle,
  credentialName: PenTestCredentialName,
): string =>
  `${credentialPrefix}_${handle.replace(/[A-Z]/g, "_$&").toUpperCase()}_${credentialName}`;

export const listPenTestIdentities = (
  plan: PenTestFixturePlan,
): PenTestFixtureHandle[] =>
  [...plan.adults, ...plan.familyDevices].map(({ id }) => getFixtureHandle(id));

export const readSignInHandle = (
  commandArguments: readonly string[],
  identityHandles: readonly PenTestFixtureHandle[],
): PenTestFixtureHandle => {
  if (
    commandArguments.length > 1 ||
    commandArguments.some((commandArgument) => commandArgument.startsWith("-"))
  ) {
    throw new CredentialOnCommandLineError();
  }
  const handle = identityHandles.find(
    (identityHandle) => identityHandle === commandArguments.at(0),
  );
  if (handle === undefined) {
    throw new UnknownPenTestIdentityError(identityHandles);
  }
  return handle;
};

const readCredentialVariable = (
  environment: PenTestEnvironment,
  handle: PenTestFixtureHandle,
  credentialName: PenTestCredentialName,
): string => {
  const variable = buildPenTestCredentialVariable(handle, credentialName);
  const value = environment[variable];
  if (value === undefined || value === "") {
    throw new PenTestCredentialUnreadableError(variable);
  }
  return value;
};

const readPasskeyPrivateKeyJwk = (
  environment: PenTestEnvironment,
  handle: PenTestFixtureHandle,
): PasskeyPrivateKeyJwk => {
  const credentialName = "PASSKEY_PRIVATE_KEY_JWK";
  const unreadable = new PenTestCredentialUnreadableError(
    buildPenTestCredentialVariable(handle, credentialName),
  );
  let jwk: unknown;
  try {
    jwk = JSON.parse(
      readCredentialVariable(environment, handle, credentialName),
    );
  } catch (error) {
    throw error instanceof PenTestCredentialUnreadableError
      ? error
      : unreadable;
  }
  if (
    typeof jwk !== "object" ||
    jwk === null ||
    !("kty" in jwk) ||
    !("crv" in jwk) ||
    !("d" in jwk) ||
    !("x" in jwk) ||
    !("y" in jwk) ||
    typeof jwk.kty !== "string" ||
    typeof jwk.crv !== "string" ||
    typeof jwk.d !== "string" ||
    typeof jwk.x !== "string" ||
    typeof jwk.y !== "string"
  ) {
    throw unreadable;
  }
  return { kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y };
};

const readAdultSignInCredential = (
  plan: PenTestFixturePlan,
  adult: FixtureAdult,
  environment: PenTestEnvironment,
): PenTestSignInCredential => {
  const handle = getFixtureHandle(adult.id);
  if (adult.hasPasskey) {
    return {
      method: "passkey",
      passkey: {
        credentialId: readCredentialVariable(
          environment,
          handle,
          "PASSKEY_CREDENTIAL_ID",
        ),
        privateKeyJwk: readPasskeyPrivateKeyJwk(environment, handle),
      },
    };
  }
  if (adult.hasPassword) {
    return {
      method: "password",
      email: adult.email,
      password: readCredentialVariable(environment, handle, "PASSWORD"),
      totpSecret: adult.hasTotp
        ? readCredentialVariable(environment, handle, "TOTP_SECRET")
        : undefined,
    };
  }
  const invite = plan.invites.find(({ userId }) => userId === adult.id);
  if (invite === undefined) {
    throw new Error(`The fixture ${handle} has no way to sign in`);
  }
  return {
    method: "invite",
    token: readCredentialVariable(
      environment,
      getFixtureHandle(invite.id),
      "TOKEN",
    ),
    newPassword: readCredentialVariable(environment, handle, "NEW_PASSWORD"),
  };
};

export const readPenTestSignInCredential = (
  plan: PenTestFixturePlan,
  handle: PenTestFixtureHandle,
  environment: PenTestEnvironment,
): PenTestSignInCredential => {
  const fixtureId = penTestFixtureIds[handle];
  const adult = plan.adults.find(({ id }) => id === fixtureId);
  if (adult !== undefined) {
    return readAdultSignInCredential(plan, adult, environment);
  }
  if (plan.familyDevices.some(({ id }) => id === fixtureId)) {
    return {
      method: "family-device",
      token: readCredentialVariable(environment, handle, "TOKEN"),
    };
  }
  throw new UnknownPenTestIdentityError(listPenTestIdentities(plan));
};

const buildNewPassword = (seed: string, userId: string): string =>
  deriveFixtureBytes(
    seed,
    "invite-acceptance-password",
    userId,
    newPasswordBytes,
  ).toString("base64url");

const buildAdultVariables = (
  adult: FixtureAdult,
  credentials: PenTestFixtureCredentials,
  seed: string,
): [string, string][] => {
  const handle = getFixtureHandle(adult.id);
  const password = credentials.passwords.get(adult.id);
  const totpSecret = credentials.totpSecrets.get(adult.id);
  const recoveryCodes = credentials.recoveryCodes.get(adult.id);
  const passkey = credentials.passkeys.get(adult.id);
  const variables: [PenTestCredentialName, string | undefined][] = [
    ["PASSWORD", password],
    ["TOTP_SECRET", totpSecret],
    [
      "TOTP_SETUP_KEY",
      totpSecret === undefined ? undefined : buildTotpSetupKey(totpSecret),
    ],
    ["RECOVERY_CODES", recoveryCodes?.join(listSeparator)],
    ["PASSKEY_CREDENTIAL_ID", passkey?.credentialId],
    [
      "PASSKEY_PRIVATE_KEY_JWK",
      passkey === undefined ? undefined : JSON.stringify(passkey.privateKeyJwk),
    ],
    [
      "NEW_PASSWORD",
      isInvitedOnly(adult) ? buildNewPassword(seed, adult.id) : undefined,
    ],
  ];
  return variables.flatMap(([credentialName, value]): [string, string][] =>
    value === undefined
      ? []
      : [[buildPenTestCredentialVariable(handle, credentialName), value]],
  );
};

const getPackagedCredential = <Credential>(
  credentials: ReadonlyMap<string, Credential>,
  fixtureId: string,
): Credential => {
  const credential = credentials.get(fixtureId);
  if (credential === undefined) {
    throw new Error(`The fixture ${fixtureId} has no credential`);
  }
  return credential;
};

export const buildPenTestCredentialsPackage = (
  plan: PenTestFixturePlan,
  credentials: PenTestFixtureCredentials,
  seed: string,
): string => {
  const variables: [string, string][] = [
    ...plan.adults.flatMap((adult) =>
      buildAdultVariables(adult, credentials, seed),
    ),
    ...plan.invites.map(({ id }): [string, string] => [
      buildPenTestCredentialVariable(getFixtureHandle(id), "TOKEN"),
      getPackagedCredential(credentials.inviteTokens, id),
    ]),
    ...plan.familyDevices.map(({ id }): [string, string] => [
      buildPenTestCredentialVariable(getFixtureHandle(id), "TOKEN"),
      getPackagedCredential(credentials.familyDeviceTokens, id),
    ]),
    ...plan.children.map(({ id }): [string, string] => [
      buildPenTestCredentialVariable(getFixtureHandle(id), "PICTURE_PASSWORD"),
      getPackagedCredential(credentials.picturePasswords, id).join(
        listSeparator,
      ),
    ]),
  ];
  return [
    ...packageHeader,
    ...variables.map(([variable, value]) => `${variable}='${value}'`),
    "",
  ].join("\n");
};

export const buildPasskeyAssertion = ({
  passkey,
  challenge,
  origin,
}: {
  passkey: SoftPasskey;
  challenge: string;
  origin: URL;
}): AuthenticationResponseJSON => {
  const clientDataJSON = isoBase64URL.fromUTF8String(
    JSON.stringify({
      type: "webauthn.get",
      challenge,
      origin: origin.origin,
      crossOrigin: false,
    }),
  );
  const authenticatorData = Buffer.concat([
    digestSha256(Buffer.from(origin.hostname)),
    Buffer.from([userPresentAndVerifiedFlags]),
    Buffer.alloc(signCounterBytes),
  ]);
  const signature = sign(
    "sha256",
    Buffer.concat([
      authenticatorData,
      digestSha256(isoBase64URL.toBuffer(clientDataJSON)),
    ]),
    createPrivateKey({ key: passkey.privateKeyJwk, format: "jwk" }),
  );
  return {
    id: passkey.credentialId,
    rawId: passkey.credentialId,
    type: "public-key",
    response: {
      clientDataJSON,
      authenticatorData: isoBase64URL.fromBuffer(
        new Uint8Array(authenticatorData),
      ),
      signature: isoBase64URL.fromBuffer(new Uint8Array(signature)),
    },
    clientExtensionResults: {},
  };
};

export const readSetCookies = (
  setCookieHeaders: readonly string[],
): PenTestCookie[] =>
  setCookieHeaders.flatMap((setCookieHeader) => {
    const [pair, ...attributes] = setCookieHeader
      .split(";")
      .map((part) => part.trim());
    const separator = pair.indexOf("=");
    const value = pair.slice(separator + 1);
    const pathAttribute = attributes.find((attribute) =>
      attribute.toLowerCase().startsWith("path="),
    );
    return value === ""
      ? []
      : [
          {
            name: pair.slice(0, separator),
            value,
            path: pathAttribute?.slice("path=".length) ?? "/",
          },
        ];
  });

export const buildCookieHeader = (cookies: readonly PenTestCookie[]): string =>
  cookies.map(({ name, value }) => `${name}=${value}`).join("; ");

export const buildCurlCookieJar = (
  cookies: readonly PenTestCookie[],
  origin: URL,
): string =>
  [
    "# Netscape HTTP Cookie File",
    ...cookies.map(({ name, value, path }) =>
      [
        `#HttpOnly_${origin.hostname}`,
        "FALSE",
        path,
        "TRUE",
        "0",
        name,
        value,
      ].join("\t"),
    ),
    "",
  ].join("\n");
