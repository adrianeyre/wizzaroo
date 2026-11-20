import { describe, expect, it } from "vitest";
import {
  findExploreAdventure,
  findWalkSurface,
  findInteractionReach,
  listExploreInteractions,
  scalePlaceForExplore,
} from "./island-adventures.js";
import { listIslandRegions } from "../../curriculum/world-map.js";
import {
  listAttractionRides,
  listPlacedAttractions,
  toIslandPoint,
} from "./island-attractions.js";
import { findObstacleField, findStalledSeconds } from "./island-explore.js";
import { obstacleBodyRadius } from "./island-obstacles.js";
import { buildExploreWorld } from "./island-transport.js";
import { stepWalker, buildStartingWalker } from "./island-walker.js";

const islandIds = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

const prepare = (islandId: string) => {
  const world = buildExploreWorld(findExploreAdventure(islandId));
  const field = findObstacleField(world);
  field.prepareAll();
  const standingAt = (point: { x: number; z: number }) =>
    Math.max(0, findWalkSurface(world, point, Infinity).height);
  return { world, field, standingAt };
};

describe.each(islandIds)("everything solid on %s", (islandId) => {
  const { world, field, standingAt } = prepare(islandId);

  it("leaves the Character's starting spot clear", () => {
    const start = world.adventure.start;
    expect(
      field.obstacles.isBlocked(start, standingAt(start), obstacleBodyRadius),
    ).toBe(false);
  });

  it("leaves the start of every ride clear, so every ride can be had", () => {
    const blocked = listAttractionRides(world.adventure)
      .map(({ attraction, ride }) => ({
        name: `${attraction.kind}: ${ride.name}`,
        start: toIslandPoint(attraction, ride.start),
      }))
      .filter(({ start }) =>
        field.obstacles.isBlocked(start, standingAt(start), obstacleBodyRadius),
      )
      .map(({ name }) => name);
    expect(blocked).toEqual([]);
  });

  it("makes every Attraction and Curiosity solid", () => {
    const hollow = listPlacedAttractions(islandId).filter((attraction) => {
      const { footprint } = attraction.model;
      let isAnyBlocked = false;
      for (let x = -footprint; x <= footprint && !isAnyBlocked; x += 0.25) {
        for (let z = -footprint; z <= footprint && !isAnyBlocked; z += 0.25) {
          const point = toIslandPoint(attraction, { x, z });
          isAnyBlocked = field.obstacles.isBlocked(
            point,
            standingAt(point),
            0.1,
          );
        }
      }
      return !isAnyBlocked;
    });
    expect(hollow.map(({ kind }) => kind)).toEqual([]);
  });

  it("lets the Character reach every place to visit from somewhere clear", () => {
    const places = listIslandRegions(islandId).map(scalePlaceForExplore);
    const isBlocked = (point: { x: number; z: number }) =>
      field.obstacles.isBlocked(point, standingAt(point), obstacleBodyRadius);
    const unreachable = listExploreInteractions(world.adventure, places).filter(
      (interaction) => {
        const { position } = interaction;
        const reach = findInteractionReach(interaction);
        return [1.4, reach / 2, reach - 0.1]
          .flatMap((distance) =>
            Array.from({ length: 32 }, (_, step) => {
              const angle = (step / 32) * Math.PI * 2;
              return {
                x: position.x + Math.cos(angle) * distance,
                z: position.z + Math.sin(angle) * distance,
              };
            }),
          )
          .every(isBlocked);
      },
    );
    expect(unreachable.map(({ id }) => id)).toEqual([]);
  });
});

describe("walking on an Island", () => {
  it("stops the Character walking through a tree on Meadow Isle", () => {
    const { world, field } = prepare("meadow-isle");
    const trunk = [...field.grid.cells.keys()]
      .map((key) => ({
        x: (Math.floor(key / 65536) - 32768 + 0.5) * 0.25,
        z: ((key % 65536) - 32768 + 0.5) * 0.25,
      }))
      .find((point) => {
        const y = findWalkSurface(world, point, Infinity).height;
        return (
          y > 1 &&
          field.obstacles.isBlocked(point, y, 0.05) &&
          !field.obstacles.isBlocked({ x: point.x - 3, z: point.z }, y, 0.3)
        );
      });
    expect(trunk).toBeDefined();
    if (trunk === undefined) {
      return;
    }
    let walker = buildStartingWalker(
      world,
      { x: trunk.x - 3, z: trunk.z },
      Math.PI / 2,
    );
    for (let frame = 0; frame < 120; frame++) {
      walker = stepWalker(
        walker,
        { x: 1, z: 0, wantsJump: false },
        1 / 60,
        world,
        [],
        field.obstacles,
      );
      expect(
        field.obstacles.isBlocked(walker, walker.y, obstacleBodyRadius - 0.02),
      ).toBe(false);
    }
    expect(walker.x).toBeLessThan(trunk.x);
  });

  it("gives up walking to a tapped spot that something solid is in the way of", () => {
    let stalled = 0;
    for (let frame = 0; frame < 60; frame++) {
      stalled = findStalledSeconds(stalled, true, 0, 1 / 60);
    }
    expect(stalled).toBeGreaterThan(0.8);
    expect(findStalledSeconds(stalled, true, 0.1, 1 / 60)).toBe(0);
    expect(findStalledSeconds(stalled, false, 0, 1 / 60)).toBe(0);
  });
});
