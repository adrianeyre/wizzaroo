import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
  type Group,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ComputingGameType } from "../curriculum/computing-games.js";
import { renderComputingScene } from "./computing-lab-scenes.js";
import {
  computingStageScreenPosition,
  getComputingKeySizePixels,
  type QuestionPrompt,
} from "./mission/mission.js";
import { buildPaletteUniform } from "./pixel-pipeline.js";
import { getMotionScale } from "./reduced-motion.js";
import {
  BubbleBurst,
  StudioCompanion,
  cameraDistance,
  cameraFieldOfView,
  easeOutBack,
  placeOnStage,
  useChoicePositions,
  useDisposedOnUnmount,
  type CompanionMood,
} from "./studio-stage.js";

export interface ComputingLabWorldProps {
  gameType: ComputingGameType;
  prompt: QuestionPrompt | undefined;
  choices: readonly string[];
  hiddenChoiceIndexes: readonly number[];
  companionMood: CompanionMood;
  poppedChoiceIndex: number | undefined;
  popCount: number;
  isEffectsOn: boolean;
}

const lab = {
  skyTop: "#070b24",
  skyBottom: "#1b1550",
  glow: "#7c3aed",
  circuit: "#22d3ee",
  pulse: "#f0abfc",
  keyLight: "#fff4e0",
  rimLight: "#a78bfa",
  hemisphereSky: "#dbeafe",
  hemisphereGround: "#1e1b4b",
  keys: ["#e0f2fe", "#fce7f3", "#ecfccb", "#fef3c7"],
} as const;

const stageNominalWidth = 3.8;
const stageGrowSeconds = 0.55;
const moteCount = 60;
const labTime = { value: 0 };

const findVisibleHeight = () =>
  2 * cameraDistance * Math.tan(((cameraFieldOfView / 2) * Math.PI) / 180);

const useMotionScale = () => {
  const [motionScale] = useState(getMotionScale);
  return motionScale;
};

const useLabClock = () => {
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    labTime.value += deltaSeconds * motionScale;
  });
};

const backdropVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const backdropFragmentShader = `
uniform vec3 skyTop;
uniform vec3 skyBottom;
uniform vec3 glow;
uniform vec3 circuit;
uniform float time;
varying vec2 vUv;

void main() {
  vec3 colour = mix(skyBottom, skyTop, smoothstep(0.1, 0.95, vUv.y));
  vec2 fromGlow = (vUv - vec2(0.56, 0.45)) * vec2(1.5, 1.0);
  float glowStrength = 1.0 - smoothstep(0.0, 0.5, length(fromGlow));
  colour += glow * glowStrength * glowStrength * 0.45;
  vec2 grid = vUv * vec2(60.0, 30.0);
  vec2 cell = abs(fract(grid) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.04, min(cell.x, cell.y));
  float flicker = 0.5 + 0.5 * sin(floor(grid.x) * 1.7 + floor(grid.y) * 3.1 + time * 0.8);
  colour += circuit * line * 0.05 * flicker * (1.0 - vUv.y * 0.6);
  float vignette = smoothstep(0.95, 0.35, distance(vUv, vec2(0.5)));
  gl_FragColor = vec4(colour * mix(0.7, 1.0, vignette), 1.0);
}
`;

const floorFragmentShader = `
uniform vec3 circuit;
uniform vec3 pulse;
uniform float time;
varying vec2 vUv;

void main() {
  vec2 grid = vUv * vec2(28.0, 10.0);
  vec2 cell = abs(fract(grid) - 0.5);
  float width = fwidth(grid.x) * 1.2;
  float line = 1.0 - smoothstep(0.0, width, min(cell.x, cell.y) - 0.0);
  float distanceAway = smoothstep(0.0, 1.0, vUv.y);
  float travelling = fract(vUv.x * 2.0 - time * 0.15 + floor(grid.y) * 0.37);
  float spark = smoothstep(0.97, 1.0, travelling) * step(0.5, fract(floor(grid.y) * 0.5));
  vec3 colour = circuit * line * 0.55 + pulse * spark * line * 1.6;
  float fade = (1.0 - distanceAway) * smoothstep(0.0, 0.15, vUv.y);
  gl_FragColor = vec4(colour, (line * 0.6 + spark) * fade);
}
`;

const buildBackdropMaterial = () => {
  const [skyTop, skyBottom, glow, circuit] = buildPaletteUniform([
    lab.skyTop,
    lab.skyBottom,
    lab.glow,
    lab.circuit,
  ]);
  return new ShaderMaterial({
    uniforms: {
      skyTop: { value: skyTop },
      skyBottom: { value: skyBottom },
      glow: { value: glow },
      circuit: { value: circuit },
      time: labTime,
    },
    vertexShader: backdropVertexShader,
    fragmentShader: backdropFragmentShader,
    depthWrite: false,
  });
};

const buildFloorMaterial = () => {
  const [circuit, pulse] = buildPaletteUniform([lab.circuit, lab.pulse]);
  return new ShaderMaterial({
    uniforms: {
      circuit: { value: circuit },
      pulse: { value: pulse },
      time: labTime,
    },
    vertexShader: backdropVertexShader,
    fragmentShader: floorFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
};

const moteVertexShader = `
uniform float time;
uniform float pixelRatio;
attribute float seed;
varying float vSeed;

void main() {
  vSeed = seed;
  vec3 placed = position;
  placed.y = mod(position.y + time * (0.15 + seed * 0.2), 8.0) - 4.0;
  placed.x += sin(time * 0.4 + seed * 9.0) * 0.3;
  vec4 viewPosition = modelViewMatrix * vec4(placed, 1.0);
  gl_PointSize = (14.0 + seed * 18.0) * pixelRatio / -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const moteFragmentShader = `
varying float vSeed;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float reach = dot(point, point);
  if (reach > 1.0) {
    discard;
  }
  vec3 colour = mix(vec3(0.13, 0.83, 0.93), vec3(0.94, 0.67, 0.99), vSeed);
  gl_FragColor = vec4(colour, (1.0 - reach) * 0.55);
}
`;

const goldenRatioFraction = 0.618034;

const buildMoteGeometry = () => {
  const positions = new Float32Array(moteCount * 3);
  const seeds = new Float32Array(moteCount);
  for (let index = 0; index < moteCount; index++) {
    positions.set(
      [
        (((index * goldenRatioFraction) % 1) - 0.5) * 20,
        ((index * 0.37) % 1) * 8,
        -2 - (index % 5) * 0.9,
      ],
      index * 3,
    );
    seeds[index] = (index * 0.731) % 1;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new BufferAttribute(seeds, 1));
  return geometry;
};

const DataMotes = () => {
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(() => buildMoteGeometry(), []);
  const uniforms = useMemo(
    () => ({ time: labTime, pixelRatio: { value: pixelRatio } }),
    [pixelRatio],
  );
  useDisposedOnUnmount(geometry);
  return (
    <points geometry={geometry} frustumCulled={false} name="data-motes">
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={moteVertexShader}
        fragmentShader={moteFragmentShader}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
};

const LabLights = () => (
  <>
    <hemisphereLight args={[lab.hemisphereSky, lab.hemisphereGround, 1.2]} />
    <directionalLight
      position={[3, 5, 4]}
      intensity={2.3}
      color={lab.keyLight}
    />
    <directionalLight
      position={[-4, 2, -3]}
      intensity={1.4}
      color={lab.rimLight}
    />
  </>
);

const LabStage = ({ companionMood }: { companionMood: CompanionMood }) => {
  const backdrop = useMemo(() => buildBackdropMaterial(), []);
  const floor = useMemo(() => buildFloorMaterial(), []);
  useDisposedOnUnmount(backdrop);
  useDisposedOnUnmount(floor);
  useLabClock();
  return (
    <>
      <LabLights />
      <mesh
        position={[0, 0, -8]}
        material={backdrop}
        renderOrder={-1}
        name="lab-backdrop"
      >
        <planeGeometry args={[60, 30]} />
      </mesh>
      <mesh
        position={[0, -2.3, -3]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={floor}
        name="lab-circuit-floor"
      >
        <planeGeometry args={[28, 10]} />
      </mesh>
      <DataMotes />
      <StudioCompanion mood={companionMood} />
    </>
  );
};

const useStageFit = () => {
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const aspect = size.height > 0 ? size.width / size.height : 16 / 9;
  const visibleWidth = findVisibleHeight() * aspect;
  const scale = Math.min(
    1.15,
    Math.max(0.62, (visibleWidth * 0.38) / stageNominalWidth),
  );
  const position = useMemo(
    () => placeOnStage(camera, computingStageScreenPosition),
    [camera],
  );
  return { scale, position };
};

const PromptStage = ({ prompt }: { prompt: QuestionPrompt | undefined }) => {
  const { scale, position } = useStageFit();
  const stage = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const body = stage.current;
    if (body === null) {
      return;
    }
    const growth =
      motionScale === 0
        ? 1
        : easeOutBack(Math.min(1, age.current / stageGrowSeconds));
    body.scale.setScalar(scale * growth);
    body.position.y =
      position[1] + Math.sin(age.current * 1.1) * 0.05 * motionScale;
  });
  if (prompt?.kind !== "computing") {
    return null;
  }
  return (
    <group ref={stage} position={position} name="computing-stage">
      {renderComputingScene(prompt.scene)}
    </group>
  );
};

const useKeySize = () => {
  const size = useThree((state) => state.size);
  const height = size.height > 0 ? size.height : 360;
  const width = size.width > 0 ? size.width : 640;
  const pixels = getComputingKeySizePixels(width, height);
  const unitsPerPixel = findVisibleHeight() / height;
  return {
    width: pixels.width * unitsPerPixel,
    height: pixels.height * unitsPerPixel,
  };
};

const Keycap = ({
  position,
  width,
  height,
  index,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  index: number;
}) => {
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        width * 1.04,
        height * 1.08,
        height * 0.42,
        2,
        height * 0.16,
      ),
    [width, height],
  );
  useDisposedOnUnmount(geometry);
  const key = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const body = key.current;
    if (body === null) {
      return;
    }
    const growth =
      motionScale === 0
        ? 1
        : easeOutBack(
            Math.min(1, Math.max(0, (age.current - index * 0.06) / 0.4)),
          );
    body.scale.setScalar(Math.max(0.001, growth));
    body.position.y =
      position[1] + Math.sin(age.current * 1.5 + index) * 0.025 * motionScale;
  });
  return (
    <group ref={key} position={position} rotation={[-0.22, 0, 0]} name="keycap">
      <mesh geometry={geometry} position={[0, 0, -height * 0.24]}>
        <meshPhysicalMaterial
          color={lab.keys[index % lab.keys.length]}
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
    </group>
  );
};

export const ComputingLabWorld = ({
  gameType,
  prompt,
  choices,
  hiddenChoiceIndexes,
  companionMood,
  poppedChoiceIndex,
  popCount,
  isEffectsOn,
}: ComputingLabWorldProps) => {
  const choicePositions = useChoicePositions(choices.length, gameType);
  const keySize = useKeySize();
  const poppedPosition =
    poppedChoiceIndex === undefined
      ? undefined
      : choicePositions[poppedChoiceIndex];

  return (
    <>
      <LabStage companionMood={companionMood} />
      <group key={`stage-${String(popCount)}`}>
        <PromptStage prompt={prompt} />
      </group>
      {choices.map((choice, index) =>
        hiddenChoiceIndexes.includes(index) ? null : (
          <Keycap
            key={`${String(popCount)}-${choice}`}
            position={choicePositions[index]}
            width={keySize.width}
            height={keySize.height}
            index={index}
          />
        ),
      )}
      {isEffectsOn && poppedPosition !== undefined ? (
        <BubbleBurst
          key={`burst-${String(popCount)}`}
          position={poppedPosition}
          radius={keySize.height * 0.8}
        />
      ) : null}
    </>
  );
};
