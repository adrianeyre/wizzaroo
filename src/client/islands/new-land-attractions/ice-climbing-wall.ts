import { BoxGeometry, ExtrudeGeometry, Shape, Vector2 } from "three";
import {
  addBench,
  addDoor,
  addLampPost,
  addSignBoard,
  addWindow,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef3f6";
const snowBright = "#fbfdff";
const snowShadow = "#d6e1ea";
const iceFace = "#cfe6f2";
const iceColumn = "#a9d8ef";
const iceDeep = "#7cc4e6";
const pine = "#2d5a40";
const faluRed = "#9e2b25";
const trim = "#f2efe6";
const roofGrey = "#3b4148";
const matBlue = "#2f6fb5";
const ropeColours = ["#e8452f", "#f2c230", "#3fb36b"];
const holdColours = ["#e8452f", "#f2c230", "#3fb36b", "#9b5de5", "#ff8fb8"];
const signColour = "#2f6f9a";

/* The frozen cliff stands at the back, its face towards the visitors (+z) */
const wall = { minX: -4.6, maxX: 3.2, faceZ: -3.5, backZ: -5.6 };
const outline: [number, number][] = [
  [-4.6, 0],
  [3.2, 0],
  [3.2, 3.8],
  [2.6, 4.6],
  [1.8, 5.0],
  [0.8, 4.75],
  [0.1, 5.15],
  [-1.2, 4.9],
  [-2.2, 5.25],
  [-3.4, 4.6],
  [-4.0, 4.0],
  [-4.6, 3.2],
];
const lanes = [-3.0, -1.0, 1.0];
const summit = { minX: -2.4, maxX: 0.4, y: 5.3 };
const beamY = 5.9;
const beamZ = wall.faceZ + 0.4;

const climberAt: Triple = [lanes[2], 2.6, wall.faceZ + 0.28];
const bellAt: Triple = [summit.minX + 0.3, summit.y + 1.65, wall.faceZ - 1.3];
const hut = { x: 5.3, z: 0.4, width: 2.4, depth: 2.0, wall: 1.8 };
const lanternAt: Triple = [hut.x - hut.width / 2 - 0.5, 2.1, hut.z + 1.4];
const spinnerAt: Triple = [hut.x + 0.4, hut.wall + 1.65, hut.z];
const viewDeck = { minX: -6.2, maxX: -3.4, minZ: -0.4, maxZ: 2.2 };
const viewDeckHeight = 0.26;

const signAt: Triple = [-0.6, 0, 6.0];
const climbLane = lanes[1];
const rideStart = { x: climbLane, z: wall.faceZ + 1.5 };
const rideFinish = { x: climbLane + 1.3, z: wall.faceZ + 2.8 };

/* ------------------------------------------------------------------ */
/* The ice cliff                                                       */
/* ------------------------------------------------------------------ */

const buildCliff = (builder: AttractionBuilder) => {
  const shape = new Shape(outline.map(([x, y]) => new Vector2(x, y)));
  builder.endPlate("paint", iceFace, shape, wall.backZ, wall.faceZ, 0);
  /* Snow lying along the top */
  outline.slice(2).forEach(([x, y], index, tops) => {
    const next = tops[index + 1] ?? outline[0];
    if (next[1] < 1) {
      return;
    }
    const length = Math.hypot(next[0] - x, next[1] - y);
    builder.box(
      "matte",
      snowBright,
      [length + 0.15, 0.2, wall.faceZ - wall.backZ + 0.2],
      [
        (x + next[0]) / 2,
        (y + next[1]) / 2 + 0.06,
        (wall.faceZ + wall.backZ) / 2,
      ],
      [0, 0, Math.atan2(next[1] - y, next[0] - x)],
    );
  });
  /* Frozen waterfall columns down the face */
  const columns = builder.isFar ? 6 : 15;
  for (let column = 0; column < columns; column++) {
    const share = (column + 0.5) / columns;
    const x = wall.minX + 0.3 + share * (wall.maxX - wall.minX - 0.6);
    const isLane = lanes.some((lane) => Math.abs(lane - x) < 0.45);
    const height = 3.4 + ((column * 7) % 5) * 0.32;
    builder.cylinder(
      "glass",
      column % 2 === 0 ? iceColumn : shade(iceColumn, 1.05),
      {
        radius: isLane ? 0.18 : 0.32,
        radiusEnd: 0.05,
        length: height,
        at: [x, height / 2, wall.faceZ + (isLane ? -0.05 : 0.08)],
        segments: 8,
      },
    );
    if (!builder.isFar && !isLane) {
      /* Icicles dripping from the bulge at its foot */
      builder.sphere(
        "glass",
        iceDeep,
        0.38,
        [x, 0.25, wall.faceZ + 0.15],
        [1, 0.7, 0.6],
        8,
      );
    }
  }
  /* Bumps of ice lower down, and great icicles hanging off the top */
  if (builder.isFar) {
    return;
  }
  for (let icicle = 0; icicle < 12; icicle++) {
    const x = wall.minX + 0.4 + icicle * 0.65;
    const top = topHeightAt(x);
    builder.cylinder("glass", iceDeep, {
      radius: 0.08,
      radiusEnd: 0.004,
      length: 0.5 + (icicle % 3) * 0.25,
      at: [x, top - 0.3 - (icicle % 3) * 0.12, wall.faceZ + 0.06],
      segments: 6,
    });
  }
};

/** Roughly how high the cliff's top is at `x`. */
const topHeightAt = (x: number): number => {
  const tops = outline.slice(2);
  for (let index = 0; index < tops.length - 1; index++) {
    const [fromX, fromY] = tops[index];
    const [toX, toY] = tops[index + 1];
    if ((x <= fromX && x >= toX) || (x >= fromX && x <= toX)) {
      const share = (x - fromX) / (toX - fromX || 1);
      return fromY + (toY - fromY) * share;
    }
  }
  return 3.2;
};

/* Coloured holds up each climbing lane, and the ropes and mats */
const buildLanes = (builder: AttractionBuilder) => {
  lanes.forEach((laneX, lane) => {
    /* The rope, from the beam down to the mat */
    builder.cylinder("matte", ropeColours[lane], {
      radius: 0.022,
      length: beamY - 0.3,
      at: [laneX + 0.2, (beamY + 0.3) / 2, beamZ],
      segments: 5,
    });
    builder.box(
      "matte",
      matBlue,
      [1.5, 0.18, 1.3],
      [laneX, 0.09, wall.faceZ + 0.65],
    );
    if (builder.isFar) {
      return;
    }
    builder.box(
      "matte",
      shade(matBlue, 1.2),
      [1.52, 0.04, 0.08],
      [laneX, 0.17, wall.faceZ + 1.28],
    );
    const holds = 9;
    for (let hold = 0; hold < holds; hold++) {
      const up = 0.5 + hold * 0.5;
      const across = ((hold * 5) % 3) - 1;
      builder.sphere(
        "paint",
        holdColours[(hold + lane) % holdColours.length],
        0.09 + (hold % 2) * 0.03,
        [laneX + across * 0.32, up, wall.faceZ + 0.03],
        [1.2, 0.8, 0.6],
        7,
      );
    }
  });
};

/* The summit platform, the beam over the face and the pulleys */
const buildSummit = (builder: AttractionBuilder) => {
  const { minX, maxX, y } = summit;
  const deckZ = wall.faceZ - 1.05;
  builder.box(
    "matte",
    palette.paleTimber,
    [maxX - minX, 0.12, 1.9],
    [(minX + maxX) / 2, y, deckZ],
  );
  /* Railing round it, open at the front for the climbers */
  [
    [minX, -1, minX, 1],
    [maxX, -1, maxX, 1],
    [minX, -1, maxX, -1],
  ].forEach(([fromX, fromSide, toX, toSide]) => {
    builder.bar(
      "paint",
      faluRed,
      [fromX, y + 0.9, deckZ + fromSide * 0.95],
      [toX, y + 0.9, deckZ + toSide * 0.95],
      0.06,
      5,
    );
  });
  [
    [minX, -0.95],
    [maxX, -0.95],
    [minX, 0.95],
    [maxX, 0.95],
  ].forEach(([x, dz]) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.1, 1.0, 0.1],
      [x, y + 0.5, deckZ + dz],
    );
  });
  /* The beam the ropes hang from, on two great posts */
  [wall.minX + 0.9, wall.maxX - 0.9].forEach((x) => {
    const foot = topHeightAt(x) - 0.2;
    builder.box(
      "matte",
      palette.darkTimber,
      [0.2, beamY - foot + 0.1, 0.2],
      [x, (beamY + foot) / 2, wall.faceZ - 0.4],
    );
    builder.bar(
      "matte",
      palette.darkTimber,
      [x, beamY - 0.2, wall.faceZ - 0.4],
      [x, beamY - 0.2, beamZ],
      0.14,
      5,
    );
  });
  builder.box(
    "matte",
    palette.timber,
    [wall.maxX - wall.minX - 1.4, 0.2, 0.2],
    [(wall.minX + wall.maxX) / 2, beamY, beamZ],
  );
  lanes.forEach((laneX) => {
    builder.cylinder("metal", palette.steel, {
      radius: 0.12,
      length: 0.06,
      at: [laneX + 0.2, beamY - 0.2, beamZ],
      axis: "x",
      segments: 12,
    });
  });
  /* A flag flying from the top */
  builder.cylinder("paint", trim, {
    radius: 0.03,
    length: 1.6,
    at: [maxX - 0.1, y + 0.8, deckZ - 0.85],
    segments: 6,
  });
  builder.box(
    "matte",
    faluRed,
    [0.6, 0.38, 0.02],
    [maxX + 0.22, y + 1.4, deckZ - 0.85],
  );
  builder.box(
    "matte",
    trim,
    [0.6, 0.07, 0.025],
    [maxX + 0.22, y + 1.4, deckZ - 0.85],
  );
  builder.box(
    "matte",
    trim,
    [0.07, 0.38, 0.025],
    [maxX + 0.05, y + 1.4, deckZ - 0.85],
  );
  /* The bell's little frame */
  const [bx, by, bz] = bellAt;
  [-0.3, 0.3].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 1.75, 0.08],
      [bx + side, y + 0.87, bz],
    );
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [0.75, 0.1, 0.12],
    [bx, by + 0.06, bz],
  );
};

const buildBell = (builder: AttractionBuilder) => {
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0, 0],
      [0.08, -0.02],
      [0.12, -0.1],
      [0.13, -0.22],
      [0.19, -0.32],
      [0.2, -0.35],
      [0, -0.3],
    ],
    [0, 0, 0],
    "y",
    builder.isFar ? 8 : 16,
  );
  builder.sphere("metal", palette.darkSteel, 0.04, [0, -0.34, 0], [1, 1, 1], 6);
};

/* ------------------------------------------------------------------ */
/* A climber, facing the ice (-z), arms up                             */
/* ------------------------------------------------------------------ */

const addClimberBody = (
  builder: AttractionBuilder,
  coat: string,
  helmet: string,
  isClimbing: boolean,
) => {
  const isNear = !builder.isFar;
  [-0.08, 0.08].forEach((side, index) => {
    const lift = isClimbing && index === 0 ? 0.18 : 0;
    builder.cylinder("matte", "#2b3442", {
      radius: 0.055,
      length: 0.38,
      at: [side, 0.2 + lift, isClimbing ? -0.05 : 0],
      segments: 6,
    });
    builder.box(
      "matte",
      palette.black,
      [0.1, 0.08, 0.18],
      [side, 0.04 + lift, -0.03],
    );
  });
  builder.lathe(
    "matte",
    coat,
    [
      [0, 0.38],
      [0.15, 0.4],
      [0.16, 0.56],
      [0.13, 0.72],
      [0, 0.75],
    ],
    [0, 0, 0],
    "y",
    isNear ? 9 : 5,
  );
  /* Harness */
  builder.torus(
    "matte",
    palette.black,
    0.15,
    0.025,
    [0, 0.42, 0],
    "y",
    isNear ? 10 : 6,
  );
  [-1, 1].forEach((side) => {
    const reach = isClimbing
      ? [side * 0.22, 1.0, -0.12]
      : [side * 0.28, 0.45, 0.05];
    builder.bar(
      "matte",
      coat,
      [side * 0.12, 0.68, 0],
      [reach[0], reach[1], reach[2]],
      0.07,
      5,
    );
    builder.sphere(
      "matte",
      "#3a3f46",
      0.045,
      [reach[0], reach[1], reach[2]],
      [1, 1, 1],
      5,
    );
    if (isNear && isClimbing) {
      /* An ice axe in each hand */
      builder.bar(
        "metal",
        palette.darkSteel,
        [reach[0], reach[1] - 0.12, reach[2]],
        [reach[0], reach[1] + 0.15, reach[2] - 0.02],
        0.025,
        4,
      );
      builder.box(
        "metal",
        palette.steel,
        [0.03, 0.03, 0.16],
        [reach[0], reach[1] + 0.15, reach[2] - 0.08],
      );
    }
  });
  builder.sphere(
    "matte",
    "#f0c8a8",
    0.1,
    [0, 0.85, 0],
    [1, 1, 1],
    isNear ? 9 : 5,
  );
  builder.sphere(
    "paint",
    helmet,
    0.115,
    [0, 0.89, 0],
    [1, 0.8, 1.05],
    isNear ? 10 : 5,
  );
};

const buildClimber = (builder: AttractionBuilder) => {
  addClimberBody(builder, "#3fb36b", "#f2c230", true);
};

const buildWalkingClimber = (builder: AttractionBuilder) => {
  addClimberBody(builder, "#e8452f", "#2f6fb5", false);
  if (!builder.isFar) {
    /* A coil of rope over one shoulder */
    builder.torus("matte", "#f2c230", 0.14, 0.03, [0.05, 0.6, -0.1], "z", 10);
  }
};

/* ------------------------------------------------------------------ */
/* The gear hut, viewing deck and grounds                              */
/* ------------------------------------------------------------------ */

const buildHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall: wallHeight } = hut;
  const planks = builder.isFar ? 1 : 10;
  builder.painted(
    new BoxGeometry(width, wallHeight, depth, 1, planks, 1),
    (centre) =>
      Math.floor(centre.y / (wallHeight / planks)) % 2 === 0
        ? faluRed
        : shade(faluRed, 0.88),
    { at: [x, wallHeight / 2 + 0.1, z] },
    "matte",
    undefined,
  );
  builder.box(
    "matte",
    palette.darkStone,
    [width + 0.14, 0.1, depth + 0.14],
    [x, 0.05, z],
  );
  const eaves = wallHeight + 0.1;
  const rise = 0.9;
  const gable = new Shape([
    new Vector2(-depth / 2, 0),
    new Vector2(depth / 2, 0),
    new Vector2(0, rise),
  ]);
  builder.add(
    "matte",
    shade(faluRed, 0.9),
    new ExtrudeGeometry(gable, { depth: width, bevelEnabled: false }),
    { at: [x - width / 2, eaves, z], rotation: [0, Math.PI / 2, 0] },
  );
  const overhang = 0.3;
  const halfSpan = depth / 2 + overhang;
  const slope = Math.hypot(halfSpan, rise * (halfSpan / (depth / 2)));
  const angle = Math.atan2(rise, depth / 2);
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      roofGrey,
      [width + overhang * 2, 0.1, slope],
      [x, eaves + rise / 2 + 0.02, z + (side * halfSpan) / 2],
      [side * angle, 0, 0],
    );
    builder.box(
      "matte",
      snow,
      [width + overhang * 2 - 0.1, 0.1, slope - 0.1],
      [x, eaves + rise / 2 + 0.11, z + (side * halfSpan) / 2 + side * 0.02],
      [side * angle, 0, 0],
    );
  });
  [-1, 1].forEach((sideX) => {
    builder.box(
      "paint",
      trim,
      [0.1, wallHeight, 0.1],
      [x + sideX * (width / 2), wallHeight / 2 + 0.1, z + depth / 2],
    );
  });
  addDoor(builder, {
    at: [x - width / 2 - 0.005, 0.1, z],
    colour: "#2f4a5f",
    frame: trim,
    turn: -Math.PI / 2,
  });
  addWindow(builder, {
    at: [x, 1.2, z + depth / 2 + 0.01],
    width: 0.9,
    height: 0.6,
    frame: trim,
    isLit: true,
  });
  builder.cylinder("matte", palette.stone, {
    radius: 0.12,
    length: 0.9,
    at: [x - 0.6, eaves + 0.75, z - 0.4],
    segments: 8,
  });
  /* The spinner's pole */
  builder.cylinder("paint", trim, {
    radius: 0.03,
    length: 1.0,
    at: [spinnerAt[0], spinnerAt[1] - 0.5, spinnerAt[2]],
    segments: 6,
  });
  /* The lantern's post */
  builder.cylinder("paint", palette.black, {
    radius: 0.045,
    length: lanternAt[1],
    at: [lanternAt[0], lanternAt[1] / 2, lanternAt[2]],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  /* A rack of helmets and ice axes along the front */
  const rackZ = z + depth / 2 + 0.25;
  builder.box("matte", palette.darkTimber, [1.8, 0.08, 0.1], [x, 1.0, rackZ]);
  [-0.7, -0.35, 0, 0.35, 0.7].forEach((along, index) => {
    builder.sphere(
      "paint",
      holdColours[index],
      0.12,
      [x + along, 1.12, rackZ + 0.02],
      [1, 0.8, 1.05],
      9,
    );
  });
  [-0.6, -0.2, 0.2, 0.6].forEach((along) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + along, 0.3, rackZ],
      [x + along, 0.85, rackZ],
      0.03,
      4,
    );
    builder.box(
      "metal",
      palette.steel,
      [0.03, 0.03, 0.2],
      [x + along, 0.86, rackZ - 0.05],
    );
  });
  builder.box(
    "paint",
    signColour,
    [1.2, 0.26, 0.04],
    [x, eaves + 0.26, z + depth / 2 + 0.02],
  );
};

/* Bunting along the beam, a snowy owl, boulders and kit bags */
const buildTrimmings = (builder: AttractionBuilder) => {
  const fromX = wall.minX + 0.9;
  const toX = wall.maxX - 0.9;
  const flags = builder.isFar ? 0 : 18;
  for (let flag = 0; flag < flags; flag++) {
    const share = (flag + 0.5) / flags;
    const x = fromX + (toX - fromX) * share;
    const sag = 0.35 * 4 * share * (1 - share);
    const pennant = new Shape([
      new Vector2(-0.12, 0),
      new Vector2(0.12, 0),
      new Vector2(0, -0.26),
    ]);
    builder.add(
      "matte",
      holdColours[flag % holdColours.length],
      new ExtrudeGeometry(pennant, { depth: 0.01, bevelEnabled: false }),
      { at: [x, beamY - 0.12 - sag, beamZ + 0.12] },
    );
  }
  if (!builder.isFar) {
    for (let piece = 0; piece < 6; piece++) {
      const from = piece / 6;
      const to = (piece + 1) / 6;
      builder.bar(
        "matte",
        palette.black,
        [
          fromX + (toX - fromX) * from,
          beamY - 0.1 - 1.4 * from * (1 - from),
          beamZ + 0.12,
        ],
        [
          fromX + (toX - fromX) * to,
          beamY - 0.1 - 1.4 * to * (1 - to),
          beamZ + 0.12,
        ],
        0.012,
        3,
      );
    }
  }
  /* A snowy owl keeping watch from the end of the beam */
  const owl: Triple = [toX + 0.1, beamY + 0.1, beamZ];
  builder.sphere(
    "matte",
    snowBright,
    0.2,
    [owl[0], owl[1] + 0.2, owl[2]],
    [1, 1.25, 0.95],
    12,
  );
  builder.sphere(
    "matte",
    snowBright,
    0.15,
    [owl[0], owl[1] + 0.48, owl[2] + 0.02],
    [1.05, 0.95, 1],
    12,
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.sphere(
        "paint",
        "#f2c230",
        0.045,
        [owl[0] + side * 0.06, owl[1] + 0.5, owl[2] + 0.15],
        [1, 1, 0.5],
        8,
      );
      builder.sphere(
        "paint",
        palette.black,
        0.022,
        [owl[0] + side * 0.06, owl[1] + 0.5, owl[2] + 0.17],
        [1, 1, 0.5],
        5,
      );
      builder.sphere(
        "matte",
        "#dfe4ea",
        0.12,
        [owl[0] + side * 0.17, owl[1] + 0.18, owl[2]],
        [0.45, 1.2, 0.9],
        8,
      );
    });
    builder.sphere(
      "matte",
      "#3a3f46",
      0.025,
      [owl[0], owl[1] + 0.45, owl[2] + 0.16],
      [1, 1.3, 1],
      5,
    );
    [0.15, 0.25, 0.32].forEach((up, index) => {
      builder.sphere(
        "matte",
        "#3a3f46",
        0.018,
        [owl[0] + (index - 1) * 0.06, owl[1] + up, owl[2] + 0.18],
        [1, 1, 0.5],
        4,
      );
    });
  }
  /* Boulders at the foot of the cliff */
  [
    [wall.minX - 0.3, wall.faceZ + 0.2, 0.8],
    [wall.maxX + 0.3, wall.faceZ + 0.3, 0.7],
  ].forEach(([x, z, size]) => {
    builder.sphere(
      "matte",
      "#6f7a86",
      size,
      [x, size * 0.45, z],
      [1.2, 0.8, 1],
      builder.isFar ? 6 : 10,
    );
    builder.sphere(
      "matte",
      snowBright,
      size * 0.8,
      [x, size * 0.95, z],
      [1.3, 0.35, 1.1],
      builder.isFar ? 6 : 10,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Kit bags and coiled ropes by the mats */
  lanes.forEach((laneX, lane) => {
    const x = laneX + 0.92;
    const z = wall.faceZ + 0.3;
    builder.cylinder("matte", holdColours[lane + 2], {
      radius: 0.16,
      length: 0.36,
      at: [x, 0.18, z],
      segments: 10,
    });
    builder.torus("matte", palette.black, 0.12, 0.02, [x, 0.38, z], "y", 8);
    builder.torus(
      "matte",
      ropeColours[lane],
      0.2,
      0.05,
      [x - 0.4, 0.05, z + 0.1],
      "y",
      12,
    );
    builder.torus(
      "matte",
      ropeColours[lane],
      0.14,
      0.05,
      [x - 0.4, 0.12, z + 0.1],
      "y",
      12,
    );
  });
  /* A flask of hot chocolate and mugs on the viewing deck */
  const tableAt: Triple = [
    viewDeck.maxX - 0.6,
    viewDeckHeight,
    viewDeck.minZ + 0.6,
  ];
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.3,
    length: 0.05,
    at: [tableAt[0], tableAt[1] + 0.7, tableAt[2]],
    segments: 12,
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 0.7,
    at: [tableAt[0], tableAt[1] + 0.35, tableAt[2]],
    segments: 6,
  });
  builder.cylinder("metal", "#c0392b", {
    radius: 0.07,
    length: 0.3,
    at: [tableAt[0] - 0.08, tableAt[1] + 0.87, tableAt[2]],
    segments: 10,
  });
  [0.12, 0.2].forEach((dx, index) => {
    builder.cylinder("paint", index === 0 ? palette.cream : "#2f6fb5", {
      radius: 0.045,
      length: 0.09,
      at: [tableAt[0] + dx, tableAt[1] + 0.77, tableAt[2] + 0.1 * index],
      segments: 8,
    });
  });
};

const buildLantern = (builder: AttractionBuilder) => {
  builder.box("glow", palette.warmLight, [0.2, 0.28, 0.2], [0, 0.1, 0]);
  builder.cylinder("paint", palette.black, {
    radius: 0.17,
    radiusEnd: 0.02,
    length: 0.14,
    at: [0, 0.31, 0],
    segments: 8,
  });
};

/* A wind spinner on the hut roof, whirling faster as the Character comes */
const buildSpinner = (builder: AttractionBuilder) => {
  builder.sphere("metal", palette.steel, 0.05, [0, 0, 0], [1, 1, 1], 8);
  for (let cup = 0; cup < 4; cup++) {
    const angle = (cup / 4) * Math.PI * 2;
    builder.bar(
      "metal",
      palette.steel,
      [0, 0, 0],
      [Math.cos(angle) * 0.35, 0, Math.sin(angle) * 0.35],
      0.02,
      4,
    );
    builder.sphere(
      "paint",
      holdColours[cup],
      0.09,
      [Math.cos(angle) * 0.38, 0, Math.sin(angle) * 0.38],
      [1, 1, 0.6],
      8,
    );
  }
};

const buildViewDeck = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = viewDeck;
  const boards = builder.isFar ? 1 : 10;
  builder.painted(
    new BoxGeometry(maxX - minX, viewDeckHeight, maxZ - minZ, boards, 1, 1),
    (centre) =>
      Math.floor((centre.x - minX) / ((maxX - minX) / boards)) % 2 === 0
        ? palette.paleTimber
        : shade(palette.paleTimber, 0.9),
    { at: [(minX + maxX) / 2, viewDeckHeight / 2, (minZ + maxZ) / 2] },
    "matte",
    undefined,
  );
  /* A rail along its back and left side */
  builder.bar(
    "paint",
    faluRed,
    [minX, viewDeckHeight + 0.85, minZ],
    [maxX, viewDeckHeight + 0.85, minZ],
    0.07,
    5,
  );
  builder.bar(
    "paint",
    faluRed,
    [minX, viewDeckHeight + 0.85, minZ],
    [minX, viewDeckHeight + 0.85, maxZ],
    0.07,
    5,
  );
  [
    [minX, minZ],
    [maxX, minZ],
    [minX, maxZ],
    [minX, (minZ + maxZ) / 2],
    [(minX + maxX) / 2, minZ],
  ].forEach(([x, z]) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.1, 0.9, 0.1],
      [x, viewDeckHeight + 0.45, z],
    );
  });
  addBench(
    builder,
    [(minX + maxX) / 2 + 0.2, viewDeckHeight, minZ + 0.5],
    0,
    faluRed,
  );
  /* A brazier to warm cold hands */
  const [fx, fz] = [maxX - 0.5, maxZ - 0.5];
  builder.lathe(
    "metal",
    palette.darkSteel,
    [
      [0.05, 0],
      [0.08, 0.5],
      [0.3, 0.62],
      [0.32, 0.72],
    ],
    [fx, viewDeckHeight, fz],
    "y",
    builder.isFar ? 6 : 12,
  );
  builder.cylinder("glow", "#ff9a3a", {
    radius: 0.24,
    radiusEnd: 0.05,
    length: 0.35,
    at: [fx, viewDeckHeight + 0.85, fz],
    segments: 8,
  });
};

const pines: [number, number, number][] = [
  [-6.6, -4.2, 1.2],
  [-6.2, -6.8, 1.0],
  [5.6, -5.6, 1.3],
  [7.4, -2.8, 1.05],
  [-8.0, -1.8, 0.9],
];

const addPine = (
  builder: AttractionBuilder,
  [x, z, size]: [number, number, number],
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.13 * size,
    radiusEnd: 0.08 * size,
    length: 0.8 * size,
    at: [x, 0.4 * size, z],
    segments: 7,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (1.0 - share * 0.55) * size;
    const height = (1.35 - share * 0.25) * size;
    const base = (0.55 + share * 1.8) * size;
    builder.cylinder("matte", tier % 2 === 0 ? pine : shade(pine, 1.12), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, base + height / 2, z],
      segments: 9,
    });
    if (!builder.isFar) {
      const cap = height * 0.45;
      builder.cylinder("matte", snow, {
        radius: radius * 0.55,
        radiusEnd: 0.03,
        length: cap,
        at: [x, base + height - cap / 2 + 0.03, z],
        segments: 9,
      });
    }
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  pines.forEach((tree) => {
    addPine(builder, tree);
  });
  builder.box("matte", "#b9b2a6", [1.4, 0.02, 4.6], [-0.6, 0.01, 2.9]);
  addBench(builder, [1.6, 0, 2.2], Math.PI, faluRed);
  addLampPost(builder, [0.5, 0, 4.8]);
  addLampPost(builder, [-1.7, 0, 4.8]);
  if (builder.isFar) {
    return;
  }
  [
    [-5.4, 4.4, 0.55],
    [4.6, 4.8, 0.45],
    [3.8, -3.2, 0.5],
    [-5.2, -3.0, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowShadow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
};

/* ------------------------------------------------------------------ */
/* The ride: up the ice, a ring of the bell, and an abseil back down   */
/* ------------------------------------------------------------------ */

const topY = summit.y + 0.06;
const climbZ = wall.faceZ + 0.35;

const iceClimb = (progress: number): LocalSpot => {
  if (progress < 0.06) {
    const share = progress / 0.06;
    return {
      x: climbLane,
      y: 0.18 * share,
      z: rideStart.z + (climbZ - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.5) {
    /* Up the face, reaching left and right from hold to hold */
    const share = (progress - 0.06) / 0.44;
    return {
      x: climbLane + 0.25 * Math.sin(share * Math.PI * 8),
      y: 0.18 + (topY - 0.18) * share,
      z: climbZ,
      heading: Math.PI,
    };
  }
  if (progress < 0.62) {
    /* Over the top onto the platform, to ring the bell */
    const share = (progress - 0.5) / 0.12;
    return {
      x: climbLane + (bellAt[0] + 0.5 - climbLane) * share,
      y: topY,
      z: climbZ + (bellAt[2] + 0.4 - climbZ) * Math.min(1, share * 2),
      heading: Math.PI,
    };
  }
  if (progress < 0.68) {
    const share = (progress - 0.62) / 0.06;
    return {
      x: bellAt[0] + 0.5 + (climbLane - bellAt[0] - 0.5) * share,
      y: topY,
      z: bellAt[2] + 0.4 + (climbZ - bellAt[2] - 0.4) * share,
      heading: 0,
    };
  }
  if (progress < 0.94) {
    /* Bounding back down on the rope */
    const share = (progress - 0.68) / 0.26;
    const bounce = Math.abs(Math.sin(share * Math.PI * 5));
    return {
      x: climbLane,
      y: topY * (1 - share),
      z: climbZ + 0.15 + 0.5 * bounce * (1 - share * 0.8),
      heading: Math.PI,
    };
  }
  const share = (progress - 0.94) / 0.06;
  return {
    x: climbLane + (rideFinish.x - climbLane) * share,
    y: 0,
    z: climbZ + 0.15 + (rideFinish.z - climbZ - 0.15) * share,
    heading: 0,
  };
};

export const iceClimbingWallModel: NewLandAttractionModel = {
  kind: "ice-climbing-wall",
  islandId: "frost-isle",
  name: "Ice Climbing Wall",
  fact: "When a waterfall freezes in winter, climbers can climb it! Ice is hard and slippery, so they wear boots with sharp metal spikes called crampons and carry ice axes to grip it. They wear helmets and are tied to a strong rope, so they are safe if they slip.",
  curriculumLink:
    "Science, Year 2: identify and compare the suitability of everyday materials for particular uses, such as hard metal spikes for gripping ice and strong ropes for keeping climbers safe.",
  footprint: 9.5,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 1.0 },
  build: (builder) => {
    buildCliff(builder);
    buildLanes(builder);
    buildSummit(builder);
    buildHut(builder);
    buildViewDeck(builder);
    buildTrimmings(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "climber",
      pivot: climberAt,
      build: buildClimber,
      motion: { kind: "bob", height: 1.4, period: 9 },
    },
    {
      name: "summit bell",
      pivot: bellAt,
      build: buildBell,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.6, period: 0.8 },
    },
    {
      name: "hut lantern",
      pivot: lanternAt,
      build: buildLantern,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "wind spinner",
      pivot: spinnerAt,
      build: buildSpinner,
      motion: { kind: "whirl", axis: "y", idle: 0.8, speed: 9, reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "climbers",
      build: buildWalkingClimber,
      count: 2,
      centre: { x: 2.6, z: 2.2 },
      radius: 1.2,
      speed: 0.5,
    },
  ],
  smoke: [
    {
      at: [hut.x - 0.6, hut.wall + 1.25, hut.z - 0.4],
      colour: "#d8dcdf",
      puffs: 5,
      size: 0.13,
      rise: 1.4,
      spread: 0.3,
    },
  ],
  blockers: [
    { x: hut.x - 0.6, z: hut.z, radius: 1.1 },
    { x: hut.x + 0.6, z: hut.z, radius: 1.1 },
  ] satisfies LocalBlocker[],
  decks: [buildFlatDeck(viewDeck, viewDeckHeight)],
  rides: [
    {
      id: "ice-climb",
      name: "the ice climbing wall",
      start: rideStart,
      reach: 0.7,
      seconds: 15,
      finish: rideFinish,
      follow: iceClimb,
    },
  ],
  play: {
    label: "Ring the summit bell",
    news: "Ding-ding! You climbed right to the top of the frozen waterfall, rang the summit bell and abseiled back down.",
  },
};
