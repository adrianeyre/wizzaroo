import { roundToThousandths } from "./number-format.js";

export const placeValueDifficulties = [1, 2, 3] as const;
export type PlaceValueDifficulty = (typeof placeValueDifficulties)[number];
export type PlaceValueYear = 3 | 4 | 5 | 6;

export interface PlaceValueColumn {
  value: number;
  count: number;
}

export interface PlaceValueQuestion {
  columns: PlaceValueColumn[];
  answer: number;
  slips: number[];
}

export const placeValuesByYear: Record<PlaceValueYear, readonly number[]> = {
  3: [100, 10, 1],
  4: [1000, 100, 10, 1],
  5: [1, 0.1, 0.01],
  6: [1_000_000, 100_000, 10_000, 1000],
};

const digitPatterns: readonly (readonly number[])[] = [
  [3, 4, 2, 5],
  [6, 1, 7, 3],
  [2, 8, 5, 6],
  [7, 3, 9, 1],
  [4, 6, 1, 8],
  [5, 2, 4, 7],
  [8, 5, 3, 2],
  [9, 7, 6, 4],
];

const buildColumns = (
  values: readonly number[],
  counts: readonly number[],
): PlaceValueColumn[] =>
  values.map((value, index) => ({ value, count: counts[index] }));

const totalColumns = (columns: readonly PlaceValueColumn[]) =>
  roundToThousandths(
    columns.reduce((total, { value, count }) => total + value * count, 0),
  );

const listPlaceValueSlips = (columns: readonly PlaceValueColumn[]) => {
  const answer = totalColumns(columns);
  const reversed = buildColumns(
    columns.map(({ value }) => value),
    columns.map(({ count }) => count).toReversed(),
  );
  const shifted = buildColumns(
    columns.map(({ value }) => value),
    [...columns.slice(1).map(({ count }) => count), 0],
  );
  const smallest = columns[columns.length - 1].value;
  const largest = columns[0].value;
  return [
    totalColumns(reversed),
    totalColumns(shifted),
    roundToThousandths(answer + largest),
    roundToThousandths(answer - smallest),
    roundToThousandths(answer + smallest),
  ].filter(
    (slip, position, slips) =>
      slip > 0 && slip !== answer && slips.indexOf(slip) === position,
  );
};

const shapeCounts = (
  pattern: readonly number[],
  columnCount: number,
  difficulty: PlaceValueDifficulty,
  patternIndex: number,
): number[] => {
  const counts = pattern.slice(0, columnCount);
  if (difficulty === 2) {
    counts[1 + (patternIndex % (columnCount - 1))] = 0;
  }
  if (difficulty === 3) {
    counts[columnCount - 2] += 10;
  }
  return counts;
};

export const buildPlaceValueQuestions = (
  year: PlaceValueYear,
  difficulty: PlaceValueDifficulty,
): PlaceValueQuestion[] => {
  const values = placeValuesByYear[year];
  return digitPatterns.map((pattern, patternIndex) => {
    const columns = buildColumns(
      values,
      shapeCounts(pattern, values.length, difficulty, patternIndex),
    );
    return {
      columns,
      answer: totalColumns(columns),
      slips: listPlaceValueSlips(columns),
    };
  });
};
