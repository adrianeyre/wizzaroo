import { CylinderGeometry, TorusGeometry } from "three";
import {
  palette,
  shade,
  type AttractionBuilder,
  type Triple,
} from "../attractions/attraction-kit.js";

/* The Mine Cart Ride's moving things: the trains, the winding wheel, the miner mole's cage, the bell and the pit ponies. */

export const engineRed = "#b8402a";
export const bronze = "#b5793a";
export const ironBlack = "#2b2a2a";
export const lava = "#ff6a1f";
export const lavaCore = "#ffc04a";
const brass = "#d4a64a";
const tubIron = "#5a5450";
const helmetYellow = "#f0b429";
const moleBrown = "#6b4f3a";

/** How far round the track behind the engine each wagon is coupled, in units along the rail. */
export const firstWagonBehind = 1.3;
const secondWagonBehind = 2.5;
/** The seat in the first wagon, above the rails. */
export const wagonSeatHeight = 0.42;

/** Where a unit coupled `behind` the engine sits on a circle of `radius`, and its turn. */
export const findCoupledSpot = (
  radius: number,
  behind: number,
): { at: Triple; turn: number } => {
  const angle = behind / radius;
  return {
    at: [-radius + radius * Math.cos(angle), 0, radius * Math.sin(angle)],
    turn: -angle,
  };
};

/** Places a point given in a unit's own frame (front towards -z). */
const placeIn =
  (at: Triple, turn: number) =>
  (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];

const addWheels = (
  builder: AttractionBuilder,
  place: (x: number, y: number, z: number) => Triple,
  turn: number,
) => {
  if (builder.isFar) {
    return;
  }
  [-0.3, 0.3].forEach((z) => {
    [-1, 1].forEach((side) => {
      builder.add(
        "metal",
        ironBlack,
        new CylinderGeometry(0.15, 0.15, 0.06, builder.isFar ? 6 : 10),
        {
          at: place(side * 0.3, 0.15, z),
          rotation: [0, turn, Math.PI / 2],
        },
      );
    });
  });
};

const buildEngine = (builder: AttractionBuilder) => {
  const place = placeIn([0, 0, 0], 0);
  addWheels(builder, place, 0);
  builder.box("metal", ironBlack, [0.64, 0.12, 1.05], [0, 0.3, 0]);
  builder.cylinder("paint", engineRed, {
    radius: 0.24,
    length: 0.62,
    at: [0, 0.6, -0.12],
    axis: "z",
    segments: 14,
  });
  builder.cylinder("paint", ironBlack, {
    radius: 0.25,
    length: 0.1,
    at: [0, 0.6, -0.46],
    axis: "z",
    segments: 14,
  });
  builder.lathe(
    "metal",
    bronze,
    [
      [0.001, 0],
      [0.08, 0],
      [0.07, 0.22],
      [0.12, 0.3],
      [0.1, 0.33],
      [0.001, 0.3],
    ],
    [0, 0.8, -0.36],
    "y",
    10,
  );
  /* The cab, with its roof and round windows */
  builder.box("paint", engineRed, [0.62, 0.52, 0.42], [0, 0.62, 0.32]);
  builder.box("paint", ironBlack, [0.74, 0.05, 0.56], [0, 0.92, 0.32]);
  builder.box("paint", shade(engineRed, 0.8), [0.68, 0.1, 1.12], [0, 0.4, 0]);
  if (builder.isFar) {
    return;
  }
  builder.sphere("metal", brass, 0.1, [0, 0.83, -0.05], [1, 0.7, 1], 8);
  [-1, 1].forEach((side) => {
    builder.cylinder("glass", palette.black, {
      radius: 0.08,
      length: 0.02,
      at: [side * 0.315, 0.7, 0.32],
      axis: "x",
      segments: 10,
    });
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.045,
      length: 0.08,
      at: [side * 0.22, 0.4, -0.6],
      axis: "z",
      segments: 6,
    });
  });
  [-0.3, 0.05].forEach((z) => {
    builder.cylinder("metal", brass, {
      radius: 0.248,
      length: 0.03,
      at: [0, 0.6, z],
      axis: "z",
      segments: 14,
      isOpen: true,
    });
  });
  /* Headlamp, cowcatcher and the driver in the cab */
  builder.box("glow", palette.warmLight, [0.12, 0.1, 0.04], [0, 0.72, -0.52]);
  builder.box("metal", ironBlack, [0.16, 0.14, 0.06], [0, 0.72, -0.5]);
  builder.box(
    "paint",
    bronze,
    [0.62, 0.14, 0.08],
    [0, 0.26, -0.58],
    [0.6, 0, 0],
  );
  builder.sphere("matte", "#e7b48f", 0.09, [0, 1.0, 0.32], [1, 1, 1], 7);
  builder.sphere("paint", helmetYellow, 0.1, [0, 1.06, 0.32], [1, 0.6, 1], 7);
  builder.box("glow", palette.warmLight, [0.05, 0.04, 0.03], [0, 1.08, 0.22]);
};

const buildWagon = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  isOreWagon: boolean,
) => {
  const place = placeIn(at, turn);
  addWheels(builder, place, turn);
  builder.box("metal", ironBlack, [0.56, 0.1, 0.9], place(0, 0.28, 0), [
    0,
    turn,
    0,
  ]);
  builder.painted(
    new CylinderGeometry(0.52, 0.42, 0.42, 4),
    (centre, normal) =>
      normal.y > 0.9
        ? isOreWagon
          ? "#3a302a"
          : "#7a3b2a"
        : isOreWagon
          ? tubIron
          : bronze,
    {
      at: place(0, 0.55, 0),
      rotation: [0, turn + Math.PI / 4, 0],
      scale: [1, 1, 1],
    },
    "metal",
    undefined,
  );
  if (builder.isFar) {
    return;
  }
  /* A rolled iron rim, a coupling and ore or a cushion */
  builder.box("metal", ironBlack, [0.76, 0.05, 0.05], place(0, 0.76, -0.37), [
    0,
    turn,
    0,
  ]);
  builder.box("metal", ironBlack, [0.76, 0.05, 0.05], place(0, 0.76, 0.37), [
    0,
    turn,
    0,
  ]);
  builder.bar(
    "metal",
    ironBlack,
    place(0, 0.3, -0.45),
    place(0, 0.3, -0.62),
    0.04,
    4,
  );
  if (isOreWagon) {
    [
      [-0.15, -0.12, 0.1],
      [0.14, 0.1, 0.09],
      [0.05, -0.18, 0.08],
      [-0.12, 0.16, 0.07],
    ].forEach(([x, z, size], index) => {
      builder.sphere(
        index % 2 === 0 ? "glow" : "matte",
        index % 2 === 0 ? lava : "#4a3f39",
        size,
        place(x, 0.78, z),
        [1, 0.8, 1],
        6,
      );
    });
  } else {
    builder.box("paint", "#c9a24a", [0.5, 0.05, 0.12], place(0, 0.8, 0.3), [
      0,
      turn,
      0,
    ]);
  }
};

/** A little steam engine and two wagons, round the track behind it (front towards -z). */
export const buildMineTrain =
  (radius: number) => (builder: AttractionBuilder) => {
    buildEngine(builder);
    const first = findCoupledSpot(radius, firstWagonBehind);
    const second = findCoupledSpot(radius, secondWagonBehind);
    buildWagon(builder, first.at, first.turn, false);
    buildWagon(builder, second.at, second.turn, true);
  };

/* The winding wheel, which turns in the plane facing +z */

export const buildWindingWheel = (builder: AttractionBuilder) => {
  builder.add(
    "metal",
    engineRed,
    new TorusGeometry(0.7, 0.05, 4, builder.segments(20, 10)),
  );
  builder.add(
    "metal",
    ironBlack,
    new TorusGeometry(0.62, 0.025, 3, builder.segments(20, 10)),
  );
  builder.cylinder("metal", bronze, {
    radius: 0.1,
    length: 0.18,
    at: [0, 0, 0],
    axis: "z",
    segments: 10,
  });
  const spokes = builder.isFar ? 4 : 8;
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = (spoke / spokes) * Math.PI * 2;
    builder.bar(
      "metal",
      engineRed,
      [Math.cos(angle) * 0.08, Math.sin(angle) * 0.08, 0],
      [Math.cos(angle) * 0.68, Math.sin(angle) * 0.68, 0],
      0.04,
      4,
    );
  }
};

/* The miner mole's cage, which comes up the shaft (its floor at y = 0) */

export const buildMoleCage = (builder: AttractionBuilder) => {
  [-1, 1].forEach((x) => {
    [-1, 1].forEach((z) => {
      builder.box(
        "metal",
        ironBlack,
        [0.05, 1.0, 0.05],
        [x * 0.38, 0.5, z * 0.38],
      );
    });
  });
  builder.box("metal", tubIron, [0.82, 0.05, 0.82], [0, 0.025, 0]);
  builder.box("metal", tubIron, [0.82, 0.05, 0.82], [0, 1.0, 0]);
  builder.bar("metal", ironBlack, [0, 1.0, 0], [0, 1.45, 0], 0.02, 4);
  if (!builder.isFar) {
    [-1, 1].forEach((x) => {
      [0.25, 0.55].forEach((y) => {
        builder.box("metal", ironBlack, [0.03, 0.03, 0.78], [x * 0.38, y, 0]);
      });
    });
    builder.box("metal", ironBlack, [0.78, 0.03, 0.03], [0, 0.55, -0.38]);
  }
  /* The mole in its helmet, waving */
  builder.sphere(
    "matte",
    moleBrown,
    0.22,
    [0, 0.3, 0],
    [1, 1.2, 0.95],
    builder.isFar ? 6 : 10,
  );
  builder.sphere(
    "matte",
    shade(moleBrown, 1.2),
    0.14,
    [0, 0.27, 0.12],
    [1, 1.1, 0.6],
    8,
  );
  builder.sphere(
    "paint",
    helmetYellow,
    0.17,
    [0, 0.5, 0],
    [1, 0.62, 1],
    builder.isFar ? 6 : 10,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere("paint", "#f29aa8", 0.05, [0, 0.38, 0.22], [1, 0.8, 1], 6);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [side * 0.07, 0.44, 0.17],
      [1, 1, 1],
      6,
    );
  });
  builder.cylinder("glow", palette.warmLight, {
    radius: 0.045,
    length: 0.05,
    at: [0, 0.56, 0.16],
    axis: "z",
    segments: 8,
  });
  builder.bar(
    "matte",
    moleBrown,
    [0.17, 0.35, 0.05],
    [0.3, 0.62, 0.1],
    0.08,
    6,
  );
  builder.sphere("matte", "#f0c9b8", 0.06, [0.31, 0.66, 0.1], [1, 1, 1], 6);
  builder.bar(
    "matte",
    moleBrown,
    [-0.17, 0.32, 0.05],
    [-0.22, 0.18, 0.18],
    0.08,
    6,
  );
  /* A pickaxe over its shoulder */
  builder.bar(
    "matte",
    palette.paleTimber,
    [-0.24, 0.17, 0.2],
    [-0.2, 0.62, -0.1],
    0.03,
    4,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [-0.32, 0.62, -0.05],
    [-0.08, 0.62, -0.15],
    0.035,
    4,
  );
};

/* The station bell, hanging below its pivot */

export const buildStationBell = (builder: AttractionBuilder) => {
  builder.bar("metal", ironBlack, [0, 0, 0], [0, -0.12, 0], 0.03, 4);
  builder.lathe(
    "metal",
    brass,
    [
      [0.001, -0.1],
      [0.07, -0.1],
      [0.09, -0.18],
      [0.11, -0.28],
      [0.15, -0.34],
      [0.14, -0.35],
      [0.001, -0.3],
    ],
    [0, 0, 0],
    "y",
    12,
  );
  builder.sphere("metal", ironBlack, 0.03, [0, -0.35, 0], [1, 1, 1], 6);
};

/* Pit ponies */

export const buildPitPony = (builder: AttractionBuilder) => {
  const coat = "#5b3b27";
  builder.sphere(
    "matte",
    coat,
    0.24,
    [0, 0.55, 0],
    [0.75, 0.75, 1.3],
    builder.isFar ? 6 : 10,
  );
  builder.bar("matte", coat, [0, 0.62, 0.22], [0, 0.85, 0.38], 0.14, 6);
  builder.box("matte", coat, [0.14, 0.14, 0.3], [0, 0.88, 0.45], [0.5, 0, 0]);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    [-0.18, 0.2].forEach((z) => {
      builder.bar(
        "matte",
        shade(coat, 0.85),
        [side * 0.1, 0.45, z],
        [side * 0.1, 0.02, z],
        0.06,
        5,
      );
      builder.box(
        "matte",
        palette.white,
        [0.07, 0.06, 0.08],
        [side * 0.1, 0.04, z + 0.01],
      );
    });
    builder.box("matte", coat, [0.03, 0.08, 0.04], [side * 0.05, 1.0, 0.38]);
  });
  builder.box(
    "matte",
    "#e8dcc4",
    [0.05, 0.16, 0.26],
    [0, 0.88, 0.26],
    [0.5, 0, 0],
  );
  builder.bar("matte", "#2a1d14", [0, 0.6, -0.28], [0, 0.32, -0.38], 0.07, 5);
  builder.box("matte", "#e8dcc4", [0.13, 0.08, 0.06], [0, 0.82, 0.6]);
};
