import { describe, expect, it } from "vitest";
import { worldMap } from "../../curriculum/world-map.js";
import {
  buildAdventureWorld,
  findExploreAdventure,
  findIslandAdventure,
  findWalkSurface,
  islandAdventures,
} from "./island-adventures.js";
import {
  aircraftPhaseSeconds,
  balloonBasketFloor,
  balloonBasketHalfWidth,
  findAircraftPlacement,
  findBurnerBlast,
  type Aircraft,
  type LandPhase,
} from "./island-flight.js";
import {
  buildJourneyCourse,
  buildJourneyRoute,
  chooseTransport,
  findCraftPlacement,
  findJourneyCarriedSpot,
  findJourneyCrossingSeconds,
  findJourneyWaitingSpot,
  isWalkingAboard,
  listCraftBlockers,
  placeCraftOnMap,
  transports,
} from "./island-journey.js";
import {
  findCarriedSpot,
  findPierWaitingSpot,
  findShipPlacement,
} from "./island-voyage.js";

const aircraft: readonly Aircraft[] = ["aeroplane", "helicopter", "balloon"];

const ports = worldMap.islands.map(({ id, seaPosition }) => ({
  islandId: id,
  seaPosition,
}));

const everyFlight = aircraft.flatMap((transport) =>
  ports.flatMap((from) =>
    ports
      .filter((to) => to.islandId !== from.islandId)
      .map((to) => [transport, from.islandId, to.islandId, from, to] as const),
  ),
);

const everyLanding = aircraft.flatMap((transport) =>
  islandAdventures.map(({ islandId }) => [transport, islandId] as const),
);

const findLandingLevel = (islandId: string, transport: Aircraft): number => {
  const { airfield } = findExploreAdventure(islandId);
  return {
    aeroplane: airfield.runway.level,
    helicopter: airfield.helipad.level,
    balloon: airfield.balloonField.level,
  }[transport];
};

const listShares = (steps: number) =>
  Array.from({ length: steps + 1 }, (_, step) => step / steps);

const findGroundUnder = (point: { x: number; z: number }): number =>
  Math.max(
    0,
    ...ports.map(({ islandId, seaPosition }) =>
      findIslandAdventure(islandId).findHeight({
        x: point.x - seaPosition.x,
        z: point.z - seaPosition.z,
      }),
    ),
  );

describe("choosing how to travel", () => {
  it("chooses the ship, the aeroplane, the helicopter, the hovercraft, the submarine or the hot-air balloon, each a sixth of the time", () => {
    expect(chooseTransport(() => 0)).toBe("ship");
    expect(chooseTransport(() => 0.2)).toBe("aeroplane");
    expect(chooseTransport(() => 0.4)).toBe("helicopter");
    expect(chooseTransport(() => 0.55)).toBe("hovercraft");
    expect(chooseTransport(() => 0.7)).toBe("submarine");
    expect(chooseTransport(() => 0.9)).toBe("balloon");
    expect(chooseTransport(() => 0.999_999)).toBe("balloon");
    expect(transports).toStrictEqual([
      "ship",
      "aeroplane",
      "helicopter",
      "hovercraft",
      "submarine",
      "balloon",
    ]);
  });

  it("still sails the ship exactly as before", () => {
    const adventure = findExploreAdventure("frost-isle");
    const ship = findShipPlacement(adventure.dock, "docking", 0.4);
    expect(findCraftPlacement(adventure, "ship", "docking", 0.4)).toStrictEqual(
      { ...ship, y: 0, pitch: 0, roll: 0 },
    );
    expect(
      findJourneyCarriedSpot(adventure, "ship", "boarding", 0.6),
    ).toStrictEqual({
      ...findCarriedSpot(adventure, "boarding", 0.6),
      isInside: false,
    });
    expect(findJourneyWaitingSpot(adventure, "ship")).toStrictEqual(
      findPierWaitingSpot(adventure.dock),
    );
  });
});

describe.each(everyLanding)("the %s on %s", (transport, islandId) => {
  const adventure = findExploreAdventure(islandId);
  const level = findLandingLevel(islandId, transport);

  it("comes in to land without touching the ground, and stops on its landing place", () => {
    listShares(400).forEach((share) => {
      const craft = findAircraftPlacement(
        adventure,
        transport,
        "calling",
        share,
      );
      expect(craft.y).toBeGreaterThanOrEqual(
        Math.max(0, adventure.findHeight(craft)) - 0.01,
      );
    });
    const landed = findAircraftPlacement(adventure, transport, "calling", 1);
    expect(landed.y).toBeCloseTo(level);
    expect(adventure.findHeight(landed)).toBeCloseTo(level);
  });

  it("takes off from where it landed and climbs away without touching the ground", () => {
    const landed = findAircraftPlacement(adventure, transport, "docking", 1);
    const parked = findAircraftPlacement(adventure, transport, "departing", 0);
    expect(parked.x).toBeCloseTo(landed.x);
    expect(parked.z).toBeCloseTo(landed.z);
    listShares(400).forEach((share) => {
      const craft = findAircraftPlacement(
        adventure,
        transport,
        "departing",
        share,
      );
      expect(craft.y).toBeGreaterThanOrEqual(
        Math.max(0, adventure.findHeight(craft)) - 0.01,
      );
    });
    const away = findAircraftPlacement(adventure, transport, "departing", 1);
    expect(away.y - level).toBeGreaterThan(15);
  });

  it("keeps the Character waiting on dry, level ground beside it", () => {
    const waiting = findJourneyWaitingSpot(adventure, transport);
    const world = buildAdventureWorld(adventure);
    const surface = findWalkSurface(world, waiting, level);
    expect(surface.kind === "ground" || surface.kind === "trail").toBe(true);
    expect(surface.height).toBeCloseTo(level, 1);
  });

  it("walks the Character aboard, then lands them beside it", () => {
    const waiting = findJourneyWaitingSpot(adventure, transport);
    const calling = findJourneyCarriedSpot(adventure, transport, "calling", 0);
    expect(calling.x).toBeCloseTo(waiting.x);
    expect(calling.z).toBeCloseTo(waiting.z);
    expect(calling.isInside).toBe(false);
    expect(isWalkingAboard(transport, "boarding", 0.5)).toBe(true);
    const isHiddenAboard = transport !== "balloon";
    expect(
      findJourneyCarriedSpot(adventure, transport, "boarding", 1).isInside,
    ).toBe(isHiddenAboard);
    expect(
      findJourneyCarriedSpot(adventure, transport, "departing", 0.5).isInside,
    ).toBe(isHiddenAboard);
    const landed = findJourneyCarriedSpot(adventure, transport, "landing", 1);
    expect(landed.isInside).toBe(false);
    expect(landed.x).toBeCloseTo(waiting.x);
    expect(landed.z).toBeCloseTo(waiting.z);
    expect(landed.y).toBeCloseTo(level);
  });

  it("is solid while it stands on the ground, and not once it is flying", () => {
    const parked = findCraftPlacement(adventure, transport, "leaving", 0);
    const flying = findCraftPlacement(adventure, transport, "leaving", 1);
    expect(
      listCraftBlockers(adventure, transport, parked).length,
    ).toBeGreaterThan(0);
    expect(listCraftBlockers(adventure, transport, flying)).toStrictEqual([]);
  });

  it("takes a few seconds for each part of the journey", () => {
    const phases: LandPhase[] = [
      "calling",
      "boarding",
      "departing",
      "docking",
      "landing",
      "leaving",
    ];
    phases.forEach((phase) => {
      expect(aircraftPhaseSeconds[transport][phase]).toBeGreaterThan(3);
      expect(aircraftPhaseSeconds[transport][phase]).toBeLessThan(12);
    });
  });
});

describe("riding in the hot-air balloon's basket", () => {
  const adventure = findExploreAdventure("frost-isle");

  it("stands the Character on the basket floor, in view, and carries them up with it", () => {
    const parked = findCraftPlacement(adventure, "balloon", "boarding", 1);
    const aboard = findJourneyCarriedSpot(adventure, "balloon", "boarding", 1);
    expect(aboard.isInside).toBe(false);
    expect(aboard.y - parked.y).toBeCloseTo(balloonBasketFloor);
    expect(Math.hypot(aboard.x - parked.x, aboard.z - parked.z)).toBeLessThan(
      balloonBasketHalfWidth * 0.6,
    );
    const flying = findCraftPlacement(adventure, "balloon", "departing", 0.9);
    const carried = findJourneyCarriedSpot(
      adventure,
      "balloon",
      "departing",
      0.9,
    );
    expect(carried.isInside).toBe(false);
    expect(carried.y - flying.y).toBeGreaterThan(0);
    expect(carried.y - flying.y).toBeLessThan(0.5);
  });

  it("fires its burners to climb away and to soften its landing, and rests them on the ground", () => {
    expect(findBurnerBlast("departing", 0.5)).toBeCloseTo(1);
    expect(findBurnerBlast("calling", 0.35)).toBeCloseTo(1);
    expect(findBurnerBlast("calling", 0.55)).toBe(0);
    expect(findBurnerBlast("boarding", 0.5)).toBe(0);
    expect(findBurnerBlast("landing", 0.5)).toBe(0);
  });
});

describe("flying between Islands", () => {
  it.each(everyFlight)(
    "flies the %s from %s to %s high above the land",
    (transport, _from, _to, from, to) => {
      const route = buildJourneyRoute(from, to, transport);
      const course = buildJourneyCourse(route);
      listShares(300).forEach((share) => {
        const point = course.getPointAt(share);
        expect(point.y).toBeGreaterThan(findGroundUnder(point) + 1);
      });
      const seconds = findJourneyCrossingSeconds(transport, route);
      expect(seconds).toBeGreaterThanOrEqual(4);
      expect(seconds).toBeLessThanOrEqual(9);
    },
  );

  it.each(aircraft)(
    "picks the %s up where it climbed away and ends it where it comes in to land",
    (transport) => {
      const [meadow, frost] = ports;
      const route = buildJourneyRoute(meadow, frost, transport);
      const leaving = placeCraftOnMap(meadow, transport, "departing", 1);
      const arriving = placeCraftOnMap(frost, transport, "docking", 0);
      expect(route[0]).toStrictEqual({
        x: leaving.x,
        y: leaving.y,
        z: leaving.z,
      });
      expect(route.at(-1)).toStrictEqual({
        x: arriving.x,
        y: arriving.y,
        z: arriving.z,
      });
    },
  );
});
