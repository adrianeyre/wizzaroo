import { describe, expect, it } from "vitest";
import {
  listMatchingAmounts,
  matchingAmountSkillByYear,
} from "../../curriculum/matching-amounts.js";
import { yearGroups } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildFacePairs,
  dealMahjong,
  findMatchingFreePair,
  isMahjongMatch,
  isSlotFree,
  largeLayout,
  listFreeTiles,
  mahjongLayouts,
  reshuffleMahjong,
  smallLayout,
} from "./mahjong.js";

const dealFor = (yearGroup: (typeof yearGroups)[number], seed: number) => {
  const layout = mahjongLayouts[yearGroup];
  const random = buildRandom(seed);
  return dealMahjong(
    layout,
    buildFacePairs(
      listMatchingAmounts(matchingAmountSkillByYear[yearGroup]),
      layout.length / 2,
      random,
    ),
    random,
  );
};

describe("mahjong layouts", () => {
  it("hold 20 tiles for Key Stage 1 and 28 for Key Stage 2, in an even number", () => {
    expect(smallLayout).toHaveLength(20);
    expect(largeLayout).toHaveLength(28);
  });

  it("treats a tile as free with nothing on top and one side open", () => {
    const left = { x: 0, y: 0, layer: 0 };
    const middle = { x: 2, y: 0, layer: 0 };
    const right = { x: 4, y: 0, layer: 0 };
    const above = { x: 1, y: 0, layer: 1 };

    expect(isSlotFree(left, [left, middle, right])).toBe(true);
    expect(isSlotFree(middle, [left, middle, right])).toBe(false);
    expect(isSlotFree(left, [left, middle, above])).toBe(false);
  });
});

describe("dealMahjong", () => {
  it.each(yearGroups)(
    "deals Year %i a full board that can always be cleared",
    (yearGroup) => {
      for (let seed = 1; seed <= 15; seed++) {
        const tiles = dealFor(yearGroup, seed);
        const reached = new Map<string, number>();
        for (const { amountKey } of tiles) {
          reached.set(amountKey, (reached.get(amountKey) ?? 0) + 1);
        }

        expect(tiles).toHaveLength(mahjongLayouts[yearGroup].length);
        expect([...reached.values()].every((count) => count % 2 === 0)).toBe(
          true,
        );
        expect(new Set(tiles.map(({ id }) => id)).size).toBe(tiles.length);
        expect(listFreeTiles(tiles).length).toBeGreaterThanOrEqual(2);
      }
    },
  );

  it("can be cleared by matching the dealt pairs in order", () => {
    const tiles = dealFor(4, 9);
    const pairs = Map.groupBy(tiles, ({ amountKey }) => amountKey);
    let left = [...tiles];
    for (const sameAmount of pairs.values()) {
      expect(sameAmount.length % 2).toBe(0);
    }
    while (left.length > 0) {
      const pair = findMatchingFreePair(left);
      if (pair === undefined) {
        left = reshuffleMahjong(left, buildRandom(left.length));
        continue;
      }
      left = left.filter(({ id }) => id !== pair[0].id && id !== pair[1].id);
    }
    expect(left).toHaveLength(0);
  });
});

describe("isMahjongMatch", () => {
  it("matches two different tiles showing the same amount, never a tile with itself", () => {
    const [first, ...rest] = dealFor(3, 2);
    const partner = rest.find(({ amountKey }) => amountKey === first.amountKey);
    const stranger = rest.find(
      ({ amountKey }) => amountKey !== first.amountKey,
    );

    expect(partner && isMahjongMatch(first, partner)).toBe(true);
    expect(stranger && isMahjongMatch(first, stranger)).toBe(false);
    expect(isMahjongMatch(first, first)).toBe(false);
  });
});

describe("reshuffleMahjong", () => {
  it("keeps the same tiles and places, and leaves a board that can still be cleared", () => {
    const tiles = dealFor(5, 4).slice(0, 12);
    const evenTiles = tiles.filter(
      ({ amountKey }) =>
        tiles.filter((tile) => tile.amountKey === amountKey).length % 2 === 0,
    );
    const shuffled = reshuffleMahjong(evenTiles, buildRandom(8));

    expect(
      shuffled
        .map(({ slot }) => slot)
        .toSorted((a, b) => a.x - b.x || a.y - b.y || a.layer - b.layer),
    ).toEqual(
      evenTiles
        .map(({ slot }) => slot)
        .toSorted((a, b) => a.x - b.x || a.y - b.y || a.layer - b.layer),
    );
    expect(shuffled.map(({ amountKey }) => amountKey).toSorted()).toEqual(
      evenTiles.map(({ amountKey }) => amountKey).toSorted(),
    );
  });
});
