import type { YearGroup } from "../../curriculum/skills.js";
import {
  isSameCell,
  pickWholeNumber,
  shuffle,
  type GridCell,
} from "./shuffle.js";

export interface WordDirection {
  rowStep: number;
  columnStep: number;
}

const across: WordDirection = { rowStep: 0, columnStep: 1 };
const down: WordDirection = { rowStep: 1, columnStep: 0 };
const diagonallyDown: WordDirection = { rowStep: 1, columnStep: 1 };
const diagonallyUp: WordDirection = { rowStep: -1, columnStep: 1 };
const backwards: WordDirection = { rowStep: 0, columnStep: -1 };
const up: WordDirection = { rowStep: -1, columnStep: 0 };
const diagonallyBackDown: WordDirection = { rowStep: 1, columnStep: -1 };
const diagonallyBackUp: WordDirection = { rowStep: -1, columnStep: -1 };

export interface WordSearchPlan {
  size: number;
  wordCount: number;
  directions: readonly WordDirection[];
}

export const wordSearchPlans: Record<YearGroup, WordSearchPlan> = {
  1: { size: 7, wordCount: 5, directions: [across, down] },
  2: { size: 8, wordCount: 6, directions: [across, down] },
  3: { size: 9, wordCount: 7, directions: [across, down, diagonallyDown] },
  4: {
    size: 10,
    wordCount: 8,
    directions: [across, down, diagonallyDown, diagonallyUp],
  },
  5: {
    size: 11,
    wordCount: 8,
    directions: [across, down, diagonallyDown, diagonallyUp, backwards, up],
  },
  6: {
    size: 12,
    wordCount: 9,
    directions: [
      across,
      down,
      diagonallyDown,
      diagonallyUp,
      backwards,
      up,
      diagonallyBackDown,
      diagonallyBackUp,
    ],
  },
};

export interface PlacedWord {
  word: string;
  cells: GridCell[];
}

export interface WordSearch {
  size: number;
  letters: string[][];
  words: PlacedWord[];
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const placementTries = 200;

const buildCells = (
  start: GridCell,
  { rowStep, columnStep }: WordDirection,
  length: number,
): GridCell[] =>
  Array.from({ length }, (_, step) => ({
    row: start.row + rowStep * step,
    column: start.column + columnStep * step,
  }));

const isInside = ({ row, column }: GridCell, size: number): boolean =>
  row >= 0 && row < size && column >= 0 && column < size;

const tryPlacingWord = (
  word: string,
  letters: (string | undefined)[][],
  { size, directions }: WordSearchPlan,
  random: () => number,
): GridCell[] | undefined => {
  for (let attempt = 0; attempt < placementTries; attempt++) {
    const direction =
      directions[pickWholeNumber(0, directions.length - 1, random)];
    const start = {
      row: pickWholeNumber(0, size - 1, random),
      column: pickWholeNumber(0, size - 1, random),
    };
    const cells = buildCells(start, direction, word.length);
    const fits = cells.every(
      (cell, position) =>
        isInside(cell, size) &&
        (letters[cell.row][cell.column] === undefined ||
          letters[cell.row][cell.column] === word[position]),
    );
    const isAllOverlap = cells.every(
      (cell) => letters[cell.row]?.[cell.column] !== undefined,
    );
    if (fits && !isAllOverlap) {
      return cells;
    }
  }
  return undefined;
};

const reverseWord = (word: string): string =>
  Array.from(word).toReversed().join("");

// A word hiding inside another, like OUR in YOUR or EIGHT in WEIGHT, could be
// found in the wrong place, so only one of them goes in a grid.
const isNested = (first: string, second: string): boolean =>
  [second, reverseWord(second)].some((other) => other.includes(first)) ||
  [first, reverseWord(first)].some((other) => other.includes(second));

export const buildWordSearch = (
  candidateWords: readonly string[],
  plan: WordSearchPlan,
  random: () => number,
): WordSearch => {
  const letters: (string | undefined)[][] = Array.from(
    { length: plan.size },
    () => Array.from({ length: plan.size }, () => undefined),
  );
  const words: PlacedWord[] = [];
  const fittingWords = shuffle(
    [...new Set(candidateWords.map((word) => word.toUpperCase()))].filter(
      (word) => word.length <= plan.size,
    ),
    random,
  );
  for (const word of fittingWords) {
    if (words.length >= plan.wordCount) {
      break;
    }
    if (words.some((placed) => isNested(word, placed.word))) {
      continue;
    }
    const cells = tryPlacingWord(word, letters, plan, random);
    if (cells !== undefined) {
      cells.forEach(({ row, column }, position) => {
        letters[row][column] = word[position];
      });
      words.push({ word, cells });
    }
  }
  return {
    size: plan.size,
    words,
    letters: letters.map((row) =>
      row.map(
        (letter) =>
          letter ?? alphabet[pickWholeNumber(0, alphabet.length - 1, random)],
      ),
    ),
  };
};

export const buildStraightLine = (
  start: GridCell,
  end: GridCell,
): GridCell[] | undefined => {
  const rowDistance = end.row - start.row;
  const columnDistance = end.column - start.column;
  const isStraight =
    rowDistance === 0 ||
    columnDistance === 0 ||
    Math.abs(rowDistance) === Math.abs(columnDistance);
  if (!isStraight) {
    return undefined;
  }
  const length = Math.max(Math.abs(rowDistance), Math.abs(columnDistance)) + 1;
  return buildCells(
    start,
    { rowStep: Math.sign(rowDistance), columnStep: Math.sign(columnDistance) },
    length,
  );
};

const isSameLine = (
  first: readonly GridCell[],
  second: readonly GridCell[],
): boolean =>
  first.length === second.length &&
  first.every((cell, position) => isSameCell(cell, second[position]));

export const findWordOnLine = (
  { words }: WordSearch,
  line: readonly GridCell[],
): PlacedWord | undefined =>
  words.find(
    ({ cells }) =>
      isSameLine(cells, line) || isSameLine(cells.toReversed(), line),
  );
