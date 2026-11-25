import { describe, expect, it } from "vitest";
import { worldMap } from "../../curriculum/world-map.js";
import { seatedHipDrop } from "../character/character-stance.js";
import type { MapPoint } from "../world-map-terrain.js";
import {
  buildAdventureWorld,
  buildDockPier,
  findExploreAdventure,
  findWalkSurface,
  islandAdventures,
  pierHalfWidth,
} from "./island-adventures.js";
import { findRiderPose, isRiderInView } from "./island-craft-rider.js";
import {
  dragonSaddle,
  findAircraftPlacement,
  findDragonWingSpread,
  placeOnDragonBody,
} from "./island-flight.js";
import {
  buildJourneyCourse,
  buildJourneyRoute,
  findCraftPlacement,
  findCraftPose,
  findJourneyCarriedSpot,
  findJourneyCrossingSeconds,
  findJourneyWaitingSpot,
  findLandPhaseSeconds,
  isWalkingAboard,
  listCraftBlockers,
  placeCraftOnMap,
} from "./island-journey.js";
import {
  findScubaLockerPose,
  findScubaPlacement,
  scubaPhaseSeconds,
} from "./island-scuba.js";
import {
  findBoardBerth,
  findSeaCraftPlacement,
  findSurfWaveSize,
  seaCraftPhaseSeconds,
  surfboardDeck,
  surfboardHalfWidth,
  surfboardLength,
  windsurferDeck,
  windsurferHalfWidth,
  windsurferLength,
} from "./island-sea-craft.js";

const islandIds = islandAdventures.map(({ islandId }) => [islandId] as const);

const listShares = (steps: number) =>
  Array.from({ length: steps + 1 }, (_, step) => step / steps);

const ports = worldMap.islands.map(({ id, seaPosition }) => ({
  islandId: id,
  seaPosition,
}));

describe.each(islandIds)("riding the dragon on %s", (islandId) => {
  const adventure = findExploreAdventure(islandId);
  const level = adventure.airfield.balloonField.level;

  it("lies down for the Character, who climbs on and sits on its saddle", () => {
    expect(
      findCraftPose(adventure, "dragon", "boarding", 0.1, {
        ...findCraftPlacement(adventure, "dragon", "boarding", 0.1),
      }).opening,
    ).toBeGreaterThan(0);
    const lying = findCraftPose(
      adventure,
      "dragon",
      "boarding",
      0.6,
      findCraftPlacement(adventure, "dragon", "boarding", 0.6),
    );
    expect(lying.opening).toBe(1);
    expect(isWalkingAboard("dragon", "boarding", 0.6)).toBe(true);
    const climbing = findJourneyCarriedSpot(
      adventure,
      "dragon",
      "boarding",
      0.8,
    );
    expect(climbing.stance).toBeUndefined();
    expect(climbing.y).toBeGreaterThan(level + 0.2);
    const seated = findJourneyCarriedSpot(adventure, "dragon", "boarding", 1);
    const bowedSaddle = placeOnDragonBody(1, dragonSaddle);
    expect(seated.stance).toBe("sitting");
    expect(seated.isInside).toBe(false);
    expect(seated.y).toBeCloseTo(level + bowedSaddle.y - seatedHipDrop, 1);
  });

  it("stands up with the Character still in the saddle, and carries them seated as it flies off", () => {
    const standing = findJourneyCarriedSpot(
      adventure,
      "dragon",
      "departing",
      0.13,
    );
    expect(standing.stance).toBe("sitting");
    expect(standing.y).toBeCloseTo(level + dragonSaddle.y - seatedHipDrop, 1);
    const flying = findJourneyCarriedSpot(
      adventure,
      "dragon",
      "departing",
      0.8,
    );
    const dragon = findAircraftPlacement(adventure, "dragon", "departing", 0.8);
    expect(flying.stance).toBe("sitting");
    expect(flying.pitch).toBeCloseTo(dragon.pitch);
    expect(flying.y - dragon.y).toBeGreaterThan(1);
    expect(Math.hypot(flying.x - dragon.x, flying.z - dragon.z)).toBeLessThan(
      2,
    );
  });

  it("bows again at the other Island so the Character can climb down", () => {
    expect(
      findJourneyCarriedSpot(adventure, "dragon", "landing", 0.1).stance,
    ).toBe("sitting");
    const off = findJourneyCarriedSpot(adventure, "dragon", "landing", 1);
    expect(off.stance).toBeUndefined();
    expect(off.y).toBeCloseTo(level);
  });
});

describe("the dragon's wings", () => {
  it("are folded on the ground and spread in the air", () => {
    expect(findDragonWingSpread("boarding", 0.5)).toBe(0);
    expect(findDragonWingSpread("calling", 0.3)).toBe(1);
    expect(findDragonWingSpread("calling", 1)).toBe(0);
    expect(findDragonWingSpread("departing", 0.05)).toBe(0);
    expect(findDragonWingSpread("departing", 0.5)).toBe(1);
    expect(findDragonWingSpread("crossing", 0.5)).toBe(1);
  });
});

describe.each(islandIds)("boarding the blimp on %s", (islandId) => {
  const adventure = findExploreAdventure(islandId);

  it("opens its gondola door, walks the Character up the step and hides them inside", () => {
    expect(
      findCraftPose(
        adventure,
        "blimp",
        "boarding",
        0.5,
        findCraftPlacement(adventure, "blimp", "boarding", 0.5),
      ).opening,
    ).toBe(1);
    expect(isWalkingAboard("blimp", "boarding", 0.5)).toBe(true);
    expect(
      findJourneyCarriedSpot(adventure, "blimp", "boarding", 1).isInside,
    ).toBe(true);
    expect(
      findJourneyCarriedSpot(adventure, "blimp", "departing", 0.5).isInside,
    ).toBe(true);
  });
});

const boards = [
  ["surfboard", surfboardLength, surfboardHalfWidth, surfboardDeck],
  ["windsurfer", windsurferLength, windsurferHalfWidth, windsurferDeck],
] as const;

describe.each(
  boards.flatMap((board) =>
    islandAdventures.map(({ islandId }) => [...board, islandId] as const),
  ),
)("the %s on %s", (board, length, halfWidth, deck, islandId) => {
  const adventure = findExploreAdventure(islandId);
  const world = buildAdventureWorld(adventure);
  const findClearance = (placement: MapPoint) =>
    -Math.max(
      ...[-1, 0, 1].map((along) =>
        adventure.findHeight({
          x: placement.x + Math.sin(along) * length * 0.5 * along,
          z: placement.z + Math.cos(along) * length * 0.5 * along,
        }),
      ),
    );

  it("comes in over open water and stops at its berth beside the pier", () => {
    listShares(300).forEach((share) => {
      const craft = findSeaCraftPlacement(adventure, board, "calling", share);
      expect(findClearance(craft)).toBeGreaterThan(0.2);
    });
    const berthed = findSeaCraftPlacement(adventure, board, "calling", 1);
    const berth = findBoardBerth(adventure.dock, board);
    (["x", "z", "heading"] as const).forEach((key) => {
      expect(berthed[key]).toBeCloseTo(berth[key]);
    });
    const pier = buildDockPier(adventure);
    const across = Math.abs(
      ((berthed.x - pier.from.x) * (pier.to.z - pier.from.z) -
        (berthed.z - pier.from.z) * (pier.to.x - pier.from.x)) /
        Math.hypot(pier.to.x - pier.from.x, pier.to.z - pier.from.z),
    );
    expect(across).toBeGreaterThan(pierHalfWidth + halfWidth);
    expect(across).toBeLessThan(pierHalfWidth + halfWidth * 2 + 0.5);
  });

  it("heads out to sea without touching the seabed", () => {
    listShares(300).forEach((share) => {
      const craft = findSeaCraftPlacement(adventure, board, "departing", share);
      expect(findClearance(craft)).toBeGreaterThan(0.2);
    });
    const berth = findBoardBerth(adventure.dock, board);
    const away = findSeaCraftPlacement(adventure, board, "departing", 1);
    expect(Math.hypot(away.x - berth.x, away.z - berth.z)).toBeGreaterThan(60);
  });

  it("steps the Character down from the pier onto its deck, where they ride in view, and back again", () => {
    const waiting = findJourneyWaitingSpot(adventure, board);
    const pierDeck = buildDockPier(adventure).endHeight;
    expect(findWalkSurface(world, waiting, pierDeck).height).toBeCloseTo(
      pierDeck,
      1,
    );
    expect(isWalkingAboard(board, "boarding", 0.5)).toBe(true);
    const aboard = findJourneyCarriedSpot(adventure, board, "boarding", 1);
    expect(aboard.isInside).toBe(false);
    expect(aboard.y).toBeLessThan(deck + 0.05);
    expect(aboard.y).toBeGreaterThan(deck - 0.1);
    const riding = findJourneyCarriedSpot(adventure, board, "departing", 0.8);
    const craft = findCraftPlacement(adventure, board, "departing", 0.8);
    expect(riding.stance).toBe(
      board === "surfboard" ? "surfing" : "windsurfing",
    );
    expect(Math.hypot(riding.x - craft.x, riding.z - craft.z)).toBeLessThan(
      length / 2,
    );
    const landed = findJourneyCarriedSpot(adventure, board, "landing", 1);
    expect(landed.x).toBeCloseTo(waiting.x);
    expect(landed.z).toBeCloseTo(waiting.z);
  });

  it("is solid at its berth, and not once it has gone", () => {
    const berthed = findCraftPlacement(adventure, board, "leaving", 0);
    const away = findCraftPlacement(adventure, board, "leaving", 1);
    expect(listCraftBlockers(adventure, board, berthed).length).toBe(2);
    expect(listCraftBlockers(adventure, board, away)).toStrictEqual([]);
  });

  it("takes a few seconds for each part of the journey", () => {
    Object.values(seaCraftPhaseSeconds[board]).forEach((seconds) => {
      expect(seconds).toBeGreaterThan(3);
      expect(seconds).toBeLessThan(12);
    });
  });
});

describe("surfing", () => {
  const adventure = findExploreAdventure("meadow-isle");

  it("paddles out lying down, then stands up as the massive wave rises behind", () => {
    expect(
      findJourneyCarriedSpot(adventure, "surfboard", "boarding", 1).stance,
    ).toBe("paddling");
    expect(
      findJourneyCarriedSpot(adventure, "surfboard", "departing", 0.3).stance,
    ).toBe("paddling");
    expect(findSurfWaveSize("departing", 0.3)).toBe(0);
    expect(findSurfWaveSize("departing", 0.7)).toBe(1);
    expect(
      findJourneyCarriedSpot(adventure, "surfboard", "departing", 0.7).stance,
    ).toBe("surfing");
  });

  it("rides the massive wave all the way, and lets it die away at the other Dock", () => {
    expect(findSurfWaveSize("crossing", 0.5)).toBe(1);
    expect(findSurfWaveSize("docking", 0.2)).toBe(1);
    expect(findSurfWaveSize("docking", 1)).toBe(0);
    expect(findSurfWaveSize("boarding", 0.5)).toBe(0);
  });
});

describe.each(islandIds)("scuba diving from %s", (islandId) => {
  const adventure = findExploreAdventure(islandId);
  const pier = buildDockPier(adventure);

  it("grows a dive locker on the pier, where the Character waits", () => {
    const locker = findScubaPlacement(adventure);
    const along =
      ((locker.x - pier.from.x) * (pier.to.x - pier.from.x) +
        (locker.z - pier.from.z) * (pier.to.z - pier.from.z)) /
      Math.hypot(pier.to.x - pier.from.x, pier.to.z - pier.from.z) ** 2;
    expect(along).toBeGreaterThan(0.5);
    expect(along).toBeLessThan(1);
    expect(findScubaLockerPose("calling", 0).size).toBe(0);
    expect(findScubaLockerPose("calling", 1).size).toBe(1);
    const waiting = findJourneyWaitingSpot(adventure, "scuba");
    const calling = findJourneyCarriedSpot(adventure, "scuba", "calling", 0);
    expect(calling.x).toBeCloseTo(waiting.x);
    expect(calling.y).toBeCloseTo(locker.y, 1);
  });

  it("puts on the scuba gear from the locker, jumps in and swims away under the sea", () => {
    expect(
      findJourneyCarriedSpot(adventure, "scuba", "boarding", 0.2).gear,
    ).toBeUndefined();
    expect(findScubaLockerPose("boarding", 0.2).gearOnRack).toBe(1);
    const suited = findJourneyCarriedSpot(adventure, "scuba", "boarding", 0.6);
    expect(suited.gear).toBe("scuba");
    expect(findScubaLockerPose("boarding", 0.6).gearOnRack).toBe(0);
    const inTheSea = findJourneyCarriedSpot(adventure, "scuba", "boarding", 1);
    expect(inTheSea.stance).toBe("swimming");
    expect(inTheSea.y).toBeLessThan(0);
    listShares(50).forEach((share) => {
      const diver = findJourneyCarriedSpot(
        adventure,
        "scuba",
        "departing",
        share,
      );
      expect(diver.y).toBeLessThan(0);
      expect(diver.y).toBeGreaterThan(adventure.findHeight(diver));
      expect(diver.isInside).toBe(false);
    });
  });

  it("swims in to the other Dock, climbs out, hangs the gear up and stands where the locker grew", () => {
    const surfacing = findJourneyCarriedSpot(adventure, "scuba", "docking", 1);
    expect(surfacing.y).toBeLessThan(0);
    expect(surfacing.y).toBeGreaterThan(-0.6);
    expect(findScubaLockerPose("docking", 1).size).toBe(1);
    const dry = findJourneyCarriedSpot(adventure, "scuba", "landing", 1);
    const waiting = findJourneyWaitingSpot(adventure, "scuba");
    expect(dry.gear).toBeUndefined();
    expect(dry.x).toBeCloseTo(waiting.x);
    expect(dry.z).toBeCloseTo(waiting.z);
    expect(findScubaLockerPose("landing", 1).gearOnRack).toBe(1);
  });

  it("takes a few seconds for each part of the journey", () => {
    Object.values(scubaPhaseSeconds).forEach((seconds) => {
      expect(seconds).toBeGreaterThan(3);
      expect(seconds).toBeLessThan(12);
      expect(findLandPhaseSeconds("scuba", "calling")).toBe(
        scubaPhaseSeconds.calling,
      );
    });
  });
});

describe("crossing between Islands on the new rides", () => {
  const [meadow, frost] = ports;

  it("keeps the diver just under the waves, and the boards on top of them", () => {
    const dive = buildJourneyCourse(buildJourneyRoute(meadow, frost, "scuba"));
    const surf = buildJourneyCourse(
      buildJourneyRoute(meadow, frost, "surfboard"),
    );
    listShares(100).forEach((share) => {
      expect(dive.getPointAt(share).y).toBeLessThan(0);
      expect(surf.getPointAt(share).y).toBeCloseTo(0);
    });
    const route = buildJourneyRoute(meadow, frost, "scuba");
    expect(route[0].x).toBeCloseTo(
      placeCraftOnMap(meadow, "scuba", "departing", 1).x,
    );
    expect(findJourneyCrossingSeconds("scuba", route)).toBeGreaterThan(3);
  });

  it("shows the Character riding the dragon and the boards on the World Map, and diving in scuba gear", () => {
    expect(isRiderInView("dragon")).toBe(true);
    expect(isRiderInView("blimp")).toBe(false);
    expect(findRiderPose("dragon", "crossing", 0.5)?.stance).toBe("sitting");
    expect(findRiderPose("surfboard", "crossing", 0.5)?.stance).toBe("surfing");
    expect(findRiderPose("windsurfer", "crossing", 0.5)?.stance).toBe(
      "windsurfing",
    );
    expect(findRiderPose("scuba", "crossing", 0.5)?.stance).toBe("swimming");
    expect(findRiderPose("scuba", "calling", 0.5)).toBeUndefined();
    expect(findRiderPose("dragon", "boarding", 0.5)).toBeUndefined();
  });
});
