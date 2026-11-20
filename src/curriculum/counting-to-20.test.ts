import { describe, expect, it } from "vitest";
import {
  buildCountingQuestions,
  countingDifficulties,
  largestCount,
  listNearbyCounts,
  smallestCount,
} from "./counting-to-20.js";

describe("buildCountingQuestions", () => {
  it.each(countingDifficulties)(
    "keeps every count at Difficulty %i a whole number from 1 to 20, with none repeated",
    (difficulty) => {
      const counts = buildCountingQuestions(difficulty);

      expect(counts.length).toBeGreaterThanOrEqual(5);
      expect(new Set(counts).size).toBe(counts.length);
      for (const count of counts) {
        expect(Number.isInteger(count)).toBe(true);
        expect(count).toBeGreaterThanOrEqual(smallestCount);
        expect(count).toBeLessThanOrEqual(largestCount);
      }
    },
  );

  it("counts small groups first and works up to 20", () => {
    expect(Math.max(...buildCountingQuestions(1))).toBe(10);
    expect(Math.min(...buildCountingQuestions(3))).toBe(11);
    expect(Math.max(...buildCountingQuestions(3))).toBe(20);
  });
});

describe("listNearbyCounts", () => {
  it("offers the counts a Child gets by counting one or two too many or too few", () => {
    expect(listNearbyCounts(9)).toEqual([6, 7, 8, 10, 11, 12]);
  });

  it("stays within 1 to 20 and always leaves at least three other counts", () => {
    expect(listNearbyCounts(1)).toEqual([2, 3, 4]);
    expect(listNearbyCounts(20)).toEqual([17, 18, 19]);
  });
});
