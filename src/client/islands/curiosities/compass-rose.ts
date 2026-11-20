import { ExtrudeGeometry, Shape } from "three";
import {
  addSignBoard,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const stoneCream = "#efe3c6";
const stoneSand = "#d8bf8e";
const tileNavy = "#24406e";
const tileSky = "#5a9ad0";
const tileTerracotta = "#c0603a";
const tileGold = "#e0b040";
const brass = "#c99a3a";
const needleRed = "#d63a2e";
const needleWhite = "#f4f1ea";
const signColour = "#24406e";

const roseRadius = 3.0;
const roseTop = 0.08;
const postRadius = 3.4;
const pedestalTop = 0.95;
const needlePivot: Triple = [0, pedestalTop + 0.12, 0];
const vanePivot: Triple = [-3.6, 2.5, -1.5];

/* Compass points: north is local -z, east is local +x */
const points = [
  { label: "N", angle: Math.PI },
  { label: "NE", angle: (Math.PI * 3) / 4 },
  { label: "E", angle: Math.PI / 2 },
  { label: "SE", angle: Math.PI / 4 },
  { label: "S", angle: 0 },
  { label: "SW", angle: -Math.PI / 4 },
  { label: "W", angle: -Math.PI / 2 },
  { label: "NW", angle: (-Math.PI * 3) / 4 },
];

/** A flat triangle lying on the ground, through three local points, `thickness` deep. */
const addFlatTriangle = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  corners: readonly LocalPoint[],
  y: number,
  thickness: number,
) => {
  const shape = new Shape();
  shape.moveTo(corners[0].x, -corners[0].z);
  corners.slice(1).forEach(({ x, z }) => shape.lineTo(x, -z));
  shape.closePath();
  builder.add(
    finish,
    colour,
    new ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
    }).rotateX(-Math.PI / 2),
    { at: [0, y, 0] },
    undefined,
  );
};

/* Letters drawn with straight strokes on a grid 2 wide and 3 tall */
const letterStrokes: Record<
  string,
  readonly [number, number, number, number][]
> = {
  N: [
    [0, 0, 0, 3],
    [2, 0, 2, 3],
    [0, 3, 2, 0],
  ],
  E: [
    [0, 0, 0, 3],
    [0, 3, 2, 3],
    [0, 1.5, 1.6, 1.5],
    [0, 0, 2, 0],
  ],
  S: [
    [2, 3, 0, 3],
    [0, 3, 0, 1.5],
    [0, 1.5, 2, 1.5],
    [2, 1.5, 2, 0],
    [2, 0, 0, 0],
  ],
  W: [
    [0, 3, 0.5, 0],
    [0.5, 0, 1, 1.6],
    [1, 1.6, 1.5, 0],
    [1.5, 0, 2, 3],
  ],
};

/**
 * Draws a label's letters as bars. `place` turns a letter-grid point
 * (across, up) into a local point.
 */
const addLetters = (
  builder: AttractionBuilder,
  label: string,
  place: (across: number, up: number) => Triple,
  colour: string,
  thickness: number,
) => {
  const letters = label.split("");
  letters.forEach((letter, index) => {
    const offset = (index - (letters.length - 1) / 2) * 2.8 - 1;
    (letterStrokes[letter] ?? []).forEach(([fromX, fromY, toX, toY]) => {
      builder.bar(
        "paint",
        colour,
        place(offset + fromX, fromY),
        place(offset + toX, toY),
        thickness,
        4,
      );
    });
  });
};

/* The mosaic rose on the ground */

const buildRose = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 16 : 48;
  builder.cylinder("matte", stoneSand, {
    radius: roseRadius + 0.1,
    radiusEnd: roseRadius,
    length: roseTop,
    at: [0, roseTop / 2, 0],
    segments,
  });
  builder.cylinder("paint", tileNavy, {
    radius: roseRadius - 0.12,
    length: 0.01,
    at: [0, roseTop + 0.004, 0],
    segments,
  });
  builder.cylinder("paint", stoneCream, {
    radius: roseRadius - 0.62,
    length: 0.01,
    at: [0, roseTop + 0.008, 0],
    segments,
  });
  /* The eight-pointed star: long points for N, E, S and W, short ones between */
  points.forEach(({ angle }, index) => {
    const isMain = index % 2 === 0;
    const length = isMain ? roseRadius - 0.2 : roseRadius - 0.95;
    const halfWidth = isMain ? 0.42 : 0.3;
    const tip = { x: Math.sin(angle) * length, z: Math.cos(angle) * length };
    const left = {
      x: Math.sin(angle - Math.PI / 4) * halfWidth,
      z: Math.cos(angle - Math.PI / 4) * halfWidth,
    };
    const right = {
      x: Math.sin(angle + Math.PI / 4) * halfWidth,
      z: Math.cos(angle + Math.PI / 4) * halfWidth,
    };
    const centre = { x: 0, z: 0 };
    const lift = roseTop + (isMain ? 0.03 : 0.02);
    const shadeLight = isMain ? (index === 0 ? needleRed : tileGold) : tileSky;
    const shadeDark = isMain
      ? index === 0
        ? shade(needleRed, 0.7)
        : shade(tileGold, 0.72)
      : shade(tileSky, 0.7);
    addFlatTriangle(
      builder,
      "paint",
      shadeLight,
      [centre, left, tip],
      lift - 0.02,
      0.02,
    );
    if (!builder.isFar) {
      addFlatTriangle(
        builder,
        "paint",
        shadeDark,
        [centre, tip, right],
        lift - 0.02,
        0.02,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Rings of small tiles, and a brass bezel marked every 10 degrees */
  listRingPoints(roseRadius - 0.37, 32).forEach(({ x, z }, index) => {
    builder.box(
      "paint",
      index % 2 === 0 ? tileTerracotta : stoneCream,
      [0.16, 0.012, 0.16],
      [x, roseTop + 0.012, z],
      [0, (index / 32) * Math.PI * 2 + Math.PI / 4, 0],
    );
  });
  builder.torus(
    "metal",
    brass,
    roseRadius - 0.08,
    0.035,
    [0, roseTop + 0.01, 0],
    "y",
    48,
  );
  listRingPoints(roseRadius - 0.6, 36).forEach(({ x, z }, index) => {
    builder.box(
      "paint",
      tileNavy,
      [0.02, 0.012, index % 9 === 0 ? 0.2 : 0.1],
      [x, roseTop + 0.014, z],
      [0, (index / 36) * Math.PI * 2, 0],
    );
  });
  /* The letters inlaid at the end of each point, reading from outside */
  points.forEach(({ label, angle }) => {
    const radius = roseRadius - 0.38;
    const centre: Triple = [
      Math.sin(angle) * radius,
      roseTop + 0.02,
      Math.cos(angle) * radius,
    ];
    const size = 0.06;
    addLetters(
      builder,
      label,
      (across, up) => [
        centre[0] +
          Math.cos(angle) * across * size -
          Math.sin(angle) * (up - 1.5) * size,
        centre[1],
        centre[2] -
          Math.sin(angle) * across * size -
          Math.cos(angle) * (up - 1.5) * size,
      ],
      palette.white,
      0.035,
    );
  });
};

/* The posts round the edge, each with its letters */

const buildPosts = (builder: AttractionBuilder) => {
  points.forEach(({ label, angle }, index) => {
    const isMain = index % 2 === 0;
    const x = Math.sin(angle) * postRadius;
    const z = Math.cos(angle) * postRadius;
    const height = isMain ? 1.25 : 0.95;
    builder.box(
      "matte",
      stoneCream,
      [0.22, height, 0.22],
      [x, height / 2, z],
      [0, angle, 0],
    );
    if (builder.isFar) {
      return;
    }
    builder.box(
      "matte",
      stoneSand,
      [0.32, 0.12, 0.32],
      [x, 0.06, z],
      [0, angle, 0],
    );
    builder.cylinder("metal", brass, {
      radius: 0.1,
      radiusEnd: 0.0,
      length: 0.22,
      at: [x, height + 0.11, z],
      segments: 4,
    });
    /* A plaque facing outwards, with the letters in gold */
    const plaqueOut = 0.13;
    const plaque: Triple = [
      x + Math.sin(angle) * plaqueOut,
      height - 0.25,
      z + Math.cos(angle) * plaqueOut,
    ];
    builder.box(
      "paint",
      tileNavy,
      [label.length > 1 ? 0.4 : 0.26, 0.3, 0.03],
      plaque,
      [0, angle, 0],
    );
    const size = 0.055;
    addLetters(
      builder,
      label,
      (across, up) => [
        plaque[0] + Math.cos(angle) * across * size + Math.sin(angle) * 0.02,
        plaque[1] + (up - 1.5) * size,
        plaque[2] - Math.sin(angle) * across * size + Math.cos(angle) * 0.02,
      ],
      tileGold,
      0.03,
    );
  });
};

/* The pedestal in the middle, with the dial the needle turns over */

const buildPedestal = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    stoneCream,
    [
      [0, roseTop],
      [0.5, roseTop],
      [0.5, roseTop + 0.12],
      [0.38, roseTop + 0.2],
      [0.26, roseTop + 0.32],
      [0.22, pedestalTop - 0.2],
      [0.32, pedestalTop - 0.1],
      [0.62, pedestalTop - 0.02],
      [0.62, pedestalTop],
      [0, pedestalTop],
    ],
    [0, 0, 0],
    "y",
    builder.isFar ? 10 : 24,
  );
  builder.cylinder("paint", stoneCream, {
    radius: 0.56,
    length: 0.03,
    at: [0, pedestalTop + 0.015, 0],
    segments: builder.isFar ? 10 : 28,
  });
  if (builder.isFar) {
    builder.box("paint", needleRed, [0.1, 0.04, 0.9], needlePivot);
    return;
  }
  builder.torus(
    "metal",
    brass,
    0.58,
    0.04,
    [0, pedestalTop + 0.03, 0],
    "y",
    32,
  );
  /* Ticks for the eight points, and a little star under the needle */
  points.forEach(({ angle }, index) => {
    builder.box(
      "paint",
      index === 0 ? needleRed : tileNavy,
      [0.03, 0.01, index % 2 === 0 ? 0.14 : 0.08],
      [Math.sin(angle) * 0.46, pedestalTop + 0.035, Math.cos(angle) * 0.46],
      [0, angle, 0],
    );
  });
  addLetters(
    builder,
    "N",
    (across, up) => [
      across * 0.035,
      pedestalTop + 0.04,
      -0.32 - (up - 1.5) * 0.035,
    ],
    needleRed,
    0.02,
  );
  builder.cylinder("metal", brass, {
    radius: 0.03,
    length: 0.12,
    at: [0, pedestalTop + 0.08, 0],
    segments: 8,
  });
  /* Tile bands round the column */
  [roseTop + 0.42, pedestalTop - 0.3].forEach((y) => {
    builder.cylinder("paint", tileSky, {
      radius: 0.245,
      length: 0.06,
      at: [0, y, 0],
      segments: 18,
    });
  });
};

/* An explorer's camp: a map on an easel, a pack and a telescope */

const buildCamp = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const easel: Triple = [3.6, 0, 1.4];
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.timber,
      [easel[0] + side * 0.3, 0, easel[2] + 0.15],
      [easel[0], 1.3, easel[2]],
      0.05,
      5,
    );
  });
  builder.bar(
    "matte",
    palette.timber,
    [easel[0], 0, easel[2] - 0.35],
    [easel[0], 1.2, easel[2]],
    0.05,
    5,
  );
  builder.box(
    "paint",
    "#f2e2b6",
    [0.7, 0.55, 0.02],
    [easel[0] - 0.02, 0.95, easel[2] + 0.1],
    [-0.2, -0.3, 0],
  );
  /* The map: an island, a dotted path and an X */
  builder.sphere(
    "paint",
    "#9ac26a",
    0.18,
    [easel[0] - 0.02, 0.96, easel[2] + 0.12],
    [1.2, 0.8, 0.1],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      needleRed,
      [0.1, 0.02, 0.01],
      [easel[0] + 0.1, 0.9, easel[2] + 0.15],
      [-0.2, -0.3, side * 0.8],
    );
  });
  /* A backpack with a rolled blanket */
  const pack: Triple = [-3.5, 0, 1.5];
  builder.roundedBox(
    "matte",
    "#6a7a3a",
    [0.42, 0.55, 0.28],
    0.08,
    [pack[0], 0.28, pack[2]],
    [0, 0.6, 0],
  );
  builder.cylinder("matte", tileTerracotta, {
    radius: 0.09,
    length: 0.5,
    at: [pack[0], 0.62, pack[2]],
    axis: "x",
    segments: 10,
  });
  /* A brass telescope on a tripod */
  const scope: Triple = [3.65, 0, -1.5];
  [0, 2.1, 4.2].forEach((angle) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [scope[0] + Math.sin(angle) * 0.35, 0, scope[2] + Math.cos(angle) * 0.35],
      [scope[0], 1.0, scope[2]],
      0.04,
      5,
    );
  });
  builder.cylinder("metal", brass, {
    radius: 0.06,
    radiusEnd: 0.09,
    length: 0.8,
    at: [scope[0], 1.12, scope[2]],
    axis: "z",
    segments: 12,
  });
  builder.cylinder("metal", shade(brass, 0.8), {
    radius: 0.07,
    length: 0.06,
    at: [scope[0], 1.12, scope[2] - 0.2],
    axis: "z",
    segments: 12,
  });
};

/* The weather vane's pole */

const buildVanePole = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: vanePivot[1],
    at: [vanePivot[0], vanePivot[1] / 2, vanePivot[2]],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", stoneSand, {
    radius: 0.2,
    length: 0.15,
    at: [vanePivot[0], 0.075, vanePivot[2]],
    segments: 10,
  });
  /* Fixed arms for N, E, S and W */
  points
    .filter((_, index) => index % 2 === 0)
    .forEach(({ label, angle }) => {
      const arm: Triple = [
        vanePivot[0] + Math.sin(angle) * 0.4,
        vanePivot[1] - 0.25,
        vanePivot[2] + Math.cos(angle) * 0.4,
      ];
      builder.bar(
        "metal",
        palette.darkSteel,
        [vanePivot[0], vanePivot[1] - 0.25, vanePivot[2]],
        arm,
        0.025,
        4,
      );
      addLetters(
        builder,
        label,
        (across, up) => [
          arm[0] + Math.cos(angle) * across * 0.035 + Math.sin(angle) * 0.05,
          arm[1] + (up - 1.5) * 0.035,
          arm[2] - Math.sin(angle) * across * 0.035 + Math.cos(angle) * 0.05,
        ],
        palette.black,
        0.02,
      );
    });
};

/* The moving parts */

const buildNeedle = (builder: AttractionBuilder) => {
  /* A diamond needle: red end points north, white end south */
  [
    { end: -1, colour: needleRed },
    { end: 1, colour: needleWhite },
  ].forEach(({ end, colour }) => {
    [-1, 1].forEach((side) => {
      builder.add(
        "paint",
        side > 0 ? colour : shade(colour, 0.8),
        new ExtrudeGeometry(
          (() => {
            const shape = new Shape();
            shape.moveTo(0, 0);
            shape.lineTo(side * 0.07, 0);
            shape.lineTo(0, -end * 0.48);
            shape.closePath();
            return shape;
          })(),
          { depth: 0.03, bevelEnabled: false },
        ).rotateX(-Math.PI / 2),
        { at: [0, 0, 0] },
        undefined,
      );
    });
  });
  builder.cylinder("metal", brass, {
    radius: 0.05,
    length: 0.05,
    at: [0, 0.02, 0],
    segments: 12,
  });
  builder.sphere("metal", brass, 0.03, [0, 0.06, 0], [1, 1, 1], 8);
};

const buildVane = (builder: AttractionBuilder) => {
  /* An arrow with a feathered tail that swings into the wind */
  builder.bar("metal", palette.black, [0, 0, -0.55], [0, 0, 0.5], 0.03, 6);
  builder.cylinder("paint", needleRed, {
    radius: 0.0,
    radiusEnd: 0.09,
    length: 0.2,
    at: [0, 0, -0.62],
    axis: "z",
    segments: 4,
  });
  builder.box("paint", tileGold, [0.02, 0.26, 0.3], [0, 0.05, 0.42]);
  builder.box("paint", tileGold, [0.02, 0.18, 0.12], [0, 0.05, 0.6]);
  builder.sphere("metal", brass, 0.06, [0, 0.0, 0], [1, 1, 1], 10);
  /* A little camel stands on the arrow */
  builder.sphere(
    "paint",
    palette.black,
    0.08,
    [0, 0.14, 0.05],
    [0.6, 0.7, 1.4],
    8,
  );
  builder.sphere(
    "paint",
    palette.black,
    0.05,
    [0, 0.21, 0.07],
    [0.8, 0.9, 1],
    6,
  );
  builder.bar(
    "paint",
    palette.black,
    [0, 0.14, -0.08],
    [0, 0.26, -0.14],
    0.035,
    4,
  );
  builder.sphere(
    "paint",
    palette.black,
    0.035,
    [0, 0.27, -0.17],
    [0.8, 0.8, 1.4],
    6,
  );
  [-0.07, 0.15].forEach((z) => {
    builder.bar("paint", palette.black, [0, 0.12, z], [0, 0.02, z], 0.02, 4);
  });
};

export const compassRoseModel: CuriosityModel = {
  kind: "compass-rose",
  islandId: "sunscorch-sands",
  name: "Compass Rose",
  fact: "A compass rose shows the four main points, north, east, south and west, and the four points in between: north-east, south-east, south-west and north-west. A compass needle is a tiny magnet, and its red end always swings round to point north. Desert travellers used compasses and the stars to cross the sand without getting lost.",
  curriculumLink:
    "Geography, Key Stage 2: use the eight points of a compass, four- and six-figure grid references, symbols and keys to build knowledge of the wider world.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 1.7, z: 3.95 },
  padColour: sand,
  build: (builder) => {
    buildRose(builder);
    buildPosts(builder);
    buildPedestal(builder);
    buildCamp(builder);
    buildVanePole(builder);
    addSignBoard(builder, [1.7, 0, 3.95], signColour);
  },
  moving: [
    {
      name: "compass needle",
      pivot: needlePivot,
      build: buildNeedle,
      motion: { kind: "nod", axis: "y", reach: 6, amplitude: 0.7, period: 1.8 },
    },
    {
      name: "weather vane",
      pivot: vanePivot,
      build: buildVane,
      motion: { kind: "swing", axis: "y", amplitude: 0.6, period: 6 },
    },
  ],
  decks: [
    ({ x, z }) =>
      Math.hypot(x, z) <= roseRadius
        ? { height: roseTop, kind: "ground" }
        : undefined,
  ],
  blockers: [
    { x: 0, z: 0, radius: 0.6 },
    ...points.map(({ angle }) => ({
      x: Math.sin(angle) * postRadius,
      z: Math.cos(angle) * postRadius,
      radius: 0.22,
    })),
    { x: vanePivot[0], z: vanePivot[2], radius: 0.22 },
    { x: 3.6, z: 1.4, radius: 0.35 },
    { x: -3.5, z: 1.5, radius: 0.3 },
    { x: 3.65, z: -1.5, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Find north",
    news: "Spin, wobble… stop! The red end of the needle swung round and pointed straight at the N post. That way is north!",
  },
};
