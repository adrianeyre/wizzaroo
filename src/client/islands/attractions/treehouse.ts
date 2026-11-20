import {
  CylinderGeometry,
  Euler,
  Quaternion,
  TorusGeometry,
  Vector3,
} from "three";
import {
  addBush,
  addDoor,
  addSignBoard,
  addWindow,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Motion,
  type Triple,
} from "./attraction-kit.js";

const bark = "#6b4a32";
const darkBark = "#4e3424";
const plank = "#a8774a";
const darkPlank = "#7d5634";
const shingle = "#8a4b33";
const leafColours = ["#3f8a3a", "#4f9a44", "#2f7432", "#5aa04a"];

/* The giant tree */

const tree = { x: 0, z: -1 };
const deckHeight = 3.2;
const deckTop = deckHeight + 0.09;
const deckRadius = 3.0;
const railRadius = 2.86;
const trunkRadiusAtDeck = 0.64;

const upright = new Vector3(0, 1, 0);

/** A round bar that tapers from `fromRadius` to `toRadius`. */
const addTaperedBar = (
  builder: AttractionBuilder,
  colour: string,
  from: Triple,
  to: Triple,
  fromRadius: number,
  toRadius: number,
  segments = 8,
) => {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(upright, direction.clone().normalize()),
  );
  const middle = start.add(direction.clone().multiplyScalar(0.5));
  builder.add(
    "matte",
    colour,
    new CylinderGeometry(
      toRadius,
      fromRadius,
      direction.length(),
      builder.segments(segments, Math.max(4, Math.round(segments / 2))),
    ),
    { at: [middle.x, middle.y, middle.z], rotation: [turn.x, turn.y, turn.z] },
  );
};

const aroundTree = (angle: number, radius: number, y: number): Triple => [
  tree.x + Math.sin(angle) * radius,
  y,
  tree.z + Math.cos(angle) * radius,
];

const buildTree = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    bark,
    [
      [0, -0.1],
      [1.25, -0.1],
      [1.05, 0.25],
      [0.82, 0.8],
      [0.7, 1.8],
      [0.64, 3.2],
      [0.58, 4.6],
      [0.5, 6.0],
      [0.36, 7.6],
      [0, 7.8],
    ],
    [tree.x, 0, tree.z],
    "y",
    builder.segments(14, 8),
  );
  const roots = 6;
  for (let root = 0; root < roots; root++) {
    const angle = (root / roots) * Math.PI * 2 + 0.4;
    addTaperedBar(
      builder,
      root % 2 === 0 ? bark : darkBark,
      aroundTree(angle, 0.55, 0.7),
      aroundTree(angle + 0.15, 1.9 + (root % 3) * 0.25, -0.05),
      0.32,
      0.08,
    );
  }
  const branches: [number, number, number, number][] = [
    [0.5, 4.8, 2.6, 7.0],
    [2.3, 5.1, 2.4, 7.2],
    [3.9, 4.9, 2.5, 6.9],
    [5.4, 5.3, 2.2, 7.4],
    [-0.9, 5.4, 2.6, 6.2],
  ];
  branches.forEach(([angle, fromY, reach, toY]) => {
    addTaperedBar(
      builder,
      bark,
      aroundTree(angle, 0.3, fromY),
      aroundTree(angle, reach, toY),
      0.24,
      0.1,
      7,
    );
  });
  const clumps: [number, number, number, number][] = builder.isFar
    ? [
        [0, 0, 8.0, 3.2],
        [2.0, 2.3, 7.2, 2.2],
        [4.2, 2.3, 7.2, 2.2],
      ]
    : [
        [0, 0, 8.4, 2.5],
        [0.5, 2.4, 7.3, 1.9],
        [1.8, 2.5, 7.6, 1.8],
        [3.0, 2.4, 7.2, 1.9],
        [4.2, 2.5, 7.5, 1.8],
        [5.4, 2.3, 7.4, 1.9],
        [-0.9, 2.7, 6.6, 1.5],
        [1.2, 1.4, 9.4, 1.7],
        [3.8, 1.4, 9.3, 1.7],
        [5.6, 1.2, 9.7, 1.4],
        [2.6, 3.6, 6.5, 1.15],
        [4.9, 3.5, 6.4, 1.1],
        [0.2, 3.4, 6.3, 1.1],
        [6.0, 3.3, 6.6, 1.0],
        [2.5, 0.6, 10.3, 1.3],
        [0.3, 3.0, 8.4, 1.2],
        [3.4, 3.0, 8.5, 1.25],
      ];
  clumps.forEach(([angle, reach, y, radius], index) => {
    builder.sphere(
      "matte",
      index >= 10 && index % 2 === 0
        ? shade(leafColours[index % leafColours.length], 1.12)
        : leafColours[index % leafColours.length],
      radius,
      aroundTree(angle, reach, y),
      [1, 0.78, 1],
      builder.isFar ? 18 : 12,
    );
  });
};

/* The platform */

const railGaps = [0, 0.82];
const isInRailGap = (angle: number): boolean =>
  railGaps.some(
    (gap) =>
      Math.abs(Math.atan2(Math.sin(angle - gap), Math.cos(angle - gap))) < 0.2,
  );

const buildPlatform = (builder: AttractionBuilder) => {
  builder.cylinder("matte", darkPlank, {
    radius: deckRadius,
    length: 0.18,
    at: [tree.x, deckHeight, tree.z],
    segments: 12,
  });
  if (!builder.isFar) {
    const boards = 13;
    const width = (deckRadius * 2) / boards;
    for (let board = 0; board < boards; board++) {
      const across = -deckRadius + width * (board + 0.5);
      const half = Math.sqrt(deckRadius ** 2 - across ** 2) * 0.97;
      builder.box(
        "matte",
        board % 3 === 0 ? shade(plank, 0.93) : plank,
        [width - 0.03, 0.03, half * 2],
        [tree.x + across, deckTop - 0.005, tree.z],
      );
    }
  }
  const braces = 6;
  for (let brace = 0; brace < braces; brace++) {
    const angle = (brace / braces) * Math.PI * 2 + 0.25;
    builder.bar(
      "matte",
      darkPlank,
      aroundTree(angle, 0.55, 1.9),
      aroundTree(angle, 2.3, deckHeight - 0.08),
      0.14,
      5,
    );
  }
  const posts = builder.isFar ? 10 : 18;
  const postAngles = Array.from(
    { length: posts },
    (_, post) => (post / posts) * Math.PI * 2,
  ).filter((angle) => !isInRailGap(angle));
  postAngles.forEach((angle) => {
    const base = aroundTree(angle, railRadius, deckTop);
    builder.box(
      "matte",
      darkPlank,
      [0.09, 0.9, 0.09],
      [base[0], deckTop + 0.45, base[2]],
      [0, angle, 0],
    );
  });
  for (let post = 0; post < posts; post++) {
    const from = (post / posts) * Math.PI * 2;
    const to = ((post + 1) / posts) * Math.PI * 2;
    if (isInRailGap(from) || isInRailGap(to)) {
      continue;
    }
    [0.88, 0.45].forEach((height, rail) => {
      if (builder.isFar && rail === 1) {
        return;
      }
      builder.bar(
        "matte",
        rail === 0 ? plank : darkPlank,
        aroundTree(from, railRadius, deckTop + height),
        aroundTree(to, railRadius, deckTop + height),
        rail === 0 ? 0.08 : 0.05,
        5,
      );
    });
  }
};

const buntingColours = ["#c8302a", "#e9b632", "#2f6fd6", "#3f8a3a", "#f4f1ea"];

const buildBunting = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const runs: [number, number][] = [
    [-0.85, -0.25],
    [0.25, 0.62],
    [1.02, 1.9],
  ];
  let flag = 0;
  runs.forEach(([from, to]) => {
    const count = Math.max(2, Math.round(((to - from) * railRadius) / 0.32));
    for (let index = 0; index <= count; index++) {
      const angle = from + ((to - from) * index) / count;
      const sag = Math.sin((index / count) * Math.PI) * 0.12;
      const flagGeometry = new CylinderGeometry(0.14, 0.14, 0.01, 3);
      flagGeometry.rotateX(Math.PI / 2);
      flagGeometry.rotateY(angle);
      builder.add(
        "matte",
        buntingColours[flag % buntingColours.length],
        flagGeometry,
        { at: aroundTree(angle, railRadius + 0.06, deckTop + 0.74 - sag) },
      );
      flag += 1;
    }
  });
};

/* The cabin */

const cabin = { x: -2.0, z: -1.0, width: 1.3, depth: 1.9, wall: 1.35 };
const cabinRise = 0.6;

const buildCabin = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = cabin;
  builder.box("matte", plank, [width, wall, depth], [x, deckTop + wall / 2, z]);
  if (!builder.isFar) {
    const strips = 6;
    for (let strip = 0; strip <= strips; strip++) {
      const across = -width / 2 + (strip / strips) * width;
      [-1, 1].forEach((end) => {
        builder.box(
          "matte",
          darkPlank,
          [0.035, wall, 0.02],
          [x + across, deckTop + wall / 2, z + end * (depth / 2 + 0.01)],
        );
      });
    }
    for (let strip = 1; strip < 8; strip++) {
      const along = -depth / 2 + (strip / 8) * depth;
      builder.box(
        "matte",
        darkPlank,
        [0.02, wall, 0.035],
        [x - width / 2 - 0.01, deckTop + wall / 2, z + along],
      );
    }
  }
  const halfWidth = width / 2 + 0.2;
  const slope = Math.hypot(halfWidth, cabinRise);
  const angle = Math.atan2(cabinRise, halfWidth);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shingle,
      [slope, 0.08, depth + 0.4],
      [x + (side * halfWidth) / 2, deckTop + wall + cabinRise / 2, z],
      [0, 0, -side * angle],
    );
    if (!builder.isFar) {
      for (let row = 1; row < 4; row++) {
        const share = row / 4;
        builder.box(
          "matte",
          shade(shingle, 0.82),
          [0.03, 0.03, depth + 0.42],
          [
            x + side * halfWidth * (1 - share),
            deckTop + wall + cabinRise * share + 0.04,
            z,
          ],
          [0, 0, -side * angle],
        );
      }
    }
  });
  [-1, 1].forEach((end) => {
    builder.lathe(
      "matte",
      plank,
      [
        [0, cabinRise],
        [width * 0.71, 0],
        [0, 0],
      ],
      [x, deckTop + wall, z + end * (depth / 2 - 0.02)],
      "y",
      4,
    );
  });
  builder.box(
    "matte",
    darkBark,
    [0.1, 0.1, depth + 0.5],
    [x, deckTop + wall + cabinRise + 0.02, z],
  );
  const flagPole: Triple = [x, deckTop + wall + cabinRise, z - depth / 2 + 0.1];
  builder.cylinder("matte", darkBark, {
    radius: 0.025,
    length: 0.8,
    at: [flagPole[0], flagPole[1] + 0.4, flagPole[2]],
    segments: 5,
  });
  builder.box(
    "matte",
    "#c8302a",
    [0.02, 0.22, 0.34],
    [flagPole[0], flagPole[1] + 0.68, flagPole[2] + 0.18],
  );
  const front = z + depth / 2;
  addDoor(builder, {
    at: [x + 0.18, deckTop, front + 0.01],
    width: 0.5,
    height: 0.98,
    colour: "#3d6b4a",
    frame: palette.cream,
  });
  addWindow(builder, {
    at: [x - width / 2 - 0.01, deckTop + 0.8, z],
    width: 0.55,
    height: 0.45,
    frame: palette.cream,
    turn: -Math.PI / 2,
    isLit: true,
  });
  builder.cylinder("glass", palette.glass, {
    radius: 0.17,
    length: 0.04,
    at: [x, deckTop + wall + 0.22, front + 0.02],
    axis: "z",
    segments: 12,
  });
  if (!builder.isFar) {
    builder.torus(
      "matte",
      palette.cream,
      0.18,
      0.03,
      [x, deckTop + wall + 0.22, front + 0.04],
      "z",
      14,
    );
    builder.bar(
      "metal",
      palette.black,
      [x - 0.3, deckTop + 1.2, front + 0.02],
      [x - 0.3, deckTop + 1.2, front + 0.22],
      0.025,
      4,
    );
    builder.box(
      "glow",
      palette.warmLight,
      [0.12, 0.16, 0.12],
      [x - 0.3, deckTop + 1.04, front + 0.22],
    );
    builder.box(
      "paint",
      palette.black,
      [0.16, 0.03, 0.16],
      [x - 0.3, deckTop + 1.135, front + 0.22],
    );
    builder.box(
      "matte",
      palette.timber,
      [0.32, 0.36, 0.06],
      [tree.x + 0.05, 5.1, tree.z + 0.55],
    );
    builder.sphere(
      "matte",
      palette.black,
      0.05,
      [tree.x + 0.05, 5.15, tree.z + 0.59],
      [1, 1, 0.4],
      8,
    );
    addTaperedBar(
      builder,
      shingle,
      [tree.x - 0.2, 5.33, tree.z + 0.55],
      [tree.x + 0.3, 5.33, tree.z + 0.55],
      0.03,
      0.03,
      4,
    );
  }
};

/* The ladder */

const ladder = { x: 0, footZ: 3.15, topZ: 1.9 };

const buildLadder = (builder: AttractionBuilder) => {
  [-0.3, 0.3].forEach((side) => {
    builder.bar(
      "matte",
      darkPlank,
      [ladder.x + side, 0, ladder.footZ],
      [ladder.x + side, deckTop + 0.85, ladder.topZ - 0.05],
      0.09,
      6,
    );
  });
  const rungs = builder.isFar ? 4 : 9;
  for (let rung = 1; rung <= rungs; rung++) {
    const share = rung / (rungs + 1);
    const height = share * deckTop;
    builder.cylinder("matte", plank, {
      radius: 0.035,
      length: 0.62,
      at: [
        ladder.x,
        height,
        ladder.footZ +
          (ladder.topZ - 0.05 - ladder.footZ) * (height / (deckTop + 0.85)),
      ],
      axis: "x",
      segments: 6,
    });
  }
};

const ladderStart = { x: ladder.x, z: 3.8 };
const ladderFinish = { x: ladder.x, z: 1.1 };

const ladderRide = (progress: number): LocalSpot => {
  const foot = { z: ladder.footZ + 0.25 };
  const top = { z: ladder.topZ - 0.1 };
  if (progress < 0.1) {
    const share = progress / 0.1;
    return {
      x: ladder.x,
      y: 0,
      z: ladderStart.z + (foot.z - ladderStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.82) {
    const share = (progress - 0.1) / 0.72;
    return {
      x: ladder.x,
      y: share * deckTop,
      z: foot.z + (top.z - foot.z) * share,
      heading: Math.PI,
    };
  }
  const share = (progress - 0.82) / 0.18;
  return {
    x: ladder.x,
    y: deckTop,
    z: top.z + (ladderFinish.z - top.z) * share,
    heading: Math.PI,
  };
};

/* The slide */

const slide = { x: 2.2, topZ: 0.95, bottomZ: 5.4, bottom: 0.3 };

const findSlideHeight = (z: number): number => {
  const share = Math.min(
    1,
    Math.max(0, (z - slide.topZ) / (slide.bottomZ - slide.topZ)),
  );
  const eased =
    share < 0.08
      ? 1 - share * 0.4
      : share < 0.85
        ? 0.968 - ((share - 0.08) / 0.77) ** 1.15 * 0.9
        : 0.068 - (share - 0.85) * 0.45;
  return slide.bottom + (deckTop - slide.bottom) * Math.max(0, eased);
};

const buildSlide = (builder: AttractionBuilder) => {
  const { x } = slide;
  const steps = builder.segments(20, 8);
  const stations = Array.from({ length: steps + 1 }, (_, step) => {
    const along = slide.topZ + ((slide.bottomZ - slide.topZ) * step) / steps;
    const lift = findSlideHeight(along);
    const half = 0.36;
    const wall = 0.26;
    return {
      z: along,
      points: [
        [x - half - 0.05, lift + wall] as const,
        [x - half, lift + 0.04] as const,
        [x - half * 0.6, lift - 0.02] as const,
        [x + half * 0.6, lift - 0.02] as const,
        [x + half, lift + 0.04] as const,
        [x + half + 0.05, lift + wall] as const,
        [x + half + 0.09, lift + wall] as const,
        [x + half + 0.06, lift - 0.07] as const,
        [x - half - 0.06, lift - 0.07] as const,
        [x - half - 0.09, lift + wall] as const,
      ],
    };
  });
  builder.loft({
    stations,
    paint: () => ({ colour: "#e9b632", finish: "paint" }),
  });
  [2.6, 4.3].forEach((legZ) => {
    const height = findSlideHeight(legZ);
    [-0.42, 0.42].forEach((side) => {
      builder.cylinder("matte", darkPlank, {
        radius: 0.06,
        length: height,
        at: [x + side, height / 2, legZ],
        segments: 6,
      });
    });
  });
  builder.box(
    "matte",
    "#b39468",
    [1.4, 0.05, 1.6],
    [x, 0.025, slide.bottomZ + 0.6],
  );
};

const slideStart = { x: 1.75, z: 0.45 };
const slideFinish = { x: slide.x, z: 6.75 };

const slideRide = (progress: number): LocalSpot => {
  if (progress < 0.16) {
    const share = progress / 0.16;
    return {
      x: slideStart.x + (slide.x - slideStart.x) * share,
      y: deckTop,
      z: slideStart.z + (slide.topZ + 0.15 - slideStart.z) * share,
      heading: 0,
    };
  }
  const share = ((progress - 0.16) / 0.84) ** 1.5;
  const end = slide.bottomZ + 0.7;
  const along = slide.topZ + 0.15 + (end - slide.topZ - 0.15) * share;
  return {
    x: slide.x,
    y:
      along > slide.bottomZ
        ? Math.max(0, slide.bottom * (1 - (along - slide.bottomZ) / 0.7))
        : findSlideHeight(along) + 0.02,
    z: along,
    heading: 0,
  };
};

/* The tyre swing */

const swingPivot: Triple = [-2.95, 5.75, 1.95];
const ropeDrop = 4.85;
const swingMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.16,
  period: 4.4,
};

const buildSwingBranch = (builder: AttractionBuilder) => {
  addTaperedBar(
    builder,
    bark,
    aroundTree(-0.9, 0.35, 5.2),
    [swingPivot[0] - 0.4, swingPivot[1] + 0.12, swingPivot[2] + 0.4],
    0.2,
    0.09,
    7,
  );
};

const buildTyreSwing = (builder: AttractionBuilder) => {
  builder.bar(
    "matte",
    "#c9b48a",
    [0, 0.05, 0],
    [0, -ropeDrop + 0.32, 0],
    0.04,
    5,
  );
  builder.add(
    "matte",
    "#2a2c2f",
    new TorusGeometry(
      0.3,
      0.1,
      builder.segments(8, 4),
      builder.segments(18, 8),
    ),
    { at: [0, -ropeDrop, 0], rotation: [0, Math.PI / 2, 0] },
  );
  builder.torus("matte", "#c9b48a", 0.07, 0.025, [0, 0.0, 0], "x", 8);
};

const swingStart = { x: swingPivot[0], z: swingPivot[2] + 0.95 };
const swingFinish = { x: swingPivot[0] - 1.2, z: swingPivot[2] + 1.9 };

const swingRide = (progress: number, seconds: number): LocalSpot => {
  const seat: Triple = [
    swingPivot[0],
    swingPivot[1] - ropeDrop + 0.08,
    swingPivot[2],
  ];
  const [x, y, z] = moveWithPose(
    swingPivot,
    seat,
    findMotionPose(swingMotion, seconds),
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = { x: swingStart.x, z: swingStart.z };
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: 0,
  };
};

/* The ground round it */

const buildGround = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#8a6a4a", {
    radius: 3.4,
    length: 0.04,
    at: [tree.x, 0.02, tree.z],
    segments: builder.segments(28, 14),
  });
  const stones: [number, number][] = [
    [-0.6, 7.8],
    [-0.3, 6.9],
    [-0.15, 6.0],
    [0.05, 5.1],
    [0.0, 4.3],
  ];
  stones.forEach(([x, z], index) => {
    builder.cylinder(
      "matte",
      index % 2 === 0 ? palette.stone : shade(palette.stone, 0.9),
      {
        radius: 0.32,
        length: 0.06,
        at: [x, 0.03, z],
        segments: builder.segments(10, 6),
      },
    );
  });
  const logAt: Triple = [5.1, 0.22, -1.9];
  builder.cylinder("matte", bark, {
    radius: 0.24,
    length: 1.5,
    at: logAt,
    axis: "z",
    segments: builder.segments(12, 6),
  });
  if (!builder.isFar) {
    [-0.75, 0.75].forEach((end) => {
      builder.cylinder("matte", "#c9a46a", {
        radius: 0.22,
        length: 0.02,
        at: [logAt[0], logAt[1], logAt[2] + end],
        axis: "z",
        segments: 12,
      });
    });
    const toadstools: [number, number, number][] = [
      [1.6, 1.1, 0.9],
      [-1.4, 1.2, 0.7],
      [4.2, -3.6, 1],
      [-4.8, -2.4, 0.8],
    ];
    toadstools.forEach(([x, z, size]) => {
      builder.cylinder("matte", palette.cream, {
        radius: 0.05 * size,
        length: 0.2 * size,
        at: [x, 0.1 * size, z],
        segments: 6,
      });
      builder.sphere(
        "paint",
        "#c8302a",
        0.13 * size,
        [x, 0.2 * size, z],
        [1, 0.55, 1],
        8,
      );
      builder.sphere(
        "matte",
        palette.white,
        0.025 * size,
        [x + 0.05 * size, 0.26 * size, z + 0.04 * size],
        [1, 1, 1],
        4,
      );
    });
  }
  addBush(builder, [-5.6, 0, -3.6], 0.6);
  addBush(builder, [5.0, 0, -4.4], 0.55, "#3a7d34");
  addBush(builder, [-5.2, 0, 3.6], 0.5, "#3a7d34");
  addBush(builder, [4.9, 0, 1.6], 0.45);
  addSignBoard(builder, [-2.4, 0, 6.9], "#3d6b4a");
};

/* The birds */

const buildBird = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#6b4a3a", 0.09, [0, 0, 0], [0.8, 0.8, 1.3], 6);
  builder.sphere("matte", "#d9622b", 0.05, [0, -0.01, 0.07], [1, 1, 1], 5);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#5a3d2e",
      [0.16, 0.012, 0.08],
      [side * 0.1, 0.03, 0],
      [0, 0, side * 0.35],
    );
  });
  builder.box("matte", "#e8a33a", [0.02, 0.02, 0.05], [0, 0.01, 0.13]);
};

/* Where the Character can go */

const platformDeck: Deck = ({ x, z }) => {
  const distance = Math.hypot(x - tree.x, z - tree.z);
  return distance >= trunkRadiusAtDeck && distance <= deckRadius - 0.05
    ? { height: deckTop, kind: "bridge" }
    : undefined;
};

const railBlockers: LocalBlocker[] = Array.from({ length: 58 }, (_, index) => {
  const angle = (index / 58) * Math.PI * 2;
  return {
    x: tree.x + Math.sin(angle) * (railRadius + 0.05),
    z: tree.z + Math.cos(angle) * (railRadius + 0.05),
    radius: 0.3,
  };
});

export const treehouseModel: AttractionModel = {
  kind: "treehouse",
  name: "Treehouse",
  fact: "A tree is the biggest plant of all. Its roots hold it firm and drink water from the soil, the trunk carries the water up, and the leaves use sunlight to make the tree's food. One old oak can be home to hundreds of different minibeasts, birds and other animals.",
  curriculumLink:
    "Science, Years 2 and 3: plants and habitats. The jobs of roots, trunk (stem) and leaves, and how a tree gives animals a place to live.",
  footprint: 9,
  setting: "inland",
  signSpot: { x: -2.4, z: 7.8 },
  build: (builder) => {
    buildGround(builder);
    buildTree(builder);
    buildPlatform(builder);
    buildCabin(builder);
    buildBunting(builder);
    buildLadder(builder);
    buildSlide(builder);
    buildSwingBranch(builder);
  },
  moving: [
    {
      name: "tyre-swing",
      pivot: swingPivot,
      build: buildTyreSwing,
      motion: swingMotion,
    },
  ],
  wanderers: [
    {
      name: "birds",
      build: buildBird,
      count: 3,
      centre: tree,
      radius: 4.2,
      speed: 1.4,
      height: 6.4,
      bob: 0.3,
    },
  ],
  blockers: [
    {
      x: tree.x,
      z: tree.z,
      radius: trunkRadiusAtDeck + 0.15,
    },
    ...railBlockers,
    { x: cabin.x, z: cabin.z - 0.5, radius: 0.72 },
    { x: cabin.x, z: cabin.z + 0.45, radius: 0.72 },
    { x: 5.1, z: -1.9, radius: 0.35 },
    { x: 5.1, z: -2.5, radius: 0.3 },
    { x: 5.1, z: -1.3, radius: 0.3 },
  ],
  decks: [platformDeck],
  rides: [
    {
      id: "ladder",
      name: "the ladder",
      start: ladderStart,
      reach: 0.5,
      seconds: 5,
      finish: ladderFinish,
      follow: ladderRide,
    },
    {
      id: "slide",
      name: "the slide",
      start: slideStart,
      reach: 0.42,
      seconds: 4.5,
      finish: slideFinish,
      follow: slideRide,
    },
    {
      id: "tyre-swing",
      name: "the tyre swing",
      start: swingStart,
      reach: 0.5,
      seconds: 9,
      finish: swingFinish,
      follow: swingRide,
    },
  ],
};
