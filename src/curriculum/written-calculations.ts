import type { AdditionQuestion } from "./adding-to-20.js";
import { roundToThousandths } from "./number-format.js";
import type { TakingAwayQuestion } from "./taking-away-within-20.js";

export const writtenCalculationDifficulties = [1, 2, 3] as const;
export type WrittenCalculationDifficulty =
  (typeof writtenCalculationDifficulties)[number];
export type WrittenCalculationYear = 3 | 4 | 5 | 6;

type NumberPair = readonly [number, number];

const additionPairs: Record<
  WrittenCalculationYear,
  Record<WrittenCalculationDifficulty, readonly NumberPair[]>
> = {
  3: {
    1: [
      [324, 152],
      [413, 265],
      [231, 346],
      [502, 174],
      [145, 323],
      [610, 238],
    ],
    2: [
      [347, 128],
      [256, 319],
      [438, 245],
      [175, 162],
      [529, 284],
      [363, 191],
    ],
    3: [
      [368, 257],
      [479, 186],
      [295, 347],
      [586, 238],
      [167, 455],
      [398, 327],
    ],
  },
  4: {
    1: [
      [2341, 1526],
      [4213, 2651],
      [3102, 4675],
      [1534, 2343],
      [5210, 3468],
      [6123, 2734],
    ],
    2: [
      [3467, 1285],
      [2569, 3214],
      [4378, 2456],
      [1785, 4162],
      [5293, 2848],
      [3631, 1917],
    ],
    3: [
      [3768, 2547],
      [4796, 1865],
      [2957, 3478],
      [5863, 2389],
      [1679, 4558],
      [3987, 3276],
    ],
  },
  5: {
    1: [
      [3.4, 2.5],
      [4.2, 1.6],
      [5.1, 3.7],
      [2.3, 4.4],
      [6.5, 1.2],
      [1.8, 3.1],
    ],
    2: [
      [3.45, 2.31],
      [4.27, 1.62],
      [5.18, 3.41],
      [2.36, 4.53],
      [6.52, 1.24],
      [1.83, 3.15],
    ],
    3: [
      [3.47, 2.58],
      [4.29, 1.66],
      [5.38, 2.75],
      [2.86, 4.37],
      [6.59, 1.48],
      [1.97, 3.25],
    ],
  },
  6: {
    1: [
      [245_000, 132_000],
      [312_000, 456_000],
      [503_000, 271_000],
      [128_000, 640_000],
      [417_000, 352_000],
      [230_000, 518_000],
    ],
    2: [
      [1_250_000, 2_340_000],
      [3_400_000, 1_520_000],
      [2_180_000, 4_610_000],
      [1_730_000, 3_150_000],
      [4_260_000, 2_430_000],
      [5_310_000, 1_470_000],
    ],
    3: [
      [2_750_000, 1_680_000],
      [3_590_000, 2_470_000],
      [1_860_000, 4_750_000],
      [4_380_000, 2_960_000],
      [2_670_000, 3_580_000],
      [5_490_000, 1_830_000],
    ],
  },
};

const placeOfYear: Record<WrittenCalculationYear, number> = {
  3: 1,
  4: 1,
  5: 0.01,
  6: 10_000,
};

export const buildWrittenAdditionQuestions = (
  year: WrittenCalculationYear,
  difficulty: WrittenCalculationDifficulty,
): AdditionQuestion[] =>
  additionPairs[year][difficulty].map(([first, second]) => ({
    first,
    second,
    answer: roundToThousandths(first + second),
  }));

export const buildWrittenTakingAwayQuestions = (
  year: WrittenCalculationYear,
  difficulty: WrittenCalculationDifficulty,
): TakingAwayQuestion[] =>
  additionPairs[year][difficulty].map(([first, second]) => {
    const start = roundToThousandths(first + second);
    return { start, takenAway: second, answer: first };
  });

export const listWrittenCalculationSlips = (
  year: WrittenCalculationYear,
  answer: number,
): number[] => {
  const place = placeOfYear[year];
  return [10, 100, 1, 1000]
    .map((multiple) => roundToThousandths(place * multiple))
    .flatMap((change) => [
      roundToThousandths(answer + change),
      roundToThousandths(answer - change),
    ])
    .filter(
      (slip, position, slips) =>
        slip > 0 && slip !== answer && slips.indexOf(slip) === position,
    )
    .slice(0, 5);
};
