import { describe, expect, it } from "vitest";
import {
  buildWrittenAdditionQuestions,
  buildWrittenTakingAwayQuestions,
  listWrittenCalculationSlips,
  writtenCalculationDifficulties,
} from "./written-calculations.js";

describe("written calculations", () => {
  it("adds and takes away, each answer right, with slips one place out", () => {
    for (const year of [3, 4, 5, 6] as const) {
      for (const difficulty of writtenCalculationDifficulties) {
        const additions = buildWrittenAdditionQuestions(year, difficulty);
        const takeAways = buildWrittenTakingAwayQuestions(year, difficulty);
        expect(additions.length).toBeGreaterThanOrEqual(5);
        for (const { first, second, answer } of additions) {
          expect(answer).toBeCloseTo(first + second, 6);
          expect(
            listWrittenCalculationSlips(year, answer).length,
          ).toBeGreaterThanOrEqual(3);
        }
        for (const { start, takenAway, answer } of takeAways) {
          expect(answer).toBeCloseTo(start - takenAway, 6);
        }
      }
    }
  });

  it("uses three digits in Year 3, four in Year 4, decimals in Year 5 and large numbers in Year 6", () => {
    expect(buildWrittenAdditionQuestions(3, 1)[0].answer).toBe(476);
    expect(buildWrittenAdditionQuestions(4, 3)[0].answer).toBe(6315);
    expect(buildWrittenAdditionQuestions(5, 2)[0].answer).toBe(5.76);
    expect(buildWrittenAdditionQuestions(6, 1)[0].answer).toBe(377_000);
  });

  it("regroups more as the difficulty rises", () => {
    const [noRegroup] = buildWrittenAdditionQuestions(3, 1);
    expect((noRegroup.first % 10) + (noRegroup.second % 10)).toBeLessThan(10);
    const [twoRegroups] = buildWrittenAdditionQuestions(3, 3);
    expect(
      (twoRegroups.first % 10) + (twoRegroups.second % 10),
    ).toBeGreaterThanOrEqual(10);
  });
});
