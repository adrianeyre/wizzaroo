import { BoxGeometry } from "three";
import {
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
import {
  addBandedRock,
  addPalm,
  addRock,
  addScrub,
  addSlab,
  buildPerson,
  desert,
  followPath,
  listCurve,
  listRoundSection,
  makeSweep,
  paintBands,
  placeTurned,
  sandstoneBands,
} from "./sandstone-arches-parts.js";

/*
 * Two arches of banded sandstone, worn right through by wind and rain:
 * the Big Arch, high enough to stroll under and to scramble over, and
 * the Little Arch beside it. A balanced rock wobbles on its stalk, a
 * lizard pops out of a crack, and a lookout ledge has steps up to it.
 */

const signColour = desert.terracotta;
const signAt: Triple = [0, 0, 8.4];

interface Arch {
  at: Triple;
  turn: number;
  /** Half the span of the arch's middle line, foot to foot. */
  halfSpan: number;
  /** Height of the middle line at the top. */
  height: number;
  /** Half the thickness of the rock in the arch's plane, foot and top. */
  thick: [number, number];
  /** Half the depth of the rock across the arch, foot and top. */
  deep: [number, number];
  seed: number;
}

const bigArch: Arch = {
  at: [0, 0, -2.6],
  turn: 0,
  halfSpan: 2.9,
  height: 4.1,
  thick: [0.8, 0.52],
  deep: [0.95, 0.62],
  seed: 1.3,
};

const littleArch: Arch = {
  at: [-5.2, 0, 2.6],
  turn: 0.85,
  halfSpan: 1.55,
  height: 2.55,
  thick: [0.45, 0.32],
  deep: [0.55, 0.4],
  seed: 4.1,
};

/** The arch's middle line, in its own plane: [along, up]. */
const findArchLine = (arch: Arch, share: number): [number, number] => {
  const angle = Math.PI * (1 - share);
  const cos = Math.cos(angle);
  const sin = Math.max(0, Math.sin(angle));
  return [
    arch.halfSpan * Math.sign(cos) * Math.abs(cos) ** 0.75,
    arch.height * sin ** 0.6 - 0.25 * (1 - sin),
  ];
};

/** How thick and deep the arch is a share of the way over, fatter at its feet. */
const findArchSize = (arch: Arch, share: number): [number, number] => {
  const middle = Math.sin(share * Math.PI);
  return [
    arch.thick[0] + (arch.thick[1] - arch.thick[0]) * middle,
    arch.deep[0] + (arch.deep[1] - arch.deep[0]) * middle,
  ];
};

const archPoint = (arch: Arch, along: number, up: number): Triple =>
  placeTurned(arch.at, arch.turn, [along, up, 0]);

const buildArch = (builder: AttractionBuilder, arch: Arch) => {
  const rings = builder.isFar ? 12 : 30;
  const path = listCurve(rings, (share) => {
    const [along, up] = findArchLine(arch, share);
    return archPoint(arch, along, up);
  });
  builder.painted(
    makeSweep({
      path,
      side: [Math.sin(arch.turn), 0, Math.cos(arch.turn)],
      section: listRoundSection(builder.isFar ? 6 : 12),
      size: (share) => findArchSize(arch, share),
      lump: builder.isFar ? 0 : 0.07,
      seed: arch.seed,
    }),
    paintBands(sandstoneBands, 0.34, arch.seed),
    {},
    "matte",
  );
  /* Fallen blocks and rubble round its feet */
  [-1, 1].forEach((end) => {
    const [along] = findArchLine(arch, end < 0 ? 0 : 1);
    const [thick, deep] = findArchSize(arch, 0);
    addBandedRock(
      builder,
      archPoint(arch, along + end * thick * 0.6, 0.15),
      [thick * 1.3, 0.55, deep * 1.25],
      arch.seed + end,
    );
    if (!builder.isFar) {
      addRock(
        builder,
        desert.redSandstone,
        placeTurned(arch.at, arch.turn, [
          along + end * (thick + 0.55),
          0.1,
          deep * 0.9,
        ]),
        [0.28, 0.2, 0.24],
        arch.seed * 3 + end,
      );
      addRock(
        builder,
        desert.paleSandstone,
        placeTurned(arch.at, arch.turn, [
          along + end * (thick + 0.3),
          0.08,
          -deep * 1.1,
        ]),
        [0.22, 0.15, 0.2],
        arch.seed * 5 + end,
      );
    }
  });
};

/* ------------------------------------------------------------------ */
/* The lookout ledge                                                   */
/* ------------------------------------------------------------------ */

const ledge = { x: 4.7, z: 1.5, halfX: 1.45, halfZ: 1.25, top: 0.75 };
const stepRise = 0.25;
const stepDepth = 0.36;
const stepHalfWidth = 0.75;
const stepsFront = ledge.z + ledge.halfZ + stepDepth * 2;

const buildLedge = (builder: AttractionBuilder) => {
  builder.painted(
    new BoxGeometry(ledge.halfX * 2, ledge.top, ledge.halfZ * 2, 2, 3, 2),
    paintBands(sandstoneBands, ledge.top / 3, 0.02),
    { at: [ledge.x, ledge.top / 2, ledge.z] },
    "matte",
    undefined,
  );
  builder.box(
    "matte",
    desert.paleSandstone,
    [ledge.halfX * 2 + 0.1, 0.06, ledge.halfZ * 2 + 0.1],
    [ledge.x, ledge.top + 0.03, ledge.z],
  );
  [1, 2].forEach((step) => {
    const top = ledge.top - step * stepRise;
    const front = ledge.z + ledge.halfZ + step * stepDepth;
    builder.box(
      "matte",
      step % 2 === 0 ? desert.sandstone : desert.paleSandstone,
      [stepHalfWidth * 2, top, stepDepth],
      [ledge.x, top / 2, front - stepDepth / 2],
    );
  });
  /* Boulders at its corners, and a viewing telescope and bench on top */
  addBandedRock(
    builder,
    [ledge.x + ledge.halfX, 0.35, ledge.z - ledge.halfZ],
    [0.7, 0.75, 0.65],
    7.7,
  );
  addBandedRock(
    builder,
    [ledge.x - ledge.halfX - 0.1, 0.3, ledge.z - ledge.halfZ + 0.2],
    [0.6, 0.6, 0.7],
    8.8,
  );
  const top = ledge.top;
  if (!builder.isFar) {
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.05,
      length: 0.95,
      at: [ledge.x + 0.9, top + 0.48, ledge.z - 0.6],
      segments: 8,
    });
    builder.cylinder("paint", desert.turquoise, {
      radius: 0.11,
      radiusEnd: 0.08,
      length: 0.6,
      at: [ledge.x + 0.9, top + 1.02, ledge.z - 0.7],
      axis: "z",
      segments: 12,
    });
    builder.cylinder("glass", palette.glass, {
      radius: 0.075,
      length: 0.02,
      at: [ledge.x + 0.9, top + 1.02, ledge.z - 1.01],
      axis: "z",
      segments: 10,
    });
    builder.box(
      "paint",
      desert.timber,
      [1.1, 0.06, 0.36],
      [ledge.x - 0.5, top + 0.4, ledge.z - 0.85],
    );
    [-0.4, 0.4].forEach((side) => {
      builder.box(
        "matte",
        desert.paleSandstone,
        [0.16, 0.38, 0.34],
        [ledge.x - 0.5 + side, top + 0.19, ledge.z - 0.85],
      );
    });
  }
};

const ledgeDeck: Deck = ({ x, z }) => {
  if (
    Math.abs(x - ledge.x) <= ledge.halfX &&
    Math.abs(z - ledge.z) <= ledge.halfZ
  ) {
    return { height: ledge.top, kind: "ground" };
  }
  if (
    Math.abs(x - ledge.x) <= stepHalfWidth &&
    z > ledge.z + ledge.halfZ &&
    z <= stepsFront
  ) {
    const step = Math.ceil((z - ledge.z - ledge.halfZ) / stepDepth);
    return { height: ledge.top - step * stepRise, kind: "ground" };
  }
  return undefined;
};

/* ------------------------------------------------------------------ */
/* Rocks, palms and paths round about                                  */
/* ------------------------------------------------------------------ */

const balancedAt = { x: 5.4, z: -4.2 };
const stalkTop = 1.55;
const lizardRock = { x: -2.6, z: 3.6 };

const buildHoodoo = (builder: AttractionBuilder, at: Triple, seed: number) => {
  const tiers = [
    [0.75, 0.6],
    [0.6, 0.55],
    [0.5, 0.5],
    [0.62, 0.35],
  ] as const;
  let height = 0;
  tiers.forEach(([radius, tall], tier) => {
    addBandedRock(
      builder,
      [at[0], height + tall / 2, at[2]],
      [radius, tall * 0.62, radius * 0.92],
      seed + tier,
    );
    height += tall * 0.92;
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A sandy path from the sign, under the Big Arch and on round */
  const path: [number, number][] = [
    [0, 8.2],
    [0.1, 6],
    [0, 3.8],
    [-0.1, 1.4],
    [0, -0.6],
    [0, -2.6],
    [0.3, -4.6],
  ];
  path.slice(1).forEach(([x, z], index) => {
    const [fromX, fromZ] = path[index];
    addSlab(
      builder,
      "matte",
      desert.paleSand,
      [fromX, 0.02, fromZ],
      [x, 0.02, z],
      1.5,
      0.03,
    );
  });
  addSlab(
    builder,
    "matte",
    desert.paleSand,
    [0, 0.02, 3.5],
    [ledge.x, 0.02, stepsFront + 0.3],
    1.2,
    0.03,
  );
  /* Palms and scrub */
  addPalm(builder, [-7.2, 0, -3.2], 3.6, [0.12, 0.1], 0.2);
  addPalm(builder, [-6.2, 0, -5.4], 3.0, [-0.1, -0.05], 1.1);
  addPalm(builder, [7.6, 0, -1.4], 3.3, [-0.14, 0.04], 0.6);
  addPalm(builder, [-3.6, 0, 7.2], 2.8, [0.08, -0.1], 1.6);
  (
    [
      [2.4, 6.4, 0.42],
      [-1.8, 5.6, 0.35],
      [6.6, 4.6, 0.45],
      [-7.6, 0.6, 0.4],
      [3.2, -6.8, 0.5],
      [-3.4, -6.6, 0.38],
      [1.8, 2.6, 0.3],
    ] as const
  ).forEach(([x, z, size], index) => {
    addScrub(
      builder,
      [x, 0, z],
      size,
      index % 2 === 0 ? desert.scrub : "#93a052",
    );
  });
  /* Boulders, a hoodoo and the rock under the lizard */
  buildHoodoo(builder, [-6.6, 0, -1.0], 2.2);
  addBandedRock(builder, [-2.0, 0.6, -6.4], [1.4, 1.0, 1.0], 3.3);
  addBandedRock(builder, [2.4, 0.5, -7.2], [1.1, 0.8, 0.9], 5.5);
  addBandedRock(builder, [6.8, 0.4, 2.4], [0.7, 0.55, 0.8], 6.1);
  addBandedRock(
    builder,
    [lizardRock.x, 0.15, lizardRock.z],
    [0.75, 0.42, 0.6],
    9.4,
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      desert.charcoal,
      [0.5, 0.06, 0.08],
      [lizardRock.x, 0.53, lizardRock.z + 0.05],
    );
    (
      [
        [3.2, 4.4],
        [-4.4, 5.4],
        [1.6, -5.4],
        [-1.4, 2.0],
        [4.6, 6.4],
        [-6.8, 4.8],
        [6.4, -6.0],
      ] as const
    ).forEach(([x, z], index) => {
      addRock(
        builder,
        index % 2 === 0 ? desert.redSandstone : desert.paleSandstone,
        [x, 0.08, z],
        [0.22 + (index % 3) * 0.06, 0.16, 0.2],
        index * 1.9 + 2,
      );
    });
  }
  /* The balanced rock's stalk, worn thin by sand blowing past */
  builder.painted(
    makeSweep({
      path: listCurve(builder.isFar ? 3 : 8, (share) => [
        balancedAt.x,
        share * (stalkTop + 0.1) - 0.1,
        balancedAt.z,
      ]),
      section: listRoundSection(builder.isFar ? 6 : 10),
      size: (share) => {
        const waist = 0.5 - 0.26 * Math.sin(share * Math.PI * 0.9);
        return [waist, waist * 0.9];
      },
      lump: builder.isFar ? 0 : 0.06,
      seed: 3,
    }),
    paintBands(sandstoneBands, 0.3, 0.1),
    {},
    "matte",
  );
  addBandedRock(
    builder,
    [balancedAt.x, 0.1, balancedAt.z],
    [0.75, 0.3, 0.7],
    2.6,
  );
  /* A little display of rock layers by the path */
  if (!builder.isFar) {
    const layers = [
      desert.darkSandstone,
      desert.redSandstone,
      desert.sandstone,
      desert.paleSandstone,
      "#c7854d",
    ];
    layers.forEach((colour, layer) => {
      builder.box(
        "matte",
        colour,
        [0.9, 0.12, 0.5],
        [2.1, 0.06 + layer * 0.12, 7.2],
      );
    });
    builder.box("paint", desert.timber, [1.0, 0.04, 0.6], [2.1, 0.62, 7.2]);
  }
  addSignBoard(builder, signAt, signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts and wanderers                                          */
/* ------------------------------------------------------------------ */

const buildBalancedRock = (builder: AttractionBuilder) => {
  addBandedRock(builder, [0, 0.62, 0], [1.05, 0.7, 0.85], 6.6, 2);
  if (!builder.isFar) {
    addRock(
      builder,
      desert.redSandstone,
      [0.25, 1.18, 0.2],
      [0.3, 0.16, 0.26],
      8,
    );
  }
};

const buildLizard = (builder: AttractionBuilder) => {
  const skin = "#c9893a";
  const sides = builder.isFar ? 5 : 8;
  builder.sphere("matte", skin, 0.13, [0, 0.1, 0], [0.75, 0.55, 1.6], sides);
  builder.sphere(
    "matte",
    shade(skin, 1.1),
    0.075,
    [0, 0.13, 0.25],
    [1, 0.8, 1.4],
    sides,
  );
  builder.bar(
    "matte",
    skin,
    [0, 0.09, -0.18],
    [0.05, 0.05, -0.55],
    0.06,
    sides,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      skin,
      [side * 0.06, 0.08, 0.1],
      [side * 0.18, 0.0, 0.16],
      0.035,
      5,
    );
    builder.bar(
      "matte",
      skin,
      [side * 0.06, 0.08, -0.1],
      [side * 0.18, 0.0, -0.16],
      0.035,
      5,
    );
    builder.sphere(
      "paint",
      desert.charcoal,
      0.02,
      [side * 0.05, 0.17, 0.3],
      [1, 1, 1],
      5,
    );
  });
  builder.box("matte", "#e0b35a", [0.1, 0.01, 0.3], [0, 0.18, 0]);
};

const buildHawk = (builder: AttractionBuilder) => {
  const feather = "#7a5434";
  builder.sphere("matte", feather, 0.16, [0, 0, 0], [0.8, 0.7, 1.9], 10);
  builder.sphere("matte", palette.cream, 0.09, [0, 0.02, 0.32], [1, 1, 1.1], 8);
  builder.add(
    "matte",
    "#e0a33a",
    new BoxGeometry(0.04, 0.04, 0.08),
    { at: [0, 0, 0.42] },
    undefined,
  );
  [-1, 1].forEach((side) => {
    addSlab(
      builder,
      "matte",
      feather,
      [side * 0.1, 0.02, 0],
      [side * 0.75, 0.12, -0.1],
      0.32,
      0.03,
    );
    addSlab(
      builder,
      "matte",
      shade(feather, 0.8),
      [side * 0.72, 0.12, -0.1],
      [side * 1.05, 0.1, -0.25],
      0.18,
      0.025,
    );
  });
  addSlab(
    builder,
    "matte",
    feather,
    [0, 0, -0.25],
    [0, 0.02, -0.55],
    0.26,
    0.025,
  );
};

/* ------------------------------------------------------------------ */
/* The scramble over the Big Arch                                      */
/* ------------------------------------------------------------------ */

const rideStart = { x: -4.3, z: -0.9 };
const rideFinish = { x: 4.0, z: -0.6 };

/** The top of the Big Arch, a share of the way over, where feet go. */
const findArchTop = (share: number): Triple => {
  const [along, up] = findArchLine(bigArch, share);
  const [thick] = findArchSize(bigArch, share);
  const [nextAlong, nextUp] = findArchLine(bigArch, Math.min(1, share + 0.01));
  const [lastAlong, lastUp] = findArchLine(bigArch, Math.max(0, share - 0.01));
  const tangentX = nextAlong - lastAlong;
  const tangentY = nextUp - lastUp;
  const length = Math.hypot(tangentX, tangentY);
  return archPoint(
    bigArch,
    along - (tangentY / length) * (thick + 0.02),
    Math.max(0, up + (tangentX / length) * (thick + 0.02)),
  );
};

const archRidePath: Triple[] = [
  [rideStart.x, 0, rideStart.z],
  [-3.9, 0, bigArch.at[2]],
  ...listCurve(24, (share) => findArchTop(0.06 + share * 0.88)),
  [3.9, 0, bigArch.at[2]],
  [rideFinish.x, 0, rideFinish.z],
];

const archRide = (progress: number): LocalSpot => {
  const spot = followPath(archRidePath, progress);
  return { ...spot, heading: Math.PI / 2 };
};

const archBlockers: LocalBlocker[] = [bigArch, littleArch].flatMap((arch) =>
  [0, 1].map((share) => {
    const [along] = findArchLine(arch, share);
    const [x, , z] = archPoint(arch, along, 0);
    return { x, z, radius: findArchSize(arch, 0)[0] + 0.15 };
  }),
);

export const sandstoneArchesModel: NewLandAttractionModel = {
  kind: "sandstone-arches",
  islandId: "sunscorch-sands",
  name: "Sandstone Arches",
  fact: "Sandstone is made of grains of sand pressed and cemented together over millions of years, which is why you can see it in stripy layers. Wind, rain and frost slowly wear away the softer layers, and can carve a hole right through a wall of rock to make an arch like these.",
  curriculumLink:
    "Science, Year 3: rocks. How sandstone forms in layers, and how wind and water slowly wear rocks away.",
  footprint: 10,
  setting: "inland",
  padColour: desert.sand,
  signSpot: { x: signAt[0], z: signAt[2] + 0.9 },
  build: (builder) => {
    buildArch(builder, bigArch);
    buildArch(builder, littleArch);
    buildLedge(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "balanced-rock",
      pivot: [balancedAt.x, stalkTop, balancedAt.z],
      build: buildBalancedRock,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 5,
        amplitude: 0.07,
        period: 1.4,
      },
    },
    {
      name: "lizard",
      pivot: [lizardRock.x, 0.05, lizardRock.z + 0.05],
      build: buildLizard,
      motion: { kind: "rise", reach: 3.5, height: 0.5, period: 1.8 },
    },
    {
      name: "hawk",
      pivot: [0, 7.2, -2.6],
      build: buildHawk,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 3.4,
        count: 1,
        speed: -0.35,
        isFacingAlong: true,
        bob: 0.3,
      },
    },
  ],
  wanderers: [
    {
      name: "hikers",
      build: buildPerson({
        skin: "#e0b48c",
        top: "#2f7f9a",
        bottom: "#5a5248",
        hair: "#4a3020",
        hat: "#e8dcc0",
      }),
      count: 2,
      centre: { x: 1.6, z: 3.6 },
      radius: 1.8,
      speed: 0.3,
    },
    {
      name: "lizards",
      build: buildLizard,
      count: 3,
      centre: { x: -1.2, z: 5.6 },
      radius: 1.3,
      speed: 0.5,
    },
  ],
  blockers: [
    ...archBlockers,
    { x: balancedAt.x, z: balancedAt.z, radius: 0.6 },
    { x: lizardRock.x, z: lizardRock.z, radius: 0.55 },
  ],
  decks: [ledgeDeck],
  rides: [
    {
      id: "big-arch",
      name: "the Big Arch",
      start: rideStart,
      reach: 0.6,
      seconds: 11,
      finish: rideFinish,
      follow: archRide,
    },
  ],
  play: {
    label: "Give the balanced rock a push",
    news: "Wobble, wobble! The balanced rock rocked on its thin stalk, but it didn't fall, because its weight sits right over the middle.",
  },
};
