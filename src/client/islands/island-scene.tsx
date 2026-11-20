import type { ThreeEvent } from "@react-three/fiber";
import { listAttractionKeepClearPlaces } from "./island-attractions.js";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Object3D, type BufferGeometry, type InstancedMesh } from "three";
import {
  sharedSubjectLandmarks,
  type Island,
  type IslandRegion,
  type IslandRegionLandmark,
} from "../../curriculum/islands.js";
import { findRegionHeading, RegionHeading } from "../region-heading.js";
import {
  buildBigTopGeometry,
  buildChallengeArenaGeometry,
  buildEaselGeometry,
  buildEmbassyGeometry,
  buildLandSurface,
  buildWorkshopGeometry,
} from "../world-map-models.js";
import {
  useBuiltGeometry,
  WeatherUniformsContext,
} from "../world-map-hooks.js";
import {
  clickSlopPixels,
  Clouds,
  FloatingPuzzleBlocks,
  findLightDirection,
  findNearestRegion,
  GrainedMaterial,
  hoverGlowColour,
  InstancedModel,
  landmarkScale,
  LandmarkModel,
  placeOnGround,
  RegionGlow,
  Sea,
  SelectionMarker,
  SpinningArenaTrophy,
  SkyDome,
  Sunlight,
  terrainColumns,
  terrainDepth,
  terrainRows,
  terrainWidth,
  buildTerrainPickingGeometry,
} from "../world-map-scene.js";
import { buildWeatherUniforms, surfaceGrains } from "../world-map-shaders.js";
import type { SkyLook, TimeOfDay, Weather } from "../world-map-sky.js";
import {
  isClearOfProps,
  mirrorOntoFarReaches,
  mirrorOntoNewLands,
  type MapPoint,
} from "../world-map-terrain.js";
import {
  Lightning,
  Moon,
  Precipitation,
  Stars,
  WeatherClock,
} from "../world-map-weather.js";
import {
  emberIsle,
  emberLandmarks,
  emberVolcanoPosition,
  steamVentPositions,
} from "./ember-isle.js";
import { frostIsle, frostLandmarks } from "./frost-isle.js";
import {
  Aurora,
  Comet,
  FloatingRocks,
  IslandWaterfall,
  NewLandRivers,
  SteamPlumes,
  VolcanoCrater,
  WaterCourseRibbon,
  WaterPoolSurface,
} from "./island-effects.js";
import {
  newLandCopySuffix,
  type IslandFeature,
  type IslandLandform,
  type IslandOwnLandmark,
  type IslandScatter,
  type RegionLandmarkDesign,
  type SharedSubjectLandmark,
} from "./island-landform.js";
import {
  findDistanceToTrail,
  findIslandAdventure,
  listAdventurePlaces,
} from "./island-adventures.js";
import { buildIslandSkyLook } from "./island-sky.js";
import { listTransportPlaces } from "./island-transport.js";
import {
  fallsBottom,
  fallsTop,
  jungleLandmarks,
  jungleReach,
} from "./jungle-reach.js";
import { starfallIsle, starfallLandmarks } from "./starfall-isle.js";
import { sandsLandmarks, sunscorchSands } from "./sunscorch-sands.js";

type HeightFinder = (point: MapPoint) => number;

interface IslandDesign {
  landform: IslandLandform;
  renderSkyEffects: (look: SkyLook) => ReactNode;
}

const islandDesigns = new Map<string, IslandDesign>([
  [
    "frost-isle",
    {
      landform: frostIsle,
      renderSkyEffects: (look) => <Aurora look={look} />,
    },
  ],
  [
    "sunscorch-sands",
    { landform: sunscorchSands, renderSkyEffects: () => null },
  ],
  [
    "jungle-reach",
    {
      landform: jungleReach,
      renderSkyEffects: () => (
        <IslandWaterfall
          top={fallsTop}
          bottom={fallsBottom}
          findHeight={jungleReach.findHeight}
        />
      ),
    },
  ],
  [
    "ember-isle",
    {
      landform: emberIsle,
      renderSkyEffects: () => (
        <>
          <VolcanoCrater
            position={emberVolcanoPosition}
            findHeight={emberIsle.findHeight}
          />
          <SteamPlumes
            vents={steamVentPositions}
            findHeight={emberIsle.findHeight}
          />
        </>
      ),
    },
  ],
  [
    "starfall-isle",
    {
      landform: starfallIsle,
      renderSkyEffects: () => (
        <>
          <Comet />
          <FloatingRocks findHeight={starfallIsle.findHeight} />
        </>
      ),
    },
  ],
]);

export const hasIslandDesign = (islandId: string): boolean =>
  islandDesigns.has(islandId);

export class IslandWithoutDesignError extends Error {
  override name = "IslandWithoutDesignError";
}

export const findIslandDesign = (islandId: string): IslandDesign => {
  const design = islandDesigns.get(islandId);
  if (design === undefined) {
    throw new IslandWithoutDesignError(
      `Island "${islandId}" has no landscape to draw`,
    );
  }
  return design;
};

const newLandClearance = 3;
const newLandTrailClearance = 0.6;
const newLandWaterClearance = 1.2;

export const listIslandScatters = (island: Island): IslandScatter[] => {
  const { landform } = findIslandDesign(island.id);
  const adventure = findIslandAdventure(island.id);
  const keepClearOf = [
    ...island.regions.map(({ mapPosition }) => mapPosition),
    ...landform.features.map(({ position }) => position),
  ];
  const propPlaces = [
    ...listAdventurePlaces(adventure),
    adventure.start,
    ...listTransportPlaces(island.id),
    ...listAttractionKeepClearPlaces(island.id),
  ];
  const isClearForNewLand = (point: MapPoint) =>
    landform.findDistanceToWater(point) > newLandWaterClearance &&
    findDistanceToTrail(adventure, point) > newLandTrailClearance &&
    isClearOfProps(point, propPlaces) &&
    keepClearOf.every(
      (place) =>
        Math.hypot(point.x - place.x, point.z - place.z) > newLandClearance,
    );
  return landform.listScatters(keepClearOf, propPlaces).map((scatter) => ({
    ...scatter,
    things: [
      ...scatter.things,
      ...mirrorOntoNewLands(scatter.things, {
        keepEvery: 1,
        findHeight: landform.findHeight,
        isClear: isClearForNewLand,
      }),
      ...mirrorOntoFarReaches(scatter.things, {
        keepEvery: 2,
        findHeight: landform.findHeight,
        isClear: isClearForNewLand,
      }),
    ],
  }));
};

const regionLandmarkDesigns: Record<IslandOwnLandmark, RegionLandmarkDesign> = {
  ...frostLandmarks,
  ...sandsLandmarks,
  ...jungleLandmarks,
  ...emberLandmarks,
  ...starfallLandmarks,
};

const sharedSubjectLandmarkDesigns: Record<
  SharedSubjectLandmark,
  RegionLandmarkDesign
> = {
  easel: { buildGeometry: buildEaselGeometry, grain: "timber" },
  workshop: { buildGeometry: buildWorkshopGeometry, grain: "timber" },
  embassy: { buildGeometry: buildEmbassyGeometry, grain: "stone" },
};

const isSharedSubjectLandmark = (
  landmark: IslandRegionLandmark,
): landmark is SharedSubjectLandmark =>
  sharedSubjectLandmarks.includes(landmark);

const IslandTerrain = ({
  landform,
  origin,
  landScale,
  onPointChosen,
  onPointHovered,
}: {
  landform: IslandLandform;
  origin: MapPoint;
  landScale: number;
  onPointChosen: (point: MapPoint) => void;
  onPointHovered: (point: MapPoint | undefined) => void;
}) => {
  const surface = useBuiltGeometry(
    useCallback(
      () =>
        buildLandSurface(
          {
            width: terrainWidth,
            depth: terrainDepth,
            columns: terrainColumns,
            rows: terrainRows,
          },
          landform.findHeight,
          landform.paintGround,
        ),
      [landform],
    ),
  );
  const picking = useBuiltGeometry(
    useCallback(
      () => buildTerrainPickingGeometry(landform.findHeight),
      [landform],
    ),
  );
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
          onPointChosen({
            x: (event.point.x - origin.x) / landScale,
            z: (event.point.z - origin.z) / landScale,
          });
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          onPointHovered({
            x: (event.point.x - origin.x) / landScale,
            z: (event.point.z - origin.z) / landScale,
          });
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

const ScatteredModels = ({ scatter }: { scatter: IslandScatter }) => (
  <InstancedModel
    name={scatter.name}
    things={scatter.things}
    buildGeometry={scatter.buildGeometry}
    sink={scatter.sink}
    tintSpread={scatter.tintSpread}
    grain={surfaceGrains[scatter.grain]}
    material={
      scatter.glow === undefined ? undefined : (
        <meshStandardMaterial
          vertexColors
          emissive={scatter.glow}
          emissiveIntensity={0.9}
          roughness={0.25}
          metalness={0.1}
        />
      )
    }
  />
);

export const groupFeaturesByModel = (
  features: readonly IslandFeature[],
): IslandFeature[][] => {
  const groups = new Map<string, IslandFeature[]>();
  features.forEach((feature) => {
    const [original] = feature.name.split(newLandCopySuffix);
    groups.set(original, [...(groups.get(original) ?? []), feature]);
  });
  return [...groups.values()];
};

const InstancedFeatureModels = ({
  features,
  findHeight,
}: {
  features: readonly IslandFeature[];
  findHeight: HeightFinder;
}) => {
  const [{ name, buildGeometry, grain }] = features;
  const geometry = useBuiltGeometry(buildGeometry);
  const instances = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    const placement = new Object3D();
    features.forEach((feature, index) => {
      placement.position.set(
        ...placeOnGround(feature.position, feature.lift, findHeight),
      );
      placement.rotation.set(0, feature.turn ?? 0, 0);
      placement.scale.setScalar(feature.scale ?? 1);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [features, findHeight]);
  return (
    <instancedMesh
      ref={instances}
      name={name}
      args={[geometry, undefined, features.length]}
      castShadow
      receiveShadow
    >
      <GrainedMaterial grain={surfaceGrains[grain]} />
    </instancedMesh>
  );
};

const IslandFeatureModel = ({
  feature,
  findHeight,
}: {
  feature: IslandFeature;
  findHeight: HeightFinder;
}) => {
  const geometry = useBuiltGeometry(feature.buildGeometry);
  return (
    <mesh
      name={feature.name}
      geometry={geometry}
      position={placeOnGround(feature.position, feature.lift, findHeight)}
      rotation={[0, feature.turn ?? 0, 0]}
      scale={feature.scale ?? 1}
      castShadow
      receiveShadow
    >
      <GrainedMaterial grain={surfaceGrains[feature.grain]} />
    </mesh>
  );
};

const buildBigTop = (): BufferGeometry => buildBigTopGeometry();

/** The model an Island's Region landmark is built from, for explore mode to work out what is solid (ADR 0061). */
export const buildIslandLandmarkGeometry = (
  landmark: IslandRegionLandmark,
): BufferGeometry => {
  if (landmark === "big-top") {
    return buildBigTop();
  }
  if (landmark === "challenge-arena") {
    return buildChallengeArenaGeometry();
  }
  if (isSharedSubjectLandmark(landmark)) {
    return sharedSubjectLandmarkDesigns[landmark].buildGeometry();
  }
  return regionLandmarkDesigns[landmark].buildGeometry();
};

const IslandLandmark = ({ landmark }: { landmark: IslandRegionLandmark }) => {
  if (landmark === "big-top") {
    return (
      <>
        <LandmarkModel
          buildGeometry={buildBigTop}
          isUnlocked
          grain={surfaceGrains.timber}
        />
        <FloatingPuzzleBlocks />
      </>
    );
  }
  if (landmark === "challenge-arena") {
    return (
      <>
        <LandmarkModel buildGeometry={buildChallengeArenaGeometry} isUnlocked />
        <SpinningArenaTrophy />
      </>
    );
  }
  if (isSharedSubjectLandmark(landmark)) {
    const { buildGeometry, grain } = sharedSubjectLandmarkDesigns[landmark];
    return (
      <LandmarkModel
        buildGeometry={buildGeometry}
        isUnlocked
        grain={surfaceGrains[grain]}
      />
    );
  }
  const { buildGeometry, grain } = regionLandmarkDesigns[landmark];
  return (
    <LandmarkModel
      buildGeometry={buildGeometry}
      isUnlocked
      grain={surfaceGrains[grain]}
    />
  );
};

const IslandRegionPlace = ({
  region,
  accent,
  findHeight,
  isUnlocked,
  isSelected,
  isHovered,
  onRegionChosen,
  onRegionHovered,
}: {
  region: IslandRegion;
  accent: string;
  findHeight: HeightFinder;
  isUnlocked: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onRegionChosen: (regionId: string) => void;
  onRegionHovered: (regionId: string | undefined) => void;
}) => {
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
            findHeight={findHeight}
          />
        </group>
      ) : null}
      <group name={`landmark-${region.landmark}`} scale={landmarkScale}>
        <IslandLandmark landmark={region.landmark} />
      </group>
      {isUnlocked ? null : <group name={`padlock-${region.id}`} />}
      {heading === undefined ? null : (
        <RegionHeading regionId={region.id} text={heading} accent={accent} />
      )}
    </group>
  );
};

export const findIslandHeight = (islandId: string): HeightFinder =>
  findIslandDesign(islandId).landform.findHeight;

export interface IslandLandProps {
  island: Island;
  look: SkyLook;
  origin?: MapPoint;
  landScale?: number;
  lockedRegionIds?: readonly string[];
  selectedRegionId: string | undefined;
  hoveredRegionId: string | undefined;
  onRegionChosen: (regionId: string) => void;
  onRegionHovered: (regionId: string | undefined) => void;
}

// The land of one of Islands 2 to 6, drawn under a sky and over a sea that
// whoever places it provides: on its own, or in the World Map's sea.
export const IslandLand = ({
  island,
  look,
  origin = { x: 0, z: 0 },
  landScale = 1,
  lockedRegionIds = [],
  selectedRegionId,
  hoveredRegionId,
  onRegionChosen,
  onRegionHovered,
}: IslandLandProps) => {
  const { landform, renderSkyEffects } = findIslandDesign(island.id);
  const { palette } = island.theme;
  const scatters = useMemo(() => listIslandScatters(island), [island]);
  const selectedRegion = island.regions.find(
    ({ id }) => id === selectedRegionId,
  );
  const onPointHovered = (point: MapPoint | undefined) => {
    const nearest =
      point === undefined
        ? undefined
        : findNearestRegion(island.regions, point);
    onRegionHovered(nearest?.id);
  };

  return (
    <>
      <IslandTerrain
        landform={landform}
        origin={origin}
        landScale={landScale}
        onPointChosen={(point) => {
          const nearest = findNearestRegion(island.regions, point);
          if (nearest !== undefined) {
            onRegionChosen(nearest.id);
          }
        }}
        onPointHovered={onPointHovered}
      />
      {landform.waterCourses.map((course) => (
        <WaterCourseRibbon
          key={course.name}
          course={course}
          findHeight={landform.findHeight}
        />
      ))}
      <NewLandRivers
        rivers={landform.newLands.rivers}
        findHeight={landform.findHeight}
      />
      {landform.pools.map((pool) => (
        <WaterPoolSurface key={pool.name} pool={pool} />
      ))}
      {scatters.map((scatter) => (
        <ScatteredModels key={scatter.name} scatter={scatter} />
      ))}
      {groupFeaturesByModel(landform.features).map((features) =>
        features.length === 1 ? (
          <IslandFeatureModel
            key={features[0].name}
            feature={features[0]}
            findHeight={landform.findHeight}
          />
        ) : (
          <InstancedFeatureModels
            key={features[0].name}
            features={features}
            findHeight={landform.findHeight}
          />
        ),
      )}
      {renderSkyEffects(look)}
      {island.regions.map((region) => (
        <IslandRegionPlace
          key={region.id}
          region={region}
          accent={palette.accent}
          findHeight={landform.findHeight}
          isUnlocked={!lockedRegionIds.includes(region.id)}
          isSelected={region.id === selectedRegionId}
          isHovered={region.id === hoveredRegionId}
          onRegionChosen={onRegionChosen}
          onRegionHovered={onRegionHovered}
        />
      ))}
      {selectedRegion === undefined ? null : (
        <SelectionMarker
          position={placeOnGround(
            selectedRegion.mapPosition,
            0,
            landform.findHeight,
          )}
          colour={palette.accent}
        />
      )}
    </>
  );
};

export interface IslandSceneProps {
  island: Island;
  selectedRegionId: string | undefined;
  hoveredRegionId: string | undefined;
  onRegionChosen: (regionId: string) => void;
  onRegionHovered: (regionId: string | undefined) => void;
  isEffectsOn?: boolean;
  timeOfDay?: TimeOfDay;
  weather?: Weather;
}

export const IslandScene = ({
  island,
  selectedRegionId,
  hoveredRegionId,
  onRegionChosen,
  onRegionHovered,
  isEffectsOn = true,
  timeOfDay = "day",
  weather = "clear",
}: IslandSceneProps) => {
  const { landform } = findIslandDesign(island.id);
  const look = buildIslandSkyLook(
    island.sky,
    timeOfDay,
    weather,
    island.theme.palette,
  );
  const weatherUniforms = useMemo(() => buildWeatherUniforms(), []);

  return (
    <WeatherUniformsContext value={weatherUniforms}>
      <WeatherClock look={look} />
      <color attach="background" args={[look.horizon]} />
      <fog attach="fog" args={[look.horizon, look.fogStart, look.fogEnd]} />
      <SkyDome look={look} />
      {look.isStarry ? <Stars /> : null}
      {look.isMoonlit ? <Moon direction={findLightDirection(look)} /> : null}
      <Sunlight look={look} isEffectsOn={isEffectsOn} />
      {look.hasLightning ? <Lightning /> : null}
      <Sea look={look} findHeight={landform.findHeight} />
      <IslandLand
        island={island}
        look={look}
        selectedRegionId={selectedRegionId}
        hoveredRegionId={hoveredRegionId}
        onRegionChosen={onRegionChosen}
        onRegionHovered={onRegionHovered}
      />
      {isEffectsOn ? <Clouds look={look} /> : null}
      {isEffectsOn ? <Precipitation look={look} /> : null}
    </WeatherUniformsContext>
  );
};
