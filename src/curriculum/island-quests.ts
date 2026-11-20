import { emberIsleQuest } from "./island-quests/ember-isle.js";
import { frostIsleQuest } from "./island-quests/frost-isle.js";
import { jungleReachQuest } from "./island-quests/jungle-reach.js";
import { meadowIsleQuest } from "./island-quests/meadow-isle.js";
import { starfallIsleQuest } from "./island-quests/starfall-isle.js";
import { sunscorchSandsQuest } from "./island-quests/sunscorch-sands.js";
import type { IslandQuest } from "./island-quest-rules.js";

export * from "./island-quest-rules.js";

/** Every Island's Quest, in the order of the Islands' Years (ADR 0058). */
export const islandQuests: readonly IslandQuest[] = [
  meadowIsleQuest,
  frostIsleQuest,
  sunscorchSandsQuest,
  jungleReachQuest,
  emberIsleQuest,
  starfallIsleQuest,
];

export const findIslandQuest = (islandId: string): IslandQuest | undefined =>
  islandQuests.find((quest) => quest.islandId === islandId);

/** Every Island, Find and Puzzle a play event may name. */
export const listQuestIslandIds = (): string[] =>
  islandQuests.map(({ islandId }) => islandId);

export const listQuestLyingFindIds = (): string[] =>
  islandQuests.flatMap(({ lyingFindIds }) => lyingFindIds);

export const listQuestPuzzleIds = (): string[] =>
  islandQuests.flatMap(({ puzzles }) => puzzles.map(({ id }) => id));
