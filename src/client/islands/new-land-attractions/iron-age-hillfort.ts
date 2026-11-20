import { ConeGeometry } from "three";
import {
  addGableRoof,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addArcLathe,
  addBasket,
  addGrassTuft,
  addLump,
  addPerson,
  addPot,
  addRoundHouse,
  addSheet,
  sands,
  type RoundHouse,
} from "./date-palm-grove-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const hilltop = "#b9a66c";
const turf = "#8d9a4a";
const turfDark = "#76843d";
const earth = "#8b6a44";
const oak = "#6e4b2c";
const oakLight = "#94683e";
const bronze = "#b8863b";
const verdigris = "#4f9a86";
const woad = "#3d5a9a";
const tartanRed = "#a8402e";
const tartanGreen = "#4c6e3a";
const fleece = "#7a5a40";
const signColour = "#4c6e3a";

/* ------------------------------------------------------------------ */
/* The bank                                                            */
/* ------------------------------------------------------------------ */

const bankInner = 5.6;
const bankCrest = 6.9;
const bankOuter = 8.3;
const bankTop = 0.75;
const gateHalf = 0.95;
const palisadeRadius = 7.25;
const walkRadius = 6.6;
const gateBack = 5.35;
const gateFront = 8.5;

const findBankHeight = (radius: number): number => {
  if (radius <= bankInner || radius >= bankOuter) {
    return 0;
  }
  if (radius <= bankCrest) {
    return (
      (bankTop *
        (1 -
          Math.cos(
            (Math.PI * (radius - bankInner)) / (bankCrest - bankInner),
          ))) /
      2
    );
  }
  return (
    (bankTop *
      (1 +
        Math.cos((Math.PI * (radius - bankCrest)) / (bankOuter - bankCrest)))) /
    2
  );
};

const isInGateway = (x: number, z: number): boolean =>
  z > 0 && Math.abs(x) < gateHalf;

const bankGap = Math.asin(1.0 / bankOuter);
const palisadeGap = Math.asin(1.15 / palisadeRadius);

const buildBank = (builder: AttractionBuilder) => {
  const steps = builder.isFar ? 6 : 12;
  const profile: [number, number][] = [];
  for (let step = steps; step >= 0; step--) {
    const radius = bankInner + ((bankOuter - bankInner) * step) / steps;
    profile.push([radius, findBankHeight(radius) + 0.01]);
  }
  addArcLathe(
    builder,
    "matte",
    turf,
    profile,
    [0, 0, 0],
    56,
    bankGap,
    Math.PI * 2 - bankGap * 2,
  );
  /* A worn chalk path along the top, and a ditch line beyond. */
  addArcLathe(
    builder,
    "matte",
    "#cbbd94",
    [
      [walkRadius + 0.35, findBankHeight(walkRadius + 0.35) + 0.025],
      [walkRadius - 0.35, findBankHeight(walkRadius - 0.35) + 0.025],
    ],
    [0, 0, 0],
    56,
    bankGap + 0.04,
    Math.PI * 2 - bankGap * 2 - 0.08,
  );
  addArcLathe(
    builder,
    "matte",
    turfDark,
    [
      [bankOuter + 0.9, 0.012],
      [bankOuter - 0.05, 0.012],
    ],
    [0, 0, 0],
    56,
    bankGap,
    Math.PI * 2 - bankGap * 2,
  );
};

const buildPalisade = (builder: AttractionBuilder) => {
  const span = Math.PI * 2 - palisadeGap * 2;
  const spacing = builder.isFar ? 0.9 : 0.3;
  const stakes = Math.round((span * palisadeRadius) / spacing);
  const base = findBankHeight(palisadeRadius);
  for (let stake = 0; stake <= stakes; stake++) {
    const angle = palisadeGap + (stake / stakes) * span;
    const height = 1.45 + 0.12 * Math.sin(stake * 2.7);
    const x = Math.sin(angle) * palisadeRadius;
    const z = Math.cos(angle) * palisadeRadius;
    builder.box(
      "matte",
      stake % 3 === 0 ? oakLight : oak,
      [builder.isFar ? 0.9 : 0.26, height, 0.16],
      [x, base - 0.1 + height / 2, z],
      [0, angle + Math.PI / 2, 0],
    );
    if (!builder.isFar) {
      builder.add(
        "matte",
        stake % 3 === 0 ? oakLight : oak,
        new ConeGeometry(0.15, 0.26, 4, 1, true),
        {
          at: [x, base - 0.1 + height + 0.13, z],
          rotation: [0, angle + Math.PI / 4, 0],
        },
      );
    }
  }
  /* Two rails binding the stakes together on the inside. */
  if (!builder.isFar) {
    [0.45, 1.1].forEach((up) => {
      builder.torus(
        "matte",
        shade(oak, 0.8),
        palisadeRadius - 0.11,
        0.035,
        [0, base + up, 0],
        "y",
        36,
      );
    });
  }
};

/* ------------------------------------------------------------------ */
/* The gatehouse                                                       */
/* ------------------------------------------------------------------ */

const bridgeHeight = 2.35;
const bridgeZ = 7.0;
const carnyxAt: Triple = [0.35, bridgeHeight + 0.88, bridgeZ + 0.18];

const buildGatehouse = (builder: AttractionBuilder) => {
  /* Timber-faced walls lining the way in, holding back the bank. */
  [-1, 1].forEach((side) => {
    const x = side * (gateHalf + 0.08);
    builder.box(
      "matte",
      oak,
      [0.16, 1.5, gateFront - gateBack],
      [x, 0.75, (gateBack + gateFront) / 2],
    );
    builder.box(
      "matte",
      earth,
      [0.6, 0.9, gateFront - gateBack - 0.3],
      [x + side * 0.38, 0.45, (gateBack + gateFront) / 2],
    );
    if (!builder.isFar) {
      for (let plank = 0; plank < 9; plank++) {
        builder.box(
          "matte",
          plank % 2 === 0 ? oakLight : shade(oak, 0.9),
          [0.04, 1.4, 0.06],
          [x - side * 0.1, 0.7, gateBack + 0.2 + plank * 0.35],
        );
      }
    }
    /* Tall corner posts carry the bridge and the lookout roof. */
    [gateBack + 0.1, bridgeZ - 0.6, bridgeZ + 0.6, gateFront - 0.1].forEach(
      (z) => {
        builder.cylinder("matte", oak, {
          radius: 0.12,
          length: 3.6,
          at: [side * (gateHalf + 0.12), 1.8, z],
          segments: 8,
        });
      },
    );
  });
  /* The bridge over the gate, with a railing and a little roof. */
  builder.box(
    "matte",
    oakLight,
    [gateHalf * 2 + 0.5, 0.14, 1.5],
    [0, bridgeHeight, bridgeZ],
  );
  [-0.7, 0.7].forEach((offset) => {
    builder.box(
      "matte",
      oak,
      [gateHalf * 2 + 0.5, 0.08, 0.08],
      [0, bridgeHeight + 0.75, bridgeZ + offset],
    );
  });
  addGableRoof(builder, {
    width: gateHalf * 2 + 0.6,
    depth: 1.6,
    rise: 0.7,
    at: [0, 3.6, bridgeZ],
    colour: sands.thatch,
    thickness: 0.14,
    overhang: 0.25,
  });
  /* The gates, swung open against the walls. */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(oak, 1.1),
      [0.1, 1.55, 0.95],
      [side * (gateHalf - 0.1), 0.85, gateFront - 0.55],
    );
    if (!builder.isFar) {
      [0.4, 1.3].forEach((up) => {
        builder.box(
          "metal",
          palette.darkSteel,
          [0.12, 0.06, 0.9],
          [side * (gateHalf - 0.1), up, gateFront - 0.55],
        );
      });
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Skulls of oxen over the gate, and spears in a rack. */
  [-0.5, 0.5].forEach((x) => {
    builder.sphere(
      "matte",
      "#efe7d2",
      0.12,
      [x, bridgeHeight - 0.2, gateFront - 0.95],
      [1, 0.9, 0.7],
      8,
    );
    builder.bar(
      "matte",
      "#efe7d2",
      [x - 0.12, bridgeHeight - 0.15, gateFront - 0.92],
      [x - 0.25, bridgeHeight + 0.02, gateFront - 0.9],
      0.03,
      4,
    );
    builder.bar(
      "matte",
      "#efe7d2",
      [x + 0.12, bridgeHeight - 0.15, gateFront - 0.92],
      [x + 0.25, bridgeHeight + 0.02, gateFront - 0.9],
      0.03,
      4,
    );
  });
  /* A shield hung on the railing. */
  builder.cylinder("paint", tartanRed, {
    radius: 0.28,
    length: 0.05,
    at: [-0.55, bridgeHeight + 0.5, bridgeZ + 0.78],
    axis: "z",
    segments: 14,
  });
  builder.sphere(
    "metal",
    bronze,
    0.08,
    [-0.55, bridgeHeight + 0.5, bridgeZ + 0.81],
    [1, 1, 0.6],
    8,
  );
  /* The warrior who blows the carnyx. */
  addPerson(builder, [0.35, bridgeHeight + 0.07, bridgeZ - 0.1], 0, {
    skin: sands.skinLight,
    cloth: tartanGreen,
    hair: "#b0602a",
    head: "hair",
  });
};

const buildCarnyx = (builder: AttractionBuilder) => {
  /* A tall bronze war trumpet ending in a boar's head with a wagging jaw. */
  builder.cylinder("metal", bronze, {
    radius: 0.035,
    length: 1.9,
    at: [0, 0.95, 0],
    segments: 8,
  });
  builder.cylinder("metal", bronze, {
    radius: 0.05,
    length: 0.18,
    at: [0, 0.0, 0],
    segments: 8,
  });
  builder.sphere("metal", bronze, 0.16, [0, 1.95, 0.08], [0.8, 0.9, 1.5], 12);
  builder.cylinder("metal", verdigris, {
    radius: 0.12,
    radiusEnd: 0.16,
    length: 0.22,
    at: [0, 1.95, 0.32],
    axis: "z",
    segments: 10,
  });
  builder.box(
    "metal",
    bronze,
    [0.2, 0.05, 0.28],
    [0, 1.82, 0.28],
    [0.35, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      bronze,
      [0.04, 0.16, 0.08],
      [side * 0.09, 2.1, 0.0],
      [0, 0, side * 0.3],
    );
    builder.sphere(
      "glow",
      "#ffd27a",
      0.022,
      [side * 0.08, 2.0, 0.24],
      [1, 1, 1],
      6,
    );
  });
  builder.box("metal", verdigris, [0.05, 0.12, 0.2], [0, 2.12, 0.08]);
};

/* ------------------------------------------------------------------ */
/* Inside the fort                                                     */
/* ------------------------------------------------------------------ */

const houses: readonly RoundHouse[] = [
  {
    x: -1.8,
    z: -2.1,
    radius: 2.1,
    wallHeight: 1.45,
    peak: 4.4,
    door: 0,
    wall: sands.daub,
    roof: sands.thatch,
  },
  {
    x: 3.1,
    z: -1.2,
    radius: 1.45,
    wallHeight: 1.4,
    peak: 3.4,
    door: Math.atan2(-3.1, 3.4),
    wall: shade(sands.daub, 1.05),
    roof: shade(sands.thatch, 0.9),
  },
];

const furnaceAt = { x: 3.2, z: 2.5 };
const granaryAt = { x: -3.9, z: 2.4 };
const loomAt = { x: -1.5, z: 1.5 };

const buildFurnace = (builder: AttractionBuilder) => {
  const { x, z } = furnaceAt;
  builder.lathe(
    "matte",
    "#a8673e",
    [
      [0, 0],
      [0.55, 0],
      [0.5, 0.4],
      [0.36, 1.0],
      [0.22, 1.35],
      [0.15, 1.35],
      [0.15, 1.0],
      [0, 1.0],
    ],
    [x, 0, z],
    "y",
    14,
  );
  /* The glowing mouth at the bottom, facing the gate. */
  builder.box("matte", "#3b2a22", [0.34, 0.3, 0.1], [x, 0.17, z + 0.5]);
  if (builder.isFar) {
    return;
  }
  builder.box("glow", "#ff7a2a", [0.24, 0.2, 0.06], [x, 0.16, z + 0.54]);
  /* A tree-stump anvil, tongs, a hammer and a heap of iron bars. */
  const anvil: Triple = [x - 1.0, 0, z + 0.6];
  builder.cylinder("matte", oakLight, {
    radius: 0.24,
    radiusEnd: 0.21,
    length: 0.5,
    at: [anvil[0], 0.25, anvil[2]],
    segments: 10,
  });
  builder.box(
    "metal",
    palette.darkSteel,
    [0.32, 0.12, 0.16],
    [anvil[0], 0.56, anvil[2]],
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [anvil[0] - 0.1, 0.63, anvil[2]],
    [anvil[0] + 0.25, 0.66, anvil[2] + 0.1],
    0.03,
    4,
  );
  for (let bar = 0; bar < 5; bar++) {
    builder.box(
      "metal",
      bar % 2 === 0 ? "#5d544c" : "#6e625a",
      [0.07, 0.05, 0.5],
      [x + 0.8 + (bar % 3) * 0.09, 0.03 + Math.floor(bar / 3) * 0.05, z + 0.3],
      [0, 0.1, 0],
    );
  }
  /* Charcoal and iron ore, ready to go in. */
  addBasket(builder, [x + 0.6, 0, z - 0.6], 0.24, "#2a2523");
  addBasket(builder, [x - 0.4, 0, z - 0.7], 0.22, "#8b3d26");
  addPerson(builder, [anvil[0] - 0.35, 0, anvil[2] + 0.35], 2.3, {
    skin: sands.skin,
    cloth: shade(earth, 0.9),
    hair: "#3a2a1e",
  });
};

const buildBellows = (builder: AttractionBuilder) => {
  /* A leather bag that puffs air into the furnace. */
  builder.sphere("matte", sands.hide, 0.24, [0, 0.0, 0], [1, 0.45, 1.3], 12);
  builder.box("matte", oakLight, [0.5, 0.04, 0.66], [0, 0.12, 0]);
  builder.cylinder("matte", oak, {
    radius: 0.025,
    length: 0.4,
    at: [0, 0.3, -0.25],
    segments: 6,
  });
};

const buildFurnaceGlow = (builder: AttractionBuilder) => {
  builder.sphere("glow", "#ffb23a", 0.2, [0, 0, 0], [1, 0.8, 1], 10);
  builder.sphere("glow", "#fff0a0", 0.12, [0, 0.05, 0.05], [1, 1, 1], 8);
};

const buildGranary = (builder: AttractionBuilder) => {
  const { x, z } = granaryAt;
  [-0.55, 0.55].forEach((dx) => {
    [-0.55, 0.55].forEach((dz) => {
      builder.cylinder("matte", oak, {
        radius: 0.08,
        length: 0.85,
        at: [x + dx, 0.42, z + dz],
        segments: 7,
      });
      if (!builder.isFar) {
        /* Flat stones on the posts keep the mice out. */
        builder.cylinder("matte", palette.stone, {
          radius: 0.16,
          length: 0.05,
          at: [x + dx, 0.82, z + dz],
          segments: 8,
        });
      }
    });
  });
  builder.box("matte", oakLight, [1.4, 0.1, 1.4], [x, 0.9, z]);
  builder.box("matte", sands.daub, [1.2, 0.9, 1.2], [x, 1.4, z]);
  addGableRoof(builder, {
    width: 1.3,
    depth: 1.3,
    rise: 0.75,
    at: [x, 1.85, z],
    colour: shade(sands.thatch, 1.05),
    thickness: 0.12,
    overhang: 0.2,
    turn: Math.PI / 2,
  });
  if (builder.isFar) {
    return;
  }
  builder.box("matte", oak, [0.42, 0.55, 0.04], [x + 0.2, 1.38, z + 0.62]);
  /* A notched-log ladder up to its door. */
  builder.bar(
    "matte",
    oakLight,
    [x + 0.2, 0, z + 1.35],
    [x + 0.2, 0.95, z + 0.72],
    0.12,
    6,
  );
};

const buildLoom = (builder: AttractionBuilder) => {
  const { x, z } = loomAt;
  [-0.6, 0.6].forEach((dx) => {
    builder.bar(
      "matte",
      oak,
      [x + dx, 0, z - 0.25],
      [x + dx, 1.75, z],
      0.08,
      6,
    );
  });
  builder.cylinder("matte", oakLight, {
    radius: 0.05,
    length: 1.45,
    at: [x, 1.7, z - 0.02],
    axis: "x",
    segments: 6,
  });
  /* Checked cloth, half woven. */
  const rows = builder.isFar ? 1 : 4;
  for (let row = 0; row < rows; row++) {
    const top = 1.66 - row * 0.2;
    builder.box(
      "matte",
      row % 2 === 0 ? tartanRed : tartanGreen,
      [1.1, 0.2, 0.02],
      [x, top - 0.1, z - 0.04 + row * 0.028],
      [-0.14, 0, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  for (let thread = 0; thread < 9; thread++) {
    const tx = x - 0.48 + thread * 0.12;
    builder.bar(
      "matte",
      "#e9dfc6",
      [tx, 0.86, z + 0.06],
      [tx, 0.4, z + 0.12],
      0.012,
      3,
    );
    builder.sphere(
      "matte",
      "#9a8a72",
      0.05,
      [tx, 0.36, z + 0.12],
      [1, 0.8, 1],
      6,
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A muddy track from the gate into the middle. */
  builder.box("matte", "#a68d5f", [1.6, 0.015, 4.8], [0, 0.008, 5.6]);
  builder.cylinder("matte", "#a68d5f", {
    radius: 1.6,
    length: 0.015,
    at: [0.2, 0.008, 2.6],
    segments: 20,
  });
  if (builder.isFar) {
    return;
  }
  /* Storage pits with wicker lids, pots and haystacks. */
  [
    [0.9, -4.6],
    [-4.2, -0.3],
  ].forEach(([x, z]) => {
    builder.cylinder("matte", "#b8894f", {
      radius: 0.45,
      length: 0.06,
      at: [x, 0.03, z],
      segments: 12,
    });
  });
  addPot(builder, [1.3, 0, -3.6], 0.15, sands.deepTerracotta);
  addPot(builder, [1.6, 0, -3.9], 0.12, "#7a5a3c");
  builder.sphere("matte", "#d8b85c", 0.6, [4.2, 0.3, -3.5], [1, 0.95, 1], 10);
  builder.cylinder("matte", "#c9a74c", {
    radius: 0.1,
    length: 0.3,
    at: [4.2, 0.95, -3.5],
    segments: 6,
  });
  addLump(builder, palette.stone, [-0.7, 0.14, 3.6], [0.3, 0.16, 0.25], 2.2);
  addLump(
    builder,
    palette.darkStone,
    [-0.7, 0.32, 3.6],
    [0.26, 0.06, 0.22],
    3.2,
  );
  [
    [-5.8, -5.2],
    [6.1, -4.7],
    [-6.0, 4.4],
    [5.6, 5.0],
    [0.5, -8.9],
  ].forEach(([x, z], index) => {
    const radius = Math.hypot(x, z);
    addGrassTuft(
      builder,
      [x, findBankHeight(radius), z],
      0.9 + (index % 2) * 0.3,
    );
  });
  /* A banner pole on the gatehouse roof. */
  builder.cylinder("matte", oak, {
    radius: 0.04,
    length: 1.3,
    at: [0, 4.85, bridgeZ],
    segments: 6,
  });
};

const buildBanner = (builder: AttractionBuilder) => {
  addSheet(builder, "matte", woad, [
    [0, 0, 0],
    [0.85, -0.05, 0],
    [0.8, -0.5, 0],
    [0, -0.45, 0],
  ]);
  if (!builder.isFar) {
    builder.sphere(
      "paint",
      "#efe4c8",
      0.1,
      [0.42, -0.25, 0.01],
      [1, 1, 0.2],
      8,
    );
  }
};

const buildHillfort = (builder: AttractionBuilder) => {
  buildGrounds(builder);
  buildBank(builder);
  buildPalisade(builder);
  buildGatehouse(builder);
  houses.forEach((house) => {
    addRoundHouse(builder, house);
  });
  buildFurnace(builder);
  buildGranary(builder);
  buildLoom(builder);
  addSignBoard(builder, [1.9, 0, 8.95], signColour);
};

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

const buildSheep = (builder: AttractionBuilder) => {
  const segments = builder.segments(10, 6);
  builder.sphere(
    "matte",
    fleece,
    0.26,
    [0, 0.42, 0],
    [0.85, 0.75, 1.2],
    segments,
  );
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      builder.bar(
        "matte",
        "#3a2a20",
        [side * 0.1, 0.3, end * 0.18],
        [side * 0.1, 0.0, end * 0.19],
        0.05,
        5,
      );
    });
  });
  builder.sphere(
    "matte",
    "#4a3526",
    0.11,
    [0, 0.55, 0.32],
    [0.8, 0.9, 1.25],
    segments,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.torus(
      "matte",
      "#d9c9a6",
      0.06,
      0.02,
      [side * 0.09, 0.62, 0.27],
      "x",
      8,
    );
    builder.sphere(
      "matte",
      palette.black,
      0.012,
      [side * 0.06, 0.58, 0.43],
      [1, 1, 1],
      4,
    );
  });
};

const buildHen = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#a0522d", 0.1, [0, 0.16, 0], [0.8, 0.85, 1.2], 8);
  builder.sphere("matte", "#a0522d", 0.06, [0, 0.27, 0.09], [1, 1, 1], 8);
  builder.add("matte", "#e0a020", new ConeGeometry(0.02, 0.05, 4), {
    at: [0, 0.27, 0.16],
    rotation: [Math.PI / 2, 0, 0],
  });
  builder.box("matte", "#c8102e", [0.015, 0.05, 0.05], [0, 0.33, 0.09]);
  builder.box("matte", "#3a2a20", [0.03, 0.08, 0.02], [0, 0.04, -0.01]);
  builder.box(
    "matte",
    "#7a3a1d",
    [0.12, 0.1, 0.03],
    [0, 0.22, -0.11],
    [0.5, 0, 0],
  );
};

/* ------------------------------------------------------------------ */
/* The walk along the rampart                                          */
/* ------------------------------------------------------------------ */

const walkStart = { x: 1.6, z: 4.3 };
const walkFinish = { x: -1.6, z: 4.3 };
const walkFrom = 0.3;
const walkTo = Math.PI * 2 - 0.3;
const climbShare = 0.08;

const findWalkPoint = (angle: number): Triple => [
  Math.sin(angle) * walkRadius,
  findBankHeight(walkRadius),
  Math.cos(angle) * walkRadius,
];

const followWalk = (progress: number): LocalSpot => {
  if (progress < climbShare) {
    const share = progress / climbShare;
    const [x, y, z] = findWalkPoint(walkFrom);
    return {
      x: walkStart.x + (x - walkStart.x) * share,
      y: y * share,
      z: walkStart.z + (z - walkStart.z) * share,
      heading: Math.atan2(x - walkStart.x, z - walkStart.z),
    };
  }
  if (progress > 1 - climbShare) {
    const share = (1 - progress) / climbShare;
    const [x, y, z] = findWalkPoint(walkTo);
    return {
      x: walkFinish.x + (x - walkFinish.x) * share,
      y: y * share,
      z: walkFinish.z + (z - walkFinish.z) * share,
      heading: Math.atan2(walkFinish.x - x, walkFinish.z - z),
    };
  }
  const share = (progress - climbShare) / (1 - climbShare * 2);
  const angle = walkFrom + (walkTo - walkFrom) * share;
  const [x, y, z] = findWalkPoint(angle);
  return {
    x,
    y: y + 0.04 * Math.abs(Math.sin(progress * Math.PI * 40)),
    z,
    heading: Math.atan2(Math.cos(angle), -Math.sin(angle)),
  };
};

const bankDeck: Deck = ({ x, z }) => {
  const radius = Math.hypot(x, z);
  if (radius <= bankInner + 0.05 || radius >= bankOuter || isInGateway(x, z)) {
    return undefined;
  }
  return { height: findBankHeight(radius), kind: "trail" };
};

const blockers: LocalBlocker[] = [
  { x: furnaceAt.x, z: furnaceAt.z, radius: 0.6 },
  { x: granaryAt.x, z: granaryAt.z, radius: 0.85 },
];

export const ironAgeHillfortModel: NewLandAttractionModel = {
  kind: "iron-age-hillfort",
  islandId: "sunscorch-sands",
  name: "Iron Age Hillfort",
  fact: "In the Iron Age, from about 2,800 years ago, many Britons lived in hillforts: villages on hilltops, ringed by high earth banks and wooden fences to keep out raiders. Smiths melted iron from rocks in clay furnaces to make strong tools and swords. Maiden Castle in Dorset is one of the biggest hillforts in Europe.",
  curriculumLink:
    "History, Key Stage 2: changes in Britain from the Stone Age to the Iron Age. Iron Age hillforts: tribal kingdoms, farming, art and culture.",
  footprint: 10,
  setting: "inland",
  padColour: hilltop,
  signSpot: { x: 1.9, z: 9.8 },
  build: buildHillfort,
  moving: [
    {
      name: "carnyx",
      pivot: carnyxAt,
      build: buildCarnyx,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.22,
        period: 1.4,
      },
    },
    {
      name: "bellows",
      pivot: [furnaceAt.x - 0.75, 0.15, furnaceAt.z - 0.1],
      build: buildBellows,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 4,
        amplitude: 0.25,
        period: 0.9,
      },
    },
    {
      name: "furnace glow",
      pivot: [furnaceAt.x, 1.4, furnaceAt.z],
      build: buildFurnaceGlow,
      motion: { kind: "wake", reach: 4 },
    },
    {
      name: "banner",
      pivot: [0, 5.45, bridgeZ],
      build: buildBanner,
      motion: { kind: "swing", axis: "y", amplitude: 0.5, period: 3.2 },
    },
  ],
  wanderers: [
    {
      name: "sheep",
      build: buildSheep,
      count: 3,
      centre: { x: 0.7, z: 2.3 },
      radius: 0.9,
      speed: 0.2,
    },
    {
      name: "hens",
      build: buildHen,
      count: 3,
      centre: { x: -2.4, z: 3.9 },
      radius: 0.7,
      speed: 0.35,
    },
  ],
  smoke: [
    {
      at: [furnaceAt.x, 1.45, furnaceAt.z],
      colour: "#bdb6ad",
      puffs: 7,
      size: 0.25,
      rise: 2.8,
      spread: 0.5,
    },
    {
      at: [houses[0].x, houses[0].peak + 0.2, houses[0].z],
      colour: "#cfc8bd",
      puffs: 5,
      size: 0.22,
      rise: 2,
      spread: 0.4,
    },
  ],
  blockers,
  decks: [bankDeck],
  rides: [
    {
      id: "rampart-walk",
      name: "the walk along the rampart",
      start: walkStart,
      reach: 0.6,
      seconds: 26,
      finish: walkFinish,
      follow: followWalk,
    },
  ],
  tune: [48, 55, 60, 55, 48],
  play: {
    label: "Blow the carnyx",
    news: "BRAAARP! The tall bronze carnyx, with a boar's head on top, boomed across the hills, and everyone in the hillfort came running to the gate.",
    tune: [48, 55, 60, 64, 60],
  },
};
