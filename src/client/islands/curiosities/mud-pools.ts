import {
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ashGround = "#655850";
const crustPale = "#cfc6b8";
const crustGrey = "#a49b8e";
const sulphur = "#e2c443";
const ochre = "#c08a3e";
const mud = "#7d746c";
const mudDark = "#5f5751";
const mudWet = "#948a80";
const boards = "#8b6d4e";
const warnYellow = "#f2c230";
const signColour = "#6b4a2f";

const pools = [
  { x: -1.35, z: -1.2, radius: 1.35 },
  { x: 1.75, z: -1.55, radius: 0.9 },
  { x: 1.45, z: 1.05, radius: 0.7 },
  { x: -3.0, z: 1.35, radius: 0.5 },
];
const mudLevel = 0.12;
const boardHeight = 0.25;
const walk = { minX: -0.85, maxX: 0.05, minZ: 1.6, maxZ: 3.7 };
const platform = { minX: -1.45, maxX: 0.2, minZ: 0.85, maxZ: 1.6 };
const trumpetAt: Triple = [-1.2, boardHeight, 1.05];

const buildPools = (builder: AttractionBuilder) => {
  pools.forEach(({ x, z, radius }, index) => {
    const segments = builder.isFar ? 10 : index === 0 ? 30 : 22;
    /* A crusty raised rim of dried mud and minerals */
    builder.lathe(
      "matte",
      index % 2 === 0 ? crustPale : crustGrey,
      [
        [radius - 0.05, mudLevel - 0.02],
        [radius + 0.05, 0.24],
        [radius + 0.22, 0.22],
        [radius + 0.5, 0.0],
      ],
      [x, 0, z],
      "y",
      segments,
    );
    builder.cylinder("paint", mud, {
      radius: radius + 0.02,
      length: 0.04,
      at: [x, mudLevel, z],
      segments,
    });
    if (builder.isFar) {
      return;
    }
    /* Rings of darker, wetter mud spreading from the middle */
    [0.35, 0.65].forEach((share, ring) => {
      builder.torus(
        "paint",
        ring === 0 ? mudDark : mudWet,
        radius * share,
        0.025,
        [x, mudLevel + 0.02, z],
        "y",
        14,
      );
    });
    /* Yellow sulphur and orange iron stains on the rim */
    [0.6, 2.3, 4.1].forEach((angle, stain) => {
      builder.sphere(
        "matte",
        stain === 1 ? ochre : sulphur,
        0.12 + (index % 2) * 0.04,
        [
          x + Math.sin(angle + index) * (radius + 0.15),
          0.2,
          z + Math.cos(angle + index) * (radius + 0.15),
        ],
        [1.4, 0.3, 1],
        7,
      );
    });
    /* Splats of mud flung over the rim */
    [1.4, 3.3, 5.2].forEach((angle) => {
      builder.cylinder("paint", mudDark, {
        radius: 0.09,
        length: 0.02,
        at: [
          x + Math.sin(angle - index) * (radius + 0.65),
          0.01,
          z + Math.cos(angle - index) * (radius + 0.65),
        ],
        segments: 8,
      });
    });
  });
};

const buildBoardwalk = (builder: AttractionBuilder) => {
  [walk, platform].forEach(({ minX, maxX, minZ, maxZ }) => {
    builder.box(
      "matte",
      boards,
      [maxX - minX, 0.08, maxZ - minZ],
      [(minX + maxX) / 2, boardHeight - 0.04, (minZ + maxZ) / 2],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Planks across the walk, and the posts it stands on */
  for (let plank = 0; plank < 13; plank++) {
    const z = walk.minZ + 0.1 + plank * ((walk.maxZ - walk.minZ - 0.2) / 12);
    builder.box(
      "matte",
      shade(boards, plank % 2 === 0 ? 1.1 : 0.92),
      [walk.maxX - walk.minX - 0.04, 0.02, 0.17],
      [(walk.minX + walk.maxX) / 2, boardHeight + 0.01, z],
    );
  }
  for (let plank = 0; plank < 9; plank++) {
    const x =
      platform.minX +
      0.11 +
      plank * ((platform.maxX - platform.minX - 0.22) / 8);
    builder.box(
      "matte",
      shade(boards, plank % 2 === 0 ? 1.1 : 0.92),
      [0.2, 0.02, platform.maxZ - platform.minZ - 0.04],
      [x, boardHeight + 0.01, (platform.minZ + platform.maxZ) / 2],
    );
  }
  /* Railings along the walk's sides and round the platform */
  const rails: [number, number, number, number][] = [
    [walk.minX, walk.maxZ - 0.3, walk.minX, platform.maxZ],
    [walk.maxX, walk.maxZ - 0.3, walk.maxX, platform.maxZ],
    [platform.minX, platform.maxZ, platform.minX, platform.minZ],
    [platform.minX, platform.minZ, platform.maxX, platform.minZ],
    [platform.maxX, platform.minZ, platform.maxX, platform.maxZ],
  ];
  rails.forEach(([fromX, fromZ, toX, toZ]) => {
    const length = Math.hypot(toX - fromX, toZ - fromZ);
    const posts = Math.max(1, Math.round(length / 0.7));
    for (let post = 0; post <= posts; post++) {
      const share = post / posts;
      builder.box(
        "matte",
        palette.darkTimber,
        [0.06, 0.7, 0.06],
        [
          fromX + (toX - fromX) * share,
          boardHeight + 0.35,
          fromZ + (toZ - fromZ) * share,
        ],
      );
    }
    builder.bar(
      "matte",
      palette.timber,
      [fromX, boardHeight + 0.68, fromZ],
      [toX, boardHeight + 0.68, toZ],
      0.06,
      5,
    );
  });
};

/** A brass ear trumpet on a stand, for listening to the mud. */
const buildEarTrumpet = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const [x, y, z] = trumpetAt;
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.03,
    length: 0.85,
    at: [x, y + 0.42, z],
    segments: 8,
  });
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0.03, 0],
      [0.04, -0.2],
      [0.08, -0.36],
      [0.2, -0.46],
      [0.22, -0.48],
    ],
    [x, y + 0.85, z],
    "z",
    16,
  );
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0.22, -0.48],
      [0.19, -0.47],
      [0.07, -0.38],
      [0.03, -0.22],
      [0.025, 0.0],
    ],
    [x, y + 0.85, z],
    "z",
    16,
  );
  builder.bar(
    "metal",
    palette.brass,
    [x, y + 0.85, z],
    [x, y + 0.98, z + 0.12],
    0.04,
    6,
  );
};

const buildWarningSigns = (builder: AttractionBuilder) => {
  [
    { x: 3.05, z: -0.2, turn: -0.9 },
    { x: -3.3, z: -0.9, turn: 1.0 },
    { x: 0.4, z: -3.35, turn: 0 },
  ].forEach(({ x, z, turn }) => {
    builder.box("matte", palette.darkTimber, [0.07, 1.0, 0.07], [x, 0.5, z]);
    if (builder.isFar) {
      return;
    }
    const out = (distance: number): Triple => [
      x + Math.sin(turn) * distance,
      0,
      z + Math.cos(turn) * distance,
    ];
    const [faceX, , faceZ] = out(0.05);
    builder.box(
      "paint",
      warnYellow,
      [0.42, 0.42, 0.03],
      [faceX, 1.0, faceZ],
      [0, turn, Math.PI / 4],
    );
    builder.box(
      "paint",
      palette.black,
      [0.48, 0.48, 0.02],
      [x + Math.sin(turn) * 0.035, 1.0, z + Math.cos(turn) * 0.035],
      [0, turn, Math.PI / 4],
    );
    const [markX, , markZ] = out(0.07);
    builder.box(
      "paint",
      palette.black,
      [0.05, 0.18, 0.01],
      [markX, 1.04, markZ],
      [0, turn, 0],
    );
    builder.box(
      "paint",
      palette.black,
      [0.05, 0.05, 0.01],
      [markX, 0.9, markZ],
      [0, turn, 0],
    );
  });
};

const buildGround = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* Cracked, dried mud plates round the pools */
  [
    [-3.2, -2.6],
    [3.4, 1.9],
    [-2.0, 2.8],
    [2.9, -2.9],
    [3.6, -1.2],
  ].forEach(([x, z], index) => {
    for (let plate = 0; plate < 5; plate++) {
      const angle = plate * 1.26 + index;
      builder.cylinder(
        "matte",
        plate % 2 === 0 ? crustGrey : shade(crustGrey, 0.9),
        {
          radius: 0.24,
          length: 0.03,
          at: [x + Math.sin(angle) * 0.32, 0.015, z + Math.cos(angle) * 0.32],
          segments: 6,
        },
      );
    }
  });
  /* A thermometer stuck in the mud, reading very hot */
  const poolX = pools[1].x;
  const poolZ = pools[1].z;
  builder.bar(
    "glass",
    "#e8f4f8",
    [poolX - 0.45, 0.05, poolZ + 0.6],
    [poolX - 0.3, 0.75, poolZ + 0.42],
    0.06,
    8,
  );
  builder.bar(
    "glow",
    "#e0402a",
    [poolX - 0.45, 0.05, poolZ + 0.6],
    [poolX - 0.34, 0.6, poolZ + 0.47],
    0.03,
    6,
  );
  builder.sphere(
    "glow",
    "#e0402a",
    0.05,
    [poolX - 0.45, 0.08, poolZ + 0.6],
    [1, 1, 1],
    8,
  );
  /* Scattered sulphur-crusted rocks */
  [
    [-3.6, 0.0, 0.3],
    [3.8, 0.6, 0.25],
    [0.0, -3.0, 0.28],
    [-1.8, -3.3, 0.22],
    [2.6, 2.7, 0.2],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#4a403b" : "#5e524b",
      size,
      [x, size * 0.45, z],
      [1.2, 0.8, 1],
      8,
    );
    builder.sphere(
      "matte",
      sulphur,
      size * 0.4,
      [x + size * 0.3, size * 0.8, z],
      [1.2, 0.4, 1],
      6,
    );
  });
};

/** One big mud bubble that swells up out of the pool. */
const buildBigBubble = (builder: AttractionBuilder) => {
  builder.sphere("paint", mudWet, 0.32, [0, 0, 0], [1, 0.62, 1], 12);
  builder.sphere("glass", "#c9c1b6", 0.06, [0.1, 0.17, 0.08], [1, 0.5, 1], 6);
  builder.torus("paint", mudDark, 0.34, 0.03, [0, -0.02, 0], "y", 12);
};

/** A cluster of small bubbles bobbing together. */
const buildBubbles =
  (spots: readonly (readonly [number, number, number])[]) =>
  (builder: AttractionBuilder) => {
    spots.forEach(([x, z, size]) => {
      builder.sphere("paint", mudWet, size, [x, 0, z], [1, 0.7, 1], 8);
      builder.torus(
        "paint",
        mudDark,
        size * 1.15,
        0.015,
        [x, -0.01, z],
        "y",
        10,
      );
    });
  };

export const mudPoolsModel: CuriosityModel = {
  kind: "mud-pools",
  islandId: "ember-isle",
  name: "Bubbling Mud Pools",
  fact: "Mud pools form where hot volcanic gases rise up through wet, soft ground. The heat and gases break the rock down into clay, which mixes with rainwater to make thick, hot mud. Bubbles of steam and gas push up through the mud and burst with a loud plop. The rotten-egg smell comes from a gas called hydrogen sulphide.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of physical geography, including volcanoes and earthquakes.",
  footprint: 5.2,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: 1.6, z: 3.8 },
  build: (builder) => {
    buildPools(builder);
    buildBoardwalk(builder);
    buildEarTrumpet(builder);
    buildWarningSigns(builder);
    buildGround(builder);
    addSignBoard(builder, [1.6, 0, 3.8], signColour);
  },
  moving: [
    {
      name: "big bubble",
      pivot: [pools[0].x + 0.2, mudLevel - 0.22, pools[0].z - 0.1],
      build: buildBigBubble,
      motion: { kind: "rise", reach: 8, height: 0.24, period: 1.1 },
    },
    {
      name: "pool bubbles",
      pivot: [pools[0].x, mudLevel + 0.02, pools[0].z],
      build: buildBubbles([
        [-0.6, 0.4, 0.1],
        [0.5, 0.6, 0.08],
        [-0.3, -0.7, 0.12],
        [0.75, -0.3, 0.07],
      ]),
      motion: { kind: "bob", height: 0.04, period: 0.9 },
    },
    {
      name: "small pool bubbles",
      pivot: [pools[1].x, mudLevel + 0.02, pools[1].z],
      build: buildBubbles([
        [0, 0, 0.16],
        [0.4, 0.25, 0.08],
        [-0.3, 0.35, 0.07],
        [-0.25, -0.3, 0.1],
      ]),
      motion: { kind: "bob", height: 0.05, period: 1.3, phase: 2.1 },
    },
    {
      name: "mud pot bubble",
      pivot: [pools[3].x, mudLevel - 0.15, pools[3].z],
      build: buildBubbles([[0, 0, 0.18]]),
      motion: { kind: "rise", reach: 6, height: 0.16, period: 0.7, phase: 1.3 },
    },
  ],
  smoke: [
    {
      at: [pools[0].x, mudLevel + 0.2, pools[0].z],
      colour: "#e2e0dc",
      puffs: 7,
      size: 0.28,
      rise: 2.0,
      spread: 0.9,
    },
  ],
  decks: [
    buildFlatDeck(walk, boardHeight, "bridge"),
    buildFlatDeck(platform, boardHeight, "bridge"),
  ],
  blockers: [
    ...pools.map(({ x, z, radius }) => ({ x, z, radius: radius + 0.35 })),
    { x: 3.05, z: -0.2, radius: 0.12 },
    { x: -3.3, z: -0.9, radius: 0.12 },
    { x: 0.4, z: -3.35, radius: 0.12 },
  ] satisfies LocalBlocker[],
  tune: [48, 52, 47, 55],
  play: {
    label: "Listen to the bubbles",
    news: "Bloop... blorp... PLOP! You held the ear trumpet to the mud and heard the bubbles gurgling up from deep underground.",
  },
};
