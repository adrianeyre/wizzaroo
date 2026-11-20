import { useFrame, useThree } from "@react-three/fiber";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  Object3D,
  ShaderMaterial,
  Shape,
  Vector2,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { EnglishGameType } from "../curriculum/english-games.js";
import {
  gapMark,
  type EnglishPrompt,
  type WordLink,
} from "../curriculum/english-questions.js";
import {
  useTextTexture,
  type TextBlock,
  type TextFace,
} from "./canvas-text.js";
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
  useMotionScale,
  usePromptGrowth,
  usePromptPosition,
  type ChoiceSlot,
  type CompanionMood,
} from "./studio-stage.js";

export interface WoodsGameWorldProps {
  gameType: EnglishGameType;
  prompt: QuestionPrompt | undefined;
  choices: readonly string[];
  hiddenChoiceIndexes: readonly number[];
  companionMood: CompanionMood;
  poppedChoiceIndex: number | undefined;
  popCount: number;
  isEffectsOn: boolean;
}

const woodsPalette = {
  skyTop: "#070b1f",
  skyBottom: "#1b3a4b",
  moon: "#fff4d6",
  mist: "#8fc3bd",
  floorNear: "#21402c",
  floorFar: "#0f2420",
  treeNear: "#14352b",
  treeFar: "#24504a",
  trunk: "#2e2017",
  firefly: "#ffe08a",
  wood: "#8a5a33",
  woodDark: "#4f321d",
  woodLight: "#b07a4a",
  brass: "#c9a227",
  iron: "#2b2f33",
  stone: "#8a9095",
  stoneDark: "#4f565c",
  moss: "#4d7a3f",
  paper: "#f59e42",
  glow: "#ff7a00",
  glass: "#d7f1ff",
  potions: ["#7c3aed", "#0ea5e9", "#e11d48", "#16a34a"],
  leaves: ["#c2410c", "#b45309", "#a16207", "#9f1239"],
  stones: ["#6b7280", "#78716c", "#57534e", "#64748b"],
  acorn: "#8b5a2b",
  acornCap: "#5b3a1e",
  bookCover: "#7f1d1d",
  gap: "#fcd34d",
  parchment: "#e9d3a4",
  flame: "#ff9a3c",
  firelight: "#ffb45e",
  candle: "#f3ead2",
  ribbon: "#b91c1c",
} as const;

const woodsTime = { value: 0 };

const useWoodsClock = () => {
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    woodsTime.value += deltaSeconds * motionScale;
  });
};

const plainVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const nightSkyFragmentShader = `
uniform vec3 skyTop;
uniform vec3 skyBottom;
uniform vec3 moon;
uniform float time;
varying vec2 vUv;

float findStar(vec2 cell) {
  return fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 colour = mix(skyBottom, skyTop, smoothstep(0.1, 0.95, vUv.y));
  vec2 fromMoon = (vUv - vec2(0.72, 0.78)) * vec2(2.0, 1.0);
  float moonReach = length(fromMoon);
  colour += moon * (1.0 - smoothstep(0.0, 0.35, moonReach)) * 0.22;
  colour = mix(colour, moon, 1.0 - smoothstep(0.03, 0.036, moonReach));
  vec2 starGrid = vUv * vec2(420.0, 210.0);
  vec2 starCell = floor(starGrid);
  float starDot = 1.0 - smoothstep(0.06, 0.22, length(fract(starGrid) - 0.5));
  float star = step(0.985, findStar(starCell)) * starDot;
  float twinkle = 0.6 + 0.4 * sin(time * 1.7 + findStar(starCell + 3.1) * 40.0);
  colour += vec3(star * twinkle * smoothstep(0.45, 0.9, vUv.y) * 0.7);
  gl_FragColor = vec4(colour, 1.0);
}
`;

const forestFloorFragmentShader = `
uniform vec3 floorNear;
uniform vec3 floorFar;
uniform vec3 moon;
varying vec2 vUv;

void main() {
  vec3 colour = mix(floorNear, floorFar, smoothstep(0.15, 0.95, vUv.y));
  float ripple = sin(vUv.x * 61.0 + sin(vUv.y * 23.0) * 2.0) * sin(vUv.y * 47.0 + vUv.x * 9.0);
  colour *= 0.95 + ripple * 0.05;
  float pool = 1.0 - smoothstep(0.0, 0.42, distance(vUv, vec2(0.55, 0.25)));
  colour += moon * pool * 0.08;
  gl_FragColor = vec4(colour, 1.0);
}
`;

const mistFragmentShader = `
uniform vec3 mist;
uniform float time;
varying vec2 vUv;

void main() {
  float band = smoothstep(0.0, 0.45, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
  float drift = 0.75 + 0.25 * sin(vUv.x * 9.0 + time * 0.25);
  gl_FragColor = vec4(mist, band * drift * 0.22);
}
`;

const fireflyVertexShader = `
uniform float time;
uniform float pixelRatio;
attribute float phase;
varying float vGlow;

void main() {
  vec3 drifted = position;
  drifted.x += sin(time * 0.6 + phase * 6.0) * 0.35;
  drifted.y += sin(time * 0.9 + phase * 4.0) * 0.25;
  vGlow = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(time * 2.2 + phase * 11.0), 3.0);
  vec4 viewPosition = modelViewMatrix * vec4(drifted, 1.0);
  gl_PointSize = 70.0 * pixelRatio / -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const fireflyFragmentShader = `
uniform vec3 firefly;
varying float vGlow;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float reach = dot(point, point);
  if (reach > 1.0) {
    discard;
  }
  float core = pow(1.0 - reach, 3.0);
  gl_FragColor = vec4(firefly * (0.6 + core), core * vGlow);
}
`;

const buildShaderMaterial = (
  fragmentShader: string,
  colours: Record<string, string>,
  options: { isTransparent?: boolean } = {},
) => {
  const names = Object.keys(colours);
  const values = buildPaletteUniform(Object.values(colours));
  const uniforms: Record<string, { value: unknown }> = { time: woodsTime };
  names.forEach((name, index) => {
    uniforms[name] = { value: values[index] };
  });
  return new ShaderMaterial({
    uniforms,
    vertexShader: plainVertexShader,
    fragmentShader,
    transparent: options.isTransparent ?? false,
    depthWrite: !(options.isTransparent ?? false),
  });
};

const useShaderMaterial = (
  fragmentShader: string,
  colours: Record<string, string>,
  options?: { isTransparent?: boolean },
) => {
  const material = useMemo(
    () => buildShaderMaterial(fragmentShader, colours, options),
    [fragmentShader, colours, options],
  );
  useDisposedOnUnmount(material);
  return material;
};

const skyColours = {
  skyTop: woodsPalette.skyTop,
  skyBottom: woodsPalette.skyBottom,
  moon: woodsPalette.moon,
};
const floorColours = {
  floorNear: woodsPalette.floorNear,
  floorFar: woodsPalette.floorFar,
  moon: woodsPalette.moon,
};
const mistColours = { mist: woodsPalette.mist };
const transparentLayer = { isTransparent: true };

const forestFloorHeight = -2.6;
const goldenRatioFraction = 0.618034;

interface TreeSpot {
  x: number;
  z: number;
  height: number;
}

export const listTreeSpots = (
  count: number,
  depth: number,
  spread: number,
): TreeSpot[] =>
  Array.from({ length: count }, (_, index) => {
    const along = (index * goldenRatioFraction) % 1;
    return {
      x: (along - 0.5) * spread,
      z: depth - ((index * 0.37) % 1) * 1.2,
      height: 3.2 + ((index * 0.71) % 1) * 2.2,
    };
  }).filter(({ x }) => Math.abs(x) > 1.2 || depth < -6);

const treeTiers = [
  { lift: 0.32, width: 0.95, tall: 0.42 },
  { lift: 0.56, width: 0.72, tall: 0.36 },
  { lift: 0.78, width: 0.48, tall: 0.3 },
];

const useForestInstances = (spots: readonly TreeSpot[]) => {
  const foliage = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const placer = new Object3D();
    spots.forEach(({ x, z, height }, spotIndex) => {
      treeTiers.forEach(({ lift, width, tall }, tierIndex) => {
        placer.position.set(x, forestFloorHeight + height * lift, z);
        placer.scale.set(
          width * height * 0.32,
          tall * height,
          width * height * 0.32,
        );
        placer.rotation.set(0, spotIndex + tierIndex, 0);
        placer.updateMatrix();
        foliage.current?.setMatrixAt(
          spotIndex * treeTiers.length + tierIndex,
          placer.matrix,
        );
      });
      placer.position.set(x, forestFloorHeight + height * 0.12, z);
      placer.scale.set(0.12, height * 0.24, 0.12);
      placer.rotation.set(0, 0, 0);
      placer.updateMatrix();
      trunks.current?.setMatrixAt(spotIndex, placer.matrix);
    });
    for (const mesh of [foliage.current, trunks.current]) {
      if (mesh !== null) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }, [spots]);
  return { foliage, trunks };
};

const ForestLayer = ({
  spots,
  colour,
}: {
  spots: readonly TreeSpot[];
  colour: string;
}) => {
  const { foliage, trunks } = useForestInstances(spots);
  return (
    <>
      <instancedMesh
        ref={foliage}
        args={[undefined, undefined, spots.length * treeTiers.length]}
        frustumCulled={false}
      >
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color={colour} roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={trunks}
        args={[undefined, undefined, spots.length]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1.3, 1, 6]} />
        <meshStandardMaterial color={woodsPalette.trunk} roughness={1} />
      </instancedMesh>
    </>
  );
};

const fireflyCount = 26;

const useFireflyGeometry = () => {
  const geometry = useMemo(() => {
    const positions = new Float32Array(fireflyCount * 3);
    const phases = new Float32Array(fireflyCount);
    for (let index = 0; index < fireflyCount; index++) {
      const along = (index * goldenRatioFraction) % 1;
      positions.set(
        [
          (along - 0.5) * 14,
          -1.8 + ((index * 0.43) % 1) * 3.6,
          -1.5 - (index % 5) * 0.8,
        ],
        index * 3,
      );
      phases[index] = (index * 0.29) % 1;
    }
    const fireflies = new BufferGeometry();
    fireflies.setAttribute("position", new BufferAttribute(positions, 3));
    fireflies.setAttribute("phase", new BufferAttribute(phases, 1));
    return fireflies;
  }, []);
  useDisposedOnUnmount(geometry);
  return geometry;
};

const Fireflies = () => {
  const geometry = useFireflyGeometry();
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const material = useMemo(() => {
    const [firefly] = buildPaletteUniform([woodsPalette.firefly]);
    return new ShaderMaterial({
      uniforms: {
        time: woodsTime,
        pixelRatio: { value: pixelRatio },
        firefly: { value: firefly },
      },
      vertexShader: fireflyVertexShader,
      fragmentShader: fireflyFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }, [pixelRatio]);
  useDisposedOnUnmount(material);
  return (
    <points
      name="fireflies"
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
};

const farTrees = listTreeSpots(16, -7, 22);
const nearTrees = listTreeSpots(10, -4.4, 15);

const WoodsBackdrop = () => {
  useWoodsClock();
  const sky = useShaderMaterial(nightSkyFragmentShader, skyColours);
  const floor = useShaderMaterial(forestFloorFragmentShader, floorColours);
  const mist = useShaderMaterial(
    mistFragmentShader,
    mistColours,
    transparentLayer,
  );

  return (
    <group name="woods">
      <mesh position={[0, 0, -9]} material={sky} renderOrder={-1}>
        <planeGeometry args={[64, 32]} />
      </mesh>
      <mesh
        material={floor}
        position={[0, forestFloorHeight, -4]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[44, 16]} />
      </mesh>
      <ForestLayer spots={farTrees} colour={woodsPalette.treeFar} />
      <ForestLayer spots={nearTrees} colour={woodsPalette.treeNear} />
      <mesh
        material={mist}
        position={[0, forestFloorHeight + 0.9, -3.2]}
        renderOrder={2}
      >
        <planeGeometry args={[30, 2.6]} />
      </mesh>
      <Fireflies />
    </group>
  );
};

const WoodsStage = ({ companionMood }: { companionMood: CompanionMood }) => (
  <>
    <StudioLights />
    <hemisphereLight args={[woodsPalette.moon, woodsPalette.floorFar, 0.35]} />
    <WoodsBackdrop />
    <StudioCompanion mood={companionMood} />
  </>
);

const useMemoFace = (face: TextFace): TextFace => {
  const [stableFace, setStableFace] = useState(face);
  if (JSON.stringify(stableFace) !== JSON.stringify(face)) {
    setStableFace(face);
  }
  return stableFace;
};

const TextPanel = ({
  face,
  width,
  height,
  depth = 0.08,
  frameColour,
  framePadding = 0.1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isMetal = false,
}: {
  face: TextFace;
  width: number;
  height: number;
  depth?: number;
  frameColour: string;
  framePadding?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isMetal?: boolean;
}) => {
  const texture = useTextTexture(useMemoFace(face));
  const frame = useMemo(
    () =>
      new RoundedBoxGeometry(
        width + framePadding * 2,
        height + framePadding * 2,
        depth,
        2,
        Math.min(0.06, depth / 2),
      ),
    [width, height, depth, framePadding],
  );
  useDisposedOnUnmount(frame);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={frame}>
        <meshPhysicalMaterial
          color={frameColour}
          roughness={isMetal ? 0.3 : 0.7}
          metalness={isMetal ? 0.8 : 0}
          clearcoat={0.3}
        />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.004]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          key={texture === undefined ? "plain" : "painted"}
          map={texture ?? null}
          color={texture === undefined ? woodsPalette.paper : "#ffffff"}
          roughness={0.85}
        />
      </mesh>
    </group>
  );
};

const describeGap = ({ before, after }: { before: string; after: string }) =>
  [before, "_____", after]
    .filter((part) => part !== "")
    .join(" ")
    .replace(/_ ([.,!?;:”)])/g, "_$1");

const singleBlock = (
  text: string,
  overrides: Partial<TextBlock> = {},
): TextBlock => ({
  text,
  centre: [0.5, 0.5],
  size: [0.86, 0.72],
  ...overrides,
});

const promptShiftLeft = 0.45;

const usePromptMotion = (sway = 0.05) => {
  const [stageX, stageY, stageZ] = usePromptPosition();
  const position = useMemo<[number, number, number]>(
    () => [stageX - promptShiftLeft, stageY, stageZ],
    [stageX, stageY, stageZ],
  );
  const { age, motionScale } = usePromptGrowth();
  const body = useRef<Group>(null);
  useFrame(() => {
    const group = body.current;
    if (group === null) {
      return;
    }
    const time = age.current * motionScale;
    group.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    group.position.y = position[1] + Math.sin(time * 1.1) * sway * 0.6;
    group.rotation.y = Math.sin(time * 0.45) * sway * 2;
  });
  return { body, position, age, motionScale };
};

const TextLabel = ({
  face,
  width,
  height,
  position,
}: {
  face: TextFace;
  width: number;
  height: number;
  position: [number, number, number];
}) => {
  const texture = useTextTexture(face);
  return (
    <mesh position={position} name="text-label">
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture ?? null}
        transparent
        depthWrite={false}
        visible={texture !== undefined}
      />
    </mesh>
  );
};

const carriageWidth = 0.92;
const carriageGap = 0.1;
const engineWidth = 1.0;
const widestTrain = 3.3;

const AlphabetTrain = ({ items }: { items: readonly string[] }) => {
  const { body, position, age, motionScale } = usePromptMotion(0.02);
  const wheels = useRef<InstancedMesh>(null);
  const bases = useRef<InstancedMesh>(null);
  const crates = useRef<InstancedMesh>(null);
  const trainLength =
    items.length * (carriageWidth + carriageGap) + engineWidth;
  const crateGeometry = useMemo(
    () => new RoundedBoxGeometry(carriageWidth - 0.08, 0.52, 0.42, 2, 0.05),
    [],
  );
  useDisposedOnUnmount(crateGeometry);
  const scale = Math.min(1, widestTrain / trainLength);
  const firstX = -trainLength / 2 + carriageWidth / 2;
  const carriageXs = items.map(
    (_item, index) => firstX + index * (carriageWidth + carriageGap),
  );
  const engineX =
    firstX +
    items.length * (carriageWidth + carriageGap) +
    engineWidth / 2 -
    carriageWidth / 2;
  const face = useMemoFace({
    width: 512,
    height: 128,
    style: "clear",
    blocks: items.map((item, index) => ({
      text: item === gapMark ? "?" : item,
      centre: [
        (carriageXs[index] - firstX + carriageWidth / 2) /
          (trainLength - engineWidth),
        0.5,
      ],
      size: [0.9 / items.length, 0.62],
      tone: item === gapMark ? "accent" : "ink",
    })),
  });
  const labelWidth = trainLength - engineWidth;

  useLayoutEffect(() => {
    const placer = new Object3D();
    carriageXs.forEach((x, index) => {
      placer.position.set(x, -0.32, 0);
      placer.scale.set(1, 1, 1);
      placer.rotation.set(0, 0, 0);
      placer.updateMatrix();
      bases.current?.setMatrixAt(index, placer.matrix);
      placer.position.set(x, 0.02, 0);
      placer.updateMatrix();
      crates.current?.setMatrixAt(index, placer.matrix);
    });
    for (const mesh of [bases.current, crates.current]) {
      if (mesh !== null) {
        mesh.count = carriageXs.length;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }, [carriageXs]);

  useFrame(() => {
    const mesh = wheels.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    const roll = -age.current * 3 * motionScale;
    const wheelXs = [...carriageXs, engineX - 0.25, engineX + 0.25].flatMap(
      (x) => [x - 0.28, x + 0.28],
    );
    wheelXs.forEach((x, index) => {
      placer.position.set(x, -0.52, 0.2);
      placer.rotation.set(Math.PI / 2, roll, 0);
      placer.scale.setScalar(1);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    });
    mesh.count = wheelXs.length;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={body} position={position} name="alphabet-train" scale={scale}>
      <mesh position={[0, -0.66, 0]}>
        <boxGeometry args={[trainLength + 0.6, 0.06, 0.5]} />
        <meshStandardMaterial
          color={woodsPalette.iron}
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>
      <instancedMesh
        ref={bases}
        args={[undefined, undefined, 4]}
        frustumCulled={false}
      >
        <boxGeometry args={[carriageWidth, 0.18, 0.5]} />
        <meshStandardMaterial
          color={woodsPalette.iron}
          metalness={0.6}
          roughness={0.35}
        />
      </instancedMesh>
      <instancedMesh
        ref={crates}
        args={[crateGeometry, undefined, 4]}
        frustumCulled={false}
        name="carriages"
      >
        <meshPhysicalMaterial
          color={woodsPalette.wood}
          roughness={0.55}
          clearcoat={0.35}
          clearcoatRoughness={0.3}
        />
      </instancedMesh>
      <instancedMesh
        ref={wheels}
        args={[undefined, undefined, 12]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.13, 0.13, 0.06, 14]} />
        <meshStandardMaterial
          color={woodsPalette.iron}
          metalness={0.85}
          roughness={0.3}
        />
      </instancedMesh>
      <TextLabel
        face={face}
        width={labelWidth}
        height={labelWidth / 4}
        position={[firstX - carriageWidth / 2 + labelWidth / 2, 0.02, 0.22]}
      />
      <group position={[engineX, 0, 0]} name="engine">
        <mesh position={[0.12, -0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.76, 20]} />
          <meshPhysicalMaterial
            color={woodsPalette.bookCover}
            roughness={0.35}
            clearcoat={0.8}
          />
        </mesh>
        <mesh position={[-0.3, 0.12, 0]}>
          <boxGeometry args={[0.36, 0.6, 0.46]} />
          <meshPhysicalMaterial
            color={woodsPalette.woodDark}
            roughness={0.5}
            clearcoat={0.4}
          />
        </mesh>
        <mesh position={[0.32, 0.32, 0]}>
          <cylinderGeometry args={[0.07, 0.1, 0.32, 12]} />
          <meshStandardMaterial
            color={woodsPalette.iron}
            metalness={0.7}
            roughness={0.35}
          />
        </mesh>
      </group>
    </group>
  );
};

const wordLinkLabels: Record<WordLink, string> = {
  "rhymes-with": "Find a word that rhymes with",
  "opposite-of": "Find the opposite of",
  "same-family-as": "Find a word in the same family as",
  "same-meaning-as": "Find a word that means the same as",
  "same-root-as": "Find a word that shares a root with",
  "formal-word-for": "Find a formal word for",
};

const Signpost = ({ word, link }: { word: string; link: WordLink }) => {
  const { body, position } = usePromptMotion(0.03);
  const face = useMemoFace({
    width: 512,
    height: 256,
    style: "wood",
    blocks: [
      singleBlock(wordLinkLabels[link], {
        centre: [0.5, 0.24],
        size: [0.84, 0.2],
        tone: "soft",
        isHeading: false,
      }),
      singleBlock(word, {
        centre: [0.5, 0.62],
        size: [0.84, 0.48],
        tone: "accent",
      }),
    ],
  });
  return (
    <group ref={body} position={position} name="signpost">
      <mesh position={[0, -0.6, -0.08]}>
        <cylinderGeometry args={[0.07, 0.09, 2.4, 10]} />
        <meshStandardMaterial color={woodsPalette.woodDark} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.68, -0.08]}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshStandardMaterial
          color={woodsPalette.brass}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      <TextPanel
        face={face}
        width={2.4}
        height={1.2}
        frameColour={woodsPalette.woodDark}
        position={[0, 0.02, 0]}
      />
    </group>
  );
};

const BalanceScales = ({ text }: { text: string }) => {
  const { body, position, age, motionScale } = usePromptMotion(0.02);
  const beam = useRef<Group>(null);
  const face = useMemoFace({
    width: 512,
    height: 192,
    style: "parchment",
    blocks: [singleBlock(text, { size: [0.88, 0.7] })],
  });
  useFrame(() => {
    if (beam.current !== null) {
      beam.current.rotation.z =
        Math.sin(age.current * 0.9 * motionScale) * 0.12;
    }
  });
  return (
    <group ref={body} position={position} name="balance-scales">
      <mesh position={[0, 0.25, -0.2]}>
        <cylinderGeometry args={[0.05, 0.06, 1.3, 12]} />
        <meshStandardMaterial
          color={woodsPalette.brass}
          metalness={0.85}
          roughness={0.28}
        />
      </mesh>
      <group ref={beam} position={[0, 0.9, -0.2]}>
        <mesh>
          <boxGeometry args={[2.2, 0.06, 0.06]} />
          <meshStandardMaterial
            color={woodsPalette.brass}
            metalness={0.85}
            roughness={0.28}
          />
        </mesh>
        <ScalePans />
      </group>
      <TextPanel
        face={face}
        width={2.6}
        height={0.97}
        frameColour={woodsPalette.woodDark}
        position={[0, -0.45, 0]}
      />
    </group>
  );
};

const ScalePans = () => {
  const pans = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const placer = new Object3D();
    [-1, 1].forEach((side, index) => {
      placer.position.set(side * 1.0, -0.32, 0);
      placer.updateMatrix();
      pans.current?.setMatrixAt(index, placer.matrix);
    });
    if (pans.current !== null) {
      pans.current.instanceMatrix.needsUpdate = true;
    }
  }, []);
  return (
    <instancedMesh
      ref={pans}
      args={[undefined, undefined, 2]}
      frustumCulled={false}
    >
      <sphereGeometry
        args={[0.3, 18, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
      />
      <meshStandardMaterial
        color={woodsPalette.brass}
        metalness={0.85}
        roughness={0.25}
        side={DoubleSide}
      />
    </instancedMesh>
  );
};

const buildGearShape = (teeth: number, outer: number, inner: number) => {
  const points = Array.from({ length: teeth * 4 }, (_, index) => {
    const angle = (index / (teeth * 4)) * Math.PI * 2;
    const reach = index % 4 < 2 ? outer : inner;
    return new Vector2(Math.cos(angle) * reach, Math.sin(angle) * reach);
  });
  return new Shape(points);
};

const WorkshopBoard = ({ text }: { text: string }) => {
  const { body, position, age, motionScale } = usePromptMotion(0.03);
  const gear = useRef<Mesh>(null);
  const gearGeometry = useMemo(
    () =>
      new ExtrudeGeometry(buildGearShape(12, 0.62, 0.5), {
        depth: 0.08,
        bevelEnabled: false,
      }),
    [],
  );
  useDisposedOnUnmount(gearGeometry);
  const face = useMemoFace({
    width: 512,
    height: 256,
    style: "parchment",
    blocks: [
      singleBlock("Make a word that means", {
        centre: [0.5, 0.22],
        size: [0.84, 0.18],
        tone: "soft",
        isHeading: false,
      }),
      singleBlock(text, {
        centre: [0.5, 0.6],
        size: [0.86, 0.5],
        tone: "accent",
      }),
    ],
  });
  useFrame(() => {
    if (gear.current !== null) {
      gear.current.rotation.z = age.current * 0.4 * motionScale;
    }
  });
  return (
    <group ref={body} position={position} name="workshop-board">
      <mesh ref={gear} geometry={gearGeometry} position={[1.15, 0.55, -0.3]}>
        <meshStandardMaterial
          color={woodsPalette.brass}
          metalness={0.85}
          roughness={0.32}
        />
      </mesh>
      <TextPanel
        face={face}
        width={2.5}
        height={1.25}
        frameColour={woodsPalette.wood}
        framePadding={0.14}
      />
    </group>
  );
};

const StoneTablet = ({ text }: { text: string }) => {
  const { body, position } = usePromptMotion(0.02);
  const face = useMemoFace({
    width: 512,
    height: 256,
    style: "stone",
    blocks: [singleBlock(text, { size: [0.86, 0.66] })],
  });
  return (
    <group ref={body} position={position} name="stone-tablet">
      <mesh position={[0, -0.82, -0.05]} scale={[1.45, 0.2, 0.5]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={woodsPalette.moss}
          roughness={0.95}
          flatShading
        />
      </mesh>
      <TextPanel
        face={face}
        width={2.6}
        height={1.3}
        depth={0.22}
        frameColour={woodsPalette.stoneDark}
        framePadding={0.08}
      />
    </group>
  );
};

const cauldronProfile = [
  [0.0, -0.5],
  [0.42, -0.46],
  [0.62, -0.25],
  [0.68, 0.05],
  [0.6, 0.3],
  [0.56, 0.36],
].map(([across, along]) => new Vector2(across, along));

const Cauldron = ({ parts }: { parts: readonly string[] }) => {
  const { body, position, age, motionScale } = usePromptMotion(0.02);
  const brew = useRef<MeshStandardMaterial>(null);
  const geometry = useMemo(() => new LatheGeometry(cauldronProfile, 28), []);
  useDisposedOnUnmount(geometry);
  const face = useMemoFace({
    width: 512,
    height: 160,
    style: "parchment",
    blocks: [singleBlock(parts.join(" + "), { size: [0.9, 0.7] })],
  });
  useFrame(() => {
    if (brew.current !== null) {
      brew.current.emissiveIntensity =
        0.7 + Math.sin(age.current * 3 * motionScale) * 0.25;
    }
  });
  return (
    <group ref={body} position={position} name="cauldron">
      <group position={[0, 0.55, -0.35]} rotation={[0.45, 0, 0]}>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={woodsPalette.iron}
            metalness={0.7}
            roughness={0.45}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.56, 28]} />
          <meshStandardMaterial
            ref={brew}
            color={woodsPalette.potions[0]}
            emissive={woodsPalette.potions[0]}
            roughness={0.2}
          />
        </mesh>
      </group>
      <TextPanel
        face={face}
        width={2.4}
        height={0.75}
        frameColour={woodsPalette.woodDark}
        position={[0, -0.6, 0.25]}
        rotation={[-0.08, 0, 0]}
      />
    </group>
  );
};

const TreasureChest = ({ text }: { text: string }) => {
  const { body, position, age, motionScale } = usePromptMotion(0.02);
  const lid = useRef<Group>(null);
  const face = useMemoFace({
    width: 512,
    height: 192,
    style: "parchment",
    blocks: [singleBlock(text, { size: [0.88, 0.68] })],
  });
  useFrame(() => {
    if (lid.current !== null) {
      lid.current.rotation.x =
        -0.12 - Math.abs(Math.sin(age.current * 1.4 * motionScale)) * 0.1;
    }
  });
  return (
    <group ref={body} position={position} name="treasure-chest">
      <group position={[0, 0.3, -0.3]}>
        <mesh>
          <boxGeometry args={[1.4, 0.7, 0.8]} />
          <meshPhysicalMaterial
            color={woodsPalette.wood}
            roughness={0.6}
            clearcoat={0.3}
          />
        </mesh>
        <group ref={lid} position={[0, 0.35, -0.4]}>
          <mesh position={[0, 0, 0.4]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry
              args={[0.4, 0.4, 1.4, 18, 1, false, 0, Math.PI]}
            />
            <meshPhysicalMaterial
              color={woodsPalette.woodDark}
              roughness={0.55}
              clearcoat={0.4}
              side={DoubleSide}
            />
          </mesh>
        </group>
        <mesh position={[0, 0.2, 0.41]}>
          <boxGeometry args={[0.22, 0.28, 0.04]} />
          <meshStandardMaterial
            color={woodsPalette.brass}
            metalness={0.9}
            roughness={0.25}
          />
        </mesh>
      </group>
      <TextPanel
        face={face}
        width={2.4}
        height={0.9}
        frameColour={woodsPalette.woodDark}
        position={[0, -0.55, 0.2]}
      />
    </group>
  );
};

const HangingScroll = ({ text }: { text: string }) => {
  const { body, position } = usePromptMotion(0.04);
  const face = useMemoFace({
    width: 512,
    height: 256,
    style: "parchment",
    blocks: [singleBlock(text, { size: [0.86, 0.7], isHeading: false })],
  });
  return (
    <group ref={body} position={position} name="hanging-scroll">
      <mesh position={[0, 1.05, -0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 2.9, 12]} />
        <meshStandardMaterial color={woodsPalette.woodDark} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.75, -0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 2.9, 12]} />
        <meshStandardMaterial color={woodsPalette.woodDark} roughness={0.6} />
      </mesh>
      <TextPanel
        face={face}
        width={2.6}
        height={1.6}
        depth={0.02}
        framePadding={0.02}
        frameColour={woodsPalette.paper}
        position={[0, 0.15, 0]}
      />
    </group>
  );
};

const buildRopeGeometry = (from: Vector3, to: Vector3, sag: number) => {
  const middle = from.clone().lerp(to, 0.5);
  middle.y -= sag;
  return new CatmullRomCurve3([from, middle, to]);
};

const RopeBridge = ({ before, after }: { before: string; after: string }) => {
  const { body, position, age, motionScale } = usePromptMotion(0.015);
  const gapGlow = useRef<MeshStandardMaterial>(null);
  const rope = useMemo(
    () =>
      buildRopeGeometry(
        new Vector3(-0.45, 0.05, 0.1),
        new Vector3(0.45, 0.05, 0.1),
        0.18,
      ),
    [],
  );
  const leftFace = useMemoFace({
    width: 384,
    height: 256,
    style: "wood",
    blocks: [
      singleBlock(before === "" ? "…" : before, {
        size: [0.86, 0.76],
        isHeading: false,
      }),
    ],
  });
  const rightFace = useMemoFace({
    width: 384,
    height: 256,
    style: "wood",
    blocks: [
      singleBlock(after === "" ? "…" : after, {
        size: [0.86, 0.76],
        isHeading: false,
      }),
    ],
  });
  useFrame(() => {
    if (gapGlow.current !== null) {
      gapGlow.current.emissiveIntensity =
        0.6 + Math.sin(age.current * 3 * motionScale) * 0.35;
    }
  });
  return (
    <group ref={body} position={position} name="rope-bridge">
      <mesh position={[-1.15, -0.62, -0.1]} scale={[0.9, 0.42, 0.5]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={woodsPalette.stoneDark}
          roughness={0.95}
          flatShading
        />
      </mesh>
      <mesh position={[1.15, -0.62, -0.1]} scale={[0.9, 0.42, 0.5]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={woodsPalette.stoneDark}
          roughness={0.95}
          flatShading
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[rope, 16, 0.025, 6]} />
        <meshStandardMaterial color={woodsPalette.woodLight} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.12, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.03, 8, 28]} />
        <meshStandardMaterial
          ref={gapGlow}
          color={woodsPalette.gap}
          emissive={woodsPalette.gap}
          toneMapped={false}
        />
      </mesh>
      <TextPanel
        face={leftFace}
        width={1.4}
        height={1.0}
        frameColour={woodsPalette.woodDark}
        position={[-1.15, 0.32, 0]}
        rotation={[0, 0.12, 0]}
      />
      <TextPanel
        face={rightFace}
        width={1.4}
        height={1.0}
        frameColour={woodsPalette.woodDark}
        position={[1.15, 0.32, 0]}
        rotation={[0, -0.12, 0]}
      />
    </group>
  );
};

const describeWordClassTask = (wordClass: string) =>
  wordClass === "capital letter"
    ? "Find the word that needs a capital letter"
    : `Find the ${wordClass}`;

const DetectiveBook = ({
  sentence,
  wordClass,
}: {
  sentence: string;
  wordClass: string;
}) => {
  const { body, position, age, motionScale } = usePromptMotion(0.02);
  const glass = useRef<Group>(null);
  const face = useMemoFace({
    width: 512,
    height: 256,
    style: "page",
    blocks: [
      singleBlock(describeWordClassTask(wordClass), {
        centre: [0.5, 0.2],
        size: [0.86, 0.18],
        tone: "accent",
      }),
      singleBlock(sentence, {
        centre: [0.5, 0.6],
        size: [0.86, 0.56],
        isHeading: false,
      }),
    ],
  });
  useFrame(() => {
    if (glass.current !== null) {
      const time = age.current * 0.5 * motionScale;
      glass.current.position.set(
        Math.sin(time) * 0.9,
        -0.05 + Math.cos(time * 1.3) * 0.15,
        0.32,
      );
    }
  });
  return (
    <group ref={body} position={position} name="detective-book">
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[2.85, 1.55, 0.08]} />
        <meshPhysicalMaterial
          color={woodsPalette.bookCover}
          roughness={0.5}
          clearcoat={0.5}
        />
      </mesh>
      <TextPanel
        face={face}
        width={2.6}
        height={1.3}
        depth={0.04}
        framePadding={0.02}
        frameColour="#efe5cf"
      />
      <group ref={glass}>
        <mesh>
          <torusGeometry args={[0.3, 0.04, 10, 32]} />
          <meshStandardMaterial
            color={woodsPalette.brass}
            metalness={0.9}
            roughness={0.22}
          />
        </mesh>
        <mesh>
          <circleGeometry args={[0.3, 32]} />
          <meshPhysicalMaterial
            color={woodsPalette.glass}
            transparent
            opacity={0.18}
            roughness={0.05}
            clearcoat={1}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0.3, -0.3, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.04, 0.05, 0.42, 10]} />
          <meshStandardMaterial color={woodsPalette.woodDark} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

const glowFragmentShader = `
uniform vec3 glow;
uniform float time;
varying vec2 vUv;

void main() {
  float reach = distance(vUv, vec2(0.5)) * 2.0;
  float flicker = 0.88 + 0.12 * sin(time * 6.0) * sin(time * 2.3 + 1.0);
  float strength = pow(max(0.0, 1.0 - reach), 2.2) * flicker;
  gl_FragColor = vec4(glow * strength, strength);
}
`;

const useGlowMaterial = (colour: string) => {
  const material = useMemo(() => {
    const [glow] = buildPaletteUniform([colour]);
    return new ShaderMaterial({
      uniforms: { time: woodsTime, glow: { value: glow } },
      vertexShader: plainVertexShader,
      fragmentShader: glowFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }, [colour]);
  useDisposedOnUnmount(material);
  return material;
};

interface StackedLine {
  text: string;
  tone?: TextBlock["tone"];
  isHeading?: boolean;
}

const shortestLineWeight = 14;

export const stackTextBlocks = (
  lines: readonly StackedLine[],
  top: number,
  bottom: number,
): TextBlock[] => {
  const weights = lines.map(({ text }) =>
    Math.max(shortestLineWeight, text.length),
  );
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  const spare = bottom - top;
  return lines.map(({ text, tone = "ink", isHeading = false }, index) => {
    const before = weights
      .slice(0, index)
      .reduce((total, weight) => total + weight, 0);
    const share = (weights[index] / totalWeight) * spare;
    return {
      text,
      centre: [0.5, top + (before / totalWeight) * spare + share / 2],
      size: [0.88, share * 0.94],
      tone,
      isHeading,
    };
  });
};

const scrollUnfurlSeconds = 1.2;

const findUnfurl = (ageSeconds: number, motionScale: number) =>
  motionScale === 0
    ? 1
    : 1 - (1 - Math.min(1, ageSeconds / scrollUnfurlSeconds)) ** 3;

const useFlicker = (
  age: { current: number },
  motionScale: number,
  phase: number,
) => {
  const flame = useRef<Mesh>(null);
  useFrame(() => {
    if (flame.current === null) {
      return;
    }
    const time = age.current * motionScale + phase;
    const stretch = 1 + Math.sin(time * 9) * 0.1 + Math.sin(time * 13.7) * 0.06;
    flame.current.scale.set(1 - (stretch - 1) * 0.5, stretch, 1);
  });
  return flame;
};

const Flame = ({
  age,
  motionScale,
  phase,
  size,
  position,
}: {
  age: { current: number };
  motionScale: number;
  phase: number;
  size: number;
  position: [number, number, number];
}) => {
  const flame = useFlicker(age, motionScale, phase);
  return (
    <mesh ref={flame} position={position} name="flame">
      <coneGeometry args={[size * 0.36, size, 10]} />
      <meshStandardMaterial
        color={woodsPalette.flame}
        emissive={woodsPalette.flame}
        emissiveIntensity={1.6}
        toneMapped={false}
      />
    </mesh>
  );
};

const campfireLogs = [0, 1, 2].map((index) => ({
  turn: (index / 3) * Math.PI,
}));

const CampfireLogs = () => {
  const logs = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const placer = new Object3D();
    campfireLogs.forEach(({ turn }, index) => {
      placer.position.set(0, 0, 0);
      placer.rotation.set(Math.PI / 2, turn, 0, "YXZ");
      placer.updateMatrix();
      logs.current?.setMatrixAt(index, placer.matrix);
    });
    if (logs.current !== null) {
      logs.current.instanceMatrix.needsUpdate = true;
    }
  }, []);
  return (
    <instancedMesh
      ref={logs}
      args={[undefined, undefined, campfireLogs.length]}
      frustumCulled={false}
    >
      <cylinderGeometry args={[0.05, 0.06, 0.62, 7]} />
      <meshStandardMaterial color={woodsPalette.trunk} roughness={0.95} />
    </instancedMesh>
  );
};

const scrollWidth = 2.4;
const scrollHeight = 1.65;
const scrollTop = 1.0;

const StoryScroll = ({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: readonly string[];
}) => {
  const { body, position, age, motionScale } = usePromptMotion(0.015);
  const sheet = useRef<Group>(null);
  const lowerRoller = useRef<Mesh>(null);
  const scrollGlow = useGlowMaterial(woodsPalette.firelight);
  const face = useMemoFace({
    width: 512,
    height: 352,
    style: "parchment",
    blocks: [
      singleBlock(title, {
        centre: [0.5, 0.12],
        size: [0.84, 0.13],
        tone: "accent",
      }),
      ...stackTextBlocks(
        paragraphs.map((paragraph) => ({ text: paragraph })),
        0.22,
        0.92,
      ),
    ],
  });
  useFrame(() => {
    const unfurl = findUnfurl(age.current, motionScale);
    const shown = scrollHeight * Math.max(0.02, unfurl);
    if (sheet.current !== null) {
      sheet.current.scale.y = Math.max(0.02, unfurl);
      sheet.current.position.y = scrollTop - shown / 2;
    }
    if (lowerRoller.current !== null) {
      lowerRoller.current.position.y = scrollTop - shown - 0.05;
    }
  });
  return (
    <group ref={body} position={position} name="story-scroll">
      <mesh
        material={scrollGlow}
        position={[0, 0.2, -0.25]}
        renderOrder={1}
        name="scroll-glow"
      >
        <planeGeometry args={[4.2, 3.2]} />
      </mesh>
      <mesh
        position={[0, scrollTop + 0.05, 0.02]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.075, 0.075, scrollWidth + 0.3, 12]} />
        <meshPhysicalMaterial
          color={woodsPalette.woodDark}
          roughness={0.45}
          clearcoat={0.5}
        />
      </mesh>
      <mesh
        ref={lowerRoller}
        rotation={[0, 0, Math.PI / 2]}
        position={[0, -0.7, 0.02]}
      >
        <cylinderGeometry args={[0.085, 0.085, scrollWidth + 0.3, 12]} />
        <meshPhysicalMaterial
          color={woodsPalette.woodDark}
          roughness={0.45}
          clearcoat={0.5}
        />
      </mesh>
      <group
        ref={sheet}
        name="scroll-sheet"
        position={[0, scrollTop - scrollHeight / 2, 0]}
      >
        <TextPanel
          face={face}
          width={scrollWidth}
          height={scrollHeight}
          depth={0.02}
          framePadding={0.03}
          frameColour={woodsPalette.parchment}
        />
      </group>
      <group position={[0, -0.95, -0.15]}>
        <mesh position={[0, 0.1, 0]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[1.3, 0.07, 0.55]} />
          <meshPhysicalMaterial
            color={woodsPalette.wood}
            roughness={0.55}
            clearcoat={0.35}
          />
        </mesh>
        <mesh position={[0, -0.32, -0.05]}>
          <cylinderGeometry args={[0.08, 0.16, 0.8, 10]} />
          <meshStandardMaterial color={woodsPalette.woodDark} roughness={0.7} />
        </mesh>
      </group>
      <group position={[-1.75, -1.05, 0.35]} name="campfire">
        <CampfireLogs />
        <Flame
          age={age}
          motionScale={motionScale}
          phase={0}
          size={0.5}
          position={[0, 0.26, 0]}
        />
      </group>
    </group>
  );
};

const BookPage = ({
  face,
  position,
  rotation,
}: {
  face: TextFace;
  position: [number, number, number];
  rotation: [number, number, number];
}) => {
  const texture = useTextTexture(useMemoFace(face));
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[1.3, 1.56]} />
      <meshStandardMaterial
        key={texture === undefined ? "plain" : "painted"}
        map={texture ?? null}
        color={texture === undefined ? woodsPalette.candle : "#ffffff"}
        roughness={0.9}
      />
    </mesh>
  );
};

const describeStoryStep = (step: string, index: number) =>
  `${String(index + 1)}. ${step === gapMark ? "? ? ?" : step}`;

const StepStones = ({
  stepCount,
  gapIndex,
  age,
  motionScale,
}: {
  stepCount: number;
  gapIndex: number;
  age: { current: number };
  motionScale: number;
}) => {
  const stones = useRef<InstancedMesh>(null);
  const ring = useRef<MeshStandardMaterial>(null);
  const stoneXs = useMemo(
    () =>
      Array.from(
        { length: stepCount },
        (_, index) => (index - (stepCount - 1) / 2) * 0.72,
      ),
    [stepCount],
  );
  useLayoutEffect(() => {
    const placer = new Object3D();
    stoneXs.forEach((x, index) => {
      placer.position.set(x, Math.abs(x) * 0.08, 0);
      placer.rotation.set(0, index * 0.9, 0);
      placer.scale.set(0.3, 0.09, 0.24);
      placer.updateMatrix();
      stones.current?.setMatrixAt(index, placer.matrix);
    });
    if (stones.current !== null) {
      stones.current.count = stoneXs.length;
      stones.current.instanceMatrix.needsUpdate = true;
    }
  }, [stoneXs]);
  useFrame(() => {
    if (ring.current !== null) {
      ring.current.emissiveIntensity =
        0.9 + Math.sin(age.current * 3 * motionScale) * 0.4;
    }
  });
  const gapX = stoneXs[gapIndex] ?? 0;
  return (
    <group name="story-path">
      <instancedMesh
        ref={stones}
        name="path-stones"
        args={[undefined, undefined, stepCount]}
        frustumCulled={false}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={woodsPalette.stone}
          roughness={0.85}
          flatShading
        />
      </instancedMesh>
      <mesh
        position={[gapX, Math.abs(gapX) * 0.08 + 0.1, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.24, 0.03, 8, 28]} />
        <meshStandardMaterial
          ref={ring}
          color={woodsPalette.gap}
          emissive={woodsPalette.gap}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const leftPageTextCentre = 0.45;
const rightPageTextCentre = 0.55;
const pageTextWidth = 0.76;

const StoryBook = ({
  task,
  steps,
}: {
  task: string;
  steps: readonly string[];
}) => {
  const { body, position, age, motionScale } = usePromptMotion(0.015);
  const leftFace: TextFace = {
    width: 320,
    height: 384,
    style: "page",
    blocks: [
      singleBlock(task, {
        centre: [leftPageTextCentre, 0.42],
        size: [pageTextWidth, 0.6],
        tone: "accent",
      }),
      singleBlock("Pick a story stone", {
        centre: [0.5, 0.85],
        size: [0.7, 0.08],
        tone: "soft",
        isHeading: false,
      }),
    ],
  };
  const rightFace: TextFace = {
    width: 320,
    height: 384,
    style: "page",
    blocks: stackTextBlocks(
      steps.map((step, index) => ({
        text: describeStoryStep(step, index),
        tone: step === gapMark ? "accent" : "ink",
        isHeading: step === gapMark,
      })),
      0.08,
      0.92,
    ).map((block) => ({
      ...block,
      centre: [rightPageTextCentre, block.centre[1]],
      size: [pageTextWidth, block.size[1]],
    })),
  };
  return (
    <group ref={body} position={position} name="story-book">
      <mesh position={[0, 0.18, -0.12]}>
        <boxGeometry args={[2.85, 1.72, 0.07]} />
        <meshPhysicalMaterial
          color={woodsPalette.bookCover}
          roughness={0.5}
          clearcoat={0.5}
        />
      </mesh>
      <mesh position={[0, 0.18, -0.06]}>
        <cylinderGeometry args={[0.06, 0.06, 1.72, 10]} />
        <meshStandardMaterial
          color={woodsPalette.brass}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      <BookPage
        face={leftFace}
        position={[-0.67, 0.18, 0.02]}
        rotation={[-0.05, 0.2, 0]}
      />
      <BookPage
        face={rightFace}
        position={[0.67, 0.18, 0.02]}
        rotation={[-0.05, -0.2, 0]}
      />
      <mesh position={[0.25, -0.72, 0.05]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.08, 0.42, 0.01]} />
        <meshStandardMaterial color={woodsPalette.ribbon} roughness={0.6} />
      </mesh>
      <group position={[0, -1.12, 0.2]}>
        <StepStones
          stepCount={steps.length}
          gapIndex={steps.indexOf(gapMark)}
          age={age}
          motionScale={motionScale}
        />
      </group>
      <group position={[1.75, -0.55, 0.1]} name="candle">
        <mesh>
          <cylinderGeometry args={[0.09, 0.1, 0.5, 12]} />
          <meshStandardMaterial color={woodsPalette.candle} roughness={0.6} />
        </mesh>
        <Flame
          age={age}
          motionScale={motionScale}
          phase={1.7}
          size={0.2}
          position={[0, 0.36, 0]}
        />
      </group>
    </group>
  );
};

const describeEnglishPrompt = (prompt: EnglishPrompt): string => {
  switch (prompt.kind) {
    case "sequence":
      return prompt.items.join(" ");
    case "word-link":
      return prompt.word;
    case "clue":
      return prompt.clue;
    case "word-sum":
      return prompt.parts.join(" + ");
    case "sentence-gap":
      return describeGap(prompt);
    case "word-class":
      return prompt.sentence;
    case "passage":
      return prompt.question;
    case "story-plan":
      return prompt.task;
  }
};

const renderPromptObject = (
  gameType: EnglishGameType,
  prompt: EnglishPrompt,
): ReactNode => {
  switch (gameType) {
    case "alphabet-train":
      return prompt.kind === "sequence" ? (
        <AlphabetTrain items={prompt.items} />
      ) : null;
    case "word-lanterns":
      return prompt.kind === "word-link" ? (
        <Signpost word={prompt.word} link={prompt.link} />
      ) : null;
    case "one-or-many":
      return <BalanceScales text={describeEnglishPrompt(prompt)} />;
    case "word-workshop":
      return <WorkshopBoard text={describeEnglishPrompt(prompt)} />;
    case "punctuation-stones":
      return <StoneTablet text={describeEnglishPrompt(prompt)} />;
    case "suffix-potions":
      return prompt.kind === "word-sum" ? (
        <Cauldron parts={prompt.parts} />
      ) : (
        <Cauldron parts={[describeEnglishPrompt(prompt)]} />
      );
    case "word-squeeze":
      return <TreasureChest text={describeEnglishPrompt(prompt)} />;
    case "sound-alikes":
      return <HangingScroll text={describeEnglishPrompt(prompt)} />;
    case "bridge-builder":
      return prompt.kind === "sentence-gap" ? (
        <RopeBridge before={prompt.before} after={prompt.after} />
      ) : null;
    case "word-detectives":
      return prompt.kind === "word-class" ? (
        <DetectiveBook
          sentence={prompt.sentence}
          wordClass={prompt.wordClass}
        />
      ) : null;
    case "story-scrolls":
      return prompt.kind === "passage" ? (
        <StoryScroll title={prompt.title} paragraphs={prompt.paragraphs} />
      ) : null;
    case "story-builder":
      return prompt.kind === "story-plan" ? (
        <StoryBook task={prompt.task} steps={prompt.steps} />
      ) : null;
  }
};

const useSwayingChoice = (slot: ChoiceSlot, sway: number) => {
  const { choice, age, motionScale } = useGrowingChoice(slot);
  const swing = useRef<Group>(null);
  useFrame(() => {
    if (swing.current !== null) {
      swing.current.rotation.z =
        Math.sin(age.current * 1.3 + slot.index) * sway * motionScale;
    }
  });
  return { choice, swing };
};

const WoodenCrate = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.04);
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        slot.radius * 1.9,
        slot.radius * 1.2,
        slot.radius * 1.1,
        2,
        slot.radius * 0.08,
      ),
    [slot.radius],
  );
  useDisposedOnUnmount(geometry);
  return (
    <group ref={choice} position={slot.position} name="choice-crate">
      <group ref={swing}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color={woodsPalette.wood}
            roughness={0.65}
            clearcoat={0.25}
          />
        </mesh>
      </group>
    </group>
  );
};

const lanternProfile = [
  [0.0, -0.62],
  [0.45, -0.58],
  [0.78, -0.3],
  [0.86, 0.0],
  [0.78, 0.3],
  [0.45, 0.58],
  [0.0, 0.62],
];

const PaperLantern = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.08);
  const geometry = useMemo(
    () =>
      new LatheGeometry(
        lanternProfile.map(
          ([across, along]) =>
            new Vector2(
              across * slot.radius * 1.05,
              along * slot.radius * 1.15,
            ),
        ),
        24,
      ),
    [slot.radius],
  );
  useDisposedOnUnmount(geometry);
  return (
    <group ref={choice} position={slot.position} name="choice-lantern">
      <group ref={swing}>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={woodsPalette.paper}
            emissive={woodsPalette.glow}
            emissiveIntensity={0.6}
            roughness={0.85}
          />
        </mesh>
        <mesh position={[0, slot.radius * 0.76, 0]}>
          <cylinderGeometry
            args={[
              slot.radius * 0.36,
              slot.radius * 0.42,
              slot.radius * 0.16,
              16,
            ]}
          />
          <meshStandardMaterial color={woodsPalette.woodDark} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

const Acorn = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.05);
  return (
    <group ref={choice} position={slot.position} name="choice-acorn">
      <group ref={swing}>
        <mesh scale={[1, 1.12, 1]} position={[0, -slot.radius * 0.08, 0]}>
          <sphereGeometry args={[slot.radius * 0.82, 20, 14]} />
          <meshPhysicalMaterial
            color={woodsPalette.acorn}
            roughness={0.35}
            clearcoat={0.8}
            clearcoatRoughness={0.2}
          />
        </mesh>
        <mesh position={[0, slot.radius * 0.52, 0]}>
          <sphereGeometry
            args={[slot.radius * 0.88, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.2]}
          />
          <meshStandardMaterial
            color={woodsPalette.acornCap}
            roughness={0.95}
            flatShading
          />
        </mesh>
      </group>
    </group>
  );
};

const WordTile = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.03);
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        slot.radius * 2.1,
        slot.radius * 1.0,
        slot.radius * 0.3,
        2,
        slot.radius * 0.12,
      ),
    [slot.radius],
  );
  useDisposedOnUnmount(geometry);
  return (
    <group ref={choice} position={slot.position} name="choice-tile">
      <group ref={swing}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color={woodsPalette.woodLight}
            roughness={0.45}
            clearcoat={0.6}
            clearcoatRoughness={0.25}
          />
        </mesh>
      </group>
    </group>
  );
};

const RiverStone = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.02);
  return (
    <group ref={choice} position={slot.position} name="choice-stone">
      <group ref={swing}>
        <mesh scale={[1.2, 0.95, 0.5]}>
          <sphereGeometry args={[slot.radius * 0.85, 22, 14]} />
          <meshPhysicalMaterial
            color={woodsPalette.stones[slot.index % woodsPalette.stones.length]}
            roughness={0.32}
            clearcoat={0.7}
            clearcoatRoughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
};

const flaskProfile = [
  [0.0, -0.8],
  [0.55, -0.74],
  [0.82, -0.42],
  [0.82, -0.1],
  [0.5, 0.25],
  [0.24, 0.42],
  [0.24, 0.82],
];

const PotionFlask = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.05);
  const glass = useMemo(
    () =>
      new LatheGeometry(
        flaskProfile.map(
          ([across, along]) =>
            new Vector2(across * slot.radius, along * slot.radius),
        ),
        18,
      ),
    [slot.radius],
  );
  useDisposedOnUnmount(glass);
  const colour = woodsPalette.potions[slot.index % woodsPalette.potions.length];
  return (
    <group ref={choice} position={slot.position} name="choice-flask">
      <group ref={swing}>
        <mesh position={[0, -slot.radius * 0.35, 0]} scale={[1, 0.82, 1]}>
          <sphereGeometry args={[slot.radius * 0.72, 18, 12]} />
          <meshStandardMaterial
            color={colour}
            emissive={colour}
            emissiveIntensity={0.45}
            roughness={0.3}
          />
        </mesh>
        <mesh geometry={glass}>
          <meshPhysicalMaterial
            color={woodsPalette.glass}
            transparent
            opacity={0.32}
            roughness={0.05}
            clearcoat={1}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
};

const KeyTag = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.09);
  return (
    <group ref={choice} position={slot.position} name="choice-key-tag">
      <group ref={swing}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.3, 1, 1]}>
          <cylinderGeometry
            args={[
              slot.radius * 0.8,
              slot.radius * 0.8,
              slot.radius * 0.12,
              28,
            ]}
          />
          <meshStandardMaterial
            color={woodsPalette.brass}
            metalness={0.9}
            roughness={0.28}
          />
        </mesh>
        <mesh position={[0, slot.radius * 0.92, 0]}>
          <torusGeometry
            args={[slot.radius * 0.16, slot.radius * 0.04, 8, 20]}
          />
          <meshStandardMaterial
            color={woodsPalette.brass}
            metalness={0.9}
            roughness={0.28}
          />
        </mesh>
      </group>
    </group>
  );
};

const buildLeafShape = () => {
  const leaf = new Shape();
  leaf.moveTo(0, -1);
  leaf.bezierCurveTo(0.9, -0.5, 0.9, 0.5, 0, 1);
  leaf.bezierCurveTo(-0.9, 0.5, -0.9, -0.5, 0, -1);
  return leaf;
};

const AutumnLeaf = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.12);
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(buildLeafShape(), {
        depth: 0.04,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 1,
        curveSegments: 8,
      })
        .rotateZ(Math.PI / 2)
        .scale(slot.radius * 1.15, slot.radius * 0.95, slot.radius),
    [slot.radius],
  );
  useDisposedOnUnmount(geometry);
  return (
    <group ref={choice} position={slot.position} name="choice-leaf">
      <group ref={swing}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color={woodsPalette.leaves[slot.index % woodsPalette.leaves.length]}
            roughness={0.55}
            clearcoat={0.4}
            sheen={0.5}
          />
        </mesh>
      </group>
    </group>
  );
};

const BridgePlank = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.04);
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        slot.radius * 2.2,
        slot.radius * 0.8,
        slot.radius * 0.22,
        2,
        slot.radius * 0.08,
      ),
    [slot.radius],
  );
  useDisposedOnUnmount(geometry);
  return (
    <group ref={choice} position={slot.position} name="choice-plank">
      <group ref={swing}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color={woodsPalette.wood}
            roughness={0.7}
            clearcoat={0.2}
          />
        </mesh>
      </group>
    </group>
  );
};

const buildBadgeShape = () => {
  const points = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2 + Math.PI / 2;
    const reach = index % 2 === 0 ? 1 : 0.72;
    return new Vector2(Math.cos(angle) * reach, Math.sin(angle) * reach);
  });
  return new Shape(points);
};

const DetectiveBadge = (slot: ChoiceSlot) => {
  const { choice, swing } = useSwayingChoice(slot, 0.04);
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(buildBadgeShape(), {
        depth: 0.08,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
      }).scale(slot.radius * 0.95, slot.radius * 0.95, slot.radius),
    [slot.radius],
  );
  useDisposedOnUnmount(geometry);
  return (
    <group ref={choice} position={slot.position} name="choice-badge">
      <group ref={swing}>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={woodsPalette.brass}
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
};

const liftAbovePlaque = ({
  position: [x, y, z],
  radius,
  index,
}: ChoiceSlot): ChoiceSlot => ({
  position: [x, y + radius * 0.95, z],
  radius: radius * 0.62,
  index,
});

const StoryLantern = (slot: ChoiceSlot) => (
  <PaperLantern {...liftAbovePlaque(slot)} />
);

const StoryStone = (slot: ChoiceSlot) => {
  const lifted = liftAbovePlaque(slot);
  const { choice, swing } = useSwayingChoice(lifted, 0.03);
  return (
    <group ref={choice} position={lifted.position} name="choice-story-stone">
      <group ref={swing}>
        <mesh scale={[1.25, 0.82, 0.42]}>
          <sphereGeometry args={[lifted.radius * 0.85, 14, 9]} />
          <meshPhysicalMaterial
            color={woodsPalette.stones[slot.index % woodsPalette.stones.length]}
            roughness={0.35}
            clearcoat={0.6}
            clearcoatRoughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0, lifted.radius * 0.36]}>
          <torusGeometry
            args={[lifted.radius * 0.34, lifted.radius * 0.06, 6, 18]}
          />
          <meshStandardMaterial
            color={woodsPalette.gap}
            emissive={woodsPalette.gap}
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
};

const choiceObjects: Record<EnglishGameType, (slot: ChoiceSlot) => ReactNode> =
  {
    "alphabet-train": WoodenCrate,
    "word-lanterns": PaperLantern,
    "one-or-many": Acorn,
    "word-workshop": WordTile,
    "punctuation-stones": RiverStone,
    "suffix-potions": PotionFlask,
    "word-squeeze": KeyTag,
    "sound-alikes": AutumnLeaf,
    "bridge-builder": BridgePlank,
    "word-detectives": DetectiveBadge,
    "story-scrolls": StoryLantern,
    "story-builder": StoryStone,
  };

export const WoodsGameWorld = ({
  gameType,
  prompt,
  choices,
  hiddenChoiceIndexes,
  companionMood,
  poppedChoiceIndex,
  popCount,
  isEffectsOn,
}: WoodsGameWorldProps) => {
  const radius = useChoiceRadius();
  const choicePositions = useChoicePositions(choices.length, gameType);
  const poppedPosition =
    poppedChoiceIndex === undefined
      ? undefined
      : choicePositions[poppedChoiceIndex];
  const ChoiceObject = choiceObjects[gameType];

  return (
    <>
      <WoodsStage companionMood={companionMood} />
      <group key={popCount}>
        {prompt?.kind === "english"
          ? renderPromptObject(gameType, prompt.english)
          : null}
      </group>
      {choices.map((choice, index) =>
        hiddenChoiceIndexes.includes(index) ? null : (
          <group key={`${String(popCount)}-${choice}`}>
            <ChoiceObject
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
