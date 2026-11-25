import type { Stance } from "../character/character-stance.js";
import { smoothStep, type MapPoint } from "../world-map-terrain.js";
import {
  buildDockPier,
  findBridgeDeck,
  pierDeckHeight,
  pierHalfWidth,
  type Dock,
  type IslandAdventure,
} from "./island-adventures.js";
import type {
  BoardingSpot,
  CraftPlacement,
  LandPhase,
  Spot3,
} from "./island-flight.js";
import type { VoyagePhase } from "./island-voyage.js";

// Scuba diving: a Wizzaroo dive locker grows up on the Dock's pier. The
// Character walks to it, puts on its scuba gear, walks to the end of the pier
// and jumps in, then swims under the sea to the next Island. There they swim
// in to the end of its pier, climb out, hang the gear up in the locker that
// has grown there, and the locker shrinks away.

export const scubaPhaseSeconds: Record<LandPhase, number> = {
  calling: 6,
  boarding: 9,
  departing: 8,
  docking: 9,
  landing: 8,
  leaving: 6,
};

const lockerFromEnd = 2.2;
const lockerInset = 0.42;
const kitReach = 0.62;
const waitingReach = 1.3;
const entryReach = 1.7;
const entryDepth = -0.7;
const swimDepth = -1.4;
const swimReach = 55;
const treadingDepth = -0.45;
const edgeInset = 0.3;

interface PierFrame {
  seaward: MapPoint;
  across: MapPoint;
}

const findPierFrame = ({ from, to, berthSide }: Dock): PierFrame => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const seaward = { x: (to.x - from.x) / length, z: (to.z - from.z) / length };
  return {
    seaward,
    across: { x: -seaward.z * berthSide, z: seaward.x * berthSide },
  };
};

const findHeadingOf = ({ x, z }: MapPoint): number => Math.atan2(x, z);

const findDeckHeight = (adventure: IslandAdventure, spot: MapPoint): number =>
  findBridgeDeck(buildDockPier(adventure), spot, adventure.findHeight(spot)) ??
  pierDeckHeight;

const findLockerSpot = (dock: Dock): MapPoint => {
  const { seaward, across } = findPierFrame(dock);
  const out = pierHalfWidth - lockerInset;
  return {
    x: dock.to.x - seaward.x * lockerFromEnd - across.x * out,
    z: dock.to.z - seaward.z * lockerFromEnd - across.z * out,
  };
};

const reachFromLocker = (dock: Dock, reach: number): MapPoint => {
  const locker = findLockerSpot(dock);
  const { across } = findPierFrame(dock);
  return { x: locker.x + across.x * reach, z: locker.z + across.z * reach };
};

/** Where the dive locker stands, on the pier and facing across it. */
export const findScubaPlacement = (
  adventure: IslandAdventure,
): CraftPlacement => {
  const spot = findLockerSpot(adventure.dock);
  return {
    ...spot,
    y: findDeckHeight(adventure, spot),
    heading: findHeadingOf(findPierFrame(adventure.dock).across),
    pitch: 0,
    roll: 0,
  };
};

export const findScubaWaitingSpot = (adventure: IslandAdventure): MapPoint =>
  reachFromLocker(adventure.dock, waitingReach);

/** The way the Character faces once they are back on the pier: the locker. */
export const findScubaArrivalHeading = (adventure: IslandAdventure): number =>
  findScubaPlacement(adventure).heading + Math.PI;

const onDeck = (adventure: IslandAdventure, spot: MapPoint): Spot3 => ({
  ...spot,
  y: findDeckHeight(adventure, spot),
});

const findEdgeSpot = (dock: Dock): MapPoint => {
  const { seaward } = findPierFrame(dock);
  return {
    x: dock.to.x - seaward.x * edgeInset,
    z: dock.to.z - seaward.z * edgeInset,
  };
};

const findEntrySpot = (dock: Dock, depth: number): Spot3 => {
  const { seaward } = findPierFrame(dock);
  return {
    x: dock.to.x + seaward.x * entryReach,
    y: depth,
    z: dock.to.z + seaward.z * entryReach,
  };
};

const findOffshoreSpot = (dock: Dock): Spot3 => {
  const { seaward } = findPierFrame(dock);
  return {
    x: dock.to.x + seaward.x * (entryReach + swimReach),
    y: swimDepth,
    z: dock.to.z + seaward.z * (entryReach + swimReach),
  };
};

const blend = (from: Spot3, to: Spot3, share: number): Spot3 => ({
  x: from.x + (to.x - from.x) * share,
  y: from.y + (to.y - from.y) * share,
  z: from.z + (to.z - from.z) * share,
});

interface Step {
  from: number;
  to: number;
}

const boardingSteps = {
  doors: { from: 0, to: 0.12 },
  toLocker: { from: 0.12, to: 0.24 },
  rackEmpties: { from: 0.34, to: 0.42 },
  suitedUp: 0.42,
  toEdge: { from: 0.5, to: 0.7 },
  jump: { from: 0.72, to: 0.9 },
  underwater: 0.82,
} as const;

const landingSteps = {
  climb: { from: 0, to: 0.24 },
  doors: { from: 0.16, to: 0.3 },
  toLocker: { from: 0.26, to: 0.4 },
  rackFills: { from: 0.48, to: 0.55 },
  suitedUp: 0.5,
  toWaiting: { from: 0.62, to: 0.92 },
} as const;

const within = ({ from, to }: Step, share: number): number =>
  smoothStep(from, to, share);

const isDuring = ({ from, to }: Step, share: number): boolean =>
  share > from && share < to;

export const isWalkingToScuba = (phase: VoyagePhase, share: number): boolean =>
  (phase === "boarding" &&
    (isDuring(boardingSteps.toLocker, share) ||
      isDuring(boardingSteps.toEdge, share))) ||
  (phase === "landing" &&
    (isDuring(landingSteps.toLocker, share) ||
      isDuring(landingSteps.toWaiting, share)));

/** The locker's doors, the gear on its rack and how far it has grown. */
export const findScubaLockerPose = (
  phase: VoyagePhase,
  share: number,
): { opening: number; gearOnRack: number; size: number } => {
  switch (phase) {
    case "calling":
      return { opening: 0, gearOnRack: 1, size: smoothStep(0.1, 0.6, share) };
    case "boarding":
      return {
        opening: within(boardingSteps.doors, share),
        gearOnRack: 1 - within(boardingSteps.rackEmpties, share),
        size: 1,
      };
    case "departing":
      return {
        opening: 1 - smoothStep(0, 0.12, share),
        gearOnRack: 0,
        size: 1 - smoothStep(0.3, 0.6, share),
      };
    case "crossing":
      return { opening: 0, gearOnRack: 0, size: 0 };
    case "docking":
      return { opening: 0, gearOnRack: 0, size: smoothStep(0.3, 0.7, share) };
    case "landing":
      return {
        opening: within(landingSteps.doors, share),
        gearOnRack: within(landingSteps.rackFills, share),
        size: 1,
      };
    case "leaving":
      return {
        opening: 1 - smoothStep(0, 0.15, share),
        gearOnRack: 1,
        size: 1 - smoothStep(0.25, 0.6, share),
      };
  }
};

const diving = (
  spot: Spot3,
  heading: number,
  stance: Stance,
  hasGear = true,
): BoardingSpot => ({
  ...spot,
  heading,
  isInside: false,
  stance,
  ...(hasGear ? { gear: "scuba" as const } : {}),
});

const findBoardingSpot = (
  adventure: IslandAdventure,
  share: number,
): BoardingSpot => {
  const { dock } = adventure;
  const facingLocker = findScubaArrivalHeading(adventure);
  const seaward = findHeadingOf(findPierFrame(dock).seaward);
  const waiting = onDeck(adventure, reachFromLocker(dock, waitingReach));
  const kit = onDeck(adventure, reachFromLocker(dock, kitReach));
  const edge = onDeck(adventure, findEdgeSpot(dock));
  const entry = findEntrySpot(dock, entryDepth);
  const hasGear = share >= boardingSteps.suitedUp;
  if (share < boardingSteps.toEdge.from) {
    const walked = within(boardingSteps.toLocker, share);
    return diving(
      blend(waiting, kit, walked),
      facingLocker,
      "standing",
      hasGear,
    );
  }
  if (share < boardingSteps.jump.from) {
    const walked = within(boardingSteps.toEdge, share);
    const turned = smoothStep(0, 0.25, walked);
    return diving(
      blend(kit, edge, walked),
      facingLocker + (seaward - facingLocker) * turned,
      "standing",
    );
  }
  const jumped = within(boardingSteps.jump, share);
  const flight = blend(edge, entry, jumped);
  const isUnder = share >= boardingSteps.underwater;
  return diving(
    {
      ...flight,
      y: flight.y + 0.9 * Math.sin(Math.PI * Math.min(1, jumped * 1.4)),
    },
    seaward,
    isUnder ? "swimming" : "standing",
  );
};

const findLandingSpot = (
  adventure: IslandAdventure,
  share: number,
): BoardingSpot => {
  const { dock } = adventure;
  const facingLocker = findScubaArrivalHeading(adventure);
  const landward = findHeadingOf(findPierFrame(dock).seaward) + Math.PI;
  const waiting = onDeck(adventure, reachFromLocker(dock, waitingReach));
  const kit = onDeck(adventure, reachFromLocker(dock, kitReach));
  const edge = onDeck(adventure, findEdgeSpot(dock));
  const treading = findEntrySpot(dock, treadingDepth);
  const hasGear = share < landingSteps.suitedUp;
  if (share < landingSteps.toLocker.from) {
    const climbed = within(landingSteps.climb, share);
    const along = blend(treading, edge, smoothStep(0.5, 1, climbed));
    return diving(
      {
        ...along,
        y: treading.y + (edge.y - treading.y) * smoothStep(0, 0.8, climbed),
      },
      landward,
      "standing",
      hasGear,
    );
  }
  if (share < landingSteps.toWaiting.from) {
    const walked = within(landingSteps.toLocker, share);
    return diving(
      blend(edge, kit, walked),
      landward + (facingLocker - landward) * smoothStep(0.5, 1, walked),
      "standing",
      hasGear,
    );
  }
  const walked = within(landingSteps.toWaiting, share);
  return diving(
    blend(kit, waiting, walked),
    facingLocker + Math.PI * smoothStep(0, 0.4, walked),
    "standing",
    false,
  );
};

export const findScubaCarriedSpot = (
  adventure: IslandAdventure,
  phase: LandPhase,
  share: number,
): BoardingSpot => {
  const { dock } = adventure;
  const seaward = findHeadingOf(findPierFrame(dock).seaward);
  switch (phase) {
    case "calling":
      return diving(
        onDeck(adventure, reachFromLocker(dock, waitingReach)),
        findScubaArrivalHeading(adventure),
        "standing",
        false,
      );
    case "boarding":
      return findBoardingSpot(adventure, share);
    case "departing": {
      const swum = smoothStep(0, 1, share);
      return diving(
        blend(findEntrySpot(dock, entryDepth), findOffshoreSpot(dock), swum),
        seaward,
        "swimming",
      );
    }
    case "docking": {
      const isSurfacing = share > 0.85;
      const swum = smoothStep(0, 0.85, share);
      const under = blend(
        findOffshoreSpot(dock),
        findEntrySpot(dock, entryDepth),
        swum,
      );
      return diving(
        isSurfacing
          ? {
              ...under,
              y:
                entryDepth +
                (treadingDepth - entryDepth) * smoothStep(0.85, 1, share),
            }
          : under,
        seaward + Math.PI,
        isSurfacing ? "standing" : "swimming",
      );
    }
    case "landing":
      return findLandingSpot(adventure, share);
    case "leaving":
      return diving(
        onDeck(adventure, reachFromLocker(dock, waitingReach)),
        findScubaArrivalHeading(adventure) + Math.PI,
        "standing",
        false,
      );
  }
};

export const findScubaCameraSpot = (adventure: IslandAdventure): Spot3 => {
  const waiting = findScubaWaitingSpot(adventure);
  const { seaward, across } = findPierFrame(adventure.dock);
  return {
    x: waiting.x + across.x * 5 - seaward.x * 6,
    y: findDeckHeight(adventure, waiting) + 4.5,
    z: waiting.z + across.z * 5 - seaward.z * 6,
  };
};

export const listScubaBlockers = (
  craft: CraftPlacement,
): { centre: MapPoint; radius: number }[] => [
  { centre: { x: craft.x, z: craft.z }, radius: 0.45 },
];
