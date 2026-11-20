import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { Mesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  globeHighlights,
  type GeographyShowOf,
} from "../../curriculum/geography.js";
import { GlobeSpinnerScene } from "./globe-spinner.js";

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

const everyShow: GeographyShowOf<"globe-spinner">[] = [
  ...globeHighlights.map((highlight): GeographyShowOf<"globe-spinner"> => ({
    scene: "globe-spinner",
    highlight,
    pin: { latitude: -33.9, longitude: 151.2 },
    sunLongitude: 40,
  })),
  { scene: "globe-spinner" },
];

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("GlobeSpinnerScene", () => {
  it.each(everyShow.map((show) => [JSON.stringify(show), show] as const))(
    "draws %s within its share of the stage's budget",
    async (_, show) => {
      const renderer = await ReactThreeTestRenderer.create(
        <GlobeSpinnerScene show={show} />,
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

  it("stands a pin only when one is asked for, and draws a line only for a line", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlobeSpinnerScene
        show={{ scene: "globe-spinner", highlight: "asia" }}
      />,
    );
    const names = listMeshes(renderer).map(({ name }) => name);

    expect(names).not.toContain("map-pin");
    expect(names).not.toContain("globe-line");
    await renderer.unmount();
  });

  it("glows the equator as a ring around the globe", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlobeSpinnerScene
        show={{
          scene: "globe-spinner",
          highlight: "equator",
          pin: { latitude: 0, longitude: 0 },
        }}
      />,
    );
    const names = listMeshes(renderer).map(({ name }) => name);

    expect(names).toContain("globe-line");
    expect(names).toContain("map-pin");
    await renderer.unmount();
  });
});
