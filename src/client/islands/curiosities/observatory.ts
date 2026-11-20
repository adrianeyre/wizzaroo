import { CylinderGeometry, SphereGeometry } from "three";
import {
  addBench,
  addDoor,
  addLampPost,
  addSignBoard,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const wallWhite = "#eef0f5";
const wallShadow = "#cfd5e2";
const domeWhite = "#f6f7fb";
const domeRib = "#c3cad8";
const slitDark = "#151b3a";
const nightBlue = "#1f2a5c";
const cosmicPurple = "#5b3a8c";
const silver = "#c9cfd8";
const starGold = "#ffe58a";
const doorGlow = "#ffd98a";
const chartGlow = "#9fe8ff";
const signColour = "#2b2f6b";

const drumAt = { x: 0, z: -0.7 };
const drumRadius = 2.0;
const drumHeight = 2.5;
const domeRadius = 2.0;
const ledgeRadius = drumRadius + 0.5;
const domePivot: Triple = [drumAt.x, drumHeight + 0.12, drumAt.z];
const slitWidth = 0.62;
const scopeElevation = 0.85;
const doorZ = drumAt.z + drumRadius;
const stepDepth = 0.32;
const stepRise = 0.17;

/** A dome of `radius`, its rim on y = 0. */
const hemisphere = (radius: number, around: number, rows: number) =>
  new SphereGeometry(radius, around, rows, 0, Math.PI * 2, 0, Math.PI / 2);

/** A curved band over the dome from its rim at +z, up and a little past the top. */
const slitBand = (radius: number, width: number, around: number) =>
  new CylinderGeometry(radius, radius, width, around, 1, true, 0, 1.95).rotateZ(
    Math.PI / 2,
  );

const buildDrum = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 14 : 40;
  const { x, z } = drumAt;
  builder.cylinder("matte", palette.darkStone, {
    radius: drumRadius + 0.25,
    radiusEnd: drumRadius + 0.15,
    length: 0.3,
    at: [x, 0.15, z],
    segments,
  });
  builder.cylinder("matte", wallWhite, {
    radius: drumRadius,
    length: drumHeight - 0.3,
    at: [x, 0.3 + (drumHeight - 0.3) / 2, z],
    segments,
  });
  builder.cylinder("paint", silver, {
    radius: ledgeRadius,
    length: 0.14,
    at: [x, drumHeight + 0.05, z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  /* Bands of trim round the drum */
  [1.0].forEach((height) => {
    builder.torus(
      "matte",
      wallShadow,
      drumRadius + 0.01,
      0.04,
      [x, height, z],
      "y",
      36,
    );
  });
  /* Round porthole windows, glowing a little, with silver rims */
  [0.9, -0.9, 2.2, -2.2, Math.PI].forEach((turn) => {
    const radius = drumRadius + 0.02;
    const at: Triple = [
      x + Math.sin(turn) * radius,
      1.45,
      z + Math.cos(turn) * radius,
    ];
    builder.cylinder("glow", "#8fb8ff", {
      radius: 0.26,
      length: 0.06,
      at,
      axis: "z",
      segments: 18,
    });
    builder.add(
      "metal",
      silver,
      new CylinderGeometry(0.3, 0.3, 0.1, 20, 1, true).rotateX(Math.PI / 2),
      { at, rotation: [0, turn, 0] },
    );
  });
  /* Brackets under the walkway ledge */
  listRingPoints(drumRadius + 0.2, 16, drumAt).forEach((point) => {
    const outX = (point.x - x) / (drumRadius + 0.2);
    const outZ = (point.z - z) / (drumRadius + 0.2);
    builder.bar(
      "metal",
      silver,
      [x + outX * drumRadius, drumHeight - 0.5, z + outZ * drumRadius],
      [
        x + outX * (ledgeRadius - 0.1),
        drumHeight - 0.02,
        z + outZ * (ledgeRadius - 0.1),
      ],
      0.05,
      5,
    );
  });
  /* A railed walkway round the top of the drum */
  listRingPoints(ledgeRadius - 0.06, 32, drumAt).forEach((point) => {
    builder.box(
      "metal",
      silver,
      [0.04, 0.45, 0.04],
      [point.x, drumHeight + 0.34, point.z],
    );
  });
  builder.torus(
    "metal",
    silver,
    ledgeRadius - 0.06,
    0.03,
    [x, drumHeight + 0.56, z],
    "y",
    36,
  );
};

/** The dome itself, its slit, shutter rails and the telescope poking out. */
const buildDome = (builder: AttractionBuilder) => {
  builder.add("paint", domeWhite, hemisphere(domeRadius, 40, 12));
  /* Ribs from the rim to the top */
  [0.6, 1.4, 2.2, 3.0, 3.8, 4.6, 5.4].forEach((turn) => {
    builder.add(
      "paint",
      domeRib,
      new CylinderGeometry(
        domeRadius + 0.01,
        domeRadius + 0.01,
        0.06,
        16,
        1,
        true,
        0,
        Math.PI / 2,
      )
        .rotateZ(Math.PI / 2)
        .rotateY(turn),
    );
  });
  builder.torus("paint", domeRib, domeRadius, 0.07, [0, 0.04, 0], "y", 36);
  /* The open slit, dark inside, with rails for the shutters */
  builder.add("matte", slitDark, slitBand(domeRadius + 0.02, slitWidth, 16));
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      shade(domeRib, 0.85),
      slitBand(domeRadius + 0.06, 0.08, 16),
      { at: [side * (slitWidth / 2 + 0.04), 0, 0] },
    );
  });
  /* The opened shutter, folded back over the top */
  builder.add(
    "paint",
    domeWhite,
    new CylinderGeometry(
      domeRadius + 0.1,
      domeRadius + 0.1,
      slitWidth + 0.1,
      10,
      1,
      true,
      2.0,
      0.9,
    ).rotateZ(Math.PI / 2),
  );
  /* The telescope: a big tube on a fork, pointing out of the slit */
  const base: Triple = [0, 0.15, -0.2];
  const along = (distance: number): Triple => [
    0,
    base[1] + Math.sin(scopeElevation) * distance,
    base[2] + Math.cos(scopeElevation) * distance,
  ];
  const tilt: Triple = [Math.PI / 2 - scopeElevation, 0, 0];
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.3,
    length: 0.5,
    at: [0, -0.1, -0.2],
    segments: 14,
  });
  builder.add("paint", "#e9ecf3", new CylinderGeometry(0.26, 0.3, 3.0, 22, 1), {
    at: along(1.6),
    rotation: tilt,
  });
  builder.add(
    "paint",
    nightBlue,
    new CylinderGeometry(0.34, 0.32, 0.55, 22, 1, true),
    { at: along(3.2), rotation: tilt },
  );
  builder.add("glass", "#9ec4ff", new CylinderGeometry(0.28, 0.28, 0.02, 22), {
    at: along(3.0),
    rotation: tilt,
  });
  [0.5, 1.4, 2.4].forEach((distance) => {
    builder.add(
      "metal",
      palette.brass,
      new CylinderGeometry(0.33, 0.33, 0.1, 22, 1, true),
      {
        at: along(distance),
        rotation: tilt,
      },
    );
  });
  /* The little finder scope alongside, and the eyepiece */
  const finder = along(1.9);
  builder.add("paint", nightBlue, new CylinderGeometry(0.07, 0.07, 0.9, 10), {
    at: [0.38, finder[1] - 0.08, finder[2] + 0.05],
    rotation: tilt,
  });
  const eye = along(0.15);
  builder.cylinder("metal", palette.black, {
    radius: 0.06,
    length: 0.3,
    at: [0.3, eye[1] - 0.05, eye[2] + 0.05],
    axis: "x",
    segments: 10,
  });
};

const buildStillDome = (builder: AttractionBuilder) => {
  builder.add("paint", domeWhite, hemisphere(domeRadius, 14, 5), {
    at: domePivot,
  });
  builder.add("matte", slitDark, slitBand(domeRadius + 0.02, slitWidth, 6), {
    at: domePivot,
  });
  builder.bar(
    "paint",
    "#e9ecf3",
    [domePivot[0], domePivot[1] + 0.8, domePivot[2] + 0.6],
    [
      domePivot[0],
      domePivot[1] + 0.15 + Math.sin(scopeElevation) * 3.4,
      domePivot[2] - 0.2 + Math.cos(scopeElevation) * 3.4,
    ],
    0.56,
    8,
  );
};

/** Stone steps up to a glowing open doorway. */
const buildEntrance = (builder: AttractionBuilder) => {
  for (let step = 0; step < 3; step++) {
    builder.box(
      "matte",
      step % 2 === 0 ? palette.stone : shade(palette.stone, 0.92),
      [1.5 - step * 0.1, stepRise * (step + 1), stepDepth],
      [0, (stepRise * (step + 1)) / 2, doorZ + 0.75 - step * stepDepth],
    );
  }
  const sill = stepRise * 3;
  builder.box(
    "glow",
    doorGlow,
    [0.8, 1.4, 0.05],
    [0, sill + 0.7, doorZ + 0.02],
  );
  if (builder.isFar) {
    return;
  }
  /* An arched porch round the doorway */
  builder.box(
    "matte",
    wallShadow,
    [1.25, 1.42, 0.3],
    [0, sill + 0.71, doorZ - 0.08],
  );
  builder.cylinder("matte", wallShadow, {
    radius: 0.62,
    length: 0.3,
    at: [0, sill + 1.42, doorZ - 0.08],
    axis: "z",
    segments: 18,
  });
  builder.box(
    "glow",
    doorGlow,
    [0.8, 1.4, 0.05],
    [0, sill + 0.7, doorZ + 0.08],
  );
  builder.cylinder("glow", doorGlow, {
    radius: 0.4,
    length: 0.05,
    at: [0, sill + 1.4, doorZ + 0.08],
    axis: "z",
    segments: 16,
  });
  /* The door stands open against the porch */
  addDoor(builder, {
    at: [-0.78, sill, doorZ + 0.3],
    width: 0.5,
    height: 1.35,
    colour: cosmicPurple,
    frame: silver,
    turn: Math.PI / 2,
  });
  /* A star over the door */
  builder.sphere(
    "glow",
    starGold,
    0.12,
    [0, sill + 1.78, doorZ + 0.1],
    [1, 1, 0.4],
    10,
  );
  /* Handrails beside the steps */
  [-0.8, 0.8].forEach((side) => {
    builder.bar(
      "metal",
      silver,
      [side, 0.85, doorZ + 0.95],
      [side, 1.35, doorZ + 0.15],
      0.05,
    );
    [doorZ + 0.95, doorZ + 0.15].forEach((z, index) => {
      builder.bar(
        "metal",
        silver,
        [side, 0, z],
        [side, index === 0 ? 0.85 : 1.35, z],
        0.05,
      );
    });
  });
};

/** A star chart on an easel, its stars glowing. */
const addStarChart = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  stars: readonly [number, number][],
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const rotation: Triple = [-0.18, turn, 0];
  builder.box(
    "paint",
    nightBlue,
    [1.0, 0.8, 0.06],
    place(0, 1.15, 0),
    rotation,
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    silver,
    [1.08, 0.05, 0.08],
    place(0, 0.73, 0.08),
    rotation,
  );
  [-0.4, 0.4].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      place(side, 0, 0.2),
      place(side * 0.8, 1.6, -0.02),
      0.05,
    );
  });
  builder.bar(
    "matte",
    palette.darkTimber,
    place(0, 0, -0.45),
    place(0, 1.5, -0.05),
    0.05,
  );
  stars.forEach(([x, y], index) => {
    builder.sphere(
      "glow",
      index % 3 === 0 ? starGold : chartGlow,
      0.03 + (index % 2) * 0.012,
      place(x, 1.15 + y, 0.05 + y * 0.18),
      [1, 1, 0.5],
      6,
    );
  });
  /* Lines joining the stars */
  for (let index = 0; index < stars.length - 1; index++) {
    const [fromX, fromY] = stars[index];
    const [toX, toY] = stars[index + 1];
    builder.bar(
      "glow",
      chartGlow,
      place(fromX, 1.15 + fromY, 0.045 + fromY * 0.18),
      place(toX, 1.15 + toY, 0.045 + toY * 0.18),
      0.012,
      4,
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    palette.paving,
    [1.4, 0.04, 2.6],
    [0, 0.02, doorZ + 2.2],
  );
  if (builder.isFar) {
    return;
  }
  /* Paving slabs edged in silver-grey */
  for (let slab = 0; slab < 5; slab++) {
    builder.box(
      "matte",
      slab % 2 === 0 ? shade(palette.paving, 0.9) : shade(palette.paving, 1.05),
      [1.3, 0.05, 0.46],
      [0, 0.03, doorZ + 1.15 + slab * 0.5],
    );
  }
  addStarChart(builder, [-2.6, 0, 1.9], 0.55, [
    [-0.35, 0.2],
    [-0.15, 0.25],
    [0.0, 0.15],
    [0.15, 0.05],
    [0.35, 0.12],
    [0.3, -0.18],
    [0.08, -0.15],
  ]);
  addStarChart(builder, [2.7, 0, 1.6], -0.6, [
    [-0.3, 0.18],
    [-0.12, -0.05],
    [0.0, 0.2],
    [0.14, -0.05],
    [0.32, 0.18],
  ]);
  addBench(builder, [-3.3, 0, -0.4], Math.PI / 2, cosmicPurple);
  addLampPost(builder, [1.3, 0, doorZ + 2.8], 2.0);
  addLampPost(builder, [-1.3, 0, doorZ + 2.8], 2.0);
  /* A little telescope on a tripod for visitors */
  const tripod: Triple = [3.1, 0, -1.6];
  [0, 2.1, 4.2].forEach((angle) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [tripod[0] + Math.sin(angle) * 0.4, 0, tripod[2] + Math.cos(angle) * 0.4],
      [tripod[0], 1.1, tripod[2]],
      0.04,
      6,
    );
  });
  builder.bar(
    "paint",
    cosmicPurple,
    [tripod[0] - 0.1, 1.05, tripod[2] + 0.35],
    [tripod[0] + 0.1, 1.45, tripod[2] - 0.45],
    0.14,
    12,
  );
  builder.cylinder("metal", palette.brass, {
    radius: 0.09,
    length: 0.12,
    at: [tripod[0] + 0.1, 1.45, tripod[2] - 0.45],
    segments: 12,
  });
  /* Stones in a ring, and moon-white pebbles */
  listRingPoints(4.6, 18).forEach((point, index) => {
    if (point.z > 3.4 && Math.abs(point.x) < 1.2) {
      return;
    }
    builder.sphere(
      "matte",
      index % 2 === 0 ? palette.stone : shade(palette.stone, 1.12),
      0.14 + (index % 3) * 0.04,
      [point.x, 0.04, point.z],
      [1.2, 0.6, 1],
      6,
    );
  });
  /* A planisphere on a post */
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 0.9,
    at: [-3.2, 0.45, -2.0],
    segments: 8,
  });
  builder.cylinder("paint", nightBlue, {
    radius: 0.32,
    length: 0.05,
    at: [-3.2, 0.92, -2.0],
    segments: 24,
  });
  builder.cylinder("paint", silver, {
    radius: 0.34,
    length: 0.03,
    at: [-3.2, 0.9, -2.0],
    segments: 24,
  });
  [0.4, 1.3, 2.5, 3.6, 4.7, 5.6].forEach((angle, index) => {
    builder.sphere(
      "glow",
      index % 2 === 0 ? starGold : chartGlow,
      0.025,
      [-3.2 + Math.sin(angle) * 0.2, 0.96, -2.0 + Math.cos(angle) * 0.2],
      [1, 0.5, 1],
      6,
    );
  });
};

/** A wind vane and cups on the walkway, to record the night's weather. */
const buildAnemometer = (builder: AttractionBuilder) => {
  builder.cylinder("metal", silver, {
    radius: 0.03,
    length: 0.2,
    at: [0, 0.1, 0],
    segments: 8,
  });
  [0, 1, 2].forEach((index) => {
    const angle = (index / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      silver,
      [0, 0.2, 0],
      [Math.sin(angle) * 0.3, 0.2, Math.cos(angle) * 0.3],
      0.02,
      5,
    );
    builder.sphere(
      "paint",
      cosmicPurple,
      0.07,
      [Math.sin(angle) * 0.3, 0.2, Math.cos(angle) * 0.3],
      [1, 1, 1],
      8,
    );
  });
};

const anemometerMast: Triple = [
  drumAt.x + 1.6,
  drumHeight + 0.12,
  drumAt.z - 1.6,
];

const entranceDeck: Deck = ({ x, z }) => {
  if (Math.abs(x) > 0.7) {
    return undefined;
  }
  const back = doorZ + 0.75 + stepDepth / 2;
  const into = back - z;
  if (into < 0 || into > stepDepth * 3) {
    return undefined;
  }
  const step = Math.min(2, Math.floor(into / stepDepth));
  return { height: stepRise * (step + 1), kind: "ground" };
};

export const observatoryModel: CuriosityModel = {
  kind: "observatory",
  islandId: "starfall-isle",
  name: "Observatory",
  fact: "Astronomers look through big telescopes in observatories to study the night sky. The dome turns round and opens a slit so the telescope can point at any star. Through it you can see that the Moon is a round ball of rock, just like the Earth and the Sun are huge round spheres.",
  curriculumLink:
    "Science, Year 5: Earth and space. Describe the Sun, Earth and Moon as approximately spherical bodies.",
  footprint: 5,
  setting: "inland",
  signSpot: { x: 2.0, z: 3.7 },
  build: (builder) => {
    buildDrum(builder);
    if (builder.isFar) {
      buildStillDome(builder);
    } else {
      builder.cylinder("metal", silver, {
        radius: 0.03,
        length: 0.9,
        at: [anemometerMast[0], anemometerMast[1] + 0.45, anemometerMast[2]],
        segments: 8,
      });
    }
    buildEntrance(builder);
    buildGrounds(builder);
    addSignBoard(builder, [2.0, 0, 3.7], signColour);
  },
  moving: [
    {
      name: "dome",
      pivot: domePivot,
      build: buildDome,
      motion: { kind: "whirl", axis: "y", idle: 0.05, speed: 0.6, reach: 8 },
    },
    {
      name: "anemometer",
      pivot: [anemometerMast[0], anemometerMast[1] + 0.9, anemometerMast[2]],
      build: buildAnemometer,
      motion: { kind: "spin", axis: "y", speed: 3 },
    },
  ],
  blockers: [
    { x: drumAt.x, z: drumAt.z, radius: drumRadius + 0.15 },
    { x: -2.6, z: 1.9, radius: 0.5 },
    { x: 2.7, z: 1.6, radius: 0.5 },
    { x: 3.1, z: -1.6, radius: 0.45 },
    { x: -3.3, z: -0.4, radius: 0.6 },
    { x: -3.2, z: -2.0, radius: 0.4 },
  ] satisfies LocalBlocker[],
  decks: [entranceDeck],
  play: {
    label: "Look at the Moon",
    news: "Wow! Through the big telescope the Moon looks like a round grey ball, covered in craters and shining in the Sun's light.",
  },
};
