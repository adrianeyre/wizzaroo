import { describe, expect, it } from "vitest";
import {
  buildPlaceValueQuestions,
  placeValueDifficulties,
} from "./place-value.js";

describe("buildPlaceValueQuestions", () => {
  it("totals the counters in each column, with at least three slips", () => {
    for (const year of [3, 4, 5, 6] as const) {
      for (const difficulty of placeValueDifficulties) {
        for (const { columns, answer, slips } of buildPlaceValueQuestions(
          year,
          difficulty,
        )) {
          const total = columns.reduce(
            (sum, { value, count }) => sum + value * count,
            0,
          );
          expect(answer).toBeCloseTo(total, 6);
          expect(slips.length).toBeGreaterThanOrEqual(3);
          expect(slips).not.toContain(answer);
        }
      }
    }
  });

  it("uses hundreds in Year 3, tenths and hundredths in Year 5, millions in Year 6", () => {
    expect(buildPlaceValueQuestions(3, 1)[0]).toMatchObject({ answer: 342 });
    expect(buildPlaceValueQuestions(5, 1)[0]).toMatchObject({ answer: 3.42 });
    expect(buildPlaceValueQuestions(6, 1)[0]).toMatchObject({
      answer: 3_425_000,
    });
  });

  it("puts a zero in a column, then more than nine counters in one column", () => {
    expect(
      buildPlaceValueQuestions(4, 2)[0].columns.some(
        ({ count }) => count === 0,
      ),
    ).toBe(true);
    expect(buildPlaceValueQuestions(3, 3)[0]).toMatchObject({ answer: 442 });
  });
});
