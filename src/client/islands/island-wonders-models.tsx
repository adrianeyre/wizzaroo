import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import {
  DoubleSide,
  type BufferGeometry,
  type Group,
  type Mesh,
  type PointLight,
} from "three";
import { isMotionReduced } from "../reduced-motion.js";
import {
  useBuiltGeometry,
  useBuiltMaterial,
  useShaderClock,
  useWeatherUniforms,
} from "../world-map-hooks.js";
import { GrainedMaterial, InstancedModel } from "../world-map-scene.js";
import {
  buildFlowingWaterMaterial,
  surfaceGrains,
  waterFlows,
} from "../world-map-shaders.js";
import type { IslandAdventure } from "./island-adventures.js";
import {
  balloonHover,
  buildBalloonGeometry,
  buildCaveGlowGeometry,
  buildFallsPoolGeometry,
  buildFallsWaterGeometry,
  buildFlowerGeometry,
  buildWindmillSailsGeometry,
  buildWondersGeometry,
  findWonderTheme,
  groveSink,
  groveBuilders,
  placeIslandWonders,
  scatterFlowers,
  scatterGrove,
  windmillHub,
  type PlacedWonder,
  type WonderTheme,
} from "./island-wonders.js";

const sailTurnSpeed = 0.7;
const balloonBobSpeed = 0.5;

const StaticWonders = ({ adventure }: { adventure: IslandAdventure }) => {
  const geometry = useBuiltGeometry(
    useCallback(() => buildWondersGeometry(adventure), [adventure]),
  );
  return (
    <mesh name="island-wonders" geometry={geometry} castShadow receiveShadow>
      <GrainedMaterial grain={surfaceGrains.stone} />
    </mesh>
  );
};

const WindmillSails = ({ wonder }: { wonder: PlacedWonder }) => {
  const geometry = useBuiltGeometry(buildWindmillSailsGeometry);
  const sails = useRef<Mesh>(null);
  useFrame((_state, deltaSeconds) => {
    if (sails.current !== null && !isMotionReduced()) {
      sails.current.rotation.z += deltaSeconds * sailTurnSpeed;
    }
  });
  return (
    <group
      position={[wonder.centre.x, wonder.ground, wonder.centre.z]}
      rotation={[0, wonder.turn, 0]}
    >
      <mesh
        ref={sails}
        name="windmill-sails"
        geometry={geometry}
        position={windmillHub}
        castShadow
      >
        <GrainedMaterial grain={surfaceGrains.timber} />
      </mesh>
    </group>
  );
};

const Balloon = ({
  wonder,
  theme,
}: {
  wonder: PlacedWonder;
  theme: WonderTheme;
}) => {
  const geometry = useBuiltGeometry(
    useCallback(() => buildBalloonGeometry(theme), [theme]),
  );
  const balloon = useRef<Group>(null);
  const age = useRef(wonder.centre.x);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * (isMotionReduced() ? 0 : 1);
    const group = balloon.current;
    if (group === null) {
      return;
    }
    group.position.y =
      wonder.ground +
      balloonHover +
      Math.sin(age.current * balloonBobSpeed) * 0.8;
    group.rotation.y = age.current * 0.05;
  });
  return (
    <group
      ref={balloon}
      position={[
        wonder.centre.x,
        wonder.ground + balloonHover,
        wonder.centre.z,
      ]}
    >
      <mesh name="hot-air-balloon" geometry={geometry} castShadow>
        <GrainedMaterial grain={surfaceGrains.timber} />
      </mesh>
    </group>
  );
};

const WalkBehindFalls = ({ wonder }: { wonder: PlacedWonder }) => {
  const water = useBuiltGeometry(
    useCallback(() => buildFallsWaterGeometry(wonder), [wonder]),
  );
  const pool = useBuiltGeometry(
    useCallback(() => buildFallsPoolGeometry(wonder), [wonder]),
  );
  const weatherUniforms = useWeatherUniforms();
  const material = useBuiltMaterial(
    useCallback(() => {
      const flowing = buildFlowingWaterMaterial(
        waterFlows.waterfall,
        weatherUniforms,
      );
      flowing.side = DoubleSide;
      return flowing;
    }, [weatherUniforms]),
  );
  useShaderClock(material);
  return (
    <>
      <mesh
        name="walk-behind-falls"
        geometry={water}
        material={material}
        renderOrder={2}
      />
      <mesh name="falls-pool" geometry={pool} renderOrder={1}>
        <meshStandardMaterial
          color="#2a9db8"
          roughness={0.08}
          transparent
          opacity={0.82}
        />
      </mesh>
    </>
  );
};

const CaveCrystals = ({ wonder }: { wonder: PlacedWonder }) => {
  const geometry = useBuiltGeometry(
    useCallback(() => buildCaveGlowGeometry(wonder), [wonder]),
  );
  return (
    <mesh name="cave-crystals" geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        emissive="#f97316"
        emissiveIntensity={1.3}
        roughness={0.25}
      />
    </mesh>
  );
};

const WonderGrove = ({
  adventure,
  theme,
}: {
  adventure: IslandAdventure;
  theme: WonderTheme;
}) => {
  const trees = useMemo(() => scatterGrove(adventure), [adventure]);
  const flowers = useMemo(() => scatterFlowers(adventure), [adventure]);
  const buildFlowers = useCallback(
    (): BufferGeometry => buildFlowerGeometry(theme.flowers),
    [theme],
  );
  return (
    <>
      {trees.length === 0 ? null : (
        <InstancedModel
          name="wonder-grove"
          things={trees}
          buildGeometry={groveBuilders[theme.grove]}
          sink={groveSink}
        />
      )}
      {flowers.length === 0 ? null : (
        <InstancedModel
          name="wonder-flowers"
          things={flowers}
          buildGeometry={buildFlowers}
          sink={0.05}
          tintSpread={0.1}
        />
      )}
    </>
  );
};

export const IslandWonders = ({
  adventure,
}: {
  adventure: IslandAdventure;
}) => {
  const wonders = useMemo(() => placeIslandWonders(adventure), [adventure]);
  const theme = findWonderTheme(adventure.islandId);
  return (
    <group name="wonders">
      <StaticWonders adventure={adventure} />
      <WonderGrove adventure={adventure} theme={theme} />
      {wonders.map((wonder) => {
        const key = `${wonder.kind}-${String(wonder.position.x)}`;
        if (wonder.kind === "windmill") {
          return <WindmillSails key={key} wonder={wonder} />;
        }
        if (wonder.kind === "balloon") {
          return <Balloon key={key} wonder={wonder} theme={theme} />;
        }
        if (wonder.kind === "walk-behind-falls") {
          return <WalkBehindFalls key={key} wonder={wonder} />;
        }
        if (wonder.kind === "lantern-cave") {
          return <CaveCrystals key={key} wonder={wonder} />;
        }
        return null;
      })}
    </group>
  );
};

export const lanternLightIntensity = 9;

export const Lantern = ({
  lanternRef,
  lightRef,
}: {
  lanternRef: { current: Group | null };
  lightRef: { current: PointLight | null };
}) => (
  <group
    ref={lanternRef}
    name="lantern"
    position={[0.27, 0.36, 0.1]}
    visible={false}
  >
    <mesh position={[0, 0.2, 0]}>
      <torusGeometry args={[0.05, 0.012, 5, 10]} />
      <meshStandardMaterial color="#3f3f46" metalness={0.6} roughness={0.4} />
    </mesh>
    <mesh position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.055, 0.065, 0.13, 8]} />
      <meshStandardMaterial
        color="#fde68a"
        emissive="#fbbf24"
        emissiveIntensity={2.2}
        transparent
        opacity={0.9}
      />
    </mesh>
    <mesh position={[0, 0.145, 0]}>
      <coneGeometry args={[0.075, 0.06, 8]} />
      <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.4} />
    </mesh>
    <mesh position={[0, -0.01, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 0.025, 8]} />
      <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.4} />
    </mesh>
    <pointLight
      ref={lightRef}
      position={[0, 0.08, 0]}
      color="#ffc56b"
      intensity={0}
      distance={9}
      decay={1.3}
    />
  </group>
);
