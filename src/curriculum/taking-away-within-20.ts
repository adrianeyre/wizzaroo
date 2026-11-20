import { listWholeNumbers } from "./counting-to-20.js";

export const takingAwayDifficulties = [1, 2, 3] as const;
export type TakingAwayDifficulty = (typeof takingAwayDifficulties)[number];

export interface TakingAwayQuestion {
  start: number;
  takenAway: number;
  answer: number;
}

const firstTen = 10;
const largestStart = 20;
const mostTakenAway = 5;

const buildQuestion = (
  start: number,
  takenAway: number,
): TakingAwayQuestion => ({
  start,
  takenAway,
  answer: start - takenAway,
});

const listTakeAways = (
  smallestStart: number,
  largestStartShown: number,
  isWanted: (start: number, takenAway: number) => boolean,
) =>
  listWholeNumbers(smallestStart, largestStartShown).flatMap((start) =>
    listWholeNumbers(1, Math.min(start - 1, 9))
      .filter((takenAway) => isWanted(start, takenAway))
      .map((takenAway) => buildQuestion(start, takenAway)),
  );

export const buildTakingAwayQuestions = (
  difficulty: TakingAwayDifficulty,
): TakingAwayQuestion[] => {
  switch (difficulty) {
    case 1:
      return listTakeAways(
        2,
        firstTen,
        (_start, takenAway) => takenAway <= mostTakenAway,
      );
    case 2:
      return listTakeAways(
        firstTen + 1,
        largestStart,
        (start, takenAway) =>
          takenAway <= mostTakenAway && start - takenAway >= firstTen,
      );
    case 3:
      return listTakeAways(
        firstTen + 1,
        firstTen + 8,
        (start, takenAway) => start - takenAway < firstTen,
      );
  }
};

export const listTakingAwaySlips = ({
  start,
  takenAway,
  answer,
}: TakingAwayQuestion): number[] =>
  [answer + 1, answer - 1, start, start + takenAway, answer + 2, answer - 2]
    .filter((slip) => slip >= 0 && slip !== answer)
    .filter((slip, position, slips) => slips.indexOf(slip) === position);
