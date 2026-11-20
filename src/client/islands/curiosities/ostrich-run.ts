import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const trackSand = "#c9a066";
const fenceTimber = "#9a6a3e";
const feathersBlack = "#2b2725";
const plumeWhite = "#f4f1ea";
const ostrichSkin = "#d9a3a0";
const beakColour = "#e8b88a";
const eggCream = "#f3ead2";
const straw = "#d8b65a";
const tinRoof = "#9aa3ad";
const signColour = "#9a5a2a";

const run = { minX: -3.4, maxX: 3.4, minZ: -3.0, maxZ: 1.0 };
const lane = { minX: -3.3, maxX: 3.3, minZ: 1.3, maxZ: 2.05 };
const laneZ = (lane.minZ + lane.maxZ) / 2;
const nestAt: LocalPoint = { x: -2.3, z: -1.9 };
const eggPivot: Triple = [nestAt.x, 0.12, nestAt.z];
const standingOstrich: Triple = [-1.2, 0, -2.1];
const neckPivot: Triple = [standingOstrich[0], 1.38, standingOstrich[2] + 0.28];
const shelterAt: LocalPoint = { x: 2.3, z: -2.1 };
const finishFlagPivot: Triple = [lane.maxX - 0.4, 1.95, lane.maxZ + 0.12];
const rideStart: LocalPoint = { x: -3.05, z: laneZ };
const rideFinish: LocalPoint = { x: 3.2, z: laneZ };

/* The fence round the run, posts and three rails */

const addRanchFence = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z);
  const rails = builder.isFar ? [0.75] : [0.3, 0.65, 1.0];
  rails.forEach((height) => {
    builder.box(
      "matte",
      fenceTimber,
      [0.05, 0.1, length],
      [(from.x + to.x) / 2, height, (from.z + to.z) / 2],
      [0, turn, 0],
    );
  });
  const posts = Math.max(1, Math.round(length / (builder.isFar ? 2.2 : 0.85)));
  for (let post = 0; post <= posts; post++) {
    const share = post / posts;
    builder.box(
      "matte",
      shade(fenceTimber, 0.82),
      [0.1, 1.15, 0.1],
      [
        from.x + (to.x - from.x) * share,
        0.575,
        from.z + (to.z - from.z) * share,
      ],
      [0, turn, 0],
    );
  }
};

const fenceCorners: LocalPoint[] = [
  { x: run.minX, z: run.maxZ },
  { x: run.maxX, z: run.maxZ },
  { x: run.maxX, z: run.minZ },
  { x: run.minX, z: run.minZ },
];

const buildFence = (builder: AttractionBuilder) => {
  fenceCorners.forEach((from, index) => {
    addRanchFence(
      builder,
      from,
      fenceCorners[(index + 1) % fenceCorners.length],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Post caps on the corners */
  fenceCorners.forEach(({ x, z }) => {
    builder.cylinder("matte", shade(fenceTimber, 0.7), {
      radius: 0.09,
      radiusEnd: 0.0,
      length: 0.14,
      at: [x, 1.22, z],
      segments: 4,
    });
  });
};

/* The race track along the front, with a start banner and a finish banner */

const buildTrack = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    trackSand,
    [lane.maxX - lane.minX, 0.03, lane.maxZ - lane.minZ],
    [0, 0.015, laneZ],
  );
  if (builder.isFar) {
    return;
  }
  [lane.minZ, lane.maxZ].forEach((z) => {
    builder.box(
      "paint",
      palette.white,
      [lane.maxX - lane.minX, 0.01, 0.05],
      [0, 0.035, z],
    );
  });
  /* Start line, and a chequered finish line */
  builder.box(
    "paint",
    palette.white,
    [0.08, 0.01, lane.maxZ - lane.minZ],
    [lane.minX + 0.35, 0.035, laneZ],
  );
  for (let square = 0; square < 6; square++) {
    [0, 1].forEach((column) => {
      builder.box(
        "paint",
        (square + column) % 2 === 0 ? palette.black : palette.white,
        [0.12, 0.012, (lane.maxZ - lane.minZ) / 6],
        [
          lane.maxX - 0.45 + column * 0.12,
          0.036,
          lane.minZ + (square + 0.5) * ((lane.maxZ - lane.minZ) / 6),
        ],
      );
    });
  }
  /* Banners on posts over each end */
  [
    { x: lane.minX + 0.35, colour: "#3a8a5a" },
    { x: lane.maxX - 0.4, colour: "#d63a2e" },
  ].forEach(({ x, colour }, index) => {
    [lane.minZ - 0.12, lane.maxZ + 0.12].forEach((z) => {
      builder.cylinder("paint", palette.white, {
        radius: 0.04,
        length: 1.9,
        at: [x, 0.95, z],
        segments: 8,
      });
      builder.sphere("paint", colour, 0.06, [x, 1.92, z], [1, 1, 1], 8);
    });
    builder.box(
      "paint",
      colour,
      [0.04, 0.3, lane.maxZ - lane.minZ + 0.2],
      [x, 1.7, laneZ],
    );
    if (index === 1) {
      for (let square = 0; square < 8; square++) {
        builder.box(
          "paint",
          square % 2 === 0 ? palette.black : palette.white,
          [0.045, 0.12, 0.1],
          [
            x,
            1.7 + (square % 2 === 0 ? 0.06 : -0.06),
            lane.minZ + square * 0.1 + 0.03,
          ],
        );
      }
    } else {
      builder.box("paint", palette.white, [0.045, 0.08, 0.5], [x, 1.7, laneZ]);
    }
  });
};

/* The nest, the shelter and the water trough */

const buildNest = (builder: AttractionBuilder) => {
  const { x, z } = nestAt;
  builder.cylinder("matte", straw, {
    radius: 0.6,
    radiusEnd: 0.5,
    length: 0.12,
    at: [x, 0.06, z],
    segments: builder.isFar ? 8 : 18,
  });
  if (builder.isFar) {
    builder.sphere("paint", eggCream, 0.2, [x, 0.3, z], [1, 1.25, 1], 6);
    return;
  }
  builder.torus("matte", shade(straw, 0.9), 0.52, 0.09, [x, 0.13, z], "y", 18);
  /* Loose straws poking out */
  for (let stalk = 0; stalk < 14; stalk++) {
    const angle = stalk * 0.9;
    const radius = 0.45 + (stalk % 3) * 0.08;
    builder.box(
      "matte",
      stalk % 2 === 0 ? straw : shade(straw, 1.1),
      [0.02, 0.02, 0.32],
      [x + Math.sin(angle) * radius, 0.16, z + Math.cos(angle) * radius],
      [0.2, angle + 1.2, 0],
    );
  }
  /* Two more eggs beside the wobbly one */
  [
    [0.28, 0.12],
    [-0.12, -0.28],
  ].forEach(([dx, dz], index) => {
    builder.sphere(
      "paint",
      shade(eggCream, 1 - index * 0.04),
      0.17,
      [x + dx, 0.24, z + dz],
      [1, 1.25, 1],
      14,
    );
  });
  /* A chicken's egg for size, on a little stand by the fence */
  builder.box("matte", fenceTimber, [0.2, 0.5, 0.2], [x - 0.5, 0.25, z + 1.2]);
  builder.sphere(
    "paint",
    "#f0d8b8",
    0.05,
    [x - 0.5, 0.56, z + 1.2],
    [1, 1.25, 1],
    8,
  );
};

const buildShelter = (builder: AttractionBuilder) => {
  const { x, z } = shelterAt;
  [
    [-0.75, -0.5],
    [0.75, -0.5],
    [-0.75, 0.5],
    [0.75, 0.5],
  ].forEach(([dx, dz]) => {
    builder.box(
      "matte",
      fenceTimber,
      [0.1, dz < 0 ? 2.1 : 1.8, 0.1],
      [x + dx, dz < 0 ? 1.05 : 0.9, z + dz],
    );
  });
  builder.box("metal", tinRoof, [1.8, 0.04, 1.4], [x, 1.98, z], [-0.25, 0, 0]);
  if (builder.isFar) {
    return;
  }
  /* Ridges in the tin roof */
  for (let ridge = 0; ridge < 9; ridge++) {
    builder.box(
      "metal",
      shade(tinRoof, 1.1),
      [0.03, 0.03, 1.4],
      [x - 0.8 + ridge * 0.2, 2.01, z],
      [-0.25, 0, 0],
    );
  }
  /* A water trough and a feed bin under the shade */
  builder.box("metal", palette.steel, [1.1, 0.35, 0.45], [x, 0.175, z + 0.1]);
  builder.box("water", palette.water, [1.0, 0.02, 0.36], [x, 0.31, z + 0.1]);
  builder.cylinder("paint", "#3a7a4a", {
    radius: 0.22,
    length: 0.6,
    at: [x + 0.55, 0.3, z - 0.3],
    segments: 14,
  });
  builder.cylinder("paint", shade("#3a7a4a", 0.8), {
    radius: 0.24,
    length: 0.05,
    at: [x + 0.55, 0.62, z - 0.3],
    segments: 14,
  });
  /* A scattering of grain, and a hay bale */
  builder.roundedBox(
    "matte",
    straw,
    [0.8, 0.4, 0.45],
    0.06,
    [x - 0.4, 0.2, z - 0.25],
    [0, 0.2, 0],
  );
};

/* The egg board: an ostrich egg next to a chicken's egg */

const buildEggBoard = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const board: Triple = [2.5, 0, 3.0];
  [-0.4, 0.4].forEach((dx) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 1.2, 0.07],
      [board[0] + dx, 0.6, board[2]],
    );
  });
  builder.box(
    "paint",
    "#f2e6c8",
    [1.0, 0.7, 0.05],
    [board[0], 1.0, board[2] + 0.04],
  );
  builder.sphere(
    "paint",
    eggCream,
    0.2,
    [board[0] - 0.15, 1.0, board[2] + 0.08],
    [1, 1.25, 0.3],
    12,
  );
  builder.sphere(
    "paint",
    "#f0d8b8",
    0.06,
    [board[0] + 0.3, 0.9, board[2] + 0.08],
    [1, 1.25, 0.3],
    8,
  );
  builder.box(
    "paint",
    palette.black,
    [0.12, 0.02, 0.01],
    [board[0] + 0.12, 0.95, board[2] + 0.08],
  );
};

/* An ostrich, facing +z */

const buildOstrichBody = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.sphere(
    "matte",
    feathersBlack,
    0.4,
    [x, y + 1.18, z - 0.05],
    [0.82, 0.7, 1.1],
    builder.isFar ? 6 : 12,
  );
  if (builder.isFar) {
    return;
  }
  /* Fluffy white wing tips and tail plumes */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      plumeWhite,
      0.17,
      [x + side * 0.3, y + 1.15, z - 0.2],
      [0.5, 0.75, 1.1],
      8,
    );
  });
  [
    [0, 1.32, -0.48],
    [0.12, 1.24, -0.5],
    [-0.12, 1.24, -0.5],
  ].forEach(([dx, dy, dz]) => {
    builder.sphere(
      "matte",
      plumeWhite,
      0.13,
      [x + dx, y + dy, z + dz],
      [0.8, 0.9, 1],
      7,
    );
  });
  /* Long bare legs that bend backwards at the ankle, and two-toed feet */
  [-1, 1].forEach((side) => {
    const hip: Triple = [x + side * 0.13, y + 1.0, z - 0.02];
    const ankle: Triple = [x + side * 0.13, y + 0.5, z - 0.14];
    const foot: Triple = [x + side * 0.13, y + 0.05, z + 0.02];
    builder.bar("matte", ostrichSkin, hip, ankle, 0.11, 7);
    builder.sphere(
      "matte",
      shade(ostrichSkin, 0.9),
      0.055,
      ankle,
      [1, 1, 1],
      6,
    );
    builder.bar("matte", ostrichSkin, ankle, foot, 0.065, 6);
    builder.box(
      "matte",
      shade(ostrichSkin, 0.85),
      [0.07, 0.05, 0.2],
      [foot[0] - side * 0.01, y + 0.025, foot[2] + 0.08],
    );
    builder.box(
      "matte",
      shade(ostrichSkin, 0.85),
      [0.045, 0.04, 0.12],
      [foot[0] + side * 0.06, y + 0.02, foot[2] + 0.05],
      [0, side * 0.3, 0],
    );
  });
};

/** The neck and head, from the base of the neck, which sits at the origin. */
const buildNeck = (builder: AttractionBuilder) => {
  const joints: Triple[] = [
    [0, 0, 0],
    [0, 0.2, 0.06],
    [0, 0.42, 0.06],
    [0, 0.62, 0.1],
  ];
  joints.slice(1).forEach((joint, index) => {
    builder.bar(
      "matte",
      shade(ostrichSkin, 0.95),
      joints[index],
      joint,
      0.09 - index * 0.012,
      7,
    );
  });
  builder.sphere("matte", feathersBlack, 0.12, [0, 0.0, 0.0], [1, 0.7, 1], 8);
  const head: Triple = [0, 0.68, 0.14];
  builder.sphere(
    "matte",
    shade(ostrichSkin, 1.05),
    0.085,
    head,
    [0.9, 0.8, 1.1],
    10,
  );
  builder.sphere(
    "paint",
    beakColour,
    0.05,
    [0, head[1] - 0.02, head[2] + 0.1],
    [0.9, 0.4, 1.4],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.034,
      [side * 0.055, head[1] + 0.02, head[2] + 0.04],
      [1, 1, 1],
      8,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [side * 0.075, head[1] + 0.025, head[2] + 0.055],
      [1, 1, 1],
      6,
    );
    builder.box(
      "paint",
      palette.black,
      [0.01, 0.025, 0.006],
      [side * 0.075, head[1] + 0.062, head[2] + 0.05],
      [0, 0, side * 0.4],
    );
  });
  /* A wisp of fluff on top */
  builder.sphere(
    "matte",
    "#8a7a70",
    0.035,
    [0, head[1] + 0.08, head[2] - 0.02],
    [1, 0.6, 1],
    6,
  );
};

const buildWanderingOstrich = (builder: AttractionBuilder) => {
  buildOstrichBody(builder, [0, 0, 0]);
  const neckAt: Triple = [0, 1.38, 0.28];
  /* The neck is drawn once, moved up to the body */
  const moved = (point: Triple): Triple => [
    point[0] + neckAt[0],
    point[1] + neckAt[1],
    point[2] + neckAt[2],
  ];
  const joints: Triple[] = [
    [0, 0, 0],
    [0, 0.2, 0.06],
    [0, 0.42, 0.06],
    [0, 0.62, 0.1],
  ];
  joints.slice(1).forEach((joint, index) => {
    builder.bar(
      "matte",
      shade(ostrichSkin, 0.95),
      moved(joints[index]),
      moved(joint),
      0.09 - index * 0.012,
      6,
    );
  });
  const head = moved([0, 0.68, 0.14]);
  builder.sphere(
    "matte",
    shade(ostrichSkin, 1.05),
    0.085,
    head,
    [0.9, 0.8, 1.1],
    8,
  );
  builder.sphere(
    "paint",
    beakColour,
    0.05,
    [0, head[1] - 0.02, head[2] + 0.1],
    [0.9, 0.4, 1.4],
    6,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [side * 0.065, head[1] + 0.02, head[2] + 0.045],
      [1, 1, 1],
      5,
    );
  });
};

/* The moving parts */

const buildWobblyEgg = (builder: AttractionBuilder) => {
  builder.sphere("paint", eggCream, 0.2, [0, 0.2, 0], [1, 1.25, 1], 16);
  /* A crack, as if it is about to hatch */
  [
    [-0.06, 0.3, 0.5],
    [0.0, 0.27, -0.5],
    [0.06, 0.3, 0.5],
  ].forEach(([dx, y, tilt]) => {
    builder.box(
      "paint",
      "#8a7a60",
      [0.07, 0.012, 0.012],
      [dx, y, 0.19],
      [0, 0, tilt],
    );
  });
};

const buildFinishFlag = (builder: AttractionBuilder) => {
  builder.cylinder("paint", palette.darkSteel, {
    radius: 0.02,
    length: 0.5,
    at: [0, 0.25, 0],
    segments: 6,
  });
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 4; column++) {
      builder.box(
        "paint",
        (row + column) % 2 === 0 ? palette.black : palette.white,
        [0.1, 0.1, 0.012],
        [0.07 + column * 0.1, 0.45 - row * 0.1, 0],
      );
    }
  }
};

/* The ride: a dash down the track, bouncing like a running ostrich */

const raceRide = (progress: number): LocalSpot => {
  const eased = progress * progress * (3 - 2 * progress);
  const strides = Math.abs(Math.sin(progress * Math.PI * 14));
  const fade = Math.min(1, progress * 10, (1 - progress) * 10);
  return {
    x: rideStart.x + (rideFinish.x - 0.1 - rideStart.x) * eased,
    y: strides * 0.22 * fade,
    z: laneZ,
    heading: Math.PI / 2,
  };
};

export const ostrichRunModel: CuriosityModel = {
  kind: "ostrich-run",
  islandId: "sunscorch-sands",
  name: "Ostrich Run",
  fact: "The ostrich is the biggest bird in the world. It cannot fly, but it can run at 70 kilometres an hour on its long, strong legs, faster than a racehorse. Ostriches lay the biggest eggs of any living bird: one ostrich egg weighs as much as about 24 chickens' eggs. Like all birds, ostriches have feathers, a beak and a skeleton inside.",
  curriculumLink:
    "Science, Year 3: animals including humans. Identify that humans and some other animals have skeletons and muscles for support, protection and movement.",
  footprint: 5,
  setting: "inland",
  signSpot: { x: -1.6, z: 3.4 },
  padColour: sand,
  build: (builder) => {
    builder.box(
      "matte",
      shade(sand, 0.94),
      [run.maxX - run.minX, 0.015, run.maxZ - run.minZ],
      [0, 0.008, (run.minZ + run.maxZ) / 2],
    );
    buildFence(builder);
    buildTrack(builder);
    buildNest(builder);
    buildShelter(builder);
    buildEggBoard(builder);
    buildOstrichBody(builder, standingOstrich);
    if (builder.isFar) {
      builder.bar(
        "matte",
        ostrichSkin,
        neckPivot,
        [neckPivot[0], neckPivot[1] + 0.62, neckPivot[2] + 0.1],
        0.09,
        4,
      );
    }
    addSignBoard(builder, [-1.6, 0, 3.4], signColour);
  },
  moving: [
    {
      name: "ostrich neck",
      pivot: neckPivot,
      build: buildNeck,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.55,
        period: 1.6,
      },
    },
    {
      name: "wobbly egg",
      pivot: eggPivot,
      build: buildWobblyEgg,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.25,
        period: 0.7,
      },
    },
    {
      name: "finish flag",
      pivot: finishFlagPivot,
      build: buildFinishFlag,
      motion: { kind: "swing", axis: "y", amplitude: 0.7, period: 1.2 },
    },
  ],
  wanderers: [
    {
      name: "ostriches",
      build: buildWanderingOstrich,
      count: 3,
      centre: { x: 0.4, z: -1.0 },
      radius: 1.4,
      speed: 0.9,
    },
  ],
  rides: [
    {
      id: "race",
      name: "the ostrich race",
      start: rideStart,
      reach: 0.6,
      seconds: 5,
      finish: rideFinish,
      follow: raceRide,
    },
  ],
  blockers: [
    ...fenceCorners.flatMap((from, index) =>
      listWallBlockers(
        from,
        fenceCorners[(index + 1) % fenceCorners.length],
        0.3,
        0.5,
      ),
    ),
    { x: 2.5, z: 3.0, radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Race an ostrich",
    news: "Ready, steady, go! You sprinted down the track, but the ostrich flew past on its long legs and won by a mile.",
  },
};
