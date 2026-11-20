import { Color } from "three";
import { findGroundColour } from "../world-map-models.js";
import type { MapPoint } from "../world-map-terrain.js";
import { exploreScale } from "./island-adventures.js";
import { emberIsle } from "./ember-isle.js";
import { frostIsle } from "./frost-isle.js";
import type { IslandLandform } from "./island-landform.js";
import { jungleReach } from "./jungle-reach.js";
import { starfallIsle } from "./starfall-isle.js";
import { sunscorchSands } from "./sunscorch-sands.js";

const landforms = new Map<string, IslandLandform>([
  ["frost-isle", frostIsle],
  ["sunscorch-sands", sunscorchSands],
  ["jungle-reach", jungleReach],
  ["ember-isle", emberIsle],
  ["starfall-isle", starfallIsle],
]);

const meadowGreen = new Color("#78a948");

/**
 * The colour an Island paints ground at `point`, `height` high (both in
 * exploring units) and with `upness` (the up part of its normal), so
 * whatever is shaped like the land is painted like it: grass, sand or
 * snow where it is level, rock where it is steep.
 */
export const findLandColour = (
  islandId: string,
  point: MapPoint,
  height: number,
  upness: number,
): Color => {
  const landform = landforms.get(islandId);
  const x = point.x / exploreScale;
  const z = point.z / exploreScale;
  const mapHeight = height / exploreScale;
  return landform === undefined
    ? findGroundColour(x, z, mapHeight, upness, meadowGreen)
    : landform.paintGround(x, z, mapHeight, upness);
};

/**
 * The colour an Island paints its level ground at `point`, `height` high,
 * both in exploring units, so whatever is laid on it matches the land.
 */
export const findGroundPaint = (
  islandId: string,
  point: MapPoint,
  height: number,
): string => `#${findLandColour(islandId, point, height, 1).getHexString()}`;
