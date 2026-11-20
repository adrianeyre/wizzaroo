import { BoxGeometry } from "three";
import {
  addBench,
  addLampPost,
  addSignBoard,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type SmokeSource,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addCoolingTower,
  ash,
  ashPad,
  basalt,
  basaltDark,
  brinePipe,
  bronze,
  buildEngineer,
  buildHall,
  buildRotor,
  buildTurbine,
  concrete,
  darkSteel,
  hall,
  hallMidZ,
  hatYellow,
  lava,
  lavaCore,
  pipeSilver,
  rotorPivot,
  signColour,
  silica,
  sinter,
  steel,
  trim,
  valveRed,
  warmLight,
  wellGreen,
} from "./geothermal-plant-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const gantry = { minX: -2.8, maxX: 2.8, minZ: -3.3, maxZ: -2.1, height: 1.0 };
const stairs = { minX: 1.6, maxX: 2.8, depth: 0.4, count: 4 };
const stairsEnd = gantry.maxZ + stairs.depth * stairs.count;
const railHeight = 0.95;
const steamX = -5.35;
const brineX = -5.0;
const pipeY = 2.25;
const frameZs = [4.0, 2.4, 0.8, -0.8, -2.4, -4.0, -5.2];
const outerPostX = -5.9;
const innerPostX = -4.6;
const trolleyX = -6.45;
const trolleyRailY = 2.95;
const seatY = 1.4;
const trolleyParkZ = 3.8;
const trolleyEndZ = -4.0;
const wellAt = { x: steamX, z: 5.9 };
const handwheelPivot: Triple = [wellAt.x, 1.78, wellAt.z];
const injectionAt = { x: brineX, z: 4.6 };
const towers = [
  { x: 5.4, z: -5.6, radius: 1.3, height: 3.8 },
  { x: 7.1, z: -2.4, radius: 1.15, height: 3.4 },
];
const transformerAt = { x: 4.6, z: 0.2 };
const pylonAt = { x: 7.4, z: 3.0 };
const pylonHeight = 4.2;
const poolAt = { x: 3.0, z: 4.3 };
const poolRadius = 1.35;
const boardAt = { x: -1.9, z: 1.4 };
const bulbPivot: Triple = [0, hall.height + 1.55, hallMidZ];
const rideStart = { x: -6.6, z: 4.8 };
const rideFinish = { x: -7.2, z: -4.9 };

/* The grounds */

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", ash, [1.6, 0.04, 11.2], [0.6, 0.02, 3.8]);
  builder.box("matte", ash, [1.4, 0.04, 2.0], [-6.5, 0.02, 4.9]);
  if (!builder.isFar) {
    /* Painted lines where the trolley is boarded */
    [4.3, 5.5].forEach((z) => {
      builder.box("paint", hatYellow, [1.3, 0.045, 0.08], [-6.5, 0.025, z]);
    });
    const boulders: [number, number, number][] = [
      [-8.4, 1.8, 0.55],
      [-3.0, 8.6, 0.45],
      [8.6, -0.2, 0.5],
      [2.4, -8.6, 0.6],
      [-2.0, -8.4, 0.5],
      [5.6, 7.0, 0.45],
    ];
    boulders.forEach(([x, z, size], index) => {
      builder.sphere(
        "matte",
        index % 2 === 0 ? basalt : basaltDark,
        size,
        [x, size * 0.3, z],
        [1.25, 0.7, 1],
        6,
      );
    });
  }
  addLampPost(builder, [-2.4, 0, 0.2]);
  addLampPost(builder, [3.5, 0, -1.0]);
  addBench(builder, [-3.1, 0, 3.4], Math.PI, shade(bronze, 0.8));
  addBench(builder, [5.2, 0, 3.2], -Math.PI / 2, shade(bronze, 0.8));
  addSignBoard(builder, [-1.4, 0, 8.4], signColour);
};

/* The viewing gantry in front of the hall's window */

const buildGantry = (builder: AttractionBuilder) => {
  const width = gantry.maxX - gantry.minX;
  const depth = gantry.maxZ - gantry.minZ;
  const midZ = (gantry.minZ + gantry.maxZ) / 2;
  builder.box(
    "metal",
    darkSteel,
    [width, 0.08, depth],
    [0, gantry.height - 0.04, midZ],
  );
  builder.box(
    "paint",
    trim,
    [width + 0.04, 0.12, 0.06],
    [0, gantry.height - 0.08, gantry.maxZ],
  );
  if (!builder.isFar) {
    for (let x = gantry.minX + 0.2; x < gantry.maxX; x += 0.2) {
      builder.box(
        "metal",
        steel,
        [0.025, 0.085, depth - 0.05],
        [x, gantry.height - 0.035, midZ],
      );
    }
  }
  [gantry.minX + 0.1, 0, gantry.maxX - 0.1].forEach((x) => {
    builder.cylinder("metal", steel, {
      radius: 0.07,
      length: gantry.height - 0.08,
      at: [x, (gantry.height - 0.08) / 2, gantry.maxZ - 0.1],
      segments: 8,
    });
  });
  /* The stairs, with a rail each side */
  for (let step = 0; step < stairs.count; step++) {
    const height = gantry.height - 0.2 * (step + 1);
    builder.box(
      "metal",
      step % 2 === 0 ? darkSteel : shade(darkSteel, 1.2),
      [stairs.maxX - stairs.minX, height, stairs.depth],
      [
        (stairs.minX + stairs.maxX) / 2,
        height / 2,
        gantry.maxZ + stairs.depth * (step + 0.5),
      ],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        hatYellow,
        [stairs.maxX - stairs.minX, 0.02, 0.06],
        [
          (stairs.minX + stairs.maxX) / 2,
          height + 0.005,
          gantry.maxZ + stairs.depth * step + 0.05,
        ],
      );
    }
  }
  [stairs.minX + 0.04, stairs.maxX - 0.04].forEach((x) => {
    builder.bar(
      "metal",
      trim,
      [x, gantry.height + railHeight, gantry.maxZ],
      [x, 0.2 + railHeight, stairsEnd - 0.1],
      0.06,
      6,
    );
    builder.bar(
      "metal",
      steel,
      [x, 0.2, stairsEnd - 0.1],
      [x, 0.2 + railHeight, stairsEnd - 0.1],
      0.05,
      5,
    );
  });
  /* Railings: along the front (but not over the stairs) and the ends */
  const runs: [number, number, number, number][] = [
    [
      gantry.minX + 0.04,
      gantry.maxZ - 0.04,
      stairs.minX + 0.04,
      gantry.maxZ - 0.04,
    ],
    [gantry.minX + 0.04, gantry.minZ, gantry.minX + 0.04, gantry.maxZ - 0.04],
    [gantry.maxX - 0.04, gantry.minZ, gantry.maxX - 0.04, gantry.maxZ - 0.04],
  ];
  runs.forEach(([fromX, fromZ, toX, toZ]) => {
    const top = gantry.height + railHeight;
    builder.bar("metal", trim, [fromX, top, fromZ], [toX, top, toZ], 0.06, 6);
    if (!builder.isFar) {
      builder.bar(
        "metal",
        steel,
        [fromX, gantry.height + 0.48, fromZ],
        [toX, gantry.height + 0.48, toZ],
        0.035,
        4,
      );
    }
    const length = Math.hypot(toX - fromX, toZ - fromZ);
    const posts = Math.max(1, Math.round(length / (builder.isFar ? 1.6 : 0.8)));
    for (let post = 0; post <= posts; post++) {
      const share = post / posts;
      builder.box(
        "metal",
        steel,
        [0.05, railHeight, 0.05],
        [
          fromX + (toX - fromX) * share,
          gantry.height + railHeight / 2,
          fromZ + (toZ - fromZ) * share,
        ],
      );
    }
  });
};

/* The steam well, the pipeline and the trolley that runs beside it */

/** A run of pipe from one point to another, with a ball at each bend. */
const addPipe = (
  builder: AttractionBuilder,
  points: readonly Triple[],
  colour: string,
  radius: number,
) => {
  points.slice(1).forEach((point, index) => {
    builder.bar("metal", colour, points[index], point, radius * 2, 8);
  });
  (builder.isFar ? [] : points.slice(1, -1)).forEach((point) => {
    builder.sphere("metal", colour, radius * 1.05, point, [1, 1, 1], 6);
  });
};

const buildWell = (builder: AttractionBuilder) => {
  const { x, z } = wellAt;
  builder.box("matte", concrete, [1.4, 0.12, 1.4], [x, 0.06, z]);
  builder.box("matte", basaltDark, [0.9, 0.04, 0.9], [x, 0.13, z]);
  builder.cylinder("paint", wellGreen, {
    radius: 0.14,
    length: 1.5,
    at: [x, 0.85, z],
    segments: 12,
  });
  /* Flanges and side valves: the "Christmas tree" */
  [0.3, 0.75, 1.2, 1.6].forEach((y) => {
    builder.cylinder("metal", steel, {
      radius: 0.22,
      length: 0.08,
      at: [x, y, z],
      segments: 12,
    });
  });
  [-1, 1].forEach((side) => {
    builder.box("paint", wellGreen, [0.5, 0.2, 0.2], [x + side * 0.3, 0.75, z]);
    if (!builder.isFar) {
      builder.torus(
        "metal",
        valveRed,
        0.12,
        0.025,
        [x + side * 0.58, 0.75, z],
        "x",
        12,
      );
      builder.bar(
        "metal",
        valveRed,
        [x + side * 0.58, 0.63, z],
        [x + side * 0.58, 0.87, z],
        0.025,
        4,
      );
    }
  });
  if (!builder.isFar) {
    /* A pressure gauge */
    builder.cylinder("paint", "#f4f1ea", {
      radius: 0.1,
      length: 0.04,
      at: [x, 1.4, z + 0.2],
      axis: "z",
      segments: 12,
    });
    builder.box(
      "paint",
      valveRed,
      [0.015, 0.08, 0.01],
      [x + 0.02, 1.42, z + 0.225],
      [0, 0, -0.6],
    );
  }
  /* The steam pipe leaves the well and climbs to the rack */
  addPipe(
    builder,
    [
      [x, 1.3, z],
      [x, 1.3, z - 0.6],
      [x, pipeY, z - 0.6],
      [steamX, pipeY, 1.4],
      [steamX, pipeY + 1.05, 1.4],
      [steamX, pipeY + 1.05, 0.2],
      [steamX, pipeY, 0.2],
      [steamX, pipeY, -5.2],
      [hall.minX - 0.05, pipeY, -5.2],
    ],
    pipeSilver,
    0.17,
  );
  /* The cooled water goes back down into the ground */
  addPipe(
    builder,
    [
      [hall.minX - 0.05, pipeY - 0.35, -4.8],
      [brineX, pipeY - 0.35, -4.8],
      [brineX, pipeY - 0.35, injectionAt.z],
      [brineX, 0.3, injectionAt.z],
    ],
    brinePipe,
    0.11,
  );
  builder.box(
    "matte",
    concrete,
    [0.6, 0.3, 0.6],
    [injectionAt.x, 0.15, injectionAt.z],
  );
  if (!builder.isFar) {
    /* Silver cladding bands on the steam pipe */
    for (let bandZ = 3.8; bandZ > -5; bandZ -= 1.2) {
      builder.cylinder("metal", shade(pipeSilver, 0.85), {
        radius: 0.19,
        length: 0.06,
        at: [steamX, pipeY, bandZ],
        axis: "z",
        segments: 10,
      });
    }
  }
};

const buildHandwheel = (builder: AttractionBuilder) => {
  builder.cylinder("metal", steel, {
    radius: 0.04,
    length: 0.2,
    at: [0, -0.06, 0],
    segments: 6,
  });
  builder.torus("metal", valveRed, 0.26, 0.035, [0, 0.04, 0], "y", 16);
  [0, 1, 2].forEach((spoke) => {
    const angle = (spoke / 3) * Math.PI;
    builder.bar(
      "metal",
      valveRed,
      [Math.sin(angle) * 0.26, 0.04, Math.cos(angle) * 0.26],
      [-Math.sin(angle) * 0.26, 0.04, -Math.cos(angle) * 0.26],
      0.03,
      4,
    );
  });
  builder.sphere("metal", bronze, 0.05, [0, 0.06, 0], [1, 0.6, 1], 6);
};

const buildRack = (builder: AttractionBuilder) => {
  frameZs.forEach((z) => {
    builder.box(
      "metal",
      darkSteel,
      [0.12, trolleyRailY + 0.15, 0.12],
      [outerPostX, (trolleyRailY + 0.15) / 2, z],
    );
    builder.box(
      "metal",
      darkSteel,
      [0.12, pipeY - 0.2, 0.12],
      [innerPostX, (pipeY - 0.2) / 2, z],
    );
    builder.box(
      "metal",
      trim,
      [innerPostX - outerPostX + 0.12, 0.1, 0.14],
      [(outerPostX + innerPostX) / 2, pipeY - 0.22, z],
    );
    builder.box("metal", trim, [0.1, 0.1, 0.14], [brineX, pipeY - 0.52, z]);
    if (z < 4.4 && z > -4.6) {
      builder.box(
        "metal",
        darkSteel,
        [0.7, 0.1, 0.1],
        [(outerPostX + trolleyX) / 2, trolleyRailY + 0.12, z],
      );
    }
    if (!builder.isFar) {
      builder.box("matte", concrete, [0.28, 0.12, 0.28], [outerPostX, 0.06, z]);
      builder.box("matte", concrete, [0.28, 0.12, 0.28], [innerPostX, 0.06, z]);
      builder.bar(
        "metal",
        darkSteel,
        [outerPostX, 0.3, z],
        [innerPostX, pipeY - 0.3, z],
        0.05,
        4,
      );
    }
  });
  /* The trolley's rail, an iron beam on brackets */
  const railLength = 4.3 - trolleyEndZ + 0.3;
  builder.box(
    "metal",
    darkSteel,
    [0.08, 0.2, railLength],
    [trolleyX, trolleyRailY, (4.3 + trolleyEndZ - 0.3) / 2],
  );
  builder.box(
    "metal",
    steel,
    [0.2, 0.04, railLength],
    [trolleyX, trolleyRailY - 0.1, (4.3 + trolleyEndZ - 0.3) / 2],
  );
  /* The trolley, parked where you climb in */
  const z = trolleyParkZ;
  [-0.18, 0.18].forEach((dz) => {
    builder.cylinder("metal", steel, {
      radius: 0.07,
      length: 0.05,
      at: [trolleyX - 0.07, trolleyRailY - 0.04, z + dz],
      axis: "x",
      segments: 10,
    });
  });
  builder.box(
    "paint",
    trim,
    [0.1, 0.18, 0.5],
    [trolleyX - 0.12, trolleyRailY - 0.2, z],
  );
  builder.bar(
    "metal",
    steel,
    [trolleyX, trolleyRailY - 0.25, z],
    [trolleyX, 2.2, z],
    0.06,
    6,
  );
  builder.box("paint", trim, [0.8, 0.05, 0.8], [trolleyX, 2.2, z]);
  builder.box(
    "metal",
    darkSteel,
    [0.75, 0.05, 0.75],
    [trolleyX, seatY - 0.03, z],
  );
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      builder.bar(
        "metal",
        steel,
        [trolleyX + sx * 0.35, seatY - 0.03, z + sz * 0.35],
        [trolleyX + sx * 0.35, 2.2, z + sz * 0.35],
        0.04,
        4,
      );
    });
  });
  builder.box(
    "paint",
    valveRed,
    [0.6, 0.08, 0.35],
    [trolleyX, seatY + 0.3, z - 0.15],
  );
  builder.box(
    "paint",
    valveRed,
    [0.6, 0.4, 0.06],
    [trolleyX, seatY + 0.5, z - 0.32],
  );
  if (!builder.isFar) {
    builder.bar(
      "metal",
      hatYellow,
      [trolleyX - 0.35, seatY + 0.55, z + 0.2],
      [trolleyX + 0.35, seatY + 0.55, z + 0.2],
      0.04,
      4,
    );
    builder.box(
      "glow",
      warmLight,
      [0.12, 0.08, 0.04],
      [trolleyX, 2.12, z + 0.4],
    );
    /* A sign by the boarding spot */
    builder.box("matte", darkSteel, [0.06, 1.0, 0.06], [-7.4, 0.5, 4.9]);
    builder.box("paint", hatYellow, [0.5, 0.35, 0.04], [-7.4, 1.1, 4.92]);
    builder.box("paint", basaltDark, [0.3, 0.06, 0.01], [-7.4, 1.12, 4.95]);
  }
};

/* Cooling towers, the transformer and the pylon */

const buildPower = (builder: AttractionBuilder) => {
  towers.forEach((tower) => {
    addCoolingTower(builder, tower, tower.radius, tower.height);
  });
  /* The transformer, which makes the electricity ready for the wires */
  const { x, z } = transformerAt;
  builder.box("matte", concrete, [1.5, 0.15, 1.3], [x, 0.075, z]);
  builder.box("paint", "#5f6f62", [1.0, 1.0, 0.8], [x, 0.65, z]);
  if (!builder.isFar) {
    for (let fin = 0; fin < 5; fin++) {
      builder.box(
        "paint",
        shade("#5f6f62", 0.85),
        [0.04, 0.8, 0.3],
        [x - 0.4 + fin * 0.2, 0.6, z + 0.52],
      );
    }
    builder.box("paint", hatYellow, [0.3, 0.25, 0.01], [x, 0.7, z - 0.41]);
  }
  (builder.isFar ? [] : [-0.3, 0, 0.3]).forEach((dx) => {
    builder.lathe(
      "glass",
      "#7a5a40",
      [
        [0.001, 0],
        [0.09, 0],
        [0.11, 0.08],
        [0.07, 0.12],
        [0.11, 0.2],
        [0.07, 0.24],
        [0.11, 0.32],
        [0.05, 0.4],
        [0.001, 0.42],
      ],
      [x + dx, 1.15, z],
      "y",
      6,
    );
  });
  /* The pylon: a lattice tower carrying the wires away */
  const half = (height: number) => 0.5 - (height / pylonHeight) * 0.35;
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  corners.forEach(([sx, sz]) => {
    builder.bar(
      "metal",
      steel,
      [pylonAt.x + sx * half(0), 0, pylonAt.z + sz * half(0)],
      [
        pylonAt.x + sx * half(pylonHeight),
        pylonHeight,
        pylonAt.z + sz * half(pylonHeight),
      ],
      0.07,
      4,
    );
  });
  const levels = builder.isFar ? [2.0] : [1.2, 2.4, 3.5];
  levels.forEach((height, index) => {
    const lower = index === 0 ? 0 : levels[index - 1];
    corners.forEach(([sx, sz], corner) => {
      const [nx, nz] = corners[(corner + 1) % 4];
      builder.bar(
        "metal",
        steel,
        [pylonAt.x + sx * half(height), height, pylonAt.z + sz * half(height)],
        [pylonAt.x + nx * half(height), height, pylonAt.z + nz * half(height)],
        0.04,
        4,
      );
      if (!builder.isFar) {
        builder.bar(
          "metal",
          steel,
          [pylonAt.x + sx * half(lower), lower, pylonAt.z + sz * half(lower)],
          [
            pylonAt.x + nx * half(height),
            height,
            pylonAt.z + nz * half(height),
          ],
          0.03,
          4,
        );
      }
    });
  });
  [3.2, pylonHeight - 0.1].forEach((height) => {
    builder.bar(
      "metal",
      steel,
      [pylonAt.x - 1.1, height, pylonAt.z],
      [pylonAt.x + 1.1, height, pylonAt.z],
      0.07,
      4,
    );
  });
  builder.lathe(
    "metal",
    steel,
    [
      [0.25, 0],
      [0.001, 0.5],
    ],
    [pylonAt.x, pylonHeight, pylonAt.z],
    "y",
    4,
  );
  /* The wires, from the transformer to the pylon's arms */
  [-0.3, 0, 0.3].forEach((dx, wire) => {
    const armX = pylonAt.x + (wire - 1) * 1.0;
    builder.bar(
      "metal",
      "#2b2b2e",
      [x + dx, 1.56, z],
      [armX, 3.1, pylonAt.z],
      0.025,
      4,
    );
    if (!builder.isFar) {
      builder.cylinder("glass", "#7a5a40", {
        radius: 0.06,
        length: 0.2,
        at: [armX, 3.1, pylonAt.z],
        segments: 6,
      });
    }
  });
};

/* The geyser pool, milky blue with silica */

const buildPool = (builder: AttractionBuilder) => {
  const { x, z } = poolAt;
  builder.lathe(
    "matte",
    sinter,
    [
      [poolRadius - 0.05, 0.03],
      [poolRadius + 0.15, 0],
      [poolRadius + 0.2, 0.12],
      [poolRadius + 0.05, 0.22],
      [poolRadius - 0.05, 0.16],
    ],
    [x, 0, z],
    "y",
    24,
  );
  builder.cylinder("water", silica, {
    radius: poolRadius,
    length: 0.04,
    at: [x, 0.12, z],
    segments: builder.segments(24, 12),
  });
  builder.cylinder("water", shade(silica, 0.6), {
    radius: 0.55,
    length: 0.04,
    at: [x, 0.125, z],
    segments: builder.segments(16, 8),
  });
  builder.lathe(
    "matte",
    sinter,
    [
      [0.45, 0],
      [0.25, 0.22],
      [0.13, 0.27],
      [0.08, 0.2],
    ],
    [x, 0.04, z],
    "y",
    14,
  );
  if (!builder.isFar) {
    for (let rock = 0; rock < 7; rock++) {
      const angle = (rock / 7) * Math.PI * 2 + 0.4;
      builder.sphere(
        "matte",
        rock % 2 === 0 ? basalt : shade(sinter, 0.85),
        0.2 + (rock % 3) * 0.05,
        [
          x + Math.sin(angle) * (poolRadius + 0.3),
          0.08,
          z + Math.cos(angle) * (poolRadius + 0.3),
        ],
        [1.3, 0.55, 1],
        6,
      );
    }
    /* Little steam vents round about */
    [
      [-7.8, -1.8],
      [6.2, 5.6],
      [-3.6, 6.6],
    ].forEach(([ventX, ventZ]) => {
      builder.lathe(
        "matte",
        sinter,
        [
          [0.35, 0],
          [0.12, 0.15],
          [0.06, 0.12],
        ],
        [ventX, 0, ventZ],
        "y",
        8,
      );
      builder.cylinder("glow", lava, {
        radius: 0.05,
        length: 0.02,
        at: [ventX, 0.13, ventZ],
        segments: 6,
      });
    });
  }
};

const buildJet = (builder: AttractionBuilder) => {
  builder.lathe(
    "water",
    "#d8f3f6",
    [
      [0.001, 0],
      [0.18, 0],
      [0.13, 1.2],
      [0.2, 2.4],
      [0.34, 2.9],
      [0.28, 3.2],
      [0.001, 3.35],
    ],
    [0, 0, 0],
    "y",
    12,
  );
  if (builder.isFar) {
    return;
  }
  [0, 1, 2, 3, 4].forEach((drop) => {
    const angle = (drop / 5) * Math.PI * 2;
    builder.sphere(
      "water",
      "#eefafb",
      0.16,
      [Math.sin(angle) * 0.35, 2.8 + (drop % 2) * 0.25, Math.cos(angle) * 0.35],
      [1, 1, 1],
      6,
    );
  });
};

/* The diagram: how the plant uses the heat underground */

const buildBoard = (builder: AttractionBuilder) => {
  const { x, z } = boardAt;
  [-0.85, 0.85].forEach((dx) => {
    builder.box(
      "matte",
      basaltDark,
      [0.08, 1.75, 0.08],
      [x + dx, 0.875, z - 0.05],
    );
  });
  const bands: [number, string, boolean][] = [
    [1.6, "#8fc7e8", false],
    [1.42, "#5f9a3c", false],
    [1.25, "#8a6a4a", false],
    [1.0, "#6b5040", false],
    [0.78, "#4a3a32", false],
    [0.56, lava, true],
  ];
  builder.painted(
    new BoxGeometry(1.8, 1.2, 0.06, 1, builder.isFar ? 1 : 6, 1),
    (centre) => {
      const band =
        bands.find(([top]) => centre.y > top - 0.2) ?? bands[bands.length - 1];
      return { colour: band[1], finish: band[2] ? "glow" : "matte" };
    },
    { at: [x, 1.1, z] },
    "paint",
  );
  if (builder.isFar) {
    return;
  }
  /* A red pipe bringing steam up and a blue pipe taking water down */
  builder.box("paint", valveRed, [0.06, 0.95, 0.02], [x - 0.3, 1.05, z + 0.04]);
  builder.box(
    "paint",
    "#2d6fbf",
    [0.06, 0.95, 0.02],
    [x + 0.3, 1.05, z + 0.04],
  );
  builder.box("paint", "#f4f1ea", [0.36, 0.2, 0.02], [x, 1.6, z + 0.04]);
  builder.box(
    "paint",
    lavaCore,
    [0.1, 0.1, 0.02],
    [x + 0.55, 1.6, z + 0.045],
    [0, 0, Math.PI / 4],
  );
  /* A little house lit by the power */
  builder.box("paint", "#f4f1ea", [0.22, 0.16, 0.02], [x + 0.6, 1.5, z + 0.04]);
  builder.box(
    "paint",
    valveRed,
    [0.26, 0.04, 0.02],
    [x + 0.6, 1.6, z + 0.045],
    [0, 0, 0],
  );
  builder.box("matte", basaltDark, [1.9, 0.06, 0.12], [x, 1.72, z]);
};

/* The bulb on the roof, which lights up as you come near */

const buildRoofPole = (builder: AttractionBuilder) => {
  builder.cylinder("metal", darkSteel, {
    radius: 0.05,
    length: 0.8,
    at: [bulbPivot[0], hall.height + 0.55 + 0.35, bulbPivot[2]],
    segments: 8,
  });
};

const buildBulb = (builder: AttractionBuilder) => {
  builder.sphere("glow", warmLight, 0.36, [0, 0.12, 0], [1, 1.1, 1], 14);
  builder.lathe(
    "glow",
    warmLight,
    [
      [0.001, -0.3],
      [0.15, -0.3],
      [0.2, -0.1],
      [0.001, 0],
    ],
    [0, 0, 0],
    "y",
    12,
  );
  builder.cylinder("metal", steel, {
    radius: 0.15,
    length: 0.18,
    at: [0, -0.38, 0],
    segments: 12,
  });
  if (!builder.isFar) {
    [-0.42, -0.33].forEach((y) => {
      builder.torus("metal", steel, 0.155, 0.015, [0, y, 0], "y", 10);
    });
  }
};

/* The ride on the pipeline trolley */

const ease = (share: number): number => share * share * (3 - 2 * share);
const climbShare = 0.12;

const trolleyRide = (progress: number, seconds: number): LocalSpot => {
  if (progress < climbShare || progress > 1 - climbShare) {
    const isOn = progress < climbShare;
    const share = ease(
      isOn ? progress / climbShare : (1 - progress) / climbShare,
    );
    const ground = isOn ? rideStart : rideFinish;
    const seatZ = isOn ? trolleyParkZ : trolleyEndZ;
    return {
      x: ground.x + (trolleyX - ground.x) * share,
      y: seatY * share + 0.3 * Math.sin(share * Math.PI),
      z: ground.z + (seatZ - ground.z) * share,
      heading: Math.PI,
    };
  }
  const share = (progress - climbShare) / (1 - climbShare * 2);
  const swing = Math.sin(seconds * 2.4);
  return {
    x: trolleyX + 0.06 * swing,
    y: seatY + 0.02 * Math.abs(swing),
    z: trolleyParkZ + (trolleyEndZ - trolleyParkZ) * share,
    heading: Math.PI + 0.06 * swing,
  };
};

const gantryDeck: Deck = ({ x, z }) => {
  if (
    x >= gantry.minX &&
    x <= gantry.maxX &&
    z >= gantry.minZ &&
    z <= gantry.maxZ
  ) {
    return { height: gantry.height, kind: "bridge" };
  }
  if (x < stairs.minX || x > stairs.maxX || z <= gantry.maxZ || z > stairsEnd) {
    return undefined;
  }
  const step = Math.min(
    stairs.count - 1,
    Math.floor((z - gantry.maxZ) / stairs.depth),
  );
  return { height: gantry.height - 0.2 * (step + 1), kind: "bridge" };
};

export const geothermalPlantModel: NewLandAttractionModel = {
  kind: "geothermal-plant",
  islandId: "ember-isle",
  name: "Geothermal Plant",
  fact: "Deep under a volcanic island, the rocks are hot enough to boil water. A geothermal plant pipes up the steam to spin a turbine, and a generator turns the spinning into electricity. In Iceland, heat from under the ground makes much of the electricity and warms nearly every home.",
  curriculumLink:
    "Geography, Key Stage 2: volcanoes and the distribution of natural resources, including energy. Using the heat under a volcanic island to make electricity.",
  footprint: 10,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: -1.4, z: 9.2 },
  build: (builder) => {
    buildGrounds(builder);
    buildHall(builder);
    buildTurbine(builder);
    buildRoofPole(builder);
    buildGantry(builder);
    buildWell(builder);
    buildRack(builder);
    buildPower(builder);
    buildPool(builder);
    buildBoard(builder);
  },
  moving: [
    {
      name: "turbine rotor",
      pivot: rotorPivot,
      build: buildRotor,
      motion: { kind: "whirl", axis: "x", idle: 1.5, speed: 12, reach: 6 },
    },
    {
      name: "geyser",
      pivot: [poolAt.x, 0.28, poolAt.z],
      build: buildJet,
      motion: { kind: "splash", reach: 4.5, period: 2.2 },
    },
    {
      name: "giant light bulb",
      pivot: bulbPivot,
      build: buildBulb,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "wellhead handwheel",
      pivot: handwheelPivot,
      build: buildHandwheel,
      motion: { kind: "nod", axis: "y", reach: 4, amplitude: 1.4, period: 1.8 },
    },
  ],
  wanderers: [
    {
      name: "engineers",
      build: buildEngineer,
      count: 3,
      centre: { x: 0.4, z: 4.8 },
      radius: 1.8,
      speed: 0.35,
    },
  ],
  smoke: towers.map((tower): SmokeSource => ({
    at: [tower.x, tower.height + 0.3, tower.z],
    colour: "#f2f2f0",
    puffs: 7,
    size: 0.6,
    rise: 3.2,
    spread: 0.8,
  })),
  blockers: [
    ...towers.map(({ x, z, radius }) => ({ x, z, radius: radius + 0.1 })),
    { x: transformerAt.x, z: transformerAt.z, radius: 0.75 },
    { x: pylonAt.x, z: pylonAt.z, radius: 0.6 },
    { x: wellAt.x, z: wellAt.z, radius: 0.6 },
  ] satisfies LocalBlocker[],
  decks: [gantryDeck],
  rides: [
    {
      id: "pipeline-trolley",
      name: "the pipeline trolley",
      start: rideStart,
      reach: 0.7,
      seconds: 12,
      finish: rideFinish,
      follow: trolleyRide,
    },
  ],
  play: {
    label: "Turn on the steam",
    news: "You opened the big red valve. Hot steam from deep underground rushed along the pipes, the turbine whizzed round and the giant bulb lit up!",
  },
};
