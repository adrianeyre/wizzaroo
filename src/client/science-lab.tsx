import { useFrame } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  LatheGeometry,
  Object3D,
  ShaderMaterial,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  isLabProp,
  type LabModel,
  type LabProp,
  type LabStation,
} from "../curriculum/lab-games.js";
import type { LabItem } from "../curriculum/lab-items.js";
import { buildLabItemModel } from "./lab-items/lab-item-models.js";
import type { QuestionPrompt } from "./mission/mission.js";
import { buildPaletteUniform } from "./pixel-pipeline.js";
import {
  BubbleBurst,
  StudioCompanion,
  StudioLights,
  findGrowth,
  promptGrowSeconds,
  useChoicePositions,
  useChoiceRadius,
  useDisposedOnUnmount,
  useGrowingChoice,
  usePromptGrowth,
  usePromptPosition,
  type ChoiceSlot,
  type CompanionMood,
} from "./studio-stage.js";

export interface ScienceLabWorldProps {
  prompt: QuestionPrompt | undefined;
  choices: readonly string[];
  hiddenChoiceIndexes: readonly number[];
  companionMood: CompanionMood;
  poppedChoiceIndex: number | undefined;
  popCount: number;
  isEffectsOn: boolean;
}

export const labPalette = {
  wallTop: "#070d18",
  wallBottom: "#17263a",
  grid: "#3a6488",
  glow: "#2fb5c6",
  benchTop: "#1a2330",
  benchTrim: "#c3ccd6",
  benchLight: "#47d7e6",
  shelf: "#243142",
  glass: "#dcf3ff",
  liquids: ["#23a6b5", "#e8962e", "#d8573f", "#6f62e6"],
  steel: "#b9c4cf",
  darkSteel: "#4f5b68",
  anodised: ["#1f7f8c", "#b46b18", "#a8402e", "#4d43b0"],
  keyTrue: "#1aa57c",
  keyFalse: "#cf4f3c",
  turntable: "#121a25",
  turntableRing: "#5ee0f0",
  leaf: "#3f8f4f",
  stem: "#356f37",
  petal: "#d8607d",
  petalCentre: "#f0b93a",
  bark: "#5f4330",
  soil: "#3e2c20",
  pot: "#b75f37",
  shell: "#ece2d0",
  enamel: "#f1ede4",
  heart: "#b73444",
  vessel: "#3f5fb5",
  brass: "#c39746",
  magnetRed: "#c8323a",
  filament: "#ffcf73",
  batteryBody: "#1f2329",
  batteryBand: "#e8962e",
  planet: "#cf8550",
  planetRing: "#e6d0a2",
  sun: "#ffb347",
  moon: "#c3c6cc",
  ice: "#cdefff",
  water: "#3a9fe8",
  rock: "#776c62",
  mercury: "#d23a3a",
  cloud: "#eef3f8",
  fossil: "#b39a76",
  slab: "#6d6458",
  dnaStrands: ["#2fb5c6", "#e8962e"],
  dnaRung: "#dfe7ef",
  snow: "#e3f4ff",
  rays: ["#ff5a5a", "#4cd97b", "#5a8dff"],
} as const;

const benchTopHeight = -2.25;
const benchDepth = 3.2;
const benchFrontZ = 1;
const shelfHeight = 0.9;
const shelfZ = -4.6;
const turntableDrop = 0.78;
const propSpinSpeed = 0.35;

const labWallVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const labWallFragmentShader = `
uniform vec3 wallTop;
uniform vec3 wallBottom;
uniform vec3 grid;
uniform vec3 glow;
varying vec2 vUv;

float findGridLine(vec2 point, float cells) {
  vec2 cell = abs(fract(point * cells) - 0.5);
  return 1.0 - smoothstep(0.0, 0.035, 0.5 - max(cell.x, cell.y));
}

void main() {
  vec3 colour = mix(wallBottom, wallTop, smoothstep(0.1, 0.95, vUv.y));
  vec2 point = vUv * vec2(2.0, 1.0);
  float fine = findGridLine(point, 24.0) * 0.06;
  float coarse = findGridLine(point, 6.0) * 0.1;
  colour += grid * (fine + coarse) * smoothstep(0.05, 0.6, vUv.y);
  vec2 fromGlow = (vUv - vec2(0.56, 0.55)) * vec2(1.7, 1.0);
  float glowStrength = 1.0 - smoothstep(0.0, 0.38, length(fromGlow));
  colour += glow * glowStrength * glowStrength * 0.28;
  float vignette = smoothstep(0.95, 0.3, distance(vUv, vec2(0.5)));
  gl_FragColor = vec4(colour * mix(0.7, 1.0, vignette), 1.0);
}
`;

const buildLabWallMaterial = () => {
  const [wallTop, wallBottom, grid, glow] = buildPaletteUniform([
    labPalette.wallTop,
    labPalette.wallBottom,
    labPalette.grid,
    labPalette.glow,
  ]);
  return new ShaderMaterial({
    uniforms: {
      wallTop: { value: wallTop },
      wallBottom: { value: wallBottom },
      grid: { value: grid },
      glow: { value: glow },
    },
    vertexShader: labWallVertexShader,
    fragmentShader: labWallFragmentShader,
    depthWrite: false,
  });
};

const useLatheGeometry = (
  profile: readonly (readonly [number, number])[],
  scale: number,
  segments = 28,
): BufferGeometry => {
  const geometry = useMemo(
    () =>
      new LatheGeometry(
        profile.map(
          ([across, along]) => new Vector2(across * scale, along * scale),
        ),
        segments,
      ),
    [profile, scale, segments],
  );
  useDisposedOnUnmount(geometry);
  return geometry;
};

const useRoundedBox = (
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = 2,
): BufferGeometry => {
  const geometry = useMemo(
    () => new RoundedBoxGeometry(width, height, depth, segments, radius),
    [width, height, depth, radius, segments],
  );
  useDisposedOnUnmount(geometry);
  return geometry;
};

const useExtrudedShape = (
  buildShape: () => Shape,
  depth: number,
): BufferGeometry => {
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(buildShape(), {
        depth,
        bevelEnabled: true,
        bevelSize: depth * 0.4,
        bevelThickness: depth * 0.4,
        bevelSegments: 2,
        curveSegments: 10,
      }).center(),
    [buildShape, depth],
  );
  useDisposedOnUnmount(geometry);
  return geometry;
};

const useTube = (
  buildPoints: () => Vector3[],
  radius: number,
  segments: number,
): BufferGeometry => {
  const geometry = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3(buildPoints()),
        segments,
        radius,
        8,
        false,
      ),
    [buildPoints, radius, segments],
  );
  useDisposedOnUnmount(geometry);
  return geometry;
};

const Glass = ({ opacity = 0.28 }: { opacity?: number }) => (
  <meshPhysicalMaterial
    color={labPalette.glass}
    roughness={0.05}
    metalness={0}
    clearcoat={1}
    clearcoatRoughness={0.03}
    transparent
    opacity={opacity}
    depthWrite={false}
  />
);

const Satin = ({ color }: { color: string }) => (
  <meshPhysicalMaterial
    color={color}
    roughness={0.42}
    clearcoat={0.5}
    clearcoatRoughness={0.3}
  />
);

const Gloss = ({ color }: { color: string }) => (
  <meshPhysicalMaterial
    color={color}
    roughness={0.18}
    clearcoat={1}
    clearcoatRoughness={0.06}
  />
);

const Metal = ({ color = labPalette.steel }: { color?: string }) => (
  <meshStandardMaterial color={color} metalness={0.9} roughness={0.28} />
);

const Glow = ({ color }: { color: string }) => (
  <meshBasicMaterial color={color} toneMapped={false} />
);

const shelfFlasks = [
  { x: -6.6, height: 1.1 },
  { x: -5.5, height: 0.8 },
  { x: -4.6, height: 1.3 },
  { x: 4.4, height: 0.9 },
  { x: 5.3, height: 1.25 },
  { x: 6.3, height: 0.75 },
  { x: 7.2, height: 1.05 },
];

const flaskProfile = [
  [0, 0],
  [0.32, 0],
  [0.34, 0.06],
  [0.12, 0.62],
  [0.1, 0.9],
  [0.12, 1],
] as const;

const ShelfGlassware = () => {
  const flasks = useRef<InstancedMesh>(null);
  const geometry = useLatheGeometry(flaskProfile, 1, 12);

  useLayoutEffect(() => {
    const mesh = flasks.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    shelfFlasks.forEach(({ x, height }, index) => {
      placer.position.set(x, shelfHeight + 0.04, shelfZ);
      placer.scale.set(height * 0.7, height, height * 0.7);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh
      ref={flasks}
      args={[geometry, undefined, shelfFlasks.length]}
      frustumCulled={false}
      name="shelf-glassware"
    >
      <Glass opacity={0.22} />
    </instancedMesh>
  );
};

const LabBench = () => {
  const top = useRoundedBox(24, 0.32, benchDepth, 0.08);
  const benchCentreZ = benchFrontZ - benchDepth / 2;

  return (
    <group name="lab-bench">
      <mesh geometry={top} position={[0, benchTopHeight - 0.16, benchCentreZ]}>
        <meshPhysicalMaterial
          color={labPalette.benchTop}
          roughness={0.32}
          clearcoat={0.7}
          clearcoatRoughness={0.2}
        />
      </mesh>
      <mesh position={[0, benchTopHeight - 0.2, benchFrontZ + 0.01]}>
        <boxGeometry args={[24, 0.05, 0.05]} />
        <Metal color={labPalette.benchTrim} />
      </mesh>
      <mesh position={[0, benchTopHeight - 0.33, benchFrontZ - 0.02]}>
        <boxGeometry args={[24, 0.025, 0.025]} />
        <Glow color={labPalette.benchLight} />
      </mesh>
    </group>
  );
};

const LabStage = ({ companionMood }: { companionMood: CompanionMood }) => {
  const wall = useMemo(() => buildLabWallMaterial(), []);
  useDisposedOnUnmount(wall);

  return (
    <>
      <StudioLights />
      <mesh position={[0, 0, -8]} material={wall} renderOrder={-1}>
        <planeGeometry args={[60, 30]} />
      </mesh>
      <mesh position={[0, shelfHeight, shelfZ]}>
        <boxGeometry args={[30, 0.08, 0.9]} />
        <Satin color={labPalette.shelf} />
      </mesh>
      <ShelfGlassware />
      <LabBench />
      <StudioCompanion mood={companionMood} />
    </>
  );
};

const buildFlowerHead = (): Shape => {
  const points = Array.from({ length: 72 }, (_, index) => {
    const angle = (index / 72) * Math.PI * 2;
    const reach = 0.16 + 0.13 * Math.abs(Math.cos(angle * 3));
    return new Vector2(Math.cos(angle) * reach, Math.sin(angle) * reach);
  });
  return new Shape(points);
};

const buildLeafShape = (): Shape => {
  const leaf = new Shape();
  leaf.moveTo(0, -0.45);
  leaf.quadraticCurveTo(0.34, -0.1, 0, 0.45);
  leaf.quadraticCurveTo(-0.34, -0.1, 0, -0.45);
  return leaf;
};

const buildHeartShape = (): Shape => {
  const heart = new Shape();
  heart.moveTo(0, -0.42);
  heart.bezierCurveTo(-0.5, -0.05, -0.42, 0.38, -0.12, 0.34);
  heart.bezierCurveTo(-0.02, 0.33, 0, 0.24, 0, 0.2);
  heart.bezierCurveTo(0, 0.24, 0.02, 0.33, 0.12, 0.34);
  heart.bezierCurveTo(0.42, 0.38, 0.5, -0.05, 0, -0.42);
  return heart;
};

const buildSpiralPoints = (): Vector3[] =>
  Array.from({ length: 40 }, (_, index) => {
    const angle = (index / 39) * Math.PI * 5;
    const reach = 0.04 * Math.exp(angle * 0.16);
    return new Vector3(Math.cos(angle) * reach, Math.sin(angle) * reach, 0);
  });

const buildHelixPoints = (phase: number) => (): Vector3[] =>
  Array.from({ length: 36 }, (_, index) => {
    const along = index / 35;
    const angle = along * Math.PI * 4 + phase;
    return new Vector3(
      Math.cos(angle) * 0.22,
      along * 1.2 - 0.6,
      Math.sin(angle) * 0.22,
    );
  });

const buildFirstHelix = buildHelixPoints(0);
const buildSecondHelix = buildHelixPoints(Math.PI);

const eggProfile = [
  [0, -0.36],
  [0.17, -0.32],
  [0.25, -0.18],
  [0.26, 0],
  [0.21, 0.18],
  [0.12, 0.32],
  [0, 0.38],
] as const;

const toothProfile = [
  [0, 0.2],
  [0.2, 0.22],
  [0.28, 0.14],
  [0.27, -0.02],
  [0.2, -0.08],
  [0, -0.08],
] as const;

const potProfile = [
  [0, -0.5],
  [0.2, -0.5],
  [0.27, -0.1],
  [0.3, -0.08],
  [0.3, 0],
  [0, 0],
] as const;

const bulbProfile = [
  [0.09, -0.12],
  [0.14, 0],
  [0.27, 0.2],
  [0.3, 0.38],
  [0.24, 0.56],
  [0, 0.64],
] as const;

const dropProfile = [
  [0, -0.3],
  [0.22, -0.24],
  [0.28, -0.08],
  [0.2, 0.12],
  [0.06, 0.32],
  [0, 0.4],
] as const;

const beakerProfile = [
  [0, -0.4],
  [0.3, -0.4],
  [0.31, -0.36],
  [0.31, 0.32],
  [0.36, 0.38],
] as const;

const FlowerProp = () => {
  const head = useExtrudedShape(buildFlowerHead, 0.04);
  const leaf = useExtrudedShape(buildLeafShape, 0.02);
  return (
    <group position={[0, -0.1, 0]}>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.8, 10]} />
        <Satin color={labPalette.stem} />
      </mesh>
      <mesh
        geometry={leaf}
        position={[0.13, -0.2, 0]}
        rotation={[0, 0, -0.9]}
        scale={0.45}
      >
        <Satin color={labPalette.leaf} />
      </mesh>
      <mesh geometry={head} position={[0, 0.38, 0.02]}>
        <Gloss color={labPalette.petal} />
      </mesh>
      <mesh position={[0, 0.38, 0.07]}>
        <sphereGeometry args={[0.09, 20, 14]} />
        <Satin color={labPalette.petalCentre} />
      </mesh>
    </group>
  );
};

const SeedlingProp = () => {
  const pot = useLatheGeometry(potProfile, 1);
  const leaf = useExtrudedShape(buildLeafShape, 0.02);
  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={pot}>
        <Satin color={labPalette.pot} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.02, 24]} />
        <Satin color={labPalette.soil} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.38, 8]} />
        <Satin color={labPalette.stem} />
      </mesh>
      <mesh
        geometry={leaf}
        position={[-0.14, 0.34, 0]}
        rotation={[0, 0, 1.0]}
        scale={0.4}
      >
        <Satin color={labPalette.leaf} />
      </mesh>
      <mesh
        geometry={leaf}
        position={[0.14, 0.34, 0]}
        rotation={[0, 0, -1.0]}
        scale={0.4}
      >
        <Satin color={labPalette.leaf} />
      </mesh>
    </group>
  );
};

const TreeProp = () => (
  <group>
    <mesh position={[0, -0.25, 0]}>
      <cylinderGeometry args={[0.06, 0.1, 0.55, 10]} />
      <Satin color={labPalette.bark} />
    </mesh>
    <mesh position={[0, 0.22, 0]} scale={[1, 0.85, 1]}>
      <icosahedronGeometry args={[0.38, 2]} />
      <meshStandardMaterial
        color={labPalette.leaf}
        roughness={0.8}
        flatShading
      />
    </mesh>
    <mesh position={[0.18, 0.05, 0.12]}>
      <icosahedronGeometry args={[0.2, 1]} />
      <meshStandardMaterial
        color={labPalette.stem}
        roughness={0.8}
        flatShading
      />
    </mesh>
  </group>
);

const LeafProp = () => {
  const leaf = useExtrudedShape(buildLeafShape, 0.03);
  return (
    <group rotation={[0, 0, -0.5]}>
      <mesh geometry={leaf} scale={1.2}>
        <Gloss color={labPalette.leaf} />
      </mesh>
      <mesh position={[0, -0.04, 0.05]}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 6]} />
        <Satin color={labPalette.stem} />
      </mesh>
    </group>
  );
};

const EggProp = () => {
  const egg = useLatheGeometry(eggProfile, 1.2);
  return (
    <group>
      <mesh geometry={egg} position={[0, 0.05, 0]}>
        <Satin color={labPalette.shell} />
      </mesh>
      <mesh position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.04, 8, 20]} />
        <Metal color={labPalette.brass} />
      </mesh>
    </group>
  );
};

const ToothProp = () => {
  const crown = useLatheGeometry(toothProfile, 1.3, 20);
  return (
    <group position={[0, 0.1, 0]}>
      <mesh geometry={crown}>
        <Gloss color={labPalette.enamel} />
      </mesh>
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, -0.3, 0]} rotation={[Math.PI, 0, x * 0.8]}>
          <coneGeometry args={[0.1, 0.42, 14]} />
          <Gloss color={labPalette.enamel} />
        </mesh>
      ))}
    </group>
  );
};

const HeartProp = () => {
  const heart = useExtrudedShape(buildHeartShape, 0.16);
  return (
    <group>
      <mesh geometry={heart} scale={1.2}>
        <Gloss color={labPalette.heart} />
      </mesh>
      <mesh position={[-0.08, 0.42, 0]} rotation={[0, 0, 0.2]}>
        <torusGeometry args={[0.12, 0.05, 10, 20, Math.PI]} />
        <Gloss color={labPalette.heart} />
      </mesh>
      <mesh position={[0.16, 0.38, -0.02]}>
        <cylinderGeometry args={[0.045, 0.05, 0.22, 12]} />
        <Gloss color={labPalette.vessel} />
      </mesh>
    </group>
  );
};

const MagnifierProp = () => (
  <group rotation={[0, 0, -0.6]} position={[0, 0.05, 0]}>
    <mesh position={[0, 0.18, 0]}>
      <torusGeometry args={[0.3, 0.04, 10, 28]} />
      <Metal color={labPalette.brass} />
    </mesh>
    <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.29, 0.29, 0.03, 32]} />
      <Glass opacity={0.35} />
    </mesh>
    <mesh position={[0, -0.36, 0]}>
      <cylinderGeometry args={[0.045, 0.055, 0.5, 14]} />
      <Satin color={labPalette.batteryBody} />
    </mesh>
  </group>
);

const MicroscopeProp = () => {
  const base = useRoundedBox(0.6, 0.08, 0.42, 0.03);
  return (
    <group position={[0, -0.05, 0]}>
      <mesh geometry={base} position={[0, -0.42, 0]}>
        <Satin color={labPalette.batteryBody} />
      </mesh>
      <mesh position={[-0.12, -0.12, -0.08]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.08, 0.6, 0.12]} />
        <Satin color={labPalette.steel} />
      </mesh>
      <mesh position={[0.05, -0.18, 0]}>
        <boxGeometry args={[0.34, 0.03, 0.3]} />
        <Metal color={labPalette.darkSteel} />
      </mesh>
      <mesh position={[0.06, 0.16, 0]} rotation={[0, 0, -0.32]}>
        <cylinderGeometry args={[0.06, 0.05, 0.5, 18]} />
        <Metal />
      </mesh>
      <mesh position={[0.14, 0.43, 0]} rotation={[0, 0, -0.32]}>
        <cylinderGeometry args={[0.045, 0.045, 0.1, 14]} />
        <Satin color={labPalette.batteryBody} />
      </mesh>
    </group>
  );
};

const MagnetProp = () => (
  <group position={[0, 0.1, 0]}>
    <mesh rotation={[0, 0, 0]}>
      <torusGeometry args={[0.26, 0.09, 14, 30, Math.PI]} />
      <Gloss color={labPalette.magnetRed} />
    </mesh>
    {[-0.26, 0.26].map((x) => (
      <mesh key={x} position={[x, -0.16, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.32, 16]} />
        <Metal />
      </mesh>
    ))}
  </group>
);

const BulbProp = () => {
  const glass = useLatheGeometry(bulbProfile, 1);
  return (
    <group position={[0, -0.12, 0]}>
      <mesh geometry={glass}>
        <Glass opacity={0.32} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.07, 0.008, 6, 20, Math.PI]} />
        <Glow color={labPalette.filament} />
      </mesh>
      <mesh position={[0, -0.24, 0]}>
        <cylinderGeometry args={[0.1, 0.09, 0.26, 18]} />
        <Metal color={labPalette.brass} />
      </mesh>
    </group>
  );
};

const BatteryProp = () => (
  <group rotation={[0, 0, 0.2]}>
    <mesh>
      <cylinderGeometry args={[0.2, 0.2, 0.78, 28]} />
      <Gloss color={labPalette.batteryBody} />
    </mesh>
    <mesh position={[0, 0.24, 0]}>
      <cylinderGeometry args={[0.205, 0.205, 0.3, 28]} />
      <Gloss color={labPalette.batteryBand} />
    </mesh>
    <mesh position={[0, 0.43, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 0.08, 16]} />
      <Metal />
    </mesh>
  </group>
);

const PlanetProp = () => (
  <group rotation={[0.35, 0, 0.25]}>
    <mesh>
      <sphereGeometry args={[0.36, 26, 18]} />
      <Satin color={labPalette.planet} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.56, 0.035, 6, 48]} />
      <Satin color={labPalette.planetRing} />
    </mesh>
    <mesh position={[0.62, 0.32, 0]}>
      <sphereGeometry args={[0.07, 14, 10]} />
      <Satin color={labPalette.moon} />
    </mesh>
  </group>
);

const SunProp = () => (
  <group>
    <mesh>
      <sphereGeometry args={[0.38, 26, 18]} />
      <meshStandardMaterial
        color={labPalette.sun}
        emissive={labPalette.sun}
        emissiveIntensity={1.4}
      />
    </mesh>
    <mesh>
      <torusGeometry args={[0.5, 0.012, 6, 48]} />
      <Glow color={labPalette.petalCentre} />
    </mesh>
  </group>
);

const MoonProp = () => (
  <mesh>
    <icosahedronGeometry args={[0.4, 3]} />
    <meshStandardMaterial
      color={labPalette.moon}
      roughness={0.95}
      flatShading
    />
  </mesh>
);

const IceCubeProp = () => {
  const cube = useRoundedBox(0.42, 0.42, 0.42, 0.06);
  return (
    <group>
      <mesh
        geometry={cube}
        position={[-0.12, -0.12, 0]}
        rotation={[0.2, 0.5, 0]}
      >
        <meshPhysicalMaterial
          color={labPalette.ice}
          roughness={0.08}
          clearcoat={1}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh
        geometry={cube}
        position={[0.16, 0.22, -0.05]}
        rotation={[0.6, 0.2, 0.3]}
        scale={0.8}
      >
        <meshPhysicalMaterial
          color={labPalette.ice}
          roughness={0.08}
          clearcoat={1}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
};

const WaterDropProp = () => {
  const drop = useLatheGeometry(dropProfile, 1.2);
  return (
    <group position={[0, 0.06, 0]}>
      <mesh geometry={drop}>
        <meshPhysicalMaterial
          color={labPalette.water}
          roughness={0.05}
          clearcoat={1}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.015, 6, 36]} />
        <Glow color={labPalette.water} />
      </mesh>
    </group>
  );
};

const RockProp = () => (
  <group>
    <mesh scale={[1.2, 0.8, 0.95]}>
      <icosahedronGeometry args={[0.34, 1]} />
      <meshStandardMaterial
        color={labPalette.rock}
        roughness={0.9}
        flatShading
      />
    </mesh>
    <mesh position={[0.36, -0.2, 0.1]} scale={[1, 0.7, 0.9]}>
      <icosahedronGeometry args={[0.13, 1]} />
      <meshStandardMaterial
        color={labPalette.slab}
        roughness={0.9}
        flatShading
      />
    </mesh>
  </group>
);

const PrismProp = () => (
  <group>
    <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]} position={[-0.1, 0, 0]}>
      <cylinderGeometry args={[0.3, 0.3, 0.5, 3]} />
      <Glass opacity={0.4} />
    </mesh>
    {labPalette.rays.map((colour, index) => (
      <mesh
        key={colour}
        position={[0.38, -0.02 - index * 0.06, 0]}
        rotation={[0, 0, -0.18 - index * 0.08]}
      >
        <boxGeometry args={[0.5, 0.02, 0.02]} />
        <Glow color={colour} />
      </mesh>
    ))}
  </group>
);

const TuningForkProp = () => (
  <group rotation={[0, 0, 0.15]}>
    {[-0.1, 0.1].map((x) => (
      <mesh key={x} position={[x, 0.2, 0]}>
        <boxGeometry args={[0.05, 0.6, 0.05]} />
        <Metal />
      </mesh>
    ))}
    <mesh position={[0, -0.1, 0]} rotation={[0, 0, Math.PI]}>
      <torusGeometry args={[0.1, 0.025, 8, 18, Math.PI]} />
      <Metal />
    </mesh>
    <mesh position={[0, -0.36, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 0.34, 10]} />
      <Metal />
    </mesh>
  </group>
);

const ThermometerProp = () => {
  const plate = useRoundedBox(0.26, 1.05, 0.04, 0.02);
  return (
    <group>
      <mesh geometry={plate} position={[0, 0, -0.06]}>
        <Satin color={labPalette.steel} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 0.86, 16]} />
        <Glass opacity={0.35} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.6, 10]} />
        <Gloss color={labPalette.mercury} />
      </mesh>
      <mesh position={[0, -0.44, 0]}>
        <sphereGeometry args={[0.085, 18, 12]} />
        <Gloss color={labPalette.mercury} />
      </mesh>
    </group>
  );
};

const BeakerProp = () => {
  const beaker = useLatheGeometry(beakerProfile, 1.1);
  return (
    <group>
      <mesh geometry={beaker}>
        <Glass />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.22, 28]} />
        <meshPhysicalMaterial
          color={labPalette.liquids[0]}
          roughness={0.1}
          clearcoat={1}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  );
};

const cloudPuffs = [
  { position: [-0.24, -0.04, 0], radius: 0.22 },
  { position: [0.02, 0.08, 0], radius: 0.3 },
  { position: [0.28, -0.04, 0], radius: 0.2 },
] as const;

const CloudProp = () => (
  <group>
    {cloudPuffs.map(({ position, radius }) => (
      <mesh key={position[0]} position={position}>
        <sphereGeometry args={[radius, 22, 16]} />
        <meshStandardMaterial color={labPalette.cloud} roughness={0.95} />
      </mesh>
    ))}
  </group>
);

const FossilProp = () => {
  const spiral = useTube(buildSpiralPoints, 0.045, 80);
  const slab = useRoundedBox(0.95, 0.7, 0.14, 0.04);
  return (
    <group>
      <mesh geometry={slab} position={[0, 0, -0.08]}>
        <meshStandardMaterial color={labPalette.slab} roughness={0.95} />
      </mesh>
      <mesh geometry={spiral} position={[0, 0, 0]} scale={1.15}>
        <meshStandardMaterial color={labPalette.fossil} roughness={0.7} />
      </mesh>
    </group>
  );
};

const dnaRungCount = 10;

const DnaRungs = () => {
  const rungs = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = rungs.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    for (let index = 0; index < dnaRungCount; index++) {
      const along = (index + 0.5) / dnaRungCount;
      const angle = along * Math.PI * 4;
      placer.position.set(0, along * 1.2 - 0.6, 0);
      placer.rotation.set(0, -angle, Math.PI / 2);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh
      ref={rungs}
      args={[undefined, undefined, dnaRungCount]}
      frustumCulled={false}
    >
      <cylinderGeometry args={[0.015, 0.015, 0.44, 6]} />
      <Satin color={labPalette.dnaRung} />
    </instancedMesh>
  );
};

const DnaProp = () => {
  const first = useTube(buildFirstHelix, 0.035, 64);
  const second = useTube(buildSecondHelix, 0.035, 64);
  return (
    <group>
      <mesh geometry={first}>
        <Gloss color={labPalette.dnaStrands[0]} />
      </mesh>
      <mesh geometry={second}>
        <Gloss color={labPalette.dnaStrands[1]} />
      </mesh>
      <DnaRungs />
    </group>
  );
};

const snowflakeArms = [0, Math.PI / 3, (2 * Math.PI) / 3];

const SnowflakeProp = () => (
  <group>
    {snowflakeArms.map((angle) => (
      <group key={angle} rotation={[0, 0, angle]}>
        <mesh>
          <boxGeometry args={[0.9, 0.05, 0.04]} />
          <Gloss color={labPalette.snow} />
        </mesh>
        <mesh position={[0.28, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.2, 0.035, 0.03]} />
          <Gloss color={labPalette.snow} />
        </mesh>
      </group>
    ))}
  </group>
);

const propModels: Record<LabProp, () => ReactNode> = {
  flower: FlowerProp,
  seedling: SeedlingProp,
  tree: TreeProp,
  leaf: LeafProp,
  egg: EggProp,
  tooth: ToothProp,
  heart: HeartProp,
  magnifier: MagnifierProp,
  microscope: MicroscopeProp,
  magnet: MagnetProp,
  bulb: BulbProp,
  battery: BatteryProp,
  planet: PlanetProp,
  sun: SunProp,
  moon: MoonProp,
  "ice-cube": IceCubeProp,
  "water-drop": WaterDropProp,
  rock: RockProp,
  prism: PrismProp,
  "tuning-fork": TuningForkProp,
  thermometer: ThermometerProp,
  beaker: BeakerProp,
  cloud: CloudProp,
  fossil: FossilProp,
  dna: DnaProp,
  snowflake: SnowflakeProp,
};

// Items are drawn facing the camera; this turns them to show a three-quarter view as they grow.
const itemStartingTurn = -0.55;

/** A question's own item (ADR 0076): one merged mesh, and its glass when it has some. */
export const LabItemModel = ({ item }: { item: LabItem }) => {
  const model = useMemo(() => buildLabItemModel(item), [item]);
  useEffect(
    () => () => {
      model.body.dispose();
      model.glass?.dispose();
    },
    [model],
  );
  return (
    <group rotation={[0, itemStartingTurn, 0]} name={`item-${item}`}>
      <mesh geometry={model.body}>
        <meshStandardMaterial vertexColors roughness={0.55} />
      </mesh>
      {model.glass === undefined ? null : (
        <mesh geometry={model.glass}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.15}
            clearcoat={1}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

export const PropModel = ({ prop }: { prop: LabModel }) => {
  if (!isLabProp(prop)) {
    return <LabItemModel item={prop} />;
  }
  const Model = propModels[prop];
  return <Model />;
};

const PropTurntable = ({ prop }: { prop: LabModel }) => {
  const position = usePromptPosition();
  const { age, motionScale } = usePromptGrowth();
  const turntable = useRef<Group>(null);
  const spinner = useRef<Group>(null);

  useFrame(() => {
    const time = age.current * motionScale;
    turntable.current?.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    if (spinner.current !== null) {
      spinner.current.rotation.y = -0.4 + time * propSpinSpeed;
      spinner.current.position.y = 0.08 + Math.sin(time * 1.3) * 0.04;
    }
  });

  return (
    <group position={position} name={`prop-${prop}`}>
      <group ref={turntable}>
        <group ref={spinner}>
          <group scale={1.3}>
            <PropModel prop={prop} />
          </group>
        </group>
        <mesh position={[0, -turntableDrop, 0]}>
          <cylinderGeometry args={[0.72, 0.8, 0.1, 40]} />
          <meshStandardMaterial
            color={labPalette.turntable}
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
        <mesh
          position={[0, -turntableDrop + 0.055, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.66, 0.012, 4, 48]} />
          <Glow color={labPalette.turntableRing} />
        </mesh>
      </group>
    </group>
  );
};

interface StationChoiceProps extends ChoiceSlot {
  choice: string;
}

const pickColour = (colours: readonly string[], index: number) =>
  colours[index % colours.length];

const SampleTray = (slot: StationChoiceProps) => {
  const { choice } = useGrowingChoice(slot);
  const { radius } = slot;
  // One bevel segment: the trays are many and small, so the item above them gets the triangles.
  const tray = useRoundedBox(
    radius * 1.8,
    radius * 0.32,
    radius * 1.2,
    radius * 0.08,
    1,
  );
  const insert = useRoundedBox(
    radius * 1.5,
    radius * 0.1,
    radius * 0.9,
    radius * 0.04,
    1,
  );
  return (
    <group ref={choice} position={slot.position} name="sample-tray">
      <group rotation={[0.55, 0, 0]}>
        <mesh geometry={tray}>
          <Metal />
        </mesh>
        <mesh geometry={insert} position={[0, radius * 0.13, 0]}>
          <Satin color={pickColour(labPalette.anodised, slot.index)} />
        </mesh>
      </group>
    </group>
  );
};

const jarProfile = [
  [0, -1],
  [0.7, -1],
  [0.75, -0.94],
  [0.75, 0.62],
  [0.62, 0.72],
  [0.62, 0.8],
] as const;

const SpecimenJar = (slot: StationChoiceProps) => {
  const { choice } = useGrowingChoice(slot);
  const { radius } = slot;
  const jar = useLatheGeometry(jarProfile, radius * 0.9);
  return (
    <group ref={choice} position={slot.position} name="specimen-jar">
      <mesh geometry={jar}>
        <Glass />
      </mesh>
      <mesh position={[0, -radius * 0.3, 0]}>
        <cylinderGeometry
          args={[radius * 0.62, radius * 0.62, radius * 1.1, 28]}
        />
        <meshPhysicalMaterial
          color={pickColour(labPalette.liquids, slot.index)}
          roughness={0.1}
          clearcoat={1}
          transparent
          opacity={0.7}
        />
      </mesh>
      <mesh position={[0, radius * 0.8, 0]}>
        <cylinderGeometry
          args={[radius * 0.6, radius * 0.6, radius * 0.18, 28]}
        />
        <Metal color={labPalette.darkSteel} />
      </mesh>
    </group>
  );
};

const IlluminatedKey = (slot: StationChoiceProps) => {
  const { choice } = useGrowingChoice(slot);
  const { radius } = slot;
  const cap = useRoundedBox(
    radius * 1.7,
    radius * 0.5,
    radius * 1.3,
    radius * 0.16,
  );
  const glow =
    slot.choice === "True" ? labPalette.keyTrue : labPalette.keyFalse;
  return (
    <group ref={choice} position={slot.position} name="illuminated-key">
      <group rotation={[0.7, 0, 0]}>
        <mesh geometry={cap}>
          <meshPhysicalMaterial
            color={glow}
            emissive={glow}
            emissiveIntensity={0.35}
            roughness={0.25}
            clearcoat={1}
          />
        </mesh>
        <mesh position={[0, -radius * 0.32, 0]}>
          <boxGeometry args={[radius * 1.9, radius * 0.14, radius * 1.5]} />
          <Metal color={labPalette.darkSteel} />
        </mesh>
      </group>
    </group>
  );
};

const GlassTile = (slot: StationChoiceProps) => {
  const { choice } = useGrowingChoice(slot);
  const { radius } = slot;
  const tile = useRoundedBox(
    radius * 1.9,
    radius * 1.1,
    radius * 0.16,
    radius * 0.06,
  );
  return (
    <group ref={choice} position={slot.position} name="glass-tile">
      <mesh geometry={tile} rotation={[-0.12, 0, 0]}>
        <meshPhysicalMaterial
          color={labPalette.glass}
          roughness={0.35}
          clearcoat={1}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -radius * 0.62, 0]}>
        <boxGeometry args={[radius * 1.7, radius * 0.05, radius * 0.05]} />
        <Glow color={pickColour(labPalette.liquids, slot.index)} />
      </mesh>
    </group>
  );
};

const HexTile = (slot: StationChoiceProps) => {
  const { choice, age, motionScale } = useGrowingChoice(slot);
  const tilt = useRef<Group>(null);
  const { radius } = slot;
  useFrame(() => {
    if (tilt.current !== null) {
      tilt.current.rotation.z =
        Math.PI / 6 +
        Math.sin(age.current * 0.8 + slot.index) * 0.08 * motionScale;
    }
  });
  return (
    <group ref={choice} position={slot.position} name="hex-tile">
      <group ref={tilt}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[radius * 0.95, radius * 0.95, radius * 0.24, 6]}
          />
          <meshPhysicalMaterial
            color={pickColour(labPalette.anodised, slot.index)}
            metalness={0.5}
            roughness={0.3}
            clearcoat={0.8}
            flatShading
          />
        </mesh>
        <mesh position={[0, 0, radius * 0.13]}>
          <ringGeometry args={[radius * 0.78, radius * 0.82, 6]} />
          <Glow color={labPalette.turntableRing} />
        </mesh>
      </group>
    </group>
  );
};

const PetriDish = (slot: StationChoiceProps) => {
  const { choice } = useGrowingChoice(slot);
  const { radius } = slot;
  return (
    <group ref={choice} position={slot.position} name="petri-dish">
      <group rotation={[1.0, 0, 0]}>
        <mesh>
          <cylinderGeometry
            args={[radius, radius, radius * 0.22, 36, 1, true]}
          />
          <Glass opacity={0.35} />
        </mesh>
        <mesh position={[0, -radius * 0.05, 0]}>
          <cylinderGeometry
            args={[radius * 0.96, radius * 0.96, radius * 0.08, 36]}
          />
          <meshPhysicalMaterial
            color={pickColour(labPalette.liquids, slot.index)}
            roughness={0.5}
            clearcoat={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>
    </group>
  );
};

const conicalFlaskProfile = [
  [0, -1],
  [0.86, -1],
  [0.9, -0.92],
  [0.3, 0.4],
  [0.26, 0.9],
  [0.32, 1],
] as const;

const ConicalFlask = (slot: StationChoiceProps) => {
  const { choice } = useGrowingChoice(slot);
  const { radius } = slot;
  const flask = useLatheGeometry(conicalFlaskProfile, radius * 0.9);
  return (
    <group ref={choice} position={slot.position} name="conical-flask">
      <mesh geometry={flask}>
        <Glass />
      </mesh>
      <mesh position={[0, -radius * 0.66, 0]}>
        <cylinderGeometry
          args={[radius * 0.55, radius * 0.76, radius * 0.48, 28]}
        />
        <meshPhysicalMaterial
          color={pickColour(labPalette.liquids, slot.index)}
          roughness={0.1}
          clearcoat={1}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  );
};

const DataCard = (slot: StationChoiceProps) => {
  const { choice } = useGrowingChoice(slot);
  const { radius } = slot;
  const card = useRoundedBox(
    radius * 1.9,
    radius * 1.2,
    radius * 0.08,
    radius * 0.08,
  );
  return (
    <group ref={choice} position={slot.position} name="data-card">
      <group rotation={[-0.1, 0.12 * (slot.index - 1.5), 0]}>
        <mesh geometry={card}>
          <meshStandardMaterial
            color={pickColour(labPalette.anodised, slot.index)}
            metalness={0.75}
            roughness={0.32}
          />
        </mesh>
        <mesh position={[-radius * 0.55, radius * 0.38, radius * 0.05]}>
          <boxGeometry args={[radius * 0.5, radius * 0.08, radius * 0.01]} />
          <Glow color={labPalette.turntableRing} />
        </mesh>
      </group>
    </group>
  );
};

const GraduatedCylinder = (slot: StationChoiceProps) => {
  const { choice } = useGrowingChoice(slot);
  const { radius } = slot;
  const fill = 0.35 + ((slot.index * 0.37) % 1) * 0.5;
  const height = radius * 1.9;
  return (
    <group ref={choice} position={slot.position} name="graduated-cylinder">
      <mesh>
        <cylinderGeometry
          args={[radius * 0.42, radius * 0.42, height, 28, 1, true]}
        />
        <Glass />
      </mesh>
      <mesh position={[0, -height / 2 + (height * fill) / 2, 0]}>
        <cylinderGeometry
          args={[radius * 0.39, radius * 0.39, height * fill, 28]}
        />
        <meshPhysicalMaterial
          color={pickColour(labPalette.liquids, slot.index)}
          roughness={0.1}
          clearcoat={1}
          transparent
          opacity={0.75}
        />
      </mesh>
      <mesh position={[0, -height / 2 - radius * 0.05, 0]}>
        <cylinderGeometry
          args={[radius * 0.7, radius * 0.75, radius * 0.1, 6]}
        />
        <Metal color={labPalette.darkSteel} />
      </mesh>
    </group>
  );
};

const InstrumentCase = (slot: StationChoiceProps) => {
  const { choice } = useGrowingChoice(slot);
  const { radius } = slot;
  const body = useRoundedBox(
    radius * 1.8,
    radius * 1.15,
    radius * 0.6,
    radius * 0.12,
  );
  return (
    <group ref={choice} position={slot.position} name="instrument-case">
      <group rotation={[0.2, 0.15 * (slot.index - 1.5), 0]}>
        <mesh geometry={body}>
          <Satin color={pickColour(labPalette.anodised, slot.index)} />
        </mesh>
        <mesh position={[0, radius * 0.62, 0]}>
          <torusGeometry args={[radius * 0.3, radius * 0.06, 6, 14, Math.PI]} />
          <Metal />
        </mesh>
        <mesh position={[0, 0, radius * 0.31]}>
          <boxGeometry args={[radius * 1.82, radius * 0.08, radius * 0.02]} />
          <Metal />
        </mesh>
      </group>
    </group>
  );
};

const stationChoiceModels: Record<
  LabStation,
  (props: StationChoiceProps) => ReactNode
> = {
  sort: SampleTray,
  "odd-one-out": SpecimenJar,
  "true-false": IlluminatedKey,
  "fill-gap": GlassTile,
  sequence: HexTile,
  mystery: PetriDish,
  predict: ConicalFlask,
  vocabulary: DataCard,
  compare: GraduatedCylinder,
  investigate: InstrumentCase,
};

export const StationChoice = ({
  station,
  ...choiceProps
}: StationChoiceProps & { station: LabStation }) => {
  const Model = stationChoiceModels[station];
  return <Model {...choiceProps} />;
};

export const ScienceLabWorld = ({
  prompt,
  choices,
  hiddenChoiceIndexes,
  companionMood,
  poppedChoiceIndex,
  popCount,
  isEffectsOn,
}: ScienceLabWorldProps) => {
  const radius = useChoiceRadius();
  const choicePositions = useChoicePositions(choices.length, "science-lab");
  const science = prompt?.kind === "lab" ? prompt : undefined;
  const poppedPosition =
    poppedChoiceIndex === undefined
      ? undefined
      : choicePositions[poppedChoiceIndex];

  return (
    <>
      <LabStage companionMood={companionMood} />
      {science === undefined ? null : (
        <group key={science.prop}>
          <PropTurntable prop={science.prop} />
        </group>
      )}
      {science === undefined
        ? null
        : choices.map((choice, index) =>
            hiddenChoiceIndexes.includes(index) ? null : (
              <group key={`${String(popCount)}-${choice}`}>
                <StationChoice
                  station={science.station}
                  choice={choice}
                  position={choicePositions[index]}
                  radius={radius}
                  index={index}
                />
              </group>
            ),
          )}
      {isEffectsOn && poppedPosition !== undefined ? (
        <BubbleBurst
          key={`burst-${String(popCount)}`}
          position={poppedPosition}
          radius={radius}
        />
      ) : null}
    </>
  );
};
