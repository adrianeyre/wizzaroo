import type { ReactNode } from "react";
import type { YearGroup } from "../../curriculum/year-groups.js";
import {
  ChildrenIcon,
  InviteIcon,
  MapIcon,
  ParentsIcon,
} from "../site-header/icons.js";
import { BulkUploadPanel } from "./bulk-upload-panel.js";
import { ParentsPanel } from "./parents-panel.js";
import { YearGroupSummaryPanel } from "./school-children-panel.js";
import { bulkUploadIntro, StaffPageHeader } from "./staff-parts.js";
import { TeacherIslandsPanel } from "./teacher-islands-panel.js";

export const teacherSections = [
  "teacher-year-groups",
  "teacher-islands",
  "teacher-parents",
  "teacher-uploads",
] as const;

export type TeacherSectionId = (typeof teacherSections)[number];

export const teacherSectionLinks: Record<
  TeacherSectionId,
  { label: string; icon: ReactNode }
> = {
  "teacher-year-groups": { label: "Your Year Groups", icon: <ChildrenIcon /> },
  "teacher-islands": { label: "Class Islands", icon: <MapIcon /> },
  "teacher-parents": { label: "Parents", icon: <ParentsIcon /> },
  "teacher-uploads": { label: "Add people in bulk", icon: <InviteIcon /> },
};

interface TeacherSectionProps {
  section: TeacherSectionId;
  teachingYearGroups: readonly YearGroup[];
}

/** Where a Teacher lands after signing in. Only the Islands section changes how a Child plays, and only by locking. */
export const TeacherSection = ({
  section,
  teachingYearGroups,
}: TeacherSectionProps) => {
  if (section === "teacher-islands") {
    return <TeacherIslandsPanel />;
  }
  if (section === "teacher-parents") {
    return <ParentsPanel isAdmin={false} />;
  }
  if (section === "teacher-uploads") {
    return (
      <section className="staff-panel">
        <StaffPageHeader
          area="teacher"
          title="Add people in bulk"
          intro={bulkUploadIntro}
        />
        <div className="bulk-uploads">
          <BulkUploadPanel kind="families" />
        </div>
      </section>
    );
  }
  return <YearGroupSummaryPanel teachingYearGroups={teachingYearGroups} />;
};
