import { BoxGeometry } from "three";
import { describe, expect, it } from "vitest";
import {
  buildPlacer,
  flatSurface,
  listChunkedSources,
  listPlacedModelSources,
  listTrianglePositions,
  ObstacleField,
} from "./island-obstacle-field.js";
import {
  clearObstacleCells,
  createObstacleGrid,
  cutTriangleToSlice,
  isInTheWayAt,
  markCylinder,
  markTriangles,
  moveAmongObstacles,
  obstacleBodyRadius,
  toObstacles,
  type ObstacleGrid,
} from "./island-obstacles.js";

const ground = flatSurface(0);

/** A box standing on the ground, `size` across and `height` tall, its middle at `x`, `z`. */
const markBox = (
  grid: ObstacleGrid,
  { x, z }: { x: number; z: number },
  size: [number, number, number],
  lift = 0,
  findSurface = ground,
) => {
  const geometry = new BoxGeometry(...size).translate(0, size[1] / 2 + lift, 0);
  markTriangles(
    grid,
    listTrianglePositions(geometry),
    buildPlacer({ x, y: 0, z, turn: 0, scale: 1 }),
    findSurface,
  );
};

const walk = (
  grid: ObstacleGrid,
  from: { x: number; z: number },
  to: { x: number; z: number },
  y = 0,
) => moveAmongObstacles(toObstacles(grid), from, to, y);

describe("cutting a triangle to the Character's slice of air", () => {
  it("keeps the part between the two heights", () => {
    const outline = cutTriangleToSlice(
      [
        [0, 0, 0],
        [2, 0, 0],
        [0, 2, 0],
      ],
      0.5,
      1,
    );
    expect(outline.length).toBeGreaterThanOrEqual(3);
    for (const [x] of outline) {
      expect(x).toBeLessThanOrEqual(1.5 + 1e-9);
    }
  });

  it("keeps nothing of a triangle wholly above or below", () => {
    expect(
      cutTriangleToSlice(
        [
          [0, 3, 0],
          [1, 3, 0],
          [0, 4, 1],
        ],
        0.3,
        1.2,
      ),
    ).toEqual([]);
  });
});

describe("what is in the Character's way", () => {
  it("steps over a kerb and walks under a roof", () => {
    expect(isInTheWayAt(0, 0, 0.2)).toBe(false);
    expect(isInTheWayAt(0, 2, 3)).toBe(false);
    expect(isInTheWayAt(0, 0, 1)).toBe(true);
  });

  it("isn't stopped on a deck by the posts holding the deck up", () => {
    expect(isInTheWayAt(1.2, 0, 1.2)).toBe(false);
  });
});

describe("walking among obstacles", () => {
  it("stops at a wall instead of walking through it", () => {
    const grid = createObstacleGrid();
    markBox(grid, { x: 0, z: 0 }, [0.2, 2, 6]);
    const end = walk(grid, { x: -2, z: 0 }, { x: 2, z: 0 });
    expect(end.x).toBeLessThan(-0.1 - obstacleBodyRadius + 0.01);
  });

  it("can't get through a wall in one big step either", () => {
    const grid = createObstacleGrid();
    markBox(grid, { x: 0, z: 0 }, [0.1, 2, 6]);
    expect(walk(grid, { x: -0.6, z: 0 }, { x: 0.6, z: 0 }).x).toBeLessThan(0);
  });

  it("slides along a wall when walking into it at a slant", () => {
    const grid = createObstacleGrid();
    markBox(grid, { x: 0, z: 0 }, [0.2, 2, 10]);
    const end = walk(grid, { x: -1, z: 0 }, { x: 1, z: 2 });
    expect(end.x).toBeLessThan(0);
    expect(end.z).toBeGreaterThan(1.5);
  });

  it("walks round a tree trunk but under its canopy", () => {
    const grid = createObstacleGrid();
    markBox(grid, { x: 0, z: 0 }, [0.4, 1.6, 0.4]);
    markBox(grid, { x: 0, z: 0 }, [4, 2, 4], 1.6);
    const obstacles = toObstacles(grid);
    expect(obstacles.isBlocked({ x: 0.1, z: 0 }, 0, 0.1)).toBe(true);
    expect(obstacles.isBlocked({ x: 1.5, z: 1.5 }, 0, obstacleBodyRadius)).toBe(
      false,
    );
  });

  it("steps over something low, like a kerb", () => {
    const grid = createObstacleGrid();
    markBox(grid, { x: 0, z: 0 }, [0.3, 0.2, 6]);
    expect(walk(grid, { x: -1, z: 0 }, { x: 1, z: 0 }).x).toBeCloseTo(1);
  });

  it("jumps clear over a low wall it is high enough above", () => {
    const grid = createObstacleGrid();
    markBox(grid, { x: 0, z: 0 }, [0.3, 0.8, 6]);
    expect(walk(grid, { x: -1, z: 0 }, { x: 1, z: 0 }, 0).x).toBeLessThan(0);
    expect(walk(grid, { x: -1, z: 0 }, { x: 1, z: 0 }, 0.7).x).toBeCloseTo(1);
  });

  it("lets a Character put down inside something walk out of it", () => {
    const grid = createObstacleGrid();
    markCylinder(grid, { x: 0, z: 0 }, 1, 0, 2);
    expect(walk(grid, { x: 0, z: 0 }, { x: 0.2, z: 0 })).toEqual({
      x: 0.2,
      z: 0,
    });
  });

  it("never lets a Character caught on the edge of a trunk walk on through it", () => {
    const grid = createObstacleGrid();
    markBox(grid, { x: 0, z: 0 }, [0.5, 2, 0.5]);
    const obstacles = toObstacles(grid);
    let here = { x: -0.4, z: 0 };
    expect(obstacles.isBlocked(here, 0, obstacleBodyRadius)).toBe(true);
    for (let step = 0; step < 40; step++) {
      here = walk(grid, here, { x: here.x + 0.05, z: 0 });
    }
    expect(here.x).toBeLessThan(0);
    expect(walk(grid, here, { x: here.x - 0.05, z: 0 }).x).toBeCloseTo(
      here.x - 0.05,
    );
  });

  it("works out the ground under each part of a long wall going up a slope", () => {
    const grid = createObstacleGrid();
    const slope = (x: number) => Math.max(0, x * 0.5);
    markBox(grid, { x: 2, z: 0 }, [4, 0.9, 0.3], 0, (x) => slope(x));
    const obstacles = toObstacles(grid);
    expect(obstacles.isBlocked({ x: 0.8, z: 0.3 }, slope(0.8), 0.24)).toBe(
      true,
    );
    expect(obstacles.isBlocked({ x: 3.5, z: 0.3 }, slope(3.5), 0.24)).toBe(
      false,
    );
  });

  it("clears a spot, such as where a ride starts", () => {
    const grid = createObstacleGrid();
    markCylinder(grid, { x: 0, z: 0 }, 1, 0, 2);
    clearObstacleCells(grid, { x: 0, z: 0 }, 2);
    expect(toObstacles(grid).isBlocked({ x: 0, z: 0 }, 0, 0.3)).toBe(false);
  });
});

describe("the obstacle field", () => {
  const box = () =>
    listTrianglePositions(new BoxGeometry(1, 2, 1).translate(0, 1, 0));

  it("marks a thing only once the Character comes near it", () => {
    const field = new ObstacleField(
      listPlacedModelSources(
        "crate",
        box,
        [{ x: 100, y: 0, z: 100, turn: 0, scale: 1 }],
        () => ground,
      ),
    );
    expect(field.grid.cells.size).toBe(0);
    field.prepareAround({ x: 0, z: 0 });
    expect(field.grid.cells.size).toBe(0);
    field.prepareAround({ x: 95, z: 95 });
    expect(field.obstacles.isBlocked({ x: 100, z: 100 }, 0, 0.3)).toBe(true);
  });

  it("splits one big model into chunks, each marked when near", () => {
    const wall = listTrianglePositions(
      new BoxGeometry(200, 2, 0.4).translate(0, 1, 0),
    );
    const sources = listChunkedSources("wall", () => wall, ground);
    expect(sources.length).toBeGreaterThan(1);
    const field = new ObstacleField(sources);
    field.prepareAll();
    expect(field.obstacles.isBlocked({ x: -90, z: 0 }, 0, 0.3)).toBe(true);
    expect(field.obstacles.isBlocked({ x: 90, z: 0 }, 0, 0.3)).toBe(true);
  });

  it("keeps its clear spots clear", () => {
    const field = new ObstacleField(
      listPlacedModelSources(
        "crate",
        box,
        [{ x: 0, y: 0, z: 0, turn: 0, scale: 1 }],
        () => ground,
      ),
      [{ centre: { x: 0, z: 0 }, radius: 2 }],
    );
    field.prepareAll();
    expect(field.obstacles.isBlocked({ x: 0, z: 0 }, 0, 0.3)).toBe(false);
  });
});
