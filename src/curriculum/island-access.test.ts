import { describe, expect, it } from "vitest";
import {
  buildChildLimits,
  buildIslandsOnMap,
  buildRegionsOnMap,
  canExploreIsland,
  lockIslandForTeacher,
  switchIsland,
  type ChildLimits,
  type IslandOnMap,
} from "./island-access.js";
import type { YearGroup } from "./skills.js";

const islandIdsInYearOrder = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

const listOpenIslandIds = (
  yearGroup: YearGroup | null,
  limits: ChildLimits = buildChildLimits({}),
): string[] =>
  buildIslandsOnMap(yearGroup, limits)
    .filter(({ isUnlocked }) => isUnlocked)
    .map(({ id }) => id);

const findIslandOnMap = (
  yearGroup: YearGroup,
  limits: ChildLimits,
  islandId: string,
): IslandOnMap => {
  const island = buildIslandsOnMap(yearGroup, limits).find(
    ({ id }) => id === islandId,
  );
  if (island === undefined) {
    throw new Error(`there is no Island "${islandId}"`);
  }
  return island;
};

const listRegionAccessOn = (
  yearGroup: YearGroup,
  limits: ChildLimits,
  islandId: string,
) => {
  const regions = buildRegionsOnMap(
    buildIslandsOnMap(yearGroup, limits),
    limits,
  ).filter((region) => region.islandId === islandId);
  return [...new Set(regions.map(({ access }) => access))];
};

describe("Islands open by default", () => {
  it("opens the Regions on a Year 3 Child's own Island and the ones below, and locks those above", () => {
    expect(listOpenIslandIds(3)).toEqual(islandIdsInYearOrder.slice(0, 3));
    expect(listRegionAccessOn(3, buildChildLimits({}), "jungle-reach")).toEqual(
      ["island-locked"],
    );
    expect(
      listRegionAccessOn(3, buildChildLimits({}), "sunscorch-sands"),
    ).toEqual(["open"]);
  });

  it("opens every Island's Regions to a Year 6 Child, and only Year 1's to a Child with no Year yet", () => {
    expect(listOpenIslandIds(6)).toEqual(islandIdsInYearOrder);
    expect(listOpenIslandIds(null)).toEqual(["meadow-isle"]);
  });

  it("lets a Child explore every Island whatever its Year, until a Parent locks one for exploring", () => {
    const limits = buildChildLimits({});

    expect(
      islandIdsInYearOrder.filter((islandId) =>
        canExploreIsland(limits, islandId),
      ),
    ).toEqual(islandIdsInYearOrder);
  });

  it("marks which Islands are open by default and which is home", () => {
    const islands = buildIslandsOnMap(2, buildChildLimits({}));

    expect(
      islands.map(({ isHome, isUnlockedByDefault }) => ({
        isHome,
        isUnlockedByDefault,
      })),
    ).toEqual([
      { isHome: false, isUnlockedByDefault: true },
      { isHome: true, isUnlockedByDefault: true },
      { isHome: false, isUnlockedByDefault: false },
      { isHome: false, isUnlockedByDefault: false },
      { isHome: false, isUnlockedByDefault: false },
      { isHome: false, isUnlockedByDefault: false },
    ]);
  });
});

describe("A Parent's Island switch", () => {
  it("opens an Island above the Child's Year early, and locks it again", () => {
    const closed = buildChildLimits({});
    const opened = switchIsland(
      closed,
      findIslandOnMap(2, closed, "ember-isle"),
    );

    expect(opened.unlockedIslandIds).toEqual(["ember-isle"]);
    expect(opened.lockedIslandIds).toEqual([]);
    expect(findIslandOnMap(2, opened, "ember-isle").isUnlocked).toBe(true);

    const lockedAgain = switchIsland(
      opened,
      findIslandOnMap(2, opened, "ember-isle"),
    );

    expect(getIslandLists(lockedAgain)).toEqual(getIslandLists(closed));
    expect(findIslandOnMap(2, lockedAgain, "ember-isle").isUnlocked).toBe(
      false,
    );
  });

  it("locks the Child's own Island, and opens it again", () => {
    const open = buildChildLimits({});
    const locked = switchIsland(open, findIslandOnMap(2, open, "frost-isle"));

    expect(locked.lockedIslandIds).toEqual(["frost-isle"]);
    expect(findIslandOnMap(2, locked, "frost-isle").isUnlocked).toBe(false);

    const reopened = switchIsland(
      locked,
      findIslandOnMap(2, locked, "frost-isle"),
    );

    expect(getIslandLists(reopened)).toEqual(getIslandLists(open));
  });

  it("keeps an Island a Parent locked shut, even when it was opened early before", () => {
    const limits = buildChildLimits({
      unlockedIslandIds: ["ember-isle"],
      lockedIslandIds: ["ember-isle"],
    });

    expect(findIslandOnMap(2, limits, "ember-isle").isUnlocked).toBe(false);
    expect(
      findIslandOnMap(
        2,
        switchIsland(limits, findIslandOnMap(2, limits, "ember-isle")),
        "ember-isle",
      ).isUnlocked,
    ).toBe(true);
  });

  it("can't open an Island their Teacher has locked", () => {
    const limits = buildChildLimits(
      { unlockedIslandIds: ["ember-isle"] },
      {
        lockedIslandIds: lockIslandForTeacher(
          buildChildLimits({}).teacherLocks,
          "ember-isle",
          true,
        ).lockedIslandIds,
      },
    );

    expect(findIslandOnMap(2, limits, "ember-isle")).toMatchObject({
      isUnlocked: false,
      isLockedByTeacher: true,
    });
  });
});

const getIslandLists = ({
  unlockedIslandIds,
  lockedIslandIds,
}: ChildLimits) => ({
  unlockedIslandIds,
  lockedIslandIds,
});
