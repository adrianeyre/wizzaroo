import { ConeGeometry } from "three";
import {
  addBush,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addBunting,
  addFlowerClump,
  addGableEnd,
  buildVillager,
  meadowColours,
} from "./village-fete-parts.js";

const tentRed = "#d0383a";
const tentWhite = "#f7f4ec";
const clothBlue = "#3a6fc0";
const tableCloth = "#f2eadc";
const duckYellow = "#f6cf2e";
const poolBlue = "#2f8fd0";
const coconutBrown = "#6a4428";
const ribbonColours = [
  tentRed,
  "#f2c12e",
  "#3a7fd0",
  "#4fae4f",
  "#e86a9a",
  "#f2f2f2",
  "#9a5ad0",
  "#f08a2a",
];
const buntingColours = [tentRed, tentWhite, clothBlue, "#f2c12e", "#4fae4f"];
const signColour = "#3a6fc0";

/* The maypole on the green, its ribbons fanned out */
const maypoleAt = { x: -2.6, z: -0.2 };
const poleHeight = 3.6;
const ribbonReach = 1.7;
const ribbonEnd = 1.38;
const danceRadius = 2.05;

/* The marquee at the back, open at the front */
const marquee = { x: 1.6, z: -4.4, width: 4.6, depth: 2.6, wall: 1.7 };

const tombolaAt = { x: 3.4, z: 1.6 };
const poolAt = { x: 5.4, z: -1.4 };
const poolRadius = 0.95;
const waterLevel = 0.28;
const shyAt = { x: -5.6, z: -3.2 };
const signAt = { x: -1.6, z: 8.4 };

const danceStart = { x: maypoleAt.x, z: maypoleAt.z + danceRadius + 0.2 };
const danceFinish = { x: maypoleAt.x + 2.6, z: maypoleAt.z + 1.4 };

const buildMaypole = (builder: AttractionBuilder) => {
  const { x, z } = maypoleAt;
  builder.cylinder("paint", tentWhite, {
    radius: 0.09,
    radiusEnd: 0.06,
    length: poleHeight,
    at: [x, poleHeight / 2, z],
    segments: 12,
  });
  /* A red stripe spiralling up the pole */
  const turns = builder.isFar ? 0 : 24;
  for (let piece = 0; piece < turns; piece++) {
    const from = piece / turns;
    const to = (piece + 1) / turns;
    const point = (share: number): Triple => [
      x + Math.sin(share * Math.PI * 10) * 0.085,
      0.2 + share * (poleHeight - 0.4),
      z + Math.cos(share * Math.PI * 10) * 0.085,
    ];
    builder.bar("paint", tentRed, point(from), point(to), 0.04, 4);
  }
  /* A garland crown of flowers on top */
  builder.torus(
    "matte",
    meadowColours.leaf,
    0.22,
    0.06,
    [x, poleHeight - 0.05, z],
    "y",
    builder.isFar ? 8 : 16,
  );
  if (!builder.isFar) {
    for (let flower = 0; flower < 8; flower++) {
      const angle = (flower / 8) * Math.PI * 2;
      builder.sphere(
        "matte",
        ribbonColours[flower],
        0.06,
        [
          x + Math.sin(angle) * 0.22,
          poleHeight + 0.02,
          z + Math.cos(angle) * 0.22,
        ],
        [1, 0.7, 1],
        6,
      );
    }
  }
  builder.sphere(
    "paint",
    "#f2c12e",
    0.1,
    [x, poleHeight + 0.08, z],
    [1, 1, 1],
    10,
  );
  /* A ring of daisies trodden round by the dancers */
  builder.cylinder("matte", shade(meadowColours.meadow, 0.9), {
    radius: danceRadius + 0.35,
    length: 0.02,
    at: [x, 0.01, z],
    segments: builder.segments(36, 16),
  });
};

/** The ribbons and their hub, which whirl round as you come near. */
const buildRibbons = (builder: AttractionBuilder) => {
  builder.cylinder("paint", "#f2c12e", {
    radius: 0.14,
    length: 0.1,
    at: [0, 0, 0],
    segments: 12,
  });
  const ribbons = ribbonColours.length;
  for (let ribbon = 0; ribbon < ribbons; ribbon++) {
    const angle = (ribbon / ribbons) * Math.PI * 2;
    const end: Triple = [
      Math.sin(angle) * ribbonReach,
      ribbonEnd - (poleHeight - 0.2),
      Math.cos(angle) * ribbonReach,
    ];
    builder.bar("matte", ribbonColours[ribbon], [0, 0, 0], end, 0.05, 4);
    if (!builder.isFar) {
      builder.box(
        "matte",
        ribbonColours[ribbon],
        [0.07, 0.3, 0.01],
        [end[0], end[1] - 0.12, end[2]],
        [0, angle, 0],
      );
    }
  }
};

const buildMarquee = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = marquee;
  const far = builder.isFar;
  const back = z - depth / 2;
  const front = z + depth / 2;
  /* White canvas walls at the back and sides */
  builder.box("matte", tentWhite, [width, wall, 0.05], [x, wall / 2, back]);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      tentWhite,
      [0.05, wall, depth],
      [x + (side * width) / 2, wall / 2, z],
    );
    addGableEnd(builder, "matte", tentWhite, {
      at: [x + (side * width) / 2, wall, z],
      width: depth,
      rise: 1.0,
      thickness: 0.05,
    });
  });
  /* A striped roof, red and white */
  const stripes = far ? 2 : 8;
  const halfDepth = depth / 2 + 0.15;
  const slope = Math.hypot(halfDepth, 1.0);
  const angle = Math.atan2(1.0, halfDepth);
  for (let stripe = 0; stripe < stripes; stripe++) {
    const stripeX =
      x - width / 2 - 0.1 + ((width + 0.2) / stripes) * (stripe + 0.5);
    [1, -1].forEach((side) => {
      builder.box(
        "matte",
        stripe % 2 === 0 ? tentRed : tentWhite,
        [(width + 0.2) / stripes, 0.05, slope],
        [stripeX, wall + 0.5, z + (side * halfDepth) / 2],
        [side * angle, 0, 0],
      );
    });
  }
  /* Poles, and a scalloped valance along the front */
  [x - width / 2, x, x + width / 2].forEach((poleX) => {
    builder.cylinder("paint", tentWhite, {
      radius: 0.05,
      length: wall + (poleX === x ? 1.25 : 0),
      at: [poleX, (wall + (poleX === x ? 1.25 : 0)) / 2, front],
      segments: 8,
    });
  });
  builder.cylinder("paint", tentWhite, {
    radius: 0.04,
    length: 0.6,
    at: [x, wall + 1.3, z],
    segments: 6,
  });
  builder.add(
    "matte",
    tentRed,
    new ConeGeometry(0.12, 0.35, 3).rotateZ(-Math.PI / 2).scale(1, 1, 0.12),
    {
      at: [x + 0.18, wall + 1.5, z],
    },
  );
  if (far) {
    return;
  }
  for (let scallop = 0; scallop < 14; scallop++) {
    builder.add(
      "matte",
      scallop % 2 === 0 ? tentRed : tentWhite,
      new ConeGeometry(0.17, 0.22, 4).rotateX(Math.PI),
      { at: [x - width / 2 + 0.16 + scallop * 0.33, wall - 0.1, front + 0.1] },
    );
  }
  /* The cake stall inside: trestle tables of cakes, jam and a tea urn */
  builder.box(
    "matte",
    tableCloth,
    [width - 0.6, 0.06, 0.7],
    [x, 0.75, back + 0.6],
  );
  builder.box(
    "matte",
    tableCloth,
    [width - 0.6, 0.7, 0.02],
    [x, 0.4, back + 0.95],
  );
  const cakes: [number, string, number][] = [
    [-1.6, "#f4d6e0", 0.22],
    [-1.0, "#8a5a3a", 0.2],
    [-0.4, "#f2e2a0", 0.24],
    [0.8, "#e8b0c0", 0.18],
  ];
  cakes.forEach(([dx, colour, radius]) => {
    builder.cylinder("paint", palette.white, {
      radius: radius + 0.04,
      length: 0.02,
      at: [x + dx, 0.79, back + 0.6],
      segments: 12,
    });
    builder.cylinder("paint", colour, {
      radius,
      length: 0.16,
      at: [x + dx, 0.88, back + 0.6],
      segments: 12,
    });
    builder.sphere(
      "paint",
      tentRed,
      0.03,
      [x + dx, 0.98, back + 0.6],
      [1, 1, 1],
      6,
    );
  });
  for (let jar = 0; jar < 5; jar++) {
    builder.cylinder("glass", "#b8202a", {
      radius: 0.05,
      length: 0.12,
      at: [
        x + 1.3 + (jar % 3) * 0.13,
        0.84,
        back + 0.5 + Math.floor(jar / 3) * 0.14,
      ],
      segments: 8,
    });
    builder.cylinder("matte", "#f2eadc", {
      radius: 0.055,
      length: 0.03,
      at: [
        x + 1.3 + (jar % 3) * 0.13,
        0.91,
        back + 0.5 + Math.floor(jar / 3) * 0.14,
      ],
      segments: 8,
    });
  }
  builder.cylinder("metal", palette.steel, {
    radius: 0.15,
    length: 0.4,
    at: [x + 0.2, 0.98, back + 0.55],
    segments: 12,
  });
  builder.sphere(
    "metal",
    palette.black,
    0.04,
    [x + 0.2, 1.2, back + 0.55],
    [1, 1, 1],
    6,
  );
  /* A rosette for the best Victoria sponge */
  builder.cylinder("paint", clothBlue, {
    radius: 0.06,
    length: 0.01,
    at: [x - 1.0, 0.98, back + 0.72],
    axis: "z",
    segments: 10,
  });
};

const buildTombola = (builder: AttractionBuilder) => {
  const { x, z } = tombolaAt;
  /* A stall with a blue cloth and an awning, its prizes behind */
  builder.box("matte", clothBlue, [1.8, 0.75, 0.7], [x, 0.375, z]);
  builder.box("matte", tableCloth, [1.84, 0.04, 0.74], [x, 0.77, z]);
  [-0.85, 0.85].forEach((dx) => {
    builder.cylinder("paint", tentWhite, {
      radius: 0.035,
      length: 2.0,
      at: [x + dx, 1.0, z - 0.3],
      segments: 6,
    });
  });
  const stripes = builder.isFar ? 1 : 6;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? clothBlue : tentWhite,
      [1.9 / stripes, 0.03, 0.9],
      [x - 0.95 + (1.9 / stripes) * (stripe + 0.5), 2.0, z + 0.1],
      [0.25, 0, 0],
    );
  }
  /* The drum's stand */
  [-0.3, 0.3].forEach((dx) => {
    builder.bar(
      "metal",
      palette.brass,
      [x + dx, 0.79, z],
      [x + dx, 1.1, z],
      0.04,
      6,
    );
  });
  if (builder.isFar) {
    return;
  }
  const prizes: [number, number, string][] = [
    [-0.6, 0.9, "#f2c12e"],
    [-0.35, 0.95, tentRed],
    [0.45, 0.9, "#4fae4f"],
    [0.65, 0.95, "#e86a9a"],
  ];
  prizes.forEach(([dx, y, colour], index) => {
    if (index % 2 === 0) {
      builder.cylinder("glass", colour, {
        radius: 0.07,
        length: 0.22,
        at: [x + dx, y, z + 0.15],
        segments: 8,
      });
    } else {
      builder.box("paint", colour, [0.18, 0.2, 0.14], [x + dx, y, z + 0.15]);
    }
  });
  /* A teddy bear, the star prize */
  builder.sphere(
    "matte",
    "#b07a4a",
    0.14,
    [x - 0.65, 0.92, z - 0.15],
    [1, 1.1, 0.9],
    10,
  );
  builder.sphere(
    "matte",
    "#b07a4a",
    0.1,
    [x - 0.65, 1.12, z - 0.15],
    [1, 1, 1],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      "#b07a4a",
      0.04,
      [x - 0.65 + side * 0.08, 1.2, z - 0.15],
      [1, 1, 0.6],
      6,
    );
  });
};

/** The tombola drum, which spins as you come near. */
const buildDrum = (builder: AttractionBuilder) => {
  const sides = builder.isFar ? 6 : 8;
  builder.cylinder("paint", "#f2c12e", {
    radius: 0.24,
    length: 0.5,
    at: [0, 0, 0],
    axis: "x",
    segments: sides,
  });
  [-0.26, 0.26].forEach((dx) => {
    builder.cylinder("paint", tentRed, {
      radius: 0.26,
      length: 0.04,
      at: [dx, 0, 0],
      axis: "x",
      segments: sides,
    });
  });
  if (!builder.isFar) {
    builder.box("paint", tentRed, [0.3, 0.02, 0.2], [0, 0.24, 0]);
    builder.bar("metal", palette.brass, [0.28, 0, 0], [0.42, 0, 0], 0.03, 5);
    builder.bar(
      "metal",
      palette.brass,
      [0.42, 0, 0],
      [0.42, -0.15, 0],
      0.03,
      5,
    );
  }
};

const buildDuckPool = (builder: AttractionBuilder) => {
  const { x, z } = poolAt;
  const segments = builder.isFar ? 12 : 24;
  builder.cylinder("paint", poolBlue, {
    radius: poolRadius,
    length: 0.3,
    at: [x, 0.15, z],
    segments,
    isOpen: true,
  });
  builder.torus(
    "paint",
    tentWhite,
    poolRadius,
    0.06,
    [x, 0.3, z],
    "y",
    segments,
  );
  builder.cylinder("water", "#6fc4e8", {
    radius: poolRadius - 0.02,
    length: 0.02,
    at: [x, waterLevel, z],
    segments,
  });
  builder.cylinder("paint", poolBlue, {
    radius: poolRadius - 0.02,
    length: 0.02,
    at: [x, 0.02, z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  /* Rods with hooks, leaning on a little rack */
  builder.box(
    "matte",
    palette.paleTimber,
    [0.06, 0.6, 0.6],
    [x + 1.25, 0.3, z],
  );
  [-0.2, 0, 0.2].forEach((dz) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      [x + 1.25, 0.6, z + dz],
      [x + 1.0, 1.2, z + dz],
      0.025,
      4,
    );
    builder.bar(
      "matte",
      palette.white,
      [x + 1.0, 1.2, z + dz],
      [x + 1.0, 0.9, z + dz],
      0.008,
      3,
    );
  });
};

/** A yellow plastic duck with a ring on its head, bobbing round the pool. */
const buildDuck = (builder: AttractionBuilder) => {
  builder.sphere("paint", duckYellow, 0.11, [0, 0.06, 0], [0.9, 0.7, 1.2], 8);
  builder.sphere("paint", duckYellow, 0.065, [0, 0.16, 0.08], [1, 1, 1], 8);
  builder.box("paint", "#f08a2a", [0.05, 0.02, 0.06], [0, 0.15, 0.15]);
  builder.torus("paint", tentRed, 0.035, 0.01, [0, 0.25, 0.07], "x", 8);
};

const buildCoconutShy = (builder: AttractionBuilder) => {
  const { x, z } = shyAt;
  const turn = Math.PI / 5;
  const place = (dx: number, y: number, dz: number): Triple => [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    y,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  const rotation: Triple = [0, turn, 0];
  /* A striped back cloth to catch the balls, on a timber frame */
  builder.box(
    "matte",
    tentRed,
    [2.4, 1.6, 0.04],
    place(0, 0.95, -0.7),
    rotation,
  );
  if (!builder.isFar) {
    for (let stripe = 0; stripe < 4; stripe++) {
      builder.box(
        "matte",
        tentWhite,
        [0.3, 1.6, 0.02],
        place(-0.9 + stripe * 0.6, 0.95, -0.67),
        rotation,
      );
    }
  }
  [-1.2, 1.2].forEach((dx) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 1.9, 0.08],
      place(dx, 0.95, -0.7),
      rotation,
    );
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [2.5, 0.08, 0.08],
    place(0, 1.85, -0.7),
    rotation,
  );
  /* Coconuts on posts, and a rope to stand behind */
  [-0.8, -0.27, 0.27, 0.8].forEach((dx) => {
    builder.cylinder("matte", palette.paleTimber, {
      radius: 0.035,
      length: 0.9,
      at: place(dx, 0.45, -0.3),
      segments: 6,
    });
    builder.cylinder("metal", palette.steel, {
      radius: 0.08,
      radiusEnd: 0.04,
      length: 0.06,
      at: place(dx, 0.92, -0.3),
      segments: 8,
    });
    builder.sphere(
      "matte",
      coconutBrown,
      0.12,
      place(dx, 1.05, -0.3),
      [1, 1.1, 1],
      9,
    );
  });
  [-1.1, 1.1].forEach((dx) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.04,
      length: 0.75,
      at: place(dx, 0.37, 0.9),
      segments: 6,
    });
  });
  builder.bar(
    "matte",
    tentRed,
    place(-1.1, 0.7, 0.9),
    place(1.1, 0.7, 0.9),
    0.03,
    4,
  );
  if (!builder.isFar) {
    builder.cylinder("metal", palette.steel, {
      radius: 0.18,
      radiusEnd: 0.15,
      length: 0.3,
      at: place(1.5, 0.15, 0.9),
      segments: 10,
    });
    [-0.06, 0.06].forEach((dx) => {
      builder.sphere(
        "paint",
        tentRed,
        0.06,
        place(1.5 + dx, 0.32, 0.9),
        [1, 1, 1],
        6,
      );
    });
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A mown path in from the sign, past the stalls */
  builder.box(
    "matte",
    palette.path,
    [1.4, 0.03, 4.4],
    [signAt.x + 0.3, 0.015, 6.2],
  );
  builder.box("matte", palette.path, [6.0, 0.03, 1.3], [0.7, 0.016, 3.8]);
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  addTree(builder, [-6.6, 0, 2.6], 1.15);
  addTree(builder, [6.4, 0, -5.4], 1.0, "#4a9440");
  /* Bunting strung across the green between tall white poles */
  const poles: Triple[] = [
    [-5.2, 2.4, 3.6],
    [-0.2, 2.4, 2.4],
    [1.4, 2.4, -2.0],
    [5.8, 2.4, 1.4],
  ];
  poles.forEach(([px, height, pz]) => {
    builder.cylinder("paint", tentWhite, {
      radius: 0.05,
      length: height,
      at: [px, height / 2, pz],
      segments: 8,
    });
  });
  for (let span = 0; span < poles.length - 1; span++) {
    addBunting(builder, poles[span], poles[span + 1], buntingColours, 0.3);
  }
  addBunting(
    builder,
    poles[1],
    [maypoleAt.x, poleHeight - 0.4, maypoleAt.z],
    buntingColours,
    0.25,
  );
  if (builder.isFar) {
    return;
  }
  /* Straw bales to sit on, and summer flowers */
  [
    [-4.8, 1.0, 0.4],
    [-0.4, -2.4, 1.2],
    [3.2, 4.8, 0],
  ].forEach(([bx, bz, turn]) => {
    builder.box(
      "matte",
      "#e2c069",
      [1.0, 0.45, 0.5],
      [bx, 0.22, bz],
      [0, turn, 0],
    );
    builder.box(
      "matte",
      "#e07a2a",
      [0.03, 0.47, 0.52],
      [bx + 0.2 * Math.cos(turn), 0.22, bz - 0.2 * Math.sin(turn)],
      [0, turn, 0],
    );
  });
  addBush(builder, [-6.8, 0, -1.4], 0.55);
  addBush(builder, [6.8, 0, 3.6], 0.5, "#3a7d34");
  addFlowerClump(
    builder,
    [-3.6, 0, 5.6],
    [meadowColours.rose, palette.white, meadowColours.butter],
  );
  addFlowerClump(
    builder,
    [2.6, 0, 6.2],
    [meadowColours.cornflower, meadowColours.poppy],
  );
};

/* Hold a ribbon and skip round the maypole, twice, then out */
const danceRide = (progress: number, seconds: number): LocalSpot => {
  const { x, z } = maypoleAt;
  const laps = 2;
  const turn = progress * laps * Math.PI * 2;
  const reach =
    progress > 0.92
      ? danceRadius + ((progress - 0.92) / 0.08) * 0.8
      : danceRadius;
  const skip = 0.12 * Math.abs(Math.sin(seconds * 6));
  const angle = turn * 0.995;
  const point = {
    x: x + Math.sin(angle) * reach,
    z: z + Math.cos(angle) * reach,
  };
  if (progress > 0.97) {
    const share = (progress - 0.97) / 0.03;
    return {
      x: point.x + (danceFinish.x - point.x) * share,
      y: 0,
      z: point.z + (danceFinish.z - point.z) * share,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.03) {
    const share = progress / 0.03;
    return {
      x: danceStart.x + (point.x - danceStart.x) * share,
      y: 0,
      z: danceStart.z + (point.z - danceStart.z) * share,
      heading: Math.PI / 2,
    };
  }
  return { ...point, y: skip, heading: angle + Math.PI / 2 };
};

export const villageFeteModel: NewLandAttractionModel = {
  kind: "village-fete",
  islandId: "meadow-isle",
  name: "Village Fete",
  fact: "A village fete is held in summer, when the days are long and warm. In the UK the longest day of the year is in June, when the Sun is up for more than sixteen hours, and the shortest day is in December, with less than eight. Village fetes often keep a maypole from the spring, when dancing round it on May Day welcomed the summer.",
  curriculumLink:
    "Science, Year 1: seasonal changes. Observe changes across the four seasons, and how day length varies.",
  footprint: 9.5,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildMaypole(builder);
    buildMarquee(builder);
    buildTombola(builder);
    buildDuckPool(builder);
    buildCoconutShy(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "maypole-ribbons",
      pivot: [maypoleAt.x, poleHeight - 0.2, maypoleAt.z],
      build: buildRibbons,
      motion: { kind: "whirl", axis: "y", idle: 0.25, speed: 2.2, reach: 6 },
    },
    {
      name: "tombola-drum",
      pivot: [tombolaAt.x, 1.15, tombolaAt.z],
      build: buildDrum,
      motion: { kind: "whirl", axis: "x", idle: 0, speed: 6, reach: 4 },
    },
    {
      name: "hook-a-duck",
      pivot: [poolAt.x, waterLevel, poolAt.z],
      build: buildDuck,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 0.62,
        count: 4,
        speed: 0.5,
        isFacingAlong: true,
        bob: 0.02,
      },
    },
  ],
  wanderers: [
    {
      name: "villagers",
      build: buildVillager({
        top: "#e8a0b0",
        legs: "#4a5a8a",
        hair: "#7a5030",
        hat: "#f2e2b0",
        isDress: true,
      }),
      count: 4,
      centre: { x: 1.2, z: 1.0 },
      radius: 2.2,
      speed: 0.3,
    },
    {
      name: "children",
      build: buildVillager({
        top: "#4fae4f",
        legs: "#2a3a5a",
        hair: "#2a2018",
        skin: meadowColours.darkSkin,
        size: 0.7,
      }),
      count: 3,
      centre: { x: -1.6, z: 3.0 },
      radius: 1.6,
      speed: 0.5,
    },
  ],
  blockers: [
    { x: tombolaAt.x, z: tombolaAt.z, radius: 0.95 },
    { x: poolAt.x, z: poolAt.z, radius: poolRadius + 0.1 },
  ],
  rides: [
    {
      id: "maypole-dance",
      name: "the maypole dance",
      start: danceStart,
      reach: 0.6,
      seconds: 14,
      finish: danceFinish,
      follow: danceRide,
    },
  ],
  play: {
    label: "Spin the tombola",
    news: "Round and round went the tombola drum, and out came a winning ticket: you won a jar of strawberry jam!",
  },
};
