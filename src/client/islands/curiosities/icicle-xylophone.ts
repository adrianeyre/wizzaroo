import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowShadow = "#d9e3ea";
const iceBlue = "#bfe6f5";
const iceDeep = "#8fcbe6";
const stageIce = "#cfeaf5";
const frameTimber = "#6f4a30";
const framePale = "#c99a68";
const pineGreen = "#2d5640";
const signColour = "#4a3a8a";
/* A rainbow of beads, one for each note, as on a child's xylophone */
const noteColours = [
  "#e2402f",
  "#f08a24",
  "#f2c12e",
  "#5fb84a",
  "#2fa6a0",
  "#3a7ac8",
  "#7a52c8",
  "#e2402f",
];

const beamHeight = 2.15;
const frameZ = -0.5;
const beamHalf = 2.05;
const icicleCount = 8;
const icicleSpacing = 0.45;
const beamAt: Triple = [0, beamHeight - 0.08, frameZ];
const strikerAt: Triple = [0, beamHeight - 0.1, frameZ + 0.22];
const stage = { x: 0, z: -0.3, radius: 2.5, height: 0.1 };
const signAt: Triple = [1.5, 0, 3.6];

/** Where an icicle hangs along the beam, lowest note on the left. */
const icicleX = (index: number) =>
  (index - (icicleCount - 1) / 2) * icicleSpacing;

/** How long an icicle is: longest for the lowest note, shortest for the highest. */
const icicleLength = (index: number) => 1.2 - index * 0.085;

/** One icicle bar, hung on a cord from the beam at the origin. */
const addIcicle = (builder: AttractionBuilder, index: number) => {
  const x = icicleX(index);
  const length = icicleLength(index);
  const top = -0.2;
  builder.bar("matte", palette.cream, [x, 0, 0], [x, top + 0.02, 0], 0.015, 4);
  builder.sphere(
    "paint",
    noteColours[index],
    0.055,
    [x, top + 0.02, 0],
    [1, 1, 1],
    10,
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.07,
    length: 0.04,
    at: [x, top - 0.04, 0],
    segments: 12,
  });
  /* The icicle itself: a lumpy, tapering spike of clear ice */
  builder.cylinder("glass", iceBlue, {
    radius: 0.012,
    radiusEnd: 0.085,
    length,
    at: [x, top - 0.06 - length / 2, 0],
    segments: 12,
  });
  builder.cylinder("glass", iceDeep, {
    radius: 0.05,
    radiusEnd: 0.095,
    length: length * 0.18,
    at: [x, top - 0.06 - length * 0.09, 0],
    segments: 12,
  });
  builder.sphere(
    "glass",
    palette.white,
    0.06,
    [x + 0.02, top - 0.06 - length * 0.42, 0.03],
    [1, 1.6, 1],
    8,
  );
  builder.sphere(
    "glass",
    iceBlue,
    0.018,
    [x, top - 0.08 - length, 0],
    [1, 1.5, 1],
    6,
  );
};

const buildIcicleGroup =
  (from: number, to: number) => (builder: AttractionBuilder) => {
    for (let index = from; index < to; index++) {
      addIcicle(builder, index);
    }
  };

const buildFrame = (builder: AttractionBuilder) => {
  /* The crossbeam, carried on an A-frame at each end */
  builder.box(
    "matte",
    frameTimber,
    [beamHalf * 2 + 0.3, 0.16, 0.18],
    [0, beamHeight, frameZ],
  );
  [-1, 1].forEach((side) => {
    const x = side * beamHalf;
    [-1, 1].forEach((lean) => {
      builder.bar(
        "matte",
        frameTimber,
        [x, 0, frameZ + lean * 0.65],
        [x, beamHeight + 0.05, frameZ],
        0.14,
        builder.isFar ? 4 : 6,
      );
    });
    if (builder.isFar) {
      return;
    }
    builder.bar(
      "matte",
      framePale,
      [x, 0.7, frameZ - 0.44],
      [x, 0.7, frameZ + 0.44],
      0.08,
      6,
    );
    /* A carved snowflake on each end, and a finial on top */
    for (let arm = 0; arm < 3; arm++) {
      const angle = (arm / 3) * Math.PI;
      builder.box(
        "paint",
        palette.white,
        [0.04, 0.42, 0.04],
        [x + side * 0.1, 1.35, frameZ],
        [angle, 0, 0],
      );
      [-1, 1].forEach((end) => {
        builder.box(
          "paint",
          palette.white,
          [0.035, 0.12, 0.035],
          [
            x + side * 0.1,
            1.35 + Math.cos(angle) * end * 0.15,
            frameZ + Math.sin(angle) * end * 0.15,
          ],
          [angle + 0.7, 0, 0],
        );
        builder.box(
          "paint",
          palette.white,
          [0.035, 0.12, 0.035],
          [
            x + side * 0.1,
            1.35 + Math.cos(angle) * end * 0.15,
            frameZ + Math.sin(angle) * end * 0.15,
          ],
          [angle - 0.7, 0, 0],
        );
      });
    }
    builder.sphere(
      "paint",
      noteColours[side > 0 ? 6 : 0],
      0.1,
      [x, beamHeight + 0.2, frameZ],
      [1, 1, 1],
      12,
    );
    builder.cylinder("matte", frameTimber, {
      radius: 0.07,
      length: 0.12,
      at: [x, beamHeight + 0.1, frameZ],
      segments: 8,
    });
    /* Little drifts piled against the feet */
    [-1, 1].forEach((lean) => {
      builder.sphere(
        "matte",
        snow,
        0.22,
        [x, 0.04, frameZ + lean * 0.65],
        [1.3, 0.55, 1.2],
        8,
      );
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Snow along the top of the beam, and hooks for the cords */
  builder.box(
    "matte",
    snow,
    [beamHalf * 2 + 0.2, 0.06, 0.2],
    [0, beamHeight + 0.11, frameZ],
  );
  builder.sphere(
    "matte",
    snow,
    0.18,
    [-0.9, beamHeight + 0.12, frameZ],
    [2.6, 0.4, 0.7],
    8,
  );
  for (let index = 0; index < icicleCount; index++) {
    builder.torus(
      "metal",
      palette.brass,
      0.03,
      0.008,
      [icicleX(index), beamHeight - 0.1, frameZ],
      "x",
      8,
    );
  }
  /* The note names painted along the beam's face */
  for (let index = 0; index < icicleCount; index++) {
    builder.box(
      "paint",
      noteColours[index],
      [0.18, 0.06, 0.01],
      [icicleX(index), beamHeight, frameZ + 0.095],
    );
  }
  builder.bar(
    "metal",
    palette.darkSteel,
    [0, beamHeight - 0.05, frameZ + 0.08],
    [0, beamHeight - 0.08, strikerAt[2]],
    0.03,
    5,
  );
};

/** The hanging striker: a mallet on a rod, swinging along the row of icicles. */
const buildStriker = (builder: AttractionBuilder) => {
  builder.bar("matte", framePale, [0, 0, 0], [0, -1.1, 0], 0.035, 6);
  builder.sphere("paint", noteColours[0], 0.09, [0, -1.15, 0], [1, 1, 1], 12);
  builder.cylinder("metal", palette.brass, {
    radius: 0.03,
    length: 0.05,
    at: [0, -0.02, 0],
    segments: 8,
  });
};

const buildStage = (builder: AttractionBuilder) => {
  builder.cylinder("matte", snowShadow, {
    radius: stage.radius + 0.12,
    radiusEnd: stage.radius + 0.02,
    length: stage.height - 0.02,
    at: [stage.x, (stage.height - 0.02) / 2, stage.z],
    segments: builder.isFar ? 14 : 36,
  });
  builder.cylinder("glass", stageIce, {
    radius: stage.radius,
    length: 0.02,
    at: [stage.x, stage.height - 0.01, stage.z],
    segments: builder.isFar ? 14 : 36,
  });
  if (builder.isFar) {
    return;
  }
  /* Scratches on the ice where skaters have twirled */
  [
    [-1.0, 0.8, 0.5, 0.4],
    [0.9, 0.9, 0.35, -0.6],
    [0.2, 1.5, 0.45, 1.1],
  ].forEach(([x, z, radius, turn]) => {
    builder.torus(
      "matte",
      palette.white,
      radius,
      0.006,
      [x, stage.height + 0.002, z],
      "y",
      14,
    );
    builder.box(
      "matte",
      palette.white,
      [radius * 1.6, 0.004, 0.012],
      [x + 0.1, stage.height + 0.003, z - 0.1],
      [0, turn, 0],
    );
  });
};

const buildProps = (builder: AttractionBuilder) => {
  builder.box("matte", snowShadow, [1.2, 0.02, 1.6], [1.2, 0.01, 2.7]);
  /* Snowy spruces behind */
  [
    { x: -3.1, z: -2.5, size: 1.0 },
    { x: 3.0, z: -2.4, size: 0.85 },
  ].forEach(({ x, z, size }) => {
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.1 * size,
      length: 0.6 * size,
      at: [x, 0.3 * size, z],
      segments: 6,
    });
    [0, 1].forEach((tier) => {
      builder.cylinder("matte", shade(pineGreen, 1 + tier * 0.08), {
        radius: (0.9 - tier * 0.32) * size,
        radiusEnd: 0.02,
        length: 1.4 * size,
        at: [x, (1.2 + tier * 0.95) * size, z],
        segments: 12,
      });
      if (!builder.isFar) {
        builder.cylinder("matte", snow, {
          radius: (0.9 - tier * 0.32) * size * 0.6,
          radiusEnd: 0.02,
          length: 0.7 * size,
          at: [x, (1.55 + tier * 0.95) * size, z],
          segments: 12,
        });
      }
    });
  });
  if (builder.isFar) {
    return;
  }
  /* A music stand with the scale written out, and a spare mallet */
  const stand: Triple = [-1.5, stage.height, 1.1];
  builder.bar(
    "metal",
    palette.black,
    [stand[0], stand[1], stand[2]],
    [stand[0], stand[1] + 1.0, stand[2]],
    0.03,
    6,
  );
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      palette.black,
      [stand[0], stand[1] + 0.25, stand[2]],
      [
        stand[0] + Math.sin(angle) * 0.25,
        stand[1],
        stand[2] + Math.cos(angle) * 0.25,
      ],
      0.025,
      4,
    );
  });
  builder.box(
    "paint",
    palette.black,
    [0.55, 0.38, 0.02],
    [stand[0], stand[1] + 1.12, stand[2] - 0.02],
    [-0.35, 0.5, 0],
  );
  builder.box(
    "paint",
    palette.cream,
    [0.5, 0.34, 0.01],
    [stand[0] + 0.006, stand[1] + 1.12, stand[2] - 0.008],
    [-0.35, 0.5, 0],
  );
  noteColours.forEach((colour, index) => {
    builder.sphere(
      "paint",
      colour,
      0.022,
      [
        stand[0] - 0.16 + index * 0.04 * Math.cos(0.5),
        stand[1] + 1.04 + index * 0.02,
        stand[2] + 0.01 - index * 0.04 * Math.sin(0.5),
      ],
      [1, 0.8, 0.4],
      6,
    );
  });
  builder.box(
    "paint",
    palette.black,
    [0.5, 0.03, 0.06],
    [stand[0], stand[1] + 0.93, stand[2] + 0.05],
    [0, 0.5, 0],
  );
  builder.bar(
    "matte",
    framePale,
    [stand[0] - 0.2, stand[1] + 0.97, stand[2] + 0.18],
    [stand[0] + 0.15, stand[1] + 0.97, stand[2] - 0.05],
    0.03,
    5,
  );
  builder.sphere(
    "paint",
    noteColours[5],
    0.07,
    [stand[0] + 0.17, stand[1] + 0.98, stand[2] - 0.06],
    [1, 1, 1],
    10,
  );
  /* A snow bench for the audience, and a snowman listening */
  addSnowBench(builder, [1.7, 0, 1.4]);
  const snowman: Triple = [2.5, 0, 0.6];
  builder.sphere(
    "matte",
    snow,
    0.36,
    [snowman[0], 0.3, snowman[2]],
    [1, 0.9, 1],
    14,
  );
  builder.sphere(
    "matte",
    snow,
    0.26,
    [snowman[0], 0.78, snowman[2]],
    [1, 1, 1],
    12,
  );
  builder.sphere(
    "matte",
    snow,
    0.19,
    [snowman[0], 1.17, snowman[2]],
    [1, 1, 1],
    12,
  );
  builder.cylinder("paint", "#f08a24", {
    radius: 0.035,
    radiusEnd: 0.005,
    length: 0.18,
    at: [snowman[0] - 0.06, 1.17, snowman[2] + 0.24],
    axis: "z",
    segments: 8,
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [snowman[0] + side * 0.07 - 0.04, 1.23, snowman[2] + 0.16],
      [1, 1, 1],
      6,
    );
    builder.bar(
      "matte",
      palette.darkTimber,
      [snowman[0] + side * 0.22, 0.85, snowman[2]],
      [snowman[0] + side * 0.5, 1.05, snowman[2] + 0.1],
      0.03,
      4,
    );
  });
  builder.torus(
    "matte",
    "#c8323a",
    0.17,
    0.05,
    [snowman[0], 0.99, snowman[2]],
    "y",
    14,
  );
  builder.box(
    "matte",
    "#c8323a",
    [0.1, 0.3, 0.04],
    [snowman[0] + 0.1, 0.85, snowman[2] + 0.17],
  );
  builder.cylinder("paint", palette.black, {
    radius: 0.13,
    length: 0.18,
    at: [snowman[0], 1.4, snowman[2]],
    segments: 12,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.2,
    length: 0.02,
    at: [snowman[0], 1.32, snowman[2]],
    segments: 12,
  });
  [
    [-3.0, 1.2, 0.5],
    [3.2, -0.6, 0.4],
    [-0.4, 3.4, 0.35],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
};

/** A bench carved from packed snow, with a rug thrown over it. */
const addSnowBench = (builder: AttractionBuilder, at: Triple) => {
  const [x, , z] = at;
  builder.box("matte", snow, [1.1, 0.4, 0.42], [x, 0.2, z], [0, -0.4, 0]);
  builder.box(
    "matte",
    shade(snow, 0.94),
    [1.1, 0.35, 0.14],
    [x + Math.sin(-0.4) * -0.2, 0.55, z - Math.cos(-0.4) * 0.2],
    [0, -0.4, 0],
  );
  builder.box(
    "matte",
    "#3a6ea8",
    [0.5, 0.03, 0.44],
    [x - 0.15, 0.415, z - 0.06],
    [0, -0.4, 0],
  );
};

const stageDeck: Deck = ({ x, z }) =>
  Math.hypot(x - stage.x, z - stage.z) <= stage.radius
    ? { height: stage.height, kind: "ice" }
    : undefined;

export const icicleXylophoneModel: CuriosityModel = {
  kind: "icicle-xylophone",
  islandId: "frost-isle",
  name: "Icicle Xylophone",
  fact: "A xylophone is a tuned instrument: each bar plays its own note. Long bars wobble slowly and make low notes, and short bars wobble quickly and make high notes. These icicles hang from longest to shortest, so tapping along them plays a scale that climbs up like a staircase of sound.",
  curriculumLink:
    "Music, Key Stage 1: play tuned and untuned instruments musically, and experiment with, create, select and combine sounds.",
  footprint: 4.5,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildStage(builder);
    buildFrame(builder);
    buildProps(builder);
    if (builder.isFar) {
      for (let index = 0; index < icicleCount; index += 2) {
        builder.cylinder("glass", iceBlue, {
          radius: 0.012,
          radiusEnd: 0.09,
          length: icicleLength(index),
          at: [
            icicleX(index),
            beamAt[1] - 0.26 - icicleLength(index) / 2,
            frameZ,
          ],
          segments: 4,
        });
      }
    }
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "low icicles",
      pivot: beamAt,
      build: buildIcicleGroup(0, 3),
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.09,
        period: 1.1,
      },
    },
    {
      name: "middle icicles",
      pivot: beamAt,
      build: buildIcicleGroup(3, 6),
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.1,
        period: 0.9,
        phase: 1.2,
      },
    },
    {
      name: "high icicles",
      pivot: beamAt,
      build: buildIcicleGroup(6, 8),
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.11,
        period: 0.7,
        phase: 2.4,
      },
    },
    {
      name: "striker",
      pivot: strikerAt,
      build: buildStriker,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.85,
        period: 2.4,
      },
    },
  ],
  decks: [stageDeck],
  tune: [72, 74, 76, 77, 79, 81, 83, 84],
  blockers: [
    ...listWallBlockers(
      { x: icicleX(0), z: frameZ },
      { x: icicleX(icicleCount - 1), z: frameZ },
      0.3,
      0.35,
    ),
    { x: -beamHalf, z: frameZ, radius: 0.45 },
    { x: beamHalf, z: frameZ, radius: 0.45 },
    { x: -1.5, z: 1.1, radius: 0.3 },
    { x: 1.7, z: 1.4, radius: 0.5 },
    { x: 2.5, z: 0.6, radius: 0.4 },
    { x: -3.1, z: -2.5, radius: 0.4 },
    { x: 3.0, z: -2.4, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Play the icicles",
    news: "Ting, ting, ting! You tapped the icicles from longest to shortest, and the notes climbed higher and higher.",
    tune: [72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72],
  },
};
