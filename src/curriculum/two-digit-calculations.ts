import type { AdditionQuestion } from "./adding-to-20.js";
import { listWholeNumbers } from "./counting-to-20.js";
import type { TakingAwayQuestion } from "./taking-away-within-20.js";

export const twoDigitDifficulties = [1, 2, 3] as const;
export type TwoDigitDifficulty = (typeof twoDigitDifficulties)[number];

const largestAnswer = 99;
const twoDigitNumbers = listWholeNumbers(11, 89).filter(
  (number) => number % 10 !== 0,
);
const ones = listWholeNumbers(1, 9);
const tens = listWholeNumbers(1, 5).map((ten) => ten * 10);

const onesOf = (number: number) => number % 10;

const isWantedAddition = (
  difficulty: TwoDigitDifficulty,
  first: number,
  second: number,
) => {
  switch (difficulty) {
    case 1:
      return second < 10 && onesOf(first) + second < 10;
    case 2:
      return second % 10 === 0;
    case 3:
      return second < 10 && onesOf(first) + second > 10;
  }
};

export const buildTwoDigitAdditionQuestions = (
  difficulty: TwoDigitDifficulty,
): AdditionQuestion[] =>
  twoDigitNumbers
    .filter((_first, index) => index % 3 === difficulty - 1)
    .flatMap((first) =>
      [...ones, ...tens]
        .filter(
          (second) =>
            isWantedAddition(difficulty, first, second) &&
            first + second <= largestAnswer,
        )
        .map((second) => ({ first, second, answer: first + second })),
    );

const isWantedTakingAway = (
  difficulty: TwoDigitDifficulty,
  start: number,
  takenAway: number,
) => {
  switch (difficulty) {
    case 1:
      return takenAway < 10 && takenAway < onesOf(start);
    case 2:
      return takenAway % 10 === 0 && takenAway < start;
    case 3:
      return takenAway < 10 && takenAway > onesOf(start);
  }
};

export const buildTwoDigitTakingAwayQuestions = (
  difficulty: TwoDigitDifficulty,
): TakingAwayQuestion[] =>
  twoDigitNumbers
    .filter((start) => start > 20)
    .filter((_start, index) => index % 3 === difficulty - 1)
    .flatMap((start) =>
      [...ones, ...tens]
        .filter((takenAway) => isWantedTakingAway(difficulty, start, takenAway))
        .map((takenAway) => ({ start, takenAway, answer: start - takenAway })),
    );

export const listTwoDigitSlips = (
  answer: number,
  changedBy: number,
): number[] =>
  [answer + 10, answer - 10, answer + 1, answer - 1, answer + changedBy * 2]
    .filter((slip) => slip > 0 && slip <= largestAnswer && slip !== answer)
    .filter((slip, position, slips) => slips.indexOf(slip) === position);
