import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  SphereGeometry,
  type BufferGeometry,
  type ColorRepresentation,
  type Group,
} from "three";
import type { Biome, GeographyShowOf } from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { DriftingPoints, type DriftingBox } from "./drifting-points.js";
import {
  geographyPalette,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";
import {
  buildBroadleafParts,
  buildDiscGround,
  buildPineParts,
  findScatter,
} from "./miniature-parts.js";

const domeRadius = 1.55;
const savannaGold = new Color("#e2c56a");
const groundLift = 0.12;
const floorHeight = -1.3;
const groundRadius = domeRadius - 0.05;

interface BiomeLook {
  findHeight: (x: number, z: number) => number;
  findColour: (x: number, z: number, height: number) => ColorRepresentation;
  buildParts: () => ModelPart[];
  domeTint: string;
  isSnowing: boolean;
}

const buildCactusParts = (
  x: number,
  z: number,
  height: number,
): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.06, 0.07, height, 8),
    colour: "#3f8f4f",
    position: [x, height / 2, z],
  },
  {
    geometry: new CylinderGeometry(0.04, 0.04, height * 0.35, 6),
    colour: "#4a9c58",
    position: [x + 0.09, height * 0.62, z],
    rotation: [0, 0, 0],
  },
  {
    geometry: new CylinderGeometry(0.04, 0.04, 0.1, 6),
    colour: "#4a9c58",
    position: [x + 0.05, height * 0.45, z],
    rotation: [0, 0, Math.PI / 2],
  },
];

const buildAcaciaParts = (x: number, z: number): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.03, 0.05, 0.55, 6),
    colour: "#6b4a2f",
    position: [x, 0.27, z],
    rotation: [0, 0, 0.12],
  },
  {
    geometry: new CylinderGeometry(0.38, 0.3, 0.1, 10),
    colour: "#5f8f3a",
    position: [x + 0.05, 0.58, z],
    roughen: 0.2,
  },
];

const buildGiraffeParts = (x: number, z: number): ModelPart[] => [
  {
    geometry: new BoxGeometry(0.3, 0.14, 0.12),
    colour: "#e3a94a",
    position: [x, 0.36, z],
  },
  ...[-0.11, 0.11].flatMap((dx) =>
    [-0.04, 0.04].map((dz) => ({
      geometry: new CylinderGeometry(0.015, 0.015, 0.3, 5),
      colour: "#c98b35",
      position: [x + dx, 0.15, z + dz] satisfies Triple,
    })),
  ),
  {
    geometry: new CylinderGeometry(0.03, 0.04, 0.42, 6),
    colour: "#e3a94a",
    position: [x + 0.17, 0.6, z],
    rotation: [0, 0, -0.35],
  },
  {
    geometry: new BoxGeometry(0.12, 0.06, 0.06),
    colour: "#d99a3e",
    position: [x + 0.27, 0.8, z],
  },
];

const buildPenguinParts = (x: number, z: number): ModelPart[] => [
  {
    geometry: new SphereGeometry(0.07, 10, 8),
    colour: "#1d2430",
    position: [x, 0.09, z],
    scale: [1, 1.4, 1],
  },
  {
    geometry: new SphereGeometry(0.05, 10, 8),
    colour: "#f4f6f8",
    position: [x, 0.08, z + 0.035],
    scale: [1, 1.4, 0.6],
  },
  {
    geometry: new SphereGeometry(0.045, 10, 8),
    colour: "#1d2430",
    position: [x, 0.2, z],
  },
  {
    geometry: new ConeGeometry(0.015, 0.04, 5),
    colour: "#f2a51a",
    position: [x, 0.2, z + 0.05],
    rotation: [Math.PI / 2, 0, 0],
  },
];

const buildCoralParts = (
  x: number,
  z: number,
  colour: string,
  index: number,
): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.03, 0.05, 0.3, 6),
    colour,
    position: [x, 0.15, z],
  },
  {
    geometry: new CylinderGeometry(0.02, 0.035, 0.22, 6),
    colour,
    position: [x + 0.06, 0.24, z],
    rotation: [0, 0, -0.6],
  },
  {
    geometry: new CylinderGeometry(0.02, 0.035, 0.2, 6),
    colour,
    position: [x - 0.06, 0.22, z],
    rotation: [0, 0, 0.6],
  },
  {
    geometry: new IcosahedronGeometry(0.06 + (index % 3) * 0.02, 1),
    colour: index % 2 === 0 ? "#ff8fb8" : "#ffd23f",
    position: [x + 0.12, 0.06, z + 0.08],
    isSmooth: true,
  },
];

const scatter = <Part,>(
  count: number,
  salt: number,
  reach: number,
  buildAt: (x: number, z: number, index: number) => Part[],
): Part[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = findScatter(index, salt) * Math.PI * 2;
    const distance = Math.sqrt(findScatter(index, salt + 1)) * reach;
    return buildAt(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      index,
    );
  }).flat();

const biomeLooks: Record<Biome, BiomeLook> = {
  desert: {
    findHeight: (x, z) => 0.08 * Math.sin(x * 2.4 + z) + 0.06 * Math.cos(z * 3),
    findColour: (_x, _z, height) => (height > 0.05 ? "#f0d08a" : "#e2b96a"),
    buildParts: () => [
      ...buildCactusParts(-0.5, 0.2, 0.55),
      ...buildCactusParts(0.55, -0.3, 0.42),
      ...buildCactusParts(0.2, 0.6, 0.35),
      {
        geometry: new IcosahedronGeometry(0.16, 0),
        colour: "#c79a63",
        position: [-0.2, 0.05, -0.55],
        roughen: 0.3,
      },
    ],
    domeTint: "#fff3d6",
    isSnowing: false,
  },
  rainforest: {
    findHeight: (x, z) => 0.05 * Math.sin(x * 3 + z * 2),
    findColour: (x) => (Math.abs(x + 0.1) < 0.12 ? "#3a8fd8" : "#2f6b2a"),
    buildParts: () => [
      ...scatter(7, 3, 1.15, (x, z, index) =>
        buildBroadleafParts(
          [x + (x > -0.1 ? 0.2 : -0.2), 0, z],
          0.9 + (index % 3) * 0.35,
          ["#1f5d22", "#2b7a2c", "#3b8f35"],
        ),
      ),
      ...scatter(6, 5, 1.2, (x, z) => [
        {
          geometry: new IcosahedronGeometry(0.14, 0),
          colour: "#3e8f3a",
          position: [x, 0.1, z] satisfies Triple,
          isSmooth: true,
        },
      ]),
    ],
    domeTint: "#e6fff0",
    isSnowing: false,
  },
  polar: {
    findHeight: (x, z) => (Math.hypot(x - 0.4, z - 0.3) < 0.45 ? -0.02 : 0.04),
    findColour: (x, z) =>
      Math.hypot(x - 0.4, z - 0.3) < 0.45 ? "#2f7fc9" : "#f4f9ff",
    buildParts: () => [
      {
        geometry: new IcosahedronGeometry(0.32, 0),
        colour: "#e8f4ff",
        position: [-0.5, 0.15, -0.4],
        scale: [1, 1.3, 1],
      },
      {
        geometry: new IcosahedronGeometry(0.2, 0),
        colour: "#cfe8fb",
        position: [0.45, 0.06, 0.3],
      },
      ...buildPenguinParts(-0.1, 0.45),
      ...buildPenguinParts(0.05, 0.6),
    ],
    domeTint: "#eef7ff",
    isSnowing: true,
  },
  savanna: {
    findHeight: (x, z) => 0.03 * Math.sin(x * 2 + z * 1.5),
    findColour: (x, z) =>
      new Color("#c9a64a").lerp(
        savannaGold,
        0.5 + 0.5 * Math.sin(x * 3.1 + z * 2.3) * Math.cos(z * 1.7),
      ),
    buildParts: () => [
      ...buildAcaciaParts(-0.55, -0.3),
      ...buildAcaciaParts(0.6, -0.45),
      ...buildGiraffeParts(0.05, 0.2),
      ...scatter(10, 9, 1.2, (x, z) => [
        {
          geometry: new ConeGeometry(0.04, 0.14, 4),
          colour: "#e2c56a",
          position: [x, 0.07, z] satisfies Triple,
        },
      ]),
    ],
    domeTint: "#fff6dc",
    isSnowing: false,
  },
  "temperate-forest": {
    findHeight: (x, z) => 0.05 * Math.sin(x * 2 + z * 2),
    findColour: () => "#5a9a45",
    buildParts: () =>
      scatter(6, 11, 1.1, (x, z, index) =>
        buildBroadleafParts([x, 0, z], 0.75 + (index % 2) * 0.2, [
          "#3f7a32",
          "#4f9a3e",
          "#6aae4c",
        ]),
      ),
    domeTint: "#f0fff0",
    isSnowing: false,
  },
  taiga: {
    findHeight: (x, z) => 0.04 * Math.sin(x * 2.5 - z),
    findColour: (x, z) =>
      findScatter(Math.round(x * 6), Math.round(z * 6)) > 0.7
        ? "#f2f6fb"
        : "#4a6a45",
    buildParts: () =>
      scatter(9, 13, 1.15, (x, z, index) =>
        buildPineParts([x, 0, z], 0.65 + (index % 3) * 0.15, [
          "#1b3f27",
          "#22502f",
          "#2b5e36",
        ]),
      ),
    domeTint: "#eef6ff",
    isSnowing: true,
  },
  grassland: {
    findHeight: (x, z) => 0.1 * Math.sin(x * 1.6) * Math.cos(z * 1.3),
    findColour: (_x, _z, height) => (height > 0.03 ? "#a9c75a" : "#8fbf4a"),
    buildParts: () => [
      ...buildBroadleafParts([0.7, 0, -0.5], 0.6),
      ...scatter(14, 17, 1.2, (x, z, index) => [
        {
          geometry: new IcosahedronGeometry(0.03, 0),
          colour: ["#ffd23f", "#ff6f91", "#ffffff"][index % 3],
          position: [x, 0.08, z] satisfies Triple,
        },
      ]),
      ...scatter(10, 19, 1.2, (x, z) => [
        {
          geometry: new ConeGeometry(0.035, 0.16, 4),
          colour: "#c9b85a",
          position: [x, 0.08, z] satisfies Triple,
        },
      ]),
    ],
    domeTint: "#fbfff0",
    isSnowing: false,
  },
  tundra: {
    findHeight: (x, z) =>
      0.03 * Math.sin(x * 4 + z * 3) + (z < -0.8 ? 0.4 * (-0.8 - z) * 3 : 0),
    findColour: (x, z, height) =>
      height > 0.3
        ? "#ffffff"
        : findScatter(Math.round(x * 7), Math.round(z * 7)) > 0.75
          ? "#eef3f8"
          : "#7d8a5a",
    buildParts: () =>
      scatter(10, 23, 1.0, (x, z, index) => [
        {
          geometry: new IcosahedronGeometry(0.06 + (index % 3) * 0.02, 0),
          colour: index % 2 === 0 ? "#6f7f45" : "#8a6a4a",
          position: [x, 0.04, z + 0.2] satisfies Triple,
          scale: [1, 0.6, 1] satisfies Triple,
        },
      ]),
    domeTint: "#f2f6ff",
    isSnowing: true,
  },
  mountain: {
    findHeight: (x, z) => Math.max(0, 1.05 - Math.hypot(x, z + 0.15) * 1.25),
    findColour: (_x, _z, height) =>
      height > 0.75 ? "#ffffff" : height > 0.35 ? "#8a8f99" : "#5f9a4a",
    buildParts: () => [
      ...[0.4, 1.3, 2.2, 3.4, 4.3, 5.4].flatMap((angle, index) =>
        buildPineParts(
          [Math.cos(angle) * 1.12, 0, Math.sin(angle) * 1.12 - 0.1],
          0.4 + (index % 2) * 0.1,
        ),
      ),
      {
        geometry: new IcosahedronGeometry(0.14, 0),
        colour: "#7d828c",
        position: [0.75, 0.05, 0.55],
        roughen: 0.3,
      },
    ],
    domeTint: "#f0f6ff",
    isSnowing: true,
  },
  "coral-reef": {
    findHeight: (x, z) => 0.05 * Math.sin(x * 3) * Math.cos(z * 2),
    findColour: () => "#e8d39a",
    buildParts: () =>
      scatter(6, 31, 1.0, (x, z, index) =>
        buildCoralParts(
          x,
          z,
          ["#ff6f61", "#ff9f43", "#c56cf0", "#ff4d6d"][index % 4],
          index,
        ),
      ),
    domeTint: "#4fb6e8",
    isSnowing: false,
  },
};

const buildBiomeGeometry = (
  biome: Biome,
): { ground: BufferGeometry; scenery: BufferGeometry } => {
  const look = biomeLooks[biome];
  return {
    ground: buildDiscGround({
      radius: groundRadius,
      rings: 10,
      sectors: 36,
      findHeight: look.findHeight,
      findColour: look.findColour,
    }),
    scenery: buildModelGeometry(look.buildParts()),
  };
};

const fishColours = ["#ffb703", "#fb5607", "#3a86ff"];

const SwimmingFish = () => {
  const school = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    if (school.current !== null) {
      school.current.rotation.y = age.current * 0.5 * motionScale;
    }
  });
  return (
    <group ref={school} name="fish">
      {fishColours.map((colour, index) => (
        <mesh
          key={colour}
          position={[0.75 - index * 0.2, 0.45 + index * 0.2, 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[0.6, 1, 0.35]}
        >
          <coneGeometry args={[0.08, 0.26, 8]} />
          <meshStandardMaterial color={colour} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

const snowBox: DriftingBox = { centre: [0, 0.65, 0], size: [2.1, 1.3, 1.6] };

export const BiomeDomeScene = ({
  show,
}: {
  show: GeographyShowOf<"biome-dome">;
}) => {
  const look = biomeLooks[show.biome];
  const geometries = useMemo(
    () => buildBiomeGeometry(show.biome),
    [show.biome],
  );
  useDisposedOnUnmount(geometries.ground);
  useDisposedOnUnmount(geometries.scenery);
  const turner = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    if (turner.current !== null) {
      turner.current.rotation.y =
        0.3 + Math.sin(age.current * 0.35) * 0.35 * motionScale;
    }
  });
  const isUnderWater = show.biome === "coral-reef";

  return (
    <group
      position={[0, floorHeight, 0]}
      rotation={[0.28, 0, 0]}
      name={`biome-${show.biome}`}
    >
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry
          args={[domeRadius + 0.12, domeRadius + 0.18, 0.2, 48]}
        />
        <meshPhysicalMaterial
          color={geographyPalette.wood}
          roughness={0.5}
          clearcoat={0.6}
        />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[domeRadius + 0.02, 0.035, 6, 48]} />
        <meshPhysicalMaterial
          color={geographyPalette.brass}
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      <group ref={turner}>
        <mesh geometry={geometries.ground} position={[0, groundLift, 0]}>
          <meshStandardMaterial vertexColors roughness={0.85} />
        </mesh>
        <mesh geometry={geometries.scenery} position={[0, groundLift, 0]}>
          <meshStandardMaterial vertexColors roughness={0.6} />
        </mesh>
        {isUnderWater ? <SwimmingFish /> : null}
      </group>
      {look.isSnowing ? (
        <DriftingPoints
          count={90}
          box={snowBox}
          colour="#ffffff"
          size={0.06}
          fallSpeed={0.25}
          sway={0.08}
        />
      ) : null}
      <mesh name="glass-dome">
        <sphereGeometry
          args={[domeRadius, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshPhysicalMaterial
          color={look.domeTint}
          transparent
          opacity={isUnderWater ? 0.32 : 0.16}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.02}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
