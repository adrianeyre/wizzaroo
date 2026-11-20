import { describe, expect, it } from "vitest";
import {
  CsvNotReadableError,
  parseCsv,
  readCsvRecords,
  writeCsv,
} from "./csv.js";

describe("parseCsv", () => {
  it("reads quoted fields holding commas, quotes and line breaks, and Windows line endings", () => {
    expect(
      parseCsv(
        '﻿name,note\r\n"Smith, Jo","said ""hi""\nthen left"\r\nAl,\r\n\r\n',
      ),
    ).toEqual([
      ["name", "note"],
      ["Smith, Jo", 'said "hi"\nthen left'],
      ["Al", ""],
    ]);
  });

  it("refuses a quote that is never closed", () => {
    expect(() => parseCsv('name\n"Jo')).toThrow(CsvNotReadableError);
  });
});

describe("writeCsv", () => {
  it("quotes only the fields that need it, so the file reads back the same", () => {
    const rows = [
      ["row", "problem"],
      ["2", 'Not an email, "jo"'],
    ];

    expect(writeCsv(rows)).toBe('row,problem\r\n2,"Not an email, ""jo"""\r\n');
    expect(parseCsv(writeCsv(rows))).toEqual(rows);
  });
});

describe("readCsvRecords", () => {
  const reading = { mostRows: 3 };

  it("keys each row by its heading and numbers rows as a spreadsheet does", () => {
    const [record] = readCsvRecords(
      "Name, Year Groups\nJo,2;3\n",
      ["name", "year_groups"],
      reading,
    );

    expect(record.rowNumber).toBe(2);
    expect(record.cells.get("year_groups")).toBe("2;3");
  });

  it("names the template columns the file is missing", () => {
    expect(() =>
      readCsvRecords("name\nJo\n", ["name", "email"], reading),
    ).toThrow("missing email");
  });

  it("refuses a heading row with more columns than the template, and keeps only the template's columns of every row", () => {
    expect(() =>
      readCsvRecords(
        "name,email,extra\nJo,jo@example.com,x\n",
        ["name", "email"],
        reading,
      ),
    ).toThrow(CsvNotReadableError);

    const [record] = readCsvRecords(
      "school,name,email\nHillside,Jo,jo@example.com,x,y\n",
      ["name", "email"],
      { ...reading, optionalHeadings: ["school"] },
    );

    expect([...record.cells.entries()]).toEqual([
      ["name", "Jo"],
      ["email", "jo@example.com"],
      ["school", "Hillside"],
    ]);
  });

  it("stops reading at the first row past the cap, and skips empty rows without counting them", () => {
    expect(
      readCsvRecords("name\nA\n\n,\nB\nC\n", ["name"], reading),
    ).toHaveLength(3);
    expect(() =>
      readCsvRecords("name\nA\nB\nC\nD\n", ["name"], reading),
    ).toThrow("Upload at most 3 rows at a time");
  });
});
