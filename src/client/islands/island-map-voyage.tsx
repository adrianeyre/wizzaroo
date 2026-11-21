import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { VoyageCraft, type CraftPose } from "./island-aircraft-models.js";
import { findExploreAdventure } from "./island-adventures.js";
import type { CraftPlacement } from "./island-flight.js";
import {
  buildJourneyCourse,
  buildJourneyRoute,
  findCraftPose,
  findCrossingCraftPlacement,
  findJourneyPhaseSeconds,
  isShipLike,
  placeCraftOnMap,
  type Transport,
} from "./island-journey.js";
import { VoyageShip } from "./island-ship-models.js";
import {
  shipMapScale,
  type VoyagePhase,
  type VoyagePort,
} from "./island-voyage.js";

export const mapVoyagePhases: readonly VoyagePhase[] = [
  "calling",
  "boarding",
  "departing",
  "crossing",
  "docking",
];

const chaseBack = 9;
const chaseHeight = 5;
const nearestFollow = 3;
const furthestFollow = 160;
const flatterThanOverhead = Math.PI * 0.45;

const useCraftFollowingControls = (placementRef: {
  current: CraftPlacement | undefined;
}) => {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const controls = useMemo(() => {
    const mapControls = new MapControls(camera, domElement);
    mapControls.enableDamping = true;
    mapControls.screenSpacePanning = false;
    mapControls.minDistance = nearestFollow;
    mapControls.maxDistance = furthestFollow;
    mapControls.maxPolarAngle = flatterThanOverhead;
    return mapControls;
  }, [camera, domElement]);
  useEffect(
    () => () => {
      controls.dispose();
    },
    [controls],
  );
  const followedRef = useRef<CraftPlacement | undefined>(undefined);
  useFrame(() => {
    const placement = placementRef.current;
    if (placement === undefined) {
      return;
    }
    const followed = followedRef.current;
    if (followed === undefined) {
      controls.target.set(placement.x, placement.y, placement.z);
      camera.position.set(
        placement.x - Math.sin(placement.heading) * chaseBack,
        placement.y + chaseHeight,
        placement.z - Math.cos(placement.heading) * chaseBack,
      );
    } else {
      const moved = new Vector3(
        placement.x - followed.x,
        placement.y - followed.y,
        placement.z - followed.z,
      );
      controls.target.add(moved);
      camera.position.add(moved);
    }
    followedRef.current = placement;
    controls.update();
  });
};

export const MapVoyage = ({
  from,
  to,
  transport,
  phases,
  onCraftMoved,
  onFinished,
}: {
  from: VoyagePort;
  to: VoyagePort;
  transport: Transport;
  phases: readonly VoyagePhase[];
  onCraftMoved: (placement: CraftPlacement) => void;
  onFinished: () => void;
}) => {
  const route = useMemo(
    () => buildJourneyRoute(from, to, transport),
    [from, to, transport],
  );
  const course = useMemo(() => buildJourneyCourse(route), [route]);
  const clockRef = useRef({ phaseIndex: 0, seconds: 0, isFinished: false });
  const poseRef = useRef<CraftPose | undefined>(undefined);
  const placementRef = useRef<CraftPlacement | undefined>(undefined);
  const latest = useRef({ onCraftMoved, onFinished });
  useEffect(() => {
    latest.current = { onCraftMoved, onFinished };
  });

  const moveCraft = useCallback(
    (deltaSeconds: number): CraftPose | undefined => {
      const clock = clockRef.current;
      if (clock.isFinished) {
        return poseRef.current;
      }
      clock.seconds += deltaSeconds;
      const phase = phases[clock.phaseIndex];
      const phaseSeconds = findJourneyPhaseSeconds(transport, phase, route);
      const share = Math.min(1, clock.seconds / phaseSeconds);
      const port = phase === "docking" || phase === "landing" ? to : from;
      const placement =
        phase === "crossing"
          ? findCrossingCraftPlacement(transport, course, share)
          : placeCraftOnMap(port, transport, phase, share);
      poseRef.current = isShipLike(transport)
        ? { placement, opening: 0 }
        : findCraftPose(
            findExploreAdventure(port.islandId),
            transport,
            phase,
            share,
            placement,
          );
      placementRef.current = placement;
      if (clock.seconds >= phaseSeconds) {
        clock.seconds = 0;
        clock.phaseIndex += 1;
        if (clock.phaseIndex >= phases.length) {
          clock.isFinished = true;
          latest.current.onFinished();
        }
      }
      latest.current.onCraftMoved(placement);
      return poseRef.current;
    },
    [course, from, phases, route, to, transport],
  );

  useCraftFollowingControls(placementRef);

  return isShipLike(transport) ? (
    <VoyageShip
      findPlacement={(deltaSeconds) => moveCraft(deltaSeconds)?.placement}
      scale={shipMapScale}
      name={transport === "ship" ? "map-ship" : `map-${transport}`}
      ship={transport}
    />
  ) : (
    <VoyageCraft
      craft={transport}
      findPose={moveCraft}
      scale={shipMapScale}
      name={`map-${transport}`}
    />
  );
};
