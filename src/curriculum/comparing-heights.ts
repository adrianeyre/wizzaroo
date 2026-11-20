import { listWholeNumbers } from "./counting-to-20.js";

export const comparingHeightsDifficulties = [1, 2] as const;
export type ComparingHeightsDifficulty =
  (typeof comparingHeightsDifficulties)[number];

export type HeightExtreme = "tallest" | "shortest";

export interface ComparingHeightsQuestion {
  extreme: HeightExtreme;
  heights: number[];
  answer: number;
}

export const shortestHeight = 1;
export const tallestHeight = 8;
const heightsShown = 4;
const extremes: readonly HeightExtreme[] = ["tallest", "shortest"];

const listHeightSets = (): number[][] => {
  const heights = listWholeNumbers(shortestHeight, tallestHeight);
  const growSets = (chosen: number[], from: number): number[][] =>
    chosen.length === heightsShown
      ? [chosen]
      : heights
          .filter((height) => height >= from)
          .flatMap((height) => growSets([...chosen, height], height + 1));
  return growSets([], shortestHeight);
};

const findAnswer = (heights: readonly number[], extreme: HeightExtreme) =>
  extreme === "tallest" ? Math.max(...heights) : Math.min(...heights);

const findClosestGap = (heights: readonly number[], extreme: HeightExtreme) => {
  const sorted = heights.toSorted((first, second) => first - second);
  return extreme === "tallest"
    ? sorted[sorted.length - 1] - sorted[sorted.length - 2]
    : sorted[1] - sorted[0];
};

const findSmallestGap = (heights: readonly number[]) =>
  Math.min(...heights.slice(1).map((height, index) => height - heights[index]));

export const buildComparingHeightsQuestions = (
  difficulty: ComparingHeightsDifficulty,
): ComparingHeightsQuestion[] =>
  extremes.flatMap((extreme) =>
    listHeightSets()
      .filter((heights) =>
        difficulty === 1
          ? findSmallestGap(heights) >= 2
          : findClosestGap(heights, extreme) === 1,
      )
      .map((heights) => ({
        extreme,
        heights,
        answer: findAnswer(heights, extreme),
      })),
  );
