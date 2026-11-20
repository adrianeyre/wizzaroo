import { LatheGeometry, Shape, TorusGeometry, Vector2 } from "three";
import {
  addBench,
  addBush,
  addGableRoof,
  addLampPost,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "./attraction-kit.js";

const felt = "#3f8f4a";
const teeFelt = "#2f6f3a";
const edging = "#8a5a35";
const edgingTop = "#a77447";
const cupDark = "#1d2420";
const flagColours = ["#e0473b", "#f2b51d", "#2f6fd6", "#e0473b", "#f2b51d"];
const postBlue = "#2a4f7a";
const windmillWhite = "#efe8d8";
const windmillRed = "#a8362c";
const lighthouseRed = "#c23a30";
const kioskBlue = "#3d6d8f";
const kioskWall = "#e9e0c9";

const feltTop = 0.07;

/* Putting strips */

interface Strip {
  from: { x: number; z: number };
  to: { x: number; z: number };
  width: number;
}

const stripTurn = (strip: Strip): number =>
  Math.atan2(strip.to.x - strip.from.x, strip.to.z - strip.from.z);

const stripLength = (strip: Strip): number =>
  Math.hypot(strip.to.x - strip.from.x, strip.to.z - strip.from.z);

const alongStrip = (strip: Strip, share: number, side = 0): Triple => {
  const turn = stripTurn(strip);
  return [
    strip.from.x + (strip.to.x - strip.from.x) * share + Math.cos(turn) * side,
    feltTop,
    strip.from.z + (strip.to.z - strip.from.z) * share - Math.sin(turn) * side,
  ];
};

const addStrip = (
  builder: AttractionBuilder,
  strip: Strip,
  { gapFrom = 2, gapTo = 2 }: { gapFrom?: number; gapTo?: number } = {},
) => {
  const turn = stripTurn(strip);
  const length = stripLength(strip);
  const pieces: [number, number][] =
    gapFrom < 1
      ? [
          [0, gapFrom],
          [gapTo, 1],
        ]
      : [[0, 1]];
  pieces.forEach(([start, end]) => {
    const middle = alongStrip(strip, (start + end) / 2);
    const pieceLength = length * (end - start);
    builder.box(
      "matte",
      felt,
      [strip.width, feltTop, pieceLength],
      [middle[0], feltTop / 2, middle[2]],
      [0, turn, 0],
    );
    [-1, 1].forEach((side) => {
      const edge = alongStrip(
        strip,
        (start + end) / 2,
        side * (strip.width / 2 + 0.05),
      );
      builder.box(
        "matte",
        edging,
        [0.1, 0.14, pieceLength + 0.2],
        [edge[0], 0.07, edge[2]],
        [0, turn, 0],
      );
      if (!builder.isFar) {
        builder.box(
          "matte",
          edgingTop,
          [0.11, 0.02, pieceLength + 0.2],
          [edge[0], 0.145, edge[2]],
          [0, turn, 0],
        );
      }
    });
  });
  [0, 1].forEach((end) => {
    const edge = alongStrip(strip, end);
    const out = end === 0 ? -0.05 : 0.05;
    builder.box(
      "matte",
      edging,
      [strip.width + 0.3, 0.14, 0.1],
      [edge[0] + Math.sin(turn) * out, 0.07, edge[2] + Math.cos(turn) * out],
      [0, turn, 0],
    );
  });
  const tee = alongStrip(strip, 0.6 / length);
  builder.box(
    "matte",
    teeFelt,
    [strip.width * 0.8, 0.012, 0.7],
    [tee[0], feltTop + 0.006, tee[2]],
    [0, turn, 0],
  );
};

const addCup = (builder: AttractionBuilder, at: Triple, flagColour: string) => {
  builder.cylinder("matte", cupDark, {
    radius: 0.075,
    length: 0.012,
    at: [at[0], at[1] + 0.006, at[2]],
    segments: 14,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.085,
    length: 0.008,
    at: [at[0], at[1] + 0.003, at[2]],
    segments: 14,
    isOpen: true,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.014,
    length: 0.95,
    at: [at[0], at[1] + 0.475, at[2]],
    segments: 6,
  });
  builder.box(
    "paint",
    flagColour,
    [0.012, 0.18, 0.28],
    [at[0], at[1] + 0.84, at[2] + 0.14],
  );
};

/* Hole number posts */

const digitSegments: Record<number, string> = {
  1: "bc",
  2: "abged",
  3: "abgcd",
  4: "fgbc",
  5: "afgcd",
};

const addNumberPost = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  number: number,
) => {
  const place = (dx: number, dy: number, dz: number): Triple => [
    at[0] + dx * Math.cos(turn) + dz * Math.sin(turn),
    at[1] + dy,
    at[2] - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  const rotation: Triple = [0, turn, 0];
  builder.box(
    "matte",
    palette.darkTimber,
    [0.08, 0.7, 0.08],
    place(0, 0.35, 0),
    rotation,
  );
  builder.box(
    "paint",
    postBlue,
    [0.36, 0.36, 0.05],
    place(0, 0.78, 0.03),
    rotation,
  );
  if (builder.isFar) {
    return;
  }
  const height = 0.22;
  const width = 0.12;
  const bar = 0.03;
  const segmentSpots: Record<string, [number, number, boolean]> = {
    a: [0, height / 2, true],
    g: [0, 0, true],
    d: [0, -height / 2, true],
    f: [-width / 2, height / 4, false],
    b: [width / 2, height / 4, false],
    e: [-width / 2, -height / 4, false],
    c: [width / 2, -height / 4, false],
  };
  for (const segment of digitSegments[number] ?? "") {
    const [dx, dy, isAcross] = segmentSpots[segment];
    builder.box(
      "paint",
      palette.cream,
      isAcross ? [width, bar, 0.012] : [bar, height / 2, 0.012],
      place(dx, 0.78 + dy, 0.06),
      rotation,
    );
  }
};

/* Hole 1: the windmill */

const windmillStrip: Strip = {
  from: { x: -5.4, z: 3.6 },
  to: { x: -5.4, z: -4.6 },
  width: 1.2,
};
const windmillAt = { x: -5.4, z: -1.0 };
const windmillTop = 2.5;
const sailPivot: Triple = [
  windmillAt.x,
  windmillTop - 0.25,
  windmillAt.z + 0.98,
];
const sailMotion: Motion = { kind: "spin", axis: "z", speed: 0.9 };

const buildWindmill = (builder: AttractionBuilder) => {
  const { x, z } = windmillAt;
  const tower = new LatheGeometry(
    [
      [0, 0],
      [0.95, 0],
      [0.95, 0.25],
      [0.88, 0.3],
      [0.62, windmillTop],
      [0, windmillTop],
    ].map(([radius, height]) => new Vector2(radius, height)),
    8,
  );
  builder.painted(
    tower,
    (centre) =>
      centre.y < 0.3
        ? { colour: palette.stone, finish: "matte" }
        : {
            colour:
              Math.floor(centre.y / 0.22) % 2 === 0
                ? windmillWhite
                : shade(windmillWhite, 0.93),
            finish: "matte",
          },
    { at: [x, 0, z], rotation: [0, Math.PI / 8, 0] },
    "matte",
    undefined,
  );
  builder.lathe(
    "paint",
    windmillRed,
    [
      [0, 0],
      [0.74, 0],
      [0.72, 0.12],
      [0.6, 0.38],
      [0.38, 0.62],
      [0.1, 0.76],
      [0, 0.78],
    ],
    [x, windmillTop - 0.02, z],
    "y",
    16,
  );
  builder.box("matte", cupDark, [0.62, 0.42, 2.0], [x, 0.21, z]);
  [-1, 1].forEach((end) => {
    builder.box(
      "paint",
      windmillRed,
      [0.74, 0.08, 0.1],
      [x, 0.46, z + end * 0.92],
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        windmillRed,
        [0.08, 0.46, 0.1],
        [x + side * 0.35, 0.23, z + end * 0.92],
      );
    });
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.07,
    length: 0.4,
    at: [x, windmillTop - 0.25, z + 0.8],
    axis: "z",
    segments: 10,
  });
  if (!builder.isFar) {
    [1.25, 1.85].forEach((height) => {
      [Math.PI / 2, -Math.PI / 2, Math.PI].forEach((turn) => {
        const out = 0.88 - (height / windmillTop) * 0.26;
        builder.box(
          "glass",
          palette.glass,
          [0.2, 0.28, 0.02],
          [x + Math.sin(turn) * out, height, z + Math.cos(turn) * out],
          [0, turn, 0],
        );
        builder.box(
          "paint",
          windmillRed,
          [0.26, 0.04, 0.05],
          [
            x + Math.sin(turn) * (out + 0.02),
            height - 0.16,
            z + Math.cos(turn) * (out + 0.02),
          ],
          [0, turn, 0],
        );
      });
    });
    builder.box(
      "paint",
      palette.darkTimber,
      [0.34, 0.6, 0.03],
      [x, 1.2, z + 0.85],
      [-0.12, 0, 0],
    );
  }
};

const buildSails = (builder: AttractionBuilder) => {
  builder.sphere("paint", windmillRed, 0.12, [0, 0, 0.06]);
  for (let sail = 0; sail < 4; sail++) {
    const angle = (sail / 4) * Math.PI * 2 + Math.PI / 4;
    const tip: Triple = [Math.sin(angle) * 1.45, Math.cos(angle) * 1.45, 0.05];
    builder.bar("paint", palette.darkTimber, [0, 0, 0.05], tip, 0.07, 6);
    const along = (share: number, side: number): Triple => [
      Math.sin(angle) * share * 1.45 + Math.cos(angle) * side,
      Math.cos(angle) * share * 1.45 - Math.sin(angle) * side,
      0.08,
    ];
    builder.box("matte", palette.cream, [0.32, 1.0, 0.015], along(0.62, 0.18), [
      0,
      0,
      -angle,
    ]);
    if (!builder.isFar) {
      [0.28, 0.62, 0.96].forEach((share) => {
        builder.bar(
          "paint",
          palette.darkTimber,
          along(share, 0),
          along(share, 0.36),
          0.03,
          4,
        );
      });
      builder.bar(
        "paint",
        palette.darkTimber,
        along(0.26, 0.36),
        along(0.98, 0.36),
        0.03,
        4,
      );
    }
  }
};

/* Hole 2: the loop-the-loop */

const loopStrip: Strip = {
  from: { x: -3.0, z: 4.4 },
  to: { x: 3.6, z: 4.4 },
  width: 1.1,
};
const loopAt = { x: 0.5, z: 4.4 };
const loopRadius = 0.58;

const buildLoop = (builder: AttractionBuilder) => {
  const centre: Triple = [loopAt.x, feltTop + loopRadius + 0.03, loopAt.z];
  builder.add(
    "paint",
    "#d1453b",
    new TorusGeometry(loopRadius + 0.03, 0.04, 4, builder.segments(32, 14)),
    { at: centre, scale: [1, 1, 5.2] },
  );
  [-1, 1].forEach((side) => {
    builder.add(
      "metal",
      palette.steel,
      new TorusGeometry(loopRadius - 0.04, 0.025, 6, builder.segments(32, 14)),
      { at: [centre[0], centre[1], centre[2] + side * 0.19] },
    );
    builder.bar(
      "metal",
      palette.steel,
      [centre[0] + side * 0.35, 0, centre[2] - 0.45],
      [centre[0] + side * 0.35, centre[1] + 0.3, centre[2] - 0.22],
      0.04,
      6,
    );
  });
  builder.box(
    "paint",
    "#d1453b",
    [1.6, 0.04, 0.36],
    [centre[0], feltTop + 0.02, centre[2]],
  );
};

/* Hole 3: the bridge over the stream */

const bridgeStrip: Strip = {
  from: { x: 5.4, z: 3.2 },
  to: { x: 5.4, z: -4.6 },
  width: 1.1,
};
const streamZ = -0.6;
const streamHalf = 0.55;
const archHeight = 0.42;

const findBridgeLift = (z: number): number => {
  const span = streamHalf + 0.5;
  const share = Math.max(0, 1 - ((z - streamZ) / span) ** 2);
  return archHeight * share;
};

const buildBridgeHole = (builder: AttractionBuilder) => {
  const share = (z: number) =>
    (z - bridgeStrip.from.z) / (bridgeStrip.to.z - bridgeStrip.from.z);
  const span = streamHalf + 0.5;
  addStrip(builder, bridgeStrip, {
    gapFrom: share(streamZ + span),
    gapTo: share(streamZ - span),
  });
  builder.box(
    "water",
    palette.water,
    [4.2, 0.06, streamHalf * 2],
    [5.2, 0.06, streamZ],
  );
  builder.box(
    "matte",
    "#6b6152",
    [4.3, 0.05, streamHalf * 2 + 0.1],
    [5.2, 0.02, streamZ],
  );
  if (!builder.isFar) {
    for (let stone = 0; stone < 14; stone++) {
      const side = stone % 2 === 0 ? 1 : -1;
      const x = 3.3 + stone * 0.29;
      if (Math.abs(x - 5.4) < 0.75) {
        continue;
      }
      builder.sphere(
        "matte",
        shade(palette.stone, 0.85 + (stone % 3) * 0.08),
        0.13,
        [x, 0.05, streamZ + side * (streamHalf + 0.04)],
        [1.3, 0.6, 1],
        6,
      );
    }
  }
  const steps = builder.segments(14, 6);
  const half = bridgeStrip.width / 2;
  const stations = Array.from({ length: steps + 1 }, (_, step) => {
    const z = streamZ + span - (span * 2 * step) / steps;
    const lift = findBridgeLift(z) + feltTop;
    return {
      z,
      points: [
        [bridgeStrip.from.x - half - 0.1, lift + 0.08] as const,
        [bridgeStrip.from.x - half, lift + 0.08] as const,
        [bridgeStrip.from.x - half, lift] as const,
        [bridgeStrip.from.x + half, lift] as const,
        [bridgeStrip.from.x + half, lift + 0.08] as const,
        [bridgeStrip.from.x + half + 0.1, lift + 0.08] as const,
        [bridgeStrip.from.x + half + 0.1, lift - 0.12] as const,
        [bridgeStrip.from.x - half - 0.1, lift - 0.12] as const,
      ],
    };
  });
  builder.loft({
    stations,
    paint: (centre, normal) =>
      normal.y > 0.6 && Math.abs(centre.x - bridgeStrip.from.x) < half - 0.01
        ? { colour: felt, finish: "matte" }
        : { colour: edging, finish: "matte" },
    finish: "matte",
  });
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      const x = bridgeStrip.from.x + side * (half + 0.05);
      const posts = 5;
      for (let post = 0; post <= posts; post++) {
        const z = streamZ + span * 0.8 - (span * 1.6 * post) / posts;
        const lift = findBridgeLift(z) + feltTop + 0.08;
        builder.bar(
          "paint",
          palette.white,
          [x, lift, z],
          [x, lift + 0.32, z],
          0.04,
          5,
        );
        if (post < posts) {
          const nextZ =
            streamZ + span * 0.8 - (span * 1.6 * (post + 1)) / posts;
          const nextLift = findBridgeLift(nextZ) + feltTop + 0.08;
          builder.bar(
            "paint",
            palette.white,
            [x, lift + 0.3, z],
            [x, nextLift + 0.3, nextZ],
            0.04,
            5,
          );
        }
      }
    });
  }
};

/* Hole 4: round the lighthouse */

const lighthouseStrip: Strip = {
  from: { x: -2.9, z: 1.0 },
  to: { x: 3.4, z: 1.0 },
  width: 1.8,
};
const lighthouseAt = { x: 0.6, z: 1.0 };
const ballCup: Triple = [2.8, feltTop, 1.0];
const ballMotion: Motion = { kind: "spin", axis: "y", speed: 2.4 };

const buildLighthouse = (builder: AttractionBuilder) => {
  const { x, z } = lighthouseAt;
  builder.cylinder("matte", palette.stone, {
    radius: 0.46,
    radiusEnd: 0.4,
    length: 0.22,
    at: [x, feltTop + 0.11, z],
    segments: 14,
  });
  const towerHeight = 1.7;
  const tower = new LatheGeometry(
    [
      [0, 0],
      [0.34, 0],
      [0.22, towerHeight],
      [0, towerHeight],
    ].map(([radius, height]) => new Vector2(radius, height)),
    builder.segments(16, 8),
  );
  builder.painted(
    tower,
    (centre) => ({
      colour:
        Math.floor((centre.y - feltTop - 0.22) / 0.34) % 2 === 0
          ? lighthouseRed
          : palette.white,
      finish: "paint",
    }),
    { at: [x, feltTop + 0.22, z] },
    "paint",
  );
  const top = feltTop + 0.22 + towerHeight;
  builder.cylinder("paint", palette.black, {
    radius: 0.34,
    length: 0.05,
    at: [x, top + 0.025, z],
    segments: 16,
  });
  builder.cylinder("glow", palette.warmLight, {
    radius: 0.15,
    length: 0.3,
    at: [x, top + 0.2, z],
    segments: 10,
  });
  builder.lathe(
    "paint",
    lighthouseRed,
    [
      [0, 0],
      [0.22, 0],
      [0.18, 0.08],
      [0.04, 0.26],
      [0, 0.3],
    ],
    [x, top + 0.35, z],
    "y",
    12,
  );
  if (!builder.isFar) {
    builder.torus(
      "metal",
      palette.black,
      0.31,
      0.015,
      [x, top + 0.2, z],
      "y",
      18,
    );
    for (let post = 0; post < 8; post++) {
      const angle = (post / 8) * Math.PI * 2;
      builder.bar(
        "metal",
        palette.black,
        [x + Math.sin(angle) * 0.31, top + 0.05, z + Math.cos(angle) * 0.31],
        [x + Math.sin(angle) * 0.31, top + 0.2, z + Math.cos(angle) * 0.31],
        0.015,
        4,
      );
      builder.bar(
        "metal",
        palette.black,
        [x + Math.sin(angle) * 0.15, top + 0.05, z + Math.cos(angle) * 0.15],
        [x + Math.sin(angle) * 0.15, top + 0.35, z + Math.cos(angle) * 0.15],
        0.02,
        4,
      );
    }
    builder.box(
      "paint",
      palette.darkTimber,
      [0.2, 0.34, 0.02],
      [x, feltTop + 0.42, z + 0.31],
      [-0.06, 0, 0],
    );
  }
};

const buildBall = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    palette.white,
    0.045,
    [0.13, 0.045, 0],
    [1, 1, 1],
    10,
  );
};

/* Hole 5: up the ramp */

const rampStrip: Strip = {
  from: { x: -2.9, z: -3.0 },
  to: { x: 3.4, z: -3.0 },
  width: 1.1,
};
const plateauHeight = 0.32;

const buildRamp = (builder: AttractionBuilder) => {
  const rampFrom = 0.4;
  const rampTo = 1.7;
  const rampLength = Math.hypot(rampTo - rampFrom, plateauHeight);
  const angle = Math.atan2(plateauHeight, rampTo - rampFrom);
  builder.box(
    "matte",
    felt,
    [rampLength, 0.06, rampStrip.width],
    [(rampFrom + rampTo) / 2, feltTop + plateauHeight / 2, rampStrip.from.z],
    [0, 0, angle],
  );
  builder.endPlate(
    "matte",
    edging,
    new Shape([
      new Vector2(rampFrom, feltTop),
      new Vector2(rampTo, feltTop),
      new Vector2(rampTo, feltTop + plateauHeight + 0.1),
      new Vector2(rampFrom, feltTop + 0.08),
    ]),
    rampStrip.from.z - rampStrip.width / 2 - 0.1,
    rampStrip.from.z + rampStrip.width / 2 + 0.1,
  );
  builder.box(
    "matte",
    felt,
    [rampStrip.to.x - rampTo, plateauHeight, rampStrip.width],
    [
      (rampTo + rampStrip.to.x) / 2,
      feltTop + plateauHeight / 2,
      rampStrip.from.z,
    ],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      edging,
      [rampStrip.to.x - rampTo + 0.1, plateauHeight + 0.14, 0.1],
      [
        (rampTo + rampStrip.to.x) / 2,
        (feltTop + plateauHeight + 0.14) / 2,
        rampStrip.from.z + side * (rampStrip.width / 2 + 0.05),
      ],
    );
  });
  if (!builder.isFar) {
    [-0.35, 0, 0.35].forEach((side) => {
      builder.box(
        "paint",
        palette.white,
        [0.12, 0.01, 0.05],
        [rampFrom - 0.2, feltTop + 0.005, rampStrip.from.z + side],
      );
    });
  }
};

/* The kiosk */

const kioskAt = { x: 0.4, z: -6.6 };

const buildKiosk = (builder: AttractionBuilder) => {
  const { x, z } = kioskAt;
  builder.box("matte", palette.darkStone, [2.4, 0.12, 1.7], [x, 0.06, z]);
  const boards = builder.isFar ? 1 : 8;
  for (let board = 0; board < boards; board++) {
    const height = 1.6 / boards;
    builder.box(
      "matte",
      board % 2 === 0 ? kioskWall : shade(kioskWall, 0.95),
      [2.2 + (board % 2) * 0.02, height, 1.5 + (board % 2) * 0.02],
      [x, 0.12 + height * (board + 0.5), z],
    );
  }
  [-1, 1].forEach((alongX) => {
    [-1, 1].forEach((alongZ) => {
      builder.box(
        "paint",
        kioskBlue,
        [0.1, 1.62, 0.1],
        [x + alongX * 1.1, 0.93, z + alongZ * 0.75],
      );
    });
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [1.3, 0.55, 0.04],
    [x - 0.15, 1.08, z + 0.76],
  );
  builder.box(
    "paint",
    palette.cream,
    [1.45, 0.06, 0.24],
    [x - 0.15, 0.8, z + 0.84],
  );
  addGableRoof(builder, {
    width: 2.3,
    depth: 1.6,
    rise: 0.55,
    at: [x, 1.72, z],
    colour: palette.slate,
    overhang: 0.16,
  });
  builder.box("matte", palette.cream, [2.3, 0.04, 0.04], [x, 2.27, z]);
  builder.sidePlate(
    "matte",
    kioskBlue,
    new Shape([
      new Vector2(-z - 0.8, 1.72),
      new Vector2(-z + 0.8, 1.72),
      new Vector2(-z, 2.24),
    ]),
    x,
    2.2,
  );
  const stripes = builder.isFar ? 2 : 8;
  for (let stripe = 0; stripe < stripes; stripe++) {
    const width = 1.6 / stripes;
    builder.box(
      "matte",
      stripe % 2 === 0 ? "#d8453b" : palette.cream,
      [width, 0.03, 0.62],
      [x - 0.95 + width * (stripe + 0.5), 1.55, z + 1.0],
      [0.38, 0, 0],
    );
  }
  addDoorPanel(builder, [x + 0.78, 0.12, z + 0.76]);
  if (!builder.isFar) {
    const rackAt: Triple = [x - 1.45, 0, z + 0.9];
    builder.box(
      "matte",
      palette.paleTimber,
      [0.6, 0.06, 0.24],
      [rackAt[0], 0.62, rackAt[2]],
    );
    [-0.25, 0.25].forEach((side) => {
      builder.box(
        "matte",
        palette.paleTimber,
        [0.05, 0.62, 0.05],
        [rackAt[0] + side, 0.31, rackAt[2]],
      );
    });
    [-0.18, -0.06, 0.06, 0.18].forEach((side, index) => {
      builder.bar(
        "metal",
        palette.steel,
        [rackAt[0] + side, 0.05, rackAt[2] + 0.04],
        [rackAt[0] + side, 0.78, rackAt[2] - 0.02],
        0.02,
        4,
      );
      builder.cylinder("matte", flagColours[index], {
        radius: 0.025,
        length: 0.14,
        at: [rackAt[0] + side, 0.76, rackAt[2] - 0.02],
        segments: 6,
      });
      builder.box(
        "metal",
        palette.darkSteel,
        [0.05, 0.04, 0.12],
        [rackAt[0] + side, 0.04, rackAt[2] + 0.08],
      );
    });
    builder.cylinder("paint", "#d8453b", {
      radius: 0.15,
      radiusEnd: 0.18,
      length: 0.26,
      at: [x + 0.25, 0.96, z + 0.86],
      segments: 12,
    });
    [0, 1, 2, 3, 4].forEach((ball) => {
      const angle = ball * 1.3;
      builder.sphere(
        "paint",
        ball % 2 === 0 ? palette.white : "#f2b51d",
        0.05,
        [
          x + 0.25 + Math.sin(angle) * 0.07,
          1.1,
          z + 0.86 + Math.cos(angle) * 0.07,
        ],
        [1, 1, 1],
        8,
      );
    });
    builder.box(
      "paint",
      palette.black,
      [0.6, 0.4, 0.04],
      [x - 0.15, 1.86, z + 0.92],
    );
    [0, 1, 2].forEach((line) => {
      builder.box(
        "paint",
        palette.white,
        [0.42 - line * 0.08, 0.035, 0.01],
        [x - 0.15, 1.96 - line * 0.09, z + 0.95],
      );
    });
  }
};

const addDoorPanel = (builder: AttractionBuilder, at: Triple) => {
  builder.box(
    "paint",
    palette.cream,
    [0.5, 1.15, 0.04],
    [at[0], at[1] + 0.575, at[2]],
  );
  builder.box(
    "paint",
    kioskBlue,
    [0.4, 1.02, 0.03],
    [at[0], at[1] + 0.56, at[2] + 0.02],
  );
  builder.sphere("metal", palette.brass, 0.025, [
    at[0] - 0.14,
    at[1] + 0.58,
    at[2] + 0.05,
  ]);
};

/* The grounds */

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.path, [1.5, 0.04, 3.4], [-1.2, 0.02, 7.6]);
  builder.box("matte", palette.path, [9.4, 0.04, 1.2], [0.2, 0.02, 2.75]);
  builder.box("matte", palette.path, [9.4, 0.04, 1.2], [0.2, 0.02, -1.0]);
  builder.box("matte", palette.path, [6.4, 0.04, 1.4], [0.3, 0.02, -4.9]);
  addSignBoard(builder, [-2.6, 0, 7.0], postBlue);
  addLampPost(builder, [0.2, 0, 6.2]);
  addBench(builder, [3.4, 0, -5.4], -Math.PI / 2);
  addBench(builder, [-3.1, 0, 6.3], Math.PI);
  addBush(builder, [-7.2, 0, -3.6], 0.6, "#3a7d34");
  addBush(builder, [-7.0, 0, 2.2], 0.5);
  addBush(builder, [7.4, 0, 0.8], 0.55, "#3a7d34");
  addBush(builder, [6.8, 0, -5.8], 0.6);
  addBush(builder, [4.2, 0, 6.6], 0.5, "#3c8237");
  addBush(builder, [-2.6, 0, -6.6], 0.55);
};

const listStripBlockers = (): LocalBlocker[] => [
  { x: windmillAt.x, z: windmillAt.z, radius: 1.0 },
  { x: lighthouseAt.x, z: lighthouseAt.z, radius: 0.5 },
  { x: loopAt.x, z: loopAt.z, radius: 0.7 },
  { x: kioskAt.x - 0.6, z: kioskAt.z, radius: 0.95 },
  { x: kioskAt.x + 0.6, z: kioskAt.z, radius: 0.95 },
  { x: kioskAt.x - 1.45, z: kioskAt.z + 0.9, radius: 0.35 },
  { x: 0.2, z: 6.2, radius: 0.2 },
  { x: 3.4, z: -5.4, radius: 0.5 },
  { x: -3.1, z: 6.3, radius: 0.5 },
];

export const crazyGolfModel: AttractionModel = {
  kind: "crazy-golf",
  name: "Crazy Golf",
  fact: "A golf ball slows down as it rolls because of friction between the ball and the green. On the rough felt there is more friction than on a smooth surface, so you need a firmer push to reach the hole.",
  curriculumLink:
    "Science, Year 5: forces. Friction acts between moving surfaces and slows them down.",
  footprint: 9.8,
  setting: "inland",
  signSpot: { x: -2.6, z: 7.9 },
  build: (builder) => {
    buildGrounds(builder);
    addStrip(builder, windmillStrip);
    buildWindmill(builder);
    addCup(builder, alongStrip(windmillStrip, 0.92), flagColours[0]);
    addNumberPost(builder, [-6.35, 0, 3.3], Math.PI / 2, 1);
    addStrip(builder, loopStrip);
    buildLoop(builder);
    addCup(builder, alongStrip(loopStrip, 0.9), flagColours[1]);
    addNumberPost(builder, [-3.2, 0, 5.25], 0, 2);
    buildBridgeHole(builder);
    addCup(builder, alongStrip(bridgeStrip, 0.92), flagColours[2]);
    addNumberPost(builder, [6.35, 0, 2.9], -Math.PI / 2, 3);
    addStrip(builder, lighthouseStrip);
    buildLighthouse(builder);
    addCup(builder, ballCup, flagColours[3]);
    addNumberPost(builder, [-3.2, 0, 2.1], 0, 4);
    addStrip(builder, rampStrip);
    buildRamp(builder);
    addCup(
      builder,
      [2.9, feltTop + plateauHeight, rampStrip.from.z],
      flagColours[4],
    );
    addNumberPost(builder, [-3.2, 0, -2.15], 0, 5);
    buildKiosk(builder);
  },
  moving: [
    {
      name: "windmill-sails",
      pivot: sailPivot,
      build: buildSails,
      motion: sailMotion,
    },
    { name: "golf-ball", pivot: ballCup, build: buildBall, motion: ballMotion },
  ],
  blockers: listStripBlockers(),
};
