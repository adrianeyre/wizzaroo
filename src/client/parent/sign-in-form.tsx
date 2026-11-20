import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";
import { useState, type SubmitEvent } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import { parentSiteTitle, usePageTitle } from "../page-title.js";
import {
  ProblemToShowError,
  readProblem,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";
import {
  isPasskeySignInOptions,
  passkeySteps,
  type PasskeyStepTeller,
} from "./passkey-options.js";
import { ForgottenPasswordForm } from "./password-reset.js";

type SignInStep = "password" | "two-factor-code" | "forgotten-password";

const signInFailedMessage =
  "Wizzaroo couldn't sign you in. Try again in a moment.";

const tooManyTriesMessage =
  "Too many tries for this account, so Wizzaroo has paused signing in with a code. Wait an hour, then sign in again, or use a passkey.";

// The password step answers 429 for too many wrong passwords for the address, too many tries from this connection, or
// too many sign-ins that ask for a code: each passes within the hour, and a passkey still works.
const tooManySignInsMessage =
  "Too many tries to sign in, so Wizzaroo has paused signing in with a password for a while. Wait up to an hour, then try again, or use a passkey.";

const passkeySignInFailedMessage =
  "Wizzaroo couldn't sign you in with a passkey. Try again, or use your password.";

const signInWithPasskey = async (
  tellStep: PasskeyStepTeller,
): Promise<void> => {
  tellStep(passkeySteps.gettingReady);
  const optionsResponse = await sendAccountChange(
    "POST",
    "/api/passkey-sign-in-options",
  );
  const optionsJSON: unknown = optionsResponse.ok
    ? await optionsResponse.json()
    : undefined;
  if (!isPasskeySignInOptions(optionsJSON)) {
    throw new Error("Wizzaroo didn't send the passkey's options");
  }
  tellStep(passkeySteps.waiting);
  const response = await startAuthentication({ optionsJSON });
  tellStep(passkeySteps.checking);
  const signInResponse = await sendAccountChange(
    "POST",
    "/api/passkey-sign-ins",
    { response },
  );
  if (signInResponse.status === 401) {
    throw new ProblemToShowError(
      "That passkey doesn't belong to a Wizzaroo account. Try another, or use your password.",
    );
  }
  if (!signInResponse.ok) {
    throw new Error(passkeySignInFailedMessage);
  }
};

interface TwoFactorCodeFormProps {
  onSignedIn: () => void;
  onStartedAgain: () => void;
}

const TwoFactorCodeForm = ({
  onSignedIn,
  onStartedAgain,
}: TwoFactorCodeFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const sendCode = async (code: string) => {
    const response = await sendAccountChange(
      "POST",
      "/api/sign-in/two-factor-code",
      { code },
    );
    if (response.status === 401) {
      throw new ProblemToShowError(
        "That code didn't work. Try the newest one, or start again.",
      );
    }
    if (response.status === 429) {
      throw new ProblemToShowError(tooManyTriesMessage);
    }
    if (!response.ok) {
      throw new Error(signInFailedMessage);
    }
    onSignedIn();
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const code = readTextAnswer(new FormData(event.currentTarget), "code");
        runBusy("Checking your code and signing you in…", () =>
          sendCode(code),
        ).catch((error: unknown) => {
          setProblem(readProblem(error, signInFailedMessage));
        });
      }}
    >
      <h1>Enter your code</h1>
      <p>
        Type the 6-digit code your authenticator app shows for Wizzaroo, or one
        of your recovery codes.
      </p>
      <label>
        Code
        <input name="code" autoComplete="one-time-code" required />
      </label>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Sign in
      </button>
      <button type="button" onClick={onStartedAgain}>
        Start again
      </button>
    </form>
  );
};

interface SignInFormProps {
  onSignedIn: () => void;
}

const signInPageTitles: Record<SignInStep, string> = {
  password: "Sign in",
  "two-factor-code": "Enter your code",
  "forgotten-password": "Reset your password",
};

export const SignInForm = ({ onSignedIn }: SignInFormProps) => {
  const [step, setStep] = useState<SignInStep>("password");
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const [passkeyStep, setPasskeyStep] = useState<string>();
  usePageTitle(signInPageTitles[step], parentSiteTitle);

  if (step === "two-factor-code") {
    return (
      <TwoFactorCodeForm
        onSignedIn={onSignedIn}
        onStartedAgain={() => {
          setProblem(undefined);
          setStep("password");
        }}
      />
    );
  }

  if (step === "forgotten-password") {
    return (
      <ForgottenPasswordForm
        onCancelled={() => {
          setStep("password");
        }}
      />
    );
  }

  const signIn = async (answers: FormData) => {
    const response = await sendAccountChange("POST", "/api/sign-in", {
      email: answers.get("email"),
      password: answers.get("password"),
    });
    if (response.status === 202) {
      setStep("two-factor-code");
      return;
    }
    if (response.ok) {
      onSignedIn();
      return;
    }
    setProblem(
      response.status === 401
        ? "That email address and password don't match. Try again."
        : response.status === 429
          ? tooManySignInsMessage
          : signInFailedMessage,
    );
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const answers = new FormData(event.currentTarget);
        setPasskeyStep(undefined);
        runBusy("Signing you in…", () => signIn(answers)).catch(() => {
          setProblem(signInFailedMessage);
        });
      }}
    >
      <h1>Sign in to Wizzaroo</h1>
      <label>
        Email address
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : (
        <BusyProgress label={busyLabel} detail={passkeyStep} />
      )}
      <button type="submit" disabled={isBusy}>
        Sign in
      </button>
      <button
        type="button"
        onClick={() => {
          setProblem(undefined);
          setStep("forgotten-password");
        }}
      >
        Forgot your password?
      </button>
      {browserSupportsWebAuthn() ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setProblem(undefined);
            setPasskeyStep(undefined);
            runBusy("Signing you in with your passkey…", async () => {
              await signInWithPasskey(setPasskeyStep);
              onSignedIn();
            }).catch((error: unknown) => {
              setProblem(readProblem(error, passkeySignInFailedMessage));
            });
          }}
        >
          Sign in with a passkey
        </button>
      ) : null}
    </form>
  );
};
