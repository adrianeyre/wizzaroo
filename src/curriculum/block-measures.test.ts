import { describe, expect, it } from "vitest";
import {
  blockMeasureDifficulties,
  buildBlockMeasureQuestions,
  describeBlockMeasure,
  listBlockMeasureSlips,
} from "./block-measures.js";

describe("buildBlockMeasureQuestions", () => {
  it("asks perimeter in Year 4, area in Year 5 and volume in Year 6, each answer right", () => {
    for (const year of [4, 5, 6] as const) {
      for (const difficulty of blockMeasureDifficulties) {
        const questions = buildBlockMeasureQuestions(year, difficulty);
        expect(questions.length).toBeGreaterThanOrEqual(5);
        for (const question of questions) {
          const { kind, length, width, height, answer } = question;
          const expected = {
            perimeter: 2 * (length + width),
            area: length * width,
            volume: length * width * height,
          }[kind];
          expect(answer).toBe(expected);
          expect(listBlockMeasureSlips(question).length).toBeGreaterThanOrEqual(
            3,
          );
          expect(length * width * height).toBeLessThanOrEqual(150);
        }
      }
    }
    expect(buildBlockMeasureQuestions(4, 1)[0].kind).toBe("perimeter");
    expect(buildBlockMeasureQuestions(6, 1)[0].kind).toBe("volume");
  });

  it("writes the unit for each measure", () => {
    expect(describeBlockMeasure("area", 12)).toBe("12 cm²");
    expect(describeBlockMeasure("volume", 24)).toBe("24 cm³");
  });
});
