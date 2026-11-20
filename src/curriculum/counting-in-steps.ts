import { roundToThousandths } from "./number-format.js";
import { listWholeNumbers } from "./counting-to-20.js";

export const countingInStepsDifficulties = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
] as const;
export type CountingInStepsDifficulty =
  (typeof countingInStepsDifficulties)[number];

export type CountingStep = number;

export interface CountingInStepsQuestion {
  step: CountingStep;
  shown: [number, number, number];
  answer: number;
}

interface StepPlan {
  step: CountingStep;
  furthestStart: number;
  isBackwards: boolean;
  isFromAnyNumber: boolean;
  firstStart?: number;
}

const stepPlans: Record<CountingInStepsDifficulty, StepPlan> = {
  1: { step: 10, furthestStart: 7, isBackwards: false, isFromAnyNumber: false },
  2: { step: 5, furthestStart: 7, isBackwards: false, isFromAnyNumber: false },
  3: { step: 2, furthestStart: 9, isBackwards: false, isFromAnyNumber: false },
  4: { step: 3, furthestStart: 7, isBackwards: false, isFromAnyNumber: false },
  5: { step: 10, furthestStart: 6, isBackwards: false, isFromAnyNumber: true },
  6: { step: 5, furthestStart: 9, isBackwards: true, isFromAnyNumber: false },
  7: { step: 4, furthestStart: 9, isBackwards: false, isFromAnyNumber: false },
  8: { step: 8, furthestStart: 9, isBackwards: false, isFromAnyNumber: false },
  9: { step: 50, furthestStart: 9, isBackwards: false, isFromAnyNumber: false },
  10: { step: 6, furthestStart: 9, isBackwards: false, isFromAnyNumber: false },
  11: { step: 7, furthestStart: 9, isBackwards: false, isFromAnyNumber: false },
  12: {
    step: 25,
    furthestStart: 3,
    isBackwards: true,
    isFromAnyNumber: false,
    firstStart: -3,
  },
  13: {
    step: 1000,
    furthestStart: 7,
    isBackwards: false,
    isFromAnyNumber: true,
  },
  14: {
    step: 10_000,
    furthestStart: 7,
    isBackwards: true,
    isFromAnyNumber: true,
  },
  15: {
    step: 0.1,
    furthestStart: 9,
    isBackwards: false,
    isFromAnyNumber: false,
  },
  16: { step: 4, furthestStart: 6, isBackwards: false, isFromAnyNumber: true },
  17: {
    step: 0.25,
    furthestStart: 9,
    isBackwards: false,
    isFromAnyNumber: false,
  },
  18: {
    step: 6,
    furthestStart: 2,
    isBackwards: true,
    isFromAnyNumber: true,
    firstStart: -3,
  },
};

const offsetsFromAnyNumber = [3, 7, 4, 1, 8, 6, 2, 9, 5];

const findOffset = (step: number, startStep: number) =>
  offsetsFromAnyNumber[Math.abs(startStep) % offsetsFromAnyNumber.length] *
  (step >= 1000 ? step / 10 + 3 : 1);

const buildSequence = (
  { step, isBackwards, isFromAnyNumber }: StepPlan,
  startStep: number,
): CountingInStepsQuestion => {
  const offset = isFromAnyNumber ? findOffset(step, startStep) : 0;
  const values = [0, 1, 2, 3].map((position) =>
    roundToThousandths(offset + (startStep + position) * step),
  );
  const [first, second, third, next] = isBackwards
    ? values.toReversed()
    : values;
  return {
    step: roundToThousandths(isBackwards ? -step : step),
    shown: [first, second, third],
    answer: next,
  };
};

export const buildCountingInStepsQuestions = (
  difficulty: CountingInStepsDifficulty,
): CountingInStepsQuestion[] => {
  const plan = stepPlans[difficulty];
  return listWholeNumbers(plan.firstStart ?? 0, plan.furthestStart).map(
    (startStep) => buildSequence(plan, startStep),
  );
};

const findSlipUnit = (step: number) => {
  const size = Math.abs(step);
  if (size >= 1000) {
    return size / 10;
  }
  return size >= 1 ? 1 : size / 10;
};

export const listCountingInStepsSlips = ({
  step,
  shown,
  answer,
}: CountingInStepsQuestion): number[] =>
  [
    answer + findSlipUnit(step),
    shown[2] + Math.sign(answer - shown[2]) * findSlipUnit(step),
    answer + (answer - shown[2]),
    shown[2],
    answer - findSlipUnit(step),
    answer + step,
  ]
    .map(roundToThousandths)
    .filter((slip) => slip !== answer)
    .filter((slip, position, slips) => slips.indexOf(slip) === position);
