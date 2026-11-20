import { describe, expect, it } from "vitest";
import { yearGroups } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildMineField,
  digFrom,
  isMineFieldCleared,
  listNeighbours,
  mineFieldPlans,
} from "./mine-sweeper.js";

describe("listNeighbours", () => {
  it("finds the 8 squares around a middle square and 3 around a corner", () => {
    const shape = { rows: 4, columns: 4 };

    expect(listNeighbours(5, shape).toSorted((a, b) => a - b)).toEqual([
      0, 1, 2, 4, 6, 8, 9, 10,
    ]);
    expect(listNeighbours(0, shape).toSorted((a, b) => a - b)).toEqual([
      1, 4, 5,
    ]);
  });
});

describe("buildMineField", () => {
  it.each(yearGroups)(
    "lays Year %i's mines away from the first dig, with each clue counting the mines next to it",
    (yearGroup) => {
      const plan = mineFieldPlans[yearGroup];
      const firstDig = Math.floor((plan.rows * plan.columns) / 2);
      const field = buildMineField(plan, firstDig, buildRandom(yearGroup));

      expect(field.mines.filter(Boolean)).toHaveLength(plan.mineCount);
      expect(field.mines[firstDig]).toBe(false);
      expect(field.clues[firstDig]).toBe(0);
      field.clues.forEach((clue, index) => {
        expect(clue).toBe(
          listNeighbours(index, plan).filter(
            (neighbour) => field.mines[neighbour],
          ).length,
        );
        expect(clue).toBeLessThanOrEqual(8);
      });
    },
  );
});

describe("digFrom", () => {
  const field = {
    rows: 3,
    columns: 3,
    mines: [false, false, false, false, false, false, false, false, true],
    clues: [0, 0, 0, 0, 1, 1, 0, 1, 0],
  };

  it("opens every connected empty square and the clues around them", () => {
    const opened = digFrom(field, new Set(), new Set(), 0);

    expect([...opened].toSorted((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(isMineFieldCleared(field, opened)).toBe(true);
  });

  it("leaves a flagged square shut", () => {
    const opened = digFrom(field, new Set(), new Set([1]), 0);

    expect(opened.has(1)).toBe(false);
    expect(isMineFieldCleared(field, opened)).toBe(false);
  });

  it("opens only the clue when a clue square is dug", () => {
    expect([...digFrom(field, new Set(), new Set(), 4)]).toEqual([4]);
  });
});
