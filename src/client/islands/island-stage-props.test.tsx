import ReactThreeTestRenderer from "@react-three/test-renderer";
import { InstancedMesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { islands } from "../../curriculum/islands.js";
import { musicGameTypes } from "../../curriculum/music-games.js";
import {
  islandStagePropBuilders,
  islandStagePropMeshes,
  islandStagePropTriangleBudget,
  IslandStageProps,
  isStageDressedForIsland,
} from "./island-stage-props.js";

const isInstancedMesh = (value: unknown): value is InstancedMesh =>
  value instanceof InstancedMesh;

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("IslandStageProps", () => {
  it.each(islands.map(({ id }) => [id]))(
    `dresses the stage for %s with props of its own, within ${String(islandStagePropTriangleBudget)} triangles in ${String(islandStagePropMeshes)} mesh`,
    async (islandId) => {
      const renderer = await ReactThreeTestRenderer.create(
        <IslandStageProps islandId={islandId} gameType="popping-bubbles" />,
      );
      const meshes = renderer.scene
        .findAllByType("Mesh")
        .map(({ instance }) => instance)
        .filter(isInstancedMesh);

      expect(meshes).toHaveLength(islandStagePropMeshes);
      const [props] = meshes;
      const triangles =
        (props.geometry.getAttribute("position").count / 3) * props.count;
      expect(triangles).toBeGreaterThan(0);
      expect(triangles).toBeLessThanOrEqual(islandStagePropTriangleBudget);
      await renderer.unmount();
    },
  );

  it("gives every Island a different prop", () => {
    expect([...islandStagePropBuilders.keys()].toSorted()).toEqual(
      islands.map(({ id }) => id).toSorted(),
    );
  });

  it("leaves Meadow Isle's stages and the Music stages, which have no room to spare, as they are", async () => {
    for (const gameType of musicGameTypes) {
      expect(isStageDressedForIsland(gameType)).toBe(false);
    }
    expect(isStageDressedForIsland("science-lab")).toBe(true);
    for (const [islandId, gameType] of [
      [undefined, "popping-bubbles"],
      ["frost-isle", musicGameTypes[0]],
    ] as const) {
      const renderer = await ReactThreeTestRenderer.create(
        <IslandStageProps islandId={islandId} gameType={gameType} />,
      );
      expect(renderer.scene.findAllByType("Mesh")).toHaveLength(0);
      await renderer.unmount();
    }
  });
});
