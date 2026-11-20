import {
  addBush,
  addSignBoard,
  addTree,
  findMotionPose,
  listWallBlockers,
  moveWithPose,
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

const log = "#8d6440";
const darkLog = "#6a4a2e";
const plank = "#b48d5f";
const rope = "#cdb47c";
const shingle = "#6b3a2a";
const barkChips = "#8a6a49";
const flagRed = "#c8423a";
const tyreBlack = "#26282b";

/* The fort */

interface Tower {
  x: number;
  z: number;
  half: number;
  deck: number;
}

const roofedTower: Tower = { x: -3.3, z: -2.5, half: 1.0, deck: 1.8 };
const zipTower: Tower = { x: 2.0, z: -2.9, half: 1.0, deck: 2.2 };
const railHeight = 0.8;
const roofBase = roofedTower.deck + 1.25;

type Side = "north" | "south" | "east" | "west";

const sideEnds = (tower: Tower, side: Side): [LocalPoint, LocalPoint] => {
  const { x, z, half } = tower;
  if (side === "south") {
    return [
      { x: x - half, z: z + half },
      { x: x + half, z: z + half },
    ];
  }
  if (side === "north") {
    return [
      { x: x - half, z: z - half },
      { x: x + half, z: z - half },
    ];
  }
  if (side === "east") {
    return [
      { x: x + half, z: z - half },
      { x: x + half, z: z + half },
    ];
  }
  return [
    { x: x - half, z: z - half },
    { x: x - half, z: z + half },
  ];
};

/** A row of upright pointed logs, like a stockade. */
const addPalisade = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
  bottom: number,
  top: number,
  { radius = 0.1, gap = 0.01 }: { radius?: number; gap?: number } = {},
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const spacing = (radius * 2 + gap) * (builder.isFar ? 1.6 : 1);
  const count = Math.max(1, Math.floor(length / spacing));
  const logRadius = builder.isFar ? radius * 1.5 : radius;
  for (let index = 0; index < count; index++) {
    const share = (index + 0.5) / count;
    const x = from.x + (to.x - from.x) * share;
    const z = from.z + (to.z - from.z) * share;
    const height = top - bottom - ((index * 37) % 5) * 0.035;
    builder.cylinder("matte", index % 3 === 1 ? darkLog : log, {
      radius: logRadius,
      length: height,
      at: [x, bottom + height / 2, z],
      segments: 7,
    });
    builder.cylinder("matte", shade(log, 1.12), {
      radius: logRadius,
      radiusEnd: 0.01,
      length: 0.16,
      at: [x, bottom + height + 0.08, z],
      segments: 7,
    });
  }
  if (!builder.isFar) {
    const turn = Math.atan2(to.x - from.x, to.z - from.z);
    [0.25, 0.75].forEach((share) => {
      builder.box(
        "matte",
        darkLog,
        [0.06, 0.1, length],
        [
          (from.x + to.x) / 2 - Math.cos(turn) * (radius + 0.03),
          bottom + (top - bottom) * share,
          (from.z + to.z) / 2 + Math.sin(turn) * (radius + 0.03),
        ],
        [0, turn, 0],
      );
    });
  }
};

const buildTower = (
  builder: AttractionBuilder,
  tower: Tower,
  postTop: number,
  openSides: readonly Side[],
  cladSides: readonly Side[],
) => {
  const { x, z, half, deck } = tower;
  [-1, 1].forEach((alongX) => {
    [-1, 1].forEach((alongZ) => {
      builder.cylinder("matte", log, {
        radius: 0.12,
        length: postTop,
        at: [x + alongX * half, postTop / 2, z + alongZ * half],
        segments: 10,
      });
      builder.cylinder("matte", shade(log, 1.15), {
        radius: 0.12,
        radiusEnd: 0.04,
        length: 0.12,
        at: [x + alongX * half, postTop + 0.06, z + alongZ * half],
        segments: 10,
      });
    });
  });
  const boards = builder.isFar ? 1 : 9;
  const width = (half * 2 + 0.1) / boards;
  for (let board = 0; board < boards; board++) {
    builder.box(
      "matte",
      board % 2 === 0 ? plank : shade(plank, 0.92),
      [width - 0.015, 0.08, half * 2 + 0.1],
      [x - half - 0.05 + width * (board + 0.5), deck, z],
    );
  }
  builder.box(
    "matte",
    darkLog,
    [half * 2 + 0.2, 0.14, 0.12],
    [x, deck - 0.11, z + half],
  );
  builder.box(
    "matte",
    darkLog,
    [half * 2 + 0.2, 0.14, 0.12],
    [x, deck - 0.11, z - half],
  );
  (["north", "south", "east", "west"] as const).forEach((side) => {
    if (openSides.includes(side)) {
      return;
    }
    const [from, to] = sideEnds(tower, side);
    addPalisade(builder, from, to, deck + 0.04, deck + railHeight, {
      radius: 0.075,
    });
  });
  cladSides.forEach((side) => {
    const [from, to] = sideEnds(tower, side);
    addPalisade(builder, from, to, 0, deck - 0.05, { radius: 0.1 });
  });
  if (!builder.isFar) {
    [-1, 1].forEach((alongX) => {
      builder.bar(
        "matte",
        darkLog,
        [x + alongX * half, 0.25, z + half],
        [x - alongX * half * 0.15, deck - 0.2, z + half],
        0.08,
        6,
      );
    });
  }
};

const buildRoof = (builder: AttractionBuilder) => {
  const { x, z, half } = roofedTower;
  const reach = (half + 0.45) * Math.SQRT2;
  builder.lathe(
    "matte",
    shingle,
    [
      [0, 0],
      [reach, 0],
      [reach * 0.98, 0.06],
      [reach * 0.55, 0.62],
      [reach * 0.08, 1.15],
      [0, 1.2],
    ],
    [x, roofBase, z],
    "y",
    4,
  );
  if (!builder.isFar) {
    builder.lathe(
      "matte",
      shade(shingle, 0.85),
      [
        [reach * 1.0, -0.01],
        [reach * 0.82, 0.24],
        [reach * 0.79, 0.24],
        [reach * 0.97, -0.01],
      ],
      [x, roofBase, z],
      "y",
      4,
    );
  }
  builder.box(
    "matte",
    darkLog,
    [half * 2 + 0.3, 0.12, half * 2 + 0.3],
    [x, roofBase - 0.06, z],
  );
  builder.cylinder("matte", darkLog, {
    radius: 0.03,
    length: 1.0,
    at: [x, roofBase + 1.6, z],
    segments: 6,
  });
  builder.box(
    "paint",
    flagRed,
    [0.5, 0.3, 0.02],
    [x + 0.26, roofBase + 1.92, z],
    [0, 0, -0.08],
  );
};

const bridgeFrom: Triple = [
  roofedTower.x + roofedTower.half,
  roofedTower.deck,
  roofedTower.z,
];
const bridgeTo: Triple = [
  zipTower.x - zipTower.half,
  zipTower.deck,
  zipTower.z,
];

const alongBridge = (share: number, lift = 0, side = 0): Triple => [
  bridgeFrom[0] + (bridgeTo[0] - bridgeFrom[0]) * share,
  bridgeFrom[1] +
    (bridgeTo[1] - bridgeFrom[1]) * share -
    0.16 * Math.sin(share * Math.PI) +
    lift,
  bridgeFrom[2] + (bridgeTo[2] - bridgeFrom[2]) * share + side,
];

const buildBridge = (builder: AttractionBuilder) => {
  const planks = builder.isFar ? 4 : 13;
  for (let index = 0; index < planks; index++) {
    const share = (index + 0.5) / planks;
    const before = alongBridge(share - 0.02);
    const after = alongBridge(share + 0.02);
    const slope = Math.atan2(after[1] - before[1], after[0] - before[0]);
    builder.box(
      "matte",
      index % 2 === 0 ? plank : shade(plank, 0.9),
      [0.2, 0.06, 0.8],
      alongBridge(share, -0.02),
      [0, 0, slope],
    );
  }
  [-0.42, 0.42].forEach((side) => {
    const steps = builder.isFar ? 3 : 8;
    for (let step = 0; step < steps; step++) {
      builder.bar(
        "matte",
        rope,
        alongBridge(step / steps, 0.72, side),
        alongBridge((step + 1) / steps, 0.72, side),
        0.045,
        5,
      );
      builder.bar(
        "matte",
        rope,
        alongBridge(step / steps, -0.04, side),
        alongBridge((step + 1) / steps, -0.04, side),
        0.04,
        5,
      );
      if (!builder.isFar && step > 0) {
        builder.bar(
          "matte",
          rope,
          alongBridge(step / steps, -0.04, side),
          alongBridge(step / steps, 0.72, side),
          0.025,
          4,
        );
        builder.bar(
          "matte",
          rope,
          alongBridge((step - 0.5) / steps, -0.04, side),
          alongBridge((step + 0.5) / steps, 0.72, side),
          0.02,
          4,
        );
      }
    }
  });
};

/* The rope net */

const netFoot: Triple = [
  roofedTower.x,
  0,
  roofedTower.z + roofedTower.half + 1.5,
];
const netTop: Triple = [
  roofedTower.x,
  roofedTower.deck + 0.05,
  roofedTower.z + roofedTower.half,
];
const netHalf = 0.75;

const alongNet = (up: number, across: number): Triple => [
  netFoot[0] + across * netHalf,
  netFoot[1] + (netTop[1] - netFoot[1]) * up,
  netFoot[2] + (netTop[2] - netFoot[2]) * up,
];

const buildNet = (builder: AttractionBuilder) => {
  const rows = builder.isFar ? 3 : 7;
  const columns = builder.isFar ? 3 : 6;
  for (let row = 0; row <= rows; row++) {
    builder.bar(
      "matte",
      rope,
      alongNet(row / rows, -1),
      alongNet(row / rows, 1),
      row === 0 || row === rows ? 0.06 : 0.04,
      5,
    );
  }
  for (let column = 0; column <= columns; column++) {
    const across = -1 + (2 * column) / columns;
    builder.bar(
      "matte",
      rope,
      alongNet(0, across),
      alongNet(1, across),
      0.04,
      5,
    );
  }
  if (!builder.isFar) {
    for (let row = 1; row < rows; row++) {
      for (let column = 1; column < columns; column++) {
        builder.sphere(
          "matte",
          shade(rope, 0.9),
          0.035,
          alongNet(row / rows, -1 + (2 * column) / columns),
          [1, 1, 1],
          6,
        );
      }
    }
  }
  [-1, 1].forEach((side) => {
    const [x, , z] = alongNet(0, side * 1.05);
    builder.cylinder("matte", darkLog, {
      radius: 0.07,
      length: 0.35,
      at: [x, 0.12, z],
      segments: 8,
    });
  });
};

/* The fireman's pole */

const poleAt = { x: roofedTower.x - roofedTower.half - 0.55, z: roofedTower.z };

const buildPole = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.steel, {
    radius: 0.045,
    length: roofedTower.deck + 1.0,
    at: [poleAt.x, (roofedTower.deck + 1.0) / 2, poleAt.z],
    segments: 10,
  });
  builder.bar(
    "metal",
    palette.steel,
    [poleAt.x, roofedTower.deck + 1.0, poleAt.z],
    [roofedTower.x - roofedTower.half, roofedTower.deck + 1.0, poleAt.z],
    0.05,
    8,
  );
  builder.cylinder("matte", palette.darkStone, {
    radius: 0.4,
    length: 0.04,
    at: [poleAt.x, 0.02, poleAt.z],
    segments: 16,
  });
};

/* The ladder up the zip-wire tower */

const ladderFoot: Triple = [zipTower.x, 0, zipTower.z + zipTower.half + 0.75];
const ladderTop: Triple = [
  zipTower.x,
  zipTower.deck,
  zipTower.z + zipTower.half,
];

const buildLadder = (builder: AttractionBuilder) => {
  [-0.3, 0.3].forEach((side) => {
    builder.bar(
      "matte",
      log,
      [ladderFoot[0] + side, 0, ladderFoot[2]],
      [ladderTop[0] + side, ladderTop[1] + 0.6, ladderTop[2] - 0.08],
      0.08,
      7,
    );
  });
  const rungs = builder.isFar ? 3 : 8;
  for (let rung = 1; rung <= rungs; rung++) {
    const share = rung / (rungs + 1);
    builder.cylinder("matte", plank, {
      radius: 0.03,
      length: 0.6,
      at: [
        ladderFoot[0],
        (ladderTop[1] + 0.6) * share,
        ladderFoot[2] + (ladderTop[2] - 0.08 - ladderFoot[2]) * share,
      ],
      axis: "x",
      segments: 6,
    });
  }
};

/* The zip wire */

const zipStart: Triple = [
  zipTower.x + zipTower.half + 0.15,
  zipTower.deck + 1.3,
  zipTower.z,
];
const zipEnd: Triple = [8.0, 2.05, 1.8];
const hangDrop = 1.2;

const alongCable = (share: number): Triple => [
  zipStart[0] + (zipEnd[0] - zipStart[0]) * share,
  zipStart[1] +
    (zipEnd[1] - zipStart[1]) * share -
    0.22 * Math.sin(share * Math.PI),
  zipStart[2] + (zipEnd[2] - zipStart[2]) * share,
];

const zipHeading = Math.atan2(zipEnd[0] - zipStart[0], zipEnd[2] - zipStart[2]);

const buildZipWire = (builder: AttractionBuilder) => {
  builder.cylinder("matte", log, {
    radius: 0.13,
    length: zipStart[1] + 0.3,
    at: [zipStart[0], (zipStart[1] + 0.3) / 2, zipStart[2]],
    segments: 10,
  });
  builder.bar(
    "matte",
    darkLog,
    [zipStart[0], zipStart[1] - 0.6, zipStart[2]],
    [zipStart[0] - 0.9, zipStart[1] - 1.3, zipStart[2]],
    0.08,
    6,
  );
  const steps = builder.segments(12, 4);
  for (let step = 0; step < steps; step++) {
    builder.bar(
      "metal",
      palette.steel,
      alongCable(step / steps),
      alongCable((step + 1) / steps),
      0.03,
      5,
    );
  }
  const across = { x: Math.cos(zipHeading), z: -Math.sin(zipHeading) };
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      log,
      [
        zipEnd[0] + across.x * side * 0.55,
        0,
        zipEnd[2] + across.z * side * 0.55,
      ],
      [zipEnd[0], zipEnd[1] + 0.25, zipEnd[2]],
      0.14,
      8,
    );
  });
  builder.cylinder("matte", log, {
    radius: 0.06,
    length: 0.4,
    at: [zipEnd[0], zipEnd[1] + 0.25, zipEnd[2]],
    axis: "x",
    segments: 6,
  });
  const brakeAt = alongCable(0.9);
  if (!builder.isFar) {
    builder.cylinder("paint", tyreBlack, {
      radius: 0.1,
      length: 0.25,
      at: [brakeAt[0] + 0.25, brakeAt[1] + 0.02, brakeAt[2] + 0.07],
      axis: "x",
      segments: 10,
    });
  }
  const trolleyAt = alongCable(0.82);
  builder.roundedBox(
    "paint",
    "#d8a21d",
    [0.22, 0.14, 0.12],
    0.03,
    [trolleyAt[0], trolleyAt[1] - 0.06, trolleyAt[2]],
    [0, zipHeading, 0],
  );
  builder.bar(
    "metal",
    palette.steel,
    [trolleyAt[0], trolleyAt[1] - 0.12, trolleyAt[2]],
    [trolleyAt[0], trolleyAt[1] - 0.85, trolleyAt[2]],
    0.025,
    5,
  );
  builder.cylinder("paint", "#d8453b", {
    radius: 0.18,
    length: 0.05,
    at: [trolleyAt[0], trolleyAt[1] - 0.88, trolleyAt[2]],
    segments: 14,
  });
  builder.bar(
    "paint",
    "#d8453b",
    [
      trolleyAt[0] - across.x * 0.22,
      trolleyAt[1] - 0.2,
      trolleyAt[2] - across.z * 0.22,
    ],
    [
      trolleyAt[0] + across.x * 0.22,
      trolleyAt[1] - 0.2,
      trolleyAt[2] + across.z * 0.22,
    ],
    0.045,
    6,
  );
  builder.cylinder("matte", "#c9b48a", {
    radius: 1.1,
    length: 0.06,
    at: [zipEnd[0] - 0.9, 0.03, zipEnd[2] - 0.5],
    segments: 18,
  });
};

/* The tyre swing */

const swingAt = { x: -5.4, z: 3.2 };
const swingTop = 2.3;
const swingPivot: Triple = [swingAt.x, swingTop, swingAt.z];
const swingMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.42,
  period: 3.1,
};

const buildSwingFrame = (builder: AttractionBuilder) => {
  builder.cylinder("matte", log, {
    radius: 0.1,
    length: 2.6,
    at: [swingAt.x, swingTop + 0.06, swingAt.z],
    axis: "x",
    segments: 10,
  });
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((leg) => {
      builder.bar(
        "matte",
        log,
        [swingAt.x + side * 1.15, swingTop + 0.06, swingAt.z],
        [swingAt.x + side * 1.4, 0, swingAt.z + leg * 0.8],
        0.15,
        8,
      );
    });
  });
};

const buildTyre = (builder: AttractionBuilder) => {
  const seat = -1.65;
  builder.torus("paint", tyreBlack, 0.36, 0.12, [0, seat, 0], "y", 18);
  [0, 2.09, 4.19].forEach((angle) => {
    builder.bar(
      "metal",
      palette.steel,
      [0, 0, 0],
      [Math.sin(angle) * 0.34, seat + 0.08, Math.cos(angle) * 0.34],
      0.022,
      4,
    );
  });
};

/* The grounds */

const stumps: [number, number, number][] = [
  [-0.6, 2.6, 0.35],
  [0.1, 3.3, 0.45],
  [0.9, 2.9, 0.3],
  [1.5, 3.6, 0.5],
  [2.3, 3.2, 0.4],
];

const buildGrounds = (builder: AttractionBuilder) => {
  builder.cylinder("matte", barkChips, {
    radius: 8.4,
    length: 0.04,
    at: [0, 0.02, 0],
    segments: builder.segments(44, 20),
  });
  builder.box("matte", palette.path, [1.6, 0.05, 1.6], [0, 0.025, 8.6]);
  stumps.forEach(([x, z, height]) => {
    builder.cylinder("matte", log, {
      radius: 0.22,
      length: height,
      at: [x, height / 2, z],
      segments: 10,
    });
    builder.cylinder("matte", palette.paleTimber, {
      radius: 0.2,
      length: 0.01,
      at: [x, height + 0.005, z],
      segments: 10,
    });
  });
  builder.cylinder("matte", log, {
    radius: 0.16,
    length: 3.0,
    at: [3.6, 0.42, 4.6],
    axis: "x",
    segments: 10,
  });
  [2.4, 4.8].forEach((x) => {
    builder.box("matte", darkLog, [0.14, 0.34, 0.5], [x, 0.17, 4.6]);
  });
  addPalisade(
    builder,
    {
      x: roofedTower.x + roofedTower.half,
      z: roofedTower.z - roofedTower.half,
    },
    { x: zipTower.x - zipTower.half, z: zipTower.z - zipTower.half },
    0,
    1.5,
    { radius: 0.1 },
  );
  addTree(builder, [-7.2, 0, -4.8], 1.3);
  addTree(builder, [5.8, 0, -6.2], 1.15, "#4a9440");
  addTree(builder, [-8.2, 0, 0.6], 1.0, "#3c8237");
  addBush(builder, [7.6, 0, -2.4], 0.6, "#3a7d34");
  addBush(builder, [-3.6, 0, 7.4], 0.5);
  addBush(builder, [4.6, 0, 7.2], 0.55, "#3a7d34");
  addSignBoard(builder, [-1.8, 0, 8.2], "#3f6b2f");
};

/* Rides */

const zipRideStart = { x: ladderFoot[0], z: ladderFoot[2] + 0.4 };
const zipRideFinish = { x: zipEnd[0] - 1.6, z: zipEnd[2] + 1.0 };

const zipRide = (progress: number): LocalSpot => {
  if (progress < 0.3) {
    const share = progress / 0.3;
    return {
      x: zipRideStart.x,
      y: zipTower.deck * share,
      z: zipRideStart.z + (ladderTop[2] - 0.3 - zipRideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.4) {
    const share = (progress - 0.3) / 0.1;
    const fromX = zipRideStart.x;
    const fromZ = ladderTop[2] - 0.3;
    return {
      x: fromX + (zipStart[0] - 0.35 - fromX) * share,
      y: zipTower.deck,
      z: fromZ + (zipStart[2] - fromZ) * share,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.88) {
    const share = ((progress - 0.4) / 0.48) ** 1.3 * 0.86;
    const [x, y, z] = alongCable(share);
    const lead = Math.min(1, share * 10);
    return {
      x: zipStart[0] - 0.35 + (x - zipStart[0] + 0.35) * lead,
      y: Math.max(0, y - hangDrop),
      z,
      heading: zipHeading,
    };
  }
  const share = (progress - 0.88) / 0.12;
  const [x, y, z] = alongCable(0.86);
  return {
    x: x + (zipRideFinish.x - x) * share,
    y: Math.max(0, (y - hangDrop) * (1 - share * 2)),
    z: z + (zipRideFinish.z - z) * share,
    heading: zipHeading,
  };
};

const netRideStart = { x: netFoot[0], z: netFoot[2] + 0.5 };
const netRideFinish = { x: poleAt.x - 0.9, z: poleAt.z + 0.6 };

const netRide = (progress: number): LocalSpot => {
  if (progress < 0.45) {
    const share = progress / 0.45;
    const [x, y, z] = alongNet(share, 0.25 * Math.sin(share * Math.PI * 3));
    const lead = Math.min(1, share * 8);
    return {
      x,
      y: y + 0.12 * lead,
      z: netRideStart.z + (z - 0.15 - netRideStart.z) * lead,
      heading: Math.PI,
    };
  }
  if (progress < 0.62) {
    const share = (progress - 0.45) / 0.17;
    const fromZ = netTop[2] - 0.15;
    return {
      x: netTop[0] + (poleAt.x + 0.5 - netTop[0]) * share,
      y: roofedTower.deck + 0.04,
      z: fromZ + (poleAt.z - fromZ) * share,
      heading: -Math.PI / 2 - 0.6,
    };
  }
  if (progress < 0.86) {
    const share = ((progress - 0.62) / 0.24) ** 1.5;
    return {
      x: poleAt.x + 0.5 - 0.38 * Math.min(1, share * 6),
      y: (roofedTower.deck + 0.04) * (1 - share),
      z: poleAt.z,
      heading: -Math.PI / 2 + share * Math.PI * 2,
    };
  }
  const share = (progress - 0.86) / 0.14;
  return {
    x: poleAt.x + 0.12 + (netRideFinish.x - poleAt.x - 0.12) * share,
    y: 0,
    z: poleAt.z + (netRideFinish.z - poleAt.z) * share,
    heading: -Math.PI / 2,
  };
};

const tyreRideStart = { x: swingAt.x, z: swingAt.z + 1.1 };
const tyreRideFinish = { x: swingAt.x + 0.2, z: swingAt.z + 2.3 };

const tyreRide = (progress: number, seconds: number): LocalSpot => {
  const seat: Triple = [swingAt.x, swingTop - 1.65 + 0.12, swingAt.z];
  const [x, y, z] = moveWithPose(
    swingPivot,
    seat,
    findMotionPose(swingMotion, seconds),
  );
  const share = Math.min(1, progress * 10, (1 - progress) * 10);
  const outside = progress < 0.5 ? tyreRideStart : tyreRideFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: 0,
  };
};

const listBlockers = (): LocalBlocker[] => [
  { x: roofedTower.x, z: roofedTower.z, radius: 1.3 },
  { x: zipTower.x, z: zipTower.z, radius: 1.3 },
  ...listWallBlockers(
    {
      x: roofedTower.x + roofedTower.half,
      z: roofedTower.z - roofedTower.half,
    },
    { x: zipTower.x - zipTower.half, z: zipTower.z - zipTower.half },
    0.3,
  ),
  { x: netFoot[0], z: (netFoot[2] + netTop[2]) / 2 - 0.1, radius: 0.75 },
  { x: zipStart[0], z: zipStart[2], radius: 0.3 },
  { x: zipEnd[0], z: zipEnd[2], radius: 0.7 },
  { x: poleAt.x, z: poleAt.z, radius: 0.2 },
  { x: swingAt.x - 1.4, z: swingAt.z, radius: 0.9 },
  { x: swingAt.x + 1.4, z: swingAt.z, radius: 0.9 },
  { x: 3.6, z: 4.6, radius: 0.3 },
  { x: 2.6, z: 4.6, radius: 0.3 },
  { x: 4.6, z: 4.6, radius: 0.3 },
];

export const adventurePlaygroundModel: AttractionModel = {
  kind: "adventure-playground",
  name: "Adventure Playground",
  fact: "This wooden fort is built from logs, which come from trees. Wood is strong and a little bendy, which makes it a good material for climbing frames and bridges.",
  curriculumLink:
    "Science, Year 1 and Year 2: everyday materials. Why wood and rope suit a climbing fort.",
  footprint: 10.2,
  setting: "inland",
  signSpot: { x: -1.8, z: 9.0 },
  build: (builder) => {
    buildGrounds(builder);
    buildTower(
      builder,
      roofedTower,
      roofBase,
      ["east", "south", "west"],
      ["north", "west"],
    );
    buildRoof(builder);
    buildTower(
      builder,
      zipTower,
      zipTower.deck + railHeight + 0.1,
      ["west", "south", "east"],
      ["north", "east"],
    );
    buildBridge(builder);
    buildNet(builder);
    buildPole(builder);
    buildLadder(builder);
    buildZipWire(builder);
    buildSwingFrame(builder);
  },
  moving: [
    {
      name: "tyre-swing",
      pivot: swingPivot,
      build: buildTyre,
      motion: swingMotion,
    },
  ],
  blockers: listBlockers(),
  rides: [
    {
      id: "zip-wire",
      name: "the zip wire",
      start: zipRideStart,
      reach: 0.55,
      seconds: 9,
      finish: zipRideFinish,
      follow: zipRide,
    },
    {
      id: "rope-net",
      name: "the rope net",
      start: netRideStart,
      reach: 0.55,
      seconds: 9,
      finish: netRideFinish,
      follow: netRide,
    },
    {
      id: "tyre-swing",
      name: "the tyre swing",
      start: tyreRideStart,
      reach: 0.5,
      seconds: 8,
      finish: tyreRideFinish,
      follow: tyreRide,
    },
  ],
};
