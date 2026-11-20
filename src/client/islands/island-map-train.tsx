import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  IcosahedronGeometry,
  Matrix3,
  Matrix4,
  Quaternion,
  Vector3,
  type Mesh,
} from "three";
import { useMotionScale } from "../world-map-hooks.js";
import {
  findChimneyDistance,
  findTrainCarSpots,
  listTrainVehicleSpans,
} from "./island-railway-models.js";
import {
  allowTunnelClipping,
  buildClippedTrainMaterials,
  buildPortalPlanes,
  findTrainInTunnels,
  placePortalPlanes,
} from "./island-train-tunnels.js";
import type { RailSpot, Railway } from "./island-railway.js";
import { findPuffLook, SteamSmokeTrail } from "./island-steam-smoke.js";
import {
  findFirstCarriageIndex,
  findIslandTrain,
  listTrainVehicles,
  mapTrainScale,
  type TrainDesign,
} from "./island-train-design.js";
import {
  buildTimetable,
  findTimetableStart,
  findTrainPosition,
} from "./island-train-timetable.js";
import { finishes } from "./trains/train-kit.js";

const mapCarriageCount = 2;
const mapPuffCount = 14;
const puffColour = new Color("#e7e5e1");

interface PartRange {
  part: number;
  start: number;
  count: number;
}

export interface MapTrainModel {
  geometry: BufferGeometry;
  ranges: PartRange[];
  restingPositions: Float32Array;
  restingNormals: Float32Array;
  vehicleCount: number;
  puffCount: number;
}

const buildPuffGeometry = (): BufferGeometry => {
  const puff = new IcosahedronGeometry(1, 1);
  puff.deleteAttribute("uv");
  const count = puff.getAttribute("position").count;
  const colours = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    puffColour.toArray(colours, index * 3);
  }
  puff.setAttribute("color", new BufferAttribute(colours, 3));
  puff.addGroup(0, count, 0);
  return puff;
};

const listMapVehicles = (design: TrainDesign) =>
  listTrainVehicles(design).slice(
    0,
    findFirstCarriageIndex(design) +
      Math.min(mapCarriageCount, design.carriageCount),
  );

/**
 * The World Map's Train as one mesh: its light map vehicles and, for a
 * steam engine, its smoke puffs, laid out finish by finish so the one
 * mesh still draws paint, glass and metal with their own materials, and
 * moved part by part every frame.
 */
export const buildMapTrainModel = (design: TrainDesign): MapTrainModel => {
  const vehicles = listMapVehicles(design).map(({ model }) =>
    model.build("map").scale(mapTrainScale, mapTrainScale, mapTrainScale),
  );
  const puffCount = design.chimney === undefined ? 0 : mapPuffCount;
  const parts = [
    ...vehicles,
    ...Array.from({ length: puffCount }, buildPuffGeometry),
  ];
  const ranges: PartRange[] = [];
  const positions: number[] = [];
  const normals: number[] = [];
  const colours: number[] = [];
  const geometry = new BufferGeometry();
  finishes.forEach((_, materialIndex) => {
    const groupStart = positions.length / 3;
    parts.forEach((part, partIndex) => {
      const group = part.groups.find(
        (each) => each.materialIndex === materialIndex,
      );
      if (group === undefined || group.count === 0) {
        return;
      }
      ranges.push({
        part: partIndex,
        start: positions.length / 3,
        count: group.count,
      });
      for (const [target, name] of [
        [positions, "position"],
        [normals, "normal"],
        [colours, "color"],
      ] as const) {
        const attribute = part.getAttribute(name);
        for (
          let vertex = group.start;
          vertex < group.start + group.count;
          vertex++
        ) {
          target.push(
            attribute.getX(vertex),
            attribute.getY(vertex),
            attribute.getZ(vertex),
          );
        }
      }
    });
    geometry.addGroup(
      groupStart,
      positions.length / 3 - groupStart,
      materialIndex,
    );
  });
  for (const part of parts) {
    part.dispose();
  }
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute(
    "normal",
    new BufferAttribute(new Float32Array(normals), 3),
  );
  geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(colours), 3),
  );
  return {
    geometry,
    ranges,
    restingPositions: Float32Array.from(positions),
    restingNormals: Float32Array.from(normals),
    vehicleCount: vehicles.length,
    puffCount,
  };
};

const corner = new Vector3();
const facing = new Matrix3();

export const moveMapTrain = (
  { geometry, ranges, restingPositions, restingNormals }: MapTrainModel,
  placements: readonly Matrix4[],
): void => {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  if (
    !(positions instanceof BufferAttribute) ||
    !(normals instanceof BufferAttribute)
  ) {
    return;
  }
  for (const { part, start, count } of ranges) {
    const placement = placements[part];
    facing.getNormalMatrix(placement);
    for (let vertex = start; vertex < start + count; vertex++) {
      corner
        .fromArray(restingPositions, vertex * 3)
        .applyMatrix4(placement)
        .toArray(positions.array, vertex * 3);
      corner
        .fromArray(restingNormals, vertex * 3)
        .applyMatrix3(facing)
        .normalize()
        .toArray(normals.array, vertex * 3);
    }
  }
  positions.needsUpdate = true;
  normals.needsUpdate = true;
  geometry.computeBoundingSphere();
};

const placeOnRail = (spot: RailSpot, size = 1): Matrix4 =>
  new Matrix4().compose(
    new Vector3(spot.x, spot.y, spot.z),
    new Quaternion().setFromEuler(
      new Euler(spot.pitch, spot.heading, 0, "YXZ"),
    ),
    new Vector3(size, size, size),
  );

const chimneySpot = new Vector3();

class MapTrainRig {
  readonly model: MapTrainModel;
  readonly portalPlanes = buildPortalPlanes();
  readonly materials = buildClippedTrainMaterials(this.portalPlanes);
  private readonly smoke = new SteamSmokeTrail(mapTrainScale);
  private seconds = 0;
  private lastDistance: number | undefined;

  constructor(
    private readonly railway: Railway,
    private readonly design: TrainDesign,
    private readonly startSeconds: number,
  ) {
    this.model = buildMapTrainModel(design);
  }

  advance(deltaSeconds: number, motionScale: number, toWorld: Matrix4): void {
    const { railway, design } = this;
    this.seconds += deltaSeconds;
    const timetable = buildTimetableOnce(railway);
    const distance = findTrainPosition(
      railway,
      timetable,
      this.startSeconds + this.seconds,
    ).distance;
    const travelled =
      this.lastDistance === undefined ? 0 : distance - this.lastDistance;
    this.lastDistance = distance;
    const spots = findTrainCarSpots(
      railway,
      design,
      distance,
      mapTrainScale,
    ).slice(0, this.model.vehicleCount);
    const inTunnels = findTrainInTunnels(
      railway,
      listTrainVehicleSpans(design, distance, mapTrainScale).slice(
        0,
        this.model.vehicleCount,
      ),
      findChimneyDistance(design, distance, mapTrainScale),
    );
    placePortalPlanes(this.portalPlanes, inTunnels.bore, toWorld);
    const vehiclePlacements = spots.map((spot, index) =>
      placeOnRail(spot, inTunnels.hiddenVehicles[index] ? 0 : 1),
    );
    const puffPlacements: Matrix4[] = [];
    if (design.chimney !== undefined && this.model.puffCount > 0) {
      chimneySpot
        .set(...design.chimney)
        .multiplyScalar(mapTrainScale)
        .applyMatrix4(vehiclePlacements[0]);
      const step = Math.min(deltaSeconds, 0.1) * motionScale;
      const speed =
        deltaSeconds > 0 && Math.abs(travelled) < railway.length / 2
          ? travelled / deltaSeconds / mapTrainScale
          : 0;
      this.smoke.advance(step, chimneySpot, speed, !inTunnels.isChimneyInside);
      const live = this.smoke.puffs.toSorted(
        (first, second) => first.age / first.life - second.age / second.life,
      );
      for (let index = 0; index < this.model.puffCount; index++) {
        const puff = live[index];
        const look = findPuffLook(puff);
        const radius =
          look.radius * mapTrainScale * Math.sqrt(look.opacity / 0.8);
        puffPlacements.push(
          new Matrix4().compose(
            new Vector3(puff.x, puff.y + radius * 0.6, puff.z),
            new Quaternion(),
            new Vector3(1, 1, 1).multiplyScalar(Math.max(0.0001, radius)),
          ),
        );
      }
    }
    moveMapTrain(this.model, [...vehiclePlacements, ...puffPlacements]);
  }

  dispose(): void {
    this.model.geometry.dispose();
    for (const material of this.materials) {
      material.dispose();
    }
  }
}

const timetables = new WeakMap<Railway, ReturnType<typeof buildTimetable>>();

const buildTimetableOnce = (railway: Railway) => {
  const known = timetables.get(railway);
  if (known !== undefined) {
    return known;
  }
  const built = buildTimetable(railway);
  timetables.set(railway, built);
  return built;
};

export const IslandTrainOnMap = ({ railway }: { railway: Railway }) => {
  const rig = useMemo(() => {
    const design = findIslandTrain(railway.islandId);
    const startSeconds = findTimetableStart(
      railway,
      buildTimetableOnce(railway),
      { x: 0, z: 0 },
    );
    return new MapTrainRig(railway, design, startSeconds);
  }, [railway]);
  useEffect(
    () => () => {
      rig.dispose();
    },
    [rig],
  );
  const motionScale = useMotionScale();
  const isPlaced = useRef(false);
  const train = useRef<Mesh>(null);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    allowTunnelClipping(gl);
  }, [gl]);
  useFrame((_state, deltaSeconds) => {
    const mesh = train.current;
    if (mesh === null) {
      return;
    }
    rig.advance(
      isPlaced.current ? deltaSeconds : 0,
      motionScale,
      mesh.matrixWorld,
    );
    isPlaced.current = true;
  });
  return (
    <mesh
      ref={train}
      name="map-train"
      geometry={rig.model.geometry}
      material={rig.materials}
      castShadow
      frustumCulled={false}
    />
  );
};
