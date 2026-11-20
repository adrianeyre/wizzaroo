import { listWholeNumbers } from "./counting-to-20.js";

export const additionDifficulties = [1, 2, 3] as const;
export type AdditionDifficulty = (typeof additionDifficulties)[number];

export interface AdditionQuestion {
  first: number;
  second: number;
  answer: number;
}

const firstTen = 10;
const largestSingleDigit = 9;

const buildQuestion = (first: number, second: number): AdditionQuestion => ({
  first,
  second,
  answer: first + second,
});

const listPairs = (
  isWanted: (first: number, second: number) => boolean,
  smallest = 1,
  largest = largestSingleDigit,
) =>
  listWholeNumbers(smallest, largest).flatMap((first) =>
    listWholeNumbers(smallest, largest)
      .filter((second) => isWanted(first, second))
      .map((second) => buildQuestion(first, second)),
  );

export const buildAdditionQuestions = (
  difficulty: AdditionDifficulty,
): AdditionQuestion[] => {
  switch (difficulty) {
    case 1:
      return listPairs((first, second) => first + second <= firstTen);
    case 2:
      return listPairs((first, second) => first + second > firstTen);
    case 3:
      return listPairs(
        (first, second) =>
          (first === firstTen || second === firstTen || first * second === 0) &&
          first + second > 0,
        0,
        firstTen,
      );
  }
};

export const listAdditionSlips = ({
  first,
  second,
  answer,
}: AdditionQuestion): number[] =>
  [answer - 1, answer + 1, Math.max(first, second), answer + 2, answer - 2]
    .filter((slip) => slip >= 0 && slip !== answer)
    .filter((slip, position, slips) => slips.indexOf(slip) === position);
