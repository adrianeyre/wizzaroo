import { useState, type SubmitEvent } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  isPasswordLongEnough,
  shortestPasswordLength,
} from "../../server/auth/password.js";
import {
  lastSignInMethodMessage,
  ProblemToShowError,
  readProblem,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";

const passwordChangeFailedMessage =
  "Wizzaroo couldn't change your password. Try again in a moment.";

const passwordRemovalFailedMessage =
  "Wizzaroo couldn't remove your password. Try again in a moment.";

export const findNewPasswordProblem = (
  answers: FormData,
): string | undefined => {
  const newPassword = readTextAnswer(answers, "newPassword");
  if (!isPasswordLongEnough(newPassword)) {
    return `The new password needs at least ${String(shortestPasswordLength)} characters.`;
  }
  if (newPassword !== readTextAnswer(answers, "repeatedPassword")) {
    return "The two new passwords don't match.";
  }
  return undefined;
};

export const NewPasswordFields = () => (
  <>
    <label>
      New password, at least {shortestPasswordLength} characters
      <input
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
      />
    </label>
    <label>
      The new password again
      <input
        name="repeatedPassword"
        type="password"
        autoComplete="new-password"
        required
      />
    </label>
  </>
);

const CurrentPasswordField = () => (
  <label>
    Current password
    <input
      name="currentPassword"
      type="password"
      autoComplete="current-password"
      required
    />
  </label>
);

interface PasswordFormProps {
  onChanged: () => void;
  onCancelled: () => void;
}

export const PasswordForm = ({ onChanged, onCancelled }: PasswordFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const changePassword = async (answers: FormData) => {
    const response = await sendAccountChange("PUT", "/api/password", {
      currentPassword: readTextAnswer(answers, "currentPassword"),
      newPassword: readTextAnswer(answers, "newPassword"),
    });
    if (response.status === 403) {
      setProblem("That isn't your current password.");
      return;
    }
    if (!response.ok) {
      throw new Error(passwordChangeFailedMessage);
    }
    onChanged();
  };

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
        runBusy(
          "Changing your password and signing out your other browsers…",
          () => changePassword(answers),
        ).catch(() => {
          setProblem(passwordChangeFailedMessage);
        });
      }}
    >
      <h2>Change your password</h2>
      <CurrentPasswordField />
      <NewPasswordFields />
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Change my password
      </button>
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};

interface NewPasswordFormProps {
  onSet: () => void;
  onCancelled: () => void;
}

export const NewPasswordForm = ({
  onSet,
  onCancelled,
}: NewPasswordFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const setPassword = async (newPassword: string) => {
    const response = await sendAccountChange("POST", "/api/password", {
      newPassword,
    });
    if (!response.ok) {
      throw new Error(passwordChangeFailedMessage);
    }
    onSet();
  };

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
          setPassword(readTextAnswer(answers, "newPassword")),
        ).catch(() => {
          setProblem(passwordChangeFailedMessage);
        });
      }}
    >
      <h2>Set a password</h2>
      <NewPasswordFields />
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Set my password
      </button>
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};

interface PasswordRemovalFormProps {
  onRemoved: () => void;
  onCancelled: () => void;
}

export const PasswordRemovalForm = ({
  onRemoved,
  onCancelled,
}: PasswordRemovalFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const removePassword = async (currentPassword: string) => {
    const response = await sendAccountChange("DELETE", "/api/password", {
      currentPassword,
    });
    if (response.status === 403) {
      throw new ProblemToShowError("That isn't your current password.");
    }
    if (response.status === 409) {
      throw new ProblemToShowError(lastSignInMethodMessage);
    }
    if (!response.ok) {
      throw new Error(passwordRemovalFailedMessage);
    }
    onRemoved();
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const currentPassword = readTextAnswer(
          new FormData(event.currentTarget),
          "currentPassword",
        );
        runBusy(
          "Removing your password and signing out your other browsers…",
          () => removePassword(currentPassword),
        ).catch((error: unknown) => {
          setProblem(readProblem(error, passwordRemovalFailedMessage));
        });
      }}
    >
      <h2>Remove your password</h2>
      <p>
        You'll sign in with a passkey only, and you're signed out on every other
        browser.
      </p>
      <CurrentPasswordField />
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Remove my password
      </button>
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};
