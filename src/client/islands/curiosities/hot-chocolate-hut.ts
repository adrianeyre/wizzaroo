import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  addDoor,
  addGableRoof,
  addSignBoard,
  addWindow,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowShadow = "#d9e3ea";
const hutTimber = "#a0643a";
const hutDark = "#6b3f24";
const trimCream = "#f3e6c8";
const roofRed = "#7a2e2a";
const awningRed = "#c8323a";
const awningCream = "#f6eedc";
const cocoa = "#5a3320";
const cream = "#fff6e6";
const marshPink = "#f6b8cc";
const mugColours = ["#d24a3a", "#3a7ac8", "#3f9a5a", "#f2c12e"];
const kettleRed = "#b8322f";
const interiorGlow = "#ffcf8a";
const fairyColours = ["#ffd27a", "#ff8a8a", "#8affc1", "#8ac8ff"];
const pineGreen = "#2d5640";
const logEndColour = "#d8b384";
const signColour = "#6b3f24";

const hut = { x: 0, z: -1.2, width: 2.6, depth: 2.0, height: 2.0 };
const front = hut.z + hut.depth / 2;
const hatch = { x: -0.3, width: 1.3, bottom: 1.0, top: 1.75 };
const counterTop = 1.02;
const kettleAt: Triple = [hatch.x - 0.45, counterTop, front + 0.08];
const lidAt: Triple = [kettleAt[0], counterTop + 0.27, kettleAt[2]];
const spoutTip: Triple = [kettleAt[0] + 0.24, counterTop + 0.26, kettleAt[2]];
const chimneyAt: Triple = [0.75, 0, hut.z - 0.55];
const chimneyTop = 3.55;
const tables = [
  { x: -1.7, z: 1.5 },
  { x: 1.5, z: 1.4 },
];
const signAt: Triple = [-0.5, 0, 3.9];

/** A rounded block with fewer bevel steps than the builder's own, to save triangles. */
const addSoftBlock = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  size: Triple,
  radius: number,
  at: Triple,
  rotation?: Triple,
) => {
  if (builder.isFar) {
    builder.box(finish, colour, size, at, rotation);
    return;
  }
  builder.add(
    finish,
    colour,
    new RoundedBoxGeometry(
      size[0],
      size[1],
      size[2],
      1,
      Math.min(radius, ...size.map((side) => side / 2 - 0.001)),
    ),
    { at, rotation },
  );
};

/** A mug of hot chocolate topped with cream and marshmallows. */
const addMug = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  turn: number,
) => {
  const [x, y, z] = at;
  builder.cylinder("paint", colour, {
    radius: 0.065,
    radiusEnd: 0.072,
    length: 0.15,
    at: [x, y + 0.075, z],
    segments: 12,
  });
  builder.cylinder("matte", cocoa, {
    radius: 0.066,
    length: 0.01,
    at: [x, y + 0.145, z],
    segments: 12,
  });
  builder.sphere("matte", cream, 0.05, [x, y + 0.16, z], [1, 0.7, 1], 8);
  builder.box(
    "matte",
    marshPink,
    [0.03, 0.03, 0.03],
    [x + 0.03, y + 0.185, z + 0.01],
    [0.3, 0.5, 0],
  );
  builder.box(
    "matte",
    palette.white,
    [0.03, 0.03, 0.03],
    [x - 0.025, y + 0.18, z - 0.02],
    [0.1, 0.9, 0.2],
  );
  builder.torus(
    "paint",
    colour,
    0.04,
    0.012,
    [x + Math.cos(turn) * 0.075, y + 0.08, z - Math.sin(turn) * 0.075],
    "z",
    8,
  );
};

const buildHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = hut;
  builder.box("matte", hutTimber, [width, height, depth], [x, height / 2, z]);
  addGableRoof(builder, {
    width: depth,
    depth: width,
    rise: 0.95,
    at: [x, height, z],
    colour: roofRed,
    overhang: 0.22,
    thickness: 0.1,
    turn: Math.PI / 2,
  });
  /* The chimney, of brick, poking through the roof at the back */
  builder.box(
    "matte",
    palette.brick,
    [0.42, chimneyTop - 1.6, 0.42],
    [chimneyAt[0], (chimneyTop + 1.6) / 2, chimneyAt[2]],
  );
  if (builder.isFar) {
    builder.box(
      "glow",
      interiorGlow,
      [hatch.width, hatch.top - hatch.bottom, 0.02],
      [hatch.x, (hatch.top + hatch.bottom) / 2, front + 0.01],
    );
    builder.box(
      "paint",
      awningRed,
      [hatch.width + 0.4, 0.06, 0.8],
      [hatch.x, 1.95, front + 0.35],
      [0.35, 0, 0],
    );
    return;
  }
  builder.box(
    "matte",
    palette.darkBrick,
    [0.5, 0.1, 0.5],
    [chimneyAt[0], chimneyTop + 0.05, chimneyAt[2]],
  );
  builder.box(
    "matte",
    snow,
    [0.48, 0.06, 0.48],
    [chimneyAt[0], chimneyTop + 0.13, chimneyAt[2]],
  );
  /* The gable ends, filled in with timber, and snow along the ridge */
  const slope = Math.atan2(0.95, width / 2 + 0.22);
  [1, -1].forEach((side) => {
    addSoftBlock(
      builder,
      "matte",
      snow,
      [Math.hypot(width / 2 + 0.22, 0.95) * 0.9, 0.1, depth + 0.48],
      0.05,
      [x + side * (width / 4 + 0.06), height + 0.55, z],
      [0, 0, -side * slope],
    );
  });
  [1, -1].forEach((end) => {
    builder.add(
      "matte",
      shade(hutTimber, 0.92),
      new RoundedBoxGeometry(width * 0.705, width * 0.705, 0.08, 1, 0.01)
        .rotateZ(Math.PI / 4)
        .scale(1, 0.95 / (width / 2), 1),
      { at: [x, height, z + end * (depth / 2 - 0.03)] },
    );
  });
  /* Planks, corner posts and a plinth */
  for (let plank = 1; plank < 9; plank++) {
    builder.box(
      "matte",
      shade(hutTimber, 0.82),
      [width + 0.01, 0.02, depth + 0.01],
      [x, plank * 0.22, z],
    );
  }
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "matte",
        hutDark,
        [0.12, height, 0.12],
        [x + sideX * (width / 2), height / 2, z + sideZ * (depth / 2)],
      );
    });
  });
  builder.box(
    "matte",
    palette.darkStone,
    [width + 0.1, 0.18, depth + 0.1],
    [x, 0.09, z],
  );
  /* The serving hatch: a warm, glowing room inside, with shelves of tins */
  builder.box(
    "glow",
    interiorGlow,
    [hatch.width, hatch.top - hatch.bottom, 0.02],
    [hatch.x, (hatch.top + hatch.bottom) / 2, front + 0.01],
  );
  builder.box(
    "matte",
    hutDark,
    [hatch.width - 0.1, 0.03, 0.04],
    [hatch.x, 1.48, front + 0.03],
  );
  ["#c8323a", "#3a7ac8", "#f2c12e", "#3f9a5a", "#8a4a2a"].forEach(
    (colour, index) => {
      builder.cylinder("paint", colour, {
        radius: 0.05,
        length: 0.14,
        at: [hatch.x - 0.45 + index * 0.22, 1.57, front + 0.04],
        segments: 8,
      });
    },
  );
  [
    [hatch.width + 0.12, 0.08, hatch.x, hatch.top + 0.04],
    [
      0.08,
      hatch.top - hatch.bottom,
      hatch.x - hatch.width / 2 - 0.02,
      (hatch.top + hatch.bottom) / 2,
    ],
    [
      0.08,
      hatch.top - hatch.bottom,
      hatch.x + hatch.width / 2 + 0.02,
      (hatch.top + hatch.bottom) / 2,
    ],
  ].forEach(([sizeX, sizeY, atX, atY]) => {
    builder.box(
      "paint",
      trimCream,
      [sizeX, sizeY, 0.06],
      [atX, atY, front + 0.03],
    );
  });
  /* The counter, on brackets */
  addSoftBlock(
    builder,
    "paint",
    trimCream,
    [hatch.width + 0.3, 0.06, 0.46],
    0.02,
    [hatch.x, counterTop - 0.03, front + 0.2],
  );
  [-0.55, 0.55].forEach((along) => {
    builder.bar(
      "matte",
      hutDark,
      [hatch.x + along, 0.65, front + 0.02],
      [hatch.x + along, counterTop - 0.06, front + 0.38],
      0.05,
      4,
    );
  });
  addDoor(builder, {
    at: [0.85, 0.18, front + 0.01],
    width: 0.6,
    height: 1.55,
    colour: "#2f5a7a",
    frame: trimCream,
  });
  addWindow(builder, {
    at: [x - width / 2 - 0.01, 1.25, z - 0.2],
    width: 0.7,
    height: 0.6,
    turn: -Math.PI / 2,
    frame: trimCream,
    isLit: true,
  });
  addWindow(builder, {
    at: [x + width / 2 + 0.01, 1.25, z - 0.3],
    width: 0.6,
    height: 0.55,
    turn: Math.PI / 2,
    frame: trimCream,
    isLit: true,
  });
  /* Icicles under the eaves on both sides */
  [-1, 1].forEach((side) => {
    for (let icicle = 0; icicle < 7; icicle++) {
      const length = 0.1 + ((icicle * 5 + (side > 0 ? 2 : 0)) % 4) * 0.05;
      builder.cylinder("glass", "#bfe3f2", {
        radius: 0.022,
        radiusEnd: 0.002,
        length,
        at: [
          x + side * (width / 2 + 0.2),
          height - length / 2 - 0.05,
          z - depth / 2 + 0.15 + icicle * ((depth - 0.3) / 6),
        ],
        segments: 5,
      });
    }
  });
};

/** The striped awning over the hatch, with a scalloped edge and fairy lights. */
const buildAwning = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const stripes = 8;
  const width = hatch.width + 0.4;
  const tilt = 0.38;
  const length = 0.85;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? awningRed : awningCream,
      [width / stripes, 0.03, length],
      [
        hatch.x - width / 2 + (stripe + 0.5) * (width / stripes),
        1.98 - (Math.sin(tilt) * length) / 2,
        front + (Math.cos(tilt) * length) / 2,
      ],
      [tilt, 0, 0],
    );
    builder.cylinder("matte", stripe % 2 === 0 ? awningRed : awningCream, {
      radius: width / stripes / 2,
      length: 0.025,
      at: [
        hatch.x - width / 2 + (stripe + 0.5) * (width / stripes),
        1.98 - Math.sin(tilt) * length - 0.02,
        front + Math.cos(tilt) * length,
      ],
      axis: "z",
      segments: 10,
    });
    builder.sphere(
      "glow",
      fairyColours[stripe % fairyColours.length],
      0.03,
      [
        hatch.x - width / 2 + (stripe + 0.5) * (width / stripes),
        1.98 - Math.sin(tilt) * length - 0.1,
        front + Math.cos(tilt) * length + 0.02,
      ],
      [1, 1, 1],
      6,
    );
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [hatch.x + side * (width / 2), 1.6, front],
      [
        hatch.x + side * (width / 2),
        1.98 - Math.sin(tilt) * length,
        front + Math.cos(tilt) * length,
      ],
      0.025,
      5,
    );
  });
};

const buildCounterTop = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* The kettle's body, spout and handle; its lid is a moving part */
  builder.lathe(
    "paint",
    kettleRed,
    [
      [0, 0],
      [0.13, 0.0],
      [0.16, 0.08],
      [0.15, 0.18],
      [0.09, 0.26],
      [0.06, 0.27],
    ],
    kettleAt,
    "y",
    16,
  );
  builder.bar(
    "paint",
    kettleRed,
    [kettleAt[0] + 0.12, counterTop + 0.08, kettleAt[2]],
    spoutTip,
    0.045,
    8,
  );
  builder.torus(
    "metal",
    palette.darkSteel,
    0.12,
    0.014,
    [kettleAt[0], counterTop + 0.32, kettleAt[2]],
    "z",
    14,
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.17,
    length: 0.02,
    at: [kettleAt[0], counterTop + 0.01, kettleAt[2]],
    segments: 14,
  });
  mugColours.forEach((colour, index) => {
    addMug(
      builder,
      [
        hatch.x - 0.12 + index * 0.2,
        counterTop,
        front + 0.12 + (index % 2) * 0.12,
      ],
      colour,
      index * 0.9 - 0.8,
    );
  });
  /* A jar of marshmallows and a pot of stirring spoons */
  const jar: Triple = [hatch.x + 0.62, counterTop, front + 0.18];
  builder.cylinder("glass", "#dff2fb", {
    radius: 0.08,
    length: 0.24,
    at: [jar[0], jar[1] + 0.12, jar[2]],
    segments: 12,
  });
  builder.cylinder("paint", awningRed, {
    radius: 0.085,
    length: 0.03,
    at: [jar[0], jar[1] + 0.255, jar[2]],
    segments: 12,
  });
  for (let mallow = 0; mallow < 6; mallow++) {
    builder.box(
      "matte",
      mallow % 2 === 0 ? marshPink : palette.white,
      [0.04, 0.04, 0.04],
      [
        jar[0] + Math.sin(mallow * 2.1) * 0.035,
        jar[1] + 0.03 + mallow * 0.03,
        jar[2] + Math.cos(mallow * 2.1) * 0.035,
      ],
      [mallow, mallow * 0.5, 0],
    );
  }
  /* Wisps of steam curling off the mugs */
  [0, 2].forEach((index) => {
    const at: Triple = [
      hatch.x - 0.12 + index * 0.2,
      counterTop + 0.28,
      front + 0.12,
    ];
    builder.torus("glass", palette.white, 0.04, 0.008, at, "x", 10);
    builder.torus(
      "glass",
      palette.white,
      0.03,
      0.007,
      [at[0] + 0.02, at[1] + 0.08, at[2]],
      "x",
      10,
    );
  });
};

const buildYard = (builder: AttractionBuilder) => {
  builder.box("matte", snowShadow, [1.4, 0.02, 2.5], [-0.2, 0.01, 1.4]);
  /* A snowy spruce by the hut */
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.1,
    length: 0.6,
    at: [-2.6, 0.3, -2.2],
    segments: 6,
  });
  [0, 1].forEach((tier) => {
    builder.cylinder("matte", shade(pineGreen, 1 + tier * 0.08), {
      radius: 0.9 - tier * 0.32,
      radiusEnd: 0.02,
      length: 1.4,
      at: [-2.6, 1.2 + tier * 0.95, -2.2],
      segments: 12,
    });
    if (!builder.isFar) {
      builder.cylinder("matte", snow, {
        radius: (0.9 - tier * 0.32) * 0.6,
        radiusEnd: 0.02,
        length: 0.7,
        at: [-2.6, 1.55 + tier * 0.95, -2.2],
        segments: 12,
      });
    }
  });
  tables.forEach(({ x, z }) => {
    /* A barrel for a table, and log stools round it */
    builder.cylinder("matte", palette.timber, {
      radius: 0.3,
      radiusEnd: 0.27,
      length: 0.8,
      at: [x, 0.4, z],
      segments: builder.isFar ? 8 : 14,
    });
    if (builder.isFar) {
      return;
    }
    [0.15, 0.65].forEach((height) => {
      builder.torus(
        "metal",
        palette.darkSteel,
        0.305 - height * 0.04,
        0.015,
        [x, height, z],
        "y",
        14,
      );
    });
    builder.cylinder("matte", palette.paleTimber, {
      radius: 0.34,
      length: 0.04,
      at: [x, 0.82, z],
      segments: 14,
    });
    addMug(
      builder,
      [x + 0.1, 0.84, z - 0.05],
      mugColours[(x > 0 ? 1 : 3) % mugColours.length],
      0.4,
    );
    [-1, 1].forEach((side) => {
      const stool: Triple = [x + side * 0.6, 0, z + 0.25];
      builder.cylinder("matte", palette.timber, {
        radius: 0.17,
        length: 0.42,
        at: [stool[0], 0.21, stool[2]],
        segments: 10,
      });
      builder.cylinder("matte", logEndColour, {
        radius: 0.155,
        length: 0.01,
        at: [stool[0], 0.425, stool[2]],
        segments: 10,
      });
    });
  });
  if (builder.isFar) {
    return;
  }
  /* A chalk menu board */
  const board: Triple = [2.1, 0, 0.1];
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      hutDark,
      [0.6, 0.85, 0.04],
      [board[0], 0.42, board[2] + side * 0.12],
      [side * 0.25, -0.3, 0],
    );
  });
  builder.box(
    "matte",
    "#2a2f33",
    [0.5, 0.6, 0.02],
    [board[0] + 0.04, 0.46, board[2] + 0.235],
    [0.25, -0.3, 0],
  );
  [0.62, 0.52, 0.44, 0.36].forEach((height, index) => {
    builder.box(
      "matte",
      palette.white,
      [0.32 - index * 0.04, 0.02, 0.01],
      [board[0] + 0.05, height, board[2] + 0.25 - (height - 0.46) * 0.25],
      [0.25, -0.3, 0],
    );
  });
  /* A stack of logs for the stove */
  for (let row = 0; row < 3; row++) {
    for (let log = 0; log < 3 - row; log++) {
      const at: Triple = [
        hut.width / 2 + 0.35,
        0.12 + row * 0.2,
        hut.z - 0.5 + log * 0.22 + row * 0.11,
      ];
      builder.cylinder("matte", palette.timber, {
        radius: 0.1,
        length: 0.7,
        at,
        axis: "x",
        segments: 8,
      });
      builder.cylinder("matte", logEndColour, {
        radius: 0.085,
        length: 0.71,
        at,
        axis: "x",
        segments: 8,
      });
    }
  }
  [
    [-2.9, 0.6, 0.5],
    [2.8, -2.4, 0.45],
    [0.9, 3.4, 0.35],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
};

const buildLid = (builder: AttractionBuilder) => {
  builder.cylinder("paint", kettleRed, {
    radius: 0.075,
    radiusEnd: 0.05,
    length: 0.04,
    at: [0, 0.02, 0],
    segments: 14,
  });
  builder.sphere("paint", palette.black, 0.025, [0, 0.055, 0], [1, 0.8, 1], 8);
};

/** A puff of steam from the spout, which billows out as a visitor comes near. */
const buildSteamPuff = (builder: AttractionBuilder) => {
  [
    [0.04, 0.04, 0.05],
    [0.1, 0.12, 0.065],
    [0.14, 0.24, 0.08],
    [0.1, 0.36, 0.06],
  ].forEach(([x, y, radius]) => {
    builder.sphere("glass", palette.white, radius, [x, y, 0], [1, 1, 1], 8);
  });
};

export const hotChocolateHutModel: CuriosityModel = {
  kind: "hot-chocolate-hut",
  islandId: "frost-isle",
  name: "Hot Chocolate Hut",
  fact: "Hot chocolate is made from cocoa beans, the seeds of the cacao tree. Cacao trees only grow in hot, rainy places near the Equator, such as Ghana in Africa and Brazil in South America. The beans travel thousands of miles to cold places near the poles, where a warm mug is just the thing for chilly hands.",
  curriculumLink:
    "Geography, Key Stage 1: identify the location of hot and cold areas of the world in relation to the Equator and the North and South Poles.",
  footprint: 4.6,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildHut(builder);
    buildAwning(builder);
    buildCounterTop(builder);
    buildYard(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "kettle lid",
      pivot: lidAt,
      build: buildLid,
      motion: { kind: "rise", reach: 6, height: 0.07, period: 0.35 },
    },
    {
      name: "steam",
      pivot: spoutTip,
      build: buildSteamPuff,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  smoke: [
    {
      at: [chimneyAt[0], chimneyTop + 0.2, chimneyAt[2]],
      colour: "#e3e6ea",
      puffs: 5,
      size: 0.16,
      rise: 1.8,
      spread: 0.35,
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: hut.x - 0.4, z: hut.z },
      { x: hut.x + 0.4, z: hut.z },
      1.05,
      0.4,
    ),
    ...listWallBlockers(
      { x: hatch.x - 0.6, z: front + 0.15 },
      { x: hatch.x + 0.6, z: front + 0.15 },
      0.3,
      0.3,
    ),
    ...tables.map(({ x, z }) => ({ x, z, radius: 0.4 })),
    { x: -2.6, z: -2.2, radius: 0.4 },
    { x: hut.width / 2 + 0.35, z: hut.z - 0.3, radius: 0.4 },
    { x: 2.1, z: 0.1, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Sip hot chocolate",
    news: "Slurp! Warm, sweet and chocolatey, with a marshmallow that melted on your tongue. Your mittens are toasty again!",
  },
};
