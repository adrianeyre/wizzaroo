import { listWholeNumbers } from "./counting-to-20.js";

export const tensAndOnesDifficulties = [1, 2, 3] as const;
export type TensAndOnesDifficulty = (typeof tensAndOnesDifficulties)[number];

export const largestTwoDigitNumber = 99;
const tensShownAtMost = 9;

export const splitTensAndOnes = (number: number) => ({
  tens: Math.floor(number / 10),
  ones: number % 10,
});

export const buildTensAndOnesQuestions = (
  difficulty: TensAndOnesDifficulty,
): number[] => {
  switch (difficulty) {
    case 1:
      return listWholeNumbers(2, tensShownAtMost).map((tens) => tens * 10);
    case 2:
      return listWholeNumbers(21, 59).filter((number) => number % 10 !== 0);
    case 3:
      return listWholeNumbers(61, largestTwoDigitNumber).filter(
        (number) => number % 10 !== 0,
      );
  }
};

export const listTensAndOnesSlips = (number: number): number[] => {
  const { tens, ones } = splitTensAndOnes(number);
  return [ones * 10 + tens, number + 1, number - 1, number + 10, number - 10]
    .filter(
      (slip) => slip > 0 && slip <= largestTwoDigitNumber && slip !== number,
    )
    .filter((slip, position, slips) => slips.indexOf(slip) === position);
};
