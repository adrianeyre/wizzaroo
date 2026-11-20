import { CatmullRomCurve3, Vector3 } from "three";
import type { MapPosition } from "../../curriculum/world-map.js";
import { smoothStep, type MapPoint } from "../world-map-terrain.js";
import {
  buildDockPier,
  exploreScale,
  findBridgeDeck,
  findExploreAdventure,
  pierHalfWidth,
  type Dock,
  type IslandAdventure,
} from "./island-adventures.js";

export type VoyagePhase =
  | "calling"
  | "boarding"
  | "departing"
  | "crossing"
  | "docking"
  | "landing"
  | "leaving";

export interface ShipPlacement {
  x: number;
  z: number;
  heading: number;
}

export interface CarriedSpot {
  x: number;
  y: number;
  z: number;
  heading: number;
}

export const shipLength = 18;
export const shipBeam = 5.6;
export const shipDeckHeight = 1.25;
export const shipMapScale = 1 / exploreScale;
const berthGap = 1.8;
const gangwayAlong = 2.5;
const deckInset = 1.1;
const plankOverlap = 0.5;
const plankShare = 0.3;
const plankStowShare = 0.12;
const berthSetBack = 1;
const approachDistance = 90;
const departureSwing = shipLength * 0.75;
const shippingLaneZ = -40;
const offshoreReach = 4;
const crossingSpeed = 18;
const shortestCrossingSeconds = 5;
const longestCrossingSeconds = 12;

export const voyagePhaseSeconds: Record<
  Exclude<VoyagePhase, "crossing">,
  number
> = {
  calling: 6,
  boarding: 3.4,
  departing: 5,
  docking: 6,
  landing: 3.4,
  leaving: 7,
};

const carriedPhases: readonly VoyagePhase[] = [
  "calling",
  "boarding",
  "departing",
  "crossing",
  "docking",
  "landing",
];

export const isCarriedByVoyage = (phase: VoyagePhase | undefined): boolean =>
  phase !== undefined && carriedPhases.includes(phase);

export const findNextVoyagePhase = (
  phase: VoyagePhase,
): VoyagePhase | undefined => {
  const nextPhases: Record<VoyagePhase, VoyagePhase | undefined> = {
    calling: "boarding",
    boarding: "departing",
    departing: "crossing",
    crossing: undefined,
    docking: "landing",
    landing: "leaving",
    leaving: undefined,
  };
  return nextPhases[phase];
};

interface DockFrame {
  seaward: MapPoint;
  across: MapPoint;
  landwardHeading: number;
}

const findDockFrame = ({ from, to, berthSide }: Dock): DockFrame => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const seaward = { x: (to.x - from.x) / length, z: (to.z - from.z) / length };
  return {
    seaward,
    across: { x: -seaward.z * berthSide, z: seaward.x * berthSide },
    landwardHeading: Math.atan2(-seaward.x, -seaward.z),
  };
};

export const findBerth = (dock: Dock): ShipPlacement => {
  const { seaward, across, landwardHeading } = findDockFrame(dock);
  const along = shipLength / 2 - berthSetBack;
  const out = pierHalfWidth + shipBeam / 2 + berthGap;
  return {
    x: dock.to.x - seaward.x * along + across.x * out,
    z: dock.to.z - seaward.z * along + across.z * out,
    heading: landwardHeading,
  };
};

export const findLandwardHeading = (dock: Dock): number =>
  findDockFrame(dock).landwardHeading;

const easeOut = (share: number): number => 1 - (1 - share) ** 2;

export const findShipPlacement = (
  dock: Dock,
  phase: VoyagePhase,
  share: number,
): ShipPlacement => {
  const berth = findBerth(dock);
  const { seaward, across, landwardHeading } = findDockFrame(dock);
  if (phase === "calling" || phase === "docking") {
    const still = approachDistance * (1 - easeOut(share));
    return {
      x: berth.x + seaward.x * still,
      z: berth.z + seaward.z * still,
      heading: landwardHeading,
    };
  }
  if (phase === "departing" || phase === "leaving") {
    const underway = Math.max(
      0,
      (share - plankStowShare) / (1 - plankStowShare),
    );
    const swing = smoothStep(0, 0.3, underway);
    const turn = smoothStep(0.25, 0.6, underway);
    const out = approachDistance * underway ** 2;
    return {
      x: berth.x + across.x * departureSwing * swing + seaward.x * out,
      z: berth.z + across.z * departureSwing * swing + seaward.z * out,
      heading: landwardHeading + Math.PI * turn,
    };
  }
  return berth;
};

export const placeOnShip = (
  ship: ShipPlacement,
  local: MapPoint,
): MapPoint => ({
  x:
    ship.x +
    local.x * Math.cos(ship.heading) +
    local.z * Math.sin(ship.heading),
  z:
    ship.z -
    local.x * Math.sin(ship.heading) +
    local.z * Math.cos(ship.heading),
});

const findPierSideOnShip = (dock: Dock): number => {
  const { across, landwardHeading } = findDockFrame(dock);
  const sideX =
    Math.cos(landwardHeading) * across.x - Math.sin(landwardHeading) * across.z;
  return sideX > 0 ? -1 : 1;
};

export interface Gangway {
  shipEnd: MapPoint;
  pierEnd: MapPoint;
  heading: number;
  length: number;
}

const findDeckSpot = (dock: Dock): MapPoint => ({
  x: findPierSideOnShip(dock) * (shipBeam / 2 - deckInset),
  z: gangwayAlong,
});

export const findGangway = (dock: Dock, ship: ShipPlacement): Gangway => {
  const { across } = findDockFrame(dock);
  const shipEnd = placeOnShip(ship, {
    x: findPierSideOnShip(dock) * (shipBeam / 2),
    z: gangwayAlong,
  });
  const length = berthGap + plankOverlap;
  return {
    shipEnd,
    pierEnd: {
      x: shipEnd.x - across.x * length,
      z: shipEnd.z - across.z * length,
    },
    heading: Math.atan2(-across.x, -across.z),
    length,
  };
};

export const findPierWaitingSpot = (dock: Dock): MapPoint => {
  const { across } = findDockFrame(dock);
  const { shipEnd } = findGangway(dock, findBerth(dock));
  const fromShip = berthGap + pierHalfWidth * 0.7;
  return {
    x: shipEnd.x - across.x * fromShip,
    z: shipEnd.z - across.z * fromShip,
  };
};

export const findPlankReach = (phase: VoyagePhase, share: number): number => {
  if (phase === "boarding" || phase === "landing") {
    return smoothStep(0, plankShare, share);
  }
  if (phase === "departing" || phase === "leaving") {
    return 1 - smoothStep(0, plankStowShare, share);
  }
  return 0;
};

export const isWalkingTheGangway = (
  phase: VoyagePhase,
  share: number,
): boolean =>
  (phase === "boarding" || phase === "landing") &&
  share > plankShare &&
  share < 1;

const findPierDeckHeight = (adventure: IslandAdventure): number => {
  const pier = buildDockPier(adventure);
  const spot = findPierWaitingSpot(adventure.dock);
  return (
    findBridgeDeck(pier, spot, adventure.findHeight(spot)) ?? pier.endHeight
  );
};

const findAlongPath = (path: readonly MapPoint[], share: number): MapPoint => {
  const lengths = path
    .slice(1)
    .map((end, index) =>
      Math.hypot(end.x - path[index].x, end.z - path[index].z),
    );
  let remaining = share * lengths.reduce((total, length) => total + length, 0);
  for (const [index, length] of lengths.entries()) {
    if (remaining <= length || index === lengths.length - 1) {
      const along = length === 0 ? 1 : Math.min(1, remaining / length);
      const start = path[index];
      const end = path[index + 1];
      return {
        x: start.x + (end.x - start.x) * along,
        z: start.z + (end.z - start.z) * along,
      };
    }
    remaining -= length;
  }
  return path[path.length - 1];
};

export const findCarriedSpot = (
  adventure: IslandAdventure,
  phase: VoyagePhase,
  share: number,
): CarriedSpot => {
  const { dock } = adventure;
  const ship = findShipPlacement(dock, phase, share);
  const onDeck = placeOnShip(ship, findDeckSpot(dock));
  const pier = findPierWaitingSpot(dock);
  const pierHeight = findPierDeckHeight(adventure);
  const { shipEnd, heading: towardsPier } = findGangway(dock, ship);
  const towardsShip = towardsPier + Math.PI;
  if (phase === "calling") {
    return { ...pier, y: pierHeight, heading: towardsShip };
  }
  if (phase === "boarding" || phase === "landing") {
    const walked = Math.max(0, (share - plankShare) / (1 - plankShare));
    const path = [pier, shipEnd, onDeck];
    const spot = findAlongPath(
      phase === "boarding" ? path : path.toReversed(),
      walked,
    );
    const isOnPier =
      Math.hypot(spot.x - pier.x, spot.z - pier.z) <
      Math.hypot(shipEnd.x - pier.x, shipEnd.z - pier.z) - plankOverlap;
    return {
      ...spot,
      y: isOnPier ? pierHeight : shipDeckHeight,
      heading: phase === "boarding" ? towardsShip : towardsPier,
    };
  }
  return { ...onDeck, y: shipDeckHeight, heading: ship.heading };
};

export interface VoyagePort {
  islandId: string;
  seaPosition: MapPosition;
}

export const placeOnMap = (
  { islandId, seaPosition }: VoyagePort,
  phase: Exclude<VoyagePhase, "crossing">,
  share: number,
): ShipPlacement => {
  const placement = findShipPlacement(
    findExploreAdventure(islandId).dock,
    phase,
    share,
  );
  return {
    x: seaPosition.x + placement.x / exploreScale,
    z: seaPosition.z + placement.z / exploreScale,
    heading: placement.heading,
  };
};

const findLaneTurn = (from: MapPoint, laneZ: number): MapPoint => ({
  x: from.x,
  z:
    from.z +
    Math.sign(laneZ - from.z) *
      Math.min(offshoreReach, Math.abs(laneZ - from.z) / 2),
});

export const buildVoyageRoute = (
  from: VoyagePort,
  to: VoyagePort,
): MapPoint[] =>
  buildSeaRoute(placeOnMap(from, "departing", 1), placeOnMap(to, "docking", 0));

export const buildSeaRoute = (
  leaving: MapPoint,
  arriving: MapPoint,
): MapPoint[] =>
  [
    leaving,
    findLaneTurn(leaving, shippingLaneZ),
    { x: leaving.x, z: shippingLaneZ },
    { x: arriving.x, z: shippingLaneZ },
    findLaneTurn(arriving, shippingLaneZ),
    arriving,
  ].map(({ x, z }) => ({ x, z }));

export const buildVoyageCourse = (route: readonly MapPoint[]) =>
  new CatmullRomCurve3(
    route.map(({ x, z }) => new Vector3(x, 0, z)),
    false,
    "centripetal",
  );

export const findCrossingSeconds = (route: readonly MapPoint[]): number =>
  Math.min(
    longestCrossingSeconds,
    Math.max(
      shortestCrossingSeconds,
      buildVoyageCourse(route).getLength() / crossingSpeed,
    ),
  );

export const findCrossingPlacement = (
  course: CatmullRomCurve3,
  share: number,
): ShipPlacement => {
  const eased = smoothStep(0, 1, share);
  const point = course.getPointAt(eased);
  const tangent = course.getTangentAt(eased);
  return {
    x: point.x,
    z: point.z,
    heading: Math.atan2(tangent.x, tangent.z),
  };
};

const dockCameraBack = 13;
const dockCameraAside = 8;
const dockCameraLift = 7;

export const findDockCameraSpot = (
  adventure: IslandAdventure,
): { x: number; y: number; z: number } => {
  const { dock } = adventure;
  const { seaward, across } = findDockFrame(dock);
  const pier = findPierWaitingSpot(dock);
  return {
    x: pier.x - seaward.x * dockCameraBack - across.x * dockCameraAside,
    y: findPierDeckHeight(adventure) + dockCameraLift,
    z: pier.z - seaward.z * dockCameraBack - across.z * dockCameraAside,
  };
};

const hullBlockerRadius = shipBeam / 2;
const hullBlockerCount = 5;

export const listShipBlockers = (
  ship: ShipPlacement,
): { centre: MapPoint; radius: number }[] =>
  Array.from({ length: hullBlockerCount }, (_, index) => ({
    centre: placeOnShip(ship, {
      x: 0,
      z:
        ((index / (hullBlockerCount - 1)) * 2 - 1) *
        (shipLength / 2 - hullBlockerRadius),
    }),
    radius: hullBlockerRadius,
  }));
