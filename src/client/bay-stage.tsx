import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  SRGBColorSpace,
  Vector2,
} from "three";
import { buildPaletteUniform } from "./pixel-pipeline.js";
import {
  StudioBackdrop,
  StudioCompanion,
  StudioLights,
  useDisposedOnUnmount,
  type CompanionMood,
} from "./studio-stage.js";
import {
  useDisposedMaterials,
  useGrowingChoice,
  useMotionScale,
  usePlacedInstances,
  type ChoiceSlot,
  type Placement,
} from "./studio-stage.js";

export {
  findGrowth,
  promptGrowSeconds,
  useDisposedMaterials,
  useGrowingChoice,
  useMotionScale,
  usePlacedInstances,
  usePromptGrowth,
  usePromptPosition,
  type ChoiceSlot,
  type Placement,
} from "./studio-stage.js";

export const bayPalette = {
  sand: "#d9b98a",
  deepWater: "#0f4c6e",
  caustic: "#c9f4ff",
  shaft: "#9be7ff",
  kelpRoot: "#0d5c46",
  kelpTip: "#5fd39a",
  rock: "#3d4f63",
  starfish: "#ff7a59",
  tokens: ["#b4232f", "#0b6e66", "#9a4a06", "#5b21b6"],
  shapes: ["#38bdf8", "#f472b6", "#facc15", "#4ade80"],
  shapeEdge: "#0b1a2e",
  plinth: "#d9f3ff",
  plinthGlow: "#5ee0f0",
  fishGroups: ["#ff8a3d", "#ffd23f", "#ff6f91", "#4cc9f0"],
  fishEye: "#0d1526",
  frameTray: "#f4f7fb",
  frameWell: "#c4d3e2",
  counter: "#c81e2c",
  changingCounter: "#fbbf24",
  ringRed: "#e8394a",
  ringWhite: "#fbfdff",
  block: "#fff6e0",
  blockInk: "#123a63",
} as const;

export const tokenGrowSeconds = 0.45;

const bayTime = { value: 0 };

const useBayClock = () => {
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    bayTime.value += deltaSeconds * motionScale;
  });
};

const seabedVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const seabedFragmentShader = `
uniform float time;
uniform vec3 sand;
uniform vec3 deepWater;
uniform vec3 caustic;
varying vec2 vUv;

float findCaustic(vec2 point) {
  float wave = sin(point.x * 3.1 + time * 0.9 + sin(point.y * 2.3 + time * 0.6));
  wave += sin(point.y * 3.7 - time * 0.7 + sin(point.x * 2.9 - time * 0.5));
  wave += sin((point.x + point.y) * 2.2 + time * 0.4);
  return pow(clamp(1.0 - abs(wave) / 1.4, 0.0, 1.0), 5.0);
}

void main() {
  vec2 point = vUv * vec2(18.0, 7.0);
  float distanceAway = smoothstep(0.2, 0.92, vUv.y);
  float dunes = 0.9 + 0.1 * sin(point.x * 0.7 + sin(point.y * 0.9) * 1.5);
  vec3 colour = mix(sand * dunes, deepWater, distanceAway);
  colour += caustic * findCaustic(point) * (1.0 - distanceAway) * 0.45;
  gl_FragColor = vec4(colour, 1.0);
}
`;

const instancedPhase = `
float phase = 0.0;
#ifdef USE_INSTANCING
  phase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z;
#endif
`;

const placeInstance = `
  vec4 placed = vec4(bent, 1.0);
#ifdef USE_INSTANCING
  placed = instanceMatrix * placed;
#endif
  gl_Position = projectionMatrix * modelViewMatrix * placed;
`;

const lightShaftVertexShader = `
varying vec2 vUv;
varying float vPhase;

void main() {
  vUv = uv;
  ${instancedPhase}
  vPhase = phase;
  vec3 bent = position;
  ${placeInstance}
}
`;

const lightShaftFragmentShader = `
uniform float time;
uniform vec3 shaft;
varying vec2 vUv;
varying float vPhase;

void main() {
  float across = sin(vUv.x * 3.14159);
  float fall = smoothstep(0.0, 0.85, vUv.y);
  float shimmer = 0.7 + 0.3 * sin(time * 0.6 + vPhase);
  gl_FragColor = vec4(shaft, across * across * fall * shimmer * 0.11);
}
`;

const kelpVertexShader = `
uniform float time;
varying vec2 vUv;

void main() {
  vUv = uv;
  ${instancedPhase}
  vec3 bent = position;
  bent.x *= 1.0 - uv.y * 0.75;
  float reach = pow(uv.y, 1.6);
  bent.x += sin(time * 1.3 + phase + uv.y * 2.4) * 0.09 * reach;
  bent.z += cos(time * 0.9 + phase) * 0.04 * reach;
  ${placeInstance}
}
`;

const kelpFragmentShader = `
uniform vec3 kelpRoot;
uniform vec3 kelpTip;
varying vec2 vUv;

void main() {
  float vein = 1.0 - smoothstep(0.0, 0.12, abs(vUv.x - 0.5)) * 0.18;
  vec3 colour = mix(kelpRoot, kelpTip, vUv.y) * vein;
  gl_FragColor = vec4(colour, 1.0);
}
`;

const buildSeabedMaterial = (time: { value: number }) => {
  const [sand, deepWater, caustic] = buildPaletteUniform([
    bayPalette.sand,
    bayPalette.deepWater,
    bayPalette.caustic,
  ]);
  return new ShaderMaterial({
    uniforms: {
      time,
      sand: { value: sand },
      deepWater: { value: deepWater },
      caustic: { value: caustic },
    },
    vertexShader: seabedVertexShader,
    fragmentShader: seabedFragmentShader,
  });
};

const buildLightShaftMaterial = (time: { value: number }) => {
  const [shaft] = buildPaletteUniform([bayPalette.shaft]);
  return new ShaderMaterial({
    uniforms: { time, shaft: { value: shaft } },
    vertexShader: lightShaftVertexShader,
    fragmentShader: lightShaftFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
};

const buildKelpMaterial = (time: { value: number }) => {
  const [kelpRoot, kelpTip] = buildPaletteUniform([
    bayPalette.kelpRoot,
    bayPalette.kelpTip,
  ]);
  return new ShaderMaterial({
    uniforms: {
      time,
      kelpRoot: { value: kelpRoot },
      kelpTip: { value: kelpTip },
    },
    vertexShader: kelpVertexShader,
    fragmentShader: kelpFragmentShader,
    side: DoubleSide,
  });
};

const seabedHeight = -2.6;

const lightShafts: Placement[] = [
  { position: [-4.2, 1.2, -5.5], rotation: [0, 0, 0.28], scale: [1.4, 10, 1] },
  { position: [-1.1, 1.2, -5.5], rotation: [0, 0, 0.2], scale: [1.4, 10, 1] },
  { position: [2.4, 1.2, -5.5], rotation: [0, 0, 0.24], scale: [1.4, 10, 1] },
  { position: [5.6, 1.2, -5.5], rotation: [0, 0, 0.3], scale: [1.4, 10, 1] },
];
const kelpStrands: Placement[] = [
  { position: [-6.4, seabedHeight, -4.2], scale: [1, 3.4, 1] },
  { position: [-5.7, seabedHeight, -3.4], scale: [1, 2.6, 1] },
  { position: [-3.4, seabedHeight, -5.4], scale: [1, 3.1, 1] },
  { position: [4.9, seabedHeight, -4.8], scale: [1, 3.6, 1] },
  { position: [6.1, seabedHeight, -3.6], scale: [1, 2.4, 1] },
  { position: [7.2, seabedHeight, -5.6], scale: [1, 3.2, 1] },
];
const rocks: Placement[] = [
  { position: [-5.2, seabedHeight + 0.2, -2.6], scale: [0.98, 0.7, 0.7] },
  { position: [-2.4, seabedHeight + 0.15, -4.6], scale: [0.7, 0.5, 0.5] },
  { position: [3.6, seabedHeight + 0.25, -3.2], scale: [1.2, 0.85, 0.85] },
  { position: [6.6, seabedHeight + 0.16, -2.2], scale: [0.77, 0.55, 0.55] },
];
const starfishSpots: Placement[] = [
  {
    position: [-3.6, seabedHeight + 0.05, -1.6],
    rotation: [-Math.PI / 2, 0, 0.4],
    scale: [1, 1, 1],
  },
  {
    position: [4.4, seabedHeight + 0.05, -1.2],
    rotation: [-Math.PI / 2, 0, 1.3],
    scale: [1, 1, 1],
  },
];

const buildStarShape = (outer: number, inner: number): Shape => {
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2 + Math.PI / 2;
    const reach = index % 2 === 0 ? outer : inner;
    return new Vector2(Math.cos(angle) * reach, Math.sin(angle) * reach);
  });
  return new Shape(points);
};

const useSeabedGeometries = () => {
  const geometries = useMemo(
    () => ({
      starfish: new ExtrudeGeometry(buildStarShape(0.42, 0.18), {
        depth: 0.06,
        bevelEnabled: true,
        bevelSize: 0.05,
        bevelThickness: 0.05,
        bevelSegments: 2,
      }),
      kelp: new PlaneGeometry(0.34, 1, 1, 10).translate(0, 0.5, 0),
    }),
    [],
  );
  useDisposedOnUnmount(geometries.starfish);
  useDisposedOnUnmount(geometries.kelp);
  return geometries;
};

const Seabed = () => {
  useBayClock();
  const materials = useMemo(
    () => ({
      seabed: buildSeabedMaterial(bayTime),
      shafts: buildLightShaftMaterial(bayTime),
      kelp: buildKelpMaterial(bayTime),
    }),
    [],
  );
  const everyMaterial = useMemo(() => Object.values(materials), [materials]);
  useDisposedMaterials(everyMaterial);
  const geometries = useSeabedGeometries();
  const shafts = usePlacedInstances(lightShafts);
  const kelp = usePlacedInstances(kelpStrands);
  const rockPile = usePlacedInstances(rocks);
  const starfish = usePlacedInstances(starfishSpots);

  return (
    <group name="seabed">
      <mesh
        material={materials.seabed}
        position={[0, seabedHeight, -3]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[40, 14]} />
      </mesh>
      <instancedMesh
        ref={shafts}
        args={[undefined, materials.shafts, lightShafts.length]}
        frustumCulled={false}
        renderOrder={1}
      >
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
      <instancedMesh
        ref={kelp}
        args={[geometries.kelp, materials.kelp, kelpStrands.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={rockPile}
        args={[undefined, undefined, rocks.length]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={bayPalette.rock}
          roughness={0.9}
          flatShading
        />
      </instancedMesh>
      <instancedMesh
        ref={starfish}
        args={[geometries.starfish, undefined, starfishSpots.length]}
        frustumCulled={false}
      >
        <meshPhysicalMaterial
          color={bayPalette.starfish}
          roughness={0.55}
          clearcoat={0.4}
        />
      </instancedMesh>
    </group>
  );
};

export const BayStage = ({
  companionMood,
}: {
  companionMood: CompanionMood;
}) => (
  <>
    <StudioLights />
    <StudioBackdrop />
    <Seabed />
    <StudioCompanion mood={companionMood} />
  </>
);

const tokenProfile = [
  [0, -1],
  [0.72, -1],
  [0.9, -0.82],
  [1, -0.35],
  [1, 0.35],
  [0.9, 0.82],
  [0.72, 1],
  [0, 1],
];

const useTokenGeometry = (radius: number) => {
  const geometry = useMemo(
    () =>
      new LatheGeometry(
        tokenProfile.map(
          ([across, along]) =>
            new Vector2(across * radius * 0.9, along * radius * 0.2),
        ),
        20,
      ),
    [radius],
  );
  useDisposedOnUnmount(geometry);
  return geometry;
};

export const SeaGlassToken = (slot: ChoiceSlot) => {
  const { choice } = useGrowingChoice(slot);
  const geometry = useTokenGeometry(slot.radius);

  return (
    <group ref={choice} position={slot.position} name="choice-token">
      <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]}>
        <meshPhysicalMaterial
          color={bayPalette.tokens[slot.index % bayPalette.tokens.length]}
          roughness={0.16}
          clearcoat={1}
          clearcoatRoughness={0.06}
        />
      </mesh>
    </group>
  );
};

const letterTextureSize = 256;
const faceFontShares = [0.7, 0.7, 0.52, 0.4];

export const buildFaceFont = (text: string, size = letterTextureSize) =>
  `800 ${String(Math.round(size * (faceFontShares[Math.min(text.length, 3)] ?? 0.4)))}px "Baloo 2 Variable", "Baloo 2", sans-serif`;

const drawFace = (canvas: HTMLCanvasElement, text: string): boolean => {
  const context = canvas.getContext("2d");
  if (context === null) {
    return false;
  }
  context.fillStyle = bayPalette.block;
  context.fillRect(0, 0, letterTextureSize, letterTextureSize);
  context.strokeStyle = bayPalette.blockInk;
  context.globalAlpha = 0.18;
  context.lineWidth = 10;
  context.strokeRect(14, 14, letterTextureSize - 28, letterTextureSize - 28);
  context.globalAlpha = 1;
  context.fillStyle = bayPalette.blockInk;
  context.font = buildFaceFont(text);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, letterTextureSize / 2, letterTextureSize * 0.54);
  return true;
};

const buildFaceTexture = (text: string): FaceTexture | undefined => {
  const canvas = document.createElement("canvas");
  canvas.width = letterTextureSize;
  canvas.height = letterTextureSize;
  if (!drawFace(canvas, text)) {
    return undefined;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
};

interface FaceTexture {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

export const useFaceTexture = (text: string): CanvasTexture | undefined => {
  const face = useMemo(() => buildFaceTexture(text), [text]);

  useEffect(() => {
    if (face === undefined) {
      return;
    }
    let isShown = true;
    void document.fonts.load(buildFaceFont(text)).then(() => {
      if (isShown && drawFace(face.canvas, text)) {
        face.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
      face.texture.dispose();
    };
  }, [face, text]);

  return face?.texture;
};
