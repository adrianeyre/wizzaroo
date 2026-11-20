import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Object3D,
  PMREMGenerator,
  ShaderMaterial,
  Vector3,
  type Camera,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  type Points,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { QuestionGameType } from "../curriculum/world-map.js";
import {
  getChoicePositions,
  getChoiceSizePixels,
  promptScreenPosition,
  type ScreenPosition,
} from "./mission/mission.js";
import { buildPaletteUniform } from "./pixel-pipeline.js";
import { getMotionScale } from "./reduced-motion.js";

export type CompanionMood = "waiting" | "cheering" | "thinking" | "celebrating";

export const studioPalette = {
  skyTop: "#06142b",
  skyBottom: "#0f4c6e",
  glow: "#3cc6dd",
  filmTint: "#dff6ff",
  companionBody: "#ff9a3c",
  companionEar: "#ff5f6d",
  eyeWhite: "#ffffff",
  pupil: "#0d1526",
  keyLight: "#fff4e0",
  rimLight: "#7fd8ff",
  hemisphereSky: "#cbeeff",
  hemisphereGround: "#10243f",
} as const;

export const cameraDistance = 6;
export const cameraFieldOfView = 50;
const fallbackViewportHeight = 360;
const companionScreenPosition: ScreenPosition = { x: 0.8, y: 0.32 };
const sparkleCount = 24;
export const sparkleLifeSeconds = 0.8;
export const sparkleSpeed = 2.4;
export const bobHeight = 0.06;
export const bubbleGrowSeconds = 0.45;
export const bubbleWobble = 0.02;
const ambientBubbleCount = 12;
const ambientBubbleRise = 10;

export const placeOnStage = (
  camera: Camera,
  { x, y }: ScreenPosition,
): [number, number, number] => {
  const pointOnScreen = new Vector3(x, y, 0.5).unproject(camera);
  const direction = pointOnScreen.sub(camera.position).normalize();
  if (direction.z === 0) {
    return [x, y, 0];
  }
  const distance = -camera.position.z / direction.z;
  const placed = camera.position.clone().addScaledVector(direction, distance);
  return [placed.x, placed.y, 0];
};

const findVisibleHeight = () =>
  2 * cameraDistance * Math.tan(((cameraFieldOfView / 2) * Math.PI) / 180);

export const useChoiceRadius = (): number => {
  const viewportHeight = useThree((state) => state.size.height);
  const height = viewportHeight > 0 ? viewportHeight : fallbackViewportHeight;
  return ((getChoiceSizePixels(height) / 2) * findVisibleHeight()) / height;
};

export const easeOutBack = (progress: number) => {
  const overshoot = 1.70158;
  const shifted = progress - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
};

const soapFilmVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  vec4 placed = vec4(position, 1.0);
#ifdef USE_INSTANCING
  placed = instanceMatrix * placed;
#endif
  gl_Position = projectionMatrix * modelViewMatrix * placed;
}
`;

const soapFilmFragmentShader = `
uniform float time;
uniform float strength;
uniform vec3 filmTint;
varying vec2 vUv;

void main() {
  vec2 point = vUv * 2.0 - 1.0;
  float reach = length(point);
  float edge = fwidth(reach) * 1.5;
  float coverage = 1.0 - smoothstep(1.0 - edge, 1.0, reach);
  if (coverage <= 0.0) {
    discard;
  }
  vec3 normal = vec3(point, sqrt(max(0.0, 1.0 - dot(point, point))));
  vec3 towardsViewer = vec3(0.0, 0.0, 1.0);
  float fresnel = pow(1.0 - normal.z, 2.6);
  float film = fresnel * 1.7 + point.y * 0.3 - point.x * 0.12 + time * 0.07;
  vec3 iridescence = 0.55 + 0.45 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) + film));
  vec3 keyHalf = normalize(normalize(vec3(-0.5, 0.62, 0.6)) + towardsViewer);
  float keyFacing = max(dot(normal, keyHalf), 0.0);
  float keyHighlight = pow(keyFacing, 140.0) * 1.6 + pow(keyFacing, 14.0) * 0.16;
  vec3 fillHalf = normalize(normalize(vec3(0.55, -0.5, 0.65)) + towardsViewer);
  float fillHighlight = pow(max(dot(normal, fillHalf), 0.0), 70.0) * 0.5;
  float rimLine = smoothstep(0.88, 0.985, reach) * 0.35;
  vec3 colour = mix(filmTint, iridescence, 0.72) * (0.16 + fresnel * 1.25 + rimLine);
  colour += vec3(keyHighlight + fillHighlight);
  float opacity = clamp(0.08 + fresnel * 0.82 + rimLine + keyHighlight + fillHighlight, 0.0, 1.0);
  gl_FragColor = vec4(colour, opacity * coverage * strength);
}
`;

const soapFilmTime = { value: 0 };

const buildSoapFilmMaterial = (strength: number): ShaderMaterial => {
  const [filmTint] = buildPaletteUniform([studioPalette.filmTint]);
  return new ShaderMaterial({
    uniforms: {
      time: soapFilmTime,
      strength: { value: strength },
      filmTint: { value: filmTint },
    },
    vertexShader: soapFilmVertexShader,
    fragmentShader: soapFilmFragmentShader,
    transparent: true,
    depthWrite: false,
  });
};

export const bubbleFilm = buildSoapFilmMaterial(1);
const ambientBubbleFilm = buildSoapFilmMaterial(0.45);

export const useDisposedOnUnmount = (disposable: { dispose: () => void }) => {
  useEffect(
    () => () => {
      disposable.dispose();
    },
    [disposable],
  );
};

export const useSoapFilmClock = () => {
  const [motionScale] = useState(getMotionScale);
  useFrame((_state, deltaSeconds) => {
    soapFilmTime.value += deltaSeconds * motionScale;
  });
};

export const useCompanionMotion = (mood: CompanionMood) => {
  const camera = useThree((state) => state.camera);
  const companion = useRef<Group>(null);
  const position = useMemo(
    () => placeOnStage(camera, companionScreenPosition),
    [camera],
  );
  const age = useRef(0);
  const [motionScale] = useState(getMotionScale);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const body = companion.current;
    if (body === null) {
      return;
    }
    const time = age.current;
    const lift = {
      waiting: Math.sin(time * 2) * 0.05,
      cheering: Math.abs(Math.sin(time * 8)) * 0.35,
      thinking: 0,
      celebrating: Math.abs(Math.sin(time * 6)) * 0.45,
    }[mood];
    body.position.set(position[0], position[1] + lift, position[2]);
    body.rotation.z = mood === "thinking" ? Math.sin(time * 4) * 0.25 : 0;
    body.rotation.y = mood === "celebrating" ? time * 4 : 0;
  });

  return { companion, position };
};

const StudioCompanionEye = ({ side }: { side: -1 | 1 }) => (
  <group position={[0.19 * side, 0.12, 0.44]}>
    <mesh scale={[1, 1.15, 0.6]}>
      <sphereGeometry args={[0.12, 20, 14]} />
      <meshPhysicalMaterial
        color={studioPalette.eyeWhite}
        roughness={0.15}
        clearcoat={1}
        clearcoatRoughness={0.05}
      />
    </mesh>
    <mesh position={[0.012 * side, -0.01, 0.06]} scale={[1, 1.1, 0.6]}>
      <sphereGeometry args={[0.07, 16, 12]} />
      <meshPhysicalMaterial
        color={studioPalette.pupil}
        roughness={0.08}
        clearcoat={1}
        clearcoatRoughness={0.02}
      />
    </mesh>
  </group>
);

const StudioCompanionEar = ({ side }: { side: -1 | 1 }) => (
  <mesh position={[0.3 * side, 0.52, -0.02]} rotation={[0, 0, -0.42 * side]}>
    <coneGeometry args={[0.15, 0.42, 24]} />
    <meshPhysicalMaterial
      color={studioPalette.companionEar}
      roughness={0.4}
      clearcoat={0.6}
      clearcoatRoughness={0.25}
    />
  </mesh>
);

export const StudioCompanion = ({ mood }: { mood: CompanionMood }) => {
  const { companion, position } = useCompanionMotion(mood);

  return (
    <group ref={companion} name="companion" position={position}>
      <mesh scale={[1, 0.94, 0.92]}>
        <sphereGeometry args={[0.55, 40, 28]} />
        <meshPhysicalMaterial
          color={studioPalette.companionBody}
          roughness={0.42}
          clearcoat={0.7}
          clearcoatRoughness={0.22}
          sheen={0.4}
          sheenColor={studioPalette.keyLight}
        />
      </mesh>
      <StudioCompanionEye side={-1} />
      <StudioCompanionEye side={1} />
      <StudioCompanionEar side={-1} />
      <StudioCompanionEar side={1} />
      <mesh position={[0, -0.08, 0.5]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.1, 0.022, 8, 20, Math.PI]} />
        <meshStandardMaterial color={studioPalette.pupil} roughness={0.5} />
      </mesh>
    </group>
  );
};

export const buildSparkleDirections = (): Vector3[] =>
  Array.from({ length: sparkleCount }, (_, index) => {
    const angle = (index / sparkleCount) * Math.PI * 2;
    return new Vector3(Math.cos(angle), Math.sin(angle), 0.3);
  });

export const useSparkleGeometry = () => {
  const geometry = useMemo(() => {
    const sparkleGeometry = new BufferGeometry();
    sparkleGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(sparkleCount * 3), 3),
    );
    return sparkleGeometry;
  }, []);
  useDisposedOnUnmount(geometry);
  return geometry;
};

const dropletVertexShader = `
uniform float pointSize;
uniform float pixelRatio;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = pointSize * pixelRatio / -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const dropletFragmentShader = `
uniform float opacity;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float reach = dot(point, point);
  if (reach > 1.0) {
    discard;
  }
  float glow = 1.0 - reach;
  gl_FragColor = vec4(vec3(0.85, 0.97, 1.0) * (0.6 + glow * 0.6), glow * opacity);
}
`;

const buildDropletUniforms = (pixelRatio: number) => ({
  pointSize: { value: 90 },
  pixelRatio: { value: pixelRatio },
  opacity: { value: 1 },
});

export const BubbleBurst = ({
  position,
  radius,
}: {
  position: [number, number, number];
  radius: number;
}) => {
  const droplets = useRef<Points>(null);
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const dropletMaterial = useRef<ShaderMaterial>(null);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const directions = useMemo(() => buildSparkleDirections(), []);
  const geometry = useSparkleGeometry();
  const dropletUniforms = useMemo(
    () => buildDropletUniforms(pixelRatio),
    [pixelRatio],
  );
  const age = useRef(0);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const life = Math.min(1, age.current / sparkleLifeSeconds);
    const fade = 1 - life;
    const isAlive = life < 1;
    if (droplets.current !== null) {
      droplets.current.visible = isAlive;
    }
    if (ring.current !== null && ringMaterial.current !== null) {
      ring.current.visible = isAlive;
      ring.current.scale.setScalar(1 + life * 0.9);
      ringMaterial.current.opacity = fade ** 2 * 0.85;
    }
    if (dropletMaterial.current !== null) {
      dropletMaterial.current.uniforms.opacity.value = fade;
    }
    const positions = geometry.getAttribute("position");
    const reach = radius * 0.9 + age.current * sparkleSpeed * 0.8;
    const fall = age.current ** 2 * 1.6;
    directions.forEach((direction, index) => {
      const spread = 0.75 + (index % 3) * 0.18;
      positions.setXYZ(
        index,
        position[0] + direction.x * reach * spread,
        position[1] + direction.y * reach * spread - fall,
        position[2] + direction.z * reach,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <>
      <mesh ref={ring} position={position}>
        <ringGeometry args={[radius * 0.92, radius, 64]} />
        <meshBasicMaterial
          ref={ringMaterial}
          color={studioPalette.filmTint}
          transparent
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <points ref={droplets} geometry={geometry}>
        <shaderMaterial
          ref={dropletMaterial}
          uniforms={dropletUniforms}
          vertexShader={dropletVertexShader}
          fragmentShader={dropletFragmentShader}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </>
  );
};

const studioBackdropVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const studioBackdropFragmentShader = `
uniform vec3 skyTop;
uniform vec3 skyBottom;
uniform vec3 glow;
varying vec2 vUv;

void main() {
  vec3 colour = mix(skyBottom, skyTop, smoothstep(0.15, 0.95, vUv.y));
  vec2 fromGlow = (vUv - vec2(0.5, 0.42)) * vec2(1.6, 1.0);
  float glowStrength = 1.0 - smoothstep(0.0, 0.42, length(fromGlow));
  colour += glow * glowStrength * glowStrength * 0.32;
  float vignette = smoothstep(0.95, 0.35, distance(vUv, vec2(0.5)));
  gl_FragColor = vec4(colour * mix(0.72, 1.0, vignette), 1.0);
}
`;

const buildStudioBackdropMaterial = () => {
  const [skyTop, skyBottom, glow] = buildPaletteUniform([
    studioPalette.skyTop,
    studioPalette.skyBottom,
    studioPalette.glow,
  ]);
  return new ShaderMaterial({
    uniforms: {
      skyTop: { value: skyTop },
      skyBottom: { value: skyBottom },
      glow: { value: glow },
    },
    vertexShader: studioBackdropVertexShader,
    fragmentShader: studioBackdropFragmentShader,
    depthWrite: false,
  });
};

interface AmbientBubble {
  x: number;
  startY: number;
  z: number;
  size: number;
  speed: number;
}

const goldenRatioFraction = 0.618034;

const buildAmbientBubbles = (): AmbientBubble[] =>
  Array.from({ length: ambientBubbleCount }, (_, index) => ({
    x: (((index * goldenRatioFraction) % 1) - 0.5) * 18,
    startY: ((index * (1 - goldenRatioFraction) * 3) % 1) * ambientBubbleRise,
    z: -2.5 - (index % 4) * 0.9,
    size: 0.12 + (index % 5) * 0.07,
    speed: 0.22 + (index % 3) * 0.11,
  }));

const AmbientBubbles = () => {
  const bubbles = useRef<InstancedMesh>(null);
  const layout = useMemo(() => buildAmbientBubbles(), []);
  const placer = useMemo(() => new Object3D(), []);
  const age = useRef(0);
  const [motionScale] = useState(getMotionScale);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const mesh = bubbles.current;
    if (mesh === null) {
      return;
    }
    layout.forEach(({ x, startY, z, size, speed }, index) => {
      const risen = (startY + age.current * speed) % ambientBubbleRise;
      placer.position.set(
        x + Math.sin(age.current * speed * 2 + index) * 0.2,
        risen - ambientBubbleRise / 2,
        z,
      );
      placer.scale.setScalar(size);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={bubbles}
      args={[undefined, ambientBubbleFilm, ambientBubbleCount]}
      frustumCulled={false}
    >
      <planeGeometry args={[2, 2]} />
    </instancedMesh>
  );
};

export const StudioBackdrop = () => {
  const material = useMemo(() => buildStudioBackdropMaterial(), []);
  useDisposedOnUnmount(material);

  return (
    <>
      <mesh position={[0, 0, -8]} material={material} renderOrder={-1}>
        <planeGeometry args={[60, 30]} />
      </mesh>
      <AmbientBubbles />
    </>
  );
};

export const StudioLights = () => (
  <>
    <hemisphereLight
      args={[studioPalette.hemisphereSky, studioPalette.hemisphereGround, 1.1]}
    />
    <directionalLight
      position={[3, 5, 4]}
      intensity={2.4}
      color={studioPalette.keyLight}
    />
    <directionalLight
      position={[-4, 2, -3]}
      intensity={1.6}
      color={studioPalette.rimLight}
    />
  </>
);

export const useChoicePositions = (
  choiceCount: number,
  gameType: QuestionGameType,
) => {
  const camera = useThree((state) => state.camera);
  return useMemo(
    () =>
      getChoicePositions(choiceCount, gameType).map((screenPosition) =>
        placeOnStage(camera, screenPosition),
      ),
    [camera, choiceCount, gameType],
  );
};

export const StudioReflections = ({
  intensity = 0.55,
}: {
  intensity?: number;
}) => {
  const getCanvasState = useThree((state) => state.get);

  useEffect(() => {
    const { gl: renderer, scene } = getCanvasState();
    const generator = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const reflections = generator.fromScene(room, 0.04);
    scene.environment = reflections.texture;
    scene.environmentIntensity = intensity;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = null;
      reflections.dispose();
    };
  }, [getCanvasState, intensity]);

  return null;
};

const tokenBob = 0.05;

const tokenGrowSeconds = 0.45;

export const promptGrowSeconds = 0.5;

export const useMotionScale = () => {
  const [motionScale] = useState(getMotionScale);
  return motionScale;
};

export const findGrowth = (
  ageSeconds: number,
  growSeconds: number,
  motionScale: number,
) =>
  motionScale === 0
    ? 1
    : easeOutBack(Math.min(1, Math.max(0, ageSeconds / growSeconds)));

export const usePromptPosition = (): [number, number, number] => {
  const camera = useThree((state) => state.camera);
  return useMemo(() => placeOnStage(camera, promptScreenPosition), [camera]);
};

export interface Placement {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
}

export const useDisposedMaterials = (materials: readonly ShaderMaterial[]) => {
  useEffect(
    () => () => {
      materials.forEach((material) => {
        material.dispose();
      });
    },
    [materials],
  );
};

export const usePlacedInstances = (placements: readonly Placement[]) => {
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

export interface ChoiceSlot {
  position: [number, number, number];
  radius: number;
  index: number;
}

export const useGrowingChoice = ({ position, index }: ChoiceSlot) => {
  const choice = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const body = choice.current;
    if (body === null) {
      return;
    }
    const growth = findGrowth(age.current, tokenGrowSeconds, motionScale);
    body.position.y =
      position[1] +
      Math.sin(age.current * 1.6 + index * 1.3) * tokenBob * motionScale;
    body.scale.setScalar(growth);
  });

  return { choice, age, motionScale };
};

export const usePromptGrowth = () => {
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
  });
  return { age, motionScale };
};
