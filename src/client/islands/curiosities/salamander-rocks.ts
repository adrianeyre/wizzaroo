import { CylinderGeometry, TorusGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const rockDark = "#3d3432";
const rockWarm = "#5c4740";
const emberGlow = "#ff7a2a";
const warmGlow = "#ffb04d";
const salamanderBlack = "#1d1b1e";
const salamanderYellow = "#f2c218";
const logBark = "#5a3d28";
const logInside = "#b48a5a";
const moss = "#5d7d34";
const mossLight = "#7d9a42";
const fern = "#4f7a35";
const pondWater = "#3b7f86";
const eggJelly = "#d8e6d2";
const boardPaint = "#f0e6cc";
const signColour = "#3f5a2a";
const ashPad = "#5b4a42";

const perch: Triple = [-0.55, 1.05, -0.95];
const pond = { x: 1.35, z: 1.05, radius: 0.85 };
const board: Triple = [-2.0, 0, 1.2];

/**
 * One salamander, black with yellow spots, facing +z. Its body is
 * stretched along z, so `turn` should be 0 or a half turn.
 */
const addSalamander = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  turn: number,
) => {
  const spot = (x: number, y: number, z: number): Triple => [
    at[0] + (x * Math.cos(turn) + z * Math.sin(turn)) * size,
    at[1] + y * size,
    at[2] + (-x * Math.sin(turn) + z * Math.cos(turn)) * size,
  ];
  builder.sphere(
    "paint",
    salamanderBlack,
    0.1 * size,
    spot(0, 0.06, 0),
    [0.75, 0.55, 1.9],
    8,
  );
  builder.sphere(
    "paint",
    salamanderBlack,
    0.065 * size,
    spot(0, 0.07, 0.2),
    [1.05, 0.75, 1.2],
    8,
  );
  /* A tail tapering in two steps */
  builder.bar(
    "paint",
    salamanderBlack,
    spot(0, 0.06, -0.15),
    spot(0.02, 0.04, -0.32),
    0.07 * size,
    6,
  );
  builder.bar(
    "paint",
    salamanderBlack,
    spot(0.02, 0.04, -0.3),
    spot(0.06, 0.02, -0.46),
    0.035 * size,
    5,
  );
  /* Bright yellow spots and stripes warn birds: "I taste horrible!" */
  [
    [0.04, 0.1, 0.06],
    [-0.04, 0.1, -0.03],
    [0.03, 0.1, -0.12],
    [-0.03, 0.1, 0.13],
    [0.035, 0.11, 0.21],
    [-0.035, 0.11, 0.21],
    [0.02, 0.08, -0.26],
  ].forEach(([x, y, z]) => {
    builder.sphere(
      "paint",
      salamanderYellow,
      0.025 * size,
      spot(x, y, z),
      [1, 0.6, 1.4],
      5,
    );
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.014 * size,
      spot(side * 0.04, 0.1, 0.25),
      [1, 1, 1],
      4,
    );
    [0.1, -0.1].forEach((along) => {
      builder.bar(
        "paint",
        salamanderBlack,
        spot(side * 0.05, 0.05, along),
        spot(side * 0.12, 0.0, along + 0.03),
        0.03 * size,
        4,
      );
    });
  });
};

const buildWanderingSalamander = (builder: AttractionBuilder) => {
  addSalamander(builder, [0, 0, 0], 1, 0);
};

/** The salamander that climbs out of its crevice onto the warm rock. */
const buildClimber = (builder: AttractionBuilder) => {
  addSalamander(builder, [0, 0, 0], 1.25, 0);
};

/** Warm rocks round a sunny hollow, with cracks that glow. */
const buildRocks = (builder: AttractionBuilder) => {
  [
    {
      at: [-0.55, 0.45, -0.95] satisfies Triple,
      size: [0.95, 0.65, 0.8] satisfies Triple,
      colour: rockWarm,
    },
    {
      at: [-1.6, 0.3, -0.5] satisfies Triple,
      size: [0.6, 0.45, 0.55] satisfies Triple,
      colour: rockDark,
    },
    {
      at: [0.45, 0.28, -1.6] satisfies Triple,
      size: [0.55, 0.42, 0.5] satisfies Triple,
      colour: rockDark,
    },
    {
      at: [-1.3, 0.22, -1.7] satisfies Triple,
      size: [0.45, 0.3, 0.4] satisfies Triple,
      colour: rockWarm,
    },
  ].forEach(({ at, size, colour }) => {
    builder.sphere("matte", colour, 1, at, size, builder.isFar ? 8 : 12);
  });
  if (builder.isFar) {
    return;
  }
  /* A flat basking slab and the crevice the shy one hides in */
  builder.sphere(
    "matte",
    shade(rockWarm, 1.15),
    0.5,
    [perch[0], perch[1] - 0.08, perch[2]],
    [1, 0.16, 0.8],
    12,
  );
  builder.box(
    "paint",
    salamanderBlack,
    [0.08, 0.04, 0.4],
    [perch[0] + 0.25, perch[1] - 0.04, perch[2] + 0.05],
    [0, 0.4, 0],
  );
  /* Glowing cracks, warm as a hearth */
  [
    { at: [-0.95, 0.5, -0.45] satisfies Triple, turn: 0.4, tilt: 0.6 },
    { at: [-0.1, 0.55, -0.55] satisfies Triple, turn: -0.5, tilt: -0.5 },
    { at: [-1.45, 0.35, -0.08] satisfies Triple, turn: 0.2, tilt: 0.3 },
    { at: [0.55, 0.3, -1.2] satisfies Triple, turn: -0.3, tilt: 0.8 },
  ].forEach(({ at, turn, tilt }) => {
    builder.box("glow", emberGlow, [0.05, 0.4, 0.05], at, [
      tilt * 0.3,
      turn,
      tilt,
    ]);
  });
  /* Pebbles and a few ferns in the shade */
  [
    [0.9, -0.5, 0.09],
    [-0.2, 0.2, 0.07],
    [-2.4, -0.2, 0.1],
    [1.9, -1.1, 0.08],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? rockWarm : rockDark,
      size,
      [x, size * 0.5, z],
      [1.3, 0.7, 1],
      6,
    );
  });
  [
    { x: -2.2, z: -1.2 },
    { x: 1.0, z: -2.2 },
    { x: 2.3, z: 0.1 },
  ].forEach(({ x, z }) => {
    for (let frond = 0; frond < 5; frond++) {
      const angle = (frond / 5) * Math.PI * 2;
      builder.sphere(
        "matte",
        frond % 2 === 0 ? fern : shade(fern, 1.15),
        0.3,
        [x + Math.sin(angle) * 0.2, 0.22, z + Math.cos(angle) * 0.2],
        [0.25, 0.08, 1],
        8,
      );
    }
  });
};

/** A fallen, mossy log, hollow at one end, where salamanders hide by day. */
const buildLog = (builder: AttractionBuilder) => {
  const at: Triple = [1.45, 0.28, -0.55];
  builder.cylinder("matte", logBark, {
    radius: 0.28,
    radiusEnd: 0.25,
    length: 2.0,
    at,
    axis: "x",
    segments: builder.isFar ? 8 : 16,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", logInside, {
    radius: 0.24,
    length: 0.02,
    at: [at[0] + 1.0, at[1], at[2]],
    axis: "x",
    segments: 16,
  });
  builder.cylinder("matte", salamanderBlack, {
    radius: 0.15,
    length: 0.03,
    at: [at[0] - 1.0, at[1], at[2]],
    axis: "x",
    segments: 12,
  });
  builder.add(
    "matte",
    shade(logInside, 0.85),
    new TorusGeometry(0.16, 0.02, 3, 14),
    {
      at: [at[0] + 1.01, at[1], at[2]],
      rotation: [0, Math.PI / 2, 0],
    },
  );
  /* Moss along the top, and a toadstool */
  [-0.7, -0.2, 0.3, 0.7].forEach((dx, index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? moss : mossLight,
      0.22,
      [at[0] + dx, at[1] + 0.22, at[2]],
      [1.4, 0.35, 0.9],
      10,
    );
  });
  builder.cylinder("matte", palette.cream, {
    radius: 0.03,
    length: 0.16,
    at: [at[0] + 0.5, 0.08, at[2] + 0.35],
    segments: 6,
  });
  builder.sphere(
    "paint",
    "#c8323a",
    0.09,
    [at[0] + 0.5, 0.17, at[2] + 0.35],
    [1, 0.55, 1],
    10,
  );
  builder.add("matte", logBark, new CylinderGeometry(0.06, 0.08, 0.4, 8), {
    at: [at[0] - 0.3, at[1] + 0.3, at[2] - 0.1],
    rotation: [0.3, 0, -0.5],
  });
};

/** The pond where salamanders are born: eggs, larvae with gills, a lily pad. */
const buildPond = (builder: AttractionBuilder) => {
  builder.cylinder("matte", rockDark, {
    radius: pond.radius + 0.18,
    length: 0.06,
    at: [pond.x, 0.03, pond.z],
    segments: builder.isFar ? 10 : 22,
  });
  builder.cylinder("water", pondWater, {
    radius: pond.radius,
    length: 0.03,
    at: [pond.x, 0.075, pond.z],
    segments: builder.isFar ? 10 : 22,
  });
  if (builder.isFar) {
    return;
  }
  /* Stones round the edge */
  for (let stone = 0; stone < 10; stone++) {
    const angle = (stone / 10) * Math.PI * 2;
    builder.sphere(
      "matte",
      stone % 2 === 0 ? rockWarm : rockDark,
      0.12 + (stone % 3) * 0.03,
      [
        pond.x + Math.sin(angle) * (pond.radius + 0.12),
        0.08,
        pond.z + Math.cos(angle) * (pond.radius + 0.12),
      ],
      [1.2, 0.6, 1],
      6,
    );
  }
  /* A clump of jelly-coated eggs, each with a dark dot */
  [
    [-0.25, 0.1],
    [-0.15, 0.16],
    [-0.3, 0.22],
    [-0.2, 0.02],
    [-0.08, 0.08],
  ].forEach(([dx, dz]) => {
    builder.sphere(
      "glass",
      eggJelly,
      0.05,
      [pond.x + dx, 0.1, pond.z + dz],
      [1, 0.8, 1],
      6,
    );
    builder.sphere(
      "paint",
      salamanderBlack,
      0.015,
      [pond.x + dx, 0.11, pond.z + dz],
      [1, 1, 1],
      4,
    );
  });
  /* Two larvae with feathery gills */
  [
    { x: 0.3, z: -0.25, turn: 0 },
    { x: 0.1, z: 0.35, turn: Math.PI },
  ].forEach(({ x, z, turn }) => {
    addSalamander(builder, [pond.x + x, 0.06, pond.z + z], 0.55, turn);
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        "#d97a6a",
        [0.06, 0.012, 0.012],
        [
          pond.x + x + Math.cos(turn) * side * 0.05 + Math.sin(turn) * 0.1,
          0.1,
          pond.z + z - Math.sin(turn) * side * 0.05 + Math.cos(turn) * 0.1,
        ],
        [0, turn + side * 0.6, 0],
      );
    });
  });
  /* A lily pad */
  builder.cylinder("paint", moss, {
    radius: 0.2,
    length: 0.015,
    at: [pond.x + 0.35, 0.1, pond.z + 0.3],
    segments: 14,
  });
};

/** A round painted board: egg, larva, young salamander, adult, and round again. */
const buildLifeCycleBoard = (builder: AttractionBuilder) => {
  const [x, , z] = board;
  [-0.4, 0.4].forEach((dx) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 1.1, 0.07],
      [x + dx, 0.55, z],
    );
  });
  builder.cylinder("paint", boardPaint, {
    radius: 0.5,
    length: 0.05,
    at: [x, 1.25, z + 0.04],
    axis: "z",
    segments: builder.isFar ? 10 : 24,
  });
  if (builder.isFar) {
    return;
  }
  builder.add("paint", signColour, new TorusGeometry(0.5, 0.03, 4, 28), {
    at: [x, 1.25, z + 0.06],
  });
  /* The ring of arrows round the cycle */
  builder.add(
    "paint",
    logBark,
    new TorusGeometry(0.3, 0.012, 3, 24, Math.PI * 1.8),
    {
      at: [x, 1.25, z + 0.075],
    },
  );
  for (let arrow = 0; arrow < 4; arrow++) {
    const angle = (arrow / 4) * Math.PI * 2 + Math.PI / 4;
    builder.box(
      "paint",
      logBark,
      [0.06, 0.02, 0.01],
      [x + Math.cos(angle) * 0.3, 1.25 + Math.sin(angle) * 0.3, z + 0.08],
      [0, 0, angle + 0.6],
    );
  }
  /* The four stages, round the clock */
  const stage = (angle: number): Triple => [
    x + Math.cos(angle) * 0.3,
    1.25 + Math.sin(angle) * 0.3,
    z + 0.09,
  ];
  const [eggX, eggY, eggZ] = stage(Math.PI / 2);
  [-0.03, 0.03].forEach((dx) => {
    builder.sphere(
      "paint",
      eggJelly,
      0.035,
      [eggX + dx, eggY, eggZ],
      [1, 1, 0.4],
      8,
    );
    builder.sphere(
      "paint",
      salamanderBlack,
      0.012,
      [eggX + dx, eggY, eggZ + 0.012],
      [1, 1, 0.4],
      4,
    );
  });
  const [larvaX, larvaY, larvaZ] = stage(0);
  builder.sphere(
    "paint",
    "#6d6a58",
    0.06,
    [larvaX, larvaY, larvaZ],
    [1.6, 0.6, 0.3],
    8,
  );
  builder.box(
    "paint",
    "#d97a6a",
    [0.012, 0.06, 0.01],
    [larvaX + 0.06, larvaY + 0.02, larvaZ + 0.01],
    [0, 0, 0.5],
  );
  const [youngX, youngY, youngZ] = stage(-Math.PI / 2);
  builder.sphere(
    "paint",
    salamanderBlack,
    0.06,
    [youngX, youngY, youngZ],
    [1.7, 0.6, 0.3],
    8,
  );
  builder.sphere(
    "paint",
    salamanderYellow,
    0.015,
    [youngX, youngY + 0.01, youngZ + 0.02],
    [1, 1, 0.4],
    4,
  );
  const [adultX, adultY, adultZ] = stage(Math.PI);
  builder.sphere(
    "paint",
    salamanderBlack,
    0.08,
    [adultX, adultY, adultZ],
    [1.8, 0.6, 0.3],
    8,
  );
  [-0.04, 0.04].forEach((dx) => {
    builder.sphere(
      "paint",
      salamanderYellow,
      0.018,
      [adultX + dx, adultY + 0.01, adultZ + 0.025],
      [1, 1, 0.4],
      4,
    );
  });
  builder.box("paint", signColour, [0.6, 0.08, 0.02], [x, 1.85, z + 0.05]);
};

/** The rocks glow warmer as someone comes near. */
const buildWarmth = (builder: AttractionBuilder) => {
  builder.sphere("glow", warmGlow, 0.35, [0, 0, 0], [1.3, 0.25, 1.1], 12);
  [
    [0.35, 0.05, 0.2],
    [-0.3, 0.02, -0.25],
  ].forEach(([x, y, z]) => {
    builder.sphere("glow", emberGlow, 0.1, [x, y, z], [1, 0.4, 1], 8);
  });
};

export const salamanderRocksModel: CuriosityModel = {
  kind: "salamander-rocks",
  islandId: "ember-isle",
  name: "Salamander Rocks",
  fact: "A fire salamander is an amphibian, like a frog. It starts life in water as a larva with feathery gills, then grows legs and lungs and climbs out onto land. Mammals are born and fed on milk, birds hatch from eggs with hard shells, and insects like butterflies change completely inside a chrysalis.",
  curriculumLink:
    "Science, Year 5: living things and their habitats. Describe the differences in the life cycles of a mammal, an amphibian, an insect and a bird.",
  footprint: 4,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: 0.1, z: 3.1 },
  build: (builder) => {
    buildRocks(builder);
    buildLog(builder);
    buildPond(builder);
    buildLifeCycleBoard(builder);
    addSignBoard(builder, [0.1, 0, 3.1], signColour);
  },
  moving: [
    {
      name: "basking salamander",
      pivot: [perch[0], perch[1] - 0.3, perch[2]],
      build: buildClimber,
      motion: { kind: "rise", reach: 6, height: 0.3, period: 2.4 },
    },
    {
      name: "warm rock",
      pivot: [perch[0], perch[1] - 0.06, perch[2]],
      build: buildWarmth,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "fire salamanders",
      build: buildWanderingSalamander,
      count: 3,
      centre: { x: -0.1, z: 0.6 },
      radius: 1.0,
      speed: 0.25,
    },
  ],
  blockers: [
    { x: -0.55, z: -0.95, radius: 0.9 },
    { x: -1.6, z: -0.5, radius: 0.6 },
    { x: 0.45, z: -1.6, radius: 0.55 },
    { x: -1.3, z: -1.7, radius: 0.45 },
    { x: 1.45, z: -0.55, radius: 0.35 },
    { x: 0.6, z: -0.55, radius: 0.3 },
    { x: 2.3, z: -0.55, radius: 0.3 },
    { x: pond.x, z: pond.z, radius: pond.radius },
    { x: board[0], z: board[2], radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Spot a salamander",
    news: "There! A shiny black salamander with bright yellow spots crept out of its crack to bask on the warm rock.",
    tune: [72, 74, 79],
  },
};
