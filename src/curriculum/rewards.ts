import {
  catalogue,
  findItem,
  isItemInSeason,
  wearableSlots,
  type CharacterLoadout,
  type Item,
  type ItemSlot,
  type RoomLoadout,
} from "./catalogue.js";
import { InvalidCurriculumFileError, readFields } from "./curriculum-file.js";
import {
  buildPracticeDay,
  findMasteryStateFromGoodDays,
  isGoodDay,
  isMasteredState,
  type MasteryState,
  type PracticeDay,
  type PracticeEvent,
} from "./mastery.js";
import {
  canSolvePuzzle,
  findQuestProgress,
  isQuestComplete,
  islandQuests,
  type IslandQuest,
  type QuestProgress,
} from "./island-quests.js";
import rewardsFile from "./rewards.json" with { type: "json" };
import { skills, type Skill } from "./skills.js";
import {
  findRegionKey,
  hasEveryGameOpen,
  worldMap,
  type GamePlace,
  type Region,
} from "./world-map.js";

export interface RewardRules {
  starsPerActivityFinished: number;
  masteryBonusStars: number;
  familyChestActivities: number;
  starsPerGameUnlock: number;
  starsPerQuest: number;
}

export interface ItemPurchase {
  kind: "item-bought";
  childId: string;
  itemId: string;
  localDate: string;
  giftForChildId: string | null;
}

export interface CharacterDressing {
  kind: "character-dressed";
  childId: string;
  loadout: CharacterLoadout;
}

export type PracticeRecord = PracticeEvent & {
  childId: string;
  place?: GamePlace;
};

export interface OutfitSaving {
  kind: "outfit-saved";
  childId: string;
  outfitId: string;
  name: string;
  loadout: CharacterLoadout;
}

export interface OutfitWearing {
  kind: "outfit-worn";
  childId: string;
  outfitId: string;
}

export interface RoomFurnishing {
  kind: "room-furnished";
  childId: string;
  room: RoomLoadout;
}

/** A Find picked up from where it lay on an Island (ADR 0058). */
export interface QuestFindPickUp {
  kind: "quest-find-picked-up";
  childId: string;
  islandId: string;
  findId: string;
}

/** A Quest Puzzle solved, using up the Find it needs (ADR 0058). */
export interface QuestPuzzleSolving {
  kind: "quest-puzzle-solved";
  childId: string;
  islandId: string;
  puzzleId: string;
}

export const mostStarsInOneAward = 1000;

export const mostCoinsInOneAward = 1000;

/** The Stars a Parent can give a Child at once from the Awards page (ADR 0063). */
export const parentStarAwardSizes = [5, 10, 15] as const;

export type ParentStarAwardSize = (typeof parentStarAwardSizes)[number];

/** The most Stars a Child's Parents can give them, between them, in one day (ADR 0063). */
export const mostParentStarsADay = 15;

export interface StarAward {
  kind: "stars-awarded";
  childId: string;
  stars: number;
}

export interface FamilyChestCoinAward {
  kind: "family-chest-coins-awarded";
  coins: number;
}

export type PlayRecord =
  | PracticeRecord
  | ItemPurchase
  | CharacterDressing
  | OutfitSaving
  | OutfitWearing
  | RoomFurnishing
  | QuestFindPickUp
  | QuestPuzzleSolving
  | StarAward
  | FamilyChestCoinAward;

export interface Outfit {
  id: string;
  name: string;
  loadout: CharacterLoadout;
}

export const mostOutfits = 6;

export const longestOutfitName = 30;

export interface RegionProgress {
  islandId: string;
  regionId: string;
  unlockedGameIds: string[];
  starsSinceUnlock: number;
  starsEarned: number;
}

export interface Trophy {
  islandId: string;
  regionId: string;
}

const isStarCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

export const isRegionProgress = (value: unknown): value is RegionProgress =>
  typeof value === "object" &&
  value !== null &&
  "islandId" in value &&
  typeof value.islandId === "string" &&
  "regionId" in value &&
  typeof value.regionId === "string" &&
  "unlockedGameIds" in value &&
  Array.isArray(value.unlockedGameIds) &&
  value.unlockedGameIds.every((gameId) => typeof gameId === "string") &&
  "starsSinceUnlock" in value &&
  isStarCount(value.starsSinceUnlock) &&
  "starsEarned" in value &&
  isStarCount(value.starsEarned);

export interface ChildRewards {
  childId: string;
  stars: number;
  heldItemIds: string[];
  loadout: CharacterLoadout;
  room: RoomLoadout;
  outfits: Outfit[];
  masteryBonusSkillIds: string[];
  lastPlayedDate: string | null;
  practiceDays: PracticeDay[];
  regionProgress: RegionProgress[];
  questProgress: QuestProgress[];
}

export interface FamilyRewards {
  children: ChildRewards[];
  familyChestActivityCount: number;
}

export interface RewardParts {
  skills: readonly Skill[];
  items: readonly Item[];
  rules: RewardRules;
  regions: readonly Region[];
  quests?: readonly IslandQuest[];
}

export type PurchaseProblem =
  | "not-for-sale"
  | "already-held"
  | "skill-not-mastered"
  | "out-of-season"
  | "gift-only"
  | "gifts-are-for-siblings";

interface PlayingChildRewards {
  childId: string;
  stars: number;
  heldItemIds: Set<string>;
  loadout: CharacterLoadout;
  room: RoomLoadout;
  outfits: Outfit[];
  masteryBonusSkillIds: Set<string>;
  lastPlayedDate: string | null;
  practiceBySkill: Map<string, SkillPractice>;
  progressByRegion: Map<string, PlayingRegionProgress>;
  questProgress: QuestProgress[];
}

// One Skill's practice, kept so adding a day costs the same however long the history is: each day once, its dates in
// order, and apart from them the dates whose practice counts towards Mastery, which alone decide its schedule. A day's
// combined counts only grow, so the earliest day with a question only moves earlier (pen test F4, #319).
interface SkillPractice {
  daysByDate: Map<string, PracticeDay>;
  dates: string[];
  goodDates: string[];
  earliestQuestionDate: string | null;
}

interface PlayingRegionProgress {
  unlockedGameIds: Set<string>;
  starsSinceUnlock: number;
  starsEarned: number;
}

const ruleFields = [
  "starsPerActivityFinished",
  "masteryBonusStars",
  "familyChestActivities",
  "starsPerGameUnlock",
  "starsPerQuest",
] as const;

export const parseRewardRules = (rewardsContent: unknown): RewardRules => {
  const fields = readFields(rewardsContent, ruleFields, "The reward rules");
  const [
    starsPerActivityFinished,
    masteryBonusStars,
    familyChestActivities,
    starsPerGameUnlock,
    starsPerQuest,
  ] = ruleFields.map((field) => {
    const value = fields.get(field);
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      throw new InvalidCurriculumFileError(
        `The reward rules need ${field} as a whole number above 0`,
      );
    }
    return value;
  });
  return {
    starsPerActivityFinished,
    masteryBonusStars,
    familyChestActivities,
    starsPerGameUnlock,
    starsPerQuest,
  };
};

export const rewardRules = parseRewardRules(rewardsFile);

const launchRewardParts: RewardParts = {
  skills,
  items: catalogue,
  rules: rewardRules,
  regions: worldMap.regions,
  quests: islandQuests,
};

const findFirstGameId = (region: Region): string[] =>
  region.games.slice(0, 1).map(({ id }) => id);

// Games a Child has already played stay unlocked when Islands ship
// (ADR 0025), so their Region's progress starts with them.
export const buildKeptRegionProgress = (
  keptGamePlaces: readonly GamePlace[],
  regions: readonly Region[] = worldMap.regions,
): RegionProgress[] =>
  regions.flatMap((region) => {
    const keptGameIds = new Set(
      keptGamePlaces
        .filter(
          ({ islandId, regionId }) =>
            islandId === region.islandId && regionId === region.id,
        )
        .map(({ gameId }) => gameId),
    );
    if (keptGameIds.size === 0) {
      return [];
    }
    const unlockedGameIds = new Set([
      ...findFirstGameId(region),
      ...keptGameIds,
    ]);
    return [
      {
        islandId: region.islandId,
        regionId: region.id,
        unlockedGameIds: region.games
          .map(({ id }) => id)
          .filter((id) => unlockedGameIds.has(id)),
        starsSinceUnlock: 0,
        starsEarned: 0,
      },
    ];
  });

export const buildStartingChildRewards = (
  childId: string,
  loadout: CharacterLoadout = {},
  regionProgress: RegionProgress[] = [],
): ChildRewards => ({
  childId,
  stars: 0,
  heldItemIds: [],
  loadout,
  room: {},
  outfits: [],
  masteryBonusSkillIds: [],
  lastPlayedDate: null,
  practiceDays: [],
  regionProgress,
  questProgress: [],
});

export const isItemHeld = (
  { heldItemIds }: Pick<ChildRewards, "heldItemIds">,
  item: Item,
): boolean => item.unlock.kind === "starter" || heldItemIds.includes(item.id);

interface PurchaseQuestion {
  buyer: Pick<ChildRewards, "childId" | "heldItemIds" | "masteryBonusSkillIds">;
  recipient: Pick<ChildRewards, "childId" | "heldItemIds"> | undefined;
  item: Item;
  localDate: string;
}

export const findPurchaseProblem = ({
  buyer,
  recipient,
  item,
  localDate,
}: PurchaseQuestion): PurchaseProblem | undefined => {
  const { unlock } = item;
  if (item.starCost === null) {
    return "not-for-sale";
  }
  if (unlock.kind === "gift") {
    if (recipient === undefined) {
      return "gift-only";
    }
    if (recipient.childId === buyer.childId) {
      return "gifts-are-for-siblings";
    }
  } else if (recipient !== undefined) {
    return "gift-only";
  }
  if (isItemHeld(recipient ?? buyer, item)) {
    return "already-held";
  }
  if (
    unlock.kind === "skill-mastered" &&
    !buyer.masteryBonusSkillIds.includes(unlock.skillId)
  ) {
    return "skill-not-mastered";
  }
  if (!isItemInSeason(item, localDate)) {
    return "out-of-season";
  }
  return undefined;
};

// Where localDate goes among dates, oldest first: after every date before it, and on it if it is there already.
const findDateIndex = (dates: readonly string[], localDate: string): number => {
  let low = 0;
  let high = dates.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (dates[middle] < localDate) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

const insertDate = (dates: string[], localDate: string): void => {
  const index = findDateIndex(dates, localDate);
  if (dates[index] !== localDate) {
    dates.splice(index, 0, localDate);
  }
};

const removeDate = (dates: string[], localDate: string): void => {
  const index = findDateIndex(dates, localDate);
  if (dates[index] === localDate) {
    dates.splice(index, 1);
  }
};

const addPracticeDay = (
  practiceBySkill: Map<string, SkillPractice>,
  practiceDay: PracticeDay,
  skill: Skill | undefined,
): void => {
  const { skillId, localDate } = practiceDay;
  let practice = practiceBySkill.get(skillId);
  if (practice === undefined) {
    practice = {
      daysByDate: new Map(),
      dates: [],
      goodDates: [],
      earliestQuestionDate: null,
    };
    practiceBySkill.set(skillId, practice);
  }
  const sameDay = practice.daysByDate.get(localDate);
  const combined =
    sameDay === undefined
      ? { ...practiceDay }
      : {
          ...sameDay,
          questionCount: sameDay.questionCount + practiceDay.questionCount,
          rightFirstTimeCount:
            sameDay.rightFirstTimeCount + practiceDay.rightFirstTimeCount,
          secondsSpent: sameDay.secondsSpent + practiceDay.secondsSpent,
        };
  practice.daysByDate.set(localDate, combined);
  if (sameDay === undefined) {
    insertDate(practice.dates, localDate);
  }
  if (
    combined.questionCount > 0 &&
    (practice.earliestQuestionDate === null ||
      localDate < practice.earliestQuestionDate)
  ) {
    practice.earliestQuestionDate = localDate;
  }
  // A Skill the curriculum doesn't know has no Mastery rule, so its good days are never asked for.
  if (skill !== undefined) {
    const { percentCorrect } = skill.masteryRule;
    const wasGood = sameDay !== undefined && isGoodDay(sameDay, percentCorrect);
    const isGood = isGoodDay(combined, percentCorrect);
    if (isGood && !wasGood) {
      insertDate(practice.goodDates, localDate);
    } else if (wasGood && !isGood) {
      removeDate(practice.goodDates, localDate);
    }
  }
};

const startPlayingChildRewards = (
  childRewards: ChildRewards,
  skillsById: ReadonlyMap<string, Skill>,
): PlayingChildRewards => {
  const practiceBySkill = new Map<string, SkillPractice>();
  // Combined as they are added, so days already in order, as a replay leaves them, go in without sorting again.
  for (const practiceDay of childRewards.practiceDays) {
    addPracticeDay(
      practiceBySkill,
      practiceDay,
      skillsById.get(practiceDay.skillId),
    );
  }
  return {
    childId: childRewards.childId,
    stars: childRewards.stars,
    heldItemIds: new Set(childRewards.heldItemIds),
    loadout: childRewards.loadout,
    room: childRewards.room,
    outfits: childRewards.outfits,
    masteryBonusSkillIds: new Set(childRewards.masteryBonusSkillIds),
    lastPlayedDate: childRewards.lastPlayedDate,
    practiceBySkill,
    progressByRegion: new Map(
      childRewards.regionProgress.map((progress) => [
        findRegionKey({ islandId: progress.islandId, id: progress.regionId }),
        {
          unlockedGameIds: new Set(progress.unlockedGameIds),
          starsSinceUnlock: progress.starsSinceUnlock,
          starsEarned: progress.starsEarned,
        },
      ]),
    ),
    questProgress: childRewards.questProgress.map((progress) => ({
      islandId: progress.islandId,
      pickedUpFindIds: [...progress.pickedUpFindIds],
      solvedPuzzleIds: [...progress.solvedPuzzleIds],
    })),
  };
};

// The same state buildSkillMastery gives for the Skill's days, or its days before today, from the good days alone.
const findSkillState = (
  child: PlayingChildRewards,
  skill: Skill,
  today: string,
  isTodayLeftOut: boolean,
): MasteryState => {
  const practice = child.practiceBySkill.get(skill.id);
  if (practice === undefined) {
    return findMasteryStateFromGoodDays([], 0, false, skill.masteryRule, today);
  }
  const { goodDates, earliestQuestionDate } = practice;
  return isTodayLeftOut
    ? findMasteryStateFromGoodDays(
        goodDates,
        findDateIndex(goodDates, today),
        earliestQuestionDate !== null && earliestQuestionDate < today,
        skill.masteryRule,
        today,
      )
    : findMasteryStateFromGoodDays(
        goodDates,
        goodDates.length,
        earliestQuestionDate !== null,
        skill.masteryRule,
        today,
      );
};

// Every Skill's days, by Skill and then by date, as combinePracticeDays orders them, without sorting them again.
const listPracticeDays = (
  practiceBySkill: ReadonlyMap<string, SkillPractice>,
): PracticeDay[] =>
  [...practiceBySkill.keys()]
    .toSorted((first, second) => first.localeCompare(second))
    .flatMap((skillId) => {
      const practice = practiceBySkill.get(skillId);
      return practice === undefined
        ? []
        : practice.dates.flatMap((localDate) => {
            const practiceDay = practice.daysByDate.get(localDate);
            return practiceDay === undefined ? [] : [{ ...practiceDay }];
          });
    });

const giveFirstItemNotHeld = (
  child: PlayingChildRewards,
  unlockKind: Item["unlock"]["kind"],
  items: readonly Item[],
): void => {
  const item = items.find(
    ({ id, unlock }) =>
      unlock.kind === unlockKind && !child.heldItemIds.has(id),
  );
  if (item !== undefined) {
    child.heldItemIds.add(item.id);
  }
};

const buildFinishedRegionProgress = (
  child: PlayingChildRewards,
  regions: readonly Region[],
): RegionProgress[] =>
  regions.flatMap((region) => {
    const progress = child.progressByRegion.get(findRegionKey(region));
    return progress === undefined
      ? []
      : [
          {
            islandId: region.islandId,
            regionId: region.id,
            unlockedGameIds: region.games
              .map(({ id }) => id)
              .filter((id) => progress.unlockedGameIds.has(id)),
            starsSinceUnlock: progress.starsSinceUnlock,
            starsEarned: progress.starsEarned,
          },
        ];
  });

const buildFinishedChildRewards = (
  child: PlayingChildRewards,
  { items, regions }: Pick<RewardParts, "items" | "regions">,
): ChildRewards => ({
  childId: child.childId,
  stars: child.stars,
  heldItemIds: items
    .filter(({ id }) => child.heldItemIds.has(id))
    .map(({ id }) => id),
  loadout: child.loadout,
  room: child.room,
  outfits: child.outfits,
  masteryBonusSkillIds: [...child.masteryBonusSkillIds].toSorted(),
  lastPlayedDate: child.lastPlayedDate,
  practiceDays: listPracticeDays(child.practiceBySkill),
  regionProgress: buildFinishedRegionProgress(child, regions),
  questProgress: child.questProgress,
});

const listHeldChoices = (
  child: PlayingChildRewards,
  choices: Partial<Record<ItemSlot, string>>,
  items: readonly Item[],
): [string, string][] =>
  Object.entries(choices).flatMap(([slot, itemId]): [string, string][] => {
    const item = findItem(itemId, items);
    return item?.slot === slot &&
      (item.unlock.kind === "starter" || child.heldItemIds.has(item.id))
      ? [[slot, item.id]]
      : [];
  });

const buildHeldLoadout = (
  child: PlayingChildRewards,
  loadout: CharacterLoadout,
  items: readonly Item[],
): CharacterLoadout =>
  Object.fromEntries(listHeldChoices(child, loadout, items));

const buildHeldRoom = (
  child: PlayingChildRewards,
  room: RoomLoadout,
  items: readonly Item[],
): RoomLoadout => Object.fromEntries(listHeldChoices(child, room, items));

const isWearableSlot = (slot: string): boolean =>
  wearableSlots.some((wearableSlot) => wearableSlot === slot);

const buildOutfitLoadout = (
  loadout: CharacterLoadout,
  items: readonly Item[],
): CharacterLoadout =>
  Object.fromEntries(
    Object.entries(loadout).filter(
      ([slot, itemId]) =>
        isWearableSlot(slot) && findItem(itemId, items)?.slot === slot,
    ),
  );

const saveOutfit = (
  child: PlayingChildRewards,
  { outfitId, name, loadout }: OutfitSaving,
  items: readonly Item[],
): void => {
  const outfit = {
    id: outfitId,
    name: name.trim().slice(0, longestOutfitName),
    loadout: buildOutfitLoadout(loadout, items),
  };
  if (outfit.name === "") {
    return;
  }
  if (child.outfits.some(({ id }) => id === outfitId)) {
    child.outfits = child.outfits.map((saved) =>
      saved.id === outfitId ? outfit : saved,
    );
  } else if (child.outfits.length < mostOutfits) {
    child.outfits = [...child.outfits, outfit];
  }
};

export const buildWornLoadout = (
  loadout: CharacterLoadout,
  outfit: Outfit,
  isHeld: (item: Item) => boolean,
  items: readonly Item[] = catalogue,
): CharacterLoadout => {
  const featureLoadout = Object.entries(loadout).filter(
    ([slot]) => !isWearableSlot(slot),
  );
  const wornLoadout = wearableSlots.flatMap((slot): [string, string][] => {
    const outfitItem = findItem(outfit.loadout[slot] ?? "", items);
    if (outfitItem === undefined) {
      return [];
    }
    const itemId =
      outfitItem.slot === slot && isHeld(outfitItem)
        ? outfitItem.id
        : loadout[slot];
    return itemId === undefined ? [] : [[slot, itemId]];
  });
  return Object.fromEntries([...featureLoadout, ...wornLoadout]);
};

const wearOutfit = (
  child: PlayingChildRewards,
  { outfitId }: OutfitWearing,
  items: readonly Item[],
): void => {
  const outfit = child.outfits.find(({ id }) => id === outfitId);
  if (outfit !== undefined) {
    child.loadout = buildWornLoadout(
      child.loadout,
      outfit,
      (item) =>
        item.unlock.kind === "starter" || child.heldItemIds.has(item.id),
      items,
    );
  }
};

const buildPurchaseView = (child: PlayingChildRewards) => ({
  childId: child.childId,
  heldItemIds: [...child.heldItemIds],
  masteryBonusSkillIds: [...child.masteryBonusSkillIds],
});

export const applyPlayRecords = (
  familyRewards: FamilyRewards,
  playRecords: readonly PlayRecord[],
  rewardParts: RewardParts = launchRewardParts,
): FamilyRewards => {
  const {
    skills: knownSkills,
    items,
    rules,
    regions,
    quests = islandQuests,
  } = rewardParts;
  const skillsById = new Map(knownSkills.map((skill) => [skill.id, skill]));
  const children = new Map(
    familyRewards.children.map((childRewards) => [
      childRewards.childId,
      startPlayingChildRewards(childRewards, skillsById),
    ]),
  );
  const regionsByKey = new Map(
    regions.map((region) => [findRegionKey(region), region]),
  );
  let familyChestActivityCount = familyRewards.familyChestActivityCount;

  const findPlayedRegion = (place: GamePlace | undefined) => {
    const region =
      place === undefined
        ? undefined
        : regionsByKey.get(
            findRegionKey({ islandId: place.islandId, id: place.regionId }),
          );
    return region === undefined || hasEveryGameOpen(region)
      ? undefined
      : region;
  };

  const findRegionProgress = (
    child: PlayingChildRewards,
    region: Region,
  ): PlayingRegionProgress => {
    const regionKey = findRegionKey(region);
    const progress = child.progressByRegion.get(regionKey) ?? {
      unlockedGameIds: new Set(findFirstGameId(region)),
      starsSinceUnlock: 0,
      starsEarned: 0,
    };
    child.progressByRegion.set(regionKey, progress);
    return progress;
  };

  const earnStarsIn = (
    child: PlayingChildRewards,
    place: GamePlace | undefined,
    stars: number,
  ) => {
    const region = findPlayedRegion(place);
    if (region === undefined) {
      return;
    }
    const progress = findRegionProgress(child, region);
    progress.starsSinceUnlock += stars;
    progress.starsEarned += stars;
    let nextGame = region.games.find(
      ({ id }) => !progress.unlockedGameIds.has(id),
    );
    while (
      nextGame !== undefined &&
      progress.starsSinceUnlock >= rules.starsPerGameUnlock
    ) {
      progress.unlockedGameIds.add(nextGame.id);
      progress.starsSinceUnlock -= rules.starsPerGameUnlock;
      nextGame = region.games.find(
        ({ id }) => !progress.unlockedGameIds.has(id),
      );
    }
  };

  // A Mastered Game earns no Stars, so finishing an Activity in it opens the
  // Game after it straight away, or the Region would stop there.
  const unlockGameAfter = (
    child: PlayingChildRewards,
    place: GamePlace | undefined,
  ) => {
    const region = findPlayedRegion(place);
    if (region === undefined || place === undefined) {
      return;
    }
    const playedIndex = region.games.findIndex(({ id }) => id === place.gameId);
    const nextGame =
      playedIndex < 0 ? undefined : region.games[playedIndex + 1];
    const progress = findRegionProgress(child, region);
    if (nextGame === undefined || progress.unlockedGameIds.has(nextGame.id)) {
      return;
    }
    progress.unlockedGameIds.add(nextGame.id);
    progress.starsSinceUnlock = 0;
  };

  const answerQuestion = (
    child: PlayingChildRewards,
    practiceEvent: PracticeRecord,
  ) => {
    const skill = skillsById.get(practiceEvent.skillId);
    addPracticeDay(
      child.practiceBySkill,
      buildPracticeDay(practiceEvent),
      skill,
    );
    if (
      skill === undefined ||
      child.masteryBonusSkillIds.has(skill.id) ||
      !isMasteredState(
        findSkillState(child, skill, practiceEvent.localDate, false),
      )
    ) {
      return;
    }
    child.masteryBonusSkillIds.add(skill.id);
    child.stars += rules.masteryBonusStars;
    earnStarsIn(child, practiceEvent.place, rules.masteryBonusStars);
  };

  const fillFamilyChestBy = (activityCount: number) => {
    familyChestActivityCount += activityCount;
    if (familyChestActivityCount < rules.familyChestActivities) {
      return;
    }
    familyChestActivityCount = 0;
    for (const sibling of children.values()) {
      giveFirstItemNotHeld(sibling, "family-chest", items);
    }
  };

  const finishActivity = (
    child: PlayingChildRewards,
    practiceEvent: PracticeRecord,
  ) => {
    const { skillId, localDate } = practiceEvent;
    const skill = skillsById.get(skillId);
    const stateBeforeToday =
      skill === undefined
        ? "not-started"
        : findSkillState(child, skill, localDate, true);
    if (stateBeforeToday === "mastered") {
      unlockGameAfter(child, practiceEvent.place);
    } else {
      child.stars += rules.starsPerActivityFinished;
      earnStarsIn(child, practiceEvent.place, rules.starsPerActivityFinished);
    }
    addPracticeDay(
      child.practiceBySkill,
      buildPracticeDay(practiceEvent),
      skill,
    );
    if (child.lastPlayedDate !== null && localDate > child.lastPlayedDate) {
      giveFirstItemNotHeld(child, "welcome-back", items);
    }
    if (child.lastPlayedDate === null || localDate > child.lastPlayedDate) {
      child.lastPlayedDate = localDate;
    }
    fillFamilyChestBy(1);
  };

  const buyItem = (buyer: PlayingChildRewards, purchase: ItemPurchase) => {
    const item = findItem(purchase.itemId, items);
    const recipient =
      purchase.giftForChildId === null
        ? undefined
        : children.get(purchase.giftForChildId);
    if (
      item === undefined ||
      item.starCost === null ||
      (purchase.giftForChildId !== null && recipient === undefined) ||
      findPurchaseProblem({
        buyer: buildPurchaseView(buyer),
        recipient:
          recipient === undefined ? undefined : buildPurchaseView(recipient),
        item,
        localDate: purchase.localDate,
      }) !== undefined
    ) {
      return;
    }
    buyer.stars = Math.max(0, buyer.stars - item.starCost);
    (recipient ?? buyer).heldItemIds.add(item.id);
  };

  const findPlayingQuestProgress = (
    child: PlayingChildRewards,
    islandId: string,
  ): QuestProgress => {
    const known = child.questProgress.find(
      (progress) => progress.islandId === islandId,
    );
    if (known !== undefined) {
      return known;
    }
    const started = findQuestProgress([], islandId);
    child.questProgress.push(started);
    return started;
  };

  // A Find counts only if it lies on that Island and isn't picked up yet.
  const pickUpFind = (
    child: PlayingChildRewards,
    { islandId, findId }: QuestFindPickUp,
  ) => {
    const quest = quests.find((candidate) => candidate.islandId === islandId);
    if (quest?.lyingFindIds.includes(findId) !== true) {
      return;
    }
    const progress = findPlayingQuestProgress(child, islandId);
    if (!progress.pickedUpFindIds.includes(findId)) {
      progress.pickedUpFindIds.push(findId);
    }
  };

  // A Puzzle counts only if the Child holds the Find it needs, and the
  // last of an Island's thirty earns the Quest's Stars, once.
  const solvePuzzle = (
    child: PlayingChildRewards,
    { islandId, puzzleId }: QuestPuzzleSolving,
  ) => {
    const quest = quests.find((candidate) => candidate.islandId === islandId);
    const puzzle = quest?.puzzles.find(({ id }) => id === puzzleId);
    if (quest === undefined || puzzle === undefined) {
      return;
    }
    const progress = findPlayingQuestProgress(child, islandId);
    if (!canSolvePuzzle(quest, progress, puzzle)) {
      return;
    }
    progress.solvedPuzzleIds.push(puzzle.id);
    if (isQuestComplete(quest, progress)) {
      child.stars += rules.starsPerQuest;
    }
  };

  for (const playRecord of playRecords) {
    if (playRecord.kind === "family-chest-coins-awarded") {
      for (let coin = 0; coin < playRecord.coins; coin += 1) {
        fillFamilyChestBy(1);
      }
      continue;
    }
    const child = children.get(playRecord.childId);
    if (child === undefined) {
      continue;
    }
    switch (playRecord.kind) {
      case "question-answered":
        answerQuestion(child, playRecord);
        break;
      case "activity-finished":
        finishActivity(child, playRecord);
        break;
      case "item-bought":
        buyItem(child, playRecord);
        break;
      case "character-dressed":
        child.loadout = buildHeldLoadout(child, playRecord.loadout, items);
        break;
      case "outfit-saved":
        saveOutfit(child, playRecord, items);
        break;
      case "outfit-worn":
        wearOutfit(child, playRecord, items);
        break;
      case "room-furnished":
        child.room = buildHeldRoom(child, playRecord.room, items);
        break;
      case "quest-find-picked-up":
        pickUpFind(child, playRecord);
        break;
      case "quest-puzzle-solved":
        solvePuzzle(child, playRecord);
        break;
      case "stars-awarded":
        child.stars += playRecord.stars;
        break;
    }
  }

  return {
    children: [...children.values()].map((child) =>
      buildFinishedChildRewards(child, rewardParts),
    ),
    familyChestActivityCount,
  };
};

export const findChildRewards = (
  familyRewards: FamilyRewards,
  childId: string,
): ChildRewards =>
  familyRewards.children.find(
    (childRewards) => childRewards.childId === childId,
  ) ?? buildStartingChildRewards(childId);

export const findTrophyStars = (
  region: Region,
  rules: RewardRules = rewardRules,
): number => rules.starsPerGameUnlock * Math.max(region.games.length - 1, 0);

export const listTrophies = (
  { regionProgress }: Pick<ChildRewards, "regionProgress">,
  {
    regions,
    rules,
  }: Pick<RewardParts, "regions" | "rules"> = launchRewardParts,
): Trophy[] =>
  regions.flatMap((region) => {
    if (hasEveryGameOpen(region) || region.games.length === 0) {
      return [];
    }
    const progress = regionProgress.find(
      ({ islandId, regionId }) =>
        islandId === region.islandId && regionId === region.id,
    );
    return progress !== undefined &&
      progress.starsEarned >= findTrophyStars(region, rules)
      ? [{ islandId: region.islandId, regionId: region.id }]
      : [];
  });

/** An Island whose Quest a Child has finished, and the Trophy it gave them (ADR 0058). */
export interface QuestTrophy {
  islandId: string;
  trophyName: string;
}

export const listQuestTrophies = (
  { questProgress }: Pick<ChildRewards, "questProgress">,
  quests: readonly IslandQuest[] = islandQuests,
): QuestTrophy[] =>
  quests
    .filter((quest) =>
      isQuestComplete(quest, findQuestProgress(questProgress, quest.islandId)),
    )
    .map(({ islandId, trophyName }) => ({ islandId, trophyName }));
