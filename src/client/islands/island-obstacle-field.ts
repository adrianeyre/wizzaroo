import type { BufferGeometry } from "three";
import type { MapPoint } from "../world-map-terrain.js";
import {
  clearObstacleCells,
  createObstacleGrid,
  markTriangles,
  obstacleCellSize,
  toObstacles,
  type ObstacleGrid,
  type Obstacles,
  type SurfaceFinder,
} from "./island-obstacles.js";

/**
 * Something solid on an Island, marked on the grid only once the
 * Character comes near it, so starting to explore stays quick
 * (ADR 0061).
 */
export interface SolidSource {
  name: string;
  centre: MapPoint;
  /** How far from `centre` it reaches, in explore units. */
  reach: number;
  mark: (grid: ObstacleGrid) => void;
}

/** A spot that is always left clear, such as where a ride starts. */
export interface ClearSpot {
  centre: MapPoint;
  radius: number;
}

export interface Placement {
  x: number;
  y: number;
  z: number;
  turn: number;
  scale: number;
}

const chunkSize = 24;
const preparedRing = 1;

const chunkKeyOf = (column: number, row: number): string =>
  `${String(column)},${String(row)}`;

const toChunk = (value: number): number => Math.floor(value / chunkSize);

/** A geometry's triangles, three corners each, ignoring any finish groups in `skipGroups`. */
export const listTrianglePositions = (
  geometry: BufferGeometry,
  skipGroups: readonly number[] = [],
): Float32Array => {
  const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
  const positions = flat.getAttribute("position").array;
  const kept =
    skipGroups.length === 0 || flat.groups.length === 0
      ? [{ start: 0, count: positions.length / 3 }]
      : flat.groups.filter(
          ({ materialIndex }) => !skipGroups.includes(materialIndex ?? 0),
        );
  const total = kept.reduce((sum, { count }) => sum + count, 0);
  const triangles = new Float32Array(total * 3);
  let offset = 0;
  for (const { start, count } of kept) {
    triangles.set(positions.slice(start * 3, (start + count) * 3), offset);
    offset += count * 3;
  }
  if (flat !== geometry) {
    flat.dispose();
  }
  return triangles;
};

/** Places a model's local corner: turned, scaled, then moved. */
export const buildPlacer = ({ x, y, z, turn, scale }: Placement) => {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return (
    localX: number,
    localY: number,
    localZ: number,
  ): [number, number, number] => [
    x + (localX * cos + localZ * sin) * scale,
    y + localY * scale,
    z + (-localX * sin + localZ * cos) * scale,
  ];
};

/** How far a set of triangles reaches from its local origin, flat. */
export const findFlatReach = (triangles: ArrayLike<number>): number => {
  let reach = 0;
  for (let index = 0; index < triangles.length; index += 3) {
    reach = Math.max(reach, Math.hypot(triangles[index], triangles[index + 2]));
  }
  return reach;
};

/** One source for each placed copy of a model, such as every tree of a kind. */
export const listPlacedModelSources = (
  name: string,
  triangles: () => Float32Array,
  placements: readonly Placement[],
  findSurface: (placement: Placement) => SurfaceFinder,
): SolidSource[] => {
  let shared: { triangles: Float32Array; reach: number } | undefined;
  const findShared = () => {
    shared ??= (() => {
      const built = triangles();
      return { triangles: built, reach: findFlatReach(built) };
    })();
    return shared;
  };
  return placements.map((placement, index) => ({
    name: `${name}-${String(index)}`,
    centre: { x: placement.x, z: placement.z },
    get reach() {
      return findShared().reach * placement.scale;
    },
    mark: (grid) => {
      markTriangles(
        grid,
        findShared().triangles,
        buildPlacer(placement),
        findSurface(placement),
      );
    },
  }));
};

/** A surface that is the same height everywhere, for a model standing on its own spot. */
export const flatSurface =
  (height: number): SurfaceFinder =>
  () =>
    height;

/**
 * Splits one big model already in explore units, such as every Station
 * on a railway, into a source for each chunk of the Island it covers.
 */
export const listChunkedSources = (
  name: string,
  triangles: () => Float32Array,
  findSurface: SurfaceFinder,
): SolidSource[] => {
  const built = triangles();
  const byChunk = new Map<string, number[]>();
  for (let triangle = 0; triangle < built.length / 9; triangle++) {
    const start = triangle * 9;
    const x = (built[start] + built[start + 3] + built[start + 6]) / 3;
    const z = (built[start + 2] + built[start + 5] + built[start + 8]) / 3;
    const key = chunkKeyOf(toChunk(x), toChunk(z));
    const list = byChunk.get(key) ?? [];
    list.push(triangle);
    byChunk.set(key, list);
  }
  return [...byChunk.entries()].map(([key, list]) => {
    const [column, row] = key.split(",").map(Number);
    const own = new Float32Array(list.length * 9);
    list.forEach((triangle, index) => {
      own.set(built.subarray(triangle * 9, triangle * 9 + 9), index * 9);
    });
    return {
      name: `${name}-${key}`,
      centre: {
        x: (column + 0.5) * chunkSize,
        z: (row + 0.5) * chunkSize,
      },
      reach: chunkSize,
      mark: (grid: ObstacleGrid) => {
        markTriangles(grid, own, (x, y, z) => [x, y, z], findSurface);
      },
    };
  });
};

/**
 * Caches a surface finder by cell and by height, since the triangles of
 * one model ask about the same few spots again and again.
 */
export const cacheSurface = (findSurface: SurfaceFinder): SurfaceFinder => {
  const known = new Map<string, number>();
  return (x, z, fromHeight) => {
    const column = Math.floor(x / obstacleCellSize);
    const row = Math.floor(z / obstacleCellSize);
    const level = Math.round(fromHeight * 4);
    const key = `${String(column)},${String(row)},${String(level)}`;
    const found = known.get(key);
    if (found !== undefined) {
      return found;
    }
    const surface = findSurface(
      (column + 0.5) * obstacleCellSize,
      (row + 0.5) * obstacleCellSize,
      level / 4,
    );
    known.set(key, surface);
    return surface;
  };
};

/** How many of the solid things near a spot are marked, of how many. */
export interface NearbyMarking {
  marked: number;
  total: number;
}

const listChunkKeysAround = (point: MapPoint): string[] => {
  const middleColumn = toChunk(point.x);
  const middleRow = toChunk(point.z);
  const keys: string[] = [];
  for (
    let column = middleColumn - preparedRing;
    column <= middleColumn + preparedRing;
    column++
  ) {
    for (
      let row = middleRow - preparedRing;
      row <= middleRow + preparedRing;
      row++
    ) {
      keys.push(chunkKeyOf(column, row));
    }
  }
  return keys;
};

/**
 * Everything solid on one Island, marked chunk by chunk as the
 * Character (or the Vehicle they drive) comes near.
 */
export class ObstacleField {
  readonly grid: ObstacleGrid = createObstacleGrid();
  readonly obstacles: Obstacles = toObstacles(this.grid);
  private readonly pending = new Map<string, SolidSource[]>();
  private readonly marked = new Set<SolidSource>();
  private readonly preparedChunks = new Set<string>();
  private nearby:
    { middle: string; sources: readonly SolidSource[] } | undefined;

  constructor(
    sources: readonly SolidSource[],
    private readonly clearSpots: readonly ClearSpot[] = [],
  ) {
    for (const source of sources) {
      const reach = source.reach;
      for (
        let column = toChunk(source.centre.x - reach);
        column <= toChunk(source.centre.x + reach);
        column++
      ) {
        for (
          let row = toChunk(source.centre.z - reach);
          row <= toChunk(source.centre.z + reach);
          row++
        ) {
          const key = chunkKeyOf(column, row);
          const list = this.pending.get(key) ?? [];
          list.push(source);
          this.pending.set(key, list);
        }
      }
    }
  }

  /** Marks everything near a point that isn't marked yet. */
  prepareAround(point: MapPoint): void {
    for (const key of listChunkKeysAround(point)) {
      this.prepareChunk(key);
    }
  }

  /**
   * Marks the solid things near `point` for no longer than `budgetMs` at a
   * time, so a Character can be put down a few things a frame rather than
   * all at once, and says how many are marked of how many there are.
   */
  prepareAroundWithin(
    point: MapPoint,
    budgetMs: number,
    now: () => number = () => performance.now(),
  ): NearbyMarking {
    const middle = chunkKeyOf(toChunk(point.x), toChunk(point.z));
    if (this.nearby?.middle !== middle) {
      const sources = new Set<SolidSource>();
      for (const key of listChunkKeysAround(point)) {
        for (const source of this.pending.get(key) ?? []) {
          sources.add(source);
        }
      }
      this.nearby = { middle, sources: [...sources] };
    }
    const { sources } = this.nearby;
    const startedAt = now();
    for (const source of sources) {
      if (this.marked.has(source)) {
        continue;
      }
      this.markSource(source);
      if (now() - startedAt >= budgetMs) {
        break;
      }
    }
    const marked = sources.filter((source) => this.marked.has(source)).length;
    if (marked === sources.length) {
      this.prepareAround(point);
    }
    return { marked, total: sources.length };
  }

  /** Marks everything on the Island at once, as the tests do. */
  prepareAll(): void {
    for (const key of [...this.pending.keys()]) {
      this.prepareChunk(key);
    }
  }

  private prepareChunk(key: string): void {
    if (this.preparedChunks.has(key)) {
      return;
    }
    this.preparedChunks.add(key);
    for (const source of this.pending.get(key) ?? []) {
      if (!this.marked.has(source)) {
        this.markSource(source);
      }
    }
    this.pending.delete(key);
  }

  private markSource(source: SolidSource): void {
    this.marked.add(source);
    source.mark(this.grid);
    for (const spot of this.clearSpots) {
      if (
        Math.hypot(
          spot.centre.x - source.centre.x,
          spot.centre.z - source.centre.z,
        ) <=
        source.reach + spot.radius
      ) {
        clearObstacleCells(this.grid, spot.centre, spot.radius);
      }
    }
  }
}
