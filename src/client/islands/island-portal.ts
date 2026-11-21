import { smoothStep, type MapPoint } from "../world-map-terrain.js";
import type { IslandAdventure } from "./island-adventures.js";
import type {
  BoardingSpot,
  CraftPlacement,
  LandPhase,
  Spot3,
} from "./island-flight.js";
import type { VoyagePhase } from "./island-voyage.js";

// The portal opens on the Balloon Field: a standing ring of carved stone on a
// round dais, its middle filled with a swirling light. The Character walks up
// onto the dais and through the light, and comes out of the portal that opens
// on the other Island. Between the two the portal closes to a glowing wisp
// that streaks across the World Map.

export const portalDaisRadius = 2.3;
export const portalDaisHeight = 0.28;
export const portalRingCentre = portalDaisHeight + 1.53;
export const portalRingRadius = 1.55;
export const portalStoneWidth = 0.42;
export const portalWispHeight = 60;

export const portalPhaseSeconds: Record<LandPhase, number> = {
  calling: 7,
  boarding: 4,
  departing: 6,
  docking: 7,
  landing: 4,
  leaving: 6,
};

const isStepping = (phase: VoyagePhase): boolean =>
  phase === "boarding" || phase === "landing";

interface PortalFrame {
  centre: MapPoint;
  heading: number;
  level: number;
}

const findPortalFrame = (adventure: IslandAdventure): PortalFrame => {
  const { centre, heading, level } = adventure.airfield.balloonField;
  return { centre, heading, level };
};

const placeInFrame = (
  { centre, heading, level }: PortalFrame,
  local: Spot3,
): Spot3 => ({
  x: centre.x + local.x * Math.cos(heading) + local.z * Math.sin(heading),
  y: level + local.y,
  z: centre.z - local.x * Math.sin(heading) + local.z * Math.cos(heading),
});

// How far the portal has opened, from shut (0) to fully open (1). It opens
// while the Character waits, stays open while they walk through, then closes
// behind them.
export const findPortalOpening = (
  phase: VoyagePhase,
  share: number,
): number => {
  if (phase === "calling") {
    return smoothStep(0.1, 0.8, share);
  }
  if (phase === "docking") {
    return smoothStep(0.5, 0.95, share);
  }
  if (isStepping(phase)) {
    return 1;
  }
  if (phase === "departing") {
    return 1 - smoothStep(0.05, 0.45, share);
  }
  if (phase === "leaving") {
    return 1 - smoothStep(0.25, 0.8, share);
  }
  return 0;
};

const wispRiseShare = 0.45;
const wispFallShare = 0.5;

// The closed portal is a wisp of light at the ring's centre: on the way out it
// shoots up into the sky, and on the way in it falls from the sky and opens.
export const findPortalPlacement = (
  adventure: IslandAdventure,
  phase: LandPhase,
  share: number,
): CraftPlacement => {
  const frame = findPortalFrame(adventure);
  const rise =
    phase === "departing"
      ? smoothStep(wispRiseShare, 1, share) ** 2
      : phase === "docking"
        ? (1 - smoothStep(0, wispFallShare, share)) ** 2
        : 0;
  return {
    ...placeInFrame(frame, { x: 0, y: portalWispHeight * rise, z: 0 }),
    heading: frame.heading,
    pitch: 0,
    roll: 0,
  };
};

const walkInShare = 0.15;
const walkedThroughShare = 0.88;

const portalWay: Spot3[] = [
  { x: portalDaisRadius + 2.4, y: 0, z: 0 },
  { x: portalDaisRadius + 0.15, y: 0, z: 0 },
  { x: portalDaisRadius - 0.25, y: portalDaisHeight, z: 0 },
  { x: -0.1, y: portalDaisHeight, z: 0 },
];

const findAlongWay = (path: readonly Spot3[], share: number): Spot3 => {
  const lengths = path
    .slice(1)
    .map((end, index) =>
      Math.hypot(
        end.x - path[index].x,
        end.y - path[index].y,
        end.z - path[index].z,
      ),
    );
  let remaining = share * lengths.reduce((total, length) => total + length, 0);
  for (const [index, length] of lengths.entries()) {
    if (remaining <= length || index === lengths.length - 1) {
      const along = length === 0 ? 1 : Math.min(1, remaining / length);
      const start = path[index];
      const end = path[index + 1];
      return {
        x: start.x + (end.x - start.x) * along,
        y: start.y + (end.y - start.y) * along,
        z: start.z + (end.z - start.z) * along,
      };
    }
    remaining -= length;
  }
  return path[path.length - 1];
};

const findOpenPortal = (adventure: IslandAdventure): CraftPlacement =>
  findPortalPlacement(adventure, "boarding", 0);

export const findPortalWaitingSpot = (adventure: IslandAdventure): MapPoint => {
  const { x, z } = placeInFrame(findPortalFrame(adventure), portalWay[0]);
  return { x, z };
};

export const findPortalArrivalHeading = (adventure: IslandAdventure): number =>
  findOpenPortal(adventure).heading + Math.PI / 2;

export const isWalkingThroughPortal = (
  phase: VoyagePhase,
  share: number,
): boolean =>
  isStepping(phase) && share > walkInShare && share < walkedThroughShare;

export const findPortalCarriedSpot = (
  adventure: IslandAdventure,
  phase: LandPhase,
  share: number,
): BoardingSpot => {
  const frame = findPortalFrame(adventure);
  const { heading } = findOpenPortal(adventure);
  const towardsPortal = heading - Math.PI / 2;
  const awayFromPortal = heading + Math.PI / 2;
  if (phase === "calling") {
    return {
      ...placeInFrame(frame, portalWay[0]),
      heading: towardsPortal,
      isInside: false,
    };
  }
  if (isStepping(phase)) {
    const walked = smoothStep(walkInShare, walkedThroughShare, share);
    const path = phase === "boarding" ? portalWay : portalWay.toReversed();
    const isInside =
      phase === "boarding" ? share >= walkedThroughShare : share < walkInShare;
    return {
      ...placeInFrame(frame, findAlongWay(path, walked)),
      heading: phase === "boarding" ? towardsPortal : awayFromPortal,
      isInside,
    };
  }
  const placement = findPortalPlacement(adventure, phase, share);
  return {
    x: placement.x,
    y: placement.y + portalRingCentre,
    z: placement.z,
    heading,
    isInside: true,
  };
};

const portalCameraOffset: Spot3 = { x: 7, y: 4.5, z: 9 };

export const findPortalCameraSpot = (adventure: IslandAdventure): Spot3 =>
  placeInFrame(findPortalFrame(adventure), {
    x: portalWay[0].x + portalCameraOffset.x,
    y: portalCameraOffset.y,
    z: portalCameraOffset.z,
  });

const groundedWithin = 0.5;

// The ring's two sides are solid while the portal stands on the Field; the
// way through its middle is not.
export const listPortalBlockers = (
  adventure: IslandAdventure,
  portal: CraftPlacement,
): { centre: MapPoint; radius: number }[] => {
  const frame = findPortalFrame(adventure);
  if (portal.y - frame.level > groundedWithin) {
    return [];
  }
  return [-1, 1].map((side) => {
    const { x, z } = placeInFrame(frame, {
      x: 0,
      y: 0,
      z: side * (portalRingRadius + portalStoneWidth / 2),
    });
    return { centre: { x, z }, radius: portalStoneWidth * 0.9 };
  });
};
