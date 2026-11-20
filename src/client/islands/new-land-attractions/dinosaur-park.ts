import { ConeGeometry, CylinderGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addBandedRock,
  addRock,
  addScrub,
  addSlab,
  buildPerson,
  desert,
  followPath,
  listRoundSection,
  listSmoothKnots,
  makeSweep,
  type Knot,
} from "./sandstone-arches-parts.js";

/*
 * Life-size, friendly dinosaurs among tree ferns and cycads. The
 * long-necked sauropod is tall enough to walk under, and lowers its
 * great head to say hello; you can climb its tail and ride on its back.
 * A Triceratops nods its frilly head, and a baby pops out of its egg.
 */

const parkSand = "#dcc48c";
const longNeckGreen = "#7fa65a";
const longNeckSpots = "#5f8a45";
const longNeckBelly = "#e0d9a0";
const trikeOrange = "#d48a3e";
const trikeStripes = "#a8602a";
const trikeBelly = "#f0d8a0";
const frillBlue = "#3f7fae";
const horn = "#f2ead2";
const fernGreen = "#4f8a3a";
const signColour = "#4f7a3a";
const signAt: Triple = [2.6, 0, 10.3];

/** Paints a dinosaur: a pale belly, a darker back and spots along it. */
const paintHide =
  (top: string, spots: string, belly: string, spotEvery = 0.55) =>
  (centre: { x: number; y: number; z: number }, normal: { y: number }) => {
    if (normal.y < -0.35) {
      return belly;
    }
    const spot =
      Math.sin(centre.z / spotEvery) *
      Math.sin(centre.x * 3.1 + centre.y * 2.3);
    return normal.y > 0.2 && spot > 0.55 ? spots : top;
  };

/* ------------------------------------------------------------------ */
/* The long-neck                                                       */
/* ------------------------------------------------------------------ */

const neckX = -3.2;
const shoulderZ = -0.6;
const neckPivot: Triple = [neckX, 3.15, shoulderZ + 0.55];

const bodyKnots: Knot[] = [
  { at: [neckX, 2.85, shoulderZ + 1.0], size: [0.5, 0.5] },
  { at: [neckX, 2.95, shoulderZ + 0.2], size: [0.95, 0.85] },
  { at: [neckX, 2.85, shoulderZ - 1.3], size: [1.08, 1.0] },
  { at: [neckX, 2.7, shoulderZ - 2.8], size: [0.98, 0.92] },
  { at: [neckX + 0.1, 2.45, shoulderZ - 4.2], size: [0.62, 0.56] },
  { at: [neckX + 0.6, 1.9, shoulderZ - 5.6], size: [0.4, 0.36] },
  { at: [neckX + 1.5, 1.15, shoulderZ - 6.8], size: [0.25, 0.23] },
  { at: [neckX + 2.6, 0.55, shoulderZ - 7.6], size: [0.15, 0.14] },
  { at: [neckX + 3.6, 0.25, shoulderZ - 8.0], size: [0.06, 0.06] },
];

const longNeckLegs: { x: number; z: number; top: number }[] = [
  { x: neckX - 0.68, z: shoulderZ - 0.1, top: 2.5 },
  { x: neckX + 0.68, z: shoulderZ - 0.1, top: 2.5 },
  { x: neckX - 0.74, z: shoulderZ - 3.0, top: 2.3 },
  { x: neckX + 0.74, z: shoulderZ - 3.0, top: 2.3 },
];

const legRadius = 0.36;

/** A pillar of a leg with a round, toed elephant's foot. */
const addPillarLeg = (
  builder: AttractionBuilder,
  colour: string,
  x: number,
  z: number,
  top: number,
  radius: number,
  lean = 0,
) => {
  builder.add(
    "matte",
    colour,
    new CylinderGeometry(
      radius * 1.2,
      radius,
      top,
      builder.segments(12, 6),
      builder.isFar ? 1 : 3,
    ),
    { at: [x, top / 2, z], rotation: [lean, 0, 0] },
  );
  builder.cylinder("matte", shade(colour, 0.9), {
    radius: radius * 1.1,
    radiusEnd: radius * 1.05,
    length: 0.22,
    at: [x, 0.11, z],
    segments: 12,
  });
  if (!builder.isFar) {
    [-0.6, 0, 0.6].forEach((spread) => {
      builder.sphere(
        "matte",
        horn,
        radius * 0.22,
        [
          x + Math.sin(spread) * radius * 1.05,
          0.07,
          z + Math.cos(spread) * radius * 1.05,
        ],
        [1, 0.7, 1],
        6,
      );
    });
  }
};

const buildLongNeckBody = (builder: AttractionBuilder) => {
  const { path, size } = listSmoothKnots(bodyKnots, builder.isFar ? 2 : 4);
  builder.painted(
    makeSweep({
      path,
      section: listRoundSection(builder.isFar ? 7 : 14),
      size,
    }),
    paintHide(longNeckGreen, longNeckSpots, longNeckBelly),
    {},
    "matte",
  );
  longNeckLegs.forEach(({ x, z, top }, index) => {
    addPillarLeg(
      builder,
      index < 2 ? longNeckGreen : shade(longNeckGreen, 0.94),
      x,
      z,
      top,
      legRadius,
    );
  });
  if (!builder.isFar) {
    /* A row of soft bumps down its back */
    path.forEach((point, index) => {
      if (index % 3 !== 0 || index > path.length - 6) {
        return;
      }
      const [high] = size(index / (path.length - 1));
      builder.sphere(
        "matte",
        longNeckSpots,
        0.08 + high * 0.08,
        [point[0], point[1] + high * 0.96, point[2]],
        [0.8, 0.6, 1.2],
        8,
      );
    });
  }
};

/** How far forward the neck leans at rest; it nods between upright and low. */
const neckLean = 0.5;

const leanForward = ([x, y, z]: Triple): Triple => [
  x,
  y * Math.cos(neckLean) - z * Math.sin(neckLean),
  y * Math.sin(neckLean) + z * Math.cos(neckLean),
];

const buildLongNeckNeck = (builder: AttractionBuilder) => {
  const knots: Knot[] = (
    [
      [
        [0, -0.35, -0.55],
        [0.7, 0.7],
      ],
      [
        [0, 0.8, 0.35],
        [0.52, 0.5],
      ],
      [
        [0, 1.9, 1.05],
        [0.38, 0.36],
      ],
      [
        [0, 2.75, 1.6],
        [0.3, 0.28],
      ],
      [
        [0, 3.15, 2.0],
        [0.26, 0.25],
      ],
    ] satisfies [Triple, [number, number]][]
  ).map(([at, size]) => ({ at: leanForward(at), size }));
  const { path, size } = listSmoothKnots(knots, builder.isFar ? 2 : 4);
  builder.painted(
    makeSweep({
      path,
      section: listRoundSection(builder.isFar ? 6 : 12),
      size,
    }),
    paintHide(longNeckGreen, longNeckSpots, longNeckBelly, 0.3),
    {},
    "matte",
  );
  /* The head: a rounded crown, a long snout and a kind smile */
  const head = leanForward([0, 3.3, 2.25]);
  builder.sphere("matte", longNeckGreen, 0.36, head, [0.85, 0.8, 1.05], 16);
  builder.sphere(
    "matte",
    shade(longNeckGreen, 1.06),
    0.3,
    [0, head[1] - 0.06, head[2] + 0.38],
    [0.85, 0.72, 1.15],
    14,
  );
  builder.sphere(
    "matte",
    longNeckSpots,
    0.18,
    [0, head[1] + 0.26, head[2] - 0.05],
    [1, 0.7, 1.2],
    10,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.085,
      [side * 0.22, head[1] + 0.1, head[2] + 0.1],
      [0.6, 1, 1],
      10,
    );
    builder.sphere(
      "paint",
      desert.charcoal,
      0.05,
      [side * 0.26, head[1] + 0.1, head[2] + 0.14],
      [0.6, 1, 1],
      8,
    );
    builder.sphere(
      "paint",
      palette.white,
      0.015,
      [side * 0.28, head[1] + 0.13, head[2] + 0.17],
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "matte",
      shade(longNeckGreen, 0.75),
      0.03,
      [side * 0.08, head[1] + 0.02, head[2] + 0.72],
      [1, 1, 1],
      5,
    );
  });
  builder.torus(
    "matte",
    shade(longNeckGreen, 0.6),
    0.2,
    0.014,
    [0, head[1] - 0.14, head[2] + 0.48],
    "y",
    14,
  );
  /* A mouthful of fern fronds */
  [-0.2, 0.2].forEach((side) => {
    addSlab(
      builder,
      "matte",
      fernGreen,
      [side * 0.6, head[1] - 0.16, head[2] + 0.55],
      [side * 2.2, head[1] - 0.3, head[2] + 0.68],
      0.12,
      0.02,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The Triceratops                                                     */
/* ------------------------------------------------------------------ */

const trike = { x: 4.8, z: -4.2 };
const trikeHeadPivot: Triple = [trike.x, 1.35, trike.z + 1.45];

const buildTrikeBody = (builder: AttractionBuilder) => {
  const knots: Knot[] = [
    { at: [trike.x, 1.4, trike.z + 1.5], size: [0.55, 0.55] },
    { at: [trike.x, 1.55, trike.z + 0.7], size: [0.85, 0.8] },
    { at: [trike.x, 1.6, trike.z - 0.5], size: [0.9, 0.85] },
    { at: [trike.x, 1.45, trike.z - 1.6], size: [0.7, 0.62] },
    { at: [trike.x - 0.1, 1.0, trike.z - 2.6], size: [0.36, 0.3] },
    { at: [trike.x - 0.5, 0.45, trike.z - 3.4], size: [0.15, 0.13] },
    { at: [trike.x - 1.0, 0.25, trike.z - 3.8], size: [0.05, 0.05] },
  ];
  const { path, size } = listSmoothKnots(knots, builder.isFar ? 2 : 4);
  builder.painted(
    makeSweep({
      path,
      section: listRoundSection(builder.isFar ? 6 : 12),
      size,
    }),
    paintHide(trikeOrange, trikeStripes, trikeBelly, 0.3),
    {},
    "matte",
  );
  [
    [-0.55, 0.85, 1.05],
    [0.55, 0.85, 1.05],
    [-0.6, -1.0, 1.1],
    [0.6, -1.0, 1.1],
  ].forEach(([dx, dz, top]) => {
    addPillarLeg(builder, trikeOrange, trike.x + dx, trike.z + dz, top, 0.24);
  });
};

const buildTrikeHead = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    trikeOrange,
    0.45,
    [0, 0, 0.45],
    [0.85, 0.8, 1.1],
    12,
  );
  builder.sphere(
    "matte",
    shade(trikeOrange, 1.08),
    0.32,
    [0, -0.15, 0.95],
    [0.75, 0.75, 1.05],
    12,
  );
  /* The beak */
  builder.add(
    "matte",
    "#6a5038",
    new ConeGeometry(0.16, 0.36, builder.segments(10, 5)).rotateX(
      Math.PI / 2 + 0.5,
    ),
    { at: [0, -0.3, 1.28] },
  );
  /* The frill, edged with knobbly bumps */
  builder.add(
    "matte",
    frillBlue,
    new CylinderGeometry(
      0.85,
      0.85,
      0.1,
      builder.segments(20, 10),
      1,
      false,
      -Math.PI / 2 - 1.2,
      2.4,
    ).rotateX(Math.PI / 2 - 0.45),
    { at: [0, 0.2, 0.1] },
  );
  builder.add(
    "matte",
    "#f0c040",
    new CylinderGeometry(
      0.55,
      0.55,
      0.12,
      builder.segments(16, 8),
      1,
      false,
      -Math.PI / 2 - 1.1,
      2.2,
    ).rotateX(Math.PI / 2 - 0.45),
    { at: [0, 0.22, 0.13] },
  );
  const hornAt = (at: Triple, length: number, radius: number, tilt: number) => {
    builder.add(
      "paint",
      horn,
      new ConeGeometry(radius, length, builder.segments(10, 5)).rotateX(tilt),
      { at },
    );
  };
  hornAt([-0.24, 0.42, 0.62], 0.75, 0.09, 1.0);
  hornAt([0.24, 0.42, 0.62], 0.75, 0.09, 1.0);
  hornAt([0, 0.06, 1.15], 0.3, 0.07, 0.6);
  if (builder.isFar) {
    return;
  }
  for (let knob = 0; knob < 7; knob++) {
    const angle = -1.15 + (knob / 6) * 2.3;
    builder.sphere(
      "matte",
      "#f0c040",
      0.07,
      [
        Math.sin(angle) * 0.85,
        0.2 + Math.cos(angle) * 0.85 * Math.cos(0.45),
        0.1 - Math.cos(angle) * 0.85 * Math.sin(0.45),
      ],
      [1, 1, 1],
      6,
    );
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.07,
      [side * 0.3, 0.12, 0.85],
      [0.6, 1, 1],
      8,
    );
    builder.sphere(
      "paint",
      desert.charcoal,
      0.04,
      [side * 0.33, 0.12, 0.88],
      [0.6, 1, 1],
      6,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The nest, plants and grounds                                        */
/* ------------------------------------------------------------------ */

const nest = { x: 3.4, z: 3.4 };

const buildNest = (builder: AttractionBuilder) => {
  builder.torus("matte", "#9a7a4a", 0.75, 0.16, [nest.x, 0.1, nest.z], "y", 18);
  builder.cylinder("matte", "#b89a62", {
    radius: 0.72,
    length: 0.06,
    at: [nest.x, 0.05, nest.z],
    segments: 18,
  });
  [
    [-0.32, 0.1],
    [0.3, 0.2],
    [0.05, -0.32],
  ].forEach(([dx, dz], index) => {
    builder.sphere(
      "paint",
      index === 0 ? "#f2ead8" : "#e8dcc0",
      0.17,
      [nest.x + dx, 0.24, nest.z + dz],
      [0.85, 1.15, 0.85],
      builder.isFar ? 6 : 12,
    );
    if (!builder.isFar) {
      [0, 1, 2].forEach((speck) => {
        builder.sphere(
          "matte",
          "#a88a6a",
          0.025,
          [
            nest.x + dx + Math.sin(speck * 2.1) * 0.13,
            0.26 + speck * 0.05,
            nest.z + dz + Math.cos(speck * 2.1) * 0.13,
          ],
          [1, 1, 1],
          4,
        );
      });
    }
  });
  /* The broken shell the baby climbs out of */
  builder.add(
    "paint",
    "#f2ead8",
    new CylinderGeometry(0.2, 0.16, 0.18, builder.segments(12, 6), 1, true),
    { at: [nest.x, 0.15, nest.z] },
  );
};

const addTreeFern = (
  builder: AttractionBuilder,
  at: Triple,
  height: number,
  seed: number,
) => {
  builder.cylinder("matte", "#5a4030", {
    radius: 0.2,
    radiusEnd: 0.15,
    length: height,
    at: [at[0], height / 2, at[2]],
    segments: 8,
  });
  const fronds = builder.isFar ? 4 : 7;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2 + seed;
    const out = (distance: number, drop: number): Triple => [
      at[0] + Math.sin(angle) * distance,
      height + drop,
      at[2] + Math.cos(angle) * distance,
    ];
    const colour = frond % 2 === 0 ? fernGreen : "#3f7a30";
    addSlab(builder, "matte", colour, out(0, 0.05), out(0.8, 0.25), 0.4, 0.03);
    if (!builder.isFar) {
      addSlab(
        builder,
        "matte",
        colour,
        out(0.8, 0.25),
        out(1.5, -0.2),
        0.3,
        0.03,
      );
    }
  }
};

const addCycad = (builder: AttractionBuilder, at: Triple, seed: number) => {
  builder.cylinder("matte", "#7a5a38", {
    radius: 0.3,
    radiusEnd: 0.22,
    length: 0.7,
    at: [at[0], 0.35, at[2]],
    segments: 10,
  });
  const fronds = builder.isFar ? 4 : 8;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2 + seed;
    addSlab(
      builder,
      "matte",
      frond % 2 === 0 ? "#3f8a3a" : "#5a9a3e",
      [at[0], 0.75, at[2]],
      [at[0] + Math.sin(angle) * 0.95, 1.25, at[2] + Math.cos(angle) * 0.95],
      0.22,
      0.03,
    );
  }
};

/** A three-toed footprint pressed into rock, now a trace fossil. */
const addFootprint = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  turn: number,
) => {
  const dark = "#8a6a44";
  builder.cylinder("matte", dark, {
    radius: 0.16,
    length: 0.02,
    at: [x, 0.045, z],
    segments: 8,
  });
  [-0.45, 0, 0.45].forEach((spread) => {
    const angle = turn + spread;
    addSlab(
      builder,
      "matte",
      dark,
      [x + Math.sin(angle) * 0.1, 0.045, z + Math.cos(angle) * 0.1],
      [x + Math.sin(angle) * 0.36, 0.045, z + Math.cos(angle) * 0.36],
      0.08,
      0.02,
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A flagstone path of footprint slabs, up from the sign */
  for (let slab = 0; slab < 6; slab++) {
    const hasPrint = slab % 2 === 0;
    const z = 9.2 - slab * 1.25;
    const x = 1.6 - slab * 0.25;
    builder.box(
      "matte",
      slab % 2 === 0 ? desert.paleSandstone : desert.sandstone,
      [1.6, 0.04, 1.1],
      [x, 0.02, z],
    );
    if (!builder.isFar && hasPrint) {
      addFootprint(
        builder,
        x + (slab % 2 === 0 ? -0.3 : 0.3),
        z,
        Math.PI + 0.2,
      );
    }
  }
  addTreeFern(builder, [-8.2, 0, -3.4], 2.6, 0.2);
  addTreeFern(builder, [-7.6, 0, 3.4], 2.2, 1.1);
  addTreeFern(builder, [8.0, 0, 1.2], 2.5, 0.6);
  addTreeFern(builder, [3.4, 0, -9.0], 2.3, 1.7);
  addTreeFern(builder, [-6.0, 0, -7.4], 2.0, 2.4);
  addCycad(builder, [-5.6, 0, 6.6], 0.3);
  addCycad(builder, [6.8, 0, 5.4], 1.2);
  addCycad(builder, [8.4, 0, -5.0], 0.8);
  addCycad(builder, [-1.0, 0, 7.4], 2.0);
  addBandedRock(builder, [7.4, 0.5, -1.8], [1.0, 0.8, 0.9], 2.2);
  addBandedRock(builder, [-8.8, 0.4, 0.4], [0.8, 0.6, 1.0], 4.4);
  addBandedRock(builder, [4.6, 0.35, -8.2], [0.9, 0.5, 0.7], 6.6);
  [
    [-4.2, 4.4, 0.4],
    [5.6, 2.0, 0.35],
    [0.4, -6.2, 0.45],
    [-8.4, 5.4, 0.4],
    [9.0, 3.6, 0.45],
  ].forEach(([x, z, size]) => {
    addScrub(builder, [x, 0, z], size, "#6a8f3e");
  });
  if (!builder.isFar) {
    [
      [2.6, 6.4],
      [-2.4, 3.2],
      [6.0, -0.6],
      [-6.4, -4.6],
      [3.0, -7.0],
    ].forEach(([x, z], index) => {
      addRock(
        builder,
        index % 2 === 0 ? desert.redSandstone : desert.paleSandstone,
        [x, 0.07, z],
        [0.22, 0.14, 0.18],
        index * 2.3 + 1,
      );
    });
    /* A friendly fact board beside the long-neck */
    builder.box(
      "matte",
      desert.darkTimber,
      [0.08, 1.1, 0.08],
      [-0.6, 0.55, 2.2],
    );
    builder.box(
      "matte",
      desert.darkTimber,
      [0.08, 1.1, 0.08],
      [0.4, 0.55, 2.2],
    );
    builder.roundedBox(
      "paint",
      "#f2e6c4",
      [1.25, 0.7, 0.06],
      0.03,
      [-0.1, 1.15, 2.24],
    );
    builder.box(
      "paint",
      longNeckGreen,
      [0.75, 0.18, 0.02],
      [-0.25, 1.25, 2.28],
    );
    builder.box("paint", trikeOrange, [0.3, 0.3, 0.02], [0.3, 1.05, 2.28]);
    builder.box(
      "paint",
      desert.charcoal,
      [0.6, 0.04, 0.02],
      [-0.25, 0.98, 2.28],
    );
  }
  addSignBoard(builder, signAt, signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts and wanderers                                          */
/* ------------------------------------------------------------------ */

const buildBaby = (builder: AttractionBuilder) => {
  const green = "#8fc062";
  builder.sphere("matte", green, 0.13, [0, 0.12, 0], [0.9, 1.1, 0.9], 10);
  builder.sphere("matte", green, 0.1, [0, 0.3, 0.05], [1, 0.95, 1.1], 10);
  builder.add(
    "paint",
    "#f2ead8",
    new CylinderGeometry(0.16, 0.2, 0.08, builder.segments(10, 5), 1, true),
    { at: [0, 0.4, 0] },
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.sphere(
        "paint",
        desert.charcoal,
        0.025,
        [side * 0.05, 0.33, 0.13],
        [1, 1, 1],
        5,
      );
      builder.bar(
        "matte",
        green,
        [side * 0.09, 0.15, 0.05],
        [side * 0.15, 0.22, 0.13],
        0.04,
        5,
      );
    });
  }
};

const buildPterosaur = (builder: AttractionBuilder) => {
  const skin = "#b8683a";
  builder.sphere(
    "matte",
    skin,
    0.14,
    [0, 0, 0],
    [0.8, 0.7, 2],
    builder.isFar ? 6 : 10,
  );
  builder.add(
    "matte",
    "#e0a040",
    new ConeGeometry(0.06, 0.45, builder.segments(8, 4)).rotateX(Math.PI / 2),
    { at: [0, 0.03, 0.48] },
  );
  builder.add(
    "matte",
    "#c0402a",
    new ConeGeometry(0.06, 0.3, builder.segments(6, 3)).rotateX(
      -Math.PI / 2 - 0.4,
    ),
    { at: [0, 0.12, 0.12] },
  );
  [-1, 1].forEach((side) => {
    addSlab(
      builder,
      "matte",
      shade(skin, 1.1),
      [side * 0.08, 0.02, 0.05],
      [side * 0.8, 0.14, -0.05],
      0.38,
      0.025,
    );
    addSlab(
      builder,
      "matte",
      shade(skin, 0.9),
      [side * 0.78, 0.14, -0.05],
      [side * 1.3, 0.04, -0.2],
      0.22,
      0.02,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The ride up the long-neck's tail and onto its back                  */
/* ------------------------------------------------------------------ */

const rideStart = { x: neckX + 4.1, z: shoulderZ - 7.0 };
const rideFinish = { x: neckX + 2.9, z: shoulderZ - 1.4 };

const backRidePath: Triple[] = [
  [rideStart.x, 0, rideStart.z],
  ...bodyKnots
    .slice(1)
    .reverse()
    .map(({ at, size }): Triple => [at[0], at[1] + size[0] + 0.02, at[2]]),
  [neckX, 3.97, shoulderZ + 0.15],
  [neckX + 0.9, 3.4, shoulderZ - 0.7],
  [neckX + 2.0, 1.6, shoulderZ - 1.2],
  [rideFinish.x, 0, rideFinish.z],
];

const backRide = (progress: number, seconds: number): LocalSpot => {
  /* Climb up the tail, sway along on its back a while, then slide off */
  const share =
    progress < 0.55
      ? (progress / 0.55) * 0.62
      : progress < 0.8
        ? 0.62 + ((progress - 0.55) / 0.25) * 0.08
        : 0.7 + ((progress - 0.8) / 0.2) * 0.3;
  const spot = followPath(backRidePath, share);
  const sway =
    progress > 0.3 && progress < 0.8 ? Math.sin(seconds * 2.4) * 0.06 : 0;
  return { ...spot, y: spot.y + Math.abs(sway) };
};

const longNeckBlockers: LocalBlocker[] = longNeckLegs.map(({ x, z }) => ({
  x,
  z,
  radius: legRadius + 0.15,
}));

export const dinosaurParkModel: NewLandAttractionModel = {
  kind: "dinosaur-park",
  islandId: "sunscorch-sands",
  name: "Dinosaur Park",
  fact: "We know about dinosaurs from their fossils. When a dinosaur died and was quickly buried in mud or sand, its bones were slowly turned to stone as the mud hardened into rock over millions of years. Long-necked sauropods like this one were plant-eaters, and some were taller than a house!",
  curriculumLink:
    "Science, Year 3: rocks. How fossils are formed when things that have lived are trapped within rock.",
  footprint: 12,
  setting: "inland",
  padColour: parkSand,
  signSpot: { x: signAt[0], z: signAt[2] + 0.9 },
  build: (builder) => {
    buildLongNeckBody(builder);
    buildTrikeBody(builder);
    buildNest(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "long-neck",
      pivot: neckPivot,
      build: buildLongNeckNeck,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.62,
        period: 5,
      },
    },
    {
      name: "triceratops-head",
      pivot: trikeHeadPivot,
      build: buildTrikeHead,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.2,
        period: 1.6,
      },
    },
    {
      name: "baby",
      pivot: [nest.x, 0.0, nest.z],
      build: buildBaby,
      motion: { kind: "rise", reach: 3.5, height: 0.32, period: 1.2 },
    },
  ],
  wanderers: [
    {
      name: "visitors",
      build: buildPerson({
        skin: "#c98d62",
        top: "#e0a030",
        bottom: "#3f5f8a",
        hair: "#2a1a10",
        hat: "#4f7a3a",
      }),
      count: 2,
      centre: { x: 1.0, z: 5.6 },
      radius: 2.0,
      speed: 0.3,
    },
    {
      name: "pterosaurs",
      build: buildPterosaur,
      count: 2,
      centre: { x: 0, z: -2 },
      radius: 5,
      speed: 1.1,
      height: 6.5,
      bob: 0.3,
    },
  ],
  blockers: [
    ...longNeckBlockers,
    { x: trike.x, z: trike.z, radius: 1.0 },
    { x: trike.x, z: trike.z + 1.4, radius: 0.8 },
    { x: nest.x, z: nest.z, radius: 0.85 },
  ],
  rides: [
    {
      id: "long-neck",
      name: "the long-neck's back",
      start: rideStart,
      reach: 0.6,
      seconds: 14,
      finish: rideFinish,
      follow: backRide,
    },
  ],
  play: {
    label: "Wave to the long-neck",
    news: "The long-neck lowered its great head and snuffled hello! Sauropods only ate plants, so you were quite safe.",
  },
};
