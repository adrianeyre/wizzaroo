import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { Mesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  ukHighlights,
  type GeographyShowOf,
} from "../../curriculum/geography.js";
import { UkExplorerScene } from "./uk-explorer.js";

const sceneTriangleBudget = 6_500;
const sceneMeshBudget = 22;

const listMeshes = (renderer: ReactThreeTest.Renderer): Mesh[] =>
  renderer.scene
    .findAllByType("Mesh")
    .map(({ instance }) => instance)
    .filter((value: unknown): value is Mesh => value instanceof Mesh);

const countTriangles = (mesh: Mesh): number =>
  (mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position").count) /
  3;

const everyShow: GeographyShowOf<"uk-explorer">[] = [
  ...ukHighlights.map((highlight): GeographyShowOf<"uk-explorer"> => ({
    scene: "uk-explorer",
    highlight,
    pin: { latitude: 56.8, longitude: -5.0 },
  })),
  { scene: "uk-explorer" },
];

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("UkExplorerScene", () => {
  it.each(everyShow.map((show) => [JSON.stringify(show), show] as const))(
    "draws %s within its share of the stage's budget",
    async (_, show) => {
      const renderer = await ReactThreeTestRenderer.create(
        <UkExplorerScene show={show} />,
      );
      await renderer.advanceFrames(3, 1 / 60);
      const meshes = listMeshes(renderer);
      const triangles = meshes.reduce(
        (total, mesh) => total + countTriangles(mesh),
        0,
      );

      expect(triangles).toBeLessThanOrEqual(sceneTriangleBudget);
      expect(meshes.length).toBeLessThanOrEqual(sceneMeshBudget);
      await renderer.unmount();
    },
  );

  it("stands a pin only when one is asked for", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <UkExplorerScene show={{ scene: "uk-explorer", highlight: "wales" }} />,
    );
    const names = listMeshes(renderer).map(({ name }) => name);

    expect(names).not.toContain("map-pin");
    expect(names).toEqual(
      expect.arrayContaining([
        "uk-england",
        "uk-scotland",
        "uk-wales",
        "uk-northern-ireland",
        "uk-neighbours",
        "uk-sea",
      ]),
    );
    await renderer.unmount();
  });
});
