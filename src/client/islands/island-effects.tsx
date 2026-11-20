import { useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type MeshStandardMaterial,
  type PointLight,
} from "three";
import {
  buildNewLandRiverGeometry,
  buildRibbonGeometry,
  buildWaterfallGeometry,
} from "../world-map-models.js";
import {
  useBuiltGeometry,
  useBuiltMaterial,
  useMotionScale,
  useShaderClock,
  useWeatherUniforms,
} from "../world-map-hooks.js";
import { buildFlowingWaterMaterial, waterFlows } from "../world-map-shaders.js";
import type { SkyLook } from "../world-map-sky.js";
import type { MapPoint } from "../world-map-terrain.js";
import type { WaterCourse, WaterPool } from "./island-landform.js";
import {
  buildFloatingRockGeometry,
  floatingRockPlaces,
} from "./starfall-isle.js";

type HeightFinder = (point: MapPoint) => number;

const ribbonVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const lavaFragmentShader = `
uniform float time;
varying vec2 vUv;
float hashAt(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}
float smoothNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 inCell = fract(point);
  vec2 eased = inCell * inCell * (3.0 - 2.0 * inCell);
  return mix(
    mix(hashAt(cell), hashAt(cell + vec2(1.0, 0.0)), eased.x),
    mix(hashAt(cell + vec2(0.0, 1.0)), hashAt(cell + vec2(1.0, 1.0)), eased.x),
    eased.y
  );
}
void main() {
  vec2 flowing = vec2(vUv.x * 3.0, vUv.y * 40.0 - time * 0.6);
  float crust = smoothNoise(flowing) * 0.6 + smoothNoise(flowing * 2.3 + 7.0) * 0.4;
  float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
  vec3 dark = vec3(0.24, 0.05, 0.02);
  vec3 hot = vec3(1.0, 0.33, 0.04);
  vec3 white = vec3(1.0, 0.82, 0.35);
  vec3 colour = mix(dark, hot, smoothstep(0.3, 0.6, crust) * smoothstep(0.0, 0.4, edge));
  colour = mix(colour, white, smoothstep(0.72, 0.9, crust) * edge);
  gl_FragColor = vec4(colour * 1.6, 1.0);
}
`;

const buildLavaMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: ribbonVertexShader,
    fragmentShader: lavaFragmentShader,
    toneMapped: false,
  });

const auroraFragmentShader = `
uniform float time;
uniform float strength;
varying vec2 vUv;
void main() {
  float curtain = 0.5 + 0.5 * sin(vUv.x * 38.0 + sin(vUv.x * 7.0 + time * 0.4) * 3.0 + time * 0.7);
  float rise = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
  vec3 green = vec3(0.25, 1.0, 0.6);
  vec3 violet = vec3(0.65, 0.35, 1.0);
  vec3 colour = mix(green, violet, smoothstep(0.35, 0.9, vUv.y));
  float glow = rise * (0.35 + 0.65 * curtain) * strength;
  gl_FragColor = vec4(colour * glow, glow);
}
`;

const buildAuroraMaterial = (strength: number): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: { time: { value: 0 }, strength: { value: strength } },
    vertexShader: ribbonVertexShader,
    fragmentShader: auroraFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: false,
  });

const courseLift = 0.1;

const IceCourse = ({ geometry }: { geometry: BufferGeometry }) => (
  <mesh geometry={geometry} receiveShadow renderOrder={2}>
    <meshStandardMaterial color="#c7ecf8" roughness={0.12} metalness={0.05} />
  </mesh>
);

const LavaCourse = ({ geometry }: { geometry: BufferGeometry }) => {
  const material = useBuiltMaterial(buildLavaMaterial);
  useShaderClock(material);
  return <mesh geometry={geometry} material={material} renderOrder={2} />;
};

const RiverCourse = ({ geometry }: { geometry: BufferGeometry }) => {
  const weatherUniforms = useWeatherUniforms();
  const material = useBuiltMaterial(
    useCallback(
      () => buildFlowingWaterMaterial(waterFlows.river, weatherUniforms),
      [weatherUniforms],
    ),
  );
  useShaderClock(material);
  return <mesh geometry={geometry} material={material} renderOrder={2} />;
};

export const WaterCourseRibbon = ({
  course,
  findHeight,
}: {
  course: WaterCourse;
  findHeight: HeightFinder;
}) => {
  const geometry = useBuiltGeometry(
    useCallback(
      () =>
        buildRibbonGeometry(
          course.course,
          120,
          () => course.halfWidth + 0.25,
          (point) => Math.max(0.02, findHeight(point) + courseLift),
        ),
      [course, findHeight],
    ),
  );
  return (
    <group name={course.name}>
      {course.kind === "ice" ? <IceCourse geometry={geometry} /> : null}
      {course.kind === "lava" ? <LavaCourse geometry={geometry} /> : null}
      {course.kind === "river" ? <RiverCourse geometry={geometry} /> : null}
    </group>
  );
};

export const NewLandRivers = ({
  rivers,
  findHeight,
}: {
  rivers: readonly (readonly MapPoint[])[];
  findHeight: HeightFinder;
}) => {
  const geometry = useBuiltGeometry(
    useCallback(
      () => buildNewLandRiverGeometry(rivers, findHeight),
      [rivers, findHeight],
    ),
  );
  return (
    <group name="new-land-rivers">
      <RiverCourse geometry={geometry} />
    </group>
  );
};

export const WaterPoolSurface = ({ pool }: { pool: WaterPool }) => (
  <mesh
    name={pool.name}
    position={[pool.centre.x, 0.05, pool.centre.z]}
    rotation={[-Math.PI / 2, 0, 0]}
    renderOrder={2}
  >
    <circleGeometry args={[pool.radius + 0.6, 32]} />
    <meshStandardMaterial
      color="#2aa6c4"
      roughness={0.1}
      transparent
      opacity={0.88}
    />
  </mesh>
);

export const IslandWaterfall = ({
  top,
  bottom,
  findHeight,
}: {
  top: MapPoint;
  bottom: MapPoint;
  findHeight: HeightFinder;
}) => {
  const topHeight = findHeight(top) + 0.05;
  const geometry = useBuiltGeometry(
    useCallback(
      () => buildWaterfallGeometry({ top, topHeight, bottom, findHeight }),
      [top, topHeight, bottom, findHeight],
    ),
  );
  const weatherUniforms = useWeatherUniforms();
  const material = useBuiltMaterial(
    useCallback(
      () => buildFlowingWaterMaterial(waterFlows.waterfall, weatherUniforms),
      [weatherUniforms],
    ),
  );
  useShaderClock(material);
  return (
    <mesh
      name="waterfall"
      geometry={geometry}
      material={material}
      renderOrder={2}
    />
  );
};

const buildAuroraGeometry = (): BufferGeometry => {
  const geometry = new PlaneGeometry(160, 40, 48, 1);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    positions.setZ(index, Math.sin(x * 0.04) * 14 + Math.cos(x * 0.09) * 5);
  }
  geometry.computeVertexNormals();
  return geometry;
};

export const Aurora = ({ look }: { look: SkyLook }) => {
  const geometry = useBuiltGeometry(buildAuroraGeometry);
  const strength = 0.35 + 0.65 * (1 - look.daylight);
  const material = useBuiltMaterial(
    useCallback(() => buildAuroraMaterial(strength), [strength]),
  );
  useShaderClock(material);
  return (
    <mesh
      name="aurora"
      geometry={geometry}
      material={material}
      position={[0, 24, -95]}
      rotation={[0.12, 0, 0]}
      renderOrder={-1}
      frustumCulled={false}
    />
  );
};

export const Comet = () => {
  const comet = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    if (comet.current !== null) {
      comet.current.position.x = -30 + Math.sin(age.current * 0.02) * 12;
    }
  });
  return (
    <group
      ref={comet}
      name="comet"
      position={[-30, 26, -100]}
      rotation={[0, 0, -0.3]}
    >
      <mesh>
        <sphereGeometry args={[2.2, 20, 12]} />
        <meshBasicMaterial color="#fffbe6" fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[3.4, 32, 20, 1, true]} />
        <meshBasicMaterial
          color="#9fd8ff"
          transparent
          opacity={0.45}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
          fog={false}
        />
      </mesh>
    </group>
  );
};

export const FloatingRocks = ({ findHeight }: { findHeight: HeightFinder }) => {
  const instances = useRef<InstancedMesh>(null);
  const geometry = useBuiltGeometry(buildFloatingRockGeometry);
  const age = useRef(0);
  const motionScale = useMotionScale();
  const placement = useMemo(() => new Object3D(), []);
  const grounds = useMemo(
    () => floatingRockPlaces.map((place) => Math.max(0, findHeight(place))),
    [findHeight],
  );
  const placeRocks = useCallback(
    (seconds: number) => {
      const mesh = instances.current;
      if (mesh === null) {
        return;
      }
      floatingRockPlaces.forEach(({ x, z, height, scale, turn }, rock) => {
        placement.position.set(
          x,
          grounds[rock] + height + Math.sin(seconds * 0.6 + rock) * 0.4,
          z,
        );
        placement.rotation.set(0, turn + seconds * 0.05, 0);
        placement.scale.setScalar(scale);
        placement.updateMatrix();
        mesh.setMatrixAt(rock, placement.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    },
    [grounds, placement],
  );
  useLayoutEffect(() => {
    placeRocks(0);
  }, [placeRocks]);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    placeRocks(age.current);
  });
  return (
    <instancedMesh
      ref={instances}
      name="floating-rocks"
      args={[geometry, undefined, floatingRockPlaces.length]}
      castShadow
    >
      <meshStandardMaterial vertexColors roughness={0.85} />
    </instancedMesh>
  );
};

const puffsPerVent = 4;
const steamRiseSeconds = 4;

export const SteamPlumes = ({
  vents,
  findHeight,
}: {
  vents: readonly MapPoint[];
  findHeight: HeightFinder;
}) => {
  const instances = useRef<InstancedMesh>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  const placement = useMemo(() => new Object3D(), []);
  const puffCount = vents.length * puffsPerVent;
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    vents.forEach((vent, ventIndex) => {
      const ground = Math.max(0, findHeight(vent));
      for (let puff = 0; puff < puffsPerVent; puff++) {
        const life =
          ((age.current +
            ((puff + ventIndex * 0.37) / puffsPerVent) * steamRiseSeconds) %
            steamRiseSeconds) /
          steamRiseSeconds;
        placement.position.set(
          vent.x + Math.sin(puff * 2.1 + life * 3) * 0.3,
          ground + 0.4 + life * 3.2,
          vent.z + Math.cos(puff * 1.3) * 0.25,
        );
        placement.scale.setScalar(0.25 + life * 0.9 * Math.sin(life * Math.PI));
        placement.updateMatrix();
        mesh.setMatrixAt(ventIndex * puffsPerVent + puff, placement.matrix);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={instances}
      name="steam"
      args={[undefined, undefined, puffCount]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[0.6, 1]} />
      <meshStandardMaterial
        color="#e7e2dc"
        roughness={1}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export const VolcanoCrater = ({
  position,
  findHeight,
}: {
  position: MapPoint;
  findHeight: HeightFinder;
}) => {
  const lava = useRef<MeshStandardMaterial>(null);
  const glow = useRef<PointLight>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  const lavaColour = useMemo(() => new Color("#ff5a12"), []);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const flicker =
      0.8 + 0.2 * Math.sin(age.current * 6) * Math.sin(age.current * 2.7);
    if (lava.current !== null) {
      lava.current.emissiveIntensity = 2.4 * flicker;
    }
    if (glow.current !== null) {
      glow.current.intensity = 18 * flicker;
    }
  });
  return (
    <group
      name="volcano-crater"
      position={[position.x, findHeight(position) + 0.15, position.z]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial
          ref={lava}
          color={lavaColour}
          emissive="#ff3a00"
          emissiveIntensity={2.4}
          roughness={0.6}
        />
      </mesh>
      <pointLight
        ref={glow}
        color="#ff7a2a"
        intensity={18}
        distance={14}
        position={[0, 1.5, 0]}
      />
    </group>
  );
};
