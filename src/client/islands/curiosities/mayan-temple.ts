import {
  addBush,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const limestone = "#d6c9a8";
const limestoneDark = "#b3a483";
const mortar = "#9a8d6f";
const templeRed = "#b5452e";
const jade = "#2fa36b";
const jadeDark = "#1f7a4f";
const vine = "#3f7a2f";
const leafMid = "#2f8a35";
const leafBright = "#55aa3e";
const leafDeep = "#22662c";
const flameOrange = "#ff9a2e";
const flameYellow = "#ffd84a";
const signColour = "#8a5a2a";

/* Four stepped terraces, each low enough to climb, with a temple on top */
const pyramid = { x: 0, z: -1.0 };
const tierHalfWidths = [2.8, 2.3, 1.8, 1.3];
const tierRise = 0.75;
const topHeight = tierHalfWidths.length * tierRise;

/* The grand stair up the front */
const stairHalfWidth = 0.6;
const stairTopZ = pyramid.z + tierHalfWidths[3];
const stairSteps = 12;
const stairRun = 0.2;
const stairFootZ = stairTopZ + stairSteps * stairRun;
const stepRise = topHeight / stairSteps;

const temple = { z: -1.25, halfWidth: 1.0, halfDepth: 0.8, height: 1.45 };
const templeFront = temple.z + temple.halfDepth;
const brazierAt: Triple = [0.85, topHeight + 0.55, templeFront + 0.32];
const maskAt: Triple = [0, topHeight + 0.75, templeFront + 0.05];

const jaguarAt = { x: -2.3, z: 2.9 };
const stelae = [
  { x: 2.6, z: 2.3, turn: -0.4 },
  { x: -3.6, z: 0.9, turn: 0.6 },
];

/** How high the stair is at a point along it, step by step. */
const stairHeightAt = (z: number): number =>
  Math.min(
    topHeight,
    Math.max(stepRise, stepRise * Math.ceil((stairFootZ - z) / stairRun)),
  );

const buildTiers = (builder: AttractionBuilder) => {
  tierHalfWidths.forEach((half, tier) => {
    const top = (tier + 1) * tierRise;
    builder.box(
      "matte",
      tier % 2 === 0 ? limestone : shade(limestone, 0.96),
      [half * 2, tierRise, half * 2],
      [pyramid.x, top - tierRise / 2, pyramid.z],
    );
    if (builder.isFar) {
      return;
    }
    /* A cornice round the top of each terrace, and a course line below */
    builder.box(
      "matte",
      limestoneDark,
      [half * 2 + 0.1, 0.1, half * 2 + 0.1],
      [pyramid.x, top - 0.05, pyramid.z],
    );
    builder.box(
      "matte",
      mortar,
      [half * 2 + 0.02, 0.03, half * 2 + 0.02],
      [pyramid.x, top - tierRise * 0.55, pyramid.z],
    );
    /* Joints between the blocks, staggered course by course */
    const blocks = Math.round((half * 2) / 0.7);
    for (let block = 1; block < blocks; block++) {
      const along = -half + (block / blocks) * half * 2;
      const lower = top - tierRise * 0.78;
      const upper = top - tierRise * 0.32;
      [
        { x: along, z: half, height: lower, isSide: false },
        { x: along + 0.35 / blocks, z: half, height: upper, isSide: false },
        { x: half, z: along, height: lower, isSide: true },
        { x: -half, z: along, height: upper, isSide: true },
      ].forEach(({ x, z, height, isSide }) => {
        if (!isSide && Math.abs(x) < stairHalfWidth + 0.15) {
          return;
        }
        builder.box(
          "matte",
          mortar,
          isSide ? [0.02, 0.3, 0.025] : [0.025, 0.3, 0.02],
          [
            pyramid.x + x + (isSide ? Math.sign(x) * 0.005 : 0),
            height,
            pyramid.z + z + (isSide ? 0 : 0.005),
          ],
        );
      });
    }
  });
};

const buildStair = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    builder.box(
      "matte",
      limestoneDark,
      [stairHalfWidth * 2, 0.1, Math.hypot(stairFootZ - stairTopZ, topHeight)],
      [0, topHeight / 2, (stairFootZ + stairTopZ) / 2],
      [Math.atan2(topHeight, stairFootZ - stairTopZ), 0, 0],
    );
    return;
  }
  for (let step = 0; step < stairSteps; step++) {
    const height = (step + 1) * stepRise;
    const front = stairFootZ - step * stairRun;
    builder.box(
      "matte",
      step % 2 === 0 ? limestone : shade(limestone, 1.04),
      [stairHalfWidth * 2, stepRise, stairRun + 0.02],
      [0, height - stepRise / 2, front - stairRun / 2],
    );
    builder.box(
      "matte",
      limestoneDark,
      [stairHalfWidth * 2 + 0.02, 0.03, 0.03],
      [0, height - 0.015, front - 0.01],
    );
  }
  /* The stair's sloping side walls, red painted at the edge */
  const slope = Math.atan2(topHeight, stairFootZ - stairTopZ);
  const length = Math.hypot(stairFootZ - stairTopZ, topHeight);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      limestoneDark,
      [0.22, 0.3, length],
      [
        side * (stairHalfWidth + 0.11),
        topHeight / 2 + 0.1,
        (stairFootZ + stairTopZ) / 2,
      ],
      [slope, 0, 0],
    );
    builder.box(
      "paint",
      templeRed,
      [0.24, 0.06, length],
      [
        side * (stairHalfWidth + 0.11),
        topHeight / 2 + 0.27,
        (stairFootZ + stairTopZ) / 2 - 0.02,
      ],
      [slope, 0, 0],
    );
    /* Serpent heads at the foot, as on the great pyramid at Chichen Itza */
    builder.roundedBox("matte", limestone, [0.3, 0.32, 0.4], 0.08, [
      side * (stairHalfWidth + 0.11),
      0.16,
      stairFootZ - 0.05,
    ]);
    builder.box(
      "paint",
      templeRed,
      [0.26, 0.05, 0.08],
      [side * (stairHalfWidth + 0.11), 0.1, stairFootZ + 0.16],
    );
    [-0.07, 0.07].forEach((eye) => {
      builder.sphere(
        "paint",
        jade,
        0.035,
        [side * (stairHalfWidth + 0.11) + eye, 0.25, stairFootZ + 0.13],
        [1, 1, 1],
        6,
      );
    });
  });
};

const buildTemple = (builder: AttractionBuilder) => {
  const { z, halfWidth, halfDepth, height } = temple;
  const base = topHeight;
  builder.box(
    "matte",
    limestone,
    [halfWidth * 2, height, halfDepth * 2],
    [0, base + height / 2, z],
  );
  /* A stepped roof, and the tall pierced roof comb on top */
  builder.box(
    "paint",
    templeRed,
    [halfWidth * 2 + 0.16, 0.22, halfDepth * 2 + 0.16],
    [0, base + height + 0.11, z],
  );
  builder.box(
    "matte",
    limestoneDark,
    [halfWidth * 1.6, 0.3, halfDepth * 1.5],
    [0, base + height + 0.37, z],
  );
  builder.box(
    "paint",
    templeRed,
    [halfWidth * 1.5, 0.9, 0.18],
    [0, base + height + 0.97, z - 0.1],
  );
  if (builder.isFar) {
    builder.box(
      "matte",
      palette.black,
      [0.6, 0.9, 0.04],
      [0, base + 0.45, templeFront + 0.01],
    );
    return;
  }
  [-0.45, 0, 0.45].forEach((x) => {
    builder.box(
      "matte",
      "#3a1a12",
      [0.18, 0.32, 0.2],
      [x, base + height + 0.95, z - 0.1],
    );
  });
  builder.box(
    "matte",
    limestoneDark,
    [halfWidth * 1.5 + 0.08, 0.08, 0.24],
    [0, base + height + 1.44, z - 0.1],
  );
  /* The doorway, with a carved lintel and two pillars */
  builder.box(
    "matte",
    "#1d1612",
    [0.62, 0.92, 0.04],
    [0, base + 0.46, templeFront + 0.01],
  );
  builder.box(
    "matte",
    limestoneDark,
    [1.0, 0.18, 0.12],
    [0, base + 1.0, templeFront + 0.04],
  );
  [-0.38, 0.38].forEach((x) => {
    builder.box(
      "matte",
      shade(limestone, 1.05),
      [0.14, 0.92, 0.1],
      [x, base + 0.46, templeFront + 0.04],
    );
  });
  /* A painted frieze of red and jade across the front */
  for (let tile = 0; tile < 7; tile++) {
    builder.box(
      "paint",
      tile % 2 === 0 ? templeRed : jade,
      [0.24, 0.16, 0.03],
      [-0.84 + tile * 0.28, base + 1.27, templeFront + 0.02],
    );
  }
};

/** A carved stela: a standing stone covered in glyphs, the Maya's writing. */
const addStela = (
  builder: AttractionBuilder,
  { x, z, turn }: { x: number; z: number; turn: number },
) => {
  const place = (dx: number, y: number, dz: number): Triple => [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    y,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  builder.box("matte", limestone, [0.7, 1.8, 0.26], place(0, 0.9, 0), [
    0,
    turn,
    0,
  ]);
  if (builder.isFar) {
    return;
  }
  builder.box("matte", limestoneDark, [0.76, 0.12, 0.3], place(0, 1.82, 0), [
    0,
    turn,
    0,
  ]);
  /* Glyph blocks in pairs, read down the stone */
  for (let row = 0; row < 4; row++) {
    [-0.15, 0.15].forEach((column) => {
      builder.box(
        "matte",
        (row + (column > 0 ? 1 : 0)) % 2 === 0
          ? limestoneDark
          : shade(limestone, 0.9),
        [0.24, 0.22, 0.04],
        place(column, 0.5 + row * 0.3, 0.14),
        [0, turn, 0],
      );
      builder.sphere(
        "matte",
        shade(limestone, 0.8),
        0.05,
        place(column, 0.5 + row * 0.3, 0.165),
        [1, 1, 0.4],
        6,
      );
    });
  }
  /* A round altar stone in front */
  builder.cylinder("matte", limestoneDark, {
    radius: 0.32,
    length: 0.35,
    at: place(0, 0.175, 0.6),
    segments: 14,
  });
};

/** The red jaguar throne, spotted with jade, as found at Chichen Itza. */
const buildJaguar = (builder: AttractionBuilder) => {
  const { x, z } = jaguarAt;
  builder.box("matte", limestoneDark, [0.9, 0.4, 1.3], [x, 0.2, z]);
  if (builder.isFar) {
    builder.box("paint", templeRed, [0.5, 0.5, 0.9], [x, 0.65, z]);
    return;
  }
  builder.box("matte", limestone, [1.0, 0.06, 1.4], [x, 0.43, z]);
  builder.sphere(
    "paint",
    templeRed,
    0.3,
    [x, 0.75, z - 0.1],
    [0.9, 0.75, 1.5],
    12,
  );
  const head: Triple = [x, 0.95, z + 0.42];
  builder.sphere("paint", templeRed, 0.2, head, [1, 0.9, 1], 12);
  builder.sphere(
    "paint",
    shade(templeRed, 1.1),
    0.1,
    [head[0], head[1] - 0.06, head[2] + 0.16],
    [1.1, 0.8, 0.8],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      templeRed,
      0.06,
      [head[0] + side * 0.13, head[1] + 0.16, head[2] - 0.02],
      [1, 1, 0.5],
      6,
    );
    builder.sphere(
      "glow",
      "#7fe0a8",
      0.035,
      [head[0] + side * 0.08, head[1] + 0.04, head[2] + 0.17],
      [1, 1, 1],
      6,
    );
    builder.bar(
      "paint",
      templeRed,
      [x + side * 0.15, 0.7, z + 0.25],
      [x + side * 0.15, 0.45, z + 0.35],
      0.12,
      6,
    );
    builder.sphere(
      "paint",
      templeRed,
      0.12,
      [x + side * 0.18, 0.62, z - 0.4],
      [0.7, 0.9, 1.1],
      8,
    );
  });
  builder.bar(
    "paint",
    templeRed,
    [x, 0.7, z - 0.55],
    [x + 0.3, 0.5, z - 0.75],
    0.07,
    5,
  );
  /* Jade discs for spots */
  for (let spot = 0; spot < 10; spot++) {
    const angle = spot * 2.4;
    builder.sphere(
      "paint",
      jade,
      0.04,
      [
        x + Math.sin(angle) * 0.25,
        0.8 + (spot % 3) * 0.05,
        z - 0.1 + Math.cos(angle) * 0.35,
      ],
      [1, 1, 1],
      5,
    );
  }
};

const buildVines = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* Vines draped down the terraces, with leaves along them */
  [
    { x: -1.9, face: 1 },
    { x: 1.6, face: 1 },
    { x: -2.2, face: -1 },
  ].forEach(({ x, face }) => {
    for (let tier = 0; tier < 3; tier++) {
      const half = tierHalfWidths[tier];
      const top = (tier + 1) * tierRise;
      const edge = pyramid.z + face * (half + 0.03);
      builder.bar(
        "matte",
        vine,
        [x, top, edge],
        [x + 0.1, top - tierRise + 0.1, edge],
        0.04,
        4,
      );
      builder.sphere(
        "matte",
        leafBright,
        0.14,
        [x + 0.05, top - 0.3, edge + face * 0.03],
        [1, 0.8, 0.4],
        6,
      );
    }
  });
  /* Bushes and ferns crowding round the base */
  addBush(builder, [3.3, 0, -2.4], 0.6, leafDeep);
  addBush(builder, [-3.4, 0, -2.0], 0.55, leafMid);
  addBush(builder, [3.4, 0, 0.6], 0.45, leafBright);
  addBush(builder, [-1.2, tierRise, 1.5], 0.3, leafMid);
  [
    [1.2, 2.6],
    [-3.3, 2.6],
  ].forEach(([x, z], index) => {
    for (let frond = 0; frond < 6; frond++) {
      const turn = (frond / 6) * Math.PI * 2 + index;
      builder.box(
        "matte",
        frond % 2 === 0 ? leafBright : leafMid,
        [0.1, 0.03, 0.7],
        [x + Math.sin(turn) * 0.3, 0.22, z + Math.cos(turn) * 0.3],
        [-0.5, turn, 0],
      );
    }
  });
};

const buildBrazierBowl = (builder: AttractionBuilder) => {
  const [x, y, z] = brazierAt;
  builder.lathe(
    "matte",
    limestoneDark,
    [
      [0.14, 0],
      [0.1, 0.25],
      [0.12, 0.32],
      [0.24, 0.48],
      [0.2, 0.52],
      [0, 0.5],
    ],
    [x, y - 0.55, z],
    "y",
    builder.isFar ? 6 : 14,
  );
  if (!builder.isFar) {
    builder.sphere("glow", "#e05a1e", 0.16, [x, y - 0.04, z], [1, 0.3, 1], 10);
  }
};

const buildFlame = (builder: AttractionBuilder) => {
  builder.cylinder("glow", flameOrange, {
    radius: 0.14,
    radiusEnd: 0.01,
    length: 0.42,
    at: [0, 0.2, 0],
    segments: 10,
  });
  builder.cylinder("glow", flameYellow, {
    radius: 0.08,
    radiusEnd: 0.005,
    length: 0.28,
    at: [0.03, 0.14, 0.02],
    segments: 8,
  });
};

/** A jade mosaic mask, as buried with the Maya king Pakal. */
const buildMask = (builder: AttractionBuilder) => {
  builder.sphere("paint", jade, 0.24, [0, 0, 0], [0.85, 1.1, 0.35], 14);
  builder.box("paint", jadeDark, [0.3, 0.04, 0.06], [0, 0.12, 0.06]);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.055,
      [side * 0.08, 0.05, 0.075],
      [1.3, 0.8, 0.4],
      8,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [side * 0.08, 0.05, 0.095],
      [1, 1, 0.5],
      6,
    );
    builder.cylinder("paint", jadeDark, {
      radius: 0.06,
      length: 0.03,
      at: [side * 0.23, 0, 0.0],
      axis: "x",
      segments: 10,
    });
  });
  builder.box("paint", jadeDark, [0.05, 0.12, 0.06], [0, -0.02, 0.09]);
  builder.box("paint", templeRed, [0.12, 0.03, 0.05], [0, -0.13, 0.08]);
};

const tierDeck: Deck = ({ x, z }) => {
  const reach = Math.max(Math.abs(x - pyramid.x), Math.abs(z - pyramid.z));
  const tiers = tierHalfWidths.filter((half) => reach <= half).length;
  return tiers > 0 ? { height: tiers * tierRise, kind: "ground" } : undefined;
};

const stairDeck: Deck = ({ x, z }) =>
  Math.abs(x) <= stairHalfWidth && z >= stairTopZ && z <= stairFootZ
    ? { height: stairHeightAt(z), kind: "ground" }
    : undefined;

const climbStart = { x: 0, z: stairFootZ + 0.35 };
const climbFinish = { x: 1.1, z: stairFootZ + 0.6 };

const climbRide = (progress: number): LocalSpot => {
  const up = Math.min(1, progress / 0.4);
  const down = Math.max(0, (progress - 0.6) / 0.4);
  if (progress < 0.6) {
    const z = climbStart.z + (stairTopZ - 0.15 - climbStart.z) * up;
    return {
      x: 0,
      y: Math.min(
        topHeight,
        Math.max(0, (stairFootZ - z) / (stairFootZ - stairTopZ)) * topHeight,
      ),
      z,
      heading:
        progress < 0.4 ? Math.PI : Math.PI + Math.sin(progress * 30) * 0.6,
    };
  }
  const z = stairTopZ - 0.15 + (climbFinish.z - stairTopZ + 0.15) * down;
  return {
    x: climbFinish.x * Math.max(0, (down - 0.8) / 0.2),
    y: Math.min(
      topHeight,
      Math.max(0, (stairFootZ - z) / (stairFootZ - stairTopZ)) * topHeight,
    ),
    z,
    heading: 0,
  };
};

export const mayanTempleModel: CuriosityModel = {
  kind: "mayan-temple",
  islandId: "jungle-reach",
  name: "Mayan Temple",
  fact: "The Maya built great stone cities in the rainforests of Central America. Around AD 900, when Britain was ruled by Anglo-Saxon kings, Maya priests climbed steep pyramids to temples on top. The Maya had their own writing, called glyphs, carved on standing stones, and they used a number for zero long before Europeans did.",
  curriculumLink:
    "History, Key Stage 2: a non-European society that provides contrasts with British history: Mayan civilization c. AD 900.",
  footprint: 5.2,
  setting: "inland",
  signSpot: { x: 2.1, z: 4.1 },
  build: (builder) => {
    buildTiers(builder);
    buildStair(builder);
    buildTemple(builder);
    stelae.forEach((stela) => {
      addStela(builder, stela);
    });
    buildJaguar(builder);
    buildVines(builder);
    buildBrazierBowl(builder);
    addSignBoard(builder, [2.1, 0, 4.1], signColour);
  },
  moving: [
    {
      name: "brazier flame",
      pivot: brazierAt,
      build: buildFlame,
      motion: { kind: "flicker", period: 0.7 },
    },
    {
      name: "jade mask",
      pivot: maskAt,
      build: buildMask,
      motion: { kind: "wake", reach: 7 },
    },
  ],
  decks: [tierDeck, stairDeck],
  rides: [
    {
      id: "temple-steps",
      name: "the temple steps",
      start: climbStart,
      reach: 0.5,
      seconds: 12,
      finish: climbFinish,
      follow: climbRide,
    },
  ],
  blockers: [
    { x: -0.45, z: temple.z, radius: 0.85 },
    { x: 0.45, z: temple.z, radius: 0.85 },
    { x: jaguarAt.x, z: jaguarAt.z, radius: 0.7 },
    ...stelae.map(({ x, z }): LocalBlocker => ({ x, z, radius: 0.45 })),
  ],
  play: {
    label: "Climb the steps",
    news: "Puff, puff! You climbed all the steep steps to the temple at the top, just as Maya priests did more than a thousand years ago.",
  },
};
