import { TorusGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const platformGrey = "#5a6078";
const platformEdge = "#c9cfd8";
const ringSilver = "#d4d9e3";
const ringPurple = "#7a4fc4";
const ringBlue = "#2f5fd0";
const padBlue = "#2f3f8a";
const matBlue = "#3a6fd8";
const seatWhite = "#eef1f6";
const lightCyan = "#7ff3ff";
const lightPink = "#ff7ad9";
const heartRed = "#ff4a6a";
const signColour = "#2b2f6b";

const platformRadius = 2.15;
const platformHeight = 0.3;
const centreHeight = platformHeight + 1.75;
const centre: Triple = [0, centreHeight, 0];
const outerRadius = 1.62;
const middleRadius = 1.36;
const innerRadius = 1.1;
const seatTop = 1.42;
const stepDepth = 0.32;
const rideStart = { x: 0, z: 3.05 };
const rideFinish = { x: 1.75, z: 3.2 };

/** A chunky ring of `radius`, its tube squarish, in the plane across `axis`. */
const addRing = (
  builder: AttractionBuilder,
  radius: number,
  colour: string,
  turn: Triple,
  around = 48,
) => {
  builder.add("paint", colour, new TorusGeometry(radius, 0.075, 6, around), {
    rotation: turn,
  });
  builder.add(
    "matte",
    padBlue,
    new TorusGeometry(radius - 0.09, 0.035, 4, around),
    { rotation: turn },
  );
};

/** Points round a ring in its own plane, for lights and handles. */
const ringPoints = (radius: number, count: number, turn: "x" | "y" | "z") =>
  Array.from({ length: count }, (_, index) => {
    const angle = ((index + 0.5) / count) * Math.PI * 2;
    const a = Math.cos(angle) * radius;
    const b = Math.sin(angle) * radius;
    const point: Triple =
      turn === "z" ? [a, b, 0] : turn === "x" ? [0, b, a] : [a, 0, b];
    return point;
  });

/* The outer ring stands in the x–y plane and turns about z, like a wheel. */
const buildOuterRing = (builder: AttractionBuilder) => {
  addRing(builder, outerRadius, ringSilver, [0, 0, 0]);
  ringPoints(outerRadius + 0.075, 12, "z").forEach((point, index) => {
    builder.sphere(
      "glow",
      index % 2 === 0 ? lightCyan : lightPink,
      0.045,
      point,
      [1, 1, 1],
      6,
    );
  });
  /* Spokes of handholds across the ring */
  ringPoints(outerRadius - 0.1, 4, "z").forEach(([x, y]) => {
    builder.bar(
      "metal",
      platformEdge,
      [x, y, 0.05],
      [x * 0.88, y * 0.88, 0.05],
      0.05,
      6,
    );
  });
};

/* The middle ring stands in the y–z plane and turns about x. */
const buildMiddleRing = (builder: AttractionBuilder) => {
  addRing(builder, middleRadius, ringPurple, [0, Math.PI / 2, 0]);
  ringPoints(middleRadius + 0.075, 10, "x").forEach((point, index) => {
    builder.sphere(
      "glow",
      index % 2 === 0 ? lightPink : lightCyan,
      0.04,
      point,
      [1, 1, 1],
      6,
    );
  });
};

/* The inner ring lies flat and turns about y, round the seat. */
const buildInnerRing = (builder: AttractionBuilder) => {
  addRing(builder, innerRadius, ringBlue, [Math.PI / 2, 0, 0], 40);
  ringPoints(innerRadius, 8, "y").forEach(([x, , z], index) => {
    builder.box(
      "metal",
      platformEdge,
      [0.1, 0.18, 0.1],
      [x, 0, z],
      [0, Math.atan2(x, z), 0],
    );
    builder.sphere(
      "glow",
      index % 2 === 0 ? lightCyan : "#ffe58a",
      0.04,
      [x, 0.11, z],
      [1, 1, 1],
      6,
    );
  });
};

/** The platform, its steps and the stands the rings run on. */
const buildPlatform = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 12 : 40;
  builder.cylinder("paint", platformGrey, {
    radius: platformRadius,
    radiusEnd: platformRadius - 0.04,
    length: platformHeight,
    at: [0, platformHeight / 2, 0],
    segments,
  });
  for (let step = 0; step < 2; step++) {
    builder.box(
      "paint",
      shade(platformGrey, 1.1),
      [1.3, (platformHeight * (2 - step)) / 2, stepDepth],
      [
        0,
        (platformHeight * (2 - step)) / 4,
        platformRadius - 0.05 + stepDepth * (step + 0.5),
      ],
    );
  }
  if (builder.isFar) {
    /* Still rings in place of the turning ones */
    builder.add(
      "paint",
      ringSilver,
      new TorusGeometry(outerRadius, 0.09, 3, 12),
      { at: centre },
    );
    builder.add(
      "paint",
      ringPurple,
      new TorusGeometry(middleRadius, 0.09, 3, 12),
      { at: centre, rotation: [0, Math.PI / 2, 0] },
    );
    builder.add(
      "paint",
      ringBlue,
      new TorusGeometry(innerRadius, 0.09, 3, 10),
      { at: centre, rotation: [Math.PI / 2, 0, 0] },
    );
    return;
  }
  builder.cylinder("metal", platformEdge, {
    radius: platformRadius + 0.02,
    length: 0.08,
    at: [0, platformHeight - 0.04, 0],
    segments: 48,
    isOpen: true,
  });
  /* Hazard stripes on the step edges */
  for (let stripe = 0; stripe < 6; stripe++) {
    builder.box(
      "paint",
      stripe % 2 === 0 ? "#f2c230" : palette.black,
      [0.2, 0.02, 0.06],
      [
        -0.5 + stripe * 0.2,
        platformHeight / 2 + 0.01,
        platformRadius - 0.05 + stepDepth * 1.45,
      ],
    );
  }
  /* Rollers that the outer ring and the middle ring run on */
  const outerBottom = centreHeight - outerRadius - 0.075;
  builder.box(
    "metal",
    platformEdge,
    [0.7, outerBottom - platformHeight - 0.05, 0.3],
    [0, (outerBottom + platformHeight) / 2 - 0.05, 0],
  );
  [-0.22, 0.22].forEach((x) => {
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.07,
      length: 0.24,
      at: [x, outerBottom - 0.04, 0],
      axis: "z",
      segments: 10,
    });
  });
  [-0.38, 0.38].forEach((z) => {
    const bottom = centreHeight - Math.sqrt(middleRadius ** 2 - z * z) - 0.075;
    builder.box(
      "metal",
      platformEdge,
      [0.24, bottom - platformHeight, 0.18],
      [0, (bottom + platformHeight) / 2 - 0.04, z],
    );
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.06,
      length: 0.2,
      at: [0, bottom - 0.03, z],
      axis: "x",
      segments: 10,
    });
  });
  /* Four posts holding up the flat inner ring, between the other rings */
  [0.785, 2.356, 3.927, 5.498].forEach((angle) => {
    const x = Math.sin(angle) * innerRadius;
    const z = Math.cos(angle) * innerRadius;
    builder.cylinder("metal", platformEdge, {
      radius: 0.05,
      length: centreHeight - 0.09 - platformHeight,
      at: [x, (centreHeight - 0.09 + platformHeight) / 2, z],
      segments: 8,
    });
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.07,
      length: 0.1,
      at: [x, centreHeight - 0.12, z],
      segments: 10,
    });
  });
};

/** The astronaut's seat, on legs that stay clear of every ring. */
const buildSeat = (builder: AttractionBuilder) => {
  builder.box("paint", seatWhite, [0.5, 0.1, 0.5], [0, seatTop - 0.05, 0]);
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    seatWhite,
    [0.5, 0.65, 0.1],
    [0, seatTop + 0.3, -0.27],
    [-0.12, 0, 0],
  );
  builder.box("matte", padBlue, [0.4, 0.05, 0.4], [0, seatTop + 0.02, 0]);
  builder.box(
    "matte",
    padBlue,
    [0.4, 0.5, 0.05],
    [0, seatTop + 0.3, -0.2],
    [-0.12, 0, 0],
  );
  /* A headrest and harness straps */
  builder.box(
    "paint",
    seatWhite,
    [0.3, 0.2, 0.1],
    [0, seatTop + 0.72, -0.33],
    [-0.12, 0, 0],
  );
  [-0.12, 0.12].forEach((x) => {
    builder.box(
      "matte",
      "#ff8a2a",
      [0.05, 0.5, 0.01],
      [x, seatTop + 0.3, -0.17],
      [-0.12, 0, 0],
    );
  });
  /* Legs on the diagonals, out of the way of the rings */
  [0.785, 2.356, 3.927, 5.498].forEach((angle) => {
    builder.bar(
      "metal",
      platformEdge,
      [Math.sin(angle) * 0.22, seatTop - 0.1, Math.cos(angle) * 0.22],
      [Math.sin(angle) * 0.75, platformHeight, Math.cos(angle) * 0.75],
      0.06,
      6,
    );
  });
  /* Footrest */
  builder.box(
    "metal",
    platformEdge,
    [0.4, 0.04, 0.16],
    [0, seatTop - 0.55, 0.32],
  );
  builder.bar(
    "metal",
    platformEdge,
    [0, seatTop - 0.1, 0.2],
    [0, seatTop - 0.55, 0.3],
    0.04,
    5,
  );
};

/** Padded mats, a heart-rate screen and a water bottle round the trainer. */
const buildGym = (builder: AttractionBuilder) => {
  builder.box("matte", matBlue, [5.0, 0.06, 1.4], [0, 0.03, 3.05]);
  if (builder.isFar) {
    return;
  }
  for (let fold = 0; fold < 5; fold++) {
    builder.box(
      "matte",
      shade(matBlue, 0.8),
      [0.03, 0.07, 1.4],
      [-2.0 + fold * 1.0, 0.035, 3.05],
    );
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(matBlue, 1.12),
      [1.3, 0.12, 2.6],
      [side * 3.1, 0.06, -0.6],
    );
  });
  /* The heart-rate monitor: exercise makes the heart beat faster */
  const monitor: Triple = [-3.0, 0, 1.55];
  builder.cylinder("metal", platformEdge, {
    radius: 0.05,
    length: 1.1,
    at: [monitor[0], 0.55, monitor[2]],
    segments: 8,
  });
  builder.box(
    "paint",
    palette.black,
    [0.8, 0.55, 0.08],
    [monitor[0], 1.35, monitor[2]],
    [0, 0.6, 0],
  );
  builder.box(
    "glow",
    "#123a4a",
    [0.7, 0.45, 0.01],
    [monitor[0] + 0.03, 1.35, monitor[2] + 0.04],
    [0, 0.6, 0],
  );
  builder.sphere(
    "glow",
    heartRed,
    0.06,
    [monitor[0] - 0.13, 1.45, monitor[2] + 0.1],
    [1, 1, 0.4],
    8,
  );
  builder.sphere(
    "glow",
    heartRed,
    0.06,
    [monitor[0] - 0.05, 1.45, monitor[2] + 0.15],
    [1, 1, 0.4],
    8,
  );
  builder.cylinder("glow", heartRed, {
    radius: 0.085,
    radiusEnd: 0.0,
    length: 0.14,
    at: [monitor[0] - 0.09, 1.36, monitor[2] + 0.12],
    segments: 6,
  });
  /* The heartbeat trace */
  [0, 0.06, -0.14, 0.18, 0, 0, 0.05].forEach((height, index) => {
    builder.box(
      "glow",
      "#7dffb2",
      [0.06, 0.012 + Math.abs(height), 0.01],
      [
        monitor[0] + 0.05 + index * 0.045 * Math.cos(0.6),
        1.28 + height / 2,
        monitor[2] + 0.05 - index * 0.045 * Math.sin(0.6),
      ],
      [0, 0.6, 0],
    );
  });
  /* A water bottle and towel on a little bench */
  builder.box("paint", padBlue, [1.0, 0.08, 0.36], [3.1, 0.42, 1.55]);
  [-0.42, 0.42].forEach((offset) => {
    builder.box(
      "metal",
      platformEdge,
      [0.06, 0.4, 0.3],
      [3.1 + offset, 0.2, 1.55],
    );
  });
  builder.cylinder("paint", lightCyan, {
    radius: 0.06,
    length: 0.24,
    at: [2.85, 0.58, 1.55],
    segments: 10,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.035,
    length: 0.05,
    at: [2.85, 0.72, 1.55],
    segments: 8,
  });
  builder.box("matte", lightPink, [0.35, 0.06, 0.3], [3.3, 0.49, 1.55]);
  /* Two light towers with glowing beacons */
  [-2.2, 2.2].forEach((x) => {
    builder.cylinder("metal", platformEdge, {
      radius: 0.05,
      length: 2.4,
      at: [x, 1.2, -2.6],
      segments: 8,
    });
    builder.sphere(
      "glow",
      x < 0 ? lightPink : lightCyan,
      0.12,
      [x, 2.5, -2.6],
      [1, 1, 1],
      10,
    );
    builder.cylinder("paint", padBlue, {
      radius: 0.25,
      length: 0.1,
      at: [x, 0.05, -2.6],
      segments: 12,
    });
  });
};

const platformDeck: Deck = ({ x, z }) => {
  if (Math.hypot(x, z) <= platformRadius) {
    return { height: platformHeight, kind: "ground" };
  }
  if (
    Math.abs(x) <= 0.65 &&
    z > 0 &&
    z <= platformRadius - 0.05 + stepDepth * 2
  ) {
    const step = z <= platformRadius - 0.05 + stepDepth ? 0 : 1;
    return { height: (platformHeight * (2 - step)) / 2, kind: "ground" };
  }
  return undefined;
};

/** The Character hops into the seat, is spun round and round, and hops out. */
const spinRide = (progress: number, clockSeconds: number): LocalSpot => {
  const hop = 0.12;
  if (progress < hop) {
    const share = progress / hop;
    return {
      x: rideStart.x * (1 - share),
      y: seatTop * share + Math.sin(share * Math.PI) * 0.7,
      z: rideStart.z * (1 - share),
      heading: Math.PI,
    };
  }
  if (progress > 1 - hop) {
    const share = (progress - (1 - hop)) / hop;
    return {
      x: rideFinish.x * share,
      y: seatTop * (1 - share) + Math.sin(share * Math.PI) * 0.7,
      z: rideFinish.z * share,
      heading: Math.atan2(rideFinish.x, rideFinish.z),
    };
  }
  return {
    x: 0,
    y: seatTop + 0.04 * Math.sin(clockSeconds * 7),
    z: 0,
    heading: clockSeconds * 3.2,
  };
};

export const gyroscopeTrainerModel: CuriosityModel = {
  kind: "gyroscope-trainer",
  islandId: "starfall-isle",
  name: "Astronaut Gyroscope",
  fact: "Astronauts train in spinning machines like this to get used to tumbling about in space. Training is hard exercise: your muscles work harder, so your heart beats faster and you breathe more quickly to carry oxygen round your body. Regular exercise keeps hearts, lungs and muscles strong, on Earth and in space.",
  curriculumLink:
    "Science, Year 6: animals, including humans. Recognise the impact of diet, exercise, drugs and lifestyle on the way their bodies function.",
  footprint: 4.8,
  setting: "inland",
  signSpot: { x: -1.6, z: 4.25 },
  build: (builder) => {
    buildGym(builder);
    buildPlatform(builder);
    buildSeat(builder);
    addSignBoard(builder, [-1.6, 0, 4.25], signColour);
  },
  moving: [
    {
      name: "outer-ring",
      pivot: centre,
      build: buildOuterRing,
      motion: { kind: "spin", axis: "z", speed: 0.7 },
    },
    {
      name: "middle-ring",
      pivot: centre,
      build: buildMiddleRing,
      motion: { kind: "whirl", axis: "x", idle: 0.4, speed: 2.2, reach: 7 },
    },
    {
      name: "inner-ring",
      pivot: centre,
      build: buildInnerRing,
      motion: { kind: "whirl", axis: "y", idle: 0.6, speed: 3.0, reach: 7 },
    },
  ],
  blockers: [
    { x: 0, z: 0, radius: outerRadius + 0.15 },
    { x: -3.0, z: 1.55, radius: 0.4 },
    { x: 3.1, z: 1.55, radius: 0.6 },
    { x: -2.2, z: -2.6, radius: 0.3 },
    { x: 2.2, z: -2.6, radius: 0.3 },
  ] satisfies LocalBlocker[],
  decks: [platformDeck],
  rides: [
    {
      id: "gyroscope",
      name: "the astronaut gyroscope",
      start: rideStart,
      reach: 0.6,
      seconds: 12,
      finish: rideFinish,
      follow: spinRide,
    },
  ],
  play: {
    label: "Train like an astronaut",
    news: "Whirr! The rings spun you round and round. Feel your heart beating faster? That is your body working hard, just like an astronaut in training.",
  },
};
