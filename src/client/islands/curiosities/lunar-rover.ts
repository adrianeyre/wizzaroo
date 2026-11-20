import { CylinderGeometry, RingGeometry } from "three";
import {
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Motion,
  type PlayRide,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const regolith = "#8f8c96";
const regolithDark = "#6c6973";
const bootPrint = "#55525c";
const foilGold = "#d9a62e";
const foilDark = "#a87a1c";
const frameSilver = "#c9cfd8";
const tyreMesh = "#5d6470";
const seatBlue = "#2f3f8a";
const screenGlow = "#7ff3ff";
const flagRed = "#c8102e";
const flagBlue = "#1f3a8a";
const signColour = "#2b2f6b";

const loopRadius = 2.65;
const loopPivot: Triple = [0, 0, 0];
const roverMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: loopRadius,
  count: 1,
  speed: -0.32,
  isFacingAlong: true,
};
/* Where the driver sits in the rover, which faces its own +z */
const seatOffset: Triple = [0.24, 0.62, -0.1];
const landerHeight = 0.95;
const dishTilt = 0.9;
const cameraPivot: Triple = [-0.55, 2.35, 0.35];
const flagAt = { x: 1.35, z: 0.6 };
const seismometerAt = { x: -3.5, z: 1.9 };
const rideStart = { x: 0, z: 3.65 };
const rideFinish = { x: 2.1, z: 3.25 };

/** One wire-mesh wheel, its axle along x. */
const addWheel = (builder: AttractionBuilder, at: Triple) => {
  builder.torus("metal", tyreMesh, 0.26, 0.07, at, "x", 18);
  builder.cylinder("metal", shade(tyreMesh, 0.8), {
    radius: 0.26,
    length: 0.14,
    at,
    axis: "x",
    segments: 18,
    isOpen: true,
  });
  builder.cylinder("metal", frameSilver, {
    radius: 0.09,
    length: 0.16,
    at,
    axis: "x",
    segments: 10,
  });
  /* Chevron treads round the tyre */
  for (let tread = 0; tread < 6; tread++) {
    const angle = (tread / 6) * Math.PI * 2;
    builder.box(
      "metal",
      frameSilver,
      [0.15, 0.03, 0.05],
      [at[0], at[1] + Math.cos(angle) * 0.33, at[2] + Math.sin(angle) * 0.33],
      [angle, 0, 0],
    );
  }
};

/** The six-wheeled moon buggy, facing +z, centred on its own origin. */
const buildRover = (builder: AttractionBuilder) => {
  const wheelUp = 0.33;
  /* The chassis: a flat frame with a floor pan */
  builder.box("metal", frameSilver, [0.92, 0.08, 1.9], [0, 0.42, 0]);
  builder.box("paint", shade(frameSilver, 0.8), [0.8, 0.04, 1.7], [0, 0.47, 0]);
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      frameSilver,
      [0.06, 0.12, 2.0],
      [side * 0.46, 0.44, 0],
    );
    [-0.72, 0, 0.72].forEach((along) => {
      addWheel(builder, [side * 0.62, wheelUp, along]);
      /* A gold fender over each wheel */
      builder.add(
        "paint",
        foilGold,
        new CylinderGeometry(0.36, 0.36, 0.2, 12, 1, true, 0, Math.PI).rotateZ(
          Math.PI / 2,
        ),
        { at: [side * 0.62, wheelUp, along] },
      );
      builder.bar(
        "metal",
        frameSilver,
        [side * 0.46, 0.42, along],
        [side * 0.55, wheelUp, along],
        0.05,
        5,
      );
    });
  });
  /* Two seats, side by side, with seat belts */
  [-0.24, 0.24].forEach((x) => {
    builder.box("paint", seatBlue, [0.36, 0.08, 0.38], [x, 0.56, -0.1]);
    builder.box(
      "paint",
      seatBlue,
      [0.36, 0.42, 0.07],
      [x, 0.79, -0.31],
      [-0.15, 0, 0],
    );
    /* The seat's tube frame */
    [-0.18, 0.18].forEach((side) => {
      builder.bar(
        "metal",
        frameSilver,
        [x + side, 0.52, 0.1],
        [x + side, 1.0, -0.34],
        0.03,
        5,
      );
    });
    builder.box(
      "matte",
      palette.white,
      [0.04, 0.4, 0.01],
      [x + 0.08, 0.79, -0.26],
      [-0.15, 0, 0.5],
    );
  });
  /* The control console with its hand controller and glowing dials */
  builder.box("metal", frameSilver, [0.07, 0.5, 0.07], [0, 0.72, 0.42]);
  builder.box(
    "paint",
    palette.black,
    [0.4, 0.26, 0.08],
    [0, 0.98, 0.42],
    [-0.4, 0, 0],
  );
  [-0.1, 0.1].forEach((x, index) => {
    builder.cylinder("glow", index === 0 ? screenGlow : "#ffe58a", {
      radius: 0.05,
      length: 0.02,
      at: [x, 1.0, 0.39],
      axis: "z",
      segments: 10,
    });
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.02,
    length: 0.16,
    at: [0, 0.66, 0.15],
    segments: 6,
  });
  builder.sphere("paint", palette.black, 0.035, [0, 0.75, 0.15], [1, 1, 1], 8);
  /* The mesh dish antenna on its mast at the front */
  builder.bar(
    "metal",
    frameSilver,
    [0.3, 0.46, 0.75],
    [0.3, 1.45, 0.75],
    0.04,
    6,
  );
  builder.add(
    "metal",
    "#dfe4ec",
    new CylinderGeometry(0.34, 0.06, 0.16, 16, 1, true).rotateX(dishTilt),
    { at: [0.3, 1.55, 0.82] },
  );
  const axis: Triple = [0, Math.cos(dishTilt), Math.sin(dishTilt)];
  const across: Triple = [0, -Math.sin(dishTilt), Math.cos(dishTilt)];
  for (let rib = 0; rib < 8; rib++) {
    const angle = (rib / 8) * Math.PI * 2;
    builder.bar(
      "metal",
      palette.darkSteel,
      [0.3, 1.55 - axis[1] * 0.08, 0.82 - axis[2] * 0.08],
      [
        0.3 + Math.cos(angle) * 0.34,
        1.55 + axis[1] * 0.08 + across[1] * Math.sin(angle) * 0.34,
        0.82 + axis[2] * 0.08 + across[2] * Math.sin(angle) * 0.34,
      ],
      0.012,
      3,
    );
  }
  /* The thin umbrella of the low-gain antenna, and a little TV camera */
  builder.bar(
    "metal",
    frameSilver,
    [-0.3, 0.46, 0.75],
    [-0.3, 1.3, 0.75],
    0.03,
    5,
  );
  builder.cylinder("metal", frameSilver, {
    radius: 0.06,
    radiusEnd: 0.0,
    length: 0.3,
    at: [-0.3, 1.45, 0.75],
    segments: 8,
  });
  builder.box("paint", palette.black, [0.16, 0.12, 0.2], [-0.3, 0.95, 0.85]);
  builder.cylinder("glass", "#6f8fd0", {
    radius: 0.04,
    length: 0.05,
    at: [-0.3, 0.95, 0.97],
    axis: "z",
    segments: 8,
  });
  /* A tool rack and sample bags at the back */
  builder.box("paint", foilGold, [0.7, 0.3, 0.3], [0, 0.62, -0.78]);
  builder.box("paint", foilDark, [0.72, 0.04, 0.32], [0, 0.78, -0.78]);
  [-0.22, 0, 0.22].forEach((x, index) => {
    builder.bar(
      "metal",
      frameSilver,
      [x, 0.6, -0.95],
      [x + 0.03, 1.15, -1.0],
      0.025,
      5,
    );
    builder.box(
      "matte",
      index === 1 ? palette.white : "#d8d2c4",
      [0.1, 0.12, 0.06],
      [x + 0.03, 1.15, -1.0],
    );
  });
};

/** The Eagle's descent stage, left behind when the astronauts flew home. */
const buildLander = (builder: AttractionBuilder) => {
  builder.cylinder("paint", foilGold, {
    radius: 0.8,
    length: 0.7,
    at: [0, landerHeight + 0.35, 0],
    segments: builder.isFar ? 8 : 8,
  });
  /* Four legs splayed out to round footpads */
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
    const foot: Triple = [Math.sin(angle) * 1.3, 0.06, Math.cos(angle) * 1.3];
    builder.bar(
      "metal",
      frameSilver,
      [Math.sin(angle) * 0.68, landerHeight + 0.55, Math.cos(angle) * 0.68],
      foot,
      0.07,
      6,
    );
    if (builder.isFar) {
      return;
    }
    builder.bar(
      "metal",
      frameSilver,
      [Math.sin(angle) * 0.72, landerHeight + 0.05, Math.cos(angle) * 0.72],
      [foot[0] * 0.8, 0.35, foot[2] * 0.8],
      0.04,
      5,
    );
    builder.cylinder("metal", frameSilver, {
      radius: 0.2,
      radiusEnd: 0.14,
      length: 0.08,
      at: foot,
      segments: 14,
    });
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.025,
      length: 0.4,
      at: [foot[0], 0.25, foot[2]],
      segments: 5,
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Panels of crinkly foil in two shades, and a dark engine bell below */
  for (let panel = 0; panel < 8; panel++) {
    const angle = ((panel + 0.5) / 8) * Math.PI * 2;
    builder.box(
      "paint",
      panel % 2 === 0 ? foilDark : shade(foilGold, 1.1),
      [0.5, 0.5, 0.02],
      [Math.sin(angle) * 0.75, landerHeight + 0.35, Math.cos(angle) * 0.75],
      [0, angle, 0],
    );
  }
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.3,
    radiusEnd: 0.16,
    length: 0.35,
    at: [0, landerHeight - 0.15, 0],
    segments: 14,
  });
  builder.box(
    "metal",
    frameSilver,
    [1.5, 0.06, 1.5],
    [0, landerHeight + 0.73, 0],
    [0, Math.PI / 8, 0],
  );
  /* The porch and ladder down the front leg */
  const ladderTop: Triple = [0, landerHeight + 0.05, 0.85];
  builder.box("metal", frameSilver, [0.5, 0.04, 0.3], ladderTop);
  [-0.15, 0.15].forEach((side) => {
    builder.bar(
      "metal",
      frameSilver,
      [side, landerHeight, 0.95],
      [side, 0.1, 1.3],
      0.035,
      5,
    );
  });
  for (let rung = 1; rung < 5; rung++) {
    const along = rung / 5;
    builder.box(
      "metal",
      frameSilver,
      [0.3, 0.025, 0.025],
      [0, landerHeight - (landerHeight - 0.1) * along, 0.95 + 0.35 * along],
    );
  }
  /* The plaque on the leg: "We came in peace for all mankind" */
  builder.box(
    "metal",
    "#e8e8ee",
    [0.24, 0.16, 0.01],
    [0, 0.6, 1.08],
    [0.35, 0, 0],
  );
  /* The camera mast */
  builder.cylinder("metal", frameSilver, {
    radius: 0.035,
    length: cameraPivot[1] - landerHeight - 0.7,
    at: [
      cameraPivot[0],
      (cameraPivot[1] + landerHeight + 0.7) / 2,
      cameraPivot[2],
    ],
    segments: 8,
  });
};

const buildCamera = (builder: AttractionBuilder) => {
  builder.roundedBox(
    "paint",
    palette.white,
    [0.3, 0.22, 0.38],
    0.04,
    [0, 0.1, 0],
  );
  builder.cylinder("metal", palette.black, {
    radius: 0.08,
    length: 0.14,
    at: [0, 0.1, 0.24],
    axis: "z",
    segments: 12,
  });
  builder.cylinder("glass", "#6f8fd0", {
    radius: 0.06,
    length: 0.02,
    at: [0, 0.1, 0.31],
    axis: "z",
    segments: 12,
  });
  builder.sphere("glow", "#ff4a5a", 0.025, [0.1, 0.22, 0.12], [1, 1, 1], 6);
  builder.box("metal", frameSilver, [0.02, 0.24, 0.2], [0.14, 0.32, -0.05]);
};

const buildFlag = (builder: AttractionBuilder) => {
  const { x, z } = flagAt;
  builder.cylinder("metal", frameSilver, {
    radius: 0.025,
    length: 1.9,
    at: [x, 0.95, z],
    segments: 8,
  });
  builder.box("paint", palette.white, [0.02, 0.52, 0.82], [x, 1.6, z - 0.43]);
  if (builder.isFar) {
    return;
  }
  /* A rod along the top holds it out: there is no wind on the Moon */
  builder.cylinder("metal", frameSilver, {
    radius: 0.015,
    length: 0.85,
    at: [x, 1.87, z - 0.43],
    axis: "z",
    segments: 6,
  });
  for (let stripe = 0; stripe < 7; stripe++) {
    if (stripe % 2 === 0) {
      builder.box(
        "paint",
        flagRed,
        [0.025, 0.074, stripe < 4 ? 0.48 : 0.82],
        [x, 1.82 - stripe * 0.074, z - (stripe < 4 ? 0.6 : 0.43)],
      );
    }
  }
  builder.box("paint", flagBlue, [0.026, 0.28, 0.34], [x, 1.72, z - 0.19]);
};

const buildRegolith = (builder: AttractionBuilder) => {
  const around = builder.isFar ? 16 : 56;
  /* The rover's loop of track, with two tyre ruts */
  builder.add(
    "matte",
    regolithDark,
    new RingGeometry(loopRadius - 0.7, loopRadius + 0.7, around, 1).rotateX(
      -Math.PI / 2,
    ),
    { at: [0, 0.015, 0] },
  );
  if (builder.isFar) {
    return;
  }
  [-0.62, 0.62].forEach((offset) => {
    builder.add(
      "matte",
      bootPrint,
      new RingGeometry(
        loopRadius + offset - 0.08,
        loopRadius + offset + 0.08,
        56,
        1,
      ).rotateX(-Math.PI / 2),
      { at: [0, 0.02, 0] },
    );
  });
  /* Boot prints wandering from the ladder to the flag and out to the visitors */
  const steps = [
    [0.1, 1.55],
    [0.3, 1.75],
    [0.42, 1.45],
    [0.62, 1.65],
    [0.25, 2.15],
    [0.05, 2.45],
    [-0.15, 2.75],
    [0.05, 3.05],
    [-0.2, 3.35],
    [0.0, 3.62],
  ];
  steps.forEach(([x, z], index) => {
    const side = index % 2 === 0 ? -0.07 : 0.07;
    builder.box(
      "matte",
      bootPrint,
      [0.12, 0.012, 0.24],
      [x + side, 0.03, z],
      [0, 0.3, 0],
    );
    for (let ridge = 0; ridge < 3; ridge++) {
      builder.box(
        "matte",
        shade(bootPrint, 0.75),
        [0.12, 0.016, 0.025],
        [x + side, 0.032, z - 0.08 + ridge * 0.08],
        [0, 0.3, 0],
      );
    }
  });
  /* Small craters and grey rocks */
  [
    [-3.6, -1.2, 0.45],
    [3.5, -1.8, 0.35],
    [-2.0, -3.6, 0.3],
    [3.6, 1.4, 0.28],
  ].forEach(([x, z, size]) => {
    builder.torus("matte", regolith, size, size * 0.25, [x, 0.02, z], "y", 16);
    builder.cylinder("matte", regolithDark, {
      radius: size,
      length: 0.02,
      at: [x, 0.015, z],
      segments: 16,
    });
  });
  [
    [-3.9, 0.6, 0.2],
    [1.0, -4.0, 0.24],
    [-2.6, 3.2, 0.16],
    [3.95, -0.3, 0.18],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#7a7682" : "#9a97a2",
      size,
      [x, size * 0.4, z],
      [1.3, 0.75, 1],
      8,
    );
  });
  /* A seismometer left on the surface, its solar panels spread */
  builder.box(
    "paint",
    foilGold,
    [0.3, 0.25, 0.3],
    [seismometerAt.x, 0.13, seismometerAt.z],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#2a3a7a",
      [0.5, 0.02, 0.35],
      [seismometerAt.x + side * 0.42, 0.28, seismometerAt.z],
    );
  });
};

const rideFollow = (progress: number, clockSeconds: number) => {
  const local: Triple = [
    loopPivot[0] + seatOffset[0],
    loopPivot[1] + seatOffset[1],
    loopPivot[2] + seatOffset[2],
  ];
  const pose = findMotionPose(roverMotion, clockSeconds);
  const [x, y, z] = moveWithPose(loopPivot, local, pose);
  const heading = pose.rotation[1];
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? rideStart : rideFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading,
  };
};

const roverRide: PlayRide = {
  id: "rover",
  name: "the lunar rover",
  start: rideStart,
  reach: 0.6,
  seconds: 15,
  finish: rideFinish,
  follow: rideFollow,
};

export const lunarRoverModel: CuriosityModel = {
  kind: "lunar-rover",
  islandId: "starfall-isle",
  name: "Lunar Rover",
  fact: "On 20 July 1969 the astronauts Neil Armstrong and Buzz Aldrin landed on the Moon in the Eagle and became the first people to walk there. It was a great turning point in history. On later Moon missions astronauts drove a battery-powered rover across the dusty grey ground. Their boot prints are still there, because there is no wind or rain on the Moon to wipe them away.",
  curriculumLink:
    "History, Key Stage 2: a study of an aspect or theme in British and world history that extends knowledge beyond 1066, such as a significant turning point (the first Moon landing, 1969).",
  footprint: 4.8,
  setting: "inland",
  signSpot: { x: -1.6, z: 4.3 },
  padColour: regolith,
  build: (builder) => {
    buildRegolith(builder);
    buildLander(builder);
    buildFlag(builder);
    if (builder.isFar) {
      builder.box(
        "metal",
        frameSilver,
        [0.95, 0.5, 1.9],
        [loopRadius, 0.45, 0],
      );
    }
    addSignBoard(builder, [-1.6, 0, 4.3], signColour);
  },
  moving: [
    {
      name: "rover",
      pivot: loopPivot,
      build: buildRover,
      motion: roverMotion,
    },
    {
      name: "camera",
      pivot: cameraPivot,
      build: buildCamera,
      motion: { kind: "nod", axis: "y", reach: 7, amplitude: 0.9, period: 4 },
    },
  ],
  blockers: [
    { x: 0, z: 0, radius: 1.35 },
    { x: flagAt.x, z: flagAt.z, radius: 0.15 },
    { x: seismometerAt.x, z: seismometerAt.z, radius: 0.5 },
  ] satisfies LocalBlocker[],
  rides: [roverRide],
  play: {
    label: "Drive the rover",
    news: "Vroom! You bounced across the Moon dust at 18 kilometres an hour, leaving tyre tracks that could last for millions of years.",
  },
};
