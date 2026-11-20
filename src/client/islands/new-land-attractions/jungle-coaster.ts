import {
  addBench,
  addGableRoof,
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addCourseTrack,
  addLoopTrack,
  addSupports,
  findLapPoint,
  listLap,
  loopCentre,
  loopRadius,
  railGauge,
} from "./jungle-coaster-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const railSteel = "#c9ced3";
const spineGreen = "#2f7a3a";
const tieBrown = "#5e4630";
const postGreen = "#3f6a2c";
const concrete = "#a8a294";
const carOrange = "#f08a1c";
const carSpots = "#3a2616";
const carCream = "#f6e7c4";
const seatRed = "#b8322a";
const thatch = "#b38c4c";
const plank = "#a8774a";
const plankDark = "#7d5534";
const rock = "#8a857a";
const rockDark = "#6a665d";
const leafDeep = "#1f6428";
const leafMid = "#2f8a35";
const leafBright = "#5bb544";
const pool = "#4aa3b0";
const signColour = "#c8462f";

/* The station, on the straight at the front */
const stationZ = 5.4;
const stationTrackTop = 0.45;
const platform = { minX: -2.0, maxX: 2.6, minZ: 5.9, maxZ: 6.9 };
const platformTop = 0.3;
const stationTrain: Triple = [0.35, stationTrackTop, stationZ];
const rideStart = { x: 0.2, z: 7.6 };
const rideFinish = { x: 2.4, z: 7.7 };

const splashAt: Triple = [2.4, 0.02, -6.65];
const archAt = { x: -7.3, z: -1.3 };
const signAt = { x: -2.9, z: 10.0 };

/* -------------------------------------------------------------- */
/* The cars                                                         */
/* -------------------------------------------------------------- */

interface CarFrame {
  /** A point on the car, given along it (+x forward), up and across. */
  at: (along: number, up: number, across: number) => Triple;
  turn: Triple;
}

/** A car on the straight, facing +x. */
const straightFrame = (origin: Triple): CarFrame => ({
  at: (along, up, across) => [
    origin[0] + along,
    origin[1] + up,
    origin[2] + across,
  ],
  turn: [0, 0, 0],
});

/**
 * A car in the loop, `angle` round from the bottom, facing -x there and
 * standing on the inside of the circle.
 */
const loopFrame = (angle: number): CarFrame => {
  const radius = loopRadius - 0.05;
  const originX = Math.sin(angle) * radius;
  const originY = -Math.cos(angle) * radius;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    at: (along, up, across) => {
      const x = -along;
      const z = -across;
      return [originX + x * cos - up * sin, originY + x * sin + up * cos, z];
    },
    turn: [0, Math.PI, -angle],
  };
};

/** One car: a bright jaguar-spotted tub with two seats; the first has a face. */
const addCar = (
  builder: AttractionBuilder,
  { at, turn }: CarFrame,
  isLead: boolean,
) => {
  builder.box("paint", carOrange, [0.82, 0.32, 0.62], at(0, 0.32, 0), turn);
  builder.box(
    "metal",
    palette.darkSteel,
    [0.7, 0.1, 0.5],
    at(0, 0.12, 0),
    turn,
  );
  builder.box("paint", carCream, [0.84, 0.06, 0.64], at(0, 0.5, 0), turn);
  if (builder.isFar) {
    return;
  }
  /* Two red seats, each with a lap bar */
  [-0.17, 0.2].forEach((along) => {
    builder.box(
      "paint",
      seatRed,
      [0.08, 0.3, 0.52],
      at(along - 0.12, 0.62, 0),
      turn,
    );
    builder.bar(
      "metal",
      palette.steel,
      at(along + 0.08, 0.68, -0.26),
      at(along + 0.08, 0.68, 0.26),
      0.04,
      5,
    );
  });
  /* Wheels on the rails */
  [-0.28, 0.28].forEach((along) => {
    [-1, 1].forEach((side) => {
      builder.box(
        "metal",
        palette.black,
        [0.16, 0.16, 0.05],
        at(along, 0.06, side * railGauge),
        turn,
      );
    });
  });
  /* Jaguar spots down each side */
  [-1, 1].forEach((side) => {
    for (let spot = 0; spot < 3; spot++) {
      builder.box(
        "paint",
        carSpots,
        [0.1, 0.08, 0.02],
        at(-0.25 + spot * 0.24, 0.3 + (spot % 2) * 0.06, side * 0.32),
        turn,
      );
    }
  });
  if (!isLead) {
    return;
  }
  /* The front: a jaguar's face with ears and big eyes */
  builder.box("paint", carOrange, [0.16, 0.4, 0.56], at(0.48, 0.38, 0), turn);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      carOrange,
      [0.08, 0.12, 0.12],
      at(0.48, 0.64, side * 0.2),
      turn,
    );
    builder.box(
      "paint",
      palette.white,
      [0.03, 0.1, 0.1],
      at(0.57, 0.46, side * 0.13),
      turn,
    );
    builder.box(
      "paint",
      palette.black,
      [0.03, 0.05, 0.05],
      at(0.585, 0.46, side * 0.13),
      turn,
    );
  });
  builder.box("paint", carSpots, [0.03, 0.06, 0.12], at(0.57, 0.33, 0), turn);
  builder.box("paint", carCream, [0.03, 0.08, 0.3], at(0.57, 0.24, 0), turn);
};

const carLength = 0.95;

const buildStationTrain = (builder: AttractionBuilder) => {
  [1, 0, -1].forEach((index) => {
    addCar(builder, straightFrame([index * carLength, 0, 0]), index === 1);
  });
  if (!builder.isFar) {
    [0.5, -0.5].forEach((along) => {
      builder.box(
        "metal",
        palette.darkSteel,
        [0.14, 0.05, 0.05],
        [along * carLength, 0.18, 0],
      );
    });
  }
};

const buildLoopTrain = (builder: AttractionBuilder) => {
  const step = carLength / (loopRadius - 0.05);
  [-1, 0, 1].forEach((index) => {
    addCar(builder, loopFrame(index * step), index === -1);
  });
};

/* -------------------------------------------------------------- */
/* The station                                                       */
/* -------------------------------------------------------------- */

const buildStation = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = platform;
  const middleX = (minX + maxX) / 2;
  builder.box(
    "matte",
    concrete,
    [maxX - minX + 0.8, 0.06, 1.0],
    [middleX, 0.03, stationZ],
  );
  const boards = builder.isFar ? 1 : 12;
  for (let board = 0; board < boards; board++) {
    const width = (maxX - minX) / boards;
    builder.box(
      "matte",
      board % 2 === 0 ? plank : shade(plank, 0.92),
      [width - 0.02, platformTop, maxZ - minZ],
      [minX + width * (board + 0.5), platformTop / 2, (minZ + maxZ) / 2],
    );
  }
  builder.box(
    "paint",
    "#f2c12e",
    [maxX - minX, 0.02, 0.1],
    [middleX, platformTop + 0.01, minZ + 0.06],
  );
  /* Posts, and a big thatched roof over the track and the platform */
  const roofTop = 2.7;
  [minX - 0.1, maxX + 0.1].forEach((x) => {
    [stationZ - 0.75, maxZ - 0.1].forEach((z) => {
      builder.cylinder("matte", plankDark, {
        radius: 0.1,
        length: roofTop,
        at: [x, roofTop / 2, z],
        segments: builder.isFar ? 4 : 8,
      });
    });
  });
  builder.cylinder("matte", plankDark, {
    radius: 0.1,
    length: roofTop,
    at: [middleX, roofTop / 2, stationZ - 0.75],
    segments: builder.isFar ? 4 : 8,
  });
  addGableRoof(builder, {
    width: maxX - minX + 0.6,
    depth: maxZ - stationZ + 1.0,
    rise: 1.0,
    at: [middleX, roofTop, (stationZ - 0.85 + maxZ) / 2],
    colour: thatch,
    overhang: 0.35,
    thickness: 0.16,
  });
  /* The name board across the front */
  builder.box(
    "paint",
    signColour,
    [3.2, 0.42, 0.06],
    [middleX, roofTop + 0.15, maxZ + 0.3],
  );
  if (builder.isFar) {
    return;
  }
  for (let letter = 0; letter < 12; letter++) {
    builder.box(
      "paint",
      carCream,
      [0.16, 0.2, 0.02],
      [middleX - 1.32 + letter * 0.24, roofTop + 0.15, maxZ + 0.34],
    );
  }
  /* A carved jaguar head over the board */
  builder.sphere(
    "paint",
    carOrange,
    0.3,
    [middleX, roofTop + 0.62, maxZ + 0.28],
    [1.1, 0.9, 0.5],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      carOrange,
      0.09,
      [middleX + side * 0.24, roofTop + 0.86, maxZ + 0.26],
      [1, 1, 0.5],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.04,
      [middleX + side * 0.1, roofTop + 0.68, maxZ + 0.42],
      [1, 1, 0.5],
      5,
    );
  });
  builder.sphere(
    "paint",
    carSpots,
    0.05,
    [middleX, roofTop + 0.56, maxZ + 0.42],
    [1.3, 0.8, 0.5],
    5,
  );
  /* Gates along the platform edge, open where the cars wait */
  [minX + 0.2, maxX - 0.2].forEach((x) => {
    builder.cylinder("metal", palette.steel, {
      radius: 0.03,
      length: 0.8,
      at: [x, platformTop + 0.4, minZ + 0.1],
      segments: 6,
    });
  });
  /* A control booth with a big red button */
  builder.box(
    "paint",
    spineGreen,
    [0.6, 1.0, 0.5],
    [maxX - 0.4, platformTop + 0.5, maxZ - 0.35],
  );
  builder.box(
    "glass",
    palette.glass,
    [0.5, 0.35, 0.03],
    [maxX - 0.4, platformTop + 0.82, maxZ - 0.59],
  );
  builder.cylinder("paint", seatRed, {
    radius: 0.07,
    length: 0.05,
    at: [maxX - 0.4, platformTop + 1.03, maxZ - 0.45],
    segments: 10,
  });
  /* A height check: a monkey holding his hand out at the right height */
  builder.cylinder("paint", carCream, {
    radius: 0.05,
    length: 1.1,
    at: [minX - 0.5, 0.55, maxZ + 0.6],
    segments: 6,
  });
  builder.box(
    "paint",
    carOrange,
    [0.3, 0.06, 0.06],
    [minX - 0.35, 1.0, maxZ + 0.6],
  );
  builder.sphere(
    "matte",
    "#7a5232",
    0.14,
    [minX - 0.5, 1.2, maxZ + 0.6],
    [1, 1, 0.9],
    8,
  );
  builder.sphere(
    "matte",
    "#e6bf94",
    0.09,
    [minX - 0.5, 1.18, maxZ + 0.7],
    [1, 0.9, 0.6],
    6,
  );
  addBench(builder, [maxX + 1.4, 0, maxZ + 0.3], -Math.PI / 2, plank);
};

/* -------------------------------------------------------------- */
/* Scenery                                                          */
/* -------------------------------------------------------------- */

const addPalm = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  height: number,
  lean: number,
) => {
  const rings = builder.isFar ? 2 : 4;
  for (let ring = 0; ring < rings; ring++) {
    const from = ring / rings;
    const to = (ring + 1) / rings;
    builder.bar(
      "matte",
      ring % 2 === 0 ? "#8a6d4a" : "#7a5f40",
      [x + lean * from * from, height * from, z],
      [x + lean * to * to, height * to, z],
      0.2 - ring * 0.02,
      builder.isFar ? 4 : 7,
    );
  }
  const fronds = builder.isFar ? 4 : 7;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2;
    builder.box(
      "matte",
      frond % 2 === 0 ? leafMid : leafBright,
      [0.32, 0.03, 1.5],
      [
        x + lean + Math.sin(angle) * 0.7,
        height - 0.25,
        z + Math.cos(angle) * 0.7,
      ],
      [0.42, angle, 0],
    );
  }
};

const addLeafyTree = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  height: number,
) => {
  builder.cylinder("matte", "#5a3d26", {
    radius: 0.28,
    radiusEnd: 0.16,
    length: height,
    at: [x, height / 2, z],
    segments: builder.isFar ? 5 : 9,
  });
  builder.sphere(
    "matte",
    leafDeep,
    1.6,
    [x, height + 0.5, z],
    [1.1, 0.7, 1.1],
    builder.isFar ? 7 : 11,
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      leafMid,
      1.0,
      [x + 1.0, height, z + 0.4],
      [1, 0.7, 1],
      9,
    );
    builder.sphere(
      "matte",
      leafBright,
      0.9,
      [x - 0.9, height + 0.1, z - 0.4],
      [1, 0.7, 1],
      9,
    );
  }
};

const buildScenery = (builder: AttractionBuilder) => {
  /* A path to the station, and a splash pool under the first drop */
  builder.box("matte", "#b89a6c", [2.6, 0.03, 4.0], [0.3, 0.02, 9.2]);
  builder.box(
    "matte",
    rockDark,
    [3.0, 0.1, 2.2],
    [splashAt[0], 0.05, splashAt[2]],
  );
  builder.box("water", pool, [2.7, 0.06, 1.9], [splashAt[0], 0.1, splashAt[2]]);
  /* A rocky arch the track dives through, hung with vines */
  const { x, z } = archAt;
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      side < 0 ? rock : rockDark,
      0.7,
      [x + side * 1.05, 0.9, z],
      [0.8, 1.6, 1.0],
      builder.isFar ? 6 : 10,
    );
  });
  builder.sphere(
    "matte",
    rock,
    0.65,
    [x, 3.0, z],
    [2.4, 0.55, 1.0],
    builder.isFar ? 6 : 10,
  );
  addLeafyTree(builder, 0.2, -1.4, 3.6);
  addPalm(builder, -9.2, 3.6, 4.2, 0.5);
  addPalm(builder, 9.0, 1.8, 4.0, -0.5);
  addPalm(builder, 8.4, -5.2, 3.8, -0.4);
  addPalm(builder, -3.6, -8.6, 4.0, 0.3);
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    leafMid,
    0.5,
    [x - 0.4, 2.7, z + 0.6],
    [1.6, 0.4, 0.8],
    8,
  );
  [-0.6, 0, 0.6].forEach((dx, index) => {
    builder.bar(
      "matte",
      "#3f5e22",
      [x + dx, 2.8, z + 0.55],
      [x + dx + 0.1, 1.9 + index * 0.2, z + 0.6],
      0.04,
      4,
    );
  });
  /* Rocks round the pool, and ferns and flowers about the course */
  for (let stone = 0; stone < 8; stone++) {
    builder.sphere(
      "matte",
      stone % 2 === 0 ? rock : rockDark,
      0.2 + (stone % 3) * 0.05,
      [
        splashAt[0] - 1.4 + (stone % 4) * 0.95,
        0.12,
        splashAt[2] + (stone < 4 ? -1.15 : 1.15),
      ],
      [1.3, 0.6, 1],
      7,
    );
  }
  [
    [-2.4, 2.4],
    [3.2, 2.2],
    [-4.0, -2.0],
    [4.2, -2.6],
    [2.0, 1.0],
    [5.2, 8.2],
  ].forEach(([fx, fz], index) => {
    for (let frond = 0; frond < 6; frond++) {
      const angle = frond * 1.05 + fx;
      builder.box(
        "matte",
        frond % 2 === 0 ? leafMid : leafBright,
        [0.16, 0.02, 0.6],
        [fx + Math.sin(angle) * 0.25, 0.22, fz + Math.cos(angle) * 0.25],
        [-0.55, angle, 0],
      );
    }
    builder.sphere(
      "paint",
      index % 2 === 0 ? "#e2392b" : "#f6c531",
      0.07,
      [fx, 0.42, fz],
      [1, 1, 1],
      6,
    );
  });
};

/* -------------------------------------------------------------- */
/* Moving parts                                                    */
/* -------------------------------------------------------------- */

const buildGoLight = (builder: AttractionBuilder) => {
  builder.cylinder("glow", "#5ef06a", {
    radius: 0.16,
    length: 0.04,
    at: [0, 0, 0],
    axis: "z",
    segments: 14,
  });
  builder.torus("glow", "#d8ffd8", 0.2, 0.025, [0, 0, 0.01], "z", 16);
};

const buildGoLightPost = (builder: AttractionBuilder) => {
  const x = platform.minX - 0.5;
  const z = platform.minZ + 0.2;
  builder.cylinder("paint", palette.black, {
    radius: 0.05,
    length: 2.0,
    at: [x, 1.0, z],
    segments: 6,
  });
  builder.box("paint", palette.black, [0.5, 0.95, 0.12], [x, 1.9, z]);
  if (!builder.isFar) {
    builder.cylinder("paint", "#5a1a14", {
      radius: 0.16,
      length: 0.03,
      at: [x, 2.15, z + 0.07],
      axis: "z",
      segments: 12,
    });
  }
};

const goLightAt: Triple = [platform.minX - 0.5, 1.68, platform.minZ + 0.28];

const buildSplash = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    [-0.6, 0.6].forEach((along) => {
      builder.cylinder("water", "#d6f3f7", {
        radius: 0.05,
        radiusEnd: 0.22,
        length: 1.6,
        at: [along, 0.8, side * 0.75],
        segments: 8,
      });
      builder.sphere(
        "water",
        palette.white,
        0.3,
        [along, 1.6, side * 0.75],
        [1, 0.6, 1],
        8,
      );
    });
  });
};

const buildVisitor = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#3f6fa8", {
    radius: 0.13,
    radiusEnd: 0.16,
    length: 0.5,
    at: [0, 0.55, 0],
    segments: 8,
  });
  builder.cylinder("matte", "#4a3a2c", {
    radius: 0.08,
    length: 0.32,
    at: [0, 0.16, 0],
    segments: 6,
  });
  builder.sphere("matte", "#e0b48a", 0.12, [0, 0.92, 0], [1, 1.05, 1], 8);
  builder.sphere("paint", carOrange, 0.13, [0, 1.0, -0.01], [1, 0.55, 1], 8);
  builder.box("paint", carOrange, [0.16, 0.02, 0.12], [0, 0.99, 0.12]);
  builder.cylinder("paint", leafBright, {
    radius: 0.05,
    length: 0.25,
    at: [0.17, 0.78, 0.05],
    segments: 6,
  });
  builder.sphere("glow", "#ff7ab8", 0.09, [0.17, 0.96, 0.05], [1, 1, 1], 6);
};

/* -------------------------------------------------------------- */
/* The ride                                                         */
/* -------------------------------------------------------------- */

const seatHeight = 0.42;
const seatAt: Triple = [stationTrain[0] + carLength, stationTrackTop, stationZ];
const lap = listLap(seatAt);
const boardShare = 0.06;

const coasterRide = (progress: number): LocalSpot => {
  if (progress < boardShare) {
    const share = progress / boardShare;
    return {
      x: rideStart.x + (seatAt[0] - rideStart.x) * share,
      y: Math.sin(share * Math.PI * 0.5) * (seatAt[1] + seatHeight),
      z: rideStart.z + (seatAt[2] - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress > 1 - boardShare) {
    const share = (progress - 1 + boardShare) / boardShare;
    const from = lap[lap.length - 1];
    return {
      x: from.x + (rideFinish.x - from.x) * share,
      y: (from.y + seatHeight) * (1 - share),
      z: from.z + (rideFinish.z - from.z) * share,
      heading: 0,
    };
  }
  const point = findLapPoint(
    lap,
    (progress - boardShare) / (1 - boardShare * 2),
  );
  return {
    x: point.x,
    y: point.y + seatHeight,
    z: point.z,
    heading: point.heading,
  };
};

export const jungleCoasterModel: NewLandAttractionModel = {
  kind: "jungle-coaster",
  islandId: "jungle-reach",
  name: "Jungle Coaster",
  fact: "A roller coaster has no engine to push it round. A chain pulls the train up the first big hill, then gravity pulls it down, and its speed carries it up the next hill and round the loop. Friction and air resistance slow it a little all the way, so every hill after the first must be lower.",
  curriculumLink:
    "Science, Year 5: forces. Explain that unsupported objects fall towards the Earth because of gravity, and identify the effects of air resistance and friction (a roller coaster's hills).",
  footprint: 12,
  setting: "inland",
  signSpot: signAt,
  padColour: "#5c9440",
  build: (builder) => {
    buildScenery(builder);
    addCourseTrack(builder, {
      rail: railSteel,
      spine: spineGreen,
      tie: tieBrown,
    });
    addLoopTrack(builder, {
      rail: railSteel,
      spine: spineGreen,
      leg: postGreen,
    });
    addSupports(builder, { post: postGreen, foot: concrete });
    buildStation(builder);
    buildGoLightPost(builder);
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "looping train",
      pivot: loopCentre,
      build: buildLoopTrain,
      motion: { kind: "spin", axis: "z", speed: -1.7 },
    },
    {
      name: "waiting train",
      pivot: stationTrain,
      build: buildStationTrain,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.05,
        period: 0.5,
      },
    },
    {
      name: "go light",
      pivot: goLightAt,
      build: buildGoLight,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "splash",
      pivot: splashAt,
      build: buildSplash,
      motion: { kind: "splash", reach: 6, period: 1.2 },
    },
  ],
  wanderers: [
    {
      name: "visitors",
      build: buildVisitor,
      count: 3,
      centre: { x: 1.2, z: 9.0 },
      radius: 1.6,
      speed: 0.4,
    },
  ],
  decks: [buildFlatDeck(platform, platformTop, "bridge")],
  rides: [
    {
      id: "jungle-coaster",
      name: "the Jungle Coaster",
      start: rideStart,
      reach: 0.6,
      seconds: 24,
      finish: rideFinish,
      follow: coasterRide,
    },
  ],
  blockers: [
    { x: archAt.x - 1.05, z: archAt.z, radius: 0.6 },
    { x: archAt.x + 1.05, z: archAt.z, radius: 0.6 },
    { x: 0.2, z: -1.4, radius: 0.4 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Ride the Jungle Coaster",
    news: "Wheeeee! A chain pulled you up the lift hill, then gravity whooshed you down, round the loop and back. With no engine at all!",
  },
};
