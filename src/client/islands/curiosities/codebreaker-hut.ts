import { BoxGeometry } from "three";
import {
  addDoor,
  addGableRoof,
  addSignBoard,
  addWindow,
  buildFlatDeck,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const hutBoards = "#3d4c6e";
const hutTrim = "#e8e2d0";
const roofFelt = "#2a2d3a";
const deckTimber = "#7a5a3c";
const tableTimber = "#6a4a2e";
const machineWood = "#5a3d26";
const machinePanel = "#1f2023";
const keyCream = "#efe6cc";
const lampAmber = "#c9b68a";
const lampLit = "#ffe27a";
const rotorSteel = "#9aa3ad";
const cabinetGreen = "#5f6f5a";
const blackboard = "#22302a";
const chalk = "#eef0e8";
const bucketRed = "#c23a2e";
const signColour = "#34407a";

/* The hut stands at the back with a covered veranda in front of it. */
const hut = { x: 0, z: -2.0, width: 4.6, depth: 2.4, height: 2.1 };
const hutFront = hut.z + hut.depth / 2;
const deckHeight = 0.2;
const deck = { minX: -2.3, maxX: 2.3, minZ: hutFront, maxZ: 1.0 };
const tableAt = { x: 0.25, z: 0.05 };
const tableTop = deckHeight + 0.75;
const machineTop = tableTop + 0.28;
const rotorAt: Triple = [tableAt.x, machineTop + 0.08, tableAt.z - 0.3];
const litLampAt: Triple = [
  tableAt.x + 0.1,
  machineTop + 0.015,
  tableAt.z - 0.15,
];
const bulbHook: Triple = [-0.9, 2.18, 0.2];

const buildHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = hut;
  /* Brick piers lift the hut off the ground */
  builder.box(
    "matte",
    hutBoards,
    [width, height - 0.25, depth],
    [x, 0.25 + (height - 0.25) / 2, z],
  );
  builder.box(
    "matte",
    palette.darkBrick,
    [width - 0.1, 0.25, depth - 0.1],
    [x, 0.125, z],
  );
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.8,
    at: [x, height, z],
    colour: roofFelt,
    overhang: 0.22,
    thickness: 0.1,
  });
  /* The gable ends filled in, a diamond prism whose top half shows */
  const halfDiagonal = depth / 2;
  builder.add(
    "matte",
    hutBoards,
    new BoxGeometry(
      width - 0.04,
      halfDiagonal * Math.SQRT2,
      halfDiagonal * Math.SQRT2,
    )
      .rotateX(Math.PI / 4)
      .scale(1, 0.78 / halfDiagonal, 1),
    { at: [x, height, z] },
    undefined,
  );
  /* A radio aerial on the roof */
  builder.bar(
    "metal",
    palette.darkSteel,
    [x + 1.5, height + 0.5, z],
    [x + 1.5, height + 2.1, z],
    0.05,
    4,
  );
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "metal",
    palette.darkSteel,
    [x + 1.2, height + 1.9, z],
    [x + 1.8, height + 1.9, z],
    0.03,
    4,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [x + 1.3, height + 1.6, z],
    [x + 1.7, height + 1.6, z],
    0.03,
    4,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [x + 1.5, height + 2.1, z],
    [x - 1.8, height + 0.75, z],
    0.012,
    3,
  );
  /* Weatherboards lapped along the front and the ends */
  for (let board = 0; board < 9; board++) {
    const y = 0.35 + board * 0.2;
    const colour = shade(hutBoards, board % 2 === 0 ? 1.08 : 0.94);
    builder.box(
      "matte",
      colour,
      [width + 0.02, 0.05, 0.03],
      [x, y, hutFront + 0.01],
    );
    builder.box(
      "matte",
      colour,
      [width + 0.02, 0.05, 0.03],
      [x, y, z - depth / 2 - 0.01],
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        colour,
        [0.03, 0.05, depth + 0.02],
        [x + side * (width / 2 + 0.01), y, z],
      );
    });
  }
  /* Cream corner boards and fascia */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        hutTrim,
        [0.08, height - 0.25, 0.08],
        [
          x + sideX * (width / 2 + 0.02),
          0.25 + (height - 0.25) / 2,
          z + sideZ * (depth / 2 + 0.02),
        ],
      );
    });
  });
  addDoor(builder, {
    at: [x - 0.55, deckHeight, hutFront + 0.02],
    width: 0.8,
    height: 1.6,
    colour: shade(hutBoards, 0.7),
    frame: hutTrim,
  });
  addWindow(builder, {
    at: [x - 1.7, 1.45, hutFront + 0.02],
    width: 0.7,
    height: 0.55,
    frame: hutTrim,
    isLit: true,
  });
  [-1.3, 0.2, 1.4].forEach((along) => {
    addWindow(builder, {
      at: [x + along, 1.3, z - depth / 2 - 0.02],
      width: 0.7,
      height: 0.55,
      frame: hutTrim,
      turn: Math.PI,
    });
  });
  addWindow(builder, {
    at: [x + width / 2 + 0.02, 1.3, z],
    width: 0.7,
    height: 0.55,
    frame: hutTrim,
    turn: Math.PI / 2,
    isLit: true,
  });
  /* A hut number plate above the door */
  builder.box(
    "paint",
    hutTrim,
    [0.4, 0.2, 0.02],
    [x - 0.55, 2.0, hutFront + 0.03],
  );
  builder.box(
    "paint",
    machinePanel,
    [0.06, 0.13, 0.01],
    [x - 0.6, 2.0, hutFront + 0.045],
  );
  builder.box(
    "paint",
    machinePanel,
    [0.06, 0.13, 0.01],
    [x - 0.5, 2.0, hutFront + 0.045],
  );
  /* A stovepipe chimney */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.08,
    length: 0.9,
    at: [x - 1.6, height + 0.7, z - 0.5],
    segments: 10,
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.14,
    radiusEnd: 0.02,
    length: 0.12,
    at: [x - 1.6, height + 1.2, z - 0.5],
    segments: 10,
  });
};

const buildVeranda = (builder: AttractionBuilder) => {
  const width = deck.maxX - deck.minX;
  const depth = deck.maxZ - deck.minZ;
  const middleZ = (deck.minZ + deck.maxZ) / 2;
  builder.box(
    "matte",
    deckTimber,
    [width, deckHeight, depth],
    [0, deckHeight / 2, middleZ],
  );
  /* A lean-to roof on posts */
  const roofBack = hut.height + 0.12;
  const roofFront = 2.0;
  const slope = Math.atan2(roofBack - roofFront, depth + 0.3);
  builder.box(
    "matte",
    roofFelt,
    [width + 0.3, 0.08, Math.hypot(depth + 0.3, roofBack - roofFront)],
    [0, (roofBack + roofFront) / 2, middleZ + 0.15],
    [slope, 0, 0],
  );
  [deck.minX + 0.1, 0, deck.maxX - 0.1].forEach((x) => {
    builder.box(
      "paint",
      hutTrim,
      [0.1, roofFront - deckHeight, 0.1],
      [x, deckHeight + (roofFront - deckHeight) / 2, deck.maxZ - 0.1],
    );
  });
  if (builder.isFar) {
    return;
  }
  for (let plank = 0; plank < 14; plank++) {
    const x = deck.minX + 0.16 + plank * ((width - 0.32) / 13);
    builder.box(
      "matte",
      shade(deckTimber, plank % 2 === 0 ? 1.08 : 0.92),
      [0.04, 0.012, depth - 0.04],
      [x, deckHeight + 0.006, middleZ],
    );
  }
  builder.box(
    "paint",
    hutTrim,
    [width + 0.32, 0.12, 0.05],
    [0, roofFront - 0.02, deck.maxZ + 0.17],
  );
  /* A step at the front */
  builder.box(
    "matte",
    shade(deckTimber, 0.8),
    [1.2, 0.1, 0.3],
    [0, 0.05, deck.maxZ + 0.15],
  );
};

const buildTableAndMachine = (builder: AttractionBuilder) => {
  const { x, z } = tableAt;
  builder.box("matte", tableTimber, [1.6, 0.06, 0.9], [x, tableTop - 0.03, z]);
  builder.box("matte", machineWood, [1.1, 0.26, 0.86], [x, tableTop + 0.13, z]);
  if (builder.isFar) {
    builder.box(
      "matte",
      tableTimber,
      [1.4, tableTop - deckHeight - 0.06, 0.7],
      [x, (tableTop + deckHeight) / 2, z],
    );
    return;
  }
  [-0.72, 0.72].forEach((dx) => {
    [-0.38, 0.38].forEach((dz) => {
      builder.box(
        "matte",
        shade(tableTimber, 0.8),
        [0.07, tableTop - deckHeight, 0.07],
        [x + dx, deckHeight + (tableTop - deckHeight) / 2, z + dz],
      );
    });
  });
  /* The machine: a wooden box with a black panel, keys, lamps and plugboard */
  builder.box(
    "paint",
    machinePanel,
    [1.0, 0.02, 0.78],
    [x, machineTop + 0.01, z],
  );
  builder.box(
    "matte",
    shade(machineWood, 1.15),
    [1.14, 0.04, 0.9],
    [x, tableTop + 0.02, z],
  );
  const rows = [9, 8, 9];
  rows.forEach((count, row) => {
    for (let key = 0; key < count; key++) {
      const keyX = x - ((count - 1) * 0.1) / 2 + key * 0.1;
      /* Keys at the front */
      builder.cylinder("paint", keyCream, {
        radius: 0.032,
        length: 0.04,
        at: [keyX, machineTop + 0.04, z + 0.3 - row * 0.085],
        segments: 8,
      });
      /* Lamps behind, in the same pattern */
      builder.cylinder("glass", lampAmber, {
        radius: 0.03,
        length: 0.012,
        at: [keyX, machineTop + 0.02, z + 0.02 - row * 0.085],
        segments: 8,
      });
    }
  });
  /* The plugboard on the front with its coloured leads */
  builder.box(
    "paint",
    machinePanel,
    [0.98, 0.18, 0.02],
    [x, tableTop + 0.13, z + 0.44],
  );
  ["#d84a3a", "#3a7ad8", "#e8c23a", "#4ab86a"].forEach((colour, lead) => {
    const fromX = x - 0.38 + lead * 0.22;
    builder.bar(
      "paint",
      colour,
      [fromX, tableTop + 0.17, z + 0.46],
      [fromX + 0.14, tableTop + 0.09, z + 0.46],
      0.018,
      4,
    );
    builder.sphere(
      "metal",
      rotorSteel,
      0.02,
      [fromX, tableTop + 0.17, z + 0.465],
      [1, 1, 1],
      5,
    );
    builder.sphere(
      "metal",
      rotorSteel,
      0.02,
      [fromX + 0.14, tableTop + 0.09, z + 0.465],
      [1, 1, 1],
      5,
    );
  });
  /* The rotor cover with its windows, rotors turning inside */
  builder.box(
    "paint",
    machinePanel,
    [0.6, 0.06, 0.24],
    [rotorAt[0], machineTop + 0.03, rotorAt[2]],
  );
  builder.box(
    "metal",
    rotorSteel,
    [0.06, 0.18, 0.22],
    [rotorAt[0] - 0.32, machineTop + 0.07, rotorAt[2]],
  );
  builder.box(
    "metal",
    rotorSteel,
    [0.06, 0.18, 0.22],
    [rotorAt[0] + 0.32, machineTop + 0.07, rotorAt[2]],
  );
  /* A notepad, pencil and a mug of tea */
  builder.box(
    "paint",
    palette.cream,
    [0.22, 0.01, 0.3],
    [x - 0.68, tableTop + 0.005, z + 0.15],
    [0, 0.2, 0],
  );
  for (let line = 0; line < 4; line++) {
    builder.box(
      "paint",
      "#4a5aa8",
      [0.16, 0.003, 0.01],
      [x - 0.68, tableTop + 0.012, z + 0.06 + line * 0.05],
      [0, 0.2, 0],
    );
  }
  builder.bar(
    "paint",
    "#e8b83a",
    [x - 0.6, tableTop + 0.015, z + 0.3],
    [x - 0.48, tableTop + 0.015, z + 0.2],
    0.015,
    5,
  );
  builder.cylinder("paint", palette.white, {
    radius: 0.05,
    length: 0.1,
    at: [x + 0.7, tableTop + 0.05, z + 0.25],
    segments: 12,
  });
  builder.cylinder("matte", "#7a4a2a", {
    radius: 0.044,
    length: 0.01,
    at: [x + 0.7, tableTop + 0.095, z + 0.25],
    segments: 12,
  });
  builder.torus(
    "paint",
    palette.white,
    0.03,
    0.008,
    [x + 0.755, tableTop + 0.05, z + 0.25],
    "z",
    8,
  );
  /* Two chairs */
  [-0.2, 0.75].forEach((dx) => {
    const seatX = x + dx;
    const seatZ = z + 0.75;
    builder.box(
      "matte",
      tableTimber,
      [0.42, 0.04, 0.4],
      [seatX, deckHeight + 0.45, seatZ],
    );
    builder.box(
      "matte",
      tableTimber,
      [0.42, 0.42, 0.04],
      [seatX, deckHeight + 0.68, seatZ + 0.2],
    );
    [-0.18, 0.18].forEach((legX) => {
      [-0.17, 0.17].forEach((legZ) => {
        builder.box(
          "matte",
          shade(tableTimber, 0.8),
          [0.04, 0.45, 0.04],
          [seatX + legX, deckHeight + 0.225, seatZ + legZ],
        );
      });
    });
  });
};

/** Three rotors with toothed rims, turning together on one spindle. */
const buildRotors = (builder: AttractionBuilder) => {
  builder.cylinder("metal", rotorSteel, {
    radius: 0.02,
    length: 0.58,
    at: [0, 0, 0],
    axis: "x",
    segments: 6,
  });
  [-0.15, 0, 0.15].forEach((dx, index) => {
    builder.cylinder("paint", index === 1 ? "#d8c08a" : keyCream, {
      radius: 0.11,
      length: 0.08,
      at: [dx, 0, 0],
      axis: "x",
      segments: 20,
    });
    builder.cylinder("metal", rotorSteel, {
      radius: 0.12,
      length: 0.025,
      at: [dx - 0.05, 0, 0],
      axis: "x",
      segments: 20,
    });
    for (let tooth = 0; tooth < 12; tooth++) {
      const angle = (tooth / 12) * Math.PI * 2;
      builder.box(
        "metal",
        shade(rotorSteel, 0.8),
        [0.025, 0.03, 0.03],
        [dx - 0.05, Math.cos(angle) * 0.13, Math.sin(angle) * 0.13],
        [angle, 0, 0],
      );
    }
    /* Letter marks round the ring */
    for (let mark = 0; mark < 8; mark++) {
      const angle = (mark / 8) * Math.PI * 2;
      builder.box(
        "paint",
        machinePanel,
        [0.04, 0.02, 0.005],
        [dx, Math.cos(angle) * 0.111, Math.sin(angle) * 0.111],
        [angle, 0, 0],
      );
    }
  });
};

const buildLitLamp = (builder: AttractionBuilder) => {
  builder.cylinder("glow", lampLit, {
    radius: 0.034,
    length: 0.02,
    at: [0, 0, 0],
    segments: 12,
  });
  builder.sphere("glow", lampLit, 0.05, [0, 0.03, 0], [1, 0.5, 1], 10);
};

const buildBulb = (builder: AttractionBuilder) => {
  builder.bar("paint", palette.black, [0, 0, 0], [0, -0.5, 0], 0.012, 3);
  builder.cylinder("paint", "#3c4a3a", {
    radius: 0.16,
    radiusEnd: 0.04,
    length: 0.12,
    at: [0, -0.56, 0],
    segments: 14,
  });
  builder.sphere(
    "glow",
    palette.warmLight,
    0.055,
    [0, -0.64, 0],
    [1, 1.2, 1],
    10,
  );
};

const buildCabinetsAndBoard = (builder: AttractionBuilder) => {
  /* Filing cabinets against the wall, left of the door */
  [-1.95, -1.45].forEach((x) => {
    builder.box(
      "paint",
      cabinetGreen,
      [0.46, 1.3, 0.5],
      [x, deckHeight + 0.65, hutFront + 0.28],
    );
    if (builder.isFar) {
      return;
    }
    for (let drawer = 0; drawer < 4; drawer++) {
      const y = deckHeight + 0.2 + drawer * 0.3;
      builder.box(
        "paint",
        shade(cabinetGreen, 1.12),
        [0.4, 0.26, 0.02],
        [x, y, hutFront + 0.535],
      );
      builder.box(
        "metal",
        rotorSteel,
        [0.12, 0.025, 0.03],
        [x, y + 0.05, hutFront + 0.55],
      );
      builder.box(
        "paint",
        palette.cream,
        [0.08, 0.04, 0.01],
        [x, y - 0.05, hutFront + 0.548],
      );
    }
  });
  if (!builder.isFar) {
    /* Box files stacked on top */
    ["#a8432e", "#2e5aa8", "#c9a24a"].forEach((colour, index) => {
      builder.box(
        "paint",
        colour,
        [0.08, 0.3, 0.26],
        [-1.85 + index * 0.1, deckHeight + 1.45, hutFront + 0.28],
      );
    });
  }
  /* The blackboard of ciphers, right of the door */
  const board = { x: 1.35, y: 1.25, z: hutFront + 0.04 };
  builder.box(
    "matte",
    blackboard,
    [1.5, 0.9, 0.03],
    [board.x, board.y, board.z],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    palette.paleTimber,
    [1.6, 0.06, 0.06],
    [board.x, board.y - 0.48, board.z + 0.02],
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [1.6, 0.05, 0.05],
    [board.x, board.y + 0.47, board.z + 0.01],
  );
  [-0.78, 0.78].forEach((dx) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.05, 1.0, 0.05],
      [board.x + dx, board.y, board.z + 0.01],
    );
  });
  /* Groups of five chalk letters, like a coded message */
  for (let line = 0; line < 4; line++) {
    for (let group = 0; group < 3; group++) {
      for (let letter = 0; letter < 5; letter++) {
        const seed = (line * 15 + group * 5 + letter) * 7;
        builder.box(
          "paint",
          chalk,
          [0.035, 0.07, 0.005],
          [
            board.x - 0.6 + group * 0.44 + letter * 0.07,
            board.y + 0.3 - line * 0.18,
            board.z + 0.02,
          ],
          [0, 0, ((seed % 5) - 2) * 0.35],
        );
      }
    }
  }
  /* An arrow and a chalk circle round the cracked word */
  builder.torus(
    "paint",
    chalk,
    0.12,
    0.008,
    [board.x + 0.46, board.y - 0.24, board.z + 0.02],
    "z",
    16,
  );
  builder.box(
    "paint",
    chalk,
    [0.008, 0.008, 0.005],
    [board.x, board.y, board.z + 0.02],
  );
  builder.box(
    "paint",
    chalk,
    [0.04, 0.012, 0.01],
    [board.x - 0.4, board.y - 0.47, board.z + 0.05],
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.gravel, [1.2, 0.03, 2.6], [0, 0.015, 2.5]);
  if (builder.isFar) {
    return;
  }
  /* Fire buckets on a red stand, and a pile of sandbags */
  const stand = { x: 2.85, z: -0.4 };
  builder.box("paint", bucketRed, [0.12, 1.2, 0.08], [stand.x, 0.6, stand.z]);
  builder.box("paint", bucketRed, [0.7, 0.08, 0.1], [stand.x, 1.0, stand.z]);
  [-0.22, 0.22].forEach((dx) => {
    builder.cylinder("paint", bucketRed, {
      radius: 0.11,
      radiusEnd: 0.14,
      length: 0.24,
      at: [stand.x + dx, 0.85, stand.z + 0.1],
      segments: 12,
    });
  });
  (
    [
      [-2.85, -0.5, 0.11, 0],
      [-2.85, -0.05, 0.11, 0.1],
      [-2.85, -0.28, 0.31, -0.1],
      [-3.0, 0.4, 0.11, 0.3],
    ] satisfies [number, number, number, number][]
  ).forEach(([sx, sz, sy, turn]) => {
    builder.sphere("matte", "#b9a578", 0.2, [sx, sy, sz], [1.5, 0.6, 1.0], 8);
    builder.box(
      "matte",
      "#9a8a62",
      [0.04, 0.08, 0.2],
      [sx + Math.cos(turn) * 0.25, sy, sz],
      [0, turn, 0],
    );
  });
  /* A bicycle stand with a wartime bicycle */
  const bike = { x: 3.0, z: 0.9 };
  [-0.38, 0.38].forEach((dz) => {
    builder.torus(
      "metal",
      palette.black,
      0.26,
      0.025,
      [bike.x, 0.28, bike.z + dz],
      "x",
      16,
    );
  });
  builder.bar(
    "paint",
    "#2a2a3a",
    [bike.x, 0.28, bike.z - 0.38],
    [bike.x, 0.6, bike.z],
    0.04,
    5,
  );
  builder.bar(
    "paint",
    "#2a2a3a",
    [bike.x, 0.28, bike.z + 0.38],
    [bike.x, 0.62, bike.z + 0.3],
    0.04,
    5,
  );
  builder.bar(
    "paint",
    "#2a2a3a",
    [bike.x, 0.6, bike.z],
    [bike.x, 0.62, bike.z + 0.3],
    0.04,
    5,
  );
  builder.box(
    "matte",
    palette.black,
    [0.1, 0.04, 0.18],
    [bike.x, 0.66, bike.z - 0.02],
  );
  builder.bar(
    "metal",
    rotorSteel,
    [bike.x - 0.22, 0.75, bike.z + 0.32],
    [bike.x + 0.22, 0.75, bike.z + 0.32],
    0.025,
    4,
  );
  builder.bar(
    "metal",
    rotorSteel,
    [bike.x, 0.62, bike.z + 0.3],
    [bike.x, 0.75, bike.z + 0.32],
    0.03,
    4,
  );
};

export const codebreakerHutModel: CuriosityModel = {
  kind: "codebreaker-hut",
  islandId: "starfall-isle",
  name: "Codebreaker Hut",
  fact: "In the Second World War, codebreakers at Bletchley Park worked in wooden huts to crack secret messages sent with Enigma machines. Turning rotors inside each machine scrambled every letter, so the codebreakers used logical reasoning to find the settings. Alan Turing designed a machine called the Bombe to test settings quickly, and his ideas helped lead to modern computers.",
  curriculumLink:
    "Computing, Key Stage 2: use logical reasoning to explain how some simple algorithms work and to detect and correct errors in algorithms and programs.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: 1.4, z: 3.4 },
  build: (builder) => {
    buildHut(builder);
    buildVeranda(builder);
    buildTableAndMachine(builder);
    buildCabinetsAndBoard(builder);
    buildGrounds(builder);
    addSignBoard(builder, [1.4, 0, 3.4], signColour);
  },
  moving: [
    {
      name: "rotors",
      pivot: rotorAt,
      build: buildRotors,
      motion: { kind: "whirl", axis: "x", idle: 0.2, speed: 3.5, reach: 6 },
    },
    {
      name: "lit lamp",
      pivot: litLampAt,
      build: buildLitLamp,
      motion: { kind: "wake", reach: 4.5 },
    },
    {
      name: "hanging bulb",
      pivot: bulbHook,
      build: buildBulb,
      motion: { kind: "swing", axis: "x", amplitude: 0.08, period: 3.4 },
    },
  ],
  decks: [
    buildFlatDeck(
      { minX: deck.minX, maxX: deck.maxX, minZ: deck.minZ, maxZ: deck.maxZ },
      deckHeight,
      "ground",
    ),
  ],
  blockers: [
    ...[-0.6, 0.6].flatMap((offset) =>
      listWallBlockers(
        { x: hut.x - hut.width / 2 + 0.6, z: hut.z + offset },
        { x: hut.x + hut.width / 2 - 0.6, z: hut.z + offset },
        0.65,
        0.6,
      ),
    ),
    ...listWallBlockers(
      { x: tableAt.x - 0.55, z: tableAt.z },
      { x: tableAt.x + 0.55, z: tableAt.z },
      0.45,
      0.55,
    ),
    { x: -1.7, z: hutFront + 0.28, radius: 0.5 },
    { x: 2.85, z: -0.4, radius: 0.4 },
    { x: -2.85, z: -0.2, radius: 0.45 },
    { x: 3.0, z: 0.9, radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Crack the code",
    news: "Click, clack, whirr! The rotors spun, the lamps lit up letter by letter, and the secret message read: WELL DONE CODEBREAKER.",
    tune: [76, 74, 76, 79, 76, 84],
  },
};
