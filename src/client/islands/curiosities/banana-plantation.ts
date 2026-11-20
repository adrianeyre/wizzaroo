import { SphereGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const stemGreen = "#7a9a45";
const stemBrown = "#8a7a4a";
const leafGreen = "#3f9a3a";
const leafDark = "#2e7a30";
const leafDry = "#a8a050";
const greenBanana = "#8fbf3a";
const ripeBanana = "#f2d23c";
const budPurple = "#7a2f4f";
const shedTimber = "#9a6a3c";
const roofTin = "#9fb3b8";
const crateTimber = "#c99a5a";
const cartRed = "#b8452f";
const monkeyBrown = "#7a5232";
const monkeyFace = "#e6c39a";
const signColour = "#4f7a2a";

interface BananaPlant {
  x: number;
  z: number;
  height: number;
  turn: number;
}

const plants: readonly BananaPlant[] = [
  { x: -3.1, z: -2.4, height: 2.3, turn: 0.4 },
  { x: -1.0, z: -3.7, height: 2.6, turn: 1.7 },
  { x: 1.5, z: -3.5, height: 2.4, turn: 2.9 },
  { x: 3.3, z: -2.0, height: 2.1, turn: 4.1 },
  { x: -2.9, z: 0.2, height: 2.0, turn: 5.2 },
];
const heroPlant: BananaPlant = { x: 0.2, z: -1.4, height: 2.5, turn: 0 };
const heroBunchAt: Triple = [
  heroPlant.x,
  heroPlant.height - 0.35,
  heroPlant.z + 0.42,
];

const shed = { x: 2.7, z: 0.9, width: 2.4, depth: 1.7, height: 2.0 };
const cart = { x: -2.5, z: 2.5 };
const crateStack = { x: 1.6, z: 2.3 };

/** A big paddle-shaped banana leaf, arching out from the top of the stem. */
const addBananaLeaf = (
  builder: AttractionBuilder,
  base: Triple,
  turn: number,
  tilt: number,
  length: number,
  colour: string,
) => {
  const reach = length * 0.5;
  const at: Triple = [
    base[0] + Math.sin(turn) * reach * Math.cos(tilt),
    base[1] + Math.sin(tilt) * reach,
    base[2] + Math.cos(turn) * reach * Math.cos(tilt),
  ];
  builder.add(
    "matte",
    colour,
    new SphereGeometry(1, builder.segments(8, 4), builder.segments(4, 2)),
    {
      at,
      rotation: [-tilt, turn, 0],
      scale: [length * 0.2, 0.025, length * 0.5],
    },
  );
  if (builder.isFar) {
    return;
  }
  /* The leaf's midrib */
  builder.bar(
    "matte",
    shade(stemGreen, 1.1),
    base,
    [
      base[0] + Math.sin(turn) * length * 0.95 * Math.cos(tilt),
      base[1] + Math.sin(tilt) * length * 0.95 + 0.02,
      base[2] + Math.cos(turn) * length * 0.95 * Math.cos(tilt),
    ],
    0.035,
    4,
  );
};

/** A green bunch still on the plant, as one ridged lump. */
const addBunchLump = (builder: AttractionBuilder, at: Triple) => {
  builder.lathe(
    "matte",
    greenBanana,
    [
      [0, 0.35],
      [0.16, 0.3],
      [0.2, 0.15],
      [0.2, -0.05],
      [0.14, -0.2],
      [0, -0.26],
    ],
    at,
    "y",
    builder.isFar ? 6 : 10,
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", budPurple, {
    radius: 0.07,
    radiusEnd: 0.01,
    length: 0.28,
    at: [at[0], at[1] - 0.4, at[2]],
    axis: "y",
    segments: 8,
  });
};

const addPlant = (
  builder: AttractionBuilder,
  plant: BananaPlant,
  hasBunch: boolean,
) => {
  const { x, z, height, turn } = plant;
  /* The stem is really tightly wrapped leaf stalks, so it isn't a tree at all */
  builder.cylinder("matte", stemGreen, {
    radius: 0.17,
    radiusEnd: 0.11,
    length: height,
    at: [x, height / 2, z],
    segments: 10,
  });
  const top: Triple = [x, height, z];
  const leaves = builder.isFar ? 3 : 7;
  for (let index = 0; index < leaves; index++) {
    const angle = turn + (index / leaves) * Math.PI * 2;
    addBananaLeaf(
      builder,
      top,
      angle,
      0.15 + (index % 3) * 0.22,
      1.25 + (index % 2) * 0.25,
      index % 2 === 0 ? leafGreen : leafDark,
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Old leaves hanging dry down the stem, and suckers at its foot */
  builder.box(
    "matte",
    leafDry,
    [0.22, 0.7, 0.02],
    [x + 0.16, height - 0.6, z],
    [0, turn, 0.2],
  );
  builder.cylinder("matte", stemBrown, {
    radius: 0.22,
    radiusEnd: 0.17,
    length: 0.3,
    at: [x, 0.15, z],
    segments: 10,
  });
  builder.cylinder("matte", stemGreen, {
    radius: 0.07,
    radiusEnd: 0.04,
    length: 0.6,
    at: [x + 0.3, 0.3, z + 0.1],
    segments: 6,
  });
  addBananaLeaf(
    builder,
    [x + 0.3, 0.55, z + 0.1],
    turn + 1,
    0.6,
    0.5,
    leafGreen,
  );
  if (hasBunch) {
    const bunchAt: Triple = [
      x - Math.sin(turn) * 0.38,
      height - 0.45,
      z - Math.cos(turn) * 0.38,
    ];
    builder.bar(
      "matte",
      stemGreen,
      [x, height - 0.05, z],
      [bunchAt[0], bunchAt[1] + 0.35, bunchAt[2]],
      0.05,
      5,
    );
    addBunchLump(builder, bunchAt);
  }
};

const buildPlants = (builder: AttractionBuilder) => {
  plants.forEach((plant, index) => {
    addPlant(builder, plant, index % 2 === 0);
  });
  addPlant(builder, heroPlant, false);
  if (builder.isFar) {
    addBunchLump(builder, heroBunchAt);
    return;
  }
  /* The hero plant's stalk, curving over to where its bunch hangs */
  builder.bar(
    "matte",
    stemGreen,
    [heroPlant.x, heroPlant.height - 0.05, heroPlant.z + 0.05],
    [heroBunchAt[0], heroBunchAt[1] + 0.12, heroBunchAt[2]],
    0.05,
    5,
  );
  /* Mulch of chopped leaves round each plant */
  [...plants, heroPlant].forEach(({ x, z }, index) => {
    builder.cylinder("matte", index % 2 === 0 ? "#6b5434" : "#5e4a2e", {
      radius: 0.55,
      length: 0.04,
      at: [x, 0.02, z],
      segments: 10,
    });
  });
};

/** A ripe bunch: hands of bananas in tiers round the stalk. */
const addBunch = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  tiers: number,
) => {
  builder.cylinder("matte", stemGreen, {
    radius: 0.035,
    length: 0.3 + tiers * 0.13,
    at: [at[0], at[1] - (tiers * 0.13) / 2, at[2]],
    segments: 6,
  });
  for (let tier = 0; tier < tiers; tier++) {
    const y = at[1] - 0.05 - tier * 0.14;
    const count = 6;
    for (let banana = 0; banana < count; banana++) {
      const angle = (banana / count) * Math.PI * 2 + tier * 0.5;
      const out = 0.09 - tier * 0.006;
      builder.bar(
        "paint",
        banana % 2 === 0 ? colour : shade(colour, 0.93),
        [
          at[0] + Math.sin(angle) * out * 0.6,
          y - 0.04,
          at[2] + Math.cos(angle) * out * 0.6,
        ],
        [
          at[0] + Math.sin(angle) * out * 1.9,
          y + 0.12,
          at[2] + Math.cos(angle) * out * 1.9,
        ],
        0.055,
        5,
      );
    }
  }
};

const buildHeroBunch = (builder: AttractionBuilder) => {
  addBunch(builder, [0, 0.1, 0], ripeBanana, 4);
  builder.cylinder("matte", budPurple, {
    radius: 0.09,
    radiusEnd: 0.015,
    length: 0.34,
    at: [0, -0.62, 0],
    segments: 10,
  });
  builder.sphere("matte", budPurple, 0.09, [0, -0.45, 0], [1, 0.8, 1], 8);
};

const buildShed = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = shed;
  builder.box(
    "matte",
    palette.paving,
    [width + 0.3, 0.12, depth + 0.3],
    [x, 0.06, z],
  );
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "matte",
        shedTimber,
        [0.12, height + (sideZ < 0 ? 0.25 : 0), 0.12],
        [
          x + (sideX * width) / 2,
          (height + (sideZ < 0 ? 0.25 : 0)) / 2,
          z + (sideZ * depth) / 2,
        ],
      );
    });
  });
  /* A tin roof sloping to the front */
  builder.box(
    "metal",
    roofTin,
    [width + 0.4, 0.05, depth + 0.5],
    [x, height + 0.14, z],
    [-0.14, 0, 0],
  );
  if (builder.isFar) {
    return;
  }
  for (let rib = 0; rib < 9; rib++) {
    builder.box(
      "metal",
      shade(roofTin, 0.85),
      [0.04, 0.04, depth + 0.5],
      [x - width / 2 - 0.15 + rib * ((width + 0.3) / 8), height + 0.18, z],
      [-0.14, 0, 0],
    );
  }
  /* A back wall of planks to keep the sun off */
  for (let plank = 0; plank < 6; plank++) {
    builder.box(
      "matte",
      shade(shedTimber, plank % 2 === 0 ? 1.08 : 0.95),
      [width, 0.36, 0.04],
      [x, 0.3 + plank * 0.37, z - depth / 2],
    );
  }
  /* The washing trough, where bunches are cut into hands and rinsed */
  builder.box("paint", "#5f8fa0", [1.2, 0.5, 0.55], [x - 0.4, 0.37, z - 0.3]);
  builder.box(
    "water",
    palette.water,
    [1.1, 0.03, 0.45],
    [x - 0.4, 0.6, z - 0.3],
  );
  [-0.2, 0.15].forEach((dx, index) => {
    builder.sphere(
      "paint",
      greenBanana,
      0.1,
      [x - 0.4 + dx, 0.62, z - 0.3 + index * 0.1],
      [1.6, 0.5, 1],
      8,
    );
  });
  /* A packing table with a hanging scale over it */
  builder.box(
    "matte",
    palette.paleTimber,
    [0.8, 0.05, 0.6],
    [x + 0.7, 0.8, z - 0.3],
  );
  [-0.35, 0.35].forEach((dx) => {
    [-0.25, 0.25].forEach((dz) => {
      builder.box(
        "matte",
        shedTimber,
        [0.05, 0.78, 0.05],
        [x + 0.7 + dx, 0.4, z - 0.3 + dz],
      );
    });
  });
  builder.bar(
    "metal",
    palette.darkSteel,
    [x + 0.7, height, z - 0.3],
    [x + 0.7, 1.55, z - 0.3],
    0.015,
    4,
  );
  builder.cylinder("paint", palette.white, {
    radius: 0.12,
    length: 0.05,
    at: [x + 0.7, 1.45, z - 0.3],
    axis: "z",
    segments: 14,
  });
  builder.box(
    "paint",
    palette.postRed,
    [0.01, 0.09, 0.01],
    [x + 0.7, 1.47, z - 0.27],
    [0, 0, 0.5],
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.2,
    radiusEnd: 0.15,
    length: 0.06,
    at: [x + 0.7, 1.12, z - 0.3],
    segments: 14,
  });
  [-0.2, 0.2].forEach((dz) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + 0.7, 1.35, z - 0.3],
      [x + 0.7, 1.14, z - 0.3 + dz],
      0.01,
      3,
    );
  });
  addBunch(builder, [x + 0.7, 1.3, z - 0.3], greenBanana, 2);
  /* Hands of bananas laid out on the table, and a cutting knife */
  [-0.2, 0.15].forEach((dx) => {
    for (let banana = 0; banana < 4; banana++) {
      builder.bar(
        "paint",
        greenBanana,
        [x + 0.7 + dx, 0.86, z - 0.4 + banana * 0.07],
        [x + 0.7 + dx + 0.2, 0.88, z - 0.42 + banana * 0.09],
        0.05,
        5,
      );
    }
  });
  builder.box(
    "metal",
    palette.steel,
    [0.25, 0.01, 0.05],
    [x + 0.95, 0.835, z - 0.05],
    [0, 0.4, 0],
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.1, 0.03, 0.04],
    [x + 0.8, 0.84, z + 0.01],
    [0, 0.4, 0],
  );
  /* A blue bag on a hook, for covering bunches while they grow */
  builder.box(
    "paint",
    "#3f78c8",
    [0.25, 0.45, 0.03],
    [x - width / 2 + 0.3, 1.3, z - depth / 2 + 0.05],
  );
};

/** A packing crate with slatted sides, filled with green hands. */
const addCrate = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  isFull: boolean,
) => {
  const size = 0.55;
  builder.box(
    "matte",
    crateTimber,
    [size, size * 0.62, size * 0.8],
    [at[0], at[1] + size * 0.31, at[2]],
    [0, turn, 0],
  );
  if (builder.isFar) {
    return;
  }
  [0.12, 0.3].forEach((up) => {
    builder.box(
      "matte",
      shade(crateTimber, 0.82),
      [size + 0.02, 0.05, size * 0.8 + 0.02],
      [at[0], at[1] + up, at[2]],
      [0, turn, 0],
    );
  });
  if (isFull) {
    [-0.12, 0.12].forEach((across) => {
      builder.sphere(
        "paint",
        greenBanana,
        0.12,
        [
          at[0] + Math.cos(turn) * across,
          at[1] + size * 0.62,
          at[2] - Math.sin(turn) * across,
        ],
        [1.5, 0.45, 1],
        8,
      );
    });
  }
};

const buildYard = (builder: AttractionBuilder) => {
  /* A dirt track between the rows, and a path to the visitors */
  builder.box("matte", "#a88a5e", [1.1, 0.03, 3.6], [-0.6, 0.015, 3.0]);
  builder.box("matte", "#a88a5e", [5.2, 0.03, 0.9], [0.2, 0.015, 1.2]);
  addCrate(builder, [crateStack.x, 0, crateStack.z], 0.1, true);
  addCrate(builder, [crateStack.x + 0.6, 0, crateStack.z - 0.05], -0.08, true);
  addCrate(builder, [crateStack.x + 0.3, 0.34, crateStack.z], 0.2, true);
  addCrate(builder, [crateStack.x - 0.1, 0, crateStack.z - 0.62], 0.4, false);
  /* A wooden hand cart loaded with bunches */
  builder.box("matte", cartRed, [1.3, 0.1, 0.8], [cart.x, 0.55, cart.z]);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(cartRed, 0.85),
      [1.3, 0.25, 0.05],
      [cart.x, 0.72, cart.z + side * 0.38],
    );
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.32,
      length: 0.07,
      at: [cart.x - 0.1, 0.32, cart.z + side * 0.47],
      axis: "z",
      segments: 16,
    });
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.07,
      length: 0.09,
      at: [cart.x - 0.1, 0.32, cart.z + side * 0.47],
      axis: "z",
      segments: 8,
    });
    builder.bar(
      "matte",
      palette.timber,
      [cart.x + 0.6, 0.55, cart.z + side * 0.3],
      [cart.x + 1.35, 0.35, cart.z + side * 0.3],
      0.06,
      5,
    );
  });
  builder.box(
    "matte",
    shade(cartRed, 0.85),
    [0.05, 0.25, 0.8],
    [cart.x - 0.63, 0.72, cart.z],
  );
  builder.bar(
    "matte",
    palette.timber,
    [cart.x + 0.6, 0.35, cart.z - 0.3],
    [cart.x + 0.6, 0, cart.z - 0.3],
    0.05,
    4,
  );
  [
    [-0.3, -0.12],
    [0.15, 0.14],
  ].forEach(([dx, dz]) => {
    addBunch(builder, [cart.x + dx, 0.9, cart.z + dz], greenBanana, 2);
  });
  /* A bamboo pole with a knife on the end, for cutting high bunches */
  builder.bar("matte", "#c9b458", [-4.1, 0, 1.6], [-3.7, 2.2, 1.3], 0.05, 5);
  builder.box(
    "metal",
    palette.steel,
    [0.04, 0.25, 0.12],
    [-3.68, 2.3, 1.28],
    [0, 0, -0.2],
  );
  /* Banana skins tossed in a basket */
  builder.cylinder("matte", "#a77b45", {
    radius: 0.22,
    radiusEnd: 0.18,
    length: 0.28,
    at: [0.6, 0.14, 2.6],
    segments: 12,
  });
  builder.sphere("paint", ripeBanana, 0.16, [0.6, 0.28, 2.6], [1, 0.4, 1], 8);
};

const buildMonkey = (builder: AttractionBuilder) => {
  builder.sphere("matte", monkeyBrown, 0.2, [0, 0.1, 0], [1, 1.1, 0.9], 10);
  builder.sphere(
    "matte",
    monkeyBrown,
    0.17,
    [0, 0.42, 0.02],
    [1, 0.95, 0.95],
    10,
  );
  builder.sphere(
    "matte",
    monkeyFace,
    0.12,
    [0, 0.4, 0.1],
    [1.05, 0.9, 0.7],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      monkeyBrown,
      0.07,
      [side * 0.17, 0.46, 0.0],
      [0.6, 1, 0.9],
      8,
    );
    builder.sphere(
      "matte",
      monkeyFace,
      0.045,
      [side * 0.175, 0.46, 0.02],
      [0.5, 1, 0.9],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [side * 0.05, 0.45, 0.19],
      [1, 1, 1],
      6,
    );
    /* Arms reaching over the crate's edge */
    builder.bar(
      "matte",
      monkeyBrown,
      [side * 0.15, 0.2, 0.05],
      [side * 0.2, 0.05, 0.28],
      0.08,
      6,
    );
    builder.sphere(
      "matte",
      monkeyFace,
      0.05,
      [side * 0.2, 0.04, 0.3],
      [1, 0.7, 1],
      6,
    );
  });
  builder.sphere(
    "matte",
    shade(monkeyFace, 0.8),
    0.03,
    [0, 0.38, 0.19],
    [1.4, 0.8, 1],
    6,
  );
  /* A banana held up proudly */
  builder.bar(
    "paint",
    ripeBanana,
    [0.2, 0.06, 0.3],
    [0.32, 0.28, 0.34],
    0.06,
    6,
  );
};

export const bananaPlantationModel: CuriosityModel = {
  kind: "banana-plantation",
  islandId: "jungle-reach",
  name: "Banana Plantation",
  fact: "Bananas need hot, wet weather all year, so they grow in tropical countries and not in the UK. They are picked while still green and sent thousands of miles by ship, ripening on the way to our shops. A banana plant is not a tree: it is a giant herb, and its trunk is made of tightly rolled leaves.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of human geography, including trade links and the distribution of natural resources, including food.",
  footprint: 5.8,
  setting: "inland",
  signSpot: { x: -0.6, z: 4.8 },
  build: (builder) => {
    buildPlants(builder);
    buildShed(builder);
    buildYard(builder);
    addSignBoard(builder, [-0.6, 0, 4.8], signColour);
  },
  moving: [
    {
      name: "ripe bunch",
      pivot: heroBunchAt,
      build: buildHeroBunch,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.3, period: 1.6 },
    },
    {
      name: "cheeky monkey",
      pivot: [crateStack.x + 0.3, -0.25, crateStack.z - 0.4],
      build: buildMonkey,
      motion: { kind: "rise", reach: 5, height: 0.6, period: 1.4 },
    },
  ],
  blockers: [
    ...[...plants, heroPlant].map(({ x, z }): LocalBlocker => ({
      x,
      z,
      radius: 0.3,
    })),
    { x: shed.x - 0.4, z: shed.z - 0.3, radius: 0.65 },
    { x: shed.x + 0.7, z: shed.z - 0.3, radius: 0.5 },
    { x: cart.x, z: cart.z, radius: 0.75 },
    { x: crateStack.x + 0.25, z: crateStack.z - 0.2, radius: 0.6 },
  ],
  play: {
    label: "Pick a banana",
    news: "Snap! You picked a banana from the bunch. It's still green, so it will ripen to yellow on its long trip across the sea.",
  },
};
