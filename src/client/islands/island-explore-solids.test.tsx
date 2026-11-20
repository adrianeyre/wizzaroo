import ReactThreeTestRenderer from "@react-three/test-renderer";
import { InstancedMesh, Matrix4, Mesh, Vector3, type Object3D } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildChildLimits,
  buildIslandsOnMap,
  buildRegionsOnMap,
} from "../../curriculum/island-access.js";
import { attractionFinishes } from "./attractions/attraction-kit.js";
import { findExploreAdventure, findWalkSurface } from "./island-adventures.js";
import { listPlacedAttractions } from "./island-attractions.js";
import { findObstacleField, IslandExploreScene } from "./island-explore.js";
import type { IslandExploreSceneProps } from "./island-explore-hud.js";
import {
  obstacleBodyHeight,
  obstacleBodyRadius,
  obstacleStepHeight,
} from "./island-obstacles.js";
import { findIslandDesign } from "./island-scene.js";
import {
  isSolidMovingPart,
  listAttractionClearSpots,
} from "./island-solids.js";
import { buildExploreWorld } from "./island-transport.js";
import { listWonderBlockers } from "./island-wonders.js";
import { listAttractionBlockers } from "./island-attractions.js";
import { listQuestBlockers } from "./island-quest.js";
import {
  listExploreBlockers,
  scalePlaceForExplore,
} from "./island-adventures.js";

/**
 * Draws each Island's explore scene and goes over every part of every
 * model in it at the height of the Character's body, checking that it
 * is solid (ADR 0061). Only what is meant to be passed through is left
 * out, so a model added to explore mode without being made solid fails
 * here.
 */

const everyIslandOpen = buildChildLimits({
  unlockedIslandIds: [
    "frost-isle",
    "sunscorch-sands",
    "jungle-reach",
    "ember-isle",
    "starfall-isle",
  ],
});
const islandsOnMap = buildIslandsOnMap(6, everyIslandOpen);

/** What the Character is meant to pass through, by the name of what draws it. */
const passable = [
  // The Island itself and its sky, sea, water, ice and lava.
  "terrain",
  "sea",
  "sky",
  "cloud",
  "precipitation",
  "trails",
  "falls",
  "walk-behind-falls",
  "waterfall",
  "river",
  "new-land-rivers",
  "pool",
  // Picked up, bounced on, flown through, followed or ridden.
  "explorer",
  "treasures",
  "treasure-gems",
  "bounce-pad",
  "race-rings",
  "walk-target",
  "quest-finds",
  "railway-track",
  "train",
  "sailing-boat",
  // Smoke and flowers.
  "smoke",
  "volcano",
  "wonder-flowers",
];

/** Moving things on Attractions that don't stay put to bump into. */
const listPassableAttractionParts = (islandId: string): Set<string> =>
  new Set(
    listPlacedAttractions(islandId).flatMap(({ kind, model }) => [
      ...(model.wanderers ?? []).map(
        ({ name }) => `attraction-${kind}-${name}`,
      ),
      ...(model.moving ?? [])
        .filter((part) => !isSolidMovingPart(part))
        .map(({ name }) => `attraction-${kind}-${name}`),
    ]),
  );

const waterFinish = attractionFinishes.indexOf("water");
/**
 * How near the middle of the Character's body may come to a model: a
 * little inside its reach, so a gap the body can't fit through counts
 * as solid but the body can't stand in any part of a model.
 */
const standingRadius = obstacleBodyRadius - 0.04;
/** How much of a model may be left open where cells meet its edge. */
const allowedHoleShare = 0.03;
const allowedHoles = 5;
const sampleSpacing = 0.3;
/** How far the ground can rise or fall under one triangle, for skipping those well clear of a body. */
const nearbyRise = 2;

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

const isMesh = (value: Object3D): value is Mesh => value instanceof Mesh;

const pathOf = (object: Object3D): string[] => {
  const names: string[] = [];
  for (let at: Object3D | null = object; at !== null; at = at.parent) {
    if (at.name !== "") {
      names.unshift(at.name);
    }
  }
  return names;
};

const renderScene = async (islandId: string) => {
  const adventure = findExploreAdventure(islandId);
  const island = islandsOnMap.find(({ id }) => id === islandId);
  if (island === undefined) {
    throw new Error(`No Island ${islandId}`);
  }
  const regions = buildRegionsOnMap(islandsOnMap, everyIslandOpen).filter(
    (region) => region.islandId === islandId,
  );
  const sceneProps: IslandExploreSceneProps = {
    island,
    regions,
    loadout: {},
    start: adventure.start,
    startHeading: adventure.startHeading,
    inputRef: { current: { right: 0, forward: 0, wantsJump: false } },
    voyage: undefined,
    foundTreasureIds: [],
    climbedLookoutId: undefined,
    cameraView: "behind",
    hoveredRegionId: undefined,
    onRegionHovered: () => undefined,
    onNearbyChanged: () => undefined,
    onTreasureFound: () => undefined,
    onRaceProgress: () => undefined,
    onStatusChanged: () => undefined,
    onInteractionReached: () => undefined,
    onQuestFindReached: () => undefined,
  };
  const renderer = await ReactThreeTestRenderer.create(
    <IslandExploreScene
      sceneProps={sceneProps}
      isEffectsOn={false}
      timeOfDay="day"
      weather="clear"
    />,
  );
  await renderer.advanceFrames(1, 1 / 60);
  return { renderer, adventure, places: regions.map(scalePlaceForExplore) };
};

describe.each(islandsOnMap.map(({ id }) => [id] as const))(
  "explore mode on %s",
  (islandId) => {
    it("makes every model drawn at the Character's height solid", async () => {
      const { renderer, adventure, places } = await renderScene(islandId);
      const world = buildExploreWorld(adventure);
      const field = findObstacleField(world);
      field.prepareAll();
      const blockers = [
        ...listExploreBlockers(adventure, places),
        ...listWonderBlockers(adventure),
        ...listAttractionBlockers(adventure),
        ...listQuestBlockers(islandId),
      ];
      const clearSpots = listAttractionClearSpots(
        listPlacedAttractions(islandId),
      );
      const landform =
        islandId === "meadow-isle"
          ? undefined
          : findIslandDesign(islandId).landform;
      const surfaces = new Set([
        ...passable,
        ...listPassableAttractionParts(islandId),
        ...(landform?.waterCourses ?? []).map(({ name }) => name),
        ...(landform?.pools ?? []).map(({ name }) => name),
      ]);
      const isPassable = (names: string[]) =>
        // A model's far copy is the same shape as its near one, drawn further away.
        names.some((name) => name.endsWith("-far")) ||
        names.some(
          (name) =>
            surfaces.has(name) ||
            passable.some((part) => name.startsWith(`${part}-`)),
        );
      const isSolidAt = (x: number, z: number, ground: number) =>
        field.obstacles.isBlocked({ x, z }, ground, standingRadius) ||
        blockers.some(
          ({ centre, radius }) =>
            Math.hypot(centre.x - x, centre.z - z) <= radius,
        ) ||
        clearSpots.some(
          ({ centre, radius }) =>
            Math.hypot(centre.x - x, centre.z - z) <= radius + 0.3,
        );

      const root = renderer.scene.instance;
      root.updateMatrixWorld(true);
      const meshes: Mesh[] = [];
      root.traverse((object) => {
        if (isMesh(object) && object.visible) {
          meshes.push(object);
        }
      });
      const hollow: string[] = [];
      const corner = new Vector3();
      const matrix = new Matrix4();
      const instanceMatrix = new Matrix4();
      for (const mesh of meshes) {
        const names = pathOf(mesh);
        if (isPassable(names)) {
          continue;
        }
        const geometry =
          mesh.geometry.index === null
            ? mesh.geometry
            : mesh.geometry.toNonIndexed();
        const position = geometry.getAttribute("position");
        const isAttraction = names.some((name) =>
          name.startsWith("attraction-"),
        );
        const ranges =
          isAttraction && geometry.groups.length > 0
            ? geometry.groups.filter(
                ({ materialIndex }) => materialIndex !== waterFinish,
              )
            : [{ start: 0, count: position.count }];
        const count = mesh instanceof InstancedMesh ? mesh.count : 1;
        for (let instance = 0; instance < count; instance++) {
          matrix.copy(mesh.matrixWorld);
          if (mesh instanceof InstancedMesh) {
            mesh.getMatrixAt(instance, instanceMatrix);
            matrix.multiply(instanceMatrix);
          }
          let bodyLevel = 0;
          let holes = 0;
          let firstHole = "";
          for (const { start, count: corners } of ranges) {
            for (let first = start; first < start + corners; first += 3) {
              const [a, b, c] = [0, 1, 2].map((offset) =>
                corner
                  .fromBufferAttribute(position, first + offset)
                  .applyMatrix4(matrix)
                  .clone(),
              );
              const lowest = Math.min(a.y, b.y, c.y);
              const highest = Math.max(a.y, b.y, c.y);
              const middleGround = findWalkSurface(
                world,
                { x: (a.x + b.x + c.x) / 3, z: (a.z + b.z + c.z) / 3 },
                highest,
              ).height;
              if (
                lowest > middleGround + obstacleBodyHeight + nearbyRise ||
                highest < Math.max(0, middleGround) - nearbyRise
              ) {
                continue;
              }
              const span = Math.max(
                a.distanceTo(b),
                b.distanceTo(c),
                a.distanceTo(c),
              );
              const steps = Math.min(
                10,
                Math.max(1, Math.ceil(span / sampleSpacing)),
              );
              for (let u = 0; u <= steps; u++) {
                for (let v = 0; v <= steps - u; v++) {
                  const shareA = u / steps;
                  const shareB = v / steps;
                  const shareC = 1 - shareA - shareB;
                  const x = a.x * shareA + b.x * shareB + c.x * shareC;
                  const y = a.y * shareA + b.y * shareB + c.y * shareC;
                  const z = a.z * shareA + b.z * shareB + c.z * shareC;
                  const ground = Math.max(
                    0,
                    findWalkSurface(world, { x, z }, y).height,
                  );
                  if (
                    y <= ground + obstacleStepHeight + 0.1 ||
                    y >= ground + obstacleBodyHeight - 0.1
                  ) {
                    continue;
                  }
                  bodyLevel++;
                  if (!isSolidAt(x, z, ground)) {
                    holes++;
                    firstHole ||= `${x.toFixed(1)}, ${z.toFixed(1)}`;
                  }
                }
              }
            }
          }
          if (holes > Math.max(allowedHoles, bodyLevel * allowedHoleShare)) {
            hollow.push(
              `${names.join("/")} #${String(instance)}: ${String(holes)} of ${String(bodyLevel)} open, first at ${firstHole}`,
            );
          }
        }
        if (geometry !== mesh.geometry) {
          geometry.dispose();
        }
      }
      await renderer.unmount();
      expect(hollow).toEqual([]);
    }, 600_000);
  },
);
