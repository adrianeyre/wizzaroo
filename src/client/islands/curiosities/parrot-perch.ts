import { SphereGeometry } from "three";
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

const perchTimber = "#8a6440";
const perchDark = "#5f4429";
const clay = "#c4743e";
const clayLight = "#d99a5a";
const clayDark = "#9a5530";
const leafGreen = "#3f9a3a";
const signColour = "#c8452f";

interface Plumage {
  body: string;
  wing: string;
  band: string;
  tail: string;
}

const scarlet: Plumage = {
  body: "#d8282a",
  wing: "#2f6fd0",
  band: "#f2c94c",
  tail: "#c8202a",
};
const blueGold: Plumage = {
  body: "#2f7fd8",
  wing: "#2a5fb8",
  band: "#2f9a5a",
  tail: "#2a6fc8",
};
const greenWing: Plumage = {
  body: "#b8202a",
  wing: "#2a9a6a",
  band: "#2f6fd0",
  tail: "#c02a30",
};

const post = { x: 0.3, z: -0.7 };
const lowBar = 1.7;
const highBar = 2.45;
const scarletFeet: Triple = [post.x - 0.65, lowBar + 0.06, post.z];
const blueFeet: Triple = [post.x + 0.7, lowBar + 0.06, post.z];
const bubbleAt: Triple = [post.x - 1.25, 2.75, post.z + 0.1];
const bank = { z: -3.1 };

/** A macaw perched with its feet at the origin, facing +z, tail hanging down. */
const addMacaw = (
  builder: AttractionBuilder,
  at: Triple,
  plumage: Plumage,
  turn: number,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const lump = (
    colour: string,
    centre: Triple,
    scale: Triple,
    tilt = 0,
    segments = 10,
  ) => {
    builder.add(
      "paint",
      colour,
      new SphereGeometry(1, segments, Math.round(segments * 0.65)),
      {
        at: place(...centre),
        rotation: [tilt, turn, 0],
        scale,
      },
    );
  };
  /* Body, head and the bare white face patch */
  lump(plumage.body, [0, 0.3, 0], [0.17, 0.27, 0.17], 0.25, 12);
  lump(plumage.body, [0, 0.6, 0.06], [0.13, 0.13, 0.13], 0, 12);
  if (plumage === blueGold) {
    lump("#f2c94c", [0, 0.27, 0.07], [0.14, 0.22, 0.12], 0.25, 10);
  }
  [-1, 1].forEach((side) => {
    lump(palette.white, [side * 0.075, 0.6, 0.12], [0.04, 0.06, 0.05], 0, 8);
    builder.sphere(
      "paint",
      palette.black,
      0.022,
      place(side * 0.095, 0.62, 0.13),
      [1, 1, 1],
      6,
    );
    /* Wings folded at the sides, with a coloured band */
    lump(
      plumage.wing,
      [side * 0.14, 0.27, -0.04],
      [0.06, 0.24, 0.13],
      0.35,
      10,
    );
    lump(plumage.band, [side * 0.145, 0.38, 0.02], [0.055, 0.09, 0.1], 0.35, 8);
    /* Toes gripping the perch */
    builder.box(
      "paint",
      "#5a5a5a",
      [0.03, 0.03, 0.12],
      place(side * 0.05, 0.0, 0.02),
      [0, turn, 0],
    );
  });
  /* A big hooked beak */
  lump("#2a2a2a", [0, 0.58, 0.19], [0.05, 0.07, 0.06], 0.4, 8);
  lump("#d8d0c0", [0, 0.6, 0.18], [0.055, 0.06, 0.06], 0.2, 8);
  /* The long tail feathers */
  [-0.03, 0.03].forEach((spread, index) => {
    builder.box(
      "paint",
      index === 0 ? plumage.tail : shade(plumage.tail, 0.85),
      [0.07, 0.6, 0.02],
      place(spread, -0.15, -0.16),
      [-0.3, turn, spread * 3],
    );
  });
  builder.box(
    "paint",
    plumage.wing,
    [0.05, 0.45, 0.02],
    place(0, -0.08, -0.13),
    [-0.3, turn, 0],
  );
};

const buildPerch = (builder: AttractionBuilder) => {
  const { x, z } = post;
  builder.cylinder("matte", perchDark, {
    radius: 0.45,
    radiusEnd: 0.38,
    length: 0.14,
    at: [x, 0.07, z],
    segments: 16,
  });
  builder.cylinder("matte", perchTimber, {
    radius: 0.1,
    radiusEnd: 0.075,
    length: highBar + 0.2,
    at: [x, (highBar + 0.2) / 2, z],
    segments: 10,
  });
  builder.cylinder("matte", perchTimber, {
    radius: 0.055,
    length: 2.0,
    at: [x, lowBar, z],
    axis: "x",
    segments: 10,
  });
  builder.cylinder("matte", perchTimber, {
    radius: 0.05,
    length: 1.2,
    at: [x, highBar, z],
    axis: "x",
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  /* Braces, knots in the wood and a rope for climbing */
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      perchDark,
      [x, lowBar - 0.45, z],
      [x + side * 0.45, lowBar, z],
      0.05,
      6,
    );
  });
  builder.bar(
    "matte",
    "#d8c08a",
    [x + 0.4, highBar, z],
    [x + 0.45, 0.9, z + 0.05],
    0.04,
    5,
  );
  builder.torus(
    "matte",
    "#d8c08a",
    0.06,
    0.02,
    [x + 0.45, 0.85, z + 0.05],
    "z",
    10,
  );
  /* Feeding bowls at the ends of the low bar, full of fruit and nuts */
  [-1, 1].forEach((side) => {
    const bowl: Triple = [x + side * 1.0, lowBar - 0.02, z];
    builder.lathe(
      "metal",
      palette.steel,
      [
        [0, 0],
        [0.13, 0.01],
        [0.17, 0.1],
        [0.16, 0.11],
        [0.12, 0.03],
        [0, 0.03],
      ],
      bowl,
      "y",
      14,
    );
    [
      { colour: "#f29a2a", dx: 0.05, dz: 0 },
      { colour: "#8a5a2a", dx: -0.05, dz: 0.04 },
      { colour: "#e8c43a", dx: 0, dz: -0.06 },
    ].forEach(({ colour, dx, dz }) => {
      builder.sphere(
        "paint",
        colour,
        0.045,
        [bowl[0] + dx, bowl[1] + 0.09, bowl[2] + dz],
        [1, 1, 1],
        6,
      );
    });
  });
  /* Splashes of bird mess and a moulted feather on the base */
  builder.box(
    "paint",
    "#d8282a",
    [0.04, 0.01, 0.3],
    [x + 0.25, 0.15, z + 0.2],
    [0, 0.6, 0],
  );
  builder.box(
    "paint",
    "#2f7fd8",
    [0.04, 0.01, 0.26],
    [x - 0.2, 0.15, z + 0.25],
    [0, -0.4, 0],
  );
};

/** The clay lick: a bank of orange clay that macaws nibble for its minerals. */
const buildClayLick = (builder: AttractionBuilder) => {
  const layers: [number, number, string][] = [
    [0.35, 0.7, clayDark],
    [0.95, 0.5, clay],
    [1.4, 0.4, clayLight],
    [1.8, 0.4, clay],
  ];
  layers.forEach(([height, thickness, colour], index) => {
    builder.box(
      "matte",
      colour,
      [4.6 - index * 0.35, thickness, 1.1 - index * 0.15],
      [0, height, bank.z - index * 0.06],
      [0.04 - index * 0.02, 0, 0],
    );
  });
  builder.box("matte", leafGreen, [3.4, 0.2, 0.6], [0, 2.1, bank.z - 0.3]);
  if (builder.isFar) {
    return;
  }
  /* Holes the birds have nibbled, and plants hanging over the top */
  [
    [-1.4, 0.8],
    [-0.6, 1.3],
    [0.5, 0.6],
    [1.2, 1.15],
    [1.8, 0.45],
    [-1.9, 0.4],
  ].forEach(([x, y]) => {
    builder.sphere(
      "matte",
      shade(clayDark, 0.7),
      0.1,
      [x, y, bank.z + 0.52 - (y - 0.4) * 0.12],
      [1.4, 1, 0.3],
      8,
    );
  });
  for (let clump = 0; clump < 6; clump++) {
    const x = -1.6 + clump * 0.65;
    builder.sphere(
      "matte",
      clump % 2 === 0 ? leafGreen : shade(leafGreen, 1.2),
      0.32,
      [x, 2.2, bank.z - 0.25],
      [1.2, 0.7, 1],
      8,
    );
    builder.bar(
      "matte",
      "#4f7a2a",
      [x + 0.1, 2.1, bank.z + 0.05],
      [x + 0.15, 1.3, bank.z + 0.35],
      0.03,
      3,
    );
  }
  /* A macaw clinging to the bank, nibbling clay */
  addMacaw(builder, [1.25, 1.0, bank.z + 0.62], greenWing, 0.2);
};

/** A speech bubble that pops up when the parrot talks. */
const buildBubble = (builder: AttractionBuilder) => {
  builder.sphere("paint", palette.white, 0.4, [0, 0, 0], [1.3, 0.75, 0.2], 16);
  builder.cylinder("paint", palette.white, {
    radius: 0.1,
    radiusEnd: 0.01,
    length: 0.3,
    at: [0.3, -0.35, 0],
    segments: 8,
  });
  /* "Bonjour !", in coloured letters */
  [
    "#d8282a",
    "#2f7fd8",
    "#e8a32a",
    "#2f9a5a",
    "#8a3fc8",
    "#d8282a",
    "#2f7fd8",
  ].forEach((colour, index) => {
    builder.box(
      "paint",
      colour,
      [0.06, index % 2 === 0 ? 0.16 : 0.11, 0.02],
      [-0.4 + index * 0.11, 0.02, 0.085],
    );
  });
  builder.box("paint", palette.black, [0.04, 0.16, 0.02], [0.4, 0.04, 0.085]);
  builder.box("paint", palette.black, [0.04, 0.04, 0.02], [0.4, -0.1, 0.085]);
};

const buildMacawScarlet = (builder: AttractionBuilder) => {
  addMacaw(builder, [0, 0, 0], scarlet, 0.3);
};

const buildMacawBlue = (builder: AttractionBuilder) => {
  addMacaw(builder, [0, 0, 0], blueGold, -0.3);
};

const buildFlyingParrot = (builder: AttractionBuilder) => {
  builder.sphere("paint", scarlet.body, 0.12, [0, 0, 0], [0.9, 0.8, 1.6], 8);
  builder.sphere("paint", scarlet.body, 0.08, [0, 0.04, 0.2], [1, 1, 1], 8);
  builder.sphere("paint", "#2a2a2a", 0.035, [0, 0.03, 0.28], [1, 1, 1.2], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      scarlet.wing,
      [0.4, 0.02, 0.16],
      [side * 0.24, 0.02, 0],
      [0, 0, side * 0.25],
    );
    builder.box(
      "paint",
      scarlet.band,
      [0.18, 0.025, 0.1],
      [side * 0.14, 0.03, 0.03],
      [0, 0, side * 0.25],
    );
  });
  builder.box("paint", scarlet.tail, [0.06, 0.015, 0.4], [0, -0.02, -0.32]);
};

const buildGround = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#6b5434", {
    radius: 1.3,
    length: 0.03,
    at: [post.x, 0.015, post.z],
    segments: builder.isFar ? 12 : 24,
  });
  builder.box("matte", palette.path, [1.0, 0.03, 2.4], [-0.4, 0.015, 3.0]);
  if (builder.isFar) {
    return;
  }
  addBench(builder, [1.9, 0, 1.6], -0.5);
  /* A basket of mangoes for the birds, and ferns */
  builder.cylinder("matte", "#a77b45", {
    radius: 0.24,
    radiusEnd: 0.19,
    length: 0.24,
    at: [-1.6, 0.12, 0.9],
    segments: 12,
  });
  [0, 2.1, 4.2].forEach((turn, index) => {
    builder.sphere(
      "paint",
      index === 1 ? "#e8c43a" : "#f29a2a",
      0.09,
      [-1.6 + Math.sin(turn) * 0.09, 0.27, 0.9 + Math.cos(turn) * 0.09],
      [1, 0.8, 1.2],
      8,
    );
  });
  [
    [-3.2, -0.8, 1.0],
    [3.3, -1.0, 1.1],
    [-2.6, 1.6, 0.8],
  ].forEach(([x, z, size]) => {
    for (let frond = 0; frond < 6; frond++) {
      const turn = (frond / 6) * Math.PI * 2 + size;
      builder.add(
        "matte",
        frond % 2 === 0 ? leafGreen : shade(leafGreen, 0.8),
        new SphereGeometry(1, 6, 3),
        {
          at: [
            x + Math.sin(turn) * 0.35 * size,
            0.25 * size,
            z + Math.cos(turn) * 0.35 * size,
          ],
          rotation: [-0.5, turn, 0],
          scale: [0.12 * size, 0.03, 0.45 * size],
        },
      );
    }
  });
};

export const parrotPerchModel: CuriosityModel = {
  kind: "parrot-perch",
  islandId: "jungle-reach",
  name: "Parrot Perch",
  fact: 'Macaws are big, bright parrots from the rainforest. Parrots are clever copycats: they listen carefully and can learn to repeat words, just as you do when you learn French. Try saying "Bonjour !" (hello) and "Merci !" (thank you). Wild macaws also nibble clay from riverbanks for the minerals in it.',
  curriculumLink:
    "Languages, Key Stage 2: listen attentively to spoken language and show understanding by joining in and responding, and speak in sentences using familiar vocabulary.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: -1.5, z: 3.4 },
  build: (builder) => {
    buildGround(builder);
    buildPerch(builder);
    buildClayLick(builder);
    if (builder.isFar) {
      builder.sphere(
        "paint",
        scarlet.body,
        0.22,
        [scarletFeet[0], scarletFeet[1] + 0.35, scarletFeet[2]],
        [0.8, 1.4, 0.8],
        6,
      );
      builder.sphere(
        "paint",
        blueGold.body,
        0.22,
        [blueFeet[0], blueFeet[1] + 0.35, blueFeet[2]],
        [0.8, 1.4, 0.8],
        6,
      );
    } else {
      addMacaw(builder, [post.x + 0.25, highBar + 0.05, post.z], greenWing, 0);
    }
    addSignBoard(builder, [-1.5, 0, 3.4], signColour);
  },
  moving: [
    {
      name: "scarlet macaw",
      pivot: scarletFeet,
      build: buildMacawScarlet,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.3, period: 0.9 },
    },
    {
      name: "blue-and-gold macaw",
      pivot: blueFeet,
      build: buildMacawBlue,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.25,
        period: 1.3,
        phase: 1,
      },
    },
    {
      name: "speech bubble",
      pivot: bubbleAt,
      build: buildBubble,
      motion: { kind: "wake", reach: 5 },
    },
  ],
  wanderers: [
    {
      name: "flying macaws",
      build: buildFlyingParrot,
      count: 3,
      centre: { x: 0, z: -1.2 },
      radius: 2.2,
      speed: 1.4,
      height: 3.2,
      bob: 0.25,
    },
  ],
  blockers: [
    { x: post.x, z: post.z, radius: 0.45 },
    { x: -1.6, z: bank.z, radius: 0.75 },
    { x: 0, z: bank.z, radius: 0.75 },
    { x: 1.6, z: bank.z, radius: 0.75 },
    { x: 1.9, z: 1.6, radius: 0.5 },
    { x: -1.6, z: 0.9, radius: 0.3 },
  ] satisfies LocalBlocker[],
  tune: [84, 88, 84, 79],
  play: {
    label: "Teach a parrot a word",
    news: 'You said "Bonjour !" and the macaw squawked it right back: "BONJOUR ! Bonjour !" Now try "Merci !"',
    tune: [79, 76, 79, 76],
  },
};
