import type { YearGroup } from "../../curriculum/skills.js";
import { shuffle } from "./shuffle.js";

export interface MineFieldPlan {
  rows: number;
  columns: number;
  mineCount: number;
}

export const mineFieldPlans: Record<YearGroup, MineFieldPlan> = {
  1: { rows: 6, columns: 6, mineCount: 5 },
  2: { rows: 7, columns: 7, mineCount: 7 },
  3: { rows: 8, columns: 8, mineCount: 9 },
  4: { rows: 8, columns: 8, mineCount: 11 },
  5: { rows: 9, columns: 9, mineCount: 13 },
  6: { rows: 10, columns: 10, mineCount: 16 },
};

export interface MineField {
  rows: number;
  columns: number;
  mines: boolean[];
  clues: number[];
}

export const listNeighbours = (
  index: number,
  { rows, columns }: Pick<MineFieldPlan, "rows" | "columns">,
): number[] => {
  const row = Math.floor(index / columns);
  const column = index % columns;
  const neighbours: number[] = [];
  for (let rowStep = -1; rowStep <= 1; rowStep++) {
    for (let columnStep = -1; columnStep <= 1; columnStep++) {
      const neighbourRow = row + rowStep;
      const neighbourColumn = column + columnStep;
      const isOwnCell = rowStep === 0 && columnStep === 0;
      if (
        !isOwnCell &&
        neighbourRow >= 0 &&
        neighbourRow < rows &&
        neighbourColumn >= 0 &&
        neighbourColumn < columns
      ) {
        neighbours.push(neighbourRow * columns + neighbourColumn);
      }
    }
  }
  return neighbours;
};

export const buildMineField = (
  plan: MineFieldPlan,
  firstDugIndex: number,
  random: () => number,
): MineField => {
  const cellCount = plan.rows * plan.columns;
  const keptClear = new Set([
    firstDugIndex,
    ...listNeighbours(firstDugIndex, plan),
  ]);
  const mineCells = new Set(
    shuffle(
      Array.from({ length: cellCount }, (_, index) => index).filter(
        (index) => !keptClear.has(index),
      ),
      random,
    ).slice(0, plan.mineCount),
  );
  const mines = Array.from({ length: cellCount }, (_, index) =>
    mineCells.has(index),
  );
  return {
    rows: plan.rows,
    columns: plan.columns,
    mines,
    clues: mines.map(
      (_, index) =>
        listNeighbours(index, plan).filter((neighbour) => mines[neighbour])
          .length,
    ),
  };
};

export const digFrom = (
  field: MineField,
  opened: ReadonlySet<number>,
  flagged: ReadonlySet<number>,
  index: number,
): Set<number> => {
  const nowOpen = new Set(opened);
  const waiting = [index];
  while (waiting.length > 0) {
    const next = waiting.pop();
    if (next === undefined || nowOpen.has(next) || flagged.has(next)) {
      continue;
    }
    nowOpen.add(next);
    if (!field.mines[next] && field.clues[next] === 0) {
      waiting.push(...listNeighbours(next, field));
    }
  }
  return nowOpen;
};

export const isMineFieldCleared = (
  field: MineField,
  opened: ReadonlySet<number>,
): boolean => field.mines.every((isMine, index) => isMine || opened.has(index));
