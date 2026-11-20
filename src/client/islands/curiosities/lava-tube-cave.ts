import { Shape } from "three";
import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ashGround = "#4f423c";
const basalt = "#3a3634";
const basaltLight = "#524a46";
const scoria = "#6b3a2c";
const tunnelInside = "#4a2e26";
const crust = "#2a2522";
const lavaGlow = "#ff6a1f";
const lavaCore = "#ffc04a";
const lanternLight = "#ffd27a";
const helmetYellow = "#f2c230";
const ropeColour = "#c9a86a";
const signColour = "#8a3a1e";

const tunnelInner = 1.15;
const tunnelOuter = 2.0;
const tunnelBack = -2.0;
const tunnelMouth = 0.2;
const lanternAt: Triple = [-1.3, 0, 0.95];
const lanternHang: Triple = [lanternAt[0] + 0.32, 1.32, lanternAt[2]];
const pool = { x: 2.55, z: 2.0, radius: 0.72 };

/* The lava stream's course: out of the tube, round to the pool */
const streamPath: readonly LocalPoint[] = [
  { x: 0, z: tunnelBack + 0.05 },
  { x: 0, z: tunnelMouth },
  { x: 0.35, z: 1.05 },
  { x: 1.15, z: 1.65 },
  { x: pool.x - 0.55, z: pool.z - 0.1 },
];

/** Rock lumps that make the hill round the tube, kept clear of its bore. */
const hillLumps: readonly (readonly [number, number, number, number])[] = [
  [-2.15, 0.4, -0.7, 0.95],
  [2.15, 0.4, -0.8, 0.95],
  [-1.4, 1.6, -0.9, 0.8],
  [1.3, 1.7, -1.1, 0.8],
  [0, 2.15, -1.0, 0.85],
  [0, 1.1, -3.4, 1.4],
  [-2.6, 0.25, -2.3, 1.0],
  [2.6, 0.25, -2.4, 1.0],
  [-1.0, 1.4, -2.9, 1.0],
  [1.1, 1.5, -3.0, 1.0],
  [0.2, 2.3, -2.2, 0.75],
];

/** Stalactites are dark basalt or rusty scoria, by where they hang. */
const findStalactiteColour = (x: number): string =>
  x > 0 ? scoria : basaltLight;

/** The lava tube: an arch of rock, extruded back into the hill. */
const buildTube = (builder: AttractionBuilder) => {
  const arch = new Shape();
  arch.moveTo(tunnelOuter, 0);
  arch.absarc(0, 0, tunnelOuter, 0, Math.PI, false);
  arch.lineTo(-tunnelInner, 0);
  arch.absarc(0, 0, tunnelInner, Math.PI, 0, true);
  arch.lineTo(tunnelOuter, 0);
  builder.endPlate(
    "matte",
    basalt,
    arch,
    tunnelBack,
    tunnelMouth,
    builder.isFar ? 0 : 0.06,
  );
  /* The dark far end of the tube, warmed by the lava's glow */
  builder.box(
    "matte",
    tunnelInside,
    [tunnelInner * 2, tunnelInner, 0.1],
    [0, tunnelInner / 2, tunnelBack],
  );
  builder.box(
    "matte",
    crust,
    [tunnelInner * 2, 0.04, tunnelMouth - tunnelBack],
    [0, 0.02, (tunnelBack + tunnelMouth) / 2],
  );
  hillLumps.forEach(([x, y, z, radius], index) => {
    if (builder.isFar && index > 5) {
      return;
    }
    builder.sphere(
      "matte",
      index % 3 === 0 ? basaltLight : index % 3 === 1 ? basalt : scoria,
      radius,
      [x, y, z],
      [1.15, 0.9, 1],
      builder.isFar ? 8 : 12,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* A rim of chunky boulders framing the mouth */
  for (let stone = 0; stone < 9; stone++) {
    const angle = (stone / 8) * Math.PI;
    const radius = (tunnelInner + tunnelOuter) / 2 + 0.05;
    builder.sphere(
      "matte",
      stone % 2 === 0 ? basaltLight : shade(basalt, 0.85),
      0.36 + (stone % 3) * 0.05,
      [Math.cos(angle) * radius, Math.sin(angle) * radius, tunnelMouth + 0.05],
      [1, 0.85, 0.8],
      9,
    );
  }
  /* Stalactites hanging from the roof, stalagmites growing up to meet them */
  [
    [-0.55, 0.1, 0.45],
    [-0.2, -0.05, 0.6],
    [0.25, 0.05, 0.5],
    [0.6, -0.1, 0.38],
    [-0.4, -0.9, 0.42],
    [0.1, -1.1, 0.55],
    [0.5, -1.3, 0.4],
    [-0.1, -1.6, 0.35],
  ].forEach(([x, z, length]) => {
    const roof = Math.sqrt(tunnelInner * tunnelInner - x * x);
    builder.cylinder("matte", findStalactiteColour(x), {
      radius: 0.005,
      radiusEnd: 0.08,
      length,
      at: [x, roof - length / 2 + 0.02, z],
      segments: 7,
    });
  });
  [
    [-0.85, -0.3, 0.35],
    [0.85, -0.6, 0.45],
    [-0.8, -1.4, 0.3],
    [0.8, -1.7, 0.28],
  ].forEach(([x, z, length]) => {
    builder.cylinder("matte", basaltLight, {
      radius: 0.11,
      radiusEnd: 0.01,
      length,
      at: [x, length / 2, z],
      segments: 7,
    });
  });
};

const buildStream = (builder: AttractionBuilder) => {
  for (let step = 0; step < streamPath.length - 1; step++) {
    const from = streamPath[step];
    const to = streamPath[step + 1];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const turn = Math.atan2(to.x - from.x, to.z - from.z);
    const middle: Triple = [(from.x + to.x) / 2, 0, (from.z + to.z) / 2];
    builder.box(
      "glow",
      lavaGlow,
      [0.5, 0.05, length],
      [middle[0], 0.05, middle[2]],
      [0, turn, 0],
    );
    builder.cylinder("glow", lavaGlow, {
      radius: 0.25,
      length: 0.05,
      at: [to.x, 0.05, to.z],
      segments: 10,
    });
    if (builder.isFar) {
      continue;
    }
    /* A brighter core down the middle, and cooled black crust banks */
    builder.box(
      "glow",
      lavaCore,
      [0.18, 0.02, length],
      [middle[0], 0.085, middle[2]],
      [0, turn, 0],
    );
    [-1, 1].forEach((side) => {
      const outX = Math.cos(turn) * side * 0.3;
      const outZ = -Math.sin(turn) * side * 0.3;
      builder.bar(
        "matte",
        crust,
        [from.x + outX, 0.06, from.z + outZ],
        [to.x + outX, 0.06, to.z + outZ],
        0.15,
        6,
      );
    });
    /* Crusty floes riding on the lava */
    builder.box(
      "matte",
      crust,
      [0.14, 0.04, 0.18],
      [middle[0] + 0.06, 0.09, middle[2]],
      [0, turn + 0.6, 0],
    );
  }
};

const buildPool = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 10 : 22;
  builder.cylinder("matte", basalt, {
    radius: pool.radius + 0.25,
    radiusEnd: pool.radius + 0.12,
    length: 0.22,
    at: [pool.x, 0.11, pool.z],
    segments,
  });
  builder.cylinder("glow", lavaGlow, {
    radius: pool.radius,
    length: 0.04,
    at: [pool.x, 0.2, pool.z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  for (let stone = 0; stone < 9; stone++) {
    const angle = (stone / 9) * Math.PI * 2;
    builder.sphere(
      "matte",
      stone % 2 === 0 ? basaltLight : crust,
      0.16 + (stone % 3) * 0.03,
      [
        pool.x + Math.sin(angle) * (pool.radius + 0.18),
        0.22,
        pool.z + Math.cos(angle) * (pool.radius + 0.18),
      ],
      [1.2, 0.7, 1],
      7,
    );
  }
  [
    [0.25, 0.2, 0.2],
    [-0.3, -0.15, 0.14],
  ].forEach(([dx, dz, size]) => {
    builder.box(
      "matte",
      crust,
      [size, 0.05, size * 0.8],
      [pool.x + dx, 0.23, pool.z + dz],
    );
  });
};

const buildLanternPost = (builder: AttractionBuilder) => {
  const [x, , z] = lanternAt;
  builder.box("matte", palette.darkTimber, [0.12, 1.75, 0.12], [x, 0.875, z]);
  if (builder.isFar) {
    return;
  }
  /* The bracket arm, and the lantern hanging from it */
  builder.box(
    "matte",
    palette.darkTimber,
    [0.45, 0.08, 0.08],
    [x + 0.2, 1.68, z],
  );
  builder.bar(
    "matte",
    palette.darkTimber,
    [x + 0.04, 1.4, z],
    [x + 0.3, 1.66, z],
    0.05,
    5,
  );
  const [hangX, hangY, hangZ] = lanternHang;
  builder.bar(
    "metal",
    palette.darkSteel,
    [hangX, 1.64, hangZ],
    [hangX, hangY + 0.2, hangZ],
    0.015,
    4,
  );
  builder.cylinder("metal", palette.black, {
    radius: 0.14,
    radiusEnd: 0.03,
    length: 0.12,
    at: [hangX, hangY + 0.15, hangZ],
    segments: 8,
  });
  builder.box(
    "metal",
    palette.black,
    [0.22, 0.04, 0.22],
    [hangX, hangY - 0.16, hangZ],
  );
  builder.box(
    "glass",
    palette.glass,
    [0.17, 0.26, 0.17],
    [hangX, hangY - 0.02, hangZ],
  );
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "metal",
        palette.black,
        [0.025, 0.3, 0.025],
        [hangX + sideX * 0.09, hangY - 0.02, hangZ + sideZ * 0.09],
      );
    });
  });
  builder.torus(
    "metal",
    palette.black,
    0.04,
    0.01,
    [hangX, hangY + 0.24, hangZ],
    "z",
    8,
  );
};

const buildExplorerKit = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* A coil of rope and a caver's helmet with its lamp, left by the mouth */
  const kitAt: Triple = [-2.35, 0, 1.35];
  [0, 1, 2].forEach((turnIndex) => {
    builder.torus(
      "matte",
      shade(ropeColour, 1 - turnIndex * 0.06),
      0.26 - turnIndex * 0.02,
      0.035,
      [kitAt[0], 0.04 + turnIndex * 0.06, kitAt[2]],
      "y",
      16,
    );
  });
  builder.sphere(
    "paint",
    helmetYellow,
    0.17,
    [kitAt[0] + 0.55, 0.04, kitAt[2] + 0.2],
    [1, 0.9, 1.1],
    12,
  );
  builder.cylinder("paint", shade(helmetYellow, 0.85), {
    radius: 0.22,
    length: 0.02,
    at: [kitAt[0] + 0.55, 0.05, kitAt[2] + 0.2],
    segments: 14,
  });
  builder.cylinder("glow", lanternLight, {
    radius: 0.05,
    length: 0.05,
    at: [kitAt[0] + 0.55, 0.13, kitAt[2] + 0.37],
    axis: "z",
    segments: 8,
  });
  /* A hot-rock warning post by the stream */
  const warnAt: Triple = [2.0, 0, 0.75];
  builder.box(
    "matte",
    palette.darkTimber,
    [0.07, 0.9, 0.07],
    [warnAt[0], 0.45, warnAt[2]],
  );
  builder.box(
    "paint",
    helmetYellow,
    [0.36, 0.36, 0.03],
    [warnAt[0], 0.9, warnAt[2] + 0.05],
    [0, 0, Math.PI / 4],
  );
  builder.box(
    "paint",
    palette.black,
    [0.05, 0.16, 0.035],
    [warnAt[0], 0.92, warnAt[2] + 0.05],
  );
  builder.box(
    "paint",
    palette.black,
    [0.05, 0.05, 0.035],
    [warnAt[0], 0.8, warnAt[2] + 0.05],
  );
  /* Light, bubbly pumice stones scattered about */
  [
    [-3.2, 2.2, 0.22],
    [-1.9, 2.9, 0.16],
    [3.4, 0.4, 0.25],
    [3.6, 3.0, 0.2],
    [0.9, 3.4, 0.14],
    [-3.6, 0.2, 0.3],
    [1.2, 2.6, 0.12],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#8d847c" : scoria,
      size,
      [x, size * 0.5, z],
      [1.2, 0.8, 1],
      7,
    );
  });
};

/** The lantern's flame, which lights as the Character comes near. */
const buildLanternFlame = (builder: AttractionBuilder) => {
  builder.sphere("glow", lanternLight, 0.07, [0, 0, 0], [1, 1.5, 1], 10);
  builder.box("glow", "#fff1c2", [0.1, 0.18, 0.1], [0, 0, 0]);
};

/** A soft glow round the lantern after dark. */
const buildLanternHalo = (builder: AttractionBuilder) => {
  builder.sphere("glow", lanternLight, 0.55, [0, 0, 0], [1, 1, 1], 12);
};

const buildLavaShimmer = (builder: AttractionBuilder) => {
  builder.cylinder("glow", lavaCore, {
    radius: pool.radius * 0.6,
    length: 0.03,
    at: [0, 0, 0],
    segments: 18,
  });
};

/** A fat lava bubble that bulges up and plops. */
const buildLavaBubble = (builder: AttractionBuilder) => {
  builder.sphere("glow", lavaGlow, 0.18, [0, 0, 0], [1, 0.75, 1], 12);
  builder.sphere("glow", lavaCore, 0.08, [0.05, 0.1, 0.05], [1, 0.6, 1], 8);
};

const buildBat = (builder: AttractionBuilder) => {
  const bat = "#2b2530";
  builder.sphere("matte", bat, 0.08, [0, 0, 0], [0.9, 0.9, 1.3], 7);
  builder.sphere("matte", bat, 0.06, [0, 0.03, 0.1], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(bat, 1.2),
      [0.22, 0.015, 0.14],
      [side * 0.14, 0.03, -0.01],
      [0, 0, side * 0.35],
    );
    builder.box(
      "matte",
      shade(bat, 1.2),
      [0.16, 0.015, 0.1],
      [side * 0.3, 0.1, -0.03],
      [0, 0, side * 0.7],
    );
    builder.box("matte", bat, [0.02, 0.05, 0.02], [side * 0.03, 0.1, 0.11]);
    builder.box(
      "glow",
      "#ffe08a",
      [0.015, 0.015, 0.01],
      [side * 0.025, 0.04, 0.16],
    );
  });
};

export const lavaTubeCaveModel: CuriosityModel = {
  kind: "lava-tube-cave",
  islandId: "ember-isle",
  name: "Lava Tube Cave",
  fact: "A lava tube is a tunnel made by flowing lava. The outside of a lava river cools and hardens into a rock roof, while hot runny lava keeps flowing underneath. When the lava drains away, it leaves a long cave behind. Drips of lava that cool on the roof make lava stalactites.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of physical geography, including volcanoes and earthquakes.",
  footprint: 5.2,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: -1.2, z: 4.0 },
  build: (builder) => {
    buildTube(builder);
    buildStream(builder);
    buildPool(builder);
    buildLanternPost(builder);
    buildExplorerKit(builder);
    addSignBoard(builder, [-1.2, 0, 4.0], signColour);
  },
  moving: [
    {
      name: "lantern flame",
      pivot: [lanternHang[0], lanternHang[1] - 0.04, lanternHang[2]],
      build: buildLanternFlame,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "lantern glow",
      pivot: [lanternHang[0], lanternHang[1] - 0.04, lanternHang[2]],
      build: buildLanternHalo,
      motion: { kind: "wake", reach: 6 },
      look: "halo",
    },
    {
      name: "lava shimmer",
      pivot: [pool.x, 0.225, pool.z],
      build: buildLavaShimmer,
      motion: { kind: "flicker", period: 1.3 },
    },
    {
      name: "lava bubble",
      pivot: [pool.x - 0.15, 0.1, pool.z + 0.1],
      build: buildLavaBubble,
      motion: { kind: "rise", reach: 7, height: 0.16, period: 0.9 },
    },
  ],
  wanderers: [
    {
      name: "bats",
      build: buildBat,
      count: 5,
      centre: { x: 0, z: 0.4 },
      radius: 2.2,
      speed: 1.6,
      height: 2.4,
      bob: 0.35,
    },
  ],
  blockers: [
    { x: 0, z: -1.0, radius: 1.95 },
    { x: -2.2, z: -1.2, radius: 1.1 },
    { x: 2.2, z: -1.2, radius: 1.1 },
    { x: 0, z: -3.2, radius: 1.5 },
    ...listWallBlockers(streamPath[1], streamPath[3], 0.4, 0.4),
    ...listWallBlockers(streamPath[3], streamPath[4], 0.4, 0.4),
    { x: pool.x, z: pool.z, radius: pool.radius + 0.3 },
    { x: lanternAt[0], z: lanternAt[2], radius: 0.15 },
  ] satisfies LocalBlocker[],
  tune: [88, 84, 91, 84],
  play: {
    label: "Shine your torch",
    news: "Your torch lit up the tube: glittering lava stalactites, glowing rock and a sleepy bat blinking back at you!",
  },
};
