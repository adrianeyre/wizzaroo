import { describe, expect, it } from "vitest";
import { isCheckAnswerRight, type CheckAttempt } from "./checks.js";
import { skills } from "./skills.js";
import {
  buildTimesTablesCheckPaper,
  buildTimesTablesGrid,
  buildTimesTablesWarmUp,
  heavierTables,
  listCheckablePairs,
  parseFactKey,
  timesTablesCheckSkillId,
} from "./times-tables-check.js";

const buildSeededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

describe("buildTimesTablesCheckPaper", () => {
  it("asks 25 different facts from the 2 to 12 times tables, never the same pair twice either way round", () => {
    for (const seed of [1, 2, 3, 42, 99]) {
      const { questions } = buildTimesTablesCheckPaper(buildSeededRandom(seed));
      const pairs = questions.map(({ key }) => parseFactKey(key));
      const unordered = pairs.map((pair) =>
        pair === undefined
          ? ""
          : `${String(Math.min(pair.first, pair.second))}x${String(Math.max(pair.first, pair.second))}`,
      );

      expect(questions).toHaveLength(25);
      expect(new Set(unordered).size).toBe(25);
      for (const pair of pairs) {
        expect(pair?.first).toBeGreaterThanOrEqual(2);
        expect(pair?.second).toBeLessThanOrEqual(12);
      }
    }
  });

  it("weights the 6, 7, 8, 9 and 12 times tables more heavily", () => {
    let heavierCount = 0;
    let questionCount = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const { key } of buildTimesTablesCheckPaper(buildSeededRandom(seed))
        .questions) {
        const pair = parseFactKey(key);
        questionCount += 1;
        heavierCount +=
          pair !== undefined &&
          (heavierTables.includes(pair.first) ||
            heavierTables.includes(pair.second))
            ? 1
            : 0;
      }
    }
    const heavierShareOfPairs =
      listCheckablePairs().filter(
        ({ first, second }) =>
          heavierTables.includes(first) || heavierTables.includes(second),
      ).length / listCheckablePairs().length;

    expect(heavierCount / questionCount).toBeGreaterThan(heavierShareOfPairs);
  });

  it("gives each question its product as the answer, on the times tables Skill", () => {
    const { questions } = buildTimesTablesCheckPaper(buildSeededRandom(7));

    expect(skills.some(({ id }) => id === timesTablesCheckSkillId)).toBe(true);
    for (const question of questions) {
      const pair = parseFactKey(question.key);
      expect(question.skillId).toBe(timesTablesCheckSkillId);
      expect(
        isCheckAnswerRight(
          question,
          String((pair?.first ?? 0) * (pair?.second ?? 0)),
        ),
      ).toBe(true);
    }
  });

  it("warms up with three easy questions", () => {
    const warmUp = buildTimesTablesWarmUp(buildSeededRandom(3));

    expect(warmUp).toHaveLength(3);
    expect(warmUp.every(({ questionType }) => questionType === "warm-up")).toBe(
      true,
    );
  });
});

describe("buildTimesTablesGrid", () => {
  const buildAttempt = (outcomes: CheckAttempt["outcomes"]): CheckAttempt => ({
    checkGameType: "times-tables-check",
    isClockOff: false,
    outcomes,
    finishedAt: "2026-11-01T10:00:00.000Z",
    localDate: "2026-11-01",
    score: 0,
    questionCount: outcomes.length,
  });
  const outcome = (
    key: string,
    isRight: boolean,
    isInTime: boolean,
    millisecondsTaken: number,
  ) => ({
    key,
    questionType: "x",
    skillId: timesTablesCheckSkillId,
    isRight,
    isInTime,
    millisecondsTaken,
  });

  it("marks each fact both ways round with the most worrying answer from recent Timed Checks", () => {
    const grid = buildTimesTablesGrid([
      buildAttempt([
        outcome("7x8", true, true, 1500),
        outcome("6x9", true, true, 5000),
        outcome("12x4", false, false, 6000),
      ]),
      buildAttempt([
        outcome("8x7", false, true, 2000),
        outcome("3x3", true, true, 1000),
      ]),
    ]);
    const findStatus = (first: number, second: number) =>
      grid[first - 2][second - 2].status;

    expect(grid).toHaveLength(11);
    expect(grid[0]).toHaveLength(11);
    expect(findStatus(7, 8)).toBe("missed");
    expect(findStatus(8, 7)).toBe("missed");
    expect(findStatus(9, 6)).toBe("slow");
    expect(findStatus(4, 12)).toBe("not-in-time");
    expect(findStatus(3, 3)).toBe("right");
    expect(findStatus(2, 2)).toBe("not-asked");
  });
});
