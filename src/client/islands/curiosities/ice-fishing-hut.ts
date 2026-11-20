import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  SphereGeometry,
} from "three";
import {
  addDoor,
  addGableRoof,
  addSignBoard,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowWhite = "#fbfdff";
const snowShadow = "#d5e1ea";
const pondIce = "#bfe1f1";
const iceCrack = "#e8f6fc";
const deepWater = "#1d4f6a";
const hutPlank = "#7b5236";
const hutTrim = "#e6d7b8";
const fishBack = "#5f7f5a";
const fishBelly = "#f0a06a";
const signColour = "#2f6f9a";

const pond = { x: 0.2, z: -0.2, radius: 3.4 };
const iceTop = 0.05;
const hut = {
  x: -1.35,
  z: -1.1,
  width: 1.7,
  depth: 1.5,
  height: 1.7,
  turn: 0.25,
};
const hole = { x: 1.05, z: 0.55, radius: 0.32 };
const fishPivot: Triple = [hole.x, -0.85, hole.z];
const tipUp = { x: 2.1, z: -1.15, radius: 0.22 };
const flagPivot: Triple = [tipUp.x + 0.2, iceTop + 0.25, tipUp.z];
const chimneyTop: Triple = [hut.x - 0.4, 3.0, hut.z - 0.3];
const signAt: Triple = [-1.5, 0, 3.9];

/** A point in the hut's frame: x across its front, z out of its door. */
const onHut = (x: number, y: number, z: number): Triple => [
  hut.x + x * Math.cos(hut.turn) + z * Math.sin(hut.turn),
  y,
  hut.z - x * Math.sin(hut.turn) + z * Math.cos(hut.turn),
];

/** The ground-plan point of a spot. */
const pointOf = ([x, , z]: Triple) => ({ x, z });

/* ------------------------------------------------------------------ */
/* The frozen pond                                                     */
/* ------------------------------------------------------------------ */

const buildPond = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 18 : 48;
  builder.cylinder("glass", pondIce, {
    radius: pond.radius,
    length: iceTop,
    at: [pond.x, iceTop / 2, pond.z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  /* A bank of snow round the edge */
  builder.torus(
    "matte",
    snowWhite,
    pond.radius + 0.05,
    0.12,
    [pond.x, 0.03, pond.z],
    "y",
    48,
  );
  /* Cracks and swirls frozen into the ice */
  [
    [-0.2, 1.4, 0.4, 1.3],
    [0.3, 1.7, -0.7, 0.9],
    [1.9, 0.9, 1.2, 0.8],
    [-2.2, 0.8, 0.9, 0.7],
  ].forEach(([x, z, turn, length]) => {
    builder.box(
      "matte",
      iceCrack,
      [length, 0.004, 0.02],
      [x, iceTop + 0.002, z],
      [0, turn, 0],
    );
    builder.box(
      "matte",
      iceCrack,
      [length * 0.4, 0.004, 0.015],
      [x + 0.2, iceTop + 0.002, z + 0.1],
      [0, turn + 0.7, 0],
    );
  });
  /* Snow swept into soft patches on the ice */
  [
    [-2.4, -2.0, 0.5],
    [2.6, 1.2, 0.4],
    [0.2, 2.6, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere(
      "matte",
      snowWhite,
      size,
      [x, iceTop, z],
      [1.6, 0.18, 1],
      10,
    );
  });
};

/** A round hole drilled through the ice, with the slush piled round it. */
const addHole = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  radius: number,
) => {
  builder.cylinder("water", deepWater, {
    radius,
    length: 0.02,
    at: [x, iceTop + 0.005, z],
    segments: builder.isFar ? 10 : 22,
  });
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "matte",
    snowShadow,
    radius + 0.05,
    0.06,
    [x, iceTop + 0.02, z],
    "y",
    22,
  );
  [0.4, 2.1, 3.9].forEach((angle) => {
    builder.sphere(
      "matte",
      snowWhite,
      0.12,
      [
        x + Math.sin(angle) * (radius + 0.2),
        iceTop + 0.02,
        z + Math.cos(angle) * (radius + 0.2),
      ],
      [1.4, 0.5, 1],
      8,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The hut                                                             */
/* ------------------------------------------------------------------ */

const buildHut = (builder: AttractionBuilder) => {
  const { width, depth, height, turn } = hut;
  const floor = iceTop + 0.14;
  const rotation: Triple = [0, turn, 0];
  /* Runners, so it can be dragged out onto the ice */
  [-0.55, 0.55].forEach((across) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.12, 0.14, depth + 0.3],
      onHut(across, iceTop + 0.07, 0),
      rotation,
    );
  });
  builder.box(
    "matte",
    hutPlank,
    [width, height, depth],
    onHut(0, floor + height / 2, 0),
    rotation,
  );
  addGableRoof(builder, {
    width: depth,
    depth: width,
    rise: 0.55,
    at: onHut(0, floor + height, 0),
    colour: "#4a3a2e",
    overhang: 0.16,
    thickness: 0.08,
    turn: turn + Math.PI / 2,
  });
  /* The gable ends filled in, a diamond whose top half shows */
  builder.add(
    "matte",
    hutPlank,
    new BoxGeometry(width / Math.SQRT2, width / Math.SQRT2, depth - 0.02)
      .rotateZ(Math.PI / 4)
      .scale(1, 0.55 / (width / 2), 1)
      .rotateY(turn),
    { at: onHut(0, floor + height, 0) },
    undefined,
  );
  /* The stove pipe */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.07,
    length: 0.9,
    at: [chimneyTop[0], chimneyTop[1] - 0.45, chimneyTop[2]],
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  builder.add("metal", palette.darkSteel, new ConeGeometry(0.14, 0.1, 10), {
    at: [chimneyTop[0], chimneyTop[1] + 0.08, chimneyTop[2]],
  });
  /* Upright boards, darker and lighter in turn */
  for (let board = 0; board < 7; board++) {
    const across = -width / 2 + (board + 0.5) * (width / 7);
    builder.box(
      "matte",
      shade(hutPlank, board % 2 === 0 ? 1.1 : 0.9),
      [width / 7 - 0.02, height - 0.05, 0.02],
      onHut(across, floor + height / 2, depth / 2 + 0.01),
      rotation,
    );
  }
  /* Trims at the corners, and a snowy ridge */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        hutTrim,
        [0.08, height, 0.08],
        onHut(sideX * (width / 2), floor + height / 2, sideZ * (depth / 2)),
        rotation,
      );
    });
  });
  builder.box(
    "matte",
    snowWhite,
    [0.24, 0.1, depth + 0.36],
    onHut(0, floor + height + 0.56, 0),
    rotation,
  );
  addDoor(builder, {
    at: onHut(0.3, floor, depth / 2 + 0.03),
    width: 0.6,
    height: 1.25,
    colour: "#3f6f8f",
    frame: hutTrim,
    turn,
  });
  /* A heart cut in the door, glowing with the stove's light */
  builder.add(
    "glow",
    "#ff9a4a",
    new SphereGeometry(0.05, 8, 6).scale(1, 1, 0.2).rotateY(turn),
    {
      at: onHut(0.3, floor + 1.02, depth / 2 + 0.07),
    },
  );
  addWindow(builder, {
    at: onHut(-0.45, floor + 1.05, depth / 2 + 0.03),
    width: 0.42,
    height: 0.38,
    frame: hutTrim,
    turn,
    isLit: true,
  });
  /* A lantern by the door, and a sign saying it is open */
  const lantern = onHut(0.75, floor + 1.4, depth / 2 + 0.12);
  builder.box("glow", palette.warmLight, [0.12, 0.16, 0.12], lantern);
  builder.box(
    "metal",
    palette.black,
    [0.16, 0.03, 0.16],
    [lantern[0], lantern[1] + 0.1, lantern[2]],
  );
  builder.box(
    "paint",
    "#d8342c",
    [0.4, 0.14, 0.02],
    onHut(-0.45, floor + 1.45, depth / 2 + 0.04),
    rotation,
  );
  /* Firewood stacked against the side */
  for (let log = 0; log < 6; log++) {
    const row = Math.floor(log / 3);
    builder.add(
      "matte",
      log % 2 === 0 ? palette.timber : shade(palette.timber, 0.82),
      new CylinderGeometry(0.08, 0.08, 0.5, 8)
        .rotateX(Math.PI / 2)
        .rotateY(turn),
      {
        at: onHut(
          -width / 2 - 0.15,
          iceTop + 0.08 + row * 0.15,
          -0.3 + (log % 3) * 0.18 + row * 0.08,
        ),
      },
    );
  }
};

/* ------------------------------------------------------------------ */
/* The fishing spot                                                    */
/* ------------------------------------------------------------------ */

const buildFishingSpot = (builder: AttractionBuilder) => {
  addHole(builder, hole.x, hole.z, hole.radius);
  addHole(builder, tipUp.x, tipUp.z, tipUp.radius);
  if (builder.isFar) {
    return;
  }
  /* A stool, and a short ice rod on a little stand, its line in the hole */
  const stool: Triple = [hole.x - 0.25, iceTop, hole.z + 0.85];
  builder.cylinder("paint", "#d8342c", {
    radius: 0.2,
    length: 0.06,
    at: [stool[0], 0.48, stool[2]],
    segments: 14,
  });
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "matte",
      palette.paleTimber,
      [
        stool[0] + Math.sin(angle) * 0.1,
        0.46,
        stool[2] + Math.cos(angle) * 0.1,
      ],
      [
        stool[0] + Math.sin(angle) * 0.2,
        iceTop,
        stool[2] + Math.cos(angle) * 0.2,
      ],
      0.04,
      5,
    );
  });
  const rodButt: Triple = [hole.x + 0.15, iceTop + 0.25, hole.z + 0.65];
  const rodTip: Triple = [hole.x + 0.02, iceTop + 0.5, hole.z + 0.05];
  builder.bar(
    "matte",
    palette.darkTimber,
    [rodButt[0], iceTop, rodButt[2] - 0.15],
    [rodButt[0], rodButt[1], rodButt[2] - 0.15],
    0.04,
    5,
  );
  builder.bar("paint", "#2f6fb8", rodButt, rodTip, 0.025, 6);
  builder.cylinder("metal", palette.steel, {
    radius: 0.05,
    length: 0.04,
    at: [rodButt[0], rodButt[1] - 0.04, rodButt[2] - 0.08],
    axis: "x",
    segments: 10,
  });
  builder.bar("matte", "#f4f4f4", rodTip, [hole.x, iceTop, hole.z], 0.006, 3);
  builder.sphere(
    "paint",
    "#e8452c",
    0.03,
    [hole.x, iceTop + 0.02, hole.z],
    [1, 1, 1],
    8,
  );
  /* A bucket with the morning's catch */
  const bucket: Triple = [hole.x + 0.8, iceTop, hole.z + 0.55];
  builder.cylinder("metal", palette.steel, {
    radius: 0.16,
    radiusEnd: 0.2,
    length: 0.32,
    at: [bucket[0], iceTop + 0.16, bucket[2]],
    segments: 14,
  });
  builder.torus(
    "metal",
    palette.darkSteel,
    0.2,
    0.012,
    [bucket[0], iceTop + 0.36, bucket[2]],
    "x",
    12,
  );
  [0, 1].forEach((fish) => {
    builder.sphere(
      "paint",
      fish === 0 ? fishBack : shade(fishBack, 1.15),
      0.06,
      [bucket[0] - 0.04 + fish * 0.08, iceTop + 0.33, bucket[2]],
      [0.8, 1.0, 2.6],
      8,
    );
  });
  /* The hand auger used to drill the holes, lying on the ice */
  builder.bar(
    "metal",
    palette.steel,
    [0.0, iceTop + 0.05, 1.6],
    [1.0, iceTop + 0.05, 1.95],
    0.05,
    6,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [0.0, iceTop + 0.05, 1.6],
    [-0.1, iceTop + 0.05, 1.9],
    0.03,
    4,
  );
  builder.cylinder("paint", "#d8342c", {
    radius: 0.03,
    length: 0.24,
    at: [-0.15, iceTop + 0.05, 1.92],
    axis: "x",
    segments: 6,
  });
  /* The tip-up's frame over the second hole */
  builder.bar(
    "matte",
    palette.paleTimber,
    [tipUp.x - 0.35, iceTop + 0.02, tipUp.z],
    [tipUp.x + 0.35, iceTop + 0.02, tipUp.z],
    0.05,
    5,
  );
  builder.bar(
    "matte",
    palette.paleTimber,
    [tipUp.x, iceTop + 0.02, tipUp.z - 0.35],
    [tipUp.x, iceTop + 0.02, tipUp.z + 0.35],
    0.05,
    5,
  );
  builder.bar(
    "matte",
    palette.paleTimber,
    [tipUp.x + 0.2, iceTop + 0.02, tipUp.z],
    [tipUp.x + 0.2, iceTop + 0.3, tipUp.z],
    0.03,
    4,
  );
};

/** The fish leaping out of the hole, nose up. */
const buildFish = (builder: AttractionBuilder) => {
  const tilt: Triple = [-0.9, 0, 0];
  builder.add(
    "paint",
    fishBack,
    new SphereGeometry(0.12, 16, 10).scale(0.75, 0.9, 2.2),
    { at: [0, 0.3, 0], rotation: tilt },
  );
  builder.add(
    "paint",
    fishBelly,
    new SphereGeometry(0.1, 12, 8).scale(0.7, 0.6, 1.9),
    {
      at: [0, 0.27, 0.03],
      rotation: tilt,
    },
  );
  /* Tail and fins */
  builder.add(
    "paint",
    shade(fishBack, 0.85),
    new ConeGeometry(0.12, 0.22, 4).scale(0.15, 1, 1).rotateX(Math.PI),
    {
      at: [0, 0.02, -0.05],
      rotation: [-0.9 + Math.PI / 2, 0, 0],
    },
  );
  builder.add(
    "paint",
    shade(fishBack, 0.9),
    new ConeGeometry(0.06, 0.14, 4).scale(0.15, 1, 1),
    {
      at: [0, 0.42, -0.05],
      rotation: [0.6, 0, 0],
    },
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.03,
      [side * 0.07, 0.5, 0.12],
      [0.6, 1, 1],
      8,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.016,
      [side * 0.088, 0.5, 0.13],
      [0.5, 1, 1],
      6,
    );
    builder.add(
      "paint",
      fishBelly,
      new SphereGeometry(0.05, 8, 6).scale(0.2, 0.6, 1.2),
      {
        at: [side * 0.09, 0.3, 0.06],
        rotation: [-0.5, 0, side * 0.5],
      },
    );
  });
  /* Pale spots, like an arctic char */
  [0.18, 0.28, 0.38].forEach((y, index) => {
    builder.sphere(
      "paint",
      "#e9e3c9",
      0.015,
      [(index % 2 === 0 ? 1 : -1) * 0.085, y, -0.02 + index * 0.03],
      [0.5, 1, 1],
      4,
    );
  });
  /* Splashes leaping up with it */
  [0, 1, 2, 3].forEach((drop) => {
    const angle = (drop / 4) * Math.PI * 2;
    builder.sphere(
      "water",
      "#d7eef9",
      0.04,
      [Math.sin(angle) * 0.2, 0.1 + (drop % 2) * 0.1, Math.cos(angle) * 0.2],
      [1, 1.6, 1],
      6,
    );
  });
};

/** The tip-up's orange flag, springing up when a fish bites. */
const buildFlag = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.steel, {
    radius: 0.012,
    length: 0.5,
    at: [0, 0.25, 0],
    segments: 5,
  });
  builder.box("paint", "#ff7a1a", [0.02, 0.14, 0.2], [0, 0.44, 0.1]);
};

const pondDeck: Deck = ({ x, z }) =>
  Math.hypot(x - pond.x, z - pond.z) <= pond.radius &&
  Math.hypot(x - hole.x, z - hole.z) > hole.radius &&
  Math.hypot(x - tipUp.x, z - tipUp.z) > tipUp.radius
    ? { height: iceTop, kind: "ice" }
    : undefined;

export const iceFishingHutModel: CuriosityModel = {
  kind: "ice-fishing-hut",
  islandId: "frost-isle",
  name: "Ice Fishing Hut",
  fact: "In winter, the top of a lake can freeze into a thick lid of ice, but the water underneath stays liquid, so fish can still swim about. Like all animals, fish need water, food and air to survive: they breathe the air that is mixed into the water through their gills. People drill a hole in the ice and drop in a line to catch fish for their dinner.",
  curriculumLink:
    "Science, Year 2: find out about and describe the basic needs of animals, including humans, for survival (water, food and air).",
  footprint: 4.4,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildPond(builder);
    buildHut(builder);
    buildFishingSpot(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "leaping fish",
      pivot: fishPivot,
      build: buildFish,
      motion: { kind: "rise", reach: 5, height: 1.05, period: 1.4 },
    },
    {
      name: "tip-up flag",
      pivot: flagPivot,
      build: buildFlag,
      motion: { kind: "rise", reach: 6, height: 0.3, period: 0.9 },
    },
  ],
  smoke: [
    {
      at: [chimneyTop[0], chimneyTop[1] + 0.15, chimneyTop[2]],
      colour: "#d9d6d0",
      puffs: 5,
      size: 0.13,
      rise: 1.5,
      spread: 0.3,
    },
  ],
  decks: [pondDeck],
  blockers: [
    { ...pointOf(onHut(-0.42, 0, 0)), radius: 0.85 },
    { ...pointOf(onHut(0.42, 0, 0)), radius: 0.85 },
    { x: hole.x, z: hole.z, radius: hole.radius },
    { x: tipUp.x, z: tipUp.z, radius: tipUp.radius },
  ] satisfies LocalBlocker[],
  play: {
    label: "Go ice fishing",
    news: "Tug, tug, splash! A shiny fish leapt out of the hole in the ice, then dived back down to its friends.",
  },
};
