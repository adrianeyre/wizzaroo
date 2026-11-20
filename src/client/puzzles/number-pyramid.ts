import type { YearGroup } from "../../curriculum/skills.js";
import { pickWholeNumber, shuffle } from "./shuffle.js";

/**
 * An addition pyramid: each brick is the sum of the two bricks it sits on.
 * Values are whole "units" so decimals never meet floating-point errors: in
 * Year 5 one unit is a hundredth, everywhere else it is one.
 */
export interface NumberPyramidPlan {
  rows: number;
  blanks: number;
  unitsPerWhole: 1 | 100;
  bottomSmallest: number;
  bottomLargest: number;
  topSmallest: number;
  topLargest: number;
  fewestSubtractions: number;
  mostSubtractions: number;
}

export const numberPyramidPlans: Record<YearGroup, NumberPyramidPlan> = {
  1: {
    rows: 4,
    blanks: 6,
    unitsPerWhole: 1,
    bottomSmallest: 1,
    bottomLargest: 4,
    topSmallest: 12,
    topLargest: 20,
    fewestSubtractions: 0,
    mostSubtractions: 1,
  },
  2: {
    rows: 4,
    blanks: 6,
    unitsPerWhole: 1,
    bottomSmallest: 3,
    bottomLargest: 18,
    topSmallest: 60,
    topLargest: 100,
    fewestSubtractions: 1,
    mostSubtractions: 3,
  },
  3: {
    rows: 4,
    blanks: 6,
    unitsPerWhole: 1,
    bottomSmallest: 25,
    bottomLargest: 130,
    topSmallest: 500,
    topLargest: 999,
    fewestSubtractions: 2,
    mostSubtractions: 3,
  },
  4: {
    rows: 5,
    blanks: 9,
    unitsPerWhole: 1,
    bottomSmallest: 120,
    bottomLargest: 640,
    topSmallest: 4000,
    topLargest: 9999,
    fewestSubtractions: 2,
    mostSubtractions: 5,
  },
  5: {
    rows: 5,
    blanks: 9,
    unitsPerWhole: 100,
    bottomSmallest: 11,
    bottomLargest: 299,
    topSmallest: 1500,
    topLargest: 4999,
    fewestSubtractions: 2,
    mostSubtractions: 5,
  },
  6: {
    rows: 5,
    blanks: 10,
    unitsPerWhole: 1,
    bottomSmallest: 10_500,
    bottomLargest: 62_000,
    topSmallest: 300_000,
    topLargest: 999_999,
    fewestSubtractions: 3,
    mostSubtractions: 6,
  },
};

export interface NumberPyramidBrick {
  /** 0 is the bottom row. */
  row: number;
  /** 0 is the left-hand brick of its row. */
  position: number;
  value: number;
  isGiven: boolean;
}

export interface NumberPyramid {
  rows: number;
  unitsPerWhole: 1 | 100;
  bricks: readonly NumberPyramidBrick[];
}

/** Values the Child can see, by brick index; undefined is a blank brick. */
export type KnownValues = readonly (number | undefined)[];

export type NumberPyramidWorking =
  | { kind: "add"; left: number; right: number }
  | { kind: "subtract"; whole: number; part: number };

export const findBrickIndex = (
  rows: number,
  row: number,
  position: number,
): number | undefined => {
  if (row < 0 || row >= rows || position < 0 || position >= rows - row) {
    return undefined;
  }
  let index = 0;
  for (let below = 0; below < row; below++) {
    index += rows - below;
  }
  return index + position;
};

const buildBricks = (
  rows: number,
  bottom: readonly number[],
): NumberPyramidBrick[] => {
  const bricks: NumberPyramidBrick[] = bottom.map((value, position) => ({
    row: 0,
    position,
    value,
    isGiven: false,
  }));
  for (let row = 1; row < rows; row++) {
    const rowStart = bricks.length - (rows - row + 1);
    for (let position = 0; position < rows - row; position++) {
      bricks.push({
        row,
        position,
        value:
          bricks[rowStart + position].value +
          bricks[rowStart + position + 1].value,
        isGiven: false,
      });
    }
  }
  return bricks;
};

/**
 * Finds how the Child could work out one blank brick from the bricks they
 * can see: by adding the two bricks below it, or by taking a known
 * neighbour away from a known brick above.
 */
export const findWorking = (
  rows: number,
  known: KnownValues,
  index: number,
): NumberPyramidWorking | undefined => {
  let row = 0;
  let position = index;
  while (position >= rows - row) {
    position -= rows - row;
    row++;
  }
  const valueAt = (atRow: number, atPosition: number) => {
    const at = findBrickIndex(rows, atRow, atPosition);
    return at === undefined ? undefined : known[at];
  };
  const left = valueAt(row - 1, position);
  const right = valueAt(row - 1, position + 1);
  if (left !== undefined && right !== undefined) {
    return { kind: "add", left, right };
  }
  for (const [aboveOffset, neighbourOffset] of [
    [-1, -1],
    [0, 1],
  ]) {
    const whole = valueAt(row + 1, position + aboveOffset);
    const part = valueAt(row, position + neighbourOffset);
    if (whole !== undefined && part !== undefined) {
      return { kind: "subtract", whole, part };
    }
  }
  return undefined;
};

export const workOut = (working: NumberPyramidWorking): number =>
  working.kind === "add"
    ? working.left + working.right
    : working.whole - working.part;

/**
 * Picks the blank brick a Child would find easiest next: one they can add
 * up, lowest row first, otherwise one they can work out by subtracting.
 */
export const findEasiestBlank = (
  rows: number,
  known: KnownValues,
): { index: number; working: NumberPyramidWorking } | undefined => {
  let subtraction:
    { index: number; working: NumberPyramidWorking } | undefined = undefined;
  for (const [index, value] of known.entries()) {
    if (value !== undefined) {
      continue;
    }
    const working = findWorking(rows, known, index);
    if (working?.kind === "add") {
      return { index, working };
    }
    if (working !== undefined && subtraction === undefined) {
      subtraction = { index, working };
    }
  }
  return subtraction;
};

/**
 * Solves the pyramid one brick at a time, the way a Child would, adding
 * wherever it can. Returns how many bricks needed a subtraction, or
 * undefined when the bricks shown are not enough to work out every blank.
 */
export const solveStepByStep = (
  rows: number,
  given: KnownValues,
): { values: number[]; subtractions: number } | undefined => {
  const known = [...given];
  let subtractions = 0;
  for (;;) {
    const next = findEasiestBlank(rows, known);
    if (next === undefined) {
      break;
    }
    known[next.index] = workOut(next.working);
    if (next.working.kind === "subtract") {
      subtractions++;
    }
  }
  const values = known.filter((value) => value !== undefined);
  return values.length === known.length ? { values, subtractions } : undefined;
};

const pickBottom = (plan: NumberPyramidPlan, random: () => number) =>
  Array.from({ length: plan.rows }, () => {
    for (;;) {
      const value = pickWholeNumber(
        plan.bottomSmallest,
        plan.bottomLargest,
        random,
      );
      if (plan.unitsPerWhole === 1 || value % plan.unitsPerWhole !== 0) {
        return value;
      }
    }
  });

const maximumAttempts = 4000;

export const buildNumberPyramid = (
  plan: NumberPyramidPlan,
  random: () => number,
): NumberPyramid => {
  const brickCount = (plan.rows * (plan.rows + 1)) / 2;
  for (let attempt = 0; attempt < maximumAttempts; attempt++) {
    const bricks = buildBricks(plan.rows, pickBottom(plan, random));
    const top = bricks[brickCount - 1].value;
    if (top < plan.topSmallest || top > plan.topLargest) {
      continue;
    }
    for (let layout = 0; layout < 40; layout++) {
      const givenIndexes = new Set(
        shuffle(
          bricks.map((_, index) => index),
          random,
        ).slice(0, brickCount - plan.blanks),
      );
      const solved = solveStepByStep(
        plan.rows,
        bricks.map(({ value }, index) =>
          givenIndexes.has(index) ? value : undefined,
        ),
      );
      if (
        solved !== undefined &&
        solved.subtractions >= plan.fewestSubtractions &&
        solved.subtractions <= plan.mostSubtractions
      ) {
        return {
          rows: plan.rows,
          unitsPerWhole: plan.unitsPerWhole,
          bricks: bricks.map((brick, index) => ({
            ...brick,
            isGiven: givenIndexes.has(index),
          })),
        };
      }
    }
  }
  throw new Error("Couldn't build a number pyramid for this plan");
};

const groupThousands = (whole: number) =>
  String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Shows a value the way the Child reads it, e.g. 2,345 or 3.75. */
export const formatPyramidNumber = (
  units: number,
  unitsPerWhole: 1 | 100,
): string => {
  if (unitsPerWhole === 1) {
    return groupThousands(units);
  }
  const whole = Math.floor(units / unitsPerWhole);
  const hundredths = units % unitsPerWhole;
  if (hundredths === 0) {
    return groupThousands(whole);
  }
  const decimals = String(hundredths).padStart(2, "0").replace(/0$/, "");
  return `${groupThousands(whole)}.${decimals}`;
};

/** Reads what the Child typed, allowing commas, e.g. "2,345" or "3.5". */
export const parsePyramidNumber = (
  text: string,
  unitsPerWhole: 1 | 100,
): number | undefined => {
  const plain = text.replaceAll(",", "").trim();
  if (unitsPerWhole === 1) {
    return /^\d+$/.test(plain) ? Number(plain) : undefined;
  }
  if (!/^\d*(\.\d{0,2})?$/.test(plain) || !/\d/.test(plain)) {
    return undefined;
  }
  const [wholeText, decimalText = ""] = plain.split(".");
  const whole = wholeText === "" ? 0 : Number(wholeText);
  const decimals = decimalText.padEnd(2, "0");
  return whole * unitsPerWhole + Number(decimals);
};

export const describeWorking = (
  working: NumberPyramidWorking,
  unitsPerWhole: 1 | 100,
): string =>
  working.kind === "add"
    ? `${formatPyramidNumber(working.left, unitsPerWhole)} + ${formatPyramidNumber(working.right, unitsPerWhole)} = ?`
    : `${formatPyramidNumber(working.whole, unitsPerWhole)} − ${formatPyramidNumber(working.part, unitsPerWhole)} = ?`;

/** The longest answer the Child might type, so the entry can be capped. */
export const findLongestEntry = ({
  bricks,
  unitsPerWhole,
}: NumberPyramid): number =>
  Math.max(
    ...bricks.map(
      ({ value }) =>
        formatPyramidNumber(value, unitsPerWhole).replaceAll(",", "").length,
    ),
  ) + (unitsPerWhole === 1 ? 0 : 1);
