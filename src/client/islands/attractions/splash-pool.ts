import {
  BoxGeometry,
  ExtrudeGeometry,
  Shape,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addBush,
  addFence,
  addGableRoof,
  addLampPost,
  addSignBoard,
  addTree,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "./attraction-kit.js";

const paving = "#ddd6c6";
const coping = "#f1ece0";
const poolTile = "#9fd8e6";
const poolBand = "#2f7fae";
const water = "#4cb4d4";
const jetWater = "#e2f6ff";
const padBlue = "#3c88c9";
const padTeal = "#33a6a0";
const padYellow = "#f0c53a";
const fenceBlue = "#2e5f86";
const hutBlue = "#7fb9d9";
const hutTrim = palette.white;
const mushroomRed = "#e2543f";
const archYellow = "#f2b51d";

const poolAt = { x: -3.2, z: -1.0 };
const poolRadius = 2.6;
const poolWater = 0.12;
const padAt = { x: 3.3, z: -0.4 };
const padRadius = 2.7;
const fenceRadius = 8.0;
const hutAt = { x: 0.6, z: -6.0 };
const archAt = { x: 0.2, z: 3.4 };

/* The paddling pool */

const buildPool = (builder: AttractionBuilder) => {
  const { x, z } = poolAt;
  const segments = builder.segments(36, 20);
  builder.cylinder("matte", poolTile, {
    radius: poolRadius,
    length: 0.02,
    at: [x, 0.01, z],
    segments,
  });
  if (!builder.isFar) {
    builder.painted(
      new CylinderGeometry(poolRadius, poolRadius, 0.12, segments, 2, true),
      (centre) => (centre.y > 0.07 ? poolBand : poolTile),
      { at: [x, 0.07, z] },
      "paint",
    );
    builder.add(
      "paint",
      shade(poolTile, 0.88),
      new TorusGeometry(1.9, 0.03, 3, segments),
      { at: [x, 0.022, z], rotation: [Math.PI / 2, 0, 0] },
    );
  }
  builder.add(
    "water",
    water,
    new CylinderGeometry(poolRadius, poolRadius, 0.01, segments, 1),
    { at: [x, poolWater, z] },
  );
  builder.lathe(
    "paint",
    coping,
    [
      [poolRadius - 0.02, 0.05],
      [poolRadius, 0.2],
      [poolRadius + 0.08, 0.24],
      [poolRadius + 0.32, 0.24],
      [poolRadius + 0.4, 0.18],
      [poolRadius + 0.42, 0],
    ],
    [x, 0, z],
    "y",
    segments,
  );
  buildMushroom(builder);
};

const buildMushroom = (builder: AttractionBuilder) => {
  const { x, z } = poolAt;
  const segments = builder.segments(24, 12);
  builder.cylinder("paint", palette.cream, {
    radius: 0.2,
    radiusEnd: 0.14,
    length: 1.3,
    at: [x, 0.65, z],
    segments: 14,
  });
  builder.cylinder("paint", poolBand, {
    radius: 0.34,
    radiusEnd: 0.26,
    length: 0.14,
    at: [x, poolWater + 0.02, z],
    segments: 16,
  });
  const cap = new LatheGeometry(
    [
      [0, 1.92],
      [0.35, 1.88],
      [0.68, 1.74],
      [0.9, 1.52],
      [1.0, 1.34],
      [0.96, 1.3],
      [0.2, 1.32],
    ].map(([radius, height]) => new Vector2(radius, height)),
    segments,
  );
  builder.painted(
    cap,
    (centre) => {
      const angle = Math.atan2(centre.x - x, centre.z - z);
      const spot =
        centre.y > 1.45 &&
        Math.sin(angle * 5 + centre.y * 7) > 0.55 &&
        Math.sin(centre.y * 16) > 0;
      if (centre.y < 1.33) {
        return palette.cream;
      }
      return spot ? palette.white : mushroomRed;
    },
    { at: [x, 0, z] },
    "paint",
  );
  const streams = builder.segments(32, 12);
  builder.painted(
    new LatheGeometry(
      [
        [1.2, poolWater + 0.02],
        [1.14, 0.6],
        [1.06, 1.1],
        [0.99, 1.3],
      ].map(([radius, height]) => new Vector2(radius, height)),
      streams,
    ),
    (centre) => {
      const angle = Math.atan2(centre.x - x, centre.z - z);
      const slot = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * streams);
      return builder.isFar || slot % 2 === 0
        ? { colour: jetWater, finish: "water" }
        : undefined;
    },
    { at: [x, 0, z] },
    "water",
  );
  builder.add(
    "water",
    palette.white,
    new TorusGeometry(1.2, 0.06, 4, segments),
    { at: [x, poolWater + 0.02, z], rotation: [Math.PI / 2, 0, 0] },
  );
};

/* The splash pad */

const buildSplashPad = (builder: AttractionBuilder) => {
  const { x, z } = padAt;
  const segments = builder.segments(40, 20);
  const rings: [number, string][] = [
    [padRadius, padBlue],
    [padRadius - 0.35, padTeal],
    [1.35, padBlue],
    [1.05, padYellow],
    [0.45, padTeal],
  ];
  rings.forEach(([radius, colour], index) => {
    if (builder.isFar && index > 2) {
      return;
    }
    builder.cylinder("matte", colour, {
      radius,
      length: 0.02,
      at: [x, 0.05 + index * 0.012, z],
      segments,
    });
  });
  builder.lathe(
    "paint",
    palette.white,
    [
      [padRadius, 0.08],
      [padRadius + 0.05, 0.1],
      [padRadius + 0.14, 0.08],
      [padRadius + 0.18, 0],
    ],
    [x, 0, z],
    "y",
    segments,
  );
  if (builder.isFar) {
    return;
  }
  jetGroups.forEach((group) => {
    group.jets.forEach(([jetX, jetZ]) => {
      builder.cylinder("metal", palette.steel, {
        radius: 0.08,
        radiusEnd: 0.05,
        length: 0.04,
        at: [group.pivot[0] + jetX, 0.1, group.pivot[2] + jetZ],
        segments: 8,
      });
    });
  });
  for (let slot = -2; slot <= 2; slot++) {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.04, 0.01, 0.34],
      [x + 1.75 + slot * 0.08, 0.09, z + 1.1],
      [0, -0.55, 0],
    );
  }
};

/** A jet: x, z from its part's pivot, and how high it leaps. */
type Jet = [number, number, number];

interface JetGroup {
  name: string;
  pivot: Triple;
  jets: Jet[];
  reach: number;
  period: number;
  phase: number;
}

const ringJets = (count: number, radius: number, height: number): Jet[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + 0.3;
    return [Math.sin(angle) * radius, Math.cos(angle) * radius, height];
  });

const arcJets = (angle: number): Jet[] =>
  [-0.5, 0, 0.5].map((along, index) => [
    Math.cos(angle) * along,
    -Math.sin(angle) * along,
    index === 1 ? 1.45 : 1.05,
  ]);

const outerPivot = (angle: number): Triple => [
  padAt.x + Math.sin(angle) * 1.95,
  0.1,
  padAt.z + Math.cos(angle) * 1.95,
];

const outerAngles = [Math.PI / 4, (Math.PI * 3) / 4, -Math.PI / 4, -2.36];

const jetGroups: JetGroup[] = [
  {
    name: "splash-centre",
    pivot: [padAt.x, 0.1, padAt.z],
    jets: [[0, 0, 2.3], ...ringJets(5, 0.72, 1.25)],
    reach: 2.6,
    period: 2.4,
    phase: 0,
  },
  ...outerAngles.map((angle, index) => ({
    name: `splash-arc-${String(index)}`,
    pivot: outerPivot(angle),
    jets: arcJets(angle),
    reach: 2.2,
    period: 1.6 + index * 0.25,
    phase: index * 1.7 + 0.9,
  })),
];

const buildJets =
  (jets: readonly Jet[]) =>
  (builder: AttractionBuilder): void => {
    jets.forEach(([x, z, height]) => {
      builder.cylinder("water", jetWater, {
        radius: 0.055,
        radiusEnd: 0.075,
        length: height,
        at: [x, height / 2, z],
        segments: 8,
        isOpen: true,
      });
      builder.sphere(
        "water",
        palette.white,
        0.085,
        [x, height, z],
        [1, 1.5, 1],
        builder.isFar ? 6 : 8,
      );
      const fall = 0.25 + height * 0.15;
      builder.painted(
        new ConeGeometry(0.2 + height * 0.08, fall, 12, 1, true),
        (centre) =>
          builder.isFar ||
          Math.floor(
            ((Math.atan2(centre.x - x, centre.z - z) + Math.PI) /
              (Math.PI * 2)) *
              12,
          ) %
            2 ===
            0
            ? { colour: jetWater, finish: "water" }
            : undefined,
        { at: [x, height + 0.04 - fall / 2, z] },
        "water",
      );
    });
  };

/* The arch sprinkler */

const buildArch = (builder: AttractionBuilder) => {
  const { x, z } = archAt;
  const segments = builder.segments(20, 10);
  builder.add(
    "paint",
    archYellow,
    new TorusGeometry(0.95, 0.075, 8, segments, Math.PI),
    { at: [x, 0.05, z] },
  );
  [-0.95, 0.95].forEach((side) => {
    builder.cylinder("paint", poolBand, {
      radius: 0.14,
      radiusEnd: 0.1,
      length: 0.12,
      at: [x + side, 0.06, z],
      segments: 12,
    });
  });
  if (builder.isFar) {
    return;
  }
  [-0.55, 0, 0.55].forEach((along) => {
    const top = 0.05 + Math.sqrt(0.95 * 0.95 - along * along) - 0.06;
    builder.painted(
      new ConeGeometry(0.2, top - 0.05, 10, 1, true),
      (centre) =>
        Math.floor(
          ((Math.atan2(centre.x - x - along, centre.z - z) + Math.PI) /
            (Math.PI * 2)) *
            10,
        ) %
          2 ===
        0
          ? { colour: jetWater, finish: "water" }
          : undefined,
      { at: [x + along, (top + 0.05) / 2, z] },
      "water",
    );
    builder.sphere(
      "metal",
      palette.steel,
      0.04,
      [x + along, top, z],
      [1, 1, 1],
      6,
    );
  });
  builder.cylinder("water", jetWater, {
    radius: 0.9,
    length: 0.01,
    at: [x, 0.03, z],
    segments: 20,
  });
};

/* The changing hut and kiosk */

const buildHut = (builder: AttractionBuilder) => {
  const { x, z } = hutAt;
  const width = 3.6;
  const depth = 1.7;
  const height = 1.75;
  builder.box(
    "matte",
    palette.stone,
    [width + 0.2, 0.12, depth + 0.2],
    [x, 0.06, z],
  );
  builder.painted(
    new BoxGeometry(width, height, depth, builder.isFar ? 1 : 24, 1, 1),
    (centre) =>
      Math.round((centre.x - x) * 6.6) % 2 === 0
        ? hutBlue
        : shade(hutBlue, 0.94),
    { at: [x, 0.12 + height / 2, z] },
    "paint",
    undefined,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      hutTrim,
      [0.1, height, 0.1],
      [x + side * (width / 2), 0.12 + height / 2, z + depth / 2],
    );
  });
  builder.box(
    "paint",
    hutTrim,
    [width + 0.1, 0.1, depth + 0.1],
    [x, 0.12 + height, z],
  );
  const front = z + depth / 2;
  [x - 1.2, x - 0.35].forEach((doorX) => {
    builder.box("paint", fenceBlue, [0.66, 1.14, 0.04], [doorX, 0.69, front]);
    builder.box(
      "paint",
      palette.white,
      [0.54, 1.04, 0.05],
      [doorX, 0.66, front + 0.01],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        fenceBlue,
        [0.3, 0.05, 0.02],
        [doorX, 1.0, front + 0.04],
      );
      builder.sphere(
        "metal",
        palette.brass,
        0.03,
        [doorX + 0.18, 0.66, front + 0.05],
        [1, 1, 1],
        6,
      );
    }
  });
  const hatch = x + 1.0;
  builder.box("glow", "#ffe7b0", [1.0, 0.6, 0.03], [hatch, 1.15, front]);
  builder.box(
    "paint",
    hutTrim,
    [1.25, 0.08, 0.36],
    [hatch, 0.82, front + 0.16],
  );
  builder.painted(
    new BoxGeometry(1.3, 0.04, 0.6, 8, 1, 1),
    (centre) =>
      Math.round((centre.x - hatch) * 6) % 2 === 0 ? padYellow : palette.white,
    { at: [hatch, 1.62, front + 0.27], rotation: [0.35, 0, 0] },
    "matte",
    undefined,
  );
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.65,
    at: [x, 0.12 + height + 0.04, z],
    colour: palette.roofTile,
    overhang: 0.22,
  });
  const gable = new Shape();
  gable.moveTo(-depth / 2, 0);
  gable.lineTo(depth / 2, 0);
  gable.lineTo(0, 0.66);
  gable.closePath();
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      hutBlue,
      new ExtrudeGeometry(gable, { depth: 0.06, bevelEnabled: false }),
      {
        at: [x + side * (width / 2 - 0.03) - 0.03, 0.12 + height + 0.04, z],
        rotation: [0, Math.PI / 2, 0],
      },
      undefined,
    );
  });
  if (builder.isFar) {
    return;
  }
  [-1.1, 0, 1.1].forEach((along) => {
    addWindow(builder, {
      at: [x + along, 1.3, z - depth / 2 - 0.01],
      width: 0.5,
      height: 0.36,
      frame: hutTrim,
      turn: Math.PI,
    });
  });
  [0, 1, 2].forEach((tub) => {
    builder.cylinder("paint", [padYellow, "#f08ca0", "#8fd0a0"][tub], {
      radius: 0.12,
      radiusEnd: 0.1,
      length: 0.22,
      at: [hatch - 0.32 + tub * 0.32, 0.97, front + 0.2],
      segments: 10,
    });
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.05,
    length: 0.5,
    at: [x + width / 2 + 0.35, 1.0, front - 0.2],
    segments: 8,
  });
  builder.box(
    "paint",
    "#e4553f",
    [0.42, 0.5, 0.06],
    [x + width / 2 + 0.35, 1.35, front - 0.2],
  );
  builder.sphere(
    "paint",
    "#fff4d6",
    0.13,
    [x + width / 2 + 0.35, 1.38, front - 0.15],
    [1, 1, 0.3],
    10,
  );
};

/* Around the pool */

const buildParasol = (
  builder: AttractionBuilder,
  at: { x: number; z: number },
  colour: string,
) => {
  const { x, z } = at;
  builder.cylinder("paint", palette.white, {
    radius: 0.5,
    length: 0.05,
    at: [x, 0.62, z],
    segments: 16,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.05,
    length: 0.6,
    at: [x, 0.3, z],
    segments: 8,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.03,
    length: 2.1,
    at: [x, 1.05, z],
    segments: 6,
  });
  const ribs = builder.isFar ? 6 : 12;
  builder.painted(
    new ConeGeometry(1.15, 0.42, ribs, 1, true),
    (centre) => {
      const angle = Math.atan2(centre.x - x, centre.z - z);
      return Math.floor(((angle + Math.PI) / (Math.PI * 2)) * ribs + 0.5) %
        2 ===
        0
        ? colour
        : palette.white;
    },
    { at: [x, 2.0, z] },
    "matte",
    undefined,
  );
  builder.sphere("paint", palette.white, 0.06, [x, 2.24, z], [1, 1, 1], 8);
  if (builder.isFar) {
    return;
  }
  [0, 1, 2].forEach((seat) => {
    const angle = (seat / 3) * Math.PI * 2 + 0.5;
    const seatX = x + Math.sin(angle) * 0.85;
    const seatZ = z + Math.cos(angle) * 0.85;
    builder.box(
      "paint",
      palette.white,
      [0.4, 0.05, 0.4],
      [seatX, 0.36, seatZ],
      [0, angle, 0],
    );
    builder.box(
      "paint",
      palette.white,
      [0.4, 0.38, 0.05],
      [seatX + Math.sin(angle) * 0.2, 0.56, seatZ + Math.cos(angle) * 0.2],
      [-0.12, angle, 0],
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        palette.white,
        [0.04, 0.36, 0.36],
        [
          seatX + Math.cos(angle) * side * 0.17,
          0.18,
          seatZ - Math.sin(angle) * side * 0.17,
        ],
        [0, angle, 0],
      );
    });
  });
};

const buildLounger = (
  builder: AttractionBuilder,
  at: { x: number; z: number },
  turn: number,
  towel: string,
) => {
  const place = (alongX: number, y: number, alongZ: number): Triple => [
    at.x + alongX * Math.cos(turn) + alongZ * Math.sin(turn),
    y,
    at.z - alongX * Math.sin(turn) + alongZ * Math.cos(turn),
  ];
  builder.box("paint", palette.white, [0.62, 0.06, 1.25], place(0, 0.3, 0.2), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", palette.white, [0.62, 0.06, 0.7], place(0, 0.5, -0.65), [
    0.55,
    turn,
    0,
  ]);
  if (builder.isFar) {
    return;
  }
  builder.box("matte", towel, [0.5, 0.03, 1.1], place(0, 0.345, 0.18), [
    0,
    turn,
    0,
  ]);
  builder.box("matte", towel, [0.5, 0.03, 0.6], place(0, 0.54, -0.62), [
    0.55,
    turn,
    0,
  ]);
  [
    [-0.27, 0.7],
    [0.27, 0.7],
    [-0.27, -0.35],
    [0.27, -0.35],
  ].forEach(([legX, legZ]) => {
    builder.box(
      "paint",
      palette.white,
      [0.05, 0.3, 0.05],
      place(legX, 0.15, legZ),
      [0, turn, 0],
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  const segments = builder.segments(56, 28);
  builder.cylinder("matte", paving, {
    radius: fenceRadius - 0.4,
    length: 0.04,
    at: [0, 0.02, 0],
    segments,
  });
  builder.add(
    "matte",
    shade(paving, 0.88),
    new TorusGeometry(fenceRadius - 0.45, 0.06, 3, segments),
    { at: [0, 0.03, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 0.5] },
  );
  builder.box("matte", palette.path, [1.8, 0.05, 2.6], [0, 0.025, fenceRadius]);
  const sides = 22;
  for (let side = 0; side < sides; side++) {
    const from = (side / sides) * Math.PI * 2;
    const to = ((side + 1) / sides) * Math.PI * 2;
    const middle = (from + to) / 2;
    if (Math.abs(Math.atan2(Math.sin(middle), Math.cos(middle))) < 0.12) {
      continue;
    }
    addFence(
      builder,
      { x: Math.sin(from) * fenceRadius, z: Math.cos(from) * fenceRadius },
      { x: Math.sin(to) * fenceRadius, z: Math.cos(to) * fenceRadius },
      { colour: fenceBlue, height: 0.62, spacing: 0.34 },
    );
  }
  [-0.95, 0.95].forEach((side) => {
    builder.cylinder("paint", fenceBlue, {
      radius: 0.08,
      length: 0.9,
      at: [side, 0.45, fenceRadius],
      segments: 10,
    });
    builder.sphere("paint", palette.white, 0.09, [side, 0.95, fenceRadius]);
  });
  addLampPost(builder, [-1.3, 0, 7.3]);
  addLampPost(builder, [1.3, 0, 7.3]);
  addBench(builder, [-6.7, 0, -1.4], Math.PI / 2);
  addBench(builder, [5.4, 0, -4.9], -Math.PI / 4);
  buildParasol(builder, { x: -5.0, z: 3.6 }, "#e4553f");
  buildParasol(builder, { x: -2.4, z: 4.8 }, poolBand);
  buildLounger(builder, { x: 4.6, z: 4.4 }, Math.PI * 0.82, "#f08ca0");
  buildLounger(builder, { x: 6.0, z: 2.9 }, Math.PI * 0.72, padYellow);
  addTree(builder, [-5.7, 0, -5.4], 1.15);
  addTree(builder, [6.8, 0, -1.8], 1.0, "#4a9440");
  addBush(builder, [-7.0, 0, 2.2], 0.5);
  addBush(builder, [3.4, 0, 6.8], 0.45, "#3a7d34");
  addSignBoard(builder, [-2.4, 0, 8.6], poolBand);
};

const blockers: LocalBlocker[] = [
  { x: poolAt.x, z: poolAt.z, radius: 0.45 },
  { x: hutAt.x - 1.2, z: hutAt.z, radius: 0.95 },
  { x: hutAt.x + 0.6, z: hutAt.z, radius: 0.95 },
  { x: hutAt.x + 2.2, z: hutAt.z - 0.1, radius: 0.5 },
  { x: -5.0, z: 3.6, radius: 0.6 },
  { x: -2.4, z: 4.8, radius: 0.6 },
  { x: 4.6, z: 4.4, radius: 0.6 },
  { x: 6.0, z: 2.9, radius: 0.6 },
  { x: -5.7, z: -5.4, radius: 0.4 },
  { x: 6.8, z: -1.8, radius: 0.4 },
  { x: -0.95, z: fenceRadius, radius: 0.2 },
  { x: 0.95, z: fenceRadius, radius: 0.2 },
];

export const splashPoolModel: AttractionModel = {
  kind: "splash-pool",
  name: "Splash Pool",
  fact: "Step near the fountains and watch them leap. On a sunny day the wet ground soon dries, because the sun's warmth turns the water into an invisible gas called water vapour. This is called evaporation.",
  curriculumLink:
    "Science, Year 4: states of matter. Evaporation, and how temperature affects it.",
  footprint: 10,
  setting: "inland",
  signSpot: { x: -2.4, z: 9.5 },
  build: (builder) => {
    buildGrounds(builder);
    buildPool(builder);
    buildSplashPad(builder);
    buildArch(builder);
    buildHut(builder);
  },
  moving: jetGroups.map((group): MovingPart => ({
    name: group.name,
    pivot: group.pivot,
    build: buildJets(group.jets),
    motion: {
      kind: "splash",
      reach: group.reach,
      period: group.period,
      phase: group.phase,
    },
  })),
  blockers,
  tune: [72, 76, 79, 84, 79, 76],
};
