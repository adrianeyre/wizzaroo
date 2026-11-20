import type { YearGroup } from "../../curriculum/skills.js";
import { shuffle } from "./shuffle.js";

export interface SudokuPlan {
  size: number;
  boxRows: number;
  boxColumns: number;
  blankCount: number;
  factCount: number;
}

export const sudokuPlans: Record<YearGroup, SudokuPlan> = {
  1: { size: 4, boxRows: 2, boxColumns: 2, blankCount: 6, factCount: 3 },
  2: { size: 4, boxRows: 2, boxColumns: 2, blankCount: 9, factCount: 4 },
  3: { size: 6, boxRows: 2, boxColumns: 3, blankCount: 16, factCount: 5 },
  4: { size: 6, boxRows: 2, boxColumns: 3, blankCount: 20, factCount: 6 },
  5: { size: 9, boxRows: 3, boxColumns: 3, blankCount: 36, factCount: 8 },
  6: { size: 9, boxRows: 3, boxColumns: 3, blankCount: 44, factCount: 10 },
};

export interface SudokuCell {
  solution: number;
  isGiven: boolean;
  fact: string | undefined;
}

export interface Sudoku {
  size: number;
  boxRows: number;
  boxColumns: number;
  cells: SudokuCell[];
}

const shuffleInGroups = (
  groupSize: number,
  groupCount: number,
  random: () => number,
): number[] =>
  shuffle(
    Array.from({ length: groupCount }, (_, group) => group),
    random,
  ).flatMap((group) =>
    shuffle(
      Array.from(
        { length: groupSize },
        (_, offset) => group * groupSize + offset,
      ),
      random,
    ),
  );

export const buildSudokuSolution = (
  {
    size,
    boxRows,
    boxColumns,
  }: Pick<SudokuPlan, "size" | "boxRows" | "boxColumns">,
  random: () => number,
): number[] => {
  const digits = shuffle(
    Array.from({ length: size }, (_, offset) => offset + 1),
    random,
  );
  const rows = shuffleInGroups(boxRows, size / boxRows, random);
  const columns = shuffleInGroups(boxColumns, size / boxColumns, random);
  return rows.flatMap((row) =>
    columns.map(
      (column) =>
        digits[(row * boxColumns + Math.floor(row / boxRows) + column) % size],
    ),
  );
};

const listPeers = (
  index: number,
  {
    size,
    boxRows,
    boxColumns,
  }: Pick<Sudoku, "size" | "boxRows" | "boxColumns">,
): number[] => {
  const row = Math.floor(index / size);
  const column = index % size;
  const boxTop = row - (row % boxRows);
  const boxLeft = column - (column % boxColumns);
  const peers = new Set<number>();
  for (let offset = 0; offset < size; offset++) {
    peers.add(row * size + offset);
    peers.add(offset * size + column);
    peers.add(
      (boxTop + Math.floor(offset / boxColumns)) * size +
        boxLeft +
        (offset % boxColumns),
    );
  }
  peers.delete(index);
  return [...peers];
};

export const countSudokuSolutions = (
  values: readonly (number | undefined)[],
  shape: Pick<Sudoku, "size" | "boxRows" | "boxColumns">,
  stopAt = 2,
): number => {
  const grid = [...values];
  const peers = grid.map((_, index) => listPeers(index, shape));
  const search = (): number => {
    const blank = grid.indexOf(undefined);
    if (blank === -1) {
      return 1;
    }
    let found = 0;
    for (let digit = 1; digit <= shape.size; digit++) {
      if (peers[blank].every((peer) => grid[peer] !== digit)) {
        grid[blank] = digit;
        found += search();
        grid[blank] = undefined;
        if (found >= stopAt) {
          return found;
        }
      }
    }
    return found;
  };
  return search();
};

export const buildSudoku = (
  plan: SudokuPlan,
  buildFact: (answer: number) => string,
  random: () => number,
): Sudoku => {
  const solution = buildSudokuSolution(plan, random);
  const values: (number | undefined)[] = [...solution];
  const blanks: number[] = [];
  for (const index of shuffle(
    solution.map((_, cellIndex) => cellIndex),
    random,
  )) {
    if (blanks.length >= plan.blankCount) {
      break;
    }
    values[index] = undefined;
    if (countSudokuSolutions(values, plan) === 1) {
      blanks.push(index);
    } else {
      values[index] = solution[index];
    }
  }
  const factCells = new Set(shuffle(blanks, random).slice(0, plan.factCount));
  return {
    size: plan.size,
    boxRows: plan.boxRows,
    boxColumns: plan.boxColumns,
    cells: solution.map((answer, index) => ({
      solution: answer,
      isGiven: values[index] !== undefined,
      fact: factCells.has(index) ? buildFact(answer) : undefined,
    })),
  };
};
