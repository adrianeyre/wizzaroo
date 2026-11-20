import { Box3, type BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import { resources } from "../../curriculum/geography.js";
import { crateInside, resourceModels } from "./resource-models.js";

const mostBodyTriangles = 2800;
const mostMovingTriangles = 700;
const tallestModel = 1.6;
const edgeSlack = 0.02;

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const measure = (geometry: BufferGeometry): Box3 => {
  geometry.computeBoundingBox();
  return geometry.boundingBox ?? new Box3();
};

describe("the resource models", () => {
  it("has exactly one model for every resource", () => {
    expect(Object.keys(resourceModels).sort()).toEqual([...resources].sort());
  });

  it.each(resources)("builds %s cheaply enough for the stage", (resource) => {
    const model = resourceModels[resource];
    const body = model.buildBody();
    const moving = model.moving?.buildPart();

    expect(countTriangles(body)).toBeLessThanOrEqual(mostBodyTriangles);
    expect(
      moving === undefined ? 0 : countTriangles(moving),
    ).toBeLessThanOrEqual(mostMovingTriangles);
    expect(body.getAttribute("color").count).toBe(
      body.getAttribute("position").count,
    );
  });

  it.each(resources)("fits %s inside the open crate", (resource) => {
    const bounds = measure(resourceModels[resource].buildBody());

    expect(bounds.min.x).toBeGreaterThanOrEqual(
      -crateInside.halfWidth - edgeSlack,
    );
    expect(bounds.max.x).toBeLessThanOrEqual(crateInside.halfWidth + edgeSlack);
    expect(bounds.min.z).toBeGreaterThanOrEqual(
      -crateInside.halfDepth - edgeSlack,
    );
    expect(bounds.max.z).toBeLessThanOrEqual(crateInside.halfDepth + edgeSlack);
    expect(bounds.min.y).toBeGreaterThanOrEqual(-edgeSlack);
    expect(bounds.max.y).toBeLessThanOrEqual(tallestModel);
  });
});
