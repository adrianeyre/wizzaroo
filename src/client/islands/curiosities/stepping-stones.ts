import { CylinderGeometry } from "three";
import {
  addBush,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const streamBlue = "#4fa6c8";
const streamBed = "#7a8a6a";
const bankStone = "#9d958a";
const steppingStone = "#b3aca0";
const numberWhite = "#fbf8ee";
const bridgeTimber = "#9a6a3e";
const reedGreen = "#6e8f3a";
const lilyGreen = "#4f8a3a";
const troutBrown = "#8a7a4a";
const signColour = "#2f6d8c";

/* The stream runs along local x; the stones cross it towards -z */
const streamHalfWidth = 1.3;
const streamEnd = 4.0;
const bedTop = 0.02;
const waterLevel = 0.08;
const edgingTop = 0.13;
const stoneTop = 0.24;
const stoneRadius = 0.22;
const bridgeX = -3.0;
const bridgeHalfWidth = 0.42;
const bridgeHalfLength = streamHalfWidth + 0.35;
const bridgeRise = 0.32;

/** The ten stones, winding across the stream from the near bank. */
const stones: LocalPoint[] = Array.from({ length: 10 }, (_, index) => {
  const share = index / 9;
  return {
    x: -1.5 + 3.0 * share + 0.35 * Math.sin(share * Math.PI * 2),
    z: streamHalfWidth - 0.15 - (streamHalfWidth * 2 - 0.3) * share,
  };
});
const rideStart = { x: stones[0].x - 0.15, z: streamHalfWidth + 0.75 };
const rideFinish = { x: stones[9].x + 0.15, z: -streamHalfWidth - 0.75 };

/* ------------------------------------------------------------------ */
/* Numbers, drawn as seven painted bars like a digital clock           */
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

/**
 * Paints one digit flat on a stone, reading from the near (+z) side,
 * or upright on a board facing +z.
 */
const addDigit = (
  builder: AttractionBuilder,
  digit: number,
  at: Triple,
  isUpright: boolean,
) => {
  const width = isUpright ? 0.05 : 0.09;
  const height = isUpright ? 0.09 : 0.16;
  const thick = isUpright ? 0.014 : 0.022;
  const bars: Record<string, { across: number; up: number; isLevel: boolean }> =
    {
      a: { across: 0, up: height / 2, isLevel: true },
      b: { across: width / 2, up: height / 4, isLevel: false },
      c: { across: width / 2, up: -height / 4, isLevel: false },
      d: { across: 0, up: -height / 2, isLevel: true },
      e: { across: -width / 2, up: -height / 4, isLevel: false },
      f: { across: -width / 2, up: height / 4, isLevel: false },
      g: { across: 0, up: 0, isLevel: true },
    };
  digitBars[digit].forEach((name) => {
    const bar = bars[name];
    const long = bar.isLevel ? width + thick : thick;
    const tall = bar.isLevel ? thick : height / 2 + thick;
    builder.box(
      "paint",
      isUpright ? palette.darkTimber : numberWhite,
      isUpright ? [long, tall, 0.006] : [long, 0.006, tall],
      isUpright
        ? [at[0] + bar.across, at[1] + bar.up, at[2]]
        : [at[0] + bar.across, at[1], at[2] - bar.up],
    );
  });
};

const addNumber = (
  builder: AttractionBuilder,
  value: number,
  at: Triple,
  isUpright = false,
) => {
  if (value < 10) {
    addDigit(builder, value, at, isUpright);
    return;
  }
  const gap = isUpright ? 0.04 : 0.065;
  addDigit(
    builder,
    Math.floor(value / 10),
    [at[0] - gap, at[1], at[2]],
    isUpright,
  );
  addDigit(builder, value % 10, [at[0] + gap, at[1], at[2]], isUpright);
};

/* ------------------------------------------------------------------ */
/* The stream, its banks and the stones                                */
/* ------------------------------------------------------------------ */

const buildStream = (builder: AttractionBuilder) => {
  const length = streamEnd * 2;
  builder.box(
    "matte",
    streamBed,
    [length, bedTop, streamHalfWidth * 2],
    [0, bedTop / 2, 0],
  );
  builder.box(
    "water",
    streamBlue,
    [length, 0.03, streamHalfWidth * 2],
    [0, waterLevel - 0.015, 0],
  );
  /* Low stone edging along both banks */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      bankStone,
      [length, edgingTop, 0.2],
      [0, edgingTop / 2, side * (streamHalfWidth + 0.1)],
    );
  });
  /* Rocks piled at each end, where the stream comes and goes */
  [-1, 1].forEach((end) => {
    builder.box(
      "matte",
      shade(bankStone, 0.9),
      [0.4, 0.35, streamHalfWidth * 2 + 0.4],
      [end * (streamEnd + 0.1), 0.17, 0],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Rounded coping stones along the edging, each a little different */
  [-1, 1].forEach((side) => {
    for (let stone = 0; stone < 16; stone++) {
      const x = -streamEnd + 0.25 + stone * 0.5;
      if (Math.abs(x - bridgeX) < bridgeHalfWidth + 0.1) {
        continue;
      }
      builder.cylinder(
        "matte",
        shade(bankStone, 0.88 + ((stone * 7 + side) % 5) * 0.06),
        {
          radius: 0.2,
          radiusEnd: 0.16,
          length: 0.06,
          at: [x, edgingTop + 0.02, side * (streamHalfWidth + 0.1)],
          segments: 6,
        },
      );
    }
  });
  [-1, 1].forEach((end) => {
    [
      [0.0, 0.42, -0.6, 0.3],
      [0.1, 0.38, 0.4, 0.28],
      [-0.05, 0.5, 0.0, 0.24],
    ].forEach(([dx, y, dz, radius]) => {
      builder.sphere(
        "matte",
        shade(bankStone, 0.95 + dz * 0.1),
        radius,
        [end * (streamEnd + 0.1 + dx), y - radius * 0.6, dz],
        [1.2, 0.8, 1],
        7,
      );
    });
    /* White water tumbling over the rocks at the top end */
    builder.box(
      "water",
      "#e8f4f8",
      [0.4, 0.04, streamHalfWidth * 1.6],
      [end * (streamEnd - 0.2), waterLevel + 0.01, 0],
    );
  });
  /* Ripples drifting down the stream */
  [
    [-2.0, 0.6],
    [-1.0, -0.8],
    [1.3, 0.5],
    [2.4, -0.4],
    [3.2, 0.7],
  ].forEach(([x, z]) => {
    builder.box(
      "water",
      "#e8f4f8",
      [0.35, 0.01, 0.05],
      [x, waterLevel + 0.005, z],
    );
  });
};

const buildStones = (builder: AttractionBuilder) => {
  stones.forEach(({ x, z }, index) => {
    builder.cylinder("matte", shade(steppingStone, 0.92 + (index % 3) * 0.06), {
      radius: stoneRadius,
      radiusEnd: stoneRadius - 0.03,
      length: stoneTop,
      at: [x, stoneTop / 2, z],
      segments: builder.isFar ? 6 : 12,
    });
    if (builder.isFar) {
      return;
    }
    /* A wet ring where the water laps the stone */
    builder.cylinder("matte", shade(steppingStone, 0.7), {
      radius: stoneRadius + 0.005,
      length: 0.05,
      at: [x, waterLevel + 0.01, z],
      segments: 12,
    });
    addNumber(builder, index + 1, [x, stoneTop + 0.004, z]);
  });
};

const buildBridge = (builder: AttractionBuilder) => {
  /* A little humped footbridge, the dry way across */
  const planks = builder.isFar ? 4 : 14;
  for (let plank = 0; plank < planks; plank++) {
    const share = (plank + 0.5) / planks;
    const z = -bridgeHalfLength + share * bridgeHalfLength * 2;
    const y = bridgeHeightAt(z);
    const slope = Math.atan(
      (bridgeHeightAt(z + 0.05) - bridgeHeightAt(z - 0.05)) / 0.1,
    );
    builder.box(
      "matte",
      shade(bridgeTimber, plank % 2 === 0 ? 1.06 : 0.94),
      [bridgeHalfWidth * 2, 0.06, (bridgeHalfLength * 2) / planks + 0.01],
      [bridgeX, y - 0.03, z],
      [-slope, 0, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Hand rails on posts, following the hump */
  [-1, 1].forEach((side) => {
    const x = bridgeX + side * (bridgeHalfWidth - 0.03);
    const posts = [-1, -0.5, 0, 0.5, 1].map(
      (share) => share * (bridgeHalfLength - 0.1),
    );
    posts.forEach((z) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.06, 0.55, 0.06],
        [x, bridgeHeightAt(z) + 0.27, z],
      );
    });
    for (let piece = 0; piece < posts.length - 1; piece++) {
      const from = posts[piece];
      const to = posts[piece + 1];
      builder.bar(
        "matte",
        palette.darkTimber,
        [x, bridgeHeightAt(from) + 0.55, from],
        [x, bridgeHeightAt(to) + 0.55, to],
        0.05,
        4,
      );
    }
  });
};

const bridgeHeightAt = (z: number): number =>
  0.06 +
  bridgeRise *
    Math.cos(Math.min(1, Math.abs(z) / bridgeHalfLength) * (Math.PI / 2));

const buildBanks = (builder: AttractionBuilder) => {
  /* Worn paths up to the first stone, and away from the last */
  builder.cylinder("matte", palette.path, {
    radius: 0.45,
    length: 0.02,
    at: [rideStart.x, 0.01, rideStart.z + 0.2],
    segments: builder.isFar ? 8 : 16,
  });
  builder.cylinder("matte", palette.path, {
    radius: 0.45,
    length: 0.02,
    at: [rideFinish.x, 0.01, rideFinish.z - 0.2],
    segments: builder.isFar ? 8 : 16,
  });
  if (builder.isFar) {
    return;
  }
  /* Reeds and bulrushes along the water */
  [
    [-3.7, 1.6],
    [-1.9, -1.65],
    [0.6, 1.62],
    [2.2, -1.62],
    [3.5, 1.6],
    [-0.4, -1.65],
  ].forEach(([x, z], index) => {
    for (let reed = 0; reed < 5; reed++) {
      const lean = (reed - 2) * 0.1;
      builder.bar(
        "matte",
        reedGreen,
        [x + reed * 0.07, 0, z],
        [x + reed * 0.07 + lean, 0.7 + (reed % 2) * 0.2, z + lean * 0.4],
        0.03,
        3,
      );
    }
    builder.cylinder("matte", "#5a3b22", {
      radius: 0.035,
      length: 0.16,
      at: [x + 0.14, 0.82 + (index % 2) * 0.1, z],
      segments: 6,
    });
  });
  addBush(builder, [-4.0, 0, 2.4], 0.5);
  addBush(builder, [3.8, 0, -2.3], 0.55, "#3d7a34");
  addBush(builder, [-3.6, 0, -2.6], 0.45);
  /* Lily pads, one with a frog on it */
  [
    [-2.2, 0.4],
    [-1.6, -0.6],
    [2.8, 0.9],
    [3.3, -0.7],
  ].forEach(([x, z], index) => {
    builder.add(
      "matte",
      shade(lilyGreen, index % 2 === 0 ? 1 : 1.12),
      new CylinderGeometry(0.22, 0.22, 0.015, 12, 1, false, 0.3, Math.PI * 1.8),
      { at: [x, waterLevel + 0.01, z] },
    );
  });
  const frog: Triple = [-2.2, waterLevel + 0.02, 0.4];
  builder.sphere(
    "paint",
    "#6ab04a",
    0.08,
    [frog[0], frog[1] + 0.05, frog[2]],
    [1.1, 0.8, 1.2],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#6ab04a",
      0.03,
      [frog[0] + side * 0.04, frog[1] + 0.11, frog[2] + 0.04],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.014,
      [frog[0] + side * 0.045, frog[1] + 0.12, frog[2] + 0.065],
      [1, 1, 1],
      4,
    );
  });
  builder.sphere(
    "paint",
    "#f2b6c8",
    0.06,
    [2.8, waterLevel + 0.05, 0.9],
    [1, 0.6, 1],
    8,
  );
  /* A wooden sign post counting the stones */
  builder.box(
    "matte",
    palette.darkTimber,
    [0.07, 0.9, 0.07],
    [rideStart.x - 0.75, 0.45, rideStart.z],
  );
  builder.box(
    "paint",
    palette.cream,
    [0.42, 0.18, 0.03],
    [rideStart.x - 0.75, 0.82, rideStart.z + 0.04],
  );
  addNumber(builder, 1, [rideStart.x - 0.88, 0.82, rideStart.z + 0.058], true);
  builder.box(
    "paint",
    signColour,
    [0.08, 0.02, 0.01],
    [rideStart.x - 0.75, 0.82, rideStart.z + 0.06],
  );
  addNumber(builder, 10, [rideStart.x - 0.63, 0.82, rideStart.z + 0.058], true);
};

/* ------------------------------------------------------------------ */
/* Leaping fish, ducks and dragonflies                                 */
/* ------------------------------------------------------------------ */

/** A brown trout, curved mid-leap, hidden under the water until it jumps. */
const buildTrout = (builder: AttractionBuilder) => {
  builder.sphere("paint", troutBrown, 0.12, [0, 0, 0], [0.55, 0.75, 1.6], 10);
  builder.sphere(
    "paint",
    "#f2e8c8",
    0.09,
    [0, -0.04, 0.02],
    [0.45, 0.5, 1.5],
    8,
  );
  builder.add(
    "paint",
    shade(troutBrown, 0.85),
    new CylinderGeometry(0.0, 0.1, 0.16, 4),
    {
      at: [0, 0.03, -0.24],
      rotation: [-Math.PI / 2 + 0.3, 0, 0],
      scale: [0.2, 1, 1],
    },
  );
  builder.box(
    "paint",
    shade(troutBrown, 0.85),
    [0.02, 0.08, 0.1],
    [0, 0.1, 0.0],
    [0.3, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [side * 0.05, 0.03, 0.14],
      [1, 1, 1],
      5,
    );
    [0.05, -0.08].forEach((z) => {
      builder.sphere(
        "paint",
        "#c8402e",
        0.012,
        [side * 0.06, 0.02, z],
        [1, 1, 1],
        4,
      );
    });
  });
};

const buildDuck = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#8a6a4a", 0.13, [0, 0.08, 0], [1, 0.7, 1.4], 9);
  builder.sphere("paint", "#2f6b3a", 0.07, [0, 0.21, 0.14], [1, 1, 1], 8);
  builder.box("paint", palette.white, [0.1, 0.02, 0.02], [0, 0.17, 0.12]);
  builder.box("paint", "#e2b42c", [0.05, 0.025, 0.08], [0, 0.2, 0.22]);
  builder.box("paint", "#3a5ac8", [0.02, 0.04, 0.08], [0.12, 0.1, -0.02]);
  builder.box("paint", "#3a5ac8", [0.02, 0.04, 0.08], [-0.12, 0.1, -0.02]);
};

const buildDragonfly = (builder: AttractionBuilder) => {
  builder.cylinder("paint", "#2a8ac8", {
    radius: 0.012,
    radiusEnd: 0.008,
    length: 0.2,
    at: [0, 0, -0.04],
    axis: "z",
    segments: 5,
  });
  builder.sphere("paint", "#1a5a8a", 0.025, [0, 0, 0.07], [1, 1, 1], 6);
  [0.03, -0.01].forEach((z) => {
    builder.box("glass", "#e6f2fa", [0.24, 0.004, 0.035], [0, 0.01, z]);
  });
};

/* ------------------------------------------------------------------ */
/* Walking and hopping                                                 */
/* ------------------------------------------------------------------ */

const stonesDeck: Deck = ({ x, z }) =>
  stones.some((stone) => Math.hypot(x - stone.x, z - stone.z) <= stoneRadius)
    ? { height: stoneTop, kind: "trail" }
    : undefined;

const bridgeDeck: Deck = ({ x, z }) =>
  Math.abs(x - bridgeX) <= bridgeHalfWidth && Math.abs(z) <= bridgeHalfLength
    ? { height: bridgeHeightAt(z), kind: "bridge" }
    : undefined;

/** Hops from the bank, onto each stone in turn, and off the far side. */
const hopAcross = (progress: number) => {
  const spots = [
    { ...rideStart, y: 0 },
    ...stones.map((stone) => ({ ...stone, y: stoneTop })),
    { ...rideFinish, y: 0 },
  ];
  const hops = spots.length - 1;
  const along = Math.min(hops - 0.0001, Math.max(0, progress) * hops);
  const hop = Math.floor(along);
  const share = along - hop;
  const from = spots[hop];
  const to = spots[hop + 1];
  /* Land quickly, then pause a moment on each stone */
  const flight = Math.min(1, share / 0.6);
  return {
    x: from.x + (to.x - from.x) * flight,
    y: from.y + (to.y - from.y) * flight + 0.28 * Math.sin(flight * Math.PI),
    z: from.z + (to.z - from.z) * flight,
    heading: Math.atan2(to.x - from.x, to.z - from.z),
  };
};

export const steppingStonesModel: CuriosityModel = {
  kind: "stepping-stones",
  islandId: "meadow-isle",
  name: "Stepping Stones",
  fact: "Count the stones as you cross: 1, 2, 3, all the way to 10! Then count back down from 10 to 1 on the way home. Stepping stones have been used to cross shallow streams for thousands of years. Keep an eye out for trout jumping and ducks paddling by.",
  curriculumLink:
    "Mathematics, Year 1: count to and across 100, forwards and backwards, beginning with 0 or 1, or from any given number.",
  footprint: 5.0,
  setting: "inland",
  signSpot: { x: 2.4, z: 3.6 },
  build: (builder) => {
    buildStream(builder);
    buildStones(builder);
    buildBridge(builder);
    buildBanks(builder);
    addSignBoard(builder, [2.4, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "leaping trout",
      pivot: [0.9, -0.25, -0.15],
      build: buildTrout,
      motion: { kind: "rise", reach: 6, height: 0.6, period: 1.2 },
    },
    {
      name: "second trout",
      pivot: [-2.0, -0.25, -0.25],
      build: buildTrout,
      motion: { kind: "rise", reach: 5, height: 0.5, period: 1.5, phase: 2 },
    },
  ],
  wanderers: [
    {
      name: "ducks",
      build: buildDuck,
      count: 3,
      centre: { x: 2.6, z: 0 },
      radius: 0.9,
      height: waterLevel - 0.03,
      speed: 0.35,
    },
    {
      name: "dragonflies",
      build: buildDragonfly,
      count: 3,
      centre: { x: -1.0, z: 0 },
      radius: 2.0,
      height: 0.8,
      speed: 1.4,
      bob: 0.3,
    },
  ],
  decks: [stonesDeck, bridgeDeck],
  rides: [
    {
      id: "stepping-stones",
      name: "the stepping stones",
      start: rideStart,
      reach: 0.6,
      seconds: 9,
      finish: rideFinish,
      follow: (progress) => hopAcross(progress),
    },
  ],
  blockers: [
    { x: -streamEnd - 0.1, z: -0.7, radius: 0.55 },
    { x: -streamEnd - 0.1, z: 0.7, radius: 0.55 },
    { x: streamEnd + 0.1, z: -0.7, radius: 0.55 },
    { x: streamEnd + 0.1, z: 0.7, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Hop across the stones",
    news: "Hop, hop, hop! You counted 1, 2, 3… all the way to 10, and you didn't get your feet wet once!",
  },
};
