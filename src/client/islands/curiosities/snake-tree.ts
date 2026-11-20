import { SphereGeometry, Vector3 } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const bark = "#5e4630";
const barkDark = "#46331f";
const moss = "#6f8f3a";
const canopy = "#2f7d32";
const canopyLight = "#4caf50";
const vineGreen = "#4f7a2a";
const snakeOlive = "#6b7a2a";
const snakeSpot = "#2a2a1a";
const snakeBelly = "#d8c46a";
const tongueRed = "#c8303a";
const logBark = "#6b4f34";
const frogGreen = "#5fbf3a";
const signColour = "#4f6b2a";

const trunkBase = { x: -0.9, z: -1.1 };
const trunkPoints: readonly Triple[] = [
  [-0.9, 0, -1.1],
  [-0.78, 0.8, -1.15],
  [-0.95, 1.6, -1.0],
  [-0.8, 2.3, -1.08],
  [-0.92, 3.1, -1.2],
];
const trunkThickness = [0.78, 0.66, 0.58, 0.5];
const branchFrom: Triple = [-0.7, 2.15, -1.05];
const branchTo: Triple = [2.3, 2.55, -0.85];
const branchRadius = 0.12;
const snakeRadius = 0.1;
const neckBase: Triple = [2.05, 2.62, -0.86];
const log = { x: 1.0, z: 1.5, length: 2.4, radius: 0.32 };
const frogAt: Triple = [1.5, log.radius * 2 - 0.02, log.z];
const vineAt: Triple = [0.6, 2.32, -0.95];

/** A point along the branch, from 0 at the trunk to 1 at its tip. */
const alongBranch = (share: number): Vector3 =>
  new Vector3(...branchFrom).lerp(new Vector3(...branchTo), share);

const buildTree = (builder: AttractionBuilder) => {
  for (let index = 0; index < trunkPoints.length - 1; index++) {
    builder.bar(
      "matte",
      index % 2 === 0 ? bark : shade(bark, 0.92),
      trunkPoints[index],
      trunkPoints[index + 1],
      trunkThickness[index],
      14,
    );
    if (index > 0 && !builder.isFar) {
      builder.sphere(
        "matte",
        bark,
        trunkThickness[index] / 2 + 0.02,
        trunkPoints[index],
        [1, 0.8, 1],
        12,
      );
    }
  }
  /* The big branch the snake lies on, and two smaller ones */
  builder.bar("matte", bark, branchFrom, branchTo, branchRadius * 2, 12);
  if (!builder.isFar) {
    builder.sphere("matte", bark, branchRadius, branchTo, [1, 1, 1], 8);
    builder.bar("matte", bark, [-0.85, 2.6, -1.1], [-2.3, 3.4, -0.7], 0.18, 8);
    builder.bar("matte", bark, [-0.9, 2.9, -1.2], [-0.5, 3.6, -2.4], 0.16, 8);
  }
  /* The canopy, in big leafy clumps */
  const clumps: [number, number, number, number][] = builder.isFar
    ? [
        [-0.9, 3.9, -1.3, 1.5],
        [-2.2, 3.6, -0.7, 0.9],
        [0.8, 3.6, -1.2, 1.0],
      ]
    : [
        [-0.9, 3.9, -1.3, 1.25],
        [-2.2, 3.6, -0.7, 0.85],
        [-0.4, 3.8, -2.4, 0.9],
        [0.8, 3.6, -1.2, 0.95],
        [-1.6, 4.4, -1.6, 0.8],
        [0.0, 4.5, -0.8, 0.75],
        [1.9, 3.3, -1.0, 0.6],
      ];
  clumps.forEach(([x, y, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? canopy : canopyLight,
      size,
      [x, y, z],
      [1.15, 0.75, 1.1],
      12,
    );
  });
  /* Buttress roots fanning out round the foot */
  (builder.isFar ? [] : [0.3, 1.5, 2.6, 3.7, 5.0]).forEach((turn, index) => {
    builder.add(
      "matte",
      index % 2 === 0 ? barkDark : bark,
      new SphereGeometry(1, 8, 5),
      {
        at: [
          trunkBase.x + Math.sin(turn) * 0.45,
          0.2,
          trunkBase.z + Math.cos(turn) * 0.45,
        ],
        rotation: [0, turn, 0],
        scale: [0.09, 0.45, 0.6],
      },
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Knots, moss and a hollow in the trunk */
  builder.sphere(
    "matte",
    barkDark,
    0.2,
    [-0.75, 1.3, -0.75],
    [1, 1.3, 0.4],
    10,
  );
  builder.sphere(
    "matte",
    palette.black,
    0.13,
    [-0.74, 1.3, -0.7],
    [1, 1.3, 0.4],
    8,
  );
  [
    [-0.6, 0.5, -0.8],
    [-1.2, 1.9, -0.9],
    [0.4, 2.42, -0.92],
  ].forEach((at, index) => {
    builder.sphere(
      "matte",
      moss,
      0.16 - index * 0.02,
      [at[0] ?? 0, at[1] ?? 0, at[2] ?? 0],
      [1.3, 0.5, 1],
      8,
    );
  });
  /* Hanging vines with heart-shaped leaves */
  [
    [-1.8, 3.3, -0.4, 2.0],
    [0.9, 3.2, -0.6, 1.6],
    [-0.2, 3.5, -0.4, 2.2],
  ].forEach(([x, y, z, drop]) => {
    const bottom: Triple = [x, y - drop, z + 0.1];
    builder.bar("matte", vineGreen, [x, y, z], bottom, 0.035, 4);
    for (let leaf = 0; leaf < 3; leaf++) {
      builder.sphere(
        "matte",
        canopyLight,
        0.08,
        [bottom[0] + 0.05, bottom[1] + 0.2 + leaf * 0.5, bottom[2]],
        [1, 1.2, 0.3],
        6,
      );
    }
  });
};

/** The anaconda's coils, wound round the branch, patterned with dark blotches. */
const buildCoils = (builder: AttractionBuilder) => {
  const direction = new Vector3(...branchTo)
    .sub(new Vector3(...branchFrom))
    .normalize();
  const side = new Vector3(0, 1, 0).cross(direction).normalize();
  const up = direction.clone().cross(side).normalize();
  const reach = branchRadius + snakeRadius * 0.85;
  const steps = builder.isFar ? 6 : 26;
  const turns = 3.2;
  const points: Triple[] = [];
  for (let step = 0; step <= steps; step++) {
    const share = step / steps;
    const angle = share * turns * Math.PI * 2;
    const centre = alongBranch(0.25 + share * 0.6);
    const point = centre
      .add(up.clone().multiplyScalar(Math.cos(angle) * reach))
      .add(side.clone().multiplyScalar(Math.sin(angle) * reach));
    points.push([point.x, point.y, point.z]);
  }
  /* The tail dangles below the branch at the trunk end */
  const tailStart = points[0];
  const tip: Triple = [
    tailStart[0] - 0.15,
    tailStart[1] - 0.6,
    tailStart[2] + 0.1,
  ];
  builder.bar("matte", snakeOlive, tailStart, tip, snakeRadius * 1.3, 8);
  builder.sphere("matte", snakeOlive, snakeRadius * 0.65, tip, [1, 1, 1], 6);
  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index];
    const to = points[index + 1];
    const isSpot = index % 4 === 1;
    builder.bar(
      "matte",
      isSpot ? snakeSpot : snakeOlive,
      from,
      to,
      snakeRadius * 2,
      builder.isFar ? 4 : 8,
    );
    if (!builder.isFar) {
      builder.sphere(
        "matte",
        isSpot ? snakeSpot : snakeOlive,
        snakeRadius,
        to,
        [1, 1, 1],
        6,
      );
    }
  }
  /* Up to where the neck rises from the branch */
  builder.bar(
    "matte",
    snakeOlive,
    points[points.length - 1],
    neckBase,
    snakeRadius * 2,
    10,
  );
};

/** The neck and head, rearing up from the branch tip to look at visitors. */
const buildHead = (builder: AttractionBuilder) => {
  const neck: Triple[] = [
    [0, 0, 0],
    [0.08, 0.22, 0.08],
    [0.1, 0.4, 0.25],
    [0.08, 0.5, 0.45],
  ];
  for (let index = 0; index < neck.length - 1; index++) {
    const from = neck[index];
    const to = neck[index + 1];
    builder.bar(
      "matte",
      index === 1 ? snakeSpot : snakeOlive,
      from,
      to,
      snakeRadius * 2 - index * 0.012,
      10,
    );
    builder.sphere(
      "matte",
      snakeOlive,
      snakeRadius - index * 0.006,
      to,
      [1, 1, 1],
      8,
    );
  }
  /* A yellow belly along the underside of the neck */
  builder.bar(
    "matte",
    snakeBelly,
    [0.04, 0.18, 0.12],
    [0.08, 0.38, 0.32],
    0.12,
    8,
  );
  const head: Triple = [0.08, 0.53, 0.6];
  builder.sphere("matte", snakeOlive, 0.15, head, [0.95, 0.6, 1.35], 14);
  builder.sphere(
    "matte",
    snakeBelly,
    0.12,
    [head[0], head[1] - 0.04, head[2] + 0.04],
    [0.9, 0.4, 1.3],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#e8c43a",
      0.045,
      [head[0] + side * 0.11, head[1] + 0.05, head[2] + 0.07],
      [1, 1, 1],
      8,
    );
    builder.box(
      "paint",
      palette.black,
      [0.012, 0.06, 0.02],
      [head[0] + side * 0.15, head[1] + 0.05, head[2] + 0.08],
    );
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [head[0] + side * 0.04, head[1] + 0.04, head[2] + 0.2],
      [1, 1, 1],
      4,
    );
    /* Dark stripe behind each eye */
    builder.box(
      "matte",
      snakeSpot,
      [0.02, 0.03, 0.16],
      [head[0] + side * 0.13, head[1] + 0.02, head[2] - 0.08],
    );
    /* The forked tongue */
    builder.box(
      "paint",
      tongueRed,
      [0.015, 0.012, 0.09],
      [head[0] + side * 0.025, head[1] - 0.04, head[2] + 0.36],
      [0, side * 0.35, 0],
    );
  });
  builder.box(
    "paint",
    tongueRed,
    [0.02, 0.012, 0.14],
    [head[0], head[1] - 0.04, head[2] + 0.26],
  );
  /* Blotches down the back of the head */
  [0.0, -0.12].forEach((back) => {
    builder.sphere(
      "matte",
      snakeSpot,
      0.05,
      [head[0], head[1] + 0.07, head[2] + back],
      [1, 0.4, 1.2],
      6,
    );
  });
};

const buildLog = (builder: AttractionBuilder) => {
  const { x, z, length, radius } = log;
  builder.cylinder("matte", logBark, {
    radius,
    radiusEnd: radius * 0.9,
    length,
    at: [x, radius, z],
    axis: "x",
    segments: 14,
  });
  if (builder.isFar) {
    return;
  }
  /* Its sawn ends showing the rings, and moss along the top */
  [-1, 1].forEach((end) => {
    builder.cylinder("matte", "#c49a64", {
      radius: radius * (end === 1 ? 0.84 : 0.94),
      length: 0.02,
      at: [x + end * (length / 2 + 0.005), radius, z],
      axis: "x",
      segments: 14,
    });
    builder.torus(
      "matte",
      "#9a7444",
      radius * 0.5,
      0.012,
      [x + end * (length / 2 + 0.017), radius, z],
      "x",
      14,
    );
  });
  builder.sphere(
    "matte",
    moss,
    0.25,
    [x - 0.5, radius * 1.85, z],
    [1.4, 0.3, 0.7],
    8,
  );
  /* A tape measure stretched along the log, with marks every metre */
  builder.box(
    "paint",
    "#f2d23c",
    [length - 0.1, 0.012, 0.08],
    [x, radius * 2 + 0.005, z + 0.12],
  );
  for (let mark = 0; mark < 9; mark++) {
    builder.box(
      "paint",
      palette.black,
      [0.012, 0.014, mark % 4 === 0 ? 0.08 : 0.04],
      [x - length / 2 + 0.1 + mark * 0.275, radius * 2 + 0.01, z + 0.12],
    );
  }
  builder.box(
    "paint",
    palette.postRed,
    [0.18, 0.12, 0.14],
    [x - length / 2 - 0.05, radius * 2 + 0.06, z + 0.12],
  );
  /* Toadstools growing out of the bark */
  [
    [x + 0.5, z + 0.3],
    [x + 0.7, z + 0.28],
    [x - 0.9, z - 0.3],
  ].forEach(([mx, mz], index) => {
    const height = 0.12 + (index % 2) * 0.05;
    builder.cylinder("matte", palette.cream, {
      radius: 0.025,
      length: height,
      at: [mx, height / 2, mz],
      segments: 6,
    });
    builder.sphere("paint", "#e8742f", 0.07, [mx, height, mz], [1, 0.5, 1], 8);
  });
};

const buildFrog = (builder: AttractionBuilder) => {
  builder.sphere("paint", frogGreen, 0.1, [0, 0.07, 0], [1, 0.7, 1.2], 10);
  builder.sphere(
    "paint",
    frogGreen,
    0.08,
    [0, 0.12, 0.08],
    [1.1, 0.75, 0.9],
    10,
  );
  [-1, 1].forEach((side) => {
    /* Big red eyes, and orange toes */
    builder.sphere(
      "paint",
      "#d8282a",
      0.035,
      [side * 0.06, 0.17, 0.11],
      [1, 1, 1],
      8,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.014,
      [side * 0.075, 0.18, 0.135],
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "paint",
      frogGreen,
      0.04,
      [side * 0.09, 0.04, -0.04],
      [1, 0.7, 1.6],
      6,
    );
    builder.sphere(
      "paint",
      "#f08a2a",
      0.022,
      [side * 0.07, 0.01, 0.12],
      [1.3, 0.5, 1],
      4,
    );
    builder.box(
      "paint",
      "#3f78c8",
      [0.01, 0.04, 0.12],
      [side * 0.098, 0.06, 0],
      [0, 0, 0],
    );
  });
};

const buildVine = (builder: AttractionBuilder) => {
  builder.bar("matte", vineGreen, [0, 0, 0], [0.05, -1.5, 0.1], 0.04, 5);
  builder.torus("matte", vineGreen, 0.12, 0.025, [0.05, -1.6, 0.1], "z", 10);
  [0.4, 0.8, 1.2].forEach((drop, index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? canopyLight : canopy,
      0.07,
      [0.07, -drop, 0.1],
      [1, 1.2, 0.3],
      6,
    );
  });
};

const addFern = (builder: AttractionBuilder, at: Triple, size: number) => {
  for (let index = 0; index < 6; index++) {
    const turn = (index / 6) * Math.PI * 2 + size;
    builder.add(
      "matte",
      index % 2 === 0 ? canopyLight : shade(canopy, 1.1),
      new SphereGeometry(1, 6, 3),
      {
        at: [
          at[0] + Math.sin(turn) * 0.35 * size,
          0.25 * size,
          at[2] + Math.cos(turn) * 0.35 * size,
        ],
        rotation: [-0.5, turn, 0],
        scale: [0.12 * size, 0.03, 0.45 * size],
      },
    );
  }
};

const buildGround = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#5e4a2e", {
    radius: 1.6,
    length: 0.03,
    at: [trunkBase.x, 0.015, trunkBase.z],
    segments: builder.isFar ? 12 : 24,
  });
  if (builder.isFar) {
    return;
  }
  addFern(builder, [-2.6, 0, -0.2], 1.1);
  addFern(builder, [2.6, 0, -1.8], 1.0);
  addFern(builder, [-2.0, 0, 1.8], 0.8);
  /* Fallen leaves and a shed snakeskin on the ground */
  for (let leaf = 0; leaf < 8; leaf++) {
    const turn = leaf * 2.3;
    builder.box(
      "matte",
      leaf % 2 === 0 ? "#a8743a" : "#c9a050",
      [0.16, 0.01, 0.09],
      [
        trunkBase.x + Math.sin(turn) * (1 + (leaf % 3) * 0.3),
        0.04,
        trunkBase.z + 0.6 + Math.cos(turn) * 0.8,
      ],
      [0, turn, 0],
    );
  }
  [
    [0.0, 0.2],
    [0.35, 0.35],
    [0.7, 0.25],
    [1.0, 0.45],
  ].forEach(([dx, dz], index) => {
    builder.bar(
      "matte",
      "#e8dcb4",
      [-0.4 + dx, 0.04, 0.0 + dz],
      [-0.4 + dx + 0.35, 0.04, 0.0 + dz + (index % 2 === 0 ? 0.15 : -0.15)],
      0.07,
      6,
    );
  });
};

export const snakeTreeModel: CuriosityModel = {
  kind: "snake-tree",
  islandId: "jungle-reach",
  name: "Snake Tree",
  fact: "Snakes are reptiles. Reptiles are grouped together because they have dry, scaly skin, breathe air with lungs, and most lay eggs; they also need the sun to warm them up. The green anaconda is one of the biggest snakes in the world and can be longer than five metres. It has no legs, so it grips branches by coiling round them.",
  curriculumLink:
    "Science, Year 4: recognise that living things can be grouped in a variety of ways, and explore and use classification keys.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: -1.2, z: 3.7 },
  build: (builder) => {
    buildGround(builder);
    buildTree(builder);
    buildCoils(builder);
    buildLog(builder);
    if (builder.isFar) {
      builder.bar(
        "matte",
        snakeOlive,
        neckBase,
        [neckBase[0] + 0.08, neckBase[1] + 0.5, neckBase[2] + 0.5],
        0.2,
        6,
      );
    }
    addSignBoard(builder, [-1.2, 0, 3.7], signColour);
  },
  moving: [
    {
      name: "snake head",
      pivot: neckBase,
      build: buildHead,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.32,
        period: 2.2,
      },
    },
    {
      name: "tree frog",
      pivot: frogAt,
      build: buildFrog,
      motion: { kind: "rise", reach: 5, height: 0.35, period: 0.9 },
    },
    {
      name: "hanging vine",
      pivot: vineAt,
      build: buildVine,
      motion: { kind: "swing", axis: "x", amplitude: 0.12, period: 4.2 },
    },
  ],
  blockers: [
    { x: trunkBase.x, z: trunkBase.z, radius: 0.75 },
    ...[-0.8, 0, 0.8, 1.6].map((dx): LocalBlocker => ({
      x: log.x - log.length / 2 + 0.4 + dx,
      z: log.z,
      radius: 0.38,
    })),
  ],
  play: {
    label: "Measure the snake",
    news: "You laid the tape along its coils… it's over five metres long! The anaconda flicked its tongue to smell you.",
  },
};
