import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  TorusGeometry,
} from "three";
import {
  addBench,
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  boatSeat,
  bronze,
  buildDragonBoat,
  buildEiderDuck,
  buildLakeDragon,
  vikingRed,
} from "./dragon-boat-lake-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const ashPad = "#6f6862";
const basalt = "#3a3532";
const darkBasalt = "#2a2624";
const ashGravel = "#8e8780";
const lakeBed = "#24302f";
const lakeWater = "#3f8f95";
const lava = "#ff6a1f";
const lavaCore = "#ffc04a";
const plank = "#9a6c42";
const darkPlank = "#6e4a2c";
const turf = "#5c6b3a";
const pine = "#2f4a35";
const runeStone = "#8a8379";

const lake = { x: 0, z: -1.2 };
const waterY = 0.07;
const lakeRadius = 4.6;
const rimRadius = 4.85;
const boatOrbit = 2.75;
const boatCount = 3;
const lap = 15;
const boatSpeed = (Math.PI * 2) / lap;

const jetty = { halfWidth: 0.75, endZ: 2.6, landZ: 5.0, rampZ: 5.7, top: 0.32 };
const railX = jetty.halfWidth - 0.04;
const railTop = jetty.top + 0.62;

const isletRadius = 0.95;
const flameAt: Triple = [lake.x, 1.02, lake.z];
const boathouse = { x: 5.7, z: 5.5, width: 2.6, depth: 1.9, wall: 1.25 };
const drumAt = { x: -2.3, z: 5.6 };
const runeAt = { x: -5.8, z: 5.0 };
const braziers: LocalPoint[] = [
  { x: -1.35, z: 5.3 },
  { x: 1.35, z: 5.3 },
];
const pines: [number, number, number][] = [
  [-7.4, -2.4, 1.1],
  [-6.3, -5.7, 1.25],
  [6.5, -5.0, 1.2],
  [7.5, -1.6, 1.0],
  [-7.3, 2.6, 0.95],
];

const hash = (a: number, b: number): number => {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43_758.5453;
  return value - Math.floor(value);
};

/* The lake and its basalt rim */

const isJettyGap = (x: number, z: number) => z > lake.z && Math.abs(x) < 1.15;

const rimColumns = Array.from({ length: 46 }, (_, index) => {
  const angle = (index / 46) * Math.PI * 2;
  const x = lake.x + Math.sin(angle) * rimRadius;
  const z = lake.z + Math.cos(angle) * rimRadius;
  const back = Math.max(0, -Math.cos(angle));
  return {
    x,
    z,
    angle,
    height: 0.5 + 0.22 * hash(index, 1) + 1.0 * back * back,
  };
}).filter(({ x, z }) => !isJettyGap(x, z));

const addHexColumn = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  radius: number,
  height: number,
  colour: string,
  turn: number,
) => {
  builder.add(
    "matte",
    colour,
    new CylinderGeometry(radius * 0.92, radius, height, 6, 1, true),
    { at: [x, height / 2, z], rotation: [0, turn, 0] },
    undefined,
  );
  builder.add(
    "matte",
    shade(colour, 1.12),
    new CircleGeometry(radius * 0.92, 6),
    { at: [x, height, z], rotation: [-Math.PI / 2, 0, turn] },
    undefined,
  );
};

const buildLake = (builder: AttractionBuilder) => {
  const segments = builder.segments(40, 20);
  builder.cylinder("matte", lakeBed, {
    radius: lakeRadius + 0.1,
    length: 0.02,
    at: [lake.x, 0.01, lake.z],
    segments,
  });
  builder.cylinder("water", lakeWater, {
    radius: lakeRadius + 0.05,
    length: 0.03,
    at: [lake.x, waterY - 0.015, lake.z],
    segments,
  });
  if (builder.isFar) {
    builder.lathe(
      "matte",
      basalt,
      [
        [lakeRadius - 0.1, 0],
        [lakeRadius, 0.45],
        [rimRadius + 0.25, 0.7],
        [rimRadius + 0.35, 0],
      ],
      [lake.x, 0, lake.z],
      "y",
      28,
    );
    return;
  }
  rimColumns.forEach(({ x, z, angle, height }, index) => {
    addHexColumn(
      builder,
      x,
      z,
      0.35,
      height,
      index % 3 === 0
        ? darkBasalt
        : shade(basalt, 0.92 + hash(index, 4) * 0.16),
      angle,
    );
  });
  /* A lower step of columns at the water's edge */
  Array.from({ length: 16 }, (_, index) => {
    const angle = ((index + 0.5) / 16) * Math.PI * 2;
    const x = lake.x + Math.sin(angle) * (lakeRadius - 0.1);
    const z = lake.z + Math.cos(angle) * (lakeRadius - 0.1);
    if (!isJettyGap(x, z)) {
      addHexColumn(
        builder,
        x,
        z,
        0.22,
        0.12 + 0.12 * hash(index, 9),
        shade(basalt, 1.1),
        angle,
      );
    }
  });
};

/* The islet in the middle, with its bronze brazier */

const buildIslet = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    basalt,
    [
      [0, 0.55],
      [0.45, 0.52],
      [0.8, 0.32],
      [isletRadius, 0.08],
      [isletRadius + 0.05, 0],
    ],
    [lake.x, 0, lake.z],
    "y",
    builder.isFar ? 9 : 14,
  );
  const cluster: [number, number, number][] = [
    [-0.35, -0.25, 0.75],
    [-0.15, -0.45, 0.95],
    [0.2, -0.4, 0.68],
    [0.42, -0.1, 0.6],
  ];
  cluster.forEach(([dx, dz, height], index) => {
    addHexColumn(
      builder,
      lake.x + dx,
      lake.z + dz,
      0.17,
      height,
      index % 2 === 0 ? darkBasalt : basalt,
      index,
    );
  });
  builder.lathe(
    "metal",
    bronze,
    [
      [0.001, 0.62],
      [0.06, 0.62],
      [0.06, 0.78],
      [0.2, 0.86],
      [0.24, 0.96],
      [0.2, 0.97],
      [0.001, 0.9],
    ],
    [lake.x, 0, lake.z + 0.15],
    "y",
    12,
  );
  builder.sphere(
    "glow",
    lavaCore,
    0.17,
    [lake.x, 0.94, lake.z + 0.15],
    [1, 0.35, 1],
    10,
  );
  if (!builder.isFar) {
    /* A little hot vent that glows like lava */
    builder.cylinder("glow", lava, {
      radius: 0.12,
      length: 0.03,
      at: [lake.x + 0.55, 0.36, lake.z + 0.35],
      segments: 10,
    });
  }
};

/* The jetty */

const buildJetty = (builder: AttractionBuilder) => {
  const length = jetty.landZ - jetty.endZ;
  const planks = builder.isFar ? 1 : Math.round(length / 0.2);
  for (let index = 0; index < planks; index++) {
    const depth = length / planks;
    builder.box(
      "matte",
      index % 3 === 0 ? shade(plank, 0.9) : plank,
      [jetty.halfWidth * 2, 0.05, depth - (builder.isFar ? 0 : 0.015)],
      [0, jetty.top - 0.025, jetty.endZ + depth * (index + 0.5)],
    );
  }
  /* The ramp down to the shore */
  const rampLength = jetty.rampZ - jetty.landZ;
  const slope = Math.atan2(jetty.top, rampLength);
  builder.box(
    "matte",
    darkPlank,
    [jetty.halfWidth * 2, 0.05, Math.hypot(rampLength, jetty.top)],
    [0, jetty.top / 2 - 0.02, (jetty.landZ + jetty.rampZ) / 2],
    [slope, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      darkPlank,
      [0.1, 0.18, length],
      [
        side * (jetty.halfWidth - 0.08),
        jetty.top - 0.14,
        (jetty.endZ + jetty.landZ) / 2,
      ],
    );
  });
  /* Posts, which are piles under the deck and posts for the rails */
  const postZs = [jetty.endZ + 0.05, 3.3, 4.05];
  [-1, 1].forEach((side) => {
    postZs.forEach((z) => {
      builder.cylinder("matte", darkPlank, {
        radius: 0.07,
        length: railTop + 0.1,
        at: [side * railX, (railTop + 0.1) / 2 - 0.05, z],
        segments: 8,
      });
    });
    builder.box(
      "matte",
      plank,
      [0.07, 0.07, postZs[2] - postZs[0]],
      [side * railX, railTop, (postZs[0] + postZs[2]) / 2],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        plank,
        [0.05, 0.05, postZs[2] - postZs[0]],
        [side * railX, jetty.top + 0.32, (postZs[0] + postZs[2]) / 2],
      );
    }
  });
  builder.box(
    "matte",
    plank,
    [railX * 2, 0.07, 0.07],
    [0, railTop, jetty.endZ + 0.05],
  );
  builder.box(
    "matte",
    plank,
    [railX * 2, 0.05, 0.05],
    [0, jetty.top + 0.32, jetty.endZ + 0.05],
  );
  if (builder.isFar) {
    return;
  }
  /* Lanterns on the end posts, and mooring bollards */
  [-1, 1].forEach((side) => {
    const x = side * railX;
    builder.bar(
      "metal",
      palette.black,
      [x, railTop, jetty.endZ + 0.05],
      [x, railTop + 0.45, jetty.endZ + 0.05],
      0.03,
      5,
    );
    builder.bar(
      "metal",
      palette.black,
      [x, railTop + 0.45, jetty.endZ + 0.05],
      [x - side * 0.2, railTop + 0.45, jetty.endZ + 0.05],
      0.025,
      5,
    );
    builder.box(
      "glow",
      palette.warmLight,
      [0.1, 0.14, 0.1],
      [x - side * 0.2, railTop + 0.33, jetty.endZ + 0.05],
    );
    builder.cylinder("metal", palette.black, {
      radius: 0.08,
      radiusEnd: 0.01,
      length: 0.07,
      at: [x - side * 0.2, railTop + 0.43, jetty.endZ + 0.05],
      segments: 8,
    });
    builder.lathe(
      "metal",
      palette.darkSteel,
      [
        [0.001, 0],
        [0.08, 0],
        [0.06, 0.12],
        [0.09, 0.16],
        [0.001, 0.17],
      ],
      [side * (jetty.halfWidth + 0.22), 0, 4.55],
      "y",
      10,
    );
  });
  builder.torus(
    "matte",
    "#c9b07a",
    0.11,
    0.035,
    [0.45, jetty.top + 0.03, 4.4],
    "y",
    10,
  );
};

/* Braziers, the rowing drum, the rune stone, the boathouse and the pines */

const buildBrazier = (builder: AttractionBuilder, { x, z }: LocalPoint) => {
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      palette.black,
      [x + Math.sin(angle) * 0.3, 0, z + Math.cos(angle) * 0.3],
      [x + Math.sin(angle) * 0.12, 0.85, z + Math.cos(angle) * 0.12],
      0.04,
      5,
    );
  });
  builder.lathe(
    "metal",
    bronze,
    [
      [0.001, 0.8],
      [0.16, 0.8],
      [0.27, 0.92],
      [0.29, 1.02],
      [0.25, 1.02],
      [0.001, 0.95],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 6 : 10,
  );
  builder.sphere("glow", lavaCore, 0.2, [x, 1.0, z], [1, 0.4, 1], 8);
  if (!builder.isFar) {
    builder.cylinder("glow", lava, {
      radius: 0.14,
      radiusEnd: 0.01,
      length: 0.34,
      at: [x, 1.18, z],
      segments: 8,
    });
  }
};

const buildDrum = (builder: AttractionBuilder) => {
  const { x, z } = drumAt;
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      darkPlank,
      [x + side * 0.38, 0, z - 0.2],
      [x + side * 0.32, 0.75, z],
      0.06,
      6,
    );
    builder.bar(
      "matte",
      darkPlank,
      [x + side * 0.38, 0, z + 0.2],
      [x + side * 0.32, 0.75, z],
      0.06,
      6,
    );
  });
  builder.cylinder("paint", vikingRed, {
    radius: 0.3,
    length: 0.5,
    at: [x, 0.85, z],
    axis: "x",
    segments: 14,
  });
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", "#ead9b4", {
      radius: 0.28,
      length: 0.02,
      at: [x + side * 0.255, 0.85, z],
      axis: "x",
      segments: 14,
    });
    builder.torus(
      "metal",
      bronze,
      0.29,
      0.02,
      [x + side * 0.25, 0.85, z],
      "x",
      12,
    );
  });
  if (!builder.isFar) {
    /* Criss-cross lacing and two beaters resting on top */
    for (let lace = 0; lace < 8; lace++) {
      const angle = (lace / 8) * Math.PI * 2;
      builder.bar(
        "matte",
        "#ead9b4",
        [x - 0.24, 0.85 + Math.sin(angle) * 0.29, z + Math.cos(angle) * 0.29],
        [
          x + 0.24,
          0.85 + Math.sin(angle + 0.4) * 0.29,
          z + Math.cos(angle + 0.4) * 0.29,
        ],
        0.012,
        3,
      );
    }
    [-0.1, 0.1].forEach((dx) => {
      builder.bar(
        "matte",
        palette.paleTimber,
        [x + dx, 1.17, z - 0.2],
        [x + dx * 1.5, 1.2, z + 0.25],
        0.03,
        5,
      );
      builder.sphere(
        "matte",
        "#ead9b4",
        0.045,
        [x + dx * 1.5, 1.2, z + 0.27],
        [1, 1, 1],
        6,
      );
    });
  }
};

const buildRuneStone = (builder: AttractionBuilder) => {
  const { x, z } = runeAt;
  builder.box(
    "matte",
    runeStone,
    [0.75, 1.25, 0.3],
    [x, 0.625, z],
    [0, 0.4, 0],
  );
  builder.cylinder("matte", runeStone, {
    radius: 0.375,
    length: 0.3,
    at: [x, 1.25, z],
    axis: "z",
    segments: builder.segments(12, 6),
  });
  builder.box("matte", runeStone, [0.75, 0.04, 0.3], [x, 1.25, z], [0, 0.4, 0]);
  builder.cylinder("matte", basalt, {
    radius: 0.55,
    radiusEnd: 0.5,
    length: 0.1,
    at: [x, 0.05, z],
    segments: builder.segments(14, 8),
  });
  if (builder.isFar) {
    return;
  }
  /* A painted serpent band and rune strokes on its face */
  const turn = 0.4;
  const out = (dx: number, y: number): Triple => [
    x + dx * Math.cos(turn) + 0.16 * Math.sin(turn),
    y,
    z - dx * Math.sin(turn) + 0.16 * Math.cos(turn),
  ];
  builder.add(
    "paint",
    vikingRed,
    new TorusGeometry(0.27, 0.025, 4, 18, Math.PI * 1.6),
    { at: out(0, 0.95), rotation: [0, turn, 0.6], scale: [1, 1.9, 1] },
  );
  [
    [-0.1, 1.15, 0],
    [0.06, 1.0, 0.4],
    [-0.06, 0.8, -0.4],
    [0.1, 0.62, 0],
    [-0.08, 0.5, 0.5],
  ].forEach(([dx, y, tilt]) => {
    builder.box("paint", darkBasalt, [0.025, 0.16, 0.02], out(dx, y), [
      0,
      turn,
      tilt,
    ]);
  });
};

const buildBoathouse = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = boathouse;
  builder.box("matte", darkPlank, [width, wall, depth], [x, wall / 2, z]);
  builder.box(
    "matte",
    basalt,
    [width + 0.16, 0.22, depth + 0.16],
    [x, 0.11, z],
  );
  const rise = 0.95;
  const halfDepth = depth / 2 + 0.2;
  const slope = Math.hypot(halfDepth, rise);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      turf,
      [width + 0.3, 0.14, slope],
      [x, wall + rise / 2, z + (side * halfDepth) / 2],
      [side * Math.atan2(rise, halfDepth), 0, 0],
    );
  });
  /* Gable ends with crossed carved dragon heads */
  [-1, 1].forEach((end) => {
    const gableX = x + end * (width / 2);
    builder.box(
      "matte",
      darkPlank,
      [0.1, rise * Math.SQRT2, rise * Math.SQRT2],
      [gableX, wall, z],
      [Math.PI / 4, 0, 0],
    );
    [-1, 1].forEach((side) => {
      builder.bar(
        "paint",
        vikingRed,
        [gableX + end * 0.05, wall + 0.1, z + side * (halfDepth - 0.1)],
        [gableX + end * 0.05, wall + rise + 0.35, z - side * 0.3],
        0.07,
        6,
      );
    });
  });
  builder.box(
    "paint",
    vikingRed,
    [0.8, 0.95, 0.05],
    [x - 0.3, 0.6, z + depth / 2 + 0.01],
  );
  if (builder.isFar) {
    return;
  }
  /* Planks on the walls, door studs and a row of shields */
  for (let board = 0; board < 9; board++) {
    builder.box(
      "matte",
      shade(darkPlank, 0.85),
      [0.03, wall - 0.25, 0.03],
      [
        x - width / 2 + 0.15 + board * 0.29,
        wall / 2 + 0.1,
        z + depth / 2 + 0.02,
      ],
    );
  }
  [-0.15, 0.15].forEach((dy) => {
    builder.box(
      "metal",
      palette.black,
      [0.7, 0.05, 0.02],
      [x - 0.3, 0.6 + dy * 2, z + depth / 2 + 0.04],
    );
  });
  builder.sphere(
    "metal",
    bronze,
    0.04,
    [x - 0.02, 0.6, z + depth / 2 + 0.05],
    [1, 1, 1],
    6,
  );
  [0.55, 1.0].forEach((dx, index) => {
    builder.cylinder("paint", index === 0 ? "#2f4f7a" : "#d9a93a", {
      radius: 0.18,
      length: 0.04,
      at: [x + dx, 0.75, z + depth / 2 + 0.04],
      axis: "z",
      segments: 14,
    });
    builder.sphere(
      "metal",
      bronze,
      0.05,
      [x + dx, 0.75, z + depth / 2 + 0.07],
      [1, 1, 1],
      6,
    );
  });
  /* Oars leaning against the wall and a barrel */
  [0, 1, 2].forEach((oar) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      [x - width / 2 - 0.25, 0, z - 0.5 + oar * 0.35],
      [x - width / 2 - 0.03, 1.15, z - 0.45 + oar * 0.35],
      0.04,
      5,
    );
  });
  builder.lathe(
    "matte",
    plank,
    [
      [0.001, 0],
      [0.2, 0],
      [0.24, 0.25],
      [0.2, 0.5],
      [0.001, 0.5],
    ],
    [x + width / 2 + 0.3, 0, z + 0.55],
    "y",
    12,
  );
  builder.torus(
    "metal",
    palette.darkSteel,
    0.225,
    0.015,
    [x + width / 2 + 0.3, 0.25, z + 0.55],
    "y",
    10,
  );
};

const addPine = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  size: number,
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.13 * size,
    radiusEnd: 0.08 * size,
    length: 0.9 * size,
    at: [x, 0.45 * size, z],
    segments: 7,
  });
  const tiers = builder.isFar
    ? [[0.75, 1.5, 0.7]]
    : [
        [0.8, 1.0, 0.65],
        [0.62, 0.9, 1.25],
        [0.42, 0.8, 1.8],
      ];
  tiers.forEach(([radius, height, y], index) => {
    builder.cylinder("matte", shade(pine, 1 + index * 0.08), {
      radius: radius * size,
      radiusEnd: 0.02,
      length: height * size,
      at: [x, (y + height / 2) * size, z],
      segments: 8,
    });
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", ashGravel, [1.7, 0.03, 3.6], [0, 0.015, 7.5]);
  builder.cylinder("matte", shade(ashGravel, 0.95), {
    radius: 2.0,
    length: 0.025,
    at: [0, 0.012, 5.6],
    segments: builder.segments(24, 12),
  });
  braziers.forEach((spot) => {
    buildBrazier(builder, spot);
  });
  buildDrum(builder);
  buildRuneStone(builder);
  buildBoathouse(builder);
  pines.forEach(([x, z, size]) => {
    addPine(builder, x, z, size);
  });
  addBench(builder, [2.7, 0, 5.3], Math.PI, plank);
  addBench(builder, [-4.3, 0, 3.6], Math.PI - 0.6, plank);
  if (!builder.isFar) {
    /* Basalt boulders, some with glowing cracks */
    const boulders: [number, number, number][] = [
      [-6.4, -0.6, 0.45],
      [5.9, 1.4, 0.4],
      [4.4, -6.4, 0.5],
    ];
    boulders.forEach(([x, z, size], index) => {
      builder.sphere(
        "matte",
        index % 2 === 0 ? darkBasalt : basalt,
        size,
        [x, size * 0.45, z],
        [1.2, 0.8, 1],
        7,
      );
      if (index % 2 === 0) {
        builder.box(
          "glow",
          lava,
          [size * 0.9, 0.03, 0.04],
          [x, size * 0.8, z + size * 0.6],
          [0.2, 0.5, 0],
        );
      }
    });
    builder.add(
      "matte",
      ashGravel,
      new BoxGeometry(0.5, 0.06, 0.5),
      { at: [0, 0.03, 9.3] },
      undefined,
    );
  }
  addSignBoard(builder, [-1.9, 0, 7.2], vikingRed);
};

/* What can be walked on, and what is in the way */

const jettyDeck: Deck = ({ x, z }) => {
  if (Math.abs(x) > jetty.halfWidth || z < jetty.endZ || z > jetty.rampZ) {
    return undefined;
  }
  if (z <= jetty.landZ) {
    return { height: jetty.top, kind: "bridge" };
  }
  return {
    height: (jetty.top * (jetty.rampZ - z)) / (jetty.rampZ - jetty.landZ),
    kind: "bridge",
  };
};

/* The boats go round, and the Character gets aboard at the jetty */

const boatPivot: Triple = [lake.x, waterY, lake.z];
const boatMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: boatOrbit,
  count: boatCount,
  speed: boatSpeed,
  isFacingAlong: true,
  bob: 0.03,
};

const rideStart: LocalPoint = { x: 0, z: 3.25 };
const rideFinish: LocalPoint = { x: 0.9, z: 6.6 };
const jettyEdge: Triple = [0, jetty.top, jetty.endZ + 0.3];
const stepOn = 0.9;
const hop = 0.8;
const walkOff = 2.6;
const spacing = (Math.PI * 2) / boatCount;
/** Where a boat's seat is right beside the jetty: the front of the lake. */
const boardingAngle = Math.PI * 1.5 + boatSeat[2] / boatOrbit;
const rideSeconds = stepOn + hop + lap / boatCount + lap + hop + walkOff + 0.4;

const findSeat = (seconds: number, copy: number): Triple =>
  moveWithPose(
    boatPivot,
    [
      boatPivot[0] + boatSeat[0],
      boatPivot[1] + boatSeat[1],
      boatPivot[2] + boatSeat[2],
    ],
    findMotionPose(boatMotion, seconds, { copy }),
  );

const blend = (
  from: Triple,
  to: Triple,
  share: number,
  lift: number,
): Triple => {
  const eased = share * share * (3 - 2 * share);
  return [
    from[0] + (to[0] - from[0]) * eased,
    from[1] + (to[1] - from[1]) * eased + lift * Math.sin(share * Math.PI),
    from[2] + (to[2] - from[2]) * eased,
  ];
};

const headingTo = (from: Triple, to: Triple): number =>
  Math.atan2(to[0] - from[0], to[2] - from[2]);

const sailRound = (progress: number, clockSeconds: number): LocalSpot => {
  const elapsed = progress * rideSeconds;
  const begun = clockSeconds - elapsed;
  const start: Triple = [rideStart.x, jetty.top, rideStart.z];
  const finish: Triple = [rideFinish.x, 0, rideFinish.z];
  const toSpot = ([x, y, z]: Triple, heading: number): LocalSpot => ({
    x,
    y,
    z,
    heading,
  });
  if (elapsed < stepOn) {
    return toSpot(blend(start, jettyEdge, elapsed / stepOn, 0), Math.PI);
  }
  /* The next boat to come alongside, and which copy it is */
  const turns = Math.ceil(
    (boatSpeed * (begun + stepOn + hop) - boardingAngle) / spacing,
  );
  const boarded = (boardingAngle + turns * spacing) / boatSpeed;
  const copy = ((-turns % boatCount) + boatCount) % boatCount;
  const landed = boarded + lap;
  const heading = (seconds: number) =>
    findMotionPose(boatMotion, seconds, { copy }).rotation[1] + Math.PI;
  if (clockSeconds < boarded - hop) {
    return toSpot(
      [
        jettyEdge[0],
        jettyEdge[1] + 0.04 * Math.abs(Math.sin(clockSeconds * 4)),
        jettyEdge[2],
      ],
      Math.PI,
    );
  }
  if (clockSeconds < boarded) {
    const share = 1 - (boarded - clockSeconds) / hop;
    return toSpot(
      blend(jettyEdge, findSeat(clockSeconds, copy), share, 0.35),
      Math.PI,
    );
  }
  if (clockSeconds < landed) {
    return toSpot(findSeat(clockSeconds, copy), heading(clockSeconds));
  }
  if (clockSeconds < landed + hop) {
    const share = (clockSeconds - landed) / hop;
    return toSpot(
      blend(findSeat(clockSeconds, copy), jettyEdge, share, 0.35),
      0,
    );
  }
  const walked = Math.min(1, (clockSeconds - landed - hop) / walkOff);
  const x = jettyEdge[0] + (finish[0] - jettyEdge[0]) * walked;
  const z = jettyEdge[2] + (finish[2] - jettyEdge[2]) * walked;
  const onShore: Triple = [x, jettyDeck({ x, z })?.height ?? 0, z];
  return toSpot(onShore, headingTo(jettyEdge, finish));
};

export const dragonBoatLakeModel: NewLandAttractionModel = {
  kind: "dragon-boat-lake",
  islandId: "ember-isle",
  name: "Dragon Boat Lake",
  fact: "Viking longships were long, narrow and light, so they could cross the open sea and still row up shallow rivers. They had a big square sail for the wind and rows of oars for rowing, and some had a carved dragon's head on the prow. From about AD 793, Vikings sailed them from Scandinavia to raid and settle in Britain.",
  curriculumLink:
    "History, Key Stage 2: the Viking and Anglo-Saxon struggle for the Kingdom of England. How Viking longships carried raiders and settlers to Britain.",
  footprint: 10,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: -1.9, z: 8.0 },
  build: (builder) => {
    buildLake(builder);
    buildIslet(builder);
    buildJetty(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "dragon boats",
      pivot: boatPivot,
      build: buildDragonBoat,
      motion: boatMotion,
    },
    {
      name: "lake dragon",
      pivot: [lake.x - 1.2, waterY - 1.45, lake.z],
      build: buildLakeDragon,
      motion: { kind: "rise", reach: 7, height: 1.45, period: 2.6 },
    },
    {
      name: "islet flame",
      pivot: flameAt,
      build: (builder) => {
        builder.cylinder("glow", lava, {
          radius: 0.15,
          radiusEnd: 0.01,
          length: 0.5,
          at: [0, 0.25, 0.15],
          segments: 10,
        });
        builder.cylinder("glow", lavaCore, {
          radius: 0.08,
          radiusEnd: 0.01,
          length: 0.3,
          at: [0, 0.15, 0.15],
          segments: 8,
        });
      },
      motion: { kind: "flicker", period: 0.6 },
    },
    {
      name: "jetty pennant",
      pivot: [-railX, railTop, 4.05],
      build: (builder) => {
        builder.cylinder("matte", darkPlank, {
          radius: 0.03,
          length: 1.3,
          at: [0, 0.65, 0],
          segments: 6,
        });
        builder.box("paint", vikingRed, [0.02, 0.28, 0.55], [0, 1.15, -0.3]);
        builder.box("paint", "#d9a93a", [0.022, 0.05, 0.55], [0, 1.15, -0.3]);
      },
      motion: { kind: "swing", axis: "y", amplitude: 0.35, period: 3.2 },
    },
  ],
  wanderers: [
    {
      name: "eider ducks",
      build: buildEiderDuck,
      count: 2,
      centre: { x: lake.x + 1.45, z: lake.z },
      radius: 0.35,
      speed: 0.2,
      height: waterY,
    },
  ],
  smoke: [
    {
      at: [lake.x + 0.55, 0.4, lake.z + 0.35],
      colour: "#e8e4dc",
      puffs: 6,
      size: 0.3,
      rise: 1.6,
      spread: 0.3,
    },
  ],
  blockers: [
    { x: boathouse.x - 0.65, z: boathouse.z, radius: 1.1 },
    { x: boathouse.x + 0.65, z: boathouse.z, radius: 1.1 },
    { x: runeAt.x, z: runeAt.z, radius: 0.5 },
    { x: drumAt.x, z: drumAt.z, radius: 0.45 },
    ...braziers.map(({ x, z }) => ({ x, z, radius: 0.32 })),
    ...pines.map(([x, z]) => ({ x, z, radius: 0.3 })),
  ] satisfies LocalBlocker[],
  decks: [jettyDeck],
  rides: [
    {
      id: "dragon-boat",
      name: "the dragon boat",
      start: rideStart,
      reach: 0.6,
      seconds: rideSeconds,
      finish: rideFinish,
      follow: sailRound,
    },
  ],
  tune: [57, 60, 62, 64, 62, 60, 57, 55, 57],
  play: {
    label: "Beat the rowing drum",
    news: "Boom, boom, BOOM! You beat the rowing drum and the Vikings pulled their oars in time, and the dragon boats raced round the lake.",
    tune: [45, 45, 52, 45, 45, 52, 57],
  },
};
