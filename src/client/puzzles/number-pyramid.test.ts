import { describe, expect, it } from "vitest";
import { yearGroups } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildNumberPyramid,
  describeWorking,
  findBrickIndex,
  findEasiestBlank,
  findLongestEntry,
  findWorking,
  formatPyramidNumber,
  numberPyramidPlans,
  parsePyramidNumber,
  solveStepByStep,
  type NumberPyramid,
} from "./number-pyramid.js";

const seeds = Array.from({ length: 120 }, (_, seed) => seed + 1);

const listRow = (pyramid: NumberPyramid, row: number) =>
  pyramid.bricks.filter((brick) => brick.row === row);

const topOf = (pyramid: NumberPyramid) =>
  pyramid.bricks[pyramid.bricks.length - 1].value;

describe("buildNumberPyramid", () => {
  it.each(yearGroups)(
    "builds a pyramid where every brick is the sum of the two below it in Year %i",
    (yearGroup) => {
      const plan = numberPyramidPlans[yearGroup];
      for (const seed of seeds) {
        const pyramid = buildNumberPyramid(plan, buildRandom(seed));
        expect(pyramid.bricks).toHaveLength((plan.rows * (plan.rows + 1)) / 2);
        for (const brick of pyramid.bricks.filter(({ row }) => row > 0)) {
          const below = listRow(pyramid, brick.row - 1);
          expect(brick.value).toBe(
            below[brick.position].value + below[brick.position + 1].value,
          );
        }
      }
    },
  );

  it.each(yearGroups)(
    "leaves blanks that can each be worked out in turn, with a mix of adding and subtracting, in Year %i",
    (yearGroup) => {
      const plan = numberPyramidPlans[yearGroup];
      for (const seed of seeds) {
        const pyramid = buildNumberPyramid(plan, buildRandom(seed));
        expect(pyramid.bricks.filter(({ isGiven }) => !isGiven)).toHaveLength(
          plan.blanks,
        );
        const solved = solveStepByStep(
          plan.rows,
          pyramid.bricks.map(({ value, isGiven }) =>
            isGiven ? value : undefined,
          ),
        );
        expect(solved?.values).toEqual(
          pyramid.bricks.map(({ value }) => value),
        );
        expect(solved?.subtractions).toBeGreaterThanOrEqual(
          plan.fewestSubtractions,
        );
        expect(solved?.subtractions).toBeLessThanOrEqual(plan.mostSubtractions);
      }
    },
  );

  it("keeps Year 1 totals within 20 and mostly adding", () => {
    for (const seed of seeds) {
      const pyramid = buildNumberPyramid(
        numberPyramidPlans[1],
        buildRandom(seed),
      );
      expect(topOf(pyramid)).toBeLessThanOrEqual(20);
      expect(pyramid.bricks.every(({ value }) => value >= 1)).toBe(true);
    }
  });

  it("adds to a two-digit number no bigger than 100 in Year 2", () => {
    for (const seed of seeds) {
      const pyramid = buildNumberPyramid(
        numberPyramidPlans[2],
        buildRandom(seed),
      );
      expect(topOf(pyramid)).toBeLessThanOrEqual(100);
      expect(listRow(pyramid, 2).every(({ value }) => value >= 10)).toBe(true);
    }
  });

  it("adds three-digit numbers in Year 3 and four-digit numbers in Year 4", () => {
    for (const seed of seeds) {
      const yearThree = buildNumberPyramid(
        numberPyramidPlans[3],
        buildRandom(seed),
      );
      expect(topOf(yearThree)).toBeGreaterThanOrEqual(100);
      expect(topOf(yearThree)).toBeLessThanOrEqual(999);
      expect(listRow(yearThree, 2).every(({ value }) => value >= 100)).toBe(
        true,
      );
      const yearFour = buildNumberPyramid(
        numberPyramidPlans[4],
        buildRandom(seed),
      );
      expect(topOf(yearFour)).toBeGreaterThanOrEqual(1000);
      expect(topOf(yearFour)).toBeLessThanOrEqual(9999);
      expect(listRow(yearFour, 3).every(({ value }) => value >= 1000)).toBe(
        true,
      );
    }
  });

  it("adds decimals to two places in Year 5, starting from no whole numbers", () => {
    for (const seed of seeds) {
      const pyramid = buildNumberPyramid(
        numberPyramidPlans[5],
        buildRandom(seed),
      );
      expect(pyramid.unitsPerWhole).toBe(100);
      expect(listRow(pyramid, 0).every(({ value }) => value % 100 !== 0)).toBe(
        true,
      );
      expect(topOf(pyramid)).toBeLessThan(100 * 100);
    }
  });

  it("adds numbers above 10,000 up to six digits in Year 6", () => {
    for (const seed of seeds) {
      const pyramid = buildNumberPyramid(
        numberPyramidPlans[6],
        buildRandom(seed),
      );
      expect(pyramid.bricks.every(({ value }) => value > 10_000)).toBe(true);
      expect(topOf(pyramid)).toBeGreaterThanOrEqual(100_000);
      expect(topOf(pyramid)).toBeLessThanOrEqual(999_999);
    }
  });

  it("gives a different pyramid for a different seed", () => {
    const first = buildNumberPyramid(numberPyramidPlans[3], buildRandom(1));
    const second = buildNumberPyramid(numberPyramidPlans[3], buildRandom(2));
    expect(first.bricks).not.toEqual(second.bricks);
  });
});

describe("findWorking", () => {
  // Row 0: 1 2 3, row 1: 3 5, row 2: 8
  const known = [1, 2, undefined, 3, undefined, 8];

  it("adds the two bricks below", () => {
    expect(findWorking(3, [1, 2, 3, undefined, 5, 8], 3)).toEqual({
      kind: "add",
      left: 1,
      right: 2,
    });
  });

  it("subtracts a known neighbour from the brick above", () => {
    expect(findWorking(3, known, 4)).toEqual({
      kind: "subtract",
      whole: 8,
      part: 3,
    });
    expect(findWorking(3, [1, undefined, 3, 3, 5, 8], 1)).toEqual({
      kind: "subtract",
      whole: 3,
      part: 1,
    });
  });

  it("finds nothing when the brick can't be worked out yet", () => {
    expect(findWorking(3, known, 2)).toBeUndefined();
  });

  it("picks an adding brick before a subtracting one", () => {
    expect(findEasiestBlank(3, [1, 2, 3, undefined, undefined, 8])).toEqual({
      index: 3,
      working: { kind: "add", left: 1, right: 2 },
    });
  });

  it("numbers bricks from the bottom row up", () => {
    expect(findBrickIndex(4, 0, 3)).toBe(3);
    expect(findBrickIndex(4, 1, 0)).toBe(4);
    expect(findBrickIndex(4, 3, 0)).toBe(9);
    expect(findBrickIndex(4, 3, 1)).toBeUndefined();
  });
});

describe("pyramid numbers", () => {
  it("shows whole numbers with commas and decimals without trailing zeros", () => {
    expect(formatPyramidNumber(1_234_567, 1)).toBe("1,234,567");
    expect(formatPyramidNumber(999, 1)).toBe("999");
    expect(formatPyramidNumber(375, 100)).toBe("3.75");
    expect(formatPyramidNumber(350, 100)).toBe("3.5");
    expect(formatPyramidNumber(305, 100)).toBe("3.05");
    expect(formatPyramidNumber(1200, 100)).toBe("12");
    expect(formatPyramidNumber(7, 100)).toBe("0.07");
  });

  it("reads what the Child types", () => {
    expect(parsePyramidNumber("1,234,567", 1)).toBe(1_234_567);
    expect(parsePyramidNumber("12", 1)).toBe(12);
    expect(parsePyramidNumber("1.5", 1)).toBeUndefined();
    expect(parsePyramidNumber("", 1)).toBeUndefined();
    expect(parsePyramidNumber("3.5", 100)).toBe(350);
    expect(parsePyramidNumber("3.50", 100)).toBe(350);
    expect(parsePyramidNumber(".07", 100)).toBe(7);
    expect(parsePyramidNumber("12", 100)).toBe(1200);
    expect(parsePyramidNumber("12.", 100)).toBe(1200);
    expect(parsePyramidNumber(".", 100)).toBeUndefined();
    expect(parsePyramidNumber("1.234", 100)).toBeUndefined();
  });

  it("writes the working as a sum to finish", () => {
    expect(describeWorking({ kind: "add", left: 12, right: 7 }, 1)).toBe(
      "12 + 7 = ?",
    );
    expect(
      describeWorking({ kind: "subtract", whole: 1050, part: 275 }, 100),
    ).toBe("10.5 − 2.75 = ?");
  });

  it("caps the entry at the longest answer", () => {
    for (const yearGroup of yearGroups) {
      const pyramid = buildNumberPyramid(
        numberPyramidPlans[yearGroup],
        buildRandom(yearGroup),
      );
      const longest = findLongestEntry(pyramid);
      for (const { value } of pyramid.bricks) {
        expect(
          formatPyramidNumber(value, pyramid.unitsPerWhole).replaceAll(",", "")
            .length,
        ).toBeLessThanOrEqual(longest);
      }
    }
  });
});
