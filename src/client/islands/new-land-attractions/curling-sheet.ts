import { ConeGeometry } from "three";
import {
  addBench,
  addLampPost,
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type MovingPart,
  type Triple,
  type Wanderers,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef4f8";
const snowShadow = "#d5e2eb";
const frostWhite = "#f8fbfd";
const ice = "#e2f2fa";
const houseBlue = "#2f6fb8";
const houseRed = "#d8342c";
const lineRed = "#c8102e";
const lineBlue = "#3d6fa8";
const granite = "#7c8086";
const stoneRed = "#d8342c";
const stoneYellow = "#f0c02e";
const faluRed = "#9b2f26";
const trim = "#f1ece0";
const roofSlate = "#3b4450";
const tartanGreen = "#2f5e45";
const pine = "#2d5a40";
const signColour = "#1f4f8f";

/* The long sheet of ice, with a house (target) at each end */
const sheet = { minX: -1.3, maxX: 1.3, minZ: -6.4, maxZ: 4.0 };
const iceTop = 0.06;
const nearHouseZ = 2.4;
const farHouseZ = -4.8;
const clubhouse = { minX: 3.0, maxX: 6.2, minZ: -4.4, maxZ: -0.6 };
const wallHeight = 1.8;
const rideStart = { x: 0, z: 5.0 };
const rideFinish = { x: -2.1, z: -5.2 };
const signAt: Triple = [-2.6, 0, 5.4];

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

/** A granite curling stone with a coloured handle, standing at `at`. */
const addStone = (builder: AttractionBuilder, at: Triple, handle: string) => {
  const [x, y, z] = at;
  builder.lathe(
    "paint",
    granite,
    [
      [0, 0],
      [0.13, 0.0],
      [0.19, 0.04],
      [0.2, 0.08],
      [0.19, 0.13],
      [0.14, 0.16],
      [0, 0.16],
    ],
    [x, y, z],
    "y",
    12,
  );
  builder.cylinder("paint", shade(granite, 0.75), {
    radius: 0.201,
    length: 0.03,
    at: [x, y + 0.085, z],
    segments: 12,
  });
  builder.box("paint", handle, [0.06, 0.06, 0.2], [x, y + 0.2, z + 0.03]);
  if (!builder.isFar) {
    builder.cylinder("paint", handle, {
      radius: 0.03,
      length: 0.05,
      at: [x, y + 0.17, z - 0.06],
      segments: 6,
    });
  }
};

/* ------------------------------------------------------------------ */
/* The sheet                                                           */
/* ------------------------------------------------------------------ */

const addHouse = (builder: AttractionBuilder, z: number) => {
  const rings: [number, string][] = [
    [0.9, houseBlue],
    [0.62, frostWhite],
    [0.36, houseRed],
    [0.12, frostWhite],
  ];
  rings.forEach(([radius, colour], index) => {
    builder.cylinder("paint", colour, {
      radius,
      length: 0.01,
      at: [0, iceTop + 0.004 + index * 0.003, z],
      segments: builder.segments(28, 14),
    });
  });
};

const buildSheet = (builder: AttractionBuilder) => {
  const width = sheet.maxX - sheet.minX;
  const length = sheet.maxZ - sheet.minZ;
  const middleZ = (sheet.minZ + sheet.maxZ) / 2;
  builder.box("glass", ice, [width, iceTop, length], [0, iceTop / 2, middleZ]);
  /* Low boards all round, painted white with a blue cap */
  [sheet.minX - 0.05, sheet.maxX + 0.05].forEach((x) => {
    builder.box("paint", trim, [0.1, 0.24, length + 0.2], [x, 0.12, middleZ]);
  });
  [sheet.minZ - 0.05, sheet.maxZ + 0.05].forEach((z) => {
    builder.box("paint", trim, [width + 0.2, 0.24, 0.1], [0, 0.12, z]);
  });
  addHouse(builder, nearHouseZ);
  addHouse(builder, farHouseZ);
  if (builder.isFar) {
    return;
  }
  [sheet.minX - 0.05, sheet.maxX + 0.05].forEach((x) => {
    builder.box(
      "paint",
      houseBlue,
      [0.12, 0.04, length + 0.22],
      [x, 0.25, middleZ],
    );
  });
  [sheet.minZ - 0.05, sheet.maxZ + 0.05].forEach((z) => {
    builder.box("paint", houseBlue, [width + 0.22, 0.04, 0.12], [0, 0.25, z]);
  });
  /* The lines: centre, tee lines, back lines and red hog lines */
  builder.box(
    "paint",
    lineBlue,
    [0.025, 0.004, length - 0.6],
    [0, iceTop + 0.016, middleZ],
  );
  [nearHouseZ, farHouseZ].forEach((z, index) => {
    const out = index === 0 ? 1 : -1;
    builder.box(
      "paint",
      lineBlue,
      [width - 0.1, 0.004, 0.025],
      [0, iceTop + 0.016, z],
    );
    builder.box(
      "paint",
      lineBlue,
      [width - 0.1, 0.004, 0.025],
      [0, iceTop + 0.016, z + out * 0.9],
    );
    builder.box(
      "paint",
      lineRed,
      [width - 0.1, 0.004, 0.06],
      [0, iceTop + 0.004, z - out * 2.1],
    );
    /* The hack, a rubber foothold to push off from */
    builder.box(
      "matte",
      palette.black,
      [0.36, 0.05, 0.16],
      [0, iceTop + 0.025, z + out * 1.2],
    );
  });
  /* Stones waiting along the side, red team and yellow team */
  for (let stone = 0; stone < 4; stone++) {
    addStone(
      builder,
      [sheet.maxX - 0.25, iceTop, 3.6 - stone * 0.45],
      stoneRed,
    );
    addStone(
      builder,
      [sheet.minX + 0.25, iceTop, 3.6 - stone * 0.45],
      stoneYellow,
    );
  }
  /* Two stones already in the far house */
  addStone(builder, [0.45, iceTop, farHouseZ + 0.2], stoneRed);
  addStone(builder, [-0.3, iceTop, farHouseZ - 0.5], stoneYellow);
};

/* ------------------------------------------------------------------ */
/* The clubhouse                                                       */
/* ------------------------------------------------------------------ */

const buildClubhouse = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = clubhouse;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const x = (minX + maxX) / 2;
  const z = (minZ + maxZ) / 2;
  builder.box(
    "matte",
    palette.darkStone,
    [width + 0.1, 0.2, depth + 0.1],
    [x, 0.1, z],
  );
  builder.box(
    "matte",
    faluRed,
    [width, wallHeight, depth],
    [x, 0.2 + wallHeight / 2, z],
  );
  /* A steep roof, ridge along z, with snow on it */
  const rise = 1.3;
  const half = width / 2 + 0.3;
  const slope = Math.hypot(half, rise);
  const angle = Math.atan2(rise, half);
  const eaves = 0.2 + wallHeight;
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      roofSlate,
      [slope + 0.02, 0.12, depth + 0.5],
      [x + (side * half) / 2, eaves + rise / 2, z],
      [0, 0, -side * angle],
    );
    builder.box(
      "matte",
      frostWhite,
      [slope * 0.8, 0.09, depth + 0.52],
      [x + (side * half) / 2 + side * 0.06, eaves + rise / 2 + 0.08, z],
      [0, 0, -side * angle],
    );
  });
  [minZ + 0.02, maxZ - 0.02].forEach((endZ) => {
    builder.add(
      "matte",
      faluRed,
      new ConeGeometry(width / 2, rise, 4, 1)
        .rotateY(Math.PI / 4)
        .scale(1.41, 1, 0.06),
      { at: [x, eaves + rise / 2, endZ] },
    );
  });
  /* The chimney */
  builder.box(
    "matte",
    palette.brick,
    [0.4, 1.4, 0.4],
    [x + 0.7, eaves + 1.0, minZ + 0.8],
  );
  /* Big windows looking out over the ice, glowing warm */
  [-1.0, 0.2].forEach((dz) => {
    builder.box(
      "glow",
      palette.warmLight,
      [0.04, 0.8, 0.9],
      [minX - 0.01, 1.2, z + dz],
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    palette.darkBrick,
    [0.48, 0.12, 0.48],
    [x + 0.7, eaves + 1.74, minZ + 0.8],
  );
  /* Board-and-batten strips and white corners */
  for (let strip = 0; strip < 12; strip++) {
    const stripZ = minZ + 0.15 + strip * 0.32;
    builder.box(
      "matte",
      shade(faluRed, 0.84),
      [0.03, wallHeight - 0.05, 0.05],
      [maxX + 0.01, 0.2 + wallHeight / 2, stripZ],
    );
  }
  [minX, maxX].forEach((cornerX) => {
    [minZ, maxZ].forEach((cornerZ) => {
      builder.box(
        "paint",
        trim,
        [0.12, wallHeight, 0.12],
        [cornerX, 0.2 + wallHeight / 2, cornerZ],
      );
    });
  });
  [-1.0, 0.2].forEach((dz) => {
    const windowZ = z + dz;
    builder.box(
      "paint",
      trim,
      [0.07, 0.07, 1.02],
      [minX - 0.03, 1.62, windowZ],
    );
    builder.box(
      "paint",
      trim,
      [0.07, 0.07, 1.02],
      [minX - 0.03, 0.78, windowZ],
    );
    builder.box("paint", trim, [0.07, 0.86, 0.06], [minX - 0.03, 1.2, windowZ]);
    builder.box("paint", trim, [0.14, 0.05, 1.1], [minX - 0.06, 0.74, windowZ]);
    /* Window boxes with little snowy firs */
    builder.box(
      "matte",
      palette.darkTimber,
      [0.2, 0.14, 0.8],
      [minX - 0.12, 0.66, windowZ],
    );
    builder.sphere(
      "matte",
      frostWhite,
      0.12,
      [minX - 0.12, 0.74, windowZ],
      [0.8, 0.5, 3],
      8,
    );
  });
  /* The front door and porch, facing the visitors */
  builder.box(
    "paint",
    tartanGreen,
    [0.7, 1.3, 0.05],
    [x - 0.4, 0.85, maxZ + 0.02],
  );
  builder.box("paint", trim, [0.84, 0.08, 0.08], [x - 0.4, 1.54, maxZ + 0.04]);
  builder.sphere(
    "metal",
    palette.brass,
    0.035,
    [x - 0.15, 0.85, maxZ + 0.06],
    [1, 1, 1],
    6,
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.6, 0.6, 0.04],
    [x + 0.8, 1.2, maxZ + 0.01],
  );
  builder.box("paint", trim, [0.7, 0.06, 0.08], [x + 0.8, 0.88, maxZ + 0.04]);
  builder.box(
    "matte",
    palette.timber,
    [width + 0.2, 0.08, 0.9],
    [x, 0.24, maxZ + 0.45],
  );
  builder.box(
    "paint",
    tartanGreen,
    [1.6, 0.4, 0.04],
    [x, eaves + 0.5, maxZ + 0.02],
  );
  builder.box(
    "paint",
    stoneYellow,
    [1.4, 0.06, 0.045],
    [x, eaves + 0.5, maxZ + 0.025],
  );
  /* Brooms leaning by the door, and a rack of spare stones */
  [0, 1, 2].forEach((broom) => {
    const broomX = x + 1.3 + broom * 0.14;
    builder.bar(
      "matte",
      palette.paleTimber,
      [broomX, 0.25, maxZ + 0.3],
      [broomX - 0.05, 1.3, maxZ + 0.08],
      0.035,
      4,
    );
    builder.box(
      "matte",
      broom % 2 === 0 ? houseRed : houseBlue,
      [0.1, 0.06, 0.28],
      [broomX, 0.3, maxZ + 0.35],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The grounds                                                         */
/* ------------------------------------------------------------------ */

const firs: [number, number, number][] = [
  [-4.6, -5.6, 1.2],
  [5.4, -6.4, 1.0],
  [-6.2, -1.6, 0.9],
  [7.0, 1.4, 0.85],
  [-5.6, 2.6, 0.8],
];

const scoreboardAt = { x: 0, z: -7.4 };

const buildGrounds = (builder: AttractionBuilder) => {
  firs.forEach(([x, z, size], index) => {
    if (!builder.isFar || index < 3) {
      addFir(builder, x, z, size);
    }
  });
  /* The scoreboard behind the far end */
  [-1.0, 1.0].forEach((dx) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.12, 1.9, 0.12],
      [scoreboardAt.x + dx, 0.95, scoreboardAt.z],
    );
  });
  builder.box(
    "paint",
    "#1f2b3d",
    [2.3, 0.85, 0.08],
    [scoreboardAt.x, 1.6, scoreboardAt.z],
  );
  if (builder.isFar) {
    return;
  }
  for (let end = 0; end < 8; end++) {
    builder.box(
      "paint",
      trim,
      [0.2, 0.18, 0.02],
      [scoreboardAt.x - 0.84 + end * 0.24, 1.8, scoreboardAt.z + 0.05],
    );
  }
  builder.box(
    "paint",
    stoneRed,
    [0.06, 0.18, 0.02],
    [scoreboardAt.x - 1.05, 1.45, scoreboardAt.z + 0.05],
  );
  builder.box(
    "paint",
    stoneYellow,
    [0.06, 0.18, 0.02],
    [scoreboardAt.x - 1.05, 1.75, scoreboardAt.z + 0.05],
  );
  /* Benches for the spectators, and lamps */
  [1.6, -1.2, -4.0].forEach((z) => {
    addBench(builder, [-2.4, 0, z], Math.PI / 2, faluRed);
  });
  addLampPost(builder, [-2.2, 0, 0.2]);
  addLampPost(builder, [-2.2, 0, -2.6]);
  addLampPost(builder, [2.0, 0, 3.2]);
  [
    [-6.4, 5.0, 0.5],
    [4.2, 5.8, 0.45],
    [-2.8, -7.4, 0.5],
    [2.8, -7.6, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", frostWhite, size, [x, 0, z], [1.6, 0.45, 1.1], 10);
  });
  /* A snowy path to the clubhouse door */
  builder.box("matte", snowShadow, [1.2, 0.02, 4.0], [4.2, 0.01, 1.4]);
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const stoneAt: Triple = [0, iceTop, nearHouseZ];

/** A stone in the near house, spinning as it curls when you come near. */
const buildSpinningStone = (builder: AttractionBuilder) => {
  addStone(builder, [0, 0, 0], stoneRed);
};

const flagAt: Triple = [clubhouse.minX - 0.6, 0, clubhouse.maxZ + 0.8];

/** A Saltire, the flag of Scotland, where curling began. */
const buildSaltire = (builder: AttractionBuilder) => {
  builder.cylinder("paint", palette.white, {
    radius: 0.035,
    length: 3.0,
    at: [0, 1.5, 0],
    segments: 6,
  });
  builder.sphere("metal", palette.brass, 0.06, [0, 3.03, 0], [1, 1, 1], 6);
  builder.box("matte", "#0065bd", [0.9, 0.6, 0.02], [0.47, 2.65, 0]);
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      frostWhite,
      [1.05, 0.1, 0.025],
      [0.47, 2.65, 0],
      [0, 0, side * Math.atan2(0.6, 0.9)],
    );
  });
};

const scoreLightAt: Triple = [scoreboardAt.x, 1.25, scoreboardAt.z + 0.06];

const buildScoreLights = (builder: AttractionBuilder) => {
  [-0.6, -0.36, 0.36, 0.6].forEach((dx, index) => {
    builder.box(
      "glow",
      index < 2 ? "#ff8a6a" : "#ffe27a",
      [0.18, 0.26, 0.02],
      [dx, 0, 0],
    );
  });
};

const moving: MovingPart[] = [
  {
    name: "curling stone",
    pivot: stoneAt,
    build: buildSpinningStone,
    motion: { kind: "whirl", axis: "y", idle: 0.2, speed: 3, reach: 5 },
  },
  {
    name: "Saltire flag",
    pivot: flagAt,
    build: buildSaltire,
    motion: { kind: "nod", axis: "y", reach: 7, amplitude: 0.35, period: 1.6 },
  },
  {
    name: "scoreboard lights",
    pivot: scoreLightAt,
    build: buildScoreLights,
    motion: { kind: "wake", reach: 6 },
  },
];

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

/** A curler with a broom, sweeping the ice. */
const buildCurler = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((side) => {
    builder.box("matte", palette.black, [0.1, 0.08, 0.2], [side, 0.04, 0.02]);
    builder.cylinder("matte", "#2b3442", {
      radius: 0.05,
      length: 0.34,
      at: [side, 0.25, 0],
      segments: 6,
    });
  });
  builder.lathe(
    "matte",
    tartanGreen,
    [
      [0, 0.4],
      [0.16, 0.42],
      [0.16, 0.6],
      [0.13, 0.74],
      [0.06, 0.8],
      [0, 0.8],
    ],
    [0, 0, 0],
    "y",
    8,
  );
  builder.box("matte", stoneYellow, [0.33, 0.04, 0.33], [0, 0.55, 0]);
  /* Both hands on the broom, sweeping in front */
  builder.bar(
    "matte",
    tartanGreen,
    [0.14, 0.74, 0],
    [0.08, 0.6, 0.25],
    0.06,
    5,
  );
  builder.bar(
    "matte",
    tartanGreen,
    [-0.14, 0.74, 0],
    [0.02, 0.45, 0.3],
    0.06,
    5,
  );
  builder.bar(
    "matte",
    palette.paleTimber,
    [0.12, 0.75, 0.15],
    [-0.05, 0.05, 0.55],
    0.035,
    4,
  );
  builder.box("matte", houseRed, [0.24, 0.06, 0.1], [-0.05, 0.03, 0.58]);
  builder.sphere("matte", "#e8b894", 0.1, [0, 0.91, 0], [1, 1, 1], 9);
  builder.lathe(
    "matte",
    houseBlue,
    [
      [0, 1.03],
      [0.08, 1.0],
      [0.115, 0.94],
      [0.14, 0.93],
    ],
    [0, 0, 0],
    "y",
    8,
  );
  if (!builder.isFar) {
    builder.sphere("matte", houseRed, 0.035, [0, 1.04, 0], [1, 1, 1], 6);
  }
};

/** A Scottish terrier, small, black and bristly. */
const buildScottie = (builder: AttractionBuilder) => {
  const coat = "#26282c";
  builder.box("matte", coat, [0.18, 0.16, 0.36], [0, 0.2, 0]);
  builder.box("matte", coat, [0.15, 0.15, 0.17], [0, 0.31, 0.22]);
  builder.box("matte", shade(coat, 1.3), [0.1, 0.08, 0.1], [0, 0.24, 0.33]);
  builder.sphere("paint", palette.black, 0.02, [0, 0.27, 0.39], [1, 1, 1], 4);
  builder.box(
    "matte",
    coat,
    [0.04, 0.14, 0.04],
    [0, 0.34, -0.18],
    [-0.4, 0, 0],
  );
  builder.box("matte", houseRed, [0.16, 0.03, 0.04], [0, 0.25, 0.16]);
  [-1, 1].forEach((side) => {
    builder.add("matte", coat, new ConeGeometry(0.03, 0.08, 4), {
      at: [side * 0.05, 0.42, 0.2],
    });
    [-0.12, 0.12].forEach((z) => {
      builder.box("matte", coat, [0.05, 0.13, 0.05], [side * 0.06, 0.065, z]);
    });
  });
};

const wanderers: Wanderers[] = [
  {
    name: "curlers sweeping",
    build: buildCurler,
    count: 2,
    centre: { x: 0, z: -1.2 },
    radius: 1.1,
    speed: 0.6,
    height: iceTop,
  },
  {
    name: "a Scottie dog",
    build: buildScottie,
    count: 1,
    centre: { x: 2.6, z: 4.6 },
    radius: 0.9,
    speed: 0.7,
    bob: 0.04,
  },
];

/* ------------------------------------------------------------------ */
/* The ride                                                            */
/* ------------------------------------------------------------------ */

const hackZ = nearHouseZ + 1.2;
const slideTo = farHouseZ + 1.0;

const curlRide = (progress: number): LocalSpot => {
  if (progress < 0.12) {
    const share = progress / 0.12;
    return {
      x: 0,
      y: iceTop * share,
      z: rideStart.z + (hackZ - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.82) {
    /* Push off from the hack and glide, slowing, curling a little */
    const raw = (progress - 0.12) / 0.7;
    const share = 1 - (1 - raw) ** 2;
    return {
      x: 0.35 * Math.sin(share * Math.PI) * share,
      y: iceTop,
      z: hackZ + (slideTo - hackZ) * share,
      heading: Math.PI,
    };
  }
  const share = (progress - 0.82) / 0.18;
  return {
    x: rideFinish.x * share,
    y: iceTop * (1 - share),
    z: slideTo + (rideFinish.z - slideTo) * share,
    heading: Math.PI + share * 1.2,
  };
};

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

const build = (builder: AttractionBuilder) => {
  buildSheet(builder);
  buildClubhouse(builder);
  buildGrounds(builder);
  addSignBoard(builder, signAt, signColour);
};

export const curlingSheetModel: NewLandAttractionModel = {
  kind: "curling-sheet",
  islandId: "frost-isle",
  name: "Curling Sheet",
  fact: "Curling was first played on frozen ponds and lochs in Scotland, about 500 years ago. The heavy, round stones are made of granite, a very hard rock, and many of them come from a tiny Scottish island called Ailsa Craig. Players sweep the ice in front of a stone to help it slide further.",
  curriculumLink:
    "Geography, Key Stage 1: name, locate and identify characteristics of the four countries and capital cities of the United Kingdom.",
  footprint: 9,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 0.8 },
  build,
  moving,
  wanderers,
  smoke: [
    {
      at: [
        (clubhouse.minX + clubhouse.maxX) / 2 + 0.7,
        0.2 + wallHeight + 1.85,
        clubhouse.minZ + 0.8,
      ],
      colour: "#dfe3e6",
      puffs: 6,
      size: 0.16,
      rise: 1.6,
      spread: 0.35,
    },
  ],
  decks: [buildFlatDeck(sheet, iceTop, "ice")],
  rides: [
    {
      id: "curling-slide",
      name: "the curling sheet",
      start: rideStart,
      reach: 0.7,
      seconds: 7,
      finish: rideFinish,
      follow: curlRide,
    },
  ],
  blockers: [
    ...firs.map(([x, z, size]) => ({ x, z, radius: 0.35 * size })),
    {
      x: (clubhouse.minX + clubhouse.maxX) / 2,
      z: (clubhouse.minZ + clubhouse.maxZ) / 2,
      radius: 1.5,
    },
  ] satisfies LocalBlocker[],
  play: {
    label: "Slide a curling stone",
    news: "Sweep, sweep, sweep! Your stone glided all the way down the ice and curled to a stop right on the button, in the middle of the house.",
  },
};
