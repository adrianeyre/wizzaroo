import { useCallback, useEffect, useState } from "react";
import { CloseIcon, TrashIcon } from "../site-header/icons.js";
import { Pagination, usePagination } from "../staff/pagination.js";
import { StaffPageHeader } from "../staff/staff-parts.js";
import { sendAccountChange } from "./account-changes.js";
import { getInitial } from "./child-face.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

interface AdminDeletionRequest {
  id: string;
  familyName: string;
  childId: string | null;
  childNickname: string | null;
  requestedBy: string;
  createdAt: string;
}

interface AdminChild {
  id: string;
  nickname: string;
}

interface AdminFamily {
  id: string;
  name: string;
  children: AdminChild[];
}

type AdminView =
  | { kind: "loading" }
  | {
      kind: "listed";
      deletionRequests: AdminDeletionRequest[];
      families: AdminFamily[];
    }
  | { kind: "failed" };

// The Admin deletes a Child or a Family only once one of its Parents has asked (#284), so a deletion is always a
// request's confirmation.
interface Deletion {
  label: string;
  path: string;
}

const deletionFailedMessage =
  "Wizzaroo couldn't delete it. Try again in a moment.";

const isAdminDeletionRequest = (
  value: unknown,
): value is AdminDeletionRequest =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "familyName" in value &&
  typeof value.familyName === "string" &&
  "childId" in value &&
  (value.childId === null || typeof value.childId === "string") &&
  "childNickname" in value &&
  (value.childNickname === null || typeof value.childNickname === "string") &&
  "requestedBy" in value &&
  typeof value.requestedBy === "string" &&
  "createdAt" in value &&
  typeof value.createdAt === "string";

const isAdminChild = (value: unknown): value is AdminChild =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "nickname" in value &&
  typeof value.nickname === "string";

const isAdminFamily = (value: unknown): value is AdminFamily =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string" &&
  "children" in value &&
  Array.isArray(value.children) &&
  value.children.every(isAdminChild);

const fetchAdminView = async (): Promise<AdminView> => {
  const [deletionRequestsResponse, familiesResponse] = await Promise.all([
    fetch("/api/admin/deletion-requests"),
    fetch("/api/admin/families"),
  ]);
  const deletionRequests: unknown = deletionRequestsResponse.ok
    ? await deletionRequestsResponse.json()
    : undefined;
  const families: unknown = familiesResponse.ok
    ? await familiesResponse.json()
    : undefined;
  return Array.isArray(deletionRequests) &&
    deletionRequests.every(isAdminDeletionRequest) &&
    Array.isArray(families) &&
    families.every(isAdminFamily)
    ? { kind: "listed", deletionRequests, families }
    : { kind: "failed" };
};

const sendDeletion = async ({ path }: Deletion): Promise<void> => {
  const response = await sendAccountChange("POST", path);
  if (!response.ok) {
    throw new Error(deletionFailedMessage);
  }
};

const describeRequestedDeletion = ({
  familyName,
  childId,
  childNickname,
}: AdminDeletionRequest): string =>
  childId === null
    ? `the whole of ${familyName}`
    : `${childNickname ?? "a Child"} in ${familyName}`;

interface DeletionButtonProps {
  deletion: Deletion;
  onDeleted: () => void;
}

const DeletionButton = ({ deletion, onDeleted }: DeletionButtonProps) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  return (
    <>
      {isConfirming ? (
        <span className="confirm-actions" aria-busy={isBusy}>
          <button
            type="button"
            className="danger solid"
            disabled={isBusy}
            onClick={() => {
              runBusy(`Deleting ${deletion.label} for good…`, async () => {
                await sendDeletion(deletion);
                return true;
              }).then(
                (isDeleted) => {
                  if (isDeleted === true) {
                    onDeleted();
                  }
                },
                () => {
                  setProblem(deletionFailedMessage);
                },
              );
            }}
          >
            <TrashIcon />
            Yes, delete {deletion.label} for good
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setIsConfirming(false);
            }}
          >
            <CloseIcon />
            Keep it
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="danger"
          onClick={() => {
            setIsConfirming(true);
          }}
        >
          <TrashIcon />
          Delete {deletion.label}
        </button>
      )}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
    </>
  );
};

export const AdminPanel = () => {
  const [view, setView] = useState<AdminView>({ kind: "loading" });

  const showAdminView = useCallback(() => {
    void fetchAdminView().then(setView, () => {
      setView({ kind: "failed" });
    });
  }, []);

  useEffect(showAdminView, [showAdminView]);

  const listedFamilies = view.kind === "listed" ? view.families : [];
  const familyPagination = usePagination(listedFamilies);

  return (
    <section className="staff-panel">
      <StaffPageHeader
        area="admin"
        title="Admin"
        intro="Delete what Parents have asked to be deleted. Nothing is deleted until a Parent of the Family asks, and a deletion can't be undone."
      />
      {view.kind === "loading" ? (
        <BusyProgress label="Loading the deletion requests and Families…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn&apos;t load the Admin dashboard. Try again in a
          moment.
        </p>
      ) : null}
      {view.kind === "listed" ? (
        <>
          <h2>Deletion requests</h2>
          {view.deletionRequests.length === 0 ? (
            <p className="staff-empty-note">
              No Parent is waiting for anything to be deleted.
            </p>
          ) : (
            <ul className="admin-deletions">
              {view.deletionRequests.map((deletionRequest) => (
                <li key={deletionRequest.id}>
                  <p>
                    {deletionRequest.requestedBy} asked to delete{" "}
                    {describeRequestedDeletion(deletionRequest)}
                  </p>
                  <DeletionButton
                    deletion={{
                      label: describeRequestedDeletion(deletionRequest),
                      path: `/api/admin/deletion-requests/${deletionRequest.id}/confirmation`,
                    }}
                    onDeleted={showAdminView}
                  />
                </li>
              ))}
            </ul>
          )}
          <h2>Families</h2>
          <Pagination pagination={familyPagination} itemsName="Families">
            <ul className="admin-families">
              {familyPagination.pageItems.map((family) => (
                <li key={family.id}>
                  <div className="admin-family-header">
                    <span
                      className="person-avatar"
                      data-initial={getInitial(family.name)}
                      aria-hidden="true"
                    />
                    <h3>{family.name}</h3>
                  </div>
                  <ul className="admin-family-children">
                    {family.children.map((child) => (
                      <li key={child.id}>
                        <span>{child.nickname}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Pagination>
        </>
      ) : null}
    </section>
  );
};
