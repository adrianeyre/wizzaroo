import type { FurnitureSlot } from "../../curriculum/catalogue.js";
import type { Blocker } from "../islands/island-walker.js";
import type { MapPoint } from "../world-map-terrain.js";
import type { Vector } from "./character-parts.js";
import { wallWidth } from "./room-furniture.js";

export type PlacedSlot = Exclude<FurnitureSlot, "wallpaper">;

export interface Placement {
  position: Vector;
  rotation?: Vector;
  scale?: number;
}

interface FurnitureReach {
  spot: MapPoint;
  blockers: Blocker[];
}

export const roomDepth = 4.4;
export const backWallZ = -roomDepth / 2;
export const frontWallZ = roomDepth / 2;
export const sideWallX = -wallWidth / 2;
export const otherSideWallX = wallWidth / 2;

const facingRoom: Vector = [0, Math.PI / 2, 0];
const facingLeft: Vector = [0, -Math.PI / 2, 0];

export const furniturePlacements: Record<PlacedSlot, Placement> = {
  bed: { position: [-1.85, 0, -1.1], scale: 0.9 },
  rug: { position: [0.4, 0, 0.6] },
  wallPicture: { position: [0.2, 2.05, backWallZ + 0.08] },
  window: { position: [sideWallX + 0.08, 1.85, -0.3], rotation: facingRoom },
  shelf: { position: [1.7, 1.55, backWallZ + 0.2] },
  lamp: { position: [-0.65, 0, -1.75] },
  plant: { position: [2.55, 0, -1.6] },
  desk: { position: [1.5, 0, backWallZ + 0.32] },
  seat: { position: [2.4, 0, 0.15], rotation: facingLeft },
  toyBox: { position: [-1.7, 0, 0.32] },
  clock: { position: [-1.85, 2.55, backWallZ + 0.06] },
  fishTank: { position: [0.2, 0, backWallZ + 0.27] },
  softToy: { position: [-0.85, 0, 1.25], rotation: [0, 0.3, 0] },
  instrument: { position: [2.45, 0, 1.45], rotation: facingLeft },
};

const placeBlocker = (x: number, z: number, radius: number): Blocker => ({
  centre: { x, z },
  radius,
});

export const furnitureReaches: Record<PlacedSlot, FurnitureReach> = {
  bed: {
    spot: { x: -0.85, z: -1 },
    blockers: [
      placeBlocker(-1.85, -1.55, 0.62),
      placeBlocker(-1.85, -0.7, 0.62),
    ],
  },
  rug: { spot: { x: 0.4, z: 0.6 }, blockers: [] },
  wallPicture: { spot: { x: -0.1, z: -1.3 }, blockers: [] },
  window: { spot: { x: -2.45, z: 0 }, blockers: [] },
  shelf: { spot: { x: 1.9, z: -1.2 }, blockers: [] },
  lamp: {
    spot: { x: -0.65, z: -1.15 },
    blockers: [placeBlocker(-0.65, -1.75, 0.3)],
  },
  plant: {
    spot: { x: 2.4, z: -0.95 },
    blockers: [placeBlocker(2.55, -1.6, 0.35)],
  },
  desk: {
    spot: { x: 1.2, z: -1.15 },
    blockers: [
      placeBlocker(1.15, -1.85, 0.42),
      placeBlocker(1.85, -1.85, 0.42),
    ],
  },
  seat: {
    spot: { x: 1.65, z: 0.15 },
    blockers: [placeBlocker(2.4, 0.15, 0.5)],
  },
  toyBox: {
    spot: { x: -1.7, z: 0.95 },
    blockers: [placeBlocker(-1.95, 0.32, 0.3), placeBlocker(-1.45, 0.32, 0.3)],
  },
  clock: { spot: { x: -0.9, z: -0.5 }, blockers: [] },
  fishTank: {
    spot: { x: 0.4, z: -1.3 },
    blockers: [placeBlocker(0.2, -1.95, 0.5)],
  },
  softToy: {
    spot: { x: -0.6, z: 0.75 },
    blockers: [placeBlocker(-0.85, 1.25, 0.22)],
  },
  instrument: {
    spot: { x: 1.75, z: 1.45 },
    blockers: [placeBlocker(2.5, 1.05, 0.45), placeBlocker(2.5, 1.85, 0.45)],
  },
};

export const roomBlockers: readonly Blocker[] = Object.values(
  furnitureReaches,
).flatMap(({ blockers }) => blockers);

const wallGap = 0.3;

export const keepInsideRoom = ({ x, z }: MapPoint): MapPoint => ({
  x: Math.min(otherSideWallX - wallGap, Math.max(sideWallX + wallGap, x)),
  z: Math.min(frontWallZ - wallGap, Math.max(backWallZ + wallGap, z)),
});
