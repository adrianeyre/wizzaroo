import { describe, expect, it } from "vitest";
import { worldMap } from "../../curriculum/world-map.js";
import { islands } from "../../curriculum/islands.js";
import { lighthousePosition } from "../world-map-terrain.js";
import { walkSpeed } from "./island-walker.js";
import { findDropStart } from "./island-explore-hud.js";
import {
  findBerth,
  findPierWaitingSpot,
  placeOnShip,
  shipLength,
} from "./island-voyage.js";
import {
  buildAdventureWorld,
  exploreScale,
  findBridgeDeck,
  findDistanceToTrail,
  pierDeckHeight,
  swimDepth,
  trailHalfWidth,
  findExploreAdventure,
  findIslandAdventure,
  findWalkSurface,
  hasIslandAdventure,
  isInsideExploreBounds,
  IslandWithoutAdventureError,
  keepInsideExploreBounds,
  listExploreInteractions,
  listNearbyInteractions,
  listTreasuresInReach,
  scalePlaceForExplore,
  type AdventureWorld,
  type IslandAdventure,
} from "./island-adventures.js";

const everyAdventure = worldMap.islands.map(({ id }) =>
  findExploreAdventure(id),
);

const walkAlongTrail = (
  world: AdventureWorld,
  trail: readonly { x: number; z: number }[],
) => {
  const steps = trail.slice(1).flatMap((end, index) => {
    const start = trail[index];
    const count = Math.ceil(Math.hypot(end.x - start.x, end.z - start.z) / 0.1);
    return Array.from({ length: count }, (_, step) => ({
      x: start.x + ((end.x - start.x) * step) / count,
      z: start.z + ((end.z - start.z) * step) / count,
    }));
  });
  let height = Math.max(0, world.adventure.findHeight(steps[0]));
  return steps.map((point) => {
    const surface = findWalkSurface(world, point, height);
    height = surface.height;
    return { point, surface };
  });
};

const listRegionsOn = (islandId: string) =>
  worldMap.regions
    .filter((region) => region.islandId === islandId)
    .map(scalePlaceForExplore);

describe("island adventures", () => {
  it("gives every Island on the World Map something to explore", () => {
    expect(
      worldMap.islands.filter(({ id }) => !hasIslandAdventure(id)),
    ).toStrictEqual([]);
    expect(everyAdventure).toHaveLength(6);
  });

  it("refuses to explore an Island it has no adventure for", () => {
    expect(() => findIslandAdventure("cloud-isle")).toThrow(
      IslandWithoutAdventureError,
    );
    expect(() => findExploreAdventure("cloud-isle")).toThrow(
      IslandWithoutAdventureError,
    );
  });

  it("explores every Island at six times the size it has on the World Map", () => {
    const onMap = findIslandAdventure("meadow-isle");
    const explored = findExploreAdventure("meadow-isle");
    const [mapSign] = onMap.signs;
    const [exploredSign] = explored.signs;
    expect(exploreScale).toBe(6);
    expect(exploredSign.position).toStrictEqual({
      x: mapSign.position.x * exploreScale,
      z: mapSign.position.z * exploreScale,
    });
    expect(explored.findHeight(exploredSign.position)).toBeCloseTo(
      onMap.findHeight(mapSign.position) * exploreScale,
    );
    expect(
      explored.lookouts.find(({ id }) => id === "lighthouse")?.viewHeight,
    ).toBe(
      (onMap.lookouts.find(({ id }) => id === "lighthouse")?.viewHeight ?? 0) *
        exploreScale,
    );
    expect(
      explored.lookouts.find(({ id }) => id === "meadow-watchtower")
        ?.viewHeight,
    ).toBe(
      onMap.lookouts.find(({ id }) => id === "meadow-watchtower")?.viewHeight,
    );
  });

  describe.each(
    everyAdventure.map((adventure) => [adventure.islandId, adventure] as const),
  )("%s", (_islandId, adventure: IslandAdventure) => {
    const world = buildAdventureWorld(adventure);

    it("starts the Child on dry land", () => {
      const surface = findWalkSurface(world, adventure.start, Infinity);
      expect(["ground", "trail", "bridge"]).toContain(surface.kind);
    });

    it("hides a hundred and four treasures, one in each new lake and on each new summit, each somewhere a Child can reach", () => {
      expect(adventure.treasures).toHaveLength(104);
      expect(new Set(adventure.treasures.map(({ id }) => id)).size).toBe(104);
      adventure.treasures.forEach(({ position }) => {
        expect(isInsideExploreBounds(position)).toBe(true);
        expect(findWalkSurface(world, position, Infinity).kind).not.toBe(
          "lava",
        );
      });
    });

    it("puts every lookout, sign and bounce pad inside the explorable sea", () => {
      [
        ...adventure.lookouts.map(({ position }) => position),
        ...adventure.signs.map(({ position }) => position),
        ...adventure.bouncePads.places,
        ...adventure.hideaways.map(({ position }) => position),
      ].forEach((place) => {
        expect(isInsideExploreBounds(place)).toBe(true);
        expect(findWalkSurface(world, place, Infinity).kind).not.toBe("lava");
      });
    });

    it("has a lookout to climb and facts to read", () => {
      expect(adventure.lookouts.length).toBeGreaterThanOrEqual(7);
      expect(adventure.signs.length).toBeGreaterThanOrEqual(24);
      expect(adventure.bouncePads.places.length).toBeGreaterThanOrEqual(20);
      adventure.signs.forEach(({ fact }) => {
        expect(fact.length).toBeGreaterThan(20);
      });
    });

    it("hides twenty hideaways on dry land, each with something to discover", () => {
      expect(adventure.hideaways).toHaveLength(20);
      adventure.hideaways.forEach(({ position, discovery }) => {
        expect(findWalkSurface(world, position, Infinity).kind).toMatch(
          /^(ground|trail)$/,
        );
        expect(discovery.length).toBeGreaterThan(20);
      });
    });

    it("has twelve friendly animals on dry land, each with something to say", () => {
      expect(adventure.friends).toHaveLength(12);
      expect(new Set(adventure.friends.map(({ id }) => id)).size).toBe(12);
      adventure.friends.forEach(({ position, name, greeting }) => {
        expect(findWalkSurface(world, position, Infinity).kind).toMatch(
          /^(ground|trail)$/,
        );
        expect(name).toContain(adventure.friendKind.singular);
        expect(greeting.length).toBeGreaterThan(20);
      });
    });

    it("hides a treasure out in each new lake, to swim to, and on each new summit", () => {
      ["east-lake", "west-lake", "east-summit", "west-summit"].forEach(
        (place) => {
          const treasure = adventure.treasures.find(({ id }) =>
            id.endsWith(place),
          );
          expect(treasure, place).toBeDefined();
        },
      );
      const lakeTreasures = adventure.treasures.filter(({ id }) =>
        id.endsWith("-lake"),
      );
      lakeTreasures.forEach(({ position }) => {
        expect(findWalkSurface(world, position, Infinity).kind).toBe("water");
      });
    });

    it("lays out a Ring Race on each of its new lands, with eight rings on the trails and time to run them", () => {
      expect(adventure.races).toHaveLength(2);
      adventure.races.forEach(({ rings, seconds }) => {
        expect(rings).toHaveLength(8);
        rings.forEach((ring) => {
          expect(findDistanceToTrail(adventure, ring)).toBeLessThan(
            trailHalfWidth,
          );
          expect(findWalkSurface(world, ring, Infinity).kind).toMatch(
            /^(trail|bridge)$/,
          );
        });
        const runLength = rings
          .slice(1)
          .reduce(
            (total, ring, index) =>
              total +
              Math.hypot(ring.x - rings[index].x, ring.z - rings[index].z),
            0,
          );
        expect(seconds).toBeGreaterThan(runLength / (walkSpeed * 1.35));
      });
    });

    it("builds a Dock whose pier runs from the shore out into deep water", () => {
      const { from, to } = adventure.dock;
      expect(adventure.findHeight(from)).toBeGreaterThan(0);
      expect(adventure.findHeight(to)).toBeLessThan(-swimDepth);
      expect(isInsideExploreBounds(to)).toBe(true);
      const waiting = findPierWaitingSpot(adventure.dock);
      expect(findWalkSurface(world, waiting, pierDeckHeight)).toStrictEqual({
        height: pierDeckHeight,
        kind: "bridge",
      });
    });

    it("berths the ship beside the pier in open water", () => {
      const berth = findBerth(adventure.dock);
      [-1, 0, 1].forEach((along) => {
        const point = placeOnShip(berth, { x: 0, z: (along * shipLength) / 2 });
        expect(adventure.findHeight(point)).toBeLessThan(0);
      });
      expect(findDistanceToTrail(adventure, adventure.dock.from)).toBeLessThan(
        trailHalfWidth,
      );
    });

    it("offers to visit the Dock from anywhere on the pier", () => {
      const nearby = listNearbyInteractions(
        listExploreInteractions(adventure, []),
        findPierWaitingSpot(adventure.dock),
      );
      expect(nearby.map(({ kind }) => kind)).toContain("dock");
    });

    it("lets a Child walk every trail without swimming or touching lava", () => {
      adventure.trails.forEach((trail) => {
        const wetSteps = walkAlongTrail(world, trail).filter(
          ({ surface }) => surface.kind === "water" || surface.kind === "lava",
        );
        expect(wetSteps.map(({ point }) => point)).toStrictEqual([]);
      });
    });

    it("links every Region to the trails", () => {
      listRegionsOn(adventure.islandId).forEach(({ mapPosition }) => {
        const nearestTrailPoint = Math.min(
          ...adventure.trails
            .flat()
            .map((point) =>
              Math.hypot(point.x - mapPosition.x, point.z - mapPosition.z),
            ),
        );
        expect(nearestTrailPoint).toBeLessThan(3.5 * exploreScale);
      });
    });

    it("surrounds the Island with sea to swim in", () => {
      expect(
        findWalkSurface(world, { x: 0, z: 22 * exploreScale }, 0).kind,
      ).toBe("water");
    });
  });

  it("draws an Island landform for every Island in the curriculum it explores", () => {
    islands.forEach(({ id }) => {
      expect(hasIslandAdventure(id)).toBe(true);
    });
  });

  it("carries a Child over Meadow Isle's river on the stone bridge", () => {
    const world = buildAdventureWorld(findExploreAdventure("meadow-isle"));
    const [stoneBridge] = world.bridges;
    const middle = {
      x: (stoneBridge.from.x + stoneBridge.to.x) / 2,
      z: (stoneBridge.from.z + stoneBridge.to.z) / 2,
    };
    expect(world.adventure.findHeight(middle)).toBeLessThan(0);
    expect(
      findWalkSurface(world, middle, stoneBridge.middleHeight),
    ).toStrictEqual({
      height: findBridgeDeck(
        stoneBridge,
        middle,
        world.adventure.findHeight(middle),
      ),
      kind: "bridge",
    });
    expect(findWalkSurface(world, middle, -0.4).kind).toBe("water");
  });

  it("builds iron bridges where Ember Isle's trails cross the lava", () => {
    const world = buildAdventureWorld(findExploreAdventure("ember-isle"));
    const ironBridges = world.bridges.filter(
      ({ material }) => material === "iron",
    );
    expect(ironBridges.length).toBeGreaterThanOrEqual(2);
  });

  it("swims a Child out to Meadow Isle's lighthouse rock", () => {
    const world = buildAdventureWorld(findExploreAdventure("meadow-isle"));
    const beside = {
      x: lighthousePosition.x * exploreScale - 2.8,
      z: lighthousePosition.z * exploreScale,
    };
    expect(findWalkSurface(world, beside, 0).kind).toBe("water");
    const nearby = listNearbyInteractions(
      listExploreInteractions(world.adventure, []),
      beside,
    );
    expect(nearby.map(({ id }) => id)).toContain("lighthouse");
  });

  it.each(["meadow-isle", "jungle-reach", "starfall-isle"])(
    "offers to go into the Challenge Arena when the Child walks up to it on %s",
    (islandId) => {
      const regions = listRegionsOn(islandId);
      const arena = regions.find(({ id }) => id === "challenge-arena");
      expect(arena).toBeDefined();
      const nearby = listNearbyInteractions(
        listExploreInteractions(findExploreAdventure(islandId), regions),
        {
          x: (arena?.mapPosition.x ?? 0) + 1,
          z: arena?.mapPosition.z ?? 0,
        },
      );
      expect(nearby.at(0)).toMatchObject({
        kind: "region",
        id: "challenge-arena",
      });
    },
  );

  it("only offers what is within reach, nearest first", () => {
    const adventure = findExploreAdventure("frost-isle");
    const regions = listRegionsOn("frost-isle");
    const library = regions.find(({ id }) => id === "snowdrift-library");
    expect(library).toBeDefined();
    const nearLibrary = {
      x: (library?.mapPosition.x ?? 0) + 1,
      z: library?.mapPosition.z ?? 0,
    };
    const nearby = listNearbyInteractions(
      listExploreInteractions(adventure, regions),
      nearLibrary,
    );
    expect(nearby.at(0)).toMatchObject({
      kind: "region",
      id: "snowdrift-library",
    });
    expect(
      listNearbyInteractions(listExploreInteractions(adventure, regions), {
        x: 0,
        z: 40,
      }),
    ).toStrictEqual([]);
  });

  it("finds a treasure only when the Child reaches it, and only once", () => {
    const world = buildAdventureWorld(findExploreAdventure("starfall-isle"));
    const [treasure] = world.adventure.treasures;
    const height = Math.max(0, world.adventure.findHeight(treasure.position));
    expect(
      listTreasuresInReach(world, { ...treasure.position, y: height }, []).map(
        ({ id }) => id,
      ),
    ).toStrictEqual([treasure.id]);
    expect(
      listTreasuresInReach(world, { ...treasure.position, y: height }, [
        treasure.id,
      ]),
    ).toStrictEqual([]);
    expect(
      listTreasuresInReach(
        world,
        { x: treasure.position.x + 3, z: treasure.position.z, y: height },
        [],
      ),
    ).toStrictEqual([]);
  });

  it("keeps a Child inside the sea around the Island", () => {
    expect(keepInsideExploreBounds({ x: 0, z: 0 })).toStrictEqual({
      x: 0,
      z: 0,
    });
    const kept = keepInsideExploreBounds({ x: 600, z: 0 });
    expect(isInsideExploreBounds(kept)).toBe(true);
    expect(kept.x).toBeGreaterThan(180);
  });
});

describe("dropping the walker onto an Island", () => {
  it("starts the Character where the walker lands on dry ground", () => {
    const adventure = findExploreAdventure("meadow-isle");
    const [sign] = findIslandAdventure("meadow-isle").signs;
    expect(findDropStart(adventure, sign.position)).toStrictEqual({
      x: sign.position.x * exploreScale,
      z: sign.position.z * exploreScale,
    });
  });

  it("starts the Character on the nearest dry ground when the walker lands in the sea", () => {
    const adventure = findExploreAdventure("frost-isle");
    const world = buildAdventureWorld(adventure);
    const start = findDropStart(adventure, { x: 0, z: 23 });
    expect(["ground", "trail", "bridge"]).toContain(
      findWalkSurface(world, start, Infinity).kind,
    );
    expect(Math.hypot(start.x, start.z - 23 * exploreScale)).toBeLessThan(60);
  });
});
