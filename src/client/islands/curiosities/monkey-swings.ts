import {
  addBush,
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const bark = "#6b4e38";
const barkDark = "#4a3526";
const vine = "#5b8a32";
const vineDark = "#3f6a28";
const leafDeep = "#246a2c";
const leafMid = "#338c37";
const leafBright = "#5aae40";
const fur = "#7a5232";
const furDark = "#5a3a22";
const face = "#e6bf94";
const tyreBlack = "#2a2a2e";
const ropeColour = "#c9b07e";
const bananaYellow = "#f3d23a";
const chips = "#8a6a48";
const signColour = "#3f7a2f";

/* Two gnarled trunks, with a great bough across the top */
const postX = 2.6;
const frameZ = -0.4;
const beamHeight = 3.3;
const beamSag = 0.18;
const beamHeightAt = (x: number): number =>
  beamHeight - beamSag * (1 - (x / postX) ** 2);

const vineDrop = 1.55;
const monkeyVines = [
  { x: -1.7, phase: 0 },
  { x: -0.55, phase: Math.PI },
];
const monkeyMotion = (phase: number): Motion => ({
  kind: "swing",
  axis: "x",
  amplitude: 0.45,
  period: 2.8,
  phase,
});

const tyreX = 1.15;
const tyrePivot: Triple = [tyreX, beamHeightAt(tyreX) - 0.1, frameZ];
const tyreDrop = 2.55;
const tyreMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.5,
  period: 3.2,
};
const swingStart = { x: tyreX, z: 0.95 };
const swingFinish = { x: tyreX + 1.05, z: 1.15 };

const peekerAt = { x: -2.3, z: 1.35 };

const addLeafClump = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  colour: string,
) => {
  builder.sphere("matte", colour, radius, at, [1, 0.75, 1], 12);
};

const buildPost = (builder: AttractionBuilder, side: number) => {
  const x = side * postX;
  builder.lathe(
    "matte",
    bark,
    [
      [0.5, 0],
      [0.36, 0.35],
      [0.28, 1.2],
      [0.25, 2.6],
      [0.22, beamHeight + 0.2],
      [0, beamHeight + 0.3],
    ],
    [x, 0, frameZ],
    "y",
    builder.isFar ? 7 : 14,
  );
  if (builder.isFar) {
    addLeafClump(builder, [x, beamHeight + 0.9, frameZ], 1.2, leafMid);
    return;
  }
  /* A fork above the bough, and leaves on top */
  builder.bar(
    "matte",
    bark,
    [x, beamHeight, frameZ],
    [x + side * 0.5, beamHeight + 1.0, frameZ - 0.2],
    0.18,
    8,
  );
  addLeafClump(
    builder,
    [x + side * 0.5, beamHeight + 1.35, frameZ - 0.2],
    0.85,
    leafDeep,
  );
  addLeafClump(
    builder,
    [x - side * 0.25, beamHeight + 0.85, frameZ + 0.2],
    0.75,
    leafMid,
  );
  /* Roots splaying out at the foot */
  for (let root = 0; root < 4; root++) {
    const angle = root * 1.57 + side * 0.4;
    builder.bar(
      "matte",
      barkDark,
      [x, 0.35, frameZ],
      [x + Math.sin(angle) * 0.75, 0.02, frameZ + Math.cos(angle) * 0.75],
      0.14,
      6,
    );
  }
  /* A vine spiralling up the trunk, with leaves */
  const turns = 9;
  for (let step = 0; step < turns; step++) {
    const from = (step / turns) * Math.PI * 4;
    const to = ((step + 1) / turns) * Math.PI * 4;
    const radius = 0.3;
    const point = (angle: number): Triple => [
      x + Math.sin(angle) * radius,
      0.2 + (angle / (Math.PI * 4)) * (beamHeight - 0.4),
      frameZ + Math.cos(angle) * radius,
    ];
    builder.bar("matte", vine, point(from), point(to), 0.04, 4);
    if (step % 2 === 0) {
      const [lx, ly, lz] = point(to);
      builder.sphere("matte", leafBright, 0.1, [lx, ly, lz], [1, 0.3, 0.7], 6);
    }
  }
};

const buildBeam = (builder: AttractionBuilder) => {
  const points = builder.isFar ? 2 : 6;
  for (let step = 0; step < points; step++) {
    const from = -postX + (step / points) * postX * 2;
    const to = -postX + ((step + 1) / points) * postX * 2;
    builder.bar(
      "matte",
      bark,
      [from, beamHeightAt(from), frameZ],
      [to, beamHeightAt(to), frameZ],
      0.32,
      builder.isFar ? 6 : 10,
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Leaves along the bough, and lianas looping down from it */
  [-1.2, 0.2, 2.0].forEach((x, index) => {
    addLeafClump(
      builder,
      [x, beamHeightAt(x) + 0.3, frameZ - 0.1],
      0.5,
      index % 2 === 0 ? leafMid : leafBright,
    );
  });
  [
    [-2.2, -1.05],
    [0.3, 0.6],
  ].forEach(([from, to]) => {
    const middle = (from + to) / 2;
    const low = beamHeightAt(middle) - 1.2;
    builder.bar(
      "matte",
      vineDark,
      [from, beamHeightAt(from), frameZ + 0.1],
      [middle, low, frameZ + 0.15],
      0.05,
      5,
    );
    builder.bar(
      "matte",
      vineDark,
      [middle, low, frameZ + 0.15],
      [to, beamHeightAt(to), frameZ + 0.1],
      0.05,
      5,
    );
  });
  /* A bunch of bananas, hung up for the monkeys */
  const bunch: Triple = [2.0, beamHeightAt(2.0) - 0.55, frameZ + 0.05];
  builder.bar(
    "matte",
    barkDark,
    [bunch[0], beamHeightAt(2.0), bunch[2]],
    bunch,
    0.04,
    4,
  );
  for (let banana = 0; banana < 7; banana++) {
    const angle = (banana / 7) * Math.PI * 2;
    const height = bunch[1] - 0.1 - (banana % 2) * 0.14;
    builder.bar(
      "paint",
      bananaYellow,
      [
        bunch[0] + Math.sin(angle) * 0.05,
        height,
        bunch[2] + Math.cos(angle) * 0.05,
      ],
      [
        bunch[0] + Math.sin(angle) * 0.17,
        height + 0.17,
        bunch[2] + Math.cos(angle) * 0.17,
      ],
      0.06,
      5,
    );
  }
  builder.sphere(
    "matte",
    "#7a2a40",
    0.07,
    [bunch[0], bunch[1] - 0.35, bunch[2]],
    [0.8, 1.6, 0.8],
    6,
  );
};

/**
 * A spider monkey hanging from its vine by one hand, its long tail
 * curled. Its grip is at `at`, and it hangs below.
 */
const addMonkey = (
  builder: AttractionBuilder,
  at: Triple,
  isHanging: boolean,
) => {
  const [x, y, z] = at;
  const body: Triple = isHanging ? [x + 0.04, y - 0.62, z] : [x, y + 0.3, z];
  if (isHanging) {
    builder.bar(
      "matte",
      furDark,
      [x, y + 0.02, z],
      [body[0] - 0.02, body[1] + 0.12, z],
      0.07,
      5,
    );
  }
  builder.sphere("matte", fur, 0.16, body, [0.9, 1.25, 0.8], 10);
  builder.sphere(
    "matte",
    face,
    0.1,
    [body[0], body[1] - 0.02, body[2] + 0.08],
    [0.85, 1.1, 0.5],
    8,
  );
  const head: Triple = [body[0] - 0.08, body[1] + 0.27, body[2] + 0.03];
  builder.sphere("matte", fur, 0.12, head, [1, 0.95, 0.95], 10);
  builder.sphere(
    "matte",
    face,
    0.08,
    [head[0], head[1] - 0.01, head[2] + 0.07],
    [1, 0.9, 0.55],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.017,
      [head[0] + side * 0.035, head[1] + 0.02, head[2] + 0.115],
      [1, 1, 1],
      5,
    );
    builder.sphere(
      "matte",
      face,
      0.04,
      [head[0] + side * 0.12, head[1] + 0.01, head[2]],
      [0.5, 1, 1],
      6,
    );
    /* Long thin legs, and the other arm reaching out */
    builder.bar(
      "matte",
      furDark,
      [body[0] + side * 0.07, body[1] - 0.14, body[2]],
      [body[0] + side * 0.16, body[1] - 0.5, body[2] + 0.05],
      0.065,
      5,
    );
  });
  builder.sphere(
    "matte",
    furDark,
    0.014,
    [head[0], head[1] - 0.04, head[2] + 0.13],
    [1.6, 0.6, 1],
    4,
  );
  builder.bar(
    "matte",
    furDark,
    [body[0] - 0.1, body[1] + 0.1, body[2]],
    [body[0] - 0.42, body[1] - 0.05, body[2] + 0.1],
    0.06,
    5,
  );
  /* The tail curls into a hook it can hold on with, like a fifth hand */
  const tail: Triple[] = [
    [body[0], body[1] - 0.15, body[2] - 0.1],
    [body[0] + 0.15, body[1] - 0.45, body[2] - 0.18],
    [body[0] + 0.35, body[1] - 0.6, body[2] - 0.1],
    [body[0] + 0.45, body[1] - 0.45, body[2] - 0.05],
    [body[0] + 0.36, body[1] - 0.35, body[2] - 0.05],
  ];
  tail.slice(1).forEach((point, index) => {
    builder.bar("matte", furDark, tail[index], point, 0.04, 4);
  });
};

const buildMonkeyVine = (builder: AttractionBuilder) => {
  builder.bar("matte", vine, [0, 0, 0], [0, -vineDrop, 0], 0.05, 5);
  [0.35, 0.8].forEach((share) => {
    builder.sphere(
      "matte",
      leafBright,
      0.1,
      [0.04, -vineDrop * share, 0],
      [1, 0.3, 0.7],
      6,
    );
  });
  addMonkey(builder, [0, -vineDrop, 0], true);
};

const buildPeeker = (builder: AttractionBuilder) => {
  addMonkey(builder, [0, 0, 0.05], false);
};

const buildTyreSwing = (builder: AttractionBuilder) => {
  const knot = -tyreDrop + 0.85;
  builder.bar("matte", ropeColour, [0, 0, 0], [0, knot, 0], 0.05, 5);
  builder.sphere(
    "matte",
    shade(ropeColour, 0.85),
    0.06,
    [0, knot, 0],
    [1, 1, 1],
    6,
  );
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "matte",
      ropeColour,
      [0, knot, 0],
      [Math.sin(angle) * 0.36, -tyreDrop + 0.08, Math.cos(angle) * 0.36],
      0.035,
      4,
    );
  });
  builder.torus("matte", tyreBlack, 0.36, 0.13, [0, -tyreDrop, 0], "y", 20);
  builder.torus(
    "matte",
    shade(tyreBlack, 1.4),
    0.36,
    0.06,
    [0, -tyreDrop + 0.1, 0],
    "y",
    16,
  );
};

const buildGround = (builder: AttractionBuilder) => {
  builder.cylinder("matte", chips, {
    radius: 3.4,
    length: 0.04,
    at: [0, 0.02, 0],
    segments: builder.segments(30, 10),
  });
  if (builder.isFar) {
    return;
  }
  builder.torus("matte", barkDark, 3.4, 0.08, [0, 0.03, 0], "y", 30);
  /* Banana peels and a balancing log */
  [
    [-0.6, 1.6, 0.4],
    [0.4, 1.9, 2.1],
  ].forEach(([x, z, turn]) => {
    for (let strip = 0; strip < 3; strip++) {
      builder.box(
        "paint",
        shade(bananaYellow, 0.92),
        [0.05, 0.02, 0.17],
        [
          x + Math.sin(turn + strip * 2.1) * 0.07,
          0.05,
          z + Math.cos(turn + strip * 2.1) * 0.07,
        ],
        [0, turn + strip * 2.1, 0],
      );
    }
  });
  builder.cylinder("matte", bark, {
    radius: 0.17,
    length: 1.9,
    at: [-0.4, 0.17, -2.2],
    axis: "x",
    segments: 12,
  });
  addBush(builder, [-3.7, 0, -1.8], 0.55, leafDeep);
  addBush(builder, [3.7, 0, -1.5], 0.6, leafMid);
  addBush(builder, [3.4, 0, 1.9], 0.45, leafBright);
};

/** A sign about mammals, with a mother monkey and her baby painted on. */
const buildMammalBoard = (builder: AttractionBuilder) => {
  const at = { x: 2.9, z: 3.1 };
  builder.box("matte", barkDark, [0.08, 1.3, 0.08], [at.x, 0.65, at.z]);
  builder.box(
    "paint",
    "#efe4c8",
    [0.6, 0.45, 0.04],
    [at.x, 1.2, at.z + 0.05],
    [0, -0.4, 0],
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "paint",
    fur,
    0.09,
    [at.x - 0.08, 1.2, at.z + 0.1],
    [1, 1, 0.3],
    8,
  );
  builder.sphere(
    "paint",
    fur,
    0.05,
    [at.x + 0.1, 1.15, at.z + 0.03],
    [1, 1, 0.3],
    8,
  );
};

const swingRide = (progress: number, seconds: number): LocalSpot => {
  const seat: Triple = [
    tyrePivot[0],
    tyrePivot[1] - tyreDrop + 0.12,
    tyrePivot[2],
  ];
  const [x, y, z] = moveWithPose(
    tyrePivot,
    seat,
    findMotionPose(tyreMotion, seconds),
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? swingStart : swingFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: 0,
  };
};

export const monkeySwingsModel: CuriosityModel = {
  kind: "monkey-swings",
  islandId: "jungle-reach",
  name: "Monkey Swings",
  fact: "Monkeys are mammals, like us. Mammals have hair or fur, breathe air, and feed their babies on milk. Spider monkeys swing through the rainforest on their long arms, and hold on with their tails too, as if they had a fifth hand.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Recognise that living things can be grouped in a variety of ways (vertebrate groups: mammals).",
  footprint: 5,
  setting: "inland",
  signSpot: { x: -1.2, z: 4.1 },
  build: (builder) => {
    buildGround(builder);
    buildPost(builder, -1);
    buildPost(builder, 1);
    buildBeam(builder);
    buildMammalBoard(builder);
    addBush(builder, [peekerAt.x, 0, peekerAt.z], 0.7, leafMid);
    addSignBoard(builder, [-1.2, 0, 4.1], signColour);
  },
  moving: [
    ...monkeyVines.map(({ x, phase }) => ({
      name: "swinging monkey",
      pivot: [x, beamHeightAt(x) - 0.12, frameZ] satisfies Triple,
      build: buildMonkeyVine,
      motion: monkeyMotion(phase),
    })),
    {
      name: "tyre swing",
      pivot: tyrePivot,
      build: buildTyreSwing,
      motion: tyreMotion,
    },
    {
      name: "peeking monkey",
      pivot: [peekerAt.x, -0.15, peekerAt.z],
      build: buildPeeker,
      motion: { kind: "rise", reach: 6, height: 0.75, period: 1.8 },
    },
  ],
  rides: [
    {
      id: "tyre-swing",
      name: "the tyre swing",
      start: swingStart,
      reach: 0.5,
      seconds: 9,
      finish: swingFinish,
      follow: swingRide,
    },
  ],
  blockers: [
    { x: -postX, z: frameZ, radius: 0.55 },
    { x: postX, z: frameZ, radius: 0.55 },
    { x: peekerAt.x, z: peekerAt.z, radius: 0.7 },
    { x: -0.4, z: -2.2, radius: 0.35 },
    { x: 2.9, z: 3.1, radius: 0.25 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Swing like a monkey",
    news: "Ooh-ooh-aah-aah! You swung on the tyre while the spider monkeys swung beside you, holding on with their tails.",
  },
};
