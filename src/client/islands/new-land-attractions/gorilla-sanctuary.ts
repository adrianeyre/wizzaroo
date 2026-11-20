import {
  addBench,
  addGableRoof,
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const fur = "#2e2b2a";
const furLight = "#4a4644";
const silver = "#9a9894";
const skin = "#1c1a1a";
const log = "#7a5434";
const logDark = "#5a3d26";
const plank = "#a8774a";
const rope = "#cdb68a";
const thatch = "#b38c4c";
const grassDeep = "#4f8a34";
const grassLight = "#6aa846";
const mud = "#7a5a3a";
const rock = "#8a857a";
const rockDark = "#6a665d";
const wallStone = "#a59d8f";
const glass = "#9ccbd6";
const moat = "#5f8f86";
const leafDeep = "#1f6428";
const leafMid = "#2f8a35";
const leafBright = "#5bb544";
const bananaYellow = "#f3d23a";
const slideRed = "#d8452f";
const signColour = "#3f6a2c";

/* The enclosure: a wide oval behind a wall topped with glass */
const enclosure = { x: 0, z: 1.0, halfX: 5.4, halfZ: 6.0 };
const wallZ = 1.1;
const wallTop = 0.55;
const glassTop = 1.6;

/* The viewing deck in front of the wall, a step up */
const deck = { minX: -3.6, maxX: 3.6, minZ: 1.3, maxZ: 2.8 };
const deckTop = 0.3;

/* The lookout tower, with a ladder up and a slide down */
const towerAt = { x: 5.9, z: 3.7 };
const towerHalf = 0.7;
const towerTop = 3.0;
const slideFrom: Triple = [towerAt.x + 0.35, towerTop, towerAt.z + towerHalf];
const slideTo: Triple = [towerAt.x + 0.9, 0.22, towerAt.z + 4.0];
const lookoutStart = { x: towerAt.x - 0.2, z: towerAt.z + 1.6 };
const lookoutFinish = { x: slideTo[0] + 0.2, z: slideTo[2] + 0.9 };

/* The gorillas' climbing frame, with a swing for the baby */
const frameAt = { x: -2.3, z: -2.6 };
const frameTop = 2.6;
const swingPivot: Triple = [frameAt.x + 1.6, frameTop - 0.05, frameAt.z + 0.6];
const swingMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.35,
  period: 3.0,
};

const silverbackAt: Triple = [1.7, 0.55, -1.0];
const juvenileAt: Triple = [-3.4, -0.3, -0.2];
const hutAt = { x: -6.4, z: 4.2 };
const signAt = { x: -1.6, z: 9.6 };

/* -------------------------------------------------------------- */
/* Gorillas                                                         */
/* -------------------------------------------------------------- */

/**
 * A gorilla sitting up, facing +z, its feet at `at`. A silverback has a
 * silver saddle across his back and a tall crested head.
 */
const addGorilla = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  isSilverback: boolean,
) => {
  const [x, y, z] = at;
  const s = size;
  const segments = builder.isFar ? 6 : 10;
  /* Body, belly and the silver back */
  builder.sphere(
    "matte",
    fur,
    0.42 * s,
    [x, y + 0.55 * s, z],
    [1.05, 1.15, 0.9],
    segments,
  );
  builder.sphere(
    "matte",
    furLight,
    0.28 * s,
    [x, y + 0.5 * s, z + 0.22 * s],
    [1, 1.1, 0.6],
    segments,
  );
  if (isSilverback) {
    builder.sphere(
      "matte",
      silver,
      0.36 * s,
      [x, y + 0.62 * s, z - 0.14 * s],
      [1.05, 0.9, 0.8],
      segments,
    );
  }
  /* Head, with a crest, a brow and a wide muzzle */
  const head: Triple = [x, y + 1.08 * s, z + 0.1 * s];
  builder.sphere("matte", fur, 0.2 * s, head, [1, 1, 0.95], segments);
  if (isSilverback) {
    builder.sphere(
      "matte",
      fur,
      0.13 * s,
      [head[0], head[1] + 0.15 * s, head[2] - 0.05 * s],
      [0.8, 1.1, 1],
      8,
    );
  }
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    skin,
    0.14 * s,
    [head[0], head[1] - 0.06 * s, head[2] + 0.12 * s],
    [1.15, 0.85, 0.7],
    8,
  );
  builder.box(
    "matte",
    skin,
    [0.3 * s, 0.05 * s, 0.08 * s],
    [head[0], head[1] + 0.07 * s, head[2] + 0.15 * s],
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#5a3a22",
      0.025 * s,
      [head[0] + side * 0.07 * s, head[1] + 0.02 * s, head[2] + 0.18 * s],
      [1, 1, 1],
      5,
    );
    builder.sphere(
      "matte",
      skin,
      0.03 * s,
      [head[0] + side * 0.04 * s, head[1] - 0.06 * s, head[2] + 0.24 * s],
      [1, 0.7, 1],
      4,
    );
    builder.sphere(
      "matte",
      fur,
      0.05 * s,
      [head[0] + side * 0.19 * s, head[1], head[2]],
      [0.5, 1, 1],
      5,
    );
    /* Long strong arms down to the knuckles */
    builder.bar(
      "matte",
      fur,
      [x + side * 0.38 * s, y + 0.82 * s, z + 0.05 * s],
      [x + side * 0.5 * s, y + 0.35 * s, z + 0.25 * s],
      0.2 * s,
      7,
    );
    builder.bar(
      "matte",
      fur,
      [x + side * 0.5 * s, y + 0.35 * s, z + 0.25 * s],
      [x + side * 0.46 * s, y + 0.05 * s, z + 0.38 * s],
      0.16 * s,
      7,
    );
    builder.sphere(
      "matte",
      skin,
      0.08 * s,
      [x + side * 0.46 * s, y + 0.05 * s, z + 0.4 * s],
      [1.1, 0.7, 1.2],
      6,
    );
    /* Legs folded in front */
    builder.sphere(
      "matte",
      fur,
      0.16 * s,
      [x + side * 0.22 * s, y + 0.15 * s, z + 0.3 * s],
      [1, 0.8, 1.4],
      8,
    );
    builder.sphere(
      "matte",
      skin,
      0.07 * s,
      [x + side * 0.22 * s, y + 0.07 * s, z + 0.52 * s],
      [1, 0.6, 1.4],
      5,
    );
  });
};

/** A gorilla knuckle-walking on all fours, facing +z. */
const buildWalkingGorilla = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 6 : 10;
  builder.sphere(
    "matte",
    fur,
    0.36,
    [0, 0.62, -0.05],
    [0.95, 0.85, 1.3],
    segments,
  );
  builder.sphere("matte", fur, 0.17, [0, 0.82, 0.42], [1, 1, 1], segments);
  if (builder.isFar) {
    return;
  }
  builder.sphere("matte", skin, 0.11, [0, 0.77, 0.55], [1.1, 0.85, 0.7], 8);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      fur,
      [side * 0.26, 0.7, 0.25],
      [side * 0.3, 0.05, 0.38],
      0.15,
      6,
    );
    builder.bar(
      "matte",
      fur,
      [side * 0.2, 0.45, -0.35],
      [side * 0.22, 0.05, -0.3],
      0.15,
      6,
    );
    builder.sphere(
      "paint",
      "#5a3a22",
      0.02,
      [side * 0.06, 0.85, 0.57],
      [1, 1, 1],
      4,
    );
  });
};

/* -------------------------------------------------------------- */
/* The enclosure                                                     */
/* -------------------------------------------------------------- */

const onOval = (angle: number, inset = 0): [number, number] => [
  enclosure.x + Math.sin(angle) * (enclosure.halfX - inset),
  enclosure.z - Math.cos(angle) * (enclosure.halfZ - inset),
];

const fenceFrom = -Math.PI / 2;
const fenceTo = Math.PI / 2;

const buildEnclosure = (builder: AttractionBuilder) => {
  /* Grass inside, with a muddy patch and a grassy hill */
  const grassPieces = builder.isFar ? 10 : 24;
  for (let piece = 0; piece < grassPieces; piece++) {
    const angle =
      fenceFrom + ((fenceTo - fenceFrom) * (piece + 0.5)) / grassPieces;
    const [x, z] = onOval(angle, 2.4);
    builder.box(
      "matte",
      piece % 2 === 0 ? grassDeep : shade(grassDeep, 1.08),
      [2.6, 0.03, 2.6],
      [x, 0.025, z],
      [0, angle, 0],
    );
  }
  builder.cylinder("matte", grassDeep, {
    radius: 3.4,
    length: 0.03,
    at: [0, 0.025, -2.0],
    segments: builder.segments(24, 10),
  });
  builder.sphere(
    "matte",
    grassLight,
    2.2,
    [2.2, -1.1, -3.3],
    [1.2, 0.75, 1],
    builder.isFar ? 8 : 16,
  );
  builder.cylinder("matte", mud, {
    radius: 0.9,
    length: 0.02,
    at: [-0.4, 0.045, -0.4],
    segments: 14,
  });
  /* The moat inside the front wall */
  builder.box(
    "water",
    moat,
    [enclosure.halfX * 2 - 0.6, 0.04, 0.7],
    [0, 0.04, wallZ - 0.55],
  );
  /* The front wall, with a long run of glass along the top */
  builder.box(
    "matte",
    wallStone,
    [enclosure.halfX * 2, wallTop, 0.3],
    [0, wallTop / 2, wallZ],
  );
  builder.box(
    "glass",
    glass,
    [enclosure.halfX * 2 - 0.1, glassTop - wallTop, 0.05],
    [0, (wallTop + glassTop) / 2, wallZ],
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [enclosure.halfX * 2, 0.06, 0.1],
    [0, glassTop, wallZ],
  );
  if (!builder.isFar) {
    for (let post = 0; post <= 12; post++) {
      const x =
        -enclosure.halfX + 0.05 + (post / 12) * (enclosure.halfX * 2 - 0.1);
      builder.box(
        "metal",
        palette.darkSteel,
        [0.05, glassTop - wallTop, 0.08],
        [x, (wallTop + glassTop) / 2, wallZ],
      );
    }
    builder.box(
      "matte",
      shade(wallStone, 1.1),
      [enclosure.halfX * 2 + 0.06, 0.06, 0.36],
      [0, wallTop, wallZ],
    );
  }
  /* A tall palisade of logs round the back */
  const posts = builder.isFar ? 14 : 34;
  for (let post = 0; post <= posts; post++) {
    const angle = fenceFrom + ((fenceTo - fenceFrom) * post) / posts;
    const [x, z] = onOval(angle);
    const height = 2.3 + ((post * 7) % 3) * 0.12;
    builder.cylinder("matte", post % 3 === 0 ? logDark : log, {
      radius: builder.isFar ? 0.2 : 0.13,
      length: height,
      at: [x, height / 2, z],
      segments: builder.isFar ? 4 : 6,
    });
    if (!builder.isFar && post < posts) {
      const next = fenceFrom + ((fenceTo - fenceFrom) * (post + 1)) / posts;
      const [nextX, nextZ] = onOval(next);
      [0.6, 1.8].forEach((up) => {
        builder.bar("matte", logDark, [x, up, z], [nextX, up, nextZ], 0.07, 4);
      });
    }
  }
  if (builder.isFar) {
    return;
  }
  /* Boulders and a fallen log for climbing and sitting on */
  (
    [
      [1.7, 0.25, -1.0, 0.6],
      [2.4, 0.2, -0.4, 0.4],
      [-0.6, 0.2, -4.2, 0.55],
      [3.6, 0.15, -1.8, 0.4],
    ] as const
  ).forEach(([x, y, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? rock : rockDark,
      size,
      [x, y, z],
      [1.3, 0.75, 1.1],
      10,
    );
  });
  builder.cylinder("matte", log, {
    radius: 0.25,
    length: 1.8,
    at: [-3.3, 0.25, 0.2],
    axis: "x",
    segments: 10,
  });
  builder.cylinder("matte", "#c49a64", {
    radius: 0.23,
    length: 0.02,
    at: [-2.39, 0.25, 0.2],
    axis: "x",
    segments: 10,
  });
  /* Piles of food: bananas, leafy branches and melons */
  [
    [0.4, -0.2],
    [-1.2, -1.6],
  ].forEach(([x, z]) => {
    for (let banana = 0; banana < 5; banana++) {
      builder.bar(
        "paint",
        bananaYellow,
        [x + banana * 0.06, 0.06, z],
        [x + banana * 0.06 + 0.1, 0.1, z + 0.18],
        0.05,
        5,
      );
    }
    builder.sphere(
      "paint",
      "#4f8a2c",
      0.13,
      [x - 0.25, 0.12, z + 0.1],
      [1, 0.9, 1],
      8,
    );
    builder.bar(
      "matte",
      leafMid,
      [x + 0.3, 0.05, z - 0.2],
      [x + 0.7, 0.1, z - 0.4],
      0.04,
      4,
    );
    builder.sphere(
      "matte",
      leafBright,
      0.16,
      [x + 0.65, 0.12, z - 0.4],
      [1.4, 0.4, 1],
      6,
    );
  });
};

const buildClimbingFrame = (builder: AttractionBuilder) => {
  const { x, z } = frameAt;
  const corners: [number, number][] = [
    [-0.4, -0.4],
    [1.6, -0.4],
    [-0.4, 1.4],
    [1.6, 1.4],
  ];
  corners.forEach(([dx, dz]) => {
    builder.cylinder("matte", log, {
      radius: 0.13,
      length: frameTop + 0.2,
      at: [x + dx, (frameTop + 0.2) / 2, z + dz],
      segments: builder.isFar ? 5 : 8,
    });
  });
  builder.bar(
    "matte",
    logDark,
    [x - 0.5, frameTop, z - 0.4],
    [x + 1.7, frameTop, z - 0.4],
    0.16,
    builder.isFar ? 5 : 8,
  );
  builder.bar(
    "matte",
    logDark,
    [x - 0.5, frameTop, z + 1.4],
    [x + 1.7, frameTop, z + 1.4],
    0.16,
    builder.isFar ? 5 : 8,
  );
  builder.bar(
    "matte",
    logDark,
    [x + 1.6, frameTop, z - 0.5],
    [x + 1.6, frameTop, z + 1.5],
    0.16,
    builder.isFar ? 5 : 8,
  );
  /* A platform halfway up, for sleeping in the sun */
  builder.box("matte", plank, [1.2, 0.1, 1.9], [x + 0.2, 1.5, z + 0.5]);
  if (builder.isFar) {
    return;
  }
  /* A rope net up one side, and hanging ropes */
  for (let strand = 0; strand < 5; strand++) {
    const along = -0.35 + strand * 0.42;
    builder.bar(
      "matte",
      rope,
      [x + along, 0.05, z + 1.9],
      [x + along, 1.5, z + 1.4],
      0.03,
      4,
    );
  }
  [0.4, 0.8, 1.2].forEach((up) => {
    builder.bar(
      "matte",
      rope,
      [x - 0.4, up, z + 1.4 + 0.5 * (1 - up / 1.5)],
      [x + 1.6, up, z + 1.4 + 0.5 * (1 - up / 1.5)],
      0.03,
      4,
    );
  });
  [0.3, 1.0].forEach((dx) => {
    builder.bar(
      "matte",
      rope,
      [x + dx, frameTop, z - 0.4],
      [x + dx, 1.6, z - 0.4],
      0.04,
      4,
    );
    builder.sphere(
      "matte",
      shade(rope, 0.85),
      0.06,
      [x + dx, 1.6, z - 0.4],
      [1, 1, 1],
      5,
    );
  });
  /* Leafy bedding on the platform */
  builder.sphere(
    "matte",
    leafMid,
    0.4,
    [x + 0.1, 1.58, z + 0.4],
    [1.2, 0.25, 1.3],
    8,
  );
};

const buildShelter = (builder: AttractionBuilder) => {
  const at = { x: 3.2, z: -4.2 };
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", log, {
      radius: 0.1,
      length: 1.8,
      at: [at.x + side * 0.9, 0.9, at.z + 0.6],
      segments: 7,
    });
    builder.cylinder("matte", log, {
      radius: 0.1,
      length: 1.2,
      at: [at.x + side * 0.9, 0.6, at.z - 0.6],
      segments: 7,
    });
  });
  builder.box(
    "matte",
    thatch,
    [2.2, 0.14, 1.7],
    [at.x, 1.55, at.z],
    [-0.36, 0, 0],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      shade(thatch, 0.85),
      [2.25, 0.06, 0.12],
      [at.x, 1.85, at.z + 0.8],
      [-0.36, 0, 0],
    );
    builder.sphere(
      "matte",
      "#c9a25a",
      0.5,
      [at.x, 0.1, at.z],
      [1.4, 0.3, 1],
      8,
    );
  }
};

const buildEnclosureTree = (builder: AttractionBuilder) => {
  const at = { x: -0.2, z: -3.4 };
  builder.cylinder("matte", logDark, {
    radius: 0.3,
    radiusEnd: 0.18,
    length: 3.6,
    at: [at.x, 1.8, at.z],
    segments: builder.isFar ? 6 : 10,
  });
  builder.sphere(
    "matte",
    leafDeep,
    1.7,
    [at.x, 4.1, at.z],
    [1.1, 0.7, 1.1],
    builder.isFar ? 8 : 12,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    leafMid,
    1.1,
    [at.x + 1.2, 3.6, at.z + 0.5],
    [1, 0.7, 1],
    10,
  );
  builder.sphere(
    "matte",
    leafBright,
    1.0,
    [at.x - 1.1, 3.7, at.z - 0.3],
    [1, 0.7, 1],
    10,
  );
  [0.6, 2.8, 4.6].forEach((angle) => {
    builder.bar(
      "matte",
      logDark,
      [at.x, 2.6, at.z],
      [at.x + Math.sin(angle) * 1.2, 3.5, at.z + Math.cos(angle) * 1.2],
      0.14,
      6,
    );
  });
};

/* -------------------------------------------------------------- */
/* Outside: the deck, the tower and the keeper's hut                */
/* -------------------------------------------------------------- */

const buildViewingDeck = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = deck;
  const boards = builder.isFar ? 1 : 18;
  for (let board = 0; board < boards; board++) {
    const width = (maxX - minX) / boards;
    builder.box(
      "matte",
      board % 2 === 0 ? plank : shade(plank, 0.92),
      [width - 0.02, deckTop, maxZ - minZ],
      [minX + width * (board + 0.5), deckTop / 2, (minZ + maxZ) / 2],
    );
  }
  /* A thatched shade over the back of the deck */
  [minX + 0.1, 0, maxX - 0.1].forEach((x) => {
    builder.cylinder("matte", log, {
      radius: 0.08,
      length: 2.3,
      at: [x, deckTop + 1.15, maxZ - 0.1],
      segments: builder.isFar ? 4 : 7,
    });
  });
  addGableRoof(builder, {
    width: maxX - minX,
    depth: 1.5,
    rise: 0.45,
    at: [0, deckTop + 2.3, maxZ - 0.55],
    colour: thatch,
    overhang: 0.25,
    thickness: 0.12,
  });
  if (builder.isFar) {
    return;
  }
  addBench(builder, [-2.0, deckTop, maxZ - 0.35], 0, plank);
  addBench(builder, [2.0, deckTop, maxZ - 0.35], 0, plank);
  /* Boards about gorillas: one shows a skull with its big flat teeth */
  [-0.6, 0.6].forEach((x, index) => {
    builder.box(
      "paint",
      palette.cream,
      [0.8, 0.5, 0.04],
      [x, deckTop + 1.6, maxZ - 0.08],
    );
    if (index === 0) {
      builder.sphere(
        "paint",
        palette.white,
        0.13,
        [x, deckTop + 1.62, maxZ - 0.04],
        [1.3, 1, 0.3],
        8,
      );
      for (let tooth = 0; tooth < 5; tooth++) {
        builder.box(
          "paint",
          "#d9d2c0",
          [0.04, 0.05, 0.02],
          [x - 0.1 + tooth * 0.05, deckTop + 1.48, maxZ - 0.04],
        );
      }
    } else {
      builder.sphere(
        "paint",
        fur,
        0.12,
        [x - 0.1, deckTop + 1.6, maxZ - 0.04],
        [1, 1.1, 0.3],
        8,
      );
      builder.sphere(
        "paint",
        leafMid,
        0.1,
        [x + 0.18, deckTop + 1.6, maxZ - 0.04],
        [1.4, 0.8, 0.3],
        6,
      );
    }
  });
};

const buildTower = (builder: AttractionBuilder) => {
  const { x, z } = towerAt;
  [-1, 1].forEach((alongX) => {
    [-1, 1].forEach((alongZ) => {
      builder.cylinder("matte", log, {
        radius: 0.11,
        length: towerTop + 1.4,
        at: [
          x + alongX * towerHalf,
          (towerTop + 1.4) / 2,
          z + alongZ * towerHalf,
        ],
        segments: builder.isFar ? 4 : 8,
      });
    });
  });
  builder.box(
    "matte",
    plank,
    [towerHalf * 2 + 0.2, 0.12, towerHalf * 2 + 0.2],
    [x, towerTop - 0.06, z],
  );
  /* A pointed thatched roof */
  builder.lathe(
    "matte",
    thatch,
    [
      [towerHalf + 0.45, 0],
      [towerHalf + 0.3, 0.15],
      [0.05, 1.1],
      [0, 1.15],
    ],
    [x, towerTop + 1.35, z],
    "y",
    builder.isFar ? 4 : 8,
  );
  /* The slide, curving down from the platform */
  const pieces = builder.isFar ? 2 : 8;
  for (let piece = 0; piece < pieces; piece++) {
    const from = piece / pieces;
    const to = (piece + 1) / pieces;
    const point = (share: number): Triple => {
      const eased = share * share * (3 - 2 * share);
      return [
        slideFrom[0] + (slideTo[0] - slideFrom[0]) * share,
        slideFrom[1] + (slideTo[1] - slideFrom[1]) * eased,
        slideFrom[2] + (slideTo[2] - slideFrom[2]) * share,
      ];
    };
    const [ax, ay, az] = point(from);
    const [bx, by, bz] = point(to);
    const length = Math.hypot(bx - ax, by - ay, bz - az);
    const pitch = Math.atan2(ay - by, Math.hypot(bx - ax, bz - az));
    const turn = Math.atan2(bx - ax, bz - az);
    builder.box(
      "paint",
      slideRed,
      [0.6, 0.05, length + 0.02],
      [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2],
      [pitch, turn, 0],
    );
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        builder.box(
          "paint",
          shade(slideRed, 0.85),
          [0.05, 0.22, length + 0.02],
          [
            (ax + bx) / 2 + side * 0.3 * Math.cos(turn),
            (ay + by) / 2 + 0.1,
            (az + bz) / 2 - side * 0.3 * Math.sin(turn),
          ],
          [pitch, turn, 0],
        );
      });
    }
  }
  /* Legs holding up the slide */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 1.6,
    at: [slideFrom[0] + 0.3, 0.8, slideFrom[2] + 1.5],
    segments: 6,
  });
  if (builder.isFar) {
    return;
  }
  /* Rails round the platform, open at the ladder and the slide */
  (
    [
      [-1, -1, 1, -1],
      [-1, -1, -1, 1],
      [1, -1, 1, 0.3],
    ] as const
  ).forEach(([ax, az, bx, bz]) => {
    builder.bar(
      "matte",
      logDark,
      [x + ax * towerHalf, towerTop + 0.85, z + az * towerHalf],
      [x + bx * towerHalf, towerTop + 0.85, z + bz * towerHalf],
      0.07,
      5,
    );
    builder.bar(
      "matte",
      logDark,
      [x + ax * towerHalf, towerTop + 0.45, z + az * towerHalf],
      [x + bx * towerHalf, towerTop + 0.45, z + bz * towerHalf],
      0.05,
      5,
    );
  });
  /* The ladder, up the front */
  [-0.25, 0.25].forEach((dx) => {
    builder.bar(
      "matte",
      plank,
      [x - 0.2 + dx, 0, z + towerHalf + 0.45],
      [x - 0.2 + dx, towerTop + 0.4, z + towerHalf + 0.05],
      0.06,
      5,
    );
  });
  for (let rung = 1; rung <= 9; rung++) {
    const share = rung / 10;
    builder.cylinder("matte", plank, {
      radius: 0.03,
      length: 0.5,
      at: [x - 0.2, share * towerTop, z + towerHalf + 0.45 - share * 0.4],
      axis: "x",
      segments: 5,
    });
  }
  /* A flag on top, and binoculars on the rail */
  builder.cylinder("metal", palette.steel, {
    radius: 0.02,
    length: 0.8,
    at: [x, towerTop + 2.85, z],
    segments: 5,
  });
  builder.box(
    "paint",
    leafMid,
    [0.4, 0.25, 0.02],
    [x + 0.21, towerTop + 3.1, z],
  );
  builder.cylinder("paint", palette.black, {
    radius: 0.05,
    length: 0.18,
    at: [x - 0.3, towerTop + 0.95, z - towerHalf],
    axis: "z",
    segments: 8,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.05,
    length: 0.18,
    at: [x - 0.18, towerTop + 0.95, z - towerHalf],
    axis: "z",
    segments: 8,
  });
};

const buildKeeperHut = (builder: AttractionBuilder) => {
  const { x, z } = hutAt;
  builder.box("matte", "#c9a878", [2.0, 1.7, 1.6], [x, 0.85, z]);
  addGableRoof(builder, {
    width: 2.0,
    depth: 1.6,
    rise: 0.6,
    at: [x, 1.7, z],
    colour: "#6b4a2e",
    overhang: 0.25,
    thickness: 0.1,
  });
  if (builder.isFar) {
    return;
  }
  builder.box("paint", leafMid, [0.6, 1.1, 0.04], [x + 0.4, 0.55, z + 0.81]);
  builder.box(
    "glass",
    palette.glass,
    [0.5, 0.4, 0.04],
    [x - 0.45, 1.05, z + 0.81],
  );
  builder.box("paint", palette.cream, [0.9, 0.2, 0.03], [x, 1.5, z + 0.82]);
  /* Crates of fruit and veg for the gorillas' dinner */
  [
    [x + 1.35, z + 0.3],
    [x + 1.35, z - 0.4],
  ].forEach(([cx, cz], index) => {
    builder.box("matte", plank, [0.5, 0.3, 0.5], [cx, 0.15, cz]);
    for (let fruit = 0; fruit < 4; fruit++) {
      builder.sphere(
        "paint",
        index === 0 ? bananaYellow : "#e8772a",
        0.08,
        [
          cx - 0.1 + (fruit % 2) * 0.2,
          0.34,
          cz - 0.1 + Math.floor(fruit / 2) * 0.2,
        ],
        [1, 0.8, 1],
        6,
      );
    }
  });
};

const buildPlanting = (builder: AttractionBuilder) => {
  /* A path from the sign to the deck, and bushes along the way */
  builder.box("matte", "#b89a6c", [1.4, 0.03, 6.6], [-1.0, 0.02, 6.1]);
  [
    [-7.6, 0.4, 0.8],
    [7.8, 0.0, 0.7],
    [-4.4, 6.6, 0.6],
    [3.6, 7.6, 0.65],
    [-8.0, 6.4, 0.6],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? leafMid : leafDeep,
      size,
      [x, size * 0.6, z],
      [1.15, 0.85, 1],
      builder.isFar ? 6 : 10,
    );
  });
};

/* -------------------------------------------------------------- */
/* Moving parts                                                    */
/* -------------------------------------------------------------- */

const buildSilverback = (builder: AttractionBuilder) => {
  addGorilla(builder, [0, 0, 0], 1.25, true);
};

const buildJuvenile = (builder: AttractionBuilder) => {
  addGorilla(builder, [0, 0, 0], 0.7, false);
};

const buildBabySwing = (builder: AttractionBuilder) => {
  builder.bar("matte", rope, [0, 0, 0], [0, -1.4, 0], 0.04, 4);
  builder.torus(
    "matte",
    "#26282b",
    0.26,
    0.09,
    [0, -1.5, 0],
    "y",
    builder.isFar ? 8 : 16,
  );
  addGorilla(builder, [0, -1.48, 0], 0.5, false);
};

/* -------------------------------------------------------------- */
/* The ride                                                         */
/* -------------------------------------------------------------- */

const lookoutRide = (progress: number): LocalSpot => {
  const ladderFoot: Triple = [towerAt.x - 0.2, 0, towerAt.z + towerHalf + 0.55];
  const ladderTop: Triple = [
    towerAt.x - 0.2,
    towerTop,
    towerAt.z + towerHalf - 0.2,
  ];
  if (progress < 0.08) {
    const share = progress / 0.08;
    return {
      x: lookoutStart.x + (ladderFoot[0] - lookoutStart.x) * share,
      y: 0,
      z: lookoutStart.z + (ladderFoot[2] - lookoutStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.35) {
    const share = (progress - 0.08) / 0.27;
    return {
      x: ladderFoot[0],
      y: towerTop * share,
      z: ladderFoot[2] + (ladderTop[2] - ladderFoot[2]) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.62) {
    /* A look all round from the top: turn slowly to see the gorillas */
    const share = (progress - 0.35) / 0.27;
    return {
      x: towerAt.x - 0.2 + 0.3 * Math.sin(share * Math.PI),
      y: towerTop,
      z: towerAt.z - 0.2 * Math.sin(share * Math.PI),
      heading: Math.PI + Math.sin(share * Math.PI * 2) * 0.9,
    };
  }
  if (progress < 0.68) {
    const share = (progress - 0.62) / 0.06;
    return {
      x: towerAt.x - 0.2 + (slideFrom[0] - towerAt.x + 0.2) * share,
      y: towerTop,
      z: towerAt.z + (slideFrom[2] - 0.2 - towerAt.z) * share,
      heading: 0,
    };
  }
  if (progress < 0.9) {
    const share = ((progress - 0.68) / 0.22) ** 1.4;
    const eased = share * share * (3 - 2 * share);
    return {
      x: slideFrom[0] + (slideTo[0] - slideFrom[0]) * share,
      y: slideFrom[1] + (slideTo[1] - slideFrom[1]) * eased + 0.04,
      z: slideFrom[2] - 0.2 + (slideTo[2] - slideFrom[2] + 0.2) * share,
      heading: Math.atan2(slideTo[0] - slideFrom[0], slideTo[2] - slideFrom[2]),
    };
  }
  const share = (progress - 0.9) / 0.1;
  return {
    x: slideTo[0] + (lookoutFinish.x - slideTo[0]) * share,
    y: slideTo[1] * (1 - share),
    z: slideTo[2] + (lookoutFinish.z - slideTo[2]) * share,
    heading: 0,
  };
};

export const gorillaSanctuaryModel: NewLandAttractionModel = {
  kind: "gorilla-sanctuary",
  islandId: "jungle-reach",
  name: "Gorilla Sanctuary",
  fact: "Gorillas are mostly herbivores: they eat leaves, stems, shoots and fruit, and a big silverback can munch through about 18 kilograms of plants in a day. Their wide, flat back teeth grind up tough leaves, just like your own molars do.",
  curriculumLink:
    "Science, Year 4: animals, including humans. Identify the different types of teeth and their simple functions, and construct food chains (a gorilla's grinding molars).",
  footprint: 11,
  setting: "inland",
  signSpot: signAt,
  padColour: "#5c9440",
  build: (builder) => {
    buildEnclosure(builder);
    buildClimbingFrame(builder);
    buildShelter(builder);
    buildEnclosureTree(builder);
    buildViewingDeck(builder);
    buildTower(builder);
    buildKeeperHut(builder);
    buildPlanting(builder);
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "silverback",
      pivot: silverbackAt,
      build: buildSilverback,
      motion: { kind: "nod", axis: "x", reach: 7, amplitude: 0.1, period: 0.4 },
    },
    {
      name: "young gorilla",
      pivot: juvenileAt,
      build: buildJuvenile,
      motion: { kind: "rise", reach: 6, height: 0.55, period: 1.8 },
    },
    {
      name: "baby on the swing",
      pivot: swingPivot,
      build: buildBabySwing,
      motion: swingMotion,
    },
  ],
  wanderers: [
    {
      name: "gorillas",
      build: buildWalkingGorilla,
      count: 2,
      centre: { x: 0.6, z: -2.2 },
      radius: 2.0,
      speed: 0.3,
    },
  ],
  decks: [buildFlatDeck(deck, deckTop, "bridge")],
  rides: [
    {
      id: "lookout-tower",
      name: "the lookout tower",
      start: lookoutStart,
      reach: 0.6,
      seconds: 15,
      finish: lookoutFinish,
      follow: lookoutRide,
    },
  ],
  blockers: [{ x: hutAt.x, z: hutAt.z, radius: 1.2 }] satisfies LocalBlocker[],
  play: {
    label: "Watch the gorillas eat",
    news: "Munch, munch! The gorillas tucked into leaves, shoots and fruit, grinding them up with their big flat back teeth.",
  },
};
