import { useEffect, useState } from "react";
import {
  auditActions,
  type AuditAction,
} from "../../server/audit/audit-actions.js";
import { Pagination } from "./pagination.js";
import {
  fetchAuditLogPage,
  type AuditLogEntry,
  type AuditLogFilter,
  type AuditLogPage,
} from "./staff-api.js";
import { StaffPageHeader, StaffTable } from "./staff-parts.js";
import { BusyProgress } from "../busy/busy-progress.js";

/** The page and filter a listed page was loaded for, so a newer choice still loading can be told apart. */
interface AuditLogRequest {
  pageNumber: number;
  filter: AuditLogFilter;
}

type AuditLogView =
  | { kind: "loading" }
  | { kind: "listed"; auditLogPage: AuditLogPage; request: AuditLogRequest }
  | { kind: "failed" };

const auditActionNames: Record<AuditAction, string> = {
  "sign-in.succeeded": "Signed in",
  "sign-in.failed": "Sign-in failed",
  "sign-out": "Signed out",
  "two-factor.turned-on": "Turned on two-factor",
  "two-factor.turned-off": "Turned off two-factor",
  "two-factor.turn-off-refused": "Refused a code to turn off two-factor",
  "passkey.added": "Added a passkey",
  "passkey.removed": "Removed a passkey",
  "password.changed": "Changed their password",
  "password.created": "Set a password",
  "password.removed": "Removed their password",
  "password.reset": "Reset their password",
  "email-address.changed": "Changed their email address",
  "family-device.created": "Made a Family Device",
  "family-device.revoked": "Signed out a Family Device",
  "picture-password.set": "Set a Picture Password",
  "school.created": "Added a School",
  "school.deleted": "Deleted a School",
  "school.classmate-visits-changed": "Changed Classmate visits",
  "teacher.created": "Added a Teacher",
  "teacher.year-groups-changed": "Changed a Teacher's Year Groups",
  "parent.created": "Added a Parent",
  "family-join.agreed": "Agreed to an adult joining their Family",
  "family-join.turned-down": "Turned down an adult joining their Family",
  "adult.deactivated": "Deactivated an adult",
  "invite.sent": "Sent an Invite",
  "password-reset.sent-by-staff": "Sent a password reset",
  "password-reset.requested": "Asked for a password reset",
  "password-reset.rate-limited": "Refused password resets: too many asked",
  "sign-out.other-browsers": "Signed out their other browsers",
  "child.created": "Added a Child",
  "child.school-changed": "Moved a Child's School",
  "child.deleted": "Deleted a Child",
  "family.deleted": "Deleted a Family",
  "deletion-request.created": "Asked for a deletion",
  "deletion-request.confirmed": "Confirmed a deletion",
  "sign-in.rate-limited": "Refused sign-ins: too many wrong passwords",
  "school.changed": "Changed a School's name or town",
  "child.stars-awarded": "Gave a Child Stars",
  "family-chest.coins-awarded": "Gave a Family Chest coins",
  "child.changed": "Changed a Child's details",
  "child.limits-changed": "Changed a Child's limits",
  "child.teacher-locks-changed": "Changed a Child's Teacher locks",
  "child.classmate-visits-changed": "Changed a Child's Classmate visits",
  "child.birth-given": "Gave a Child's birth month and year",
};

const happenedAtFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/London",
});

const noFilter: AuditLogFilter = { action: "", from: "", to: "" };

const describeActor = ({
  actorType,
  actorId,
  actorName,
}: AuditLogEntry): string => {
  if (actorType === "none") {
    return "No one signed in";
  }
  if (actorType === "family-device") {
    return `Family Device ${actorId ?? ""}`;
  }
  return actorName ?? `Deleted user ${actorId ?? ""}`;
};

const describeTarget = ({ targetType, targetId }: AuditLogEntry): string =>
  targetType === null || targetId === null ? "" : `${targetType} ${targetId}`;

const readAuditAction = (value: string): AuditAction | "" =>
  auditActions.find((action) => action === value) ?? "";

/** Only the Admin sees the audit log: who did what to which id, newest first, fifty at a time. */
export const AuditLogPanel = () => {
  const [view, setView] = useState<AuditLogView>({ kind: "loading" });
  const [filter, setFilter] = useState<AuditLogFilter>(noFilter);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    let isCurrent = true;
    fetchAuditLogPage(pageNumber, filter).then(
      (auditLogPage) => {
        if (isCurrent) {
          setView({
            kind: "listed",
            auditLogPage,
            request: { pageNumber, filter },
          });
        }
      },
      () => {
        if (isCurrent) {
          setView({ kind: "failed" });
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [pageNumber, filter]);

  const changeFilter = (change: Partial<AuditLogFilter>) => {
    setFilter((current) => ({ ...current, ...change }));
    setPageNumber(1);
  };

  // A listed page stays shown while the next one loads, saying what is loading.
  const isFilterLoading =
    view.kind === "listed" && view.request.filter !== filter;
  const isPageLoading =
    view.kind === "listed" &&
    !isFilterLoading &&
    view.request.pageNumber !== pageNumber;

  return (
    <section className="staff-panel">
      <StaffPageHeader
        area="admin"
        title="Audit log"
        intro="Sign-ins and changes that matter for security, kept for twelve months. Entries hold ids, not names, so a deleted Child or Family can't be read back from here."
      />
      <form
        className="staff-toolbar audit-log-filter"
        aria-label="Filter the audit log"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label>
          Action
          <select
            value={filter.action}
            onChange={(event) => {
              changeFilter({
                action: readAuditAction(event.currentTarget.value),
              });
            }}
          >
            <option value="">Every action</option>
            {auditActions.map((action) => (
              <option key={action} value={action}>
                {auditActionNames[action]}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={filter.from}
            onChange={(event) => {
              changeFilter({ from: event.currentTarget.value });
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filter.to}
            onChange={(event) => {
              changeFilter({ to: event.currentTarget.value });
            }}
          />
        </label>
      </form>
      {view.kind === "loading" ? (
        <BusyProgress label="Loading the audit log…" />
      ) : null}
      {isFilterLoading ? (
        <BusyProgress label="Loading the audit log entries that match…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load the audit log. Try again in a moment.
        </p>
      ) : null}
      {view.kind === "listed" ? (
        <AuditLogTable
          auditLogPage={view.auditLogPage}
          busyLabel={
            isPageLoading
              ? `Loading page ${String(pageNumber)} of the audit log…`
              : undefined
          }
          onPageChosen={setPageNumber}
        />
      ) : null}
    </section>
  );
};

interface AuditLogTableProps {
  auditLogPage: AuditLogPage;
  busyLabel: string | undefined;
  onPageChosen: (pageNumber: number) => void;
}

const AuditLogTable = ({
  auditLogPage,
  busyLabel,
  onPageChosen,
}: AuditLogTableProps) => {
  const { entries, page, pageSize, totalCount } = auditLogPage;
  const firstIndex = (page - 1) * pageSize;
  return (
    <Pagination
      itemsName="entries"
      pagination={{
        pageNumber: page,
        pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
        pageSize: 50,
        itemCount: totalCount,
        firstShown: entries.length === 0 ? 0 : firstIndex + 1,
        lastShown: firstIndex + entries.length,
        showPage: onPageChosen,
        ...(busyLabel === undefined ? {} : { busyLabel }),
      }}
    >
      <StaffTable
        caption="Audit log entries, newest first"
        headings={["When", "Action", "Who", "Roles", "About", "Detail", "IP"]}
        emptyMessage="No entries match."
        rowCount={entries.length}
      >
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{happenedAtFormat.format(new Date(entry.happenedAt))}</td>
            <td>{auditActionNames[entry.action]}</td>
            <td>{describeActor(entry)}</td>
            <td>{entry.actorRoles?.join(", ") ?? ""}</td>
            <td>{describeTarget(entry)}</td>
            <td>{entry.detail ?? ""}</td>
            <td>{entry.ipAddress ?? ""}</td>
          </tr>
        ))}
      </StaffTable>
    </Pagination>
  );
};
