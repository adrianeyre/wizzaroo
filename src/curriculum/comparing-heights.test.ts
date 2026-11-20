import { describe, expect, it } from "vitest";
import { buildComparingHeightsQuestions } from "./comparing-heights.js";

describe("buildComparingHeightsQuestions", () => {
  it("shows four different heights and asks for the tallest or shortest", () => {
    for (const difficulty of [1, 2] as const) {
      const questions = buildComparingHeightsQuestions(difficulty);
      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const { extreme, heights, answer } of questions) {
        expect(new Set(heights).size).toBe(4);
        expect(answer).toBe(
          extreme === "tallest" ? Math.max(...heights) : Math.min(...heights),
        );
      }
    }
  });

  it("starts with heights that differ clearly, then makes the answer close", () => {
    for (const { heights } of buildComparingHeightsQuestions(1)) {
      expect(
        heights.slice(1).every((height, index) => height - heights[index] >= 2),
      ).toBe(true);
    }
    for (const { extreme, heights, answer } of buildComparingHeightsQuestions(
      2,
    )) {
      expect(heights).toContain(
        extreme === "tallest" ? answer - 1 : answer + 1,
      );
    }
  });
});
