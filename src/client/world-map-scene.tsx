import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  Vector3,
  type Group,
  type PointLight,
  type Texture,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RegionOnMap } from "../curriculum/island-access.js";
import type {
  MapPosition,
  RegionLandmark,
  ThemePalette,
} from "../curriculum/world-map.js";
import {
  arenaTrophyHeight,
  buildAncientOakGeometry,
  buildArenaTrophyGeometry,
  buildBigTopGeometry,
  buildChallengeArenaGeometry,
  buildHourglassGeometry,
  buildEaselGeometry,
  buildEmbassyGeometry,
  buildWorkshopGeometry,
  buildGlobeBallGeometry,
  buildGlobeStandGeometry,
  globeCentreHeight,
  buildBandShellGeometry,
  buildBubbleMachineGeometry,
  buildCastleGeometry,
  buildCaveGeometry,
  buildCloudGeometry,
  buildCrystalGeometry,
  buildLighthouseGeometry,
  buildNewLandRiverGeometry,
  buildPadlockGeometry,
  buildRibbonGeometry,
  buildSailingBoatGeometry,
  buildStoneBridgeGeometry,
  buildTerrainSurface,
  buildWaterfallGeometry,
  fadeModelColours,
} from "./world-map-models.js";
import {
  findTerrainHeight,
  meadowNewLands,
  lighthousePosition,
  mountainLakePosition,
  riverCourse,
  volcanoPosition,
  type MapPoint,
  type ScatteredThing,
} from "./world-map-terrain.js";
import { buildSpireGeometry } from "./computing-lab-devices.js";
import {
  useBuiltGeometry,
  useBuiltMaterial,
  useMotionScale,
  useShaderClock,
  useWeatherUniforms,
} from "./world-map-hooks.js";
import {
  buildFlowingWaterMaterial,
  buildGrainedMaterial,
  buildRegionGlowMaterial,
  buildSeaDepthTexture,
  buildSeaMaterial,
  buildSkyMaterial,
  surfaceGrains,
  waterFlows,
  type SurfaceGrain,
} from "./world-map-shaders.js";
import { type SkyLook } from "./world-map-sky.js";
import {} from "./world-map-weather.js";
import { findRegionHeading, RegionHeading } from "./region-heading.js";

export type Position = [number, number, number];

export const terrainWidth = 224;
export const terrainDepth = 44;
export const terrainColumns = 358;
export const terrainRows = 110;
const pickingColumns = 224;
const pickingRows = 44;
const seaDepthColumns = 448;
const seaDepthRows = 176;
const regionReach = 9;
const regionGlowRadius = 5;
export const landmarkScale = 1.6;
export const clickSlopPixels = 6;
const seaSize = 1600;
const sunDistance = 70;
const shadowReach = 40;
const shadowMapSize = 2048;
export const hoverGlowColour = "#ffffff";
export const bridgeCrossing: MapPoint = { x: 3.4, z: 4.5 };
export const bridgeTurn = -0.35;
export const bridgeSpan = 4.2;
export const bridgeDeckHeight = 0.75;

export type GroundHeight = (point: MapPoint) => number;

export const GroundHeightContext =
  createContext<GroundHeight>(findTerrainHeight);

export const placeOnGround = (
  { x, z }: MapPoint,
  lift = 0,
  findHeight: GroundHeight = findTerrainHeight,
): Position => [x, Math.max(0, findHeight({ x, z })) + lift, z];

export const findNearestRegion = <Place extends { mapPosition: MapPoint }>(
  regions: readonly Place[],
  point: MapPoint,
): Place | undefined => {
  const nearest = regions
    .map((region) => ({
      region,
      distance: Math.hypot(
        region.mapPosition.x - point.x,
        region.mapPosition.z - point.z,
      ),
    }))
    .toSorted((first, second) => first.distance - second.distance)
    .at(0);
  return nearest !== undefined && nearest.distance <= regionReach
    ? nearest.region
    : undefined;
};

export const GrainedMaterial = ({ grain }: { grain: SurfaceGrain }) => {
  const weatherUniforms = useWeatherUniforms();
  const material = useBuiltMaterial(
    useCallback(
      () => buildGrainedMaterial(grain, weatherUniforms),
      [grain, weatherUniforms],
    ),
  );
  return <primitive object={material} attach="material" />;
};

export const findLightDirection = (look: SkyLook): Vector3 =>
  new Vector3(...look.lightDirection).normalize();

export const SkyDome = ({ look }: { look: SkyLook }) => {
  const { zenith, horizon, lightColour } = look;
  const [x, y, z] = look.lightDirection;
  const material = useBuiltMaterial(
    useCallback(
      () =>
        buildSkyMaterial(zenith, horizon, new Vector3(x, y, z), lightColour),
      [zenith, horizon, x, y, z, lightColour],
    ),
  );
  return (
    <mesh name="sky" material={material} renderOrder={-1}>
      <sphereGeometry args={[500, 32, 16]} />
    </mesh>
  );
};

const lightSceneFromSky = (
  scene: Scene,
  environment: Texture | null,
  intensity: number,
) => {
  scene.environment = environment;
  scene.environmentIntensity = intensity;
};

export const SkyLight = ({ look }: { look: SkyLook }) => {
  const renderer = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const { zenith, horizon, lightColour, daylight } = look;
  const [x, y, z] = look.lightDirection;
  useEffect(() => {
    const skyScene = new Scene();
    const skyMaterial = buildSkyMaterial(
      zenith,
      horizon,
      new Vector3(x, y, z),
      lightColour,
    );
    const skyGeometry = new SphereGeometry(10, 32, 16);
    skyScene.add(new Mesh(skyGeometry, skyMaterial));
    const generator = new PMREMGenerator(renderer);
    const environment = generator.fromScene(skyScene, 0.02);
    lightSceneFromSky(scene, environment.texture, 0.25 + 0.3 * daylight);
    skyGeometry.dispose();
    skyMaterial.dispose();
    generator.dispose();
    return () => {
      lightSceneFromSky(scene, null, 0);
      environment.dispose();
    };
  }, [renderer, scene, zenith, horizon, x, y, z, lightColour, daylight]);
  return null;
};

export const Sunlight = ({
  look,
  isEffectsOn,
  target,
  landScale = 1,
}: {
  look: SkyLook;
  isEffectsOn: boolean;
  target?: Object3D;
  landScale?: number;
}) => (
  <>
    <hemisphereLight
      args={[
        look.hemisphereSky,
        look.hemisphereGround,
        look.hemisphereIntensity,
      ]}
    />
    <directionalLight
      name="sun"
      {...(target === undefined ? {} : { target })}
      color={look.lightColour}
      intensity={look.lightIntensity}
      position={findLightDirection(look)
        .multiplyScalar(sunDistance * landScale)
        .toArray()}
      castShadow={isEffectsOn}
      shadow-mapSize={[shadowMapSize, shadowMapSize]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
      shadow-camera-left={-shadowReach * landScale}
      shadow-camera-right={shadowReach * landScale}
      shadow-camera-top={shadowReach * landScale}
      shadow-camera-bottom={-shadowReach * landScale}
      shadow-camera-near={1}
      shadow-camera-far={sunDistance * landScale * 2}
    />
  </>
);

export const buildTerrainPickingGeometry = (
  findHeight: GroundHeight = findTerrainHeight,
): BufferGeometry => {
  const geometry = new PlaneGeometry(
    terrainWidth,
    terrainDepth,
    pickingColumns,
    pickingRows,
  );
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    positions.setY(
      index,
      Math.max(
        0,
        findHeight({
          x: positions.getX(index),
          z: positions.getZ(index),
        }),
      ),
    );
  }
  geometry.computeBoundingSphere();
  return geometry;
};

const buildIslandOnePickingGeometry = (): BufferGeometry =>
  buildTerrainPickingGeometry();

export const Terrain = ({
  palette,
  seaPosition,
  landScale = 1,
  onPointChosen,
  onPointHovered,
}: {
  palette: ThemePalette;
  seaPosition: MapPosition;
  landScale?: number;
  onPointChosen: (point: MapPoint) => void;
  onPointHovered: (point: MapPoint | undefined) => void;
}) => {
  const surface = useBuiltGeometry(
    useCallback(
      () =>
        buildTerrainSurface(
          terrainWidth,
          terrainDepth,
          terrainColumns,
          terrainRows,
          palette.ground,
        ),
      [palette.ground],
    ),
  );
  const picking = useBuiltGeometry(buildIslandOnePickingGeometry);
  const findIslandPoint = ({ x, z }: Vector3): MapPoint => ({
    x: (x - seaPosition.x) / landScale,
    z: (z - seaPosition.z) / landScale,
  });
  return (
    <>
      <mesh
        name="terrain-surface"
        geometry={surface}
        receiveShadow
        castShadow
        raycast={() => undefined}
      >
        <GrainedMaterial grain={surfaceGrains.ground} />
      </mesh>
      <mesh
        name="terrain"
        geometry={picking}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.delta > clickSlopPixels) {
            return;
          }
          onPointChosen(findIslandPoint(event.point));
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          onPointHovered(findIslandPoint(event.point));
        }}
        onPointerOut={() => {
          onPointHovered(undefined);
        }}
      >
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
};

export const Sea = ({
  look,
  findHeight = findTerrainHeight,
  landScale = 1,
}: {
  look: SkyLook;
  findHeight?: (point: MapPoint) => number;
  landScale?: number;
}) => {
  const depthMap = useMemo(
    () =>
      buildSeaDepthTexture(
        terrainWidth,
        terrainDepth,
        seaDepthColumns,
        seaDepthRows,
        findHeight,
      ),
    [findHeight],
  );
  useEffect(
    () => () => {
      depthMap.dispose();
    },
    [depthMap],
  );
  const weatherUniforms = useWeatherUniforms();
  const { horizon, lightColour } = look;
  const [x, y, z] = look.lightDirection;
  const material = useBuiltMaterial(
    useCallback(
      () =>
        buildSeaMaterial(depthMap, {
          sunDirection: new Vector3(x, y, z),
          sunColour: lightColour,
          skyColour: horizon,
          weatherUniforms,
          terrainWidth: terrainWidth * landScale,
          terrainDepth: terrainDepth * landScale,
        }),
      [depthMap, horizon, lightColour, x, y, z, weatherUniforms, landScale],
    ),
  );
  useShaderClock(material);
  return (
    <mesh
      name="sea"
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[seaSize, seaSize]} />
    </mesh>
  );
};

const buildRiverGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildRibbonGeometry(
      riverCourse,
      96,
      (along) => 0.55 + along * 0.45,
      () => 0.02,
    ),
    buildNewLandRiverGeometry(meadowNewLands.rivers, findTerrainHeight),
  ]);

export const River = () => {
  const geometry = useBuiltGeometry(buildRiverGeometry);
  const weatherUniforms = useWeatherUniforms();
  const material = useBuiltMaterial(
    useCallback(
      () => buildFlowingWaterMaterial(waterFlows.river, weatherUniforms),
      [weatherUniforms],
    ),
  );
  useShaderClock(material);
  return (
    <mesh
      name="river"
      geometry={geometry}
      material={material}
      renderOrder={2}
    />
  );
};

interface InstancedModelProps {
  name: string;
  things: ScatteredThing[];
  buildGeometry: () => BufferGeometry;
  sink?: number;
  tintSpread?: number;
  grain?: SurfaceGrain;
  material?: ReactNode;
}

export const InstancedModel = ({
  name,
  things,
  buildGeometry,
  sink = 0,
  tintSpread = 0.25,
  grain = surfaceGrains.foliage,
  material,
}: InstancedModelProps) => {
  const instances = useRef<InstancedMesh>(null);
  const geometry = useBuiltGeometry(buildGeometry);
  useLayoutEffect(() => {
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    const placement = new Object3D();
    const tint = new Color();
    things.forEach((thing, index) => {
      placement.position.set(thing.x, thing.height - sink, thing.z);
      placement.rotation.set(0, thing.turn, 0);
      placement.scale.setScalar(thing.scale);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
      const shade =
        1 - tintSpread / 2 + (thing.turn / (Math.PI * 2)) * tintSpread;
      tint.setRGB(shade, shade * (0.97 + thing.scale * 0.04), shade);
      mesh.setColorAt(index, tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) {
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
  }, [things, sink, tintSpread]);
  return (
    <instancedMesh
      ref={instances}
      name={name}
      args={[geometry, undefined, things.length]}
      castShadow
      receiveShadow
    >
      {material ?? <GrainedMaterial grain={grain} />}
    </instancedMesh>
  );
};

const smokePuffCount = 7;
const smokeRiseSeconds = 6;

export const Volcano = () => {
  const [x, , z] = placeOnGround(volcanoPosition);
  const craterFloor = findTerrainHeight(volcanoPosition);
  const puffs = useRef<(Mesh | null)[]>([]);
  const lava = useRef<MeshStandardMaterial>(null);
  const glow = useRef<PointLight>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const flicker =
      0.8 + 0.2 * Math.sin(age.current * 7) * Math.sin(age.current * 3.1);
    if (lava.current !== null) {
      lava.current.emissiveIntensity = 2.2 * flicker;
    }
    if (glow.current !== null) {
      glow.current.intensity = 14 * flicker;
    }
    puffs.current.forEach((puff, index) => {
      if (puff === null) {
        return;
      }
      const life =
        ((age.current + (index / smokePuffCount) * smokeRiseSeconds) %
          smokeRiseSeconds) /
        smokeRiseSeconds;
      puff.position.set(
        Math.sin(index * 2.3 + life * 2) * 0.5 + life * 2.2,
        0.4 + life * 6,
        Math.cos(index * 1.7) * 0.4 + life * 0.8,
      );
      puff.scale.setScalar(0.5 + life * 1.8);
      if (puff.material instanceof MeshStandardMaterial) {
        puff.material.opacity = 0.75 * Math.sin(life * Math.PI);
      }
    });
  });
  return (
    <group name="volcano" position={[x, craterFloor, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <circleGeometry args={[0.95, 32]} />
        <meshStandardMaterial
          ref={lava}
          color="#ff6a1a"
          emissive="#ff4a0a"
          emissiveIntensity={2.2}
          roughness={0.6}
        />
      </mesh>
      <pointLight
        ref={glow}
        color="#ff7a2a"
        intensity={14}
        distance={9}
        position={[0, 1.2, 0]}
      />
      {Array.from({ length: smokePuffCount }, (_, index) => (
        <mesh
          key={index}
          ref={(puff) => {
            puffs.current[index] = puff;
          }}
        >
          <icosahedronGeometry args={[0.6, 2]} />
          <meshStandardMaterial
            color="#8d8a88"
            roughness={1}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

/** How much bigger the lighthouse is drawn than it is built. */
export const lighthouseScale = 1.3;

export const Lighthouse = ({ isDark }: { isDark: boolean }) => {
  const geometry = useBuiltGeometry(buildLighthouseGeometry);
  const beam = useRef<Group>(null);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    if (beam.current !== null) {
      beam.current.rotation.y += deltaSeconds * 0.9 * motionScale;
    }
  });
  return (
    <group
      name="lighthouse"
      position={placeOnGround(lighthousePosition)}
      scale={lighthouseScale}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <GrainedMaterial grain={surfaceGrains.stone} />
      </mesh>
      <mesh position={[0, 2.95, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.36, 16]} />
        <meshStandardMaterial
          color="#fff3b0"
          emissive="#ffd86b"
          emissiveIntensity={isDark ? 4 : 2.5}
        />
      </mesh>
      {isDark ? (
        <pointLight
          color="#ffd58a"
          intensity={10}
          distance={14}
          position={[0, 3.2, 0]}
        />
      ) : null}
      <group ref={beam} position={[0, 2.95, 0]}>
        <mesh position={[3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.9, 6, 24, 1, true]} />
          <meshBasicMaterial
            color="#fff1b8"
            transparent
            opacity={isDark ? 0.34 : 0.14}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};

export const sailingBoatLoop = { halfWidth: 132, halfDepth: 32 };
const sailingBoatTurnRate = 0.022;

export const findSailingBoatPlacement = (
  seconds: number,
): { x: number; z: number; heading: number } => {
  const angle = seconds * sailingBoatTurnRate;
  const { halfWidth, halfDepth } = sailingBoatLoop;
  return {
    x: Math.cos(angle) * halfWidth,
    z: Math.sin(angle) * halfDepth,
    heading: Math.atan2(
      -Math.sin(angle) * halfWidth,
      Math.cos(angle) * halfDepth,
    ),
  };
};

export const SailingBoat = () => {
  const geometry = useBuiltGeometry(buildSailingBoatGeometry);
  const boat = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    if (boat.current === null) {
      return;
    }
    const { x, z, heading } = findSailingBoatPlacement(age.current);
    boat.current.position.set(x, 0.02 + Math.sin(age.current * 1.6) * 0.05, z);
    boat.current.rotation.set(
      Math.sin(age.current * 1.3) * 0.05,
      heading,
      Math.sin(age.current * 1.1) * 0.08,
    );
  });
  return (
    <group ref={boat} name="sailing-boat" scale={1.4}>
      <mesh geometry={geometry} castShadow>
        <GrainedMaterial grain={surfaceGrains.timber} />
      </mesh>
    </group>
  );
};

const buildBridgeGeometry = (): BufferGeometry =>
  buildStoneBridgeGeometry(bridgeSpan, bridgeDeckHeight);

export const Bridge = () => {
  const geometry = useBuiltGeometry(buildBridgeGeometry);
  return (
    <mesh
      name="bridge"
      geometry={geometry}
      position={[bridgeCrossing.x, 0, bridgeCrossing.z]}
      rotation={[0, bridgeTurn, 0]}
      castShadow
      receiveShadow
    >
      <GrainedMaterial grain={surfaceGrains.stone} />
    </mesh>
  );
};

const cloudPlaces: { x: number; y: number; z: number; scale: number }[] = [
  { x: -34, y: 19, z: -22, scale: 2.2 },
  { x: 30, y: 21, z: -24, scale: 2.6 },
  { x: -40, y: 17, z: 10, scale: 1.8 },
  { x: 42, y: 18, z: 14, scale: 2.0 },
  { x: 5, y: 24, z: -34, scale: 3.0 },
  { x: -14, y: 22, z: -30, scale: 1.6 },
  { x: 18, y: 25, z: -32, scale: 2.4 },
  { x: -26, y: 23, z: -12, scale: 2.0 },
  { x: 36, y: 22, z: -6, scale: 2.2 },
  { x: -46, y: 20, z: -6, scale: 2.6 },
  { x: 48, y: 19, z: -18, scale: 2.4 },
  { x: -6, y: 26, z: -22, scale: 2.0 },
  { x: 24, y: 27, z: -14, scale: 1.8 },
  { x: -36, y: 21, z: 22, scale: 2.0 },
];

const buildSkyCloudGeometry = (): BufferGeometry => buildCloudGeometry();

export const Clouds = ({
  look,
  landScale = 1,
}: {
  look: SkyLook;
  landScale?: number;
}) => {
  const shownPlaces = cloudPlaces.slice(0, look.cloudCount);
  const driftSpeed = 0.03 + look.windStrength * 0.12;
  const geometry = useBuiltGeometry(buildSkyCloudGeometry);
  const instances = useRef<InstancedMesh>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    const placement = new Object3D();
    shownPlaces.forEach(({ x, y, z, scale }, index) => {
      placement.position.set(
        (x + Math.sin(age.current * driftSpeed + index) * 4) * landScale,
        y * landScale,
        z * landScale,
      );
      placement.scale.setScalar(scale * landScale);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={instances}
      name="clouds"
      key={shownPlaces.length}
      args={[geometry, undefined, shownPlaces.length]}
      castShadow
      frustumCulled={false}
    >
      <meshStandardMaterial
        vertexColors
        color={look.cloudShade}
        roughness={1}
        emissive={look.cloudShade}
        emissiveIntensity={0.18 * look.daylight}
        transparent
        opacity={0.94}
      />
    </instancedMesh>
  );
};

const waterfallSprayCount = 5;

export const Waterfall = ({ castle }: { castle: MapPoint }) => {
  const towardsLake = new Vector3(
    mountainLakePosition.x - castle.x,
    0,
    mountainLakePosition.z - castle.z,
  ).normalize();
  const topX = castle.x + towardsLake.x * 3.9;
  const topZ = castle.z + towardsLake.z * 3.9;
  const bottomX = mountainLakePosition.x - towardsLake.x * 0.8;
  const bottomZ = mountainLakePosition.z - towardsLake.z * 0.8;
  const topHeight = findTerrainHeight(castle) + 0.05;
  const geometry = useBuiltGeometry(
    useCallback(
      () =>
        buildWaterfallGeometry({
          top: { x: topX, z: topZ },
          topHeight,
          bottom: { x: bottomX, z: bottomZ },
        }),
      [topX, topZ, topHeight, bottomX, bottomZ],
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
  const spray = useRef<(Mesh | null)[]>([]);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    spray.current.forEach((puff, index) => {
      if (puff === null) {
        return;
      }
      const life = (age.current * 0.6 + index / waterfallSprayCount) % 1;
      puff.position.set(
        Math.sin(index * 2.1) * 0.5,
        0.15 + life * 0.9,
        Math.cos(index * 1.7) * 0.5,
      );
      puff.scale.setScalar(0.35 + life * 0.6);
      if (puff.material instanceof MeshStandardMaterial) {
        puff.material.opacity = 0.55 * (1 - life);
      }
    });
  });
  return (
    <group name="waterfall">
      <mesh geometry={geometry} material={material} renderOrder={2} />
      <group position={[bottomX, 0, bottomZ]}>
        {Array.from({ length: waterfallSprayCount }, (_, index) => (
          <mesh
            key={index}
            ref={(puff) => {
              spray.current[index] = puff;
            }}
          >
            <icosahedronGeometry args={[0.5, 2]} />
            <meshStandardMaterial
              color="#f4f8fb"
              roughness={1}
              transparent
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const buildLandmarkGeometry = (
  buildGeometry: () => BufferGeometry,
  isUnlocked: boolean,
): BufferGeometry => {
  const built = buildGeometry();
  if (isUnlocked) {
    return built;
  }
  const faded = fadeModelColours(built);
  built.dispose();
  return faded;
};

export const LandmarkModel = ({
  buildGeometry,
  isUnlocked,
  grain = surfaceGrains.stone,
}: {
  buildGeometry: () => BufferGeometry;
  isUnlocked: boolean;
  grain?: SurfaceGrain;
}) => {
  const geometry = useBuiltGeometry(
    useCallback(
      () => buildLandmarkGeometry(buildGeometry, isUnlocked),
      [buildGeometry, isUnlocked],
    ),
  );
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <GrainedMaterial grain={grain} />
    </mesh>
  );
};

const bubbleCount = 6;

const Bubbles = () => {
  const bubbles = useRef<InstancedMesh>(null);
  const placement = useMemo(() => new Object3D(), []);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const mesh = bubbles.current;
    if (mesh === null) {
      return;
    }
    for (let index = 0; index < bubbleCount; index++) {
      const life = (age.current * 0.18 + index / bubbleCount) % 1;
      placement.position.set(
        Math.sin(life * 9 + index) * 0.35 + (index % 3) * 0.2 - 0.2,
        1.35 + life * 3.2,
        -0.3 + Math.cos(life * 7 + index) * 0.3,
      );
      placement.scale.setScalar(
        (0.6 + (index % 3) * 0.25) * Math.min(1, life * 6) * (1 - life ** 8),
      );
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={bubbles}
      name="map-bubbles"
      args={[undefined, undefined, bubbleCount]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.3, 24, 12]} />
      <meshPhysicalMaterial
        color="#e8fbff"
        roughness={0.02}
        metalness={0}
        transparent
        opacity={0.38}
        iridescence={1}
        iridescenceIOR={1.35}
        iridescenceThicknessMinimum={150}
        iridescenceThicknessMaximum={650}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

const fireflyCount = 26;

const Fireflies = () => {
  const instances = useRef<InstancedMesh>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    const placement = new Object3D();
    for (let index = 0; index < fireflyCount; index++) {
      const drift = age.current * (0.3 + (index % 5) * 0.06) + index * 2.4;
      placement.position.set(
        Math.cos(drift) * (1.4 + (index % 4) * 0.4),
        0.6 + ((index * 0.37) % 2.4) + Math.sin(drift * 1.7) * 0.25,
        Math.sin(drift * 0.8) * (1.4 + (index % 3) * 0.5),
      );
      placement.scale.setScalar(0.6 + 0.4 * Math.sin(age.current * 4 + index));
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={instances}
      args={[undefined, undefined, fireflyCount]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.035, 6, 4]} />
      <meshBasicMaterial color="#e9ff8a" toneMapped={false} />
    </instancedMesh>
  );
};

const floatingMapNoteCount = 7;

const FloatingMapNotes = () => {
  const instances = useRef<InstancedMesh>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    const placement = new Object3D();
    for (let index = 0; index < floatingMapNoteCount; index++) {
      const life = (age.current * 0.16 + index / floatingMapNoteCount) % 1;
      const turn = life * 5 + index * 0.9;
      placement.position.set(
        Math.cos(turn) * (0.6 + life * 0.6),
        1.4 + life * 2.8,
        -0.2 + Math.sin(turn) * (0.4 + life * 0.4),
      );
      placement.scale.setScalar(
        Math.sin(life * Math.PI) * (0.8 + (index % 3) * 0.2),
      );
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={instances}
      args={[undefined, undefined, floatingMapNoteCount]}
      frustumCulled={false}
      name="floating-map-notes"
    >
      <sphereGeometry args={[0.09, 8, 6]} />
      <meshBasicMaterial color="#ffd86b" toneMapped={false} />
    </instancedMesh>
  );
};

/**
 * The model each of Meadow Isle's Region landmarks is built from, for
 * explore mode to work out what is solid (ADR 0061). Colour doesn't
 * matter there, so the castle is built in a plain one.
 */
export const mapLandmarkBuilders: Record<RegionLandmark, () => BufferGeometry> =
  {
    bubbles: buildBubbleMachineGeometry,
    forest: buildAncientOakGeometry,
    crystals: buildCaveGeometry,
    castle: () => buildCastleGeometry("#808080"),
    spire: buildSpireGeometry,
    music: buildBandShellGeometry,
    "big-top": buildBigTopGeometry,
    globe: buildGlobeStandGeometry,
    hourglass: buildHourglassGeometry,
    easel: buildEaselGeometry,
    workshop: buildWorkshopGeometry,
    embassy: buildEmbassyGeometry,
    "challenge-arena": buildChallengeArenaGeometry,
  };

const Landmark = ({
  landmark,
  isUnlocked,
  accent,
}: {
  landmark: RegionLandmark;
  isUnlocked: boolean;
  accent: string;
}) => {
  const buildCastle = useCallback(() => buildCastleGeometry(accent), [accent]);
  switch (landmark) {
    case "bubbles":
      return (
        <>
          <LandmarkModel
            buildGeometry={buildBubbleMachineGeometry}
            isUnlocked={isUnlocked}
            grain={surfaceGrains.metal}
          />
          {isUnlocked ? <Bubbles /> : null}
        </>
      );
    case "forest":
      return (
        <>
          <LandmarkModel
            buildGeometry={buildAncientOakGeometry}
            isUnlocked={isUnlocked}
            grain={surfaceGrains.foliage}
          />
          {isUnlocked ? <Fireflies /> : null}
        </>
      );
    case "crystals":
      return (
        <>
          <LandmarkModel
            buildGeometry={buildCaveGeometry}
            isUnlocked={isUnlocked}
          />
          <group position={[0, 0, 0.3]}>
            <LandmarkCrystals isUnlocked={isUnlocked} />
          </group>
        </>
      );
    case "castle":
      return (
        <LandmarkModel buildGeometry={buildCastle} isUnlocked={isUnlocked} />
      );
    case "spire":
      return (
        <>
          <LandmarkModel
            buildGeometry={buildSpireGeometry}
            isUnlocked={isUnlocked}
            grain={surfaceGrains.metal}
          />
          {isUnlocked ? <SpireBeacon /> : null}
        </>
      );
    case "music":
      return (
        <>
          <LandmarkModel
            buildGeometry={buildBandShellGeometry}
            isUnlocked={isUnlocked}
          />
          {isUnlocked ? <FloatingMapNotes /> : null}
        </>
      );
    case "big-top":
      return (
        <>
          <LandmarkModel
            buildGeometry={buildBigTopGeometry}
            isUnlocked={isUnlocked}
            grain={surfaceGrains.timber}
          />
          {isUnlocked ? <FloatingPuzzleBlocks /> : null}
        </>
      );
    case "challenge-arena":
      return (
        <>
          <LandmarkModel
            buildGeometry={buildChallengeArenaGeometry}
            isUnlocked={isUnlocked}
          />
          {isUnlocked ? <SpinningArenaTrophy /> : null}
        </>
      );
    case "hourglass":
      return (
        <>
          <LandmarkModel
            buildGeometry={buildHourglassGeometry}
            isUnlocked={isUnlocked}
          />
          {isUnlocked ? <FallingSand /> : null}
        </>
      );
    case "easel":
      return (
        <LandmarkModel
          buildGeometry={buildEaselGeometry}
          isUnlocked={isUnlocked}
          grain={surfaceGrains.timber}
        />
      );
    case "workshop":
      return (
        <LandmarkModel
          buildGeometry={buildWorkshopGeometry}
          isUnlocked={isUnlocked}
          grain={surfaceGrains.timber}
        />
      );
    case "embassy":
      return (
        <LandmarkModel
          buildGeometry={buildEmbassyGeometry}
          isUnlocked={isUnlocked}
          grain={surfaceGrains.stone}
        />
      );
    case "globe":
      return (
        <>
          <LandmarkModel
            buildGeometry={buildGlobeStandGeometry}
            isUnlocked={isUnlocked}
            grain={surfaceGrains.metal}
          />
          <SpinningGlobe isUnlocked={isUnlocked} />
        </>
      );
  }
};

const FallingSand = () => {
  const stream = useRef<Mesh>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    if (stream.current !== null) {
      stream.current.scale.x = 0.8 + Math.sin(age.current * 9) * 0.2;
    }
  });
  return (
    <mesh ref={stream} position={[0, 1.75, 0]} name="falling-sand">
      <cylinderGeometry args={[0.035, 0.035, 0.95, 6]} />
      <meshBasicMaterial color="#ffd36b" toneMapped={false} />
    </mesh>
  );
};

const SpireBeacon = () => {
  const beacon = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const body = beacon.current;
    if (body === null) {
      return;
    }
    body.rotation.y = age.current * 0.9;
    body.children.forEach((child, index) => {
      child.position.y = 0.25 * Math.sin(age.current * 1.6 + index * 2.1);
    });
  });
  return (
    <group position={[0, 4.5, 0]} name="spire-beacon">
      <mesh>
        <icosahedronGeometry args={[0.22, 2]} />
        <meshBasicMaterial color="#67e8f9" toneMapped={false} />
      </mesh>
      <group ref={beacon} position={[0, -1.6, 0]}>
        {[0, 1, 2].map((index) => (
          <mesh key={index} rotation={[Math.PI / 2 + index * 0.35, 0, 0]}>
            <torusGeometry args={[0.95 - index * 0.18, 0.025, 6, 32]} />
            <meshBasicMaterial
              color={index === 1 ? "#f0abfc" : "#22d3ee"}
              toneMapped={false}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const globeTilt = 0.41;

const SpinningGlobe = ({ isUnlocked }: { isUnlocked: boolean }) => {
  const globe = useRef<Mesh>(null);
  const motionScale = useMotionScale();
  const geometry = useBuiltGeometry(
    useCallback(
      () => buildLandmarkGeometry(buildGlobeBallGeometry, isUnlocked),
      [isUnlocked],
    ),
  );
  useFrame((_state, deltaSeconds) => {
    if (globe.current !== null && isUnlocked) {
      globe.current.rotation.y += deltaSeconds * 0.35 * motionScale;
    }
  });
  return (
    <group position={[0, globeCentreHeight, 0]} rotation={[0, 0, globeTilt]}>
      <mesh ref={globe} geometry={geometry} castShadow>
        <GrainedMaterial grain={surfaceGrains.metal} />
      </mesh>
    </group>
  );
};

const puzzleBlockCount = 5;
const puzzleBlockColours = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#ec4899",
  "#fbbf24",
];

export const FloatingPuzzleBlocks = () => {
  const instances = useRef<InstancedMesh>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  const placement = useMemo(() => new Object3D(), []);
  useEffect(() => {
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    puzzleBlockColours.forEach((colour, index) => {
      mesh.setColorAt(index, new Color(colour));
    });
    if (mesh.instanceColor !== null) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, []);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    for (let index = 0; index < puzzleBlockCount; index++) {
      const orbit =
        age.current * 0.5 + (index / puzzleBlockCount) * Math.PI * 2;
      placement.position.set(
        Math.cos(orbit) * 1.7,
        2.3 + Math.sin(age.current * 1.6 + index) * 0.25,
        Math.sin(orbit) * 1.7,
      );
      placement.rotation.set(age.current + index, age.current * 0.7, 0);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={instances}
      args={[undefined, undefined, puzzleBlockCount]}
      frustumCulled={false}
      castShadow
    >
      <boxGeometry args={[0.22, 0.22, 0.22]} />
      <meshStandardMaterial roughness={0.35} metalness={0.1} />
    </instancedMesh>
  );
};

export const SpinningArenaTrophy = () => {
  const trophy = useRef<Mesh>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  const geometry = useBuiltGeometry(buildArenaTrophyGeometry);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    if (trophy.current !== null) {
      trophy.current.rotation.y = age.current * 1.1;
      trophy.current.position.y =
        arenaTrophyHeight + Math.sin(age.current * 1.8) * 0.12;
    }
  });
  return (
    <mesh
      ref={trophy}
      geometry={geometry}
      position={[0, arenaTrophyHeight, 0]}
      name="arena-trophy"
      castShadow
    >
      <GrainedMaterial grain={surfaceGrains.metal} />
    </mesh>
  );
};

const LandmarkCrystals = ({ isUnlocked }: { isUnlocked: boolean }) => {
  const geometry = useBuiltGeometry(
    useCallback(
      () => buildLandmarkGeometry(buildCrystalGeometry, isUnlocked),
      [isUnlocked],
    ),
  );
  const glow = useRef<MeshStandardMaterial>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    if (glow.current !== null && isUnlocked) {
      glow.current.emissiveIntensity = 0.55 + 0.25 * Math.sin(age.current * 2);
    }
  });
  return (
    <>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          ref={glow}
          vertexColors
          roughness={0.12}
          metalness={0.15}
          emissive={isUnlocked ? "#7a3fe0" : "#000000"}
          emissiveIntensity={0.6}
          flatShading
        />
      </mesh>
      {isUnlocked ? (
        <pointLight
          color="#b07bff"
          intensity={8}
          distance={7}
          position={[0, 1.4, 0.6]}
        />
      ) : null}
    </>
  );
};

const buildPuffyCloudGeometry = (): BufferGeometry => buildCloudGeometry(3);

const lockedCoverHeight = 3.6;
const padlockOffset: Position = [0, -0.2, 2.1];
const cloudScale: Position = [1.35, 1.1, 1.2];

export const LockedCovers = ({
  lockedRegions,
  onRegionChosen,
  onRegionHovered,
}: {
  lockedRegions: readonly RegionOnMap[];
  onRegionChosen: (regionId: string) => void;
  onRegionHovered: (regionId: string | undefined) => void;
}) => {
  const cloud = useBuiltGeometry(buildPuffyCloudGeometry);
  const padlock = useBuiltGeometry(buildPadlockGeometry);
  const clouds = useRef<InstancedMesh>(null);
  const padlocks = useRef<InstancedMesh>(null);
  const placement = useMemo(() => new Object3D(), []);
  const age = useRef(0);
  const motionScale = useMotionScale();
  const findHeight = useContext(GroundHeightContext);

  useLayoutEffect(() => {
    const mesh = clouds.current;
    if (mesh === null) {
      return;
    }
    lockedRegions.forEach(({ mapPosition }, index) => {
      placement.position.set(
        ...placeOnGround(mapPosition, lockedCoverHeight, findHeight),
      );
      placement.rotation.set(0, 0, 0);
      placement.scale.set(...cloudScale);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    });
    mesh.count = lockedRegions.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [lockedRegions, placement, findHeight]);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    const mesh = padlocks.current;
    if (mesh === null) {
      return;
    }
    lockedRegions.forEach(({ mapPosition }, index) => {
      const [x, y, z] = placeOnGround(
        mapPosition,
        lockedCoverHeight,
        findHeight,
      );
      placement.position.set(
        x + padlockOffset[0],
        y + padlockOffset[1] + Math.sin(age.current * 1.6) * 0.12,
        z + padlockOffset[2],
      );
      placement.rotation.set(0, Math.sin(age.current * 0.8) * 0.35, 0);
      placement.scale.setScalar(1);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    });
    mesh.count = lockedRegions.length;
    mesh.instanceMatrix.needsUpdate = true;
  });

  const findRegionId = (instanceId: number | undefined) =>
    instanceId === undefined ? undefined : lockedRegions[instanceId]?.id;
  const handlers = {
    onClick: (event: ThreeEvent<MouseEvent>) => {
      const regionId = findRegionId(event.instanceId);
      if (event.delta > clickSlopPixels || regionId === undefined) {
        return;
      }
      event.stopPropagation();
      onRegionChosen(regionId);
    },
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onRegionHovered(findRegionId(event.instanceId));
    },
    onPointerOut: () => {
      onRegionHovered(undefined);
    },
  };

  return lockedRegions.length === 0 ? null : (
    <group name="locked-covers">
      <instancedMesh
        ref={clouds}
        args={[cloud, undefined, lockedRegions.length]}
        castShadow
        frustumCulled={false}
        {...handlers}
      >
        <meshStandardMaterial
          vertexColors
          roughness={1}
          emissive="#ffffff"
          emissiveIntensity={0.15}
          transparent
          opacity={0.95}
        />
      </instancedMesh>
      <instancedMesh
        ref={padlocks}
        args={[padlock, undefined, lockedRegions.length]}
        castShadow
        frustumCulled={false}
        {...handlers}
      >
        <meshStandardMaterial vertexColors metalness={0.85} roughness={0.28} />
      </instancedMesh>
    </group>
  );
};

const buildRegionGlowGeometry = (
  centre: MapPoint,
  findHeight: GroundHeight,
): BufferGeometry => {
  const geometry = new PlaneGeometry(
    regionGlowRadius * 2,
    regionGlowRadius * 2,
    48,
    48,
  );
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  const centreHeight = Math.max(0, findHeight(centre));
  for (let index = 0; index < positions.count; index++) {
    const ground = Math.max(
      0,
      findHeight({
        x: centre.x + positions.getX(index),
        z: centre.z + positions.getZ(index),
      }),
    );
    positions.setY(index, ground - centreHeight + 0.1);
  }
  return geometry;
};

export const RegionGlow = ({
  x,
  z,
  colour,
  strength,
  findHeight: givenHeight,
}: MapPoint & {
  colour: string;
  strength: number;
  findHeight?: GroundHeight;
}) => {
  const contextHeight = useContext(GroundHeightContext);
  const findHeight = givenHeight ?? contextHeight;
  const geometry = useBuiltGeometry(
    useCallback(
      () => buildRegionGlowGeometry({ x, z }, findHeight),
      [x, z, findHeight],
    ),
  );
  const material = useBuiltMaterial(
    useCallback(
      () => buildRegionGlowMaterial(colour, strength),
      [colour, strength],
    ),
  );
  useShaderClock(material);
  return (
    <mesh
      geometry={geometry}
      material={material}
      renderOrder={3}
      raycast={() => undefined}
    />
  );
};

export const RegionPlace = ({
  region,
  accent,
  isSelected,
  isHovered,
  onRegionChosen,
  onRegionHovered,
}: {
  region: RegionOnMap;
  accent: string;
  isSelected: boolean;
  isHovered: boolean;
  onRegionChosen: (regionId: string) => void;
  onRegionHovered: (regionId: string | undefined) => void;
}) => {
  const findHeight = useContext(GroundHeightContext);
  const heading = findRegionHeading(region);
  return (
    <group
      name={`region-${region.id}`}
      position={placeOnGround(region.mapPosition, 0, findHeight)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (event.delta > clickSlopPixels) {
          return;
        }
        event.stopPropagation();
        onRegionChosen(region.id);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onRegionHovered(region.id);
      }}
      onPointerOut={() => {
        onRegionHovered(undefined);
      }}
    >
      {isHovered || isSelected ? (
        <group name={isHovered ? `hover-glow-${region.id}` : undefined}>
          <RegionGlow
            x={region.mapPosition.x}
            z={region.mapPosition.z}
            colour={isHovered ? hoverGlowColour : accent}
            strength={isHovered ? 1.1 : 0.6}
          />
        </group>
      ) : null}
      <group scale={landmarkScale}>
        <Landmark
          landmark={region.landmark}
          isUnlocked={region.isUnlocked}
          accent={accent}
        />
      </group>
      {region.isUnlocked ? null : <group name={`padlock-${region.id}`} />}
      {heading === undefined ? null : (
        <RegionHeading regionId={region.id} text={heading} accent={accent} />
      )}
    </group>
  );
};

export const SelectionMarker = ({
  position,
  colour,
}: {
  position: Position;
  colour: string;
}) => {
  const marker = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    if (marker.current !== null) {
      marker.current.position.y =
        position[1] + 7 + Math.sin(age.current * 2.2) * 0.35;
      marker.current.rotation.y = age.current * 1.2;
    }
  });

  return (
    <group
      ref={marker}
      name="selection-marker"
      position={[position[0], position[1] + 7, position[2]]}
    >
      <mesh scale={[0.6, 1, 0.6]} castShadow>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color={colour}
          emissive={colour}
          emissiveIntensity={0.45}
          metalness={0.3}
          roughness={0.2}
          flatShading
        />
      </mesh>
    </group>
  );
};
