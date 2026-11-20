export const countingDifficulties = [1, 2, 3] as const;
export type CountingDifficulty = (typeof countingDifficulties)[number];

interface CountRange {
  smallest: number;
  largest: number;
}

export const smallestCount = 1;
export const largestCount = 20;

const countRanges: Record<CountingDifficulty, CountRange> = {
  1: { smallest: smallestCount, largest: 10 },
  2: { smallest: 6, largest: 15 },
  3: { smallest: 11, largest: largestCount },
};

const nearbyReach = 3;

export const listWholeNumbers = (smallest: number, largest: number): number[] =>
  Array.from(
    { length: largest - smallest + 1 },
    (_, offset) => smallest + offset,
  );

export const buildCountingQuestions = (
  difficulty: CountingDifficulty,
): number[] => {
  const { smallest, largest } = countRanges[difficulty];
  return listWholeNumbers(smallest, largest);
};

export const listNearbyCounts = (count: number): number[] =>
  listWholeNumbers(
    Math.max(smallestCount, count - nearbyReach),
    Math.min(largestCount, count + nearbyReach),
  ).filter((nearby) => nearby !== count);
