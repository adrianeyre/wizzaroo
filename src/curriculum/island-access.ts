import { rewardRules, type RegionProgress } from "./rewards.js";
import type { YearGroup } from "./skills.js";
import {
  findGameKey,
  findRegionKey,
  hasEveryGameOpen,
  listRegionGames,
  worldMap,
  type Island,
  type Region,
  type RegionGame,
  type WorldMap,
} from "./world-map.js";

export interface TeacherLocks {
  lockedIslandIds: string[];
  turnedOffRegionKeys: string[];
  lockedGameKeys: string[];
}

export const buildTeacherLocks = ({
  lockedIslandIds,
  turnedOffRegionKeys,
  lockedGameKeys,
}: Partial<TeacherLocks>): TeacherLocks => ({
  lockedIslandIds: lockedIslandIds ?? [],
  turnedOffRegionKeys: turnedOffRegionKeys ?? [],
  lockedGameKeys: lockedGameKeys ?? [],
});

export interface ParentChoices {
  dailyMinutes: number | null;
  unlockedIslandIds: string[];
  lockedIslandIds: string[];
  turnedOffRegionKeys: string[];
  openRegionKeys: string[];
  lockedGameKeys: string[];
  isMusicMuted: boolean;
  areSoundEffectsMuted: boolean;
  isCheckClockOff: boolean;
  isExploringLocked: boolean;
  exploreLockedIslandIds: string[];
}

export interface ChildLimits extends ParentChoices {
  teacherLocks: TeacherLocks;
}

export const buildParentChoices = ({
  dailyMinutes,
  unlockedIslandIds,
  lockedIslandIds,
  turnedOffRegionKeys,
  openRegionKeys,
  lockedGameKeys,
  isMusicMuted,
  areSoundEffectsMuted,
  isCheckClockOff,
  isExploringLocked,
  exploreLockedIslandIds,
}: Partial<ParentChoices>): ParentChoices => ({
  dailyMinutes: dailyMinutes ?? null,
  unlockedIslandIds: unlockedIslandIds ?? [],
  lockedIslandIds: lockedIslandIds ?? [],
  turnedOffRegionKeys: turnedOffRegionKeys ?? [],
  openRegionKeys: openRegionKeys ?? [],
  lockedGameKeys: lockedGameKeys ?? [],
  isMusicMuted: isMusicMuted ?? false,
  areSoundEffectsMuted: areSoundEffectsMuted ?? false,
  isCheckClockOff: isCheckClockOff ?? false,
  isExploringLocked: isExploringLocked ?? false,
  exploreLockedIslandIds: exploreLockedIslandIds ?? [],
});

/**
 * Whether a Child may explore `islandId` on foot: exploring isn't locked
 * for them, and a Parent hasn't locked that Island for exploring. Every
 * Island is open for exploring until a Parent locks it.
 */
export const canExploreIsland = (
  {
    isExploringLocked,
    exploreLockedIslandIds,
  }: Pick<ParentChoices, "isExploringLocked" | "exploreLockedIslandIds">,
  islandId: string,
): boolean => !isExploringLocked && !exploreLockedIslandIds.includes(islandId);

export const buildChildLimits = (
  parentChoices: Partial<ParentChoices>,
  teacherLocks: Partial<TeacherLocks> = {},
): ChildLimits => ({
  ...buildParentChoices(parentChoices),
  teacherLocks: buildTeacherLocks(teacherLocks),
});

export type LockOwner = "teacher" | "parent";

const findLockOwner = (
  key: string,
  parentKeys: readonly string[],
  teacherKeys: readonly string[],
): LockOwner | undefined => {
  if (teacherKeys.includes(key)) {
    return "teacher";
  }
  return parentKeys.includes(key) ? "parent" : undefined;
};

export const findRegionTurnOff = (
  { turnedOffRegionKeys, teacherLocks }: ChildLimits,
  region: Pick<Region, "islandId" | "id">,
): LockOwner | undefined =>
  findLockOwner(
    findRegionKey(region),
    turnedOffRegionKeys,
    teacherLocks.turnedOffRegionKeys,
  );

export const findGameLock = (
  {
    lockedGameKeys,
    teacherLocks,
  }: Pick<ChildLimits, "lockedGameKeys" | "teacherLocks">,
  region: Pick<Region, "islandId" | "id">,
  game: Pick<RegionGame, "id">,
): LockOwner | undefined =>
  findLockOwner(
    findGameKey(region, game),
    lockedGameKeys,
    teacherLocks.lockedGameKeys,
  );

export interface IslandOnMap extends Island {
  isHome: boolean;
  isUnlocked: boolean;
  isUnlockedByDefault: boolean;
  isLockedByTeacher: boolean;
}

export type RegionAccess = "open" | "island-locked" | "turned-off";

export interface RegionOnMap extends Region {
  access: RegionAccess;
  isUnlocked: boolean;
}

export interface GameOnMap extends RegionGame {
  isUnlocked: boolean;
  isTurnedOff: boolean;
  starsToUnlock: number;
}

const findPlayingYear = (yearGroup: YearGroup | null): number =>
  yearGroup ?? worldMap.islands[0].yearGroup;

/**
 * An Island's Regions and Games are open by default up to the Child's own
 * Year; the Islands above wait for a Parent to open them early. Every Island
 * can still be travelled to and explored whatever its Year (ADR 0071).
 */
const isOpenByDefault = (
  island: Pick<Island, "yearGroup">,
  yearGroup: YearGroup | null,
): boolean => island.yearGroup <= findPlayingYear(yearGroup);

const isOpenedByParent = (
  { unlockedIslandIds, lockedIslandIds }: ParentChoices,
  islandId: string,
  isUnlockedByDefault: boolean,
): boolean =>
  !lockedIslandIds.includes(islandId) &&
  (isUnlockedByDefault || unlockedIslandIds.includes(islandId));

export const buildIslandsOnMap = (
  yearGroup: YearGroup | null,
  limits: ChildLimits,
  { islands }: WorldMap = worldMap,
): IslandOnMap[] =>
  islands.map((island) => {
    const isLockedByTeacher = limits.teacherLocks.lockedIslandIds.includes(
      island.id,
    );
    const isUnlockedByDefault = isOpenByDefault(island, yearGroup);
    return {
      ...island,
      isHome: island.yearGroup === findPlayingYear(yearGroup),
      isUnlockedByDefault,
      isLockedByTeacher,
      isUnlocked:
        !isLockedByTeacher &&
        isOpenedByParent(limits, island.id, isUnlockedByDefault),
    };
  });

const findRegionAccess = (
  region: Region,
  islands: readonly IslandOnMap[],
  limits: ChildLimits,
): RegionAccess => {
  const island = islands.find(({ id }) => id === region.islandId);
  if (island?.isUnlocked !== true) {
    return "island-locked";
  }
  return findRegionTurnOff(limits, region) === undefined
    ? "open"
    : "turned-off";
};

export const buildRegionsOnMap = (
  islands: readonly IslandOnMap[],
  limits: ChildLimits,
  { regions }: WorldMap = worldMap,
): RegionOnMap[] =>
  regions.map((region) => {
    const access = findRegionAccess(region, islands, limits);
    return { ...region, access, isUnlocked: access === "open" };
  });

const findStartingUnlockedGameIds = (region: Region): string[] =>
  region.games.slice(0, 1).map(({ id }) => id);

const turnedOffGame = {
  isUnlocked: false,
  isTurnedOff: true,
  starsToUnlock: 0,
};

export const listGamesOnMap = (
  region: Region,
  regionProgress: readonly RegionProgress[],
  {
    openRegionKeys,
    lockedGameKeys = [],
    teacherLocks = buildTeacherLocks({}),
  }: Pick<ChildLimits, "openRegionKeys"> &
    Partial<Pick<ChildLimits, "lockedGameKeys" | "teacherLocks">>,
  starsPerGameUnlock: number = rewardRules.starsPerGameUnlock,
): GameOnMap[] => {
  const isTurnedOff = (game: RegionGame) =>
    findGameLock({ lockedGameKeys, teacherLocks }, region, game) !== undefined;
  const progress = regionProgress.find(
    ({ islandId, regionId }) =>
      islandId === region.islandId && regionId === region.id,
  );
  const unlockedGameIds = new Set(
    progress?.unlockedGameIds ?? findStartingUnlockedGameIds(region),
  );
  const isEveryGameOpen =
    hasEveryGameOpen(region) || openRegionKeys.includes(findRegionKey(region));
  let lockedRank = 0;
  const games = region.games.map((game): GameOnMap => {
    if (isTurnedOff(game)) {
      return { ...game, ...turnedOffGame };
    }
    if (isEveryGameOpen || unlockedGameIds.has(game.id)) {
      return {
        ...game,
        isUnlocked: true,
        isTurnedOff: false,
        starsToUnlock: 0,
      };
    }
    lockedRank += 1;
    return {
      ...game,
      isUnlocked: false,
      isTurnedOff: false,
      starsToUnlock:
        lockedRank * starsPerGameUnlock - (progress?.starsSinceUnlock ?? 0),
    };
  });
  return [
    ...games,
    ...region.extraGames.map((game) =>
      isTurnedOff(game)
        ? { ...game, ...turnedOffGame }
        : { ...game, isUnlocked: true, isTurnedOff: false, starsToUnlock: 0 },
    ),
  ];
};

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

export const isTeacherLocks = (value: unknown): value is TeacherLocks =>
  typeof value === "object" &&
  value !== null &&
  "lockedIslandIds" in value &&
  isIdList(value.lockedIslandIds) &&
  "turnedOffRegionKeys" in value &&
  isIdList(value.turnedOffRegionKeys) &&
  "lockedGameKeys" in value &&
  isIdList(value.lockedGameKeys);

export const isParentChoices = (value: unknown): value is ParentChoices =>
  typeof value === "object" &&
  value !== null &&
  "lockedGameKeys" in value &&
  isIdList(value.lockedGameKeys) &&
  "dailyMinutes" in value &&
  (value.dailyMinutes === null ||
    (typeof value.dailyMinutes === "number" &&
      Number.isInteger(value.dailyMinutes) &&
      value.dailyMinutes >= 0)) &&
  "unlockedIslandIds" in value &&
  isIdList(value.unlockedIslandIds) &&
  "lockedIslandIds" in value &&
  isIdList(value.lockedIslandIds) &&
  "turnedOffRegionKeys" in value &&
  isIdList(value.turnedOffRegionKeys) &&
  "openRegionKeys" in value &&
  isIdList(value.openRegionKeys) &&
  "isMusicMuted" in value &&
  typeof value.isMusicMuted === "boolean" &&
  "areSoundEffectsMuted" in value &&
  typeof value.areSoundEffectsMuted === "boolean" &&
  "isCheckClockOff" in value &&
  typeof value.isCheckClockOff === "boolean" &&
  "isExploringLocked" in value &&
  typeof value.isExploringLocked === "boolean" &&
  "exploreLockedIslandIds" in value &&
  isIdList(value.exploreLockedIslandIds);

export const isChildLimits = (value: unknown): value is ChildLimits =>
  isParentChoices(value) &&
  "teacherLocks" in value &&
  isTeacherLocks(value.teacherLocks);

const keepInMapOrder = (ids: ReadonlySet<string>, orderedIds: string[]) =>
  orderedIds.filter((id) => ids.has(id));

const islandIdsInMapOrder = (): string[] =>
  worldMap.islands.map(({ id }) => id);

const regionKeysInMapOrder = (): string[] =>
  worldMap.regions.map(findRegionKey);

const changeIds = (
  ids: readonly string[],
  changedIds: readonly string[],
  isAdded: boolean,
  orderedIds: string[],
): string[] => {
  const changed = new Set(ids);
  for (const id of changedIds) {
    if (isAdded) {
      changed.add(id);
    } else {
      changed.delete(id);
    }
  }
  return keepInMapOrder(changed, orderedIds);
};

// A Parent's Island switch overrides the default: it opens an Island above
// the Child's Year early, or locks one at or below it, and switching it back
// returns the Island to its default.
export const switchIsland = (
  limits: ChildLimits,
  { id, isUnlocked, isUnlockedByDefault }: IslandOnMap,
): ChildLimits => {
  const isOpening = !isUnlocked;
  return {
    ...limits,
    unlockedIslandIds: changeIds(
      limits.unlockedIslandIds,
      [id],
      isOpening && !isUnlockedByDefault,
      islandIdsInMapOrder(),
    ),
    lockedIslandIds: changeIds(
      limits.lockedIslandIds,
      [id],
      !isOpening && isUnlockedByDefault,
      islandIdsInMapOrder(),
    ),
  };
};

export const turnRegionsOn = <
  Locks extends Pick<TeacherLocks, "turnedOffRegionKeys">,
>(
  limits: Locks,
  regions: readonly Pick<Region, "islandId" | "id">[],
  isOn: boolean,
): Locks => ({
  ...limits,
  turnedOffRegionKeys: changeIds(
    limits.turnedOffRegionKeys,
    regions.map(findRegionKey),
    !isOn,
    regionKeysInMapOrder(),
  ),
});

// Opening every Game skips the Star gating without touching the Child's
// unlock progress, so closing them again leaves what they earned.
export const openEveryGame = (
  limits: ChildLimits,
  region: Pick<Region, "islandId" | "id">,
  isOpen: boolean,
): ChildLimits => ({
  ...limits,
  openRegionKeys: changeIds(
    limits.openRegionKeys,
    [findRegionKey(region)],
    isOpen,
    regionKeysInMapOrder(),
  ),
});

const gameKeysInMapOrder = (): string[] =>
  worldMap.regions.flatMap((region) =>
    listRegionGames(region).map((game) => findGameKey(region, game)),
  );

export const lockGames = <Locks extends Pick<TeacherLocks, "lockedGameKeys">>(
  locks: Locks,
  region: Pick<Region, "islandId" | "id">,
  games: readonly Pick<RegionGame, "id">[],
  isLocked: boolean,
): Locks => ({
  ...locks,
  lockedGameKeys: changeIds(
    locks.lockedGameKeys,
    games.map((game) => findGameKey(region, game)),
    isLocked,
    gameKeysInMapOrder(),
  ),
});

export const lockIslandForTeacher = (
  teacherLocks: TeacherLocks,
  islandId: string,
  isLocked: boolean,
): TeacherLocks => ({
  ...teacherLocks,
  lockedIslandIds: changeIds(
    teacherLocks.lockedIslandIds,
    [islandId],
    isLocked,
    islandIdsInMapOrder(),
  ),
});

export const getParentChoices = (limits: ChildLimits): ParentChoices =>
  buildParentChoices(limits);
