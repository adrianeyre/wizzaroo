import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  type InstancedMesh,
  type Points,
  type PointsMaterial,
} from "three";
import type {
  HistoryChoiceProp,
  HistoryQuest,
} from "../curriculum/history-quests.js";
import { useWordTexture, type FaceLook } from "./crystal-cave-games.js";
import {
  buildHistoryChoiceModel,
  buildHistoryPropModel,
  type HistoryPropKind,
} from "./history-props.js";
import {
  historyGroundHeight,
  historySceneLooks,
  type GroundPattern,
  type HistoryParticles,
  type HistoryPropPlacement,
  type HistorySceneLook,
} from "./history-scenes.js";
import {
  questionsPerActivity,
  type PlacedHistoryEvent,
  type QuestionPrompt,
  type ScreenPosition,
} from "./mission/mission.js";
import {
  buildSparkleDirections,
  cameraDistance,
  cameraFieldOfView,
  findGrowth,
  placeOnStage,
  promptGrowSeconds,
  sparkleLifeSeconds,
  sparkleSpeed,
  StudioCompanion,
  useChoicePositions,
  useChoiceRadius,
  useDisposedOnUnmount,
  useGrowingChoice,
  useMotionScale,
  usePromptGrowth,
  useSparkleGeometry,
  type ChoiceSlot,
  type CompanionMood,
} from "./studio-stage.js";

export interface HistoryQuestWorldProps {
  historyQuest: HistoryQuest;
  prompt: QuestionPrompt | undefined;
  choices: readonly string[];
  hiddenChoiceIndexes: readonly number[];
  companionMood: CompanionMood;
  poppedChoiceIndex: number | undefined;
  popCount: number;
  isEffectsOn: boolean;
}

interface SceneClock {
  value: number;
}

const historyTime: SceneClock = { value: 0 };

const useSceneClock = (): SceneClock => {
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    historyTime.value += deltaSeconds * motionScale;
  });
  return historyTime;
};

const toColourUniform = (hex: string) => ({ value: new Color(hex) });

const flatVertexShader = `
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const skyFragmentShader = `
uniform vec3 top;
uniform vec3 bottom;
uniform vec3 glow;
uniform vec2 glowAt;
uniform float glowSize;
varying vec2 vUv;

void main() {
  vec3 colour = mix(bottom, top, smoothstep(0.32, 1.0, vUv.y));
  vec2 fromGlow = (vUv - glowAt) * vec2(2.6, 1.0);
  float reach = length(fromGlow);
  float disc = 1.0 - smoothstep(glowSize * 0.18, glowSize * 0.22, reach);
  float halo = 1.0 - smoothstep(0.0, glowSize, reach);
  colour += glow * (halo * halo * 0.55 + disc * 0.6);
  gl_FragColor = vec4(colour, 1.0);
}
`;

const groundPatterns: Record<GroundPattern, number> = {
  earth: 0,
  grass: 1,
  sand: 2,
  planks: 3,
  flagstones: 4,
  cobbles: 5,
  moon: 6,
  snow: 7,
};

const groundFragmentShader = `
uniform vec3 near;
uniform vec3 far;
uniform vec3 haze;
uniform float pattern;
uniform float hazeFrom;
uniform float hazeTo;
varying vec3 vWorld;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 inside = fract(point);
  vec2 blend = inside * inside * (3.0 - 2.0 * inside);
  return mix(
    mix(hash(cell), hash(cell + vec2(1.0, 0.0)), blend.x),
    mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), blend.x),
    blend.y
  );
}

float seam(float along, float width) {
  float edge = abs(fract(along) - 0.5) * 2.0;
  return smoothstep(1.0 - width, 1.0, edge);
}

void main() {
  vec2 point = vWorld.xz;
  float depth = clamp((-vWorld.z - 2.0) / 16.0, 0.0, 1.0);
  vec3 colour = mix(near, far, depth);
  float grain = noise(point * 1.7) * 0.5 + noise(point * 5.3) * 0.25;
  float shade = 0.88 + grain * 0.24;
  if (pattern < 0.5) {
    shade *= 0.95 + noise(point * 0.6) * 0.1;
  } else if (pattern < 1.5) {
    shade *= 0.9 + noise(point * 3.1 + 7.0) * 0.18;
  } else if (pattern < 2.5) {
    shade *= 0.94 + sin(point.x * 1.4 + sin(point.y * 0.8) * 2.0) * 0.05;
  } else if (pattern < 3.5) {
    float board = floor(point.y * 1.6);
    shade *= (0.9 + hash(vec2(board, 3.0)) * 0.16) * (1.0 - seam(point.y * 1.6, 0.08) * 0.35);
  } else if (pattern < 4.5) {
    vec2 slab = point * vec2(0.55, 0.7);
    shade *= (0.92 + hash(floor(slab)) * 0.12) * (1.0 - max(seam(slab.x, 0.06), seam(slab.y, 0.06)) * 0.3);
  } else if (pattern < 5.5) {
    vec2 stone = point * 2.2;
    float rim = length(fract(stone) - 0.5);
    shade *= (0.85 + hash(floor(stone)) * 0.2) * (1.0 - smoothstep(0.38, 0.5, rim) * 0.35);
  } else if (pattern < 6.5) {
    float crater = noise(point * 0.9);
    shade *= 0.85 + smoothstep(0.55, 0.7, crater) * 0.2 - smoothstep(0.7, 0.8, crater) * 0.15;
  } else {
    shade *= 0.96 + noise(point * 2.0) * 0.06;
  }
  colour *= shade;
  float hazeAmount = smoothstep(hazeFrom, hazeTo, -vWorld.z);
  gl_FragColor = vec4(mix(colour, haze, hazeAmount * 0.85), 1.0);
}
`;

const waterFragmentShader = `
uniform float time;
uniform vec3 colour;
uniform vec3 glint;
varying vec3 vWorld;

void main() {
  vec2 point = vWorld.xz;
  float wave = sin(point.x * 1.3 + time * 1.1) * 0.5 + sin(point.x * 2.7 - point.y * 1.9 + time * 1.7) * 0.5;
  float sparkle = smoothstep(0.82, 1.0, wave);
  vec3 shaded = colour * (0.85 + wave * 0.12) + glint * sparkle * 0.35;
  gl_FragColor = vec4(shaded, 1.0);
}
`;

const findBackdropHalfHeight = (distance: number) =>
  (distance + cameraDistance) *
  Math.tan(((cameraFieldOfView / 2) * Math.PI) / 180) *
  1.25;

const HistorySky = ({ look }: { look: HistorySceneLook }) => {
  const { sky, backdropDistance } = look;
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          top: toColourUniform(sky.top),
          bottom: toColourUniform(sky.bottom),
          glow: toColourUniform(sky.glow),
          glowAt: { value: [sky.glowX, sky.glowY] },
          glowSize: { value: sky.glowSize },
        },
        vertexShader: flatVertexShader,
        fragmentShader: skyFragmentShader,
        depthWrite: false,
      }),
    [sky],
  );
  useDisposedOnUnmount(material);
  const halfHeight = findBackdropHalfHeight(backdropDistance);
  return (
    <mesh
      name="history-sky"
      material={material}
      position={[0, historyGroundHeight + halfHeight * 0.85, -backdropDistance]}
      renderOrder={-1}
    >
      <planeGeometry args={[halfHeight * 6, halfHeight * 2]} />
    </mesh>
  );
};

const groundNearZ = 5;

const HistoryGround = ({ look }: { look: HistorySceneLook }) => {
  const { ground, sky, backdropDistance, fog } = look;
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          near: toColourUniform(ground.near),
          far: toColourUniform(ground.far),
          haze: toColourUniform(sky.bottom),
          pattern: { value: groundPatterns[ground.pattern] },
          hazeFrom: { value: fog.near },
          hazeTo: { value: Math.max(fog.near + 1, backdropDistance) },
        },
        vertexShader: flatVertexShader,
        fragmentShader: groundFragmentShader,
      }),
    [ground, sky.bottom, backdropDistance, fog.near],
  );
  useDisposedOnUnmount(material);
  const depth = groundNearZ + backdropDistance + 1;
  return (
    <mesh
      name="history-ground"
      material={material}
      position={[0, historyGroundHeight, groundNearZ - depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry
        args={[findBackdropHalfHeight(backdropDistance) * 6, depth]}
      />
    </mesh>
  );
};

const HistoryWater = ({
  water,
  clock,
}: {
  water: NonNullable<HistorySceneLook["water"]>;
  clock: SceneClock;
}) => {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          time: clock,
          colour: toColourUniform(water.colour),
          glint: toColourUniform("#ffffff"),
        },
        vertexShader: flatVertexShader,
        fragmentShader: waterFragmentShader,
      }),
    [water.colour, clock],
  );
  useDisposedOnUnmount(material);
  const depth = water.nearZ - water.farZ;
  return (
    <mesh
      name="history-water"
      material={material}
      position={[0, historyGroundHeight + 0.04, water.nearZ - depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[80, depth]} />
    </mesh>
  );
};

const HistoryLights = ({ look }: { look: HistorySceneLook }) => {
  const { light, warmLight } = look;
  return (
    <>
      <hemisphereLight
        args={[light.skyLight, light.groundLight, light.ambientIntensity]}
      />
      <directionalLight
        position={[4, 7, 5]}
        intensity={light.sunIntensity}
        color={light.sun}
      />
      <directionalLight position={[-5, 3, 4]} intensity={0.5} color="#cfe6ff" />
      {warmLight === undefined ? null : (
        <pointLight
          color={warmLight.colour}
          intensity={warmLight.intensity}
          distance={22}
          position={[warmLight.x, warmLight.y, warmLight.z]}
        />
      )}
    </>
  );
};

interface ParticleLook {
  colour: string;
  count: number;
  size: number;
  drift: [number, number, number];
  sway: number;
  low: [number, number, number];
  span: [number, number, number];
  isGlowing: boolean;
}

const particleLooks: Record<Exclude<HistoryParticles, "none">, ParticleLook> = {
  embers: {
    colour: "#ff9a3c",
    count: 70,
    size: 60,
    drift: [0.15, 0.9, 0],
    sway: 0.35,
    low: [-12, -2.6, -12],
    span: [24, 10, 12],
    isGlowing: true,
  },
  dust: {
    colour: "#fff1cf",
    count: 60,
    size: 28,
    drift: [0.05, 0.08, 0],
    sway: 0.2,
    low: [-10, -2.6, -9],
    span: [20, 8, 10],
    isGlowing: true,
  },
  snow: {
    colour: "#ffffff",
    count: 90,
    size: 40,
    drift: [0.2, -0.7, 0],
    sway: 0.4,
    low: [-12, -2.6, -12],
    span: [24, 11, 14],
    isGlowing: false,
  },
  stars: {
    colour: "#f4f7ff",
    count: 90,
    size: 34,
    drift: [0, 0, 0],
    sway: 0,
    low: [-24, 1.5, -16],
    span: [48, 12, 1],
    isGlowing: true,
  },
  fireflies: {
    colour: "#e9ff8a",
    count: 40,
    size: 50,
    drift: [0.1, 0.12, 0],
    sway: 0.6,
    low: [-10, -2.4, -10],
    span: [20, 5, 9],
    isGlowing: true,
  },
  sand: {
    colour: "#f3dcae",
    count: 70,
    size: 22,
    drift: [1.6, 0.05, 0],
    sway: 0.15,
    low: [-12, -2.6, -9],
    span: [24, 4, 10],
    isGlowing: false,
  },
  rain: {
    colour: "#cfe2ff",
    count: 120,
    size: 22,
    drift: [-0.6, -7, 0],
    sway: 0,
    low: [-12, -2.6, -10],
    span: [24, 12, 12],
    isGlowing: false,
  },
};

const particleVertexShader = `
attribute vec3 seed;
uniform float time;
uniform vec3 low;
uniform vec3 span;
uniform vec3 drift;
uniform float sway;
uniform float size;
uniform float pixelRatio;
varying float vTwinkle;

void main() {
  vec3 travelled = seed * span + drift * time;
  vec3 placed = low + mod(travelled, span);
  placed.x += sin(time * 1.3 + seed.y * 20.0) * sway;
  vTwinkle = 0.55 + 0.45 * sin(time * 2.4 + seed.z * 31.0);
  vec4 viewPosition = modelViewMatrix * vec4(placed, 1.0);
  gl_PointSize = size * pixelRatio * (0.6 + seed.x * 0.8) / -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const particleFragmentShader = `
uniform vec3 colour;
varying float vTwinkle;

void main() {
  float reach = length(gl_PointCoord - 0.5) * 2.0;
  if (reach > 1.0) {
    discard;
  }
  float softness = 1.0 - reach;
  gl_FragColor = vec4(colour * (0.7 + vTwinkle * 0.5), softness * vTwinkle);
}
`;

const buildParticleGeometry = (count: number): BufferGeometry => {
  const seeds = new Float32Array(count * 3);
  for (let index = 0; index < count * 3; index++) {
    seeds[index] = (Math.sin(index * 12.9898 + 4.1) * 43758.5453) % 1;
    seeds[index] = Math.abs(seeds[index]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(count * 3), 3),
  );
  geometry.setAttribute("seed", new BufferAttribute(seeds, 3));
  return geometry;
};

const HistoryParticleField = ({
  particles,
  clock,
}: {
  particles: Exclude<HistoryParticles, "none">;
  clock: SceneClock;
}) => {
  const look = particleLooks[particles];
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(
    () => buildParticleGeometry(look.count),
    [look.count],
  );
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          time: clock,
          low: { value: look.low },
          span: { value: look.span },
          drift: { value: look.drift },
          sway: { value: look.sway },
          size: { value: look.size },
          pixelRatio: { value: pixelRatio },
          colour: toColourUniform(look.colour),
        },
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: look.isGlowing ? AdditiveBlending : undefined,
      }),
    [look, clock, pixelRatio],
  );
  useDisposedOnUnmount(geometry);
  useDisposedOnUnmount(material);
  return (
    <points
      name="history-particles"
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
};

const groupPlacements = (
  placements: readonly HistoryPropPlacement[],
): [HistoryPropKind, HistoryPropPlacement[]][] => {
  const groups = new Map<HistoryPropKind, HistoryPropPlacement[]>();
  for (const placement of placements) {
    groups.set(placement.kind, [
      ...(groups.get(placement.kind) ?? []),
      placement,
    ]);
  }
  return [...groups];
};

const placeProp = (
  placer: Object3D,
  { x, z, scale = 1, turn = 0, lift = 0 }: HistoryPropPlacement,
  wobble: { rise: number; tilt: number; stretch: number },
) => {
  placer.position.set(x, historyGroundHeight + lift + wobble.rise, z);
  placer.rotation.set(0, turn, wobble.tilt);
  placer.scale.set(scale, scale * wobble.stretch, scale);
  placer.updateMatrix();
};

const stillWobble = { rise: 0, tilt: 0, stretch: 1 };

const PropInstances = ({
  kind,
  placements,
  clock,
}: {
  kind: HistoryPropKind;
  placements: HistoryPropPlacement[];
  clock: SceneClock;
}) => {
  const model = useMemo(() => buildHistoryPropModel(kind), [kind]);
  const bodyMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82,
        flatShading: true,
      }),
    [],
  );
  const glowMaterial = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      model.body.dispose();
      model.glow?.dispose();
      bodyMaterial.dispose();
      glowMaterial.dispose();
    },
    [model, bodyMaterial, glowMaterial],
  );
  const body = useRef<InstancedMesh>(null);
  const glow = useRef<InstancedMesh>(null);
  const placer = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    placements.forEach((placement, index) => {
      placeProp(placer, placement, stillWobble);
      body.current?.setMatrixAt(index, placer.matrix);
      glow.current?.setMatrixAt(index, placer.matrix);
    });
    for (const mesh of [body.current, glow.current]) {
      if (mesh !== null) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }, [placements, placer]);

  useFrame(() => {
    if (model.motion === "still") {
      return;
    }
    const time = clock.value;
    if (model.motion === "flicker") {
      glowMaterial.color.setScalar(
        0.82 + 0.18 * Math.sin(time * 11) * Math.sin(time * 7.3),
      );
      return;
    }
    placements.forEach((placement, index) => {
      const phase = time * 1.4 + index * 1.7;
      placeProp(
        placer,
        placement,
        model.motion === "bob"
          ? {
              rise: Math.sin(phase) * 0.08,
              tilt: Math.sin(phase * 0.8) * 0.04,
              stretch: 1,
            }
          : { rise: 0, tilt: Math.sin(phase * 0.7) * 0.025, stretch: 1 },
      );
      body.current?.setMatrixAt(index, placer.matrix);
      glow.current?.setMatrixAt(index, placer.matrix);
    });
    for (const mesh of [body.current, glow.current]) {
      if (mesh !== null) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <instancedMesh
        ref={body}
        name={`prop-${kind}`}
        args={[model.body, bodyMaterial, placements.length]}
        frustumCulled={false}
      />
      {model.glow === undefined ? null : (
        <instancedMesh
          ref={glow}
          name={`prop-${kind}-glow`}
          args={[model.glow, glowMaterial, placements.length]}
          frustumCulled={false}
        />
      )}
    </>
  );
};

const Diorama = ({
  placements,
  clock,
}: {
  placements: readonly HistoryPropPlacement[];
  clock: SceneClock;
}) => {
  const groups = useMemo(() => groupPlacements(placements), [placements]);
  return (
    <group name="history-diorama">
      {groups.map(([kind, kindPlacements]) => (
        <PropInstances
          key={kind}
          kind={kind}
          placements={kindPlacements}
          clock={clock}
        />
      ))}
    </group>
  );
};

const shinyChoiceProps: readonly HistoryChoiceProp[] = [
  "gold-coin",
  "shield",
  "lantern",
];

const HistoryChoiceObject = ({
  prop,
  ...slot
}: ChoiceSlot & { prop: HistoryChoiceProp }) => {
  const { choice, age, motionScale } = useGrowingChoice(slot);
  const turner = useRef<Object3D>(null);
  const geometry = useMemo(() => buildHistoryChoiceModel(prop), [prop]);
  useDisposedOnUnmount(geometry);
  const isShiny = shinyChoiceProps.includes(prop);

  useFrame(() => {
    if (turner.current !== null) {
      turner.current.rotation.y =
        Math.sin(age.current * 0.8 + slot.index * 1.3) * 0.35 * motionScale;
    }
  });

  return (
    <group
      ref={choice}
      position={slot.position}
      name={`choice-${prop}`}
      scale={slot.radius}
    >
      <group ref={turner} position={[0, -0.25, 0]}>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            vertexColors
            roughness={isShiny ? 0.3 : 0.6}
            metalness={isShiny ? 0.55 : 0.05}
          />
        </mesh>
      </group>
    </group>
  );
};

const railScreenHeight = 0.04;
const railScreenSpread = 0.66;
const cardWorldSize: [number, number] = [1.5, 0.82];
const cardTextureSize = { width: 384, height: 210 };
const placedCardLook: FaceLook = {
  background: "#fbf3dd",
  ink: "#3b2414",
  border: "#8a5a2b",
};

const findRailSlotPosition = (slotIndex: number): ScreenPosition => ({
  x:
    -railScreenSpread +
    (2 * railScreenSpread * slotIndex) / (questionsPerActivity - 1),
  y: railScreenHeight,
});

const TimelineCard = ({
  event,
  position,
}: {
  event: PlacedHistoryEvent;
  position: [number, number, number];
}) => {
  const texture = useWordTexture(
    `${event.date}: ${event.label}`,
    placedCardLook,
    cardTextureSize,
  );
  return (
    <mesh position={position} name="timeline-card">
      <planeGeometry args={cardWorldSize} />
      <meshBasicMaterial
        key={texture === undefined ? "plain" : "written"}
        map={texture ?? null}
        color={texture === undefined ? placedCardLook.background : "#ffffff"}
        toneMapped={false}
      />
    </mesh>
  );
};

const TimelineRail = ({
  placedEvents,
}: {
  placedEvents: readonly PlacedHistoryEvent[];
}) => {
  const camera = useThree((state) => state.camera);
  const slots = useMemo(
    () =>
      Array.from({ length: questionsPerActivity }, (_, slotIndex) =>
        placeOnStage(camera, findRailSlotPosition(slotIndex)),
      ),
    [camera],
  );
  const emptySlots = useRef<InstancedMesh>(null);
  const placer = useMemo(() => new Object3D(), []);
  const firstSlot = slots[0];
  const lastSlot = slots[slots.length - 1];
  const beamLength = lastSlot[0] - firstSlot[0] + cardWorldSize[0] + 0.4;

  useLayoutEffect(() => {
    const mesh = emptySlots.current;
    if (mesh === null) {
      return;
    }
    slots.forEach(([x, y, z], slotIndex) => {
      placer.position.set(x, y, z - 0.02);
      placer.scale.setScalar(slotIndex < placedEvents.length ? 0.001 : 1);
      placer.updateMatrix();
      mesh.setMatrixAt(slotIndex, placer.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [slots, placedEvents.length, placer]);

  return (
    <group name="timeline-rail">
      <mesh position={[0, firstSlot[1] + cardWorldSize[1] / 2 + 0.12, -0.05]}>
        <boxGeometry args={[beamLength, 0.16, 0.12]} />
        <meshStandardMaterial color="#6b4426" roughness={0.7} />
      </mesh>
      <instancedMesh
        ref={emptySlots}
        args={[undefined, undefined, questionsPerActivity]}
        frustumCulled={false}
        name="timeline-empty-slots"
      >
        <planeGeometry args={cardWorldSize} />
        <meshBasicMaterial
          color="#fff6dc"
          transparent
          opacity={0.18}
          side={DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
      {placedEvents.map((event, slotIndex) => (
        <TimelineCard
          key={event.label}
          event={event}
          position={slots[slotIndex]}
        />
      ))}
    </group>
  );
};

const sortCardScreenPosition: ScreenPosition = { x: 0.12, y: 0.06 };
const sortCardTextureSize = { width: 512, height: 300 };
const sortCardLook: FaceLook = {
  background: "#fbf3dd",
  ink: "#2e1d10",
  border: "#8a5a2b",
};

const SortItemCard = ({ text }: { text: string }) => {
  const camera = useThree((state) => state.camera);
  const position = useMemo(
    () => placeOnStage(camera, sortCardScreenPosition),
    [camera],
  );
  const { age, motionScale } = usePromptGrowth();
  const card = useRef<Object3D>(null);
  const texture = useWordTexture(text, sortCardLook, sortCardTextureSize);

  useFrame(() => {
    const body = card.current;
    if (body === null) {
      return;
    }
    body.scale.setScalar(
      findGrowth(age.current, promptGrowSeconds, motionScale),
    );
    body.rotation.y = -0.18 + Math.sin(age.current * 0.7) * 0.05 * motionScale;
  });

  return (
    <group ref={card} position={position} name="sort-item-card">
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[2.02, 1.22, 0.05]} />
        <meshStandardMaterial color="#7a5230" roughness={0.7} />
      </mesh>
      <mesh>
        <planeGeometry args={[1.9, 1.11]} />
        <meshBasicMaterial
          key={texture === undefined ? "plain" : "written"}
          map={texture ?? null}
          color={texture === undefined ? sortCardLook.background : "#ffffff"}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const HistoryPrompt = ({ prompt }: { prompt: QuestionPrompt | undefined }) => {
  if (prompt?.kind !== "history") {
    return null;
  }
  if (prompt.play === "timeline") {
    return <TimelineRail placedEvents={prompt.placedEvents} />;
  }
  return prompt.play === "sort" ? <SortItemCard text={prompt.ask} /> : null;
};

const GoldBurst = ({ position }: { position: [number, number, number] }) => {
  const sparkles = useRef<Points>(null);
  const material = useRef<PointsMaterial>(null);
  const directions = useMemo(() => buildSparkleDirections(), []);
  const geometry = useSparkleGeometry();
  const age = useRef(0);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const life = Math.min(1, age.current / sparkleLifeSeconds);
    if (sparkles.current !== null) {
      sparkles.current.visible = life < 1;
    }
    if (material.current !== null) {
      material.current.opacity = 1 - life;
    }
    const positions = geometry.getAttribute("position");
    const reach = 0.3 + age.current * sparkleSpeed;
    const fall = age.current ** 2 * 1.8;
    directions.forEach((direction, index) => {
      const spread = 0.7 + (index % 3) * 0.2;
      positions.setXYZ(
        index,
        position[0] + direction.x * reach * spread,
        position[1] + direction.y * reach * spread - fall,
        position[2] + direction.z,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points ref={sparkles} geometry={geometry} name="gold-burst">
      <pointsMaterial
        ref={material}
        color="#ffd54a"
        size={0.16}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
};

export const HistoryQuestWorld = ({
  historyQuest,
  prompt,
  choices,
  hiddenChoiceIndexes,
  companionMood,
  poppedChoiceIndex,
  popCount,
  isEffectsOn,
}: HistoryQuestWorldProps) => {
  const look = historySceneLooks[historyQuest.scene];
  const clock = useSceneClock();
  const radius = useChoiceRadius();
  const choicePositions = useChoicePositions(choices.length, "history-quest");
  const poppedPosition =
    poppedChoiceIndex === undefined
      ? undefined
      : choicePositions[poppedChoiceIndex];

  return (
    <>
      <color attach="background" args={[look.sky.bottom]} />
      <fog attach="fog" args={[look.sky.bottom, look.fog.near, look.fog.far]} />
      <HistoryLights look={look} />
      <HistorySky look={look} />
      <HistoryGround look={look} />
      {look.water === undefined ? null : (
        <HistoryWater water={look.water} clock={clock} />
      )}
      <Diorama placements={look.props} clock={clock} />
      {look.particles === "none" ? null : (
        <HistoryParticleField particles={look.particles} clock={clock} />
      )}
      <StudioCompanion mood={companionMood} />
      <group key={`prompt-${String(popCount)}`}>
        <HistoryPrompt prompt={prompt} />
      </group>
      {choices.map((choice, index) =>
        hiddenChoiceIndexes.includes(index) ? null : (
          <HistoryChoiceObject
            key={`${String(popCount)}-${choice}`}
            prop={historyQuest.choiceProp}
            position={choicePositions[index]}
            radius={radius}
            index={index}
          />
        ),
      )}
      {isEffectsOn && poppedPosition !== undefined ? (
        <GoldBurst
          key={`burst-${String(popCount)}`}
          position={poppedPosition}
        />
      ) : null}
    </>
  );
};
