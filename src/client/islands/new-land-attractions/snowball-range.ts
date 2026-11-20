import { ConeGeometry } from "three";
import {
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type MovingPart,
  type Triple,
  type Wanderers,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef4f8";
const snowShadow = "#d5e2eb";
const frostWhite = "#f8fbfd";
const packedSnow = "#e4edf3";
const faluRed = "#9b2f26";
const trim = "#f1ece0";
const teamRed = "#d8342c";
const teamBlue = "#2f6fb8";
const bullYellow = "#f0b62e";
const pine = "#2d5a40";
const laneBlue = "#9cc8e4";
const signColour = "#d8342c";

/* The throwing booth at the front, the targets at the back */
const booth = { minX: -2.2, maxX: 2.2, minZ: 2.0, maxZ: 2.6, height: 0.9 };
const targetWallZ = -3.6;
const targetWallHeight = 0.7;
const popUpXs = [-1.8, 0, 1.8];
const wheelAt: Triple = [0, 2.3, -5.3];
const snowmanAt: Triple = [2.7, 0, -1.8];
/* A snow fort either side, to stand on and lob snowballs from */
const fortHeight = 0.7;
const stepHeight = 0.35;
const forts = [-1, 1].map((side) => ({
  side,
  minX: side < 0 ? -5.4 : 3.6,
  maxX: side < 0 ? -3.6 : 5.4,
  minZ: -2.0,
  maxZ: 1.0,
  colour: side < 0 ? teamRed : teamBlue,
}));
type Fort = (typeof forts)[number];
const signAt: Triple = [-2.8, 0, 5.3];

const addFir = (builder: AttractionBuilder, x: number, z: number, size = 1) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.1 * size,
    length: 0.5 * size,
    at: [x, 0.25 * size, z],
    segments: 6,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const radius = (0.85 - tier * 0.22) * size;
    const y = (0.5 + tier * 0.55) * size;
    builder.add(
      "matte",
      shade(pine, 1 + tier * 0.07),
      new ConeGeometry(radius, 0.95 * size, builder.segments(9, 6)),
      { at: [x, y + 0.45 * size, z] },
    );
    if (!builder.isFar) {
      builder.add(
        "matte",
        frostWhite,
        new ConeGeometry(radius * 0.55, 0.34 * size, 9),
        { at: [x, y + 0.78 * size, z] },
      );
    }
  }
};

/** A little pyramid of snowballs, ready to throw. */
const addSnowballPile = (builder: AttractionBuilder, at: Triple, rows = 3) => {
  const radius = 0.09;
  for (let row = 0; row < rows; row++) {
    const across = rows - row;
    for (let column = 0; column < across; column++) {
      builder.sphere(
        "matte",
        frostWhite,
        radius,
        [
          at[0] + (column - (across - 1) / 2) * radius * 2,
          at[1] + radius + row * radius * 1.7,
          at[2],
        ],
        [1, 1, 1],
        8,
      );
    }
  }
};

/* ------------------------------------------------------------------ */
/* The throwing booth                                                  */
/* ------------------------------------------------------------------ */

const buildBooth = (builder: AttractionBuilder) => {
  const width = booth.maxX - booth.minX;
  const middleZ = (booth.minZ + booth.maxZ) / 2;
  builder.box(
    "matte",
    faluRed,
    [width, booth.height, booth.maxZ - booth.minZ],
    [0, booth.height / 2, middleZ],
  );
  builder.box(
    "paint",
    trim,
    [width + 0.1, 0.08, booth.maxZ - booth.minZ + 0.16],
    [0, booth.height + 0.04, middleZ],
  );
  /* The striped awning on four posts */
  [booth.minX + 0.05, booth.maxX - 0.05].forEach((x) => {
    [booth.minZ + 0.05, booth.maxZ - 0.05].forEach((z) => {
      builder.box("paint", trim, [0.08, 2.1, 0.08], [x, 1.05, z]);
    });
  });
  const stripes = builder.isFar ? 2 : 8;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? teamRed : frostWhite,
      [width / stripes + 0.01, 0.06, 1.3],
      [booth.minX + (stripe + 0.5) * (width / stripes), 2.2, middleZ + 0.15],
      [0.22, 0, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* A scalloped valance along the front edge */
  for (let scallop = 0; scallop < 11; scallop++) {
    builder.add(
      "matte",
      scallop % 2 === 0 ? teamRed : frostWhite,
      new ConeGeometry(0.2, 0.22, 3).rotateX(Math.PI).scale(1, 1, 0.12),
      { at: [booth.minX + 0.2 + scallop * 0.4, 1.97, booth.maxZ + 0.62] },
    );
  }
  /* Board-and-batten strips, and a name panel */
  for (let strip = 0; strip < 10; strip++) {
    builder.box(
      "matte",
      shade(faluRed, 0.85),
      [0.04, booth.height - 0.1, 0.02],
      [booth.minX + 0.2 + strip * 0.45, booth.height / 2, booth.maxZ + 0.01],
    );
  }
  builder.box(
    "paint",
    bullYellow,
    [1.6, 0.3, 0.03],
    [0, 0.55, booth.maxZ + 0.03],
  );
  [-0.5, 0, 0.5].forEach((x, index) => {
    builder.sphere(
      "paint",
      index === 1 ? teamRed : teamBlue,
      0.08,
      [x, 0.55, booth.maxZ + 0.05],
      [1, 1, 0.3],
      8,
    );
  });
  /* Snowballs piled on the counter, and buckets of them */
  [-1.5, 0, 1.5].forEach((x) => {
    addSnowballPile(builder, [x, booth.height + 0.08, middleZ], 3);
  });
  [-1.95, 1.95].forEach((x, index) => {
    builder.cylinder("paint", index === 0 ? teamRed : teamBlue, {
      radius: 0.2,
      radiusEnd: 0.24,
      length: 0.32,
      at: [x, 0.16, booth.maxZ + 0.35],
      segments: 10,
    });
    builder.sphere(
      "matte",
      frostWhite,
      0.2,
      [x, 0.3, booth.maxZ + 0.35],
      [1, 0.45, 1],
      8,
    );
  });
  /* Lanterns hanging from the awning */
  [booth.minX + 0.3, booth.maxX - 0.3].forEach((x) => {
    builder.box(
      "glow",
      palette.warmLight,
      [0.16, 0.2, 0.16],
      [x, 1.75, booth.maxZ + 0.3],
    );
    builder.cylinder("paint", palette.black, {
      radius: 0.12,
      radiusEnd: 0.02,
      length: 0.1,
      at: [x, 1.9, booth.maxZ + 0.3],
      segments: 6,
    });
  });
};

/* ------------------------------------------------------------------ */
/* The range and its targets                                           */
/* ------------------------------------------------------------------ */

const buildRange = (builder: AttractionBuilder) => {
  /* A low wall of snow blocks, hiding the pop-up targets */
  builder.box(
    "matte",
    packedSnow,
    [6.4, targetWallHeight, 0.5],
    [0, targetWallHeight / 2, targetWallZ],
  );
  builder.box(
    "matte",
    frostWhite,
    [6.5, 0.1, 0.6],
    [0, targetWallHeight + 0.03, targetWallZ],
  );
  /* The frame of the big spinning target */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.16, wheelAt[1] + 0.1, 0.16],
      [side * 1.05, (wheelAt[1] + 0.1) / 2, wheelAt[2] - 0.2],
    );
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [2.3, 0.16, 0.16],
    [0, wheelAt[1] + 1.0, wheelAt[2] - 0.2],
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.05,
    length: 0.4,
    at: [0, wheelAt[1], wheelAt[2] - 0.15],
    axis: "z",
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "matte",
    palette.darkTimber,
    [-1.05, wheelAt[1] + 1.0, wheelAt[2] - 0.2],
    [0, wheelAt[1] + 0.2, wheelAt[2] - 0.2],
    0.08,
    5,
  );
  builder.add(
    "matte",
    teamRed,
    new ConeGeometry(0.15, 0.4, 3).rotateZ(-Math.PI / 2).scale(1, 1, 0.12),
    {
      at: [1.3, wheelAt[1] + 1.4, wheelAt[2] - 0.2],
    },
  );
  builder.cylinder("paint", palette.white, {
    radius: 0.025,
    length: 0.7,
    at: [1.05, wheelAt[1] + 1.4, wheelAt[2] - 0.2],
    segments: 5,
  });
  /* Block joints on the wall, and snowballs stuck to it */
  for (let block = 0; block < 9; block++) {
    builder.box(
      "matte",
      snowShadow,
      [0.03, targetWallHeight - 0.02, 0.52],
      [-3.0 + block * 0.75, targetWallHeight / 2, targetWallZ],
    );
  }
  builder.box(
    "matte",
    snowShadow,
    [6.42, 0.03, 0.52],
    [0, targetWallHeight / 2, targetWallZ],
  );
  [-2.6, -0.9, 0.7, 2.3].forEach((x, index) => {
    builder.sphere(
      "matte",
      frostWhite,
      0.1,
      [x, 0.25 + (index % 2) * 0.2, targetWallZ + 0.26],
      [1.3, 1.3, 0.4],
      8,
    );
  });
  /* Lanes across the snow, with distance flags */
  [-2.6, -0.9, 0.9, 2.6].forEach((x) => {
    builder.box("matte", laneBlue, [0.06, 0.02, 5.4], [x, 0.01, -0.7]);
  });
  [-0.3, -2.0].forEach((z, row) => {
    [-2.6, 2.6].forEach((x) => {
      builder.cylinder("paint", palette.white, {
        radius: 0.025,
        length: 0.9,
        at: [x, 0.45, z],
        segments: 5,
      });
      builder.add(
        "paint",
        row === 0 ? bullYellow : teamRed,
        new ConeGeometry(0.1, 0.32, 3).rotateZ(-Math.PI / 2).scale(1, 1, 0.12),
        { at: [x + 0.17, 0.8, z] },
      );
    });
  });
};

/* ------------------------------------------------------------------ */
/* The snow forts                                                      */
/* ------------------------------------------------------------------ */

const buildFort = (builder: AttractionBuilder, fort: Fort) => {
  const width = fort.maxX - fort.minX;
  const depth = fort.maxZ - fort.minZ;
  const middleX = (fort.minX + fort.maxX) / 2;
  const middleZ = (fort.minZ + fort.maxZ) / 2;
  const outerX = fort.side < 0 ? fort.minX : fort.maxX;
  const innerX = fort.side < 0 ? fort.maxX : fort.minX;
  /* The packed snow platform, and its step at the front */
  builder.box(
    "matte",
    packedSnow,
    [width, fortHeight, depth],
    [middleX, fortHeight / 2, middleZ],
  );
  builder.box(
    "matte",
    packedSnow,
    [width, stepHeight, 0.5],
    [middleX, stepHeight / 2, fort.maxZ + 0.25],
  );
  /* Parapets along the outside and back */
  builder.box(
    "matte",
    frostWhite,
    [0.36, 0.55, depth],
    [outerX - fort.side * 0.18, fortHeight + 0.27, middleZ],
  );
  builder.box(
    "matte",
    frostWhite,
    [width, 0.55, 0.36],
    [middleX, fortHeight + 0.27, fort.minZ + 0.18],
  );
  /* A low parapet on the inside, with a gap to throw through */
  builder.box(
    "matte",
    frostWhite,
    [0.3, 0.4, 1.2],
    [innerX + fort.side * 0.15, fortHeight + 0.2, fort.minZ + 0.6],
  );
  /* Corner turret with a team flag */
  const turretX = outerX - fort.side * 0.3;
  const turretZ = fort.minZ + 0.3;
  builder.cylinder("matte", frostWhite, {
    radius: 0.42,
    length: fortHeight + 0.95,
    at: [turretX, (fortHeight + 0.95) / 2, turretZ],
    segments: builder.segments(12, 6),
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.03,
    length: 1.3,
    at: [turretX, fortHeight + 1.6, turretZ],
    segments: 6,
  });
  builder.box(
    "matte",
    fort.colour,
    [0.02, 0.36, 0.55],
    [turretX, fortHeight + 2.05, turretZ + 0.3],
  );
  if (builder.isFar) {
    return;
  }
  /* Merlons on the parapets and turret, and snow block joints */
  for (let merlon = 0; merlon < 5; merlon++) {
    builder.box(
      "matte",
      packedSnow,
      [0.3, 0.2, 0.3],
      [
        outerX - fort.side * 0.18,
        fortHeight + 0.65,
        fort.minZ + 0.45 + merlon * 0.6,
      ],
    );
  }
  for (let merlon = 0; merlon < 3; merlon++) {
    builder.box(
      "matte",
      packedSnow,
      [0.3, 0.2, 0.3],
      [fort.minX + 0.3 + merlon * 0.6, fortHeight + 0.65, fort.minZ + 0.18],
    );
  }
  for (let merlon = 0; merlon < 6; merlon++) {
    const angle = (merlon / 6) * Math.PI * 2;
    builder.box(
      "matte",
      packedSnow,
      [0.2, 0.22, 0.14],
      [
        turretX + Math.sin(angle) * 0.4,
        fortHeight + 1.04,
        turretZ + Math.cos(angle) * 0.4,
      ],
      [0, angle, 0],
    );
  }
  [0.25, 0.5].forEach((up) => {
    builder.box(
      "matte",
      snowShadow,
      [width + 0.02, 0.03, depth + 0.02],
      [middleX, up, middleZ],
    );
  });
  /* Ammunition: snowballs heaped on the platform */
  addSnowballPile(builder, [middleX, fortHeight, fort.minZ + 0.6], 3);
  addSnowballPile(
    builder,
    [innerX + fort.side * 0.25, fortHeight + 0.4, fort.minZ + 0.6],
    2,
  );
  /* The team's shield on the front */
  builder.cylinder("paint", fort.colour, {
    radius: 0.24,
    length: 0.04,
    at: [middleX, 0.45, fort.maxZ + 0.52],
    axis: "z",
    segments: 12,
  });
  builder.cylinder("paint", frostWhite, {
    radius: 0.12,
    length: 0.05,
    at: [middleX, 0.45, fort.maxZ + 0.52],
    axis: "z",
    segments: 10,
  });
};

/* ------------------------------------------------------------------ */
/* The grounds                                                         */
/* ------------------------------------------------------------------ */

const firs: [number, number, number][] = [
  [-6.2, -4.4, 1.1],
  [6.0, -4.8, 1.0],
  [-3.8, -6.4, 0.9],
  [3.6, -6.8, 0.85],
  [6.6, 2.6, 0.8],
];

const buildGrounds = (builder: AttractionBuilder) => {
  firs.forEach(([x, z, size], index) => {
    if (!builder.isFar || index < 3) {
      addFir(builder, x, z, size);
    }
  });
  if (builder.isFar) {
    return;
  }
  [
    [-6.4, 3.6, 0.5],
    [5.2, 5.0, 0.45],
    [1.6, -6.6, 0.5],
    [-1.8, -6.2, 0.4],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", frostWhite, size, [x, 0, z], [1.6, 0.45, 1.1], 10);
  });
  /* A scoreboard for the two teams */
  const board = { x: 5.0, z: 3.4 };
  [-0.4, 0.4].forEach((dx) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 1.6, 0.07],
      [board.x + dx, 0.8, board.z],
    );
  });
  builder.box(
    "paint",
    "#24384d",
    [1.1, 0.7, 0.05],
    [board.x, 1.35, board.z],
    [0, -0.4, 0],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      side < 0 ? teamRed : teamBlue,
      [0.38, 0.12, 0.02],
      [
        board.x + side * 0.23 * Math.cos(0.4),
        1.6,
        board.z + side * 0.23 * Math.sin(0.4) + 0.03,
      ],
      [0, -0.4, 0],
    );
    builder.box(
      "glow",
      palette.warmLight,
      [0.18, 0.26, 0.02],
      [
        board.x + side * 0.23 * Math.cos(0.4),
        1.3,
        board.z + side * 0.23 * Math.sin(0.4) + 0.03,
      ],
      [0, -0.4, 0],
    );
  });
  /* A sledge full of snowballs, and a spare pair of mittens */
  const sledge = { x: -4.6, z: 3.2 };
  [-0.18, 0.18].forEach((dx) => {
    builder.box(
      "metal",
      palette.steel,
      [0.04, 0.04, 1.0],
      [sledge.x + dx, 0.04, sledge.z],
    );
    builder.bar(
      "metal",
      palette.steel,
      [sledge.x + dx, 0.04, sledge.z + 0.5],
      [sledge.x + dx, 0.22, sledge.z + 0.62],
      0.04,
      4,
    );
  });
  builder.box("paint", teamRed, [0.48, 0.06, 0.9], [sledge.x, 0.2, sledge.z]);
  addSnowballPile(builder, [sledge.x, 0.22, sledge.z - 0.15], 2);
  addSnowballPile(builder, [sledge.x, 0.22, sledge.z + 0.2], 2);
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

/** A bullseye board on a stake, hidden behind the wall till you come near. */
const buildPopUp = (colour: string) => (builder: AttractionBuilder) => {
  builder.box("matte", palette.darkTimber, [0.07, 0.6, 0.07], [0, 0.1, 0]);
  const rings: [number, string][] = [
    [0.32, colour],
    [0.23, frostWhite],
    [0.14, colour],
    [0.06, bullYellow],
  ];
  rings.forEach(([radius, ringColour], index) => {
    builder.cylinder("paint", ringColour, {
      radius,
      length: 0.04 + index * 0.012,
      at: [0, 0.3, 0.04],
      axis: "z",
      segments: 14,
    });
  });
};

/** The big bullseye, spinning faster as you come near. */
const buildWheel = (builder: AttractionBuilder) => {
  const rings = [
    teamRed,
    frostWhite,
    teamBlue,
    frostWhite,
    teamRed,
    bullYellow,
  ];
  rings.forEach((colour, index) => {
    builder.cylinder("paint", colour, {
      radius: 0.85 - index * 0.14,
      length: 0.06 + index * 0.012,
      at: [0, 0, 0.04],
      axis: "z",
      segments: 20,
    });
  });
  if (!builder.isFar) {
    for (let spot = 0; spot < 8; spot++) {
      const angle = (spot / 8) * Math.PI * 2;
      builder.sphere(
        "glow",
        palette.warmLight,
        0.04,
        [Math.sin(angle) * 0.92, Math.cos(angle) * 0.92, 0.05],
        [1, 1, 0.5],
        6,
      );
    }
    builder.sphere(
      "matte",
      frostWhite,
      0.07,
      [0.3, 0.2, 0.12],
      [1.3, 1.3, 0.4],
      8,
    );
  }
};

/** A snowman target, wobbling as you take aim. */
const buildSnowman = (builder: AttractionBuilder) => {
  builder.sphere("matte", frostWhite, 0.42, [0, 0.38, 0], [1, 0.9, 1], 12);
  builder.sphere("matte", frostWhite, 0.3, [0, 0.95, 0], [1, 1, 1], 12);
  builder.sphere("matte", frostWhite, 0.21, [0, 1.38, 0], [1, 1, 1], 10);
  builder.cylinder("paint", palette.black, {
    radius: 0.16,
    radiusEnd: 0.15,
    length: 0.3,
    at: [0, 1.68, 0],
    segments: 10,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.26,
    length: 0.03,
    at: [0, 1.54, 0],
    segments: 10,
  });
  builder.cylinder("paint", teamRed, {
    radius: 0.162,
    length: 0.06,
    at: [0, 1.58, 0],
    segments: 10,
  });
  builder.torus("matte", teamBlue, 0.19, 0.05, [0, 1.17, 0], "y", 10);
  builder.add(
    "paint",
    "#e8762c",
    new ConeGeometry(0.04, 0.2, 6).rotateX(Math.PI / 2),
    {
      at: [0, 1.38, 0.28],
    },
  );
  /* A bullseye painted on its tummy */
  builder.cylinder("paint", teamRed, {
    radius: 0.16,
    length: 0.02,
    at: [0, 0.95, 0.29],
    axis: "z",
    segments: 12,
  });
  builder.cylinder("paint", bullYellow, {
    radius: 0.07,
    length: 0.03,
    at: [0, 0.95, 0.29],
    axis: "z",
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [side * 0.07, 1.45, 0.18],
      [1, 1, 1],
      5,
    );
    builder.bar(
      "matte",
      palette.darkTimber,
      [side * 0.27, 1.0, 0],
      [side * 0.62, 1.3, 0],
      0.035,
      4,
    );
  });
  [0.75, 0.6].forEach((y) => {
    builder.sphere(
      "paint",
      palette.black,
      0.03,
      [0, y + 0.42, 0.28],
      [1, 1, 1],
      5,
    );
  });
};

const popUpColours = [teamRed, teamBlue, "#3f9a4a"];

const moving: MovingPart[] = [
  ...popUpXs.map((x, index): MovingPart => ({
    name: `pop-up target ${String(index + 1)}`,
    pivot: [x, 0.0, targetWallZ - 0.5],
    build: buildPopUp(popUpColours[index]),
    motion: {
      kind: "rise",
      reach: 7,
      height: 0.85,
      period: 1.1 + index * 0.2,
      phase: index * 1.3,
    },
  })),
  {
    name: "spinning bullseye",
    pivot: wheelAt,
    build: buildWheel,
    motion: { kind: "whirl", axis: "z", idle: 0.4, speed: 4, reach: 8 },
  },
  {
    name: "snowman target",
    pivot: snowmanAt,
    build: buildSnowman,
    motion: { kind: "nod", axis: "z", reach: 6, amplitude: 0.18, period: 1.0 },
  },
];

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

const buildThrower =
  (coat: string, hat: string) =>
  (builder: AttractionBuilder): void => {
    [-0.07, 0.07].forEach((side) => {
      builder.box("matte", "#3a2a22", [0.09, 0.1, 0.16], [side, 0.05, 0.02]);
      builder.cylinder("matte", "#2b3442", {
        radius: 0.045,
        length: 0.3,
        at: [side, 0.27, 0],
        segments: 6,
      });
    });
    builder.lathe(
      "matte",
      coat,
      [
        [0, 0.4],
        [0.14, 0.42],
        [0.14, 0.56],
        [0.12, 0.67],
        [0.06, 0.73],
        [0, 0.73],
      ],
      [0, 0, 0],
      "y",
      8,
    );
    /* One arm up, a snowball ready to throw */
    builder.bar("matte", coat, [0.11, 0.67, 0], [0.2, 0.95, -0.05], 0.06, 5);
    builder.bar("matte", coat, [-0.11, 0.67, 0], [-0.3, 0.55, 0.08], 0.06, 5);
    builder.sphere("matte", frostWhite, 0.07, [0.21, 1.0, -0.06], [1, 1, 1], 8);
    builder.torus("matte", hat, 0.07, 0.03, [0, 0.74, 0], "y", 8);
    builder.sphere("matte", "#f0c8a8", 0.1, [0, 0.84, 0], [1, 1, 1], 9);
    builder.lathe(
      "matte",
      hat,
      [
        [0, 0.96],
        [0.07, 0.94],
        [0.105, 0.87],
        [0.108, 0.85],
      ],
      [0, 0, 0],
      "y",
      8,
    );
    if (!builder.isFar) {
      builder.sphere("matte", frostWhite, 0.04, [0, 0.98, 0], [1, 1, 1], 6);
    }
  };

/** A husky, grey and white, with a curly tail. */
const buildHusky = (builder: AttractionBuilder) => {
  const grey = "#7d8792";
  builder.sphere("matte", grey, 0.17, [0, 0.3, 0], [0.8, 0.75, 1.5], 10);
  builder.sphere(
    "matte",
    frostWhite,
    0.13,
    [0, 0.25, 0.06],
    [0.75, 0.6, 1.3],
    8,
  );
  builder.sphere("matte", grey, 0.12, [0, 0.45, 0.28], [0.9, 0.9, 1], 9);
  builder.sphere(
    "matte",
    frostWhite,
    0.07,
    [0, 0.41, 0.37],
    [0.8, 0.7, 1.1],
    8,
  );
  builder.sphere("paint", palette.black, 0.02, [0, 0.43, 0.45], [1, 1, 1], 4);
  builder.torus("matte", grey, 0.07, 0.03, [0, 0.45, -0.28], "x", 8);
  [-1, 1].forEach((side) => {
    builder.add("matte", grey, new ConeGeometry(0.04, 0.1, 4), {
      at: [side * 0.06, 0.58, 0.26],
    });
    if (!builder.isFar) {
      builder.sphere(
        "paint",
        "#6fb6e8",
        0.016,
        [side * 0.05, 0.48, 0.38],
        [1, 1, 1],
        4,
      );
    }
    [-0.16, 0.16].forEach((z) => {
      builder.cylinder("matte", frostWhite, {
        radius: 0.035,
        length: 0.22,
        at: [side * 0.07, 0.11, z],
        segments: 5,
      });
    });
  });
};

const wanderers: Wanderers[] = [
  {
    name: "children throwing snowballs",
    build: buildThrower(teamBlue, teamRed),
    count: 2,
    centre: { x: 0.4, z: 4.2 },
    radius: 1.2,
    speed: 0.7,
    bob: 0.05,
  },
  {
    name: "a husky",
    build: buildHusky,
    count: 1,
    centre: { x: 4.4, z: 5.0 },
    radius: 1.0,
    speed: 0.8,
    bob: 0.04,
  },
];

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

const build = (builder: AttractionBuilder) => {
  buildBooth(builder);
  buildRange(builder);
  forts.forEach((fort) => {
    buildFort(builder, fort);
  });
  buildGrounds(builder);
  addSignBoard(builder, signAt, signColour);
};

const fortDecks: Deck[] = forts.flatMap((fort) => [
  buildFlatDeck(
    { minX: fort.minX, maxX: fort.maxX, minZ: fort.minZ, maxZ: fort.maxZ },
    fortHeight,
    "ground",
  ),
  buildFlatDeck(
    {
      minX: fort.minX,
      maxX: fort.maxX,
      minZ: fort.maxZ,
      maxZ: fort.maxZ + 0.5,
    },
    stepHeight,
    "ground",
  ),
]);

export const snowballRangeModel: NewLandAttractionModel = {
  kind: "snowball-range",
  islandId: "frost-isle",
  name: "Snowball Range",
  fact: "Snow is made of millions of tiny ice crystals. When you squeeze a handful of snow, you change its shape and press the crystals together into a hard ball. Slightly wet snow makes the best snowballs, because a thin layer of water helps the crystals stick together.",
  curriculumLink:
    "Science, Year 2: find out how the shapes of solid objects made from some materials can be changed by squashing, bending, twisting and stretching.",
  footprint: 8,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 0.8 },
  build,
  moving,
  wanderers,
  decks: fortDecks,
  blockers: firs.map(([x, z, size]) => ({
    x,
    z,
    radius: 0.35 * size,
  })) satisfies LocalBlocker[],
  tune: [72, 76, 79, 84, 79, 84],
  play: {
    label: "Throw a snowball",
    news: "Splat! Your snowball flew all the way down the range and hit the bullseye, and every target popped up to cheer.",
    tune: [79, 84, 88, 91],
  },
};
