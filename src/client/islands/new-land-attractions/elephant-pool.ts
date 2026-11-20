import {
  addBench,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const hide = "#8e8781";
const hideDark = "#6f6862";
const hideMuddy = "#86705a";
const earPink = "#c9a39a";
const tusk = "#f1ead6";
const mud = "#7a5a3a";
const mudDark = "#5e4329";
const poolWater = "#7e9a74";
const stone = "#a59d8f";
const plank = "#a8774a";
const plankDark = "#7d5534";
const rope = "#cdb68a";
const thatch = "#b38c4c";
const bamboo = "#9cb84a";
const bambooDark = "#6f8f2e";
const leafDeep = "#1f6428";
const leafMid = "#2f8a35";
const leafBright = "#5bb544";
const egretWhite = "#f4f1ea";
const signColour = "#5a6a2a";

/* The watering hole */
const poolAt = { x: 0, z: -1.6 };
const poolRadius = 3.7;

/* The stepping stones across it */
const stones: readonly Triple[] = [
  [-3.1, 0.13, 0.15],
  [-2.2, 0.15, -0.15],
  [-1.25, 0.14, 0.1],
  [-0.3, 0.16, -0.15],
  [0.65, 0.14, 0.05],
  [1.6, 0.15, -0.2],
  [2.5, 0.14, 0.1],
  [3.3, 0.13, -0.05],
];
const hopStart = { x: -4.4, z: 0.4 };
const hopFinish = { x: 4.5, z: 0.2 };

/* The viewing jetty, a step up, reaching over the front of the pool */
const jetty = { minX: -1.7, maxX: 1.7, minZ: 1.25, maxZ: 3.0 };
const jettyTop = 0.3;

/* The elephants */
const mumAt = { x: -1.9, z: -3.0, turn: 0.5 };
const auntAt = { x: 2.1, z: -3.1, turn: -0.6 };
const calfAt: Triple = [-0.4, 0, -2.0];
const shelterAt = { x: 5.8, z: 3.6 };
const signAt = { x: 2.2, z: 9.6 };

/* -------------------------------------------------------------- */
/* Elephants                                                       */
/* -------------------------------------------------------------- */

type Place = (x: number, y: number, z: number) => Triple;

const placer =
  (at: { x: number; z: number; turn: number }, size: number, y = 0): Place =>
  (x, up, z) => [
    at.x + (x * Math.cos(at.turn) + z * Math.sin(at.turn)) * size,
    y + up * size,
    at.z + (-x * Math.sin(at.turn) + z * Math.cos(at.turn)) * size,
  ];

/**
 * An Asian elephant facing local +z: a domed head, small ears, a long
 * trunk and four pillar legs. Its trunk is left off when `hasTrunk` is
 * false, for one that moves on its own.
 */
const addElephant = (
  builder: AttractionBuilder,
  at: { x: number; z: number; turn: number },
  size: number,
  {
    colour = hide,
    hasTrunk = true,
    hasEars = true,
    isSmall = false,
  }: {
    colour?: string;
    hasTrunk?: boolean;
    hasEars?: boolean;
    isSmall?: boolean;
  } = {},
) => {
  const place = placer(at, size);
  const segments = builder.isFar ? 7 : isSmall ? 9 : 14;
  const s = size;
  /* Body and rump */
  builder.sphere(
    "matte",
    colour,
    0.85 * s,
    place(0, 1.55, -0.1),
    [0.95, 0.85, 1.35],
    segments,
  );
  builder.sphere(
    "matte",
    colour,
    0.62 * s,
    place(0, 1.55, -0.85),
    [1.1, 1.05, 0.9],
    builder.isFar ? 6 : isSmall ? 8 : 12,
  );
  /* Pillar legs, with toenails */
  [-1, 1].forEach((side) => {
    [-0.65, 0.55].forEach((along) => {
      builder.cylinder("matte", shade(colour, 0.95), {
        radius: 0.24 * s,
        radiusEnd: 0.2 * s,
        length: 1.2 * s,
        at: place(side * 0.42, 0.6, along),
        segments: builder.isFar || isSmall ? 6 : 10,
      });
      if (!builder.isFar && !isSmall) {
        builder.sphere(
          "matte",
          tusk,
          0.05 * s,
          place(side * 0.42, 0.06, along + 0.22),
          [1.3, 0.6, 0.8],
          5,
        );
      }
    });
  });
  /* The domed head with its two bumps */
  const head = place(0, 2.0, 1.05);
  builder.sphere("matte", colour, 0.52 * s, head, [0.95, 1.05, 0.95], segments);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      colour,
      0.24 * s,
      place(side * 0.16, 2.42, 1.0),
      [1, 1, 1],
      isSmall ? 6 : 10,
    );
    /* Small eyes, with long lashes */
    builder.sphere(
      "paint",
      palette.black,
      0.04 * s,
      place(side * 0.36, 2.05, 1.38),
      [1, 1, 1],
      5,
    );
    builder.box(
      "matte",
      hideDark,
      [0.08 * s, 0.01 * s, 0.02 * s],
      place(side * 0.38, 2.1, 1.39),
      [0, at.turn, 0],
    );
    if (hasEars) {
      /* The small rounded ears of an Asian elephant */
      builder.sphere(
        "matte",
        colour,
        0.38 * s,
        place(side * 0.5, 1.95, 0.8),
        [0.18, 1.1, 0.9],
        isSmall ? 7 : 10,
      );
      builder.sphere(
        "matte",
        earPink,
        0.3 * s,
        place(side * 0.55, 1.92, 0.8),
        [0.1, 0.9, 0.75],
        isSmall ? 6 : 8,
      );
    }
  });
  /* Wrinkles round the body, and a wispy tail */
  (isSmall ? [] : [0.1, -0.35]).forEach((along) => {
    builder.torus(
      "matte",
      hideDark,
      0.83 * s,
      0.025 * s,
      place(0, 1.55, along),
      "z",
      20,
    );
  });
  builder.bar(
    "matte",
    hideDark,
    place(0, 1.75, -1.4),
    place(0, 0.95, -1.55),
    0.06 * s,
    5,
  );
  builder.sphere(
    "matte",
    palette.black,
    0.07 * s,
    place(0, 0.92, -1.56),
    [0.7, 1.4, 0.7],
    5,
  );
  if (hasTrunk) {
    addTrunk(builder, place, s, colour, 0.4, isSmall ? 6 : 10);
  }
};

/** A trunk hanging from the face, curling up a little at the tip. */
const addTrunk = (
  builder: AttractionBuilder,
  place: Place,
  s: number,
  colour: string,
  curl: number,
  roundness = 10,
) => {
  const points: Triple[] = [
    place(0, 1.85, 1.45),
    place(0, 1.3, 1.62),
    place(0, 0.75, 1.65),
    place(0, 0.38, 1.6 + curl * 0.3),
    place(0, 0.35 + curl * 0.3, 1.85),
  ];
  points.slice(1).forEach((point, index) => {
    builder.bar(
      "matte",
      colour,
      points[index],
      point,
      (0.24 - index * 0.04) * s,
      builder.isFar ? 5 : roundness,
    );
  });
};

/* -------------------------------------------------------------- */
/* The watering hole and its banks                                  */
/* -------------------------------------------------------------- */

const buildPool = (builder: AttractionBuilder) => {
  builder.cylinder("matte", mud, {
    radius: poolRadius + 0.9,
    length: 0.03,
    at: [poolAt.x, 0.015, poolAt.z],
    segments: builder.segments(32, 12),
  });
  builder.cylinder("water", poolWater, {
    radius: poolRadius,
    length: 0.05,
    at: [poolAt.x, 0.05, poolAt.z],
    segments: builder.segments(36, 14),
  });
  /* The stepping stones */
  stones.forEach(([x, top, z], index) => {
    builder.cylinder("matte", index % 2 === 0 ? stone : shade(stone, 0.9), {
      radius: 0.33,
      radiusEnd: 0.38,
      length: top,
      at: [x, top / 2, z],
      segments: builder.isFar ? 6 : 12,
    });
  });
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "matte",
    mudDark,
    poolRadius + 0.05,
    0.1,
    [poolAt.x, 0.04, poolAt.z],
    "y",
    36,
  );
  /* Footprints in the mud, and splashes round the stones */
  for (let print = 0; print < 10; print++) {
    const angle = 1.0 + print * 0.42;
    builder.cylinder("matte", mudDark, {
      radius: 0.14,
      length: 0.02,
      at: [
        poolAt.x + Math.sin(angle) * (poolRadius + 0.5),
        0.035,
        poolAt.z + Math.cos(angle) * (poolRadius + 0.5),
      ],
      segments: 8,
    });
  }
  stones.forEach(([x, , z], index) => {
    if (index % 2 === 0) {
      builder.torus("water", palette.white, 0.42, 0.025, [x, 0.07, z], "y", 12);
    }
  });
  /* Reeds and lotus on the far side */
  for (let clump = 0; clump < 6; clump++) {
    const angle = 2.3 + clump * 0.33;
    const x = poolAt.x + Math.sin(angle) * (poolRadius - 0.2);
    const z = poolAt.z + Math.cos(angle) * (poolRadius - 0.2);
    for (let stem = 0; stem < 4; stem++) {
      builder.bar(
        "matte",
        stem % 2 === 0 ? "#6f9a3a" : "#557d2c",
        [x + stem * 0.07 - 0.1, 0, z],
        [x + stem * 0.1 - 0.15, 0.8 + (stem % 3) * 0.15, z + (stem % 2) * 0.12],
        0.03,
        4,
      );
    }
  }
  [
    [1.2, -0.9],
    [-2.6, -1.0],
    [0.4, -4.4],
  ].forEach(([x, z], index) => {
    builder.cylinder("paint", leafBright, {
      radius: 0.24,
      length: 0.02,
      at: [x, 0.09, z],
      segments: 10,
    });
    if (index !== 1) {
      builder.sphere("paint", "#f2a6c8", 0.08, [x, 0.15, z], [1, 0.8, 1], 6);
    }
  });
};

const buildJetty = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = jetty;
  const boards = builder.isFar ? 1 : 10;
  for (let board = 0; board < boards; board++) {
    const depth = (maxZ - minZ) / boards;
    builder.box(
      "matte",
      board % 2 === 0 ? plank : shade(plank, 0.92),
      [maxX - minX, 0.08, depth - 0.02],
      [(minX + maxX) / 2, jettyTop - 0.04, minZ + depth * (board + 0.5)],
    );
  }
  /* Posts into the water, and a rope rail round the pool side */
  const posts: [number, number][] = [
    [minX, minZ],
    [0, minZ],
    [maxX, minZ],
    [minX, (minZ + maxZ) / 2],
    [maxX, (minZ + maxZ) / 2],
  ];
  posts.forEach(([x, z]) => {
    builder.cylinder("matte", plankDark, {
      radius: 0.08,
      length: 1.3,
      at: [x, 0.6, z],
      segments: builder.isFar ? 4 : 7,
    });
  });
  builder.box(
    "matte",
    plankDark,
    [maxX - minX, jettyTop - 0.08, 0.1],
    [(minX + maxX) / 2, (jettyTop - 0.08) / 2, maxZ],
  );
  if (builder.isFar) {
    return;
  }
  (
    [
      [minX, minZ, maxX, minZ],
      [minX, minZ, minX, (minZ + maxZ) / 2],
      [maxX, minZ, maxX, (minZ + maxZ) / 2],
    ] as const
  ).forEach(([ax, az, bx, bz]) => {
    [0.65, 1.15].forEach((up) => {
      builder.bar("matte", rope, [ax, up, az], [bx, up, bz], 0.04, 5);
    });
  });
  /* A telescope on a stand, pointed at the elephants */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.03,
    length: 0.9,
    at: [0.9, jettyTop + 0.45, minZ + 0.3],
    segments: 6,
  });
  builder.cylinder("paint", palette.brass, {
    radius: 0.06,
    radiusEnd: 0.045,
    length: 0.4,
    at: [0.9, jettyTop + 0.95, minZ + 0.28],
    axis: "z",
    segments: 10,
  });
};

const buildShelter = (builder: AttractionBuilder) => {
  const { x, z } = shelterAt;
  [-1, 1].forEach((alongX) => {
    [-1, 1].forEach((alongZ) => {
      builder.cylinder("matte", plankDark, {
        radius: 0.09,
        length: 2.3,
        at: [x + alongX * 1.1, 1.15, z + alongZ * 0.9],
        segments: builder.isFar ? 4 : 7,
      });
    });
  });
  builder.lathe(
    "matte",
    thatch,
    [
      [1.9, 0],
      [1.75, 0.12],
      [0.1, 1.2],
      [0, 1.25],
    ],
    [x, 2.25, z],
    "y",
    builder.isFar ? 6 : 10,
  );
  if (builder.isFar) {
    return;
  }
  addBench(builder, [x, 0, z + 0.3], 0, plank);
  /* A board: how elephants talk, with sound waves rippling out */
  builder.box(
    "paint",
    palette.cream,
    [0.9, 0.55, 0.04],
    [x - 1.12, 1.4, z],
    [0, Math.PI / 2, 0],
  );
  [0.08, 0.15, 0.22].forEach((radius) => {
    builder.torus(
      "paint",
      hideDark,
      radius,
      0.012,
      [x - 1.09, 1.4, z + 0.1],
      "x",
      12,
    );
  });
  builder.sphere(
    "paint",
    hide,
    0.1,
    [x - 1.09, 1.4, z - 0.22],
    [0.3, 1, 1.2],
    8,
  );
};

/** A clump of bamboo, which elephants love to eat. */
const addBamboo = (builder: AttractionBuilder, x: number, z: number) => {
  const canes = builder.isFar ? 3 : 5;
  for (let cane = 0; cane < canes; cane++) {
    const angle = cane * 2.4;
    const height = 3.0 + (cane % 3) * 0.6;
    const foot: Triple = [
      x + Math.sin(angle) * 0.25,
      0,
      z + Math.cos(angle) * 0.25,
    ];
    const top: Triple = [
      foot[0] + Math.sin(angle) * 0.5,
      height,
      foot[2] + Math.cos(angle) * 0.5,
    ];
    builder.bar(
      "matte",
      cane % 2 === 0 ? bamboo : bambooDark,
      foot,
      top,
      0.07,
      builder.isFar ? 4 : 6,
    );
    builder.sphere(
      "matte",
      cane % 2 === 0 ? leafMid : leafBright,
      0.45,
      top,
      [1.3, 0.5, 1.3],
      builder.isFar ? 5 : 7,
    );
  }
};

const buildPlanting = (builder: AttractionBuilder) => {
  /* A great shady fig at the back */
  const fig = { x: -5.6, z: -5.0 };
  builder.cylinder("matte", "#6b5a48", {
    radius: 0.45,
    radiusEnd: 0.3,
    length: 3.8,
    at: [fig.x, 1.9, fig.z],
    segments: builder.isFar ? 6 : 12,
  });
  builder.sphere(
    "matte",
    leafDeep,
    2.4,
    [fig.x, 4.6, fig.z],
    [1.15, 0.65, 1.15],
    builder.isFar ? 8 : 14,
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      leafMid,
      1.5,
      [fig.x + 1.7, 4.2, fig.z + 0.8],
      [1, 0.65, 1],
      10,
    );
    builder.sphere(
      "matte",
      leafBright,
      1.3,
      [fig.x - 1.2, 4.3, fig.z + 1.2],
      [1, 0.65, 1],
      10,
    );
  }
  addBamboo(builder, 6.4, -3.0);
  addBamboo(builder, -6.8, 2.2);
  addBamboo(builder, 4.6, -6.6);
  /* A path from the sign to the jetty */
  builder.box(
    "matte",
    "#b89a6c",
    [1.4, 0.03, 6.4],
    [0.9, 0.02, 6.2],
    [0, -0.15, 0],
  );
  if (builder.isFar) {
    return;
  }
  /* A rack of cut branches and bananas for dinner */
  const rack = { x: -5.4, z: -1.6 };
  [-0.6, 0.6].forEach((dz) => {
    builder.cylinder("matte", plankDark, {
      radius: 0.07,
      length: 1.5,
      at: [rack.x, 0.75, rack.z + dz],
      segments: 6,
    });
  });
  builder.bar(
    "matte",
    plankDark,
    [rack.x, 1.45, rack.z - 0.7],
    [rack.x, 1.45, rack.z + 0.7],
    0.08,
    6,
  );
  for (let branch = 0; branch < 4; branch++) {
    const z = rack.z - 0.45 + branch * 0.3;
    builder.bar(
      "matte",
      bambooDark,
      [rack.x, 1.45, z],
      [rack.x + 0.15, 0.6, z + 0.05],
      0.05,
      4,
    );
    builder.sphere(
      "matte",
      branch % 2 === 0 ? leafMid : leafBright,
      0.22,
      [rack.x + 0.15, 0.7, z],
      [1, 1.3, 0.8],
      7,
    );
  }
  for (let banana = 0; banana < 5; banana++) {
    builder.bar(
      "paint",
      "#f3d23a",
      [rack.x + 0.5 + banana * 0.06, 0.05, rack.z],
      [rack.x + 0.55 + banana * 0.06, 0.08, rack.z + 0.2],
      0.05,
      5,
    );
  }
  /* Grasses round the edge */
  [
    [-4.4, 4.4],
    [4.0, 6.0],
    [-2.8, 7.2],
    [7.4, 0.6],
    [-7.6, -1.6],
  ].forEach(([x, z]) => {
    for (let blade = 0; blade < 6; blade++) {
      const angle = blade * 1.05;
      builder.bar(
        "matte",
        blade % 2 === 0 ? "#8fae4a" : "#6f9a3a",
        [x, 0, z],
        [x + Math.sin(angle) * 0.3, 0.7, z + Math.cos(angle) * 0.3],
        0.04,
        3,
      );
    }
  });
};

/* -------------------------------------------------------------- */
/* Moving parts                                                    */
/* -------------------------------------------------------------- */

const mumSize = 1.05;
const mumPlace = placer(mumAt, mumSize);
const mumTrunkPivot = mumPlace(0, 1.85, 1.45);

const buildMumTrunk = (builder: AttractionBuilder) => {
  /* Built about its root on the face; it rises in a trumpet when you come near */
  const origin = mumTrunkPivot;
  const local: Place = (x, y, z) => {
    const [px, py, pz] = mumPlace(x, y, z);
    return [px - origin[0], py - origin[1], pz - origin[2]];
  };
  addTrunk(builder, local, mumSize, hide, 0.6);
  /* Little tusks, as some Asian elephants have */
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      tusk,
      local(side * 0.15, 1.7, 1.42),
      local(side * 0.17, 1.45, 1.7),
      0.07,
      6,
    );
  });
};

const auntSize = 0.95;
const auntPlace = placer(auntAt, auntSize);

const buildAuntTrunk = (builder: AttractionBuilder) => {
  /* Raised up over her head, ready to spray */
  const points: Triple[] = [
    auntPlace(0, 1.85, 1.45),
    auntPlace(0, 1.9, 1.85),
    auntPlace(0, 2.4, 2.05),
    auntPlace(0, 2.95, 1.95),
    auntPlace(0, 3.25, 1.7),
  ];
  points.slice(1).forEach((point, index) => {
    builder.bar(
      "matte",
      hideMuddy,
      points[index],
      point,
      (0.24 - index * 0.04) * auntSize,
      builder.isFar ? 5 : 10,
    );
  });
};

const sprayAt = auntPlace(0, 3.3, 1.65);

const buildSpray = (builder: AttractionBuilder) => {
  /* A fountain of water, fanning up and back over her back */
  [-0.25, 0, 0.25].forEach((fan) => {
    const tip = auntPlace(fan * 2, 1.4, -1.4);
    const local: Triple = [tip[0] - sprayAt[0], tip[1], tip[2] - sprayAt[2]];
    builder.bar("water", "#cfeef2", [0, 0, 0], local, 0.12, 8);
    builder.sphere("water", palette.white, 0.25, local, [1, 0.7, 1], 8);
  });
};

const earAt = (side: number): Triple => auntPlace(side * 0.5, 1.95, 0.8);

const buildEar = (side: number) => (builder: AttractionBuilder) => {
  const place = (x: number, y: number, z: number): Triple => {
    const [px, py, pz] = auntPlace(x, y, z);
    const [ex, ey, ez] = earAt(side);
    return [px - ex, py - ey, pz - ez];
  };
  builder.sphere(
    "matte",
    hideMuddy,
    0.36 * auntSize,
    place(side * 0.06, 0, -0.25),
    [0.18, 1.1, 0.95],
    builder.isFar ? 6 : 10,
  );
  builder.sphere(
    "matte",
    earPink,
    0.28 * auntSize,
    place(side * 0.1, -0.02, -0.25),
    [0.1, 0.9, 0.8],
    builder.isFar ? 5 : 8,
  );
};

const buildCalf = (builder: AttractionBuilder) => {
  addElephant(builder, { x: 0, z: 0, turn: 0.9 }, 0.5, {
    colour: hideMuddy,
    isSmall: true,
  });
};

const buildEgret = (builder: AttractionBuilder) => {
  builder.sphere("paint", egretWhite, 0.1, [0, 0.32, 0], [0.8, 0.9, 1.4], 8);
  builder.bar("paint", egretWhite, [0, 0.38, 0.08], [0, 0.5, 0.12], 0.05, 5);
  builder.sphere("paint", egretWhite, 0.05, [0, 0.52, 0.14], [1, 1, 1], 6);
  builder.cylinder("paint", "#e8b630", {
    radius: 0.015,
    radiusEnd: 0.004,
    length: 0.12,
    at: [0, 0.51, 0.22],
    axis: "z",
    segments: 4,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      "#3a3a3a",
      [side * 0.03, 0.25, 0],
      [side * 0.03, 0, 0.02],
      0.015,
      3,
    );
  });
};

/* -------------------------------------------------------------- */
/* The ride and the deck                                            */
/* -------------------------------------------------------------- */

const hopPoints: Triple[] = [
  [hopStart.x, 0, hopStart.z],
  ...stones,
  [hopFinish.x, 0, hopFinish.z],
];

const steppingStones = (progress: number): LocalSpot => {
  const hops = hopPoints.length - 1;
  const along = Math.min(hops - 0.0001, Math.max(0, progress) * hops);
  const hop = Math.floor(along);
  const share = along - hop;
  const from = hopPoints[hop];
  const to = hopPoints[hop + 1];
  /* Wait a moment on each stone, then leap */
  const leap = Math.min(1, Math.max(0, (share - 0.3) / 0.7));
  const eased = leap * leap * (3 - 2 * leap);
  return {
    x: from[0] + (to[0] - from[0]) * eased,
    y: from[1] + (to[1] - from[1]) * eased + Math.sin(leap * Math.PI) * 0.45,
    z: from[2] + (to[2] - from[2]) * eased,
    heading: Math.atan2(to[0] - from[0], to[2] - from[2]),
  };
};

const jettyDeck: Deck = ({ x, z }) =>
  x >= jetty.minX && x <= jetty.maxX && z >= jetty.minZ && z <= jetty.maxZ
    ? { height: jettyTop, kind: "bridge" }
    : undefined;

const trumpet = [43, 48, 52, 55, 60, 55, 52, 48];

export const elephantPoolModel: NewLandAttractionModel = {
  kind: "elephant-pool",
  islandId: "jungle-reach",
  name: "Elephant Pool",
  fact: "Elephants talk to each other with deep rumbles, made by vibrations in their throats. Some rumbles are so low that people can't hear them at all, but other elephants can pick them up from kilometres away, even through the ground under their feet.",
  curriculumLink:
    "Science, Year 4: sound. Identify how sounds are made, associating some of them with something vibrating, and find patterns between the pitch of a sound and the object that made it (an elephant's low rumbles).",
  footprint: 11,
  setting: "inland",
  signSpot: signAt,
  padColour: "#6a9440",
  build: (builder) => {
    buildPool(builder);
    addElephant(builder, mumAt, mumSize, { hasTrunk: false });
    addElephant(builder, auntAt, auntSize, {
      colour: hideMuddy,
      hasTrunk: false,
      hasEars: false,
    });
    buildJetty(builder);
    buildShelter(builder);
    buildPlanting(builder);
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "mum's trunk",
      pivot: mumTrunkPivot,
      build: buildMumTrunk,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.45,
        period: 1.6,
      },
    },
    {
      name: "trunk spray",
      pivot: sprayAt,
      build: buildSpray,
      motion: { kind: "splash", reach: 5.5, period: 1.4 },
    },
    {
      name: "aunt's trunk",
      pivot: [0, 0, 0],
      build: buildAuntTrunk,
      motion: { kind: "bob", height: 0.03, period: 2.6 },
    },
    {
      name: "left ear",
      pivot: earAt(-1),
      build: buildEar(-1),
      motion: { kind: "swing", axis: "y", amplitude: 0.35, period: 1.8 },
    },
    {
      name: "right ear",
      pivot: earAt(1),
      build: buildEar(1),
      motion: {
        kind: "swing",
        axis: "y",
        amplitude: 0.35,
        period: 1.8,
        phase: Math.PI,
      },
    },
    {
      name: "calf",
      pivot: calfAt,
      build: buildCalf,
      motion: { kind: "bob", height: 0.06, period: 1.3 },
    },
  ],
  wanderers: [
    {
      name: "cattle egrets",
      build: buildEgret,
      count: 4,
      centre: { x: 0, z: -3.4 },
      radius: 2.6,
      speed: 0.4,
    },
  ],
  decks: [jettyDeck],
  rides: [
    {
      id: "stepping-stones",
      name: "the stepping stones",
      start: hopStart,
      reach: 0.6,
      seconds: 12,
      finish: hopFinish,
      follow: steppingStones,
    },
  ],
  tune: trumpet,
  blockers: [
    { x: mumAt.x, z: mumAt.z, radius: 1.0 },
    { x: auntAt.x, z: auntAt.z, radius: 0.95 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Trumpet like an elephant",
    news: "Pa-rooo! You trumpeted with the elephants. Their deepest rumbles are so low that only other elephants can hear them, through the ground!",
    tune: trumpet,
  },
};
