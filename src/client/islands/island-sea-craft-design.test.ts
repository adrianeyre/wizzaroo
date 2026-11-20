import type { BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import { findExploreAdventure, islandAdventures } from "./island-adventures.js";
import { buildAeroplaneLiveryGeometry } from "./island-aeroplane-design.js";
import { buildHelicopterLiveryGeometry } from "./island-helicopter-design.js";
import {
  buildHovercraftGeometry,
  buildHovercraftLiveryGeometry,
  buildHovercraftRampGeometry,
  buildSkirtGeometry,
  placeHovercraftRamp,
  placeHovercraftSkirt,
} from "./island-hovercraft-design.js";
import {
  buildHoverSlipwayGeometry,
  findSlipwayEnd,
  findSlipwayTop,
} from "./island-hover-slipway.js";
import { liveryFaceRows } from "./wizzaroo-flag.js";
import {
  findHoverSurface,
  hovercraftBow,
  hovercraftCushion,
  hovercraftDeck,
  subBrowLength,
  subDeckHalfWidth,
  subDeckHeight,
  subHatch,
} from "./island-sea-craft.js";
import {
  buildSubmarineBrowGeometry,
  buildSubmarineGeometry,
  buildSubmarineHatchGeometry,
  buildSubmarineLiveryGeometry,
  placeSubmarineBrow,
  placeSubmarineHatch,
} from "./island-submarine-design.js";

const listCorners = (geometry: BufferGeometry) => {
  const positions = geometry.getAttribute("position");
  return Array.from({ length: positions.count }, (_, index) => ({
    x: positions.getX(index),
    y: positions.getY(index),
    z: positions.getZ(index),
  }));
};

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const isEveryFacePainted = (geometry: BufferGeometry): boolean => {
  const colours = geometry.getAttribute("color");
  return Array.from({ length: colours.count }, (_, index) =>
    Math.max(colours.getX(index), colours.getY(index), colours.getZ(index)),
  ).every((brightest) => brightest > 0);
};

const listShares = (steps: number) =>
  Array.from({ length: steps + 1 }, (_, step) => step / steps);

const findLowest = (geometry: BufferGeometry): number =>
  Math.min(...listCorners(geometry).map(({ y }) => y));

const findHighest = (geometry: BufferGeometry): number =>
  Math.max(...listCorners(geometry).map(({ y }) => y));

describe("the hovercraft", () => {
  const body = buildHovercraftGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(5000);
    expect(countTriangles(body)).toBeLessThan(12_000);
  });

  it("rests on its skirt, and stretches the skirt down to the water as it lifts", () => {
    expect(findLowest(buildSkirtGeometry())).toBeCloseTo(0);
    const lifted = buildSkirtGeometry().applyMatrix4(placeHovercraftSkirt(1));
    expect(findLowest(lifted)).toBeCloseTo(-hovercraftCushion);
    expect(findHighest(lifted)).toBeCloseTo(findHighest(buildSkirtGeometry()));
  });

  it("lowers its bow ramp from the deck down to the ground, and raises it to close the bow", () => {
    const lowered = buildHovercraftRampGeometry().applyMatrix4(
      placeHovercraftRamp(1),
    );
    expect(findLowest(lowered)).toBeLessThan(0.1);
    expect(findLowest(lowered)).toBeGreaterThan(-0.2);
    expect(Math.max(...listCorners(lowered).map(({ z }) => z))).toBeGreaterThan(
      hovercraftBow + 2,
    );
    const raised = buildHovercraftRampGeometry().applyMatrix4(
      placeHovercraftRamp(0),
    );
    expect(findLowest(raised)).toBeGreaterThan(hovercraftDeck - 0.2);
    expect(findHighest(raised)).toBeGreaterThan(hovercraftDeck + 2);
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
    expect(isEveryFacePainted(buildSkirtGeometry())).toBe(true);
  });
});

describe("the submarine", () => {
  const body = buildSubmarineGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(5000);
    expect(countTriangles(body)).toBeLessThan(12_000);
  });

  it("has a flat deck at the pier's height, and keeps its hull below the waterline", () => {
    const deckCorners = listCorners(body).filter(
      ({ x, z }) => Math.abs(x) < subDeckHalfWidth * 0.8 && Math.abs(z) < 0.3,
    );
    expect(Math.max(...deckCorners.map(({ y }) => y))).toBeCloseTo(
      subDeckHeight,
      1,
    );
    expect(findLowest(body)).toBeLessThan(-1);
  });

  it("opens its hatch and slides its brow out over the pier", () => {
    const shut = buildSubmarineHatchGeometry().applyMatrix4(
      placeSubmarineHatch(0),
    );
    const open = buildSubmarineHatchGeometry().applyMatrix4(
      placeSubmarineHatch(1),
    );
    expect(findHighest(shut)).toBeLessThan(subHatch.y + 0.3);
    expect(findHighest(open)).toBeGreaterThan(subHatch.y + 0.5);
    [1, -1].forEach((side) => {
      const brow = buildSubmarineBrowGeometry().applyMatrix4(
        placeSubmarineBrow(1, side),
      );
      const reach = Math.max(...listCorners(brow).map(({ x }) => x * side));
      expect(reach).toBeCloseTo(subDeckHalfWidth + subBrowLength, 1);
      const stowed = buildSubmarineBrowGeometry().applyMatrix4(
        placeSubmarineBrow(0, side),
      );
      expect(
        Math.max(...listCorners(stowed).map(({ x }) => x * side)),
      ).toBeLessThan(subDeckHalfWidth + 0.01);
    });
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
  });
});

describe("the Wizzaroo livery", () => {
  it.each([
    ["aeroplane", buildAeroplaneLiveryGeometry],
    ["helicopter", buildHelicopterLiveryGeometry],
    ["hovercraft", buildHovercraftLiveryGeometry],
    ["submarine", buildSubmarineLiveryGeometry],
  ] as const)(
    "paints the flag and the Wizzaroo name on both sides of the %s",
    (_craft, buildLivery) => {
      const livery = buildLivery();
      const uvs = livery.getAttribute("uv");
      const rows = Array.from({ length: uvs.count }, (_, index) =>
        uvs.getY(index),
      );
      expect(rows.some((row) => row > liveryFaceRows.flag.bottom + 0.01)).toBe(
        true,
      );
      expect(rows.some((row) => row < liveryFaceRows.name.top - 0.01)).toBe(
        true,
      );
      const sides = listCorners(livery).map(({ x }) => Math.sign(x));
      expect(sides.filter((side) => side > 0).length).toBe(
        sides.filter((side) => side < 0).length,
      );
      expect(countTriangles(livery)).toBeLessThan(2500);
    },
  );
});

describe.each(islandAdventures.map(({ islandId }) => [islandId] as const))(
  "the hover slipway drawn on %s",
  (islandId) => {
    const adventure = findExploreAdventure(islandId);
    const slipway = buildHoverSlipwayGeometry(adventure);

    it("lies on top of the land and runs down into the sea under the hovercraft's path", () => {
      [-0.5, 0, 0.5].forEach((across) => {
        listShares(40).forEach((share) => {
          const along = findSlipwayEnd(adventure) * share;
          const top = findSlipwayTop(adventure, along, across);
          const { centre, heading } = adventure.hoverPad;
          const point = {
            x:
              centre.x + Math.sin(heading) * along + Math.cos(heading) * across,
            z:
              centre.z + Math.cos(heading) * along - Math.sin(heading) * across,
          };
          expect(top).toBeGreaterThan(adventure.findHeight(point));
          if (top < 0.1) {
            return;
          }
          expect(top).toBeCloseTo(
            Math.max(0, findHoverSurface(adventure, point)) + 0.08,
            0,
          );
        });
      });
      expect(
        findSlipwayTop(adventure, findSlipwayEnd(adventure), 0),
      ).toBeLessThan(0);
    });

    it("is drawn in about a thousand triangles", () => {
      expect(countTriangles(slipway)).toBeGreaterThan(400);
      expect(countTriangles(slipway)).toBeLessThan(2500);
    });
  },
);
