import { Color } from "three";
import { describe, expect, it } from "vitest";
import {
  buildShipGeometry,
  findShipDeckHeight,
  findShipHalfWidth,
  gangwayGap,
  shipStern,
} from "./island-ship-design.js";
import { shipBeam, shipDeckHeight } from "./island-voyage.js";

const geometry = buildShipGeometry();
const positions = geometry.getAttribute("position");
const normals = geometry.getAttribute("normal");
const colours = geometry.getAttribute("color");

const listVertices = () =>
  Array.from({ length: positions.count }, (_, index) => ({
    x: positions.getX(index),
    y: positions.getY(index),
    z: positions.getZ(index),
    normalX: normals.getX(index),
    index,
  }));

describe("the ship", () => {
  it("is detailed but stays within its share of the scene's triangles", () => {
    const triangles = positions.count / 3;
    expect(triangles).toBeGreaterThan(8000);
    expect(triangles).toBeLessThan(13_000);
  });

  it("has its deck where the Character stands and its side where the gangplank meets it", () => {
    const gangway = (gangwayGap.from + gangwayGap.to) / 2;
    expect(findShipDeckHeight(gangway)).toBeCloseTo(shipDeckHeight);
    expect(findShipHalfWidth(gangway)).toBeCloseTo(shipBeam / 2);
  });

  it("narrows to a fine bow", () => {
    expect(findShipHalfWidth(7.5)).toBeLessThan(shipBeam / 4);
    expect(findShipHalfWidth(9.7)).toBeLessThan(0.1);
  });

  it("leaves the boarding way clear, from the gap in the rail to the open deck", () => {
    const inTheWay = listVertices().filter(
      ({ x, y, z }) =>
        Math.abs(x) < shipBeam / 2 - 0.4 &&
        y > shipDeckHeight + 0.1 &&
        y < shipDeckHeight + 1.65 &&
        z > gangwayGap.from &&
        z < gangwayGap.to,
    );
    expect(inTheWay).toStrictEqual([]);
  });

  it("faces its hull outwards on both sides, so it is lit from outside", () => {
    const navy = new Color("#1d3a8a");
    const hullSides = listVertices().filter(
      ({ index, z }) =>
        Math.abs(z) < 2 &&
        Math.abs(colours.getX(index) - navy.r) < 1e-6 &&
        Math.abs(colours.getY(index) - navy.g) < 1e-6 &&
        Math.abs(colours.getZ(index) - navy.b) < 1e-6,
    );
    expect(hullSides.length).toBeGreaterThan(10);
    hullSides.forEach(({ x, normalX }) => {
      expect(Math.sign(normalX)).toBe(Math.sign(x));
    });
  });

  it("closes its stern with a back that faces backwards, so it can be seen from behind", () => {
    const sternFaces = Array.from({ length: positions.count / 3 }, (_, face) =>
      [0, 1, 2].map((corner) => face * 3 + corner),
    ).filter((corners) =>
      corners.every(
        (index) => Math.abs(positions.getZ(index) - shipStern) < 1e-4,
      ),
    );
    expect(sternFaces.length).toBeGreaterThan(20);
    sternFaces.forEach(([first, second, third]) => {
      const alongX = positions.getX(second) - positions.getX(first);
      const alongY = positions.getY(second) - positions.getY(first);
      const acrossX = positions.getX(third) - positions.getX(first);
      const acrossY = positions.getY(third) - positions.getY(first);
      const facing = alongX * acrossY - alongY * acrossX;
      expect(facing).toBeLessThanOrEqual(0);
    });
  });

  it("paints every face", () => {
    const unpainted = Array.from({ length: colours.count }, (_, index) =>
      Math.max(colours.getX(index), colours.getY(index), colours.getZ(index)),
    ).filter((brightest) => brightest === 0);
    expect(unpainted).toStrictEqual([]);
  });
});
