import {
  addBush,
  addGableRoof,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const wellStone = "#b3a891";
const wellStoneDark = "#8f8572";
const copingStone = "#cfc6b2";
const moss = "#6f9a3e";
const roofShingle = "#7a4a2c";
const postTimber = "#7a5232";
const ropeColour = "#cdb27a";
const bucketTimber = "#9a6a3a";
const hoopIron = "#3f4247";
const wellWater = "#2f7f9e";
const wellDepth = "#1e3a44";
const copper = "#b86b3a";
const silver = "#c9ccd1";
const gold = "#d9b44a";
const signColour = "#3f6a8a";

const wallOuter = 1.0;
const wallInner = 0.78;
const wallHeight = 0.85;
const waterLevel = 0.45;
const postX = 1.1;
const roofAt = 2.3;
const axleHeight = 1.6;
const drumRadius = 0.13;
const bucketRest = 0.42;
const bucketHeight = 0.3;
const crankPivot: Triple = [0, axleHeight, 0];
const bucketPivot: Triple = [0, bucketRest, 0];

/** The round stone wall, with its courses of stones and coping. */
const buildWall = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 14 : 32;
  builder.lathe(
    "matte",
    wellStone,
    [
      [wallInner, waterLevel - 0.1],
      [wallInner, wallHeight],
      [wallOuter, wallHeight],
      [wallOuter + 0.04, 0.05],
      [wallOuter + 0.1, 0],
    ],
    [0, 0, 0],
    "y",
    segments,
  );
  /* The dark shaft below the water, and the water itself */
  builder.cylinder("matte", wellDepth, {
    radius: wallInner,
    length: 0.05,
    at: [0, waterLevel - 0.12, 0],
    segments,
  });
  builder.cylinder("water", wellWater, {
    radius: wallInner,
    length: 0.03,
    at: [0, waterLevel, 0],
    segments,
  });
  if (builder.isFar) {
    builder.cylinder("matte", copingStone, {
      radius: wallOuter + 0.06,
      length: 0.1,
      at: [0, wallHeight + 0.05, 0],
      segments,
    });
    return;
  }
  /* Rough stones in courses, each a little proud of the wall */
  const courses = 4;
  for (let course = 0; course < courses; course++) {
    const y = 0.12 + course * 0.19;
    const stones = 15;
    for (let stone = 0; stone < stones; stone++) {
      const angle = ((stone + (course % 2) * 0.5) / stones) * Math.PI * 2;
      const tone = 0.86 + ((stone * 7 + course * 3) % 5) * 0.06;
      builder.box(
        "matte",
        shade(wellStone, tone),
        [0.36, 0.15, 0.06],
        [
          Math.sin(angle) * (wallOuter + 0.02),
          y,
          Math.cos(angle) * (wallOuter + 0.02),
        ],
        [0, angle, 0],
      );
    }
  }
  /* The coping: big flat stones round the top */
  const coping = 12;
  for (let stone = 0; stone < coping; stone++) {
    const angle = (stone / coping) * Math.PI * 2;
    const middle = (wallInner + wallOuter) / 2;
    builder.box(
      "matte",
      stone % 3 === 0 ? shade(copingStone, 0.92) : copingStone,
      [0.5, 0.1, 0.3],
      [Math.sin(angle) * middle, wallHeight + 0.05, Math.cos(angle) * middle],
      [0, angle, 0],
    );
  }
  /* Moss and little ferns creeping over the stones */
  [0.4, 1.9, 3.6, 5.1].forEach((angle, index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? moss : shade(moss, 0.85),
      0.12,
      [
        Math.sin(angle) * (wallOuter + 0.04),
        0.1 + index * 0.12,
        Math.cos(angle) * (wallOuter + 0.04),
      ],
      [1, 0.5, 1],
      8,
    );
  });
  /* Wished-for coins glinting on the bottom, under the water */
  const coins: { x: number; z: number; colour: string; sides: number }[] = [
    { x: 0.3, z: 0.2, colour: copper, sides: 14 },
    { x: -0.25, z: 0.35, colour: copper, sides: 14 },
    { x: 0.1, z: -0.4, colour: silver, sides: 14 },
    { x: -0.45, z: -0.1, colour: silver, sides: 7 },
    { x: 0.5, z: -0.2, colour: silver, sides: 7 },
    { x: -0.1, z: 0.05, colour: gold, sides: 12 },
    { x: 0.2, z: 0.5, colour: gold, sides: 14 },
    { x: -0.35, z: -0.45, colour: copper, sides: 14 },
  ];
  coins.forEach(({ x, z, colour, sides }, index) => {
    builder.cylinder("metal", colour, {
      radius: 0.05 + (index % 3) * 0.01,
      length: 0.012,
      at: [x, waterLevel - 0.09, z],
      segments: sides,
    });
  });
};

/** The posts, crossbeams and shingled roof over the well. */
const buildRoof = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      postTimber,
      [0.14, roofAt, 0.14],
      [side * postX, roofAt / 2, 0],
    );
    if (!builder.isFar) {
      /* Braces up to the beam, and a stone pad at the foot */
      builder.bar(
        "matte",
        shade(postTimber, 0.85),
        [side * postX, roofAt - 0.45, 0],
        [side * (postX - 0.4), roofAt - 0.04, 0],
        0.07,
        4,
      );
      builder.box(
        "matte",
        wellStoneDark,
        [0.3, 0.1, 0.3],
        [side * postX, 0.05, 0],
      );
    }
  });
  builder.box(
    "matte",
    postTimber,
    [postX * 2 + 0.3, 0.14, 0.16],
    [0, roofAt, 0],
  );
  addGableRoof(builder, {
    width: postX * 2 + 0.2,
    depth: 1.5,
    rise: 0.7,
    at: [0, roofAt + 0.07, 0],
    colour: roofShingle,
    overhang: 0.18,
    thickness: 0.07,
  });
  builder.cylinder("matte", shade(roofShingle, 0.8), {
    radius: 0.07,
    length: postX * 2 + 0.6,
    at: [0, roofAt + 0.79, 0],
    axis: "x",
    segments: builder.isFar ? 6 : 10,
  });
  if (builder.isFar) {
    return;
  }
  /* Rows of shingles, each overlapping the one below */
  const halfDepth = 0.75 + 0.18;
  const angle = Math.atan2(0.7, halfDepth);
  [1, -1].forEach((side) => {
    for (let row = 0; row < 4; row++) {
      const share = 0.08 + row * 0.24;
      for (let tile = 0; tile < 7; tile++) {
        const x = -postX - 0.2 + (tile + (row % 2) * 0.5) * 0.37;
        if (x > postX + 0.3) {
          continue;
        }
        builder.box(
          "matte",
          shade(roofShingle, 0.9 + ((tile + row) % 3) * 0.08),
          [0.35, 0.03, 0.3],
          [
            x,
            roofAt + 0.07 + 0.7 * share + 0.06,
            side * halfDepth * (1 - share),
          ],
          [side * angle, 0, 0],
        );
      }
    }
  });
  /* Gable trusses at each end */
  [-1, 1].forEach((side) => {
    const x = side * (postX + 0.05);
    [-1, 1].forEach((slope) => {
      builder.bar(
        "matte",
        palette.darkTimber,
        [x, roofAt + 0.05, slope * 0.75],
        [x, roofAt + 0.74, 0],
        0.07,
        4,
      );
    });
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 0.65, 0.07],
      [x, roofAt + 0.4, 0],
    );
  });
  /* A little lantern hung under the ridge */
  builder.bar(
    "metal",
    hoopIron,
    [0.55, roofAt + 0.65, 0],
    [0.55, roofAt + 0.2, 0],
    0.02,
    4,
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.12, 0.16, 0.12],
    [0.55, roofAt + 0.1, 0],
  );
  builder.cylinder("metal", hoopIron, {
    radius: 0.1,
    radiusEnd: 0.02,
    length: 0.08,
    at: [0.55, roofAt + 0.22, 0],
    segments: 8,
  });
  /* The rope wound on the drum runs down to the bucket */
  builder.bar(
    "matte",
    ropeColour,
    [0, axleHeight, drumRadius * 0.4],
    [0, bucketRest + bucketHeight + 0.23, 0.06],
    0.03,
    5,
  );
};

/** The windlass: a drum on an axle, wound with rope, turned by its crank. */
const buildWindlass = (builder: AttractionBuilder) => {
  builder.cylinder("matte", palette.paleTimber, {
    radius: drumRadius,
    length: 0.9,
    at: [0, 0, 0],
    axis: "x",
    segments: 14,
  });
  builder.cylinder("metal", hoopIron, {
    radius: 0.035,
    length: postX * 2 + 0.2,
    at: [0, 0, 0],
    axis: "x",
    segments: 8,
  });
  for (let turn = 0; turn < 6; turn++) {
    builder.torus(
      "matte",
      ropeColour,
      drumRadius + 0.012,
      0.016,
      [-0.25 + turn * 0.1, 0, 0],
      "x",
      14,
    );
  }
  [-0.45, 0.45].forEach((x) => {
    builder.cylinder("matte", shade(palette.paleTimber, 0.8), {
      radius: drumRadius + 0.05,
      length: 0.05,
      at: [x, 0, 0],
      axis: "x",
      segments: 14,
    });
  });
  /* The crank: an iron arm and a turned wooden handle */
  const crankX = postX + 0.12;
  builder.box("metal", hoopIron, [0.04, 0.4, 0.06], [crankX, -0.17, 0]);
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.04,
    length: 0.26,
    at: [crankX + 0.13, -0.34, 0],
    axis: "x",
    segments: 8,
  });
  builder.sphere("matte", palette.darkTimber, 0.05, [crankX + 0.27, -0.34, 0]);
};

/** The bucket, with its iron hoops and handle, and a short length of rope. */
const buildBucket = (builder: AttractionBuilder) => {
  builder.cylinder("matte", bucketTimber, {
    radius: 0.17,
    radiusEnd: 0.14,
    length: bucketHeight,
    at: [0, bucketHeight / 2, 0.06],
    segments: 16,
  });
  builder.cylinder("water", wellWater, {
    radius: 0.16,
    length: 0.02,
    at: [0, bucketHeight - 0.05, 0.06],
    segments: 14,
  });
  [0.06, bucketHeight - 0.05].forEach((y, index) => {
    builder.torus(
      "metal",
      hoopIron,
      index === 0 ? 0.148 : 0.168,
      0.012,
      [0, y, 0.06],
      "y",
      16,
    );
  });
  for (let stave = 0; stave < 8; stave++) {
    const angle = (stave / 8) * Math.PI * 2;
    builder.box(
      "matte",
      shade(bucketTimber, 0.82),
      [0.012, bucketHeight - 0.02, 0.012],
      [
        Math.sin(angle) * 0.162,
        bucketHeight / 2,
        0.06 + Math.cos(angle) * 0.162,
      ],
      [0, angle, 0],
    );
  }
  builder.torus(
    "metal",
    hoopIron,
    0.16,
    0.012,
    [0, bucketHeight, 0.06],
    "x",
    12,
  );
  builder.bar(
    "matte",
    ropeColour,
    [0, bucketHeight + 0.16, 0.06],
    [0, bucketHeight + 0.5, 0.06],
    0.03,
    5,
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A cobbled apron round the well, and a path to it */
  builder.cylinder("matte", palette.paving, {
    radius: 1.7,
    length: 0.04,
    at: [0, 0.02, 0],
    segments: builder.isFar ? 14 : 32,
  });
  builder.box("matte", palette.path, [0.9, 0.03, 2.0], [0, 0.015, 2.6]);
  if (builder.isFar) {
    return;
  }
  for (let cobble = 0; cobble < 22; cobble++) {
    const angle = (cobble / 22) * Math.PI * 2;
    const radius = 1.3 + (cobble % 2) * 0.22;
    builder.cylinder(
      "matte",
      shade(palette.paving, 0.85 + (cobble % 3) * 0.07),
      {
        radius: 0.12,
        length: 0.03,
        at: [Math.sin(angle) * radius, 0.045, Math.cos(angle) * radius],
        segments: 7,
      },
    );
  }
  /* A spare bucket, a mossy step stone and a chalk board of wishes */
  builder.cylinder("matte", bucketTimber, {
    radius: 0.16,
    radiusEnd: 0.13,
    length: 0.28,
    at: [-1.45, 0.18, 0.8],
    segments: 14,
  });
  builder.torus("metal", hoopIron, 0.15, 0.012, [-1.45, 0.28, 0.8], "y", 14);
  builder.roundedBox(
    "matte",
    wellStoneDark,
    [0.6, 0.16, 0.4],
    0.06,
    [0, 0.08, 1.25],
  );
  const board: Triple = [-1.5, 0, 1.6];
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [board[0] + side * 0.22, 0, board[2] - 0.15],
      [board[0] + side * 0.18, 0.75, board[2]],
      0.04,
      4,
    );
  });
  builder.box(
    "matte",
    "#2f3a33",
    [0.42, 0.5, 0.03],
    [board[0], 0.5, board[2] + 0.02],
    [-0.2, 0, 0],
  );
  [0.62, 0.52, 0.42].forEach((y, index) => {
    builder.box(
      "matte",
      palette.white,
      [0.3 - index * 0.06, 0.025, 0.01],
      [board[0], y, board[2] + 0.05 - (0.62 - y) * 0.2],
      [-0.2, 0, 0],
    );
  });
  /* Primroses and bushes round the edge */
  [
    [1.6, -1.6],
    [-1.8, -1.2],
    [2.2, 0.6],
    [-2.3, 0.3],
    [0.9, -2.2],
  ].forEach(([x, z], index) => {
    for (let petal = 0; petal < 3; petal++) {
      builder.sphere(
        "paint",
        index % 2 === 0 ? "#f3e27a" : "#e9a6c4",
        0.06,
        [x + petal * 0.12, 0.08, z + (petal % 2) * 0.1],
        [1, 0.5, 1],
        6,
      );
    }
  });
  addBush(builder, [-2.2, 0, -2.0], 0.5);
  addBush(builder, [2.3, 0, -1.7], 0.45, "#3d7a34");
};

export const wishingWellModel: CuriosityModel = {
  kind: "wishing-well",
  islandId: "meadow-isle",
  name: "Wishing Well",
  fact: "People throw coins into a wishing well and make a wish. Our coins have different values: 1p, 2p, 5p, 10p, 20p, 50p, £1 and £2. You can tell them apart by their colour, size and shape. The 20p and 50p coins have seven sides, and the £1 coin has twelve!",
  curriculumLink:
    "Mathematics, Year 1: measurement. Recognise and know the value of different denominations of coins and notes.",
  footprint: 4,
  setting: "inland",
  signSpot: { x: 1.5, z: 3.0 },
  build: (builder) => {
    buildGrounds(builder);
    buildWall(builder);
    buildRoof(builder);
    if (builder.isFar) {
      builder.cylinder("matte", palette.paleTimber, {
        radius: drumRadius,
        length: postX * 2,
        at: crankPivot,
        axis: "x",
        segments: 6,
      });
    }
    addSignBoard(builder, [1.5, 0, 3.0], signColour);
  },
  moving: [
    {
      name: "windlass",
      pivot: crankPivot,
      build: buildWindlass,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 1.2, period: 2.2 },
    },
    {
      name: "bucket",
      pivot: bucketPivot,
      build: buildBucket,
      motion: { kind: "rise", reach: 6, height: 0.5, period: 2.2 },
    },
  ],
  blockers: [
    { x: 0, z: 0, radius: wallOuter + 0.2 },
    { x: -postX, z: 0, radius: 0.3 },
    { x: postX + 0.2, z: 0, radius: 0.35 },
  ] satisfies LocalBlocker[],
  tune: [84, 79, 76, 72, 88],
  play: {
    label: "Make a wish",
    news: "Plink! Your shiny coin spun down into the water and landed with all the others. Shh, don't tell anyone your wish!",
    tune: [88, 84, 79, 91],
  },
};
