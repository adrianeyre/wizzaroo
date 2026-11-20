import { CylinderGeometry, TorusGeometry } from "three";
import {
  addBench,
  addGableRoof,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const lawnGreen = "#6aa846";
const carpetGreen = "#4f8a3a";
const alyssumWhite = "#f6f3ea";
const marigold = "#f29a1a";
const begoniaRed = "#d8263a";
const lobeliaBlue = "#4a6ad8";
const pansyPurple = "#7a3aa8";
const succulentGrey = "#9ab0a0";
const brass = palette.brass;
const towerGreen = "#2f5d3a";
const signColour = "#2f5d3a";

/* The dial lies level on a raised round bed; 12 is towards -z */
const bedRadius = 2.45;
const dialRadius = 2.05;
const dialHeight = 0.38;
const handsAt: Triple = [0, dialHeight + 0.02, 0];
const towerAt = { x: -3.0, z: -1.7 };
const towerHeight = 2.5;
const bellAt: Triple = [towerAt.x, towerHeight + 0.55, towerAt.z];

/* The minute hand goes round twelve times for each turn of the hour hand */
const hourSpeed = -0.04;
const hourMotion: Motion = { kind: "spin", axis: "y", speed: hourSpeed };
const minuteMotion: Motion = { kind: "spin", axis: "y", speed: hourSpeed * 12 };

/** A spot on the dial at a clock angle (0 at 12, turning clockwise). */
const onDial = (hour: number, radius: number, height = dialHeight): Triple => {
  const angle = (hour / 12) * Math.PI * 2;
  return [Math.sin(angle) * radius, height, -Math.cos(angle) * radius];
};

/* ------------------------------------------------------------------ */
/* Numbers in flowers, drawn as seven planted bars                     */
/* ------------------------------------------------------------------ */

const digitBars: Record<number, readonly string[]> = {
  0: ["a", "b", "c", "d", "e", "f"],
  1: ["b", "c"],
  2: ["a", "b", "g", "e", "d"],
  3: ["a", "b", "g", "c", "d"],
  4: ["f", "g", "b", "c"],
  5: ["a", "f", "g", "c", "d"],
  6: ["a", "f", "g", "e", "d", "c"],
  7: ["a", "b", "c"],
  8: ["a", "b", "c", "d", "e", "f", "g"],
  9: ["a", "b", "c", "d", "f", "g"],
};

const barPlaces: Record<
  string,
  { across: number; up: number; isLevel: boolean }
> = {
  a: { across: 0, up: 0.5, isLevel: true },
  b: { across: 0.5, up: 0.25, isLevel: false },
  c: { across: 0.5, up: -0.25, isLevel: false },
  d: { across: 0, up: -0.5, isLevel: true },
  e: { across: -0.5, up: -0.25, isLevel: false },
  f: { across: -0.5, up: 0.25, isLevel: false },
  g: { across: 0, up: 0, isLevel: true },
};

/** A digit planted flat on the dial, upright to someone standing at +z. */
const plantDigit = (
  builder: AttractionBuilder,
  digit: number,
  at: Triple,
  colour: string,
) => {
  const width = 0.17;
  const height = 0.3;
  const thick = 0.06;
  digitBars[digit].forEach((name) => {
    const { across, up, isLevel } = barPlaces[name];
    builder.box(
      "matte",
      colour,
      isLevel
        ? [width + thick, 0.05, thick]
        : [thick, 0.05, height / 2 + thick],
      [at[0] + across * width, at[1] + 0.025, at[2] - up * height],
    );
  });
};

const plantNumber = (
  builder: AttractionBuilder,
  value: number,
  at: Triple,
  colour: string,
) => {
  if (value < 10) {
    plantDigit(builder, value, at, colour);
    return;
  }
  plantDigit(
    builder,
    Math.floor(value / 10),
    [at[0] - 0.13, at[1], at[2]],
    colour,
  );
  plantDigit(builder, value % 10, [at[0] + 0.13, at[1], at[2]], colour);
};

/* ------------------------------------------------------------------ */
/* The bed and the dial                                                */
/* ------------------------------------------------------------------ */

const buildBed = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 14 : 40;
  /* A gravel path round the bed */
  builder.cylinder("matte", palette.gravel, {
    radius: bedRadius + 0.7,
    length: 0.02,
    at: [0, 0.01, 0],
    segments,
  });
  /* The raised bed, its sides sloping up to the dial */
  builder.lathe(
    "matte",
    lawnGreen,
    [
      [0, 0.02],
      [bedRadius + 0.1, 0.02],
      [bedRadius, 0.12],
      [dialRadius + 0.2, dialHeight - 0.04],
      [dialRadius + 0.05, dialHeight],
      [0, dialHeight],
    ],
    [0, 0, 0],
    "y",
    segments,
  );
  /* Carpet bedding: rings of colour on a green ground */
  builder.cylinder("matte", carpetGreen, {
    radius: dialRadius,
    length: 0.02,
    at: [0, dialHeight + 0.01, 0],
    segments,
  });
  builder.cylinder("matte", succulentGrey, {
    radius: 1.15,
    length: 0.022,
    at: [0, dialHeight + 0.012, 0],
    segments,
  });
  builder.cylinder("matte", marigold, {
    radius: 0.55,
    length: 0.024,
    at: [0, dialHeight + 0.014, 0],
    segments: builder.isFar ? 10 : 28,
  });
  if (builder.isFar) {
    /* The hands, still, at three o'clock */
    builder.box(
      "metal",
      brass,
      [0.08, 0.04, 1.6],
      [0, dialHeight + 0.06, -0.7],
    );
    builder.box("metal", brass, [1.0, 0.04, 0.1], [0.45, dialHeight + 0.04, 0]);
    return;
  }
  /* Edging rings of white alyssum and blue lobelia */
  builder.torus(
    "matte",
    alyssumWhite,
    dialRadius - 0.04,
    0.05,
    [0, dialHeight + 0.02, 0],
    "y",
    48,
  );
  builder.torus(
    "matte",
    lobeliaBlue,
    1.15,
    0.045,
    [0, dialHeight + 0.02, 0],
    "y",
    36,
  );
  builder.torus(
    "matte",
    alyssumWhite,
    0.55,
    0.04,
    [0, dialHeight + 0.02, 0],
    "y",
    24,
  );
  /* Brick edging at the foot of the bank */
  builder.torus(
    "matte",
    palette.brick,
    bedRadius + 0.08,
    0.06,
    [0, 0.04, 0],
    "y",
    40,
  );
  /* The numbers 1 to 12 in red begonias, upright to a reader in front */
  for (let hour = 1; hour <= 12; hour++) {
    plantNumber(
      builder,
      hour,
      onDial(hour, 1.6, dialHeight + 0.02),
      begoniaRed,
    );
  }
  /* Marks at each half hour, in purple pansies */
  for (let half = 0; half < 12; half++) {
    const at = onDial(half + 0.5, 1.6, dialHeight + 0.02);
    builder.cylinder("matte", pansyPurple, {
      radius: 0.07,
      length: 0.05,
      at: [at[0], at[1] + 0.025, at[2]],
      segments: 8,
    });
  }
  /* Minute dots round the edge, every five minutes a bigger marigold */
  for (let minute = 0; minute < 60; minute++) {
    if (minute % 5 === 0) {
      builder.cylinder("matte", marigold, {
        radius: 0.06,
        length: 0.06,
        at: onDial(minute / 5, 1.88, dialHeight + 0.04),
        segments: 7,
      });
    } else {
      builder.box(
        "matte",
        shade(carpetGreen, 0.7),
        [0.04, 0.04, 0.04],
        onDial(minute / 5, 1.88, dialHeight + 0.03),
      );
    }
  }
  /* Flowers dotted about the bank */
  for (let flower = 0; flower < 18; flower++) {
    const angle = flower * 2.09 + 0.3;
    const radius = dialRadius + 0.2 + (flower % 3) * 0.06;
    builder.cylinder("paint", [begoniaRed, marigold, pansyPurple][flower % 3], {
      radius: 0.06,
      length: 0.05,
      at: [
        Math.sin(angle) * radius,
        dialHeight - 0.05 - (flower % 3) * 0.05,
        Math.cos(angle) * radius,
      ],
      segments: 6,
    });
  }
};

/* ------------------------------------------------------------------ */
/* The hands                                                           */
/* ------------------------------------------------------------------ */

const buildHourHand = (builder: AttractionBuilder) => {
  /* A brass frame planted with succulents, pointing to 12 at rest */
  builder.box("metal", brass, [0.12, 0.05, 1.0], [0, 0.04, -0.42]);
  builder.box("matte", "#8ab06a", [0.08, 0.04, 0.85], [0, 0.07, -0.45]);
  /* A spade-shaped tip and a round tail */
  builder.add("metal", brass, new CylinderGeometry(0.2, 0.2, 0.05, 4), {
    at: [0, 0.04, -1.0],
    scale: [0.9, 1, 1.4],
  });
  builder.cylinder("matte", begoniaRed, {
    radius: 0.09,
    length: 0.05,
    at: [0, 0.07, -1.0],
    segments: 8,
  });
  builder.cylinder("metal", brass, {
    radius: 0.14,
    length: 0.05,
    at: [0, 0.04, 0.16],
    segments: 14,
  });
};

const buildMinuteHand = (builder: AttractionBuilder) => {
  builder.box("metal", brass, [0.08, 0.05, 1.55], [0, 0.11, -0.68]);
  builder.box("matte", "#9ac07a", [0.05, 0.04, 1.4], [0, 0.14, -0.7]);
  builder.add("metal", brass, new CylinderGeometry(0, 0.11, 0.3, 4), {
    at: [0, 0.11, -1.58],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [1, 1, 0.4],
  });
  builder.box("metal", brass, [0.08, 0.05, 0.4], [0, 0.11, 0.18]);
  builder.cylinder("metal", brass, {
    radius: 0.12,
    length: 0.05,
    at: [0, 0.11, 0.38],
    segments: 14,
  });
  /* The brass boss in the middle */
  builder.lathe(
    "metal",
    brass,
    [
      [0, 0],
      [0.16, 0],
      [0.15, 0.1],
      [0.08, 0.2],
      [0, 0.22],
    ],
    [0, 0.02, 0],
    "y",
    16,
  );
};

/* ------------------------------------------------------------------ */
/* The clock tower post, the bench and the gardener's things           */
/* ------------------------------------------------------------------ */

const buildTower = (builder: AttractionBuilder) => {
  const { x, z } = towerAt;
  builder.box("paint", towerGreen, [0.34, 0.3, 0.34], [x, 0.15, z]);
  builder.box(
    "paint",
    towerGreen,
    [0.2, towerHeight, 0.2],
    [x, towerHeight / 2, z],
  );
  /* The clock head, with a face on the front and the side */
  builder.box("paint", towerGreen, [0.6, 0.6, 0.6], [x, towerHeight + 0.05, z]);
  addGableRoof(builder, {
    width: 0.6,
    depth: 0.6,
    rise: 0.15,
    at: [x, towerHeight + 0.35, z],
    colour: shade(towerGreen, 0.8),
    overhang: 0.06,
    finish: "paint",
  });
  if (builder.isFar) {
    return;
  }
  [
    { turn: 0, out: [0, 0, 0.31] },
    { turn: Math.PI / 2, out: [0.31, 0, 0] },
  ].forEach(({ turn, out }) => {
    const face: Triple = [x + out[0], towerHeight + 0.05, z + out[2]];
    builder.cylinder("paint", palette.white, {
      radius: 0.24,
      length: 0.02,
      at: face,
      axis: turn === 0 ? "z" : "x",
      segments: 18,
    });
    builder.add("metal", brass, new TorusGeometry(0.24, 0.02, 4, 18), {
      at: face,
      rotation: [0, turn, 0],
    });
    /* Showing half past two */
    const hand = (angle: number, length: number, width: number) => {
      const along = Math.sin(angle) * length * 0.5;
      const up = Math.cos(angle) * length * 0.5;
      builder.box(
        "paint",
        palette.black,
        [width, length, 0.01],
        [
          face[0] + (turn === 0 ? along : 0.012),
          face[1] + up,
          face[2] + (turn === 0 ? 0.012 : -along),
        ],
        [0, turn, -angle],
      );
    };
    hand(Math.PI, 0.2, 0.025);
    hand((2.5 / 12) * Math.PI * 2, 0.13, 0.035);
  });
  /* An open belfry on top, its posts round the bell */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        towerGreen,
        [0.05, 0.4, 0.05],
        [x + sideX * 0.2, towerHeight + 0.62, z + sideZ * 0.2],
      );
    });
  });
  builder.lathe(
    "paint",
    shade(towerGreen, 0.8),
    [
      [0, 0],
      [0.34, 0],
      [0.2, 0.18],
      [0.04, 0.32],
      [0, 0.34],
    ],
    [x, towerHeight + 0.82, z],
    "y",
    4,
  );
  builder.sphere(
    "metal",
    brass,
    0.05,
    [x, towerHeight + 1.18, z],
    [1, 1, 1],
    8,
  );
};

/** The bell in the belfry, which rocks and rings as someone comes. */
const buildBell = (builder: AttractionBuilder) => {
  builder.lathe(
    "metal",
    brass,
    [
      [0, -0.02],
      [0.04, -0.03],
      [0.08, -0.1],
      [0.1, -0.22],
      [0.13, -0.26],
      [0.12, -0.27],
      [0, -0.24],
    ],
    [0, 0, 0],
    "y",
    16,
  );
  builder.sphere("metal", palette.darkSteel, 0.03, [0, -0.25, 0], [1, 1, 1], 6);
  builder.box("paint", palette.darkTimber, [0.44, 0.04, 0.04], [0, 0, 0]);
};

const buildGardenThings = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  addBench(builder, [0, 0, 3.4], Math.PI, palette.paleTimber);
  /* A wheelbarrow of trays of bedding plants, ready to plant out */
  const barrow: Triple = [2.6, 0, -1.9];
  const turn = -0.6;
  const place = (along: number, y: number, across: number): Triple => [
    barrow[0] + along * Math.cos(turn) + across * Math.sin(turn),
    y,
    barrow[2] - along * Math.sin(turn) + across * Math.cos(turn),
  ];
  builder.box("paint", "#3a7ac8", [0.8, 0.28, 0.55], place(0, 0.48, 0), [
    0,
    turn,
    0,
  ]);
  builder.cylinder("matte", palette.black, {
    radius: 0.18,
    length: 0.08,
    at: place(0.55, 0.18, 0),
    axis: "z",
    segments: 12,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      palette.darkTimber,
      place(0.5, 0.2, side * 0.08),
      place(-0.75, 0.55, side * 0.28),
      0.05,
      5,
    );
    builder.bar(
      "paint",
      palette.darkTimber,
      place(-0.25, 0.35, side * 0.22),
      place(-0.3, 0, side * 0.24),
      0.04,
      4,
    );
  });
  [-0.2, 0.2].forEach((along, index) => {
    builder.box(
      "matte",
      palette.black,
      [0.34, 0.05, 0.44],
      place(along, 0.63, 0),
      [0, turn, 0],
    );
    [-0.12, 0, 0.12].forEach((across) => {
      builder.sphere(
        "matte",
        index === 0 ? begoniaRed : marigold,
        0.055,
        place(along + across * 0.6, 0.7, across),
        [1, 0.8, 1],
        6,
      );
    });
  });
  /* A watering can and a trowel by the bed */
  const can: Triple = [2.0, 0, 2.3];
  builder.cylinder("paint", "#3f8a4a", {
    radius: 0.14,
    radiusEnd: 0.12,
    length: 0.3,
    at: [can[0], 0.15, can[2]],
    segments: 12,
  });
  builder.bar(
    "paint",
    "#3f8a4a",
    [can[0] + 0.1, 0.1, can[2]],
    [can[0] + 0.38, 0.36, can[2]],
    0.04,
    6,
  );
  builder.cylinder("paint", "#3f8a4a", {
    radius: 0.05,
    radiusEnd: 0.03,
    length: 0.04,
    at: [can[0] + 0.4, 0.38, can[2]],
    axis: "x",
    segments: 8,
  });
  builder.add(
    "paint",
    "#3f8a4a",
    new TorusGeometry(0.11, 0.015, 4, 10, Math.PI),
    {
      at: [can[0], 0.3, can[2]],
    },
  );
  builder.box(
    "metal",
    palette.steel,
    [0.06, 0.01, 0.14],
    [can[0] - 0.35, 0.02, can[2] + 0.1],
    [0, 0.5, 0],
  );
  builder.box(
    "paint",
    palette.darkTimber,
    [0.04, 0.04, 0.12],
    [can[0] - 0.3, 0.03, can[2] + 0.21],
    [0, 0.5, 0],
  );
};

const buildBee = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#f2b51d", 0.06, [0, 0, 0], [0.9, 0.9, 1.3], 8);
  [-0.03, 0.03].forEach((z) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.055,
      length: 0.018,
      at: [0, 0, z],
      axis: "z",
      segments: 8,
    });
  });
  builder.sphere("paint", palette.black, 0.035, [0, 0, 0.08], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#eef6fb",
      [0.08, 0.005, 0.05],
      [side * 0.05, 0.05, -0.01],
      [0, 0, side * 0.4],
    );
  });
};

export const flowerClockModel: CuriosityModel = {
  kind: "flower-clock",
  islandId: "meadow-isle",
  name: "Flower Clock",
  fact: "This clock is planted with thousands of flowers! The long hand is the minute hand and the short hand is the hour hand. When the long hand points straight up to 12, it is something o'clock: look at the short hand to see which hour. When the long hand points down to 6, it is half past the hour.",
  curriculumLink:
    "Mathematics, Year 1: tell the time to the hour and half past the hour and draw the hands on a clock face to show these times.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: 1.6, z: 3.6 },
  build: (builder) => {
    buildBed(builder);
    buildTower(builder);
    buildGardenThings(builder);
    addSignBoard(builder, [1.6, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "hour hand",
      pivot: handsAt,
      build: buildHourHand,
      motion: hourMotion,
    },
    {
      name: "minute hand",
      pivot: handsAt,
      build: buildMinuteHand,
      motion: minuteMotion,
    },
    {
      name: "bell",
      pivot: bellAt,
      build: buildBell,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.45,
        period: 1.1,
      },
    },
  ],
  wanderers: [
    {
      name: "bees",
      build: buildBee,
      count: 3,
      centre: { x: 0, z: 0 },
      radius: 2.0,
      speed: 1.0,
      height: 0.9,
      bob: 0.3,
    },
  ],
  blockers: [
    { x: 0, z: 0, radius: bedRadius },
    { x: towerAt.x, z: towerAt.z, radius: 0.3 },
    { x: 0, z: 3.4, radius: 0.6 },
    { x: 2.6, z: -1.9, radius: 0.55 },
  ] satisfies LocalBlocker[],
  /* The Westminster chimes, as Big Ben rings the hour */
  tune: [68, 66, 64, 59, 64, 66, 68, 64, 68, 64, 66, 59, 59, 66, 68, 64],
  play: {
    label: "Tell the time",
    news: "Ding dong! The long hand is pointing to 12 and the short hand to 3, so it is three o'clock.",
    tune: [64, 64, 64],
  },
};
