import { BoxGeometry, CylinderGeometry, TorusGeometry } from "three";
import {
  palette,
  shade,
  type AttractionBuilder,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";

/* Colours: basalt walls, Minoan red and black, cream stone and bronze */

export const wallBasalt = "#4a4441";
export const coping = "#8e8780";
export const gravel = "#7b736c";
export const minoanRed = "#a8322a";
export const minoanBlack = "#22201f";
export const limestone = "#d8c9a6";
export const terracotta = "#b5532e";
export const bronze = "#b5793a";
export const threadRed = "#d42a2a";
export const flameOrange = "#ff6a1f";
export const flameYellow = "#ffc04a";
export const signColour = "#8f2a22";

export const hash = (a: number, b: number, c: number): number => {
  const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43_758.5453;
  return value - Math.floor(value);
};

/* ------------------------------------------------------------------ */
/* The plan: a maze of 7 by 7 rooms round a court of 3 by 3            */
/* ------------------------------------------------------------------ */

export const cells = 7;
export const cellSize = 1.6;
export const half = (cells * cellSize) / 2;
export const wallHeight = 1.35;
const wallThickness = 0.3;
const courtFirst = 2;
const courtLast = 4;
const entranceColumn = 3;
const courtDoorColumn = 3;

export const cellX = (column: number): number =>
  (column - (cells - 1) / 2) * cellSize;
export const cellZ = (row: number): number =>
  (row - (cells - 1) / 2) * cellSize;
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
  /** `across[line][column]`: a wall along x on the z line `line`. */
  across: boolean[][];
  /** `along[line][row]`: a wall along z on the x line `line`. */
  along: boolean[][];
}

const planMaze = (seed: number): MazePlan => {
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
  const random = makeRandom(seed);
  const seen = new Set<number>([entranceColumn * cells + cells - 1]);
  const stack: [number, number][] = [[entranceColumn, cells - 1]];
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
        !seen.has(nextColumn * cells + nextRow)
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
    seen.add(nextColumn * cells + nextRow);
    stack.push([nextColumn, nextRow]);
  }
  across[cells][entranceColumn] = false;
  across[courtLast + 1][courtDoorColumn] = false;
  return { across, along };
};

/** The rooms from the entrance to the court's door, walking the maze. */
const walkMaze = (plan: MazePlan): [number, number][] => {
  const key = (column: number, row: number) => column * cells + row;
  const start = key(entranceColumn, cells - 1);
  const goal = key(courtDoorColumn, courtLast + 1);
  const cameFrom = new Map<number, number>([[start, start]]);
  const queue = [start];
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
      if (
        isOpen &&
        !isCourt(column + stepColumn, row + stepRow) &&
        !cameFrom.has(next)
      ) {
        cameFrom.set(next, here);
        queue.push(next);
      }
    });
  }
  const rooms: [number, number][] = [];
  let walk = goal;
  while (walk !== start) {
    rooms.unshift([Math.floor(walk / cells), walk % cells]);
    walk = cameFrom.get(walk) ?? start;
  }
  rooms.unshift([entranceColumn, cells - 1]);
  return rooms;
};

/** Picks the first maze whose way in winds a good long way round. */
const findGoodMaze = (): { plan: MazePlan; rooms: [number, number][] } => {
  for (let seed = 3_000; ; seed++) {
    const plan = planMaze(seed);
    const rooms = walkMaze(plan);
    if (rooms.length >= 16) {
      return { plan, rooms };
    }
  }
};

const { plan, rooms } = findGoodMaze();

export const courtFinish: LocalPoint = { x: 0, z: 1.25 };
export const threadStart: LocalPoint = {
  x: cellX(entranceColumn),
  z: half + 1.3,
};

/** Ariadne's thread: from outside the gate, round the maze, into the court. */
export const threadRoute: readonly LocalPoint[] = [
  threadStart,
  { x: cellX(entranceColumn), z: half + 0.2 },
  ...rooms.map(([column, row]) => ({ x: cellX(column), z: cellZ(row) })),
  { x: cellX(courtDoorColumn), z: lineAt(courtLast + 1) },
  courtFinish,
];

/* ------------------------------------------------------------------ */
/* The walls                                                           */
/* ------------------------------------------------------------------ */

export interface WallRun {
  from: LocalPoint;
  to: LocalPoint;
}

const listWallRuns = (): WallRun[] => {
  const runs: WallRun[] = [];
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
          runs.push({
            from: toPoint(lineIndex, start),
            to: toPoint(lineIndex, isWall ? step + 1 : step),
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

export const wallRuns = listWallRuns();

const isOuter = ({ from, to }: WallRun): boolean =>
  (from.x === to.x && Math.abs(from.x) > half - 0.01) ||
  (from.z === to.z && Math.abs(from.z) > half - 0.01);

const addWall = (builder: AttractionBuilder, run: WallRun, index: number) => {
  const { from, to } = run;
  const length = Math.hypot(to.x - from.x, to.z - from.z) + wallThickness;
  const turn = Math.atan2(to.x - from.x, to.z - from.z);
  const middle: Triple = [(from.x + to.x) / 2, 0, (from.z + to.z) / 2];
  const blocks = builder.isFar ? 1 : Math.max(2, Math.round(length / 0.8));
  const courses = builder.isFar ? 1 : 3;
  builder.painted(
    new BoxGeometry(wallThickness, wallHeight, length, 1, courses, blocks),
    (centre, normal) => {
      if (normal.y > 0.5) {
        return { colour: coping, finish: "matte" };
      }
      const mottle =
        0.84 +
        hash(
          Math.round(centre.x * 1.8),
          Math.round(centre.y * 2.3),
          Math.round(centre.z * 1.8) + index,
        ) *
          0.32;
      return { colour: shade(wallBasalt, mottle), finish: "matte" };
    },
    { at: [middle[0], wallHeight / 2, middle[2]], rotation: [0, turn, 0] },
    "matte",
    undefined,
  );
  builder.box(
    "matte",
    coping,
    [wallThickness + 0.08, 0.08, length + 0.08],
    [middle[0], wallHeight + 0.04, middle[2]],
    [0, turn, 0],
  );
  if (builder.isFar || !isOuter(run)) {
    return;
  }
  /* A Greek key band round the outside, terracotta on cream */
  const outward = Math.abs(from.x - to.x) < 0.01 ? Math.sign(from.x) : 0;
  const outwardZ = outward === 0 ? Math.sign(from.z) : 0;
  const face = wallThickness / 2 + 0.015;
  builder.box(
    "paint",
    limestone,
    [0.03, 0.24, length - 0.1],
    [middle[0] + outward * face, 1.02, middle[2] + outwardZ * face],
    [0, turn, 0],
  );
  if (outwardZ <= 0) {
    return;
  }
  const keys = Math.floor((length - 0.3) / 0.36);
  for (let key = 0; key < keys; key++) {
    const along = -((keys - 1) * 0.36) / 2 + key * 0.36;
    const x = middle[0] + Math.sin(turn) * along;
    const z = middle[2] + Math.cos(turn) * along + face + 0.01;
    builder.box("paint", terracotta, [0.2, 0.04, 0.03], [x, 1.1, z]);
    builder.box("paint", terracotta, [0.04, 0.16, 0.03], [x + 0.08, 1.04, z]);
    builder.box("paint", terracotta, [0.12, 0.04, 0.03], [x + 0.02, 0.97, z]);
  }
};

export const buildWalls = (builder: AttractionBuilder) => {
  wallRuns.forEach((run, index) => {
    addWall(builder, run, index);
  });
};

/* ------------------------------------------------------------------ */
/* The gate of Knossos: red Minoan columns and the horns of a bull     */
/* ------------------------------------------------------------------ */

export const gateZ = half + 0.42;
const columnX = 1.05;
const lintelY = 2.15;
export const labrysPivot: Triple = [0, lintelY + 1.2, gateZ];
export const torchSpots: readonly Triple[] = [-1, 1].map((side): Triple => [
  side * (columnX + 0.3),
  1.62,
  gateZ + 0.08,
]);

const addHorns = (builder: AttractionBuilder, [x, y, z]: Triple, size = 1) => {
  builder.box(
    "matte",
    limestone,
    [0.9 * size, 0.14 * size, 0.28 * size],
    [x, y + 0.07 * size, z],
  );
  builder.add(
    "matte",
    limestone,
    new TorusGeometry(
      0.3 * size,
      0.07 * size,
      builder.segments(6, 4),
      builder.segments(12, 6),
      Math.PI,
    ),
    { at: [x, y + 0.5 * size, z], rotation: [0, 0, Math.PI] },
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      limestone,
      [x + side * 0.3 * size, y + 0.48 * size, z],
      [x + side * 0.42 * size, y + 0.85 * size, z],
      0.12 * size,
      6,
    );
  });
};

export const buildGate = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    const x = side * columnX;
    builder.box("matte", limestone, [0.6, 0.12, 0.6], [x, 0.06, gateZ]);
    builder.lathe(
      "paint",
      minoanRed,
      [
        [0.001, 0.12],
        [0.15, 0.12],
        [0.15, 0.2],
        [0.13, 0.24],
        [0.2, 1.72],
        [0.001, 1.72],
      ],
      [x, 0, gateZ],
      "y",
      14,
    );
    builder.sphere(
      "paint",
      minoanBlack,
      0.29,
      [x, 1.82, gateZ],
      [1, 0.45, 1],
      14,
    );
    builder.box("paint", minoanBlack, [0.6, 0.12, 0.6], [x, 1.95, gateZ]);
    if (!builder.isFar) {
      builder.torus(
        "paint",
        minoanBlack,
        0.205,
        0.025,
        [x, 1.7, gateZ],
        "y",
        14,
      );
      /* A bronze torch bracket */
      builder.bar(
        "metal",
        bronze,
        [x + side * 0.17, 1.3, gateZ],
        [x + side * 0.3, 1.5, gateZ + 0.08],
        0.04,
        5,
      );
      builder.lathe(
        "metal",
        bronze,
        [
          [0.001, 0],
          [0.05, 0],
          [0.11, 0.12],
        ],
        [x + side * 0.3, 1.5, gateZ + 0.08],
        "y",
        10,
      );
    }
  });
  builder.box("paint", limestone, [2.9, 0.32, 0.7], [0, lintelY, gateZ]);
  builder.box(
    "paint",
    minoanRed,
    [2.92, 0.1, 0.72],
    [0, lintelY - 0.06, gateZ],
  );
  if (!builder.isFar) {
    for (let disc = 0; disc < 9; disc++) {
      builder.cylinder("paint", minoanBlack, {
        radius: 0.06,
        length: 0.02,
        at: [-1.2 + disc * 0.3, lintelY + 0.07, gateZ + 0.355],
        axis: "z",
        segments: 8,
      });
    }
  }
  addHorns(builder, [-0.85, lintelY + 0.16, gateZ], 0.8);
  addHorns(builder, [0.85, lintelY + 0.16, gateZ], 0.8);
  builder.cylinder("metal", bronze, {
    radius: 0.035,
    length: 1.05,
    at: [0, lintelY + 0.68, gateZ],
    segments: 8,
  });
};

/** The double axe of Knossos, a labrys, turning on its pole. */
export const buildLabrys = (builder: AttractionBuilder) => {
  builder.cylinder("metal", bronze, {
    radius: 0.03,
    length: 0.6,
    at: [0, 0, 0],
    segments: 8,
  });
  builder.box("metal", bronze, [0.18, 0.1, 0.07], [0, 0.12, 0]);
  [-1, 1].forEach((side) => {
    /* Each blade is a fan, wide at its edge and narrow at the handle */
    builder.add(
      "metal",
      "#d29a4a",
      new CylinderGeometry(
        0.22,
        0.22,
        0.04,
        builder.segments(14, 6),
        1,
        false,
        side > 0 ? 0 : Math.PI,
        Math.PI,
      ),
      {
        at: [side * 0.06, 0.12, 0],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 1.25],
      },
    );
  });
  builder.sphere("metal", bronze, 0.05, [0, 0.32, 0], [1, 1, 1], 8);
};

export const buildTorchFlame = (builder: AttractionBuilder) => {
  builder.lathe(
    "glow",
    flameOrange,
    [
      [0.001, 0],
      [0.1, 0.03],
      [0.08, 0.16],
      [0.03, 0.3],
      [0.001, 0.36],
    ],
    [0, 0, 0],
    "y",
    10,
  );
  builder.lathe(
    "glow",
    flameYellow,
    [
      [0.001, 0],
      [0.05, 0.02],
      [0.035, 0.12],
      [0.001, 0.2],
    ],
    [0, 0.01, 0.02],
    "y",
    8,
  );
};

/* ------------------------------------------------------------------ */
/* Ariadne's thread, laid along the way in                             */
/* ------------------------------------------------------------------ */

export const buildThread = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  for (let index = 1; index < threadRoute.length; index++) {
    const from = threadRoute[index - 1];
    const to = threadRoute[index];
    const wobble = (hash(index, 1, 1) - 0.5) * 0.18;
    builder.bar(
      "paint",
      threadRed,
      [from.x + wobble * 0.5, 0.05, from.z],
      [to.x + wobble, 0.05, to.z],
      0.035,
      4,
    );
  }
  /* The ball of thread, waiting by the gate */
  const ball: Triple = [threadStart.x + 0.5, 0.2, threadStart.z + 0.15];
  builder.sphere("matte", threadRed, 0.2, ball, [1, 1, 1], 10);
  [0.4, 1.6].forEach((turn) => {
    builder.add(
      "matte",
      shade(threadRed, 0.8),
      new TorusGeometry(0.2, 0.012, 4, 12),
      { at: ball, rotation: [turn, turn * 0.7, 0] },
    );
  });
};

/* ------------------------------------------------------------------ */
/* The court in the middle, where the Minotaur waits                   */
/* ------------------------------------------------------------------ */

export const amphoraSpots: readonly LocalPoint[] = [
  { x: -1.95, z: -1.95 },
  { x: 1.95, z: -1.95 },
  { x: -1.95, z: 1.95 },
  { x: 1.95, z: 1.95 },
];

const addAmphora = (builder: AttractionBuilder, { x, z }: LocalPoint) => {
  builder.lathe(
    "paint",
    terracotta,
    [
      [0.001, 0],
      [0.1, 0],
      [0.08, 0.06],
      [0.2, 0.25],
      [0.24, 0.42],
      [0.19, 0.6],
      [0.08, 0.7],
      [0.07, 0.8],
      [0.11, 0.84],
      [0.001, 0.84],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 8 : 11,
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("paint", minoanBlack, {
    radius: 0.235,
    length: 0.08,
    at: [x, 0.42, z],
    segments: 11,
  });
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      terracotta,
      new TorusGeometry(0.09, 0.018, 4, 7, Math.PI),
      {
        at: [x + side * 0.14, 0.68, z],
        rotation: [0, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2],
      },
    );
  });
};

export const buildCourt = (builder: AttractionBuilder) => {
  const inner = half - (cells - courtLast - 1) * cellSize;
  builder.box(
    "matte",
    limestone,
    [inner * 2 - 0.3, 0.04, inner * 2 - 0.3],
    [0, 0.025, 0],
  );
  builder.cylinder("paint", terracotta, {
    radius: 1.9,
    length: 0.05,
    at: [0, 0.03, 0],
    segments: builder.segments(32, 14),
  });
  builder.cylinder("paint", "#efe2c4", {
    radius: 1.7,
    length: 0.055,
    at: [0, 0.032, 0],
    segments: builder.segments(32, 14),
  });
  if (!builder.isFar) {
    /* A mosaic of a sun and waves */
    for (let ray = 0; ray < 12; ray++) {
      const angle = (ray / 12) * Math.PI * 2;
      builder.box(
        "paint",
        ray % 2 === 0 ? terracotta : "#3d6d8c",
        [0.12, 0.06, 0.55],
        [Math.sin(angle) * 1.35, 0.034, Math.cos(angle) * 1.35],
        [0, angle, 0],
      );
    }
  }
  amphoraSpots.forEach((spot) => {
    addAmphora(builder, spot);
  });
};

/* ------------------------------------------------------------------ */
/* The Minotaur: a friendly, rather daft bull who loves a cuddle       */
/* ------------------------------------------------------------------ */

const furBrown = "#8a5a3b";
const furDark = "#6a4128";
const muzzlePink = "#e8a7a0";
const hornCream = "#f1e6c8";
const tunicBlue = "#3d6d8c";
export const plinthHeight = 0.36;
export const neckPivot: Triple = [0, plinthHeight + 1.45, 0.02];

export const buildMinotaurBody = (builder: AttractionBuilder) => {
  const base = plinthHeight;
  builder.cylinder("matte", limestone, {
    radius: 0.62,
    radiusEnd: 0.56,
    length: base,
    at: [0, base / 2, 0],
    segments: 20,
  });
  builder.cylinder("paint", minoanRed, {
    radius: 0.575,
    length: 0.07,
    at: [0, base - 0.08, 0],
    segments: 20,
  });
  /* Hooves and stout legs */
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", furBrown, {
      radius: 0.11,
      radiusEnd: 0.13,
      length: 0.45,
      at: [side * 0.16, base + 0.3, 0],
      segments: 10,
    });
    builder.cylinder("paint", minoanBlack, {
      radius: 0.13,
      radiusEnd: 0.12,
      length: 0.1,
      at: [side * 0.16, base + 0.05, 0.02],
      segments: 10,
    });
  });
  /* A round tummy in a blue tunic */
  builder.lathe(
    "matte",
    tunicBlue,
    [
      [0.001, 0.45],
      [0.3, 0.45],
      [0.38, 0.62],
      [0.4, 0.85],
      [0.34, 1.12],
      [0.2, 1.3],
      [0.001, 1.32],
    ],
    [0, base, 0],
    "y",
    builder.isFar ? 10 : 18,
  );
  builder.torus(
    "metal",
    bronze,
    0.375,
    0.03,
    [0, base + 0.8, 0],
    "y",
    builder.isFar ? 10 : 20,
  );
  /* Arms, hugging a ball of red thread */
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      furBrown,
      [side * 0.33, base + 1.12, 0],
      [side * 0.3, base + 0.82, 0.3],
      0.13,
      8,
    );
    builder.sphere(
      "matte",
      furDark,
      0.08,
      [side * 0.16, base + 0.8, 0.42],
      [1, 1, 1],
      8,
    );
  });
  builder.sphere(
    "matte",
    threadRed,
    0.17,
    [0, base + 0.82, 0.46],
    [1, 1, 1],
    builder.isFar ? 8 : 12,
  );
  if (!builder.isFar) {
    builder.add(
      "matte",
      shade(threadRed, 0.8),
      new TorusGeometry(0.17, 0.01, 4, 14),
      { at: [0, base + 0.82, 0.46], rotation: [0.6, 0.4, 0] },
    );
    builder.bar(
      "matte",
      threadRed,
      [0.05, base + 0.68, 0.5],
      [0.25, base - 0.02, 0.62],
      0.02,
      4,
    );
  }
};

export const buildMinotaurHead = (builder: AttractionBuilder) => {
  /* Big shaggy head and a soft pink muzzle */
  builder.sphere("matte", furBrown, 0.3, [0, 0.3, 0], [1, 0.95, 0.95], 13);
  builder.sphere(
    "matte",
    furDark,
    0.16,
    [0, 0.6, -0.02],
    [1.3, 0.6, 1],
    builder.isFar ? 6 : 10,
  );
  builder.sphere(
    "matte",
    muzzlePink,
    0.2,
    [0, 0.18, 0.24],
    [1.15, 0.8, 0.8],
    builder.isFar ? 8 : 11,
  );
  /* Curly cream horns */
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      hornCream,
      [side * 0.22, 0.48, 0],
      [side * 0.42, 0.56, 0],
      0.09,
      6,
    );
    builder.bar(
      "paint",
      hornCream,
      [side * 0.42, 0.56, 0],
      [side * 0.48, 0.74, 0.03],
      0.065,
      6,
    );
    builder.sphere(
      "paint",
      hornCream,
      0.035,
      [side * 0.48, 0.76, 0.03],
      [1, 1, 1],
      6,
    );
    /* Floppy ears */
    builder.sphere(
      "matte",
      furBrown,
      0.08,
      [side * 0.33, 0.36, 0],
      [1.6, 0.6, 0.9],
      8,
    );
  });
  /* Big friendly eyes */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.085,
      [side * 0.12, 0.38, 0.23],
      [1, 1.1, 0.8],
      10,
    );
    builder.sphere(
      "paint",
      minoanBlack,
      0.04,
      [side * 0.11, 0.37, 0.3],
      [1, 1, 0.6],
      8,
    );
    if (!builder.isFar) {
      builder.sphere(
        "paint",
        palette.white,
        0.012,
        [side * 0.1 + 0.012, 0.39, 0.325],
        [1, 1, 1],
        4,
      );
      builder.bar(
        "matte",
        furDark,
        [side * 0.06, 0.48, 0.24],
        [side * 0.18, 0.5, 0.22],
        0.03,
        4,
      );
      /* Nostrils */
      builder.sphere(
        "matte",
        "#9a5a55",
        0.03,
        [side * 0.08, 0.2, 0.39],
        [1, 0.7, 0.5],
        6,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  /* A big grin, and a golden nose ring */
  builder.add(
    "matte",
    "#6b2b28",
    new TorusGeometry(0.1, 0.014, 4, 12, Math.PI),
    { at: [0, 0.12, 0.38], rotation: [0.3, 0, Math.PI] },
  );
  builder.torus("metal", "#e0b040", 0.05, 0.012, [0, 0.1, 0.42], "z", 12);
};

/* ------------------------------------------------------------------ */
/* The grounds round about                                             */
/* ------------------------------------------------------------------ */

export const cypressSpots: readonly LocalPoint[] = [
  { x: -half - 0.9, z: half + 0.9 },
  { x: half + 0.9, z: half + 0.9 },
  { x: -half - 0.9, z: -half - 0.9 },
  { x: half + 0.9, z: -half - 0.9 },
];

export const addCypress = (
  builder: AttractionBuilder,
  { x, z }: LocalPoint,
  size = 1,
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.09 * size,
    length: 0.5 * size,
    at: [x, 0.25 * size, z],
    segments: 6,
  });
  builder.lathe(
    "matte",
    "#2f4a2a",
    [
      [0.001, 0],
      [0.38, 0.1],
      [0.46, 0.7],
      [0.38, 1.6],
      [0.2, 2.4],
      [0.001, 2.8],
    ].map(([radius, height]) => [radius * size, height * size] as const),
    [x, 0.35 * size, z],
    "y",
    builder.isFar ? 6 : 10,
  );
};

/** A little goat that grazes outside the walls. */
export const buildGoat = (builder: AttractionBuilder) => {
  const coat = "#e6dccb";
  builder.sphere("matte", coat, 0.22, [0, 0.42, 0], [0.9, 0.8, 1.4], 10);
  [
    [-0.1, 0.18],
    [0.1, 0.18],
    [-0.1, -0.18],
    [0.1, -0.18],
  ].forEach(([x, z]) => {
    builder.cylinder("matte", "#5a4a3a", {
      radius: 0.03,
      length: 0.32,
      at: [x, 0.16, z],
      segments: 5,
    });
  });
  builder.sphere("matte", coat, 0.11, [0, 0.62, 0.3], [0.8, 0.9, 1.2], 8);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#6a5a48",
      [side * 0.04, 0.7, 0.28],
      [side * 0.07, 0.82, 0.2],
      0.03,
      4,
    );
    builder.sphere(
      "matte",
      coat,
      0.04,
      [side * 0.1, 0.65, 0.27],
      [1.6, 0.5, 0.8],
      5,
    );
  });
  builder.bar("matte", "#cfc3ae", [0, 0.54, 0.38], [0, 0.45, 0.38], 0.04, 4);
};
