import {
  BoxGeometry,
  CircleGeometry,
  SphereGeometry,
  DodecahedronGeometry,
  ExtrudeGeometry,
  Path,
  Shape,
  Vector2,
} from "three";
import {
  addBench,
  addDoor,
  addLampPost,
  addSignBoard,
  addWindow,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef3f6";
const snowShadow = "#d6e1ea";
const seaBed = "#1d5876";
const lagoonWater = "#3b9cc4";
const rockGrey = "#66717c";
const sealGrey = "#7b8691";
const sealDark = "#4f5963";
const pupWhite = "#f4f2ea";
const deckTimber = "#a77748";
const railTimber = "#6b4a2f";
const faluRed = "#9e2b25";
const trim = "#f2efe6";
const roofGrey = "#3b4148";
const pine = "#2d5a40";
const signColour = "#1f6f8f";

/* The lagoon lies in the middle; a boardwalk runs out to a round platform */
const lagoon = { x: 0, z: -1.4, rx: 4.4, rz: 3.2 };
const waterTop = 0.14;
const deckHeight = 0.3;
const walk = { minX: -0.7, maxX: 0.7, minZ: lagoon.z, maxZ: 3.6 };
const platform = { x: lagoon.x, z: lagoon.z, radius: 1.3 };

const keeperHut = { x: 5.7, z: -4.3, width: 2.2, depth: 1.8, wall: 1.7 };
const ballRock: Triple = [1.9, 0, -4.35];
const ballSealNeck: Triple = [ballRock[0], 0.95, ballRock[2] + 0.05];
const popSeals: LocalPoint[] = [
  { x: 2.1, z: 0.5 },
  { x: -2.3, z: -0.3 },
];
const splashAt: Triple = [-1.4, waterTop, -3.0];

const signAt: Triple = [-2.6, 0, 6.4];
const rideStart = { x: -5.9, z: 0.9 };
const rideFinish = { x: 5.9, z: 0.9 };

const onLagoon = (angle: number, scale = 1): Triple => [
  lagoon.x + Math.sin(angle) * lagoon.rx * scale,
  0,
  lagoon.z + Math.cos(angle) * lagoon.rz * scale,
];

/* ------------------------------------------------------------------ */
/* The lagoon, its kerb, rocks and floes                               */
/* ------------------------------------------------------------------ */

const ellipseShape = (scale: number) => {
  const shape = new Shape();
  shape.absellipse(0, 0, lagoon.rx * scale, lagoon.rz * scale, 0, Math.PI * 2);
  return shape;
};

const buildLagoon = (builder: AttractionBuilder) => {
  const segments = builder.segments(48, 20);
  builder.add("matte", seaBed, new CircleGeometry(1, segments), {
    at: [lagoon.x, 0.03, lagoon.z],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [lagoon.rx, lagoon.rz, 1],
  });
  builder.add("water", lagoonWater, new CircleGeometry(1, segments), {
    at: [lagoon.x, waterTop, lagoon.z],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [lagoon.rx, lagoon.rz, 1],
  });
  /* A low kerb of packed snow and ice all round */
  const kerb = ellipseShape(1.1);
  const hole = new Path();
  hole.absellipse(0, 0, lagoon.rx, lagoon.rz, 0, Math.PI * 2);
  kerb.holes.push(hole);
  builder.add(
    "matte",
    snowShadow,
    new ExtrudeGeometry(kerb, {
      depth: 0.2,
      bevelEnabled: false,
      curveSegments: builder.segments(24, 10),
    }),
    { at: [lagoon.x, 0, lagoon.z], rotation: [-Math.PI / 2, 0, 0] },
  );
  if (builder.isFar) {
    return;
  }
  /* Floating floes of sea ice */
  [
    [-2.6, -1.9, 0.55, 0.3],
    [1.4, -2.6, 0.42, 1.2],
    [3.0, -0.6, 0.35, 2.1],
    [-1.2, 0.9, 0.3, 0.7],
  ].forEach(([x, z, size, turn]) => {
    const floe = new Shape([
      new Vector2(-size, -size * 0.5),
      new Vector2(size * 0.3, -size * 0.8),
      new Vector2(size, -size * 0.1),
      new Vector2(size * 0.6, size * 0.7),
      new Vector2(-size * 0.4, size * 0.6),
    ]);
    builder.add(
      "paint",
      "#f2f8fb",
      new ExtrudeGeometry(floe, { depth: 0.1, bevelEnabled: false }),
      { at: [x, waterTop + 0.06, z], rotation: [-Math.PI / 2, 0, turn] },
    );
  });
};

const addRock = (
  builder: AttractionBuilder,
  [x, z, size, height]: [number, number, number, number],
) => {
  builder.add(
    "matte",
    rockGrey,
    new DodecahedronGeometry(size, 0),
    {
      at: [x, height * 0.35, z],
      scale: [1.2, height / size, 1],
      rotation: [0, x + z, 0],
    },
    undefined,
  );
  builder.sphere(
    "matte",
    snow,
    size * 0.75,
    [x, height * 0.35 + height * 0.55, z],
    [1.3, 0.35, 1.1],
    builder.isFar ? 6 : 10,
  );
};

/* Rocks round the back, where the seals haul out to rest */
const rocks: [number, number, number, number][] = [
  [-3.4, -3.9, 0.75, 0.7],
  [-4.4, -2.4, 0.6, 0.55],
  [ballRock[0], ballRock[2], 0.7, 0.75],
  [3.9, -3.2, 0.65, 0.6],
  [4.5, -1.6, 0.5, 0.45],
  [-0.4, -4.7, 0.55, 0.5],
];

/* ------------------------------------------------------------------ */
/* Seals                                                               */
/* ------------------------------------------------------------------ */

/** A sphere stretched by `scale` and then turned about y, for animals that face any way. */
const blob = (
  builder: AttractionBuilder,
  finish: "matte" | "paint",
  colour: string,
  radius: number,
  at: Triple,
  scale: Triple,
  turn: number,
  segments: number,
) => {
  const around = builder.segments(segments);
  builder.add(
    finish,
    colour,
    new SphereGeometry(radius, around, Math.max(3, Math.round(around * 0.66))),
    { at, rotation: [0, turn, 0], scale },
  );
};

/** A grey seal lying on its tummy, facing +z, at `at` turned by `turn`. */
const addLyingSeal = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  colour = sealGrey,
  size = 1,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + (x * Math.cos(turn) + z * Math.sin(turn)) * size,
    at[1] + y * size,
    at[2] + (-x * Math.sin(turn) + z * Math.cos(turn)) * size,
  ];
  blob(
    builder,
    "matte",
    colour,
    0.32 * size,
    place(0, 0.2, 0),
    [0.75, 0.6, 1.45],
    turn,
    12,
  );
  blob(
    builder,
    "matte",
    colour,
    0.2 * size,
    place(0, 0.32, 0.46),
    [1, 0.95, 1.1],
    turn,
    11,
  );
  blob(
    builder,
    "matte",
    shade(colour, 1.15),
    0.09 * size,
    place(0, 0.27, 0.64),
    [1.2, 0.8, 1],
    turn,
    8,
  );
  blob(
    builder,
    "matte",
    shade(colour, 0.8),
    0.14 * size,
    place(0, 0.14, -0.5),
    [1.4, 0.35, 1],
    turn,
    8,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    blob(
      builder,
      "matte",
      shade(colour, 0.8),
      0.1 * size,
      place(side * 0.24, 0.08, 0.18),
      [0.8, 0.3, 1.5],
      turn,
      7,
    );
    blob(
      builder,
      "paint",
      palette.black,
      0.035 * size,
      place(side * 0.08, 0.38, 0.6),
      [1, 1, 1],
      turn,
      6,
    );
  });
  blob(
    builder,
    "paint",
    palette.black,
    0.025 * size,
    place(0, 0.3, 0.73),
    [1.3, 1, 1],
    turn,
    5,
  );
};

/* A seal's head and neck, upright, which pops up out of the water */
const buildPoppingSeal = (builder: AttractionBuilder) => {
  builder.cylinder("matte", sealGrey, {
    radius: 0.2,
    radiusEnd: 0.16,
    length: 0.5,
    at: [0, 0.25, 0],
    segments: 12,
  });
  builder.sphere("matte", sealGrey, 0.19, [0, 0.58, 0.02], [1, 0.95, 1.1], 12);
  builder.sphere(
    "matte",
    shade(sealGrey, 1.18),
    0.09,
    [0, 0.53, 0.18],
    [1.2, 0.8, 1],
    10,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.04,
      [side * 0.08, 0.64, 0.15],
      [1, 1, 1],
      8,
    );
    if (!builder.isFar) {
      [-1, 0, 1].forEach((whisker) => {
        builder.bar(
          "matte",
          trim,
          [side * 0.06, 0.53 + whisker * 0.015, 0.24],
          [side * 0.2, 0.55 + whisker * 0.04, 0.24],
          0.006,
          3,
        );
      });
    }
  });
  builder.sphere("paint", palette.black, 0.03, [0, 0.56, 0.27], [1.3, 1, 1], 6);
  /* A ring of ripples round its neck */
  builder.torus("water", "#bfe6f5", 0.27, 0.03, [0, 0.07, 0], "y", 12);
};

const buildBallSealBody = (builder: AttractionBuilder) => {
  const [x, , z] = ballRock;
  builder.sphere("matte", sealDark, 0.3, [x, 0.66, z], [0.85, 0.75, 1.2], 12);
  builder.sphere("matte", sealDark, 0.22, [x, 0.84, z + 0.08], [1, 1.1, 1], 12);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      shade(sealDark, 0.85),
      0.1,
      [x + side * 0.24, 0.6, z + 0.18],
      [0.6, 0.3, 1.3],
      8,
    );
  });
};

/* Its head and nose, balancing a ball, nodding as the Character comes */
const buildBallSealHead = (builder: AttractionBuilder) => {
  builder.cylinder("matte", sealDark, {
    radius: 0.16,
    radiusEnd: 0.13,
    length: 0.3,
    at: [0, 0.12, 0],
    segments: 12,
  });
  builder.sphere("matte", sealDark, 0.16, [0, 0.32, 0.04], [1, 0.95, 1.1], 12);
  builder.sphere(
    "matte",
    shade(sealDark, 1.25),
    0.08,
    [0, 0.36, 0.17],
    [1, 0.8, 1.2],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.035,
      [side * 0.07, 0.38, 0.14],
      [1, 1, 1],
      8,
    );
  });
  /* The striped beach ball on its nose */
  const ballY = 0.62;
  const bands = ["#e53b3b", "#2f7fd8", "#f2c230"];
  builder.sphere(
    "paint",
    trim,
    0.2,
    [0, ballY, 0.12],
    [1, 1, 1],
    builder.isFar ? 8 : 16,
  );
  if (!builder.isFar) {
    [0, 1, 2].forEach((band) => {
      builder.torus(
        "paint",
        bands[band],
        0.2 - Math.abs(band - 1) * 0.04,
        0.025,
        [0, ballY + (band - 1) * 0.11, 0.12],
        "y",
        12,
      );
    });
  }
};

/* Water leaping up where a seal has just dived */
const buildSplash = (builder: AttractionBuilder) => {
  builder.cylinder("water", "#cfeefa", {
    radius: 0.32,
    radiusEnd: 0.05,
    length: 1.2,
    at: [0, 0.6, 0],
    segments: 14,
  });
  builder.cylinder("water", "#e6f7fd", {
    radius: 0.14,
    radiusEnd: 0.02,
    length: 1.6,
    at: [0, 0.8, 0],
    segments: 10,
  });
  if (!builder.isFar) {
    for (let drop = 0; drop < 6; drop++) {
      const angle = (drop / 6) * Math.PI * 2;
      builder.sphere(
        "water",
        "#e6f7fd",
        0.07,
        [
          Math.sin(angle) * 0.42,
          0.75 + (drop % 2) * 0.3,
          Math.cos(angle) * 0.42,
        ],
        [1, 1.3, 1],
        6,
      );
    }
  }
};

/* Seals swimming about the lagoon, just their backs and heads showing */
const buildSwimmingSeal = (builder: AttractionBuilder) => {
  builder.sphere("matte", sealGrey, 0.28, [0, 0.0, 0], [0.7, 0.45, 1.6], 10);
  builder.sphere("matte", sealGrey, 0.17, [0, 0.1, 0.42], [1, 1, 1.1], 10);
  builder.sphere(
    "paint",
    palette.black,
    0.03,
    [0.07, 0.17, 0.55],
    [1, 1, 1],
    5,
  );
  builder.sphere(
    "paint",
    palette.black,
    0.03,
    [-0.07, 0.17, 0.55],
    [1, 1, 1],
    5,
  );
  if (builder.isFar) {
    return;
  }
  builder.torus("water", "#bfe6f5", 0.3, 0.03, [0, 0.02, 0.1], "y", 10);
};

/* Gulls wheeling overhead */
const buildGull = (builder: AttractionBuilder) => {
  builder.sphere("matte", trim, 0.1, [0, 0, 0], [0.8, 0.8, 1.6], 8);
  builder.sphere("matte", trim, 0.07, [0, 0.05, 0.16], [1, 1, 1], 7);
  builder.box("paint", "#f2b02e", [0.03, 0.03, 0.08], [0, 0.04, 0.25]);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#c9d2d9",
      [0.38, 0.02, 0.14],
      [side * 0.22, 0.06, 0],
      [0, 0, side * 0.25],
    );
    builder.box(
      "matte",
      "#3a3f46",
      [0.1, 0.021, 0.14],
      [side * 0.43, 0.15, 0],
      [0, 0, side * 0.25],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The boardwalk and platform                                          */
/* ------------------------------------------------------------------ */

const buildBoardwalk = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = walk;
  const length = maxZ - minZ;
  const boards = builder.isFar ? 1 : 22;
  builder.painted(
    new BoxGeometry(maxX - minX, 0.1, length, 1, 1, boards),
    (centre) =>
      Math.floor((centre.z - minZ) / (length / boards)) % 2 === 0
        ? deckTimber
        : shade(deckTimber, 0.9),
    { at: [(minX + maxX) / 2, deckHeight - 0.05, (minZ + maxZ) / 2] },
    "matte",
    undefined,
  );
  builder.cylinder("matte", deckTimber, {
    radius: platform.radius + 0.1,
    length: 0.1,
    at: [platform.x, deckHeight - 0.05, platform.z],
    segments: builder.segments(28, 12),
  });
  /* Piles under the boardwalk and platform */
  const piles: Triple[] = [];
  for (let z = minZ + 1.6; z < maxZ - 0.4; z += 1.1) {
    piles.push([minX + 0.05, 0, z], [maxX - 0.05, 0, z]);
  }
  for (let pile = 0; pile < 6; pile++) {
    const angle = (pile / 6) * Math.PI * 2 + 0.3;
    piles.push([
      platform.x + Math.sin(angle) * platform.radius,
      0,
      platform.z + Math.cos(angle) * platform.radius,
    ]);
  }
  (builder.isFar ? [] : piles).forEach(([x, , z]) => {
    builder.cylinder("matte", railTimber, {
      radius: 0.07,
      length: deckHeight,
      at: [x, deckHeight / 2, z],
      segments: 6,
    });
  });
  /* Railings down both sides */
  const railFrom = platform.z + platform.radius - 0.05;
  [minX, maxX].forEach((x) => {
    builder.box(
      "paint",
      railTimber,
      [0.07, 0.07, maxZ - railFrom],
      [x, deckHeight + 0.9, (railFrom + maxZ) / 2],
    );
    builder.box(
      "paint",
      railTimber,
      [0.05, 0.05, maxZ - railFrom],
      [x, deckHeight + 0.5, (railFrom + maxZ) / 2],
    );
    for (let z = railFrom; z <= maxZ + 0.01; z += (maxZ - railFrom) / 4) {
      builder.box(
        "paint",
        railTimber,
        [0.09, 0.95, 0.09],
        [x, deckHeight + 0.47, z],
      );
    }
  });
  /* Railing round the platform, open towards the boardwalk */
  const posts = builder.isFar ? 8 : 14;
  const postAt = (index: number): Triple => {
    const angle = (index / posts) * Math.PI * 2 + Math.PI / posts;
    return [
      platform.x + Math.sin(angle) * (platform.radius + 0.02),
      deckHeight,
      platform.z + Math.cos(angle) * (platform.radius + 0.02),
    ];
  };
  for (let index = 0; index < posts; index++) {
    const [x, y, z] = postAt(index);
    builder.box("paint", railTimber, [0.09, 0.95, 0.09], [x, y + 0.47, z]);
    if (index < posts - 1) {
      const [nx, , nz] = postAt(index + 1);
      builder.bar(
        "paint",
        railTimber,
        [x, y + 0.9, z],
        [nx, y + 0.9, nz],
        0.07,
        5,
      );
      builder.bar(
        "paint",
        railTimber,
        [x, y + 0.5, z],
        [nx, y + 0.5, nz],
        0.05,
        4,
      );
    }
  }
  if (builder.isFar) {
    return;
  }
  /* A telescope on the platform, and a lifebuoy */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.04,
    length: 1.0,
    at: [platform.x - 0.7, deckHeight + 0.5, platform.z - 0.5],
    segments: 8,
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.07,
    radiusEnd: 0.1,
    length: 0.5,
    at: [platform.x - 0.7, deckHeight + 1.05, platform.z - 0.5],
    axis: "z",
    segments: 10,
  });
  builder.torus(
    "paint",
    "#e8452f",
    0.2,
    0.06,
    [maxX + 0.06, deckHeight + 0.7, maxZ - 0.6],
    "x",
    14,
  );
  builder.torus(
    "paint",
    trim,
    0.2,
    0.062,
    [maxX + 0.065, deckHeight + 0.7, maxZ - 0.6],
    "x",
    4,
  );
};

/* The fence round the lagoon, open where the boardwalk starts */
const fencePoints = (count: number): LocalPoint[] =>
  Array.from({ length: count + 1 }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const [x, , z] = onLagoon(angle, 1.16);
    return { x, z };
  });

const buildLagoonFence = (builder: AttractionBuilder) => {
  const points = fencePoints(builder.isFar ? 10 : 20);
  const gateX = walk.maxX + 0.08;
  const toGate = (point: LocalPoint): LocalPoint => {
    const x = Math.sign(point.x) * gateX;
    const share = x / (lagoon.rx * 1.16);
    return { x, z: lagoon.z + lagoon.rz * 1.16 * Math.sqrt(1 - share * share) };
  };
  points.slice(1).forEach((end, index) => {
    const start = points[index];
    const isFront = start.z > lagoon.z;
    const startIn = isFront && Math.abs(start.x) < gateX;
    const endIn = isFront && Math.abs(end.x) < gateX;
    if (startIn && endIn) {
      return;
    }
    const from = startIn ? toGate(end) : start;
    const to = endIn ? toGate(start) : end;
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const turn = Math.atan2(to.x - from.x, to.z - from.z);
    const rails = builder.isFar ? [0.75] : [0.4, 0.75];
    rails.forEach((height) => {
      builder.box(
        "matte",
        railTimber,
        [0.06, 0.07, length + 0.06],
        [(from.x + to.x) / 2, height, (from.z + to.z) / 2],
        [0, turn, 0],
      );
    });
    builder.box(
      "matte",
      shade(railTimber, 0.85),
      [0.1, 0.85, 0.1],
      [from.x, 0.42, from.z],
      [0, turn, 0],
    );
  });
};

/* The raft, moored by the left jetty, ready to float across */
const buildJetties = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    const x = side * 4.7;
    builder.box("matte", deckTimber, [1.2, 0.08, 0.9], [x, 0.22, 0.6]);
    [-0.4, 0.4].forEach((along) => {
      builder.cylinder("matte", railTimber, {
        radius: 0.06,
        length: 0.5,
        at: [x - side * 0.5, 0.25, 0.6 + along],
        segments: 6,
      });
    });
  });
  const raftX = -3.6;
  const raftZ = 0.3;
  for (let log = 0; log < 5; log++) {
    builder.cylinder(
      "matte",
      log % 2 === 0 ? palette.timber : palette.paleTimber,
      {
        radius: 0.1,
        length: 1.3,
        at: [raftX, waterTop + 0.05, raftZ - 0.4 + log * 0.2],
        axis: "x",
        segments: 8,
      },
    );
  }
  if (!builder.isFar) {
    builder.cylinder("matte", railTimber, {
      radius: 0.03,
      length: 1.0,
      at: [raftX + 0.5, waterTop + 0.55, raftZ],
      segments: 5,
    });
    builder.box(
      "matte",
      "#e8452f",
      [0.02, 0.3, 0.4],
      [raftX + 0.5, waterTop + 0.9, raftZ + 0.2],
    );
  }
};

/* ------------------------------------------------------------------ */
/* The keeper's hut                                                    */
/* ------------------------------------------------------------------ */

const buildKeeperHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = keeperHut;
  const planks = builder.isFar ? 1 : 9;
  builder.painted(
    new BoxGeometry(width, wall, depth, 1, planks, 1),
    (centre) =>
      Math.floor(centre.y / (wall / planks)) % 2 === 0
        ? faluRed
        : shade(faluRed, 0.88),
    { at: [x, wall / 2 + 0.1, z] },
    "matte",
    undefined,
  );
  builder.box(
    "matte",
    palette.darkStone,
    [width + 0.14, 0.1, depth + 0.14],
    [x, 0.05, z],
  );
  const eaves = wall + 0.1;
  const rise = 0.8;
  const gable = new Shape([
    new Vector2(-depth / 2, 0),
    new Vector2(depth / 2, 0),
    new Vector2(0, rise),
  ]);
  builder.add(
    "matte",
    shade(faluRed, 0.9),
    new ExtrudeGeometry(gable, { depth: width, bevelEnabled: false }),
    { at: [x - width / 2, eaves, z], rotation: [0, Math.PI / 2, 0] },
  );
  const overhang = 0.28;
  const halfSpan = depth / 2 + overhang;
  const slope = Math.hypot(halfSpan, rise * (halfSpan / (depth / 2)));
  const angle = Math.atan2(rise, depth / 2);
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      roofGrey,
      [width + overhang * 2, 0.1, slope],
      [x, eaves + rise / 2 + 0.02, z + (side * halfSpan) / 2],
      [side * angle, 0, 0],
    );
    builder.box(
      "matte",
      snow,
      [width + overhang * 2 - 0.1, 0.1, slope - 0.1],
      [x, eaves + rise / 2 + 0.11, z + (side * halfSpan) / 2 + side * 0.02],
      [side * angle, 0, 0],
    );
  });
  [-1, 1].forEach((sideX) => {
    builder.box(
      "paint",
      trim,
      [0.1, wall, 0.1],
      [x + sideX * (width / 2), wall / 2 + 0.1, z + depth / 2],
    );
  });
  addDoor(builder, {
    at: [x - (width / 2 + 0.005), 0.1, z],
    colour: "#2f4a5f",
    frame: trim,
    turn: -Math.PI / 2,
  });
  addWindow(builder, {
    at: [x, 1.15, z + depth / 2 + 0.01],
    width: 0.7,
    height: 0.55,
    frame: trim,
    isLit: true,
  });
  builder.cylinder("matte", palette.stone, {
    radius: 0.12,
    length: 0.8,
    at: [x + 0.6, eaves + 0.7, z - 0.3],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  /* Fish buckets, with fish for the seals' tea */
  [
    [x - 1.6, z + 0.6],
    [x - 1.6, z + 1.1],
  ].forEach(([bx, bz], index) => {
    builder.cylinder("metal", index === 0 ? palette.steel : "#2f7fd8", {
      radius: 0.2,
      radiusEnd: 0.16,
      length: 0.34,
      at: [bx, 0.17, bz],
      segments: 12,
    });
    [-0.06, 0.06].forEach((offset, fish) => {
      builder.sphere(
        "metal",
        "#b8c4cc",
        0.05,
        [bx + offset, 0.36, bz],
        [0.7, 0.7, 2.2],
        6,
      );
      builder.box(
        "metal",
        "#9aa8b2",
        [0.08, 0.06, 0.01],
        [bx + offset, 0.36, bz + (fish === 0 ? 0.14 : -0.14)],
        [Math.PI / 2, 0, 0],
      );
    });
  });
  builder.box(
    "paint",
    signColour,
    [1.0, 0.25, 0.04],
    [x, eaves + 0.25, z + depth / 2 + 0.06],
  );
  builder.box(
    "paint",
    trim,
    [0.8, 0.05, 0.02],
    [x, eaves + 0.26, z + depth / 2 + 0.09],
  );
};

const pines: [number, number, number][] = [
  [-6.4, -5.0, 1.2],
  [-2.2, -7.6, 1.3],
  [2.6, -7.8, 1.0],
  [7.6, -1.4, 1.1],
  [-7.8, -1.6, 0.95],
];

const addPine = (
  builder: AttractionBuilder,
  [x, z, size]: [number, number, number],
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.13 * size,
    radiusEnd: 0.08 * size,
    length: 0.8 * size,
    at: [x, 0.4 * size, z],
    segments: 7,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (1.0 - share * 0.55) * size;
    const height = (1.35 - share * 0.25) * size;
    const base = (0.55 + share * 1.8) * size;
    builder.cylinder("matte", tier % 2 === 0 ? pine : shade(pine, 1.12), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, base + height / 2, z],
      segments: 9,
    });
    if (!builder.isFar) {
      const cap = height * 0.45;
      builder.cylinder("matte", snow, {
        radius: radius * 0.55,
        radiusEnd: 0.03,
        length: cap,
        at: [x, base + height - cap / 2 + 0.03, z],
        segments: 9,
      });
    }
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  rocks.forEach((rock) => {
    addRock(builder, rock);
  });
  addLyingSeal(builder, [-3.4, 0.62, -3.85], 0.6);
  addLyingSeal(builder, [3.9, 0.55, -3.15], -0.9, sealDark);
  addLyingSeal(builder, [-4.35, 0.48, -2.35], 1.9, pupWhite, 0.7);
  addLyingSeal(builder, [4.5, 0.4, -1.55], -2.2, pupWhite, 0.65);
  pines.forEach((tree) => {
    addPine(builder, tree);
  });
  /* The path from the sign to the boardwalk */
  builder.box("matte", "#b9b2a6", [1.6, 0.02, 3.4], [0, 0.01, 5.2]);
  builder.box("matte", "#b9b2a6", [2.4, 0.02, 1.2], [-1.4, 0.01, 6.6]);
  addBench(builder, [-2.4, 0, 3.4], Math.PI, deckTimber);
  addBench(builder, [2.4, 0, 3.4], Math.PI, deckTimber);
  addLampPost(builder, [1.2, 0, 3.9]);
  addLampPost(builder, [-1.2, 0, 3.9]);
  if (builder.isFar) {
    return;
  }
  [
    [6.4, 3.0, 0.5],
    [-6.6, 3.2, 0.45],
    [4.0, 6.4, 0.4],
    [-7.4, -3.6, 0.5],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowShadow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
};

/* ------------------------------------------------------------------ */
/* The ride: a raft across the lagoon, round behind the platform       */
/* ------------------------------------------------------------------ */

const arc = { rx: 3.2, rz: 2.35 };
const arcPoint = (angle: number): [number, number] => [
  lagoon.x + Math.sin(angle) * arc.rx,
  lagoon.z + Math.cos(angle) * arc.rz,
];
const arcFrom = -Math.PI / 2 + 0.55;
const arcTo = -Math.PI * 1.5 - 0.55;

const raftRide = (progress: number, clock: number): LocalSpot => {
  const float = waterTop + 0.12 + 0.03 * Math.sin(clock * 2.1);
  const [ax, az] = arcPoint(arcFrom);
  const [bx, bz] = arcPoint(arcTo);
  if (progress < 0.12) {
    const share = progress / 0.12;
    return {
      x: rideStart.x + (ax - rideStart.x) * share,
      y: float * share,
      z: rideStart.z + (az - rideStart.z) * share,
      heading: Math.atan2(ax - rideStart.x, az - rideStart.z),
    };
  }
  if (progress < 0.88) {
    const share = (progress - 0.12) / 0.76;
    const angle = arcFrom + (arcTo - arcFrom) * share;
    const [x, z] = arcPoint(angle);
    return {
      x,
      y: float,
      z,
      heading: Math.atan2(-Math.cos(angle) * arc.rx, Math.sin(angle) * arc.rz),
    };
  }
  const share = (progress - 0.88) / 0.12;
  return {
    x: bx + (rideFinish.x - bx) * share,
    y: float * (1 - share),
    z: bz + (rideFinish.z - bz) * share,
    heading: Math.atan2(rideFinish.x - bx, rideFinish.z - bz),
  };
};

const platformDeck: Deck = ({ x, z }) =>
  Math.hypot(x - platform.x, z - platform.z) <= platform.radius + 0.05
    ? { height: deckHeight, kind: "bridge" }
    : undefined;

export const sealLagoonModel: NewLandAttractionModel = {
  kind: "seal-lagoon",
  islandId: "frost-isle",
  name: "Seal Lagoon",
  fact: "Seals live in cold seas and come up onto rocks and ice to rest. A thick layer of fat called blubber keeps them warm in icy water, and their smooth bodies and flippers make them speedy swimmers. Seal pups are born with fluffy white fur.",
  curriculumLink:
    "Science, Year 2: living things and their habitats. Animals, such as seals, live in habitats they are suited to and get what they need from them.",
  footprint: 9.5,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 1.0 },
  build: (builder) => {
    buildLagoon(builder);
    buildBoardwalk(builder);
    buildLagoonFence(builder);
    buildJetties(builder);
    buildKeeperHut(builder);
    buildBallSealBody(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "seal popping up",
      pivot: [popSeals[0].x, -0.55, popSeals[0].z],
      build: buildPoppingSeal,
      motion: { kind: "rise", reach: 4, height: 0.62, period: 1.8 },
    },
    {
      name: "another seal popping up",
      pivot: [popSeals[1].x, -0.55, popSeals[1].z],
      build: buildPoppingSeal,
      motion: { kind: "rise", reach: 4, height: 0.62, period: 2.1, phase: 1.3 },
    },
    {
      name: "seal with a ball",
      pivot: ballSealNeck,
      build: buildBallSealHead,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.35,
        period: 1.1,
      },
    },
    {
      name: "splash",
      pivot: splashAt,
      build: buildSplash,
      motion: { kind: "splash", reach: 5, period: 1.4 },
    },
  ],
  wanderers: [
    {
      name: "swimming seals",
      build: buildSwimmingSeal,
      count: 2,
      centre: { x: 1.8, z: -2.2 },
      radius: 1.0,
      speed: 0.6,
      height: waterTop,
    },
    {
      name: "gulls",
      build: buildGull,
      count: 2,
      centre: { x: 0, z: -1.6 },
      radius: 3.2,
      speed: 1.4,
      height: 3.0,
      bob: 0.2,
    },
  ],
  smoke: [
    {
      at: [keeperHut.x + 0.6, keeperHut.wall + 1.25, keeperHut.z - 0.3],
      colour: "#d8dcdf",
      puffs: 5,
      size: 0.12,
      rise: 1.3,
      spread: 0.3,
    },
  ],
  decks: [buildFlatDeck(walk, deckHeight), platformDeck],
  rides: [
    {
      id: "ice-raft",
      name: "the raft across the lagoon",
      start: rideStart,
      reach: 0.7,
      seconds: 14,
      finish: rideFinish,
      follow: raftRide,
    },
  ],
  play: {
    label: "Throw the seals a fish",
    news: "Splash! You threw a silvery fish, and the seals clapped their flippers, honked hello and dived in after it.",
    tune: [67, 64, 72],
  },
};
