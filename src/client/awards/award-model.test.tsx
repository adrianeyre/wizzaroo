import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Mesh, type BufferGeometry } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { islandQuests } from "../../curriculum/island-quests.js";
import { awardDesigns, findAwardDesign } from "./award-designs.js";
import { buildAwardMeshes, findAwardHeight } from "./award-model.js";
import { AwardFigure, awardTurnSeconds } from "./award-stage.js";

const mostAwardTriangles = 30_000;
const mostAwardMeshes = 8;

const countTriangles = (geometry: BufferGeometry) =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("Awards", () => {
  it("gives every Island's Quest its own Award design, each different", () => {
    expect(awardDesigns.map(({ islandId }) => islandId).sort()).toEqual(
      islandQuests.map(({ islandId }) => islandId).sort(),
    );
    expect(new Set(awardDesigns.map(({ emblem }) => emblem)).size).toBe(
      awardDesigns.length,
    );
  });

  it.each(awardDesigns)(
    "draws $islandId's Award in high detail within its budget",
    (design) => {
      const meshes = buildAwardMeshes(design);
      const triangles = meshes.reduce(
        (sum, { geometry }) => sum + countTriangles(geometry),
        0,
      );

      expect(meshes.length).toBeLessThanOrEqual(mostAwardMeshes);
      expect(triangles).toBeGreaterThan(12_000);
      expect(triangles).toBeLessThanOrEqual(mostAwardTriangles);
      expect(meshes.map(({ finish }) => finish)).toEqual(
        expect.arrayContaining(["plinth", "metal", "trim", "gem", "shadow"]),
      );
      meshes.forEach(({ geometry }) => {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        expect(box?.min.y).toBeGreaterThanOrEqual(0);
        expect(box?.max.y).toBeLessThanOrEqual(findAwardHeight(design) + 0.01);
      });
    },
  );

  it("falls back to the first design for an Island it doesn't know", () => {
    expect(findAwardDesign("somewhere-new")).toMatchObject({
      islandId: "somewhere-new",
      emblem: awardDesigns[0].emblem,
    });
  });

  it("turns an Award slowly round, once every few seconds, but keeps it still when motion is reduced", async () => {
    const turning = await ReactThreeTestRenderer.create(
      <AwardFigure islandId="meadow-isle" isTurning />,
    );
    const still = await ReactThreeTestRenderer.create(
      <AwardFigure islandId="meadow-isle" isTurning={false} />,
    );
    const findTurn = (renderer: typeof turning) =>
      renderer.scene.find(({ instance }) => instance.name === "award-turntable")
        .instance.rotation.y;
    const turnedFrom = findTurn(turning);
    const stillFrom = findTurn(still);

    await turning.advanceFrames(60, 1 / 60);
    await still.advanceFrames(60, 1 / 60);

    expect(findTurn(turning) - turnedFrom).toBeCloseTo(
      (Math.PI * 2) / awardTurnSeconds,
      5,
    );
    expect(findTurn(still)).toBe(stillFrom);
    expect(
      turning.scene
        .findAllByType("Mesh")
        .every(({ instance }) => instance instanceof Mesh),
    ).toBe(true);
    await turning.unmount();
    await still.unmount();
  });
});
