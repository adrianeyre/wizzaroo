import {
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  RingGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addDoor,
  addFence,
  addSignBoard,
  addWindow,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  bronze,
  buildMineTrain,
  buildMoleCage,
  buildPitPony,
  buildStationBell,
  buildWindingWheel,
  engineRed,
  findCoupledSpot,
  firstWagonBehind,
  ironBlack,
  lava,
  lavaCore,
  wagonSeatHeight,
} from "./mine-cart-ride-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const ashPad = "#6f6862";
const basalt = "#3a3532";
const darkBasalt = "#2a2624";
const ballast = "#7c746d";
const sleeperTimber = "#5a3a22";
const propTimber = "#7a5232";
const steelRail = "#8d949b";
const platformStone = "#9b938a";
const crystalAmber = "#ffb347";
const signColour = "#7a3b22";

/* The track: a ring round a middle, through a tunnel at the back */

const track = { x: 0, z: -0.8 };
const trackRadius = 3.9;
const gauge = 0.3;
const lap = 14;
const trainCount = 2;
const trainSpeed = (Math.PI * 2) / lap;
/** Where the tunnel starts and ends, as angles round the track. */
const tunnelHalf = 0.78;
const tunnelAngles = [Math.PI / 2 - tunnelHalf, Math.PI / 2 + tunnelHalf];

/** A point on a circle round the track's middle, at an angle as the trains go round. */
const ringPoint = (angle: number, radius = trackRadius): LocalPoint => ({
  x: track.x + Math.cos(angle) * radius,
  z: track.z - Math.sin(angle) * radius,
});

/** Places a point given across (x, out from the middle) and along (z) the track at an angle. */
const placeOnTrack =
  (angle: number) =>
  (across: number, y: number, along: number): Triple => {
    const { x, z } = ringPoint(angle);
    return [
      x + across * Math.cos(angle) + along * Math.sin(angle),
      y,
      z - across * Math.sin(angle) + along * Math.cos(angle),
    ];
  };

const hash = (a: number, b: number): number => {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43_758.5453;
  return value - Math.floor(value);
};

const buildTrack = (builder: AttractionBuilder) => {
  const rings = builder.segments(48, 24);
  builder.add(
    "matte",
    ballast,
    new RingGeometry(trackRadius - 0.6, trackRadius + 0.6, rings),
    { at: [track.x, 0.02, track.z], rotation: [-Math.PI / 2, 0, 0] },
  );
  [-gauge, gauge].forEach((offset) => {
    builder.add(
      "metal",
      steelRail,
      new TorusGeometry(
        trackRadius + offset,
        0.035,
        builder.isFar ? 3 : 4,
        builder.segments(48, 20),
      ),
      { at: [track.x, 0.11, track.z], rotation: [Math.PI / 2, 0, 0] },
    );
  });
  if (builder.isFar) {
    return;
  }
  const sleepers = 44;
  for (let index = 0; index < sleepers; index++) {
    const angle = (index / sleepers) * Math.PI * 2;
    builder.box(
      "matte",
      shade(sleeperTimber, 0.92 + hash(index, 2) * 0.16),
      [0.95, 0.06, 0.18],
      placeOnTrack(angle)(0, 0.06, 0),
      [0, angle, 0],
    );
  }
};

/* The tunnel through the old volcano's foot */

const rockAt = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  stretch: Triple,
  colour: string,
  seed: number,
) => {
  builder.add(
    "matte",
    colour,
    new IcosahedronGeometry(size, builder.isFar ? 0 : 1),
    { at, scale: stretch, rotation: [seed, seed * 1.7, seed * 0.6] },
    undefined,
  );
};

const tunnelRocks: {
  angle: number;
  across: number;
  size: number;
  up: number;
}[] = [
  ...[0.28, 0.6, 0.94, 1.26].map((share, index) => ({
    angle: tunnelAngles[0] + share * tunnelHalf * 1.55,
    across: 0,
    size: 1.4 - (index % 2) * 0.1,
    up: 0.45,
  })),
  ...[0.2, 0.75, 1.3].map((share) => ({
    angle: tunnelAngles[0] + share * tunnelHalf * 1.55,
    across: 1.3,
    size: 1.25,
    up: 0.6,
  })),
  ...[0.45, 1.05].map((share) => ({
    angle: tunnelAngles[0] + share * tunnelHalf * 1.55,
    across: -1.15,
    size: 1.0,
    up: 0.35,
  })),
];

const peakAt = { x: track.x, z: track.z - trackRadius - 1.2 };

const buildTunnelHill = (builder: AttractionBuilder) => {
  tunnelRocks.forEach(({ angle, across, size, up }, index) => {
    rockAt(
      builder,
      placeOnTrack(angle)(across, up, 0),
      size,
      [1.15, 1.25, 1.1],
      index % 3 === 0
        ? darkBasalt
        : shade(basalt, 0.95 + hash(index, 5) * 0.12),
      index * 0.9,
    );
  });
  /* The volcano's little peak above, with a glowing crack of lava */
  builder.add(
    "matte",
    basalt,
    new LatheGeometry(
      (
        [
          [2.0, 0],
          [1.7, 1.2],
          [1.1, 2.4],
          [0.55, 3.1],
          [0.4, 3.0],
          [0.001, 2.85],
        ] as const
      ).map(([radius, height]) => new Vector2(radius, height)),
      builder.isFar ? 7 : 11,
    ),
    { at: [peakAt.x, 0, peakAt.z] },
    undefined,
  );
  builder.cylinder("glow", lava, {
    radius: 0.38,
    length: 0.04,
    at: [peakAt.x, 2.9, peakAt.z],
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "glow",
    lava,
    [peakAt.x + 0.15, 2.95, peakAt.z + 0.45],
    [peakAt.x + 0.5, 1.6, peakAt.z + 1.2],
    0.07,
    4,
  );
  builder.bar(
    "glow",
    lavaCore,
    [peakAt.x + 0.5, 1.6, peakAt.z + 1.2],
    [peakAt.x + 0.35, 0.9, peakAt.z + 1.55],
    0.06,
    4,
  );
};

const buildPortal = (
  builder: AttractionBuilder,
  angle: number,
  inward: number,
) => {
  const place = placeOnTrack(angle);
  const turn: Triple = [0, angle, 0];
  /* The dark way in, and a stone face round the timber frame */
  builder.box(
    "matte",
    "#120f0e",
    [1.3, 1.55, 0.05],
    place(0, 0.78, inward * 0.35),
    turn,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      darkBasalt,
      [0.45, 1.95, 0.5],
      place(side * 0.95, 0.97, inward * 0.25),
      turn,
    );
    builder.box(
      "matte",
      propTimber,
      [0.14, 1.6, 0.14],
      place(side * 0.65, 0.8, 0),
      turn,
    );
  });
  builder.box(
    "matte",
    darkBasalt,
    [2.35, 0.45, 0.5],
    place(0, 1.95, inward * 0.25),
    turn,
  );
  builder.box("matte", propTimber, [1.5, 0.16, 0.18], place(0, 1.65, 0), turn);
  if (builder.isFar) {
    return;
  }
  /* A lantern and the mine's name board */
  builder.bar(
    "metal",
    ironBlack,
    place(0, 1.56, 0.02),
    place(0, 1.38, 0.02),
    0.02,
    4,
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.12, 0.16, 0.12],
    place(0, 1.3, 0.02),
    turn,
  );
  builder.box(
    "metal",
    ironBlack,
    [0.16, 0.04, 0.16],
    place(0, 1.4, 0.02),
    turn,
  );
  builder.box(
    "paint",
    signColour,
    [0.9, 0.24, 0.04],
    place(0, 1.88, -inward * 0.04),
    turn,
  );
  builder.box(
    "paint",
    palette.cream,
    [0.66, 0.05, 0.02],
    place(0, 1.9, -inward * 0.07),
    turn,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      propTimber,
      place(side * 0.65, 1.4, 0),
      place(side * 0.4, 1.65, 0),
      0.08,
      4,
    );
  });
};

/* Crystals of glowing rock */

const addCrystals = (
  builder: AttractionBuilder,
  at: LocalPoint,
  size: number,
  seed: number,
) => {
  const count = builder.isFar ? 1 : 5;
  for (let index = 0; index < count; index++) {
    const lean = (hash(seed, index) - 0.5) * 0.9;
    const turn = hash(index, seed) * Math.PI * 2;
    const height = size * (0.5 + hash(seed + 1, index) * 0.6);
    const x = at.x + Math.sin(turn) * 0.16 * size * (index > 0 ? 1 : 0);
    const z = at.z + Math.cos(turn) * 0.16 * size * (index > 0 ? 1 : 0);
    builder.add(
      "glow",
      index % 2 === 0 ? crystalAmber : lava,
      new CylinderGeometry(0.001, 0.09 * size, height, 6),
      {
        at: [
          x + Math.sin(turn) * lean * height * 0.5,
          height / 2 - 0.02,
          z + Math.cos(turn) * lean * height * 0.5,
        ],
        rotation: [Math.cos(turn) * lean, 0, -Math.sin(turn) * lean],
      },
      undefined,
    );
  }
  builder.sphere(
    "matte",
    darkBasalt,
    0.22 * size,
    [at.x, 0.03, at.z],
    [1.3, 0.5, 1.1],
    7,
  );
};

const crystalSpots: [number, number, number][] = [
  [-4.3, -4.0, 1.2],
  [4.3, -4.0, 1.1],
  [1.9, 0.7, 1.4],
  [-6.8, -2.6, 1.0],
];

/* The headframe, the shaft and the winding engine in the middle */

const headframe = { x: track.x, z: track.z - 0.7 };
const wheelPivot: Triple = [headframe.x, 3.35, headframe.z];
const engineHouse = {
  x: -1.75,
  z: track.z + 1.05,
  width: 1.3,
  depth: 1.0,
  wall: 1.3,
};
const chimneyAt: Triple = [engineHouse.x - 0.4, 0, engineHouse.z - 0.3];

const buildHeadframe = (builder: AttractionBuilder) => {
  const { x, z } = headframe;
  /* The shaft's stone collar, dark down the middle */
  builder.box("matte", platformStone, [1.25, 0.3, 1.25], [x, 0.15, z]);
  builder.box("matte", "#0d0b0a", [0.9, 0.02, 0.9], [x, 0.31, z]);
  /* Four legs leaning in to the wheel, and two back-stays */
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      builder.bar(
        "matte",
        propTimber,
        [x + side * 0.75, 0, z + end * 0.75],
        [x + side * 0.2, 3.3, z + end * 0.12],
        0.13,
        6,
      );
    });
    builder.bar(
      "matte",
      shade(propTimber, 0.85),
      [x + side * 0.6, 0, z - 1.55],
      [x + side * 0.18, 3.1, z - 0.1],
      0.11,
      6,
    );
  });
  builder.box("matte", propTimber, [0.6, 0.12, 0.5], [x, 3.25, z]);
  if (builder.isFar) {
    return;
  }
  [1.1, 2.2].forEach((y) => {
    const spread = 0.75 - (y / 3.3) * 0.55;
    builder.box(
      "matte",
      shade(propTimber, 0.9),
      [spread * 2, 0.08, 0.08],
      [x, y, z + 0.75 - (y / 3.3) * 0.63],
    );
    builder.box(
      "matte",
      shade(propTimber, 0.9),
      [spread * 2, 0.08, 0.08],
      [x, y, z - 0.75 + (y / 3.3) * 0.63],
    );
  });
  /* The axle bearings and the cable, down to the cage and over to the engine */
  builder.box("metal", ironBlack, [0.1, 0.16, 0.3], [x - 0.2, 3.35, z]);
  builder.bar(
    "metal",
    ironBlack,
    [x + 0.68, 3.35, z],
    [x + 0.0, 1.5, z],
    0.02,
    3,
  );
  builder.bar(
    "metal",
    ironBlack,
    [x - 0.68, 3.35, z],
    [engineHouse.x + 0.4, engineHouse.wall - 0.1, engineHouse.z - 0.2],
    0.02,
    3,
  );
};

const buildEngineHouse = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = engineHouse;
  builder.box("matte", palette.brick, [width, wall, depth], [x, wall / 2, z]);
  builder.box(
    "matte",
    ironBlack,
    [width + 0.2, 0.08, depth + 0.2],
    [x, wall + 0.04, z],
  );
  builder.box(
    "matte",
    palette.slate,
    [width + 0.25, 0.12, depth + 0.25],
    [x, wall + 0.14, z],
    [0, 0, 0.12],
  );
  builder.cylinder("matte", palette.darkBrick, {
    radius: 0.2,
    radiusEnd: 0.16,
    length: 2.6,
    at: [chimneyAt[0], 1.3, chimneyAt[2]],
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", ironBlack, {
    radius: 0.2,
    length: 0.12,
    at: [chimneyAt[0], 2.62, chimneyAt[2]],
    segments: 10,
  });
  addDoor(builder, {
    at: [x + 0.2, 0, z + depth / 2],
    colour: engineRed,
    width: 0.45,
    height: 0.9,
  });
  addWindow(builder, {
    at: [x - 0.35, 0.85, z + depth / 2 + 0.01],
    width: 0.3,
    height: 0.3,
    frame: palette.cream,
    isLit: true,
  });
  addWindow(builder, {
    at: [x + width / 2 + 0.01, 0.8, z],
    width: 0.4,
    height: 0.35,
    frame: palette.cream,
    turn: Math.PI / 2,
    isLit: true,
  });
};

/* The station: a curved platform with a canopy, at the front */

const platform = {
  inner: trackRadius + 0.62,
  outer: trackRadius + 1.8,
  half: 0.5,
  top: 0.35,
};
const canopyPosts = [-0.48, -0.25, 0.25, 0.48];
const bellPost = canopyPosts[1];
const stepsHalf = 0.12;

const sector = (
  inner: number,
  outer: number,
  bottom: number,
  top: number,
  half: number,
  segments: number,
) =>
  new LatheGeometry(
    [
      new Vector2(inner, bottom),
      new Vector2(outer, bottom),
      new Vector2(outer, top),
      new Vector2(inner, top),
      new Vector2(inner, bottom),
    ],
    segments,
    -half,
    half * 2,
  );

/** Out from the track's middle, at a turn from the front (+z). */
const frontPoint = (turn: number, radius: number): LocalPoint => ({
  x: track.x + Math.sin(turn) * radius,
  z: track.z + Math.cos(turn) * radius,
});

const buildStation = (builder: AttractionBuilder) => {
  const segments = builder.segments(14, 6);
  builder.add(
    "matte",
    platformStone,
    sector(
      platform.inner,
      platform.outer,
      0,
      platform.top,
      platform.half,
      segments,
    ),
    { at: [track.x, 0, track.z] },
    undefined,
  );
  builder.add(
    "paint",
    "#e8c24a",
    sector(
      platform.inner,
      platform.inner + 0.12,
      platform.top,
      platform.top + 0.01,
      platform.half,
      segments,
    ),
    { at: [track.x, 0, track.z] },
    undefined,
  );
  [-1, 1].forEach((side) => {
    const turn = side * platform.half;
    const { x, z } = frontPoint(turn, (platform.inner + platform.outer) / 2);
    builder.box(
      "matte",
      shade(platformStone, 0.88),
      [platform.outer - platform.inner, platform.top, 0.03],
      [x, platform.top / 2, z],
      [0, turn - Math.PI / 2, 0],
    );
  });
  /* Two steps down at the front */
  [0, 1].forEach((step) => {
    builder.add(
      "matte",
      shade(platformStone, 0.92),
      sector(
        platform.outer,
        platform.outer + 0.22 * (2 - step),
        0,
        (platform.top * (step + 1)) / 3,
        stepsHalf,
        4,
      ),
      { at: [track.x, 0, track.z] },
      undefined,
    );
  });
  /* The canopy, on posts at the back of the platform */
  const roofY = platform.top + 2.15;
  canopyPosts.forEach((turn) => {
    const { x, z } = frontPoint(turn, platform.outer - 0.2);
    builder.cylinder("paint", engineRed, {
      radius: 0.06,
      length: roofY - platform.top,
      at: [x, (roofY + platform.top) / 2, z],
      segments: 8,
    });
  });
  builder.add(
    "paint",
    shade(engineRed, 0.85),
    sector(
      platform.inner - 0.1,
      platform.outer + 0.15,
      roofY,
      roofY + 0.1,
      platform.half + 0.04,
      segments,
    ),
    { at: [track.x, 0, track.z] },
    undefined,
  );
  if (!builder.isFar) {
    builder.add(
      "paint",
      palette.cream,
      sector(
        platform.inner - 0.12,
        platform.inner - 0.06,
        roofY - 0.18,
        roofY + 0.1,
        platform.half + 0.04,
        segments,
      ),
      { at: [track.x, 0, track.z] },
      undefined,
    );
    /* The bell's bracket and a lamp under the canopy */
    const bracket = frontPoint(bellPost, platform.outer - 0.2);
    const bell = frontPoint(bellPost, platform.outer - 0.6);
    builder.bar(
      "metal",
      ironBlack,
      [bracket.x, 1.75, bracket.z],
      [bell.x, 1.75, bell.z],
      0.04,
      4,
    );
    const lamp = frontPoint(0, platform.outer - 0.6);
    builder.box(
      "glow",
      palette.warmLight,
      [0.16, 0.2, 0.16],
      [lamp.x, roofY - 0.25, lamp.z],
    );
    builder.box(
      "metal",
      ironBlack,
      [0.22, 0.05, 0.22],
      [lamp.x, roofY - 0.13, lamp.z],
    );
    /* A ticket board on the end post */
    const board = frontPoint(canopyPosts[3], platform.outer - 0.28);
    builder.box(
      "paint",
      palette.cream,
      [0.5, 0.36, 0.04],
      [board.x, 1.4, board.z],
      [0, canopyPosts[3], 0],
    );
    builder.box(
      "paint",
      signColour,
      [0.4, 0.06, 0.02],
      [board.x, 1.48, board.z + 0.03],
      [0, canopyPosts[3], 0],
    );
  }
  const bench = frontPoint(-0.36, platform.outer - 0.45);
  addBench(builder, [bench.x, platform.top, bench.z], Math.PI - 0.36, bronze);
};

const bellPivot: Triple = (() => {
  const { x, z } = frontPoint(bellPost, platform.outer - 0.6);
  return [x, 1.75, z];
})();

/* The miners' hut, the pony paddock and the bits and pieces round about */

const hut = { x: -6.4, z: 1.4, width: 2.0, depth: 1.5, wall: 1.35 };
const paddock = { x: 6.5, z: 1.0, radius: 1.55 };

const buildHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = hut;
  builder.box(
    "matte",
    shade(propTimber, 0.85),
    [width, wall, depth],
    [x, wall / 2, z],
  );
  builder.box("matte", basalt, [width + 0.14, 0.2, depth + 0.14], [x, 0.1, z]);
  builder.box(
    "matte",
    palette.slate,
    [width + 0.4, 0.1, depth + 0.5],
    [x, wall + 0.2, z],
    [0.2, 0, 0],
  );
  if (builder.isFar) {
    return;
  }
  for (let plank = 0; plank < 6; plank++) {
    builder.box(
      "matte",
      shade(propTimber, 0.7),
      [0.03, wall - 0.3, 0.03],
      [x + width / 2 + 0.01, wall / 2, z - depth / 2 + 0.2 + plank * 0.22],
    );
  }
  addDoor(builder, {
    at: [x + width / 2, 0, z + 0.2],
    colour: signColour,
    turn: Math.PI / 2,
    width: 0.5,
    height: 1.0,
  });
  addWindow(builder, {
    at: [x - 0.3, 0.85, z + depth / 2 + 0.01],
    width: 0.45,
    height: 0.35,
    frame: palette.cream,
    isLit: true,
  });
  /* Miners' helmets on pegs, and a lamp by the door */
  [-0.65, -0.35].forEach((dx) => {
    builder.sphere(
      "paint",
      "#f0b429",
      0.1,
      [x + dx, 1.05, z + depth / 2 + 0.06],
      [1, 0.6, 1],
      7,
    );
  });
  builder.box(
    "glow",
    palette.warmLight,
    [0.1, 0.14, 0.1],
    [x + width / 2 + 0.08, 1.15, z - 0.35],
  );
};

const buildPaddock = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    builder.add(
      "matte",
      propTimber,
      new TorusGeometry(paddock.radius, 0.04, 3, 16),
      { at: [paddock.x, 0.45, paddock.z], rotation: [Math.PI / 2, 0, 0] },
    );
    return;
  }
  const sides = 8;
  for (let side = 0; side < sides; side++) {
    const from = (side / sides) * Math.PI * 2;
    const to = ((side + 1) / sides) * Math.PI * 2;
    addFence(
      builder,
      {
        x: paddock.x + Math.sin(from) * paddock.radius,
        z: paddock.z + Math.cos(from) * paddock.radius,
      },
      {
        x: paddock.x + Math.sin(to) * paddock.radius,
        z: paddock.z + Math.cos(to) * paddock.radius,
      },
      { colour: propTimber, isPicket: false, finish: "matte", height: 0.6 },
    );
  }
  builder.box(
    "matte",
    propTimber,
    [0.7, 0.25, 0.3],
    [paddock.x + 0.7, 0.2, paddock.z - 0.9],
  );
  builder.box(
    "matte",
    "#d9b85a",
    [0.62, 0.08, 0.24],
    [paddock.x + 0.7, 0.34, paddock.z - 0.9],
  );
};

const buildProps = (builder: AttractionBuilder) => {
  /* Heaps of ore and tailings */
  [
    [2.0, -1.6, 0.7],
    [-6.0, -1.2, 0.85],
    [5.6, -2.8, 0.75],
  ].forEach(([x, z, size], index) => {
    builder.lathe(
      "matte",
      index === 1 ? shade(ballast, 0.8) : "#5d524b",
      [
        [0.001, size * 0.75],
        [size * 0.45, size * 0.6],
        [size, 0.05],
        [size * 1.05, 0],
      ],
      [x, 0, z],
      "y",
      builder.isFar ? 6 : 10,
    );
  });
  crystalSpots.forEach(([x, z, size], index) => {
    addCrystals(builder, { x, z }, size, index + 3);
  });
  if (builder.isFar) {
    return;
  }
  /* A wheelbarrow and pickaxes */
  const barrow: Triple = [1.0, 0, 0.6];
  builder.box(
    "metal",
    bronze,
    [0.4, 0.2, 0.55],
    [barrow[0], 0.38, barrow[2]],
    [0.15, 0.4, 0],
  );
  builder.cylinder("metal", ironBlack, {
    radius: 0.13,
    length: 0.05,
    at: [barrow[0] + 0.1, 0.13, barrow[2] - 0.35],
    axis: "x",
    segments: 10,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      propTimber,
      [barrow[0] + side * 0.18, 0.32, barrow[2] - 0.2],
      [barrow[0] + side * 0.2 - 0.3, 0.55, barrow[2] + 0.55],
      0.04,
      4,
    );
  });
  [
    [-5.2, 0.4],
    [-4.95, 0.45],
  ].forEach(([x, z], index) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      [x, 0, z],
      [x + 0.1 * index, 0.85, z - 0.25],
      0.04,
      4,
    );
    builder.bar(
      "metal",
      palette.darkSteel,
      [x - 0.2, 0.85, z - 0.25],
      [x + 0.25, 0.82, z - 0.25],
      0.04,
      4,
    );
  });
  /* Lanterns on posts along the way in */
  [
    [-2.0, 5.6],
    [2.4, 5.4],
    [-5.0, 3.6],
  ].forEach(([x, z]) => {
    builder.cylinder("matte", propTimber, {
      radius: 0.05,
      length: 1.6,
      at: [x, 0.8, z],
      segments: 6,
    });
    builder.bar(
      "metal",
      ironBlack,
      [x, 1.55, z],
      [x + 0.22, 1.55, z],
      0.025,
      4,
    );
    builder.box(
      "glow",
      palette.warmLight,
      [0.1, 0.14, 0.1],
      [x + 0.22, 1.42, z],
    );
    builder.box("metal", ironBlack, [0.14, 0.03, 0.14], [x + 0.22, 1.51, z]);
  });
  /* Barrels of lamp oil */
  [
    [-4.6, 1.9],
    [-4.75, 2.45],
  ].forEach(([x, z]) => {
    builder.lathe(
      "matte",
      propTimber,
      [
        [0.001, 0],
        [0.2, 0],
        [0.24, 0.25],
        [0.2, 0.5],
        [0.001, 0.5],
      ],
      [x, 0, z],
      "y",
      10,
    );
    builder.torus("metal", ironBlack, 0.225, 0.015, [x, 0.25, z], "y", 10);
  });
};

const addDeadTree = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  size: number,
) => {
  builder.cylinder("matte", "#3b2f28", {
    radius: 0.12 * size,
    radiusEnd: 0.05 * size,
    length: 2.2 * size,
    at: [x, 1.1 * size, z],
    segments: 7,
  });
  if (builder.isFar) {
    return;
  }
  [
    [0.5, 1.4, 0.2],
    [-0.45, 1.7, -0.1],
    [0.1, 1.9, -0.5],
  ].forEach(([dx, y, dz]) => {
    builder.bar(
      "matte",
      "#3b2f28",
      [x, y * size * 0.8, z],
      [x + dx * size, y * size, z + dz * size],
      0.06 * size,
      4,
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", shade(ballast, 1.1), [1.6, 0.03, 3.0], [0, 0.015, 7.6]);
  buildHut(builder);
  buildPaddock(builder);
  buildProps(builder);
  addDeadTree(builder, -5.6, -5.4, 1.1);
  addDeadTree(builder, 5.4, -5.6, 1.0);
  addDeadTree(builder, 7.6, 4.6, 0.85);
  addSignBoard(builder, [-2.6, 0, 6.6], signColour);
};

/* The trains, and the Character's go in the first wagon */

const trainPivot: Triple = [track.x, 0, track.z];
const trainMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: trackRadius,
  count: trainCount,
  speed: trainSpeed,
  isFacingAlong: true,
};
const seat = findCoupledSpot(trackRadius, firstWagonBehind);
const seatLocal: Triple = [seat.at[0], wagonSeatHeight, seat.at[2]];

const rideStart: LocalPoint = frontPoint(0, trackRadius + 1.15);
const rideFinish: LocalPoint = { x: 0.6, z: 6.4 };
const platformEdge: Triple = (() => {
  const { x, z } = frontPoint(0, platform.inner + 0.2);
  return [x, platform.top, z];
})();
const stepOn = 0.7;
const hop = 0.8;
const walkOff = 2.6;
const spacing = (Math.PI * 2) / trainCount;
/** When the first wagon is at the platform: right at the front of the ring. */
const boardingAngle = Math.PI * 1.5 + firstWagonBehind / trackRadius;
const rideSeconds = stepOn + hop + lap / trainCount + lap + hop + walkOff + 0.4;

const platformDeck: Deck = ({ x, z }) => {
  const radius = Math.hypot(x - track.x, z - track.z);
  const turn = Math.atan2(x - track.x, z - track.z);
  if (
    Math.abs(turn) <= platform.half &&
    radius >= platform.inner &&
    radius <= platform.outer
  ) {
    return { height: platform.top, kind: "ground" };
  }
  if (
    Math.abs(turn) <= stepsHalf &&
    radius > platform.outer &&
    radius <= platform.outer + 0.44
  ) {
    return {
      height:
        radius <= platform.outer + 0.22
          ? (platform.top * 2) / 3
          : platform.top / 3,
      kind: "ground",
    };
  }
  return undefined;
};

const findSeat = (seconds: number, copy: number): Triple =>
  moveWithPose(
    trainPivot,
    [
      trainPivot[0] + seatLocal[0],
      trainPivot[1] + seatLocal[1],
      trainPivot[2] + seatLocal[2],
    ],
    findMotionPose(trainMotion, seconds, { copy }),
  );

const blend = (
  from: Triple,
  to: Triple,
  share: number,
  lift: number,
): Triple => {
  const eased = share * share * (3 - 2 * share);
  return [
    from[0] + (to[0] - from[0]) * eased,
    from[1] + (to[1] - from[1]) * eased + lift * Math.sin(share * Math.PI),
    from[2] + (to[2] - from[2]) * eased,
  ];
};

const rideTrain = (progress: number, clockSeconds: number): LocalSpot => {
  const elapsed = progress * rideSeconds;
  const begun = clockSeconds - elapsed;
  const start: Triple = [rideStart.x, platform.top, rideStart.z];
  const toSpot = ([x, y, z]: Triple, heading: number): LocalSpot => ({
    x,
    y,
    z,
    heading,
  });
  if (elapsed < stepOn) {
    return toSpot(blend(start, platformEdge, elapsed / stepOn, 0), Math.PI);
  }
  /* The next train in, and which copy it is */
  const turns = Math.ceil(
    (trainSpeed * (begun + stepOn + hop) - boardingAngle) / spacing,
  );
  const boarded = (boardingAngle + turns * spacing) / trainSpeed;
  const copy = ((-turns % trainCount) + trainCount) % trainCount;
  const arrived = boarded + lap;
  if (clockSeconds < boarded - hop) {
    return toSpot(platformEdge, Math.PI);
  }
  if (clockSeconds < boarded) {
    const share = 1 - (boarded - clockSeconds) / hop;
    return toSpot(
      blend(platformEdge, findSeat(clockSeconds, copy), share, 0.3),
      Math.PI,
    );
  }
  if (clockSeconds < arrived) {
    const pose = findMotionPose(trainMotion, clockSeconds, { copy });
    const rattle = 0.02 * Math.abs(Math.sin(clockSeconds * 11));
    const [x, y, z] = findSeat(clockSeconds, copy);
    return toSpot([x, y + rattle, z], pose.rotation[1] + seat.turn + Math.PI);
  }
  if (clockSeconds < arrived + hop) {
    const share = (clockSeconds - arrived) / hop;
    return toSpot(
      blend(findSeat(clockSeconds, copy), platformEdge, share, 0.3),
      0,
    );
  }
  const walked = Math.min(1, (clockSeconds - arrived - hop) / walkOff);
  const x = platformEdge[0] + (rideFinish.x - platformEdge[0]) * walked;
  const z = platformEdge[2] + (rideFinish.z - platformEdge[2]) * walked;
  return toSpot(
    [x, platformDeck({ x, z })?.height ?? 0, z],
    Math.atan2(rideFinish.x - platformEdge[0], rideFinish.z - platformEdge[2]),
  );
};

export const mineCartRideModel: NewLandAttractionModel = {
  kind: "mine-cart-ride",
  islandId: "ember-isle",
  name: "Mine Cart Ride",
  fact: "Mine carts have smooth steel wheels that roll on smooth steel rails, so there is very little friction to slow them down, and a pony or a little engine can pull a heavy load of rock. Friction is a force between two surfaces that rub or roll over each other. To stop a cart, a brake presses on its wheels to make more friction.",
  curriculumLink:
    "Science, Year 5: forces. The effects of friction between moving surfaces, using mine carts on steel rails.",
  footprint: 10,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: -2.6, z: 7.4 },
  build: (builder) => {
    buildTrack(builder);
    buildTunnelHill(builder);
    tunnelAngles.forEach((angle, index) => {
      buildPortal(builder, angle, index === 0 ? -1 : 1);
    });
    buildHeadframe(builder);
    buildEngineHouse(builder);
    buildStation(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "mine trains",
      pivot: trainPivot,
      build: buildMineTrain(trackRadius),
      motion: trainMotion,
    },
    {
      name: "winding wheel",
      pivot: wheelPivot,
      build: buildWindingWheel,
      motion: { kind: "whirl", axis: "z", idle: 0.5, speed: 4.5, reach: 6 },
    },
    {
      name: "miner mole",
      pivot: [headframe.x, -1.05, headframe.z],
      build: buildMoleCage,
      motion: { kind: "rise", reach: 4.5, height: 1.35, period: 1.8 },
    },
    {
      name: "station bell",
      pivot: bellPivot,
      build: buildStationBell,
      motion: { kind: "nod", axis: "x", reach: 3, amplitude: 0.5, period: 0.7 },
    },
  ],
  wanderers: [
    {
      name: "pit ponies",
      build: buildPitPony,
      count: 2,
      centre: { x: paddock.x, z: paddock.z },
      radius: 0.7,
      speed: 0.35,
    },
  ],
  smoke: [
    {
      at: [chimneyAt[0], 2.75, chimneyAt[2]],
      colour: "#8e8780",
      puffs: 6,
      size: 0.3,
      rise: 2.2,
      spread: 0.35,
    },
    {
      at: [peakAt.x, 3.0, peakAt.z],
      colour: "#d8d2ca",
      puffs: 5,
      size: 0.45,
      rise: 2.6,
      spread: 0.4,
    },
  ],
  blockers: [
    { x: headframe.x, z: headframe.z, radius: 0.85 },
    { x: engineHouse.x, z: engineHouse.z, radius: 0.75 },
    { x: hut.x - 0.5, z: hut.z, radius: 0.95 },
    { x: hut.x + 0.5, z: hut.z, radius: 0.95 },
    { x: paddock.x, z: paddock.z, radius: paddock.radius + 0.1 },
    { x: peakAt.x, z: peakAt.z, radius: 1.9 },
    ...tunnelRocks.map(({ angle, across, size }) => {
      const [x, , z] = placeOnTrack(angle)(across, 0, 0);
      return { x, z, radius: size };
    }),
  ] satisfies LocalBlocker[],
  decks: [platformDeck],
  rides: [
    {
      id: "mine-train",
      name: "the mine train",
      start: rideStart,
      reach: 0.6,
      seconds: rideSeconds,
      finish: rideFinish,
      follow: rideTrain,
    },
  ],
  tune: [72, 76, 79, 76, 72, 67, 72],
  play: {
    label: "Ring the station bell",
    news: "Ding-ding! You rang the station bell, the little engine tooted back, and the miner mole popped up the shaft to wave hello.",
    tune: [84, 79, 84, 79],
  },
};
