import { describe, expect, it } from "vitest";
import {
  buildChildLimits,
  buildIslandsOnMap,
  buildRegionsOnMap,
  findGameLock,
  getParentChoices,
  listGamesOnMap,
  lockGames,
  lockIslandForTeacher,
  openEveryGame,
  switchIsland,
  turnRegionsOn,
} from "./island-access.js";
import {
  applyPlayRecords,
  buildKeptRegionProgress,
  buildStartingChildRewards,
  findTrophyStars,
  listTrophies,
  type ChildRewards,
  type FamilyRewards,
  type PlayRecord,
} from "./rewards.js";
import {
  findRegion,
  listRegionGames,
  worldMap,
  type GamePlace,
  type Region,
} from "./world-map.js";

const sparkleId = "sparkle";
const numberBonds = "maths.number-bonds-10";

const findListedRegion = (islandId: string, regionId: string): Region => {
  const region = findRegion(islandId, regionId);
  if (region === undefined) {
    throw new Error(`there is no Region "${islandId}/${regionId}"`);
  }
  return region;
};

const bubbleBay = findListedRegion("meadow-isle", "bubble-bay");
const [poppingBubbles, fishCount, tenFrames] = bubbleBay.games;
const bubbleBayExtraIds = bubbleBay.extraGames.map(({ id }) => id);

const placeIn = (region: Region, gameIndex = 0): GamePlace => ({
  islandId: region.islandId,
  regionId: region.id,
  gameId: region.games[gameIndex].id,
});

const startFamily = (
  regionProgress: ChildRewards["regionProgress"] = [],
): FamilyRewards => ({
  children: [buildStartingChildRewards(sparkleId, {}, regionProgress)],
  familyChestActivityCount: 0,
});

const playActivity = (
  localDate: string,
  place: GamePlace | undefined,
  skillId = numberBonds,
): PlayRecord[] => [
  ...Array.from({ length: 5 }, (): PlayRecord => ({
    kind: "question-answered",
    childId: sparkleId,
    skillId,
    localDate,
    isRightFirstTime: true,
    place,
  })),
  {
    kind: "activity-finished",
    childId: sparkleId,
    skillId,
    localDate,
    secondsSpent: 60,
    place,
  },
];

const playActivities = (
  count: number,
  localDate: string,
  place: GamePlace | undefined,
  skillId = numberBonds,
): PlayRecord[] =>
  Array.from({ length: count }, () =>
    playActivity(localDate, place, skillId),
  ).flat();

const findRewards = (
  playRecords: readonly PlayRecord[],
  family = startFamily(),
): ChildRewards => {
  const [child] = applyPlayRecords(family, playRecords).children;
  return child;
};

const listUnlockedGameIds = (
  region: Region,
  rewards: ChildRewards,
  limits = buildChildLimits({}),
) =>
  listGamesOnMap(region, rewards.regionProgress, limits)
    .filter(({ isUnlocked }) => isUnlocked)
    .map(({ id }) => id);

describe("Game unlocks", () => {
  it("opens only the first Game in each Region to start with", () => {
    const rewards = findRewards([]);

    expect(listUnlockedGameIds(bubbleBay, rewards)).toEqual([
      poppingBubbles.id,
      ...bubbleBayExtraIds,
    ]);
    expect(
      listGamesOnMap(bubbleBay, [], buildChildLimits({}))
        .slice(1, 4)
        .map(({ starsToUnlock }) => starsToUnlock),
    ).toEqual([10, 20, 30]);
  });

  it("unlocks Bubble Bay's second Game on Island 1 once 10 Stars are earned there, and nothing anywhere else", () => {
    const afterNineStars = findRewards(
      playActivities(3, "2026-11-01", placeIn(bubbleBay)),
    );
    const afterTwelveStars = findRewards(
      playActivities(4, "2026-11-01", placeIn(bubbleBay)),
    );

    expect(listUnlockedGameIds(bubbleBay, afterNineStars)).toEqual([
      poppingBubbles.id,
      ...bubbleBayExtraIds,
    ]);
    expect(afterTwelveStars.regionProgress).toEqual([
      {
        islandId: "meadow-isle",
        regionId: "bubble-bay",
        unlockedGameIds: [poppingBubbles.id, fishCount.id],
        starsSinceUnlock: 2,
        starsEarned: 12,
      },
    ]);
    for (const region of worldMap.regions.filter(
      (other) => other !== bubbleBay && other.subject !== undefined,
    )) {
      expect(listUnlockedGameIds(region, afterTwelveStars)).toEqual([
        region.games[0].id,
        ...region.extraGames.map(({ id }) => id),
      ]);
    }
    expect(
      listGamesOnMap(
        bubbleBay,
        afterTwelveStars.regionProgress,
        buildChildLimits({}),
      )[2].starsToUnlock,
    ).toBe(8);
  });

  it("counts a Mastery bonus earned in a Region towards its next Game", () => {
    const masteringPlay = [
      ...playActivities(1, "2026-11-01", placeIn(bubbleBay)),
      ...playActivities(1, "2026-11-02", placeIn(bubbleBay)),
      ...playActivities(1, "2026-11-03", placeIn(bubbleBay)),
    ];

    expect(findRewards(masteringPlay).regionProgress).toEqual([
      {
        islandId: "meadow-isle",
        regionId: "bubble-bay",
        unlockedGameIds: [poppingBubbles.id, fishCount.id, tenFrames.id],
        starsSinceUnlock: 9,
        starsEarned: 29,
      },
    ]);
  });

  it("opens the Game after a Mastered one as soon as one Activity in it is finished, since it earns no Stars", () => {
    const masteredElsewhere = [
      ...playActivities(1, "2026-11-01", undefined),
      ...playActivities(1, "2026-11-02", undefined),
      ...playActivities(1, "2026-11-03", undefined),
    ];
    const rewards = findRewards([
      ...masteredElsewhere,
      ...playActivity("2026-11-04", placeIn(bubbleBay)),
    ]);

    expect(rewards.masteryBonusSkillIds).toEqual([numberBonds]);
    expect(listUnlockedGameIds(bubbleBay, rewards)).toEqual([
      poppingBubbles.id,
      fishCount.id,
      ...bubbleBayExtraIds,
    ]);
    expect(rewards.regionProgress[0].starsSinceUnlock).toBe(0);
  });

  it("keeps the Big Top's Games all open on every Island, and earns no unlock progress there", () => {
    const rewards = findRewards(
      playActivities(
        5,
        "2026-11-01",
        placeIn(findListedRegion("meadow-isle", "brainwave-big-top")),
      ),
    );

    for (const island of worldMap.islands) {
      const bigTop = findListedRegion(island.id, "brainwave-big-top");
      expect(listUnlockedGameIds(bigTop, rewards), island.name).toEqual(
        bigTop.games.map(({ id }) => id),
      );
    }
    expect(rewards.regionProgress).toEqual([]);
  });

  it("keeps progress on each Island separate", () => {
    const frostMaths = findListedRegion("frost-isle", "icicle-inlet");
    const rewards = findRewards(
      playActivities(4, "2026-11-01", placeIn(frostMaths)),
    );

    expect(listUnlockedGameIds(frostMaths, rewards)).toHaveLength(
      2 + frostMaths.extraGames.length,
    );
    expect(listUnlockedGameIds(bubbleBay, rewards)).toHaveLength(
      1 + bubbleBayExtraIds.length,
    );
  });

  it("works out the same unlocks on a Family Device as on the server, from the same events", () => {
    const playRecords = [
      ...playActivities(2, "2026-11-01", placeIn(bubbleBay)),
      ...playActivities(5, "2026-11-02", placeIn(bubbleBay, 1)),
      ...playActivities(3, "2026-11-03", undefined),
      ...playActivities(4, "2026-11-04", placeIn(bubbleBay, 2)),
    ];
    const onServer = findRewards(playRecords);
    const syncedToDevice = structuredClone(
      applyPlayRecords(startFamily(), playRecords.slice(0, 20)),
    );
    const onDevice = findRewards(playRecords.slice(20), syncedToDevice);

    expect(onDevice.regionProgress).toEqual(onServer.regionProgress);
    expect(onDevice.stars).toBe(onServer.stars);
    expect(onServer.regionProgress[0].unlockedGameIds.length).toBeGreaterThan(
      2,
    );
  });

  it("opens every Game when a Parent asks, and keeps the earned unlocks when they close them again", () => {
    const rewards = findRewards(
      playActivities(4, "2026-11-01", placeIn(bubbleBay)),
    );
    const opened = openEveryGame(buildChildLimits({}), bubbleBay, true);
    const closedAgain = openEveryGame(opened, bubbleBay, false);

    expect(listUnlockedGameIds(bubbleBay, rewards, opened)).toEqual([
      ...bubbleBay.games.map(({ id }) => id),
      ...bubbleBayExtraIds,
    ]);
    expect(listUnlockedGameIds(bubbleBay, rewards, closedAgain)).toEqual([
      poppingBubbles.id,
      fishCount.id,
      ...bubbleBayExtraIds,
    ]);
  });

  it("starts with the Games kept from before Islands unlocked, and opens the next locked Game with Stars", () => {
    const kept = buildKeptRegionProgress(
      [0, 1, 2, 3].map((gameIndex) => placeIn(bubbleBay, gameIndex)),
    );
    const rewards = findRewards(
      playActivities(4, "2026-11-01", placeIn(bubbleBay)),
      startFamily(kept),
    );

    expect(
      listUnlockedGameIds(bubbleBay, findRewards([], startFamily(kept))),
    ).toEqual([
      ...bubbleBay.games.slice(0, 4).map(({ id }) => id),
      ...bubbleBayExtraIds,
    ]);
    expect(listUnlockedGameIds(bubbleBay, rewards)).toEqual([
      ...bubbleBay.games.slice(0, 5).map(({ id }) => id),
      ...bubbleBayExtraIds,
    ]);
  });

  it("keeps a Game a Parent turned off shut, even when it was earned or every Game is open", () => {
    const rewards = findRewards(
      playActivities(4, "2026-11-01", placeIn(bubbleBay)),
    );
    const limits = lockGames(
      openEveryGame(buildChildLimits({}), bubbleBay, true),
      bubbleBay,
      [poppingBubbles],
      true,
    );

    const games = listGamesOnMap(bubbleBay, rewards.regionProgress, limits);

    expect(games.find(({ id }) => id === poppingBubbles.id)).toMatchObject({
      isUnlocked: false,
      isTurnedOff: true,
      starsToUnlock: 0,
    });
    expect(listUnlockedGameIds(bubbleBay, rewards, limits)).toEqual(
      listRegionGames(bubbleBay)
        .slice(1)
        .map(({ id }) => id),
    );
    expect(
      listUnlockedGameIds(
        bubbleBay,
        rewards,
        lockGames(limits, bubbleBay, [poppingBubbles], false),
      ),
    ).toEqual(listRegionGames(bubbleBay).map(({ id }) => id));
  });
});

describe("Trophies", () => {
  const bigTop = findListedRegion("meadow-isle", "brainwave-big-top");
  const bubbleBayTrophy = { islandId: "meadow-isle", regionId: "bubble-bay" };

  it("needs enough Stars earned in a ten-Game Region to unlock all its Games, which is 90", () => {
    expect(bubbleBay.games).toHaveLength(10);
    expect(findTrophyStars(bubbleBay)).toBe(90);
  });

  it("awards a Region's Trophy once the Child has earned its Stars there, and not a Star sooner", () => {
    const almost = findRewards(
      playActivities(
        29,
        "2026-11-01",
        placeIn(bubbleBay),
        "maths.add-within-20",
      ),
    );
    const enough = findRewards(
      playActivities(
        30,
        "2026-11-01",
        placeIn(bubbleBay),
        "maths.add-within-20",
      ),
    );

    expect(almost.regionProgress[0].starsEarned).toBe(87);
    expect(listTrophies(almost)).toEqual([]);
    expect(listTrophies(enough)).toEqual([bubbleBayTrophy]);
  });

  it("gives no Trophy for Games a Parent opened or that were kept from before Islands", () => {
    const kept = buildKeptRegionProgress(
      bubbleBay.games.map((_, gameIndex) => placeIn(bubbleBay, gameIndex)),
    );

    expect(listTrophies(findRewards([], startFamily(kept)))).toEqual([]);
  });

  it("gives no Trophy for the Brainwave Big Top, however much is played there", () => {
    const rewards = findRewards(
      playActivities(40, "2026-11-01", placeIn(bigTop), "maths.add-within-20"),
    );

    expect(listTrophies(rewards)).toEqual([]);
  });

  it("works out Trophies from the same events, so a Child who already earned one has it", () => {
    const playRecords = playActivities(
      30,
      "2026-11-01",
      placeIn(bubbleBay),
      "maths.add-within-20",
    );
    const inTwoParts = findRewards(playRecords.slice(-6), {
      children: [findRewards(playRecords.slice(0, -6))],
      familyChestActivityCount: 0,
    });

    expect(listTrophies(inTwoParts)).toEqual([bubbleBayTrophy]);
  });
});

describe("Teacher locks", () => {
  const teacherLimits = (limits = buildChildLimits({})) => ({
    ...limits,
    teacherLocks: turnRegionsOn(
      lockGames(
        lockIslandForTeacher(limits.teacherLocks, "meadow-isle", true),
        bubbleBay,
        [fishCount],
        true,
      ),
      [bubbleBay],
      false,
    ),
  });

  it("locks an Island, turns a Region off and shuts a Game, whatever the Parent's own switches say", () => {
    const parentOpenedEverything = turnRegionsOn(
      openEveryGame(buildChildLimits({}), bubbleBay, true),
      [bubbleBay],
      true,
    );
    const limits = teacherLimits(parentOpenedEverything);
    const islands = buildIslandsOnMap(1, limits);

    expect(islands[0]).toMatchObject({
      isUnlocked: false,
      isLockedByTeacher: true,
    });
    expect(
      buildRegionsOnMap(islands, limits).find(
        ({ islandId, id }) =>
          islandId === bubbleBay.islandId && id === bubbleBay.id,
      )?.access,
    ).toBe("island-locked");
    expect(findGameLock(limits, bubbleBay, fishCount)).toBe("teacher");
    expect(
      listGamesOnMap(bubbleBay, [], limits).find(
        ({ id }) => id === fishCount.id,
      )?.isTurnedOff,
    ).toBe(true);
  });

  it("names the Teacher as the lock's owner when a Parent turned the same Game off too", () => {
    const parentLocked = lockGames(
      buildChildLimits({}),
      bubbleBay,
      [fishCount, poppingBubbles],
      true,
    );
    const limits = teacherLimits(parentLocked);

    expect(findGameLock(limits, bubbleBay, fishCount)).toBe("teacher");
    expect(findGameLock(limits, bubbleBay, poppingBubbles)).toBe("parent");
  });

  it("leaves the Teacher's locks out of what a Parent's switches change and send", () => {
    const limits = teacherLimits();
    const parentReopened = switchIsland(
      limits,
      buildIslandsOnMap(1, limits)[0],
    );

    expect(parentReopened.teacherLocks).toEqual(limits.teacherLocks);
    expect(buildIslandsOnMap(1, parentReopened)[0].isUnlocked).toBe(false);
    expect(getParentChoices(limits)).not.toHaveProperty("teacherLocks");
  });
});
