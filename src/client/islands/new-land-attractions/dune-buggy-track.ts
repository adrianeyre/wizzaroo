import {
  addLampPost,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addArcLathe,
  addGrassTuft,
  addLump,
  addPerson,
  addSheet,
  addTaperedBar,
  followMovingSeat,
  sands,
} from "./date-palm-grove-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const looseSand = "#e6cc94";
const packed = "#caa66c";
const rut = "#b38f58";
const duneSand = "#ecd39b";
const tyre = "#26272a";
const buggyOrange = "#f26b1d";
const cageYellow = "#f4c430";
const garageBlue = "#2f6fb0";
const corrugated = "#b9c2c9";
const signColour = buggyOrange;

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const centre = { x: 0, z: -0.6 };
const lane = 5.2;
const duneRadius = 3.3;
const duneHeight = 1.3;
const garage = { minX: 6.4, maxX: 8.4, minZ: -2.9, maxZ: -0.1, height: 2.0 };
const marshalAngle = -0.42;

const onTrack = (angle: number, radius: number, y = 0): Triple => [
  centre.x + Math.sin(angle) * radius,
  y,
  centre.z + Math.cos(angle) * radius,
];

const findDuneHeight = (x: number, z: number): number => {
  const radius = Math.hypot(x - centre.x, z - centre.z);
  return radius >= duneRadius
    ? 0
    : (duneHeight * (1 + Math.cos((Math.PI * radius) / duneRadius))) / 2;
};

/* ------------------------------------------------------------------ */
/* The track, the tyre walls and the dune                              */
/* ------------------------------------------------------------------ */

const buildTrack = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    packed,
    [
      [lane + 1.3, 0.01],
      [lane + 1.05, 0.025],
      [lane - 1.05, 0.025],
      [lane - 1.3, 0.01],
    ],
    [centre.x, 0, centre.z],
    "y",
    48,
  );
  if (!builder.isFar) {
    [-0.45, 0.45].forEach((offset) => {
      builder.lathe(
        "matte",
        rut,
        [
          [lane + offset + 0.1, 0.032],
          [lane + offset - 0.1, 0.032],
        ],
        [centre.x, 0, centre.z],
        "y",
        48,
      );
    });
    /* Bumps across the lane, each a little ridge of sand. */
    [1.4, 2.6, 3.9, 5.0].forEach((angle) => {
      const [x, , z] = onTrack(angle, lane);
      builder.box(
        "matte",
        shade(packed, 1.08),
        [2.0, 0.08, 0.35],
        [x, 0.03, z],
        [0, angle + Math.PI / 2, 0],
      );
    });
    /* The chequered start line. */
    for (let square = 0; square < 8; square++) {
      builder.box(
        "paint",
        square % 2 === 0 ? palette.black : palette.white,
        [0.25, 0.01, 0.25],
        onTrack(0, lane - 1.0 + 0.125 + square * 0.25, 0.035),
      );
    }
  }
};

const addTyreStack = (
  builder: AttractionBuilder,
  at: Triple,
  index: number,
) => {
  /* Two tyres, one on the other, the lower one painted with a band. */
  builder.cylinder("matte", tyre, {
    radius: 0.28,
    length: 0.42,
    at: [at[0], 0.21, at[2]],
    segments: builder.segments(10, 6),
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("paint", index % 2 === 0 ? palette.white : palette.postRed, {
    radius: 0.29,
    length: 0.08,
    at: [at[0], 0.2, at[2]],
    segments: 10,
    isOpen: true,
  });
};

const buildTyreWalls = (builder: AttractionBuilder) => {
  const outer = builder.isFar ? 10 : 20;
  for (let stack = 0; stack < outer; stack++) {
    const angle = Math.PI * 0.85 + (stack / (outer - 1)) * Math.PI * 1.0;
    addTyreStack(builder, onTrack(angle, lane + 1.5), stack);
  }
  const inner = builder.isFar ? 4 : 8;
  for (let stack = 0; stack < inner; stack++) {
    const angle = Math.PI * 0.6 + (stack / inner) * Math.PI * 1.3;
    addTyreStack(builder, onTrack(angle, lane - 1.45), stack + 1);
  }
};

const buildDune = (builder: AttractionBuilder) => {
  const steps = builder.isFar ? 5 : 10;
  const profile: [number, number][] = [];
  for (let step = steps; step >= 0; step--) {
    const radius = (duneRadius * step) / steps;
    profile.push([radius, findDuneHeight(centre.x + radius, centre.z) + 0.01]);
  }
  builder.lathe("matte", duneSand, profile, [centre.x, 0, centre.z], "y", 32);
  /* A flagpole on the top for whoever climbs it. */
  const top = duneHeight;
  builder.cylinder("metal", palette.steel, {
    radius: 0.035,
    length: 2.0,
    at: [centre.x, top + 1.0, centre.z],
    segments: 6,
  });
  addSheet(builder, "matte", buggyOrange, [
    [centre.x, top + 1.95, centre.z],
    [centre.x + 0.7, top + 1.8, centre.z],
    [centre.x, top + 1.55, centre.z],
  ]);
  if (builder.isFar) {
    return;
  }
  /* Wind ripples and buggy tracks over the dune. */
  for (let ripple = 0; ripple < 6; ripple++) {
    const radius = 0.8 + ripple * 0.4;
    addArcLathe(
      builder,
      "matte",
      shade(duneSand, 0.95),
      [
        [radius + 0.05, findDuneHeight(centre.x + radius, centre.z) + 0.02],
        [
          radius - 0.05,
          findDuneHeight(centre.x + radius - 0.05, centre.z) + 0.02,
        ],
      ],
      [centre.x, 0, centre.z],
      16,
      ripple * 0.9,
      1.4,
    );
  }
  [
    [1.6, -1.0],
    [-2.0, 1.2],
    [0.4, 2.4],
  ].forEach(([dx, dz]) => {
    addGrassTuft(
      builder,
      [
        centre.x + dx,
        findDuneHeight(centre.x + dx, centre.z + dz),
        centre.z + dz,
      ],
      0.9,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The start gantry and the pit garage                                 */
/* ------------------------------------------------------------------ */

const gantryInner = onTrack(0, lane - 1.25);
const gantryOuter = onTrack(0, lane + 1.25);
const gantryHeight = 2.7;

const buildGantry = (builder: AttractionBuilder) => {
  [gantryInner, gantryOuter].forEach(([x, , z]) => {
    builder.box(
      "paint",
      palette.darkSteel,
      [0.16, gantryHeight, 0.16],
      [x, gantryHeight / 2, z],
    );
  });
  builder.box(
    "paint",
    buggyOrange,
    [0.16, 0.5, gantryOuter[2] - gantryInner[2] + 0.2],
    [0, gantryHeight + 0.1, (gantryInner[2] + gantryOuter[2]) / 2],
  );
  builder.box(
    "paint",
    palette.black,
    [0.2, 0.42, 1.2],
    [0, gantryHeight + 0.1, (gantryInner[2] + gantryOuter[2]) / 2],
  );
  if (builder.isFar) {
    return;
  }
  /* Unlit lamps; they glow when someone comes to race. */
  [-0.4, 0, 0.4].forEach((dz) => {
    builder.cylinder("paint", "#3a3c40", {
      radius: 0.12,
      length: 0.06,
      at: [
        0.11,
        gantryHeight + 0.1,
        (gantryInner[2] + gantryOuter[2]) / 2 + dz,
      ],
      axis: "x",
      segments: 10,
    });
  });
  /* Banners on the posts. */
  [gantryInner, gantryOuter].forEach(([x, , z], index) => {
    builder.box(
      "paint",
      index === 0 ? cageYellow : garageBlue,
      [0.04, 1.2, 0.5],
      [x + 0.1, 1.4, z],
    );
  });
};

const buildStartLights = (builder: AttractionBuilder) => {
  ["#ff3b2f", "#ffb22e", "#3bd16f"].forEach((colour, index) => {
    builder.sphere(
      "glow",
      colour,
      0.1,
      [0, 0, (index - 1) * 0.4],
      [0.6, 1, 1],
      10,
    );
  });
};

const buildGarage = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ, height } = garage;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  /* Back and side walls, open to the track on the -x side. */
  builder.box(
    "paint",
    garageBlue,
    [0.12, height, depth],
    [maxX - 0.06, height / 2, (minZ + maxZ) / 2],
  );
  [minZ + 0.06, maxZ - 0.06].forEach((z) => {
    builder.box(
      "paint",
      garageBlue,
      [width, height, 0.12],
      [(minX + maxX) / 2, height / 2, z],
    );
  });
  builder.box(
    "paint",
    palette.white,
    [width + 0.3, 0.3, 0.14],
    [(minX + maxX) / 2, height + 0.15, maxZ + 0.02],
  );
  /* A corrugated roof sloping to the back. */
  const ribs = builder.isFar ? 1 : 9;
  for (let rib = 0; rib < ribs; rib++) {
    builder.box(
      "metal",
      rib % 2 === 0 ? corrugated : shade(corrugated, 0.88),
      [width + 0.5, 0.06, (depth + 0.4) / ribs],
      [
        (minX + maxX) / 2,
        height + 0.2,
        minZ - 0.2 + ((depth + 0.4) * (rib + 0.5)) / ribs,
      ],
      [0, 0, 0.12],
    );
  }
  builder.box(
    "paint",
    palette.darkSteel,
    [0.1, height, 0.1],
    [minX + 0.05, height / 2, minZ + 0.06],
  );
  builder.box(
    "paint",
    palette.darkSteel,
    [0.1, height, 0.1],
    [minX + 0.05, height / 2, maxZ - 0.06],
  );
  builder.box(
    "matte",
    "#9a9a94",
    [width, 0.03, depth],
    [(minX + maxX) / 2, 0.015, (minZ + maxZ) / 2],
  );
  if (builder.isFar) {
    return;
  }
  /* A tool board, a workbench, fuel cans and spare wheels. */
  builder.box(
    "matte",
    palette.paleTimber,
    [0.05, 0.8, 1.6],
    [maxX - 0.14, 1.3, (minZ + maxZ) / 2],
  );
  [-0.5, -0.15, 0.2, 0.55].forEach((dz, index) => {
    builder.box(
      "metal",
      index % 2 === 0 ? palette.steel : palette.postRed,
      [0.04, 0.3, 0.06],
      [maxX - 0.18, 1.3, (minZ + maxZ) / 2 + dz],
      [index * 0.3, 0, 0],
    );
  });
  builder.box(
    "matte",
    palette.timber,
    [0.6, 0.06, 1.8],
    [maxX - 0.45, 0.8, (minZ + maxZ) / 2],
  );
  [-0.8, 0.8].forEach((dz) => {
    builder.box(
      "matte",
      palette.timber,
      [0.5, 0.78, 0.06],
      [maxX - 0.45, 0.39, (minZ + maxZ) / 2 + dz],
    );
  });
  [palette.postRed, cageYellow].forEach((colour, index) => {
    builder.box(
      "paint",
      colour,
      [0.26, 0.38, 0.16],
      [minX + 0.5 + index * 0.35, 0.19, minZ + 0.4],
    );
  });
  [0, 1, 2].forEach((layer) => {
    builder.cylinder("matte", tyre, {
      radius: 0.32,
      length: 0.24,
      at: [maxX - 0.6, 0.12 + layer * 0.25, maxZ - 0.5],
      segments: 12,
    });
  });
  /* A mechanic. */
  addPerson(builder, [minX + 0.9, 0, (minZ + maxZ) / 2 + 0.3], -Math.PI / 2, {
    skin: sands.skinLight,
    cloth: garageBlue,
    head: "cap",
    headColour: buggyOrange,
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  addLampPost(builder, [-2.4, 0, 7.3], 2.4);
  addLampPost(builder, [5.1, 0, 5.6], 2.4);
  /* The marshal's stand. */
  const [x, , z] = onTrack(marshalAngle, lane + 1.7);
  builder.box("matte", palette.paleTimber, [0.8, 0.3, 0.8], [x, 0.15, z]);
  if (builder.isFar) {
    return;
  }
  addPerson(builder, [x, 0.3, z], marshalAngle + Math.PI, {
    skin: sands.skin,
    cloth: buggyOrange,
    head: "cap",
    headColour: palette.white,
  });
  [
    [-7.8, -4.1, 0.5],
    [-4.6, -7.6, 0.4],
    [3.0, -8.4, 0.45],
    [8.4, 3.6, 0.35],
  ].forEach(([lx, lz, size], index) => {
    addLump(
      builder,
      sands.sandstone,
      [lx, size * 0.3, lz],
      [size * 1.4, size * 0.6, size],
      index * 2.3,
    );
  });
  [
    [-8.6, 1.6],
    [6.2, -6.4],
    [-1.0, 8.6],
  ].forEach(([gx, gz]) => {
    addGrassTuft(builder, [gx, 0, gz], 1.1);
  });
};

const buildBuggyTrack = (builder: AttractionBuilder) => {
  buildTrack(builder);
  buildTyreWalls(builder);
  buildDune(builder);
  buildGantry(builder);
  buildGarage(builder);
  buildGrounds(builder);
  addSignBoard(builder, [-3.0, 0, 8.1], signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const buildMarshalFlag = (builder: AttractionBuilder) => {
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.02,
    length: 0.8,
    at: [0, 0.4, 0],
    segments: 5,
  });
  const squares = builder.isFar ? 1 : 4;
  for (let column = 0; column < squares; column++) {
    for (let row = 0; row < squares; row++) {
      builder.box(
        "paint",
        (column + row) % 2 === 0 ? palette.black : palette.white,
        [0.02, 0.5 / squares, 0.6 / squares],
        [
          0,
          0.78 - (row + 0.5) * (0.5 / squares),
          (column + 0.5) * (0.6 / squares),
        ],
      );
    }
  }
};

const addBigWheel = (builder: AttractionBuilder, at: Triple) => {
  builder.cylinder("matte", tyre, {
    radius: 0.33,
    length: 0.26,
    at,
    axis: "x",
    segments: builder.segments(12, 6),
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.17,
    length: 0.28,
    at,
    axis: "x",
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  /* Knobbly tread blocks round the tyre, for grip on loose sand. */
  for (let knob = 0; knob < 6; knob++) {
    const angle = (knob / 6) * Math.PI * 2;
    builder.box(
      "matte",
      tyre,
      [0.27, 0.06, 0.1],
      [at[0], at[1] + Math.cos(angle) * 0.34, at[2] + Math.sin(angle) * 0.34],
      [angle, 0, 0],
    );
  }
};

const buildBuggy = (builder: AttractionBuilder) => {
  /* The tub and the bonnet. */
  builder.box("paint", buggyOrange, [1.0, 0.3, 1.7], [0, 0.45, 0]);
  builder.box(
    "paint",
    shade(buggyOrange, 1.12),
    [1.04, 0.06, 1.74],
    [0, 0.6, 0],
  );
  builder.box(
    "paint",
    shade(buggyOrange, 0.85),
    [0.8, 0.2, 0.5],
    [0, 0.65, 0.75],
    [-0.25, 0, 0],
  );
  builder.box("paint", palette.black, [0.86, 0.06, 0.8], [0, 0.62, -0.2]);
  [-0.6, 0.6].forEach((x) => {
    addBigWheel(builder, [x, 0.33, 0.65]);
    addBigWheel(builder, [x, 0.33, -0.65]);
  });
  /* The roll cage. */
  const cage: [Triple, Triple][] = [
    [
      [-0.42, 0.6, -0.6],
      [-0.38, 1.45, -0.55],
    ],
    [
      [0.42, 0.6, -0.6],
      [0.38, 1.45, -0.55],
    ],
    [
      [-0.38, 1.45, -0.55],
      [0.38, 1.45, -0.55],
    ],
    [
      [-0.42, 0.6, 0.35],
      [-0.35, 1.35, 0.1],
    ],
    [
      [0.42, 0.6, 0.35],
      [0.35, 1.35, 0.1],
    ],
    [
      [-0.35, 1.35, 0.1],
      [0.35, 1.35, 0.1],
    ],
    [
      [-0.38, 1.45, -0.55],
      [-0.35, 1.35, 0.1],
    ],
    [
      [0.38, 1.45, -0.55],
      [0.35, 1.35, 0.1],
    ],
  ];
  cage.forEach(([from, to]) => {
    builder.bar("metal", cageYellow, from, to, 0.05, builder.isFar ? 4 : 6);
  });
  if (builder.isFar) {
    return;
  }
  /* Seats, a spare wheel, lamps, a whip aerial and the driver. */
  [-0.2, 0.2].forEach((x) => {
    builder.box(
      "paint",
      palette.black,
      [0.3, 0.45, 0.08],
      [x, 0.85, -0.45],
      [-0.15, 0, 0],
    );
  });
  builder.cylinder("matte", tyre, {
    radius: 0.25,
    length: 0.18,
    at: [0, 0.75, -0.95],
    axis: "z",
    segments: 10,
  });
  [-0.25, 0.25].forEach((x) => {
    builder.cylinder("glow", palette.warmLight, {
      radius: 0.07,
      length: 0.05,
      at: [x, 1.42, 0.13],
      axis: "z",
      segments: 8,
    });
  });
  addTaperedBar(
    builder,
    "metal",
    palette.darkSteel,
    [0.4, 0.6, -0.8],
    [0.45, 2.0, -0.85],
    0.02,
    0.008,
    4,
  );
  addSheet(builder, "matte", buggyOrange, [
    [0.45, 2.0, -0.85],
    [0.45, 1.8, -0.85],
    [0.47, 1.9, -1.2],
  ]);
  builder.sphere(
    "paint",
    garageBlue,
    0.15,
    [-0.2, 0.85, -0.3],
    [1, 1.2, 0.9],
    8,
  );
  builder.sphere(
    "paint",
    palette.white,
    0.13,
    [-0.2, 1.1, -0.28],
    [1, 1, 1.05],
    10,
  );
  builder.box("glass", "#333a44", [0.16, 0.06, 0.04], [-0.2, 1.1, -0.15]);
};

const marshalSpot = onTrack(marshalAngle, lane + 1.7);
const flagPivot: Triple = [marshalSpot[0] + 0.25, 1.15, marshalSpot[2]];

const buggyPivot: Triple = [centre.x, 0, centre.z];
const buggyMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: lane,
  count: 3,
  speed: -0.6,
  isFacingAlong: true,
  bob: 0.07,
};

const buildLizard = (builder: AttractionBuilder) => {
  const skin = "#9a8a4a";
  builder.sphere("matte", skin, 0.06, [0, 0.05, 0], [0.8, 0.5, 2], 6);
  builder.sphere("matte", skin, 0.04, [0, 0.06, 0.13], [1, 0.8, 1.3], 6);
  addTaperedBar(
    builder,
    "matte",
    skin,
    [0, 0.04, -0.1],
    [0.04, 0.02, -0.3],
    0.03,
    0.005,
    4,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(skin, 0.85),
      [0.14, 0.015, 0.02],
      [0, 0.03, side * 0.05],
      [0, 0.3 * side, 0],
    );
  });
};

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

const lapStart = { x: 1.6, z: 6.5 };
const lapFinish = { x: -1.3, z: 6.5 };

const duneDeck: Deck = ({ x, z }) => {
  const height = findDuneHeight(x, z);
  return height > 0.02 ? { height, kind: "trail" } : undefined;
};

const blockers: LocalBlocker[] = [{ x: centre.x, z: centre.z, radius: 0.15 }];

export const duneBuggyTrackModel: NewLandAttractionModel = {
  kind: "dune-buggy-track",
  islandId: "sunscorch-sands",
  name: "Dune Buggy Track",
  fact: "Dune buggies have huge, knobbly tyres that spread their weight over the soft sand, so they don't sink in. The knobbles grip the sand, and that grip between the tyres and the ground is a force called friction. On slippery or loose surfaces there is less friction, so wheels can spin and dig holes instead of pushing the buggy along!",
  curriculumLink:
    "Science, Year 3: forces and magnets. Compare how things move on different surfaces, and notice that some forces, like friction, need contact between two objects.",
  footprint: 10,
  setting: "inland",
  padColour: looseSand,
  signSpot: { x: -3.0, z: 9.0 },
  build: buildBuggyTrack,
  moving: [
    {
      name: "dune buggies",
      pivot: buggyPivot,
      build: buildBuggy,
      motion: buggyMotion,
    },
    {
      name: "start lights",
      pivot: [0.15, gantryHeight + 0.1, (gantryInner[2] + gantryOuter[2]) / 2],
      build: buildStartLights,
      motion: { kind: "wake", reach: 5 },
    },
    {
      name: "chequered flag",
      pivot: flagPivot,
      build: buildMarshalFlag,
      motion: { kind: "nod", axis: "z", reach: 6, amplitude: 0.7, period: 0.9 },
    },
  ],
  wanderers: [
    {
      name: "lizards",
      build: buildLizard,
      count: 3,
      centre: { x: -6.4, z: 4.6 },
      radius: 1.0,
      speed: 0.6,
    },
  ],
  smoke: [
    {
      at: onTrack(Math.PI * 1.35, lane + 0.3, 0.1),
      colour: "#e8cf98",
      puffs: 7,
      size: 0.35,
      rise: 0.9,
      spread: 1.4,
    },
  ],
  blockers,
  decks: [duneDeck],
  rides: [
    {
      id: "dune-buggy",
      name: "a dune-buggy lap",
      start: lapStart,
      reach: 0.6,
      seconds: 14,
      finish: lapFinish,
      follow: followMovingSeat({
        pivot: buggyPivot,
        motion: buggyMotion,
        seat: [0.2, 0.62, -0.3],
        start: lapStart,
        finish: lapFinish,
      }),
    },
  ],
  play: {
    label: "Rev the engines",
    news: "Vroom vroom! The start lights flashed red, amber, green, and the dune buggies roared off, their knobbly tyres gripping the sand and spraying it everywhere.",
    tune: [55, 59, 62, 67],
  },
};
