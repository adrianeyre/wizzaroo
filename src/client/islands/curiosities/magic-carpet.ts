import { BoxGeometry } from "three";
import {
  addSignBoard,
  findMotionPose,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const tileCream = "#efe2c2";
const tileBlue = "#2d6f9e";
const tileTurquoise = "#3fa7a3";
const tileTerracotta = "#c0603a";
const tileGold = "#d9a93f";
const carpetRed = "#a8243a";
const carpetDeep = "#5e1a3a";
const carpetGold = "#e3b545";
const carpetTeal = "#2f8a8a";
const tassel = "#f0c75a";
const brass = "#d4a542";
const flame = "#ffb347";
const genieBlue = "#7fd8ff";
const cushionColours = ["#c23b6b", "#3b6fc2", "#e0902e", "#6b3bc2", "#2e9e74"];
const palmTrunk = "#8a6440";
const palmLeaf = "#4f8a3a";
const signColour = "#7a2a4a";

const platformRadius = 2.7;
const platformTop = 0.3;
const pedestalTop = 1.05;
const lampAt: Triple = [0, pedestalTop, 0];
const flameAt: Triple = [0.69, pedestalTop + 0.5, 0];
const carpetPivot: Triple = [0, 1.25, 0];
const orbitRadius = 1.65;
const carpetMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: orbitRadius,
  count: 1,
  speed: 0.45,
  isFacingAlong: true,
  bob: 0.1,
};
const rideStart: LocalPoint = { x: 0, z: 3.15 };
const rideFinish: LocalPoint = { x: -1.7, z: 3.0 };
const palmAt: LocalPoint = { x: -3.0, z: -2.4 };

/* The mosaic platform: an octagon of tiles in rings and stars */

const buildPlatform = (builder: AttractionBuilder) => {
  builder.cylinder("matte", shade(tileCream, 0.82), {
    radius: platformRadius + 0.12,
    radiusEnd: platformRadius,
    length: platformTop,
    at: [0, platformTop / 2, 0],
    segments: 8,
  });
  /* Rings of coloured tiles, each a little proud of the last */
  [
    { radius: platformRadius - 0.05, colour: tileBlue },
    { radius: platformRadius - 0.3, colour: tileCream },
    { radius: 1.25, colour: tileTurquoise },
    { radius: 1.0, colour: tileCream },
  ].forEach(({ radius, colour }, index) => {
    builder.cylinder("paint", colour, {
      radius,
      length: 0.02,
      at: [0, platformTop + 0.01 + index * 0.004, 0],
      segments: 8,
    });
  });
  if (builder.isFar) {
    return;
  }
  /* A border of diamond tiles, and an eight-pointed star in the middle */
  listRingPoints(platformRadius - 0.17, 24).forEach(({ x, z }, index) => {
    builder.box(
      "paint",
      index % 2 === 0 ? tileGold : tileTerracotta,
      [0.13, 0.02, 0.13],
      [x, platformTop + 0.025, z],
      [0, Math.PI / 4 + (index / 24) * Math.PI * 2, 0],
    );
  });
  listRingPoints(1.9, 16).forEach(({ x, z }, index) => {
    builder.box(
      "paint",
      index % 2 === 0 ? tileBlue : tileTerracotta,
      [0.22, 0.02, 0.22],
      [x, platformTop + 0.025, z],
      [0, Math.PI / 4 + (index / 16) * Math.PI * 2, 0],
    );
  });
  [0, Math.PI / 4].forEach((turn) => {
    builder.box(
      "paint",
      tileGold,
      [1.55, 0.02, 1.55],
      [0, platformTop + 0.03, 0],
      [0, turn, 0],
    );
  });
  /* Moulded rim round the top, and two steps up at the front */
  builder.torus(
    "matte",
    shade(tileCream, 0.95),
    platformRadius + 0.02,
    0.05,
    [0, platformTop, 0],
    "y",
    8,
  );
  builder.box(
    "matte",
    shade(tileCream, 0.9),
    [1.4, 0.15, 0.4],
    [0, 0.075, platformRadius + 0.15],
  );
};

/* The pedestal and the big brass lamp on top */

const buildLamp = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  turn: number,
) => {
  const [x, y, z] = at;
  const isBig = size > 1;
  const out = (along: number, up: number): Triple => [
    x + Math.cos(turn) * along * size,
    y + up * size,
    z - Math.sin(turn) * along * size,
  ];
  builder.cylinder("metal", shade(brass, 0.8), {
    radius: 0.14 * size,
    radiusEnd: 0.1 * size,
    length: 0.08 * size,
    at: out(0, 0.04),
    segments: isBig ? 14 : 8,
  });
  builder.sphere(
    "metal",
    brass,
    0.3 * size,
    out(0, 0.25),
    [1.25, 0.6, 0.9],
    isBig ? 18 : 10,
  );
  builder.cylinder("metal", shade(brass, 1.1), {
    radius: 0.13 * size,
    radiusEnd: 0.07 * size,
    length: 0.14 * size,
    at: out(0, 0.47),
    segments: isBig ? 12 : 6,
  });
  builder.sphere(
    "metal",
    shade(brass, 1.15),
    0.05 * size,
    out(0, 0.58),
    [1, 1.3, 1],
    isBig ? 8 : 5,
  );
  builder.bar("metal", brass, out(0.3, 0.27), out(0.5, 0.34), 0.08 * size, 8);
  builder.bar("metal", brass, out(0.5, 0.34), out(0.6, 0.42), 0.05 * size, 6);
  builder.bar(
    "metal",
    brass,
    out(-0.33, 0.3),
    out(-0.46, 0.42),
    0.04 * size,
    6,
  );
  builder.bar("metal", brass, out(-0.46, 0.42), out(-0.3, 0.5), 0.04 * size, 6);
};

const buildPedestal = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    tileCream,
    [
      [0, platformTop],
      [0.5, platformTop],
      [0.5, platformTop + 0.12],
      [0.36, platformTop + 0.2],
      [0.28, platformTop + 0.3],
      [0.25, pedestalTop - 0.2],
      [0.34, pedestalTop - 0.1],
      [0.42, pedestalTop - 0.04],
      [0.42, pedestalTop],
      [0, pedestalTop],
    ],
    [0, 0, 0],
    "y",
    builder.isFar ? 10 : 20,
  );
  if (builder.isFar) {
    builder.sphere(
      "metal",
      brass,
      0.36,
      [0, pedestalTop + 0.22, 0],
      [1.3, 0.6, 0.9],
      8,
    );
    return;
  }
  /* Blue tile bands round the column */
  [platformTop + 0.42, pedestalTop - 0.3].forEach((y) => {
    builder.cylinder("paint", tileBlue, {
      radius: 0.27,
      length: 0.06,
      at: [0, y, 0],
      segments: 16,
    });
  });
  buildLamp(builder, lampAt, 1.15, 0);
};

/* Little lamps on brass trays, and cushions round the edge */

const sideLampSpots = listRingPoints(2.3, 4).map(({ x, z }) => ({
  x: x * Math.cos(Math.PI / 4) - z * Math.sin(Math.PI / 4),
  z: x * Math.sin(Math.PI / 4) + z * Math.cos(Math.PI / 4),
}));

const buildSideLamps = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  sideLampSpots.forEach(({ x, z }, index) => {
    /* A low folding table with a round brass tray */
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        palette.darkTimber,
        [x - 0.18 * side, platformTop, z - 0.18],
        [x + 0.18 * side, platformTop + 0.4, z + 0.18],
        0.04,
        5,
      );
      builder.bar(
        "matte",
        palette.darkTimber,
        [x - 0.18 * side, platformTop, z + 0.18],
        [x + 0.18 * side, platformTop + 0.4, z - 0.18],
        0.04,
        5,
      );
    });
    builder.cylinder("metal", brass, {
      radius: 0.3,
      length: 0.03,
      at: [x, platformTop + 0.42, z],
      segments: 14,
    });
    builder.cylinder("metal", shade(brass, 1.1), {
      radius: 0.31,
      length: 0.05,
      at: [x, platformTop + 0.44, z],
      segments: 14,
      isOpen: true,
    });
    const turn = Math.atan2(-z, x) + Math.PI / 2;
    buildLamp(builder, [x, platformTop + 0.44, z], 0.45, turn);
    builder.sphere(
      "glow",
      flame,
      0.045,
      [
        x + Math.cos(turn) * 0.28,
        platformTop + 0.66,
        z - Math.sin(turn) * 0.28,
      ],
      [1, 1.6, 1],
      8,
    );
    /* A little glass of tea beside each lamp */
    builder.cylinder("glass", index % 2 === 0 ? "#c86a2c" : "#a8562a", {
      radius: 0.035,
      radiusEnd: 0.045,
      length: 0.09,
      at: [x - 0.14, platformTop + 0.49, z + 0.12],
      segments: 8,
    });
  });
};

const buildCushions = (builder: AttractionBuilder) => {
  const angles = [0.4, 1.2, 2.8, -0.4, -1.2, -2.8, Math.PI];
  angles.forEach((angle, index) => {
    const radius = 2.3;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const colour = cushionColours[index % cushionColours.length];
    builder.sphere(
      "matte",
      colour,
      0.26,
      [x, platformTop + 0.1, z],
      [1, 0.42, 1],
      builder.isFar ? 6 : 10,
    );
    if (builder.isFar) {
      return;
    }
    builder.cylinder("matte", shade(colour, 1.3), {
      radius: 0.11,
      length: 0.03,
      at: [x, platformTop + 0.205, z],
      segments: 10,
    });
    [-1, 1].forEach((side) => {
      builder.sphere(
        "matte",
        tassel,
        0.035,
        [
          x + Math.cos(angle) * 0.25 * side,
          platformTop + 0.08,
          z - Math.sin(angle) * 0.25 * side,
        ],
        [1, 1.4, 1],
        5,
      );
    });
  });
};

/* A date palm behind, and pots of sand by the steps */

/** A flat piece of frond, drooping by `droop` and turned out by `turn`. */
const addFrondPiece = (
  builder: AttractionBuilder,
  colour: string,
  size: Triple,
  at: Triple,
  droop: number,
  turn: number,
) => {
  builder.add(
    "matte",
    colour,
    new BoxGeometry(...size).rotateX(droop).rotateY(turn),
    { at },
    undefined,
  );
};

const buildPalm = (builder: AttractionBuilder) => {
  const { x, z } = palmAt;
  const height = 3.6;
  const rings = builder.isFar ? 2 : 7;
  for (let ring = 0; ring < rings; ring++) {
    const share = ring / rings;
    const piece = height / rings;
    builder.cylinder("matte", shade(palmTrunk, ring % 2 === 0 ? 1 : 0.88), {
      radius: 0.2 - share * 0.07,
      radiusEnd: 0.17 - share * 0.07,
      length: piece,
      at: [x + share * 0.35, piece * (ring + 0.5), z + share * 0.2],
      segments: builder.isFar ? 6 : 10,
    });
  }
  const top: Triple = [x + 0.38, height, z + 0.22];
  const fronds = builder.isFar ? 4 : 8;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2;
    const reach = 1.3;
    const tip: Triple = [
      top[0] + Math.sin(angle) * reach,
      top[1] - 0.45,
      top[2] + Math.cos(angle) * reach,
    ];
    addFrondPiece(
      builder,
      frond % 2 === 0 ? palmLeaf : shade(palmLeaf, 0.85),
      [0.34, 0.03, reach + 0.2],
      [(top[0] + tip[0]) / 2, top[1] - 0.2, (top[2] + tip[2]) / 2],
      0.3,
      angle,
    );
    if (!builder.isFar) {
      addFrondPiece(
        builder,
        shade(palmLeaf, 0.75),
        [0.28, 0.03, 0.75],
        [
          top[0] + Math.sin(angle) * (reach + 0.4),
          top[1] - 0.68,
          top[2] + Math.cos(angle) * (reach + 0.4),
        ],
        0.75,
        angle,
      );
    }
  }
  if (builder.isFar) {
    return;
  }
  /* Bunches of dates under the crown */
  [0.6, 2.6, 4.4].forEach((angle) => {
    builder.sphere(
      "matte",
      "#9a4a1e",
      0.16,
      [
        top[0] + Math.sin(angle) * 0.2,
        top[1] - 0.25,
        top[2] + Math.cos(angle) * 0.2,
      ],
      [1, 1.3, 1],
      8,
    );
  });
};

const buildPots = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [
    { x: 1.05, z: 3.1, size: 1 },
    { x: -1.05, z: 3.25, size: 0.8 },
    { x: 2.9, z: -1.6, size: 1.2 },
  ].forEach(({ x, z, size }) => {
    builder.lathe(
      "matte",
      tileTerracotta,
      [
        [0, 0],
        [0.16 * size, 0],
        [0.26 * size, 0.18 * size],
        [0.24 * size, 0.4 * size],
        [0.12 * size, 0.55 * size],
        [0.15 * size, 0.62 * size],
        [0.11 * size, 0.62 * size],
      ],
      [x, 0, z],
      "y",
      14,
    );
    builder.cylinder("paint", tileBlue, {
      radius: 0.26 * size,
      length: 0.05,
      at: [x, 0.28 * size, z],
      segments: 14,
      isOpen: true,
    });
  });
  /* Footprints in the sand, leading up to the steps */
  [
    [0.2, 3.7],
    [-0.15, 4.05],
    [0.2, 4.4],
  ].forEach(([x, z]) => {
    builder.sphere(
      "matte",
      shade(sand, 0.88),
      0.09,
      [x, 0.0, z],
      [0.8, 0.12, 1.4],
      6,
    );
  });
};

/* The moving parts */

const buildCarpet = (builder: AttractionBuilder) => {
  const width = 1.05;
  const length = 1.75;
  builder.box("matte", carpetRed, [width, 0.04, length], [0, 0, 0]);
  /* Upturned ends, as if catching the wind */
  [-1, 1].forEach((end) => {
    builder.box(
      "matte",
      carpetRed,
      [width, 0.04, 0.22],
      [0, 0.03, end * (length / 2 + 0.1)],
      [-end * 0.3, 0, 0],
    );
  });
  /* A gold border, a deep inner field and a medallion */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      carpetGold,
      [0.07, 0.012, length - 0.1],
      [side * (width / 2 - 0.08), 0.026, 0],
    );
    builder.box(
      "matte",
      carpetGold,
      [width - 0.1, 0.012, 0.07],
      [0, 0.026, side * (length / 2 - 0.08)],
    );
  });
  builder.box(
    "matte",
    carpetDeep,
    [width - 0.32, 0.012, length - 0.36],
    [0, 0.024, 0],
  );
  builder.box(
    "matte",
    carpetGold,
    [0.38, 0.016, 0.38],
    [0, 0.03, 0],
    [0, Math.PI / 4, 0],
  );
  builder.box(
    "matte",
    carpetTeal,
    [0.24, 0.02, 0.24],
    [0, 0.034, 0],
    [0, Math.PI / 4, 0],
  );
  builder.box(
    "matte",
    carpetRed,
    [0.1, 0.024, 0.1],
    [0, 0.038, 0],
    [0, Math.PI / 4, 0],
  );
  /* Little diamonds down each side of the field */
  [-0.55, -0.35, 0.35, 0.55].forEach((along) => {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        side > 0 ? carpetTeal : carpetGold,
        [0.09, 0.016, 0.09],
        [side * 0.24, 0.03, along],
        [0, Math.PI / 4, 0],
      );
    });
  });
  /* Corner tassels on cords, and a fringe along each end */
  [-1, 1].forEach((end) => {
    for (let strand = 0; strand < 9; strand++) {
      const x = -width / 2 + 0.06 + strand * ((width - 0.12) / 8);
      builder.box(
        "matte",
        tassel,
        [0.03, 0.02, 0.09],
        [x, 0.09, end * (length / 2 + 0.26)],
        [-end * 0.3, 0, 0],
      );
    }
    [-1, 1].forEach((side) => {
      const corner: Triple = [
        side * (width / 2),
        0.08,
        end * (length / 2 + 0.2),
      ];
      builder.bar(
        "matte",
        tassel,
        corner,
        [corner[0], corner[1] - 0.16, corner[2]],
        0.015,
        4,
      );
      builder.cylinder("matte", tassel, {
        radius: 0.025,
        radiusEnd: 0.05,
        length: 0.12,
        at: [corner[0], corner[1] - 0.22, corner[2]],
        segments: 8,
      });
      builder.sphere(
        "matte",
        carpetRed,
        0.03,
        [corner[0], corner[1] - 0.15, corner[2]],
        [1, 1, 1],
        6,
      );
    });
  });
};

const buildFlame = (builder: AttractionBuilder) => {
  builder.sphere("glow", flame, 0.07, [0, 0.07, 0], [1, 1.7, 1], 10);
  builder.sphere("glow", "#fff1b0", 0.035, [0, 0.05, 0], [1, 1.6, 1], 8);
};

/** The genie's smoke: a curl of glowing blue puffs that wakes as you come near. */
const buildGenieSmoke = (builder: AttractionBuilder) => {
  const puffs = 10;
  for (let puff = 0; puff < puffs; puff++) {
    const share = puff / (puffs - 1);
    const angle = share * Math.PI * 3;
    const radius = 0.1 + share * 0.3;
    builder.sphere(
      "glow",
      shade(genieBlue, 1 - share * 0.25),
      0.08 + share * 0.14,
      [Math.sin(angle) * radius, share * 1.6, Math.cos(angle) * radius],
      [1, 0.8, 1],
      8,
    );
  }
  /* Two twinkling sparkles at the top */
  [-1, 1].forEach((side) => {
    builder.box(
      "glow",
      "#ffffff",
      [0.05, 0.22, 0.05],
      [side * 0.35, 1.75, 0.1],
      [0, 0, side * 0.3],
    );
    builder.box(
      "glow",
      "#ffffff",
      [0.22, 0.05, 0.05],
      [side * 0.35, 1.75, 0.1],
      [0, 0, side * 0.3],
    );
  });
};

/* The ride: up onto the carpet, once round the lamp, and down again */

const findCarpetSpot = (seconds: number) => {
  const pose = findMotionPose(carpetMotion, seconds);
  return {
    angle: seconds * 0.45,
    height: carpetPivot[1] + pose.position[1] + 0.05,
  };
};

const toPolar = ({ x, z }: LocalPoint) => ({
  angle: Math.atan2(-z, x),
  radius: Math.hypot(x, z),
});

const carpetRide = (progress: number, seconds: number): LocalSpot => {
  const carpet = findCarpetSpot(seconds);
  const share = Math.min(1, progress * 7, (1 - progress) * 7);
  const ground = toPolar(progress < 0.5 ? rideStart : rideFinish);
  const raw = carpet.angle - ground.angle;
  const turned = Math.atan2(Math.sin(raw), Math.cos(raw));
  const angle = ground.angle + turned * share;
  const radius = ground.radius + (orbitRadius - ground.radius) * share;
  return {
    x: Math.cos(angle) * radius,
    y: carpet.height * share,
    z: -Math.sin(angle) * radius,
    heading: angle + Math.PI,
  };
};

export const magicCarpetModel: CuriosityModel = {
  kind: "magic-carpet",
  islandId: "sunscorch-sands",
  name: "Magic Carpet",
  fact: "Flying carpets come from the old stories of One Thousand and One Nights, told in the Middle East, Persia and India hundreds of years ago. In them, Scheherazade tells the king a new story every night, including tales of Aladdin and his magic lamp. Real carpets from Persia are woven by hand and can take months to make.",
  curriculumLink:
    "English, Year 3: increase familiarity with a wide range of books, including fairy stories, myths and legends, and stories from other cultures, retelling some of these orally.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: 1.9, z: 3.8 },
  padColour: sand,
  build: (builder) => {
    buildPlatform(builder);
    buildPedestal(builder);
    buildSideLamps(builder);
    buildCushions(builder);
    buildPalm(builder);
    buildPots(builder);
    if (builder.isFar) {
      /* The carpet, still, hovering by the lamp */
      builder.box(
        "matte",
        carpetRed,
        [1.05, 0.05, 1.75],
        [orbitRadius, carpetPivot[1], 0],
      );
    }
    addSignBoard(builder, [1.9, 0, 3.8], signColour);
  },
  moving: [
    {
      name: "carpet",
      pivot: carpetPivot,
      build: buildCarpet,
      motion: carpetMotion,
    },
    {
      name: "lamp flame",
      pivot: flameAt,
      build: buildFlame,
      motion: { kind: "flicker", period: 0.7 },
    },
    {
      name: "genie smoke",
      pivot: [0.62, pedestalTop + 0.6, 0],
      build: buildGenieSmoke,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  decks: [
    ({ x, z }) =>
      Math.hypot(x, z) <= platformRadius
        ? { height: platformTop, kind: "ground" }
        : undefined,
  ],
  rides: [
    {
      id: "carpet",
      name: "the magic carpet",
      start: rideStart,
      reach: 0.6,
      seconds: 16,
      finish: rideFinish,
      follow: carpetRide,
    },
  ],
  blockers: [
    { x: 0, z: 0, radius: 0.6 },
    { x: palmAt.x + 0.1, z: palmAt.z + 0.05, radius: 0.35 },
    ...sideLampSpots.map(({ x, z }) => ({ x, z, radius: 0.35 })),
  ] satisfies LocalBlocker[],
  play: {
    label: "Rub the lamp",
    news: 'Whoosh! A curl of blue smoke swirled out of the lamp, and a deep voice boomed: "Your wish is my command!"',
    tune: [62, 65, 67, 70, 69, 65, 62],
  },
};
