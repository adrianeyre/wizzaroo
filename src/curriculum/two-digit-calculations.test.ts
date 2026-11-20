import { describe, expect, it } from "vitest";
import {
  buildTwoDigitAdditionQuestions,
  buildTwoDigitTakingAwayQuestions,
  listTwoDigitSlips,
  twoDigitDifficulties,
} from "./two-digit-calculations.js";

describe("buildTwoDigitAdditionQuestions", () => {
  it("adds ones, then tens, then ones that cross a ten, to a two-digit number", () => {
    for (const difficulty of twoDigitDifficulties) {
      const questions = buildTwoDigitAdditionQuestions(difficulty);
      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const { first, second, answer } of questions) {
        expect(answer).toBe(first + second);
        expect(answer).toBeLessThanOrEqual(99);
        expect(first).toBeGreaterThan(10);
      }
    }
    expect(
      buildTwoDigitAdditionQuestions(2).every(
        ({ second }) => second % 10 === 0,
      ),
    ).toBe(true);
    expect(
      buildTwoDigitAdditionQuestions(3).every(
        ({ first, answer }) => Math.floor(answer / 10) > Math.floor(first / 10),
      ),
    ).toBe(true);
  });
});

describe("buildTwoDigitTakingAwayQuestions", () => {
  it("takes away ones, then tens, then ones that cross back over a ten", () => {
    for (const difficulty of twoDigitDifficulties) {
      const questions = buildTwoDigitTakingAwayQuestions(difficulty);
      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const { start, takenAway, answer } of questions) {
        expect(answer).toBe(start - takenAway);
        expect(answer).toBeGreaterThan(0);
      }
    }
    expect(
      buildTwoDigitTakingAwayQuestions(3).every(
        ({ start, answer }) => Math.floor(answer / 10) < Math.floor(start / 10),
      ),
    ).toBe(true);
  });
});

describe("listTwoDigitSlips", () => {
  it("offers a ten out and one out", () => {
    expect(listTwoDigitSlips(47, 5)).toEqual([57, 37, 48, 46]);
  });
});
