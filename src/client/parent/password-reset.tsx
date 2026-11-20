import { useState, type SubmitEvent } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import { readTextAnswer, sendAccountChange } from "./account-changes.js";
import { findNewPasswordProblem, NewPasswordFields } from "./password-forms.js";
import { ReadAloudButton } from "../read-aloud-button.js";

const passwordResetRequestFailedMessage =
  "Wizzaroo couldn't send a link. Try again in a moment.";

const passwordResetFailedMessage =
  "Wizzaroo couldn't reset your password. Try again in a moment.";

interface ForgottenPasswordFormProps {
  onCancelled: () => void;
}

export const ForgottenPasswordForm = ({
  onCancelled,
}: ForgottenPasswordFormProps) => {
  const [emailedAddress, setEmailedAddress] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const askForPasswordReset = async (email: string) => {
    const response = await sendAccountChange(
      "POST",
      "/api/password-reset-requests",
      { email },
    );
    if (!response.ok) {
      throw new Error(passwordResetRequestFailedMessage);
    }
    setProblem(undefined);
    setEmailedAddress(email);
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const email = readTextAnswer(
          new FormData(event.currentTarget),
          "email",
        );
        runBusy("Emailing you a link to reset your password…", () =>
          askForPasswordReset(email),
        ).catch(() => {
          setProblem(passwordResetRequestFailedMessage);
        });
      }}
    >
      <h1>Reset your password</h1>
      <ReadAloudButton className="read-aloud is-small" readsSection />
      {emailedAddress === undefined ? (
        <>
          <p>
            Give the email address you sign in with. If it's confirmed, Wizzaroo
            emails it a link to choose a new password.
          </p>
          <label>
            Email address
            <input name="email" type="email" autoComplete="username" required />
          </label>
          {problem === undefined ? null : <p role="alert">{problem}</p>}
          {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
          <button type="submit" disabled={isBusy}>
            Email me a link
          </button>
        </>
      ) : (
        <p role="status">
          If {emailedAddress} is the confirmed email address of a Wizzaroo
          account, a link to reset its password is on its way. The link works
          once, for 1 hour.
        </p>
      )}
      <button type="button" onClick={onCancelled}>
        Back to signing in
      </button>
    </form>
  );
};

type PasswordResetView = "choosing" | "reset" | "refused";

interface PasswordResetFormProps {
  token: string;
  onReset: () => void;
}

export const PasswordResetForm = ({
  token,
  onReset,
}: PasswordResetFormProps) => {
  const [view, setView] = useState<PasswordResetView>("choosing");
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const resetPassword = async (newPassword: string) => {
    const response = await sendAccountChange("POST", "/api/password-resets", {
      token,
      newPassword,
    });
    if (response.status === 404) {
      setView("refused");
      return;
    }
    if (!response.ok) {
      throw new Error(passwordResetFailedMessage);
    }
    setView("reset");
    onReset();
  };

  if (view === "reset") {
    return (
      <section>
        <h2>Choose a new password</h2>
        <ReadAloudButton className="read-aloud is-small" readsSection />
        <p role="status">
          Your password is changed, and every browser that was signed in to your
          account is signed out. Sign in with your new password.
        </p>
      </section>
    );
  }

  if (view === "refused") {
    return (
      <section>
        <h2>Choose a new password</h2>
        <ReadAloudButton className="read-aloud is-small" readsSection />
        <p role="alert">
          That link has expired or has already been used. Ask for a new one with
          "Forgot your password?".
        </p>
      </section>
    );
  }

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const answers = new FormData(event.currentTarget);
        const newPasswordProblem = findNewPasswordProblem(answers);
        if (newPasswordProblem !== undefined) {
          setProblem(newPasswordProblem);
          return;
        }
        runBusy("Saving your new password…", () =>
          resetPassword(readTextAnswer(answers, "newPassword")),
        ).catch(() => {
          setProblem(passwordResetFailedMessage);
        });
      }}
    >
      <h2>Choose a new password</h2>
      <ReadAloudButton className="read-aloud is-small" readsSection />
      <NewPasswordFields />
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Reset my password
      </button>
    </form>
  );
};
