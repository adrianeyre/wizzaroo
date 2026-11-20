import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Object3D,
  type MeshPhysicalMaterial,
  type Plane,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type Mesh,
} from "three";
import { listOverheadLineGeometries } from "./island-overhead-line.js";
import { SteamSmoke } from "./island-steam-smoke.js";
import {
  allowTunnelClipping,
  buildClippedTrainMaterials,
  buildPortalPlanes,
  findTrainInTunnels,
  placePortalPlanes,
  type VehicleSpan,
} from "./island-train-tunnels.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { GrainedMaterial } from "../world-map-scene.js";
import { surfaceGrains } from "../world-map-shaders.js";
import type { IslandAdventure } from "./island-adventures.js";
import {
  buildRailwayStructuresGeometry,
  buildTrackGeometry,
  findRailwayLook,
} from "./island-railway-design.js";
import { findRailSpot, type RailSpot, type Railway } from "./island-railway.js";
import {
  findFirstCarriageIndex,
  findIslandTrain,
  listTrainVehicles,
  type TrainDesign,
} from "./island-train-design.js";
import type { TrainVehicleModel } from "./trains/train-kit.js";
import { findTrainPosition, type Timetable } from "./island-train-timetable.js";
import { findVehicleDesign } from "../vehicles/vehicle-designs.js";
import type { VehicleLook } from "../vehicles/vehicle-figure.js";

export interface TrainClock {
  seconds: number;
  isStarted: boolean;
}

export const RailwayTrack = ({ railway }: { railway: Railway }) => {
  const geometry = useBuiltGeometry(
    useCallback(
      () => buildTrackGeometry(railway, findRailwayLook(railway.islandId)),
      [railway],
    ),
  );
  const overheadLine = useMemo(
    () => listOverheadLineGeometries(railway, "explore").at(0),
    [railway],
  );
  useEffect(
    () => () => {
      overheadLine?.dispose();
    },
    [overheadLine],
  );
  return (
    <>
      <mesh name="railway-track" geometry={geometry} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.85}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      {overheadLine === undefined ? null : (
        <mesh
          name="railway-overhead-line"
          geometry={overheadLine}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial vertexColors roughness={0.55} metalness={0.4} />
        </mesh>
      )}
    </>
  );
};

export const RailwayStructures = ({
  railway,
  adventure,
}: {
  railway: Railway;
  adventure: IslandAdventure;
}) => {
  const geometry = useBuiltGeometry(
    useCallback(
      () =>
        buildRailwayStructuresGeometry(
          railway,
          findRailwayLook(railway.islandId),
          adventure,
        ),
      [railway, adventure],
    ),
  );
  return (
    <mesh
      name="railway-structures"
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <GrainedMaterial grain={surfaceGrains.stone} />
    </mesh>
  );
};

const bogieInset = 1.1;

export const listTrainCarOffsets = (design: TrainDesign): number[] => {
  let back = 0;
  return listTrainVehicles(design).map(({ model }, index) => {
    back += index === 0 ? 0 : design.couplingGap;
    const middle = back + model.length / 2;
    back += model.length;
    return middle;
  });
};

export const findTrainCarSpots = (
  railway: Railway,
  design: TrainDesign,
  frontDistance: number,
  scale = 1,
): RailSpot[] => {
  const vehicles = listTrainVehicles(design);
  return listTrainCarOffsets(design).map((offset, index) => {
    const half = Math.max(
      0.2,
      (vehicles[index].model.length / 2 - bogieInset) * scale,
    );
    const middle = frontDistance - offset * scale;
    return findRailSpot(railway, middle + half, middle - half);
  });
};

export const listTrainVehicleSpans = (
  design: TrainDesign,
  frontDistance: number,
  scale = 1,
): VehicleSpan[] => {
  const vehicles = listTrainVehicles(design);
  return listTrainCarOffsets(design).map((offset, index) => {
    const half = (vehicles[index].model.length / 2) * scale;
    const middle = frontDistance - offset * scale;
    return { front: middle + half, back: middle - half };
  });
};

export const findChimneyDistance = (
  design: TrainDesign,
  frontDistance: number,
  scale = 1,
): number | undefined =>
  design.chimney === undefined
    ? undefined
    : frontDistance -
      (design.locomotive.length / 2 - design.chimney[2]) * scale;

const placement = new Object3D();

const placeOnSpot = (object: Object3D, spot: RailSpot) => {
  object.position.set(spot.x, spot.y, spot.z);
  object.rotation.set(0, 0, 0);
  object.rotation.order = "YXZ";
  object.rotation.y = spot.heading;
  object.rotation.x = spot.pitch;
};

const useTrainMaterials = (
  planes: readonly [Plane, Plane],
): MeshPhysicalMaterial[] => {
  const materials = useMemo(() => buildClippedTrainMaterials(planes), [planes]);
  useEffect(
    () => () => {
      for (const material of materials) {
        material.dispose();
      }
    },
    [materials],
  );
  return materials;
};

const useVehicleGeometry = (
  model: TrainVehicleModel | undefined,
): BufferGeometry | undefined => {
  const geometry = useMemo(() => model?.build("explore"), [model]);
  useEffect(
    () => () => {
      geometry?.dispose();
    },
    [geometry],
  );
  return geometry;
};

const findTravel = (
  railway: Railway,
  from: number | undefined,
  to: number,
): number => {
  if (from === undefined) {
    return 0;
  }
  const travelled = to - from;
  return Math.abs(travelled) > railway.length / 2
    ? travelled - Math.sign(travelled) * railway.length
    : travelled;
};

export const IslandTrain = ({
  railway,
  timetable,
  clock,
}: {
  railway: Railway;
  timetable: Timetable;
  clock: { current: TrainClock };
}) => {
  const design = findIslandTrain(railway.islandId);
  const portalPlanes = useMemo(() => buildPortalPlanes(), []);
  const materials = useTrainMaterials(portalPlanes);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    allowTunnelClipping(gl);
  }, [gl]);
  const isChimneyInside = useRef(false);
  const locomotiveGeometry = useVehicleGeometry(design.locomotive);
  const tenderGeometry = useVehicleGeometry(design.tender);
  const carriageGeometry = useVehicleGeometry(design.carriage);
  const locomotive = useRef<Mesh>(null);
  const tender = useRef<Mesh>(null);
  const carriages = useRef<InstancedMesh>(null);
  const speed = useRef(0);
  const lastDistance = useRef<number | undefined>(undefined);
  const firstCarriage = findFirstCarriageIndex(design);
  useFrame((_state, deltaSeconds) => {
    const { distance } = findTrainPosition(
      railway,
      timetable,
      clock.current.seconds,
    );
    if (deltaSeconds > 0) {
      speed.current =
        findTravel(railway, lastDistance.current, distance) / deltaSeconds;
    }
    lastDistance.current = distance;
    const spots = findTrainCarSpots(railway, design, distance);
    const inTunnels = findTrainInTunnels(
      railway,
      listTrainVehicleSpans(design, distance),
      findChimneyDistance(design, distance),
    );
    isChimneyInside.current = inTunnels.isChimneyInside;
    const { hiddenVehicles } = inTunnels;
    [locomotive.current, tender.current].forEach((vehicle, index) => {
      if (vehicle !== null) {
        placeOnSpot(vehicle, spots[index]);
        vehicle.visible = !hiddenVehicles[index];
      }
    });
    const mesh = carriages.current;
    if (mesh === null) {
      return;
    }
    if (mesh.parent !== null) {
      placePortalPlanes(portalPlanes, inTunnels.bore, mesh.parent.matrixWorld);
    }
    spots.slice(firstCarriage).forEach((spot, index) => {
      placeOnSpot(placement, spot);
      if (hiddenVehicles[firstCarriage + index]) {
        placement.scale.setScalar(0);
      }
      placement.updateMatrix();
      placement.scale.setScalar(1);
      mesh.setMatrixAt(index, placement.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="train">
      <mesh
        ref={locomotive}
        name="train-locomotive"
        geometry={locomotiveGeometry}
        material={materials}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      {tenderGeometry === undefined ? null : (
        <mesh
          ref={tender}
          name="train-tender"
          geometry={tenderGeometry}
          material={materials}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      )}
      <instancedMesh
        ref={carriages}
        name="train-carriages"
        args={[carriageGeometry, materials, design.carriageCount]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      {design.chimney === undefined ? null : (
        <SteamSmoke
          name="train-smoke"
          chimney={design.chimney}
          locomotive={locomotive}
          speed={speed}
          isChimneyInside={isChimneyInside}
        />
      )}
    </group>
  );
};

export interface VehiclePose {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
}

export const ParkedVehicle = ({
  vehicle,
  poseRef,
}: {
  vehicle: VehicleLook;
  poseRef: { current: VehiclePose | undefined };
}) => {
  const geometry = useBuiltGeometry(
    useCallback(() => {
      const design = findVehicleDesign(vehicle.model);
      if (design === undefined) {
        throw new Error(`No vehicle design for "${vehicle.model}"`);
      }
      return design.buildGeometry(vehicle.colour);
    }, [vehicle.model, vehicle.colour]),
  );
  const body = useRef<Group>(null);
  useFrame(() => {
    const pose = poseRef.current;
    const group = body.current;
    if (group === null) {
      return;
    }
    group.visible = pose !== undefined;
    if (pose !== undefined) {
      group.position.set(pose.x, pose.y, pose.z);
      group.rotation.order = "YXZ";
      group.rotation.set(pose.pitch, pose.heading, 0);
    }
  });
  return (
    <group ref={body} name="placed-vehicle" visible={false}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial vertexColors roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  );
};

export const useTrainTimetable = (
  railway: Railway,
  buildTimetable: (railway: Railway) => Timetable,
): Timetable =>
  useMemo(() => buildTimetable(railway), [railway, buildTimetable]);
