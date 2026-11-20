import type { ReactNode } from "react";
import {
  AccountIcon,
  CastleIcon,
  ChildrenIcon,
  InviteIcon,
  KeyIcon,
  ParentsIcon,
} from "../site-header/icons.js";
import { AuditLogPanel } from "./audit-log-panel.js";
import { BulkUploadPanel } from "./bulk-upload-panel.js";
import { ParentsPanel } from "./parents-panel.js";
import { AdminChildrenPanel } from "./school-children-panel.js";
import { SchoolsPanel } from "./schools-panel.js";
import { bulkUploadIntro, StaffPageHeader } from "./staff-parts.js";
import { TeachersPanel } from "./teachers-panel.js";

export const adminSections = [
  "admin-schools",
  "admin-teachers",
  "admin-parents",
  "admin-children",
  "admin-uploads",
  "admin-audit-log",
] as const;

export type AdminSectionId = (typeof adminSections)[number];

export const adminSectionLinks: Record<
  AdminSectionId,
  { label: string; icon: ReactNode }
> = {
  "admin-schools": { label: "Schools", icon: <CastleIcon /> },
  "admin-teachers": { label: "Teachers", icon: <AccountIcon /> },
  "admin-parents": { label: "Parents", icon: <ParentsIcon /> },
  "admin-children": { label: "Children", icon: <ChildrenIcon /> },
  "admin-uploads": { label: "Add people in bulk", icon: <InviteIcon /> },
  "admin-audit-log": { label: "Audit log", icon: <KeyIcon /> },
};

/** Where the owner lands after signing in: every School, Teacher, Parent and Child. */
export const AdminSection = ({ section }: { section: AdminSectionId }) => {
  if (section === "admin-teachers") {
    return <TeachersPanel />;
  }
  if (section === "admin-parents") {
    return <ParentsPanel isAdmin />;
  }
  if (section === "admin-children") {
    return <AdminChildrenPanel />;
  }
  if (section === "admin-audit-log") {
    return <AuditLogPanel />;
  }
  if (section === "admin-uploads") {
    return (
      <section className="staff-panel">
        <StaffPageHeader
          area="admin"
          title="Add people in bulk"
          intro={bulkUploadIntro}
        />
        <div className="bulk-uploads">
          <BulkUploadPanel kind="teachers" />
          <BulkUploadPanel kind="families" />
        </div>
      </section>
    );
  }
  return <SchoolsPanel />;
};
