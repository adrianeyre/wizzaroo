import { describe, expect, it } from "vitest";
import {
  buildCountingInStepsQuestions,
  listCountingInStepsSlips,
} from "./counting-in-steps.js";

describe("buildCountingInStepsQuestions", () => {
  it("counts in tens, then fives, then twos, from zero", () => {
    expect(buildCountingInStepsQuestions(1)[0]).toEqual({
      step: 10,
      shown: [0, 10, 20],
      answer: 30,
    });
    expect(buildCountingInStepsQuestions(2).at(-1)).toEqual({
      step: 5,
      shown: [35, 40, 45],
      answer: 50,
    });
    expect(
      buildCountingInStepsQuestions(3).every(
        ({ step, shown, answer }) =>
          step === 2 && answer === shown[2] + 2 && answer % 2 === 0,
      ),
    ).toBe(true);
  });
});

describe("listCountingInStepsSlips", () => {
  it("offers counting on in ones and jumping too far", () => {
    expect(
      listCountingInStepsSlips({ step: 5, shown: [5, 10, 15], answer: 20 }),
    ).toEqual([21, 16, 25, 15, 19]);
  });
});

describe("the Year 2 sequences", () => {
  it("counts in threes from zero, in tens from any number, and back in fives", () => {
    expect(buildCountingInStepsQuestions(4)[1]).toEqual({
      step: 3,
      shown: [3, 6, 9],
      answer: 12,
    });
    for (const { shown, answer } of buildCountingInStepsQuestions(5)) {
      expect(shown[0] % 10).not.toBe(0);
      expect(answer - shown[2]).toBe(10);
    }
    for (const { shown, answer } of buildCountingInStepsQuestions(6)) {
      expect(shown[0] - shown[1]).toBe(5);
      expect(answer).toBe(shown[2] - 5);
      expect(answer).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("the Year 3 to 6 sequences", () => {
  it("steps evenly in every sequence, through zero in Year 4 and with decimals in Years 5 and 6", () => {
    for (const difficulty of [
      7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ] as const) {
      const questions = buildCountingInStepsQuestions(difficulty);
      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const { step, shown, answer } of questions) {
        expect(shown[1] - shown[0]).toBeCloseTo(step, 6);
        expect(answer - shown[2]).toBeCloseTo(step, 6);
        expect(
          listCountingInStepsSlips({ step, shown, answer }).length,
        ).toBeGreaterThanOrEqual(3);
      }
    }
    expect(
      buildCountingInStepsQuestions(12).some(({ answer }) => answer < 0),
    ).toBe(true);
    expect(buildCountingInStepsQuestions(15)[1]).toEqual({
      step: 0.1,
      shown: [0.1, 0.2, 0.3],
      answer: 0.4,
    });
  });
});
