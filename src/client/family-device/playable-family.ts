import { isCharacterSlot, isRoomLoadout } from "../../curriculum/catalogue.js";
import {
  buildChildLimits,
  buildTeacherLocks,
  isChildLimits,
  type ChildLimits,
} from "../../curriculum/island-access.js";
import type { QuestProgress } from "../../curriculum/island-quests.js";
import { isLocalDate, type PracticeDay } from "../../curriculum/mastery.js";
import {
  isRegionProgress,
  type ChildRewards,
  type Outfit,
} from "../../curriculum/rewards.js";
import { isYearGroup, type YearGroup } from "../../curriculum/skills.js";

/** A Child ready to play: they have a Picture Password and a Character. */
export interface PlayableChild {
  id: string;
  characterName: string;
  newPlayerNickname: string | null;
  yearGroup: YearGroup | null;
  picturePasswordHash: string;
  phonicsProgrammeId: string | null;
  classmateVisitsAllowed: boolean;
  limits: ChildLimits;
  rewards: ChildRewards;
}

/** A Child in the Family, who may have been brought in by their School without a Picture Password or Character yet. */
export interface FamilyChild extends Omit<
  PlayableChild,
  "characterName" | "picturePasswordHash"
> {
  characterName: string | null;
  picturePasswordHash: string | null;
}

export interface PlayableFamily {
  playableChildren: FamilyChild[];
  familyChestActivityCount: number;
}

export const isSetUpChild = (child: FamilyChild): child is PlayableChild =>
  child.characterName !== null && child.picturePasswordHash !== null;

export type PlayableFamilyAnswer =
  | { kind: "signed-in"; playableFamily: PlayableFamily }
  | { kind: "signed-out" }
  | { kind: "unreachable" };

export const playableFamilyPath = "/api/play/family";

const playableFamilyStorageKey = "wizzaroo.family-device.playable-family";

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isPracticeDay = (value: unknown): value is PracticeDay =>
  typeof value === "object" &&
  value !== null &&
  "skillId" in value &&
  typeof value.skillId === "string" &&
  "localDate" in value &&
  isLocalDate(value.localDate) &&
  "questionCount" in value &&
  isCount(value.questionCount) &&
  "rightFirstTimeCount" in value &&
  isCount(value.rightFirstTimeCount) &&
  "secondsSpent" in value &&
  isCount(value.secondsSpent);

export const isCharacterLoadout = (
  value: unknown,
): value is ChildRewards["loadout"] =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.entries(value).every(
    ([slot, itemId]) => isCharacterSlot(slot) && typeof itemId === "string",
  );

const isOutfit = (value: unknown): value is Outfit =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string" &&
  "loadout" in value &&
  isCharacterLoadout(value.loadout);

const isChildRewards = (value: unknown): value is ChildRewards =>
  typeof value === "object" &&
  value !== null &&
  "childId" in value &&
  typeof value.childId === "string" &&
  "stars" in value &&
  isCount(value.stars) &&
  "heldItemIds" in value &&
  isStringList(value.heldItemIds) &&
  "loadout" in value &&
  isCharacterLoadout(value.loadout) &&
  "room" in value &&
  isRoomLoadout(value.room) &&
  "outfits" in value &&
  Array.isArray(value.outfits) &&
  value.outfits.every(isOutfit) &&
  "masteryBonusSkillIds" in value &&
  isStringList(value.masteryBonusSkillIds) &&
  "lastPlayedDate" in value &&
  (value.lastPlayedDate === null || isLocalDate(value.lastPlayedDate)) &&
  "practiceDays" in value &&
  Array.isArray(value.practiceDays) &&
  value.practiceDays.every(isPracticeDay) &&
  "regionProgress" in value &&
  Array.isArray(value.regionProgress) &&
  value.regionProgress.every(isRegionProgress) &&
  "questProgress" in value &&
  Array.isArray(value.questProgress) &&
  value.questProgress.every(isQuestProgress);

const isQuestProgress = (value: unknown): value is QuestProgress =>
  typeof value === "object" &&
  value !== null &&
  "islandId" in value &&
  typeof value.islandId === "string" &&
  "pickedUpFindIds" in value &&
  isStringList(value.pickedUpFindIds) &&
  "solvedPuzzleIds" in value &&
  isStringList(value.solvedPuzzleIds);

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isFamilyChild = (value: unknown): value is FamilyChild =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "characterName" in value &&
  isStringOrNull(value.characterName) &&
  "newPlayerNickname" in value &&
  isStringOrNull(value.newPlayerNickname) &&
  "yearGroup" in value &&
  (value.yearGroup === null || isYearGroup(value.yearGroup)) &&
  "picturePasswordHash" in value &&
  isStringOrNull(value.picturePasswordHash) &&
  "phonicsProgrammeId" in value &&
  isStringOrNull(value.phonicsProgrammeId) &&
  "classmateVisitsAllowed" in value &&
  typeof value.classmateVisitsAllowed === "boolean" &&
  "limits" in value &&
  isChildLimits(value.limits) &&
  "rewards" in value &&
  isChildRewards(value.rewards);

const isPlayableFamily = (value: unknown): value is PlayableFamily =>
  typeof value === "object" &&
  value !== null &&
  "playableChildren" in value &&
  Array.isArray(value.playableChildren) &&
  value.playableChildren.every(isFamilyChild) &&
  "familyChestActivityCount" in value &&
  isCount(value.familyChestActivityCount);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readDailyMinutes = (limits: Record<string, unknown>): number | null =>
  isCount(limits.dailyMinutes) ? limits.dailyMinutes : null;

const addMissingLimits = (limits: Record<string, unknown>): unknown => {
  const withNewerLimits = {
    isMusicMuted: false,
    areSoundEffectsMuted: false,
    isCheckClockOff: false,
    isExploringLocked: false,
    exploreLockedIslandIds: [],
    gamesFirstMinutes: null,
    lockedGameKeys: [],
    teacherLocks: buildTeacherLocks({}),
    ...limits,
  };
  return isChildLimits(withNewerLimits)
    ? withNewerLimits
    : buildChildLimits({ dailyMinutes: readDailyMinutes(limits) });
};

const addMissingStarsEarned = (storedProgress: unknown): unknown =>
  isObject(storedProgress)
    ? { starsEarned: 0, ...storedProgress }
    : storedProgress;

const addMissingRewardFields = (rewards: Record<string, unknown>): unknown => {
  const withDefaults = {
    regionProgress: [],
    questProgress: [],
    outfits: [],
    room: {},
    ...rewards,
  };
  return Array.isArray(withDefaults.regionProgress)
    ? {
        ...withDefaults,
        regionProgress: withDefaults.regionProgress.map(addMissingStarsEarned),
      }
    : withDefaults;
};

const addMissingChildFields = (storedChild: unknown): unknown => {
  if (!isObject(storedChild)) {
    return storedChild;
  }
  const { limits, rewards } = storedChild;
  return {
    yearGroup: null,
    newPlayerNickname: null,
    classmateVisitsAllowed: false,
    ...storedChild,
    limits: isObject(limits) ? addMissingLimits(limits) : limits,
    rewards: isObject(rewards) ? addMissingRewardFields(rewards) : rewards,
  };
};

// A Family Device that last synced before a field existed keeps playing
// offline without it: no Year Group to show, the daily limit but no Island
// or Region switches, no Game unlock progress beyond each first Game, the
// starter Room, no Trophies yet and no Classmates' Rooms.
const addMissingFields = (storedFamily: unknown): unknown =>
  isObject(storedFamily) && Array.isArray(storedFamily.playableChildren)
    ? {
        ...storedFamily,
        playableChildren: storedFamily.playableChildren.map(
          addMissingChildFields,
        ),
      }
    : storedFamily;

export const findStoredPlayableFamily = (): PlayableFamily | undefined => {
  const storedPlayableFamily = localStorage.getItem(playableFamilyStorageKey);
  if (storedPlayableFamily === null) {
    return undefined;
  }
  const playableFamily: unknown = addMissingFields(
    JSON.parse(storedPlayableFamily),
  );
  return isPlayableFamily(playableFamily) ? playableFamily : undefined;
};

export const storePlayableFamily = (playableFamily: PlayableFamily): void => {
  localStorage.setItem(
    playableFamilyStorageKey,
    JSON.stringify(playableFamily),
  );
};

export const isFamilyDeviceBrowser = (): boolean =>
  localStorage.getItem(playableFamilyStorageKey) !== null;

export const deleteStoredPlayableFamily = (): void => {
  localStorage.removeItem(playableFamilyStorageKey);
};

export const fetchPlayableFamily = async (): Promise<PlayableFamilyAnswer> => {
  const response = await fetch(playableFamilyPath);
  if (response.status === 401) {
    return { kind: "signed-out" };
  }
  const playableFamily: unknown = response.ok
    ? await response.json()
    : undefined;
  return isPlayableFamily(playableFamily)
    ? { kind: "signed-in", playableFamily }
    : { kind: "unreachable" };
};
