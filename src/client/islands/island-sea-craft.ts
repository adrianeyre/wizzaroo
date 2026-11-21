import { smoothStep, type MapPoint } from "../world-map-terrain.js";
import {
  buildDockPier,
  findBridgeDeck,
  pierDeckHeight,
  pierHalfWidth,
  type Dock,
  type IslandAdventure,
} from "./island-adventures.js";
import {
  findDoorOpening,
  type BoardingSpot,
  type CraftPlacement,
  type LandPhase,
  type Spot3,
} from "./island-flight.js";
import type { VoyagePhase } from "./island-voyage.js";

export type SeaCraft = "hovercraft" | "submarine" | "jetski";

export const seaCraftPhaseSeconds: Record<
  SeaCraft,
  Record<LandPhase, number>
> = {
  hovercraft: {
    calling: 10,
    boarding: 5,
    departing: 10,
    docking: 10,
    landing: 5,
    leaving: 10,
  },
  submarine: {
    calling: 11,
    boarding: 6,
    departing: 11,
    docking: 11,
    landing: 6,
    leaving: 11,
  },
  jetski: {
    calling: 8,
    boarding: 4.5,
    departing: 8,
    docking: 8,
    landing: 4.5,
    leaving: 8,
  },
};

const isArriving = (phase: LandPhase): boolean =>
  phase === "calling" || phase === "docking";

const isGoing = (phase: LandPhase): boolean =>
  phase === "departing" || phase === "leaving";

const isStepping = (phase: VoyagePhase): boolean =>
  phase === "boarding" || phase === "landing";

const easeOut = (share: number): number => 1 - (1 - share) ** 2;

const placeLocal = (
  { x, z, heading }: { x: number; z: number; heading: number },
  local: { x: number; z: number },
): MapPoint => ({
  x: x + local.x * Math.cos(heading) + local.z * Math.sin(heading),
  z: z - local.x * Math.sin(heading) + local.z * Math.cos(heading),
});

const placeOnCraft = (craft: CraftPlacement, local: Spot3): Spot3 => ({
  ...placeLocal(craft, local),
  y: craft.y + local.y,
});

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

const doorOpeningShare = 0.22;
const boardedShare = 0.92;

export const hovercraftLength = 14;
export const hovercraftBeam = 6.6;
export const hovercraftDeck = 1.35;
export const hovercraftBow = 6.4;
export const hovercraftRampSpan = 2.6;
export const hovercraftRampDrop = Math.asin(
  hovercraftDeck / hovercraftRampSpan,
);
const hovercraftRampLength = hovercraftRampSpan * Math.cos(hovercraftRampDrop);
export const hovercraftCushion = 0.55;
export const hoverSlipSlope = 0.2;
const hovercraftApproach = 95;
const hovercraftReachAhead = 5;
const hovercraftTurnOut = 30;

export const findHoverSurface = (
  adventure: IslandAdventure,
  point: MapPoint,
): number => {
  const { centre, heading, slipStart, slipLevel } = adventure.hoverPad;
  const along =
    (point.x - centre.x) * Math.sin(heading) +
    (point.z - centre.z) * Math.cos(heading);
  const slipway =
    along <= -slipStart
      ? slipLevel + hoverSlipSlope * (along + slipStart)
      : -Infinity;
  return Math.max(0, adventure.findHeight(point), slipway);
};

const findPadPoint = (adventure: IslandAdventure, along: number): MapPoint => {
  const { centre, heading } = adventure.hoverPad;
  return {
    x: centre.x + Math.sin(heading) * along,
    z: centre.z + Math.cos(heading) * along,
  };
};

const placeHovercraftAt = (
  adventure: IslandAdventure,
  spot: MapPoint,
  heading: number,
  cushion: number,
): CraftPlacement => {
  const forward = { x: Math.sin(heading), z: Math.cos(heading) };
  const side = { x: Math.cos(heading), z: -Math.sin(heading) };
  const sample = (along: number, across: number) =>
    findHoverSurface(adventure, {
      x: spot.x + forward.x * along + side.x * across,
      z: spot.z + forward.z * along + side.z * across,
    });
  const ahead = sample(hovercraftReachAhead, 0);
  const behind = sample(-hovercraftReachAhead, 0);
  const right = sample(0, hovercraftBeam / 2 - 0.6);
  const left = sample(0, -(hovercraftBeam / 2 - 0.6));
  const middle = Math.max(sample(0, 0), (ahead + behind) / 2);
  return {
    ...spot,
    y: middle + cushion,
    heading,
    pitch: Math.atan2(ahead - behind, hovercraftReachAhead * 2),
    roll: Math.atan2(right - left, hovercraftBeam - 1.2),
  };
};

const skirtFillShare = 0.15;

const findHovercraftLanding = (
  adventure: IslandAdventure,
  share: number,
): CraftPlacement => {
  const { heading } = adventure.hoverPad;
  const settle = smoothStep(0.85, 1, share);
  return placeHovercraftAt(
    adventure,
    findPadPoint(adventure, -hovercraftApproach * (1 - easeOut(share))),
    heading,
    hovercraftCushion * (1 - settle),
  );
};

const findHovercraftTakeOff = (
  adventure: IslandAdventure,
  share: number,
): CraftPlacement => {
  const { heading, slipStart } = adventure.hoverPad;
  const lift = smoothStep(0, skirtFillShare, share);
  const moving = Math.max(0, (share - skirtFillShare) / (1 - skirtFillShare));
  const backOff = slipStart + hovercraftTurnOut;
  const reversing = smoothStep(0, 0.45, moving);
  const turning = smoothStep(0.4, 0.65, moving);
  const away = Math.max(0, (moving - 0.6) / 0.4) ** 2;
  const along =
    -backOff * reversing - (hovercraftApproach - backOff) * Math.max(0, away);
  return placeHovercraftAt(
    adventure,
    findPadPoint(adventure, along),
    heading + Math.PI * turning,
    hovercraftCushion * lift,
  );
};

export const subLength = 18;
export const subHullRadius = 1.25;
export const subDeckHeight = pierDeckHeight;
export const subDeckHalfWidth = 0.6;
export const subHatch: Spot3 = { x: 0, y: subDeckHeight, z: -2.6 };
export const subBrowZ = -0.6;
export const subDivingDepth = 8;
const subBerthGap = 1.65;
const subBrowOverlap = 0.5;
export const subBrowLength = subBerthGap + subBrowOverlap;
const subBerthSetBack = 1;
const subApproach = 95;
const subDepartureSwing = subLength * 0.6;
const subDivePitch = 0.14;

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

export const findSubBerth = (dock: Dock): CraftPlacement => {
  const { seaward, across, landwardHeading } = findDockFrame(dock);
  const along = subLength / 2 - subBerthSetBack;
  const out = pierHalfWidth + subDeckHalfWidth + subBerthGap;
  return {
    x: dock.to.x - seaward.x * along + across.x * out,
    y: 0,
    z: dock.to.z - seaward.z * along + across.z * out,
    heading: landwardHeading,
    pitch: 0,
    roll: 0,
  };
};

export const findSubPierSide = (dock: Dock): -1 | 1 => {
  const { across, landwardHeading } = findDockFrame(dock);
  const sideX =
    Math.cos(landwardHeading) * across.x - Math.sin(landwardHeading) * across.z;
  return sideX > 0 ? -1 : 1;
};

const findDivingDepth = (surfacing: number): number =>
  (smoothStep(0, 1, surfacing) - 1) * subDivingDepth;

const findBellCurve = (share: number): number => 4 * share * (1 - share);

const findSubArrival = (dock: Dock, share: number): CraftPlacement => {
  const berth = findSubBerth(dock);
  const { seaward } = findDockFrame(dock);
  const still = subApproach * (1 - easeOut(share));
  const surfacing = smoothStep(0.25, 0.7, share);
  const rising = findBellCurve(surfacing);
  return {
    ...berth,
    x: berth.x + seaward.x * still,
    y: findDivingDepth(surfacing),
    z: berth.z + seaward.z * still,
    pitch: subDivePitch * rising,
  };
};

const findSubDeparture = (dock: Dock, share: number): CraftPlacement => {
  const berth = findSubBerth(dock);
  const { seaward, across } = findDockFrame(dock);
  const underway = Math.max(0, (share - 0.12) / 0.88);
  const swing = smoothStep(0, 0.3, underway);
  const turn = smoothStep(0.2, 0.55, underway);
  const out = subApproach * underway ** 2;
  const diving = smoothStep(0.45, 0.9, underway);
  return {
    x: berth.x + across.x * subDepartureSwing * swing + seaward.x * out,
    y: findDivingDepth(1 - diving),
    z: berth.z + across.z * subDepartureSwing * swing + seaward.z * out,
    heading: berth.heading + Math.PI * turn,
    pitch: -subDivePitch * findBellCurve(diving),
    roll: 0,
  };
};

export const jetskiLength = 3.6;
export const jetskiBeam = 1.3;
export const jetskiFootwell = 0.5;
export const jetskiRiderZ = 0.3;
const jetskiBerthGap = 0.35;
const jetskiBerthSetBack = 1.6;
const jetskiApproach = 95;
const jetskiCarve = 7;
const jetskiPlaningPitch = 0.12;
const jetskiDepartureSwing = 3;

export const findJetskiBerth = (dock: Dock): CraftPlacement => {
  const { seaward, across, landwardHeading } = findDockFrame(dock);
  const along = jetskiLength / 2 + jetskiBerthSetBack;
  const out = pierHalfWidth + jetskiBeam / 2 + jetskiBerthGap;
  return {
    x: dock.to.x - seaward.x * along + across.x * out,
    y: 0,
    z: dock.to.z - seaward.z * along + across.z * out,
    heading: landwardHeading,
    pitch: 0,
    roll: 0,
  };
};

const findJetskiArrivalSpot = (dock: Dock, share: number): MapPoint => {
  const berth = findJetskiBerth(dock);
  const { seaward, across } = findDockFrame(dock);
  const left = 1 - easeOut(Math.min(1, share));
  const still = jetskiApproach * left;
  const carve = jetskiCarve * Math.sin(Math.PI * left) * left;
  return {
    x: berth.x + seaward.x * still + across.x * carve,
    z: berth.z + seaward.z * still + across.z * carve,
  };
};

const findJetskiArrival = (dock: Dock, share: number): CraftPlacement => {
  const berth = findJetskiBerth(dock);
  const here = findJetskiArrivalSpot(dock, share);
  const ahead = findJetskiArrivalSpot(dock, share + 0.01);
  const moved = Math.hypot(ahead.x - here.x, ahead.z - here.z);
  const steer = Math.atan2(ahead.x - here.x, ahead.z - here.z) - berth.heading;
  const turned = Math.atan2(Math.sin(steer), Math.cos(steer));
  const left = 1 - easeOut(share);
  return {
    ...berth,
    ...here,
    heading: berth.heading + turned * smoothStep(0.02, 0.2, moved),
    pitch: jetskiPlaningPitch * smoothStep(0.05, 0.5, 1 - share),
    roll: -0.6 * turned * smoothStep(0.02, 0.2, moved) * Math.min(1, left * 3),
  };
};

const findJetskiDeparture = (dock: Dock, share: number): CraftPlacement => {
  const berth = findJetskiBerth(dock);
  const { seaward, across } = findDockFrame(dock);
  const underway = Math.max(0, (share - 0.1) / 0.9);
  const swing = smoothStep(0, 0.3, underway);
  const turn = smoothStep(0.15, 0.5, underway);
  const out = jetskiApproach * Math.max(0, underway - 0.2) ** 2 * 1.56;
  return {
    x: berth.x + across.x * jetskiDepartureSwing * swing + seaward.x * out,
    y: 0,
    z: berth.z + across.z * jetskiDepartureSwing * swing + seaward.z * out,
    heading: berth.heading + Math.PI * turn,
    pitch: jetskiPlaningPitch * smoothStep(0.45, 0.75, underway),
    roll: 0.2 * Math.sin(Math.PI * turn),
  };
};

export const findJetskiSpray = (phase: VoyagePhase, share: number): number => {
  if (phase === "crossing") {
    return 1;
  }
  if (phase === "calling" || phase === "docking") {
    return 1 - smoothStep(0.55, 0.95, share);
  }
  if (phase === "departing" || phase === "leaving") {
    return smoothStep(0.35, 0.65, share);
  }
  return 0;
};

export const findSeaCraftPlacement = (
  adventure: IslandAdventure,
  craft: SeaCraft,
  phase: LandPhase,
  share: number,
): CraftPlacement => {
  if (craft === "hovercraft") {
    if (isArriving(phase)) {
      return findHovercraftLanding(adventure, share);
    }
    if (isGoing(phase)) {
      return findHovercraftTakeOff(adventure, share);
    }
    return findHovercraftLanding(adventure, 1);
  }
  if (craft === "jetski") {
    if (isArriving(phase)) {
      return findJetskiArrival(adventure.dock, share);
    }
    if (isGoing(phase)) {
      return findJetskiDeparture(adventure.dock, share);
    }
    return findJetskiBerth(adventure.dock);
  }
  if (isArriving(phase)) {
    return findSubArrival(adventure.dock, share);
  }
  if (isGoing(phase)) {
    return findSubDeparture(adventure.dock, share);
  }
  return findSubBerth(adventure.dock);
};

export const findSubWaitingSpot = (dock: Dock): MapPoint => {
  const berth = findSubBerth(dock);
  const side = findSubPierSide(dock);
  return placeLocal(berth, {
    x: side * (subDeckHalfWidth + subBerthGap + pierHalfWidth * 0.7),
    z: subBrowZ,
  });
};

const findPierHeight = (adventure: IslandAdventure, spot: MapPoint): number =>
  findBridgeDeck(buildDockPier(adventure), spot, adventure.findHeight(spot)) ??
  pierDeckHeight;

const hovercraftWaitingLocal: Spot3 = {
  x: 0,
  y: 0,
  z: hovercraftBow + hovercraftRampLength + 2.6,
};

const findHovercraftWay = (): Spot3[] => [
  hovercraftWaitingLocal,
  { x: 0, y: 0, z: hovercraftBow + hovercraftRampLength - 0.2 },
  { x: 0, y: hovercraftDeck, z: hovercraftBow - 0.2 },
  { x: 0, y: hovercraftDeck, z: hovercraftBow - 2.4 },
];

const findSubWay = (dock: Dock): Spot3[] => {
  const side = findSubPierSide(dock);
  return [
    {
      x: side * (subDeckHalfWidth + subBerthGap + pierHalfWidth * 0.7),
      y: subDeckHeight,
      z: subBrowZ,
    },
    { x: side * subDeckHalfWidth, y: subDeckHeight, z: subBrowZ },
    { x: 0, y: subDeckHeight, z: subBrowZ },
    { ...subHatch, z: subHatch.z + 0.05 },
    { ...subHatch, y: subHatch.y - 1.4 },
  ];
};

const findJetskiWay = (dock: Dock): Spot3[] => {
  const side = findSubPierSide(dock);
  const pierEdge = jetskiBeam / 2 + jetskiBerthGap;
  return [
    {
      x: side * (pierEdge + pierHalfWidth * 0.7),
      y: pierDeckHeight,
      z: jetskiRiderZ,
    },
    { x: side * (pierEdge + 0.05), y: pierDeckHeight, z: jetskiRiderZ },
    { x: side * 0.35, y: jetskiFootwell, z: jetskiRiderZ },
    { x: 0, y: jetskiFootwell, z: jetskiRiderZ },
  ];
};

const findSeaCraftWay = (adventure: IslandAdventure, craft: SeaCraft) => {
  if (craft === "hovercraft") {
    return findHovercraftWay();
  }
  return craft === "jetski"
    ? findJetskiWay(adventure.dock)
    : findSubWay(adventure.dock);
};

const findParked = (
  adventure: IslandAdventure,
  craft: SeaCraft,
): CraftPlacement => findSeaCraftPlacement(adventure, craft, "boarding", 0);

const settleOnGround = (
  adventure: IslandAdventure,
  craft: SeaCraft,
  spot: Spot3,
  local: Spot3,
): Spot3 => {
  if (local.y !== 0) {
    return spot;
  }
  return craft === "hovercraft"
    ? { ...spot, y: findHoverSurface(adventure, spot) }
    : spot;
};

export const findSeaCraftWaitingSpot = (
  adventure: IslandAdventure,
  craft: SeaCraft,
): MapPoint => {
  if (craft === "submarine") {
    return findSubWaitingSpot(adventure.dock);
  }
  if (craft === "jetski") {
    const { x, z } = placeOnCraft(
      findParked(adventure, craft),
      findJetskiWay(adventure.dock)[0],
    );
    return { x, z };
  }
  const { x, z } = placeOnCraft(
    findParked(adventure, craft),
    hovercraftWaitingLocal,
  );
  return { x, z };
};

export const findSeaCraftArrivalHeading = (
  adventure: IslandAdventure,
  craft: SeaCraft,
): number => {
  const parked = findParked(adventure, craft);
  if (craft === "hovercraft") {
    return parked.heading;
  }
  return parked.heading + findSubPierSide(adventure.dock) * (Math.PI / 2);
};

export const isWalkingToSeaCraft = (
  phase: VoyagePhase,
  share: number,
): boolean =>
  isStepping(phase) && share > doorOpeningShare && share < boardedShare;

export const findSeaCraftOpening = findDoorOpening;

export const findSkirtLift = (phase: VoyagePhase, share: number): number => {
  if (phase === "crossing") {
    return 1;
  }
  if (phase === "calling" || phase === "docking") {
    return 1 - smoothStep(0.85, 1, share);
  }
  if (phase === "departing" || phase === "leaving") {
    return smoothStep(0, skirtFillShare, share);
  }
  return 0;
};

export const findSeaCraftCarriedSpot = (
  adventure: IslandAdventure,
  craft: SeaCraft,
  phase: LandPhase,
  share: number,
): BoardingSpot => {
  const placement = findSeaCraftPlacement(adventure, craft, phase, share);
  const way = findSeaCraftWay(adventure, craft);
  const isRidingInView = craft === "jetski";
  const arrivalHeading = findSeaCraftArrivalHeading(adventure, craft);
  const towardsCraft = arrivalHeading + Math.PI;
  if (phase === "calling") {
    const parked = findParked(adventure, craft);
    return {
      ...settleOnGround(adventure, craft, placeOnCraft(parked, way[0]), way[0]),
      heading: towardsCraft,
      isInside: false,
    };
  }
  if (isStepping(phase)) {
    const walked = smoothStep(doorOpeningShare, boardedShare, share);
    const path = phase === "boarding" ? way : way.toReversed();
    const local = findAlongWay(path, walked);
    const isInside =
      !isRidingInView &&
      (phase === "boarding" ? share >= boardedShare : share < doorOpeningShare);
    return {
      ...settleOnGround(
        adventure,
        craft,
        placeOnCraft(placement, local),
        local,
      ),
      heading: phase === "boarding" ? towardsCraft : arrivalHeading,
      isInside,
    };
  }
  return {
    ...placeOnCraft(placement, way[way.length - 1]),
    heading: placement.heading,
    isInside: !isRidingInView,
  };
};

const seaCraftCameraOffsets: Record<SeaCraft, Spot3> = {
  hovercraft: { x: 9, y: 6, z: 9 },
  submarine: { x: -6, y: 6, z: 12 },
  jetski: { x: -5, y: 4, z: 8 },
};

export const findSeaCraftCameraSpot = (
  adventure: IslandAdventure,
  craft: SeaCraft,
): Spot3 => {
  const parked = findParked(adventure, craft);
  const waiting = findSeaCraftWaitingSpot(adventure, craft);
  const offset = seaCraftCameraOffsets[craft];
  const { x, z } = placeLocal(
    { ...waiting, heading: parked.heading },
    { x: offset.x, z: offset.z },
  );
  return {
    x,
    y:
      (craft === "hovercraft"
        ? findHoverSurface(adventure, waiting)
        : findPierHeight(adventure, waiting)) + offset.y,
    z,
  };
};

const hovercraftBlockerRadius = 3.2;
const subBlockerRadius = 1.4;
const groundedWithin = 1.5;

const seaCraftBlockerShapes: Record<
  SeaCraft,
  { length: number; radius: number; count: number }
> = {
  hovercraft: {
    length: hovercraftLength,
    radius: hovercraftBlockerRadius,
    count: 3,
  },
  submarine: { length: subLength, radius: subBlockerRadius, count: 5 },
  jetski: { length: jetskiLength, radius: jetskiBeam / 2, count: 2 },
};

export const listSeaCraftBlockers = (
  adventure: IslandAdventure,
  craft: SeaCraft,
  placement: CraftPlacement,
): { centre: MapPoint; radius: number }[] => {
  const parked = findParked(adventure, craft);
  const { length, radius, count } = seaCraftBlockerShapes[craft];
  const isAtBerth =
    Math.abs(placement.y - parked.y) < groundedWithin &&
    Math.hypot(placement.x - parked.x, placement.z - parked.z) < length;
  if (!isAtBerth) {
    return [];
  }
  return Array.from({ length: count }, (_, index) => ({
    centre: placeLocal(placement, {
      x: 0,
      z: ((index / (count - 1)) * 2 - 1) * (length / 2 - radius),
    }),
    radius,
  }));
};
