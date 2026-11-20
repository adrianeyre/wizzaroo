import { useCallback, useEffect, useState } from "react";
import { sendAccountChange } from "./account-changes.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

interface WaitingAdult {
  userId: string;
  name: string | null;
  email: string;
  requestedAt: string;
}

type WaitingView =
  | { kind: "loading" }
  | { kind: "listed"; waitingAdults: WaitingAdult[] }
  | { kind: "failed" };

const answerFailedMessage =
  "Wizzaroo couldn't send your answer. Try again in a moment.";

const isWaitingAdult = (value: unknown): value is WaitingAdult =>
  typeof value === "object" &&
  value !== null &&
  "userId" in value &&
  typeof value.userId === "string" &&
  "name" in value &&
  (value.name === null || typeof value.name === "string") &&
  "email" in value &&
  typeof value.email === "string" &&
  "requestedAt" in value &&
  typeof value.requestedAt === "string";

const fetchWaitingView = async (): Promise<WaitingView> => {
  const response = await fetch("/api/family-join-requests");
  const waitingAdults: unknown = response.ok ? await response.json() : null;
  return Array.isArray(waitingAdults) && waitingAdults.every(isWaitingAdult)
    ? { kind: "listed", waitingAdults }
    : { kind: "failed" };
};

const formatAskedDate = (date: string): string =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
    new Date(date),
  );

/**
 * A Teacher can ask for an adult to join the Family, but only a Parent of the Family lets them in (#264). Agreeing
 * makes them a Parent here and emails them their Invite; turning it down removes them.
 */
export const FamilyJoinRequests = () => {
  const [view, setView] = useState<WaitingView>({ kind: "loading" });
  const [news, setNews] = useState<
    { kind: "status" | "alert"; message: string } | undefined
  >();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const showWaiting = useCallback(() => {
    void fetchWaitingView().then(setView, () => {
      setView({ kind: "failed" });
    });
  }, []);

  useEffect(showWaiting, [showWaiting]);

  const answer = (adult: WaitingAdult, isAgreed: boolean) => {
    const path = `/api/family-join-requests/${adult.userId}`;
    const who = adult.name ?? adult.email;
    void runBusy(
      isAgreed
        ? `Letting ${who} join your Family and emailing them their Invite…`
        : `Turning down ${who}'s request to join your Family…`,
      () =>
        isAgreed
          ? sendAccountChange("PUT", `${path}/agreement`)
          : sendAccountChange("DELETE", path),
    ).then(
      (response) => {
        if (response === undefined) {
          return;
        }
        setNews(
          response.ok
            ? {
                kind: "status",
                message: isAgreed
                  ? `${adult.email} has joined your Family, and Wizzaroo has emailed them their Invite.`
                  : `${adult.email} won't join your Family.`,
              }
            : { kind: "alert", message: answerFailedMessage },
        );
        showWaiting();
      },
      () => {
        setNews({ kind: "alert", message: answerFailedMessage });
      },
    );
  };

  return (
    <>
      <h2>Adults asking to join your Family</h2>
      <p>
        A Teacher can ask for another adult in your household to join your
        Family. They join only if you agree, and then they can see and change
        everything about your Children, as you can. If you don&apos;t know them,
        turn it down.
      </p>
      {view.kind === "loading" ? (
        <BusyProgress label="Loading who is asking to join your Family…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn&apos;t load who is asking to join. Try again in a
          moment.
        </p>
      ) : null}
      {news === undefined ? null : <p role={news.kind}>{news.message}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      {view.kind === "listed" && view.waitingAdults.length === 0 ? (
        <p>No one is waiting to join your Family.</p>
      ) : null}
      {view.kind === "listed" && view.waitingAdults.length > 0 ? (
        <ul aria-busy={isBusy}>
          {view.waitingAdults.map((adult) => (
            <li key={adult.userId}>
              <p>
                {adult.name === null
                  ? adult.email
                  : `${adult.name}, ${adult.email}`}
                , asked for on {formatAskedDate(adult.requestedAt)}. Their
                Invite would go to {adult.email}.
              </p>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  answer(adult, true);
                }}
              >
                Let them join
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  answer(adult, false);
                }}
              >
                Turn it down
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
};
