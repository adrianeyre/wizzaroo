import { listWholeNumbers } from "./counting-to-20.js";

export const moreAndLessDifficulties = [1, 2, 3] as const;
export type MoreAndLessDifficulty = (typeof moreAndLessDifficulties)[number];
export type MoreAndLessYear = 3 | 4 | 5;

export interface MoreAndLessQuestion {
  start: number;
  change: number;
  answer: number;
}

const startsByYear: Record<MoreAndLessYear, readonly number[]> = {
  3: [345, 512, 287, 693, 408, 156, 734, 960, 821, 199],
  4: [3456, 5120, 2875, 6934, 4087, 1562, 7341, 9604, 8213, 1999],
  5: [345_612, 512_034, 287_509, 693_421, 408_765, 156_230, 734_118, 860_402],
};

const changesByYear: Record<
  MoreAndLessYear,
  Record<MoreAndLessDifficulty, readonly number[]>
> = {
  3: { 1: [10, 100], 2: [-10, -100], 3: [10, -10, 100, -100] },
  4: { 1: [1000], 2: [-1000], 3: [1000, -1000, 100, -100] },
  5: { 1: [10_000], 2: [-10_000, 100_000], 3: [100_000, -100_000, -10_000] },
};

export const buildMoreAndLessQuestions = (
  year: MoreAndLessYear,
  difficulty: MoreAndLessDifficulty,
): MoreAndLessQuestion[] =>
  changesByYear[year][difficulty].flatMap((change) =>
    startsByYear[year]
      .filter((start) => start + change > 0 && start + change < 1_000_000)
      .map((start) => ({ start, change, answer: start + change })),
  );

export const listMoreAndLessSlips = ({
  start,
  change,
  answer,
}: MoreAndLessQuestion): number[] =>
  [
    start - change,
    start + change * 10,
    answer + Math.sign(change),
    start,
    answer - change / 10,
  ].filter(
    (slip, position, slips) =>
      slip > 0 && slip !== answer && slips.indexOf(slip) === position,
  );

export const temperatureDifficulties = [1, 2, 3] as const;
export type TemperatureDifficulty = (typeof temperatureDifficulties)[number];

export interface TemperatureQuestion {
  start: number;
  change: number;
  answer: number;
}

export const coldestTemperature = -10;
export const warmestTemperature = 10;

export const buildTemperatureQuestions = (
  difficulty: TemperatureDifficulty,
): TemperatureQuestion[] =>
  listWholeNumbers(coldestTemperature, warmestTemperature).flatMap((start) =>
    listWholeNumbers(2, 9)
      .flatMap((size) => [size, -size])
      .filter((change) => {
        const answer = start + change;
        const isInRange =
          answer >= coldestTemperature && answer <= warmestTemperature;
        const crossesZero = Math.sign(start) * Math.sign(answer) < 0;
        switch (difficulty) {
          case 1:
            return (
              isInRange && start >= 0 && answer < 0 && start + change >= -5
            );
          case 2:
            return isInRange && start < 0 && answer > 0;
          case 3:
            return isInRange && start < 0 && answer < 0 && !crossesZero;
        }
      })
      .filter((_change, index) => index % 2 === 0)
      .map((change) => ({ start, change, answer: start + change })),
  );

export const listTemperatureSlips = ({
  start,
  change,
  answer,
}: TemperatureQuestion): number[] =>
  [
    -answer,
    start - change,
    answer + 1,
    answer - 1,
    Math.abs(start) + change,
  ].filter(
    (slip, position, slips) =>
      slip !== answer && slips.indexOf(slip) === position,
  );
