import { buildTotpCode, getTotpStep } from "../auth/two-factor.js";
import { familyDeviceCookieName } from "../family-devices/signed-in-family-device.js";
import type { PenTestFixturePlan } from "../pen-test-fixtures/fixture-plan.js";
import {
  buildCookieHeader,
  buildPasskeyAssertion,
  readPenTestSignInCredential,
  readSetCookies,
  type PenTestCookie,
  type PenTestEnvironment,
  type PenTestFixtureHandle,
  type SoftPasskey,
} from "./credentials-package.js";

type PenTestSignInStep =
  "password" | "two-factor code" | "passkey" | "Invite" | "Family Device";

export class PenTestSignInRefusedError extends Error {
  override readonly name = "PenTestSignInRefusedError";

  constructor(
    readonly handle: PenTestFixtureHandle,
    readonly step: PenTestSignInStep,
    readonly status: number,
  ) {
    super(
      `The deployment refused ${handle} at the ${step} step, with HTTP ${String(status)}`,
    );
  }
}

interface PenTestSignIn {
  handle: PenTestFixtureHandle;
  environment: PenTestEnvironment;
  origin: URL;
  plan: PenTestFixturePlan;
}

const postJson = (
  origin: URL,
  path: string,
  body: unknown,
  cookieHeader?: string,
): Promise<Response> =>
  fetch(new URL(path, origin), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader === undefined ? {} : { cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

const assertSignInStatus = async (
  response: Response,
  expectedStatus: number,
  handle: PenTestFixtureHandle,
  step: PenTestSignInStep,
): Promise<void> => {
  if (response.status !== expectedStatus) {
    await response.body?.cancel();
    throw new PenTestSignInRefusedError(handle, step, response.status);
  }
};

const readResponseCookies = (response: Response): PenTestCookie[] =>
  readSetCookies(response.headers.getSetCookie());

const readChallenge = (options: unknown): string => {
  if (
    typeof options !== "object" ||
    options === null ||
    !("challenge" in options) ||
    typeof options.challenge !== "string"
  ) {
    throw new Error("The deployment answered without a passkey challenge");
  }
  return options.challenge;
};

const signInWithPassword = async (
  { handle, origin }: PenTestSignIn,
  {
    email,
    password,
    totpSecret,
  }: { email: string; password: string; totpSecret: string | undefined },
): Promise<PenTestCookie[]> => {
  const passwordResponse = await postJson(origin, "/api/sign-in", {
    email,
    password,
  });
  if (passwordResponse.status === 204) {
    return readResponseCookies(passwordResponse);
  }
  await assertSignInStatus(passwordResponse, 202, handle, "password");
  await passwordResponse.body?.cancel();
  if (totpSecret === undefined) {
    throw new Error(
      `The deployment asked ${handle} for a two-factor code, but the fixtures give them no TOTP. Load the fixtures again with pnpm pen-test:seed if a probe turned it on`,
    );
  }
  const codeResponse = await postJson(
    origin,
    "/api/sign-in/two-factor-code",
    { code: buildTotpCode(totpSecret, getTotpStep(new Date())) },
    buildCookieHeader(readResponseCookies(passwordResponse)),
  );
  await assertSignInStatus(codeResponse, 204, handle, "two-factor code");
  return readResponseCookies(codeResponse);
};

const signInWithPasskey = async (
  { handle, origin }: PenTestSignIn,
  passkey: SoftPasskey,
): Promise<PenTestCookie[]> => {
  const optionsResponse = await fetch(
    new URL("/api/passkey-sign-in-options", origin),
    { method: "POST" },
  );
  await assertSignInStatus(optionsResponse, 200, handle, "passkey");
  const options: unknown = await optionsResponse.json();
  const signInResponse = await postJson(origin, "/api/passkey-sign-ins", {
    response: buildPasskeyAssertion({
      passkey,
      challenge: readChallenge(options),
      origin,
    }),
  });
  await assertSignInStatus(signInResponse, 204, handle, "passkey");
  return readResponseCookies(signInResponse);
};

const signInByAcceptingInvite = async (
  { handle, origin }: PenTestSignIn,
  { token, newPassword }: { token: string; newPassword: string },
): Promise<PenTestCookie[]> => {
  const response = await postJson(origin, "/api/invite-acceptances", {
    token,
    password: newPassword,
  });
  await assertSignInStatus(response, 204, handle, "Invite");
  return readResponseCookies(response);
};

const signInAsFamilyDevice = async (
  { handle, origin }: PenTestSignIn,
  token: string,
): Promise<PenTestCookie[]> => {
  const response = await fetch(new URL("/api/play/family", origin), {
    headers: { cookie: `${familyDeviceCookieName}=${token}` },
  });
  await assertSignInStatus(response, 200, handle, "Family Device");
  await response.body?.cancel();
  return readResponseCookies(response);
};

export const signInAsPenTestFixture = (
  signIn: PenTestSignIn,
): Promise<PenTestCookie[]> => {
  const credential = readPenTestSignInCredential(
    signIn.plan,
    signIn.handle,
    signIn.environment,
  );
  switch (credential.method) {
    case "password":
      return signInWithPassword(signIn, credential);
    case "passkey":
      return signInWithPasskey(signIn, credential.passkey);
    case "invite":
      return signInByAcceptingInvite(signIn, credential);
    case "family-device":
      return signInAsFamilyDevice(signIn, credential.token);
  }
};
