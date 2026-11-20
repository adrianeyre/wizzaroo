import {
  type BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  RingGeometry,
  SphereGeometry,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const gravel = "#d6c3a0";
const cactusGreen = "#4f8a47";
const saguaroGreen = "#5a8f4e";
const barrelGreen = "#5f9a52";
const padGreen = "#7aa84f";
const spineYellow = "#f2dc8a";
const bedStone = "#b8a284";
const signColour = "#4f7a3a";

const bed = { x: 0, z: -0.4, radiusX: 3.3, radiusZ: 2.7 };
const saguaro = { x: -1.3, z: -1.5, height: 2.5, radius: 0.3 };
const barrels: Triple[] = [
  [1.45, 0.42, -0.85],
  [2.05, 0.3, -0.35],
  [1.05, 0.26, -0.1],
];
const pear = { x: -1.75, z: 0.75 };
const hedgehogs = { x: 0.55, z: 0.95 };
const canAt: Triple = [1.75, 0, 2.05];

/** Scallops a round shape into ribs, like the pleats of a cactus. */
const addRibs = (
  geometry: BufferGeometry,
  ribs: number,
  depth: number,
): BufferGeometry => {
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const wave = 1 - depth * (0.5 - 0.5 * Math.cos(Math.atan2(x, z) * ribs));
    position.setX(index, x * wave);
    position.setZ(index, z * wave);
  }
  return geometry;
};

/** A ribbed, upright cactus stem with a rounded top. */
const addStem = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  radius: number,
  height: number,
  ribs: number,
) => {
  const around = builder.isFar ? Math.max(5, ribs / 2) : ribs * 2;
  const ribDepth = builder.isFar ? 0 : 0.16;
  builder.add(
    "matte",
    colour,
    addRibs(
      new CylinderGeometry(radius, radius * 1.04, height, around, 1, true),
      ribs,
      ribDepth,
    ),
    {
      at: [at[0], at[1] + height / 2, at[2]],
    },
  );
  builder.add(
    "matte",
    shade(colour, 1.05),
    addRibs(
      new SphereGeometry(
        radius,
        around,
        builder.isFar ? 2 : 4,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
      ribs,
      ribDepth,
    ),
    { at: [at[0], at[1] + height, at[2]], scale: [1, 0.8, 1] },
  );
};

/** A cup of petals with a bright middle, opening upwards. */
const addFlower = (
  builder: AttractionBuilder,
  at: Triple,
  petal: string,
  size: number,
  tilt: Triple = [0, 0, 0],
) => {
  builder.add(
    "paint",
    petal,
    new ConeGeometry(0.09 * size, 0.1 * size, 8, 1, true).rotateX(Math.PI),
    {
      at: [at[0], at[1] + 0.04 * size, at[2]],
      rotation: tilt,
    },
  );
  builder.add(
    "paint",
    shade(petal, 0.85),
    new ConeGeometry(0.06 * size, 0.08 * size, 6, 1, true).rotateX(Math.PI),
    {
      at: [at[0], at[1] + 0.06 * size, at[2]],
      rotation: [tilt[0], tilt[1] + 0.3, tilt[2]],
    },
  );
  builder.sphere(
    "paint",
    "#f2c12e",
    0.025 * size,
    [at[0], at[1] + 0.06 * size, at[2]],
    [1, 0.6, 1],
    6,
  );
};

const buildBed = (builder: AttractionBuilder) => {
  const segments = builder.segments(40, 12);
  builder.add("matte", gravel, new CylinderGeometry(1, 1, 0.06, segments), {
    at: [bed.x, 0.03, bed.z],
    scale: [bed.radiusX, 1, bed.radiusZ],
  });
  if (builder.isFar) {
    return;
  }
  /* Rounded stones edging the bed, leaving a gap for the path */
  const stones = 30;
  for (let stone = 0; stone < stones; stone++) {
    const angle = (stone / stones) * Math.PI * 2;
    const x = bed.x + Math.sin(angle) * (bed.radiusX + 0.05);
    const z = bed.z + Math.cos(angle) * (bed.radiusZ + 0.05);
    if (Math.abs(x - 0.9) < 0.5 && z > 1.5) {
      continue;
    }
    builder.sphere(
      "matte",
      shade(bedStone, 0.9 + (stone % 3) * 0.08),
      0.15 + (stone % 2) * 0.03,
      [x, 0.06, z],
      [1.3, 0.6, 1],
      6,
    );
  }
  /* Raked rings in the gravel round the biggest plants */
  [
    { x: saguaro.x, z: saguaro.z, from: 0.55 },
    { x: 1.5, z: -0.45, from: 1.0 },
  ].forEach(({ x, z, from }) => {
    for (let ring = 0; ring < 3; ring++) {
      const radius = from + ring * 0.22;
      builder.add(
        "matte",
        shade(gravel, 0.88),
        new RingGeometry(radius - 0.03, radius, 28).rotateX(-Math.PI / 2),
        {
          at: [x, 0.062, z],
        },
      );
    }
  });
  /* Straight rake lines elsewhere */
  for (let line = 0; line < 4; line++) {
    builder.box(
      "matte",
      shade(gravel, 0.88),
      [1.5, 0.004, 0.04],
      [-0.2 + line * 0.06, 0.062, 1.8 - line * 0.2],
      [0, 0.15, 0],
    );
  }
};

const buildSaguaro = (builder: AttractionBuilder) => {
  const { x, z, height, radius } = saguaro;
  addStem(builder, saguaroGreen, [x, 0, z], radius, height, 10);
  /* Two arms: out sideways, then up */
  [
    { side: -1, from: 0.95, out: 0.55, up: 0.9 },
    { side: 1, from: 1.35, out: 0.5, up: 0.7 },
  ].forEach(({ side, from, out, up }) => {
    const elbow: Triple = [x + side * out, from, z];
    builder.cylinder("matte", saguaroGreen, {
      radius: radius * 0.6,
      length: out,
      at: [x + (side * out) / 2, from, z],
      axis: "x",
      segments: builder.isFar ? 5 : 10,
    });
    builder.sphere(
      "matte",
      saguaroGreen,
      radius * 0.6,
      elbow,
      [1, 1, 1],
      builder.isFar ? 5 : 10,
    );
    addStem(builder, shade(saguaroGreen, 0.95), elbow, radius * 0.6, up, 8);
  });
  if (builder.isFar) {
    return;
  }
  /* Tufts of spines down the ribs */
  for (let tuft = 0; tuft < 10; tuft++) {
    const angle = tuft * 1.9;
    builder.sphere(
      "matte",
      spineYellow,
      0.025,
      [
        x + Math.sin(angle) * radius,
        0.4 + tuft * 0.2,
        z + Math.cos(angle) * radius,
      ],
      [1, 1, 1],
      4,
    );
  }
  /* A woodpecker's hole, where a little owl might live */
  builder.cylinder("matte", "#2a2016", {
    radius: 0.06,
    length: 0.04,
    at: [x, 1.8, z + radius * 0.98],
    axis: "z",
    segments: 8,
  });
};

const buildBarrels = (builder: AttractionBuilder) => {
  barrels.forEach(([x, radius, z], index) => {
    const around = builder.isFar ? 6 : 24;
    builder.add(
      "matte",
      index === 1 ? shade(barrelGreen, 0.9) : barrelGreen,
      addRibs(
        new SphereGeometry(radius, around, builder.isFar ? 4 : 10),
        12,
        builder.isFar ? 0 : 0.14,
      ),
      { at: [x, radius * 0.75, z], scale: [1, 1.15, 1] },
    );
    if (builder.isFar) {
      return;
    }
    /* Hooked red-gold spines along the ribs, and a woolly crown */
    for (let spine = 0; spine < 12; spine++) {
      const angle = (spine / 12) * Math.PI * 2;
      builder.add(
        "paint",
        index === 0 ? "#d9663a" : spineYellow,
        new ConeGeometry(0.018, 0.12, 3),
        {
          at: [
            x + Math.sin(angle) * radius * 1.02,
            radius * 0.95,
            z + Math.cos(angle) * radius * 1.02,
          ],
          rotation: [Math.cos(angle) * 0.9, 0, -Math.sin(angle) * 0.9],
        },
      );
    }
    builder.sphere(
      "matte",
      "#e8d8b0",
      radius * 0.25,
      [x, radius * 1.6, z],
      [1, 0.4, 1],
      8,
    );
  });
};

const buildPricklyPear = (builder: AttractionBuilder) => {
  const { x, z } = pear;
  /* Flat pads growing out of each other */
  const pads: { at: Triple; turn: number; lean: number; size: number }[] = [
    { at: [0, 0.35, 0], turn: 0.2, lean: 0, size: 1 },
    { at: [-0.32, 0.85, 0.05], turn: 0.5, lean: 0.45, size: 0.85 },
    { at: [0.3, 0.88, -0.05], turn: -0.3, lean: -0.4, size: 0.9 },
    { at: [0.05, 1.3, 0.02], turn: 0.1, lean: 0.1, size: 0.75 },
    { at: [0.55, 0.3, 0.2], turn: 1.2, lean: -0.3, size: 0.8 },
    { at: [-0.5, 0.28, -0.15], turn: 2.3, lean: 0.35, size: 0.75 },
  ];
  pads.forEach(({ at, turn, lean, size }, index) => {
    if (builder.isFar && index % 2 === 1) {
      return;
    }
    builder.add(
      "matte",
      index % 2 === 0 ? padGreen : shade(padGreen, 0.9),
      new SphereGeometry(
        0.34 * size,
        builder.isFar ? 5 : 12,
        builder.isFar ? 3 : 8,
      ).scale(0.9, 1.15, 0.24),
      { at: [x + at[0], at[1], z + at[2]], rotation: [0, turn, lean] },
    );
    if (builder.isFar) {
      return;
    }
    /* Dots of spines on the faces */
    builder.add("matte", spineYellow, new SphereGeometry(0.02, 4, 2), {
      at: [x + at[0] + Math.cos(turn) * 0.1, at[1] + 0.1, z + at[2] + 0.08],
    });
    builder.add("matte", spineYellow, new SphereGeometry(0.02, 4, 2), {
      at: [x + at[0] - 0.08, at[1] - 0.12, z + at[2] + 0.08 + lean * 0.01],
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Ripe purple-red fruits on the rims */
  [
    [-0.52, 1.12, 0.05],
    [0.55, 1.12, -0.05],
    [0.32, 1.25, 0],
  ].forEach(([dx, y, dz]) => {
    builder.sphere(
      "paint",
      "#b2245a",
      0.07,
      [x + dx, y, z + dz],
      [0.85, 1.2, 0.85],
      8,
    );
  });
};

const buildHedgehogs = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const { x, z } = hedgehogs;
  [
    [0, 0, 0.5],
    [0.22, 0.12, 0.38],
    [-0.2, 0.1, 0.42],
    [0.05, -0.2, 0.32],
  ].forEach(([dx, dz, height], index) => {
    addStem(
      builder,
      index % 2 === 0 ? cactusGreen : shade(cactusGreen, 1.1),
      [x + dx, 0, z + dz],
      0.11,
      height,
      8,
    );
  });
};

/** Little spiky rosettes of agave and aloe. */
const addRosette = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  size: number,
) => {
  const leaves = builder.isFar ? 4 : 9;
  for (let leaf = 0; leaf < leaves; leaf++) {
    const angle = (leaf / leaves) * Math.PI * 2;
    const lean = leaf % 2 === 0 ? 0.55 : 0.3;
    builder.add(
      "matte",
      leaf % 2 === 0 ? colour : shade(colour, 1.1),
      new ConeGeometry(0.08 * size, 0.6 * size, 4),
      {
        at: [
          at[0] + Math.sin(angle) * 0.14 * size,
          0.26 * size,
          at[2] + Math.cos(angle) * 0.14 * size,
        ],
        rotation: [Math.cos(angle) * lean, 0, -Math.sin(angle) * lean],
        scale: [1, 1, 0.45],
      },
    );
  }
};

const buildProps = (builder: AttractionBuilder) => {
  addRosette(builder, [2.4, 0, -1.9], "#6f9a8a", 1.1);
  if (!builder.isFar) {
    addRosette(builder, [-2.65, 0, -0.5], "#7aa86a", 0.9);
    addRosette(builder, [-0.2, 0, -2.6], "#6f9a8a", 0.8);
  }
  /* The thermometer sign: how hot it is in the desert today */
  const [tx, tz] = [-1.95, 2.55];
  builder.box("matte", palette.darkTimber, [0.08, 1.4, 0.08], [tx, 0.7, tz]);
  builder.box("paint", palette.cream, [0.36, 1.0, 0.05], [tx, 1.05, tz + 0.06]);
  if (builder.isFar) {
    return;
  }
  builder.box("paint", "#c0392b", [0.4, 1.04, 0.04], [tx, 1.05, tz + 0.04]);
  builder.cylinder("glass", "#e8f4f8", {
    radius: 0.035,
    length: 0.72,
    at: [tx, 1.12, tz + 0.1],
    segments: 8,
  });
  builder.cylinder("paint", "#d12b2b", {
    radius: 0.02,
    length: 0.6,
    at: [tx, 1.0, tz + 0.1],
    segments: 6,
  });
  builder.sphere("paint", "#d12b2b", 0.07, [tx, 0.68, tz + 0.1], [1, 1, 1], 10);
  for (let tick = 0; tick < 7; tick++) {
    builder.box(
      "paint",
      palette.black,
      [tick % 2 === 0 ? 0.1 : 0.06, 0.012, 0.01],
      [tx + 0.09, 0.8 + tick * 0.1, tz + 0.09],
    );
  }
  builder.cylinder("paint", "#f2a33a", {
    radius: 0.07,
    length: 0.02,
    at: [tx, 1.46, tz + 0.09],
    axis: "z",
    segments: 12,
  });
  /* The green watering can, with its rose on the spout */
  const [cx, , cz] = canAt;
  builder.cylinder("paint", "#3f8a5a", {
    radius: 0.17,
    radiusEnd: 0.14,
    length: 0.34,
    at: [cx, 0.17, cz],
    segments: 14,
  });
  builder.cylinder("paint", shade("#3f8a5a", 1.15), {
    radius: 0.145,
    length: 0.02,
    at: [cx, 0.345, cz],
    segments: 14,
  });
  builder.bar(
    "paint",
    "#3f8a5a",
    [cx + 0.12, 0.1, cz],
    [cx + 0.42, 0.38, cz],
    0.045,
    6,
  );
  builder.add(
    "metal",
    palette.steel,
    new ConeGeometry(0.06, 0.08, 10).rotateZ(Math.PI / 2 + 0.75),
    { at: [cx + 0.44, 0.4, cz] },
  );
  builder.torus("paint", "#3f8a5a", 0.13, 0.02, [cx - 0.02, 0.38, cz], "z", 14);
  /* A trowel and a little seed tray of baby cacti */
  builder.box(
    "metal",
    palette.steel,
    [0.08, 0.01, 0.16],
    [cx - 0.45, 0.01, cz + 0.2],
    [0, 0.6, 0],
  );
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.02,
    length: 0.14,
    at: [cx - 0.52, 0.02, cz + 0.32],
    axis: "z",
    segments: 6,
  });
  builder.box(
    "matte",
    "#b8643a",
    [0.5, 0.08, 0.3],
    [cx - 0.1, 0.04, cz + 0.45],
  );
  for (let pot = 0; pot < 6; pot++) {
    builder.sphere(
      "matte",
      pot % 2 === 0 ? cactusGreen : padGreen,
      0.045,
      [
        cx - 0.28 + (pot % 3) * 0.17,
        0.11,
        cz + 0.39 + Math.floor(pot / 3) * 0.12,
      ],
      [1, 1.2, 1],
      6,
    );
  }
  /* A sun-bleached log and a sleepy lizard on a rock */
  builder.cylinder("matte", "#c9b28a", {
    radius: 0.11,
    length: 0.9,
    at: [2.6, 0.12, 0.85],
    axis: "x",
    segments: 8,
  });
  builder.sphere(
    "matte",
    palette.stone,
    0.32,
    [-2.5, 0.12, 1.25],
    [1.3, 0.6, 1],
    10,
  );
  builder.sphere(
    "paint",
    "#c87a2a",
    0.06,
    [-2.5, 0.33, 1.25],
    [0.8, 0.5, 2],
    8,
  );
  builder.bar(
    "paint",
    "#c87a2a",
    [-2.5, 0.31, 1.13],
    [-2.45, 0.3, 0.95],
    0.03,
    4,
  );
  builder.sphere(
    "paint",
    "#c87a2a",
    0.04,
    [-2.5, 0.34, 1.39],
    [0.9, 0.7, 1.2],
    6,
  );
};

/* Flowers that open when someone comes near, each on its own plant */
const saguaroCrown: Triple = [
  saguaro.x,
  saguaro.height + saguaro.radius * 0.75,
  saguaro.z,
];
const barrelCrown: Triple = [barrels[0][0], barrels[0][1] * 1.6, barrels[0][2]];
const pearCrown: Triple = [pear.x + 0.05, 1.55, pear.z + 0.02];
const hedgehogCrown: Triple = [hedgehogs.x, 0.45, hedgehogs.z];

const buildSaguaroFlowers = (builder: AttractionBuilder) => {
  [0, 1.6, 3.2, 4.8].forEach((angle) => {
    addFlower(
      builder,
      [Math.sin(angle) * 0.14, -0.05, Math.cos(angle) * 0.14],
      palette.white,
      1.4,
      [Math.cos(angle) * 0.4, 0, -Math.sin(angle) * 0.4],
    );
  });
  addFlower(builder, [0, 0, 0], palette.white, 1.5);
};

const buildBarrelFlowers = (builder: AttractionBuilder) => {
  for (let flower = 0; flower < 6; flower++) {
    const angle = (flower / 6) * Math.PI * 2;
    addFlower(
      builder,
      [Math.sin(angle) * 0.17, -0.04, Math.cos(angle) * 0.17],
      flower % 2 === 0 ? "#f2a33a" : "#e8483a",
      1,
      [Math.cos(angle) * 0.5, 0, -Math.sin(angle) * 0.5],
    );
  }
};

const buildPearFlowers = (builder: AttractionBuilder) => {
  [
    [0, 0],
    [-0.22, -0.15],
    [0.2, -0.2],
  ].forEach(([dx, dy]) => {
    addFlower(builder, [dx, dy, 0], "#f6d43a", 1.3);
  });
};

const buildHedgehogFlowers = (builder: AttractionBuilder) => {
  [
    [0, 0.12, 0],
    [0.22, 0, 0.12],
    [-0.2, 0.04, 0.1],
    [0.05, -0.06, -0.2],
  ].forEach(([dx, dy, dz]) => {
    addFlower(builder, [dx, dy, dz], "#d93a8a", 1.2);
  });
};

export const cactusGardenModel: CuriosityModel = {
  kind: "cactus-garden",
  islandId: "sunscorch-sands",
  name: "Cactus Garden",
  fact: "Like all plants, cacti need water and light to grow. In the desert it hardly ever rains, so cacti store water in their thick, fleshy stems, which swell up after a storm. Water travels up from the roots through tubes inside the stem. Their spines are leaves that shade the plant and lose very little water.",
  curriculumLink:
    "Science, Year 3: explore the requirements of plants for life and growth (air, light, water, nutrients and room to grow), and investigate the way in which water is transported within plants.",
  footprint: 4.6,
  setting: "inland",
  padColour: sand,
  signSpot: { x: 0.9, z: 3.75 },
  build: (builder) => {
    buildBed(builder);
    buildSaguaro(builder);
    buildBarrels(builder);
    buildPricklyPear(builder);
    buildHedgehogs(builder);
    buildProps(builder);
    addSignBoard(builder, [0.9, 0, 3.75], signColour);
  },
  moving: [
    {
      name: "saguaro flowers",
      pivot: saguaroCrown,
      build: buildSaguaroFlowers,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "barrel flowers",
      pivot: barrelCrown,
      build: buildBarrelFlowers,
      motion: { kind: "wake", reach: 5.5 },
    },
    {
      name: "prickly pear flowers",
      pivot: pearCrown,
      build: buildPearFlowers,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "hedgehog flowers",
      pivot: hedgehogCrown,
      build: buildHedgehogFlowers,
      motion: { kind: "wake", reach: 6.5 },
    },
  ],
  blockers: [
    { x: saguaro.x, z: saguaro.z, radius: 0.4 },
    { x: saguaro.x - 0.5, z: saguaro.z, radius: 0.25 },
    { x: saguaro.x + 0.5, z: saguaro.z, radius: 0.25 },
    { x: 1.5, z: -0.45, radius: 0.85 },
    { x: pear.x, z: pear.z, radius: 0.65 },
    { x: hedgehogs.x, z: hedgehogs.z, radius: 0.4 },
    { x: -1.95, z: 2.55, radius: 0.15 },
    { x: -2.5, z: 1.25, radius: 0.4 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Water the cactus",
    news: "Glug, glug! The cactus soaked up the water and its stem swelled a little fatter. It can save that drink for weeks!",
  },
};
