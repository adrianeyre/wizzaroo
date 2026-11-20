import type { MapPoint } from "../world-map-terrain.js";
import { bridgeStepUp } from "./island-adventures.js";

/**
 * Everything solid on an Island in explore mode, worked out from the
 * models themselves rather than drawn by hand (ADR 0061). Every
 * triangle of a solid model is cut to the slice of air the Character's
 * body fills above the ground (or deck) under it, and that slice is
 * marked on a fine grid of cells. A cell remembers how high its solid
 * parts reach, so the Character walks under a high roof or a tree's
 * canopy, steps over a kerb, and stands on a deck above the posts that
 * hold it up, but bumps into a wall, a trunk, a fence or a lamp post.
 */

/** How wide each cell of the grid is, in explore units. */
export const obstacleCellSize = 0.25;
/** Anything no higher than this above the ground is stepped over. */
export const obstacleStepHeight = 0.32;
/** How tall the Character is: anything higher up is walked under. */
export const obstacleBodyHeight = 1.25;
/** How far the Character's body reaches from where it stands. */
export const obstacleBodyRadius = 0.24;

const cellOffset = 1 << 15;
const cellSpan = 1 << 16;
const rangeMergeGap = 0.05;
const pushIterations = 4;

/**
 * The height the Character would stand at under a point, from the
 * highest ground, deck or bridge at or below `fromHeight`.
 */
export type SurfaceFinder = (
  x: number,
  z: number,
  fromHeight: number,
) => number;

/** The solid cells: each holds pairs of [bottom, top] heights. */
export interface ObstacleGrid {
  readonly cells: Map<number, number[]>;
}

/** What walking, driving and placing things ask of whatever is solid. */
export interface Obstacles {
  /** Whether something solid is within `radius` of a point, for a body standing at `y`. */
  isBlocked: (point: MapPoint, y: number, radius: number) => boolean;
  /** The nearest point that is clear, or undefined when there isn't one close by. */
  pushOut: (point: MapPoint, y: number, radius: number) => MapPoint | undefined;
  /** How deep a body at a point is in whatever is solid round it: 0 when it is clear. */
  findOverlap: (point: MapPoint, y: number, radius: number) => number;
}

export const createObstacleGrid = (): ObstacleGrid => ({ cells: new Map() });

const toCell = (value: number): number => Math.floor(value / obstacleCellSize);

const keyOf = (column: number, row: number): number =>
  (column + cellOffset) * cellSpan + (row + cellOffset);

/** Marks one cell solid between two heights, merging with what is there. */
export const markObstacleCell = (
  grid: ObstacleGrid,
  column: number,
  row: number,
  bottom: number,
  top: number,
): void => {
  const key = keyOf(column, row);
  const ranges = grid.cells.get(key);
  if (ranges === undefined) {
    grid.cells.set(key, [bottom, top]);
    return;
  }
  for (let index = 0; index < ranges.length; index += 2) {
    if (
      bottom <= ranges[index + 1] + rangeMergeGap &&
      top >= ranges[index] - rangeMergeGap
    ) {
      ranges[index] = Math.min(ranges[index], bottom);
      ranges[index + 1] = Math.max(ranges[index + 1], top);
      return;
    }
  }
  ranges.push(bottom, top);
};

/** Whether solid parts between `bottom` and `top` are in the way of a body standing at `y`. */
export const isInTheWayAt = (y: number, bottom: number, top: number): boolean =>
  y + obstacleStepHeight < top && y + obstacleBodyHeight > bottom;

const isCellInTheWay = (
  grid: ObstacleGrid,
  column: number,
  row: number,
  y: number,
): boolean => {
  const ranges = grid.cells.get(keyOf(column, row));
  if (ranges === undefined) {
    return false;
  }
  for (let index = 0; index < ranges.length; index += 2) {
    if (isInTheWayAt(y, ranges[index], ranges[index + 1])) {
      return true;
    }
  }
  return false;
};

type Corner = [number, number, number];

const clipBelow = (points: readonly Corner[], limit: number): Corner[] => {
  const kept: Corner[] = [];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const isInside = point[1] <= limit;
    const isNextInside = next[1] <= limit;
    if (isInside) {
      kept.push(point);
    }
    if (isInside !== isNextInside) {
      const share = (limit - point[1]) / (next[1] - point[1]);
      kept.push([
        point[0] + (next[0] - point[0]) * share,
        limit,
        point[2] + (next[2] - point[2]) * share,
      ]);
    }
  });
  return kept;
};

const clipAbove = (points: readonly Corner[], limit: number): Corner[] =>
  clipBelow(
    points.map(([x, y, z]): Corner => [x, -y, z]),
    -limit,
  ).map(([x, y, z]): Corner => [x, -y, z]);

/** The part of a triangle between two heights, as a flat outline seen from above. */
export const cutTriangleToSlice = (
  corners: readonly Corner[],
  low: number,
  high: number,
): [number, number][] =>
  clipBelow(clipAbove(corners, low), high).map(([x, , z]) => [x, z]);

const isOutlineOverCell = (
  outline: readonly [number, number][],
  left: number,
  near: number,
): boolean => {
  const right = left + obstacleCellSize;
  const far = near + obstacleCellSize;
  for (let index = 0; index < outline.length; index++) {
    const [x, z] = outline[index];
    const [nextX, nextZ] = outline[(index + 1) % outline.length];
    const normalX = nextZ - z;
    const normalZ = x - nextX;
    if (normalX === 0 && normalZ === 0) {
      continue;
    }
    let outlineLow = Infinity;
    let outlineHigh = -Infinity;
    for (const [pointX, pointZ] of outline) {
      const along = pointX * normalX + pointZ * normalZ;
      outlineLow = Math.min(outlineLow, along);
      outlineHigh = Math.max(outlineHigh, along);
    }
    const cellAlong = [
      left * normalX + near * normalZ,
      right * normalX + near * normalZ,
      left * normalX + far * normalZ,
      right * normalX + far * normalZ,
    ];
    if (
      Math.max(...cellAlong) < outlineLow ||
      Math.min(...cellAlong) > outlineHigh
    ) {
      return false;
    }
  }
  return true;
};

/** Whether a flat outline (seen from above) covers one cell of the grid. */
const isOutlineOnCell = (
  outline: readonly [number, number][],
  column: number,
  row: number,
): boolean => {
  if (outline.length === 0) {
    return false;
  }
  let lowX = Infinity;
  let highX = -Infinity;
  let lowZ = Infinity;
  let highZ = -Infinity;
  for (const [x, z] of outline) {
    lowX = Math.min(lowX, x);
    highX = Math.max(highX, x);
    lowZ = Math.min(lowZ, z);
    highZ = Math.max(highZ, z);
  }
  const firstColumn = toCell(lowX);
  const lastColumn = toCell(highX);
  const firstRow = toCell(lowZ);
  const lastRow = toCell(highZ);
  if (
    column < firstColumn ||
    column > lastColumn ||
    row < firstRow ||
    row > lastRow
  ) {
    return false;
  }
  return (
    firstColumn === lastColumn ||
    firstRow === lastRow ||
    isOutlineOverCell(
      outline,
      column * obstacleCellSize,
      row * obstacleCellSize,
    )
  );
};

/** Marks every cell a flat outline (seen from above) covers. */
export const markOutline = (
  grid: ObstacleGrid,
  outline: readonly [number, number][],
  bottom: number,
  top: number,
): void => {
  if (outline.length === 0) {
    return;
  }
  let lowX = Infinity;
  let highX = -Infinity;
  let lowZ = Infinity;
  let highZ = -Infinity;
  for (const [x, z] of outline) {
    lowX = Math.min(lowX, x);
    highX = Math.max(highX, x);
    lowZ = Math.min(lowZ, z);
    highZ = Math.max(highZ, z);
  }
  const firstColumn = toCell(lowX);
  const lastColumn = toCell(highX);
  const firstRow = toCell(lowZ);
  const lastRow = toCell(highZ);
  const isOneCellWide = firstColumn === lastColumn || firstRow === lastRow;
  for (let column = firstColumn; column <= lastColumn; column++) {
    for (let row = firstRow; row <= lastRow; row++) {
      if (
        isOneCellWide ||
        isOutlineOverCell(
          outline,
          column * obstacleCellSize,
          row * obstacleCellSize,
        )
      ) {
        markObstacleCell(grid, column, row, bottom, top);
      }
    }
  }
};

/**
 * Marks the part of one triangle that is in the Character's way: the
 * slice of it between a step and a body's height above the surface
 * under it, worked out at its lowest point and again at its highest.
 */
export const markTriangle = (
  grid: ObstacleGrid,
  corners: readonly Corner[],
  findSurface: SurfaceFinder,
): void => {
  const lowest = Math.min(corners[0][1], corners[1][1], corners[2][1]);
  const highest = Math.max(corners[0][1], corners[1][1], corners[2][1]);
  const firstColumn = toCell(
    Math.min(corners[0][0], corners[1][0], corners[2][0]),
  );
  const lastColumn = toCell(
    Math.max(corners[0][0], corners[1][0], corners[2][0]),
  );
  const firstRow = toCell(
    Math.min(corners[0][2], corners[1][2], corners[2][2]),
  );
  const lastRow = toCell(Math.max(corners[0][2], corners[1][2], corners[2][2]));
  const slices = new Map<number, [number, number][]>();
  const findSlice = (surface: number): [number, number][] => {
    const known = slices.get(surface);
    if (known !== undefined) {
      return known;
    }
    const low = surface + obstacleStepHeight;
    const high = surface + obstacleBodyHeight;
    const slice =
      highest <= low || lowest >= high
        ? []
        : cutTriangleToSlice(corners, low, high);
    slices.set(surface, slice);
    return slice;
  };
  for (let column = firstColumn; column <= lastColumn; column++) {
    for (let row = firstRow; row <= lastRow; row++) {
      const middleX = (column + 0.5) * obstacleCellSize;
      const middleZ = (row + 0.5) * obstacleCellSize;
      const underLowest = findSurface(middleX, middleZ, lowest + rangeMergeGap);
      const underHighest = findSurface(middleX, middleZ, highest);
      const underDeck = findSurface(
        middleX,
        middleZ,
        lowest - bridgeStepUp - rangeMergeGap,
      );
      const surfaces = [
        underLowest,
        ...(underHighest > underLowest + rangeMergeGap ? [underHighest] : []),
        // Ground or water too far below a deck to step up from, so the deck is in the way of whoever is down there.
        ...(underLowest > underDeck + bridgeStepUp ? [underDeck] : []),
      ];
      const isInTheWay = surfaces.some((surface) =>
        isOutlineOnCell(findSlice(surface), column, row),
      );
      if (isInTheWay) {
        markObstacleCell(grid, column, row, lowest, highest);
      }
    }
  }
};

/**
 * Marks every triangle of a list of positions (three numbers a corner,
 * three corners a triangle), each corner placed by `place` first.
 */
export const markTriangles = (
  grid: ObstacleGrid,
  positions: ArrayLike<number>,
  place: (x: number, y: number, z: number) => Corner,
  findSurface: SurfaceFinder,
  first = 0,
  count = positions.length / 9,
): void => {
  for (let triangle = first; triangle < first + count; triangle++) {
    const start = triangle * 9;
    markTriangle(
      grid,
      [
        place(positions[start], positions[start + 1], positions[start + 2]),
        place(positions[start + 3], positions[start + 4], positions[start + 5]),
        place(positions[start + 6], positions[start + 7], positions[start + 8]),
      ],
      findSurface,
    );
  }
};

/** Marks a solid upright cylinder, for things that are simplest to give a shape by hand. */
export const markCylinder = (
  grid: ObstacleGrid,
  centre: MapPoint,
  radius: number,
  bottom: number,
  top: number,
): void => {
  const sides = 12;
  markOutline(
    grid,
    Array.from({ length: sides }, (_, side): [number, number] => {
      const angle = (side / sides) * Math.PI * 2;
      return [
        centre.x + Math.cos(angle) * radius,
        centre.z + Math.sin(angle) * radius,
      ];
    }),
    bottom,
    top,
  );
};

/** Clears every cell within `radius` of a point, so a sign or a ride stays in reach. */
export const clearObstacleCells = (
  grid: ObstacleGrid,
  centre: MapPoint,
  radius: number,
): void => {
  for (
    let column = toCell(centre.x - radius);
    column <= toCell(centre.x + radius);
    column++
  ) {
    for (
      let row = toCell(centre.z - radius);
      row <= toCell(centre.z + radius);
      row++
    ) {
      const middleX = (column + 0.5) * obstacleCellSize;
      const middleZ = (row + 0.5) * obstacleCellSize;
      if (Math.hypot(middleX - centre.x, middleZ - centre.z) <= radius) {
        grid.cells.delete(keyOf(column, row));
      }
    }
  }
};

const findCellPush = (
  point: MapPoint,
  column: number,
  row: number,
  radius: number,
): MapPoint | undefined => {
  const left = column * obstacleCellSize;
  const near = row * obstacleCellSize;
  const right = left + obstacleCellSize;
  const far = near + obstacleCellSize;
  const closestX = Math.min(right, Math.max(left, point.x));
  const closestZ = Math.min(far, Math.max(near, point.z));
  const awayX = point.x - closestX;
  const awayZ = point.z - closestZ;
  const distance = Math.hypot(awayX, awayZ);
  if (distance >= radius) {
    return undefined;
  }
  if (distance > 1e-6) {
    const push = radius - distance;
    return {
      x: (awayX / distance) * push,
      z: (awayZ / distance) * push,
    };
  }
  const exits = [
    { x: left - radius - point.x, z: 0 },
    { x: right + radius - point.x, z: 0 },
    { x: 0, z: near - radius - point.z },
    { x: 0, z: far + radius - point.z },
  ];
  return exits.reduce((best, exit) =>
    Math.hypot(exit.x, exit.z) < Math.hypot(best.x, best.z) ? exit : best,
  );
};

export const isObstacleNear = (
  grid: ObstacleGrid,
  point: MapPoint,
  y: number,
  radius: number,
): boolean => {
  for (
    let column = toCell(point.x - radius);
    column <= toCell(point.x + radius);
    column++
  ) {
    for (
      let row = toCell(point.z - radius);
      row <= toCell(point.z + radius);
      row++
    ) {
      if (
        isCellInTheWay(grid, column, row, y) &&
        findCellPush(point, column, row, radius) !== undefined
      ) {
        return true;
      }
    }
  }
  return false;
};

/** How deep a body is in the solid cells round it, summed over every cell it reaches into. */
export const findObstacleOverlap = (
  grid: ObstacleGrid,
  point: MapPoint,
  y: number,
  radius: number,
): number => {
  let overlap = 0;
  for (
    let column = toCell(point.x - radius);
    column <= toCell(point.x + radius);
    column++
  ) {
    for (
      let row = toCell(point.z - radius);
      row <= toCell(point.z + radius);
      row++
    ) {
      if (!isCellInTheWay(grid, column, row, y)) {
        continue;
      }
      const push = findCellPush(point, column, row, radius);
      if (push !== undefined) {
        overlap += Math.hypot(push.x, push.z);
      }
    }
  }
  return overlap;
};

/** Slides a point out of the solid cells around it, or undefined if it is boxed in. */
export const pushOutOfObstacleCells = (
  grid: ObstacleGrid,
  point: MapPoint,
  y: number,
  radius: number,
): MapPoint | undefined => {
  let pushed = point;
  for (let iteration = 0; iteration < pushIterations; iteration++) {
    let isMoved = false;
    for (
      let column = toCell(pushed.x - radius);
      column <= toCell(pushed.x + radius);
      column++
    ) {
      for (
        let row = toCell(pushed.z - radius);
        row <= toCell(pushed.z + radius);
        row++
      ) {
        if (!isCellInTheWay(grid, column, row, y)) {
          continue;
        }
        const push = findCellPush(pushed, column, row, radius);
        if (push !== undefined) {
          pushed = { x: pushed.x + push.x, z: pushed.z + push.z };
          isMoved = true;
        }
      }
    }
    if (!isMoved) {
      return pushed;
    }
  }
  return isObstacleNear(grid, pushed, y, radius) ? undefined : pushed;
};

export const toObstacles = (grid: ObstacleGrid): Obstacles => ({
  isBlocked: (point, y, radius) => isObstacleNear(grid, point, y, radius),
  pushOut: (point, y, radius) => pushOutOfObstacleCells(grid, point, y, radius),
  findOverlap: (point, y, radius) =>
    findObstacleOverlap(grid, point, y, radius),
});

const longestStep = 0.12;

/**
 * Moves a body from `from` towards `wanted` without letting it into
 * anything solid: in short steps, sliding along walls, and stopping
 * where it can't go on. A body that is already stuck in something (put
 * down by a ride, say) is let walk out of it, but never further in, so
 * it can't walk on through.
 */
export const moveAmongObstacles = (
  obstacles: Obstacles,
  from: MapPoint,
  wanted: MapPoint,
  y: number,
  radius = obstacleBodyRadius,
): MapPoint => {
  if (obstacles.isBlocked(from, y, radius)) {
    const depth = obstacles.findOverlap(from, y, radius) + 1e-6;
    return (
      [wanted, { x: wanted.x, z: from.z }, { x: from.x, z: wanted.z }].find(
        (point) => obstacles.findOverlap(point, y, radius) <= depth,
      ) ?? from
    );
  }
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(wanted.x - from.x, wanted.z - from.z) / longestStep),
  );
  const stepX = (wanted.x - from.x) / steps;
  const stepZ = (wanted.z - from.z) / steps;
  let here = from;
  for (let step = 1; step <= steps; step++) {
    const target = { x: here.x + stepX, z: here.z + stepZ };
    const moved =
      obstacles.pushOut(target, y, radius) ??
      obstacles.pushOut({ x: target.x, z: here.z }, y, radius) ??
      obstacles.pushOut({ x: here.x, z: target.z }, y, radius);
    if (moved === undefined) {
      return here;
    }
    here = moved;
  }
  return here;
};
