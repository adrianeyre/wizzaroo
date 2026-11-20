import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

export const longestPasskeyName = 40;

export const isPasskeyRegistrationOptions = (
  value: unknown,
): value is PublicKeyCredentialCreationOptionsJSON =>
  typeof value === "object" &&
  value !== null &&
  "challenge" in value &&
  typeof value.challenge === "string" &&
  "rp" in value &&
  typeof value.rp === "object" &&
  "user" in value &&
  typeof value.user === "object" &&
  "pubKeyCredParams" in value &&
  Array.isArray(value.pubKeyCredParams);

export const isPasskeySignInOptions = (
  value: unknown,
): value is PublicKeyCredentialRequestOptionsJSON =>
  typeof value === "object" &&
  value !== null &&
  "challenge" in value &&
  typeof value.challenge === "string";

/** Each step of using or adding a passkey, said beneath what the whole job is doing. */
export const passkeySteps = {
  gettingReady: "Asking Wizzaroo to get a passkey request ready…",
  waiting: "Waiting for your passkey…",
  checking: "Checking your passkey with Wizzaroo…",
  saving: "Saving your passkey with Wizzaroo…",
} as const;

export type PasskeyStep = (typeof passkeySteps)[keyof typeof passkeySteps];

/** Says which passkey step is happening now. */
export type PasskeyStepTeller = (step: PasskeyStep) => void;
