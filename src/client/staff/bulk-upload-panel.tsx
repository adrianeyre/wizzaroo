import { useState, type ChangeEvent } from "react";
import {
  createFromBulkUpload,
  fetchBulkTemplate,
  previewBulkUpload,
  readProblemMessage,
  type BulkKind,
  type BulkOutcome,
  type PreviewedRow,
} from "./staff-api.js";
import { DownloadIcon, MailIcon, UploadIcon } from "../site-header/icons.js";
import { StaffTable, StatusPill } from "./staff-parts.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

const buildCsvLink = (csv: string): string =>
  `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

const bulkCopy: Record<
  BulkKind,
  {
    heading: string;
    intro: string;
    fileName: string;
    created: string;
    describeCreating: (readyRowCount: number) => string;
  }
> = {
  teachers: {
    heading: "Add Teachers from a spreadsheet",
    intro:
      "One row per Teacher, with their name, email, School and Year Groups, such as 2;3.",
    fileName: "teachers.csv",
    created: "Teachers",
    describeCreating: (readyRowCount) =>
      readyRowCount === 1
        ? "Creating 1 Teacher"
        : `Creating ${String(readyRowCount)} Teachers`,
  },
  families: {
    heading: "Add Parents and Children from a spreadsheet",
    intro:
      "One row per Child, with up to two Parents. Rows that share a Parent's email become one Family, so add siblings as separate rows. A row with Parents but no Child adds Parents with no Children yet.",
    fileName: "parents-and-children.csv",
    created: "rows",
    describeCreating: (readyRowCount) =>
      `Creating Parents and Children from ${String(readyRowCount)} ${readyRowCount === 1 ? "row" : "rows"}`,
  },
};

type UploadStep =
  | { kind: "choosing" }
  | { kind: "previewed"; csv: string; rows: PreviewedRow[] }
  | { kind: "created"; outcome: BulkOutcome };

interface BulkUploadPanelProps {
  kind: BulkKind;
}

/** Nothing is created until every row has been shown valid or with its problem named. */
export const BulkUploadPanel = ({ kind }: BulkUploadPanelProps) => {
  const copy = bulkCopy[kind];
  const [templateLink, setTemplateLink] = useState<string>();
  const [step, setStep] = useState<UploadStep>({ kind: "choosing" });
  const [isEmailingInvites, setIsEmailingInvites] = useState(true);
  const [problem, setProblem] = useState<string>();
  const templateWork = useBusyAction();
  const previewWork = useBusyAction();
  const createWork = useBusyAction();
  const isBusy = templateWork.isBusy || previewWork.isBusy || createWork.isBusy;

  const showProblem = (error: unknown) => {
    setProblem(readProblemMessage(error));
  };

  const previewFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.item(0);
    if (file === null || file === undefined) {
      return;
    }
    const preview = await previewWork.runBusy(
      `Reading ${file.name} and checking every row…`,
      async () => {
        const csv = await file.text();
        return { csv, rows: await previewBulkUpload(kind, csv) };
      },
    );
    if (preview !== undefined) {
      setProblem(undefined);
      setStep({ kind: "previewed", ...preview });
    }
  };

  const validRowCount =
    step.kind === "previewed"
      ? step.rows.filter(({ problem: rowProblem }) => rowProblem === null)
          .length
      : 0;

  return (
    <section className="bulk-upload" aria-busy={isBusy}>
      <h2>{copy.heading}</h2>
      <p className="view-intro">{copy.intro}</p>
      <div className="bulk-upload-step">
        <span className="bulk-step-number" aria-hidden="true">
          1
        </span>
        {templateLink === undefined ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              templateWork
                .runBusy(`Getting the template for ${copy.fileName}…`, () =>
                  fetchBulkTemplate(kind),
                )
                .then((template) => {
                  if (template !== undefined) {
                    setTemplateLink(buildCsvLink(template));
                  }
                }, showProblem);
            }}
          >
            <DownloadIcon />
            Get the template
          </button>
        ) : (
          <a
            className="button-link secondary"
            href={templateLink}
            download={copy.fileName}
          >
            <DownloadIcon />
            Download the template
          </a>
        )}
        {templateWork.busyLabel === undefined ? null : (
          <BusyProgress label={templateWork.busyLabel} />
        )}
      </div>
      <div className="bulk-upload-step">
        <span className="bulk-step-number" aria-hidden="true">
          2
        </span>
        <label className="file-drop">
          Your filled-in spreadsheet, saved as CSV
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={isBusy}
            onChange={(event) => {
              previewFile(event).catch(showProblem);
            }}
          />
        </label>
        {previewWork.busyLabel === undefined ? null : (
          <BusyProgress label={previewWork.busyLabel} />
        )}
      </div>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {step.kind === "previewed" ? (
        <>
          <StaffTable
            caption="Your spreadsheet, checked"
            headings={["Row", "Details", "Check"]}
          >
            {step.rows.map((row) => (
              <tr key={row.rowNumber}>
                <td data-label="Row" className="numeric">
                  {row.rowNumber}
                </td>
                <td data-label="Details">{row.summary}</td>
                <td data-label="Check">
                  {row.problem === null ? (
                    <StatusPill tone="good">Ready</StatusPill>
                  ) : (
                    <StatusPill tone="bad">{row.problem}</StatusPill>
                  )}
                </td>
              </tr>
            ))}
          </StaffTable>
          <p className="bulk-upload-summary">
            {validRowCount} of {step.rows.length} rows are ready. Rows with a
            problem are skipped.
          </p>
          <label>
            <input
              type="checkbox"
              checked={isEmailingInvites}
              disabled={isBusy}
              onChange={(event) => {
                setIsEmailingInvites(event.currentTarget.checked);
              }}
            />
            Create and email Invites now
          </label>
          <p className="form-hint">
            Untick it to create only, and send the Invites later from the list.
          </p>
          <button
            type="button"
            disabled={validRowCount === 0 || isBusy}
            onClick={() => {
              const creating = copy.describeCreating(validRowCount);
              createWork
                .runBusy(
                  isEmailingInvites
                    ? `${creating} and emailing their Invites…`
                    : `${creating}…`,
                  () => createFromBulkUpload(kind, step.csv, isEmailingInvites),
                )
                .then((outcome) => {
                  if (outcome !== undefined) {
                    setProblem(undefined);
                    setStep({ kind: "created", outcome });
                  }
                }, showProblem);
            }}
          >
            {isEmailingInvites ? <MailIcon /> : <UploadIcon />}
            {isEmailingInvites ? "Create and email Invites now" : "Create only"}
          </button>
          {createWork.busyLabel === undefined ? null : (
            <BusyProgress label={createWork.busyLabel} />
          )}
        </>
      ) : null}
      {step.kind === "created" ? (
        <>
          <p role="status">
            Created {step.outcome.createdRowCount} {copy.created} and skipped{" "}
            {step.outcome.skippedRows.length}.
            {step.outcome.invitesEmailedCount > 0
              ? ` ${String(step.outcome.invitesEmailedCount)} Invites are being emailed, a few at a time.`
              : ""}
          </p>
          {step.outcome.skippedRows.length === 0 ? null : (
            <a
              className="button-link secondary"
              href={buildCsvLink(step.outcome.skippedRowsReport)}
              download="skipped-rows.csv"
            >
              <DownloadIcon />
              Download the skipped rows
            </a>
          )}
        </>
      ) : null}
    </section>
  );
};
