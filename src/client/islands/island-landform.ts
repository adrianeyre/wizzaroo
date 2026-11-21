import { Color, type BufferGeometry } from "three";
import type { IslandRegionLandmark } from "../../curriculum/islands.js";
import type { GroundPainter } from "../world-map-models.js";
import type { surfaceGrains } from "../world-map-shaders.js";
import {
  findDistanceToSegment,
  findLayeredNoise,
  smoothStep,
  type MapPoint,
  type ScatteredThing,
  type NewLands,
} from "../world-map-terrain.js";

export type GrainName = keyof typeof surfaceGrains;

export interface CoastBlob {
  x: number;
  z: number;
  radiusX: number;
  radiusZ: number;
}

export type WaterKind = "river" | "ice" | "lava";

export interface WaterCourse {
  name: string;
  kind: WaterKind;
  course: MapPoint[];
  halfWidth: number;
}

export interface WaterPool {
  name: string;
  centre: MapPoint;
  radius: number;
}

export interface IslandScatter {
  name: string;
  things: ScatteredThing[];
  buildGeometry: () => BufferGeometry;
  sink: number;
  grain: GrainName;
  tintSpread?: number;
  glow?: string;
}

export interface IslandFeature {
  name: string;
  buildGeometry: () => BufferGeometry;
  position: MapPoint;
  lift?: number;
  turn?: number;
  scale?: number;
  grain: GrainName;
}

export const newLandCopySuffix = "-new-land-";

export const copySightsOntoNewLands = (
  sights: readonly IslandFeature[],
  spots: readonly MapPoint[],
): IslandFeature[] =>
  spots.map((position, index) => {
    const sight = sights[index % sights.length];
    return {
      ...sight,
      name: `${sight.name}${newLandCopySuffix}${String(index + 1)}`,
      position,
      turn: (sight.turn ?? 0) + (index + 1) * 1.3,
    };
  });

export interface RegionLandmarkDesign {
  buildGeometry: () => BufferGeometry;
  grain: GrainName;
}

export type SharedSubjectLandmark = "easel" | "workshop" | "embassy";

export type IslandOwnLandmark = Exclude<
  IslandRegionLandmark,
  "big-top" | "challenge-arena" | SharedSubjectLandmark
>;

export type IslandLandmarkDesigns = Partial<
  Record<IslandOwnLandmark, RegionLandmarkDesign>
>;

export interface IslandLandform {
  findHeight: (point: MapPoint) => number;
  paintGround: GroundPainter;
  findDistanceToWater: (point: MapPoint) => number;
  waterCourses: WaterCourse[];
  pools: WaterPool[];
  listScatters: (
    keepClearOf: MapPoint[],
    propPlaces: readonly MapPoint[],
    isClearOfTrailsAndAirfield: (point: MapPoint) => boolean,
  ) => IslandScatter[];
  features: IslandFeature[];
  newLands: NewLands;
}

const coastStart = 0.8;

export const buildIsletBlob = ({ x, z }: MapPoint): CoastBlob => ({
  x,
  z,
  radiusX: 3.6,
  radiusZ: 2.8,
});

export const findCoastShare = (
  point: MapPoint,
  blobs: readonly CoastBlob[],
): number => {
  const wobble =
    0.12 * findLayeredNoise({ x: point.x * 0.12, z: point.z * 0.12 });
  const nearestReach = Math.min(
    ...blobs.map(({ x, z, radiusX, radiusZ }) =>
      Math.hypot((point.x - x) / radiusX, (point.z - z) / radiusZ),
    ),
  );
  return 1 - smoothStep(coastStart, 1, nearestReach + wobble);
};

export const findDistanceToCourse = (
  point: MapPoint,
  course: readonly MapPoint[],
): number =>
  Math.min(
    ...course
      .slice(1)
      .map((end, index) => findDistanceToSegment(point, course[index], end)),
  );

export const findDistanceToCourses = (
  point: MapPoint,
  courses: readonly WaterCourse[],
): number =>
  Math.min(
    Infinity,
    ...courses.map(({ course, halfWidth }) =>
      Math.max(0, findDistanceToCourse(point, course) - halfWidth),
    ),
  );

export const findDistanceToPools = (
  point: MapPoint,
  pools: readonly WaterPool[],
): number =>
  Math.min(
    Infinity,
    ...pools.map(({ centre, radius }) =>
      Math.max(0, Math.hypot(point.x - centre.x, point.z - centre.z) - radius),
    ),
  );

export const carveCourses = (
  land: number,
  point: MapPoint,
  courses: readonly WaterCourse[],
  depth: number,
): number =>
  courses.reduce((height, { course, halfWidth }) => {
    const distance = findDistanceToCourse(point, course);
    const channel = 1 - smoothStep(halfWidth, halfWidth + 1.2, distance);
    return height - depth * channel;
  }, land);

export const sinkIntoSea = (land: number, landShare: number): number =>
  landShare * land - (1 - landShare) * 3.5;

export interface GroundScheme {
  seabed: string;
  deepSeabed: string;
  shore: string;
  lowland: string;
  lowlandVariant: string;
  upland: string;
  cliff: string;
  peak: string;
  uplandHeight: number;
  peakHeight: number;
  paintExtras?: (colour: Color, point: MapPoint, height: number) => void;
}

export const buildGroundPainter = (scheme: GroundScheme): GroundPainter => {
  const seabed = new Color(scheme.seabed);
  const deepSeabed = new Color(scheme.deepSeabed);
  const shore = new Color(scheme.shore);
  const lowland = new Color(scheme.lowland);
  const lowlandVariant = new Color(scheme.lowlandVariant);
  const upland = new Color(scheme.upland);
  const cliff = new Color(scheme.cliff);
  const peak = new Color(scheme.peak);
  return (x, z, height, upness) => {
    const point = { x, z };
    const speckle = findLayeredNoise({ x: x * 1.7, z: z * 1.7 }, 3);
    const broad = findLayeredNoise({ x: x * 0.21, z: z * 0.21 }, 3);
    if (height < 0) {
      return seabed.clone().lerp(deepSeabed, smoothStep(0, -1.6, height));
    }
    const colour = lowland
      .clone()
      .lerp(lowlandVariant, smoothStep(-0.15, 0.2, broad + speckle * 0.3));
    colour.lerp(
      upland,
      smoothStep(
        scheme.uplandHeight - 0.6,
        scheme.uplandHeight + 0.6,
        height + speckle * 1.2,
      ),
    );
    const shoreLine = 0.3 + speckle * 0.25;
    colour.lerp(
      shore,
      1 - smoothStep(shoreLine - 0.1, shoreLine + 0.12, height),
    );
    scheme.paintExtras?.(colour, point, height);
    const steepness = 1 - smoothStep(0.6, 0.86, upness + speckle * 0.08);
    colour.lerp(cliff, height > 0.6 ? steepness : 0);
    colour.lerp(
      peak,
      smoothStep(
        scheme.peakHeight - 0.5,
        scheme.peakHeight + 0.5,
        height + speckle * 1.4,
      ) * smoothStep(0.5, 0.75, upness),
    );
    return colour.multiplyScalar(0.94 + speckle * 0.22);
  };
};
