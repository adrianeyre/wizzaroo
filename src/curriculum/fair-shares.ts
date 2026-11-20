import { listWholeNumbers } from "./counting-to-20.js";
import { formatNumber } from "./number-format.js";
import {
  buildNumberQuestion,
  type PictureQuestion,
  type PictureQuestionDifficulty,
} from "./picture-questions.js";

export type SharePicture =
  | { kind: "groups"; groupCount: number; perGroup: number }
  | { kind: "share"; total: number; groupCount: number }
  | { kind: "array"; rows: number; columns: number }
  | { kind: "pairs" }
  | { kind: "ratio"; groupCount: number; first: number; second: number }
  | { kind: "scale"; length: number; factor: number }
  | { kind: "parts"; total: number; firstParts: number; secondParts: number };

export type FairShareQuestion = PictureQuestion<SharePicture>;

export type FairShareYear = 1 | 2 | 6;

const buildDouble = (number: number): FairShareQuestion =>
  buildNumberQuestion(
    `Double ${formatNumber(number)} is ?`,
    { kind: "groups", groupCount: 2, perGroup: number },
    number * 2,
    [number, number * 2 + 1, number * 2 - 1, number + 2, number * 2 + 2],
  );

const buildGroups = (groupCount: number, perGroup: number): FairShareQuestion =>
  buildNumberQuestion(
    `${formatNumber(groupCount)} groups of ${formatNumber(perGroup)} make ?`,
    { kind: "groups", groupCount, perGroup },
    groupCount * perGroup,
    [
      groupCount + perGroup,
      groupCount * perGroup + 1,
      groupCount * perGroup - 1,
      (groupCount - 1) * perGroup,
      (groupCount + 1) * perGroup,
    ],
  );

const buildTimes = (groupCount: number, table: number): FairShareQuestion =>
  buildNumberQuestion(
    `${formatNumber(groupCount)} × ${formatNumber(table)} = ?`,
    { kind: "groups", groupCount, perGroup: table },
    groupCount * table,
    [
      groupCount + table,
      (groupCount + 1) * table,
      (groupCount - 1) * table,
      groupCount * table + 1,
      groupCount * table - 1,
    ],
  );

const buildArray = (rows: number, columns: number): FairShareQuestion =>
  buildNumberQuestion(
    `${formatNumber(rows)} rows of ${formatNumber(columns)} fish. How many fish?`,
    { kind: "array", rows, columns },
    rows * columns,
    [
      rows + columns,
      rows * columns + 1,
      rows * columns - 1,
      rows * (columns - 1),
      (rows + 1) * columns,
    ],
  );

const buildSharing = (total: number, groupCount: number): FairShareQuestion =>
  buildNumberQuestion(
    `Share ${formatNumber(total)} pearls equally between ${formatNumber(groupCount)} crabs. How many does each crab get?`,
    { kind: "share", total, groupCount },
    total / groupCount,
    [
      total,
      total / groupCount + 1,
      total / groupCount - 1,
      total - groupCount,
      groupCount,
    ],
  );

const buildDivision = (total: number, divisor: number): FairShareQuestion =>
  buildNumberQuestion(
    `${formatNumber(total)} ÷ ${formatNumber(divisor)} = ?`,
    { kind: "share", total, groupCount: divisor },
    total / divisor,
    [
      total - divisor,
      total / divisor + 1,
      total / divisor - 1,
      total + divisor,
      divisor,
    ],
  );

const buildMissingFactor = (factor: number, table: number): FairShareQuestion =>
  buildNumberQuestion(
    `? × ${formatNumber(table)} = ${formatNumber(factor * table)}`,
    { kind: "array", rows: factor, columns: table },
    factor,
    [factor * table - table, factor + 1, factor - 1, table, factor + 2],
  );

const buildSwapped = (first: number, table: number): FairShareQuestion =>
  buildNumberQuestion(
    `${formatNumber(first)} × ${formatNumber(table)} = ${formatNumber(table)} × ?`,
    { kind: "array", rows: first, columns: table },
    first,
    [table, first * table, first + 1, first - 1, first + table],
  );

const buildOddOrEven = (answer: number): FairShareQuestion => {
  const isEven = answer % 2 === 0;
  return buildNumberQuestion(
    `Which number is ${isEven ? "even" : "odd"}? Look for an odd one out in the pairs.`,
    { kind: "pairs" },
    answer,
    [answer - 1, answer + 1, answer + 3],
  );
};

const buildRatio = (
  first: number,
  second: number,
  groupCount: number,
): FairShareQuestion =>
  buildNumberQuestion(
    `For every ${formatNumber(first)} red ${first === 1 ? "shell" : "shells"} there ${second === 1 ? "is" : "are"} ${formatNumber(second)} blue. There are ${formatNumber(first * groupCount)} red shells. How many blue shells are there?`,
    { kind: "ratio", groupCount, first, second },
    second * groupCount,
    [
      first * groupCount,
      second + groupCount,
      (first + second) * groupCount,
      second * groupCount + second,
      second * groupCount - second,
      second * groupCount + 1,
    ],
  );

const buildScaleUp = (length: number, factor: number): FairShareQuestion =>
  buildNumberQuestion(
    `A model boat is ${formatNumber(length)} cm long. A bigger boat is the same shape, scaled by a factor of ${formatNumber(factor)}. How long is it?`,
    { kind: "scale", length, factor },
    length * factor,
    [
      length + factor,
      length * factor + length,
      length * factor - length,
      length * factor + 1,
    ],
    " cm",
  );

const buildMapScale = (
  length: number,
  metresPerCentimetre: number,
): FairShareQuestion =>
  buildNumberQuestion(
    `On a map, 1 cm stands for ${formatNumber(metresPerCentimetre)} m. Two rocks are ${formatNumber(length)} cm apart on the map. How far apart are they really?`,
    { kind: "scale", length, factor: metresPerCentimetre },
    length * metresPerCentimetre,
    [
      length + metresPerCentimetre,
      length * metresPerCentimetre + metresPerCentimetre,
      length * metresPerCentimetre - metresPerCentimetre,
      length * 10,
    ],
    " m",
  );

const buildScaleFactor = (length: number, factor: number): FairShareQuestion =>
  buildNumberQuestion(
    `A ${formatNumber(length)} cm shell is enlarged to ${formatNumber(length * factor)} cm. What is the scale factor?`,
    { kind: "scale", length, factor },
    factor,
    [length * factor - length, factor + 1, factor - 1, length, factor * 2],
  );

const buildUnequalShare = (
  firstParts: number,
  secondParts: number,
  partSize: number,
  isBiggerAsked: boolean,
): FairShareQuestion => {
  const total = (firstParts + secondParts) * partSize;
  const firstShare = firstParts * partSize;
  const secondShare = secondParts * partSize;
  return buildNumberQuestion(
    `Share ${formatNumber(total)} pearls between the red crab and the blue crab in the ratio ${formatNumber(firstParts)} : ${formatNumber(secondParts)}. How many does the ${isBiggerAsked ? "blue" : "red"} crab get?`,
    { kind: "parts", total, firstParts, secondParts },
    isBiggerAsked ? secondShare : firstShare,
    [
      isBiggerAsked ? firstShare : secondShare,
      partSize,
      total / 2,
      total,
      (isBiggerAsked ? secondShare : firstShare) + partSize,
      (isBiggerAsked ? secondShare : firstShare) - partSize,
      firstParts + secondParts,
      total - partSize,
      (isBiggerAsked ? secondShare : firstShare) * 2,
    ],
  );
};

const listPairs = (
  firsts: readonly number[],
  seconds: readonly number[],
): [number, number][] =>
  firsts.flatMap((first) =>
    seconds.map((second): [number, number] => [first, second]),
  );

const buildYearOneQuestions = (
  difficulty: PictureQuestionDifficulty,
): FairShareQuestion[] => {
  switch (difficulty) {
    case 1:
      return [
        ...listWholeNumbers(1, 10).map(buildDouble),
        ...listWholeNumbers(3, 5).map((groupCount) =>
          buildGroups(groupCount, 2),
        ),
      ];
    case 2:
      return [
        ...listPairs([2, 3, 4], [2, 3, 4, 5])
          .filter(([rows, columns]) => rows * columns <= 20)
          .map(([rows, columns]) => buildArray(rows, columns)),
        ...listWholeNumbers(2, 10).map((half) => buildSharing(half * 2, 2)),
      ];
    case 3:
      return [
        ...listPairs([3, 4, 5], [2, 3, 4, 5])
          .filter(([groupCount, each]) => groupCount * each <= 20)
          .map(([groupCount, each]) =>
            buildSharing(groupCount * each, groupCount),
          ),
        ...listWholeNumbers(2, 4).map((groupCount) =>
          buildGroups(groupCount, 5),
        ),
        buildGroups(2, 10),
      ];
  }
};

const yearTwoTables = [2, 5, 10] as const;

const largestShownDivision: Record<(typeof yearTwoTables)[number], number> = {
  2: 24,
  5: 50,
  10: 60,
};

const buildYearTwoQuestions = (
  difficulty: PictureQuestionDifficulty,
): FairShareQuestion[] => {
  switch (difficulty) {
    case 1:
      return yearTwoTables.flatMap((table) =>
        listWholeNumbers(2, 6).map((groupCount) =>
          buildTimes(groupCount, table),
        ),
      );
    case 2:
      return yearTwoTables.flatMap((table) =>
        listWholeNumbers(2, 12)
          .filter((quotient) => quotient * table <= largestShownDivision[table])
          .map((quotient) => buildDivision(quotient * table, table)),
      );
    case 3:
      return [
        ...listPairs([3, 4, 6, 7], [2, 5]).map(([factor, table]) =>
          buildMissingFactor(factor, table),
        ),
        ...listPairs([3, 6, 8], [2, 5]).map(([first, table]) =>
          buildSwapped(first, table),
        ),
        ...[6, 8, 12, 14, 16, 7, 9, 11, 13, 17].map(buildOddOrEven),
      ];
  }
};

const ratioPairs: [number, number][] = [
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 5],
  [3, 4],
];

const buildYearSixQuestions = (
  difficulty: PictureQuestionDifficulty,
): FairShareQuestion[] => {
  switch (difficulty) {
    case 1:
      return ratioPairs.flatMap(([first, second]) =>
        listWholeNumbers(2, 4).map((groupCount) =>
          buildRatio(first, second, groupCount),
        ),
      );
    case 2:
      return [
        ...listPairs([2, 3, 4, 5, 6], [2, 3, 4, 5]).map(([length, factor]) =>
          buildScaleUp(length, factor),
        ),
        ...listPairs([3, 4, 6, 7], [5, 10]).map(([length, metres]) =>
          buildMapScale(length, metres),
        ),
        ...listPairs([3, 4, 5], [3, 4, 6]).map(([length, factor]) =>
          buildScaleFactor(length, factor),
        ),
      ];
    case 3:
      return ratioPairs.flatMap(([firstParts, secondParts]) =>
        listPairs([2, 3, 4], [0, 1]).map(([partSize, asked]) =>
          buildUnequalShare(firstParts, secondParts, partSize, asked === 1),
        ),
      );
  }
};

const yearBuilders: Record<
  FairShareYear,
  (difficulty: PictureQuestionDifficulty) => FairShareQuestion[]
> = {
  1: buildYearOneQuestions,
  2: buildYearTwoQuestions,
  6: buildYearSixQuestions,
};

export const buildFairShareQuestions = (
  year: FairShareYear,
  difficulty: PictureQuestionDifficulty,
): FairShareQuestion[] => yearBuilders[year](difficulty);
