import { useId, useState, type ReactNode } from "react";
import { describeSchoolYear } from "../../curriculum/year-groups.js";
import {
  ChevronDownIcon,
  CopyIcon,
  PlusIcon,
  SearchIcon,
} from "../site-header/icons.js";
import type { CharacterLoadout } from "../../curriculum/catalogue.js";
import { ChildFace, getInitial } from "../parent/child-face.js";
import type { InviteStatus } from "./staff-api.js";

const dayFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export const describeMoment = (moment: string | null, never: string): string =>
  moment === null ? never : dayFormat.format(new Date(moment));

export const describeYear = (schoolYear: number | null): string =>
  schoolYear === null
    ? "Birth month not given yet"
    : describeSchoolYear(schoolYear);

export const inviteStatusNames: Record<InviteStatus, string> = {
  "not-sent": "Not invited yet",
  pending: "Invite pending",
  accepted: "Signed up",
  expired: "Invite expired",
  "email-failed": "Invite email not sent",
};

const inviteStatusTones: Record<InviteStatus, StatusTone> = {
  "not-sent": "neutral",
  pending: "waiting",
  accepted: "good",
  expired: "bad",
  "email-failed": "bad",
};

/** Ignores case, so a list can be searched by any of the words shown in it. */
export const matchesSearch = (
  search: string,
  words: readonly (string | null)[],
): boolean => {
  const wanted = search.trim().toLowerCase();
  return (
    wanted === "" ||
    words.some((word) => word?.toLowerCase().includes(wanted) === true)
  );
};

export const staffAreaNames = {
  admin: "Running Wizzaroo",
  teacher: "Your class",
} as const;

export const bulkUploadIntro =
  "Get the template, fill it in, and upload it saved as CSV. Wizzaroo checks every row before anything is created.";

interface StaffPageHeaderProps {
  area: keyof typeof staffAreaNames;
  title: string;
  intro: ReactNode;
}

// The sidebar already names the area, so the header starts with its title.
export const StaffPageHeader = ({ title, intro }: StaffPageHeaderProps) => (
  <header className="staff-page-header">
    <h1>{title}</h1>
    <p className="view-intro">{intro}</p>
  </header>
);

export interface StaffStat {
  label: string;
  value: number;
  tone?: StatusTone;
}

interface StaffStatsProps {
  label: string;
  stats: readonly StaffStat[];
}

export const StaffStats = ({ label, stats }: StaffStatsProps) => (
  <dl className="staff-stats" aria-label={label}>
    {stats.map((stat) => (
      <div key={stat.label} className="staff-stat" data-tone={stat.tone}>
        <dt>{stat.label}</dt>
        <dd>{stat.value}</dd>
      </div>
    ))}
  </dl>
);

export const countWhere = <Item,>(
  items: readonly Item[],
  isCounted: (item: Item) => boolean,
): number => items.filter(isCounted).length;

interface CountNoun {
  one: string;
  other: string;
}

const describeCount = (count: number, noun: CountNoun): string =>
  `${String(count)} ${count === 1 ? noun.one : noun.other}`;

interface SearchBoxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  shownCount?: number;
  totalCount?: number;
  noun?: CountNoun;
}

export const SearchBox = ({
  label,
  value,
  onChange,
  shownCount,
  totalCount,
  noun,
}: SearchBoxProps) => {
  const hasCount =
    shownCount !== undefined && totalCount !== undefined && noun !== undefined;
  return (
    <div className="staff-toolbar">
      <label className="staff-search">
        <span className="staff-search-label">{label}</span>
        <span className="staff-search-field">
          <SearchIcon />
          <input
            type="search"
            value={value}
            onChange={(event) => {
              onChange(event.currentTarget.value);
            }}
          />
        </span>
      </label>
      {hasCount ? (
        <p className="staff-count" aria-live="polite">
          {shownCount === totalCount
            ? describeCount(totalCount, noun)
            : `Showing ${String(shownCount)} of ${describeCount(totalCount, noun)}`}
        </p>
      ) : null}
    </div>
  );
};

interface StaffTableProps {
  caption: string;
  headings: readonly string[];
  emptyMessage?: string;
  rowCount?: number;
  children: ReactNode;
}

export const StaffTable = ({
  caption,
  headings,
  emptyMessage,
  rowCount,
  children,
}: StaffTableProps) => (
  <div
    className="table-scroll staff-table-frame"
    role="region"
    aria-label={caption}
    tabIndex={0}
  >
    <table className="staff-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headings.map((heading, index) => (
            <th
              key={heading === "" ? `column-${String(index)}` : heading}
              scope="col"
            >
              {heading === "" ? (
                <span className="visually-hidden">Actions</span>
              ) : (
                heading
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowCount === 0 && emptyMessage !== undefined ? (
          <tr className="staff-empty-row">
            <td colSpan={headings.length}>{emptyMessage}</td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  </div>
);

export type StatusTone = "neutral" | "waiting" | "good" | "bad";

interface StatusPillProps {
  tone: StatusTone;
  children: ReactNode;
}

export const StatusPill = ({ tone, children }: StatusPillProps) => (
  <span className="status-pill" data-tone={tone}>
    {children}
  </span>
);

export const InviteStatusPill = ({ status }: { status: InviteStatus }) => (
  <StatusPill tone={inviteStatusTones[status]}>
    {inviteStatusNames[status]}
  </StatusPill>
);

interface PersonCellProps {
  name: string;
  detail?: string;
  /** For a Child: their Character, shown in place of their initial. */
  loadout?: CharacterLoadout | null;
}

export const PersonCell = ({ name, detail, loadout }: PersonCellProps) => (
  <span className="person-cell">
    {loadout === undefined ? (
      <span
        className="person-avatar"
        data-initial={getInitial(name)}
        aria-hidden="true"
      />
    ) : (
      <ChildFace className="person-avatar" nickname={name} loadout={loadout} />
    )}
    <span className="person-cell-text">
      <strong>{name}</strong>
      {detail === undefined || detail === name ? null : (
        <span className="cell-detail">{detail}</span>
      )}
    </span>
  </span>
);

interface NamedActionProps {
  verb: string;
  name: string;
}

export const NamedAction = ({ verb, name }: NamedActionProps) => (
  <>
    {verb}
    <span className="visually-hidden"> {name}</span>
  </>
);

interface StaffWorkspaceProps {
  addLabel: string;
  addForm: ReactNode;
  isEmpty: boolean;
  list: ReactNode;
}

export const StaffWorkspace = ({
  addLabel,
  addForm,
  isEmpty,
  list,
}: StaffWorkspaceProps) => {
  const [chosenIsAdding, setChosenIsAdding] = useState<boolean>();
  return (
    <div className="staff-workspace">
      <details
        className="staff-add"
        open={chosenIsAdding ?? isEmpty}
        onToggle={(event) => {
          setChosenIsAdding(event.currentTarget.open);
        }}
      >
        <summary className="staff-add-summary">
          <PlusIcon />
          <span>{addLabel}</span>
          <span className="staff-add-chevron" aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </summary>
        <div className="staff-add-body">{addForm}</div>
      </details>
      {list}
    </div>
  );
};

interface InviteLinkProps {
  url: string;
  isEmailed: boolean;
}

export const InviteLink = ({ url, isEmailed }: InviteLinkProps) => {
  const [copyNews, setCopyNews] = useState<string>();
  const linkId = useId();
  return (
    <div className="invite-link">
      <p role="status">
        {isEmailed
          ? "Wizzaroo has emailed the Invite. You can copy its link too."
          : "Here's the Invite. Copy the link and send it to them."}{" "}
        It works once, for 7 days.
      </p>
      <label htmlFor={linkId}>The Invite's link</label>
      <div className="invite-link-row">
        <input id={linkId} value={url} readOnly />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(url).then(
              () => {
                setCopyNews("Copied.");
              },
              () => {
                setCopyNews(
                  "Wizzaroo couldn't copy the link. Select it and copy it yourself.",
                );
              },
            );
          }}
        >
          <CopyIcon />
          Copy the link
        </button>
      </div>
      {copyNews === undefined ? null : <p role="status">{copyNews}</p>}
    </div>
  );
};

/** Each staff action reports how it went in one place: a status when it worked, an alert when it didn't. */
export type ActionNews =
  | { kind: "none" }
  | { kind: "done"; message: string }
  | { kind: "failed"; message: string };

export const ActionNewsLine = ({ news }: { news: ActionNews }) => {
  if (news.kind === "none") {
    return null;
  }
  return news.kind === "done" ? (
    <p role="status">{news.message}</p>
  ) : (
    <p role="alert">{news.message}</p>
  );
};
