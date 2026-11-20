import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ironBlue = "#2c3d7a";
const wireSilver = "#d9e0ea";
const baseStone = "#b4b0c6";
const baseStoneDark = "#8b87a0";
const sandFloor = "#d9c79c";
const branchGrey = "#6d5a4b";
const cactusGreen = "#4f8a5a";
const cactusFlower = "#ffd84a";
const finchBlack = "#2e2a2b";
const finchBrown = "#7a5b3e";
const finchBelly = "#c9b28a";
const beakHorn = "#d8b26a";
const bustSilver = "#a7afbf";
const plinthStone = "#cfcadb";
const boardPurple = "#4a3a7a";
const signColour = "#3d3f8c";

/* The aviary sits at the back; Darwin and the beak board stand in front. */
const cage = { x: 0, z: -0.7 };
const baseHeight = 0.5;
const domeRadius = 1.9;
const domeHeight = 2.9;
const ribs = 12;
const bustAt = { x: 2.55, z: 1.75 };
const boardAt = { x: -2.5, z: 1.75 };
const cactusTop: Triple = [cage.x + 0.75, baseHeight + 1.12, cage.z - 0.75];
const feederHook: Triple = [cage.x - 0.55, baseHeight + 2.45, cage.z + 0.35];

/** A point on the dome, `rise` from 0 at the base to 1 at the top. */
const domePoint = (angle: number, rise: number): Triple => {
  const lift = rise * (Math.PI / 2);
  return [
    cage.x + Math.sin(angle) * Math.cos(lift) * domeRadius,
    baseHeight + Math.sin(lift) * domeHeight,
    cage.z + Math.cos(angle) * Math.cos(lift) * domeRadius,
  ];
};

const buildBase = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 16 : 36;
  builder.cylinder("matte", baseStone, {
    radius: domeRadius + 0.12,
    radiusEnd: domeRadius + 0.06,
    length: baseHeight,
    at: [cage.x, baseHeight / 2, cage.z],
    segments,
  });
  builder.cylinder("matte", sandFloor, {
    radius: domeRadius - 0.02,
    length: 0.02,
    at: [cage.x, baseHeight + 0.01, cage.z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  /* A coping ring and blocks of dressed stone round the base */
  builder.torus(
    "matte",
    baseStoneDark,
    domeRadius + 0.06,
    0.07,
    [cage.x, baseHeight, cage.z],
    "y",
    28,
  );
  for (let block = 0; block < 16; block++) {
    const angle = (block / 16) * Math.PI * 2;
    builder.box(
      "matte",
      block % 2 === 0 ? baseStoneDark : shade(baseStone, 1.08),
      [0.5, 0.18, 0.06],
      [
        cage.x + Math.sin(angle) * (domeRadius + 0.13),
        0.16 + (block % 2) * 0.18,
        cage.z + Math.cos(angle) * (domeRadius + 0.13),
      ],
      [0, angle, 0],
    );
  }
  /* Steps up to the door */
  builder.box(
    "matte",
    baseStoneDark,
    [0.9, 0.25, 0.4],
    [cage.x, 0.125, cage.z + domeRadius + 0.3],
  );
};

const buildCage = (builder: AttractionBuilder) => {
  const ribCount = builder.isFar ? 6 : ribs;
  const steps = builder.isFar ? 3 : 5;
  for (let rib = 0; rib < ribCount; rib++) {
    const angle = (rib / ribCount) * Math.PI * 2;
    for (let step = 0; step < steps; step++) {
      builder.bar(
        "paint",
        ironBlue,
        domePoint(angle, step / steps),
        domePoint(angle, (step + 1) / steps),
        builder.isFar ? 0.08 : 0.06,
        4,
      );
    }
  }
  /* The finial on top */
  builder.lathe(
    "metal",
    wireSilver,
    [
      [0, 0],
      [0.22, 0.02],
      [0.16, 0.18],
      [0.06, 0.32],
      [0.02, 0.5],
      [0, 0.52],
    ],
    [cage.x, baseHeight + domeHeight - 0.02, cage.z],
    "y",
    builder.isFar ? 8 : 16,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "metal",
    wireSilver,
    0.06,
    [cage.x, baseHeight + domeHeight + 0.55, cage.z],
    [1, 1, 1],
    10,
  );
  /* Silver hoops of wire round the dome */
  [0.0, 0.3, 0.56, 0.8].forEach((rise) => {
    const [, height] = domePoint(0, rise);
    const radius = Math.cos(rise * (Math.PI / 2)) * domeRadius;
    builder.torus(
      "metal",
      wireSilver,
      radius,
      0.025,
      [cage.x, height, cage.z],
      "y",
      rise > 0.7 ? 16 : 24,
    );
  });
  /* A fine mesh hinted by thin wires between the ribs, low down */
  for (let wire = 0; wire < ribs; wire++) {
    const angle = ((wire + 0.5) / ribs) * Math.PI * 2;
    builder.bar(
      "metal",
      wireSilver,
      domePoint(angle, 0),
      domePoint(angle, 0.56),
      0.018,
      3,
    );
  }
  /* The door: a frame of blue iron on the front */
  const doorZ = cage.z + domeRadius - 0.05;
  [-0.32, 0.32].forEach((side) => {
    builder.bar(
      "paint",
      ironBlue,
      [cage.x + side, baseHeight, doorZ],
      [cage.x + side, baseHeight + 1.3, doorZ - 0.12],
      0.06,
      4,
    );
  });
  builder.bar(
    "paint",
    ironBlue,
    [cage.x - 0.32, baseHeight + 1.3, doorZ - 0.12],
    [cage.x + 0.32, baseHeight + 1.3, doorZ - 0.12],
    0.06,
    4,
  );
  for (let slat = 0; slat < 5; slat++) {
    builder.bar(
      "metal",
      wireSilver,
      [cage.x - 0.24 + slat * 0.12, baseHeight + 0.05, doorZ + 0.01],
      [cage.x - 0.24 + slat * 0.12, baseHeight + 1.24, doorZ - 0.1],
      0.02,
      3,
    );
  }
  builder.sphere(
    "metal",
    palette.brass,
    0.04,
    [cage.x + 0.24, baseHeight + 0.7, doorZ + 0.0],
    [1, 1, 1],
    8,
  );
};

const buildInside = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const floor = baseHeight + 0.02;
  /* A bare branch to perch on */
  const trunkFoot: Triple = [cage.x - 0.6, floor, cage.z - 0.6];
  const trunkTop: Triple = [cage.x - 0.5, floor + 1.4, cage.z - 0.65];
  builder.bar("matte", branchGrey, trunkFoot, trunkTop, 0.12, 6);
  (
    [
      [0.65, 1.75, -0.2],
      [-0.55, 1.9, 0.25],
      [0.1, 2.1, 0.45],
      [-0.25, 1.15, -0.55],
    ] satisfies Triple[]
  ).forEach(([dx, height, dz], index) => {
    const from: Triple = [
      trunkTop[0],
      floor + (index === 3 ? 0.9 : 1.3),
      trunkTop[2],
    ];
    const to: Triple = [trunkTop[0] + dx, floor + height, trunkTop[2] + dz];
    builder.bar("matte", branchGrey, from, to, 0.06, 5);
    builder.bar(
      "matte",
      shade(branchGrey, 1.15),
      to,
      [to[0] + dx * 0.3, to[1] + 0.2, to[2] - dz * 0.4],
      0.03,
      4,
    );
  });
  /* A prickly pear cactus, like the ones on the Galapagos Islands */
  builder.cylinder("matte", shade(cactusGreen, 0.8), {
    radius: 0.09,
    radiusEnd: 0.07,
    length: 0.6,
    at: [cactusTop[0], floor + 0.3, cactusTop[2]],
    segments: 8,
  });
  (
    [
      [0, 0.75, 0, 0.26, 0],
      [0.22, 0.55, 0.05, 0.19, 0.6],
      [-0.2, 0.62, -0.04, 0.2, -0.5],
      [0.05, 0.95, 0.04, 0.22, 0.2],
    ] satisfies [number, number, number, number, number][]
  ).forEach(([dx, height, dz, size, turn]) => {
    builder.sphere(
      "matte",
      cactusGreen,
      size,
      [cactusTop[0] + dx, floor + height, cactusTop[2] + dz],
      [1, 1.25, 0.32],
      8,
    );
    builder.sphere(
      "paint",
      cactusFlower,
      0.045,
      [
        cactusTop[0] + dx + Math.sin(turn) * size * 0.7,
        floor + height + size * 1.2,
        cactusTop[2] + dz,
      ],
      [1, 0.7, 1],
      6,
    );
  });
  /* A water dish and a seed tray on the sand */
  const dish: Triple = [cage.x + 0.55, floor + 0.04, cage.z + 0.75];
  builder.cylinder("matte", baseStoneDark, {
    radius: 0.28,
    radiusEnd: 0.32,
    length: 0.08,
    at: dish,
    segments: 16,
  });
  builder.cylinder("water", palette.water, {
    radius: 0.26,
    length: 0.02,
    at: [dish[0], dish[1] + 0.04, dish[2]],
    segments: 16,
  });
  builder.box(
    "matte",
    palette.timber,
    [0.5, 0.06, 0.3],
    [cage.x - 0.7, floor + 0.03, cage.z + 0.8],
  );
  for (let seed = 0; seed < 6; seed++) {
    builder.sphere(
      "matte",
      seed % 2 === 0 ? "#8a6a3a" : "#c9a86a",
      0.035,
      [
        cage.x - 0.88 + seed * 0.07,
        floor + 0.07,
        cage.z + 0.78 + (seed % 3) * 0.04,
      ],
      [1, 0.7, 1],
      5,
    );
  }
};

/** A tube feeder on a wire, swinging gently. */
const buildFeeder = (builder: AttractionBuilder) => {
  builder.bar("metal", wireSilver, [0, 0, 0], [0, -0.7, 0], 0.012, 3);
  builder.cylinder("metal", wireSilver, {
    radius: 0.09,
    radiusEnd: 0.02,
    length: 0.08,
    at: [0, -0.72, 0],
    segments: 12,
  });
  builder.cylinder("glass", "#cfe3f2", {
    radius: 0.07,
    length: 0.45,
    at: [0, -1.0, 0],
    segments: 12,
  });
  builder.cylinder("matte", "#b08a4a", {
    radius: 0.06,
    length: 0.34,
    at: [0, -1.05, 0],
    segments: 10,
  });
  builder.cylinder("metal", wireSilver, {
    radius: 0.1,
    length: 0.04,
    at: [0, -1.24, 0],
    segments: 12,
  });
  builder.bar("metal", wireSilver, [-0.2, -1.15, 0], [0.2, -1.15, 0], 0.015, 3);
};

interface FinchLook {
  feathers: string;
  beakRadius: number;
  beakLength: number;
  beakDroop: number;
}

const seedCracker: FinchLook = {
  feathers: finchBlack,
  beakRadius: 0.038,
  beakLength: 0.06,
  beakDroop: 0,
};
const insectPicker: FinchLook = {
  feathers: finchBrown,
  beakRadius: 0.016,
  beakLength: 0.07,
  beakDroop: 0,
};
const cactusProber: FinchLook = {
  feathers: shade(finchBlack, 1.3),
  beakRadius: 0.017,
  beakLength: 0.11,
  beakDroop: 0.35,
};

/** One finch facing +z, standing on y = 0, with its own kind of beak. */
const buildFinch = (builder: AttractionBuilder, look: FinchLook) => {
  builder.sphere(
    "matte",
    look.feathers,
    0.08,
    [0, 0.09, 0],
    [0.9, 0.85, 1.3],
    8,
  );
  builder.sphere(
    "matte",
    finchBelly,
    0.06,
    [0, 0.07, 0.03],
    [0.9, 0.8, 1.1],
    6,
  );
  builder.sphere("matte", look.feathers, 0.058, [0, 0.16, 0.08], [1, 1, 1], 8);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(look.feathers, 0.8),
      [0.02, 0.06, 0.12],
      [side * 0.068, 0.11, -0.01],
      [0.25, side * 0.15, 0],
    );
    builder.sphere(
      "paint",
      palette.black,
      0.012,
      [side * 0.042, 0.175, 0.118],
      [1, 1, 1],
      4,
    );
  });
  builder.box(
    "matte",
    shade(look.feathers, 0.75),
    [0.07, 0.015, 0.11],
    [0, 0.1, -0.13],
    [-0.3, 0, 0],
  );
  builder.cylinder("paint", beakHorn, {
    radius: look.beakRadius,
    radiusEnd: 0.003,
    length: look.beakLength,
    at: [
      0,
      0.155 - look.beakDroop * look.beakLength * 0.5,
      0.125 + look.beakLength / 2,
    ],
    axis: "z",
    segments: 6,
  });
  [-0.025, 0.025].forEach((side) => {
    builder.bar("paint", beakHorn, [side, 0.05, 0], [side, 0, 0.01], 0.01, 3);
  });
};

/** Darwin's bust on a plinth, white-bearded and thoughtful. */
const buildDarwin = (builder: AttractionBuilder) => {
  const { x, z } = bustAt;
  builder.box("matte", plinthStone, [0.55, 1.0, 0.55], [x, 0.5, z]);
  builder.box(
    "matte",
    shade(plinthStone, 0.85),
    [0.68, 0.12, 0.68],
    [x, 0.06, z],
  );
  builder.sphere(
    "metal",
    bustSilver,
    0.2,
    [x, 1.38, z],
    [1, 1.1, 1],
    builder.isFar ? 8 : 16,
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    shade(plinthStone, 0.85),
    [0.64, 0.08, 0.64],
    [x, 1.02, z],
  );
  /* Shoulders and coat */
  builder.sphere(
    "metal",
    shade(bustSilver, 0.85),
    0.24,
    [x, 1.1, z],
    [1.4, 0.55, 0.85],
    12,
  );
  /* The great beard, the brow and the nose */
  builder.sphere(
    "metal",
    shade(bustSilver, 1.12),
    0.15,
    [x, 1.25, z + 0.1],
    [1, 1.25, 0.75],
    12,
  );
  builder.box(
    "metal",
    shade(bustSilver, 0.9),
    [0.26, 0.04, 0.06],
    [x, 1.46, z + 0.17],
  );
  builder.sphere(
    "metal",
    bustSilver,
    0.035,
    [x, 1.39, z + 0.2],
    [0.8, 1.1, 1],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "metal",
      bustSilver,
      0.045,
      [x + side * 0.2, 1.38, z],
      [0.5, 1, 0.8],
      8,
    );
  });
  /* A plaque on the front */
  builder.box("metal", palette.brass, [0.36, 0.2, 0.02], [x, 0.66, z + 0.28]);
  [0.7, 0.64, 0.6].forEach((y, index) => {
    builder.box(
      "paint",
      shade(palette.brass, 0.6),
      [0.26 - index * 0.04, 0.02, 0.01],
      [x, y, z + 0.29],
    );
  });
};

/** A board comparing the three beaks, side by side. */
const buildBeakBoard = (builder: AttractionBuilder) => {
  const { x, z } = boardAt;
  builder.box("paint", boardPurple, [1.5, 0.75, 0.08], [x, 1.15, z]);
  if (builder.isFar) {
    return;
  }
  [-0.7, 0.7].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 1.5, 0.08],
      [x + side, 0.75, z - 0.05],
    );
  });
  builder.box("paint", wireSilver, [1.6, 0.06, 0.12], [x, 1.55, z]);
  [seedCracker, insectPicker, cactusProber].forEach((look, index) => {
    const panelX = x - 0.48 + index * 0.48;
    builder.cylinder("paint", palette.cream, {
      radius: 0.2,
      length: 0.02,
      at: [panelX, 1.2, z + 0.05],
      axis: "z",
      segments: 18,
    });
    builder.sphere(
      "matte",
      look.feathers,
      0.1,
      [panelX - 0.04, 1.2, z + 0.07],
      [1, 1, 0.5],
      10,
    );
    builder.sphere(
      "paint",
      palette.white,
      0.022,
      [panelX - 0.02, 1.24, z + 0.12],
      [1, 1, 0.5],
      6,
    );
    builder.cylinder("paint", beakHorn, {
      radius: look.beakRadius * 2,
      radiusEnd: 0.005,
      length: look.beakLength * 2,
      at: [
        panelX + 0.05 + look.beakLength,
        1.2 - look.beakDroop * 0.06,
        z + 0.08,
      ],
      axis: "x",
      segments: 8,
    });
    builder.box(
      "paint",
      palette.cream,
      [0.32, 0.05, 0.01],
      [panelX, 0.88, z + 0.05],
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.paving, [1.0, 0.03, 2.6], [0, 0.015, 2.7]);
  if (builder.isFar) {
    return;
  }
  /* Starry flowers in the beds either side of the path */
  (
    [
      [-1.1, 2.6],
      [1.1, 2.4],
      [-1.4, 3.3],
      [1.35, 3.4],
      [-3.0, 0.4],
      [3.1, 0.3],
    ] satisfies [number, number][]
  ).forEach(([fx, fz], index) => {
    builder.bar("matte", palette.leaf, [fx, 0, fz], [fx, 0.3, fz], 0.03, 3);
    builder.sphere(
      "glow",
      index % 2 === 0 ? "#bfa8ff" : "#9fe6ff",
      0.07,
      [fx, 0.33, fz],
      [1, 0.6, 1],
      6,
    );
  });
};

export const finchAviaryModel: CuriosityModel = {
  kind: "finch-aviary",
  islandId: "starfall-isle",
  name: "Finch Aviary",
  fact: "When Charles Darwin visited the Galapagos Islands in 1835, he collected finches with very different beaks. Big strong beaks crack hard seeds, thin pointed beaks pick up insects, and long beaks reach into cactus flowers. Over a very long time, each kind of finch became adapted to the food where it lived, which helped Darwin explain evolution.",
  curriculumLink:
    "Science, Year 6: evolution and inheritance. Identify how animals and plants are adapted to suit their environment in different ways and that adaptation may lead to evolution.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 1.2, z: 3.6 },
  build: (builder) => {
    buildBase(builder);
    buildCage(builder);
    buildInside(builder);
    buildDarwin(builder);
    buildBeakBoard(builder);
    buildGrounds(builder);
    addSignBoard(builder, [1.2, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "cactus finch",
      pivot: [cactusTop[0] + 0.05, cactusTop[1] - 0.2, cactusTop[2] - 0.1],
      build: (builder) => {
        buildFinch(builder, cactusProber);
      },
      motion: { kind: "rise", reach: 6, height: 0.38, period: 1.6 },
    },
    {
      name: "feeder",
      pivot: feederHook,
      build: buildFeeder,
      motion: { kind: "swing", axis: "z", amplitude: 0.12, period: 3.2 },
    },
  ],
  wanderers: [
    {
      name: "seed-cracker finches",
      build: (builder) => {
        buildFinch(builder, seedCracker);
      },
      count: 3,
      centre: cage,
      radius: 1.1,
      speed: 0.7,
      height: 1.5,
      bob: 0.25,
    },
    {
      name: "insect-picker finches",
      build: (builder) => {
        buildFinch(builder, insectPicker);
      },
      count: 3,
      centre: cage,
      radius: 0.9,
      speed: 0.9,
      height: 2.2,
      bob: 0.2,
    },
  ],
  blockers: [
    { x: cage.x, z: cage.z, radius: domeRadius + 0.2 },
    { x: bustAt.x, z: bustAt.z, radius: 0.45 },
    { x: boardAt.x - 0.6, z: boardAt.z, radius: 0.25 },
    { x: boardAt.x + 0.6, z: boardAt.z, radius: 0.25 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Compare the beaks",
    news: "Crack, peck, sip! The big beak cracked a seed, the thin beak caught a fly, and the long beak drank from a cactus flower.",
    tune: [79, 83, 86, 83, 91],
  },
};
