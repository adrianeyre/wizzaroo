import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  Object3D,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  type Group,
  Line,
  LineBasicMaterial,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  type MeshPhysicalMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type {
  ChoiceArt,
  Mood,
  MusicPrompt,
  NotationFace,
  StageProp,
} from "../curriculum/music-prompts.js";
import {
  findPitchOf,
  isBlackKey,
  listRhythmSounds,
} from "../curriculum/music-theory.js";
import type { MusicGame } from "../curriculum/music-game.js";
import type { MusicGameType } from "../curriculum/music-games.js";
import { getChoicePositions, promptScreenPosition } from "./mission/mission.js";
import { buildMusicModelGeometry } from "./music-models.js";
import {
  drawNotationFace,
  notationFonts,
  notationPalette,
} from "./music-notation.js";
import {
  findPlayingBeat,
  findSecondsSinceOnset,
  findSoundingPitches,
  isMusicPlaying,
  readMusicLevel,
} from "./music-player.js";
import { buildPaletteUniform } from "./pixel-pipeline.js";
import { getMotionScale } from "./reduced-motion.js";
import {
  StudioCompanion,
  StudioLights,
  easeOutBack,
  placeOnStage,
  useChoiceRadius,
  useDisposedOnUnmount,
  type CompanionMood,
} from "./studio-stage.js";
import { buildModelGeometry, type ModelPart } from "./world-map-models.js";

export const canyonPalette = {
  skyTop: "#160f3d",
  skyMiddle: "#5b2a73",
  horizon: "#f2885a",
  sunGlow: "#ffb35c",
  ridgeFar: "#3b1d4f",
  ridgeNear: "#24123a",
  shell: "#fbe9cf",
  shellRib: "#e8b04a",
  plank: "#b9773d",
  plankDark: "#7a4522",
  footlight: "#ffd48a",
  beamWarm: "#ffcf7a",
  beamCool: "#7fe3ff",
  beamPink: "#ff8fd1",
  note: "#ffcf4a",
  pads: ["#ff5d73", "#3fb8ff", "#ffc53d", "#7ddc6a"],
  padRim: "#e8eef3",
  cardEdge: "#e7d8b8",
  pedestal: "#2b1f4a",
  pedestalGlow: "#ffcf4a",
  keyWhite: "#fbf8f1",
  keyBlack: "#1c1a26",
  keyMarked: "#ffcf33",
  keySounding: "#36d1e0",
  keyboardCase: "#3a1e14",
  lamp: "#ffdf6b",
  lampOff: "#5a4a32",
  stone: "#d08a52",
  ledge: "#a4552f",
  pond: "#1d6f78",
  lilyPad: "#4fb04a",
  frog: "#62c34a",
  baton: "#fbf8f1",
  batonHandle: "#c9853f",
  trail: "#ffe08a",
  bars: {
    C: "#ef4444",
    D: "#f97316",
    E: "#facc15",
    F: "#22c55e",
    G: "#14b8a6",
    A: "#6366f1",
    B: "#d946ef",
  },
  sections: { A: "#ef5b5b", B: "#3f8efc", C: "#2fbf71" },
  cakeTiers: ["#ff9fc4", "#ffe08a", "#9fd8ff"],
  icing: "#fffaf0",
  plate: "#e8eef3",
  candle: "#7c5cff",
  flame: "#ffb020",
  moods: {
    happy: "#ffd23f",
    sad: "#6fa8ff",
    scary: "#8b5cf6",
    sleepy: "#b9a8ff",
  },
} as const;

const useMotionScale = () => {
  const [motionScale] = useState(getMotionScale);
  return motionScale;
};

const growSeconds = 0.45;

const findGrowth = (ageSeconds: number, motionScale: number) =>
  motionScale === 0
    ? 1
    : easeOutBack(Math.min(1, Math.max(0, ageSeconds / growSeconds)));

const canyonTime = { value: 0 };
const musicLevel = { value: 0 };

const useCanyonClock = () => {
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    canyonTime.value += deltaSeconds * motionScale;
    musicLevel.value = readMusicLevel();
  });
};

const usePromptPosition = (): [number, number, number] => {
  const camera = useThree((state) => state.camera);
  return useMemo(() => placeOnStage(camera, promptScreenPosition), [camera]);
};

const useAge = () => {
  const age = useRef(0);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
  });
  return age;
};

const useDisposedMaterials = (
  materials: readonly { dispose: () => void }[],
) => {
  useEffect(
    () => () => {
      materials.forEach((material) => {
        material.dispose();
      });
    },
    [materials],
  );
};

const flatVertexShader = `
varying vec2 vUv;
varying float vPhase;

void main() {
  vUv = uv;
  vPhase = 0.0;
  vec4 placed = vec4(position, 1.0);
#ifdef USE_INSTANCING
  vPhase = instanceMatrix[3].x * 0.37;
  placed = instanceMatrix * placed;
#endif
  gl_Position = projectionMatrix * modelViewMatrix * placed;
}
`;

const canyonSkyFragmentShader = `
uniform float time;
uniform vec3 skyTop;
uniform vec3 skyMiddle;
uniform vec3 horizon;
uniform vec3 sunGlow;
uniform vec3 ridgeFar;
uniform vec3 ridgeNear;
varying vec2 vUv;

float findRidge(float x, float seed) {
  return 0.5 * sin(x * 3.1 + seed) + 0.25 * sin(x * 7.3 + seed * 2.1) + 0.12 * sin(x * 15.7 + seed * 3.7);
}

void main() {
  vec3 colour = mix(horizon, skyMiddle, smoothstep(0.38, 0.62, vUv.y));
  colour = mix(colour, skyTop, smoothstep(0.62, 0.95, vUv.y));
  float sun = 1.0 - smoothstep(0.0, 0.32, distance(vUv * vec2(2.0, 1.0), vec2(1.0, 0.42)));
  colour += sunGlow * sun * sun * 0.55;
  vec2 cell = floor(vUv * vec2(120.0, 48.0));
  float sparkle = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  float star = step(0.986, sparkle) * (0.55 + 0.45 * sin(time * 1.7 + sparkle * 60.0));
  colour += vec3(star) * smoothstep(0.6, 0.85, vUv.y) * 0.85;
  float farLine = 0.43 + 0.04 * findRidge(vUv.x * 2.2, 1.3);
  float farEdge = fwidth(vUv.y) * 1.5;
  colour = mix(colour, ridgeFar, 1.0 - smoothstep(farLine - farEdge, farLine + farEdge, vUv.y));
  float nearLine = 0.36 + 0.06 * findRidge(vUv.x * 1.5, 4.1);
  colour = mix(colour, ridgeNear, 1.0 - smoothstep(nearLine - farEdge, nearLine + farEdge, vUv.y));
  gl_FragColor = vec4(colour, 1.0);
}
`;

const stageFloorVertexShader = `
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const stageFloorFragmentShader = `
uniform vec3 plank;
uniform vec3 plankDark;
uniform vec3 footlight;
uniform float level;
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  float row = floor(vWorld.z * 2.4);
  float seam = smoothstep(0.0, 0.05, fract(vWorld.z * 2.4)) * smoothstep(1.0, 0.95, fract(vWorld.z * 2.4));
  float shift = fract(sin(row * 91.7) * 4375.5);
  float board = fract(vWorld.x * 0.35 + shift);
  float joint = smoothstep(0.0, 0.01, board) * smoothstep(1.0, 0.99, board);
  float grain = 0.88 + 0.12 * sin(vWorld.x * 9.0 + sin(vWorld.z * 13.0 + shift * 6.0) * 2.0);
  vec3 colour = mix(plankDark, plank, seam * joint * (0.85 + 0.15 * shift)) * grain;
  float pool = 1.0 - smoothstep(0.0, 4.5, length(vWorld.xz - vec2(0.6, -1.2)));
  colour += footlight * pool * (0.22 + level * 0.35);
  float up = clamp(vNormal.y, 0.0, 1.0);
  gl_FragColor = vec4(colour * mix(0.45, 1.0, up), 1.0);
}
`;

const beamFragmentShader = `
uniform float time;
uniform vec3 beamWarm;
uniform vec3 beamCool;
uniform vec3 beamPink;
uniform float level;
varying vec2 vUv;
varying float vPhase;

void main() {
  float across = sin(vUv.x * 3.14159);
  float fall = smoothstep(0.0, 0.9, vUv.y);
  float pick = fract(vPhase);
  vec3 colour = pick < 0.33 ? beamWarm : (pick < 0.66 ? beamCool : beamPink);
  float shimmer = 0.75 + 0.25 * sin(time * 0.8 + vPhase * 7.0);
  gl_FragColor = vec4(colour, across * across * fall * shimmer * (0.07 + level * 0.12));
}
`;

const buildCanyonSkyMaterial = () => {
  const [skyTop, skyMiddle, horizon, sunGlow, ridgeFar, ridgeNear] =
    buildPaletteUniform([
      canyonPalette.skyTop,
      canyonPalette.skyMiddle,
      canyonPalette.horizon,
      canyonPalette.sunGlow,
      canyonPalette.ridgeFar,
      canyonPalette.ridgeNear,
    ]);
  return new ShaderMaterial({
    uniforms: {
      time: canyonTime,
      skyTop: { value: skyTop },
      skyMiddle: { value: skyMiddle },
      horizon: { value: horizon },
      sunGlow: { value: sunGlow },
      ridgeFar: { value: ridgeFar },
      ridgeNear: { value: ridgeNear },
    },
    vertexShader: flatVertexShader,
    fragmentShader: canyonSkyFragmentShader,
    depthWrite: false,
  });
};

const buildStageFloorMaterial = () => {
  const [plank, plankDark, footlight] = buildPaletteUniform([
    canyonPalette.plank,
    canyonPalette.plankDark,
    canyonPalette.footlight,
  ]);
  return new ShaderMaterial({
    uniforms: {
      plank: { value: plank },
      plankDark: { value: plankDark },
      footlight: { value: footlight },
      level: musicLevel,
    },
    vertexShader: stageFloorVertexShader,
    fragmentShader: stageFloorFragmentShader,
  });
};

const buildBeamMaterial = () => {
  const [beamWarm, beamCool, beamPink] = buildPaletteUniform([
    canyonPalette.beamWarm,
    canyonPalette.beamCool,
    canyonPalette.beamPink,
  ]);
  return new ShaderMaterial({
    uniforms: {
      time: canyonTime,
      level: musicLevel,
      beamWarm: { value: beamWarm },
      beamCool: { value: beamCool },
      beamPink: { value: beamPink },
    },
    vertexShader: flatVertexShader,
    fragmentShader: beamFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
};

interface Placement {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
}

const usePlacedInstances = (placements: readonly Placement[]) => {
  const instances = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    placements.forEach(({ position, rotation = [0, 0, 0], scale }, index) => {
      placer.position.set(...position);
      placer.rotation.set(...rotation);
      placer.scale.set(...scale);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [placements]);
  return instances;
};

const stageFloorHeight = -2.75;
const stageCentreZ = -4.2;

const shellRibs: Placement[] = [1, 0.84, 0.68, 0.52].map((size, index) => ({
  position: [0, stageFloorHeight + 0.2, stageCentreZ - 0.6 - index * 0.55],
  scale: [size * 1.25, size, size],
}));

const footlights: Placement[] = Array.from({ length: 9 }, (_, index) => {
  const angle = -1.1 + (index / 8) * 2.2;
  return {
    position: [
      Math.sin(angle) * 6.2,
      stageFloorHeight + 0.28,
      stageCentreZ + Math.cos(angle) * 6.2,
    ],
    scale: [1, 1, 1],
  };
});

const spotlightBeams: Placement[] = [
  { position: [-4.6, 1.6, -3], rotation: [0, 0, -0.42], scale: [1.8, 9, 1] },
  { position: [-1.4, 2.2, -3.6], rotation: [0, 0, -0.14], scale: [1.6, 9, 1] },
  { position: [2.2, 2.2, -3.6], rotation: [0, 0, 0.16], scale: [1.6, 9, 1] },
  { position: [5.4, 1.6, -3], rotation: [0, 0, 0.44], scale: [1.8, 9, 1] },
];

const floatingNoteCount = 10;
const floatingNoteRise = 7;
const goldenRatioFraction = 0.618034;

const useQuaverGeometries = () => {
  const geometries = useMemo(() => {
    const head = new Shape();
    head.absellipse(0, 0, 0.32, 0.24, 0, Math.PI * 2, false, -0.4);
    const stem = new Shape();
    stem.moveTo(0.22, 0.05);
    stem.lineTo(0.32, 0.05);
    stem.lineTo(0.32, 0.72);
    stem.quadraticCurveTo(0.72, 0.62, 0.62, 0.28);
    stem.quadraticCurveTo(0.78, 0.66, 0.32, 0.98);
    stem.lineTo(0.22, 0.98);
    stem.closePath();
    return new ExtrudeGeometry([head, stem], {
      depth: 0.06,
      bevelEnabled: false,
      curveSegments: 3,
    }).translate(0, -0.4, -0.03);
  }, []);
  useDisposedOnUnmount(geometries);
  return geometries;
};

const FloatingNotes = () => {
  const notes = useRef<InstancedMesh>(null);
  const glow = useRef<MeshPhysicalMaterial>(null);
  const geometry = useQuaverGeometries();
  const placer = useMemo(() => new Object3D(), []);
  const layout = useMemo(
    () =>
      Array.from({ length: floatingNoteCount }, (_, index) => ({
        x: (((index * goldenRatioFraction) % 1) - 0.5) * 13,
        startY: ((index * 0.37) % 1) * floatingNoteRise,
        z: -2.6 - (index % 3) * 0.9,
        size: 0.22 + (index % 4) * 0.06,
        speed: 0.18 + (index % 3) * 0.07,
      })),
    [],
  );

  useFrame(() => {
    const mesh = notes.current;
    if (mesh === null) {
      return;
    }
    const time = canyonTime.value;
    layout.forEach(({ x, startY, z, size, speed }, index) => {
      const risen =
        (startY + time * speed * (1 + musicLevel.value * 1.5)) %
        floatingNoteRise;
      placer.position.set(
        x + Math.sin(time * 0.7 + index) * 0.3,
        risen - floatingNoteRise / 2 + 0.6,
        z,
      );
      placer.rotation.set(
        0,
        Math.sin(time + index) * 0.6,
        Math.sin(time * 0.8 + index) * 0.2,
      );
      placer.scale.setScalar(size * (1 + musicLevel.value * 0.35));
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (glow.current !== null) {
      glow.current.emissiveIntensity = 0.35 + musicLevel.value * 1.4;
    }
  });

  return (
    <instancedMesh
      ref={notes}
      args={[geometry, undefined, floatingNoteCount]}
      frustumCulled={false}
      name="floating-notes"
    >
      <meshPhysicalMaterial
        ref={glow}
        color={canyonPalette.note}
        emissive={canyonPalette.note}
        emissiveIntensity={0.4}
        metalness={0.4}
        roughness={0.3}
        clearcoat={1}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  );
};

const CanyonStage = () => {
  useCanyonClock();
  const materials = useMemo(
    () => ({
      sky: buildCanyonSkyMaterial(),
      floor: buildStageFloorMaterial(),
      beams: buildBeamMaterial(),
    }),
    [],
  );
  const everyMaterial = useMemo(() => Object.values(materials), [materials]);
  useDisposedMaterials(everyMaterial);
  const geometries = useMemo(
    () => ({
      shell: new SphereGeometry(4.6, 18, 8, Math.PI, Math.PI, 0, Math.PI / 2),
      rib: new TorusGeometry(4.7, 0.07, 4, 18, Math.PI),
      floor: new CylinderGeometry(
        6.6,
        6.9,
        0.5,
        20,
        1,
        false,
        -Math.PI / 2,
        Math.PI,
      ),
    }),
    [],
  );
  useDisposedOnUnmount(geometries.shell);
  useDisposedOnUnmount(geometries.rib);
  useDisposedOnUnmount(geometries.floor);
  const ribs = usePlacedInstances(shellRibs);
  const lights = usePlacedInstances(footlights);
  const beams = usePlacedInstances(spotlightBeams);

  return (
    <group name="canyon-stage">
      <mesh position={[0, 1, -9]} material={materials.sky} renderOrder={-1}>
        <planeGeometry args={[44, 18]} />
      </mesh>
      <mesh
        geometry={geometries.shell}
        position={[0, stageFloorHeight + 0.2, stageCentreZ - 0.6]}
        scale={[1.25, 1, 0.75]}
      >
        <meshStandardMaterial
          color={canyonPalette.shell}
          emissive={canyonPalette.horizon}
          emissiveIntensity={0.12}
          roughness={0.7}
          side={BackSide}
        />
      </mesh>
      <instancedMesh
        ref={ribs}
        args={[geometries.rib, undefined, shellRibs.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={canyonPalette.shellRib}
          emissive={canyonPalette.shellRib}
          emissiveIntensity={0.35}
          metalness={0.5}
          roughness={0.35}
        />
      </instancedMesh>
      <mesh
        geometry={geometries.floor}
        material={materials.floor}
        position={[0, stageFloorHeight, stageCentreZ]}
      />
      <instancedMesh
        ref={lights}
        args={[undefined, undefined, footlights.length]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[0.1, 0]} />
        <meshBasicMaterial color={canyonPalette.footlight} toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={beams}
        args={[undefined, materials.beams, spotlightBeams.length]}
        frustumCulled={false}
        renderOrder={1}
      >
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
      <FloatingNotes />
    </group>
  );
};

const useBuiltGeometry = <Input, Built extends { dispose: () => void }>(
  build: (input: Input) => Built,
  input: Input,
): Built => {
  const built = useMemo(() => build(input), [build, input]);
  useDisposedOnUnmount(built);
  return built;
};

const useStaticGeometry = <Built extends { dispose: () => void }>(
  build: () => Built,
): Built => {
  const built = useMemo(() => build(), [build]);
  useDisposedOnUnmount(built);
  return built;
};

const standSheetWidth = 2.9;
const ladderHeight = 2.4;

const buildCakeGeometry = (layers: number) =>
  buildModelGeometry(buildCakeParts(layers));

const buildStandFrameGeometry = (sheetHeight: number) =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(standSheetWidth + 0.2, sheetHeight + 0.2, 0.06),
      colour: "#2b1f4a",
    },
    {
      geometry: new BoxGeometry(standSheetWidth + 0.3, 0.1, 0.22),
      colour: "#e0a91f",
      position: [0, -sheetHeight / 2 - 0.12, 0.08],
    },
    {
      geometry: new CylinderGeometry(0.05, 0.05, 1.4, 8),
      colour: "#c9d3dc",
      position: [0, -sheetHeight / 2 - 0.85, -0.05],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, 0.9, 6),
      colour: "#c9d3dc",
      position: [-0.35, -sheetHeight / 2 - 1.55, 0.1],
      rotation: [0.3, 0, -0.7],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, 0.9, 6),
      colour: "#c9d3dc",
      position: [0.35, -sheetHeight / 2 - 1.55, 0.1],
      rotation: [0.3, 0, 0.7],
    },
  ]);

const buildLadderGeometry = (rungs: readonly string[]) => {
  const rungGap = ladderHeight / rungs.length;
  return buildModelGeometry([
    {
      geometry: new BoxGeometry(0.1, ladderHeight + 0.3, 0.1),
      colour: "#a8652e",
      position: [-0.45, 0, 0],
    },
    {
      geometry: new BoxGeometry(0.1, ladderHeight + 0.3, 0.1),
      colour: "#a8652e",
      position: [0.45, 0, 0],
    },
    ...rungs.map((_, index) => ({
      geometry: new CylinderGeometry(0.05, 0.05, 0.9, 8),
      colour: notationPalette.levels[index % notationPalette.levels.length],
      position: [0, -ladderHeight / 2 + rungGap * (index + 0.5), 0] satisfies [
        number,
        number,
        number,
      ],
      rotation: [0, 0, Math.PI / 2] satisfies [number, number, number],
    })),
  ]);
};

const buildLilyPadGeometry = () =>
  new CylinderGeometry(0.28, 0.28, 0.04, 16, 1, false, 0.4, Math.PI * 2 - 0.8);

const buildFrogGeometry = () =>
  buildModelGeometry([
    {
      geometry: new SphereGeometry(0.22, 10, 8),
      colour: canyonPalette.frog,
      scale: [1.1, 0.8, 1],
    },
    {
      geometry: new SphereGeometry(0.14, 10, 8),
      colour: canyonPalette.frog,
      position: [0.16, 0.12, 0],
    },
    {
      geometry: new SphereGeometry(0.06, 8, 6),
      colour: "#ffffff",
      position: [0.2, 0.25, 0.08],
    },
    {
      geometry: new SphereGeometry(0.06, 8, 6),
      colour: "#ffffff",
      position: [0.2, 0.25, -0.08],
    },
    {
      geometry: new SphereGeometry(0.03, 6, 4),
      colour: "#14121f",
      position: [0.24, 0.26, 0.09],
    },
    {
      geometry: new SphereGeometry(0.03, 6, 4),
      colour: "#14121f",
      position: [0.24, 0.26, -0.09],
    },
  ]);

const buildPadRimGeometry = () =>
  new LatheGeometry(
    [
      new Vector2(0, -0.2),
      new Vector2(0.92, -0.2),
      new Vector2(1, -0.1),
      new Vector2(1, 0.12),
      new Vector2(0.9, 0.18),
      new Vector2(0.86, 0.1),
    ],
    24,
  );

const ModelMaterial = () => (
  <meshPhysicalMaterial
    vertexColors
    roughness={0.38}
    clearcoat={0.6}
    clearcoatRoughness={0.2}
  />
);

const findTextureSize = (face: NotationFace): [number, number] =>
  face.kind === "staff" || face.kind === "rhythm" ? [512, 256] : [384, 256];

interface CanvasFace {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

type CanvasDrawer<Input> = (
  context: CanvasRenderingContext2D,
  input: Input,
  width: number,
  height: number,
) => void;

const paintCanvasFace = <Input,>(
  draw: CanvasDrawer<Input>,
  input: Input,
  width: number,
  height: number,
): CanvasFace | undefined => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    return undefined;
  }
  draw(context, input, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
};

const useCanvasTexture = <Input,>(
  draw: CanvasDrawer<Input>,
  input: Input,
  width: number,
  height: number,
): CanvasTexture | undefined => {
  const face = useMemo(
    () => paintCanvasFace(draw, input, width, height),
    [draw, input, width, height],
  );

  useEffect(() => {
    if (face === undefined) {
      return;
    }
    let isShown = true;
    void Promise.all(
      notationFonts.map((font) => document.fonts.load(font)),
    ).then(() => {
      const context = face.canvas.getContext("2d");
      if (isShown && context !== null) {
        draw(context, input, width, height);
        face.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
      face.texture.dispose();
    };
  }, [face, draw, input, width, height]);

  return face?.texture;
};

const useNotationTexture = (face: NotationFace) => {
  const [width, height] = findTextureSize(face);
  return useCanvasTexture(drawNotationFace, face, width, height);
};

const Gramophone = () => {
  const position = usePromptPosition();
  const record = useRef<Mesh>(null);
  const horn = useRef<Mesh>(null);
  const motionScale = useMotionScale();
  const geometries = useMemo(
    () => ({
      body: buildModelGeometry([
        {
          geometry: new BoxGeometry(1.5, 0.45, 1.1),
          colour: "#7a3e1d",
          position: [0, -0.5, 0],
        },
        {
          geometry: new BoxGeometry(1.56, 0.06, 1.16),
          colour: "#e0a91f",
          position: [0, -0.26, 0],
        },
        {
          geometry: new CylinderGeometry(0.06, 0.06, 0.12, 8),
          colour: "#e0a91f",
          position: [-0.62, -0.78, 0.45],
        },
        {
          geometry: new CylinderGeometry(0.06, 0.06, 0.12, 8),
          colour: "#e0a91f",
          position: [0.62, -0.78, 0.45],
        },
        {
          geometry: new CylinderGeometry(0.06, 0.06, 0.12, 8),
          colour: "#e0a91f",
          position: [-0.62, -0.78, -0.45],
        },
        {
          geometry: new CylinderGeometry(0.06, 0.06, 0.12, 8),
          colour: "#e0a91f",
          position: [0.62, -0.78, -0.45],
        },
        {
          geometry: new CylinderGeometry(0.05, 0.05, 0.5, 8),
          colour: "#e0a91f",
          position: [0.95, -0.5, 0],
          rotation: [0, 0, Math.PI / 2],
        },
        {
          geometry: new BoxGeometry(0.08, 0.3, 0.08),
          colour: "#3a1e14",
          position: [1.2, -0.6, 0],
        },
        {
          geometry: new CylinderGeometry(0.06, 0.06, 0.8, 8),
          colour: "#e0a91f",
          position: [0.45, 0.02, -0.3],
          rotation: [0.4, 0, 0.5],
        },
        {
          geometry: new CylinderGeometry(0.04, 0.04, 0.6, 8),
          colour: "#c9d3dc",
          position: [0.32, -0.18, 0.12],
          rotation: [Math.PI / 2, 0, 0.6],
        },
      ]),
      record: buildModelGeometry([
        {
          geometry: new CylinderGeometry(0.62, 0.62, 0.04, 28),
          colour: "#16141f",
        },
        {
          geometry: new CylinderGeometry(0.2, 0.2, 0.05, 16),
          colour: "#e8394a",
        },
      ]),
      horn: new LatheGeometry(
        Array.from({ length: 8 }, (_, index) => {
          const along = index / 7;
          return new Vector2(0.08 + 0.72 * along ** 2.6, along * 1.15);
        }),
        20,
      ),
    }),
    [],
  );
  useDisposedOnUnmount(geometries.body);
  useDisposedOnUnmount(geometries.record);
  useDisposedOnUnmount(geometries.horn);

  useFrame((_state, deltaSeconds) => {
    if (record.current !== null && isMusicPlaying()) {
      record.current.rotation.y +=
        deltaSeconds * 3.4 * Math.max(0.2, motionScale);
    }
    if (horn.current !== null) {
      const pulse = 1 + musicLevel.value * 0.18 * Math.max(0.3, motionScale);
      horn.current.scale.set(pulse, 1 + musicLevel.value * 0.06, pulse);
    }
  });

  return (
    <group
      position={position}
      rotation={[0.18, -0.45, 0]}
      scale={0.85}
      name="gramophone"
    >
      <mesh geometry={geometries.body}>
        <ModelMaterial />
      </mesh>
      <mesh
        ref={record}
        geometry={geometries.record}
        position={[-0.1, -0.21, 0]}
      >
        <ModelMaterial />
      </mesh>
      <mesh
        ref={horn}
        geometry={geometries.horn}
        position={[0.62, 0.3, -0.62]}
        rotation={[0.5, 0, 0.7]}
      >
        <meshPhysicalMaterial
          color="#e0a91f"
          metalness={0.75}
          roughness={0.22}
          clearcoat={1}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
};

const hitSeconds = 0.18;

const DrumStick = () => (
  <mesh position={[0, 0.45, 0]}>
    <cylinderGeometry args={[0.035, 0.035, 0.95, 6]} />
    <meshStandardMaterial color="#d8a86a" roughness={0.6} />
  </mesh>
);

const lampColours = {
  lit: new Color(canyonPalette.lamp),
  unlit: new Color(canyonPalette.lampOff),
};

const keyColours = {
  white: new Color(canyonPalette.keyWhite),
  black: new Color(canyonPalette.keyBlack),
  marked: new Color(canyonPalette.keyMarked),
  sounding: new Color(canyonPalette.keySounding),
};

const DrumProp = ({ beatLamps }: { beatLamps: number }) => {
  const position = usePromptPosition();
  const drum = useRef<Mesh>(null);
  const leftStick = useRef<Group>(null);
  const rightStick = useRef<Group>(null);
  const lamps = useRef<InstancedMesh>(null);
  const geometry = useBuiltGeometry(buildMusicModelGeometry, "little-drum");
  const motionScale = useMotionScale();
  const onsetCount = useRef(0);
  const lastOnsetAge = useRef(Number.POSITIVE_INFINITY);
  const placer = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const mesh = lamps.current;
    if (mesh === null) {
      return;
    }
    for (let index = 0; index < beatLamps; index++) {
      placer.position.set((index - (beatLamps - 1) / 2) * 0.42, -1.05, 0.6);
      placer.scale.setScalar(1);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
      mesh.setColorAt(index, lampColours.unlit);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [beatLamps, placer]);

  useFrame(() => {
    const sinceOnset = findSecondsSinceOnset();
    if (sinceOnset < lastOnsetAge.current) {
      onsetCount.current += 1;
    }
    lastOnsetAge.current = sinceOnset;
    const hit =
      isMusicPlaying() && sinceOnset < hitSeconds
        ? 1 - sinceOnset / hitSeconds
        : 0;
    const squash = hit * 0.08 * Math.max(0.4, motionScale);
    drum.current?.scale.set(1 + squash, 1 - squash, 1 + squash);
    const isLeftHit = onsetCount.current % 2 === 0;
    if (leftStick.current !== null) {
      leftStick.current.rotation.z = 0.9 - (isLeftHit ? hit : 0) * 0.7;
    }
    if (rightStick.current !== null) {
      rightStick.current.rotation.z = -0.9 + (isLeftHit ? 0 : hit) * 0.7;
    }
    const mesh = lamps.current;
    if (mesh !== null) {
      const beat = findPlayingBeat();
      for (let index = 0; index < beatLamps; index++) {
        const isLit =
          beat !== undefined && Math.floor(beat) % beatLamps === index;
        mesh.setColorAt(index, isLit ? lampColours.lit : lampColours.unlit);
      }
      if (mesh.instanceColor !== null) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group position={position} name="drum-prop">
      <mesh ref={drum} geometry={geometry} scale={1.05}>
        <ModelMaterial />
      </mesh>
      <group ref={leftStick} position={[-0.9, 0.55, 0.3]}>
        <DrumStick />
      </group>
      <group ref={rightStick} position={[0.9, 0.55, 0.3]}>
        <DrumStick />
      </group>
      {beatLamps > 0 ? (
        <instancedMesh
          ref={lamps}
          args={[undefined, undefined, beatLamps]}
          frustumCulled={false}
          name="beat-lamps"
        >
          <sphereGeometry args={[0.13, 12, 8]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      ) : null}
    </group>
  );
};

interface KeySpot {
  pitch: number;
  x: number;
  isBlack: boolean;
}

export const listKeySpots = (lowest: number, highest: number): KeySpot[] => {
  const whiteKeyCount = Array.from(
    { length: highest - lowest + 1 },
    (_, offset) => lowest + offset,
  ).filter((pitch) => !isBlackKey(pitch)).length;
  let whiteIndex = 0;
  return Array.from({ length: highest - lowest + 1 }, (_, offset) => {
    const pitch = lowest + offset;
    if (isBlackKey(pitch)) {
      return {
        pitch,
        x: whiteIndex - 0.5 - whiteKeyCount / 2 + 0.5,
        isBlack: true,
      };
    }
    const x = whiteIndex - whiteKeyCount / 2 + 0.5;
    whiteIndex += 1;
    return { pitch, x, isBlack: false };
  });
};

const keyboardWidth = 3.6;

const KeyboardProp = ({
  lowest,
  highest,
  marked,
}: {
  lowest: string;
  highest: string;
  marked: readonly string[];
}) => {
  const position = usePromptPosition();
  const whiteKeys = useRef<InstancedMesh>(null);
  const blackKeys = useRef<InstancedMesh>(null);
  const spots = useMemo(
    () => listKeySpots(findPitchOf(lowest), findPitchOf(highest)),
    [lowest, highest],
  );
  const markedPitches = useMemo(() => marked.map(findPitchOf), [marked]);
  const whiteSpots = spots.filter(({ isBlack }) => !isBlack);
  const blackSpots = spots.filter(({ isBlack }) => isBlack);
  const keyWidth = keyboardWidth / Math.max(1, whiteSpots.length);
  const placer = useMemo(() => new Object3D(), []);
  const age = useAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    const sounding = new Set(findSoundingPitches());
    const pulse =
      0.5 + 0.5 * Math.sin(age.current * 4 * Math.max(0.3, motionScale));
    let whiteIndex = 0;
    let blackIndex = 0;
    spots.forEach(({ pitch, x, isBlack }) => {
      const mesh = isBlack ? blackKeys.current : whiteKeys.current;
      const index = isBlack ? blackIndex : whiteIndex;
      if (isBlack) {
        blackIndex += 1;
      } else {
        whiteIndex += 1;
      }
      if (mesh === null) {
        return;
      }
      const isSounding = sounding.has(pitch);
      const base = isBlack ? keyColours.black : keyColours.white;
      placer.position.set(x * keyWidth, isBlack ? 0.08 : 0, 0);
      placer.rotation.set(isSounding ? 0.06 : 0, 0, 0);
      placer.scale.setScalar(1);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
      if (isSounding) {
        mesh.setColorAt(index, keyColours.sounding);
      } else if (markedPitches.includes(pitch)) {
        mesh.setColorAt(
          index,
          base.clone().lerp(keyColours.marked, 0.65 + pulse * 0.35),
        );
      } else {
        mesh.setColorAt(index, base);
      }
    });
    for (const mesh of [whiteKeys.current, blackKeys.current]) {
      if (mesh !== null) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor !== null) {
          mesh.instanceColor.needsUpdate = true;
        }
      }
    }
  });

  return (
    <group position={position} rotation={[0.55, -0.12, 0]} name="keyboard">
      <mesh position={[0, -0.1, -0.15]}>
        <boxGeometry args={[keyboardWidth + 0.3, 0.2, 1.25]} />
        <meshPhysicalMaterial
          color={canyonPalette.keyboardCase}
          roughness={0.35}
          clearcoat={0.8}
        />
      </mesh>
      <instancedMesh
        ref={whiteKeys}
        args={[undefined, undefined, whiteSpots.length]}
        frustumCulled={false}
        name="white-keys"
      >
        <boxGeometry args={[keyWidth * 0.92, 0.1, 0.95]} />
        <meshPhysicalMaterial roughness={0.3} clearcoat={0.6} />
      </instancedMesh>
      <instancedMesh
        ref={blackKeys}
        args={[undefined, undefined, Math.max(1, blackSpots.length)]}
        frustumCulled={false}
        position={[0, 0, -0.2]}
        name="black-keys"
      >
        <boxGeometry args={[keyWidth * 0.55, 0.12, 0.55]} />
        <meshPhysicalMaterial roughness={0.25} clearcoat={0.9} />
      </instancedMesh>
    </group>
  );
};

const MusicStand = ({ face }: { face: NotationFace }) => {
  const position = usePromptPosition();
  const texture = useNotationTexture(face);
  const age = useAge();
  const stand = useRef<Group>(null);
  const motionScale = useMotionScale();
  const [width, height] = findTextureSize(face);
  const sheetHeight = (standSheetWidth * height) / width;
  const frame = useBuiltGeometry(buildStandFrameGeometry, sheetHeight);

  useFrame(() => {
    if (stand.current !== null) {
      stand.current.scale.setScalar(findGrowth(age.current, motionScale));
      stand.current.rotation.y =
        -0.12 + Math.sin(age.current * 0.6) * 0.04 * motionScale;
    }
  });

  return (
    <group
      ref={stand}
      position={position}
      rotation={[0.08, 0, 0]}
      name="music-stand"
    >
      <mesh geometry={frame} position={[0, 0, -0.04]}>
        <ModelMaterial />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[standSheetWidth, sheetHeight]} />
        <meshStandardMaterial
          key={texture === undefined ? "plain" : "printed"}
          color={texture === undefined ? notationPalette.paper : "#ffffff"}
          map={texture ?? null}
          roughness={0.85}
        />
      </mesh>
    </group>
  );
};

const conductingPatterns = new Map<number, [number, number][]>([
  [
    2,
    [
      [0, -1],
      [0.15, 0.85],
    ],
  ],
  [
    3,
    [
      [0, -1],
      [0.95, -0.45],
      [0.15, 0.85],
    ],
  ],
  [
    4,
    [
      [0, -1],
      [-0.95, -0.45],
      [0.95, -0.45],
      [0.15, 0.85],
    ],
  ],
  [
    6,
    [
      [0, -1],
      [-0.45, -0.7],
      [-0.95, -0.35],
      [0.95, -0.45],
      [0.5, -0.2],
      [0.15, 0.85],
    ],
  ],
]);

const fourBeatPattern: [number, number][] = [
  [0, -1],
  [-0.95, -0.45],
  [0.95, -0.45],
  [0.15, 0.85],
];

export const findBatonPoint = (
  beatsPerBar: number,
  beat: number,
): [number, number] => {
  const points = conductingPatterns.get(beatsPerBar) ?? fourBeatPattern;
  const inBar = ((beat % points.length) + points.length) % points.length;
  const from = points[Math.floor(inBar)];
  const to = points[(Math.floor(inBar) + 1) % points.length];
  const share = inBar - Math.floor(inBar);
  const eased = share * share * (3 - 2 * share);
  return [
    from[0] + (to[0] - from[0]) * eased,
    from[1] + (to[1] - from[1]) * eased + Math.sin(share * Math.PI) * 0.35,
  ];
};

const trailPointCount = 40;
const conductingSize = 0.85;

const ConductorProp = ({ beatsPerBar }: { beatsPerBar: number }) => {
  const position = usePromptPosition();
  const baton = useRef<Group>(null);
  const trail = useRef<Line>(null);
  const age = useAge();
  const motionScale = useMotionScale();
  const trailGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(trailPointCount * 3), 3),
    );
    return geometry;
  }, []);
  useDisposedOnUnmount(trailGeometry);
  const trailMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        color: canyonPalette.trail,
        transparent: true,
        opacity: 0.85,
      }),
    [],
  );
  useDisposedOnUnmount(trailMaterial);
  const trailLine = useMemo(
    () => new Line(trailGeometry, trailMaterial),
    [trailGeometry, trailMaterial],
  );
  const patternGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const points = Array.from({ length: 80 }, (_, index) => {
      const [x, y] = findBatonPoint(beatsPerBar, (index / 79) * beatsPerBar);
      return [x * conductingSize, y * conductingSize, -0.05];
    }).flat();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(points), 3),
    );
    return geometry;
  }, [beatsPerBar]);
  useDisposedOnUnmount(patternGeometry);
  const trailPoints = useRef<[number, number][]>([]);

  useFrame(() => {
    const beat = findPlayingBeat();
    const [x, y] =
      beat === undefined
        ? [Math.sin(age.current * 0.8) * 0.1 * motionScale, 0.9]
        : findBatonPoint(beatsPerBar, beat);
    baton.current?.position.set(x * conductingSize, y * conductingSize, 0.1);
    if (baton.current !== null) {
      baton.current.rotation.z = -0.5 + x * 0.25;
    }
    const point: [number, number] = [x, y];
    trailPoints.current = [point, ...trailPoints.current].slice(
      0,
      trailPointCount,
    );
    const positions = trailGeometry.getAttribute("position");
    for (let index = 0; index < trailPointCount; index++) {
      const [trailX, trailY] = trailPoints.current[
        Math.min(index, trailPoints.current.length - 1)
      ] ?? [x, y];
      positions.setXYZ(
        index,
        trailX * conductingSize + 0.42,
        trailY * conductingSize + 0.55,
        0.05,
      );
    }
    positions.needsUpdate = true;
    if (trail.current !== null) {
      trail.current.visible = beat !== undefined;
    }
  });

  return (
    <group position={position} name="conductor">
      <lineLoop geometry={patternGeometry} name="conducting-pattern">
        <lineBasicMaterial
          color={canyonPalette.trail}
          transparent
          opacity={0.3}
        />
      </lineLoop>
      <primitive ref={trail} object={trailLine} />
      <group ref={baton}>
        <mesh position={[0.2, 0.28, 0]} rotation={[0, 0, -0.6]}>
          <cylinderGeometry args={[0.012, 0.022, 0.75, 6]} />
          <meshStandardMaterial color={canyonPalette.baton} roughness={0.4} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshStandardMaterial
            color={canyonPalette.batonHandle}
            roughness={0.5}
          />
        </mesh>
      </group>
      <mesh position={[0, -1.45, -0.2]}>
        <cylinderGeometry args={[0.7, 0.8, 0.35, 20]} />
        <meshPhysicalMaterial color="#5b2a73" roughness={0.4} clearcoat={0.6} />
      </mesh>
    </group>
  );
};

const drawLadderLabels = (
  context: CanvasRenderingContext2D,
  rungs: readonly string[],
  width: number,
  height: number,
) => {
  context.clearRect(0, 0, width, height);
  context.font = `800 ${String(height / (rungs.length + 1.6))}px "Baloo 2 Variable", "Baloo 2", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  rungs.forEach((rung, index) => {
    context.fillStyle =
      notationPalette.levels[index % notationPalette.levels.length];
    context.fillText(
      rung,
      width * 0.06,
      height - (height / rungs.length) * (index + 0.5),
    );
  });
};

const LadderProp = ({ rungs }: { rungs: readonly string[] }) => {
  const position = usePromptPosition();
  const labels = useCanvasTexture(drawLadderLabels, rungs, 256, 512);
  const geometry = useBuiltGeometry(buildLadderGeometry, rungs);

  return (
    <group position={position} rotation={[0, -0.25, 0]} name="solfa-ladder">
      <mesh geometry={geometry}>
        <ModelMaterial />
      </mesh>
      <mesh position={[1.05, 0, 0]}>
        <planeGeometry args={[1.2, ladderHeight]} />
        <meshBasicMaterial
          map={labels ?? null}
          transparent
          toneMapped={false}
          visible={labels !== undefined}
        />
      </mesh>
    </group>
  );
};

const lilyPadSpots: Placement[] = Array.from({ length: 6 }, (_, index) => ({
  position: [
    -1.5 + index * 0.62,
    -0.02 + (index % 2) * 0.04,
    Math.sin(index * 1.7) * 0.25,
  ],
  rotation: [0, index * 1.3, 0],
  scale: [1, 1, 1],
}));

const LilyPadsProp = () => {
  const position = usePromptPosition();
  const pads = usePlacedInstances(lilyPadSpots);
  const frog = useRef<Mesh>(null);
  const motionScale = useMotionScale();
  const padGeometry = useStaticGeometry(buildLilyPadGeometry);
  const frogGeometry = useStaticGeometry(buildFrogGeometry);

  useFrame(() => {
    const sinceOnset = findSecondsSinceOnset();
    const hop =
      isMusicPlaying() && sinceOnset < 0.4
        ? Math.sin((sinceOnset / 0.4) * Math.PI)
        : 0;
    frog.current?.position.set(
      -1.5,
      0.18 + hop * 0.45 * Math.max(0.3, motionScale),
      0,
    );
  });

  return (
    <group position={position} rotation={[0.45, -0.1, 0]} name="lily-pond">
      <mesh position={[0, -0.06, 0]} scale={[1, 1, 0.45]}>
        <cylinderGeometry args={[2.2, 2.2, 0.06, 28]} />
        <meshPhysicalMaterial
          color={canyonPalette.pond}
          roughness={0.08}
          clearcoat={1}
          transparent
          opacity={0.92}
        />
      </mesh>
      <instancedMesh
        ref={pads}
        args={[padGeometry, undefined, lilyPadSpots.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color={canyonPalette.lilyPad} roughness={0.55} />
      </instancedMesh>
      <mesh ref={frog} geometry={frogGeometry}>
        <ModelMaterial />
      </mesh>
    </group>
  );
};

const InstrumentShowcase = ({
  model,
}: {
  model: Parameters<typeof buildMusicModelGeometry>[0];
}) => {
  const position = usePromptPosition();
  const geometry = useBuiltGeometry(buildMusicModelGeometry, model);
  const spinner = useRef<Group>(null);
  const age = useAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    if (spinner.current !== null) {
      spinner.current.rotation.y =
        Math.sin(age.current * 0.7) * 0.5 * motionScale;
      spinner.current.scale.setScalar(
        findGrowth(age.current, motionScale) * (1 + musicLevel.value * 0.06),
      );
    }
  });

  return (
    <group position={position} name={`showcase-${model}`}>
      <group ref={spinner}>
        <mesh geometry={geometry} scale={1.15}>
          <ModelMaterial />
        </mesh>
      </group>
      <mesh position={[0, -1.35, 0]}>
        <cylinderGeometry args={[0.9, 1, 0.18, 24]} />
        <meshPhysicalMaterial
          color={canyonPalette.pedestal}
          roughness={0.3}
          clearcoat={1}
        />
      </mesh>
    </group>
  );
};

interface ChantStone {
  x: number;
  startBeat: number;
  beats: number;
  radius: number;
  isRest: boolean;
}

const chantBeatWidth = 0.8;
const chantLabelPixelsPerUnit = 130;

export const listChantStones = (rhythm: string): ChantStone[] => {
  const sounds = listRhythmSounds(rhythm);
  const totalBeats = sounds.reduce((total, { beats }) => total + beats, 0);
  let beat = 0;
  return sounds.map(({ beats, isRest }) => {
    const startBeat = beat;
    beat += beats;
    return {
      x: (startBeat + beats / 2 - totalBeats / 2) * chantBeatWidth,
      startBeat,
      beats,
      radius: isRest ? 0.1 : 0.12 + 0.14 * Math.min(1, beats),
      isRest,
    };
  });
};

const stoneColours = {
  waiting: new Color(canyonPalette.stone),
  lit: new Color(canyonPalette.lamp),
  rest: new Color(canyonPalette.lampOff),
};

const buildChantLedgeGeometry = (width: number) =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(width + 0.5, 0.2, 0.7),
      colour: canyonPalette.ledge,
      position: [0, -0.42, 0],
      roughen: 0.04,
    },
    {
      geometry: new BoxGeometry(width + 0.7, 0.1, 0.8),
      colour: canyonPalette.plankDark,
      position: [0, -0.56, 0],
    },
    ...[-1, 1].map((side) => ({
      geometry: new SphereGeometry(0.16, 8, 6),
      colour: canyonPalette.ledge,
      position: [(side * (width + 0.5)) / 2, -0.3, 0.05] satisfies [
        number,
        number,
        number,
      ],
      scale: [1.2, 0.8, 1] satisfies [number, number, number],
      roughen: 0.3,
    })),
  ]);

const findChantWidth = (stones: readonly ChantStone[]) =>
  stones.reduce((total, { beats }) => total + beats, 0) * chantBeatWidth;

const drawChantSyllables = (
  context: CanvasRenderingContext2D,
  stage: Extract<StageProp, { kind: "chant-stones" }>,
  width: number,
  height: number,
) => {
  context.clearRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  const soundingStones = listChantStones(stage.rhythm).filter(
    ({ isRest }) => !isRest,
  );
  soundingStones.forEach(({ x, radius }, index) => {
    const syllable = stage.syllables.at(index) ?? "";
    const centre = width / 2 + x * chantLabelPixelsPerUnit;
    let size = radius * chantLabelPixelsPerUnit * 0.9;
    context.font = `800 ${String(size)}px "Baloo 2 Variable", "Baloo 2", sans-serif`;
    while (
      size > 12 &&
      context.measureText(syllable).width > radius * chantLabelPixelsPerUnit * 2
    ) {
      size -= 2;
      context.font = `800 ${String(size)}px "Baloo 2 Variable", "Baloo 2", sans-serif`;
    }
    context.lineWidth = size * 0.22;
    context.strokeStyle = canyonPalette.ridgeNear;
    context.strokeText(syllable, centre, height / 2);
    context.fillStyle = canyonPalette.keyWhite;
    context.fillText(syllable, centre, height / 2);
  });
};

const ChantStonesProp = ({
  stage,
}: {
  stage: Extract<StageProp, { kind: "chant-stones" }>;
}) => {
  const position = usePromptPosition();
  const stones = useMemo(() => listChantStones(stage.rhythm), [stage.rhythm]);
  const width = findChantWidth(stones);
  const ledge = useBuiltGeometry(buildChantLedgeGeometry, width);
  const labelWidth = width + 0.6;
  const labelPixels = Math.round(labelWidth * chantLabelPixelsPerUnit);
  const labels = useCanvasTexture(drawChantSyllables, stage, labelPixels, 96);
  const instances = useRef<InstancedMesh>(null);
  const placer = useMemo(() => new Object3D(), []);
  const motionScale = useMotionScale();
  const age = useAge();
  const holder = useRef<Group>(null);

  useFrame(() => {
    holder.current?.scale.setScalar(findGrowth(age.current, motionScale));
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    const beat = findPlayingBeat();
    stones.forEach(({ x, startBeat, beats, radius, isRest }, index) => {
      const progress =
        beat === undefined ? -1 : (beat - startBeat) / Math.max(beats, 0.01);
      const isLit = !isRest && progress >= 0 && progress < 1;
      const hop = isLit ? Math.sin(progress * Math.PI) * 0.16 * motionScale : 0;
      placer.position.set(x, hop, 0);
      placer.rotation.set(Math.PI / 2, 0, 0);
      placer.scale.set(radius, 1, radius);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
      mesh.setColorAt(
        index,
        isRest
          ? stoneColours.rest
          : isLit
            ? stoneColours.lit
            : stoneColours.waiting,
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group
      ref={holder}
      position={position}
      rotation={[0.18, 0, 0]}
      name="chant-stones"
    >
      <mesh geometry={ledge}>
        <ModelMaterial />
      </mesh>
      <instancedMesh
        ref={instances}
        args={[undefined, undefined, stones.length]}
        frustumCulled={false}
        name="chant-stone"
      >
        <cylinderGeometry args={[1, 1, 0.3, 20]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      {stage.syllables.length > 0 ? (
        <mesh position={[0, 0, 0.17]}>
          <planeGeometry args={[labelWidth, (labelWidth * 96) / labelPixels]} />
          <meshBasicMaterial
            map={labels ?? null}
            transparent
            depthWrite={false}
            toneMapped={false}
            visible={labels !== undefined}
          />
        </mesh>
      ) : null}
    </group>
  );
};

const renderStageProp = (stage: StageProp): ReactNode => {
  switch (stage.kind) {
    case "gramophone":
      return <Gramophone />;
    case "drum":
      return <DrumProp beatLamps={stage.beatLamps} />;
    case "keyboard":
      return (
        <KeyboardProp
          lowest={stage.lowest}
          highest={stage.highest}
          marked={stage.marked}
        />
      );
    case "music-stand":
      return <MusicStand face={stage.face} />;
    case "conductor":
      return <ConductorProp beatsPerBar={stage.beatsPerBar} />;
    case "ladder":
      return <LadderProp rungs={stage.rungs} />;
    case "lily-pads":
      return <LilyPadsProp />;
    case "instrument":
      return <InstrumentShowcase model={stage.model} />;
    case "chant-stones":
      return <ChantStonesProp stage={stage} />;
  }
};

interface ChoiceSlot {
  position: [number, number, number];
  radius: number;
  index: number;
}

const useGrowingChoice = ({ position, index }: ChoiceSlot, wobble = 0.08) => {
  const choice = useRef<Group>(null);
  const age = useAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    const body = choice.current;
    if (body === null) {
      return;
    }
    body.scale.setScalar(findGrowth(age.current - index * 0.06, motionScale));
    body.position.y =
      position[1] +
      Math.sin(age.current * 1.6 + index * 1.3) * 0.05 * motionScale;
    body.rotation.z =
      Math.sin(age.current * 1.1 + index) * wobble * 0.3 * motionScale;
  });

  return choice;
};

const PadChoice = (slot: ChoiceSlot) => {
  const choice = useGrowingChoice(slot);
  const rim = useStaticGeometry(buildPadRimGeometry);

  return (
    <group ref={choice} position={slot.position} name="drum-pad">
      <group rotation={[Math.PI / 2 - 0.35, 0, 0]} scale={slot.radius * 0.9}>
        <mesh geometry={rim}>
          <meshPhysicalMaterial
            color={canyonPalette.padRim}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.86, 0.86, 0.06, 24]} />
          <meshPhysicalMaterial
            color={canyonPalette.pads[slot.index % canyonPalette.pads.length]}
            roughness={0.35}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
      </group>
    </group>
  );
};

const CardChoice = ({ face, ...slot }: ChoiceSlot & { face: NotationFace }) => {
  const choice = useGrowingChoice(slot);
  const texture = useNotationTexture(face);
  const [width, height] = findTextureSize(face);
  const cardWidth = slot.radius * (width > height * 1.6 ? 2.7 : 2.3);
  const cardHeight = (cardWidth * height) / width;
  const body = useMemo(
    () =>
      new RoundedBoxGeometry(
        cardWidth,
        cardHeight,
        slot.radius * 0.12,
        2,
        slot.radius * 0.08,
      ),
    [cardWidth, cardHeight, slot.radius],
  );
  useDisposedOnUnmount(body);

  return (
    <group ref={choice} position={slot.position} name="choice-card">
      <mesh geometry={body} position={[0, 0, -slot.radius * 0.07]}>
        <meshPhysicalMaterial
          color={canyonPalette.cardEdge}
          roughness={0.5}
          clearcoat={0.5}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[cardWidth * 0.97, cardHeight * 0.95]} />
        <meshStandardMaterial
          key={texture === undefined ? "plain" : "printed"}
          color={texture === undefined ? notationPalette.paper : "#ffffff"}
          map={texture ?? null}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
};

const ModelChoice = ({
  model,
  ...slot
}: ChoiceSlot & { model: Parameters<typeof buildMusicModelGeometry>[0] }) => {
  const choice = useGrowingChoice(slot, 0);
  const spinner = useRef<Group>(null);
  const age = useAge();
  const motionScale = useMotionScale();
  const geometry = useBuiltGeometry(buildMusicModelGeometry, model);

  useFrame(() => {
    if (spinner.current !== null) {
      spinner.current.rotation.y =
        -0.35 + Math.sin(age.current * 0.8 + slot.index) * 0.45 * motionScale;
    }
  });

  return (
    <group ref={choice} position={slot.position} name={`model-${model}`}>
      <group ref={spinner} position={[0, slot.radius * 0.12, 0]}>
        <mesh geometry={geometry} scale={slot.radius * 0.78}>
          <ModelMaterial />
        </mesh>
      </group>
      <mesh position={[0, -slot.radius * 0.82, -slot.radius * 0.2]}>
        <cylinderGeometry
          args={[slot.radius * 0.72, slot.radius * 0.8, slot.radius * 0.12, 20]}
        />
        <meshPhysicalMaterial
          color={canyonPalette.pedestal}
          emissive={canyonPalette.pedestalGlow}
          emissiveIntensity={0.08}
          roughness={0.3}
          clearcoat={1}
        />
      </mesh>
    </group>
  );
};

const drawMoodFace = (
  context: CanvasRenderingContext2D,
  mood: Mood,
  size: number,
) => {
  context.fillStyle = canyonPalette.moods[mood];
  context.fillRect(0, 0, size, size);
  const centre = size / 2;
  context.fillStyle = notationPalette.ink;
  context.strokeStyle = notationPalette.ink;
  context.lineWidth = size * 0.045;
  context.lineCap = "round";
  const eyeY = centre - size * 0.08;
  for (const side of [-1, 1]) {
    const eyeX = centre + side * size * 0.15;
    context.beginPath();
    if (mood === "sleepy") {
      context.arc(eyeX, eyeY, size * 0.06, 0.15 * Math.PI, 0.85 * Math.PI);
      context.stroke();
    } else if (mood === "scary") {
      context.ellipse(eyeX, eyeY, size * 0.05, size * 0.08, 0, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(eyeX - side * size * 0.09, eyeY - size * 0.16);
      context.lineTo(eyeX + side * size * 0.07, eyeY - size * 0.11);
      context.stroke();
    } else {
      context.arc(eyeX, eyeY, size * 0.045, 0, Math.PI * 2);
      context.fill();
      if (mood === "sad") {
        context.beginPath();
        context.moveTo(eyeX - side * size * 0.07, eyeY - size * 0.13);
        context.lineTo(eyeX + side * size * 0.06, eyeY - size * 0.1);
        context.stroke();
      }
    }
  }
  const mouthY = centre + size * 0.14;
  context.beginPath();
  if (mood === "happy") {
    context.arc(
      centre,
      mouthY - size * 0.06,
      size * 0.14,
      0.15 * Math.PI,
      0.85 * Math.PI,
    );
  } else if (mood === "sad") {
    context.arc(
      centre,
      mouthY + size * 0.08,
      size * 0.12,
      1.2 * Math.PI,
      1.8 * Math.PI,
    );
  } else if (mood === "scary") {
    context.ellipse(centre, mouthY, size * 0.07, size * 0.1, 0, 0, Math.PI * 2);
  } else {
    context.moveTo(centre - size * 0.06, mouthY);
    context.lineTo(centre + size * 0.06, mouthY);
    context.font = `800 ${String(size * 0.1)}px "Baloo 2 Variable", sans-serif`;
    context.fillText("z", centre + size * 0.24, centre - size * 0.2);
    context.fillText("z", centre + size * 0.3, centre - size * 0.29);
  }
  context.stroke();
};

const buildPlanarDomeGeometry = () => {
  const dome = new SphereGeometry(1, 16, 10);
  const positions = dome.getAttribute("position");
  const uvs = dome.getAttribute("uv");
  for (let index = 0; index < positions.count; index++) {
    uvs.setXY(
      index,
      positions.getX(index) * 0.5 + 0.5,
      positions.getY(index) * 0.5 + 0.5,
    );
  }
  uvs.needsUpdate = true;
  return dome;
};

const MaskChoice = ({ mood, ...slot }: ChoiceSlot & { mood: Mood }) => {
  const choice = useGrowingChoice(slot);
  const face = useCanvasTexture(drawMoodFace, mood, 256, 256);
  const dome = useStaticGeometry(buildPlanarDomeGeometry);

  return (
    <group ref={choice} position={slot.position} name={`mask-${mood}`}>
      <mesh
        geometry={dome}
        scale={[slot.radius * 0.8, slot.radius * 0.88, slot.radius * 0.36]}
      >
        <meshPhysicalMaterial
          key={face === undefined ? "plain" : "painted"}
          color={face === undefined ? canyonPalette.moods[mood] : "#ffffff"}
          map={face ?? null}
          roughness={0.35}
          clearcoat={0.8}
        />
      </mesh>
      <mesh
        position={[0, -slot.radius * 0.02, -slot.radius * 0.05]}
        rotation={[0, 0, 0]}
      >
        <torusGeometry args={[slot.radius * 0.82, slot.radius * 0.05, 4, 20]} />
        <meshPhysicalMaterial
          color={canyonPalette.pedestalGlow}
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
};

const BarChoice = ({
  pitch,
  name,
  ...slot
}: ChoiceSlot & { pitch: number; name: string }) => {
  const choice = useGrowingChoice(slot);
  const letter = name.charAt(0);
  const colour =
    Object.entries(canyonPalette.bars).find(([key]) => key === letter)?.[1] ??
    canyonPalette.bars.C;
  const length = slot.radius * Math.max(1.1, 2.6 - (pitch - 60) * 0.05);

  return (
    <group ref={choice} position={slot.position} name="glockenspiel-bar">
      <mesh rotation={[0.35, 0, 0]}>
        <boxGeometry args={[slot.radius * 0.62, length, slot.radius * 0.14]} />
        <meshPhysicalMaterial
          color={colour}
          metalness={0.55}
          roughness={0.22}
          clearcoat={1}
        />
      </mesh>
    </group>
  );
};

const drawSectionBlocks = (
  context: CanvasRenderingContext2D,
  sections: string,
  width: number,
  height: number,
) => {
  context.fillStyle = notationPalette.paper;
  context.fillRect(0, 0, width, height);
  const letters = Array.from(sections);
  const blockSize = Math.min(
    height * 0.62,
    (width * 0.9) / letters.length - width * 0.02,
  );
  const step = blockSize + width * 0.02;
  const left = (width - step * letters.length + width * 0.02) / 2;
  letters.forEach((letter, index) => {
    const colour =
      Object.entries(canyonPalette.sections).find(
        ([key]) => key === letter,
      )?.[1] ?? canyonPalette.sections.A;
    context.fillStyle = colour;
    context.beginPath();
    context.roundRect(
      left + index * step,
      (height - blockSize) / 2,
      blockSize,
      blockSize,
      blockSize * 0.18,
    );
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = `800 ${String(blockSize * 0.62)}px "Baloo 2 Variable", "Baloo 2", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      letter,
      left + index * step + blockSize / 2,
      height / 2 + blockSize * 0.04,
    );
  });
};

const BlocksChoice = ({
  sections,
  ...slot
}: ChoiceSlot & { sections: string }) => {
  const choice = useGrowingChoice(slot);
  const texture = useCanvasTexture(drawSectionBlocks, sections, 512, 192);
  const cardWidth = slot.radius * 2.7;
  const cardHeight = (cardWidth * 192) / 512;
  const body = useMemo(
    () =>
      new RoundedBoxGeometry(
        cardWidth,
        cardHeight,
        slot.radius * 0.14,
        2,
        slot.radius * 0.08,
      ),
    [cardWidth, cardHeight, slot.radius],
  );
  useDisposedOnUnmount(body);

  return (
    <group ref={choice} position={slot.position} name="section-blocks">
      <mesh geometry={body} position={[0, 0, -slot.radius * 0.08]}>
        <meshPhysicalMaterial
          color={canyonPalette.cardEdge}
          roughness={0.5}
          clearcoat={0.5}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[cardWidth * 0.97, cardHeight * 0.93]} />
        <meshStandardMaterial
          map={texture ?? null}
          color={texture === undefined ? notationPalette.paper : "#ffffff"}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
};

const buildCakeParts = (layers: number): ModelPart[] => [
  {
    geometry: new CylinderGeometry(1.15, 1.1, 0.08, 14),
    colour: canyonPalette.plate,
    position: [0, -0.04, 0],
  },
  ...Array.from({ length: layers }, (_, index): ModelPart[] => {
    const radius = 0.95 - index * 0.24;
    const bottom = index * 0.42;
    return [
      {
        geometry: new CylinderGeometry(radius, radius, 0.4, 14),
        colour: canyonPalette.cakeTiers[index % canyonPalette.cakeTiers.length],
        position: [0, bottom + 0.2, 0],
        isSmooth: true,
      },
      {
        geometry: new TorusGeometry(radius, 0.05, 4, 14),
        colour: canyonPalette.icing,
        position: [0, bottom + 0.4, 0],
        rotation: [Math.PI / 2, 0, 0],
        isSmooth: true,
      },
    ];
  }).flat(),
  {
    geometry: new CylinderGeometry(0.05, 0.05, 0.32, 8),
    colour: canyonPalette.candle,
    position: [0, layers * 0.42 + 0.16, 0],
  },
  {
    geometry: new SphereGeometry(0.07, 8, 6),
    colour: canyonPalette.flame,
    position: [0, layers * 0.42 + 0.38, 0],
    scale: [1, 1.5, 1],
  },
];

const CakeChoice = ({ layers, ...slot }: ChoiceSlot & { layers: number }) => {
  const choice = useGrowingChoice(slot);
  const geometry = useBuiltGeometry(buildCakeGeometry, layers);

  return (
    <group
      ref={choice}
      position={slot.position}
      name={`cake-${String(layers)}`}
    >
      <mesh
        geometry={geometry}
        scale={slot.radius * 0.72}
        position={[0, -slot.radius * 0.62, 0]}
        rotation={[0.35, 0, 0]}
      >
        <ModelMaterial />
      </mesh>
    </group>
  );
};

const renderChoiceArt = (art: ChoiceArt, slot: ChoiceSlot): ReactNode => {
  switch (art.kind) {
    case "pad":
      return <PadChoice {...slot} />;
    case "card":
      return <CardChoice face={art.face} {...slot} />;
    case "model":
      return <ModelChoice model={art.model} {...slot} />;
    case "mask":
      return <MaskChoice mood={art.mood} {...slot} />;
    case "bar":
      return <BarChoice pitch={art.pitch} name={art.name} {...slot} />;
    case "blocks":
      return <BlocksChoice sections={art.sections} {...slot} />;
    case "cake":
      return <CakeChoice layers={art.layers} {...slot} />;
  }
};

const burstNoteCount = 6;
const burstSeconds = 0.9;

const MusicBurst = ({
  position,
  radius,
}: {
  position: [number, number, number];
  radius: number;
}) => {
  const notes = useRef<InstancedMesh>(null);
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const geometry = useQuaverGeometries();
  const placer = useMemo(() => new Object3D(), []);
  const age = useAge();

  useFrame(() => {
    const life = Math.min(1, age.current / burstSeconds);
    const isAlive = life < 1;
    if (ring.current !== null && ringMaterial.current !== null) {
      ring.current.visible = isAlive;
      ring.current.scale.setScalar(1 + life * 1.1);
      ringMaterial.current.opacity = (1 - life) ** 2 * 0.9;
    }
    const mesh = notes.current;
    if (mesh === null) {
      return;
    }
    mesh.visible = isAlive;
    for (let index = 0; index < burstNoteCount; index++) {
      const angle = (index / burstNoteCount) * Math.PI * 2 + 0.3;
      const reach = radius * (0.6 + life * 2.2);
      placer.position.set(
        position[0] + Math.cos(angle) * reach,
        position[1] + Math.sin(angle) * reach + life * radius,
        position[2] + 0.3,
      );
      placer.rotation.set(0, 0, Math.sin(angle) * 0.6 + life * 2);
      placer.scale.setScalar(radius * 0.45 * (1 - life * 0.6));
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <mesh ref={ring} position={position}>
        <ringGeometry args={[radius * 0.9, radius, 48]} />
        <meshBasicMaterial
          ref={ringMaterial}
          color={canyonPalette.note}
          transparent
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <instancedMesh
        ref={notes}
        args={[geometry, undefined, burstNoteCount]}
        frustumCulled={false}
        name="note-burst"
      >
        <meshBasicMaterial color={canyonPalette.note} toneMapped={false} />
      </instancedMesh>
    </>
  );
};

export interface MusicGameWorldProps {
  gameType: MusicGameType;
  game: MusicGame;
  prompt: MusicPrompt | undefined;
  choices: readonly string[];
  hiddenChoiceIndexes: readonly number[];
  companionMood: CompanionMood;
  poppedChoiceIndex: number | undefined;
  popCount: number;
  isEffectsOn: boolean;
}

export const MusicGameWorld = ({
  gameType,
  game,
  prompt,
  choices,
  hiddenChoiceIndexes,
  companionMood,
  poppedChoiceIndex,
  popCount,
  isEffectsOn,
}: MusicGameWorldProps) => {
  const radius = useChoiceRadius();
  const camera = useThree((state) => state.camera);
  const choicePositions = useMemo(
    () =>
      getChoicePositions(choices.length, gameType).map((screenPosition) =>
        placeOnStage(camera, screenPosition),
      ),
    [camera, choices.length, gameType],
  );
  const poppedPosition =
    poppedChoiceIndex === undefined
      ? undefined
      : choicePositions[poppedChoiceIndex];

  return (
    <>
      <StudioLights />
      <pointLight
        position={[0.8, 2.6, 2]}
        intensity={6}
        distance={9}
        color={canyonPalette.footlight}
      />
      <CanyonStage />
      <StudioCompanion mood={companionMood} />
      <group key={popCount}>
        {prompt === undefined ? null : renderStageProp(prompt.stage)}
      </group>
      {choices.map((choice, index) =>
        hiddenChoiceIndexes.includes(index) ? null : (
          <group key={`${String(popCount)}-${choice}`}>
            {renderChoiceArt(game.findChoiceArt(choice), {
              position: choicePositions[index],
              radius,
              index,
            })}
          </group>
        ),
      )}
      {isEffectsOn && poppedPosition !== undefined ? (
        <MusicBurst
          key={`burst-${String(popCount)}`}
          position={poppedPosition}
          radius={radius}
        />
      ) : null}
    </>
  );
};
