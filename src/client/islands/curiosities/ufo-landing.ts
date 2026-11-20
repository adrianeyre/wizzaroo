import { CylinderGeometry, LatheGeometry, RingGeometry, Vector2 } from "three";
import {
  addSignBoard,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const hullSilver = "#d4d9e3";
const hullShadow = "#9aa2b4";
const domeGlass = "#9fd8ff";
const alienGreen = "#7fe06a";
const rimGlow = "#7ff3ff";
const lightPink = "#ff7ad9";
const lightGold = "#ffe58a";
const scorch = "#2b2630";
const scorchEdge = "#4a3f3a";
const beamColour = "#b8fff4";
const plinthPurple = "#5b3a8c";
const signColour = "#3b2a7a";

const padAt = { x: 0, z: -0.6 };
const hoverHeight = 2.5;
const saucerPivot: Triple = [padAt.x, hoverHeight, padAt.z];
const hatchAt: Triple = [padAt.x, hoverHeight - 0.32, padAt.z + 0.75];
const rampLength = 2.75;
const rampFootHeight = 0.2;
const rampAngle = Math.asin((hatchAt[1] - rampFootHeight) / rampLength);
const alienAt = { x: 2.85, z: 1.75 };
const armPivot: Triple = [alienAt.x + 0.2, 1.12, alienAt.z];

/** The saucer's outline, from the middle of its belly round to its top. */
const saucerProfile: readonly [number, number][] = [
  [0.001, -0.42],
  [0.55, -0.42],
  [0.75, -0.32],
  [1.4, -0.2],
  [1.95, -0.06],
  [2.1, 0.02],
  [1.95, 0.1],
  [1.45, 0.24],
  [0.95, 0.34],
  [0.75, 0.36],
  [0.001, 0.36],
];

const lathe = (points: readonly [number, number][], around: number) =>
  new LatheGeometry(
    points.map(([radius, height]) => new Vector2(radius, height)),
    around,
  );

const buildSaucer = (builder: AttractionBuilder) => {
  builder.add("metal", hullSilver, lathe(saucerProfile, 48));
  /* A glowing band round the rim, and lights all round it */
  builder.cylinder("glow", rimGlow, {
    radius: 2.11,
    length: 0.05,
    at: [0, 0.02, 0],
    segments: 48,
    isOpen: true,
  });
  listRingPoints(1.72, 14).forEach((point, index) => {
    builder.sphere(
      "glow",
      index % 2 === 0 ? lightPink : lightGold,
      0.085,
      [point.x, 0.17, point.z],
      [1, 0.7, 1],
      8,
    );
  });
  /* Panel lines on the top */
  [1.2, 1.65].forEach((radius) => {
    builder.cylinder("metal", hullShadow, {
      radius,
      radiusEnd: radius - 0.04,
      length: 0.03,
      at: [0, 0.29 - (radius - 1.2) * 0.28, 0],
      segments: 40,
      isOpen: true,
    });
  });
  /* The glass dome, with a little alien pilot inside */
  builder.add(
    "metal",
    hullShadow,
    lathe(
      [
        [0.82, 0.3],
        [0.82, 0.42],
        [0.74, 0.44],
      ],
      32,
    ),
  );
  builder.sphere("paint", alienGreen, 0.2, [0, 0.72, 0.1], [1, 1.1, 1], 14);
  [-0.08, 0.08].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.055,
      [side, 0.76, 0.27],
      [1, 1.3, 0.6],
      8,
    );
    builder.bar(
      "paint",
      alienGreen,
      [side * 0.8, 0.88, 0.1],
      [side * 2, 1.05, 0.1],
      0.025,
      5,
    );
    builder.sphere(
      "glow",
      lightPink,
      0.035,
      [side * 2, 1.06, 0.1],
      [1, 1, 1],
      6,
    );
  });
  builder.box("paint", plinthPurple, [0.36, 0.18, 0.2], [0, 0.48, -0.05]);
  builder.add(
    "glass",
    domeGlass,
    lathe(
      [
        [0.76, 0.42],
        [0.74, 0.62],
        [0.62, 0.86],
        [0.4, 1.02],
        [0.001, 1.1],
      ],
      28,
    ),
  );
  builder.sphere("glow", lightGold, 0.06, [0, 1.13, 0], [1, 1, 1], 8);
  /* The belly: an engine ring and the open hatch */
  builder.add(
    "glow",
    rimGlow,
    new RingGeometry(0.45, 0.7, 32, 1).rotateX(Math.PI / 2),
    { at: [0, -0.425, 0] },
  );
  builder.box("glow", lightGold, [0.6, 0.02, 0.3], [0, -0.43, 0.75]);
};

const buildStillSaucer = (builder: AttractionBuilder) => {
  builder.add("metal", hullSilver, lathe(saucerProfile, 10), {
    at: saucerPivot,
  });
  builder.add(
    "glass",
    domeGlass,
    lathe(
      [
        [0.76, 0.36],
        [0.6, 0.86],
        [0.001, 1.1],
      ],
      8,
    ),
    { at: saucerPivot },
  );
};

/** A see-through tractor beam down to the landing circle, after dark. */
const buildBeam = (builder: AttractionBuilder) => {
  builder.add(
    "glow",
    beamColour,
    new CylinderGeometry(0.6, 1.5, hoverHeight - 0.45, 24, 1, true).translate(
      0,
      -(hoverHeight - 0.45) / 2,
      0,
    ),
  );
};

/** The boarding ramp, hinged at the hatch and hanging down to the ground. */
const buildRamp = (builder: AttractionBuilder) => {
  const angle = rampAngle;
  const end: Triple = [
    0,
    -Math.sin(angle) * rampLength,
    Math.cos(angle) * rampLength,
  ];
  const rotation: Triple = [angle, 0, 0];
  const middle: Triple = [0, end[1] / 2, end[2] / 2];
  builder.box("metal", hullShadow, [0.62, 0.06, rampLength], middle, rotation);
  /* Ridges to grip, and glowing edges */
  for (let ridge = 1; ridge < 9; ridge++) {
    const along = ridge / 9;
    builder.box(
      "metal",
      hullSilver,
      [0.56, 0.03, 0.05],
      [0, end[1] * along + 0.04, end[2] * along],
      rotation,
    );
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "glow",
      rimGlow,
      [0.04, 0.05, rampLength],
      [side * 0.31, middle[1] + 0.03, middle[2]],
      rotation,
    );
  });
};

const buildLandingCircle = (builder: AttractionBuilder) => {
  const { x, z } = padAt;
  const around = builder.isFar ? 16 : 48;
  builder.add(
    "matte",
    scorch,
    new RingGeometry(0.001, 2.0, around, 1).rotateX(-Math.PI / 2),
    { at: [x, 0.02, z] },
  );
  builder.add(
    "matte",
    scorchEdge,
    new RingGeometry(2.0, 2.45, around, 1).rotateX(-Math.PI / 2),
    { at: [x, 0.015, z] },
  );
  if (builder.isFar) {
    return;
  }
  /* A crop-circle pattern of pale rings in the scorch */
  [0.6, 1.25].forEach((radius) => {
    builder.add(
      "matte",
      "#6d5f5a",
      new RingGeometry(radius, radius + 0.12, 40, 1).rotateX(-Math.PI / 2),
      { at: [x, 0.025, z] },
    );
  });
  /* Landing lights set round the edge */
  listRingPoints(2.25, 10, padAt).forEach((point, index) => {
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.12,
      length: 0.06,
      at: [point.x, 0.03, point.z],
      segments: 10,
    });
    builder.sphere(
      "glow",
      index % 2 === 0 ? rimGlow : lightPink,
      0.08,
      [point.x, 0.07, point.z],
      [1, 0.6, 1],
      8,
    );
  });
  /* Bits of smoking rock and flattened grass round the edge */
  [
    [-2.9, -1.8, 0.28],
    [-3.2, 0.8, 0.2],
    [2.9, -2.4, 0.3],
    [-1.4, -3.6, 0.22],
    [1.6, -3.4, 0.18],
  ].forEach(([rockX, rockZ, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#5d5566" : "#73697c",
      size,
      [rockX, size * 0.4, rockZ],
      [1.3, 0.75, 1],
      8,
    );
  });
  /* Little orange cones keeping the circle clear */
  [-1.3, 1.3].forEach((coneX) => {
    builder.cylinder("paint", "#ff8a2a", {
      radius: 0.14,
      radiusEnd: 0.02,
      length: 0.42,
      at: [coneX, 0.21, padAt.z + 2.75],
      segments: 10,
    });
    builder.cylinder("paint", palette.white, {
      radius: 0.095,
      radiusEnd: 0.075,
      length: 0.08,
      at: [coneX, 0.24, padAt.z + 2.75],
      segments: 10,
    });
    builder.box(
      "paint",
      "#ff8a2a",
      [0.34, 0.04, 0.34],
      [coneX, 0.02, padAt.z + 2.75],
    );
  });
};

/** The little friendly alien statue on a plinth, waving (its arm moves). */
const buildAlien = (builder: AttractionBuilder) => {
  const { x, z } = alienAt;
  builder.cylinder("matte", plinthPurple, {
    radius: 0.42,
    radiusEnd: 0.36,
    length: 0.35,
    at: [x, 0.175, z],
    segments: builder.isFar ? 8 : 20,
  });
  builder.sphere(
    "paint",
    alienGreen,
    0.26,
    [x, 0.72, z],
    [1, 1.3, 1],
    builder.isFar ? 6 : 16,
  );
  builder.sphere(
    "paint",
    alienGreen,
    0.3,
    [x, 1.25, z],
    [1.15, 1, 1],
    builder.isFar ? 6 : 18,
  );
  if (builder.isFar) {
    return;
  }
  builder.torus("metal", palette.brass, 0.4, 0.03, [x, 0.35, z], "y", 20);
  /* Three big eyes and a smile */
  [-0.14, 0, 0.14].forEach((side) => {
    const up = side === 0 ? 1.36 : 1.27;
    builder.sphere(
      "paint",
      palette.white,
      0.075,
      [x + side, up, z + 0.25],
      [1, 1, 0.6],
      10,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.038,
      [x + side, up, z + 0.3],
      [1, 1, 0.6],
      8,
    );
  });
  builder.torus("paint", "#2c5a24", 0.07, 0.015, [x, 1.13, z + 0.27], "z", 10);
  /* Antennae with glowing tips */
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      alienGreen,
      [x + side * 0.1, 1.5, z],
      [x + side * 0.22, 1.78, z],
      0.035,
      5,
    );
    builder.sphere(
      "glow",
      lightPink,
      0.06,
      [x + side * 0.22, 1.8, z],
      [1, 1, 1],
      8,
    );
  });
  /* The other arm on its hip, and two stubby feet */
  builder.bar(
    "paint",
    alienGreen,
    [x - 0.2, 0.85, z],
    [x - 0.36, 0.62, z + 0.05],
    0.09,
    8,
  );
  [-0.1, 0.1].forEach((side) => {
    builder.sphere(
      "paint",
      shade(alienGreen, 0.85),
      0.1,
      [x + side, 0.4, z + 0.08],
      [1, 0.6, 1.4],
      8,
    );
  });
  /* A tiny plaque */
  builder.box("paint", lightGold, [0.3, 0.12, 0.02], [x, 0.2, z + 0.4]);
};

const buildWavingArm = (builder: AttractionBuilder) => {
  builder.bar("paint", alienGreen, [0, 0, 0], [0.2, 0.32, 0], 0.09, 8);
  builder.sphere("paint", alienGreen, 0.075, [0.22, 0.36, 0], [1, 1, 0.6], 10);
  [-0.05, 0.02, 0.09].forEach((side) => {
    builder.bar(
      "paint",
      alienGreen,
      [0.22 + side * 0.6, 0.38, 0],
      [0.22 + side, 0.47, 0],
      0.03,
      5,
    );
  });
};

const rampFoot = {
  x: padAt.x,
  z: hatchAt[2] + Math.cos(rampAngle) * rampLength,
};

export const ufoLandingModel: CuriosityModel = {
  kind: "ufo-landing",
  islandId: "starfall-isle",
  name: "UFO Landing Site",
  fact: "Light travels in straight lines, which is why a beam of light from a torch, or this flying saucer, shines straight down without bending. Scientists have never found aliens, but they search the sky with telescopes and radio dishes, and some planets round other stars might have the right conditions for life.",
  curriculumLink:
    "Science, Year 6: light. Recognise that light appears to travel in straight lines.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: -1.8, z: 3.6 },
  build: (builder) => {
    buildLandingCircle(builder);
    buildAlien(builder);
    if (builder.isFar) {
      buildStillSaucer(builder);
    }
    addSignBoard(builder, [-1.8, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "saucer",
      pivot: saucerPivot,
      build: buildSaucer,
      motion: { kind: "bob", height: 0.08, period: 3.4 },
    },
    {
      name: "beam",
      pivot: [padAt.x, hoverHeight - 0.42, padAt.z],
      build: buildBeam,
      motion: { kind: "spin", axis: "y", speed: 0.4 },
      look: "beam",
    },
    {
      name: "ramp",
      pivot: hatchAt,
      build: buildRamp,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.12,
        period: 3.0,
      },
    },
    {
      name: "waving-arm",
      pivot: armPivot,
      build: buildWavingArm,
      motion: { kind: "nod", axis: "z", reach: 6, amplitude: 0.5, period: 1.1 },
    },
  ],
  blockers: [
    { x: alienAt.x, z: alienAt.z, radius: 0.5 },
    { x: rampFoot.x, z: rampFoot.z - 0.3, radius: 0.4 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Wave to the aliens",
    news: "Bleep bloop! The little alien waved back, the saucer's lights twinkled, and a beam of light shone straight down to the ground.",
    tune: [76, 81, 79, 72, 84],
  },
};
