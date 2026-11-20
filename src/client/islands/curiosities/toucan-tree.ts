import { ExtrudeGeometry, Shape, SphereGeometry } from "three";
import {
  addBush,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const bark = "#6a5040";
const barkDark = "#4c382a";
const moss = "#6b9a3e";
const leafDeep = "#22662c";
const leafMid = "#2f8a35";
const leafBright = "#55aa3e";
const toucanBlack = "#1d1d22";
const bibYellow = "#f6d23c";
const billOrange = "#f39a1e";
const billRed = "#d9342b";
const eyeBlue = "#4fb0e8";
const figRed = "#b8324a";
const figPurple = "#6a2a5a";
const boxTimber = "#b0834f";
const heliconiaRed = "#e0402e";
const signColour = "#2f7d4a";

const tree = { x: 0, z: -0.8 };
const trunkRadius = 0.6;

/* Boughs, each from a height on the trunk out to a tip */
const boughs: { from: number; tip: Triple }[] = [
  { from: 1.9, tip: [1.75, 2.35, 0.05] },
  { from: 2.9, tip: [-1.95, 3.25, -0.35] },
  { from: 3.7, tip: [1.45, 4.1, -2.1] },
  { from: 4.2, tip: [-1.2, 4.5, -2.0] },
];
const branchThickness = 0.2;

/** A spot on top of a bough, a share of the way out to its tip. */
const perchOn = (index: number, share: number): Triple => {
  const { from, tip } = boughs[index];
  const start: Triple = [tree.x, from - 0.3, tree.z];
  return [
    start[0] + (tip[0] - start[0]) * share,
    start[1] + (tip[1] - start[1]) * share + branchThickness / 2 - 0.02,
    start[2] + (tip[2] - start[2]) * share,
  ];
};

const nodderAt = perchOn(0, 0.82);
const hummingbirdAt: Triple = [-2.35, 1.15, 1.35];

/** A buttress root, a thin curved fin flaring out from the trunk. */
const addButtress = (
  builder: AttractionBuilder,
  angle: number,
  reach: number,
  height: number,
) => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(reach, 0);
  shape.quadraticCurveTo(reach * 0.2, height * 0.2, 0, height);
  shape.lineTo(0, 0);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: false,
    curveSegments: builder.segments(8, 3),
  });
  geometry.translate(0, 0, -0.09);
  builder.add("matte", bark, geometry, {
    at: [tree.x, 0, tree.z],
    rotation: [0, angle, 0],
  });
};

/**
 * A toucan perched at `at`, facing `turn`: black body, yellow bib, and
 * the huge, light, colourful bill it uses to reach fruit.
 */
const addToucan = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  size = 1,
) => {
  if (builder.isFar) {
    return;
  }
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + (x * Math.cos(turn) + z * Math.sin(turn)) * size,
    at[1] + y * size,
    at[2] + (-x * Math.sin(turn) + z * Math.cos(turn)) * size,
  ];
  builder.sphere(
    "paint",
    toucanBlack,
    0.16 * size,
    place(0, 0.24, 0),
    [0.85, 1.2, 0.9],
    12,
  );
  builder.sphere(
    "paint",
    bibYellow,
    0.1 * size,
    place(0, 0.34, 0.08),
    [0.95, 1, 0.6],
    10,
  );
  builder.sphere(
    "paint",
    toucanBlack,
    0.1 * size,
    place(0, 0.46, 0.02),
    [1, 1, 1],
    10,
  );
  /* The bill: as long as its body, but hollow and light */
  builder.add(
    "paint",
    billOrange,
    new SphereGeometry(0.1, builder.segments(12, 6), builder.segments(8, 4)),
    {
      at: place(0, 0.46, 0.22),
      rotation: [0.25, turn, 0],
      scale: [0.5 * size, 0.62 * size, 1.7 * size],
    },
  );
  builder.add(
    "paint",
    billRed,
    new SphereGeometry(0.045, builder.segments(8, 4), builder.segments(6, 3)),
    {
      at: place(0, 0.42, 0.37),
      rotation: [0.25, turn, 0],
      scale: [0.8 * size, 0.8 * size, 1.4 * size],
    },
  );
  builder.add(
    "paint",
    "#2a8f4a",
    new SphereGeometry(0.05, builder.segments(8, 4), builder.segments(6, 3)),
    {
      at: place(0, 0.5, 0.17),
      rotation: [0.3, turn, 0],
      scale: [0.75 * size, 0.6 * size, 1.4 * size],
    },
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      eyeBlue,
      0.03 * size,
      place(side * 0.07, 0.49, 0.05),
      [0.6, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.015 * size,
      place(side * 0.09, 0.49, 0.06),
      [1, 1, 1],
      5,
    );
    builder.box(
      "metal",
      "#4b6a8a",
      [0.03 * size, 0.04 * size, 0.06 * size],
      place(side * 0.05, 0.02, 0.03),
      [0, turn, 0],
    );
  });
  /* A long black tail, a red patch under it, and white rump feathers */
  builder.box(
    "paint",
    toucanBlack,
    [0.12 * size, 0.04 * size, 0.32 * size],
    place(0, 0.12, -0.2),
    [0.8, turn, 0],
  );
  builder.sphere(
    "paint",
    billRed,
    0.05 * size,
    place(0, 0.1, -0.06),
    [1, 0.6, 0.8],
    6,
  );
};

const addLeafClump = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  colour: string,
) => {
  builder.sphere("matte", colour, radius, at, [1, 0.72, 1], 12);
};

const buildTree = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    bark,
    [
      [0.95, 0],
      [0.72, 0.45],
      [trunkRadius, 1.3],
      [0.52, 3.2],
      [0.42, 4.8],
      [0.2, 5.8],
      [0, 5.9],
    ],
    [tree.x, 0, tree.z],
    "y",
    builder.isFar ? 8 : 16,
  );
  if (builder.isFar) {
    addLeafClump(builder, [tree.x, 5.6, tree.z - 0.4], 2.6, leafMid);
    boughs.slice(0, 2).forEach(({ from, tip }) => {
      builder.bar(
        "matte",
        bark,
        [tree.x, from, tree.z],
        tip,
        branchThickness,
        4,
      );
    });
    return;
  }
  for (let index = 0; index < 6; index++) {
    addButtress(
      builder,
      index * 1.05 + 0.3,
      1.3 + (index % 2) * 0.25,
      1.6 + (index % 3) * 0.3,
    );
  }
  builder.cylinder("matte", moss, {
    radius: 0.57,
    radiusEnd: 0.54,
    length: 0.6,
    at: [tree.x, 2.55, tree.z],
    segments: 14,
    isOpen: true,
  });
  boughs.forEach(({ from, tip }, index) => {
    builder.bar(
      "matte",
      bark,
      [tree.x, from - 0.3, tree.z],
      tip,
      branchThickness,
      8,
    );
    /* Leaves over each bough, and a hanging bunch of figs */
    addLeafClump(
      builder,
      [tip[0] * 1.05, tip[1] + 0.85, tip[2] * 1.02],
      0.95,
      index % 2 === 0 ? leafDeep : leafBright,
    );
    const bunch: Triple = [
      tree.x + (tip[0] - tree.x) * 0.7,
      tip[1] - 0.15,
      tree.z + (tip[2] - tree.z) * 0.7,
    ];
    builder.bar(
      "matte",
      barkDark,
      [bunch[0], bunch[1] + 0.12, bunch[2]],
      bunch,
      0.02,
      3,
    );
    [
      [0, 0, 0],
      [0.07, -0.05, 0.03],
      [-0.06, -0.06, 0.02],
      [0.01, -0.11, -0.04],
    ].forEach(([dx, dy, dz], fig) => {
      builder.sphere(
        "paint",
        fig % 2 === 0 ? figRed : figPurple,
        0.06,
        [bunch[0] + dx, bunch[1] + dy, bunch[2] + dz],
        [1, 1.1, 1],
        6,
      );
    });
  });
  addLeafClump(builder, [tree.x, 5.7, tree.z - 0.3], 1.8, leafMid);
  addLeafClump(builder, [tree.x + 0.9, 6.3, tree.z - 0.8], 1.1, leafDeep);
  addLeafClump(builder, [tree.x - 1.0, 5.9, tree.z - 1.2], 1.2, leafBright);
  /* A liana looping down from the lowest bough */
  builder.bar("matte", moss, [1.2, 2.25, -0.25], [1.05, 0.9, 0.05], 0.04, 5);
  builder.bar("matte", moss, [1.05, 0.9, 0.05], [0.75, 1.6, -0.2], 0.04, 5);
};

/** A bird box on the trunk, its round door facing the visitors. */
const buildBirdBox = (builder: AttractionBuilder) => {
  const front = tree.z + 0.56;
  const at: Triple = [-0.1, 1.55, front + 0.17];
  builder.box("matte", boxTimber, [0.36, 0.44, 0.32], at);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(boxTimber, 0.75),
      [0.24, 0.04, 0.42],
      [at[0] + side * 0.1, at[1] + 0.27, at[2]],
      [0, 0, side * -0.55],
    );
  });
  builder.cylinder("matte", palette.black, {
    radius: 0.07,
    length: 0.02,
    at: [at[0], at[1] + 0.05, at[2] + 0.16],
    axis: "z",
    segments: 12,
  });
  builder.cylinder("matte", barkDark, {
    radius: 0.015,
    length: 0.12,
    at: [at[0], at[1] - 0.1, at[2] + 0.21],
    axis: "z",
    segments: 5,
  });
};

/** A classification key for birds, a branching chart on a board. */
const buildBirdKey = (builder: AttractionBuilder) => {
  const at = { x: -1.75, z: 3.4 };
  [-0.45, 0.45].forEach((side) => {
    builder.box(
      "matte",
      barkDark,
      [0.07, 1.1, 0.07],
      [at.x + side, 0.55, at.z],
    );
  });
  builder.box("paint", "#efe4c8", [1.05, 0.7, 0.05], [at.x, 1.1, at.z + 0.03]);
  if (builder.isFar) {
    return;
  }
  /* A stem, then branches splitting in two, then two again */
  const face = at.z + 0.065;
  builder.box(
    "paint",
    palette.darkTimber,
    [0.03, 0.18, 0.01],
    [at.x, 1.33, face],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.darkTimber,
      [0.3, 0.025, 0.01],
      [at.x + side * 0.15, 1.23, face],
    );
    [-1, 1].forEach((twig) => {
      const x = at.x + side * 0.3 + twig * 0.12;
      builder.box(
        "paint",
        palette.darkTimber,
        [0.025, 0.14, 0.01],
        [x, 1.12, face],
      );
      builder.sphere(
        "paint",
        side < 0
          ? twig < 0
            ? billOrange
            : eyeBlue
          : twig < 0
            ? heliconiaRed
            : leafBright,
        0.05,
        [x, 0.98, face],
        [1, 1, 0.3],
        8,
      );
    });
  });
  builder.box(
    "paint",
    shade(signColour, 1),
    [1.12, 0.06, 0.07],
    [at.x, 1.47, at.z + 0.03],
  );
};

const buildHeliconia = (builder: AttractionBuilder) => {
  const base = { x: -2.6, z: 1.6 };
  if (builder.isFar) {
    return;
  }
  for (let leaf = 0; leaf < 5; leaf++) {
    const turn = leaf * 1.3;
    builder.box(
      "matte",
      leaf % 2 === 0 ? leafBright : leafMid,
      [0.24, 0.02, 1.0],
      [base.x + Math.sin(turn) * 0.3, 0.75, base.z + Math.cos(turn) * 0.3],
      [-0.9, turn, 0],
    );
  }
  builder.bar(
    "matte",
    leafMid,
    [base.x, 0, base.z],
    [base.x + 0.1, 1.35, base.z - 0.05],
    0.04,
    5,
  );
  /* Zig-zag red bracts, like lobster claws, that hummingbirds feed from */
  for (let bract = 0; bract < 5; bract++) {
    const side = bract % 2 === 0 ? 1 : -1;
    builder.cylinder("paint", bract === 0 ? bibYellow : heliconiaRed, {
      radius: 0.05,
      radiusEnd: 0.005,
      length: 0.22,
      at: [base.x + 0.1 + side * 0.08, 1.3 - bract * 0.12, base.z - 0.05],
      axis: "x",
      segments: 6,
    });
  }
};

const buildGround = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#4f3b29", {
    radius: 2.6,
    length: 0.03,
    at: [tree.x, 0.015, tree.z],
    segments: builder.segments(28, 10),
  });
  if (builder.isFar) {
    return;
  }
  /* Fallen figs and seeds the birds dropped */
  [
    [1.3, 0.7],
    [1.7, 0.4],
    [-1.4, 0.9],
    [0.6, 1.4],
    [-0.8, 1.5],
  ].forEach(([x, z], index) => {
    builder.sphere(
      "paint",
      index % 2 === 0 ? figRed : figPurple,
      0.06,
      [x, 0.06, z],
      [1, 0.8, 1],
      6,
    );
  });
  /* A log to sit on and watch */
  builder.cylinder("matte", barkDark, {
    radius: 0.22,
    length: 1.5,
    at: [1.9, 0.22, 2.4],
    axis: "x",
    segments: 12,
  });
  builder.cylinder("matte", boxTimber, {
    radius: 0.2,
    length: 1.52,
    at: [1.9, 0.22, 2.4],
    axis: "x",
    segments: 12,
    isOpen: true,
  });
  addBush(builder, [3.2, 0, -1.0], 0.55, leafDeep);
  addBush(builder, [-3.0, 0, -1.6], 0.6, leafMid);
  addBush(builder, [3.0, 0, 1.4], 0.4, leafBright);
};

const buildNodder = (builder: AttractionBuilder) => {
  addToucan(builder, [0, 0, 0], 0.5, 1.15);
};

const buildHummingbird = (builder: AttractionBuilder) => {
  builder.sphere("glow", "#2fbf8a", 0.05, [0, 0, 0], [0.8, 0.8, 1.5], 8);
  builder.sphere("paint", "#d6342c", 0.03, [0, -0.02, 0.05], [1, 0.8, 1], 6);
  builder.bar("matte", palette.black, [0, 0.01, 0.07], [0, 0, 0.18], 0.01, 3);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#cfe8e0",
      [0.14, 0.005, 0.05],
      [side * 0.08, 0.04, 0],
      [0, 0, side * 0.6],
    );
  });
  builder.box("paint", "#1f6a4a", [0.03, 0.01, 0.07], [0, 0, -0.09]);
};

const buildMacaw = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#d8282a", 0.1, [0, 0, 0], [0.75, 0.7, 1.5], 8);
  builder.sphere("paint", "#d8282a", 0.07, [0, 0.03, 0.15], [1, 1, 1], 6);
  builder.sphere("paint", "#f2efe6", 0.03, [0, 0.03, 0.22], [1, 1, 1], 5);
  builder.cylinder("paint", "#2a2a2a", {
    radius: 0.025,
    radiusEnd: 0.005,
    length: 0.07,
    at: [0, 0.01, 0.25],
    axis: "z",
    segments: 5,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      bibYellow,
      [0.2, 0.02, 0.16],
      [side * 0.14, 0.02, 0],
      [0, 0, side * 0.2],
    );
    builder.box(
      "paint",
      "#2f6fd0",
      [0.2, 0.021, 0.12],
      [side * 0.32, 0.06, -0.02],
      [0, 0, side * 0.2],
    );
  });
  builder.box("paint", "#d8282a", [0.06, 0.015, 0.4], [0, -0.01, -0.3]);
  builder.box("paint", "#2f6fd0", [0.04, 0.016, 0.2], [0, -0.005, -0.42]);
};

export const toucanTreeModel: CuriosityModel = {
  kind: "toucan-tree",
  islandId: "jungle-reach",
  name: "Toucan Tree",
  fact: "Toucans, parrots and hummingbirds are all birds: they have feathers, wings and beaks, and they lay eggs. A classification key sorts living things by asking questions, such as 'Does it have feathers?'. A toucan's huge bill looks heavy, but it is hollow and light, so it can reach fruit at the tips of branches.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Recognise that living things can be grouped in a variety of ways, and explore and use classification keys to group, identify and name them (birds).",
  footprint: 5,
  setting: "inland",
  signSpot: { x: 1.2, z: 4.1 },
  build: (builder) => {
    buildGround(builder);
    buildTree(builder);
    buildBirdBox(builder);
    addToucan(builder, perchOn(1, 0.82), -0.3);
    addToucan(builder, perchOn(2, 0.8), 0.4, 0.9);
    buildBirdKey(builder);
    buildHeliconia(builder);
    addSignBoard(builder, [1.2, 0, 4.1], signColour);
  },
  moving: [
    {
      name: "toucan",
      pivot: nodderAt,
      build: buildNodder,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.35,
        period: 1.6,
      },
    },
    {
      name: "hummingbird",
      pivot: hummingbirdAt,
      build: buildHummingbird,
      motion: { kind: "bob", height: 0.12, period: 0.9 },
    },
  ],
  wanderers: [
    {
      name: "scarlet macaws",
      build: buildMacaw,
      count: 3,
      centre: { x: 0, z: -0.6 },
      radius: 3.2,
      speed: 1.2,
      height: 4.6,
      bob: 0.25,
    },
  ],
  blockers: [
    { x: tree.x, z: tree.z, radius: 1.3 },
    { x: 1.9, z: 2.4, radius: 0.5 },
    { x: 1.3, z: 2.4, radius: 0.35 },
    { x: 2.5, z: 2.4, radius: 0.35 },
    { x: -1.75, z: 3.4, radius: 0.4 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Whistle to the toucans",
    news: "Pee-yip! The toucans bobbed their big bright bills and croaked back. They are birds, so they have feathers and lay eggs.",
  },
};
