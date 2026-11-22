import { useId, useState } from "react";
import { ChevronDownIcon } from "../site-header/icons.js";
import type { SiteMenuEntry } from "../site-header/site-header.js";
import { getInitial } from "./child-face.js";

export interface SidebarGroup {
  heading: string;
  entries: readonly SiteMenuEntry[];
}

interface SidebarEntryProps {
  entry: SiteMenuEntry;
}

const SidebarEntry = ({ entry }: SidebarEntryProps) =>
  "href" in entry ? (
    <li>
      <a
        className="parent-sidebar-link"
        href={entry.href}
        aria-current={entry.isCurrent === true ? "page" : undefined}
      >
        {entry.icon}
        <span>{entry.label}</span>
      </a>
    </li>
  ) : (
    <li>
      <button
        type="button"
        className="parent-sidebar-link parent-sidebar-action"
        onClick={entry.onChoose}
      >
        {entry.icon}
        <span>{entry.label}</span>
      </button>
    </li>
  );

interface SidebarGroupListProps {
  group: SidebarGroup;
}

const SidebarGroupList = ({ group }: SidebarGroupListProps) => {
  const headingId = useId();
  const [isOpen, setIsOpen] = useState(true);
  return (
    <details
      className="parent-sidebar-group"
      open={isOpen}
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
    >
      <summary className="parent-sidebar-summary">
        <h2 id={headingId} className="parent-sidebar-heading">
          {group.heading}
        </h2>
        <span className="parent-sidebar-chevron" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </summary>
      <ul aria-labelledby={headingId}>
        {group.entries.map((entry) => (
          <SidebarEntry key={entry.label} entry={entry} />
        ))}
      </ul>
    </details>
  );
};

interface ParentSidebarProps {
  familyName?: string;
  roleLabel?: string;
  groups: readonly SidebarGroup[];
  footerEntries: readonly SiteMenuEntry[];
}

export const ParentSidebar = ({
  familyName,
  roleLabel = "Your Family",
  groups,
  footerEntries,
}: ParentSidebarProps) => (
  <nav className="parent-sidebar" aria-label="Parent sections">
    {familyName === undefined ? null : (
      <div className="parent-sidebar-family">
        <span className="parent-sidebar-crest" aria-hidden="true">
          {getInitial(familyName)}
        </span>
        <span className="parent-sidebar-family-name">
          <strong>{familyName}</strong>
          <span className="parent-sidebar-role">{roleLabel}</span>
        </span>
      </div>
    )}
    {groups.map((group) => (
      <SidebarGroupList key={group.heading} group={group} />
    ))}
    <ul className="parent-sidebar-footer">
      {footerEntries.map((entry) => (
        <SidebarEntry key={entry.label} entry={entry} />
      ))}
    </ul>
  </nav>
);
