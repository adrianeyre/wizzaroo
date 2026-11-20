import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "./attraction-kit.js";

const sand = "#dcc69a";
const wetSand = "#c4ab7e";
const rockGrey = "#7c776d";
const rockBrown = "#857563";
const rockDark = "#615c55";
const lichen = "#c9c2ad";
const weed = "#4d5e2a";
const wrack = "#6a6526";
const seaLettuce = "#6fa83c";
const poolWater = "#62bccb";
const musselBlue = "#272d3c";
const starOrange = "#e07a2e";
const starPurple = "#8a4f9e";
const anemoneRed = "#b8262f";
const crabShell = "#b8653a";
const signBlue = "#2e6e8e";

/** A steady pseudo-random number between 0 and 1 for a seed. */
const seeded = (seed: number): number => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const lumps = (x: number, y: number, z: number, seed: number): number =>
  0.5 * Math.sin(1.7 * x + 2.1 * z + seed) +
  0.3 * Math.sin(3.3 * y - 2.2 * x + seed * 2.3) +
  0.2 * Math.sin(5.1 * z + 4.3 * y + seed * 3.1);

const weedColour = new Color(weed);
const lichenColour = new Color(lichen);
const wetColour = new Color(rockDark);

/**
 * Adds a weathered rock: its shape pushed into lumps, flattened where
 * it meets the sand, and coloured with weed low down (where the tide
 * covers it) and pale lichen on top.
 */
const addRockGeometry = (
  builder: AttractionBuilder,
  geometry: BufferGeometry,
  {
    at,
    scale,
    turn,
    colour,
    seed,
    bumps,
    isRadialOnly = false,
    weedLine = 0.22,
  }: {
    at: Triple;
    scale: Triple;
    turn: number;
    colour: string;
    seed: number;
    bumps: number;
    isRadialOnly?: boolean;
    weedLine?: number;
  },
) => {
  geometry.deleteAttribute("uv");
  const positions = geometry.getAttribute("position");
  const point = new Vector3();
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    const push = 1 + bumps * lumps(point.x, point.y, point.z, seed);
    if (isRadialOnly) {
      const rise =
        point.y > 0.1 ? 0.06 * lumps(point.z * 2, 0, point.x * 2, seed) : 0;
      point.set(point.x * push, point.y + rise, point.z * push);
    } else {
      point.multiplyScalar(push);
    }
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  geometry.applyMatrix4(
    new Matrix4().compose(
      new Vector3(...at),
      new Quaternion().setFromEuler(new Euler(0, turn, 0)),
      new Vector3(...scale),
    ),
  );
  for (let index = 0; index < positions.count; index++) {
    if (positions.getY(index) < -0.04) {
      positions.setY(index, -0.04);
    }
  }
  const shaped = toCreasedNormals(geometry, (40 * Math.PI) / 180);
  const placed = shaped.getAttribute("position");
  const colours = new Float32Array(placed.count * 3);
  const base = new Color(colour);
  const tint = new Color();
  for (let index = 0; index < placed.count; index++) {
    point.fromBufferAttribute(placed, index);
    tint.copy(base);
    const speckle = lumps(point.x * 3, point.y * 3, point.z * 3, seed + 7);
    if (point.y < weedLine) {
      const depth = 1 - Math.max(0, point.y) / weedLine;
      tint.lerp(wetColour, 0.5 * depth);
      tint.lerp(weedColour, Math.min(1, depth * (0.75 + 0.25 * speckle)));
    } else if (speckle > 0.35) {
      tint.lerp(lichenColour, Math.min(0.7, (speckle - 0.35) * 1.6));
    }
    const strata = Math.sin(point.y * 22 + lumps(point.x, 0, point.z, seed));
    if (strata > 0.75) {
      tint.multiplyScalar(0.86);
    }
    tint.toArray(colours, index * 3);
  }
  shaped.setAttribute("color", new BufferAttribute(colours, 3));
  builder.addPainted("matte", shaped);
};

const addBoulder = (
  builder: AttractionBuilder,
  at: Triple,
  size: Triple,
  seed: number,
  colour: string = rockGrey,
  isSmooth = true,
) => {
  addRockGeometry(
    builder,
    new IcosahedronGeometry(1, builder.isFar ? 1 : isSmooth ? 2 : 1),
    {
      at,
      scale: size,
      turn: seed * 1.3,
      colour,
      seed,
      bumps: 0.21,
    },
  );
};

/* The pools */

interface Pool {
  x: number;
  z: number;
  radius: number;
  stretch: number;
  turn: number;
}

const pools: readonly Pool[] = [
  { x: -2.7, z: -3.1, radius: 1.3, stretch: 0.78, turn: 0.3 },
  { x: 2.5, z: -4.4, radius: 1.1, stretch: 0.82, turn: -0.4 },
  { x: 5.0, z: -1.4, radius: 0.78, stretch: 0.85, turn: 0.9 },
  { x: -5.5, z: -0.7, radius: 0.72, stretch: 0.8, turn: -0.7 },
];

const lipHeight = 0.36;
const waterHeight = 0.29;

const poolPoint = (pool: Pool, across: number, along: number): LocalPoint => ({
  x:
    pool.x +
    across * Math.cos(pool.turn) +
    along * pool.stretch * Math.sin(pool.turn),
  z:
    pool.z -
    across * Math.sin(pool.turn) +
    along * pool.stretch * Math.cos(pool.turn),
});

const buildPool = (builder: AttractionBuilder, pool: Pool, index: number) => {
  const { radius } = pool;
  const profile = [
    [radius * 1.56, -0.04],
    [radius * 1.52, 0.04],
    [radius * 1.42, 0.2],
    [radius * 1.28, lipHeight - 0.03],
    [radius * 1.14, lipHeight],
    [radius * 1.05, lipHeight - 0.04],
    [radius * 1.0, 0.2],
    [radius * 0.96, 0.04],
  ] as const;
  addRockGeometry(
    builder,
    new LatheGeometry(
      profile.map(([out, up]) => new Vector2(out, up)),
      builder.segments(28, 14),
    ),
    {
      at: [pool.x, 0, pool.z],
      scale: [1, 1, pool.stretch],
      turn: pool.turn,
      colour: index % 2 === 0 ? rockBrown : rockGrey,
      seed: index * 3.7 + 1,
      bumps: 0.14,
      isRadialOnly: true,
      weedLine: 0.16,
    },
  );
  builder.add(
    "matte",
    wetSand,
    new CylinderGeometry(radius, radius, 0.04, builder.segments(24, 12)),
    {
      at: [pool.x, 0.045, pool.z],
      rotation: [0, pool.turn, 0],
      scale: [1, 1, pool.stretch],
    },
  );
  builder.add(
    "water",
    poolWater,
    new CylinderGeometry(
      radius * 1.04,
      radius * 1.04,
      0.03,
      builder.segments(28, 14),
    ),
    {
      at: [pool.x, waterHeight, pool.z],
      rotation: [0, pool.turn, 0],
      scale: [1, 1, pool.stretch],
    },
  );
  if (builder.isFar) {
    return;
  }
  const pebbles = 5 + index;
  for (let pebble = 0; pebble < pebbles; pebble++) {
    const angle = seeded(index * 17 + pebble) * Math.PI * 2;
    const reach = radius * (0.25 + 0.6 * seeded(index * 31 + pebble));
    const spot = poolPoint(
      pool,
      Math.sin(angle) * reach,
      Math.cos(angle) * reach,
    );
    const size = 0.05 + 0.05 * seeded(pebble * 7 + index);
    builder.sphere(
      "matte",
      pebble % 3 === 0 ? "#9b958a" : pebble % 3 === 1 ? "#b9b1a2" : "#7f8a8c",
      size,
      [spot.x, 0.05, spot.z],
      [1.2, 0.55, 1],
      6,
    );
  }
  const weedSpot = poolPoint(pool, -radius * 0.35, radius * 0.3);
  builder.sphere(
    "matte",
    seaLettuce,
    radius * 0.22,
    [weedSpot.x, 0.07, weedSpot.z],
    [1.4, 0.3, 1],
    8,
  );
};

/* Little creatures */

const addStarfish = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string,
  turn: number,
  tilt = 0,
) => {
  const outline = new Shape();
  for (let corner = 0; corner < 10; corner++) {
    const angle = (corner / 10) * Math.PI * 2;
    const reach = corner % 2 === 0 ? size : size * 0.4;
    const x = Math.sin(angle) * reach;
    const y = Math.cos(angle) * reach;
    if (corner === 0) {
      outline.moveTo(x, y);
    } else {
      outline.lineTo(x, y);
    }
  }
  outline.closePath();
  builder.add(
    "matte",
    colour,
    new ExtrudeGeometry(outline, {
      depth: size * 0.08,
      bevelEnabled: true,
      bevelSize: size * 0.12,
      bevelThickness: size * 0.12,
      bevelSegments: 1,
    }),
    { at, rotation: [-Math.PI / 2 + tilt, 0, turn] },
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      shade(colour, 1.2),
      size * 0.22,
      [at[0], at[1] + size * 0.18, at[2]],
      [1, 0.5, 1],
      6,
    );
  }
};

const addAnemone = (builder: AttractionBuilder, at: Triple, size: number) => {
  builder.lathe(
    "paint",
    anemoneRed,
    [
      [0, size * 1.1],
      [size * 0.6, size * 1.05],
      [size * 0.95, size * 0.75],
      [size * 1.0, size * 0.3],
      [size * 0.9, 0],
    ],
    at,
    "y",
    10,
  );
  builder.torus(
    "paint",
    "#e0415a",
    size * 0.62,
    size * 0.16,
    [at[0], at[1] + size * 1.05, at[2]],
    "y",
    10,
  );
  builder.sphere(
    "paint",
    "#5aa8d8",
    size * 0.08,
    [at[0] + size * 0.95, at[1] + size * 0.9, at[2]],
    [1, 1, 1],
    6,
  );
};

const addSnakelocks = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
) => {
  const tentacles = 7;
  for (let arm = 0; arm < tentacles; arm++) {
    const angle = (arm / tentacles) * Math.PI * 2;
    const tip: Triple = [
      at[0] + Math.sin(angle) * size,
      at[1] + size * (0.7 + 0.3 * seeded(arm)),
      at[2] + Math.cos(angle) * size,
    ];
    builder.bar("matte", "#7fae5a", at, tip, size * 0.14, 4);
    builder.sphere("matte", "#b05aa8", size * 0.1, tip, [1, 1, 1], 4);
  }
};

const addMussels = (
  builder: AttractionBuilder,
  at: LocalPoint,
  seed: number,
  count = 5,
) => {
  for (let shell = 0; shell < count; shell++) {
    const angle = seeded(seed + shell) * Math.PI * 2;
    const reach = 0.08 + 0.14 * seeded(seed * 3 + shell);
    builder.add(
      "paint",
      shell % 2 === 0 ? musselBlue : "#323a4d",
      new SphereGeometry(0.07, 6, 4),
      {
        at: [
          at.x + Math.sin(angle) * reach,
          0.05 + 0.04 * seeded(seed + shell * 5),
          at.z + Math.cos(angle) * reach,
        ],
        rotation: [0.5, angle, 0.3],
        scale: [0.55, 0.45, 1.25],
      },
    );
  }
};

const addLimpets = (builder: AttractionBuilder, spots: readonly Triple[]) => {
  spots.forEach((spot) => {
    builder.lathe(
      "matte",
      "#cfc6b3",
      [
        [0, 0.06],
        [0.03, 0.05],
        [0.07, 0.01],
        [0.075, 0],
      ],
      spot,
      "y",
      7,
    );
  });
};

const addWrack = (builder: AttractionBuilder, at: Triple, seed: number) => {
  for (let frond = 0; frond < 3; frond++) {
    const angle = seed + frond * 2.1;
    builder.add(
      "matte",
      frond % 2 === 0 ? wrack : weed,
      new SphereGeometry(0.22, 7, 4),
      {
        at: [
          at[0] + Math.sin(angle) * 0.18,
          at[1] + 0.02,
          at[2] + Math.cos(angle) * 0.18,
        ],
        rotation: [0, angle, 0],
        scale: [0.55, 0.16, 1.3],
      },
    );
  }
};

/* Beach things */

const signSpot = { x: 2.6, z: 7.4 };
const crabsAt = { x: 0.6, z: 2.0 };

const bucketAt = { x: -2.1, z: 4.2 };

const buildBucketAndNet = (builder: AttractionBuilder) => {
  const { x, z } = bucketAt;
  builder.lathe(
    "paint",
    "#d8433a",
    [
      [0, 0.01],
      [0.15, 0],
      [0.19, 0.32],
      [0.205, 0.34],
      [0.19, 0.345],
      [0.17, 0.05],
    ],
    [x, 0, z],
    "y",
    16,
  );
  builder.cylinder("matte", "#b39468", {
    radius: 0.17,
    length: 0.03,
    at: [x, 0.25, z],
    segments: 14,
  });
  builder.torus("paint", "#f2c230", 0.2, 0.012, [x, 0.3, z], "y", 14);
  if (!builder.isFar) {
    builder.add(
      "paint",
      "#f2c230",
      new CylinderGeometry(0.012, 0.012, 0.1, 4),
      { at: [x, 0.37, z] },
    );
    builder.torus("metal", palette.steel, 0.19, 0.01, [x, 0.34, z], "x", 12);
    addStarfish(builder, [x + 0.4, 0.04, z + 0.25], 0.13, starOrange, 0.8);
  }
  const poleFrom: Triple = [x + 0.5, 0.03, z - 0.4];
  const poleTo: Triple = [x - 0.9, 0.06, z - 0.9];
  builder.bar("matte", "#d9b56a", poleFrom, poleTo, 0.035, 6);
  const hoop: Triple = [x - 1.2, 0.08, z - 1.0];
  builder.torus("paint", "#2f7bbf", 0.22, 0.015, hoop, "y", 16);
  builder.lathe(
    "matte",
    "#4fb06a",
    [
      [0.22, 0.01],
      [0.2, -0.0],
      [0.12, 0.02],
      [0.03, 0.04],
    ],
    [hoop[0], hoop[1] - 0.02, hoop[2]],
    "y",
    12,
  );
  builder.lathe(
    "matte",
    "#2d7f4f",
    [
      [0, 0.0],
      [0.1, 0.0],
      [0.12, 0.08],
      [0.07, 0.1],
    ],
    [x + 0.65, 0, z + 0.25],
    "y",
    10,
  );
};

const windbreakPoints: readonly LocalPoint[] = [
  { x: -7.2, z: 1.6 },
  { x: -6.9, z: 2.9 },
  { x: -6.2, z: 4.0 },
  { x: -5.2, z: 4.9 },
];

const buildWindbreak = (builder: AttractionBuilder) => {
  const stripes = ["#d8433a", "#f4f1ea", "#2f6fa8", "#f4f1ea"];
  windbreakPoints.forEach((post, index) => {
    builder.cylinder("matte", palette.paleTimber, {
      radius: 0.035,
      length: 1.25,
      at: [post.x, 0.6, post.z],
      segments: 6,
    });
    if (index === windbreakPoints.length - 1) {
      return;
    }
    const next = windbreakPoints[index + 1];
    const length = Math.hypot(next.x - post.x, next.z - post.z);
    const turn = Math.atan2(next.x - post.x, next.z - post.z) + Math.PI / 2;
    builder.box(
      "matte",
      stripes[index % stripes.length],
      [length - 0.06, 0.95, 0.02],
      [(post.x + next.x) / 2, 0.62, (post.z + next.z) / 2],
      [0, turn, 0],
    );
  });
  builder.box(
    "matte",
    "#e6b84a",
    [1.1, 0.02, 1.7],
    [-5.7, 0.02, 2.6],
    [0, -0.5, 0],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      "#f4f1ea",
      [1.1, 0.021, 0.18],
      [-5.62, 0.022, 2.75],
      [0, -0.5, 0],
    );
  }
};

/* The rocks */

interface Boulder {
  at: Triple;
  size: Triple;
  seed: number;
  colour: string;
  isSmooth: boolean;
}

const boulders: readonly Boulder[] = [
  {
    at: [4.4, 0, 2.6],
    size: [0.45, 0.3, 0.4],
    seed: 25,
    colour: rockBrown,
    isSmooth: false,
  },
  {
    at: [-4.2, 0, 1.1],
    size: [0.4, 0.26, 0.35],
    seed: 26,
    colour: rockGrey,
    isSmooth: false,
  },
  {
    at: [-0.9, 0, -4.7],
    size: [0.8, 0.28, 0.6],
    seed: 21,
    colour: rockBrown,
    isSmooth: false,
  },
  {
    at: [-4.5, 0, -1.9],
    size: [0.7, 0.25, 0.5],
    seed: 22,
    colour: rockGrey,
    isSmooth: false,
  },
  {
    at: [3.9, 0, -6.0],
    size: [0.9, 0.3, 0.55],
    seed: 23,
    colour: rockBrown,
    isSmooth: false,
  },
  {
    at: [3.4, 0, -2.2],
    size: [0.55, 0.22, 0.45],
    seed: 24,
    colour: rockGrey,
    isSmooth: false,
  },
  {
    at: [-6.1, 0, -4.6],
    size: [1.5, 0.85, 1.2],
    seed: 1,
    colour: rockGrey,
    isSmooth: true,
  },
  {
    at: [-3.6, 0, -6.2],
    size: [1.7, 0.7, 1.0],
    seed: 2,
    colour: rockBrown,
    isSmooth: true,
  },
  {
    at: [-0.6, 0, -6.6],
    size: [1.3, 0.95, 1.1],
    seed: 3,
    colour: rockGrey,
    isSmooth: true,
  },
  {
    at: [0.25, 0, -3.8],
    size: [0.95, 0.52, 0.85],
    seed: 4,
    colour: rockBrown,
    isSmooth: true,
  },
  {
    at: [3.0, 0, -6.9],
    size: [1.6, 0.75, 0.95],
    seed: 5,
    colour: rockDark,
    isSmooth: true,
  },
  {
    at: [5.5, 0, -4.7],
    size: [1.2, 1.0, 1.1],
    seed: 6,
    colour: rockGrey,
    isSmooth: true,
  },
  {
    at: [6.9, 0, -2.2],
    size: [0.9, 0.6, 1.0],
    seed: 7,
    colour: rockBrown,
    isSmooth: true,
  },
  {
    at: [-7.2, 0, -1.9],
    size: [0.85, 0.65, 1.0],
    seed: 8,
    colour: rockGrey,
    isSmooth: true,
  },
  {
    at: [-4.6, 0, -4.7],
    size: [0.55, 0.42, 0.5],
    seed: 9,
    colour: rockDark,
    isSmooth: false,
  },
  {
    at: [1.0, 0, -5.4],
    size: [0.6, 0.38, 0.5],
    seed: 10,
    colour: rockGrey,
    isSmooth: false,
  },
  {
    at: [4.1, 0, -3.0],
    size: [0.5, 0.34, 0.45],
    seed: 11,
    colour: rockBrown,
    isSmooth: false,
  },
  {
    at: [-1.1, 0, -1.5],
    size: [0.42, 0.3, 0.38],
    seed: 12,
    colour: rockGrey,
    isSmooth: false,
  },
  {
    at: [6.3, 0, 0.3],
    size: [0.5, 0.3, 0.45],
    seed: 13,
    colour: rockDark,
    isSmooth: false,
  },
  {
    at: [-6.6, 0, 0.6],
    size: [0.45, 0.32, 0.4],
    seed: 14,
    colour: rockBrown,
    isSmooth: false,
  },
  {
    at: [-1.8, 0, -7.6],
    size: [0.7, 0.4, 0.5],
    seed: 15,
    colour: rockDark,
    isSmooth: false,
  },
  {
    at: [5.1, 0, -6.8],
    size: [0.6, 0.4, 0.5],
    seed: 16,
    colour: rockGrey,
    isSmooth: false,
  },
];

const buildRocks = (builder: AttractionBuilder) => {
  const shown = builder.isFar
    ? boulders.filter((boulder) => boulder.size[0] > 0.8)
    : boulders;
  shown.forEach((boulder) => {
    addBoulder(
      builder,
      boulder.at,
      boulder.size,
      boulder.seed,
      boulder.colour,
      boulder.isSmooth,
    );
  });
  pools.forEach((pool, index) => {
    buildPool(builder, pool, index);
  });
  if (builder.isFar) {
    return;
  }
  addMussels(builder, { x: -5.0, z: -3.7 }, 3, 6);
  addMussels(builder, { x: 1.2, z: -4.0 }, 9, 5);
  addMussels(builder, { x: 4.6, z: -5.6 }, 17, 6);
  addMussels(builder, { x: -2.6, z: -5.4 }, 23, 4);
  addLimpets(builder, [
    [0.1, 0.5, -3.6],
    [0.55, 0.42, -3.95],
    [-0.75, 0.8, -6.0],
    [5.3, 0.92, -4.3],
    [-6.0, 0.78, -4.3],
  ]);
  addWrack(builder, [-4.6, 0.02, -5.4], 0.4);
  addWrack(builder, [2.2, 0.02, -6.1], 1.6);
  addWrack(builder, [6.3, 0.02, -3.4], 2.7);
  addWrack(builder, [-7.0, 0.02, -3.4], 3.3);
  const [first, second, third] = pools;
  const starA = poolPoint(first, 0.4, -0.3);
  addStarfish(builder, [starA.x, 0.07, starA.z], 0.2, starOrange, 0.4);
  const starB = poolPoint(second, -0.3, 0.2);
  addStarfish(builder, [starB.x, 0.07, starB.z], 0.18, starPurple, 1.2);
  addStarfish(builder, [-0.3, 0.47, -3.85], 0.16, starPurple, 2.2, 0.15);
  addStarfish(builder, [5.85, 0.55, -1.9], 0.15, starOrange, 0.2, -0.1);
  const lipA = poolPoint(first, 0, first.radius * 1.12);
  addAnemone(builder, [lipA.x, lipHeight - 0.03, lipA.z], 0.08);
  const lipB = poolPoint(second, second.radius * 1.12, 0);
  addAnemone(builder, [lipB.x, lipHeight - 0.03, lipB.z], 0.07);
  const lipC = poolPoint(third, 0, -third.radius * 1.12);
  addAnemone(builder, [lipC.x, lipHeight - 0.03, lipC.z], 0.07);
  const snakeA = poolPoint(first, -0.6, -0.2);
  addSnakelocks(builder, [snakeA.x, 0.06, snakeA.z], 0.14);
  const snakeB = poolPoint(second, 0.3, -0.4);
  addSnakelocks(builder, [snakeB.x, 0.06, snakeB.z], 0.12);
};

const buildBeach = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    wetSand,
    new CylinderGeometry(1, 1, 0.03, builder.segments(36, 18)),
    { at: [0, 0.025, -3.0], scale: [7.2, 1, 5.2] },
  );
  buildBucketAndNet(builder);
  buildWindbreak(builder);
  if (!builder.isFar) {
    for (let pebble = 0; pebble < 22; pebble++) {
      const angle = seeded(pebble * 3.1) * Math.PI * 2;
      const reach = 2.8 + 5 * seeded(pebble * 5.7);
      const x = Math.sin(angle) * reach;
      const z = Math.cos(angle) * reach;
      if (Math.hypot(x - crabsAt.x, z - crabsAt.z) < 2 || reach > 8) {
        continue;
      }
      builder.sphere(
        "matte",
        pebble % 3 === 0 ? "#a39c8f" : pebble % 3 === 1 ? "#cdc4b3" : "#87908f",
        0.05 + 0.06 * seeded(pebble),
        [x, 0.02, z],
        [1.3, 0.5, 1],
        6,
      );
    }
    [
      { x: 3.3, z: 2.1, turn: 0.4 },
      { x: 4.1, z: 4.4, turn: 2.1 },
      { x: -3.6, z: 1.6, turn: 1.2 },
    ].forEach((shell, index) => {
      builder.add(
        "matte",
        index === 1 ? "#e9d6c0" : "#f0e3cf",
        new SphereGeometry(0.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        {
          at: [shell.x, 0, shell.z],
          rotation: [0, shell.turn, 0],
          scale: [1, 0.45, 0.85],
        },
      );
    });
  }
  if (!builder.isFar) {
    builder.bar(
      "matte",
      "#8f8170",
      [5.0, 0.07, 4.6],
      [6.4, 0.09, 3.6],
      0.13,
      7,
    );
    builder.bar(
      "matte",
      "#8f8170",
      [5.9, 0.08, 3.95],
      [6.2, 0.12, 4.5],
      0.06,
      5,
    );
  }
  addSignBoard(builder, [signSpot.x, 0, signSpot.z - 0.9], signBlue);
};

/* The crabs */

const buildCrab = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    crabShell,
    0.13,
    [0, 0.09, 0],
    [1.35, 0.5, 1],
    builder.isFar ? 6 : 10,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    [-0.06, 0, 0.06].forEach((along, leg) => {
      const knee: Triple = [side * 0.24, 0.13, along - 0.02 * leg];
      builder.bar(
        "paint",
        shade(crabShell, 0.85),
        [side * 0.13, 0.08, along],
        knee,
        0.025,
        4,
      );
      builder.bar(
        "paint",
        shade(crabShell, 0.85),
        knee,
        [side * 0.31, 0, along - 0.04 * leg],
        0.02,
        4,
      );
    });
    const elbow: Triple = [side * 0.16, 0.1, 0.16];
    builder.bar("paint", crabShell, [side * 0.1, 0.09, 0.08], elbow, 0.035, 4);
    builder.sphere(
      "paint",
      shade(crabShell, 1.08),
      0.055,
      [side * 0.12, 0.1, 0.24],
      [0.8, 0.6, 1.3],
      7,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.018,
      [side * 0.11, 0.1, 0.31],
      [1, 1, 1.4],
      4,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.018,
      [side * 0.04, 0.17, 0.11],
      [1, 1, 1],
      4,
    );
  });
};

/* A goby darting round the big pool */

const buildFish = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    "#a8936a",
    0.06,
    [0, 0, 0],
    [0.6, 0.6, 1.6],
    builder.isFar ? 4 : 8,
  );
  builder.add("paint", "#8a774f", new CylinderGeometry(0, 0.045, 0.08, 4), {
    at: [0, 0, 0.12],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [0.3, 1, 1],
  });
};

/* The clamber over the rocks */

const rideRock = boulders[3];
const climbPath: readonly LocalSpot[] = [
  { x: 0.3, y: 0, z: -1.9, heading: Math.PI },
  { x: 0.28, y: 0.5, z: -3.2, heading: Math.PI },
  { x: 0.2, y: 0.56, z: -3.75, heading: -Math.PI / 2 },
  { x: 0.2, y: 0.56, z: -3.75, heading: -Math.PI / 2 },
  { x: 0.25, y: 0.56, z: -3.8, heading: Math.PI / 2 },
  { x: 0.25, y: 0.56, z: -3.8, heading: Math.PI / 2 },
  { x: 0.9, y: 0.4, z: -3.3, heading: 0.6 },
  { x: 1.6, y: 0, z: -2.1, heading: 0.4 },
];

const followClimb = (progress: number): LocalSpot => {
  const along =
    Math.min(0.9999, Math.max(0, progress)) * (climbPath.length - 1);
  const step = Math.floor(along);
  const share = along - step;
  const from = climbPath[step];
  const to = climbPath[step + 1];
  const eased = share * share * (3 - 2 * share);
  let turn = to.heading - from.heading;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased + Math.sin(share * Math.PI) * 0.06,
    z: from.z + (to.z - from.z) * eased,
    heading: from.heading + turn * eased,
  };
};

const rockBlockers: LocalBlocker[] = boulders
  .filter((boulder) => boulder !== rideRock)
  .map((boulder) => ({
    x: boulder.at[0],
    z: boulder.at[2],
    radius: Math.max(boulder.size[0], boulder.size[2]) * 0.92,
  }));

const poolBlockers: LocalBlocker[] = pools.map((pool) => ({
  x: pool.x,
  z: pool.z,
  radius: pool.radius * 1.32,
}));

export const rockPoolsModel: AttractionModel = {
  kind: "rock-pools",
  name: "Rock Pools",
  fact: "When the tide goes out, sea water is left behind in hollows in the rocks, making rock pools. Crabs, starfish, sea anemones and mussels live here: it is their habitat, giving them the food, water and shelter they need. Look carefully, and always put creatures back where you found them.",
  curriculumLink:
    "Science, Year 2: living things and their habitats. A rock pool is a habitat that gives the animals living there what they need to survive.",
  footprint: 8.6,
  setting: "shore",
  padColour: sand,
  seaSamples: [
    { x: -4, z: -9.4 },
    { x: 0, z: -9.6 },
    { x: 4, z: -9.4 },
  ],
  landSamples: [
    { x: 0, z: 1.5 },
    { x: -4, z: 3.5 },
    { x: 4, z: 3.5 },
    { x: 0, z: 6 },
    { x: -6, z: 4 },
    { x: 6, z: 4 },
  ],
  signSpot,
  build: (builder) => {
    buildBeach(builder);
    buildRocks(builder);
  },
  moving: [
    {
      name: "goby",
      pivot: [pools[0].x, waterHeight - 0.06, pools[0].z],
      build: buildFish,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 0.6,
        count: 2,
        speed: 0.9,
        isFacingAlong: true,
        bob: 0.02,
      },
    },
  ],
  wanderers: [
    {
      name: "crabs",
      build: buildCrab,
      count: 4,
      centre: crabsAt,
      radius: 1.7,
      speed: 0.45,
    },
  ],
  blockers: [
    ...rockBlockers,
    ...poolBlockers,
    { x: bucketAt.x, z: bucketAt.z, radius: 0.3 },
    ...windbreakPoints.map((post) => ({ x: post.x, z: post.z, radius: 0.3 })),
    { x: rideRock.at[0], z: rideRock.at[2], radius: 0.75 },
  ],
  rides: [
    {
      id: "rock-pools-clamber",
      name: "the rocks",
      start: { x: climbPath[0].x, z: climbPath[0].z },
      reach: 0.5,
      seconds: 9,
      finish: {
        x: climbPath[climbPath.length - 1].x,
        z: climbPath[climbPath.length - 1].z,
      },
      follow: followClimb,
    },
  ],
  tune: [72, 76, 79, 77, 74, 71, 72],
};
