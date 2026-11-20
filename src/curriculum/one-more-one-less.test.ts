import { describe, expect, it } from "vitest";
import {
  buildOneMoreOneLessQuestions,
  buildTenMoreTenLessQuestions,
  listOneMoreOneLessSlips,
  listTenMoreTenLessSlips,
  oneMoreOneLessDifficulties,
  tenMoreTenLessDifficulties,
} from "./one-more-one-less.js";

describe("buildOneMoreOneLessQuestions", () => {
  it.each(oneMoreOneLessDifficulties)(
    "makes every answer at Difficulty %i exactly one more or one less than its start, from 1 to 20",
    (difficulty) => {
      for (const { start, step, answer } of buildOneMoreOneLessQuestions(
        difficulty,
      )) {
        expect(answer).toBe(step === "one-more" ? start + 1 : start - 1);
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(Math.max(start, answer)).toBeLessThanOrEqual(20);
      }
    },
  );

  it("starts with one more within 10, then adds one less, then works within 20", () => {
    const listSteps = (difficulty: 1 | 2 | 3) =>
      new Set(buildOneMoreOneLessQuestions(difficulty).map(({ step }) => step));
    const findLargest = (difficulty: 1 | 2 | 3) =>
      Math.max(
        ...buildOneMoreOneLessQuestions(difficulty).map(({ start, answer }) =>
          Math.max(start, answer),
        ),
      );

    expect(listSteps(1)).toEqual(new Set(["one-more"]));
    expect(listSteps(2)).toEqual(new Set(["one-more", "one-less"]));
    expect(findLargest(2)).toBe(10);
    expect(findLargest(3)).toBe(20);
  });
});

describe("listOneMoreOneLessSlips", () => {
  it("offers the start itself, the other way and two away, which are the usual slips", () => {
    expect(
      listOneMoreOneLessSlips({ start: 7, step: "one-more", answer: 8 }),
    ).toEqual([7, 6, 9, 5]);
  });

  it("never offers a number below zero, and always leaves at least three slips", () => {
    const slips = listOneMoreOneLessSlips({
      start: 2,
      step: "one-less",
      answer: 1,
    });

    expect(slips).toEqual([2, 3, 0, 4]);
  });
});

describe("buildTenMoreTenLessQuestions", () => {
  it("counts on in tens from whole tens, then from any number, then back as well", () => {
    expect(
      buildTenMoreTenLessQuestions(1).every(
        ({ start, step }) => step === "ten-more" && start % 10 === 0,
      ),
    ).toBe(true);
    for (const difficulty of tenMoreTenLessDifficulties) {
      for (const { start, step, answer } of buildTenMoreTenLessQuestions(
        difficulty,
      )) {
        expect(answer).toBe(start + (step === "ten-more" ? 10 : -10));
        expect(answer).toBeGreaterThan(0);
        expect(answer).toBeLessThan(100);
      }
    }
    expect(
      buildTenMoreTenLessQuestions(3).some(({ step }) => step === "ten-less"),
    ).toBe(true);
  });

  it("offers the start, one out and the wrong way as slips", () => {
    expect(
      listTenMoreTenLessSlips({ start: 34, step: "ten-more", answer: 44 }),
    ).toEqual([34, 45, 43, 24, 54]);
  });
});
