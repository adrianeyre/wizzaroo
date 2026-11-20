import { describe, expect, it } from "vitest";
import {
  buildGridReference,
  findGridOrigin,
  gridSquareCount,
  type GeographyShowOf,
  type GridStyle,
} from "../../curriculum/geography.js";
import {
  boardWorldSize,
  buildGridAxisLabels,
  findBoardPosition,
  findGridPointAt,
  findPinGridPoint,
  readGridReferenceAt,
} from "./grid-board-layout.js";

const buildShow = (
  style: GridStyle,
  x: number,
  y: number,
): GeographyShowOf<"grid-hunt"> => ({ scene: "grid-hunt", style, x, y });

const listWholeNumbers = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_unused, index) => from + index);

const letterShows = listWholeNumbers(0, 5).flatMap((x) =>
  listWholeNumbers(1, 6).map((y) => buildShow("letters", x, y)),
);

const fourFigureShows = [0, 3, 7, 23, 41, 58, 64, 90, 94, 97, 99].flatMap((x) =>
  [0, 4, 12, 45, 66, 95, 99].map((y) => buildShow("four-figure", x, y)),
);

const sixFigureShows = [
  0, 0.1, 2.9, 3, 4.9, 5, 23.4, 29.9, 45.7, 50.5, 94.2, 99.9,
].flatMap((x) =>
  [0, 0.9, 7.3, 12.5, 45.7, 66.6, 89.1, 99.9].map((y) =>
    buildShow("six-figure", x, y),
  ),
);

const everyShow = [...letterShows, ...fourFigureShows, ...sixFigureShows];

const readPinOnBoard = (show: GeographyShowOf<"grid-hunt">): string => {
  const labels = buildGridAxisLabels(show.style, findGridOrigin(show));
  const pinPosition = findBoardPosition(findPinGridPoint(show));
  return readGridReferenceAt(show.style, labels, findGridPointAt(pinPosition));
};

describe("the grid hunt board", () => {
  it.each(everyShow.map((show) => [buildGridReference(show), show] as const))(
    "reads %s back from where the pin stands on the board",
    (reference, show) => {
      expect(readPinOnBoard(show)).toBe(reference);
    },
  );

  it.each(everyShow.map((show) => [buildGridReference(show), show] as const))(
    "stands the pin for %s inside the grid and on the board",
    (_reference, show) => {
      const point = findPinGridPoint(show);
      const position = findBoardPosition(point);

      expect(point.across).toBeGreaterThanOrEqual(0);
      expect(point.across).toBeLessThan(gridSquareCount);
      expect(point.up).toBeGreaterThanOrEqual(0);
      expect(point.up).toBeLessThan(gridSquareCount);
      expect(Math.abs(position.x)).toBeLessThan(boardWorldSize / 2);
      expect(Math.abs(position.y)).toBeLessThan(boardWorldSize / 2);
    },
  );

  it("puts a letters pin in the middle of its square", () => {
    expect(findPinGridPoint(buildShow("letters", 2, 5))).toEqual({
      across: 2.5,
      up: 4.5,
    });
  });

  it("puts a six-figure pin exactly on its point", () => {
    const point = findPinGridPoint(buildShow("six-figure", 23.4, 45.7));

    expect(point.across).toBeCloseTo(3.4);
    expect(point.up).toBeCloseTo(0.7);
  });

  it("labels the squares for letters, and the lines for figures", () => {
    expect(buildGridAxisLabels("letters", { x: 0, y: 1 })).toEqual({
      along: ["A", "B", "C", "D", "E", "F"],
      upward: ["1", "2", "3", "4", "5", "6"],
    });
    expect(buildGridAxisLabels("four-figure", { x: 94, y: 5 })).toEqual({
      along: ["94", "95", "96", "97", "98", "99", "00"],
      upward: ["05", "06", "07", "08", "09", "10", "11"],
    });
  });
});
