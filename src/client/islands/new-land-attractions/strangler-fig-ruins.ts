import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const sandstone = "#a29a83";
const sandstoneLight = "#bdb49b";
const sandstoneDark = "#7c7663";
const laterite = "#9a6248";
const moss = "#6a8a42";
const mossDark = "#4f6e33";
const figBark = "#8c7d68";
const figBarkDark = "#6d604f";
const leafDeep = "#1f6428";
const leafMid = "#2f8a35";
const leafBright = "#58b043";
const floor = "#6f5a3c";
const shadow = "#1b1712";
const lotusPink = "#f19bc0";
const pondWater = "#4d8f86";
const eyeGlow = "#ffd36b";
const macaqueFur = "#9a7b58";
const macaqueFace = "#e0a98f";
const hornbillBeak = "#f2b01e";
const lizardGreen = "#6f8f3c";
const signColour = "#7a4a2a";

/* The stepped temple: four terraces, each a stride higher */
const templeZ = -2.6;
const terraces = [
  { half: 3.4, top: 0.3 },
  { half: 2.7, top: 0.6 },
  { half: 2.0, top: 0.9 },
  { half: 1.3, top: 1.2 },
];
const shrineHalf = 0.9;
const shrineWall = 0.2;
const shrineTop = 1.2;
const doorHalf = 0.42;

/* The gateway, with a strangler fig sitting on top of it */
const gateZ = 4.6;
const pylonX = 1.35;
const pylonHalf = 0.5;
const pylonHeight = 2.3;
const wallHeight = 1.35;

/* The secret passage: a crypt kiosk each side of the temple */
const kiosks = [
  { x: -5.2, z: templeZ },
  { x: 5.2, z: templeZ },
];
const passageStart = { x: -5.2, z: templeZ + 1.5 };
const passageFinish = { x: 5.2, z: templeZ + 1.6 };

const pondAt = { x: -3.9, z: 2.0 };
const signAt = { x: 2.2, z: 8.2 };

/* -------------------------------------------------------------- */
/* Shapes                                                          */
/* -------------------------------------------------------------- */

const addLeafClump = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  colour: string,
) => {
  builder.sphere("matte", colour, radius, at, [1, 0.7, 1], 10);
};

/** A sinuous root from one point to another, bulging out as it goes. */
const addRoot = (
  builder: AttractionBuilder,
  from: Triple,
  to: Triple,
  bulge: Triple,
  thickness: number,
  pieces = 4,
) => {
  const count = builder.isFar ? 2 : pieces;
  let before = from;
  for (let piece = 1; piece <= count; piece++) {
    const share = piece / count;
    const arc = Math.sin(share * Math.PI);
    const point: Triple = [
      from[0] + (to[0] - from[0]) * share + bulge[0] * arc,
      from[1] + (to[1] - from[1]) * share + bulge[1] * arc,
      from[2] + (to[2] - from[2]) * share + bulge[2] * arc,
    ];
    builder.bar(
      "matte",
      piece % 2 === 0 ? figBark : figBarkDark,
      before,
      point,
      thickness * (1 - share * 0.35),
      builder.isFar ? 5 : 7,
    );
    before = point;
  }
};

/** A worn stone block, with moss on its top. */
const addBlock = (
  builder: AttractionBuilder,
  size: Triple,
  at: Triple,
  turn = 0,
  colour = sandstone,
) => {
  builder.box("matte", colour, size, at, [0, turn, 0]);
  if (!builder.isFar) {
    builder.box(
      "matte",
      moss,
      [size[0] * 0.7, 0.03, size[2] * 0.6],
      [at[0], at[1] + size[1] / 2 + 0.01, at[2]],
      [0, turn + 0.2, 0],
    );
  }
};

/** A smiling stone face, carved in low relief, facing +z. */
const addStoneFace = (builder: AttractionBuilder, at: Triple, size: number) => {
  const [x, y, z] = at;
  builder.box(
    "matte",
    sandstoneLight,
    [0.8 * size, 0.95 * size, 0.08],
    [x, y, z],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    sandstoneDark,
    [0.66 * size, 0.06 * size, 0.06],
    [x, y + 0.2 * size, z + 0.05],
  );
  builder.sphere(
    "matte",
    sandstone,
    0.09 * size,
    [x, y - 0.02 * size, z + 0.06],
    [0.8, 1.4, 0.8],
    8,
  );
  builder.box(
    "matte",
    sandstoneDark,
    [0.36 * size, 0.05 * size, 0.05],
    [x, y - 0.25 * size, z + 0.06],
  );
  builder.box(
    "matte",
    sandstone,
    [0.5 * size, 0.06 * size, 0.04],
    [x, y - 0.3 * size, z + 0.055],
    [0, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      sandstoneDark,
      [0.18 * size, 0.07 * size, 0.04],
      [x + side * 0.17 * size, y + 0.09 * size, z + 0.06],
    );
    builder.box(
      "matte",
      sandstone,
      [0.08 * size, 0.42 * size, 0.06],
      [x + side * 0.44 * size, y, z + 0.02],
    );
  });
  builder.lathe(
    "matte",
    sandstoneLight,
    [
      [0.38 * size, 0],
      [0.3 * size, 0.18 * size],
      [0.12 * size, 0.38 * size],
      [0, 0.45 * size],
    ],
    [x, y + 0.47 * size, z - 0.1],
    "y",
    10,
  );
};

/* -------------------------------------------------------------- */
/* The temple                                                      */
/* -------------------------------------------------------------- */

const buildTemple = (builder: AttractionBuilder) => {
  terraces.forEach(({ half, top }, index) => {
    const colour = index % 2 === 0 ? sandstone : shade(sandstone, 0.94);
    builder.box(
      "matte",
      colour,
      [half * 2, top, half * 2],
      [0, top / 2, templeZ],
    );
    /* A carved cornice round each terrace's lip */
    builder.box(
      "matte",
      sandstoneLight,
      [half * 2 + 0.08, 0.06, half * 2 + 0.08],
      [0, top - 0.03, templeZ],
    );
    if (builder.isFar) {
      return;
    }
    /* Moss creeping over the corners */
    [-1, 1].forEach((sideX) => {
      [-1, 1].forEach((sideZ) => {
        builder.sphere(
          "matte",
          index % 2 === 0 ? moss : mossDark,
          0.32,
          [sideX * (half - 0.15), top - 0.06, templeZ + sideZ * (half - 0.15)],
          [1.2, 0.25, 1.2],
          8,
        );
      });
    });
    /* Little lotus-topped stupas on the corners of the middle terraces */
    if (index === 1 || index === 2) {
      [-1, 1].forEach((side) => {
        const at: Triple = [side * (half - 0.25), top, templeZ - (half - 0.25)];
        builder.lathe(
          "matte",
          sandstoneLight,
          [
            [0.2, 0],
            [0.2, 0.25],
            [0.14, 0.3],
            [0.17, 0.5],
            [0.06, 0.75],
            [0, 0.85],
          ],
          at,
          "y",
          10,
        );
      });
    }
    /* Panels of carved dancers along the front of the bottom terrace */
    if (index === 0) {
      for (let panel = -3; panel <= 3; panel++) {
        if (Math.abs(panel) < 1) {
          continue;
        }
        builder.box(
          "matte",
          sandstoneDark,
          [0.55, 0.16, 0.03],
          [panel * 0.9, 0.15, templeZ + half + 0.015],
        );
        builder.sphere(
          "matte",
          sandstoneLight,
          0.05,
          [panel * 0.9, 0.17, templeZ + half + 0.03],
          [1, 1, 0.4],
          5,
        );
      }
    }
  });
  /* The great stair up the front, with snake balustrades */
  const stairFront = templeZ + terraces[0].half;
  const stairBack = templeZ + terraces[3].half;
  const steps = builder.isFar ? 4 : 8;
  for (let step = 0; step < steps; step++) {
    const top = ((step + 1) / steps) * shrineTop;
    const z = stairFront - ((step + 0.5) / steps) * (stairFront - stairBack);
    builder.box(
      "matte",
      step % 2 === 0 ? sandstoneLight : sandstone,
      [1.5, 0.06, (stairFront - stairBack) / steps + 0.02],
      [0, top - 0.03, z],
    );
  }
  [-1, 1].forEach((side) => {
    const x = side * 0.85;
    builder.bar(
      "matte",
      sandstoneDark,
      [x, 0.35, stairFront + 0.35],
      [x, shrineTop + 0.3, stairBack],
      0.2,
      builder.isFar ? 5 : 10,
    );
    if (builder.isFar) {
      return;
    }
    /* The naga's head rears up at the foot, its hood fanned out */
    builder.bar(
      "matte",
      sandstoneDark,
      [x, 0.0, stairFront + 0.5],
      [x, 0.4, stairFront + 0.4],
      0.2,
      8,
    );
    for (let hood = -2; hood <= 2; hood++) {
      builder.sphere(
        "matte",
        sandstone,
        0.11,
        [x + hood * 0.09, 0.62 - Math.abs(hood) * 0.07, stairFront + 0.48],
        [1, 1.2, 0.7],
        7,
      );
    }
    builder.sphere(
      "paint",
      shadow,
      0.025,
      [x - 0.05, 0.62, stairFront + 0.56],
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "paint",
      shadow,
      0.025,
      [x + 0.05, 0.62, stairFront + 0.56],
      [1, 1, 1],
      4,
    );
  });
};

const buildShrine = (builder: AttractionBuilder) => {
  const z = templeZ;
  const height = 1.9;
  const half = shrineHalf;
  /* Back and side walls, and the front either side of the door */
  builder.box(
    "matte",
    laterite,
    [half * 2, height, shrineWall],
    [0, shrineTop + height / 2, z - half + shrineWall / 2],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      laterite,
      [shrineWall, height, half * 2],
      [side * (half - shrineWall / 2), shrineTop + height / 2, z],
    );
    builder.box(
      "matte",
      sandstone,
      [half - doorHalf, height, shrineWall],
      [
        side * (doorHalf + (half - doorHalf) / 2),
        shrineTop + height / 2,
        z + half - shrineWall / 2,
      ],
    );
  });
  /* Lintel over the door and the tiers of the tower above */
  builder.box(
    "matte",
    sandstoneLight,
    [half * 2 + 0.1, 0.3, half * 2 + 0.1],
    [0, shrineTop + height + 0.15, z],
  );
  builder.lathe(
    "matte",
    sandstone,
    [
      [half * 0.95, 0],
      [half * 0.95, 0.3],
      [half * 0.8, 0.32],
      [half * 0.78, 0.65],
      [half * 0.6, 0.68],
      [half * 0.56, 1.0],
      [half * 0.4, 1.04],
      [half * 0.34, 1.35],
      [half * 0.16, 1.6],
      [0.04, 1.9],
      [0, 1.95],
    ],
    [0, shrineTop + height + 0.3, z],
    "y",
    builder.isFar ? 4 : 8,
  );
  builder.box(
    "paint",
    shadow,
    [doorHalf * 2 - 0.1, 0.02, half * 2 - 0.5],
    [0, shrineTop + 0.02, z],
  );
  if (builder.isFar) {
    return;
  }
  /* A stone face looks out from every side of the tower */
  addStoneFace(builder, [0, shrineTop + height + 0.85, z + half * 0.82], 0.75);
  addStoneFace(builder, [half * 0.82, shrineTop + height + 0.85, z], 0.75);
  addStoneFace(builder, [-half * 0.82, shrineTop + height + 0.85, z], 0.75);
  /* Carved door pillars */
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", sandstoneLight, {
      radius: 0.07,
      length: height - 0.2,
      at: [
        side * (doorHalf + 0.04),
        shrineTop + (height - 0.2) / 2,
        z + half + 0.02,
      ],
      segments: 8,
    });
  });
  /* A little offering stone inside, with a candle-flower */
  builder.box(
    "matte",
    sandstoneLight,
    [0.4, 0.4, 0.3],
    [0, shrineTop + 0.2, z - half + 0.4],
  );
  builder.sphere(
    "paint",
    lotusPink,
    0.08,
    [0, shrineTop + 0.46, z - half + 0.4],
    [1, 0.8, 1],
    8,
  );
  /* Roots from the fig creeping over the back of the tower */
  addRoot(
    builder,
    [0.3, shrineTop + height + 1.6, z - 0.4],
    [0.9, shrineTop, z - half - 0.15],
    [0.3, 0, -0.3],
    0.14,
  );
  addRoot(
    builder,
    [-0.2, shrineTop + height + 1.3, z - 0.5],
    [-0.95, shrineTop, z - half - 0.1],
    [-0.2, 0, -0.35],
    0.12,
  );
};

/* -------------------------------------------------------------- */
/* The gateway and its fig                                         */
/* -------------------------------------------------------------- */

const figTop = pylonHeight + 0.6;

const buildGateway = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    const x = side * pylonX;
    builder.box(
      "matte",
      sandstone,
      [pylonHalf * 2, pylonHeight, pylonHalf * 2],
      [x, pylonHeight / 2, gateZ],
    );
    builder.box(
      "matte",
      sandstoneLight,
      [pylonHalf * 2 + 0.12, 0.12, pylonHalf * 2 + 0.12],
      [x, 0.06, gateZ],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        sandstoneDark,
        [pylonHalf * 1.4, 1.1, 0.03],
        [x, 1.1, gateZ + pylonHalf + 0.01],
      );
      builder.sphere(
        "matte",
        sandstoneLight,
        0.16,
        [x, 1.25, gateZ + pylonHalf + 0.04],
        [1, 1.3, 0.35],
        8,
      );
    }
  });
  /* The lintel, and a gopura tower on it */
  builder.box(
    "matte",
    sandstoneLight,
    [pylonX * 2 + pylonHalf * 2 + 0.2, 0.45, pylonHalf * 2 + 0.2],
    [0, pylonHeight + 0.22, gateZ],
  );
  builder.lathe(
    "matte",
    sandstone,
    [
      [0.7, 0],
      [0.62, 0.3],
      [0.5, 0.34],
      [0.42, 0.7],
      [0.2, 1.1],
      [0, 1.25],
    ],
    [0, pylonHeight + 0.45, gateZ],
    "y",
    builder.isFar ? 4 : 8,
  );
  if (!builder.isFar) {
    addStoneFace(builder, [0, pylonHeight + 0.9, gateZ + 0.62], 0.6);
  }
  /* Crumbling walls either side, with gaps where the stones fell */
  [-1, 1].forEach((side) => {
    (
      [
        [1.85, 3.6, wallHeight],
        [4.8, 6.4, wallHeight * 0.75],
      ] as const
    ).forEach(([from, to, height]) => {
      const middle = (side * (from + to)) / 2;
      builder.box(
        "matte",
        sandstone,
        [to - from, height, 0.5],
        [middle, height / 2, gateZ],
      );
      builder.box(
        "matte",
        sandstoneLight,
        [to - from + 0.08, 0.1, 0.58],
        [middle, height, gateZ],
      );
      if (!builder.isFar) {
        /* Courses of stone picked out on the wall's face */
        [0.35, 0.7, 1.05].forEach((up) => {
          if (up < height - 0.1) {
            builder.box(
              "matte",
              sandstoneDark,
              [to - from - 0.04, 0.03, 0.52],
              [middle, up, gateZ],
            );
          }
        });
        builder.sphere(
          "matte",
          moss,
          0.4,
          [middle + side * 0.3, height, gateZ],
          [1.4, 0.3, 0.9],
          8,
        );
      }
    });
    /* Fallen blocks in the gap */
    if (!builder.isFar) {
      addBlock(builder, [0.5, 0.28, 0.4], [side * 4.2, 0.14, gateZ + 0.5], 0.4);
      addBlock(
        builder,
        [0.4, 0.24, 0.45],
        [side * 4.25, 0.12, gateZ - 0.4],
        -0.3,
      );
    }
  });
};

const buildGateFig = (builder: AttractionBuilder) => {
  /* The fig's knotted trunk, sitting on the gateway's roof */
  builder.lathe(
    "matte",
    figBark,
    [
      [1.1, 0],
      [0.8, 0.4],
      [0.55, 1.2],
      [0.5, 2.6],
      [0.3, 3.6],
      [0, 3.8],
    ],
    [1.0, figTop - 0.2, gateZ - 0.3],
    "y",
    builder.isFar ? 6 : 12,
  );
  addLeafClump(builder, [1.0, figTop + 4.2, gateZ - 0.3], 2.5, leafMid);
  addLeafClump(builder, [-1.4, figTop + 3.4, gateZ - 0.6], 1.9, leafDeep);
  addLeafClump(builder, [3.2, figTop + 3.0, gateZ - 0.9], 1.7, leafDeep);
  /* Roots pouring over the pylons to the ground, like melted candle wax */
  const roots: [Triple, Triple, Triple, number][] = [
    [[0.6, figTop, gateZ + 0.2], [1.0, 0, gateZ + 0.62], [0, 0.2, 0.35], 0.22],
    [[1.2, figTop, gateZ + 0.3], [1.65, 0, gateZ + 0.6], [0.2, 0, 0.35], 0.2],
    [[1.6, figTop, gateZ], [2.05, 0, gateZ + 0.1], [0.5, 0, 0], 0.24],
    [[1.4, figTop, gateZ - 0.5], [1.8, 0, gateZ - 0.62], [0.3, 0, -0.3], 0.2],
    [[0.7, figTop, gateZ - 0.5], [0.95, 0, gateZ - 0.62], [0, 0, -0.35], 0.18],
    [
      [0.3, figTop, gateZ - 0.2],
      [-1.05, 0, gateZ - 0.62],
      [-0.2, 0.3, -0.35],
      0.16,
    ],
    [
      [0.2, figTop, gateZ + 0.2],
      [-1.75, 0, gateZ + 0.6],
      [-0.3, 0.2, 0.4],
      0.17,
    ],
    [[1.9, figTop + 0.2, gateZ], [3.3, 0, gateZ - 0.3], [0.4, 0.4, 0], 0.18],
  ];
  roots.forEach(([from, to, bulge, thickness]) => {
    addRoot(builder, from, to, bulge, thickness, 5);
  });
  if (builder.isFar) {
    return;
  }
  /* Boughs and the trunk's buttresses spilling over the lintel */
  builder.bar(
    "matte",
    figBark,
    [1.0, figTop + 2.2, gateZ - 0.3],
    [-1.2, figTop + 3.0, gateZ - 0.5],
    0.3,
    8,
  );
  builder.bar(
    "matte",
    figBark,
    [1.0, figTop + 2.0, gateZ - 0.3],
    [3.0, figTop + 2.6, gateZ - 0.8],
    0.28,
    8,
  );
  builder.bar(
    "matte",
    figBark,
    [1.0, figTop + 2.6, gateZ - 0.3],
    [0.2, figTop + 2.9, gateZ - 2.6],
    0.24,
    8,
  );
  addLeafClump(builder, [0.2, figTop + 3.2, gateZ - 2.8], 1.6, leafBright);
  addLeafClump(builder, [2.2, figTop + 4.4, gateZ + 0.6], 1.4, leafBright);
  addLeafClump(builder, [-0.6, figTop + 4.6, gateZ + 0.5], 1.3, leafMid);
  /* Ripe figs among the leaves, a feast for birds and bats */
  for (let fig = 0; fig < 10; fig++) {
    const angle = fig * 2.1;
    builder.sphere(
      "paint",
      fig % 2 === 0 ? "#b23a4f" : "#d9813a",
      0.07,
      [
        1.0 + Math.sin(angle) * 1.9,
        figTop + 3.0 + (fig % 3) * 0.3,
        gateZ - 0.3 + Math.cos(angle) * 1.9,
      ],
      [1, 1.1, 1],
      6,
    );
  }
};

/** A strangler fig that has outlived its host tree: a hollow lattice of roots. */
const hollowAt = { x: -5.4, z: -4.6 };

const buildHollowFig = (builder: AttractionBuilder) => {
  const { x, z } = hollowAt;
  const strands = builder.isFar ? 5 : 9;
  for (let strand = 0; strand < strands; strand++) {
    const angle = (strand / strands) * Math.PI * 2;
    const twist = 0.9;
    const pieces = builder.isFar ? 2 : 5;
    let before: Triple = [
      x + Math.sin(angle) * 1.1,
      0,
      z + Math.cos(angle) * 1.1,
    ];
    for (let piece = 1; piece <= pieces; piece++) {
      const share = piece / pieces;
      const turn = angle + twist * share * (strand % 2 === 0 ? 1 : -1);
      const radius = 1.1 - share * 0.55;
      const point: Triple = [
        x + Math.sin(turn) * radius,
        share * 4.6,
        z + Math.cos(turn) * radius,
      ];
      builder.bar(
        "matte",
        strand % 2 === 0 ? figBark : figBarkDark,
        before,
        point,
        0.2,
        builder.isFar ? 4 : 6,
      );
      before = point;
    }
  }
  addLeafClump(builder, [x, 5.6, z], 2.2, leafDeep);
  if (builder.isFar) {
    return;
  }
  addLeafClump(builder, [x + 1.4, 4.9, z + 0.8], 1.4, leafMid);
  addLeafClump(builder, [x - 0.9, 5.0, z + 1.2], 1.2, leafBright);
  /* Rings where the roots have grown together */
  [1.3, 2.7].forEach((height) => {
    builder.torus(
      "matte",
      figBarkDark,
      1.1 - (height / 4.6) * 0.55,
      0.09,
      [x, height, z],
      "y",
      14,
    );
  });
  builder.cylinder("paint", shadow, {
    radius: 0.5,
    length: 0.02,
    at: [x, 0.02, z],
    segments: 10,
  });
};

/* -------------------------------------------------------------- */
/* The courtyard                                                    */
/* -------------------------------------------------------------- */

const buildCourtyard = (builder: AttractionBuilder) => {
  builder.cylinder("matte", floor, {
    radius: 9.6,
    length: 0.03,
    at: [0, 0.015, 0],
    segments: builder.segments(36, 14),
  });
  /* A causeway of flagstones from the gate to the stair */
  const from = gateZ + 2.6;
  const to = templeZ + terraces[0].half;
  const rows = builder.isFar ? 2 : 9;
  for (let row = 0; row < rows; row++) {
    const z = from - ((row + 0.5) / rows) * (from - to);
    [-0.55, 0.55].forEach((x, index) => {
      builder.box(
        "matte",
        (row + index) % 3 === 0 ? sandstoneLight : sandstone,
        [builder.isFar ? 2.2 : 1.04, 0.05, (from - to) / rows - 0.06],
        [builder.isFar ? 0 : x, 0.045, z],
        [0, ((row * 7 + index) % 5) * 0.012 - 0.024, 0],
      );
      if (builder.isFar) {
        return;
      }
    });
  }
  /* The lotus pond */
  builder.box(
    "matte",
    sandstoneLight,
    [2.8, 0.18, 2.0],
    [pondAt.x, 0.09, pondAt.z],
  );
  builder.box("water", pondWater, [2.5, 0.06, 1.7], [pondAt.x, 0.17, pondAt.z]);
  if (builder.isFar) {
    return;
  }
  [
    [-0.7, 0.3],
    [0.4, -0.4],
    [0.8, 0.45],
    [-0.2, -0.5],
  ].forEach(([dx, dz], index) => {
    builder.cylinder("paint", leafBright, {
      radius: 0.22,
      length: 0.02,
      at: [pondAt.x + dx, 0.21, pondAt.z + dz],
      segments: 10,
    });
    if (index % 2 === 0) {
      for (let petal = 0; petal < 6; petal++) {
        const angle = (petal / 6) * Math.PI * 2;
        builder.sphere(
          "paint",
          lotusPink,
          0.06,
          [
            pondAt.x + dx + Math.sin(angle) * 0.06,
            0.28,
            pondAt.z + dz + Math.cos(angle) * 0.06,
          ],
          [0.7, 1.3, 0.7],
          5,
        );
      }
      builder.sphere(
        "paint",
        "#f6d34a",
        0.04,
        [pondAt.x + dx, 0.29, pondAt.z + dz],
        [1, 0.6, 1],
        5,
      );
    }
  });
  /* Toppled columns and a great stone head in the grass */
  builder.cylinder("matte", sandstone, {
    radius: 0.24,
    length: 1.8,
    at: [3.6, 0.24, 1.4],
    axis: "x",
    segments: 10,
  });
  builder.cylinder("matte", sandstoneLight, {
    radius: 0.28,
    length: 0.18,
    at: [4.6, 0.28, 1.4],
    axis: "x",
    segments: 10,
  });
  builder.cylinder("matte", sandstone, {
    radius: 0.24,
    length: 0.9,
    at: [2.9, 0.45, 2.5],
    segments: 10,
  });
  builder.cylinder("matte", sandstoneLight, {
    radius: 0.3,
    length: 0.14,
    at: [2.9, 0.07, 2.5],
    segments: 10,
  });
  addStoneFace(builder, [5.4, 0.32, -0.1], 0.9);
  builder.sphere("matte", moss, 0.3, [5.4, 0.78, -0.2], [1.3, 0.4, 1], 8);
  addBlock(builder, [0.6, 0.3, 0.45], [-2.4, 0.15, 3.2], 0.5);
  addBlock(builder, [0.5, 0.26, 0.5], [6.6, 0.13, 2.8], -0.2, laterite);
  addBlock(builder, [0.7, 0.3, 0.4], [-6.8, 0.15, 0.6], 0.9, laterite);
  /* Ferns pushing up between the stones */
  [
    [-1.6, 6.3],
    [1.8, 6.6],
    [-6.6, 3.2],
    [6.9, -2.0],
    [-3.6, -6.8],
    [3.2, -6.9],
    [-7.6, -1.6],
  ].forEach(([x, z]) => {
    for (let frond = 0; frond < 6; frond++) {
      const angle = frond * 1.05 + x;
      builder.box(
        "matte",
        frond % 2 === 0 ? leafMid : leafBright,
        [0.16, 0.02, 0.6],
        [x + Math.sin(angle) * 0.25, 0.2, z + Math.cos(angle) * 0.25],
        [-0.55, angle, 0],
      );
    }
  });
};

const buildKiosk = (builder: AttractionBuilder, { x, z }: LocalPoint) => {
  /* Four pillars, a stone roof, and steps down into the dark */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "matte",
        sandstone,
        [0.24, 1.9, 0.24],
        [x + sideX * 0.75, 0.95, z + sideZ * 0.75],
      );
    });
  });
  builder.box("matte", sandstoneLight, [1.9, 0.18, 1.9], [x, 1.99, z]);
  builder.lathe(
    "matte",
    laterite,
    [
      [1.0, 0],
      [0.7, 0.4],
      [0.3, 0.7],
      [0, 0.8],
    ],
    [x, 2.08, z],
    "y",
    4,
  );
  builder.box("paint", shadow, [1.0, 0.03, 1.0], [x, 0.03, z]);
  if (builder.isFar) {
    return;
  }
  for (let step = 0; step < 4; step++) {
    builder.box(
      "matte",
      sandstoneDark,
      [0.95, 0.03, 0.2],
      [x, 0.05 - step * 0.012, z + 0.4 - step * 0.22],
    );
  }
  builder.lathe(
    "matte",
    sandstoneLight,
    [
      [0.12, 0],
      [0.08, 0.2],
      [0, 0.3],
    ],
    [x, 2.88, z],
    "y",
    8,
  );
};

/* -------------------------------------------------------------- */
/* Moving parts                                                     */
/* -------------------------------------------------------------- */

const eyesAt: Triple = [
  0,
  shrineTop + 1.9 + 0.85 + 0.07,
  templeZ + shrineHalf * 0.82 + 0.07,
];

const buildEyes = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glow",
      eyeGlow,
      0.06,
      [side * 0.13, 0, 0],
      [1.6, 0.8, 0.5],
      8,
    );
  });
  builder.sphere("glow", eyeGlow, 0.04, [0, 0.22, 0], [1, 1, 0.5], 6);
};

const macaqueAt: Triple = [-3.0, 0.75, gateZ - 0.35];

const buildMacaque = (builder: AttractionBuilder) => {
  builder.sphere("matte", macaqueFur, 0.2, [0, 0.4, 0], [1, 1.1, 0.85], 10);
  builder.sphere(
    "matte",
    macaqueFur,
    0.15,
    [0, 0.7, 0.04],
    [1, 0.95, 0.95],
    10,
  );
  builder.sphere("matte", macaqueFace, 0.1, [0, 0.68, 0.13], [1, 0.9, 0.55], 8);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.018,
      [side * 0.04, 0.71, 0.21],
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "matte",
      macaqueFace,
      0.04,
      [side * 0.15, 0.71, 0.02],
      [0.5, 1, 1],
      6,
    );
    /* Paws on the top of the wall */
    builder.bar(
      "matte",
      macaqueFur,
      [side * 0.14, 0.45, 0.05],
      [side * 0.2, 0.62, 0.35],
      0.07,
      5,
    );
    builder.sphere(
      "matte",
      shade(macaqueFur, 0.8),
      0.05,
      [side * 0.2, 0.62, 0.36],
      [1, 0.6, 1.2],
      5,
    );
  });
  builder.sphere(
    "matte",
    shade(macaqueFur, 1.15),
    0.06,
    [0, 0.82, 0],
    [1.6, 0.6, 1],
    6,
  );
};

const hornbillAt: Triple = [2.4, figTop + 1.2, gateZ + 0.15];

const buildHornbill = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    palette.black,
    0.17,
    [0, 0.2, 0],
    [0.9, 1.1, 1.3],
    10,
  );
  builder.sphere(
    "paint",
    palette.white,
    0.1,
    [0, 0.12, 0.1],
    [0.9, 0.7, 0.8],
    8,
  );
  builder.sphere("paint", palette.black, 0.11, [0, 0.4, 0.14], [1, 1, 1], 10);
  builder.cylinder("paint", hornbillBeak, {
    radius: 0.06,
    radiusEnd: 0.012,
    length: 0.34,
    at: [0, 0.36, 0.36],
    axis: "z",
    segments: 8,
  });
  builder.box("paint", "#e8582a", [0.05, 0.08, 0.2], [0, 0.46, 0.26]);
  builder.box(
    "paint",
    palette.white,
    [0.12, 0.03, 0.34],
    [0, 0.14, -0.26],
    [0.3, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#f3e7a6",
      0.022,
      [side * 0.08, 0.43, 0.2],
      [1, 1, 1],
      5,
    );
  });
};

const aerialRootsAt: Triple = [-0.6, figTop + 2.9, gateZ - 1.6];

const buildAerialRoots = (builder: AttractionBuilder) => {
  for (let root = 0; root < 7; root++) {
    const x = (root - 3) * 0.22;
    const drop = 2.4 + (root % 3) * 0.35;
    builder.bar(
      "matte",
      figBarkDark,
      [x, 0, (root % 2) * 0.15],
      [x + 0.05, -drop, (root % 2) * 0.15],
      0.035,
      4,
    );
    builder.sphere(
      "matte",
      figBark,
      0.04,
      [x + 0.05, -drop, (root % 2) * 0.15],
      [1, 1.5, 1],
      4,
    );
  }
};

const buildLizard = (builder: AttractionBuilder) => {
  builder.sphere("matte", lizardGreen, 0.07, [0, 0.05, 0], [0.8, 0.5, 2], 8);
  builder.sphere(
    "matte",
    lizardGreen,
    0.05,
    [0, 0.06, 0.16],
    [0.9, 0.6, 1.3],
    6,
  );
  builder.cylinder("matte", shade(lizardGreen, 0.85), {
    radius: 0.03,
    radiusEnd: 0.005,
    length: 0.35,
    at: [0, 0.04, -0.3],
    axis: "z",
    segments: 5,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(lizardGreen, 0.85),
      [0.14, 0.02, 0.03],
      [side * 0.07, 0.02, 0.07],
    );
    builder.box(
      "matte",
      shade(lizardGreen, 0.85),
      [0.14, 0.02, 0.03],
      [side * 0.07, 0.02, -0.07],
    );
  });
};

/* -------------------------------------------------------------- */
/* The secret passage                                               */
/* -------------------------------------------------------------- */

const passageDepth = 1.7;

const secretPassage = (progress: number): LocalSpot => {
  const [west, east] = kiosks;
  if (progress < 0.15) {
    const share = progress / 0.15;
    return {
      x: passageStart.x,
      y: 0,
      z: passageStart.z + (west.z + 0.3 - passageStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.3) {
    const share = (progress - 0.15) / 0.15;
    return {
      x: west.x,
      y: -passageDepth * share,
      z: west.z + 0.3 - share * 0.6,
      heading: Math.PI,
    };
  }
  if (progress < 0.7) {
    const share = (progress - 0.3) / 0.4;
    return {
      x: west.x + (east.x - west.x) * share,
      y: -passageDepth - 0.3 * Math.sin(share * Math.PI),
      z: west.z - 0.3,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.85) {
    const share = (progress - 0.7) / 0.15;
    return {
      x: east.x,
      y: -passageDepth * (1 - share),
      z: east.z - 0.3 + share * 0.6,
      heading: 0,
    };
  }
  const share = (progress - 0.85) / 0.15;
  return {
    x: east.x,
    y: 0,
    z: east.z + 0.3 + (passageFinish.z - east.z - 0.3) * share,
    heading: 0,
  };
};

/** The terraces, each 0.3 higher, so the Character climbs them like stairs. */
const templeDeck: Deck = ({ x, z }) => {
  const reach = Math.max(Math.abs(x), Math.abs(z - templeZ));
  const found = [...terraces].reverse().find(({ half }) => reach <= half);
  return found === undefined ? undefined : { height: found.top, kind: "trail" };
};

export const stranglerFigRuinsModel: NewLandAttractionModel = {
  kind: "strangler-fig-ruins",
  islandId: "jungle-reach",
  name: "Strangler Fig Ruins",
  fact: "A strangler fig starts life as a tiny seed, dropped high in a tree by a bird or a bat that has eaten its fruit. Its roots grow all the way down to the ground and wrap round and round, until the fig can stand on its own. Here, its roots have grabbed hold of old stone ruins instead!",
  curriculumLink:
    "Science, Year 3: plants. Explore the part that flowers play in the life cycle of flowering plants, including seed formation and seed dispersal (fig seeds spread by birds and bats).",
  footprint: 10,
  setting: "inland",
  signSpot: signAt,
  padColour: "#56803a",
  build: (builder) => {
    buildCourtyard(builder);
    buildTemple(builder);
    buildShrine(builder);
    buildGateway(builder);
    buildGateFig(builder);
    buildHollowFig(builder);
    kiosks.forEach((kiosk) => {
      buildKiosk(builder, kiosk);
    });
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "stone face's eyes",
      pivot: eyesAt,
      build: buildEyes,
      motion: { kind: "wake", reach: 5.5 },
    },
    {
      name: "macaque",
      pivot: macaqueAt,
      build: buildMacaque,
      motion: { kind: "rise", reach: 5, height: 0.55, period: 1.6 },
    },
    {
      name: "hornbill",
      pivot: hornbillAt,
      build: buildHornbill,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.4, period: 1.1 },
    },
    {
      name: "aerial roots",
      pivot: aerialRootsAt,
      build: buildAerialRoots,
      motion: { kind: "swing", axis: "z", amplitude: 0.08, period: 4.2 },
    },
  ],
  wanderers: [
    {
      name: "lizards",
      build: buildLizard,
      count: 3,
      centre: { x: 0, z: 2.6 },
      radius: 2.6,
      speed: 0.5,
    },
  ],
  decks: [templeDeck],
  rides: [
    {
      id: "secret-passage",
      name: "the secret passage",
      start: passageStart,
      reach: 0.6,
      seconds: 12,
      finish: passageFinish,
      follow: secretPassage,
    },
  ],
  blockers: [
    { x: hollowAt.x, z: hollowAt.z, radius: 1.2 },
    { x: -pylonX, z: gateZ, radius: 0.6 },
    { x: pylonX, z: gateZ, radius: 0.6 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Find the secret passage",
    news: "Creak! You crept through the secret passage under the old temple, where a strangler fig's roots have wrapped right round the stones.",
  },
};
