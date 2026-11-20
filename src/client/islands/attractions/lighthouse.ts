import { CylinderGeometry, DodecahedronGeometry } from "three";
import {
  addBench,
  addDoor,
  addSignBoard,
  addWindow,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "./attraction-kit.js";
import {
  addChimney,
  addGabledBlock,
  addLowWall,
  addPitchedRoof,
  addSash,
} from "./post-office-parts.js";

const towerWhite = "#f3f1ea";
const towerRed = "#b8262b";
const lanternGreen = "#24352f";
const granite = "#8e8a82";
const whitewash = "#f1eee5";
const turf = "#6a9a45";
const lampGold = "#ffe7a3";

const towerAt = { x: 0, z: -2.6 };
const plinthTop = 0.5;
const towerTop = 7.6;
const baseRadius = 1.25;
const topRadius = 0.86;
const lampY = 8.65;

const towerRadius = (y: number) =>
  baseRadius -
  ((baseRadius - topRadius) * (y - plinthTop)) / (towerTop - plinthTop);

/* The headland */

const rockColours = ["#7d7a74", "#6a6862", "#8a857c", "#74716a"];

const seawardRocks: readonly [number, number, number, number][] = [
  [-4.6, -5.6, 1.3, -0.5],
  [-2.6, -6.4, 1.5, -0.6],
  [-0.4, -6.9, 1.4, -0.7],
  [1.9, -6.5, 1.6, -0.6],
  [4.1, -5.8, 1.3, -0.5],
  [5.8, -4.2, 1.1, -0.45],
  [-6.0, -3.9, 1.1, -0.45],
  [-3.4, -8.0, 1.0, -0.95],
  [0.9, -8.3, 1.1, -1.0],
  [3.4, -7.7, 0.9, -0.95],
  [-1.6, -4.6, 0.9, -0.1],
  [1.7, -4.4, 0.8, -0.15],
  [-1.9, -2.2, 0.55, -0.05],
  [2.1, -3.0, 0.5, -0.05],
];

const buildHeadland = (builder: AttractionBuilder) => {
  const segments = builder.segments(40, 20);
  builder.add(
    "matte",
    turf,
    new CylinderGeometry(7.0, 7.9, 1.9, segments, 1, false),
    { at: [0, -0.95, 0.4] },
    undefined,
  );
  builder.add(
    "matte",
    "#b7ab93",
    new CylinderGeometry(7.95, 8.6, 0.6, segments, 1, true),
    { at: [0, -1.6, 0.4] },
    undefined,
  );
  const rocks = builder.isFar ? seawardRocks.slice(0, 9) : seawardRocks;
  rocks.forEach(([x, z, size, y], index) => {
    builder.add(
      "matte",
      rockColours[index % rockColours.length],
      new DodecahedronGeometry(size, builder.isFar ? 0 : 1),
      {
        at: [x, y, z],
        rotation: [index * 0.7, index * 1.3, index * 0.4],
        scale: [1.25, 0.75, 1],
      },
      undefined,
    );
  });
  builder.box("matte", palette.gravel, [1.3, 0.04, 5.4], [0, 0.02, 5.2]);
  builder.box("matte", palette.gravel, [1.1, 0.035, 3.0], [0, 0.018, 0.9]);
  builder.box("matte", palette.gravel, [2.6, 0.035, 1.0], [1.6, 0.018, 1.6]);
};

/* The tower */

const towerBands = [
  { from: plinthTop, to: 1.92, colour: towerWhite },
  { from: 1.92, to: 3.34, colour: towerRed },
  { from: 3.34, to: 4.76, colour: towerWhite },
  { from: 4.76, to: 6.18, colour: towerRed },
  { from: 6.18, to: 7.3, colour: towerWhite },
];

const buildTower = (builder: AttractionBuilder) => {
  const at: Triple = [towerAt.x, 0, towerAt.z];
  builder.lathe(
    "matte",
    granite,
    [
      [0, 0],
      [1.62, 0],
      [1.62, 0.42],
      [1.5, plinthTop],
      [0, plinthTop],
    ],
    at,
    "y",
    builder.segments(24, 12),
  );
  towerBands.forEach(({ from, to, colour }) => {
    builder.lathe(
      "paint",
      colour,
      [
        [towerRadius(from), from],
        [towerRadius(to), to],
      ],
      at,
      "y",
      builder.segments(28, 14),
    );
  });
  builder.lathe(
    "paint",
    lanternGreen,
    [
      [towerRadius(7.3), 7.3],
      [1.0, 7.42],
      [1.3, 7.56],
      [1.42, 7.6],
      [1.42, 7.7],
      [0, 7.7],
    ],
    at,
    "y",
    builder.segments(28, 14),
  );
  builder.cylinder("paint", towerWhite, {
    radius: 0.74,
    length: 0.42,
    at: [towerAt.x, 7.91, towerAt.z],
    segments: 20,
  });
  const lanternBottom = 8.12;
  const lanternTop = 9.22;
  const sides = 8;
  for (let side = 0; side < sides; side++) {
    const angle = (side / sides) * Math.PI * 2;
    builder.box(
      "paint",
      lanternGreen,
      [0.06, lanternTop - lanternBottom, 0.06],
      [
        towerAt.x + Math.sin(angle) * 0.7,
        (lanternTop + lanternBottom) / 2,
        towerAt.z + Math.cos(angle) * 0.7,
      ],
      [0, angle, 0],
    );
  }
  [lanternBottom + 0.02, lanternTop].forEach((up) => {
    builder.torus(
      "paint",
      lanternGreen,
      0.7,
      0.045,
      [towerAt.x, up, towerAt.z],
      "y",
      builder.segments(20, 8),
    );
  });
  builder.lathe(
    "glow",
    lampGold,
    [
      [0, lampY - 0.42],
      [0.22, lampY - 0.4],
      [0.36, lampY - 0.2],
      [0.4, lampY],
      [0.36, lampY + 0.2],
      [0.22, lampY + 0.38],
      [0, lampY + 0.42],
    ],
    [towerAt.x, 0, towerAt.z],
    "y",
    builder.segments(14, 8),
  );
  builder.cylinder("metal", palette.brass, {
    radius: 0.12,
    radiusEnd: 0.2,
    length: 0.1,
    at: [towerAt.x, lanternBottom + 0.05, towerAt.z],
    segments: 10,
  });
  builder.lathe(
    "paint",
    lanternGreen,
    [
      [0, lanternTop + 0.75],
      [0.18, lanternTop + 0.72],
      [0.48, lanternTop + 0.52],
      [0.74, lanternTop + 0.18],
      [0.86, lanternTop + 0.03],
      [0.86, lanternTop - 0.03],
      [0, lanternTop - 0.03],
    ],
    [towerAt.x, 0, towerAt.z],
    "y",
    builder.segments(22, 12),
  );
  builder.sphere(
    "paint",
    lanternGreen,
    0.15,
    [towerAt.x, lanternTop + 0.88, towerAt.z],
    [1, 1, 1],
    12,
  );
  builder.cylinder("metal", palette.brass, {
    radius: 0.02,
    length: 0.7,
    at: [towerAt.x, lanternTop + 1.3, towerAt.z],
    segments: 5,
  });
  const railTop = 8.25;
  builder.torus(
    "metal",
    palette.darkSteel,
    1.36,
    0.03,
    [towerAt.x, railTop, towerAt.z],
    "y",
    builder.segments(28, 12),
  );
  if (!builder.isFar) {
    builder.torus(
      "metal",
      palette.darkSteel,
      1.36,
      0.018,
      [towerAt.x, (railTop + 7.7) / 2, towerAt.z],
      "y",
      28,
    );
    const posts = 16;
    for (let post = 0; post < posts; post++) {
      const angle = (post / posts) * Math.PI * 2;
      builder.cylinder("metal", palette.darkSteel, {
        radius: 0.022,
        length: railTop - 7.7,
        at: [
          towerAt.x + Math.sin(angle) * 1.36,
          (railTop + 7.7) / 2,
          towerAt.z + Math.cos(angle) * 1.36,
        ],
        segments: 5,
      });
    }
    for (let corbel = 0; corbel < 12; corbel++) {
      const angle = ((corbel + 0.5) / 12) * Math.PI * 2;
      builder.box(
        "paint",
        lanternGreen,
        [0.1, 0.3, 0.32],
        [
          towerAt.x + Math.sin(angle) * 1.0,
          7.42,
          towerAt.z + Math.cos(angle) * 1.0,
        ],
        [0, angle, 0],
      );
    }
    for (let mullion = 0; mullion < sides; mullion++) {
      const angle = ((mullion + 0.5) / sides) * Math.PI * 2;
      builder.box(
        "paint",
        lanternGreen,
        [0.03, lanternTop - lanternBottom, 0.03],
        [
          towerAt.x + Math.sin(angle) * 0.68,
          (lanternTop + lanternBottom) / 2,
          towerAt.z + Math.cos(angle) * 0.68,
        ],
        [0, angle, 0],
      );
    }
    builder.torus(
      "paint",
      lanternGreen,
      0.69,
      0.02,
      [towerAt.x, (lanternTop + lanternBottom) / 2, towerAt.z],
      "y",
      20,
    );
  }
  [
    { up: 2.55, angle: 0.15 },
    { up: 4.05, angle: -0.5 },
    { up: 5.55, angle: 0.3 },
    { up: 6.75, angle: 2.9 },
    { up: 3.4, angle: 3.3 },
  ].forEach(({ up, angle }) => {
    const reach = towerRadius(up) + 0.02;
    addWindow(builder, {
      at: [
        towerAt.x + Math.sin(angle) * reach,
        up,
        towerAt.z + Math.cos(angle) * reach,
      ],
      width: 0.3,
      height: 0.48,
      turn: angle,
      frame: lanternGreen,
      glass: "#2f4250",
    });
  });
  const doorReach = towerRadius(plinthTop) + 0.02;
  addDoor(builder, {
    at: [towerAt.x, plinthTop, towerAt.z + doorReach - 0.06],
    width: 0.6,
    height: 1.12,
    colour: lanternGreen,
    frame: towerWhite,
  });
  builder.box(
    "matte",
    granite,
    [0.9, 0.25, 0.5],
    [towerAt.x, 0.125, towerAt.z + 1.72],
  );
};

/* The keeper's cottage */

const cottageAt = { x: 3.7, z: -0.4 };
const cottageWidth = 3.4;
const cottageDepth = 2.5;
const cottageEaves = 1.95;
const cottageRise = 1.05;

const buildCottage = (builder: AttractionBuilder) => {
  addGabledBlock(builder, {
    centre: cottageAt,
    width: cottageWidth,
    depth: cottageDepth,
    eaves: cottageEaves,
    rise: cottageRise,
    colour: whitewash,
  });
  addPitchedRoof(builder, {
    centre: cottageAt,
    width: cottageWidth,
    depth: cottageDepth,
    eaves: cottageEaves,
    rise: cottageRise,
    colour: palette.slate,
    courses: 5,
  });
  builder.box(
    "matte",
    shade(granite, 0.9),
    [cottageWidth + 0.06, 0.24, cottageDepth + 0.06],
    [cottageAt.x, 0.12, cottageAt.z],
  );
  addChimney(
    builder,
    [
      cottageAt.x + cottageWidth / 2 - 0.3,
      cottageEaves + cottageRise - 0.45,
      cottageAt.z,
    ],
    { height: 1.0, colour: whitewash, width: 0.5, depth: 0.6, pots: 2 },
  );
  const cottageFront = cottageAt.z + cottageDepth / 2;
  addDoor(builder, {
    at: [cottageAt.x - 0.45, 0.1, cottageFront + 0.02],
    colour: lanternGreen,
    frame: towerWhite,
  });
  [cottageAt.x - 1.25, cottageAt.x + 0.75].forEach((x) => {
    addSash(builder, {
      at: [x, 1.1, cottageFront + 0.02],
      width: 0.6,
      height: 0.72,
      frame: towerWhite,
      lintel: granite,
      isLit: x > cottageAt.x,
    });
  });
  addSash(builder, {
    at: [cottageAt.x + 0.4, 1.1, cottageAt.z - cottageDepth / 2 - 0.02],
    width: 0.6,
    height: 0.72,
    turn: Math.PI,
    frame: towerWhite,
    lintel: granite,
  });
  addSash(builder, {
    at: [cottageAt.x + cottageWidth / 2 + 0.02, 1.1, cottageAt.z],
    width: 0.6,
    height: 0.72,
    turn: Math.PI / 2,
    frame: towerWhite,
    lintel: granite,
    isLit: true,
  });
  builder.box(
    "paint",
    lanternGreen,
    [0.9, 0.05, 0.42],
    [cottageAt.x - 0.45, 1.32, cottageFront + 0.2],
    [0.2, 0, 0],
  );
  if (!builder.isFar) {
    builder.cylinder("matte", "#2f3134", {
      radius: 0.24,
      length: 0.6,
      at: [cottageAt.x + 1.45, 0.3, cottageFront + 0.4],
      segments: 12,
    });
    builder.cylinder("matte", "#3f8a3a", {
      radius: 0.22,
      length: 0.12,
      at: [cottageAt.x + 1.45, 0.62, cottageFront + 0.4],
      segments: 12,
    });
  }
};

/* The wall round the compound */

const wallRuns: readonly (readonly LocalPoint[])[] = [
  [
    { x: -1.0, z: 3.2 },
    { x: -3.6, z: 2.2 },
    { x: -4.4, z: -1.0 },
    { x: -3.4, z: -3.9 },
  ],
  [
    { x: 1.0, z: 3.2 },
    { x: 6.0, z: 2.4 },
    { x: 6.6, z: -1.6 },
    { x: 5.3, z: -3.6 },
  ],
];

const buildWalls = (builder: AttractionBuilder) => {
  wallRuns.forEach((run) => {
    for (let step = 0; step < run.length - 1; step++) {
      addLowWall(builder, run[step], run[step + 1], {
        height: 0.6,
        thickness: 0.32,
        colour: whitewash,
        coping: granite,
      });
    }
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      whitewash,
      [0.42, 0.95, 0.42],
      [side * 1.0, 0.475, 3.2],
    );
    builder.box("matte", granite, [0.5, 0.1, 0.5], [side * 1.0, 1.0, 3.2]);
    builder.sphere(
      "matte",
      granite,
      0.14,
      [side * 1.0, 1.15, 3.2],
      [1, 1, 1],
      10,
    );
  });
};

/* The lifebuoy and the bench */

const buildProps = (builder: AttractionBuilder) => {
  const buoyAt: Triple = [-3.0, 0, -2.6];
  builder.box(
    "paint",
    towerWhite,
    [0.08, 1.3, 0.08],
    [buoyAt[0], 0.65, buoyAt[2]],
  );
  builder.box(
    "paint",
    towerWhite,
    [0.62, 0.62, 0.05],
    [buoyAt[0], 0.95, buoyAt[2] + 0.06],
  );
  builder.torus(
    "paint",
    "#e2512a",
    0.22,
    0.06,
    [buoyAt[0], 0.95, buoyAt[2] + 0.13],
    "z",
    16,
  );
  if (!builder.isFar) {
    [0, 1, 2, 3].forEach((quarter) => {
      const angle = (quarter / 4) * Math.PI * 2 + Math.PI / 4;
      builder.box(
        "paint",
        towerWhite,
        [0.1, 0.14, 0.14],
        [
          buoyAt[0] + Math.cos(angle) * 0.22,
          0.95 + Math.sin(angle) * 0.22,
          buoyAt[2] + 0.13,
        ],
        [0, 0, angle],
      );
    });
  }
  addBench(builder, [-2.4, 0, 0.1], Math.PI, palette.paleTimber);
};

/* Moving parts: the beam, the glow, the gulls */

const buildBeam = (builder: AttractionBuilder) => {
  const length = 30;
  [1, -1].forEach((side) => {
    builder.add(
      "glow",
      "#fff1bf",
      new CylinderGeometry(0.3, 2.4, length, 14, 1, true)
        .translate(0, -length / 2, 0)
        .rotateZ((side * Math.PI) / 2),
      {},
      undefined,
    );
  });
};

const buildHalo = (builder: AttractionBuilder) => {
  builder.sphere("glow", "#ffe7a3", 1.1, [0, 0, 0], [1, 0.85, 1], 14);
};

const buildGull = (builder: AttractionBuilder) => {
  builder.sphere("paint", towerWhite, 0.11, [0, 0, 0], [0.9, 0.8, 2], 10);
  builder.sphere("paint", towerWhite, 0.08, [0, 0.06, 0.2], [1, 1, 1], 8);
  builder.cylinder("paint", "#f2b51d", {
    radius: 0.025,
    radiusEnd: 0.005,
    length: 0.1,
    at: [0, 0.05, 0.31],
    axis: "z",
    segments: 5,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      "#a9b0b8",
      [0.42, 0.02, 0.16],
      [side * 0.24, 0.05, -0.02],
      [0, 0, side * 0.28],
    );
    builder.box(
      "paint",
      "#3a3d42",
      [0.12, 0.022, 0.14],
      [side * 0.48, 0.12, -0.04],
      [0, 0, side * 0.28],
    );
  });
  builder.box("paint", "#a9b0b8", [0.12, 0.02, 0.14], [0, 0.01, -0.24]);
};

const wallBlockers: LocalBlocker[] = wallRuns.flatMap((run) =>
  run
    .slice(0, -1)
    .flatMap((from, step) => listWallBlockers(from, run[step + 1], 0.3, 0.5)),
);

export const lighthouseModel: AttractionModel = {
  kind: "lighthouse",
  name: "Lighthouse",
  fact: "A lighthouse shines its light out to sea to warn ships away from dangerous rocks. In 1838 Grace Darling, the daughter of a lighthouse keeper, rowed through a storm with her father to rescue nine people from a shipwreck off the coast of Northumberland.",
  curriculumLink:
    "History, Key Stage 1: significant individuals. Grace Darling and the work of lighthouse keepers.",
  footprint: 9,
  setting: "shore",
  hasGroundPad: false,
  landSamples: [
    { x: 0, z: 0 },
    { x: 0, z: 4 },
    { x: -3, z: 3 },
    { x: 3, z: 3 },
    { x: -4, z: -1 },
    { x: 4, z: -1 },
    { x: 0, z: 7 },
    { x: -2, z: -2.5 },
    { x: 2, z: -2.5 },
  ],
  seaSamples: [
    { x: 0, z: -9.5 },
    { x: -3, z: -10 },
    { x: 3, z: -10 },
    { x: 0, z: -12 },
    { x: -4, z: -13 },
    { x: 4, z: -13 },
    { x: 0, z: -14 },
  ],
  signSpot: { x: -2.2, z: 6.4 },
  build: (builder) => {
    buildHeadland(builder);
    buildTower(builder);
    buildCottage(builder);
    buildWalls(builder);
    buildProps(builder);
    addSignBoard(builder, [-2.2, 0, 5.5], lanternGreen);
  },
  moving: [
    {
      name: "beam",
      pivot: [towerAt.x, lampY, towerAt.z],
      build: buildBeam,
      motion: { kind: "spin", axis: "y", speed: 0.6 },
      look: "beam",
    },
    {
      name: "lamp-glow",
      pivot: [towerAt.x, lampY, towerAt.z],
      build: buildHalo,
      motion: { kind: "flicker", period: 2.4 },
      look: "halo",
    },
  ],
  wanderers: [
    {
      name: "gulls",
      build: buildGull,
      count: 3,
      centre: { x: 0, z: -4 },
      radius: 6,
      speed: 2.2,
      height: 7.5,
      bob: 0.5,
    },
  ],
  blockers: [
    { x: towerAt.x, z: towerAt.z, radius: 1.75 },
    ...listWallBlockers(
      { x: cottageAt.x - cottageWidth / 2 + 0.7, z: cottageAt.z },
      { x: cottageAt.x + cottageWidth / 2 - 0.7, z: cottageAt.z },
      1.45,
      1,
    ),
    ...wallBlockers,
    { x: -1.0, z: 3.2, radius: 0.35 },
    { x: 1.0, z: 3.2, radius: 0.35 },
    { x: -2.4, z: 0.2, radius: 0.5 },
    { x: -3.0, z: -2.6, radius: 0.3 },
    { x: -1.6, z: -4.6, radius: 1.0 },
    { x: 1.7, z: -4.4, radius: 0.9 },
  ],
};
