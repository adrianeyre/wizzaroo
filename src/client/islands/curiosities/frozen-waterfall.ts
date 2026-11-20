import {
  ConeGeometry,
  DodecahedronGeometry,
  LatheGeometry,
  OctahedronGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowWhite = "#fbfdff";
const rock = "#5a6470";
const rockDark = "#454d57";
const ice = "#cdeefc";
const iceDeep = "#9fd4ee";
const pondIce = "#bfe2f2";
const stream = "#3d8fb8";
const firGreen = "#2f5e45";
const signColour = "#2f6f9a";

const lipHeight = 3.0;
const lipZ = -2.15;
const pool = { x: 0, z: -0.55, radius: 1.75 };
const iceTop = 0.05;
const splashAt: Triple = [1.95, iceTop, 0.85];
const glintAt: Triple = [0, 1.5, lipZ + 0.3];
const signAt: Triple = [-1.2, 0, 3.9];

/* The boulders the cliff is built from: x, y, z, size, turn */
const cliffRocks: readonly [number, number, number, number, number][] = [
  [-2.6, 0.7, -2.6, 1.15, 0.3],
  [-1.5, 1.2, -3.1, 1.2, 1.4],
  [-1.25, 2.4, -3.0, 0.95, 2.2],
  [1.4, 1.2, -3.1, 1.2, 0.8],
  [1.3, 2.4, -3.0, 0.95, 1.9],
  [2.6, 0.7, -2.5, 1.1, 2.7],
  [0, 1.0, -3.4, 1.2, 0.5],
  [0, 2.5, -3.25, 1.0, 1.1],
  [-3.2, 0.4, -1.4, 0.7, 1.7],
  [3.1, 0.4, -1.3, 0.65, 0.2],
];

/* ------------------------------------------------------------------ */
/* The cliff                                                           */
/* ------------------------------------------------------------------ */

const buildCliff = (builder: AttractionBuilder) => {
  cliffRocks.forEach(([x, y, z, size, turn], index) => {
    if (builder.isFar && index >= 8) {
      return;
    }
    builder.add(
      "matte",
      index % 2 === 0 ? rock : rockDark,
      new DodecahedronGeometry(size, 0),
      { at: [x, y, z], rotation: [turn, turn * 1.3, 0], scale: [1.2, 1, 0.9] },
      undefined,
    );
    if (!builder.isFar && y > 1.5) {
      builder.sphere(
        "matte",
        snowWhite,
        size * 0.75,
        [x, y + size * 0.65, z],
        [1.3, 0.35, 1.1],
        12,
      );
    }
  });
  /* The lip the river pours over */
  builder.box(
    "matte",
    rockDark,
    [1.8, 0.35, 1.0],
    [0, lipHeight - 0.15, lipZ - 0.45],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    snowWhite,
    [1.9, 0.12, 0.9],
    [0, lipHeight + 0.06, lipZ - 0.55],
  );
  /* The frozen river at the top, running back into the hills */
  builder.box(
    "glass",
    pondIce,
    [0.9, 0.05, 0.9],
    [0, lipHeight + 0.13, lipZ - 0.6],
  );
  /* Snow-laden fir trees on the clifftop */
  [
    [-2.2, 2.2, -3.4, 1.0],
    [2.3, 2.2, -3.3, 0.9],
    [-3.3, 0.8, -2.4, 0.8],
  ].forEach(([x, y, z, size]) => {
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.08 * size,
      length: 0.4 * size,
      at: [x, y + 0.2 * size, z],
      segments: 6,
    });
    [0, 1, 2].forEach((tier) => {
      const radius = (0.65 - tier * 0.17) * size;
      builder.add(
        "matte",
        shade(firGreen, 1 + tier * 0.06),
        new ConeGeometry(radius, 0.75 * size, 9),
        {
          at: [x, y + (0.7 + tier * 0.42) * size, z],
        },
      );
      builder.add(
        "matte",
        snowWhite,
        new ConeGeometry(radius * 0.5, 0.28 * size, 9),
        {
          at: [x, y + (0.98 + tier * 0.42) * size, z],
        },
      );
    });
  });
};

/* ------------------------------------------------------------------ */
/* The frozen fall and pool                                            */
/* ------------------------------------------------------------------ */

/** One frozen column, bulging where the ice built up as it froze. */
const columnProfile = (
  height: number,
  width: number,
  seed: number,
): Vector2[] => {
  const points: Vector2[] = [new Vector2(0.001, 0)];
  const steps = 8;
  for (let step = 0; step <= steps; step++) {
    const share = step / steps;
    const bulge = 1 + 0.25 * Math.sin(share * 9 + seed) + 0.35 * (1 - share);
    points.push(
      new Vector2(width * bulge * (0.55 + 0.45 * (1 - share)), share * height),
    );
  }
  points.push(new Vector2(0.001, height));
  return points;
};

const buildFall = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    /* One broad sheet of ice stands in for the columns */
    builder.add(
      "glass",
      ice,
      new LatheGeometry(
        [
          new Vector2(0.001, 0),
          new Vector2(0.75, 0),
          new Vector2(0.45, lipHeight - 0.1),
          new Vector2(0.001, lipHeight - 0.1),
        ],
        6,
      ),
      { at: [0, iceTop, lipZ + 0.2], scale: [1.4, 1, 0.6] },
    );
  }
  const columns = builder.isFar ? 0 : 7;
  for (let column = 0; column < columns; column++) {
    const share = column / (columns - 1);
    const x = -0.75 + share * 1.5;
    const width = 0.16 + (column % 3) * 0.04;
    builder.add(
      "glass",
      column % 2 === 0 ? ice : iceDeep,
      new LatheGeometry(
        columnProfile(lipHeight - 0.1, width, column * 1.7),
        12,
      ),
      { at: [x, iceTop, lipZ + 0.25 - Math.abs(share - 0.5) * 0.3] },
    );
  }
  /* The pool, frozen hard, with a heap of ice where the fall lands */
  builder.cylinder("glass", pondIce, {
    radius: pool.radius,
    length: iceTop,
    at: [pool.x, iceTop / 2, pool.z],
    segments: builder.isFar ? 16 : 40,
  });
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "glass",
    ice,
    0.9,
    [0, 0.0, lipZ + 0.55],
    [1.3, 0.55, 0.8],
    18,
  );
  builder.torus(
    "matte",
    snowWhite,
    pool.radius + 0.06,
    0.13,
    [pool.x, 0.03, pool.z],
    "y",
    40,
  );
  /* Icicles fringing the lip and the rocks either side */
  for (let icicle = 0; icicle < 13; icicle++) {
    const x = -0.95 + icicle * 0.16;
    const length = 0.35 + ((icicle * 7) % 5) * 0.12;
    builder.add(
      "glass",
      icicle % 2 === 0 ? ice : iceDeep,
      new ConeGeometry(0.05, length, 6).rotateX(Math.PI),
      {
        at: [x, lipHeight - 0.3 - length / 2, lipZ + 0.02],
      },
    );
  }
  [
    [-1.4, 1.7, -2.15],
    [1.45, 1.75, -2.2],
    [-2.2, 1.05, -1.75],
    [2.15, 1.0, -1.7],
  ].forEach(([x, y, z], group) => {
    for (let icicle = 0; icicle < 4; icicle++) {
      const length = 0.22 + ((icicle + group) % 3) * 0.12;
      builder.add(
        "glass",
        ice,
        new ConeGeometry(0.035, length, 6).rotateX(Math.PI),
        {
          at: [x - 0.18 + icicle * 0.12, y - length / 2, z],
        },
      );
    }
  });
  /* Cracks in the pool's ice, white lines radiating out */
  for (let crack = 0; crack < 6; crack++) {
    const angle = -1.1 + crack * 0.45;
    builder.box(
      "matte",
      "#eef8fd",
      [0.02, 0.004, 0.9 + (crack % 2) * 0.3],
      [
        pool.x + Math.sin(angle) * 0.9,
        iceTop + 0.002,
        pool.z + 0.4 + Math.cos(angle) * 0.5,
      ],
      [0, angle, 0],
    );
  }
};

/** The stream running on from the pool, still trickling under the ice. */
const buildStream = (builder: AttractionBuilder) => {
  const from: Triple = [1.2, 0.03, 0.4];
  const to: Triple = [3.3, 0.03, 2.0];
  builder.bar("water", stream, from, to, 0.55, builder.isFar ? 4 : 10);
  if (builder.isFar) {
    return;
  }
  /* Ice shelves along its banks, and pebbles */
  [-1, 1].forEach((side) => {
    builder.bar(
      "glass",
      pondIce,
      [from[0] - side * 0.25, 0.05, from[2] + side * 0.3],
      [to[0] - side * 0.25, 0.05, to[2] + side * 0.3],
      0.18,
      6,
    );
  });
  for (let pebble = 0; pebble < 6; pebble++) {
    const share = pebble / 5;
    builder.sphere(
      "matte",
      shade(rock, 1.2),
      0.07,
      [
        from[0] + (to[0] - from[0]) * share + (pebble % 2 === 0 ? 0.2 : -0.2),
        0.04,
        from[2] + (to[2] - from[2]) * share,
      ],
      [1.3, 0.6, 1],
      6,
    );
  }
};

/** Little jets where the water bubbles up through the stream. */
const buildTrickle = (builder: AttractionBuilder) => {
  [
    [0, 0, 0.09, 0.35],
    [0.25, 0.18, 0.06, 0.25],
    [-0.2, 0.15, 0.05, 0.22],
  ].forEach(([x, z, radius, height]) => {
    builder.cylinder("water", "#bfe6f7", {
      radius,
      radiusEnd: radius * 0.4,
      length: height,
      at: [x, height / 2, z],
      segments: 10,
    });
    builder.sphere(
      "water",
      "#e3f5fc",
      radius * 0.9,
      [x, height, z],
      [1, 0.8, 1],
      8,
    );
  });
  builder.torus("water", "#e3f5fc", 0.2, 0.03, [0, 0.02, 0.05], "y", 16);
};

/** Glints of light on the icicles. */
const buildGlints = (builder: AttractionBuilder) => {
  for (let glint = 0; glint < 10; glint++) {
    builder.add(
      "glow",
      "#f6fcff",
      new OctahedronGeometry(0.05 + (glint % 3) * 0.02, 0),
      {
        at: [
          -0.8 + ((glint * 0.53) % 1.6),
          -1.2 + ((glint * 0.71) % 2.6),
          0.15 + (glint % 2) * 0.1,
        ],
        scale: [0.5, 1.6, 0.5],
      },
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* A bench to sit and listen to the ice, facing the fall */
  addBench(builder, [-2.4, 0, 1.6], 2.4, palette.paleTimber);
  [
    [-3.5, 2.2, 0.6],
    [3.6, -0.2, 0.5],
    [0.8, 3.3, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowWhite, size, [x, 0, z], [1.5, 0.45, 1], 10);
  });
};

const poolDeck: Deck = ({ x, z }) =>
  Math.hypot(x - pool.x, z - pool.z) <= pool.radius
    ? { height: iceTop, kind: "ice" }
    : undefined;

export const frozenWaterfallModel: CuriosityModel = {
  kind: "frozen-waterfall",
  islandId: "frost-isle",
  name: "Frozen Waterfall",
  fact: "A waterfall is where a river flows over the edge of a cliff. In very cold winter weather the falling water can freeze into giant icicles, so the waterfall stands still. When the season changes and spring brings warmer weather, the ice creaks, cracks and melts, and the river rushes on again.",
  curriculumLink:
    "Geography, Key Stage 1: use basic geographical vocabulary to refer to key physical features, including cliff, river, season and weather.",
  footprint: 4.6,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildCliff(builder);
    buildFall(builder);
    buildStream(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "trickle",
      pivot: splashAt,
      build: buildTrickle,
      motion: { kind: "splash", reach: 6, period: 1.1 },
    },
    {
      name: "glints",
      pivot: glintAt,
      build: buildGlints,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  decks: [poolDeck],
  blockers: [
    ...cliffRocks.map(([x, , z, size]) => ({ x, z, radius: size * 0.95 })),
    { x: 0, z: lipZ + 0.3, radius: 0.85 },
    { x: -2.4, z: 1.6, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Listen to the ice crack",
    news: "Creeeak... crack... boom! The frozen waterfall groaned as the ice shifted, ready for spring.",
    tune: [43, 50, 47, 55],
  },
};
