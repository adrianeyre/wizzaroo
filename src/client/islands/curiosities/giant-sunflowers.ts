import {
  BoxGeometry,
  CylinderGeometry,
  LatheGeometry,
  OctahedronGeometry,
  SphereGeometry,
  Vector2,
  type BufferGeometry,
} from "three";
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

const petalYellow = "#f2c12e";
const petalDeep = "#e09a1c";
const seedBrown = "#4a2e1a";
const seedLight = "#7a5230";
const seedCentre = "#5f6a2a";
const stemGreen = "#5d8f34";
const leafGreen = "#4f8a2e";
const rootBrown = "#7a5636";
const soilColour = "#6b4a2f";
const postWhite = "#f4f1ea";
const bandRed = "#c8412f";
const signColour = "#c8892a";

/** One sunflower: where it grows, how tall, which way its head faces. */
interface Sunflower {
  x: number;
  z: number;
  height: number;
  turn: number;
  size: number;
}

/* The four at the back nod; the others stand still round the sides */
const noddingFlowers: Sunflower[] = [
  { x: -0.95, z: -2.7, height: 3.3, turn: 0.15, size: 1.0 },
  { x: 0.9, z: -2.75, height: 3.75, turn: -0.1, size: 1.12 },
  { x: -2.3, z: -1.75, height: 2.95, turn: 0.55, size: 0.95 },
  { x: 2.25, z: -1.8, height: 3.15, turn: -0.5, size: 1.0 },
];
const stillFlowers: Sunflower[] = [
  { x: -2.85, z: -0.1, height: 2.55, turn: 1.0, size: 0.9 },
  { x: 2.85, z: -0.2, height: 2.75, turn: -1.0, size: 0.92 },
  { x: -2.45, z: 1.45, height: 2.1, turn: 1.4, size: 0.82 },
];
const postAt = { x: 0, z: -0.9 };
const postHeight = 4.0;
const bow = 0.35;

/** Places a shape built facing +z onto a head bowed by `tilt` and turned by `turn`. */
const addOnHead = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  geometry: BufferGeometry,
  local: Triple,
  centre: Triple,
  tilt: number,
  turn: number,
) => {
  builder.add(
    finish,
    colour,
    geometry
      .translate(local[0], local[1], local[2])
      .rotateX(tilt)
      .rotateY(turn),
    { at: centre },
  );
};

/** A sunflower head: petals, seed disc and green back, centred at `centre`. */
const addHead = (
  builder: AttractionBuilder,
  centre: Triple,
  size: number,
  tilt: number,
  turn: number,
) => {
  const disc = 0.36 * size;
  const facing = (geometry: BufferGeometry) => geometry.rotateX(Math.PI / 2);
  if (builder.isFar) {
    /* From afar a head is a yellow disc with a brown middle */
    addOnHead(
      builder,
      "matte",
      petalYellow,
      facing(new CylinderGeometry(disc * 1.5, disc * 1.5, 0.03, 6)),
      [0, 0, -0.02],
      centre,
      tilt,
      turn,
    );
    addOnHead(
      builder,
      "matte",
      seedBrown,
      facing(new CylinderGeometry(disc, disc, 0.1, 5)),
      [0, 0, 0],
      centre,
      tilt,
      turn,
    );
    return;
  }
  /* The green back, the seed disc and its domed middle */
  addOnHead(
    builder,
    "matte",
    stemGreen,
    facing(
      new CylinderGeometry(
        disc * 1.02,
        disc * 0.5,
        0.14 * size,
        builder.segments(16),
      ),
    ),
    [0, 0, -0.07 * size],
    centre,
    tilt,
    turn,
  );
  addOnHead(
    builder,
    "matte",
    seedBrown,
    facing(
      new LatheGeometry(
        [
          new Vector2(disc, 0),
          new Vector2(disc * 0.85, 0.05 * size),
          new Vector2(disc * 0.45, 0.08 * size),
          new Vector2(0, 0.09 * size),
        ],
        builder.segments(20),
      ),
    ),
    [0, 0, 0],
    centre,
    tilt,
    turn,
  );
  /* Two rings of petals, the back ring deeper yellow */
  const petals = 12;
  [0, 1].forEach((ring) => {
    for (let index = 0; index < petals; index++) {
      const angle = ((index + ring * 0.5) / petals) * Math.PI * 2;
      const reach = disc + 0.17 * size - ring * 0.02;
      const geometry = new OctahedronGeometry(1)
        .scale(0.08 * size, 0.21 * size, 0.02)
        .rotateZ(-angle)
        .translate(
          Math.sin(angle) * reach,
          Math.cos(angle) * reach,
          ring === 0 ? 0.01 : -0.03,
        );
      addOnHead(
        builder,
        "matte",
        ring === 0 ? petalYellow : petalDeep,
        geometry,
        [0, 0, 0],
        centre,
        tilt,
        turn,
      );
    }
  });
  /* Seeds laid in the sunflower's spiral, each turned by the golden angle */
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let seed = 3; seed < 14; seed++) {
    const radius = disc * 0.9 * Math.sqrt(seed / 14);
    const angle = seed * goldenAngle;
    const domeHeight = 0.09 * size * (1 - (radius / disc) ** 2) + 0.012;
    addOnHead(
      builder,
      "matte",
      seed % 2 === 0 ? seedLight : shade(seedBrown, 1.25),
      new BoxGeometry(0.035 * size, 0.035 * size, 0.02).rotateZ(angle),
      [Math.sin(angle) * radius, Math.cos(angle) * radius, domeHeight],
      centre,
      tilt,
      turn,
    );
  }
  addOnHead(
    builder,
    "matte",
    seedCentre,
    new SphereGeometry(0.07 * size, 8, 4).scale(1, 1, 0.5),
    [0, 0, 0.09 * size],
    centre,
    tilt,
    turn,
  );
};

/** Where the head sits on top of its stem. */
const headTop = ({ x, z, height }: Sunflower): Triple => [x, height, z];

/** A stem with its big leaves, and roots gripping the soil. */
const addStem = (builder: AttractionBuilder, flower: Sunflower) => {
  const { x, z, height, size, turn } = flower;
  builder.cylinder("matte", stemGreen, {
    radius: 0.075 * size,
    radiusEnd: 0.05 * size,
    length: height,
    at: [x, height / 2, z],
    segments: builder.isFar ? 5 : 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", soilColour, {
    radius: 0.36,
    radiusEnd: 0.22,
    length: 0.12,
    at: [x, 0.06, z],
    segments: 12,
  });
  /* Heart-shaped leaves on short stalks, turning up the stem */
  [0.9, 1.55, 2.15].forEach((up, index) => {
    if (up > height - 0.5) {
      return;
    }
    const around = turn + index * 2.3 + 0.6;
    const out = 0.3 * size;
    builder.add(
      "matte",
      index % 2 === 0 ? leafGreen : shade(leafGreen, 1.12),
      new SphereGeometry(1, 7, 3)
        .scale(0.16 * size, 0.025, 0.3 * size)
        .rotateX(-0.35)
        .translate(0, 0, out)
        .rotateY(around),
      { at: [x, up, z] },
    );
    builder.add(
      "matte",
      shade(leafGreen, 0.75),
      new BoxGeometry(0.012, 0.012, out * 1.6)
        .rotateX(-0.35)
        .translate(0, 0.02, out)
        .rotateY(around),
      { at: [x, up, z] },
      undefined,
    );
  });
  /* Roots spreading into the soil, the bit plants drink through */
  for (let root = 0; root < 4; root++) {
    const angle = turn + (root / 4) * Math.PI * 2 + 0.4;
    builder.bar(
      "matte",
      rootBrown,
      [x, 0.12, z],
      [x + Math.sin(angle) * 0.42, 0.01, z + Math.cos(angle) * 0.42],
      0.035,
      4,
    );
  }
};

/** The measuring post: painted bands every half metre, dots for each metre. */
const buildPost = (builder: AttractionBuilder) => {
  const { x, z } = postAt;
  builder.box(
    "paint",
    postWhite,
    [0.16, postHeight, 0.16],
    [x, postHeight / 2, z],
  );
  builder.box("matte", palette.stone, [0.5, 0.12, 0.5], [x, 0.06, z]);
  for (let band = 1; band < postHeight * 2; band += 2) {
    builder.box("paint", bandRed, [0.17, 0.5, 0.17], [x, band * 0.5 + 0.25, z]);
  }
  if (builder.isFar) {
    return;
  }
  /* A tick every quarter metre, and a yellow tab at each metre with its dots */
  for (let tick = 1; tick < postHeight * 4; tick++) {
    builder.box(
      "paint",
      palette.black,
      [tick % 4 === 0 ? 0.12 : 0.06, 0.02, 0.01],
      [x - 0.04, tick * 0.25, z + 0.085],
    );
  }
  [1, 2, 3].forEach((metre) => {
    builder.box(
      "paint",
      petalYellow,
      [0.32, 0.18, 0.04],
      [x + 0.24, metre, z + 0.06],
    );
    for (let dot = 0; dot < metre; dot++) {
      builder.cylinder("paint", palette.black, {
        radius: 0.025,
        length: 0.02,
        at: [x + 0.24 + (dot - (metre - 1) / 2) * 0.08, metre, z + 0.085],
        axis: "z",
        segments: 8,
      });
    }
  });
  /* A red arrow marking the tallest flower */
  builder.cylinder("paint", bandRed, {
    radius: 0.09,
    radiusEnd: 0.001,
    length: 0.2,
    at: [x - 0.2, noddingFlowers[1].height, z + 0.05],
    axis: "x",
    segments: 3,
  });
  /* A little sunflower on top of the post */
  addHead(builder, [x, postHeight + 0.12, z + 0.02], 0.4, 0, 0);
};

/** One nodding head, built about the top of its stem. */
const buildNoddingHead =
  (flower: Sunflower) => (builder: AttractionBuilder) => {
    addHead(builder, [0, 0.12, 0.1], flower.size, bow, flower.turn);
  };

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.path, [1.0, 0.03, 3.2], [0, 0.015, 2.3]);
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", palette.path, {
    radius: 0.9,
    length: 0.03,
    at: [postAt.x, 0.015, postAt.z + 0.3],
    segments: 20,
  });
  /* A watering can, a seed basket and a trowel by the path */
  const can: Triple = [-1.0, 0, 1.6];
  builder.cylinder("metal", "#d0563a", {
    radius: 0.15,
    length: 0.32,
    at: [can[0], 0.16, can[2]],
    segments: 14,
  });
  builder.bar(
    "metal",
    "#d0563a",
    [can[0] + 0.1, 0.12, can[2]],
    [can[0] + 0.4, 0.34, can[2] + 0.05],
    0.04,
    6,
  );
  builder.torus(
    "metal",
    "#d0563a",
    0.12,
    0.018,
    [can[0], 0.34, can[2]],
    "z",
    12,
  );
  const basket: Triple = [1.05, 0, 1.4];
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.26,
    radiusEnd: 0.2,
    length: 0.2,
    at: [basket[0], 0.1, basket[2]],
    segments: 14,
  });
  builder.cylinder("matte", "#2f2620", {
    radius: 0.24,
    length: 0.02,
    at: [basket[0], 0.19, basket[2]],
    segments: 14,
  });
  builder.torus(
    "matte",
    palette.timber,
    0.22,
    0.018,
    [basket[0], 0.2, basket[2]],
    "x",
    14,
  );
  builder.bar(
    "metal",
    palette.steel,
    [1.5, 0.02, 0.7],
    [1.75, 0.03, 0.95],
    0.06,
    4,
  );
  builder.bar(
    "matte",
    palette.timber,
    [1.75, 0.03, 0.95],
    [1.9, 0.05, 1.1],
    0.04,
    6,
  );
  /* A footprint plate to stand on and be measured too */
  builder.cylinder("paint", petalYellow, {
    radius: 0.32,
    length: 0.03,
    at: [postAt.x, 0.04, postAt.z + 0.55],
    segments: 18,
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.07,
      [postAt.x + side * 0.09, 0.06, postAt.z + 0.55],
      [0.7, 0.2, 1.4],
      6,
    );
  });
};

/** A bumblebee, facing +z. */
const buildBee = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#f2c12e", 0.06, [0, 0, 0], [1, 1, 1.4], 8);
  builder.cylinder("paint", palette.black, {
    radius: 0.062,
    length: 0.03,
    at: [0, 0, -0.01],
    axis: "z",
    segments: 8,
    isOpen: true,
  });
  builder.sphere("paint", palette.black, 0.035, [0, 0, 0.08], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glass",
      "#e8f2f8",
      0.05,
      [side * 0.05, 0.06, -0.01],
      [1, 0.2, 0.6],
      4,
    );
  });
};

export const giantSunflowersModel: CuriosityModel = {
  kind: "giant-sunflowers",
  islandId: "meadow-isle",
  name: "Giant Sunflowers",
  fact: "Sunflowers can grow taller than a grown-up in just one summer! Like other flowering plants, a sunflower has roots to drink water from the soil, a strong stem to hold it up, leaves to make food from sunlight, and bright yellow petals. Young sunflower heads turn to follow the Sun across the sky.",
  curriculumLink:
    "Science, Year 1: plants. Identify and describe the basic structure of a variety of common flowering plants, including trees: roots, stem, leaves and petals.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: 1.5, z: 3.5 },
  build: (builder) => {
    buildGrounds(builder);
    [...noddingFlowers, ...stillFlowers].forEach((flower) => {
      addStem(builder, flower);
    });
    stillFlowers.forEach((flower) => {
      addHead(
        builder,
        [flower.x, flower.height + 0.12, flower.z + 0.06],
        flower.size,
        bow,
        flower.turn,
      );
    });
    if (builder.isFar) {
      noddingFlowers.forEach((flower) => {
        addHead(
          builder,
          [flower.x, flower.height + 0.12, flower.z + 0.1],
          flower.size,
          bow,
          flower.turn,
        );
      });
    }
    buildPost(builder);
    addSignBoard(builder, [1.5, 0, 3.5], signColour);
  },
  moving: noddingFlowers.map((flower, index) => ({
    name: `sunflower ${String(index + 1)}`,
    pivot: headTop(flower),
    build: buildNoddingHead(flower),
    motion: {
      kind: "nod",
      axis: "x",
      reach: 7,
      amplitude: 0.22,
      period: 2.4 + index * 0.3,
      phase: index * 1.3,
    },
  })),
  wanderers: [
    {
      name: "bumblebees",
      build: buildBee,
      count: 4,
      centre: { x: 0, z: -1.6 },
      radius: 2.2,
      speed: 0.5,
      height: 2.6,
      bob: 0.35,
    },
  ],
  blockers: [
    ...[...noddingFlowers, ...stillFlowers].map(({ x, z }) => ({
      x,
      z,
      radius: 0.35,
    })),
    { x: postAt.x, z: postAt.z, radius: 0.3 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Measure the tallest",
    news: "Stretch! The tallest sunflower reached nearly four metres. That's more than three of you standing on each other's heads!",
  },
};
