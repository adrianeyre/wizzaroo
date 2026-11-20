import {
  CylinderGeometry,
  Euler,
  Quaternion,
  TorusGeometry,
  Vector3,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const buddleiaPurple = "#8a4fc0";
const buddleiaLeaf = "#5f8a4a";
const lavender = "#9a7ad6";
const lavenderLeaf = "#8fa58a";
const archWhite = "#f2efe6";
const roseRed = "#d8344a";
const rosePink = "#f29ab0";
const logBark = "#6e4b2e";
const logFace = "#dcbc88";
const caterpillarGreen = "#8cc44a";
const chrysalisGreen = "#9cc46a";
const peacockRed = "#b8322a";
const brimstone = "#f2e04a";
const coneflowerPink = "#e2708f";
const coneflowerEye = "#c8641a";
const gravel = "#d8ccb0";
const edging = "#b9b0a0";
const signColour = "#8a4fc0";

const archZ = 0.8;
const archHalfWidth = 0.85;
const archPostHeight = 1.45;
const archTop = archPostHeight + archHalfWidth;
const logAt = { x: 0, z: -1.7 };
const butterflyAt: Triple = [0, archTop + 0.32, archZ];
const bedCentres = [
  { x: -2.1, z: 0.0 },
  { x: 2.1, z: 0.0 },
];

/** A cone pointing from `from` towards `to`, like a buddleia flower spike. */
const addCone = (
  builder: AttractionBuilder,
  colour: string,
  from: Triple,
  to: Triple,
  radius: number,
  segments: number,
) => {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.clone().normalize(),
    ),
  );
  const middle = start.add(direction.clone().multiplyScalar(0.5));
  builder.add(
    "matte",
    colour,
    new CylinderGeometry(0, radius, direction.length(), segments),
    {
      at: [middle.x, middle.y, middle.z],
      rotation: [turn.x, turn.y, turn.z],
    },
  );
};

/* ------------------------------------------------------------------ */
/* The flower beds                                                     */
/* ------------------------------------------------------------------ */

/** A buddleia, the butterfly bush, with its arching purple spikes. */
const buildBuddleia = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
) => {
  const [x, , z] = at;
  builder.sphere(
    "matte",
    buddleiaLeaf,
    0.75 * size,
    [x, 0.6 * size, z],
    [1.1, 0.9, 1],
    builder.isFar ? 6 : 10,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    shade(buddleiaLeaf, 1.12),
    0.5 * size,
    [x + 0.35 * size, 0.95 * size, z + 0.2 * size],
    [1, 0.85, 1],
    8,
  );
  const spikes = 7;
  for (let spike = 0; spike < spikes; spike++) {
    const angle = (spike / spikes) * Math.PI * 2 + size;
    const out = 0.55 * size;
    const base: Triple = [
      x + Math.sin(angle) * out,
      0.95 * size,
      z + Math.cos(angle) * out,
    ];
    const tip: Triple = [
      x + Math.sin(angle) * (out + 0.45 * size),
      (1.0 + (spike % 3) * 0.12) * size,
      z + Math.cos(angle) * (out + 0.45 * size),
    ];
    addCone(
      builder,
      spike % 3 === 0 ? shade(buddleiaPurple, 1.15) : buddleiaPurple,
      base,
      tip,
      0.09 * size,
      6,
    );
  }
};

/** A lavender clump: grey-green leaves and spikes of purple flowers. */
const buildLavender = (builder: AttractionBuilder, at: Triple) => {
  if (builder.isFar) {
    return;
  }
  const [x, , z] = at;
  builder.sphere("matte", lavenderLeaf, 0.3, [x, 0.12, z], [1.2, 0.7, 1.2], 8);
  for (let stem = 0; stem < 5; stem++) {
    const angle = stem * 1.25 + x;
    const lean = 0.12 + (stem % 3) * 0.06;
    const tip: Triple = [
      x + Math.sin(angle) * lean,
      0.58 + (stem % 2) * 0.08,
      z + Math.cos(angle) * lean,
    ];
    builder.bar("matte", lavenderLeaf, [x, 0.2, z], tip, 0.015, 3);
    builder.cylinder(
      "matte",
      stem % 2 === 0 ? lavender : shade(lavender, 0.85),
      {
        radius: 0.028,
        radiusEnd: 0.012,
        length: 0.14,
        at: [tip[0], tip[1] + 0.05, tip[2]],
        segments: 5,
      },
    );
  }
};

const buildBeds = (builder: AttractionBuilder) => {
  bedCentres.forEach(({ x, z }, index) => {
    const side = index === 0 ? -1 : 1;
    /* A soil bed edged with stones */
    builder.cylinder("matte", palette.soil, {
      radius: 1.35,
      length: 0.08,
      at: [x, 0.04, z],
      segments: builder.isFar ? 10 : 20,
    });
    if (!builder.isFar) {
      builder.torus("matte", edging, 1.38, 0.07, [x, 0.05, z], "y", 16);
    }
    buildBuddleia(builder, [x + side * 0.35, 0, z - 0.45], 1.05);
    buildBuddleia(builder, [x - side * 0.3, 0, z + 0.55], 0.8);
    [
      [x - side * 0.65, z - 0.55],
      [x + side * 0.55, z + 0.75],
      [x - side * 0.85, z + 0.15],
    ].forEach(([lavenderX, lavenderZ]) => {
      buildLavender(builder, [lavenderX, 0, lavenderZ]);
    });
  });
};

/* ------------------------------------------------------------------ */
/* The rose arch                                                       */
/* ------------------------------------------------------------------ */

const buildArch = (builder: AttractionBuilder) => {
  [-0.22, 0.22].forEach((dz) => {
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        archWhite,
        [0.07, archPostHeight, 0.07],
        [side * archHalfWidth, archPostHeight / 2, archZ + dz],
      );
    });
    builder.add(
      "paint",
      archWhite,
      new TorusGeometry(
        archHalfWidth,
        0.035,
        builder.isFar ? 3 : 5,
        builder.isFar ? 6 : 14,
        Math.PI,
      ),
      { at: [0, archPostHeight, archZ + dz] },
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Slats across the top, and trellis up the sides */
  for (let slat = 0; slat <= 6; slat++) {
    const angle = (slat / 6) * Math.PI;
    builder.box(
      "paint",
      archWhite,
      [0.04, 0.04, 0.56],
      [
        Math.cos(angle) * archHalfWidth,
        archPostHeight + Math.sin(angle) * archHalfWidth,
        archZ,
      ],
    );
  }
  [-1, 1].forEach((side) => {
    [0.35, 0.75, 1.15].forEach((y) => {
      builder.box(
        "paint",
        archWhite,
        [0.03, 0.03, 0.44],
        [side * archHalfWidth, y, archZ],
      );
    });
  });
  /* A climbing rose scrambling up one side and over the top */
  const roses: [number, number][] = [
    [-0.85, 0.5],
    [-0.88, 0.95],
    [-0.84, 1.35],
    [-0.7, 1.85],
    [-0.4, 2.15],
    [0.05, 2.28],
    [0.85, 0.7],
    [0.82, 1.25],
  ];
  roses.forEach(([x, y], index) => {
    builder.sphere(
      "matte",
      shade(palette.leaf, index % 2 === 0 ? 0.9 : 1.05),
      0.16,
      [x, y, archZ + (index % 2 === 0 ? 0.22 : -0.22)],
      [1, 0.8, 0.9],
      6,
    );
    builder.sphere(
      "paint",
      index % 3 === 0 ? rosePink : roseRed,
      0.055,
      [x + 0.05, y + 0.06, archZ + (index % 2 === 0 ? 0.33 : -0.33)],
      [1, 0.8, 1],
      6,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The life cycle log and its sign                                     */
/* ------------------------------------------------------------------ */

const buildLifeCycle = (builder: AttractionBuilder) => {
  const { x, z } = logAt;
  /* A fallen log lying across, its top flattened for the sculptures */
  builder.cylinder("matte", logBark, {
    radius: 0.24,
    length: 2.2,
    at: [x, 0.22, z],
    axis: "x",
    segments: builder.isFar ? 6 : 12,
  });
  /* The round life cycle board behind the log */
  builder.cylinder("paint", palette.cream, {
    radius: 0.6,
    length: 0.06,
    at: [x, 1.25, z - 0.35],
    axis: "z",
    segments: builder.isFar ? 8 : 20,
  });
  [-0.35, 0.35].forEach((post) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 1.2, 0.07],
      [x + post, 0.6, z - 0.4],
    );
  });
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((end) => {
    builder.cylinder("matte", logFace, {
      radius: 0.21,
      length: 0.01,
      at: [x + end * 1.1, 0.22, z],
      axis: "x",
      segments: 12,
    });
  });
  builder.torus(
    "paint",
    buddleiaPurple,
    0.6,
    0.03,
    [x, 1.25, z - 0.31],
    "z",
    20,
  );
  /* Four pictures round the board, with arrows going round */
  const stages = [
    { angle: 0, colour: palette.white },
    { angle: Math.PI / 2, colour: caterpillarGreen },
    { angle: Math.PI, colour: chrysalisGreen },
    { angle: Math.PI * 1.5, colour: peacockRed },
  ];
  stages.forEach(({ angle, colour }) => {
    builder.cylinder("paint", colour, {
      radius: 0.11,
      length: 0.02,
      at: [x + Math.sin(angle) * 0.36, 1.25 + Math.cos(angle) * 0.36, z - 0.31],
      axis: "z",
      segments: 10,
    });
    const arrow = angle + Math.PI / 4;
    builder.box(
      "paint",
      palette.darkTimber,
      [0.16, 0.035, 0.02],
      [x + Math.sin(arrow) * 0.36, 1.25 + Math.cos(arrow) * 0.36, z - 0.3],
      [0, 0, -arrow],
    );
  });
  /* The sculptures on the log, left to right: egg, caterpillar, chrysalis, butterfly */
  const top = 0.44;
  /* An egg on a nettle leaf */
  builder.sphere(
    "paint",
    "#5d9a3a",
    0.16,
    [x - 0.8, top, z + 0.05],
    [1, 0.12, 0.7],
    8,
  );
  builder.sphere(
    "paint",
    "#f4f0d8",
    0.05,
    [x - 0.8, top + 0.05, z + 0.05],
    [1, 1.3, 1],
    8,
  );
  /* A caterpillar munching */
  for (let segment = 0; segment < 6; segment++) {
    builder.sphere(
      "paint",
      segment === 5
        ? shade(caterpillarGreen, 1.1)
        : shade(caterpillarGreen, segment % 2 === 0 ? 1 : 0.85),
      segment === 5 ? 0.07 : 0.055,
      [
        x - 0.48 + segment * 0.07,
        top + 0.05 + (segment === 5 ? 0.03 : Math.sin(segment) * 0.02),
        z + 0.05,
      ],
      [1, 1, 1],
      7,
    );
  }
  /* A chrysalis hanging from a twig */
  builder.bar(
    "matte",
    palette.darkTimber,
    [x + 0.05, top, z],
    [x + 0.2, top + 0.55, z],
    0.03,
    4,
  );
  builder.bar(
    "matte",
    palette.darkTimber,
    [x + 0.15, top + 0.4, z],
    [x + 0.35, top + 0.42, z],
    0.02,
    4,
  );
  builder.lathe(
    "paint",
    chrysalisGreen,
    [
      [0, 0],
      [0.03, 0.03],
      [0.05, 0.1],
      [0.045, 0.16],
      [0.02, 0.2],
      [0, 0.21],
    ],
    [x + 0.32, top + 0.2, z],
    "y",
    8,
  );
  builder.box(
    "paint",
    "#d8b84a",
    [0.08, 0.01, 0.01],
    [x + 0.32, top + 0.33, z + 0.04],
  );
  /* A butterfly resting with its wings open */
  const butterfly: Triple = [x + 0.75, top + 0.03, z + 0.05];
  builder.cylinder("paint", palette.black, {
    radius: 0.02,
    length: 0.18,
    at: butterfly,
    axis: "z",
    segments: 6,
  });
  [-1, 1].forEach((side) => {
    builder.add("paint", peacockRed, new CylinderGeometry(0.1, 0.1, 0.01, 10), {
      at: [butterfly[0] + side * 0.1, butterfly[1], butterfly[2] + 0.03],
      scale: [1.1, 1, 0.8],
    });
    builder.add(
      "paint",
      shade(peacockRed, 0.8),
      new CylinderGeometry(0.07, 0.07, 0.01, 10),
      { at: [butterfly[0] + side * 0.08, butterfly[1], butterfly[2] - 0.07] },
    );
    builder.cylinder("paint", "#3a5ac8", {
      radius: 0.03,
      length: 0.014,
      at: [
        butterfly[0] + side * 0.14,
        butterfly[1] + 0.002,
        butterfly[2] + 0.06,
      ],
      segments: 8,
    });
  });
};

/* ------------------------------------------------------------------ */
/* The path and a puddling dish                                        */
/* ------------------------------------------------------------------ */

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", gravel, [1.1, 0.03, 4.2], [0, 0.015, 0.45]);
  if (builder.isFar) {
    return;
  }
  /* Edging bricks along the path */
  for (let brick = 0; brick < 10; brick++) {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        shade(palette.brick, brick % 2 === 0 ? 1 : 0.88),
        [0.08, 0.06, 0.38],
        [side * 0.6, 0.03, -1.45 + brick * 0.42],
      );
    });
  }
  /* A puddling dish: wet sand and pebbles where butterflies sip */
  const dish: Triple = [1.25, 0, 2.6];
  builder.cylinder("matte", "#b9a27a", {
    radius: 0.3,
    radiusEnd: 0.34,
    length: 0.06,
    at: [dish[0], 0.03, dish[2]],
    segments: 14,
  });
  builder.cylinder("water", "#c8b48a", {
    radius: 0.28,
    length: 0.02,
    at: [dish[0], 0.06, dish[2]],
    segments: 14,
  });
  [
    [0.1, 0.05],
    [-0.12, 0.08],
    [0.02, -0.14],
  ].forEach(([dx, dz]) => {
    builder.sphere(
      "matte",
      palette.darkStone,
      0.05,
      [dish[0] + dx, 0.07, dish[2] + dz],
      [1.2, 0.6, 1],
      6,
    );
  });
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

/** A clump of coneflowers on tall stems, nodding as someone passes. */
const buildConeflowers = (builder: AttractionBuilder) => {
  [
    [0, 0, 0.95],
    [0.18, 0.08, 0.8],
    [0.05, -0.15, 0.7],
  ].forEach(([dx, dz, height]) => {
    builder.bar("matte", "#4f8a2e", [0, 0, 0], [dx, height, dz], 0.025, 4);
    builder.cylinder("paint", coneflowerPink, {
      radius: 0.11,
      radiusEnd: 0.05,
      length: 0.04,
      at: [dx, height - 0.02, dz],
      segments: 10,
    });
    builder.sphere(
      "paint",
      coneflowerEye,
      0.045,
      [dx, height + 0.02, dz],
      [1, 0.8, 1],
      7,
    );
  });
  builder.sphere("matte", palette.leaf, 0.18, [0, 0.1, 0], [1.2, 0.6, 1.2], 8);
};

/** One wing of the giant butterfly on the arch: a forewing and a hindwing. */
const buildWing = (builder: AttractionBuilder, side: number) => {
  const fore: Triple = [side * 0.38, 0.12, 0];
  const hind: Triple = [side * 0.28, -0.2, 0];
  builder.add("paint", peacockRed, new CylinderGeometry(0.34, 0.34, 0.03, 14), {
    at: fore,
    rotation: [Math.PI / 2, 0, 0],
    scale: [1.15, 1, 0.85],
  });
  builder.add(
    "paint",
    shade(peacockRed, 0.85),
    new CylinderGeometry(0.24, 0.24, 0.03, 12),
    {
      at: hind,
      rotation: [Math.PI / 2, 0, 0],
    },
  );
  /* The peacock's eye spots, and dark wing edges */
  builder.cylinder("paint", "#f2d24a", {
    radius: 0.11,
    length: 0.04,
    at: [side * 0.5, 0.2, 0],
    axis: "z",
    segments: 12,
  });
  builder.cylinder("paint", "#3a5ac8", {
    radius: 0.065,
    length: 0.05,
    at: [side * 0.5, 0.2, 0],
    axis: "z",
    segments: 10,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.07,
    length: 0.04,
    at: [side * 0.3, -0.24, 0],
    axis: "z",
    segments: 10,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.03,
    length: 0.05,
    at: [side * 0.3, -0.24, 0],
    axis: "z",
    segments: 6,
  });
};

const buildButterflyBody = (builder: AttractionBuilder) => {
  const [x, y, z] = butterflyAt;
  builder.lathe(
    "paint",
    "#3a2a24",
    [
      [0, -0.4],
      [0.05, -0.3],
      [0.06, 0.1],
      [0.07, 0.22],
      [0.06, 0.3],
      [0, 0.34],
    ],
    [x, y, z],
    "y",
    builder.isFar ? 6 : 10,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [x, archTop, z],
    [x, y - 0.3, z],
    0.04,
    6,
  );
  if (builder.isFar) {
    builder.box("paint", peacockRed, [1.4, 0.6, 0.03], [x, y, z]);
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      palette.black,
      [x + side * 0.02, y + 0.32, z],
      [x + side * 0.16, y + 0.55, z + 0.04],
      0.015,
      3,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [x + side * 0.16, y + 0.55, z + 0.04],
      [1, 1, 1],
      6,
    );
  });
};

/* ------------------------------------------------------------------ */
/* Butterflies on the wing                                             */
/* ------------------------------------------------------------------ */

const buildFlyer = (wingColour: string) => (builder: AttractionBuilder) => {
  builder.cylinder("paint", palette.black, {
    radius: 0.012,
    length: 0.1,
    at: [0, 0, 0],
    axis: "z",
    segments: 5,
  });
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      wingColour,
      new CylinderGeometry(0.07, 0.07, 0.006, 8),
      {
        at: [side * 0.06, 0.03, 0.02],
        rotation: [0, 0, side * 0.6],
      },
    );
    builder.add(
      "paint",
      shade(wingColour, 0.85),
      new CylinderGeometry(0.05, 0.05, 0.006, 7),
      {
        at: [side * 0.045, 0.02, -0.04],
        rotation: [0, 0, side * 0.6],
      },
    );
  });
};

export const butterflyGardenModel: CuriosityModel = {
  kind: "butterfly-garden",
  islandId: "meadow-isle",
  name: "Butterfly Garden",
  fact: "Every butterfly starts life as a tiny egg laid on a leaf. A caterpillar hatches out and eats and eats until it is big, then it makes a hard case called a chrysalis. Inside, it changes completely, and a butterfly climbs out! Buddleia is called the butterfly bush because butterflies love to drink its sweet nectar.",
  curriculumLink:
    "Science, Year 2: notice that animals, including humans, have offspring which grow into adults (the life cycle of a butterfly).",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: -1.0, z: 3.3 },
  build: (builder) => {
    buildGrounds(builder);
    buildBeds(builder);
    buildArch(builder);
    buildLifeCycle(builder);
    buildButterflyBody(builder);
    addSignBoard(builder, [-1.0, 0, 3.3], signColour);
  },
  moving: [
    {
      name: "left coneflowers",
      pivot: [-1.1, 0.02, 1.9],
      build: buildConeflowers,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.22,
        period: 2.1,
      },
    },
    {
      name: "right coneflowers",
      pivot: [1.0, 0.02, 1.5],
      build: buildConeflowers,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.22,
        period: 2.5,
        phase: 1.3,
      },
    },
    {
      name: "giant butterfly's left wing",
      pivot: [butterflyAt[0] - 0.04, butterflyAt[1], butterflyAt[2]],
      build: (builder) => {
        buildWing(builder, -1);
      },
      motion: { kind: "swing", axis: "y", amplitude: 0.55, period: 2.6 },
    },
    {
      name: "giant butterfly's right wing",
      pivot: [butterflyAt[0] + 0.04, butterflyAt[1], butterflyAt[2]],
      build: (builder) => {
        buildWing(builder, 1);
      },
      motion: {
        kind: "swing",
        axis: "y",
        amplitude: 0.55,
        period: 2.6,
        phase: Math.PI,
      },
    },
  ],
  wanderers: [
    {
      name: "peacock butterflies",
      build: buildFlyer(peacockRed),
      count: 4,
      centre: { x: 0, z: 0 },
      radius: 3.0,
      speed: 0.9,
      height: 1.3,
      bob: 0.45,
    },
    {
      name: "brimstones",
      build: buildFlyer(brimstone),
      count: 3,
      centre: { x: 0, z: 0.5 },
      radius: 2.6,
      speed: 0.8,
      height: 1.0,
      bob: 0.5,
    },
  ],
  blockers: [
    ...bedCentres.map(({ x, z }) => ({ x, z, radius: 1.25 })),
    { x: -archHalfWidth, z: archZ, radius: 0.28 },
    { x: archHalfWidth, z: archZ, radius: 0.28 },
    { x: logAt.x, z: logAt.z, radius: 0.5 },
    { x: logAt.x - 0.7, z: logAt.z, radius: 0.35 },
    { x: logAt.x + 0.7, z: logAt.z, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Watch the butterflies",
    news: "Flutter, flutter! A peacock butterfly landed on the buddleia and uncurled its long tongue to sip the nectar.",
  },
};
