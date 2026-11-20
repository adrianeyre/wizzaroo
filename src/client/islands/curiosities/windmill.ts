import {
  addDoor,
  addFence,
  addSignBoard,
  addWindow,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const towerWhite = "#f1ece1";
const towerShadow = "#d9d2c3";
const capGreen = "#3f6b4a";
const capTrim = "#e9e2d2";
const sailCloth = "#f6f2e8";
const stockTimber = "#4a3424";
const plinthBrick = "#9a4b36";
const flourSack = "#e6dcc4";
const signColour = "#3f6b4a";

const towerBottom = 2.1;
const towerTop = 1.45;
const towerHeight = 7.2;
const capBase = towerHeight;
const hubAt: Triple = [0, towerHeight + 0.75, towerTop + 0.55];
const sailLength = 5.1;
const sailWidth = 1.05;

/** How wide the tower is at a height, as it tapers. */
const towerRadiusAt = (height: number): number =>
  towerBottom + (towerTop - towerBottom) * (height / towerHeight);

const buildTower = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 14 : 36;
  builder.cylinder("matte", plinthBrick, {
    radius: towerBottom + 0.22,
    radiusEnd: towerBottom + 0.12,
    length: 0.5,
    at: [0, 0.25, 0],
    segments,
  });
  builder.lathe(
    "matte",
    towerWhite,
    [
      [0, 0.5],
      [towerRadiusAt(0.5), 0.5],
      [towerRadiusAt(towerHeight), towerHeight],
      [0, towerHeight],
    ],
    [0, 0, 0],
    "y",
    segments,
  );
  if (builder.isFar) {
    return;
  }
  /* Bands of render round the tower, a little proud of it */
  [2.4, 4.6].forEach((height) => {
    builder.torus(
      "matte",
      towerShadow,
      towerRadiusAt(height) + 0.01,
      0.05,
      [0, height, 0],
      "y",
      40,
    );
  });
  /* A window on each floor, turned to face out of the tower */
  [
    { height: 2.9, turn: 0.9 },
    { height: 4.2, turn: -1.1 },
    { height: 5.6, turn: 2.6 },
    { height: 3.6, turn: Math.PI },
  ].forEach(({ height, turn }) => {
    const radius = towerRadiusAt(height) + 0.02;
    const at: Triple = [
      Math.sin(turn) * radius,
      height,
      Math.cos(turn) * radius,
    ];
    addWindow(builder, {
      at,
      width: 0.5,
      height: 0.68,
      turn,
      frame: palette.white,
    });
  });
};

/** The reefing stage: a railed gallery round the tower for reaching the sails. */
const buildGallery = (builder: AttractionBuilder) => {
  const height = 3.2;
  const radius = towerRadiusAt(height) + 0.75;
  builder.cylinder("matte", palette.darkTimber, {
    radius,
    length: 0.1,
    at: [0, height, 0],
    segments: builder.isFar ? 14 : 36,
  });
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "paint",
    palette.white,
    radius - 0.04,
    0.035,
    [0, height + 0.62, 0],
    "y",
    40,
  );
  listRingPoints(radius - 0.04, 20).forEach(({ x, z }) => {
    builder.box(
      "paint",
      palette.white,
      [0.045, 0.62, 0.045],
      [x, height + 0.31, z],
    );
  });
  listRingPoints(radius - 0.25, 8).forEach(({ x, z }) => {
    const inner = towerRadiusAt(height - 0.6) * 0.98;
    const scale = inner / Math.hypot(x, z);
    builder.bar(
      "matte",
      palette.darkTimber,
      [x * scale, height - 0.6, z * scale],
      [x, height - 0.04, z],
      0.07,
      6,
    );
  });
};

/** The boat-shaped cap that turns the sails into the wind, with its fantail. */
const buildCap = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 12 : 32;
  builder.cylinder("paint", capTrim, {
    radius: towerTop + 0.12,
    length: 0.22,
    at: [0, capBase + 0.11, 0],
    segments,
  });
  builder.lathe(
    "paint",
    capGreen,
    [
      [towerTop + 0.08, 0],
      [towerTop + 0.02, 0.35],
      [towerTop * 0.82, 0.85],
      [towerTop * 0.45, 1.3],
      [0.12, 1.55],
      [0, 1.6],
    ],
    [0, capBase + 0.22, 0],
    "y",
    segments,
  );
  builder.sphere(
    "paint",
    palette.brass,
    0.14,
    [0, capBase + 1.92, 0],
    [1, 1, 1],
    12,
  );
  /* The windshaft poking out of the cap to the hub */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.16,
    length: 0.8,
    at: [0, hubAt[1], hubAt[2] - 0.4],
    axis: "z",
    segments: 12,
  });
  if (builder.isFar) {
    return;
  }
  /* The fantail's frame at the back of the cap */
  const back = -(towerTop + 0.1);
  [-0.35, 0.35].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [side, capBase + 0.3, back],
      [side * 0.4, capBase + 1.55, back - 1.0],
      0.08,
      6,
    );
  });
  builder.bar(
    "matte",
    palette.darkTimber,
    [0, capBase + 1.2, back + 0.2],
    [0, capBase + 1.55, back - 1.0],
    0.08,
    6,
  );
  /* A little door and ladder on the cap, for the miller */
  builder.box(
    "paint",
    shade(capGreen, 0.75),
    [0.4, 0.5, 0.04],
    [0, capBase + 0.6, towerTop * 0.95],
  );
};

/** One sail: a stock, a whip, and a lattice frame spread with cloth. */
const buildSail = (builder: AttractionBuilder, angle: number) => {
  const turn = (x: number, y: number, z: number): Triple => [
    x * Math.cos(angle) - y * Math.sin(angle),
    x * Math.sin(angle) + y * Math.cos(angle),
    z,
  ];
  const rotation: Triple = [0, 0, angle];
  builder.box(
    "matte",
    stockTimber,
    [0.16, sailLength + 0.4, 0.16],
    turn(0, sailLength / 2, 0),
    rotation,
  );
  builder.box(
    "paint",
    sailCloth,
    [sailWidth, sailLength - 1.0, 0.03],
    turn(sailWidth / 2 + 0.08, sailLength / 2 + 0.5, 0.08),
    rotation,
  );
  if (builder.isFar) {
    return;
  }
  /* The lattice: sail bars across, and hemlaths along */
  const bars = 12;
  for (let index = 0; index <= bars; index++) {
    const along = 1.0 + ((sailLength - 1.0) * index) / bars;
    builder.box(
      "matte",
      stockTimber,
      [sailWidth + 0.16, 0.05, 0.06],
      turn(sailWidth / 2 + 0.08, along, 0.04),
      rotation,
    );
  }
  [0.08, sailWidth + 0.16].forEach((across) => {
    builder.box(
      "matte",
      stockTimber,
      [0.07, sailLength - 0.9, 0.07],
      turn(across, sailLength / 2 + 0.5, 0.04),
      rotation,
    );
  });
  /* The leading board on the other side of the stock */
  builder.box(
    "paint",
    shade(sailCloth, 0.92),
    [0.28, sailLength - 1.3, 0.03],
    turn(-0.24, sailLength / 2 + 0.6, 0.06),
    rotation,
  );
  /* Cloth tied off in pleats at the tip */
  builder.box(
    "matte",
    shade(sailCloth, 0.85),
    [sailWidth * 0.9, 0.18, 0.1],
    turn(sailWidth / 2 + 0.08, sailLength - 0.15, 0.12),
    rotation,
  );
};

const buildSails = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.28,
    radiusEnd: 0.22,
    length: 0.4,
    at: [0, 0, 0.05],
    axis: "z",
    segments: 16,
  });
  builder.sphere("paint", palette.brass, 0.16, [0, 0, 0.3], [1, 1, 0.6], 12);
  [0, 1, 2, 3].forEach((index) => {
    buildSail(builder, (index * Math.PI) / 2);
  });
};

const buildFantail = (builder: AttractionBuilder) => {
  const blades = 6;
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.07,
    length: 0.3,
    at: [0, 0, 0],
    axis: "x",
    segments: 8,
  });
  for (let index = 0; index < blades; index++) {
    const angle = (index / blades) * Math.PI * 2;
    builder.box(
      "paint",
      index % 2 === 0 ? palette.white : capGreen,
      [0.03, 0.5, 0.18],
      [0, Math.cos(angle) * 0.3, Math.sin(angle) * 0.3],
      [angle, 0, 0.35],
    );
  }
};

const buildYard = (builder: AttractionBuilder) => {
  /* A path to the door, sacks of flour and a cart */
  builder.box("matte", palette.path, [1.3, 0.04, 3.4], [0, 0.02, 3.6]);
  if (builder.isFar) {
    return;
  }
  [
    [1.1, 0.3, 2.65],
    [1.45, 0.3, 2.3],
    [1.25, 0.82, 2.45],
  ].forEach(([x, y, z], index) => {
    builder.roundedBox(
      "matte",
      flourSack,
      [0.48, 0.62, 0.36],
      0.14,
      [x, y, z],
      [0, index * 0.5, 0],
    );
    builder.box(
      "matte",
      shade(flourSack, 0.8),
      [0.2, 0.08, 0.2],
      [x, y + 0.33, z],
    );
  });
  /* A two-wheeled hand cart */
  const cart: Triple = [-1.7, 0, 2.6];
  builder.box(
    "matte",
    palette.paleTimber,
    [0.9, 0.08, 0.6],
    [cart[0], 0.52, cart[2]],
  );
  builder.box(
    "matte",
    palette.timber,
    [0.9, 0.22, 0.04],
    [cart[0], 0.66, cart[2] + 0.29],
  );
  builder.box(
    "matte",
    palette.timber,
    [0.9, 0.22, 0.04],
    [cart[0], 0.66, cart[2] - 0.29],
  );
  [-1, 1].forEach((side) => {
    builder.torus(
      "matte",
      palette.darkTimber,
      0.3,
      0.04,
      [cart[0], 0.32, cart[2] + side * 0.36],
      "z",
      20,
    );
    builder.bar(
      "matte",
      palette.timber,
      [cart[0] + 0.45, 0.52, cart[2] + side * 0.24],
      [cart[0] + 1.2, 0.3, cart[2] + side * 0.24],
      0.05,
    );
  });
  builder.roundedBox(
    "matte",
    flourSack,
    [0.4, 0.5, 0.3],
    0.12,
    [cart[0] - 0.1, 0.8, cart[2]],
    [0, 0.4, 0],
  );
  /* A low post-and-rail fence round the mill's patch */
  addFence(builder, { x: -4.2, z: 4.6 }, { x: -0.9, z: 4.6 });
  addFence(builder, { x: 0.9, z: 4.6 }, { x: 4.2, z: 4.6 });
};

export const windmillModel: CuriosityModel = {
  kind: "windmill",
  islandId: "meadow-isle",
  name: "Windmill",
  fact: "A windmill uses the wind to grind wheat into flour. The wind pushes on the big sails and turns them round, and the turning sails drive heavy millstones inside that crush the grain. The flour is used to bake bread. Windmills only work when it is windy, so millers watched the weather every day.",
  curriculumLink:
    "Science, Year 1: seasonal changes. Observe and describe weather associated with the seasons and how day length varies.",
  footprint: 5,
  setting: "inland",
  signSpot: { x: 1.6, z: 4.6 },
  build: (builder) => {
    buildTower(builder);
    buildGallery(builder);
    buildCap(builder);
    if (builder.isFar) {
      builder.box(
        "matte",
        stockTimber,
        [0.16, sailLength * 2, 0.16],
        [hubAt[0], hubAt[1], hubAt[2]],
        [0, 0, Math.PI / 4],
      );
      builder.box(
        "matte",
        stockTimber,
        [0.16, sailLength * 2, 0.16],
        [hubAt[0], hubAt[1], hubAt[2]],
        [0, 0, -Math.PI / 4],
      );
    } else {
      addDoor(builder, {
        at: [0, 0.5, towerRadiusAt(0.5) - 0.02],
        width: 0.9,
        height: 1.6,
        colour: capGreen,
      });
    }
    buildYard(builder);
    addSignBoard(builder, [1.6, 0, 4.6], signColour);
  },
  moving: [
    {
      name: "sails",
      pivot: hubAt,
      build: buildSails,
      motion: { kind: "whirl", axis: "z", idle: 0.35, speed: 1.6, reach: 9 },
    },
    {
      name: "fantail",
      pivot: [0, capBase + 1.45, -(towerTop + 1.05)],
      build: buildFantail,
      motion: { kind: "whirl", axis: "x", idle: 0.6, speed: 4, reach: 9 },
    },
  ],
  blockers: [
    { x: 0, z: 0, radius: towerBottom + 0.25 },
    { x: -1.7, z: 2.6, radius: 0.7 },
    { x: 1.25, z: 2.45, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Grind some flour",
    news: "Whoosh! The sails spun, the millstones rumbled, and out poured a sack of soft white flour.",
  },
};
