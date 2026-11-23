import { Box3, Vector3, type BufferGeometry } from "three";
import type { LabItem } from "../../curriculum/lab-items.js";
import { buildModelGeometry } from "../world-map-models.js";
import { habitatAnimalBuilders } from "./animals-habitats.js";
import type { LabItemParts } from "./lab-item-parts.js";

/** Every lab item's model. The type makes a missing one fail to compile. */
export const labItemBuilders: Record<LabItem, () => LabItemParts> = {
  ...habitatAnimalBuilders,
};

/**
 * The most triangles one item may draw. The busiest station, odd-one-out,
 * leaves this much of the lab's 9,900 once its four specimen jars, the
 * bench, the shelf and the Companion are drawn, so every item fits every
 * station (docs/performance-budget.md).
 */
export const labItemTriangleBudget = 1_700;

/** The longest side of every item once fitted, so each fills the turntable alike. */
export const labItemSize = 1.15;

export interface LabItemModel {
  body: BufferGeometry;
  glass?: BufferGeometry;
}

/**
 * Builds an item's model, centred on the turntable and scaled so its
 * longest side is `labItemSize`, whatever units its parts were drawn in.
 */
export const buildLabItemModel = (item: LabItem): LabItemModel => {
  const { body, glass } = labItemBuilders[item]();
  const model: LabItemModel = {
    body: buildModelGeometry(body),
    glass: glass === undefined ? undefined : buildModelGeometry(glass),
  };
  const bounds = new Box3();
  for (const geometry of [model.body, model.glass]) {
    geometry?.computeBoundingBox();
    if (geometry?.boundingBox != null) {
      bounds.union(geometry.boundingBox);
    }
  }
  const centre = bounds.getCenter(new Vector3());
  const extent = bounds.getSize(new Vector3());
  const scale = labItemSize / Math.max(extent.x, extent.y, extent.z);
  for (const geometry of [model.body, model.glass]) {
    geometry
      ?.translate(-centre.x, -centre.y, -centre.z)
      .scale(scale, scale, scale);
  }
  return model;
};
