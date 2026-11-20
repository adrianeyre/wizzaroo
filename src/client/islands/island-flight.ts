import {
  runwayHalfLength,
  smoothStep,
  type MapPoint,
} from "../world-map-terrain.js";
import { exploreScale, type IslandAdventure } from "./island-adventures.js";
import type { CarriedSpot, VoyagePhase } from "./island-voyage.js";

export type Aircraft = "aeroplane" | "helicopter" | "balloon";

export type LandPhase = Exclude<VoyagePhase, "crossing">;

export interface CraftPlacement {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
}

export interface Spot3 {
  x: number;
  y: number;
  z: number;
}

export interface BoardingSpot extends CarriedSpot {
  isInside: boolean;
}

export const aeroplaneDoor: Spot3 = { x: 1.2, y: 1.6, z: 6.6 };
export const aeroplaneStairRun = 2.6;
const aeroplaneLength = 20;
export const aeroplaneWingspan = 19;
export const helicopterDoor: Spot3 = { x: 0.86, y: 0.75, z: 0.15 };
export const helicopterRotorRadius = 5.4;
export const balloonBasketHalfWidth = 1;
export const balloonBasketFloor = 0.14;
export const balloonBasketRim = 1.12;
export const balloonDoor: Spot3 = {
  x: balloonBasketHalfWidth,
  y: balloonBasketFloor,
  z: 0,
};

export const aircraftPhaseSeconds: Record<
  Aircraft,
  Record<LandPhase, number>
> = {
  aeroplane: {
    calling: 10,
    boarding: 5,
    departing: 9,
    docking: 10,
    landing: 5,
    leaving: 9,
  },
  helicopter: {
    calling: 9,
    boarding: 4.5,
    departing: 8,
    docking: 9,
    landing: 4.5,
    leaving: 8,
  },
  balloon: {
    calling: 11,
    boarding: 5,
    departing: 10,
    docking: 11,
    landing: 5,
    leaving: 10,
  },
};

const isArriving = (phase: LandPhase): boolean =>
  phase === "calling" || phase === "docking";

const isGoing = (phase: LandPhase): boolean =>
  phase === "departing" || phase === "leaving";

const isStepping = (phase: LandPhase): boolean =>
  phase === "boarding" || phase === "landing";

interface Frame {
  centre: MapPoint;
  heading: number;
  level: number;
}

const placeInFrame = (
  { centre, heading, level }: Frame,
  local: Spot3,
): Spot3 => ({
  x: centre.x + local.x * Math.cos(heading) + local.z * Math.sin(heading),
  y: level + local.y,
  z: centre.z - local.x * Math.sin(heading) + local.z * Math.cos(heading),
});

const placeOnCraft = (craft: CraftPlacement, local: Spot3): Spot3 =>
  placeInFrame(
    { centre: { x: craft.x, z: craft.z }, heading: craft.heading, level: 0 },
    { ...local, y: craft.y + local.y },
  );

const findRunwayFrame = (adventure: IslandAdventure): Frame => {
  const { runway } = adventure.airfield;
  return {
    centre: runway.centre,
    heading: runway.heading,
    level: runway.level,
  };
};

const findHelipadFrame = (adventure: IslandAdventure): Frame => {
  const { helipad } = adventure.airfield;
  return {
    centre: helipad.centre,
    heading: helipad.heading,
    level: helipad.level,
  };
};

const findBalloonFieldFrame = (adventure: IslandAdventure): Frame => {
  const { balloonField } = adventure.airfield;
  return {
    centre: balloonField.centre,
    heading: balloonField.heading,
    level: balloonField.level,
  };
};

const aircraftFrames: Record<Aircraft, (adventure: IslandAdventure) => Frame> =
  {
    aeroplane: findRunwayFrame,
    helicopter: findHelipadFrame,
    balloon: findBalloonFieldFrame,
  };

const findAircraftFrame = (
  adventure: IslandAdventure,
  aircraft: Aircraft,
): Frame => aircraftFrames[aircraft](adventure);

const exploreRunwayHalfLength = runwayHalfLength * exploreScale;
const touchdownAlong = -exploreRunwayHalfLength + 12;
const approachAlong = touchdownAlong - 165;
const glideSlope = 0.17;
const flareLength = 12;
const rolloutLength = -touchdownAlong;
const touchdownShare =
  (touchdownAlong - approachAlong) /
  (touchdownAlong - approachAlong + 2 * rolloutLength);
const approachPitch = 0.05;
const flarePitch = 0.13;

const findGlideHeight = (beforeTouchdown: number): number =>
  beforeTouchdown > flareLength
    ? glideSlope * (beforeTouchdown - flareLength / 2)
    : (glideSlope * beforeTouchdown * beforeTouchdown) / (2 * flareLength);

const placeAlongRunway = (
  frame: Frame,
  along: number,
  height: number,
  pitch: number,
): CraftPlacement => {
  const spot = placeInFrame(frame, { x: 0, y: height, z: along });
  return { ...spot, heading: frame.heading, pitch, roll: 0 };
};

const findAeroplaneLanding = (frame: Frame, share: number): CraftPlacement => {
  if (share < touchdownShare) {
    const along =
      approachAlong +
      (touchdownAlong - approachAlong) * (share / touchdownShare);
    const beforeTouchdown = touchdownAlong - along;
    const flare = 1 - smoothStep(0, flareLength, beforeTouchdown);
    return placeAlongRunway(
      frame,
      along,
      findGlideHeight(beforeTouchdown),
      approachPitch + (flarePitch - approachPitch) * flare,
    );
  }
  const rolled = (share - touchdownShare) / (1 - touchdownShare);
  return placeAlongRunway(
    frame,
    touchdownAlong + rolloutLength * (1 - (1 - rolled) ** 2),
    0,
    flarePitch * (1 - smoothStep(0, 0.3, rolled)),
  );
};

const doorClosingShare = 0.12;
const spoolingShare = 0.2;
const liftOffAlong = exploreRunwayHalfLength - 7;
const takeOffRollShare = 0.47;
const climbAway =
  (2 * liftOffAlong * (1 - takeOffRollShare)) / takeOffRollShare;
const climbGradient = 0.24;
const climbPitch = 0.2;

const findAeroplaneTakeOff = (frame: Frame, share: number): CraftPlacement => {
  const moving = Math.max(0, (share - spoolingShare) / (1 - spoolingShare));
  if (moving < takeOffRollShare) {
    const rolled = moving / takeOffRollShare;
    return placeAlongRunway(
      frame,
      liftOffAlong * rolled * rolled,
      0,
      climbPitch * smoothStep(0.82, 1, rolled),
    );
  }
  const climbed = (moving - takeOffRollShare) / (1 - takeOffRollShare);
  const beyondLiftOff = climbAway * climbed;
  return placeAlongRunway(
    frame,
    liftOffAlong + beyondLiftOff,
    (climbGradient * beyondLiftOff * beyondLiftOff) / (beyondLiftOff + 14),
    climbPitch,
  );
};

const helicopterApproachReach = 140;
const helicopterCruiseHeight = 40;
const hoverHeight = 9;
const approachShare = 0.65;
const liftShare = 0.4;
const liftHeight = 8;
const helicopterCruisePitch = -0.12;

const findHelicopterLanding = (frame: Frame, share: number): CraftPlacement => {
  if (share < approachShare) {
    const flown = share / approachShare;
    const eased = 1 - (1 - flown) ** 2;
    const spot = placeInFrame(frame, {
      x: 0,
      y:
        helicopterCruiseHeight + (hoverHeight - helicopterCruiseHeight) * eased,
      z: -helicopterApproachReach * (1 - eased),
    });
    const flare = smoothStep(0.35, 0.85, flown);
    return {
      ...spot,
      heading: frame.heading,
      pitch:
        (helicopterCruisePitch + (0.18 - helicopterCruisePitch) * flare) *
        (1 - smoothStep(0.88, 1, flown)),
      roll: 0,
    };
  }
  const settled = (share - approachShare) / (1 - approachShare);
  const spot = placeInFrame(frame, {
    x: 0,
    y: hoverHeight * (1 - smoothStep(0, 1, settled)),
    z: 0,
  });
  return { ...spot, heading: frame.heading, pitch: 0, roll: 0 };
};

const helicopterDepartureReach = 150;

const findHelicopterTakeOff = (frame: Frame, share: number): CraftPlacement => {
  if (share < liftShare) {
    const lifted = smoothStep(doorClosingShare, liftShare, share);
    const spot = placeInFrame(frame, { x: 0, y: liftHeight * lifted, z: 0 });
    return { ...spot, heading: frame.heading, pitch: 0, roll: 0 };
  }
  const flown = (share - liftShare) / (1 - liftShare);
  const spot = placeInFrame(frame, {
    x: 0,
    y: liftHeight + (helicopterCruiseHeight - liftHeight) * flown ** 1.5,
    z: helicopterDepartureReach * flown * flown,
  });
  return {
    ...spot,
    heading: frame.heading,
    pitch: helicopterCruisePitch * smoothStep(0, 0.25, flown),
    roll: 0,
  };
};

const balloonApproachReach = 120;
const balloonCruiseHeight = 46;
const balloonSettlingShare = 0.94;
const balloonDepartureReach = 110;
const balloonCastOffShare = 0.2;
const balloonSway = 0.025;

const findBalloonSway = (share: number, airborne: number) => ({
  pitch: balloonSway * Math.sin(share * Math.PI * 5) * airborne,
  roll: balloonSway * 0.8 * Math.sin(share * Math.PI * 3.4 + 1) * airborne,
});

const findBalloonLanding = (frame: Frame, share: number): CraftPlacement => {
  const settling = Math.min(1, share / balloonSettlingShare);
  const left = 1 - settling;
  const spot = placeInFrame(frame, {
    x: 0,
    y: balloonCruiseHeight * left ** 1.2,
    z: -balloonApproachReach * left ** 1.5,
  });
  return {
    ...spot,
    heading: frame.heading,
    ...findBalloonSway(share, left),
  };
};

const findBalloonTakeOff = (frame: Frame, share: number): CraftPlacement => {
  const risen = Math.max(
    0,
    (share - balloonCastOffShare) / (1 - balloonCastOffShare),
  );
  const spot = placeInFrame(frame, {
    x: 0,
    y: balloonCruiseHeight * risen ** 1.3,
    z: -balloonDepartureReach * risen ** 2,
  });
  return {
    ...spot,
    heading: frame.heading,
    ...findBalloonSway(share, smoothStep(0, 0.3, risen)),
  };
};

const burnerBlasts: Partial<Record<VoyagePhase, [number, number][]>> = {
  calling: [
    [0.3, 0.42],
    [0.7, 0.8],
  ],
  docking: [
    [0.3, 0.42],
    [0.7, 0.8],
  ],
  departing: [[0.08, 0.8]],
  leaving: [[0.08, 0.8]],
  crossing: [
    [0.05, 0.2],
    [0.4, 0.52],
    [0.75, 0.86],
  ],
};

const blastEdge = 0.03;

export const findBurnerBlast = (phase: VoyagePhase, share: number): number =>
  Math.max(
    0,
    ...(burnerBlasts[phase] ?? []).map(
      ([from, to]) =>
        smoothStep(from - blastEdge, from, share) *
        (1 - smoothStep(to, to + blastEdge, share)),
    ),
  );

export const findAircraftPlacement = (
  adventure: IslandAdventure,
  aircraft: Aircraft,
  phase: LandPhase,
  share: number,
): CraftPlacement => {
  const frame = findAircraftFrame(adventure, aircraft);
  if (aircraft === "aeroplane") {
    if (isArriving(phase)) {
      return findAeroplaneLanding(frame, share);
    }
    if (isGoing(phase)) {
      return findAeroplaneTakeOff(frame, share);
    }
    return placeAlongRunway(frame, 0, 0, 0);
  }
  if (aircraft === "balloon") {
    if (isArriving(phase)) {
      return findBalloonLanding(frame, share);
    }
    if (isGoing(phase)) {
      return findBalloonTakeOff(frame, share);
    }
    return {
      ...placeInFrame(frame, { x: 0, y: 0, z: 0 }),
      heading: frame.heading,
      pitch: 0,
      roll: 0,
    };
  }
  if (isArriving(phase)) {
    return findHelicopterLanding(frame, share);
  }
  if (isGoing(phase)) {
    return findHelicopterTakeOff(frame, share);
  }
  return {
    ...placeInFrame(frame, { x: 0, y: 0, z: 0 }),
    heading: frame.heading,
    pitch: 0,
    roll: 0,
  };
};

const doorOpeningShare = 0.22;
const boardedShare = 0.92;

export const findDoorOpening = (phase: VoyagePhase, share: number): number => {
  if (phase === "boarding" || phase === "landing") {
    return smoothStep(0, doorOpeningShare, share);
  }
  if (phase === "departing" || phase === "leaving") {
    return 1 - smoothStep(0, doorClosingShare, share);
  }
  return 0;
};

interface BoardingWay {
  waiting: Spot3;
  path: Spot3[];
  isRidingInView?: boolean;
}

const aeroplaneBoardingWay: BoardingWay = {
  waiting: {
    x: aeroplaneDoor.x + aeroplaneStairRun + 2.6,
    y: 0,
    z: aeroplaneDoor.z,
  },
  path: [
    { x: aeroplaneDoor.x + aeroplaneStairRun + 2.6, y: 0, z: aeroplaneDoor.z },
    { x: aeroplaneDoor.x + aeroplaneStairRun + 0.3, y: 0, z: aeroplaneDoor.z },
    { x: aeroplaneDoor.x + 0.1, y: aeroplaneDoor.y, z: aeroplaneDoor.z },
    { x: aeroplaneDoor.x - 0.35, y: aeroplaneDoor.y, z: aeroplaneDoor.z },
  ],
};

const helicopterBoardingWay: BoardingWay = {
  waiting: { x: helicopterRotorRadius + 1.3, y: 0, z: helicopterDoor.z + 1.2 },
  path: [
    { x: helicopterRotorRadius + 1.3, y: 0, z: helicopterDoor.z + 1.2 },
    { x: helicopterDoor.x + 0.7, y: 0, z: helicopterDoor.z },
    { x: helicopterDoor.x, y: helicopterDoor.y, z: helicopterDoor.z },
    { x: helicopterDoor.x - 0.3, y: helicopterDoor.y, z: helicopterDoor.z },
  ],
};

const balloonBoardingWay: BoardingWay = {
  waiting: { x: balloonBasketHalfWidth + 2.4, y: 0, z: 0 },
  path: [
    { x: balloonBasketHalfWidth + 2.4, y: 0, z: 0 },
    { x: balloonDoor.x + 0.45, y: 0, z: balloonDoor.z },
    { x: balloonDoor.x - 0.15, y: balloonDoor.y, z: balloonDoor.z },
    { x: 0.2, y: balloonDoor.y, z: -0.15 },
  ],
  isRidingInView: true,
};

const boardingWays: Record<Aircraft, BoardingWay> = {
  aeroplane: aeroplaneBoardingWay,
  helicopter: helicopterBoardingWay,
  balloon: balloonBoardingWay,
};

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

const findParkedPlacement = (
  adventure: IslandAdventure,
  aircraft: Aircraft,
): CraftPlacement => findAircraftPlacement(adventure, aircraft, "boarding", 0);

export const findAircraftWaitingSpot = (
  adventure: IslandAdventure,
  aircraft: Aircraft,
): MapPoint => {
  const { x, z } = placeOnCraft(
    findParkedPlacement(adventure, aircraft),
    boardingWays[aircraft].waiting,
  );
  return { x, z };
};

export const findAircraftArrivalHeading = (
  adventure: IslandAdventure,
  aircraft: Aircraft,
): number => findParkedPlacement(adventure, aircraft).heading + Math.PI / 2;

export const isWalkingToAircraft = (
  phase: VoyagePhase,
  share: number,
): boolean =>
  (phase === "boarding" || phase === "landing") &&
  share > doorOpeningShare &&
  share < boardedShare;

export const findAircraftCarriedSpot = (
  adventure: IslandAdventure,
  aircraft: Aircraft,
  phase: LandPhase,
  share: number,
): BoardingSpot => {
  const craft = findAircraftPlacement(adventure, aircraft, phase, share);
  const way = boardingWays[aircraft];
  const towardsCraft = craft.heading - Math.PI / 2;
  const awayFromCraft = craft.heading + Math.PI / 2;
  if (phase === "calling") {
    const parked = findParkedPlacement(adventure, aircraft);
    return {
      ...placeOnCraft(parked, way.waiting),
      heading: towardsCraft,
      isInside: false,
    };
  }
  if (isStepping(phase)) {
    const walked = smoothStep(doorOpeningShare, boardedShare, share);
    const path = phase === "boarding" ? way.path : way.path.toReversed();
    const local = findAlongWay(path, walked);
    const isInside =
      way.isRidingInView !== true &&
      (phase === "boarding" ? share >= boardedShare : share < doorOpeningShare);
    return {
      ...placeOnCraft(craft, local),
      heading: phase === "boarding" ? towardsCraft : awayFromCraft,
      isInside,
    };
  }
  return {
    ...placeOnCraft(craft, way.path[way.path.length - 1]),
    heading: craft.heading,
    isInside: way.isRidingInView !== true,
  };
};

const aircraftCameraOffsets: Record<Aircraft, Spot3> = {
  aeroplane: { x: 9, y: 6, z: 14 },
  helicopter: { x: 5, y: 6, z: 10 },
  balloon: { x: 8, y: 7, z: 13 },
};

export const findAircraftCameraSpot = (
  adventure: IslandAdventure,
  aircraft: Aircraft,
): Spot3 => {
  const parked = findParkedPlacement(adventure, aircraft);
  const { waiting } = boardingWays[aircraft];
  const offset = aircraftCameraOffsets[aircraft];
  return placeOnCraft(parked, {
    x: waiting.x + offset.x,
    y: offset.y,
    z: waiting.z + offset.z,
  });
};

const aeroplaneBlockerRadius = 1.4;
const aeroplaneBlockerCount = 7;
const groundedWithin = 2.5;

export const listAircraftBlockers = (
  adventure: IslandAdventure,
  aircraft: Aircraft,
  craft: CraftPlacement,
): { centre: MapPoint; radius: number }[] => {
  const frame = findAircraftFrame(adventure, aircraft);
  if (craft.y - frame.level > groundedWithin) {
    return [];
  }
  if (aircraft === "helicopter") {
    return [{ centre: { x: craft.x, z: craft.z }, radius: 1.6 }];
  }
  if (aircraft === "balloon") {
    return [
      {
        centre: { x: craft.x, z: craft.z },
        radius: balloonBasketHalfWidth * Math.SQRT2 + 0.2,
      },
    ];
  }
  return Array.from({ length: aeroplaneBlockerCount }, (_, index) => {
    const along =
      ((index / (aeroplaneBlockerCount - 1)) * 2 - 1) *
      (aeroplaneLength / 2 - aeroplaneBlockerRadius);
    const { x, z } = placeOnCraft(craft, { x: 0, y: 0, z: along });
    return { centre: { x, z }, radius: aeroplaneBlockerRadius };
  });
};
