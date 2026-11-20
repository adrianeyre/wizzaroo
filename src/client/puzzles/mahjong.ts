import type { Amount, AmountFace } from "../../curriculum/matching-amounts.js";
import type { YearGroup } from "../../curriculum/skills.js";
import { shuffle } from "./shuffle.js";

export interface TileSlot {
  x: number;
  y: number;
  layer: number;
}

export interface MahjongTile {
  id: number;
  slot: TileSlot;
  amountKey: string;
  face: AmountFace;
}

export interface FacePair {
  amountKey: string;
  faces: [AmountFace, AmountFace];
}

const buildLayer = (
  xs: readonly number[],
  ys: readonly number[],
  layer: number,
): TileSlot[] => ys.flatMap((y) => xs.map((x) => ({ x, y, layer })));

export const smallLayout: readonly TileSlot[] = [
  ...buildLayer([0, 2, 4, 6, 8], [0, 2, 4], 0),
  ...buildLayer([3, 5], [1, 3], 1),
  ...buildLayer([4], [2], 2),
];

export const largeLayout: readonly TileSlot[] = [
  ...buildLayer([0, 2, 4, 6, 8, 10], [0, 2, 4], 0),
  ...buildLayer([2, 4, 6, 8], [1, 3], 1),
  ...buildLayer([4, 6], [2], 2),
];

export const mahjongLayouts: Record<YearGroup, readonly TileSlot[]> = {
  1: smallLayout,
  2: smallLayout,
  3: largeLayout,
  4: largeLayout,
  5: largeLayout,
  6: largeLayout,
};

const tileSpan = 2;
const dealTries = 60;

const isOverlapping = (first: TileSlot, second: TileSlot): boolean =>
  Math.abs(first.x - second.x) < tileSpan &&
  Math.abs(first.y - second.y) < tileSpan;

const isSideBlocked = (
  slot: TileSlot,
  others: readonly TileSlot[],
  side: -1 | 1,
): boolean =>
  others.some(
    (other) =>
      other.layer === slot.layer &&
      other.x === slot.x + side * tileSpan &&
      Math.abs(other.y - slot.y) < tileSpan,
  );

export const isSlotFree = (
  slot: TileSlot,
  others: readonly TileSlot[],
): boolean => {
  const isCovered = others.some(
    (other) => other.layer > slot.layer && isOverlapping(other, slot),
  );
  return (
    !isCovered &&
    (!isSideBlocked(slot, others, -1) || !isSideBlocked(slot, others, 1))
  );
};

export const listFreeTiles = (tiles: readonly MahjongTile[]): MahjongTile[] => {
  const slots = tiles.map(({ slot }) => slot);
  return tiles.filter(({ slot }) => isSlotFree(slot, slots));
};

export const buildFacePairs = (
  amounts: readonly Amount[],
  pairCount: number,
  random: () => number,
): FacePair[] => {
  const facesLeft = new Map(
    amounts.map(({ key, faces }) => [key, shuffle(faces, random)]),
  );
  const pairs: FacePair[] = [];
  while (pairs.length < pairCount) {
    const pairable = shuffle(
      [...facesLeft.entries()].filter(([, faces]) => faces.length >= 2),
      random,
    );
    if (pairable.length === 0) {
      break;
    }
    for (const [amountKey, faces] of pairable) {
      if (pairs.length >= pairCount) {
        break;
      }
      const [first, second, ...rest] = faces;
      pairs.push({ amountKey, faces: [first, second] });
      facesLeft.set(amountKey, rest);
    }
  }
  return pairs;
};

const tryDealing = (
  slots: readonly TileSlot[],
  pairs: readonly FacePair[],
  random: () => number,
): MahjongTile[] | undefined => {
  let slotsLeft = [...slots];
  const tiles: MahjongTile[] = [];
  for (const { amountKey, faces } of pairs) {
    const freeSlots = shuffle(
      slotsLeft.filter((slot) => isSlotFree(slot, slotsLeft)),
      random,
    );
    if (freeSlots.length < 2) {
      return undefined;
    }
    const chosen = freeSlots.slice(0, 2);
    chosen.forEach((slot, position) => {
      tiles.push({ id: 0, slot, amountKey, face: faces[position] });
    });
    slotsLeft = slotsLeft.filter((slot) => !chosen.includes(slot));
  }
  return tiles;
};

export const dealMahjong = (
  slots: readonly TileSlot[],
  pairs: readonly FacePair[],
  random: () => number,
): MahjongTile[] => {
  const usedSlots = slots.slice(0, pairs.length * 2);
  for (let attempt = 0; attempt < dealTries; attempt++) {
    const dealt = tryDealing(usedSlots, pairs, random);
    if (dealt !== undefined) {
      return dealt
        .toSorted(
          (first, second) =>
            first.slot.layer - second.slot.layer ||
            first.slot.y - second.slot.y ||
            first.slot.x - second.slot.x,
        )
        .map((tile, id) => ({ ...tile, id }));
    }
  }
  throw new Error("the Mahjong layout could not be dealt");
};

export const pairUpTiles = (tiles: readonly MahjongTile[]): FacePair[] => {
  const byAmount = Map.groupBy(tiles, ({ amountKey }) => amountKey);
  return [...byAmount.entries()].flatMap(([amountKey, sameAmount]) =>
    Array.from({ length: Math.floor(sameAmount.length / 2) }, (_, index) => ({
      amountKey,
      faces: [sameAmount[index * 2].face, sameAmount[index * 2 + 1].face],
    })),
  );
};

export const reshuffleMahjong = (
  tiles: readonly MahjongTile[],
  random: () => number,
): MahjongTile[] =>
  dealMahjong(
    tiles.map(({ slot }) => slot),
    shuffle(pairUpTiles(tiles), random),
    random,
  ).map((tile, index) => ({ ...tile, id: tiles[index].id }));

export const isMahjongMatch = (
  first: MahjongTile,
  second: MahjongTile,
): boolean => first.id !== second.id && first.amountKey === second.amountKey;

export const findMatchingFreePair = (
  tiles: readonly MahjongTile[],
): [MahjongTile, MahjongTile] | undefined => {
  const free = listFreeTiles(tiles);
  for (const [position, first] of free.entries()) {
    const second = free
      .slice(position + 1)
      .find((other) => isMahjongMatch(first, other));
    if (second !== undefined) {
      return [first, second];
    }
  }
  return undefined;
};
