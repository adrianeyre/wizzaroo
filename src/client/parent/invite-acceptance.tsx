import { useState, type SubmitEvent } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  ProblemToShowError,
  readProblem,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";
import { findNewPasswordProblem, NewPasswordFields } from "./password-forms.js";
import { ReadAloudButton } from "../read-aloud-button.js";

type InviteAcceptanceView =
  { kind: "setting-up" } | { kind: "set-up" } | { kind: "refused" };

const inviteAcceptanceFailedMessage =
  "Wizzaroo couldn't set up your login. Try again in a moment.";

const heading = "Set up your Wizzaroo login";

interface InviteAcceptanceFormProps {
  token: string;
  onAccepted: () => void;
}

/** The Admin or a Teacher already made the login and chose its email address, so whoever opens the Invite only sets a password. */
export const InviteAcceptanceForm = ({
  token,
  onAccepted,
}: InviteAcceptanceFormProps) => {
  const [view, setView] = useState<InviteAcceptanceView>({
    kind: "setting-up",
  });
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const acceptInvite = async (password: string) => {
    const response = await sendAccountChange(
      "POST",
      "/api/invite-acceptances",
      { token, password },
    );
    if (response.status === 404) {
      setView({ kind: "refused" });
      return;
    }
    if (!response.ok) {
      throw new ProblemToShowError(inviteAcceptanceFailedMessage);
    }
    setView({ kind: "set-up" });
    onAccepted();
  };

  if (view.kind === "set-up") {
    return (
      <section>
        <h2>{heading}</h2>
        <ReadAloudButton className="read-aloud is-small" readsSection />
        <p role="status">
          Welcome to Wizzaroo. Your login is set up and you&apos;re signed in.
        </p>
      </section>
    );
  }

  if (view.kind === "refused") {
    return (
      <section>
        <h2>{heading}</h2>
        <ReadAloudButton className="read-aloud is-small" readsSection />
        <p role="alert">
          That Invite has expired, been used or been replaced by a newer one.
          Ask whoever invited you to send a new one.
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
        runBusy("Setting up your login and signing you in…", () =>
          acceptInvite(readTextAnswer(answers, "newPassword")),
        ).catch((error: unknown) => {
          setProblem(readProblem(error, inviteAcceptanceFailedMessage));
        });
      }}
    >
      <h2>{heading}</h2>
      <ReadAloudButton className="read-aloud is-small" readsSection />
      <p>
        You&apos;ve been invited to Wizzaroo. Choose a password: you&apos;ll
        sign in with the email address this Invite was sent to and this
        password.
      </p>
      <NewPasswordFields />
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Set up my login
      </button>
    </form>
  );
};
