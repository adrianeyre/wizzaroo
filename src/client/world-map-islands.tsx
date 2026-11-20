import { listAttractionKeepClearPlaces } from "./islands/island-attractions.js";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  Object3D,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type InstancedMesh,
} from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import type { IslandOnMap, RegionOnMap } from "../curriculum/island-access.js";
import { islands as drawnIslands } from "../curriculum/islands.js";
import {
  mapHalfDepth,
  mapHalfWidth,
  type MapPosition,
} from "../curriculum/world-map.js";
import {
  exploreScale,
  findDistanceToTrail,
  findIslandAdventure,
  hasIslandAdventure,
  listAdventurePlaces,
} from "./islands/island-adventures.js";
import { IslandDock } from "./islands/island-ship-models.js";
import { listTransportPlaces } from "./islands/island-transport.js";
import { IslandTrainOnMap } from "./islands/island-map-train.js";
import { IslandAdventureOnMap } from "./islands/island-map-adventure.js";
import type { QuestProgress } from "../curriculum/island-quests.js";
import { findRailway, hasRailway } from "./islands/island-railway.js";
import { MapVoyage, mapVoyagePhases } from "./islands/island-map-voyage.js";
import type { Transport } from "./islands/island-journey.js";
import type { VoyagePort } from "./islands/island-voyage.js";
import { findIslandHeight, IslandLand } from "./islands/island-scene.js";
import { buildIslandSkyLook } from "./islands/island-sky.js";
import { DetailedCanvas } from "./world.js";
import { isMotionReduced } from "./reduced-motion.js";
import { useBuiltGeometry, WeatherUniformsContext } from "./world-map-hooks.js";
import {
  buildBroadleafGeometry,
  buildBushGeometry,
  buildCottageGeometry,
  buildCottageWindowGeometry,
  buildDistantIslandGeometry,
  buildPineGeometry,
  buildRockGeometry,
} from "./world-map-models.js";
import {
  Bridge,
  bridgeCrossing,
  clickSlopPixels,
  Clouds,
  findLightDirection,
  findNearestRegion,
  GroundHeightContext,
  InstancedModel,
  Lighthouse,
  LockedCovers,
  placeOnGround,
  RegionPlace,
  River,
  SailingBoat,
  Sea,
  SelectionMarker,
  SkyDome,
  SkyLight,
  Sunlight,
  Terrain,
  Volcano,
  Waterfall,
  type GroundHeight,
  type Position,
} from "./world-map-scene.js";
import { buildWeatherUniforms, surfaceGrains } from "./world-map-shaders.js";
import {
  buildSkyLook,
  findTimeOfDay,
  type SkyLook,
  type TimeOfDay,
  type Weather,
} from "./world-map-sky.js";
import {
  buildFarmHamletHouses,
  buildVillageHouses,
  farmHamletCentres,
  findTerrainHeight,
  lighthousePosition,
  findDistanceToFreshWater,
  findDistanceToNewLandRivers,
  isClearOfProps,
  meadowNewLands,
  mirrorOntoFarReaches,
  mirrorOntoNewLands,
  scatterAcrossLand,
  villageCentres,
  volcanoPosition,
  type MapPoint,
  type ScatteredThing,
} from "./world-map-terrain.js";
import {
  Lightning,
  Moon,
  Precipitation,
  Stars,
  WeatherClock,
  lowQualityPrecipitationShare,
} from "./world-map-weather.js";

const cameraHeight = 14;
const cameraBack = 16;
const overviewPitch = Math.atan2(38, 34);
const overviewMargin = 3;
const nearestOverviewDistance = 36;
const usualScreenShape = 16 / 9;
const wholeMapHeight = 340;
const wholeMapBack = 250;
const nearestCameraDistance = 8;
const furthestCameraDistance = 500;
const flatterThanOverhead = Math.PI * 0.42;
const flightSpeed = 4;
const flightLandedDistance = 0.05;
const zoomInFactor = 0.7;
const zoomOutFactor = 1.4;
const fieldOfView = 45;
const fogReach = 2.2;

export type CameraCommand =
  | { kind: "none" }
  | { kind: "zoom-in" | "zoom-out" | "show-everything"; sequence: number }
  | { kind: "show-island"; islandId: string; sequence: number };

export interface WalkerDrop {
  clientX: number;
  clientY: number;
  sequence: number;
}

const seaLevel = new Plane(new Vector3(0, 1, 0), 0);

export const findSeaLevelPoint = (
  camera: Camera,
  screenPoint: { x: number; y: number },
): MapPoint | undefined => {
  const raycaster = new Raycaster();
  raycaster.setFromCamera(new Vector2(screenPoint.x, screenPoint.y), camera);
  const hit = raycaster.ray.intersectPlane(seaLevel, new Vector3());
  return hit === null ? undefined : { x: hit.x, z: hit.z };
};

const WalkerDropFinder = ({
  walkerDrop,
  islands,
  onWalkerDropped,
}: {
  walkerDrop: WalkerDrop | undefined;
  islands: readonly IslandOnMap[];
  onWalkerDropped: (islandId: string, point: MapPoint) => void;
}) => {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const latest = useRef({ islands, onWalkerDropped });
  useEffect(() => {
    latest.current = { islands, onWalkerDropped };
  });
  const sequence = walkerDrop?.sequence;
  const clientX = walkerDrop?.clientX;
  const clientY = walkerDrop?.clientY;
  useEffect(() => {
    if (
      sequence === undefined ||
      clientX === undefined ||
      clientY === undefined
    ) {
      return;
    }
    const box = domElement.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      return;
    }
    const point = findSeaLevelPoint(camera, {
      x: ((clientX - box.left) / box.width) * 2 - 1,
      y: -((clientY - box.top) / box.height) * 2 + 1,
    });
    if (point === undefined) {
      return;
    }
    const island = findIslandInView(latest.current.islands, point);
    if (island === undefined) {
      return;
    }
    latest.current.onWalkerDropped(island.id, {
      x: point.x - island.seaPosition.x,
      z: point.z - island.seaPosition.z,
    });
  }, [camera, domElement, sequence, clientX, clientY]);
  return null;
};

export interface MapVoyagePlan {
  fromIslandId: string;
  toIslandId: string;
  transport: Transport;
}

export interface WorldMapSceneProps {
  islands: IslandOnMap[];
  islandInViewId: string;
  regions: RegionOnMap[];
  selectedRegionId: string | undefined;
  hoveredRegionId: string | undefined;
  cameraCommand: CameraCommand;
  weather: Weather;
  isWeatherChosen: boolean;
  onRegionChosen: (regionId: string) => void;
  onRegionHovered: (regionId: string | undefined) => void;
  onIslandChosen: (islandId: string) => void;
  onIslandInView: (islandId: string) => void;
  voyage: MapVoyagePlan | undefined;
  onVoyageEnded: () => void;
  walkerDrop: WalkerDrop | undefined;
  onWalkerDropped: (islandId: string, point: MapPoint) => void;
  /** The treasure the Child has found, which the map leaves off as explore mode does. */
  foundTreasureIds?: readonly string[];
  /** How far the Child is through each Island's Quest, so its Islanders and Things look as they do in explore mode. */
  questProgress?: readonly QuestProgress[];
}

const noTreasureFound: readonly string[] = [];
const noQuestProgress: readonly QuestProgress[] = [];

const findDrawnIsland = (islandId: string) =>
  drawnIslands.find(({ id }) => id === islandId);

// Meadow Isle has the World Map's own land; Islands 2 to 6 each have a
// landform of their own (ADR 0025).
const findGroundHeight = (islandId: string): GroundHeight =>
  findDrawnIsland(islandId) === undefined
    ? findTerrainHeight
    : findIslandHeight(islandId);

export const buildIslandLook = (
  island: IslandOnMap,
  timeOfDay: TimeOfDay,
  weather: Weather,
  isWeatherChosen = false,
): SkyLook => {
  const drawnIsland = findDrawnIsland(island.id);
  return drawnIsland === undefined
    ? buildSkyLook(timeOfDay, weather, island.theme.palette)
    : buildIslandSkyLook(
        drawnIsland.sky,
        timeOfDay,
        weather,
        drawnIsland.theme.palette,
        isWeatherChosen,
      );
};

const findOverviewDistance = (screenShape: number): number => {
  const halfView = Math.tan((fieldOfView * Math.PI) / 360);
  const acrossDistance =
    (mapHalfWidth + overviewMargin) / (halfView * screenShape);
  const deepDistance =
    ((mapHalfDepth + overviewMargin) * Math.sin(overviewPitch)) / halfView +
    mapHalfDepth * Math.cos(overviewPitch);
  return Math.max(nearestOverviewDistance, acrossDistance, deepDistance);
};

/*
 * The first view of an Island frames its old, centre land, which holds its
 * Regions, rather than the whole Island with the new lands east and west of
 * it (ADR 0041). How far back the camera stands depends on the screen's shape
 * (width over height), so the centre land fills the view on a wide screen, a
 * tablet and a phone held upright alike.
 */
export const findIslandOverview = (
  { x, z }: MapPosition,
  screenShape: number = usualScreenShape,
): { target: Position; cameraPosition: Position } => {
  const distance = findOverviewDistance(screenShape);
  return {
    target: [x, 0, z],
    cameraPosition: [
      x,
      distance * Math.sin(overviewPitch),
      z + distance * Math.cos(overviewPitch),
    ],
  };
};

const findScreenShape = (): number =>
  typeof window === "undefined" || window.innerHeight === 0
    ? usualScreenShape
    : window.innerWidth / window.innerHeight;

export const findIslandInView = (
  islands: readonly IslandOnMap[],
  point: MapPoint,
): IslandOnMap | undefined =>
  islands
    .map((island) => ({
      island,
      distance: Math.hypot(
        island.seaPosition.x - point.x,
        island.seaPosition.z - point.z,
      ),
    }))
    .toSorted((first, second) => first.distance - second.distance)
    .at(0)?.island;

const SunlightOverIsland = ({
  look,
  isEffectsOn,
  landScale,
}: {
  look: SkyLook;
  isEffectsOn: boolean;
  landScale: number;
}) => {
  const target = useMemo(() => new Object3D(), []);
  return (
    <>
      <primitive object={target} />
      <Sunlight
        look={look}
        isEffectsOn={isEffectsOn}
        target={target}
        landScale={landScale}
      />
    </>
  );
};

const meadowAdventure = findIslandAdventure("meadow-isle");

export interface MeadowScatters {
  pines: ScatteredThing[];
  broadleaves: ScatteredThing[];
  bushes: ScatteredThing[];
  rocks: ScatteredThing[];
  houses: ScatteredThing[];
}

export const meadowScatterSinks = {
  pines: 0.05,
  broadleaves: 0.05,
  bushes: 0.04,
  rocks: 0.15,
  houses: 0.06,
} as const satisfies Record<keyof MeadowScatters, number>;

/**
 * Meadow Isle's trees, bushes, rocks and cottages, with their copies on
 * the new lands, in map units. The World Map draws them, and exploring
 * on foot bumps into them (ADR 0061).
 */
export const listMeadowScatters = (
  regionPositions: readonly MapPoint[],
): MeadowScatters => {
  const landmarks = [
    volcanoPosition,
    lighthousePosition,
    bridgeCrossing,
    ...villageCentres,
    ...regionPositions,
    ...farmHamletCentres,
  ];
  const propPlaces = [
    ...listAdventurePlaces(meadowAdventure),
    meadowAdventure.start,
    ...listTransportPlaces("meadow-isle"),
    ...listAttractionKeepClearPlaces("meadow-isle"),
  ];
  const scatter = (
    count: number,
    seed: number,
    lowest: number,
    highest: number,
    clearance: number,
  ) =>
    scatterAcrossLand({
      count,
      seed,
      lowest,
      highest,
      keepClearOf: landmarks,
      propPlaces,
      clearance,
    });
  const isClearForNewLand = (point: MapPoint) =>
    Math.min(
      findDistanceToFreshWater(point),
      findDistanceToNewLandRivers(point, meadowNewLands),
    ) > 1.2 &&
    findDistanceToTrail(meadowAdventure, point) > 0.6 &&
    isClearOfProps(point, propPlaces) &&
    landmarks.every(
      (place) => Math.hypot(point.x - place.x, point.z - place.z) > 3,
    );
  const withNewLands = (things: ScatteredThing[], keepEvery: number) => [
    ...things,
    ...mirrorOntoNewLands(things, {
      keepEvery,
      findHeight: findTerrainHeight,
      isClear: isClearForNewLand,
    }),
    ...mirrorOntoFarReaches(things, {
      keepEvery,
      findHeight: findTerrainHeight,
      isClear: isClearForNewLand,
    }),
  ];
  return {
    pines: withNewLands(scatter(180, 7, 1.6, 6.2, 3.6), 5),
    broadleaves: withNewLands(scatter(130, 19, 0.5, 2.4, 4.8), 8),
    bushes: withNewLands(scatter(200, 43, 0.4, 3, 2.8), 2),
    rocks: withNewLands(scatter(46, 31, 2.5, 8, 2.5), 2),
    houses: [...buildVillageHouses(), ...buildFarmHamletHouses()],
  };
};

const MeadowLand = ({
  regions,
  look,
}: {
  regions: readonly RegionOnMap[];
  look: SkyLook;
}) => {
  const castle = regions.find(({ landmark }) => landmark === "castle");
  const { pines, broadleaves, bushes, rocks, houses } = useMemo(
    () => listMeadowScatters(regions.map(({ mapPosition }) => mapPosition)),
    [regions],
  );

  return (
    <>
      <River />
      <Bridge />
      <InstancedModel
        name="pine-trees"
        things={pines}
        buildGeometry={buildPineGeometry}
        sink={meadowScatterSinks.pines}
      />
      <InstancedModel
        name="broadleaf-trees"
        things={broadleaves}
        buildGeometry={buildBroadleafGeometry}
        sink={meadowScatterSinks.broadleaves}
      />
      <InstancedModel
        name="bushes"
        things={bushes}
        buildGeometry={buildBushGeometry}
        sink={meadowScatterSinks.bushes}
      />
      <InstancedModel
        name="rocks"
        things={rocks}
        buildGeometry={buildRockGeometry}
        sink={meadowScatterSinks.rocks}
        grain={surfaceGrains.stone}
      />
      <InstancedModel
        name="cottages"
        things={houses}
        buildGeometry={buildCottageGeometry}
        sink={meadowScatterSinks.houses}
        tintSpread={0.12}
        grain={surfaceGrains.timber}
      />
      {look.areWindowsLit ? (
        <InstancedModel
          name="window-lights"
          things={houses}
          buildGeometry={buildCottageWindowGeometry}
          sink={meadowScatterSinks.houses}
          tintSpread={0}
          material={<meshBasicMaterial color="#ffcf73" toneMapped={false} />}
        />
      ) : null}
      {castle === undefined ? null : <Waterfall castle={castle.mapPosition} />}
      <Volcano />
      <Lighthouse isDark={look.areWindowsLit} />
      <SailingBoat />
    </>
  );
};

const distantIslandScale: Position = [84, 3.2, 18];

// Islands out of view are one low-detail shape each, drawn together, and
// load their detail when the Child pans to them (ADR 0025).
const DistantIslands = ({
  islands,
  onIslandChosen,
}: {
  islands: readonly IslandOnMap[];
  onIslandChosen: (islandId: string) => void;
}) => {
  const geometry = useBuiltGeometry(buildDistantIslandGeometry);
  const shapes = useRef<InstancedMesh>(null);
  const placement = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const mesh = shapes.current;
    if (mesh === null) {
      return;
    }
    islands.forEach(({ seaPosition, theme }, index) => {
      placement.position.set(seaPosition.x, 0, seaPosition.z);
      placement.scale.set(...distantIslandScale);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
      mesh.setColorAt(index, new Color(theme.palette.ground));
    });
    mesh.count = islands.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [islands, placement]);

  return islands.length === 0 ? null : (
    <instancedMesh
      ref={shapes}
      name="distant-islands"
      args={[geometry, undefined, islands.length]}
      receiveShadow
      frustumCulled={false}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        const island =
          event.instanceId === undefined
            ? undefined
            : islands[event.instanceId];
        if (event.delta > clickSlopPixels || island === undefined) {
          return;
        }
        event.stopPropagation();
        onIslandChosen(island.id);
      }}
    >
      <meshStandardMaterial roughness={0.95} flatShading />
    </instancedMesh>
  );
};

export const WorldMapScene = ({
  islands,
  islandInViewId,
  regions,
  selectedRegionId,
  hoveredRegionId,
  onRegionChosen,
  onRegionHovered,
  onIslandChosen,
  isEffectsOn = true,
  timeOfDay = "day",
  weather = "clear",
  isWeatherChosen = false,
  landScale = 1,
  hasIslandFlag = false,
  foundTreasureIds = noTreasureFound,
  questProgress = noQuestProgress,
}: Omit<
  WorldMapSceneProps,
  | "cameraCommand"
  | "onIslandInView"
  | "weather"
  | "isWeatherChosen"
  | "voyage"
  | "onVoyageEnded"
  | "walkerDrop"
  | "onWalkerDropped"
> & {
  isEffectsOn?: boolean;
  timeOfDay?: TimeOfDay;
  weather?: Weather;
  isWeatherChosen?: boolean;
  landScale?: number;
  hasIslandFlag?: boolean;
}) => {
  const islandInView =
    islands.find(({ id }) => id === islandInViewId) ?? islands[0];
  const { palette } = islandInView.theme;
  const drawnIsland = findDrawnIsland(islandInView.id);
  const findHeight = findGroundHeight(islandInView.id);
  const look = buildIslandLook(
    islandInView,
    timeOfDay,
    weather,
    isWeatherChosen,
  );
  const weatherUniforms = useMemo(() => buildWeatherUniforms(), []);
  const lockedRegions = useMemo(
    () => regions.filter(({ isUnlocked }) => !isUnlocked),
    [regions],
  );
  const distantIslands = useMemo(
    () => islands.filter(({ id }) => id !== islandInView.id),
    [islands, islandInView.id],
  );
  const selectedRegion = regions.find(({ id }) => id === selectedRegionId);
  const onPointHovered = (point: MapPoint | undefined) => {
    const nearest =
      point === undefined ? undefined : findNearestRegion(regions, point);
    onRegionHovered(nearest?.id);
  };
  const { x: islandX, z: islandZ } = islandInView.seaPosition;

  return (
    <WeatherUniformsContext value={weatherUniforms}>
      <WeatherClock look={look} />
      <color attach="background" args={[look.horizon]} />
      <fog
        attach="fog"
        args={[look.horizon, look.fogStart * fogReach, look.fogEnd * fogReach]}
      />
      <Sea look={look} landScale={landScale} />
      <DistantIslands
        islands={distantIslands}
        onIslandChosen={onIslandChosen}
      />
      <GroundHeightContext value={findHeight}>
        <group
          name={`island-${islandInView.id}`}
          position={[islandX, 0, islandZ]}
        >
          <SkyDome look={look} />
          {look.isStarry ? <Stars /> : null}
          {look.isMoonlit ? (
            <Moon direction={findLightDirection(look)} />
          ) : null}
          <SunlightOverIsland
            look={look}
            isEffectsOn={isEffectsOn}
            landScale={landScale}
          />
          {look.hasLightning ? <Lightning /> : null}
          <group name="land" scale={landScale}>
            {drawnIsland === undefined ? (
              <>
                <Terrain
                  palette={palette}
                  seaPosition={islandInView.seaPosition}
                  landScale={landScale}
                  onPointChosen={(point) => {
                    const nearest = findNearestRegion(regions, point);
                    if (nearest !== undefined) {
                      onRegionChosen(nearest.id);
                    }
                  }}
                  onPointHovered={onPointHovered}
                />
                <MeadowLand regions={regions} look={look} />
                {regions.map((region) => (
                  <RegionPlace
                    key={region.id}
                    region={region}
                    accent={palette.accent}
                    isSelected={region.id === selectedRegionId}
                    isHovered={region.id === hoveredRegionId}
                    onRegionChosen={onRegionChosen}
                    onRegionHovered={onRegionHovered}
                  />
                ))}
                {selectedRegion === undefined ? null : (
                  <SelectionMarker
                    position={placeOnGround(selectedRegion.mapPosition)}
                    colour={palette.accent}
                  />
                )}
              </>
            ) : (
              <IslandLand
                island={drawnIsland}
                look={look}
                origin={islandInView.seaPosition}
                landScale={landScale}
                lockedRegionIds={lockedRegions.map(({ id }) => id)}
                selectedRegionId={selectedRegionId}
                hoveredRegionId={hoveredRegionId}
                onRegionChosen={onRegionChosen}
                onRegionHovered={onRegionHovered}
              />
            )}
            {landScale === 1 && hasRailway(islandInView.id) ? (
              <group scale={1 / exploreScale}>
                <IslandTrainOnMap railway={findRailway(islandInView.id)} />
              </group>
            ) : null}
            {hasIslandAdventure(islandInView.id) ? (
              <IslandDock
                islandId={islandInView.id}
                hasFlag={hasIslandFlag}
                isOnMap={landScale === 1}
                mapRailway={
                  landScale === 1 && hasRailway(islandInView.id)
                    ? findRailway(islandInView.id)
                    : undefined
                }
              />
            ) : null}
            {landScale === 1 && hasIslandAdventure(islandInView.id) ? (
              <IslandAdventureOnMap
                islandId={islandInView.id}
                accent={palette.accent}
                timeOfDay={timeOfDay}
                foundTreasureIds={foundTreasureIds}
                questProgress={questProgress}
              />
            ) : null}
            <LockedCovers
              lockedRegions={lockedRegions}
              onRegionChosen={onRegionChosen}
              onRegionHovered={onRegionHovered}
            />
          </group>
          <Clouds look={look} landScale={landScale} />
          <Precipitation
            look={look}
            share={isEffectsOn ? 1 : lowQualityPrecipitationShare}
          />
        </group>
      </GroundHeightContext>
    </WeatherUniformsContext>
  );
};

interface CameraFlight {
  target: Vector3;
  cameraPosition: Vector3;
}

const buildFlightTo = ([x, y, z]: Position): CameraFlight => ({
  target: new Vector3(x, y, z),
  cameraPosition: new Vector3(x, y + cameraHeight, z + cameraBack),
});

const buildIslandFlight = (
  island: IslandOnMap,
  screenShape: number,
): CameraFlight => {
  const { target, cameraPosition } = findIslandOverview(
    island.seaPosition,
    screenShape,
  );
  return {
    target: new Vector3(...target),
    cameraPosition: new Vector3(...cameraPosition),
  };
};

const buildWholeMapFlight = (islands: readonly IslandOnMap[]): CameraFlight => {
  const xs = islands.map(({ seaPosition }) => seaPosition.x);
  const zs = islands.map(({ seaPosition }) => seaPosition.z);
  const middleX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const middleZ = (Math.min(...zs) + Math.max(...zs)) / 2;
  return {
    target: new Vector3(middleX, 0, middleZ),
    cameraPosition: new Vector3(
      middleX,
      wholeMapHeight,
      middleZ + wholeMapBack,
    ),
  };
};

export const MapCameraRig = ({
  islands,
  islandInView,
  focus,
  cameraCommand,
  onIslandInView,
}: {
  islands: readonly IslandOnMap[];
  islandInView: IslandOnMap;
  focus: Position | undefined;
  cameraCommand: CameraCommand;
  onIslandInView: (islandId: string) => void;
}) => {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const controls = useMemo(() => {
    const mapControls = new MapControls(camera, domElement);
    mapControls.enableDamping = true;
    mapControls.screenSpacePanning = false;
    mapControls.minDistance = nearestCameraDistance;
    mapControls.maxDistance = furthestCameraDistance;
    mapControls.maxPolarAngle = flatterThanOverhead;
    return mapControls;
  }, [camera, domElement]);
  const flight = useRef<CameraFlight | undefined>(undefined);
  const reportedIslandId = useRef(islandInView.id);
  const [startingIsland] = useState(islandInView);
  const focusX = focus?.[0];
  const focusY = focus?.[1];
  const focusZ = focus?.[2];

  useLayoutEffect(() => {
    const { target } = findIslandOverview(startingIsland.seaPosition);
    controls.target.set(...target);
    controls.update();
  }, [controls, startingIsland]);

  useEffect(() => {
    const stopFlying = () => {
      flight.current = undefined;
    };
    controls.addEventListener("start", stopFlying);
    return () => {
      controls.removeEventListener("start", stopFlying);
      controls.dispose();
    };
  }, [controls]);

  useEffect(() => {
    if (focusX === undefined || focusY === undefined || focusZ === undefined) {
      return;
    }
    flight.current = buildFlightTo([focusX, focusY, focusZ]);
  }, [focusX, focusY, focusZ]);

  const carriedOutSequence = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (
      cameraCommand.kind === "none" ||
      cameraCommand.sequence === carriedOutSequence.current
    ) {
      return;
    }
    carriedOutSequence.current = cameraCommand.sequence;
    if (cameraCommand.kind === "show-everything") {
      flight.current = buildWholeMapFlight(islands);
      return;
    }
    if (cameraCommand.kind === "show-island") {
      const island = islands.find(({ id }) => id === cameraCommand.islandId);
      flight.current =
        island === undefined
          ? undefined
          : buildIslandFlight(
              island,
              camera instanceof PerspectiveCamera
                ? camera.aspect
                : usualScreenShape,
            );
      return;
    }
    const factor =
      cameraCommand.kind === "zoom-in" ? zoomInFactor : zoomOutFactor;
    const offset = camera.position.clone().sub(controls.target);
    const distance = Math.min(
      furthestCameraDistance,
      Math.max(nearestCameraDistance, offset.length() * factor),
    );
    flight.current = {
      target: controls.target.clone(),
      cameraPosition: controls.target.clone().add(offset.setLength(distance)),
    };
  }, [camera, controls, cameraCommand, islands]);

  useFrame((_state, deltaSeconds) => {
    const destination = flight.current;
    if (destination !== undefined) {
      const step = isMotionReduced()
        ? 1
        : 1 - Math.exp(-deltaSeconds * flightSpeed);
      controls.target.lerp(destination.target, step);
      camera.position.lerp(destination.cameraPosition, step);
      if (
        camera.position.distanceTo(destination.cameraPosition) <
        flightLandedDistance
      ) {
        flight.current = undefined;
      }
    }
    controls.update();
    const nearestIsland = findIslandInView(islands, controls.target);
    if (
      nearestIsland !== undefined &&
      nearestIsland.id !== reportedIslandId.current
    ) {
      reportedIslandId.current = nearestIsland.id;
      onIslandInView(nearestIsland.id);
    }
  });

  return null;
};

const clockCheckMilliseconds = 60_000;

export const useTimeOfDay = (): TimeOfDay => {
  const [timeOfDay, setTimeOfDay] = useState(() => findTimeOfDay(new Date()));
  useEffect(() => {
    const clockCheck = setInterval(() => {
      setTimeOfDay(findTimeOfDay(new Date()));
    }, clockCheckMilliseconds);
    return () => {
      clearInterval(clockCheck);
    };
  }, []);
  return timeOfDay;
};

export const WorldMapCanvas = (props: WorldMapSceneProps) => {
  const timeOfDay = useTimeOfDay();
  return <WorldMapView {...props} timeOfDay={timeOfDay} />;
};

const findVoyagePort = (
  islands: readonly IslandOnMap[],
  islandId: string,
): VoyagePort | undefined => {
  const island = islands.find(({ id }) => id === islandId);
  return island === undefined
    ? undefined
    : { islandId: island.id, seaPosition: island.seaPosition };
};

const MapVoyageRig = ({
  islands,
  voyage,
  onIslandInView,
  onVoyageEnded,
}: {
  islands: readonly IslandOnMap[];
  voyage: MapVoyagePlan;
  onIslandInView: (islandId: string) => void;
  onVoyageEnded: () => void;
}) => {
  const from = useMemo(
    () => findVoyagePort(islands, voyage.fromIslandId),
    [islands, voyage.fromIslandId],
  );
  const to = useMemo(
    () => findVoyagePort(islands, voyage.toIslandId),
    [islands, voyage.toIslandId],
  );
  const reportedIslandId = useRef(voyage.fromIslandId);
  if (from === undefined || to === undefined) {
    return null;
  }
  return (
    <MapVoyage
      from={from}
      to={to}
      transport={voyage.transport}
      phases={mapVoyagePhases}
      onCraftMoved={(placement) => {
        const nearest = findIslandInView(islands, placement);
        if (nearest !== undefined && nearest.id !== reportedIslandId.current) {
          reportedIslandId.current = nearest.id;
          onIslandInView(nearest.id);
        }
      }}
      onFinished={onVoyageEnded}
    />
  );
};

export const WorldMapView = ({
  cameraCommand,
  onIslandInView,
  voyage,
  onVoyageEnded,
  walkerDrop,
  onWalkerDropped,
  timeOfDay,
  weather,
  isWeatherChosen,
  ...sceneProps
}: WorldMapSceneProps & { timeOfDay: TimeOfDay }) => {
  const islandInView =
    sceneProps.islands.find(({ id }) => id === sceneProps.islandInViewId) ??
    sceneProps.islands[0];
  const look = buildIslandLook(
    islandInView,
    timeOfDay,
    weather,
    isWeatherChosen,
  );
  const [startingCamera] = useState(
    () =>
      findIslandOverview(islandInView.seaPosition, findScreenShape())
        .cameraPosition,
  );
  const selectedRegion = sceneProps.regions.find(
    ({ id }) => id === sceneProps.selectedRegionId,
  );
  const focus = useMemo((): Position | undefined => {
    if (selectedRegion === undefined) {
      return undefined;
    }
    const [x, y, z] = placeOnGround(
      selectedRegion.mapPosition,
      0,
      findGroundHeight(islandInView.id),
    );
    return [x + islandInView.seaPosition.x, y, z + islandInView.seaPosition.z];
  }, [selectedRegion, islandInView]);

  return (
    <div
      className="world-map-scene"
      style={{
        cursor:
          sceneProps.hoveredRegionId === undefined ? undefined : "pointer",
      }}
    >
      <DetailedCanvas
        cameraPosition={startingCamera}
        cameraFieldOfView={fieldOfView}
        loadingLabel="Getting the World Map ready…"
        renderScene={(isEffectsOn) => (
          <>
            <SkyLight look={look} />
            <WorldMapScene
              {...sceneProps}
              isEffectsOn={isEffectsOn}
              timeOfDay={timeOfDay}
              weather={weather}
              isWeatherChosen={isWeatherChosen}
            />
            <WalkerDropFinder
              walkerDrop={walkerDrop}
              islands={sceneProps.islands}
              onWalkerDropped={onWalkerDropped}
            />
            {voyage === undefined ? (
              <MapCameraRig
                islands={sceneProps.islands}
                islandInView={islandInView}
                focus={focus}
                cameraCommand={cameraCommand}
                onIslandInView={onIslandInView}
              />
            ) : (
              <MapVoyageRig
                islands={sceneProps.islands}
                voyage={voyage}
                onIslandInView={onIslandInView}
                onVoyageEnded={onVoyageEnded}
              />
            )}
          </>
        )}
      />
    </div>
  );
};
