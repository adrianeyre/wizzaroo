import { QuadraticBezierCurve3, TubeGeometry, Vector3 } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const brackish = "#5d8b78";
const mud = "#5e4a34";
const wetMud = "#4a3a29";
const bark = "#6e5a46";
const rootBark = "#7d6a54";
const leafDark = "#2a6a35";
const leafMid = "#3a8040";
const propaguleGreen = "#5f8f3a";
const boardTimber = "#9b7650";
const postTimber = "#5e4430";
const heronGrey = "#8f99a3";
const heronPale = "#dfe3e6";
const beakYellow = "#e2b33a";
const crabBlue = "#3c5fb8";
const clawOrange = "#f08a2c";
const skipperBrown = "#8a7a5a";
const signColour = "#2f6b5c";

/* Pools of brackish water, each over a slightly bigger bed of mud */
const pools = [
  { x: -0.5, z: -0.8, radius: 2.8 },
  { x: 2.2, z: -0.8, radius: 2.0 },
  { x: -2.6, z: 0.2, radius: 1.8 },
];
const waterLevel = 0.07;

/* The zig-zag boardwalk, low over the water, with a ramp at each end */
const walkPoints: readonly (readonly [number, number])[] = [
  [-4.1, 2.6],
  [-1.9, 0.2],
  [0.5, 1.5],
  [2.4, -1.0],
  [4.3, 0.9],
];
const walkHeight = 0.45;
const walkHalfWidth = 0.5;
const rampLength = 1.1;

const walkLengths = walkPoints.slice(1).map(([x, z], index) => {
  const [fromX, fromZ] = walkPoints[index];
  return Math.hypot(x - fromX, z - fromZ);
});
const walkTotal = walkLengths.reduce((sum, length) => sum + length, 0);

/** How high the boardwalk is a distance along it, ramps included. */
const walkHeightAt = (along: number): number =>
  Math.max(
    0,
    Math.min(
      walkHeight,
      (along / rampLength) * walkHeight,
      ((walkTotal - along) / rampLength) * walkHeight,
    ),
  );

/** The point a distance along the boardwalk, and which way it runs there. */
const walkPointAt = (
  along: number,
): { x: number; z: number; heading: number } => {
  let left = along;
  for (let index = 0; index < walkLengths.length; index++) {
    const length = walkLengths[index];
    if (left <= length || index === walkLengths.length - 1) {
      const [fromX, fromZ] = walkPoints[index];
      const [toX, toZ] = walkPoints[index + 1];
      const share = Math.min(1, Math.max(0, left / length));
      return {
        x: fromX + (toX - fromX) * share,
        z: fromZ + (toZ - fromZ) * share,
        heading: Math.atan2(toX - fromX, toZ - fromZ),
      };
    }
    left -= length;
  }
  return { x: walkPoints[0][0], z: walkPoints[0][1], heading: 0 };
};

/** Distances along the boardwalk of its corners, ends included. */
const cornerDistances = walkLengths.reduce<number[]>(
  (list, length) => [...list, list[list.length - 1] + length],
  [0],
);

/** Which way is "out to the side" at a distance, mitred at the corners. */
const walkSideAt = (along: number): { x: number; z: number } => {
  const corner = cornerDistances.findIndex(
    (distance) => Math.abs(distance - along) < 0.001,
  );
  const headings =
    corner > 0 && corner < cornerDistances.length - 1
      ? [walkPointAt(along - 0.01).heading, walkPointAt(along + 0.01).heading]
      : [walkPointAt(along).heading];
  const sum = headings.reduce(
    (total, heading) => ({
      x: total.x + Math.cos(heading),
      z: total.z - Math.sin(heading),
    }),
    { x: 0, z: 0 },
  );
  const size = Math.hypot(sum.x, sum.z);
  return { x: sum.x / size, z: sum.z / size };
};

/* The mangrove trees, standing on their arching stilt roots */
const mangroves = [
  { x: -1.0, z: -2.5, size: 1.15 },
  { x: 2.0, z: -2.9, size: 0.95 },
  { x: -3.5, z: -0.8, size: 0.85 },
  { x: -0.4, z: -0.55, size: 0.5 },
];
const mudskipperAt = { x: 1.6, z: 2.25 };
const heronAt = { x: 0.9, z: -1.0 };
const neckPivot: Triple = [heronAt.x, 0.95, heronAt.z + 0.12];

const addArchedRoot = (
  builder: AttractionBuilder,
  from: Triple,
  bend: Triple,
  to: Triple,
  thickness: number,
) => {
  const curve = new QuadraticBezierCurve3(
    new Vector3(...from),
    new Vector3(...bend),
    new Vector3(...to),
  );
  builder.add(
    "matte",
    rootBark,
    new TubeGeometry(
      curve,
      builder.segments(6, 2),
      thickness,
      builder.isFar ? 3 : 4,
      false,
    ),
  );
};

const buildMangrove = (
  builder: AttractionBuilder,
  { x, z, size }: { x: number; z: number; size: number },
  seed: number,
) => {
  if (builder.isFar && size < 0.7) {
    return;
  }
  const rootTop = 0.95 * size;
  builder.cylinder("matte", bark, {
    radius: 0.17 * size,
    radiusEnd: 0.11 * size,
    length: 1.9 * size,
    at: [x, rootTop + 0.95 * size, z],
    segments: 10,
  });
  const roots = builder.isFar ? 3 : 6;
  for (let root = 0; root < roots; root++) {
    const angle = (root / roots) * Math.PI * 2 + seed;
    const spread = (0.95 + (root % 3) * 0.12) * size;
    const startHeight = rootTop - (root % 2) * 0.25 * size;
    addArchedRoot(
      builder,
      [x + Math.sin(angle) * 0.08, startHeight, z + Math.cos(angle) * 0.08],
      [
        x + Math.sin(angle) * spread * 0.75,
        startHeight + 0.25 * size,
        z + Math.cos(angle) * spread * 0.75,
      ],
      [x + Math.sin(angle) * spread, 0, z + Math.cos(angle) * spread],
      0.045 * size + 0.01,
    );
  }
  if (builder.isFar) {
    builder.sphere(
      "matte",
      leafDark,
      1.25 * size,
      [x, 3.1 * size, z],
      [1.2, 0.7, 1.2],
      10,
    );
    return;
  }
  /* Branches up into a dense, dark crown */
  const crown: [number, number, number, number][] = [
    [0, 3.25, 0, 1.0],
    [0.75, 2.95, 0.25, 0.72],
    [-0.7, 3.0, -0.2, 0.75],
    [0.1, 2.85, -0.75, 0.68],
  ];
  crown
    .slice(0, size < 0.7 ? 2 : size < 1 ? 3 : 4)
    .forEach(([dx, dy, dz, scale], index) => {
      builder.bar(
        "matte",
        bark,
        [x, 2.3 * size, z],
        [x + dx * size * 0.8, (dy - 0.3) * size, z + dz * size * 0.8],
        0.09 * size,
        6,
      );
      builder.sphere(
        "matte",
        index % 2 === 0 ? leafDark : leafMid,
        0.95 * size * scale,
        [x + dx * size, dy * size, z + dz * size],
        [1.15, 0.72, 1.15],
        10,
      );
    });
  /* Propagules: pencil-shaped seedlings hanging, ready to drop and float away */
  [0.6, 2.2, 3.8, 5.1].forEach((angle) => {
    const hangX = x + Math.sin(angle + seed) * 0.8 * size;
    const hangZ = z + Math.cos(angle + seed) * 0.8 * size;
    builder.bar(
      "matte",
      propaguleGreen,
      [hangX, 2.6 * size, hangZ],
      [hangX, 2.6 * size - 0.45, hangZ],
      0.04,
      4,
    );
  });
  /* Breathing roots poking up out of the mud all round */
  for (let spike = 0; spike < 5; spike++) {
    const angle = spike * 2.4 + seed;
    const distance = (1.25 + (spike % 3) * 0.25) * size;
    builder.cylinder("matte", rootBark, {
      radius: 0.035,
      radiusEnd: 0.008,
      length: 0.3 + (spike % 2) * 0.12,
      at: [
        x + Math.sin(angle) * distance,
        0.15,
        z + Math.cos(angle) * distance,
      ],
      segments: 4,
    });
  }
  /* Oysters clinging to a root at the waterline */
  [0, 1].forEach((oyster) => {
    const angle = seed + oyster * 0.3;
    builder.sphere(
      "matte",
      "#cfc6b4",
      0.05,
      [
        x + Math.sin(angle) * 0.92 * size,
        0.1 + oyster * 0.05,
        z + Math.cos(angle) * 0.92 * size,
      ],
      [1.3, 0.6, 1],
      5,
    );
  });
};

const buildSwamp = (builder: AttractionBuilder) => {
  const segments = builder.segments(18, 9);
  pools.forEach(({ x, z, radius }) => {
    if (builder.isFar) {
      return;
    }
    builder.cylinder("matte", wetMud, {
      radius: radius + 0.45,
      length: 0.04,
      at: [x, 0.02, z],
      segments,
    });
  });
  pools.forEach(({ x, z, radius }) => {
    builder.cylinder("water", brackish, {
      radius,
      length: 0.05,
      at: [x, waterLevel - 0.02, z],
      segments,
    });
  });
  /* The muddy bank at the front, where the crabs and the mudskipper live */
  builder.cylinder("matte", mud, {
    radius: 1.7,
    length: 0.05,
    at: [2.5, 0.025, 2.4],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  /* Crab burrows dotted over the mud */
  [
    [2.0, 1.7],
    [3.1, 1.9],
    [2.7, 3.2],
    [3.6, 2.7],
    [1.4, 3.0],
  ].forEach(([x, z]) => {
    builder.cylinder("matte", palette.black, {
      radius: 0.06,
      length: 0.02,
      at: [x, 0.055, z],
      segments: 8,
    });
  });
  /* Ripples on the water, and a fallen propagule floating away */
  [
    [-1.2, -0.4, 0.4],
    [1.6, -1.6, 0.3],
  ].forEach(([x, z, radius]) => {
    builder.torus(
      "water",
      shade(brackish, 1.3),
      radius,
      0.015,
      [x, waterLevel + 0.01, z],
      "y",
      12,
    );
  });
  builder.bar(
    "matte",
    propaguleGreen,
    [-1.4, waterLevel + 0.03, -0.3],
    [-1.0, waterLevel + 0.03, -0.45],
    0.05,
    5,
  );
  /* Reeds where the water meets the grass */
  [
    [-4.3, -1.2],
    [3.9, -2.0],
    [-2.9, 2.0],
  ].forEach(([x, z]) => {
    for (let reed = 0; reed < 4; reed++) {
      const lean = (reed - 2) * 0.1;
      builder.bar(
        "matte",
        "#6e8f3a",
        [x + reed * 0.07, 0, z],
        [x + reed * 0.07 + lean, 0.7 + (reed % 2) * 0.2, z + lean * 0.4],
        0.03,
        4,
      );
    }
  });
};

const buildBoardwalk = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    walkPoints.slice(1).forEach(([x, z], index) => {
      const [fromX, fromZ] = walkPoints[index];
      builder.box(
        "matte",
        boardTimber,
        [walkHalfWidth * 2, 0.08, walkLengths[index] + 0.3],
        [(x + fromX) / 2, walkHeight * 0.85, (z + fromZ) / 2],
        [0, Math.atan2(x - fromX, z - fromZ), 0],
      );
    });
    return;
  }
  /* Planks across, stepping up the ramps */
  const planks = Math.round(walkTotal / 0.27);
  for (let plank = 0; plank <= planks; plank++) {
    const along = (plank / planks) * walkTotal;
    const { x, z, heading } = walkPointAt(along);
    builder.box(
      "matte",
      shade(boardTimber, plank % 4 === 0 ? 0.9 : plank % 3 === 0 ? 1.08 : 1),
      [walkHalfWidth * 2, 0.05, 0.22],
      [x, walkHeightAt(along) - 0.025, z],
      [0, heading, 0],
    );
  }
  /* Posts on both sides, with a rail along the top */
  const stops = new Set<number>(cornerDistances);
  for (let along = 0.9; along < walkTotal - 0.5; along += 1.25) {
    stops.add(along);
  }
  const sorted = [...stops].sort((first, second) => first - second);
  const postAt = (along: number, side: number): Triple => {
    const { x, z } = walkPointAt(along);
    const out = walkSideAt(along);
    return [
      x + out.x * side * (walkHalfWidth + 0.04),
      walkHeightAt(along),
      z + out.z * side * (walkHalfWidth + 0.04),
    ];
  };
  [-1, 1].forEach((side) => {
    sorted.forEach((along, index) => {
      const [x, y, z] = postAt(along, side);
      builder.box(
        "matte",
        postTimber,
        [0.08, y + 0.75, 0.08],
        [x, (y + 0.75) / 2, z],
      );
      if (index === 0) {
        return;
      }
      const [fromX, fromY, fromZ] = postAt(sorted[index - 1], side);
      builder.bar(
        "matte",
        boardTimber,
        [fromX, fromY + 0.72, fromZ],
        [x, y + 0.72, z],
        0.06,
        4,
      );
    });
  });
};

const buildHeronBody = (builder: AttractionBuilder) => {
  const { x, z } = heronAt;
  if (builder.isFar) {
    return;
  }
  [-0.07, 0.07].forEach((side) => {
    builder.bar(
      "matte",
      beakYellow,
      [x + side, 0.02, z],
      [x + side * 0.6, 0.62, z - 0.02],
      0.03,
      4,
    );
  });
  builder.sphere(
    "matte",
    heronGrey,
    0.2,
    [x, 0.78, z - 0.04],
    [0.8, 0.85, 1.45],
    10,
  );
  /* Long dark wing feathers folded down the back */
  builder.sphere(
    "matte",
    shade(heronGrey, 0.65),
    0.12,
    [x, 0.76, z - 0.24],
    [0.9, 0.5, 1.5],
    8,
  );
};

const buildHeronNeck = (builder: AttractionBuilder) => {
  builder.bar("matte", heronPale, [0, 0, 0], [0, 0.32, 0.12], 0.07, 6);
  builder.bar("matte", heronPale, [0, 0.32, 0.12], [0, 0.5, 0.02], 0.06, 6);
  builder.sphere(
    "matte",
    heronPale,
    0.07,
    [0, 0.54, 0.04],
    [0.85, 0.9, 1.2],
    8,
  );
  builder.box("matte", palette.black, [0.1, 0.025, 0.12], [0, 0.58, -0.04]);
  builder.cylinder("paint", beakYellow, {
    radius: 0.025,
    radiusEnd: 0.002,
    length: 0.22,
    at: [0, 0.53, 0.2],
    axis: "z",
    segments: 6,
  });
  [-0.045, 0.045].forEach((side) => {
    builder.sphere("paint", "#f2c84a", 0.015, [side, 0.56, 0.08], [1, 1, 1], 5);
  });
};

const buildMudskipper = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    skipperBrown,
    0.11,
    [0, 0.25, 0],
    [0.6, 0.55, 1.6],
    10,
  );
  builder.sphere(
    "matte",
    shade(skipperBrown, 1.25),
    0.08,
    [0, 0.21, 0.04],
    [0.65, 0.4, 1.5],
    8,
  );
  /* Bulging eyes on top, for looking out over the mud */
  [-0.035, 0.035].forEach((side) => {
    builder.sphere("paint", "#d9cfa8", 0.03, [side, 0.32, 0.1], [1, 1, 1], 6);
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [side * 1.2, 0.33, 0.12],
      [1, 1, 1],
      5,
    );
  });
  /* A sail-like back fin with blue spots, and stubby arm-like fins */
  builder.box(
    "matte",
    shade(skipperBrown, 0.8),
    [0.01, 0.08, 0.14],
    [0, 0.32, -0.04],
    [0.3, 0, 0],
  );
  builder.sphere("glow", "#4fb6e8", 0.012, [0.007, 0.33, -0.05], [1, 1, 1], 4);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(skipperBrown, 0.9),
      [0.08, 0.015, 0.05],
      [side * 0.07, 0.2, 0.06],
      [0, 0, side * -0.4],
    );
  });
  builder.box(
    "matte",
    shade(skipperBrown, 0.85),
    [0.01, 0.06, 0.08],
    [0, 0.25, -0.2],
  );
};

const buildFiddlerCrab = (builder: AttractionBuilder) => {
  builder.sphere("paint", crabBlue, 0.07, [0, 0.05, 0], [1.3, 0.5, 1], 8);
  /* One giant claw, waved to impress, and one tiny one for eating */
  builder.sphere(
    "paint",
    clawOrange,
    0.05,
    [0.11, 0.08, 0.06],
    [1.1, 0.6, 0.55],
    8,
  );
  builder.box(
    "paint",
    shade(clawOrange, 1.1),
    [0.03, 0.02, 0.06],
    [0.1, 0.06, 0.1],
  );
  builder.box("paint", "#d8c27a", [0.02, 0.02, 0.04], [-0.06, 0.04, 0.07]);
  [-0.025, 0.025].forEach((side) => {
    builder.bar(
      "matte",
      crabBlue,
      [side, 0.07, 0.04],
      [side, 0.11, 0.05],
      0.01,
      3,
    );
  });
  [-1, 1].forEach((side) => {
    [-0.03, 0, 0.03].forEach((along) => {
      builder.bar(
        "matte",
        shade(crabBlue, 0.75),
        [side * 0.06, 0.04, along],
        [side * 0.12, 0, along - 0.01],
        0.012,
        3,
      );
    });
  });
};

const buildFlyingHeron = (builder: AttractionBuilder) => {
  builder.sphere("matte", heronGrey, 0.14, [0, 0, 0], [0.7, 0.7, 1.6], 8);
  builder.sphere("matte", heronPale, 0.06, [0, 0.03, 0.26], [1, 0.9, 1.2], 6);
  builder.cylinder("paint", beakYellow, {
    radius: 0.02,
    radiusEnd: 0.002,
    length: 0.16,
    at: [0, 0.03, 0.38],
    axis: "z",
    segments: 5,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(heronGrey, 0.9),
      [0.6, 0.02, 0.24],
      [side * 0.36, 0.04, 0],
      [0, 0, side * 0.18],
    );
    builder.box(
      "matte",
      shade(heronGrey, 0.6),
      [0.2, 0.021, 0.1],
      [side * 0.58, 0.08, -0.06],
      [0, 0, side * 0.18],
    );
  });
  builder.bar("matte", beakYellow, [0, 0, -0.18], [0, -0.02, -0.45], 0.025, 3);
};

const walkDeck: Deck = ({ x, z }) => {
  let best: { distance: number; along: number } | undefined;
  let start = 0;
  walkPoints.slice(1).forEach(([toX, toZ], index) => {
    const [fromX, fromZ] = walkPoints[index];
    const length = walkLengths[index];
    const share = Math.min(
      1,
      Math.max(
        0,
        ((x - fromX) * (toX - fromX) + (z - fromZ) * (toZ - fromZ)) /
          (length * length),
      ),
    );
    const distance = Math.hypot(
      x - fromX - (toX - fromX) * share,
      z - fromZ - (toZ - fromZ) * share,
    );
    if (best === undefined || distance < best.distance) {
      best = { distance, along: start + share * length };
    }
    start += length;
  });
  return best !== undefined && best.distance <= walkHalfWidth
    ? { height: walkHeightAt(best.along), kind: "bridge" }
    : undefined;
};

export const mangroveBoardwalkModel: CuriosityModel = {
  kind: "mangrove-boardwalk",
  islandId: "jungle-reach",
  name: "Mangrove Boardwalk",
  fact: "Mangrove trees grow in salty, muddy water where rivers meet the sea. They stand on arching stilt roots, and some roots poke up out of the mud like snorkels to breathe. Crabs, fish and birds all find homes among the roots. A mudskipper is a fish that can walk and breathe out of water on the mud.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Recognise that living things can be grouped in a variety of ways, and that environments can change.",
  footprint: 5.6,
  setting: "inland",
  signSpot: { x: 0.2, z: 4.5 },
  build: (builder) => {
    buildSwamp(builder);
    mangroves.forEach((mangrove, index) => {
      buildMangrove(builder, mangrove, index * 1.7);
    });
    buildBoardwalk(builder);
    buildHeronBody(builder);
    if (!builder.isFar) {
      builder.torus(
        "matte",
        wetMud,
        0.12,
        0.04,
        [mudskipperAt.x, 0.06, mudskipperAt.z],
        "y",
        12,
      );
      builder.cylinder("matte", palette.black, {
        radius: 0.1,
        length: 0.02,
        at: [mudskipperAt.x, 0.06, mudskipperAt.z],
        segments: 10,
      });
    }
    addSignBoard(builder, [0.2, 0, 4.5], signColour);
  },
  moving: [
    {
      name: "mudskipper",
      pivot: [mudskipperAt.x, -0.33, mudskipperAt.z],
      build: buildMudskipper,
      motion: { kind: "rise", reach: 6, height: 0.3, period: 1.4 },
    },
    {
      name: "heron's neck",
      pivot: neckPivot,
      build: buildHeronNeck,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.45,
        period: 2.6,
      },
    },
  ],
  wanderers: [
    {
      name: "fiddler crabs",
      build: buildFiddlerCrab,
      count: 3,
      centre: { x: 2.8, z: 2.5 },
      radius: 0.9,
      speed: 0.3,
      height: 0.05,
    },
    {
      name: "herons",
      build: buildFlyingHeron,
      count: 2,
      centre: { x: 0, z: -0.8 },
      radius: 3.2,
      speed: 1.1,
      height: 4.4,
      bob: 0.2,
    },
  ],
  decks: [walkDeck],
  blockers: [
    ...mangroves.map(({ x, z, size }): LocalBlocker => ({
      x,
      z,
      radius: 0.85 * size,
    })),
    { x: heronAt.x, z: heronAt.z, radius: 0.3 },
  ],
  play: {
    label: "Spot a mudskipper",
    news: "Pop! A mudskipper peeped out of its burrow, blinked its bulging eyes and skipped across the mud on its fins.",
  },
};
