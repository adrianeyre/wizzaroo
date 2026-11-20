import { describe, expect, it } from "vitest";
import { worldMap } from "../../curriculum/world-map.js";
import { findDistanceToSegment } from "../world-map-terrain.js";
import { buildStartingWalker, stepWalker } from "./island-walker.js";
import {
  buildAdventureWorld,
  findExploreAdventure,
  findIslandAdventure,
} from "./island-adventures.js";
import {
  buildVoyageCourse,
  buildVoyageRoute,
  findBerth,
  findCarriedSpot,
  findCrossingPlacement,
  findCrossingSeconds,
  findNextVoyagePhase,
  findPierWaitingSpot,
  findShipPlacement,
  findGangway,
  findPlankReach,
  isCarriedByVoyage,
  isWalkingTheGangway,
  listShipBlockers,
  placeOnMap,
  shipBeam,
  type VoyagePhase,
} from "./island-voyage.js";

const ports = worldMap.islands.map(({ id, seaPosition }) => ({
  islandId: id,
  seaPosition,
}));

const everyVoyage = ports.flatMap((from) =>
  ports
    .filter((to) => to.islandId !== from.islandId)
    .map((to) => [from.islandId, to.islandId, from, to] as const),
);

const findSeaFloor = (point: { x: number; z: number }): number =>
  Math.max(
    ...ports.map(({ islandId, seaPosition }) =>
      findIslandAdventure(islandId).findHeight({
        x: point.x - seaPosition.x,
        z: point.z - seaPosition.z,
      }),
    ),
  );

const findDistance = (
  from: { x: number; z: number },
  to: { x: number; z: number },
) => Math.hypot(from.x - to.x, from.z - to.z);

describe("sailing between Islands", () => {
  it.each(everyVoyage)(
    "sails from %s to %s without touching land",
    (_from, _to, from, to) => {
      const course = buildVoyageCourse(buildVoyageRoute(from, to));
      Array.from({ length: 301 }, (_, step) =>
        course.getPointAt(step / 300),
      ).forEach((point) => {
        expect(findSeaFloor(point)).toBeLessThan(0);
      });
    },
  );

  it.each(everyVoyage)(
    "takes a short, watchable crossing from %s to %s",
    (_from, _to, from, to) => {
      const seconds = findCrossingSeconds(buildVoyageRoute(from, to));
      expect(seconds).toBeGreaterThanOrEqual(5);
      expect(seconds).toBeLessThanOrEqual(12);
    },
  );

  it("picks up where the ship left one Dock and ends where it sails into the other, sailing bow first", () => {
    const [meadow, frost] = ports;
    const course = buildVoyageCourse(buildVoyageRoute(meadow, frost));
    expect(
      findDistance(
        findCrossingPlacement(course, 0),
        placeOnMap(meadow, "departing", 1),
      ),
    ).toBeLessThan(0.01);
    expect(
      findDistance(
        findCrossingPlacement(course, 1),
        placeOnMap(frost, "docking", 0),
      ),
    ).toBeLessThan(0.01);
    const halfway = findCrossingPlacement(course, 0.5);
    const ahead = findCrossingPlacement(course, 0.52);
    expect(Math.atan2(ahead.x - halfway.x, ahead.z - halfway.z)).toBeCloseTo(
      halfway.heading,
      1,
    );
  });
});

const cabinHalfWidth = 1.9;
const cabinFront = -2.5;

describe("the voyage", () => {
  it("calls the ship, boards, sets sail and crosses, then docks, lands and lets the ship leave", () => {
    const followPhases = (phase: VoyagePhase): VoyagePhase[] => {
      const next = findNextVoyagePhase(phase);
      return next === undefined ? [phase] : [phase, ...followPhases(next)];
    };
    expect(followPhases("calling")).toStrictEqual([
      "calling",
      "boarding",
      "departing",
      "crossing",
    ]);
    expect(followPhases("docking")).toStrictEqual([
      "docking",
      "landing",
      "leaving",
    ]);
  });

  it("carries the Child until they step off onto the pier", () => {
    const carried: (VoyagePhase | undefined)[] = [
      "calling",
      "boarding",
      "departing",
      "crossing",
      "docking",
      "landing",
    ];
    carried.forEach((phase) => {
      expect(isCarriedByVoyage(phase)).toBe(true);
    });
    expect(isCarriedByVoyage("leaving")).toBe(false);
    expect(isCarriedByVoyage(undefined)).toBe(false);
  });

  it.each(worldMap.islands.map(({ id }) => [id]))(
    "brings the ship in from the open sea to the berth at %s, and sails it away again",
    (islandId) => {
      const { dock } = findExploreAdventure(islandId);
      const berth = findBerth(dock);
      const farOut = findShipPlacement(dock, "calling", 0);
      expect(findDistance(farOut, berth)).toBeGreaterThan(80);
      expect(findShipPlacement(dock, "docking", 1)).toStrictEqual(berth);
      const gone = findShipPlacement(dock, "leaving", 1);
      expect(findDistance(gone, berth)).toBeGreaterThan(80);
      expect(gone.heading).toBeCloseTo(berth.heading + Math.PI);
    },
  );

  it.each(worldMap.islands.map(({ id }) => [id]))(
    "keeps the ship's hull clear of the Character on %s's pier while it turns and sails away",
    (islandId) => {
      const { dock } = findExploreAdventure(islandId);
      const waiting = findPierWaitingSpot(dock);
      Array.from({ length: 51 }, (_, step) => step / 50).forEach((share) => {
        listShipBlockers(findShipPlacement(dock, "leaving", share)).forEach(
          ({ centre, radius }) => {
            expect(findDistance(centre, waiting)).toBeGreaterThan(radius + 1);
          },
        );
      });
    },
  );

  it("stops a Child walking off the pier into the ship while it is still berthed", () => {
    const adventure = findExploreAdventure("frost-isle");
    const world = buildAdventureWorld(adventure);
    const berth = findBerth(adventure.dock);
    const blockers = listShipBlockers(berth);
    let walker = buildStartingWalker(
      world,
      findPierWaitingSpot(adventure.dock),
      0,
    );
    Array.from({ length: 180 }).forEach(() => {
      const towardsShip = Math.hypot(berth.x - walker.x, berth.z - walker.z);
      walker = stepWalker(
        walker,
        {
          x: (berth.x - walker.x) / towardsShip,
          z: (berth.z - walker.z) / towardsShip,
          wantsJump: false,
        },
        1 / 60,
        world,
        blockers,
      );
    });
    expect(Math.hypot(walker.x - berth.x, walker.z - berth.z)).toBeGreaterThan(
      shipBeam / 2 - 0.2,
    );
  });

  it.each(worldMap.islands.map(({ id }) => [id]))(
    "waits on %s's pier until the ship's plank is out, then walks the plank onto the open deck, clear of the cabin",
    (islandId) => {
      const adventure = findExploreAdventure(islandId);
      const { dock } = adventure;
      const berth = findBerth(dock);
      const waiting = findPierWaitingSpot(dock);
      const onPier = findCarriedSpot(adventure, "calling", 0.5);
      expect(findDistance(onPier, waiting)).toBeLessThan(0.01);
      expect(findPlankReach("calling", 1)).toBe(0);
      expect(findPlankReach("boarding", 0.3)).toBe(1);
      expect(
        findDistance(findCarriedSpot(adventure, "boarding", 0.2), waiting),
      ).toBeLessThan(0.01);
      expect(isWalkingTheGangway("boarding", 0.6)).toBe(true);

      const { pierEnd, shipEnd } = findGangway(dock, berth);
      Array.from({ length: 41 }, (_, step) => 0.3 + (step / 40) * 0.7).forEach(
        (share) => {
          const spot = findCarriedSpot(adventure, "boarding", share);
          const onShip = {
            x:
              Math.cos(berth.heading) * (spot.x - berth.x) -
              Math.sin(berth.heading) * (spot.z - berth.z),
            z:
              Math.sin(berth.heading) * (spot.x - berth.x) +
              Math.cos(berth.heading) * (spot.z - berth.z),
          };
          const isInCabin =
            Math.abs(onShip.x) < cabinHalfWidth && onShip.z < cabinFront;
          expect(isInCabin).toBe(false);
        },
      );
      expect(
        findDistanceToSegment(
          findCarriedSpot(adventure, "boarding", 0.65),
          pierEnd,
          shipEnd,
        ),
      ).toBeLessThan(0.3);

      const aboard = findCarriedSpot(adventure, "boarding", 1);
      expect(
        findDistance(findCarriedSpot(adventure, "departing", 0), aboard),
      ).toBeLessThan(0.01);
      expect(findPlankReach("departing", 0.2)).toBe(0);
      const landed = findCarriedSpot(adventure, "landing", 1);
      expect(findDistance(landed, waiting)).toBeLessThan(0.01);
    },
  );
});
