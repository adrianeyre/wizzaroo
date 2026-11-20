import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addBasket,
  addGrassTuft,
  addLump,
  addPerson,
  addPot,
  addRoundHouse,
  addSheet,
  addTaperedBar,
  placeBy,
  sands,
  type RoundHouse,
} from "./date-palm-grove-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const ground = "#d4bc86";
const trodden = "#c2a46e";
const sarsen = "#b7ad98";
const bluestone = "#8d95a0";
const flint = "#4a4744";
const goatCoat = "#e9e1cf";
const goatBrown = "#7a5a3c";
const signColour = "#7a5a3c";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const circleAt = { x: 0, z: -4.3 };
const circleRadius = 2.5;
const stoneCount = 8;
const walkRadius = 3.6;
const fireAt = { x: 0, z: 2.0 };
const quernAt = { x: -2.3, z: 3.1 };
const rackAt = { x: 1.6, z: 4.1 };
const penAt = { x: -6.3, z: -3.7 };
const penRadius = 1.6;
const hareAt = { x: 6.1, z: -3.4 };
const signAt = { x: 2.3, z: 8.2 };

const houses: readonly RoundHouse[] = [
  {
    x: -5.3,
    z: 0.9,
    radius: 1.5,
    wallHeight: 1.45,
    peak: 3.4,
    door: Math.atan2(5.3, 0.9),
    wall: sands.paleStone,
    roof: sands.thatch,
    isStone: true,
  },
  {
    x: 5.1,
    z: 0.7,
    radius: 1.5,
    wallHeight: 1.45,
    peak: 3.5,
    door: Math.atan2(-5.1, 1.0),
    wall: shade(sands.paleStone, 0.94),
    roof: shade(sands.thatch, 0.92),
    isStone: true,
  },
  {
    x: -3.4,
    z: 6.0,
    radius: 1.25,
    wallHeight: 1.4,
    peak: 3.1,
    door: Math.atan2(3.4, -2.2),
    wall: sands.daub,
    roof: shade(sands.thatch, 1.05),
  },
];

const findStoneAngle = (stone: number): number =>
  ((stone + 0.5) / stoneCount) * Math.PI * 2;

const findWalkPoint = (angle: number): LocalSpot => ({
  x: circleAt.x + Math.sin(angle) * walkRadius,
  y: 0,
  z: circleAt.z + Math.cos(angle) * walkRadius,
  heading: Math.atan2(Math.cos(angle), -Math.sin(angle)),
});

/* ------------------------------------------------------------------ */
/* The stone circle                                                    */
/* ------------------------------------------------------------------ */

const buildStoneCircle = (builder: AttractionBuilder) => {
  const { x, z } = circleAt;
  /* A ring of trodden earth and a low bank round it. */
  builder.cylinder("matte", trodden, {
    radius: walkRadius + 0.5,
    length: 0.02,
    at: [x, 0.01, z],
    segments: 40,
  });
  builder.cylinder("matte", ground, {
    radius: walkRadius - 0.45,
    length: 0.03,
    at: [x, 0.015, z],
    segments: 40,
  });
  for (let stone = 0; stone < stoneCount; stone++) {
    const angle = findStoneAngle(stone);
    const isBlue = stone % 2 === 1;
    const height = isBlue ? 1.35 : 1.75 + 0.15 * Math.sin(stone * 2.3);
    const at: Triple = [
      x + Math.sin(angle) * circleRadius,
      height / 2,
      z + Math.cos(angle) * circleRadius,
    ];
    addLump(
      builder,
      isBlue ? bluestone : stone % 4 === 0 ? sarsen : shade(sarsen, 0.92),
      at,
      [isBlue ? 0.24 : 0.34, height / 2, isBlue ? 0.18 : 0.2],
      stone * 1.9,
      1,
    );
  }
  /* A great trilithon at the back, a lintel across two uprights. */
  const backAngle = Math.PI;
  const backX = x + Math.sin(backAngle) * (circleRadius - 1.05);
  const backZ = z + Math.cos(backAngle) * (circleRadius - 1.05);
  [-0.55, 0.55].forEach((side, index) => {
    addLump(
      builder,
      index === 0 ? sarsen : shade(sarsen, 0.95),
      [backX + side, 1.12, backZ],
      [0.27, 1.18, 0.22],
      side * 5,
      1,
    );
  });
  builder.box(
    "matte",
    shade(sarsen, 1.05),
    [1.75, 0.4, 0.46],
    [backX, 2.42, backZ],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      shade(sarsen, 0.92),
      [1.6, 0.06, 0.4],
      [backX, 2.2, backZ],
    );
  }
  /* The flat altar stone in the middle. */
  addLump(builder, shade(sarsen, 0.85), [x, 0.12, z], [0.75, 0.16, 0.42], 7.1);
  if (builder.isFar) {
    return;
  }
  /* Tenon knobs on the trilithon's uprights, and lichen spots. */
  [-0.55, 0.55].forEach((side) => {
    builder.sphere(
      "matte",
      "#9aa34a",
      0.09,
      [backX + side + 0.1, 1.6, backZ + 0.21],
      [1, 0.6, 0.3],
      6,
    );
  });
  for (let stone = 0; stone < stoneCount; stone += 2) {
    const angle = findStoneAngle(stone);
    builder.sphere(
      "matte",
      "#c3bf6a",
      0.08,
      [
        x + Math.sin(angle) * (circleRadius + 0.2),
        0.9,
        z + Math.cos(angle) * (circleRadius + 0.2),
      ],
      [1, 0.7, 0.4],
      6,
    );
  }
  /* Offerings on the altar: a pot, an antler and a posy. */
  addPot(builder, [x - 0.3, 0.26, z + 0.05], 0.09, sands.deepTerracotta);
  addTaperedBar(
    builder,
    "matte",
    "#e8dcc0",
    [x + 0.1, 0.28, z],
    [x + 0.45, 0.4, z - 0.1],
    0.03,
    0.015,
    5,
  );
  addTaperedBar(
    builder,
    "matte",
    "#e8dcc0",
    [x + 0.3, 0.33, z - 0.04],
    [x + 0.38, 0.5, z + 0.08],
    0.02,
    0.01,
    4,
  );
  ["#d8c34a", "#c9506a", "#efe9dc"].forEach((petal, index) => {
    builder.sphere(
      "matte",
      petal,
      0.05,
      [x - 0.05 + index * 0.08, 0.29, z + 0.18],
      [1, 0.6, 1],
      6,
    );
  });
  /* The heel stone, out on the line of the midsummer sunrise. */
  addLump(
    builder,
    shade(sarsen, 0.9),
    [x + 3.0, 0.8, z + 3.3],
    [0.4, 0.8, 0.3],
    3.3,
    1,
  );
};

/* ------------------------------------------------------------------ */
/* Houses, fire and work                                               */
/* ------------------------------------------------------------------ */

const buildHearth = (builder: AttractionBuilder) => {
  const { x, z } = fireAt;
  builder.cylinder("matte", "#3b302a", {
    radius: 0.55,
    length: 0.03,
    at: [x, 0.02, z],
    segments: 16,
  });
  const ring = builder.isFar ? 6 : 11;
  for (let stone = 0; stone < ring; stone++) {
    const angle = (stone / ring) * Math.PI * 2;
    addLump(
      builder,
      stone % 2 === 0 ? palette.stone : palette.darkStone,
      [x + Math.sin(angle) * 0.62, 0.07, z + Math.cos(angle) * 0.62],
      [0.13, 0.09, 0.11],
      stone,
      0,
    );
  }
  /* Logs criss-crossed in the flames. */
  [0.4, 1.4, 2.5].forEach((turn) => {
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.06,
      length: 0.75,
      at: [x, 0.08, z],
      axis: "x",
      segments: 6,
    });
    if (!builder.isFar) {
      builder.box(
        "matte",
        "#2c2522",
        [0.7, 0.08, 0.09],
        [x, 0.1, z],
        [0, turn, 0.15],
      );
    }
  });
  /* Log seats round the fire. */
  [0.6, 2.3, 4.0, 5.3].forEach((angle, index) => {
    builder.cylinder("matte", index % 2 === 0 ? palette.timber : "#7a4f30", {
      radius: 0.15,
      length: 1.0,
      at: [x + Math.sin(angle) * 1.35, 0.15, z + Math.cos(angle) * 1.35],
      axis: "x",
      segments: 8,
    });
  });
  if (builder.isFar) {
    return;
  }
  /* A tripod with a cooking pot hanging over the fire. */
  const top: Triple = [x, 1.25, z];
  [0, 2.1, 4.2].forEach((angle) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + Math.sin(angle) * 0.62, 0, z + Math.cos(angle) * 0.62],
      top,
      0.045,
      5,
    );
  });
  builder.bar("matte", "#a28a62", top, [x, 0.65, z], 0.015, 3);
  builder.lathe(
    "matte",
    sands.deepTerracotta,
    [
      [0, 0],
      [0.14, 0.02],
      [0.2, 0.14],
      [0.17, 0.26],
      [0.19, 0.28],
      [0, 0.26],
    ],
    [x, 0.38, z],
    "y",
    12,
  );
  /* A haunch of meat on a spit stick at the side. */
  builder.bar(
    "matte",
    palette.paleTimber,
    [x + 0.9, 0.2, z - 0.7],
    [x + 0.4, 0.55, z - 0.3],
    0.03,
    4,
  );
  builder.sphere(
    "matte",
    "#9b4a32",
    0.1,
    [x + 0.5, 0.48, z - 0.38],
    [1, 0.8, 1.3],
    8,
  );
};

const buildQuernBase = (builder: AttractionBuilder) => {
  const { x, z } = quernAt;
  builder.cylinder("matte", palette.darkStone, {
    radius: 0.4,
    radiusEnd: 0.34,
    length: 0.28,
    at: [x, 0.14, z],
    segments: 14,
  });
  if (builder.isFar) {
    return;
  }
  builder.box("matte", "#c9a85e", [1.1, 0.02, 0.8], [x, 0.01, z + 0.3]);
  addBasket(builder, [x + 0.65, 0, z + 0.3], 0.22, "#d9b54a");
  addBasket(builder, [x - 0.6, 0, z + 0.45], 0.2, "#efe6cf");
  addPerson(builder, [x, 0, z + 0.75], Math.PI, {
    skin: sands.skin,
    cloth: sands.hide,
    hair: "#5a3a22",
    isSitting: true,
  });
};

const buildQuernStone = (builder: AttractionBuilder) => {
  builder.cylinder("matte", palette.stone, {
    radius: 0.33,
    radiusEnd: 0.28,
    length: 0.14,
    at: [0, 0.07, 0],
    segments: 14,
  });
  builder.cylinder("matte", "#3b3530", {
    radius: 0.06,
    length: 0.15,
    at: [0, 0.08, 0],
    segments: 8,
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.035,
    length: 0.3,
    at: [0.24, 0.27, 0],
    segments: 6,
  });
};

const buildRack = (builder: AttractionBuilder) => {
  const { x, z } = rackAt;
  [-0.8, 0.8].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + side - 0.25, 0, z],
      [x + side, 1.65, z],
      0.07,
      5,
    );
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + side + 0.25, 0, z],
      [x + side, 1.65, z],
      0.07,
      5,
    );
  });
  builder.bar(
    "matte",
    palette.timber,
    [x - 0.95, 1.6, z],
    [x + 0.95, 1.6, z],
    0.06,
    6,
  );
  /* Hides stretched to dry, and fish strung up. */
  addSheet(builder, "matte", sands.hide, [
    [x - 0.65, 1.58, z],
    [x - 0.05, 1.58, z],
    [x - 0.1, 0.75, z + 0.05],
    [x - 0.6, 0.8, z + 0.05],
  ]);
  addSheet(builder, "matte", shade(sands.hide, 0.8), [
    [x + 0.05, 1.58, z],
    [x + 0.7, 1.58, z],
    [x + 0.6, 0.95, z - 0.04],
    [x + 0.12, 0.9, z - 0.04],
  ]);
  if (builder.isFar) {
    return;
  }
  [-0.5, -0.3, 0.3, 0.5].forEach((offset, index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#9aa0a6" : "#b9a77c",
      0.07,
      [x + offset, 1.35, z + 0.12],
      [0.5, 1.9, 0.35],
      6,
    );
  });
};

const buildPen = (builder: AttractionBuilder) => {
  const { x, z } = penAt;
  const panels = builder.isFar ? 5 : 9;
  for (let panel = 0; panel < panels; panel++) {
    /* The pen opens towards the stones, on its +x side. */
    const angle = Math.PI * 0.72 + (panel / (panels - 1)) * Math.PI * 1.56;
    const px = x + Math.sin(angle) * penRadius;
    const pz = z + Math.cos(angle) * penRadius;
    builder.box(
      "matte",
      panel % 2 === 0 ? sands.wattle : shade(sands.wattle, 1.1),
      [1.05, 0.7, 0.08],
      [px, 0.4, pz],
      [0, angle + Math.PI / 2, 0],
    );
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.04,
      length: 0.85,
      at: [px, 0.42, pz],
      segments: 5,
    });
    if (!builder.isFar) {
      [0.2, 0.4, 0.6].forEach((up) => {
        builder.box(
          "matte",
          shade(sands.wattle, 0.82),
          [1.06, 0.04, 0.1],
          [px, up, pz],
          [0, angle + Math.PI / 2, 0],
        );
      });
    }
  }
  if (!builder.isFar) {
    builder.box("matte", "#c8b45a", [0.7, 0.18, 0.5], [x - 0.7, 0.09, z]);
    builder.lathe(
      "matte",
      palette.darkTimber,
      [
        [0, 0],
        [0.35, 0],
        [0.38, 0.2],
        [0.32, 0.2],
        [0.3, 0.05],
        [0, 0.05],
      ],
      [x - 0.1, 0, z - 0.8],
      "y",
      10,
    );
    builder.cylinder("water", palette.water, {
      radius: 0.3,
      length: 0.02,
      at: [x - 0.1, 0.16, z - 0.8],
      segments: 10,
    });
  }
};

const buildWorkshop = (builder: AttractionBuilder) => {
  /* A flint-knapping spot: a pile of flint nodules and sharp flakes. */
  const knapAt = { x: 3.0, z: 2.9 };
  addLump(
    builder,
    palette.darkStone,
    [knapAt.x, 0.18, knapAt.z],
    [0.35, 0.22, 0.3],
    4.4,
  );
  if (builder.isFar) {
    return;
  }
  for (let nodule = 0; nodule < 6; nodule++) {
    addLump(
      builder,
      nodule % 2 === 0 ? flint : "#d8d2c2",
      [
        knapAt.x + 0.5 + (nodule % 3) * 0.13,
        0.05,
        knapAt.z - 0.2 + Math.floor(nodule / 3) * 0.15,
      ],
      [0.08, 0.05, 0.07],
      nodule * 2.1,
      0,
    );
  }
  addPerson(builder, [knapAt.x - 0.15, 0, knapAt.z + 0.55], Math.PI + 0.3, {
    skin: sands.skinDark,
    cloth: shade(sands.hide, 1.15),
    hair: sands.hair,
    isSitting: true,
  });
  /* Antler picks and a polished stone axe leaning on the stone. */
  builder.bar(
    "matte",
    "#e8dcc0",
    [knapAt.x - 0.3, 0.05, knapAt.z - 0.4],
    [knapAt.x - 0.1, 0.5, knapAt.z - 0.25],
    0.04,
    5,
  );
  builder.bar(
    "matte",
    palette.paleTimber,
    [knapAt.x + 0.3, 0.02, knapAt.z - 0.45],
    [knapAt.x + 0.15, 0.55, knapAt.z - 0.25],
    0.04,
    5,
  );
  builder.box(
    "paint",
    "#5e6b5a",
    [0.1, 0.16, 0.05],
    [knapAt.x + 0.15, 0.6, knapAt.z - 0.25],
    [0.2, 0, 0.3],
  );
  /* Pots, a grain store and wood stacked for the fire. */
  const pots: readonly [number, number, number][] = [
    [-4.0, 2.9, 0.16],
    [-3.6, 3.15, 0.12],
    [3.9, -0.95, 0.15],
    [-1.3, 6.9, 0.14],
  ];
  pots.forEach(([x, z, size], index) => {
    addPot(
      builder,
      [x, 0, z],
      size,
      index % 2 === 0 ? sands.terracotta : "#9b6a44",
    );
  });
  for (let log = 0; log < 6; log++) {
    builder.cylinder("matte", log % 2 === 0 ? palette.timber : "#6e4a2c", {
      radius: 0.1,
      length: 1.1,
      at: [-1.2 + (log % 3) * 0.21, 0.1 + Math.floor(log / 3) * 0.18, 6.1],
      axis: "x",
      segments: 7,
    });
  }
  /* A clay-lined pit oven and a dug-out canoe waiting for the river. */
  builder.cylinder("matte", "#8e6a48", {
    radius: 0.42,
    radiusEnd: 0.5,
    length: 0.18,
    at: [-0.6, 0.09, 4.1],
    segments: 12,
  });
  builder.cylinder("matte", "#3b302a", {
    radius: 0.3,
    length: 0.02,
    at: [-0.6, 0.185, 4.1],
    segments: 12,
  });
  builder.sphere(
    "matte",
    palette.timber,
    0.32,
    [6.4, 0.18, 3.6],
    [0.9, 0.5, 3.2],
    12,
  );
  builder.sphere(
    "matte",
    palette.darkTimber,
    0.27,
    [6.4, 0.24, 3.6],
    [0.8, 0.4, 2.9],
    12,
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* Paths of trodden earth between the houses. */
  [
    [0, 0.6, 1.2, 6.0, 0],
    [-2.6, 1.6, 1.0, 4.6, 1.35],
    [2.6, 1.3, 1.0, 4.6, -1.4],
    [1.2, 5.6, 1.1, 5.0, 0.35],
  ].forEach(([x, z, width, length, turn]) => {
    builder.box(
      "matte",
      trodden,
      [width, 0.015, length],
      [x, 0.008, z],
      [0, turn, 0],
    );
  });
  const tufts: readonly [number, number][] = [
    [-7.3, 3.4],
    [7.6, -1.6],
    [4.6, -6.4],
    [6.2, 5.6],
    [0.6, 7.6],
  ];
  tufts.forEach(([x, z], index) => {
    addGrassTuft(builder, [x, 0, z], 0.9 + (index % 3) * 0.2);
  });
  /* The hare's burrow. */
  builder.sphere(
    "matte",
    shade(ground, 0.85),
    0.42,
    [hareAt.x, 0, hareAt.z],
    [1.2, 0.4, 1],
    10,
  );
  builder.cylinder("matte", "#2c2420", {
    radius: 0.16,
    length: 0.02,
    at: [hareAt.x, 0.16, hareAt.z],
    segments: 10,
  });
};

const buildVillage = (builder: AttractionBuilder) => {
  buildGrounds(builder);
  buildStoneCircle(builder);
  houses.forEach((house) => {
    addRoundHouse(builder, house);
  });
  buildHearth(builder);
  buildQuernBase(builder);
  buildRack(builder);
  buildPen(builder);
  buildWorkshop(builder);
  addSignBoard(builder, [signAt.x, 0, signAt.z - 0.9], signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts and wanderers                                          */
/* ------------------------------------------------------------------ */

const buildFlame = (builder: AttractionBuilder) => {
  builder.lathe(
    "glow",
    "#ff9a2e",
    [
      [0, 0],
      [0.26, 0.08],
      [0.2, 0.3],
      [0.08, 0.55],
      [0, 0.68],
    ],
    [0, 0, 0],
    "y",
    10,
  );
  builder.lathe(
    "glow",
    "#ffe27a",
    [
      [0, 0.02],
      [0.14, 0.1],
      [0.1, 0.28],
      [0, 0.42],
    ],
    [0.03, 0, 0.02],
    "y",
    8,
  );
};

const buildHare = (builder: AttractionBuilder) => {
  const coat = "#9a7652";
  builder.sphere("matte", coat, 0.14, [0, 0.12, 0], [0.9, 1.1, 1.2], 10);
  builder.sphere("matte", coat, 0.09, [0, 0.29, 0.1], [1, 1, 1.1], 10);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      shade(coat, 0.9),
      0.035,
      [side * 0.035, 0.45, 0.06],
      [1, 3.6, 0.6],
      6,
    );
    builder.sphere(
      "matte",
      palette.black,
      0.014,
      [side * 0.055, 0.31, 0.17],
      [1, 1, 1],
      4,
    );
  });
  builder.sphere("matte", "#3b2a20", 0.015, [0, 0.27, 0.19], [1, 1, 1], 4);
};

const buildGoat = (builder: AttractionBuilder) => {
  const segments = builder.segments(10, 6);
  builder.sphere(
    "matte",
    goatCoat,
    0.24,
    [0, 0.5, 0],
    [0.75, 0.75, 1.3],
    segments,
  );
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      addTaperedBar(
        builder,
        "matte",
        goatBrown,
        [side * 0.1, 0.42, end * 0.2],
        [side * 0.1, 0.02, end * 0.21],
        0.045,
        0.03,
        5,
      );
    });
  });
  addTaperedBar(
    builder,
    "matte",
    goatCoat,
    [0, 0.58, 0.26],
    [0, 0.78, 0.38],
    0.09,
    0.07,
    6,
  );
  builder.sphere(
    "matte",
    goatCoat,
    0.1,
    [0, 0.8, 0.45],
    [0.8, 0.85, 1.3],
    segments,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#6b5d4a",
      [side * 0.04, 0.88, 0.4],
      [side * 0.09, 1.0, 0.28],
      0.025,
      4,
    );
    builder.box(
      "matte",
      goatBrown,
      [0.1, 0.03, 0.05],
      [side * 0.1, 0.84, 0.42],
      [0, 0, side * -0.5],
    );
    builder.sphere(
      "matte",
      palette.black,
      0.012,
      [side * 0.06, 0.84, 0.53],
      [1, 1, 1],
      4,
    );
  });
  builder.sphere("matte", goatCoat, 0.03, [0, 0.67, 0.53], [1, 2, 1], 5);
  builder.sphere("matte", goatCoat, 0.04, [0, 0.62, -0.32], [1, 1.4, 1], 5);
};

const buildVillager = (builder: AttractionBuilder) => {
  addPerson(builder, [0, 0, 0], 0, {
    skin: sands.skinLight,
    cloth: "#8e7350",
    hair: "#6b3f22",
  });
  if (!builder.isFar) {
    /* A bundle of firewood carried under one arm. */
    const place = placeBy([0, 0, 0], 0);
    builder.cylinder("matte", palette.timber, {
      radius: 0.06,
      length: 0.5,
      at: place(0.22, 0.62, 0.05),
      axis: "z",
      segments: 6,
    });
    builder.cylinder("matte", "#6e4a2c", {
      radius: 0.05,
      length: 0.45,
      at: place(0.24, 0.7, 0.03),
      axis: "z",
      segments: 6,
    });
  }
};

/* ------------------------------------------------------------------ */
/* The walk round the stones                                           */
/* ------------------------------------------------------------------ */

const walkStart = { x: circleAt.x, z: circleAt.z + walkRadius };
const walkEndAngle = Math.PI * 2.5;
const walkFinish = {
  x: circleAt.x + Math.sin(walkEndAngle) * walkRadius,
  z: circleAt.z + Math.cos(walkEndAngle) * walkRadius,
};

const followWalk = (progress: number): LocalSpot => {
  const share = progress * progress * (3 - 2 * progress);
  const spot = findWalkPoint(share * walkEndAngle);
  return { ...spot, y: 0.04 * Math.abs(Math.sin(progress * Math.PI * 22)) };
};

const blockers: LocalBlocker[] = [
  { x: fireAt.x, z: fireAt.z, radius: 0.7 },
  { x: quernAt.x, z: quernAt.z, radius: 0.45 },
  { x: circleAt.x, z: circleAt.z, radius: 0.5 },
];

export const stoneAgeVillageModel: NewLandAttractionModel = {
  kind: "stone-age-village",
  islandId: "sunscorch-sands",
  name: "Stone Age Village",
  fact: "About 6,000 years ago, in the New Stone Age, people in Britain began to farm. Instead of always moving on to hunt, they kept goats and sheep, grew wheat, and built villages of round stone houses like Skara Brae in Orkney. They made tools from sharp flint and raised great stone circles, such as Stonehenge.",
  curriculumLink:
    "History, Key Stage 2: changes in Britain from the Stone Age to the Iron Age. Late Neolithic hunter-gatherers and early farmers, such as at Skara Brae, and Stonehenge.",
  footprint: 9,
  setting: "inland",
  padColour: ground,
  signSpot: signAt,
  build: buildVillage,
  moving: [
    {
      name: "quern stone",
      pivot: [quernAt.x, 0.28, quernAt.z],
      build: buildQuernStone,
      motion: { kind: "whirl", axis: "y", idle: 0.4, speed: 4, reach: 3.5 },
    },
    {
      name: "campfire",
      pivot: [fireAt.x, 0.06, fireAt.z],
      build: buildFlame,
      motion: { kind: "flicker", period: 0.8 },
    },
    {
      name: "hare",
      pivot: [hareAt.x, -0.3, hareAt.z],
      build: buildHare,
      motion: { kind: "rise", reach: 3.5, height: 0.42, period: 1.6 },
    },
  ],
  wanderers: [
    {
      name: "goats",
      build: buildGoat,
      count: 3,
      centre: penAt,
      radius: 0.85,
      speed: 0.2,
    },
    {
      name: "villagers",
      build: buildVillager,
      count: 2,
      centre: { x: 0.3, z: -0.1 },
      radius: 1.1,
      speed: 0.3,
    },
  ],
  smoke: [
    {
      at: [fireAt.x, 0.7, fireAt.z],
      colour: "#d9d4cc",
      puffs: 7,
      size: 0.28,
      rise: 2.6,
      spread: 0.6,
    },
    {
      at: [houses[0].x, houses[0].peak + 0.2, houses[0].z],
      colour: "#cfc8bd",
      puffs: 5,
      size: 0.22,
      rise: 1.8,
      spread: 0.4,
    },
  ],
  blockers,
  rides: [
    {
      id: "stone-circle-walk",
      name: "the walk round the stone circle",
      start: walkStart,
      reach: 0.6,
      seconds: 16,
      finish: walkFinish,
      follow: followWalk,
    },
  ],
  tune: [69, 72, 74, 76, 74, 72, 69, 67],
  play: {
    label: "Light the campfire",
    news: "Strike, strike, spark! You struck a flint on a lump of iron pyrite, the sparks caught the dry grass, and the whole village came to warm up round the fire.",
    tune: [69, 72, 76, 74, 72],
  },
};
