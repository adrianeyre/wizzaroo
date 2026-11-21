import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useState, type SubmitEvent } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  ProblemToShowError,
  readProblem,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";
import { answerOwnPasskeyChallenge } from "./passkeys.js";
import { QrCode } from "./qr-code.js";

/** What an adult gives to prove it's them before another device is signed in as them. */
type SignInCodeProof =
  { currentPassword: string } | { code: string } | { passkey: unknown };

export interface SignInCode {
  code: string;
  url: string;
  expiresAt: string;
}

const signInCodeFailedMessage =
  "Wizzaroo couldn't make a sign-in code. Try again in a moment.";

const signInCodeProofProblems = new Map([
  [
    "account-proof-required",
    "Prove it's you first: enter your password or a code, or use your passkey.",
  ],
  [
    "second-factor-proof-required",
    "Teachers and the Admin prove it's them with a passkey or a code from their authenticator app.",
  ],
]);

const wrongSignInCodeProofMessage =
  "That didn't prove it's you, so Wizzaroo made no code. Try again.";

const isSignInCode = (value: unknown): value is SignInCode =>
  typeof value === "object" &&
  value !== null &&
  "code" in value &&
  typeof value.code === "string" &&
  "url" in value &&
  typeof value.url === "string" &&
  "expiresAt" in value &&
  typeof value.expiresAt === "string";

const readErrorCode = async (response: Response): Promise<unknown> => {
  const body: unknown = await response.json().catch(() => undefined);
  return typeof body === "object" && body !== null && "code" in body
    ? body.code
    : undefined;
};

const readTypedProof = (answers: FormData): SignInCodeProof | undefined => {
  const currentPassword = readTextAnswer(answers, "currentPassword");
  if (currentPassword !== "") {
    return { currentPassword };
  }
  const code = readTextAnswer(answers, "code");
  return code === "" ? undefined : { code };
};

const createSignInCode = async (
  proof: SignInCodeProof | undefined,
): Promise<SignInCode> => {
  const response = await sendAccountChange("POST", "/api/sign-in-codes", {
    ...proof,
  });
  if (response.status === 403) {
    const code = await readErrorCode(response);
    throw new ProblemToShowError(
      (typeof code === "string"
        ? signInCodeProofProblems.get(code)
        : undefined) ?? wrongSignInCodeProofMessage,
    );
  }
  if (response.status === 429) {
    throw new ProblemToShowError(
      "Too many tries. Wait a while, then try again.",
    );
  }
  const signInCode: unknown = response.ok ? await response.json() : undefined;
  if (!isSignInCode(signInCode)) {
    throw new Error(signInCodeFailedMessage);
  }
  return signInCode;
};

const formatExpiryTime = (expiresAt: string): string =>
  new Intl.DateTimeFormat("en-GB", { timeStyle: "short" }).format(
    new Date(expiresAt),
  );

interface SignInCodeShownProps {
  signInCode: SignInCode;
  onDone: () => void;
}

const SignInCodeShown = ({
  signInCode: { code, url, expiresAt },
  onDone,
}: SignInCodeShownProps) => (
  <section aria-labelledby="sign-in-code-shown">
    <h2 id="sign-in-code-shown">Your sign-in code</h2>
    <p className="sign-in-code">
      <code>{code}</code>
    </p>
    <ol>
      <li>
        On the other device, open{" "}
        <strong>{new URL("/parent/", url).href}</strong>
      </li>
      <li>
        Choose <strong>Sign in with a code from another device</strong>
      </li>
      <li>Type the code above</li>
    </ol>
    <p>Or, if the other device has a camera, scan this QR code with it.</p>
    <QrCode text={url} label="QR code to sign in on another device" />
    <p>
      The code works once, until {formatExpiryTime(expiresAt)}. Keep it to
      yourself: whoever types it in is signed in as you. Once you&apos;re signed
      in there, you can add a passkey on that device or make it a Family Device.
    </p>
    <button type="button" onClick={onDone}>
      Done
    </button>
  </section>
);

interface SignInCodeFormProps {
  hasPassword: boolean;
  hasPasskey: boolean;
  isTwoFactorOn: boolean;
  isStaff: boolean;
  onDone: () => void;
  onCancelled: () => void;
}

/**
 * Makes a short code that signs another device in as this adult, such as a tablet that can't use the passkey kept on
 * this computer. The other device outlives this sign-in, so it takes a fresh proof first, as a Family Device does.
 */
export const SignInCodeForm = ({
  hasPassword,
  hasPasskey,
  isTwoFactorOn,
  isStaff,
  onDone,
  onCancelled,
}: SignInCodeFormProps) => {
  const [problem, setProblem] = useState<string>();
  const [signInCode, setSignInCode] = useState<SignInCode>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const [passkeyStep, setPasskeyStep] = useState<string>();
  const isPasswordOffered = hasPassword && !isStaff;
  const isPasskeyOffered = hasPasskey && browserSupportsWebAuthn();

  if (signInCode !== undefined) {
    return <SignInCodeShown signInCode={signInCode} onDone={onDone} />;
  }

  const makeSignInCode = (
    readProof: () => Promise<SignInCodeProof | undefined>,
  ) =>
    runBusy("Checking it's you and making a sign-in code…", async () => {
      const made = await createSignInCode(await readProof());
      setPasskeyStep(undefined);
      setSignInCode(made);
    });
  const showProblem = (error: unknown) => {
    setProblem(readProblem(error, signInCodeFailedMessage));
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setProblem(undefined);
        const answers = new FormData(event.currentTarget);
        makeSignInCode(() => Promise.resolve(readTypedProof(answers))).catch(
          showProblem,
        );
      }}
    >
      <h2>Sign in on another device</h2>
      <p>
        Wizzaroo makes a short code you type on the other device, such as a
        tablet that can&apos;t use the passkey on this one. Prove it&apos;s you
        first, since that device will be signed in as you.
      </p>
      {isPasswordOffered ? (
        <label>
          Your password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
          />
        </label>
      ) : null}
      {isTwoFactorOn ? (
        <label>
          {isPasswordOffered ? "Or a code" : "A code"} from your authenticator
          app
          <input name="code" inputMode="numeric" autoComplete="one-time-code" />
        </label>
      ) : null}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : (
        <BusyProgress label={busyLabel} detail={passkeyStep} />
      )}
      {isPasswordOffered || isTwoFactorOn ? (
        <button type="submit" disabled={isBusy}>
          Make a sign-in code
        </button>
      ) : null}
      {isPasskeyOffered ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setProblem(undefined);
            setPasskeyStep(undefined);
            makeSignInCode(async () => ({
              passkey: await answerOwnPasskeyChallenge(
                "You have no passkeys yet.",
                setPasskeyStep,
              ),
            })).catch(showProblem);
          }}
        >
          Use your passkey and make a sign-in code
        </button>
      ) : null}
      {isPasswordOffered || isTwoFactorOn || isPasskeyOffered ? null : (
        <p role="alert">
          Set up a passkey or two-factor authentication first, then make a
          sign-in code.
        </p>
      )}
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};
