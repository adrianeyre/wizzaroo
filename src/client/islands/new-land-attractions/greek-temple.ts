import {
  addSignBoard,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addAmphora,
  addOliveTree,
  addTripod,
  basalt,
  bronze,
  buildAthena,
  buildCella,
  buildColumns,
  buildCrepidoma,
  buildEntablature,
  buildFlame,
  buildRoof,
  cella,
  floorHeight,
  gold,
  greekBlue,
  greekRed,
  marble,
  stepTread,
  stylobate,
} from "./greek-temple-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const ashPad = "#6f6862";
const paving = "#b9b0a2";
const signColour = "#2d4a78";

const altarAt = { x: -2.9, z: 5.7 };
const altarTop = 0.9;
const owlPillarAt = { x: 2.9, z: 5.7 };
const owlPillarTop = 1.35;
const innerTripodAt = { x: 1.2, z: -2.5 };
const innerTripodTop = floorHeight + 1.05;
const brazierSpots = [
  { x: -4.4, z: 4.2 },
  { x: 4.4, z: 4.2 },
];
const oliveSpots: readonly Triple[] = [
  [-6.7, 0, 1.2],
  [6.6, 0, -3.6],
  [-6.1, 0, -5.4],
  [6.3, 0, 5.0],
];
const signAt = { x: -4.7, z: 7.5 };

/* The paved court and the way up */

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    paving,
    [stylobate.maxX * 2 + 3, 0.03, stylobate.maxZ - stylobate.minZ + 3],
    [0, 0.015, (stylobate.minZ + stylobate.maxZ) / 2],
  );
  builder.box("matte", paving, [2.4, 0.03, 5.4], [0, 0.015, 7.0]);
  builder.box("matte", paving, [8.6, 0.03, 2.4], [0, 0.016, 5.7]);
  if (builder.isFar) {
    return;
  }
  /* Slab joints on the path and court */
  for (let z = 5.0; z < 9.6; z += 0.6) {
    builder.box("matte", shade(paving, 0.86), [2.4, 0.01, 0.03], [0, 0.035, z]);
  }
  for (let x = -4.0; x <= 4.0; x += 0.8) {
    builder.box(
      "matte",
      shade(paving, 0.86),
      [0.03, 0.01, 2.4],
      [x, 0.035, 5.7],
    );
  }
  /* A basalt kerb round the court */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      basalt,
      [0.14, 0.08, stylobate.maxZ - stylobate.minZ + 3],
      [
        side * (stylobate.maxX + 1.5),
        0.04,
        (stylobate.minZ + stylobate.maxZ) / 2,
      ],
    );
  });
  builder.box(
    "matte",
    basalt,
    [stylobate.maxX * 2 + 3, 0.08, 0.14],
    [0, 0.04, stylobate.minZ - 1.5],
  );
};

/* The altar, where the fire burns for the goddess */

const buildAltar = (builder: AttractionBuilder) => {
  const { x, z } = altarAt;
  builder.box("matte", marble, [1.5, 0.16, 1.0], [x, 0.08, z]);
  builder.box(
    "matte",
    shade(marble, 0.97),
    [1.25, altarTop - 0.26, 0.8],
    [x, 0.16 + (altarTop - 0.26) / 2, z],
  );
  builder.box("matte", marble, [1.4, 0.1, 0.9], [x, altarTop - 0.05, z]);
  builder.cylinder("matte", basalt, {
    radius: 0.32,
    length: 0.08,
    at: [x, altarTop + 0.04, z],
    segments: builder.segments(14, 6),
  });
  if (builder.isFar) {
    return;
  }
  /* Volutes at its corners and a painted garland */
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", shade(marble, 1.03), {
      radius: 0.09,
      length: 0.82,
      at: [x + side * 0.62, altarTop + 0.02, z],
      axis: "z",
      segments: 10,
    });
  });
  builder.box(
    "paint",
    greekRed,
    [1.0, 0.08, 0.02],
    [x, altarTop - 0.25, z + 0.41],
  );
  [-0.3, 0, 0.3].forEach((dx) => {
    builder.sphere(
      "paint",
      "#5d7a3a",
      0.06,
      [x + dx, altarTop - 0.35, z + 0.42],
      [1.4, 1, 0.6],
      8,
    );
  });
  /* Glowing coals under the flame */
  builder.sphere(
    "glow",
    "#ff8a2a",
    0.24,
    [x, altarTop + 0.08, z],
    [1, 0.35, 1],
    10,
  );
  addAmphora(builder, [x - 1.05, 0, z - 0.2], 1);
  addAmphora(builder, [x - 1.25, 0, z + 0.35], 0.75);
};

/* The owl's pillar, Athena's wise little owl on top */

const buildOwlPillar = (builder: AttractionBuilder) => {
  const { x, z } = owlPillarAt;
  builder.box("matte", marble, [0.6, 0.14, 0.6], [x, 0.07, z]);
  builder.cylinder("matte", marble, {
    radius: 0.2,
    radiusEnd: 0.18,
    length: owlPillarTop - 0.26,
    at: [x, 0.14 + (owlPillarTop - 0.26) / 2, z],
    segments: builder.segments(16, 6),
  });
  builder.box(
    "matte",
    shade(marble, 1.03),
    [0.5, 0.12, 0.5],
    [x, owlPillarTop - 0.06, z],
  );
  if (!builder.isFar) {
    builder.box("paint", greekBlue, [0.36, 0.12, 0.02], [x, 0.6, z + 0.2]);
  }
};

const buildOwl = (builder: AttractionBuilder) => {
  builder.sphere("metal", bronze, 0.22, [0, 0.26, 0], [1, 1.2, 0.9], 12);
  builder.sphere("metal", bronze, 0.17, [0, 0.55, 0.02], [1.1, 0.95, 1], 12);
  if (builder.isFar) {
    return;
  }
  /* Big round eyes: gold rims and dark middles */
  [-1, 1].forEach((side) => {
    builder.cylinder("metal", gold, {
      radius: 0.065,
      length: 0.03,
      at: [side * 0.07, 0.57, 0.17],
      axis: "z",
      segments: 12,
    });
    builder.sphere(
      "paint",
      "#1d1a17",
      0.032,
      [side * 0.07, 0.57, 0.185],
      [1, 1, 0.5],
      8,
    );
    builder.sphere(
      "glow",
      "#fff4d0",
      0.01,
      [side * 0.07 + 0.012, 0.585, 0.2],
      [1, 1, 1],
      4,
    );
    /* Ear tufts */
    builder.lathe(
      "metal",
      shade(bronze, 0.9),
      [
        [0.04, 0],
        [0.001, 0.1],
      ],
      [side * 0.11, 0.68, 0],
      "y",
      6,
    );
    /* Folded wings */
    builder.sphere(
      "metal",
      shade(bronze, 0.82),
      0.13,
      [side * 0.17, 0.25, -0.02],
      [0.45, 1.1, 0.8],
      8,
    );
    /* Feet gripping the pillar */
    builder.sphere(
      "metal",
      gold,
      0.04,
      [side * 0.08, 0.02, 0.12],
      [1, 0.5, 1.3],
      6,
    );
  });
  builder.lathe(
    "metal",
    gold,
    [
      [0.03, 0],
      [0.001, -0.06],
    ],
    [0, 0.53, 0.18],
    "y",
    6,
  );
};

/* Lights and stone benches */

const buildProps = (builder: AttractionBuilder) => {
  brazierSpots.forEach(({ x, z }) => {
    addTripod(builder, [x, 0, z], 1.15);
  });
  /* Tripods glowing either side of the doorway, inside */
  [-1, 1].forEach((side) => {
    addTripod(builder, [side * 1.3, floorHeight, cella.maxZ - 0.6], 0.85);
  });
  addTripod(
    builder,
    [innerTripodAt.x, floorHeight, innerTripodAt.z],
    innerTripodTop - floorHeight,
    false,
  );
  oliveSpots.forEach((spot, index) => {
    addOliveTree(builder, spot, index % 2 === 0 ? 1.1 : 0.95);
  });
  /* Marble benches for watching the sunset over the lava */
  [
    { x: 5.0, z: 7.4, turn: Math.PI + 0.3 },
    { x: -6.4, z: 4.2, turn: Math.PI / 2 + 0.2 },
  ].forEach(({ x, z, turn }) => {
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    [-0.45, 0.45].forEach((along) => {
      builder.box(
        "matte",
        shade(marble, 0.95),
        [0.22, 0.38, 0.4],
        [x + along * cos, 0.19, z - along * sin],
        [0, turn, 0],
      );
    });
    builder.box("matte", marble, [1.3, 0.1, 0.48], [x, 0.43, z], [0, turn, 0]);
  });
  addAmphora(builder, [3.7, 0, 5.4], 0.9);
  addAmphora(builder, [-5.6, 0, -2.6], 0.85);
  if (builder.isFar) {
    return;
  }
  /* A basalt lump or two, from the volcano */
  [
    [7.2, 2.4, 0.45],
    [-7.4, -2.6, 0.4],
    [2.4, -7.6, 0.5],
    [-2.8, -7.4, 0.35],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? basalt : shade(basalt, 1.2),
      size,
      [x, size * 0.35, z],
      [1.2, 0.7, 1],
      6,
    );
  });
};

/* Goats and doves */

const buildGoat = (builder: AttractionBuilder) => {
  const coat = "#e9e2d4";
  builder.box("matte", coat, [0.3, 0.3, 0.6], [0, 0.5, 0]);
  builder.box("matte", coat, [0.18, 0.2, 0.26], [0, 0.72, 0.34], [-0.4, 0, 0]);
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      builder.box(
        "matte",
        "#5a4a3a",
        [0.06, 0.36, 0.06],
        [side * 0.1, 0.18, end * 0.22],
      );
    });
  });
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#6b5d4c",
      [side * 0.05, 0.84, 0.32],
      [side * 0.08, 0.98, 0.22],
      0.04,
      5,
    );
    builder.box(
      "matte",
      shade(coat, 0.9),
      [0.1, 0.04, 0.06],
      [side * 0.12, 0.8, 0.3],
    );
    builder.sphere(
      "paint",
      "#2a2420",
      0.02,
      [side * 0.07, 0.79, 0.44],
      [1, 1, 1],
      6,
    );
  });
  builder.lathe(
    "matte",
    shade(coat, 0.85),
    [
      [0.04, 0],
      [0.001, -0.1],
    ],
    [0, 0.62, 0.44],
    "y",
    6,
  );
  builder.box("matte", coat, [0.05, 0.12, 0.05], [0, 0.65, -0.32], [0.6, 0, 0]);
};

const buildDove = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#f6f3ec", 0.1, [0, 0, 0], [0.8, 0.7, 1.5], 8);
  builder.sphere("matte", "#f6f3ec", 0.06, [0, 0.05, 0.13], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#ece7dc",
      [0.26, 0.02, 0.12],
      [side * 0.16, 0.03, 0],
      [0, 0, side * 0.3],
    );
  });
  if (!builder.isFar) {
    builder.lathe(
      "paint",
      "#e3a33a",
      [
        [0.015, 0],
        [0.001, 0.04],
      ],
      [0, 0.04, 0.18],
      "z",
      5,
    );
  }
};

/* Where the Character can stand: the steps all round and the floor */

const templeDeck: Deck = ({ x, z }) => {
  const outside = Math.max(
    x - stylobate.maxX,
    stylobate.minX - x,
    z - stylobate.maxZ,
    stylobate.minZ - z,
  );
  if (outside <= 0) {
    return { height: floorHeight, kind: "ground" };
  }
  const step = Math.ceil(outside / stepTread);
  if (step > 2) {
    return undefined;
  }
  return { height: floorHeight - step * 0.2, kind: "ground" };
};

export const greekTempleModel: NewLandAttractionModel = {
  kind: "greek-temple",
  islandId: "ember-isle",
  name: "Greek Temple",
  fact: "The Ancient Greeks built temples as homes for statues of their gods. The Parthenon in Athens was built for the goddess Athena about 2,500 years ago, with plain Doric columns all round. Its white marble was once painted in bright reds, blues and gold!",
  curriculumLink:
    "History, Key Stage 2: Ancient Greece. Greek life and achievements and their influence on the western world, through a Doric temple to Athena.",
  footprint: 10,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildGrounds(builder);
    buildCrepidoma(builder);
    buildColumns(builder);
    buildCella(builder);
    buildEntablature(builder);
    buildRoof(builder);
    buildAthena(builder);
    buildAltar(builder);
    buildOwlPillar(builder);
    buildProps(builder);
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "athena's owl",
      pivot: [owlPillarAt.x, owlPillarTop, owlPillarAt.z],
      build: buildOwl,
      motion: { kind: "nod", axis: "y", reach: 5, amplitude: 0.8, period: 2.2 },
    },
    {
      name: "altar fire",
      pivot: [altarAt.x, altarTop + 0.08, altarAt.z],
      build: (builder) => {
        buildFlame(builder, 1.3);
      },
      motion: { kind: "flicker", period: 0.8 },
    },
    {
      name: "sacred flame",
      pivot: [innerTripodAt.x, innerTripodTop, innerTripodAt.z],
      build: (builder) => {
        buildFlame(builder, 1);
      },
      motion: { kind: "wake", reach: 3.5 },
    },
  ],
  wanderers: [
    {
      name: "goats",
      build: buildGoat,
      count: 3,
      centre: { x: 6.5, z: 1.0 },
      radius: 1.4,
      speed: 0.35,
    },
    {
      name: "doves",
      build: buildDove,
      count: 3,
      centre: { x: 0, z: -1 },
      radius: 4,
      speed: 1.6,
      height: 6,
      bob: 0.2,
    },
  ],
  decks: [templeDeck],
  blockers: [
    { x: altarAt.x, z: altarAt.z, radius: 0.75 },
    { x: owlPillarAt.x, z: owlPillarAt.z, radius: 0.4 },
    ...brazierSpots.map(({ x, z }) => ({ x, z, radius: 0.35 })),
    ...oliveSpots.map(([x, , z]) => ({ x, z, radius: 0.4 })),
  ] satisfies LocalBlocker[],
  tune: [62, 66, 69, 74, 72, 69, 66, 64, 62],
  play: {
    label: "Light the altar fire",
    news: "Whoosh! The altar fire leapt up bright, Athena's bronze owl turned its head to watch, and a lyre tune rang out across the marble steps.",
    tune: [62, 66, 69, 74],
  },
};
