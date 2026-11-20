import { ConeGeometry } from "three";
import {
  addBench,
  addDoor,
  addGableRoof,
  addLampPost,
  addSignBoard,
  addWindow,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addBasaltColumns,
  addLifeguardChair,
  addRedHotPokers,
  addSweep,
  craterFloor,
  findStairSpot,
  findVolcanoRadius,
  flumeColours as colours,
  flumeCurve,
  flumeEnd,
  poolAt,
  poolRadius,
  poolRim,
  poolWater,
  stairFrom,
  stairSteps,
  stairSweep,
  stairWidth,
  volcanoAt,
  volcanoProfile,
} from "./lava-flume-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const boothAt = { x: -6.3, z: 1.6 };
const signAt = { x: -2.0, z: 7.6 };
const dragonAt: Triple = [poolAt.x + 2.32, 0.88, poolAt.z];
const rideStart = { x: -1.37, z: -0.62 };
const rideFinish = { x: 2.6, z: 5.15 };

/* ------------------------------------------------------------------ */
/* The volcano                                                         */
/* ------------------------------------------------------------------ */

const buildVolcano = (builder: AttractionBuilder) => {
  const { x, z } = volcanoAt;
  builder.lathe(
    "matte",
    colours.basalt,
    [
      ...volcanoProfile,
      [0.95, 3.52],
      [0.85, craterFloor],
      [0.52, craterFloor],
      [0.48, craterFloor - 0.08],
      [0, craterFloor - 0.08],
    ],
    [x, 0, z],
    "y",
    builder.segments(28, 14),
  );
  builder.cylinder("glow", colours.lava, {
    radius: 0.48,
    length: 0.04,
    at: [x, craterFloor - 0.06, z],
    segments: 18,
  });
  builder.cylinder("water", colours.lavaWater, {
    radius: 0.5,
    length: 0.02,
    at: [x, craterFloor - 0.02, z],
    segments: 18,
  });
  builder.torus(
    "matte",
    colours.basaltEdge,
    1.02,
    0.07,
    [x, 3.5, z],
    "y",
    builder.segments(24, 12),
  );
  /* Glowing lava streaks down the side the stair leaves free */
  [1.0, 2.2, 2.5].forEach((angle, streak) => {
    const out = (index: number): Triple => {
      const [radius, height] = volcanoProfile[index];
      return [
        x + Math.sin(angle) * (radius + 0.03),
        height,
        z + Math.cos(angle) * (radius + 0.03),
      ];
    };
    const first = streak % 2 === 0 ? 1 : 2;
    if (builder.isFar) {
      builder.bar("glow", colours.lava, out(first), out(5), 0.12, 4);
    }
    for (
      let index = first;
      index < volcanoProfile.length - 1 && !builder.isFar;
      index++
    ) {
      builder.bar(
        "glow",
        index % 2 === 0 ? colours.lava : colours.lavaDeep,
        out(index),
        out(index + 1),
        0.13 - index * 0.012,
        6,
      );
    }
    builder.sphere(
      "glow",
      colours.lavaDeep,
      0.3,
      [x + Math.sin(angle) * 2.55, 0.02, z + Math.cos(angle) * 2.55],
      [1.2, 0.12, 1],
      8,
    );
  });
  if (!builder.isFar) {
    /* Knobbly lumps of cooled lava on the slopes */
    for (let lump = 0; lump < 5; lump++) {
      const angle = lump * 2.4 + 0.3;
      const height = 0.3 + ((lump * 0.73) % 2.6);
      const radius = findVolcanoRadius(height);
      builder.sphere(
        "matte",
        lump % 2 === 0 ? colours.basaltEdge : colours.basaltLight,
        0.16 + (lump % 3) * 0.05,
        [x + Math.sin(angle) * radius, height, z + Math.cos(angle) * radius],
        [1.2, 0.7, 1],
        6,
      );
    }
  }
  /* The starting gate on the crater rim, square across the trough */
  const start = flumeCurve.getPointAt(0.03);
  const along = flumeCurve.getTangentAt(0.03);
  const turn = Math.atan2(along.x, along.z);
  const across = (distance: number, up: number, ahead = 0): Triple => [
    start.x + Math.cos(turn) * distance + Math.sin(turn) * ahead,
    craterFloor + up,
    start.z - Math.sin(turn) * distance + Math.cos(turn) * ahead,
  ];
  [-0.6, 0.6].forEach((side) => {
    builder.cylinder("metal", colours.bronze, {
      radius: 0.06,
      length: 1.75,
      at: across(side, 0.87),
      segments: 8,
    });
    builder.sphere(
      "glow",
      colours.lavaWhite,
      0.09,
      across(side, 1.8),
      [1, 1, 1],
      10,
    );
  });
  builder.box("paint", colours.lavaDeep, [1.32, 0.36, 0.12], across(0, 1.6), [
    0,
    turn,
    0,
  ]);
  builder.box(
    "glow",
    colours.lavaWhite,
    [1.0, 0.08, 0.02],
    across(0, 1.66, -0.07),
    [0, turn, 0],
  );
  builder.box(
    "glow",
    colours.lavaWhite,
    [0.7, 0.06, 0.02],
    across(0, 1.52, -0.07),
    [0, turn, 0],
  );
};

const buildStair = (builder: AttractionBuilder) => {
  const { x, z } = volcanoAt;
  const steps = builder.isFar ? 8 : stairSteps;
  for (let step = 0; step < steps; step++) {
    const middle = (step + 0.5) / steps;
    const top = ((step + 1) / steps) * craterFloor;
    const angle = stairFrom - middle * stairSweep;
    const inner = findVolcanoRadius(top) - 0.15;
    const outer = findVolcanoRadius(top) + stairWidth;
    const centre = (inner + outer) / 2;
    const length = ((outer + inner) / 2) * (stairSweep / steps) * 1.1;
    const at = (radius: number, y: number): Triple => [
      x + Math.sin(angle) * radius,
      y,
      z + Math.cos(angle) * radius,
    ];
    builder.box(
      "matte",
      step % 2 === 0 ? colours.basaltEdge : shade(colours.basaltEdge, 0.9),
      [length, top, outer - inner],
      at(centre, top / 2),
      [0, angle, 0],
    );
    if (builder.isFar) {
      continue;
    }
    builder.box(
      "paint",
      colours.ash,
      [length + 0.02, 0.05, outer - inner + 0.04],
      at(centre, top - 0.02),
      [0, angle, 0],
    );
    if (step % 2 === 0) {
      builder.box(
        "glow",
        colours.lava,
        [length * 0.8, 0.03, 0.05],
        at(outer + 0.01, top - 0.06),
        [0, angle, 0],
      );
    }
  }
  if (builder.isFar) {
    return;
  }
  /* A bronze handrail up the outside edge */
  const posts = 8;
  let last: Triple | undefined;
  for (let post = 0; post <= posts; post++) {
    const share = post / posts;
    const spot = findStairSpot(share, stairWidth - 0.08);
    const y = Math.max(0.05, share * craterFloor);
    const foot: Triple = [spot.x, y, spot.z];
    const head: Triple = [spot.x, y + 0.85, spot.z];
    builder.bar("metal", colours.bronze, foot, head, 0.05, 6);
    if (last !== undefined) {
      builder.bar("metal", colours.bronze, last, head, 0.04, 6);
    }
    last = head;
  }
};

/* ------------------------------------------------------------------ */
/* The flume                                                           */
/* ------------------------------------------------------------------ */

const shellSection: readonly (readonly [number, number])[] = [
  [-0.34, 0.4],
  [-0.44, 0.4],
  [-0.44, -0.06],
  [-0.34, -0.15],
  [0.34, -0.15],
  [0.44, -0.06],
  [0.44, 0.4],
  [0.34, 0.4],
];
const liningSection: readonly (readonly [number, number])[] = [
  [0.34, 0.4],
  [0.34, 0.08],
  [0.24, 0],
  [-0.24, 0],
  [-0.34, 0.08],
  [-0.34, 0.4],
];
const lavaSection: readonly (readonly [number, number])[] = [
  [0.31, 0.12],
  [0.1, 0.15],
  [-0.1, 0.15],
  [-0.31, 0.12],
];
const bedSection: readonly (readonly [number, number])[] = [
  [0.27, 0.03],
  [-0.27, 0.03],
];
const buildFlume = (builder: AttractionBuilder) => {
  const samples = builder.isFar ? 16 : 36;
  addSweep(builder, "matte", colours.basalt, shellSection, samples);
  addSweep(builder, "paint", colours.lining, liningSection, samples);
  addSweep(builder, "water", colours.lavaWater, lavaSection, samples);
  if (!builder.isFar) {
    addSweep(builder, "glow", colours.lava, bedSection, samples);
  }
  /* Six-sided basalt columns hold the trough up */
  const supports = 11;
  for (let support = 1; support < supports; support++) {
    const share = support / supports;
    const point = flumeCurve.getPointAt(share);
    const tangent = flumeCurve.getTangentAt(share);
    const fromVolcano = Math.hypot(
      point.x - volcanoAt.x,
      point.z - volcanoAt.z,
    );
    const fromPool = Math.hypot(point.x - poolAt.x, point.z - poolAt.z);
    if (
      fromVolcano < findVolcanoRadius(point.y) + 0.5 ||
      fromPool < poolRadius + 0.4
    ) {
      continue;
    }
    const top = point.y - 0.16;
    const turn = Math.atan2(tangent.x, tangent.z);
    builder.cylinder(
      "matte",
      support % 2 === 0 ? colours.basaltEdge : colours.basalt,
      {
        radius: 0.17,
        length: top,
        at: [point.x, top / 2, point.z],
        segments: 6,
      },
    );
    builder.box(
      "metal",
      colours.bronze,
      [1.0, 0.08, 0.2],
      [point.x, top - 0.02, point.z],
      [0, turn + Math.PI / 2, 0],
    );
    if (builder.isFar) {
      continue;
    }
    builder.cylinder("metal", colours.darkBronze, {
      radius: 0.22,
      length: 0.12,
      at: [point.x, 0.06, point.z],
      segments: 6,
    });
    [-1, 1].forEach((side) => {
      builder.bar(
        "metal",
        colours.bronze,
        [point.x, Math.max(0.2, top - 0.75), point.z],
        [
          point.x + Math.cos(turn) * side * 0.45,
          top - 0.05,
          point.z - Math.sin(turn) * side * 0.45,
        ],
        0.05,
        5,
      );
    });
  }
};

/* ------------------------------------------------------------------ */
/* The splash pool                                                     */
/* ------------------------------------------------------------------ */

const buildPool = (builder: AttractionBuilder) => {
  const { x, z } = poolAt;
  const segments = builder.segments(32, 14);
  builder.lathe(
    "matte",
    colours.basalt,
    [
      [poolRadius + 0.27, 0],
      [poolRadius + 0.29, poolRim - 0.09],
      [poolRadius + 0.22, poolRim],
      [poolRadius + 0.02, poolRim],
      [poolRadius - 0.02, poolRim - 0.07],
      [poolRadius - 0.02, 0],
    ],
    [x, 0, z],
    "y",
    segments,
  );
  builder.cylinder("glow", colours.lavaDeep, {
    radius: poolRadius - 0.02,
    length: 0.04,
    at: [x, 0.03, z],
    segments,
  });
  builder.cylinder("water", colours.lavaWater, {
    radius: poolRadius - 0.01,
    length: 0.03,
    at: [x, poolWater, z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "paint",
    colours.ash,
    poolRadius + 0.12,
    0.05,
    [x, poolRim + 0.01, z],
    "y",
    28,
  );
  /* Lumps of rock round the rim */
  for (let lump = 0; lump < 9; lump++) {
    const angle = lump * 0.7 + 3.4;
    builder.sphere(
      "matte",
      lump % 2 === 0 ? colours.basaltEdge : colours.basaltLight,
      0.14 + (lump % 3) * 0.04,
      [
        x + Math.sin(angle) * (poolRadius + 0.14),
        poolRim + 0.04,
        z + Math.cos(angle) * (poolRadius + 0.14),
      ],
      [1.3, 0.6, 1],
      6,
    );
  }
  /* A bronze ladder to climb out by */
  const ladderAngle = 0.25;
  const ladderX = x + Math.sin(ladderAngle) * poolRadius;
  const ladderZ = z + Math.cos(ladderAngle) * poolRadius;
  [-0.22, 0.22].forEach((side) => {
    const sx = ladderX + Math.cos(ladderAngle) * side;
    const sz = ladderZ - Math.sin(ladderAngle) * side;
    builder.bar(
      "metal",
      colours.bronze,
      [
        sx - Math.sin(ladderAngle) * 0.12,
        0.1,
        sz - Math.cos(ladderAngle) * 0.12,
      ],
      [sx, poolRim + 0.35, sz],
      0.05,
      6,
    );
    builder.bar(
      "metal",
      colours.bronze,
      [sx, poolRim + 0.35, sz],
      [
        sx + Math.sin(ladderAngle) * 0.3,
        poolRim + 0.05,
        sz + Math.cos(ladderAngle) * 0.3,
      ],
      0.05,
      6,
    );
  });
  /* The bronze dragon's plinth */
  builder.cylinder("matte", colours.basaltEdge, {
    radius: 0.32,
    length: dragonAt[1] - 0.2,
    at: [dragonAt[0] + 0.05, (dragonAt[1] - 0.2) / 2, dragonAt[2]],
    segments: 6,
  });
  builder.cylinder("metal", colours.darkBronze, {
    radius: 0.35,
    length: 0.06,
    at: [dragonAt[0] + 0.05, dragonAt[1] - 0.2, dragonAt[2]],
    segments: 6,
  });
};

/* ------------------------------------------------------------------ */
/* The ticket booth, paths and gardens                                 */
/* ------------------------------------------------------------------ */

const buildBooth = (builder: AttractionBuilder) => {
  const { x, z } = boothAt;
  const width = 1.8;
  const depth = 1.5;
  const height = 1.6;
  builder.box(
    "matte",
    colours.basaltLight,
    [width, height, depth],
    [x, height / 2, z],
  );
  builder.box(
    "matte",
    colours.basalt,
    [width + 0.1, 0.18, depth + 0.1],
    [x, 0.09, z],
  );
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.6,
    at: [x, height, z],
    colour: colours.roofTile,
  });
  builder.box(
    "matte",
    colours.basaltLight,
    [width, 0.02, depth],
    [x, height + 0.01, z],
  );
  addWindow(builder, {
    at: [x - 0.2, 1.05, z + depth / 2 + 0.01],
    width: 0.9,
    height: 0.5,
    frame: colours.bronze,
    isLit: true,
  });
  addDoor(builder, {
    at: [x + width / 2 + 0.01, 0, z - 0.2],
    colour: colours.lavaDeep,
    frame: colours.bronze,
    turn: Math.PI / 2,
  });
  builder.box(
    "paint",
    colours.darkBronze,
    [1.1, 0.06, 0.3],
    [x - 0.2, 0.78, z + depth / 2 + 0.15],
  );
  builder.box(
    "paint",
    colours.stripe,
    [1.3, 0.3, 0.06],
    [x - 0.1, height + 0.12, z + depth / 2 + 0.12],
  );
  builder.box(
    "glow",
    colours.lava,
    [1.0, 0.07, 0.02],
    [x - 0.1, height + 0.16, z + depth / 2 + 0.16],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "glow",
    colours.lavaWhite,
    [0.7, 0.04, 0.02],
    [x - 0.1, height + 0.06, z + depth / 2 + 0.16],
  );
  /* A striped awning over the counter */
  for (let stripe = 0; stripe < 6; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? colours.lava : colours.white,
      [0.2, 0.03, 0.5],
      [x - 0.7 + stripe * 0.2, 1.45, z + depth / 2 + 0.22],
      [0.45, 0, 0],
    );
  }
  /* Rubber rings stacked on a post, and towels drying on a rail */
  const stackX = x - 1.25;
  const stackZ = z + 0.9;
  builder.cylinder("paint", colours.darkBronze, {
    radius: 0.04,
    length: 1.1,
    at: [stackX, 0.55, stackZ],
    segments: 6,
  });
  [0.12].forEach((up, ring) => {
    builder.torus(
      "paint",
      ring % 2 === 0 ? colours.lava : colours.towelYellow,
      0.26,
      0.09,
      [stackX, up, stackZ],
      "y",
      12,
    );
  });
  const railZ = z + 1.75;
  [-0.7, 0.7].forEach((side) => {
    builder.cylinder("metal", colours.bronze, {
      radius: 0.03,
      length: 0.95,
      at: [x + side, 0.47, railZ],
      segments: 6,
    });
  });
  builder.cylinder("metal", colours.bronze, {
    radius: 0.025,
    length: 1.45,
    at: [x, 0.92, railZ],
    axis: "x",
    segments: 6,
  });
  [colours.towelBlue, colours.lavaDeep, colours.towelYellow].forEach(
    (colour, towel) => {
      builder.box(
        "matte",
        colour,
        [0.36, 0.55, 0.03],
        [x - 0.45 + towel * 0.45, 0.68, railZ + 0.02],
      );
      builder.box(
        "matte",
        colours.white,
        [0.36, 0.05, 0.035],
        [x - 0.45 + towel * 0.45, 0.5, railZ + 0.02],
      );
    },
  );
};

const listLine = (
  from: { x: number; z: number },
  to: { x: number; z: number },
  spacing: number,
): { x: number; z: number; turn: number }[] => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const count = Math.max(1, Math.round(length / spacing));
  const turn = Math.atan2(to.x - from.x, to.z - from.z);
  return Array.from({ length: count + 1 }, (_, index) => ({
    x: from.x + ((to.x - from.x) * index) / count,
    z: from.z + ((to.z - from.z) * index) / count,
    turn,
  }));
};

const paths: [{ x: number; z: number }, { x: number; z: number }][] = [
  [
    { x: signAt.x, z: signAt.z - 0.4 },
    { x: rideStart.x - 0.1, z: rideStart.z + 0.5 },
  ],
  [
    { x: -1.8, z: 4.3 },
    { x: rideFinish.x, z: rideFinish.z + 0.4 },
  ],
];

const buildGrounds = (builder: AttractionBuilder) => {
  paths.forEach(([from, to]) => {
    if (builder.isFar) {
      const length = Math.hypot(to.x - from.x, to.z - from.z);
      builder.box(
        "matte",
        colours.ash,
        [0.8, 0.04, length],
        [(from.x + to.x) / 2, 0.02, (from.z + to.z) / 2],
        [0, Math.atan2(to.x - from.x, to.z - from.z), 0],
      );
      return;
    }
    listLine(from, to, 0.62).forEach(({ x, z, turn }, index) => {
      builder.box(
        "matte",
        index % 3 === 0 ? colours.ash : shade(colours.ash, 0.9),
        [0.78, 0.05, 0.5],
        [x + (index % 2 === 0 ? 0.06 : -0.06), 0.025, z],
        [0, turn + (index % 3) * 0.08, 0],
      );
    });
  });
  if (!builder.isFar) {
    /* Glowing cracks in the ashy ground */
    const cracks: [number, number][][] = [
      [
        [-6.0, -1.2],
        [-5.4, -0.6],
        [-5.6, 0.1],
        [-5.0, 0.6],
      ],
      [
        [0.2, -5.6],
        [0.9, -6.1],
        [1.5, -5.8],
        [2.2, -6.4],
      ],
      [
        [-4.2, 3.2],
        [-3.6, 3.5],
        [-3.8, 4.1],
      ],
      [
        [6.2, -1.4],
        [6.8, -1.0],
        [7.2, -1.6],
      ],
    ];
    cracks.forEach((crack) => {
      for (let index = 1; index < crack.length; index++) {
        const [fromX, fromZ] = crack[index - 1];
        const [toX, toZ] = crack[index];
        builder.bar(
          "glow",
          index % 2 === 0 ? colours.lava : colours.lavaDeep,
          [fromX, 0.01, fromZ],
          [toX, 0.01, toZ],
          0.07,
          4,
        );
      }
    });
  }
  buildBooth(builder);
  addLifeguardChair(builder, [6.4, 0, 3.9]);
  addBasaltColumns(builder, [-7.1, 0, -4.4], [1.4, 1.0, 0.7, 1.2, 0.5]);
  addBasaltColumns(builder, [5.0, 0, -5.9], [0.9, 1.3, 0.6, 0.4]);
  addSignBoard(builder, [signAt.x, 0, signAt.z], colours.lavaDeep);
  if (builder.isFar) {
    return;
  }
  addBench(builder, [0.5, 0, 7.1], Math.PI, colours.bronze);
  addBench(builder, [5.4, 0, 6.6], Math.PI + 0.6, colours.bronze);
  addLampPost(builder, [-0.8, 0, 3.9]);
  addLampPost(builder, [-4.6, 0, 4.6]);
  addRedHotPokers(builder, [-7.3, 0, -1.4], 1.1);
  addRedHotPokers(builder, [-4.4, 0, 6.2]);
  addRedHotPokers(builder, [7.0, 0, 1.0], 1.2);
  addBasaltColumns(builder, [7.5, 0, -2.5], [0.45, 0.4, 0.5]);
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const buildSplash = (builder: AttractionBuilder) => {
  builder.cylinder("water", colours.foam, {
    radius: 0.32,
    radiusEnd: 0.7,
    length: 0.7,
    at: [0, 0.35, 0],
    segments: 16,
    isOpen: true,
  });
  builder.cylinder("water", colours.lavaWater, {
    radius: 0.2,
    radiusEnd: 0.45,
    length: 1.0,
    at: [0, 0.5, 0],
    segments: 14,
    isOpen: true,
  });
  for (let drop = 0; drop < (builder.isFar ? 0 : 6); drop++) {
    const angle = drop * 2.39;
    const out = 0.35 + (drop % 3) * 0.18;
    builder.sphere(
      "water",
      drop % 2 === 0 ? colours.foam : colours.lavaWater,
      0.07 + (drop % 2) * 0.03,
      [Math.sin(angle) * out, 0.6 + (drop % 4) * 0.2, Math.cos(angle) * out],
      [1, 1.3, 1],
      6,
    );
  }
  builder.torus("water", colours.foam, 0.55, 0.06, [0, 0.02, 0], "y", 16);
};

const buildEruption = (builder: AttractionBuilder) => {
  builder.cylinder("water", colours.lavaWater, {
    radius: 0.16,
    radiusEnd: 0.06,
    length: 1.5,
    at: [0, 0.75, 0],
    segments: 12,
  });
  builder.cylinder("glow", colours.lavaWhite, {
    radius: 0.07,
    radiusEnd: 0.02,
    length: 1.6,
    at: [0, 0.8, 0],
    segments: 8,
  });
  [
    [0, 1.65, 0, 0.14],
    [0.22, 1.35, 0.06, 0.09],
    [-0.18, 1.25, -0.12, 0.1],
    [0.08, 1.1, 0.24, 0.08],
    [-0.14, 1.45, 0.16, 0.07],
    [0.2, 1.0, -0.2, 0.06],
  ].forEach(([x, y, z, radius], index) => {
    if (builder.isFar && index > 0) {
      return;
    }
    builder.sphere(
      index === 0 ? "glow" : "water",
      index === 0 ? colours.lava : colours.lavaWater,
      radius,
      [x, y, z],
      [1, 1.2, 1],
      8,
    );
  });
};

const buildCraterGlow = (builder: AttractionBuilder) => {
  builder.sphere("glow", colours.lava, 1.5, [0, 0, 0], [1.3, 0.7, 1.3], 12);
};

const buildRubberRing = (builder: AttractionBuilder) => {
  builder.torus("paint", colours.lava, 0.3, 0.1, [0, 0, 0], "y", 12);
  for (let band = 0; band < (builder.isFar ? 0 : 4); band++) {
    const angle = (band / 4) * Math.PI * 2 + Math.PI / 4;
    builder.box(
      "paint",
      colours.white,
      [0.1, 0.205, 0.215],
      [Math.sin(angle) * 0.3, 0, Math.cos(angle) * 0.3],
      [0, angle, 0],
    );
  }
};

/** The bronze dragon's head, facing -x, spouting a stream of "lava". */
const buildDragon = (builder: AttractionBuilder) => {
  const bronze = colours.bronze;
  builder.sphere("metal", bronze, 0.26, [0.18, -0.12, 0], [1, 1.3, 0.9], 10);
  builder.sphere("metal", bronze, 0.28, [0, 0.05, 0], [1.2, 0.9, 0.95], 12);
  builder.sphere(
    "metal",
    bronze,
    0.24,
    [-0.34, 0.0, 0],
    [1.05, 0.48, 0.64],
    10,
  );
  builder.box(
    "metal",
    colours.darkBronze,
    [0.4, 0.07, 0.24],
    [-0.3, -0.15, 0],
    [0, 0, 0.18],
  );
  builder.box(
    "glow",
    colours.lavaDeep,
    [0.3, 0.05, 0.2],
    [-0.32, -0.09, 0],
    [0, 0, 0.08],
  );
  [-1, 1].forEach((side) => {
    if (builder.isFar) {
      return;
    }
    builder.sphere(
      "glow",
      colours.lavaWhite,
      0.055,
      [-0.13, 0.17, side * 0.17],
      [1, 1, 1],
      10,
    );
    builder.box(
      "metal",
      colours.darkBronze,
      [0.16, 0.04, 0.07],
      [-0.13, 0.24, side * 0.16],
      [side * 0.2, 0, -0.2],
    );
    builder.sphere(
      "matte",
      colours.stripe,
      0.03,
      [-0.56, 0.06, side * 0.07],
      [1, 1, 1],
      6,
    );
    builder.add(
      "metal",
      colours.darkBronze,
      new ConeGeometry(0.06, 0.38, 8)
        .translate(0, 0.19, 0)
        .rotateZ(-0.9)
        .rotateX(side * -0.25),
      { at: [0.12, 0.24, side * 0.12] },
    );
    [-0.42, -0.3, -0.18].forEach((along) => {
      builder.add(
        "paint",
        colours.white,
        new ConeGeometry(0.02, 0.06, 4).rotateZ(Math.PI),
        { at: [along, -0.06, side * 0.11] },
        undefined,
      );
    });
  });
  [0.08, 0.22, 0.36].forEach((along, spike) => {
    builder.add(
      "metal",
      colours.darkBronze,
      new ConeGeometry(0.05, 0.18 - spike * 0.03, 6).rotateZ(-0.4),
      { at: [along, 0.3 - spike * 0.08, 0] },
    );
  });
  /* The stream of "lava" water arcing into the pool */
  const pool = poolWater - dragonAt[1];
  const pieces = builder.isFar ? 3 : 6;
  const stream: Triple[] = Array.from({ length: pieces + 1 }, (_, index) => {
    const share = index / pieces;
    return [
      -0.55 - share * 1.2,
      -0.06 + share * 0.35 - share * share * (0.35 - pool - 0.06),
      0,
    ];
  });
  for (let index = 1; index < stream.length; index++) {
    builder.bar(
      "water",
      colours.lavaWater,
      stream[index - 1],
      stream[index],
      0.1,
      8,
    );
  }
  const landing = stream[stream.length - 1];
  builder.torus(
    "water",
    colours.foam,
    0.16,
    0.04,
    [landing[0], pool + 0.02, 0],
    "y",
    14,
  );
};

/* ------------------------------------------------------------------ */
/* Wanderers: little fire salamanders                                  */
/* ------------------------------------------------------------------ */

const buildSalamander = (builder: AttractionBuilder) => {
  const body = "#1f1a1a";
  const spots = colours.towelYellow;
  builder.sphere("paint", body, 0.08, [0, 0.07, 0], [0.8, 0.6, 2.0], 8);
  if (builder.isFar) {
    return;
  }
  builder.sphere("paint", body, 0.065, [0, 0.08, 0.17], [1, 0.7, 1.1], 8);
  builder.cylinder("paint", body, {
    radius: 0.04,
    radiusEnd: 0.005,
    length: 0.26,
    at: [0, 0.06, -0.26],
    axis: "z",
    segments: 6,
  });
  [-1, 1].forEach((side) => {
    [0.08, -0.08].forEach((along) => {
      builder.bar(
        "paint",
        body,
        [side * 0.04, 0.06, along],
        [side * 0.11, 0, along + 0.03],
        0.03,
        4,
      );
    });
    if (!builder.isFar) {
      builder.sphere(
        "glow",
        spots,
        0.02,
        [side * 0.04, 0.12, 0.2],
        [1, 1, 1],
        6,
      );
      builder.sphere(
        "paint",
        spots,
        0.03,
        [side * 0.035, 0.11, side * 0.05],
        [1, 0.5, 1.4],
        5,
      );
    }
  });
};

/* ------------------------------------------------------------------ */
/* The ride: up the stair and down the flume                           */
/* ------------------------------------------------------------------ */

const climbShare = 0.05;
const stairShare = 0.47;
const rimShare = 0.56;
const slideShare = 0.92;

const headingOf = (dx: number, dz: number) => Math.atan2(dx, dz);

const rideTheFlume = (progress: number): LocalSpot => {
  if (progress < climbShare) {
    const share = progress / climbShare;
    const foot = findStairSpot(0);
    return {
      x: rideStart.x + (foot.x - rideStart.x) * share,
      y: 0,
      z: rideStart.z + (foot.z - rideStart.z) * share,
      heading: headingOf(foot.x - rideStart.x, foot.z - rideStart.z),
    };
  }
  if (progress < stairShare) {
    const share = (progress - climbShare) / (stairShare - climbShare);
    const spot = findStairSpot(share);
    return {
      x: spot.x,
      y: spot.y,
      z: spot.z,
      heading: headingOf(-Math.cos(spot.angle), Math.sin(spot.angle)),
    };
  }
  if (progress < rimShare) {
    const share = (progress - stairShare) / (rimShare - stairShare);
    const top = findStairSpot(1);
    const start = flumeCurve.getPointAt(0);
    return {
      x: top.x + (start.x - top.x) * share,
      y: craterFloor,
      z: top.z + (start.z - top.z) * share,
      heading: headingOf(start.x - top.x, start.z - top.z),
    };
  }
  if (progress < slideShare) {
    const share = ((progress - rimShare) / (slideShare - rimShare)) ** 1.4;
    const point = flumeCurve.getPointAt(share);
    const tangent = flumeCurve.getTangentAt(share);
    return {
      x: point.x,
      y: point.y + 0.12,
      z: point.z,
      heading: headingOf(tangent.x, tangent.z),
    };
  }
  const share = (progress - slideShare) / (1 - slideShare);
  return {
    x: flumeEnd.x + (rideFinish.x - flumeEnd.x) * share,
    y: Math.max(
      0,
      (flumeEnd.y + 0.12) * (1 - share) * (1 - share) +
        0.75 * Math.sin(Math.PI * share) * share,
    ),
    z: flumeEnd.z + (rideFinish.z - flumeEnd.z) * share,
    heading: headingOf(rideFinish.x - flumeEnd.x, rideFinish.z - flumeEnd.z),
  };
};

export const lavaFlumeModel: NewLandAttractionModel = {
  kind: "lava-flume",
  islandId: "ember-isle",
  name: "Lava Flume",
  fact: "Friction is a force that slows things down when they rub against each other. On a flume, a thin layer of running water between you and the slide makes the friction much smaller, so gravity can pull you down faster and faster until you splash into the pool!",
  curriculumLink:
    "Science, Year 5: forces. Explain that unsupported objects fall towards the Earth because of gravity, and identify the effects of friction and water resistance.",
  footprint: 9.5,
  setting: "inland",
  padColour: colours.ashPad,
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: (builder) => {
    buildVolcano(builder);
    buildStair(builder);
    buildFlume(builder);
    buildPool(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "flume splash",
      pivot: [flumeEnd.x, poolWater, flumeEnd.z],
      build: buildSplash,
      motion: { kind: "splash", reach: 6, period: 0.9 },
    },
    {
      name: "crater fountain",
      pivot: [volcanoAt.x, craterFloor - 0.02, volcanoAt.z],
      build: buildEruption,
      motion: { kind: "splash", reach: 8, period: 1.3, phase: 0.8 },
    },
    {
      name: "crater glow",
      pivot: [volcanoAt.x, craterFloor + 0.4, volcanoAt.z],
      build: buildCraterGlow,
      motion: { kind: "wake", reach: 9 },
      look: "halo",
    },
    {
      name: "rubber rings",
      pivot: [poolAt.x, poolWater + 0.04, poolAt.z],
      build: buildRubberRing,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 1.15,
        count: 3,
        speed: 0.22,
        bob: 0.03,
      },
    },
    {
      name: "bronze dragon",
      pivot: dragonAt,
      build: buildDragon,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 5,
        amplitude: 0.22,
        period: 1.6,
      },
    },
  ],
  wanderers: [
    {
      name: "fire salamanders",
      build: buildSalamander,
      count: 2,
      centre: { x: 3.4, z: 7.2 },
      radius: 1.1,
      speed: 0.25,
    },
  ],
  smoke: [
    {
      at: [volcanoAt.x, craterFloor + 0.3, volcanoAt.z],
      colour: "#d9d2cc",
      puffs: 6,
      size: 0.5,
      rise: 2.6,
      spread: 0.4,
    },
    {
      at: [poolAt.x, poolWater + 0.1, poolAt.z],
      colour: "#f0e8e0",
      puffs: 5,
      size: 0.4,
      rise: 1.4,
      spread: 1.2,
    },
  ],
  blockers: [
    { x: volcanoAt.x, z: volcanoAt.z, radius: 2.7 },
    { x: poolAt.x, z: poolAt.z, radius: poolRadius + 0.3 },
    { x: boothAt.x, z: boothAt.z, radius: 1.1 },
  ],
  rides: [
    {
      id: "lava-flume",
      name: "the lava flume",
      start: rideStart,
      reach: 0.6,
      seconds: 16,
      finish: rideFinish,
      follow: rideTheFlume,
    },
  ],
  tune: [60, 64, 67, 72, 67, 72],
  play: {
    label: "Ride the Lava Flume",
    news: "Whoosh! You whizzed round the glowing bends on a slick of running water and landed in the pool with an enormous orange SPLASH!",
    tune: [72, 67, 64, 60, 55],
  },
};
