import { Vector3, type BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import {
  surfRiderZ,
  surfWaveBehind,
  surfWaveHalfWidth,
  surfWaveHeight,
  surfboardDeck,
  surfboardHalfWidth,
  surfboardLength,
  windsurferDeck,
  windsurferHalfWidth,
  windsurferHands,
  windsurferLength,
  windsurferMastFoot,
  windsurferMastHeight,
  windsurferRiderZ,
} from "./island-sea-craft.js";
import {
  buildSurfboardGeometry,
  buildSurfboardLiveryGeometry,
  buildSurfboardMovingPartsGeometry,
  buildSurfWaveGeometry,
  findSurfboardDeck,
  placeSurfboardMovingParts,
  placeSurfWave,
} from "./island-surfboard-design.js";
import {
  buildWindsurferGeometry,
  buildWindsurferLiveryGeometry,
  buildWindsurferMovingPartsGeometry,
  findWindsurferBoomPoint,
  findWindsurferBoomShareAtZ,
  findWindsurferDeck,
  findWindsurferSailPoint,
  placeWindsurferMovingParts,
} from "./island-windsurfer-design.js";

const listCorners = (geometry: BufferGeometry) => {
  const positions = geometry.getAttribute("position");
  return Array.from({ length: positions.count }, (_, index) => ({
    x: positions.getX(index),
    y: positions.getY(index),
    z: positions.getZ(index),
  }));
};

const findMost = (values: readonly number[]): number =>
  values.reduce((most, value) => Math.max(most, value), -Infinity);

const findLeast = (values: readonly number[]): number =>
  values.reduce((least, value) => Math.min(least, value), Infinity);

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const isEveryFacePainted = (geometry: BufferGeometry): boolean => {
  const colours = geometry.getAttribute("color");
  return Array.from({ length: colours.count }, (_, index) =>
    Math.max(colours.getX(index), colours.getY(index), colours.getZ(index)),
  ).every((brightest) => brightest > 0);
};

describe("the surfboard", () => {
  const body = buildSurfboardGeometry();
  const corners = listCorners(body);

  it("is a smooth, fully painted board within its share of triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(8000);
    expect(countTriangles(body)).toBeLessThan(30_000);
    expect(isEveryFacePainted(body)).toBe(true);
  });

  it("matches the board's length, width and deck height", () => {
    const zs = corners.map(({ z }) => z);
    const xs = corners.map(({ x }) => Math.abs(x));
    expect(findLeast(zs)).toBeGreaterThan(-surfboardLength / 2 - 0.02);
    expect(findMost(zs)).toBeLessThan(surfboardLength / 2 + 0.02);
    expect(findMost(xs)).toBeLessThan(surfboardHalfWidth + 0.01);
    expect(findSurfboardDeck(0, surfRiderZ)).toBeCloseTo(surfboardDeck, 2);
  });

  it("has its fins under the water and its nose kicked up", () => {
    const lowest = findLeast(corners.map(({ y }) => y));
    expect(lowest).toBeLessThan(-0.05);
    expect(lowest).toBeGreaterThan(-0.2);
    expect(findSurfboardDeck(0, 1.1)).toBeGreaterThan(surfboardDeck + 0.06);
  });

  it("carries the Wizzaroo crest and name and a swaying leash", () => {
    expect(countTriangles(buildSurfboardLiveryGeometry())).toBeGreaterThan(0);
    const parts = buildSurfboardMovingPartsGeometry();
    expect(parts.length).toBeGreaterThan(0);
    expect(placeSurfboardMovingParts(12)).toHaveLength(parts.length);
  });
});

describe("the surf wave", () => {
  const wave = buildSurfWaveGeometry();

  const placeCorners = (size: number) => {
    const placement = placeSurfWave(size, 0);
    return listCorners(wave).map(({ x, y, z }) =>
      new Vector3(x, y, z).applyMatrix4(placement),
    );
  };

  it("is flat and hidden at size nought", () => {
    expect(findMost(placeCorners(0).map(({ y }) => y))).toBeLessThan(0.01);
  });

  it("rises massive behind the board and spans the sea", () => {
    const corners = placeCorners(1);
    const highest = findMost(corners.map(({ y }) => y));
    expect(highest).toBeGreaterThan(surfWaveHeight * 0.95);
    expect(highest).toBeLessThan(surfWaveHeight * 1.25);
    const xs = corners.map(({ x }) => x);
    expect(findLeast(xs)).toBeLessThan(-surfWaveHalfWidth * 0.95);
    expect(findMost(xs)).toBeGreaterThan(surfWaveHalfWidth * 0.95);
    const foot = corners
      .filter(({ x, y }) => Math.abs(x) < 0.3 && y < 0.05)
      .map(({ z }) => z);
    expect(findMost(foot)).toBeGreaterThan(-surfWaveBehind - 0.3);
  });

  it("curls its lip high over, not through, the rider", () => {
    const nearRider = placeCorners(1).filter(
      ({ x, z }) => Math.abs(x) < 0.8 && z > surfRiderZ - 0.75,
    );
    expect(findLeast(nearRider.map(({ y }) => y))).toBeGreaterThan(2.4);
    expect(isEveryFacePainted(wave)).toBe(true);
  });
});

describe("the windsurfer", () => {
  const body = buildWindsurferGeometry();
  const corners = listCorners(body);

  it("is a smooth, fully painted board and rig", () => {
    expect(countTriangles(body)).toBeGreaterThan(20_000);
    expect(countTriangles(body)).toBeLessThan(70_000);
    expect(isEveryFacePainted(body)).toBe(true);
  });

  it("matches the board's size and deck height", () => {
    const board = corners.filter(({ y }) => y < 0.3 && y > -0.1);
    expect(findLeast(board.map(({ z }) => z))).toBeGreaterThan(
      -windsurferLength / 2 - 0.15,
    );
    expect(findMost(board.map(({ x }) => Math.abs(x)))).toBeLessThan(
      windsurferHalfWidth + 0.5,
    );
    expect(findWindsurferDeck(0, windsurferRiderZ)).toBeCloseTo(
      windsurferDeck,
      2,
    );
  });

  it("stands its mast to its full height", () => {
    const highest = findMost(corners.map(({ y }) => y));
    expect(highest).toBeGreaterThan(
      windsurferMastFoot.y + windsurferMastHeight * 0.95,
    );
    expect(highest).toBeLessThan(
      windsurferMastFoot.y + windsurferMastHeight + 0.1,
    );
  });

  it("passes the windward boom tube through the rider's hands", () => {
    const grip = findWindsurferBoomPoint(
      1,
      findWindsurferBoomShareAtZ(windsurferHands.z),
    );
    expect(grip[0]).toBeCloseTo(windsurferHands.x, 2);
    expect(grip[1]).toBeCloseTo(windsurferHands.y, 2);
    expect(grip[2]).toBeCloseTo(windsurferHands.z, 2);
  });

  it("sheets its cambered sail out to the rider's +x side", () => {
    const middle = findWindsurferSailPoint(0.5, 0.4);
    expect(middle.x).toBeGreaterThan(windsurferHands.x);
    const luff = findWindsurferSailPoint(0, 0.4);
    const leech = findWindsurferSailPoint(1, 0.4);
    const chordMiddle = luff.clone().lerp(leech, 0.5);
    expect(middle.x).toBeGreaterThan(chordMiddle.x + 0.05);
  });

  it("carries the Wizzaroo livery and a swinging uphaul", () => {
    expect(countTriangles(buildWindsurferLiveryGeometry())).toBeGreaterThan(0);
    const parts = buildWindsurferMovingPartsGeometry();
    expect(parts.length).toBeGreaterThan(0);
    expect(placeWindsurferMovingParts(30)).toHaveLength(parts.length);
  });
});
