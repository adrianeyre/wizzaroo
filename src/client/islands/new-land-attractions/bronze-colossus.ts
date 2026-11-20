import { LatheGeometry, Vector2 } from "three";
import {
  addSignBoard,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  basalt,
  bronze,
  brightBronze,
  buildBrazierFlame,
  buildColonnade,
  buildGull,
  buildPlinth,
  buildStatue,
  buildSunCrown,
  buildTorchFlame,
  buildTorchHalo,
  darkBronze,
  flameOrange,
  galleryFloor,
  headAt,
  listColumnSpots,
  marble,
  marbleShadow,
  plinthTop,
  stairFootZ,
  stairs,
  statueAt,
  torchCup,
  verdigris,
} from "./bronze-colossus-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const ashPad = "#6e655e";
const paving = "#cdbfa8";
const pavingDark = "#b3a58e";
const terracotta = "#b8643a";
const copper = "#c8643a";
const tin = "#c9ccd0";
const olive = "#7d8f55";
const cypress = "#2f4f2e";
const signColour = "#8a5a22";

const brazierSpots = [
  { x: -2.0, z: 3.2 },
  { x: 2.0, z: 3.2 },
];
const brazierBowlY = 1.0;
const thumbAt = { x: 5.5, z: 1.4 };
const forgeAt = { x: -5.6, z: 1.2 };
const signAt = { x: -3.0, z: 7.6 };
const rideStart = { x: 0, z: stairFootZ + 0.5 };
const rideFinish = { x: 1.4, z: stairFootZ + 1.2 };

/* ------------------------------------------------------------------ */
/* The plaza round the statue                                          */
/* ------------------------------------------------------------------ */

const buildPlaza = (builder: AttractionBuilder) => {
  builder.cylinder("matte", paving, {
    radius: 7.6,
    length: 0.03,
    at: [0, 0.015, -0.6],
    segments: builder.segments(40, 20),
  });
  builder.box(
    "matte",
    pavingDark,
    [2.4, 0.032, 9.5 - stairFootZ],
    [0, 0.016, (stairFootZ + 9.5) / 2],
  );
  /* A sun mosaic in front of the stairs */
  const mosaic = { x: 0, z: 6.4 };
  builder.cylinder("matte", sunMosaic(0), {
    radius: 0.7,
    length: 0.045,
    at: [mosaic.x, 0.022, mosaic.z],
    segments: builder.segments(24, 12),
  });
  builder.cylinder("matte", basalt, {
    radius: 1.75,
    length: 0.05,
    at: [mosaic.x, 0.025, mosaic.z],
    segments: builder.segments(32, 16),
    isOpen: true,
  });
  const rays = builder.isFar ? 0 : 12;
  for (let ray = 0; ray < rays; ray++) {
    const angle = (ray / rays) * Math.PI * 2;
    const length = ray % 2 === 0 ? 0.95 : 0.6;
    builder.box(
      "matte",
      sunMosaic(ray % 2 === 0 ? 1 : 2),
      [0.2, 0.04, length],
      [
        mosaic.x + Math.sin(angle) * (0.75 + length / 2),
        0.02,
        mosaic.z + Math.cos(angle) * (0.75 + length / 2),
      ],
      [0, angle, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* A low basalt kerb round the plaza */
  builder.cylinder("matte", basalt, {
    radius: 7.62,
    length: 0.08,
    at: [0, 0.04, -0.6],
    segments: 40,
    isOpen: true,
  });
};

const sunMosaic = (tone: number): string =>
  ["#e8b84e", "#d9772e", "#f0d27a"][tone];

/* ------------------------------------------------------------------ */
/* Braziers, torches, benches and trees                                */
/* ------------------------------------------------------------------ */

const addBrazier = (
  builder: AttractionBuilder,
  { x, z }: { x: number; z: number },
) => {
  builder.cylinder("matte", marbleShadow, {
    radius: 0.42,
    length: 0.12,
    at: [x, 0.06, z],
    segments: 14,
  });
  for (let leg = 0; leg < (builder.isFar ? 0 : 3); leg++) {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      darkBronze,
      [x + Math.sin(angle) * 0.34, 0.1, z + Math.cos(angle) * 0.34],
      [
        x + Math.sin(angle) * 0.2,
        brazierBowlY - 0.05,
        z + Math.cos(angle) * 0.2,
      ],
      0.07,
      6,
    );
  }
  builder.lathe(
    "metal",
    bronze,
    [
      [0.05, -0.12],
      [0.3, -0.06],
      [0.44, 0.1],
      [0.5, 0.18],
      [0.45, 0.2],
      [0.0, 0.08],
    ],
    [x, brazierBowlY, z],
    "y",
    builder.segments(12, 8),
  );
  if (builder.isFar) {
    builder.cylinder("metal", darkBronze, {
      radius: 0.08,
      length: brazierBowlY,
      at: [x, brazierBowlY / 2, z],
      segments: 5,
    });
  }
  builder.cylinder("glow", flameOrange, {
    radius: 0.4,
    length: 0.03,
    at: [x, brazierBowlY + 0.15, z],
    segments: 14,
  });
};

const addTorchStand = (builder: AttractionBuilder, x: number, z: number) => {
  if (builder.isFar) {
    builder.sphere("glow", "#ffb347", 0.15, [x, 2.38, z], [1, 1.4, 1], 6);
    builder.box("metal", darkBronze, [0.08, 2.3, 0.08], [x, 1.15, z]);
    return;
  }
  builder.cylinder("matte", marbleShadow, {
    radius: 0.2,
    length: 0.2,
    at: [x, 0.1, z],
    segments: 10,
  });
  builder.cylinder("metal", darkBronze, {
    radius: 0.05,
    radiusEnd: 0.04,
    length: 2.0,
    at: [x, 1.15, z],
    segments: 8,
  });
  builder.lathe(
    "metal",
    brightBronze,
    [
      [0.04, 0],
      [0.16, 0.12],
      [0.2, 0.22],
      [0, 0.2],
    ],
    [x, 2.12, z],
    "y",
    10,
  );
  builder.sphere("glow", "#ffb347", 0.15, [x, 2.38, z], [1, 1.4, 1], 8);
};

const addMarbleBench = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  turn: number,
) => {
  const across = (along: number): [number, number] => [
    x + Math.cos(turn) * along,
    z - Math.sin(turn) * along,
  ];
  builder.box("matte", marble, [1.5, 0.12, 0.5], [x, 0.46, z], [0, turn, 0]);
  [-0.55, 0.55].forEach((along) => {
    const [bx, bz] = across(along);
    builder.box(
      "matte",
      marbleShadow,
      [0.18, 0.4, 0.42],
      [bx, 0.2, bz],
      [0, turn, 0],
    );
    if (!builder.isFar) {
      builder.sphere(
        "matte",
        marbleShadow,
        0.1,
        [bx, 0.3, bz],
        [1.2, 1, 1.6],
        6,
      );
    }
  });
};

/** A gnarled olive tree with a silvery-green crown. */
const addOliveTree = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  turn: number,
) => {
  const lean = (distance: number, up: number): Triple => [
    x + Math.sin(turn) * distance,
    up,
    z + Math.cos(turn) * distance,
  ];
  builder.bar("matte", "#6b5a45", lean(0, 0), lean(0.25, 1.0), 0.32, 7);
  builder.bar("matte", "#6b5a45", lean(0.25, 1.0), lean(-0.1, 1.9), 0.24, 7);
  builder.bar("matte", "#6b5a45", lean(0.25, 1.0), lean(0.75, 1.8), 0.18, 6);
  const clumps: [number, number, number, number][] = builder.isFar
    ? [[0.2, 2.2, 0, 1.1]]
    : [
        [-0.1, 2.25, 0, 0.95],
        [0.75, 2.0, 0.3, 0.72],
        [-0.45, 2.1, 0.4, 0.66],
      ];
  clumps.forEach(([along, up, side, size], index) => {
    const [cx, cy, cz] = lean(along, up);
    builder.sphere(
      "matte",
      index % 2 === 0 ? olive : shade(olive, 1.15),
      size,
      [cx + Math.cos(turn) * side, cy, cz - Math.sin(turn) * side],
      [1.2, 0.6, 1.1],
      7,
    );
  });
};

const addCypress = (builder: AttractionBuilder, x: number, z: number) => {
  builder.cylinder("matte", "#5a3a22", {
    radius: 0.1,
    length: 0.6,
    at: [x, 0.3, z],
    segments: 6,
  });
  builder.lathe(
    "matte",
    cypress,
    [
      [0, 0.4],
      [0.45, 0.6],
      [0.55, 1.4],
      [0.48, 2.6],
      [0.28, 3.6],
      [0, 4.2],
    ],
    [x, 0, z],
    "y",
    builder.segments(9, 6),
  );
};

const addAmphora = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  size = 1,
) => {
  builder.lathe(
    "matte",
    terracotta,
    [
      [0, 0],
      [0.08, 0],
      [0.2, 0.15],
      [0.24, 0.4],
      [0.16, 0.62],
      [0.08, 0.7],
      [0.09, 0.8],
      [0.07, 0.8],
    ].map(([radius, height]) => [radius * size, height * size] as const),
    [x, 0, z],
    "y",
    12,
  );
  builder.box(
    "matte",
    basalt,
    [0.4 * size, 0.04, 0.02],
    [x, 0.4 * size, z + 0.235 * size],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      shade(terracotta, 0.9),
      [x + side * 0.08 * size, 0.74 * size, z],
      [x + side * 0.2 * size, 0.6 * size, z],
      0.04 * size,
      4,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The fallen bronze thumb, and how bronze is made                     */
/* ------------------------------------------------------------------ */

const buildThumb = (builder: AttractionBuilder) => {
  const { x, z } = thumbAt;
  const turn = 0.55;
  const along = (distance: number, up: number, side = 0): Triple => [
    x + Math.sin(turn) * distance + Math.cos(turn) * side,
    up,
    z + Math.cos(turn) * distance - Math.sin(turn) * side,
  ];
  /* A giant bronze thumb lying where it fell in the earthquake */
  builder.add(
    "metal",
    bronze,
    new LatheGeometry(
      [
        [0, -0.95],
        [0.36, -0.92],
        [0.42, -0.5],
        [0.4, 0.1],
        [0.43, 0.35],
        [0.38, 0.75],
        [0.24, 1.0],
        [0, 1.06],
      ].map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(12, 7),
    ),
    {
      at: along(0, 0.4),
      rotation: [Math.PI / 2, turn, 0],
      scale: [1, 1, 0.92],
    },
  );
  builder.cylinder("metal", basalt, {
    radius: 0.3,
    length: 0.02,
    at: along(-0.95, 0.4),
    axis: "z",
    segments: 14,
  });
  builder.box("metal", brightBronze, [0.42, 0.06, 0.48], along(0.68, 0.78), [
    0.12,
    turn,
    0,
  ]);
  builder.box("matte", marbleShadow, [1.0, 0.12, 2.4], along(0, 0.06), [
    0,
    turn,
    0,
  ]);
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", verdigris, {
    radius: 0.37,
    length: 0.04,
    at: along(-0.93, 0.4),
    axis: "z",
    segments: 14,
    isOpen: true,
  });
  [0.2, 0.32].forEach((share) => {
    builder.bar(
      "metal",
      darkBronze,
      along(share, 0.83, -0.25),
      along(share + 0.06, 0.83, 0.25),
      0.03,
      4,
    );
  });
  [-0.55, -0.1, 0.5].forEach((share, index) => {
    builder.sphere(
      "metal",
      verdigris,
      0.12 + index * 0.02,
      along(share, 0.62 + index * 0.06, index % 2 === 0 ? 0.32 : -0.34),
      [1.4, 0.6, 1],
      6,
    );
  });
  /* A child-sized plaque to read beside it */
  builder.box("matte", marbleShadow, [0.1, 0.5, 0.1], along(-0.4, 0.25, 0.85));
  builder.box("metal", darkBronze, [0.4, 0.26, 0.04], along(-0.4, 0.56, 0.85), [
    -0.5,
    turn + Math.PI / 2,
    0,
  ]);
};

const buildForge = (builder: AttractionBuilder) => {
  const { x, z } = forgeAt;
  builder.box("matte", basalt, [1.4, 0.55, 1.0], [x, 0.275, z]);
  builder.lathe(
    "metal",
    "#3b3330",
    [
      [0, 0],
      [0.22, 0.02],
      [0.3, 0.2],
      [0.32, 0.36],
      [0.28, 0.36],
      [0, 0.3],
    ],
    [x - 0.2, 0.55, z],
    "y",
    builder.segments(12, 6),
  );
  builder.cylinder("glow", "#ffae42", {
    radius: 0.27,
    length: 0.03,
    at: [x - 0.2, 0.86, z],
    segments: 14,
  });
  /* Copper and tin ingots: mixed and melted, they make bronze */
  const ingot = (ix: number, iy: number, iz: number, colour: string) => {
    builder.box("metal", colour, [0.32, 0.1, 0.14], [ix, iy, iz]);
  };
  ingot(x + 0.38, 0.6, z - 0.22, copper);
  ingot(x + 0.38, 0.6, z - 0.05, copper);
  ingot(x + 0.38, 0.7, z - 0.14, copper);
  ingot(x + 0.38, 0.6, z + 0.2, tin);
  if (!builder.isFar) {
    ingot(x + 0.38, 0.6, z + 0.36, tin);
    builder.cylinder("glow", "#ff7b1c", {
      radius: 0.08,
      length: 0.03,
      at: [x + 0.05, 0.57, z + 0.51],
      segments: 8,
    });
    for (let coal = 0; coal < 3; coal++) {
      builder.sphere(
        "glow",
        coal % 2 === 0 ? "#ff6a1a" : "#ffa040",
        0.07,
        [x - 0.5 + coal * 0.08, 0.57, z + 0.35 - (coal % 2) * 0.1],
        [1, 0.6, 1],
        6,
      );
    }
    /* Tongs and a ladle leaning on the hearth */
    builder.bar(
      "metal",
      "#4b5259",
      [x - 0.72, 0.05, z + 0.3],
      [x - 0.72, 0.85, z + 0.15],
      0.04,
      4,
    );
    builder.bar(
      "metal",
      "#4b5259",
      [x - 0.72, 0.05, z + 0.4],
      [x - 0.72, 0.85, z + 0.2],
      0.04,
      4,
    );
    addAmphora(builder, x - 1.1, z - 0.7, 0.9);
  }
};

/* ------------------------------------------------------------------ */
/* The ride: up the stairs, inside the statue, out onto the torch      */
/* ------------------------------------------------------------------ */

type Key = [progress: number, x: number, y: number, z: number, heading: number];

const lookout: Triple = [
  galleryFloor[0],
  galleryFloor[1],
  galleryFloor[2] + 0.62,
];
const shoulder: Triple = [statueAt.x + 0.9, plinthTop + 5.7, statueAt.z];
const plinthFront = stairs.topZ + 0.1;

const climbKeys: readonly Key[] = [
  [0, rideStart.x, 0, rideStart.z, Math.PI],
  [0.04, 0, 0, stairFootZ - 0.1, Math.PI],
  [0.2, 0, plinthTop, plinthFront, Math.PI],
  [0.27, 0, plinthTop, statueAt.z + 0.75, Math.PI],
  [0.37, shoulder[0], shoulder[1], shoulder[2], Math.PI],
  [0.46, lookout[0], lookout[1], lookout[2], 0],
  [0.55, lookout[0], lookout[1], lookout[2], 0.9],
  [0.65, lookout[0], lookout[1], lookout[2], -0.9],
  [0.7, lookout[0], lookout[1], lookout[2], 0],
  [0.78, shoulder[0], shoulder[1], shoulder[2], 0],
  [0.84, 0.3, plinthTop, statueAt.z + 0.75, 0],
  [0.88, 0, plinthTop, plinthFront, 0],
  [0.97, 0, 0, stairFootZ - 0.1, 0],
  [1, rideFinish.x, 0, rideFinish.z, 0.9],
];

const climbColossus = (progress: number): LocalSpot => {
  const share = Math.min(1, Math.max(0, progress));
  const index = Math.max(
    0,
    climbKeys.findIndex((key, at) => at > 0 && key[0] >= share) - 1,
  );
  const from = climbKeys[index];
  const to = climbKeys[Math.min(climbKeys.length - 1, index + 1)];
  const span = to[0] - from[0];
  const t = span > 0 ? (share - from[0]) / span : 1;
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    x: mix(from[1], to[1]),
    y: mix(from[2], to[2]),
    z: mix(from[3], to[3]),
    heading: mix(from[4], to[4]),
  };
};

/* ------------------------------------------------------------------ */
/* Everything that stays still                                         */
/* ------------------------------------------------------------------ */

const build = (builder: AttractionBuilder) => {
  buildPlaza(builder);
  buildPlinth(builder);
  buildStatue(builder);
  buildColonnade(builder);
  brazierSpots.forEach((spot) => {
    addBrazier(builder, spot);
  });
  addTorchStand(builder, -3.3, 4.3);
  addTorchStand(builder, 3.3, 4.3);
  addMarbleBench(builder, 3.9, 6.9, -0.5);
  addOliveTree(builder, 6.7, 4.6, 0.3);
  addOliveTree(builder, -6.9, -1.6, 2.1);
  addCypress(builder, 7.3, -3.6);
  addCypress(builder, -7.3, -4.4);
  buildThumb(builder);
  buildForge(builder);
  if (!builder.isFar) {
    addAmphora(builder, 6.2, 6.0);
  }
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
};

/** A visitor in a Greek tunic, facing +z. */
const buildVisitor = (builder: AttractionBuilder) => {
  builder.cylinder("paint", "#f4f1ea", {
    radius: 0.17,
    radiusEnd: 0.24,
    length: 0.5,
    at: [0, 0.55, 0],
    segments: 10,
  });
  builder.box("paint", "#3f6fb0", [0.36, 0.06, 0.3], [0, 0.72, 0]);
  if (builder.isFar) {
    builder.sphere("paint", "#c98d5e", 0.14, [0, 0.95, 0], [1, 1.05, 1], 6);
    return;
  }
  [-0.08, 0.08].forEach((side) => {
    builder.cylinder("paint", "#c98d5e", {
      radius: 0.05,
      length: 0.32,
      at: [side, 0.16, 0],
      segments: 6,
    });
    builder.box("paint", "#5a3a22", [0.08, 0.04, 0.14], [side, 0.02, 0.03]);
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      "#c98d5e",
      [side * 0.18, 0.78, 0],
      [side * 0.24, 0.5, 0.04],
      0.07,
      5,
    );
  });
  builder.sphere("paint", "#c98d5e", 0.14, [0, 0.95, 0], [1, 1.05, 1], 6);
  builder.sphere("paint", "#3b2414", 0.145, [0, 0.99, -0.03], [1, 0.9, 1], 6);
  builder.box("paint", olive, [0.3, 0.04, 0.06], [0, 1.04, 0.1], [-0.3, 0, 0]);
};

const crownPivot: Triple = [headAt[0], headAt[1] + 0.12, headAt[2] - 0.2];
const flamePivot: Triple = [torchCup[0], torchCup[1] + 0.45, torchCup[2]];

const columnBlockers: LocalBlocker[] = listColumnSpots().map(({ x, z }) => ({
  x,
  z,
  radius: 0.4,
}));

export const bronzeColossusModel: NewLandAttractionModel = {
  kind: "bronze-colossus",
  islandId: "ember-isle",
  name: "Bronze Colossus",
  fact: "The Colossus of Rhodes was a giant bronze statue of Helios, the ancient Greek god of the Sun, built around 280 BC and about 33 metres tall. Bronze is a mixture of copper and tin, which is harder than either metal on its own. An earthquake toppled the statue only about 54 years later, but it is still remembered as one of the Seven Wonders of the Ancient World.",
  curriculumLink:
    "History, Key Stage 2: Ancient Greece. A study of Greek life and achievements and their influence on the western world.",
  footprint: 9.5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build,
  moving: [
    {
      name: "torch flame",
      pivot: flamePivot,
      build: buildTorchFlame,
      motion: { kind: "flicker", period: 0.9 },
    },
    {
      name: "torch glow",
      pivot: flamePivot,
      build: buildTorchHalo,
      motion: { kind: "wake", reach: 10 },
      look: "halo",
    },
    {
      name: "sun crown",
      pivot: crownPivot,
      build: buildSunCrown,
      motion: { kind: "whirl", axis: "z", idle: 0.15, speed: 2.4, reach: 8 },
    },
    ...brazierSpots.map(({ x, z }, index) => ({
      name: `brazier flame ${String(index + 1)}`,
      pivot: [x, brazierBowlY + 0.16, z] satisfies Triple,
      build: buildBrazierFlame,
      motion: { kind: "flicker", period: 0.7, phase: index * 1.9 } as const,
    })),
    {
      name: "gulls",
      pivot: [statueAt.x, plinthTop + 7.6, statueAt.z],
      build: buildGull,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 3.1,
        count: 3,
        speed: 0.45,
        isFacingAlong: true,
        bob: 0.25,
      },
    },
  ],
  wanderers: [
    {
      name: "visitors",
      build: buildVisitor,
      count: 3,
      centre: { x: 0.4, z: 6.6 },
      radius: 1.7,
      speed: 0.5,
    },
  ],
  smoke: brazierSpots.map(({ x, z }) => ({
    at: [x, brazierBowlY + 0.9, z] satisfies Triple,
    colour: "#8d847c",
    puffs: 5,
    size: 0.3,
    rise: 2.2,
    spread: 0.3,
  })),
  blockers: [
    {
      x: statueAt.x - 1.3,
      z: statueAt.z - 1.3,
      radius: 1.6,
    },
    {
      x: statueAt.x + 1.3,
      z: statueAt.z - 1.3,
      radius: 1.6,
    },
    { x: statueAt.x - 1.4, z: statueAt.z + 1.0, radius: 1.3 },
    { x: statueAt.x + 1.4, z: statueAt.z + 1.0, radius: 1.3 },
    ...columnBlockers,
    { x: thumbAt.x, z: thumbAt.z, radius: 1.0 },
    { x: forgeAt.x, z: forgeAt.z, radius: 0.9 },
    ...brazierSpots.map(({ x, z }) => ({ x, z, radius: 0.45 })),
  ],
  rides: [
    {
      id: "torch-lookout",
      name: "the torch-top lookout",
      start: rideStart,
      reach: 0.6,
      seconds: 20,
      finish: rideFinish,
      follow: climbColossus,
    },
  ],
  tune: [60, 64, 67, 72, 67, 72],
  play: {
    label: "Light the great torch",
    news: "Whoosh! The great bronze torch blazed up, the Sun god's crown spun round, and its light shone out over the sea like a lighthouse.",
  },
};
