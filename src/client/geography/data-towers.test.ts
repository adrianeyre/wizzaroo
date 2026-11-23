import { describe, expect, it } from "vitest";
import type { DataBar } from "../../curriculum/geography.js";
import { geographyGames } from "../../curriculum/geography-games.js";
import { buildChartScale } from "./chart-scale.js";
import {
  listTowerValueLabels,
  towerValueFontPixels,
  unitLabelBottomPixel,
} from "./data-towers.js";

const climateRainfall: DataBar[] = [
  { label: "Jan", value: 56 },
  { label: "Mar", value: 41 },
  { label: "May", value: 49 },
  { label: "Jul", value: 45 },
  { label: "Sep", value: 50 },
  { label: "Nov", value: 60 },
];

const everyChart = geographyGames.flatMap(({ questions }) =>
  questions.flatMap(({ ask, show }) =>
    show.scene === "data-towers" ? [{ ask, bars: show.bars }] : [],
  ),
);

describe("the data towers' values", () => {
  it("writes each tower's exact value on the chart, so a Child never has to guess between gridlines", () => {
    const labels = listTowerValueLabels(
      climateRainfall,
      buildChartScale(Math.max(...climateRainfall.map(({ value }) => value))),
    );

    expect(labels.map(({ text }) => text)).toEqual([
      "56",
      "41",
      "49",
      "45",
      "50",
      "60",
    ]);
  });

  it.each(everyChart)(
    "puts each value just above its own tower, clear of the unit ($ask)",
    ({ bars }) => {
      const labels = listTowerValueLabels(
        bars,
        buildChartScale(Math.max(...bars.map(({ value }) => value))),
      );
      const xs = labels.map(({ x }) => x);

      expect(labels).toHaveLength(bars.length);
      expect(xs).toEqual(xs.toSorted((first, second) => first - second));
      for (const { y, towerTop } of labels) {
        expect(y + towerValueFontPixels / 2).toBeLessThanOrEqual(towerTop);
        expect(y - towerValueFontPixels / 2).toBeGreaterThan(
          unitLabelBottomPixel,
        );
      }
    },
  );
});
