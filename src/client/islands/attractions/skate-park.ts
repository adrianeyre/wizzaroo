import { CylinderGeometry, ExtrudeGeometry, Shape, Vector2 } from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  addTree,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "./attraction-kit.js";

const slabConcrete = "#a8a49c";
const rampConcrete = "#bdb9b0";
const sideConcrete = "#8f8b83";
const coping = "#c9ced3";
const wallBlock = "#9d978c";
const railBlue = "#2c5d8a";
const graffiti = ["#e0457b", "#2fb3a6", "#f2b51d", "#ef7d32", "#7a5cd6"];
const outline = "#24262a";

const slabTop = 0.06;
const slab = { minX: -7.8, maxX: 7.8, minZ: -6.2, maxZ: 5.6 };

/* The half-pipe: a U across x */

const pipeCentre = -3.85;
const pipeFlat = 0.5;
const pipeRampLength = 2.6;
const pipeHeight = 1.2;
const pipePlatform = 0.75;
const pipeFrontZ = 0.2;
const pipeBackZ = -5.8;
const pipeLip = pipeFlat + pipeRampLength;
const pipeOuter = pipeLip + pipePlatform;

const findPipeLift = (x: number): number => {
  const out = Math.abs(x - pipeCentre);
  if (out <= pipeFlat) {
    return 0;
  }
  if (out <= pipeLip) {
    return pipeHeight * ((out - pipeFlat) / pipeRampLength) ** 2;
  }
  return pipeHeight;
};

/* The quarter pipes */

const backPipe = {
  minX: 0.4,
  maxX: slab.maxX,
  lipZ: -5.4,
  footZ: -3.2,
  height: 1.0,
};
const sidePipe = {
  minZ: -3.2,
  maxZ: 3.4,
  lipX: 7.0,
  footX: 5.0,
  height: 0.9,
};

const findQuarterLift = (
  distanceFromFoot: number,
  rampLength: number,
  height: number,
): number => {
  if (distanceFromFoot <= 0) {
    return 0;
  }
  if (distanceFromFoot >= rampLength) {
    return height;
  }
  return height * (distanceFromFoot / rampLength) ** 2;
};

/* The funbox */

const funbox = { x: 2.6, z: 0.6, top: 0.7, slope: 1.0, height: 0.45 };

const findFunboxLift = (x: number, z: number): number => {
  const out = Math.max(Math.abs(x - funbox.x), Math.abs(z - funbox.z));
  const share = (funbox.top + funbox.slope - out) / funbox.slope;
  return funbox.height * Math.min(1, Math.max(0, share));
};

/* The ledges */

interface Ledge {
  x: number;
  z: number;
  length: number;
  height: number;
}

const ledges: Ledge[] = [
  { x: -5.2, z: 3.9, length: 2.6, height: 0.34 },
  { x: 4.6, z: 4.4, length: 2.4, height: 0.3 },
];
const ledgeDepth = 0.6;

const findLift = (x: number, z: number): number => {
  let lift = 0;
  if (
    z >= pipeBackZ &&
    z <= pipeFrontZ &&
    Math.abs(x - pipeCentre) <= pipeOuter
  ) {
    lift = Math.max(lift, findPipeLift(x));
  }
  if (x >= backPipe.minX && x <= backPipe.maxX && z <= backPipe.footZ) {
    lift = Math.max(
      lift,
      findQuarterLift(
        backPipe.footZ - z,
        backPipe.footZ - backPipe.lipZ,
        backPipe.height,
      ),
    );
  }
  if (z >= sidePipe.minZ && z <= sidePipe.maxZ && x >= sidePipe.footX) {
    lift = Math.max(
      lift,
      findQuarterLift(
        x - sidePipe.footX,
        sidePipe.lipX - sidePipe.footX,
        sidePipe.height,
      ),
    );
  }
  lift = Math.max(lift, findFunboxLift(x, z));
  ledges.forEach((ledge) => {
    if (
      Math.abs(x - ledge.x) <= ledge.length / 2 &&
      Math.abs(z - ledge.z) <= ledgeDepth / 2
    ) {
      lift = Math.max(lift, ledge.height);
    }
  });
  return lift;
};

const skateDeck: Deck = ({ x, z }) =>
  x >= slab.minX && x <= slab.maxX && z >= slab.minZ && z <= slab.maxZ
    ? { height: slabTop + findLift(x, z), kind: "trail" }
    : undefined;

/* Shapes */

const listProfile = (
  lift: (along: number) => number,
  from: number,
  to: number,
  steps: number,
): Vector2[] =>
  Array.from({ length: steps + 1 }, (_, step) => {
    const along = from + ((to - from) * step) / steps;
    return new Vector2(along, slabTop + lift(along));
  });

/**
 * Extrudes a ramp's profile, drawn as (across, height), from `from` to
 * `to` along z, or along x when `isAlongX`, painting the riding
 * surface light and the ends darker.
 */
const addRampBody = (
  builder: AttractionBuilder,
  top: Vector2[],
  from: number,
  to: number,
  isAlongX = false,
) => {
  const first = top[0];
  const last = top[top.length - 1];
  const shape = new Shape([
    new Vector2(first.x, 0),
    ...top,
    new Vector2(last.x, 0),
  ]);
  const geometry = new ExtrudeGeometry(shape, {
    depth: to - from,
    bevelEnabled: false,
    curveSegments: 1,
  });
  if (isAlongX) {
    geometry.rotateY(-Math.PI / 2);
    geometry.translate(to, 0, 0);
  } else {
    geometry.translate(0, 0, from);
  }
  builder.painted(
    geometry,
    (centre, normal) => {
      if (normal.y > 0.25) {
        return { colour: rampConcrete, finish: "matte" };
      }
      const isEnd = isAlongX
        ? Math.abs(normal.x) > 0.9
        : Math.abs(normal.z) > 0.9;
      return {
        colour: isEnd ? sideConcrete : shade(sideConcrete, 0.92),
        finish: "matte",
      };
    },
    {},
    "matte",
    (30 * Math.PI) / 180,
  );
};

const addCoping = (builder: AttractionBuilder, from: Triple, to: Triple) => {
  builder.bar("metal", coping, from, to, 0.09, 10);
};

const addTag = (
  builder: AttractionBuilder,
  at: Triple,
  size: [number, number],
  turn: number,
  seed: number,
) => {
  const out = (distance: number, dx: number, dy: number): Triple => [
    at[0] + Math.sin(turn) * distance + Math.cos(turn) * dx,
    at[1] + dy,
    at[2] + Math.cos(turn) * distance - Math.sin(turn) * dx,
  ];
  const [width, height] = size;
  const blob = (
    colour: string,
    distance: number,
    dx: number,
    dy: number,
    scale: [number, number],
  ) => {
    builder.add(
      "paint",
      colour,
      new CylinderGeometry(0.5, 0.5, 0.02, builder.segments(14, 6)).rotateX(
        Math.PI / 2,
      ),
      {
        at: out(distance, dx, dy),
        rotation: [0, turn, 0],
        scale: [...scale, 1],
      },
    );
  };
  blob(outline, 0.01, 0, 0, [width * 1.04, height * 1.08]);
  blob(graffiti[seed % graffiti.length], 0.02, 0, 0, [width, height]);
  if (builder.isFar) {
    return;
  }
  const bubbles = 3;
  for (let bubble = 0; bubble < bubbles; bubble++) {
    const share = (bubble + 0.5) / bubbles - 0.5;
    const lift = (bubble % 2 === 0 ? 0.06 : -0.05) * height;
    const colour = graffiti[(seed + bubble + 1) % graffiti.length];
    blob(outline, 0.03, share * width * 0.6, lift, [
      width * 0.34,
      height * 0.66,
    ]);
    blob(
      bubble === 1 ? palette.white : colour,
      0.04,
      share * width * 0.6,
      lift,
      [width * 0.3, height * 0.6],
    );
  }
};

/* Building it */

const buildSlab = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    slabConcrete,
    [slab.maxX - slab.minX, slabTop, slab.maxZ - slab.minZ],
    [(slab.minX + slab.maxX) / 2, slabTop / 2, (slab.minZ + slab.maxZ) / 2],
  );
  if (!builder.isFar) {
    for (let joint = 1; joint < 6; joint++) {
      const z = slab.minZ + ((slab.maxZ - slab.minZ) * joint) / 6;
      builder.box(
        "matte",
        shade(slabConcrete, 0.85),
        [slab.maxX - slab.minX - 0.02, 0.004, 0.025],
        [(slab.minX + slab.maxX) / 2, slabTop + 0.002, z],
      );
    }
    for (let joint = 1; joint < 8; joint++) {
      const x = slab.minX + ((slab.maxX - slab.minX) * joint) / 8;
      builder.box(
        "matte",
        shade(slabConcrete, 0.85),
        [0.025, 0.004, slab.maxZ - slab.minZ - 0.02],
        [x, slabTop + 0.002, (slab.minZ + slab.maxZ) / 2],
      );
    }
  }
};

const buildHalfPipe = (builder: AttractionBuilder) => {
  const steps = builder.segments(16, 6);
  const top = [
    new Vector2(pipeCentre - pipeOuter, slabTop + pipeHeight),
    ...listProfile(
      findPipeLift,
      pipeCentre - pipeLip,
      pipeCentre - pipeFlat,
      steps,
    ),
    ...listProfile(
      findPipeLift,
      pipeCentre + pipeFlat,
      pipeCentre + pipeLip,
      steps,
    ),
    new Vector2(pipeCentre + pipeOuter, slabTop + pipeHeight),
  ];
  addRampBody(builder, top, pipeBackZ, pipeFrontZ);
  [-1, 1].forEach((side) => {
    const x = pipeCentre + side * pipeLip;
    addCoping(
      builder,
      [x, slabTop + pipeHeight + 0.02, pipeBackZ],
      [x, slabTop + pipeHeight + 0.02, pipeFrontZ],
    );
  });
  [-1, 1].forEach((side) => {
    const x = pipeCentre + side * (pipeOuter - 0.05);
    if (builder.isFar) {
      return;
    }
    [pipeBackZ + 0.05, pipeFrontZ - 0.05].forEach((z, index) => {
      if (side < 0 && index === 0) {
        return;
      }
      builder.bar(
        "metal",
        palette.darkSteel,
        [x, slabTop + pipeHeight, z],
        [x, slabTop + pipeHeight + 0.75, z],
        0.05,
        6,
      );
    });
    builder.bar(
      "metal",
      palette.darkSteel,
      [x, slabTop + pipeHeight + 0.75, pipeBackZ + 0.05],
      [x, slabTop + pipeHeight + 0.75, pipeFrontZ - 0.05],
      0.05,
      6,
    );
  });
  addTag(
    builder,
    [pipeCentre + pipeOuter, 0.6, -2.6],
    [2.4, 0.8],
    Math.PI / 2,
    0,
  );
  addTag(
    builder,
    [pipeCentre + pipeOuter, 0.62, -4.8],
    [1.5, 0.7],
    Math.PI / 2,
    2,
  );
  addTag(
    builder,
    [pipeCentre - pipeLip - 0.35, 0.68, pipeFrontZ],
    [0.6, 0.85],
    0,
    1,
  );
  addTag(
    builder,
    [pipeCentre + pipeLip + 0.35, 0.66, pipeFrontZ],
    [0.6, 0.8],
    0,
    3,
  );
};

const buildQuarterPipes = (builder: AttractionBuilder) => {
  const steps = builder.segments(12, 5);
  const backRamp = backPipe.footZ - backPipe.lipZ;
  const backTop = [
    new Vector2(slab.minZ, slabTop + backPipe.height),
    ...listProfile(
      (z) => findQuarterLift(backPipe.footZ - z, backRamp, backPipe.height),
      backPipe.lipZ,
      backPipe.footZ,
      steps,
    ),
  ];
  addRampBody(builder, backTop, backPipe.minX, backPipe.maxX, true);
  addCoping(
    builder,
    [backPipe.minX, slabTop + backPipe.height + 0.02, backPipe.lipZ],
    [backPipe.maxX, slabTop + backPipe.height + 0.02, backPipe.lipZ],
  );
  const sideRamp = sidePipe.lipX - sidePipe.footX;
  const sideTop = [
    ...listProfile(
      (x) => findQuarterLift(x - sidePipe.footX, sideRamp, sidePipe.height),
      sidePipe.footX,
      sidePipe.lipX,
      steps,
    ),
    new Vector2(slab.maxX, slabTop + sidePipe.height),
  ];
  addRampBody(builder, sideTop, sidePipe.minZ, sidePipe.maxZ);
  addCoping(
    builder,
    [sidePipe.lipX, slabTop + sidePipe.height + 0.02, sidePipe.minZ],
    [sidePipe.lipX, slabTop + sidePipe.height + 0.02, sidePipe.maxZ],
  );
  addTag(builder, [6.4, 0.4, sidePipe.maxZ], [1.6, 0.55], 0, 4);
  addTag(builder, [backPipe.minX, 0.5, -5.0], [1.2, 0.7], -Math.PI / 2, 1);
};

const buildFunbox = (builder: AttractionBuilder) => {
  const corner = Math.SQRT2;
  builder.add(
    "matte",
    rampConcrete,
    new CylinderGeometry(
      funbox.top * corner,
      (funbox.top + funbox.slope) * corner,
      funbox.height,
      4,
      1,
    ),
    {
      at: [funbox.x, slabTop + funbox.height / 2, funbox.z],
      rotation: [0, Math.PI / 4, 0],
    },
    undefined,
  );
  [-1, 1].forEach((side) => {
    addCoping(
      builder,
      [
        funbox.x - funbox.top,
        slabTop + funbox.height + 0.01,
        funbox.z + side * funbox.top,
      ],
      [
        funbox.x + funbox.top,
        slabTop + funbox.height + 0.01,
        funbox.z + side * funbox.top,
      ],
    );
  });
  const railFrom: Triple = [
    funbox.x - funbox.top - funbox.slope - 0.3,
    0,
    funbox.z,
  ];
  const railTo: Triple = [
    funbox.x + funbox.top + funbox.slope + 0.3,
    0,
    funbox.z,
  ];
  const railLift = (x: number) => slabTop + findFunboxLift(x, funbox.z) + 0.34;
  const stops = [
    railFrom[0],
    funbox.x - funbox.top,
    funbox.x + funbox.top,
    railTo[0],
  ];
  stops.slice(0, -1).forEach((x, index) => {
    const nextX = stops[index + 1];
    builder.bar(
      "metal",
      railBlue,
      [x, railLift(x), funbox.z],
      [nextX, railLift(nextX), funbox.z],
      0.07,
      10,
    );
  });
  stops.forEach((x) => {
    const base = slabTop + findFunboxLift(x, funbox.z);
    builder.bar(
      "metal",
      railBlue,
      [x, base, funbox.z],
      [x, railLift(x), funbox.z],
      0.06,
      8,
    );
    builder.box(
      "metal",
      palette.darkSteel,
      [0.16, 0.02, 0.16],
      [x, base + 0.01, funbox.z],
    );
  });
};

const buildLedges = (builder: AttractionBuilder) => {
  ledges.forEach((ledge, index) => {
    builder.roundedBox(
      "matte",
      shade(rampConcrete, 0.96),
      [ledge.length, ledge.height, ledgeDepth],
      0.02,
      [ledge.x, slabTop + ledge.height / 2, ledge.z],
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "metal",
        coping,
        [ledge.length + 0.01, 0.04, 0.04],
        [
          ledge.x,
          slabTop + ledge.height - 0.015,
          ledge.z + (side * ledgeDepth) / 2,
        ],
      );
    });
    addTag(
      builder,
      [ledge.x, slabTop + ledge.height / 2, ledge.z + ledgeDepth / 2],
      [ledge.length * 0.6, ledge.height * 0.7],
      0,
      index + 2,
    );
  });
  const flatRail = { x: -1.6, z: 3.0, length: 2.8 };
  builder.bar(
    "metal",
    railBlue,
    [flatRail.x, slabTop + 0.32, flatRail.z - flatRail.length / 2],
    [flatRail.x, slabTop + 0.32, flatRail.z + flatRail.length / 2],
    0.07,
    10,
  );
  [-1, 1].forEach((end) => {
    const z = flatRail.z + end * (flatRail.length / 2 - 0.15);
    builder.bar(
      "metal",
      railBlue,
      [flatRail.x, slabTop, z],
      [flatRail.x, slabTop + 0.32, z],
      0.06,
      8,
    );
    builder.box(
      "metal",
      palette.darkSteel,
      [0.16, 0.02, 0.16],
      [flatRail.x, slabTop + 0.01, z],
    );
  });
};

const entranceHalf = 1.3;
const wallInset = 0.12;
const wallHeight = 0.5;

const wallRuns: [{ x: number; z: number }, { x: number; z: number }][] = [
  [
    { x: slab.minX - wallInset, z: slab.maxZ + wallInset },
    { x: -entranceHalf, z: slab.maxZ + wallInset },
  ],
  [
    { x: entranceHalf, z: slab.maxZ + wallInset },
    { x: slab.maxX + wallInset, z: slab.maxZ + wallInset },
  ],
  [
    { x: slab.maxX + wallInset, z: slab.maxZ + wallInset },
    { x: slab.maxX + wallInset, z: slab.minZ - wallInset },
  ],
  [
    { x: slab.maxX + wallInset, z: slab.minZ - wallInset },
    { x: slab.minX - wallInset, z: slab.minZ - wallInset },
  ],
  [
    { x: slab.minX - wallInset, z: slab.minZ - wallInset },
    { x: slab.minX - wallInset, z: slab.maxZ + wallInset },
  ],
];

const buildWalls = (builder: AttractionBuilder) => {
  wallRuns.forEach(([from, to]) => {
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const turn = Math.atan2(to.x - from.x, to.z - from.z);
    const middle: Triple = [(from.x + to.x) / 2, 0, (from.z + to.z) / 2];
    builder.box(
      "matte",
      wallBlock,
      [0.24, wallHeight, length + 0.24],
      [middle[0], wallHeight / 2, middle[2]],
      [0, turn, 0],
    );
    builder.box(
      "matte",
      shade(wallBlock, 1.1),
      [0.3, 0.05, length + 0.3],
      [middle[0], wallHeight + 0.025, middle[2]],
      [0, turn, 0],
    );
    if (builder.isFar) {
      return;
    }
    const posts = Math.max(1, Math.round(length / 1.6));
    for (let post = 0; post <= posts; post++) {
      const share = post / posts;
      const x = from.x + (to.x - from.x) * share;
      const z = from.z + (to.z - from.z) * share;
      builder.bar(
        "metal",
        palette.darkSteel,
        [x, wallHeight, z],
        [x, wallHeight + 0.75, z],
        0.05,
        6,
      );
    }
    builder.bar(
      "metal",
      palette.darkSteel,
      [from.x, wallHeight + 0.75, from.z],
      [to.x, wallHeight + 0.75, to.z],
      0.045,
      6,
    );
    builder.bar(
      "metal",
      palette.darkSteel,
      [from.x, wallHeight + 0.4, from.z],
      [to.x, wallHeight + 0.4, to.z],
      0.03,
      4,
    );
  });
  addTag(
    builder,
    [-4.2, 0.26, slab.maxZ + wallInset + 0.12],
    [2.4, 0.36],
    0,
    0,
  );
  addTag(builder, [4.6, 0.26, slab.maxZ + wallInset + 0.12], [2.0, 0.36], 0, 3);
};

const buildSurrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    palette.paving,
    [2.6, 0.04, 3.2],
    [0, 0.02, slab.maxZ + 1.7],
  );
  addBench(builder, [-2.6, 0, slab.maxZ + 1.15], 0);
  addBench(builder, [2.6, 0, slab.maxZ + 1.15], 0);
  builder.cylinder("paint", "#2b5a2f", {
    radius: 0.22,
    radiusEnd: 0.2,
    length: 0.7,
    at: [1.7, 0.35, slab.maxZ + 1.0],
    segments: 12,
  });
  [
    { x: slab.minX - 0.9, z: slab.minZ + 0.6 },
    { x: slab.maxX + 0.9, z: slab.maxZ - 0.6 },
  ].forEach(({ x, z }) => {
    builder.cylinder("paint", palette.darkSteel, {
      radius: 0.08,
      radiusEnd: 0.06,
      length: 4.2,
      at: [x, 2.1, z],
      segments: 8,
    });
    const towards = Math.atan2(-x, -z);
    builder.box(
      "paint",
      palette.darkSteel,
      [0.6, 0.22, 0.3],
      [x + Math.sin(towards) * 0.2, 4.25, z + Math.cos(towards) * 0.2],
      [0.45, towards, 0],
    );
    builder.box(
      "glow",
      "#f4f6ff",
      [0.5, 0.02, 0.22],
      [x + Math.sin(towards) * 0.24, 4.13, z + Math.cos(towards) * 0.24],
      [0.45, towards, 0],
    );
  });
  addTree(builder, [-9.0, 0, 4.2], 1.1);
  addTree(builder, [8.9, 0, -4.0], 1.1, "#4a9440");
  addBush(builder, [-6.6, 0, slab.maxZ + 1.2], 0.5, "#3a7d34");
  addBush(builder, [6.4, 0, slab.maxZ + 1.25], 0.55);
  addSignBoard(builder, [-1.2, 0, slab.maxZ + 2.6], railBlue, 0.35);
  if (!builder.isFar) {
    [
      [pipeCentre - pipeOuter + 0.35, slabTop + pipeHeight, -3.0, 0.3],
      [6.5, slabTop + backPipe.height, -5.9, 1.4],
    ].forEach(([x, y, z, turn]) => {
      addSkateboard(builder, [x, y, z], turn);
    });
  }
};

const addSkateboard = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
) => {
  builder.box(
    "paint",
    "#d8453b",
    [0.2, 0.025, 0.74],
    [at[0], at[1] + 0.07, at[2]],
    [0, turn, 0],
  );
  [-0.26, 0.26].forEach((along) => {
    const x = at[0] + Math.sin(turn) * along;
    const z = at[2] + Math.cos(turn) * along;
    builder.box(
      "metal",
      palette.steel,
      [0.16, 0.025, 0.04],
      [x, at[1] + 0.045, z],
      [0, turn, 0],
    );
    [-0.08, 0.08].forEach((side) => {
      builder.cylinder("paint", palette.cream, {
        radius: 0.028,
        length: 0.03,
        at: [
          x + Math.cos(turn) * side,
          at[1] + 0.028,
          z - Math.sin(turn) * side,
        ],
        axis: "x",
        segments: 8,
      });
    });
  });
};

/* Rides */

const rideStart = { x: pipeCentre, z: pipeFrontZ + 0.9 };
const rideFinish = { x: pipeCentre + 1.4, z: pipeFrontZ + 2.0 };
const rideMiddleZ = (pipeFrontZ + pipeBackZ) / 2;

const halfPipeRide = (progress: number): LocalSpot => {
  if (progress < 0.1) {
    const share = progress / 0.1;
    return {
      x: rideStart.x,
      y: slabTop,
      z: rideStart.z + (rideMiddleZ - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress > 0.9) {
    const share = (progress - 0.9) / 0.1;
    return {
      x: pipeCentre + (rideFinish.x - pipeCentre) * share,
      y: slabTop,
      z: rideMiddleZ + (rideFinish.z - rideMiddleZ) * share,
      heading: Math.atan2(
        rideFinish.x - pipeCentre,
        rideFinish.z - rideMiddleZ,
      ),
    };
  }
  const share = (progress - 0.1) / 0.8;
  const swings = 4;
  const phase = share * swings * Math.PI * 2;
  const grow = Math.sin(share * Math.PI);
  const reach = pipeFlat + (pipeLip - 0.1 - pipeFlat) * grow;
  const x = pipeCentre + Math.sin(phase) * reach;
  return {
    x,
    y: slabTop + findPipeLift(x),
    z: rideMiddleZ,
    heading: Math.cos(phase) >= 0 ? Math.PI / 2 : -Math.PI / 2,
  };
};

const listBlockers = (): LocalBlocker[] => [
  ...wallRuns.flatMap(([from, to]) => listWallBlockers(from, to, 0.28, 0.28)),
  { x: -2.6, z: slab.maxZ + 1.2, radius: 0.5 },
  { x: 2.6, z: slab.maxZ + 1.2, radius: 0.5 },
  { x: 1.7, z: slab.maxZ + 1.0, radius: 0.25 },
];

export const skateParkModel: AttractionModel = {
  kind: "skate-park",
  name: "Skate Park",
  fact: "Skaters ride down a ramp and back up the other side. Gravity pulls them down the slope, and their speed carries them up again, a little lower each time because friction slows the wheels.",
  curriculumLink:
    "Science, Year 5: forces. Gravity and friction acting on a skateboard on a ramp.",
  footprint: 11.2,
  setting: "inland",
  signSpot: { x: -1.2, z: slab.maxZ + 3.4 },
  build: (builder) => {
    buildSlab(builder);
    buildHalfPipe(builder);
    buildQuarterPipes(builder);
    buildFunbox(builder);
    buildLedges(builder);
    buildWalls(builder);
    buildSurrounds(builder);
  },
  blockers: listBlockers(),
  decks: [skateDeck],
  rides: [
    {
      id: "half-pipe",
      name: "the half-pipe",
      start: rideStart,
      reach: 0.55,
      seconds: 10,
      finish: rideFinish,
      follow: halfPipeRide,
    },
  ],
};
