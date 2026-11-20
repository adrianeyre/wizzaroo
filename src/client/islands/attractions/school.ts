import {
  CircleGeometry,
  CylinderGeometry,
  PlaneGeometry,
  RingGeometry,
  Shape,
  ShapeGeometry,
} from "three";
import {
  addBench,
  addBush,
  addDoor,
  addSignBoard,
  addTree,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "./attraction-kit.js";
import {
  addChimney,
  addFanlight,
  addFlagpole,
  addGabledBlock,
  addLettering,
  addPitchedRoof,
  addQuoins,
  addSash,
  addTurned,
  buildFlag,
} from "./post-office-parts.js";

const brick = "#a45038";
const dressing = "#e7dcc2";
const doorBlue = "#24476b";
const ironGreen = "#22382e";
const tarmac = "#5b5f63";
const lineWhite = "#f1efe8";
const navy = "#23395b";

/* The school building */

const rangeZ = -4.6;
const rangeWidth = 7;
const rangeDepth = 3.4;
const rangeEaves = 2.6;
const rangeRise = 1.7;
const rangeFront = rangeZ + rangeDepth / 2;
const rangeBack = rangeZ - rangeDepth / 2;
const wingX = 4.3;
const wingWidth = 2.4;
const wingLength = 4.8;
const wingZ = -4.2;
const wingEaves = 2.6;
const wingRise = 1.3;
const wingFront = wingZ + wingLength / 2;
const porchZ = rangeFront + 0.25;
const porchLength = 1.3;
const porchFront = porchZ + porchLength / 2;
const ridge = rangeEaves + rangeRise;

const bellPivot: Triple = [0, ridge + 1.02, rangeZ];
const bellMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.5,
  period: 2.3,
};

const buildRange = (builder: AttractionBuilder) => {
  addGabledBlock(builder, {
    centre: { x: 0, z: rangeZ },
    width: rangeWidth,
    depth: rangeDepth,
    eaves: rangeEaves,
    rise: rangeRise,
    colour: brick,
  });
  addPitchedRoof(builder, {
    centre: { x: 0, z: rangeZ },
    width: rangeWidth,
    depth: rangeDepth,
    eaves: rangeEaves,
    rise: rangeRise,
    colour: palette.slate,
    courses: 8,
    overhang: 0.25,
  });
  builder.box(
    "matte",
    shade(brick, 0.75),
    [rangeWidth, 0.3, rangeDepth + 0.06],
    [0, 0.15, rangeZ],
  );
  builder.box(
    "matte",
    dressing,
    [rangeWidth, 0.09, rangeDepth + 0.08],
    [0, 0.68, rangeZ],
  );
  builder.box(
    "matte",
    dressing,
    [rangeWidth, 0.12, rangeDepth + 0.12],
    [0, rangeEaves - 0.06, rangeZ],
  );
  [-2.25, 2.25].forEach((x) => {
    addChimney(builder, [x, ridge - 0.5, rangeZ], {
      height: 1.25,
      colour: shade(brick, 0.92),
      width: 0.48,
      depth: 0.66,
      pots: 2,
    });
  });
  [-2.45, -1.55, 1.55, 2.45].forEach((x) => {
    addSash(builder, {
      at: [x, 1.5, rangeFront + 0.02],
      width: 0.62,
      height: 1.45,
      lintel: dressing,
    });
  });
  [-1.6, 1.6].forEach((x) => {
    addSash(builder, {
      at: [x, 1.5, rangeBack - 0.02],
      width: 0.62,
      height: 1.45,
      lintel: dressing,
      turn: Math.PI,
    });
  });
};

const buildWing = (builder: AttractionBuilder, side: number) => {
  const x = side * wingX;
  addGabledBlock(builder, {
    centre: { x, z: wingZ },
    width: wingLength,
    depth: wingWidth,
    eaves: wingEaves,
    rise: wingRise,
    colour: brick,
    turn: Math.PI / 2,
  });
  addPitchedRoof(builder, {
    centre: { x, z: wingZ },
    width: wingLength,
    depth: wingWidth,
    eaves: wingEaves,
    rise: wingRise,
    colour: palette.slate,
    courses: 6,
    turn: Math.PI / 2,
  });
  builder.box(
    "matte",
    shade(brick, 0.75),
    [wingWidth + 0.06, 0.3, wingLength],
    [x, 0.15, wingZ],
  );
  builder.box(
    "matte",
    dressing,
    [wingWidth + 0.08, 0.09, wingLength + 0.02],
    [x, 0.68, wingZ],
  );
  builder.box(
    "matte",
    dressing,
    [wingWidth + 0.12, 0.12, wingLength + 0.04],
    [x, wingEaves - 0.06, wingZ],
  );
  addQuoins(builder, {
    corners: [
      { x: x - wingWidth / 2, z: wingFront },
      { x: x + wingWidth / 2, z: wingFront },
      { x: x + (side * wingWidth) / 2, z: wingZ - wingLength / 2 },
    ],
    height: wingEaves - 0.15,
    colour: dressing,
    from: 0.3,
  });
  [-0.6, 0, 0.6].forEach((dx) => {
    const tall = dx === 0 ? 1.75 : 1.45;
    addSash(builder, {
      at: [x + dx, 0.75 + tall / 2 + 0.05, wingFront + 0.02],
      width: 0.48,
      height: tall,
      lintel: dressing,
    });
  });
  const oculusY = wingEaves + 0.5;
  builder.cylinder("glass", "#6f93ad", {
    radius: 0.24,
    length: 0.04,
    at: [x, oculusY, wingFront + 0.02],
    axis: "z",
    segments: 16,
  });
  builder.torus(
    "matte",
    dressing,
    0.26,
    0.05,
    [x, oculusY, wingFront + 0.03],
    "z",
    16,
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      palette.white,
      [0.48, 0.035, 0.03],
      [x, oculusY, wingFront + 0.05],
    );
    builder.box(
      "paint",
      palette.white,
      [0.035, 0.48, 0.03],
      [x, oculusY, wingFront + 0.05],
    );
  }
  addSash(builder, {
    at: [x, 1.5, wingZ - wingLength / 2 - 0.02],
    width: 0.6,
    height: 1.4,
    lintel: dressing,
    turn: Math.PI,
  });
  [-0.9, 0.9].forEach((dz) => {
    addSash(builder, {
      at: [x + (side * wingWidth) / 2 + side * 0.02, 1.5, wingZ + dz],
      width: 0.6,
      height: 1.4,
      lintel: dressing,
      turn: (side * Math.PI) / 2,
    });
  });
};

const buildPorch = (builder: AttractionBuilder) => {
  addGabledBlock(builder, {
    centre: { x: 0, z: porchZ },
    width: porchLength,
    depth: 2.0,
    eaves: 2.1,
    rise: 0.8,
    colour: brick,
    turn: Math.PI / 2,
  });
  addPitchedRoof(builder, {
    centre: { x: 0, z: porchZ + 0.05 },
    width: porchLength + 0.1,
    depth: 2.0,
    eaves: 2.1,
    rise: 0.8,
    colour: palette.slate,
    overhang: 0.16,
    turn: Math.PI / 2,
    courses: 3,
  });
  builder.box(
    "matte",
    dressing,
    [2.06, 0.1, porchLength + 0.04],
    [0, 2.05, porchZ],
  );
  addQuoins(builder, {
    corners: [
      { x: -1, z: porchFront },
      { x: 1, z: porchFront },
    ],
    height: 1.95,
    colour: dressing,
    from: 0.05,
  });
  addDoor(builder, {
    at: [0, 0.08, porchFront + 0.02],
    width: 0.78,
    height: 1.3,
    colour: doorBlue,
    frame: palette.white,
  });
  addFanlight(builder, {
    at: [0, 1.42, porchFront + 0.03],
    radius: 0.36,
    frame: palette.white,
  });
  builder.box(
    "matte",
    dressing,
    [1.1, 0.08, 0.5],
    [0, 0.04, porchFront + 0.25],
  );
  builder.box(
    "matte",
    dressing,
    [1.1, 0.32, 0.06],
    [0, 2.38, porchFront + 0.03],
  );
  addLettering(builder, "SCHOOL", {
    at: [0, 2.38, porchFront + 0.07],
    height: 0.17,
    colour: navy,
  });
  const canopyY = 1.98;
  builder.box(
    "paint",
    ironGreen,
    [1.9, 0.07, 1.05],
    [0, canopyY, porchFront + 0.5],
    [-0.1, 0, 0],
  );
  builder.box(
    "glass",
    "#9fc2d6",
    [1.7, 0.02, 0.9],
    [0, canopyY + 0.05, porchFront + 0.5],
    [-0.1, 0, 0],
  );
  builder.box(
    "paint",
    ironGreen,
    [1.92, 0.14, 0.04],
    [0, canopyY - 0.12, porchFront + 1.02],
  );
  [-0.85, 0.85].forEach((x) => {
    builder.cylinder("paint", ironGreen, {
      radius: 0.045,
      length: canopyY - 0.05,
      at: [x, (canopyY - 0.05) / 2, porchFront + 0.95],
      segments: 8,
    });
    if (!builder.isFar) {
      builder.bar(
        "paint",
        ironGreen,
        [x, canopyY - 0.45, porchFront + 0.95],
        [x, canopyY - 0.05, porchFront + 0.55],
        0.03,
        5,
      );
      builder.sphere(
        "paint",
        ironGreen,
        0.07,
        [x, 0.06, porchFront + 0.95],
        [1, 1, 1],
        6,
      );
    }
  });
  addSash(builder, {
    at: [-1.02, 1.3, porchZ],
    width: 0.4,
    height: 0.8,
    lintel: dressing,
    turn: -Math.PI / 2,
  });
  addSash(builder, {
    at: [1.02, 1.3, porchZ],
    width: 0.4,
    height: 0.8,
    lintel: dressing,
    turn: Math.PI / 2,
  });
};

const buildBellcote = (builder: AttractionBuilder) => {
  const [x, , z] = bellPivot;
  const base = ridge - 0.25;
  builder.box("matte", brick, [0.8, 0.55, 0.8], [x, base + 0.27, z]);
  builder.box("matte", dressing, [0.92, 0.08, 0.92], [x, base + 0.58, z]);
  const postsTop = base + 1.45;
  [-1, 1].forEach((dx) => {
    [-1, 1].forEach((dz) => {
      builder.box(
        "paint",
        palette.white,
        [0.09, postsTop - base - 0.62, 0.09],
        [x + dx * 0.34, (postsTop + base + 0.62) / 2, z + dz * 0.34],
      );
    });
  });
  builder.box(
    "paint",
    palette.white,
    [0.86, 0.08, 0.86],
    [x, postsTop + 0.04, z],
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.74, 0.05, 0.05],
    [x, bellPivot[1] + 0.02, z],
  );
  addTurned(
    builder,
    "metal",
    "#5f8f7c",
    new CylinderGeometry(0.02, 0.66, 0.62, 4, 1),
    [x, postsTop + 0.39, z],
    [0, Math.PI / 4, 0],
  );
  builder.sphere("metal", palette.brass, 0.06, [x, postsTop + 0.74, z]);
  if (!builder.isFar) {
    builder.cylinder("metal", palette.black, {
      radius: 0.015,
      length: 0.5,
      at: [x, postsTop + 0.98, z],
      segments: 4,
    });
    builder.box(
      "metal",
      palette.black,
      [0.34, 0.1, 0.015],
      [x + 0.08, postsTop + 1.12, z],
    );
    [
      [0.18, 0, 0],
      [0, 0, 0.18],
    ].forEach(([dx, , dz]) => {
      builder.box(
        "metal",
        palette.black,
        [dx === 0 ? 0.015 : 0.38, 0.015, dz === 0 ? 0.015 : 0.38],
        [x, postsTop + 0.92, z],
      );
    });
  }
};

const buildBell = (builder: AttractionBuilder) => {
  builder.box("matte", palette.darkTimber, [0.3, 0.08, 0.1], [0, -0.02, 0]);
  builder.lathe(
    "metal",
    "#b0843a",
    [
      [0, -0.05],
      [0.08, -0.05],
      [0.12, -0.09],
      [0.135, -0.2],
      [0.16, -0.3],
      [0.21, -0.37],
      [0.22, -0.4],
      [0.19, -0.4],
      [0, -0.36],
    ],
    [0, 0, 0],
    "y",
    16,
  );
  builder.sphere("metal", palette.darkSteel, 0.05, [0, -0.39, 0], [1, 1, 1], 8);
};

/* The playground */

const yardFront = 7.6;
const yardSide = 6.5;
const yardBack = -1.7;
const railingZ = 7.9;
const gateHalf = 1.0;

const hopscotchX = -3.5;
const hopscotchStep = 0.62;
const hopscotchStart = 6.55;
const hopscotchRows: readonly (readonly number[])[] = [
  [1],
  [2],
  [3, 4],
  [5],
  [6, 7],
  [8],
];
const hopColours = ["#f2c94c", "#7cc46b", "#5bb6e6", "#ef7d5a", "#c58be0"];

const compassAt = { x: 0, z: 2.5 };
const compassRadius = 1.25;

const snakeAt = { x: 1.4, z: 4.9 };
const snakeSpots = Array.from({ length: 10 }, (_, index) => ({
  x: snakeAt.x + index * 0.44,
  z: snakeAt.z + Math.sin(index * 0.85) * 0.75,
}));
const snakeColours = [
  "#ef5a4f",
  "#f28c3a",
  "#f2c94c",
  "#8dc95b",
  "#3fb27f",
  "#3aa6d8",
  "#4f7bd9",
  "#8a64cf",
  "#d062a8",
  "#ef5a4f",
];

const clockAt = { x: 3.9, z: 1.35 };
const clockRadius = 0.95;

const wallAt = { x: -5.95, z: 2.2 };
const wallLength = 3.0;
const wallHeight = 1.25;

const flagAt: Triple = [5.9, 0, -0.9];
const flagHeight = 4.6;

const gardenAt = { x: 4.6, z: 6.7 };

const paintSquare = (
  builder: AttractionBuilder,
  at: LocalPoint,
  size: number,
  colour: string,
) => {
  builder.add(
    "matte",
    colour,
    new PlaneGeometry(size, size).rotateX(-Math.PI / 2),
    { at: [at.x, 0.045, at.z] },
    undefined,
  );
};

const buildMarkings = (builder: AttractionBuilder) => {
  hopscotchRows.forEach((row, rowIndex) => {
    const z = hopscotchStart - rowIndex * hopscotchStep;
    row.forEach((number, column) => {
      const x = hopscotchX + (column - (row.length - 1) / 2) * hopscotchStep;
      paintSquare(builder, { x, z }, hopscotchStep + 0.04, lineWhite);
      paintSquare(
        builder,
        { x, z },
        hopscotchStep - 0.05,
        hopColours[(number - 1) % hopColours.length],
      );
      addLettering(builder, String(number), {
        at: [x, 0.051, z],
        height: 0.3,
        colour: navy,
        isFlat: true,
      });
    });
  });
  const homeZ = hopscotchStart - hopscotchRows.length * hopscotchStep + 0.02;
  builder.add(
    "matte",
    lineWhite,
    new CylinderGeometry(0.66, 0.66, 0.008, 16, 1, false, Math.PI / 2, Math.PI),
    { at: [hopscotchX, 0.045, homeZ + 0.31] },
    undefined,
  );
  builder.add(
    "matte",
    "#f2c94c",
    new CylinderGeometry(0.58, 0.58, 0.008, 16, 1, false, Math.PI / 2, Math.PI),
    { at: [hopscotchX, 0.049, homeZ + 0.27] },
    undefined,
  );

  const ring = (inner: number, outer: number, y: number, colour: string) => {
    builder.add(
      "matte",
      colour,
      new RingGeometry(inner, outer, builder.segments(40, 20)).rotateX(
        -Math.PI / 2,
      ),
      { at: [compassAt.x, y, compassAt.z] },
      undefined,
    );
  };
  ring(compassRadius - 0.08, compassRadius, 0.046, lineWhite);
  ring(compassRadius * 0.55 - 0.05, compassRadius * 0.55, 0.046, lineWhite);
  builder.add(
    "matte",
    "#2f6fa8",
    new CylinderGeometry(
      compassRadius - 0.08,
      compassRadius - 0.08,
      0.006,
      builder.segments(40, 20),
    ),
    { at: [compassAt.x, 0.043, compassAt.z] },
    undefined,
  );
  const point = (length: number, half: number) => {
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.lineTo(half, half);
    shape.lineTo(0, length);
    shape.lineTo(-half, half);
    shape.closePath();
    return shape;
  };
  [0, 1, 2, 3, 4, 5, 6, 7].forEach((index) => {
    const isMain = index % 2 === 0;
    const angle = (index / 8) * Math.PI * 2;
    const length = isMain ? compassRadius - 0.14 : compassRadius * 0.5;
    const half = isMain ? 0.2 : 0.12;
    const colour = index === 0 ? "#e04a3a" : isMain ? lineWhite : "#f2c94c";
    builder.add(
      "matte",
      colour,
      new ShapeGeometry(point(length, half))
        .rotateX(-Math.PI / 2)
        .rotateY(Math.PI + angle),
      { at: [compassAt.x, isMain ? 0.05 : 0.048, compassAt.z] },
      undefined,
    );
  });
  [
    ["N", 0],
    ["E", 1],
    ["S", 2],
    ["W", 3],
  ].forEach(([letter, quarter]) => {
    const angle = (Number(quarter) * Math.PI) / 2;
    const reach = compassRadius + 0.32;
    addLettering(builder, String(letter), {
      at: [
        compassAt.x + Math.sin(angle) * reach,
        0.05,
        compassAt.z - Math.cos(angle) * reach,
      ],
      height: 0.34,
      colour: lineWhite,
      isFlat: true,
    });
  });

  builder.add(
    "matte",
    "#f2c94c",
    new CircleGeometry(clockRadius, builder.segments(32, 16)).rotateX(
      -Math.PI / 2,
    ),
    { at: [clockAt.x, 0.044, clockAt.z] },
    undefined,
  );
  builder.add(
    "matte",
    lineWhite,
    new RingGeometry(
      clockRadius,
      clockRadius + 0.07,
      builder.segments(32, 16),
    ).rotateX(-Math.PI / 2),
    { at: [clockAt.x, 0.046, clockAt.z] },
    undefined,
  );
  for (let hour = 1; hour <= 12; hour++) {
    const angle = (hour / 12) * Math.PI * 2;
    addLettering(builder, String(hour), {
      at: [
        clockAt.x + Math.sin(angle) * clockRadius * 0.74,
        0.05,
        clockAt.z - Math.cos(angle) * clockRadius * 0.74,
      ],
      height: 0.2,
      colour: navy,
      isFlat: true,
    });
  }
  [
    { angle: 0, length: clockRadius * 0.55 },
    { angle: Math.PI / 2, length: clockRadius * 0.38 },
  ].forEach(({ angle, length }) => {
    builder.add(
      "matte",
      "#e04a3a",
      new PlaneGeometry(0.07, length)
        .translate(0, length / 2, 0)
        .rotateX(-Math.PI / 2)
        .rotateY(-angle),
      { at: [clockAt.x, 0.052, clockAt.z] },
      undefined,
    );
  });
  builder.add(
    "matte",
    "#e04a3a",
    new CircleGeometry(0.07, 8).rotateX(-Math.PI / 2),
    { at: [clockAt.x, 0.054, clockAt.z] },
    undefined,
  );

  snakeSpots.forEach((spot, index) => {
    builder.add(
      "matte",
      snakeColours[index],
      new CircleGeometry(0.27, builder.segments(16, 8)).rotateX(-Math.PI / 2),
      { at: [spot.x, 0.045, spot.z] },
      undefined,
    );
    const label = String(index + 1);
    addLettering(builder, label, {
      at: [spot.x - (label.length > 1 ? 0.02 : 0), 0.051, spot.z],
      height: 0.24,
      colour: palette.white,
      isFlat: true,
    });
  });
  const head = snakeSpots[snakeSpots.length - 1];
  const headAt = { x: head.x + 0.5, z: head.z + 0.1 };
  builder.cylinder("matte", "#3fb27f", {
    radius: 0.34,
    length: 0.008,
    at: [headAt.x, 0.045, headAt.z],
    segments: 18,
  });
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.cylinder("matte", palette.white, {
        radius: 0.08,
        length: 0.008,
        at: [headAt.x + 0.08, 0.05, headAt.z + side * 0.13],
        segments: 10,
      });
      builder.cylinder("matte", palette.black, {
        radius: 0.04,
        length: 0.008,
        at: [headAt.x + 0.1, 0.054, headAt.z + side * 0.13],
        segments: 8,
      });
    });
    builder.box(
      "matte",
      "#e04a3a",
      [0.3, 0.008, 0.05],
      [headAt.x + 0.45, 0.045, headAt.z],
    );
  }
  const tail = snakeSpots[0];
  builder.add(
    "matte",
    "#3fb27f",
    new CylinderGeometry(0.004, 0.2, 0.55, 8)
      .rotateZ(Math.PI / 2)
      .scale(1, 0.02, 1),
    { at: [tail.x - 0.5, 0.045, tail.z] },
    undefined,
  );
};

const buildYard = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    tarmac,
    [yardSide * 2, 0.04, yardFront - yardBack],
    [0, 0.02, (yardFront + yardBack) / 2],
  );
  builder.box(
    "matte",
    palette.paving,
    [gateHalf * 2 - 0.1, 0.03, 2.6],
    [0, 0.015, railingZ + 1.2],
  );
  builder.box(
    "matte",
    palette.paving,
    [rangeWidth - 0.6, 0.042, 0.9],
    [0, 0.021, rangeFront + 0.45],
  );
  buildMarkings(builder);
};

const buildRailings = (builder: AttractionBuilder) => {
  const runs: [LocalPoint, LocalPoint][] = [
    [
      { x: -yardSide - 0.1, z: railingZ },
      { x: -gateHalf - 0.2, z: railingZ },
    ],
    [
      { x: gateHalf + 0.2, z: railingZ },
      { x: yardSide + 0.1, z: railingZ },
    ],
    [
      { x: -yardSide - 0.1, z: railingZ },
      { x: -yardSide - 0.1, z: -1.2 },
    ],
    [
      { x: yardSide + 0.1, z: railingZ },
      { x: yardSide + 0.1, z: -1.2 },
    ],
  ];
  const height = 1.0;
  runs.forEach(([from, to]) => {
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const turn = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2;
    const middle = { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 };
    [0.12, height - 0.08].forEach((up) => {
      builder.box(
        "paint",
        ironGreen,
        [length, 0.05, 0.04],
        [middle.x, up, middle.z],
        [0, turn, 0],
      );
    });
    const spacing = builder.isFar ? 0.9 : 0.2;
    const bars = Math.round(length / spacing);
    for (let bar = 0; bar <= bars; bar++) {
      const share = bar / bars;
      const x = from.x + (to.x - from.x) * share;
      const z = from.z + (to.z - from.z) * share;
      builder.cylinder("paint", ironGreen, {
        radius: 0.02,
        length: height,
        at: [x, height / 2, z],
        segments: 3,
        isOpen: true,
      });
      if (!builder.isFar) {
        builder.cylinder("paint", ironGreen, {
          radius: 0.035,
          radiusEnd: 0.001,
          length: 0.1,
          at: [x, height + 0.05, z],
          segments: 3,
          isOpen: true,
        });
      }
    }
  });
  [
    { x: -gateHalf - 0.15, z: railingZ },
    { x: gateHalf + 0.15, z: railingZ },
    { x: -yardSide - 0.1, z: railingZ },
    { x: yardSide + 0.1, z: railingZ },
  ].forEach(({ x, z }) => {
    builder.box("matte", brick, [0.36, 1.3, 0.36], [x, 0.65, z]);
    builder.box("matte", dressing, [0.44, 0.1, 0.44], [x, 1.35, z]);
    builder.sphere("matte", dressing, 0.13, [x, 1.5, z], [1, 1, 1], 8);
  });
  [-1, 1].forEach((side) => {
    const hinge = { x: side * (gateHalf - 0.02), z: railingZ };
    const leaf = 0.9;
    const endX = hinge.x - side * leaf * Math.cos(1.25);
    const endZ = hinge.z - leaf * Math.sin(1.25);
    [0.15, 0.85].forEach((up) => {
      builder.bar(
        "paint",
        ironGreen,
        [hinge.x, up, hinge.z],
        [endX, up, endZ],
        0.04,
        4,
      );
    });
    const gateBars = builder.isFar ? 2 : 6;
    for (let bar = 0; bar <= gateBars; bar++) {
      const share = bar / gateBars;
      builder.box(
        "paint",
        ironGreen,
        [0.025, 0.85, 0.025],
        [
          hinge.x + (endX - hinge.x) * share,
          0.5,
          hinge.z + (endZ - hinge.z) * share,
        ],
      );
    }
  });
};

const buildClimbingWall = (builder: AttractionBuilder) => {
  const { x, z } = wallAt;
  builder.box(
    "matte",
    "#3f7a4a",
    [1.4, 0.05, wallLength + 0.6],
    [x + 0.55, 0.025, z],
  );
  builder.box(
    "paint",
    "#d9b37a",
    [0.14, wallHeight, wallLength],
    [x - 0.05, wallHeight / 2, z],
  );
  [-1, 1].forEach((end) => {
    builder.box(
      "paint",
      "#2f6fa8",
      [0.3, wallHeight + 0.15, 0.12],
      [x - 0.08, (wallHeight + 0.15) / 2, z + (end * (wallLength + 0.12)) / 2],
    );
  });
  builder.box(
    "paint",
    "#2f6fa8",
    [0.3, 0.1, wallLength + 0.24],
    [x - 0.08, wallHeight + 0.05, z],
  );
  if (builder.isFar) {
    return;
  }
  const holdColours = ["#e04a3a", "#f2c94c", "#3fb27f", "#4f7bd9", "#d062a8"];
  for (let hold = 0; hold < 16; hold++) {
    const along =
      ((hold * 0.618) % 1) * (wallLength - 0.3) - wallLength / 2 + 0.15;
    const up = 0.2 + ((hold * 0.37) % 1) * (wallHeight - 0.35);
    builder.box(
      "paint",
      holdColours[hold % holdColours.length],
      [0.08, 0.09, 0.12],
      [x + 0.04, up, z + along],
      [0, 0, hold * 0.7],
    );
  }
};

const buildGarden = (builder: AttractionBuilder) => {
  const { x, z } = gardenAt;
  builder.box("matte", palette.timber, [2.2, 0.32, 0.9], [x, 0.16, z]);
  builder.box("matte", palette.soil, [2.06, 0.04, 0.76], [x, 0.32, z]);
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        palette.paleTimber,
        [2.24, 0.05, 0.08],
        [x, 0.34, z + side * 0.43],
      );
    });
  }
  for (let flower = 0; flower < 5; flower++) {
    const flowerX = x - 0.85 + flower * 0.42;
    const tall = 0.9 + (flower % 3) * 0.18;
    builder.cylinder("matte", "#4f8f3a", {
      radius: 0.025,
      length: tall,
      at: [flowerX, 0.32 + tall / 2, z - 0.2],
      segments: 5,
    });
    builder.cylinder("matte", "#f2b51d", {
      radius: 0.13,
      length: 0.04,
      at: [flowerX, 0.34 + tall, z - 0.16],
      axis: "z",
      segments: 10,
    });
    builder.cylinder("matte", "#6b4a2f", {
      radius: 0.06,
      length: 0.05,
      at: [flowerX, 0.34 + tall, z - 0.14],
      axis: "z",
      segments: 8,
    });
  }
  for (let plant = 0; plant < 4; plant++) {
    builder.sphere(
      "matte",
      plant % 2 === 0 ? "#6aa846" : "#4d8a3a",
      0.15,
      [x - 0.75 + plant * 0.5, 0.4, z + 0.18],
      [1, 0.7, 1],
      8,
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  addBench(builder, [-2.0, 0, rangeFront + 1.3]);
  addBench(builder, [2.0, 0, rangeFront + 1.3]);
  addFlagpole(builder, flagAt, flagHeight);
  addTree(builder, [-6.6, 0, -5.4], 1.1);
  addBush(builder, [6.6, 0, -5.4], 0.6, "#4a9440");
  addBush(builder, [-6.8, 0, -2.4], 0.5);
  addBush(builder, [7.1, 0, -2.6], 0.5, "#3a7d34");
  addSignBoard(builder, [2.4, 0, 8.6], navy);
};

/* The hopscotch and the climbing wall */

const hopscotchSpots = (): LocalPoint[] => [
  { x: hopscotchX, z: hopscotchStart + 0.65 },
  ...hopscotchRows.map((_, rowIndex) => ({
    x: hopscotchX,
    z: hopscotchStart - rowIndex * hopscotchStep,
  })),
  {
    x: hopscotchX,
    z: hopscotchStart - hopscotchRows.length * hopscotchStep - 0.15,
  },
  {
    x: hopscotchX + 0.9,
    z: hopscotchStart - hopscotchRows.length * hopscotchStep - 0.3,
  },
];

const hopscotchRide = (progress: number): LocalSpot => {
  const spots = hopscotchSpots();
  const hops = spots.length - 1;
  const along = Math.min(hops - 0.0001, Math.max(0, progress * hops));
  const hop = Math.floor(along);
  const share = along - hop;
  const from = spots[hop];
  const to = spots[hop + 1];
  const isLast = hop === hops - 1;
  return {
    x: from.x + (to.x - from.x) * share,
    y: isLast ? 0 : 0.32 * Math.sin(share * Math.PI),
    z: from.z + (to.z - from.z) * share,
    heading: Math.atan2(to.x - from.x, to.z - from.z),
  };
};

const climbRide = (progress: number): LocalSpot => {
  const climbing = Math.min(1, Math.max(0, (progress - 0.1) / 0.8));
  const lift = Math.sin(
    Math.min(1, progress * 6, (1 - progress) * 6) * (Math.PI / 2),
  );
  return {
    x: wallAt.x + 0.75 - lift * 0.5,
    y: lift * (0.3 + 0.2 * Math.sin(climbing * Math.PI * 3)),
    z: wallAt.z - wallLength / 2 - 0.2 + (wallLength + 0.4) * climbing,
    heading: -Math.PI / 2,
  };
};

const railingBlockers = (): LocalBlocker[] => [
  ...listWallBlockers(
    { x: -yardSide - 0.1, z: railingZ },
    { x: -gateHalf - 0.15, z: railingZ },
    0.25,
    0.45,
  ),
  ...listWallBlockers(
    { x: gateHalf + 0.15, z: railingZ },
    { x: yardSide + 0.1, z: railingZ },
    0.25,
    0.45,
  ),
  ...listWallBlockers(
    { x: -yardSide - 0.1, z: railingZ },
    { x: -yardSide - 0.1, z: -1.2 },
    0.25,
    0.45,
  ),
  ...listWallBlockers(
    { x: yardSide + 0.1, z: railingZ },
    { x: yardSide + 0.1, z: -1.2 },
    0.25,
    0.45,
  ),
];

export const schoolModel: AttractionModel = {
  kind: "school",
  name: "School",
  fact: "Before 1870 many children in England never went to school, and lots of them worked instead. Victorian schools had one big classroom, slates to write on, and a bell that rang to call everyone in from the playground.",
  curriculumLink:
    "History, Key Stage 1: changes within living memory and beyond. How schools have changed since Victorian times.",
  footprint: 10.6,
  setting: "inland",
  signSpot: { x: 2.4, z: 9.5 },
  build: (builder) => {
    buildYard(builder);
    buildRange(builder);
    buildWing(builder, -1);
    buildWing(builder, 1);
    buildPorch(builder);
    buildBellcote(builder);
    buildRailings(builder);
    buildClimbingWall(builder);
    buildGarden(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "bell",
      pivot: bellPivot,
      build: buildBell,
      motion: bellMotion,
    },
    {
      name: "flag",
      pivot: [flagAt[0], flagAt[1] + flagHeight - 0.08, flagAt[2]],
      build: buildFlag({ field: navy, stripe: "#f2c94c", length: 1.0 }),
      motion: {
        kind: "swing",
        axis: "y",
        amplitude: 0.3,
        period: 3.1,
        phase: 1,
      },
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: -rangeWidth / 2 + 1.6, z: rangeZ },
      { x: rangeWidth / 2 - 1.6, z: rangeZ },
      1.75,
      1.2,
    ),
    ...[-1, 1].flatMap((side) =>
      listWallBlockers(
        { x: side * wingX, z: wingZ - wingLength / 2 + 1.2 },
        { x: side * wingX, z: wingFront - 1.2 },
        1.3,
        1.0,
      ),
    ),
    { x: 0, z: porchZ, radius: 1.0 },
    ...railingBlockers(),
    ...listWallBlockers(
      { x: wallAt.x - 0.05, z: wallAt.z - wallLength / 2 },
      { x: wallAt.x - 0.05, z: wallAt.z + wallLength / 2 },
      0.25,
      0.5,
    ),
    ...listWallBlockers(
      { x: gardenAt.x - 0.8, z: gardenAt.z },
      { x: gardenAt.x + 0.8, z: gardenAt.z },
      0.5,
      0.8,
    ),
    { x: flagAt[0], z: flagAt[2], radius: 0.3 },
    { x: -2.0, z: rangeFront + 1.2, radius: 0.5 },
    { x: 2.0, z: rangeFront + 1.2, radius: 0.5 },
  ],
  rides: [
    {
      id: "hopscotch",
      name: "the hopscotch",
      start: hopscotchSpots()[0],
      reach: 0.5,
      seconds: 7,
      finish: hopscotchSpots()[hopscotchSpots().length - 1],
      follow: hopscotchRide,
    },
    {
      id: "climbing-wall",
      name: "the climbing wall",
      start: { x: wallAt.x + 0.75, z: wallAt.z - wallLength / 2 - 0.2 },
      reach: 0.5,
      seconds: 8,
      finish: { x: wallAt.x + 0.75, z: wallAt.z + wallLength / 2 + 0.2 },
      follow: climbRide,
    },
  ],
};
