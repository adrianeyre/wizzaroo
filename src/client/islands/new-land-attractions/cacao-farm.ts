import {
  addGableRoof,
  addSignBoard,
  buildFlatDeck,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const bark = "#6a5040";
const barkDark = "#4e3a2c";
const leafDeep = "#1f6428";
const leafMid = "#2f8a35";
const leafBright = "#5bb544";
const banana = "#69b84a";
const soil = "#6a4a30";
const path = "#b89a6c";
const plank = "#a8774a";
const plankDark = "#7d5534";
const roofTin = "#b5523a";
const wallLime = "#efe1c0";
const rail = "#6b7178";
const sleeper = "#5e4630";
const chocolate = "#5a3420";
const chocolateLight = "#7a4a2c";
const bean = "#8a5236";
const podYellow = "#f2c12e";
const podOrange = "#ea8a24";
const podRed = "#c8372a";
const podPurple = "#7b2d5a";
const sack = "#c9b083";
const wagonGreen = "#2f7a4a";
const donkeyGrey = "#8e8a84";
const signColour = "#6b3a22";

/* The little railway round the farm */
const loopAt = { x: 0, z: -0.8 };
const loopRadius = 5.0;
const gauge = 0.3;
const wagonPivot: Triple = [loopAt.x, 0, loopAt.z];
const wagonMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: loopRadius,
  count: 2,
  speed: -0.32,
  isFacingAlong: true,
};
const wagonStart = { x: -0.8, z: 6.0 };
const wagonFinish = { x: 1.5, z: 6.1 };

/* The halt where the wagons stop, its platform a step up */
const halt = { minX: -1.6, maxX: 1.6, minZ: 4.75, maxZ: 5.55 };
const haltTop = 0.25;

/* The drying floor, where the beans are spread out in the sun */
const drying = { minX: -3.9, maxX: -1.3, minZ: -4.0, maxZ: -1.9 };
const dryingTop = 0.5;
const dryingStep = { minX: -3.1, maxX: -2.1, minZ: -1.9, maxZ: -1.4 };
const dryingStepTop = 0.25;

/* The chocolate workshop */
const workshop = { x: 2.4, z: -3.0, width: 2.6, depth: 2.0 };

const cacaoTrees = [
  { x: -2.4, z: 1.4 },
  { x: -0.3, z: 0.2 },
  { x: 1.9, z: 1.6 },
  { x: -3.6, z: -0.2 },
  { x: 0.4, z: -1.9 },
];
const fountainAt = { x: 0.5, z: 2.6 };
const millAt = { x: 3.7, z: -0.3 };
const donkeyAt: Triple = [-6.4, 0, 2.4];
const signAt = { x: -1.8, z: 8.2 };

/* -------------------------------------------------------------- */
/* Trees                                                           */
/* -------------------------------------------------------------- */

const podColours = [podYellow, podOrange, podRed, podPurple];

/** A cacao pod: a ridged rugby ball, hanging straight from the bark. */
const addPod = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  turn: number,
) => {
  builder.sphere(
    "paint",
    colour,
    0.09,
    at,
    [0.75, 1.5, 0.75],
    builder.isFar ? 5 : 6,
  );
  if (!builder.isFar) {
    builder.bar(
      "matte",
      barkDark,
      [at[0], at[1] + 0.13, at[2]],
      [
        at[0] - Math.sin(turn) * 0.06,
        at[1] + 0.18,
        at[2] - Math.cos(turn) * 0.06,
      ],
      0.02,
      3,
    );
  }
};

const addCacaoTree = (
  builder: AttractionBuilder,
  { x, z }: { x: number; z: number },
  index: number,
) => {
  builder.cylinder("matte", bark, {
    radius: 0.13,
    radiusEnd: 0.09,
    length: 1.7,
    at: [x, 0.85, z],
    segments: builder.isFar ? 5 : 8,
  });
  /* Branches fanning out, under a dark leafy crown */
  [0.4, 2.5, 4.4].forEach((angle) => {
    builder.bar(
      "matte",
      bark,
      [x, 1.5, z],
      [
        x + Math.sin(angle + index) * 0.7,
        2.1,
        z + Math.cos(angle + index) * 0.7,
      ],
      0.08,
      builder.isFar ? 4 : 6,
    );
  });
  builder.sphere(
    "matte",
    leafDeep,
    1.0,
    [x, 2.45, z],
    [1.1, 0.65, 1.1],
    builder.isFar ? 8 : 10,
  );
  if (builder.isFar) {
    addPod(builder, [x + 0.13, 0.9, z], podColours[index % 4], 0);
    return;
  }
  builder.sphere(
    "matte",
    leafMid,
    0.65,
    [x + 0.6, 2.2, z + 0.2],
    [1, 0.6, 1],
    8,
  );
  builder.sphere(
    "matte",
    leafBright,
    0.6,
    [x - 0.5, 2.3, z - 0.3],
    [1, 0.6, 1],
    8,
  );
  /* Pods grow straight out of the trunk and the big branches */
  for (let pod = 0; pod < 6; pod++) {
    const angle = pod * 2.1 + index;
    const height = 0.55 + (pod % 3) * 0.32;
    addPod(
      builder,
      [x + Math.sin(angle) * 0.18, height, z + Math.cos(angle) * 0.18],
      podColours[(pod + index) % 4],
      angle,
    );
  }
  /* Tiny pink-white flowers on the trunk */
  [0.4, 1.9, 3.6].forEach((angle) => {
    builder.sphere(
      "paint",
      "#f6dbe4",
      0.03,
      [x + Math.sin(angle) * 0.13, 1.3, z + Math.cos(angle) * 0.13],
      [1, 1, 1],
      4,
    );
  });
  /* Fallen leaves round its foot */
  builder.cylinder("matte", "#7a5a32", {
    radius: 0.6,
    length: 0.02,
    at: [x, 0.03, z],
    segments: 10,
  });
};

/** A banana plant, shading the young cacao. */
const addBanana = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  height: number,
) => {
  builder.cylinder("matte", "#7a9a44", {
    radius: 0.12,
    radiusEnd: 0.09,
    length: height,
    at: [x, height / 2, z],
    segments: builder.isFar ? 5 : 8,
  });
  const leaves = builder.isFar ? 3 : 6;
  for (let leaf = 0; leaf < leaves; leaf++) {
    const angle = (leaf / leaves) * Math.PI * 2 + x;
    builder.box(
      "matte",
      leaf % 2 === 0 ? banana : shade(banana, 0.85),
      [0.38, 0.03, 1.35],
      [x + Math.sin(angle) * 0.55, height + 0.12, z + Math.cos(angle) * 0.55],
      [0.5, angle, 0],
    );
  }
  if (!builder.isFar) {
    builder.sphere(
      "paint",
      "#8c2a4a",
      0.12,
      [x + 0.15, height - 0.35, z],
      [0.8, 1.5, 0.8],
      7,
    );
  }
};

/* -------------------------------------------------------------- */
/* The railway                                                      */
/* -------------------------------------------------------------- */

const buildRailway = (builder: AttractionBuilder) => {
  /* A bed of gravel, two rails and the sleepers under them */
  builder.torus(
    "matte",
    palette.gravel,
    loopRadius,
    0.42,
    [loopAt.x, -0.36, loopAt.z],
    "y",
    builder.isFar ? 16 : 56,
  );
  [-1, 1].forEach((side) => {
    builder.torus(
      "metal",
      rail,
      loopRadius + side * gauge,
      0.035,
      [loopAt.x, 0.12, loopAt.z],
      "y",
      builder.isFar ? 16 : 64,
    );
  });
  if (builder.isFar) {
    return;
  }
  const sleepers = 44;
  for (let index = 0; index < sleepers; index++) {
    const angle = (index / sleepers) * Math.PI * 2;
    builder.box(
      "matte",
      sleeper,
      [0.12, 0.05, gauge * 2 + 0.3],
      [
        loopAt.x + Math.sin(angle) * loopRadius,
        0.07,
        loopAt.z + Math.cos(angle) * loopRadius,
      ],
      [0, angle, 0],
    );
  }
};

const buildHalt = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = halt;
  const middleZ = (minZ + maxZ) / 2;
  builder.box(
    "matte",
    plank,
    [maxX - minX, haltTop, maxZ - minZ],
    [0, haltTop / 2, middleZ],
  );
  builder.box(
    "matte",
    palette.cream,
    [maxX - minX, 0.03, 0.08],
    [0, haltTop + 0.005, minZ + 0.06],
  );
  /* A little shelter roof on posts at the back */
  [minX + 0.1, maxX - 0.1].forEach((x) => {
    builder.cylinder("paint", wagonGreen, {
      radius: 0.05,
      length: 2.2,
      at: [x, haltTop + 1.1, maxZ - 0.1],
      segments: 8,
    });
  });
  addGableRoof(builder, {
    width: maxX - minX,
    depth: 1.0,
    rise: 0.35,
    at: [0, haltTop + 2.2, maxZ - 0.25],
    colour: roofTin,
    finish: "paint",
    overhang: 0.15,
  });
  if (builder.isFar) {
    return;
  }
  /* A name board, a bell and sacks waiting to go */
  builder.box(
    "paint",
    wagonGreen,
    [1.4, 0.26, 0.05],
    [0, haltTop + 1.95, maxZ - 0.1],
  );
  builder.box(
    "paint",
    palette.cream,
    [1.1, 0.08, 0.02],
    [0, haltTop + 1.95, maxZ - 0.07],
  );
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0.01, 0],
      [0.09, 0.02],
      [0.07, 0.12],
      [0.02, 0.18],
    ],
    [maxX - 0.25, haltTop + 1.55, maxZ - 0.15],
    "y",
    10,
  );
  [-1.2, -0.9].forEach((x, index) => {
    builder.sphere(
      "matte",
      sack,
      0.2,
      [x, haltTop + 0.2, maxZ - 0.3 + index * 0.05],
      [1, 1.2, 0.9],
      8,
    );
  });
};

/* -------------------------------------------------------------- */
/* The drying floor and the workshop                                */
/* -------------------------------------------------------------- */

const buildDryingFloor = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = drying;
  const middleX = (minX + maxX) / 2;
  const middleZ = (minZ + maxZ) / 2;
  builder.box(
    "matte",
    plankDark,
    [maxX - minX, dryingTop, maxZ - minZ],
    [middleX, dryingTop / 2, middleZ],
  );
  builder.box(
    "matte",
    plank,
    [
      dryingStep.maxX - dryingStep.minX,
      dryingStepTop,
      dryingStep.maxZ - dryingStep.minZ,
    ],
    [
      (dryingStep.minX + dryingStep.maxX) / 2,
      dryingStepTop / 2,
      (dryingStep.minZ + dryingStep.maxZ) / 2,
    ],
  );
  /* Beans spread in two big trays, drying brown in the sun */
  [-0.55, 0.55].forEach((dx) => {
    builder.box(
      "matte",
      plank,
      [0.95, 0.06, 1.6],
      [middleX + dx, dryingTop + 0.03, middleZ],
    );
    builder.box(
      "matte",
      bean,
      [0.85, 0.03, 1.5],
      [middleX + dx, dryingTop + 0.07, middleZ],
    );
  });
  /* A roof on wheels, rolled back off the beans */
  [minX + 0.05, maxX - 0.05].forEach((x) => {
    builder.box("matte", barkDark, [0.12, 2.1, 0.12], [x, 1.05, minZ - 0.6]);
    builder.box("matte", barkDark, [0.12, 0.12, 1.6], [x, 2.05, minZ - 0.1]);
  });
  addGableRoof(builder, {
    width: maxX - minX,
    depth: 1.3,
    rise: 0.3,
    at: [middleX, 2.15, minZ - 0.4],
    colour: roofTin,
    finish: "paint",
  });
  if (builder.isFar) {
    return;
  }
  for (let ridge = 0; ridge < 5; ridge++) {
    builder.box(
      "matte",
      shade(bean, 0.8),
      [0.85, 0.02, 0.05],
      [middleX - 0.55, dryingTop + 0.09, minZ + 0.3 + ridge * 0.35],
    );
    builder.box(
      "matte",
      shade(bean, 0.8),
      [0.85, 0.02, 0.05],
      [middleX + 0.55, dryingTop + 0.09, minZ + 0.45 + ridge * 0.35],
    );
  }
  /* A wooden rake, and sacks of dried beans */
  builder.bar(
    "matte",
    plank,
    [maxX - 0.3, dryingTop + 0.05, minZ + 0.3],
    [maxX - 0.2, dryingTop + 0.25, maxZ - 0.4],
    0.04,
    4,
  );
  builder.box(
    "matte",
    plankDark,
    [0.4, 0.06, 0.06],
    [maxX - 0.3, dryingTop + 0.06, minZ + 0.28],
  );
  [0, 1, 2].forEach((index) => {
    builder.sphere(
      "matte",
      sack,
      0.22,
      [minX - 0.3, 0.24, minZ + 0.4 + index * 0.5],
      [1, 1.15, 0.9],
      8,
    );
    builder.box(
      "matte",
      shade(sack, 0.8),
      [0.3, 0.04, 0.3],
      [minX - 0.3, 0.48, minZ + 0.4 + index * 0.5],
    );
  });
};

const buildWorkshop = (builder: AttractionBuilder) => {
  const { x, z, width, depth } = workshop;
  const height = 1.8;
  /* Limewashed walls on three sides; the front is an open counter */
  builder.box(
    "matte",
    wallLime,
    [width, height, 0.15],
    [x, height / 2, z - depth / 2],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      wallLime,
      [0.15, height, depth],
      [x + side * (width / 2), height / 2, z],
    );
  });
  builder.box("matte", wallLime, [width, 0.9, 0.15], [x, 0.45, z + depth / 2]);
  builder.box(
    "matte",
    plank,
    [width + 0.1, 0.07, 0.3],
    [x, 0.93, z + depth / 2 + 0.05],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      plankDark,
      [0.12, height, 0.12],
      [x + side * (width / 2), height / 2, z + depth / 2],
    );
  });
  addGableRoof(builder, {
    width: width + 0.3,
    depth: depth + 0.5,
    rise: 0.7,
    at: [x, height, z + 0.1],
    colour: roofTin,
    finish: "paint",
    overhang: 0.3,
  });
  /* The roasting oven's chimney */
  builder.box(
    "matte",
    palette.brick,
    [0.4, 1.4, 0.4],
    [x - 0.8, height + 0.5, z - 0.6],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    palette.darkBrick,
    [0.48, 0.1, 0.48],
    [x - 0.8, height + 1.2, z - 0.6],
  );
  /* A painted sign: a bar of chocolate */
  builder.box(
    "paint",
    chocolate,
    [1.2, 0.3, 0.04],
    [x, height + 0.2, z + depth / 2 + 0.6],
  );
  for (let square = 0; square < 4; square++) {
    builder.box(
      "paint",
      chocolateLight,
      [0.22, 0.18, 0.02],
      [x - 0.42 + square * 0.28, height + 0.2, z + depth / 2 + 0.63],
    );
  }
  /* On the counter: a pan of melted chocolate on a stove, and moulds */
  builder.box(
    "metal",
    palette.darkSteel,
    [0.5, 0.3, 0.4],
    [x - 0.6, 1.12, z + depth / 2 - 0.15],
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.2,
    length: 0.16,
    at: [x - 0.6, 1.35, z + depth / 2 - 0.15],
    segments: 14,
  });
  builder.cylinder("paint", chocolate, {
    radius: 0.18,
    length: 0.02,
    at: [x - 0.6, 1.42, z + depth / 2 - 0.15],
    segments: 14,
  });
  builder.box(
    "glow",
    "#ff8a3a",
    [0.3, 0.05, 0.02],
    [x - 0.6, 1.0, z + depth / 2 + 0.06],
  );
  for (let mould = 0; mould < 3; mould++) {
    builder.box(
      "paint",
      palette.white,
      [0.26, 0.04, 0.18],
      [x + 0.2 + mould * 0.32, 0.99, z + depth / 2 + 0.02],
    );
    builder.box(
      "paint",
      mould === 2 ? chocolateLight : chocolate,
      [0.22, 0.03, 0.14],
      [x + 0.2 + mould * 0.32, 1.02, z + depth / 2 + 0.02],
    );
  }
  /* Shelves of jars and cocoa tins on the back wall */
  [1.1, 1.5].forEach((up) => {
    builder.box(
      "matte",
      plank,
      [width - 0.4, 0.04, 0.25],
      [x, up, z - depth / 2 + 0.2],
    );
    for (let jar = 0; jar < 5; jar++) {
      builder.cylinder("paint", jar % 2 === 0 ? podRed : podYellow, {
        radius: 0.07,
        length: 0.16,
        at: [x - 0.8 + jar * 0.4, up + 0.1, z - depth / 2 + 0.2],
        segments: 8,
      });
    }
  });
  /* The roasting oven, glowing */
  builder.box("matte", palette.brick, [0.7, 0.8, 0.6], [x - 0.8, 0.4, z - 0.5]);
  builder.box("glow", "#ff7a2a", [0.3, 0.2, 0.02], [x - 0.8, 0.35, z - 0.19]);
};

/* -------------------------------------------------------------- */
/* Around the farm                                                  */
/* -------------------------------------------------------------- */

const buildGrounds = (builder: AttractionBuilder) => {
  builder.cylinder("matte", soil, {
    radius: loopRadius - 0.5,
    length: 0.03,
    at: [loopAt.x, 0.015, loopAt.z],
    segments: builder.segments(32, 12),
  });
  /* Paths of trodden earth across the farm */
  builder.box("matte", path, [1.2, 0.03, 4.2], [0, 0.03, 3.6]);
  builder.box("matte", path, [5.0, 0.03, 1.0], [0.6, 0.03, -0.9], [0, 0.35, 0]);
  if (builder.isFar) {
    return;
  }
  /* A hitching post and trough for the donkey, outside the loop */
  builder.box(
    "matte",
    plankDark,
    [1.4, 0.08, 0.08],
    [donkeyAt[0], 0.9, donkeyAt[2] - 0.7],
  );
  [-0.6, 0.6].forEach((dx) => {
    builder.cylinder("matte", plankDark, {
      radius: 0.06,
      length: 0.95,
      at: [donkeyAt[0] + dx, 0.47, donkeyAt[2] - 0.7],
      segments: 6,
    });
  });
  builder.box(
    "matte",
    plank,
    [0.9, 0.3, 0.4],
    [donkeyAt[0] + 0.1, 0.15, donkeyAt[2] - 1.15],
  );
  builder.box(
    "water",
    palette.water,
    [0.8, 0.02, 0.3],
    [donkeyAt[0] + 0.1, 0.29, donkeyAt[2] - 1.15],
  );
  /* Baskets of freshly picked pods, and a split pod showing its beans */
  [
    [-1.0, 3.4],
    [2.9, 2.9],
  ].forEach(([x, z], index) => {
    builder.lathe(
      "matte",
      "#c49a5a",
      [
        [0.01, 0],
        [0.25, 0.03],
        [0.3, 0.3],
        [0.32, 0.34],
      ],
      [x, 0, z],
      "y",
      10,
    );
    for (let pod = 0; pod < 4; pod++) {
      builder.sphere(
        "paint",
        podColours[(pod + index) % 4],
        0.09,
        [x + (pod - 1.5) * 0.12, 0.34, z + (pod % 2) * 0.1 - 0.05],
        [1.5, 0.75, 0.75],
        6,
      );
    }
  });
  builder.sphere(
    "paint",
    podYellow,
    0.11,
    [-0.7, 0.06, 3.9],
    [0.8, 0.5, 1.6],
    8,
  );
  builder.sphere(
    "paint",
    palette.cream,
    0.08,
    [-0.7, 0.1, 3.9],
    [0.7, 0.5, 1.4],
    6,
  );
};

/* -------------------------------------------------------------- */
/* Moving parts                                                    */
/* -------------------------------------------------------------- */

const buildWagon = (builder: AttractionBuilder) => {
  /* Facing along the loop: its local z runs along the track */
  builder.box("paint", wagonGreen, [0.62, 0.38, 0.95], [0, 0.42, 0]);
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        shade(wagonGreen, 0.8),
        [0.66, 0.05, 0.05],
        [0, 0.6, side * 0.47],
      );
      builder.box(
        "paint",
        shade(wagonGreen, 0.8),
        [0.05, 0.05, 0.99],
        [side * 0.32, 0.6, 0],
      );
    });
  }
  builder.box("metal", palette.darkSteel, [0.5, 0.08, 1.05], [0, 0.2, 0]);
  [-0.3, 0.3].forEach((along) => {
    [-1, 1].forEach((side) => {
      builder.cylinder("metal", palette.black, {
        radius: 0.1,
        length: 0.05,
        at: [side * gauge, 0.14, along],
        axis: "x",
        segments: builder.isFar ? 6 : 10,
      });
    });
  });
  /* Heaped with pods */
  for (let pod = 0; pod < (builder.isFar ? 2 : 7); pod++) {
    builder.sphere(
      "paint",
      podColours[pod % 4],
      0.1,
      [
        (pod % 2) * 0.16 - 0.08,
        0.66 + Math.floor(pod / 4) * 0.08,
        -0.32 + (pod % 4) * 0.21,
      ],
      [0.75, 0.75, 1.5],
      6,
    );
  }
  if (!builder.isFar) {
    builder.box("paint", podYellow, [0.63, 0.05, 0.96], [0, 0.6, 0]);
    builder.box(
      "metal",
      palette.darkSteel,
      [0.08, 0.06, 0.12],
      [0, 0.22, 0.55],
    );
    builder.box(
      "metal",
      palette.darkSteel,
      [0.08, 0.06, 0.12],
      [0, 0.22, -0.55],
    );
  }
};

const buildFountain = (builder: AttractionBuilder) => {
  /* Three tiers of melted chocolate, tumbling down */
  builder.cylinder("paint", chocolate, {
    radius: 0.1,
    length: 1.0,
    at: [0, 0.5, 0],
    segments: 10,
  });
  [
    [0.32, 0.65],
    [0.24, 0.9],
    [0.15, 1.1],
  ].forEach(([radius, height]) => {
    builder.lathe(
      "paint",
      chocolateLight,
      [
        [0.02, 0],
        [radius, 0.03],
        [radius + 0.03, 0.08],
      ],
      [0, height, 0],
      "y",
      14,
    );
    builder.cylinder("paint", chocolate, {
      radius: radius + 0.02,
      radiusEnd: radius - 0.04,
      length: 0.25,
      at: [0, height - 0.1, 0],
      segments: 14,
      isOpen: true,
    });
  });
  builder.sphere("paint", chocolate, 0.1, [0, 1.2, 0], [1, 0.7, 1], 10);
};

const buildFountainTable = (builder: AttractionBuilder) => {
  const { x, z } = fountainAt;
  builder.cylinder("matte", plank, {
    radius: 0.55,
    length: 0.06,
    at: [x, 0.5, z],
    segments: 16,
  });
  builder.cylinder("matte", plankDark, {
    radius: 0.07,
    length: 0.5,
    at: [x, 0.25, z],
    segments: 8,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.42,
    length: 0.06,
    at: [x, 0.56, z],
    segments: 16,
  });
  if (builder.isFar) {
    return;
  }
  /* Strawberries and bananas to dip */
  for (let fruit = 0; fruit < 8; fruit++) {
    const angle = (fruit / 8) * Math.PI * 2;
    builder.sphere(
      "paint",
      fruit % 2 === 0 ? podRed : "#f3e08a",
      0.05,
      [x + Math.sin(angle) * 0.36, 0.62, z + Math.cos(angle) * 0.36],
      [1, 1.2, 1],
      6,
    );
  }
};

const buildMill = (builder: AttractionBuilder) => {
  /* Two stone rollers that grind roasted nibs into smooth chocolate */
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", palette.stone, {
      radius: 0.24,
      length: 0.18,
      at: [side * 0.3, 0.75, 0],
      axis: "x",
      segments: 14,
    });
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.03,
    length: 0.8,
    at: [0, 0.75, 0],
    axis: "x",
    segments: 6,
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 0.6,
    at: [0, 0.95, 0],
    segments: 8,
  });
};

const buildMillBase = (builder: AttractionBuilder) => {
  const { x, z } = millAt;
  builder.cylinder("metal", palette.steel, {
    radius: 0.62,
    length: 0.55,
    at: [x, 0.27, z],
    segments: 18,
  });
  builder.cylinder("paint", chocolate, {
    radius: 0.55,
    length: 0.02,
    at: [x, 0.53, z],
    segments: 18,
  });
  if (!builder.isFar) {
    builder.torus(
      "metal",
      palette.darkSteel,
      0.62,
      0.03,
      [x, 0.55, z],
      "y",
      18,
    );
    builder.box(
      "metal",
      palette.darkSteel,
      [0.3, 0.3, 0.3],
      [x + 0.75, 0.15, z],
    );
  }
};

const buildDonkey = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    donkeyGrey,
    0.35,
    [0, 0.85, 0],
    [0.75, 0.75, 1.35],
    10,
  );
  builder.bar("matte", donkeyGrey, [0, 0.95, 0.4], [0, 1.25, 0.62], 0.2, 8);
  builder.sphere(
    "matte",
    donkeyGrey,
    0.16,
    [0, 1.3, 0.75],
    [0.8, 0.85, 1.3],
    8,
  );
  builder.sphere(
    "matte",
    palette.cream,
    0.1,
    [0, 1.24, 0.92],
    [0.85, 0.75, 0.9],
    7,
  );
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", donkeyGrey, {
      radius: 0.04,
      radiusEnd: 0.015,
      length: 0.3,
      at: [side * 0.08, 1.55, 0.66],
      segments: 5,
    });
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [side * 0.1, 1.36, 0.84],
      [1, 1, 1],
      4,
    );
    [-0.3, 0.3].forEach((along) => {
      builder.cylinder("matte", shade(donkeyGrey, 0.85), {
        radius: 0.05,
        length: 0.6,
        at: [side * 0.13, 0.32, along],
        segments: 6,
      });
    });
    /* Panniers of pods on its back */
    builder.box("matte", sack, [0.12, 0.3, 0.45], [side * 0.3, 0.85, 0]);
  });
  builder.box("paint", podRed, [0.5, 0.04, 0.5], [0, 1.1, 0]);
  builder.cylinder("matte", shade(donkeyGrey, 0.8), {
    radius: 0.03,
    length: 0.4,
    at: [0, 0.75, -0.55],
    segments: 5,
  });
};

const buildPicker = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#3f6fa8", {
    radius: 0.13,
    radiusEnd: 0.16,
    length: 0.5,
    at: [0, 0.55, 0],
    segments: 8,
  });
  builder.cylinder("matte", "#4a3a2c", {
    radius: 0.08,
    length: 0.32,
    at: [0, 0.16, 0],
    segments: 6,
  });
  builder.sphere("matte", "#8a5a3a", 0.12, [0, 0.92, 0], [1, 1.05, 1], 8);
  builder.cylinder("matte", "#e8d49a", {
    radius: 0.22,
    radiusEnd: 0.1,
    length: 0.08,
    at: [0, 1.04, 0],
    segments: 10,
  });
  builder.lathe(
    "matte",
    "#c49a5a",
    [
      [0.01, 0],
      [0.15, 0.02],
      [0.18, 0.28],
    ],
    [0, 0.48, -0.22],
    "y",
    8,
  );
  builder.sphere("paint", podOrange, 0.07, [0, 0.78, -0.22], [1, 0.8, 1], 6);
};

/* -------------------------------------------------------------- */
/* The ride                                                        */
/* -------------------------------------------------------------- */

const wagonRide = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(wagonMotion, seconds, { copy: 0 });
  const [x, y, z] = moveWithPose(
    wagonPivot,
    [wagonPivot[0], 0.62, wagonPivot[2]],
    pose,
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? wagonStart : wagonFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1],
  };
};

export const cacaoFarmModel: NewLandAttractionModel = {
  kind: "cacao-farm",
  islandId: "jungle-reach",
  name: "Cacao Farm",
  fact: "Chocolate is made from the seeds of the cacao tree, which grow inside big pods straight out of its trunk. The cocoa butter in chocolate melts at just below the temperature of your body, so a bar is solid in its wrapper but melts into a runny liquid on your tongue.",
  curriculumLink:
    "Science, Year 4: states of matter. Observe that some materials change state when they are heated or cooled (chocolate melting from a solid to a liquid).",
  footprint: 10,
  setting: "inland",
  signSpot: signAt,
  padColour: "#5c9140",
  build: (builder) => {
    buildGrounds(builder);
    buildRailway(builder);
    buildHalt(builder);
    buildDryingFloor(builder);
    buildWorkshop(builder);
    buildFountainTable(builder);
    buildMillBase(builder);
    cacaoTrees.forEach((tree, index) => {
      addCacaoTree(builder, tree, index);
    });
    addBanana(builder, -6.6, -2.6, 2.6);
    addBanana(builder, 6.4, -3.0, 2.4);
    addBanana(builder, 6.6, 2.6, 2.2);
    addBanana(builder, -2.0, -7.0, 2.5);
    addBanana(builder, 3.4, -6.8, 2.3);
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "cocoa wagons",
      pivot: wagonPivot,
      build: buildWagon,
      motion: wagonMotion,
    },
    {
      name: "chocolate fountain",
      pivot: [fountainAt.x, 0.56, fountainAt.z],
      build: buildFountain,
      motion: { kind: "splash", reach: 4, period: 1.6 },
    },
    {
      name: "grinding mill",
      pivot: [millAt.x, 0, millAt.z],
      build: buildMill,
      motion: { kind: "whirl", axis: "y", idle: 0.4, speed: 4, reach: 5 },
    },
    {
      name: "donkey",
      pivot: donkeyAt,
      build: buildDonkey,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.08,
        period: 1.2,
      },
    },
  ],
  wanderers: [
    {
      name: "pickers",
      build: buildPicker,
      count: 2,
      centre: { x: -0.6, z: 0.6 },
      radius: 2.2,
      speed: 0.35,
    },
  ],
  smoke: [
    {
      at: [workshop.x - 0.8, 3.4, workshop.z - 0.6],
      colour: "#cfc6bb",
      puffs: 7,
      size: 0.3,
      rise: 2.4,
      spread: 0.35,
    },
  ],
  decks: [
    buildFlatDeck(halt, haltTop, "bridge"),
    buildFlatDeck(drying, dryingTop, "bridge"),
    buildFlatDeck(dryingStep, dryingStepTop, "bridge"),
  ],
  rides: [
    {
      id: "cocoa-wagon",
      name: "the cocoa wagon",
      start: wagonStart,
      reach: 0.6,
      seconds: 16,
      finish: wagonFinish,
      follow: wagonRide,
    },
  ],
  blockers: [
    { x: millAt.x, z: millAt.z, radius: 0.7 },
    { x: fountainAt.x, z: fountainAt.z, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Melt some chocolate",
    news: "Mmm! The chocolate melted from a solid into a runny liquid as it warmed up, then set solid again in the moulds as it cooled.",
  },
};
