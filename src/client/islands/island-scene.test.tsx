import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import {
  BufferGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Vector3,
} from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { bigTopName, islands, type Island } from "../../curriculum/islands.js";
import { challengeArenaYears } from "../../curriculum/world-map.js";
import { emberIsle } from "./ember-isle.js";
import { frostIsle } from "./frost-isle.js";
import type { IslandLandform } from "./island-landform.js";
import { jungleReach } from "./jungle-reach.js";
import { starfallIsle } from "./starfall-isle.js";
import { sunscorchSands } from "./sunscorch-sands.js";
import type { TimeOfDay, Weather } from "../world-map-sky.js";
import {
  hasIslandDesign,
  IslandScene,
  IslandWithoutDesignError,
} from "./island-scene.js";

const sceneTriangleBudget = 260_000;
const sceneMeshBudget = 60;

const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;

const listMeshes = (renderer: ReactThreeTest.Renderer): Mesh[] =>
  [
    ...renderer.scene.findAllByType("Mesh"),
    ...renderer.scene.findAllByType("InstancedMesh"),
  ]
    .map(({ instance }) => instance)
    .filter(isMesh);

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const countDrawnTriangles = (mesh: Mesh): number =>
  countTriangles(mesh.geometry) *
  (mesh instanceof InstancedMesh ? mesh.count : 1);

const findNamed = (renderer: ReactThreeTest.Renderer, name: string) =>
  renderer.scene.findAll(({ instance }) => instance.name === name);

interface IslandHandlers {
  selectedRegionId?: string;
  hoveredRegionId?: string;
  timeOfDay?: TimeOfDay;
  weather?: Weather;
  onRegionChosen?: (regionId: string) => void;
  onRegionHovered?: (regionId: string | undefined) => void;
}

const renderIsland = (
  island: Island,
  {
    selectedRegionId,
    hoveredRegionId,
    timeOfDay,
    weather,
    onRegionChosen = () => undefined,
    onRegionHovered = () => undefined,
  }: IslandHandlers = {},
) =>
  ReactThreeTestRenderer.create(
    <IslandScene
      island={island}
      selectedRegionId={selectedRegionId}
      hoveredRegionId={hoveredRegionId}
      onRegionChosen={onRegionChosen}
      onRegionHovered={onRegionHovered}
      timeOfDay={timeOfDay}
      weather={weather}
    />,
  );

const tapAt = { delta: 1, stopPropagation: () => undefined };

const landforms: Record<string, IslandLandform> = {
  "frost-isle": frostIsle,
  "sunscorch-sands": sunscorchSands,
  "jungle-reach": jungleReach,
  "ember-isle": emberIsle,
  "starfall-isle": starfallIsle,
};

const islandLandmarks: Record<string, string[]> = {
  "frost-isle": [
    "snowy-pines",
    "igloos",
    "ice-bridge",
    "frozen-channel",
    "aurora",
  ],
  "sunscorch-sands": [
    "oasis-pool",
    "palms",
    "market-houses",
    "ruined-columns",
    "camel-caravan",
  ],
  "jungle-reach": [
    "jungle-canopy",
    "waterfall",
    "lower-river",
    "delta-west",
    "delta-middle",
    "delta-east",
    "rope-bridge-1",
    "rope-bridge-2",
  ],
  "ember-isle": [
    "volcano-crater",
    "lava-river-east",
    "lava-river-west",
    "obsidian-shards",
    "steam-vents",
    "steam",
  ],
  "starfall-isle": [
    "floating-rocks",
    "crystal-spires",
    "menhirs",
    "comet",
    "stars",
    "moon",
  ],
};

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe.each(islands.map((island) => [island.name, island] as const))(
  "IslandScene for %s",
  (_, island) => {
    it("has a landscape of its own to draw", () => {
      expect(hasIslandDesign(island.id)).toBe(true);
    });

    it("draws every one of its Regions and the Brainwave Big Top at its place on the land, each with its landmark", async () => {
      const renderer = await renderIsland(island);

      for (const region of island.regions) {
        const [place] = findNamed(renderer, `region-${region.id}`);
        expect(place, region.id).toBeDefined();
        const group = place.instance;
        expect(group).toBeInstanceOf(Group);
        expect(group.position.x).toBe(region.mapPosition.x);
        expect(group.position.z).toBe(region.mapPosition.z);
        expect(group.position.y).toBeGreaterThan(0);
        const [landmark] = place.findAll(
          ({ instance }) => instance.name === `landmark-${region.landmark}`,
        );
        expect(
          landmark.findAllByType("Mesh").length,
          region.id,
        ).toBeGreaterThan(0);
      }
      expect(
        island.regions.filter(({ name }) => name === bigTopName),
      ).toHaveLength(1);
      expect(findNamed(renderer, "landmark-big-top")).toHaveLength(1);
      await renderer.unmount();
    });

    it("draws each of its sights again on its new lands, as one instanced model per sight, among its own trees and rocks", async () => {
      const renderer = await renderIsland(island);
      const { features } = landforms[island.id];
      const copies = features.filter(({ name }) => name.includes("-new-land-"));
      expect(copies).toHaveLength(6);
      new Set(copies.map(({ name }) => name.split("-new-land-")[0])).forEach(
        (sight) => {
          const [model] = findNamed(renderer, sight);
          expect(model.instance, sight).toBeInstanceOf(InstancedMesh);
          expect(
            model.instance instanceof InstancedMesh && model.instance.count,
            sight,
          ).toBe(3);
        },
      );
      const newLandThings = renderer.scene
        .findAll(({ instance }) => instance instanceof InstancedMesh)
        .map(({ instance }) => instance)
        .filter((mesh): mesh is InstancedMesh => mesh instanceof InstancedMesh)
        .flatMap((mesh) =>
          Array.from({ length: mesh.count }, (_, index) => {
            const placed = new Matrix4();
            mesh.getMatrixAt(index, placed);
            return new Vector3().setFromMatrixPosition(placed).x;
          }),
        )
        .filter((x) => Math.abs(x) > 30);
      expect(newLandThings.length).toBeGreaterThan(20);
      await renderer.unmount();
    });

    it("draws its own landmarks, sea and sky", async () => {
      const renderer = await renderIsland(island, { timeOfDay: "night" });

      for (const name of [
        "terrain",
        "terrain-surface",
        "sea",
        "sky",
        "sun",
        ...(islandLandmarks[island.id] ?? []),
      ]) {
        expect(findNamed(renderer, name), name).toHaveLength(1);
      }
      await renderer.unmount();
    });

    it("raises a heading over each Region, Checks over the Challenge Arena, but none over the Big Top", async () => {
      const renderer = await renderIsland(island);

      for (const region of island.regions) {
        expect(
          findNamed(renderer, `region-heading-${region.id}`),
          region.id,
        ).toHaveLength(region.landmark === "big-top" ? 0 : 1);
      }
      await renderer.unmount();
    });

    it(`draws the Challenge Arena, with its spinning trophy, only on an Island whose Year has a statutory check`, async () => {
      const renderer = await renderIsland(island);
      const hasArena = challengeArenaYears.includes(island.yearGroup);

      expect(findNamed(renderer, "landmark-challenge-arena")).toHaveLength(
        hasArena ? 1 : 0,
      );
      expect(findNamed(renderer, "arena-trophy")).toHaveLength(
        hasArena ? 1 : 0,
      );
      await renderer.unmount();
    });

    it.each([
      ["day", "clear"],
      ["night", "storm"],
      ["twilight", "snow"],
      ["day", "wind"],
    ] as const)(
      `stays within the budget of ${String(sceneTriangleBudget)} triangles and ${String(sceneMeshBudget)} meshes in full detail, by %s in %s weather, with a Region chosen and pointed at`,
      async (timeOfDay, weather) => {
        const renderer = await renderIsland(island, {
          timeOfDay,
          weather,
          selectedRegionId: island.regions[0].id,
          hoveredRegionId: island.regions[1].id,
        });

        const meshes = listMeshes(renderer);
        const triangles = meshes.reduce(
          (total, mesh) => total + countDrawnTriangles(mesh),
          0,
        );

        expect(triangles).toBeGreaterThan(0);
        expect(triangles).toBeLessThanOrEqual(sceneTriangleBudget);
        expect(meshes.length).toBeLessThanOrEqual(sceneMeshBudget);
        await renderer.unmount();
      },
    );

    it("chooses a Region when its landmark or the land near it is tapped, but not when the Child was dragging", async () => {
      const onRegionChosen = vi.fn();
      const renderer = await renderIsland(island, { onRegionChosen });
      const [first, second] = island.regions;
      const [firstPlace] = findNamed(renderer, `region-${first.id}`);
      const [terrain] = findNamed(renderer, "terrain");

      await renderer.fireEvent(firstPlace, "onClick", { ...tapAt, delta: 40 });
      await renderer.fireEvent(firstPlace, "onClick", tapAt);
      await renderer.fireEvent(terrain, "onClick", {
        ...tapAt,
        point: new Vector3(second.mapPosition.x + 0.5, 0, second.mapPosition.z),
      });
      await renderer.fireEvent(terrain, "onClick", {
        ...tapAt,
        point: new Vector3(60, 0, 40),
      });

      expect(onRegionChosen.mock.calls).toEqual([[first.id], [second.id]]);
      await renderer.unmount();
    });

    it("lights the Region being pointed at and marks the one chosen", async () => {
      const [first, second] = island.regions;
      const renderer = await renderIsland(island, {
        selectedRegionId: first.id,
        hoveredRegionId: second.id,
      });

      expect(findNamed(renderer, `hover-glow-${second.id}`)).toHaveLength(1);
      expect(findNamed(renderer, `hover-glow-${first.id}`)).toHaveLength(0);
      expect(findNamed(renderer, "selection-marker")).toHaveLength(1);
      await renderer.unmount();
    });
  },
);

describe("IslandScene for an Island with no landscape", () => {
  it("refuses to draw it", () => {
    expect(hasIslandDesign("meadow-isle")).toBe(false);
    expect(() =>
      IslandScene({
        island: { ...islands[0], id: "meadow-isle" },
        selectedRegionId: undefined,
        hoveredRegionId: undefined,
        onRegionChosen: () => undefined,
        onRegionHovered: () => undefined,
      }),
    ).toThrow(IslandWithoutDesignError);
  });
});
