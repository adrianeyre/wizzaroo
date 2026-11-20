import {
  Euler,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from "three";
import {
  addBench,
  addSignBoard,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const plinthStone = "#b9b6c8";
const plinthDark = "#8d89a3";
const moonLit = "#f3eedb";
const moonGlow = "#fff6cf";
const moonDark = "#2a2d45";
const sunGold = "#ffcf4a";
const sunGlow = "#ffe27a";
const nightBlue = "#1f2a5c";
const cosmicPurple = "#5b3a8c";
const silver = "#c9cfd8";
const gravel = "#cfc9d9";
const earthBlue = "#2f74c8";
const earthGreen = "#4fa54a";
const signColour = "#3a2f7a";

const ringRadius = 3.0;
const plinthHeight = 0.95;
const moonRadius = 0.3;
const moonHeight = plinthHeight + 0.42;
const sunHeight = 1.7;
const orreryAt = { x: -3.55, z: -2.55 };
const orreryTop = 1.05;

/*
 * Eight phases round the ring, each shown to a visitor looking in from
 * outside. `lit` is the angle between the visitor and the sunlit half:
 * 0 is a full Moon, a half turn a new Moon. Waxing Moons are lit on the
 * right, as seen from the northern half of the Earth.
 */
const phases: readonly { name: string; lit: number }[] = [
  { name: "new", lit: Math.PI },
  { name: "waxing crescent", lit: -Math.PI * 0.75 },
  { name: "first quarter", lit: -Math.PI * 0.5 },
  { name: "waxing gibbous", lit: -Math.PI * 0.25 },
  { name: "full", lit: 0 },
  { name: "waning gibbous", lit: Math.PI * 0.25 },
  { name: "last quarter", lit: Math.PI * 0.5 },
  { name: "waning crescent", lit: Math.PI * 0.75 },
];

/** The plinths start at the back of the ring and go round clockwise from above. */
const plinthAngle = (index: number) =>
  Math.PI + ((index + 0.5) / phases.length) * Math.PI * 2;

const plinthSpot = (index: number) => ({
  x: Math.sin(plinthAngle(index)) * ringRadius,
  z: Math.cos(plinthAngle(index)) * ringRadius,
});

/** Turns +y to point along a direction. */
const turnTowards = (x: number, y: number, z: number): Triple => {
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      new Vector3(x, y, z).normalize(),
    ),
  );
  return [turn.x, turn.y, turn.z];
};

/** Which way the sunlit half of a moon faces, in the garden's units. */
const litDirection = (index: number) => {
  const outward = plinthAngle(index);
  const angle = outward + phases[index].lit;
  return { x: Math.sin(angle), z: Math.cos(angle) };
};

const halfSphere = (radius: number, around: number) =>
  new SphereGeometry(
    radius,
    around,
    Math.max(2, Math.round(around / 4)),
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );

const buildPlinth = (builder: AttractionBuilder, index: number) => {
  const { x, z } = plinthSpot(index);
  const segments = builder.isFar ? 5 : 12;
  if (!builder.isFar) {
    builder.box(
      "matte",
      plinthDark,
      [0.7, 0.16, 0.7],
      [x, 0.08, z],
      [0, plinthAngle(index), 0],
    );
  }
  builder.cylinder("matte", plinthStone, {
    radius: 0.22,
    radiusEnd: 0.18,
    length: plinthHeight - 0.25,
    at: [x, 0.16 + (plinthHeight - 0.25) / 2, z],
    segments,
  });
  if (!builder.isFar) {
    builder.box(
      "matte",
      plinthDark,
      [0.58, 0.12, 0.58],
      [x, plinthHeight - 0.03, z],
      [0, plinthAngle(index), 0],
    );
  }
  /* The moon itself: a sunlit half and a dark half */
  const lit = litDirection(index);
  const moonAt: Triple = [x, moonHeight, z];
  if (builder.isFar) {
    builder.sphere("paint", moonLit, moonRadius, moonAt, [1, 1, 1], 6);
    return;
  }
  const moonSegments = 16;
  builder.add("paint", moonLit, halfSphere(moonRadius, moonSegments), {
    at: moonAt,
    rotation: turnTowards(lit.x, 0, lit.z),
  });
  builder.add("matte", moonDark, halfSphere(moonRadius, moonSegments), {
    at: moonAt,
    rotation: turnTowards(-lit.x, 0, -lit.z),
  });
  /* A cup the moon sits in, and a little stem */
  builder.cylinder("metal", silver, {
    radius: 0.05,
    length: 0.18,
    at: [x, plinthHeight + 0.12, z],
    segments: 8,
  });
  builder.cylinder("metal", silver, {
    radius: 0.16,
    radiusEnd: 0.08,
    length: 0.08,
    at: [x, plinthHeight + 0.19, z],
    segments: 12,
    isOpen: true,
  });
  /* Craters on the sunlit side */
  [
    [0.35, 0.2, 0.05],
    [-0.25, -0.15, 0.04],
    [0.1, -0.35, 0.035],
  ].forEach(([across, up, size]) => {
    const side = {
      x: Math.cos(plinthAngle(index)),
      z: -Math.sin(plinthAngle(index)),
    };
    const outward = {
      x: Math.sin(plinthAngle(index)),
      z: Math.cos(plinthAngle(index)),
    };
    const depth = Math.sqrt(Math.max(0, 1 - across * across - up * up));
    const nx = side.x * across + outward.x * depth;
    const nz = side.z * across + outward.z * depth;
    if (nx * lit.x + nz * lit.z < 0.15) {
      return;
    }
    builder.sphere(
      "matte",
      shade(moonLit, 0.82),
      size,
      [x + nx * moonRadius, moonHeight + up * moonRadius, z + nz * moonRadius],
      [1, 1, 1],
      6,
    );
  });
  /* A name plate on the front of the plinth, facing out */
  const outward = plinthAngle(index);
  builder.box(
    "paint",
    nightBlue,
    [0.4, 0.18, 0.03],
    [x + Math.sin(outward) * 0.23, 0.6, z + Math.cos(outward) * 0.23],
    [0, outward, 0],
  );
  builder.box(
    "glow",
    moonGlow,
    [0.26, 0.03, 0.01],
    [x + Math.sin(outward) * 0.25, 0.6, z + Math.cos(outward) * 0.25],
    [0, outward, 0],
  );
};

/** The glowing sunlit caps, which light up as a visitor comes near. */
const buildMoonlight = (builder: AttractionBuilder) => {
  phases.forEach((_, index) => {
    const { x, z } = plinthSpot(index);
    const lit = litDirection(index);
    builder.add("glow", moonGlow, halfSphere(moonRadius + 0.02, 12), {
      at: [x, moonHeight - sunHeight, z],
      rotation: turnTowards(lit.x, 0, lit.z),
    });
  });
};

/** The sun lamp in the middle, on a column. */
const buildSunLamp = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 8 : 20;
  builder.cylinder("matte", plinthDark, {
    radius: 0.55,
    radiusEnd: 0.48,
    length: 0.2,
    at: [0, 0.1, 0],
    segments,
  });
  builder.cylinder("metal", silver, {
    radius: 0.12,
    radiusEnd: 0.09,
    length: sunHeight - 0.5,
    at: [0, 0.2 + (sunHeight - 0.5) / 2, 0],
    segments,
  });
  builder.sphere(
    "glow",
    sunGlow,
    0.38,
    [0, sunHeight, 0],
    [1, 1, 1],
    builder.isFar ? 8 : 18,
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", palette.brass, {
    radius: 0.2,
    radiusEnd: 0.1,
    length: 0.16,
    at: [0, sunHeight - 0.42, 0],
    segments: 16,
  });
  [0.45, 0.9].forEach((height) => {
    builder.torus("metal", palette.brass, 0.11, 0.025, [0, height, 0], "y", 14);
  });
};

/* The rays point outward: turn each cone to lie flat along its angle. */
const buildRays = (builder: AttractionBuilder) => {
  builder.torus("metal", palette.brass, 0.5, 0.025, [0, 0, 0], "y", 24);
  for (let index = 0; index < 12; index++) {
    const angle = (index / 12) * Math.PI * 2;
    const isLong = index % 2 === 0;
    const length = isLong ? 0.34 : 0.22;
    const inner = 0.5;
    builder.bar(
      "paint",
      isLong ? sunGold : shade(sunGold, 0.88),
      [Math.sin(angle) * inner, 0, Math.cos(angle) * inner],
      [
        Math.sin(angle) * (inner + length),
        0,
        Math.cos(angle) * (inner + length),
      ],
      0.07,
      6,
    );
  }
};

const buildPaths = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 20 : 56;
  builder.add(
    "matte",
    gravel,
    new RingGeometry(ringRadius - 0.75, ringRadius + 0.75, segments, 1).rotateX(
      -Math.PI / 2,
    ),
    { at: [0, 0.02, 0] },
  );
  builder.box("matte", gravel, [1.1, 0.04, 1.3], [0, 0.02, ringRadius + 1.3]);
  if (builder.isFar) {
    return;
  }
  /* Inner lawn edged with a stone kerb, and stepping stones to the sun */
  builder.cylinder("matte", plinthDark, {
    radius: ringRadius - 0.75,
    length: 0.1,
    at: [0, 0.05, 0],
    segments: 48,
    isOpen: true,
  });
  builder.cylinder("matte", plinthDark, {
    radius: ringRadius + 0.75,
    length: 0.1,
    at: [0, 0.05, 0],
    segments: 56,
    isOpen: true,
  });
  [1.1, 1.6].forEach((z) => {
    builder.cylinder("matte", shade(plinthStone, 1.05), {
      radius: 0.22,
      length: 0.05,
      at: [0, 0.03, z],
      segments: 12,
    });
  });
  /* Little star-shaped lights set in the path between the plinths */
  phases.forEach((_, index) => {
    const angle = plinthAngle(index) + Math.PI / phases.length;
    builder.cylinder("glow", index % 2 === 0 ? moonGlow : "#bfe6ff", {
      radius: 0.07,
      length: 0.04,
      at: [Math.sin(angle) * ringRadius, 0.04, Math.cos(angle) * ringRadius],
      segments: 5,
    });
  });
  /* Silver-leaved shrubs and purple flowers round the outside */
  listRingPoints(4.4, 10).forEach((point, index) => {
    if (
      point.z > 3.3 ||
      Math.hypot(point.x - orreryAt.x, point.z - orreryAt.z) < 1
    ) {
      return;
    }
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#6c7fa6" : "#5b6f8f",
      0.36,
      [point.x, 0.22, point.z],
      [1.15, 0.8, 1],
      10,
    );
    builder.sphere(
      "paint",
      index % 2 === 0 ? cosmicPurple : "#c58bff",
      0.08,
      [point.x + 0.2, 0.42, point.z + 0.1],
      [1, 1, 1],
      6,
    );
  });
  addBench(builder, [3.6, 0, -2.4], -Math.PI * 0.7, cosmicPurple);
};

/** A little Earth and Moon model, to show the Moon going round the Earth. */
const buildOrreryStand = (builder: AttractionBuilder) => {
  const { x, z } = orreryAt;
  builder.cylinder("matte", plinthDark, {
    radius: 0.35,
    length: 0.12,
    at: [x, 0.06, z],
    segments: builder.isFar ? 6 : 16,
  });
  builder.cylinder("metal", silver, {
    radius: 0.05,
    length: orreryTop - 0.25,
    at: [x, 0.12 + (orreryTop - 0.25) / 2, z],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "metal",
    palette.brass,
    0.62,
    0.015,
    [x, orreryTop, z],
    "y",
    24,
  );
};

const buildEarth = (builder: AttractionBuilder) => {
  builder.sphere("paint", earthBlue, 0.24, [0, 0, 0], [1, 1, 1], 16);
  [
    [0.18, 0.08, 0.12, 0.11],
    [-0.15, 0.1, -0.14, 0.1],
    [0.05, -0.12, -0.2, 0.09],
    [-0.2, -0.05, 0.12, 0.08],
  ].forEach(([x, y, z, size]) => {
    builder.sphere("matte", earthGreen, size, [x, y, z], [1, 0.55, 1], 8);
  });
  builder.sphere("matte", palette.white, 0.09, [0, 0.21, 0], [1, 0.4, 1], 8);
};

const buildLittleMoon = (builder: AttractionBuilder) => {
  builder.sphere("paint", silver, 0.08, [0, 0, 0], [1, 1, 1], 12);
};

export const moonPhaseGardenModel: CuriosityModel = {
  kind: "moon-phase-garden",
  islandId: "starfall-isle",
  name: "Moon Phase Garden",
  fact: "The Moon does not make its own light: the Sun always lights up half of it. As the Moon travels round the Earth, about once a month, we see different amounts of its sunlit half. These shapes are called phases, from new Moon to crescent, quarter, gibbous and full Moon.",
  curriculumLink:
    "Science, Year 5: Earth and space. Describe the movement of the Moon relative to the Earth, and use the idea of the Earth's rotation to explain day and night.",
  footprint: 5,
  setting: "inland",
  signSpot: { x: 1.5, z: 4.4 },
  build: (builder) => {
    buildPaths(builder);
    phases.forEach((_, index) => {
      buildPlinth(builder, index);
    });
    buildSunLamp(builder);
    if (builder.isFar) {
      builder.cylinder("paint", sunGold, {
        radius: 0.85,
        radiusEnd: 0.85,
        length: 0.06,
        at: [0, sunHeight, 0],
        segments: 10,
      });
    }
    buildOrreryStand(builder);
    addSignBoard(builder, [1.5, 0, 4.4], signColour);
  },
  moving: [
    {
      name: "moonlight",
      pivot: [0, sunHeight, 0],
      build: buildMoonlight,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "sun-rays",
      pivot: [0, sunHeight, 0],
      build: buildRays,
      motion: { kind: "whirl", axis: "y", idle: 0.2, speed: 1.4, reach: 7 },
    },
    {
      name: "earth",
      pivot: [orreryAt.x, orreryTop + 0.12, orreryAt.z],
      build: buildEarth,
      motion: { kind: "spin", axis: "y", speed: 1.2 },
    },
    {
      name: "little-moon",
      pivot: [orreryAt.x, orreryTop + 0.12, orreryAt.z],
      build: buildLittleMoon,
      motion: { kind: "orbit", axis: "y", radius: 0.62, count: 1, speed: 0.5 },
    },
  ],
  blockers: [
    { x: 0, z: 0, radius: 0.65 },
    ...phases.map((_, index) => ({ ...plinthSpot(index), radius: 0.42 })),
    { x: orreryAt.x, z: orreryAt.z, radius: 0.45 },
    { x: 3.6, z: -2.4, radius: 0.6 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Name the phases",
    news: "New, crescent, quarter, gibbous, full! The Moon goes through all its phases in about 29 and a half days.",
  },
};
