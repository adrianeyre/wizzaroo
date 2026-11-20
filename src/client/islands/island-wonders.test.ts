import { describe, expect, it } from "vitest";
import { findRunwayOffset, type MapPoint } from "../world-map-terrain.js";
import {
  buildAdventureWorld,
  exploreScale,
  findExploreAdventure,
  findIslandAdventure,
  findWalkSurface,
  islandAdventures,
  listAdventurePlaces,
} from "./island-adventures.js";
import {
  buildStartingWalker,
  findIntentTowards,
  stepWalker,
  type Walker,
} from "./island-walker.js";
import {
  buildWondersGeometry,
  caveInnerHeight,
  caveInnerRadius,
  fallsBehindSpot,
  fallsLipHeight,
  fallsSideWay,
  findCave,
  findLanternGlow,
  isInsideCave,
  listIslandWonders,
  listWonderBlockers,
  placeIslandWonders,
  placeOnWonder,
  scatterFlowers,
  scatterGrove,
  wonderFootprints,
  type PlacedWonder,
} from "./island-wonders.js";

const islandIds = islandAdventures.map(({ islandId }) => [islandId] as const);

const findDistance = (from: MapPoint, to: MapPoint): number =>
  Math.hypot(from.x - to.x, from.z - to.z);

const walkThrough = (islandId: string, route: readonly MapPoint[]): Walker => {
  const adventure = findExploreAdventure(islandId);
  const world = buildAdventureWorld(adventure);
  const blockers = listWonderBlockers(adventure);
  let walker = buildStartingWalker(world, route[0], 0);
  route.slice(1).forEach((target) => {
    for (let step = 0; step < 900; step++) {
      const intent = findIntentTowards(walker, target, 0.3);
      if (intent === undefined) {
        return;
      }
      walker = stepWalker(walker, intent, 1 / 30, world, blockers);
    }
  });
  return walker;
};

const findWonder = (islandId: string, kind: string): PlacedWonder => {
  const wonder = placeIslandWonders(findExploreAdventure(islandId)).find(
    (placed) => placed.kind === kind,
  );
  if (wonder === undefined) {
    throw new Error(`No ${kind} on ${islandId}`);
  }
  return wonder;
};

describe.each(islandIds)("the wonders of %s", (islandId) => {
  const adventure = findIslandAdventure(islandId);

  it("fills both new lands with wonders, a hot-air balloon among them", () => {
    const wonders = listIslandWonders(islandId);
    expect(wonders.length).toBeGreaterThanOrEqual(3);
    expect(wonders.map(({ kind }) => kind)).toContain("balloon");
    wonders.forEach(({ position }) => {
      expect(Math.abs(position.x)).toBeGreaterThan(34);
      expect(adventure.findHeight(position)).toBeGreaterThan(0.4);
    });
    expect(
      new Set(wonders.map(({ position }) => Math.sign(position.x))).size,
    ).toBe(2);
  });

  it("keeps every wonder off the Runway, the Helipad, the Balloon Field, the Dock and the Island's places", () => {
    const { runway, helipad, balloonField } = adventure.airfield;
    listIslandWonders(islandId).forEach(({ kind, position }) => {
      const reach = wonderFootprints[kind];
      const { along, across } = findRunwayOffset(runway, position);
      expect(
        Math.abs(along) > 7.5 + reach || Math.abs(across) > 1.5 + reach,
      ).toBe(true);
      expect(findDistance(position, helipad.centre)).toBeGreaterThan(
        1.8 + reach,
      );
      expect(findDistance(position, balloonField.centre)).toBeGreaterThan(
        1.6 + reach,
      );
      listAdventurePlaces(adventure).forEach((place) => {
        expect(findDistance(position, place)).toBeGreaterThan(reach + 1);
      });
      expect(adventure.findCourseKind(position)).toBeUndefined();
    });
  });

  it("grows a grove of trees and patches of flowers on the new lands, clear of places and water", () => {
    const explore = findExploreAdventure(islandId);
    const places = listAdventurePlaces(explore);
    const trees = scatterGrove(explore);
    const flowers = scatterFlowers(explore);
    expect(trees.length).toBeGreaterThan(40);
    expect(flowers.length).toBeGreaterThan(80);
    [...trees, ...flowers].forEach((thing) => {
      expect(Math.abs(thing.x)).toBeGreaterThan(34 * exploreScale);
      expect(explore.findCourseKind(thing)).toBeUndefined();
      places.forEach((place) => {
        expect(findDistance(thing, place)).toBeGreaterThan(1.4 * exploreScale);
      });
    });
  });

  it("builds its wonders in a single merged mesh of a few thousand triangles", () => {
    const geometry = buildWondersGeometry(findExploreAdventure(islandId));
    const triangles = geometry.getAttribute("position").count / 3;
    expect(triangles).toBeGreaterThan(300);
    expect(triangles).toBeLessThan(15_000);
  });
});

describe("the waterfall on Jungle Reach", () => {
  const falls = findWonder("jungle-reach", "walk-behind-falls");
  const adventure = findExploreAdventure("jungle-reach");
  const world = buildAdventureWorld(adventure);

  it("has a dry ledge behind the falling water", () => {
    const behind = placeOnWonder(falls, fallsBehindSpot);
    const surface = findWalkSurface(
      world,
      behind,
      adventure.findHeight(behind),
    );
    expect(["ground", "trail"]).toContain(surface.kind);
    expect(fallsBehindSpot.z).toBeLessThan(-0.9);
    expect(fallsLipHeight - (surface.height - falls.ground)).toBeGreaterThan(5);
  });

  it("lets the Character walk round the pool and in behind the water", () => {
    const front = placeOnWonder(falls, { x: 0, z: 7 });
    const behind = placeOnWonder(falls, fallsBehindSpot);
    const walker = walkThrough("jungle-reach", [
      front,
      placeOnWonder(falls, { x: fallsSideWay.x, z: 5 }),
      placeOnWonder(falls, fallsSideWay),
      placeOnWonder(falls, { x: fallsSideWay.x, z: fallsBehindSpot.z }),
      behind,
    ]);
    expect(findDistance(walker, behind)).toBeLessThan(0.6);
  });

  it("stops the Character walking through the cliff behind the ledge", () => {
    const behind = placeOnWonder(falls, fallsBehindSpot);
    const intoCliff = placeOnWonder(falls, { x: 0, z: -9 });
    const walker = walkThrough("jungle-reach", [behind, intoCliff]);
    expect(findDistance(walker, intoCliff)).toBeGreaterThan(4);
  });
});

describe("the lantern-lit cave on Ember Isle", () => {
  const adventure = findExploreAdventure("ember-isle");
  const cave = findCave(adventure);

  it("is roofed over high enough for the Character to stand in", () => {
    expect(cave).toBeDefined();
    expect(caveInnerHeight).toBeGreaterThan(3);
    expect(caveInnerRadius).toBeGreaterThan(4);
  });

  it("lets the Character walk in through its doorway to the middle", () => {
    if (cave === undefined) {
      throw new Error("No cave");
    }
    const outside = placeOnWonder(cave, { x: 0, z: 10 });
    const walker = walkThrough("ember-isle", [outside, cave.centre]);
    expect(findDistance(walker, cave.centre)).toBeLessThan(0.6);
    expect(isInsideCave(cave, walker)).toBe(true);
  });

  it("keeps the Character inside its rock walls", () => {
    if (cave === undefined) {
      throw new Error("No cave");
    }
    const walker = walkThrough("ember-isle", [
      cave.centre,
      placeOnWonder(cave, { x: 0, z: -12 }),
    ]);
    expect(findDistance(walker, cave.centre)).toBeLessThan(caveInnerRadius);
  });

  it("lights the Character's lantern inside and puts it out away from the cave", () => {
    if (cave === undefined) {
      throw new Error("No cave");
    }
    expect(findLanternGlow(cave, cave.centre)).toBe(1);
    expect(findLanternGlow(cave, placeOnWonder(cave, { x: 0, z: 20 }))).toBe(0);
    expect(findLanternGlow(undefined, cave.centre)).toBe(0);
  });

  it("is on only one Island", () => {
    const caves = islandAdventures.filter(({ islandId }) =>
      listIslandWonders(islandId).some(({ kind }) => kind === "lantern-cave"),
    );
    expect(caves.map(({ islandId }) => islandId)).toEqual(["ember-isle"]);
  });
});
