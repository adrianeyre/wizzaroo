import { ExtrudeGeometry, Shape } from "three";
import {
  addGableRoof,
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const stilt = "#5e4630";
const plank = "#9a6c42";
const plankDark = "#7d5534";
const bamboo = "#c9b46a";
const bambooDark = "#a8914c";
const weave = "#b99a5e";
const thatch = "#b38c4c";
const thatchDark = "#8f6d38";
const lagoon = "#6f8f5c";
const mud = "#7a5a3a";
const mudDark = "#5e4329";
const sand = "#b59a6a";
const reed = "#6f9a3a";
const leafMid = "#2f8a35";
const leafBright = "#58b043";
const clothRed = "#c8462f";
const clothBlue = "#2f6fb0";
const clothYellow = "#e8b630";
const crocGreen = "#4f6a34";
const kingfisherBlue = "#1f8fd0";
const kingfisherOrange = "#e8772a";
const signColour = "#8a4f2a";

/* The boardwalk: up a ramp each side, and round the back of the lagoon */
const walkTop = 0.9;
const walks = [
  { minX: -5.5, maxX: -4.0, minZ: -5.9, maxZ: 1.6 },
  { minX: 4.0, maxX: 5.5, minZ: -5.9, maxZ: 1.6 },
  { minX: -5.5, maxX: 5.5, minZ: -5.9, maxZ: -4.4 },
];
const ramps = [
  { minX: -5.5, maxX: -4.0, low: 4.4, high: 1.6 },
  { minX: 4.0, maxX: 5.5, low: 4.4, high: 1.6 },
];

/* The huts, on stilts over the water, each with its door onto the boardwalk */
interface Hut {
  x: number;
  z: number;
  width: number;
  depth: number;
  door: "west" | "east" | "north";
  cloth: string;
}

const huts: readonly Hut[] = [
  { x: -3.0, z: -1.4, width: 2.0, depth: 2.0, door: "west", cloth: clothRed },
  { x: 3.0, z: -1.4, width: 2.0, depth: 2.0, door: "east", cloth: clothBlue },
  { x: 0, z: -3.5, width: 2.6, depth: 1.8, door: "north", cloth: clothYellow },
];
const wallHeight = 1.45;
const doorHalf = 0.42;

/* The lagoon, and the dugout canoe that paddles round it */
const lagoonAt = { x: 0, z: -1.3 };
const lagoonRadius = 3.75;
const canoeCentre: Triple = [0, 0.04, 0.4];
const canoeMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: 1.3,
  count: 1,
  speed: -0.45,
  isFacingAlong: true,
};
const canoeStart = { x: 0, z: 3.7 };
const canoeFinish = { x: 1.7, z: 3.6 };

const crocAt: Triple = [2.3, -0.42, 1.0];
const fireAt = { x: -2.5, z: 3.9 };
const signAt = { x: -1.3, z: 7.9 };

/* -------------------------------------------------------------- */
/* The lagoon and the beach                                         */
/* -------------------------------------------------------------- */

const buildLagoon = (builder: AttractionBuilder) => {
  builder.cylinder("matte", mud, {
    radius: lagoonRadius + 0.6,
    length: 0.03,
    at: [lagoonAt.x, 0.015, lagoonAt.z],
    segments: builder.segments(32, 12),
  });
  builder.cylinder("water", lagoon, {
    radius: lagoonRadius,
    length: 0.05,
    at: [lagoonAt.x, 0.05, lagoonAt.z],
    segments: builder.segments(36, 14),
  });
  /* The sandy, muddy beach where the canoes are pulled up */
  builder.box("matte", sand, [7.6, 0.03, 3.2], [0, 0.02, 4.4]);
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "matte",
    mudDark,
    lagoonRadius + 0.05,
    0.08,
    [lagoonAt.x, 0.05, lagoonAt.z],
    "y",
    36,
  );
  /* Reeds and mangrove roots round the edge */
  for (let clump = 0; clump < 9; clump++) {
    const angle = 1.9 + (clump / 8) * 2.5;
    const x = lagoonAt.x + Math.sin(angle) * (lagoonRadius + 0.1);
    const z = lagoonAt.z + Math.cos(angle) * (lagoonRadius + 0.1);
    if (z < -4.0 || Math.abs(x) > 3.7) {
      continue;
    }
    for (let stem = 0; stem < 4; stem++) {
      builder.bar(
        "matte",
        stem % 2 === 0 ? reed : shade(reed, 0.8),
        [x + stem * 0.06 - 0.1, 0, z + (stem % 2) * 0.08],
        [
          x + stem * 0.1 - 0.15,
          0.75 + (stem % 3) * 0.15,
          z + (stem % 2) * 0.14,
        ],
        0.03,
        4,
      );
    }
  }
  /* Ripples and water lilies */
  [
    [-1.4, -0.2],
    [1.6, 1.6],
    [-0.6, 1.8],
    [1.2, -2.2],
  ].forEach(([x, z], index) => {
    builder.cylinder("paint", leafBright, {
      radius: 0.2,
      length: 0.02,
      at: [x, 0.09, z],
      segments: 10,
    });
    if (index % 2 === 0) {
      builder.sphere(
        "paint",
        "#f4f0f6",
        0.07,
        [x + 0.05, 0.13, z],
        [1, 0.7, 1],
        6,
      );
    }
  });
  /* A second canoe pulled up on the beach, and its paddles */
  builder.lathe(
    "matte",
    plankDark,
    [
      [0, -0.9],
      [0.18, -0.7],
      [0.26, -0.3],
      [0.27, 0.3],
      [0.18, 0.7],
      [0, 0.9],
    ],
    [3.0, 0.14, 4.6],
    "z",
    10,
  );
  builder.box("matte", shade(plank, 0.6), [0.36, 0.04, 1.4], [3.0, 0.25, 4.6]);
  [-0.4, 0.4].forEach((dz) => {
    builder.bar(
      "matte",
      plank,
      [2.4, 0.05, 4.6 + dz],
      [3.6, 0.08, 4.4 + dz],
      0.04,
      4,
    );
    builder.box(
      "matte",
      plank,
      [0.16, 0.02, 0.3],
      [3.7, 0.08, 4.4 + dz],
      [0, 1.4, 0],
    );
  });
};

/* -------------------------------------------------------------- */
/* The boardwalk                                                   */
/* -------------------------------------------------------------- */

const addPlanks = (
  builder: AttractionBuilder,
  { minX, maxX, minZ, maxZ }: (typeof walks)[number],
) => {
  const isAlongX = maxX - minX > maxZ - minZ;
  const length = isAlongX ? maxX - minX : maxZ - minZ;
  const width = isAlongX ? maxZ - minZ : maxX - minX;
  const boards = builder.isFar ? 1 : Math.round(length / 0.36);
  for (let board = 0; board < boards; board++) {
    const along = (isAlongX ? minX : minZ) + (length / boards) * (board + 0.5);
    const size: Triple = isAlongX
      ? [length / boards - 0.03, 0.07, width]
      : [width, 0.07, length / boards - 0.03];
    builder.box(
      "matte",
      board % 3 === 0 ? plankDark : plank,
      size,
      isAlongX
        ? [along, walkTop - 0.035, (minZ + maxZ) / 2]
        : [(minX + maxX) / 2, walkTop - 0.035, along],
    );
  }
  /* Stilts under it */
  const stilts = Math.max(2, Math.round(length / (builder.isFar ? 3 : 1.6)));
  for (let index = 0; index <= stilts; index++) {
    const along = (isAlongX ? minX : minZ) + (length * index) / stilts;
    [0.1, width - 0.1].forEach((across) => {
      const x = isAlongX ? along : minX + across;
      const z = isAlongX ? minZ + across : along;
      builder.cylinder("matte", stilt, {
        radius: 0.08,
        length: walkTop,
        at: [x, walkTop / 2 - 0.05, z],
        segments: 6,
      });
    });
  }
};

/** A bamboo rail along a run of the walk, on posts. */
const addRail = (
  builder: AttractionBuilder,
  from: { x: number; z: number },
  to: { x: number; z: number },
  bottom = walkTop,
  top = walkTop,
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const posts = builder.isFar ? -1 : Math.max(1, Math.round(length / 1.0));
  for (let post = 0; post <= posts; post++) {
    const share = post / posts;
    const y = bottom + (top - bottom) * share;
    const x = from.x + (to.x - from.x) * share;
    const z = from.z + (to.z - from.z) * share;
    builder.cylinder("matte", bambooDark, {
      radius: 0.045,
      length: 0.9,
      at: [x, y + 0.45, z],
      segments: builder.isFar ? 4 : 6,
    });
  }
  builder.bar(
    "matte",
    bamboo,
    [from.x, bottom + 0.85, from.z],
    [to.x, top + 0.85, to.z],
    0.06,
    builder.isFar ? 4 : 6,
  );
  if (!builder.isFar) {
    builder.bar(
      "matte",
      bamboo,
      [from.x, bottom + 0.45, from.z],
      [to.x, top + 0.45, to.z],
      0.04,
      5,
    );
  }
};

const buildBoardwalk = (builder: AttractionBuilder) => {
  walks.forEach((walk) => {
    addPlanks(builder, walk);
  });
  ramps.forEach(({ minX, maxX, low, high }) => {
    const length = Math.hypot(low - high, walkTop);
    const slope = Math.atan2(walkTop, low - high);
    const steps = builder.isFar ? 1 : 7;
    for (let step = 0; step < steps; step++) {
      const share = (step + 0.5) / steps;
      builder.box(
        "matte",
        step % 2 === 0 ? plank : plankDark,
        [maxX - minX, 0.07, length / steps - 0.03],
        [
          (minX + maxX) / 2,
          walkTop * (1 - share) - 0.03,
          high + (low - high) * share,
        ],
        [slope, 0, 0],
      );
    }
    [minX + 0.05, maxX - 0.05].forEach((x) => {
      builder.cylinder("matte", stilt, {
        radius: 0.07,
        length: walkTop * 0.5,
        at: [x, walkTop * 0.25, high + (low - high) * 0.5],
        segments: 6,
      });
    });
  });
  /* Rails on the outside of the walk and the ramps, open where the huts' doors are */
  addRail(builder, { x: -5.5, z: 4.3 }, { x: -5.5, z: 1.6 }, 0, walkTop);
  addRail(builder, { x: 5.5, z: 4.3 }, { x: 5.5, z: 1.6 }, 0, walkTop);
  addRail(builder, { x: -5.5, z: 1.6 }, { x: -5.5, z: -5.9 });
  addRail(builder, { x: 5.5, z: 1.6 }, { x: 5.5, z: -5.9 });
  addRail(builder, { x: -5.5, z: -5.9 }, { x: 5.5, z: -5.9 });
  /* And on the lagoon side, either side of the doors */
  addRail(builder, { x: -4.0, z: 1.6 }, { x: -4.0, z: -0.85 });
  addRail(builder, { x: 4.0, z: 1.6 }, { x: 4.0, z: -0.85 });
  addRail(builder, { x: -4.0, z: -2.2 }, { x: -4.0, z: -4.4 });
  addRail(builder, { x: 4.0, z: -2.2 }, { x: 4.0, z: -4.4 });
  addRail(builder, { x: -4.0, z: -4.4 }, { x: -0.6, z: -4.4 });
  addRail(builder, { x: 0.6, z: -4.4 }, { x: 4.0, z: -4.4 });
};

/* -------------------------------------------------------------- */
/* The huts                                                         */
/* -------------------------------------------------------------- */

const buildHut = (builder: AttractionBuilder, hut: Hut) => {
  const { x, z, width, depth, door, cloth } = hut;
  const halfW = width / 2;
  const halfD = depth / 2;
  /* Floor and stilts */
  builder.box("matte", plankDark, [width, 0.1, depth], [x, walkTop - 0.05, z]);
  [-1, 0, 1].forEach((alongX) => {
    [-1, 1].forEach((alongZ) => {
      builder.cylinder("matte", stilt, {
        radius: 0.09,
        length: walkTop + 0.1,
        at: [
          x + alongX * (halfW - 0.1),
          (walkTop + 0.1) / 2 - 0.1,
          z + alongZ * (halfD - 0.1),
        ],
        segments: builder.isFar ? 4 : 7,
      });
    });
  });
  /* Woven walls, with a gap for the door */
  const wallY = walkTop + wallHeight / 2;
  const sides = [
    { name: "north", along: "x", at: z - halfD, length: width, middle: x },
    { name: "south", along: "x", at: z + halfD, length: width, middle: x },
    { name: "west", along: "z", at: x - halfW, length: depth, middle: z },
    { name: "east", along: "z", at: x + halfW, length: depth, middle: z },
  ] as const;
  sides.forEach(({ name, along, at, length, middle }) => {
    const pieces: [number, number][] =
      name === door
        ? [
            [middle - length / 2, middle - doorHalf],
            [middle + doorHalf, middle + length / 2],
          ]
        : [[middle - length / 2, middle + length / 2]];
    pieces.forEach(([from, to]) => {
      const size = to - from;
      const centre = (from + to) / 2;
      builder.box(
        "matte",
        weave,
        along === "x" ? [size, wallHeight, 0.08] : [0.08, wallHeight, size],
        along === "x" ? [centre, wallY, at] : [at, wallY, centre],
      );
      if (builder.isFar) {
        return;
      }
      /* Bands of darker weave */
      [0.35, 0.8, 1.2].forEach((up) => {
        builder.box(
          "matte",
          bambooDark,
          along === "x" ? [size, 0.05, 0.1] : [0.1, 0.05, size],
          along === "x"
            ? [centre, walkTop + up, at]
            : [at, walkTop + up, centre],
        );
      });
    });
    if (builder.isFar || name === door) {
      return;
    }
    /* A window with a shutter propped open */
    const outward = name === "north" || name === "west" ? -1 : 1;
    const windowAt: Triple =
      along === "x"
        ? [middle, walkTop + 0.9, at + outward * 0.05]
        : [at + outward * 0.05, walkTop + 0.9, middle];
    builder.box(
      "paint",
      "#2a2118",
      along === "x" ? [0.5, 0.4, 0.02] : [0.02, 0.4, 0.5],
      windowAt,
    );
    builder.box(
      "matte",
      bambooDark,
      along === "x" ? [0.56, 0.04, 0.42] : [0.42, 0.04, 0.56],
      along === "x"
        ? [middle, walkTop + 1.15, at + outward * 0.2]
        : [at + outward * 0.2, walkTop + 1.15, middle],
      along === "x" ? [outward * 0.5, 0, 0] : [0, 0, -outward * 0.5],
    );
  });
  /* Corner posts */
  [-1, 1].forEach((alongX) => {
    [-1, 1].forEach((alongZ) => {
      builder.cylinder("matte", stilt, {
        radius: 0.07,
        length: wallHeight + 0.1,
        at: [x + alongX * halfW, walkTop + wallHeight / 2, z + alongZ * halfD],
        segments: builder.isFar ? 4 : 6,
      });
    });
  });
  /* A steep thatched roof, ridge running away from the door */
  const turn = door === "north" ? Math.PI / 2 : 0;
  const roofWidth = door === "north" ? depth : width;
  const roofDepth = door === "north" ? width : depth;
  addGableRoof(builder, {
    width: roofWidth + 0.2,
    depth: roofDepth,
    rise: 1.3,
    at: [x, walkTop + wallHeight, z],
    colour: thatch,
    overhang: 0.4,
    thickness: 0.16,
    turn,
  });
  /* Gable ends, the ridge, and crossed horns at each end */
  [-1, 1].forEach((end) => {
    const endX = door === "north" ? x : x + end * (halfW + 0.05);
    const endZ = door === "north" ? z + end * (halfD + 0.05) : z;
    builder.add("matte", weave, gableGeometry(roofDepth, 1.3), {
      at: [endX, walkTop + wallHeight, endZ],
      rotation: [0, door === "north" ? 0 : Math.PI / 2, 0],
    });
    if (builder.isFar) {
      return;
    }
    const tip: Triple =
      door === "north"
        ? [x, walkTop + wallHeight + 1.3, z + end * (halfD + 0.5)]
        : [x + end * (halfW + 0.5), walkTop + wallHeight + 1.3, z];
    [-1, 1].forEach((side) => {
      const lean: Triple =
        door === "north"
          ? [side * 0.25, 0.45, end * 0.08]
          : [end * 0.08, 0.45, side * 0.25];
      builder.bar(
        "matte",
        thatchDark,
        tip,
        [tip[0] + lean[0], tip[1] + lean[1], tip[2] + lean[2]],
        0.06,
        5,
      );
    });
  });
  builder.cylinder("matte", thatchDark, {
    radius: 0.1,
    length: roofWidth + 0.9,
    at: [x, walkTop + wallHeight + 1.32, z],
    axis: door === "north" ? "z" : "x",
    segments: builder.isFar ? 5 : 8,
  });
  if (builder.isFar) {
    return;
  }
  /* A bright cloth over the door, and a mat inside */
  const doorAt: Triple =
    door === "north"
      ? [x, walkTop + 1.25, z - halfD - 0.05]
      : door === "west"
        ? [x - halfW - 0.05, walkTop + 1.25, z]
        : [x + halfW + 0.05, walkTop + 1.25, z];
  builder.box(
    "matte",
    cloth,
    door === "north"
      ? [doorHalf * 2 + 0.1, 0.35, 0.03]
      : [0.03, 0.35, doorHalf * 2 + 0.1],
    doorAt,
  );
  for (let stripe = 0; stripe < 3; stripe++) {
    builder.box(
      "matte",
      palette.cream,
      door === "north"
        ? [doorHalf * 2 + 0.12, 0.04, 0.035]
        : [0.035, 0.04, doorHalf * 2 + 0.12],
      [doorAt[0], doorAt[1] - 0.12 + stripe * 0.12, doorAt[2]],
    );
  }
  /* A woven sleeping mat rolled out on the floor */
  builder.box(
    "matte",
    cloth,
    door === "north" ? [1.4, 0.03, 0.7] : [0.7, 0.03, 1.4],
    [x, walkTop + 0.02, z],
  );
  builder.box(
    "matte",
    palette.cream,
    door === "north" ? [1.42, 0.035, 0.08] : [0.08, 0.035, 1.42],
    [x, walkTop + 0.02, z],
  );
  /* Clay pots by the wall */
  const potAt: Triple =
    door === "north"
      ? [x + halfW - 0.35, walkTop, z + halfD - 0.3]
      : [
          x + (door === "west" ? 1 : -1) * (halfW - 0.3),
          walkTop,
          z + halfD - 0.35,
        ];
  builder.lathe(
    "matte",
    "#a8573a",
    [
      [0.01, 0],
      [0.16, 0.05],
      [0.2, 0.2],
      [0.12, 0.36],
      [0.13, 0.42],
    ],
    potAt,
    "y",
    10,
  );
};

/** The triangle of wall under each gable, facing along the ridge. */
const gableGeometry = (span: number, rise: number) => {
  const half = span / 2 + 0.05;
  const shape = new Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(0, rise);
  shape.lineTo(-half, 0);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -0.03);
  return geometry;
};

/* -------------------------------------------------------------- */
/* Around the village                                               */
/* -------------------------------------------------------------- */

const buildCampfire = (builder: AttractionBuilder) => {
  const { x, z } = fireAt;
  for (let stone = 0; stone < (builder.isFar ? 0 : 8); stone++) {
    const angle = (stone / 8) * Math.PI * 2;
    builder.sphere(
      "matte",
      palette.darkStone,
      0.11,
      [x + Math.sin(angle) * 0.4, 0.06, z + Math.cos(angle) * 0.4],
      [1.2, 0.7, 1],
      builder.isFar ? 4 : 6,
    );
  }
  [0.3, 1.9, 3.5].forEach((angle) => {
    builder.bar(
      "matte",
      stilt,
      [x + Math.sin(angle) * 0.3, 0.05, z + Math.cos(angle) * 0.3],
      [x - Math.sin(angle) * 0.2, 0.18, z - Math.cos(angle) * 0.2],
      0.08,
      5,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* A tripod with a cooking pot */
  [0, 2.1, 4.2].forEach((angle) => {
    builder.bar(
      "matte",
      stilt,
      [x + Math.sin(angle) * 0.55, 0, z + Math.cos(angle) * 0.55],
      [x, 1.0, z],
      0.05,
      4,
    );
  });
  builder.bar("metal", palette.darkSteel, [x, 1.0, z], [x, 0.7, z], 0.015, 4);
  builder.lathe(
    "metal",
    palette.black,
    [
      [0.01, 0],
      [0.16, 0.04],
      [0.18, 0.18],
      [0.15, 0.24],
    ],
    [x, 0.45, z],
    "y",
    10,
  );
  /* Log seats round the fire */
  [0.9, 2.6].forEach((angle) => {
    builder.cylinder("matte", plankDark, {
      radius: 0.15,
      length: 0.9,
      at: [x + Math.sin(angle) * 1.1, 0.15, z + Math.cos(angle) * 1.1],
      axis: "x",
      segments: 8,
    });
  });
};

const buildPlants = (builder: AttractionBuilder) => {
  /* Banana plants and palms round the edge of the village */
  [
    [-7.2, -1.0, 2.2],
    [7.1, -1.8, 2.4],
    [-6.6, 3.4, 2.0],
    [6.8, 3.0, 2.1],
    [-2.6, -7.2, 2.3],
    [3.0, -7.0, 2.2],
  ].forEach(([x, z, height], index) => {
    builder.cylinder("matte", "#7a9a44", {
      radius: 0.11,
      radiusEnd: 0.08,
      length: height,
      at: [x, height / 2, z],
      segments: builder.isFar ? 5 : 7,
    });
    const leaves = builder.isFar ? 3 : 6;
    for (let leaf = 0; leaf < leaves; leaf++) {
      const angle = (leaf / leaves) * Math.PI * 2 + index;
      builder.box(
        "matte",
        leaf % 2 === 0 ? leafMid : leafBright,
        [0.34, 0.03, 1.25],
        [x + Math.sin(angle) * 0.5, height + 0.1, z + Math.cos(angle) * 0.5],
        [0.5, angle, 0],
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  /* A rack of fish drying in the sun */
  [-4.4, -2.8].forEach((x) => {
    builder.cylinder("matte", stilt, {
      radius: 0.05,
      length: 1.6,
      at: [x, 0.8, 6.0],
      segments: 6,
    });
  });
  builder.bar("matte", bamboo, [-4.5, 1.55, 6.0], [-2.7, 1.55, 6.0], 0.05, 5);
  for (let fish = 0; fish < 6; fish++) {
    const x = -4.2 + fish * 0.26;
    builder.bar("matte", "#cdb68a", [x, 1.55, 6.0], [x, 1.35, 6.0], 0.01, 3);
    builder.sphere(
      "paint",
      fish % 2 === 0 ? "#9fb2b8" : "#c2a46a",
      0.07,
      [x, 1.22, 6.0],
      [0.45, 1.6, 0.9],
      6,
    );
    builder.box("paint", "#7f9399", [0.02, 0.08, 0.1], [x, 1.08, 6.0]);
  }
  /* Lanterns by the huts' doors, hung out over the walk */
  (
    [
      [-4.05, -0.72, -0.35, 0],
      [4.05, -0.72, 0.35, 0],
      [-0.72, -4.42, 0, -0.35],
    ] as const
  ).forEach(([x, z, outX, outZ]) => {
    builder.cylinder("matte", stilt, {
      radius: 0.04,
      length: 1.9,
      at: [x, walkTop + 0.95, z],
      segments: 6,
    });
    builder.bar(
      "matte",
      stilt,
      [x, walkTop + 1.85, z],
      [x + outX, walkTop + 1.85, z + outZ],
      0.03,
      4,
    );
    builder.box(
      "glow",
      palette.warmLight,
      [0.14, 0.2, 0.14],
      [x + outX, walkTop + 1.65, z + outZ],
    );
  });
  /* Pots of flowers in the boardwalk's back corners */
  [
    [-5.25, -5.65],
    [5.25, -5.65],
  ].forEach(([x, z], index) => {
    builder.lathe(
      "matte",
      "#a8573a",
      [
        [0.01, 0],
        [0.16, 0.02],
        [0.2, 0.3],
        [0.22, 0.34],
      ],
      [x, walkTop, z],
      "y",
      10,
    );
    builder.sphere(
      "matte",
      leafMid,
      0.22,
      [x, walkTop + 0.42, z],
      [1, 0.8, 1],
      8,
    );
    builder.sphere(
      "paint",
      index % 2 === 0 ? clothRed : clothYellow,
      0.07,
      [x + 0.1, walkTop + 0.58, z + 0.05],
      [1, 1, 1],
      6,
    );
  });
  /* A mooring post with a rope, and a fish trap in the shallows */
  builder.cylinder("matte", stilt, {
    radius: 0.08,
    length: 1.3,
    at: [-0.9, 0.55, 2.4],
    segments: 7,
  });
  builder.torus("matte", "#cdb68a", 0.1, 0.025, [-0.9, 0.95, 2.4], "y", 10);
  builder.lathe(
    "matte",
    bambooDark,
    [
      [0.02, 0],
      [0.22, 0.1],
      [0.25, 0.4],
      [0.1, 0.65],
    ],
    [-2.0, 0.0, 1.0],
    "x",
    8,
  );
};

/* -------------------------------------------------------------- */
/* Moving parts                                                    */
/* -------------------------------------------------------------- */

const buildCanoe = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    plankDark,
    [
      [0, -0.85],
      [0.16, -0.7],
      [0.25, -0.3],
      [0.26, 0.3],
      [0.16, 0.7],
      [0, 0.85],
    ],
    [0, 0.06, 0],
    "z",
    builder.isFar ? 6 : 12,
  );
  builder.box("matte", shade(plankDark, 0.55), [0.34, 0.03, 1.3], [0, 0.18, 0]);
  if (builder.isFar) {
    return;
  }
  builder.box("matte", plank, [0.44, 0.04, 0.1], [0, 0.2, -0.45]);
  builder.box("matte", plank, [0.44, 0.04, 0.1], [0, 0.2, 0.5]);
  builder.bar("matte", plank, [0.35, 0.05, 0.1], [-0.2, 0.55, 0.3], 0.04, 4);
  builder.box(
    "matte",
    plank,
    [0.16, 0.02, 0.3],
    [0.42, 0.02, 0.05],
    [0.3, 0, 0.6],
  );
  builder.box("paint", clothRed, [0.2, 0.06, 0.02], [0, 0.18, 0.86]);
};

const buildCrocodile = (builder: AttractionBuilder) => {
  builder.sphere("matte", crocGreen, 0.3, [0, 0.2, 0], [1, 0.45, 2.2], 10);
  builder.sphere("matte", crocGreen, 0.16, [0, 0.24, 0.72], [1, 0.55, 2.2], 8);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      shade(crocGreen, 1.15),
      0.06,
      [side * 0.09, 0.36, 0.55],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      "#e8c43a",
      0.03,
      [side * 0.1, 0.38, 0.58],
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [side * 0.11, 0.39, 0.6],
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "matte",
      shade(crocGreen, 1.2),
      0.025,
      [side * 0.04, 0.3, 1.06],
      [1, 1, 1],
      4,
    );
  });
  /* Bumpy scales along its back, and a long tail */
  for (let ridge = 0; ridge < 5; ridge++) {
    builder.box(
      "matte",
      shade(crocGreen, 0.8),
      [0.08, 0.06, 0.1],
      [0, 0.33, -0.45 + ridge * 0.2],
      [0.785, 0, 0],
    );
  }
  builder.cylinder("matte", crocGreen, {
    radius: 0.14,
    radiusEnd: 0.02,
    length: 0.9,
    at: [0, 0.2, -1.05],
    axis: "z",
    segments: 7,
  });
};

const kingfisherAt: Triple = [-0.9, 1.2, 2.4];

const buildKingfisher = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    kingfisherBlue,
    0.09,
    [0, 0.1, 0],
    [0.9, 1.1, 1.2],
    8,
  );
  builder.sphere(
    "paint",
    kingfisherOrange,
    0.07,
    [0, 0.07, 0.04],
    [0.9, 0.9, 0.9],
    8,
  );
  builder.sphere("paint", kingfisherBlue, 0.065, [0, 0.21, 0.05], [1, 1, 1], 8);
  builder.cylinder("paint", palette.black, {
    radius: 0.02,
    radiusEnd: 0.004,
    length: 0.14,
    at: [0, 0.2, 0.17],
    axis: "z",
    segments: 5,
  });
  builder.box(
    "paint",
    shade(kingfisherBlue, 0.8),
    [0.05, 0.02, 0.14],
    [0, 0.04, -0.12],
    [0.5, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.015,
      [side * 0.05, 0.19, 0.08],
      [1, 1, 1],
      4,
    );
  });
};

const buildFlames = (builder: AttractionBuilder) => {
  builder.cylinder("glow", "#ff9a2a", {
    radius: 0.2,
    radiusEnd: 0.02,
    length: 0.5,
    at: [0, 0.25, 0],
    segments: 7,
  });
  builder.cylinder("glow", "#ffd36b", {
    radius: 0.11,
    radiusEnd: 0.01,
    length: 0.32,
    at: [0.04, 0.18, 0.03],
    segments: 6,
  });
};

const buildChicken = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#c8763a", 0.12, [0, 0.18, 0], [0.9, 0.9, 1.25], 8);
  builder.sphere("matte", "#c8763a", 0.07, [0, 0.3, 0.12], [1, 1, 1], 7);
  builder.box("paint", clothRed, [0.02, 0.06, 0.06], [0, 0.38, 0.12]);
  builder.cylinder("paint", clothYellow, {
    radius: 0.02,
    radiusEnd: 0.003,
    length: 0.06,
    at: [0, 0.3, 0.2],
    axis: "z",
    segments: 4,
  });
  builder.box(
    "matte",
    "#3f2f22",
    [0.05, 0.14, 0.1],
    [0, 0.22, -0.16],
    [-0.6, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      clothYellow,
      [side * 0.04, 0.1, 0],
      [side * 0.04, 0, 0.02],
      0.015,
      3,
    );
  });
};

/* -------------------------------------------------------------- */
/* The ride and the decks                                           */
/* -------------------------------------------------------------- */

const canoeRide = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(canoeMotion, seconds, { copy: 0 });
  const [x, y, z] = moveWithPose(
    canoeCentre,
    [canoeCentre[0], canoeCentre[1] + 0.12, canoeCentre[2]],
    pose,
  );
  const share = Math.min(1, progress * 7, (1 - progress) * 7);
  const outside = progress < 0.5 ? canoeStart : canoeFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1],
  };
};

const villageDeck: Deck = ({ x, z }) => {
  const isOnWalk = walks.some(
    ({ minX, maxX, minZ, maxZ }) =>
      x >= minX && x <= maxX && z >= minZ && z <= maxZ,
  );
  const isInHut = huts.some(
    (hut) =>
      Math.abs(x - hut.x) <= hut.width / 2 &&
      Math.abs(z - hut.z) <= hut.depth / 2,
  );
  if (isOnWalk || isInHut) {
    return { height: walkTop, kind: "bridge" };
  }
  const ramp = ramps.find(
    ({ minX, maxX, low, high }) =>
      x >= minX && x <= maxX && z > high && z <= low,
  );
  if (ramp !== undefined) {
    return {
      height: walkTop * ((ramp.low - z) / (ramp.low - ramp.high)),
      kind: "bridge",
    };
  }
  return undefined;
};

export const stiltVillageModel: NewLandAttractionModel = {
  kind: "stilt-village",
  islandId: "jungle-reach",
  name: "Stilt Village",
  fact: "In the rainy season, rainforest rivers can rise by several metres and flood the land beside them. Houses built on tall stilts stay dry while the water flows underneath, and people paddle from house to house by canoe.",
  curriculumLink:
    "Geography, Key Stage 2: human and physical geography. Rivers, and types of settlement and land use: why some rainforest villages stand on stilts.",
  footprint: 10,
  setting: "inland",
  signSpot: signAt,
  padColour: "#5f8f3c",
  build: (builder) => {
    buildLagoon(builder);
    buildBoardwalk(builder);
    huts.forEach((hut) => {
      buildHut(builder, hut);
    });
    buildCampfire(builder);
    buildPlants(builder);
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "dugout canoe",
      pivot: canoeCentre,
      build: buildCanoe,
      motion: canoeMotion,
    },
    {
      name: "crocodile",
      pivot: crocAt,
      build: buildCrocodile,
      motion: { kind: "rise", reach: 4.5, height: 0.38, period: 2.2 },
    },
    {
      name: "kingfisher",
      pivot: kingfisherAt,
      build: buildKingfisher,
      motion: { kind: "nod", axis: "x", reach: 5, amplitude: 0.5, period: 0.8 },
    },
    {
      name: "campfire",
      pivot: [fireAt.x, 0.05, fireAt.z],
      build: buildFlames,
      motion: { kind: "flicker", period: 0.7 },
    },
  ],
  wanderers: [
    {
      name: "chickens",
      build: buildChicken,
      count: 3,
      centre: { x: 2.4, z: 6.2 },
      radius: 1.4,
      speed: 0.5,
    },
  ],
  smoke: [
    {
      at: [fireAt.x, 0.9, fireAt.z],
      colour: "#d9d4cc",
      puffs: 8,
      size: 0.35,
      rise: 2.6,
      spread: 0.4,
    },
  ],
  decks: [villageDeck],
  rides: [
    {
      id: "dugout-canoe",
      name: "the dugout canoe",
      start: canoeStart,
      reach: 0.6,
      seconds: 16,
      finish: canoeFinish,
      follow: canoeRide,
    },
  ],
  blockers: [
    { x: fireAt.x, z: fireAt.z, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Paddle round the lagoon",
    news: "Splish, splosh! You paddled a dugout canoe round the lagoon, past the houses on stilts that stay dry when the river floods.",
  },
};
