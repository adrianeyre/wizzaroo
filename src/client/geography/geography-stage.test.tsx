import {
  islandStagePropMeshes,
  islandStagePropTriangleBudget,
} from "../islands/island-stage-props.js";
import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { BufferGeometry, InstancedMesh, Mesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  biomes,
  compassDirections,
  compassLandmarks,
  cutawayParts,
  globeHighlights,
  gridStyles,
  landscapeFeatures,
  mapSymbols,
  resources,
  seasons,
  settlementTiles,
  tourRegions,
  ukHighlights,
  valleyMarkers,
  weatherKinds,
  type GeographyShow,
} from "../../curriculum/geography.js";
import { GeographyGameWorld } from "./geography-stage.js";

const triangleBudget = 10_000 - islandStagePropTriangleBudget;
const meshBudget = 40 - islandStagePropMeshes;

const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;

const listMeshes = (renderer: ReactThreeTest.Renderer): Mesh[] =>
  renderer.scene
    .findAllByType("Mesh")
    .concat(renderer.scene.findAllByType("InstancedMesh"))
    .map(({ instance }) => instance)
    .filter(isMesh);

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const countDrawnTriangles = (mesh: Mesh): number =>
  countTriangles(mesh.geometry) *
  (mesh instanceof InstancedMesh ? mesh.count : 1);

const renderGeographyScene = async (show: GeographyShow) => {
  const renderer = await ReactThreeTestRenderer.create(
    <GeographyGameWorld
      scene={show.scene}
      show={show}
      companionMood="waiting"
      popCount={1}
      isEffectsOn
    />,
  );
  await renderer.advanceFrames(2, 1 / 60);
  return renderer;
};

const describeShow = (show: GeographyShow) => JSON.stringify(show);

const everyShow: GeographyShow[] = [
  ...globeHighlights.map((highlight): GeographyShow => ({
    scene: "globe-spinner",
    highlight,
  })),
  {
    scene: "globe-spinner",
    pin: { latitude: 51.5, longitude: -0.1 },
    sunLongitude: 120,
  },
  ...ukHighlights.map((highlight): GeographyShow => ({
    scene: "uk-explorer",
    highlight,
  })),
  { scene: "uk-explorer", pin: { latitude: 55.95, longitude: -3.19 } },
  ...compassLandmarks.map((target, index): GeographyShow => ({
    scene: "compass-island",
    target,
    direction: compassDirections[index],
    points: 8,
    distance: index % 2 === 0 ? "near" : "far",
  })),
  ...weatherKinds.map((weather): GeographyShow => ({
    scene: "weather-window",
    weather,
  })),
  ...seasons.map((season): GeographyShow => ({
    scene: "weather-window",
    season,
    weather: "snowy",
  })),
  ...landscapeFeatures.map((feature): GeographyShow => ({
    scene: "landscape-lookout",
    feature,
  })),
  ...mapSymbols.map((symbol): GeographyShow => ({
    scene: "map-key",
    symbol,
  })),
  ...gridStyles.map((style): GeographyShow => ({
    scene: "grid-hunt",
    style,
    x: style === "letters" ? 3 : 23.4,
    y: style === "letters" ? 4 : 45.7,
  })),
  ...biomes.map((biome): GeographyShow => ({ scene: "biome-dome", biome })),
  ...valleyMarkers.map((marker): GeographyShow => ({
    scene: "river-valley",
    marker,
  })),
  ...cutawayParts.map((part): GeographyShow => ({
    scene: "volcano-cutaway",
    part,
  })),
  ...settlementTiles.map((tile): GeographyShow => ({
    scene: "settlement-board",
    tile,
  })),
  ...resources.map((resource): GeographyShow => ({
    scene: "resource-dock",
    resource,
  })),
  {
    scene: "data-towers",
    title: "How we travel to school",
    unit: "children",
    bars: [
      { label: "Walk", value: 12 },
      { label: "Car", value: 9 },
      { label: "Bus", value: 5 },
      { label: "Bike", value: 3 },
      { label: "Scooter", value: 4 },
      { label: "Train", value: 1 },
    ],
  },
  { scene: "region-tour" },
  ...tourRegions.map((region): GeographyShow => ({
    scene: "region-tour",
    region,
  })),
];

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("GeographyGameWorld", () => {
  it.each(everyShow.map((show) => [describeShow(show), show] as const))(
    "draws %s within the scene budget",
    async (_, show) => {
      const renderer = await renderGeographyScene(show);
      const meshes = listMeshes(renderer);
      const triangles = meshes.reduce(
        (total, mesh) => total + countDrawnTriangles(mesh),
        0,
      );

      expect(triangles).toBeLessThanOrEqual(triangleBudget);
      expect(meshes.length).toBeLessThanOrEqual(meshBudget);
      await renderer.unmount();
    },
  );

  it("draws the stage with no scene while a Mission is being celebrated", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GeographyGameWorld
        scene="globe-spinner"
        show={undefined}
        companionMood="celebrating"
        popCount={0}
        isEffectsOn
      />,
    );

    expect(
      renderer.scene.findAll(({ instance }) => instance.name === "plinth"),
    ).toHaveLength(1);
    expect(
      renderer.scene.findAll(
        ({ instance }) => instance.name === "geography-scene",
      ),
    ).toHaveLength(0);
  });
});
