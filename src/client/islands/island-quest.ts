import {
  canSolvePuzzle,
  findIslandQuest,
  findPuzzleAt,
  findQuestProgress,
  isPuzzleWithinReach,
  listHeldFindIds,
  type Islander,
  type IslandQuest,
  type PuzzleTarget,
  type QuestFind,
  type QuestProgress,
  type QuestPuzzle,
  type QuestThing,
} from "../../curriculum/island-quests.js";
import type { MapPoint } from "../world-map-terrain.js";
import type { ExploreInteraction } from "./island-adventures.js";
import { islanderBlockRadius } from "./quest-islander-models.js";
import { questSites, type QuestSite } from "./island-quest-sites.js";
import { thingBlockRadius } from "./quest-thing-models.js";

/**
 * The Island's Quest as the Character meets it (ADR 0058): where its
 * things, Islanders and Finds stand, what can be done with each, and
 * what the Islanders say.
 */

/** How near the Character comes to a Find to pick it up. */
export const findPickUpReach = 1.1;

export const listQuestSites = (islandId: string): readonly QuestSite[] =>
  questSites[islandId] ?? [];

const findSite = (islandId: string, id: string): QuestSite | undefined =>
  listQuestSites(islandId).find((site) => site.id === id);

export const findQuestSitePosition = (
  islandId: string,
  id: string,
): MapPoint | undefined => findSite(islandId, id)?.centre;

export const listQuestInteractions = (
  islandId: string,
): ExploreInteraction[] => {
  const quest = findIslandQuest(islandId);
  if (quest === undefined) {
    return [];
  }
  return [
    ...quest.islanders.flatMap(({ id, name }): ExploreInteraction[] => {
      const position = findQuestSitePosition(islandId, id);
      return position === undefined
        ? []
        : [{ kind: "islander", id, name, position }];
    }),
    ...quest.things.flatMap(({ id, name }): ExploreInteraction[] => {
      const position = findQuestSitePosition(islandId, id);
      return position === undefined
        ? []
        : [{ kind: "quest-thing", id, name, position }];
    }),
  ];
};

export const listQuestBlockers = (
  islandId: string,
): { centre: MapPoint; radius: number }[] =>
  listQuestSites(islandId)
    .filter(({ kind }) => kind !== "find")
    .map(({ centre, kind }) => ({
      centre,
      radius: kind === "thing" ? thingBlockRadius : islanderBlockRadius,
    }));

/** The Finds still lying where they can be picked up. */
export const listLyingFinds = (
  islandId: string,
  progress: Pick<QuestProgress, "pickedUpFindIds">,
): QuestSite[] =>
  listQuestSites(islandId).filter(
    ({ kind, id }) => kind === "find" && !progress.pickedUpFindIds.includes(id),
  );

export const listFindsInReach = (
  islandId: string,
  progress: Pick<QuestProgress, "pickedUpFindIds">,
  point: MapPoint,
): QuestSite[] =>
  listLyingFinds(islandId, progress).filter(
    ({ centre }) =>
      Math.hypot(centre.x - point.x, centre.z - point.z) <= findPickUpReach,
  );

/** A Child's progress with what they did since the server last replayed it added on. */
export const addQuestPlay = (
  progress: QuestProgress,
  { pickedUpFindIds, solvedPuzzleIds }: Omit<QuestProgress, "islandId">,
): QuestProgress => ({
  islandId: progress.islandId,
  pickedUpFindIds: [
    ...new Set([...progress.pickedUpFindIds, ...pickedUpFindIds]),
  ],
  solvedPuzzleIds: [
    ...new Set([...progress.solvedPuzzleIds, ...solvedPuzzleIds]),
  ],
});

export const findQuestFind = (
  quest: IslandQuest,
  findId: string,
): QuestFind | undefined => quest.finds.find(({ id }) => id === findId);

export const listHeldFinds = (
  quest: IslandQuest,
  progress: QuestProgress,
): QuestFind[] =>
  listHeldFindIds(quest, progress).flatMap((id) => {
    const find = findQuestFind(quest, id);
    return find === undefined ? [] : [find];
  });

export type FindState = "held" | "used" | "not-found";

/** Where each of the Quest's Finds is: in the rucksack, used up, or still to find. */
export const findFindState = (
  quest: IslandQuest,
  progress: QuestProgress,
  findId: string,
): FindState => {
  if (listHeldFindIds(quest, progress).includes(findId)) {
    return "held";
  }
  const isUsed = quest.puzzles.some(
    ({ id, needs }) =>
      needs === findId && progress.solvedPuzzleIds.includes(id),
  );
  return isUsed ? "used" : "not-found";
};

export type FindUse =
  | { kind: "solved"; puzzle: QuestPuzzle }
  | { kind: "asks-a-question"; puzzle: QuestPuzzle }
  | { kind: "no-use"; message: string }
  | { kind: "already-solved"; message: string };

const describeNoUse = (find: QuestFind, targetName: string): string =>
  `You try the ${find.name} on ${targetName}, but nothing happens. Maybe something else will work?`;

/** What happens when the Child uses a Find from their rucksack on an Islander or a thing. */
export const tryFindOn = (
  quest: IslandQuest,
  progress: QuestProgress,
  target: PuzzleTarget,
  targetName: string,
  find: QuestFind,
): FindUse => {
  const puzzle = findPuzzleAt(quest, target);
  if (puzzle === undefined) {
    return { kind: "no-use", message: describeNoUse(find, targetName) };
  }
  if (progress.solvedPuzzleIds.includes(puzzle.id)) {
    return {
      kind: "already-solved",
      message: `${targetName} doesn't need anything more. You've already helped here!`,
    };
  }
  if (puzzle.needs !== find.id || !canSolvePuzzle(quest, progress, puzzle)) {
    return {
      kind: "no-use",
      message:
        target.kind === "islander"
          ? `"Thank you, but I don't need the ${find.name}," says ${targetName}. "Keep looking!"`
          : describeNoUse(find, targetName),
    };
  }
  return puzzle.question === undefined
    ? { kind: "solved", puzzle }
    : { kind: "asks-a-question", puzzle };
};

/** The hints an Islander gives, for the Puzzles they know about that aren't solved yet, the ones within reach first. */
export const listIslanderHints = (
  quest: IslandQuest,
  progress: QuestProgress,
  islanderId: string,
): string[] =>
  quest.puzzles
    .filter(
      ({ id, hintBy }) =>
        hintBy === islanderId && !progress.solvedPuzzleIds.includes(id),
    )
    .toSorted(
      (first, second) =>
        Number(isPuzzleWithinReach(quest, progress, second)) -
        Number(isPuzzleWithinReach(quest, progress, first)),
    )
    .map(({ hint }) => hint);

export interface IslanderTalk {
  islander: Islander;
  /** What they say now. */
  says: string;
  /** Their own Puzzle, if it isn't solved yet. */
  puzzle: QuestPuzzle | undefined;
  hints: string[];
}

export const findIslanderTalk = (
  quest: IslandQuest,
  progress: QuestProgress,
  islanderId: string,
): IslanderTalk | undefined => {
  const islander = quest.islanders.find(({ id }) => id === islanderId);
  if (islander === undefined) {
    return undefined;
  }
  const own = findPuzzleAt(quest, { kind: "islander", id: islanderId });
  const puzzle =
    own === undefined || progress.solvedPuzzleIds.includes(own.id)
      ? undefined
      : own;
  const hints = listIslanderHints(quest, progress, islanderId);
  const says =
    puzzle !== undefined
      ? `${islander.greeting} ${puzzle.ask}`
      : hints.length > 0
        ? `${islander.greeting} Can I help you with anything?`
        : islander.thanks;
  return { islander, says, puzzle, hints };
};

export interface ThingLook {
  thing: QuestThing;
  says: string;
  isSolved: boolean;
}

export const findThingLook = (
  quest: IslandQuest,
  progress: QuestProgress,
  thingId: string,
): ThingLook | undefined => {
  const thing = quest.things.find(({ id }) => id === thingId);
  const puzzle = findPuzzleAt(quest, { kind: "thing", id: thingId });
  if (thing === undefined || puzzle === undefined) {
    return undefined;
  }
  const isSolved = progress.solvedPuzzleIds.includes(puzzle.id);
  return { thing, isSolved, says: isSolved ? puzzle.solved : puzzle.ask };
};

/** What the Child is told when a Puzzle is solved, with the Find it gave them. */
export const describeSolvedPuzzle = (
  quest: IslandQuest,
  puzzle: QuestPuzzle,
): string => {
  const given =
    puzzle.gives === undefined ? undefined : findQuestFind(quest, puzzle.gives);
  return given === undefined
    ? puzzle.solved
    : `${puzzle.solved} The ${given.name} is in your rucksack.`;
};

const hashText = (text: string): number => {
  let hash = 2166136261;
  for (const character of text) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16777619);
  }
  return hash >>> 0;
};

export interface ShuffledChoice {
  text: string;
  isRight: boolean;
}

/**
 * A question's choices in an order of their own, the same every time
 * for the same Puzzle, so the right answer isn't always first.
 */
export const shuffleChoices = (puzzle: QuestPuzzle): ShuffledChoice[] => {
  const { question } = puzzle;
  if (question === undefined) {
    return [];
  }
  const choices = question.choices.map((text, index) => ({
    text,
    isRight: index === question.answer,
  }));
  const rotate = hashText(puzzle.id) % choices.length;
  const rotated = [...choices.slice(rotate), ...choices.slice(0, rotate)];
  return hashText(`${puzzle.id}!`) % 2 === 0
    ? rotated
    : [rotated[0], rotated[2], rotated[1]];
};

export const findIslandQuestProgress = (
  progress: readonly QuestProgress[],
  islandId: string,
): QuestProgress => findQuestProgress(progress, islandId);

export const countSolvedPuzzles = (
  quest: IslandQuest,
  progress: QuestProgress,
): number =>
  quest.puzzles.filter(({ id }) => progress.solvedPuzzleIds.includes(id))
    .length;
