import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { InstancedMesh, Mesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ChestScene } from "./family-chest.js";

const isInstancedMesh = (value: unknown): value is InstancedMesh =>
  value instanceof InstancedMesh;

const findInstanced = (renderer: ReactThreeTest.Renderer, name: string) =>
  renderer.scene
    .findAll(({ instance }) => instance.name === name)
    .map(({ instance }) => instance)
    .find(isInstancedMesh);

const renderChest = async (coinCount: number) => {
  const renderer = await ReactThreeTestRenderer.create(
    <ChestScene coinCount={coinCount} />,
  );
  await renderer.advanceFrames(2, 1 / 60);
  return renderer;
};

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("ChestScene", () => {
  it("spills one gold coin per Activity, with a gem for every five coins", async () => {
    const renderer = await renderChest(12);

    expect(findInstanced(renderer, "chest-coins")?.count).toBe(12);
    expect(findInstanced(renderer, "chest-gems")?.count).toBe(3);
    await renderer.unmount();
  });

  it("shows the closed chest with no treasure before any Activity", async () => {
    const renderer = await renderChest(0);

    expect(findInstanced(renderer, "chest-coins")).toBeUndefined();
    expect(
      renderer.scene.findAll(({ instance }) => instance.name === "chest-body"),
    ).toHaveLength(1);
    expect(
      renderer.scene
        .findAllByType("Mesh")
        .every(({ instance }) => instance instanceof Mesh),
    ).toBe(true);
    await renderer.unmount();
  });
});
