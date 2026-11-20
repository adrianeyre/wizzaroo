import { ConeGeometry, IcosahedronGeometry } from "three";
import {
  addBench,
  addFence,
  addGableRoof,
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import { addFlowerClump, meadowColours } from "./village-fete-parts.js";

/*
 * An old English orchard: rows of apple trees heavy with fruit, a
 * mown path between them, a red-brick apple store with a cider press,
 * beehives for the blossom, geese in the long grass, a tyre swing on
 * the oldest tree and a picking ladder to climb.
 */

const appleRed = "#c9302c";
const appleGreen = "#9cc43c";
const appleBlush = "#e0572e";
const canopyGreen = "#4c8f3a";
const canopyLight = "#63a647";
const barkGrey = "#6a5443";
const mownGrass = "#86b85a";
const longGrass = "#5d9a3a";
const crateTimber = "#b88a52";
const hiveWhite = "#f2efe6";
const signGreen = "#3d6b35";
const tyreBlack = "#2a2a2c";
const ropeHemp = "#c9b07a";

/* The trees */

interface AppleTree {
  x: number;
  z: number;
  size: number;
  /** Which way its leaning branch reaches, about y. */
  lean: number;
  isGreen?: boolean;
}

const trees: readonly AppleTree[] = [
  { x: -6.2, z: -3.4, size: 0.95, lean: 0.4 },
  { x: -3.0, z: -3.9, size: 1.0, lean: 2.2 },
  { x: 3.0, z: -3.9, size: 1.0, lean: -2.0, isGreen: true },
  { x: 6.2, z: -3.2, size: 0.9, lean: -0.6 },
  { x: -6.4, z: 0.9, size: 1.0, lean: 1.4, isGreen: true },
  { x: -3.0, z: 0.3, size: 0.95, lean: -1.2 },
  { x: 3.1, z: 0.2, size: 1.0, lean: 0.9 },
  { x: 6.4, z: 1.0, size: 0.95, lean: -2.6 },
];

/** The oldest tree, with the tyre swing on its long branch. */
const oldTree = { x: -4.4, z: 4.6, size: 1.3 };
const swingPivot: Triple = [-2.5, 2.7, 4.6];
const ropeDrop = 2.05;
const swingMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.5,
  period: 3.1,
};

/** The picking ladder leans into this tree's canopy. */
const ladderTree = trees[6];
const ladderFoot = { x: ladderTree.x, z: ladderTree.z + 1.9 };
const ladderTop: Triple = [ladderTree.x, 2.25, ladderTree.z + 0.85];

const appleSpots = (size: number): Triple[] =>
  [
    [0.75, 1.75, 0.35],
    [-0.6, 1.9, 0.55],
    [0.25, 1.6, 0.85],
    [-0.85, 1.7, -0.3],
    [0.6, 2.25, -0.6],
    [-0.2, 2.6, 0.7],
  ].map(([x, y, z]) => [x * size, y * size, z * size]);

const addApple = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  radius = 0.11,
) => {
  builder.add(
    "paint",
    colour,
    new IcosahedronGeometry(radius, 0),
    { at, scale: [1, 0.92, 1] },
    1.2,
  );
};

const addAppleTree = (
  builder: AttractionBuilder,
  { x, z, size, lean, isGreen = false }: AppleTree,
) => {
  const trunkTop = 1.15 * size;
  builder.cylinder("matte", barkGrey, {
    radius: 0.17 * size,
    radiusEnd: 0.12 * size,
    length: trunkTop,
    at: [x, trunkTop / 2, z],
    segments: 8,
  });
  /* Three boughs spread out from the top of the trunk */
  [0, 2.1, 4.2].forEach((turn) => {
    const angle = turn + lean;
    builder.bar(
      "matte",
      barkGrey,
      [x, trunkTop - 0.05, z],
      [
        x + Math.sin(angle) * 0.7 * size,
        trunkTop + 0.55 * size,
        z + Math.cos(angle) * 0.7 * size,
      ],
      0.13 * size,
      6,
    );
  });
  const clumps: [number, number, number, number][] = builder.isFar
    ? [[0, 2.0, 0, 1.25]]
    : [
        [0, 2.15, 0, 1.0],
        [0.6, 1.85, 0.3, 0.72],
        [-0.5, 1.85, -0.35, 0.75],
      ];
  clumps.forEach(([dx, dy, dz, scale], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? canopyGreen : canopyLight,
      0.95 * size * scale,
      [x + dx * size, dy * size, z + dz * size],
      [1.15, 0.78, 1.1],
      10,
    );
  });
  if (builder.isFar) {
    return;
  }
  appleSpots(size).forEach(([dx, dy, dz], index) => {
    addApple(
      builder,
      [x + dx, dy, z + dz],
      isGreen
        ? index % 3 === 0
          ? appleBlush
          : appleGreen
        : index % 3 === 0
          ? appleBlush
          : appleRed,
    );
  });
  /* A windfall in the grass under the tree */
  [[0.5, 0.6]].forEach(([dx, dz]) => {
    addApple(
      builder,
      [x + dx * size, 0.09, z + dz * size],
      isGreen ? appleGreen : appleRed,
      0.1,
    );
  });
};

const addOldTree = (builder: AttractionBuilder) => {
  const { x, z, size } = oldTree;
  builder.cylinder("matte", shade(barkGrey, 0.9), {
    radius: 0.3,
    radiusEnd: 0.2,
    length: 1.5,
    at: [x, 0.75, z],
    segments: 10,
  });
  /* The long bough the swing hangs from */
  builder.bar(
    "matte",
    barkGrey,
    [x, 1.4, z],
    [swingPivot[0] - 0.4, swingPivot[1] + 0.05, swingPivot[2]],
    0.2,
    8,
  );
  builder.bar(
    "matte",
    barkGrey,
    [swingPivot[0] - 0.45, swingPivot[1] + 0.05, swingPivot[2]],
    [swingPivot[0] + 0.5, swingPivot[1] + 0.25, swingPivot[2]],
    0.13,
    6,
  );
  builder.bar("matte", barkGrey, [x, 1.4, z], [x - 0.8, 2.3, z - 0.5], 0.18, 6);
  builder.bar("matte", barkGrey, [x, 1.4, z], [x - 0.2, 2.5, z + 0.7], 0.16, 6);
  const clumps: [number, number, number, number][] = builder.isFar
    ? [
        [0, 2.6, 0, 1.2],
        [1.3, 2.9, 0, 0.8],
      ]
    : [
        [0, 2.7, 0, 1.0],
        [-0.8, 2.4, -0.5, 0.8],
        [0.5, 2.9, 0.6, 0.75],
        [1.4, 3.1, 0.1, 0.7],
        [2.2, 3.15, -0.2, 0.55],
        [-0.3, 2.5, 0.8, 0.6],
      ];
  clumps.forEach(([dx, dy, dz, scale], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? shade(canopyGreen, 0.95) : canopyLight,
      1.0 * size * scale,
      [x + dx, dy, z + dz],
      [1.1, 0.75, 1.1],
      10,
    );
  });
  if (builder.isFar) {
    return;
  }
  [
    [-0.6, 2.1, 0.9],
    [0.9, 2.5, 0.8],
    [1.8, 2.6, 0.5],
    [-1.2, 2.0, 0.2],
    [0.3, 2.2, 1.1],
    [2.4, 2.75, 0.3],
  ].forEach(([dx, dy, dz], index) => {
    addApple(
      builder,
      [x + dx, dy, z + dz],
      index % 2 === 0 ? appleRed : appleBlush,
    );
  });
};

/* The picking ladder */

const addPickingLadder = (builder: AttractionBuilder) => {
  const { x, z } = ladderFoot;
  [-0.25, 0.25].forEach((side) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      [x + side, 0, z],
      [ladderTop[0] + side * 0.6, ladderTop[1] + 0.35, ladderTop[2]],
      0.07,
      6,
    );
  });
  const rungs = builder.isFar ? 3 : 7;
  for (let rung = 1; rung <= rungs; rung++) {
    const share = rung / (rungs + 1);
    builder.cylinder("matte", palette.paleTimber, {
      radius: 0.03,
      length: 0.5 - share * 0.2,
      at: [x, (ladderTop[1] + 0.35) * share, z + (ladderTop[2] - z) * share],
      axis: "x",
      segments: 6,
    });
  }
  if (builder.isFar) {
    return;
  }
  /* A wicker picking basket at the foot of the ladder */
  addBasket(builder, [x + 0.75, 0, z + 0.1]);
};

const addBasket = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.lathe(
    "matte",
    "#b98d4f",
    [
      [0, 0],
      [0.2, 0],
      [0.26, 0.22],
      [0.24, 0.22],
      [0.18, 0.03],
      [0, 0.03],
    ],
    [x, y, z],
    "y",
    12,
  );
  builder.torus("matte", "#9c7238", 0.2, 0.02, [x, y + 0.36, z], "z", 12);
  [
    [0.08, 0.06],
    [-0.08, 0.04],
    [0, -0.09],
    [0.03, 0.02],
  ].forEach(([dx, dz], index) => {
    addApple(
      builder,
      [x + dx, y + 0.2 + (index === 3 ? 0.08 : 0), z + dz],
      index % 2 === 0 ? appleRed : appleBlush,
      0.09,
    );
  });
};

/* The apple store */

const storeAt = { x: 0, z: -6.9 };
const storeWidth = 3.4;
const storeDepth = 2.0;
const storeHeight = 1.9;
const weathervaneAt: Triple = [storeAt.x, storeHeight + 1.0, storeAt.z + 0.6];

const buildStore = (builder: AttractionBuilder) => {
  const { x, z } = storeAt;
  const front = z + storeDepth / 2;
  const back = z - storeDepth / 2;
  /* Back and sides of red brick, on a stone plinth */
  builder.box(
    "matte",
    palette.darkStone,
    [storeWidth + 0.1, 0.2, storeDepth + 0.1],
    [x, 0.1, z],
  );
  builder.box(
    "matte",
    meadowColours.redBrick,
    [storeWidth, storeHeight, 0.22],
    [x, storeHeight / 2, back + 0.11],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      meadowColours.redBrick,
      [0.22, storeHeight, storeDepth],
      [x + side * (storeWidth / 2 - 0.11), storeHeight / 2, z],
    );
    /* Brick piers each side of the wide open front */
    builder.box(
      "matte",
      meadowColours.redBrick,
      [0.7, storeHeight, 0.22],
      [x + side * (storeWidth / 2 - 0.35), storeHeight / 2, front - 0.11],
    );
    if (!builder.isFar) {
      /* Brick courses picked out a shade darker */
      [0.45, 0.9, 1.35].forEach((height) => {
        builder.box(
          "matte",
          shade(meadowColours.redBrick, 0.82),
          [0.24, 0.04, storeDepth + 0.02],
          [x + side * (storeWidth / 2 - 0.11), height, z],
        );
      });
    }
  });
  /* Lintel over the opening */
  builder.box(
    "matte",
    palette.darkTimber,
    [storeWidth - 1.3, 0.22, 0.26],
    [x, storeHeight - 0.15, front - 0.11],
  );
  /* Gable ends and a red tiled roof */
  [front - 0.11, back + 0.11].forEach((wallZ) => {
    builder.add(
      "matte",
      meadowColours.redBrick,
      new ConeGeometry(storeWidth / 2 / Math.SQRT1_2, 0.9, 4, 1)
        .rotateY(Math.PI / 4)
        .scale(1, 1, 0.22 / storeWidth),
      { at: [x, storeHeight + 0.45, wallZ] },
    );
  });
  addGableRoof(builder, {
    width: storeDepth + 0.3,
    depth: storeWidth,
    rise: 0.95,
    at: [x, storeHeight, z],
    colour: palette.roofTile,
    overhang: 0.2,
    thickness: 0.1,
    turn: Math.PI / 2,
  });
  builder.box(
    "matte",
    shade(palette.roofTile, 0.75),
    [0.16, 0.12, storeDepth + 0.7],
    [x, storeHeight + 0.98, z],
  );
  if (builder.isFar) {
    return;
  }
  /* Rows of tiles across the roof */
  [0.25, 0.55, 0.85].forEach((share) => {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        shade(palette.roofTile, 0.86),
        [0.05, 0.04, storeDepth + 0.68],
        [
          x + side * (storeWidth / 2 + 0.2) * (1 - share),
          storeHeight + 0.95 * share + 0.07,
          z,
        ],
      );
    });
  });
  /* Slatted apple racks along the back wall, full of fruit */
  [0.45, 0.95, 1.45].forEach((height, shelf) => {
    builder.box(
      "matte",
      crateTimber,
      [storeWidth - 0.6, 0.05, 0.6],
      [x, height, back + 0.55],
    );
    for (let apple = 0; apple < 7; apple++) {
      addApple(
        builder,
        [
          x - 1.05 + apple * 0.35,
          height + 0.1,
          back + 0.45 + (apple % 2) * 0.2,
        ],
        (apple + shelf) % 3 === 0 ? appleGreen : appleRed,
        0.1,
      );
    }
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.06, 1.6, 0.6],
      [x + side * (storeWidth / 2 - 0.32), 0.95, back + 0.55],
    );
  });
  /* A lantern over the door */
  builder.box(
    "glow",
    palette.warmLight,
    [0.14, 0.2, 0.14],
    [x, storeHeight + 0.15, front + 0.12],
  );
  builder.box(
    "metal",
    palette.black,
    [0.2, 0.04, 0.2],
    [x, storeHeight + 0.27, front + 0.12],
  );
};

/* The cider press and crates by the store */

const pressAt = { x: 2.6, z: -6.2 };

const buildPress = (builder: AttractionBuilder) => {
  const { x, z } = pressAt;
  builder.box("matte", palette.darkTimber, [1.1, 0.5, 1.1], [x, 0.25, z]);
  builder.cylinder("matte", crateTimber, {
    radius: 0.38,
    length: 0.5,
    at: [x, 0.75, z],
    segments: 14,
  });
  if (!builder.isFar) {
    [0.6, 0.9].forEach((height) => {
      builder.torus(
        "metal",
        palette.darkSteel,
        0.39,
        0.025,
        [x, height, z],
        "y",
        14,
      );
    });
  }
  [-0.45, 0.45].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.14, 1.5, 0.14],
      [x + side, 1.0, z],
    );
  });
  builder.box("matte", palette.darkTimber, [1.1, 0.16, 0.18], [x, 1.75, z]);
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 0.8,
    at: [x, 1.35, z],
    segments: 8,
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.03,
    length: 0.9,
    at: [x, 1.9, z],
    axis: "x",
    segments: 6,
  });
  /* The spout and a jug of fresh juice */
  if (!builder.isFar) {
    builder.box("metal", palette.brass, [0.1, 0.06, 0.3], [x, 0.4, z + 0.65]);
    builder.lathe(
      "glass",
      "#e7b54a",
      [
        [0, 0],
        [0.1, 0],
        [0.12, 0.15],
        [0.07, 0.25],
        [0, 0.25],
      ],
      [x, 0, z + 0.85],
      "y",
      10,
    );
  }
};

const crates: readonly [number, number, number][] = [
  [-2.5, -5.4, 0],
  [-2.5, -5.4, 0.36],
  [-1.95, -5.55, 0],
  [3.75, -5.7, 0],
];

const addCrate = (builder: AttractionBuilder, [x, z, y]: readonly number[]) => {
  builder.box("matte", crateTimber, [0.55, 0.34, 0.4], [x, y + 0.17, z]);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(crateTimber, 0.8),
      [0.57, 0.06, 0.42],
      [x, y + 0.17 + side * 0.1, z],
    );
  });
  for (let apple = 0; apple < 4; apple++) {
    addApple(
      builder,
      [x - 0.18 + apple * 0.12, y + 0.36, z + (apple % 2 === 0 ? 0.06 : -0.08)],
      apple % 2 === 0 ? appleRed : appleBlush,
      0.09,
    );
  }
};

/* The beehives */

const hives: readonly [number, number][] = [
  [6.9, -0.9],
  [7.4, -2.0],
];

const addHive = (builder: AttractionBuilder, [x, z]: readonly number[]) => {
  builder.box("matte", palette.darkTimber, [0.6, 0.25, 0.6], [x, 0.12, z]);
  /* A white WBC hive: stacked lifts, wider at each step, and a gable lid */
  [0.4, 0.68, 0.96].forEach((height, lift) => {
    builder.box(
      "paint",
      hiveWhite,
      [0.72 - lift * 0.02, 0.28, 0.72 - lift * 0.02],
      [x, height, z],
    );
  });
  builder.add(
    "paint",
    hiveWhite,
    new ConeGeometry(0.62, 0.3, 4).rotateY(Math.PI / 4).scale(1, 1, 1),
    { at: [x, 1.25, z] },
  );
  if (!builder.isFar) {
    builder.box("matte", palette.black, [0.24, 0.04, 0.04], [x, 0.3, z + 0.37]);
    builder.box("paint", shade(hiveWhite, 0.9), [0.8, 0.04, 0.8], [x, 1.1, z]);
  }
};

/* The orchard round it all */

const buildGrounds = (builder: AttractionBuilder) => {
  /* A mown path up the middle, between longer meadow grass */
  builder.box("matte", mownGrass, [2.0, 0.03, 13.4], [0, 0.015, 1.6]);
  builder.box("matte", mownGrass, [9.0, 0.03, 1.6], [0, 0.016, -5.4]);
  if (!builder.isFar) {
    /* Tufts of long grass round the trees */
    for (let tuft = 0; tuft < 26; tuft++) {
      const angle = tuft * 2.39996;
      const reach = 2.4 + ((tuft * 37) % 60) / 10;
      const x = Math.sin(angle) * reach;
      const z = Math.cos(angle) * reach;
      if (Math.abs(x) < 1.3 || reach > 8.6) {
        continue;
      }
      builder.add(
        "matte",
        tuft % 2 === 0 ? longGrass : shade(longGrass, 1.15),
        new ConeGeometry(0.16, 0.3, 4),
        { at: [x, 0.15, z] },
      );
    }
  }
  /* A hedgerow round the back, with a five-bar gate in front */
  const hedgeRadius = 8.9;
  const hedgeSteps = builder.isFar ? 10 : 15;
  for (let step = 0; step <= hedgeSteps; step++) {
    const angle = Math.PI * 0.62 + (step / hedgeSteps) * Math.PI * 0.76;
    builder.sphere(
      "matte",
      step % 2 === 0 ? palette.hedge : shade(palette.hedge, 1.12),
      0.78,
      [Math.sin(angle) * hedgeRadius, 0.55, Math.cos(angle) * hedgeRadius],
      [1.2, 0.95, 0.9],
      builder.isFar ? 6 : 8,
    );
  }
  /* Post-and-rail fences along the front, either side of the gate */
  addFence(
    builder,
    { x: -7.6, z: 4.6 },
    { x: -5.2, z: 7.0 },
    {
      colour: palette.paleTimber,
      isPicket: false,
      finish: "matte",
      height: 0.8,
    },
  );
  addFence(
    builder,
    { x: 1.2, z: 8.6 },
    { x: 6.9, z: 5.3 },
    {
      colour: palette.paleTimber,
      isPicket: false,
      finish: "matte",
      height: 0.8,
    },
  );
  [-1.2, 1.2].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.16, 1.15, 0.16],
      [side, 0.58, 8.6],
    );
  });
  /* The gate stands open, swung back against the fence */
  if (!builder.isFar) {
    for (let bar = 0; bar < 5; bar++) {
      builder.box(
        "paint",
        palette.white,
        [0.05, 0.06, 2.1],
        [1.3, 0.2 + bar * 0.17, 7.5],
      );
    }
    builder.bar(
      "paint",
      palette.white,
      [1.3, 0.2, 8.5],
      [1.3, 0.88, 6.5],
      0.05,
      4,
    );
  }
  /* Blossom-pink and buttercup clumps in the grass */
  if (!builder.isFar) {
    [
      [-1.6, 2.6],
      [1.7, 6.6],
      [-5.0, -1.4],
      [4.9, 3.4],
    ].forEach(([x, z], index) => {
      addFlowerClump(
        builder,
        [x, 0, z],
        index % 2 === 0
          ? [meadowColours.butter, palette.white]
          : [meadowColours.rose, meadowColours.cream],
        5,
        0.3,
      );
    });
  }
  /* A picnic blanket with a basket of apples */
  builder.box(
    "matte",
    "#d9534f",
    [1.5, 0.02, 1.2],
    [3.4, 0.02, 4.6],
    [0, 0.3, 0],
  );
  if (!builder.isFar) {
    for (let stripe = 0; stripe < 4; stripe++) {
      builder.box(
        "matte",
        palette.cream,
        [0.08, 0.025, 1.2],
        [3.4 - 0.5 + stripe * 0.33, 0.025, 4.6],
        [0, 0.3, 0],
      );
    }
    addBasket(builder, [3.1, 0.03, 4.4]);
  }
  addBench(builder, [-0.1, 0, -4.2], 0, palette.paleTimber);
  /* A wheelbarrow of windfalls */
  if (!builder.isFar) {
    const [x, z] = [-1.7, -3.2];
    builder.box(
      "paint",
      "#3e6f8f",
      [0.6, 0.3, 0.85],
      [x, 0.42, z],
      [0.12, 0, 0],
    );
    builder.cylinder("matte", palette.black, {
      radius: 0.18,
      length: 0.06,
      at: [x, 0.18, z + 0.5],
      axis: "x",
      segments: 12,
    });
    [-0.22, 0.22].forEach((side) => {
      builder.bar(
        "matte",
        palette.darkTimber,
        [x + side, 0.35, z + 0.4],
        [x + side, 0.5, z - 0.85],
        0.05,
        4,
      );
      builder.bar(
        "matte",
        palette.darkTimber,
        [x + side, 0.35, z - 0.25],
        [x + side, 0, z - 0.25],
        0.04,
        4,
      );
    });
    for (let apple = 0; apple < 5; apple++) {
      addApple(
        builder,
        [x - 0.18 + apple * 0.09, 0.6, z - 0.2 + (apple % 2) * 0.2],
        appleRed,
        0.1,
      );
    }
  }
  addSignBoard(builder, [-2.6, 0, 7.8], signGreen);
};

/* Moving parts */

const buildSwing = (builder: AttractionBuilder) => {
  [-0.18, 0.18].forEach((side) => {
    builder.bar(
      "matte",
      ropeHemp,
      [side, 0, 0],
      [side * 0.6, -ropeDrop + 0.2, 0],
      0.035,
      5,
    );
  });
  builder.torus(
    "matte",
    tyreBlack,
    0.3,
    0.1,
    [0, -ropeDrop + 0.12, 0],
    "y",
    18,
  );
};

const buildHedgehog = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#7a5a3a", 0.2, [0, 0.12, 0], [1, 0.75, 1.25], 10);
  if (!builder.isFar) {
    for (let spine = 0; spine < 10; spine++) {
      const angle = (spine / 10) * Math.PI * 2;
      builder.add("matte", "#4a3524", new ConeGeometry(0.05, 0.14, 4), {
        at: [Math.sin(angle) * 0.13, 0.2, -0.04 + Math.cos(angle) * 0.15],
        rotation: [Math.cos(angle) * -0.8, 0, Math.sin(angle) * 0.8],
      });
    }
  }
  builder.sphere("matte", "#c9a27a", 0.09, [0, 0.1, 0.24], [0.9, 0.85, 1.2], 8);
  builder.sphere("paint", palette.black, 0.025, [0, 0.11, 0.35], [1, 1, 1], 5);
};

const hedgehogAt: Triple = [-1.7, -0.25, -1.6];

const buildLeafPile = (builder: AttractionBuilder) => {
  const [x, , z] = hedgehogAt;
  builder.sphere("matte", "#b8742e", 0.5, [x, 0, z], [1.2, 0.45, 1], 10);
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      "#d29a3c",
      0.32,
      [x + 0.3, 0.08, z + 0.15],
      [1, 0.5, 1],
      8,
    );
    builder.sphere(
      "matte",
      "#9c5a26",
      0.3,
      [x - 0.35, 0.05, z - 0.1],
      [1, 0.5, 1],
      8,
    );
  }
};

/** An apple hanging on a tree that drops to the grass as the Character comes. */
const fallingAppleAt: Triple = [trees[5].x + 0.85, 1.75, trees[5].z + 0.45];

const buildFallingApple = (builder: AttractionBuilder) => {
  addApple(builder, [0, 0, 0], appleRed, 0.13);
  builder.bar(
    "matte",
    palette.darkTimber,
    [0, 0.1, 0],
    [0.02, 0.2, 0],
    0.025,
    4,
  );
  builder.box(
    "matte",
    canopyLight,
    [0.1, 0.02, 0.06],
    [0.06, 0.18, 0],
    [0, 0, 0.5],
  );
};

const buildWeathervane = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.black, {
    radius: 0.025,
    length: 0.7,
    at: [0, 0.35, 0],
    segments: 6,
  });
  builder.box("metal", palette.black, [0.03, 0.03, 0.8], [0, 0.55, 0]);
  /* An apple at the front, a leaf for the tail */
  builder.sphere("paint", appleRed, 0.11, [0, 0.55, 0.45], [1, 1, 1], 10);
  builder.box("metal", palette.black, [0.02, 0.22, 0.24], [0, 0.55, -0.42]);
  builder.sphere("metal", palette.brass, 0.05, [0, 0.72, 0], [1, 1, 1], 8);
};

const robinAt: Triple = [0.3, 0.78, -4.42];

const buildRobin = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#7a5a3c", 0.09, [0, 0.07, -0.02], [1, 1, 1.3], 10);
  builder.sphere("matte", "#e0572e", 0.07, [0, 0.06, 0.06], [1, 1, 0.8], 8);
  builder.sphere("matte", "#7a5a3c", 0.06, [0, 0.15, 0.06], [1, 1, 1], 8);
  builder.add(
    "matte",
    palette.black,
    new ConeGeometry(0.015, 0.05, 4).rotateX(Math.PI / 2),
    {
      at: [0, 0.15, 0.13],
    },
  );
  builder.box(
    "matte",
    "#5a3f28",
    [0.05, 0.02, 0.12],
    [0, 0.08, -0.15],
    [0.4, 0, 0],
  );
};

/* Wanderers */

const buildGoose = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    palette.white,
    0.22,
    [0, 0.32, 0],
    [0.85, 0.8, 1.35],
    10,
  );
  builder.bar("matte", palette.white, [0, 0.4, 0.2], [0, 0.72, 0.3], 0.09, 6);
  builder.sphere("matte", palette.white, 0.08, [0, 0.76, 0.33], [1, 1, 1.2], 8);
  builder.add(
    "matte",
    "#f0902a",
    new ConeGeometry(0.035, 0.14, 5).rotateX(Math.PI / 2),
    { at: [0, 0.74, 0.46] },
  );
  [-0.08, 0.08].forEach((side) => {
    builder.bar("matte", "#f0902a", [side, 0.18, 0], [side, 0, 0.03], 0.03, 4);
    if (!builder.isFar) {
      builder.sphere(
        "paint",
        palette.black,
        0.015,
        [side * 0.7, 0.78, 0.38],
        [1, 1, 1],
        4,
      );
    }
  });
  builder.sphere(
    "matte",
    shade(palette.white, 0.92),
    0.12,
    [0, 0.38, -0.25],
    [0.9, 0.6, 1],
    8,
  );
};

const buildBee = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    meadowColours.butter,
    0.06,
    [0, 0, 0],
    [0.9, 0.9, 1.3],
    6,
  );
  builder.box("matte", palette.black, [0.1, 0.1, 0.025], [0, 0, -0.02]);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#e8f2f8",
      [0.08, 0.01, 0.05],
      [side * 0.06, 0.05, 0],
      [0, 0, side * 0.4],
    );
  });
};

/* Rides */

const swingRide = (progress: number, seconds: number): LocalSpot => {
  const seat: Triple = [
    swingPivot[0],
    swingPivot[1] - ropeDrop + 0.2,
    swingPivot[2],
  ];
  const [x, y, z] = moveWithPose(
    swingPivot,
    seat,
    findMotionPose(swingMotion, seconds),
  );
  const share = Math.min(1, progress * 10, (1 - progress) * 10);
  const outside = { x: swingPivot[0], z: swingPivot[2] + 1.2 };
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: 0,
  };
};

const ladderStart = { x: ladderFoot.x, z: ladderFoot.z + 0.75 };
const ladderFinish = { x: ladderFoot.x + 1.3, z: ladderFoot.z + 1.1 };

const ladderRide = (progress: number): LocalSpot => {
  const top = {
    x: ladderTop[0],
    y: ladderTop[1] - 0.25,
    z: ladderTop[2] + 0.3,
  };
  if (progress < 0.1) {
    const share = progress / 0.1;
    return {
      x: ladderStart.x,
      y: 0,
      z: ladderStart.z + (ladderFoot.z + 0.2 - ladderStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.85) {
    /* Up the ladder, a moment picking at the top, then back down */
    const climb = (progress - 0.1) / 0.75;
    const up = Math.min(1, climb * 2.6, (1 - climb) * 2.6);
    return {
      x: ladderFoot.x,
      y: top.y * up,
      z: ladderFoot.z + 0.2 + (top.z - ladderFoot.z - 0.2) * up,
      heading:
        Math.PI +
        (climb > 0.38 && climb < 0.62 ? Math.sin(climb * 40) * 0.4 : 0),
    };
  }
  const share = (progress - 0.85) / 0.15;
  return {
    x: ladderFoot.x + (ladderFinish.x - ladderFoot.x) * share,
    y: 0,
    z: ladderFoot.z + 0.2 + (ladderFinish.z - ladderFoot.z - 0.2) * share,
    heading: 0.6,
  };
};

export const appleOrchardModel: NewLandAttractionModel = {
  kind: "apple-orchard",
  islandId: "meadow-isle",
  name: "Apple Orchard",
  fact: "An apple tree is a deciduous tree: it drops its leaves in autumn and grows new ones in spring. In spring it is covered in pink and white blossom, bees carry pollen from flower to flower, and each flower can grow into an apple with seeds inside.",
  curriculumLink:
    "Science, Year 1: plants. Identify and name common deciduous trees, and describe the basic structure of flowering plants, including trees.",
  footprint: 9.6,
  setting: "inland",
  signSpot: { x: -2.6, z: 8.8 },
  build: (builder) => {
    buildGrounds(builder);
    trees.forEach((tree) => {
      addAppleTree(builder, tree);
    });
    addOldTree(builder);
    addPickingLadder(builder);
    buildStore(builder);
    buildPress(builder);
    crates.forEach((crate) => {
      addCrate(builder, crate);
    });
    hives.forEach((hive) => {
      addHive(builder, hive);
    });
    buildLeafPile(builder);
  },
  moving: [
    {
      name: "tyre-swing",
      pivot: swingPivot,
      build: buildSwing,
      motion: swingMotion,
    },
    {
      name: "hedgehog",
      pivot: hedgehogAt,
      build: buildHedgehog,
      motion: { kind: "rise", reach: 3.5, height: 0.3, period: 1.6 },
    },
    {
      name: "falling-apple",
      pivot: fallingAppleAt,
      build: buildFallingApple,
      motion: { kind: "rise", reach: 3, height: -1.6, period: 2.2 },
    },
    {
      name: "weathervane",
      pivot: weathervaneAt,
      build: buildWeathervane,
      motion: { kind: "whirl", axis: "y", idle: 0.15, speed: 3.5, reach: 6 },
    },
    {
      name: "robin",
      pivot: robinAt,
      build: buildRobin,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 4,
        amplitude: 0.45,
        period: 0.7,
      },
    },
  ],
  wanderers: [
    {
      name: "geese",
      build: buildGoose,
      count: 3,
      centre: { x: 4.6, z: -1.6 },
      radius: 1.6,
      speed: 0.4,
    },
    {
      name: "bees",
      build: buildBee,
      count: 4,
      centre: { x: 6.2, z: -1.8 },
      radius: 1.4,
      speed: 0.9,
      height: 1.3,
      bob: 0.25,
    },
  ],
  rides: [
    {
      id: "tyre-swing",
      name: "the tyre swing",
      start: { x: swingPivot[0], z: swingPivot[2] + 1.2 },
      reach: 0.55,
      seconds: 9,
      finish: { x: swingPivot[0] + 1.4, z: swingPivot[2] + 1.6 },
      follow: swingRide,
    },
    {
      id: "picking-ladder",
      name: "the picking ladder",
      start: ladderStart,
      reach: 0.55,
      seconds: 8,
      finish: ladderFinish,
      follow: ladderRide,
    },
  ],
  play: {
    label: "Pick an apple",
    news: "Crunch! You picked a shiny red apple, and when you cut it in half there were five little brown seeds in a star shape.",
  },
};
