import { raiseTunnelHills } from "./islands/island-tunnel-hills.js";
import { mapHalfDepth, mapHalfWidth } from "../curriculum/world-map.js";

export interface MapPoint {
  x: number;
  z: number;
}

export const seaLevel = 0;
export const riverBedDepth = -0.7;
export const snowLine = 6;

export const mountainLakePosition: MapPoint = { x: 9.6, z: -2.6 };
export const mountainLakeRadius = 1.7;

export const riverCourse: MapPoint[] = [
  { x: 8.6, z: -1.4 },
  { x: 6.4, z: 0.4 },
  { x: 4, z: 2 },
  { x: 2, z: 8 },
  { x: 1, z: 14 },
  { x: 0, z: 21 },
];

export const volcanoPosition: MapPoint = { x: -19, z: -9 };
export const mountainPosition: MapPoint = { x: 15, z: -10 };
export const lighthousePosition: MapPoint = { x: 22, z: 8 };
export const meadowIslet: MapPoint = { x: 21, z: 16 };

export const villageCentres: MapPoint[] = [
  { x: -9, z: 11 },
  { x: 6, z: 9 },
  { x: -1, z: -9 },
];

const riverHalfWidth = 0.7;
const riverBankWidth = 1.3;
const coastWidth = 0.22;
const lakeBasinWidth = 4;
const lakeShoreHeight = 0.9;
const isletRadius = 3.2;

export const smoothStep = (
  edge0: number,
  edge1: number,
  value: number,
): number => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export const findBump = (
  { x, z }: MapPoint,
  centre: MapPoint,
  radius: number,
): number => {
  const distanceSquared = (x - centre.x) ** 2 + (z - centre.z) ** 2;
  return Math.exp(-distanceSquared / (radius * radius));
};

export const findDistanceToSegment = (
  point: MapPoint,
  start: MapPoint,
  end: MapPoint,
): number => {
  const lengthX = end.x - start.x;
  const lengthZ = end.z - start.z;
  const along = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * lengthX + (point.z - start.z) * lengthZ) /
        (lengthX * lengthX + lengthZ * lengthZ),
    ),
  );
  return Math.hypot(
    point.x - (start.x + along * lengthX),
    point.z - (start.z + along * lengthZ),
  );
};

export const findDistanceToRiver = (point: MapPoint): number =>
  Math.min(
    ...riverCourse
      .slice(1)
      .map((end, index) =>
        findDistanceToSegment(point, riverCourse[index], end),
      ),
  );

const hashLattice = (column: number, row: number): number => {
  const mixed = Math.sin(column * 127.1 + row * 311.7) * 43_758.545_3;
  return mixed - Math.floor(mixed);
};

export const findSmoothNoise = (x: number, z: number): number => {
  const column = Math.floor(x);
  const row = Math.floor(z);
  const acrossX = smoothStep(0, 1, x - column);
  const acrossZ = smoothStep(0, 1, z - row);
  const top =
    hashLattice(column, row) * (1 - acrossX) +
    hashLattice(column + 1, row) * acrossX;
  const bottom =
    hashLattice(column, row + 1) * (1 - acrossX) +
    hashLattice(column + 1, row + 1) * acrossX;
  return top * (1 - acrossZ) + bottom * acrossZ;
};

export const findLayeredNoise = ({ x, z }: MapPoint, layers = 4): number => {
  let total = 0;
  let strength = 0.5;
  let frequency = 1;
  for (let layer = 0; layer < layers; layer++) {
    total += strength * (findSmoothNoise(x * frequency, z * frequency) - 0.5);
    strength *= 0.5;
    frequency *= 2.03;
  }
  return total;
};

const findRidges = (point: MapPoint): number => {
  let total = 0;
  let strength = 0.5;
  let frequency = 0.35;
  for (let layer = 0; layer < 4; layer++) {
    const ridge =
      1 -
      Math.abs(
        findSmoothNoise(point.x * frequency + 17, point.z * frequency - 9) * 2 -
          1,
      );
    total += strength * ridge * ridge;
    strength *= 0.5;
    frequency *= 2.1;
  }
  return total;
};

export const findDistanceToFreshWater = (point: MapPoint): number =>
  Math.min(
    findDistanceToRiver(point),
    Math.max(
      0,
      Math.hypot(
        point.x - mountainLakePosition.x,
        point.z - mountainLakePosition.z,
      ) - mountainLakeRadius,
    ),
  );

export interface NewLandBlob {
  centre: MapPoint;
  radiusX: number;
  radiusZ: number;
}

export interface NewLandHill {
  centre: MapPoint;
  radius: number;
  rise: number;
}

export interface NewLandLake {
  centre: MapPoint;
  radius: number;
}

export interface NewLands {
  blobs: NewLandBlob[];
  hills: NewLandHill[];
  lakes: NewLandLake[];
  rivers: MapPoint[][];
}

export const newLandRiverHalfWidth = 0.55;
const newLandRiverBankWidth = 1.3;
const newLandRiverDepth = 0.55;
const riverBedSpacing = 0.25;

export const newLandLakeFloor = -1.4;
const lakeShoreWidth = 1.6;
export const newLandPeakRise = 1.8;

const newLandCoastStart = 0.82;
const seaFloorBelowNewLand = 3.5;

export const findNewLandShare = (
  point: MapPoint,
  blobs: readonly NewLandBlob[],
): number => {
  const wobble =
    0.1 * findLayeredNoise({ x: point.x * 0.13 + 40, z: point.z * 0.13 }, 3);
  const nearestReach = Math.min(
    ...blobs.map(({ centre, radiusX, radiusZ }) =>
      Math.hypot(
        (point.x - centre.x) / radiusX,
        (point.z - centre.z) / radiusZ,
      ),
    ),
  );
  return 1 - smoothStep(newLandCoastStart, 1, nearestReach + wobble);
};

export const findNewLandHeight = (
  point: MapPoint,
  { blobs, hills, lakes }: NewLands,
): number => {
  const landShare = findNewLandShare(point, blobs);
  if (landShare <= 0) {
    return -seaFloorBelowNewLand;
  }
  const rolling =
    1 +
    0.35 * Math.sin(point.x * 0.29) * Math.cos(point.z * 0.37) +
    0.8 * findLayeredNoise({ x: point.x * 0.17 + 11, z: point.z * 0.17 });
  const raised = hills.reduce(
    (total, { centre, radius, rise }) =>
      total + rise * findBump(point, centre, radius),
    rolling,
  );
  const land = landShare * raised - (1 - landShare) * seaFloorBelowNewLand;
  return lakes.reduce((height, { centre, radius }) => {
    const shore = smoothStep(
      radius,
      radius + lakeShoreWidth,
      Math.hypot(point.x - centre.x, point.z - centre.z),
    );
    return height * shore + newLandLakeFloor * (1 - shore);
  }, land);
};

interface RiverBedSample extends MapPoint {
  bed: number;
}

interface RiverBed {
  samples: RiverBedSample[];
  lowest: MapPoint;
  highest: MapPoint;
}

const listCourseSamples = (course: readonly MapPoint[]): MapPoint[] =>
  course.slice(1).flatMap((end, index) => {
    const start = course[index];
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(end.x - start.x, end.z - start.z) / riverBedSpacing),
    );
    return Array.from(
      { length: steps + (index === course.length - 2 ? 1 : 0) },
      (_, step) => ({
        x: start.x + ((end.x - start.x) * step) / steps,
        z: start.z + ((end.z - start.z) * step) / steps,
      }),
    );
  });

const buildRiverBed = (
  findHeight: (point: MapPoint) => number,
  course: readonly MapPoint[],
): RiverBed => {
  let lowestSoFar = Infinity;
  const samples = listCourseSamples(course).map((point) => {
    lowestSoFar = Math.min(lowestSoFar, findHeight(point));
    return { ...point, bed: lowestSoFar - newLandRiverDepth };
  });
  const reach = newLandRiverHalfWidth + newLandRiverBankWidth;
  return {
    samples,
    lowest: {
      x: Math.min(...samples.map(({ x }) => x)) - reach,
      z: Math.min(...samples.map(({ z }) => z)) - reach,
    },
    highest: {
      x: Math.max(...samples.map(({ x }) => x)) + reach,
      z: Math.max(...samples.map(({ z }) => z)) + reach,
    },
  };
};

const findNearestBed = (
  { samples }: RiverBed,
  point: MapPoint,
): { distance: number; bed: number } =>
  samples.slice(1).reduce(
    (nearest, end, index) => {
      const start = samples[index];
      const alongX = end.x - start.x;
      const alongZ = end.z - start.z;
      const share = Math.min(
        1,
        Math.max(
          0,
          ((point.x - start.x) * alongX + (point.z - start.z) * alongZ) /
            (alongX * alongX + alongZ * alongZ || 1),
        ),
      );
      const distance = Math.hypot(
        point.x - start.x - alongX * share,
        point.z - start.z - alongZ * share,
      );
      return distance < nearest.distance
        ? { distance, bed: start.bed + (end.bed - start.bed) * share }
        : nearest;
    },
    { distance: Infinity, bed: 0 },
  );

const isNearBed = ({ lowest, highest }: RiverBed, { x, z }: MapPoint) =>
  x >= lowest.x && x <= highest.x && z >= lowest.z && z <= highest.z;

export const carveRiverBeds = (
  findHeight: (point: MapPoint) => number,
  courses: readonly (readonly MapPoint[])[],
): ((point: MapPoint) => number) => {
  const beds = courses.map((course) => buildRiverBed(findHeight, course));
  return (point) =>
    beds.reduce((height, riverBed) => {
      if (!isNearBed(riverBed, point)) {
        return height;
      }
      const { distance, bed } = findNearestBed(riverBed, point);
      const channel =
        1 -
        smoothStep(
          newLandRiverHalfWidth,
          newLandRiverHalfWidth + newLandRiverBankWidth,
          distance,
        );
      return height + (Math.min(height, bed) - height) * channel;
    }, findHeight(point));
};

export const findDistanceToNewLandRivers = (
  point: MapPoint,
  { rivers }: NewLands,
): number =>
  Math.min(
    Infinity,
    ...rivers.map((course) =>
      Math.max(
        0,
        Math.min(
          ...course
            .slice(1)
            .map((end, index) =>
              findDistanceToSegment(point, course[index], end),
            ),
        ) - newLandRiverHalfWidth,
      ),
    ),
  );

export const isInNewLandRiver = (
  point: MapPoint,
  newLands: NewLands,
): boolean => findDistanceToNewLandRivers(point, newLands) <= 0.15;

export const extendWithNewLands = (
  findCoreHeight: (point: MapPoint) => number,
  newLands: NewLands,
): ((point: MapPoint) => number) =>
  carveRiverBeds(
    (point) =>
      Math.max(findCoreHeight(point), findNewLandHeight(point, newLands)),
    newLands.rivers,
  );

export interface Runway {
  centre: MapPoint;
  heading: number;
  level: number;
}

export interface Helipad {
  centre: MapPoint;
  heading: number;
  level: number;
}

export interface BalloonField {
  centre: MapPoint;
  heading: number;
  level: number;
}

export interface Airfield {
  runway: Runway;
  helipad: Helipad;
  balloonField: BalloonField;
}

export const runwayHalfLength = 7.5;
export const runwayFlatHalfWidth = 1.5;
export const helipadFlatRadius = 1.8;
export const balloonFieldFlatRadius = 1.6;
const airfieldBlendWidth = 1.5;

export const findRunwayOffset = (
  { centre, heading }: { centre: MapPoint; heading: number },
  point: MapPoint,
): { along: number; across: number } => {
  const offsetX = point.x - centre.x;
  const offsetZ = point.z - centre.z;
  return {
    along: offsetX * Math.sin(heading) + offsetZ * Math.cos(heading),
    across: offsetX * Math.cos(heading) - offsetZ * Math.sin(heading),
  };
};

export const runwayApproachLength = 12;
const airfieldMargin = 1;

/**
 * Whether a point is on the Runway or the strip beyond either end that
 * aeroplanes fly low over, on the Helipad or on the Balloon Field.
 */
export const isOnAirfield = (
  { runway, helipad, balloonField }: Airfield,
  point: MapPoint,
): boolean => {
  const { along, across } = findRunwayOffset(runway, point);
  return (
    (Math.abs(along) <= runwayHalfLength + runwayApproachLength &&
      Math.abs(across) <= runwayFlatHalfWidth + airfieldMargin) ||
    Math.hypot(point.x - helipad.centre.x, point.z - helipad.centre.z) <=
      helipadFlatRadius + airfieldMargin ||
    Math.hypot(
      point.x - balloonField.centre.x,
      point.z - balloonField.centre.z,
    ) <=
      balloonFieldFlatRadius + airfieldMargin
  );
};

const findReachBeyondRunway = (runway: Runway, point: MapPoint): number => {
  const { along, across } = findRunwayOffset(runway, point);
  return Math.hypot(
    Math.max(0, Math.abs(along) - runwayHalfLength),
    Math.max(0, Math.abs(across) - runwayFlatHalfWidth),
  );
};

const findReachBeyondCircle = (
  { centre }: { centre: MapPoint },
  flatRadius: number,
  point: MapPoint,
): number =>
  Math.max(0, Math.hypot(point.x - centre.x, point.z - centre.z) - flatRadius);

const levelTowards = (height: number, level: number, reach: number): number =>
  reach >= airfieldBlendWidth
    ? height
    : height +
      (level - height) * (1 - smoothStep(0, airfieldBlendWidth, reach));

const levelCircleTowards = (
  height: number,
  { centre, level }: { centre: MapPoint; level: number },
  flatRadius: number,
  point: MapPoint,
): number => {
  const offsetX = point.x - centre.x;
  const offsetZ = point.z - centre.z;
  const outerReach = flatRadius + airfieldBlendWidth;
  if (offsetX * offsetX + offsetZ * offsetZ >= outerReach * outerReach) {
    return height;
  }
  return levelTowards(
    height,
    level,
    findReachBeyondCircle({ centre }, flatRadius, point),
  );
};

export const levelAirfield =
  (
    findHeight: (point: MapPoint) => number,
    { runway, helipad, balloonField }: Airfield,
  ) =>
  (point: MapPoint): number => {
    const underRunway = levelTowards(
      findHeight(point),
      runway.level,
      findReachBeyondRunway(runway, point),
    );
    const underHelipad = levelCircleTowards(
      underRunway,
      helipad,
      helipadFlatRadius,
      point,
    );
    return levelCircleTowards(
      underHelipad,
      balloonField,
      balloonFieldFlatRadius,
      point,
    );
  };

const balloonFieldPlaceReach = 1.1;

export const listAirfieldPlaces = ({
  runway,
  helipad,
  balloonField,
}: Airfield): MapPoint[] => {
  const forward = { x: Math.sin(runway.heading), z: Math.cos(runway.heading) };
  const side = { x: Math.cos(runway.heading), z: -Math.sin(runway.heading) };
  const runwayPlaces = Array.from(
    { length: Math.round(runwayHalfLength) * 2 + 1 },
    (_, step) => step - Math.round(runwayHalfLength),
  ).flatMap((along) =>
    [-1, 0, 1].map((across) => ({
      x: runway.centre.x + forward.x * along + side.x * across,
      z: runway.centre.z + forward.z * along + side.z * across,
    })),
  );
  const helipadPlaces = Array.from({ length: 6 }, (_, spoke) => ({
    x: helipad.centre.x + Math.cos((spoke * Math.PI) / 3),
    z: helipad.centre.z + Math.sin((spoke * Math.PI) / 3),
  }));
  const balloonFieldPlaces = Array.from({ length: 8 }, (_, spoke) => ({
    x:
      balloonField.centre.x +
      Math.cos((spoke * Math.PI) / 4) * balloonFieldPlaceReach,
    z:
      balloonField.centre.z +
      Math.sin((spoke * Math.PI) / 4) * balloonFieldPlaceReach,
  }));
  return [
    ...runwayPlaces,
    helipad.centre,
    ...helipadPlaces,
    balloonField.centre,
    ...balloonFieldPlaces,
  ];
};

/**
 * The far reaches of the new lands, one beyond each, joined to it at
 * its outer coast (ADR 0068).
 */
export const newLandFarReaches: readonly NewLandBlob[] = [
  { centre: { x: 92, z: 0 }, radiusX: 18, radiusZ: 19 },
  { centre: { x: -92, z: 0 }, radiusX: 18, radiusZ: 19 },
];

/** How far out from an Island's middle its land can reach, east or west. */
export const islandHalfReach = 112;

export const buildSideLands = ({
  eastJoinZ,
  westJoinZ,
  hillRise,
  lakes,
  rivers,
}: {
  eastJoinZ: number;
  westJoinZ: number;
  hillRise: number;
  lakes: NewLandLake[];
  rivers: MapPoint[][];
}): NewLands => ({
  lakes,
  rivers,
  blobs: [
    { centre: { x: 52, z: 0 }, radiusX: 26, radiusZ: 20.5 },
    { centre: { x: -52, z: 0 }, radiusX: 26, radiusZ: 20.5 },
    { centre: { x: 27.5, z: eastJoinZ }, radiusX: 6.5, radiusZ: 3.4 },
    { centre: { x: -27.5, z: westJoinZ }, radiusX: 6.5, radiusZ: 3.4 },
    // The far reaches: each new land grows on outwards, where the
    // fifteen more Attractions of ADR 0068 stand.
    ...newLandFarReaches,
  ],
  hills: [
    { centre: { x: 58, z: -8 }, radius: 5, rise: hillRise * newLandPeakRise },
    { centre: { x: 46, z: 8 }, radius: 4, rise: hillRise * 0.7 },
    { centre: { x: 66, z: 6 }, radius: 3.5, rise: hillRise * 0.55 },
    { centre: { x: -58, z: 8 }, radius: 5, rise: hillRise * newLandPeakRise },
    { centre: { x: -46, z: -8 }, radius: 4, rise: hillRise * 0.7 },
    { centre: { x: -66, z: -6 }, radius: 3.5, rise: hillRise * 0.55 },
    { centre: { x: 100, z: -11 }, radius: 4, rise: hillRise * 0.35 },
    { centre: { x: -100, z: 11 }, radius: 4, rise: hillRise * 0.35 },
  ],
});

export const listNewLandPeaks = ({ hills }: NewLands): MapPoint[] =>
  hills.filter(({ radius }) => radius === 5).map(({ centre }) => centre);

export const findLandShare = ({ x, z }: MapPoint): number => {
  const wobble = 0.07 * Math.sin(x * 0.45) * Math.cos(z * 0.6);
  const distanceFromMiddle = Math.hypot(
    x / (mapHalfWidth + 2),
    z / (mapHalfDepth + 2),
  );
  const mainland =
    1 - smoothStep(1 - coastWidth, 1, distanceFromMiddle + wobble);
  const islet =
    1 -
    smoothStep(
      isletRadius - 1,
      isletRadius,
      Math.hypot(x - meadowIslet.x, z - meadowIslet.z) + wobble * 4,
    );
  return Math.max(mainland, islet);
};

const findMeadowCoreHeight = (point: MapPoint): number => {
  const landShare = findLandShare(point);
  const hills =
    1.1 +
    0.5 * Math.sin(point.x * 0.33) * Math.cos(point.z * 0.41) +
    0.9 * findLayeredNoise({ x: point.x * 0.18, z: point.z * 0.18 });
  const mountainShare =
    findBump(point, mountainPosition, 6) +
    0.4 * findBump(point, { x: 9, z: -12 }, 3.5);
  const mountains = mountainShare * (6 + 4.5 * findRidges(point));
  const volcano =
    6 * findBump(point, volcanoPosition, 4.2) -
    1.6 * findBump(point, volcanoPosition, 1.1);
  const lakeBasin =
    1 -
    smoothStep(
      mountainLakeRadius,
      mountainLakeRadius + lakeBasinWidth,
      Math.hypot(
        point.x - mountainLakePosition.x,
        point.z - mountainLakePosition.z,
      ),
    );
  const raisedLand = hills + mountains + volcano;
  const land =
    landShare * (raisedLand + (lakeShoreHeight - raisedLand) * lakeBasin) -
    (1 - landShare) * 3.5;
  const riverShare = smoothStep(
    riverHalfWidth,
    riverHalfWidth + riverBankWidth,
    findDistanceToFreshWater(point),
  );
  return riverShare * land + (1 - riverShare) * Math.min(land, riverBedDepth);
};

export const meadowNewLands = buildSideLands({
  eastJoinZ: 0,
  westJoinZ: -5,
  hillRise: 4,
  lakes: [
    { centre: { x: 50.5, z: -5 }, radius: 2.6 },
    { centre: { x: -50.5, z: 5.5 }, radius: 2.6 },
  ],
  rivers: [
    [
      { x: 59.8, z: -8.8 },
      { x: 59.1, z: -6.9 },
      { x: 58.8, z: -5 },
      { x: 59.2, z: -3 },
      { x: 60, z: -1.2 },
      { x: 60.7, z: 0.7 },
      { x: 61, z: 2.7 },
      { x: 60.5, z: 4.6 },
      { x: 59.7, z: 6.4 },
      { x: 59, z: 8.3 },
      { x: 58.8, z: 10.3 },
      { x: 59.3, z: 12.2 },
      { x: 60.1, z: 14 },
      { x: 60.8, z: 15.9 },
      { x: 61, z: 17.4 },
    ],
    [
      { x: -56.2, z: 8.8 },
      { x: -57.4, z: 7.2 },
      { x: -58.9, z: 5.9 },
      { x: -60.8, z: 5.3 },
      { x: -62.8, z: 5.1 },
      { x: -64.8, z: 4.8 },
      { x: -66.6, z: 4 },
      { x: -68.1, z: 2.7 },
      { x: -69.2, z: 1.1 },
      { x: -70.5, z: -0.5 },
      { x: -72.1, z: -1.7 },
      { x: -74, z: -2.2 },
      { x: -74.5, z: -2.3 },
    ],
  ],
});

export const meadowAirfield: Airfield = {
  runway: { centre: { x: -55, z: -2 }, heading: -Math.PI / 2, level: 1.24 },
  helipad: { centre: { x: 39, z: -10 }, heading: -1.32, level: 1.31 },
  balloonField: { centre: { x: 54, z: 7.5 }, heading: -1.71, level: 1.11 },
};

export const findTerrainHeight = raiseTunnelHills(
  "meadow-isle",
  levelAirfield(
    extendWithNewLands(findMeadowCoreHeight, meadowNewLands),
    meadowAirfield,
  ),
);

export const findGroundColourKind = (
  height: number,
): "sand" | "grass" | "rock" | "snow" => {
  if (height < seaLevel + 0.35) {
    return "sand";
  }
  if (height < 3.2) {
    return "grass";
  }
  return height < snowLine ? "rock" : "snow";
};

export const buildRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

interface ScatterRules {
  count: number;
  seed: number;
  lowest: number;
  highest: number;
  keepClearOf: MapPoint[];
  clearance: number;
  propPlaces?: readonly MapPoint[];
  isClearOfTrailsAndAirfield?: (point: MapPoint) => boolean;
  findHeight?: (point: MapPoint) => number;
  findDistanceToWater?: (point: MapPoint) => number;
}

export interface ScatteredThing extends MapPoint {
  height: number;
  scale: number;
  turn: number;
}

const largestScatterAttempts = 40;
const propClearance = 1.4;

export type PlaceGrid = (point: MapPoint) => boolean;

export interface PlaceToKeepClear extends MapPoint {
  reach?: number;
}

export const buildPlaceGrid = (
  places: readonly PlaceToKeepClear[],
  reach: number,
): PlaceGrid => {
  const cells = new Map<string, PlaceToKeepClear[]>();
  const keyOf = (column: number, row: number) =>
    `${String(column)}:${String(row)}`;
  places.forEach((place) => {
    const key = keyOf(Math.floor(place.x / reach), Math.floor(place.z / reach));
    cells.set(key, [...(cells.get(key) ?? []), place]);
  });
  return (point) => {
    const column = Math.floor(point.x / reach);
    const row = Math.floor(point.z / reach);
    for (let across = -1; across <= 1; across++) {
      for (let down = -1; down <= 1; down++) {
        const nearby = cells.get(keyOf(column + across, row + down)) ?? [];
        if (
          nearby.some(
            (place) =>
              Math.hypot(point.x - place.x, point.z - place.z) <= reach,
          )
        ) {
          return true;
        }
      }
    }
    return false;
  };
};

const propGrids = new WeakMap<readonly MapPoint[], PlaceGrid>();

export const isClearOfProps = (
  point: MapPoint,
  propPlaces: readonly MapPoint[],
): boolean => {
  const known = propGrids.get(propPlaces);
  const grid = known ?? buildPlaceGrid(propPlaces, propClearance);
  if (known === undefined) {
    propGrids.set(propPlaces, grid);
  }
  return !grid(point);
};

export const scatterAcrossLand = ({
  count,
  seed,
  lowest,
  highest,
  keepClearOf,
  clearance,
  propPlaces = [],
  isClearOfTrailsAndAirfield = () => true,
  findHeight = findTerrainHeight,
  findDistanceToWater = findDistanceToFreshWater,
}: ScatterRules): ScatteredThing[] => {
  const random = buildRandom(seed);
  const scattered: ScatteredThing[] = [];
  for (
    let attempt = 0;
    attempt < count * largestScatterAttempts && scattered.length < count;
    attempt++
  ) {
    const point = {
      x: (random() * 2 - 1) * mapHalfWidth,
      z: (random() * 2 - 1) * mapHalfDepth,
    };
    const height = findHeight(point);
    const isClear =
      findDistanceToWater(point) > riverHalfWidth + riverBankWidth &&
      keepClearOf.every(
        (place) => Math.hypot(point.x - place.x, point.z - place.z) > clearance,
      ) &&
      isClearOfProps(point, propPlaces) &&
      isClearOfTrailsAndAirfield(point);
    if (height >= lowest && height <= highest && isClear) {
      scattered.push({
        ...point,
        height,
        scale: 0.7 + random() * 0.6,
        turn: random() * Math.PI * 2,
      });
    }
  }
  return scattered;
};

const newLandSpread = { x: 0.8, z: 0.85 };

export const mirrorOntoNewLands = (
  things: readonly ScatteredThing[],
  {
    keepEvery,
    findHeight,
    isClear,
  }: {
    keepEvery: number;
    findHeight: (point: MapPoint) => number;
    isClear: (point: MapPoint) => boolean;
  },
): ScatteredThing[] =>
  things
    .filter((_, index) => index % keepEvery === 0)
    .flatMap((thing, index) => {
      const side = index % 2 === 0 ? 1 : -1;
      const point = {
        x: side * 52 + thing.x * newLandSpread.x,
        z: thing.z * newLandSpread.z,
      };
      const height = findHeight(point);
      return height > 0.3 && isClear(point)
        ? [{ ...thing, ...point, height }]
        : [];
    });

const farReachSpread = { x: 0.42, z: 0.72 };

/**
 * Copies some of an Island's scattered scenery onto the far reaches of
 * its new lands, squeezed to fit, every `keepEvery`-th thing going to
 * the east and west far reaches in turn (ADR 0068).
 */
export const mirrorOntoFarReaches = (
  things: readonly ScatteredThing[],
  {
    keepEvery,
    findHeight,
    isClear,
  }: {
    keepEvery: number;
    findHeight: (point: MapPoint) => number;
    isClear: (point: MapPoint) => boolean;
  },
): ScatteredThing[] =>
  things
    // Offset by one from the new lands' copies, so the far reaches get others.
    .filter((_, index) => index % keepEvery === Math.min(1, keepEvery - 1))
    .flatMap((thing, index) => {
      const side = index % 2 === 0 ? -1 : 1;
      const point = {
        x: side * 92 + thing.x * farReachSpread.x,
        z: thing.z * farReachSpread.z,
      };
      const height = findHeight(point);
      return height > 0.3 &&
        findNewLandShare(point, newLandFarReaches) > 0.5 &&
        isClear(point)
        ? [{ ...thing, ...point, height }]
        : [];
    });

export const buildVillageHouses = (): ScatteredThing[] =>
  villageCentres.flatMap((centre, villageIndex) =>
    Array.from({ length: 7 }, (_, houseIndex) => {
      const angle = (houseIndex / 7) * Math.PI * 2 + villageIndex;
      const point = {
        x: centre.x + Math.cos(angle) * (1.4 + (houseIndex % 2)),
        z: centre.z + Math.sin(angle) * (1.4 + (houseIndex % 2)),
      };
      return {
        ...point,
        height: findTerrainHeight(point),
        scale: 0.8 + (houseIndex % 3) * 0.15,
        turn: -angle,
      };
    }),
  );

export const farmHamletCentres: MapPoint[] = [
  { x: 4, z: -13 },
  { x: -19, z: 8 },
  { x: 20.6, z: 15.9 },
  { x: 60, z: 1 },
  { x: 47.5, z: 5 },
  { x: -39, z: 11.5 },
  { x: -43.5, z: -2 },
];

export const buildFarmHamletHouses = (): ScatteredThing[] =>
  farmHamletCentres.flatMap((centre, hamletIndex) =>
    Array.from({ length: 4 }, (_, houseIndex) => {
      const angle = (houseIndex / 4) * Math.PI * 2 + hamletIndex;
      const point = {
        x: centre.x + Math.cos(angle) * 0.95,
        z: centre.z + Math.sin(angle) * 0.95,
      };
      return {
        ...point,
        height: findTerrainHeight(point),
        scale: 0.75 + (houseIndex % 2) * 0.15,
        turn: -angle,
      };
    }),
  );

export const footpathCourses: MapPoint[][] = [
  [villageCentres[0], { x: -4, z: 7 }, { x: 1.6, z: 3.9 }],
  [{ x: 5.2, z: 5.1 }, villageCentres[1]],
  [villageCentres[2], { x: -3, z: -2 }, { x: -4, z: 7 }],
];

export const findDistanceToFootpath = (point: MapPoint): number =>
  Math.min(
    ...footpathCourses.flatMap((course) =>
      course
        .slice(1)
        .map((end, index) => findDistanceToSegment(point, course[index], end)),
    ),
  );

export type FieldCrop = "wheat" | "barley" | "ploughed";

const fieldCrops: FieldCrop[] = ["wheat", "barley", "ploughed"];
const fieldInnerRadius = 2.7;
const fieldOuterRadius = 4.6;
const fieldSectors = 7;

export interface FieldPatch {
  crop: FieldCrop;
  furrowAngle: number;
}

export const findFieldPatch = (point: MapPoint): FieldPatch | undefined => {
  for (const [villageIndex, centre] of villageCentres.entries()) {
    const distance = Math.hypot(point.x - centre.x, point.z - centre.z);
    if (distance < fieldInnerRadius || distance > fieldOuterRadius) {
      continue;
    }
    const angle = Math.atan2(point.z - centre.z, point.x - centre.x) + Math.PI;
    const sector = Math.floor((angle / (Math.PI * 2)) * fieldSectors);
    if ((sector + villageIndex) % 3 === 2) {
      return undefined;
    }
    return {
      crop: fieldCrops[(sector + villageIndex * 2) % fieldCrops.length],
      furrowAngle: sector * 1.3 + villageIndex,
    };
  }
  return undefined;
};
