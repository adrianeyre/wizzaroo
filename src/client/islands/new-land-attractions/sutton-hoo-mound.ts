import {
  addSignBoard,
  findMotionPose,
  moveWithPose,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addMound,
  basalt,
  buildChamber,
  buildCradle,
  buildHall,
  buildHelmet,
  buildReplica,
  buildTrench,
  buildVane,
  chamberZ,
  findMoundHeight,
  gold,
  hall,
  hallRidge,
  iron,
  ironDark,
  lava,
  lavaCore,
  oak,
  oakDark,
  replica,
  replicaPivot,
  replicaSeat,
  rope,
  sand,
  trench,
  type Mound,
} from "./sutton-hoo-mound-parts.js";

const ashPad = "#6f6862";
const gravel = "#9b938a";
const signColour = "#7a2a1e";
const stoneGrey = "#8e8780";

const bigMound: Mound = { x: -3.8, z: -3.0, radius: 3.3, height: 1.5 };
const smallMound: Mound = { x: -0.2, z: -7.8, radius: 1.5, height: 0.55 };
const mounds = [bigMound, smallMound];

const caseAt = { x: 0.6, z: 2.4 };
const plinthTop = 0.9;
const helmetPivot: Triple = [caseAt.x, 0.4, caseAt.z];
const signAt = { x: 1.8, z: 7.5 };
const tentAt = { x: -7.6, z: 1.3 };
const lecternAt = { x: 2.1, z: 1.5 };
const basketSpots: readonly LocalPoint[] = [
  { x: -0.4, z: 5.4 },
  { x: 3.7, z: 7.3 },
];
const barrowAt = { x: 1.3, z: -0.3 };

/* ------------------------------------------------------------------ */
/* Paths and the ground                                                */
/* ------------------------------------------------------------------ */

const buildPaths = (builder: AttractionBuilder) => {
  builder.box("matte", gravel, [2.2, 0.03, 4.4], [1.2, 0.015, 6.6]);
  builder.box("matte", gravel, [3.2, 0.03, 2.0], [1.0, 0.016, 3.0]);
  builder.box("matte", gravel, [1.6, 0.03, 6.0], [1.0, 0.017, -1.2]);
  builder.box("matte", gravel, [4.6, 0.03, 1.2], [-2.5, 0.018, 6.8]);
  if (builder.isFar) {
    return;
  }
  /* Basalt edging stones along the main path */
  for (let z = 4.6; z < 8.8; z += 0.55) {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        shade(basalt, 1 + ((z * 7) % 3) * 0.06),
        [0.16, 0.08, 0.36],
        [1.2 + side * 1.18, 0.04, z],
      );
    });
  }
  /* Timber steps set into the big mound's front slope */
  for (let step = 0; step < 6; step++) {
    const distance = bigMound.radius - 0.2 - step * 0.5;
    const height = findMoundHeight(bigMound, distance);
    builder.box(
      "matte",
      oakDark,
      [0.8, 0.06, 0.08],
      [
        bigMound.x + distance * 0.55,
        height + 0.02,
        bigMound.z + distance * 0.83,
      ],
      [0, 0.58, 0],
    );
  }
  /* Tufts of heather on the mounds */
  [
    [-2.4, -1.4],
    [-5.0, -1.8],
    [-4.6, -4.8],
    [-2.2, -4.6],
    [-5.9, -3.2],
    [0.4, -7.4],
  ].forEach(([x, z], index) => {
    const mound = index < 5 ? bigMound : smallMound;
    const height = findMoundHeight(mound, Math.hypot(x - mound.x, z - mound.z));
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#7a4f7a" : "#8c5f86",
      0.16,
      [x, height + 0.04, z],
      [1.3, 0.6, 1],
      6,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The display case, where the great helmet rises                      */
/* ------------------------------------------------------------------ */

const buildCase = (builder: AttractionBuilder) => {
  const { x, z } = caseAt;
  builder.box("matte", basalt, [0.95, 0.12, 0.95], [x, 0.06, z]);
  builder.box(
    "matte",
    stoneGrey,
    [0.75, plinthTop - 0.12, 0.75],
    [x, 0.12 + (plinthTop - 0.12) / 2, z],
  );
  builder.box("metal", gold, [0.8, 0.04, 0.8], [x, plinthTop, z]);
  /* A glass case on top, its lid trimmed in bronze */
  builder.box("glass", "#a9c6d6", [0.7, 0.7, 0.7], [x, plinthTop + 0.37, z]);
  builder.box("metal", ironDark, [0.76, 0.05, 0.76], [x, plinthTop + 0.74, z]);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      builder.box(
        "metal",
        ironDark,
        [0.04, 0.7, 0.04],
        [x + side * 0.36, plinthTop + 0.37, z + end * 0.36],
      );
    });
  });
  /* A name plate and carved knotwork on the plinth */
  builder.box("metal", gold, [0.4, 0.1, 0.02], [x, plinthTop - 0.2, z + 0.385]);
  [-0.2, 0, 0.2].forEach((dx) => {
    builder.torus(
      "matte",
      shade(stoneGrey, 0.8),
      0.07,
      0.015,
      [x + dx, 0.45, z + 0.38],
      "z",
      10,
    );
  });
  /* A soft glow from a lamp inside the lid */
  builder.box("glow", lavaCore, [0.3, 0.02, 0.3], [x, plinthTop + 0.7, z]);
};

/* ------------------------------------------------------------------ */
/* The diggers' camp: a bell tent, a barrow, spades and a sieve         */
/* ------------------------------------------------------------------ */

const buildCamp = (builder: AttractionBuilder) => {
  const { x, z } = tentAt;
  builder.lathe(
    "matte",
    "#ece3cf",
    [
      [0.95, 0],
      [0.92, 0.5],
      [0.7, 0.75],
      [0.08, 1.55],
      [0.001, 1.6],
    ],
    [x, 0, z],
    "y",
    builder.segments(14, 8),
  );
  builder.cylinder("matte", oakDark, {
    radius: 0.03,
    length: 0.35,
    at: [x, 1.7, z],
    segments: 5,
  });
  /* A wheelbarrow of sand */
  const { x: bx, z: bz } = barrowAt;
  builder.box("paint", "#5f6e4a", [0.5, 0.26, 0.7], [bx, 0.35, bz]);
  builder.box("matte", sand, [0.44, 0.06, 0.62], [bx, 0.46, bz]);
  builder.cylinder("matte", basalt, {
    radius: 0.14,
    length: 0.06,
    at: [bx, 0.14, bz + 0.45],
    axis: "x",
    segments: builder.segments(10, 6),
  });
  if (builder.isFar) {
    return;
  }
  /* The tent's door flap, open, and its guy ropes */
  builder.box(
    "matte",
    "#3b3530",
    [0.5, 0.75, 0.02],
    [x + 0.92, 0.38, z],
    [0, Math.PI / 2, 0],
  );
  [0, 1, 2, 3, 4, 5].forEach((rope) => {
    const angle = (rope / 6) * Math.PI * 2 + 0.3;
    builder.bar(
      "matte",
      "#d8ceb4",
      [x + Math.sin(angle) * 0.75, 0.75, z + Math.cos(angle) * 0.75],
      [x + Math.sin(angle) * 1.35, 0.02, z + Math.cos(angle) * 1.35],
      0.015,
      3,
    );
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      oak,
      [bx + side * 0.18, 0.38, bz - 0.32],
      [bx + side * 0.22, 0.42, bz - 0.8],
      0.04,
      4,
    );
    builder.box(
      "paint",
      "#5f6e4a",
      [0.04, 0.24, 0.04],
      [bx + side * 0.2, 0.12, bz - 0.25],
    );
  });
  /* Spades and a pick stuck in the spoil bank */
  [
    [trench.x - trench.halfBeam - 0.7, 0.9],
    [trench.x + trench.halfBeam + 0.75, -1.4],
    [trench.x - trench.halfBeam - 0.75, -4.4],
  ].forEach(([sx, sz], index) => {
    builder.bar(
      "paint",
      oak,
      [sx, trench.depth, sz],
      [sx + 0.06, trench.depth + 0.85, sz + 0.05],
      0.04,
      4,
    );
    builder.box(
      "metal",
      index === 1 ? iron : "#9aa3ad",
      [0.18, 0.24, 0.02],
      [sx, trench.depth + 0.05, sz],
    );
  });
  /* A garden sieve and buckets of finds */
  builder.cylinder("matte", oak, {
    radius: 0.3,
    length: 0.08,
    at: [-0.1, 0.32, 0.6],
    segments: 14,
    isOpen: true,
  });
  [-0.3, 0.1].forEach((dx) => {
    builder.bar(
      "matte",
      oakDark,
      [-0.1 + dx + 0.1, 0, 0.6],
      [-0.1 + dx + 0.1, 0.3, 0.6],
      0.04,
      4,
    );
  });
  [
    [-0.7, 0.2],
    [-0.75, 0.75],
  ].forEach(([px, pz], index) => {
    builder.cylinder("paint", index === 0 ? "#8a3f2c" : "#5f6e4a", {
      radius: 0.14,
      radiusEnd: 0.17,
      length: 0.28,
      at: [px, 0.14, pz],
      segments: 10,
    });
  });
};

/* An information lectern, iron fire baskets and a rope fence */

const buildLecternAndLights = (builder: AttractionBuilder) => {
  const { x, z } = lecternAt;
  builder.box("matte", oakDark, [0.1, 0.8, 0.1], [x, 0.4, z]);
  builder.box(
    "paint",
    "#e8dcc0",
    [0.6, 0.04, 0.42],
    [x, 0.85, z],
    [0.5, -0.4, 0],
  );
  basketSpots.forEach(({ x: bx, z: bz }) => {
    builder.cylinder("metal", ironDark, {
      radius: 0.04,
      length: 1.1,
      at: [bx, 0.55, bz],
      segments: 6,
    });
    builder.lathe(
      "metal",
      ironDark,
      [
        [0.06, 0],
        [0.2, 0.12],
        [0.24, 0.26],
      ],
      [bx, 1.05, bz],
      "y",
      builder.segments(8, 5),
    );
    builder.sphere(
      "glow",
      lava,
      0.2,
      [bx, 1.3, bz],
      [1, 0.55, 1],
      builder.segments(8, 5),
    );
  });
  if (builder.isFar) {
    return;
  }
  /* The picture of the helmet on the lectern */
  builder.box(
    "paint",
    "#5a4a3a",
    [0.24, 0.02, 0.2],
    [x, 0.88, z + 0.02],
    [0.5, -0.4, 0],
  );
  basketSpots.forEach(({ x: bx, z: bz }) => {
    builder.sphere("glow", lavaCore, 0.1, [bx, 1.38, bz], [1, 1.3, 1], 6);
  });
};

const fencePosts: readonly LocalPoint[] = (() => {
  const left = trench.x - trench.halfBeam - 1.25;
  const right = trench.x + trench.halfBeam + 1.25;
  const back = trench.minZ - 1.0;
  const front = trench.maxZ + 1.0;
  const posts: LocalPoint[] = [];
  for (let z = front; z >= back - 0.01; z -= (front - back) / 6) {
    posts.push({ x: left, z }, { x: right, z });
  }
  return posts;
})();

const buildRopeFence = (builder: AttractionBuilder) => {
  fencePosts.forEach(({ x, z }) => {
    builder.cylinder("matte", oakDark, {
      radius: 0.05,
      length: 0.7,
      at: [x, 0.35, z],
      segments: builder.segments(6, 4),
    });
  });
  /* Ropes along both long sides and across the far end */
  for (let index = 0; index + 2 < fencePosts.length; index += 1) {
    const here = fencePosts[index];
    const next = fencePosts[index + 2];
    builder.bar(
      "matte",
      rope,
      [here.x, 0.6, here.z],
      [next.x, 0.6, next.z],
      0.03,
      3,
    );
  }
  const lastLeft = fencePosts[fencePosts.length - 2];
  const lastRight = fencePosts[fencePosts.length - 1];
  builder.bar(
    "matte",
    rope,
    [lastLeft.x, 0.6, lastLeft.z],
    [lastRight.x, 0.6, lastRight.z],
    0.03,
    3,
  );
};

/* ------------------------------------------------------------------ */
/* Moving things                                                       */
/* ------------------------------------------------------------------ */

const buildGlimmer = (builder: AttractionBuilder) => {
  [
    [0, 0.1, 0],
    [-0.25, 0.25, -0.35],
    [0.22, 0.3, 0.3],
    [0.05, 0.42, -0.1],
  ].forEach(([x, y, z], index) => {
    builder.sphere(
      "glow",
      index % 2 === 0 ? lavaCore : gold,
      index === 0 ? 0.14 : 0.07,
      [x, y, z],
      [1, 1, 1],
      6,
    );
  });
  [0, Math.PI / 2].forEach((turn) => {
    builder.box(
      "glow",
      "#fff1c4",
      [0.5, 0.02, 0.02],
      [0, 0.1, 0],
      [0, turn, Math.PI / 4],
    );
  });
};

const shipMotion: Motion = {
  kind: "swing",
  axis: "z",
  amplitude: 0.13,
  period: 3.4,
};

const rideStart: LocalPoint = { x: 4.1, z: 3.2 };
const rideFinish: LocalPoint = { x: 4.1, z: 6.3 };

const sailAway = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(shipMotion, seconds);
  const [x, y, z] = moveWithPose(replicaPivot, replicaSeat, pose);
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const eased = share * share * (3 - 2 * share);
  const ground = progress < 0.5 ? rideStart : rideFinish;
  return {
    x: ground.x + (x - ground.x) * eased,
    y: y * eased + 0.35 * Math.sin(eased * Math.PI),
    z: ground.z + (z - ground.z) * eased,
    heading: 0,
  };
};

/* Sheep and archaeologists */

const buildSheep = (builder: AttractionBuilder) => {
  const wool = "#ece6d6";
  builder.sphere("matte", wool, 0.28, [0, 0.45, 0], [0.9, 0.8, 1.25], 8);
  builder.sphere("matte", "#2a2523", 0.12, [0, 0.55, 0.36], [0.8, 0.9, 1.2], 6);
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      builder.box(
        "matte",
        "#2a2523",
        [0.05, 0.28, 0.05],
        [side * 0.1, 0.14, end * 0.18],
      );
    });
  });
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        "#2a2523",
        [0.1, 0.04, 0.05],
        [side * 0.11, 0.6, 0.32],
        [0, 0, side * -0.4],
      );
    });
    builder.sphere(
      "matte",
      shade(wool, 1.04),
      0.12,
      [0, 0.66, 0.2],
      [1, 0.7, 1],
      6,
    );
  }
};

const buildDigger = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.box("matte", "#6b5a3e", [0.1, 0.42, 0.11], [side * 0.07, 0.21, 0]);
  });
  builder.box("matte", "#a89a6a", [0.3, 0.34, 0.18], [0, 0.6, 0]);
  builder.sphere("matte", "#e8b892", 0.11, [0, 0.88, 0], [1, 1, 1], 8);
  builder.cylinder("matte", "#c9b27a", {
    radius: 0.2,
    length: 0.03,
    at: [0, 0.95, 0],
    segments: builder.segments(10, 6),
  });
  if (!builder.isFar) {
    builder.cylinder("matte", "#c9b27a", {
      radius: 0.11,
      length: 0.09,
      at: [0, 1.0, 0],
      segments: 8,
    });
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        "#a89a6a",
        [side * 0.17, 0.74, 0],
        [side * 0.2, 0.5, 0.12],
        0.07,
        4,
      );
    });
    builder.box("metal", "#9aa3ad", [0.04, 0.02, 0.12], [0.2, 0.48, 0.22]);
  }
};

/* ------------------------------------------------------------------ */
/* Where the Character can stand: up and over the mounds                */
/* ------------------------------------------------------------------ */

const moundDeck: Deck = ({ x, z }) => {
  for (const mound of mounds) {
    const distance = Math.hypot(x - mound.x, z - mound.z);
    if (distance < mound.radius) {
      return { height: findMoundHeight(mound, distance), kind: "ground" };
    }
  }
  return undefined;
};

export const suttonHooMoundModel: NewLandAttractionModel = {
  kind: "sutton-hoo-mound",
  islandId: "ember-isle",
  name: "Sutton Hoo Mound",
  fact: "In 1939, Basil Brown dug into a great mound at Sutton Hoo in Suffolk and found the shape of a 27-metre Anglo-Saxon ship. The wood had rotted away, but rows of iron rivets showed where it had been. Inside lay treasure and a famous helmet, probably buried with King Rædwald of East Anglia about 1,400 years ago.",
  curriculumLink:
    "History, Key Stage 2: Britain's settlement by Anglo-Saxons and Scots. Anglo-Saxon art and culture, through the Sutton Hoo ship burial.",
  footprint: 10,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildPaths(builder);
    mounds.forEach((mound) => {
      addMound(builder, mound);
    });
    buildTrench(builder);
    buildChamber(builder);
    buildRopeFence(builder);
    buildCase(builder);
    buildHall(builder);
    buildCradle(builder);
    buildCamp(builder);
    buildLecternAndLights(builder);
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "great helmet",
      pivot: helmetPivot,
      build: buildHelmet,
      motion: { kind: "rise", reach: 4, height: 0.55, period: 2.4 },
    },
    {
      name: "replica ship",
      pivot: replicaPivot,
      build: buildReplica,
      motion: shipMotion,
    },
    {
      name: "treasure glimmer",
      pivot: [trench.x, 0.1, chamberZ],
      build: buildGlimmer,
      motion: { kind: "wake", reach: 3.6 },
    },
    {
      name: "dragon vane",
      pivot: hallRidge,
      build: buildVane,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 3.5, reach: 5 },
    },
  ],
  wanderers: [
    {
      name: "sheep",
      build: buildSheep,
      count: 3,
      centre: { x: -1.6, z: 5.6 },
      radius: 1.2,
      speed: 0.3,
    },
    {
      name: "archaeologists",
      build: buildDigger,
      count: 2,
      centre: { x: 1.0, z: -2.4 },
      radius: 0.6,
      speed: 0.25,
    },
  ],
  smoke: [
    {
      at: [hall.x, hallRidge[1] + 0.1, hall.z - 0.5],
      colour: "#b9b4ae",
      puffs: 6,
      size: 0.22,
      rise: 2.2,
      spread: 0.4,
    },
  ],
  decks: [moundDeck],
  rides: [
    {
      id: "replica-ship",
      name: "the Anglo-Saxon ship",
      start: rideStart,
      reach: 0.6,
      seconds: 12,
      finish: rideFinish,
      follow: sailAway,
    },
  ],
  blockers: [
    { x: caseAt.x, z: caseAt.z, radius: 0.6 },
    { x: tentAt.x, z: tentAt.z, radius: 1.0 },
    { x: hall.x, z: hall.z - 0.9, radius: 1.3 },
    { x: hall.x, z: hall.z + 0.9, radius: 1.3 },
    { x: replica.x, z: replica.z - 1.0, radius: 0.85 },
    { x: replica.x, z: replica.z + 1.0, radius: 0.85 },
    { x: lecternAt.x, z: lecternAt.z, radius: 0.3 },
    ...basketSpots.map(({ x, z }) => ({ x, z, radius: 0.3 })),
  ] satisfies LocalBlocker[],
  play: {
    label: "Polish the great helmet",
    news: "You polished the great helmet until its golden eyebrows gleamed, and up it rose in its case, staring proudly like a king of the Anglo-Saxons!",
    tune: [57, 60, 62, 64, 62],
  },
};
