import {
  CatmullRomCurve3,
  IcosahedronGeometry,
  RingGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import {
  addBench,
  addSignBoard,
  palette,
  type AttractionBuilder,
  type LocalSpot,
  type PlayRide,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

/*
 * A spiral tube slide that whirls down round a black hole. The
 * Character climbs the stair round the star tower, dives into the tube
 * and spirals down through the glowing accretion disc, faster and
 * faster, until it plunges into the black hole itself and pops out of
 * a wormhole on the far side. Rocks orbit the hole, the disc spins up
 * as you come near, and jets of light shoot out of its poles.
 */

const midnight = "#1b2350";
const midnightDeep = "#10163a";
const holeBlack = "#06060c";
const violet = "#6a3fd0";
const cyan = "#3fb8d0";
const glowCyan = "#7ff3ff";
const glowViolet = "#b48cff";
const glowGold = "#ffc85a";
const silver = "#c9cfd8";
const padColour = "#2a3158";
const signColour = "#2b2f6b";

const footprint = 9;

/* The black hole, in the middle */
const holeRadius = 1.5;
const holeY = 0.6;
const discY = 1.0;

/* The tube spirals 1.75 times round the middle, from the tower's platform to the hole */
const tower = { x: 0, z: -5.2 };
const towerRadius = 1.0;
const towerTop = 5.0;
const tubeRadius = 0.45;
const spiralRadius = 3.6;
const spiralTop = 5.0;
const spiralBottom = 0.75;
const turns = 1.75;
const startAngle = Math.PI;

const spiralPoint = (share: number): Triple => {
  const angle = startAngle + share * turns * Math.PI * 2;
  /* The last stretch curls in to the hole */
  const curl = Math.max(0, (share - 0.86) / 0.14);
  const reach = spiralRadius - (spiralRadius - holeRadius + 0.2) * curl ** 1.6;
  const y = spiralTop - (spiralTop - spiralBottom) * share ** 0.9;
  return [Math.sin(angle) * reach, y, Math.cos(angle) * reach];
};

const tubePoints = (count: number): Triple[] => [
  [0, spiralTop + 0.05, tower.z + towerRadius + 0.1],
  ...Array.from({ length: count + 1 }, (_, step) => spiralPoint(step / count)),
];

/* The black hole and its disc */

const buildHole = (builder: AttractionBuilder) => {
  builder.sphere("paint", holeBlack, holeRadius, [0, holeY, 0], [1, 1, 1], 24);
  /* The bright photon ring round its edge */
  builder.torus(
    "glow",
    glowViolet,
    holeRadius + 0.04,
    0.06,
    [0, holeY, 0],
    "y",
    builder.segments(36, 16),
  );
  builder.torus(
    "glow",
    "#ffe3a8",
    holeRadius + 0.12,
    0.03,
    [0, holeY + 0.06, 0],
    "y",
    builder.segments(36, 16),
  );
  /* A plinth of dark stone and a ring of glowing markers round it */
  builder.cylinder("matte", midnightDeep, {
    radius: 3.2,
    radiusEnd: 3.3,
    length: 0.12,
    at: [0, 0.06, 0],
    segments: builder.segments(40, 16),
  });
  if (builder.isFar) {
    return;
  }
  for (let marker = 0; marker < 16; marker++) {
    const angle = (marker / 16) * Math.PI * 2;
    builder.box(
      "glow",
      marker % 2 === 0 ? glowCyan : glowViolet,
      [0.18, 0.03, 0.06],
      [Math.sin(angle) * 3.1, 0.13, Math.cos(angle) * 3.1],
      [0, angle, 0],
    );
  }
  /* The wormhole's exit on the far side */
  builder.torus(
    "paint",
    violet,
    0.62,
    0.12,
    [-holeRadius - 0.05, 0.62, 0],
    "x",
    18,
  );
  builder.cylinder("glow", "#2a1a5a", {
    radius: 0.6,
    length: 0.04,
    at: [-holeRadius - 0.02, 0.62, 0],
    axis: "x",
    segments: 18,
  });
};

/* The tube slide and its supports */

const buildTube = (builder: AttractionBuilder) => {
  const curve = new CatmullRomCurve3(
    tubePoints(builder.isFar ? 14 : 36).map(
      ([x, y, z]) => new Vector3(x, y, z),
    ),
  );
  const tube = new TubeGeometry(
    curve,
    builder.segments(96, 36),
    tubeRadius,
    builder.isFar ? 6 : 12,
    false,
  );
  builder.painted(
    tube,
    (centre) => {
      const angle = Math.atan2(centre.x, centre.z);
      const band = Math.floor((angle + Math.PI) * 3 + centre.y * 0.8) % 2 === 0;
      return { colour: band ? violet : cyan, finish: "paint" };
    },
    {},
    "paint",
  );
  /* A dark mouth at the top, where you dive in */
  builder.torus(
    "paint",
    silver,
    tubeRadius + 0.02,
    0.06,
    [0, spiralTop + 0.05, tower.z + towerRadius + 0.1],
    "z",
    16,
  );
  builder.cylinder("matte", holeBlack, {
    radius: tubeRadius,
    length: 0.02,
    at: [0, spiralTop + 0.05, tower.z + towerRadius + 0.12],
    axis: "z",
    segments: 16,
  });
  /* Legs under the tube, every so often */
  const legs = builder.isFar ? 5 : 11;
  for (let leg = 1; leg < legs; leg++) {
    const share = (leg / legs) * 0.88;
    const [x, y, z] = spiralPoint(share);
    builder.bar("metal", silver, [x, y - tubeRadius, z], [x, 0, z], 0.1, 6);
    if (!builder.isFar) {
      builder.cylinder("metal", palette.darkSteel, {
        radius: 0.18,
        length: 0.06,
        at: [x, 0.03, z],
        segments: 8,
      });
      builder.torus(
        "metal",
        silver,
        tubeRadius + 0.04,
        0.035,
        [x, y, z],
        "y",
        12,
      );
    }
  }
};

/* The star tower, its stair and platform */

const stairSteps = 22;
const stairTurns = 1.4;
const stairStart = Math.PI / 2;
const stairAt = (share: number, reach: number): Triple => {
  const angle = stairStart + share * stairTurns * Math.PI * 2;
  return [
    tower.x + Math.sin(angle) * reach,
    0.2 + share * (towerTop - 0.2),
    tower.z + Math.cos(angle) * reach,
  ];
};

const buildTower = (builder: AttractionBuilder) => {
  builder.cylinder("paint", midnight, {
    radius: towerRadius,
    radiusEnd: towerRadius * 0.92,
    length: towerTop,
    at: [tower.x, towerTop / 2, tower.z],
    segments: builder.segments(20, 10),
  });
  /* The platform at the top, with a rail all round */
  builder.cylinder("paint", silver, {
    radius: 1.45,
    length: 0.14,
    at: [tower.x, towerTop - 0.07, tower.z],
    segments: builder.segments(20, 10),
  });
  builder.torus(
    "metal",
    silver,
    1.42,
    0.035,
    [tower.x, towerTop + 0.85, tower.z],
    "y",
    builder.segments(24, 12),
  );
  /* The star on its spike above */
  builder.cylinder("metal", silver, {
    radius: 0.05,
    length: 1.8,
    at: [tower.x, towerTop + 0.9, tower.z - 0.4],
    segments: 6,
  });
  builder.add("glow", glowGold, new IcosahedronGeometry(0.42, 0), {
    at: [tower.x, towerTop + 2.0, tower.z - 0.4],
    scale: [1, 1, 0.6],
  });
  /* The stair winding round the outside */
  const steps = builder.isFar ? 8 : stairSteps;
  for (let step = 0; step < steps; step++) {
    const share = step / (steps - 1);
    const angle = stairStart + share * stairTurns * Math.PI * 2;
    const [x, y, z] = stairAt(share, towerRadius + 0.32);
    builder.box(
      "paint",
      step % 2 === 0 ? violet : cyan,
      [0.62, 0.08, 0.36],
      [x, y, z],
      [0, angle + Math.PI / 2, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Rail posts along the stair, and round the platform */
  for (let post = 0; post < stairSteps; post += 2) {
    const [x, y, z] = stairAt(post / (stairSteps - 1), towerRadius + 0.6);
    builder.cylinder("metal", silver, {
      radius: 0.025,
      length: 0.8,
      at: [x, y + 0.4, z],
      segments: 5,
    });
  }
  const rail = Array.from({ length: 13 }, (_, index): Triple => {
    const [x, y, z] = stairAt(index / 12, towerRadius + 0.6);
    return [x, y + 0.8, z];
  });
  rail.slice(1).forEach((to, index) => {
    builder.bar("metal", silver, rail[index], to, 0.035, 4);
  });
  for (let post = 0; post < 12; post++) {
    const angle = (post / 12) * Math.PI * 2;
    if (Math.abs(Math.sin(angle)) < 0.3 && Math.cos(angle) > 0) {
      continue;
    }
    builder.cylinder("metal", silver, {
      radius: 0.025,
      length: 0.85,
      at: [
        tower.x + Math.sin(angle) * 1.42,
        towerTop + 0.43,
        tower.z + Math.cos(angle) * 1.42,
      ],
      segments: 5,
    });
  }
  /* Twinkling star windows round the tower, and its door */
  for (let star = 0; star < 18; star++) {
    const angle = star * 2.3999;
    const y = 0.6 + ((star * 0.61) % 4.2);
    builder.box(
      "glow",
      star % 3 === 0 ? glowGold : star % 3 === 1 ? glowCyan : palette.white,
      [0.08, 0.08, 0.02],
      [
        tower.x +
          Math.sin(angle) * (towerRadius * (1 - (y / towerTop) * 0.08) + 0.005),
        y,
        tower.z +
          Math.cos(angle) * (towerRadius * (1 - (y / towerTop) * 0.08) + 0.005),
      ],
      [0, angle, Math.PI / 4],
    );
  }
  builder.box(
    "paint",
    violet,
    [0.04, 1.1, 0.6],
    [tower.x + towerRadius + 0.01, 0.55, tower.z],
  );
  builder.box(
    "glow",
    glowViolet,
    [0.03, 0.06, 0.66],
    [tower.x + towerRadius + 0.02, 1.12, tower.z],
  );
};

/* Round about: planets on posts, benches and lamps */

const buildGrounds = (builder: AttractionBuilder) => {
  /* A starry path to the front */
  builder.box(
    "matte",
    midnightDeep,
    [1.3, 0.03, 4.6],
    [2.6, 0.015, 5.6],
    [0, 0.35, 0],
  );
  const planets: [number, number, number, string][] = [
    [-5.4, 2.6, 0.45, "#d9a65a"],
    [-4.6, 5.0, 0.32, "#c86a4a"],
    [5.6, -2.0, 0.55, "#5a8ad9"],
  ];
  planets.forEach(([x, z, size, colour], index) => {
    builder.cylinder("metal", silver, {
      radius: 0.05,
      length: 1.6,
      at: [x, 0.8, z],
      segments: 6,
    });
    builder.sphere("paint", colour, size, [x, 1.6 + size, z], [1, 1, 1], 14);
    if (index === 0) {
      builder.torus(
        "paint",
        "#e8d0a0",
        size * 1.6,
        0.04,
        [x, 1.6 + size, z],
        "y",
        18,
      );
    }
  });
  addBench(builder, [-3.0, 0, 6.2], Math.PI - 0.5, violet);
  addBench(builder, [5.4, 0, 3.0], -Math.PI / 2 - 0.4, cyan);
  if (builder.isFar) {
    return;
  }
  for (let star = 0; star < 9; star++) {
    builder.box(
      "glow",
      star % 2 === 0 ? glowGold : glowCyan,
      [0.1, 0.035, 0.1],
      [
        2.6 + Math.sin(0.35) * (star * 0.5 - 2),
        0.035,
        5.6 + Math.cos(0.35) * (star * 0.5 - 2),
      ],
      [0, star, 0],
    );
  }
  /* Lamps with glowing globes */
  [
    [4.4, 5.6],
    [-1.6, 6.8],
    [-5.6, -2.4],
  ].forEach(([x, z], index) => {
    builder.cylinder("paint", midnight, {
      radius: 0.05,
      length: 2.2,
      at: [x, 1.1, z],
      segments: 8,
    });
    builder.sphere(
      "glow",
      index % 2 === 0 ? glowCyan : glowViolet,
      0.2,
      [x, 2.3, z],
      [1, 1, 1],
      8,
    );
    builder.torus("metal", silver, 0.24, 0.02, [x, 2.3, z], "y", 12);
  });
  /* Nebula flower beds in pink and violet */
  [
    [-2.6, 4.6],
    [4.8, -4.4],
  ].forEach(([x, z]) => {
    builder.cylinder("matte", palette.soil, {
      radius: 0.7,
      length: 0.1,
      at: [x, 0.05, z],
      segments: 12,
    });
    for (let flower = 0; flower < 7; flower++) {
      const angle = flower * 2.4;
      builder.sphere(
        "matte",
        flower % 2 === 0 ? "#e86ad0" : "#9a6aff",
        0.12,
        [x + Math.sin(angle) * 0.4, 0.22, z + Math.cos(angle) * 0.4],
        [1, 0.8, 1],
        6,
      );
    }
  });
};

/* Moving parts */

const buildDisc = (builder: AttractionBuilder) => {
  builder.add(
    "glow",
    "#ff9a3a",
    new RingGeometry(
      holeRadius + 0.3,
      2.3,
      builder.segments(40, 16),
      1,
    ).rotateX(-Math.PI / 2),
    { at: [0, 0.02, 0] },
  );
  builder.add(
    "glow",
    "#ff5a8a",
    new RingGeometry(
      holeRadius + 0.3,
      2.3,
      builder.segments(40, 16),
      1,
    ).rotateX(Math.PI / 2),
    { at: [0, 0.0, 0] },
  );
  builder.torus(
    "glow",
    glowViolet,
    2.6,
    0.08,
    [0, 0.01, 0],
    "y",
    builder.segments(28, 14),
  );
  if (builder.isFar) {
    return;
  }
  /* Glowing clumps of gas swirling round in spiral arms */
  for (let clump = 0; clump < 14; clump++) {
    const angle = clump * 0.9;
    const reach = 1.95 + (clump % 4) * 0.2;
    builder.sphere(
      "glow",
      clump % 3 === 0 ? glowGold : clump % 3 === 1 ? "#ff7a5a" : glowViolet,
      0.12,
      [Math.sin(angle) * reach, 0.03, Math.cos(angle) * reach],
      [1.8, 0.4, 1],
      6,
    );
  }
};

const buildRock = (builder: AttractionBuilder) => {
  builder.add("matte", "#8a8494", new IcosahedronGeometry(0.22, 1), {
    scale: [1.2, 0.85, 1],
  });
  builder.sphere("glow", "#ff9a3a", 0.08, [-0.18, 0, 0.05], [2, 0.6, 0.6], 6);
};

const buildJets = (builder: AttractionBuilder) => {
  builder.cylinder("glow", glowCyan, {
    radius: 0.05,
    radiusEnd: 0.32,
    length: 3.2,
    at: [0, 1.6, 0],
    segments: 12,
    isOpen: true,
  });
  builder.cylinder("glow", palette.white, {
    radius: 0.02,
    radiusEnd: 0.12,
    length: 3.0,
    at: [0, 1.5, 0],
    segments: 8,
  });
};

const buildHalo = (builder: AttractionBuilder) => {
  builder.torus("glow", glowViolet, holeRadius + 0.5, 0.25, [0, 0, 0], "y", 28);
};

/* Wanderers: little stars drifting about above */

const buildStar = (builder: AttractionBuilder) => {
  builder.add("glow", glowGold, new IcosahedronGeometry(0.12, 0), {
    scale: [1, 1, 0.5],
  });
};

/* The ride: up the stair, down the tube, into the hole and out of the wormhole */

const followPath = (
  points: readonly (readonly [number, number, number, number?])[],
  progress: number,
): LocalSpot => {
  const legs = points.slice(1).map((to, index) => {
    const from = points[index];
    return {
      from,
      to,
      length:
        Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) +
        (from[3] ?? 0),
    };
  });
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  let left = Math.min(1, Math.max(0, progress)) * total;
  let heading = 0;
  for (const leg of legs) {
    const flat = Math.hypot(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    if (flat > 0.05) {
      heading = Math.atan2(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    }
    if (left <= leg.length || leg === legs[legs.length - 1]) {
      const wait = leg.from[3] ?? 0;
      const share = Math.min(
        1,
        Math.max(0, (left - wait) / Math.max(0.001, leg.length - wait)),
      );
      return {
        x: leg.from[0] + (leg.to[0] - leg.from[0]) * share,
        y: leg.from[1] + (leg.to[1] - leg.from[1]) * share,
        z: leg.from[2] + (leg.to[2] - leg.from[2]) * share,
        heading,
      };
    }
    left -= leg.length;
  }
  return { x: 0, y: 0, z: 0, heading };
};

const slideStart = { x: tower.x + 2.1, z: tower.z + 0.6 };
const slideFinish = { x: -4.4, z: 0.4 };

const climbPath: (readonly [number, number, number, number?])[] = [
  [slideStart.x, 0, slideStart.z],
  ...Array.from({ length: 15 }, (_, index) => {
    const [x, y, z] = stairAt(index / 14, towerRadius + 0.32);
    return [x, y + 0.05, z] as const;
  }),
  [0, towerTop + 0.05, tower.z + 0.6, 1],
  [0, spiralTop, tower.z + towerRadius + 0.1],
];

/** The climb takes this share of the ride; the slide speeds up after it. */
const climbShare = 0.42;

const slideFollow = (progress: number): LocalSpot => {
  if (progress < climbShare) {
    return followPath(climbPath, progress / climbShare);
  }
  const share = (progress - climbShare) / (1 - climbShare);
  if (share < 0.7) {
    const along = (share / 0.7) ** 1.5;
    const [x, y, z] = spiralPoint(along);
    const [nextX, , nextZ] = spiralPoint(Math.min(1, along + 0.01));
    return {
      x,
      y: y - tubeRadius + 0.08,
      z,
      heading: Math.atan2(nextX - x, nextZ - z),
    };
  }
  const [endX, endY, endZ] = spiralPoint(1);
  return followPath(
    [
      [endX, endY - tubeRadius + 0.08, endZ],
      [0, holeY, 0, 0.8],
      [-holeRadius - 0.3, 0.1, 0],
      [slideFinish.x, 0, slideFinish.z],
    ],
    (share - 0.7) / 0.3,
  );
};

const slideRide: PlayRide = {
  id: "black-hole-slide",
  name: "the black hole slide",
  start: slideStart,
  reach: 0.55,
  seconds: 16,
  finish: slideFinish,
  follow: slideFollow,
};

export const blackHoleSlideModel: NewLandAttractionModel = {
  kind: "black-hole-slide",
  islandId: "starfall-isle",
  name: "Black Hole Slide",
  fact: "Gravity is a force that pulls things towards each other: it is what makes you slide down a slide and keeps the planets going round the Sun. A black hole is a place in space where gravity is so strong that nothing can escape from it, not even light, which is why it looks completely black.",
  curriculumLink:
    "Science, Year 5: forces, and Earth and space. Unsupported objects fall because of the force of gravity, and gravity holds the planets in their orbits.",
  footprint,
  setting: "inland",
  signSpot: { x: 3.4, z: 8.0 },
  padColour,
  build: (builder) => {
    buildHole(builder);
    buildTube(builder);
    buildTower(builder);
    buildGrounds(builder);
    addSignBoard(builder, [3.4, 0, 7.3], signColour, -0.3);
  },
  moving: [
    {
      name: "accretion disc",
      pivot: [0, discY, 0],
      build: buildDisc,
      motion: { kind: "whirl", axis: "y", idle: 0.35, speed: 3.2, reach: 5.5 },
    },
    {
      name: "orbiting rocks",
      pivot: [0, 2.6, 0],
      build: buildRock,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 2.5,
        count: 4,
        speed: 0.9,
        isFacingAlong: true,
        bob: 0.2,
      },
    },
    {
      name: "jets",
      pivot: [0, holeY + holeRadius - 0.05, 0],
      build: buildJets,
      motion: { kind: "wake", reach: 4.5 },
    },
    {
      name: "halo",
      pivot: [0, holeY, 0],
      build: buildHalo,
      motion: { kind: "spin", axis: "y", speed: 0.4 },
      look: "halo",
    },
  ],
  wanderers: [
    {
      name: "shooting stars",
      build: buildStar,
      count: 4,
      centre: { x: 0, z: 0 },
      radius: 5,
      speed: 1.2,
      height: 6.5,
      bob: 0.4,
    },
  ],
  rides: [slideRide],
  tune: [84, 79, 76, 72, 67, 64, 60, 72],
  play: {
    label: "Drop a marble in",
    news: "Round and round it rolled, faster and faster, pulled in by gravity, until it vanished into the black hole and popped out of the wormhole!",
  },
};
