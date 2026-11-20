import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import {
  BufferGeometry,
  InstancedMesh,
  Mesh,
  PerspectiveCamera,
  Texture,
  Vector3,
  type Object3D,
} from "three";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildChildLimits,
  buildIslandsOnMap,
  buildRegionsOnMap,
  type ChildLimits,
  type RegionOnMap,
} from "../curriculum/island-access.js";
import type { YearGroup } from "../curriculum/skills.js";
import {
  mapHalfDepth,
  mapHalfWidth,
  worldMap,
} from "../curriculum/world-map.js";
import type { MapPoint } from "./world-map-terrain.js";
import { useThree } from "@react-three/fiber";
import {
  findIslandInView,
  findIslandOverview,
  findSeaLevelPoint,
  MapCameraRig,
  WorldMapScene,
  type CameraCommand,
} from "./world-map-islands.js";
import { findRegionHeading } from "./region-heading.js";
import { findNearestRegion } from "./world-map-scene.js";
import { findRailway } from "./islands/island-railway.js";
import {
  exploreScale,
  findExploreAdventure,
} from "./islands/island-adventures.js";
import { buildMapAttractionsGeometry } from "./islands/island-attractions-models.js";
import { placeIslandAttractions } from "./islands/island-attractions.js";
import type { TimeOfDay, Weather } from "./world-map-sky.js";

const sceneTriangleBudget = 510_000;
const sceneMeshBudget = 88;
const largestTextureSide = 512;
const sceneTextureBytesBudget = 4 * 1024 * 1024;
const bytesPerTexel = 4;
const mipmapShare = 4 / 3;

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

interface MapHandlers {
  islandInViewId?: string;
  yearGroup?: YearGroup;
  limits?: ChildLimits;
  hoveredRegionId?: string;
  timeOfDay?: TimeOfDay;
  weather?: Weather;
  isEffectsOn?: boolean;
  onRegionChosen?: (regionId: string) => void;
  onRegionHovered?: (regionId: string | undefined) => void;
  onIslandChosen?: (islandId: string) => void;
}

const buildMapPlaces = (
  islandInViewId: string,
  yearGroup: YearGroup,
  limits: ChildLimits,
) => {
  const islands = buildIslandsOnMap(yearGroup, limits);
  const regions: RegionOnMap[] = buildRegionsOnMap(islands, limits).filter(
    ({ islandId }) => islandId === islandInViewId,
  );
  return { islands, regions };
};

const renderMap = ({
  islandInViewId = "meadow-isle",
  yearGroup = 1,
  limits = buildChildLimits({}),
  hoveredRegionId,
  timeOfDay,
  weather,
  isEffectsOn,
  onRegionChosen = () => undefined,
  onRegionHovered = () => undefined,
  onIslandChosen = () => undefined,
}: MapHandlers = {}) => {
  const { islands, regions } = buildMapPlaces(
    islandInViewId,
    yearGroup,
    limits,
  );
  return ReactThreeTestRenderer.create(
    <WorldMapScene
      islands={islands}
      islandInViewId={islandInViewId}
      regions={regions}
      selectedRegionId={regions[0].id}
      hoveredRegionId={hoveredRegionId}
      onRegionChosen={onRegionChosen}
      onRegionHovered={onRegionHovered}
      onIslandChosen={onIslandChosen}
      timeOfDay={timeOfDay}
      weather={weather}
      isEffectsOn={isEffectsOn}
    />,
  );
};

const tapAt = { delta: 1, stopPropagation: () => undefined };

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("WorldMapScene", () => {
  it("shows no Pet, Mount or Character, leaving the World Map to the Companion", async () => {
    const renderer = await renderMap();

    for (const name of ["pet", "mount", "character"]) {
      expect(findNamed(renderer, name), name).toEqual([]);
    }
    await renderer.unmount();
  });

  it.each([
    ["meadow-isle", "day", "clear"],
    ["meadow-isle", "night", "storm"],
    ["meadow-isle", "night", "snow"],
    ["frost-isle", "day", "clear"],
    ["sunscorch-sands", "night", "storm"],
    ["starfall-isle", "day", "rain"],
  ] as const)(
    `draws %s in full detail and every other Island as a low-detail shape, by %s in %s weather, within the budget of ${String(sceneTriangleBudget)} triangles and ${String(sceneMeshBudget)} meshes`,
    async (islandInViewId, timeOfDay, weather) => {
      const renderer = await renderMap({
        islandInViewId,
        yearGroup: 2,
        timeOfDay,
        weather,
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

  it("stays within the budget at its busiest: Meadow Isle in a night storm, one Region chosen, another pointed at and a third closed by a Parent", async () => {
    const renderer = await renderMap({
      timeOfDay: "night",
      weather: "storm",
      hoveredRegionId: "cloud-castle",
      limits: buildChildLimits({
        turnedOffRegionKeys: ["meadow-isle/crystal-caves"],
      }),
    });

    const meshes = listMeshes(renderer);
    expect(
      meshes.reduce((total, mesh) => total + countDrawnTriangles(mesh), 0),
    ).toBeLessThanOrEqual(sceneTriangleBudget);
    expect(meshes.length).toBeLessThanOrEqual(sceneMeshBudget);
    expect(findNamed(renderer, "locked-covers")).toHaveLength(1);
    await renderer.unmount();
  });

  it("draws the five Islands out of view together, as one shape each, in each Island's own colours", async () => {
    const renderer = await renderMap({ islandInViewId: "frost-isle" });

    const shapes = listMeshes(renderer).find(
      ({ name }) => name === "distant-islands",
    );
    if (!(shapes instanceof InstancedMesh)) {
      throw new Error("the map drew no distant Islands");
    }
    expect(shapes.count).toBe(5);
    expect(countDrawnTriangles(shapes) / shapes.count).toBeLessThan(200);
    expect(findNamed(renderer, "island-frost-isle")).toHaveLength(1);
    expect(findNamed(renderer, "island-meadow-isle")).toHaveLength(0);
    await renderer.unmount();
  });

  it("draws Meadow Isle as today's land under a sky, with a river, forests, mountains' rocks, villages, a volcano, a lighthouse and a boat", async () => {
    const renderer = await renderMap();

    for (const name of [
      "terrain",
      "terrain-surface",
      "sky",
      "sun",
      "sea",
      "river",
      "bridge",
      "volcano",
      "lighthouse",
      "sailing-boat",
    ]) {
      expect(findNamed(renderer, name), name).toHaveLength(1);
    }
    const countInstances = (name: string) => {
      const [instanced] = findNamed(renderer, name);
      return instanced.instance instanceof InstancedMesh
        ? instanced.instance.count
        : 0;
    };
    expect(countInstances("pine-trees")).toBeGreaterThan(150);
    expect(countInstances("broadleaf-trees")).toBeGreaterThan(100);
    expect(countInstances("rocks")).toBeGreaterThan(20);
    expect(countInstances("cottages")).toBe(49);
    await renderer.unmount();
  });

  it("draws another Island's own landscape in place of Meadow Isle's volcano, river and villages", async () => {
    const renderer = await renderMap({ islandInViewId: "jungle-reach" });

    for (const name of ["terrain", "terrain-surface", "sky", "sun"]) {
      expect(findNamed(renderer, name), name).toHaveLength(1);
    }
    for (const name of ["volcano", "lighthouse", "river", "cottages"]) {
      expect(findNamed(renderer, name), name).toHaveLength(0);
    }
    expect(findNamed(renderer, "region-monkey-falls")).toHaveLength(1);
    await renderer.unmount();
  });

  it("puts every Region of the Island in view on its land, with cloud and a padlock over each one on a locked Island", async () => {
    const unlocked = await renderMap({ islandInViewId: "meadow-isle" });
    for (const region of buildMapPlaces("meadow-isle", 2, buildChildLimits({}))
      .regions) {
      expect(findNamed(unlocked, `region-${region.id}`)).toHaveLength(1);
      expect(findNamed(unlocked, `padlock-${region.id}`)).toHaveLength(0);
    }
    expect(findNamed(unlocked, "selection-marker")).toHaveLength(1);
    await unlocked.unmount();

    const lockedLimits = buildChildLimits({
      lockedIslandIds: ["sunscorch-sands"],
    });
    const locked = await renderMap({
      islandInViewId: "sunscorch-sands",
      yearGroup: 2,
      limits: lockedLimits,
    });
    for (const region of buildMapPlaces("sunscorch-sands", 2, lockedLimits)
      .regions) {
      expect(findNamed(locked, `region-${region.id}`)).toHaveLength(1);
      expect(findNamed(locked, `padlock-${region.id}`)).toHaveLength(1);
    }
    expect(findNamed(locked, "locked-covers")).toHaveLength(1);
    await locked.unmount();
  });

  it("raises a Subject heading over every Region, Checks over the Challenge Arena, but none over the Big Top", async () => {
    const renderer = await renderMap();

    for (const regionId of [
      "crystal-caves",
      "cloud-castle",
      "whispering-woods",
      "bubble-bay",
      "challenge-arena",
    ]) {
      expect(findNamed(renderer, `region-heading-${regionId}`)).toHaveLength(1);
    }
    expect(
      findNamed(renderer, "region-heading-brainwave-big-top"),
    ).toHaveLength(0);
    await renderer.unmount();
  });

  it.each(["meadow-isle", "jungle-reach", "starfall-isle"])(
    "draws the Challenge Arena on %s, with its trophy spinning once it is open",
    async (islandInViewId) => {
      const renderer = await renderMap({ islandInViewId, yearGroup: 6 });

      const [arena] = findNamed(renderer, "region-challenge-arena");
      expect(arena).toBeDefined();
      expect(arena.findAllByType("Mesh").length).toBeGreaterThan(0);
      expect(
        arena.findAll(({ instance }) => instance.name === "arena-trophy"),
      ).toHaveLength(1);
      await renderer.unmount();
    },
  );

  it("draws Meadow Isle's Challenge Arena with no trophy while a Parent has closed it", async () => {
    const renderer = await renderMap({
      limits: buildChildLimits({
        turnedOffRegionKeys: ["meadow-isle/challenge-arena"],
      }),
    });

    expect(findNamed(renderer, "padlock-challenge-arena")).toHaveLength(1);
    expect(findNamed(renderer, "arena-trophy")).toHaveLength(0);
    await renderer.unmount();
  });

  it("chooses a Region when its landmark or the land near it is tapped, but not when the Child was dragging the map", async () => {
    const onRegionChosen = vi.fn();
    const renderer = await renderMap({ onRegionChosen });
    const [crystalCaves] = findNamed(renderer, "region-crystal-caves");
    const [terrain] = findNamed(renderer, "terrain");

    await renderer.fireEvent(crystalCaves, "onClick", { ...tapAt, delta: 40 });
    await renderer.fireEvent(crystalCaves, "onClick", tapAt);
    await renderer.fireEvent(terrain, "onClick", {
      ...tapAt,
      point: new Vector3(-13, 0, 8),
    });

    expect(onRegionChosen.mock.calls).toEqual([
      ["crystal-caves"],
      ["bubble-bay"],
    ]);
    await renderer.unmount();
  });

  it("finds the Region tapped on an Island out in the sea, measuring from that Island's own middle", async () => {
    const onRegionChosen = vi.fn();
    const renderer = await renderMap({
      islandInViewId: "frost-isle",
      onRegionChosen,
    });
    const [terrain] = findNamed(renderer, "terrain");
    const frostIsle = worldMap.islands[1];

    await renderer.fireEvent(terrain, "onClick", {
      ...tapAt,
      point: new Vector3(
        frostIsle.seaPosition.x - 4,
        0,
        frostIsle.seaPosition.z + 10,
      ),
    });

    expect(onRegionChosen.mock.calls).toEqual([["icicle-inlet"]]);
    await renderer.unmount();
  });

  it("flies to an Island out of view when the Child taps its shape", async () => {
    const onIslandChosen = vi.fn();
    const renderer = await renderMap({ onIslandChosen });
    const [distantIslands] = findNamed(renderer, "distant-islands");

    await renderer.fireEvent(distantIslands, "onClick", {
      ...tapAt,
      instanceId: 1,
    });
    await renderer.fireEvent(distantIslands, "onClick", {
      ...tapAt,
      delta: 40,
      instanceId: 2,
    });

    expect(onIslandChosen.mock.calls).toEqual([["sunscorch-sands"]]);
    await renderer.unmount();
  });
});

const listOnMapIslands = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

const renderMapWithProgress = (
  islandInViewId: string,
  foundTreasureIds: readonly string[],
) => {
  const { islands, regions } = buildMapPlaces(
    islandInViewId,
    6,
    buildChildLimits({}),
  );
  return ReactThreeTestRenderer.create(
    <WorldMapScene
      islands={islands}
      islandInViewId={islandInViewId}
      regions={regions}
      selectedRegionId={undefined}
      hoveredRegionId={undefined}
      onRegionChosen={() => undefined}
      onRegionHovered={() => undefined}
      onIslandChosen={() => undefined}
      foundTreasureIds={foundTreasureIds}
    />,
  );
};

describe("everything from explore mode on the World Map", () => {
  it.each(listOnMapIslands)(
    "draws %s's trails, watchtowers, signs, dens, lamps, bounce pads, treasure, race rings, Friends, Wonders, Attractions, Curiosities and Quest in miniature",
    async (islandInViewId) => {
      const renderer = await renderMap({ islandInViewId, yearGroup: 6 });
      const adventure = findExploreAdventure(islandInViewId);

      const [onMap] = findNamed(renderer, "island-adventure-on-map");
      expect(onMap.instance.scale.x).toBeCloseTo(1 / exploreScale);
      [
        "trails",
        "watchtower",
        "fact-sign",
        "hideaway",
        "trail-lamps",
        "bounce-pad",
        "treasure-gems",
        "race-rings",
        `friends-${adventure.friendKind.look}`,
        "wonders",
        "map-attractions",
        "quest-islanders",
        "quest-things",
        "quest-finds",
      ].forEach((name) => {
        expect(findNamed(renderer, name).length, name).toBeGreaterThan(0);
      });
      await renderer.unmount();
    },
  );

  it("draws every Attraction and Curiosity, in far detail and standing still, as one mesh reaching each of them", async () => {
    const adventure = findExploreAdventure("meadow-isle");
    const geometry = buildMapAttractionsGeometry(adventure);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (box === null) {
      throw new Error("the Attractions have no size");
    }

    expect(geometry.groups.length).toBeGreaterThan(1);
    for (const { centre, ground } of placeIslandAttractions(adventure)) {
      expect(box.containsPoint(new Vector3(centre.x, ground, centre.z))).toBe(
        true,
      );
    }
    const renderer = await renderMap({ yearGroup: 6 });
    expect(findNamed(renderer, "map-attractions")).toHaveLength(1);
    expect(findNamed(renderer, "attractions")).toEqual([]);
    await renderer.unmount();
  });

  it("leaves off the treasure the Child has already found, as explore mode does", async () => {
    const adventure = findExploreAdventure("frost-isle");
    const found = adventure.treasures.slice(0, 2).map(({ id }) => id);
    const renderer = await renderMapWithProgress("frost-isle", found);
    await renderer.advanceFrames(1, 1 / 60);

    const [gems] = findNamed(renderer, "treasure-gems");
    const gemMesh: unknown = gems.instance;
    if (!(gemMesh instanceof InstancedMesh)) {
      throw new Error("the map has no treasure mesh");
    }
    expect(gemMesh.count).toBe(adventure.treasures.length - 2);
    await renderer.unmount();
  });

  it("leaves a tap on any of them to fall through to the Region underneath", async () => {
    const renderer = await renderMap({ yearGroup: 6 });

    for (const name of [
      "watchtowers",
      "fact-signs",
      "hideaways",
      `friends-${findExploreAdventure("meadow-isle").friendKind.look}`,
      "quest-islanders",
      "quest-things",
      "quest-finds",
    ]) {
      const [thing] = findNamed(renderer, name);
      expect(thing.props.onClick, name).toBeUndefined();
    }
    await renderer.unmount();
  });
});

describe("the Railway on the World Map", () => {
  it.each([
    "meadow-isle",
    "frost-isle",
    "sunscorch-sands",
    "jungle-reach",
    "ember-isle",
    "starfall-isle",
  ])(
    "draws %s's Train going round its Railway, which is merged into the Dock's mesh",
    async (islandInViewId) => {
      const renderer = await renderMap({ islandInViewId, yearGroup: 6 });
      const railway = findRailway(islandInViewId);
      const findTrainMiddle = () => {
        const [train] = findNamed(renderer, "map-train");
        const mesh: unknown = train.instance;
        if (!isMesh(mesh)) {
          throw new Error("the map has no train mesh");
        }
        const geometry: BufferGeometry = mesh.geometry;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (box === null) {
          throw new Error("the train has no size");
        }
        return box.getCenter(new Vector3());
      };
      await renderer.advanceFrames(2, 1 / 60);
      const first = findTrainMiddle();
      const nearestTrack = Math.min(
        ...railway.points.map((point) =>
          Math.hypot(point.x - first.x, point.z - first.z),
        ),
      );
      expect(nearestTrack).toBeLessThan(10);
      expect(findNamed(renderer, "dock")).toHaveLength(1);

      await renderer.advanceFrames(40, 1);
      const later = findTrainMiddle();
      expect(Math.hypot(later.x - first.x, later.z - first.z)).toBeGreaterThan(
        20,
      );
      await renderer.unmount();
    },
  );
});

describe("WorldMapScene weather and time of day", () => {
  const renderSky = (timeOfDay: TimeOfDay, weather: Weather) =>
    renderMap({ timeOfDay, weather });

  it("pours a waterfall from the Cloud Castle down the mountain", async () => {
    const renderer = await renderSky("day", "clear");

    expect(findNamed(renderer, "waterfall")).toHaveLength(1);
    await renderer.unmount();
  });

  it("shows stars, the moon and lit cottage windows at night, and none of them by day", async () => {
    const night = await renderSky("night", "clear");
    for (const name of ["stars", "moon", "window-lights"]) {
      expect(findNamed(night, name), name).toHaveLength(1);
    }
    await night.unmount();

    const day = await renderSky("day", "clear");
    for (const name of ["stars", "moon", "window-lights"]) {
      expect(findNamed(day, name), name).toHaveLength(0);
    }
    await day.unmount();
  });

  it.each([
    ["rain", "rainfall"],
    ["storm", "rainfall"],
    ["storm", "lightning"],
    ["snow", "snowfall"],
    ["wind", "blowing-leaves"],
  ] as const)("brings %s with its %s", async (weather, name) => {
    const renderer = await renderSky("day", weather);

    expect(findNamed(renderer, name)).toHaveLength(1);
    await renderer.unmount();
  });

  it.each([
    ["rain", "rainfall"],
    ["storm", "rainfall"],
    ["snow", "snowfall"],
    ["wind", "blowing-leaves"],
  ] as const)(
    "still brings %s with its %s, under clouds, at the lowest render quality, so a chosen weather is seen",
    async (weather, name) => {
      const renderer = await renderMap({ weather, isEffectsOn: false });

      expect(findNamed(renderer, name)).toHaveLength(1);
      expect(findNamed(renderer, "clouds")).toHaveLength(1);
      await renderer.unmount();
    },
  );

  it("lets nothing fall from a clear sky", async () => {
    const renderer = await renderSky("day", "clear");

    for (const name of [
      "rainfall",
      "snowfall",
      "blowing-leaves",
      "lightning",
    ]) {
      expect(findNamed(renderer, name), name).toHaveLength(0);
    }
    await renderer.unmount();
  });
});

describe("WorldMapScene hovering", () => {
  it("tells the page which Region the Child is pointing at, over its landmark or the land near it, and when they point away", async () => {
    const onRegionHovered = vi.fn();
    const renderer = await renderMap({ onRegionHovered });
    const [bubbleBay] = findNamed(renderer, "region-bubble-bay");
    const [terrain] = findNamed(renderer, "terrain");

    await renderer.fireEvent(bubbleBay, "onPointerOver", tapAt);
    await renderer.fireEvent(bubbleBay, "onPointerOut", tapAt);
    await renderer.fireEvent(terrain, "onPointerMove", {
      ...tapAt,
      point: new Vector3(14, 0, -9),
    });
    await renderer.fireEvent(terrain, "onPointerMove", {
      ...tapAt,
      point: new Vector3(31, 0, 21),
    });
    await renderer.fireEvent(terrain, "onPointerOut", tapAt);

    expect(onRegionHovered.mock.calls).toEqual([
      ["bubble-bay"],
      [undefined],
      ["cloud-castle"],
      [undefined],
      [undefined],
    ]);
    await renderer.unmount();
  });

  it("lights up the area of the Region being pointed at, and no other", async () => {
    const renderer = await renderMap({ hoveredRegionId: "bubble-bay" });

    expect(findNamed(renderer, "hover-glow-bubble-bay")).toHaveLength(1);
    expect(findNamed(renderer, "hover-glow-cloud-castle")).toHaveLength(0);
    await renderer.unmount();
  });
});

describe("findNearestRegion", () => {
  it("picks the Region closest to where the Child tapped, and none when the tap is far out at sea", () => {
    const { regions } = buildMapPlaces("meadow-isle", 1, buildChildLimits({}));

    expect(findNearestRegion(regions, { x: 14, z: -9 })?.id).toBe(
      "cloud-castle",
    );
    expect(findNearestRegion(regions, { x: -7, z: -2 })?.id).toBe(
      "whispering-woods",
    );
    expect(findNearestRegion(regions, { x: 60, z: 40 })).toBeUndefined();
  });
});

describe("findIslandInView", () => {
  it("picks the Island nearest the middle of the view as the Child pans across the sea", () => {
    const islands = buildIslandsOnMap(1, buildChildLimits({}));

    expect(findIslandInView(islands, { x: 2, z: 3 })?.id).toBe("meadow-isle");
    expect(findIslandInView(islands, { x: 140, z: -4 })?.id).toBe("frost-isle");
    expect(findIslandInView(islands, { x: 10, z: -60 })?.id).toBe(
      "starfall-isle",
    );
  });
});

describe("findIslandOverview", () => {
  const seeFromOverview = (screenShape: number) => {
    const frostIsle = worldMap.islands[1];
    const { x, z } = frostIsle.seaPosition;
    const { target, cameraPosition } = findIslandOverview(
      frostIsle.seaPosition,
      screenShape,
    );
    const camera = new PerspectiveCamera(45, screenShape, 0.1, 2000);
    camera.position.set(...cameraPosition);
    camera.lookAt(...target);
    camera.updateMatrixWorld();
    const isInView = (point: MapPoint) => {
      const seen = new Vector3(x + point.x, 0, z + point.z).project(camera);
      return Math.abs(seen.x) <= 1 && Math.abs(seen.y) <= 1 && seen.z < 1;
    };
    return { target, x, z, isInView };
  };

  it("looks down on the middle of the Island", () => {
    const { target, x, z } = seeFromOverview(16 / 9);

    expect(target).toEqual([x, 0, z]);
  });

  it.each([
    ["a wide screen", 21 / 9],
    ["a laptop", 16 / 9],
    ["a tablet", 4 / 3],
    ["a phone held upright", 9 / 19.5],
  ])(
    "on %s, shows the whole centre land but not the new lands east and west",
    (_screen, screenShape) => {
      const { isInView } = seeFromOverview(screenShape);
      const coastBeyondRegions = 2;
      const centreLandEdges: MapPoint[] = [
        { x: -mapHalfWidth - coastBeyondRegions, z: 0 },
        { x: mapHalfWidth + coastBeyondRegions, z: 0 },
        { x: 0, z: -mapHalfDepth - coastBeyondRegions },
        { x: 0, z: mapHalfDepth + coastBeyondRegions },
      ];
      const newLandMiddles: MapPoint[] = [
        { x: 52, z: 0 },
        { x: -52, z: 0 },
      ];

      expect(centreLandEdges.filter(isInView)).toEqual(centreLandEdges);
      expect(newLandMiddles.filter(isInView)).toEqual([]);
    },
  );
});

const isTexture = (value: unknown): value is Texture =>
  value instanceof Texture;

const listMaterialTextures = (material: object): Texture[] => {
  const materialValues: unknown[] = Object.values(material);
  const uniformValues: unknown[] =
    "uniforms" in material &&
    typeof material.uniforms === "object" &&
    material.uniforms !== null
      ? Object.values(material.uniforms).map((uniform: unknown) =>
          typeof uniform === "object" && uniform !== null && "value" in uniform
            ? uniform.value
            : undefined,
        )
      : [];
  return [...materialValues, ...uniformValues].filter(isTexture);
};

const listSceneTextures = (root: Object3D): Texture[] => {
  const textures = new Set<Texture>();
  root.traverse((object) => {
    const material: unknown = "material" in object ? object.material : [];
    const materials: unknown[] = Array.isArray(material)
      ? material
      : [material];
    for (const each of materials) {
      if (typeof each === "object" && each !== null) {
        for (const texture of listMaterialTextures(each)) {
          textures.add(texture);
        }
      }
    }
  });
  return [...textures];
};

const findTextureSize = (texture: Texture) => {
  const image: unknown = texture.image;
  if (
    typeof image !== "object" ||
    image === null ||
    !("width" in image) ||
    !("height" in image) ||
    typeof image.width !== "number" ||
    typeof image.height !== "number"
  ) {
    throw new Error("a texture on the map has no size");
  }
  return { width: image.width, height: image.height };
};

const countTextureBytes = (texture: Texture): number => {
  const { width, height } = findTextureSize(texture);
  return (
    width * height * bytesPerTexel * (texture.generateMipmaps ? mipmapShare : 1)
  );
};

// happy-dom draws no canvas and loads no fonts, so the Region headings
// would make no textures; a context that draws nothing and fonts that are
// already loaded let them make their real-sized ones.
const drawNothing = new Proxy(
  {},
  { get: () => () => ({ width: 0 }), set: () => true },
);

const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  "getContext",
);

const letCanvasesDraw = () => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    writable: true,
    value: () => drawNothing,
  });
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { load: () => Promise.resolve([]) },
  });
};

const stopCanvasesDrawing = () => {
  if (originalGetContext !== undefined) {
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      "getContext",
      originalGetContext,
    );
  }
  Reflect.deleteProperty(document, "fonts");
};

describe("WorldMapScene textures", () => {
  it.each(worldMap.islands.map(({ id }) => id))(
    `keeps every texture with %s in view within ${String(largestTextureSide)} pixels a side and ${String(sceneTextureBytesBudget / 1024 / 1024)} MB in all, Region headings included`,
    async (islandInViewId) => {
      letCanvasesDraw();
      const renderer = await renderMap({
        islandInViewId,
        yearGroup: 6,
        timeOfDay: "night",
        weather: "storm",
      });

      const textures = listSceneTextures(renderer.scene.instance);
      const headingCount = buildMapPlaces(
        islandInViewId,
        6,
        buildChildLimits({}),
      ).regions.filter(
        (region) => findRegionHeading(region) !== undefined,
      ).length;

      expect(textures.length).toBeGreaterThan(headingCount);
      for (const texture of textures) {
        const { width, height } = findTextureSize(texture);
        expect(Math.max(width, height)).toBeLessThanOrEqual(largestTextureSide);
      }
      expect(
        textures.reduce(
          (total, texture) => total + countTextureBytes(texture),
          0,
        ),
      ).toBeLessThanOrEqual(sceneTextureBytesBudget);
      await renderer.unmount();
      stopCanvasesDrawing();
    },
  );
});

describe("findSeaLevelPoint", () => {
  it("finds the point on the sea under a spot on the screen, for dropping the walker", () => {
    const camera = new PerspectiveCamera(45, 1, 0.5, 900);
    camera.position.set(10, 50, 20);
    camera.lookAt(10, 0, 20);
    camera.updateMatrixWorld();

    const middle = findSeaLevelPoint(camera, { x: 0, y: 0 });
    expect(middle?.x).toBeCloseTo(10, 1);
    expect(middle?.z).toBeCloseTo(20, 1);
    const right = findSeaLevelPoint(camera, { x: 0.5, y: 0 });
    expect(right?.x).toBeGreaterThan(10);
  });

  it("finds nothing when the spot on the screen is above the horizon", () => {
    const camera = new PerspectiveCamera(45, 1, 0.5, 900);
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 10, -10);
    camera.updateMatrixWorld();

    expect(findSeaLevelPoint(camera, { x: 0, y: 0.5 })).toBeUndefined();
  });
});

describe("MapCameraRig", () => {
  const CameraSpy = ({
    start,
    onCamera,
  }: {
    start: Vector3;
    onCamera: (camera: Vector3) => void;
  }) => {
    const camera = useThree((state) => state.camera);
    useState(() => camera.position.copy(start));
    onCamera(camera.position);
    return null;
  };

  const renderRig = async () => {
    const islands = buildIslandsOnMap(1, buildChildLimits({}));
    const overview = findIslandOverview(islands[0].seaPosition);
    let cameraPosition = new Vector3();
    const draw = (command: CameraCommand) => (
      <>
        <CameraSpy
          start={new Vector3(...overview.cameraPosition)}
          onCamera={(position) => {
            cameraPosition = position;
          }}
        />
        <MapCameraRig
          islands={[...islands]}
          islandInView={islands[0]}
          focus={undefined}
          cameraCommand={command}
          onIslandInView={() => undefined}
        />
      </>
    );
    const renderer = await ReactThreeTestRenderer.create(
      draw({ kind: "none" }),
    );
    const settle = () => renderer.advanceFrames(240, 1 / 30);
    return {
      renderer,
      draw,
      settle,
      readDistance: () =>
        cameraPosition.distanceTo(new Vector3(...overview.target)),
    };
  };

  it.each(["zoom-in", "zoom-out"] as const)(
    "carries out a %s once, and not again when the map is drawn again, as it is when a Region is pointed at",
    async (kind) => {
      const { renderer, draw, settle, readDistance } = await renderRig();
      await settle();
      const before = readDistance();
      await renderer.update(draw({ kind, sequence: 1 }));
      await settle();
      const zoomed = readDistance();

      for (let redraw = 0; redraw < 3; redraw++) {
        await renderer.update(draw({ kind, sequence: 1 }));
        await settle();
      }

      expect(zoomed).not.toBeCloseTo(before, 1);
      expect(readDistance()).toBeCloseTo(zoomed, 1);
      await renderer.update(draw({ kind, sequence: 2 }));
      await settle();
      expect(readDistance()).not.toBeCloseTo(zoomed, 1);
      await renderer.unmount();
    },
  );
});
