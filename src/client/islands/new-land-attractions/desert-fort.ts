import { ConeGeometry, CylinderGeometry } from "three";
import {
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
  addBasket,
  addLump,
  addPalm,
  addPerson,
  addPot,
  addSheet,
  addTaperedBar,
  placeBy,
  sands,
  type Palm,
} from "./date-palm-grove-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const brick = sands.mudBrick;
const brickDark = shade(sands.mudBrick, 0.86);
const brickLight = shade(sands.mudBrick, 1.1);
const limewash = "#efe3c4";
const yard = "#d6b880";
const cowhide = "#efe7d8";
const cowSpots = "#4a3526";
const horusBlue = "#2f5fae";
const camelCoat = "#c89a63";
const signColour = horusBlue;

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const outer = 4.6;
const inner = 3.4;
const wallTop = 1.5;
const bastionOut = 5.3;
const gateHalf = 0.85;
const gateTowerOut = 2.0;
const gateTowerTop = 2.85;

const stairs = { minX: -inner, maxX: -inner + 1.0, bottom: 1.0, steps: 6 };
const stairTread = 0.4;
const stairRise = wallTop / stairs.steps;

const barracks = { minX: -inner, maxX: 0.6, minZ: -inner, maxZ: -2.3 };
const towerAt = { x: 2.2, z: -2.2 };
const towerHalf = 0.7;
const towerTop = 4.0;
const zipTop = towerTop + 1.0;
const zipBottom = 1.9;
const wellAt = { x: 0.9, z: 1.4 };
const shadufPivot: Triple = [1.75, 1.8, wellAt.z];
const ovenAt = { x: -0.7, z: -1.6 };
const anchorAt = { x: -1.9, z: 2.1 };
const granaries = [
  { x: 2.8, z: -0.3 },
  { x: 2.75, z: 2.6 },
];
const palms: readonly Palm[] = [
  { x: -2.9, z: 3.0, height: 3.6, lean: 0.7, curve: 0.6 },
  { x: -7.4, z: 3.9, height: 4.3, lean: 1.4, curve: 0.9 },
  { x: 7.2, z: -4.2, height: 3.9, lean: -2.2, curve: 0.8 },
];

/* ------------------------------------------------------------------ */
/* Walls, bastions and the gate                                        */
/* ------------------------------------------------------------------ */

/** Merlons along an outer edge, from one corner to another, at the top of a wall. */
const addMerlons = (
  builder: AttractionBuilder,
  from: { x: number; z: number },
  to: { x: number; z: number },
  top: number,
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z);
  const count = Math.max(1, Math.round(length / (builder.isFar ? 1.6 : 0.8)));
  for (let merlon = 0; merlon < count; merlon++) {
    const share = (merlon + 0.5) / count;
    builder.box(
      "matte",
      merlon % 2 === 0 ? brickLight : brick,
      [0.32, 0.6, builder.isFar ? 1.2 : 0.45],
      [
        from.x + (to.x - from.x) * share,
        top + 0.3,
        from.z + (to.z - from.z) * share,
      ],
      [0, turn, 0],
    );
  }
};

const buildWalls = (builder: AttractionBuilder) => {
  const thick = outer - inner;
  const middle = (outer + inner) / 2;
  /* Left, right and back walls, and the front either side of the gate. */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      brick,
      [thick, wallTop, outer * 2],
      [side * middle, wallTop / 2, 0],
    );
    const frontLength = outer - gateTowerOut;
    builder.box(
      "matte",
      brick,
      [frontLength, wallTop, thick],
      [side * (gateTowerOut + frontLength / 2), wallTop / 2, middle],
    );
  });
  builder.box(
    "matte",
    brick,
    [outer * 2, wallTop, thick],
    [0, wallTop / 2, -middle],
  );
  /* A limewashed band round the top, and a walkway of beaten earth. */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      limewash,
      [0.04, 0.18, outer * 2],
      [side * (outer + 0.02), wallTop - 0.25, 0],
    );
  });
  builder.box(
    "matte",
    limewash,
    [outer * 2, 0.18, 0.04],
    [0, wallTop - 0.25, -outer - 0.02],
  );
  /* Corner bastions. */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      const size = bastionOut - inner + 0.1;
      const x = sideX * (inner - 0.1 + size / 2);
      const z = sideZ * (inner - 0.1 + size / 2);
      builder.box(
        "matte",
        brickDark,
        [size, wallTop, size],
        [x, wallTop / 2, z],
      );
      builder.box(
        "matte",
        limewash,
        [size + 0.04, 0.12, size + 0.04],
        [x, wallTop - 0.2, z],
      );
      addMerlons(
        builder,
        { x: sideX * bastionOut + -sideX * 0.16, z: sideZ * (inner - 0.1) },
        { x: sideX * bastionOut + -sideX * 0.16, z: sideZ * bastionOut },
        wallTop,
      );
      addMerlons(
        builder,
        { x: sideX * (inner - 0.1), z: sideZ * bastionOut + -sideZ * 0.16 },
        { x: sideX * bastionOut, z: sideZ * bastionOut + -sideZ * 0.16 },
        wallTop,
      );
    });
  });
  /* Merlons along the outer edges of the walls between the bastions. */
  const edge = outer - 0.16;
  [-1, 1].forEach((side) => {
    addMerlons(
      builder,
      { x: side * edge, z: -inner + 0.1 },
      { x: side * edge, z: inner - 0.1 },
      wallTop,
    );
    addMerlons(
      builder,
      { x: side * (gateTowerOut + 0.1), z: edge },
      { x: side * (inner - 0.1), z: edge },
      wallTop,
    );
  });
  addMerlons(
    builder,
    { x: -inner + 0.1, z: -edge },
    { x: inner - 0.1, z: -edge },
    wallTop,
  );
  if (builder.isFar) {
    return;
  }
  /* Arrow slits along the outside and drain spouts. */
  for (let slit = 0; slit < 6; slit++) {
    const along = -3 + slit * 1.2;
    builder.box(
      "matte",
      "#3b2a20",
      [0.08, 0.4, 0.02],
      [along, 0.85, -outer - 0.01],
    );
    builder.box(
      "matte",
      "#3b2a20",
      [0.02, 0.4, 0.08],
      [-outer - 0.01, 0.85, along],
    );
    builder.box(
      "matte",
      "#3b2a20",
      [0.02, 0.4, 0.08],
      [outer + 0.01, 0.85, along],
    );
  }
  /* A low lip along the inside edge of the wall-walk. */
  builder.box(
    "matte",
    brickLight,
    [0.12, 0.2, outer * 2 - 1.8],
    [-inner + 0.06, wallTop + 0.1, -0.2],
  );
  builder.box(
    "matte",
    brickLight,
    [0.12, 0.2, outer * 2 - 1.8],
    [inner - 0.06, wallTop + 0.1, 0],
  );
};

const buildGate = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    const width = gateTowerOut - gateHalf;
    const x = side * (gateHalf + width / 2);
    builder.add(
      "matte",
      brickLight,
      new CylinderGeometry(
        (width * 0.8) / Math.SQRT2,
        width / Math.SQRT2,
        gateTowerTop,
        4,
        1,
      ).rotateY(Math.PI / 4),
      { at: [x, gateTowerTop / 2, outer - 0.15], scale: [1, 1, 1.55] },
    );
    builder.box(
      "matte",
      limewash,
      [width, 0.2, 1.7],
      [x, gateTowerTop + 0.1, outer - 0.15],
    );
    addMerlons(
      builder,
      { x: side * gateHalf + side * 0.1, z: outer + 0.55 },
      { x: side * gateTowerOut - side * 0.1, z: outer + 0.55 },
      gateTowerTop + 0.2,
    );
    /* Wooden gates folded back against the passage. */
    builder.box(
      "paint",
      palette.timber,
      [0.08, 1.9, 0.85],
      [side * (gateHalf - 0.06), 0.95, outer - 0.15],
    );
    if (!builder.isFar) {
      [0.4, 1.0, 1.6].forEach((up) => {
        builder.box(
          "metal",
          palette.brass,
          [0.1, 0.05, 0.86],
          [side * (gateHalf - 0.06), up, outer - 0.15],
        );
      });
      /* The Eye of Horus painted on each tower. */
      const eyeAt: Triple = [x, 2.1, outer + 0.7];
      builder.sphere("paint", palette.white, 0.14, eyeAt, [1.6, 0.8, 0.2], 10);
      builder.sphere(
        "paint",
        horusBlue,
        0.07,
        [eyeAt[0], eyeAt[1], eyeAt[2] + 0.02],
        [1, 1, 0.3],
        8,
      );
      builder.box(
        "paint",
        horusBlue,
        [0.42, 0.04, 0.03],
        [eyeAt[0] + 0.03, eyeAt[1] + 0.16, eyeAt[2]],
      );
      builder.box(
        "paint",
        horusBlue,
        [0.04, 0.28, 0.03],
        [eyeAt[0] - side * 0.02, eyeAt[1] - 0.22, eyeAt[2]],
        [0, 0, side * 0.3],
      );
    }
  });
  /* A lintel across the top of the gateway, high over heads. */
  builder.box(
    "matte",
    limewash,
    [gateHalf * 2 + 0.3, 0.4, 1.4],
    [0, 2.4, outer - 0.15],
  );
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.04,
    length: 1.5,
    at: [gateHalf + 0.55, gateTowerTop + 0.75, outer - 0.15],
    segments: 6,
  });
};

/* ------------------------------------------------------------------ */
/* Inside the walls                                                    */
/* ------------------------------------------------------------------ */

const buildStairs = (builder: AttractionBuilder) => {
  for (let step = 1; step <= stairs.steps; step++) {
    const front = stairs.bottom - (step - 1) * stairTread;
    const back = -inner;
    builder.box(
      "matte",
      step % 2 === 0 ? brick : brickLight,
      [
        stairs.maxX - stairs.minX,
        step * stairRise,
        front - back > 0 ? stairTread : 0.1,
      ],
      [
        (stairs.minX + stairs.maxX) / 2,
        (step * stairRise) / 2,
        front - stairTread / 2,
      ],
    );
  }
};

const buildBarracks = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = barracks;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  builder.box(
    "matte",
    brickLight,
    [width, wallTop, depth],
    [(minX + maxX) / 2, wallTop / 2, (minZ + maxZ) / 2],
  );
  builder.box(
    "matte",
    limewash,
    [width + 0.06, 0.12, depth + 0.06],
    [(minX + maxX) / 2, wallTop - 0.04, (minZ + maxZ) / 2],
  );
  /* Dark doorways along the front, and a palm-frond shade over them. */
  [-2.9, -1.6, -0.3].forEach((x) => {
    builder.box("matte", "#3b2a20", [0.6, 1.1, 0.04], [x, 0.55, maxZ + 0.01]);
    if (!builder.isFar) {
      builder.box(
        "paint",
        horusBlue,
        [0.74, 0.08, 0.06],
        [x, 1.14, maxZ + 0.02],
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  [-0.95, 0.35].forEach((x) => {
    builder.box("matte", "#3b2a20", [0.25, 0.25, 0.04], [x, 1.1, maxZ + 0.01]);
  });
  /* A roof shade on poles, on the barracks' roof terrace. */
  [minX + 0.4, maxX - 0.4].forEach((x) => {
    builder.cylinder("matte", palette.paleTimber, {
      radius: 0.05,
      length: 1.6,
      at: [x, wallTop + 0.8, maxZ - 0.25],
      segments: 6,
    });
  });
  builder.box(
    "matte",
    sands.thatch,
    [width - 0.4, 0.06, 1.5],
    [(minX + maxX) / 2, wallTop + 1.62, maxZ - 0.75],
    [0.08, 0, 0],
  );
  /* Spears in a rack and cowhide shields leaning by the doors. */
  for (let spear = 0; spear < 5; spear++) {
    const x = -2.3 + spear * 0.12;
    builder.bar(
      "matte",
      palette.paleTimber,
      [x, 0, maxZ + 0.25],
      [x + 0.05, 1.65, maxZ + 0.05],
      0.03,
      4,
    );
    builder.add("metal", palette.steel, new ConeGeometry(0.035, 0.16, 4), {
      at: [x + 0.055, 1.72, maxZ + 0.04],
    });
  }
  [0.2, -1.0].forEach((x, index) => {
    builder.box(
      "matte",
      cowhide,
      [0.45, 0.75, 0.05],
      [x, 0.4, maxZ + 0.2],
      [-0.25, index * 0.3, 0],
    );
    builder.sphere(
      "matte",
      cowSpots,
      0.1,
      [x + 0.05, 0.5, maxZ + 0.24],
      [1, 1.3, 0.2],
      6,
    );
  });
};

const buildTower = (builder: AttractionBuilder) => {
  const { x, z } = towerAt;
  builder.box(
    "matte",
    brickDark,
    [towerHalf * 2, towerTop, towerHalf * 2],
    [x, towerTop / 2, z],
  );
  builder.box(
    "matte",
    limewash,
    [towerHalf * 2 + 0.1, 0.15, towerHalf * 2 + 0.1],
    [x, towerTop - 0.07, z],
  );
  [-1, 1].forEach((side) => {
    addMerlons(
      builder,
      { x: x - towerHalf, z: z + side * (towerHalf - 0.12) },
      { x: x + towerHalf, z: z + side * (towerHalf - 0.12) },
      towerTop,
    );
    addMerlons(
      builder,
      { x: x + side * (towerHalf - 0.12), z: z - towerHalf + 0.3 },
      { x: x + side * (towerHalf - 0.12), z: z + towerHalf - 0.3 },
      towerTop,
    );
  });
  /* The zip wire's post on top, and its rope down to the yard. */
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.07,
    length: 1.1,
    at: [x, towerTop + 0.55, z],
    segments: 8,
  });
  builder.bar(
    "matte",
    "#d8c9a6",
    [x, zipTop, z],
    [anchorAt.x, zipBottom, anchorAt.z],
    0.03,
    4,
  );
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.09,
    length: zipBottom + 0.15,
    at: [anchorAt.x, (zipBottom + 0.15) / 2, anchorAt.z],
    segments: 8,
  });
  /* A ladder up its front. */
  [-0.25, 0.25].forEach((dx) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.06, towerTop + 0.4, 0.06],
      [x + dx, (towerTop + 0.4) / 2, z + towerHalf + 0.08],
    );
  });
  const rungs = builder.isFar ? 3 : 12;
  for (let rung = 0; rung < rungs; rung++) {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.5, 0.04, 0.05],
      [x, 0.3 + (rung * (towerTop - 0.2)) / rungs, z + towerHalf + 0.08],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* A trolley wheel on the rope, ready for the next rider. */
  builder.torus(
    "metal",
    palette.steel,
    0.09,
    0.025,
    [x - 0.15, zipTop - 0.12, z + 0.16],
    "x",
    10,
  );
};

const buildWell = (builder: AttractionBuilder) => {
  const { x, z } = wellAt;
  builder.cylinder("matte", sands.sandstone, {
    radius: 0.55,
    length: 0.7,
    at: [x, 0.35, z],
    segments: 14,
  });
  builder.cylinder("matte", shade(sands.sandstone, 1.1), {
    radius: 0.6,
    length: 0.08,
    at: [x, 0.72, z],
    segments: 14,
  });
  builder.cylinder("water", "#1f4d55", {
    radius: 0.42,
    length: 0.02,
    at: [x, 0.68, z],
    segments: 14,
  });
  /* The shaduf's frame: two posts and a crossbar. */
  [-0.32, 0.32].forEach((dz) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.1, shadufPivot[1], 0.1],
      [shadufPivot[0], shadufPivot[1] / 2, shadufPivot[2] + dz],
    );
  });
  builder.cylinder("matte", palette.timber, {
    radius: 0.05,
    length: 0.8,
    at: shadufPivot,
    axis: "z",
    segments: 6,
  });
  if (builder.isFar) {
    return;
  }
  /* A trough for the animals, and water jars. */
  builder.box(
    "matte",
    sands.sandstone,
    [0.4, 0.3, 1.1],
    [x - 0.95, 0.15, z + 0.2],
  );
  builder.box(
    "water",
    palette.water,
    [0.28, 0.02, 0.95],
    [x - 0.95, 0.29, z + 0.2],
  );
  addPot(builder, [x + 0.2, 0, z + 0.8], 0.14);
  addPot(builder, [x - 0.2, 0, z + 0.9], 0.12, sands.deepTerracotta);
};

const buildShaduf = (builder: AttractionBuilder) => {
  /* A see-saw pole: a bucket over the well, a stone weight at the back. */
  const tilt = 0.18;
  const end = (along: number): Triple => [along, Math.sin(tilt) * -along, 0];
  addTaperedBar(
    builder,
    "matte",
    palette.paleTimber,
    end(-0.95),
    end(1.25),
    0.04,
    0.06,
    6,
  );
  const weight = end(1.15);
  addLump(
    builder,
    palette.darkStone,
    [weight[0], weight[1] - 0.12, 0],
    [0.22, 0.2, 0.2],
    2.1,
    1,
  );
  const tip = end(-0.88);
  builder.bar("matte", "#d8c9a6", tip, [tip[0], tip[1] - 0.7, 0], 0.015, 3);
  builder.lathe(
    "matte",
    sands.terracotta,
    [
      [0, 0],
      [0.1, 0.01],
      [0.13, 0.12],
      [0.1, 0.2],
      [0, 0.19],
    ],
    [tip[0], tip[1] - 0.9, 0],
    "y",
    10,
  );
};

const buildYard = (builder: AttractionBuilder) => {
  builder.box("matte", yard, [inner * 2, 0.02, inner * 2], [0, 0.01, 0]);
  builder.box(
    "matte",
    shade(yard, 0.93),
    [gateHalf * 2, 0.02, 3.4],
    [0, 0.012, inner - 1.0],
  );
  /* Beehive granaries. */
  granaries.forEach(({ x, z }, index) => {
    builder.lathe(
      "matte",
      index === 0 ? sands.daub : shade(sands.daub, 1.08),
      [
        [0, 0],
        [0.55, 0],
        [0.56, 0.6],
        [0.45, 1.15],
        [0.25, 1.5],
        [0.08, 1.62],
        [0, 1.62],
      ],
      [x, 0, z],
      "y",
      14,
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        "#3b2a20",
        [0.28, 0.3, 0.04],
        [x - 0.4, 1.15, z],
        [0, -Math.PI / 2 + 0.3, 0],
      );
      builder.bar(
        "matte",
        palette.paleTimber,
        [x - 1.0, 0, z],
        [x - 0.48, 1.0, z],
        0.06,
        5,
      );
    }
  });
  /* The bread oven. */
  builder.lathe(
    "matte",
    "#a8673e",
    [
      [0, 0],
      [0.45, 0],
      [0.42, 0.35],
      [0.25, 0.65],
      [0.1, 0.72],
      [0, 0.72],
    ],
    [ovenAt.x, 0, ovenAt.z],
    "y",
    12,
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "glow",
    "#ff8a2a",
    [0.22, 0.18, 0.04],
    [ovenAt.x, 0.15, ovenAt.z + 0.42],
  );
  addBasket(builder, [ovenAt.x + 0.7, 0, ovenAt.z + 0.2], 0.2, "#d9a75a");
  /* A baker kneading dough. */
  addPerson(builder, [ovenAt.x + 0.15, 0, ovenAt.z + 0.8], Math.PI, {
    skin: sands.skin,
    cloth: palette.white,
    head: "wrap",
    headColour: palette.white,
  });
  /* Crates and sacks by the gate. */
  [
    [2.3, 2.9],
    [2.3, 2.25],
  ].forEach(([x, z], index) => {
    builder.box(
      "matte",
      index === 0 ? palette.paleTimber : palette.timber,
      [0.5, 0.45, 0.5],
      [x - 0.8, 0.22, z],
      [0, index * 0.3, 0],
    );
  });
  builder.sphere("matte", "#d9c9a6", 0.25, [-2.4, 0.22, 0.2], [1, 0.9, 0.8], 8);
  builder.sphere("matte", "#cdb98e", 0.22, [-2.2, 0.2, 0.6], [1, 0.9, 0.8], 8);
};

const buildOutside = (builder: AttractionBuilder) => {
  palms.forEach((palm, index) => {
    addPalm(builder, palm, index);
  });
  /* A camel trough and saddles outside the west wall. */
  builder.box("matte", sands.sandstone, [0.5, 0.35, 1.4], [-6.0, 0.17, -3.4]);
  builder.box("water", palette.water, [0.36, 0.02, 1.25], [-6.0, 0.33, -3.4]);
  if (builder.isFar) {
    return;
  }
  [
    [6.6, 2.1, 0.5],
    [-3.6, -7.0, 0.35],
    [3.4, -7.2, 0.42],
  ].forEach(([x, z, size], index) => {
    addLump(
      builder,
      sands.sandstone,
      [x, size * 0.3, z],
      [size * 1.3, size * 0.7, size],
      index * 2.7,
    );
  });
  /* Archers keeping watch from two bastions. */
  addPerson(builder, [-4.8, wallTop, -4.8], Math.PI * 1.25, {
    skin: sands.skinDark,
    cloth: palette.white,
    head: "cap",
    headColour: horusBlue,
  });
  addPerson(builder, [4.8, wallTop, 4.75], Math.PI * 0.25, {
    skin: sands.skin,
    cloth: palette.white,
    head: "cap",
    headColour: horusBlue,
  });
};

const buildFort = (builder: AttractionBuilder) => {
  buildYard(builder);
  buildWalls(builder);
  buildGate(builder);
  buildStairs(builder);
  buildBarracks(builder);
  buildTower(builder);
  buildWell(builder);
  buildOutside(builder);
  addSignBoard(builder, [-2.2, 0, 8.3], signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts and wanderers                                          */
/* ------------------------------------------------------------------ */

const buildFlag = (builder: AttractionBuilder) => {
  addSheet(builder, "matte", horusBlue, [
    [0, 0, 0],
    [0.9, -0.05, 0],
    [0.85, -0.5, 0],
    [0, -0.45, 0],
  ]);
  if (!builder.isFar) {
    addSheet(builder, "paint", sands.gold, [
      [0.25, -0.15, 0.01],
      [0.6, -0.17, 0.01],
      [0.42, -0.35, 0.01],
    ]);
  }
};

const buildLookout = (builder: AttractionBuilder) => {
  /* A lookout who pops up between the merlons to see who is coming. */
  addPerson(builder, [0, 0, 0], 0.3, {
    skin: sands.skinDark,
    cloth: palette.white,
    head: "cap",
    headColour: horusBlue,
  });
  const place = placeBy([0, 0, 0], 0.3);
  builder.bar(
    "matte",
    palette.paleTimber,
    place(0.25, 0.3, 0.1),
    place(0.3, 1.5, 0.15),
    0.03,
    4,
  );
  builder.add("metal", palette.steel, new ConeGeometry(0.04, 0.16, 4), {
    at: place(0.3, 1.58, 0.15),
  });
};

const buildSoldier = (builder: AttractionBuilder) => {
  addPerson(builder, [0, 0, 0], 0, {
    skin: sands.skin,
    cloth: palette.white,
    head: "cap",
    headColour: sands.hair,
  });
  builder.bar(
    "matte",
    palette.paleTimber,
    [0.24, 0.0, 0.05],
    [0.24, 1.55, 0.05],
    0.03,
    4,
  );
  if (!builder.isFar) {
    builder.add("metal", palette.steel, new ConeGeometry(0.035, 0.15, 4), {
      at: [0.24, 1.62, 0.05],
    });
    builder.box(
      "matte",
      cowhide,
      [0.36, 0.55, 0.04],
      [-0.24, 0.65, 0.08],
      [0, 0.3, 0],
    );
    builder.sphere(
      "matte",
      cowSpots,
      0.08,
      [-0.23, 0.7, 0.11],
      [1, 1.3, 0.2],
      6,
    );
  }
};

const buildCamel = (builder: AttractionBuilder) => {
  const segments = builder.segments(9, 5);
  builder.sphere(
    "matte",
    camelCoat,
    0.42,
    [0, 1.12, 0],
    [0.82, 0.62, 1.35],
    segments,
  );
  builder.sphere(
    "matte",
    shade(camelCoat, 1.04),
    0.3,
    [0, 1.42, -0.05],
    [0.9, 0.95, 1.2],
    segments,
  );
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      addTaperedBar(
        builder,
        "matte",
        shade(camelCoat, 0.92),
        [side * 0.18, 1.0, end * 0.33],
        [side * 0.19, 0.05, end * 0.36],
        0.1,
        0.06,
        5,
      );
    });
  });
  addTaperedBar(
    builder,
    "matte",
    camelCoat,
    [0, 1.15, 0.45],
    [0, 1.6, 0.78],
    0.19,
    0.12,
    7,
  );
  builder.sphere(
    "matte",
    camelCoat,
    0.16,
    [0, 1.67, 0.9],
    [0.8, 0.8, 1.4],
    segments,
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    horusBlue,
    [0.62, 0.04, 0.5],
    [0, 1.2, 0.22],
    [0.15, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.black,
      [0.03, 0.04, 0.05],
      [side * 0.11, 1.73, 0.95],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The zip wire                                                        */
/* ------------------------------------------------------------------ */

const zipStart = { x: 1.4, z: -0.5 };
const zipFinish = { x: -1.1, z: 2.9 };
const ladderFoot = { x: towerAt.x, z: towerAt.z + towerHalf + 0.35 };

const lerp = (from: number, to: number, share: number) =>
  from + (to - from) * share;

const followZip = (progress: number): LocalSpot => {
  const zipHeading = Math.atan2(anchorAt.x - towerAt.x, anchorAt.z - towerAt.z);
  if (progress < 0.05) {
    const share = progress / 0.05;
    return {
      x: lerp(zipStart.x, ladderFoot.x, share),
      y: 0,
      z: lerp(zipStart.z, ladderFoot.z, share),
      heading: Math.PI,
    };
  }
  if (progress < 0.32) {
    const share = (progress - 0.05) / 0.27;
    return {
      x: ladderFoot.x,
      y: towerTop * share,
      z: ladderFoot.z,
      heading: Math.PI,
    };
  }
  if (progress < 0.4) {
    const share = (progress - 0.32) / 0.08;
    return {
      x: towerAt.x,
      y: towerTop,
      z: lerp(ladderFoot.z, towerAt.z, share),
      heading: Math.PI + share * (zipHeading - Math.PI),
    };
  }
  if (progress < 0.9) {
    const share = (progress - 0.4) / 0.5;
    const speed = share * share;
    const ropeY = lerp(zipTop, zipBottom, speed);
    const hang = Math.min(1, share * 6);
    return {
      x: lerp(towerAt.x, anchorAt.x - 0.35 * Math.sin(zipHeading), speed),
      y: lerp(towerTop, ropeY - 1.45, hang),
      z: lerp(towerAt.z, anchorAt.z - 0.35 * Math.cos(zipHeading), speed),
      heading: zipHeading,
    };
  }
  const share = (progress - 0.9) / 0.1;
  const fromX = anchorAt.x - 0.35 * Math.sin(zipHeading);
  const fromZ = anchorAt.z - 0.35 * Math.cos(zipHeading);
  return {
    x: lerp(fromX, zipFinish.x, share),
    y: (zipBottom - 1.45) * (1 - share),
    z: lerp(fromZ, zipFinish.z, share),
    heading: Math.atan2(zipFinish.x - fromX, zipFinish.z - fromZ),
  };
};

/* ------------------------------------------------------------------ */
/* Decks                                                               */
/* ------------------------------------------------------------------ */

const wallDeck: Deck = ({ x, z }) => {
  const reachX = Math.abs(x);
  const reachZ = Math.abs(z);
  const isBastion =
    reachX >= inner - 0.1 &&
    reachZ >= inner - 0.1 &&
    reachX <= bastionOut &&
    reachZ <= bastionOut;
  const isWall =
    reachX <= outer && reachZ <= outer && Math.max(reachX, reachZ) >= inner;
  const isGate = z > 0 && reachX < gateTowerOut && reachZ >= inner - 0.05;
  if ((!isBastion && !isWall) || isGate) {
    return undefined;
  }
  return { height: wallTop, kind: "ground" };
};

const stairDeck: Deck = ({ x, z }) => {
  if (x < stairs.minX || x > stairs.maxX || z > stairs.bottom) {
    return undefined;
  }
  const step = Math.floor((stairs.bottom - z) / stairTread) + 1;
  if (step > stairs.steps) {
    return undefined;
  }
  return { height: step * stairRise, kind: "ground" };
};

const barracksDeck: Deck = ({ x, z }) =>
  x >= barracks.minX &&
  x <= barracks.maxX &&
  z >= barracks.minZ &&
  z <= barracks.maxZ
    ? { height: wallTop, kind: "ground" }
    : undefined;

const blockers: LocalBlocker[] = [
  { x: wellAt.x, z: wellAt.z, radius: 0.65 },
  { x: ovenAt.x, z: ovenAt.z, radius: 0.45 },
  ...granaries.map(({ x, z }) => ({ x, z, radius: 0.6 })),
  { x: anchorAt.x, z: anchorAt.z, radius: 0.2 },
  ...palms.map((palm) => ({ x: palm.x, z: palm.z, radius: 0.3 })),
];

export const desertFortModel: NewLandAttractionModel = {
  kind: "desert-fort",
  islandId: "sunscorch-sands",
  name: "Desert Fort",
  fact: "The Ancient Egyptians built mighty forts of mud brick along the River Nile, to guard their southern border. The fort at Buhen had thick walls with towers, narrow slits for archers and a ditch all round. Mud bricks were made from Nile mud mixed with straw, shaped in wooden moulds and baked hard in the sun.",
  curriculumLink:
    "History, Key Stage 2: the achievements of the earliest civilizations. A depth study of Ancient Egypt: how the Egyptians built and defended their land.",
  footprint: 10,
  setting: "inland",
  padColour: sands.sand,
  signSpot: { x: -2.2, z: 9.2 },
  build: buildFort,
  moving: [
    {
      name: "shaduf",
      pivot: shadufPivot,
      build: buildShaduf,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 4,
        amplitude: 0.35,
        period: 2.4,
      },
    },
    {
      name: "lookout",
      pivot: [towerAt.x - 0.2, towerTop - 1.0, towerAt.z - 0.1],
      build: buildLookout,
      motion: { kind: "rise", reach: 6, height: 1.0, period: 1.8 },
    },
    {
      name: "flag",
      pivot: [gateHalf + 0.55, gateTowerTop + 1.45, outer - 0.15],
      build: buildFlag,
      motion: { kind: "swing", axis: "y", amplitude: 0.45, period: 3.4 },
    },
  ],
  wanderers: [
    {
      name: "soldiers",
      build: buildSoldier,
      count: 2,
      centre: { x: -0.2, z: 0.2 },
      radius: 0.9,
      speed: 0.3,
    },
    {
      name: "camels",
      build: buildCamel,
      count: 2,
      centre: { x: -7.2, z: -1.0 },
      radius: 1.1,
      speed: 0.2,
    },
  ],
  smoke: [
    {
      at: [ovenAt.x, 0.75, ovenAt.z],
      colour: "#d9d4cc",
      puffs: 6,
      size: 0.2,
      rise: 2.2,
      spread: 0.4,
    },
  ],
  blockers,
  decks: [wallDeck, stairDeck, barracksDeck],
  rides: [
    {
      id: "zip-wire",
      name: "the zip wire",
      start: zipStart,
      reach: 0.6,
      seconds: 11,
      finish: zipFinish,
      follow: followZip,
    },
  ],
  play: {
    label: "Sound the alarm",
    news: "Toot-toot! The lookout blew his horn, the archers ran up onto the walls, and the great wooden gates creaked as the guards got ready to close them.",
    tune: [62, 69, 62, 69, 74],
  },
};
