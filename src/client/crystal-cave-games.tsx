import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LatheGeometry,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  type Group,
  type InstancedMesh,
  type Points,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  splitTiles,
  type PhonicsChoiceProp,
  type PhonicsGame,
  type PhonicsGameScene,
} from "../curriculum/phonics-games.js";
import type { YearGroup } from "../curriculum/skills.js";
import type { QuestionPrompt } from "./mission/mission.js";
import { buildPaletteUniform } from "./pixel-pipeline.js";
import {
  BubbleBurst,
  StudioCompanion,
  findGrowth,
  promptGrowSeconds,
  useChoicePositions,
  useChoiceRadius,
  useDisposedMaterials,
  useDisposedOnUnmount,
  useGrowingChoice,
  useMotionScale,
  usePlacedInstances,
  usePromptGrowth,
  usePromptPosition,
  type ChoiceSlot,
  type CompanionMood,
  type Placement,
} from "./studio-stage.js";

export interface CaveGameWorldProps {
  phonicsGame: PhonicsGame;
  prompt: QuestionPrompt | undefined;
  choices: readonly string[];
  hiddenChoiceIndexes: readonly number[];
  companionMood: CompanionMood;
  poppedChoiceIndex: number | undefined;
  popCount: number;
  isEffectsOn: boolean;
}

const cavePalette = {
  skyTop: "#04050d",
  skyBottom: "#171236",
  rock: "#262b40",
  rockLight: "#3a4160",
  floor: "#151a2b",
  stone: "#6e7489",
  stoneFace: "#e4dfd2",
  slate: "#1b2034",
  ink: "#1f2440",
  paleInk: "#f4f0ff",
  wood: "#6b4423",
  woodDark: "#3f2714",
  metal: "#8f99ad",
  brass: "#c9a227",
  parchment: "#f6efdc",
  leather: "#5a1f2b",
  glass: "#e6f4ff",
  lanternGlow: "#ffcf86",
  lanternInk: "#3b2410",
  hemisphereSky: "#b9c6ff",
  hemisphereGround: "#0b0d1a",
  keyLight: "#fff1dc",
  choices: ["#b18cff", "#4cc3ff", "#4ade80", "#ff7ab6"],
} as const;

const crystalColours = ["#b18cff", "#4cc3ff"] as const;

export const findCrystalColour = (yearGroup: YearGroup): string =>
  crystalColours[(yearGroup - 1) % crystalColours.length];

const caveFloorHeight = -2.6;
const tileSpacing = 0.8;
const tileStaggerSeconds = 0.08;
const moteCount = 36;
const moteRise = 7;
const cartRollSeconds = 0.9;
const cartStartX = -4.5;

const faceFontFamily = `"Baloo 2 Variable", "Baloo 2", sans-serif`;
const buildFaceFont = (pixels: number) =>
  `800 ${String(pixels)}px ${faceFontFamily}`;
const smallestFacePixels = 18;
const faceFontStep = 4;
const lineHeightShare = 1.1;
const facePaddingShare = 0.08;

export interface FaceLook {
  background: string | undefined;
  ink: string;
  border: string | undefined;
}

export interface FaceSize {
  width: number;
  height: number;
}

export const wrapWords = (
  text: string,
  fitsOnLine: (line: string) => boolean,
): string[] =>
  text.split(" ").reduce<string[]>((lines, word) => {
    const current = lines.at(-1);
    if (current !== undefined && fitsOnLine(`${current} ${word}`)) {
      return [...lines.slice(0, -1), `${current} ${word}`];
    }
    return [...lines, word];
  }, []);

const drawWordFace = (
  canvas: HTMLCanvasElement,
  text: string,
  look: FaceLook,
): boolean => {
  const context = canvas.getContext("2d");
  if (context === null) {
    return false;
  }
  const { width, height } = canvas;
  const padding = Math.min(width, height) * facePaddingShare;
  context.clearRect(0, 0, width, height);
  if (look.background !== undefined) {
    context.fillStyle = look.background;
    context.fillRect(0, 0, width, height);
  }
  if (look.border !== undefined) {
    context.strokeStyle = look.border;
    context.globalAlpha = 0.35;
    context.lineWidth = Math.max(4, padding * 0.25);
    context.strokeRect(
      padding * 0.5,
      padding * 0.5,
      width - padding,
      height - padding,
    );
    context.globalAlpha = 1;
  }
  const roomWidth = width - padding * 2;
  const roomHeight = height - padding * 2;
  const fitsOnLine = (line: string) =>
    context.measureText(line).width <= roomWidth;
  const measureGlyphReach = () => {
    const tallestAndDeepest = context.measureText("Hgjy");
    return {
      ascent: tallestAndDeepest.actualBoundingBoxAscent,
      descent: tallestAndDeepest.actualBoundingBoxDescent,
    };
  };
  const findBlockHeight = (lineCount: number, pixels: number) => {
    const { ascent, descent } = measureGlyphReach();
    return (lineCount - 1) * pixels * lineHeightShare + ascent + descent;
  };
  let fontPixels = Math.round(height * 0.62);
  context.font = buildFaceFont(fontPixels);
  let lines = wrapWords(text, fitsOnLine);
  while (
    fontPixels > smallestFacePixels &&
    (!lines.every(fitsOnLine) ||
      findBlockHeight(lines.length, fontPixels) > roomHeight)
  ) {
    fontPixels -= faceFontStep;
    context.font = buildFaceFont(fontPixels);
    lines = wrapWords(text, fitsOnLine);
  }
  context.fillStyle = look.ink;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  const lineHeight = fontPixels * lineHeightShare;
  const { ascent } = measureGlyphReach();
  const blockTop = (height - findBlockHeight(lines.length, fontPixels)) / 2;
  lines.forEach((line, index) => {
    context.fillText(line, width / 2, blockTop + ascent + index * lineHeight);
  });
  return true;
};

interface WordFace {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  text: string;
  look: FaceLook;
}

const buildWordFace = (
  text: string,
  look: FaceLook,
  { width, height }: FaceSize,
): WordFace | undefined => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  if (!drawWordFace(canvas, text, look)) {
    return undefined;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture, text, look };
};

export const useWordTexture = (
  text: string,
  look: FaceLook,
  faceSize: FaceSize,
): CanvasTexture | undefined => {
  const { background, ink, border } = look;
  const { width, height } = faceSize;
  const face = useMemo(
    () => buildWordFace(text, { background, ink, border }, { width, height }),
    [text, background, ink, border, width, height],
  );

  useEffect(() => {
    if (face === undefined) {
      return;
    }
    let isShown = true;
    void document.fonts.load(buildFaceFont(64)).then(() => {
      if (isShown && drawWordFace(face.canvas, face.text, face.look)) {
        face.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
      face.texture.dispose();
    };
  }, [face]);

  return face?.texture;
};

interface WordPanelProps {
  text: string;
  look: FaceLook;
  size: [number, number];
  textureSize: FaceSize;
  position?: [number, number, number];
  rotation?: [number, number, number];
  glow?: number;
  isTransparent?: boolean;
  geometry?: BufferGeometry;
}

const WordPanel = ({
  text,
  look,
  size,
  textureSize,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  glow = 0,
  isTransparent = false,
  geometry,
}: WordPanelProps) => {
  const face = useWordTexture(text, look, textureSize);
  return (
    <mesh
      name="word-panel"
      position={position}
      rotation={rotation}
      {...(geometry === undefined ? {} : { geometry })}
      renderOrder={isTransparent ? 2 : 0}
    >
      {geometry === undefined ? <planeGeometry args={size} /> : null}
      <meshStandardMaterial
        key={face === undefined ? "plain" : "worded"}
        color={face === undefined ? (look.background ?? look.ink) : "#ffffff"}
        map={face ?? null}
        emissive={glow > 0 ? "#ffffff" : "#000000"}
        emissiveMap={glow > 0 ? (face ?? null) : null}
        emissiveIntensity={glow}
        roughness={0.7}
        transparent={isTransparent}
        depthWrite={!isTransparent}
      />
    </mesh>
  );
};

const caveTime = { value: 0 };

const useCaveClock = () => {
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    caveTime.value += deltaSeconds * motionScale;
  });
};

const flatVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const caveWallFragmentShader = `
uniform float time;
uniform vec3 skyTop;
uniform vec3 skyBottom;
uniform vec3 crystal;
varying vec2 vUv;

float findRidge(vec2 point) {
  float ridge = sin(point.x * 2.3 + sin(point.y * 1.7) * 1.4);
  ridge += 0.5 * sin(point.x * 5.1 - point.y * 3.3 + 1.7);
  ridge += 0.25 * sin(point.x * 9.7 + point.y * 7.9);
  return ridge;
}

void main() {
  vec2 point = vUv * vec2(14.0, 7.0);
  vec3 colour = mix(skyBottom, skyTop, smoothstep(0.1, 0.95, vUv.y));
  float strata = findRidge(point) * 0.5 + 0.5;
  colour *= 0.82 + strata * 0.3;
  vec2 fromGlow = (vUv - vec2(0.58, 0.5)) * vec2(1.7, 1.0);
  float glow = 1.0 - smoothstep(0.0, 0.46, length(fromGlow));
  float shimmer = 0.85 + 0.15 * sin(time * 0.8);
  colour += crystal * glow * glow * 0.38 * shimmer;
  float vignette = smoothstep(0.98, 0.3, distance(vUv, vec2(0.55, 0.5)));
  gl_FragColor = vec4(colour * mix(0.55, 1.0, vignette), 1.0);
}
`;

const caveFloorFragmentShader = `
uniform float time;
uniform vec3 rock;
uniform vec3 crystal;
varying vec2 vUv;

void main() {
  vec2 point = vUv * vec2(20.0, 7.0);
  float distanceAway = smoothstep(0.15, 0.95, vUv.y);
  float grain = 0.9 + 0.1 * sin(point.x * 3.1 + sin(point.y * 4.3) * 2.0);
  vec3 colour = rock * grain;
  float vein = abs(sin(point.x * 0.9 + sin(point.y * 1.6 + point.x * 0.4) * 1.8));
  float veinGlow = pow(1.0 - vein, 22.0) * (0.75 + 0.25 * sin(time * 1.4 + point.x));
  colour += crystal * veinGlow * 0.9 * (1.0 - distanceAway);
  colour = mix(colour, rock * 0.35, distanceAway);
  gl_FragColor = vec4(colour, 1.0);
}
`;

const moteVertexShader = `
uniform float pixelRatio;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 42.0 * pixelRatio / -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const moteFragmentShader = `
uniform vec3 crystal;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float reach = dot(point, point);
  if (reach > 1.0) {
    discard;
  }
  float glow = pow(1.0 - reach, 2.0);
  gl_FragColor = vec4(crystal * 1.4, glow * 0.55);
}
`;

const buildCaveWallMaterial = (crystalColour: string) => {
  const [skyTop, skyBottom, crystal] = buildPaletteUniform([
    cavePalette.skyTop,
    cavePalette.skyBottom,
    crystalColour,
  ]);
  return new ShaderMaterial({
    uniforms: {
      time: caveTime,
      skyTop: { value: skyTop },
      skyBottom: { value: skyBottom },
      crystal: { value: crystal },
    },
    vertexShader: flatVertexShader,
    fragmentShader: caveWallFragmentShader,
    depthWrite: false,
  });
};

const buildCaveFloorMaterial = (crystalColour: string) => {
  const [rock, crystal] = buildPaletteUniform([
    cavePalette.floor,
    crystalColour,
  ]);
  return new ShaderMaterial({
    uniforms: {
      time: caveTime,
      rock: { value: rock },
      crystal: { value: crystal },
    },
    vertexShader: flatVertexShader,
    fragmentShader: caveFloorFragmentShader,
  });
};

const buildMoteMaterial = (crystalColour: string, pixelRatio: number) => {
  const [crystal] = buildPaletteUniform([crystalColour]);
  return new ShaderMaterial({
    uniforms: {
      crystal: { value: crystal },
      pixelRatio: { value: pixelRatio },
    },
    vertexShader: moteVertexShader,
    fragmentShader: moteFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
};

const shardProfile = [
  [0, 0],
  [0.42, 0],
  [0.5, 0.18],
  [0.5, 1.45],
  [0, 2],
];

const buildShardGeometry = (): LatheGeometry =>
  new LatheGeometry(
    shardProfile.map(([across, along]) => new Vector2(across, along)),
    6,
  );

const useShardGeometry = () => {
  const geometry = useMemo(() => buildShardGeometry(), []);
  useDisposedOnUnmount(geometry);
  return geometry;
};

const wallCrystals: Placement[] = [
  {
    position: [-6.2, caveFloorHeight, -4.2],
    rotation: [0, 0, 0.18],
    scale: [0.7, 1.5, 0.7],
  },
  {
    position: [-5.5, caveFloorHeight, -3.6],
    rotation: [0, 0.5, -0.12],
    scale: [0.45, 0.95, 0.45],
  },
  {
    position: [-6.8, caveFloorHeight, -3.2],
    rotation: [0, 0.2, 0.4],
    scale: [0.5, 1.1, 0.5],
  },
  {
    position: [-3.8, caveFloorHeight, -5.6],
    rotation: [0, 0.9, -0.2],
    scale: [0.6, 1.3, 0.6],
  },
  {
    position: [-4.4, caveFloorHeight, -5.2],
    rotation: [0, 0.3, 0.25],
    scale: [0.35, 0.75, 0.35],
  },
  {
    position: [4.6, caveFloorHeight, -5.4],
    rotation: [0, 0.4, 0.15],
    scale: [0.65, 1.4, 0.65],
  },
  {
    position: [5.3, caveFloorHeight, -4.6],
    rotation: [0, 1.1, -0.3],
    scale: [0.42, 0.9, 0.42],
  },
  {
    position: [6.6, caveFloorHeight, -3.8],
    rotation: [0, 0.6, -0.15],
    scale: [0.75, 1.7, 0.75],
  },
  {
    position: [7.4, caveFloorHeight, -4.4],
    rotation: [0, 0.2, 0.35],
    scale: [0.4, 0.85, 0.4],
  },
  {
    position: [1.2, caveFloorHeight, -6.4],
    rotation: [0, 0.7, 0.1],
    scale: [0.5, 1.05, 0.5],
  },
  {
    position: [-1.6, caveFloorHeight, -6.6],
    rotation: [0, 0.1, -0.22],
    scale: [0.45, 0.9, 0.45],
  },
  {
    position: [3.0, caveFloorHeight, -2.2],
    rotation: [0, 0.8, -0.35],
    scale: [0.28, 0.55, 0.28],
  },
];

const stalactites: Placement[] = [
  -7.2, -5.6, -4.1, -2.4, -0.6, 1.3, 2.9, 4.5, 6.1, 7.6,
].map((x, index) => ({
  position: [x, 3.6 + (index % 3) * 0.25, -4.5 - (index % 4) * 0.5],
  rotation: [Math.PI, index * 0.7, 0],
  scale: [
    0.35 + (index % 3) * 0.12,
    0.9 + ((index * 5) % 4) * 0.35,
    0.35 + (index % 3) * 0.12,
  ],
}));

const goldenRatioFraction = 0.618034;

const buildMoteStarts = (): [number, number, number][] =>
  Array.from({ length: moteCount }, (_, index) => [
    (((index * goldenRatioFraction) % 1) - 0.5) * 16,
    ((index * (1 - goldenRatioFraction) * 3) % 1) * moteRise,
    -1.5 - (index % 5) * 0.9,
  ]);

const GlowMotes = ({ crystalColour }: { crystalColour: string }) => {
  const motes = useRef<Points>(null);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const starts = useMemo(() => buildMoteStarts(), []);
  const geometry = useMemo(() => {
    const moteGeometry = new BufferGeometry();
    moteGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(moteCount * 3), 3),
    );
    return moteGeometry;
  }, []);
  const material = useMemo(
    () => buildMoteMaterial(crystalColour, pixelRatio),
    [crystalColour, pixelRatio],
  );
  useDisposedOnUnmount(geometry);
  useDisposedOnUnmount(material);

  useFrame(() => {
    const positions = geometry.getAttribute("position");
    starts.forEach(([x, startY, z], index) => {
      const risen = (startY + caveTime.value * 0.18) % moteRise;
      positions.setXYZ(
        index,
        x + Math.sin(caveTime.value * 0.4 + index) * 0.3,
        risen + caveFloorHeight,
        z,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points
      ref={motes}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
};

const CaveLights = ({ crystalColour }: { crystalColour: string }) => (
  <>
    <hemisphereLight
      args={[cavePalette.hemisphereSky, cavePalette.hemisphereGround, 0.75]}
    />
    <directionalLight
      position={[3, 5, 4]}
      intensity={1.9}
      color={cavePalette.keyLight}
    />
    <directionalLight
      position={[-4, 2, -3]}
      intensity={1.5}
      color={crystalColour}
    />
    <pointLight
      position={[0.6, 1.2, 2.6]}
      intensity={7}
      distance={9}
      color={crystalColour}
    />
  </>
);

const CaveStage = ({
  crystalColour,
  companionMood,
}: {
  crystalColour: string;
  companionMood: CompanionMood;
}) => {
  useCaveClock();
  const materials = useMemo(
    () => [
      buildCaveWallMaterial(crystalColour),
      buildCaveFloorMaterial(crystalColour),
    ],
    [crystalColour],
  );
  useDisposedMaterials(materials);
  const [wallMaterial, floorMaterial] = materials;
  const shardGeometry = useShardGeometry();
  const crystals = usePlacedInstances(wallCrystals);
  const hanging = usePlacedInstances(stalactites);

  return (
    <group name="crystal-cave">
      <CaveLights crystalColour={crystalColour} />
      <mesh position={[0, 0, -8]} material={wallMaterial} renderOrder={-1}>
        <planeGeometry args={[60, 30]} />
      </mesh>
      <mesh
        material={floorMaterial}
        position={[0, caveFloorHeight, -3]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[40, 14]} />
      </mesh>
      <instancedMesh
        ref={crystals}
        args={[shardGeometry, undefined, wallCrystals.length]}
        frustumCulled={false}
        name="wall-crystals"
      >
        <meshPhysicalMaterial
          color={crystalColour}
          emissive={crystalColour}
          emissiveIntensity={0.45}
          roughness={0.14}
          clearcoat={1}
          clearcoatRoughness={0.05}
          flatShading
        />
      </instancedMesh>
      <instancedMesh
        ref={hanging}
        args={[undefined, undefined, stalactites.length]}
        frustumCulled={false}
      >
        <coneGeometry args={[0.6, 2, 7]} />
        <meshStandardMaterial
          color={cavePalette.rock}
          roughness={0.95}
          flatShading
        />
      </instancedMesh>
      <GlowMotes crystalColour={crystalColour} />
      <StudioCompanion mood={companionMood} />
    </group>
  );
};

const usePromptBody = (spin: (body: Group, time: number) => void) => {
  const body = useRef<Group>(null);
  const { age, motionScale } = usePromptGrowth();
  useFrame(() => {
    const current = body.current;
    if (current === null) {
      return;
    }
    current.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    spin(current, age.current * motionScale);
  });
  return { body, age, motionScale };
};

const gentleSway = (body: Group, time: number) => {
  body.rotation.y = -0.18 + Math.sin(time * 0.5) * 0.08;
  body.rotation.x = 0.04 + Math.sin(time * 0.7) * 0.02;
};

const engravedLook: FaceLook = {
  background: cavePalette.stoneFace,
  ink: cavePalette.ink,
  border: cavePalette.ink,
};

const parchmentLook: FaceLook = {
  background: cavePalette.parchment,
  ink: cavePalette.ink,
  border: cavePalette.woodDark,
};

const tileLook: FaceLook = {
  background: "#f7f4ff",
  ink: cavePalette.ink,
  border: undefined,
};

const squareFace: FaceSize = { width: 256, height: 256 };
const wideFace: FaceSize = { width: 512, height: 224 };

interface PromptProps {
  text: string;
  crystalColour: string;
}

const CrystalTile = ({
  tile,
  index,
  count,
  crystalColour,
}: {
  tile: string;
  index: number;
  count: number;
  crystalColour: string;
}) => {
  const body = useRef<Group>(null);
  const { age, motionScale } = usePromptGrowth();
  const isMissing = tile === "?";
  const geometry = useMemo(
    () => new RoundedBoxGeometry(0.68, 0.68, 0.18, 2, 0.06),
    [],
  );
  useDisposedOnUnmount(geometry);
  const x = (index - (count - 1) / 2) * tileSpacing;

  useFrame(() => {
    const current = body.current;
    if (current === null) {
      return;
    }
    const time = age.current * motionScale;
    current.scale.setScalar(
      findGrowth(
        age.current - index * tileStaggerSeconds,
        promptGrowSeconds,
        motionScale,
      ),
    );
    current.position.y = Math.sin(time * 1.5 + index * 0.9) * 0.06;
    current.rotation.y = Math.sin(time * 0.6 + index) * 0.12;
  });

  return (
    <group position={[x, 0, 0]}>
      <group ref={body} name="crystal-tile">
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color={crystalColour}
            emissive={crystalColour}
            emissiveIntensity={isMissing ? 0.8 : 0.25}
            roughness={0.12}
            clearcoat={1}
            clearcoatRoughness={0.04}
          />
        </mesh>
        <WordPanel
          text={tile}
          look={
            isMissing
              ? {
                  background: cavePalette.slate,
                  ink: crystalColour,
                  border: undefined,
                }
              : tileLook
          }
          size={[0.56, 0.56]}
          textureSize={squareFace}
          position={[0, 0, 0.092]}
          glow={isMissing ? 0.6 : 0}
        />
      </group>
    </group>
  );
};

const CrystalTiles = ({ text, crystalColour }: PromptProps) => {
  const position = usePromptPosition();
  const tiles = splitTiles(text);
  return (
    <group position={position} name="prompt-crystal-tiles">
      {tiles.map((tile, index) => (
        <CrystalTile
          key={`${String(index)}-${tile}`}
          tile={tile}
          index={index}
          count={tiles.length}
          crystalColour={crystalColour}
        />
      ))}
    </group>
  );
};

const FlankingShards = ({
  crystalColour,
  spread,
  height,
}: {
  crystalColour: string;
  spread: number;
  height: number;
}) => {
  const geometry = useShardGeometry();
  return (
    <>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={geometry}
          position={[spread * side, height, 0]}
          rotation={[0, 0.4 * side, -0.18 * side]}
          scale={[0.24, 0.42, 0.24]}
        >
          <meshPhysicalMaterial
            color={crystalColour}
            emissive={crystalColour}
            emissiveIntensity={0.55}
            roughness={0.12}
            clearcoat={1}
            flatShading
          />
        </mesh>
      ))}
    </>
  );
};

const StoneTablet = ({ text, crystalColour }: PromptProps) => {
  const position = usePromptPosition();
  const { body } = usePromptBody(gentleSway);
  const slab = useMemo(
    () => new RoundedBoxGeometry(3.3, 1.6, 0.24, 3, 0.08),
    [],
  );
  useDisposedOnUnmount(slab);
  return (
    <group position={position} name="prompt-stone-tablet">
      <group ref={body}>
        <mesh geometry={slab}>
          <meshStandardMaterial
            color={cavePalette.stone}
            roughness={0.88}
            flatShading
          />
        </mesh>
        <WordPanel
          text={text}
          look={engravedLook}
          size={[3.02, 1.32]}
          textureSize={wideFace}
          position={[0, 0, 0.122]}
        />
        <mesh position={[0, -0.95, 0]}>
          <boxGeometry args={[3.7, 0.24, 0.62]} />
          <meshStandardMaterial color={cavePalette.rock} roughness={0.92} />
        </mesh>
        <FlankingShards
          crystalColour={crystalColour}
          spread={1.95}
          height={-0.85}
        />
      </group>
    </group>
  );
};

const lanternPosts: [number, number][] = [
  [-0.6, -0.6],
  [0.6, -0.6],
  [-0.6, 0.6],
  [0.6, 0.6],
];

const Lantern = ({ text }: PromptProps) => {
  const position = usePromptPosition();
  const { body } = usePromptBody((current, time) => {
    current.rotation.z = Math.sin(time * 1.1) * 0.05;
    current.rotation.y = -0.25 + Math.sin(time * 0.6) * 0.1;
  });
  return (
    <group position={[position[0], position[1] + 1.4, position[2]]}>
      <group ref={body} name="prompt-lantern">
        <group position={[0, -1.4, 0]}>
          <mesh position={[0, 1.9, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.6, 6]} />
            <meshStandardMaterial
              color={cavePalette.metal}
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 1.02, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.98, 0.42, 4]} />
            <meshStandardMaterial
              color={cavePalette.brass}
              metalness={0.85}
              roughness={0.28}
              flatShading
            />
          </mesh>
          {[0.78, -0.78].map((height) => (
            <mesh key={height} position={[0, height, 0]}>
              <boxGeometry args={[1.36, 0.09, 1.36]} />
              <meshStandardMaterial
                color={cavePalette.brass}
                metalness={0.85}
                roughness={0.28}
              />
            </mesh>
          ))}
          {lanternPosts.map(([x, z]) => (
            <mesh key={`${String(x)}-${String(z)}`} position={[x, 0, z]}>
              <boxGeometry args={[0.07, 1.5, 0.07]} />
              <meshStandardMaterial
                color={cavePalette.brass}
                metalness={0.85}
                roughness={0.28}
              />
            </mesh>
          ))}
          <mesh>
            <boxGeometry args={[1.12, 1.42, 1.12]} />
            <meshPhysicalMaterial
              color={cavePalette.lanternGlow}
              emissive={cavePalette.lanternGlow}
              emissiveIntensity={0.7}
              roughness={0.1}
              transparent
              opacity={0.42}
              depthWrite={false}
            />
          </mesh>
          <WordPanel
            text={text}
            look={{
              background: "#fff4dc",
              ink: cavePalette.lanternInk,
              border: undefined,
            }}
            size={[1.04, 0.74]}
            textureSize={{ width: 256, height: 182 }}
            position={[0, 0, 0.58]}
            glow={0.35}
          />
          <pointLight
            color={cavePalette.lanternGlow}
            intensity={5}
            distance={5}
            position={[0, 0, 0.9]}
          />
        </group>
      </group>
    </group>
  );
};

const geodeCrystalCount = 14;

const Geode = ({ text, crystalColour }: PromptProps) => {
  const position = usePromptPosition();
  const { body } = usePromptBody((current, time) => {
    current.rotation.z = Math.sin(time * 0.5) * 0.06;
    current.rotation.y = -0.2 + Math.sin(time * 0.4) * 0.12;
  });
  const shardGeometry = useShardGeometry();
  const ringCrystals = useMemo<Placement[]>(
    () =>
      Array.from({ length: geodeCrystalCount }, (_, index) => {
        const angle = (index / geodeCrystalCount) * Math.PI * 2;
        return {
          position: [Math.cos(angle) * 1.0, Math.sin(angle) * 1.0, -0.12],
          rotation: [0, 0, angle + Math.PI / 2],
          scale: [0.1, 0.18 + (index % 3) * 0.05, 0.1],
        };
      }),
    [],
  );
  const crystals = usePlacedInstances(ringCrystals);
  return (
    <group position={position} name="prompt-geode">
      <group ref={body}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <sphereGeometry
            args={[1.2, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshStandardMaterial
            color={cavePalette.rockLight}
            roughness={0.95}
            flatShading
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={0.97}>
          <sphereGeometry
            args={[1.2, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshPhysicalMaterial
            color={crystalColour}
            emissive={crystalColour}
            emissiveIntensity={0.3}
            roughness={0.25}
            clearcoat={1}
            side={BackSide}
            flatShading
          />
        </mesh>
        <mesh>
          <torusGeometry args={[1.2, 0.09, 6, 40]} />
          <meshStandardMaterial
            color={cavePalette.rock}
            roughness={0.9}
            flatShading
          />
        </mesh>
        <instancedMesh
          ref={crystals}
          args={[shardGeometry, undefined, geodeCrystalCount]}
          frustumCulled={false}
        >
          <meshPhysicalMaterial
            color={crystalColour}
            emissive={crystalColour}
            emissiveIntensity={0.6}
            roughness={0.1}
            clearcoat={1}
            flatShading
          />
        </instancedMesh>
        <WordPanel
          text={text}
          look={{
            background: cavePalette.slate,
            ink: cavePalette.paleInk,
            border: crystalColour,
          }}
          size={[1.5, 0.9]}
          textureSize={{ width: 320, height: 192 }}
          position={[0, 0, 0.05]}
          glow={0.25}
        />
      </group>
    </group>
  );
};

const sleeperCount = 8;
const cartOreCount = 6;

const Minecart = ({ text, crystalColour }: PromptProps) => {
  const position = usePromptPosition();
  const cart = useRef<Group>(null);
  const { age, motionScale } = usePromptGrowth();
  const body = useMemo(
    () => new RoundedBoxGeometry(2.5, 1.0, 1.1, 3, 0.08),
    [],
  );
  useDisposedOnUnmount(body);
  const shardGeometry = useShardGeometry();
  const sleepers = usePlacedInstances(
    useMemo<Placement[]>(
      () =>
        Array.from({ length: sleeperCount }, (_, index) => ({
          position: [(index - (sleeperCount - 1) / 2) * 0.75, -1.02, 0],
          scale: [0.22, 0.08, 1.3],
        })),
      [],
    ),
  );
  const ore = usePlacedInstances(
    useMemo<Placement[]>(
      () =>
        Array.from({ length: cartOreCount }, (_, index) => ({
          position: [(index - (cartOreCount - 1) / 2) * 0.36, 0.36, -0.1],
          rotation: [0.2 * (index % 2), index, ((index % 3) - 1) * 0.35],
          scale: [0.13, 0.2 + (index % 3) * 0.05, 0.13],
        })),
      [],
    ),
  );
  const wheelPlacements = useMemo<Placement[]>(
    () =>
      [-0.85, 0.85].flatMap((x) =>
        [-0.5, 0.5].map((z): Placement => ({
          position: [x, -0.72, z],
          rotation: [Math.PI / 2, 0, 0],
          scale: [1, 1, 1],
        })),
      ),
    [],
  );
  const wheels = usePlacedInstances(wheelPlacements);

  useFrame(() => {
    const rolled =
      motionScale === 0 ? 1 : Math.min(1, age.current / cartRollSeconds);
    const easedRoll = 1 - (1 - rolled) ** 3;
    if (cart.current !== null) {
      cart.current.position.x = cartStartX * (1 - easedRoll);
    }
  });

  return (
    <group position={position} name="prompt-minecart">
      {[-0.48, 0.48].map((z) => (
        <mesh key={z} position={[0, -0.95, z]}>
          <boxGeometry args={[6.2, 0.07, 0.07]} />
          <meshStandardMaterial
            color={cavePalette.metal}
            metalness={0.85}
            roughness={0.32}
          />
        </mesh>
      ))}
      <instancedMesh
        ref={sleepers}
        args={[undefined, undefined, sleeperCount]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={cavePalette.woodDark} roughness={0.9} />
      </instancedMesh>
      <group ref={cart} position={[cartStartX, 0, 0]}>
        <mesh geometry={body} position={[0, -0.12, 0]}>
          <meshStandardMaterial color={cavePalette.wood} roughness={0.75} />
        </mesh>
        {[-0.95, 0.95].map((x) => (
          <mesh key={x} position={[x, -0.12, 0]}>
            <boxGeometry args={[0.1, 1.04, 1.16]} />
            <meshStandardMaterial
              color={cavePalette.metal}
              metalness={0.8}
              roughness={0.35}
            />
          </mesh>
        ))}
        <instancedMesh
          ref={wheels}
          args={[undefined, undefined, wheelPlacements.length]}
          frustumCulled={false}
        >
          <cylinderGeometry args={[0.26, 0.26, 0.12, 16]} />
          <meshStandardMaterial
            color={cavePalette.rock}
            metalness={0.6}
            roughness={0.45}
          />
        </instancedMesh>
        <instancedMesh
          ref={ore}
          args={[shardGeometry, undefined, cartOreCount]}
          frustumCulled={false}
        >
          <meshPhysicalMaterial
            color={crystalColour}
            emissive={crystalColour}
            emissiveIntensity={0.6}
            roughness={0.1}
            clearcoat={1}
            flatShading
          />
        </instancedMesh>
        <WordPanel
          text={text}
          look={parchmentLook}
          size={[1.72, 0.78]}
          textureSize={wideFace}
          position={[0, -0.12, 0.562]}
        />
      </group>
    </group>
  );
};

const pedestalProfile = [
  [0, -1.2],
  [0.62, -1.2],
  [0.62, -1.1],
  [0.36, -1.0],
  [0.26, -0.82],
  [0.44, -0.72],
  [0, -0.72],
];

const CrystalOrb = ({ text, crystalColour }: PromptProps) => {
  const position = usePromptPosition();
  const orb = useRef<Group>(null);
  const { age, motionScale } = usePromptGrowth();
  const pedestal = useMemo(
    () =>
      new LatheGeometry(
        pedestalProfile.map(([across, along]) => new Vector2(across, along)),
        24,
      ),
    [],
  );
  useDisposedOnUnmount(pedestal);

  useFrame(() => {
    const current = orb.current;
    if (current === null) {
      return;
    }
    const time = age.current * motionScale;
    current.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    current.position.y = 0.2 + Math.sin(time * 1.3) * 0.07;
  });

  return (
    <group position={position} name="prompt-crystal-orb">
      <mesh geometry={pedestal}>
        <meshStandardMaterial
          color={cavePalette.brass}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, -0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.025, 6, 40]} />
        <meshBasicMaterial color={crystalColour} toneMapped={false} />
      </mesh>
      <group ref={orb}>
        <mesh scale={0.55}>
          <sphereGeometry args={[1, 20, 12]} />
          <meshBasicMaterial
            color={crystalColour}
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
        <WordPanel
          text={text}
          look={{
            background: undefined,
            ink: cavePalette.paleInk,
            border: undefined,
          }}
          size={[1.34, 0.76]}
          textureSize={{ width: 320, height: 182 }}
          glow={0.9}
          isTransparent
        />
        <mesh renderOrder={3}>
          <sphereGeometry args={[0.95, 32, 20]} />
          <meshPhysicalMaterial
            color={cavePalette.glass}
            roughness={0.04}
            clearcoat={1}
            clearcoatRoughness={0.02}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};

const runeStudCount = 8;

const RuneRing = ({ text, crystalColour }: PromptProps) => {
  const position = usePromptPosition();
  const ring = useRef<Group>(null);
  const { body, age, motionScale } = usePromptBody(gentleSway);
  const studs = usePlacedInstances(
    useMemo<Placement[]>(
      () =>
        Array.from({ length: runeStudCount }, (_, index) => {
          const angle = (index / runeStudCount) * Math.PI * 2;
          return {
            position: [Math.cos(angle) * 1.08, Math.sin(angle) * 1.08, 0.14],
            rotation: [0, 0, angle],
            scale: [0.1, 0.18, 0.06],
          };
        }),
      [],
    ),
  );

  useFrame(() => {
    if (ring.current !== null) {
      ring.current.rotation.z = age.current * motionScale * 0.35;
    }
  });

  return (
    <group position={position} name="prompt-rune-ring">
      <group ref={body}>
        <group ref={ring}>
          <mesh>
            <torusGeometry args={[1.08, 0.16, 10, 48]} />
            <meshStandardMaterial
              color={cavePalette.stone}
              roughness={0.85}
              flatShading
            />
          </mesh>
          <instancedMesh
            ref={studs}
            args={[undefined, undefined, runeStudCount]}
            frustumCulled={false}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={crystalColour}
              emissive={crystalColour}
              emissiveIntensity={1.1}
            />
          </instancedMesh>
        </group>
        <mesh position={[0, 0, -0.03]}>
          <circleGeometry args={[0.94, 40]} />
          <meshStandardMaterial color={cavePalette.slate} roughness={0.8} />
        </mesh>
        <WordPanel
          text={text}
          look={{
            background: undefined,
            ink: cavePalette.paleInk,
            border: undefined,
          }}
          size={[1.5, 0.9]}
          textureSize={{ width: 320, height: 192 }}
          position={[0, 0, 0.01]}
          glow={0.5}
          isTransparent
        />
      </group>
    </group>
  );
};

const chestGemCount = 7;
const chestLidOpenAngle = -1.9;

const GemChest = ({ text }: PromptProps) => {
  const position = usePromptPosition();
  const lid = useRef<Group>(null);
  const { body, age, motionScale } = usePromptBody(gentleSway);
  const gemPlacements = useMemo<Placement[]>(
    () =>
      Array.from({ length: chestGemCount }, (_, index) => ({
        position: [
          (index - (chestGemCount - 1) / 2) * 0.3,
          -0.12,
          ((index % 2) - 0.5) * 0.4,
        ],
        rotation: [index * 0.6, index, 0.3],
        scale: [0.14, 0.18, 0.14],
      })),
    [],
  );
  const gems = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = gems.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    gemPlacements.forEach(
      ({ position, rotation = [0, 0, 0], scale }, index) => {
        placer.position.set(...position);
        placer.rotation.set(...rotation);
        placer.scale.set(...scale);
        placer.updateMatrix();
        mesh.setMatrixAt(index, placer.matrix);
        mesh.setColorAt(
          index,
          new Color(cavePalette.choices[index % cavePalette.choices.length]),
        );
      },
    );
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [gemPlacements]);

  useFrame(() => {
    if (lid.current !== null) {
      const opened = findGrowth(age.current - 0.15, 0.7, motionScale);
      lid.current.rotation.x = chestLidOpenAngle * Math.min(1.04, opened);
    }
  });

  return (
    <group position={position} name="prompt-gem-chest">
      <group ref={body}>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[2.4, 0.9, 1.2]} />
          <meshStandardMaterial color={cavePalette.wood} roughness={0.78} />
        </mesh>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, -0.6, 0]}>
            <boxGeometry args={[0.12, 0.94, 1.24]} />
            <meshStandardMaterial
              color={cavePalette.brass}
              metalness={0.85}
              roughness={0.3}
            />
          </mesh>
        ))}
        <instancedMesh
          ref={gems}
          args={[undefined, undefined, chestGemCount]}
          frustumCulled={false}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            roughness={0.1}
            clearcoat={1}
            emissive="#ffffff"
            emissiveIntensity={0.15}
            flatShading
          />
        </instancedMesh>
        <group ref={lid} position={[0, -0.15, -0.6]}>
          <mesh position={[0, 0.09, 0.6]}>
            <boxGeometry args={[2.4, 0.18, 1.2]} />
            <meshStandardMaterial color={cavePalette.wood} roughness={0.78} />
          </mesh>
          <WordPanel
            text={text}
            look={parchmentLook}
            size={[2.1, 1.0]}
            textureSize={wideFace}
            position={[0, -0.005, 0.6]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
        <pointLight
          color={cavePalette.lanternGlow}
          intensity={3}
          distance={3}
          position={[0, 0.1, 0.4]}
        />
      </group>
    </group>
  );
};

const pageWidth = 3.1;
const pageHeight = 1.8;
const pageDepth = 0.24;

const buildPageGeometry = (): PlaneGeometry => {
  const geometry = new PlaneGeometry(pageWidth, pageHeight, 32, 1);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const across = Math.abs(positions.getX(index)) / (pageWidth / 2);
    positions.setZ(
      index,
      pageDepth * Math.sqrt(across) - pageDepth * across * 0.35,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
};

const OpenBook = ({ text }: PromptProps) => {
  const position = usePromptPosition();
  const { body } = usePromptBody((current, time) => {
    current.rotation.x = -0.32 + Math.sin(time * 0.6) * 0.03;
    current.rotation.y = -0.15 + Math.sin(time * 0.45) * 0.06;
  });
  const pages = useMemo(() => buildPageGeometry(), []);
  const cover = useMemo(
    () => new RoundedBoxGeometry(3.3, 1.98, 0.1, 2, 0.04),
    [],
  );
  useDisposedOnUnmount(pages);
  useDisposedOnUnmount(cover);
  return (
    <group position={position} name="prompt-open-book">
      <group ref={body}>
        <mesh geometry={cover} position={[0, 0, -0.06]}>
          <meshStandardMaterial color={cavePalette.leather} roughness={0.6} />
        </mesh>
        <WordPanel
          text={text}
          look={{
            background: cavePalette.parchment,
            ink: cavePalette.ink,
            border: undefined,
          }}
          size={[pageWidth, pageHeight]}
          textureSize={{ width: 512, height: 298 }}
          geometry={pages}
        />
        <mesh position={[0.5, -1.05, 0.02]}>
          <boxGeometry args={[0.1, 0.5, 0.01]} />
          <meshStandardMaterial color="#b4232f" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

const Obelisk = ({ text, crystalColour }: PromptProps) => {
  const position = usePromptPosition();
  const { body } = usePromptBody((current, time) => {
    current.rotation.y = Math.sin(time * 0.4) * 0.12;
  });
  return (
    <group position={position} name="prompt-obelisk">
      <group ref={body}>
        <mesh position={[0, -0.88, 0]}>
          <boxGeometry args={[1.9, 0.26, 1.9]} />
          <meshStandardMaterial color={cavePalette.rock} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.25, 0]} rotation={[0, Math.PI / 4, 0]}>
          <cylinderGeometry args={[0.92, 1.12, 2.0, 4, 1]} />
          <meshStandardMaterial
            color={cavePalette.rockLight}
            roughness={0.8}
            flatShading
          />
        </mesh>
        <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.92, 0.5, 4]} />
          <meshPhysicalMaterial
            color={crystalColour}
            emissive={crystalColour}
            emissiveIntensity={0.9}
            roughness={0.1}
            clearcoat={1}
            flatShading
          />
        </mesh>
        <WordPanel
          text={text}
          look={{
            background: cavePalette.slate,
            ink: crystalColour,
            border: crystalColour,
          }}
          size={[1.22, 0.86]}
          textureSize={{ width: 288, height: 204 }}
          position={[0, 0.25, 0.745]}
          rotation={[-0.07, 0, 0]}
          glow={0.7}
        />
      </group>
    </group>
  );
};

const promptObjects: Record<
  PhonicsGameScene,
  (promptProps: PromptProps) => ReactNode
> = {
  "crystal-tiles": CrystalTiles,
  "stone-tablet": StoneTablet,
  lantern: Lantern,
  geode: Geode,
  minecart: Minecart,
  "crystal-orb": CrystalOrb,
  "rune-ring": RuneRing,
  "gem-chest": GemChest,
  "open-book": OpenBook,
  obelisk: Obelisk,
};

interface ChoicePropProps extends ChoiceSlot {
  colour: string;
}

const useSpinningChoice = (slot: ChoiceSlot, speed: number) => {
  const { choice, age, motionScale } = useGrowingChoice(slot);
  const spinner = useRef<Group>(null);
  useFrame(() => {
    if (spinner.current !== null) {
      spinner.current.rotation.y =
        slot.index + age.current * speed * motionScale;
    }
  });
  return { choice, spinner };
};

const crystalChoiceMaterial = (colour: string) => (
  <meshPhysicalMaterial
    color={colour}
    emissive={colour}
    emissiveIntensity={0.3}
    roughness={0.1}
    clearcoat={1}
    clearcoatRoughness={0.04}
    flatShading
  />
);

const GemChoice = ({ colour, ...slot }: ChoicePropProps) => {
  const { choice, spinner } = useSpinningChoice(slot, 0.8);
  return (
    <group ref={choice} position={slot.position} name="choice-gem">
      <group ref={spinner}>
        <mesh scale={[1, 1.35, 1]}>
          <octahedronGeometry args={[slot.radius * 0.6, 0]} />
          {crystalChoiceMaterial(colour)}
        </mesh>
      </group>
    </group>
  );
};

const ShardChoice = ({ colour, ...slot }: ChoicePropProps) => {
  const { choice, spinner } = useSpinningChoice(slot, 0.6);
  const geometry = useShardGeometry();
  return (
    <group ref={choice} position={slot.position} name="choice-shard">
      <group ref={spinner} rotation={[0, 0, 0.2]}>
        <mesh
          geometry={geometry}
          position={[0, -slot.radius * 0.8, 0]}
          scale={[slot.radius * 0.5, slot.radius * 0.8, slot.radius * 0.5]}
        >
          {crystalChoiceMaterial(colour)}
        </mesh>
      </group>
    </group>
  );
};

const runestoneProfile = [
  [0, -1],
  [0.78, -1],
  [0.96, -0.6],
  [1, 0],
  [0.96, 0.6],
  [0.78, 1],
  [0, 1],
];

const RunestoneChoice = ({ colour, ...slot }: ChoicePropProps) => {
  const { choice } = useGrowingChoice(slot);
  const geometry = useMemo(
    () =>
      new LatheGeometry(
        runestoneProfile.map(
          ([across, along]) =>
            new Vector2(
              across * slot.radius * 0.85,
              along * slot.radius * 0.18,
            ),
        ),
        24,
      ),
    [slot.radius],
  );
  useDisposedOnUnmount(geometry);
  return (
    <group ref={choice} position={slot.position} name="choice-runestone">
      <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={cavePalette.stone}
          roughness={0.85}
          flatShading
        />
      </mesh>
      <mesh position={[0, 0, slot.radius * 0.19]}>
        <torusGeometry args={[slot.radius * 0.62, slot.radius * 0.04, 6, 28]} />
        <meshBasicMaterial color={colour} toneMapped={false} />
      </mesh>
    </group>
  );
};

const OrbChoice = ({ colour, ...slot }: ChoicePropProps) => {
  const { choice, spinner } = useSpinningChoice(slot, 1.2);
  return (
    <group ref={choice} position={slot.position} name="choice-orb">
      <mesh>
        <sphereGeometry args={[slot.radius * 0.5, 20, 12]} />
        <meshPhysicalMaterial
          color={colour}
          emissive={colour}
          emissiveIntensity={0.55}
          roughness={0.15}
          clearcoat={1}
        />
      </mesh>
      <group ref={spinner}>
        <mesh rotation={[1.2, 0, 0.3]}>
          <torusGeometry
            args={[slot.radius * 0.74, slot.radius * 0.03, 6, 28]}
          />
          <meshStandardMaterial
            color={cavePalette.brass}
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
};

const clusterShards: [number, number, number, number][] = [
  [0, -0.75, 0, 0.82],
  [-0.32, -0.75, 0.05, 0.55],
  [0.3, -0.75, -0.05, 0.62],
];

const ClusterChoice = ({ colour, ...slot }: ChoicePropProps) => {
  const { choice, spinner } = useSpinningChoice(slot, 0.4);
  const geometry = useShardGeometry();
  return (
    <group ref={choice} position={slot.position} name="choice-cluster">
      <group ref={spinner}>
        {clusterShards.map(([x, y, z, height], index) => (
          <mesh
            key={index}
            geometry={geometry}
            position={[x * slot.radius, y * slot.radius, z * slot.radius]}
            rotation={[0, index, (x === 0 ? 0 : Math.sign(x)) * -0.35]}
            scale={[
              slot.radius * 0.32,
              slot.radius * height,
              slot.radius * 0.32,
            ]}
          >
            {crystalChoiceMaterial(colour)}
          </mesh>
        ))}
      </group>
    </group>
  );
};

const DiamondChoice = ({ colour, ...slot }: ChoicePropProps) => {
  const { choice, spinner } = useSpinningChoice(slot, 0.9);
  return (
    <group ref={choice} position={slot.position} name="choice-diamond">
      <group ref={spinner}>
        <mesh position={[0, slot.radius * 0.12, 0]}>
          <cylinderGeometry
            args={[
              slot.radius * 0.36,
              slot.radius * 0.62,
              slot.radius * 0.24,
              8,
            ]}
          />
          {crystalChoiceMaterial(colour)}
        </mesh>
        <mesh position={[0, -slot.radius * 0.38, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[slot.radius * 0.62, slot.radius * 0.76, 8]} />
          {crystalChoiceMaterial(colour)}
        </mesh>
      </group>
    </group>
  );
};

const choicePropObjects: Record<
  PhonicsChoiceProp,
  (choicePropProps: ChoicePropProps) => ReactNode
> = {
  gem: GemChoice,
  shard: ShardChoice,
  runestone: RunestoneChoice,
  orb: OrbChoice,
  cluster: ClusterChoice,
  diamond: DiamondChoice,
};

export const CaveGameWorld = ({
  phonicsGame,
  prompt,
  choices,
  hiddenChoiceIndexes,
  companionMood,
  poppedChoiceIndex,
  popCount,
  isEffectsOn,
}: CaveGameWorldProps) => {
  const radius = useChoiceRadius();
  const choicePositions = useChoicePositions(choices.length, "phonics-games");
  const crystalColour = findCrystalColour(phonicsGame.yearGroup);
  const PromptObject = promptObjects[phonicsGame.scene];
  const ChoicePropObject = choicePropObjects[phonicsGame.choiceProp];
  const poppedPosition =
    poppedChoiceIndex === undefined
      ? undefined
      : choicePositions[poppedChoiceIndex];

  return (
    <>
      <CaveStage crystalColour={crystalColour} companionMood={companionMood} />
      <group key={popCount}>
        {prompt?.kind === "phonics-word" ? (
          <PromptObject text={prompt.text} crystalColour={crystalColour} />
        ) : null}
      </group>
      {choices.map((choice, index) =>
        hiddenChoiceIndexes.includes(index) ? null : (
          <group key={`${String(popCount)}-${choice}`}>
            <ChoicePropObject
              position={choicePositions[index]}
              radius={radius}
              index={index}
              colour={cavePalette.choices[index % cavePalette.choices.length]}
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
