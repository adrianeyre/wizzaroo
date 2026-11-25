import type { BufferGeometry, Matrix4 } from "three";
import { describe, expect, it } from "vitest";
import {
  blimpDoorway,
  blimpNoseZ,
  blimpTailZ,
  buildBlimpGeometry,
  buildBlimpLiveryGeometry,
  buildBlimpMovingPartsGeometry,
  findBlimpEnvelopeRadius,
  placeBlimpMovingParts,
} from "./island-blimp-design.js";
import {
  blimpDoor,
  blimpEnvelopeCentre,
  blimpGondolaHalfWidth,
  blimpGondolaTop,
  blimpLength,
  blimpRadius,
  blimpStepRun,
} from "./island-flight.js";

const listCorners = (geometry: BufferGeometry, matrix?: Matrix4) => {
  const placed =
    matrix === undefined ? geometry : geometry.clone().applyMatrix4(matrix);
  const positions = placed.getAttribute("position");
  return Array.from({ length: positions.count }, (_, index) => ({
    x: positions.getX(index),
    y: positions.getY(index),
    z: positions.getZ(index),
  }));
};

const findRange = (values: readonly number[]) => ({
  lowest: values.reduce((least, value) => Math.min(least, value), Infinity),
  highest: values.reduce((most, value) => Math.max(most, value), -Infinity),
});

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

describe("the blimp", () => {
  const body = buildBlimpGeometry();
  const corners = listCorners(body);
  const movingParts = buildBlimpMovingPartsGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(20_000);
    expect(countTriangles(body)).toBeLessThan(60_000);
  });

  it("has an envelope as long as the blimp, widest at its radius and clear of the gondola", () => {
    expect(blimpNoseZ - blimpTailZ).toBeCloseTo(blimpLength);
    const radii = Array.from({ length: 261 }, (_, step) =>
      findBlimpEnvelopeRadius(blimpTailZ + step / 10),
    );
    expect(Math.max(...radii)).toBeCloseTo(blimpRadius, 2);
    expect(blimpEnvelopeCentre - blimpRadius).toBeGreaterThan(blimpGondolaTop);
  });

  it("rests on its landing wheel on the ground", () => {
    expect(findRange(corners.map(({ y }) => y)).lowest).toBeCloseTo(0, 2);
  });

  it("carries the Wizzaroo name and crest on both sides", () => {
    const decals = listCorners(buildBlimpLiveryGeometry());
    expect(decals.some(({ x }) => x > blimpRadius - 0.3)).toBe(true);
    expect(decals.some(({ x }) => x < -(blimpRadius - 0.3))).toBe(true);
    expect(decals.some(({ y }) => y > blimpEnvelopeCentre + 2)).toBe(true);
    expect(decals.some(({ y }) => y < blimpGondolaTop)).toBe(true);
  });

  it("gives each moving part a placement and keeps them light enough to move every frame", () => {
    expect(placeBlimpMovingParts(0, 0)).toHaveLength(movingParts.length);
    const vertices = movingParts.reduce(
      (total, part) => total + part.getAttribute("position").count,
      0,
    );
    expect(vertices).toBeLessThan(15_000);
  });

  it("slides its door clear of a doorway tall enough for the Character", () => {
    expect(blimpDoorway.top - blimpDoor.y).toBeGreaterThan(1.05);
    const [door] = movingParts;
    const [closed] = placeBlimpMovingParts(0, 0);
    const [open] = placeBlimpMovingParts(1, 0);
    const closedZ = findRange(listCorners(door, closed).map(({ z }) => z));
    expect(closedZ.lowest).toBeLessThan(
      blimpDoor.z - blimpDoorway.halfWidth + 0.05,
    );
    expect(closedZ.highest).toBeGreaterThan(
      blimpDoor.z + blimpDoorway.halfWidth - 0.05,
    );
    const openZ = findRange(listCorners(door, open).map(({ z }) => z));
    expect(openZ.highest).toBeLessThan(blimpDoor.z - blimpDoorway.halfWidth);
  });

  it("folds its step out to the ground below the door, and stows it inside the gondola", () => {
    const step = movingParts[movingParts.length - 1];
    const stowed = placeBlimpMovingParts(0, 0).at(-1);
    const deployed = placeBlimpMovingParts(1, 0).at(-1);
    const out = listCorners(step, deployed);
    expect(findRange(out.map(({ y }) => y)).lowest).toBeCloseTo(0, 1);
    expect(findRange(out.map(({ x }) => x)).highest).toBeCloseTo(
      blimpDoor.x + blimpStepRun,
      0,
    );
    const away = listCorners(step, stowed);
    expect(findRange(away.map(({ x }) => x)).highest).toBeLessThan(
      blimpGondolaHalfWidth,
    );
    expect(findRange(away.map(({ y }) => y)).lowest).toBeGreaterThan(0.25);
  });

  it("spins its propellers with the clock", () => {
    const [, still] = placeBlimpMovingParts(0, 0);
    const [, turning] = placeBlimpMovingParts(0, 1);
    expect(still.equals(turning)).toBe(false);
  });
});
