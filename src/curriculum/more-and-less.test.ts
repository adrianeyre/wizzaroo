import { describe, expect, it } from "vitest";
import {
  buildMoreAndLessQuestions,
  buildTemperatureQuestions,
  listMoreAndLessSlips,
  listTemperatureSlips,
  moreAndLessDifficulties,
  temperatureDifficulties,
} from "./more-and-less.js";

describe("buildMoreAndLessQuestions", () => {
  it("finds 10 or 100 more or less in Year 3, 1000 in Year 4, and 10,000 or 100,000 in Year 5", () => {
    const changesIn = (year: 3 | 4 | 5) =>
      new Set(
        moreAndLessDifficulties.flatMap((difficulty) =>
          buildMoreAndLessQuestions(year, difficulty).map(({ change }) =>
            Math.abs(change),
          ),
        ),
      );
    expect(changesIn(3)).toEqual(new Set([10, 100]));
    expect(changesIn(4)).toEqual(new Set([1000, 100]));
    expect(changesIn(5)).toEqual(new Set([10_000, 100_000]));
    for (const year of [3, 4, 5] as const) {
      for (const difficulty of moreAndLessDifficulties) {
        const questions = buildMoreAndLessQuestions(year, difficulty);
        expect(questions.length).toBeGreaterThanOrEqual(5);
        for (const question of questions) {
          expect(question.answer).toBe(question.start + question.change);
          expect(listMoreAndLessSlips(question).length).toBeGreaterThanOrEqual(
            3,
          );
        }
      }
    }
  });
});

describe("buildTemperatureQuestions", () => {
  it("crosses zero in Years 6, staying between −10 and 10", () => {
    for (const difficulty of temperatureDifficulties) {
      const questions = buildTemperatureQuestions(difficulty);
      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const question of questions) {
        expect(question.answer).toBe(question.start + question.change);
        expect(Math.abs(question.answer)).toBeLessThanOrEqual(10);
        expect(listTemperatureSlips(question).length).toBeGreaterThanOrEqual(3);
      }
    }
    expect(
      buildTemperatureQuestions(1).every(
        ({ start, answer }) => start >= 0 && answer < 0,
      ),
    ).toBe(true);
    expect(
      buildTemperatureQuestions(2).every(
        ({ start, answer }) => start < 0 && answer > 0,
      ),
    ).toBe(true);
  });
});
