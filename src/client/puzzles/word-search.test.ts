import { describe, expect, it } from "vitest";
import {
  spellingSkillByYear,
  spellingWordLists,
} from "../../curriculum/spelling-words.js";
import { yearGroups } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildStraightLine,
  buildWordSearch,
  findWordOnLine,
  wordSearchPlans,
} from "./word-search.js";

const listWords = (yearGroup: (typeof yearGroups)[number]) =>
  spellingWordLists[spellingSkillByYear[yearGroup]].map(({ word }) => word);

describe("buildWordSearch", () => {
  it.each(yearGroups)(
    "hides the planned number of Year %i spelling words, each spelled out along its cells",
    (yearGroup) => {
      const plan = wordSearchPlans[yearGroup];
      for (let seed = 1; seed <= 20; seed++) {
        const wordSearch = buildWordSearch(
          listWords(yearGroup),
          plan,
          buildRandom(seed),
        );

        expect(wordSearch.words).toHaveLength(plan.wordCount);
        expect(wordSearch.letters).toHaveLength(plan.size);
        for (const row of wordSearch.letters) {
          expect(row.join("")).toMatch(
            new RegExp(`^[A-Z]{${String(plan.size)}}$`),
          );
        }
        for (const { word, cells } of wordSearch.words) {
          expect(
            cells
              .map(({ row, column }) => wordSearch.letters[row][column])
              .join(""),
          ).toBe(word);
          expect(buildStraightLine(cells[0], cells[cells.length - 1])).toEqual(
            cells,
          );
        }
      }
    },
  );

  it("never hides a word that sits inside another hidden word", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { words } = buildWordSearch(
        ["YOUR", "OUR", "WEIGHT", "EIGHT", "WAS", "SAW", "PUSH", "PULL"],
        wordSearchPlans[6],
        buildRandom(seed),
      );
      const placed = words.map(({ word }) => word);
      for (const word of placed) {
        const others = placed.filter((other) => other !== word);
        const reversed = Array.from(word).toReversed().join("");
        expect(
          others.some(
            (other) => other.includes(word) || other.includes(reversed),
          ),
        ).toBe(false);
      }
    }
  });

  it("only runs Year 1 words across and down, so they read the way the Child reads", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { words } = buildWordSearch(
        listWords(1),
        wordSearchPlans[1],
        buildRandom(seed),
      );
      for (const { cells } of words) {
        const [first, second] = cells;
        expect([
          [0, 1],
          [1, 0],
        ]).toContainEqual([
          second.row - first.row,
          second.column - first.column,
        ]);
      }
    }
  });
});

describe("buildStraightLine", () => {
  it("draws a line across, down or corner to corner", () => {
    expect(
      buildStraightLine({ row: 0, column: 0 }, { row: 2, column: 2 }),
    ).toEqual([
      { row: 0, column: 0 },
      { row: 1, column: 1 },
      { row: 2, column: 2 },
    ]);
    expect(
      buildStraightLine({ row: 3, column: 1 }, { row: 3, column: 0 }),
    ).toEqual([
      { row: 3, column: 1 },
      { row: 3, column: 0 },
    ]);
  });

  it("refuses a line that isn't straight", () => {
    expect(
      buildStraightLine({ row: 0, column: 0 }, { row: 1, column: 2 }),
    ).toBeUndefined();
  });
});

describe("findWordOnLine", () => {
  it("finds a word chosen from either end, and nothing on a line that isn't a word", () => {
    const wordSearch = buildWordSearch(
      ["said"],
      wordSearchPlans[1],
      buildRandom(3),
    );
    const [{ cells }] = wordSearch.words;

    expect(findWordOnLine(wordSearch, cells)?.word).toBe("SAID");
    expect(findWordOnLine(wordSearch, cells.toReversed())?.word).toBe("SAID");
    expect(findWordOnLine(wordSearch, cells.slice(1))).toBeUndefined();
  });
});
