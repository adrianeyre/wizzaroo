import { SphereGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowShadow = "#d6e1ea";
const denDark = "#1e2a36";
const foxWhite = "#fbfaf4";
const foxShade = "#e6e3d8";
const foxBrown = "#7a5a3c";
const hareWhite = "#f8f8f4";
const rockGrey = "#7d8691";
const rockDark = "#5c646e";
const twigBrown = "#6b4a32";
const tundraGreen = "#6f8a4a";
const summerGround = "#8aa860";
const winterSky = "#cfe6f2";
const signColour = "#3f6b4a";

const bankScale: Triple = [2.4, 1.15, 1.4];
const bank = { x: 0, z: -1.8, radius: 1 };
const den = { x: 0.3, z: -0.22, radius: 0.33 };
const foxAt: Triple = [den.x, -0.92, den.z];
const lemmingHole = { x: -1.35, z: 0.15 };
const lemmingAt: Triple = [lemmingHole.x, -0.26, lemmingHole.z];
const board = { x: -2.45, z: 1.35, turn: 0.35 };
const signAt: Triple = [1.2, 0, 3.8];

/** A stretched sphere, turned about y, for snow banks, rocks and furry bodies. */
const addBlob = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  radius: number,
  scale: Triple,
  at: Triple,
  turn: number,
  segments: number,
) => {
  const around = builder.segments(segments);
  builder.add(
    finish,
    colour,
    new SphereGeometry(radius, around, Math.max(3, Math.round(around * 0.66)))
      .scale(scale[0], scale[1], scale[2])
      .rotateY(turn),
    { at },
  );
};

const buildBank = (builder: AttractionBuilder) => {
  /* The big snowdrift the den is dug into, with smaller drifts heaped on it */
  addBlob(
    builder,
    "matte",
    snow,
    bank.radius,
    bankScale,
    [bank.x, 0, bank.z],
    0,
    builder.isFar ? 12 : 22,
  );
  addBlob(
    builder,
    "matte",
    shade(snow, 0.97),
    0.8,
    [1.3, 0.9, 1],
    [-1.6, 0, -2.4],
    0.4,
    builder.isFar ? 8 : 14,
  );
  addBlob(
    builder,
    "matte",
    shade(snow, 0.98),
    0.7,
    [1.4, 0.85, 1],
    [1.9, 0, -2.2],
    -0.3,
    builder.isFar ? 8 : 14,
  );
  /* The den's dark mouth at the foot of the bank */
  builder.cylinder("matte", denDark, {
    radius: den.radius,
    length: 0.02,
    at: [den.x, 0.01, den.z],
    segments: builder.isFar ? 8 : 20,
  });
  if (builder.isFar) {
    return;
  }
  addBlob(
    builder,
    "matte",
    denDark,
    0.34,
    [1, 0.9, 0.5],
    [den.x, 0.12, den.z - 0.32],
    0,
    16,
  );
  builder.torus(
    "matte",
    snowShadow,
    den.radius + 0.03,
    0.06,
    [den.x, 0.02, den.z],
    "y",
    22,
  );
  /* A bolt hole on top, for escaping */
  builder.cylinder("matte", denDark, {
    radius: 0.16,
    length: 0.02,
    at: [-0.6, 1.07, bank.z - 0.2],
    segments: 12,
  });
  builder.torus(
    "matte",
    snowShadow,
    0.17,
    0.04,
    [-0.6, 1.08, bank.z - 0.2],
    "y",
    14,
  );
  /* Rocks poking out of the snow, and tufts of tundra plants */
  const stones: { at: Triple; size: number }[] = [
    { at: [1.4, 0.55, -1.2], size: 0.28 },
    { at: [-1.1, 0.75, -1.3], size: 0.22 },
    { at: [0.6, 0.95, -2.0], size: 0.2 },
  ];
  stones.forEach(({ at, size }, index) => {
    addBlob(
      builder,
      "matte",
      index % 2 === 0 ? rockGrey : rockDark,
      size,
      [1.3, 0.7, 1],
      at,
      index,
      8,
    );
    addBlob(
      builder,
      "matte",
      snow,
      size * 0.8,
      [1.2, 0.35, 1],
      [at[0], at[1] + size * 0.5, at[2]],
      index,
      8,
    );
  });
  [
    [-2.0, -0.7],
    [2.3, -0.9],
    [-0.4, -1.1],
    [1.0, -0.6],
  ].forEach(([x, z]) => {
    for (let blade = 0; blade < 5; blade++) {
      const angle = (blade / 5) * Math.PI * 2;
      builder.bar(
        "matte",
        blade % 2 === 0 ? tundraGreen : "#a8a060",
        [x, 0, z],
        [
          x + Math.sin(angle) * 0.12,
          0.28 + (blade % 2) * 0.08,
          z + Math.cos(angle) * 0.12,
        ],
        0.025,
        4,
      );
    }
  });
};

/** A snowy dwarf willow: a few bare twigs, the tundra's only trees. */
const addWillow = (builder: AttractionBuilder, at: Triple, size: number) => {
  const [x, , z] = at;
  for (let twig = 0; twig < 6; twig++) {
    const angle = (twig / 6) * Math.PI * 2 + size;
    const tip: Triple = [
      x + Math.sin(angle) * 0.35 * size,
      (0.55 + (twig % 3) * 0.12) * size,
      z + Math.cos(angle) * 0.35 * size,
    ];
    builder.bar("matte", twigBrown, [x, 0, z], tip, 0.035, 4);
    builder.bar(
      "matte",
      twigBrown,
      [(x + tip[0]) / 2, tip[1] * 0.5, (z + tip[2]) / 2],
      [
        tip[0] + Math.cos(angle) * 0.12,
        tip[1] * 0.85,
        tip[2] - Math.sin(angle) * 0.12,
      ],
      0.02,
      4,
    );
    builder.sphere("matte", snow, 0.05, tip, [1.4, 0.6, 1.4], 6);
  }
  builder.sphere("matte", snow, 0.3 * size, [x, 0, z], [1.4, 0.5, 1.4], 8);
};

/** A fox drawn flat on the board, in a summer or winter coat. */
const addBoardFox = (
  builder: AttractionBuilder,
  place: (x: number, y: number) => Triple,
  colour: string,
  rotation: Triple,
) => {
  builder.sphere("paint", colour, 0.11, place(0, 0), [1.4, 0.7, 0.15], 8);
  builder.sphere("paint", colour, 0.06, place(0.15, 0.06), [1, 1, 0.3], 8);
  builder.box("paint", colour, [0.03, 0.06, 0.02], place(0.13, 0.12), rotation);
  builder.box("paint", colour, [0.03, 0.06, 0.02], place(0.17, 0.12), rotation);
  builder.sphere("paint", colour, 0.07, place(-0.2, 0.02), [1.5, 0.6, 0.15], 8);
  [-0.07, 0.07].forEach((leg) => {
    builder.box(
      "paint",
      colour,
      [0.025, 0.08, 0.02],
      place(leg, -0.08),
      rotation,
    );
  });
};

const buildCoatBoard = (builder: AttractionBuilder) => {
  const { x, z, turn } = board;
  const rotation: Triple = [0, turn, 0];
  const place = (across: number, up: number, out = 0): Triple => [
    x + across * Math.cos(turn) + out * Math.sin(turn),
    up,
    z - across * Math.sin(turn) + out * Math.cos(turn),
  ];
  [-0.55, 0.55].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 1.25, 0.07],
      place(side, 0.62),
      rotation,
    );
  });
  builder.box(
    "paint",
    palette.darkTimber,
    [1.2, 0.62, 0.05],
    place(0, 0.95),
    rotation,
  );
  if (builder.isFar) {
    return;
  }
  /* Summer on the left, winter on the right */
  builder.box(
    "paint",
    summerGround,
    [0.54, 0.54, 0.02],
    place(-0.28, 0.95, 0.03),
    rotation,
  );
  builder.box(
    "paint",
    winterSky,
    [0.54, 0.54, 0.02],
    place(0.28, 0.95, 0.03),
    rotation,
  );
  builder.box(
    "paint",
    palette.white,
    [0.54, 0.16, 0.022],
    place(0.28, 0.76, 0.035),
    rotation,
  );
  builder.sphere(
    "glow",
    "#ffd23a",
    0.06,
    place(-0.4, 1.12, 0.04),
    [1, 1, 0.3],
    10,
  );
  for (let arm = 0; arm < 3; arm++) {
    builder.box(
      "paint",
      palette.white,
      [0.015, 0.14, 0.01],
      place(0.4, 1.12, 0.045),
      [0, turn, (arm / 3) * Math.PI],
    );
  }
  addBoardFox(
    builder,
    (across, up) => place(-0.28 + across, 0.92 + up, 0.05),
    foxBrown,
    rotation,
  );
  addBoardFox(
    builder,
    (across, up) => place(0.28 + across, 0.92 + up, 0.05),
    foxWhite,
    rotation,
  );
  builder.box(
    "paint",
    palette.cream,
    [1.1, 0.06, 0.03],
    place(0, 1.3, 0.02),
    rotation,
  );
  addBlob(
    builder,
    "matte",
    snow,
    0.1,
    [6.2, 0.4, 0.8],
    place(0, 1.3, 0),
    turn,
    8,
  );
};

const buildTracks = (builder: AttractionBuilder) => {
  builder.box("matte", snowShadow, [1.2, 0.02, 2.4], [0.9, 0.01, 2.6]);
  if (builder.isFar) {
    return;
  }
  /* The fox's neat line of prints, wandering from the den */
  for (let step = 0; step < 9; step++) {
    const along = step * 0.32;
    const x = den.x + 0.25 + Math.sin(step * 0.6) * 0.35 + along * 0.25;
    const z = den.z + 0.55 + along;
    builder.cylinder("matte", snowShadow, {
      radius: 0.045,
      length: 0.012,
      at: [x + (step % 2 === 0 ? 0.05 : -0.05), 0.006, z],
      segments: 7,
    });
  }
  /* The hares' prints: two long hind feet ahead of two small front feet */
  for (let hop = 0; hop < 4; hop++) {
    const x = 2.0 + hop * 0.15;
    const z = -0.2 + hop * 0.55;
    [-0.07, 0.07].forEach((side) => {
      builder.box(
        "matte",
        snowShadow,
        [0.06, 0.012, 0.16],
        [x + side, 0.006, z + 0.15],
        [0, 0.25, 0],
      );
    });
    builder.box(
      "matte",
      snowShadow,
      [0.05, 0.012, 0.06],
      [x - 0.02, 0.006, z - 0.05],
    );
    builder.box(
      "matte",
      snowShadow,
      [0.05, 0.012, 0.06],
      [x + 0.01, 0.006, z - 0.15],
    );
  }
  addWillow(builder, [-1.9, 0, 2.5], 1);
  addWillow(builder, [3.3, 0, 0.2], 0.85);
  addWillow(builder, [-3.3, 0, -0.8], 0.9);
  [
    [2.9, -1.3, 0.3],
    [-2.7, 0.2, 0.25],
  ].forEach(([x, z, size], index) => {
    addBlob(
      builder,
      "matte",
      index === 0 ? rockGrey : rockDark,
      size,
      [1.3, 0.75, 1],
      [x, size * 0.3, z],
      index,
      10,
    );
    addBlob(
      builder,
      "matte",
      snow,
      size * 0.8,
      [1.2, 0.35, 1],
      [x, size * 0.75, z],
      index,
      8,
    );
  });
};

/** The arctic fox, sitting up in its white winter coat, facing +z. */
const buildFox = (builder: AttractionBuilder) => {
  addBlob(
    builder,
    "matte",
    foxWhite,
    0.22,
    [1, 0.9, 1.15],
    [0, 0.2, -0.05],
    0,
    12,
  );
  addBlob(
    builder,
    "matte",
    foxWhite,
    0.17,
    [0.9, 1.2, 0.9],
    [0, 0.44, 0.07],
    0,
    12,
  );
  addBlob(
    builder,
    "matte",
    foxShade,
    0.12,
    [1, 1.2, 0.6],
    [0, 0.42, 0.17],
    0,
    8,
  );
  builder.sphere("matte", foxWhite, 0.14, [0, 0.7, 0.12], [1.05, 0.95, 1], 12);
  builder.sphere("matte", foxWhite, 0.07, [0, 0.66, 0.25], [0.85, 0.7, 1.3], 8);
  builder.sphere(
    "paint",
    palette.black,
    0.026,
    [0, 0.67, 0.34],
    [1.2, 1, 1],
    6,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.022,
      [side * 0.055, 0.73, 0.235],
      [1, 1.1, 0.7],
      6,
    );
    /* Small round ears, to lose less heat */
    builder.cylinder("matte", foxWhite, {
      radius: 0.055,
      radiusEnd: 0.012,
      length: 0.1,
      at: [side * 0.08, 0.83, 0.1],
      segments: 7,
    });
    builder.sphere(
      "matte",
      foxShade,
      0.03,
      [side * 0.08, 0.82, 0.13],
      [1, 1.3, 0.4],
      6,
    );
    builder.sphere(
      "matte",
      foxWhite,
      0.06,
      [side * 0.11, 0.64, 0.14],
      [1, 0.8, 1],
      6,
    );
    builder.bar(
      "matte",
      foxWhite,
      [side * 0.07, 0.36, 0.13],
      [side * 0.07, 0.04, 0.16],
      0.07,
      6,
    );
    builder.sphere(
      "matte",
      foxShade,
      0.045,
      [side * 0.07, 0.03, 0.2],
      [1, 0.6, 1.3],
      6,
    );
  });
  /* The big bushy tail, curled round the paws like a scarf */
  [
    [0.2, 0.1, -0.2, 0.1],
    [0.27, 0.08, 0.0, 0.11],
    [0.22, 0.07, 0.18, 0.1],
    [0.1, 0.06, 0.3, 0.08],
  ].forEach(([x, y, z, radius]) => {
    builder.sphere("matte", foxWhite, radius, [x, y, z], [1, 0.85, 1.25], 10);
  });
};

/** A tiny lemming that peeps from its hole. */
const buildLemming = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#d9c7a8", 0.08, [0, 0.1, 0], [1, 1.15, 1], 10);
  builder.sphere("matte", "#d9c7a8", 0.06, [0, 0.21, 0.02], [1, 1, 1], 8);
  builder.sphere("paint", palette.black, 0.012, [0, 0.21, 0.08], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.012,
      [side * 0.03, 0.24, 0.06],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "matte",
      "#c4a888",
      0.02,
      [side * 0.04, 0.27, 0],
      [1, 1, 0.5],
      6,
    );
  });
};

/** An arctic hare, white too, sitting on its long hind feet. */
const buildHare = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    hareWhite,
    0.17,
    [0, 0.18, -0.02],
    [0.9, 1, 1.25],
    10,
  );
  builder.sphere("matte", hareWhite, 0.1, [0, 0.36, 0.15], [0.9, 1, 1.1], 10);
  builder.sphere("matte", palette.white, 0.05, [0, 0.2, -0.24], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      hareWhite,
      [0.05, 0.24, 0.025],
      [side * 0.04, 0.53, 0.1],
      [-0.25, 0, side * 0.15],
    );
    builder.box(
      "paint",
      palette.black,
      [0.05, 0.05, 0.027],
      [side * 0.058, 0.64, 0.07],
      [-0.25, 0, side * 0.15],
    );
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [side * 0.06, 0.39, 0.21],
      [1, 1, 1],
      6,
    );
    builder.box(
      "matte",
      foxShade,
      [0.06, 0.04, 0.24],
      [side * 0.09, 0.02, 0.04],
    );
  });
  builder.sphere("paint", "#d88a9a", 0.012, [0, 0.35, 0.25], [1, 1, 1], 6);
};

export const arcticFoxDenModel: CuriosityModel = {
  kind: "arctic-fox-den",
  islandId: "frost-isle",
  name: "Arctic Fox Den",
  fact: "The arctic fox changes its coat with the seasons. In winter its thick fur is snowy white, so it can hide on the snow, and in summer it turns brown to match the rocks and earth. It digs its den into a snowy bank to keep warm, has small ears to lose less heat, and curls its bushy tail round itself like a blanket.",
  curriculumLink:
    "Science, Year 2: living things and their habitats. Identify that most living things live in habitats to which they are suited, and describe how different habitats provide for the basic needs of different kinds of animals.",
  footprint: 4.6,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildBank(builder);
    buildCoatBoard(builder);
    buildTracks(builder);
    builder.cylinder("matte", denDark, {
      radius: 0.07,
      length: 0.02,
      at: [lemmingHole.x, 0.01, lemmingHole.z],
      segments: 8,
    });
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "arctic fox",
      pivot: foxAt,
      build: buildFox,
      motion: { kind: "rise", reach: 6, height: 0.94, period: 2.6 },
    },
    {
      name: "lemming",
      pivot: lemmingAt,
      build: buildLemming,
      motion: { kind: "rise", reach: 4, height: 0.27, period: 1.3, phase: 1 },
    },
  ],
  wanderers: [
    {
      name: "arctic hares",
      build: buildHare,
      count: 2,
      centre: { x: 2.1, z: 1.1 },
      radius: 1.0,
      speed: 0.6,
      bob: 0.14,
    },
  ],
  blockers: [
    { x: bank.x, z: bank.z, radius: 1.3 },
    { x: bank.x - 1.2, z: bank.z - 0.2, radius: 1.1 },
    { x: bank.x + 1.3, z: bank.z - 0.2, radius: 1.0 },
    { x: den.x, z: den.z, radius: den.radius },
    { x: board.x, z: board.z, radius: 0.45 },
    { x: 2.9, z: -1.3, radius: 0.4 },
    { x: -2.7, z: 0.2, radius: 0.35 },
    { x: -1.9, z: 2.5, radius: 0.35 },
    { x: 3.3, z: 0.2, radius: 0.3 },
    { x: -3.3, z: -0.8, radius: 0.3 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Spot the fox",
    news: "There it is! A fluffy white fox popped out of its den, twitched its black nose and curled its tail round its paws.",
  },
};
