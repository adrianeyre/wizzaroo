import { useLayoutEffect, useRef } from "react";
import {
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Object3D,
  OctahedronGeometry,
  type BufferGeometry,
  type InstancedMesh,
} from "three";
import { isMusicGameType } from "../../curriculum/music-games.js";
import type { QuestionGameType } from "../../curriculum/world-map.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { buildModelGeometry } from "../world-map-models.js";

export const islandStagePropTriangleBudget = 100;
export const islandStagePropMeshes = 1;

const propPlaces = [
  { x: -5.6, turn: 0.4 },
  { x: 5.6, turn: -0.5 },
];
const propHeight = -3.7;
const propDepth = -2.5;
const propScale = 1.3;

const buildFrostPropGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.07, 0.09, 0.4, 4),
      colour: "#4a3324",
      position: [0, 0.2, 0],
    },
    {
      geometry: new ConeGeometry(0.55, 1.1, 5),
      colour: "#25543e",
      position: [0, 0.9, 0],
    },
    {
      geometry: new ConeGeometry(0.32, 0.45, 5),
      colour: "#f5f9fd",
      position: [0, 1.3, 0],
    },
  ]);

const buildSandsPropGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.07, 0.1, 1.5, 4),
      colour: "#8a6439",
      position: [0, 0.75, 0],
      rotation: [0, 0, -0.1],
    },
    ...[0, 1, 2].map((frond) => {
      const angle = (frond / 3) * Math.PI * 2;
      return {
        geometry: new ConeGeometry(0.16, 1, 3),
        colour: "#3f8a3a",
        position: [
          0.15 + Math.cos(angle) * 0.35,
          1.5,
          Math.sin(angle) * 0.35,
        ] satisfies [number, number, number],
        rotation: [Math.sin(angle) * 1.8, 0, -Math.cos(angle) * 1.8] satisfies [
          number,
          number,
          number,
        ],
      };
    }),
  ]);

const buildJunglePropGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.08, 0.14, 1.2, 4),
      colour: "#6b4a2f",
      position: [0, 0.6, 0],
    },
    {
      geometry: new IcosahedronGeometry(0.7, 0),
      colour: "#2a6b2c",
      position: [0, 1.45, 0],
      scale: [1.3, 0.7, 1.3],
    },
  ]);

const buildEmberPropGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(0.45, 0),
      colour: "#3a3230",
      position: [0, 0.25, 0],
      scale: [1.3, 0.7, 1],
    },
    {
      geometry: new OctahedronGeometry(0.3, 0),
      colour: "#1a1724",
      position: [-0.1, 0.9, 0],
      scale: [0.7, 2.2, 0.7],
    },
    {
      geometry: new OctahedronGeometry(0.2, 0),
      colour: "#ff7a1a",
      position: [0.35, 0.55, 0.1],
      scale: [0.7, 1.6, 0.7],
    },
  ]);

const buildStarfallPropGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[
      { x: 0, height: 1.6, colour: "#b9a6ff" },
      { x: 0.35, height: 1.1, colour: "#8fd4ff" },
      { x: -0.3, height: 0.9, colour: "#d8c9ff" },
    ].map(({ x, height, colour }) => ({
      geometry: new OctahedronGeometry(0.25, 0),
      colour,
      position: [x, height / 2, 0] satisfies [number, number, number],
      scale: [0.7, height / 0.5, 0.7] satisfies [number, number, number],
    })),
    {
      geometry: new OctahedronGeometry(0.14, 0),
      colour: "#fff3b0",
      position: [0, 2.1, 0],
    },
  ]);

export const islandStagePropBuilders = new Map<string, () => BufferGeometry>([
  ["frost-isle", buildFrostPropGeometry],
  ["sunscorch-sands", buildSandsPropGeometry],
  ["jungle-reach", buildJunglePropGeometry],
  ["ember-isle", buildEmberPropGeometry],
  ["starfall-isle", buildStarfallPropGeometry],
]);

export const isStageDressedForIsland = (gameType: QuestionGameType): boolean =>
  !isMusicGameType(gameType);

const IslandStagePropModels = ({
  buildGeometry,
}: {
  buildGeometry: () => BufferGeometry;
}) => {
  const instances = useRef<InstancedMesh>(null);
  const geometry = useBuiltGeometry(buildGeometry);
  useLayoutEffect(() => {
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    const placement = new Object3D();
    propPlaces.forEach(({ x, turn }, index) => {
      placement.position.set(x, propHeight, propDepth);
      placement.rotation.set(0, turn, 0);
      placement.scale.setScalar(propScale);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh
      ref={instances}
      name="island-stage-props"
      args={[geometry, undefined, propPlaces.length]}
    >
      <meshStandardMaterial vertexColors roughness={0.7} />
    </instancedMesh>
  );
};

export const IslandStageProps = ({
  islandId,
  gameType,
}: {
  islandId: string | undefined;
  gameType: QuestionGameType;
}) => {
  const buildGeometry =
    islandId === undefined ? undefined : islandStagePropBuilders.get(islandId);
  if (buildGeometry === undefined || !isStageDressedForIsland(gameType)) {
    return null;
  }
  return <IslandStagePropModels buildGeometry={buildGeometry} />;
};
