import { describe, expect, it } from "vitest";
import {
  buildTakingAwayQuestions,
  listTakingAwaySlips,
  takingAwayDifficulties,
} from "./taking-away-within-20.js";

describe("buildTakingAwayQuestions", () => {
  it("never takes away more than there is, and starts within 20", () => {
    for (const difficulty of takingAwayDifficulties) {
      const questions = buildTakingAwayQuestions(difficulty);
      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const { start, takenAway, answer } of questions) {
        expect(answer).toBe(start - takenAway);
        expect(answer).toBeGreaterThan(0);
        expect(start).toBeLessThanOrEqual(20);
      }
    }
  });

  it("stays within 10, then above 10, then crosses back below 10", () => {
    expect(buildTakingAwayQuestions(1).every(({ start }) => start <= 10)).toBe(
      true,
    );
    expect(
      buildTakingAwayQuestions(2).every(({ answer }) => answer >= 10),
    ).toBe(true);
    expect(
      buildTakingAwayQuestions(3).every(
        ({ start, answer }) => start > 10 && answer < 10,
      ),
    ).toBe(true);
  });
});

describe("listTakingAwaySlips", () => {
  it("includes adding instead of taking away", () => {
    expect(
      listTakingAwaySlips({ start: 8, takenAway: 3, answer: 5 }),
    ).toContain(11);
  });
});
