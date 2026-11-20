import { CylinderGeometry, TorusGeometry } from "three";
import {
  addBench,
  addBush,
  addDoor,
  addFence,
  addLampPost,
  addSignBoard,
  addTree,
  addWindow,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Triple,
} from "./attraction-kit.js";
import {
  addChimney,
  addGabledBlock,
  addLettering,
  addPitchedRoof,
  addPlanter,
  addQuoins,
  addSash,
  addTurned,
} from "./post-office-parts.js";

const cotswold = "#cdb68a";
const dressing = "#e8dcbf";
const joinery = "#3f5f55";
const awningBerry = "#8c2f3c";
const awningCream = "#f3e8d0";
const shopGlow = "#f7d896";
const crust = "#c4843f";
const darkCrust = "#9c5f2a";

const centreX = 0;
const centreZ = -1.6;
const width = 5.2;
const depth = 3.4;
const eaves = 2.4;
const rise = 1.8;
const front = centreZ + depth / 2;
const back = centreZ - depth / 2;
const left = centreX - width / 2;
const right = centreX + width / 2;

const bowAt = { x: -1.25, z: front };
const bowRadius = 0.82;
const bowSill = 0.55;
const bowTop = 1.62;

const chimneyBase: Triple = [right - 0.32, eaves + rise - 0.55, centreZ];
const chimneyHeight = 1.4;
const chimneyTop: Triple = [
  chimneyBase[0],
  chimneyBase[1] + chimneyHeight + 0.45,
  chimneyBase[2],
];
const logPile = { x: -0.2, z: back - 0.5 };

/* Loaves and cakes */

const addLoaf = (
  builder: AttractionBuilder,
  at: Triple,
  size = 1,
  turn = 0,
) => {
  builder.sphere(
    "matte",
    crust,
    0.11 * size,
    [at[0], at[1] + 0.06 * size, at[2]],
    [1.45, 0.75, 1],
    builder.segments(8, 5),
  );
  if (!builder.isFar) {
    [-0.05, 0.05].forEach((score) => {
      builder.box(
        "matte",
        darkCrust,
        [0.025, 0.02, 0.16 * size],
        [
          at[0] + score * size * Math.cos(turn),
          at[1] + 0.135 * size,
          at[2] - score * size * Math.sin(turn),
        ],
        [0, turn + 0.4, 0],
      );
    });
  }
};

const addCake = (
  builder: AttractionBuilder,
  at: Triple,
  icing: string,
  radius = 0.13,
) => {
  builder.cylinder("matte", "#e9c48c", {
    radius,
    length: 0.1,
    at: [at[0], at[1] + 0.05, at[2]],
    segments: 12,
  });
  builder.cylinder("paint", icing, {
    radius: radius + 0.008,
    length: 0.05,
    at: [at[0], at[1] + 0.12, at[2]],
    segments: 12,
  });
  builder.cylinder("paint", palette.white, {
    radius: radius + 0.03,
    length: 0.015,
    at: [at[0], at[1] + 0.008, at[2]],
    segments: 12,
  });
  if (!builder.isFar) {
    builder.sphere(
      "paint",
      "#c8102e",
      0.03,
      [at[0], at[1] + 0.16, at[2]],
      [1, 1, 1],
      6,
    );
  }
};

const addBaguette = (builder: AttractionBuilder, from: Triple, to: Triple) => {
  builder.bar("matte", crust, from, to, 0.07, 8);
  builder.sphere("matte", crust, 0.035, from, [1, 1, 1], 6);
  builder.sphere("matte", crust, 0.035, to, [1, 1, 1], 6);
};

/* The bow window */

const buildBowWindow = (builder: AttractionBuilder) => {
  const { x, z } = bowAt;
  const half = (
    radius: number,
    height: number,
    y: number,
    topRadius = radius,
  ) =>
    new CylinderGeometry(
      topRadius,
      radius,
      height,
      builder.segments(16, 8),
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    ).translate(0, y, 0);
  addTurned(
    builder,
    "matte",
    dressing,
    half(bowRadius + 0.04, bowSill, bowSill / 2),
    [x, 0, z],
    [0, 0, 0],
  );
  addTurned(
    builder,
    "paint",
    palette.cream,
    half(bowRadius + 0.09, 0.06, bowSill + 0.03),
    [x, 0, z],
    [0, 0, 0],
  );
  builder.box(
    "glow",
    shopGlow,
    [bowRadius * 2, bowTop - bowSill, 0.04],
    [x, (bowTop + bowSill) / 2, z + 0.02],
  );
  addTurned(
    builder,
    "paint",
    joinery,
    half(bowRadius + 0.1, 0.16, bowTop + 0.08),
    [x, 0, z],
    [0, 0, 0],
  );
  addTurned(
    builder,
    "metal",
    "#6b7378",
    half(bowRadius + 0.14, 0.26, bowTop + 0.29, 0.12),
    [x, 0, z],
    [0, 0, 0],
  );
  const mullions = builder.isFar ? 3 : 7;
  for (let bar = 0; bar < mullions; bar++) {
    const angle = -Math.PI / 2 + (Math.PI * (bar + 0.5)) / mullions;
    builder.box(
      "paint",
      palette.cream,
      [0.045, bowTop - bowSill, 0.045],
      [
        x + Math.sin(angle) * bowRadius,
        (bowTop + bowSill) / 2,
        z + Math.cos(angle) * bowRadius,
      ],
      [0, angle, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  addTurned(
    builder,
    "paint",
    palette.cream,
    new TorusGeometry(bowRadius, 0.025, 4, 16, Math.PI),
    [x, 1.28, z],
    [Math.PI / 2, 0, 0],
  );
  const shelf = bowSill + 0.06;
  addLoaf(builder, [x - 0.45, shelf, z + 0.35], 1, 0.5);
  addLoaf(builder, [x + 0.02, shelf, z + 0.6], 1.1);
  addLoaf(builder, [x + 0.48, shelf, z + 0.35], 1, -0.5);
  addCake(builder, [x - 0.12, shelf, z + 0.25], "#f2b6c6");
  addCake(builder, [x + 0.26, shelf, z + 0.12], "#f6efe0", 0.1);
  builder.cylinder("paint", palette.cream, {
    radius: 0.45,
    length: 0.03,
    at: [x, 1.08, z + 0.08],
    segments: 14,
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.015,
    length: 0.44,
    at: [x, 0.84, z + 0.08],
    segments: 5,
  });
  addCake(builder, [x - 0.2, 1.095, z + 0.18], "#7a4a2a", 0.1);
  addLoaf(builder, [x + 0.18, 1.095, z + 0.2], 0.8);
  addBaguette(builder, [x - 0.55, 0.65, z + 0.05], [x - 0.3, 1.4, z + 0.08]);
};

/* The shop front: door, window, fascia and awning */

const buildShopFront = (builder: AttractionBuilder) => {
  const doorX = 0.45;
  const windowX = 1.65;
  addDoor(builder, {
    at: [doorX, 0.12, front + 0.02],
    width: 0.62,
    height: 1.2,
    colour: joinery,
    frame: palette.cream,
  });
  builder.box(
    "glow",
    shopGlow,
    [0.4, 0.3, 0.02],
    [doorX, 0.12 + 0.95, front + 0.065],
  );
  builder.box("matte", dressing, [0.9, 0.12, 0.4], [doorX, 0.06, front + 0.18]);
  builder.box("paint", joinery, [1.3, 0.5, 0.14], [windowX, 0.3, front + 0.07]);
  builder.box(
    "glow",
    shopGlow,
    [1.2, 0.92, 0.03],
    [windowX, 1.05, front + 0.02],
  );
  builder.box(
    "paint",
    palette.cream,
    [1.36, 0.06, 0.3],
    [windowX, 0.57, front + 0.12],
  );
  [-0.62, 0, 0.62].forEach((dx) => {
    builder.box(
      "paint",
      palette.cream,
      [0.05, 0.95, 0.06],
      [windowX + dx, 1.05, front + 0.2],
    );
  });
  builder.box(
    "paint",
    palette.cream,
    [1.3, 0.06, 0.06],
    [windowX, 1.52, front + 0.2],
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      palette.cream,
      [1.26, 0.035, 0.05],
      [windowX, 1.3, front + 0.2],
    );
    addLoaf(builder, [windowX - 0.35, 0.6, front + 0.12], 0.9);
    addLoaf(builder, [windowX + 0.32, 0.6, front + 0.12], 0.9, 0.3);
    addCake(builder, [windowX, 0.6, front + 0.12], "#f2b6c6", 0.11);
    builder.box(
      "paint",
      palette.cream,
      [1.1, 0.03, 0.12],
      [windowX, 1.0, front + 0.08],
    );
    for (let bun = 0; bun < 5; bun++) {
      builder.sphere(
        "matte",
        bun % 2 === 0 ? crust : "#d9a35c",
        0.065,
        [windowX - 0.4 + bun * 0.2, 1.05, front + 0.09],
        [1, 0.7, 1],
        8,
      );
    }
  }
  const fasciaY = 1.92;
  const fasciaX = (0 + right) / 2 - 0.05;
  builder.box(
    "paint",
    joinery,
    [2.45, 0.34, 0.1],
    [fasciaX, fasciaY, front + 0.06],
  );
  builder.box(
    "paint",
    palette.cream,
    [2.55, 0.04, 0.13],
    [fasciaX, fasciaY + 0.19, front + 0.07],
  );
  addLettering(builder, "BAKERY", {
    at: [fasciaX, fasciaY, front + 0.12],
    height: 0.18,
    colour: "#e9c46a",
  });
  const awningFrom = 0.0;
  const awningTo = 2.42;
  const stripes = builder.isFar ? 4 : 12;
  const reach = 0.95;
  const drop = 0.38;
  const top = 1.7;
  const slope = Math.atan2(drop, reach);
  const length = Math.hypot(drop, reach);
  for (let stripe = 0; stripe < stripes; stripe++) {
    const stripeWidth = (awningTo - awningFrom) / stripes;
    const stripeX = awningFrom + stripeWidth * (stripe + 0.5);
    const colour = stripe % 2 === 0 ? awningBerry : awningCream;
    builder.box(
      "matte",
      colour,
      [stripeWidth + 0.002, 0.03, length],
      [stripeX, top - drop / 2, front + reach / 2],
      [slope, 0, 0],
    );
    builder.box(
      "matte",
      colour,
      [stripeWidth + 0.002, 0.2, 0.025],
      [stripeX, top - drop - 0.09, front + reach + 0.005],
    );
    if (!builder.isFar) {
      builder.add(
        "matte",
        colour,
        new CylinderGeometry(
          stripeWidth / 2,
          stripeWidth / 2,
          0.025,
          8,
          1,
          false,
          Math.PI / 2,
          Math.PI,
        ).rotateX(Math.PI / 2),
        { at: [stripeX, top - drop - 0.19, front + reach + 0.005] },
        undefined,
      );
    }
  }
  builder.box(
    "paint",
    joinery,
    [awningTo - awningFrom + 0.06, 0.07, 0.07],
    [(awningFrom + awningTo) / 2, top + 0.02, front + 0.04],
  );
  [awningFrom + 0.05, awningTo - 0.05].forEach((x) => {
    builder.bar(
      "metal",
      palette.black,
      [x, top - 0.55, front],
      [x, top - drop - 0.03, front + reach - 0.03],
      0.025,
      5,
    );
  });
};

/* The cottage */

const buildCottage = (builder: AttractionBuilder) => {
  addGabledBlock(builder, {
    centre: { x: centreX, z: centreZ },
    width,
    depth,
    eaves,
    rise,
    colour: cotswold,
  });
  addPitchedRoof(builder, {
    centre: { x: centreX, z: centreZ },
    width,
    depth,
    eaves,
    rise,
    colour: palette.roofTile,
    overhang: 0.26,
    courses: 9,
    ridgeColour: "#7b3a27",
  });
  builder.box(
    "matte",
    shade(cotswold, 0.82),
    [width + 0.06, 0.22, depth + 0.06],
    [centreX, 0.11, centreZ],
  );
  addQuoins(builder, {
    corners: [
      { x: left, z: front },
      { x: right, z: front },
      { x: left, z: back },
      { x: right, z: back },
    ],
    height: eaves,
    colour: dressing,
    from: 0.22,
  });
  addChimney(builder, chimneyBase, {
    height: chimneyHeight,
    width: 0.55,
    depth: 0.7,
    colour: shade(cotswold, 0.9),
    pots: 1,
  });
  const dormerZ = front - 0.62;
  const dormerX = -1.25;
  addGabledBlock(builder, {
    centre: { x: dormerX, z: dormerZ },
    width: 1.24,
    depth: 1.0,
    eaves: eaves + 0.82,
    rise: 0.42,
    base: eaves - 0.2,
    colour: cotswold,
    turn: Math.PI / 2,
  });
  addPitchedRoof(builder, {
    centre: { x: dormerX, z: dormerZ - 0.08 },
    width: 1.2,
    depth: 1.0,
    eaves: eaves + 0.82,
    rise: 0.42,
    colour: palette.roofTile,
    overhang: 0.14,
    turn: Math.PI / 2,
    courses: 3,
    ridgeColour: "#7b3a27",
  });
  addSash(builder, {
    at: [dormerX, eaves + 0.42, front + 0.02],
    width: 0.56,
    height: 0.6,
    isLit: true,
    frame: palette.cream,
    lintel: dressing,
  });
  addSash(builder, {
    at: [1.25, eaves + 0.6, centreZ + 0.3],
    width: 0.5,
    height: 0.5,
    frame: palette.cream,
    lintel: dressing,
    turn: 0,
  });
  [-1.3, 1.1].forEach((dx) => {
    addSash(builder, {
      at: [centreX + dx, 1.25, back - 0.02],
      width: 0.62,
      height: 0.72,
      turn: Math.PI,
      isLit: true,
      frame: palette.cream,
      lintel: dressing,
    });
  });
  addSash(builder, {
    at: [left - 0.02, 1.25, centreZ],
    width: 0.62,
    height: 0.72,
    turn: -Math.PI / 2,
    isLit: true,
    frame: palette.cream,
    lintel: dressing,
  });
  addSash(builder, {
    at: [left - 0.02, eaves + 0.75, centreZ],
    width: 0.5,
    height: 0.55,
    turn: -Math.PI / 2,
    frame: palette.cream,
    lintel: dressing,
  });
  addWindow(builder, {
    at: [right + 0.02, 1.25, centreZ - 0.6],
    width: 0.55,
    height: 0.65,
    turn: Math.PI / 2,
    frame: palette.cream,
    isLit: true,
  });
  addDoor(builder, {
    at: [right + 0.02, 0.12, centreZ + 0.55],
    colour: joinery,
    frame: palette.cream,
    turn: Math.PI / 2,
  });
};

/* Outside: baskets, chalkboard, bench, logs */

const buildChalkboard = (builder: AttractionBuilder, at: Triple) => {
  const [x, , z] = at;
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.52, 0.72, 0.035],
      [x, 0.35, z + side * 0.1],
      [side * -0.16, 0, 0],
    );
    builder.box(
      "matte",
      "#2a2e2c",
      [0.42, 0.6, 0.02],
      [x, 0.36, z + side * 0.12],
      [side * -0.16, 0, 0],
    );
  });
  if (builder.isFar) {
    return;
  }
  [0.55, 0.45, 0.36, 0.27, 0.18].forEach((up, line) => {
    builder.box(
      "matte",
      line === 0 ? "#f2c94c" : "#eeeeea",
      [line === 0 ? 0.3 : 0.22 + (line % 2) * 0.08, 0.025, 0.01],
      [x, up, z + 0.135 - (up - 0.36) * 0.16],
      [-0.16, 0, 0],
    );
  });
};

const addBreadBasket = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.lathe(
    "matte",
    "#b08a52",
    [
      [0, 0],
      [0.22, 0],
      [0.27, 0.16],
      [0.29, 0.18],
      [0.25, 0.16],
      [0, 0.14],
    ],
    at,
    "y",
    builder.segments(14, 8),
  );
  if (!builder.isFar) {
    builder.torus("matte", "#8d6a3a", 0.255, 0.02, [x, y + 0.08, z], "y", 14);
  }
  addLoaf(builder, [x - 0.08, y + 0.12, z + 0.05], 0.9, 0.4);
  addLoaf(builder, [x + 0.1, y + 0.13, z - 0.06], 0.85, -0.6);
  addBaguette(
    builder,
    [x - 0.15, y + 0.15, z - 0.12],
    [x + 0.2, y + 0.3, z - 0.1],
  );
};

const buildOutside = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    "#c2b59a",
    [width + 0.6, 0.04, 2.4],
    [centreX, 0.02, front + 1.2],
  );
  builder.box(
    "matte",
    "#c2b59a",
    [1.3, 0.035, 4.2],
    [0.45, 0.018, front + 4.4],
  );
  if (!builder.isFar) {
    for (let row = 1; row < 3; row++) {
      builder.box(
        "matte",
        shade("#c2b59a", 0.9),
        [width + 0.6, 0.006, 0.03],
        [centreX, 0.042, front + row * 0.8],
      );
    }
    for (let column = 0; column < 8; column++) {
      builder.box(
        "matte",
        shade("#c2b59a", 0.9),
        [0.03, 0.006, 2.4],
        [left - 0.1 + column * 0.78, 0.042, front + 1.2],
      );
    }
  }
  builder.box(
    "matte",
    palette.paleTimber,
    [0.9, 0.06, 0.5],
    [3.25, 0.5, front + 0.5],
  );
  [-0.38, 0.38].forEach((dx) => {
    [-0.18, 0.18].forEach((dz) => {
      builder.box(
        "matte",
        palette.timber,
        [0.05, 0.5, 0.05],
        [3.25 + dx, 0.25, front + 0.5 + dz],
      );
    });
  });
  addBreadBasket(builder, [3.05, 0.53, front + 0.5]);
  addBreadBasket(builder, [3.5, 0.53, front + 0.48]);
  addBreadBasket(builder, [-3.15, 0, front + 0.9]);
  buildChalkboard(builder, [1.05, 0, front + 1.5]);
  addBench(builder, [-2.0, 0, front + 1.5]);
  addPlanter(builder, [-0.05, 0, front + 0.35], { radius: 0.22, flowers: 7 });
  addPlanter(builder, [2.55, 0, front + 0.35], { radius: 0.22, flowers: 7 });
  addLampPost(builder, [-3.3, 0, front + 2.2], 2.2);
  const { x: logX, z: logZ } = logPile;
  for (let row = 0; row < 3; row++) {
    const logs = 5 - row;
    for (let log = 0; log < logs; log++) {
      builder.cylinder("matte", log % 2 === 0 ? "#8a6a48" : "#7a5a3a", {
        radius: 0.12,
        length: 0.7,
        at: [logX - (logs - 1) * 0.12 + log * 0.24, 0.12 + row * 0.21, logZ],
        axis: "z",
        segments: 8,
      });
    }
  }
  addFence(builder, { x: -3.6, z: front + 2.6 }, { x: -1.0, z: front + 2.6 });
  addFence(builder, { x: 1.9, z: front + 2.6 }, { x: 4.6, z: front + 2.6 });
  addTree(builder, [-4.5, 0, -3.7], 1.05, "#4a9440");
  addTree(builder, [4.1, 0, -4.0], 0.95);
  addBush(builder, [-3.6, 0, -0.6], 0.5);
  addBush(builder, [3.7, 0, -1.6], 0.45, "#3a7d34");
  addBush(builder, [-4.6, 0, 2.0], 0.4, "#3a7d34");
  addSignBoard(builder, [-2.55, 0, front + 3.6], joinery);
};

export const bakeryModel: AttractionModel = {
  kind: "bakery",
  name: "Bakery",
  fact: "Baking is a change that cannot be undone. The heat of the oven turns soft dough into crusty bread, and nobody can turn a loaf back into flour, water and yeast again.",
  curriculumLink:
    "Science, Year 5: properties and changes of materials. Some changes, like baking, make new materials and cannot be reversed.",
  footprint: 7.2,
  setting: "inland",
  signSpot: { x: -2.55, z: front + 4.5 },
  build: (builder) => {
    buildCottage(builder);
    buildBowWindow(builder);
    buildShopFront(builder);
    buildOutside(builder);
  },
  smoke: [
    {
      at: chimneyTop,
      colour: "#ece8e2",
      puffs: 9,
      size: 0.3,
      rise: 3.4,
      spread: 0.9,
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: left + 0.55, z: front - 0.65 },
      { x: right - 0.55, z: front - 0.65 },
      1.0,
      0.9,
    ),
    ...listWallBlockers(
      { x: left + 0.55, z: back + 0.65 },
      { x: right - 0.55, z: back + 0.65 },
      1.0,
      0.9,
    ),
    { x: bowAt.x, z: bowAt.z + 0.3, radius: 0.85 },
    { x: 3.27, z: front + 0.5, radius: 0.55 },
    { x: -2.0, z: front + 1.4, radius: 0.5 },
    { x: logPile.x, z: logPile.z, radius: 0.6 },
  ],
};
