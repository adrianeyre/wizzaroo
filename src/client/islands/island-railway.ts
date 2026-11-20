import type { MapPoint } from "../world-map-terrain.js";
import {
  exploreScale,
  findExploreAdventure,
  type IslandAdventure,
} from "./island-adventures.js";
import { islandTransportPlans } from "./island-transport-plans.js";
import { withoutTunnelHills } from "./island-tunnel-hills.js";

export const railBridgeStyles = [
  "stone-viaduct",
  "steel-truss",
  "suspension",
  "timber-trestle",
  "girder",
  "bowstring-arch",
] as const;

export type RailBridgeStyle = (typeof railBridgeStyles)[number];

export interface RailPoint extends MapPoint {
  y: number;
  ground: number;
  distance: number;
  isOnBridge: boolean;
  isInTunnel: boolean;
}

export interface RailTunnel {
  id: string;
  fromDistance: number;
  toDistance: number;
}

export interface RailBridge {
  id: string;
  style: RailBridgeStyle;
  fromDistance: number;
  toDistance: number;
  isOverSea: boolean;
}

export interface Station {
  id: string;
  name: string;
  distance: number;
  side: -1 | 1;
  height: number;
}

export interface Railway {
  islandId: string;
  points: RailPoint[];
  length: number;
  bridges: RailBridge[];
  tunnels: RailTunnel[];
  stations: Station[];
}

export interface RailSpot {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
}

export const railSampleSpacing = 1.2;
export const railHalfGauge = 0.42;
export const railTopLift = 0.32;
export const platformLift = 0.45;
export const platformOffset = 1.75;
export const platformHalfWidth = 0.8;
export const platformLength = 24;
export const tunnelPortalSetback = 0.6;

const curveSteps = 10;
const shapingPasses = 1400;
const groundPull = 0.004;
const deepestTunnel = 40;
const tallestViaduct = 20;
const tunnelDepth = 3;
const tunnelMouthDepth = 0.2;
const steepestGrade = 0.12;
const shortestTunnel = 14;
const embankmentLift = 0.12;
const wetGround = 0.6;
const bridgeJoinGap = 10;
const abutmentReach = 4;
const seaDeckHeight = 4.6;
const riverDeckClearance = 3.2;
const valleyDepth = 2.6;
const shortestBridge = 6;
const stationFlatReach = platformLength / 2 + 10;

const islandBridgeStyles: Readonly<Record<string, readonly RailBridgeStyle[]>> =
  {
    "meadow-isle": [
      "stone-viaduct",
      "girder",
      "suspension",
      "timber-trestle",
      "bowstring-arch",
      "steel-truss",
    ],
    "frost-isle": [
      "steel-truss",
      "stone-viaduct",
      "bowstring-arch",
      "girder",
      "suspension",
      "timber-trestle",
    ],
    "sunscorch-sands": [
      "timber-trestle",
      "bowstring-arch",
      "stone-viaduct",
      "suspension",
      "girder",
      "steel-truss",
    ],
    "jungle-reach": [
      "suspension",
      "timber-trestle",
      "girder",
      "stone-viaduct",
      "steel-truss",
      "bowstring-arch",
    ],
    "ember-isle": [
      "girder",
      "steel-truss",
      "stone-viaduct",
      "bowstring-arch",
      "timber-trestle",
      "suspension",
    ],
    "starfall-isle": [
      "bowstring-arch",
      "suspension",
      "steel-truss",
      "girder",
      "stone-viaduct",
      "timber-trestle",
    ],
  };

const longestStyleSpan: Record<RailBridgeStyle, number> = {
  "stone-viaduct": Infinity,
  "steel-truss": Infinity,
  suspension: Infinity,
  "timber-trestle": 90,
  girder: Infinity,
  "bowstring-arch": 120,
};

const shortestStyleSpan: Record<RailBridgeStyle, number> = {
  "stone-viaduct": 10,
  "steel-truss": 14,
  suspension: 30,
  "timber-trestle": 0,
  girder: 0,
  "bowstring-arch": 18,
};

const tallStyles: readonly RailBridgeStyle[] = [
  "steel-truss",
  "suspension",
  "bowstring-arch",
];

export class IslandWithoutRailwayError extends Error {
  override name = "IslandWithoutRailwayError";
}

export const listPairs = (flat: readonly number[]): MapPoint[] =>
  Array.from({ length: Math.floor(flat.length / 2) }, (_, index) => ({
    x: flat[index * 2],
    z: flat[index * 2 + 1],
  }));

const findTransportPlan = (islandId: string) => {
  const plan = islandTransportPlans.find(
    (candidate) => candidate.islandId === islandId,
  );
  if (plan === undefined) {
    throw new IslandWithoutRailwayError(`Island "${islandId}" has no railway`);
  }
  return plan;
};

export const hasRailway = (islandId: string): boolean =>
  islandTransportPlans.some((plan) => plan.islandId === islandId);

const findCurvePoint = (
  before: MapPoint,
  start: MapPoint,
  end: MapPoint,
  after: MapPoint,
  share: number,
): MapPoint => {
  const squared = share * share;
  const cubed = squared * share;
  const blend = (
    first: number,
    second: number,
    third: number,
    fourth: number,
  ) =>
    0.5 *
    (2 * second +
      (third - first) * share +
      (2 * first - 5 * second + 4 * third - fourth) * squared +
      (3 * second - first - 3 * third + fourth) * cubed);
  return {
    x: blend(before.x, start.x, end.x, after.x),
    z: blend(before.z, start.z, end.z, after.z),
  };
};

export const traceClosedCurve = (corners: readonly MapPoint[]): MapPoint[] => {
  const count = corners.length;
  return corners.flatMap((corner, index) =>
    Array.from({ length: curveSteps }, (_, step) =>
      findCurvePoint(
        corners[(index - 1 + count) % count],
        corner,
        corners[(index + 1) % count],
        corners[(index + 2) % count],
        step / curveSteps,
      ),
    ),
  );
};

export const resampleClosedLine = (
  line: readonly MapPoint[],
  spacing: number,
): MapPoint[] => {
  const lengths = line.map((point, index) => {
    const next = line[(index + 1) % line.length];
    return Math.hypot(next.x - point.x, next.z - point.z);
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const count = Math.round(total / spacing);
  const step = total / count;
  const resampled: MapPoint[] = [];
  let segment = 0;
  let segmentStart = 0;
  for (let index = 0; index < count; index++) {
    const wanted = index * step;
    while (segmentStart + lengths[segment] < wanted) {
      segmentStart += lengths[segment];
      segment++;
    }
    const share = (wanted - segmentStart) / lengths[segment];
    const start = line[segment];
    const end = line[(segment + 1) % line.length];
    resampled.push({
      x: start.x + (end.x - start.x) * share,
      z: start.z + (end.z - start.z) * share,
    });
  }
  return resampled;
};

const isWetUnder = (adventure: IslandAdventure, point: MapPoint): boolean =>
  adventure.findHeight(point) < wetGround ||
  adventure.findCourseKind(point) !== undefined;

interface Run {
  first: number;
  last: number;
}

const listRuns = (flags: readonly boolean[]): Run[] => {
  const runs: Run[] = [];
  flags.forEach((flag, index) => {
    const previous = runs.at(-1);
    if (!flag) {
      return;
    }
    if (previous?.last === index - 1) {
      previous.last = index;
      return;
    }
    runs.push({ first: index, last: index });
  });
  const first = runs.at(0);
  const last = runs.at(-1);
  if (
    runs.length > 1 &&
    first?.first === 0 &&
    last?.last === flags.length - 1
  ) {
    runs.shift();
    last.last = first.last + flags.length;
  }
  return runs;
};

const joinRuns = (runs: readonly Run[], gap: number): Run[] =>
  runs.reduce<Run[]>((joined, run) => {
    const previous = joined.at(-1);
    if (previous !== undefined && run.first - previous.last <= gap) {
      previous.last = Math.max(previous.last, run.last);
      return joined;
    }
    return [...joined, { ...run }];
  }, []);

const wrap = (index: number, count: number): number =>
  ((index % count) + count) % count;

export const findRightOf = (heading: number): MapPoint => ({
  x: Math.cos(heading),
  z: -Math.sin(heading),
});

const findDistanceToSegmentEnds = (
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

const findRunwayLine = (adventure: IslandAdventure) => {
  const { runway } = adventure.airfield;
  const reach = 46 * exploreScale;
  const along = { x: Math.sin(runway.heading), z: Math.cos(runway.heading) };
  return {
    start: {
      x: runway.centre.x - along.x * reach,
      z: runway.centre.z - along.z * reach,
    },
    end: {
      x: runway.centre.x + along.x * reach,
      z: runway.centre.z + along.z * reach,
    },
  };
};

const runwayApproachClearance = 3.2 * exploreScale;

const isNearRunwayApproach = (
  adventure: IslandAdventure,
  points: readonly MapPoint[],
): boolean => {
  const { start, end } = findRunwayLine(adventure);
  return points.some(
    (point) =>
      findDistanceToSegmentEnds(point, start, end) < runwayApproachClearance,
  );
};

const chooseBridgeStyles = (
  islandId: string,
  adventure: IslandAdventure,
  spans: readonly { length: number; points: MapPoint[] }[],
): RailBridgeStyle[] => {
  const styles = islandBridgeStyles[islandId] ?? railBridgeStyles;
  let turn = 0;
  return spans.map(({ length, points }) => {
    const isLow = isNearRunwayApproach(adventure, points);
    const fits = (style: RailBridgeStyle) =>
      length >= shortestStyleSpan[style] &&
      length <= longestStyleSpan[style] &&
      !(isLow && tallStyles.includes(style));
    const offset = Array.from(
      { length: styles.length },
      (_, step) => step,
    ).find((step) => fits(styles[(turn + step) % styles.length]));
    const style =
      offset === undefined ? "girder" : styles[(turn + offset) % styles.length];
    turn += (offset ?? 0) + 1;
    return style;
  });
};

const findNearestIndex = (
  line: readonly MapPoint[],
  wanted: MapPoint,
): number =>
  line.reduce(
    (best, point, index) =>
      Math.hypot(point.x - wanted.x, point.z - wanted.z) <
      Math.hypot(line[best].x - wanted.x, line[best].z - wanted.z)
        ? index
        : best,
    0,
  );

interface HeightBounds {
  lowest: number[];
  highest: number[];
}

const shapeHeights = (
  grounds: readonly number[],
  { lowest, highest }: HeightBounds,
): number[] => {
  const count = grounds.length;
  let heights = grounds.map((ground, index) =>
    Math.min(highest[index], Math.max(lowest[index], ground)),
  );
  for (let pass = 0; pass < shapingPasses; pass++) {
    heights = heights.map((height, index) => {
      const smoothed =
        (heights[wrap(index - 1, count)] +
          2 * height +
          heights[wrap(index + 1, count)]) /
        4;
      const pulled = smoothed + (grounds[index] - smoothed) * groundPull;
      return Math.min(highest[index], Math.max(lowest[index], pulled));
    });
  }
  const steepestStep = steepestGrade * railSampleSpacing;
  const keepWithin = (index: number, neighbour: number) => {
    const eased = Math.min(
      neighbour + steepestStep,
      Math.max(neighbour - steepestStep, heights[index]),
    );
    heights[index] = Math.min(highest[index], Math.max(lowest[index], eased));
  };
  for (let sweep = 0; sweep < 4; sweep++) {
    for (let step = 1; step <= count * 2; step++) {
      keepWithin(step % count, heights[(step - 1) % count]);
    }
    for (let step = count * 2 - 1; step >= 0; step--) {
      keepWithin(step % count, heights[(step + 1) % count]);
    }
  }
  return heights;
};

const listRunIndexes = ({ first, last }: Run, count: number): number[] =>
  Array.from({ length: last - first + 1 }, (_, step) =>
    wrap(first + step, count),
  );

const buildRailway = (islandId: string): Railway => {
  const plan = findTransportPlan(islandId);
  // Laid on the ground without the hills raised over its tunnels, as
  // those hills are shaped from where its tunnels are.
  const adventure = withoutTunnelHills(findExploreAdventure(islandId));
  const corners = listPairs(plan.railwayPoints).map(({ x, z }) => ({
    x: x * exploreScale,
    z: z * exploreScale,
  }));
  const line = resampleClosedLine(traceClosedCurve(corners), railSampleSpacing);
  const count = line.length;
  const length = count * railSampleSpacing;
  const grounds = line.map((point) => adventure.findHeight(point));
  const wet = line.map((point) => isWetUnder(adventure, point));
  const dryGrounds = grounds.map((ground) => Math.max(ground, wetGround));
  const steps = (reach: number) => Math.round(reach / railSampleSpacing);

  const wetRuns = joinRuns(listRuns(wet), steps(bridgeJoinGap)).map(
    ({ first, last }) => ({
      first: first - steps(abutmentReach),
      last: last + steps(abutmentReach),
    }),
  );
  const levelIndexes = [
    ...plan.stations.map(({ at }) => ({
      index: findNearestIndex(line, {
        x: at.x * exploreScale,
        z: at.z * exploreScale,
      }),
      reach: stationFlatReach,
    })),
  ];
  const freeBounds = (): HeightBounds => ({
    lowest: dryGrounds.map((ground) => ground - deepestTunnel),
    highest: dryGrounds.map((ground) => ground + tallestViaduct),
  });
  const pinBounds = (bounds: HeightBounds) => {
    wetRuns.forEach((run) => {
      const indexes = listRunIndexes(run, count);
      const isOverSea = indexes.some(
        (index) =>
          wet[index] && adventure.findCourseKind(line[index]) === undefined,
      );
      const lowestUnder = Math.min(
        ...indexes.map((index) => Math.max(0, grounds[index])),
      );
      const deck = isOverSea ? seaDeckHeight : lowestUnder + riverDeckClearance;
      indexes.forEach((index) => {
        bounds.lowest[index] = Math.max(bounds.lowest[index], deck);
        bounds.highest[index] = Infinity;
      });
    });
    levelIndexes.forEach(({ index, reach }) => {
      for (let step = -steps(reach); step <= steps(reach); step++) {
        const wrapped = wrap(index + step, count);
        if (wet[wrapped]) {
          continue;
        }
        const level = dryGrounds[index] + embankmentLift;
        bounds.lowest[wrapped] = Math.max(
          dryGrounds[wrapped] + embankmentLift,
          level - 0.3,
        );
        bounds.highest[wrapped] = Math.max(bounds.lowest[wrapped], level + 0.3);
      }
    });
    return bounds;
  };
  const freeHeights = shapeHeights(dryGrounds, pinBounds(freeBounds()));
  const tunnelRuns = listRuns(
    freeHeights.map((height, index) => dryGrounds[index] - height > 0),
  ).filter(
    (run) =>
      (run.last - run.first) * railSampleSpacing >= shortestTunnel &&
      listRunIndexes(run, count).some(
        (index) => dryGrounds[index] - freeHeights[index] > tunnelDepth,
      ),
  );
  const isInTunnel = new Array<boolean>(count).fill(false);
  tunnelRuns.forEach((run) => {
    listRunIndexes(run, count).forEach((index) => {
      isInTunnel[index] = true;
    });
  });
  const tunnelBounds = freeBounds();
  tunnelBounds.lowest = tunnelBounds.lowest.map((lowest, index) =>
    isInTunnel[index] ? lowest : dryGrounds[index] + embankmentLift,
  );
  tunnelBounds.highest = tunnelBounds.highest.map((highest, index) =>
    isInTunnel[index] ? dryGrounds[index] - tunnelMouthDepth : highest,
  );
  const heights = shapeHeights(dryGrounds, pinBounds(tunnelBounds));

  const raised = heights.map(
    (height, index) =>
      !isInTunnel[index] &&
      (wet[index] || height - dryGrounds[index] > valleyDepth),
  );
  const spans = joinRuns(listRuns(raised), steps(bridgeJoinGap))
    .map(({ first, last }) => ({ first: first - 1, last: last + 1 }))
    .filter(
      ({ first, last }) => (last - first) * railSampleSpacing >= shortestBridge,
    )
    .map((run) => ({
      ...run,
      isOverSea: listRunIndexes(run, count).some(
        (index) =>
          wet[index] && adventure.findCourseKind(line[index]) === undefined,
      ),
    }))
    .toSorted(
      (first, second) => wrap(first.first, count) - wrap(second.first, count),
    );
  const isOnBridge = new Array<boolean>(count).fill(false);
  spans.forEach((run) => {
    listRunIndexes(run, count).forEach((index) => {
      isOnBridge[index] = true;
    });
  });
  const styles = chooseBridgeStyles(
    islandId,
    adventure,
    spans.map((run) => ({
      length: (run.last - run.first) * railSampleSpacing,
      points: listRunIndexes(run, count).map((index) => line[index]),
    })),
  );
  const points = line.map((point, index): RailPoint => ({
    ...point,
    y: heights[index],
    ground: grounds[index],
    distance: index * railSampleSpacing,
    isOnBridge: isOnBridge[index],
    isInTunnel: isInTunnel[index],
  }));
  const stationIndexes = plan.stations.map(({ at }) =>
    findNearestIndex(line, { x: at.x * exploreScale, z: at.z * exploreScale }),
  );
  return {
    islandId,
    points,
    length,
    bridges: spans.map(({ first, last, isOverSea }, index) => ({
      id: `${islandId}-rail-bridge-${String(index + 1)}`,
      style: styles[index],
      fromDistance: wrap(first, count) * railSampleSpacing,
      toDistance: (wrap(first, count) + last - first) * railSampleSpacing,
      isOverSea,
    })),
    tunnels: tunnelRuns.map(({ first, last }, index) => ({
      id: `${islandId}-tunnel-${String(index + 1)}`,
      fromDistance: wrap(first, count) * railSampleSpacing,
      toDistance: (wrap(first, count) + last - first) * railSampleSpacing,
    })),
    stations: plan.stations.map((site, index) => ({
      id: `${islandId}-station-${String(index + 1)}`,
      name: site.name,
      distance: stationIndexes[index] * railSampleSpacing,
      side: site.side,
      height: heights[stationIndexes[index]],
    })),
  };
};

const railways = new Map<string, Railway>();

export const findRailway = (islandId: string): Railway => {
  const known = railways.get(islandId);
  if (known !== undefined) {
    return known;
  }
  const railway = buildRailway(islandId);
  railways.set(islandId, railway);
  return railway;
};

export const wrapDistance = (railway: Railway, distance: number): number =>
  ((distance % railway.length) + railway.length) % railway.length;

export const findRailPoint = (
  railway: Railway,
  distance: number,
): { x: number; y: number; z: number } => {
  const along = wrapDistance(railway, distance) / railSampleSpacing;
  const index = Math.floor(along);
  const share = along - index;
  const start = railway.points[index % railway.points.length];
  const end = railway.points[(index + 1) % railway.points.length];
  return {
    x: start.x + (end.x - start.x) * share,
    y: start.y + (end.y - start.y) * share,
    z: start.z + (end.z - start.z) * share,
  };
};

export const findRailHeading = (railway: Railway, distance: number): number => {
  const ahead = findRailPoint(railway, distance + railSampleSpacing);
  const behind = findRailPoint(railway, distance - railSampleSpacing);
  return Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
};

export const findRailSpot = (
  railway: Railway,
  frontDistance: number,
  backDistance: number,
): RailSpot => {
  const front = findRailPoint(railway, frontDistance);
  const back = findRailPoint(railway, backDistance);
  const flat = Math.hypot(front.x - back.x, front.z - back.z);
  return {
    x: (front.x + back.x) / 2,
    y: (front.y + back.y) / 2 + railTopLift,
    z: (front.z + back.z) / 2,
    heading: Math.atan2(front.x - back.x, front.z - back.z),
    pitch: -Math.atan2(front.y - back.y, flat),
  };
};

export const findStationPlatformSpot = (
  railway: Railway,
  station: Station,
  along = 0,
): MapPoint & { y: number; heading: number } => {
  const point = findRailPoint(railway, station.distance + along);
  const heading = findRailHeading(railway, station.distance + along);
  const right = findRightOf(heading);
  return {
    x: point.x + right.x * platformOffset * station.side,
    z: point.z + right.z * platformOffset * station.side,
    y: station.height + railTopLift + platformLift,
    heading,
  };
};
