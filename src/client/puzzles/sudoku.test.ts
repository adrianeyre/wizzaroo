import { describe, expect, it } from "vitest";
import { yearGroups } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildSudoku,
  buildSudokuSolution,
  countSudokuSolutions,
  sudokuPlans,
} from "./sudoku.js";

const listUnits = (size: number, boxRows: number, boxColumns: number) => {
  const rows = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => row * size + column),
  );
  const columns = rows.map((_, column) => rows.map((row) => row[column]));
  const boxes = Array.from({ length: size }, (_, box) => {
    const top = Math.floor(box / (size / boxColumns)) * boxRows;
    const left = (box % (size / boxColumns)) * boxColumns;
    return Array.from(
      { length: size },
      (_, offset) =>
        (top + Math.floor(offset / boxColumns)) * size +
        left +
        (offset % boxColumns),
    );
  });
  return [...rows, ...columns, ...boxes];
};

describe("buildSudokuSolution", () => {
  it.each([
    [4, 2, 2],
    [6, 2, 3],
    [9, 3, 3],
  ])(
    "fills a %i × %i grid with every number once in each row, column and box",
    (size, boxRows, boxColumns) => {
      for (let seed = 1; seed <= 10; seed++) {
        const solution = buildSudokuSolution(
          { size, boxRows, boxColumns },
          buildRandom(seed),
        );
        for (const unit of listUnits(size, boxRows, boxColumns)) {
          expect(new Set(unit.map((index) => solution[index])).size).toBe(size);
        }
      }
    },
  );
});

describe("buildSudoku", () => {
  it.each(yearGroups)(
    "leaves Year %i the planned blanks, with exactly one way to fill them, and sums on some of them",
    (yearGroup) => {
      const plan = sudokuPlans[yearGroup];
      const sudoku = buildSudoku(
        plan,
        (answer) => `fact for ${String(answer)}`,
        buildRandom(yearGroup),
      );
      const blanks = sudoku.cells.filter(({ isGiven }) => !isGiven);

      expect(blanks).toHaveLength(plan.blankCount);
      expect(
        countSudokuSolutions(
          sudoku.cells.map(({ solution, isGiven }) =>
            isGiven ? solution : undefined,
          ),
          sudoku,
        ),
      ).toBe(1);
      const factCells = sudoku.cells.filter(({ fact }) => fact !== undefined);
      expect(factCells).toHaveLength(plan.factCount);
      for (const { fact, solution, isGiven } of factCells) {
        expect(isGiven).toBe(false);
        expect(fact).toBe(`fact for ${String(solution)}`);
      }
    },
  );

  it("grows from a 4 × 4 grid in Key Stage 1 to a full 9 × 9 grid in Year 6", () => {
    expect(yearGroups.map((yearGroup) => sudokuPlans[yearGroup].size)).toEqual([
      4, 4, 6, 6, 9, 9,
    ]);
  });
});
