import { describe, expect, it } from "vitest";
import { worldMap } from "./world-map.js";
import {
  canSolvePuzzle,
  checkIslandQuest,
  findIslandQuest,
  findsPerQuest,
  InvalidIslandQuestError,
  islandersPerQuest,
  islandQuests,
  isPuzzleWithinReach,
  isQuestComplete,
  listHeldFindIds,
  listUsedFindIds,
  puzzlesPerQuest,
  type IslandQuest,
} from "./island-quests.js";
import { meadowIsleQuest } from "./island-quests/meadow-isle.js";

describe("the Island Quests", () => {
  it("gives every Island a Quest of its own", () => {
    expect(islandQuests.map(({ islandId }) => islandId).toSorted()).toEqual(
      worldMap.islands.map(({ id }) => id).toSorted(),
    );
  });

  it.each(islandQuests.map((quest) => [quest.islandId, quest] as const))(
    "holds together on %s: 30 Finds, 10 Islanders and 30 Puzzles, all solvable",
    (_islandId, quest) => {
      expect(() => {
        checkIslandQuest(quest);
      }).not.toThrow();
      expect(quest.finds).toHaveLength(findsPerQuest);
      expect(quest.islanders).toHaveLength(islandersPerQuest);
      expect(quest.puzzles).toHaveLength(puzzlesPerQuest);
    },
  );

  it("has puzzles unique to each Island, and no Islander shares a name with one on another Island", () => {
    const puzzleIds = islandQuests.flatMap(({ puzzles }) =>
      puzzles.map(({ id }) => id),
    );
    expect(new Set(puzzleIds).size).toBe(puzzleIds.length);
    const names = islandQuests.flatMap(({ islanders }) =>
      islanders.map(({ name }) => name),
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it("asks a National Curriculum question to finish every Puzzle that gives nothing", () => {
    for (const quest of islandQuests) {
      const finishing = quest.puzzles.filter(
        ({ gives }) => gives === undefined,
      );
      expect(finishing.length, quest.islandId).toBeGreaterThan(0);
      for (const { id, question } of finishing) {
        expect(question?.curriculumLink, id).toMatch(
          /^(Year [1-6]|Key Stage [12])/,
        );
      }
    }
  });

  it("finds each Island's Quest by its id", () => {
    expect(findIslandQuest("meadow-isle")).toBe(meadowIsleQuest);
    expect(findIslandQuest("atlantis")).toBeUndefined();
  });
});

describe("a Child's rucksack", () => {
  const progress = {
    pickedUpFindIds: ["meadow-isle.rusty-key", "meadow-isle.empty-bucket"],
    solvedPuzzleIds: ["meadow-isle.open-the-shed"],
  };

  it("holds what was picked up or given, less what was used", () => {
    expect(listHeldFindIds(meadowIsleQuest, progress)).toEqual([
      "meadow-isle.police-whistle",
      "meadow-isle.empty-bucket",
    ]);
    expect(listUsedFindIds(meadowIsleQuest, progress)).toEqual([
      "meadow-isle.rusty-key",
    ]);
  });

  it("can solve a Puzzle only with its Find in the rucksack, and knows which are within reach", () => {
    const puzzle = (id: string) => {
      const found = meadowIsleQuest.puzzles.find(
        (candidate) => candidate.id === id,
      );
      if (found === undefined) {
        throw new Error(id);
      }
      return found;
    };
    expect(
      canSolvePuzzle(
        meadowIsleQuest,
        progress,
        puzzle("meadow-isle.whistle-for-officer-patel"),
      ),
    ).toBe(true);
    expect(
      canSolvePuzzle(
        meadowIsleQuest,
        progress,
        puzzle("meadow-isle.open-the-fair-gate"),
      ),
    ).toBe(false);
    expect(
      isPuzzleWithinReach(
        meadowIsleQuest,
        progress,
        puzzle("meadow-isle.plant-the-seeds"),
      ),
    ).toBe(true);
    expect(isQuestComplete(meadowIsleQuest, progress)).toBe(false);
  });
});

describe("checkIslandQuest", () => {
  const breakQuest = (change: Partial<IslandQuest>): IslandQuest => ({
    ...meadowIsleQuest,
    ...change,
  });

  it("refuses a Quest a Child could never finish, or one with a Find used twice", () => {
    const [first, ...rest] = meadowIsleQuest.puzzles;
    expect(() => {
      checkIslandQuest(
        breakQuest({
          puzzles: [{ ...first, needs: "meadow-isle.fair-ticket" }, ...rest],
        }),
      );
    }).toThrow(InvalidIslandQuestError);
    expect(() => {
      checkIslandQuest(
        breakQuest({ islanders: meadowIsleQuest.islanders.slice(1) }),
      );
    }).toThrow("9 Islanders");
  });

  it("refuses a Puzzle that gives nothing and asks no question", () => {
    const puzzles = meadowIsleQuest.puzzles.map((puzzle) =>
      puzzle.id === "meadow-isle.open-the-grand-chest"
        ? { ...puzzle, question: undefined }
        : puzzle,
    );
    expect(() => {
      checkIslandQuest(breakQuest({ puzzles }));
    }).toThrow("must finish with a question");
  });
});
