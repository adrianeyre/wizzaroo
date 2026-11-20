import {
  BoxGeometry,
  ExtrudeGeometry,
  OctahedronGeometry,
  Path,
  RingGeometry,
  Shape,
  Vector2,
} from "three";
import {
  addBench,
  addDoor,
  addLampPost,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
  type Wanderers,
} from "./attraction-kit.js";

const snow = "#eef3f6";
const shadowSnow = "#d9e3ea";
const ice = "#d6ebf4";
const boardWhite = "#f3f4f1";
const boardCap = "#2a5279";
const kickPlate = "#2f5f8f";
const pine = "#2d5a40";
const lightPost = "#26302c";
const bulbColours = [
  "#ffe1a0",
  "#ff7d6e",
  "#ffe1a0",
  "#8fd0ff",
  "#ffe1a0",
  "#a8ef8c",
];

/* The rink's outline: a rectangle with rounded corners */

const rink = { x: 0, z: -0.8, halfWidth: 5.2, halfDepth: 3.4, corner: 1.8 };
const iceTop = 0.08;
const boardHeight = 0.6;
const gapHalf = 0.75;
const rinkFront = rink.z + rink.halfDepth;

const isOnIce = ({ x, z }: LocalPoint, inset = 0): boolean => {
  const straightX = rink.halfWidth - rink.corner;
  const straightZ = rink.halfDepth - rink.corner;
  const overX = Math.max(0, Math.abs(x - rink.x) - straightX);
  const overZ = Math.max(0, Math.abs(z - rink.z) - straightZ);
  return Math.hypot(overX, overZ) <= rink.corner - inset;
};

const cornerCentres: [number, number, number][] = [
  [1, 1, 0],
  [1, -1, Math.PI / 2],
  [-1, -1, Math.PI],
  [-1, 1, Math.PI * 1.5],
];

/** Points round the outline, `offset` outside the ice, from the front. */
const listOutline = (offset: number, steps: number): LocalPoint[] => {
  const radius = rink.corner + offset;
  return cornerCentres.flatMap(([sideX, sideZ, from]) => {
    const centreX = rink.x + sideX * (rink.halfWidth - rink.corner);
    const centreZ = rink.z + sideZ * (rink.halfDepth - rink.corner);
    return Array.from({ length: steps + 1 }, (_, step) => {
      const angle = from + (step / steps) * (Math.PI / 2);
      return {
        x: centreX + Math.sin(angle) * radius,
        z: centreZ + Math.cos(angle) * radius,
      };
    });
  });
};

const toFlat = (points: readonly LocalPoint[]): Vector2[] =>
  points.map(({ x, z }) => new Vector2(x, -z));

const flatOutline = (
  builder: AttractionBuilder,
  finish: "paint" | "matte",
  colour: string,
  outer: number,
  depth: number,
  inner?: number,
) => {
  const steps = builder.segments(10, 4);
  const shape = new Shape(toFlat(listOutline(outer, steps)));
  if (inner !== undefined) {
    shape.holes.push(new Path(toFlat(listOutline(inner, steps))));
  }
  builder.add(
    finish,
    colour,
    new ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
    { rotation: [-Math.PI / 2, 0, 0] },
  );
};

/** The boards: the outline from one side of the gate round to the other. */
const listBoardLine = (steps: number): LocalPoint[] => [
  { x: gapHalf, z: rinkFront + 0.06 },
  ...listOutline(0.06, steps),
  { x: -gapHalf, z: rinkFront + 0.06 },
];

const boardLine = listBoardLine(6);

const alongSegment = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
  each: (length: number, middle: LocalPoint, turn: number) => void,
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  if (length < 0.01) {
    return builder;
  }
  each(
    length,
    { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 },
    Math.atan2(to.x - from.x, to.z - from.z),
  );
  return builder;
};

const buildBoards = (builder: AttractionBuilder) => {
  const line = listBoardLine(builder.segments(6, 3));
  line.slice(1).forEach((to, index) => {
    alongSegment(builder, line[index], to, (length, middle, turn) => {
      const rotation: Triple = [0, turn, 0];
      builder.box(
        "paint",
        boardWhite,
        [0.08, boardHeight, length + 0.04],
        [middle.x, boardHeight / 2, middle.z],
        rotation,
      );
      builder.box(
        "paint",
        boardCap,
        [0.16, 0.06, length + 0.08],
        [middle.x, boardHeight + 0.03, middle.z],
        rotation,
      );
      if (!builder.isFar) {
        builder.box(
          "paint",
          kickPlate,
          [0.1, 0.16, length + 0.05],
          [middle.x, iceTop + 0.08, middle.z],
          rotation,
        );
      }
    });
  });
  [gapHalf, -gapHalf].forEach((x) => {
    builder.box(
      "paint",
      boardCap,
      [0.14, boardHeight + 0.2, 0.14],
      [x, (boardHeight + 0.2) / 2, rinkFront + 0.06],
    );
    builder.sphere(
      "metal",
      palette.steel,
      0.08,
      [x, boardHeight + 0.26, rinkFront + 0.06],
      [1, 1, 1],
      10,
    );
  });
};

const buildIce = (builder: AttractionBuilder) => {
  flatOutline(builder, "matte", shadowSnow, 1.7, 0.02, 0.1);
  flatOutline(builder, "paint", ice, 0.02, iceTop);
  const markY = iceTop + 0.003;
  const lay = (colour: string, size: [number, number], at: LocalPoint) => {
    builder.box(
      "paint",
      colour,
      [size[0], 0.004, size[1]],
      [at.x, markY, at.z],
    );
  };
  lay("#c95a54", [0.09, rink.halfDepth * 2 - 0.1], { x: rink.x, z: rink.z });
  [-2.3, 2.3].forEach((x) => {
    lay("#6d93c4", [0.08, rink.halfDepth * 2 - 0.2], { x, z: rink.z });
  });
  builder.add(
    "paint",
    "#c95a54",
    new RingGeometry(0.95, 1.03, builder.segments(40, 20)),
    { at: [rink.x, markY + 0.001, rink.z], rotation: [-Math.PI / 2, 0, 0] },
  );
  builder.box(
    "paint",
    "#c95a54",
    [0.18, 0.006, 0.18],
    [rink.x, markY + 0.002, rink.z],
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.add("paint", "#6d93c4", new RingGeometry(0.62, 0.68, 28), {
        at: [rink.x + side * 3.8, markY, rink.z],
        rotation: [-Math.PI / 2, 0, 0],
      });
    });
  }
  builder.box(
    "matte",
    "#8f877c",
    [1.5, 0.03, 6.2],
    [0, 0.015, rinkFront + 3.2],
  );
};

/* Fairy lights strung on posts round the rink */

const postRadius = rink.corner + 1.05;
const lightPosts: LocalPoint[] = [
  { x: 1.25, z: rinkFront + 1.0 },
  ...cornerCentres.flatMap(([sideX, sideZ, from], index) => {
    const centreX = rink.x + sideX * (rink.halfWidth - rink.corner);
    const centreZ = rink.z + sideZ * (rink.halfDepth - rink.corner);
    const corner = {
      x: centreX + Math.sin(from + Math.PI / 4) * postRadius,
      z: centreZ + Math.cos(from + Math.PI / 4) * postRadius,
    };
    const sides: LocalPoint[] = [
      { x: rink.x + rink.halfWidth + 1.05, z: rink.z },
      { x: rink.x, z: rink.z - rink.halfDepth - 1.05 },
      { x: rink.x - rink.halfWidth - 1.05, z: rink.z },
    ];
    return index < 3 ? [corner, sides[index]] : [corner];
  }),
  { x: -1.25, z: rinkFront + 1.0 },
];
const postHeight = 2.3;

const buildFairyLights = (builder: AttractionBuilder) => {
  lightPosts.forEach(({ x, z }) => {
    builder.cylinder("paint", lightPost, {
      radius: 0.06,
      radiusEnd: 0.045,
      length: postHeight,
      at: [x, postHeight / 2, z],
      segments: 8,
    });
    builder.cylinder("paint", lightPost, {
      radius: 0.11,
      length: 0.22,
      at: [x, 0.11, z],
      segments: 6,
    });
    builder.sphere(
      "metal",
      palette.brass,
      0.07,
      [x, postHeight + 0.05, z],
      [1, 1, 1],
      6,
    );
  });
  if (builder.isFar) {
    return;
  }
  const bulb = new OctahedronGeometry(0.055, 0);
  let count = 0;
  lightPosts.forEach((from, index) => {
    const to = lightPosts[(index + 1) % lightPosts.length];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const bulbs = Math.max(4, Math.round(length / 0.38));
    const sag = 0.12 + length * 0.06;
    const pointAt = (share: number): Triple => [
      from.x + (to.x - from.x) * share,
      postHeight - 0.06 - sag * 4 * share * (1 - share),
      from.z + (to.z - from.z) * share,
    ];
    const pieces = 4;
    for (let piece = 0; piece < pieces; piece++) {
      builder.bar(
        "matte",
        "#2a2a2a",
        pointAt(piece / pieces),
        pointAt((piece + 1) / pieces),
        0.014,
        4,
      );
    }
    for (let step = 1; step < bulbs; step++) {
      const [bulbX, bulbY, bulbZ] = pointAt(step / bulbs);
      builder.add(
        "glow",
        bulbColours[count % bulbColours.length],
        bulb.clone(),
        { at: [bulbX, bulbY - 0.06, bulbZ], scale: [1, 1.35, 1] },
        undefined,
      );
      count++;
    }
  });
  bulb.dispose();
};

/* The skate-hire hut and the hot-chocolate stall */

const hutWidth = 2.4;
const hutDepth = 1.7;
const hutWall = 1.6;
const plinth = 0.12;

interface Chalet {
  at: LocalPoint;
  wall: string;
  trim: string;
  roof: string;
  doorSide: 1 | -1;
}

const skateHut: Chalet = {
  at: { x: -6.1, z: 5.0 },
  wall: "#8a4a2e",
  trim: "#efe4c8",
  roof: "#3d4a52",
  doorSide: 1,
};
const cocoaStall: Chalet = {
  at: { x: 6.1, z: 5.0 },
  wall: "#3f6b4f",
  trim: "#efe4c8",
  roof: "#5a3a2a",
  doorSide: -1,
};

const buildChalet = (builder: AttractionBuilder, chalet: Chalet) => {
  const { x, z } = chalet.at;
  const front = z + hutDepth / 2;
  const eaves = plinth + hutWall;
  builder.box(
    "matte",
    palette.darkStone,
    [hutWidth + 0.12, plinth, hutDepth + 0.12],
    [x, plinth / 2, z],
  );
  const planks = builder.isFar ? 1 : 11;
  builder.painted(
    new BoxGeometry(hutWidth, hutWall, hutDepth, 1, planks, 1),
    (centre) =>
      Math.floor((centre.y - plinth) / (hutWall / planks)) % 2 === 0
        ? chalet.wall
        : shade(chalet.wall, 0.9),
    { at: [x, plinth + hutWall / 2, z] },
    "matte",
    undefined,
  );
  const rise = 0.8;
  const gable = new Shape([
    new Vector2(-hutWidth / 2, 0),
    new Vector2(hutWidth / 2, 0),
    new Vector2(0, rise),
  ]);
  builder.add(
    "matte",
    shade(chalet.wall, 0.86),
    new ExtrudeGeometry(gable, { depth: hutDepth, bevelEnabled: false }),
    { at: [x, eaves, z - hutDepth / 2] },
  );
  const overhang = 0.32;
  const halfSpan = hutWidth / 2 + overhang;
  const slope = Math.hypot(halfSpan, rise + overhang * (rise / (hutWidth / 2)));
  const angle = Math.atan2(rise, hutWidth / 2);
  [1, -1].forEach((side) => {
    const slabX = x + (side * halfSpan) / 2;
    const slabY = eaves + rise / 2 + 0.04;
    builder.box(
      "matte",
      chalet.roof,
      [slope, 0.1, hutDepth + overhang * 2],
      [slabX, slabY, z],
      [0, 0, -side * angle],
    );
    builder.box(
      "matte",
      snow,
      [slope - 0.08, 0.09, hutDepth + overhang * 2 - 0.08],
      [slabX + side * 0.04 * Math.sin(angle), slabY + 0.09, z],
      [0, 0, -side * angle],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        chalet.trim,
        [slope, 0.14, 0.05],
        [slabX, slabY - 0.06, front + overhang - 0.02],
        [0, 0, -side * angle],
      );
    }
  });
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        chalet.trim,
        [0.1, hutWall, 0.1],
        [
          x + sideX * (hutWidth / 2),
          plinth + hutWall / 2,
          z + sideZ * (hutDepth / 2),
        ],
      );
    });
  });
  const hatchY = plinth + 1.0;
  builder.box("glow", "#e9b56c", [1.5, 0.62, 0.02], [x, hatchY, front + 0.01]);
  builder.box(
    "paint",
    chalet.trim,
    [1.68, 0.07, 0.38],
    [x, hatchY - 0.34, front + 0.14],
  );
  builder.box(
    "paint",
    chalet.trim,
    [1.64, 0.06, 0.06],
    [x, hatchY + 0.34, front + 0.03],
  );
  [-0.79, 0.79].forEach((side) => {
    builder.box(
      "paint",
      chalet.trim,
      [0.06, 0.7, 0.06],
      [x + side, hatchY, front + 0.03],
    );
  });
  builder.box(
    "paint",
    chalet.trim,
    [1.3, 0.3, 0.05],
    [x, eaves + 0.27, front + 0.03],
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      chalet.wall,
      [1.12, 0.05, 0.02],
      [x, eaves + 0.3, front + 0.06],
    );
    builder.box(
      "paint",
      shade(chalet.wall, 0.7),
      [0.8, 0.04, 0.02],
      [x, eaves + 0.2, front + 0.06],
    );
    [-0.95, 0.95].forEach((side) => {
      builder.box(
        "glow",
        palette.warmLight,
        [0.1, 0.14, 0.1],
        [x + side, hatchY + 0.42, front + 0.1],
      );
      builder.box(
        "paint",
        palette.black,
        [0.14, 0.03, 0.14],
        [x + side, hatchY + 0.51, front + 0.1],
      );
    });
  }
  addDoor(builder, {
    at: [x + chalet.doorSide * (hutWidth / 2 + 0.005), plinth, z - 0.15],
    colour: shade(chalet.wall, 0.75),
    frame: chalet.trim,
    turn: (chalet.doorSide * Math.PI) / 2,
  });
};

const buildSkateHire = (builder: AttractionBuilder) => {
  buildChalet(builder, skateHut);
  const { x, z } = skateHut.at;
  const front = z + hutDepth / 2;
  builder.box(
    "matte",
    palette.darkTimber,
    [1.1, 0.26, 0.04],
    [x - 0.05, plinth + 1.98, front + 0.07],
  );
  builder.box(
    "metal",
    palette.steel,
    [0.6, 0.04, 0.05],
    [x - 0.05, plinth + 1.86, front + 0.08],
  );
  builder.box(
    "paint",
    boardWhite,
    [0.36, 0.16, 0.06],
    [x - 0.05, plinth + 1.97, front + 0.1],
  );
  const chimneyX = x - 0.55;
  builder.box(
    "matte",
    palette.brick,
    [0.26, 0.7, 0.26],
    [chimneyX, plinth + hutWall + 0.75, z - 0.3],
  );
  builder.box(
    "matte",
    snow,
    [0.32, 0.06, 0.32],
    [chimneyX, plinth + hutWall + 1.12, z - 0.3],
  );
  if (builder.isFar) {
    return;
  }
  [-0.5, -0.1, 0.3, 0.62].forEach((along, index) => {
    const bootColour = index % 2 === 0 ? boardWhite : "#2a2c30";
    [-0.06, 0.06].forEach((side) => {
      const bootX = x + along + side;
      builder.box(
        "matte",
        bootColour,
        [0.09, 0.14, 0.18],
        [bootX, plinth + 0.75, front + 0.12],
      );
      builder.box(
        "metal",
        palette.steel,
        [0.02, 0.03, 0.24],
        [bootX, plinth + 0.67, front + 0.12],
      );
    });
  });
  [-0.45, 0, 0.45].forEach((along) => {
    builder.box(
      "matte",
      "#3a2a22",
      [0.24, 0.12, 0.02],
      [x + along, plinth + 1.12, front + 0.025],
    );
  });
};

const urnAt: Triple = [
  cocoaStall.at.x + 0.45,
  plinth + 0.95,
  cocoaStall.at.z + hutDepth / 2 + 0.16,
];

const buildCocoaStall = (builder: AttractionBuilder) => {
  buildChalet(builder, cocoaStall);
  const { x, z } = cocoaStall.at;
  const front = z + hutDepth / 2;
  const stripes = builder.isFar ? 1 : 10;
  builder.painted(
    new BoxGeometry(1.9, 0.04, 0.7, stripes, 1, 1),
    (centre) =>
      Math.floor((centre.x - x + 0.95) / (1.9 / stripes)) % 2 === 0
        ? "#b8333a"
        : palette.cream,
    {
      at: [x, plinth + 1.5, front + 0.32],
      rotation: [0.38, 0, 0],
    },
    "matte",
    undefined,
  );
  builder.box(
    "paint",
    "#b8333a",
    [1.9, 0.12, 0.02],
    [x, plinth + 1.33, front + 0.66],
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.13,
    length: 0.36,
    at: urnAt,
    segments: 12,
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.14,
    radiusEnd: 0.06,
    length: 0.06,
    at: [urnAt[0], urnAt[1] + 0.21, urnAt[2]],
    segments: 12,
  });
  if (builder.isFar) {
    return;
  }
  [-0.6, -0.42, -0.24, -0.06].forEach((along, index) => {
    builder.cylinder("paint", index % 2 === 0 ? "#c0392b" : palette.cream, {
      radius: 0.05,
      radiusEnd: 0.055,
      length: 0.11,
      at: [x + along, plinth + 0.83, front + 0.16],
      segments: 8,
    });
    builder.cylinder("matte", "#5a3320", {
      radius: 0.045,
      length: 0.01,
      at: [x + along, plinth + 0.885, front + 0.16],
      segments: 8,
    });
  });
  const boardAt = { x: x - 1.55, y: 0.36, z: front + 0.9 };
  const tilt = 0.3;
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.46, 0.74, 0.03],
      [boardAt.x, boardAt.y, boardAt.z + side * 0.11],
      [-side * tilt, 0, 0],
    );
  });
  const onBoard = (up: number, out: number): Triple => [
    boardAt.x,
    boardAt.y + up * Math.cos(tilt) + out * Math.sin(tilt),
    boardAt.z + 0.11 - up * Math.sin(tilt) + out * Math.cos(tilt),
  ];
  builder.box("matte", "#26302c", [0.38, 0.6, 0.01], onBoard(0, 0.02), [
    -tilt,
    0,
    0,
  ]);
  [0.16, 0.06, -0.04, -0.14].forEach((up, index) => {
    builder.box(
      "matte",
      palette.cream,
      [0.26 - (index % 2) * 0.08, 0.025, 0.01],
      onBoard(up, 0.028),
      [-tilt, 0, 0],
    );
  });
};

/* Snowy pines, a snowman and the park round the rink */

const pines: [number, number, number][] = [
  [-7.9, -3.0, 1.05],
  [-5.4, -6.7, 1.3],
  [-1.6, -7.9, 0.95],
  [2.6, -7.6, 1.15],
  [6.2, -6.2, 1.25],
  [8.3, -2.2, 0.95],
  [-8.6, 1.4, 0.85],
];

const addPine = (
  builder: AttractionBuilder,
  [x, z, size]: [number, number, number],
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.12 * size,
    radiusEnd: 0.08 * size,
    length: 0.7 * size,
    at: [x, 0.35 * size, z],
    segments: 7,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (1.0 - share * 0.55) * size;
    const height = (1.35 - share * 0.25) * size;
    const base = (0.5 + share * 1.75) * size;
    builder.cylinder("matte", tier % 2 === 0 ? pine : shade(pine, 1.1), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, base + height / 2, z],
      segments: 9,
    });
    const capLength = height * 0.48;
    builder.cylinder("matte", snow, {
      radius: radius * 0.52 * 1.05,
      radiusEnd: 0.03,
      length: capLength,
      at: [x, base + height - capLength / 2 + 0.03, z],
      segments: 9,
    });
  }
  builder.sphere(
    "matte",
    snow,
    0.75 * size,
    [x, 0.02, z],
    [1, 0.18, 1],
    builder.isFar ? 6 : 9,
  );
};

const snowmanAt = { x: 3.4, z: 7.9 };

const buildSnowman = (builder: AttractionBuilder) => {
  const { x, z } = snowmanAt;
  builder.sphere("matte", "#f7fafc", 0.42, [x, 0.36, z], [1, 0.92, 1], 11);
  builder.sphere("matte", "#f7fafc", 0.3, [x, 0.92, z], [1, 1, 1], 10);
  builder.sphere("matte", "#f7fafc", 0.21, [x, 1.34, z], [1, 1, 1], 9);
  builder.cylinder("matte", "#1f2023", {
    radius: 0.16,
    length: 0.03,
    at: [x, 1.5, z],
    segments: 12,
  });
  builder.cylinder("matte", "#1f2023", {
    radius: 0.11,
    length: 0.22,
    at: [x, 1.62, z],
    segments: 12,
  });
  builder.torus("matte", "#b8333a", 0.2, 0.045, [x, 1.17, z], "y", 10);
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", "#e8792b", {
    radius: 0.035,
    radiusEnd: 0.002,
    length: 0.2,
    at: [x, 1.33, z + 0.28],
    axis: "z",
    segments: 8,
  });
  [-0.07, 0.07].forEach((side) => {
    builder.sphere(
      "matte",
      "#1f2023",
      0.025,
      [x + side, 1.41, z + 0.18],
      [1, 1, 1],
      6,
    );
  });
  [0.98, 0.82, 0.64].forEach((up) => {
    builder.sphere("matte", "#1f2023", 0.03, [x, up, z + 0.3], [1, 1, 1], 6);
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + side * 0.26, 0.98, z],
      [x + side * 0.62, 1.22, z + 0.05],
      0.03,
      5,
    );
  });
  builder.box("matte", "#b8333a", [0.09, 0.3, 0.03], [x + 0.1, 1.02, z + 0.25]);
};

const buildPark = (builder: AttractionBuilder) => {
  buildIce(builder);
  buildBoards(builder);
  buildFairyLights(builder);
  buildSkateHire(builder);
  buildCocoaStall(builder);
  pines.forEach((tree) => {
    addPine(builder, tree);
  });
  buildSnowman(builder);
  addBench(builder, [-2.6, 0, rinkFront + 1.9], Math.PI);
  addBench(builder, [2.6, 0, rinkFront + 1.9], Math.PI);
  addLampPost(builder, [-1.15, 0, rinkFront + 5.6]);
  addLampPost(builder, [1.15, 0, rinkFront + 5.6]);
  if (!builder.isFar) {
    [
      [-3.9, 8.2, 0.5],
      [5.0, 3.0, 0.35],
      [-4.2, 3.4, 0.4],
      [8.0, 2.8, 0.45],
    ].forEach(([x, z, size]) => {
      builder.sphere("matte", snow, size, [x, 0, z], [1.5, 0.45, 1], 10);
    });
  }
  addSignBoard(builder, [-1.95, 0, rinkFront + 5.9], boardCap);
};

/* Skaters gliding round the ice */

const buildSkater =
  (coat: string, hat: string) =>
  (builder: AttractionBuilder): void => {
    [-0.07, 0.07].forEach((side) => {
      builder.box(
        "metal",
        palette.steel,
        [0.02, 0.03, 0.24],
        [side, 0.015, 0.02],
      );
      builder.box("matte", boardWhite, [0.08, 0.12, 0.17], [side, 0.09, 0.02]);
      builder.cylinder("matte", "#2b3442", {
        radius: 0.045,
        length: 0.3,
        at: [side, 0.3, 0],
        segments: 6,
      });
    });
    builder.lathe(
      "matte",
      coat,
      [
        [0, 0.4],
        [0.13, 0.42],
        [0.14, 0.56],
        [0.12, 0.68],
        [0.06, 0.74],
        [0, 0.74],
      ],
      [0, 0, 0],
      "y",
      8,
    );
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        coat,
        [side * 0.11, 0.68, 0],
        [side * 0.36, 0.56, -0.02],
        0.06,
        5,
      );
      builder.sphere(
        "matte",
        hat,
        0.035,
        [side * 0.37, 0.555, -0.02],
        [1, 1, 1],
        6,
      );
    });
    builder.torus("matte", hat, 0.07, 0.03, [0, 0.75, 0], "y", 8);
    builder.sphere("matte", "#f0c8a8", 0.1, [0, 0.85, 0], [1, 1, 1], 9);
    builder.lathe(
      "matte",
      hat,
      [
        [0, 0.97],
        [0.07, 0.95],
        [0.105, 0.88],
        [0.108, 0.86],
      ],
      [0, 0, 0],
      "y",
      8,
    );
    builder.sphere("matte", palette.cream, 0.04, [0, 0.99, 0], [1, 1, 1], 6);
  };

const skaters: Wanderers[] = [
  {
    name: "skaters",
    build: buildSkater("#b8333a", "#efe4c8"),
    count: 2,
    centre: { x: rink.x - 2.4, z: rink.z },
    radius: 1.9,
    speed: 1.3,
    height: iceTop,
  },
  {
    name: "ice skaters",
    build: buildSkater("#2f5f8f", "#e2b33a"),
    count: 2,
    centre: { x: rink.x + 2.4, z: rink.z },
    radius: 1.9,
    speed: 1.2,
    height: iceTop,
  },
];

/* Blockers */

const chaletBlockers = ({ at }: Chalet): LocalBlocker[] =>
  [-0.6, 0.6].map((side) => ({ x: at.x + side, z: at.z, radius: 0.98 }));

const boardBlockers: LocalBlocker[] = boardLine
  .slice(1)
  .flatMap((to, index) => listWallBlockers(boardLine[index], to, 0.22, 0.3));

export const iceRinkModel: AttractionModel = {
  kind: "ice-rink",
  name: "Ice Rink",
  fact: "When water cools to 0 degrees Celsius it freezes into solid ice, and when it warms up again it melts back into liquid water. Ice is a little lighter than water, so ponds freeze from the top down.",
  curriculumLink:
    "Science, Year 4: states of matter. Water freezes at 0 °C and melts back into a liquid when it warms.",
  footprint: 10.5,
  setting: "inland",
  padColour: snow,
  signSpot: { x: -1.95, z: rinkFront + 6.9 },
  build: buildPark,
  wanderers: skaters,
  smoke: [
    {
      at: [urnAt[0], urnAt[1] + 0.3, urnAt[2]],
      colour: "#f6f6f6",
      puffs: 5,
      size: 0.09,
      rise: 0.7,
      spread: 0.12,
    },
    {
      at: [skateHut.at.x - 0.55, plinth + hutWall + 1.2, skateHut.at.z - 0.3],
      colour: "#d8dcdf",
      puffs: 6,
      size: 0.14,
      rise: 1.6,
      spread: 0.35,
    },
  ],
  blockers: [
    ...boardBlockers,
    ...chaletBlockers(skateHut),
    ...chaletBlockers(cocoaStall),
    ...lightPosts.map(({ x, z }) => ({ x, z, radius: 0.16 })),
    ...pines.map(([x, z, size]) => ({ x, z, radius: 0.55 * size })),
    { x: snowmanAt.x, z: snowmanAt.z, radius: 0.45 },
  ],
  decks: [
    (point) => (isOnIce(point) ? { height: iceTop, kind: "ice" } : undefined),
  ],
};
