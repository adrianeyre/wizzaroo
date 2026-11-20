import { ConeGeometry, DodecahedronGeometry, Shape } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowWhite = "#fbfdff";
const snowShadow = "#d6e2ec";
const iceBlue = "#bfe0f0";
const seaDark = "#1f5a7a";
const rockGrey = "#5d6670";
const penguinBlack = "#23262d";
const penguinBelly = "#f7f5ee";
const penguinGold = "#f2b02e";
const beakOrange = "#e0742a";
const chickGrey = "#a9aeb4";
const signColour = "#2f6f9a";

/* The snow slope the penguins toboggan down on their bellies */
const slope = { x: 2.3, width: 1.2, topZ: -2.5, bottomZ: 1.5, topHeight: 1.35 };
const slopeHeightAt = (z: number): number =>
  Math.max(
    0,
    Math.min(
      slope.topHeight,
      (slope.topHeight * (slope.bottomZ - z)) / (slope.bottomZ - slope.topZ),
    ),
  );
const hole = { x: -2.2, z: 1.05, radius: 0.62 };
const holePivot: Triple = [hole.x, -1.05, hole.z];
const parentAt: Triple = [-0.35, 0, -0.6];
const parentNeck: Triple = [parentAt[0], 0.72, parentAt[2] + 0.02];
const nest = { x: 0.85, z: 1.25 };
const signAt: Triple = [-1.1, 0, 3.95];
const rideStart = { x: 3.25, z: 2.0 };
const rideFinish = { x: 1.55, z: 2.9 };

/* ------------------------------------------------------------------ */
/* Penguins                                                            */
/* ------------------------------------------------------------------ */

/** An emperor penguin's body, standing on y = 0 and facing +z. */
const buildPenguinBody = (builder: AttractionBuilder, size: number) => {
  builder.sphere(
    "paint",
    penguinBlack,
    0.24 * size,
    [0, 0.36 * size, -0.02 * size],
    [1, 1.55, 0.92],
    12,
  );
  builder.sphere(
    "paint",
    penguinBelly,
    0.21 * size,
    [0, 0.34 * size, 0.05 * size],
    [1, 1.5, 0.85],
    12,
  );
  /* The golden wash on the upper chest */
  builder.sphere(
    "paint",
    "#f6dd8e",
    0.13 * size,
    [0, 0.55 * size, 0.1 * size],
    [1.1, 0.8, 0.7],
    8,
  );
  /* Flippers, held a little out */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      penguinBlack,
      0.09 * size,
      [side * 0.22 * size, 0.36 * size, -0.01 * size],
      [0.3, 1.9, 0.8],
      8,
    );
    builder.box(
      "paint",
      beakOrange,
      [0.08 * size, 0.03 * size, 0.12 * size],
      [side * 0.07 * size, 0.015 * size, 0.08 * size],
    );
  });
  builder.sphere(
    "paint",
    penguinBlack,
    0.08 * size,
    [0, 0.1 * size, -0.2 * size],
    [1, 0.5, 1.2],
    8,
  );
};

/** The head, its neck at height `neckY`. */
const buildPenguinHead = (
  builder: AttractionBuilder,
  size: number,
  neckY = 0,
) => {
  builder.sphere(
    "paint",
    penguinBlack,
    0.13 * size,
    [0, neckY + 0.1 * size, 0.02 * size],
    [1, 1.05, 1.1],
    10,
  );
  [-1, 1].forEach((side) => {
    /* The bright yellow ear patches */
    builder.sphere(
      "paint",
      penguinGold,
      0.06 * size,
      [side * 0.1 * size, neckY + 0.06 * size, 0.02 * size],
      [0.45, 1.3, 0.9],
      6,
    );
    builder.sphere(
      "paint",
      palette.white,
      0.022 * size,
      [side * 0.07 * size, neckY + 0.14 * size, 0.1 * size],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.012 * size,
      [side * 0.074 * size, neckY + 0.142 * size, 0.118 * size],
      [1, 1, 1],
      4,
    );
  });
  builder.add(
    "paint",
    penguinBlack,
    new ConeGeometry(0.035 * size, 0.18 * size, 8).rotateX(Math.PI / 2),
    { at: [0, neckY + 0.08 * size, 0.2 * size] },
  );
  builder.box(
    "paint",
    beakOrange,
    [0.03 * size, 0.012 * size, 0.1 * size],
    [0, neckY + 0.06 * size, 0.17 * size],
  );
};

const buildPenguin = (builder: AttractionBuilder) => {
  buildPenguinBody(builder, 1);
  builder.add("paint", penguinBlack, new ConeGeometry(0.1, 0.12, 10), {
    at: [0, 0.68, 0],
  });
  buildPenguinHead(builder, 1, 0.7);
};

/** A fluffy grey chick with its white mask. */
const addChick = (builder: AttractionBuilder, at: Triple, turn: number) => {
  const [x, y, z] = at;
  builder.sphere(
    "matte",
    chickGrey,
    0.13,
    [x, y + 0.14, z],
    [1, 1.15, 0.95],
    8,
  );
  builder.sphere("matte", penguinBlack, 0.085, [x, y + 0.32, z], [1, 1, 1], 8);
  builder.sphere(
    "matte",
    palette.white,
    0.06,
    [x + Math.sin(turn) * 0.04, y + 0.31, z + Math.cos(turn) * 0.04],
    [1, 0.9, 0.7],
    8,
  );
  builder.box(
    "paint",
    penguinBlack,
    [0.02, 0.02, 0.06],
    [x + Math.sin(turn) * 0.1, y + 0.3, z + Math.cos(turn) * 0.1],
    [0, turn, 0],
  );
};

/** The penguin that pops up through the hole in the ice. */
const buildSwimmer = (builder: AttractionBuilder) => {
  buildPenguinBody(builder, 1.05);
  builder.add("paint", penguinBlack, new ConeGeometry(0.1, 0.12, 10), {
    at: [0, 0.71, 0],
  });
  buildPenguinHead(builder, 1.05, 0.74);
  /* Drips running off its feathers */
  [-0.12, 0.05, 0.15].forEach((x, index) => {
    builder.sphere(
      "water",
      "#cfeaf8",
      0.025,
      [x, 0.3 + index * 0.12, 0.22],
      [1, 1.6, 1],
      6,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The ice, rocks and slope                                            */
/* ------------------------------------------------------------------ */

const addRock = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  turn: number,
) => {
  builder.add(
    "matte",
    shade(rockGrey, 0.9 + (turn % 0.3)),
    new DodecahedronGeometry(size, 0),
    { at, rotation: [turn, turn * 1.7, 0], scale: [1.2, 0.8, 1] },
    undefined,
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      snowWhite,
      size * 0.85,
      [at[0], at[1] + size * 0.55, at[2]],
      [1.25, 0.35, 1.05],
      10,
    );
  }
};

const buildRocks = (builder: AttractionBuilder) => {
  /* A rocky ridge behind the colony, holding up the top of the slope */
  addRock(builder, [0.9, 0.5, -2.95], 0.9, 0.4);
  addRock(builder, [-0.6, 0.45, -3.2], 0.8, 1.1);
  addRock(builder, [-2.1, 0.35, -2.6], 0.65, 2.3);
  addRock(builder, [3.3, 0.45, -2.7], 0.7, 0.9);
  if (builder.isFar) {
    return;
  }
  addRock(builder, [-3.4, 0.25, -1.3], 0.45, 1.9);
  addRock(builder, [1.6, 0.18, -1.9], 0.35, 0.2);
  addRock(builder, [-1.5, 0.15, -1.6], 0.28, 2.8);
};

const buildSlope = (builder: AttractionBuilder) => {
  const length = Math.hypot(slope.bottomZ - slope.topZ, slope.topHeight);
  const angle = Math.atan2(slope.topHeight, slope.bottomZ - slope.topZ);
  const middleZ = (slope.topZ + slope.bottomZ) / 2;
  /* A wedge of packed snow, drawn side on and pushed across */
  const wedge = new Shape();
  wedge.moveTo(-slope.bottomZ, 0);
  wedge.lineTo(-slope.topZ, 0);
  wedge.lineTo(-slope.topZ, slope.topHeight);
  wedge.closePath();
  builder.sidePlate("matte", snowWhite, wedge, slope.x, slope.width + 0.3);
  builder.box(
    "matte",
    snowWhite,
    [slope.width + 0.5, slope.topHeight, 1.0],
    [slope.x, slope.topHeight / 2, slope.topZ - 0.45],
  );
  if (builder.isFar) {
    return;
  }
  /* The shiny groove worn by sliding bellies */
  builder.box(
    "glass",
    iceBlue,
    [0.55, 0.02, length - 0.1],
    [slope.x, slope.topHeight / 2 + 0.012, middleZ],
    [-angle, 0, 0],
  );
  /* Snowy banks along both sides */
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      snowShadow,
      [
        slope.x + side * (slope.width / 2 + 0.1),
        slope.topHeight + 0.08,
        slope.topZ,
      ],
      [slope.x + side * (slope.width / 2 + 0.1), 0.08, slope.bottomZ],
      0.22,
      8,
    );
  });
  /* Rough snow steps up the back for climbing */
  for (let step = 0; step < 4; step++) {
    builder.box(
      "matte",
      shade(snowShadow, 1.02),
      [0.5, 0.06, 0.32],
      [
        slope.x + slope.width / 2 + 0.55,
        0.15 + step * 0.3,
        slope.topZ + 0.8 - step * 0.35,
      ],
    );
  }
};

const buildIce = (builder: AttractionBuilder) => {
  /* A breathing hole in the sea ice, the dark ocean below */
  builder.cylinder("matte", iceBlue, {
    radius: hole.radius + 0.25,
    radiusEnd: hole.radius + 0.15,
    length: 0.1,
    at: [hole.x, 0.05, hole.z],
    segments: builder.isFar ? 12 : 28,
  });
  builder.cylinder("water", seaDark, {
    radius: hole.radius,
    length: 0.03,
    at: [hole.x, 0.09, hole.z],
    segments: builder.isFar ? 12 : 28,
  });
  if (builder.isFar) {
    return;
  }
  /* Broken floes round its edge */
  [0.3, 1.5, 2.6, 4.0, 5.1].forEach((angle, index) => {
    builder.box(
      "glass",
      shade(iceBlue, 1.05),
      [0.32, 0.08, 0.22],
      [
        hole.x + Math.sin(angle) * (hole.radius + 0.35),
        0.12,
        hole.z + Math.cos(angle) * (hole.radius + 0.35),
      ],
      [0, angle + index * 0.3, 0.08],
    );
  });
  /* A sheet of sea ice the colony stands on, with cracks */
  builder.cylinder("glass", shade(iceBlue, 1.08), {
    radius: 1.6,
    length: 0.03,
    at: [-0.4, 0.015, 0.3],
    segments: 24,
  });
  [
    [-1.2, 0.8, 0.5],
    [0.2, -0.4, 1.2],
    [-0.8, -0.3, 2.2],
  ].forEach(([x, z, turn]) => {
    builder.box(
      "matte",
      "#9cc3d8",
      [0.7, 0.005, 0.02],
      [x, 0.033, z],
      [0, turn, 0],
    );
  });
};

const buildColony = (builder: AttractionBuilder) => {
  /* A parent standing with an egg tucked on its feet, chicks huddled close */
  buildPenguinBodyAt(builder, parentAt, 1.15);
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "paint",
    "#f3eedc",
    0.07,
    [parentAt[0], 0.07, parentAt[2] + 0.13],
    [1, 1.25, 1],
    10,
  );
  addChick(builder, [parentAt[0] + 0.45, 0, parentAt[2] + 0.2], 0.4);
  addChick(builder, [parentAt[0] - 0.42, 0, parentAt[2] + 0.28], -0.3);
  addChick(builder, [parentAt[0] + 0.12, 0, parentAt[2] + 0.55], 0.1);
  /* A ring of pebbles holding three eggs */
  for (let pebble = 0; pebble < 8; pebble++) {
    const angle = (pebble / 8) * Math.PI * 2;
    builder.sphere(
      "matte",
      shade(rockGrey, pebble % 2 === 0 ? 1.2 : 1.05),
      0.07,
      [nest.x + Math.sin(angle) * 0.32, 0.035, nest.z + Math.cos(angle) * 0.32],
      [1.2, 0.6, 1],
      6,
    );
  }
  [
    [-0.08, -0.06],
    [0.1, 0.02],
    [-0.02, 0.12],
  ].forEach(([dx, dz]) => {
    builder.sphere(
      "paint",
      "#f3eedc",
      0.075,
      [nest.x + dx, 0.08, nest.z + dz],
      [1, 0.8, 1.3],
      8,
    );
  });
  /* Little webbed footprints wandering over the snow */
  for (let step = 0; step < 7; step++) {
    const side = step % 2 === 0 ? -1 : 1;
    const x = 0.6 + step * 0.17;
    const z = 2.4 - step * 0.12 + side * 0.05;
    for (let toe = -1; toe <= 1; toe++) {
      builder.box(
        "matte",
        "#b9cbd9",
        [0.018, 0.006, 0.08],
        [x, 0.006, z],
        [0, 0.9 + toe * 0.45, 0],
      );
    }
  }
  /* Drifts at the edge */
  [
    [-3.6, 2.4, 0.6],
    [3.9, 0.2, 0.55],
    [-3.5, -0.3, 0.5],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowWhite, size, [x, 0, z], [1.5, 0.45, 1], 10);
  });
};

const buildPenguinBodyAt = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
) => {
  if (builder.isFar) {
    builder.sphere(
      "paint",
      penguinBlack,
      0.26 * size,
      [at[0], 0.4 * size, at[2]],
      [1, 1.6, 0.95],
      8,
    );
    builder.sphere(
      "paint",
      penguinBlack,
      0.14 * size,
      [at[0], 0.84 * size, at[2]],
      [1, 1, 1],
      6,
    );
    return;
  }
  builder.sphere(
    "paint",
    penguinBlack,
    0.24 * size,
    [at[0], 0.36 * size, at[2] - 0.02 * size],
    [1, 1.55, 0.92],
    14,
  );
  builder.sphere(
    "paint",
    penguinBelly,
    0.21 * size,
    [at[0], 0.34 * size, at[2] + 0.05 * size],
    [1, 1.5, 0.85],
    14,
  );
  builder.sphere(
    "paint",
    "#f6dd8e",
    0.13 * size,
    [at[0], 0.55 * size, at[2] + 0.1 * size],
    [1.1, 0.8, 0.7],
    10,
  );
  builder.add(
    "paint",
    penguinBlack,
    new ConeGeometry(0.1 * size, 0.12 * size, 12),
    {
      at: [at[0], 0.66 * size, at[2]],
    },
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      penguinBlack,
      0.09 * size,
      [at[0] + side * 0.22 * size, 0.36 * size, at[2] - 0.01 * size],
      [0.3, 1.9, 0.8],
      10,
    );
    builder.box(
      "paint",
      beakOrange,
      [0.08 * size, 0.03 * size, 0.12 * size],
      [at[0] + side * 0.07 * size, 0.015 * size, at[2] + 0.08 * size],
    );
  });
};

const buildParentHead = (builder: AttractionBuilder) => {
  buildPenguinHead(builder, 1.15);
};

const slideRide = (progress: number): LocalSpot => {
  const bottom = { x: slope.x, z: slope.bottomZ + 0.2 };
  if (progress < 0.1) {
    const share = progress / 0.1;
    return {
      x: rideStart.x + (bottom.x - rideStart.x) * share,
      y: 0,
      z: rideStart.z + (bottom.z - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.5) {
    /* Waddling up the slope */
    const share = (progress - 0.1) / 0.4;
    const z = bottom.z + (slope.topZ + 0.3 - bottom.z) * share;
    return { x: slope.x, y: slopeHeightAt(z), z, heading: Math.PI };
  }
  if (progress < 0.6) {
    const share = (progress - 0.5) / 0.1;
    return {
      x: slope.x,
      y: slopeHeightAt(slope.topZ + 0.3),
      z: slope.topZ + 0.3,
      heading: Math.PI + share * Math.PI,
    };
  }
  /* Whoosh, down on your tummy, and gliding out across the snow */
  const share = ((progress - 0.6) / 0.4) ** 1.5;
  const end = { x: rideFinish.x + 0.3, z: rideFinish.z };
  const along = slope.topZ + 0.3 + (end.z - slope.topZ - 0.3) * share;
  const sideways =
    along > slope.bottomZ
      ? (along - slope.bottomZ) / (end.z - slope.bottomZ)
      : 0;
  return {
    x: slope.x + (end.x - slope.x) * sideways,
    y: slopeHeightAt(along),
    z: along,
    heading: 0,
  };
};

const slopeDeck: Deck = ({ x, z }) =>
  Math.abs(x - slope.x) <= slope.width / 2 &&
  z >= slope.topZ &&
  z <= slope.bottomZ
    ? { height: slopeHeightAt(z), kind: "ice" }
    : undefined;

export const penguinColonyModel: CuriosityModel = {
  kind: "penguin-colony",
  islandId: "frost-isle",
  name: "Penguin Colony",
  fact: "Emperor penguins live in Antarctica, the icy continent around the South Pole, and swim in the Southern Ocean to catch fish. They cannot fly, but they are brilliant swimmers, and they often slide over the ice on their tummies. A dad emperor penguin keeps his egg warm on his feet for about two months in the freezing winter.",
  curriculumLink:
    "Geography, Key Stage 1: name and locate the world's seven continents and five oceans, including Antarctica and the Southern Ocean.",
  footprint: 4.6,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildRocks(builder);
    buildSlope(builder);
    buildIce(builder);
    buildColony(builder);
    if (builder.isFar) {
      builder.sphere(
        "paint",
        penguinBlack,
        0.14 * 1.15,
        parentNeck,
        [1, 1, 1],
        6,
      );
    }
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "swimming penguin",
      pivot: holePivot,
      build: buildSwimmer,
      motion: { kind: "rise", reach: 6, height: 1.0, period: 1.8 },
    },
    {
      name: "parent's head",
      pivot: parentNeck,
      build: buildParentHead,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.35,
        period: 1.6,
      },
    },
  ],
  wanderers: [
    {
      name: "penguins",
      build: buildPenguin,
      count: 3,
      centre: { x: -0.4, z: 1.6 },
      radius: 1.3,
      speed: 0.3,
      bob: 0.04,
    },
  ],
  decks: [slopeDeck],
  rides: [
    {
      id: "belly-slide",
      name: "the belly slide",
      start: rideStart,
      reach: 0.6,
      seconds: 8,
      finish: rideFinish,
      follow: slideRide,
    },
  ],
  blockers: [
    { x: 0.9, z: -2.95, radius: 0.95 },
    { x: -0.6, z: -3.2, radius: 0.85 },
    { x: -2.1, z: -2.6, radius: 0.7 },
    { x: 3.3, z: -2.7, radius: 0.75 },
    { x: -3.4, z: -1.3, radius: 0.45 },
    { x: hole.x, z: hole.z, radius: hole.radius },
    { x: parentAt[0], z: parentAt[2], radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Waddle like a penguin",
    news: "Waddle, waddle, whoosh! You tucked in your flippers and tobogganed across the ice like an emperor penguin.",
  },
};
