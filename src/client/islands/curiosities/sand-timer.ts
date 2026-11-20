import {
  addBench,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const carvedTimber = "#8a5530";
const timberLight = "#b07a48";
const timberDark = "#5a3520";
const glassTint = "#cfe6ee";
const glowingSand = "#ffc94a";
const brass = "#c99a3a";
const dialCream = "#f6efdc";
const signColour = "#8a5530";

const axleAt: Triple = [0, 1.75, -0.7];
const postX = 1.02;
const halfHeight = 1.2;
const watchAt: Triple = [2.5, 1.75, 0.5];
const tableAt: Triple = [-2.5, 0, 0.5];

/** A turned spindle, like a chair leg, standing at `at`, `length` tall. */
const addSpindle = (
  builder: AttractionBuilder,
  at: Triple,
  length: number,
  radius: number,
  colour: string,
) => {
  builder.lathe(
    "matte",
    colour,
    [
      [0, 0],
      [radius * 1.3, 0],
      [radius * 1.3, length * 0.06],
      [radius * 0.8, length * 0.12],
      [radius * 1.1, length * 0.3],
      [radius * 0.7, length * 0.5],
      [radius * 1.1, length * 0.7],
      [radius * 0.8, length * 0.88],
      [radius * 1.3, length * 0.94],
      [radius * 1.3, length],
      [0, length],
    ],
    at,
    "y",
    builder.isFar ? 6 : 12,
  );
};

/* The stand: a round plinth and two carved posts carrying the axle */

const buildStand = (builder: AttractionBuilder) => {
  builder.cylinder("matte", timberDark, {
    radius: 1.45,
    radiusEnd: 1.35,
    length: 0.22,
    at: [axleAt[0], 0.11, axleAt[2]],
    segments: builder.isFar ? 12 : 32,
  });
  [-1, 1].forEach((side) => {
    const x = axleAt[0] + side * postX;
    builder.box(
      "matte",
      carvedTimber,
      [0.24, axleAt[1] + 0.15, 0.3],
      [x, (axleAt[1] + 0.15) / 2 + 0.1, axleAt[2]],
    );
    if (builder.isFar) {
      return;
    }
    /* Feet, a carved finial, and the brass bearing for the axle */
    builder.box("matte", timberDark, [0.36, 0.18, 0.7], [x, 0.31, axleAt[2]]);
    builder.sphere(
      "matte",
      timberLight,
      0.14,
      [x, axleAt[1] + 0.42, axleAt[2]],
      [1, 1.3, 1],
      10,
    );
    builder.cylinder("matte", timberLight, {
      radius: 0.08,
      radiusEnd: 0.0,
      length: 0.2,
      at: [x, axleAt[1] + 0.62, axleAt[2]],
      segments: 8,
    });
    builder.cylinder("metal", brass, {
      radius: 0.13,
      length: 0.3,
      at: [x, axleAt[1], axleAt[2]],
      axis: "x",
      segments: 14,
    });
    /* Grooves carved down the post */
    [-0.08, 0.08].forEach((dz) => {
      builder.box(
        "matte",
        timberDark,
        [0.25, axleAt[1] - 0.6, 0.025],
        [x, axleAt[1] / 2 + 0.2, axleAt[2] + dz + 0.13],
      );
    });
  });
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "matte",
    timberLight,
    1.4,
    0.05,
    [axleAt[0], 0.22, axleAt[2]],
    "y",
    32,
  );
};

/* The stopwatch on its post, its hand going round once a minute */

const buildStopwatch = (builder: AttractionBuilder) => {
  const [x, y, z] = watchAt;
  builder.cylinder("matte", carvedTimber, {
    radius: 0.07,
    length: y - 0.4,
    at: [x, (y - 0.4) / 2, z - 0.08],
    segments: 8,
  });
  builder.cylinder("metal", brass, {
    radius: 0.5,
    length: 0.12,
    at: [x, y, z - 0.04],
    axis: "z",
    segments: builder.isFar ? 12 : 32,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", timberDark, {
    radius: 0.25,
    length: 0.1,
    at: [x, 0.05, z - 0.08],
    segments: 12,
  });
  builder.cylinder("paint", dialCream, {
    radius: 0.44,
    length: 0.02,
    at: [x, y, z + 0.025],
    axis: "z",
    segments: 32,
  });
  builder.torus(
    "metal",
    shade(brass, 1.1),
    0.47,
    0.035,
    [x, y, z + 0.03],
    "z",
    32,
  );
  /* The winder and two buttons on top */
  builder.cylinder("metal", brass, {
    radius: 0.05,
    length: 0.12,
    at: [x, y + 0.56, z - 0.04],
    segments: 10,
  });
  builder.torus("metal", brass, 0.08, 0.02, [x, y + 0.68, z - 0.04], "z", 12);
  [-1, 1].forEach((side) => {
    builder.cylinder("metal", brass, {
      radius: 0.035,
      length: 0.08,
      at: [x + side * 0.3, y + 0.42, z - 0.04],
      segments: 8,
    });
  });
  /* Sixty second ticks, every fifth one long and dark */
  for (let tick = 0; tick < 60; tick++) {
    const angle = (tick / 60) * Math.PI * 2;
    const isFive = tick % 5 === 0;
    const radius = isFive ? 0.37 : 0.39;
    builder.box(
      "paint",
      isFive ? palette.black : "#8a7a60",
      [isFive ? 0.022 : 0.01, isFive ? 0.08 : 0.04, 0.01],
      [x + Math.sin(angle) * radius, y + Math.cos(angle) * radius, z + 0.04],
      [0, 0, -angle],
    );
  }
  /* A small minute dial below the middle */
  builder.cylinder("paint", shade(dialCream, 0.92), {
    radius: 0.12,
    length: 0.01,
    at: [x, y - 0.17, z + 0.04],
    axis: "z",
    segments: 16,
  });
  for (let minute = 0; minute < 5; minute++) {
    const angle = (minute / 5) * Math.PI * 2;
    builder.box(
      "paint",
      "#b8402a",
      [0.012, 0.035, 0.008],
      [
        x + Math.sin(angle) * 0.09,
        y - 0.17 + Math.cos(angle) * 0.09,
        z + 0.048,
      ],
      [0, 0, -angle],
    );
  }
  builder.box(
    "paint",
    "#b8402a",
    [0.012, 0.08, 0.008],
    [x, y - 0.17 + 0.03, z + 0.05],
    [0, 0, -0.6],
  );
};

/* A table of little sand timers, for a minute, three and five */

const buildTimerTable = (builder: AttractionBuilder) => {
  const [x, , z] = tableAt;
  builder.cylinder("matte", timberLight, {
    radius: 0.55,
    length: 0.06,
    at: [x, 0.72, z],
    segments: builder.isFar ? 8 : 20,
  });
  if (builder.isFar) {
    return;
  }
  addSpindle(builder, [x, 0, z], 0.69, 0.07, carvedTimber);
  builder.cylinder("matte", timberDark, {
    radius: 0.3,
    length: 0.05,
    at: [x, 0.025, z],
    segments: 12,
  });
  [
    { size: 0.12, colour: "#3a7ae0", dx: -0.28 },
    { size: 0.17, colour: "#2fae6a", dx: 0.0 },
    { size: 0.22, colour: "#d63a2e", dx: 0.3 },
  ].forEach(({ size, colour, dx }) => {
    const base = 0.75;
    builder.cylinder("paint", colour, {
      radius: size * 0.6,
      length: size * 0.12,
      at: [x + dx, base + size * 0.06, z],
      segments: 10,
    });
    builder.cylinder("paint", colour, {
      radius: size * 0.6,
      length: size * 0.12,
      at: [x + dx, base + size * 1.94, z],
      segments: 10,
    });
    builder.lathe(
      "glass",
      glassTint,
      [
        [size * 0.1, base + size * 0.12],
        [size * 0.48, base + size * 0.4],
        [size * 0.08, base + size],
        [size * 0.48, base + size * 1.6],
        [size * 0.1, base + size * 1.88],
      ],
      [x + dx, 0, z],
      "y",
      10,
    );
    builder.cylinder("glow", glowingSand, {
      radius: size * 0.4,
      radiusEnd: 0.0,
      length: size * 0.4,
      at: [x + dx, base + size * 0.35, z],
      segments: 8,
    });
    [-1, 1].forEach((side) => {
      builder.cylinder("paint", colour, {
        radius: 0.012,
        length: size * 1.8,
        at: [x + dx + side * size * 0.5, base + size, z],
        segments: 4,
      });
    });
  });
};

/* Footprints and a little drift of sand that has trickled out */

const buildGround = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    shade(sand, 1.06),
    0.45,
    [1.4, 0, -2.4],
    [1.5, 0.3, 1],
    10,
  );
  [
    [0.3, 2.9],
    [0.05, 3.3],
    [0.3, 3.7],
  ].forEach(([x, z]) => {
    builder.sphere(
      "matte",
      shade(sand, 0.86),
      0.09,
      [x, 0, z],
      [0.75, 0.12, 1.35],
      6,
    );
  });
  /* Pebbles marking a path to the bench */
  [
    [-1.4, 2.6],
    [1.2, 2.4],
    [-1.9, -2.2],
    [2.6, -1.5],
  ].forEach(([x, z], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#b89a6a" : "#a8805a",
      0.12,
      [x, 0.03, z],
      [1.3, 0.6, 1],
      7,
    );
  });
};

/* The moving parts */

/** The hourglass in its frame, built about its axle. */
const buildHourglass = (builder: AttractionBuilder) => {
  /* Top and bottom plates, with mouldings */
  [-1, 1].forEach((end) => {
    builder.cylinder("matte", carvedTimber, {
      radius: 0.8,
      length: 0.14,
      at: [0, end * halfHeight, 0],
      segments: 28,
    });
    builder.cylinder("matte", timberLight, {
      radius: 0.7,
      length: 0.08,
      at: [0, end * (halfHeight + 0.1), 0],
      segments: 24,
    });
    builder.torus(
      "matte",
      timberDark,
      0.8,
      0.04,
      [0, end * halfHeight, 0],
      "y",
      28,
    );
    builder.sphere(
      "matte",
      timberLight,
      0.13,
      [0, end * (halfHeight + 0.18), 0],
      [1, 0.7, 1],
      10,
    );
  });
  /* Four turned pillars between the plates */
  [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((angle) => {
    addSpindle(
      builder,
      [Math.sin(angle) * 0.68, -halfHeight + 0.07, Math.cos(angle) * 0.68],
      halfHeight * 2 - 0.14,
      0.06,
      carvedTimber,
    );
  });
  /* Pins out to the posts' bearings */
  [-1, 1].forEach((side) => {
    builder.cylinder("metal", brass, {
      radius: 0.06,
      length: 0.34,
      at: [side * 0.86, 0, 0],
      axis: "x",
      segments: 10,
    });
  });
  /* The glass: two bulbs meeting at a narrow neck */
  builder.lathe(
    "glass",
    glassTint,
    [
      [0.2, -halfHeight + 0.07],
      [0.45, -halfHeight + 0.2],
      [0.56, -0.7],
      [0.5, -0.4],
      [0.2, -0.12],
      [0.06, 0],
      [0.2, 0.12],
      [0.5, 0.4],
      [0.56, 0.7],
      [0.45, halfHeight - 0.2],
      [0.2, halfHeight - 0.07],
    ],
    [0, 0, 0],
    "y",
    24,
  );
  /* Glowing sand: a heap below, the rest above, and a trickle between */
  builder.lathe(
    "glow",
    glowingSand,
    [
      [0, -halfHeight + 0.08],
      [0.4, -halfHeight + 0.1],
      [0.5, -0.82],
      [0.22, -0.62],
      [0, -0.55],
    ],
    [0, 0, 0],
    "y",
    20,
  );
  builder.lathe(
    "glow",
    shade(glowingSand, 1.05),
    [
      [0, 0.1],
      [0.16, 0.12],
      [0.42, 0.36],
      [0.5, 0.5],
      [0, 0.5],
    ],
    [0, 0, 0],
    "y",
    20,
  );
  builder.cylinder("glow", glowingSand, {
    radius: 0.015,
    length: 0.6,
    at: [0, -0.3, 0],
    segments: 6,
  });
};

const buildSecondHand = (builder: AttractionBuilder) => {
  builder.box("paint", "#b8402a", [0.02, 0.4, 0.01], [0, 0.15, 0]);
  builder.box("paint", "#b8402a", [0.03, 0.1, 0.01], [0, -0.07, 0]);
  builder.cylinder("metal", brass, {
    radius: 0.035,
    length: 0.025,
    at: [0, 0, 0],
    axis: "z",
    segments: 10,
  });
};

export const sandTimerModel: CuriosityModel = {
  kind: "sand-timer",
  islandId: "sunscorch-sands",
  name: "Sand Timer",
  fact: "A sand timer, or hourglass, measures time with sand trickling from one glass bulb into another. When all the sand has fallen, the time is up, and you flip it over to start again. There are 60 seconds in a minute and 60 minutes in an hour. Little sand timers can time a minute, three minutes or five, so you can compare how long things take.",
  curriculumLink:
    "Mathematics, Year 3: know the number of seconds in a minute and the number of days in each month, year and leap year; compare durations of events.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: 1.6, z: 3.6 },
  padColour: sand,
  build: (builder) => {
    buildStand(builder);
    buildStopwatch(builder);
    buildTimerTable(builder);
    buildGround(builder);
    if (builder.isFar) {
      /* The hourglass, still and upright */
      [-1, 1].forEach((end) => {
        builder.cylinder("glow", glowingSand, {
          radius: end < 0 ? 0.55 : 0.06,
          radiusEnd: end < 0 ? 0.06 : 0.55,
          length: halfHeight,
          at: [axleAt[0], axleAt[1] + (end * halfHeight) / 2, axleAt[2]],
          segments: 10,
        });
        builder.cylinder("matte", carvedTimber, {
          radius: 0.8,
          length: 0.14,
          at: [axleAt[0], axleAt[1] + end * halfHeight, axleAt[2]],
          segments: 10,
        });
      });
    } else {
      addBench(builder, [-0.7, 0, 1.75], Math.PI, timberLight);
    }
    addSignBoard(builder, [1.6, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "hourglass",
      pivot: axleAt,
      build: buildHourglass,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: Math.PI,
        period: 7,
      },
    },
    {
      name: "second hand",
      pivot: [watchAt[0], watchAt[1], watchAt[2] + 0.06],
      build: buildSecondHand,
      /* Once round every 60 seconds, clockwise */
      motion: { kind: "spin", axis: "z", speed: (-Math.PI * 2) / 60 },
    },
  ],
  blockers: [
    { x: axleAt[0] - postX, z: axleAt[2], radius: 0.4 },
    { x: axleAt[0] + postX, z: axleAt[2], radius: 0.4 },
    { x: axleAt[0], z: axleAt[2], radius: 0.85 },
    { x: watchAt[0], z: watchAt[2] - 0.08, radius: 0.3 },
    { x: tableAt[0], z: tableAt[2], radius: 0.6 },
    { x: -0.7, z: 1.75, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Flip the timer",
    news: "Whoosh, flip! The giant timer turned over, and the glowing sand began to trickle down. One minute is 60 seconds… starting now!",
  },
};
