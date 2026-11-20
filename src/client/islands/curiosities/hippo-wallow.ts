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

const muddyWater = "#7d6a44";
const mud = "#5e4630";
const wetMud = "#4b3826";
const hippoGrey = "#7d6b78";
const hippoBelly = "#a4888c";
const hippoPink = "#d89a9a";
const tusk = "#f2ecd8";
const egretWhite = "#f6f4ee";
const beakYellow = "#e8b83a";
const papyrus = "#6e9a3a";
const grassGreen = "#7aa83a";
const signColour = "#7a5a2a";

/* The wallow: two pools of muddy water, each on a bed of mud */
const pools = [
  { x: 0.3, z: -0.9, radius: 2.6 },
  { x: -1.2, z: -0.2, radius: 1.6 },
];
const waterLevel = 0.09;

const swimmers = [
  { x: 0.9, z: -0.5, turn: 0.5, phase: 0 },
  { x: -0.7, z: -1.7, turn: -0.4, phase: 1.9 },
];
const bankHippo = { x: -2.7, z: 1.75 };
const jawHinge: Triple = [bankHippo.x + 0.95, 0.68, bankHippo.z];
const jawOpen = 0.32;

/** Turns a point about the z axis through a hinge, for the open jaw. */
const swingAboutHinge = (point: Triple, angle: number): Triple => [
  point[0] * Math.cos(angle) - point[1] * Math.sin(angle),
  point[0] * Math.sin(angle) + point[1] * Math.cos(angle),
  point[2],
];

const buildWallow = (builder: AttractionBuilder) => {
  const segments = builder.segments(30, 10);
  pools.forEach(({ x, z, radius }) => {
    builder.cylinder("matte", wetMud, {
      radius: radius + 0.55,
      length: 0.04,
      at: [x, 0.02, z],
      segments,
    });
  });
  pools.forEach(({ x, z, radius }) => {
    builder.cylinder("water", muddyWater, {
      radius,
      length: 0.05,
      at: [x, waterLevel - 0.025, z],
      segments,
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Hoof-churned mud round the edge, and ripples */
  for (let lump = 0; lump < 12; lump++) {
    const angle = (lump / 12) * Math.PI * 2 + 0.4;
    const { x, z, radius } = pools[lump % 3 === 0 ? 1 : 0];
    builder.sphere(
      "matte",
      shade(mud, lump % 2 === 0 ? 0.9 : 1.12),
      0.16 + (lump % 3) * 0.04,
      [
        x + Math.sin(angle) * (radius + 0.25),
        0.05,
        z + Math.cos(angle) * (radius + 0.25),
      ],
      [1.4, 0.4, 1],
      6,
    );
  }
  swimmers.forEach(({ x, z }) => {
    builder.torus(
      "water",
      shade(muddyWater, 1.3),
      0.6,
      0.02,
      [x, waterLevel + 0.01, z],
      "y",
      16,
    );
  });
  /* Papyrus along the back, with its mop-headed tops */
  [
    [-2.4, -2.5],
    [2.6, -2.9],
    [3.4, -0.9],
  ].forEach(([x, z]) => {
    for (let stem = 0; stem < 5; stem++) {
      const lean = (stem - 2) * 0.12;
      const top: Triple = [
        x + stem * 0.08 + lean,
        1.3 + (stem % 2) * 0.3,
        z + lean * 0.4,
      ];
      builder.bar("matte", papyrus, [x + stem * 0.08, 0, z], top, 0.035, 4);
      builder.sphere(
        "matte",
        shade(papyrus, 1.15),
        0.14,
        top,
        [1.2, 0.6, 1.2],
        6,
      );
    }
  });
  /* Grass on the bank: the hippos' dinner */
  [
    [-1.4, 2.6],
    [-3.8, 0.4],
    [1.9, 2.3],
    [-0.4, 2.9],
  ].forEach(([x, z]) => {
    for (let blade = 0; blade < 6; blade++) {
      const turn = blade * 1.05;
      builder.bar(
        "matte",
        blade % 2 === 0 ? grassGreen : shade(grassGreen, 0.85),
        [x, 0, z],
        [
          x + Math.sin(turn) * 0.2,
          0.4 + (blade % 3) * 0.08,
          z + Math.cos(turn) * 0.2,
        ],
        0.03,
        3,
      );
    }
  });
};

/** A hippo's head, its eyes, ears and nostrils high on top for peeping out. */
const addHippoHead = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  size = 1,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + (x * Math.cos(turn) + z * Math.sin(turn)) * size,
    at[1] + y * size,
    at[2] + (-x * Math.sin(turn) + z * Math.cos(turn)) * size,
  ];
  builder.sphere(
    "matte",
    hippoGrey,
    0.32 * size,
    place(0, 0, 0),
    [1, 0.85, 1.05],
    14,
  );
  builder.sphere(
    "matte",
    hippoGrey,
    0.3 * size,
    place(0, -0.06, 0.32),
    [1.25, 0.8, 0.95],
    14,
  );
  builder.sphere(
    "matte",
    hippoPink,
    0.22 * size,
    place(0, -0.16, 0.44),
    [1.25, 0.5, 0.75],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      hippoGrey,
      0.09 * size,
      place(side * 0.17, 0.2, 0.08),
      [1, 0.8, 1],
      8,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.035 * size,
      place(side * 0.19, 0.23, 0.14),
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "matte",
      hippoPink,
      0.06 * size,
      place(side * 0.18, 0.28, -0.14),
      [0.6, 1, 0.5],
      6,
    );
    builder.sphere(
      "matte",
      shade(hippoGrey, 1.1),
      0.07 * size,
      place(side * 0.12, 0.13, 0.5),
      [1, 0.7, 1],
      7,
    );
    builder.sphere(
      "paint",
      "#3a2a30",
      0.025 * size,
      place(side * 0.12, 0.18, 0.52),
      [1.2, 0.6, 1],
      5,
    );
  });
};

const buildSwimmerHead = (turn: number) => (builder: AttractionBuilder) => {
  addHippoHead(builder, [0, 0, 0], turn);
};

const buildSwimmers = (builder: AttractionBuilder) => {
  swimmers.forEach(({ x, z, turn }, index) => {
    /* The broad back just breaking the surface behind the head */
    const back: Triple = [
      x - Math.sin(turn) * 0.75,
      waterLevel - 0.18,
      z - Math.cos(turn) * 0.75,
    ];
    builder.sphere(
      "matte",
      hippoGrey,
      0.6,
      back,
      [0.9, 0.5, 1.3],
      builder.isFar ? 8 : 14,
    );
    if (builder.isFar) {
      return;
    }
    if (index === 0) {
      addEgret(builder, [back[0], back[1] + 0.29, back[2]], turn + 1.2, 0.85);
    }
  });
};

/** A cattle egret, the white bird that rides on hippos and eats the flies. */
const addEgret = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  size = 1,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + (x * Math.cos(turn) + z * Math.sin(turn)) * size,
    at[1] + y * size,
    at[2] + (-x * Math.sin(turn) + z * Math.cos(turn)) * size,
  ];
  [-0.04, 0.04].forEach((side) => {
    builder.bar(
      "matte",
      "#5a5a3a",
      place(side, 0, 0),
      place(side, 0.2, -0.02),
      0.02 * size,
      3,
    );
  });
  builder.sphere(
    "matte",
    egretWhite,
    0.1 * size,
    place(0, 0.28, -0.02),
    [0.8, 0.85, 1.4],
    8,
  );
  builder.sphere(
    "matte",
    egretWhite,
    0.06 * size,
    place(0, 0.42, 0.1),
    [1, 1, 1.1],
    7,
  );
  builder.sphere(
    "matte",
    "#e8c88a",
    0.05 * size,
    place(0, 0.45, 0.08),
    [1, 0.6, 1],
    5,
  );
  builder.bar(
    "paint",
    beakYellow,
    place(0, 0.41, 0.15),
    place(0, 0.39, 0.27),
    0.025 * size,
    4,
  );
};

const buildBankHippo = (builder: AttractionBuilder) => {
  const { x, z } = bankHippo;
  builder.sphere(
    "matte",
    hippoGrey,
    0.7,
    [x, 0.72, z],
    [1.5, 0.82, 0.9],
    builder.isFar ? 8 : 16,
  );
  if (builder.isFar) {
    builder.sphere(
      "matte",
      hippoGrey,
      0.35,
      [x + 1.1, 0.75, z],
      [1.2, 0.8, 1],
      6,
    );
    return;
  }
  builder.sphere("matte", hippoBelly, 0.55, [x, 0.5, z], [1.6, 0.55, 0.85], 12);
  /* Four short, stout legs */
  [-0.55, 0.55].forEach((along) => {
    [-0.35, 0.35].forEach((across) => {
      builder.cylinder("matte", shade(hippoGrey, 0.92), {
        radius: 0.16,
        radiusEnd: 0.18,
        length: 0.42,
        at: [x + along, 0.21, z + across],
        segments: 10,
      });
      builder.cylinder("matte", shade(hippoGrey, 0.7), {
        radius: 0.17,
        length: 0.04,
        at: [x + along, 0.02, z + across],
        segments: 10,
      });
    });
  });
  builder.bar(
    "matte",
    hippoGrey,
    [x - 0.98, 0.78, z],
    [x - 1.15, 0.6, z],
    0.07,
    5,
  );
  builder.box(
    "matte",
    shade(hippoGrey, 0.75),
    [0.04, 0.1, 0.06],
    [x - 1.16, 0.55, z],
  );
  /* The head and upper jaw, turned to the front */
  const head: Triple = [x + 1.05, 0.78, z];
  builder.sphere("matte", hippoGrey, 0.34, head, [1.1, 0.85, 1.05], 14);
  builder.sphere(
    "matte",
    hippoGrey,
    0.3,
    [head[0] + 0.32, head[1] - 0.02, head[2]],
    [1.0, 0.65, 1.15],
    12,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      hippoGrey,
      0.08,
      [head[0] + 0.08, head[1] + 0.24, head[2] + side * 0.17],
      [1, 0.8, 1],
      7,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.035,
      [head[0] + 0.14, head[1] + 0.26, head[2] + side * 0.19],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "matte",
      hippoPink,
      0.06,
      [head[0] - 0.12, head[1] + 0.3, head[2] + side * 0.16],
      [0.5, 1, 0.6],
      6,
    );
    builder.sphere(
      "paint",
      "#3a2a30",
      0.03,
      [head[0] + 0.5, head[1] + 0.1, head[2] + side * 0.1],
      [1, 0.6, 1.2],
      5,
    );
  });
  addEgret(builder, [x - 0.2, 1.28, z], 0.4, 0.7);
};

/** The lower jaw, with its huge tusks, opening wide in a yawn. */
const buildJaw = (builder: AttractionBuilder) => {
  const point = (x: number, y: number, z: number): Triple =>
    swingAboutHinge([x, y, z], -jawOpen);
  builder.sphere(
    "matte",
    hippoGrey,
    0.26,
    point(0.3, -0.08, 0),
    [1.15, 0.45, 1.1],
    12,
  );
  builder.sphere(
    "matte",
    hippoPink,
    0.2,
    point(0.3, -0.02, 0),
    [1.1, 0.25, 0.95],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", tusk, {
      radius: 0.035,
      radiusEnd: 0.008,
      length: 0.2,
      at: point(0.5, 0.06, side * 0.15),
      segments: 6,
    });
  });
};

/** A food chain on a board: the Sun, then grass, then a hippo. */
const buildFoodChain = (builder: AttractionBuilder) => {
  const at = { x: 2.9, z: 2.6 };
  [-0.5, 0.5].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 1.1, 0.07],
      [at.x + side, 0.55, at.z],
    );
  });
  builder.box(
    "paint",
    palette.cream,
    [1.2, 0.5, 0.05],
    [at.x, 1.05, at.z + 0.03],
  );
  if (builder.isFar) {
    return;
  }
  const face = at.z + 0.065;
  builder.sphere(
    "glow",
    "#ffcf3a",
    0.08,
    [at.x - 0.42, 1.05, face],
    [1, 1, 0.3],
    10,
  );
  [-0.08, 0, 0.08].forEach((offset) => {
    builder.box(
      "paint",
      grassGreen,
      [0.03, 0.18, 0.01],
      [at.x + offset, 1.03, face],
      [0, 0, offset * 3],
    );
  });
  builder.sphere(
    "paint",
    hippoGrey,
    0.1,
    [at.x + 0.42, 1.03, face],
    [1.4, 0.8, 0.3],
    10,
  );
  [-0.22, 0.22].forEach((arrow) => {
    builder.box(
      "paint",
      palette.darkTimber,
      [0.12, 0.02, 0.01],
      [at.x + arrow, 1.05, face],
    );
    builder.box(
      "paint",
      palette.darkTimber,
      [0.05, 0.02, 0.01],
      [at.x + arrow + 0.045, 1.065, face],
      [0, 0, -0.7],
    );
    builder.box(
      "paint",
      palette.darkTimber,
      [0.05, 0.02, 0.01],
      [at.x + arrow + 0.045, 1.035, face],
      [0, 0, 0.7],
    );
  });
};

const buildWalkingEgret = (builder: AttractionBuilder) => {
  addEgret(builder, [0, 0, 0], 0, 1);
};

export const hippoWallowModel: CuriosityModel = {
  kind: "hippo-wallow",
  islandId: "jungle-reach",
  name: "Hippo Wallow",
  fact: "Hippos are herbivores: they eat only plants. At night they leave the water to munch grass, so a food chain goes from the Sun, to grass, to the hippo. By day they wallow in muddy rivers to keep cool. Their eyes, ears and nostrils are on top of their heads, so they can hide under the water and still see, hear and breathe.",
  curriculumLink:
    "Science, Year 4: animals, including humans. Construct and interpret a variety of food chains, identifying producers, predators and prey (herbivores).",
  footprint: 5.2,
  setting: "inland",
  signSpot: { x: 0.6, z: 4.3 },
  build: (builder) => {
    buildWallow(builder);
    buildSwimmers(builder);
    buildBankHippo(builder);
    buildFoodChain(builder);
    addBush(builder, [3.8, 0, 0.9], 0.5, "#2f7a35");
    addBush(builder, [-4.2, 0, -1.4], 0.55, "#246a2c");
    addSignBoard(builder, [0.6, 0, 4.3], signColour);
  },
  moving: [
    ...swimmers.map(({ x, z, turn, phase }): MovingPart => ({
      name: "hippo's head",
      pivot: [x, waterLevel - 0.18, z],
      build: buildSwimmerHead(turn),
      motion: { kind: "rise", reach: 7, height: 0.32, period: 2.2, phase },
    })),
    {
      name: "yawning jaw",
      pivot: jawHinge,
      build: buildJaw,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: jawOpen,
        period: 3,
      },
    },
  ],
  wanderers: [
    {
      name: "cattle egrets",
      build: buildWalkingEgret,
      count: 3,
      centre: { x: 2.0, z: 2.0 },
      radius: 0.6,
      speed: 0.3,
      bob: 0.03,
    },
  ],
  blockers: [
    ...pools.map(({ x, z, radius }): LocalBlocker => ({ x, z, radius })),
    { x: bankHippo.x - 0.4, z: bankHippo.z, radius: 0.75 },
    { x: bankHippo.x + 0.6, z: bankHippo.z, radius: 0.75 },
    { x: 2.9, z: 2.6, radius: 0.35 },
  ],
  play: {
    label: "Wake the hippo",
    news: "Blub, blub! Up popped the hippos' heads, and one gave a giant yawn. Hippos eat grass, so they are herbivores.",
  },
};
