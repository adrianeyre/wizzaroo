import {
  addDoor,
  addGableRoof,
  addLampPost,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e4c88e";
const gravel = "#c9b48e";
const cellBlue = "#1f3f7a";
const cellLine = "#9fb6d6";
const frameSilver = "#c4ccd4";
const shedWhite = "#eef0ec";
const shedRoof = "#7a8a96";
const batteryGreen = "#3fe07a";
const warningYellow = "#f2c230";
const cableBlack = "#26282c";
const signColour = "#2f6b8f";

const rowXs = [-2.4, -1.0, 0.4];
const rowFromZ = -2.7;
const rowToZ = 0.3;
const rowLength = rowToZ - rowFromZ;
const rowMiddleZ = (rowFromZ + rowToZ) / 2;
const tubeHeight = 1.0;
const panelWidth = 1.15;
const shed = { x: 2.55, z: -1.5, width: 1.5, depth: 1.3, height: 1.55 };
const battery = { x: 2.3, z: 0.9 };
const meterAt: Triple = [battery.x, 0.62, battery.z + 0.36];

/* The frames each row of panels turns on */

const buildFrames = (builder: AttractionBuilder) => {
  /* Gravel strips under the rows */
  rowXs.forEach((x) => {
    builder.box(
      "matte",
      gravel,
      [panelWidth + 0.3, 0.03, rowLength + 0.4],
      [x, 0.015, rowMiddleZ],
    );
  });
  rowXs.forEach((x) => {
    [rowFromZ + 0.25, rowMiddleZ, rowToZ - 0.25].forEach((z, index) => {
      builder.box(
        "metal",
        frameSilver,
        [0.1, tubeHeight, 0.1],
        [x, tubeHeight / 2, z],
      );
      if (builder.isFar) {
        return;
      }
      builder.box("matte", palette.paving, [0.3, 0.08, 0.3], [x, 0.04, z]);
      /* The motor that turns the row sits on the middle post */
      if (index === 1) {
        builder.roundedBox(
          "paint",
          palette.darkSteel,
          [0.22, 0.26, 0.2],
          0.04,
          [x, tubeHeight - 0.25, z + 0.14],
        );
        builder.box(
          "paint",
          warningYellow,
          [0.1, 0.08, 0.01],
          [x, tubeHeight - 0.22, z + 0.245],
        );
      }
    });
  });
};

/** A row of panels on its torque tube, built about the tube's middle. */
const buildPanelRow = (builder: AttractionBuilder) => {
  builder.cylinder("metal", frameSilver, {
    radius: 0.06,
    length: rowLength + 0.1,
    at: [0, 0, 0],
    axis: "z",
    segments: 10,
  });
  const modules = 4;
  const moduleLength = rowLength / modules - 0.04;
  for (let module = 0; module < modules; module++) {
    const z = -rowLength / 2 + (module + 0.5) * (rowLength / modules);
    builder.box(
      "metal",
      frameSilver,
      [panelWidth + 0.04, 0.05, moduleLength + 0.04],
      [0, 0.09, z],
    );
    builder.box(
      "glass",
      cellBlue,
      [panelWidth - 0.04, 0.02, moduleLength - 0.04],
      [0, 0.125, z],
    );
    /* The grid of cells: thin lines across and along */
    for (let line = 1; line < 6; line++) {
      builder.box(
        "paint",
        cellLine,
        [panelWidth - 0.06, 0.004, 0.01],
        [0, 0.137, z - moduleLength / 2 + (line * moduleLength) / 6],
      );
    }
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        cellLine,
        [0.01, 0.004, moduleLength - 0.06],
        [side * (panelWidth / 6), 0.137, z],
      );
    });
    /* Clamps holding the module to the rails */
    [-1, 1].forEach((side) => {
      builder.box(
        "metal",
        palette.darkSteel,
        [0.06, 0.06, 0.08],
        [side * (panelWidth / 2), 0.1, z - moduleLength / 2],
      );
    });
  }
  /* Rails under the modules */
  [-0.35, 0.35].forEach((x) => {
    builder.box("metal", palette.steel, [0.05, 0.05, rowLength], [x, 0.045, 0]);
  });
};

/* The inverter shed, the battery and the cables between them */

const buildShed = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = shed;
  builder.box("paint", shedWhite, [width, height, depth], [x, height / 2, z]);
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.3,
    at: [x, height, z],
    colour: shedRoof,
    finish: "metal",
    turn: Math.PI / 2,
    overhang: 0.12,
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    palette.paving,
    [width + 0.2, 0.1, depth + 0.2],
    [x, 0.05, z],
  );
  addDoor(builder, {
    at: [x - width / 2 - 0.01, 0.1, z + 0.1],
    width: 0.6,
    height: 1.2,
    colour: shade(shedRoof, 0.9),
    turn: -Math.PI / 2,
  });
  /* A yellow lightning-bolt warning on the door */
  const warning: Triple = [x - width / 2 - 0.06, 1.0, z + 0.1];
  builder.cylinder("paint", warningYellow, {
    radius: 0.13,
    length: 0.02,
    at: warning,
    axis: "x",
    segments: 3,
  });
  builder.box(
    "paint",
    palette.black,
    [0.01, 0.14, 0.03],
    [warning[0] - 0.012, warning[1] - 0.01, warning[2]],
    [0.4, 0, 0],
  );
  /* Air vents, and a fan box on the front */
  [0.4, 0.6, 0.8].forEach((y) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.5, 0.03, 0.02],
      [x + 0.2, y + 0.4, z + depth / 2 + 0.01],
    );
  });
  builder.box(
    "paint",
    palette.steel,
    [0.5, 0.45, 0.25],
    [x + 0.25, 0.32, z + depth / 2 + 0.13],
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.17,
    length: 0.02,
    at: [x + 0.25, 0.34, z + depth / 2 + 0.26],
    axis: "z",
    segments: 14,
  });
  builder.torus(
    "metal",
    palette.steel,
    0.17,
    0.015,
    [x + 0.25, 0.34, z + depth / 2 + 0.27],
    "z",
    14,
  );
  /* A pylon-style pole carrying the power away */
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.07,
    length: 2.6,
    at: [x + 0.6, 1.3, z - depth / 2 - 0.25],
    segments: 8,
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [0.9, 0.08, 0.08],
    [x + 0.6, 2.45, z - depth / 2 - 0.25],
  );
  [-0.35, 0, 0.35].forEach((dx) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.035,
      length: 0.1,
      at: [x + 0.6 + dx, 2.54, z - depth / 2 - 0.25],
      segments: 6,
    });
  });
};

const buildBattery = (builder: AttractionBuilder) => {
  const { x, z } = battery;
  builder.box("paint", palette.white, [1.2, 1.0, 0.7], [x, 0.55, z]);
  if (builder.isFar) {
    return;
  }
  builder.box("matte", palette.paving, [1.4, 0.06, 0.9], [x, 0.03, z]);
  builder.box("paint", "#2fae6a", [1.22, 0.12, 0.72], [x, 0.95, z]);
  /* The meter's dark screen; its bars glow when you come near */
  builder.box(
    "paint",
    palette.black,
    [0.6, 0.36, 0.02],
    [x, meterAt[1] + 0.02, z + 0.355],
  );
  builder.box(
    "paint",
    palette.steel,
    [0.66, 0.42, 0.01],
    [x, meterAt[1] + 0.02, z + 0.35],
  );
  /* Battery cells drawn on the side, and big terminals on top */
  [-0.25, 0.25].forEach((dx) => {
    builder.cylinder("metal", dx < 0 ? "#d63a3a" : palette.black, {
      radius: 0.06,
      length: 0.12,
      at: [x + dx, 1.07, z],
      segments: 10,
    });
  });
  builder.box("paint", "#2fae6a", [0.02, 0.24, 0.12], [x + 0.611, 0.55, z]);
  builder.box("paint", "#2fae6a", [0.02, 0.12, 0.24], [x + 0.611, 0.55, z]);
  addLampPost(builder, [x - 0.85, 0, z + 0.55], 2.0);
};

const buildCables = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* Cables from each row's middle post to the shed, along the ground */
  rowXs.forEach((x, index) => {
    const from: Triple = [x + 0.1, 0.04, rowMiddleZ];
    const bend: Triple = [x + 0.1, 0.04, 0.85 + index * 0.08];
    builder.bar(
      "matte",
      cableBlack,
      [x + 0.06, tubeHeight - 0.4, rowMiddleZ + 0.06],
      from,
      0.035,
      5,
    );
    builder.bar("matte", cableBlack, from, bend, 0.035, 5);
    builder.bar(
      "matte",
      cableBlack,
      bend,
      [1.65, 0.04, 0.85 + index * 0.08],
      0.035,
      5,
    );
  });
  builder.bar(
    "matte",
    cableBlack,
    [1.65, 0.04, 0.85],
    [1.65, 0.04, -1.3],
    0.06,
    6,
  );
  builder.bar(
    "matte",
    cableBlack,
    [1.65, 0.04, 0.95],
    [battery.x - 0.6, 0.3, battery.z],
    0.05,
    6,
  );
  /* A cleaning bucket and squeegee for sweeping off the dust */
  builder.lathe(
    "paint",
    "#3a7ae0",
    [
      [0, 0],
      [0.12, 0],
      [0.16, 0.26],
      [0.14, 0.26],
      [0.11, 0.03],
      [0, 0.03],
    ],
    [-1.75, 0, 1.2],
    "y",
    14,
  );
  builder.cylinder("water", palette.water, {
    radius: 0.13,
    length: 0.01,
    at: [-1.75, 0.2, 1.2],
    segments: 12,
  });
  builder.bar(
    "matte",
    palette.paleTimber,
    [-1.5, 0, 1.4],
    [-1.2, 1.3, 1.0],
    0.04,
    6,
  );
  builder.box(
    "paint",
    palette.black,
    [0.5, 0.06, 0.06],
    [-1.2, 1.32, 1.0],
    [0, 0.6, 0],
  );
  /* A sun-safety board: a smiling sun in sunglasses */
  const board: Triple = [-2.6, 0, 1.9];
  builder.box(
    "matte",
    palette.darkTimber,
    [0.07, 1.0, 0.07],
    [board[0], 0.5, board[2]],
  );
  builder.cylinder("paint", warningYellow, {
    radius: 0.32,
    length: 0.04,
    at: [board[0], 1.2, board[2] + 0.04],
    axis: "z",
    segments: 18,
  });
  for (let ray = 0; ray < 8; ray++) {
    const angle = (ray / 8) * Math.PI * 2;
    builder.box(
      "paint",
      "#f29a30",
      [0.06, 0.14, 0.03],
      [
        board[0] + Math.sin(angle) * 0.42,
        1.2 + Math.cos(angle) * 0.42,
        board[2] + 0.04,
      ],
      [0, 0, -angle],
    );
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.black,
      [0.17, 0.1, 0.02],
      [board[0] + side * 0.11, 1.26, board[2] + 0.07],
    );
  });
  builder.box(
    "paint",
    palette.black,
    [0.1, 0.02, 0.02],
    [board[0], 1.28, board[2] + 0.07],
  );
  builder.torus(
    "paint",
    "#b8402a",
    0.1,
    0.015,
    [board[0], 1.12, board[2] + 0.065],
    "z",
    10,
  );
  /* Little desert shrubs and a drift of sand */
  [
    [3.3, 2.4],
    [-3.6, -1.1],
    [0.0, 2.8],
  ].forEach(([x, z]) => {
    builder.sphere("matte", "#8a9a4a", 0.25, [x, 0.12, z], [1.2, 0.7, 1], 8);
    builder.sphere(
      "matte",
      "#a0aa5a",
      0.15,
      [x + 0.15, 0.2, z + 0.05],
      [1, 0.8, 1],
      6,
    );
  });
  builder.sphere(
    "matte",
    shade(sand, 1.05),
    0.6,
    [-1.7, 0, -3.3],
    [1.6, 0.25, 0.8],
    10,
  );
};

/* The moving parts */

const buildMeterGlow = (builder: AttractionBuilder) => {
  /* Five bars filling up, and a lightning bolt */
  for (let bar = 0; bar < 5; bar++) {
    builder.box(
      "glow",
      batteryGreen,
      [0.08, 0.06 + bar * 0.05, 0.02],
      [-0.2 + bar * 0.1, -0.1 + (0.06 + bar * 0.05) / 2, 0.02],
    );
  }
  builder.box(
    "glow",
    warningYellow,
    [0.04, 0.16, 0.02],
    [0.24, 0.05, 0.02],
    [0, 0, 0.4],
  );
  builder.box("glow", warningYellow, [0.1, 0.03, 0.02], [0.24, 0.05, 0.025]);
};

const rowParts: MovingPart[] = rowXs.map((x, index) => ({
  name: `panel row ${String(index + 1)}`,
  pivot: [x, tubeHeight, rowMiddleZ],
  build: buildPanelRow,
  motion: {
    kind: "nod",
    axis: "z",
    reach: 8,
    amplitude: 0.45,
    period: 7,
    phase: index * 0.25,
  },
}));

export const solarFarmModel: CuriosityModel = {
  kind: "solar-farm",
  islandId: "sunscorch-sands",
  name: "Solar Farm",
  fact: "Solar panels turn sunlight into electricity. Deserts get lots of strong sunshine, which makes them great places for solar farms. These panels slowly turn to follow the Sun across the sky, from the east in the morning to the west in the evening. Sunlight is so strong that you must never look straight at the Sun.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of human geography, including the distribution of natural resources including energy.",
  footprint: 4.8,
  setting: "inland",
  signSpot: { x: 1.4, z: 3.6 },
  padColour: sand,
  build: (builder) => {
    buildFrames(builder);
    buildShed(builder);
    buildBattery(builder);
    buildCables(builder);
    if (builder.isFar) {
      rowXs.forEach((x) => {
        builder.box(
          "glass",
          cellBlue,
          [panelWidth, 0.06, rowLength],
          [x, tubeHeight + 0.1, rowMiddleZ],
        );
      });
    }
    addSignBoard(builder, [1.4, 0, 3.6], signColour);
  },
  moving: [
    ...rowParts,
    {
      name: "meter lights",
      pivot: meterAt,
      build: buildMeterGlow,
      motion: { kind: "wake", reach: 5 },
    },
  ],
  blockers: [
    ...rowXs.flatMap((x) =>
      listWallBlockers(
        { x, z: rowFromZ + 0.2 },
        { x, z: rowToZ - 0.2 },
        0.6,
        0.5,
      ),
    ),
    { x: shed.x, z: shed.z - 0.3, radius: 0.85 },
    { x: shed.x, z: shed.z + 0.35, radius: 0.85 },
    { x: battery.x - 0.3, z: battery.z, radius: 0.5 },
    { x: battery.x + 0.3, z: battery.z, radius: 0.5 },
    { x: -2.6, z: 1.9, radius: 0.15 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Power up the lights",
    news: "Hummm… click! The panels soaked up the sunshine, the battery filled up, and the lamp blinked on.",
  },
};
