import { BoxGeometry, ConeGeometry } from "three";
import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const nileMud = "#6e5038";
const mudBrick = "#a8794e";
const fieldSoil = "#7a5a3a";
const channelBlue = "#3a8fae";
const poleTimber = "#8a6038";
const wheat = "#e0b84a";
const signColour = "#2a6f8a";

const channel = { z: -1.65, halfWidth: 0.42, halfLength: 3.9, water: 0.09 };
const frameX = -0.6;
const pivot: Triple = [frameX, 1.75, 0.2];
const bucketArm = 1.85;
const weightArm = 0.72;
/** At rest the heavy counterweight holds the bucket end up. */
const restTilt = 0.25;
const ropeLength = 1.5;
const trough = { x: 0.55, z: -0.85 };

/** A box laid from one point to another. */
const addSlab = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  from: Triple,
  to: Triple,
  width: number,
  thickness: number,
) => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const level = Math.hypot(dx, dz);
  builder.add(
    finish,
    colour,
    new BoxGeometry(width, thickness, Math.hypot(level, dy))
      .rotateX(Math.atan2(-dy, level))
      .rotateY(Math.atan2(dx, dz)),
    { at: [from[0] + dx / 2, from[1] + dy / 2, from[2] + dz / 2] },
    undefined,
  );
};

const buildChannel = (builder: AttractionBuilder) => {
  const { z, halfWidth, halfLength, water } = channel;
  builder.box(
    "matte",
    nileMud,
    [halfLength * 2, 0.05, halfWidth * 2],
    [0, 0.025, z],
  );
  builder.box(
    "water",
    channelBlue,
    [halfLength * 2, 0.05, halfWidth * 2],
    [0, water - 0.02, z],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(nileMud, 1.25),
      [halfLength * 2 + 0.3, 0.2, 0.22],
      [0, 0.1, z + side * (halfWidth + 0.11)],
    );
  });
  [-1, 1].forEach((end) => {
    builder.box(
      "matte",
      shade(nileMud, 1.25),
      [0.22, 0.2, halfWidth * 2],
      [end * (halfLength + 0.04), 0.1, z],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Papyrus and reeds along the far bank, and ripples */
  for (let clump = 0; clump < 7; clump++) {
    const x = -3.4 + clump * 1.1 + (clump % 2) * 0.2;
    for (let stem = 0; stem < 4; stem++) {
      const lean = (stem - 1.5) * 0.12;
      const top: Triple = [
        x + lean,
        0.9 + (stem % 2) * 0.25,
        z - halfWidth - 0.25 - lean * 0.4,
      ];
      builder.bar(
        "matte",
        stem % 2 === 0 ? "#5f8f34" : "#4f7a2a",
        [x, 0.15, z - halfWidth - 0.2],
        top,
        0.03,
        3,
      );
      builder.cylinder("matte", "#9cbf4a", {
        radius: 0.02,
        radiusEnd: 0.13,
        length: 0.12,
        at: [top[0], top[1] + 0.05, top[2]],
        segments: 6,
        isOpen: true,
      });
    }
  }
  [-2.6, -1.1, 1.6, 3.0].forEach((x, index) => {
    builder.box(
      "water",
      "#bfe6f0",
      [0.5 - index * 0.06, 0.01, 0.03],
      [x, water + 0.01, z + (index % 2 === 0 ? 0.12 : -0.14)],
    );
  });
};

const buildFrame = (builder: AttractionBuilder) => {
  /* Two mud-brick pillars with a beam across, which the pole rocks on */
  [-1, 1].forEach((side) => {
    const x = frameX + side * 0.38;
    builder.box("matte", mudBrick, [0.3, 1.6, 0.34], [x, 0.8, pivot[2]]);
    if (!builder.isFar) {
      for (let course = 1; course < 8; course++) {
        builder.box(
          "matte",
          shade(mudBrick, 0.82),
          [0.31, 0.015, 0.35],
          [x, course * 0.2, pivot[2]],
        );
      }
      builder.box(
        "matte",
        shade(mudBrick, 1.1),
        [0.36, 0.08, 0.4],
        [x, 1.62, pivot[2]],
      );
    }
  });
  builder.cylinder("matte", poleTimber, {
    radius: 0.06,
    length: 1.05,
    at: [frameX, pivot[1] - 0.06, pivot[2]],
    axis: "x",
    segments: builder.isFar ? 5 : 10,
  });
};

/** The see-sawing pole, with its bucket on a rope and its counterweight, built about its pivot. */
const buildPole = (builder: AttractionBuilder) => {
  const bucketEnd: Triple = [
    0,
    Math.sin(restTilt) * bucketArm,
    -Math.cos(restTilt) * bucketArm,
  ];
  const weightEnd: Triple = [
    0,
    -Math.sin(restTilt) * weightArm,
    Math.cos(restTilt) * weightArm,
  ];
  builder.bar("matte", poleTimber, weightEnd, bucketEnd, 0.08, 8);
  builder.bar("matte", palette.cream, [0, -0.02, 0], [0, 0.05, 0], 0.1, 8);
  /* The counterweight: a great lump of Nile mud bound with rope */
  builder.sphere(
    "matte",
    nileMud,
    0.26,
    [weightEnd[0], weightEnd[1] - 0.18, weightEnd[2]],
    [1, 0.9, 1],
    12,
  );
  builder.cylinder("matte", palette.cream, {
    radius: 0.255,
    length: 0.04,
    at: [weightEnd[0], weightEnd[1] - 0.18, weightEnd[2]],
    segments: 12,
    isOpen: true,
  });
  builder.bar(
    "matte",
    palette.cream,
    [weightEnd[0], weightEnd[1] - 0.1, weightEnd[2]],
    weightEnd,
    0.03,
    4,
  );
  /* The rope and the leather bucket on its hoop */
  const bucketTop: Triple = [
    bucketEnd[0],
    bucketEnd[1] - ropeLength,
    bucketEnd[2],
  ];
  builder.bar("matte", palette.cream, bucketEnd, bucketTop, 0.025, 4);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.cream,
      bucketTop,
      [bucketTop[0] + side * 0.15, bucketTop[1] - 0.12, bucketTop[2]],
      0.02,
      4,
    );
  });
  builder.lathe(
    "matte",
    "#7a5232",
    [
      [0.02, -0.38],
      [0.1, -0.36],
      [0.16, -0.28],
      [0.17, -0.16],
      [0.15, -0.12],
    ],
    bucketTop,
    "y",
    12,
  );
  builder.torus(
    "matte",
    palette.darkTimber,
    0.15,
    0.015,
    [bucketTop[0], bucketTop[1] - 0.12, bucketTop[2]],
    "y",
    12,
  );
  builder.cylinder("water", channelBlue, {
    radius: 0.14,
    length: 0.02,
    at: [bucketTop[0], bucketTop[1] - 0.15, bucketTop[2]],
    segments: 10,
  });
};

const buildTrough = (builder: AttractionBuilder) => {
  const { x, z } = trough;
  builder.lathe(
    "matte",
    "#b8643a",
    [
      [0.3, 0],
      [0.42, 0.2],
      [0.46, 0.32],
      [0.38, 0.32],
      [0.3, 0.12],
      [0, 0.12],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 6 : 16,
  );
  builder.cylinder("water", channelBlue, {
    radius: 0.36,
    length: 0.02,
    at: [x, 0.26, z],
    segments: builder.isFar ? 6 : 16,
  });
  /* A furrow carrying water out to the crops */
  builder.box(
    "matte",
    nileMud,
    [0.2, 0.03, 2.4],
    [x + 0.6, 0.015, z + 1.4],
    [0, 0.42, 0],
  );
  if (!builder.isFar) {
    builder.box(
      "water",
      channelBlue,
      [0.12, 0.02, 2.4],
      [x + 0.6, 0.04, z + 1.4],
      [0, 0.42, 0],
    );
  }
};

/** Water slops over the trough's lip when someone comes to help. */
const buildSplash = (builder: AttractionBuilder) => {
  for (let jet = 0; jet < 5; jet++) {
    const angle = (jet / 5) * Math.PI * 2;
    builder.add("water", "#cfeef8", new ConeGeometry(0.06, 0.35, 6), {
      at: [Math.sin(angle) * 0.15, 0.17, Math.cos(angle) * 0.15],
      rotation: [Math.cos(angle) * 0.4, 0, -Math.sin(angle) * 0.4],
    });
  }
  builder.sphere("water", "#cfeef8", 0.1, [0, 0.3, 0], [1, 1.2, 1], 8);
};

const buildFields = (builder: AttractionBuilder) => {
  /* A wheat field on the right, an onion and lettuce bed on the left */
  const wheatPlot = { minX: 1.0, maxX: 3.6, minZ: -0.75, maxZ: 1.7 };
  const vegPlot = { minX: -3.7, maxX: -1.4, minZ: -0.7, maxZ: 1.2 };
  [wheatPlot, vegPlot].forEach(({ minX, maxX, minZ, maxZ }) => {
    builder.box(
      "matte",
      fieldSoil,
      [maxX - minX, 0.04, maxZ - minZ],
      [(minX + maxX) / 2, 0.02, (minZ + maxZ) / 2],
    );
  });
  if (builder.isFar) {
    builder.box("matte", wheat, [2.4, 0.5, 2.3], [2.3, 0.3, 0.47]);
    return;
  }
  const wheatRows = 5;
  for (let row = 0; row < wheatRows; row++) {
    const x = wheatPlot.minX + 0.3 + row * 0.5;
    for (let clump = 0; clump < 7; clump++) {
      const z = wheatPlot.minZ + 0.2 + clump * 0.35;
      const height = 0.55 + ((row + clump) % 3) * 0.07;
      builder.add(
        "matte",
        (row + clump) % 2 === 0 ? wheat : shade(wheat, 0.9),
        new ConeGeometry(0.13, height, 5),
        {
          at: [x + (clump % 2) * 0.05, height / 2 + 0.04, z],
          rotation: [0, clump, 0],
        },
      );
      builder.add("matte", shade(wheat, 1.1), new ConeGeometry(0.06, 0.18, 4), {
        at: [x + (clump % 2) * 0.05, height + 0.1, z],
      });
    }
    if (row < wheatRows - 1) {
      builder.box(
        "water",
        channelBlue,
        [0.08, 0.02, wheatPlot.maxZ - wheatPlot.minZ - 0.1],
        [x + 0.25, 0.045, (wheatPlot.minZ + wheatPlot.maxZ) / 2],
      );
    }
  }
  for (let row = 0; row < 4; row++) {
    const x = vegPlot.minX + 0.3 + row * 0.55;
    for (let plant = 0; plant < 5; plant++) {
      const z = vegPlot.minZ + 0.2 + plant * 0.38;
      if (row % 2 === 0) {
        builder.sphere(
          "matte",
          plant % 2 === 0 ? "#7ab84a" : "#6aa83a",
          0.12,
          [x, 0.1, z],
          [1, 0.75, 1],
          6,
        );
      } else {
        builder.sphere("matte", "#e8dcc0", 0.06, [x, 0.06, z], [1, 0.9, 1], 5);
        for (let leaf = 0; leaf < 3; leaf++) {
          builder.bar(
            "matte",
            "#4f8a3a",
            [x, 0.08, z],
            [x + (leaf - 1) * 0.06, 0.38, z + (leaf - 1) * 0.03],
            0.025,
            3,
          );
        }
      }
    }
  }
  /* A hoe and a basket of picked onions */
  builder.bar(
    "matte",
    poleTimber,
    [-1.0, 0.02, 1.6],
    [-0.2, 0.05, 2.1],
    0.04,
    5,
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.24, 0.03, 0.12],
    [-1.05, 0.03, 1.5],
    [0, 0.55, 0],
  );
  builder.cylinder("matte", "#c9a760", {
    radius: 0.2,
    radiusEnd: 0.24,
    length: 0.22,
    at: [-1.1, 0.11, 2.15],
    segments: 12,
    isOpen: true,
  });
  [0, 1, 2, 3].forEach((onion) => {
    builder.sphere(
      "matte",
      "#e8dcc0",
      0.06,
      [-1.16 + (onion % 2) * 0.12, 0.2, 2.1 + Math.floor(onion / 2) * 0.1],
      [1, 1, 1],
      5,
    );
  });
};

/** Beehive-shaped mud granaries for storing the harvest. */
const buildGranaries = (builder: AttractionBuilder) => {
  [
    { x: -3.0, z: 2.2, size: 1 },
    { x: -2.2, z: 2.85, size: 0.8 },
  ].forEach(({ x, z, size }) => {
    builder.lathe(
      "matte",
      shade(mudBrick, 1.08),
      [
        [0, 0],
        [0.62, 0],
        [0.64, 0.45],
        [0.55, 0.9],
        [0.35, 1.25],
        [0.12, 1.42],
        [0, 1.45],
      ].map(([radius, height]): [number, number] => [
        radius * size,
        height * size,
      ]),
      [x, 0, z],
      "y",
      builder.isFar ? 6 : 16,
    );
    if (builder.isFar) {
      return;
    }
    builder.box(
      "matte",
      "#3a2a1a",
      [0.26 * size, 0.3 * size, 0.04],
      [x, 1.0 * size, z + 0.53 * size],
      [-0.35, 0, 0],
    );
    builder.cylinder("matte", shade(mudBrick, 0.85), {
      radius: 0.66 * size,
      length: 0.06,
      at: [x, 0.1, z],
      segments: 16,
      isOpen: true,
    });
  });
  if (builder.isFar) {
    return;
  }
  /* A ladder up to the filling hole */
  [-0.12, 0.12].forEach((side) => {
    builder.bar(
      "matte",
      poleTimber,
      [-3.0 + side, 0, 3.05],
      [-3.0 + side, 1.15, 2.65],
      0.035,
      4,
    );
  });
  for (let rung = 1; rung < 5; rung++) {
    builder.box(
      "matte",
      poleTimber,
      [0.26, 0.025, 0.025],
      [-3.0, rung * 0.23, 3.05 - rung * 0.08],
    );
  }
};

const addPalm = (
  builder: AttractionBuilder,
  at: Triple,
  height: number,
  lean: [number, number],
) => {
  const pieces = builder.isFar ? 2 : 6;
  const pointAt = (share: number): Triple => [
    at[0] + lean[0] * share * share * height,
    at[1] + share * height,
    at[2] + lean[1] * share * share * height,
  ];
  for (let piece = 0; piece < pieces; piece++) {
    builder.bar(
      "matte",
      piece % 2 === 0 ? "#8a6a48" : "#75583a",
      pointAt(piece / pieces),
      pointAt((piece + 1) / pieces),
      0.24 - (piece / pieces) * 0.08,
      builder.isFar ? 5 : 8,
    );
  }
  const top = pointAt(1);
  const fronds = builder.isFar ? 5 : 9;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2 + 0.3;
    const reach = 1.2 + (frond % 2) * 0.2;
    const out = (distance: number, drop: number): Triple => [
      top[0] + Math.sin(angle) * distance,
      top[1] + drop,
      top[2] + Math.cos(angle) * distance,
    ];
    const colour = frond % 2 === 0 ? "#4f8f3a" : "#3f7a30";
    if (builder.isFar) {
      addSlab(builder, "matte", colour, top, out(reach, -0.4), 0.4, 0.04);
      continue;
    }
    const points = [
      out(0, 0.05),
      out(reach * 0.35, 0.18),
      out(reach * 0.7, 0.05),
      out(reach, -0.4),
    ];
    for (let piece = 0; piece < 3; piece++) {
      addSlab(
        builder,
        "matte",
        colour,
        points[piece],
        points[piece + 1],
        0.42 - piece * 0.11,
        0.035,
      );
    }
    addSlab(
      builder,
      "matte",
      shade(colour, 1.25),
      points[0],
      points[2],
      0.05,
      0.05,
    );
  }
  if (!builder.isFar) {
    [0, 2.1, 4.2].forEach((angle) => {
      builder.sphere(
        "matte",
        "#b8642a",
        0.09,
        [
          top[0] + Math.sin(angle) * 0.14,
          top[1] - 0.12,
          top[2] + Math.cos(angle) * 0.14,
        ],
        [1, 1.3, 1],
        6,
      );
    });
  }
};

/** An Egyptian goose, pottering about the fields. */
const buildGoose = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#b8946a", 0.14, [0, 0.22, 0], [0.8, 0.75, 1.3], 8);
  builder.sphere("paint", "#5a3d22", 0.08, [0, 0.27, -0.12], [0.85, 0.6, 1], 6);
  builder.bar("paint", "#d8c8a8", [0, 0.28, 0.12], [0, 0.45, 0.17], 0.06, 5);
  builder.sphere("paint", "#d8c8a8", 0.05, [0, 0.47, 0.19], [0.9, 0.9, 1.2], 6);
  builder.sphere("paint", "#6b3a22", 0.02, [0.03, 0.48, 0.2], [1, 1, 1], 4);
  builder.add(
    "paint",
    "#e88a5a",
    new ConeGeometry(0.02, 0.07, 4).rotateX(Math.PI / 2),
    { at: [0, 0.46, 0.26] },
  );
  [-0.05, 0.05].forEach((side) => {
    builder.bar("paint", "#e88a5a", [side, 0.12, 0], [side, 0, 0.02], 0.02, 4);
  });
};

export const shadufModel: CuriosityModel = {
  kind: "shaduf",
  islandId: "sunscorch-sands",
  name: "Shaduf",
  fact: "A shaduf is a long pole that see-saws on a frame, with a bucket at one end and a heavy weight at the other. The Ancient Egyptians used shadufs to lift water out of the River Nile and its canals to water their crops. The weight does most of the work, so one farmer could lift hundreds of buckets a day.",
  curriculumLink:
    "History, Key Stage 2: the achievements of the earliest civilizations, a depth study of Ancient Egypt, including how farmers along the River Nile watered their crops.",
  footprint: 4.9,
  setting: "inland",
  padColour: sand,
  signSpot: { x: 1.5, z: 3.9 },
  build: (builder) => {
    buildChannel(builder);
    buildFrame(builder);
    buildTrough(builder);
    buildFields(builder);
    buildGranaries(builder);
    addPalm(builder, [2.6, 0, -2.6], 3.0, [-0.1, 0.12]);
    if (builder.isFar) {
      builder.bar(
        "matte",
        poleTimber,
        [
          pivot[0],
          pivot[1] - Math.sin(restTilt) * weightArm,
          pivot[2] + Math.cos(restTilt) * weightArm,
        ],
        [
          pivot[0],
          pivot[1] + Math.sin(restTilt) * bucketArm,
          pivot[2] - Math.cos(restTilt) * bucketArm,
        ],
        0.1,
        4,
      );
    }
    addSignBoard(builder, [1.5, 0, 3.9], signColour);
  },
  moving: [
    {
      name: "pole",
      pivot,
      build: buildPole,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6.5,
        amplitude: 0.4,
        period: 3.2,
      },
    },
    {
      name: "splash",
      pivot: [trough.x, 0.22, trough.z],
      build: buildSplash,
      motion: { kind: "splash", reach: 5.5, period: 3.2 },
    },
  ],
  wanderers: [
    {
      name: "geese",
      build: buildGoose,
      count: 2,
      centre: { x: 0.2, z: 1.2 },
      radius: 0.9,
      speed: 0.3,
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: -channel.halfLength, z: channel.z },
      { x: channel.halfLength, z: channel.z },
      0.5,
      0.6,
    ),
    { x: frameX - 0.38, z: pivot[2], radius: 0.25 },
    { x: frameX + 0.38, z: pivot[2], radius: 0.25 },
    { x: frameX, z: pivot[2] + 0.75, radius: 0.32 },
    { x: trough.x, z: trough.z, radius: 0.5 },
    { x: -3.0, z: 2.2, radius: 0.65 },
    { x: -2.2, z: 2.85, radius: 0.55 },
    { x: 2.6, z: -2.6, radius: 0.25 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Lift some water",
    news: "Creak, splosh! You pulled the bucket down into the canal, and the heavy mud weight swung it up full of water for the wheat.",
  },
};
