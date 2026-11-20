import { ConeGeometry } from "three";
import {
  addBench,
  addSignBoard,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addGrassTuft,
  addLump,
  addMound,
  addSheet,
  addTaperedBar,
  followMovingSeat,
  sands,
} from "./date-palm-grove-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const flats = "#e9d4a2";
const course = "#dcc28a";
const sailRed = "#e2483a";
const sailYellow = "#f2c230";
const sailWhite = "#f7f3ea";
const seaBlue = "#2f86c8";
const hutBlue = "#3f8fc9";
const hutCream = "#f4ead2";
const coneOrange = "#f07a2a";
const signColour = seaBlue;

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const centre = { x: 0, z: -1.0 };
const lane = 5.4;
const platform = {
  minX: -1.3,
  maxX: 1.3,
  minZ: -2.7,
  maxZ: -0.5,
  height: 0.55,
};
const ramp = { minX: -0.55, maxX: 0.55, minZ: -0.5, maxZ: 0.9 };
const cabin = { minX: -1.1, maxX: 1.1, minZ: -2.6, maxZ: -1.6, height: 1.8 };
const mastAt: Triple = [1.05, platform.height + cabin.height, -2.45];
const mastTop = mastAt[1] + 1.6;
const gantryAngle = Math.PI / 2;
const huts = [
  { x: -6.2, z: 5.9, colour: hutBlue },
  { x: -4.7, z: 7.0, colour: sailRed },
  { x: -3.0, z: 7.7, colour: sailYellow },
];
const rackAt = { x: 7.6, z: 2.4 };

const onCourse = (angle: number, radius: number, y = 0): Triple => [
  centre.x + Math.sin(angle) * radius,
  y,
  centre.z + Math.cos(angle) * radius,
];

/* ------------------------------------------------------------------ */
/* The course                                                          */
/* ------------------------------------------------------------------ */

const buildCourse = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    course,
    [
      [lane + 1.25, 0.01],
      [lane + 1.0, 0.02],
      [lane - 1.0, 0.02],
      [lane - 1.25, 0.01],
    ],
    [centre.x, 0, centre.z],
    "y",
    48,
  );
  /* Marker posts with pennants inside and outside the lane. */
  const markers = builder.isFar ? 8 : 14;
  for (let marker = 0; marker < markers; marker++) {
    const angle = (marker / markers) * Math.PI * 2 + 0.2;
    [lane - 1.35, lane + 1.35].forEach((radius, ring) => {
      if (ring === 1 && Math.cos(angle) > 0.86) {
        return;
      }
      const [x, , z] = onCourse(angle, radius);
      builder.add(
        "paint",
        marker % 2 === 0 ? coneOrange : palette.white,
        new ConeGeometry(0.14, 0.42, builder.segments(8, 4)),
        { at: [x, 0.21, z] },
      );
      if (!builder.isFar && ring === 0) {
        builder.box("paint", palette.white, [0.2, 0.05, 0.2], [x, 0.03, z]);
      }
    });
  }
  /* The finish gantry, high enough for every mast. */
  const inner = onCourse(gantryAngle, lane - 1.5);
  const outer = onCourse(gantryAngle, lane + 1.5);
  [inner, outer].forEach(([x, , z]) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.09,
      length: 3.8,
      at: [x, 1.9, z],
      segments: 10,
    });
    builder.sphere("paint", sailRed, 0.13, [x, 3.85, z], [1, 1, 1], 10);
  });
  const squares = builder.isFar ? 2 : 10;
  for (let square = 0; square < squares; square++) {
    for (let row = 0; row < 2; row++) {
      builder.box(
        "paint",
        (square + row) % 2 === 0 ? palette.black : palette.white,
        [3.0 / squares, 0.22, 0.04],
        [
          inner[0] + (3.0 * (square + 0.5)) / squares,
          3.3 - row * 0.22,
          inner[2],
        ],
      );
    }
  }
  if (builder.isFar) {
    return;
  }
  /* A chequered line across the lane below. */
  for (let square = 0; square < 8; square++) {
    builder.box(
      "paint",
      square % 2 === 0 ? palette.black : palette.white,
      [0.25, 0.01, 0.25],
      [inner[0] + 0.25 + square * 0.32, 0.025, inner[2]],
    );
  }
};

/* ------------------------------------------------------------------ */
/* Race control                                                        */
/* ------------------------------------------------------------------ */

const buildControl = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ, height } = platform;
  /* Stilts and the platform. */
  [minX + 0.15, maxX - 0.15].forEach((x) => {
    [minZ + 0.15, maxZ - 0.15].forEach((z) => {
      builder.box(
        "matte",
        palette.timber,
        [0.14, height, 0.14],
        [x, height / 2, z],
      );
    });
  });
  builder.box(
    "paint",
    palette.paleTimber,
    [maxX - minX, 0.1, maxZ - minZ],
    [(minX + maxX) / 2, height - 0.05, (minZ + maxZ) / 2],
  );
  /* The ramp down to the sand. */
  const rampLength = Math.hypot(ramp.maxZ - ramp.minZ, height);
  builder.box(
    "paint",
    shade(palette.paleTimber, 0.92),
    [ramp.maxX - ramp.minX, 0.08, rampLength],
    [0, height / 2 - 0.04, (ramp.minZ + ramp.maxZ) / 2],
    [Math.atan2(height, ramp.maxZ - ramp.minZ), 0, 0],
  );
  /* The cabin, striped like a beach hut. */
  const width = cabin.maxX - cabin.minX;
  const depth = cabin.maxZ - cabin.minZ;
  const cx = (cabin.minX + cabin.maxX) / 2;
  const cz = (cabin.minZ + cabin.maxZ) / 2;
  builder.box(
    "paint",
    hutCream,
    [width, cabin.height, depth],
    [cx, height + cabin.height / 2, cz],
  );
  const stripes = builder.isFar ? 0 : 5;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "paint",
      hutBlue,
      [0.18, cabin.height - 0.05, 0.02],
      [
        cabin.minX + 0.2 + stripe * 0.45,
        height + cabin.height / 2,
        cabin.maxZ + 0.01,
      ],
    );
  }
  builder.box(
    "paint",
    seaBlue,
    [width + 0.4, 0.1, depth + 0.5],
    [cx, height + cabin.height + 0.05, cz + 0.1],
    [0.06, 0, 0],
  );
  addWindow(builder, {
    at: [cx, height + 1.15, cabin.maxZ + 0.03],
    width: 1.3,
    height: 0.5,
    frame: palette.white,
  });
  /* Railings round the front of the platform. */
  [minX + 0.04, maxX - 0.04].forEach((x) => {
    builder.box(
      "paint",
      palette.white,
      [0.05, 0.05, maxZ - cabin.maxZ],
      [x, height + 0.75, (cabin.maxZ + maxZ) / 2],
    );
    builder.box(
      "paint",
      palette.white,
      [0.05, 0.75, 0.05],
      [x, height + 0.37, maxZ - 0.05],
    );
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.white,
      [maxX - ramp.maxX, 0.05, 0.05],
      [side * ((maxX + ramp.maxX) / 2), height + 0.75, maxZ - 0.03],
    );
  });
  /* The mast with its wind gauges. */
  builder.cylinder("metal", palette.steel, {
    radius: 0.04,
    length: mastTop - mastAt[1],
    at: [mastAt[0], (mastAt[1] + mastTop) / 2, mastAt[2]],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "metal",
    palette.steel,
    [mastAt[0], mastTop - 0.5, mastAt[2]],
    [mastAt[0] - 0.55, mastTop - 0.5, mastAt[2]],
    0.025,
    4,
  );
  /* A loudhailer, a bell and a race board on the veranda. */
  builder.add(
    "paint",
    palette.white,
    new ConeGeometry(0.12, 0.3, 10, 1, true),
    {
      at: [cabin.maxX - 0.1, height + cabin.height - 0.1, cabin.maxZ + 0.2],
      rotation: [-Math.PI / 2, 0, 0],
    },
  );
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0, 0.16],
      [0.05, 0.15],
      [0.08, 0.04],
      [0.1, 0],
    ],
    [cabin.minX + 0.25, height + 1.35, cabin.maxZ + 0.12],
    "y",
    10,
  );
  builder.box(
    "paint",
    palette.black,
    [0.7, 0.5, 0.04],
    [cabin.minX + 0.5, height + 0.6, cabin.maxZ + 0.03],
  );
  [0.15, 0.0, -0.15].forEach((up, index) => {
    builder.box(
      "paint",
      [sailRed, sailYellow, palette.white][index],
      [0.45 - index * 0.08, 0.05, 0.02],
      [cabin.minX + 0.45, height + 0.6 + up, cabin.maxZ + 0.06],
    );
  });
  addBench(builder, [0.55, height, -1.0], Math.PI, hutBlue);
};

const buildWindGauge = (builder: AttractionBuilder) => {
  /* Three spinning cups that measure the wind. */
  builder.cylinder("metal", palette.steel, {
    radius: 0.03,
    length: 0.2,
    at: [0, 0.1, 0],
    segments: 6,
  });
  for (let arm = 0; arm < 3; arm++) {
    const angle = (arm / 3) * Math.PI * 2;
    const end: Triple = [Math.sin(angle) * 0.38, 0.2, Math.cos(angle) * 0.38];
    builder.bar("metal", palette.steel, [0, 0.2, 0], end, 0.02, 4);
    builder.sphere(
      "paint",
      arm === 0 ? sailRed : palette.white,
      0.09,
      [
        end[0] + Math.cos(angle) * 0.06,
        end[1],
        end[2] - Math.sin(angle) * 0.06,
      ],
      [1, 1, 1],
      8,
    );
  }
};

const buildWindsock = (builder: AttractionBuilder) => {
  for (let band = 0; band < 4; band++) {
    const from = 0.13 - band * 0.022;
    builder.add(
      "paint",
      band % 2 === 0 ? coneOrange : palette.white,
      new ConeGeometry(from, 0.2, builder.segments(10, 6), 1, true),
      {
        at: [-0.12 - band * 0.19, -0.04 - band * 0.02, 0],
        rotation: [0, 0, -Math.PI / 2 - 0.12],
      },
    );
  }
  builder.torus("metal", palette.steel, 0.13, 0.012, [0, 0, 0], "x", 10);
};

/* ------------------------------------------------------------------ */
/* Beach huts, the yacht rack and the dunes                            */
/* ------------------------------------------------------------------ */

const buildHuts = (builder: AttractionBuilder) => {
  huts.forEach(({ x, z, colour }) => {
    const turn = Math.atan2(-x, -z) * 0.5;
    builder.box("paint", hutCream, [1.2, 1.6, 1.1], [x, 0.85, z], [0, turn, 0]);
    builder.box(
      "paint",
      colour,
      [1.22, 0.06, 1.12],
      [x, 0.08, z],
      [0, turn, 0],
    );
    builder.add("paint", colour, new ConeGeometry(0.95, 0.7, 4, 1), {
      at: [x, 2.0, z],
      rotation: [0, turn + Math.PI / 4, 0],
      scale: [1, 1, 0.9],
    });
    if (builder.isFar) {
      return;
    }
    const facing: Triple = [Math.sin(turn) * 0.56, 0, Math.cos(turn) * 0.56];
    for (let plank = 0; plank < 4; plank++) {
      const along = -0.45 + plank * 0.3;
      builder.box(
        "paint",
        plank % 2 === 0 ? colour : shade(colour, 1.2),
        [0.15, 1.5, 0.02],
        [
          x + facing[0] + Math.cos(turn) * along,
          0.85,
          z + facing[2] - Math.sin(turn) * along,
        ],
        [0, turn, 0],
      );
    }
    builder.box(
      "paint",
      palette.white,
      [0.5, 1.1, 0.03],
      [x + facing[0] * 1.03, 0.65, z + facing[2] * 1.03],
      [0, turn, 0],
    );
  });
};

const buildRack = (builder: AttractionBuilder) => {
  const { x, z } = rackAt;
  [-0.9, 0.9].forEach((dz) => {
    builder.box("matte", palette.timber, [0.1, 0.9, 0.1], [x, 0.45, z + dz]);
  });
  builder.box("matte", palette.timber, [0.1, 0.1, 2.0], [x, 0.9, z]);
  /* Two spare sails rolled up, and a yacht on its side. */
  [sailYellow, sailWhite].forEach((colour, index) => {
    builder.cylinder("matte", colour, {
      radius: 0.1,
      length: 1.7,
      at: [x - 0.12 - index * 0.2, 1.02 + index * 0.02, z],
      axis: "z",
      segments: 8,
    });
  });
  builder.box(
    "paint",
    sailRed,
    [0.25, 0.2, 1.8],
    [x - 0.8, 0.15, z + 0.2],
    [0, 0.2, 0],
  );
  builder.torus(
    "matte",
    palette.black,
    0.2,
    0.06,
    [x - 0.8, 0.22, z + 1.05],
    "y",
    12,
  );
  if (builder.isFar) {
    return;
  }
  builder.lathe(
    "paint",
    palette.white,
    [
      [0, 0],
      [0.18, 0],
      [0.18, 0.12],
      [0.14, 0.3],
      [0.1, 0.32],
      [0, 0.32],
    ],
    [x - 0.2, 0, z - 1.5],
    "y",
    10,
  );
  builder.lathe(
    "paint",
    sailRed,
    [
      [0, 0],
      [0.15, 0],
      [0.15, 0.2],
      [0, 0.2],
    ],
    [x + 0.25, 0, z - 1.4],
    "y",
    10,
  );
};

const buildDunes = (builder: AttractionBuilder) => {
  addMound(builder, shade(flats, 1.03), [-7.6, 0, -3.2], 1.5, 0.6, 1.5, 0.7);
  addMound(builder, shade(flats, 0.98), [5.6, 0, -6.6], 1.4, 0.5, 1.6, -0.5);
  addMound(builder, shade(flats, 1.02), [7.4, 0, 6.0], 1.0, 0.35);
  if (builder.isFar) {
    return;
  }
  [
    [-7.2, -2.0],
    [6.0, -5.6],
    [7.9, 5.0],
    [-1.9, 8.7],
  ].forEach(([x, z]) => {
    addGrassTuft(builder, [x, 0, z], 1.1);
  });
  [
    [3.1, 8.3, 0.3],
    [-8.7, 1.4, 0.4],
  ].forEach(([x, z, size], index) => {
    addLump(
      builder,
      sands.sandstone,
      [x, size * 0.3, z],
      [size * 1.4, size * 0.6, size],
      index * 3.1,
    );
  });
  /* A deckchair and a cool box by the huts. */
  addSheet(builder, "matte", sailRed, [
    [-2.4, 0.3, 5.7],
    [-1.9, 0.3, 5.7],
    [-1.9, 0.8, 5.35],
    [-2.4, 0.8, 5.35],
  ]);
  builder.bar(
    "metal",
    palette.steel,
    [-2.4, 0, 6.0],
    [-2.4, 0.85, 5.3],
    0.03,
    4,
  );
  builder.bar(
    "metal",
    palette.steel,
    [-1.9, 0, 6.0],
    [-1.9, 0.85, 5.3],
    0.03,
    4,
  );
  builder.box("paint", seaBlue, [0.45, 0.32, 0.3], [-1.4, 0.16, 6.2]);
  builder.box("paint", palette.white, [0.47, 0.06, 0.32], [-1.4, 0.33, 6.2]);
};

const buildYachtClub = (builder: AttractionBuilder) => {
  buildCourse(builder);
  buildControl(builder);
  buildHuts(builder);
  buildRack(builder);
  buildDunes(builder);
  addSignBoard(builder, [3.2, 0, 7.9], signColour);
};

/* ------------------------------------------------------------------ */
/* The yachts                                                          */
/* ------------------------------------------------------------------ */

const addWheel = (builder: AttractionBuilder, at: Triple) => {
  builder.torus(
    "matte",
    palette.black,
    0.19,
    0.07,
    at,
    "x",
    builder.segments(12, 6),
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.11,
    length: 0.1,
    at,
    axis: "x",
    segments: 8,
  });
};

const buildYacht = (builder: AttractionBuilder) => {
  /* The hull: a long nose and a tub to sit in. */
  builder.roundedBox(
    "paint",
    sailRed,
    [0.36, 0.22, 2.1],
    0.08,
    [0, 0.32, 0.15],
  );
  builder.sphere(
    "paint",
    sailRed,
    0.3,
    [0, 0.36, -0.35],
    [1.1, 0.55, 1.6],
    builder.segments(10, 6),
  );
  builder.box("paint", palette.black, [0.4, 0.06, 0.7], [0, 0.48, -0.4]);
  /* The rear axle and wheels, and the front wheel on its fork. */
  builder.cylinder("metal", palette.steel, {
    radius: 0.04,
    length: 1.6,
    at: [0, 0.25, -0.65],
    axis: "x",
    segments: 6,
  });
  addWheel(builder, [-0.8, 0.26, -0.65]);
  addWheel(builder, [0.8, 0.26, -0.65]);
  addWheel(builder, [0, 0.26, 1.15]);
  /* The mast and its sail, leaning out with the wind. */
  const foot: Triple = [0, 0.4, 0.55];
  const top: Triple = [0.15, 3.0, 0.45];
  addTaperedBar(builder, "metal", palette.white, foot, top, 0.045, 0.03, 6);
  const clew: Triple = [0.55, 0.75, -1.15];
  builder.bar("metal", palette.steel, [0.02, 0.75, 0.5], clew, 0.035, 5);
  const middle: Triple = [0.3, 1.6, -0.25];
  addSheet(builder, "matte", sailWhite, [[0.03, 0.8, 0.5], top, middle]);
  addSheet(builder, "matte", sailYellow, [[0.03, 0.8, 0.5], middle, clew]);
  if (builder.isFar) {
    return;
  }
  /* A number on the sail, a stripe and a pennant on top. */
  builder.box(
    "paint",
    sailRed,
    [0.02, 0.35, 0.28],
    [0.22, 1.5, 0.12],
    [0, 0.35, 0.12],
  );
  addSheet(builder, "paint", sailRed, [
    top,
    [top[0], top[1] - 0.2, top[2]],
    [top[0] + 0.05, top[1] - 0.1, top[2] - 0.35],
  ]);
  /* A sailor in a helmet, steering. */
  builder.sphere("paint", seaBlue, 0.17, [0, 0.72, -0.5], [1, 1.1, 0.9], 8);
  builder.sphere(
    "matte",
    sands.skinLight,
    0.11,
    [0, 0.98, -0.48],
    [1, 1, 1],
    8,
  );
  builder.sphere(
    "paint",
    sailYellow,
    0.125,
    [0, 1.03, -0.5],
    [1, 0.8, 1.05],
    8,
  );
  builder.box("glass", palette.glass, [0.18, 0.06, 0.03], [0, 1.0, -0.37]);
};

const yachtPivot: Triple = [centre.x, 0, centre.z];
const yachtMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: lane,
  count: 3,
  speed: -0.42,
  isFacingAlong: true,
  bob: 0.04,
};

/* ------------------------------------------------------------------ */
/* Gulls                                                               */
/* ------------------------------------------------------------------ */

const buildGull = (builder: AttractionBuilder) => {
  builder.sphere("matte", palette.white, 0.1, [0, 0, 0], [0.8, 0.7, 1.6], 8);
  builder.sphere("matte", palette.white, 0.06, [0, 0.05, 0.16], [1, 1, 1], 6);
  builder.add("matte", sailYellow, new ConeGeometry(0.02, 0.08, 4), {
    at: [0, 0.04, 0.24],
    rotation: [Math.PI / 2, 0, 0],
  });
  [-1, 1].forEach((side) => {
    addSheet(builder, "matte", side > 0 ? "#cfd4d8" : "#dfe3e6", [
      [side * 0.05, 0.03, 0.08],
      [side * 0.45, 0.12, -0.02],
      [side * 0.05, 0.03, -0.1],
    ]);
  });
};

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

const sailStart = { x: 1.5, z: 6.1 };
const sailFinish = { x: -0.5, z: 6.4 };

const platformDeck: Deck = ({ x, z }) =>
  x >= platform.minX &&
  x <= platform.maxX &&
  z >= platform.minZ &&
  z <= platform.maxZ
    ? { height: platform.height, kind: "bridge" }
    : undefined;

const rampDeck: Deck = ({ x, z }) =>
  x >= ramp.minX && x <= ramp.maxX && z > ramp.minZ && z <= ramp.maxZ
    ? {
        height: (platform.height * (ramp.maxZ - z)) / (ramp.maxZ - ramp.minZ),
        kind: "bridge",
      }
    : undefined;

const blockers: LocalBlocker[] = [
  ...huts.map(({ x, z }) => ({ x, z, radius: 0.75 })),
  { x: rackAt.x - 0.3, z: rackAt.z, radius: 0.7 },
];

export const sandYachtsModel: NewLandAttractionModel = {
  kind: "sand-yachts",
  islandId: "sunscorch-sands",
  name: "Sand Yachts",
  fact: "A sand yacht is a land yacht: a three-wheeled cart with a sail. When the wind blows, it pushes on the sail, and that push is a force that makes the yacht roll across the flat sand. The harder the wind pushes, the faster it goes, and the fastest land yachts have raced at over 120 miles an hour!",
  curriculumLink:
    "Science, Year 3: forces and magnets. Pushes and pulls, and noticing that some forces need contact between two objects, such as the wind pushing on a sail.",
  footprint: 10,
  setting: "inland",
  padColour: flats,
  signSpot: { x: 3.2, z: 8.8 },
  build: buildYachtClub,
  moving: [
    {
      name: "sand yachts",
      pivot: yachtPivot,
      build: buildYacht,
      motion: yachtMotion,
    },
    {
      name: "wind gauge",
      pivot: [mastAt[0], mastTop, mastAt[2]],
      build: buildWindGauge,
      motion: { kind: "whirl", axis: "y", idle: 1.2, speed: 9, reach: 6 },
    },
    {
      name: "windsock",
      pivot: [mastAt[0] - 0.55, mastTop - 0.5, mastAt[2]],
      build: buildWindsock,
      motion: { kind: "nod", axis: "y", reach: 6, amplitude: 0.5, period: 2.2 },
    },
  ],
  wanderers: [
    {
      name: "gulls",
      build: buildGull,
      count: 3,
      centre: { x: 0, z: -1 },
      radius: 4.5,
      speed: 1.2,
      height: 4.2,
      bob: 0.2,
    },
  ],
  smoke: [
    {
      at: [-6.5, 0.1, -5.6],
      colour: "#efd9a6",
      puffs: 6,
      size: 0.3,
      rise: 1.2,
      spread: 0.9,
    },
  ],
  blockers,
  decks: [platformDeck, rampDeck],
  rides: [
    {
      id: "sand-yacht",
      name: "a sand-yacht sail",
      start: sailStart,
      reach: 0.6,
      seconds: 18,
      finish: sailFinish,
      follow: followMovingSeat({
        pivot: yachtPivot,
        motion: yachtMotion,
        seat: [0, 0.42, -0.2],
        start: sailStart,
        finish: sailFinish,
      }),
    },
  ],
  play: {
    label: "Feel the wind",
    news: "Whoosh! A strong gust filled the sails, the wind gauge spun like a top, and all three sand yachts went zooming round the course.",
    tune: [67, 71, 74, 79],
  },
};
