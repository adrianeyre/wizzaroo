import type { YearGroup } from "../../curriculum/skills.js";
import { pickWholeNumber, shuffle, type GridCell } from "./shuffle.js";

// Every number on a trail is held in whole hundredths, so 0.1 + 0.2 is
// exactly 30 and never 0.30000000000000004.
export const hundredthsPerOne = 100;

export interface NumberTrailPlan {
  rows: number;
  columns: number;
  length: number;
  blankCount: number;
  maxBlankRun: number;
}

export const numberTrailPlans: Record<YearGroup, NumberTrailPlan> = {
  1: { rows: 3, columns: 4, length: 12, blankCount: 6, maxBlankRun: 2 },
  2: { rows: 4, columns: 4, length: 12, blankCount: 7, maxBlankRun: 3 },
  3: { rows: 4, columns: 5, length: 15, blankCount: 8, maxBlankRun: 3 },
  4: { rows: 4, columns: 5, length: 18, blankCount: 9, maxBlankRun: 3 },
  5: { rows: 5, columns: 5, length: 20, blankCount: 10, maxBlankRun: 3 },
  6: { rows: 5, columns: 5, length: 22, blankCount: 11, maxBlankRun: 3 },
};

export interface NumberTrailSequence {
  start: number;
  step: number;
  isRule: boolean;
}

export interface NumberTrail {
  rows: number;
  columns: number;
  path: GridCell[];
  values: number[];
  blanks: number[];
  sequence: NumberTrailSequence;
}

export interface NumberKeys {
  hasMinus: boolean;
  hasPoint: boolean;
}

export const numberTrailKeys: Record<YearGroup, NumberKeys> = {
  1: { hasMinus: false, hasPoint: false },
  2: { hasMinus: false, hasPoint: false },
  3: { hasMinus: false, hasPoint: false },
  4: { hasMinus: true, hasPoint: false },
  5: { hasMinus: false, hasPoint: true },
  6: { hasMinus: true, hasPoint: true },
};

const pickOne = <Value>(values: readonly Value[], random: () => number) =>
  values[Math.floor(random() * values.length)];

const whole = (amount: number) => amount * hundredthsPerOne;

const countUp = (step: number, start: number): NumberTrailSequence => ({
  start: whole(start),
  step: whole(step),
  isRule: false,
});

const countDown = (step: number, start: number): NumberTrailSequence => ({
  start: whole(start),
  step: -whole(step),
  isRule: false,
});

// Years 1 and 2 count within 0 to 100, so a trail in tens is shorter: 0 to
// 100 in Year 1 (11 squares), and 1 to 91 up to 9 to 99 in Year 2 (10).
const tensTrailLengths: Partial<Record<YearGroup, number>> = { 1: 11, 2: 10 };

export const shortTrailLength = (yearGroup: YearGroup, step: number) =>
  Math.abs(step) === 10 * hundredthsPerOne
    ? (tensTrailLengths[yearGroup] ?? numberTrailPlans[yearGroup].length)
    : numberTrailPlans[yearGroup].length;

const pickSequenceForYear = (
  yearGroup: YearGroup,
  length: number,
  random: () => number,
): NumberTrailSequence => {
  const lastStep = length - 1;
  switch (yearGroup) {
    case 1: {
      const step = pickOne([2, 5, 10], random);
      const largestStart = step === 2 ? 4 : step === 5 ? 1 : 0;
      return countUp(step, step * pickWholeNumber(0, largestStart, random));
    }
    case 2: {
      if (random() < 0.5) {
        return countUp(3, 3 * pickWholeNumber(0, 2, random));
      }
      const ones = pickWholeNumber(1, 9, random);
      const tensSteps = shortTrailLength(yearGroup, whole(10)) - 1;
      return random() < 0.6
        ? countUp(10, ones)
        : countDown(10, ones + 10 * tensSteps);
    }
    case 3: {
      const step = pickOne([4, 8, 50], random);
      const lowest = step * pickWholeNumber(0, step === 50 ? 4 : 3, random);
      return random() < 0.7
        ? countUp(step, lowest)
        : countDown(step, lowest + step * lastStep);
    }
    case 4: {
      const step = pickOne([6, 7, 25], random);
      if (random() < 0.5) {
        return countUp(step, step * pickWholeNumber(0, 3, random));
      }
      return countDown(
        step,
        step * pickWholeNumber(4, Math.min(10, lastStep - 3), random),
      );
    }
    case 5: {
      if (random() < 0.35) {
        const tenths = 10;
        const lowest = pickWholeNumber(1, 39, random) * tenths;
        return random() < 0.6
          ? { start: lowest, step: tenths, isRule: false }
          : { start: lowest + tenths * lastStep, step: -tenths, isRule: false };
      }
      const step = pickOne([10, 100, 1000, 10_000], random);
      const lowest = pickWholeNumber(step, step * 40, random);
      return random() < 0.55
        ? countUp(step, lowest)
        : countDown(step, lowest + step * lastStep);
    }
    case 6: {
      const kind = pickOne(["decimal", "negative", "large"] as const, random);
      switch (kind) {
        case "decimal": {
          const step = pickOne([25, 50, 75, 125, 150, 250], random);
          const start = pickWholeNumber(1, 20, random) * 25;
          return { start, step, isRule: true };
        }
        case "negative": {
          const step = pickWholeNumber(3, 9, random);
          const start =
            step * pickWholeNumber(5, 12, random) +
            pickWholeNumber(1, step - 1, random);
          return { start: whole(start), step: -whole(step), isRule: true };
        }
        case "large": {
          const step = pickOne([11, 12, 15, 19, 21, 24, 25], random);
          const start = pickWholeNumber(-30, 40, random);
          return { start: whole(start), step: whole(step), isRule: true };
        }
      }
    }
  }
};

const neighbourSteps: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export const areNeighbours = (first: GridCell, second: GridCell): boolean =>
  Math.abs(first.row - second.row) + Math.abs(first.column - second.column) ===
  1;

// A random self-avoiding walk of exactly `length` squares, found by
// depth-first search that tries the most cornered square first, so it
// rarely needs to back up.
export const buildTrailPath = (
  {
    rows,
    columns,
    length,
  }: Pick<NumberTrailPlan, "rows" | "columns" | "length">,
  random: () => number,
): GridCell[] => {
  const isInside = ({ row, column }: GridCell) =>
    row >= 0 && row < rows && column >= 0 && column < columns;
  for (;;) {
    const visited = new Set<number>();
    const path: GridCell[] = [];
    let budget = 20_000;
    const keyOf = ({ row, column }: GridCell) => row * columns + column;
    const freeNeighbours = (cell: GridCell) =>
      neighbourSteps
        .map(([rowStep, columnStep]) => ({
          row: cell.row + rowStep,
          column: cell.column + columnStep,
        }))
        .filter((next) => isInside(next) && !visited.has(keyOf(next)));
    const walk = (cell: GridCell): boolean => {
      budget--;
      visited.add(keyOf(cell));
      path.push(cell);
      if (path.length === length) {
        return true;
      }
      const options = shuffle(freeNeighbours(cell), random)
        .map((next) => ({ next, onward: freeNeighbours(next).length }))
        .sort((first, second) => first.onward - second.onward);
      for (const { next } of options) {
        if (budget <= 0) {
          break;
        }
        if (walk(next)) {
          return true;
        }
      }
      visited.delete(keyOf(cell));
      path.pop();
      return false;
    };
    const start = {
      row: pickWholeNumber(0, rows - 1, random),
      column: pickWholeNumber(0, columns - 1, random),
    };
    if (walk(start)) {
      return path;
    }
  }
};

export const findLongestBlankRun = (
  blanks: readonly number[],
  length: number,
): number => {
  const blankSet = new Set(blanks);
  let longest = 0;
  let run = 0;
  for (let index = 0; index < length; index++) {
    run = blankSet.has(index) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
};

// The first two squares and the last (the ring) are always given, so the
// Child can see the step, and can count back from the ring too.
export const pickTrailBlanks = (
  { length, blankCount, maxBlankRun }: NumberTrailPlan,
  random: () => number,
): number[] => {
  const candidates = Array.from(
    { length: length - 3 },
    (_, offset) => offset + 2,
  );
  for (;;) {
    const blanks = shuffle(candidates, random)
      .slice(0, blankCount)
      .sort((first, second) => first - second);
    if (findLongestBlankRun(blanks, length) <= maxBlankRun) {
      return blanks;
    }
  }
};

export const buildNumberTrail = (
  yearGroup: YearGroup,
  random: () => number,
): NumberTrail => {
  const fullPlan = numberTrailPlans[yearGroup];
  const sequence = pickSequenceForYear(yearGroup, fullPlan.length, random);
  const length = shortTrailLength(yearGroup, sequence.step);
  const plan = {
    ...fullPlan,
    length,
    blankCount: fullPlan.blankCount - (fullPlan.length - length),
  };
  const path = buildTrailPath(plan, random);
  return {
    rows: plan.rows,
    columns: plan.columns,
    path,
    values: path.map((_, index) => sequence.start + sequence.step * index),
    blanks: pickTrailBlanks(plan, random),
    sequence,
  };
};

const groupThousands = (digits: string) =>
  digits.length < 4 ? digits : digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const formatTrailNumber = (hundredths: number): string => {
  const size = Math.abs(hundredths);
  const wholePart = groupThousands(String(Math.floor(size / hundredthsPerOne)));
  const fraction = size % hundredthsPerOne;
  const fractionText =
    fraction === 0
      ? ""
      : fraction % 10 === 0
        ? `.${String(fraction / 10)}`
        : `.${String(fraction).padStart(2, "0")}`;
  return `${hundredths < 0 ? "−" : ""}${wholePart}${fractionText}`;
};

// Reads what the Child typed as whole hundredths, or undefined when it isn't
// a number yet (such as a lone minus sign or point).
export const parseTrailNumber = (typed: string): number | undefined => {
  const match = /^(-?)(\d*)(?:\.(\d{0,2}))?$/.exec(
    typed.replaceAll(",", "").replaceAll("−", "-").trim(),
  );
  if (match === null) {
    return undefined;
  }
  const [, sign, wholeDigits, fractionDigits = ""] = match;
  if (wholeDigits === "" && fractionDigits === "") {
    return undefined;
  }
  const size =
    Number(wholeDigits || "0") * hundredthsPerOne +
    Number(fractionDigits.padEnd(2, "0"));
  return sign === "-" && size !== 0 ? -size : size;
};

const describeStepSize = (step: number) =>
  Math.abs(step) === 10 ? "tenths" : `${formatTrailNumber(Math.abs(step))}s`;

export const describeTrailDirection = ({
  step,
  isRule,
}: NumberTrailSequence): string => {
  const size = formatTrailNumber(Math.abs(step));
  if (isRule) {
    return step > 0
      ? `the rule is add ${size} each time`
      : `the rule is subtract ${size} each time`;
  }
  return step > 0
    ? `the trail counts on in ${describeStepSize(step)}`
    : `the trail counts back in ${describeStepSize(step)}`;
};

export const describeTrailRule = (
  { start, step, isRule }: NumberTrailSequence,
  length: number,
): string => {
  const size = formatTrailNumber(Math.abs(step));
  const end = start + step * (length - 1);
  const throughZero = start > 0 && end < 0 ? ", back through zero" : "";
  if (isRule) {
    return `The rule was ${step > 0 ? "add" : "subtract"} ${size} each time${throughZero}!`;
  }
  return `You counted ${step > 0 ? "on" : "back"} in ${describeStepSize(step)}${throughZero}!`;
};
