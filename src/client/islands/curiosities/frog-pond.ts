import {
  CylinderGeometry,
  DodecahedronGeometry,
  OctahedronGeometry,
} from "three";
import {
  addBush,
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const pondWater = "#3a8fa8";
const pondBed = "#2c4a3a";
const edgeStone = "#9c9686";
const padGreen = "#4f8f3a";
const lilyPink = "#f2b6cc";
const lilyHeart = "#f2d24a";
const reedGreen = "#6e8f3a";
const bulrush = "#5a3b22";
const frogGreen = "#5aa83c";
const frogBelly = "#d8e6a0";
const frogSpot = "#3c7a2a";
const eyeGold = "#e8c43a";
const deckTimber = "#9a7048";
const damselBlue = "#2f8fd8";
const signColour = "#2f7a5a";

/* The pond is an oval; the dipping platform reaches into it from the +z side */
const pond = { x: 0, z: -0.6, radiusX: 2.4, radiusZ: 1.8 };
const waterLevel = 0.12;
const deck = { minX: -0.55, maxX: 0.55, minZ: 0.35, maxZ: 1.95 };
const deckHeight = 0.24;

/** A point on the pond's rim, `out` beyond the water's edge. */
const rimPoint = (angle: number, out: number) => ({
  x: pond.x + Math.sin(angle) * (pond.radiusX + out),
  z: pond.z + Math.cos(angle) * (pond.radiusZ + out),
});

/* Lily pads; the frogs sit on the first three */
const pads: { x: number; z: number; radius: number }[] = [
  { x: -1.0, z: -0.3, radius: 0.32 },
  { x: 1.0, z: -0.95, radius: 0.34 },
  { x: 0.05, z: -1.65, radius: 0.3 },
  { x: -1.6, z: -1.0, radius: 0.24 },
  { x: 1.65, z: -0.2, radius: 0.22 },
  { x: -0.5, z: -1.2, radius: 0.2 },
  { x: 0.6, z: -0.1, radius: 0.18 },
  { x: -0.25, z: -2.0, radius: 0.16 },
  { x: 1.4, z: -1.6, radius: 0.2 },
];
const frogPads = pads.slice(0, 3);
const padTop = waterLevel + 0.025;

const buildPond = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 10 : 36;
  const oval = (radius: number, height: number) =>
    new CylinderGeometry(radius, radius, height, segments).scale(
      pond.radiusX / pond.radiusZ,
      1,
      1,
    );
  builder.add("matte", pondBed, oval(pond.radiusZ, 0.04), {
    at: [pond.x, 0.03, pond.z],
  });
  builder.add("water", pondWater, oval(pond.radiusZ, 0.03), {
    at: [pond.x, waterLevel, pond.z],
  });
  builder.add("matte", edgeStone, oval(pond.radiusZ + 0.25, 0.08), {
    at: [pond.x, 0.04, pond.z],
  });
  if (builder.isFar) {
    return;
  }
  /* Rounded stones all round the edge, some bigger, in mixed greys */
  const stones = 30;
  for (let stone = 0; stone < stones; stone++) {
    const angle = (stone / stones) * Math.PI * 2;
    const { x, z } = rimPoint(angle, 0.12);
    if (x > deck.minX - 0.15 && x < deck.maxX + 0.15 && z > 0) {
      continue;
    }
    const size = 0.2 + ((stone * 5) % 4) * 0.04;
    builder.add(
      "matte",
      shade(edgeStone, 0.82 + ((stone * 3) % 5) * 0.08),
      new DodecahedronGeometry(size)
        .scale(1.3, 0.55, 1)
        .rotateY(-angle + stone * 0.3),
      { at: [x, size * 0.35, z] },
    );
  }
  /* Ripples on the water */
  [
    [-0.6, -0.7, 0.3],
    [0.5, -1.4, 0.22],
  ].forEach(([x, z, radius]) => {
    builder.torus(
      "water",
      shade(pondWater, 1.35),
      radius,
      0.008,
      [x, waterLevel + 0.018, z],
      "y",
      16,
    );
  });
};

const buildLilies = (builder: AttractionBuilder) => {
  (builder.isFar ? frogPads : pads).forEach(({ x, z, radius }, index) => {
    /* Each pad has its notch, cut where the stalk meets it */
    builder.add(
      "matte",
      index % 2 === 0 ? padGreen : shade(padGreen, 1.12),
      new CylinderGeometry(
        radius,
        radius,
        0.025,
        builder.segments(14),
        1,
        false,
        index * 1.1,
        Math.PI * 2 - 0.55,
      ),
      { at: [x, waterLevel + 0.012, z] },
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Three water lilies in flower */
  [pads[3], pads[4], pads[8]].forEach(({ x, z }, index) => {
    const at: Triple = [x + 0.06, padTop + 0.02, z + 0.04];
    [0, 1].forEach((ring) => {
      for (let petal = 0; petal < 6; petal++) {
        const angle = ((petal + ring * 0.5) / 6) * Math.PI * 2;
        builder.add(
          "paint",
          ring === 0 ? lilyPink : shade(lilyPink, 1.08),
          new OctahedronGeometry(1)
            .scale(0.035, 0.03, 0.09 - ring * 0.02)
            .rotateX(ring === 0 ? -0.3 : -0.9)
            .translate(0, 0, 0.06 - ring * 0.02)
            .rotateY(angle),
          { at: [at[0], at[1] + ring * 0.02, at[2]] },
        );
      }
    });
    builder.sphere(
      "paint",
      index === 1 ? palette.white : lilyHeart,
      0.03,
      [at[0], at[1] + 0.04, at[2]],
      [1, 0.7, 1],
      6,
    );
  });
};

const buildReeds = (builder: AttractionBuilder) => {
  const clumps = [2.3, 2.8, 3.5, 4.0, 4.6, 5.3];
  clumps.forEach((angle, index) => {
    const { x, z } = rimPoint(angle, -0.25);
    const blades = builder.isFar ? 1 : 5;
    for (let blade = 0; blade < blades; blade++) {
      const lean = (blade - (blades - 1) / 2) * 0.09;
      builder.bar(
        "matte",
        blade % 2 === 0 ? reedGreen : shade(reedGreen, 0.85),
        [x + lean * 0.4, 0.05, z],
        [x + lean, 1.0 + ((blade + index) % 3) * 0.22, z + lean * 0.5],
        0.035,
        4,
      );
    }
    if (builder.isFar) {
      return;
    }
    [0, 1].forEach((head) => {
      const top = 1.15 + head * 0.25 + (index % 2) * 0.1;
      const offset = head === 0 ? -0.06 : 0.07;
      builder.bar(
        "matte",
        reedGreen,
        [x + offset, 0.05, z],
        [x + offset, top + 0.18, z],
        0.025,
        4,
      );
      builder.cylinder("matte", bulrush, {
        radius: 0.045,
        length: 0.22,
        at: [x + offset, top, z],
        segments: 6,
      });
    });
  });
};

/** The dipping platform: a little deck on posts over the water. */
const buildDeck = (builder: AttractionBuilder) => {
  const width = deck.maxX - deck.minX;
  const length = deck.maxZ - deck.minZ;
  const middleZ = (deck.minZ + deck.maxZ) / 2;
  builder.box(
    "matte",
    deckTimber,
    [width, 0.06, length],
    [0, deckHeight - 0.03, middleZ],
  );
  if (builder.isFar) {
    return;
  }
  for (let plank = 0; plank < 8; plank++) {
    const z = deck.minZ + 0.1 + plank * ((length - 0.2) / 7);
    builder.box(
      "matte",
      shade(deckTimber, plank % 2 === 0 ? 1.08 : 0.92),
      [width - 0.02, 0.02, 0.16],
      [0, deckHeight + 0.01, z],
    );
  }
  /* Posts into the pond, and a rail along each side */
  [deck.minX + 0.04, deck.maxX - 0.04].forEach((x) => {
    [deck.minZ + 0.05, middleZ, deck.maxZ - 0.05].forEach((z) => {
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.05,
        length: 0.8,
        at: [x, deckHeight + 0.2, z],
        segments: 8,
      });
    });
    builder.box(
      "matte",
      palette.darkTimber,
      [0.06, 0.06, length],
      [x, deckHeight + 0.58, middleZ],
    );
  });
  /* A step up at the shore end */
  builder.box(
    "matte",
    palette.darkTimber,
    [width, 0.12, 0.3],
    [0, 0.06, deck.maxZ + 0.15],
  );
  /* A pond-dipping net, a white tray and a kneeling mat */
  builder.bar(
    "matte",
    palette.paleTimber,
    [deck.maxX - 0.1, deckHeight + 0.05, deck.maxZ - 0.3],
    [deck.minX + 0.15, deckHeight + 0.15, deck.minZ + 0.15],
    0.03,
    6,
  );
  builder.torus(
    "metal",
    palette.steel,
    0.12,
    0.012,
    [deck.minX + 0.12, deckHeight + 0.16, deck.minZ + 0.02],
    "y",
    14,
  );
  builder.cylinder("glass", palette.white, {
    radius: 0.12,
    radiusEnd: 0.04,
    length: 0.14,
    at: [deck.minX + 0.12, deckHeight + 0.09, deck.minZ + 0.02],
    segments: 10,
    isOpen: true,
  });
  builder.box(
    "paint",
    palette.white,
    [0.36, 0.06, 0.26],
    [0.2, deckHeight + 0.05, deck.minZ + 0.55],
  );
  builder.box(
    "water",
    pondWater,
    [0.32, 0.02, 0.22],
    [0.2, deckHeight + 0.07, deck.minZ + 0.55],
  );
  builder.box(
    "matte",
    "#3f7fbf",
    [0.4, 0.03, 0.3],
    [-0.15, deckHeight + 0.03, deck.minZ + 0.95],
  );
};

/** A frog, crouched, facing +z, standing on y = 0. */
const buildFrog = (builder: AttractionBuilder) => {
  builder.sphere("paint", frogGreen, 0.13, [0, 0.1, 0], [1, 0.7, 1.15], 9);
  builder.sphere("paint", frogBelly, 0.11, [0, 0.07, 0.04], [0.9, 0.55, 1], 7);
  builder.sphere("paint", frogGreen, 0.1, [0, 0.15, 0.1], [1.15, 0.7, 0.9], 9);
  /* Spots on its back */
  [
    [-0.05, 0.17, -0.04],
    [0.06, 0.16, -0.06],
    [0.0, 0.18, 0.02],
  ].forEach(([x, y, z]) => {
    builder.sphere("paint", frogSpot, 0.025, [x, y, z], [1, 0.4, 1], 4);
  });
  [-1, 1].forEach((side) => {
    /* Big bulging eyes, with golden irises */
    builder.sphere(
      "paint",
      frogGreen,
      0.05,
      [side * 0.06, 0.22, 0.12],
      [1, 1, 1],
      7,
    );
    builder.sphere(
      "paint",
      eyeGold,
      0.035,
      [side * 0.065, 0.235, 0.145],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.018,
      [side * 0.068, 0.24, 0.175],
      [1.4, 0.7, 1],
      4,
    );
    /* Folded back legs and splayed front feet */
    builder.sphere(
      "paint",
      shade(frogGreen, 0.9),
      0.08,
      [side * 0.11, 0.06, -0.07],
      [0.6, 0.6, 1.3],
      6,
    );
    builder.sphere(
      "paint",
      shade(frogGreen, 0.85),
      0.05,
      [side * 0.13, 0.015, 0.03],
      [0.9, 0.3, 1.6],
      4,
    );
    builder.bar(
      "paint",
      frogGreen,
      [side * 0.06, 0.1, 0.12],
      [side * 0.08, 0.01, 0.17],
      0.035,
      5,
    );
    builder.sphere(
      "paint",
      shade(frogGreen, 0.85),
      0.03,
      [side * 0.085, 0.01, 0.19],
      [1.2, 0.3, 1],
      4,
    );
  });
  /* A wide smile */
  builder.torus(
    "paint",
    shade(frogGreen, 0.6),
    0.075,
    0.006,
    [0, 0.14, 0.13],
    "y",
    10,
  );
};

/** A blue damselfly, facing +z. */
const buildDamselfly = (builder: AttractionBuilder) => {
  builder.bar("paint", damselBlue, [0, 0, -0.18], [0, 0, 0.05], 0.018, 4);
  builder.sphere(
    "paint",
    shade(damselBlue, 0.7),
    0.025,
    [0, 0, 0.07],
    [1.3, 1, 1],
    6,
  );
  [-1, 1].forEach((side) => {
    [0, 1].forEach((pair) => {
      builder.add(
        "glass",
        "#dff0fa",
        new OctahedronGeometry(1).scale(0.1, 0.005, 0.025),
        { at: [side * 0.1, 0.01, 0.02 - pair * 0.05] },
      );
    });
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.path, [1.0, 0.03, 2.4], [0, 0.015, 3.2]);
  if (builder.isFar) {
    return;
  }
  /* Frogspawn in the shallows, a jelly of eggs with black dots */
  const spawn = rimPoint(1.25, -0.5);
  for (let egg = 0; egg < 7; egg++) {
    const angle = egg * 2.4;
    const radius = 0.04 + (egg % 3) * 0.05;
    const at: Triple = [
      spawn.x + Math.sin(angle) * radius,
      waterLevel + 0.03,
      spawn.z + Math.cos(angle) * radius,
    ];
    builder.sphere("glass", "#e4f0e8", 0.045, at, [1, 0.7, 1], 6);
    builder.box("paint", palette.black, [0.015, 0.015, 0.015], at);
  }
  /* A mossy log at the water's edge, with a frog-sized hollow */
  const log = rimPoint(-1.3, 0.55);
  builder.cylinder("matte", palette.timber, {
    radius: 0.2,
    length: 1.1,
    at: [log.x, 0.2, log.z],
    axis: "x",
    segments: 12,
  });
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.17,
    length: 1.12,
    at: [log.x, 0.2, log.z],
    axis: "x",
    segments: 12,
  });
  builder.sphere(
    "matte",
    "#6f9a3e",
    0.16,
    [log.x - 0.2, 0.36, log.z],
    [1.6, 0.4, 1],
    8,
  );
  /* A pond life board beside the platform */
  const board: Triple = [-1.4, 0, 2.2];
  builder.box(
    "matte",
    palette.darkTimber,
    [0.07, 0.9, 0.07],
    [board[0], 0.45, board[2]],
  );
  builder.box(
    "paint",
    palette.cream,
    [0.55, 0.38, 0.04],
    [board[0], 0.95, board[2] + 0.04],
  );
  [frogGreen, damselBlue, lilyPink].forEach((colour, index) => {
    builder.cylinder("paint", colour, {
      radius: 0.06,
      length: 0.02,
      at: [board[0] + (index - 1) * 0.15, 1.0, board[2] + 0.07],
      axis: "z",
      segments: 10,
    });
  });
  addBush(builder, [2.9, 0, 1.4], 0.5);
  addBush(builder, [-3.0, 0, 1.0], 0.45, "#3d7a34");
};

export const frogPondModel: CuriosityModel = {
  kind: "frog-pond",
  islandId: "meadow-isle",
  name: "Frog Pond",
  fact: "Frogs are amphibians, which means they can live in water and on land. A frog starts life as an egg in a jelly called frogspawn, hatches into a tadpole that swims with a tail, then grows legs and hops out of the pond. Frogs have smooth, damp skin and catch flies with their long, sticky tongues.",
  curriculumLink:
    "Science, Year 1: animals, including humans. Identify and name a variety of common animals including fish, amphibians, reptiles, birds and mammals.",
  footprint: 4.8,
  setting: "inland",
  signSpot: { x: 1.5, z: 3.4 },
  build: (builder) => {
    buildGrounds(builder);
    buildPond(builder);
    buildLilies(builder);
    buildReeds(builder);
    buildDeck(builder);
    if (builder.isFar) {
      frogPads.forEach(({ x, z }) => {
        builder.sphere(
          "paint",
          frogGreen,
          0.13,
          [x, padTop + 0.1, z],
          [1, 0.8, 1.1],
          6,
        );
      });
    }
    addSignBoard(builder, [1.5, 0, 3.4], signColour);
  },
  moving: frogPads.map(({ x, z }, index) => ({
    name: `frog ${String(index + 1)}`,
    pivot: [x, padTop, z] satisfies Triple,
    build: buildFrog,
    motion: {
      kind: "rise",
      reach: 7,
      height: 0.45,
      period: 0.7 + index * 0.15,
      phase: index * 2.1,
    },
  })),
  wanderers: [
    {
      name: "damselflies",
      build: buildDamselfly,
      count: 4,
      centre: { x: pond.x, z: pond.z },
      radius: 1.8,
      speed: 0.6,
      height: 0.7,
      bob: 0.2,
    },
  ],
  decks: [
    buildFlatDeck(
      { minX: deck.minX, maxX: deck.maxX, minZ: deck.minZ, maxZ: deck.maxZ },
      deckHeight,
    ),
  ],
  blockers: [
    { x: 0, z: -1.1, radius: 1.35 },
    { x: -1.45, z: -0.55, radius: 0.95 },
    { x: 1.45, z: -0.55, radius: 0.95 },
    { x: -1.15, z: 0.45, radius: 0.5 },
    { x: 1.15, z: 0.45, radius: 0.5 },
    { x: -2.1, z: -0.6, radius: 0.5 },
    { x: 2.1, z: -0.6, radius: 0.5 },
    { x: -0.9, z: -1.9, radius: 0.6 },
    { x: 0.9, z: -1.9, radius: 0.6 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Count the frogs",
    news: "One, two, three! Three green frogs hopped up from their lily pads. Ribbit! Can you spot the frogspawn that will hatch into tadpoles?",
  },
};
