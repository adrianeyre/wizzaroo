import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import {
  readProblem,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";
import { FamilyJoinRequests } from "./family-join-requests.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

interface DeletionRequest {
  id: string;
  childId: string | null;
  childNickname: string | null;
  createdAt: string;
}

interface NamedChild {
  id: string;
  nickname: string;
}

type FamilyDataView =
  | { kind: "loading" }
  | {
      kind: "listed";
      familyChildren: NamedChild[];
      deletionRequests: DeletionRequest[];
    }
  | { kind: "failed" };

const wholeFamilyChoice = "whole-family";

const deletionRequestFailedMessage =
  "Wizzaroo couldn't send your request. Try again in a moment.";

const isDeletionRequest = (value: unknown): value is DeletionRequest =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "childId" in value &&
  (value.childId === null || typeof value.childId === "string") &&
  "childNickname" in value &&
  (value.childNickname === null || typeof value.childNickname === "string") &&
  "createdAt" in value &&
  typeof value.createdAt === "string";

const isNamedChild = (value: unknown): value is NamedChild =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "nickname" in value &&
  typeof value.nickname === "string";

const formatRequestDate = (date: string): string =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
    new Date(date),
  );

const fetchFamilyDataView = async (): Promise<FamilyDataView> => {
  const [childrenResponse, deletionRequestsResponse] = await Promise.all([
    fetch("/api/children"),
    fetch("/api/deletion-requests"),
  ]);
  const familyChildren: unknown = childrenResponse.ok
    ? await childrenResponse.json()
    : undefined;
  const deletionRequests: unknown = deletionRequestsResponse.ok
    ? await deletionRequestsResponse.json()
    : undefined;
  return Array.isArray(familyChildren) &&
    familyChildren.every(isNamedChild) &&
    Array.isArray(deletionRequests) &&
    deletionRequests.every(isDeletionRequest)
    ? {
        kind: "listed",
        familyChildren: familyChildren.map(({ id, nickname }) => ({
          id,
          nickname,
        })),
        deletionRequests,
      }
    : { kind: "failed" };
};

const createDeletionRequest = async (choice: string): Promise<void> => {
  const response = await sendAccountChange(
    "POST",
    "/api/deletion-requests",
    choice === wholeFamilyChoice ? {} : { childId: choice },
  );
  if (!response.ok) {
    throw new Error(deletionRequestFailedMessage);
  }
};

const describeDeletionRequest = ({
  childId,
  childNickname,
}: DeletionRequest): string =>
  childId === null
    ? "Everything about your Family"
    : `Everything about ${childNickname ?? "a Child"}`;

interface DeletionRequestFormProps {
  familyChildren: NamedChild[];
  onRequested: () => void;
}

const DeletionRequestForm = ({
  familyChildren,
  onRequested,
}: DeletionRequestFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const askForDeletion = async (form: HTMLFormElement) => {
    const choice = readTextAnswer(new FormData(form), "deletionChoice");
    const nickname = familyChildren.find(({ id }) => id === choice)?.nickname;
    const isAsked = await runBusy(
      `Asking the Admin to delete everything about ${nickname ?? "your Family"}…`,
      async () => {
        await createDeletionRequest(choice);
        return true;
      },
    );
    if (isAsked === true) {
      setProblem(undefined);
      onRequested();
    }
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        askForDeletion(event.currentTarget).catch((error: unknown) => {
          setProblem(readProblem(error, deletionRequestFailedMessage));
        });
      }}
    >
      <label>
        What to delete
        <select name="deletionChoice" defaultValue={wholeFamilyChoice}>
          {familyChildren.map((child) => (
            <option key={child.id} value={child.id}>
              Everything about {child.nickname}
            </option>
          ))}
          <option value={wholeFamilyChoice}>
            Everything about your Family, its Children and its Parents
          </option>
        </select>
      </label>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Ask for it to be deleted
      </button>
    </form>
  );
};

export const FamilyDataPanel = () => {
  const [view, setView] = useState<FamilyDataView>({ kind: "loading" });
  const [hasRequested, setHasRequested] = useState(false);

  const showFamilyData = useCallback(() => {
    void fetchFamilyDataView().then(setView, () => {
      setView({ kind: "failed" });
    });
  }, []);

  useEffect(showFamilyData, [showFamilyData]);

  return (
    <section>
      <h1>Your Family&apos;s data</h1>
      <FamilyJoinRequests />
      <h2>Download it</h2>
      <p>
        One file with everything Wizzaroo keeps about your Family, its Children
        and you: every Child, their Character and everything they played, your
        Family Devices and Invites, and your account. Passwords and other
        secrets are left out.
      </p>
      <a href="/api/family-export" download>
        Download your Family&apos;s data
      </a>
      <h2>Have it deleted</h2>
      <p>
        Ask for a Child, or your whole Family, to be removed from Wizzaroo. The
        Admin confirms it, and then everything about them is deleted for good,
        including what they played.
      </p>
      {view.kind === "loading" ? (
        <BusyProgress label="Loading your deletion requests…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn&apos;t load your deletion requests. Try again in a
          moment.
        </p>
      ) : null}
      {view.kind === "listed" ? (
        <>
          <DeletionRequestForm
            familyChildren={view.familyChildren}
            onRequested={() => {
              setHasRequested(true);
              showFamilyData();
            }}
          />
          {hasRequested ? (
            <p role="status">
              Your request is with the Admin, who will delete it soon.
            </p>
          ) : null}
          <h3>Waiting for the Admin</h3>
          {view.deletionRequests.length === 0 ? (
            <p>Nothing waiting to be deleted.</p>
          ) : (
            <ul>
              {view.deletionRequests.map((deletionRequest) => (
                <li key={deletionRequest.id}>
                  {describeDeletionRequest(deletionRequest)}, asked for on{" "}
                  {formatRequestDate(deletionRequest.createdAt)}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
};
