import {
  BufferAttribute,
  ExtrudeGeometry,
  Shape,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import {
  addBench,
  addBush,
  addLampPost,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "./attraction-kit.js";

const cells = 9;
const cellSize = 1.6;
const half = (cells * cellSize) / 2;
const hedgeHeight = 1.3;
const hedgeHalfThickness = 0.24;
const hedgeBlockerRadius = hedgeHalfThickness + 0.24;
const courtFirst = 3;
const courtLast = 5;
const entranceColumn = 4;
const courtDoorColumn = 4;

const hedgeGreen = "#37722f";
const gravel = "#bdae93";
const courtStone = "#d2cab8";
const statueStone = "#ddd6c6";
const plinthStone = "#b9b09f";

/* The maze plan */

const cellX = (column: number): number => (column - (cells - 1) / 2) * cellSize;
const cellZ = (row: number): number => (row - (cells - 1) / 2) * cellSize;
const lineAt = (line: number): number => (line - cells / 2) * cellSize;

const isCourt = (column: number, row: number): boolean =>
  column >= courtFirst &&
  column <= courtLast &&
  row >= courtFirst &&
  row <= courtLast;

const makeRandom = (seed: number) => {
  let state = seed;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

interface MazePlan {
  /** `across[line][column]`: a hedge along x on the z line `line`. */
  across: boolean[][];
  /** `along[line][row]`: a hedge along z on the x line `line`. */
  along: boolean[][];
}

const planMaze = (): MazePlan => {
  const across = Array.from({ length: cells + 1 }, () =>
    Array.from({ length: cells }, () => true),
  );
  const along = Array.from({ length: cells + 1 }, () =>
    Array.from({ length: cells }, () => true),
  );
  for (let column = courtFirst; column <= courtLast; column++) {
    for (let row = courtFirst; row <= courtLast; row++) {
      if (column < courtLast) {
        along[column + 1][row] = false;
      }
      if (row < courtLast) {
        across[row + 1][column] = false;
      }
    }
  }
  const random = makeRandom(20_240_611);
  const seen = new Set<string>();
  const key = (column: number, row: number) =>
    `${String(column)},${String(row)}`;
  const stack: [number, number][] = [[entranceColumn, cells - 1]];
  seen.add(key(entranceColumn, cells - 1));
  while (stack.length > 0) {
    const [column, row] = stack[stack.length - 1];
    const options = (
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const
    ).filter(([stepColumn, stepRow]) => {
      const nextColumn = column + stepColumn;
      const nextRow = row + stepRow;
      return (
        nextColumn >= 0 &&
        nextColumn < cells &&
        nextRow >= 0 &&
        nextRow < cells &&
        !isCourt(nextColumn, nextRow) &&
        !seen.has(key(nextColumn, nextRow))
      );
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [stepColumn, stepRow] =
      options[Math.floor(random() * options.length)];
    const nextColumn = column + stepColumn;
    const nextRow = row + stepRow;
    if (stepColumn !== 0) {
      along[Math.max(column, nextColumn)][row] = false;
    } else {
      across[Math.max(row, nextRow)][column] = false;
    }
    seen.add(key(nextColumn, nextRow));
    stack.push([nextColumn, nextRow]);
  }
  across[cells][entranceColumn] = false;
  across[courtFirst][courtDoorColumn] = false;
  return { across, along };
};

const plan = planMaze();

interface HedgeRun {
  from: LocalPoint;
  to: LocalPoint;
}

const listHedgeRuns = (): HedgeRun[] => {
  const runs: HedgeRun[] = [];
  const collect = (
    walls: boolean[][],
    toPoint: (line: number, step: number) => LocalPoint,
  ) => {
    walls.forEach((line, lineIndex) => {
      let start = -1;
      line.forEach((isWall, step) => {
        if (isWall && start < 0) {
          start = step;
        }
        const isEnd = !isWall || step === line.length - 1;
        if (isEnd && start >= 0) {
          const stop = isWall ? step + 1 : step;
          runs.push({
            from: toPoint(lineIndex, start),
            to: toPoint(lineIndex, stop),
          });
          start = -1;
        }
      });
    });
  };
  collect(plan.across, (line, step) => ({ x: lineAt(step), z: lineAt(line) }));
  collect(plan.along, (line, step) => ({ x: lineAt(line), z: lineAt(step) }));
  return runs;
};

const hedgeRuns = listHedgeRuns();

const findRoute = (): LocalPoint[] => {
  const key = (column: number, row: number) => column * cells + row;
  const cameFrom = new Map<number, number>();
  const start = key(entranceColumn, cells - 1);
  const goal = key(courtDoorColumn, courtFirst);
  const queue = [start];
  cameFrom.set(start, start);
  while (queue.length > 0) {
    const here = queue.shift() ?? start;
    if (here === goal) {
      break;
    }
    const column = Math.floor(here / cells);
    const row = here % cells;
    const moves: [number, number, boolean][] = [
      [1, 0, column < cells - 1 && !plan.along[column + 1][row]],
      [-1, 0, column > 0 && !plan.along[column][row]],
      [0, 1, row < cells - 1 && !plan.across[row + 1][column]],
      [0, -1, row > 0 && !plan.across[row][column]],
    ];
    moves.forEach(([stepColumn, stepRow, isOpen]) => {
      const next = key(column + stepColumn, row + stepRow);
      if (isOpen && !cameFrom.has(next)) {
        cameFrom.set(next, here);
        queue.push(next);
      }
    });
  }
  const cellsOnRoute: number[] = [];
  let walk = goal;
  while (walk !== start) {
    cellsOnRoute.unshift(walk);
    walk = cameFrom.get(walk) ?? start;
  }
  cellsOnRoute.unshift(start);
  return [
    { x: cellX(entranceColumn), z: half + 0.9 },
    ...cellsOnRoute.map((cell) => ({
      x: cellX(Math.floor(cell / cells)),
      z: cellZ(cell % cells),
    })),
    { x: cellX(courtDoorColumn), z: cellZ(courtFirst) + 0.3 },
  ];
};

/**
 * The corridor-centre waypoints from just outside the entrance to the
 * statue court in the middle.
 */
export const hedgeMazeRoute: LocalPoint[] = findRoute();

/* The hedges */

const hash = (a: number, b: number, c: number): number => {
  const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43_758.5453;
  return value - Math.floor(value);
};

const hedgeSection = (): Shape => {
  const top = 0.2;
  const shape = new Shape();
  shape.moveTo(-hedgeHalfThickness - 0.02, 0);
  shape.lineTo(hedgeHalfThickness + 0.02, 0);
  shape.lineTo(hedgeHalfThickness, hedgeHeight - top);
  shape.quadraticCurveTo(
    hedgeHalfThickness,
    hedgeHeight,
    hedgeHalfThickness - top,
    hedgeHeight,
  );
  shape.lineTo(-hedgeHalfThickness + top, hedgeHeight);
  shape.quadraticCurveTo(
    -hedgeHalfThickness,
    hedgeHeight,
    -hedgeHalfThickness,
    hedgeHeight - top,
  );
  shape.lineTo(-hedgeHalfThickness - 0.02, 0);
  return shape;
};

/** Pushes the hedge's surface in and out a little, so it looks clipped. */
const roughen = (geometry: BufferGeometry, amount: number) => {
  const positions = geometry.getAttribute("position");
  if (!(positions instanceof BufferAttribute)) {
    return;
  }
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    if (y < 0.05) {
      continue;
    }
    positions.setXYZ(
      index,
      x + (hash(x, y, z) - 0.5) * amount,
      y + (hash(z, x, y) - 0.5) * amount * 0.8,
      z + (hash(y, z, x) - 0.5) * amount,
    );
  }
};

const addHedge = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
  colour: string,
  height = 1,
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const extended = length + hedgeHalfThickness * 2;
  const geometry = new ExtrudeGeometry(hedgeSection(), {
    depth: extended,
    steps: builder.isFar ? 1 : Math.max(1, Math.round(extended / 0.9)),
    bevelEnabled: false,
    curveSegments: builder.isFar ? 1 : 2,
  });
  geometry.translate(0, 0, -extended / 2);
  geometry.scale(1, height, 1);
  geometry.rotateY(Math.atan2(to.x - from.x, to.z - from.z));
  geometry.translate((from.x + to.x) / 2, 0, (from.z + to.z) / 2);
  const flat = geometry.toNonIndexed();
  if (!builder.isFar) {
    roughen(flat, 0.06);
  }
  builder.painted(
    flat,
    (centre, normal) => {
      const mottle = 0.95 + hash(centre.x, centre.y, centre.z) * 0.1;
      const light = normal.y > 0.5 ? 1.18 : 0.78 + (centre.y / 1.3) * 0.28;
      return {
        colour: shade(colour, mottle * light),
        finish: "matte",
      };
    },
    {},
    "matte",
  );
};

const buildHedges = (builder: AttractionBuilder) => {
  hedgeRuns.forEach((run, index) => {
    const colour = shade(hedgeGreen, 0.94 + hash(index, 3, 7) * 0.14);
    addHedge(builder, run.from, run.to, colour);
  });
  const archAt: Triple = [cellX(entranceColumn), hedgeHeight - 0.05, half];
  builder.add(
    "matte",
    shade(hedgeGreen, 1.05),
    new TorusGeometry(
      cellSize / 2,
      hedgeHalfThickness + 0.02,
      builder.segments(6, 4),
      builder.segments(14, 6),
      Math.PI,
    ),
    { at: archAt, scale: [1, 1.15, 1.05] },
  );
  [-1, 1].forEach((side) => {
    const postX = cellX(entranceColumn) + (side * cellSize) / 2;
    builder.sphere(
      "matte",
      shade(hedgeGreen, 1.1),
      0.3,
      [postX, hedgeHeight + 0.22, half],
      [1, 1, 1],
      10,
    );
  });
};

/* The statue court */

const buildStatue = (builder: AttractionBuilder) => {
  builder.cylinder("matte", courtStone, {
    radius: 2.15,
    length: 0.04,
    at: [0, 0.03, 0],
    segments: builder.segments(40, 16),
  });
  builder.cylinder("matte", shade(courtStone, 0.86), {
    radius: 2.2,
    length: 0.035,
    at: [0, 0.025, 0],
    segments: builder.segments(40, 16),
  });
  builder.roundedBox(
    "matte",
    plinthStone,
    [1.2, 0.18, 1.2],
    0.03,
    [0, 0.09, 0],
  );
  builder.roundedBox(
    "matte",
    plinthStone,
    [0.86, 0.9, 0.86],
    0.03,
    [0, 0.63, 0],
  );
  builder.roundedBox(
    "matte",
    shade(plinthStone, 1.06),
    [1.0, 0.12, 1.0],
    0.03,
    [0, 1.12, 0],
  );
  if (!builder.isFar) {
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((turn) => {
      builder.roundedBox(
        "matte",
        shade(plinthStone, 0.9),
        [0.56, 0.5, 0.03],
        0.01,
        [Math.sin(turn) * 0.44, 0.64, Math.cos(turn) * 0.44],
        [0, turn, 0],
      );
    });
  }
  const base = 1.18;
  builder.lathe(
    "matte",
    statueStone,
    [
      [0, 0],
      [0.3, 0],
      [0.31, 0.06],
      [0.26, 0.3],
      [0.2, 0.62],
      [0.15, 0.82],
      [0.17, 0.95],
      [0.18, 1.02],
      [0.12, 1.1],
      [0, 1.12],
    ],
    [0, base, 0],
    "y",
    14,
  );
  builder.sphere("matte", statueStone, 0.13, [0, base + 1.23, 0.01]);
  builder.sphere(
    "matte",
    shade(statueStone, 0.95),
    0.08,
    [0, base + 1.3, -0.08],
    [1, 0.9, 1],
    8,
  );
  builder.bar(
    "matte",
    statueStone,
    [0.15, base + 1.02, 0],
    [0.26, base + 1.33, 0.08],
    0.08,
    6,
  );
  builder.bar(
    "matte",
    statueStone,
    [0.26, base + 1.33, 0.08],
    [0.24, base + 1.62, 0.12],
    0.07,
    6,
  );
  builder.bar(
    "matte",
    statueStone,
    [-0.15, base + 1.02, 0],
    [-0.2, base + 0.72, 0.1],
    0.08,
    6,
  );
  builder.torus(
    "matte",
    statueStone,
    0.12,
    0.025,
    [0.24, base + 1.72, 0.12],
    "z",
    14,
  );
  builder.sphere(
    "matte",
    statueStone,
    0.07,
    [-0.2, base + 0.66, 0.14],
    [1, 0.8, 1.3],
    8,
  );
};

const courtCorners: Triple[] = [
  [-2.0, 0, -2.0],
  [2.0, 0, -2.0],
  [-2.0, 0, 2.0],
  [2.0, 0, 2.0],
];

const buildCourt = (builder: AttractionBuilder) => {
  buildStatue(builder);
  addBench(builder, [-1.25, 0, 1.85], Math.PI);
  addBench(builder, [1.25, 0, 1.85], Math.PI);
  courtCorners.forEach(([x, , z]) => {
    builder.cylinder("matte", "#b0643f", {
      radius: 0.2,
      radiusEnd: 0.24,
      length: 0.3,
      at: [x, 0.15, z],
      segments: 12,
    });
    builder.sphere("matte", shade(hedgeGreen, 1.15), 0.28, [x, 0.55, z]);
  });
};

/* The grounds */

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    gravel,
    [cells * cellSize + 0.4, 0.04, cells * cellSize + 0.4],
    [0, 0.02, 0],
  );
  builder.box("matte", gravel, [1.4, 0.04, 2.6], [0, 0.02, half + 1.5]);
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        palette.stone,
        [cells * cellSize + 0.5, 0.07, 0.08],
        [0, 0.035, side * (half + 0.22)],
      );
      builder.box(
        "matte",
        palette.stone,
        [0.08, 0.07, cells * cellSize + 0.5],
        [side * (half + 0.22), 0.035, 0],
      );
    });
  }
  [-1, 1].forEach((side) => {
    const x = side * 1.45;
    builder.cylinder("matte", palette.stone, {
      radius: 0.26,
      radiusEnd: 0.2,
      length: 0.36,
      at: [x, 0.18, half + 0.6],
      segments: 12,
    });
    builder.lathe(
      "matte",
      shade(hedgeGreen, 1.08),
      [
        [0, 0],
        [0.24, 0.05],
        [0.2, 0.5],
        [0.11, 0.85],
        [0, 1.05],
      ],
      [x, 0.36, half + 0.6],
      "y",
      12,
    );
  });
  addLampPost(builder, [-1.1, 0, half + 2.3]);
  addBush(builder, [-6.2, 0, half + 1.4], 0.5, "#3a7d34");
  addBush(builder, [6.0, 0, half + 1.3], 0.55);
  addBush(builder, [half + 1.3, 0, -5.2], 0.6, "#3a7d34");
  addBush(builder, [-half - 1.3, 0, 4.2], 0.55);
  addBush(builder, [-half - 1.2, 0, -5.6], 0.5, "#3c8237");
  addBush(builder, [half + 1.2, 0, 3.6], 0.45);
  addSignBoard(builder, [2.3, 0, half + 1.6], hedgeGreen);
};

/* Blockers */

const listHedgeBlockers = (): LocalBlocker[] =>
  hedgeRuns.flatMap((run) =>
    listWallBlockers(run.from, run.to, hedgeBlockerRadius, 0.42),
  );

export const hedgeMazeModel: AttractionModel = {
  kind: "hedge-maze",
  name: "Hedge Maze",
  fact: "A maze like this is made of hedges grown close together and clipped flat. Hedges are plants: they need light, water and air to grow. A good trick for many mazes is to keep one hand on the same hedge all the way round.",
  curriculumLink:
    "Science, Year 3: plants. What plants need to grow, using clipped hedges.",
  footprint: 11.6,
  setting: "inland",
  signSpot: { x: 2.3, z: half + 2.4 },
  build: (builder) => {
    buildGrounds(builder);
    buildHedges(builder);
    buildCourt(builder);
  },
  blockers: [
    ...listHedgeBlockers(),
    { x: 0, z: 0, radius: 0.85 },
    ...courtCorners.map(([x, , z]) => ({ x, z, radius: 0.32 })),
    { x: -1.25, z: 1.85, radius: 0.45 },
    { x: 1.25, z: 1.85, radius: 0.45 },
    { x: -1.45, z: half + 0.6, radius: 0.3 },
    { x: 1.45, z: half + 0.6, radius: 0.3 },
  ],
};
