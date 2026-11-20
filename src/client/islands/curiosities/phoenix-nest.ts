import { TorusGeometry } from "three";
import {
  addSignBoard,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const basalt = "#3b3230";
const basaltLight = "#5a4c47";
const lavaGlow = "#ff7a1f";
const emberGlow = "#ffb347";
const flameYellow = "#ffd55a";
const flameRed = "#ff4d1a";
const plumage = "#e2552b";
const plumageDeep = "#b8321e";
const beakGold = "#e8b33c";
const twig = "#6a4a2c";
const twigLight = "#8f6a42";
const amphora = "#c0703e";
const amphoraBlack = "#2a2220";
const signColour = "#8a3b1e";
const ashPad = "#5b4a42";

const spire = { x: 0, z: -0.6 };
const spireTop = 3.0;
const nestY = spireTop + 0.12;
const riseHeight = 1.25;

/** How wide the rock spire is at a height, narrowing as it climbs. */
const spireRadiusAt = (height: number): number =>
  1.3 - 0.7 * Math.min(1, Math.max(0, height / spireTop)) ** 0.8;

/** The rock spire: stacked, faceted chunks of basalt with glowing cracks. */
const buildSpire = (builder: AttractionBuilder) => {
  const chunks = builder.isFar ? 3 : 6;
  for (let chunk = 0; chunk < chunks; chunk++) {
    const bottom = (spireTop * chunk) / chunks;
    const top = (spireTop * (chunk + 1)) / chunks;
    builder.cylinder("matte", chunk % 2 === 0 ? basalt : shade(basalt, 1.12), {
      radius: spireRadiusAt(bottom) + 0.05,
      radiusEnd: spireRadiusAt(top) + 0.02,
      length: top - bottom + 0.06,
      at: [
        spire.x + (chunk % 2 === 0 ? 0.03 : -0.04),
        (bottom + top) / 2,
        spire.z,
      ],
      segments: builder.isFar ? 14 : 7,
    });
  }
  if (builder.isFar) {
    return;
  }
  /* Ledges sticking out of the faces, for a rugged outline */
  [
    { height: 0.7, turn: 0.6, size: 0.55 },
    { height: 1.4, turn: 2.6, size: 0.45 },
    { height: 2.1, turn: 4.3, size: 0.4 },
    { height: 1.1, turn: 5.4, size: 0.5 },
    { height: 2.6, turn: 1.4, size: 0.35 },
  ].forEach(({ height, turn, size }) => {
    const out = spireRadiusAt(height) - 0.05;
    builder.box(
      "matte",
      basaltLight,
      [size, size * 0.45, size * 0.8],
      [spire.x + Math.sin(turn) * out, height, spire.z + Math.cos(turn) * out],
      [0.2, turn, 0.15],
    );
  });
  /* Cracks glowing with heat from deep inside */
  [
    { height: 0.6, turn: 0.2, tilt: 0.3, length: 0.9 },
    { height: 1.5, turn: -0.5, tilt: -0.4, length: 0.7 },
    { height: 2.3, turn: 0.4, tilt: 0.5, length: 0.5 },
    { height: 1.0, turn: 3.4, tilt: -0.2, length: 0.8 },
    { height: 1.9, turn: 2.0, tilt: 0.35, length: 0.6 },
  ].forEach(({ height, turn, tilt, length }) => {
    const out = spireRadiusAt(height) - 0.02;
    builder.box(
      "glow",
      lavaGlow,
      [0.06, length, 0.06],
      [spire.x + Math.sin(turn) * out, height, spire.z + Math.cos(turn) * out],
      [0, turn, tilt],
    );
  });
};

/** A great nest of twigs on top of the spire, glowing embers inside. */
const buildNest = (builder: AttractionBuilder) => {
  const at: Triple = [spire.x, nestY, spire.z];
  builder.add(
    "matte",
    twig,
    new TorusGeometry(
      0.62,
      0.22,
      builder.isFar ? 4 : 7,
      builder.isFar ? 10 : 22,
    ),
    { at, rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1.3] },
  );
  builder.cylinder("glow", emberGlow, {
    radius: 0.55,
    length: 0.08,
    at: [at[0], at[1] - 0.05, at[2]],
    segments: 16,
  });
  if (builder.isFar) {
    return;
  }
  /* Twigs crossing round the rim, every which way */
  const twigs = 22;
  for (let index = 0; index < twigs; index++) {
    const angle = (index / twigs) * Math.PI * 2;
    const spin = angle + 0.9 + (index % 3) * 0.3;
    const radius = 0.64 + (index % 2) * 0.1;
    const centre: Triple = [
      at[0] + Math.sin(angle) * radius,
      at[1] + ((index % 4) - 1.5) * 0.06,
      at[2] + Math.cos(angle) * radius,
    ];
    builder.bar(
      "matte",
      index % 2 === 0 ? twigLight : twig,
      [
        centre[0] - Math.sin(spin) * 0.4,
        centre[1] - 0.08,
        centre[2] - Math.cos(spin) * 0.4,
      ],
      [
        centre[0] + Math.sin(spin) * 0.4,
        centre[1] + 0.1,
        centre[2] + Math.cos(spin) * 0.4,
      ],
      0.035,
      4,
    );
  }
  /* A golden egg tucked in at the side */
  builder.sphere(
    "glow",
    flameYellow,
    0.13,
    [at[0] + 0.3, at[1] + 0.05, at[2] - 0.2],
    [1, 1.3, 1],
    10,
  );
};

/** The phoenix: bright plumage, wings of flame and a long fiery tail. */
const buildPhoenix = (builder: AttractionBuilder) => {
  /* Body and breast */
  builder.sphere("paint", plumage, 0.26, [0, 0.32, 0], [0.85, 1, 1.2], 14);
  builder.sphere("glow", emberGlow, 0.17, [0, 0.3, 0.16], [0.9, 1.1, 0.7], 10);
  /* Neck and head */
  builder.bar("paint", plumage, [0, 0.45, 0.15], [0, 0.72, 0.26], 0.16, 8);
  builder.sphere("paint", plumage, 0.15, [0, 0.78, 0.28], [1, 1, 1.05], 12);
  builder.cylinder("paint", beakGold, {
    radius: 0.05,
    radiusEnd: 0.005,
    length: 0.17,
    at: [0, 0.76, 0.48],
    axis: "z",
    segments: 8,
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      amphoraBlack,
      0.028,
      [side * 0.1, 0.81, 0.36],
      [1, 1, 1],
      6,
    );
  });
  /* A crest of three flame feathers */
  [-0.35, 0, 0.35].forEach((lean, index) => {
    builder.cylinder("glow", index === 1 ? flameYellow : emberGlow, {
      radius: 0.04,
      radiusEnd: 0.004,
      length: 0.26,
      at: [0, 0.98, 0.2 - index * 0.03],
      axis: "y",
      segments: 6,
    });
    builder.box(
      "glow",
      flameYellow,
      [0.02, 0.02, 0.02],
      [lean * 0.1, 0.9, 0.22],
    );
  });
  /* Wings spread wide and high, each feather a tongue of flame */
  [-1, 1].forEach((side) => {
    [
      { length: 0.85, lift: 0.95, colour: flameRed },
      { length: 0.8, lift: 0.65, colour: lavaGlow },
      { length: 0.7, lift: 0.38, colour: emberGlow },
      { length: 0.55, lift: 0.12, colour: flameYellow },
    ].forEach(({ length, lift, colour }, index) => {
      const out = side * (0.18 + length * 0.5);
      builder.sphere(
        "glow",
        colour,
        0.5,
        [out, 0.45 + Math.sin(lift) * length * 0.5, -0.04 - index * 0.04],
        [length, 0.18, 0.06],
        10,
      );
    });
    builder.sphere(
      "paint",
      plumageDeep,
      0.13,
      [side * 0.22, 0.45, -0.02],
      [1.2, 0.8, 0.5],
      8,
    );
  });
  /* Three long tail feathers sweeping down behind */
  [-0.25, 0, 0.25].forEach((spread, index) => {
    builder.sphere(
      "glow",
      index === 1 ? lavaGlow : flameRed,
      0.5,
      [spread * 0.6, 0.12, -0.6],
      [0.12, 0.05, 0.62],
      10,
    );
    builder.sphere(
      "glow",
      flameYellow,
      0.07,
      [spread * 1.15, 0.02, -1.08],
      [1, 0.5, 1.4],
      6,
    );
  });
};

/** Flames dancing round the inside of the nest. */
const buildFlames = (builder: AttractionBuilder) => {
  for (let flame = 0; flame < 7; flame++) {
    const angle = (flame / 7) * Math.PI * 2;
    const height = 0.3 + (flame % 3) * 0.12;
    builder.cylinder("glow", flame % 2 === 0 ? lavaGlow : flameYellow, {
      radius: 0.1,
      radiusEnd: 0.005,
      length: height,
      at: [Math.sin(angle) * 0.42, height / 2, Math.cos(angle) * 0.42],
      segments: 7,
    });
  }
};

const buildAura = (builder: AttractionBuilder) => {
  builder.sphere("glow", emberGlow, 1.0, [0, 0, 0], [1, 0.8, 1], 14);
};

const buildEmber = (builder: AttractionBuilder) => {
  builder.sphere("glow", emberGlow, 0.05, [0, 0, 0], [1, 1.4, 1], 6);
};

/** Boulders at the spire's foot, scattered feathers and a Greek amphora. */
const buildGround = (builder: AttractionBuilder) => {
  [
    { x: 1.4, z: -0.2, size: 0.45 },
    { x: -1.35, z: -1.3, size: 0.55 },
    { x: 0.9, z: -1.8, size: 0.4 },
    { x: -1.65, z: -0.25, size: 0.35 },
  ].forEach(({ x, z, size }, index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? basaltLight : basalt,
      size,
      [x, size * 0.45, z],
      [1.2, 0.75, 1],
      8,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Fallen feathers that still glow */
  [
    [0.6, 1.4, 0.4],
    [-0.8, 1.1, 2.1],
    [1.6, 0.9, 1.0],
    [-0.3, 2.3, -0.6],
  ].forEach(([x, z, turn], index) => {
    builder.sphere(
      "glow",
      index % 2 === 0 ? lavaGlow : emberGlow,
      0.22,
      [x, 0.02, z],
      [0.25, 0.04, 1],
      8,
    );
    builder.box(
      "paint",
      beakGold,
      [0.015, 0.015, 0.4],
      [x, 0.04, z],
      [0, turn, 0],
    );
  });
  /* A painted amphora: black figures on terracotta */
  const pot: Triple = [-2.1, 0, 1.0];
  builder.lathe(
    "paint",
    amphora,
    [
      [0, 0],
      [0.1, 0],
      [0.13, 0.08],
      [0.26, 0.35],
      [0.28, 0.52],
      [0.2, 0.72],
      [0.09, 0.82],
      [0.08, 0.95],
      [0.13, 1.0],
      [0.1, 1.02],
    ],
    pot,
    "y",
    18,
  );
  builder.lathe(
    "paint",
    amphoraBlack,
    [
      [0.266, 0.4],
      [0.285, 0.52],
      [0.255, 0.6],
    ],
    pot,
    "y",
    18,
  );
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      amphoraBlack,
      new TorusGeometry(0.09, 0.02, 4, 10, Math.PI),
      {
        at: [pot[0] + side * 0.14, 0.82, pot[2]],
        rotation: [0, 0, side < 0 ? Math.PI / 2 : -Math.PI / 2],
      },
    );
  });
  /* A bronze brazier with a little fire, to keep the egg warm */
  const brazier: Triple = [1.8, 0, 1.1];
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      "#9a6b32",
      [
        brazier[0] + Math.sin(angle) * 0.28,
        0,
        brazier[2] + Math.cos(angle) * 0.28,
      ],
      [brazier[0], 0.7, brazier[2]],
      0.04,
      5,
    );
  });
  builder.lathe(
    "metal",
    "#b07c38",
    [
      [0.05, 0],
      [0.28, 0.12],
      [0.32, 0.2],
    ],
    [brazier[0], 0.62, brazier[2]],
    "y",
    16,
  );
  [0, 1, 2].forEach((flame) => {
    const angle = (flame / 3) * Math.PI * 2;
    builder.cylinder("glow", flame === 0 ? flameYellow : lavaGlow, {
      radius: 0.09,
      radiusEnd: 0.005,
      length: 0.32 - flame * 0.05,
      at: [
        brazier[0] + Math.sin(angle) * 0.08,
        0.95,
        brazier[2] + Math.cos(angle) * 0.08,
      ],
      segments: 6,
    });
  });
  /* Toe holds cut up the front of the spire */
  for (let hold = 0; hold < 5; hold++) {
    const height = 0.45 + hold * 0.5;
    const turn = (hold % 2 === 0 ? 0.25 : -0.25) + 0.05;
    const out = spireRadiusAt(height) + 0.02;
    builder.box(
      "matte",
      basaltLight,
      [0.3, 0.07, 0.16],
      [spire.x + Math.sin(turn) * out, height, spire.z + Math.cos(turn) * out],
      [0, turn, 0],
    );
  }
};

/* The climb: up the toe holds to the nest, then a spiral slide down. */
const climbStart = { x: spire.x, z: spire.z + 1.9 };
const slideTurns = Math.PI * 2 + 0.9;
const slideEndAngle = -slideTurns;
const slideOut = 0.5;
const climbFinish = {
  x: spire.x + Math.sin(slideEndAngle) * (spireRadiusAt(0) + slideOut),
  z: spire.z + Math.cos(slideEndAngle) * (spireRadiusAt(0) + slideOut),
};

const followClimb = (progress: number): LocalSpot => {
  const climbShare = 0.4;
  const restShare = 0.15;
  if (progress < climbShare) {
    const share = progress / climbShare;
    const height = share * (nestY + 0.15);
    const out =
      share < 0.15
        ? 1.9 - (share / 0.15) * (1.9 - spireRadiusAt(0) - 0.25)
        : spireRadiusAt(height) + 0.25;
    return { x: spire.x, y: height, z: spire.z + out, heading: Math.PI };
  }
  if (progress < climbShare + restShare) {
    return {
      x: spire.x,
      y: nestY + 0.15,
      z: spire.z + spireRadiusAt(spireTop) + 0.2,
      heading: 0,
    };
  }
  const share =
    (progress - climbShare - restShare) / (1 - climbShare - restShare);
  const angle = -slideTurns * share;
  const height = (nestY + 0.15) * (1 - share);
  const radius = spireRadiusAt(height) + 0.2 + slideOut * share;
  return {
    x: spire.x + Math.sin(angle) * radius,
    y: height,
    z: spire.z + Math.cos(angle) * radius,
    heading: Math.atan2(-Math.cos(angle), Math.sin(angle)),
  };
};

export const phoenixNestModel: CuriosityModel = {
  kind: "phoenix-nest",
  islandId: "ember-isle",
  name: "Phoenix Nest",
  fact: "The phoenix is a magical bird from ancient Greek myths. The Greeks told how it lived for five hundred years, then burst into flames, and a new young phoenix rose from the ashes. Myths like this were stories people told to explain the world, and we still use the phoenix to mean a fresh start.",
  curriculumLink:
    "History, Key Stage 2: Ancient Greece. A study of Greek life and achievements and their influence on the western world, including Greek myths and legends.",
  footprint: 4.5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: 1.3, z: 3.5 },
  build: (builder) => {
    buildSpire(builder);
    buildNest(builder);
    buildGround(builder);
    if (builder.isFar) {
      builder.sphere(
        "glow",
        lavaGlow,
        0.3,
        [spire.x, nestY + 0.3, spire.z],
        [1.6, 0.8, 1.6],
        8,
      );
    }
    addSignBoard(builder, [1.3, 0, 3.5], signColour);
  },
  moving: [
    {
      name: "phoenix",
      pivot: [spire.x, nestY - 0.2, spire.z],
      build: buildPhoenix,
      motion: { kind: "rise", reach: 7, height: riseHeight, period: 1.6 },
    },
    {
      name: "nest flames",
      pivot: [spire.x, nestY, spire.z],
      build: buildFlames,
      motion: { kind: "flicker", period: 0.7 },
    },
    {
      name: "glow",
      pivot: [spire.x, nestY + riseHeight + 0.2, spire.z],
      build: buildAura,
      motion: { kind: "wake", reach: 7 },
      look: "halo",
    },
  ],
  wanderers: [
    {
      name: "embers",
      build: buildEmber,
      count: 7,
      centre: spire,
      radius: 1.3,
      speed: 0.6,
      height: spireTop + 0.9,
      bob: 0.7,
    },
  ],
  rides: [
    {
      id: "phoenix-climb",
      name: "the phoenix spire",
      start: climbStart,
      reach: 0.6,
      seconds: 11,
      finish: climbFinish,
      follow: followClimb,
    },
  ],
  blockers: [
    { x: spire.x, z: spire.z, radius: spireRadiusAt(0) + 0.15 },
    { x: 1.4, z: -0.2, radius: 0.5 },
    { x: -1.35, z: -1.3, radius: 0.6 },
    { x: 0.9, z: -1.8, radius: 0.45 },
    { x: -1.65, z: -0.25, radius: 0.4 },
    { x: -2.1, z: 1.0, radius: 0.35 },
    { x: 1.8, z: 1.1, radius: 0.4 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Ask for a feather",
    news: "The phoenix spread its wings of flame, sang a sweet note and dropped a warm golden feather into your hands.",
    tune: [76, 79, 83, 88],
  },
};
