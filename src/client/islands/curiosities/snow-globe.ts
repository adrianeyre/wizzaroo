import { ConeGeometry, OctahedronGeometry } from "three";
import {
  addGableRoof,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowWhite = "#fbfdff";
const snowShadow = "#d5e1ea";
const baseRed = "#8e2430";
const gold = "#d4a94a";
const globeGlass = "#e4f5ff";
const flakeWhite = "#ffffff";
const firGreen = "#2f5e45";
const windowGlow = "#ffcf73";
const signColour = "#8e2430";

const globe = { x: 0, z: -0.35, radius: 1.5 };
const baseHeight = 0.95;
const globeCentre: Triple = [globe.x, baseHeight + globe.radius * 0.6, globe.z];
const villageFloor = baseHeight + 0.18;
const keyAt: Triple = [globe.x, 0.5, globe.z - 1.42];
const signAt: Triple = [1.45, 0, 3.4];

/* ------------------------------------------------------------------ */
/* The base and the glass                                              */
/* ------------------------------------------------------------------ */

const buildBase = (builder: AttractionBuilder) => {
  /* A turned base with mouldings, like a music box */
  builder.lathe(
    "paint",
    baseRed,
    [
      [0, 0],
      [1.45, 0],
      [1.48, 0.1],
      [1.36, 0.18],
      [1.3, 0.42],
      [1.22, 0.62],
      [1.25, 0.72],
      [1.32, 0.82],
      [1.28, baseHeight],
      [0, baseHeight],
    ],
    [globe.x, 0, globe.z],
    "y",
    builder.isFar ? 20 : 40,
  );
  builder.sphere(
    "water",
    globeGlass,
    globe.radius,
    globeCentre,
    [1, 1, 1],
    builder.isFar ? 14 : 30,
  );
  if (builder.isFar) {
    return;
  }
  /* Gold trims round the mouldings, and where the glass meets the base */
  [
    [1.47, 0.1, 0.04],
    [1.31, 0.42, 0.03],
    [1.27, 0.75, 0.035],
    [1.3, baseHeight, 0.06],
  ].forEach(([radius, y, tube]) => {
    builder.torus("metal", gold, radius, tube, [globe.x, y, globe.z], "y", 26);
  });
  /* Little gold ball feet */
  for (let foot = 0; foot < 6; foot++) {
    const angle = (foot / 6) * Math.PI * 2 + Math.PI / 6;
    builder.sphere(
      "metal",
      gold,
      0.12,
      [
        globe.x + Math.sin(angle) * 1.38,
        0.08,
        globe.z + Math.cos(angle) * 1.38,
      ],
      [1, 0.7, 1],
      8,
    );
  }
  /* A plaque on the front, and gold scrolls either side */
  builder.box(
    "metal",
    gold,
    [0.7, 0.28, 0.04],
    [globe.x, 0.52, globe.z + 1.27],
    [-0.14, 0, 0],
  );
  builder.box(
    "paint",
    baseRed,
    [0.5, 0.06, 0.02],
    [globe.x, 0.55, globe.z + 1.3],
    [-0.14, 0, 0],
  );
  builder.box(
    "paint",
    baseRed,
    [0.36, 0.04, 0.02],
    [globe.x, 0.47, globe.z + 1.31],
    [-0.14, 0, 0],
  );
  [-1, 1].forEach((side) => {
    const angle = side * 0.55;
    builder.torus(
      "metal",
      gold,
      0.1,
      0.02,
      [
        globe.x + Math.sin(angle) * 1.27,
        0.52,
        globe.z + Math.cos(angle) * 1.27,
      ],
      "z",
      14,
    );
  });
  /* A highlight glinting on the glass */
  builder.sphere(
    "glow",
    "#f6fcff",
    0.12,
    [globe.x - 0.62, globeCentre[1] + 0.95, globe.z + 0.95],
    [1, 1.8, 0.4],
    10,
  );
  /* The key's socket at the back */
  builder.cylinder("metal", gold, {
    radius: 0.12,
    length: 0.12,
    at: [keyAt[0], keyAt[1], keyAt[2] + 0.06],
    axis: "z",
    segments: 14,
  });
};

/** The wind-up key at the back, turning as the music plays. */
const buildKey = (builder: AttractionBuilder) => {
  builder.cylinder("metal", gold, {
    radius: 0.04,
    length: 0.3,
    at: [0, 0, -0.15],
    axis: "z",
    segments: 10,
  });
  [-1, 1].forEach((side) => {
    builder.torus("metal", gold, 0.13, 0.035, [side * 0.16, 0, -0.32], "z", 10);
  });
  builder.sphere("metal", gold, 0.06, [0, 0, -0.32], [1, 1, 1], 10);
};

/* ------------------------------------------------------------------ */
/* The tiny village inside                                             */
/* ------------------------------------------------------------------ */

const addHouse = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  size: number,
  turn: number,
) => {
  const [x, y, z] = at;
  const width = 0.36 * size;
  const depth = 0.3 * size;
  const height = 0.26 * size;
  builder.box(
    "matte",
    colour,
    [width, height, depth],
    [x, y + height / 2, z],
    [0, turn, 0],
  );
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.16 * size,
    at: [x, y + height, z],
    colour: snowWhite,
    overhang: 0.04,
    thickness: 0.04,
    turn,
  });
  builder.box(
    "glow",
    windowGlow,
    [0.07 * size, 0.08 * size, 0.01],
    [
      x + Math.sin(turn) * (depth / 2 + 0.005),
      y + height * 0.55,
      z + Math.cos(turn) * (depth / 2 + 0.005),
    ],
    [0, turn, 0],
  );
  builder.box(
    "paint",
    shade(colour, 0.6),
    [0.06 * size, 0.12 * size, 0.01],
    [
      x + Math.sin(turn) * (depth / 2 + 0.005) + Math.cos(turn) * width * 0.28,
      y + 0.06 * size,
      z + Math.cos(turn) * (depth / 2 + 0.005) - Math.sin(turn) * width * 0.28,
    ],
    [0, turn, 0],
  );
  builder.box(
    "matte",
    palette.brick,
    [0.05 * size, 0.12 * size, 0.05 * size],
    [x - width * 0.25, y + height + 0.12 * size, z],
  );
};

const addFir = (builder: AttractionBuilder, at: Triple, size: number) => {
  const [x, y, z] = at;
  [0, 1, 2].forEach((tier) => {
    builder.add(
      "matte",
      shade(firGreen, 1 + tier * 0.07),
      new ConeGeometry((0.16 - tier * 0.04) * size, 0.22 * size, 9),
      {
        at: [x, y + (0.13 + tier * 0.12) * size, z],
      },
    );
  });
  builder.add(
    "matte",
    snowWhite,
    new ConeGeometry(0.05 * size, 0.08 * size, 9),
    { at: [x, y + 0.42 * size, z] },
  );
};

const buildVillage = (builder: AttractionBuilder) => {
  const [x, , z] = globeCentre;
  const floor = villageFloor;
  /* A snowy hill for the village, filling the bottom of the globe */
  builder.cylinder("matte", snowWhite, {
    radius: 1.2,
    radiusEnd: 1.16,
    length: 0.2,
    at: [x, floor - 0.1, z],
    segments: builder.isFar ? 14 : 36,
  });
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    snowWhite,
    0.55,
    [x - 0.3, floor, z - 0.4],
    [1.3, 0.45, 1],
    16,
  );
  /* The church on the hill, with its steeple */
  const church: Triple = [x - 0.3, floor + 0.2, z - 0.5];
  builder.box(
    "matte",
    "#e9dcc4",
    [0.3, 0.32, 0.5],
    [church[0], church[1] + 0.16, church[2]],
  );
  addGableRoof(builder, {
    width: 0.3,
    depth: 0.5,
    rise: 0.18,
    at: [church[0], church[1] + 0.32, church[2]],
    colour: snowWhite,
    overhang: 0.03,
    thickness: 0.04,
    turn: Math.PI / 2,
  });
  builder.box(
    "matte",
    "#e9dcc4",
    [0.16, 0.4, 0.16],
    [church[0], church[1] + 0.52, church[2] + 0.22],
  );
  builder.add(
    "matte",
    "#5a6b80",
    new ConeGeometry(0.13, 0.32, 4).rotateY(Math.PI / 4),
    {
      at: [church[0], church[1] + 0.88, church[2] + 0.22],
    },
  );
  builder.box(
    "glow",
    windowGlow,
    [0.06, 0.12, 0.01],
    [church[0], church[1] + 0.2, church[2] + 0.255],
  );
  builder.cylinder("glow", windowGlow, {
    radius: 0.04,
    length: 0.01,
    at: [church[0], church[1] + 0.58, church[2] + 0.305],
    axis: "z",
    segments: 10,
  });
  /* Houses round the square */
  addHouse(builder, [x + 0.5, floor, z - 0.25], "#c7432f", 1, -0.5);
  addHouse(builder, [x + 0.55, floor, z + 0.45], "#3f6f8f", 0.9, -1.2);
  addHouse(builder, [x - 0.65, floor, z + 0.35], "#e0b04a", 0.85, 0.8);
  /* Fir trees, a frozen pond and a little snowman */
  [
    [0.15, -0.85, 1.1],
    [0.9, 0.05, 0.9],
    [-0.85, -0.2, 1.0],
    [-0.2, 0.75, 0.8],
    [0.35, 0.8, 0.7],
  ].forEach(([dx, dz, size]) => {
    addFir(builder, [x + dx, floor, z + dz], size);
  });
  builder.cylinder("glass", "#bfe0f0", {
    radius: 0.22,
    length: 0.01,
    at: [x + 0.05, floor + 0.005, z + 0.25],
    segments: 18,
  });
  builder.sphere(
    "matte",
    snowWhite,
    0.06,
    [x - 0.25, floor + 0.05, z + 0.55],
    [1, 1, 1],
    10,
  );
  builder.sphere(
    "matte",
    snowWhite,
    0.04,
    [x - 0.25, floor + 0.13, z + 0.55],
    [1, 1, 1],
    8,
  );
  builder.box(
    "paint",
    "#ee7a1f",
    [0.01, 0.01, 0.04],
    [x - 0.25, floor + 0.13, z + 0.6],
  );
  builder.cylinder("paint", palette.black, {
    radius: 0.03,
    length: 0.04,
    at: [x - 0.25, floor + 0.18, z + 0.55],
    segments: 8,
  });
  /* A lamp post in the square */
  builder.cylinder("paint", palette.black, {
    radius: 0.01,
    length: 0.3,
    at: [x + 0.15, floor + 0.15, z + 0.55],
    segments: 6,
  });
  builder.sphere(
    "glow",
    windowGlow,
    0.035,
    [x + 0.15, floor + 0.32, z + 0.55],
    [1, 1, 1],
    8,
  );
};

/* ------------------------------------------------------------------ */
/* Snow, inside and out                                                */
/* ------------------------------------------------------------------ */

/** A little six-armed flake. */
const addFlake = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  tilt: number,
) => {
  for (let arm = 0; arm < 3; arm++) {
    builder.box("glow", flakeWhite, [size, size * 0.18, size * 0.18], at, [
      tilt,
      tilt * 0.5,
      (arm * Math.PI) / 3,
    ]);
  }
};

/** A clump of flakes drifting round inside the glass. */
const buildDrift = (builder: AttractionBuilder) => {
  addFlake(builder, [0, 0.35, 0], 0.11, 0.3);
  addFlake(builder, [0.08, -0.05, 0.1], 0.08, 1.1);
  addFlake(builder, [-0.1, 0.62, -0.06], 0.07, 0.7);
  builder.add("glow", flakeWhite, new OctahedronGeometry(0.025, 0), {
    at: [0.05, 0.15, -0.08],
  });
};

/** A cloud of flakes swirling round the middle, faster when you are near. */
const buildSwirl = (builder: AttractionBuilder) => {
  for (let flake = 0; flake < 16; flake++) {
    const angle = flake * 2.4;
    const radius = 0.35 + (flake % 4) * 0.17;
    const height = -0.4 + ((flake * 0.37) % 1.3);
    if (flake % 3 === 0) {
      addFlake(
        builder,
        [Math.sin(angle) * radius, height, Math.cos(angle) * radius],
        0.07,
        flake * 0.4,
      );
    } else {
      builder.add("glow", flakeWhite, new OctahedronGeometry(0.03, 0), {
        at: [Math.sin(angle) * radius, height, Math.cos(angle) * radius],
      });
    }
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A round dais of packed snow, and presents piled beside the globe */
  builder.cylinder("matte", snowShadow, {
    radius: 1.75,
    radiusEnd: 1.65,
    length: 0.1,
    at: [globe.x, 0.05, globe.z],
    segments: builder.isFar ? 14 : 40,
  });
  if (builder.isFar) {
    return;
  }
  [
    {
      x: 1.9,
      z: 0.9,
      size: 0.5,
      wrap: "#2f6fb8",
      ribbon: "#f0b62e",
      turn: 0.3,
      y: 0.25,
    },
    {
      x: 2.25,
      z: 0.35,
      size: 0.38,
      wrap: "#3f9a4a",
      ribbon: "#d8342c",
      turn: -0.2,
      y: 0.19,
    },
    {
      x: 1.95,
      z: 0.95,
      size: 0.3,
      wrap: "#d8342c",
      ribbon: palette.white,
      turn: 0.6,
      y: 0.65,
    },
  ].forEach(({ x, z, size, wrap, ribbon, turn, y }) => {
    builder.box("paint", wrap, [size, size, size], [x, y, z], [0, turn, 0]);
    builder.box(
      "paint",
      ribbon,
      [size + 0.01, size + 0.01, 0.06],
      [x, y, z],
      [0, turn, 0],
    );
    builder.box(
      "paint",
      ribbon,
      [0.06, size + 0.01, size + 0.01],
      [x, y, z],
      [0, turn, 0],
    );
    [-1, 1].forEach((side) => {
      builder.torus(
        "paint",
        ribbon,
        0.06,
        0.02,
        [x + side * 0.05, y + size / 2 + 0.05, z],
        "z",
        8,
      );
    });
  });
  [
    [-2.9, -1.6, 0.65],
    [-2.6, 1.8, 0.5],
    [2.5, -2.4, 0.6],
    [0.2, -3.3, 0.5],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowWhite, size, [x, 0, z], [1.5, 0.45, 1], 10);
  });
};

export const snowGlobeModel: CuriosityModel = {
  kind: "snow-globe",
  islandId: "frost-isle",
  name: "Giant Snow Globe",
  fact: "A snow globe is a clear ball filled with water, with a tiny scene inside. Glass and clear plastic are transparent, which means we can see through them. When you shake the globe, tiny white flakes swirl round in the water, and then they slowly sink, because water pushes back and slows them down.",
  curriculumLink:
    "Science, Year 2: identify and compare the suitability of a variety of everyday materials, including glass and plastic, for particular uses.",
  footprint: 4.0,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildGrounds(builder);
    buildBase(builder);
    buildVillage(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "drifting snow",
      pivot: [globeCentre[0], globeCentre[1] - 0.2, globeCentre[2]],
      build: buildDrift,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 0.85,
        count: 6,
        speed: 0.35,
        bob: 0.25,
      },
    },
    {
      name: "swirling snow",
      pivot: [globeCentre[0], globeCentre[1] + 0.1, globeCentre[2]],
      build: buildSwirl,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 3.2, reach: 6 },
    },
    {
      name: "wind-up key",
      pivot: keyAt,
      build: buildKey,
      motion: { kind: "whirl", axis: "z", idle: 0.2, speed: 1.6, reach: 6 },
    },
  ],
  blockers: [
    { x: globe.x, z: globe.z, radius: 1.55 },
    { x: 2.0, z: 0.75, radius: 0.5 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Shake the snow globe",
    news: "Swish, swirl! The snow whirled round the tiny village, then drifted gently down onto the rooftops.",
    tune: [76, 74, 72, 74, 76, 76, 76],
  },
};
