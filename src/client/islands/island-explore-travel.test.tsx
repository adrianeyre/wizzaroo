// Getting about in explore mode: walking, the voyages and flights across the World Map, hideaways, trains and Vehicles.
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { InstancedMesh, PointLight, Scene, type Mesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildRegionsOnMap } from "../../curriculum/island-access.js";
import {
  buildAdventureWorld,
  buildTrailBridges,
  exploreScale,
  findExploreAdventure,
  findWalkSurface,
} from "./island-adventures.js";
import { lighthousePosition } from "../world-map-terrain.js";
import { IslandExploreScene, listTrailLampPlaces } from "./island-explore.js";
import { VoyageCrossingScene } from "./island-voyage-scene.js";
import { findCave } from "./island-wonders.js";
import { findRailway, findStationPlatformSpot } from "./island-railway.js";
import {
  findCarriedSpot,
  findPierWaitingSpot,
  placeOnMap,
  type VoyagePhase,
} from "./island-voyage.js";
import { placeCraftOnMap, type Transport } from "./island-journey.js";
import type {
  IslandExploreSceneProps,
  TrainReport,
  VoyageView,
} from "./island-explore-hud.js";
import {
  countDrawnTriangles,
  everyIslandOpen,
  findExplorer,
  findIslandOnMap,
  findNamed,
  frameSeconds,
  islandsOnMap,
  isMesh,
  listMeshes,
  renderExplore,
} from "./island-explore-scene.test-support.js";

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("IslandExploreScene", () => {
  it("carries the Character on board, then sets them down on the pier when the ship has landed them", async () => {
    const adventure = findExploreAdventure("frost-isle");
    const island = findIslandOnMap("frost-isle");
    const voyage = (phase: VoyagePhase): VoyageView => ({
      phase,
      transport: "ship",
      fromIsland: island,
      toIsland: island,
      islands: islandsOnMap,
      regions: [],
    });
    const { renderer, sceneProps } = await renderExplore("frost-isle", {
      voyage: voyage("docking"),
    });
    await renderer.advanceFrames(400, frameSeconds);
    const onBoard = findCarriedSpot(adventure, "docking", 1);
    expect(findExplorer(renderer).position.x).toBeCloseTo(onBoard.x);
    expect(findExplorer(renderer).position.y).toBeCloseTo(onBoard.y);

    await renderer.update(
      <IslandExploreScene
        sceneProps={{ ...sceneProps, voyage: voyage("leaving") }}
        isEffectsOn
        timeOfDay="day"
        weather="clear"
      />,
    );
    await renderer.advanceFrames(3, frameSeconds);

    const waiting = findPierWaitingSpot(adventure.dock);
    expect(findExplorer(renderer).position.x).toBeCloseTo(waiting.x, 0);
    expect(findExplorer(renderer).position.z).toBeCloseTo(waiting.z, 0);
    expect(findNamed(renderer, "voyage-ship")).toHaveLength(1);
  });

  it("walks the Character to a friend the Child clicks, and says hello on arrival", async () => {
    const [friend] = findExploreAdventure("sunscorch-sands").friends;
    const { renderer, record } = await renderExplore("sunscorch-sands", {
      start: { x: friend.position.x + 3, z: friend.position.z },
    });
    const [friends] = findNamed(renderer, "friends-camel");

    await renderer.fireEvent(friends, "click", {
      delta: 0,
      instanceId: 0,
      stopPropagation: () => undefined,
    });
    await renderer.advanceFrames(120, frameSeconds);

    expect(record.reached.map(({ kind, id }) => `${kind}:${id}`)).toContain(
      `friend:${friend.id}`,
    );
  });

  it("walks the Character forward while the stick is pushed, and reports what is nearby", async () => {
    const [sign] = findExploreAdventure("meadow-isle").signs;
    const { renderer, input, record } = await renderExplore("meadow-isle", {
      start: { x: sign.position.x + 1, z: sign.position.z },
    });
    await renderer.advanceFrames(2, frameSeconds);
    const before = findExplorer(renderer).position.clone();

    input.current.forward = 1;
    await renderer.advanceFrames(60, frameSeconds);

    expect(findExplorer(renderer).position.distanceTo(before)).toBeGreaterThan(
      1.5,
    );
    expect(record.nearby.length).toBeGreaterThan(0);
  });

  it("finds a treasure the Character stands on, once", async () => {
    const [treasure] = findExploreAdventure("starfall-isle").treasures;
    const { renderer, record } = await renderExplore("starfall-isle", {
      start: treasure.position,
    });

    await renderer.advanceFrames(3, frameSeconds);

    expect(record.foundTreasureIds).toContain(treasure.id);
  });

  it("stops drawing a treasure once it is found", async () => {
    const adventure = findExploreAdventure("frost-isle");
    const { renderer } = await renderExplore("frost-isle", {
      foundTreasureIds: adventure.treasures.slice(0, 3).map(({ id }) => id),
    });
    await renderer.advanceFrames(2, frameSeconds);

    const [gems] = findNamed(renderer, "treasure-gems");
    expect(gems.instance).toBeInstanceOf(InstancedMesh);
    expect(gems.instance instanceof InstancedMesh && gems.instance.count).toBe(
      adventure.treasures.length - 3,
    );
  });

  it("tells the HUD the Character is swimming in the sea", async () => {
    const { renderer, record } = await renderExplore("meadow-isle", {
      start: { x: 0, z: 19 * exploreScale },
    });
    await renderer.advanceFrames(3, frameSeconds);

    expect(record.statuses).toContain("swimming");
  });

  it("hides the Character's body in first person and at the top of a lookout", async () => {
    const firstPerson = await renderExplore("meadow-isle", {
      cameraView: "first-person",
    });
    await firstPerson.renderer.advanceFrames(2, frameSeconds);
    expect(findExplorer(firstPerson.renderer).visible).toBe(false);

    const climbed = await renderExplore("meadow-isle", {
      climbedLookoutId: "lighthouse",
    });
    await climbed.renderer.advanceFrames(2, frameSeconds);
    expect(findExplorer(climbed.renderer).visible).toBe(false);

    const behind = await renderExplore("meadow-isle");
    await behind.renderer.advanceFrames(2, frameSeconds);
    expect(findExplorer(behind.renderer).visible).toBe(true);
  });

  it("lights the lantern in the Character's hand inside Ember Isle's cave, and keeps it hidden outside", async () => {
    const cave = findCave(findExploreAdventure("ember-isle"));
    if (cave === undefined) {
      throw new Error("No cave on Ember Isle");
    }
    const inside = await renderExplore("ember-isle", { start: cave.centre });
    await inside.renderer.advanceFrames(2, frameSeconds);
    const [lantern] = findNamed(inside.renderer, "lantern");
    expect(lantern.instance.visible).toBe(true);
    const lanternLights = inside.renderer.scene
      .findAllByType("PointLight")
      .map(({ instance }) => instance)
      .filter((light) => light instanceof PointLight);
    expect(lanternLights.some(({ intensity }) => intensity > 1)).toBe(true);

    const outside = await renderExplore("ember-isle");
    await outside.renderer.advanceFrames(2, frameSeconds);
    const [unlit] = findNamed(outside.renderer, "lantern");
    expect(unlit.instance.visible).toBe(false);
  });

  it("draws the waterfall Jungle Reach's Character can walk behind", async () => {
    const { renderer } = await renderExplore("jungle-reach");
    expect(findNamed(renderer, "walk-behind-falls")).toHaveLength(1);
    expect(findNamed(renderer, "falls-pool")).toHaveLength(1);
  });

  it("draws the bridges built over Ember Isle's lava, and on Meadow Isle only those out to its far reaches", async () => {
    const ember = await renderExplore("ember-isle");
    expect(findNamed(ember.renderer, "trail-bridges")).toHaveLength(1);
    const meadow = await renderExplore("meadow-isle");
    expect(findNamed(meadow.renderer, "trail-bridges")).toHaveLength(1);
    const meadowBridges = buildTrailBridges(
      findExploreAdventure("meadow-isle"),
    );
    expect(meadowBridges.length).toBeGreaterThan(0);
    meadowBridges.forEach(({ from, to }) => {
      expect(Math.min(Math.abs(from.x), Math.abs(to.x))).toBeGreaterThan(
        70 * exploreScale,
      );
    });
  });

  it("walks, or swims, out to the lighthouse when the Child clicks it, and climbs it on arrival", async () => {
    const { renderer, record } = await renderExplore("meadow-isle", {
      start: {
        x: lighthousePosition.x * exploreScale - 8.8,
        z: lighthousePosition.z * exploreScale - 3.2,
      },
    });
    const [lighthouse] = findNamed(renderer, "lookout-lighthouse");

    await renderer.fireEvent(lighthouse, "click", {
      delta: 0,
      stopPropagation: () => undefined,
    });
    await renderer.advanceFrames(240, frameSeconds);

    expect(record.reached.map(({ kind, id }) => `${kind}:${id}`)).toContain(
      "lookout:lighthouse",
    );
  });
});

describe("VoyageCrossingScene", () => {
  const worldMapMeshBudget = 88;
  const worldMapTriangleBudget = 510_000;

  it.each([
    ["meadow-isle", "sunscorch-sands"],
    ["starfall-isle", "frost-isle"],
  ])(
    "sails the ship across the World Map from %s to %s within the World Map's budget",
    async (fromId, toId) => {
      const renderer = await ReactThreeTestRenderer.create(
        <VoyageCrossingScene
          fromIsland={findIslandOnMap(fromId)}
          toIsland={findIslandOnMap(toId)}
          transport="ship"
          islands={islandsOnMap}
          regions={buildRegionsOnMap(islandsOnMap, everyIslandOpen)}
          isEffectsOn
          timeOfDay="day"
          weather="clear"
        />,
      );
      await renderer.advanceFrames(2, frameSeconds);

      const meshes = listMeshes(renderer);
      expect(findNamed(renderer, "map-ship")).toHaveLength(1);
      expect(meshes.length).toBeLessThanOrEqual(worldMapMeshBudget);
      expect(
        meshes.reduce((total, mesh) => total + countDrawnTriangles(mesh), 0),
      ).toBeLessThanOrEqual(worldMapTriangleBudget);

      await renderer.advanceFrames(15 * 60, frameSeconds);
      const [ship] = findNamed(renderer, "map-ship");
      const destination = placeOnMap(
        { islandId: toId, seaPosition: findIslandOnMap(toId).seaPosition },
        "docking",
        0,
      );
      expect(
        Math.hypot(
          ship.instance.position.x - destination.x,
          ship.instance.position.z - destination.z,
        ),
      ).toBeLessThan(0.5);
    },
  );
});

describe.each([
  "aeroplane",
  "helicopter",
  "balloon",
  "dragon",
  "blimp",
] as const satisfies Transport[])("VoyageCrossingScene by %s", (transport) => {
  it("flies across the World Map within its budget and arrives where it comes in to land", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <VoyageCrossingScene
        fromIsland={findIslandOnMap("meadow-isle")}
        toIsland={findIslandOnMap("jungle-reach")}
        transport={transport}
        islands={islandsOnMap}
        regions={buildRegionsOnMap(islandsOnMap, everyIslandOpen)}
        isEffectsOn
        timeOfDay="day"
        weather="clear"
      />,
    );
    await renderer.advanceFrames(2, frameSeconds);

    expect(findNamed(renderer, `map-${transport}`)).toHaveLength(1);
    expect(listMeshes(renderer).length).toBeLessThanOrEqual(88);

    await renderer.advanceFrames(10 * 60, frameSeconds);
    const [craft] = findNamed(renderer, `map-${transport}`);
    const destination = placeCraftOnMap(
      {
        islandId: "jungle-reach",
        seaPosition: findIslandOnMap("jungle-reach").seaPosition,
      },
      transport,
      "docking",
      0,
    );
    expect(
      Math.hypot(
        craft.instance.position.x - destination.x,
        craft.instance.position.y - destination.y,
        craft.instance.position.z - destination.z,
      ),
    ).toBeLessThan(0.5);
  });
});

const listDrawnMeshes = (
  renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>,
): Mesh[] => {
  const drawn: Mesh[] = [];
  renderer.scene.instance.traverseVisible((part) => {
    if (isMesh(part)) {
      drawn.push(part);
    }
  });
  return drawn;
};

describe("riding in view across the World Map", () => {
  it.each(["dragon", "surfboard", "windsurfer"] as const)(
    "draws the Character riding the %s, merged into a few meshes",
    async (transport) => {
      const renderer = await ReactThreeTestRenderer.create(
        <VoyageCrossingScene
          fromIsland={findIslandOnMap("meadow-isle")}
          toIsland={findIslandOnMap("frost-isle")}
          transport={transport}
          islands={islandsOnMap}
          regions={buildRegionsOnMap(islandsOnMap, everyIslandOpen)}
          isEffectsOn
          timeOfDay="day"
          weather="clear"
        />,
      );
      // The rider's stance is set from inside a frame, so the frames are
      // advanced inside act for React to draw the posed rider.
      await ReactThreeTestRenderer.act(async () => {
        await renderer.advanceFrames(6, frameSeconds);
      });

      const [rider] = findNamed(renderer, "craft-rider");
      expect(rider.instance.visible).toBe(true);
      const drawn = listDrawnMeshes(renderer);
      const figure = drawn.filter(({ name }) => name === "craft-rider-figure");
      expect(figure.length).toBeGreaterThan(0);
      expect(figure.length).toBeLessThanOrEqual(16);
      expect(drawn.length).toBeLessThanOrEqual(88);
    },
  );
});

describe("scuba diving between Islands", () => {
  it("swaps the World Map for the sea bed, the Character swimming under the water", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <VoyageCrossingScene
        fromIsland={findIslandOnMap("meadow-isle")}
        toIsland={findIslandOnMap("frost-isle")}
        transport="scuba"
        islands={islandsOnMap}
        regions={buildRegionsOnMap(islandsOnMap, everyIslandOpen)}
        isEffectsOn
        timeOfDay="day"
        weather="clear"
      />,
    );
    await renderer.advanceFrames(3, frameSeconds);

    expect(findNamed(renderer, "underwater-diver")).toHaveLength(1);
    expect(findNamed(renderer, "map-scuba")).toHaveLength(0);
    const scene = renderer.scene.instance;
    expect(scene instanceof Scene && scene.fog !== null).toBe(true);
  });
});

describe("Island hideaways and trail lamps", () => {
  it.each(islandsOnMap.map(({ id }) => [id]))(
    "lights the trails of %s with lamps standing on dry ground",
    (islandId) => {
      const world = buildAdventureWorld(findExploreAdventure(islandId));
      const lamps = listTrailLampPlaces(world);
      expect(lamps.length).toBeGreaterThan(10);
      lamps.forEach((lamp) => {
        expect(findWalkSurface(world, lamp, Infinity).kind).toBe("ground");
      });
    },
  );

  it("walks the Character to a hideaway when the Child clicks one", async () => {
    const [hideaway] = findExploreAdventure("meadow-isle").hideaways;
    const { renderer, record } = await renderExplore("meadow-isle", {
      start: { x: hideaway.position.x + 3, z: hideaway.position.z },
    });
    const [dens] = findNamed(renderer, "hideaways");

    await renderer.fireEvent(dens, "click", {
      delta: 0,
      instanceId: 0,
      stopPropagation: () => undefined,
    });
    await renderer.advanceFrames(120, frameSeconds);

    expect(record.reached.map(({ kind, id }) => `${kind}:${id}`)).toContain(
      `hideaway:${hideaway.id}`,
    );
  });

  it("lets the Character get on the train at a Station, ride it and get off at the next", async () => {
    const railway = findRailway("meadow-isle");
    const station = railway.stations[1];
    const platform = findStationPlatformSpot(railway, station);
    const reports: TrainReport[] = [];
    const { renderer, sceneProps } = await renderExplore("meadow-isle", {
      start: platform,
    });
    const withRide = (ride: IslandExploreSceneProps["ride"]) => (
      <IslandExploreScene
        sceneProps={{
          ...sceneProps,
          ride,
          onTrainChanged: (report) => {
            reports.push(report);
          },
        }}
        isEffectsOn
        timeOfDay="day"
        weather="clear"
      />
    );
    await renderer.update(withRide(undefined));
    for (let second = 0; second < 90; second++) {
      await renderer.advanceFrames(1, 1);
      const last = reports.at(-1);
      if (last?.kind === "at-station" && last.isTrainWaiting) {
        break;
      }
    }
    expect(reports.at(-1)).toMatchObject({
      kind: "at-station",
      stationIndex: 1,
      isTrainWaiting: true,
    });

    await renderer.update(withRide("train"));
    await renderer.advanceFrames(2, frameSeconds);
    expect(reports.at(-1)?.kind).toBe("riding");
    expect(findExplorer(renderer).visible).toBe(false);

    for (let second = 0; second < 200; second++) {
      await renderer.advanceFrames(1, 1);
      const last = reports.at(-1);
      if (last?.kind === "riding" && last.waitingAtStationIndex === 2) {
        break;
      }
    }
    expect(reports.at(-1)).toMatchObject({
      kind: "riding",
      waitingAtStationIndex: 2,
    });

    await renderer.update(withRide(undefined));
    await renderer.advanceFrames(2, frameSeconds);
    const next = findStationPlatformSpot(railway, railway.stations[2]);
    expect(findExplorer(renderer).visible).toBe(true);
    expect(findExplorer(renderer).position.x).toBeCloseTo(next.x, 0);
    expect(findExplorer(renderer).position.z).toBeCloseTo(next.z, 0);
  });

  it("puts a Vehicle on the map beside the Character, drives it and parks it", async () => {
    const trail = findExploreAdventure("meadow-isle")
      .trails.flatMap((points) =>
        points.slice(1).map((to, index) => ({ from: points[index], to })),
      )
      .toSorted(
        (first, second) =>
          Math.hypot(second.to.x - second.from.x, second.to.z - second.from.z) -
          Math.hypot(first.to.x - first.from.x, first.to.z - first.from.z),
      )[0];
    const nearVehicle: boolean[] = [];
    const { renderer, sceneProps, input } = await renderExplore("meadow-isle", {
      start: trail.from,
    });
    const vehicle = {
      itemId: "vehicle-sports-car",
      name: "Sports Car",
      look: { model: "sports-car" as const, colour: "#d50000" },
      placedCount: 1,
    };
    const withVehicle = (ride: IslandExploreSceneProps["ride"]) => (
      <IslandExploreScene
        sceneProps={{
          ...sceneProps,
          vehicle,
          ride,
          onNearVehicleChanged: (isNear) => {
            nearVehicle.push(isNear);
          },
        }}
        isEffectsOn
        timeOfDay="day"
        weather="clear"
      />
    );
    await renderer.update(withVehicle(undefined));
    await renderer.advanceFrames(3, frameSeconds);
    expect(findNamed(renderer, "placed-vehicle")[0].instance.visible).toBe(
      true,
    );
    expect(nearVehicle.at(-1)).toBe(true);

    await renderer.update(withVehicle("vehicle"));
    await renderer.advanceFrames(2, frameSeconds);
    const parked = findNamed(
      renderer,
      "placed-vehicle",
    )[0].instance.position.clone();
    input.current.forward = 1;
    await renderer.advanceFrames(60, frameSeconds);
    input.current.forward = 0;
    const driven = findNamed(renderer, "placed-vehicle")[0].instance.position;
    expect(
      Math.hypot(driven.x - parked.x, driven.z - parked.z),
    ).toBeGreaterThan(3);
    const explorer = findExplorer(renderer).position;
    expect(
      Math.hypot(explorer.x - driven.x, explorer.z - driven.z),
    ).toBeLessThan(1);

    await renderer.update(withVehicle(undefined));
    await renderer.advanceFrames(2, frameSeconds);
    const stillParked = findNamed(renderer, "placed-vehicle")[0].instance
      .position;
    expect(stillParked.x).toBeCloseTo(driven.x, 1);
    expect(nearVehicle.at(-1)).toBe(true);
  });
});
