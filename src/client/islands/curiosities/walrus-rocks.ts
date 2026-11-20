import { SphereGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowShadow = "#d9e3ea";
const rockGrey = "#7d8691";
const rockDark = "#5c646e";
const walrusHide = "#a97a63";
const walrusPale = "#c89c84";
const tuskIvory = "#f3ead2";
const poolBlue = "#2f7fa6";
const poolDeep = "#163f5c";
const floeWhite = "#eef6fa";
const gullGrey = "#9aa4ad";
const beakYellow = "#f2b62e";
const signColour = "#355f7a";

const pool = { x: 0.5, z: -0.5, radius: 1.5 };
const waterLevel = 0.1;
/* The lounging walruses: where each lies, which way it faces, and how high its rock is */
interface Lounger {
  at: Triple;
  turn: number;
}
const loungers: Lounger[] = [
  { at: [2.65, 0.3, -1.85], turn: -Math.PI / 2 - 0.5 },
  { at: [0.0, 0.42, -2.75], turn: 0.25 },
];
const nodder: Lounger = { at: [-2.25, 0.28, 0.15], turn: Math.PI / 2 - 0.35 };
const swimmerAt: Triple = [0.95, -1.0, -0.15];
const signAt: Triple = [2.0, 0, 4.0];

/** Turns a point about y by `turn` and moves it to `at`. */
const placeAt =
  (at: Triple, turn: number) =>
  (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];

/** A stretched sphere, turned about y, for bodies, flippers and boulders. */
const addBlob = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  radius: number,
  scale: Triple,
  at: Triple,
  turn: number,
  segments: number,
) => {
  const around = builder.segments(segments);
  builder.add(
    finish,
    colour,
    new SphereGeometry(radius, around, Math.max(3, Math.round(around * 0.66)))
      .scale(...scale)
      .rotateY(turn),
    { at },
  );
};

/** A walrus's head, whiskery muzzle and tusks, from the neck at `place(0, 0, 0)`. */
const addWalrusHead = (
  builder: AttractionBuilder,
  place: (x: number, y: number, z: number) => Triple,
  turn: number,
) => {
  addBlob(
    builder,
    "matte",
    walrusHide,
    0.27,
    [1.05, 0.9, 1],
    place(0, 0.22, 0.2),
    turn,
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      walrusPale,
      0.13,
      place(side * 0.09, 0.13, 0.42),
      [1, 0.9, 1],
      8,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.028,
      place(side * 0.13, 0.32, 0.38),
      [1, 1, 1],
      6,
    );
    builder.cylinder("paint", tuskIvory, {
      radius: 0.012,
      radiusEnd: 0.038,
      length: 0.42,
      at: place(side * 0.07, -0.13, 0.5),
      segments: 7,
    });
    /* Stiff whiskers on the muzzle */
    [0.06, 0.12, 0.18].forEach((up, index) => {
      builder.box(
        "matte",
        palette.cream,
        [0.12, 0.012, 0.012],
        place(side * 0.17, 0.1 + up * 0.3, 0.46 - index * 0.03),
        [0, turn, side * (0.2 - index * 0.15)],
      );
    });
  });
  builder.sphere(
    "matte",
    shade(walrusHide, 0.7),
    0.03,
    place(0, 0.22, 0.5),
    [1.6, 0.8, 1],
    6,
  );
};

/** A walrus's great blubbery body and flippers, lying on its belly. */
const addWalrusBody = (
  builder: AttractionBuilder,
  place: (x: number, y: number, z: number) => Triple,
  turn: number,
) => {
  addBlob(
    builder,
    "matte",
    walrusHide,
    0.46,
    [1, 0.72, 1.55],
    place(0, 0.33, -0.25),
    turn,
    12,
  );
  addBlob(
    builder,
    "matte",
    shade(walrusHide, 1.06),
    0.32,
    [1.1, 0.85, 1],
    place(0, 0.4, 0.22),
    turn,
    10,
  );
  if (builder.isFar) {
    return;
  }
  /* Wrinkly folds round the neck */
  addBlob(
    builder,
    "matte",
    shade(walrusHide, 0.9),
    0.36,
    [1.05, 0.25, 0.4],
    place(0, 0.46, 0.05),
    turn,
    10,
  );
  [-1, 1].forEach((side) => {
    addBlob(
      builder,
      "matte",
      shade(walrusHide, 0.82),
      0.2,
      [0.55, 0.18, 1],
      place(side * 0.42, 0.06, 0.25),
      turn + side * 0.6,
      8,
    );
    addBlob(
      builder,
      "matte",
      shade(walrusHide, 0.82),
      0.18,
      [0.6, 0.16, 1],
      place(side * 0.17, 0.08, -0.95),
      turn - side * 0.45,
      8,
    );
  });
};

const addWalrus = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  hasHead: boolean,
) => {
  const place = placeAt(at, turn);
  addWalrusBody(builder, place, turn);
  if (hasHead && !builder.isFar) {
    addWalrusHead(builder, placeAt(place(0, 0.45, 0.38), turn), turn);
  }
};

/** A flat-topped rock for a walrus to lie on, dusted with snow. */
const addSlab = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  turn: number,
) => {
  addBlob(
    builder,
    "matte",
    rockGrey,
    size,
    [1.3, 0.42, 1],
    [at[0], at[1] * 0.45, at[2]],
    turn,
    10,
  );
  if (!builder.isFar) {
    addBlob(
      builder,
      "matte",
      snow,
      size * 0.7,
      [1.2, 0.18, 0.9],
      [at[0] - size * 0.3, at[1] * 0.8, at[2] + size * 0.2],
      turn,
      8,
    );
  }
};

const buildRocks = (builder: AttractionBuilder) => {
  /* A craggy outcrop behind the pool, snow lying on its ledges */
  const crags: { at: Triple; size: number; scale: Triple }[] = [
    { at: [-1.4, 0.6, -3.4], size: 0.9, scale: [1.2, 0.95, 0.9] },
    { at: [1.3, 0.7, -3.6], size: 1.0, scale: [1.3, 1.0, 0.85] },
    { at: [3.2, 0.45, -3.0], size: 0.7, scale: [1.1, 0.9, 1] },
    { at: [-0.1, 1.25, -3.8], size: 0.65, scale: [1.2, 1, 0.9] },
  ];
  crags.forEach(({ at, size, scale }, index) => {
    addBlob(
      builder,
      "matte",
      index % 2 === 0 ? rockGrey : rockDark,
      size,
      scale,
      at,
      index * 0.7,
      builder.isFar ? 8 : 10,
    );
    if (!builder.isFar) {
      addBlob(
        builder,
        "matte",
        snow,
        size * 0.75,
        [scale[0] * 1.05, 0.3, scale[2]],
        [at[0], at[1] + size * scale[1] * 0.75, at[2] + 0.05],
        index * 0.7,
        10,
      );
    }
  });
  addSlab(builder, loungers[0].at, 0.75, 0.4);
  addSlab(builder, loungers[1].at, 0.8, -0.2);
  addSlab(builder, nodder.at, 0.72, 0.9);
};

const buildPool = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 14 : 36;
  builder.cylinder("matte", poolDeep, {
    radius: pool.radius,
    length: 0.04,
    at: [pool.x, 0.03, pool.z],
    segments,
  });
  builder.cylinder("water", poolBlue, {
    radius: pool.radius,
    length: 0.04,
    at: [pool.x, waterLevel, pool.z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  /* Ice round the edge, rocks on the rim and floes drifting */
  builder.torus(
    "glass",
    "#cfeaf4",
    pool.radius,
    0.08,
    [pool.x, waterLevel + 0.01, pool.z],
    "y",
    24,
  );
  for (let stone = 0; stone < 11; stone++) {
    const angle = (stone / 11) * Math.PI * 2 + 0.2;
    const wobble = 0.12 + ((stone * 5) % 3) * 0.05;
    addBlob(
      builder,
      "matte",
      stone % 3 === 0 ? rockDark : rockGrey,
      wobble + 0.08,
      [1.3, 0.6, 1],
      [
        pool.x + Math.sin(angle) * (pool.radius + 0.15),
        0.06,
        pool.z + Math.cos(angle) * (pool.radius + 0.15),
      ],
      angle,
      7,
    );
  }
  [
    { x: -0.2, z: -0.95, radius: 0.36 },
    { x: 1.2, z: -1.3, radius: 0.22 },
    { x: 0.1, z: 0.4, radius: 0.18 },
  ].forEach(({ x, z, radius }) => {
    builder.cylinder("matte", floeWhite, {
      radius,
      radiusEnd: radius * 0.92,
      length: 0.06,
      at: [x, waterLevel + 0.02, z],
      segments: 7,
    });
  });
};

const buildProps = (builder: AttractionBuilder) => {
  builder.box("matte", snowShadow, [1.4, 0.02, 2.6], [1.0, 0.01, 2.9]);
  if (builder.isFar) {
    return;
  }
  /* The keeper's bucket of fish, and a coil of rope */
  const bucket: Triple = [-0.9, 0, 1.9];
  builder.cylinder("paint", "#3a6ea8", {
    radius: 0.2,
    radiusEnd: 0.24,
    length: 0.32,
    at: [bucket[0], 0.16, bucket[2]],
    segments: 14,
  });
  builder.torus(
    "metal",
    palette.darkSteel,
    0.22,
    0.012,
    [bucket[0], 0.38, bucket[2]],
    "x",
    12,
  );
  [0, 1, 2].forEach((fish) => {
    builder.sphere(
      "metal",
      "#9fb4c2",
      0.06,
      [bucket[0] - 0.08 + fish * 0.08, 0.34, bucket[2] + (fish % 2) * 0.05],
      [0.6, 0.6, 1.8],
      6,
    );
  });
  builder.torus(
    "matte",
    palette.thatch,
    0.18,
    0.035,
    [-1.5, 0.04, 2.3],
    "y",
    14,
  );
  builder.torus(
    "matte",
    palette.thatch,
    0.12,
    0.035,
    [-1.5, 0.1, 2.3],
    "y",
    12,
  );
  [
    [-3.4, 2.0, 0.55],
    [3.6, 1.0, 0.5],
    [-3.6, -2.2, 0.5],
    [0.3, 3.6, 0.35],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
  /* Pebbles on the shore */
  [
    [1.9, 1.4],
    [2.3, 1.1],
    [-1.4, 1.2],
    [-0.4, 1.5],
  ].forEach(([x, z], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? rockDark : rockGrey,
      0.1,
      [x, 0.04, z],
      [1.3, 0.6, 1],
      6,
    );
  });
};

/** The walrus in the pool, head and shoulders, which pops up out of the water. */
const buildSwimmer = (builder: AttractionBuilder) => {
  const turn = 0.5;
  const place = placeAt([0, 0, 0], turn);
  addBlob(
    builder,
    "matte",
    walrusHide,
    0.4,
    [1, 1.2, 0.95],
    place(0, 0.3, -0.1),
    turn,
    10,
  );
  addWalrusHead(builder, placeAt(place(0, 0.5, 0.12), turn), turn);
  [-1, 1].forEach((side) => {
    addBlob(
      builder,
      "matte",
      shade(walrusHide, 0.82),
      0.2,
      [0.5, 0.18, 1],
      place(side * 0.42, 0.62, 0.1),
      turn + side * 0.5,
      8,
    );
  });
};

/** The head of the walrus on the rock, nodding hello. */
const buildNodderHead = (builder: AttractionBuilder) => {
  addWalrusHead(builder, placeAt([0, 0, 0], nodder.turn), nodder.turn);
};

const nodderNeck = placeAt(nodder.at, nodder.turn)(0, 0.45, 0.38);

const buildGull = (builder: AttractionBuilder) => {
  builder.sphere("paint", palette.white, 0.1, [0, 0, 0], [0.8, 0.75, 1.7], 8);
  builder.sphere("paint", palette.white, 0.065, [0, 0.06, 0.15], [1, 1, 1], 8);
  builder.box("paint", beakYellow, [0.025, 0.025, 0.08], [0, 0.05, 0.24]);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      gullGrey,
      [0.32, 0.015, 0.13],
      [side * 0.18, 0.05, 0],
      [0, 0, side * 0.3],
    );
    builder.box(
      "paint",
      palette.black,
      [0.08, 0.016, 0.1],
      [side * 0.36, 0.1, -0.01],
      [0, 0, side * 0.3],
    );
  });
  builder.box("paint", palette.white, [0.08, 0.015, 0.1], [0, 0.02, -0.18]);
};

export const walrusRocksModel: CuriosityModel = {
  kind: "walrus-rocks",
  islandId: "frost-isle",
  name: "Walrus Rocks",
  fact: "Walruses live on the ice and rocks of the cold Arctic. Under their wrinkly skin is a thick layer of fat called blubber, which keeps them warm in icy water. Their long tusks help them haul out onto the ice, and their stiff whiskers feel for clams on the dark sea floor. Their habitat gives them everything they need.",
  curriculumLink:
    "Science, Year 2: living things and their habitats. Identify that most living things live in habitats to which they are suited and describe how different habitats provide for the basic needs of different kinds of animals.",
  footprint: 5,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildRocks(builder);
    buildPool(builder);
    buildProps(builder);
    loungers.forEach(({ at, turn }) => {
      addWalrus(builder, at, turn, true);
    });
    addWalrus(builder, nodder.at, nodder.turn, false);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "swimming walrus",
      pivot: swimmerAt,
      build: buildSwimmer,
      motion: { kind: "rise", reach: 6, height: 1.05, period: 2.2 },
    },
    {
      name: "nodding walrus's head",
      pivot: nodderNeck,
      build: buildNodderHead,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.22,
        period: 1.4,
      },
    },
  ],
  wanderers: [
    {
      name: "seagulls",
      build: buildGull,
      count: 3,
      centre: { x: 0.3, z: -1.0 },
      radius: 2.6,
      speed: 0.9,
      height: 3.0,
      bob: 0.25,
    },
  ],
  blockers: [
    { x: pool.x, z: pool.z, radius: pool.radius + 0.2 },
    { x: -1.4, z: -3.4, radius: 1.0 },
    { x: 1.3, z: -3.6, radius: 1.1 },
    { x: 3.2, z: -3.0, radius: 0.75 },
    { x: loungers[0].at[0], z: loungers[0].at[2], radius: 0.85 },
    { x: loungers[1].at[0], z: loungers[1].at[2], radius: 0.85 },
    { x: nodder.at[0], z: nodder.at[2], radius: 0.85 },
    { x: -0.9, z: 1.9, radius: 0.3 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Count the tusks",
    news: "Two, four, six, eight! Four walruses with two tusks each. The biggest one gave a proud, whiskery snort.",
  },
};
