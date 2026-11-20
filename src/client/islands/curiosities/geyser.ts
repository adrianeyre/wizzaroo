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

const ashGround = "#5b4a42";
const sinter = "#e8dcc4";
const sinterShadow = "#cbbd9f";
const crustOrange = "#d9822b";
const crustRust = "#a9542a";
const crustYellow = "#e8c14a";
const poolBlue = "#5fc6d9";
const poolDeep = "#2f8fb0";
const jetWhite = "#eef8fb";
const basalt = "#3a3634";
const ropeColour = "#c9a86a";
const boards = "#8b6d4e";
const signColour = "#7a3b22";

const ventAt: Triple = [0, 1.15, -0.8];
const coneBase = 1.65;
const boardwalk = { minX: -1.6, maxX: 1.6, minZ: 3.0, maxZ: 4.0 };
const boardwalkHeight = 0.16;
const ropeRadius = 3.55;

/* Terraced pools stepping down from the cone, each lower and wider */
const terraces = [
  { x: 1.55, z: 0.3, radius: 0.85, height: 0.42 },
  { x: 2.0, z: 1.15, radius: 0.7, height: 0.28 },
  { x: -1.5, z: 0.45, radius: 0.8, height: 0.36 },
  { x: -1.95, z: 1.25, radius: 0.62, height: 0.22 },
  { x: -0.2, z: 1.15, radius: 0.72, height: 0.18 },
];

const buildCone = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    sinter,
    [
      [0, 0],
      [coneBase + 0.25, 0],
      [coneBase, 0.18],
      [coneBase * 0.72, 0.55],
      [0.62, 0.95],
      [0.46, ventAt[1]],
      [0.3, ventAt[1] - 0.02],
      [0.22, ventAt[1] - 0.25],
      [0, ventAt[1] - 0.25],
    ],
    [ventAt[0], 0, ventAt[2]],
    "y",
    builder.isFar ? 12 : 26,
  );
  if (builder.isFar) {
    return;
  }
  /* Crusty rings of mineral round the cone, orange where microbes grow */
  [
    { height: 0.22, radius: coneBase - 0.04, colour: crustOrange },
    { height: 0.5, radius: coneBase * 0.76, colour: crustRust },
    { height: 0.82, radius: 0.74, colour: crustYellow },
    { height: ventAt[1] - 0.02, radius: 0.4, colour: sinterShadow },
  ].forEach(({ height, radius, colour }) => {
    builder.torus(
      "matte",
      colour,
      radius,
      0.06,
      [ventAt[0], height, ventAt[2]],
      "y",
      18,
    );
  });
  /* Knobbly geyserite beads on the cone's flanks */
  for (let bead = 0; bead < 14; bead++) {
    const angle = bead * 2.4;
    const up = 0.15 + (bead % 4) * 0.2;
    const radius = coneBase - up * 0.9;
    builder.sphere(
      "matte",
      bead % 3 === 0 ? crustOrange : shade(sinter, 0.93),
      0.1 + (bead % 3) * 0.03,
      [
        ventAt[0] + Math.sin(angle) * radius,
        up,
        ventAt[2] + Math.cos(angle) * radius,
      ],
      [1, 0.6, 1],
      6,
    );
  }
  /* Wet, glistening water in the vent's throat */
  builder.cylinder("water", poolDeep, {
    radius: 0.3,
    length: 0.04,
    at: [ventAt[0], ventAt[1] - 0.12, ventAt[2]],
    segments: 18,
  });
  /* A run-off channel down the front of the cone */
  builder.bar(
    "water",
    poolBlue,
    [ventAt[0] + 0.1, ventAt[1] - 0.05, ventAt[2] + 0.45],
    [ventAt[0] + 0.25, 0.5, ventAt[2] + 1.3],
    0.12,
    6,
  );
};

const buildTerraces = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 8 : 20;
  terraces.forEach(({ x, z, radius, height }, index) => {
    builder.cylinder("matte", index % 2 === 0 ? sinter : sinterShadow, {
      radius: radius + 0.08,
      radiusEnd: radius,
      length: height,
      at: [x, height / 2, z],
      segments,
    });
    builder.cylinder("water", index < 2 ? poolBlue : poolDeep, {
      radius: radius - 0.1,
      length: 0.03,
      at: [x, height + 0.005, z],
      segments,
    });
    if (builder.isFar) {
      return;
    }
    /* Orange microbe mats round the rim, and drips over the lip */
    builder.torus(
      "matte",
      index % 2 === 0 ? crustOrange : crustRust,
      radius - 0.05,
      0.05,
      [x, height, z],
      "y",
      16,
    );
    for (let drip = 0; drip < 5; drip++) {
      const angle = drip * 1.25 + index;
      builder.box(
        "matte",
        drip % 2 === 0 ? crustYellow : sinterShadow,
        [0.08, height * 0.8, 0.05],
        [
          x + Math.sin(angle) * (radius + 0.06),
          height * 0.5,
          z + Math.cos(angle) * (radius + 0.06),
        ],
        [0, angle, 0],
      );
    }
    /* A bubble or two breaking the surface */
    builder.sphere(
      "water",
      jetWhite,
      0.05,
      [x + radius * 0.3, height + 0.03, z - radius * 0.2],
      [1, 0.5, 1],
      6,
    );
  });
};

const buildRopeFence = (builder: AttractionBuilder) => {
  const posts = builder.isFar ? 0 : 11;
  const from = -1.95;
  const to = 1.95;
  const spotAt = (share: number) => {
    const angle = from + (to - from) * share;
    return {
      x: Math.sin(angle) * ropeRadius,
      z: ventAt[2] + Math.cos(angle) * ropeRadius,
    };
  };
  for (let post = 0; post < posts; post++) {
    const { x, z } = spotAt(post / (posts - 1));
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.05,
      length: 0.75,
      at: [x, 0.375, z],
      segments: 8,
    });
    builder.cylinder("matte", palette.timber, {
      radius: 0.07,
      radiusEnd: 0.03,
      length: 0.06,
      at: [x, 0.78, z],
      segments: 8,
    });
    if (post === posts - 1) {
      continue;
    }
    /* Two sagging rope swags between posts */
    const next = spotAt((post + 1) / (posts - 1));
    const middle = { x: (x + next.x) / 2, z: (z + next.z) / 2 };
    builder.bar(
      "matte",
      ropeColour,
      [x, 0.66, z],
      [middle.x, 0.52, middle.z],
      0.035,
      5,
    );
    builder.bar(
      "matte",
      ropeColour,
      [middle.x, 0.52, middle.z],
      [next.x, 0.66, next.z],
      0.035,
      5,
    );
  }
};

const buildBoardwalk = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = boardwalk;
  builder.box(
    "matte",
    boards,
    [maxX - minX, boardwalkHeight, maxZ - minZ],
    [(minX + maxX) / 2, boardwalkHeight / 2, (minZ + maxZ) / 2],
  );
  if (builder.isFar) {
    return;
  }
  for (let plank = 0; plank < 12; plank++) {
    const x = minX + 0.13 + plank * ((maxX - minX - 0.26) / 11);
    builder.box(
      "matte",
      shade(boards, plank % 2 === 0 ? 1.1 : 0.9),
      [0.2, 0.02, maxZ - minZ - 0.04],
      [x, boardwalkHeight + 0.01, (minZ + maxZ) / 2],
    );
  }
  /* An eruption board: a clock face that shows the next eruption */
  const boardAt: Triple = [-1.25, 0, maxZ - 0.15];
  [-0.25, 0.25].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.06, 1.3, 0.06],
      [boardAt[0] + side, boardwalkHeight + 0.65, boardAt[2]],
    );
  });
  builder.box(
    "paint",
    "#2f4f5f",
    [0.7, 0.55, 0.06],
    [boardAt[0], boardwalkHeight + 1.05, boardAt[2] - 0.04],
  );
  builder.cylinder("paint", palette.cream, {
    radius: 0.18,
    length: 0.02,
    at: [boardAt[0], boardwalkHeight + 1.05, boardAt[2] - 0.08],
    axis: "z",
    segments: 20,
  });
  builder.box(
    "paint",
    palette.black,
    [0.02, 0.14, 0.01],
    [boardAt[0], boardwalkHeight + 1.1, boardAt[2] - 0.1],
  );
  builder.box(
    "paint",
    palette.black,
    [0.1, 0.02, 0.01],
    [boardAt[0] + 0.05, boardwalkHeight + 1.05, boardAt[2] - 0.1],
  );
};

const buildRocks = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [
    [-3.4, -1.6, 0.45],
    [-2.9, -2.6, 0.32],
    [3.3, -1.9, 0.5],
    [3.7, -0.8, 0.3],
    [2.7, -3.0, 0.38],
    [-3.7, 1.9, 0.28],
    [3.6, 2.2, 0.26],
    [0.8, -3.6, 0.34],
    [-1.2, -3.5, 0.4],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? basalt : shade(basalt, 1.25),
      size,
      [x, size * 0.45, z],
      [1.2, 0.75, 1],
      7,
    );
  });
  /* Little steaming vents in the ground, rimmed with yellow sulphur */
  [
    [-2.6, -0.9],
    [2.8, -0.2],
    [1.1, -2.9],
  ].forEach(([x, z]) => {
    builder.torus("matte", crustYellow, 0.16, 0.05, [x, 0.03, z], "y", 10);
    builder.cylinder("matte", palette.black, {
      radius: 0.12,
      length: 0.02,
      at: [x, 0.02, z],
      segments: 12,
    });
  });
};

/** The water column: tall, foamy, and fanning out at the top. */
const buildJet = (builder: AttractionBuilder) => {
  builder.cylinder("water", jetWhite, {
    radius: 0.26,
    radiusEnd: 0.15,
    length: 2.2,
    at: [0, 1.1, 0],
    segments: 14,
  });
  builder.cylinder("water", shade(poolBlue, 1.2), {
    radius: 0.15,
    radiusEnd: 0.32,
    length: 1.8,
    at: [0, 3.1, 0],
    segments: 14,
  });
  /* Foamy puffs up the column and a spray crown on top */
  [
    [0, 0.5, 0, 0.32],
    [0.1, 1.3, 0.05, 0.24],
    [-0.08, 2.1, -0.04, 0.22],
    [0.05, 3.0, 0.06, 0.28],
    [0, 4.0, 0, 0.42],
    [0.35, 3.8, 0.1, 0.24],
    [-0.32, 3.85, -0.12, 0.26],
    [0.1, 3.75, -0.36, 0.22],
    [-0.1, 3.7, 0.34, 0.22],
  ].forEach(([x, y, z, radius]) => {
    builder.sphere("water", jetWhite, radius, [x, y, z], [1, 0.85, 1], 9);
  });
};

/** Smaller spurts round the vent, fanning outwards. */
const buildSpurts = (builder: AttractionBuilder) => {
  for (let spurt = 0; spurt < 6; spurt++) {
    const angle = (spurt / 6) * Math.PI * 2;
    const out = 0.7;
    builder.bar(
      "water",
      jetWhite,
      [Math.sin(angle) * 0.2, 0, Math.cos(angle) * 0.2],
      [Math.sin(angle) * out, 1.5, Math.cos(angle) * out],
      0.08,
      6,
    );
    builder.sphere(
      "water",
      jetWhite,
      0.1,
      [Math.sin(angle) * out, 1.5, Math.cos(angle) * out],
      [1, 1, 1],
      6,
    );
  }
};

/** A dome of water that swells in the pool, as it does before an eruption. */
const buildDome = (builder: AttractionBuilder) => {
  builder.sphere("water", poolBlue, 0.32, [0, 0, 0], [1, 0.55, 1], 12);
  builder.torus("water", jetWhite, 0.3, 0.04, [0, 0, 0], "y", 12);
};

export const geyserModel: CuriosityModel = {
  kind: "geyser",
  islandId: "ember-isle",
  name: "Geyser",
  fact: "A geyser is a hot spring that shoots water high into the air. Rainwater trickles deep underground, where hot rock near magma heats it until it boils. The steam and boiling water burst up through a narrow pipe in a fountain, then the pipe slowly fills up again. Geysers are found in volcanic places like Iceland and Yellowstone.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of physical geography, including volcanoes and earthquakes.",
  footprint: 5,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: 2.4, z: 4.1 },
  build: (builder) => {
    buildCone(builder);
    buildTerraces(builder);
    buildRopeFence(builder);
    buildBoardwalk(builder);
    buildRocks(builder);
    if (builder.isFar) {
      builder.cylinder("water", jetWhite, {
        radius: 0.22,
        radiusEnd: 0.12,
        length: 1.2,
        at: [ventAt[0], ventAt[1] + 0.6, ventAt[2]],
        segments: 8,
      });
    }
    addSignBoard(builder, [2.4, 0, 4.1], signColour);
  },
  moving: [
    {
      name: "water jet",
      pivot: [ventAt[0], ventAt[1] - 0.1, ventAt[2]],
      build: buildJet,
      motion: { kind: "splash", reach: 8, period: 2.6 },
    },
    {
      name: "spurts",
      pivot: [ventAt[0], ventAt[1] - 0.1, ventAt[2]],
      build: buildSpurts,
      motion: { kind: "splash", reach: 8, period: 1.7, phase: 1.4 },
    },
    {
      name: "swelling dome",
      pivot: [terraces[0].x, terraces[0].height - 0.12, terraces[0].z],
      build: buildDome,
      motion: { kind: "rise", reach: 7, height: 0.14, period: 1.3 },
    },
  ],
  smoke: [
    {
      at: [ventAt[0], ventAt[1] + 0.3, ventAt[2]],
      colour: "#e8ecef",
      puffs: 7,
      size: 0.3,
      rise: 2.8,
      spread: 0.6,
    },
  ],
  decks: [buildFlatDeck(boardwalk, boardwalkHeight, "bridge")],
  blockers: [
    { x: ventAt[0], z: ventAt[2], radius: ropeRadius - 0.1 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Wait for the eruption",
    news: "Rumble... WHOOSH! Boiling water blasted high into the sky and warm spray drifted down like rain.",
  },
};
