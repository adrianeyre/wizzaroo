import {
  addBench,
  addBush,
  addDoor,
  addLampPost,
  addSignBoard,
  addTree,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Triple,
} from "./attraction-kit.js";
import type { LoftStation } from "../trains/train-kit.js";
import {
  addChimney,
  addFanlight,
  addGabledBlock,
  addHangingBasket,
  addLettering,
  addPitchedRoof,
  addPlanter,
  addQuoins,
  addRoadWheel,
  addSash,
} from "./post-office-parts.js";

const brick = "#a4553c";
const stoneDressing = "#e6dcc4";
const joinery = "#7a1c22";
const fascia = palette.postRed;
const parcelBrown = "#b98b58";

const centreX = -0.6;
const centreZ = -2;
const width = 6.2;
const depth = 3.8;
const eaves = 3.75;
const rise = 1.5;
const front = centreZ + depth / 2;
const back = centreZ - depth / 2;
const left = centreX - width / 2;
const right = centreX + width / 2;

/* The building */

const buildBuilding = (builder: AttractionBuilder) => {
  addGabledBlock(builder, {
    centre: { x: centreX, z: centreZ },
    width,
    depth,
    eaves,
    rise,
    colour: brick,
  });
  addPitchedRoof(builder, {
    centre: { x: centreX, z: centreZ },
    width,
    depth,
    eaves,
    rise,
    colour: palette.slate,
    courses: 7,
  });
  builder.box(
    "matte",
    "#8d857a",
    [width + 0.06, 0.32, depth + 0.06],
    [centreX, 0.16, centreZ],
  );
  builder.box(
    "matte",
    stoneDressing,
    [width + 0.08, 0.1, depth + 0.08],
    [centreX, 2.48, centreZ],
  );
  builder.box(
    "matte",
    stoneDressing,
    [width + 0.12, 0.14, depth + 0.12],
    [centreX, eaves - 0.05, centreZ],
  );
  addQuoins(builder, {
    corners: [
      { x: left, z: front },
      { x: right, z: front },
      { x: left, z: back },
      { x: right, z: back },
    ],
    height: eaves - 0.12,
    colour: stoneDressing,
    from: 0.32,
  });
  const ridge = eaves + rise;
  [left + 0.34, right - 0.34].forEach((x) => {
    addChimney(builder, [x, ridge - 0.55, centreZ], {
      height: 1.45,
      colour: shade(brick, 0.92),
      width: 0.5,
      depth: 0.7,
      pots: 2,
    });
  });
  [-2.05, 0, 2.05].forEach((dx) => {
    addSash(builder, {
      at: [centreX + dx, 3.07, front + 0.02],
      width: 0.64,
      height: 0.86,
      lintel: stoneDressing,
    });
  });
  [-1.6, 1.6].forEach((dx) => {
    addSash(builder, {
      at: [centreX + dx, 3.07, back - 0.02],
      width: 0.64,
      height: 0.86,
      turn: Math.PI,
      lintel: stoneDressing,
    });
  });
  addSash(builder, {
    at: [centreX - 1.6, 1.25, back - 0.02],
    width: 0.64,
    height: 0.86,
    turn: Math.PI,
    lintel: stoneDressing,
  });
  addDoor(builder, {
    at: [centreX + 1.0, 0.3, back - 0.02],
    colour: "#2f4a3a",
    turn: Math.PI,
  });
  [
    [left - 0.02, -Math.PI / 2],
    [right + 0.02, Math.PI / 2],
  ].forEach(([x, turn]) => {
    addSash(builder, {
      at: [x, 3.1, centreZ],
      width: 0.6,
      height: 0.8,
      turn,
      lintel: stoneDressing,
    });
    addSash(builder, {
      at: [x, 1.35, centreZ],
      width: 0.6,
      height: 0.8,
      turn,
      lintel: stoneDressing,
    });
  });
};

/* The shop front */

const addParcel = (
  builder: AttractionBuilder,
  size: Triple,
  at: Triple,
  turn = 0,
  colour = parcelBrown,
) => {
  builder.box(
    "matte",
    colour,
    size,
    [at[0], at[1] + size[1] / 2, at[2]],
    [0, turn, 0],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      "#efe6cf",
      [size[0] + 0.01, size[1] + 0.01, 0.025],
      [at[0], at[1] + size[1] / 2, at[2]],
      [0, turn, 0],
    );
    builder.box(
      "matte",
      "#efe6cf",
      [0.025, size[1] + 0.01, size[2] + 0.01],
      [at[0], at[1] + size[1] / 2, at[2]],
      [0, turn, 0],
    );
  }
};

const buildDisplayWindow = (builder: AttractionBuilder, middle: number) => {
  const paneWidth = 2.12;
  const shelf = 0.62;
  const top = 1.84;
  builder.box(
    "paint",
    joinery,
    [paneWidth + 0.06, shelf - 0.3, 0.2],
    [middle, 0.3 + (shelf - 0.3) / 2, front + 0.1],
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      shade(joinery, 1.25),
      [paneWidth - 0.3, shelf - 0.46, 0.03],
      [middle, 0.3 + (shelf - 0.3) / 2, front + 0.205],
    );
  }
  builder.box(
    "paint",
    palette.cream,
    [paneWidth + 0.12, 0.06, 0.34],
    [middle, shelf, front + 0.15],
  );
  builder.box(
    "glass",
    "#5f8099",
    [paneWidth, top - shelf, 0.03],
    [middle, (top + shelf) / 2, front + 0.03],
  );
  builder.box(
    "paint",
    palette.cream,
    [paneWidth + 0.06, 0.07, 0.06],
    [middle, top, front + 0.2],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    palette.cream,
    [paneWidth, 0.04, 0.05],
    [middle, 1.56, front + 0.2],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.cream,
      [0.04, top - shelf, 0.05],
      [middle + side * (paneWidth / 6), (top + shelf) / 2, front + 0.2],
    );
  });
  addParcel(
    builder,
    [0.36, 0.26, 0.1],
    [middle - 0.62, shelf + 0.03, front + 0.1],
  );
  addParcel(
    builder,
    [0.26, 0.18, 0.1],
    [middle - 0.6, shelf + 0.29, front + 0.1],
    0,
    "#c79d6a",
  );
  addParcel(
    builder,
    [0.44, 0.34, 0.1],
    [middle + 0.05, shelf + 0.03, front + 0.1],
  );
  addParcel(
    builder,
    [0.3, 0.2, 0.1],
    [middle + 0.62, shelf + 0.03, front + 0.1],
    0,
    "#a87c4c",
  );
  builder.box(
    "paint",
    palette.postRed,
    [0.26, 0.34, 0.03],
    [middle + 0.66, shelf + 0.45, front + 0.08],
  );
  builder.box(
    "paint",
    palette.cream,
    [0.18, 0.04, 0.02],
    [middle + 0.66, shelf + 0.52, front + 0.1],
  );
  builder.box(
    "paint",
    "#f2c94c",
    [0.18, 0.12, 0.02],
    [middle + 0.66, shelf + 0.36, front + 0.1],
  );
};

const buildShopFront = (builder: AttractionBuilder) => {
  buildDisplayWindow(builder, centreX - 1.65);
  buildDisplayWindow(builder, centreX + 1.65);
  addDoor(builder, {
    at: [centreX, 0.3, front + 0.02],
    width: 0.74,
    height: 1.3,
    colour: joinery,
    frame: palette.cream,
  });
  addFanlight(builder, {
    at: [centreX, 1.42, front + 0.03],
    radius: 0.34,
    frame: palette.cream,
  });
  builder.box(
    "matte",
    palette.stone,
    [1.0, 0.08, 0.36],
    [centreX, 0.3, front + 0.18],
  );
  [-2.82, -0.52, 0.52, 2.82].forEach((dx) => {
    builder.box(
      "paint",
      palette.cream,
      [0.16, 1.62, 0.24],
      [centreX + dx, 0.3 + 0.81, front + 0.12],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        palette.cream,
        [0.22, 0.08, 0.28],
        [centreX + dx, 1.88, front + 0.13],
      );
    }
  });
  const fasciaY = 2.12;
  builder.box(
    "paint",
    fascia,
    [5.7, 0.4, 0.1],
    [centreX, fasciaY, front + 0.27],
    [-0.08, 0, 0],
  );
  builder.box(
    "paint",
    palette.cream,
    [5.86, 0.05, 0.12],
    [centreX, fasciaY - 0.22, front + 0.27],
  );
  builder.box(
    "paint",
    joinery,
    [6.1, 0.1, 0.42],
    [centreX, fasciaY + 0.25, front + 0.19],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      joinery,
      [0.2, 0.52, 0.36],
      [centreX + side * 2.95, fasciaY - 0.02, front + 0.18],
    );
    builder.box(
      "paint",
      palette.cream,
      [0.22, 0.06, 0.38],
      [centreX + side * 2.95, fasciaY - 0.28, front + 0.18],
    );
  });
  addLettering(builder, "POST OFFICE", {
    at: [centreX, fasciaY, front + 0.335],
    height: 0.2,
    colour: palette.cream,
  });
  [-2.25, 2.25].forEach((dx) => {
    addHangingBasket(builder, [centreX + dx, 2.95, front], 0, 0.68);
  });
};

/* The pillar box */

const pillarAt: Triple = [-2.35, 0, 2.05];

const buildPillarBox = (builder: AttractionBuilder) => {
  const [x, y, z] = pillarAt;
  builder.lathe(
    "paint",
    palette.black,
    [
      [0, 0],
      [0.27, 0],
      [0.27, 0.07],
      [0.235, 0.1],
      [0, 0.1],
    ],
    pillarAt,
    "y",
    20,
  );
  builder.lathe(
    "paint",
    palette.postRed,
    [
      [0, 0.1],
      [0.215, 0.1],
      [0.225, 0.13],
      [0.21, 0.16],
      [0.205, 0.74],
      [0.225, 0.76],
      [0.245, 0.8],
      [0.245, 0.85],
      [0.22, 0.87],
      [0.19, 0.93],
      [0.13, 0.98],
      [0.06, 1.0],
      [0, 1.005],
    ],
    pillarAt,
    "y",
    24,
  );
  const face = z + 0.205;
  builder.box("paint", "#151515", [0.2, 0.04, 0.03], [x, y + 0.69, face]);
  builder.box(
    "paint",
    palette.postRed,
    [0.26, 0.04, 0.07],
    [x, y + 0.725, face + 0.01],
  );
  if (builder.isFar) {
    return;
  }
  builder.box("paint", palette.white, [0.16, 0.11, 0.02], [x, y + 0.55, face]);
  builder.box("metal", palette.brass, [0.1, 0.08, 0.02], [x, y + 0.4, face]);
  builder.box(
    "paint",
    shade(palette.postRed, 0.8),
    [0.3, 0.012, 0.02],
    [x, y + 0.24, face - 0.005],
  );
};

/* The telephone box */

const phoneAt: Triple = [-4.2, 0, 0.95];

const buildPhoneBox = (builder: AttractionBuilder) => {
  const [x, , z] = phoneAt;
  const half = 0.27;
  builder.box("matte", "#6f6a62", [0.64, 0.08, 0.64], [x, 0.04, z]);
  builder.box(
    "paint",
    palette.postRed,
    [half * 2, 1.12, half * 2],
    [x, 0.64, z],
  );
  [-1, 1].forEach((dx) => {
    [-1, 1].forEach((dz) => {
      builder.box(
        "paint",
        palette.postRed,
        [0.07, 1.2, 0.07],
        [x + dx * half, 0.68, z + dz * half],
      );
    });
  });
  builder.box(
    "paint",
    palette.postRed,
    [half * 2 + 0.08, 0.14, half * 2 + 0.08],
    [x, 1.27, z],
  );
  builder.sphere(
    "paint",
    palette.postRed,
    0.36,
    [x, 1.33, z],
    [1, 0.3, 1],
    builder.segments(10, 6),
  );
  [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((turn) => {
    const out = (distance: number): Triple => [
      x + Math.sin(turn) * distance,
      0,
      z + Math.cos(turn) * distance,
    ];
    const sign = out(half + 0.045);
    builder.box(
      "glow",
      "#f4f1ea",
      [0.36, 0.08, 0.01],
      [sign[0], 1.27, sign[2]],
      [0, turn, 0],
    );
    if (turn === Math.PI) {
      return;
    }
    const pane = out(half + 0.005);
    builder.box(
      "glass",
      "#5f8099",
      [0.4, 0.78, 0.01],
      [pane[0], 0.72, pane[2]],
      [0, turn, 0],
    );
    if (builder.isFar) {
      return;
    }
    const bars = out(half + 0.015);
    [-0.07, 0.07].forEach((across) => {
      builder.box(
        "paint",
        palette.postRed,
        [0.025, 0.78, 0.015],
        [
          bars[0] + Math.cos(turn) * across,
          0.72,
          bars[2] - Math.sin(turn) * across,
        ],
        [0, turn, 0],
      );
    });
    for (let row = 1; row < 7; row++) {
      builder.box(
        "paint",
        palette.postRed,
        [0.4, 0.022, 0.015],
        [bars[0], 0.33 + row * 0.11, bars[2]],
        [0, turn, 0],
      );
    }
  });
};

/* The post van */

const vanAt = { x: 4.55, z: -0.4 };
const vanHalfWidth = 0.68;

const vanStation = (z: number, top: number, bottom: number, narrow = 1) => {
  const halfWidth = vanHalfWidth * narrow;
  const lower = Math.min(0.58, top - 0.3);
  const belt = Math.min(0.98, top - 0.16);
  const shoulder = top - 0.08;
  return {
    z: vanAt.z + z,
    points: [
      [-halfWidth + 0.06, bottom],
      [halfWidth - 0.06, bottom],
      [halfWidth, bottom + 0.08],
      [halfWidth, lower],
      [halfWidth, belt],
      [halfWidth - 0.04, shoulder],
      [halfWidth - 0.14, top],
      [-halfWidth + 0.14, top],
      [-halfWidth + 0.04, shoulder],
      [-halfWidth, belt],
      [-halfWidth, lower],
      [-halfWidth, bottom + 0.08],
    ].map(([px, py]) => [vanAt.x + px, py] as const),
  } satisfies LoftStation;
};

const vanGlass = "#2e3d4a";

const buildVan = (builder: AttractionBuilder) => {
  const stations = [
    vanStation(-1.55, 1.42, 0.34, 0.98),
    vanStation(-1.48, 1.48, 0.32),
    vanStation(0.35, 1.48, 0.32),
    vanStation(0.72, 1.42, 0.32),
    vanStation(1.12, 1.02, 0.32, 0.99),
    vanStation(1.42, 0.9, 0.32, 0.97),
    vanStation(1.56, 0.76, 0.34, 0.94),
    vanStation(1.6, 0.62, 0.38, 0.9),
  ];
  builder.loft({
    stations,
    paint: (centre, normal) => {
      const along = centre.z - vanAt.z;
      if (centre.y < 0.56) {
        return { colour: "#2b2d30", finish: "matte" };
      }
      if (
        normal.z > 0.3 &&
        normal.y > 0.12 &&
        centre.y > 0.9 &&
        along > 0.6 &&
        Math.abs(centre.x - vanAt.x) < vanHalfWidth - 0.05
      ) {
        return { colour: vanGlass, finish: "glass" };
      }
      if (
        Math.abs(normal.x) > 0.6 &&
        centre.y > 0.98 &&
        along > 0.4 &&
        along < 1.0
      ) {
        return { colour: vanGlass, finish: "glass" };
      }
      return { colour: palette.postRed, finish: "paint" };
    },
  });
  [-1.05, 1.08].forEach((axle) => {
    [-1, 1].forEach((side) => {
      addRoadWheel(
        builder,
        [vanAt.x + side * (vanHalfWidth - 0.1), 0.3, vanAt.z + axle],
        0.3,
        { width: 0.22, side },
      );
    });
  });
  const nose = vanAt.z + 1.6;
  builder.box(
    "matte",
    "#2b2d30",
    [1.3, 0.16, 0.12],
    [vanAt.x, 0.42, nose + 0.02],
  );
  builder.box("matte", "#1d1f22", [0.6, 0.16, 0.04], [vanAt.x, 0.62, nose]);
  [-1, 1].forEach((side) => {
    builder.box(
      "glow",
      "#fff6dc",
      [0.22, 0.1, 0.04],
      [vanAt.x + side * 0.45, 0.66, nose - 0.02],
    );
    builder.box(
      "glow",
      "#d8231f",
      [0.08, 0.26, 0.04],
      [vanAt.x + side * 0.58, 1.0, vanAt.z - 1.56],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        palette.black,
        [0.1, 0.14, 0.04],
        [vanAt.x + side * (vanHalfWidth + 0.06), 1.1, vanAt.z + 0.95],
      );
      builder.bar(
        "metal",
        palette.black,
        [vanAt.x + side * (vanHalfWidth - 0.02), 1.08, vanAt.z + 0.98],
        [vanAt.x + side * (vanHalfWidth + 0.06), 1.1, vanAt.z + 0.95],
        0.02,
        4,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    "#2b2d30",
    [1.3, 0.14, 0.1],
    [vanAt.x, 0.42, vanAt.z - 1.56],
  );
  builder.box(
    "paint",
    "#f2c94c",
    [0.42, 0.1, 0.02],
    [vanAt.x, 0.62, vanAt.z - 1.565],
  );
  builder.box(
    "paint",
    palette.white,
    [0.4, 0.09, 0.02],
    [vanAt.x, 0.43, nose + 0.085],
  );
  builder.box(
    "matte",
    shade(palette.postRed, 0.7),
    [0.015, 0.84, 0.02],
    [vanAt.x, 0.98, vanAt.z - 1.56],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(palette.postRed, 0.7),
      [0.02, 0.86, 0.015],
      [vanAt.x + side * (vanHalfWidth + 0.003), 0.98, vanAt.z + 0.36],
    );
    builder.box(
      "matte",
      shade(palette.postRed, 0.7),
      [0.02, 0.86, 0.015],
      [vanAt.x + side * (vanHalfWidth + 0.003), 0.98, vanAt.z - 0.5],
    );
    builder.box(
      "paint",
      "#f2c94c",
      [0.02, 0.12, 0.9],
      [vanAt.x + side * (vanHalfWidth + 0.004), 0.8, vanAt.z - 0.6],
    );
  });
};

/* The forecourt round it */

const buildForecourt = (builder: AttractionBuilder) => {
  builder.box("matte", palette.paving, [7.8, 0.04, 2.9], [centreX, 0.02, 1.35]);
  builder.box("matte", palette.stone, [7.8, 0.08, 0.16], [centreX, 0.04, 2.85]);
  builder.box(
    "matte",
    palette.paving,
    [1.5, 0.035, 5.1],
    [centreX, 0.018, 5.4],
  );
  builder.box("matte", palette.tarmac, [2.5, 0.03, 5.8], [4.55, 0.015, 0]);
  if (!builder.isFar) {
    for (let row = 1; row < 4; row++) {
      builder.box(
        "matte",
        shade(palette.paving, 0.93),
        [7.8, 0.006, 0.03],
        [centreX, 0.042, front + row * 0.72],
      );
    }
    for (let column = 0; column < 10; column++) {
      builder.box(
        "matte",
        shade(palette.paving, 0.93),
        [0.03, 0.006, 2.9],
        [centreX - 3.6 + column * 0.8, 0.042, 1.35],
      );
    }
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        palette.white,
        [0.07, 0.006, 4.8],
        [4.55 + side * 1.1, 0.033, -0.2],
      );
    });
    builder.box(
      "paint",
      palette.white,
      [2.27, 0.006, 0.07],
      [4.55, 0.033, -2.6],
    );
  }
  addPlanter(builder, [centreX - 1.05, 0, front + 0.75], { flowers: 9 });
  addPlanter(builder, [centreX + 1.05, 0, front + 0.75], { flowers: 9 });
  addBench(builder, [1.25, 0, 2.15]);
  addLampPost(builder, [-4.1, 0, 2.3], 2.4);
  addTree(builder, [-4.7, 0, -4.9], 1.05);
  addTree(builder, [2.9, 0, -5.9], 0.95, "#4a9440");
  addBush(builder, [-5.0, 0, -1.6], 0.55);
  addBush(builder, [6.6, 0, -2.6], 0.5);
  addBush(builder, [2.6, 0, 4.4], 0.4, "#3a7d34");
  addSignBoard(builder, [-3.6, 0, 4.4], palette.postRed);
};

export const postOfficeModel: AttractionModel = {
  kind: "post-office",
  name: "Post Office",
  fact: "Every letter needs an address: the person's name, the house, the street, the town and a postcode. The postcode tells the sorting office which street to send it to, so it can reach anywhere in the United Kingdom.",
  curriculumLink:
    "Geography, Key Stage 1: locational knowledge. Using addresses and maps to find places in the United Kingdom.",
  footprint: 8,
  setting: "inland",
  signSpot: { x: -3.6, z: 5.3 },
  build: (builder) => {
    buildForecourt(builder);
    buildBuilding(builder);
    buildShopFront(builder);
    buildPillarBox(builder);
    buildPhoneBox(builder);
    buildVan(builder);
  },
  blockers: [
    ...listWallBlockers(
      { x: left + 0.6, z: front - 0.75 },
      { x: right - 0.6, z: front - 0.75 },
      1.1,
      1,
    ),
    ...listWallBlockers(
      { x: left + 0.6, z: back + 0.85 },
      { x: right - 0.6, z: back + 0.85 },
      1.1,
      1,
    ),
    { x: pillarAt[0], z: pillarAt[2], radius: 0.35 },
    { x: phoneAt[0], z: phoneAt[2], radius: 0.45 },
    { x: vanAt.x, z: vanAt.z - 0.85, radius: 0.85 },
    { x: vanAt.x, z: vanAt.z + 0.85, radius: 0.85 },
    { x: 1.25, z: 2.05, radius: 0.5 },
  ],
};
