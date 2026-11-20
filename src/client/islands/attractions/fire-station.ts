import { CylinderGeometry } from "three";
import type { LoftStation } from "../trains/train-kit.js";
import {
  addBench,
  addBush,
  addLampPost,
  addSignBoard,
  addTree,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Motion,
  type Triple,
} from "./attraction-kit.js";
import {
  addFlagpole,
  addGabledBlock,
  addLettering,
  addPitchedRoof,
  addQuoins,
  addRoadWheel,
  addSash,
  addTurned,
  buildFlag,
} from "./post-office-parts.js";

const brick = "#9b4a35";
const dressing = "#e4d8bd";
const fireRed = "#c41e24";
const doorRed = "#b3261e";
const concrete = "#bdbab2";
const engineGlass = "#2b3944";
const lockerSilver = "#c9cdd2";
const hiVisYellow = "#e8d33a";

const width = 6.4;
const depth = 4.6;
const groundStorey = 2.9;
const eaves = 4.6;
const rise = 1.3;
const front = 0;
const back = -depth;
const centreZ = -depth / 2;
const left = -width / 2;
const right = width / 2;
const bayWidth = 2.2;
const bayHeight = 2.4;
const bayDepth = 1.2;
const openBayX = -1.35;
const closedBayX = 1.35;

/* The station */

const buildStation = (builder: AttractionBuilder) => {
  addGabledBlock(builder, {
    centre: { x: 0, z: centreZ },
    width,
    depth,
    eaves,
    rise,
    base: groundStorey - 0.5,
    colour: brick,
  });
  builder.box(
    "matte",
    brick,
    [width, groundStorey - 0.5, depth - bayDepth],
    [0, (groundStorey - 0.5) / 2, back + (depth - bayDepth) / 2],
  );
  addPitchedRoof(builder, {
    centre: { x: 0, z: centreZ },
    width,
    depth,
    eaves,
    rise,
    colour: palette.slate,
    courses: 7,
  });
  [
    [left, 0.75],
    [0, 0.5],
    [right, 0.75],
  ].forEach(([x, pierWidth]) => {
    const pierX =
      x === left
        ? left + pierWidth / 2
        : x === right
          ? right - pierWidth / 2
          : 0;
    builder.box(
      "matte",
      brick,
      [pierWidth, groundStorey - 0.5, bayDepth],
      [pierX, (groundStorey - 0.5) / 2, front - bayDepth / 2],
    );
    builder.box(
      "matte",
      dressing,
      [pierWidth + 0.06, 0.26, bayDepth + 0.04],
      [pierX, 0.13, front - bayDepth / 2],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        dressing,
        [pierWidth + 0.08, 0.14, 0.08],
        [pierX, bayHeight - 0.05, front + 0.02],
      );
    }
  });
  builder.box(
    "matte",
    dressing,
    [width + 0.08, 0.4, 0.1],
    [0, groundStorey - 0.25, front + 0.03],
  );
  builder.box(
    "matte",
    dressing,
    [width + 0.1, 0.1, depth + 0.1],
    [0, groundStorey + 0.02, centreZ],
  );
  builder.box(
    "matte",
    dressing,
    [width + 0.14, 0.14, depth + 0.14],
    [0, eaves - 0.05, centreZ],
  );
  addLettering(builder, "FIRE STATION", {
    at: [0, groundStorey - 0.25, front + 0.09],
    height: 0.22,
    colour: "#8c1c1c",
  });
  addQuoins(builder, {
    corners: [
      { x: left, z: front },
      { x: right, z: front },
    ],
    height: eaves - 0.12,
    colour: dressing,
    from: groundStorey + 0.1,
  });
  addQuoins(builder, {
    corners: [
      { x: left, z: back },
      { x: right, z: back },
    ],
    height: eaves - 0.12,
    colour: dressing,
    from: 0.3,
  });
  builder.box(
    "matte",
    shade(brick, 0.75),
    [width + 0.06, 0.28, depth - bayDepth + 0.06],
    [0, 0.14, back + (depth - bayDepth) / 2],
  );
  [-2.35, -0.8, 0.8, 2.35].forEach((x) => {
    addSash(builder, {
      at: [x, 3.75, front + 0.02],
      width: 0.62,
      height: 0.85,
      lintel: dressing,
      isLit: x === -0.8 || x === 2.35,
    });
  });
  [-1.6, 1.6].forEach((x) => {
    addSash(builder, {
      at: [x, 3.75, back - 0.02],
      width: 0.62,
      height: 0.85,
      lintel: dressing,
      turn: Math.PI,
    });
    addSash(builder, {
      at: [x, 1.4, back - 0.02],
      width: 0.62,
      height: 0.85,
      lintel: dressing,
      turn: Math.PI,
    });
  });
  addSash(builder, {
    at: [left - 0.02, 3.75, centreZ],
    width: 0.62,
    height: 0.85,
    lintel: dressing,
    turn: -Math.PI / 2,
  });
  addSash(builder, {
    at: [left - 0.02, 1.4, centreZ - 0.8],
    width: 0.62,
    height: 0.85,
    lintel: dressing,
    turn: -Math.PI / 2,
  });
  const gableZ = front - 1.15;
  addGabledBlock(builder, {
    centre: { x: 0, z: gableZ + 0.03 },
    width: 2.36,
    depth: 2.6,
    eaves,
    rise: 1.0,
    base: groundStorey + 0.1,
    colour: brick,
    turn: Math.PI / 2,
  });
  addPitchedRoof(builder, {
    centre: { x: 0, z: gableZ - 0.05 },
    width: 2.5,
    depth: 2.6,
    eaves,
    rise: 1.0,
    colour: palette.slate,
    overhang: 0.18,
    turn: Math.PI / 2,
    courses: 3,
  });
  const clockY = eaves + 0.42;
  builder.cylinder("matte", dressing, {
    radius: 0.36,
    length: 0.06,
    at: [0, clockY, front + 0.04],
    axis: "z",
    segments: 20,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.29,
    length: 0.04,
    at: [0, clockY, front + 0.07],
    axis: "z",
    segments: 20,
  });
  if (!builder.isFar) {
    builder.box(
      "paint",
      palette.black,
      [0.03, 0.22, 0.02],
      [0, clockY + 0.09, front + 0.1],
    );
    builder.box(
      "paint",
      palette.black,
      [0.16, 0.03, 0.02],
      [0.07, clockY, front + 0.1],
      [0, 0, 0.3],
    );
    for (let hour = 0; hour < 12; hour++) {
      const angle = (hour / 12) * Math.PI * 2;
      builder.box(
        "paint",
        palette.black,
        [0.025, 0.05, 0.015],
        [
          Math.sin(angle) * 0.24,
          clockY + Math.cos(angle) * 0.24,
          front + 0.095,
        ],
        [0, 0, -angle],
      );
    }
  }
};

/* The appliance bays */

const buildClosedBay = (builder: AttractionBuilder) => {
  const doorZ = front - 0.14;
  [-1, 1].forEach((leaf) => {
    const leafX = closedBayX + (leaf * bayWidth) / 4;
    builder.box(
      "paint",
      doorRed,
      [bayWidth / 2 - 0.02, bayHeight, 0.06],
      [leafX, bayHeight / 2, doorZ],
    );
    builder.box(
      "glass",
      "#5f8099",
      [bayWidth / 2 - 0.2, 0.5, 0.02],
      [leafX, bayHeight - 0.45, doorZ + 0.035],
    );
    if (builder.isFar) {
      return;
    }
    [-0.25, 0.25].forEach((dx) => {
      builder.box(
        "paint",
        doorRed,
        [0.04, 0.5, 0.03],
        [leafX + dx * 0.5, bayHeight - 0.45, doorZ + 0.05],
      );
    });
    [0.45, 1.2].forEach((up) => {
      builder.box(
        "paint",
        shade(doorRed, 0.85),
        [bayWidth / 2 - 0.3, 0.55, 0.02],
        [leafX, up, doorZ + 0.035],
      );
    });
    builder.box(
      "metal",
      palette.steel,
      [0.04, 0.3, 0.05],
      [closedBayX + leaf * 0.08, 1.1, doorZ + 0.06],
    );
  });
};

const buildOpenBay = (builder: AttractionBuilder) => {
  const backWall = front - bayDepth + 0.01;
  builder.box(
    "matte",
    "#d8d2c4",
    [bayWidth, bayHeight, 0.02],
    [openBayX, bayHeight / 2, backWall],
  );
  builder.box(
    "matte",
    "#9a978f",
    [bayWidth, 0.02, bayDepth],
    [openBayX, 0.01, front - bayDepth / 2],
  );
  builder.box(
    "paint",
    "#5c6066",
    [bayWidth, 0.3, 0.32],
    [openBayX, bayHeight - 0.15, front - 0.22],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    hiVisYellow,
    [bayWidth, 0.012, 0.1],
    [openBayX, 0.025, front - 0.1],
  );
  for (let peg = 0; peg < 4; peg++) {
    const pegX = openBayX - 0.75 + peg * 0.5;
    builder.cylinder("matte", "#2c2f36", {
      radius: 0.17,
      radiusEnd: 0.13,
      length: 0.55,
      at: [pegX, 1.25, backWall + 0.1],
      segments: 8,
    });
    builder.box(
      "matte",
      hiVisYellow,
      [0.35, 0.05, 0.13],
      [pegX, 1.1, backWall + 0.08],
    );
    builder.sphere(
      "paint",
      peg % 2 === 0 ? hiVisYellow : palette.white,
      0.12,
      [pegX, 1.72, backWall + 0.12],
      [1, 0.8, 1.1],
      10,
    );
    builder.box(
      "matte",
      "#1d1f22",
      [0.2, 0.28, 0.16],
      [pegX, 0.14, backWall + 0.12],
    );
  }
  builder.cylinder("paint", fireRed, {
    radius: 0.32,
    length: 0.18,
    at: [openBayX + 0.92, 0.9, backWall + 0.2],
    axis: "z",
    segments: 14,
  });
  builder.cylinder("matte", "#d9c9a0", {
    radius: 0.25,
    length: 0.2,
    at: [openBayX + 0.92, 0.9, backWall + 0.2],
    axis: "z",
    segments: 14,
  });
};

/* The drill tower */

const towerAt = { x: 4.3, z: -3.2 };
const towerSize = 1.6;
const towerHeight = 7.4;

const buildTower = (builder: AttractionBuilder) => {
  const { x, z } = towerAt;
  builder.box(
    "matte",
    brick,
    [towerSize, towerHeight, towerSize],
    [x, towerHeight / 2, z],
  );
  [0.12, 2.9, 5.2, towerHeight - 0.05].forEach((up) => {
    builder.box(
      "matte",
      dressing,
      [towerSize + 0.1, 0.14, towerSize + 0.1],
      [x, up, z],
    );
  });
  [1.5, 4.0, 6.3].forEach((up) => {
    builder.box(
      "matte",
      "#2a2522",
      [0.66, 1.0, 0.04],
      [x, up, z + towerSize / 2 + 0.01],
    );
    builder.box(
      "paint",
      palette.white,
      [0.78, 0.06, 0.08],
      [x, up - 0.53, z + towerSize / 2 + 0.03],
    );
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        builder.box(
          "paint",
          palette.white,
          [0.06, 1.05, 0.06],
          [x + side * 0.36, up, z + towerSize / 2 + 0.03],
        );
      });
      builder.box(
        "paint",
        palette.white,
        [0.78, 0.06, 0.06],
        [x, up + 0.53, z + towerSize / 2 + 0.03],
      );
      builder.box(
        "matte",
        "#2a2522",
        [0.04, 0.8, 0.5],
        [x + towerSize / 2 + 0.01, up, z],
      );
    }
  });
  addTurned(
    builder,
    "matte",
    palette.slate,
    new CylinderGeometry(0.02, towerSize * 0.82, 1.1, 4, 1),
    [x, towerHeight + 0.55, z],
    [0, Math.PI / 4, 0],
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.025,
    length: 0.7,
    at: [x, towerHeight + 1.35, z],
    segments: 6,
  });
  if (!builder.isFar) {
    const hoseX = x - towerSize / 2 - 0.05;
    [-0.3, -0.12, 0.08, 0.26].forEach((dz, hose) => {
      builder.bar(
        "matte",
        hose % 2 === 0 ? "#d8c79a" : "#c94a33",
        [hoseX, towerHeight - 0.5, z + dz],
        [hoseX, towerHeight - 3.4 + hose * 0.2, z + dz],
        0.07,
        6,
      );
    });
    builder.box(
      "metal",
      palette.darkSteel,
      [0.12, 0.08, 0.8],
      [hoseX + 0.02, towerHeight - 0.45, z],
    );
  }
};

/* The fire engine */

const engineAt = { x: openBayX, z: 5.0 };
const engineHalfWidth = 0.78;
const engineLength = 4.4;
const cabLength = 1.35;
const engineRear = engineAt.z - engineLength;
const cabBack = engineAt.z - cabLength;

const cabStation = (along: number, top: number, narrow = 1) => {
  const halfWidth = engineHalfWidth * narrow;
  const bottom = 0.42;
  const lower = Math.min(0.75, top - 0.3);
  const belt = Math.min(1.22, top - 0.18);
  const shoulder = top - 0.08;
  return {
    z: engineAt.z + along,
    points: [
      [-halfWidth + 0.05, bottom],
      [halfWidth - 0.05, bottom],
      [halfWidth, bottom + 0.06],
      [halfWidth, lower],
      [halfWidth, belt],
      [halfWidth - 0.03, shoulder],
      [halfWidth - 0.12, top],
      [-halfWidth + 0.12, top],
      [-halfWidth + 0.03, shoulder],
      [-halfWidth, belt],
      [-halfWidth, lower],
      [-halfWidth, bottom + 0.06],
    ].map(([px, py]) => [engineAt.x + px, py] as const),
  } satisfies LoftStation;
};

const buildCab = (builder: AttractionBuilder) => {
  builder.loft({
    stations: [
      cabStation(-cabLength, 1.98),
      cabStation(-0.45, 1.98),
      cabStation(-0.22, 1.92),
      cabStation(-0.06, 1.25, 0.99),
      cabStation(0, 1.0, 0.97),
    ],
    paint: (centre, normal) => {
      const along = centre.z - engineAt.z;
      if (
        normal.z > 0.3 &&
        centre.y > 1.25 &&
        Math.abs(centre.x - engineAt.x) < engineHalfWidth - 0.06
      ) {
        return { colour: engineGlass, finish: "glass" };
      }
      if (
        Math.abs(normal.x) > 0.6 &&
        centre.y > 1.22 &&
        along > -1.25 &&
        along < -0.1
      ) {
        return { colour: engineGlass, finish: "glass" };
      }
      if (centre.y > 1.9 && normal.y > 0.6) {
        return { colour: palette.white, finish: "paint" };
      }
      return { colour: fireRed, finish: "paint" };
    },
  });
  const nose = engineAt.z;
  builder.box(
    "metal",
    "#dfe3e6",
    [engineHalfWidth * 2 + 0.06, 0.2, 0.16],
    [engineAt.x, 0.42, nose + 0.06],
  );
  builder.box(
    "matte",
    "#1d1f22",
    [0.9, 0.36, 0.03],
    [engineAt.x, 0.78, nose + 0.005],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "glow",
      "#fff6dc",
      [0.24, 0.14, 0.04],
      [engineAt.x + side * 0.56, 0.72, nose - 0.01],
    );
    builder.box(
      "glow",
      "#2f6bff",
      [0.1, 0.08, 0.04],
      [engineAt.x + side * 0.56, 0.9, nose - 0.01],
    );
  });
  builder.box(
    "paint",
    "#1d1f22",
    [1.2, 0.1, 0.24],
    [engineAt.x, 2.03, cabBack + 0.75],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "glow",
      "#3a7bff",
      [0.42, 0.12, 0.2],
      [engineAt.x + side * 0.34, 2.12, cabBack + 0.75],
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "glow",
    "#f5f5f0",
    [0.2, 0.1, 0.18],
    [engineAt.x, 2.12, cabBack + 0.75],
  );
  for (let bar = 0; bar < 4; bar++) {
    builder.box(
      "metal",
      "#c9cdd2",
      [0.84, 0.025, 0.02],
      [engineAt.x, 0.66 + bar * 0.08, nose + 0.025],
    );
  }
  builder.box(
    "paint",
    palette.white,
    [0.4, 0.09, 0.02],
    [engineAt.x, 0.42, nose + 0.145],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.black,
      [0.06, 0.32, 0.12],
      [engineAt.x + side * (engineHalfWidth + 0.14), 1.42, nose - 0.32],
    );
    builder.bar(
      "metal",
      palette.black,
      [engineAt.x + side * (engineHalfWidth - 0.01), 1.55, nose - 0.4],
      [engineAt.x + side * (engineHalfWidth + 0.12), 1.55, nose - 0.32],
      0.025,
      4,
    );
    builder.box(
      "glow",
      "#ffa53a",
      [0.03, 0.06, 0.12],
      [engineAt.x + side * (engineHalfWidth + 0.003), 0.95, nose - 0.12],
    );
    builder.box(
      "matte",
      shade(fireRed, 0.7),
      [0.02, 0.8, 0.02],
      [engineAt.x + side * (engineHalfWidth + 0.003), 1.2, cabBack + 0.68],
    );
    builder.box(
      "metal",
      palette.steel,
      [0.03, 0.04, 0.16],
      [engineAt.x + side * (engineHalfWidth + 0.01), 1.12, cabBack + 0.52],
    );
    builder.box(
      "metal",
      palette.steel,
      [0.12, 0.04, 0.28],
      [engineAt.x + side * (engineHalfWidth - 0.02), 0.32, cabBack + 0.4],
    );
  });
};

const buildBody = (builder: AttractionBuilder) => {
  const bodyLength = engineLength - cabLength - 0.05;
  const bodyZ = engineRear + bodyLength / 2;
  builder.roundedBox(
    "paint",
    fireRed,
    [engineHalfWidth * 2, 1.62, bodyLength],
    0.06,
    [engineAt.x, 0.42 + 0.81, bodyZ],
  );
  builder.box(
    "matte",
    "#2b2d30",
    [engineHalfWidth * 2 - 0.3, 0.3, engineLength - 0.4],
    [engineAt.x, 0.38, engineAt.z - engineLength / 2],
  );
  const lockers = 3;
  const lockerLength = (bodyLength - 0.3) / lockers;
  [-1, 1].forEach((side) => {
    const faceX = engineAt.x + side * (engineHalfWidth + 0.005);
    for (let locker = 0; locker < lockers; locker++) {
      const lockerZ = engineRear + 0.15 + lockerLength * (locker + 0.5);
      builder.box(
        "metal",
        lockerSilver,
        [0.02, 0.92, lockerLength - 0.1],
        [faceX, 1.45, lockerZ],
      );
      if (!builder.isFar) {
        for (let groove = 1; groove < 7; groove++) {
          builder.box(
            "metal",
            "#8f969d",
            [0.025, 0.015, lockerLength - 0.12],
            [faceX, 0.99 + groove * 0.13, lockerZ],
          );
        }
        builder.box(
          "metal",
          "#8f969d",
          [0.03, 0.06, 0.24],
          [faceX, 1.0, lockerZ],
        );
      }
    }
    builder.box(
      "paint",
      hiVisYellow,
      [0.02, 0.1, bodyLength - 0.1],
      [faceX, 0.82, bodyZ],
    );
    builder.box(
      "paint",
      palette.white,
      [0.02, 0.05, engineLength - 0.3],
      [faceX, 0.7, engineAt.z - engineLength / 2],
    );
  });
  [-1, 1].forEach((side) => {
    [engineAt.z - 0.82, engineRear + 0.85].forEach((axle) => {
      addRoadWheel(
        builder,
        [engineAt.x + side * (engineHalfWidth - 0.14), 0.38, axle],
        0.38,
        { width: 0.28, side, hub: "#d8dcdf" },
      );
    });
  });
  const rear = engineRear - 0.005;
  builder.box(
    "metal",
    lockerSilver,
    [engineHalfWidth * 2 - 0.3, 0.92, 0.02],
    [engineAt.x, 1.45, rear],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "glow",
      "#d8231f",
      [0.12, 0.3, 0.03],
      [engineAt.x + side * 0.66, 0.85, rear],
    );
    builder.box(
      "glow",
      "#3a7bff",
      [0.14, 0.12, 0.14],
      [engineAt.x + side * 0.62, 2.1, engineRear + 0.12],
    );
  });
  if (!builder.isFar) {
    for (let chevron = 0; chevron < 6; chevron++) {
      builder.box(
        "paint",
        chevron % 2 === 0 ? hiVisYellow : fireRed,
        [0.28, 0.1, 0.02],
        [engineAt.x - 0.68 + chevron * 0.27, 0.6, rear - 0.01],
        [0, 0, 0.7],
      );
    }
    for (let step = 0; step < 3; step++) {
      builder.box(
        "metal",
        palette.steel,
        [0.5, 0.03, 0.18],
        [engineAt.x, 0.32 + step * 0.32, rear - 0.1],
      );
    }
  }
  const ladderY = 2.22;
  const ladderFrom = engineRear - 0.2;
  const ladderTo = cabBack + 0.3;
  [-0.3, 0.3].forEach((dx) => {
    builder.box(
      "metal",
      "#d7dbde",
      [0.06, 0.08, ladderTo - ladderFrom],
      [engineAt.x + dx, ladderY, (ladderFrom + ladderTo) / 2],
    );
  });
  [engineRear + 0.4, cabBack - 0.2].forEach((stand) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.9, 0.18, 0.08],
      [engineAt.x, ladderY - 0.13, stand],
    );
  });
  if (!builder.isFar) {
    const rungs = 12;
    for (let rung = 0; rung <= rungs; rung++) {
      builder.cylinder("metal", "#d7dbde", {
        radius: 0.018,
        length: 0.6,
        at: [
          engineAt.x,
          ladderY,
          ladderFrom + 0.1 + ((ladderTo - ladderFrom - 0.2) * rung) / rungs,
        ],
        axis: "x",
        segments: 5,
      });
    }
    builder.cylinder("paint", fireRed, {
      radius: 0.2,
      length: 0.3,
      at: [engineAt.x + 0.46, 2.2, engineRear + 1.4],
      axis: "x",
      segments: 12,
    });
    builder.cylinder("matte", "#d8c79a", {
      radius: 0.16,
      length: 0.32,
      at: [engineAt.x + 0.46, 2.2, engineRear + 1.4],
      axis: "x",
      segments: 12,
    });
  }
};

/* The yard */

const flagAt: Triple = [-4.6, 0, 1.4];
const flagHeight = 5.2;
const flagMotion: Motion = {
  kind: "swing",
  axis: "y",
  amplitude: 0.28,
  period: 3.4,
};

const beaconAt: Triple = [engineAt.x, 2.14, cabBack + 0.75];

const buildYard = (builder: AttractionBuilder) => {
  builder.box("matte", concrete, [width + 0.4, 0.04, 5.6], [0, 0.02, 2.8]);
  builder.box("matte", concrete, [3.4, 0.035, 3.2], [-1.0, 0.018, 7.1]);
  if (!builder.isFar) {
    [openBayX, closedBayX].forEach((bayX) => {
      [-1, 1].forEach((side) => {
        builder.box(
          "paint",
          palette.white,
          [0.07, 0.006, 5.2],
          [bayX + side * 1.05, 0.043, 2.9],
        );
      });
    });
    for (let stripe = 0; stripe < 9; stripe++) {
      builder.box(
        "paint",
        hiVisYellow,
        [0.09, 0.006, 0.95],
        [closedBayX - 0.85 + stripe * 0.22, 0.044, 0.75],
        [0, 0.6, 0],
      );
    }
    builder.box(
      "paint",
      hiVisYellow,
      [bayWidth, 0.006, 0.08],
      [closedBayX, 0.044, 1.3],
    );
    for (let joint = 1; joint < 5; joint++) {
      builder.box(
        "matte",
        shade(concrete, 0.9),
        [width + 0.4, 0.006, 0.03],
        [0, 0.043, joint * 1.12],
      );
    }
  }
  [-2.55, 0, 2.55].forEach((x) => {
    builder.cylinder("paint", hiVisYellow, {
      radius: 0.1,
      length: 0.6,
      at: [x, 0.3, front + 0.35],
      segments: 10,
    });
    if (!builder.isFar) {
      builder.cylinder("paint", palette.black, {
        radius: 0.103,
        length: 0.08,
        at: [x, 0.45, front + 0.35],
        segments: 10,
      });
    }
  });
  const hydrant: Triple = [3.7, 0, 1.6];
  builder.lathe(
    "paint",
    hiVisYellow,
    [
      [0, 0],
      [0.16, 0],
      [0.16, 0.06],
      [0.11, 0.08],
      [0.11, 0.5],
      [0.14, 0.52],
      [0.12, 0.6],
      [0.04, 0.66],
      [0, 0.66],
    ],
    hydrant,
    "y",
    12,
  );
  builder.cylinder("paint", fireRed, {
    radius: 0.05,
    length: 0.34,
    at: [hydrant[0], 0.36, hydrant[2]],
    axis: "x",
    segments: 8,
  });
  addFlagpole(builder, flagAt, flagHeight);
  addBench(builder, [-4.6, 0, -1.4], Math.PI / 2);
  addLampPost(builder, [2.6, 0, 6.0], 2.4);
  addTree(builder, [-5.2, 0, -4.4], 1.1);
  addTree(builder, [6.4, 0, 1.6], 0.95, "#4a9440");
  addBush(builder, [-5.4, 0, -2.6], 0.5);
  addBush(builder, [5.9, 0, -1.2], 0.45, "#3a7d34");
  addBush(builder, [4.6, 0, 3.6], 0.4);
  addSignBoard(builder, [3.6, 0, 5.3], fireRed);
};

export const fireStationModel: AttractionModel = {
  kind: "fire-station",
  name: "Fire Station",
  fact: "In 1666 the Great Fire of London started in a bakery on Pudding Lane and burned for four days. Houses were made of wood and packed close together, and there was no fire brigade, so people fought the flames with leather buckets and water squirts.",
  curriculumLink:
    "History, Key Stage 1: events beyond living memory. The Great Fire of London.",
  footprint: 8.6,
  setting: "inland",
  signSpot: { x: 3.6, z: 6.2 },
  build: (builder) => {
    buildYard(builder);
    buildStation(builder);
    buildClosedBay(builder);
    buildOpenBay(builder);
    buildTower(builder);
    buildCab(builder);
    buildBody(builder);
  },
  moving: [
    {
      name: "flag",
      pivot: [flagAt[0], flagAt[1] + flagHeight - 0.08, flagAt[2]],
      build: buildFlag({ field: fireRed, stripe: hiVisYellow, length: 1.1 }),
      motion: flagMotion,
    },
    {
      name: "blue-lights",
      pivot: beaconAt,
      look: "halo",
      motion: { kind: "flicker", period: 0.5 },
      build: (builder) => {
        [-1, 1].forEach((side) => {
          builder.sphere(
            "glow",
            "#3a7bff",
            0.32,
            [side * 0.34, 0, 0],
            [1.2, 0.8, 1],
            10,
          );
        });
      },
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: left + 0.7, z: back + 1.0 },
      { x: right - 0.7, z: back + 1.0 },
      1.25,
      1.1,
    ),
    ...listWallBlockers(
      { x: left + 0.7, z: front - 1.05 },
      { x: right - 0.7, z: front - 1.05 },
      1.15,
      1.1,
    ),
    { x: towerAt.x, z: towerAt.z, radius: 1.2 },
    ...listWallBlockers(
      { x: engineAt.x, z: engineRear + 0.75 },
      { x: engineAt.x, z: engineAt.z - 0.7 },
      0.92,
      1.0,
    ),
    { x: flagAt[0], z: flagAt[2], radius: 0.3 },
    { x: -4.6, z: -1.4, radius: 0.5 },
  ],
};
