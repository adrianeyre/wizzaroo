import { CylinderGeometry, LatheGeometry, Vector2 } from "three";
import {
  addBench,
  addBush,
  addDoor,
  addGableRoof,
  addLampPost,
  addSignBoard,
  addWindow,
  buildFlatDeck,
  findMotionPose,
  moveWithPose,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addCone,
  bronze,
  buildBreath,
  buildHatchling,
  buildMotherDragon,
  buildMotherHead,
  buildToddler,
  buildWing,
  crackShare,
  eggHeight,
  eggRadius,
  headPivot,
  listEggProfile,
  motherAt,
  mouthAt,
  rockTop,
  saddleSeat,
  tailPoints,
  wingPivot,
} from "./dragon-hatchery-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const basalt = "#2f2827";
const basaltEdge = "#4a3f3b";
const ashPaving = "#6b605a";
const ashPad = "#5b4a42";
const sandGlow = "#ff9a3c";
const sandWarm = "#c9763a";
const ember = "#ff6a1a";
const straw = "#d9b45a";
const hutStone = "#5d5350";
const roofTiles = "#6e2b1f";
const timber = "#5a3a22";
const signColour = "#7a2a1c";
const verdigris = "#4f9a86";

const nestAt = { x: 1.2, z: -1.6 };
const nest = { outer: 2.3, inner: 1.85, wall: 0.6, sand: 0.3 };
const hutAt = { x: 5.6, z: -3.5 };
const penAt = { x: 4.6, z: 3.3 };
const penRadius = 1.55;
const viewing = { minX: -0.6, maxX: 3.0, minZ: 1.35, maxZ: 2.75 };
const viewingHeight = 0.28;
const signAt = { x: -1.6, z: 7.5 };

const eggs: { x: number; z: number; colour: string; tilt: number }[] = [
  { x: 1.0, z: 0.1, colour: "#c23a2b", tilt: 0.12 },
  { x: 0.1, z: 0.85, colour: "#2f8f6e", tilt: -0.1 },
  { x: -0.95, z: 0.15, colour: "#d7a52f", tilt: -0.15 },
  { x: -0.55, z: -0.9, colour: "#6d4aa3", tilt: 0.1 },
  { x: 0.75, z: -0.8, colour: "#2b7fa6", tilt: 0.14 },
];

const wingMotion = (side: 1 | -1): Motion => ({
  kind: "nod",
  axis: "z",
  reach: 8,
  amplitude: 0.32,
  period: 1.7,
  phase: side > 0 ? 0 : Math.PI,
});

/* ------------------------------------------------------------------ */
/* The nest                                                            */
/* ------------------------------------------------------------------ */

const addEgg = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  tilt: number,
  to = 1,
) => {
  builder.add(
    "paint",
    colour,
    new LatheGeometry(
      listEggProfile(eggRadius, eggHeight, 0, to, builder.isFar ? 4 : 6).map(
        ([radius, height]) => new Vector2(radius, height),
      ),
      builder.segments(10, 6),
    ),
    { at, rotation: [tilt, 0, tilt * 0.6] },
  );
};

const buildNest = (builder: AttractionBuilder) => {
  const { x, z } = nestAt;
  const segments = builder.segments(24, 14);
  builder.lathe(
    "matte",
    basalt,
    [
      [nest.outer + 0.2, 0],
      [nest.outer + 0.12, nest.wall * 0.55],
      [nest.outer, nest.wall],
      [nest.outer - 0.12, nest.wall + 0.06],
      [nest.inner + 0.1, nest.wall + 0.04],
      [nest.inner, nest.wall - 0.08],
      [nest.inner - 0.04, nest.sand - 0.02],
    ],
    [x, 0, z],
    "y",
    segments,
  );
  builder.cylinder("matte", sandWarm, {
    radius: nest.inner,
    length: 0.04,
    at: [x, nest.sand, z],
    segments,
  });
  builder.cylinder("glow", sandGlow, {
    radius: 0.85,
    length: 0.03,
    at: [x, nest.sand + 0.02, z],
    segments: builder.segments(10, 6),
  });
  /* Rough rocks round the rim, so it looks heaped up rather than turned */
  const rimRocks = builder.isFar ? 6 : 10;
  for (let rock = 0; rock < rimRocks; rock++) {
    const angle = (rock / rimRocks) * Math.PI * 2 + 0.2;
    const radius = nest.outer - 0.12 + (rock % 3) * 0.05;
    builder.sphere(
      "matte",
      rock % 2 === 0 ? basaltEdge : shade(basalt, 1.15),
      0.2 + (rock % 4) * 0.03,
      [
        x + Math.sin(angle) * radius,
        nest.wall + 0.02,
        z + Math.cos(angle) * radius,
      ],
      [1.3, 0.7, 1],
      5,
    );
  }
  /* Glowing cracks in the warm sand */
  if (!builder.isFar) {
    [
      [0.4, 0.3, 0.7, 0.6],
      [-0.5, -0.2, 0.9, -0.5],
      [0.2, -1.2, 0.6, 1.1],
      [-1.2, 0.6, 0.5, 1.9],
    ].forEach(([dx, dz, length, turn]) => {
      builder.box(
        "glow",
        ember,
        [0.05, 0.03, length],
        [x + dx, nest.sand + 0.03, z + dz],
        [0, turn, 0],
      );
    });
  }
  eggs.forEach(({ x: dx, z: dz, colour, tilt }) => {
    const at: Triple = [x + dx, nest.sand - 0.08, z + dz];
    addEgg(builder, at, colour, tilt);
    if (builder.isFar) {
      return;
    }
    for (let spot = 0; spot < 2; spot++) {
      const angle = spot * 2.1 + dx;
      const share = 0.3 + (spot % 3) * 0.17;
      const [radius] = listEggProfile(eggRadius, eggHeight, share, share, 1)[0];
      builder.sphere(
        "paint",
        shade(colour, 1.45),
        0.06 + (spot % 2) * 0.02,
        [
          at[0] + Math.sin(angle) * radius * 0.96,
          at[1] + eggHeight * share,
          at[2] + Math.cos(angle) * radius * 0.96,
        ],
        [1, 0.8, 1],
        5,
      );
    }
  });
  /* The hatching egg in the middle, cracked open round its middle */
  const hatchAt: Triple = [x, nest.sand - 0.08, z];
  addEgg(builder, hatchAt, "#f0e2c4", 0, crackShare);
  builder.torus(
    "glow",
    ember,
    eggRadius * 0.98,
    0.02,
    [x, hatchAt[1] + eggHeight * crackShare - 0.02, z],
    "y",
    builder.segments(10, 6),
  );
  /* Bronze heat lamps leaning over the nest */
  [-1, 1].forEach((side) => {
    const foot: Triple = [x + side * 2.65, 0, z - 0.9];
    const head: Triple = [x + side * 1.45, 2.4, z - 0.5];
    builder.cylinder("metal", bronze, {
      radius: 0.14,
      length: 0.12,
      at: [foot[0], 0.06, foot[2]],
      segments: 10,
    });
    builder.bar("metal", bronze, foot, [foot[0], 1.9, foot[2]], 0.08, 6);
    builder.bar("metal", bronze, [foot[0], 1.9, foot[2]], head, 0.06, 6);
    builder.lathe(
      "metal",
      shade(bronze, 0.8),
      [
        [0.05, 0.12],
        [0.12, 0.08],
        [0.26, -0.12],
        [0.24, -0.13],
      ],
      head,
      "y",
      builder.segments(10, 6),
    );
    builder.sphere(
      "glow",
      "#ffb347",
      0.12,
      [head[0], head[1] - 0.08, head[2]],
      [1, 0.7, 1],
      8,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The mother dragon's rock                                            */
/* ------------------------------------------------------------------ */

const buildRock = (builder: AttractionBuilder) => {
  const { x, z } = motherAt;
  builder.lathe(
    "matte",
    basalt,
    [
      [1.85, 0],
      [1.8, 0.25],
      [1.65, 0.52],
      [1.4, rockTop - 0.02],
      [0.6, rockTop + 0.02],
      [0, rockTop],
    ],
    [x, 0, z - 0.2],
    "y",
    builder.segments(16, 8),
  );
  [
    ...(builder.isFar ? [] : [[1.6, 0.6, 0.4]]),
    ...(builder.isFar
      ? []
      : [
          [-1.5, -0.9, 0.5],
          [-1.2, 1.1, 0.35],
          [0.9, -1.6, 0.45],
        ]),
  ].forEach(([dx, dz, size]) => {
    builder.sphere(
      "matte",
      basaltEdge,
      size,
      [x + dx, size * 0.5, z + dz],
      [1.2, 0.9, 1],
      6,
    );
  });
  /* The ladder up her side, for riders */
  const foot = { x: x + 1.95, z: z - 0.15 };
  const top: Triple = [x + 0.62, 2.0, z - 0.15];
  [-0.18, 0.18].forEach((side) => {
    builder.bar(
      "matte",
      timber,
      [foot.x, 0, foot.z + side],
      [top[0], top[1], top[2] + side],
      0.06,
      5,
    );
  });
  if (!builder.isFar) {
    for (let rung = 1; rung < 7; rung++) {
      const share = rung / 7;
      builder.bar(
        "matte",
        shade(timber, 1.2),
        [foot.x + (top[0] - foot.x) * share, top[1] * share, foot.z - 0.18],
        [foot.x + (top[0] - foot.x) * share, top[1] * share, foot.z + 0.18],
        0.04,
        4,
      );
    }
    /* Obsidian shards glinting in the rock */
    [
      [-1.2, -0.6, 0.6],
      [1.3, -1.1, -0.4],
      [0.3, -1.65, 0.2],
    ].forEach(([dx, dz, lean]) => {
      addCone(
        builder,
        "glass",
        "#141012",
        [x + dx, 0.2, z + dz],
        [x + dx + lean * 0.3, 0.75, z + dz],
        0.12,
        0.01,
        5,
      );
    });
  }
};

/* ------------------------------------------------------------------ */
/* The keeper's hut                                                    */
/* ------------------------------------------------------------------ */

const buildHut = (builder: AttractionBuilder) => {
  const { x, z } = hutAt;
  const width = 2.7;
  const depth = 2.0;
  const height = 1.85;
  builder.box("matte", hutStone, [width, height, depth], [x, height / 2, z]);
  builder.box(
    "matte",
    basalt,
    [width + 0.12, 0.25, depth + 0.12],
    [x, 0.12, z],
  );
  if (!builder.isFar) {
    for (let course = 1; course < 6; course += 2) {
      builder.box(
        "matte",
        shade(hutStone, 0.82),
        [width + 0.02, 0.025, depth + 0.02],
        [x, 0.25 + course * 0.3, z],
      );
    }
    [-1, 1].forEach((sideX) => {
      [-1, 1].forEach((sideZ) => {
        builder.box(
          "matte",
          basaltEdge,
          [0.16, height, 0.16],
          [
            x + sideX * (width / 2 - 0.05),
            height / 2,
            z + sideZ * (depth / 2 - 0.05),
          ],
        );
      });
    });
  }
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.85,
    at: [x, height, z],
    colour: roofTiles,
    overhang: 0.22,
    thickness: 0.1,
  });
  [-1, 1].forEach((side) => {
    /* The triangular gable end under the roof */
    builder.add(
      "matte",
      hutStone,
      new CylinderGeometry(0.62, 0.62, 0.1, 3).rotateZ(Math.PI / 2),
      {
        at: [x + side * (width / 2 - 0.05), height + 0.3, z],
        scale: [1, 1, 1.62],
      },
    );
  });
  addDoor(builder, {
    at: [x, 0.25, z + depth / 2 + 0.01],
    width: 0.6,
    height: 1.2,
    colour: "#8a3a22",
    frame: bronze,
  });
  [-0.85, 0.85].forEach((along) => {
    addWindow(builder, {
      at: [x + along, 1.15, z + depth / 2 + 0.01],
      width: 0.5,
      height: 0.45,
      frame: bronze,
      isLit: true,
    });
  });
  builder.box(
    "matte",
    basaltEdge,
    [0.42, 1.2, 0.42],
    [x + 0.8, height + 0.75, z - 0.45],
  );
  builder.box(
    "matte",
    basalt,
    [0.5, 0.1, 0.5],
    [x + 0.8, height + 1.38, z - 0.45],
  );
  /* An egg on the sign over the door */
  builder.box(
    "paint",
    "#f2c14e",
    [0.9, 0.3, 0.06],
    [x, 1.62, z + depth / 2 + 0.05],
  );
  builder.sphere(
    "paint",
    dragonEggRed,
    0.1,
    [x, 1.62, z + depth / 2 + 0.09],
    [0.8, 1.1, 0.4],
    10,
  );
  /* The incubator: a bronze stove with a glowing window and pipes */
  const stove = { x: x - 2.1, z: z + 0.2 };
  builder.cylinder("metal", bronze, {
    radius: 0.42,
    length: 1.0,
    at: [stove.x, 0.55, stove.z],
    segments: 12,
  });
  builder.sphere(
    "metal",
    bronze,
    0.42,
    [stove.x, 1.05, stove.z],
    [1, 0.5, 1],
    10,
  );
  builder.cylinder("metal", verdigris, {
    radius: 0.44,
    length: 0.08,
    at: [stove.x, 0.3, stove.z],
    segments: 12,
  });
  builder.box(
    "glow",
    ember,
    [0.34, 0.28, 0.05],
    [stove.x, 0.6, stove.z + 0.41],
  );
  builder.bar(
    "metal",
    shade(bronze, 0.8),
    [stove.x, 1.2, stove.z],
    [stove.x, 2.3, stove.z],
    0.12,
    8,
  );
  if (!builder.isFar) {
    builder.cylinder("metal", "#d9d3c4", {
      radius: 0.12,
      length: 0.04,
      at: [stove.x + 0.25, 0.95, stove.z + 0.33],
      axis: "z",
      segments: 12,
    });
    builder.box(
      "paint",
      "#c8102e",
      [0.02, 0.1, 0.01],
      [stove.x + 0.25, 0.97, stove.z + 0.36],
      [0, 0, -0.6],
    );
    [-1, 1].forEach((side) => {
      builder.cylinder("metal", shade(bronze, 0.7), {
        radius: 0.06,
        length: 0.25,
        at: [stove.x + side * 0.28, 0.06, stove.z],
        segments: 8,
      });
    });
  }
  /* Crates, coal and a barrow with an egg in straw */
  [
    [x - 1.0, z - 1.4, 0.55, 0],
    [x - 0.3, z - 1.45, 0.5, 0.3],
    [x - 0.7, z - 1.4, 0.4, 0.1],
  ].forEach(([cx, cz, size, turn], index) => {
    builder.box(
      "matte",
      index === 2 ? shade(timber, 1.3) : timber,
      [size, size, size],
      [cx, index === 2 ? 0.55 + size / 2 : size / 2, cz],
      [0, turn, 0],
    );
  });
  const barrow = { x: x + 1.2, z: z + 2.0 };
  builder.box(
    "paint",
    "#3d5a73",
    [0.55, 0.28, 0.8],
    [barrow.x, 0.45, barrow.z],
    [0.1, 0, 0],
  );
  builder.box(
    "matte",
    straw,
    [0.5, 0.08, 0.72],
    [barrow.x, 0.6, barrow.z],
    [0.1, 0, 0],
  );
  builder.lathe(
    "paint",
    "#2f8f6e",
    listEggProfile(0.18, 0.46, 0, 1, 8),
    [barrow.x, 0.55, barrow.z],
    "y",
    builder.segments(12, 6),
  );
  builder.cylinder("matte", basalt, {
    radius: 0.18,
    length: 0.06,
    at: [barrow.x, 0.2, barrow.z + 0.5],
    axis: "x",
    segments: 12,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      timber,
      [barrow.x + side * 0.22, 0.4, barrow.z + 0.3],
      [barrow.x + side * 0.25, 0.6, barrow.z - 0.75],
      0.05,
      5,
    );
  });
};

const dragonEggRed = "#c23a2b";

/* ------------------------------------------------------------------ */
/* The hatchlings' pen, the viewing deck and the grounds               */
/* ------------------------------------------------------------------ */

const buildPen = (builder: AttractionBuilder) => {
  const { x, z } = penAt;
  builder.cylinder("matte", straw, {
    radius: penRadius,
    length: 0.03,
    at: [x, 0.015, z],
    segments: builder.segments(24, 12),
  });
  if (builder.isFar) {
    return;
  }
  const posts = 10;
  for (let post = 0; post <= posts; post++) {
    const angle = Math.PI * 1.5 + 0.35 + (post / posts) * (Math.PI * 2 - 0.7);
    const at = {
      x: x + Math.sin(angle) * penRadius,
      z: z + Math.cos(angle) * penRadius,
    };
    builder.cylinder("matte", timber, {
      radius: 0.05,
      length: 0.65,
      at: [at.x, 0.33, at.z],
      segments: 6,
    });
    builder.box("metal", bronze, [0.1, 0.05, 0.1], [at.x, 0.68, at.z]);
    if (post < posts) {
      const next =
        Math.PI * 1.5 + 0.35 + ((post + 1) / posts) * (Math.PI * 2 - 0.7);
      [0.5].forEach((up) => {
        builder.bar(
          "matte",
          shade(timber, 1.15),
          [at.x, up, at.z],
          [x + Math.sin(next) * penRadius, up, z + Math.cos(next) * penRadius],
          0.04,
          4,
        );
      });
    }
  }
  builder.box("matte", basaltEdge, [0.9, 0.18, 0.35], [x + 0.7, 0.09, z - 0.8]);
  builder.box("water", "#3d9fc2", [0.8, 0.04, 0.25], [x + 0.7, 0.17, z - 0.8]);
  builder.lathe(
    "metal",
    bronze,
    [
      [0.05, 0],
      [0.28, 0.02],
      [0.32, 0.14],
      [0.28, 0.14],
      [0.22, 0.05],
    ],
    [x - 0.6, 0, z + 0.7],
    "y",
    builder.segments(10, 6),
  );
  [
    [0.08, 0.06],
    [-0.06, 0.08],
    [0.02, -0.08],
  ].forEach(([dx, dz]) => {
    builder.sphere(
      "glow",
      ember,
      0.06,
      [x - 0.6 + dx, 0.1, z + 0.7 + dz],
      [1, 0.8, 1],
      6,
    );
  });
};

const buildViewing = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = viewing;
  builder.box(
    "matte",
    basaltEdge,
    [maxX - minX, viewingHeight, maxZ - minZ],
    [(minX + maxX) / 2, viewingHeight / 2, (minZ + maxZ) / 2],
  );
  if (!builder.isFar) {
    for (let slab = 1; slab < 6; slab++) {
      builder.box(
        "matte",
        shade(basaltEdge, 0.75),
        [0.03, 0.01, maxZ - minZ - 0.1],
        [
          minX + ((maxX - minX) * slab) / 6,
          viewingHeight + 0.005,
          (minZ + maxZ) / 2,
        ],
      );
    }
  }
  const railZ = minZ + 0.08;
  const postCount = builder.isFar ? 3 : 5;
  for (let post = 0; post < postCount; post++) {
    const px = minX + 0.1 + ((maxX - minX - 0.2) * post) / (postCount - 1);
    builder.cylinder("metal", bronze, {
      radius: 0.035,
      length: 0.85,
      at: [px, viewingHeight + 0.42, railZ],
      segments: 8,
    });
  }
  [0.45, 0.85].forEach((up) => {
    builder.cylinder("metal", bronze, {
      radius: 0.03,
      length: maxX - minX - 0.2,
      at: [(minX + maxX) / 2, viewingHeight + up, railZ],
      axis: "x",
      segments: 8,
    });
  });
  /* Two braziers at the deck's front corners */
  [minX + 0.25, maxX - 0.25].forEach((bx) => {
    const bz = maxZ - 0.25;
    builder.bar(
      "metal",
      shade(bronze, 0.75),
      [bx, viewingHeight, bz],
      [bx, viewingHeight + 0.75, bz],
      0.08,
      8,
    );
    builder.lathe(
      "metal",
      bronze,
      [
        [0.04, 0],
        [0.2, 0.04],
        [0.28, 0.18],
        [0.24, 0.2],
      ],
      [bx, viewingHeight + 0.75, bz],
      "y",
      builder.segments(10, 6),
    );
    builder.sphere(
      "glow",
      ember,
      0.2,
      [bx, viewingHeight + 0.95, bz],
      [1, 0.7, 1],
      8,
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  const paths: [number, number, number, number, number][] = [
    [-0.4, 5.0, 1.4, 5.4, 0.35],
    [-2.0, 0.6, 1.3, 4.4, 0.55],
    [4.0, 0.6, 1.2, 5.6, -0.7],
    [2.6, 3.4, 1.2, 2.8, 1.2],
  ];
  paths.forEach(([px, pz, width, length, turn]) => {
    builder.box(
      "matte",
      ashPaving,
      [width, 0.02, length],
      [px, 0.01, pz],
      [0, turn, 0],
    );
  });
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  addLampPost(builder, [-2.7, 0, 3.6]);
  addBench(builder, [-4.6, 0, 3.0], Math.PI / 2 - 0.3, "#8a5a35");
  [
    [-6.6, 1.6, 0.55],
    [6.6, 5.0, 0.5],
  ].forEach(([bx, bz, size]) => {
    addBush(builder, [bx, 0, bz], size, "#4d6b3a");
  });
  /* Fire lilies: red and orange flowers on the bushes */
  if (!builder.isFar) {
    [
      [-6.4, 1.9],
      [-6.9, 1.4],
      [6.8, 5.2],
    ].forEach(([fx, fz], index) => {
      builder.sphere(
        "paint",
        index % 2 === 0 ? "#e8461c" : "#ff9a1f",
        0.09,
        [fx, 0.7, fz],
        [1, 0.7, 1],
        8,
      );
    });
  }
  /* Boulders and a steaming vent */
  (builder.isFar
    ? []
    : [
        [-7.4, 3.8, 0.6],
        [7.6, -3.6, 0.55],
        [-1.4, -6.8, 0.5],
        [2.6, -6.2, 0.45],
      ]
  ).forEach(([rx, rz, size]) => {
    builder.sphere(
      "matte",
      basalt,
      size,
      [rx, size * 0.45, rz],
      [1.3, 0.85, 1],
      6,
    );
  });
  builder.cylinder("matte", basaltEdge, {
    radius: 0.45,
    radiusEnd: 0.25,
    length: 0.3,
    at: [3.8, 0.15, -6.0],
    segments: builder.segments(12, 6),
  });
  builder.cylinder("glow", ember, {
    radius: 0.2,
    length: 0.02,
    at: [3.8, 0.31, -6.0],
    segments: builder.segments(10, 6),
  });
};

/* ------------------------------------------------------------------ */
/* The ride on the mother dragon's back                                */
/* ------------------------------------------------------------------ */

const rideStart = { x: -2.2, z: -0.4 };
const ladderFoot = { x: motherAt.x + 2.2, z: motherAt.z - 0.15 };
const ladderTop: Triple = [motherAt.x + 0.7, 2.05, motherAt.z - 0.15];
const rideFinish = { x: -1.9, z: -6.0 };

const between = (from: Triple, to: Triple, share: number): Triple => [
  from[0] + (to[0] - from[0]) * share,
  from[1] + (to[1] - from[1]) * share,
  from[2] + (to[2] - from[2]) * share,
];

const rideOnBack = (progress: number, seconds: number): LocalSpot => {
  if (progress < 0.1) {
    const [x, y, z] = between(
      [rideStart.x, 0, rideStart.z],
      [ladderFoot.x, 0, ladderFoot.z],
      progress / 0.1,
    );
    return { x, y, z, heading: Math.PI + 0.3 };
  }
  if (progress < 0.24) {
    const [x, y, z] = between(
      [ladderFoot.x, 0, ladderFoot.z],
      ladderTop,
      (progress - 0.1) / 0.14,
    );
    return { x, y, z, heading: -Math.PI / 2 };
  }
  if (progress < 0.3) {
    const [x, y, z] = between(ladderTop, saddleSeat, (progress - 0.24) / 0.06);
    return {
      x,
      y,
      z,
      heading: -Math.PI / 2 + ((progress - 0.24) / 0.06) * (Math.PI / 2),
    };
  }
  if (progress < 0.78) {
    /* Up and down with every beat of her wings */
    const pose = findMotionPose(wingMotion(1), seconds, { nearness: 1 });
    const lift = 0.12 * Math.sin(pose.rotation[2] * 4);
    const [x, y, z] = moveWithPose(saddleSeat, saddleSeat, pose);
    return {
      x,
      y: y + Math.abs(lift),
      z,
      heading: 0.15 * Math.sin(seconds * 1.3),
    };
  }
  /* Then down her tail, like a slide, and off the end */
  const share = (progress - 0.78) / 0.22;
  const path: Triple[] = [
    saddleSeat,
    ...tailPoints.map(({ at, radius }): Triple => [
      at[0],
      at[1] + radius + 0.02,
      at[2],
    ]),
    [rideFinish.x, 0, rideFinish.z],
  ];
  const along = share * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(along));
  const from = path[index];
  const to = path[index + 1];
  const [x, y, z] = between(from, to, along - index);
  return {
    x,
    y,
    z,
    heading: Math.atan2(to[0] - from[0], to[2] - from[2]),
  };
};

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

export const dragonHatcheryModel: NewLandAttractionModel = {
  kind: "dragon-hatchery",
  islandId: "ember-isle",
  name: "Dragon Hatchery",
  fact: "Real dragons do exist: the Komodo dragon is the biggest lizard in the world. A mother Komodo dragon lays about twenty eggs in a nest dug in warm ground, and the babies hatch around eight months later. The hatchlings scurry up trees to stay safe until they grow into adults, which lay eggs of their own.",
  curriculumLink:
    "Science, Year 5: living things and their habitats. Describe the life cycles of animals, from egg to young to adult, and the life process of reproduction.",
  footprint: 9.5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: (builder) => {
    buildGrounds(builder);
    buildNest(builder);
    buildRock(builder);
    buildMotherDragon(builder);
    buildHut(builder);
    buildPen(builder);
    buildViewing(builder);
  },
  moving: [
    {
      name: "mother dragon's head",
      pivot: headPivot,
      build: buildMotherHead,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.22,
        period: 2.4,
      },
    },
    {
      name: "right wing",
      pivot: wingPivot(1),
      build: buildWing(1),
      motion: wingMotion(1),
    },
    {
      name: "left wing",
      pivot: wingPivot(-1),
      build: buildWing(-1),
      motion: wingMotion(-1),
    },
    {
      name: "dragon's breath",
      pivot: mouthAt,
      build: buildBreath,
      motion: { kind: "wake", reach: 5 },
    },
    {
      name: "hatchling",
      pivot: [
        nestAt.x,
        nest.sand - 0.08 + eggHeight * crackShare - 0.32,
        nestAt.z,
      ],
      build: buildHatchling,
      motion: { kind: "rise", reach: 6, height: 0.55, period: 1.3 },
    },
    {
      name: "nest glow",
      pivot: [nestAt.x, 0.8, nestAt.z],
      build: (builder) => {
        builder.sphere("glow", sandGlow, 2.0, [0, 0, 0], [1.3, 0.5, 1.3], 12);
      },
      motion: { kind: "wake", reach: 8 },
      look: "halo",
    },
  ],
  wanderers: [
    {
      name: "green hatchlings",
      build: buildToddler("#2e9e6a"),
      count: 2,
      centre: penAt,
      radius: 0.9,
      speed: 0.45,
    },
    {
      name: "golden hatchlings",
      build: buildToddler("#d7a52f"),
      count: 2,
      centre: penAt,
      radius: 0.8,
      speed: 0.35,
    },
  ],
  smoke: [
    {
      at: [nestAt.x + 0.6, nest.sand + 0.1, nestAt.z - 0.9],
      colour: "#d9d2cc",
      puffs: 6,
      size: 0.35,
      rise: 2.2,
      spread: 0.4,
    },
    {
      at: [hutAt.x + 0.8, 3.5, hutAt.z - 0.45],
      colour: "#8f8a86",
      puffs: 5,
      size: 0.3,
      rise: 2.0,
      spread: 0.3,
    },
  ],
  decks: [buildFlatDeck(viewing, viewingHeight, "ground")],
  rides: [
    {
      id: "dragon-back",
      name: "the dragon's back",
      start: rideStart,
      reach: 0.6,
      seconds: 16,
      finish: rideFinish,
      follow: rideOnBack,
    },
  ],
  play: {
    label: "Warm the eggs",
    news: "The heat lamps glowed, an egg wobbled, and a tiny dragon poked its head out of its shell with a happy squeak!",
    tune: [67, 72, 76, 79],
  },
};
