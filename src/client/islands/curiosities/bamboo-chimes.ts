import { SphereGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const bamboo = "#c9b458";
const bambooGreen = "#8fa845";
const bambooNode = "#9c8a3c";
const tubeInside = "#3a2f1a";
const cord = "#7a5230";
const stone = "#8f8a7a";
const fernGreen = "#3f9a3a";
const beaterCloth = "#c8452f";
const signColour = "#7a5a1f";

const frameZ = -0.7;
const beamY = 2.55;
const frameHalf = 2.0;
const beamPivot: Triple = [0, beamY, frameZ];
const beaterPivot: Triple = [frameHalf - 0.15, 1.55, frameZ + 0.35];

/** The seven tubes, longest (lowest note) on the left, shortest on the right. */
const tubes = [1.6, 1.42, 1.26, 1.12, 1.0, 0.88, 0.78].map((length, index) => ({
  x: -1.5 + index * 0.5,
  length,
  radius: 0.12 - index * 0.007,
}));

/** A length of bamboo cane with its rings (nodes) along it. */
const addCane = (
  builder: AttractionBuilder,
  from: Triple,
  to: Triple,
  radius: number,
  colour: string,
  nodes: number,
) => {
  builder.bar("matte", colour, from, to, radius * 2, 12);
  if (builder.isFar) {
    return;
  }
  for (let node = 1; node <= nodes; node++) {
    const share = node / (nodes + 1);
    const at: Triple = [
      from[0] + (to[0] - from[0]) * share,
      from[1] + (to[1] - from[1]) * share,
      from[2] + (to[2] - from[2]) * share,
    ];
    const direction: Triple = [
      (to[0] - from[0]) * 0.012,
      (to[1] - from[1]) * 0.012,
      (to[2] - from[2]) * 0.012,
    ];
    builder.bar(
      "matte",
      bambooNode,
      [at[0] - direction[0], at[1] - direction[1], at[2] - direction[2]],
      [at[0] + direction[0], at[1] + direction[1], at[2] + direction[2]],
      radius * 2 + 0.03,
      12,
    );
  }
};

const buildFrame = (builder: AttractionBuilder) => {
  /* Two A-frames of thick cane, with the beam across the top */
  [-1, 1].forEach((side) => {
    const x = side * frameHalf;
    [-1, 1].forEach((lean) => {
      addCane(
        builder,
        [x, 0, frameZ + lean * 0.75],
        [x, beamY + 0.15, frameZ],
        0.09,
        bamboo,
        3,
      );
    });
    addCane(
      builder,
      [x, 0.9, frameZ - 0.48],
      [x, 0.9, frameZ + 0.48],
      0.05,
      bambooGreen,
      0,
    );
    if (!builder.isFar) {
      builder.box("matte", cord, [0.24, 0.16, 0.24], [x, beamY + 0.05, frameZ]);
      /* Stone footings */
      [-1, 1].forEach((lean) => {
        builder.sphere(
          "matte",
          stone,
          0.18,
          [x, 0.05, frameZ + lean * 0.75],
          [1.2, 0.5, 1.2],
          8,
        );
      });
    }
  });
  addCane(
    builder,
    [-frameHalf - 0.3, beamY, frameZ],
    [frameHalf + 0.3, beamY, frameZ],
    0.1,
    bamboo,
    4,
  );
  if (builder.isFar) {
    return;
  }
  /* A little roof of palm thatch on top to keep the rain off */
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      side === 1 ? "#b58f4a" : shade("#b58f4a", 0.88),
      [frameHalf * 2 + 0.9, 0.06, 0.7],
      [0, beamY + 0.42, frameZ + side * 0.28],
      [side * 0.55, 0, 0],
    );
    builder.box(
      "matte",
      shade("#b58f4a", 0.75),
      [frameHalf * 2 + 0.9, 0.14, 0.03],
      [0, beamY + 0.2, frameZ + side * 0.58],
    );
  });
  builder.cylinder("matte", bambooNode, {
    radius: 0.06,
    length: frameHalf * 2 + 1.0,
    at: [0, beamY + 0.62, frameZ],
    axis: "x",
    segments: 10,
  });
  /* A hook for the beater */
  builder.bar(
    "metal",
    palette.darkSteel,
    [frameHalf - 0.05, 1.6, frameZ + 0.2],
    [frameHalf - 0.12, 1.6, frameZ + 0.36],
    0.03,
    4,
  );
};

/** One group of hanging tubes, swinging together about the beam. */
const buildTubes = (builder: AttractionBuilder, isOdd: boolean) => {
  tubes.forEach(({ x, length, radius }, index) => {
    if ((index % 2 === 1) !== isOdd) {
      return;
    }
    const top = -0.45;
    const middle = top - length / 2;
    builder.cylinder("matte", index % 3 === 0 ? bamboo : shade(bamboo, 1.06), {
      radius,
      length,
      at: [x, middle, 0],
      segments: 14,
    });
    /* A ring (node) across each tube, and a dark open end at the bottom */
    builder.cylinder("matte", bambooNode, {
      radius: radius + 0.012,
      length: 0.04,
      at: [x, top - length * 0.35, 0],
      segments: 14,
    });
    builder.cylinder("matte", tubeInside, {
      radius: radius * 0.75,
      length: 0.01,
      at: [x, top - length - 0.002, 0],
      segments: 12,
    });
    /* A sloping cut at the bottom so it sings out */
    builder.cylinder("matte", bambooNode, {
      radius: radius + 0.005,
      length: 0.03,
      at: [x, top - length + 0.02, 0],
      segments: 14,
    });
    /* The cord it hangs from */
    builder.bar(
      "matte",
      cord,
      [x - 0.04, -0.02, 0],
      [x, top + 0.02, 0],
      0.015,
      3,
    );
    builder.bar(
      "matte",
      cord,
      [x + 0.04, -0.02, 0],
      [x, top + 0.02, 0],
      0.015,
      3,
    );
    builder.cylinder("matte", cord, {
      radius: radius * 0.5,
      length: 0.05,
      at: [x, top + 0.01, 0],
      segments: 8,
    });
  });
};

const buildBeater = (builder: AttractionBuilder) => {
  builder.bar("matte", cord, [0, 0, 0], [0, -0.25, 0], 0.015, 3);
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.025,
    length: 0.7,
    at: [0, -0.6, 0],
    segments: 8,
  });
  builder.sphere("matte", beaterCloth, 0.09, [0, -0.98, 0], [1, 1, 1], 12);
  builder.torus(
    "matte",
    shade(beaterCloth, 0.8),
    0.06,
    0.015,
    [0, -0.9, 0],
    "y",
    10,
  );
};

/** A board showing that longer tubes give lower notes. */
const buildPitchBoard = (builder: AttractionBuilder) => {
  const at: Triple = [2.6, 0, 1.2];
  const turn = -0.6;
  const place = (x: number, y: number, z = 0): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  builder.box("matte", palette.darkTimber, [0.07, 0.9, 0.07], place(0, 0.45), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", palette.cream, [0.8, 0.5, 0.04], place(0, 1.05), [
    0,
    turn,
    -0.15,
  ]);
  if (builder.isFar) {
    return;
  }
  /* Bars from long and low to short and high, with notes above */
  for (let bar = 0; bar < 5; bar++) {
    const height = 0.34 - bar * 0.06;
    builder.box(
      "paint",
      ["#c8452f", "#e8822f", "#e8c43a", "#6aa846", "#3f78c8"][bar] ??
        palette.black,
      [0.09, height, 0.01],
      place(
        -0.28 + bar * 0.14,
        1.05 - (0.34 - height) / 2 + (bar * 0.14 - 0.28) * 0.15 - 0.03,
        0.025,
      ),
      [0, turn, -0.15],
    );
  }
  builder.sphere(
    "paint",
    palette.black,
    0.03,
    place(-0.3, 1.32, 0.03),
    [1.2, 0.9, 0.4],
    6,
  );
  builder.sphere(
    "paint",
    palette.black,
    0.03,
    place(0.3, 1.22, 0.03),
    [1.2, 0.9, 0.4],
    6,
  );
};

const addFern = (builder: AttractionBuilder, at: Triple, size: number) => {
  for (let index = 0; index < 6; index++) {
    const turn = (index / 6) * Math.PI * 2 + size;
    builder.add(
      "matte",
      index % 2 === 0 ? fernGreen : shade(fernGreen, 0.8),
      new SphereGeometry(1, 6, 3),
      {
        at: [
          at[0] + Math.sin(turn) * 0.35 * size,
          0.25 * size,
          at[2] + Math.cos(turn) * 0.35 * size,
        ],
        rotation: [-0.5, turn, 0],
        scale: [0.12 * size, 0.03, 0.45 * size],
      },
    );
  }
};

/** A clump of living bamboo growing behind the chimes. */
const buildGrove = (builder: AttractionBuilder) => {
  const canes: [number, number, number][] = [
    [-2.4, -2.6, 3.6],
    [-1.9, -3.0, 4.1],
    [-1.3, -2.8, 3.3],
    [1.4, -2.9, 3.8],
    [2.0, -2.5, 3.2],
    [2.5, -2.9, 4.0],
  ];
  canes.forEach(([x, z, height], index) => {
    const lean = (index % 2 === 0 ? 1 : -1) * 0.15;
    const top: Triple = [x + lean, height, z];
    addCane(
      builder,
      [x, 0, z],
      top,
      0.06,
      index % 2 === 0 ? bambooGreen : shade(bambooGreen, 0.9),
      builder.isFar ? 0 : 4,
    );
    if (builder.isFar) {
      return;
    }
    /* Narrow leaves in sprays near the top */
    for (let leaf = 0; leaf < 5; leaf++) {
      const turn = leaf * 1.3 + index;
      const y = height - 0.3 - leaf * 0.35;
      builder.add(
        "matte",
        leaf % 2 === 0 ? fernGreen : "#5fb04a",
        new SphereGeometry(1, 6, 3),
        {
          at: [
            x + lean * (y / height) + Math.sin(turn) * 0.22,
            y,
            z + Math.cos(turn) * 0.22,
          ],
          rotation: [0.6, turn, 0],
          scale: [0.05, 0.015, 0.28],
        },
      );
    }
  });
};

const buildGround = (builder: AttractionBuilder) => {
  /* A round stone floor under the chimes, and stepping stones to it */
  builder.cylinder("matte", "#b8ad9c", {
    radius: 2.5,
    length: 0.06,
    at: [0, 0.03, frameZ + 0.3],
    segments: builder.isFar ? 16 : 32,
  });
  if (builder.isFar) {
    return;
  }
  builder.torus("matte", stone, 2.5, 0.06, [0, 0.04, frameZ + 0.3], "y", 40);
  [
    [-0.4, 2.4],
    [0.2, 3.0],
    [-0.3, 3.6],
  ].forEach(([x, z], index) => {
    builder.cylinder("matte", index % 2 === 0 ? stone : shade(stone, 1.1), {
      radius: 0.28,
      length: 0.06,
      at: [x, 0.03, z],
      segments: 10,
    });
  });
  addFern(builder, [-2.9, 0, 0.9], 1.1);
  addFern(builder, [3.1, 0, -0.9], 0.9);
  addFern(builder, [-3.1, 0, -1.2], 1.0);
  /* A spare tube and a pot of cut canes, waiting to be tuned */
  builder.cylinder("matte", bamboo, {
    radius: 0.09,
    length: 1.1,
    at: [-1.9, 0.1, 1.3],
    axis: "x",
    segments: 12,
  });
  builder.cylinder("matte", "#a0522d", {
    radius: 0.22,
    radiusEnd: 0.26,
    length: 0.4,
    at: [1.9, 0.2, 1.0],
    segments: 14,
  });
  [-0.08, 0, 0.08].forEach((dx, index) => {
    builder.cylinder("matte", bambooGreen, {
      radius: 0.03,
      length: 0.8 + index * 0.15,
      at: [1.9 + dx, 0.4 + index * 0.07, 1.0 + (index - 1) * 0.04],
      segments: 6,
    });
  });
};

export const bambooChimesModel: CuriosityModel = {
  kind: "bamboo-chimes",
  islandId: "jungle-reach",
  name: "Bamboo Chimes",
  fact: "When you strike a bamboo tube, the tube and the air inside it vibrate, and the vibrations travel to your ears as sound. A long tube vibrates slowly and makes a low note; a short tube vibrates quickly and makes a high note. Bamboo is a giant grass, and some kinds grow nearly a metre in a single day!",
  curriculumLink:
    "Science, Year 4: find patterns between the pitch of a sound and features of the object that produced it.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 1.1, z: 3.6 },
  build: (builder) => {
    buildGround(builder);
    buildFrame(builder);
    buildGrove(builder);
    buildPitchBoard(builder);
    if (builder.isFar) {
      tubes.forEach(({ x, length, radius }) => {
        builder.cylinder("matte", bamboo, {
          radius,
          length,
          at: [x, beamY - 0.45 - length / 2, frameZ],
          segments: 6,
        });
      });
    }
    addSignBoard(builder, [1.1, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "long tubes",
      pivot: beamPivot,
      build: (builder) => {
        buildTubes(builder, false);
      },
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.16,
        period: 1.3,
      },
    },
    {
      name: "short tubes",
      pivot: beamPivot,
      build: (builder) => {
        buildTubes(builder, true);
      },
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.16,
        period: 1.1,
        phase: Math.PI,
      },
    },
    {
      name: "beater",
      pivot: beaterPivot,
      build: buildBeater,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 5,
        amplitude: 0.35,
        period: 1.7,
      },
    },
  ],
  blockers: [
    ...[-1, 1].flatMap((side) =>
      [-1, 1].map((lean): LocalBlocker => ({
        x: side * frameHalf,
        z: frameZ + lean * 0.75,
        radius: 0.2,
      })),
    ),
    ...[-2.4, -1.9, -1.3, 1.4, 2.0, 2.5].map((x, index): LocalBlocker => ({
      x,
      z: [-2.6, -3.0, -2.8, -2.9, -2.5, -2.9][index] ?? -2.8,
      radius: 0.15,
    })),
    { x: 1.9, z: 1.0, radius: 0.3 },
    { x: 2.6, z: 1.2, radius: 0.15 },
  ],
  tune: [72, 74, 76, 79, 81, 84, 81, 79, 76],
  play: {
    label: "Strike the chimes",
    news: "Tock, tink, tunk! The longest tube boomed a low note and the shortest one pinged a high one.",
    tune: [72, 74, 76, 79, 81, 84],
  },
};
