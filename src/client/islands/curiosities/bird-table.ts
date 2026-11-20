import { CylinderGeometry, TorusGeometry } from "three";
import {
  addBench,
  addGableRoof,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const tableTimber = "#9a6a3e";
const tableDark = "#6a4526";
const roofGreen = "#4c7a4a";
const seedGold = "#d9b25a";
const seedDark = "#6a5232";
const bathStone = "#c7c0b0";
const bathWater = "#6fb6d6";
const feederGreen = "#3f7a46";
const crookBlack = "#2b2d30";
const robinBrown = "#8a6a46";
const robinBreast = "#e0602a";
const blueTitBlue = "#4a86c8";
const blueTitYellow = "#f2d23a";
const fatBall = "#e3cf8a";
const signColour = "#4c7a4a";

const table = { x: 0, z: -0.3 };
const trayHeight = 1.45;
const trayWidth = 0.9;
const trayDepth = 0.72;
const storeTop = trayHeight - 0.05;
const storeHeight = 0.42;
const robinRise = 0.36;
const crook = { x: 1.6, z: -1.0 };
const crookHeight = 2.2;
const bath = { x: -1.55, z: 0.5 };
const nestTree = { x: -1.7, z: -1.7 };
const hookAt: Triple = [crook.x + 0.6, crookHeight - 0.1, crook.z];

/* ------------------------------------------------------------------ */
/* The bird table                                                      */
/* ------------------------------------------------------------------ */

const buildTable = (builder: AttractionBuilder) => {
  const { x, z } = table;
  /* A cross-shaped foot and a square post */
  [0, Math.PI / 2].forEach((turn) => {
    builder.box(
      "matte",
      tableDark,
      [1.0, 0.1, 0.12],
      [x, 0.05, z],
      [0, turn, 0],
    );
  });
  builder.box(
    "matte",
    tableTimber,
    [0.12, storeTop, 0.12],
    [x, storeTop / 2, z],
  );
  /* The seed store under the tray, where the robin waits */
  builder.box(
    "matte",
    shade(tableTimber, 1.08),
    [0.46, storeHeight, 0.42],
    [x, storeTop - storeHeight / 2, z],
  );
  /* The tray, with a lip to keep the seed in */
  builder.box(
    "matte",
    tableTimber,
    [trayWidth, 0.05, trayDepth],
    [x, trayHeight - 0.025, z],
  );
  /* Corner posts holding up the roof */
  const roofBase = trayHeight + 0.55;
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "matte",
        tableDark,
        [0.05, roofBase - trayHeight, 0.05],
        [
          x + sideX * (trayWidth / 2 - 0.05),
          (roofBase + trayHeight) / 2,
          z + sideZ * (trayDepth / 2 - 0.05),
        ],
      );
    });
  });
  addGableRoof(builder, {
    width: trayWidth,
    depth: trayDepth,
    rise: 0.32,
    at: [x, roofBase, z],
    colour: roofGreen,
    overhang: 0.12,
    thickness: 0.05,
    finish: "paint",
  });
  if (builder.isFar) {
    return;
  }
  /* Struts bracing the post */
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((turn) => {
    builder.bar(
      "matte",
      tableDark,
      [x + Math.sin(turn) * 0.42, 0.1, z + Math.cos(turn) * 0.42],
      [x + Math.sin(turn) * 0.05, 0.55, z + Math.cos(turn) * 0.05],
      0.06,
      4,
    );
  });
  /* The store's little door with its latch */
  builder.box(
    "matte",
    tableDark,
    [0.3, 0.28, 0.02],
    [x, storeTop - storeHeight / 2, z + 0.22],
  );
  builder.box(
    "metal",
    palette.brass,
    [0.04, 0.03, 0.02],
    [x + 0.1, storeTop - storeHeight / 2, z + 0.235],
  );
  /* The tray's lip, all round */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      tableDark,
      [trayWidth, 0.06, 0.03],
      [x, trayHeight + 0.03, z + side * (trayDepth / 2 - 0.015)],
    );
    builder.box(
      "matte",
      tableDark,
      [0.03, 0.06, trayDepth],
      [x + side * (trayWidth / 2 - 0.015), trayHeight + 0.03, z],
    );
  });
  /* Seed scattered over the tray, half an apple, and a water dish */
  for (let seed = 0; seed < 14; seed++) {
    const angle = seed * 2.39;
    const distance = 0.06 + (seed % 5) * 0.06;
    builder.box(
      "matte",
      seed % 3 === 0 ? seedDark : seedGold,
      [0.05, 0.015, 0.03],
      [
        x - 0.1 + Math.sin(angle) * distance,
        trayHeight + 0.008,
        z + Math.cos(angle) * distance * 0.8,
      ],
      [0, angle, 0],
    );
  }
  builder.sphere(
    "paint",
    "#d8402e",
    0.07,
    [x + 0.22, trayHeight, z - 0.15],
    [1, 0.6, 1],
    10,
  );
  builder.cylinder("paint", "#f4ead0", {
    radius: 0.055,
    length: 0.006,
    at: [x + 0.22, trayHeight + 0.042, z - 0.15],
    segments: 10,
  });
  builder.cylinder("paint", palette.steel, {
    radius: 0.09,
    radiusEnd: 0.1,
    length: 0.04,
    at: [x + 0.22, trayHeight + 0.02, z + 0.18],
    segments: 12,
  });
  builder.cylinder("water", bathWater, {
    radius: 0.085,
    length: 0.01,
    at: [x + 0.22, trayHeight + 0.035, z + 0.18],
    segments: 12,
  });
  /* A ridge board on the roof */
  builder.box(
    "matte",
    tableDark,
    [trayWidth + 0.3, 0.05, 0.06],
    [x, roofBase + 0.34, z],
  );
};

/* ------------------------------------------------------------------ */
/* The shepherd's crook and its hanging feeders                        */
/* ------------------------------------------------------------------ */

const buildCrook = (builder: AttractionBuilder) => {
  const { x, z } = crook;
  builder.cylinder("paint", crookBlack, {
    radius: 0.03,
    length: crookHeight,
    at: [x, crookHeight / 2, z],
    segments: 8,
  });
  /* Two curled arms, one each way */
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      crookBlack,
      new TorusGeometry(0.3, 0.022, 5, builder.isFar ? 6 : 12, Math.PI),
      {
        at: [x + side * 0.3, crookHeight - 0.1, z],
        rotation: [0, side === 1 ? 0 : Math.PI, 0],
      },
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.sphere("paint", crookBlack, 0.045, [x, crookHeight + 0.02, z]);
  /* Feet pushed into the lawn */
  [0.5, 2.6, 4.7].forEach((angle) => {
    builder.bar(
      "paint",
      crookBlack,
      [x, 0.25, z],
      [x + Math.sin(angle) * 0.22, 0, z + Math.cos(angle) * 0.22],
      0.03,
      4,
    );
  });
  /* A fat-ball cage hanging on the other arm */
  const cage: Triple = [x - 0.6, crookHeight - 0.62, z];
  builder.bar(
    "metal",
    palette.steel,
    [cage[0], crookHeight - 0.1, cage[2]],
    [cage[0], cage[1] + 0.2, cage[2]],
    0.008,
    3,
  );
  [0.17, 0.38, 0.6].forEach((share, index) => {
    builder.sphere(
      "matte",
      index === 1 ? shade(fatBall, 0.9) : fatBall,
      0.065,
      [cage[0], cage[1] + 0.12 - share * 0.38, cage[2]],
      [1, 1, 1],
      8,
    );
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.08,
    length: 0.4,
    at: [cage[0], cage[1] - 0.05, cage[2]],
    segments: 10,
    isOpen: true,
  });
  [-1, 1].forEach((end) => {
    builder.cylinder("paint", feederGreen, {
      radius: 0.09,
      length: 0.04,
      at: [cage[0], cage[1] - 0.05 + end * 0.21, cage[2]],
      segments: 10,
    });
  });
  /* A bag of bird seed and a scoop at the foot of the pole */
  builder.cylinder("matte", "#7fae5a", {
    radius: 0.18,
    radiusEnd: 0.15,
    length: 0.45,
    at: [x + 0.15, 0.225, z + 0.45],
    segments: 4,
  });
  builder.box(
    "matte",
    palette.white,
    [0.16, 0.12, 0.01],
    [x + 0.15, 0.28, z + 0.57],
  );
  builder.cylinder("matte", seedGold, {
    radius: 0.13,
    length: 0.02,
    at: [x + 0.15, 0.46, z + 0.45],
    segments: 4,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.05,
    length: 0.08,
    at: [x - 0.15, 0.04, z + 0.6],
    axis: "z",
    segments: 10,
  });
};

/** The seed tube feeder, hung from the crook so it can sway. */
const buildTubeFeeder = (builder: AttractionBuilder) => {
  builder.bar("metal", palette.steel, [0, 0, 0], [0, -0.3, 0], 0.008, 3);
  builder.cylinder("paint", feederGreen, {
    radius: 0.075,
    radiusEnd: 0.02,
    length: 0.08,
    at: [0, -0.34, 0],
    segments: 12,
  });
  builder.cylinder("glass", "#d8ecf2", {
    radius: 0.06,
    length: 0.5,
    at: [0, -0.63, 0],
    segments: 12,
  });
  builder.cylinder("matte", seedGold, {
    radius: 0.052,
    length: 0.36,
    at: [0, -0.68, 0],
    segments: 10,
  });
  builder.cylinder("paint", feederGreen, {
    radius: 0.075,
    length: 0.05,
    at: [0, -0.9, 0],
    segments: 12,
  });
  /* Feeding ports with perches either side */
  [-0.55, -0.8].forEach((y, index) => {
    const turn = index * (Math.PI / 2);
    builder.bar(
      "metal",
      palette.steel,
      [Math.sin(turn) * -0.16, y - 0.04, Math.cos(turn) * -0.16],
      [Math.sin(turn) * 0.16, y - 0.04, Math.cos(turn) * 0.16],
      0.012,
      4,
    );
    [-1, 1].forEach((side) => {
      builder.cylinder("paint", feederGreen, {
        radius: 0.025,
        length: 0.02,
        at: [Math.sin(turn) * side * 0.06, y, Math.cos(turn) * side * 0.06],
        axis: index === 0 ? "z" : "x",
        segments: 8,
      });
    });
  });
};

/* ------------------------------------------------------------------ */
/* The bird bath and the nest box tree                                 */
/* ------------------------------------------------------------------ */

const buildBath = (builder: AttractionBuilder) => {
  const { x, z } = bath;
  builder.lathe(
    "matte",
    bathStone,
    [
      [0, 0],
      [0.28, 0],
      [0.28, 0.08],
      [0.16, 0.14],
      [0.1, 0.3],
      [0.09, 0.55],
      [0.13, 0.66],
      [0.42, 0.74],
      [0.46, 0.8],
      [0.43, 0.83],
      [0, 0.76],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 8 : 20,
  );
  builder.cylinder("water", bathWater, {
    radius: 0.4,
    length: 0.02,
    at: [x, 0.79, z],
    segments: builder.isFar ? 10 : 20,
  });
  if (builder.isFar) {
    return;
  }
  /* Moss at the foot, and a pebble in the bowl for the bees */
  builder.torus("matte", "#5d8f3a", 0.17, 0.04, [x, 0.14, z], "y", 14);
  builder.sphere(
    "matte",
    palette.darkStone,
    0.06,
    [x + 0.15, 0.79, z - 0.1],
    [1.2, 0.6, 1],
    8,
  );
  /* A sparrow perched on the rim, having a drink */
  buildPerchedBird(
    builder,
    [x - 0.3, 0.83, z + 0.25],
    -0.8,
    "#8a6a4a",
    "#d8c6a8",
  );
};

/** A small bird sitting still, facing `turn`. */
const buildPerchedBird = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  back: string,
  front: string,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  builder.sphere(
    "paint",
    back,
    0.07,
    place(0, 0.07, -0.01),
    [0.9, 0.85, 1.25],
    8,
  );
  builder.sphere("paint", front, 0.055, place(0, 0.06, 0.035), [1, 1, 1], 8);
  builder.sphere("paint", back, 0.045, place(0, 0.14, 0.06), [1, 1, 1], 8);
  builder.add("paint", "#3a3226", new CylinderGeometry(0, 0.015, 0.05, 5), {
    at: place(0, 0.14, 0.12),
    rotation: [Math.PI / 2, turn, 0],
  });
  builder.box("paint", back, [0.05, 0.015, 0.1], place(0, 0.08, -0.12), [
    0.4,
    turn,
    0,
  ]);
};

const buildNestTree = (builder: AttractionBuilder) => {
  const { x, z } = nestTree;
  builder.cylinder("matte", "#6a4a30", {
    radius: 0.2,
    radiusEnd: 0.14,
    length: 2.6,
    at: [x, 1.3, z],
    segments: builder.isFar ? 6 : 10,
  });
  const clumps: [number, number, number, number][] = builder.isFar
    ? [[0, 2.9, 0, 1.1]]
    : [
        [0, 3.0, 0, 1.0],
        [0.6, 2.6, 0.2, 0.7],
        [-0.55, 2.7, -0.2, 0.72],
        [0.1, 3.5, -0.2, 0.62],
      ];
  clumps.forEach(([dx, dy, dz, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? palette.leaf : shade(palette.leaf, 0.86),
      size,
      [x + dx, dy, z + dz],
      [1, 0.85, 1],
      builder.isFar ? 8 : 11,
    );
  });
  /* The nest box on the trunk, facing the bird table */
  const box: Triple = [x + 0.1, 1.55, z + 0.32];
  builder.box("matte", tableTimber, [0.26, 0.36, 0.24], box);
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    tableDark,
    [0.32, 0.04, 0.32],
    [box[0], box[1] + 0.2, box[2] + 0.02],
    [-0.25, 0, 0],
  );
  builder.cylinder("matte", "#1f1812", {
    radius: 0.045,
    length: 0.01,
    at: [box[0], box[1] + 0.06, box[2] + 0.121],
    axis: "z",
    segments: 10,
  });
  builder.cylinder("matte", tableDark, {
    radius: 0.012,
    length: 0.08,
    at: [box[0], box[1] - 0.04, box[2] + 0.16],
    axis: "z",
    segments: 5,
  });
  /* A blue tit peeping out of the hole */
  builder.sphere(
    "paint",
    blueTitBlue,
    0.04,
    [box[0], box[1] + 0.08, box[2] + 0.12],
    [1, 1, 0.8],
    8,
  );
  builder.sphere(
    "paint",
    palette.white,
    0.03,
    [box[0], box[1] + 0.05, box[2] + 0.14],
    [1.1, 0.7, 0.6],
    6,
  );
  builder.sphere(
    "paint",
    blueTitYellow,
    0.03,
    [box[0], box[1] + 0.02, box[2] + 0.13],
    [1, 0.7, 0.6],
    6,
  );
};

/* ------------------------------------------------------------------ */
/* The garden round about                                              */
/* ------------------------------------------------------------------ */

const buildGarden = (builder: AttractionBuilder) => {
  /* A curved border of flowers at the back */
  builder.add(
    "matte",
    palette.soil,
    new TorusGeometry(3.1, 0.35, 3, 16, Math.PI * 0.55),
    { at: [0, -0.2, 0], rotation: [Math.PI / 2, 0, Math.PI * 1.22] },
  );
  [
    [-0.75, "#b36ad0"],
    [-0.55, "#f2a21a"],
    [-0.35, "#e85a7a"],
    [-0.15, "#b36ad0"],
    [0.05, "#f2a21a"],
    [0.25, "#f7f3e8"],
    [0.45, "#e85a7a"],
  ].forEach(([share, colour], index) => {
    if (typeof share !== "number" || typeof colour !== "string") {
      return;
    }
    const angle = Math.PI + share;
    const x = Math.sin(angle) * 3.1;
    const z = Math.cos(angle) * 3.1;
    builder.sphere(
      "matte",
      shade(palette.leaf, index % 2 === 0 ? 1 : 0.85),
      0.28,
      [x, 0.18, z],
      [1.2, 0.8, 1],
      8,
    );
    [-1, 0, 1].forEach((bloom) => {
      builder.sphere(
        "paint",
        colour,
        0.07,
        [x + bloom * 0.15, 0.4 + (bloom === 0 ? 0.05 : 0), z + bloom * 0.06],
        [1, 0.7, 1],
        6,
      );
    });
  });
  /* A half coconut of seed, hung from a branch of the nest box tree */
  const coconut: Triple = [nestTree.x + 0.65, 1.9, nestTree.z + 0.2];
  builder.bar(
    "matte",
    "#6a4a30",
    [nestTree.x, 2.3, nestTree.z],
    [coconut[0], 2.45, coconut[2]],
    0.07,
    5,
  );
  builder.bar(
    "matte",
    "#8a7a5a",
    [coconut[0], 2.45, coconut[2]],
    [coconut[0], coconut[1] + 0.08, coconut[2]],
    0.008,
    3,
  );
  builder.lathe(
    "matte",
    "#6a4a2a",
    [
      [0, -0.1],
      [0.07, -0.08],
      [0.1, -0.02],
      [0.1, 0.0],
      [0.085, 0.0],
      [0, -0.02],
    ],
    [coconut[0], coconut[1] + 0.08, coconut[2]],
    "x",
    12,
  );
  builder.cylinder("matte", fatBall, {
    radius: 0.085,
    length: 0.01,
    at: [coconut[0], coconut[1] + 0.08, coconut[2]],
    axis: "x",
    segments: 12,
  });
  /* Binoculars and a bird book left on the bench */
  const seat: Triple = [1.9, 0.38, 1.3];
  [-0.04, 0.04].forEach((side) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.035,
      length: 0.12,
      at: [seat[0] + side, seat[1] + 0.035, seat[2] + 0.2],
      axis: "z",
      segments: 8,
    });
  });
  builder.box(
    "paint",
    "#2f6fb0",
    [0.2, 0.03, 0.15],
    [seat[0] - 0.05, seat[1] + 0.015, seat[2] - 0.15],
    [0, 0.3, 0],
  );
  builder.box(
    "paint",
    palette.white,
    [0.18, 0.032, 0.13],
    [seat[0] - 0.05, seat[1] + 0.015, seat[2] - 0.15],
    [0, 0.3, 0],
  );
};

/* ------------------------------------------------------------------ */
/* The birds                                                           */
/* ------------------------------------------------------------------ */

/** The robin, hiding in the seed store until someone comes. */
const buildRobin = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    robinBrown,
    0.085,
    [0, 0.11, -0.01],
    [0.95, 0.95, 1.2],
    10,
  );
  builder.sphere(
    "paint",
    robinBreast,
    0.07,
    [0, 0.11, 0.05],
    [1, 1.05, 0.9],
    10,
  );
  builder.sphere("paint", robinBrown, 0.055, [0, 0.2, 0.06], [1, 1, 1], 9);
  builder.sphere("paint", robinBreast, 0.04, [0, 0.185, 0.09], [1, 1, 0.7], 8);
  builder.add("paint", "#2a241c", new CylinderGeometry(0, 0.016, 0.05, 5), {
    at: [0, 0.2, 0.135],
    rotation: [Math.PI / 2, 0, 0],
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.011,
      [side * 0.035, 0.215, 0.1],
      [1, 1, 1],
      5,
    );
    builder.bar(
      "paint",
      "#8a5a3a",
      [side * 0.025, 0.05, 0],
      [side * 0.03, 0, 0.01],
      0.01,
      3,
    );
    builder.box(
      "paint",
      shade(robinBrown, 0.85),
      [0.02, 0.06, 0.12],
      [side * 0.075, 0.12, -0.03],
      [0.2, 0, side * 0.15],
    );
  });
  builder.box(
    "paint",
    shade(robinBrown, 0.85),
    [0.06, 0.015, 0.11],
    [0, 0.11, -0.13],
    [-0.5, 0, 0],
  );
};

/** A goldfinch flitting round the garden. */
const buildFinch = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#c8a77a", 0.06, [0, 0, 0], [0.85, 0.85, 1.3], 8);
  builder.sphere("paint", "#d0302a", 0.038, [0, 0.03, 0.07], [1, 1, 1], 7);
  builder.add("paint", "#e9d9c0", new CylinderGeometry(0, 0.012, 0.04, 4), {
    at: [0, 0.03, 0.12],
    rotation: [Math.PI / 2, 0, 0],
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.black,
      [0.13, 0.008, 0.06],
      [side * 0.08, 0.02, -0.01],
      [0, 0, side * 0.35],
    );
    builder.box(
      "paint",
      blueTitYellow,
      [0.08, 0.01, 0.02],
      [side * 0.08, 0.025, 0.01],
      [0, 0, side * 0.35],
    );
  });
  builder.box("paint", palette.black, [0.04, 0.008, 0.08], [0, 0, -0.1]);
};

/** A blackbird hopping on the lawn, looking for worms. */
const buildBlackbird = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#222326", 0.08, [0, 0.1, 0], [0.9, 0.85, 1.35], 8);
  builder.sphere("paint", "#222326", 0.05, [0, 0.18, 0.08], [1, 1, 1], 7);
  builder.add("paint", "#f2a21a", new CylinderGeometry(0, 0.016, 0.06, 4), {
    at: [0, 0.18, 0.15],
    rotation: [Math.PI / 2, 0, 0],
  });
  builder.box(
    "paint",
    "#222326",
    [0.05, 0.015, 0.13],
    [0, 0.13, -0.14],
    [-0.4, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      "#5a4a3a",
      [side * 0.025, 0.05, 0],
      [side * 0.03, 0, 0.01],
      0.01,
      3,
    );
  });
};

export const birdTableModel: CuriosityModel = {
  kind: "bird-table",
  islandId: "meadow-isle",
  name: "Bird Table",
  fact: "A bird table gives garden birds food and water, especially in winter when food is hard to find. Look out for the robin with its orange-red breast, the blue tit in blue and yellow, the goldfinch with its red face, and the blackbird, whose beak is orange. Birds have feathers, wings and a beak, and they lay eggs, often in a nest box like this one.",
  curriculumLink:
    "Science, Year 1: identify and name a variety of common animals including fish, amphibians, reptiles, birds and mammals.",
  footprint: 4.2,
  setting: "inland",
  signSpot: { x: 0.6, z: 3.2 },
  build: (builder) => {
    buildTable(builder);
    buildCrook(builder);
    buildBath(builder);
    buildNestTree(builder);
    if (builder.isFar) {
      builder.cylinder("paint", feederGreen, {
        radius: 0.07,
        length: 0.6,
        at: [hookAt[0], hookAt[1] - 0.6, hookAt[2]],
        segments: 6,
      });
    } else {
      addBench(builder, [1.9, 0, 1.3], -Math.PI / 2 - 0.5, palette.paleTimber);
      buildGarden(builder);
      /* A wood pigeon sitting on the bird table's ridge */
      buildPerchedBird(
        builder,
        [table.x + 0.25, trayHeight + 0.55 + 0.36, table.z],
        Math.PI / 2,
        "#8a8f9a",
        "#c89aa0",
      );
      /* Stepping stones from the sign to the table */
      [
        [0.35, 2.4],
        [0.15, 1.65],
        [0.05, 0.9],
      ].forEach(([x, z], index) => {
        builder.cylinder(
          "matte",
          shade(palette.paving, index % 2 === 0 ? 1 : 0.92),
          {
            radius: 0.26,
            length: 0.04,
            at: [x, 0.02, z],
            segments: 12,
          },
        );
      });
    }
    addSignBoard(builder, [0.6, 0, 3.2], signColour);
  },
  moving: [
    {
      name: "robin",
      pivot: [table.x - 0.12, trayHeight - robinRise, table.z + 0.02],
      build: buildRobin,
      motion: { kind: "rise", reach: 6, height: robinRise, period: 1.4 },
    },
    {
      name: "tube feeder",
      pivot: hookAt,
      build: buildTubeFeeder,
      motion: { kind: "swing", axis: "x", amplitude: 0.08, period: 3.4 },
    },
  ],
  wanderers: [
    {
      name: "goldfinches",
      build: buildFinch,
      count: 4,
      centre: { x: 0, z: -0.2 },
      radius: 2.6,
      speed: 1.3,
      height: 2.3,
      bob: 0.5,
    },
    {
      name: "blackbirds",
      build: buildBlackbird,
      count: 3,
      centre: { x: 0.2, z: 1.0 },
      radius: 1.6,
      speed: 0.35,
      bob: 0.06,
    },
  ],
  blockers: [
    { x: table.x, z: table.z, radius: 0.5 },
    { x: crook.x, z: crook.z, radius: 0.3 },
    { x: bath.x, z: bath.z, radius: 0.45 },
    { x: nestTree.x, z: nestTree.z, radius: 0.35 },
    { x: 1.9, z: 1.3, radius: 0.6 },
  ] satisfies LocalBlocker[],
  tune: [84, 88, 91, 88, 96, 93],
  play: {
    label: "Put out some seed",
    news: "Cheep cheep! A robin, a blue tit and two goldfinches flew down to share the seed you sprinkled.",
    tune: [91, 88, 93, 96],
  },
};
