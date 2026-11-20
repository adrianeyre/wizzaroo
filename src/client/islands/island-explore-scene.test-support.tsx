// The scene and helpers shared by island-explore.test.tsx and island-explore.sweep.test.tsx.
import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { BufferGeometry, InstancedMesh, Mesh } from "three";
import {
  buildChildLimits,
  buildIslandsOnMap,
  buildRegionsOnMap,
} from "../../curriculum/island-access.js";
import {
  findExploreAdventure,
  type ExploreInteraction,
} from "./island-adventures.js";
import { IslandExploreScene } from "./island-explore.js";
import type { RaceProgress } from "./island-races.js";
import type {
  CameraView,
  ExploreInput,
  IslandExploreSceneProps,
  VoyageView,
  WalkerStatus,
} from "./island-explore-hud.js";

export const exploreMeshBudget = 150;
export const exploreTriangleBudget = 440_000;
export const frameSeconds = 1 / 60;

export const everyIslandOpen = buildChildLimits({
  unlockedIslandIds: [
    "frost-isle",
    "sunscorch-sands",
    "jungle-reach",
    "ember-isle",
    "starfall-isle",
  ],
});
export const islandsOnMap = buildIslandsOnMap(6, everyIslandOpen);

export const findIslandOnMap = (islandId: string) => {
  const island = islandsOnMap.find(({ id }) => id === islandId);
  if (island === undefined) {
    throw new Error(`No Island ${islandId}`);
  }
  return island;
};

export interface ExploreRecord {
  reached: ExploreInteraction[];
  foundTreasureIds: string[];
  statuses: WalkerStatus[];
  nearby: ExploreInteraction[][];
  races: RaceProgress[];
  questFindIds: string[];
}

export const renderExplore = async (
  islandId: string,
  {
    start = findExploreAdventure(islandId).start,
    cameraView = "behind",
    climbedLookoutId,
    foundTreasureIds = [],
    voyage,
  }: {
    start?: { x: number; z: number };
    cameraView?: CameraView;
    climbedLookoutId?: string;
    foundTreasureIds?: string[];
    voyage?: VoyageView;
  } = {},
) => {
  const record: ExploreRecord = {
    reached: [],
    foundTreasureIds: [],
    statuses: [],
    nearby: [],
    races: [],
    questFindIds: [],
  };
  const input: { current: ExploreInput } = {
    current: { right: 0, forward: 0, wantsJump: false },
  };
  const sceneProps: IslandExploreSceneProps = {
    island: findIslandOnMap(islandId),
    regions: buildRegionsOnMap(islandsOnMap, everyIslandOpen).filter(
      (region) => region.islandId === islandId,
    ),
    loadout: {},
    start,
    startHeading: findExploreAdventure(islandId).startHeading,
    voyage,
    inputRef: input,
    foundTreasureIds,
    climbedLookoutId,
    cameraView,
    hoveredRegionId: undefined,
    onRegionHovered: () => undefined,
    onNearbyChanged: (interactions) => {
      record.nearby.push(interactions);
    },
    onTreasureFound: (treasureId) => {
      record.foundTreasureIds.push(treasureId);
    },
    onRaceProgress: (progress) => {
      record.races.push(progress);
    },
    onStatusChanged: (status) => {
      record.statuses.push(status);
    },
    onInteractionReached: (interaction) => {
      record.reached.push(interaction);
    },
    onQuestFindReached: (findId) => {
      record.questFindIds.push(findId);
    },
  };
  const renderer = await ReactThreeTestRenderer.create(
    <IslandExploreScene
      sceneProps={sceneProps}
      isEffectsOn
      timeOfDay="day"
      weather="clear"
    />,
  );
  return { renderer, input, record, sceneProps };
};

export const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;

export const listMeshes = (renderer: ReactThreeTest.Renderer): Mesh[] =>
  [
    ...renderer.scene.findAllByType("Mesh"),
    ...renderer.scene.findAllByType("InstancedMesh"),
  ]
    .map(({ instance }) => instance)
    .filter(isMesh)
    .filter(
      (mesh) =>
        mesh.visible &&
        (Array.isArray(mesh.material)
          ? mesh.material.some((material) => material.visible)
          : mesh.material.visible),
    );

export const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

export const countDrawnTriangles = (mesh: Mesh): number =>
  countTriangles(mesh.geometry) *
  (mesh instanceof InstancedMesh ? mesh.count : 1);

export const findNamed = (renderer: ReactThreeTest.Renderer, name: string) =>
  renderer.scene.findAll(({ instance }) => instance.name === name);

export const findExplorer = (renderer: ReactThreeTest.Renderer) => {
  const [explorer] = findNamed(renderer, "explorer");
  return explorer.instance;
};
