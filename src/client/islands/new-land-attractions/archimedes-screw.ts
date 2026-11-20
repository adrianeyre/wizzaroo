import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  TorusGeometry,
} from "three";
import {
  addBench,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addBandedRock,
  addPalm,
  addPot,
  addRock,
  addScrub,
  addSlab,
  buildPerson,
  desert,
  followPath,
  listCurve,
  listSmoothKnots,
  listTroughSection,
  makeSweep,
  paintBands,
  sandstoneBands,
  type Knot,
} from "./sandstone-arches-parts.js";

/*
 * A great wooden Archimedes screw lifts water from a pond up into a
 * stone tank, turned by a big spoked wheel through a pair of gears.
 * From the tank the water rushes down a wooden flume into a splash
 * pool, and on along little channels to water the crops. Ride up the
 * screw like the water does, and whoosh down the flume.
 */

const signColour = "#2a6f8a";
const signAt: Triple = [0.8, 0, 7.4];
const timber = "#a0703f";
const darkTimber = "#6a4628";
const iron = "#4a4a4e";
const bronze = "#b07a3a";
const pondWater = "#3a9fbe";
const marble = "#efeae0";

/* ------------------------------------------------------------------ */
/* The screw                                                           */
/* ------------------------------------------------------------------ */

const screwX = -2.4;
const screwBottom: Triple = [screwX, 0.15, 2.3];
const screwTop: Triple = [screwX, 2.55, -2.5];
const screwLength = Math.hypot(
  screwTop[1] - screwBottom[1],
  screwTop[2] - screwBottom[2],
);
/** Up the screw, one unit along it. */
const along: Triple = [
  0,
  (screwTop[1] - screwBottom[1]) / screwLength,
  (screwTop[2] - screwBottom[2]) / screwLength,
];
/** Straight out of the top of the screw, square to it. */
const outward: Triple = [0, -along[2], along[1]];
const tilt = Math.atan2(along[2], along[1]);
const casingRadius = 0.6;
const turns = 7;

const onScrew = (share: number, out: number, sideways = 0): Triple => [
  screwX + sideways,
  screwBottom[1] + along[1] * share * screwLength + outward[1] * out,
  screwBottom[2] + along[2] * share * screwLength + outward[2] * out,
];

/** The screw's flight: a broad ribbon wound round its shaft. */
const makeFlight = (steps: number): BufferGeometry => {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let step = 0; step <= steps; step++) {
    const share = step / steps;
    const angle = share * turns * Math.PI * 2;
    [0.14, casingRadius - 0.06].forEach((radius) => {
      const across = Math.cos(angle) * radius;
      const up = Math.sin(angle) * radius;
      const [x, y, z] = onScrew(share, up, across);
      positions.push(x, y, z);
    });
    if (step < steps) {
      const here = step * 2;
      indices.push(here, here + 1, here + 3, here, here + 3, here + 2);
      indices.push(here, here + 3, here + 1, here, here + 2, here + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setIndex(indices);
  return geometry;
};

const buildScrew = (builder: AttractionBuilder) => {
  /* The open wooden casing, its staves bound with iron hoops */
  builder.add(
    "matte",
    timber,
    makeSweep({
      path: listCurve(builder.isFar ? 1 : 4, (share) => onScrew(share, 0)),
      side: [1, 0, 0],
      section: listTroughSection(0.88, builder.isFar ? 5 : 10),
      size: () => [casingRadius + 0.08, casingRadius + 0.08],
      isCapped: false,
    }),
  );
  builder.add(
    "metal",
    bronze,
    new CylinderGeometry(0.1, 0.1, screwLength + 0.6, builder.segments(10, 5)),
    {
      at: onScrew(0.5, 0),
      rotation: [tilt, 0, 0],
    },
  );
  builder.add(
    "paint",
    "#c88a4a",
    makeFlight(builder.isFar ? 28 : 126),
    {},
    undefined,
  );
  if (!builder.isFar) {
    for (let hoop = 0; hoop <= 5; hoop++) {
      builder.add(
        "metal",
        iron,
        new TorusGeometry(casingRadius + 0.1, 0.035, 5, 14, Math.PI),
        {
          at: onScrew(0.05 + hoop * 0.18, 0),
          rotation: [tilt + Math.PI * 1.5, 0, 0],
        },
      );
    }
    /* Staves along the casing */
    [-0.75, -0.25, 0.25, 0.75].forEach((spread) => {
      const angle = spread * Math.PI * 0.5;
      const out = -Math.cos(angle) * (casingRadius + 0.09);
      const side = Math.sin(angle) * (casingRadius + 0.09);
      addSlab(
        builder,
        "matte",
        darkTimber,
        onScrew(0, out, side),
        onScrew(1, out, side),
        0.04,
        0.04,
      );
    });
  }
  /* Trestles holding it up */
  [0.35, 0.68].forEach((share) => {
    const [, y, z] = onScrew(share, -casingRadius - 0.08);
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        darkTimber,
        [0.14, y, 0.14],
        [screwX + side * 0.62, y / 2, z],
      );
    });
    builder.box("matte", darkTimber, [1.44, 0.14, 0.18], [screwX, y, z]);
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        addSlab(
          builder,
          "matte",
          timber,
          [screwX + side * 0.62, 0.1, z],
          [screwX - side * 0.62, y - 0.1, z],
          0.07,
          0.07,
        );
      });
    }
  });
};

/* ------------------------------------------------------------------ */
/* The tank, the wheel and its gears                                   */
/* ------------------------------------------------------------------ */

const tank = { x: screwX, z: -3.3, half: 0.9, height: 2.4 };
const wheelPivot: Triple = [screwX + 1.4, 2.15, -1.95];
const wheelRadius = 1.05;

const buildTank = (builder: AttractionBuilder) => {
  builder.painted(
    new BoxGeometry(tank.half * 2, tank.height, tank.half * 2, 2, 6, 2),
    paintBands(sandstoneBands, tank.height / 6, 0.03),
    { at: [tank.x, tank.height / 2, tank.z] },
    "matte",
    undefined,
  );
  /* The rim, and water to the brim */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      desert.paleSandstone,
      [tank.half * 2 + 0.16, 0.12, 0.16],
      [tank.x, tank.height + 0.06, tank.z + side * tank.half],
    );
    builder.box(
      "matte",
      desert.paleSandstone,
      [0.16, 0.12, tank.half * 2 + 0.16],
      [tank.x + side * tank.half, tank.height + 0.06, tank.z],
    );
  });
  builder.box(
    "water",
    pondWater,
    [tank.half * 2 - 0.1, 0.04, tank.half * 2 - 0.1],
    [tank.x, tank.height + 0.04, tank.z],
  );
  /* The screw's spout, pouring into the tank */
  builder.box(
    "water",
    pondWater,
    [0.3, 0.42, 0.12],
    [screwX, tank.height + 0.15, -2.45],
  );
  /* The gearbox: the wheel's axle meets the screw's shaft */
  builder.box(
    "matte",
    darkTimber,
    [0.7, 0.55, 0.7],
    [screwX + 0.5, 2.35, -2.25],
  );
  builder.cylinder("metal", bronze, {
    radius: 0.07,
    length: 1.2,
    at: [screwX + 0.95, wheelPivot[1], wheelPivot[2]],
    axis: "x",
    segments: 8,
  });
  builder.box(
    "matte",
    darkTimber,
    [0.18, wheelPivot[1], 0.24],
    [wheelPivot[0] + 0.35, wheelPivot[1] / 2, wheelPivot[2]],
  );
  if (!builder.isFar) {
    /* Two cog wheels, their teeth meshed at a right angle */
    builder.cylinder("metal", bronze, {
      radius: 0.3,
      length: 0.08,
      at: [screwX + 0.9, wheelPivot[1], wheelPivot[2]],
      axis: "x",
      segments: 16,
    });
    for (let tooth = 0; tooth < 10; tooth++) {
      const angle = (tooth / 10) * Math.PI * 2;
      builder.box(
        "metal",
        bronze,
        [0.1, 0.09, 0.09],
        [
          screwX + 0.9,
          wheelPivot[1] + Math.cos(angle) * 0.34,
          wheelPivot[2] + Math.sin(angle) * 0.34,
        ],
      );
    }
    builder.add("metal", bronze, new CylinderGeometry(0.28, 0.28, 0.08, 16), {
      at: onScrew(0.93, 0.05),
      rotation: [tilt, 0, 0],
    });
  }
};

const buildWheel = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    timber,
    new TorusGeometry(
      wheelRadius,
      0.07,
      builder.segments(6, 4),
      builder.segments(32, 14),
    ),
    { rotation: [0, Math.PI / 2, 0] },
  );
  builder.cylinder("metal", iron, {
    radius: 0.16,
    length: 0.3,
    at: [0, 0, 0],
    axis: "x",
    segments: 12,
  });
  const spokes = builder.isFar ? 4 : 8;
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = (spoke / spokes) * Math.PI * 2;
    builder.bar(
      "matte",
      darkTimber,
      [0, 0, 0],
      [0, Math.cos(angle) * wheelRadius, Math.sin(angle) * wheelRadius],
      0.07,
      6,
    );
    if (!builder.isFar) {
      /* Handles all round its rim, to turn it by */
      builder.cylinder("paint", "#c0402a", {
        radius: 0.035,
        length: 0.3,
        at: [
          0.14,
          Math.cos(angle + 0.39) * wheelRadius,
          Math.sin(angle + 0.39) * wheelRadius,
        ],
        axis: "x",
        segments: 6,
      });
    }
  }
};

/* ------------------------------------------------------------------ */
/* The flume, the splash pool and the fields                           */
/* ------------------------------------------------------------------ */

const flumeKnots: Knot[] = [
  { at: [screwX + 0.75, 2.3, -3.75], size: [0.42, 0.42] },
  { at: [0.2, 1.75, -3.85], size: [0.42, 0.42] },
  { at: [2.2, 1.05, -3.4], size: [0.42, 0.42] },
  { at: [3.35, 0.55, -2.2], size: [0.42, 0.42] },
  { at: [3.6, 0.32, -0.9], size: [0.42, 0.42] },
];
const pool = { x: 3.75, z: 0.35, radius: 1.05 };
const pond = { x: screwX, z: 3.0, radiusX: 1.75, radiusZ: 1.25 };

const buildFlume = (builder: AttractionBuilder) => {
  const { path, size } = listSmoothKnots(flumeKnots, builder.isFar ? 3 : 8);
  builder.add(
    "matte",
    "#b8824a",
    makeSweep({
      path,
      section: listTroughSection(0.82, builder.isFar ? 4 : 8),
      size,
      isCapped: false,
    }),
  );
  builder.add(
    "water",
    pondWater,
    makeSweep({
      path: path.map(([x, y, z]): Triple => [x, y - 0.22, z]),
      section: [
        [0, 1],
        [-0.1, 0],
        [0, -1],
      ],
      size: () => [0.4, 0.3],
      isCapped: false,
    }),
  );
  /* Posts under it */
  path.forEach(([x, y, z], index) => {
    if (index % (builder.isFar ? 3 : 4) !== 2 || y < 0.6) {
      return;
    }
    builder.box(
      "matte",
      darkTimber,
      [0.1, y - 0.4, 0.1],
      [x, (y - 0.4) / 2, z],
    );
  });
};

const buildPools = (builder: AttractionBuilder) => {
  /* The pond the screw dips into, ringed with stones */
  const ring = builder.segments(28, 14);
  builder.add(
    "matte",
    desert.dampSand,
    new CylinderGeometry(1, 1, 0.06, ring),
    {
      at: [pond.x, 0.03, pond.z],
      scale: [pond.radiusX + 0.25, 1, pond.radiusZ + 0.25],
    },
  );
  builder.add("water", pondWater, new CylinderGeometry(1, 1, 0.04, ring), {
    at: [pond.x, 0.08, pond.z],
    scale: [pond.radiusX, 1, pond.radiusZ],
  });
  const stones = builder.isFar ? 6 : 18;
  for (let stone = 0; stone < stones; stone++) {
    const angle = (stone / stones) * Math.PI * 2;
    addRock(
      builder,
      stone % 2 === 0 ? desert.paleSandstone : desert.sandstone,
      [
        pond.x + Math.cos(angle) * (pond.radiusX + 0.2),
        0.08,
        pond.z + Math.sin(angle) * (pond.radiusZ + 0.2),
      ],
      [0.2, 0.14, 0.18],
      stone * 1.3,
      0,
    );
  }
  /* The splash pool at the flume's foot, with a stone kerb */
  builder.cylinder("matte", desert.paleSandstone, {
    radius: pool.radius + 0.18,
    length: 0.26,
    at: [pool.x, 0.13, pool.z],
    segments: 24,
  });
  builder.cylinder("water", pondWater, {
    radius: pool.radius,
    length: 0.04,
    at: [pool.x, 0.25, pool.z],
    segments: 24,
  });
  /* A rill on to the crops */
  addSlab(
    builder,
    "matte",
    desert.paleSandstone,
    [pool.x + 0.4, 0.04, pool.z + 1.0],
    [4.4, 0.04, 5.6],
    0.4,
    0.08,
  );
  addSlab(
    builder,
    "water",
    pondWater,
    [pool.x + 0.4, 0.09, pool.z + 1.0],
    [4.4, 0.09, 5.6],
    0.22,
    0.02,
  );
};

const buildFields = (builder: AttractionBuilder) => {
  [1.6, 3.0, 5.6, 7.0].forEach((x, bed) => {
    builder.box(
      "matte",
      "#7a5a3a",
      [1.1, 0.12, 3.2],
      [x - 0.2, 0.06, 3.9 + (bed % 2) * 0.2],
    );
    if (builder.isFar) {
      builder.box(
        "matte",
        "#6a9a3a",
        [0.9, 0.18, 3.0],
        [x - 0.2, 0.18, 3.9 + (bed % 2) * 0.2],
      );
      return;
    }
    for (let plant = 0; plant < 6; plant++) {
      [-0.25, 0.25].forEach((side) => {
        builder.sphere(
          "matte",
          bed % 2 === 0 ? "#6a9a3a" : "#8aae3e",
          0.15,
          [x - 0.2 + side, 0.2, 2.6 + plant * 0.52 + (bed % 2) * 0.2],
          [1, 0.8, 1],
          5,
        );
      });
    }
  });
};

/* ------------------------------------------------------------------ */
/* Grounds                                                             */
/* ------------------------------------------------------------------ */

const bustAt = { x: 5.4, z: -3.6 };

const buildGrounds = (builder: AttractionBuilder) => {
  /* A paved path from the sign */
  addSlab(
    builder,
    "matte",
    desert.paleSand,
    [0.8, 0.02, 7.6],
    [0.4, 0.02, 0.6],
    1.4,
    0.03,
  );
  addSlab(
    builder,
    "matte",
    desert.paleSand,
    [0.4, 0.02, 0.6],
    [-0.8, 0.02, -1.2],
    1.2,
    0.03,
  );
  /* A marble bust of Archimedes on a plinth */
  builder.box("matte", marble, [0.7, 0.9, 0.7], [bustAt.x, 0.45, bustAt.z]);
  builder.box(
    "matte",
    shade(marble, 0.92),
    [0.86, 0.12, 0.86],
    [bustAt.x, 0.06, bustAt.z],
  );
  builder.box(
    "matte",
    shade(marble, 0.92),
    [0.8, 0.08, 0.8],
    [bustAt.x, 0.94, bustAt.z],
  );
  builder.sphere(
    "matte",
    marble,
    0.3,
    [bustAt.x, 1.2, bustAt.z],
    [1.2, 0.7, 0.8],
    12,
  );
  builder.sphere(
    "matte",
    marble,
    0.22,
    [bustAt.x, 1.55, bustAt.z],
    [0.9, 1.1, 0.95],
    12,
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      shade(marble, 0.95),
      0.17,
      [bustAt.x, 1.42, bustAt.z + 0.08],
      [1.1, 1, 0.9],
      10,
    );
    builder.box(
      "paint",
      bronze,
      [0.4, 0.12, 0.02],
      [bustAt.x, 0.6, bustAt.z + 0.36],
    );
  }
  addPalm(builder, [-6.2, 0, -2.4], 3.4, [0.1, 0.08], 0.4);
  addPalm(builder, [-5.6, 0, 5.2], 3.0, [0.12, -0.08], 1.3);
  addPalm(builder, [6.6, 0, -0.8], 3.2, [-0.1, 0.05], 2.1);
  addBench(builder, [-0.3, 0, 4.0], Math.PI / 2, desert.timber);
  addPot(builder, [-5.0, 0, -4.4], 0.6, desert.terracotta, true);
  addPot(builder, [-4.4, 0, -4.9], 0.45, desert.paleTerracotta);
  addPot(builder, [1.4, 0, -1.6], 0.5, desert.terracotta);
  addBandedRock(builder, [-6.4, 0.4, 1.6], [0.8, 0.6, 0.7], 3.1);
  addBandedRock(builder, [2.6, 0.35, -6.4], [0.9, 0.5, 0.6], 5.2);
  [
    [-3.8, -6.0, 0.4],
    [6.8, 3.2, 0.35],
    [-7.2, -0.4, 0.38],
    [4.4, -6.2, 0.42],
    [-1.6, 6.6, 0.3],
  ].forEach(([x, z, size], index) => {
    addScrub(
      builder,
      [x, 0, z],
      size,
      index % 2 === 0 ? desert.scrub : "#93a052",
    );
  });
  addSignBoard(builder, signAt, signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts and wanderers                                          */
/* ------------------------------------------------------------------ */

const buildSplash = (builder: AttractionBuilder) => {
  builder.add(
    "water",
    "#a8e0f0",
    new ConeGeometry(0.32, 1.1, builder.segments(12, 6), 1, true),
    { at: [0, 0.55, 0], rotation: [Math.PI, 0, 0] },
  );
  builder.cylinder("water", "#c8f0ff", {
    radius: 0.06,
    radiusEnd: 0.02,
    length: 1.2,
    at: [0, 0.6, 0],
    segments: 8,
  });
  [0, 1, 2, 3, 4].forEach((drop) => {
    const angle = (drop / 5) * Math.PI * 2;
    builder.sphere(
      "water",
      "#c8f0ff",
      0.06,
      [Math.cos(angle) * 0.4, 0.9 + (drop % 2) * 0.2, Math.sin(angle) * 0.4],
      [1, 1, 1],
      6,
    );
  });
};

const buildDuck = (builder: AttractionBuilder) => {
  builder.sphere("matte", palette.white, 0.15, [0, 0.1, 0], [0.8, 0.6, 1.2], 8);
  builder.sphere("matte", palette.white, 0.08, [0, 0.25, 0.14], [1, 1, 1], 8);
  builder.add(
    "matte",
    "#e8a030",
    new BoxGeometry(0.05, 0.03, 0.1),
    { at: [0, 0.24, 0.24] },
    undefined,
  );
};

const rideStart = { x: -0.7, z: 1.4 };
const rideFinish = { x: 2.3, z: 1.2 };

const flumeRidePath = (() => {
  const { path } = listSmoothKnots(flumeKnots, 6);
  return path.map(([x, y, z]): Triple => [x, y - 0.3, z]);
})();

const screwRidePath: Triple[] = [
  [rideStart.x, 0, rideStart.z],
  onScrew(0.2, casingRadius + 0.12, 0),
  onScrew(0.98, casingRadius + 0.12, 0),
  [screwX + 0.6, tank.height + 0.2, -3.6],
];

const screwRide = (progress: number): LocalSpot => {
  if (progress < 0.6) {
    /* Carried up the screw slowly, like the water */
    return followPath(screwRidePath, progress / 0.6);
  }
  if (progress < 0.9) {
    /* Whoosh down the flume, faster and faster */
    const share = ((progress - 0.6) / 0.3) ** 1.5;
    return followPath(flumeRidePath, share);
  }
  const share = (progress - 0.9) / 0.1;
  const [x, y, z] = flumeRidePath[flumeRidePath.length - 1];
  return {
    x: x + (rideFinish.x - x) * share,
    y: y * (1 - share) + Math.sin(share * Math.PI) * 0.5,
    z: z + (rideFinish.z - z) * share,
    heading: Math.atan2(rideFinish.x - x, rideFinish.z - z),
  };
};

const pondBlockers: LocalBlocker[] = listWallBlockers(
  { x: pond.x - pond.radiusX + pond.radiusZ, z: pond.z },
  { x: pond.x + pond.radiusX - pond.radiusZ, z: pond.z },
  pond.radiusZ + 0.2,
  0.4,
);

export const archimedesScrewModel: NewLandAttractionModel = {
  kind: "archimedes-screw",
  islandId: "sunscorch-sands",
  name: "Archimedes Screw",
  fact: "An Archimedes screw is a giant screw inside a tube. As it turns, each twist scoops up a little water and carries it up the slope, so water can be lifted from a river to the fields above. It is named after Archimedes, a Greek inventor who lived over 2,200 years ago, and screws like it are still used today.",
  curriculumLink:
    "Design and technology, Key Stage 2: mechanical systems. How screws, gears and wheels turn and lift things.",
  footprint: 9,
  setting: "inland",
  padColour: desert.sand,
  signSpot: { x: signAt[0], z: signAt[2] + 0.9 },
  build: (builder) => {
    buildPools(builder);
    buildScrew(builder);
    buildTank(builder);
    buildFlume(builder);
    buildFields(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "wheel",
      pivot: wheelPivot,
      build: buildWheel,
      motion: { kind: "whirl", axis: "x", idle: 0.25, speed: 1.6, reach: 6 },
    },
    {
      name: "splash",
      pivot: [pool.x - 0.1, 0.26, pool.z - 0.4],
      build: buildSplash,
      motion: { kind: "splash", reach: 6, period: 1.4 },
    },
  ],
  wanderers: [
    {
      name: "ducks",
      build: buildDuck,
      count: 3,
      centre: { x: pond.x, z: pond.z },
      radius: 0.8,
      speed: 0.2,
      height: 0.06,
    },
    {
      name: "farmers",
      build: buildPerson({
        skin: "#d8a47a",
        top: palette.white,
        bottom: "#6a5a40",
        hair: "#2a1a10",
        hat: "#e0c890",
      }),
      count: 2,
      centre: { x: 1.8, z: 5.4 },
      radius: 1.4,
      speed: 0.25,
    },
  ],
  blockers: [
    ...pondBlockers,
    { x: pool.x, z: pool.z, radius: pool.radius + 0.15 },
    { x: tank.x, z: tank.z, radius: 1.2 },
    { x: bustAt.x, z: bustAt.z, radius: 0.55 },
  ],
  rides: [
    {
      id: "screw",
      name: "the Archimedes screw and the flume",
      start: rideStart,
      reach: 0.6,
      seconds: 15,
      finish: rideFinish,
      follow: screwRide,
    },
  ],
  play: {
    label: "Turn the great wheel",
    news: "Creak, creak, gurgle! The wheel turned the screw, and each twist carried a scoop of water up the slope and splashed it into the tank.",
  },
};
