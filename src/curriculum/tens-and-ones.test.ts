import { describe, expect, it } from "vitest";
import {
  buildTensAndOnesQuestions,
  listTensAndOnesSlips,
  splitTensAndOnes,
  tensAndOnesDifficulties,
} from "./tens-and-ones.js";

describe("buildTensAndOnesQuestions", () => {
  it("counts whole tens first, then two-digit numbers to 99", () => {
    expect(
      buildTensAndOnesQuestions(1).every((number) => number % 10 === 0),
    ).toBe(true);
    for (const difficulty of tensAndOnesDifficulties) {
      for (const number of buildTensAndOnesQuestions(difficulty)) {
        expect(number).toBeGreaterThanOrEqual(20);
        expect(number).toBeLessThanOrEqual(99);
      }
    }
  });
});

describe("listTensAndOnesSlips", () => {
  it("offers the digits swapped round, and one or ten out", () => {
    expect(listTensAndOnesSlips(34)).toEqual([43, 35, 33, 44, 24]);
    expect(splitTensAndOnes(34)).toEqual({ tens: 3, ones: 4 });
  });
});
