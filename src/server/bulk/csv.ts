export class CsvNotReadableError extends Error {
  override readonly name = "CsvNotReadableError";
  readonly statusCode = 400;
}

const byteOrderMark = "﻿";

const isBlankRow = (cells: readonly string[]): boolean =>
  cells.every((cell) => cell.trim() === "");

/** Reads RFC 4180 CSV a row at a time, as spreadsheets save it: quoted fields may hold commas, quotes and line breaks. */
function* readCsvRows(text: string): Generator<string[]> {
  let row: string[] = [];
  let field = "";
  let isQuoted = false;
  const source = text.startsWith(byteOrderMark) ? text.slice(1) : text;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (isQuoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        isQuoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === "") {
      isQuoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      field = "";
      if (!isBlankRow(row)) {
        yield row;
      }
      row = [];
    } else if (character !== "\r") {
      field += character;
    }
  }
  if (isQuoted) {
    throw new CsvNotReadableError(
      "The file has a quote that is never closed, so Wizzaroo couldn't read it",
    );
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (!isBlankRow(row)) {
      yield row;
    }
  }
}

/** Every row of the file with something in it. */
export const parseCsv = (text: string): string[][] => [...readCsvRows(text)];

const quoteField = (field: string): string =>
  /[",\r\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;

export const writeCsv = (rows: readonly (readonly string[])[]): string =>
  rows.map((cells) => cells.map(quoteField).join(",")).join("\r\n") + "\r\n";

export interface CsvRecord {
  rowNumber: number;
  cells: Map<string, string>;
}

const normaliseHeading = (heading: string): string =>
  heading
    .trim()
    .toLowerCase()
    .replaceAll(/[\s-]+/g, "_");

export interface CsvReading {
  /** Columns a file may have beyond the template's, read when present, such as the School a Teacher's file may keep. */
  optionalHeadings?: readonly string[];
  /** The most data rows a file may have: reading stops at the one after it. */
  mostRows: number;
}

/**
 * Each data row keyed by its column's heading, numbered as a spreadsheet shows it, with the heading row as 1.
 * What one file costs is bounded by its template, not by the file (#289): a heading row with more columns than the
 * template is refused before any data row is read, only the template's columns are kept, and reading stops at the
 * first row past the cap.
 */
export const readCsvRecords = (
  text: string,
  requiredHeadings: readonly string[],
  { optionalHeadings = [], mostRows }: CsvReading,
): CsvRecord[] => {
  const rows = readCsvRows(text);
  const headingRow = rows.next();
  if (headingRow.done === true) {
    throw new CsvNotReadableError("The file is empty");
  }
  const knownHeadings = [...requiredHeadings, ...optionalHeadings];
  if (headingRow.value.length > knownHeadings.length) {
    throw new CsvNotReadableError(
      `The file has more columns than the template's ${String(knownHeadings.length)}, so keep only the template's columns`,
    );
  }
  const headings = headingRow.value.map(normaliseHeading);
  const missing = requiredHeadings.filter(
    (heading) => !headings.includes(heading),
  );
  if (missing.length > 0) {
    throw new CsvNotReadableError(
      `The file needs the template's columns, and is missing ${missing.join(", ")}`,
    );
  }
  const columns = knownHeadings.flatMap((heading) => {
    const column = headings.indexOf(heading);
    return column === -1 ? [] : [{ heading, column }];
  });
  const records: CsvRecord[] = [];
  for (const cells of rows) {
    if (records.length === mostRows) {
      throw new CsvNotReadableError(
        `Upload at most ${String(mostRows)} rows at a time`,
      );
    }
    records.push({
      rowNumber: records.length + 2,
      cells: new Map(
        columns.map(({ heading, column }) => [
          heading,
          (cells[column] ?? "").trim(),
        ]),
      ),
    });
  }
  return records;
};
