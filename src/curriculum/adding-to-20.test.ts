import { describe, expect, it } from "vitest";
import {
  additionDifficulties,
  buildAdditionQuestions,
  listAdditionSlips,
} from "./adding-to-20.js";

describe("buildAdditionQuestions", () => {
  it("keeps every total within 20, each part a whole number", () => {
    for (const difficulty of additionDifficulties) {
      for (const { first, second, answer } of buildAdditionQuestions(
        difficulty,
      )) {
        expect(answer).toBe(first + second);
        expect(answer).toBeLessThanOrEqual(20);
        expect(Math.min(first, second)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("adds within 10 first, then bridges 10, then adds 10 and zero", () => {
    expect(buildAdditionQuestions(1).every(({ answer }) => answer <= 10)).toBe(
      true,
    );
    expect(buildAdditionQuestions(2).every(({ answer }) => answer > 10)).toBe(
      true,
    );
    expect(
      buildAdditionQuestions(3).every(
        ({ first, second }) =>
          first === 10 || second === 10 || first === 0 || second === 0,
      ),
    ).toBe(true);
  });
});

describe("listAdditionSlips", () => {
  it("offers the totals a Child might reach by miscounting, never the answer", () => {
    expect(listAdditionSlips({ first: 3, second: 4, answer: 7 })).toEqual([
      6, 8, 4, 9, 5,
    ]);
  });
});
