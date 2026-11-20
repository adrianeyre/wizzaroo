/**
 * Each Island's Quest: an adventure of thirty Puzzles, solved by using
 * the Finds a Child picks up, and is given, on the people and things of
 * the Island (ADR 0058). The Islanders talk, give hints and swap Finds.
 */

/** The shapes a Find is modelled as, each drawn in its own colours. */
export const findShapes = [
  "key",
  "coin",
  "gem",
  "scroll",
  "map",
  "letter",
  "book",
  "bottle",
  "potion",
  "jar",
  "lantern",
  "torch",
  "candle",
  "rope",
  "shovel",
  "bucket",
  "hammer",
  "spanner",
  "gear",
  "battery",
  "magnet",
  "magnifier",
  "telescope",
  "compass",
  "bell",
  "whistle",
  "drum",
  "flute",
  "feather",
  "shell",
  "bone",
  "egg",
  "fish",
  "apple",
  "carrot",
  "cheese",
  "bread",
  "cake",
  "flower",
  "seed-bag",
  "leaf",
  "mushroom",
  "acorn",
  "crystal",
  "ticket",
  "badge",
  "crown",
  "mitten",
  "scarf",
  "umbrella",
  "kite",
  "ball",
  "teddy",
  "toy-boat",
  "net",
  "fishing-rod",
  "paintbrush",
  "pencil",
  "clock",
  "hourglass",
  "medal",
  "ring",
  "mirror",
  "pickaxe",
  "watering-can",
  "basket",
  "chip",
  "rocket",
  "fossil",
  "snowflake",
] as const;

export type FindShape = (typeof findShapes)[number];

export interface FindLook {
  shape: FindShape;
  /** The Find's main colour. */
  colour: string;
  /** A second colour for its trim, handle, label or band. */
  trim: string;
}

/** Something a Child picks up or is given, kept in their rucksack until it is used. */
export interface QuestFind {
  id: string;
  name: string;
  /** A sentence about it, shown in the rucksack. */
  about: string;
  look: FindLook;
}

export const islanderHats = [
  "none",
  "police-helmet",
  "fire-helmet",
  "chef-hat",
  "cap",
  "captain-hat",
  "hard-hat",
  "beanie",
  "sun-hat",
  "crown",
  "wizard-hat",
  "top-hat",
  "bobble-hat",
  "beret",
  "explorer-hat",
  "headscarf",
  "space-helmet",
  "cowboy-hat",
  "nurse-cap",
  "mortarboard",
  "horned-helmet",
  "flower-crown",
] as const;

export type IslanderHat = (typeof islanderHats)[number];

export const islanderHelds = [
  "none",
  "staff",
  "book",
  "spade",
  "basket",
  "net",
  "lantern",
  "clipboard",
  "spanner",
  "wand",
  "fishing-rod",
  "paintbrush",
  "telescope",
  "hose",
  "stethoscope",
  "whistle",
] as const;

export type IslanderHeld = (typeof islanderHelds)[number];

export const islanderOutfits = [
  "tunic",
  "coat",
  "apron",
  "overalls",
  "dress",
  "robe",
  "spacesuit",
  "uniform",
] as const;

export type IslanderOutfit = (typeof islanderOutfits)[number];

export const islanderHairStyles = [
  "short",
  "long",
  "bun",
  "curly",
  "ponytail",
  "bald",
] as const;

export type IslanderHairStyle = (typeof islanderHairStyles)[number];

export interface IslanderLook {
  skin: string;
  hair: string;
  hairStyle: IslanderHairStyle;
  hasBeard: boolean;
  outfit: IslanderOutfit;
  /** The outfit's main colour. */
  top: string;
  /** Trousers, or the skirt of a dress or robe. */
  legs: string;
  hat: IslanderHat;
  hatColour: string;
  held: IslanderHeld;
}

/** Someone who lives on the Island, to talk to, ask for hints and swap Finds with. */
export interface Islander {
  id: string;
  /** What the Child calls them, such as "Officer Patel". */
  name: string;
  /** Their job or role, such as "Police Officer". */
  role: string;
  look: IslanderLook;
  /** What they say when the Child first walks up. */
  greeting: string;
  /** What they say once every Puzzle they hint at, and their own, is solved. */
  thanks: string;
}

export const questThingShapes = [
  "gate",
  "door",
  "chest",
  "well",
  "boulder",
  "statue",
  "machine",
  "safe",
  "campfire",
  "garden-bed",
  "broken-bridge",
  "lamp-post",
  "beacon",
  "cart",
  "boat",
  "pedestal",
  "cage",
  "fountain",
  "mailbox",
  "clock-tower",
  "oven",
  "beehive",
  "snowman",
  "ice-block",
  "robot",
  "totem",
] as const;

export type QuestThingShape = (typeof questThingShapes)[number];

/** Something on the Island a Find is used on, such as a locked gate or a cold oven. */
export interface QuestThing {
  id: string;
  name: string;
  shape: QuestThingShape;
  /** Its main colour. */
  colour: string;
  /** A second colour for its trim, metal or glow. */
  trim: string;
}

/** A question from the National Curriculum, answered to finish a Puzzle. */
export interface QuestQuestion {
  prompt: string;
  choices: readonly [string, string, string];
  /** The index of the right choice. */
  answer: 0 | 1 | 2;
  /** The National Curriculum statement it comes from. */
  curriculumLink: string;
}

export type PuzzleTarget =
  { kind: "islander"; id: string } | { kind: "thing"; id: string };

/** One step of the Quest: using one Find on one Islander or thing. */
export interface QuestPuzzle {
  id: string;
  title: string;
  at: PuzzleTarget;
  /** The Find it needs, which is used up when it is solved. */
  needs: string;
  /** The Find it gives, if any. */
  gives?: string;
  /** What the Islander says, or what the Child sees, before it is solved. */
  ask: string;
  /** The Islander who knows how to solve it. */
  hintBy: string;
  hint: string;
  /** What happens when it is solved. */
  solved: string;
  question?: QuestQuestion;
}

export interface IslandQuest {
  islandId: string;
  title: string;
  /** The story told when the Child starts the Quest. */
  story: string;
  /** The Trophy's name, given when all thirty Puzzles are solved. */
  trophyName: string;
  finds: readonly QuestFind[];
  /** The Finds lying on the Island to be picked up; every other Find is given by a Puzzle. */
  lyingFindIds: readonly string[];
  islanders: readonly Islander[];
  things: readonly QuestThing[];
  puzzles: readonly QuestPuzzle[];
}

export const findsPerQuest = 30;
export const puzzlesPerQuest = 30;
export const islandersPerQuest = 10;
export const thingsPerQuest = 20;
export const lyingFindsPerQuest = 10;

export class InvalidIslandQuestError extends Error {
  override name = "InvalidIslandQuestError";
}

/** A Child's progress through one Island's Quest. */
export interface QuestProgress {
  islandId: string;
  pickedUpFindIds: string[];
  solvedPuzzleIds: string[];
}

export const findQuestProgress = (
  progress: readonly QuestProgress[],
  islandId: string,
): QuestProgress =>
  progress.find((island) => island.islandId === islandId) ?? {
    islandId,
    pickedUpFindIds: [],
    solvedPuzzleIds: [],
  };

/** The Finds in the rucksack: picked up or given, and not yet used, in the Quest's order. */
export const listHeldFindIds = (
  quest: IslandQuest,
  {
    pickedUpFindIds,
    solvedPuzzleIds,
  }: Pick<QuestProgress, "pickedUpFindIds" | "solvedPuzzleIds">,
): string[] => {
  const solved = quest.puzzles.filter(({ id }) => solvedPuzzleIds.includes(id));
  const got = new Set([
    ...pickedUpFindIds,
    ...solved.flatMap(({ gives }) => (gives === undefined ? [] : [gives])),
  ]);
  const used = new Set(solved.map(({ needs }) => needs));
  return quest.finds
    .map(({ id }) => id)
    .filter((id) => got.has(id) && !used.has(id));
};

/** The Finds already used on a Puzzle. */
export const listUsedFindIds = (
  quest: IslandQuest,
  { solvedPuzzleIds }: Pick<QuestProgress, "solvedPuzzleIds">,
): string[] =>
  quest.puzzles
    .filter(({ id }) => solvedPuzzleIds.includes(id))
    .map(({ needs }) => needs);

export const isQuestComplete = (
  quest: IslandQuest,
  { solvedPuzzleIds }: Pick<QuestProgress, "solvedPuzzleIds">,
): boolean => quest.puzzles.every(({ id }) => solvedPuzzleIds.includes(id));

export const findPuzzleAt = (
  quest: IslandQuest,
  target: PuzzleTarget,
): QuestPuzzle | undefined =>
  quest.puzzles.find(
    ({ at }) => at.kind === target.kind && at.id === target.id,
  );

/**
 * Whether a Puzzle can be solved now: it isn't solved yet and the Find
 * it needs is in the rucksack.
 */
export const canSolvePuzzle = (
  quest: IslandQuest,
  progress: Pick<QuestProgress, "pickedUpFindIds" | "solvedPuzzleIds">,
  puzzle: QuestPuzzle,
): boolean =>
  !progress.solvedPuzzleIds.includes(puzzle.id) &&
  listHeldFindIds(quest, progress).includes(puzzle.needs);

/**
 * Whether a Child could get on with a Puzzle now: its Find is in the
 * rucksack, or still lying on the Island to be picked up.
 */
export const isPuzzleWithinReach = (
  quest: IslandQuest,
  progress: Pick<QuestProgress, "pickedUpFindIds" | "solvedPuzzleIds">,
  puzzle: QuestPuzzle,
): boolean =>
  !progress.solvedPuzzleIds.includes(puzzle.id) &&
  (listHeldFindIds(quest, progress).includes(puzzle.needs) ||
    (quest.lyingFindIds.includes(puzzle.needs) &&
      !progress.pickedUpFindIds.includes(puzzle.needs)));

const findRepeatedId = (ids: readonly string[]): string | undefined =>
  ids.find((id, position) => ids.indexOf(id) !== position);

const assertCount = (
  quest: IslandQuest,
  what: string,
  count: number,
  wanted: number,
) => {
  if (count !== wanted) {
    throw new InvalidIslandQuestError(
      `The Quest on ${quest.islandId} has ${String(count)} ${what}, not ${String(wanted)}`,
    );
  }
};

const assertUniqueIds = (quest: IslandQuest, what: string, ids: string[]) => {
  const repeat = findRepeatedId(ids);
  if (repeat !== undefined) {
    throw new InvalidIslandQuestError(
      `The Quest on ${quest.islandId} has two ${what} called "${repeat}"`,
    );
  }
};

const assertEveryPuzzleSolvable = (quest: IslandQuest) => {
  const progress: QuestProgress = {
    islandId: quest.islandId,
    pickedUpFindIds: [...quest.lyingFindIds],
    solvedPuzzleIds: [],
  };
  let solvable = quest.puzzles.find((puzzle) =>
    canSolvePuzzle(quest, progress, puzzle),
  );
  while (solvable !== undefined) {
    progress.solvedPuzzleIds.push(solvable.id);
    solvable = quest.puzzles.find((puzzle) =>
      canSolvePuzzle(quest, progress, puzzle),
    );
  }
  const stuck = quest.puzzles.find(
    ({ id }) => !progress.solvedPuzzleIds.includes(id),
  );
  if (stuck !== undefined) {
    throw new InvalidIslandQuestError(
      `The Quest on ${quest.islandId} can't be finished: nothing gives "${stuck.needs}" for ${stuck.id}`,
    );
  }
};

/**
 * Checks a Quest holds together: thirty Finds, ten Islanders, twenty
 * things and thirty Puzzles, one on each Islander and thing; every Find
 * used exactly once, and either lying on the Island or given by exactly
 * one Puzzle; every Puzzle that gives nothing finished with a question;
 * every Islander giving a hint; and every Puzzle solvable in some order.
 */
export const checkIslandQuest = (quest: IslandQuest): void => {
  assertCount(quest, "Finds", quest.finds.length, findsPerQuest);
  assertCount(quest, "Islanders", quest.islanders.length, islandersPerQuest);
  assertCount(quest, "things", quest.things.length, thingsPerQuest);
  assertCount(quest, "Puzzles", quest.puzzles.length, puzzlesPerQuest);
  assertCount(
    quest,
    "Finds lying on the Island",
    quest.lyingFindIds.length,
    lyingFindsPerQuest,
  );
  assertUniqueIds(
    quest,
    "Finds",
    quest.finds.map(({ id }) => id),
  );
  assertUniqueIds(quest, "Islanders, things or Puzzles", [
    ...quest.islanders.map(({ id }) => id),
    ...quest.things.map(({ id }) => id),
    ...quest.puzzles.map(({ id }) => id),
  ]);
  const findIds = new Set(quest.finds.map(({ id }) => id));
  const islanderIds = new Set(quest.islanders.map(({ id }) => id));
  const thingIds = new Set(quest.things.map(({ id }) => id));
  const prefix = `${quest.islandId}.`;
  for (const id of [
    ...findIds,
    ...islanderIds,
    ...thingIds,
    ...quest.puzzles.map((puzzle) => puzzle.id),
  ]) {
    if (!id.startsWith(prefix)) {
      throw new InvalidIslandQuestError(
        `"${id}" on ${quest.islandId} must start with "${prefix}"`,
      );
    }
  }
  for (const id of quest.lyingFindIds) {
    if (!findIds.has(id)) {
      throw new InvalidIslandQuestError(
        `The Quest on ${quest.islandId} has "${id}" lying about, which isn't one of its Finds`,
      );
    }
  }
  assertUniqueIds(quest, "targets for Puzzles", [
    ...quest.puzzles.map(({ at }) => `${at.kind}:${at.id}`),
  ]);
  for (const puzzle of quest.puzzles) {
    const targets = puzzle.at.kind === "islander" ? islanderIds : thingIds;
    if (!targets.has(puzzle.at.id)) {
      throw new InvalidIslandQuestError(
        `${puzzle.id} is at "${puzzle.at.id}", which isn't one of the Quest's ${puzzle.at.kind}s`,
      );
    }
    if (!islanderIds.has(puzzle.hintBy)) {
      throw new InvalidIslandQuestError(
        `${puzzle.id} is hinted at by "${puzzle.hintBy}", who isn't one of the Quest's Islanders`,
      );
    }
    for (const findId of [puzzle.needs, puzzle.gives ?? puzzle.needs]) {
      if (!findIds.has(findId)) {
        throw new InvalidIslandQuestError(
          `${puzzle.id} names "${findId}", which isn't one of the Quest's Finds`,
        );
      }
    }
    if (puzzle.gives === undefined && puzzle.question === undefined) {
      throw new InvalidIslandQuestError(
        `${puzzle.id} gives nothing, so it must finish with a question`,
      );
    }
    if (
      puzzle.question !== undefined &&
      (new Set(puzzle.question.choices).size !== 3 ||
        puzzle.question.curriculumLink.trim() === "")
    ) {
      throw new InvalidIslandQuestError(
        `${puzzle.id}'s question needs three different choices and a curriculum link`,
      );
    }
  }
  const thingTargets = quest.puzzles.filter(({ at }) => at.kind === "thing");
  assertCount(quest, "Puzzles on things", thingTargets.length, thingsPerQuest);
  assertUniqueIds(
    quest,
    "Puzzles needing one Find",
    quest.puzzles.map(({ needs }) => needs),
  );
  const givenIds = quest.puzzles.flatMap(({ gives }) =>
    gives === undefined ? [] : [gives],
  );
  assertUniqueIds(quest, "Puzzles giving one Find", givenIds);
  const lyingAndGiven = givenIds.find((id) => quest.lyingFindIds.includes(id));
  if (lyingAndGiven !== undefined) {
    throw new InvalidIslandQuestError(
      `"${lyingAndGiven}" on ${quest.islandId} is both lying about and given by a Puzzle`,
    );
  }
  const silentIslander = quest.islanders.find(
    ({ id }) => !quest.puzzles.some(({ hintBy }) => hintBy === id),
  );
  if (silentIslander !== undefined) {
    throw new InvalidIslandQuestError(`${silentIslander.id} gives no hints`);
  }
  assertEveryPuzzleSolvable(quest);
};
