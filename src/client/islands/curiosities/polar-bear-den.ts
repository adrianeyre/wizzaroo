import {
  CylinderGeometry,
  DodecahedronGeometry,
  LatheGeometry,
  Vector2,
} from "three";
import {
  addSignBoard,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowWhite = "#fbfdff";
const snowShadow = "#d4e0ea";
const caveDark = "#1d2a38";
const bearFur = "#f1ead6";
const bearShade = "#ddd2b8";
const bearNose = "#1b1b1f";
const iceBlue = "#bfe0f0";
const seaDark = "#1f5a7a";
const rockGrey = "#646d77";
const signColour = "#2f6f9a";

const mound = { x: 0.3, z: -2.0, radius: 2.35, height: 1.95, widen: 1.15 };
const mouth = { x: 0.35, z: 0.3, radius: 0.58 };
const cubPivot: Triple = [mouth.x, -0.72, mouth.z + 0.28];
const mother: Triple = [-2.05, 0, 0.75];
const motherNeck: Triple = [mother[0], 0.74, mother[2] + 0.72];
const breathingHole = { x: 2.6, z: 1.3, radius: 0.45 };
const signAt: Triple = [-0.9, 0, 3.95];

/* ------------------------------------------------------------------ */
/* The drift and the den                                               */
/* ------------------------------------------------------------------ */

const buildMound = (builder: AttractionBuilder) => {
  const steps = builder.isFar ? 4 : 12;
  const profile: Vector2[] = [];
  for (let step = 0; step <= steps; step++) {
    const angle = (step / steps) * (Math.PI / 2);
    profile.push(
      new Vector2(
        Math.cos(angle) * mound.radius,
        Math.sin(angle) * mound.height,
      ),
    );
  }
  builder.add(
    "matte",
    snowWhite,
    new LatheGeometry(profile, builder.segments(36)),
    { at: [mound.x, 0, mound.z], scale: [mound.widen, 1, 1] },
  );
  /* The dark way into the den, under an arch of snow */
  builder.add(
    "matte",
    caveDark,
    new CylinderGeometry(
      mouth.radius,
      mouth.radius,
      0.05,
      builder.segments(18),
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    )
      .rotateX(Math.PI / 2)
      .scale(1.1, 1, 1),
    { at: [mouth.x, 0, mouth.z] },
  );
  if (builder.isFar) {
    return;
  }
  builder.add(
    "matte",
    shade(caveDark, 0.7),
    new CylinderGeometry(
      mouth.radius * 0.7,
      mouth.radius * 0.7,
      0.05,
      14,
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    )
      .rotateX(Math.PI / 2)
      .scale(1.1, 1, 1),
    { at: [mouth.x, 0, mouth.z + 0.01] },
  );
  /* A thick lip of snow round the arch, and a trampled apron in front */
  builder.torus(
    "matte",
    snowShadow,
    mouth.radius * 1.08,
    0.12,
    [mouth.x, 0, mouth.z + 0.02],
    "z",
    24,
  );
  builder.cylinder("matte", snowShadow, {
    radius: 0.9,
    radiusEnd: 0.75,
    length: 0.06,
    at: [mouth.x, 0.03, mouth.z + 0.75],
    segments: 20,
  });
  /* Wind-carved ridges and lumps on the drift */
  [
    [-1.3, 1.1, -1.2, 0.7],
    [1.6, 1.0, -1.4, 0.6],
    [0.2, 1.75, -2.2, 0.75],
    [-0.6, 0.9, -3.4, 0.6],
    [1.9, 0.5, -3.0, 0.55],
  ].forEach(([x, y, z, size]) => {
    builder.sphere(
      "matte",
      shade(snowWhite, 0.98),
      size,
      [x, y, z],
      [1.4, 0.45, 1],
      12,
    );
  });
  /* An air hole the mother scraped in the roof */
  builder.cylinder("matte", caveDark, {
    radius: 0.09,
    length: 0.04,
    at: [0.8, 1.78, -1.6],
    segments: 10,
  });
  /* Icicles hanging from the lip of the arch */
  for (let icicle = 0; icicle < 5; icicle++) {
    const angle = -0.9 + icicle * 0.45;
    builder.cylinder("glass", iceBlue, {
      radius: 0.03,
      radiusEnd: 0.002,
      length: 0.18 - Math.abs(icicle - 2) * 0.03,
      at: [
        mouth.x + Math.sin(angle) * mouth.radius * 1.05,
        Math.cos(angle) * mouth.radius - 0.1,
        mouth.z + 0.08,
      ],
      segments: 6,
    });
  }
};

/* ------------------------------------------------------------------ */
/* The bears                                                           */
/* ------------------------------------------------------------------ */

/** The mother lying down with her front paws stretched out, facing +z. */
const buildMother = (builder: AttractionBuilder) => {
  const [x, , z] = mother;
  builder.sphere(
    "matte",
    bearFur,
    0.6,
    [x, 0.5, z - 0.15],
    [0.95, 0.8, 1.55],
    builder.isFar ? 8 : 16,
  );
  if (builder.isFar) {
    builder.sphere(
      "matte",
      bearFur,
      0.3,
      [motherNeck[0], motherNeck[1] - 0.05, motherNeck[2] + 0.2],
      [1, 0.9, 1.2],
      6,
    );
    return;
  }
  /* Shoulders and haunches */
  builder.sphere("matte", bearFur, 0.45, [x, 0.55, z + 0.35], [1.05, 1, 1], 12);
  builder.sphere(
    "matte",
    bearShade,
    0.45,
    [x, 0.4, z - 0.8],
    [1.15, 0.85, 1],
    12,
  );
  /* Front legs stretched out with big furry paws */
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", bearFur, {
      radius: 0.15,
      length: 0.6,
      at: [x + side * 0.24, 0.15, z + 0.75],
      axis: "z",
      segments: 12,
    });
    builder.sphere(
      "matte",
      bearShade,
      0.17,
      [x + side * 0.24, 0.1, z + 1.05],
      [1.1, 0.6, 1.2],
      12,
    );
    for (let claw = -1; claw <= 1; claw++) {
      builder.box(
        "matte",
        "#3a3530",
        [0.025, 0.025, 0.06],
        [x + side * 0.24 + claw * 0.06, 0.06, z + 1.24],
      );
    }
    /* Back legs tucked along her side */
    builder.sphere(
      "matte",
      bearShade,
      0.2,
      [x + side * 0.42, 0.18, z - 0.95],
      [0.8, 0.8, 1.5],
      12,
    );
  });
  builder.sphere("matte", bearFur, 0.09, [x, 0.55, z - 1.18], [1, 1, 1], 8);
};

/** The mother's head, her neck at the pivot, lifting to say hello. */
const buildMotherHead = (builder: AttractionBuilder) => {
  builder.sphere("matte", bearFur, 0.28, [0, 0.0, 0.18], [0.95, 0.85, 1.1], 14);
  /* The long snout, nose and mouth */
  builder.sphere(
    "matte",
    bearShade,
    0.15,
    [0, -0.06, 0.42],
    [0.9, 0.75, 1.3],
    14,
  );
  builder.sphere(
    "paint",
    bearNose,
    0.055,
    [0, -0.02, 0.6],
    [1.2, 0.8, 0.9],
    10,
  );
  builder.box("matte", bearNose, [0.08, 0.012, 0.02], [0, -0.13, 0.52]);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      bearNose,
      0.032,
      [side * 0.11, 0.08, 0.38],
      [1, 1, 0.8],
      8,
    );
    builder.sphere(
      "paint",
      "#ffffff",
      0.01,
      [side * 0.1, 0.095, 0.405],
      [1, 1, 1],
      4,
    );
    /* Small round ears */
    builder.sphere(
      "matte",
      bearFur,
      0.07,
      [side * 0.18, 0.2, 0.08],
      [1, 1, 0.6],
      10,
    );
    builder.sphere(
      "matte",
      bearShade,
      0.04,
      [side * 0.18, 0.2, 0.11],
      [1, 1, 0.4],
      6,
    );
  });
};

/** A cub peeping out of the den, paws on the snow. */
const buildCub = (builder: AttractionBuilder) => {
  builder.sphere("matte", bearFur, 0.24, [0, 0.28, 0], [1, 1.1, 0.95], 12);
  builder.sphere("matte", bearFur, 0.17, [0, 0.6, 0.06], [1, 0.95, 1], 12);
  builder.sphere("matte", bearShade, 0.08, [0, 0.56, 0.21], [1, 0.8, 1.1], 10);
  builder.sphere("paint", bearNose, 0.03, [0, 0.58, 0.3], [1.2, 0.8, 0.9], 8);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      bearNose,
      0.022,
      [side * 0.065, 0.65, 0.19],
      [1, 1, 0.8],
      6,
    );
    builder.sphere(
      "matte",
      bearFur,
      0.055,
      [side * 0.12, 0.74, 0.03],
      [1, 1, 0.6],
      8,
    );
    builder.sphere(
      "matte",
      bearShade,
      0.08,
      [side * 0.12, 0.32, 0.2],
      [1, 0.8, 1.2],
      10,
    );
  });
};

/* ------------------------------------------------------------------ */
/* Around the den                                                      */
/* ------------------------------------------------------------------ */

/** A fish skeleton, picked clean, lying at an angle. */
const addFishBones = (builder: AttractionBuilder, at: Triple, turn: number) => {
  const along = (distance: number, across: number): Triple => [
    at[0] + Math.sin(turn) * distance + Math.cos(turn) * across,
    0.025,
    at[2] + Math.cos(turn) * distance - Math.sin(turn) * across,
  ];
  builder.bar("matte", "#efe8d8", along(-0.22, 0), along(0.2, 0), 0.025, 5);
  for (let rib = 0; rib < 5; rib++) {
    const distance = -0.12 + rib * 0.065;
    const length = 0.08 - Math.abs(rib - 2) * 0.012;
    builder.bar(
      "matte",
      "#efe8d8",
      along(distance, -length),
      along(distance + 0.03, length),
      0.012,
      4,
    );
  }
  builder.sphere("matte", "#d9cfba", 0.06, along(0.26, 0), [1, 0.5, 1.4], 8);
  builder.box("matte", "#d9cfba", [0.12, 0.015, 0.06], along(-0.26, 0), [
    0,
    turn + Math.PI / 2,
    0,
  ]);
};

/** A paw print: a broad pad and four toes. */
const addPawPrint = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  turn: number,
) => {
  builder.sphere("matte", snowShadow, 0.09, [x, 0.0, z], [1, 0.12, 1.15], 6);
  for (let toe = 0; toe < 4; toe++) {
    const across = (toe - 1.5) * 0.055;
    builder.sphere(
      "matte",
      snowShadow,
      0.03,
      [
        x + Math.cos(turn) * across + Math.sin(turn) * 0.12,
        0.0,
        z - Math.sin(turn) * across + Math.cos(turn) * 0.12,
      ],
      [1, 0.2, 1],
      4,
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A seal's breathing hole in a patch of sea ice */
  builder.cylinder("glass", iceBlue, {
    radius: breathingHole.radius + 0.55,
    length: 0.04,
    at: [breathingHole.x, 0.02, breathingHole.z],
    segments: builder.isFar ? 10 : 24,
  });
  builder.cylinder("water", seaDark, {
    radius: breathingHole.radius,
    length: 0.03,
    at: [breathingHole.x, 0.045, breathingHole.z],
    segments: builder.isFar ? 10 : 22,
  });
  [
    [-3.3, -1.4, 0.45, 0.4],
    [3.4, -1.0, 0.5, 1.6],
  ].forEach(([x, z, size, turn]) => {
    builder.add(
      "matte",
      rockGrey,
      new DodecahedronGeometry(size, 0),
      {
        at: [x, size * 0.45, z],
        rotation: [turn, turn, 0],
        scale: [1.2, 0.8, 1],
      },
      undefined,
    );
    if (!builder.isFar) {
      builder.sphere(
        "matte",
        snowWhite,
        size * 0.85,
        [x, size * 0.8, z],
        [1.3, 0.35, 1.1],
        10,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  addFishBones(builder, [-0.9, 0, 1.75], 0.6);
  addFishBones(builder, [1.6, 0, 2.2], -1.1);
  /* Paw prints: big ones from the sea ice, tiny ones from the den */
  [
    [2.0, 2.3],
    [1.5, 1.95],
    [1.0, 2.15],
    [0.4, 1.8],
    [-0.2, 2.0],
    [-0.8, 1.55],
  ].forEach(([x, z], index) => {
    addPawPrint(builder, x, z + (index % 2) * 0.12, -1.3);
  });
  [
    [0.55, 1.35],
    [0.75, 1.65],
    [0.6, 1.95],
    [0.85, 2.3],
  ].forEach(([x, z]) => {
    builder.sphere("matte", snowShadow, 0.05, [x, 0.0, z], [1, 0.12, 1.15], 6);
  });
  /* Floes heaved up round the breathing hole */
  [0.4, 1.9, 3.3, 4.8].forEach((angle) => {
    builder.box(
      "glass",
      shade(iceBlue, 1.06),
      [0.3, 0.07, 0.2],
      [
        breathingHole.x + Math.sin(angle) * (breathingHole.radius + 0.25),
        0.08,
        breathingHole.z + Math.cos(angle) * (breathingHole.radius + 0.25),
      ],
      [0.1, angle, 0.06],
    );
  });
  /* Drifts, and a few stalks of arctic willow poking through */
  [
    [-3.6, 2.0, 0.6],
    [3.7, 0.9, 0.5],
    [-1.8, 3.4, 0.5],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowWhite, size, [x, 0, z], [1.5, 0.45, 1], 10);
  });
  [
    [-3.2, 2.4],
    [3.3, 1.5],
  ].forEach(([x, z]) => {
    for (let stalk = 0; stalk < 4; stalk++) {
      builder.bar(
        "matte",
        "#7a5a3a",
        [x + stalk * 0.06, 0.1, z],
        [
          x + stalk * 0.06 + (stalk - 1.5) * 0.08,
          0.5 + (stalk % 2) * 0.12,
          z + 0.04,
        ],
        0.022,
        4,
      );
    }
  });
};

export const polarBearDenModel: CuriosityModel = {
  kind: "polar-bear-den",
  islandId: "frost-isle",
  name: "Polar Bear Den",
  fact: "A mother polar bear digs a den deep in a snowdrift, and her tiny cubs are born there in the middle of winter. The snow keeps out the icy wind, so the den stays snug until spring. Polar bears have thick fur and a layer of fat to keep warm, and they hunt seals from the sea ice. Without snow and sea ice, polar bears could not find food or shelter.",
  curriculumLink:
    "Science, Year 2: living things and their habitats. Describe how different habitats provide for the basic needs of different kinds of animals, and how they depend on each other.",
  footprint: 4.5,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildMound(builder);
    buildMother(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "cub",
      pivot: cubPivot,
      build: buildCub,
      motion: { kind: "rise", reach: 5, height: 0.72, period: 2.2 },
    },
    {
      name: "mother's head",
      pivot: motherNeck,
      build: buildMotherHead,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.25,
        period: 2.4,
      },
    },
  ],
  blockers: [
    { x: mound.x, z: mound.z, radius: 2.1 },
    { x: mound.x - 1.6, z: mound.z + 0.3, radius: 0.9 },
    { x: mound.x + 1.6, z: mound.z + 0.3, radius: 0.9 },
    { x: mother[0], z: mother[2] - 0.2, radius: 0.75 },
    { x: mother[0], z: mother[2] + 0.75, radius: 0.45 },
    { x: breathingHole.x, z: breathingHole.z, radius: breathingHole.radius },
    { x: -3.3, z: -1.4, radius: 0.5 },
    { x: 3.4, z: -1.0, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Say hello quietly",
    news: "Shh! You whispered hello, and a fluffy cub peeped out of the den while its mother watched over it.",
  },
};
