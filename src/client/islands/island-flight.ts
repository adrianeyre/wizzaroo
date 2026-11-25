import { Euler, Matrix4, Vector3 } from "three";
import {
  runwayHalfLength,
  smoothStep,
  type MapPoint,
} from "../world-map-terrain.js";
import { seatedHipDrop, type Stance } from "../character/character-stance.js";
import { exploreScale, type IslandAdventure } from "./island-adventures.js";
import type { CarriedSpot, VoyagePhase } from "./island-voyage.js";

export type Aircraft =
  "aeroplane" | "helicopter" | "balloon" | "rocket" | "dragon" | "blimp";

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
  /** How the Character holds themselves; standing when not given. */
  stance?: Stance;
  /** What the Character has put on for the ride, such as scuba gear. */
  gear?: "scuba";
  /** The craft's tilt, which a Character riding in view tilts with. */
  pitch?: number;
  roll?: number;
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

export const rocketBodyRadius = 1.25;
export const rocketHatch: Spot3 = { x: rocketBodyRadius, y: 2.3, z: 0 };
export const rocketStairRun = 2.9;
export const rocketLegReach = 3.4;

// The dragon stands on the Balloon Field, its body's local frame with +z
// forward (towards its head), +y up and its origin on the ground under the
// middle of its body. To let the Character climb on, it lies down: its body
// drops and tips its nose down about its hips (`placeDragonBody`), its legs
// fold and its neck bows its head to the grass.
export const dragonSaddle: Spot3 = { x: 0, y: 2.08, z: 0.85 };
export const dragonShoulder: Spot3 = { x: 0, y: 1.7, z: 1.5 };
export const dragonHip: Spot3 = { x: 0, y: 1.55, z: -1.7 };
export const dragonBellyHeight = 1.05;
export const dragonBowDrop = 0.92;
export const dragonBowPitch = 0.1;
export const dragonLength = 10.5;
export const dragonWingspan = 13;
export const dragonHalfWidth = 0.78;

export const placeDragonBody = (bow: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(0, -dragonBowDrop * bow, 0)
    .multiply(new Matrix4().makeTranslation(0, dragonHip.y, dragonHip.z))
    .multiply(new Matrix4().makeRotationX(dragonBowPitch * bow))
    .multiply(new Matrix4().makeTranslation(0, -dragonHip.y, -dragonHip.z));

export const placeOnDragonBody = (bow: number, local: Spot3): Spot3 => {
  const { x, y, z } = new Vector3(local.x, local.y, local.z).applyMatrix4(
    placeDragonBody(bow),
  );
  return { x, y, z };
};

// The blimp moors on the Runway, nose along it. Its gondola hangs under the
// envelope with a door on its +x side, reached by a short step.
export const blimpLength = 26;
export const blimpRadius = 3.7;
export const blimpEnvelopeCentre = 6.55;
export const blimpGondolaLength = 6;
export const blimpGondolaHalfWidth = 1.05;
export const blimpGondolaFloor = 0.5;
export const blimpGondolaTop = 2.55;
export const blimpDoor: Spot3 = {
  x: blimpGondolaHalfWidth,
  y: blimpGondolaFloor,
  z: 0.6,
};
export const blimpStepRun = 1;

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
  rocket: {
    calling: 11,
    boarding: 5,
    departing: 10,
    docking: 11,
    landing: 5,
    leaving: 10,
  },
  dragon: {
    calling: 11,
    boarding: 6,
    departing: 9,
    docking: 11,
    landing: 6,
    leaving: 9,
  },
  blimp: {
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
    rocket: findHelipadFrame,
    dragon: findBalloonFieldFrame,
    blimp: findRunwayFrame,
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

export const rocketCruiseHeight = 90;
const rocketSettlingShare = 0.9;
const rocketDrift = 36;
const rocketLiftOffShare = 0.3;
const rocketTilt = 0.1;

const findRocketLanding = (frame: Frame, share: number): CraftPlacement => {
  const left = 1 - Math.min(1, share / rocketSettlingShare);
  const spot = placeInFrame(frame, {
    x: 0,
    y: rocketCruiseHeight * left ** 2,
    z: -rocketDrift * left ** 3,
  });
  return {
    ...spot,
    heading: frame.heading,
    pitch: rocketTilt * left ** 2,
    roll: 0,
  };
};

const findRocketTakeOff = (frame: Frame, share: number): CraftPlacement => {
  const risen = Math.max(
    0,
    (share - rocketLiftOffShare) / (1 - rocketLiftOffShare),
  );
  const spot = placeInFrame(frame, {
    x: 0,
    y: rocketCruiseHeight * risen ** 2,
    z: rocketDrift * risen ** 3,
  });
  return {
    ...spot,
    heading: frame.heading,
    pitch: -rocketTilt * risen ** 2,
    roll: 0,
  };
};

const rocketBurns: Partial<Record<VoyagePhase, [number, number][]>> = {
  calling: [[0, 0.93]],
  docking: [[0, 0.93]],
  departing: [[0.2, 1.1]],
  leaving: [[0.2, 1.1]],
  crossing: [
    [-0.1, 0.38],
    [0.78, 1.1],
  ],
};

export const findRocketBurn = (phase: VoyagePhase, share: number): number =>
  Math.max(
    0,
    ...(rocketBurns[phase] ?? []).map(
      ([from, to]) =>
        smoothStep(from - 0.03, from, share) *
        (1 - smoothStep(to, to + 0.03, share)),
    ),
  );

const dragonApproachReach = 150;
export const dragonCruiseHeight = 38;
const dragonFlareShare = 0.62;
const dragonTouchdownShare = 0.86;
const dragonFlarePitch = 0.38;
const dragonGlidePitch = -0.08;
const dragonFlareHeight = 14;
const dragonFlareReach = 9;

const findDragonLanding = (frame: Frame, share: number): CraftPlacement => {
  if (share < dragonFlareShare) {
    const flown = share / dragonFlareShare;
    const eased = 1 - (1 - flown) ** 1.6;
    const spot = placeInFrame(frame, {
      x: 6 * Math.sin(flown * Math.PI) * (1 - flown),
      y:
        dragonFlareHeight +
        (dragonCruiseHeight - dragonFlareHeight) * (1 - eased),
      z: -dragonApproachReach * (1 - eased) - dragonFlareReach,
    });
    return {
      ...spot,
      heading: frame.heading,
      pitch: dragonGlidePitch * (1 - flown),
      roll: -0.25 * Math.sin(flown * Math.PI) * (1 - flown),
    };
  }
  const settling = Math.min(
    1,
    (share - dragonFlareShare) / (dragonTouchdownShare - dragonFlareShare),
  );
  const eased = smoothStep(0, 1, settling);
  const spot = placeInFrame(frame, {
    x: 0,
    y: dragonFlareHeight * (1 - eased) ** 1.4,
    z: -dragonFlareReach * (1 - eased),
  });
  return {
    ...spot,
    heading: frame.heading,
    pitch:
      dragonFlarePitch *
      Math.sin(Math.PI * Math.min(1, settling * 1.15)) *
      (1 - smoothStep(0.85, 1, settling)),
    roll: 0,
  };
};

const dragonStandShare = 0.14;
const dragonLeapShare = 0.32;
const dragonDepartureReach = 150;

const findDragonTakeOff = (frame: Frame, share: number): CraftPlacement => {
  if (share < dragonLeapShare) {
    const crouch = smoothStep(dragonStandShare, dragonLeapShare, share);
    const spot = placeInFrame(frame, { x: 0, y: 0, z: 0 });
    return {
      ...spot,
      heading: frame.heading,
      pitch: 0.12 * Math.sin(Math.PI * crouch),
      roll: 0,
    };
  }
  const flown = (share - dragonLeapShare) / (1 - dragonLeapShare);
  const spot = placeInFrame(frame, {
    x: 0,
    y:
      dragonCruiseHeight * (1 - (1 - flown) ** 1.5) +
      4 * Math.sin(flown * Math.PI),
    z: dragonDepartureReach * flown ** 1.8,
  });
  return {
    ...spot,
    heading: frame.heading,
    pitch: (0.42 * (1 - flown) ** 2 + 0.06) * smoothStep(0, 0.12, flown),
    roll: 0,
  };
};

/** How far the dragon's wings are spread: folded on the ground, open in flight. */
export const findDragonWingSpread = (
  phase: VoyagePhase,
  share: number,
): number => {
  if (phase === "crossing") {
    return 1;
  }
  if (phase === "calling" || phase === "docking") {
    return 1 - smoothStep(dragonTouchdownShare, 0.97, share);
  }
  if (phase === "departing" || phase === "leaving") {
    return smoothStep(dragonStandShare, dragonLeapShare - 0.04, share);
  }
  return 0;
};

const blimpApproachReach = 170;
export const blimpCruiseHeight = 32;
const blimpSettlingShare = 0.9;
const blimpDepartureReach = 160;
const blimpLiftShare = 0.45;
const blimpLiftHeight = 7;
const blimpSway = 0.018;

const findBlimpLanding = (frame: Frame, share: number): CraftPlacement => {
  const left = 1 - Math.min(1, share / blimpSettlingShare);
  const spot = placeInFrame(frame, {
    x: 0,
    y: blimpCruiseHeight * left ** 1.25,
    z: -blimpApproachReach * left ** 1.6,
  });
  return {
    ...spot,
    heading: frame.heading,
    pitch: -0.05 * left + blimpSway * Math.sin(share * Math.PI * 4) * left,
    roll: blimpSway * Math.sin(share * Math.PI * 3 + 1) * left,
  };
};

const findBlimpTakeOff = (frame: Frame, share: number): CraftPlacement => {
  if (share < blimpLiftShare) {
    const lifted = smoothStep(doorClosingShare, blimpLiftShare, share);
    const spot = placeInFrame(frame, {
      x: 0,
      y: blimpLiftHeight * lifted ** 1.5,
      z: 0,
    });
    return { ...spot, heading: frame.heading, pitch: 0, roll: 0 };
  }
  const flown = (share - blimpLiftShare) / (1 - blimpLiftShare);
  const spot = placeInFrame(frame, {
    x: 0,
    y: blimpLiftHeight + (blimpCruiseHeight - blimpLiftHeight) * flown ** 1.2,
    z: blimpDepartureReach * flown ** 1.8,
  });
  return {
    ...spot,
    heading: frame.heading,
    pitch: 0.08 * Math.sin(Math.PI * Math.min(1, flown * 1.6)),
    roll: 0,
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
  if (aircraft === "dragon") {
    if (isArriving(phase)) {
      return findDragonLanding(frame, share);
    }
    if (isGoing(phase)) {
      return findDragonTakeOff(frame, share);
    }
    return {
      ...placeInFrame(frame, { x: 0, y: 0, z: 0 }),
      heading: frame.heading,
      pitch: 0,
      roll: 0,
    };
  }
  if (aircraft === "blimp") {
    if (isArriving(phase)) {
      return findBlimpLanding(frame, share);
    }
    if (isGoing(phase)) {
      return findBlimpTakeOff(frame, share);
    }
    return {
      ...placeInFrame(frame, { x: 0, y: 0, z: 0 }),
      heading: frame.heading,
      pitch: 0,
      roll: 0,
    };
  }
  if (aircraft === "rocket") {
    if (isArriving(phase)) {
      return findRocketLanding(frame, share);
    }
    if (isGoing(phase)) {
      return findRocketTakeOff(frame, share);
    }
    return {
      ...placeInFrame(frame, { x: 0, y: 0, z: 0 }),
      heading: frame.heading,
      pitch: 0,
      roll: 0,
    };
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

const rocketBoardingWay: BoardingWay = {
  waiting: { x: rocketHatch.x + rocketStairRun + 2.4, y: 0, z: rocketHatch.z },
  path: [
    { x: rocketHatch.x + rocketStairRun + 2.4, y: 0, z: rocketHatch.z },
    { x: rocketHatch.x + rocketStairRun + 0.3, y: 0, z: rocketHatch.z },
    { x: rocketHatch.x + 0.1, y: rocketHatch.y, z: rocketHatch.z },
    { x: rocketHatch.x - 0.55, y: rocketHatch.y, z: rocketHatch.z },
  ],
};

const blimpBoardingWay: BoardingWay = {
  waiting: { x: blimpDoor.x + blimpStepRun + 2.4, y: 0, z: blimpDoor.z },
  path: [
    { x: blimpDoor.x + blimpStepRun + 2.4, y: 0, z: blimpDoor.z },
    { x: blimpDoor.x + blimpStepRun + 0.15, y: 0, z: blimpDoor.z },
    { x: blimpDoor.x + 0.05, y: blimpDoor.y, z: blimpDoor.z },
    { x: blimpDoor.x - 0.55, y: blimpDoor.y, z: blimpDoor.z },
  ],
};

const bowedSaddle = placeOnDragonBody(1, dragonSaddle);

// The Character walks up to the dragon's side while it lies down, steps up
// onto its folded foreleg and climbs onto the saddle, where they sit.
const dragonBoardingWay: BoardingWay = {
  waiting: { x: 3.6, y: 0, z: bowedSaddle.z },
  path: [
    { x: 3.6, y: 0, z: bowedSaddle.z },
    { x: 1.55, y: 0, z: bowedSaddle.z + 0.15 },
    { x: 1.05, y: 0.42, z: bowedSaddle.z + 0.2 },
    { x: 0.55, y: bowedSaddle.y - 0.05, z: bowedSaddle.z + 0.1 },
    { x: 0, y: bowedSaddle.y, z: bowedSaddle.z },
  ],
  isRidingInView: true,
};

const boardingWays: Record<Aircraft, BoardingWay> = {
  aeroplane: aeroplaneBoardingWay,
  helicopter: helicopterBoardingWay,
  balloon: balloonBoardingWay,
  rocket: rocketBoardingWay,
  dragon: dragonBoardingWay,
  blimp: blimpBoardingWay,
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

const tilt = new Euler();
const along = new Vector3();

/** A point on a craft, carried round with its heading, pitch and roll. */
export const placeOnTiltedCraft = (
  craft: CraftPlacement,
  local: Spot3,
): Spot3 => {
  tilt.set(-craft.pitch, craft.heading, craft.roll, "YXZ");
  along.set(local.x, local.y, local.z).applyEuler(tilt);
  return { x: craft.x + along.x, y: craft.y + along.y, z: craft.z + along.z };
};

/** Where a seated Character's feet start on the dragon, as it bows by `bow`. */
export const findDragonSeat = (bow: number): Spot3 => {
  const saddle = placeOnDragonBody(bow, dragonSaddle);
  return { ...saddle, y: saddle.y - seatedHipDrop };
};

const sitOnDragon = (craft: CraftPlacement, bow: number): BoardingSpot => ({
  ...placeOnTiltedCraft(craft, findDragonSeat(bow)),
  heading: craft.heading,
  isInside: false,
  stance: "sitting",
  pitch: craft.pitch,
  roll: craft.roll,
});

const findDragonCarriedSpot = (
  adventure: IslandAdventure,
  phase: LandPhase,
  share: number,
): BoardingSpot | undefined => {
  const craft = findAircraftPlacement(adventure, "dragon", phase, share);
  const bow = findDoorOpening(phase, share);
  if (phase === "boarding" && share >= boardedShare) {
    return sitOnDragon(craft, bow);
  }
  if (phase === "landing" && share < doorOpeningShare) {
    return sitOnDragon(craft, bow);
  }
  if (phase === "departing" || phase === "docking") {
    return sitOnDragon(craft, bow);
  }
  return undefined;
};

export const findAircraftCarriedSpot = (
  adventure: IslandAdventure,
  aircraft: Aircraft,
  phase: LandPhase,
  share: number,
): BoardingSpot => {
  const riding =
    aircraft === "dragon"
      ? findDragonCarriedSpot(adventure, phase, share)
      : undefined;
  if (riding !== undefined) {
    return riding;
  }
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
  rocket: { x: 9, y: 6, z: 16 },
  dragon: { x: 7, y: 5, z: 11 },
  blimp: { x: 12, y: 8, z: 20 },
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
  if (aircraft === "rocket") {
    return [
      { centre: { x: craft.x, z: craft.z }, radius: rocketBodyRadius + 0.9 },
    ];
  }
  if (aircraft === "dragon") {
    return [-2.6, -0.4, 1.8].map((along) => {
      const { x, z } = placeOnCraft(craft, { x: 0, y: 0, z: along });
      return { centre: { x, z }, radius: dragonHalfWidth + 0.15 };
    });
  }
  if (aircraft === "blimp") {
    return [-1.6, 1.6].map((along) => {
      const { x, z } = placeOnCraft(craft, { x: 0, y: 0, z: along });
      return { centre: { x, z }, radius: blimpGondolaHalfWidth + 0.35 };
    });
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
