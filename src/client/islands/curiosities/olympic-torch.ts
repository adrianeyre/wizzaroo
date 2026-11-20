import { TorusGeometry } from "three";
import {
  addSignBoard,
  buildFlatDeck,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const marble = "#ece6da";
const marbleShadow = "#cfc6b6";
const bronze = "#b07c38";
const bronzeDark = "#7d5526";
const gold = "#e2b84a";
const silver = "#c9ccd1";
const medalBronze = "#b8783e";
const laurel = "#5f7d36";
const laurelLight = "#86a04a";
const flameOrange = "#ff8a1f";
const flameYellow = "#ffd55a";
const flameWhite = "#fff1c4";
const track = "#a8553a";
const signColour = "#1f4f8a";
const ashPad = "#5b4a42";
const ringColours = ["#0081c8", "#fcb131", "#1f2023", "#00a651", "#ee334e"];

const column = { x: 0, z: -1.6, height: 2.7, base: 0.6 };
const bowlY = column.base + column.height + 0.1;
const flameAt: Triple = [column.x, bowlY + 0.32, column.z];

/* The winners' podium: first in the middle, second on the left, third right */
const podiumZ = 0.65;
const podiumDepth = 0.9;
const steps = [
  { place: 1, x: 0, width: 0.95, height: 0.6, colour: gold },
  { place: 2, x: -0.95, width: 0.95, height: 0.4, colour: silver },
  { place: 3, x: 0.95, width: 0.95, height: 0.25, colour: medalBronze },
];
const rings: Triple = [2.6, 1.55, -0.6];

/** Stepped base, fluted column, capital and bronze bowl. */
const buildColumn = (builder: AttractionBuilder) => {
  const { x, z } = column;
  [
    { size: 1.7, y: 0.1 },
    { size: 1.35, y: 0.3 },
    { size: 1.05, y: 0.5 },
  ].forEach(({ size, y }, index) => {
    builder.box(
      "matte",
      index % 2 === 0 ? marble : shade(marble, 0.9),
      [size, 0.2, size],
      [x, y, z],
    );
  });
  builder.lathe(
    "matte",
    marble,
    [
      [0, column.base],
      [0.4, column.base],
      [0.4, column.base + 0.08],
      [0.33, column.base + 0.16],
      [0.3, column.base + 0.3],
      [0.25, column.base + column.height - 0.2],
      [0.34, column.base + column.height - 0.08],
      [0, column.base + column.height - 0.08],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 8 : 20,
  );
  builder.box(
    "matte",
    marble,
    [0.8, 0.12, 0.8],
    [x, column.base + column.height - 0.02, z],
  );
  builder.lathe(
    "metal",
    bronze,
    [
      [0, 0],
      [0.12, 0],
      [0.14, 0.08],
      [0.08, 0.14],
      [0.1, 0.2],
      [0.45, 0.32],
      [0.6, 0.48],
      [0.62, 0.52],
      [0.5, 0.5],
    ],
    [x, bowlY - 0.15, z],
    "y",
    builder.isFar ? 10 : 28,
  );
  if (builder.isFar) {
    return;
  }
  /* Flutes running up the shaft */
  const flutes = 12;
  for (let flute = 0; flute < flutes; flute++) {
    const angle = (flute / flutes) * Math.PI * 2;
    builder.bar(
      "matte",
      marbleShadow,
      [
        x + Math.sin(angle) * 0.295,
        column.base + 0.32,
        z + Math.cos(angle) * 0.295,
      ],
      [
        x + Math.sin(angle) * 0.245,
        column.base + column.height - 0.22,
        z + Math.cos(angle) * 0.245,
      ],
      0.04,
      4,
    );
  }
  /* Bronze rims and glowing coals in the bowl */
  builder.add("metal", bronzeDark, new TorusGeometry(0.61, 0.035, 4, 32), {
    at: [x, bowlY + 0.37, z],
    rotation: [Math.PI / 2, 0, 0],
  });
  builder.cylinder("glow", flameOrange, {
    radius: 0.5,
    length: 0.04,
    at: [x, bowlY + 0.3, z],
    segments: 20,
  });
  /* A laurel garland round the column's neck */
  listRingPoints(0.33, 14, { x, z }).forEach(
    ({ x: leafX, z: leafZ }, index) => {
      builder.sphere(
        "matte",
        index % 2 === 0 ? laurel : laurelLight,
        0.08,
        [leafX, column.base + column.height - 0.28 + (index % 2) * 0.04, leafZ],
        [0.45, 0.25, 1],
        6,
      );
    },
  );
};

type DigitStroke =
  "top" | "middle" | "bottom" | "topRight" | "bottomRight" | "bottomLeft";

const digitStrokes: Readonly<
  Record<DigitStroke, { size: [number, number]; offset: [number, number] }>
> = {
  top: { size: [0.16, 0.035], offset: [0, 0.14] },
  middle: { size: [0.16, 0.035], offset: [0, 0] },
  bottom: { size: [0.16, 0.035], offset: [0, -0.14] },
  topRight: { size: [0.035, 0.15], offset: [0.08, 0.07] },
  bottomRight: { size: [0.035, 0.15], offset: [0.08, -0.07] },
  bottomLeft: { size: [0.035, 0.15], offset: [-0.08, -0.07] },
};

const digitsByPlace: Readonly<Record<number, readonly DigitStroke[]>> = {
  1: ["topRight", "bottomRight"],
  2: ["top", "topRight", "middle", "bottomLeft", "bottom"],
  3: ["top", "topRight", "middle", "bottomRight", "bottom"],
};

/** A seven-segment number on a podium front, for 1, 2 or 3. */
const addPlaceNumber = (
  builder: AttractionBuilder,
  place: number,
  at: Triple,
) => {
  (digitsByPlace[place] ?? []).forEach((name) => {
    const { size, offset } = digitStrokes[name];
    builder.box(
      "paint",
      palette.cream,
      [size[0], size[1], 0.02],
      [at[0] + offset[0], at[1] + offset[1], at[2]],
    );
  });
};

/** The podium's three steps, with their numbers and coloured fronts. */
const buildPodium = (builder: AttractionBuilder) => {
  steps.forEach(({ place, x, width, height, colour }) => {
    builder.box(
      "matte",
      marble,
      [width, height, podiumDepth],
      [x, height / 2, podiumZ],
    );
    builder.box(
      "paint",
      colour,
      [width - 0.1, height - 0.08, 0.02],
      [x, height / 2, podiumZ + podiumDepth / 2 + 0.01],
    );
    if (builder.isFar) {
      return;
    }
    builder.box(
      "matte",
      marbleShadow,
      [width + 0.04, 0.05, podiumDepth + 0.04],
      [x, height - 0.025, podiumZ],
    );
    addPlaceNumber(builder, place, [
      x,
      Math.max(0.12, height / 2),
      podiumZ + podiumDepth / 2 + 0.025,
    ]);
  });
};

/** A laurel wreath lying flat or standing, as a ring of little leaves. */
const addWreath = (
  builder: AttractionBuilder,
  at: Triple,
  isStanding: boolean,
) => {
  builder.add(
    "matte",
    laurel,
    new TorusGeometry(0.17, 0.025, 4, 14, Math.PI * 1.7),
    {
      at,
      rotation: isStanding
        ? [0, 0, -Math.PI * 0.35 + Math.PI / 2]
        : [Math.PI / 2, 0, 0],
    },
  );
  for (let leaf = 0; leaf < 10; leaf++) {
    const angle = (leaf / 10) * Math.PI * 1.7;
    const across = Math.cos(angle) * 0.18;
    const along = Math.sin(angle) * 0.18;
    builder.sphere(
      "matte",
      leaf % 2 === 0 ? laurel : laurelLight,
      0.05,
      isStanding
        ? [at[0] + across, at[1] + along, at[2]]
        : [at[0] + across, at[1] + 0.01, at[2] + along],
      [0.5, 0.5, 0.5],
      6,
    );
  }
  /* A gold ribbon where the ends meet */
  builder.box(
    "paint",
    gold,
    [0.05, 0.12, 0.02],
    isStanding
      ? [at[0] + 0.08, at[1] - 0.2, at[2]]
      : [at[0] + 0.08, at[1] + 0.02, at[2] - 0.18],
  );
};

/** The five rings on their board, and a table of wreaths for the winners. */
const buildRingsAndWreaths = (builder: AttractionBuilder) => {
  const [x, y, z] = rings;
  [-0.45, 0.45].forEach((dx) => {
    builder.box(
      "matte",
      marbleShadow,
      [0.1, y + 0.3, 0.1],
      [x + dx * 1.4, (y + 0.3) / 2, z],
    );
  });
  builder.box("paint", palette.white, [1.55, 0.85, 0.06], [x, y, z]);
  if (builder.isFar) {
    return;
  }
  builder.box("paint", signColour, [1.6, 0.06, 0.08], [x, y + 0.45, z]);
  /* Blue, yellow, black, green and red, linked over and under */
  [
    { dx: -0.42, dy: 0.1 },
    { dx: -0.21, dy: -0.1 },
    { dx: 0, dy: 0.1 },
    { dx: 0.21, dy: -0.1 },
    { dx: 0.42, dy: 0.1 },
  ].forEach(({ dx, dy }, index) => {
    builder.add(
      "paint",
      ringColours[index] ?? palette.black,
      new TorusGeometry(0.17, 0.028, 5, 24),
      {
        at: [x + dx, y + dy, z + 0.05 + (index % 2) * 0.012],
      },
    );
  });
  /* A marble table with three wreaths */
  const table: Triple = [-2.3, 0, 0.6];
  builder.cylinder("matte", marble, {
    radius: 0.12,
    radiusEnd: 0.09,
    length: 0.7,
    at: [table[0], 0.35, table[2]],
    segments: 12,
  });
  builder.cylinder("matte", marble, {
    radius: 0.55,
    length: 0.08,
    at: [table[0], 0.74, table[2]],
    segments: 20,
  });
  [
    [-0.22, -0.12],
    [0.2, -0.15],
    [0, 0.22],
  ].forEach(([dx, dz]) => {
    addWreath(builder, [table[0] + dx, 0.8, table[2] + dz], false);
  });
  /* A wreath hung on the front of the winner's step */
  addWreath(builder, [0.3, 0.42, podiumZ + podiumDepth / 2 + 0.06], true);
};

/** A short running track with lanes and a starting line, and a waiting torch. */
const buildTrack = (builder: AttractionBuilder) => {
  builder.box("matte", track, [6.2, 0.03, 1.0], [0, 0.015, 2.5]);
  if (builder.isFar) {
    return;
  }
  [2.0, 2.33, 2.66, 3.0].forEach((z) => {
    builder.box("paint", palette.white, [6.2, 0.01, 0.04], [0, 0.035, z]);
  });
  builder.box("paint", palette.white, [0.08, 0.01, 1.0], [-2.6, 0.035, 2.5]);
  /* Lane numbers at the start */
  [2.16, 2.5, 2.83].forEach((z, index) => {
    builder.box(
      "paint",
      palette.white,
      [0.12, 0.01, 0.03 + index * 0.02],
      [-2.85, 0.036, z],
    );
  });
  /* A hand torch waiting on its stand, ready to be lit */
  const stand: Triple = [1.7, 0, 0.4];
  builder.cylinder("matte", marbleShadow, {
    radius: 0.18,
    length: 0.8,
    at: [stand[0], 0.4, stand[2]],
    segments: 12,
  });
  builder.cylinder("metal", silver, {
    radius: 0.05,
    radiusEnd: 0.08,
    length: 0.55,
    at: [stand[0], 1.05, stand[2]],
    segments: 12,
  });
  builder.cylinder("metal", gold, {
    radius: 0.1,
    radiusEnd: 0.09,
    length: 0.08,
    at: [stand[0], 1.35, stand[2]],
    segments: 12,
  });
};

/** The flame, always flickering in the bowl. */
const buildFlame = (builder: AttractionBuilder) => {
  [
    { x: 0, z: 0, height: 0.75, radius: 0.28, colour: flameOrange },
    { x: 0.18, z: 0.1, height: 0.5, radius: 0.16, colour: flameOrange },
    { x: -0.16, z: -0.08, height: 0.55, radius: 0.17, colour: flameYellow },
    { x: 0.02, z: -0.18, height: 0.45, radius: 0.14, colour: flameYellow },
    { x: 0, z: 0, height: 0.45, radius: 0.14, colour: flameWhite },
  ].forEach(({ x, z, height, radius, colour }) => {
    builder.cylinder("glow", colour, {
      radius,
      radiusEnd: 0.01,
      length: height,
      at: [x, height / 2, z],
      segments: 10,
    });
  });
};

/** The great flame that roars up when someone comes close. */
const buildBlaze = (builder: AttractionBuilder) => {
  builder.cylinder("glow", flameOrange, {
    radius: 0.45,
    radiusEnd: 0.02,
    length: 1.5,
    at: [0, 0.75, 0],
    segments: 14,
  });
  builder.cylinder("glow", flameYellow, {
    radius: 0.3,
    radiusEnd: 0.02,
    length: 1.2,
    at: [0.05, 0.6, 0.05],
    segments: 12,
  });
  [0, 1, 2, 3].forEach((tongue) => {
    const angle = (tongue / 4) * Math.PI * 2;
    builder.cylinder("glow", tongue % 2 === 0 ? flameYellow : flameOrange, {
      radius: 0.14,
      radiusEnd: 0.01,
      length: 0.7,
      at: [Math.sin(angle) * 0.3, 0.45, Math.cos(angle) * 0.3],
      segments: 8,
    });
  });
};

const buildHalo = (builder: AttractionBuilder) => {
  builder.sphere("glow", flameYellow, 1.3, [0, 0, 0], [1, 1.2, 1], 16);
};

export const olympicTorchModel: CuriosityModel = {
  kind: "olympic-torch",
  islandId: "ember-isle",
  name: "Olympic Flame",
  fact: "The first Olympic Games were held in ancient Greece at Olympia, nearly 2,800 years ago, in honour of the god Zeus. Winners were crowned with a wreath of olive leaves. A flame burned during the Games, and today the Olympic flame is still lit in Olympia and carried by runners to the Games.",
  curriculumLink:
    "History, Key Stage 2: Ancient Greece. A study of Greek life and achievements and their influence on the western world, such as the Olympic Games.",
  footprint: 5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: 2.4, z: 3.75 },
  build: (builder) => {
    buildTrack(builder);
    buildColumn(builder);
    buildPodium(builder);
    buildRingsAndWreaths(builder);
    if (builder.isFar) {
      builder.cylinder("glow", flameOrange, {
        radius: 0.28,
        radiusEnd: 0.02,
        length: 0.75,
        at: [flameAt[0], flameAt[1] + 0.37, flameAt[2]],
        segments: 8,
      });
    }
    addSignBoard(builder, [2.4, 0, 3.75], signColour);
  },
  moving: [
    {
      name: "flame",
      pivot: flameAt,
      build: buildFlame,
      motion: { kind: "flicker", period: 0.6 },
    },
    {
      name: "blaze",
      pivot: flameAt,
      build: buildBlaze,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "flame glow",
      pivot: [flameAt[0], flameAt[1] + 0.6, flameAt[2]],
      build: buildHalo,
      motion: { kind: "wake", reach: 7 },
      look: "halo",
    },
  ],
  decks: steps.map(({ x, width, height }) =>
    buildFlatDeck(
      {
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: podiumZ - podiumDepth / 2,
        maxZ: podiumZ + podiumDepth / 2,
      },
      height,
      "ground",
    ),
  ),
  blockers: [
    { x: column.x, z: column.z, radius: 0.9 },
    { x: rings[0] - 0.63, z: rings[2], radius: 0.15 },
    { x: rings[0] + 0.63, z: rings[2], radius: 0.15 },
    { x: -2.3, z: 0.6, radius: 0.6 },
    { x: 1.7, z: 0.4, radius: 0.25 },
  ] satisfies LocalBlocker[],
  tune: [67, 72, 76, 79, 76, 79, 84],
  play: {
    label: "Light the torch",
    news: "Whoomph! You dipped the torch into the great bowl and it burst into flame, ready to carry to the next Games.",
    tune: [72, 76, 79, 84, 88],
  },
};
