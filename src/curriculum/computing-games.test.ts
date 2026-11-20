import { describe, expect, it } from "vitest";
import { kebabCaseShape } from "./curriculum-file.js";
import {
  computingGames,
  findComputingGame,
  isComputingGameType,
} from "./computing-games.js";
import {
  followPath,
  isInsideGrid,
  pixelCodes,
  type BranchNode,
  type ComputingDifficulty,
  type ComputingGame,
  type ComputingQuestion,
  type ComputingScene,
  type GridCell,
} from "./computing-scenes.js";
import { labGames } from "./lab-games.js";
import { skills, yearGroups } from "./skills.js";

const labSkillIds = new Set(
  labGames.filter(({ isOwnSkill }) => isOwnSkill).map(({ skillId }) => skillId),
);

const difficulties: readonly ComputingDifficulty[] = [1, 2, 3];
const seeds = [1, 7, 42, 2024, 99_991];
const fewestBankQuestions = 8;
const fewestGeneratedQuestions = 5;
const longestAsk = 90;
const longestChoice = 30;
const longestHint = 130;
const longestInstruction = 110;

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const listQuestionSets = (game: ComputingGame): ComputingQuestion[][] => {
  const { questions } = game;
  if (questions.kind === "bank") {
    return [questions.questions];
  }
  return difficulties.flatMap((difficulty) =>
    seeds.map((seed) =>
      questions.generate(difficulty, buildSeededRandom(seed)),
    ),
  );
};

const findSkill = (skillId: string) => skills.find(({ id }) => id === skillId);

const expectShortText = (
  text: string,
  longest: number,
  describedAs: string,
) => {
  expect(text.trim(), describedAs).not.toBe("");
  expect(text.length, `${describedAs}: "${text}"`).toBeLessThanOrEqual(longest);
};

const expectCellInside = (
  cell: GridCell,
  columns: number,
  rows: number,
  describedAs: string,
) => {
  expect(isInsideGrid(cell, columns, rows), describedAs).toBe(true);
};

const listLeaves = (node: BranchNode): string[] =>
  "leaf" in node
    ? [node.leaf]
    : [...listLeaves(node.yes), ...listLeaves(node.no)];

const findBranchDepth = (node: BranchNode): number =>
  "leaf" in node
    ? 0
    : 1 + Math.max(findBranchDepth(node.yes), findBranchDepth(node.no));

const listBranchQuestions = (node: BranchNode): string[] =>
  "leaf" in node
    ? []
    : [
        node.question,
        ...listBranchQuestions(node.yes),
        ...listBranchQuestions(node.no),
      ];

const expectSceneFits = (scene: ComputingScene, describedAs: string) => {
  switch (scene.kind) {
    case "robot-grid": {
      const { columns, rows } = scene;
      expect(columns, describedAs).toBeGreaterThanOrEqual(3);
      expect(columns, describedAs).toBeLessThanOrEqual(7);
      expect(rows, describedAs).toBeGreaterThanOrEqual(3);
      expect(rows, describedAs).toBeLessThanOrEqual(7);
      const cells = [
        scene.robot,
        ...(scene.goal === undefined ? [] : [scene.goal]),
        ...(scene.obstacles ?? []),
        ...followPath(scene.robot, scene.path ?? []),
        ...(scene.labels ?? []).map(({ cell }) => cell),
      ];
      for (const cell of cells) {
        expectCellInside(cell, columns, rows, describedAs);
      }
      for (const { text } of scene.labels ?? []) {
        expectShortText(text, 2, describedAs);
      }
      return;
    }
    case "code-stack":
      expect(scene.blocks.length, describedAs).toBeGreaterThanOrEqual(1);
      expect(scene.blocks.length, describedAs).toBeLessThanOrEqual(7);
      for (const { text, depth = 0 } of scene.blocks) {
        expectShortText(text, 26, describedAs);
        expect(depth, describedAs).toBeLessThanOrEqual(2);
      }
      if (scene.gadget?.kind === "led-board") {
        expectShortText(scene.gadget.shows, 3, describedAs);
      }
      return;
    case "device":
      if (scene.caption !== undefined) {
        expectShortText(scene.caption, 18, describedAs);
      }
      return;
    case "tablet-screen": {
      expectShortText(scene.title, 22, describedAs);
      const { screen } = scene;
      if (screen.app === "chat") {
        expect(screen.messages.length, describedAs).toBeGreaterThanOrEqual(1);
        expect(screen.messages.length, describedAs).toBeLessThanOrEqual(4);
        for (const { from, text } of screen.messages) {
          expectShortText(from, 14, describedAs);
          expectShortText(text, 30, describedAs);
        }
        return;
      }
      if ("rows" in screen) {
        expect(screen.rows.length, describedAs).toBeGreaterThanOrEqual(2);
        expect(screen.rows.length, describedAs).toBeLessThanOrEqual(5);
        const columnCount = screen.rows[0].length;
        expect(columnCount, describedAs).toBeLessThanOrEqual(4);
        for (const row of screen.rows) {
          expect(row.length, describedAs).toBe(columnCount);
          for (const cell of row) {
            expect(
              cell.length,
              `${describedAs}: "${cell}"`,
            ).toBeLessThanOrEqual(12);
          }
        }
        return;
      }
      const { lines } = screen;
      expect(lines.length, describedAs).toBeGreaterThanOrEqual(1);
      expect(lines.length, describedAs).toBeLessThanOrEqual(5);
      for (const line of lines) {
        expectShortText(line, 26, describedAs);
      }
      return;
    }
    case "search-engine":
      expectShortText(scene.query, 28, describedAs);
      expect(scene.results.length, describedAs).toBeGreaterThanOrEqual(1);
      expect(scene.results.length, describedAs).toBeLessThanOrEqual(4);
      for (const { title, address } of scene.results) {
        expectShortText(title, 30, describedAs);
        expectShortText(address, 28, describedAs);
      }
      return;
    case "network-map": {
      const ids = scene.nodes.map(({ id }) => id);
      expect(new Set(ids).size, describedAs).toBe(ids.length);
      expect(ids.length, describedAs).toBeGreaterThanOrEqual(2);
      expect(ids.length, describedAs).toBeLessThanOrEqual(8);
      const spots = scene.nodes.map(
        ({ column, row }) => `${String(column)},${String(row)}`,
      );
      expect(new Set(spots).size, describedAs).toBe(spots.length);
      for (const node of scene.nodes) {
        expectCellInside(node, 5, 3, describedAs);
        expectShortText(node.label, 10, describedAs);
      }
      const isLinked = (first: string, second: string) =>
        scene.links.some(
          ([from, to]) =>
            (from === first && to === second) ||
            (from === second && to === first),
        );
      for (const [from, to] of scene.links) {
        expect(ids, describedAs).toContain(from);
        expect(ids, describedAs).toContain(to);
      }
      const route = scene.route ?? [];
      route.slice(1).forEach((stop, index) => {
        expect(
          isLinked(route[index], stop),
          `${describedAs}: ${route[index]}-${stop}`,
        ).toBe(true);
      });
      return;
    }
    case "bar-chart":
      expectShortText(scene.title, 24, describedAs);
      expect(scene.bars.length, describedAs).toBeGreaterThanOrEqual(2);
      expect(scene.bars.length, describedAs).toBeLessThanOrEqual(6);
      for (const { label, value } of scene.bars) {
        expectShortText(label, 10, describedAs);
        expect(
          Number.isInteger(value) && value >= 0 && value <= 20,
          describedAs,
        ).toBe(true);
      }
      return;
    case "pixel-grid": {
      expect(scene.frames.length, describedAs).toBeGreaterThanOrEqual(1);
      expect(scene.frames.length, describedAs).toBeLessThanOrEqual(4);
      const rowCount = scene.frames[0].length;
      const columnCount = scene.frames[0][0].length;
      expect(rowCount, describedAs).toBeLessThanOrEqual(8);
      expect(columnCount, describedAs).toBeLessThanOrEqual(10);
      for (const frame of scene.frames) {
        expect(frame.length, describedAs).toBe(rowCount);
        for (const row of frame) {
          expect(row.length, `${describedAs}: "${row}"`).toBe(columnCount);
          for (const code of row) {
            expect(pixelCodes, describedAs).toContain(code);
          }
        }
      }
      if (scene.rowLabels !== undefined) {
        expect(scene.rowLabels.length, describedAs).toBe(rowCount);
        for (const label of scene.rowLabels) {
          expectShortText(label, 8, describedAs);
        }
      }
      if (scene.highlight !== undefined) {
        expectCellInside(scene.highlight, columnCount, rowCount, describedAs);
      }
      return;
    }
    case "sort-machine":
      expect(scene.bins.length, describedAs).toBeGreaterThanOrEqual(2);
      expect(scene.bins.length, describedAs).toBeLessThanOrEqual(4);
      expect(new Set(scene.bins).size, describedAs).toBe(scene.bins.length);
      for (const bin of scene.bins) {
        expectShortText(bin, 18, describedAs);
      }
      return;
    case "branch-tree": {
      const leaves = listLeaves(scene.root);
      expect(findBranchDepth(scene.root), describedAs).toBeGreaterThanOrEqual(
        1,
      );
      expect(findBranchDepth(scene.root), describedAs).toBeLessThanOrEqual(3);
      expect(leaves.length, describedAs).toBeLessThanOrEqual(6);
      for (const leaf of leaves) {
        expectShortText(leaf, 12, describedAs);
      }
      for (const question of listBranchQuestions(scene.root)) {
        expectShortText(question, 24, describedAs);
      }
      if (scene.highlightLeaf !== undefined) {
        expect(leaves, describedAs).toContain(scene.highlightLeaf);
      }
      return;
    }
    case "variable-crates":
      expect(scene.crates.length, describedAs).toBeGreaterThanOrEqual(1);
      expect(scene.crates.length, describedAs).toBeLessThanOrEqual(3);
      for (const { name, value } of scene.crates) {
        expectShortText(name, 10, describedAs);
        expect(value.length, describedAs).toBeLessThanOrEqual(6);
      }
      expect(scene.code.length, describedAs).toBeLessThanOrEqual(6);
      for (const line of scene.code) {
        expectShortText(line, 26, describedAs);
      }
      return;
    case "story-cards":
      expect(scene.cards.length, describedAs).toBeGreaterThanOrEqual(2);
      expect(scene.cards.length, describedAs).toBeLessThanOrEqual(5);
      for (const card of scene.cards) {
        expectShortText(card, 22, describedAs);
      }
      for (const index of [scene.missingIndex, scene.highlightIndex]) {
        if (index !== undefined) {
          expect(index >= 0 && index < scene.cards.length, describedAs).toBe(
            true,
          );
        }
      }
      return;
    case "photo-frame":
      return;
    case "shape-layers":
      expect(scene.layers.length, describedAs).toBeGreaterThanOrEqual(2);
      expect(scene.layers.length, describedAs).toBeLessThanOrEqual(5);
      return;
    case "model-workbench":
      expect(scene.parts.length, describedAs).toBeGreaterThanOrEqual(1);
      expect(scene.parts.length, describedAs).toBeLessThanOrEqual(8);
      for (const { position } of scene.parts) {
        for (const coordinate of position) {
          expect(Math.abs(coordinate), describedAs).toBeLessThanOrEqual(2);
        }
      }
      return;
  }
};

const expectQuestionPlayable = (
  question: ComputingQuestion,
  describedAs: string,
) => {
  expectShortText(question.ask, longestAsk, describedAs);
  expectShortText(question.answer, longestChoice, describedAs);
  if (question.hint !== undefined) {
    expectShortText(question.hint, longestHint, describedAs);
  }
  const distractors = question.distractors.filter(
    (distractor) => distractor !== question.answer,
  );
  expect(
    distractors,
    `${describedAs}: the answer is also a distractor`,
  ).toEqual(question.distractors);
  expect(new Set(distractors).size, `${describedAs}: repeated distractor`).toBe(
    distractors.length,
  );
  expect(
    distractors.length,
    `${describedAs}: too few distractors`,
  ).toBeGreaterThanOrEqual(3);
  for (const distractor of distractors) {
    expectShortText(distractor, longestChoice, describedAs);
  }
  expectSceneFits(question.scene, describedAs);
};

describe("computingGames", () => {
  it("gives every Computing game its own kebab-case Game Type, title and Skill", () => {
    const gameTypes = computingGames.map(({ gameType }) => gameType);
    const skillIds = computingGames.map(({ skillId }) => skillId);

    expect(new Set(gameTypes).size).toBe(gameTypes.length);
    expect(new Set(skillIds).size).toBe(skillIds.length);
    for (const { gameType, title } of computingGames) {
      expect(kebabCaseShape.test(gameType), gameType).toBe(true);
      expect(title.trim(), gameType).not.toBe("");
    }
  });

  it("plays every Computing Skill in exactly one game", () => {
    const computingSkillIds = skills
      .filter(
        ({ subject, id }) => subject === "computing" && !labSkillIds.has(id),
      )
      .map(({ id }) => id)
      .toSorted();

    expect(computingGames.map(({ skillId }) => skillId).toSorted()).toEqual(
      computingSkillIds,
    );
  });

  it.each(yearGroups)("has ten games for Year %i", (yearGroup) => {
    expect(
      computingGames.filter(
        ({ skillId }) => findSkill(skillId)?.yearGroup === yearGroup,
      ),
    ).toHaveLength(10);
  });

  it.each(computingGames.map((game) => [game.gameType, game] as const))(
    "makes %s playable: a short instruction and enough fair, well-sized questions",
    (gameType, game) => {
      expect(findSkill(game.skillId)?.subject, gameType).toBe("computing");
      expectShortText(game.instruction, longestInstruction, gameType);
      const questionSets = listQuestionSets(game);
      const fewest =
        game.questions.kind === "bank"
          ? fewestBankQuestions
          : fewestGeneratedQuestions;
      for (const questions of questionSets) {
        expect(
          questions.length,
          `${gameType} made too few questions`,
        ).toBeGreaterThanOrEqual(fewest);
        questions.forEach((question, index) => {
          expectQuestionPlayable(
            question,
            `${gameType} question ${String(index + 1)}`,
          );
        });
      }
    },
  );

  it("never asks the same bank question twice in one game", () => {
    for (const game of computingGames) {
      if (game.questions.kind === "bank") {
        const asked = game.questions.questions.map(({ ask, answer, scene }) =>
          JSON.stringify([ask, answer, scene]),
        );
        expect(new Set(asked).size, game.gameType).toBe(asked.length);
      }
    }
  });
});

describe("findComputingGame", () => {
  it("finds a Computing game by its Game Type", () => {
    expect(findComputingGame("robot-steps").title).toBe("Robot Steps");
  });
});

describe("isComputingGameType", () => {
  it("knows a Computing game from any other Game Type", () => {
    expect(isComputingGameType("bug-catcher")).toBe(true);
    expect(isComputingGameType("fish-count")).toBe(false);
    expect(isComputingGameType(undefined)).toBe(false);
  });
});
