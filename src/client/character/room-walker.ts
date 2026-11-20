import {
  pushOutOfBlockers,
  slideAroundBlockers,
  type Blocker,
  type WalkIntent,
} from "../islands/island-walker.js";
import type { MapPoint } from "../world-map-terrain.js";
import { furnitureSlots } from "../../curriculum/catalogue.js";
import { furnitureReaches, keepInsideRoom } from "./room-layout.js";
import type { RoomThing } from "./room-play-actions.js";

export interface RoomWalker {
  x: number;
  z: number;
  heading: number;
  velocityX: number;
  velocityZ: number;
  jumpHeight: number;
  jumpSpeed: number;
}

const roomWalkSpeed = 2.2;
const thingReach = 0.75;
const petReach = 0.9;
const grip = 12;
const jumpLaunchSpeed = 3.6;
const gravity = 12;
const longestStepSeconds = 0.1;
const movingSpeed = 0.15;

export const buildStartingRoomWalker = (): RoomWalker => ({
  x: 0.35,
  z: 1,
  heading: Math.PI,
  velocityX: 0,
  velocityZ: 0,
  jumpHeight: 0,
  jumpSpeed: 0,
});

const stepJump = (
  walker: RoomWalker,
  wantsJump: boolean,
  seconds: number,
): Pick<RoomWalker, "jumpHeight" | "jumpSpeed"> => {
  const isGrounded = walker.jumpHeight === 0 && walker.jumpSpeed === 0;
  const jumpSpeed =
    (isGrounded && wantsJump ? jumpLaunchSpeed : walker.jumpSpeed) -
    (isGrounded && !wantsJump ? 0 : gravity * seconds);
  const jumpHeight = walker.jumpHeight + jumpSpeed * seconds;
  return jumpHeight <= 0
    ? { jumpHeight: 0, jumpSpeed: 0 }
    : { jumpHeight, jumpSpeed };
};

export const stepRoomWalker = (
  walker: RoomWalker,
  intent: WalkIntent,
  deltaSeconds: number,
  blockers: readonly Blocker[],
): RoomWalker => {
  const seconds = Math.min(deltaSeconds, longestStepSeconds);
  const intentLength = Math.min(1, Math.hypot(intent.x, intent.z));
  const directionShare =
    intentLength > 0 ? intentLength / Math.hypot(intent.x, intent.z) : 0;
  const pull = 1 - Math.exp(-grip * seconds);
  const velocityX =
    walker.velocityX +
    (intent.x * directionShare * roomWalkSpeed - walker.velocityX) * pull;
  const velocityZ =
    walker.velocityZ +
    (intent.z * directionShare * roomWalkSpeed - walker.velocityZ) * pull;
  const step = { x: velocityX * seconds, z: velocityZ * seconds };
  const moved = keepInsideRoom(
    pushOutOfBlockers(
      slideAroundBlockers(
        { x: walker.x + step.x, z: walker.z + step.z },
        step,
        blockers,
      ),
      blockers,
    ),
  );
  const isMoving = Math.hypot(velocityX, velocityZ) > movingSpeed;
  return {
    x: moved.x,
    z: moved.z,
    heading: isMoving ? Math.atan2(velocityX, velocityZ) : walker.heading,
    velocityX,
    velocityZ,
    ...stepJump(walker, intent.wantsJump, seconds),
  };
};

const findDistance = (from: MapPoint, to: MapPoint): number =>
  Math.hypot(from.x - to.x, from.z - to.z);

export const findThingSpot = (
  thing: RoomThing,
  petPlace: MapPoint | undefined,
): MapPoint | undefined => {
  if (thing === "pet") {
    return petPlace;
  }
  return thing === "wallpaper" ? undefined : furnitureReaches[thing].spot;
};

const thingsPlayedWithFromAfar = new Set<RoomThing>([
  "wallpaper",
  "wallPicture",
  "window",
  "clock",
  "shelf",
]);

export const canPlayFromAfar = (thing: RoomThing): boolean =>
  thingsPlayedWithFromAfar.has(thing);

export const isThingInReach = (
  thing: RoomThing,
  walker: MapPoint,
  petPlace: MapPoint | undefined,
): boolean => {
  const spot = findThingSpot(thing, petPlace);
  if (spot === undefined) {
    return thing === "wallpaper";
  }
  return (
    findDistance(walker, spot) <= (thing === "pet" ? petReach : thingReach)
  );
};

export const findNearestRoomThing = (
  walker: MapPoint,
  petPlace: MapPoint | undefined,
): RoomThing | undefined => {
  const furnitureSpots = furnitureSlots.flatMap(
    (slot): [RoomThing, MapPoint, number][] =>
      slot === "wallpaper"
        ? []
        : [[slot, furnitureReaches[slot].spot, thingReach]],
  );
  const petSpots: [RoomThing, MapPoint, number][] =
    petPlace === undefined ? [] : [["pet", petPlace, petReach]];
  const inReach = [...petSpots, ...furnitureSpots]
    .map(([thing, spot, reach]) => ({
      thing,
      distance: findDistance(walker, spot),
      reach,
    }))
    .filter(({ distance, reach }) => distance <= reach)
    .sort((first, second) => first.distance - second.distance);
  return inReach[0]?.thing;
};
