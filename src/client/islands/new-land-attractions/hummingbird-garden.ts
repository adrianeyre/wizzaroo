import { TorusGeometry } from "three";
import {
  addBench,
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

const leafDeep = "#256b2a";
const leafMid = "#2f8a35";
const leafBright = "#4fa83c";
const soil = "#5a3f2a";
const gravel = "#cdbb93";
const darkTimber = "#5a3a22";
const plank = "#b98a56";
const rim = "#9c9486";
const flowerColours = ["#e8304a", "#ff7a1a", "#c43aa8", "#ffcf2a", "#ff4f8b"];
const hummingGreen = "#25b88a";
const hummingRuby = "#d0203a";
const nectarRed = "#e02a3a";
const signColour = "#b83a5a";

/* The pond, its fountain and the stepping stones across it */

const pond = { x: 1.4, z: -1.0, radius: 1.9 };
const stoneTop = 0.13;
const steppingStones: [number, number][] = [
  [-0.05, -0.75],
  [0.65, -1.2],
  [1.35, -0.8],
  [2.05, -1.25],
  [2.75, -0.85],
];

const buildPond = (builder: AttractionBuilder) => {
  builder.cylinder("water", palette.water, {
    radius: pond.radius,
    length: 0.04,
    at: [pond.x, 0.04, pond.z],
    segments: builder.segments(28, 14),
  });
  builder.torus(
    "matte",
    rim,
    pond.radius + 0.1,
    0.14,
    [pond.x, 0.05, pond.z],
    "y",
    builder.isFar ? 14 : 30,
  );
  steppingStones.forEach(([x, z], index) => {
    builder.cylinder("matte", index % 2 === 0 ? palette.stone : "#b5ad9e", {
      radius: 0.3,
      radiusEnd: 0.26,
      length: stoneTop,
      at: [x, stoneTop / 2, z],
      segments: builder.segments(10, 6),
    });
  });
  /* The fountain's bowl, in the middle of the pond */
  const bowl: Triple = [pond.x + 0.2, 0, pond.z - 0.95];
  builder.lathe(
    "matte",
    palette.cream,
    [
      [0, 0],
      [0.18, 0],
      [0.12, 0.25],
      [0.1, 0.4],
      [0.42, 0.52],
      [0.44, 0.6],
      [0, 0.6],
    ],
    bowl,
    "y",
    builder.segments(14, 8),
  );
  if (!builder.isFar) {
    builder.cylinder("water", palette.water, {
      radius: 0.38,
      length: 0.02,
      at: [bowl[0], 0.6, bowl[2]],
      segments: 14,
    });
    /* Lily pads and their flowers */
    const pads: [number, number, number][] = [
      [pond.x - 1.1, pond.z + 0.6, 0.26],
      [pond.x + 1.2, pond.z + 0.7, 0.22],
      [pond.x + 1.0, pond.z - 1.1, 0.24],
      [pond.x - 0.9, pond.z - 0.9, 0.2],
    ];
    pads.forEach(([x, z, radius], index) => {
      builder.cylinder("matte", index % 2 === 0 ? leafBright : leafMid, {
        radius,
        length: 0.02,
        at: [x, 0.07, z],
        segments: 10,
      });
      if (index % 2 === 0) {
        builder.sphere(
          "paint",
          "#f7b2cc",
          0.07,
          [x + 0.05, 0.11, z],
          [1, 0.7, 1],
          7,
        );
      }
    });
  }
};

/* Flower beds full of tube-shaped flowers, just right for hummingbirds */

/** A tube-shaped flower on a stem, its trumpet tipped outwards. */
const addTubeFlower = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  height: number,
  lean: number,
) => {
  const [x, y, z] = at;
  const top: Triple = [
    x + Math.sin(lean) * 0.12,
    y + height,
    z + Math.cos(lean) * 0.12,
  ];
  builder.bar("matte", leafMid, [x, y, z], top, 0.03, 4);
  builder.cylinder("paint", colour, {
    radius: 0.025,
    radiusEnd: 0.075,
    length: 0.2,
    at: [top[0], top[1] + 0.06, top[2]],
    segments: 7,
  });
  if (lean > 3) {
    builder.sphere(
      "matte",
      leafBright,
      0.11,
      [x + 0.05, y + height * 0.4, z],
      [1.3, 0.35, 0.7],
      6,
    );
  }
};

const beds: [number, number, number][] = [
  [-6.0, 3.5, 1.25],
  [4.7, 3.9, 1.15],
  [6.1, -1.3, 1.05],
  [-2.2, -5.6, 1.25],
  [5.0, -4.9, 1.05],
  [-6.4, -4.2, 0.9],
];

const buildBeds = (builder: AttractionBuilder) => {
  beds.forEach(([x, z, radius], bed) => {
    builder.cylinder("matte", soil, {
      radius,
      length: 0.14,
      at: [x, 0.07, z],
      segments: builder.segments(16, 8),
    });
    builder.torus(
      "matte",
      darkTimber,
      radius + 0.03,
      0.06,
      [x, 0.12, z],
      "y",
      builder.isFar ? 8 : 12,
    );
    if (builder.isFar) {
      builder.sphere(
        "matte",
        flowerColours[bed % flowerColours.length],
        radius * 0.85,
        [x, 0.35, z],
        [1, 0.45, 1],
        8,
      );
      return;
    }
    builder.sphere(
      "matte",
      bed % 2 === 0 ? leafMid : leafDeep,
      radius * 0.75,
      [x, 0.22, z],
      [1, 0.4, 1],
      10,
    );
    const flowers = 5;
    for (let flower = 0; flower < flowers; flower++) {
      const angle = flower * 2.399 + bed;
      const reach = radius * (0.25 + ((flower * 0.37) % 0.6));
      addTubeFlower(
        builder,
        [x + Math.sin(angle) * reach, 0.14, z + Math.cos(angle) * reach],
        flowerColours[(flower + bed) % flowerColours.length],
        0.45 + (flower % 3) * 0.15,
        angle,
      );
    }
  });
};

/* The pergola, covered in flowers, with a swing seat hanging from it */

const pergola = { x: -4.6, z: -1.0, halfX: 1.5, halfZ: 1.1, height: 2.3 };
const swingPivot: Triple = [pergola.x, pergola.height - 0.05, pergola.z];
const seatDrop = 1.8;
const swingMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.3,
  period: 3.6,
};

const buildPergola = (builder: AttractionBuilder) => {
  const { x, z, halfX, halfZ, height } = pergola;
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      builder.box(
        "paint",
        palette.white,
        [0.16, height, 0.16],
        [x + sx * halfX, height / 2, z + sz * halfZ],
      );
      if (!builder.isFar) {
        builder.box(
          "paint",
          palette.white,
          [0.24, 0.12, 0.24],
          [x + sx * halfX, 0.06, z + sz * halfZ],
        );
      }
    });
    builder.box(
      "paint",
      palette.white,
      [halfX * 2 + 0.5, 0.16, 0.1],
      [x, height + 0.04, z + sx * halfZ],
    );
  });
  builder.box(
    "paint",
    palette.white,
    [halfX * 2 + 0.5, 0.16, 0.1],
    [x, height + 0.04, z],
  );
  const joists = builder.isFar ? 3 : 7;
  for (let joist = 0; joist < joists; joist++) {
    const across = -halfX - 0.1 + ((halfX * 2 + 0.2) * joist) / (joists - 1);
    builder.box(
      "paint",
      palette.white,
      [0.08, 0.12, halfZ * 2 + 0.5],
      [x + across, height + 0.17, z],
    );
  }
  /* Bougainvillea scrambling over the top */
  const blooms: [number, number, number][] = builder.isFar
    ? [
        [-0.8, 0, 0.6],
        [0.8, 0, 0.6],
      ]
    : [
        [-1.1, -0.6, 0.45],
        [-0.3, 0.7, 0.5],
        [0.6, -0.5, 0.48],
        [1.2, 0.6, 0.42],
        [0.1, -1.0, 0.38],
        [-1.2, 1.0, 0.36],
      ];
  blooms.forEach(([dx, dz, radius], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#d6337a" : leafMid,
      radius,
      [x + dx, height + 0.3, z + dz],
      [1.3, 0.5, 1.1],
      8,
    );
  });
  if (!builder.isFar) {
    /* Climbing stems up the front posts, with flowers on */
    [-1, 1].forEach((sx) => {
      const post: Triple = [x + sx * halfX, 0, z + halfZ];
      for (let step = 0; step < 4; step++) {
        builder.sphere(
          "matte",
          step % 2 === 0 ? "#d6337a" : leafBright,
          0.13,
          [
            post[0] + 0.1 * (step % 2 === 0 ? 1 : -1),
            0.5 + step * 0.45,
            post[2] + 0.1,
          ],
          [1, 1, 0.7],
          7,
        );
      }
    });
  }
};

const buildSwingSeat = (builder: AttractionBuilder) => {
  [-0.55, 0.55].forEach((side) => {
    builder.bar(
      "matte",
      "#d9c49a",
      [side, 0, 0],
      [side, -seatDrop + 0.04, 0],
      0.04,
      5,
    );
    if (!builder.isFar) {
      builder.torus(
        "metal",
        palette.brass,
        0.05,
        0.015,
        [side, -0.02, 0],
        "x",
        8,
      );
    }
  });
  builder.box("paint", "#f2c94a", [1.25, 0.07, 0.48], [0, -seatDrop, 0]);
  builder.box(
    "paint",
    darkTimber,
    [1.3, 0.05, 0.08],
    [0, -seatDrop - 0.05, 0.2],
  );
  builder.box(
    "paint",
    "#f2c94a",
    [1.25, 0.42, 0.05],
    [0, -seatDrop + 0.24, -0.23],
    [-0.12, 0, 0],
  );
  if (!builder.isFar) {
    [-0.3, 0.3].forEach((side) => {
      builder.sphere(
        "matte",
        side < 0 ? "#3aa6a0" : "#e0703a",
        0.13,
        [side, -seatDrop + 0.15, -0.12],
        [1.2, 0.9, 0.5],
        8,
      );
    });
  }
};

/* The feeder pole, where the hummingbirds sip */

const feeder = { x: -1.1, z: 2.7 };

const addFeeder = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.bar("metal", palette.darkSteel, [x, y, z], [x, y - 0.2, z], 0.015, 4);
  builder.lathe(
    "glass",
    nectarRed,
    [
      [0, 0.32],
      [0.04, 0.3],
      [0.1, 0.22],
      [0.11, 0.05],
      [0.09, 0],
      [0, 0],
    ],
    [x, y - 0.52, z],
    "y",
    builder.segments(10, 6),
  );
  builder.cylinder("paint", "#d02a3a", {
    radius: 0.17,
    radiusEnd: 0.15,
    length: 0.06,
    at: [x, y - 0.55, z],
    segments: builder.segments(14, 8),
  });
  if (!builder.isFar) {
    for (let port = 0; port < 4; port++) {
      const angle = (port / 4) * Math.PI * 2;
      builder.sphere(
        "paint",
        "#ffd23a",
        0.035,
        [x + Math.sin(angle) * 0.13, y - 0.51, z + Math.cos(angle) * 0.13],
        [1, 0.5, 1],
        6,
      );
    }
  }
};

const buildFeederPole = (builder: AttractionBuilder) => {
  const { x, z } = feeder;
  builder.cylinder("paint", darkTimber, {
    radius: 0.06,
    length: 2.4,
    at: [x, 1.2, z],
    segments: 8,
  });
  builder.box("paint", darkTimber, [1.3, 0.06, 0.06], [x, 2.25, z]);
  builder.sphere("paint", palette.brass, 0.07, [x, 2.44, z], [1, 1, 1], 8);
  addFeeder(builder, [-0.58 + x, 2.22, z]);
  addFeeder(builder, [0.58 + x, 2.22, z]);
  if (!builder.isFar) {
    /* A little sign: a hummingbird and a flower */
    builder.box("paint", palette.cream, [0.5, 0.32, 0.04], [x, 1.25, z + 0.07]);
    builder.sphere(
      "paint",
      hummingGreen,
      0.06,
      [x - 0.08, 1.27, z + 0.1],
      [1.4, 0.8, 0.4],
      6,
    );
    builder.cylinder("paint", flowerColours[0], {
      radius: 0.02,
      radiusEnd: 0.06,
      length: 0.14,
      at: [x + 0.12, 1.25, z + 0.1],
      segments: 6,
    });
  }
};

/* The hummingbirds, hovering round the feeders, facing local -z */

const buildHummingbird = (builder: AttractionBuilder) => {
  builder.sphere("paint", hummingGreen, 0.07, [0, 0, 0], [0.8, 0.85, 1.6], 8);
  builder.sphere("paint", hummingGreen, 0.05, [0, 0.04, -0.1], [1, 1, 1], 7);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glass",
      "#c9efe2",
      0.12,
      [side * 0.11, 0.06, 0],
      [1, 0.12, 0.42],
      8,
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "paint",
    hummingRuby,
    0.045,
    [0, 0.0, -0.08],
    [0.9, 0.8, 0.9],
    6,
  );
  builder.cylinder("matte", palette.black, {
    radius: 0.012,
    radiusEnd: 0.003,
    length: 0.17,
    at: [0, 0.04, -0.22],
    axis: "z",
    segments: 4,
  });
  builder.box(
    "paint",
    shade(hummingGreen, 0.7),
    [0.06, 0.012, 0.12],
    [0, -0.01, 0.13],
    [-0.3, 0, 0],
  );
};

/* Giant heliconias at the back, their red and yellow claws nodding */

const heliconiaPivot: Triple = [1.4, 0, -5.6];

const buildHeliconias = (builder: AttractionBuilder) => {
  const plants: [number, number, number][] = [
    [-1.5, 0.2, 1.0],
    [0, -0.3, 1.15],
    [1.6, 0.3, 0.95],
  ];
  plants.forEach(([dx, dz, size], plant) => {
    const base: Triple = [dx, 0, dz];
    builder.bar("matte", leafMid, base, [dx, 2.3 * size, dz], 0.07, 6);
    /* Big paddle leaves */
    const leaves = builder.isFar ? 2 : 3;
    for (let leaf = 0; leaf < leaves; leaf++) {
      const angle = leaf * 1.7 + plant;
      const up = (1.0 + leaf * 0.35) * size;
      builder.sphere(
        "matte",
        leaf % 2 === 0 ? leafDeep : leafBright,
        0.55 * size,
        [dx + Math.sin(angle) * 0.45, up, dz + Math.cos(angle) * 0.45],
        [0.35, 0.08, 1],
        builder.isFar ? 6 : 8,
      );
    }
    /* The hanging string of bracts, zig-zagging down */
    const top = 2.3 * size;
    const bracts = builder.isFar ? 3 : 6;
    for (let bract = 0; bract < bracts; bract++) {
      const side = bract % 2 === 0 ? 1 : -1;
      const y = top - 0.12 - bract * 0.16;
      builder.cylinder("paint", "#e0202f", {
        radius: 0.06,
        radiusEnd: 0.012,
        length: 0.3,
        at: [dx + side * 0.1, y, dz + 0.08],
        axis: "x",
        segments: 6,
      });
      if (!builder.isFar) {
        builder.sphere(
          "paint",
          "#ffd23a",
          0.03,
          [dx + side * 0.25, y + 0.02, dz + 0.08],
          [1, 1, 1],
          5,
        );
      }
    }
  });
};

/* A flower-shaped spinner on a tall pole, whirling in the breeze */

const spinnerPivot: Triple = [4.7, 2.2, 3.9];

const buildSpinnerPole = (builder: AttractionBuilder) => {
  const [x, , z] = spinnerPivot;
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.04,
    length: spinnerPivot[1],
    at: [x, spinnerPivot[1] / 2, z],
    segments: 6,
  });
};

const buildSpinner = (builder: AttractionBuilder) => {
  const petals = 6;
  for (let petal = 0; petal < petals; petal++) {
    const angle = (petal / petals) * Math.PI * 2;
    builder.sphere(
      "paint",
      flowerColours[petal % flowerColours.length],
      0.26,
      [Math.sin(angle) * 0.3, Math.cos(angle) * 0.3, 0.06],
      [0.42, 1, 0.12],
      builder.isFar ? 6 : 7,
    );
  }
  builder.cylinder("paint", "#ffd23a", {
    radius: 0.12,
    length: 0.1,
    at: [0, 0, 0.09],
    axis: "z",
    segments: builder.segments(12, 6),
  });
};

/* The path, the arch over the way in, and things to sit on */

const buildPathsAndArch = (builder: AttractionBuilder) => {
  const path: [number, number][] = [
    [0, 8.2],
    [0, 6.2],
    [0.3, 4.4],
    [0.9, 2.6],
    [1.4, 1.4],
  ];
  for (let index = 1; index < path.length; index++) {
    const [fromX, fromZ] = path[index - 1];
    const [toX, toZ] = path[index];
    builder.box(
      "matte",
      gravel,
      [1.4, 0.03, Math.hypot(toX - fromX, toZ - fromZ) + 0.6],
      [(fromX + toX) / 2, 0.015, (fromZ + toZ) / 2],
      [0, Math.atan2(toX - fromX, toZ - fromZ), 0],
    );
  }
  builder.cylinder("matte", gravel, {
    radius: 2.5,
    length: 0.025,
    at: [pond.x, 0.012, pond.z],
    segments: builder.segments(28, 12),
  });
  /* The flowery arch */
  const arch = { z: 6.2, half: 1.05, height: 1.75 };
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.white,
      [0.14, arch.height, 0.14],
      [side * arch.half, arch.height / 2, arch.z],
    );
  });
  builder.add(
    "paint",
    palette.white,
    new TorusGeometry(
      arch.half,
      0.07,
      builder.segments(6, 4),
      builder.segments(18, 8),
      Math.PI,
    ),
    { at: [0, arch.height, arch.z] },
  );
  const archBlooms = builder.isFar ? 3 : 7;
  for (let bloom = 0; bloom < archBlooms; bloom++) {
    const angle = (bloom / (archBlooms - 1)) * Math.PI;
    builder.sphere(
      "matte",
      bloom % 3 === 1 ? leafMid : flowerColours[bloom % flowerColours.length],
      0.16,
      [
        Math.cos(angle) * arch.half,
        arch.height + Math.sin(angle) * arch.half,
        arch.z + 0.05,
      ],
      [1, 1, 0.8],
      6,
    );
  }
  addBench(builder, [3.3, 0, 2.2], Math.PI + 0.35, plank);
  /* A stone bird bath */
  const bath: Triple = [-2.7, 0, -3.3];
  builder.lathe(
    "matte",
    palette.stone,
    [
      [0, 0],
      [0.25, 0],
      [0.25, 0.08],
      [0.1, 0.18],
      [0.08, 0.7],
      [0.38, 0.82],
      [0.4, 0.9],
      [0, 0.9],
    ],
    bath,
    "y",
    builder.segments(14, 8),
  );
  if (!builder.isFar) {
    builder.cylinder("water", palette.water, {
      radius: 0.33,
      length: 0.02,
      at: [bath[0], 0.9, bath[2]],
      segments: 14,
    });
  }
};

/* Jungle trees round the back */

const buildTrees = (builder: AttractionBuilder) => {
  const trees: [number, number, number][] = [
    [-5.4, -6.4, 1],
    [6.6, 2.0, 0.85],
  ];
  trees.forEach(([x, z, size]) => {
    builder.cylinder("matte", "#5e4630", {
      radius: 0.22 * size,
      radiusEnd: 0.13 * size,
      length: 3.8 * size,
      at: [x, 1.9 * size, z],
      segments: 8,
    });
    const clumps: [number, number, number, number][] = builder.isFar
      ? [[0, 4.2, 0, 1.4]]
      : [
          [0, 4.3, 0, 1.2],
          [0.8, 3.9, 0.3, 0.9],
          [-0.7, 4.0, -0.3, 0.9],
          [0.1, 4.9, 0.2, 0.8],
        ];
    clumps.forEach(([dx, dy, dz, radius], index) => {
      builder.sphere(
        "matte",
        [leafDeep, leafMid, leafBright][index % 3],
        radius * size,
        [x + dx * size, dy * size, z + dz * size],
        [1, 0.75, 1],
        builder.isFar ? 10 : 9,
      );
    });
  });
};

/* Butterflies */

const buildButterfly = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    builder.box("paint", "#ff8a1a", [0.28, 0.01, 0.14], [0, 0.02, 0]);
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#ff8a1a",
      0.08,
      [side * 0.07, 0.02, 0.02],
      [1, 0.15, 0.8],
      6,
    );
    builder.sphere(
      "paint",
      "#2b2b2b",
      0.05,
      [side * 0.06, 0.01, -0.07],
      [1, 0.15, 0.8],
      5,
    );
  });
  builder.cylinder("matte", palette.black, {
    radius: 0.012,
    length: 0.14,
    at: [0, 0.02, 0],
    axis: "z",
    segments: 4,
  });
};

/* The rides */

const swingStart = { x: pergola.x, z: pergola.z + 1.95 };
const swingFinish = { x: pergola.x + 1.3, z: pergola.z + 2.6 };

const swingRide = (progress: number, seconds: number): LocalSpot => {
  const seat: Triple = [
    swingPivot[0],
    swingPivot[1] - seatDrop + 0.06,
    swingPivot[2],
  ];
  const [x, y, z] = moveWithPose(
    swingPivot,
    seat,
    findMotionPose(swingMotion, seconds),
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? swingStart : swingFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: 0,
  };
};

const hopStart = { x: pond.x - pond.radius - 0.75, z: pond.z + 0.35 };
const hopFinish = { x: pond.x + pond.radius + 0.75, z: pond.z - 0.1 };

const hopRide = (progress: number): LocalSpot => {
  const spots: [number, number, number][] = [
    [hopStart.x, 0, hopStart.z],
    ...steppingStones.map(([x, z]): [number, number, number] => [
      x,
      stoneTop,
      z,
    ]),
    [hopFinish.x, 0, hopFinish.z],
  ];
  const hops = spots.length - 1;
  const along = Math.min(hops - 0.0001, Math.max(0, progress * hops));
  const hop = Math.floor(along);
  const share = along - hop;
  const [fromX, fromY, fromZ] = spots[hop];
  const [toX, toY, toZ] = spots[hop + 1];
  return {
    x: fromX + (toX - fromX) * share,
    y: fromY + (toY - fromY) * share + 0.4 * Math.sin(share * Math.PI),
    z: fromZ + (toZ - fromZ) * share,
    heading: Math.atan2(toX - fromX, toZ - fromZ),
  };
};

export const hummingbirdGardenModel: NewLandAttractionModel = {
  kind: "hummingbird-garden",
  islandId: "jungle-reach",
  name: "Hummingbird Garden",
  fact: "Hummingbirds drink sweet nectar from deep, tube-shaped flowers, hovering in mid-air while their wings beat up to 80 times a second. As a hummingbird feeds, pollen dusts its head, and it carries the pollen to the next flower it visits. Moving pollen from flower to flower is called pollination, and it helps the plant make seeds.",
  curriculumLink:
    "Science, Year 3: plants. Explore the part that flowers play in the life cycle of flowering plants, including pollination, seed formation and seed dispersal (hummingbirds carry pollen from flower to flower).",
  footprint: 9,
  setting: "inland",
  signSpot: { x: -2.7, z: 7.7 },
  build: (builder) => {
    buildPathsAndArch(builder);
    buildPond(builder);
    buildBeds(builder);
    buildPergola(builder);
    buildFeederPole(builder);
    buildSpinnerPole(builder);
    buildTrees(builder);
    addSignBoard(builder, [-2.7, 0, 7.0], signColour, 0.15);
  },
  moving: [
    {
      name: "hummingbirds",
      pivot: [feeder.x, 1.75, feeder.z],
      build: buildHummingbird,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 0.95,
        count: 4,
        speed: 1.3,
        isFacingAlong: true,
        bob: 0.18,
      },
    },
    {
      name: "fountain",
      pivot: [pond.x + 0.2, 0.6, pond.z - 0.95],
      build: (builder) => {
        builder.cylinder("water", "#bfe8f5", {
          radius: 0.05,
          radiusEnd: 0.1,
          length: 1.3,
          at: [0, 0.65, 0],
          segments: builder.segments(10, 6),
        });
        builder.sphere("water", "#bfe8f5", 0.2, [0, 1.3, 0], [1, 0.6, 1], 10);
      },
      motion: { kind: "splash", reach: 5, period: 1.4 },
    },
    {
      name: "heliconias",
      pivot: heliconiaPivot,
      build: buildHeliconias,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.08,
        period: 2.2,
      },
    },
    {
      name: "flower spinner",
      pivot: spinnerPivot,
      build: buildSpinner,
      motion: { kind: "whirl", axis: "z", idle: 0.6, speed: 6, reach: 5 },
    },
    {
      name: "swing seat",
      pivot: swingPivot,
      build: buildSwingSeat,
      motion: swingMotion,
    },
  ],
  wanderers: [
    {
      name: "butterflies",
      build: buildButterfly,
      count: 5,
      centre: { x: 0.5, z: 0.5 },
      radius: 4.5,
      speed: 0.6,
      height: 1.4,
      bob: 0.35,
    },
  ],
  rides: [
    {
      id: "stepping-stones",
      name: "the stepping stones",
      start: hopStart,
      reach: 0.6,
      seconds: 6,
      finish: hopFinish,
      follow: hopRide,
    },
    {
      id: "swing-seat",
      name: "the swing seat",
      start: swingStart,
      reach: 0.6,
      seconds: 9,
      finish: swingFinish,
      follow: swingRide,
    },
  ],
  play: {
    label: "Fill the feeders",
    news: "Whirr! The hummingbirds zoomed in to sip the sweet nectar, and carried pollen from flower to flower as they went.",
  },
};
