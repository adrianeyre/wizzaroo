import { SphereGeometry } from "three";
import {
  addBench,
  addLampPost,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const frame = "#e8ecef";
const frameDark = "#9aa7b0";
const glassTint = "#a9d8d0";
const plinth = "#c9c3b6";
const paving = "#d8d0bd";
const soil = "#5b4129";
const rock = "#8a8576";
const rockDark = "#66625a";
const pool = "#3f9fae";
const plank = "#b98a58";
const rail = "#6d4c2f";
const leafDeep = "#1f6428";
const leafMid = "#2f8a35";
const leafBright = "#5bb544";
const banana = "#69b84a";
const trunk = "#6b4f3a";
const flowerRed = "#e23b2e";
const flowerPink = "#e86fb8";
const flowerYellow = "#f6c531";
const macawRed = "#d8261f";
const macawBlue = "#2a6fd1";
const macawYellow = "#f5c518";
const owlOrange = "#e88a2c";
const signColour = "#2c7a6a";

/* The great glass dome, with its door at the front */
const domeZ = -0.8;
const domeRadius = 5.6;
const doorTop = 2.5;
const doorAngle = 0.21;
const bandTheta = Math.acos(doorTop / domeRadius);

/* The treetop walkway: a horseshoe round the back, up one side and down the other */
const walkRadius = 3.2;
const walkHeight = 2.6;
const walkHalf = 0.45;
const footAngle = 0.62;
const climbAngle = 1.75;
const walkFrom = -footAngle;
const walkTo = -(Math.PI * 2 - footAngle);

const onRing = (angle: number, radius = walkRadius): [number, number] => [
  Math.sin(angle) * radius,
  domeZ + Math.cos(angle) * radius,
];

/** How high the walkway is at an angle round the ring. */
const walkHeightAt = (angle: number): number => {
  const along = walkFrom - angle;
  const total = walkFrom - walkTo;
  const climb = climbAngle - footAngle;
  if (along < climb) {
    return walkHeight * Math.max(0, along / climb);
  }
  if (along > total - climb) {
    return walkHeight * Math.max(0, (total - along) / climb);
  }
  return walkHeight;
};

const walkStart = { x: -1.25, z: 2.75 };
const walkFinish = { x: 1.25, z: 2.75 };

const poolAt = { x: 0, z: -3.1 };
const poolRadius = 1.25;
const fallZ = -4.45;
const fallTop = 3.15;
const tankAt = { x: 0, z: -0.2 };
const signAt = { x: 2.3, z: 8.4 };

/* -------------------------------------------------------------- */
/* The dome                                                         */
/* -------------------------------------------------------------- */

/** A piece of the dome's glass, between two angles down from the top. */
const addGlass = (
  builder: AttractionBuilder,
  thetaFrom: number,
  thetaTo: number,
  phiFrom: number,
  phiLength: number,
  around: number,
  down: number,
) => {
  builder.add(
    "glass",
    glassTint,
    new SphereGeometry(
      domeRadius,
      builder.segments(around, Math.max(6, Math.round(around / 3))),
      builder.segments(down, 2),
      phiFrom,
      phiLength,
      thetaFrom,
      thetaTo - thetaFrom,
    ),
    { at: [0, 0, domeZ] },
  );
};

/** A point on the dome, `angle` round from the front and `height` up. */
const onDome = (angle: number, height: number, inset = 0): Triple => {
  const radius = Math.sqrt(Math.max(0, domeRadius ** 2 - height ** 2)) - inset;
  return [Math.sin(angle) * radius, height, domeZ + Math.cos(angle) * radius];
};

const buildDome = (builder: AttractionBuilder) => {
  /* Three's sphere puts +z at a quarter turn round, so the door gap sits there */
  addGlass(builder, 0, bandTheta, 0, Math.PI * 2, 32, 5);
  addGlass(
    builder,
    bandTheta,
    Math.PI / 2,
    Math.PI / 2 + doorAngle,
    Math.PI * 2 - doorAngle * 2,
    30,
    3,
  );
  /* Ribs from the plinth up to the crown */
  const ribs = 12;
  const pieces = builder.isFar ? 3 : 4;
  for (let rib = 0; rib < ribs; rib++) {
    const angle = ((rib + 0.5) / ribs) * Math.PI * 2;
    for (let piece = 0; piece < pieces; piece++) {
      const from = (piece / pieces) * (domeRadius - 0.6);
      const to = ((piece + 1) / pieces) * (domeRadius - 0.6);
      builder.bar(
        "metal",
        frame,
        onDome(angle, from, -0.03),
        onDome(angle, to, -0.03),
        0.09,
        builder.isFar ? 4 : 5,
      );
    }
  }
  /* Rings round the dome, and a hexagon pattern of thin bars between them */
  const rings = builder.isFar ? [doorTop, 4.4] : [doorTop, 3.9, 5.0];
  rings.forEach((height) => {
    const [, , z] = onDome(0, height);
    builder.torus(
      "metal",
      frame,
      z - domeZ + 0.03,
      0.045,
      [0, height, domeZ],
      "y",
      builder.isFar ? 16 : 28,
    );
  });
  if (!builder.isFar) {
    for (let rib = 0; rib < ribs; rib++) {
      const angle = ((rib + 0.5) / ribs) * Math.PI * 2;
      const next = ((rib + 1.5) / ribs) * Math.PI * 2;
      const half = (angle + next) / 2;
      builder.bar(
        "metal",
        frameDark,
        onDome(angle, doorTop, -0.02),
        onDome(half, 3.05, -0.02),
        0.035,
        4,
      );
      builder.bar(
        "metal",
        frameDark,
        onDome(half, 3.05, -0.02),
        onDome(next, doorTop, -0.02),
        0.035,
        4,
      );
      if (Math.abs(Math.sin(half)) > 0.2 || Math.cos(half) < 0) {
        builder.bar(
          "metal",
          frameDark,
          onDome(angle, 0.05, -0.02),
          onDome(half, 1.25, -0.02),
          0.035,
          4,
        );
        builder.bar(
          "metal",
          frameDark,
          onDome(half, 1.25, -0.02),
          onDome(next, 0.05, -0.02),
          0.035,
          4,
        );
      }
    }
  }
  /* The plinth: a low wall of pale stone round the foot, open at the door */
  const blocks = builder.isFar ? 12 : 28;
  for (let block = 0; block < blocks; block++) {
    const angle = ((block + 0.5) / blocks) * Math.PI * 2;
    if (
      Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) <
      doorAngle + 0.09
    ) {
      continue;
    }
    const [x, , z] = onDome(angle, 0, -0.05);
    builder.box(
      "matte",
      plinth,
      [(Math.PI * 2 * domeRadius) / blocks + 0.05, 0.4, 0.4],
      [x, 0.2, z],
      [0, angle, 0],
    );
  }
  /* The crown: a vent ring for the warm air to rise out of */
  builder.cylinder("metal", frame, {
    radius: 0.75,
    length: 0.3,
    at: [0, domeRadius - 0.05, domeZ],
    segments: 20,
  });
  builder.cylinder("glass", glassTint, {
    radius: 0.6,
    radiusEnd: 0.1,
    length: 0.5,
    at: [0, domeRadius + 0.35, domeZ],
    segments: 16,
  });
};

const buildPorch = (builder: AttractionBuilder) => {
  const from = domeZ + domeRadius - 0.4;
  const to = domeZ + domeRadius + 1.1;
  const length = to - from;
  const middle = (from + to) / 2;
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      glassTint,
      [0.06, 2.1, length],
      [side * 1.22, 1.25, middle],
    );
    builder.box("metal", frame, [0.12, 2.5, 0.12], [side * 1.22, 1.25, to]);
    builder.box(
      "metal",
      frame,
      [0.12, 0.12, length],
      [side * 1.22, 2.42, middle],
    );
    builder.box(
      "matte",
      plinth,
      [0.2, 0.25, length],
      [side * 1.22, 0.12, middle],
    );
  });
  builder.box(
    "glass",
    glassTint,
    [2.55, 0.06, length + 0.2],
    [0, 2.55, middle],
  );
  builder.box("metal", frame, [2.65, 0.16, 0.16], [0, 2.5, to]);
  if (builder.isFar) {
    return;
  }
  /* Its name across the top, and the doors slid open */
  builder.box("paint", signColour, [1.8, 0.32, 0.06], [0, 2.82, to + 0.02]);
  for (let letter = 0; letter < 7; letter++) {
    builder.box(
      "paint",
      palette.cream,
      [0.14, 0.16, 0.02],
      [-0.66 + letter * 0.22, 2.82, to + 0.06],
    );
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      glassTint,
      [0.38, 2.1, 0.04],
      [side * 0.98, 1.1, to - 0.1],
    );
    builder.box(
      "metal",
      frameDark,
      [0.04, 2.1, 0.06],
      [side * 0.79, 1.1, to - 0.1],
    );
  });
  builder.box("matte", "#3d3f42", [1.6, 0.02, 1.0], [0, 0.03, to + 0.3]);
};

/* -------------------------------------------------------------- */
/* Inside: the walkway, the waterfall and the plants               */
/* -------------------------------------------------------------- */

const buildWalkway = (builder: AttractionBuilder) => {
  const pieces = builder.isFar ? 10 : 18;
  for (let piece = 0; piece < pieces; piece++) {
    const from = walkFrom + ((walkTo - walkFrom) * piece) / pieces;
    const to = walkFrom + ((walkTo - walkFrom) * (piece + 1)) / pieces;
    const middle = (from + to) / 2;
    const [fromX, fromZ] = onRing(from);
    const [toX, toZ] = onRing(to);
    const fromY = walkHeightAt(from);
    const toY = walkHeightAt(to);
    const length = Math.hypot(toX - fromX, toZ - fromZ, toY - fromY);
    const [x, z] = onRing(middle);
    const slope = Math.atan2(toY - fromY, Math.hypot(toX - fromX, toZ - fromZ));
    builder.box(
      "matte",
      piece % 2 === 0 ? plank : shade(plank, 0.9),
      [walkHalf * 2, 0.08, length + 0.04],
      [x, (fromY + toY) / 2 - 0.04, z],
      [slope, middle + Math.PI / 2, 0],
    );
    if (builder.isFar) {
      continue;
    }
    /* Handrails on both sides, posts at every other piece */
    [-1, 1].forEach((side) => {
      const radius = walkRadius + side * walkHalf;
      const [railFromX, railFromZ] = onRing(from, radius);
      const [railToX, railToZ] = onRing(to, radius);
      builder.bar(
        "matte",
        rail,
        [railFromX, fromY + 0.85, railFromZ],
        [railToX, toY + 0.85, railToZ],
        0.05,
        5,
      );
      if (piece % 2 === 0) {
        builder.bar(
          "matte",
          rail,
          [railFromX, Math.max(0, fromY - 0.08), railFromZ],
          [railFromX, fromY + 0.88, railFromZ],
          0.06,
          4,
        );
      }
    });
    /* Stilts down to the floor where the walkway is high */
    if (piece % 3 === 1 && fromY > 0.8) {
      [-1, 1].forEach((side) => {
        const [stiltX, stiltZ] = onRing(
          middle,
          walkRadius + side * (walkHalf - 0.05),
        );
        builder.cylinder("metal", palette.darkSteel, {
          radius: 0.07,
          length: (fromY + toY) / 2,
          at: [stiltX, (fromY + toY) / 4, stiltZ],
          segments: 6,
        });
      });
    }
  }
};

const buildWaterfall = (builder: AttractionBuilder) => {
  /* A cliff of mossy boulders at the back */
  const boulders: [number, number, number, number][] = [
    [-1.1, 0.6, fallZ - 0.3, 1.1],
    [1.2, 0.7, fallZ - 0.25, 1.0],
    [-0.7, 1.9, fallZ - 0.5, 0.95],
    [0.8, 2.0, fallZ - 0.45, 0.9],
    [0, 2.9, fallZ - 0.55, 0.85],
    [-1.9, 1.3, fallZ + 0.1, 0.7],
    [1.9, 1.5, fallZ + 0.15, 0.7],
  ];
  boulders.forEach(([x, y, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? rock : rockDark,
      size,
      [x, y, z],
      [1.15, 0.9, 0.8],
      builder.isFar ? 6 : 8,
    );
  });
  /* The water falls in a sheet, foaming into the pool */
  builder.box(
    "water",
    "#9fe0ea",
    [0.75, fallTop, 0.06],
    [0, fallTop / 2, fallZ + 0.42],
  );
  builder.cylinder("matte", soil, {
    radius: poolRadius + 0.25,
    length: 0.05,
    at: [poolAt.x, 0.025, poolAt.z],
    segments: 18,
  });
  builder.cylinder("water", pool, {
    radius: poolRadius,
    length: 0.06,
    at: [poolAt.x, 0.06, poolAt.z],
    segments: builder.segments(22, 10),
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "water",
    "#c9f0f4",
    [0.55, fallTop - 0.2, 0.05],
    [0.05, fallTop / 2 - 0.1, fallZ + 0.47],
  );
  [-0.25, 0, 0.25].forEach((x, index) => {
    builder.sphere(
      "water",
      palette.white,
      0.22 - index * 0.03,
      [x, 0.12, fallZ + 0.55],
      [1.2, 0.6, 1],
      8,
    );
  });
  /* Stones round the pool, and giant water lily pads */
  for (let stone = 0; stone < 11; stone++) {
    const angle = (stone / 11) * Math.PI * 2;
    builder.sphere(
      "matte",
      stone % 2 === 0 ? rock : rockDark,
      0.17 + (stone % 3) * 0.04,
      [
        poolAt.x + Math.sin(angle) * (poolRadius + 0.1),
        0.06,
        poolAt.z + Math.cos(angle) * (poolRadius + 0.1),
      ],
      [1.3, 0.55, 1],
      6,
    );
  }
  [
    [-0.55, 0.3, 0.42],
    [0.5, 0.45, 0.36],
    [0.2, -0.3, 0.3],
  ].forEach(([dx, dz, radius]) => {
    builder.cylinder("paint", leafBright, {
      radius,
      length: 0.03,
      at: [poolAt.x + dx, 0.1, poolAt.z + dz],
      segments: 14,
    });
    builder.torus(
      "paint",
      "#b8402e",
      radius,
      0.025,
      [poolAt.x + dx, 0.12, poolAt.z + dz],
      "y",
      14,
    );
  });
  builder.sphere(
    "paint",
    "#f7e8f0",
    0.1,
    [poolAt.x - 0.55, 0.18, poolAt.z + 0.3],
    [1, 0.7, 1],
    8,
  );
  /* Ferns and orchids on the cliff */
  [
    [-1.4, 1.5, fallZ + 0.6],
    [1.5, 1.6, fallZ + 0.6],
    [-0.6, 2.6, fallZ + 0.2],
    [0.9, 2.7, fallZ + 0.2],
  ].forEach(([x, y, z], index) => {
    for (let frond = 0; frond < 5; frond++) {
      const angle = frond * 1.25 + index;
      builder.box(
        "matte",
        frond % 2 === 0 ? leafMid : leafBright,
        [0.14, 0.02, 0.5],
        [x + Math.sin(angle) * 0.2, y, z + Math.cos(angle) * 0.2],
        [-0.5, angle, 0],
      );
    }
    builder.sphere(
      "paint",
      index % 2 === 0 ? flowerPink : flowerYellow,
      0.07,
      [x, y + 0.15, z + 0.1],
      [1, 0.8, 0.6],
      6,
    );
  });
};

/** A banana plant: a soft stem and big paddle leaves. */
const addBanana = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  height: number,
) => {
  builder.cylinder("matte", "#7a9a44", {
    radius: 0.12,
    radiusEnd: 0.09,
    length: height,
    at: [x, height / 2, z],
    segments: 8,
  });
  const leaves = builder.isFar ? 3 : 6;
  for (let leaf = 0; leaf < leaves; leaf++) {
    const angle = (leaf / leaves) * Math.PI * 2 + x;
    builder.box(
      "matte",
      leaf % 2 === 0 ? banana : shade(banana, 0.85),
      [0.38, 0.03, 1.3],
      [x + Math.sin(angle) * 0.55, height + 0.15, z + Math.cos(angle) * 0.55],
      [0.5, angle, 0],
    );
  }
  if (!builder.isFar) {
    builder.sphere(
      "paint",
      "#8c2a4a",
      0.12,
      [x + 0.15, height - 0.35, z],
      [0.8, 1.5, 0.8],
      7,
    );
    for (let hand = 0; hand < 3; hand++) {
      builder.box(
        "paint",
        "#9cc24a",
        [0.2, 0.08, 0.12],
        [x + 0.14, height - 0.1 - hand * 0.12, z],
        [0, hand, 0],
      );
    }
  }
};

/** A monstera: big split leaves on long stalks. */
const addMonstera = (builder: AttractionBuilder, x: number, z: number) => {
  const leaves = builder.isFar ? 2 : 4;
  for (let leaf = 0; leaf < leaves; leaf++) {
    const angle = (leaf / leaves) * Math.PI * 2 + z;
    const tip: Triple = [
      x + Math.sin(angle) * 0.6,
      0.75 + (leaf % 2) * 0.25,
      z + Math.cos(angle) * 0.6,
    ];
    if (!builder.isFar) {
      builder.bar("matte", leafMid, [x, 0, z], tip, 0.04, 4);
    }
    builder.sphere(
      "matte",
      leaf % 2 === 0 ? leafDeep : leafMid,
      0.36,
      tip,
      [1, 0.12, 1.25],
      6,
    );
  }
};

const buildCentralTree = (builder: AttractionBuilder) => {
  const at = { x: -0.9, z: 0.0 };
  builder.lathe(
    "matte",
    trunk,
    [
      [0.5, 0],
      [0.32, 0.4],
      [0.26, 1.6],
      [0.22, 3.3],
      [0, 3.5],
    ],
    [at.x, 0, at.z],
    "y",
    builder.isFar ? 6 : 12,
  );
  builder.sphere(
    "matte",
    leafMid,
    1.5,
    [at.x, 3.9, at.z],
    [1.1, 0.6, 1.1],
    builder.isFar ? 8 : 12,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    leafDeep,
    1.0,
    [at.x + 1.0, 3.5, at.z - 0.6],
    [1, 0.6, 1],
    10,
  );
  builder.sphere(
    "matte",
    leafBright,
    0.9,
    [at.x - 0.9, 3.6, at.z + 0.5],
    [1, 0.6, 1],
    10,
  );
  [0.5, 2.6, 4.4].forEach((angle) => {
    builder.bar(
      "matte",
      trunk,
      [at.x, 2.4, at.z],
      [at.x + Math.sin(angle) * 1.1, 3.4, at.z + Math.cos(angle) * 1.1],
      0.14,
      6,
    );
  });
  /* Orchids and a bromeliad perched on the trunk */
  [
    [0.3, 1.4, flowerPink],
    [2.2, 2.0, flowerYellow],
    [4.0, 1.1, flowerPink],
  ].forEach(([angle, height, colour]) => {
    const a = Number(angle);
    builder.sphere(
      "paint",
      String(colour),
      0.09,
      [at.x + Math.sin(a) * 0.3, Number(height), at.z + Math.cos(a) * 0.3],
      [1, 0.8, 0.6],
      6,
    );
  });
};

const buildPlanting = (builder: AttractionBuilder) => {
  builder.cylinder("matte", soil, {
    radius: domeRadius - 0.25,
    length: 0.03,
    at: [0, 0.02, domeZ],
    segments: builder.segments(32, 12),
  });
  /* A path of pale gravel from the door to the pool */
  builder.box("matte", paving, [1.5, 0.03, 4.6], [0, 0.04, domeZ + 3.0]);
  builder.cylinder("matte", paving, {
    radius: 1.4,
    length: 0.03,
    at: [0.6, 0.04, -1.3],
    segments: 16,
  });
  buildCentralTree(builder);
  addBanana(builder, -3.6, -2.4, 2.3);
  addBanana(builder, 3.7, -2.0, 2.4);
  addBanana(builder, -2.2, -4.6, 2.0);
  addBanana(builder, 2.4, -4.5, 2.1);
  addMonstera(builder, -3.9, 1.0);
  addMonstera(builder, 3.9, 1.2);
  addMonstera(builder, -3.4, 2.3);
  addMonstera(builder, 3.4, 2.4);
  if (builder.isFar) {
    return;
  }
  /* Heliconias, ginger lilies and bromeliads in the beds */
  [
    [-4.4, -0.6],
    [4.5, -0.4],
    [-1.6, -2.1],
    [2.0, -2.4],
    [-3.2, 2.2],
    [3.3, 2.3],
  ].forEach(([x, z], index) => {
    builder.bar("matte", leafMid, [x, 0, z], [x, 0.9, z], 0.03, 4);
    for (let bract = 0; bract < 3; bract++) {
      builder.cylinder("paint", index % 2 === 0 ? flowerRed : flowerYellow, {
        radius: 0.05,
        radiusEnd: 0.005,
        length: 0.2,
        at: [x + (bract % 2 === 0 ? 0.08 : -0.08), 0.55 + bract * 0.12, z],
        axis: "x",
        segments: 5,
      });
    }
    [0.4, 2.5, 4.6].forEach((angle) => {
      builder.box(
        "matte",
        leafBright,
        [0.18, 0.7, 0.02],
        [x + Math.sin(angle) * 0.15, 0.38, z + Math.cos(angle) * 0.15],
        [0.25, angle, 0.2],
      );
    });
  });
  /* A thermometer that says how hot and steamy it is */
  builder.box(
    "paint",
    palette.white,
    [0.3, 0.8, 0.06],
    [-2.3, 1.0, 3.1],
    [0, 0.5, 0],
  );
  builder.box(
    "glow",
    flowerRed,
    [0.06, 0.5, 0.02],
    [-2.28, 0.98, 3.14],
    [0, 0.5, 0],
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.03,
    length: 0.6,
    at: [-2.3, 0.3, 3.1],
    segments: 6,
  });
};

/* -------------------------------------------------------------- */
/* Outside                                                          */
/* -------------------------------------------------------------- */

const buildPlaza = (builder: AttractionBuilder) => {
  const front = domeZ + domeRadius + 1.1;
  builder.box(
    "matte",
    paving,
    [3.0, 0.04, 9.4 - front],
    [0, 0.03, (front + 9.4) / 2],
  );
  if (builder.isFar) {
    return;
  }
  for (let line = 0; line < 6; line++) {
    builder.box(
      "matte",
      shade(paving, 0.9),
      [3.0, 0.01, 0.03],
      [0, 0.055, front + 0.5 + line * 0.55],
    );
  }
  addBench(builder, [-2.5, 0, 7.0], Math.PI / 2);
  addBench(builder, [2.5, 0, 6.3], -Math.PI / 2);
  addLampPost(builder, [-1.8, 0, 8.3]);
  addLampPost(builder, [1.8, 0, 5.4]);
  /* Planters of tropical flowers by the door */
  [-1.7, 1.7].forEach((x) => {
    builder.box("matte", plinth, [0.8, 0.4, 0.8], [x, 0.2, front + 0.4]);
    builder.sphere(
      "matte",
      leafMid,
      0.4,
      [x, 0.55, front + 0.4],
      [1, 0.7, 1],
      8,
    );
    [0, 1, 2].forEach((bloom) => {
      builder.sphere(
        "paint",
        bloom === 1 ? flowerYellow : flowerRed,
        0.08,
        [x + (bloom - 1) * 0.2, 0.82, front + 0.4 + (bloom % 2) * 0.15],
        [1, 1, 1],
        6,
      );
    });
  });
  /* A board showing the water cycle: sun, cloud, rain and the sea */
  const board = { x: -3.6, z: 5.1 };
  [-0.4, 0.4].forEach((dx) => {
    builder.cylinder("paint", palette.darkSteel, {
      radius: 0.04,
      length: 1.0,
      at: [board.x + dx, 0.5, board.z],
      segments: 6,
    });
  });
  builder.box(
    "paint",
    palette.cream,
    [1.0, 0.6, 0.05],
    [board.x, 1.05, board.z],
    [-0.3, 0.5, 0],
  );
  builder.sphere(
    "glow",
    flowerYellow,
    0.08,
    [board.x - 0.3, 1.2, board.z + 0.1],
    [1, 1, 0.3],
    8,
  );
  builder.sphere(
    "paint",
    palette.white,
    0.1,
    [board.x + 0.15, 1.2, board.z + 0.05],
    [1.6, 0.8, 0.3],
    8,
  );
  builder.box(
    "paint",
    pool,
    [0.8, 0.12, 0.02],
    [board.x, 0.85, board.z + 0.1],
    [-0.3, 0.5, 0],
  );
  [0, 1, 2].forEach((drop) => {
    builder.box(
      "paint",
      macawBlue,
      [0.02, 0.1, 0.02],
      [board.x + 0.1 + drop * 0.07, 1.04, board.z + 0.12],
      [-0.3, 0.5, 0],
    );
  });
};

/* -------------------------------------------------------------- */
/* Moving parts                                                    */
/* -------------------------------------------------------------- */

const buildMisters = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.steel, {
    radius: 0.06,
    length: 0.2,
    at: [0, 0.1, 0],
    segments: 8,
  });
  [-1, 0, 1].forEach((jet) => {
    const x = jet * 0.45;
    builder.cylinder("water", "#d6f3f7", {
      radius: 0.025,
      radiusEnd: 0.16,
      length: 1.7,
      at: [x, 0.85, Math.abs(jet) * -0.2],
      segments: 8,
    });
    builder.sphere(
      "water",
      palette.white,
      0.28,
      [x, 1.75, Math.abs(jet) * -0.2],
      [1, 0.6, 1],
      8,
    );
  });
};

const fanAt: Triple = [0, domeRadius + 0.15, domeZ];

const buildFan = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.1,
    length: 0.12,
    at: [0, 0, 0],
    segments: 10,
  });
  for (let blade = 0; blade < 5; blade++) {
    const angle = (blade / 5) * Math.PI * 2;
    builder.box(
      "metal",
      frameDark,
      [0.12, 0.02, 0.5],
      [Math.sin(angle) * 0.3, 0, Math.cos(angle) * 0.3],
      [0.3, angle, 0],
    );
  }
};

const macawAt: Triple = (() => {
  const [x, z] = onRing(-2.2, walkRadius + walkHalf);
  return [x, walkHeight + 0.9, z];
})();

const buildMacaw = (builder: AttractionBuilder) => {
  builder.sphere("paint", macawRed, 0.15, [0, 0.18, 0], [0.85, 1.3, 0.9], 10);
  builder.sphere("paint", macawRed, 0.11, [0, 0.42, 0.04], [1, 1, 1], 10);
  builder.sphere(
    "paint",
    palette.white,
    0.07,
    [0, 0.42, 0.11],
    [1, 0.9, 0.6],
    8,
  );
  builder.cylinder("paint", "#3a3a3a", {
    radius: 0.045,
    radiusEnd: 0.012,
    length: 0.13,
    at: [0, 0.38, 0.17],
    axis: "z",
    segments: 6,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      macawBlue,
      [0.04, 0.24, 0.16],
      [side * 0.12, 0.16, -0.02],
      [0.2, 0, side * 0.15],
    );
    builder.box(
      "paint",
      macawYellow,
      [0.042, 0.08, 0.14],
      [side * 0.12, 0.27, 0.0],
      [0.2, 0, side * 0.15],
    );
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [side * 0.06, 0.45, 0.12],
      [1, 1, 1],
      4,
    );
  });
  builder.box(
    "paint",
    macawRed,
    [0.06, 0.03, 0.45],
    [0, -0.05, -0.25],
    [0.9, 0, 0],
  );
  builder.box(
    "paint",
    macawBlue,
    [0.05, 0.025, 0.3],
    [0, -0.2, -0.32],
    [1.1, 0, 0],
  );
};

const slothAt: Triple = [-0.1, 3.2, -0.4];

const buildSloth = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#8f7a62", 0.24, [0, -0.45, 0], [1, 1.35, 0.85], 10);
  builder.sphere(
    "matte",
    "#a08b70",
    0.15,
    [0, -0.72, 0.12],
    [1, 0.95, 0.9],
    10,
  );
  builder.sphere("matte", "#e5d5b8", 0.11, [0, -0.73, 0.2], [1, 0.8, 0.6], 8);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#4a3a2c",
      [0.07, 0.03, 0.03],
      [side * 0.05, -0.7, 0.26],
      [0, 0, side * -0.4],
    );
    builder.bar(
      "matte",
      "#8f7a62",
      [side * 0.12, -0.25, 0],
      [side * 0.08, 0, 0],
      0.08,
      5,
    );
    builder.bar(
      "matte",
      "#8f7a62",
      [side * 0.12, -0.6, -0.05],
      [side * 0.1, 0, -0.1],
      0.08,
      5,
    );
  });
  builder.sphere("matte", "#4a3a2c", 0.02, [0, -0.76, 0.3], [1.4, 1, 1], 4);
};

const buildOwlButterfly = (builder: AttractionBuilder) => {
  builder.box("matte", palette.black, [0.03, 0.03, 0.13], [0, 0, 0]);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      owlOrange,
      [0.14, 0.01, 0.12],
      [side * 0.08, 0.02, 0.02],
      [0, 0, side * 0.35],
    );
    builder.box(
      "glow",
      macawBlue,
      [0.06, 0.012, 0.05],
      [side * 0.1, 0.03, -0.01],
      [0, 0, side * 0.35],
    );
  });
};

/* -------------------------------------------------------------- */
/* The ride                                                         */
/* -------------------------------------------------------------- */

const treetopWalk = (progress: number): LocalSpot => {
  const [footX, footZ] = onRing(walkFrom);
  const [endX, endZ] = onRing(walkTo);
  if (progress < 0.08) {
    const share = progress / 0.08;
    return {
      x: walkStart.x + (footX - walkStart.x) * share,
      y: 0,
      z: walkStart.z + (footZ - walkStart.z) * share,
      heading: Math.atan2(footX - walkStart.x, footZ - walkStart.z),
    };
  }
  if (progress > 0.92) {
    const share = (progress - 0.92) / 0.08;
    return {
      x: endX + (walkFinish.x - endX) * share,
      y: 0,
      z: endZ + (walkFinish.z - endZ) * share,
      heading: Math.atan2(walkFinish.x - endX, walkFinish.z - endZ),
    };
  }
  const share = (progress - 0.08) / 0.84;
  const angle = walkFrom + (walkTo - walkFrom) * share;
  const [x, z] = onRing(angle);
  return {
    x,
    y: walkHeightAt(angle) + 0.04,
    z,
    heading: angle - Math.PI / 2,
  };
};

export const rainforestBiomeModel: NewLandAttractionModel = {
  kind: "rainforest-biome",
  islandId: "jungle-reach",
  name: "Rainforest Biome",
  fact: "Inside this glass dome it is hot and steamy, just like a real rainforest. Water evaporates from the pool and the leaves, then condenses into tiny droplets on the cool glass and drips down again like rain. It is a little water cycle under glass!",
  curriculumLink:
    "Science, Year 4: states of matter. Identify the part played by evaporation and condensation in the water cycle (the biome's own rain).",
  footprint: 10,
  setting: "inland",
  signSpot: signAt,
  padColour: "#5c9a3e",
  build: (builder) => {
    buildPlanting(builder);
    buildWaterfall(builder);
    buildWalkway(builder);
    buildDome(builder);
    buildPorch(builder);
    buildPlaza(builder);
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "misting jets",
      pivot: [tankAt.x + 1.5, 0, tankAt.z - 0.9],
      build: buildMisters,
      motion: { kind: "splash", reach: 4, period: 1.3 },
    },
    {
      name: "roof fan",
      pivot: fanAt,
      build: buildFan,
      motion: { kind: "whirl", axis: "y", idle: 0.6, speed: 7, reach: 7 },
    },
    {
      name: "scarlet macaw",
      pivot: macawAt,
      build: buildMacaw,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.35,
        period: 1.0,
      },
    },
    {
      name: "sloth",
      pivot: slothAt,
      build: buildSloth,
      motion: { kind: "swing", axis: "z", amplitude: 0.12, period: 6 },
    },
  ],
  wanderers: [
    {
      name: "owl butterflies",
      build: buildOwlButterfly,
      count: 6,
      centre: { x: 0, z: domeZ },
      radius: 2.6,
      height: 1.8,
      bob: 0.35,
      speed: 0.5,
    },
  ],
  rides: [
    {
      id: "treetop-walkway",
      name: "the treetop walkway",
      start: walkStart,
      reach: 0.55,
      seconds: 16,
      finish: walkFinish,
      follow: treetopWalk,
    },
  ],
  blockers: [{ x: -0.9, z: 0, radius: 0.45 }] satisfies LocalBlocker[],
  play: {
    label: "Make it rain",
    news: "Pssssh! The misters sprayed warm rain over the plants. The water will evaporate, condense on the glass and fall again: a water cycle under glass.",
  },
};
