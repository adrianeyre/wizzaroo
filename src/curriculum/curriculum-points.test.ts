import { describe, expect, it } from "vitest";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import {
  curriculumPoints,
  parseCurriculumPoints,
} from "./curriculum-points.js";
import { parseSkills, skills, subjects, yearGroups } from "./skills.js";

const testSkills = parseSkills([
  {
    id: "maths.number-bonds-10",
    name: "Number bonds to 10",
    subject: "maths",
    yearGroup: 1,
    strand: "addition-and-subtraction",
    prerequisites: [],
  },
  {
    id: "maths.add-within-20",
    name: "Adding to 20",
    subject: "maths",
    yearGroup: 1,
    strand: "addition-and-subtraction",
    prerequisites: [],
  },
  {
    id: "maths.tens-and-ones",
    name: "Tens and ones to 100",
    subject: "maths",
    yearGroup: 2,
    strand: "number-and-place-value",
    prerequisites: [],
  },
]);

const mathsProgrammeOfStudyUrl =
  "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study";

const buildPoint = (id: string, skillIds: unknown) => ({
  id,
  heading: "Addition and subtraction",
  summary: "Add and subtract within 20.",
  skillIds,
});

const buildMathsFile = (
  yearOnePoints: unknown[],
  yearTwoPoints: unknown[] = [
    buildPoint("number-and-place-value", ["maths.tens-and-ones"]),
  ],
) => ({
  subject: "maths",
  programme: "year",
  programmeOfStudyUrl: mathsProgrammeOfStudyUrl,
  years: [
    { yearGroup: 1, points: yearOnePoints },
    { yearGroup: 2, points: yearTwoPoints },
  ],
});

const parseMaths = (file: object) => parseCurriculumPoints([file], testSkills);

describe("curriculum points", () => {
  it("reads each Curriculum Point with its Subject, Year Group, programme and Skills", () => {
    const points = parseMaths(
      buildMathsFile([
        buildPoint("addition-and-subtraction", [
          "maths.number-bonds-10",
          "maths.add-within-20",
        ]),
      ]),
    );

    expect(points).toEqual([
      {
        id: "addition-and-subtraction",
        subject: "maths",
        yearGroup: 1,
        programme: "year",
        programmeOfStudyUrl: mathsProgrammeOfStudyUrl,
        heading: "Addition and subtraction",
        summary: "Add and subtract within 20.",
        skillIds: ["maths.number-bonds-10", "maths.add-within-20"],
      },
      {
        id: "number-and-place-value",
        subject: "maths",
        yearGroup: 2,
        programme: "year",
        programmeOfStudyUrl: mathsProgrammeOfStudyUrl,
        heading: "Addition and subtraction",
        summary: "Add and subtract within 20.",
        skillIds: ["maths.tens-and-ones"],
      },
    ]);
  });

  it("refuses a Curriculum Point that no Skill teaches, so every point has a Game", () => {
    expect(() =>
      parseMaths(
        buildMathsFile([
          buildPoint("addition-and-subtraction", [
            "maths.number-bonds-10",
            "maths.add-within-20",
          ]),
          buildPoint("position-and-direction", []),
        ]),
      ),
    ).toThrow(InvalidCurriculumFileError);
  });

  it("refuses a Skill that isn't in the Skill list", () => {
    expect(() =>
      parseMaths(
        buildMathsFile([
          buildPoint("addition-and-subtraction", [
            "maths.number-bonds-10",
            "maths.add-within-20",
            "maths.money",
          ]),
        ]),
      ),
    ).toThrow(`lists "maths.money", which isn't a Skill`);
  });

  it("refuses a Skill from another Year Group", () => {
    expect(() =>
      parseMaths(
        buildMathsFile([
          buildPoint("addition-and-subtraction", [
            "maths.number-bonds-10",
            "maths.add-within-20",
            "maths.tens-and-ones",
          ]),
        ]),
      ),
    ).toThrow("which is maths in Year 2");
  });

  it("refuses a Year whose Skills don't all teach one of its Curriculum Points", () => {
    expect(() =>
      parseMaths(
        buildMathsFile([
          buildPoint("addition-and-subtraction", ["maths.number-bonds-10"]),
        ]),
      ),
    ).toThrow(`Skill "maths.add-within-20" teaches no Curriculum Point`);
  });

  it("refuses a Subject that leaves out a Year it has Skills in", () => {
    expect(() =>
      parseMaths({
        subject: "maths",
        programme: "year",
        programmeOfStudyUrl: mathsProgrammeOfStudyUrl,
        years: [
          {
            yearGroup: 1,
            points: [
              buildPoint("addition-and-subtraction", [
                "maths.number-bonds-10",
                "maths.add-within-20",
              ]),
            ],
          },
        ],
      }),
    ).toThrow("need Year 2, which has Skills");
  });

  it("refuses two Curriculum Points with the same ID in one Year", () => {
    expect(() =>
      parseMaths(
        buildMathsFile([
          buildPoint("addition-and-subtraction", ["maths.number-bonds-10"]),
          buildPoint("addition-and-subtraction", ["maths.add-within-20"]),
        ]),
      ),
    ).toThrow(`two Curriculum Points called "addition-and-subtraction"`);
  });

  it("refuses a programme that is neither a Year nor a Key Stage", () => {
    expect(() =>
      parseMaths({ ...buildMathsFile([]), programme: "term" }),
    ).toThrow("need a programme");
  });

  it("refuses a programme of study link that isn't on GOV.UK", () => {
    expect(() =>
      parseMaths({
        ...buildMathsFile([]),
        programmeOfStudyUrl: "https://example.com/maths",
      }),
    ).toThrow("need a programmeOfStudyUrl on https://www.gov.uk/");
  });

  it("refuses a Subject with Skills but no Curriculum Points file", () => {
    expect(() => parseCurriculumPoints([], testSkills)).toThrow(
      "maths has Skills but no Curriculum Points file",
    );
  });

  it("gives every Subject a Curriculum Point in every Year it has Skills", () => {
    const taughtYears = subjects.flatMap((subject) =>
      yearGroups
        .filter((yearGroup) =>
          skills.some(
            (skill) =>
              skill.subject === subject && skill.yearGroup === yearGroup,
          ),
        )
        .map((yearGroup) => `${subject} ${String(yearGroup)}`),
    );
    const pointedYears = new Set(
      curriculumPoints.map(
        ({ subject, yearGroup }) => `${subject} ${String(yearGroup)}`,
      ),
    );

    expect(taughtYears.filter((year) => !pointedYears.has(year))).toEqual([]);
  });

  it("covers the National Curriculum headings that once had no Game", () => {
    const findHeadings = (subject: string, yearGroup: number) =>
      curriculumPoints
        .filter(
          (point) => point.subject === subject && point.yearGroup === yearGroup,
        )
        .map(({ heading }) => heading);

    expect(findHeadings("maths", 1)).toContain("Multiplication and division");
    expect(findHeadings("maths", 6)).toContain("Ratio and proportion");
    expect(findHeadings("maths", 2)).toContain("Statistics");
    expect(findHeadings("english", 4)).toContain("Reading: comprehension");
    expect(findHeadings("english", 6)).toContain("Writing: composition");
    expect(findHeadings("geography", 5)).toContain("Place knowledge");
    expect(findHeadings("music", 1)).toContain("Using their voices");
  });
});
