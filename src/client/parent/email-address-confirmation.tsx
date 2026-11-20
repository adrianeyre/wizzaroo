import { useState } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import { ReadAloudButton } from "../read-aloud-button.js";

type ConfirmationView =
  | { kind: "asking" }
  | { kind: "confirmed"; email: string }
  | { kind: "refused" }
  | { kind: "failed" };

interface ConfirmedEmailAddress {
  email: string;
}

const isConfirmedEmailAddress = (
  value: unknown,
): value is ConfirmedEmailAddress =>
  typeof value === "object" &&
  value !== null &&
  "email" in value &&
  typeof value.email === "string";

const confirmEmailAddress = async (
  token: string,
): Promise<ConfirmationView> => {
  const response = await fetch("/api/email-address-confirmations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (response.status === 404) {
    return { kind: "refused" };
  }
  const confirmed: unknown = response.ok ? await response.json() : undefined;
  return isConfirmedEmailAddress(confirmed)
    ? { kind: "confirmed", email: confirmed.email }
    : { kind: "failed" };
};

interface EmailAddressConfirmationProps {
  token: string;
  onConfirmed: () => void;
}

export const EmailAddressConfirmation = ({
  token,
  onConfirmed,
}: EmailAddressConfirmationProps) => {
  const [view, setView] = useState<ConfirmationView>({ kind: "asking" });
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const confirm = async () => {
    const confirmation = await confirmEmailAddress(token);
    setView(confirmation);
    if (confirmation.kind === "confirmed") {
      onConfirmed();
    }
  };

  return (
    <section aria-busy={isBusy}>
      <h2>Confirm your email address</h2>
      <ReadAloudButton className="read-aloud is-small" readsSection />
      {view.kind === "asking" || view.kind === "failed" ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            runBusy("Confirming your email address…", confirm).catch(() => {
              setView({ kind: "failed" });
            });
          }}
        >
          Confirm my email address
        </button>
      ) : null}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      {view.kind === "confirmed" ? (
        <p role="status">Thank you. {view.email} is confirmed.</p>
      ) : null}
      {view.kind === "refused" ? (
        <p role="alert">
          That link has expired or has already been used. Sign in and ask for a
          new one.
        </p>
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't confirm your email address. Try again in a moment.
        </p>
      ) : null}
    </section>
  );
};
