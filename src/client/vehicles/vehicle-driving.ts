import type { MapPoint } from "../world-map-terrain.js";
import {
  findWalkSurface,
  isInsideExploreBounds,
  type AdventureWorld,
  type SurfaceKind,
} from "../islands/island-adventures.js";
import {
  obstacleBodyRadius,
  type Obstacles,
} from "../islands/island-obstacles.js";
import type { Blocker } from "../islands/island-walker.js";
import type { VehicleDesign } from "./vehicle-designs.js";

export interface DrivenVehicle {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  speed: number;
  isBumped: boolean;
}

export interface DrivingInput {
  right: number;
  forward: number;
}

const drivableKinds: readonly SurfaceKind[] = [
  "ground",
  "trail",
  "bridge",
  "shallows",
  "ice",
];
const reverseShare = 0.4;
const brakingShare = 2.2;
const coastingSlowdown = 3;
const steeringSpeed = 3;
const steepestStep = 1.4;
const heightFollowRate = 14;
const offRoadShare = 0.75;
const placingReach = 2.6;
const placingSearchSteps = 12;

export const isDrivableKind = (kind: SurfaceKind): boolean =>
  drivableKinds.includes(kind);

const isBlocked = (point: MapPoint, blockers: readonly Blocker[]): boolean =>
  blockers.some(
    ({ centre, radius }) =>
      Math.hypot(point.x - centre.x, point.z - centre.z) < radius,
  );

/**
 * Whether a Vehicle at a point would be in anything solid: its middle,
 * its nose and its tail are each checked across its width (ADR 0061).
 */
const isInObstacle = (
  obstacles: Obstacles | undefined,
  point: MapPoint,
  y: number,
  heading: number,
  design: VehicleDesign,
): boolean => {
  if (obstacles === undefined) {
    return false;
  }
  const radius = design.width / 2;
  const reach = Math.max(0, design.length / 2 - radius);
  return [-1, 0, 1].some((end) =>
    obstacles.isBlocked(
      {
        x: point.x + Math.sin(heading) * reach * end,
        z: point.z + Math.cos(heading) * reach * end,
      },
      y,
      radius,
    ),
  );
};

const approach = (from: number, to: number, step: number): number =>
  from < to ? Math.min(to, from + step) : Math.max(to, from - step);

const findPitch = (
  world: AdventureWorld,
  point: MapPoint & { y: number },
  heading: number,
  design: VehicleDesign,
): number => {
  const reach = design.length / 2;
  const front = findWalkSurface(
    world,
    {
      x: point.x + Math.sin(heading) * reach,
      z: point.z + Math.cos(heading) * reach,
    },
    point.y + steepestStep,
  );
  const back = findWalkSurface(
    world,
    {
      x: point.x - Math.sin(heading) * reach,
      z: point.z - Math.cos(heading) * reach,
    },
    point.y + steepestStep,
  );
  return -Math.atan2(
    Math.max(0, front.height) - Math.max(0, back.height),
    reach * 2,
  );
};

export const stepVehicle = (
  vehicle: DrivenVehicle,
  input: DrivingInput,
  deltaSeconds: number,
  world: AdventureWorld,
  design: VehicleDesign,
  blockers: readonly Blocker[] = [],
  obstacles?: Obstacles,
): DrivenVehicle => {
  const seconds = Math.min(deltaSeconds, 0.1);
  const here = findWalkSurface(world, vehicle, vehicle.y + steepestStep);
  const surfaceShare =
    here.kind === "trail" || here.kind === "bridge" ? 1 : offRoadShare;
  const wanted =
    input.forward >= 0
      ? input.forward * design.topSpeed * surfaceShare
      : input.forward * design.topSpeed * reverseShare;
  const isBraking =
    (vehicle.speed > 0 && wanted < vehicle.speed - 0.01 && input.forward < 0) ||
    (vehicle.speed < 0 && wanted > vehicle.speed + 0.01 && input.forward > 0);
  const rate =
    input.forward === 0
      ? coastingSlowdown
      : design.acceleration * (isBraking ? brakingShare : 1);
  const speed = approach(vehicle.speed, wanted, rate * seconds);
  const grip = Math.min(1, Math.abs(speed) / steeringSpeed);
  const heading =
    vehicle.heading -
    input.right * design.turnRate * grip * Math.sign(speed || 1) * seconds;
  const moved = {
    x: vehicle.x + Math.sin(heading) * speed * seconds,
    z: vehicle.z + Math.cos(heading) * speed * seconds,
  };
  const there = findWalkSurface(world, moved, vehicle.y + steepestStep);
  const isStopped =
    !isInsideExploreBounds(moved) ||
    !isDrivableKind(there.kind) ||
    there.height - vehicle.y > steepestStep ||
    isBlocked(moved, blockers) ||
    (isInObstacle(obstacles, moved, vehicle.y, heading, design) &&
      !isInObstacle(obstacles, vehicle, vehicle.y, vehicle.heading, design));
  const point = isStopped ? vehicle : moved;
  const surface = isStopped ? here : there;
  const height = Math.max(0, surface.height);
  const y =
    vehicle.y +
    (height - vehicle.y) * (1 - Math.exp(-heightFollowRate * seconds));
  return {
    x: point.x,
    z: point.z,
    y,
    heading,
    pitch: findPitch(world, { ...point, y }, heading, design),
    speed: isStopped ? 0 : speed,
    isBumped: isStopped && Math.abs(speed) > 0.5,
  };
};

export const placeVehicleNear = (
  world: AdventureWorld,
  from: MapPoint & { heading: number },
  design: VehicleDesign,
  blockers: readonly Blocker[] = [],
  obstacles?: Obstacles,
): DrivenVehicle => {
  const reach = placingReach + design.length / 2;
  const spot = Array.from({ length: placingSearchSteps }, (_, step) => {
    const angle =
      from.heading +
      (Math.ceil(step / 2) * (step % 2 === 0 ? 1 : -1) * Math.PI) / 6;
    return {
      x: from.x + Math.sin(angle) * reach,
      z: from.z + Math.cos(angle) * reach,
    };
  }).find(
    (point) =>
      isInsideExploreBounds(point) &&
      isDrivableKind(findWalkSurface(world, point, Infinity).kind) &&
      !isBlocked(point, blockers) &&
      !isInObstacle(
        obstacles,
        point,
        findWalkSurface(world, point, Infinity).height,
        from.heading,
        design,
      ),
  ) ?? { x: from.x, z: from.z };
  const surface = findWalkSurface(world, spot, Infinity);
  const y = Math.max(0, surface.height);
  return {
    ...spot,
    y,
    heading: from.heading,
    pitch: findPitch(world, { ...spot, y }, from.heading, design),
    speed: 0,
    isBumped: false,
  };
};

export const findStepOutSpot = (
  world: AdventureWorld,
  vehicle: DrivenVehicle,
  design: VehicleDesign,
  obstacles?: Obstacles,
): MapPoint => {
  const reach = design.width / 2 + 0.6;
  const candidates = [1, -1].flatMap((side) => [
    {
      x: vehicle.x - Math.cos(vehicle.heading) * reach * side,
      z: vehicle.z + Math.sin(vehicle.heading) * reach * side,
    },
  ]);
  return (
    candidates.find(
      (point) =>
        isDrivableKind(findWalkSurface(world, point, Infinity).kind) &&
        obstacles?.isBlocked(point, vehicle.y, obstacleBodyRadius) !== true,
    ) ??
    candidates.find((point) =>
      isDrivableKind(findWalkSurface(world, point, Infinity).kind),
    ) ??
    candidates[0]
  );
};
