import {
  checkFormats,
  type CheckAttempt,
  type CheckOutcome,
  type CheckPaper,
  type CheckQuestion,
} from "./checks.js";

export const timesTablesCheckSkillId = "maths.times-tables-to-12";

export const smallestCheckedTable = 2;
export const largestCheckedTable = 12;
export const heavierTables: readonly number[] = [6, 7, 8, 9, 12];

const heavierTableWeight = 3;
const lighterTableWeight = 1;
const warmUpTable = 1;
export const slowAnswerMilliseconds = 4000;
const recentAttemptsInGrid = 5;

export interface FactPair {
  first: number;
  second: number;
}

export const buildFactKey = ({ first, second }: FactPair): string =>
  `${String(first)}x${String(second)}`;

export const parseFactKey = (key: string): FactPair | undefined => {
  const match = /^(\d+)x(\d+)$/.exec(key);
  if (match === null) {
    return undefined;
  }
  const [, first, second] = match;
  return { first: Number(first), second: Number(second) };
};

const listTables = (): number[] =>
  Array.from(
    { length: largestCheckedTable - smallestCheckedTable + 1 },
    (_, index) => smallestCheckedTable + index,
  );

export const listCheckablePairs = (): FactPair[] =>
  listTables().flatMap((first) =>
    listTables()
      .filter((second) => second >= first)
      .map((second) => ({ first, second })),
  );

const findPairWeight = ({ first, second }: FactPair): number =>
  heavierTables.includes(first) || heavierTables.includes(second)
    ? heavierTableWeight
    : lighterTableWeight;

const pickWeightedPair = (
  pairs: readonly FactPair[],
  random: () => number,
): number => {
  const totalWeight = pairs.reduce(
    (total, pair) => total + findPairWeight(pair),
    0,
  );
  let target = random() * totalWeight;
  const pickedIndex = pairs.findIndex((pair) => {
    target -= findPairWeight(pair);
    return target < 0;
  });
  return pickedIndex === -1 ? pairs.length - 1 : pickedIndex;
};

const buildTimesTablesQuestion = (
  { first, second }: FactPair,
  questionType: string,
): CheckQuestion => ({
  key: buildFactKey({ first, second }),
  skillId: timesTablesCheckSkillId,
  questionType,
  prompt: `${String(first)} × ${String(second)} =`,
  passage: undefined,
  spokenWord: undefined,
  answerShape: "number",
  choices: [],
  acceptedAnswers: [String(first * second)],
});

const orderFactors = (pair: FactPair, random: () => number): FactPair =>
  random() < 0.5 ? pair : { first: pair.second, second: pair.first };

export const buildTimesTablesWarmUp = (random: () => number): CheckQuestion[] =>
  Array.from(
    { length: checkFormats["times-tables-check"].warmUpCount },
    (_, index) =>
      buildTimesTablesQuestion(
        orderFactors(
          {
            first: warmUpTable,
            second: smallestCheckedTable + index * 3 + Math.floor(random() * 3),
          },
          random,
        ),
        "warm-up",
      ),
  );

export const buildTimesTablesCheckPaper = (
  random: () => number,
): CheckPaper => {
  const remaining = listCheckablePairs();
  const picked: FactPair[] = [];
  while (
    picked.length < checkFormats["times-tables-check"].questionCount &&
    remaining.length > 0
  ) {
    const [pair] = remaining.splice(pickWeightedPair(remaining, random), 1);
    picked.push(orderFactors(pair, random));
  }
  return {
    passageTitle: undefined,
    passage: undefined,
    questions: picked.map((pair) =>
      buildTimesTablesQuestion(
        pair,
        `${String(Math.max(pair.first, pair.second))}-times-table`,
      ),
    ),
  };
};

export const timesTablesFactStatuses = [
  "not-asked",
  "right",
  "slow",
  "not-in-time",
  "missed",
] as const;

export type TimesTablesFactStatus = (typeof timesTablesFactStatuses)[number];

export interface TimesTablesFact extends FactPair {
  status: TimesTablesFactStatus;
}

const findOutcomeStatus = (outcome: CheckOutcome): TimesTablesFactStatus => {
  if (!outcome.isInTime) {
    return "not-in-time";
  }
  if (!outcome.isRight) {
    return "missed";
  }
  return outcome.millisecondsTaken > slowAnswerMilliseconds ? "slow" : "right";
};

const statusConcern: Record<TimesTablesFactStatus, number> = {
  "not-asked": 0,
  right: 1,
  slow: 2,
  "not-in-time": 3,
  missed: 4,
};

const findPairKey = ({ first, second }: FactPair): string =>
  buildFactKey({
    first: Math.min(first, second),
    second: Math.max(first, second),
  });

export const buildTimesTablesGrid = (
  checkHistory: readonly CheckAttempt[],
): TimesTablesFact[][] => {
  const statuses = new Map<string, TimesTablesFactStatus>();
  const recentAttempts = checkHistory
    .filter(({ checkGameType }) => checkGameType === "times-tables-check")
    .slice(0, recentAttemptsInGrid);
  for (const outcome of recentAttempts.flatMap(({ outcomes }) => outcomes)) {
    const pair = parseFactKey(outcome.key);
    if (pair === undefined) {
      continue;
    }
    const pairKey = findPairKey(pair);
    const status = findOutcomeStatus(outcome);
    const known = statuses.get(pairKey) ?? "not-asked";
    if (statusConcern[status] > statusConcern[known]) {
      statuses.set(pairKey, status);
    }
  }
  return listTables().map((first) =>
    listTables().map((second) => ({
      first,
      second,
      status: statuses.get(findPairKey({ first, second })) ?? "not-asked",
    })),
  );
};
