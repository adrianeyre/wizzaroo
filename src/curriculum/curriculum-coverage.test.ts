import { describe, expect, it } from "vitest";
import {
  buildYearCoverage,
  isGapStatus,
  listCurriculumYears,
} from "./curriculum-coverage.js";
import type { CurriculumPoint } from "./curriculum-points.js";
import type { SkillMastery } from "./mastery.js";
import { parseSkills } from "./skills.js";

const testSkills = parseSkills(
  ["number-bonds-10", "add-within-20", "count-objects-to-20"].map((name) => ({
    id: `maths.${name}`,
    name,
    subject: "maths",
    yearGroup: 1,
    strand: "number",
    prerequisites: [],
  })),
);

const additionPoint: CurriculumPoint = {
  id: "addition-and-subtraction",
  subject: "maths",
  yearGroup: 1,
  programme: "year",
  programmeOfStudyUrl:
    "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
  heading: "Addition and subtraction",
  summary: "Add and subtract within 20.",
  skillIds: ["maths.number-bonds-10", "maths.add-within-20"],
};

const countingPoint: CurriculumPoint = {
  ...additionPoint,
  id: "number-and-place-value",
  heading: "Number and place value",
  skillIds: ["maths.count-objects-to-20"],
};

const buildMastery = (
  skillId: string,
  change: Partial<SkillMastery>,
): SkillMastery => ({
  skillId,
  state: "learning",
  percentCorrect: 90,
  timeSpentSeconds: 120,
  goodDayCount: 0,
  goodDaysNeeded: 3,
  reviewIntervalDays: null,
  nextReviewDate: null,
  ...change,
});

const findPoint = (mastery: SkillMastery[], pointId: string) => {
  const point = buildYearCoverage(
    1,
    mastery,
    [additionPoint, countingPoint],
    testSkills,
  )
    .flatMap(({ points }) => points)
    .find((coverage) => coverage.point.id === pointId);
  if (point === undefined) {
    throw new Error(`there is no point "${pointId}"`);
  }
  return point;
};

describe("curriculum coverage", () => {
  it("shows a Curriculum Point no one has played as a gap at 0%", () => {
    const point = findPoint([], "addition-and-subtraction");

    expect(point.percentComplete).toBe(0);
    expect(point.status).toBe("not-started");
    expect(isGapStatus(point.status)).toBe(true);
  });

  it("averages how far each Skill is towards Mastery", () => {
    const point = findPoint(
      [
        buildMastery("maths.number-bonds-10", { state: "mastered" }),
        buildMastery("maths.add-within-20", { goodDayCount: 1 }),
      ],
      "addition-and-subtraction",
    );

    expect(point.skills.map(({ percentComplete }) => percentComplete)).toEqual([
      100, 33,
    ]);
    expect(point.percentComplete).toBe(67);
    expect(point.status).toBe("learning");
  });

  it("counts a Skill due for review as complete", () => {
    const point = findPoint(
      [buildMastery("maths.count-objects-to-20", { state: "due-for-review" })],
      "number-and-place-value",
    );

    expect(point.percentComplete).toBe(100);
    expect(point.status).toBe("complete");
    expect(isGapStatus(point.status)).toBe(false);
  });

  it("never shows a Skill still being learnt as 100%", () => {
    const point = findPoint(
      [
        buildMastery("maths.count-objects-to-20", {
          goodDayCount: 3,
          goodDaysNeeded: 3,
        }),
      ],
      "number-and-place-value",
    );

    expect(point.percentComplete).toBe(99);
    expect(point.status).toBe("learning");
  });

  it("flags a Curriculum Point as needing help when right first time is below the Skill's target", () => {
    const point = findPoint(
      [
        buildMastery("maths.number-bonds-10", {
          percentCorrect: 45,
          goodDayCount: 1,
        }),
      ],
      "addition-and-subtraction",
    );

    expect(point.status).toBe("needs-help");
    expect(point.skills[0].isTricky).toBe(true);
    expect(isGapStatus(point.status)).toBe(true);
  });

  it("averages a Subject over its Curriculum Points", () => {
    const [maths] = buildYearCoverage(
      1,
      [buildMastery("maths.count-objects-to-20", { state: "mastered" })],
      [additionPoint, countingPoint],
      testSkills,
    );

    expect(maths.subject).toBe("maths");
    expect(maths.percentComplete).toBe(50);
  });

  it("leaves out Subjects with no Curriculum Points in the Year", () => {
    expect(
      buildYearCoverage(2, [], [additionPoint, countingPoint], testSkills),
    ).toEqual([]);
  });

  it("lists every Year from 1 to 6 in order", () => {
    expect(listCurriculumYears()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
