import { describe, expect, it } from "vitest";
import { yearGroups } from "../../curriculum/skills.js";
import {
  spellingSkillByYear,
  spellingWordLists,
} from "../../curriculum/spelling-words.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildCrossword,
  crosswordWordCounts,
  listEntryCells,
  type Crossword,
} from "./crossword.js";

const toKey = (row: number, column: number) =>
  `${String(row)},${String(column)}`;

const buildLetterGrid = ({ entries }: Crossword) => {
  const letters = new Map<string, string>();
  for (const entry of entries) {
    listEntryCells(entry).forEach(({ row, column }, position) => {
      const key = toKey(row, column);
      const existing = letters.get(key);
      expect(
        existing === undefined || existing === entry.answer[position],
      ).toBe(true);
      letters.set(key, entry.answer[position]);
    });
  }
  return letters;
};

const readRuns = (crossword: Crossword, letters: Map<string, string>) => {
  const runs: string[] = [];
  for (const [rowStep, columnStep] of [
    [0, 1],
    [1, 0],
  ]) {
    for (let row = 0; row < crossword.rows; row++) {
      for (let column = 0; column < crossword.columns; column++) {
        const isStart =
          letters.has(toKey(row, column)) &&
          !letters.has(toKey(row - rowStep, column - columnStep));
        if (!isStart) {
          continue;
        }
        let run = "";
        let step = 0;
        while (
          letters.has(toKey(row + rowStep * step, column + columnStep * step))
        ) {
          run +=
            letters.get(
              toKey(row + rowStep * step, column + columnStep * step),
            ) ?? "";
          step++;
        }
        if (run.length > 1) {
          runs.push(run);
        }
      }
    }
  }
  return runs;
};

describe("buildCrossword", () => {
  it.each(yearGroups)(
    "builds a Year %i crossword whose words cross cleanly, with no stray words made by letters touching",
    (yearGroup) => {
      const words = spellingWordLists[spellingSkillByYear[yearGroup]];
      for (let seed = 1; seed <= 8; seed++) {
        const crossword = buildCrossword(
          words,
          crosswordWordCounts[yearGroup],
          buildRandom(seed),
        );
        const letters = buildLetterGrid(crossword);

        expect(crossword.entries.length).toBeGreaterThanOrEqual(
          crosswordWordCounts[yearGroup] - 1,
        );
        expect(readRuns(crossword, letters).toSorted()).toEqual(
          crossword.entries.map(({ answer }) => answer).toSorted(),
        );
        for (const entry of crossword.entries) {
          expect(
            words.find(({ word }) => word.toUpperCase() === entry.answer)?.clue,
          ).toBe(entry.clue);
        }
      }
    },
  );

  it("numbers the clues in reading order, sharing a number where an across and a down start together", () => {
    const crossword = buildCrossword(
      spellingWordLists["english.word-list-lower-key-stage-2"],
      6,
      buildRandom(11),
    );
    const starts = crossword.entries.map(({ number, row, column }) => ({
      number,
      at: row * crossword.columns + column,
    }));

    for (const first of starts) {
      for (const second of starts) {
        expect(first.number < second.number).toBe(first.at < second.at);
      }
    }
    expect(crossword.entries[0].number).toBe(1);
  });
});
