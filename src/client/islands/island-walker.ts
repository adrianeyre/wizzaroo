import type { MapPoint } from "../world-map-terrain.js";
import {
  findWalkSurface,
  keepInsideExploreBounds,
  swimSink,
  type AdventureWorld,
  type SurfaceKind,
} from "./island-adventures.js";
import { moveAmongObstacles, type Obstacles } from "./island-obstacles.js";

export interface Walker {
  x: number;
  z: number;
  y: number;
  heading: number;
  velocityX: number;
  velocityZ: number;
  verticalSpeed: number;
  isAirborne: boolean;
  surface: SurfaceKind;
  isHeldBackByLava: boolean;
}

export interface WalkIntent {
  x: number;
  z: number;
  wantsJump: boolean;
}

export interface Blocker {
  centre: MapPoint;
  radius: number;
}

export const walkSpeed = 3.4;
export const bouncePadReach = 0.75;
const trailSpeedBoost = 1.35;
const swimSpeedShare = 0.55;
const steepestSlowdown = 0.35;
const slopeSlowdown = 0.45;
const groundGrip = 14;
const iceGrip = 1.4;
const airGrip = 3;
const jumpSpeed = 5.2;
const bounceSpeed = 11;
const fallAwayDrop = 0.6;
const climbFollowRate = 18;
const slopeProbe = 0.3;

const isSwimmingIn = (kind: SurfaceKind): boolean => kind === "water";

export const findStandingHeight = (
  surfaceHeight: number,
  kind: SurfaceKind,
): number => (isSwimmingIn(kind) ? surfaceHeight - swimSink : surfaceHeight);

export const buildStartingWalker = (
  world: AdventureWorld,
  start: MapPoint,
  heading: number,
): Walker => {
  const surface = findWalkSurface(world, start, Infinity);
  return {
    x: start.x,
    z: start.z,
    y: findStandingHeight(surface.height, surface.kind),
    heading,
    velocityX: 0,
    velocityZ: 0,
    verticalSpeed: 0,
    isAirborne: false,
    surface: surface.kind,
    isHeldBackByLava: false,
  };
};

const findSpeedLimit = (kind: SurfaceKind): number => {
  if (kind === "trail" || kind === "bridge") {
    return walkSpeed * trailSpeedBoost;
  }
  return isSwimmingIn(kind) ? walkSpeed * swimSpeedShare : walkSpeed;
};

const findGrip = (walker: Walker): number => {
  if (walker.isAirborne) {
    return airGrip;
  }
  return walker.surface === "ice" ? iceGrip : groundGrip;
};

const findSlopeShare = (
  world: AdventureWorld,
  walker: Walker,
  directionX: number,
  directionZ: number,
  surfaceHeight: number,
): number => {
  const ahead = findWalkSurface(
    world,
    {
      x: walker.x + directionX * slopeProbe,
      z: walker.z + directionZ * slopeProbe,
    },
    walker.y,
  );
  const rise = (ahead.height - surfaceHeight) / slopeProbe;
  return rise <= 0 ? 1 : Math.max(steepestSlowdown, 1 - rise * slopeSlowdown);
};

export const pushOutOfBlockers = (
  point: MapPoint,
  blockers: readonly Blocker[],
): MapPoint =>
  blockers.reduce((pushed, { centre, radius }) => {
    const awayX = pushed.x - centre.x;
    const awayZ = pushed.z - centre.z;
    const distance = Math.hypot(awayX, awayZ);
    if (distance >= radius) {
      return pushed;
    }
    if (distance < 0.0001) {
      return { x: centre.x + radius, z: centre.z };
    }
    return {
      x: centre.x + (awayX / distance) * radius,
      z: centre.z + (awayZ / distance) * radius,
    };
  }, point);

export const slideAroundBlockers = (
  point: MapPoint,
  step: MapPoint,
  blockers: readonly Blocker[],
): MapPoint => {
  const blocker = blockers.find(
    ({ centre, radius }) =>
      Math.hypot(point.x - centre.x, point.z - centre.z) < radius,
  );
  if (blocker === undefined) {
    return point;
  }
  const awayX = point.x - blocker.centre.x;
  const awayZ = point.z - blocker.centre.z;
  const away = Math.hypot(awayX, awayZ) || 1;
  const sideways = { x: -awayZ / away, z: awayX / away };
  const isTurnedBack = sideways.x * step.x + sideways.z * step.z < 0;
  const slide = Math.hypot(step.x, step.z);
  const direction = isTurnedBack ? -1 : 1;
  return {
    x: point.x + sideways.x * slide * direction,
    z: point.z + sideways.z * slide * direction,
  };
};

const isOnBouncePad = (world: AdventureWorld, point: MapPoint): boolean =>
  world.adventure.bouncePads.places.some(
    (pad) => Math.hypot(point.x - pad.x, point.z - pad.z) <= bouncePadReach,
  );

export const stepWalker = (
  walker: Walker,
  intent: WalkIntent,
  deltaSeconds: number,
  world: AdventureWorld,
  blockers: readonly Blocker[] = [],
  obstacles?: Obstacles,
): Walker => {
  const seconds = Math.min(deltaSeconds, 0.1);
  const here = findWalkSurface(world, walker, walker.y);
  const intentLength = Math.min(1, Math.hypot(intent.x, intent.z));
  const directionX =
    intentLength > 0 ? intent.x / Math.hypot(intent.x, intent.z) : 0;
  const directionZ =
    intentLength > 0 ? intent.z / Math.hypot(intent.x, intent.z) : 0;
  const slopeShare =
    intentLength > 0 && !walker.isAirborne
      ? findSlopeShare(world, walker, directionX, directionZ, here.height)
      : 1;
  const speed = findSpeedLimit(here.kind) * intentLength * slopeShare;
  const grip = 1 - Math.exp(-findGrip(walker) * seconds);
  const velocityX =
    walker.velocityX + (directionX * speed - walker.velocityX) * grip;
  const velocityZ =
    walker.velocityZ + (directionZ * speed - walker.velocityZ) * grip;

  const slid = keepInsideExploreBounds(
    pushOutOfBlockers(
      slideAroundBlockers(
        {
          x: walker.x + velocityX * seconds,
          z: walker.z + velocityZ * seconds,
        },
        { x: velocityX * seconds, z: velocityZ * seconds },
        blockers,
      ),
      blockers,
    ),
  );
  const wanted =
    obstacles === undefined
      ? slid
      : moveAmongObstacles(obstacles, walker, slid, walker.y);
  const there = findWalkSurface(world, wanted, walker.y);
  const isHeldBackByLava = there.kind === "lava";
  const moved = isHeldBackByLava ? { x: walker.x, z: walker.z } : wanted;
  const surface = isHeldBackByLava ? here : there;
  const standingHeight = findStandingHeight(surface.height, surface.kind);

  let { y, verticalSpeed, isAirborne } = walker;
  const canJump = !isAirborne && !isSwimmingIn(surface.kind);
  if (canJump && isOnBouncePad(world, moved)) {
    verticalSpeed = bounceSpeed;
    isAirborne = true;
  } else if (canJump && intent.wantsJump) {
    verticalSpeed = jumpSpeed;
    isAirborne = true;
  } else if (!isAirborne && standingHeight < y - fallAwayDrop) {
    verticalSpeed = 0;
    isAirborne = true;
  }

  if (isAirborne) {
    verticalSpeed -= world.adventure.gravity * seconds;
    y += verticalSpeed * seconds;
    if (y <= standingHeight) {
      y = standingHeight;
      verticalSpeed = 0;
      isAirborne = false;
    }
  } else {
    y += (standingHeight - y) * (1 - Math.exp(-climbFollowRate * seconds));
  }

  const isMoving = Math.hypot(velocityX, velocityZ) > 0.15;
  return {
    x: moved.x,
    z: moved.z,
    y,
    heading: isMoving ? Math.atan2(velocityX, velocityZ) : walker.heading,
    velocityX: isHeldBackByLava ? 0 : velocityX,
    velocityZ: isHeldBackByLava ? 0 : velocityZ,
    verticalSpeed,
    isAirborne,
    surface: surface.kind,
    isHeldBackByLava,
  };
};

export const findIntentTowards = (
  walker: MapPoint,
  target: MapPoint,
  arrivedWithin: number,
): WalkIntent | undefined => {
  const towardsX = target.x - walker.x;
  const towardsZ = target.z - walker.z;
  const distance = Math.hypot(towardsX, towardsZ);
  if (distance <= arrivedWithin) {
    return undefined;
  }
  const easing = Math.min(1, distance / 1.2);
  return {
    x: (towardsX / distance) * easing,
    z: (towardsZ / distance) * easing,
    wantsJump: false,
  };
};

export const turnIntentToCamera = (
  stick: { right: number; forward: number },
  cameraYaw: number,
): { x: number; z: number } => ({
  x: stick.right * Math.cos(cameraYaw) - stick.forward * Math.sin(cameraYaw),
  z: -stick.right * Math.sin(cameraYaw) - stick.forward * Math.cos(cameraYaw),
});

const leftMouseButton = 0;
const rightMouseButton = 2;

export const isCameraTurningPointer = ({
  pointerType,
  button,
}: Pick<PointerEvent, "pointerType" | "button">): boolean =>
  pointerType !== "mouse" || button === rightMouseButton;

export const isMouseWalkingPointer = ({
  pointerType,
  button,
}: Pick<PointerEvent, "pointerType" | "button">): boolean =>
  pointerType === "mouse" && button === leftMouseButton;
