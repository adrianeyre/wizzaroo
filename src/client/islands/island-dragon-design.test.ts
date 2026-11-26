import { Vector3, type BufferGeometry, type Matrix4 } from "three";
import { describe, expect, it } from "vitest";
import {
  buildDragonGeometry,
  buildDragonLiveryGeometry,
  buildDragonMovingPartsGeometry,
  placeDragonMovingParts,
} from "./island-dragon-design.js";
import {
  dragonBellyHeight,
  dragonHalfWidth,
  dragonLength,
  dragonSaddle,
  dragonWingspan,
  placeDragonBody,
} from "./island-flight.js";

const listCorners = (geometry: BufferGeometry, placement?: Matrix4) => {
  const positions = geometry.getAttribute("position");
  return Array.from({ length: positions.count }, (_, index) => {
    const corner = new Vector3(
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index),
    );
    return placement === undefined ? corner : corner.applyMatrix4(placement);
  });
};

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const isEveryFacePainted = (geometry: BufferGeometry): boolean => {
  const colours = geometry.getAttribute("color");
  return Array.from({ length: colours.count }, (_, index) =>
    Math.max(colours.getX(index), colours.getY(index), colours.getZ(index)),
  ).every((brightest) => brightest > 0);
};

const body = buildDragonGeometry();
const parts = buildDragonMovingPartsGeometry();

const placeEverything = (bow: number, airborne: number, turn: number) => {
  const placements = placeDragonMovingParts(bow, airborne, turn);
  return [
    ...listCorners(body, placeDragonBody(bow)),
    ...parts.flatMap((part, index) => listCorners(part, placements[index])),
  ];
};

const findLowest = (values: readonly number[]): number =>
  values.reduce((lowest, value) => Math.min(lowest, value), Infinity);

const findHighest = (values: readonly number[]): number =>
  values.reduce((highest, value) => Math.max(highest, value), -Infinity);

const findSpan = (values: readonly number[]): number =>
  findHighest(values) - findLowest(values);

describe("the dragon", () => {
  it("is detailed but keeps its moving parts light enough to pose every frame", () => {
    expect(countTriangles(body)).toBeGreaterThan(10_000);
    expect(countTriangles(body)).toBeLessThan(40_000);
    const movingCorners = parts.reduce(
      (total, part) => total + part.getAttribute("position").count,
      0,
    );
    expect(movingCorners).toBeLessThan(40_000);
  });

  it("places every moving part", () => {
    expect(placeDragonMovingParts(0, 0, 0)).toHaveLength(parts.length);
  });

  it("has its saddle seat where the Character's hips sit, narrow enough to straddle", () => {
    const seat = listCorners(body).filter(
      ({ x, z }) => Math.abs(x) < 0.05 && Math.abs(z - dragonSaddle.z) < 0.05,
    );
    expect(findHighest(seat.map(({ y }) => y))).toBeCloseTo(dragonSaddle.y, 1);
    const seatSides = listCorners(body).filter(
      ({ y, z }) =>
        Math.abs(z - dragonSaddle.z) < 0.05 && y > dragonSaddle.y - 0.08,
    );
    expect(findSpan(seatSides.map(({ x }) => x))).toBeGreaterThan(0.45);
    expect(findSpan(seatSides.map(({ x }) => x))).toBeLessThan(0.75);
  });

  it("stands with its belly at its belly height and its body no wider than its half width", () => {
    const belly = listCorners(body).filter(
      ({ x, z }) => Math.abs(x) < 0.2 && Math.abs(z) < 0.2,
    );
    expect(findLowest(belly.map(({ y }) => y))).toBeCloseTo(
      dragonBellyHeight,
      1,
    );
    const widest = findHighest(listCorners(body).map(({ x }) => Math.abs(x)));
    expect(widest).toBeGreaterThan(dragonHalfWidth);
    expect(widest).toBeLessThan(dragonHalfWidth + 0.15);
  });

  it("stands on its feet, nose to tail its full length", () => {
    const standing = placeEverything(0, 0, 0);
    expect(findLowest(standing.map(({ y }) => y))).toBeCloseTo(0, 1);
    expect(findSpan(standing.map(({ z }) => z))).toBeGreaterThan(
      dragonLength - 0.6,
    );
    expect(findSpan(standing.map(({ z }) => z))).toBeLessThan(
      dragonLength + 0.6,
    );
  });

  it("lies down on the grass to be boarded, its head bowed low in front", () => {
    const lying = placeEverything(1, 0, 0);
    expect(findLowest(lying.map(({ y }) => y))).toBeGreaterThan(-0.2);
    expect(findHighest(lying.map(({ y }) => y))).toBeLessThan(2.4);
    const placements = placeDragonMovingParts(1, 0, 0);
    const head = listCorners(parts[5], placements[5]);
    expect(findLowest(head.map(({ y }) => y))).toBeLessThan(0.3);
  });

  it("keeps its folded wings clear of the flank the Character climbs", () => {
    const placements = placeDragonMovingParts(1, 0, 0);
    const inTheWay = [0, 1, 2, 3].flatMap((wing) =>
      listCorners(parts[wing], placements[wing]).filter(
        ({ x, z }) => x > 0.3 && z > 0.4 && z < 1.6,
      ),
    );
    expect(inTheWay).toStrictEqual([]);
  });

  it("spreads its wings to their full span in flight", () => {
    const flying = placeEverything(0, 1, 0);
    expect(findSpan(flying.map(({ x }) => x))).toBeGreaterThan(
      dragonWingspan - 0.8,
    );
    expect(findSpan(flying.map(({ x }) => x))).toBeLessThan(
      dragonWingspan + 0.4,
    );
  });

  it("carries the Wizzaroo name and crest on both sides of its saddle blanket", () => {
    const decals = listCorners(buildDragonLiveryGeometry());
    expect(decals.some(({ x }) => x > dragonHalfWidth - 0.2)).toBe(true);
    expect(decals.some(({ x }) => x < -(dragonHalfWidth - 0.2))).toBe(true);
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
    parts.forEach((part) => {
      expect(isEveryFacePainted(part)).toBe(true);
    });
  });
});
