import { describe, expect, it } from "vitest";
import { islands } from "../../curriculum/islands.js";
import { worldMap } from "../../curriculum/world-map.js";
import {
  isClearOfProps,
  mirrorOntoNewLands,
  type MapPoint,
} from "../world-map-terrain.js";
import { emberIsle } from "./ember-isle.js";
import { frostIsle } from "./frost-isle.js";
import {
  buildAdventureWorld,
  buildDockPier,
  exploreScale,
  findExploreAdventure,
  findIslandAdventure,
  findWalkSurface,
  isInsideExploreBounds,
  islandAdventures,
  listAdventurePlaces,
  listHoverPadPlaces,
  pierHalfWidth,
} from "./island-adventures.js";
import type { IslandLandform } from "./island-landform.js";
import {
  buildJourneyCourse,
  buildJourneyRoute,
  findCraftPlacement,
  findJourneyCarriedSpot,
  findJourneyWaitingSpot,
  isWalkingAboard,
  listCraftBlockers,
  placeCraftOnMap,
} from "./island-journey.js";
import {
  findHoverSurface,
  findJetskiBerth,
  findJetskiSpray,
  findSeaCraftPlacement,
  findSkirtLift,
  findSubBerth,
  findSubPierSide,
  hovercraftCushion,
  jetskiBeam,
  jetskiFootwell,
  jetskiLength,
  seaCraftPhaseSeconds,
  subBrowLength,
  subDeckHalfWidth,
  subDeckHeight,
  subDivingDepth,
  subHullRadius,
  type SeaCraft,
} from "./island-sea-craft.js";
import { jungleReach } from "./jungle-reach.js";
import { starfallIsle } from "./starfall-isle.js";
import { sunscorchSands } from "./sunscorch-sands.js";

const landforms: Record<string, IslandLandform> = {
  "frost-isle": frostIsle,
  "sunscorch-sands": sunscorchSands,
  "jungle-reach": jungleReach,
  "ember-isle": emberIsle,
  "starfall-isle": starfallIsle,
};

const islandIds = islandAdventures.map(({ islandId }) => [islandId] as const);

const listShares = (steps: number) =>
  Array.from({ length: steps + 1 }, (_, step) => step / steps);

const ports = worldMap.islands.map(({ id, seaPosition }) => ({
  islandId: id,
  seaPosition,
}));

const seaCraft: readonly SeaCraft[] = ["hovercraft", "submarine", "jetski"];

describe.each(islandIds)("the hovercraft on %s", (islandId) => {
  const adventure = findExploreAdventure(islandId);

  it("comes in over open sea, rides up the slipway and settles on dry land", () => {
    const start = findSeaCraftPlacement(adventure, "hovercraft", "calling", 0);
    expect(adventure.findHeight(start)).toBeLessThan(-1);
    listShares(400).forEach((share) => {
      const craft = findSeaCraftPlacement(
        adventure,
        "hovercraft",
        "calling",
        share,
      );
      expect(craft.y).toBeGreaterThanOrEqual(
        findHoverSurface(adventure, craft) - 0.6,
      );
      expect(Math.abs(craft.pitch)).toBeLessThan(0.35);
    });
    const parked = findSeaCraftPlacement(adventure, "hovercraft", "calling", 1);
    expect(adventure.findHeight(parked)).toBeGreaterThan(0.5);
    expect(adventure.findCourseKind(parked)).toBeUndefined();
    expect(parked.y).toBeCloseTo(findHoverSurface(adventure, parked), 0);
    expect(Math.abs(parked.pitch)).toBeLessThan(0.25);
    expect(Math.abs(parked.roll)).toBeLessThan(0.2);
  });

  it("puffs up its skirt, backs down the slipway, turns round and hovers out to sea", () => {
    expect(findSkirtLift("boarding", 0.5)).toBe(0);
    expect(findSkirtLift("departing", 0.5)).toBe(1);
    expect(findSkirtLift("crossing", 0.5)).toBe(1);
    const parked = findSeaCraftPlacement(
      adventure,
      "hovercraft",
      "departing",
      0,
    );
    const away = findSeaCraftPlacement(adventure, "hovercraft", "departing", 1);
    expect(Math.hypot(away.x - parked.x, away.z - parked.z)).toBeGreaterThan(
      80,
    );
    expect(adventure.findHeight(away)).toBeLessThan(-1);
    expect(away.y).toBeCloseTo(hovercraftCushion);
    expect(Math.cos(away.heading - parked.heading)).toBeCloseTo(-1);
  });

  it("keeps the Character waiting on dry ground in front of its ramp", () => {
    const waiting = findJourneyWaitingSpot(adventure, "hovercraft");
    const world = buildAdventureWorld(adventure);
    const height = adventure.findHeight(waiting);
    const surface = findWalkSurface(world, waiting, height);
    expect(["ground", "trail"]).toContain(surface.kind);
    expect(isInsideExploreBounds(waiting)).toBe(true);
  });

  it("walks the Character up the ramp and hides them inside, then lands them where they waited", () => {
    const waiting = findJourneyWaitingSpot(adventure, "hovercraft");
    const calling = findJourneyCarriedSpot(
      adventure,
      "hovercraft",
      "calling",
      0,
    );
    expect(calling.x).toBeCloseTo(waiting.x);
    expect(calling.z).toBeCloseTo(waiting.z);
    expect(calling.y).toBeCloseTo(adventure.findHeight(waiting), 1);
    expect(isWalkingAboard("hovercraft", "boarding", 0.5)).toBe(true);
    expect(
      findJourneyCarriedSpot(adventure, "hovercraft", "boarding", 1).isInside,
    ).toBe(true);
    const landed = findJourneyCarriedSpot(
      adventure,
      "hovercraft",
      "landing",
      1,
    );
    expect(landed.isInside).toBe(false);
    expect(landed.x).toBeCloseTo(waiting.x);
    expect(landed.z).toBeCloseTo(waiting.z);
  });

  it("is solid while it rests on the land, and not once it is out at sea", () => {
    const parked = findCraftPlacement(adventure, "hovercraft", "leaving", 0);
    const away = findCraftPlacement(adventure, "hovercraft", "leaving", 1);
    expect(
      listCraftBlockers(adventure, "hovercraft", parked).length,
    ).toBeGreaterThan(0);
    expect(listCraftBlockers(adventure, "hovercraft", away)).toStrictEqual([]);
  });
});

describe.each(islandIds)("the hover slipway on %s", (islandId) => {
  const adventure = findIslandAdventure(islandId);
  const padPoints = listHoverPadPlaces(adventure.hoverPad);
  const isOnPad = (point: MapPoint, margin: number) =>
    padPoints.some(
      (padPoint) =>
        Math.hypot(point.x - padPoint.x, point.z - padPoint.z) < margin,
    );

  it("keeps the Island's own places, sights and airfield off the slipway", () => {
    const places = listAdventurePlaces({
      ...adventure,
      hoverPad: { ...adventure.hoverPad, centre: { x: 999, z: 999 } },
    });
    places.forEach((place) => {
      expect(isOnPad(place, 1.5)).toBe(false);
    });
    const island = islands.find(({ id }) => id === islandId);
    island?.regions.forEach(({ mapPosition }) => {
      expect(isOnPad(mapPosition, 2.5)).toBe(false);
    });
  });

  it("clears the Island's scenery from the slipway", () => {
    const landform = new Map(Object.entries(landforms)).get(islandId);
    if (landform === undefined) {
      return;
    }
    const island = islands.find(({ id }) => id === islandId);
    const keepClearOf = [
      ...(island?.regions ?? []).map(({ mapPosition }) => mapPosition),
      ...landform.features.map(({ position }) => position),
    ];
    const propPlaces = listAdventurePlaces(adventure);
    landform
      .listScatters(keepClearOf, propPlaces, () => true)
      .forEach((scatter) => {
        [
          ...scatter.things,
          ...mirrorOntoNewLands(scatter.things, {
            keepEvery: 1,
            findHeight: landform.findHeight,
            isClear: (point) => isClearOfProps(point, propPlaces),
          }),
        ].forEach((thing) => {
          expect(isOnPad(thing, 1), scatter.name).toBe(false);
        });
      });
    landform.features.forEach(({ name, position }) => {
      expect(isOnPad(position, 2), name).toBe(false);
    });
  });
});

describe.each(islandIds)("the submarine on %s", (islandId) => {
  const adventure = findExploreAdventure(islandId);
  const findSeabedClearance = (placement: {
    x: number;
    y: number;
    z: number;
  }) => placement.y - subHullRadius - adventure.findHeight(placement);

  it("surfaces from deep under the sea and stops at its berth beside the Dock", () => {
    const start = findSeaCraftPlacement(adventure, "submarine", "calling", 0);
    expect(start.y).toBeCloseTo(-subDivingDepth);
    listShares(400).forEach((share) => {
      const craft = findSeaCraftPlacement(
        adventure,
        "submarine",
        "calling",
        share,
      );
      expect(findSeabedClearance(craft)).toBeGreaterThan(0.3);
    });
    const berthed = findSeaCraftPlacement(adventure, "submarine", "calling", 1);
    expect(berthed).toStrictEqual(findSubBerth(adventure.dock));
    expect(berthed.y).toBe(0);
  });

  it("dives back under the sea as it leaves, without touching the seabed", () => {
    listShares(400).forEach((share) => {
      const craft = findSeaCraftPlacement(
        adventure,
        "submarine",
        "departing",
        share,
      );
      expect(findSeabedClearance(craft)).toBeGreaterThan(0.3);
    });
    const away = findSeaCraftPlacement(adventure, "submarine", "departing", 1);
    expect(away.y).toBeCloseTo(-subDivingDepth);
  });

  it("reaches its brow across to the pier, at the pier's height", () => {
    const berth = findSubBerth(adventure.dock);
    const side = findSubPierSide(adventure.dock);
    const browEnd = subDeckHalfWidth + subBrowLength;
    const { x, z } = {
      x: berth.x + side * browEnd * Math.cos(berth.heading),
      z: berth.z - side * browEnd * Math.sin(berth.heading),
    };
    const pier = buildDockPier(adventure);
    const across = Math.abs(
      ((x - pier.from.x) * (pier.to.z - pier.from.z) -
        (z - pier.from.z) * (pier.to.x - pier.from.x)) /
        Math.hypot(pier.to.x - pier.from.x, pier.to.z - pier.from.z),
    );
    expect(across).toBeLessThan(pierHalfWidth);
    expect(subDeckHeight).toBeCloseTo(pier.endHeight);
  });

  it("walks the Character across the brow and down the hatch, then back onto the pier", () => {
    const waiting = findJourneyWaitingSpot(adventure, "submarine");
    const world = buildAdventureWorld(adventure);
    expect(findWalkSurface(world, waiting, subDeckHeight).height).toBeCloseTo(
      subDeckHeight,
      1,
    );
    const calling = findJourneyCarriedSpot(
      adventure,
      "submarine",
      "calling",
      0,
    );
    expect(calling.x).toBeCloseTo(waiting.x);
    expect(calling.z).toBeCloseTo(waiting.z);
    expect(calling.y).toBeCloseTo(subDeckHeight);
    expect(isWalkingAboard("submarine", "boarding", 0.5)).toBe(true);
    const below = findJourneyCarriedSpot(adventure, "submarine", "boarding", 1);
    expect(below.isInside).toBe(true);
    expect(below.y).toBeLessThan(subDeckHeight);
    const landed = findJourneyCarriedSpot(adventure, "submarine", "landing", 1);
    expect(landed.isInside).toBe(false);
    expect(landed.x).toBeCloseTo(waiting.x);
    expect(landed.z).toBeCloseTo(waiting.z);
  });

  it("is solid at its berth, and not once it has dived", () => {
    const berthed = findCraftPlacement(adventure, "submarine", "leaving", 0);
    const dived = findCraftPlacement(adventure, "submarine", "leaving", 1);
    expect(
      listCraftBlockers(adventure, "submarine", berthed).length,
    ).toBeGreaterThan(0);
    expect(listCraftBlockers(adventure, "submarine", dived)).toStrictEqual([]);
  });
});

describe.each(islandIds)("the jetski on %s", (islandId) => {
  const adventure = findExploreAdventure(islandId);
  const world = buildAdventureWorld(adventure);
  const findClearance = (placement: MapPoint) =>
    -Math.max(
      ...[-1, 0, 1].map((along) =>
        adventure.findHeight({
          x: placement.x + Math.sin(along) * jetskiLength * 0.5 * along,
          z: placement.z + Math.cos(along) * jetskiLength * 0.5 * along,
        }),
      ),
    );

  it("zooms in over open water and stops at its berth beside the pier", () => {
    listShares(400).forEach((share) => {
      const craft = findSeaCraftPlacement(
        adventure,
        "jetski",
        "calling",
        share,
      );
      expect(findClearance(craft)).toBeGreaterThan(0.2);
    });
    const berthed = findSeaCraftPlacement(adventure, "jetski", "calling", 1);
    const berth = findJetskiBerth(adventure.dock);
    (["x", "z", "heading", "pitch", "roll"] as const).forEach((key) => {
      expect(berthed[key]).toBeCloseTo(berth[key]);
    });
    const pier = buildDockPier(adventure);
    const across = Math.abs(
      ((berthed.x - pier.from.x) * (pier.to.z - pier.from.z) -
        (berthed.z - pier.from.z) * (pier.to.x - pier.from.x)) /
        Math.hypot(pier.to.x - pier.from.x, pier.to.z - pier.from.z),
    );
    expect(across).toBeGreaterThan(pierHalfWidth + jetskiBeam / 2);
    expect(across).toBeLessThan(pierHalfWidth + jetskiBeam);
  });

  it("turns round and speeds away out to sea, keeping off the seabed", () => {
    listShares(400).forEach((share) => {
      const craft = findSeaCraftPlacement(
        adventure,
        "jetski",
        "departing",
        share,
      );
      expect(findClearance(craft)).toBeGreaterThan(0.2);
    });
    const berth = findJetskiBerth(adventure.dock);
    const away = findSeaCraftPlacement(adventure, "jetski", "departing", 1);
    expect(Math.hypot(away.x - berth.x, away.z - berth.z)).toBeGreaterThan(60);
  });

  it("steps the Character down from the pier onto its footwell, where they ride in view", () => {
    const waiting = findJourneyWaitingSpot(adventure, "jetski");
    const pierDeck = buildDockPier(adventure).endHeight;
    expect(findWalkSurface(world, waiting, pierDeck).height).toBeCloseTo(
      pierDeck,
      1,
    );
    expect(isWalkingAboard("jetski", "boarding", 0.5)).toBe(true);
    const aboard = findJourneyCarriedSpot(adventure, "jetski", "boarding", 1);
    expect(aboard.isInside).toBe(false);
    expect(aboard.y).toBeCloseTo(jetskiFootwell);
    const riding = findJourneyCarriedSpot(
      adventure,
      "jetski",
      "departing",
      0.7,
    );
    const craft = findCraftPlacement(adventure, "jetski", "departing", 0.7);
    expect(riding.isInside).toBe(false);
    expect(Math.hypot(riding.x - craft.x, riding.z - craft.z)).toBeLessThan(
      jetskiLength / 2,
    );
    const landed = findJourneyCarriedSpot(adventure, "jetski", "landing", 1);
    expect(landed.isInside).toBe(false);
    expect(landed.x).toBeCloseTo(waiting.x);
    expect(landed.z).toBeCloseTo(waiting.z);
  });

  it("is solid at its berth, and not once it has zoomed off", () => {
    const berthed = findCraftPlacement(adventure, "jetski", "leaving", 0);
    const away = findCraftPlacement(adventure, "jetski", "leaving", 1);
    expect(listCraftBlockers(adventure, "jetski", berthed).length).toBe(2);
    expect(listCraftBlockers(adventure, "jetski", away)).toStrictEqual([]);
  });
});

describe("the jetski's spray", () => {
  it("kicks up spray while it is under way, and none while it waits at the pier", () => {
    expect(findJetskiSpray("crossing", 0.5)).toBe(1);
    expect(findJetskiSpray("calling", 0.1)).toBeCloseTo(1);
    expect(findJetskiSpray("calling", 1)).toBe(0);
    expect(findJetskiSpray("boarding", 0.5)).toBe(0);
    expect(findJetskiSpray("departing", 0.9)).toBeCloseTo(1);
  });
});

describe("crossing the sea between Islands", () => {
  it.each(seaCraft)(
    "takes a few seconds for each part of the %s's journey",
    (craft) => {
      Object.values(seaCraftPhaseSeconds[craft]).forEach((seconds) => {
        expect(seconds).toBeGreaterThan(3);
        expect(seconds).toBeLessThan(12);
      });
    },
  );

  it.each(seaCraft)(
    "starts the %s's crossing where it left one Island and ends it where it comes in to the next",
    (craft) => {
      const [meadow, frost] = ports;
      const route = buildJourneyRoute(meadow, frost, craft);
      const leaving = placeCraftOnMap(meadow, craft, "departing", 1);
      const arriving = placeCraftOnMap(frost, craft, "docking", 0);
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

  it("skims the jetski along the top of the waves", () => {
    const [meadow, frost] = ports;
    const course = buildJourneyCourse(
      buildJourneyRoute(meadow, frost, "jetski"),
    );
    listShares(100).forEach((share) => {
      expect(course.getPointAt(share).y).toBeCloseTo(0);
    });
  });

  it("hovers the hovercraft just above the waves and keeps the submarine under them", () => {
    const [meadow, frost] = ports;
    const hover = buildJourneyCourse(
      buildJourneyRoute(meadow, frost, "hovercraft"),
    );
    const dive = buildJourneyCourse(
      buildJourneyRoute(meadow, frost, "submarine"),
    );
    listShares(100).forEach((share) => {
      expect(hover.getPointAt(share).y).toBeCloseTo(
        hovercraftCushion / exploreScale,
        1,
      );
      expect(dive.getPointAt(share).y).toBeLessThan(0);
    });
  });
});
