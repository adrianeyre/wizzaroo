import { Box3, Vector3, type BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import { labItems } from "../../curriculum/lab-items.js";
import {
  buildLabItemModel,
  labItemSize,
  labItemTriangleBudget,
} from "./lab-item-models.js";

const countTriangles = (geometry: BufferGeometry | undefined): number =>
  geometry === undefined
    ? 0
    : (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const findSize = (geometry: BufferGeometry): Vector3 => {
  geometry.computeBoundingBox();
  return (geometry.boundingBox ?? new Box3()).getSize(new Vector3());
};

describe("buildLabItemModel", () => {
  it.each(labItems)(
    "draws the %s within its budget, so it fits above any station's choices",
    (item) => {
      const { body, glass } = buildLabItemModel(item);

      expect(countTriangles(body)).toBeGreaterThan(0);
      expect(countTriangles(body) + countTriangles(glass)).toBeLessThanOrEqual(
        labItemTriangleBudget,
      );
    },
  );

  it.each(labItems)(
    "fits the %s to the turntable, centred, whatever units it was drawn in",
    (item) => {
      const { body, glass } = buildLabItemModel(item);
      const bounds = new Box3();
      for (const geometry of [body, glass]) {
        if (geometry !== undefined) {
          geometry.computeBoundingBox();
          bounds.union(geometry.boundingBox ?? new Box3());
        }
      }
      const size = bounds.getSize(new Vector3());
      const centre = bounds.getCenter(new Vector3());

      expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(labItemSize, 5);
      expect(centre.length()).toBeLessThan(1e-6);
      expect(findSize(body).length()).toBeGreaterThan(0);
    },
  );
});
