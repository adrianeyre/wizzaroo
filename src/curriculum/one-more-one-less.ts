import { largestCount, listWholeNumbers } from "./counting-to-20.js";

export const oneMoreOneLessDifficulties = [1, 2, 3] as const;
export type OneMoreOneLessDifficulty =
  (typeof oneMoreOneLessDifficulties)[number];

export type NumberStep = "one-more" | "one-less" | "ten-more" | "ten-less";

export interface OneMoreOneLessQuestion {
  start: number;
  step: NumberStep;
  answer: number;
}

const firstTen = 10;
const largestTenStepStart = 89;

export const findStepChange = (step: NumberStep): number => {
  switch (step) {
    case "one-more":
      return 1;
    case "one-less":
      return -1;
    case "ten-more":
      return 10;
    case "ten-less":
      return -10;
  }
};

export const isTenStep = (step: NumberStep): boolean =>
  step === "ten-more" || step === "ten-less";

const buildQuestion = (
  start: number,
  step: NumberStep,
): OneMoreOneLessQuestion => ({
  start,
  step,
  answer: start + findStepChange(step),
});

const buildOneMore = (largestAnswer: number) =>
  listWholeNumbers(1, largestAnswer - 1).map((start) =>
    buildQuestion(start, "one-more"),
  );

const buildOneLess = (largestStart: number) =>
  listWholeNumbers(2, largestStart).map((start) =>
    buildQuestion(start, "one-less"),
  );

export const buildOneMoreOneLessQuestions = (
  difficulty: OneMoreOneLessDifficulty,
): OneMoreOneLessQuestion[] => {
  switch (difficulty) {
    case 1:
      return buildOneMore(firstTen);
    case 2:
      return [...buildOneMore(firstTen), ...buildOneLess(firstTen)];
    case 3:
      return [...buildOneMore(largestCount), ...buildOneLess(largestCount)];
  }
};

export const tenMoreTenLessDifficulties = [1, 2, 3] as const;
export type TenMoreTenLessDifficulty =
  (typeof tenMoreTenLessDifficulties)[number];

const buildTenSteps = (
  step: "ten-more" | "ten-less",
  isWholeTens: boolean,
): OneMoreOneLessQuestion[] =>
  listWholeNumbers(
    step === "ten-more" ? 1 : 11,
    largestTenStepStart + (step === "ten-more" ? 0 : 10),
  )
    .filter((start) => (start % 10 === 0) === isWholeTens)
    .map((start) => buildQuestion(start, step));

export const buildTenMoreTenLessQuestions = (
  difficulty: TenMoreTenLessDifficulty,
): OneMoreOneLessQuestion[] => {
  switch (difficulty) {
    case 1:
      return buildTenSteps("ten-more", true);
    case 2:
      return [
        ...buildTenSteps("ten-more", false),
        ...buildTenSteps("ten-less", true),
      ];
    case 3:
      return [
        ...buildTenSteps("ten-more", false),
        ...buildTenSteps("ten-less", false),
      ];
  }
};

export const listTenMoreTenLessSlips = ({
  start,
  answer,
}: OneMoreOneLessQuestion): number[] =>
  [
    start,
    answer + 1,
    answer - 1,
    start + (start - answer),
    answer + (answer > start ? 10 : -10),
  ]
    .filter((slip) => slip > 0 && slip !== answer && slip < 100)
    .filter((slip, position, slips) => slips.indexOf(slip) === position);

export const listOneMoreOneLessSlips = ({
  start,
  answer,
}: OneMoreOneLessQuestion): number[] =>
  [start, start + start - answer, answer + answer - start, start + 2, start - 2]
    .filter((slip) => slip >= 0 && slip !== answer)
    .filter((slip, position, slips) => slips.indexOf(slip) === position);
