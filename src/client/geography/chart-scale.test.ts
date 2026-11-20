import { describe, expect, it } from "vitest";
import {
  buildChartScale,
  describeGridlineValue,
  findBarShare,
  findGridlineValue,
} from "./chart-scale.js";

const isNiceStep = (step: number): boolean => {
  const exponent = Math.floor(Math.log10(step) + 1e-9);
  const multiplier = Math.round((step / 10 ** exponent) * 1000) / 1000;
  return [1, 2, 5].includes(multiplier);
};

describe("the bar chart scale", () => {
  it.each([
    [12, 2, 6],
    [9, 2, 5],
    [10, 2, 5],
    [3, 1, 4],
    [13, 5, 4],
    [37, 10, 4],
    [100, 20, 5],
    [250, 50, 5],
    [1234, 500, 4],
    [0, 1, 4],
    [0.6, 0.1, 6],
  ])(
    "scales a largest bar of %d in steps of %d with %d gridlines",
    (largest, step, lineCount) => {
      const scale = buildChartScale(largest);

      expect(scale.step).toBeCloseTo(step);
      expect(scale.lineCount).toBe(lineCount);
      expect(scale.top).toBeCloseTo(step * lineCount);
    },
  );

  it.each([
    1, 2, 4, 5, 6, 7, 8, 11, 15, 17, 19, 21, 24, 29, 31, 42, 49, 55, 61, 77, 88,
    99, 101, 140, 199, 360, 512, 999, 1500, 7777, 23_456, 1_000_000, 0.35, 2.5,
  ])("keeps %d under a nice top with four to six gridlines", (largest) => {
    const scale = buildChartScale(largest);

    expect(isNiceStep(scale.step)).toBe(true);
    expect(scale.lineCount).toBeGreaterThanOrEqual(4);
    expect(scale.lineCount).toBeLessThanOrEqual(6);
    expect(scale.top).toBeGreaterThanOrEqual(largest);
    expect(scale.lineCount === 4 || scale.top - scale.step < largest).toBe(
      true,
    );
    expect(largest >= 1 ? scale.step : 1).toBeGreaterThanOrEqual(1);
  });

  it("makes each bar exactly its share of the top of the scale", () => {
    const scale = buildChartScale(12);

    expect(findBarShare(scale, 12)).toBe(1);
    expect(findBarShare(scale, 3)).toBe(0.25);
    expect(findBarShare(scale, 0)).toBe(0);
  });

  it("numbers the gridlines without rounding noise", () => {
    const scale = buildChartScale(0.6);

    expect(describeGridlineValue(findGridlineValue(scale, 3))).toBe("0.3");
    expect(
      describeGridlineValue(findGridlineValue(buildChartScale(4000), 2)),
    ).toBe("2,000");
  });
});
