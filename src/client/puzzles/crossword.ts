import type { YearGroup } from "../../curriculum/skills.js";
import type { SpellingWord } from "../../curriculum/spelling-words.js";
import { shuffle, type GridCell } from "./shuffle.js";

export const crosswordWordCounts: Record<YearGroup, number> = {
  1: 4,
  2: 5,
  3: 6,
  4: 6,
  5: 7,
  6: 7,
};

export type CrosswordDirection = "across" | "down";

export interface CrosswordEntry {
  number: number;
  direction: CrosswordDirection;
  row: number;
  column: number;
  answer: string;
  clue: string;
}

export interface Crossword {
  rows: number;
  columns: number;
  entries: CrosswordEntry[];
}

interface Placement {
  word: SpellingWord;
  answer: string;
  direction: CrosswordDirection;
  row: number;
  column: number;
}

interface LetterCell {
  letter: string;
  directions: Set<CrosswordDirection>;
}

const attemptCount = 40;
const longestCrosswordWord = 10;

const toKey = (row: number, column: number) =>
  `${String(row)},${String(column)}`;

const stepOf = (direction: CrosswordDirection) =>
  direction === "across"
    ? { rowStep: 0, columnStep: 1 }
    : { rowStep: 1, columnStep: 0 };

export const listEntryCells = ({
  row,
  column,
  direction,
  answer,
}: Pick<
  CrosswordEntry,
  "row" | "column" | "direction" | "answer"
>): GridCell[] => {
  const { rowStep, columnStep } = stepOf(direction);
  return Array.from({ length: answer.length }, (_, position) => ({
    row: row + rowStep * position,
    column: column + columnStep * position,
  }));
};

const countCrossings = (
  placement: Omit<Placement, "word">,
  grid: ReadonlyMap<string, LetterCell>,
): number | undefined => {
  const { rowStep, columnStep } = stepOf(placement.direction);
  const sideRowStep = columnStep;
  const sideColumnStep = rowStep;
  const before = grid.get(
    toKey(placement.row - rowStep, placement.column - columnStep),
  );
  const after = grid.get(
    toKey(
      placement.row + rowStep * placement.answer.length,
      placement.column + columnStep * placement.answer.length,
    ),
  );
  if (before !== undefined || after !== undefined) {
    return undefined;
  }
  let crossings = 0;
  for (const [position, { row, column }] of listEntryCells(
    placement,
  ).entries()) {
    const existing = grid.get(toKey(row, column));
    if (existing !== undefined) {
      if (
        existing.letter !== placement.answer[position] ||
        existing.directions.has(placement.direction)
      ) {
        return undefined;
      }
      crossings++;
      continue;
    }
    const isSideTaken =
      grid.has(toKey(row + sideRowStep, column + sideColumnStep)) ||
      grid.has(toKey(row - sideRowStep, column - sideColumnStep));
    if (isSideTaken) {
      return undefined;
    }
  }
  return crossings;
};

const findBestPlacement = (
  word: SpellingWord,
  placements: readonly Placement[],
  grid: ReadonlyMap<string, LetterCell>,
  random: () => number,
): Placement | undefined => {
  const answer = word.word.toUpperCase();
  const options: { placement: Placement; crossings: number }[] = [];
  for (const placed of placements) {
    const direction: CrosswordDirection =
      placed.direction === "across" ? "down" : "across";
    for (const [placedPosition, placedCell] of listEntryCells(
      placed,
    ).entries()) {
      for (const [position, letter] of Array.from(answer).entries()) {
        if (letter !== placed.answer[placedPosition]) {
          continue;
        }
        const { rowStep, columnStep } = stepOf(direction);
        const placement = {
          word,
          answer,
          direction,
          row: placedCell.row - rowStep * position,
          column: placedCell.column - columnStep * position,
        };
        const crossings = countCrossings(placement, grid);
        if (crossings !== undefined && crossings > 0) {
          options.push({ placement, crossings });
        }
      }
    }
  }
  const mostCrossings = Math.max(
    0,
    ...options.map(({ crossings }) => crossings),
  );
  return shuffle(
    options.filter(({ crossings }) => crossings === mostCrossings),
    random,
  )[0]?.placement;
};

const addToGrid = (placement: Placement, grid: Map<string, LetterCell>) => {
  for (const [position, { row, column }] of listEntryCells(
    placement,
  ).entries()) {
    const key = toKey(row, column);
    const existing = grid.get(key);
    if (existing === undefined) {
      grid.set(key, {
        letter: placement.answer[position],
        directions: new Set([placement.direction]),
      });
    } else {
      existing.directions.add(placement.direction);
    }
  }
};

const tryBuildingPlacements = (
  words: readonly SpellingWord[],
  wordCount: number,
  random: () => number,
): Placement[] => {
  const [first, ...rest] = shuffle(words, random);
  const placements: Placement[] = [
    {
      word: first,
      answer: first.word.toUpperCase(),
      direction: "across",
      row: 0,
      column: 0,
    },
  ];
  const grid = new Map<string, LetterCell>();
  addToGrid(placements[0], grid);
  for (const word of rest) {
    if (placements.length >= wordCount) {
      break;
    }
    const placement = findBestPlacement(word, placements, grid, random);
    if (placement !== undefined) {
      placements.push(placement);
      addToGrid(placement, grid);
    }
  }
  return placements;
};

const measureArea = (placements: readonly Placement[]): number => {
  const cells = placements.flatMap(listEntryCells);
  const rows = cells.map(({ row }) => row);
  const columns = cells.map(({ column }) => column);
  return (
    (Math.max(...rows) - Math.min(...rows) + 1) *
    (Math.max(...columns) - Math.min(...columns) + 1)
  );
};

const numberEntries = (placements: readonly Placement[]): Crossword => {
  const cells = placements.flatMap(listEntryCells);
  const top = Math.min(...cells.map(({ row }) => row));
  const left = Math.min(...cells.map(({ column }) => column));
  const moved = placements.map((placement) => ({
    ...placement,
    row: placement.row - top,
    column: placement.column - left,
  }));
  const startKeys = [
    ...new Set(
      moved
        .toSorted(
          (first, second) =>
            first.row - second.row || first.column - second.column,
        )
        .map(({ row, column }) => toKey(row, column)),
    ),
  ];
  const entries = moved
    .map(({ word, answer, direction, row, column }) => ({
      number: startKeys.indexOf(toKey(row, column)) + 1,
      direction,
      row,
      column,
      answer,
      clue: word.clue,
    }))
    .toSorted(
      (first, second) =>
        first.number - second.number ||
        first.direction.localeCompare(second.direction),
    );
  const movedCells = moved.flatMap(listEntryCells);
  return {
    rows: Math.max(...movedCells.map(({ row }) => row)) + 1,
    columns: Math.max(...movedCells.map(({ column }) => column)) + 1,
    entries,
  };
};

export const buildCrossword = (
  candidateWords: readonly SpellingWord[],
  wordCount: number,
  random: () => number,
): Crossword => {
  const usableWords = candidateWords.filter(
    ({ word }) => word.length >= 3 && word.length <= longestCrosswordWord,
  );
  let best: Placement[] = [];
  for (let attempt = 0; attempt < attemptCount; attempt++) {
    const placements = tryBuildingPlacements(usableWords, wordCount, random);
    const isBetter =
      placements.length > best.length ||
      (placements.length === best.length &&
        measureArea(placements) < measureArea(best));
    if (isBetter) {
      best = placements;
    }
  }
  return numberEntries(best);
};
