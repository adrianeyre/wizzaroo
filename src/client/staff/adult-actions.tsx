import { useState } from "react";
import { KeyIcon, MailIcon, UserOffIcon } from "../site-header/icons.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  deactivatePerson,
  readProblemMessage,
  resendInvite,
  sendPasswordReset,
  type InviteStatus,
} from "./staff-api.js";
import {
  ActionNewsLine,
  InviteLink,
  NamedAction,
  StatusPill,
  type ActionNews,
} from "./staff-parts.js";

interface AdultActionsProps {
  userId: string;
  name: string;
  inviteStatus: InviteStatus;
  isDeactivated: boolean;
  canDeactivate: boolean;
  onChanged: () => void;
}

/** What the Admin, or a Parent's Teacher, can do for an adult: neither ever sees or sets their password. */
export const AdultActions = ({
  userId,
  name,
  inviteStatus,
  isDeactivated,
  canDeactivate,
  onChanged,
}: AdultActionsProps) => {
  const [news, setNews] = useState<ActionNews>({ kind: "none" });
  const [inviteUrl, setInviteUrl] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const run = (label: string, action: () => Promise<string>) => {
    runBusy(label, action).then(
      (message) => {
        if (message !== undefined) {
          setNews({ kind: "done", message });
        }
      },
      (error: unknown) => {
        setNews({ kind: "failed", message: readProblemMessage(error) });
      },
    );
  };

  if (isDeactivated) {
    return (
      <p className="row-actions-note">
        <StatusPill tone="neutral">Deactivated</StatusPill>
      </p>
    );
  }
  return (
    <div className="row-actions" aria-busy={isBusy}>
      {inviteStatus === "accepted" ? (
        <button
          type="button"
          className="row-action"
          disabled={isBusy}
          onClick={() => {
            run(`Emailing ${name} a password reset link…`, async () => {
              await sendPasswordReset(userId);
              return `Wizzaroo has emailed ${name} a link to reset their password. It works once, for an hour.`;
            });
          }}
        >
          <KeyIcon />
          Send {name} a password reset
        </button>
      ) : (
        <button
          type="button"
          className="row-action"
          disabled={isBusy}
          onClick={() => {
            run(`Emailing ${name} a new Invite…`, async () => {
              const invite = await resendInvite(userId, "email");
              setInviteUrl(invite.url);
              return `Wizzaroo has emailed ${name} a new Invite.`;
            });
          }}
        >
          <MailIcon />
          Send {name} a new Invite
        </button>
      )}
      {canDeactivate ? (
        <button
          type="button"
          className="row-action danger"
          disabled={isBusy}
          onClick={() => {
            run(`Deactivating ${name}…`, async () => {
              await deactivatePerson(userId);
              onChanged();
              return `${name} can no longer sign in. Their data is kept.`;
            });
          }}
        >
          <UserOffIcon />
          <NamedAction verb="Deactivate" name={name} />
        </button>
      ) : null}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <ActionNewsLine news={news} />
      {inviteUrl === undefined ? null : (
        <InviteLink url={inviteUrl} isEmailed />
      )}
    </div>
  );
};
