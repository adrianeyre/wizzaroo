import {
  addBench,
  addGableRoof,
  addSignBoard,
  addWindow,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const timber = "#9a6a3e";
const darkTimber = "#6a4628";
const floorBoards = "#b88a58";
const thatch = "#b8a05a";
const darkThatch = "#94803e";
const leafDeep = "#256b2a";
const leafMid = "#2f8a35";
const leafBright = "#4fa83c";
const glassTint = "#bfe0d8";
const soil = "#6b4a2f";
const beetleShell = "#2b4fa8";
const beetleDark = "#1c2a5a";
const antRed = "#8a2a1a";
const signColour = "#4a7a2a";

/* The lodge: a long timber house with a leafy thatched roof */

const lodge = { x: 0, z: -3.0, halfX: 3.2, halfZ: 1.6, wall: 2.3, floor: 0.3 };
const verandaFront = lodge.z + lodge.halfZ + 1.1;

const buildLodge = (builder: AttractionBuilder) => {
  const { x, z, halfX, halfZ, wall, floor } = lodge;
  const back = z - halfZ;
  const front = z + halfZ;
  /* The floor and the veranda, on low posts */
  builder.box(
    "matte",
    darkTimber,
    [halfX * 2 + 0.1, floor, verandaFront - back + 0.1],
    [x, floor / 2, (back + verandaFront) / 2],
  );
  if (!builder.isFar) {
    const boards = 12;
    for (let board = 0; board < boards; board++) {
      const across = -halfX + ((board + 0.5) / boards) * halfX * 2;
      builder.box(
        "matte",
        board % 3 === 0 ? shade(floorBoards, 0.92) : floorBoards,
        [(halfX * 2) / boards - 0.03, 0.02, verandaFront - back],
        [x + across, floor + 0.01, (back + verandaFront) / 2],
      );
    }
  }
  /* Back and side walls, with planks */
  builder.box(
    "matte",
    timber,
    [halfX * 2, wall, 0.16],
    [x, floor + wall / 2, back + 0.08],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      timber,
      [0.16, wall, halfZ * 2],
      [x + side * (halfX - 0.08), floor + wall / 2, z],
    );
    addWindow(builder, {
      at: [x + side * (halfX + 0.01), floor + 1.35, z + 0.2],
      width: 0.9,
      height: 0.6,
      frame: palette.cream,
      turn: side * (Math.PI / 2),
    });
  });
  if (!builder.isFar) {
    for (let strip = 1; strip < 6; strip++) {
      const y = floor + (strip / 6) * wall;
      builder.box(
        "matte",
        darkTimber,
        [halfX * 2 + 0.02, 0.04, 0.02],
        [x, y, back - 0.01],
      );
    }
  }
  /* Posts holding up the roof over the veranda */
  [-1, 1].forEach((side) => {
    [front, verandaFront - 0.12].forEach((postZ) => {
      builder.cylinder("matte", darkTimber, {
        radius: 0.1,
        length: wall,
        at: [x + side * (halfX - 0.1), floor + wall / 2, postZ],
        segments: 8,
      });
    });
  });
  builder.box(
    "matte",
    darkTimber,
    [halfX * 2 + 0.2, 0.18, 0.18],
    [x, floor + wall - 0.05, verandaFront - 0.12],
  );
  /* The thatched roof, ridge along the lodge */
  const roofDepth = verandaFront - back + 0.2;
  addGableRoof(builder, {
    width: halfX * 2 + 0.4,
    depth: roofDepth,
    rise: 1.5,
    at: [x, floor + wall, (back + verandaFront) / 2],
    colour: thatch,
    overhang: 0.35,
    thickness: 0.22,
  });
  [-1, 1].forEach((side) => {
    builder.lathe(
      "matte",
      darkThatch,
      [
        [0, 1.5],
        [(roofDepth / 2) * 1.414, 0],
        [0, 0],
      ],
      [x + side * (halfX + 0.05), floor + wall, (back + verandaFront) / 2],
      "y",
      4,
    );
  });
  builder.cylinder("matte", darkThatch, {
    radius: 0.16,
    length: halfX * 2 + 1.0,
    at: [x, floor + wall + 1.55, (back + verandaFront) / 2],
    axis: "x",
    segments: builder.segments(8, 4),
  });
  if (!builder.isFar) {
    /* Bundles of thatch along the eaves */
    for (let tuft = 0; tuft < 9; tuft++) {
      const across = -halfX + (tuft / 8) * halfX * 2;
      builder.cylinder("matte", tuft % 2 === 0 ? darkThatch : thatch, {
        radius: 0.12,
        radiusEnd: 0.02,
        length: 0.35,
        at: [x + across, floor + wall - 0.28, verandaFront + 0.4],
        segments: 5,
      });
    }
    /* The name board over the veranda: a big painted beetle */
    builder.box(
      "paint",
      signColour,
      [2.4, 0.42, 0.06],
      [x, floor + wall + 0.35, verandaFront + 0.05],
    );
    builder.sphere(
      "paint",
      "#f2c230",
      0.14,
      [x - 0.85, floor + wall + 0.35, verandaFront + 0.09],
      [1, 1.3, 0.3],
      8,
    );
    builder.box(
      "paint",
      palette.cream,
      [1.4, 0.08, 0.02],
      [x + 0.2, floor + wall + 0.38, verandaFront + 0.09],
    );
    builder.box(
      "paint",
      palette.cream,
      [1.0, 0.06, 0.02],
      [x + 0.2, floor + wall + 0.26, verandaFront + 0.09],
    );
  }
  /* A step up onto the veranda */
  builder.box(
    "matte",
    darkTimber,
    [2.4, 0.15, 0.4],
    [x, 0.075, verandaFront + 0.2],
  );
};

/* Glass tanks along the back wall, each with its own creatures */

const tankY = lodge.floor + 0.75;
const tanks = [-2.0, 0, 2.0];

const addInsectLegs = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string,
  pairs = 3,
) => {
  for (let pair = 0; pair < pairs; pair++) {
    const along = (pair - (pairs - 1) / 2) * 0.35 * size;
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        colour,
        [at[0] + side * 0.05 * size, at[1], at[2] + along],
        [at[0] + side * 0.3 * size, at[1] - 0.12 * size, at[2] + along * 1.4],
        0.025 * size,
        3,
      );
    });
  }
};

const buildTanks = (builder: AttractionBuilder) => {
  const back = lodge.z - lodge.halfZ + 0.16;
  /* The counter they stand on */
  builder.box(
    "matte",
    darkTimber,
    [lodge.halfX * 2 - 0.3, 0.75, 0.62],
    [lodge.x, lodge.floor + 0.375, back + 0.31],
  );
  tanks.forEach((tankX, tank) => {
    const centre: Triple = [lodge.x + tankX, tankY + 0.38, back + 0.31];
    builder.box("glass", glassTint, [1.5, 0.76, 0.56], centre);
    builder.box(
      "matte",
      soil,
      [1.44, 0.1, 0.5],
      [centre[0], tankY + 0.05, centre[2]],
    );
    builder.box(
      "glow",
      tank === 2 ? "#ffb08a" : "#e8ffd0",
      [1.4, 0.04, 0.1],
      [centre[0], tankY + 0.74, centre[2]],
    );
    builder.box(
      "paint",
      palette.black,
      [1.54, 0.05, 0.6],
      [centre[0], tankY + 0.785, centre[2]],
    );
    if (builder.isFar) {
      return;
    }
    /* Plants inside each tank */
    [-0.45, 0.4].forEach((dx, plant) => {
      builder.sphere(
        "matte",
        plant === 0 ? leafMid : leafBright,
        0.2,
        [centre[0] + dx, tankY + 0.28, centre[2] - 0.05],
        [1, 1.2, 0.8],
        8,
      );
    });
    /* A little label under each tank */
    builder.box(
      "paint",
      tank === 2 ? "#c8302a" : palette.cream,
      [0.5, 0.16, 0.02],
      [centre[0], lodge.floor + 0.6, back + 0.63],
    );
    if (tank === 0) {
      /* Stick insects on a twig */
      builder.bar(
        "matte",
        darkTimber,
        [centre[0] - 0.55, tankY + 0.12, centre[2]],
        [centre[0] + 0.2, tankY + 0.6, centre[2]],
        0.03,
        4,
      );
      [
        [-0.2, 0.36, 0.5],
        [0.1, 0.5, 0.4],
      ].forEach(([dx, y, tilt]) => {
        const from: Triple = [
          centre[0] + dx - 0.2,
          tankY + y - 0.08,
          centre[2] + 0.08,
        ];
        const to: Triple = [
          centre[0] + dx + 0.2,
          tankY + y + 0.08,
          centre[2] + 0.08,
        ];
        builder.bar("matte", "#7a8a3a", from, to, 0.025, 4);
        addInsectLegs(
          builder,
          [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, centre[2] + 0.08],
          0.4 + tilt * 0.2,
          "#6a7a32",
        );
      });
    } else if (tank === 1) {
      /* Shiny jewel beetles */
      [
        [-0.2, "#2fbf6a"],
        [0.15, "#d8a02a"],
        [0.5, "#3a7ae0"],
      ].forEach(([dx, colour]) => {
        const at: Triple = [
          centre[0] + Number(dx),
          tankY + 0.16,
          centre[2] + 0.1,
        ];
        builder.sphere("paint", String(colour), 0.07, at, [0.8, 0.6, 1.2], 8);
        addInsectLegs(builder, [at[0], at[1], at[2]], 0.35, palette.black);
      });
    } else {
      /* Not an insect: a spider, with eight legs */
      const at: Triple = [centre[0] + 0.1, tankY + 0.18, centre[2] + 0.05];
      builder.sphere("matte", "#4a3428", 0.1, at, [1, 0.8, 1.2], 8);
      builder.sphere(
        "matte",
        "#4a3428",
        0.06,
        [at[0], at[1], at[2] + 0.13],
        [1, 0.8, 1],
        6,
      );
      addInsectLegs(builder, [at[0], at[1], at[2] + 0.08], 0.5, "#3a2820", 4);
    }
  });
  if (!builder.isFar) {
    /* A leafcutter ant farm in a thin glass case on the side wall */
    const wallX = lodge.x + lodge.halfX - 0.2;
    builder.box(
      "glass",
      glassTint,
      [0.12, 1.0, 1.6],
      [wallX, lodge.floor + 1.2, lodge.z - 0.6],
    );
    builder.box(
      "matte",
      soil,
      [0.08, 0.92, 1.52],
      [wallX - 0.01, lodge.floor + 1.2, lodge.z - 0.6],
    );
    [
      [0.95, -1.2, -0.1, 0.4],
      [1.25, -0.9, 0.2, -0.3],
      [1.4, -0.4, 0.1, 0.5],
      [1.05, 0.0, -0.2, 0],
    ].forEach(([y, z, rise, tilt]) => {
      builder.box(
        "matte",
        "#c9a46a",
        [0.09, 0.05, 0.4],
        [wallX - 0.02, lodge.floor + y + rise * 0.2, lodge.z + z],
        [tilt, 0, 0],
      );
    });
    /* A classification key on the other wall: six legs or not? */
    const keyX = lodge.x - lodge.halfX + 0.2;
    builder.box(
      "paint",
      palette.cream,
      [0.05, 1.0, 1.4],
      [keyX, lodge.floor + 1.3, lodge.z - 0.6],
    );
    builder.box(
      "paint",
      signColour,
      [0.06, 0.18, 0.5],
      [keyX + 0.01, lodge.floor + 1.65, lodge.z - 0.6],
    );
    [-0.35, 0.35].forEach((side) => {
      builder.box(
        "paint",
        side < 0 ? "#3aa64a" : "#c8302a",
        [0.06, 0.16, 0.42],
        [keyX + 0.01, lodge.floor + 1.05, lodge.z - 0.6 + side],
      );
      builder.box(
        "paint",
        darkTimber,
        [0.06, 0.32, 0.04],
        [keyX + 0.01, lodge.floor + 1.38, lodge.z - 0.6 + side * 0.6],
        [side * 1.4, 0, 0],
      );
    });
  }
};

/* The bug hotel, a tall stack of homes for minibeasts */

const hotel = { x: -5.3, z: 1.4 };

const buildBugHotel = (builder: AttractionBuilder) => {
  const { x, z } = hotel;
  const turn = 0.5;
  const shelves = 4;
  const width = 1.6;
  const depth = 0.6;
  const height = 2.0;
  const place = (dx: number, y: number, dz: number): Triple => [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    y,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      darkTimber,
      [0.1, height, depth],
      place(side * (width / 2), height / 2, 0),
      [0, turn, 0],
    );
  });
  for (let shelf = 0; shelf <= shelves; shelf++) {
    builder.box(
      "matte",
      timber,
      [width, 0.08, depth],
      place(0, (shelf / shelves) * height, 0),
      [0, turn, 0],
    );
  }
  /* A little pointed roof */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#7a3a2a",
      [0.65, 0.06, depth + 0.2],
      place(side * 0.4, height + 0.22, 0),
      [0, turn, side * -0.6],
    );
  });
  if (builder.isFar) {
    builder.box(
      "matte",
      "#a87a4a",
      [width - 0.12, height - 0.1, 0.1],
      place(0, height / 2, 0.2),
      [0, turn, 0],
    );
    return;
  }
  /* Filling: logs with holes, bamboo tubes, pine cones and straw */
  for (let shelf = 0; shelf < shelves; shelf++) {
    const y = ((shelf + 0.5) / shelves) * height;
    for (let slot = 0; slot < 3; slot++) {
      const dx = -0.5 + slot * 0.5;
      const kind = (shelf + slot) % 4;
      if (kind === 0) {
        builder.cylinder("matte", "#a87a4a", {
          radius: 0.2,
          length: depth - 0.05,
          at: place(dx, y, 0),
          axis: "z",
          segments: 10,
        });
        builder.cylinder("matte", "#3a2a1a", {
          radius: 0.04,
          length: 0.02,
          at: place(dx + 0.05, y + 0.05, depth / 2),
          axis: "z",
          segments: 5,
        });
      } else if (kind === 1) {
        for (let tube = 0; tube < 3; tube++) {
          builder.cylinder("matte", "#d8c070", {
            radius: 0.06,
            length: depth - 0.05,
            at: place(dx - 0.12 + tube * 0.12, y - 0.08 + (tube % 2) * 0.12, 0),
            axis: "z",
            segments: 6,
          });
        }
      } else if (kind === 2) {
        [-0.1, 0.1].forEach((side) => {
          builder.sphere(
            "matte",
            "#8a5a32",
            0.11,
            place(dx + side, y, 0.12),
            [0.9, 1.2, 0.9],
            7,
          );
        });
      } else {
        builder.box(
          "matte",
          "#d8c070",
          [0.42, 0.36, depth - 0.05],
          place(dx, y, 0),
          [0, turn, 0],
        );
      }
    }
  }
};

/* The giant rhinoceros beetle sculpture */

const beetle = { x: 4.6, z: 2.4, turn: 0 };
const beetleHeadPivot: Triple = [
  beetle.x + Math.sin(beetle.turn) * 0.85,
  0.62,
  beetle.z + Math.cos(beetle.turn) * 0.85,
];

const buildBeetleBody = (builder: AttractionBuilder) => {
  const { x, z, turn } = beetle;
  const place = (dx: number, y: number, dz: number): Triple => [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    y,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  builder.cylinder("matte", palette.stone, {
    radius: 1.1,
    length: 0.18,
    at: [x, 0.09, z],
    segments: builder.segments(20, 10),
  });
  /* The shiny wing cases, with a line down the middle */
  builder.sphere(
    "paint",
    beetleShell,
    0.7,
    place(0, 0.62, -0.25),
    [0.95, 0.65, 1.2],
    builder.isFar ? 12 : 18,
  );
  builder.sphere(
    "paint",
    beetleDark,
    0.42,
    place(0, 0.66, 0.5),
    [1.05, 0.75, 0.75],
    builder.isFar ? 8 : 14,
  );
  if (!builder.isFar) {
    builder.box("paint", beetleDark, [0.03, 0.02, 1.5], place(0, 1.07, -0.25), [
      0,
      turn,
      0,
    ]);
  }
  /* Six legs, three each side, each bent at the knee */
  for (let pair = 0; pair < 3; pair++) {
    const along = 0.45 - pair * 0.45;
    [-1, 1].forEach((side) => {
      const hip = place(side * 0.5, 0.45, along);
      const knee = place(side * 0.95, 0.62, along + 0.1 - pair * 0.1);
      const foot = place(side * 1.15, 0.18, along + 0.2 - pair * 0.25);
      builder.bar("paint", beetleDark, hip, knee, 0.09, 6);
      builder.bar("paint", beetleDark, knee, foot, 0.07, 6);
    });
  }
};

const buildBeetleHead = (builder: AttractionBuilder) => {
  const { turn } = beetle;
  const forward = (distance: number, y: number, side = 0): Triple => [
    Math.sin(turn) * distance + Math.cos(turn) * side,
    y,
    Math.cos(turn) * distance - Math.sin(turn) * side,
  ];
  builder.sphere(
    "paint",
    beetleDark,
    0.24,
    forward(0.18, 0.02),
    [1, 0.8, 1],
    12,
  );
  /* The big curved horn */
  builder.bar(
    "paint",
    beetleShell,
    forward(0.3, 0.05),
    forward(0.62, 0.32),
    0.12,
    6,
  );
  builder.bar(
    "paint",
    beetleShell,
    forward(0.62, 0.32),
    forward(0.7, 0.6),
    0.08,
    6,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.black,
      forward(0.3, 0.08, side * 0.1),
      forward(0.5, 0.2, side * 0.25),
      0.025,
      3,
    );
    builder.sphere(
      "paint",
      "#f2c230",
      0.04,
      forward(0.33, 0.1, side * 0.15),
      [1, 1, 1],
      6,
    );
  });
};

/* The ant tunnel: a giant hollow log to crawl through */

const log = { fromX: -4.2, toX: -1.2, z: 4.3, radius: 0.75, y: 0.62 };

const buildAntTunnel = (builder: AttractionBuilder) => {
  const length = log.toX - log.fromX;
  const middle = (log.fromX + log.toX) / 2;
  builder.cylinder("matte", "#7a5a3a", {
    radius: log.radius,
    length,
    at: [middle, log.y, log.z],
    axis: "x",
    segments: builder.segments(16, 8),
    isOpen: true,
  });
  [log.fromX, log.toX].forEach((endX) => {
    builder.torus(
      "matte",
      "#c9a46a",
      log.radius - 0.06,
      0.08,
      [endX, log.y, log.z],
      "x",
      builder.isFar ? 8 : 18,
    );
  });
  builder.cylinder("matte", "#2a1d12", {
    radius: log.radius - 0.1,
    length: length - 0.3,
    at: [middle, log.y, log.z],
    axis: "x",
    segments: builder.segments(14, 6),
    isOpen: true,
  });
  if (!builder.isFar) {
    /* Moss and a mushroom on top, and an ant painted on a board */
    builder.sphere(
      "matte",
      "#5f8f3a",
      0.35,
      [middle - 0.4, log.y + log.radius, log.z],
      [1.6, 0.35, 0.9],
      8,
    );
    builder.cylinder("matte", palette.cream, {
      radius: 0.04,
      length: 0.16,
      at: [middle + 0.6, log.y + log.radius + 0.06, log.z + 0.15],
      segments: 5,
    });
    builder.sphere(
      "paint",
      "#e8642a",
      0.11,
      [middle + 0.6, log.y + log.radius + 0.15, log.z + 0.15],
      [1, 0.5, 1],
      7,
    );
    const board: Triple = [log.fromX - 0.7, 0, log.z - 0.9];
    builder.box(
      "matte",
      darkTimber,
      [0.08, 1.3, 0.08],
      [board[0], 0.65, board[2]],
    );
    builder.box(
      "paint",
      palette.cream,
      [0.7, 0.4, 0.04],
      [board[0], 1.25, board[2] + 0.05],
    );
    [-0.15, 0, 0.15].forEach((dx, part) => {
      builder.sphere(
        "paint",
        antRed,
        part === 1 ? 0.05 : 0.065,
        [board[0] + dx, 1.25, board[2] + 0.08],
        [1.2, 1, 0.4],
        6,
      );
    });
  }
};

/* Outside: path, flowers, the ant hill and a bench */

const antHill = { x: 5.8, z: -1.6 };
const flowerBush = { x: -4.4, z: -1.4 };
const mantisBush = { x: -1.9, z: 2.2 };

const buildGrounds = (builder: AttractionBuilder) => {
  const path: [number, number][] = [
    [2.2, 8.2],
    [1.6, 6.2],
    [0.6, 3.8],
    [0, verandaFront + 0.4],
  ];
  for (let index = 1; index < path.length; index++) {
    const [fromX, fromZ] = path[index - 1];
    const [toX, toZ] = path[index];
    builder.box(
      "matte",
      palette.path,
      [1.4, 0.03, Math.hypot(toX - fromX, toZ - fromZ) + 0.5],
      [(fromX + toX) / 2, 0.015, (fromZ + toZ) / 2],
      [0, Math.atan2(toX - fromX, toZ - fromZ), 0],
    );
  }
  /* The ant hill */
  builder.lathe(
    "matte",
    "#9a6a3a",
    [
      [0, 0.75],
      [0.25, 0.7],
      [0.6, 0.4],
      [0.95, 0.08],
      [1.05, 0],
    ],
    [antHill.x, 0, antHill.z],
    "y",
    builder.segments(14, 8),
  );
  builder.cylinder("matte", "#3a2a1a", {
    radius: 0.1,
    length: 0.02,
    at: [antHill.x, 0.75, antHill.z],
    segments: 8,
  });
  /* A flowering bush the butterflies love */
  builder.sphere(
    "matte",
    leafMid,
    0.9,
    [flowerBush.x, 0.65, flowerBush.z],
    [1.1, 0.75, 1],
    builder.isFar ? 8 : 12,
  );
  if (!builder.isFar) {
    for (let bloom = 0; bloom < 9; bloom++) {
      const angle = bloom * 2.399;
      builder.sphere(
        "paint",
        ["#c43aa8", "#ff7a1a", "#ffcf2a"][bloom % 3],
        0.12,
        [
          flowerBush.x + Math.sin(angle) * 0.85,
          0.55 + (bloom % 3) * 0.25,
          flowerBush.z + Math.cos(angle) * 0.75,
        ],
        [1, 0.7, 1],
        6,
      );
    }
    /* Ferns and flowers dotted about */
    const ferns: [number, number, string][] = [
      [-6.6, -2.8, leafMid],
      [6.4, 4.6, leafBright],
      [-2.4, 7.2, leafDeep],
      [6.8, 0.6, leafMid],
    ];
    ferns.forEach(([x, z, colour], fern) => {
      for (let frond = 0; frond < 5; frond++) {
        const angle = (frond / 5) * Math.PI * 2 + fern;
        builder.box(
          "matte",
          frond % 2 === 0 ? colour : shade(colour, 1.15),
          [0.22, 0.02, 0.9],
          [x + Math.sin(angle) * 0.38, 0.28, z + Math.cos(angle) * 0.38],
          [-0.55, angle, 0],
        );
      }
    });
  }
  /* The bush the praying mantis hides in */
  builder.sphere(
    "matte",
    leafDeep,
    0.6,
    [mantisBush.x, 0.45, mantisBush.z],
    [1.2, 0.75, 1],
    builder.isFar ? 8 : 10,
  );
  /* Jungle trees behind */
  [
    [-5.8, -5.4, 1],
    [5.6, -5.6, 0.95],
  ].forEach(([x, z, size]) => {
    builder.cylinder("matte", "#5e4630", {
      radius: 0.22 * size,
      radiusEnd: 0.13 * size,
      length: 3.8 * size,
      at: [x, 1.9 * size, z],
      segments: 8,
    });
    const clumps: [number, number, number, number][] = builder.isFar
      ? [[0, 4.2, 0, 1.4]]
      : [
          [0, 4.3, 0, 1.2],
          [0.8, 3.9, 0.3, 0.9],
          [-0.7, 4.0, -0.3, 0.9],
          [0.1, 4.9, 0.2, 0.8],
        ];
    clumps.forEach(([dx, dy, dz, radius], index) => {
      builder.sphere(
        "matte",
        [leafDeep, leafMid, leafBright][index % 3],
        radius * size,
        [x + dx * size, dy * size, z + dz * size],
        [1, 0.75, 1],
        builder.isFar ? 10 : 9,
      );
    });
  });
  addBench(builder, [3.6, 0, 5.4], -0.6, palette.paleTimber);
};

/* The moving parts */

const buildMantis = (builder: AttractionBuilder) => {
  const green = "#7ac83a";
  builder.bar("paint", green, [0, 0, 0], [0, 0.45, 0.05], 0.06, 6);
  builder.bar("paint", green, [0, 0.45, 0.05], [0, 0.62, 0.18], 0.05, 6);
  builder.sphere("paint", green, 0.07, [0, 0.66, 0.22], [1.3, 0.8, 0.8], 8);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#d8f07a",
      0.03,
      [side * 0.07, 0.68, 0.24],
      [1, 1, 1],
      5,
    );
    builder.bar(
      "paint",
      green,
      [side * 0.03, 0.55, 0.12],
      [side * 0.08, 0.6, 0.3],
      0.035,
      4,
    );
    builder.bar(
      "paint",
      green,
      [side * 0.08, 0.6, 0.3],
      [side * 0.06, 0.45, 0.33],
      0.03,
      4,
    );
    builder.box(
      "glass",
      "#d8f0c0",
      [0.08, 0.32, 0.02],
      [side * 0.05, 0.25, -0.04],
      [0.1, 0, side * 0.15],
    );
  });
};

const firefliesPivot: Triple = [hotel.x, 1.4, hotel.z];

const buildFireflies = (builder: AttractionBuilder) => {
  const count = builder.isFar ? 4 : 12;
  for (let index = 0; index < count; index++) {
    const angle = index * 2.399;
    const reach = 0.9 + (index % 4) * 0.35;
    builder.sphere(
      "glow",
      index % 2 === 0 ? "#e8ff7a" : "#ffe27a",
      0.05,
      [
        Math.sin(angle) * reach,
        ((index * 0.37) % 1) * 1.2 - 0.4,
        Math.cos(angle) * reach,
      ],
      [1, 1, 1],
      6,
    );
  }
};

/** A leafcutter ant carrying a bit of leaf, facing local -z. */
const buildAnt = (builder: AttractionBuilder) => {
  [0.06, -0.02, -0.1].forEach((z, part) => {
    builder.sphere(
      "paint",
      antRed,
      part === 1 ? 0.035 : 0.045,
      [0, 0.06, z],
      [1, 0.9, 1.3],
      6,
    );
  });
  builder.box(
    "matte",
    leafBright,
    [0.16, 0.12, 0.01],
    [0, 0.18, -0.08],
    [0, 0, 0.3],
  );
  if (!builder.isFar) {
    addInsectLegs(builder, [0, 0.05, -0.02], 0.25, "#4a1a10");
  }
};

const buildButterfly = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    builder.box("paint", "#ff8a1a", [0.28, 0.01, 0.14], [0, 0.02, 0]);
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#ff8a1a",
      0.08,
      [side * 0.07, 0.02, 0.02],
      [1, 0.15, 0.8],
      6,
    );
    builder.sphere(
      "paint",
      "#2b2b2b",
      0.05,
      [side * 0.06, 0.01, -0.07],
      [1, 0.15, 0.8],
      5,
    );
  });
  builder.cylinder("matte", palette.black, {
    radius: 0.012,
    length: 0.14,
    at: [0, 0.02, 0],
    axis: "z",
    segments: 4,
  });
};

/* Young explorers with magnifying glasses */

const buildExplorer = (builder: AttractionBuilder) => {
  [-0.07, 0.07].forEach((side) => {
    builder.box("matte", "#4a5a3a", [0.09, 0.42, 0.1], [side, 0.21, 0]);
  });
  builder.cylinder("matte", "#e8b03a", {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.4,
    at: [0, 0.62, 0],
    segments: 10,
  });
  builder.bar(
    "matte",
    "#e8b03a",
    [-0.17, 0.78, 0],
    [-0.22, 0.5, 0.05],
    0.07,
    5,
  );
  builder.bar("matte", "#e8b03a", [0.17, 0.78, 0], [0.2, 0.62, 0.2], 0.07, 5);
  builder.sphere("matte", "#c98d63", 0.13, [0, 0.95, 0], [1, 1.05, 1], 10);
  builder.sphere("matte", "#5a3a22", 0.135, [0, 1.0, -0.02], [1, 0.7, 1], 10);
  if (!builder.isFar) {
    builder.torus(
      "metal",
      palette.brass,
      0.07,
      0.012,
      [0.2, 0.72, 0.28],
      "z",
      12,
    );
    builder.cylinder("glass", "#cfe8f0", {
      radius: 0.065,
      length: 0.01,
      at: [0.2, 0.72, 0.28],
      axis: "z",
      segments: 10,
    });
  }
};

/* The ride: crawl through the ant tunnel */

const tunnelStart = { x: log.fromX - 0.9, z: log.z + 0.3 };
const tunnelFinish = { x: log.toX + 0.9, z: log.z + 0.5 };

const tunnelRide = (progress: number): LocalSpot => {
  const points: [number, number, number][] = [
    [tunnelStart.x, 0, tunnelStart.z],
    [log.fromX - 0.3, 0, log.z],
    [log.toX + 0.3, 0, log.z],
    [tunnelFinish.x, 0, tunnelFinish.z],
  ];
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point[0] - points[index][0], point[2] - points[index][2]),
    );
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let left = Math.min(1, Math.max(0, progress)) * total;
  for (let index = 0; index < lengths.length; index++) {
    const [fromX, , fromZ] = points[index];
    const [toX, , toZ] = points[index + 1];
    if (left <= lengths[index] || index === lengths.length - 1) {
      const share = Math.min(1, left / lengths[index]);
      const isInside = index === 1;
      return {
        x: fromX + (toX - fromX) * share,
        y: isInside ? 0.02 + 0.04 * Math.abs(Math.sin(share * Math.PI * 6)) : 0,
        z: fromZ + (toZ - fromZ) * share,
        heading: Math.atan2(toX - fromX, toZ - fromZ),
      };
    }
    left -= lengths[index];
  }
  return { x: tunnelFinish.x, y: 0, z: tunnelFinish.z, heading: Math.PI / 2 };
};

const lodgeDeck = buildFlatDeck(
  {
    minX: lodge.x - lodge.halfX + 0.2,
    maxX: lodge.x + lodge.halfX - 0.2,
    minZ: lodge.z - lodge.halfZ + 0.2,
    maxZ: verandaFront,
  },
  lodge.floor,
);

export const insectHouseModel: NewLandAttractionModel = {
  kind: "insect-house",
  islandId: "jungle-reach",
  name: "Insect House",
  fact: "Every insect has six legs and three parts to its body: a head, a thorax and an abdomen. Most have two feelers called antennae, and many have wings. A spider has eight legs and only two body parts, so it is not an insect, and that is how a classification key sorts living things into groups.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Recognise that living things can be grouped in a variety of ways, and explore and use classification keys to help group, identify and name them (insects have six legs, spiders have eight).",
  footprint: 9,
  setting: "inland",
  signSpot: { x: 2.4, z: 8.4 },
  build: (builder) => {
    buildGrounds(builder);
    buildLodge(builder);
    buildTanks(builder);
    buildBugHotel(builder);
    buildBeetleBody(builder);
    buildAntTunnel(builder);
    addSignBoard(builder, [2.4, 0, 7.7], signColour, -0.15);
  },
  moving: [
    {
      name: "beetle's head",
      pivot: beetleHeadPivot,
      build: buildBeetleHead,
      motion: { kind: "nod", axis: "x", reach: 5, amplitude: 0.3, period: 1.6 },
    },
    {
      name: "praying mantis",
      pivot: [mantisBush.x, 0.2, mantisBush.z + 0.1],
      build: buildMantis,
      motion: { kind: "rise", reach: 4, height: 0.75, period: 2.2 },
    },
    {
      name: "fireflies",
      pivot: firefliesPivot,
      build: buildFireflies,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "leafcutter ants",
      pivot: [antHill.x, 0.02, antHill.z],
      build: buildAnt,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 1.3,
        count: 4,
        speed: 0.5,
        isFacingAlong: true,
      },
    },
    {
      name: "butterflies",
      pivot: [flowerBush.x, 1.5, flowerBush.z],
      build: buildButterfly,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 1.2,
        count: 4,
        speed: 0.7,
        isFacingAlong: true,
        bob: 0.3,
      },
    },
  ],
  wanderers: [
    {
      name: "young explorers",
      build: buildExplorer,
      count: 3,
      centre: { x: 0.4, z: 3.4 },
      radius: 1.6,
      speed: 0.45,
    },
  ],
  decks: [lodgeDeck],
  rides: [
    {
      id: "ant-tunnel",
      name: "the ant tunnel",
      start: tunnelStart,
      reach: 0.6,
      seconds: 7,
      finish: tunnelFinish,
      follow: tunnelRide,
    },
  ],
  play: {
    label: "Count the legs",
    news: "One, two, three, four, five, six! The beetle, the ant and the butterfly all have six legs, so they are insects. The spider has eight!",
  },
};
