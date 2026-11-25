import { CatmullRomCurve3, Vector3 } from "three";
import { smoothStep, type MapPoint } from "../world-map-terrain.js";
import {
  exploreScale,
  findExploreAdventure,
  type IslandAdventure,
} from "./island-adventures.js";
import type { CraftPose } from "./island-aircraft-models.js";
import {
  aircraftPhaseSeconds,
  findDoorOpening,
  findAircraftArrivalHeading,
  findAircraftCameraSpot,
  findAircraftCarriedSpot,
  findAircraftPlacement,
  findAircraftWaitingSpot,
  findBurnerBlast,
  findDragonWingSpread,
  findRocketBurn,
  isWalkingToAircraft,
  listAircraftBlockers,
  type Aircraft,
  type BoardingSpot,
  type CraftPlacement,
  type LandPhase,
  type Spot3,
} from "./island-flight.js";
import {
  findSeaCraftArrivalHeading,
  findSeaCraftCameraSpot,
  findSeaCraftCarriedSpot,
  findSeaCraftPlacement,
  findSeaCraftWaitingSpot,
  findJetskiSpray,
  findSurfWaveSize,
  findSkirtLift,
  findSubPierSide,
  hovercraftCushion,
  isWalkingToSeaCraft,
  listSeaCraftBlockers,
  seaCraftPhaseSeconds,
  subDivingDepth,
  type SeaCraft,
} from "./island-sea-craft.js";
import {
  findPortalArrivalHeading,
  findPortalCameraSpot,
  findPortalCarriedSpot,
  findPortalOpening,
  findPortalPlacement,
  findPortalWaitingSpot,
  isWalkingThroughPortal,
  listPortalBlockers,
  portalPhaseSeconds,
} from "./island-portal.js";
import {
  findScubaArrivalHeading,
  findScubaCameraSpot,
  findScubaCarriedSpot,
  findScubaLockerPose,
  findScubaPlacement,
  findScubaWaitingSpot,
  isWalkingToScuba,
  listScubaBlockers,
  scubaPhaseSeconds,
} from "./island-scuba.js";
import {
  buildSeaRoute,
  buildVoyageRoute,
  findCarriedSpot,
  findCrossingPlacement,
  findCrossingSeconds,
  findDockCameraSpot,
  findLandwardHeading,
  findPierWaitingSpot,
  findShipPlacement,
  isWalkingTheGangway,
  listShipBlockers,
  voyagePhaseSeconds,
  type VoyagePhase,
  type VoyagePort,
} from "./island-voyage.js";

export const transports = [
  "ship",
  "aeroplane",
  "helicopter",
  "hovercraft",
  "submarine",
  "balloon",
  "pirateShip",
  "jetski",
  "rocket",
  "portal",
  "dragon",
  "blimp",
  "scuba",
  "surfboard",
  "windsurfer",
] as const;

export type Transport = (typeof transports)[number];

export interface JourneyArrival {
  transport: Transport;
  isSkipped: boolean;
}

export const chooseTransport = (
  random: () => number = Math.random,
): Transport =>
  transports[
    Math.min(transports.length - 1, Math.floor(random() * transports.length))
  ];

export type ShipTransport = "ship" | "pirateShip";

export const isShipLike = (transport: Transport): transport is ShipTransport =>
  transport === "ship" || transport === "pirateShip";

const isAircraft = (transport: Transport): transport is Aircraft =>
  transport === "aeroplane" ||
  transport === "helicopter" ||
  transport === "balloon" ||
  transport === "rocket" ||
  transport === "dragon" ||
  transport === "blimp";

const isSeaCraft = (transport: Transport): transport is SeaCraft =>
  transport === "hovercraft" ||
  transport === "submarine" ||
  transport === "jetski" ||
  transport === "surfboard" ||
  transport === "windsurfer";

const asCraftPlacement = (placement: {
  x: number;
  z: number;
  heading: number;
}): CraftPlacement => ({ ...placement, y: 0, pitch: 0, roll: 0 });

export const findLandPhaseSeconds = (
  transport: Transport,
  phase: LandPhase,
): number => {
  if (transport === "portal") {
    return portalPhaseSeconds[phase];
  }
  if (transport === "scuba") {
    return scubaPhaseSeconds[phase];
  }
  if (isAircraft(transport)) {
    return aircraftPhaseSeconds[transport][phase];
  }
  return isSeaCraft(transport)
    ? seaCraftPhaseSeconds[transport][phase]
    : voyagePhaseSeconds[phase];
};

export const findCraftPlacement = (
  adventure: IslandAdventure,
  transport: Transport,
  phase: LandPhase,
  share: number,
): CraftPlacement => {
  if (transport === "portal") {
    return findPortalPlacement(adventure, phase, share);
  }
  if (transport === "scuba") {
    return findScubaPlacement(adventure);
  }
  if (isAircraft(transport)) {
    return findAircraftPlacement(adventure, transport, phase, share);
  }
  return isSeaCraft(transport)
    ? findSeaCraftPlacement(adventure, transport, phase, share)
    : asCraftPlacement(findShipPlacement(adventure.dock, phase, share));
};

export const findJourneyCarriedSpot = (
  adventure: IslandAdventure,
  transport: Transport,
  phase: LandPhase,
  share: number,
): BoardingSpot => {
  if (transport === "portal") {
    return findPortalCarriedSpot(adventure, phase, share);
  }
  if (transport === "scuba") {
    return findScubaCarriedSpot(adventure, phase, share);
  }
  if (isAircraft(transport)) {
    return findAircraftCarriedSpot(adventure, transport, phase, share);
  }
  return isSeaCraft(transport)
    ? findSeaCraftCarriedSpot(adventure, transport, phase, share)
    : { ...findCarriedSpot(adventure, phase, share), isInside: false };
};

export const findJourneyWaitingSpot = (
  adventure: IslandAdventure,
  transport: Transport,
): MapPoint => {
  if (transport === "portal") {
    return findPortalWaitingSpot(adventure);
  }
  if (transport === "scuba") {
    return findScubaWaitingSpot(adventure);
  }
  if (isAircraft(transport)) {
    return findAircraftWaitingSpot(adventure, transport);
  }
  return isSeaCraft(transport)
    ? findSeaCraftWaitingSpot(adventure, transport)
    : findPierWaitingSpot(adventure.dock);
};

export const findJourneyArrivalHeading = (
  adventure: IslandAdventure,
  transport: Transport,
): number => {
  if (transport === "portal") {
    return findPortalArrivalHeading(adventure);
  }
  if (transport === "scuba") {
    return findScubaArrivalHeading(adventure);
  }
  if (isAircraft(transport)) {
    return findAircraftArrivalHeading(adventure, transport);
  }
  return isSeaCraft(transport)
    ? findSeaCraftArrivalHeading(adventure, transport)
    : findLandwardHeading(adventure.dock);
};

export const findJourneyCameraSpot = (
  adventure: IslandAdventure,
  transport: Transport,
): Spot3 => {
  if (transport === "portal") {
    return findPortalCameraSpot(adventure);
  }
  if (transport === "scuba") {
    return findScubaCameraSpot(adventure);
  }
  if (isAircraft(transport)) {
    return findAircraftCameraSpot(adventure, transport);
  }
  return isSeaCraft(transport)
    ? findSeaCraftCameraSpot(adventure, transport)
    : findDockCameraSpot(adventure);
};

// Where the camera's angle onto the Character is measured from when they're
// first carried. A craft arriving from the sky starts docking high above its
// landing place, so measuring from there would set the camera below the
// Character and leave it underground once they land: arriving, the angle is
// measured from where the craft comes down instead.
export const findJourneyCameraAnchor = (
  adventure: IslandAdventure,
  transport: Transport,
  phase: LandPhase,
  share: number,
): BoardingSpot =>
  findJourneyCarriedSpot(
    adventure,
    transport,
    phase,
    phase === "docking" ? 1 : share,
  );

export const isWalkingAboard = (
  transport: Transport,
  phase: VoyagePhase,
  share: number,
): boolean => {
  if (transport === "portal") {
    return isWalkingThroughPortal(phase, share);
  }
  if (transport === "scuba") {
    return isWalkingToScuba(phase, share);
  }
  if (isAircraft(transport)) {
    return isWalkingToAircraft(phase, share);
  }
  return isSeaCraft(transport)
    ? isWalkingToSeaCraft(phase, share)
    : isWalkingTheGangway(phase, share);
};

export const listCraftBlockers = (
  adventure: IslandAdventure,
  transport: Transport,
  craft: CraftPlacement,
): { centre: MapPoint; radius: number }[] => {
  if (transport === "portal") {
    return listPortalBlockers(adventure, craft);
  }
  if (transport === "scuba") {
    return listScubaBlockers(craft);
  }
  if (isAircraft(transport)) {
    return listAircraftBlockers(adventure, transport, craft);
  }
  return isSeaCraft(transport)
    ? listSeaCraftBlockers(adventure, transport, craft)
    : listShipBlockers(craft);
};

export const placeCraftOnMap = (
  { islandId, seaPosition }: VoyagePort,
  transport: Transport,
  phase: LandPhase,
  share: number,
): CraftPlacement => {
  const placement = findCraftPlacement(
    findExploreAdventure(islandId),
    transport,
    phase,
    share,
  );
  return {
    ...placement,
    x: seaPosition.x + placement.x / exploreScale,
    y: placement.y / exploreScale,
    z: seaPosition.z + placement.z / exploreScale,
  };
};

const periscopeDepth = 3.3;

const seaCruiseHeights: Record<SeaCraft, number> = {
  hovercraft: hovercraftCushion / exploreScale,
  submarine: -Math.min(subDivingDepth, periscopeDepth) / exploreScale,
  jetski: 0,
  surfboard: 0,
  windsurfer: 0,
};

const scubaCruiseDepth = -0.04;

const flightLead = 22;
const cruiseHeight = 15;

const leadAhead = (
  { x, z, heading }: CraftPlacement,
  distance: number,
): Spot3 => ({
  x: x + Math.sin(heading) * distance,
  y: cruiseHeight,
  z: z + Math.cos(heading) * distance,
});

const rocketArcHeight = 34;
const wispArcHeight = 22;
const arcClimb = 7;

const buildArcRoute = (
  leaving: Spot3,
  arriving: Spot3,
  height: number,
): Spot3[] => [
  { x: leaving.x, y: leaving.y, z: leaving.z },
  { x: leaving.x, y: leaving.y + arcClimb, z: leaving.z },
  {
    x: (leaving.x + arriving.x) / 2,
    y: Math.max(leaving.y, arriving.y) + height,
    z: (leaving.z + arriving.z) / 2,
  },
  { x: arriving.x, y: arriving.y + arcClimb, z: arriving.z },
  { x: arriving.x, y: arriving.y, z: arriving.z },
];

export const buildJourneyRoute = (
  from: VoyagePort,
  to: VoyagePort,
  transport: Transport,
): Spot3[] => {
  if (isSeaCraft(transport)) {
    const leaving = placeCraftOnMap(from, transport, "departing", 1);
    const arriving = placeCraftOnMap(to, transport, "docking", 0);
    const cruising = seaCruiseHeights[transport];
    return buildSeaRoute(leaving, arriving).map(({ x, z }, index, route) => ({
      x,
      y:
        index === 0
          ? leaving.y
          : index === route.length - 1
            ? arriving.y
            : cruising,
      z,
    }));
  }
  if (isShipLike(transport)) {
    return buildVoyageRoute(from, to).map(({ x, z }) => ({ x, y: 0, z }));
  }
  if (transport === "scuba") {
    const leaving = placeCraftOnMap(from, transport, "departing", 1);
    const arriving = placeCraftOnMap(to, transport, "docking", 0);
    return buildSeaRoute(leaving, arriving).map(({ x, z }) => ({
      x,
      y: scubaCruiseDepth,
      z,
    }));
  }
  if (transport === "portal" || transport === "rocket") {
    return buildArcRoute(
      placeCraftOnMap(from, transport, "departing", 1),
      placeCraftOnMap(to, transport, "docking", 0),
      transport === "rocket" ? rocketArcHeight : wispArcHeight,
    );
  }
  const leaving = placeCraftOnMap(from, transport, "departing", 1);
  const arriving = placeCraftOnMap(to, transport, "docking", 0);
  const drifting = transport === "balloon" ? -1 : 1;
  return [
    leaving,
    leadAhead(leaving, flightLead * drifting),
    leadAhead(arriving, -flightLead),
    arriving,
  ].map(({ x, y, z }) => ({ x, y, z }));
};

export const buildJourneyCourse = (route: readonly Spot3[]) =>
  new CatmullRomCurve3(
    route.map(({ x, y, z }) => new Vector3(x, y, z)),
    false,
    "centripetal",
  );

const flyingSpeeds: Record<Aircraft | "portal", number> = {
  aeroplane: 42,
  helicopter: 30,
  balloon: 22,
  rocket: 48,
  portal: 40,
  dragon: 34,
  blimp: 20,
};
const shortestFlightSeconds = 4;
const longestFlightSeconds = 9;

export const findJourneyCrossingSeconds = (
  transport: Transport,
  route: readonly Spot3[],
): number =>
  isAircraft(transport) || transport === "portal"
    ? Math.min(
        longestFlightSeconds,
        Math.max(
          shortestFlightSeconds,
          buildJourneyCourse(route).getLength() / flyingSpeeds[transport],
        ),
      )
    : findCrossingSeconds(route);

export const findJourneyPhaseSeconds = (
  transport: Transport,
  phase: VoyagePhase,
  route: readonly Spot3[],
): number =>
  phase === "crossing"
    ? findJourneyCrossingSeconds(transport, route)
    : findLandPhaseSeconds(transport, phase);

const turnLookAhead = 0.004;
const bankPerTurn: Record<Aircraft, number> = {
  aeroplane: 9,
  helicopter: 6,
  balloon: 0,
  rocket: 0,
  dragon: 8,
  blimp: 0,
};
const steepestBank = 0.55;
const helicopterNoseDown = 0.12;

const findCourseHeading = (course: CatmullRomCurve3, share: number) => {
  const tangent = course.getTangentAt(Math.min(1, Math.max(0, share)));
  return Math.atan2(tangent.x, tangent.z);
};

const findTurn = (course: CatmullRomCurve3, share: number): number => {
  const before = findCourseHeading(course, share - turnLookAhead);
  const after = findCourseHeading(course, share + turnLookAhead);
  return Math.atan2(Math.sin(after - before), Math.cos(after - before));
};

const flipFrom = 0.4;
const flipTo = 0.6;

// The rocket flies nose first while it climbs, flips over the top of its arc
// and comes down engine first, ready to land upright.
const findRocketCrossing = (
  course: CatmullRomCurve3,
  share: number,
): CraftPlacement => {
  const point = course.getPointAt(share);
  const tangent = course.getTangentAt(share);
  const climb = Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z));
  const noseFirst = Math.PI / 2 - climb;
  const engineFirst = -(Math.PI / 2 + climb);
  const flip = smoothStep(flipFrom, flipTo, share);
  const heading = Math.atan2(
    course.getPointAt(1).x - course.getPointAt(0).x,
    course.getPointAt(1).z - course.getPointAt(0).z,
  );
  return {
    x: point.x,
    y: point.y,
    z: point.z,
    heading,
    pitch: -(noseFirst * (1 - flip) + engineFirst * flip),
    roll: 0,
  };
};

const jetskiCrossingPitch = 0.1;
const surfCrossingPitch = -0.11;
const windsurfCrossingHeel = 0.12;

export const findCrossingCraftPlacement = (
  transport: Transport,
  course: CatmullRomCurve3,
  share: number,
): CraftPlacement => {
  if (isSeaCraft(transport)) {
    const eased = smoothStep(0, 1, share);
    const point = course.getPointAt(eased);
    const tangent = course.getTangentAt(eased);
    const heading = Math.atan2(tangent.x, tangent.z);
    const turn = findTurn(course, eased);
    if (transport === "surfboard") {
      return {
        x: point.x,
        y: point.y,
        z: point.z,
        heading,
        pitch: surfCrossingPitch + 0.02 * Math.sin(share * Math.PI * 9),
        roll: -turn * 3 + 0.08 * Math.sin(share * Math.PI * 6),
      };
    }
    if (transport === "windsurfer") {
      return {
        x: point.x,
        y: point.y,
        z: point.z,
        heading,
        pitch: 0.03 + 0.015 * Math.sin(share * Math.PI * 17),
        roll: windsurfCrossingHeel - turn * 2,
      };
    }
    const isJetski = transport === "jetski";
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      heading,
      pitch: isJetski
        ? jetskiCrossingPitch + 0.03 * Math.sin(share * Math.PI * 23)
        : Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z)),
      roll: isJetski ? -turn * 4 : 0,
    };
  }
  if (isShipLike(transport)) {
    return asCraftPlacement(findCrossingPlacement(course, share));
  }
  if (transport === "rocket") {
    return findRocketCrossing(course, share);
  }
  const point = course.getPointAt(share);
  const tangent = course.getTangentAt(share);
  if (transport === "portal" || transport === "scuba") {
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      heading: Math.atan2(tangent.x, tangent.z),
      pitch: 0,
      roll: 0,
    };
  }
  if (transport === "blimp") {
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      heading: Math.atan2(tangent.x, tangent.z),
      pitch:
        Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z)) * 0.35 +
        0.012 * Math.sin(share * Math.PI * 5),
      roll: 0.01 * Math.sin(share * Math.PI * 4 + 1),
    };
  }
  if (transport === "balloon") {
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      heading: Math.atan2(tangent.x, tangent.z),
      pitch: 0.02 * Math.sin(share * Math.PI * 7),
      roll: 0.02 * Math.sin(share * Math.PI * 5 + 1),
    };
  }
  const climb = Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z));
  const bank = Math.max(
    -steepestBank,
    Math.min(steepestBank, -findTurn(course, share) * bankPerTurn[transport]),
  );
  return {
    x: point.x,
    y: point.y,
    z: point.z,
    heading: Math.atan2(tangent.x, tangent.z),
    pitch:
      transport === "helicopter" ? climb * 0.5 - helicopterNoseDown : climb,
    roll: bank,
  };
};

export type CraftTransport = Exclude<Transport, ShipTransport>;

const findCraftGlow = (
  transport: CraftTransport,
  phase: VoyagePhase,
  share: number,
): number => {
  if (transport === "balloon") {
    return findBurnerBlast(phase, share);
  }
  if (transport === "rocket") {
    return findRocketBurn(phase, share);
  }
  if (transport === "jetski") {
    return findJetskiSpray(phase, share);
  }
  if (transport === "dragon") {
    return findDragonWingSpread(phase, share);
  }
  if (transport === "surfboard") {
    return findSurfWaveSize(phase, share);
  }
  if (transport === "scuba") {
    return findScubaLockerPose(phase, share).size;
  }
  return 0;
};

export const findCraftPose = (
  adventure: IslandAdventure,
  transport: CraftTransport,
  phase: VoyagePhase,
  share: number,
  placement: CraftPlacement,
): CraftPose => {
  if (transport === "scuba") {
    const locker = findScubaLockerPose(phase, share);
    return {
      placement,
      opening: locker.opening,
      lift: locker.gearOnRack,
      burn: locker.size,
    };
  }
  return {
    placement,
    opening:
      transport === "portal"
        ? findPortalOpening(phase, share)
        : findDoorOpening(phase, share),
    lift: findSkirtLift(phase, share),
    side: findSubPierSide(adventure.dock),
    burn: findCraftGlow(transport, phase, share),
  };
};
