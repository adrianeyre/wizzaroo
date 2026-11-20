import { ConeGeometry, LatheGeometry, Vector2 } from "three";
import {
  addBush,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const moundGreen = "#6aa443";
const tuftGreen = "#5a9a38";
const burrowDark = "#2a1e14";
const spillSoil = "#8a6440";
const rabbitBrown = "#a07a56";
const rabbitBelly = "#ecdcc4";
const earPink = "#e8a6a6";
const cloverGreen = "#3f8f3a";
const cloverPink = "#e7a2c8";
const dandelion = "#f2c81e";
const seedClock = "#f4f1ea";
const straw = "#d8b860";
const signColour = "#7a5a2e";

/** A grassy mound, and the burrow hole near its top. */
interface Mound {
  x: number;
  z: number;
  radius: number;
  height: number;
  hole: { x: number; z: number };
}

const mounds: Mound[] = [
  { x: -1.75, z: -0.7, radius: 1.3, height: 0.75, hole: { x: 0.25, z: 0.35 } },
  { x: 1.55, z: -1.0, radius: 1.4, height: 0.85, hole: { x: -0.3, z: 0.3 } },
  { x: -0.1, z: -2.55, radius: 1.3, height: 0.72, hole: { x: 0.2, z: 0.3 } },
];
const peekAt = { x: 0, z: 0.75 };

/** How high a mound's surface is at a distance from its middle. */
const moundHeightAt = (mound: Mound, distance: number): number =>
  mound.height * Math.sqrt(Math.max(0, 1 - (distance / mound.radius) ** 2));

/** Where a mound's hole is, on its surface. */
const holeAt = (mound: Mound): Triple => [
  mound.x + mound.hole.x,
  moundHeightAt(mound, Math.hypot(mound.hole.x, mound.hole.z)),
  mound.z + mound.hole.z,
];

const buildMound = (builder: AttractionBuilder, mound: Mound) => {
  const rings = builder.isFar ? 3 : 6;
  const profile = Array.from({ length: rings + 1 }, (_, ring) => {
    const angle = (ring / rings) * (Math.PI / 2);
    return new Vector2(
      Math.max(0.001, Math.cos(angle) * mound.radius),
      Math.sin(angle) * mound.height,
    );
  });
  builder.add(
    "matte",
    moundGreen,
    new LatheGeometry(profile, builder.segments(22)),
    { at: [mound.x, 0, mound.z] },
  );
  const [hx, hy, hz] = holeAt(mound);
  builder.cylinder("matte", burrowDark, {
    radius: 0.26,
    length: 0.06,
    at: [hx, hy, hz],
    segments: builder.isFar ? 6 : 16,
  });
  if (builder.isFar) {
    return;
  }
  /* A rim of dug soil round the hole, spilling down the side */
  builder.torus("matte", spillSoil, 0.27, 0.06, [hx, hy + 0.01, hz], "y", 16);
  const downhill = Math.atan2(mound.hole.x, mound.hole.z);
  [0.35, 0.55].forEach((out, index) => {
    const distance = Math.hypot(mound.hole.x, mound.hole.z) + out;
    const x = mound.x + Math.sin(downhill) * distance;
    const z = mound.z + Math.cos(downhill) * distance;
    builder.sphere(
      "matte",
      shade(spillSoil, 1 - index * 0.08),
      0.18 - index * 0.04,
      [x, moundHeightAt(mound, distance) - 0.02, z],
      [1.3, 0.35, 1],
      8,
    );
  });
  /* Long grass tufts on the mound */
  for (let tuft = 0; tuft < 7; tuft++) {
    const angle = tuft * 2.1 + mound.x;
    const distance = mound.radius * (0.35 + (tuft % 3) * 0.2);
    const x = mound.x + Math.sin(angle) * distance;
    const z = mound.z + Math.cos(angle) * distance;
    builder.add(
      "matte",
      tuft % 2 === 0 ? tuftGreen : shade(tuftGreen, 1.15),
      new ConeGeometry(0.08, 0.28, 4),
      { at: [x, moundHeightAt(mound, distance) + 0.1, z] },
    );
  }
};

/** A rabbit, facing +z, standing on y = 0. */
const buildRabbit = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    rabbitBrown,
    0.15,
    [0, 0.15, -0.04],
    [0.9, 1, 1.15],
    10,
  );
  builder.sphere("matte", rabbitBelly, 0.1, [0, 0.13, 0.06], [0.9, 1, 0.7], 8);
  builder.sphere(
    "matte",
    rabbitBrown,
    0.1,
    [0, 0.3, 0.1],
    [0.95, 0.9, 1.05],
    10,
  );
  builder.sphere(
    "matte",
    rabbitBelly,
    0.05,
    [0, 0.27, 0.18],
    [1.2, 0.8, 0.8],
    6,
  );
  builder.sphere("paint", earPink, 0.016, [0, 0.29, 0.205], [1.2, 1, 1], 4);
  builder.sphere("paint", palette.white, 0.06, [0, 0.13, -0.2], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    /* Long ears, pink inside, standing up and leaning out */
    builder.sphere(
      "matte",
      rabbitBrown,
      0.12,
      [side * 0.045, 0.47, 0.06],
      [0.28, 1, 0.14],
      7,
    );
    builder.sphere(
      "matte",
      earPink,
      0.1,
      [side * 0.045, 0.47, 0.074],
      [0.17, 0.85, 0.06],
      5,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.022,
      [side * 0.06, 0.32, 0.17],
      [1, 1, 1],
      6,
    );
    /* Whiskers and front paws */
    builder.bar(
      "paint",
      palette.white,
      [side * 0.03, 0.28, 0.2],
      [side * 0.13, 0.29, 0.2],
      0.005,
      3,
    );
    builder.sphere(
      "matte",
      rabbitBelly,
      0.04,
      [side * 0.05, 0.03, 0.12],
      [0.8, 0.6, 1.4],
      6,
    );
    builder.sphere(
      "matte",
      shade(rabbitBrown, 0.92),
      0.07,
      [side * 0.09, 0.07, -0.08],
      [0.6, 0.8, 1.4],
      6,
    );
  });
};

/** A little two-sloped lid on the peek box. */
const addGableRoofLite = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
) => {
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(palette.timber, 0.8),
      [width + 0.12, 0.05, depth * 0.62],
      [x, height + 0.12, z + side * depth * 0.26],
      [side * 0.5, 0, 0],
    );
  });
};

/** The peek box: a glass-fronted window into a burrow's cosy nest. */
const buildPeekBox = (builder: AttractionBuilder) => {
  const { x, z } = peekAt;
  const width = 1.1;
  const height = 0.6;
  const depth = 0.55;
  builder.box(
    "matte",
    palette.timber,
    [width, height, depth],
    [x, height / 2, z - depth / 2],
  );
  builder.box(
    "glass",
    palette.glass,
    [width - 0.14, height - 0.14, 0.03],
    [x, height / 2, z + 0.01],
  );
  addGableRoofLite(builder, x, z - depth / 2, width, depth, height);
  if (builder.isFar) {
    return;
  }
  /* The chamber inside: dark soil walls, a tunnel and a nest of kits */
  builder.box(
    "matte",
    burrowDark,
    [width - 0.16, height - 0.16, 0.02],
    [x, height / 2, z - depth + 0.08],
  );
  builder.cylinder("matte", shade(burrowDark, 1.4), {
    radius: 0.12,
    length: 0.02,
    at: [x + 0.32, height / 2 + 0.05, z - depth + 0.1],
    axis: "z",
    segments: 12,
  });
  builder.torus("matte", straw, 0.15, 0.05, [x - 0.1, 0.13, z - 0.25], "y", 14);
  [-0.06, 0.06].forEach((offset, index) => {
    builder.sphere(
      "matte",
      index === 0 ? shade(rabbitBrown, 1.1) : shade(rabbitBrown, 0.85),
      0.07,
      [x - 0.1 + offset, 0.16, z - 0.25 + offset * 0.5],
      [1, 0.8, 1.3],
      8,
    );
  });
  /* Frame round the glass */
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.cream,
      [0.06, height, 0.04],
      [x + side * (width / 2 - 0.03), height / 2, z + 0.02],
    );
  });
  [0.03, height - 0.03].forEach((y) => {
    builder.box("paint", palette.cream, [width, 0.06, 0.04], [x, y, z + 0.02]);
  });
};

const buildMeadow = (builder: AttractionBuilder) => {
  builder.box("matte", palette.path, [0.9, 0.03, 2.0], [0, 0.015, 3.0]);
  if (builder.isFar) {
    return;
  }
  /* Clover: three round leaves on a stalk, with a pink flower here and there */
  for (let patch = 0; patch < 10; patch++) {
    const angle = patch * 2.4;
    const radius = 2.2 + (patch % 4) * 0.45;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius * 0.8 + 0.4;
    [0, 1, 2].forEach((leaf) => {
      const turn = (leaf / 3) * Math.PI * 2 + patch;
      builder.sphere(
        "matte",
        cloverGreen,
        0.05,
        [x + Math.sin(turn) * 0.05, 0.06, z + Math.cos(turn) * 0.05],
        [1, 0.3, 1],
        5,
      );
    });
    if (patch % 3 === 0) {
      builder.sphere("paint", cloverPink, 0.045, [x, 0.13, z], [1, 1.2, 1], 6);
    }
  }
  /* Dandelions, two of them gone to seed */
  for (let flower = 0; flower < 9; flower++) {
    const angle = flower * 1.7 + 0.5;
    const radius = 2.4 + (flower % 3) * 0.5;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius * 0.85 + 0.3;
    const isSeed = flower % 4 === 1;
    const top = isSeed ? 0.32 : 0.2;
    builder.bar("matte", tuftGreen, [x, 0, z], [x, top, z], 0.015, 3);
    builder.sphere(
      isSeed ? "glass" : "paint",
      isSeed ? seedClock : dandelion,
      isSeed ? 0.07 : 0.05,
      [x, top + 0.02, z],
      isSeed ? [1, 1, 1] : [1, 0.5, 1],
      7,
    );
    builder.add(
      "matte",
      tuftGreen,
      new ConeGeometry(0.03, 0.18, 3).rotateZ(Math.PI / 2.4),
      { at: [x + 0.06, 0.03, z] },
    );
  }
  /* A carrot someone dropped, and a gnawed one */
  const carrots: { at: Triple; turn: number }[] = [
    { at: [0.9, 0.04, 1.4], turn: 0.6 },
    { at: [-1.1, 0.04, 1.7], turn: -1.1 },
  ];
  carrots.forEach(({ at, turn }, index) => {
    builder.add(
      "paint",
      "#e07a2a",
      new ConeGeometry(0.045, index === 0 ? 0.3 : 0.18, 8)
        .rotateZ(Math.PI / 2)
        .rotateY(turn),
      { at },
    );
    builder.sphere(
      "matte",
      cloverGreen,
      0.06,
      [at[0] - Math.cos(turn) * 0.17, 0.06, at[2] + Math.sin(turn) * 0.17],
      [1, 0.5, 1],
      5,
    );
  });
  addBush(builder, [-3.3, 0, -2.2], 0.6);
  addBush(builder, [3.3, 0, -2.6], 0.55, "#3d7a34");
  addBush(builder, [3.4, 0, 0.9], 0.45);
};

export const rabbitWarrenModel: CuriosityModel = {
  kind: "rabbit-warren",
  islandId: "meadow-isle",
  name: "Rabbit Warren",
  fact: "A warren is a home of tunnels that rabbits dig under the ground. Rabbits are mammals: they have fur, breathe air and feed their babies, called kits, on milk. They are herbivores, which means they only eat plants, such as grass, clover and dandelions. Their long ears listen out for danger.",
  curriculumLink:
    "Science, Year 1: animals, including humans. Identify and name a variety of common animals that are herbivores, and common mammals.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 1.5, z: 3.4 },
  build: (builder) => {
    mounds.forEach((mound) => {
      buildMound(builder, mound);
    });
    buildPeekBox(builder);
    buildMeadow(builder);
    addSignBoard(builder, [1.5, 0, 3.4], signColour);
  },
  moving: mounds.map((mound, index): MovingPart => {
    const [x, y, z] = holeAt(mound);
    return {
      name: `rabbit ${String(index + 1)}`,
      pivot: [x, y - 0.6, z],
      build: buildRabbit,
      motion: {
        kind: "rise",
        reach: 7,
        height: 0.58,
        period: 1.6 + index * 0.4,
        phase: index * 2.2,
      },
    };
  }),
  wanderers: [
    {
      name: "rabbits",
      build: buildRabbit,
      count: 2,
      centre: { x: 0, z: 1.9 },
      radius: 1.1,
      speed: 0.5,
      bob: 0.12,
    },
  ],
  blockers: [
    ...mounds.map(({ x, z, radius }) => ({ x, z, radius: radius * 0.85 })),
    { x: peekAt.x, z: peekAt.z - 0.28, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Peek into a burrow",
    news: "Peekaboo! A pair of twitchy ears popped up, then a pink nose, then a whole fluffy rabbit munching a clover leaf.",
  },
};
