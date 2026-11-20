import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Object3D,
  SphereGeometry,
  type BufferGeometry,
  type InstancedMesh,
} from "three";
import { isMotionReduced } from "../reduced-motion.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { buildModelGeometry, type ModelPart } from "../world-map-models.js";
import { GrainedMaterial } from "../world-map-scene.js";
import { chooseInstance } from "./island-explore-props.js";
import { surfaceGrains } from "../world-map-shaders.js";
import type {
  Friend,
  FriendLook,
  IslandAdventure,
} from "./island-adventures.js";

const buildEyes = (
  height: number,
  forward: number,
  apart: number,
  size = 0.06,
): ModelPart[] =>
  [-1, 1].flatMap((side): ModelPart[] => [
    {
      geometry: new SphereGeometry(size * 1.6, 6, 4),
      colour: "#ffffff",
      position: [side * apart, height, forward],
    },
    {
      geometry: new SphereGeometry(size, 4, 3),
      colour: "#111827",
      position: [side * apart, height, forward + size * 1.1],
    },
  ]);

const buildLegs = (
  colour: string,
  length: number,
  spreadX: number,
  spreadZ: number,
): ModelPart[] =>
  [
    [-spreadX, -spreadZ],
    [spreadX, -spreadZ],
    [-spreadX, spreadZ],
    [spreadX, spreadZ],
  ].map(([x, z]): ModelPart => ({
    geometry: new CylinderGeometry(0.06, 0.05, length, 6),
    colour,
    position: [x, length / 2, z],
  }));

const buildLambParts = (): ModelPart[] => [
  ...buildLegs("#1f2937", 0.42, 0.18, 0.22),
  {
    geometry: new IcosahedronGeometry(0.42, 1),
    colour: "#f8fafc",
    position: [0, 0.68, 0],
    scale: [1, 0.85, 1.25],
    roughen: 0.06,
  },
  {
    geometry: new SphereGeometry(0.2, 8, 5),
    colour: "#374151",
    position: [0, 0.88, 0.52],
    scale: [0.9, 1, 1.15],
  },
  {
    geometry: new IcosahedronGeometry(0.15, 0),
    colour: "#f8fafc",
    position: [0, 1.06, 0.48],
  },
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new SphereGeometry(0.08, 5, 4),
    colour: "#374151",
    position: [side * 0.21, 0.92, 0.46],
    scale: [1.6, 0.6, 0.8],
  })),
  ...buildEyes(0.93, 0.68, 0.08, 0.035),
];

const buildPenguinParts = (): ModelPart[] => [
  {
    geometry: new SphereGeometry(0.36, 9, 6),
    colour: "#111827",
    position: [0, 0.55, 0],
    scale: [1, 1.45, 0.95],
  },
  {
    geometry: new SphereGeometry(0.3, 9, 6),
    colour: "#f8fafc",
    position: [0, 0.5, 0.1],
    scale: [0.9, 1.35, 0.8],
  },
  {
    geometry: new SphereGeometry(0.24, 8, 5),
    colour: "#111827",
    position: [0, 1.08, 0.02],
  },
  {
    geometry: new ConeGeometry(0.07, 0.22, 6),
    colour: "#f97316",
    position: [0, 1.04, 0.3],
    rotation: [Math.PI / 2, 0, 0],
  },
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new BoxGeometry(0.08, 0.5, 0.22),
    colour: "#111827",
    position: [side * 0.38, 0.6, 0],
    rotation: [0, 0, side * 0.35],
  })),
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new BoxGeometry(0.16, 0.05, 0.24),
    colour: "#f97316",
    position: [side * 0.13, 0.03, 0.12],
  })),
  ...buildEyes(1.14, 0.2, 0.09, 0.035),
];

const buildCamelParts = (): ModelPart[] => [
  ...buildLegs("#c08a4a", 0.95, 0.22, 0.42),
  {
    geometry: new SphereGeometry(0.4, 9, 6),
    colour: "#d6a35c",
    position: [0, 1.15, 0],
    scale: [0.8, 0.75, 1.5],
  },
  {
    geometry: new SphereGeometry(0.3, 8, 5),
    colour: "#c99550",
    position: [0, 1.45, -0.05],
    scale: [0.8, 0.9, 1.1],
  },
  {
    geometry: new CylinderGeometry(0.1, 0.14, 0.75, 8),
    colour: "#d6a35c",
    position: [0, 1.55, 0.62],
    rotation: [0.55, 0, 0],
  },
  {
    geometry: new SphereGeometry(0.17, 8, 5),
    colour: "#d6a35c",
    position: [0, 1.9, 0.86],
    scale: [0.85, 0.85, 1.4],
  },
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new SphereGeometry(0.05, 5, 4),
    colour: "#a16207",
    position: [side * 0.12, 2.03, 0.76],
    scale: [1, 1.6, 0.6],
  })),
  {
    geometry: new BoxGeometry(0.5, 0.06, 0.7),
    colour: "#dc2626",
    position: [0, 1.62, 0.02],
  },
  ...buildEyes(1.97, 0.95, 0.1, 0.03),
];

const buildMonkeyParts = (): ModelPart[] => [
  {
    geometry: new SphereGeometry(0.3, 9, 6),
    colour: "#7c4a21",
    position: [0, 0.48, 0],
    scale: [1, 1.2, 0.9],
  },
  {
    geometry: new SphereGeometry(0.22, 8, 5),
    colour: "#f3c99b",
    position: [0, 0.45, 0.14],
    scale: [0.85, 1, 0.7],
  },
  {
    geometry: new SphereGeometry(0.25, 9, 6),
    colour: "#7c4a21",
    position: [0, 0.98, 0.02],
  },
  {
    geometry: new SphereGeometry(0.17, 8, 5),
    colour: "#f3c99b",
    position: [0, 0.94, 0.15],
    scale: [1.1, 0.9, 0.8],
  },
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new SphereGeometry(0.09, 6, 4),
    colour: "#f3c99b",
    position: [side * 0.26, 1.02, 0],
    scale: [0.5, 1, 1],
  })),
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new CylinderGeometry(0.05, 0.05, 0.5, 6),
    colour: "#7c4a21",
    position: [side * 0.33, 0.62, 0.05],
    rotation: [0, 0, side * -2.4],
  })),
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new CylinderGeometry(0.06, 0.05, 0.3, 6),
    colour: "#7c4a21",
    position: [side * 0.14, 0.12, 0.05],
  })),
  ...[0, 1, 2].map((piece): ModelPart => ({
    geometry: new CylinderGeometry(0.035, 0.035, 0.3, 5),
    colour: "#7c4a21",
    position: [0, 0.3 + piece * 0.24, -0.34 - piece * 0.06],
    rotation: [0.4 - piece * 0.6, 0, 0],
  })),
  ...buildEyes(1.02, 0.28, 0.07, 0.03),
];

const buildLizardParts = (): ModelPart[] => [
  {
    geometry: new SphereGeometry(0.28, 9, 6),
    colour: "#16a34a",
    position: [0, 0.22, 0],
    scale: [0.85, 0.55, 1.7],
  },
  {
    geometry: new SphereGeometry(0.18, 8, 5),
    colour: "#22c55e",
    position: [0, 0.3, 0.55],
    scale: [1, 0.75, 1.3],
  },
  ...[0, 1, 2].map((piece): ModelPart => ({
    geometry: new ConeGeometry(0.12 - piece * 0.03, 0.4, 6),
    colour: "#15803d",
    position: [0, 0.18 - piece * 0.03, -0.55 - piece * 0.36],
    rotation: [-Math.PI / 2, 0, 0],
  })),
  ...[
    [-1, 0.25],
    [1, 0.25],
    [-1, -0.25],
    [1, -0.25],
  ].map(([side, along]): ModelPart => ({
    geometry: new CylinderGeometry(0.05, 0.04, 0.3, 5),
    colour: "#15803d",
    position: [side * 0.28, 0.1, along],
    rotation: [0, 0, side * 1.1],
  })),
  ...[0, 1, 2, 3].map((spike): ModelPart => ({
    geometry: new ConeGeometry(0.05, 0.14, 4),
    colour: "#f97316",
    position: [0, 0.38, 0.3 - spike * 0.2],
  })),
  ...buildEyes(0.4, 0.62, 0.11, 0.035),
];

const buildOwlParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.3, 0.34, 0.3, 10),
    colour: "#78350f",
    position: [0, 0.15, 0],
  },
  {
    geometry: new SphereGeometry(0.32, 9, 6),
    colour: "#92400e",
    position: [0, 0.68, 0],
    scale: [1, 1.25, 0.9],
  },
  {
    geometry: new SphereGeometry(0.24, 8, 5),
    colour: "#fde68a",
    position: [0, 0.62, 0.12],
    scale: [0.9, 1.15, 0.7],
  },
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new ConeGeometry(0.08, 0.22, 4),
    colour: "#92400e",
    position: [side * 0.2, 1.12, 0],
    rotation: [0, 0, side * -0.3],
  })),
  ...[-1, 1].flatMap((side): ModelPart[] => [
    {
      geometry: new CylinderGeometry(0.13, 0.13, 0.04, 12),
      colour: "#fef3c7",
      position: [side * 0.13, 0.9, 0.26],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new SphereGeometry(0.07, 6, 4),
      colour: "#f59e0b",
      position: [side * 0.13, 0.9, 0.29],
    },
    {
      geometry: new SphereGeometry(0.035, 5, 4),
      colour: "#111827",
      position: [side * 0.13, 0.9, 0.35],
    },
  ]),
  {
    geometry: new ConeGeometry(0.05, 0.14, 4),
    colour: "#f59e0b",
    position: [0, 0.8, 0.32],
    rotation: [Math.PI, 0, 0],
  },
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new SphereGeometry(0.18, 6, 4),
    colour: "#78350f",
    position: [side * 0.3, 0.66, -0.04],
    scale: [0.35, 1.1, 0.9],
  })),
];

const friendParts: Record<FriendLook, () => ModelPart[]> = {
  lamb: buildLambParts,
  penguin: buildPenguinParts,
  camel: buildCamelParts,
  monkey: buildMonkeyParts,
  lizard: buildLizardParts,
  owl: buildOwlParts,
};

export const buildFriendGeometry = (look: FriendLook): BufferGeometry =>
  buildModelGeometry(friendParts[look]());

const hopSeconds = 2.2;
const hopHeight = 0.28;

const findHop = (age: number, offset: number): number => {
  const share = ((age + offset) % hopSeconds) / hopSeconds;
  return share < 0.3 ? Math.sin((share / 0.3) * Math.PI) * hopHeight : 0;
};

export const IslandFriends = ({
  adventure,
  onChosen,
}: {
  adventure: IslandAdventure;
  onChosen?: (friend: Friend) => void;
}) => {
  const { friends, friendKind } = adventure;
  const look = friendKind.look;
  const geometry = useBuiltGeometry(
    useCallback(() => buildFriendGeometry(look), [look]),
  );
  const things = useMemo(
    () =>
      friends.map(({ position }, index) => ({
        ...position,
        height: Math.max(0, adventure.findHeight(position)),
        turn: Math.atan2(-position.x, -position.z) + index,
        offset: index * 0.37,
      })),
    [friends, adventure],
  );
  const shapes = useRef<InstancedMesh>(null);
  const age = useRef(0);
  const placement = useMemo(() => new Object3D(), []);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * (isMotionReduced() ? 0 : 1);
    const mesh = shapes.current;
    if (mesh === null) {
      return;
    }
    things.forEach(({ x, z, height, turn, offset }, index) => {
      const sway = Math.sin(age.current * 0.6 + offset * 5) * 0.5;
      placement.position.set(x, height + findHop(age.current, offset), z);
      placement.rotation.set(0, turn + sway, 0);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={shapes}
      name={`friends-${look}`}
      args={[geometry, undefined, friends.length]}
      castShadow
      frustumCulled={false}
      onClick={chooseInstance(friends, onChosen)}
    >
      <GrainedMaterial grain={surfaceGrains.ground} />
    </instancedMesh>
  );
};
