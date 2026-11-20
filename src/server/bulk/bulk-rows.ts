import type { Email } from "../email/emails.js";
import { writeCsv } from "./csv.js";

export interface PreviewedRow {
  rowNumber: number;
  summary: string;
  problem: string | null;
}

export interface BulkOutcome {
  createdRowCount: number;
  skippedRows: { rowNumber: number; problem: string }[];
  skippedRowsReport: string;
  invitesEmailedCount: number;
}

/** An Invite the upload made, with its email to send once the reply has gone. */
export interface InviteEmail {
  inviteId: string;
  email: Email;
}

export const mostBulkRows = 1_000;

export const buildSkippedRowsReport = (rows: readonly PreviewedRow[]): string =>
  writeCsv([
    ["row", "problem"],
    ...rows.flatMap(({ rowNumber, problem }) =>
      problem === null ? [] : [[String(rowNumber), problem]],
    ),
  ]);

export const buildBulkOutcome = (
  rows: readonly PreviewedRow[],
  invitesEmailedCount: number,
): BulkOutcome => {
  const skippedRows = rows.flatMap(({ rowNumber, problem }) =>
    problem === null ? [] : [{ rowNumber, problem }],
  );
  return {
    createdRowCount: rows.length - skippedRows.length,
    skippedRows,
    skippedRowsReport: buildSkippedRowsReport(rows),
    invitesEmailedCount,
  };
};

export const normaliseSchoolName = (name: string): string =>
  name.trim().toLowerCase().replaceAll(/\s+/g, " ");

interface NamedSchool {
  id: string;
  name: string | null;
}

export type SchoolMatch =
  | { kind: "found"; id: string; name: string }
  | { kind: "problem"; problem: string };

/** Spreadsheets name a School, so it is matched by name, ignoring case and extra spaces. */
export const matchSchool = (
  typedName: string,
  schools: readonly NamedSchool[],
): SchoolMatch => {
  if (typedName === "") {
    return { kind: "problem", problem: "The School is missing" };
  }
  const matches = schools.filter(
    (school): school is { id: string; name: string } =>
      school.name !== null &&
      normaliseSchoolName(school.name) === normaliseSchoolName(typedName),
  );
  if (matches.length === 0) {
    return {
      kind: "problem",
      problem: `There's no School called "${typedName}"`,
    };
  }
  if (matches.length > 1) {
    return {
      kind: "problem",
      problem: `More than one School is called "${typedName}", so add these Teachers one at a time`,
    };
  }
  return { kind: "found", ...matches[0] };
};
