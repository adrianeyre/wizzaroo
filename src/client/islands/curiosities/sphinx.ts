import { BoxGeometry, ConeGeometry } from "three";
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

const sand = "#e2c48a";
const limestone = "#d9b77e";
const limestoneShadow = "#c29c62";
const plinthStone = "#c8a46c";
const lapis = "#2a4f9a";
const gold = "#e0b33a";
const faceStone = "#dcb680";
const eyeDark = "#2b2016";
const altarStone = "#b89462";
const signColour = "#a0522d";

const plinth = { halfWidth: 1.3, minZ: -3.0, maxZ: 1.4, height: 0.5 };
const top = plinth.height;
/** The head nods about the line through its eyes, so the glowing eyes stay put. */
const eyesAt: Triple = [0, top + 2.3, 0.62];
const altarAt: Triple = [0, 0, 2.3];
const brazierSpots: Triple[] = [
  [-1.15, 0, 2.15],
  [1.15, 0, 2.15],
];

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

const buildPlinth = (builder: AttractionBuilder) => {
  const { halfWidth, minZ, maxZ, height } = plinth;
  const middle = (minZ + maxZ) / 2;
  const length = maxZ - minZ;
  builder.box(
    "matte",
    shade(plinthStone, 0.9),
    [halfWidth * 2 + 0.5, height / 2, length + 0.5],
    [0, height / 4, middle],
  );
  builder.box(
    "matte",
    plinthStone,
    [halfWidth * 2, height / 2, length],
    [0, (height * 3) / 4, middle],
  );
  if (builder.isFar) {
    return;
  }
  /* A cornice round the top, and carved panels on the front */
  builder.box(
    "matte",
    shade(plinthStone, 1.1),
    [halfWidth * 2 + 0.08, 0.06, length + 0.08],
    [0, height - 0.03, middle],
  );
  for (let panel = 0; panel < 3; panel++) {
    const x = (panel - 1) * 0.8;
    builder.box(
      "matte",
      shade(plinthStone, 0.85),
      [0.6, 0.16, 0.02],
      [x, height * 0.72, maxZ + 0.01],
    );
    /* Little carved signs in a row, like hieroglyphs */
    for (let sign = 0; sign < 4; sign++) {
      const kind = (panel + sign) % 3;
      const signX = x - 0.21 + sign * 0.14;
      if (kind === 0) {
        builder.box(
          "matte",
          lapis,
          [0.05, 0.08, 0.02],
          [signX, height * 0.72, maxZ + 0.025],
        );
      } else if (kind === 1) {
        builder.cylinder("matte", "#a83a2a", {
          radius: 0.035,
          length: 0.02,
          at: [signX, height * 0.72, maxZ + 0.025],
          axis: "z",
          segments: 8,
        });
      } else {
        builder.box(
          "matte",
          "#3a6e5a",
          [0.08, 0.025, 0.02],
          [signX, height * 0.72 - 0.02, maxZ + 0.025],
        );
        builder.box(
          "matte",
          "#3a6e5a",
          [0.025, 0.07, 0.02],
          [signX, height * 0.72 + 0.01, maxZ + 0.025],
        );
      }
    }
  }
  /* Drifted sand heaped against the back and sides */
  builder.sphere(
    "matte",
    shade(sand, 0.95),
    1.2,
    [0.2, 0, minZ - 0.2],
    [1.7, 0.45, 0.8],
    10,
  );
  builder.sphere(
    "matte",
    shade(sand, 1.03),
    0.7,
    [-halfWidth - 0.25, 0, -1.4],
    [0.6, 0.4, 1.6],
    12,
  );
};

const buildBody = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 8 : 16;
  /* Haunches, back and deep chest, blended together */
  builder.sphere(
    "matte",
    limestone,
    1,
    [0, top + 0.62, -1.95],
    [0.82, 0.66, 0.95],
    segments,
  );
  builder.sphere(
    "matte",
    limestone,
    1,
    [0, top + 0.66, -0.95],
    [0.76, 0.62, 1.25],
    segments,
  );
  builder.sphere(
    "matte",
    limestone,
    1,
    [0, top + 0.95, 0.05],
    [0.68, 0.92, 0.62],
    segments,
  );
  /* The neck, rising under the headdress */
  builder.cylinder("matte", limestone, {
    radius: 0.36,
    radiusEnd: 0.3,
    length: 0.9,
    at: [0, top + 1.75, 0.3],
    segments: builder.isFar ? 6 : 16,
  });
  /* Folded back legs and forelegs stretched out in front */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      shade(limestone, 0.97),
      1,
      [side * 0.66, top + 0.48, -1.85],
      [0.3, 0.46, 0.66],
      builder.isFar ? 6 : 12,
    );
    builder.sphere(
      "matte",
      limestone,
      1,
      [side * 0.78, top + 0.12, -1.15],
      [0.2, 0.13, 0.36],
      builder.isFar ? 6 : 12,
    );
    builder.cylinder("matte", limestone, {
      radius: 0.2,
      radiusEnd: 0.18,
      length: 1.3,
      at: [side * 0.42, top + 0.2, 0.75],
      axis: "z",
      segments: builder.isFar ? 6 : 12,
    });
    builder.sphere(
      "matte",
      limestone,
      1,
      [side * 0.42, top + 0.42, 0.1],
      [0.26, 0.38, 0.36],
      builder.isFar ? 6 : 12,
    );
    builder.sphere(
      "matte",
      shade(limestone, 1.04),
      1,
      [side * 0.42, top + 0.17, 1.42],
      [0.24, 0.17, 0.3],
      builder.isFar ? 6 : 12,
    );
    if (builder.isFar) {
      return;
    }
    /* Toes on the front paws, and claws on the back ones */
    for (let toe = 0; toe < 3; toe++) {
      builder.sphere(
        "matte",
        shade(limestone, 0.94),
        0.07,
        [side * 0.42 + (toe - 1) * 0.13, top + 0.08, 1.66],
        [1, 0.8, 1.2],
        8,
      );
    }
    for (let toe = 0; toe < 3; toe++) {
      builder.sphere(
        "matte",
        shade(limestone, 0.94),
        0.06,
        [side * 0.8, top + 0.06, -0.82 + (toe - 1) * 0.004],
        [1, 0.8, 1],
        6,
      );
    }
    /* Shading lines for muscles on the flanks */
    addSlab(
      builder,
      "matte",
      limestoneShadow,
      [side * 0.79, top + 0.5, -1.4],
      [side * 0.74, top + 0.95, -0.7],
      0.03,
      0.04,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* The tail curled round the right haunch, with its tuft */
  const tail: Triple[] = [
    [0.2, top + 0.55, -2.85],
    [0.6, top + 0.25, -2.6],
    [0.85, top + 0.12, -2.0],
    [0.9, top + 0.1, -1.5],
  ];
  for (let piece = 0; piece < tail.length - 1; piece++) {
    builder.bar("matte", limestone, tail[piece], tail[piece + 1], 0.1, 8);
  }
  builder.sphere(
    "matte",
    limestoneShadow,
    0.1,
    [0.92, top + 0.12, -1.4],
    [1, 0.8, 1.4],
    8,
  );
  /* The Dream Stela stands between the paws */
  builder.roundedBox(
    "matte",
    shade(plinthStone, 1.05),
    [0.5, 0.75, 0.1],
    0.04,
    [0, top + 0.38, 0.95],
  );
  builder.cylinder("matte", shade(plinthStone, 1.05), {
    radius: 0.25,
    length: 0.1,
    at: [0, top + 0.75, 0.95],
    axis: "z",
    segments: 14,
  });
  builder.cylinder("paint", gold, {
    radius: 0.07,
    length: 0.02,
    at: [0, top + 0.8, 1.01],
    axis: "z",
    segments: 12,
  });
  [-0.15, 0.15].forEach((side) => {
    addSlab(
      builder,
      "paint",
      lapis,
      [side * 0.3, top + 0.8, 1.01],
      [side * 1.3, top + 0.78, 1.01],
      0.06,
      0.02,
    );
  });
  [0.2, 0.32, 0.44, 0.56].forEach((height) => {
    builder.box(
      "matte",
      shade(plinthStone, 0.8),
      [0.34, 0.025, 0.02],
      [0, top + height, 1.01],
    );
  });
};

/** The head, built about the line through its eyes. */
const buildHead = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 8 : 16;
  /* The face */
  builder.sphere(
    "matte",
    faceStone,
    0.32,
    [0, -0.06, -0.08],
    [0.88, 1.12, 0.85],
    segments,
  );
  /* The nemes headcloth over the crown, and its lappets falling to the chest */
  builder.sphere(
    "paint",
    gold,
    0.4,
    [0, 0.12, -0.2],
    [1.08, 0.86, 1.08],
    segments,
  );
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      gold,
      new BoxGeometry(0.16, 0.95, 0.42).translate(0, -0.4, 0),
      { at: [side * 0.34, 0.05, -0.18], rotation: [0, 0, side * 0.32] },
      undefined,
    );
  });
  builder.box("paint", gold, [0.5, 0.6, 0.18], [0, -0.35, -0.5]);
  if (builder.isFar) {
    return;
  }
  /* Blue stripes on the headcloth and lappets */
  for (let stripe = 0; stripe < 2; stripe++) {
    builder.torus(
      "paint",
      lapis,
      0.44 - stripe * 0.07,
      0.018,
      [0, 0.06 + stripe * 0.14, -0.2],
      "y",
      18,
    );
  }
  [-1, 1].forEach((side) => {
    for (let stripe = 0; stripe < 5; stripe++) {
      builder.add(
        "paint",
        lapis,
        new BoxGeometry(0.17, 0.06, 0.43).translate(0, -0.2 - stripe * 0.15, 0),
        { at: [side * 0.34, 0.05, -0.18], rotation: [0, 0, side * 0.32] },
        undefined,
      );
    }
  });
  /* A band across the brow, with the cobra rising from it */
  builder.box("paint", gold, [0.5, 0.06, 0.08], [0, 0.22, 0.12]);
  builder.cylinder("paint", gold, {
    radius: 0.035,
    radiusEnd: 0.05,
    length: 0.18,
    at: [0, 0.32, 0.17],
    segments: 8,
  });
  builder.sphere("paint", gold, 0.055, [0, 0.42, 0.18], [1.3, 0.8, 0.7], 10);
  builder.sphere("paint", "#c03a2a", 0.018, [0, 0.4, 0.22], [1, 1, 1], 6);
  /* Eyes, painted lines, nose and a calm smile */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      eyeDark,
      0.065,
      [side * 0.12, 0, 0.13],
      [1.3, 0.62, 0.6],
      10,
    );
    addSlab(
      builder,
      "matte",
      eyeDark,
      [side * 0.06, 0.035, 0.18],
      [side * 0.24, 0.02, 0.13],
      0.02,
      0.02,
    );
    addSlab(
      builder,
      "matte",
      shade(faceStone, 0.75),
      [side * 0.05, 0.1, 0.2],
      [side * 0.2, 0.11, 0.16],
      0.025,
      0.025,
    );
  });
  builder.add(
    "matte",
    shade(faceStone, 0.95),
    new ConeGeometry(0.05, 0.16, 6),
    { at: [0, -0.1, 0.22], rotation: [0.25, 0, 0] },
  );
  builder.box(
    "matte",
    shade(faceStone, 0.7),
    [0.12, 0.018, 0.02],
    [0, -0.22, 0.17],
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      faceStone,
      0.06,
      [side * 0.29, -0.04, -0.08],
      [0.5, 1, 0.8],
      8,
    );
  });
  /* The plaited royal beard under the chin */
  builder.cylinder("paint", lapis, {
    radius: 0.06,
    radiusEnd: 0.05,
    length: 0.3,
    at: [0, -0.5, 0.06],
    segments: 10,
  });
  [-0.42, -0.52, -0.6].forEach((height) => {
    builder.cylinder("paint", gold, {
      radius: 0.062,
      length: 0.025,
      at: [0, height, 0.06],
      segments: 10,
    });
  });
};

/** The eyes glow from within when someone comes to answer the riddle. */
const buildEyeGlow = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glow",
      "#7fe0ff",
      0.05,
      [side * 0.12, 0, 0.16],
      [1.3, 0.6, 0.6],
      8,
    );
  });
};

const buildAltar = (builder: AttractionBuilder) => {
  const [x, , z] = altarAt;
  builder.box("matte", altarStone, [1.0, 0.55, 0.55], [x, 0.275, z]);
  builder.box(
    "matte",
    shade(altarStone, 1.12),
    [1.12, 0.07, 0.65],
    [x, 0.585, z],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    shade(altarStone, 0.85),
    [1.04, 0.08, 0.6],
    [x, 0.04, z],
  );
  /* Offerings: bread, figs, grapes, a jar of milk and a lotus flower */
  [-0.32, -0.18].forEach((dx, index) => {
    builder.sphere(
      "matte",
      "#c98a3e",
      0.1,
      [x + dx, 0.66, z - 0.05 + index * 0.08],
      [1.3, 0.7, 0.9],
      10,
    );
  });
  for (let grape = 0; grape < 6; grape++) {
    const row = grape < 3 ? 0 : grape < 5 ? 1 : 2;
    builder.sphere(
      "paint",
      "#5b2a6e",
      0.04,
      [x + 0.05 + (grape % 3) * 0.06 - row * 0.03, 0.66 + row * 0.05, z + 0.08],
      [1, 1, 1],
      6,
    );
  }
  builder.lathe(
    "matte",
    "#b8643a",
    [
      [0, 0],
      [0.07, 0.01],
      [0.1, 0.1],
      [0.07, 0.2],
      [0.05, 0.22],
      [0.07, 0.26],
    ],
    [x + 0.32, 0.62, z - 0.1],
    "y",
    12,
  );
  builder.cylinder("paint", palette.cream, {
    radius: 0.05,
    length: 0.01,
    at: [x + 0.32, 0.88, z - 0.1],
    segments: 10,
  });
  builder.bar(
    "matte",
    "#4f8a3a",
    [x + 0.1, 0.62, z - 0.15],
    [x + 0.18, 0.75, z - 0.12],
    0.02,
    4,
  );
  builder.add(
    "paint",
    "#7aa7e0",
    new ConeGeometry(0.06, 0.09, 6, 1, true).rotateX(Math.PI),
    { at: [x + 0.18, 0.79, z - 0.12] },
  );
  /* A row of offerings painted on the front */
  [-0.3, 0, 0.3].forEach((dx, index) => {
    builder.box(
      "matte",
      index === 1 ? lapis : "#a83a2a",
      [0.18, 0.18, 0.02],
      [x + dx, 0.3, z + 0.285],
    );
  });
};

const buildBrazier = (builder: AttractionBuilder, [x, , z]: Triple) => {
  builder.cylinder("matte", altarStone, {
    radius: 0.16,
    radiusEnd: 0.1,
    length: 0.7,
    at: [x, 0.35, z],
    segments: builder.isFar ? 5 : 10,
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.12,
    radiusEnd: 0.22,
    length: 0.18,
    at: [x, 0.79, z],
    segments: builder.isFar ? 5 : 14,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", shade(altarStone, 0.85), {
    radius: 0.22,
    length: 0.06,
    at: [x, 0.03, z],
    segments: 10,
  });
  builder.torus(
    "metal",
    shade(palette.brass, 0.85),
    0.22,
    0.02,
    [x, 0.88, z],
    "y",
    14,
  );
  builder.sphere("matte", "#3a2a20", 0.15, [x, 0.86, z], [1, 0.3, 1], 8);
};

const buildFlame = (builder: AttractionBuilder) => {
  builder.add("glow", "#ffb43a", new ConeGeometry(0.14, 0.38, 8), {
    at: [0, 0.19, 0],
  });
  builder.add("glow", "#ffe48a", new ConeGeometry(0.07, 0.22, 6), {
    at: [0.02, 0.13, 0.03],
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A paved approach from the visitors' side */
  builder.box("matte", shade(sand, 0.92), [1.8, 0.03, 2.4], [0, 0.015, 3.0]);
  if (builder.isFar) {
    return;
  }
  for (let row = 0; row < 4; row++) {
    [-0.45, 0.45].forEach((dx, index) => {
      builder.box(
        "matte",
        shade(plinthStone, row % 2 === index ? 1.05 : 0.95),
        [0.85, 0.05, 0.55],
        [dx + (row % 2) * 0.05, 0.025, 1.95 + row * 0.6],
      );
    });
  }
  /* Fallen blocks, half buried */
  [
    [-2.6, 1.5, 0.3],
    [-2.3, 1.95, 1.1],
    [2.7, -1.6, 0.6],
    [-2.4, -2.6, 0.2],
  ].forEach(([x, z, turn]) => {
    builder.box(
      "matte",
      shade(limestone, 0.9 + (turn % 0.3)),
      [0.55, 0.38, 0.4],
      [x, 0.17, z],
      [0.08, turn, 0.05],
    );
  });
  /* A tiny scarab beetle on the plinth step */
  builder.sphere("paint", "#2f6f5a", 0.05, [0.9, 0.3, 1.55], [1, 0.6, 1.3], 8);
  builder.sphere("paint", "#2f6f5a", 0.025, [0.9, 0.3, 1.62], [1, 0.8, 1], 6);
};

/** The head as one still piece, for the far model. */
const buildHeadAt = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    faceStone,
    0.32,
    [eyesAt[0], eyesAt[1] - 0.06, eyesAt[2] - 0.08],
    [0.88, 1.12, 0.85],
    8,
  );
  builder.sphere(
    "paint",
    gold,
    0.4,
    [eyesAt[0], eyesAt[1] + 0.12, eyesAt[2] - 0.2],
    [1.08, 0.86, 1.08],
    8,
  );
  builder.box(
    "paint",
    gold,
    [0.85, 0.8, 0.4],
    [eyesAt[0], eyesAt[1] - 0.35, eyesAt[2] - 0.25],
  );
};

export const sphinxModel: CuriosityModel = {
  kind: "sphinx",
  islandId: "sunscorch-sands",
  name: "Sphinx",
  fact: "A sphinx has the body of a lion and the head of a king. The Great Sphinx of Giza in Egypt was carved from one huge piece of rock about 4,500 years ago, and it guards the pyramids. It wears a striped royal headcloth called a nemes. In a famous Greek story, a sphinx asked travellers a tricky riddle.",
  curriculumLink:
    "History, Key Stage 2: the achievements of the earliest civilizations, an overview of where and when they appeared, and a depth study of Ancient Egypt.",
  footprint: 4.9,
  setting: "inland",
  padColour: sand,
  signSpot: { x: 2.0, z: 3.85 },
  build: (builder) => {
    buildPlinth(builder);
    buildBody(builder);
    buildAltar(builder);
    brazierSpots.forEach((spot) => {
      buildBrazier(builder, spot);
    });
    buildGrounds(builder);
    if (builder.isFar) {
      buildHeadAt(builder);
    }
    addSignBoard(builder, [2.0, 0, 3.85], signColour);
  },
  moving: [
    {
      name: "head",
      pivot: eyesAt,
      build: buildHead,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.16,
        period: 2.4,
      },
    },
    {
      name: "eyes",
      pivot: eyesAt,
      build: buildEyeGlow,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "left flame",
      pivot: [brazierSpots[0][0], 0.88, brazierSpots[0][2]],
      build: buildFlame,
      motion: { kind: "flicker", period: 0.9 },
    },
    {
      name: "right flame",
      pivot: [brazierSpots[1][0], 0.88, brazierSpots[1][2]],
      build: buildFlame,
      motion: { kind: "flicker", period: 1.1, phase: 1.7 },
    },
  ],
  smoke: [
    {
      at: [altarAt[0] + 0.32, 0.9, altarAt[2] - 0.1],
      colour: "#e8e2d6",
      puffs: 4,
      size: 0.07,
      rise: 1.2,
      spread: 0.15,
    },
  ],
  blockers: [
    { x: 0, z: -2.6, radius: 1.4 },
    { x: 0, z: -1.5, radius: 1.4 },
    { x: 0, z: -0.4, radius: 1.4 },
    { x: 0, z: 0.6, radius: 1.35 },
    { x: 0, z: altarAt[2], radius: 0.6 },
    ...brazierSpots.map(([x, , z]) => ({ x, z, radius: 0.25 })),
  ] satisfies LocalBlocker[],
  play: {
    label: "Answer the riddle",
    news: '"What walks on four legs in the morning, two at noon and three in the evening?" You said "a person!" and the Sphinx\'s eyes twinkled.',
    tune: [62, 65, 69, 68, 64, 62],
  },
};
