import { BoxGeometry, DodecahedronGeometry } from "three";
import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const goatHair = "#2e2724";
const goatHairStripe = "#6a5a48";
const wallWeave = "#3a302a";
const poleTimber = "#7a5432";
const rugRed = "#a8283a";
const rugDeep = "#5a1a2a";
const rugGold = "#e0a93a";
const rugIndigo = "#2a3a7a";
const cushionColours = ["#c23b3b", "#e0902e", "#2e6fae", "#7a3ba8", "#2e9e74"];
const brass = "#d4a542";
const goatWhite = "#efe8dc";
const goatBrown = "#7a4a2a";
const flameOrange = "#ff9a3a";
const signColour = "#a8283a";

const tent = { minX: -2.3, maxX: 2.3, minZ: -2.3, maxZ: 0.5 };
const tentMiddleZ = (tent.minZ + tent.maxZ) / 2;
const poleXs = [-2.2, -0.73, 0.73, 2.2];
const bay = poleXs[1] - poleXs[0];
const frontHeight = 1.6;
const ridgeHeight = 1.9;
const backHeight = 1.2;
const sag = 0.16;
const flapPivot: Triple = [
  (poleXs[2] + poleXs[3]) / 2,
  frontHeight - sag,
  tent.maxZ + 0.03,
];
const firePivot: Triple = [0.9, 0.18, 2.05];
const goatAt: Triple = [-2.9, 0, 1.5];
const goatNeck: Triple = [goatAt[0] + 0.32, 0.62, goatAt[2]];
const trayAt: Triple = [-0.6, 0, -0.9];

/** How high the roof is over a local point: peaked at the poles, sagging between. */
const findRoofHeight = (x: number, z: number): number => {
  const across = Math.max(
    -1,
    Math.min(1, (z - tentMiddleZ) / ((tent.maxZ - tent.minZ) / 2)),
  );
  const base =
    across >= 0
      ? ridgeHeight + (frontHeight - ridgeHeight) * across
      : ridgeHeight + (ridgeHeight - backHeight) * across;
  const along = (x - poleXs[0]) / bay;
  const dip = Math.sin(along * Math.PI) ** 2;
  return base - sag * dip * (0.55 + 0.45 * Math.abs(across));
};

/** A thin sheet of cloth draped over the roof shape, between two z lines. */
const addRoofSheet = (
  builder: AttractionBuilder,
  colour: string,
  fromZ: number,
  toZ: number,
  lift: number,
  rows: number,
) => {
  const width = tent.maxX - tent.minX + 0.2;
  const depth = toZ - fromZ;
  const geometry = new BoxGeometry(
    width,
    0.04,
    depth,
    builder.isFar ? 6 : 30,
    1,
    builder.isFar ? 2 : rows,
  );
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const z = position.getZ(index) + (fromZ + toZ) / 2;
    position.setY(index, position.getY(index) + findRoofHeight(x, z) + lift);
  }
  geometry.computeVertexNormals();
  builder.add("matte", colour, geometry, { at: [0, 0, (fromZ + toZ) / 2] });
};

/* The tent: a goat-hair roof on poles, walls at the back and sides */

const buildTent = (builder: AttractionBuilder) => {
  addRoofSheet(builder, goatHair, tent.minZ - 0.1, tent.maxZ + 0.1, 0, 10);
  /* Lighter woven strips running the length of the roof */
  if (!builder.isFar) {
    [-1.95, -1.35, -0.6, 0.05].forEach((z) => {
      addRoofSheet(builder, goatHairStripe, z, z + 0.09, 0.025, 1);
    });
  }
  /* The back wall and the side walls hang to the ground */
  builder.box(
    "matte",
    wallWeave,
    [tent.maxX - tent.minX, backHeight - 0.05, 0.04],
    [0, (backHeight - 0.05) / 2, tent.minZ],
  );
  [-1, 1].forEach((side) => {
    const x = side * tent.maxX;
    builder.box(
      "matte",
      wallWeave,
      [0.04, backHeight - 0.05, (tent.maxZ - tent.minZ) * 0.55],
      [x, (backHeight - 0.05) / 2, tent.minZ + (tent.maxZ - tent.minZ) * 0.275],
    );
  });
  /* Poles: a front row, a taller middle row and a back row */
  poleXs.forEach((x) => {
    [
      { z: tent.maxZ, height: frontHeight },
      { z: tentMiddleZ, height: ridgeHeight },
      { z: tent.minZ + 0.05, height: backHeight },
    ].forEach(({ z, height }, row) => {
      if (builder.isFar && row === 2) {
        return;
      }
      builder.cylinder("matte", poleTimber, {
        radius: 0.045,
        length: height,
        at: [x, height / 2, z],
        segments: builder.isFar ? 4 : 8,
      });
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Guy ropes from the roof's edges out to pegs in the sand */
  poleXs.forEach((x) => {
    const peg: Triple = [x * 1.08, 0.05, tent.minZ - 0.95];
    builder.bar(
      "matte",
      "#c9b48a",
      [x, backHeight + 0.02, tent.minZ - 0.05],
      peg,
      0.015,
      3,
    );
    builder.box("matte", palette.darkTimber, [0.04, 0.14, 0.04], peg);
  });
  [-1, 1].forEach((side) => {
    [tent.maxZ, tentMiddleZ].forEach((z, index) => {
      const peg: Triple = [side * (tent.maxX + 0.85), 0.05, z + 0.2];
      builder.bar(
        "matte",
        "#c9b48a",
        [side * poleXs[3], (index === 0 ? frontHeight : ridgeHeight) + 0.02, z],
        peg,
        0.015,
        3,
      );
      builder.box("matte", palette.darkTimber, [0.04, 0.14, 0.04], peg);
    });
  });
  /* A woven dividing curtain with a coloured band, and the hanging lantern */
  builder.box(
    "matte",
    shade(wallWeave, 1.2),
    [0.03, 1.2, 1.3],
    [poleXs[1], 0.62, tent.minZ + 0.7],
  );
  builder.box(
    "matte",
    rugRed,
    [0.035, 0.14, 1.3],
    [poleXs[1], 0.8, tent.minZ + 0.7],
  );
  const lantern: Triple = [poleXs[2] - 0.12, 1.45, tentMiddleZ];
  builder.bar(
    "metal",
    palette.darkSteel,
    [poleXs[2], 1.62, tentMiddleZ],
    [lantern[0], lantern[1] + 0.2, lantern[2]],
    0.015,
    3,
  );
  builder.cylinder("glow", palette.warmLight, {
    radius: 0.08,
    length: 0.18,
    at: lantern,
    segments: 8,
  });
  builder.cylinder("metal", brass, {
    radius: 0.12,
    radiusEnd: 0.02,
    length: 0.1,
    at: [lantern[0], lantern[1] + 0.14, lantern[2]],
    segments: 8,
  });
  builder.cylinder("metal", brass, {
    radius: 0.1,
    length: 0.03,
    at: [lantern[0], lantern[1] - 0.1, lantern[2]],
    segments: 8,
  });
  [0, 1, 2, 3].forEach((side) => {
    const angle = (side / 4) * Math.PI * 2 + Math.PI / 4;
    builder.box(
      "metal",
      brass,
      [0.015, 0.2, 0.015],
      [
        lantern[0] + Math.sin(angle) * 0.09,
        lantern[1],
        lantern[2] + Math.cos(angle) * 0.09,
      ],
    );
  });
};

/* Rugs and cushions inside, and a tray with the coffee things */

const addRug = (
  builder: AttractionBuilder,
  at: Triple,
  width: number,
  depth: number,
  colour: string,
  motif: string,
) => {
  builder.box("matte", colour, [width, 0.02, depth], [at[0], 0.012, at[2]]);
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    rugGold,
    [width - 0.12, 0.022, depth - 0.12],
    [at[0], 0.013, at[2]],
  );
  builder.box(
    "matte",
    colour,
    [width - 0.22, 0.024, depth - 0.22],
    [at[0], 0.014, at[2]],
  );
  const diamonds = Math.max(1, Math.round(width / 0.55));
  for (let index = 0; index < diamonds; index++) {
    const x = at[0] - width / 2 + (index + 0.5) * (width / diamonds);
    builder.box(
      "matte",
      motif,
      [0.22, 0.028, 0.22],
      [x, 0.016, at[2]],
      [0, Math.PI / 4, 0],
    );
    builder.box(
      "matte",
      rugGold,
      [0.09, 0.032, 0.09],
      [x, 0.018, at[2]],
      [0, Math.PI / 4, 0],
    );
  }
};

const buildInside = (builder: AttractionBuilder) => {
  addRug(builder, [0.3, 0, tentMiddleZ + 0.1], 3.6, 1.9, rugRed, rugIndigo);
  addRug(builder, [0.9, 0, 1.2], 1.6, 0.9, rugIndigo, rugRed);
  if (builder.isFar) {
    return;
  }
  /* Long cushions along the back wall, with bolsters to lean on */
  for (let index = 0; index < 6; index++) {
    const x = -1.5 + index * 0.62;
    const colour = cushionColours[index % cushionColours.length];
    builder.sphere(
      "matte",
      colour,
      0.3,
      [x, 0.12, tent.minZ + 0.4],
      [1, 0.4, 0.9],
      10,
    );
    builder.cylinder("matte", shade(colour, 0.85), {
      radius: 0.12,
      length: 0.5,
      at: [x, 0.32, tent.minZ + 0.2],
      axis: "x",
      segments: 10,
    });
  }
  /* The tray table */
  const [x, , z] = trayAt;
  builder.cylinder("metal", brass, {
    radius: 0.4,
    length: 0.03,
    at: [x, 0.3, z],
    segments: 20,
  });
  builder.torus("metal", shade(brass, 1.1), 0.4, 0.02, [x, 0.31, z], "y", 20);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x - 0.25 * side, 0, z - 0.25],
      [x + 0.25 * side, 0.29, z + 0.25],
      0.035,
      5,
    );
    builder.bar(
      "matte",
      palette.darkTimber,
      [x - 0.25 * side, 0, z + 0.25],
      [x + 0.25 * side, 0.29, z - 0.25],
      0.035,
      5,
    );
  });
  /* The dallah: a brass coffee pot with a long beak of a spout */
  const pot: Triple = [x + 0.08, 0.315, z];
  builder.lathe(
    "metal",
    brass,
    [
      [0, 0],
      [0.1, 0],
      [0.11, 0.02],
      [0.08, 0.05],
      [0.06, 0.1],
      [0.09, 0.16],
      [0.08, 0.22],
      [0.045, 0.26],
      [0.06, 0.3],
      [0.05, 0.34],
      [0.012, 0.4],
      [0, 0.42],
    ],
    pot,
    "y",
    14,
  );
  builder.bar(
    "metal",
    brass,
    [pot[0] + 0.07, pot[1] + 0.12, pot[2]],
    [pot[0] + 0.16, pot[1] + 0.22, pot[2]],
    0.035,
    6,
  );
  builder.bar(
    "metal",
    brass,
    [pot[0] + 0.16, pot[1] + 0.22, pot[2]],
    [pot[0] + 0.22, pot[1] + 0.3, pot[2]],
    0.025,
    6,
  );
  builder.bar(
    "metal",
    brass,
    [pot[0] - 0.07, pot[1] + 0.25, pot[2]],
    [pot[0] - 0.14, pot[1] + 0.14, pot[2]],
    0.02,
    4,
  );
  builder.bar(
    "metal",
    brass,
    [pot[0] - 0.14, pot[1] + 0.14, pot[2]],
    [pot[0] - 0.08, pot[1] + 0.06, pot[2]],
    0.02,
    4,
  );
  /* Little handleless cups, and a bowl of dates */
  [0, 1, 2, 3].forEach((cup) => {
    const angle = Math.PI * 0.6 + cup * 0.5;
    builder.cylinder("paint", cup % 2 === 0 ? palette.white : "#e8d8a8", {
      radius: 0.03,
      radiusEnd: 0.04,
      length: 0.06,
      at: [x + Math.sin(angle) * 0.25, 0.345, z + Math.cos(angle) * 0.25],
      segments: 8,
    });
  });
  builder.sphere(
    "paint",
    "#d8c8a8",
    0.09,
    [x - 0.12, 0.33, z - 0.18],
    [1, 0.45, 1],
    10,
  );
  [0, 2, 4].forEach((angle) => {
    builder.sphere(
      "matte",
      "#7a3a1a",
      0.03,
      [
        x - 0.12 + Math.sin(angle) * 0.03,
        0.37,
        z - 0.18 + Math.cos(angle) * 0.03,
      ],
      [1, 0.7, 1.4],
      6,
    );
  });
  /* A water jar and a camel saddle by the side wall */
  builder.lathe(
    "matte",
    "#b8603a",
    [
      [0, 0],
      [0.12, 0],
      [0.22, 0.2],
      [0.2, 0.42],
      [0.08, 0.55],
      [0.1, 0.62],
      [0.07, 0.62],
    ],
    [1.85, 0, -1.6],
    "y",
    14,
  );
  const saddle: Triple = [1.6, 0, -0.4];
  builder.roundedBox("matte", rugDeep, [0.6, 0.18, 0.45], 0.06, [
    saddle[0],
    0.09,
    saddle[2],
  ]);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [saddle[0] + side * 0.25, 0.18, saddle[2]],
      [saddle[0] + side * 0.3, 0.55, saddle[2]],
      0.05,
      6,
    );
    builder.sphere(
      "matte",
      palette.darkTimber,
      0.05,
      [saddle[0] + side * 0.3, 0.57, saddle[2]],
      [1, 1, 1],
      6,
    );
  });
};

/* The campfire out front, and the goat's peg */

const buildFire = (builder: AttractionBuilder) => {
  const [x, , z] = firePivot;
  if (builder.isFar) {
    builder.cylinder("matte", "#7a6e62", {
      radius: 0.48,
      length: 0.14,
      at: [x, 0.07, z],
      segments: 8,
    });
    builder.sphere("glow", flameOrange, 0.2, [x, 0.3, z], [1, 1.4, 1], 6);
    return;
  }
  const stones = 9;
  for (let stone = 0; stone < stones; stone++) {
    const angle = (stone / stones) * Math.PI * 2;
    builder.add(
      "matte",
      stone % 2 === 0 ? "#8a7a6a" : "#6a5e52",
      new DodecahedronGeometry(0.13, 0),
      {
        at: [x + Math.sin(angle) * 0.42, 0.08, z + Math.cos(angle) * 0.42],
        scale: [1.2, 0.8, 1],
      },
      0.6,
    );
  }
  builder.cylinder("matte", "#2a2420", {
    radius: 0.34,
    length: 0.02,
    at: [x, 0.01, z],
    segments: 14,
  });
  [0, 1.05, 2.1].forEach((angle) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + Math.sin(angle) * 0.32, 0.04, z + Math.cos(angle) * 0.32],
      [x - Math.sin(angle) * 0.32, 0.12, z - Math.cos(angle) * 0.32],
      0.08,
      7,
    );
  });
  builder.sphere("glow", "#ff5a1a", 0.12, [x, 0.08, z], [1.6, 0.4, 1.6], 8);
  /* A blackened kettle on three stones beside it */
  builder.sphere(
    "metal",
    "#3a3634",
    0.13,
    [x + 0.65, 0.18, z - 0.25],
    [1, 0.8, 1],
    10,
  );
  builder.cylinder("metal", "#3a3634", {
    radius: 0.02,
    radiusEnd: 0.015,
    length: 0.16,
    at: [x + 0.8, 0.22, z - 0.25],
    axis: "x",
    segments: 5,
  });
  /* Low stools of rolled rugs to sit on round the fire */
  [
    [x - 0.95, z + 0.2, 0.3],
    [x + 0.2, z + 0.95, 1.4],
  ].forEach(([sx, sz, turn], index) => {
    builder.add(
      "matte",
      cushionColours[index + 1],
      new BoxGeometry(0.55, 0.22, 0.35, 1, 1, 1).rotateY(turn),
      { at: [sx, 0.11, sz] },
      undefined,
    );
  });
};

const buildGoat = (builder: AttractionBuilder) => {
  const [x, , z] = goatAt;
  builder.sphere(
    "matte",
    goatWhite,
    0.3,
    [x, 0.55, z],
    [1.35, 0.85, 0.8],
    builder.isFar ? 6 : 12,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    goatBrown,
    0.2,
    [x - 0.12, 0.62, z],
    [1.1, 0.7, 0.85],
    8,
  );
  [-1, 1].forEach((front) => {
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        goatWhite,
        [x + front * 0.22, 0.45, z + side * 0.12],
        [x + front * 0.24, 0.04, z + side * 0.13],
        0.07,
        6,
      );
      builder.box(
        "matte",
        palette.black,
        [0.07, 0.06, 0.08],
        [x + front * 0.24, 0.03, z + side * 0.13],
      );
    });
  });
  builder.bar(
    "matte",
    goatBrown,
    [x - 0.38, 0.65, z],
    [x - 0.45, 0.8, z],
    0.05,
    5,
  );
  /* The rope from its collar to a peg */
  const peg: Triple = [x + 0.7, 0.08, z + 0.7];
  builder.box("matte", palette.darkTimber, [0.05, 0.2, 0.05], peg);
  builder.bar(
    "matte",
    "#c9b48a",
    [goatNeck[0] + 0.05, 0.6, z + 0.06],
    [peg[0], 0.16, peg[2]],
    0.02,
    4,
  );
  /* A little pile of hay to nibble */
  builder.sphere(
    "matte",
    "#d8b65a",
    0.22,
    [x + 0.85, 0.05, z - 0.3],
    [1.3, 0.4, 1],
    8,
  );
};

/* The moving parts */

const buildFlap = (builder: AttractionBuilder) => {
  /* A curtain of goat hair hung from the front edge, with tassels */
  const width = bay - 0.12;
  const drop = frontHeight - sag - 0.1;
  builder.box("matte", wallWeave, [width, drop, 0.04], [0, -drop / 2, 0]);
  builder.box("matte", rugRed, [width + 0.01, 0.12, 0.045], [0, -0.22, 0]);
  builder.box("matte", rugGold, [width + 0.01, 0.04, 0.05], [0, -0.22, 0]);
  for (let tassel = 0; tassel < 7; tassel++) {
    builder.cylinder("matte", rugGold, {
      radius: 0.02,
      radiusEnd: 0.035,
      length: 0.1,
      at: [-width / 2 + 0.1 + tassel * ((width - 0.2) / 6), -drop - 0.03, 0],
      segments: 6,
    });
  }
};

const buildFlames = (builder: AttractionBuilder) => {
  builder.cylinder("glow", flameOrange, {
    radius: 0.2,
    radiusEnd: 0.0,
    length: 0.45,
    at: [0, 0.22, 0],
    segments: 10,
  });
  builder.cylinder("glow", "#ffd46a", {
    radius: 0.11,
    radiusEnd: 0.0,
    length: 0.3,
    at: [0.04, 0.16, 0.03],
    segments: 8,
  });
  builder.cylinder("glow", "#ff6a2a", {
    radius: 0.08,
    radiusEnd: 0.0,
    length: 0.25,
    at: [-0.12, 0.13, -0.05],
    segments: 6,
  });
};

const buildGoatHead = (builder: AttractionBuilder) => {
  builder.bar("matte", goatWhite, [0, 0, 0], [0.1, 0.18, 0], 0.15, 8);
  const head: Triple = [0.2, 0.24, 0];
  builder.sphere("matte", goatWhite, 0.12, head, [1.3, 0.85, 0.8], 10);
  builder.sphere(
    "matte",
    shade(goatWhite, 0.92),
    0.07,
    [head[0] + 0.12, head[1] - 0.04, 0],
    [1, 0.8, 0.9],
    8,
  );
  builder.bar(
    "matte",
    goatWhite,
    [head[0] + 0.08, head[1] - 0.08, 0],
    [head[0] + 0.06, head[1] - 0.2, 0],
    0.04,
    5,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [head[0] + 0.07, head[1] + 0.04, side * 0.075],
      [1, 1, 1],
      6,
    );
    builder.box(
      "matte",
      goatBrown,
      [0.14, 0.03, 0.06],
      [head[0] - 0.04, head[1] + 0.02, side * 0.13],
      [side * 0.5, 0, 0],
    );
    /* Horns curling back */
    builder.bar(
      "paint",
      "#8a7a60",
      [head[0] - 0.02, head[1] + 0.08, side * 0.04],
      [head[0] - 0.12, head[1] + 0.2, side * 0.06],
      0.035,
      5,
    );
    builder.bar(
      "paint",
      "#8a7a60",
      [head[0] - 0.12, head[1] + 0.2, side * 0.06],
      [head[0] - 0.2, head[1] + 0.16, side * 0.07],
      0.028,
      5,
    );
  });
  builder.torus("paint", rugRed, 0.08, 0.02, [0.03, 0.05, 0], "x", 10);
  builder.sphere("metal", brass, 0.03, [0.1, -0.02, 0], [1, 1, 1], 6);
};

export const bedouinTentModel: CuriosityModel = {
  kind: "bedouin-tent",
  islandId: "sunscorch-sands",
  name: "Bedouin Tent",
  fact: "The Bedouin are nomads: people who move from place to place across the deserts of the Middle East and North Africa with their camels and goats, looking for water and grazing. Their long tents are woven from black goat hair, which lets cool air through in the heat and swells to keep out the rain. Guests are welcomed with cardamom coffee from a dallah pot.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of human geography, including types of settlement and land use.",
  footprint: 4.9,
  setting: "inland",
  signSpot: { x: 2.4, z: 3.5 },
  padColour: sand,
  build: (builder) => {
    buildTent(builder);
    buildInside(builder);
    buildFire(builder);
    buildGoat(builder);
    if (builder.isFar) {
      builder.box(
        "matte",
        wallWeave,
        [bay - 0.12, frontHeight - sag - 0.1, 0.04],
        [flapPivot[0], (frontHeight - sag - 0.1) / 2 + 0.1, flapPivot[2]],
      );
    }
    addSignBoard(builder, [2.4, 0, 3.5], signColour);
  },
  moving: [
    {
      name: "tent flap",
      pivot: flapPivot,
      build: buildFlap,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.7, period: 3.2 },
    },
    {
      name: "campfire",
      pivot: firePivot,
      build: buildFlames,
      motion: { kind: "flicker", period: 0.5 },
    },
    {
      name: "goat's head",
      pivot: goatNeck,
      build: buildGoatHead,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 5,
        amplitude: 0.35,
        period: 1.1,
      },
    },
  ],
  smoke: [
    {
      at: [firePivot[0], firePivot[1] + 0.6, firePivot[2]],
      colour: "#d8d0c4",
      puffs: 5,
      size: 0.14,
      rise: 1.6,
      spread: 0.3,
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: tent.minX, z: tent.minZ },
      { x: tent.maxX, z: tent.minZ },
      0.3,
      0.5,
    ),
    ...[-1, 1].flatMap((side) =>
      listWallBlockers(
        { x: side * tent.maxX, z: tent.minZ },
        { x: side * tent.maxX, z: tent.minZ + 1.4 },
        0.3,
        0.5,
      ),
    ),
    ...poleXs.flatMap((x) =>
      [tent.maxZ, tentMiddleZ].map((z) => ({ x, z, radius: 0.12 })),
    ),
    { x: firePivot[0], z: firePivot[2], radius: 0.55 },
    { x: goatAt[0], z: goatAt[2], radius: 0.5 },
    { x: trayAt[0], z: trayAt[2], radius: 0.42 },
    { x: 1.85, z: -1.6, radius: 0.25 },
    { x: 1.6, z: -0.4, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Sit by the fire",
    news: "Crackle, pop! You sat on a cushion by the warm fire, and were handed a tiny cup of cardamom coffee and a sticky date.",
  },
};
