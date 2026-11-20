import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  type BufferGeometry,
  type Group,
  type Mesh,
  type PointLight,
} from "three";
import { buildCharacterLook } from "../character/character-look.js";
import { CharacterModel } from "../character/character-model.js";
import { isMotionReduced } from "../reduced-motion.js";
import { clickSlopPixels, SkyLight } from "../world-map-scene.js";
import {
  chooseWeather,
  type TimeOfDay,
  type Weather,
} from "../world-map-sky.js";
import type { IslandOnMap } from "../../curriculum/island-access.js";
import type { MapPoint, ScatteredThing } from "../world-map-terrain.js";
import {
  buildIslandLook,
  useTimeOfDay,
  WorldMapScene,
} from "../world-map-islands.js";
import { DetailedCanvas } from "../world.js";
import {
  exploreScale,
  findExploreAdventure,
  findWalkSurface,
  isWithinReachOf,
  listExploreBlockers,
  listExploreInteractions,
  listNearbyInteractions,
  listTreasuresInReach,
  scalePlaceForExplore,
  swimSink,
  type AdventureWorld,
  type ExploreInteraction,
  type IslandAdventure,
  type Lookout,
  type PlaceToVisit,
} from "./island-adventures.js";
import type {
  CameraView,
  IslandExploreSceneProps,
  WalkerStatus,
} from "./island-explore-hud.js";
import {
  AdventureTrails,
  BouncePads,
  buildHideawayGeometry,
  buildPlacedBridgeGeometry,
  buildSignGeometry,
  buildTrailLampGeometry,
  buildWatchtowerGeometry,
  findDarkness,
  HideawayDens,
  listPlacedThings,
  listTrailLampPlaces,
  listWatchtowers,
  propSink,
  RaceRings,
  SignPosts,
  TrailBridges,
  TrailLamps,
  TreasureGems,
  watchtowerHeight,
  Watchtowers,
} from "./island-explore-props.js";
import { buildFriendGeometry, IslandFriends } from "./island-friends.js";
import { advanceRace, type RaceRun } from "./island-races.js";
import { isCarriedByVoyage, type VoyagePhase } from "./island-voyage.js";
import {
  findCraftPlacement,
  findJourneyArrivalHeading,
  findJourneyCameraSpot,
  findJourneyCarriedSpot,
  findJourneyWaitingSpot,
  findLandPhaseSeconds,
  isWalkingAboard,
  listCraftBlockers,
  type Transport,
} from "./island-journey.js";
import {
  advanceVoyageClock,
  IslandJourneyCraft,
  type VoyageClock,
} from "./island-ship-models.js";
import { VoyageCrossingScene } from "./island-voyage-scene.js";
import {
  findCave,
  findLanternGlow,
  isInsideCave,
  listWonderBlockers,
} from "./island-wonders.js";
import {
  IslandWonders,
  Lantern,
  lanternLightIntensity,
} from "./island-wonders-models.js";
import {
  listAttractionBlockers,
  listAttractionInteractions,
  listAttractionRides,
} from "./island-attractions.js";
import { IslandAttractions } from "./island-attractions-models.js";
import { findQuestProgress } from "../../curriculum/island-quests.js";
import { listQuestBlockers, listQuestInteractions } from "./island-quest.js";
import { IslandQuestScene } from "./island-quest-models.js";
import {
  findFlatReach,
  listChunkedSources,
  listPlacedModelSources,
  listTrianglePositions,
  ObstacleField,
  type Placement,
  type SolidSource,
} from "./island-obstacle-field.js";
import { markCylinder, type SurfaceFinder } from "./island-obstacles.js";
import { buildWorldSurface, listIslandSolids } from "./island-solids.js";
import {
  findPlayFinish,
  findPlaySpot,
  findRideKey,
  findRideProgress,
  findRideToStart,
  listStillSpentKeys,
  type PlayRideRun,
} from "./island-attraction-rides.js";
import {
  buildStartingWalker,
  findIntentTowards,
  isCameraTurningPointer,
  isMouseWalkingPointer,
  stepWalker,
  turnIntentToCamera,
  walkSpeed,
  type Walker,
} from "./island-walker.js";
import {
  describeTrainReportKey,
  findChosenDesign,
  findTrainReport,
  findTrainRiderSpot,
  findTrainStepOffSpot,
  findVehicleRiderSpot,
  isNearVehicle,
  isTrainWaitingNear,
  placeChosenVehicle,
  type RideState,
  type RiderSpot,
} from "./island-explore-ride.js";
import {
  IslandTrain,
  ParkedVehicle,
  RailwayStructures,
  RailwayTrack,
  type TrainClock,
  type VehiclePose,
} from "./island-railway-models.js";
import { findRailway, hasRailway, type Railway } from "./island-railway.js";
import {
  buildTimetable,
  findTimetableStart,
  type Timetable,
} from "./island-train-timetable.js";
import { buildExploreWorld } from "./island-transport.js";
import {
  findStepOutSpot,
  stepVehicle,
  type DrivenVehicle,
} from "../vehicles/vehicle-driving.js";

interface ExploreTransport {
  railway: Railway;
  timetable: Timetable;
  startSeconds: number;
}

const characterScale = 0.42;
/** Signs, dens and lamps are bumped into whatever colour they are painted. */
const propColour = "#808080";
const fieldOfView = 55;
const nearestFollow = 3.2;
const furthestFollow = 16;
const startingFollow = 6.5;
const lowestPitch = 0.12;
const highestPitch = 1.25;
const startingPitch = 0.42;
const dragTurnPerPixel = 0.006;
const cameraFollowRate = 6;
const lookoutTurnSpeed = 0.12;
const lookoutLookDown = 0.32;
const arrivedWithin = 0.35;
const bouncingSpeed = 6;
const caveCameraReach = 2.6;
const caveCameraPitch = 0.3;

const firstPersonEyeHeight = 0.62;
const firstPersonTurnSpeed = 2.2;

const findViewAim = (
  view: CameraView,
  aim: CameraAim,
): { pitch: number; distance: number } => {
  if (view === "birds-eye") {
    return { pitch: 1.32, distance: 45 };
  }
  if (view === "wide") {
    return { pitch: 0.72, distance: Math.max(30, aim.distance * 2.8) };
  }
  return { pitch: aim.pitch, distance: aim.distance };
};

interface WalkTarget {
  point: MapPoint;
  interaction: ExploreInteraction | undefined;
}

interface CameraAim {
  yaw: number;
  pitch: number;
  distance: number;
}

const findWalkerStatus = (walker: Walker): WalkerStatus => {
  if (walker.isHeldBackByLava) {
    return "too-hot";
  }
  if (walker.isAirborne && walker.verticalSpeed > bouncingSpeed) {
    return "bouncing";
  }
  if (walker.surface === "water") {
    return "swimming";
  }
  return walker.surface === "ice" ? "sliding" : "walking";
};

const listInteractionKeys = (interactions: readonly ExploreInteraction[]) =>
  interactions.map(({ kind, id }) => `${kind}:${id}`).join("|");

const findLookoutTop = (
  world: AdventureWorld,
  lookout: Lookout,
): [number, number, number] => [
  lookout.position.x,
  Math.max(0, world.adventure.findHeight(lookout.position)) +
    lookout.viewHeight +
    0.8,
  lookout.position.z,
];

const heldLeftMouseButtons = 1;

const useCameraDrag = (aim: { current: CameraAim }) => {
  const domElement = useThree((state) => state.gl.domElement);
  useEffect(() => {
    let dragFrom: { x: number; y: number } | undefined;
    const startDrag = (event: PointerEvent) => {
      if (!isCameraTurningPointer(event)) {
        return;
      }
      dragFrom = { x: event.clientX, y: event.clientY };
    };
    const keepMenuClosed = (event: MouseEvent) => {
      event.preventDefault();
    };
    const drag = (event: PointerEvent) => {
      if (dragFrom === undefined) {
        return;
      }
      aim.current.yaw -= (event.clientX - dragFrom.x) * dragTurnPerPixel;
      aim.current.pitch = Math.min(
        highestPitch,
        Math.max(
          lowestPitch,
          aim.current.pitch + (event.clientY - dragFrom.y) * dragTurnPerPixel,
        ),
      );
      dragFrom = { x: event.clientX, y: event.clientY };
    };
    const stopDrag = () => {
      dragFrom = undefined;
    };
    const zoom = (event: WheelEvent) => {
      event.preventDefault();
      aim.current.distance = Math.min(
        furthestFollow,
        Math.max(
          nearestFollow,
          aim.current.distance * (1 + event.deltaY * 0.001),
        ),
      );
    };
    domElement.addEventListener("pointerdown", startDrag);
    domElement.addEventListener("contextmenu", keepMenuClosed);
    window.addEventListener("pointermove", drag);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    domElement.addEventListener("wheel", zoom, { passive: false });
    return () => {
      domElement.removeEventListener("pointerdown", startDrag);
      domElement.removeEventListener("contextmenu", keepMenuClosed);
      window.removeEventListener("pointermove", drag);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
      domElement.removeEventListener("wheel", zoom);
    };
  }, [aim, domElement]);
};

const findCarriedPhase = (
  phase: VoyagePhase | undefined,
): Exclude<VoyagePhase, "crossing"> | undefined =>
  phase === undefined || phase === "crossing" || !isCarriedByVoyage(phase)
    ? undefined
    : phase;

const toPropPlacements = (things: readonly ScatteredThing[]): Placement[] =>
  things.map(({ x, z, height, turn, scale }) => ({
    x,
    y: height - propSink,
    z,
    turn,
    scale,
  }));

const listPropSources = (
  name: string,
  buildGeometry: () => BufferGeometry,
  things: readonly ScatteredThing[],
  findSurface: SurfaceFinder,
) =>
  listPlacedModelSources(
    name,
    () => {
      const geometry = buildGeometry();
      const triangles = listTrianglePositions(geometry);
      geometry.dispose();
      return triangles;
    },
    toPropPlacements(things),
    () => findSurface,
  );

/**
 * The friendly animals sway and hop where they stand, so each is solid
 * as an upright round as wide and as tall as its model reaches.
 */
const listFriendSources = (adventure: IslandAdventure): SolidSource[] => {
  const geometry = buildFriendGeometry(adventure.friendKind.look);
  geometry.computeBoundingBox();
  const top = geometry.boundingBox?.max.y ?? 1;
  const reach = findFlatReach(listTrianglePositions(geometry));
  geometry.dispose();
  return adventure.friends.map(({ id, position }) => ({
    name: `friend-${id}`,
    centre: position,
    reach,
    mark: (grid) => {
      const ground = Math.max(0, adventure.findHeight(position));
      markCylinder(grid, position, reach, ground, ground + top);
    },
  }));
};

const giveUpWalkingAfterSeconds = 0.8;

/**
 * How long a walk to a tapped spot has made no headway, so the
 * Character stops pushing against a wall in the way (ADR 0061).
 */
export { listTrailLampPlaces };

export const findStalledSeconds = (
  stalled: number,
  isWalkingToSpot: boolean,
  moved: number,
  deltaSeconds: number,
): number =>
  isWalkingToSpot && moved < walkSpeed * deltaSeconds * 0.2
    ? stalled + deltaSeconds
    : 0;

const obstacleFields = new WeakMap<AdventureWorld, ObstacleField>();

/**
 * Everything the Character bumps into while exploring (ADR 0061): the
 * Island's own solid things, and the signs, dens, lamps and trail
 * bridges explore mode draws itself.
 */
export const findObstacleField = (world: AdventureWorld): ObstacleField => {
  const known = obstacleFields.get(world);
  if (known !== undefined) {
    return known;
  }
  const { adventure } = world;
  const { sources, clearSpots } = listIslandSolids(world);
  const findSurface = buildWorldSurface(world);
  const trailBridges = world.bridges.filter(
    ({ isDrawnByIsland }) => !isDrawnByIsland,
  );
  const field = new ObstacleField(
    [
      ...sources,
      ...listPropSources(
        "fact-sign",
        () => buildSignGeometry(propColour),
        listPlacedThings(
          adventure.signs.map(({ position }) => position),
          adventure.findHeight,
          true,
        ),
        findSurface,
      ),
      ...listPropSources(
        "hideaway",
        () => buildHideawayGeometry(propColour),
        listPlacedThings(
          adventure.hideaways.map(({ position }) => position),
          adventure.findHeight,
          true,
        ),
        findSurface,
      ),
      ...listPropSources(
        "trail-lamp",
        () => buildTrailLampGeometry(propColour),
        listPlacedThings(listTrailLampPlaces(world), adventure.findHeight),
        findSurface,
      ),
      ...listPropSources(
        "watchtower",
        () => buildWatchtowerGeometry(watchtowerHeight, propColour),
        listPlacedThings(
          listWatchtowers(adventure).map(({ position }) => position),
          adventure.findHeight,
        ),
        findSurface,
      ),
      ...listFriendSources(adventure),
      ...(trailBridges.length === 0
        ? []
        : listChunkedSources(
            "trail-bridges",
            () => {
              const geometry = mergeGeometries(
                trailBridges.map(buildPlacedBridgeGeometry),
              );
              const triangles = listTrianglePositions(geometry);
              geometry.dispose();
              return triangles;
            },
            findSurface,
          )),
    ],
    clearSpots,
  );
  obstacleFields.set(world, field);
  return field;
};

/** How long each frame may spend marking what is solid while getting ready. */
const loadingBudgetMs = 12;
/** How far through getting ready the scene is once it is built, before it is drawn. */
const drawingShare = 0.3;

const Explorer = ({
  world,
  places,
  sceneProps,
  walkTargetRef,
  voyageClock,
  raceRunRef,
  transport: rails,
  trainClockRef,
  vehiclePoseRef,
  explorerSpotRef,
}: {
  world: AdventureWorld;
  places: readonly PlaceToVisit[];
  sceneProps: IslandExploreSceneProps;
  walkTargetRef: { current: WalkTarget | undefined };
  voyageClock: { current: VoyageClock };
  raceRunRef: { current: RaceRun | undefined };
  transport: ExploreTransport | undefined;
  trainClockRef: { current: TrainClock };
  vehiclePoseRef: { current: VehiclePose | undefined };
  explorerSpotRef: { current: MapPoint | undefined };
}) => {
  const { adventure } = world;
  const camera = useThree((state) => state.camera);
  const look = useMemo(
    () => buildCharacterLook(sceneProps.loadout),
    [sceneProps.loadout],
  );
  const interactions = useMemo(
    () => [
      ...listExploreInteractions(adventure, places),
      ...listAttractionInteractions(adventure),
      ...listQuestInteractions(adventure.islandId),
    ],
    [adventure, places],
  );
  const playRides = useMemo(() => listAttractionRides(adventure), [adventure]);
  const playRun = useRef<PlayRideRun>(undefined);
  const spentRideKeys = useRef<Set<string>>(new Set());
  const blockers = useMemo(
    () => [
      ...listExploreBlockers(adventure, places),
      ...listWonderBlockers(adventure),
      ...listAttractionBlockers(adventure),
      ...listQuestBlockers(adventure.islandId),
    ],
    [adventure, places],
  );
  const obstacleField = useMemo(() => findObstacleField(world), [world]);
  const walker = useRef<Walker>(
    buildStartingWalker(world, sceneProps.start, sceneProps.startHeading),
  );
  const aim = useRef<CameraAim>({
    yaw: sceneProps.startHeading + Math.PI,
    pitch: startingPitch,
    distance: startingFollow,
  });
  const body = useRef<Group>(null);
  const pose = useRef<Group>(null);
  const ripple = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const lantern = useRef<Group>(null);
  const lanternLight = useRef<PointLight>(null);
  const cave = useMemo(() => findCave(adventure), [adventure]);
  const wasCarried = useRef(false);
  const transportRef = useRef<Transport>(
    sceneProps.voyage?.transport ?? "ship",
  );
  const stride = useRef(0);
  const reported = useRef({ nearby: "", status: "walking", race: "" });
  const latest = useRef(sceneProps);
  useEffect(() => {
    latest.current = sceneProps;
  });
  useCameraDrag(aim);
  const rideState = useRef<RideState>({ kind: "walking" });
  const driven = useRef<DrivenVehicle>(undefined);
  const placedCount = useRef(0);
  const stalledSeconds = useRef(0);
  const reportedRide = useRef({ train: "", isNearVehicle: false });

  const loadingFrames = useRef(
    sceneProps.onLoadingChanged === undefined ? undefined : 0,
  );
  const reportedLoadingPercent = useRef(-1);
  useEffect(() => {
    latest.current.onLoadingChanged?.({
      step: `Drawing ${latest.current.island.name} for the first time`,
      share: drawingShare,
    });
  }, []);

  useFrame((state, deltaSeconds) => {
    const props = latest.current;
    const clockSeconds = state.clock.elapsedTime;
    if (rails !== undefined) {
      if (!trainClockRef.current.isStarted) {
        trainClockRef.current.seconds = rails.startSeconds;
        trainClockRef.current.isStarted = true;
      }
      trainClockRef.current.seconds += deltaSeconds;
    }
    if (loadingFrames.current !== undefined) {
      loadingFrames.current += 1;
      // The first frame is the first drawing, so the marking waits for the next.
      if (loadingFrames.current === 1) {
        return;
      }
      const { marked, total } = obstacleField.prepareAroundWithin(
        walker.current,
        loadingBudgetMs,
      );
      if (marked < total) {
        const share = drawingShare + (1 - drawingShare) * (marked / total);
        const percent = Math.floor(share * 100);
        if (percent !== reportedLoadingPercent.current) {
          reportedLoadingPercent.current = percent;
          props.onLoadingChanged?.({
            step: `Making the things near you solid: ${String(marked)} of ${String(total)}`,
            share,
          });
        }
        return;
      }
      loadingFrames.current = undefined;
      props.onLoadingChanged?.(undefined);
    }
    const followRide = (
      spot: RiderSpot,
      deltaSeconds: number,
      view: CameraView,
    ) => {
      const turn =
        ((spot.heading + Math.PI - aim.current.yaw + Math.PI * 3) %
          (Math.PI * 2)) -
        Math.PI;
      aim.current.yaw += turn * Math.min(1, deltaSeconds * 2.5);
      const { pitch, distance } = findViewAim(view, {
        ...aim.current,
        distance: Math.max(aim.current.distance, 8),
      });
      const flatReach = Math.cos(pitch) * distance;
      const follow = 1 - Math.exp(-cameraFollowRate * deltaSeconds);
      camera.position.lerp(
        {
          x: spot.x + Math.sin(aim.current.yaw) * flatReach,
          y: spot.y + 1.2 + Math.sin(pitch) * distance,
          z: spot.z + Math.cos(aim.current.yaw) * flatReach,
        },
        follow,
      );
      camera.lookAt(spot.x, spot.y + 0.8, spot.z);
    };

    const stepRide = (
      props: IslandExploreSceneProps,
      deltaSeconds: number,
    ): boolean => {
      const choice = props.vehicle;
      const design = findChosenDesign(choice);
      if (choice === undefined || design === undefined) {
        driven.current = undefined;
      } else if (
        choice.placedCount !== placedCount.current &&
        rideState.current.kind === "walking"
      ) {
        placedCount.current = choice.placedCount;
        driven.current = placeChosenVehicle(
          world,
          walker.current,
          design,
          blockers,
          obstacleField.obstacles,
        );
      }
      const state = rideState.current;
      const here = walker.current;
      if (
        state.kind === "walking" &&
        props.ride === "train" &&
        rails !== undefined &&
        isTrainWaitingNear(
          rails.railway,
          rails.timetable,
          trainClockRef.current,
          here,
        )
      ) {
        rideState.current = { kind: "train" };
        walkTargetRef.current = undefined;
      } else if (
        state.kind === "walking" &&
        props.ride === "vehicle" &&
        isNearVehicle(driven.current, design, here)
      ) {
        rideState.current = { kind: "vehicle" };
        walkTargetRef.current = undefined;
      } else if (
        state.kind === "train" &&
        props.ride !== "train" &&
        rails !== undefined
      ) {
        rideState.current = { kind: "walking" };
        walker.current = buildStartingWalker(
          world,
          findTrainStepOffSpot(
            rails.railway,
            rails.timetable,
            trainClockRef.current,
            here,
          ),
          here.heading,
        );
      } else if (
        state.kind === "vehicle" &&
        (props.ride !== "vehicle" || driven.current === undefined)
      ) {
        rideState.current = { kind: "walking" };
        walker.current = buildStartingWalker(
          world,
          driven.current === undefined || design === undefined
            ? here
            : findStepOutSpot(
                world,
                driven.current,
                design,
                obstacleField.obstacles,
              ),
          here.heading,
        );
      }
      if (rails !== undefined) {
        const report = findTrainReport(
          rails.railway,
          rails.timetable,
          trainClockRef.current,
          rideState.current,
          walker.current,
        );
        const key = describeTrainReportKey(report);
        if (key !== reportedRide.current.train) {
          reportedRide.current.train = key;
          props.onTrainChanged?.(report);
        }
      }
      const isNear =
        rideState.current.kind === "walking" &&
        isNearVehicle(driven.current, design, walker.current);
      if (isNear !== reportedRide.current.isNearVehicle) {
        reportedRide.current.isNearVehicle = isNear;
        props.onNearVehicleChanged?.(isNear);
      }
      const riding = rideState.current.kind;
      let spot: RiderSpot | undefined;
      if (riding === "train" && rails !== undefined) {
        spot = findTrainRiderSpot(
          rails.railway,
          rails.timetable,
          trainClockRef.current,
        );
      }
      if (
        riding === "vehicle" &&
        driven.current !== undefined &&
        design !== undefined
      ) {
        const input = props.inputRef.current;
        driven.current = stepVehicle(
          driven.current,
          { right: input.right, forward: input.forward },
          deltaSeconds,
          world,
          design,
          blockers,
          obstacleField.obstacles,
        );
        obstacleField.prepareAround(driven.current);
        input.wantsJump = false;
        spot = findVehicleRiderSpot(driven.current, design);
      }
      vehiclePoseRef.current = driven.current;
      if (spot === undefined) {
        return false;
      }
      walker.current = {
        ...walker.current,
        x: spot.x,
        y: spot.y,
        z: spot.z,
        heading: spot.heading,
        velocityX: 0,
        velocityZ: 0,
      };
      if (body.current !== null) {
        body.current.position.set(spot.x, spot.y, spot.z);
        body.current.rotation.y = spot.heading;
        body.current.visible = !spot.isHidden;
      }
      if (pose.current !== null) {
        pose.current.position.y = 0;
        pose.current.rotation.set(0, 0, 0);
      }
      if (shadow.current !== null) {
        shadow.current.visible = false;
      }
      if (ripple.current !== null) {
        ripple.current.visible = false;
      }
      followRide(spot, deltaSeconds, props.cameraView);
      return true;
    };

    advanceVoyageClock(voyageClock, props.voyage?.phase, deltaSeconds);
    transportRef.current = props.voyage?.transport ?? transportRef.current;
    const transport = transportRef.current;
    const carriedPhase = findCarriedPhase(voyageClock.current.phase);
    if (shadow.current !== null) {
      shadow.current.visible = carriedPhase === undefined;
    }
    if (carriedPhase !== undefined) {
      const share = Math.min(
        1,
        voyageClock.current.seconds /
          findLandPhaseSeconds(transport, carriedPhase),
      );
      const spot = findJourneyCarriedSpot(
        adventure,
        transport,
        carriedPhase,
        share,
      );
      if (!wasCarried.current) {
        const dockCamera = findJourneyCameraSpot(adventure, transport);
        const reach = Math.hypot(
          dockCamera.x - spot.x,
          dockCamera.y - spot.y,
          dockCamera.z - spot.z,
        );
        aim.current = {
          yaw: Math.atan2(dockCamera.x - spot.x, dockCamera.z - spot.z),
          pitch: Math.asin((dockCamera.y - spot.y) / reach),
          distance: Math.min(furthestFollow, reach),
        };
      }
      wasCarried.current = true;
      walkTargetRef.current = undefined;
      if (body.current !== null) {
        body.current.position.set(spot.x, spot.y, spot.z);
        body.current.rotation.y = spot.heading;
        body.current.visible = !spot.isInside;
      }
      if (pose.current !== null) {
        const isWalking = isWalkingAboard(transport, carriedPhase, share);
        stride.current += isWalking ? deltaSeconds * walkSpeed * 3 : 0;
        const motion = isMotionReduced() ? 0 : 1;
        pose.current.position.y = isWalking
          ? Math.abs(Math.sin(stride.current)) * 0.06 * motion
          : 0;
        pose.current.rotation.set(
          isWalking ? 0.08 : 0,
          0,
          isWalking ? Math.sin(stride.current) * 0.05 * motion : 0,
        );
      }
      if (ripple.current !== null) {
        ripple.current.visible = false;
      }
      const follow = 1 - Math.exp(-cameraFollowRate * deltaSeconds);
      const { yaw, pitch, distance } = aim.current;
      const flatReach = Math.cos(pitch) * distance;
      camera.position.lerp(
        {
          x: spot.x + Math.sin(yaw) * flatReach,
          y: spot.y + 0.6 + Math.sin(pitch) * distance,
          z: spot.z + Math.cos(yaw) * flatReach,
        },
        follow,
      );
      camera.lookAt(spot.x, spot.y + 0.55, spot.z);
      return;
    }
    if (wasCarried.current) {
      wasCarried.current = false;
      const heading = findJourneyArrivalHeading(adventure, transport);
      walker.current = buildStartingWalker(
        world,
        findJourneyWaitingSpot(adventure, transport),
        heading,
      );
      if (body.current !== null) {
        body.current.visible = true;
      }
      aim.current.yaw = heading + Math.PI;
    }
    if (stepRide(props, deltaSeconds)) {
      playRun.current = undefined;
      return;
    }
    const run = playRun.current;
    if (run !== undefined) {
      const progress = findRideProgress(run, clockSeconds);
      if (progress >= 1 || props.climbedLookoutId !== undefined) {
        walker.current = buildStartingWalker(
          world,
          findPlayFinish(run),
          walker.current.heading,
        );
        spentRideKeys.current.add(findRideKey(run.placed));
        playRun.current = undefined;
        props.onPlayRideChanged?.(undefined);
      } else {
        const spot = findPlaySpot(run, progress, clockSeconds);
        walker.current = {
          ...walker.current,
          x: spot.x,
          y: spot.y,
          z: spot.z,
          heading: spot.heading,
          velocityX: 0,
          velocityZ: 0,
          verticalSpeed: 0,
          isAirborne: false,
        };
        explorerSpotRef.current = { x: spot.x, z: spot.z };
        if (body.current !== null) {
          body.current.position.set(spot.x, spot.y, spot.z);
          body.current.rotation.y = spot.heading;
          body.current.visible = props.cameraView !== "first-person";
        }
        if (pose.current !== null) {
          pose.current.position.y = 0;
          pose.current.rotation.set(0, 0, 0);
        }
        if (shadow.current !== null) {
          shadow.current.visible = false;
        }
        if (ripple.current !== null) {
          ripple.current.visible = false;
        }
        const viewAim = findViewAim(props.cameraView, aim.current);
        const flatReach = Math.cos(viewAim.pitch) * viewAim.distance;
        const follow = 1 - Math.exp(-cameraFollowRate * deltaSeconds);
        camera.position.lerp(
          {
            x: spot.x + Math.sin(aim.current.yaw) * flatReach,
            y: spot.y + 0.6 + Math.sin(viewAim.pitch) * viewAim.distance,
            z: spot.z + Math.cos(aim.current.yaw) * flatReach,
          },
          follow,
        );
        camera.lookAt(spot.x, spot.y + 0.55, spot.z);
        return;
      }
    }
    if (shadow.current !== null) {
      shadow.current.visible = true;
    }
    const isClimbed = props.climbedLookoutId !== undefined;
    const input = props.inputRef.current;
    const isSteered = input.right !== 0 || input.forward !== 0;
    if (isSteered || isClimbed) {
      walkTargetRef.current = undefined;
    }
    const isFirstPerson = props.cameraView === "first-person";
    if (isFirstPerson && !isClimbed) {
      aim.current.yaw -= input.right * firstPersonTurnSpeed * deltaSeconds;
    }
    const steered = turnIntentToCamera(
      isFirstPerson ? { right: 0, forward: input.forward } : input,
      aim.current.yaw,
    );
    const targetIntent =
      walkTargetRef.current === undefined
        ? undefined
        : findIntentTowards(
            walker.current,
            walkTargetRef.current.point,
            arrivedWithin,
          );
    const target = walkTargetRef.current;
    if (target !== undefined && targetIntent === undefined) {
      walkTargetRef.current = undefined;
    }
    const intent = isClimbed
      ? { x: 0, z: 0, wantsJump: false }
      : {
          ...(targetIntent ?? steered),
          wantsJump: input.wantsJump,
        };
    input.wantsJump = false;
    const leavingPhase = voyageClock.current.phase;
    const shipBlockers =
      leavingPhase === "leaving"
        ? listCraftBlockers(
            adventure,
            transport,
            findCraftPlacement(
              adventure,
              transport,
              leavingPhase,
              Math.min(
                1,
                voyageClock.current.seconds /
                  findLandPhaseSeconds(transport, leavingPhase),
              ),
            ),
          )
        : [];
    obstacleField.prepareAround(walker.current);
    const before = walker.current;
    walker.current = stepWalker(
      walker.current,
      intent,
      deltaSeconds,
      world,
      [...blockers, ...shipBlockers],
      obstacleField.obstacles,
    );
    const now = walker.current;
    stalledSeconds.current = findStalledSeconds(
      stalledSeconds.current,
      walkTargetRef.current !== undefined,
      Math.hypot(now.x - before.x, now.z - before.z),
      deltaSeconds,
    );
    if (stalledSeconds.current > giveUpWalkingAfterSeconds) {
      walkTargetRef.current = undefined;
      stalledSeconds.current = 0;
    }
    explorerSpotRef.current = { x: now.x, z: now.z };
    spentRideKeys.current = listStillSpentKeys(
      playRides,
      now,
      spentRideKeys.current,
    );
    const rideToStart = now.isAirborne
      ? undefined
      : findRideToStart(playRides, now, spentRideKeys.current);
    if (rideToStart !== undefined) {
      playRun.current = { placed: rideToStart, startedAt: clockSeconds };
      walkTargetRef.current = undefined;
      props.onPlayRideChanged?.(rideToStart.ride.name);
    }

    if (
      target?.interaction !== undefined &&
      isWithinReachOf(target.interaction, now)
    ) {
      walkTargetRef.current = undefined;
      props.onInteractionReached(target.interaction);
    }

    const raced = advanceRace(
      raceRunRef.current,
      adventure.races,
      now,
      deltaSeconds,
    );
    raceRunRef.current = raced.run;
    const raceKey =
      raced.progress === undefined ? "" : JSON.stringify(raced.progress);
    if (raced.progress !== undefined && raceKey !== reported.current.race) {
      props.onRaceProgress(raced.progress);
    }
    reported.current.race = raceKey;

    listTreasuresInReach(world, now, props.foundTreasureIds).forEach(
      ({ id }) => {
        props.onTreasureFound(id);
      },
    );

    const nearby = listNearbyInteractions(interactions, now);
    const nearbyKey = listInteractionKeys(nearby);
    if (nearbyKey !== reported.current.nearby) {
      reported.current.nearby = nearbyKey;
      props.onNearbyChanged(nearby);
    }
    const status = findWalkerStatus(now);
    if (status !== reported.current.status) {
      reported.current.status = status;
      props.onStatusChanged(status);
    }

    const isMoving = Math.hypot(now.velocityX, now.velocityZ) > 0.2;
    const motion = isMotionReduced() ? 0 : 1;
    stride.current +=
      deltaSeconds * Math.hypot(now.velocityX, now.velocityZ) * 3;
    if (body.current !== null) {
      body.current.position.set(now.x, now.y, now.z);
      body.current.rotation.y = now.heading;
      body.current.visible = !isClimbed && !isFirstPerson;
    }
    if (pose.current !== null) {
      const isSwimming = now.surface === "water";
      const bob =
        isMoving && !now.isAirborne
          ? Math.abs(Math.sin(stride.current)) * 0.06
          : 0;
      pose.current.position.y = isSwimming ? 0 : bob * motion;
      pose.current.rotation.x = isSwimming ? 0.9 : isMoving ? 0.08 : 0;
      pose.current.rotation.z =
        isMoving && !isSwimming ? Math.sin(stride.current) * 0.05 * motion : 0;
    }
    const lanternGlow = findLanternGlow(cave, now);
    if (lantern.current !== null) {
      lantern.current.visible = lanternGlow > 0.01;
    }
    if (lanternLight.current !== null) {
      lanternLight.current.intensity = lanternGlow * lanternLightIntensity;
    }
    if (ripple.current !== null) {
      ripple.current.visible =
        now.surface === "water" || now.surface === "shallows";
      ripple.current.position.y =
        now.surface === "water" ? swimSink + 0.03 : 0.03;
    }

    const lookout = adventure.lookouts.find(
      ({ id }) => id === props.climbedLookoutId,
    );
    const follow = 1 - Math.exp(-cameraFollowRate * deltaSeconds);
    if (lookout !== undefined) {
      aim.current.yaw += deltaSeconds * lookoutTurnSpeed * motion;
      const [x, y, z] = findLookoutTop(world, lookout);
      camera.position.lerp({ x, y, z }, follow);
      camera.lookAt(
        camera.position.x - Math.sin(aim.current.yaw) * 10,
        camera.position.y - 10 * lookoutLookDown,
        camera.position.z - Math.cos(aim.current.yaw) * 10,
      );
      return;
    }
    const { yaw } = aim.current;
    if (isFirstPerson) {
      const lookDown = aim.current.pitch - startingPitch;
      camera.position.set(now.x, now.y + firstPersonEyeHeight, now.z);
      camera.lookAt(
        now.x - Math.sin(yaw) * 10,
        now.y + firstPersonEyeHeight - lookDown * 10,
        now.z - Math.cos(yaw) * 10,
      );
      return;
    }
    const viewAim = findViewAim(props.cameraView, aim.current);
    const isUnderRock =
      props.cameraView === "behind" && isInsideCave(cave, now);
    const pitch = isUnderRock
      ? Math.min(viewAim.pitch, caveCameraPitch)
      : viewAim.pitch;
    const distance = isUnderRock
      ? Math.min(viewAim.distance, caveCameraReach)
      : viewAim.distance;
    const flatReach = Math.cos(pitch) * distance;
    const wantedX = now.x + Math.sin(yaw) * flatReach;
    const wantedZ = now.z + Math.cos(yaw) * flatReach;
    const groundUnderCamera = Math.max(
      0,
      adventure.findHeight({ x: wantedX, z: wantedZ }),
    );
    const wantedY = Math.max(
      now.y + 0.6 + Math.sin(pitch) * distance,
      groundUnderCamera + 0.8,
    );
    camera.position.lerp({ x: wantedX, y: wantedY, z: wantedZ }, follow);
    camera.lookAt(now.x, now.y + 0.55, now.z);
  });

  return (
    <group ref={body} name="explorer">
      <group ref={pose} scale={characterScale}>
        <CharacterModel look={look} />
      </group>
      <Lantern lanternRef={lantern} lightRef={lanternLight} />
      <mesh
        ref={shadow}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
      >
        <circleGeometry args={[0.28, 20]} />
        <meshBasicMaterial
          color="#0f172a"
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={ripple}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        renderOrder={3}
      >
        <ringGeometry args={[0.32, 0.44, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const LookoutTarget = ({
  lookout,
  world,
  onChosen,
}: {
  lookout: Lookout;
  world: AdventureWorld;
  onChosen: () => void;
}) => {
  const base = Math.max(0, world.adventure.findHeight(lookout.position));
  return (
    <mesh
      name={`lookout-${lookout.id}`}
      position={[
        lookout.position.x,
        base + lookout.viewHeight / 2,
        lookout.position.z,
      ]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (event.delta > clickSlopPixels) {
          return;
        }
        event.stopPropagation();
        onChosen();
      }}
    >
      <cylinderGeometry args={[1.3, 1.3, lookout.viewHeight + 1, 12]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
};

const WalkTargetMarker = ({
  walkTargetRef,
  world,
}: {
  walkTargetRef: { current: WalkTarget | undefined };
  world: AdventureWorld;
}) => {
  const marker = useRef<Mesh>(null);
  useFrame(() => {
    const target = walkTargetRef.current;
    if (marker.current === null) {
      return;
    }
    marker.current.visible = target !== undefined;
    if (target !== undefined) {
      const surface = findWalkSurface(world, target.point, Infinity);
      marker.current.position.set(
        target.point.x,
        Math.max(0, surface.height) + 0.08,
        target.point.z,
      );
    }
  });
  return (
    <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.22, 0.34, 24]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </mesh>
  );
};

const placeIslandAtOrigin = (island: IslandOnMap): IslandOnMap => ({
  ...island,
  seaPosition: { x: 0, z: 0 },
});

export const IslandExploreScene = ({
  sceneProps,
  isEffectsOn,
  timeOfDay,
  weather,
}: {
  sceneProps: IslandExploreSceneProps;
  isEffectsOn: boolean;
  timeOfDay: TimeOfDay;
  weather: Weather;
}) => {
  const { island, regions } = sceneProps;
  const adventure = findExploreAdventure(island.id);
  const world = useMemo(() => buildExploreWorld(adventure), [adventure]);
  const isOnRails = hasRailway(island.id);
  const railway = useMemo(
    () => (isOnRails ? findRailway(island.id) : undefined),
    [isOnRails, island.id],
  );
  const trainClock = useRef<TrainClock>({ seconds: 0, isStarted: false });
  const vehiclePose = useRef<VehiclePose>(undefined);
  const explorerSpot = useRef<MapPoint>(sceneProps.start);
  const rails = useMemo((): ExploreTransport | undefined => {
    if (railway === undefined) {
      return undefined;
    }
    const timetable = buildTimetable(railway);
    return {
      railway,
      timetable,
      startSeconds: findTimetableStart(railway, timetable, sceneProps.start),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the train starts its timetable once, for where the Character first stands
  }, [railway]);
  const places = useMemo(() => regions.map(scalePlaceForExplore), [regions]);
  const trailBridges = useMemo(
    () => world.bridges.filter(({ isDrawnByIsland }) => !isDrawnByIsland),
    [world],
  );
  const walkTargetRef = useRef<WalkTarget>(undefined);
  const raceRunRef = useRef<RaceRun>(undefined);
  const voyageClock = useRef<VoyageClock>({
    phase: sceneProps.voyage?.phase,
    seconds: 0,
  });
  const watchtowers = useMemo(() => listWatchtowers(adventure), [adventure]);
  const islandAtOrigin = useMemo(() => placeIslandAtOrigin(island), [island]);
  const accent = island.theme.palette.accent;
  const walkTo = (point: MapPoint, interaction?: ExploreInteraction) => {
    walkTargetRef.current = { point, interaction };
  };
  const walkToInteraction = (interaction: ExploreInteraction) => {
    walkTo(interaction.position, interaction);
  };

  return (
    <>
      <group
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          if (!isMouseWalkingPointer(event.nativeEvent)) {
            return;
          }
          walkTo({ x: event.point.x, z: event.point.z });
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          const isHeld =
            event.nativeEvent.pointerType === "mouse" &&
            (event.nativeEvent.buttons & heldLeftMouseButtons) !== 0;
          if (isHeld) {
            walkTo({ x: event.point.x, z: event.point.z });
          }
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.delta > clickSlopPixels) {
            return;
          }
          walkTo({ x: event.point.x, z: event.point.z });
        }}
      >
        <WorldMapScene
          islands={[islandAtOrigin]}
          islandInViewId={island.id}
          hasIslandFlag
          regions={regions}
          selectedRegionId={undefined}
          hoveredRegionId={sceneProps.hoveredRegionId}
          onRegionChosen={(regionId) => {
            const region = places.find(({ id }) => id === regionId);
            if (region !== undefined) {
              walkToInteraction({
                kind: "region",
                id: region.id,
                name: region.name,
                position: region.mapPosition,
              });
            }
          }}
          onRegionHovered={sceneProps.onRegionHovered}
          onIslandChosen={() => undefined}
          isEffectsOn={isEffectsOn}
          timeOfDay={timeOfDay}
          weather={weather}
          landScale={exploreScale}
        />
      </group>
      <AdventureTrails adventure={adventure} />
      {rails === undefined ? null : (
        <>
          <RailwayTrack railway={rails.railway} />
          <RailwayStructures railway={rails.railway} adventure={adventure} />
          <IslandTrain
            railway={rails.railway}
            timetable={rails.timetable}
            clock={trainClock}
          />
        </>
      )}
      {sceneProps.vehicle === undefined ? null : (
        <ParkedVehicle
          vehicle={sceneProps.vehicle.look}
          poseRef={vehiclePose}
        />
      )}
      {trailBridges.length === 0 ? null : (
        <TrailBridges bridges={trailBridges} />
      )}
      <Watchtowers
        watchtowers={watchtowers}
        world={world}
        onChosen={(lookout) => {
          walkToInteraction({
            kind: "lookout",
            id: lookout.id,
            name: lookout.name,
            position: lookout.position,
          });
        }}
      />
      {adventure.lookouts
        .filter(({ look }) => look === "island-landmark")
        .map((lookout) => (
          <LookoutTarget
            key={lookout.id}
            lookout={lookout}
            world={world}
            onChosen={() => {
              walkToInteraction({
                kind: "lookout",
                id: lookout.id,
                name: lookout.name,
                position: lookout.position,
                ...(lookout.reach === undefined
                  ? {}
                  : { reach: lookout.reach }),
              });
            }}
          />
        ))}
      <SignPosts
        adventure={adventure}
        accent={accent}
        onChosen={(sign) => {
          walkToInteraction({
            kind: "sign",
            id: sign.id,
            name: sign.title,
            position: sign.position,
          });
        }}
      />
      <HideawayDens
        adventure={adventure}
        canvas={accent}
        onChosen={(hideaway) => {
          walkToInteraction({
            kind: "hideaway",
            id: hideaway.id,
            name: hideaway.name,
            position: hideaway.position,
          });
        }}
      />
      <IslandFriends
        adventure={adventure}
        onChosen={(friend) => {
          walkToInteraction({
            kind: "friend",
            id: friend.id,
            name: friend.name,
            position: friend.position,
          });
        }}
      />
      {sceneProps.voyage === undefined ? null : (
        <IslandJourneyCraft
          adventure={adventure}
          transport={sceneProps.voyage.transport}
          clock={voyageClock}
        />
      )}
      <IslandWonders adventure={adventure} />
      <IslandAttractions
        adventure={adventure}
        darkness={findDarkness(island.id, timeOfDay)}
        explorerSpot={explorerSpot}
      />
      <IslandQuestScene
        islandId={island.id}
        progress={sceneProps.questProgress ?? findQuestProgress([], island.id)}
        explorerSpot={explorerSpot}
        onFindReached={(findId) => {
          sceneProps.onQuestFindReached?.(findId);
        }}
        onChosen={walkToInteraction}
        onWalkTo={(point) => {
          walkTo(point);
        }}
      />
      <TrailLamps world={world} glass={adventure.treasureKind.colour} />
      <BouncePads adventure={adventure} />
      <TreasureGems
        world={world}
        foundTreasureIds={sceneProps.foundTreasureIds}
      />
      {isCarriedByVoyage(sceneProps.voyage?.phase) ? null : (
        <RaceRings world={world} raceRunRef={raceRunRef} />
      )}
      <WalkTargetMarker walkTargetRef={walkTargetRef} world={world} />
      <Explorer
        world={world}
        places={places}
        sceneProps={sceneProps}
        walkTargetRef={walkTargetRef}
        voyageClock={voyageClock}
        raceRunRef={raceRunRef}
        transport={rails}
        trainClockRef={trainClock}
        vehiclePoseRef={vehiclePose}
        explorerSpotRef={explorerSpot}
      />
    </>
  );
};

export const IslandExploreCanvas = (sceneProps: IslandExploreSceneProps) => {
  const adventure = findExploreAdventure(sceneProps.island.id);
  const { onLoadingChanged, island } = sceneProps;
  useLayoutEffect(() => {
    onLoadingChanged?.({
      step: `Building ${island.name}'s land, sea, trees and houses`,
      share: 0.05,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getting ready starts once, when the Island's scene is first put on the page
  }, []);
  const timeOfDay = useTimeOfDay();
  const [weather] = useState(() => chooseWeather(Math.random));
  const look = buildIslandLook(
    placeIslandAtOrigin(sceneProps.island),
    timeOfDay,
    weather,
  );
  const [startingCamera] = useState((): [number, number, number] => [
    sceneProps.start.x - Math.sin(sceneProps.startHeading) * startingFollow,
    Math.max(0, adventure.findHeight(sceneProps.start)) + 4,
    sceneProps.start.z - Math.cos(sceneProps.startHeading) * startingFollow,
  ]);
  return (
    <div className="island-explore-scene">
      <DetailedCanvas
        cameraPosition={startingCamera}
        cameraFieldOfView={fieldOfView}
        renderScene={(isEffectsOn) => (
          <>
            <SkyLight look={look} />
            {sceneProps.voyage?.phase === "crossing" ? (
              <VoyageCrossingScene
                fromIsland={sceneProps.voyage.fromIsland}
                toIsland={sceneProps.voyage.toIsland}
                transport={sceneProps.voyage.transport}
                islands={sceneProps.voyage.islands}
                regions={sceneProps.voyage.regions}
                isEffectsOn={isEffectsOn}
                timeOfDay={timeOfDay}
                weather={weather}
              />
            ) : (
              <IslandExploreScene
                sceneProps={sceneProps}
                isEffectsOn={isEffectsOn}
                timeOfDay={timeOfDay}
                weather={weather}
              />
            )}
          </>
        )}
      />
    </div>
  );
};
