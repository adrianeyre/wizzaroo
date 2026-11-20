import { DodecahedronGeometry, IcosahedronGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e0bf86";
const sandstone = "#b8573a";
const sandstoneLight = "#d27a4f";
const sandstoneDark = "#8f3f2a";
const scorpionShell = "#d1a24c";
const scorpionDark = "#8a5f22";
const lizardSkin = "#c98b45";
const lizardSpot = "#7a4a22";
const cactusGreen = "#5d8a4a";
const uvViolet = "#9b5cff";
const boardCream = "#f2e6c8";
const ink = "#3a2a1e";
const signColour = "#8f3f2a";

const mesaAt: LocalPoint = { x: -0.9, z: -1.5 };
const baskingRock = { x: 1.75, z: -0.1, radius: 0.75, height: 0.5 };
const lizardPivot: Triple = [
  baskingRock.x,
  baskingRock.height - 0.3,
  baskingRock.z,
];
const torchAt: LocalPoint = { x: -2.5, z: 1.1 };
const torchHead: Triple = [torchAt.x + 0.12, 1.55, torchAt.z];
const lecternAt: LocalPoint = { x: 2.7, z: 1.9 };
const scorpionYard: LocalPoint = { x: 0.1, z: 1.0 };

/** A faceted boulder, squashed by `scale` and turned by `turn`. */
const addRock = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  scale: Triple,
  colour: string,
  turn = 0,
) => {
  builder.add(
    "matte",
    colour,
    new IcosahedronGeometry(radius, builder.isFar ? 0 : 1).rotateY(turn),
    { at, scale },
    0.6,
  );
};

/* The stack of sandstone: layers of red rock, each a different shade */

const buildMesa = (builder: AttractionBuilder) => {
  const layers = [
    { radius: 1.45, height: 0.5, shift: 0, colour: sandstoneDark },
    { radius: 1.3, height: 0.42, shift: 0.08, colour: sandstone },
    { radius: 1.35, height: 0.38, shift: -0.05, colour: sandstoneLight },
    { radius: 1.15, height: 0.45, shift: 0.1, colour: sandstone },
    { radius: 1.05, height: 0.32, shift: -0.08, colour: sandstoneDark },
    { radius: 1.12, height: 0.4, shift: 0.04, colour: sandstoneLight },
  ];
  let y = 0;
  layers.forEach(({ radius, height, shift, colour }, index) => {
    if (builder.isFar && index % 2 === 1) {
      y += height;
      return;
    }
    const thickness = builder.isFar
      ? height + layers[index + 1].height
      : height;
    builder.cylinder("matte", colour, {
      radius,
      radiusEnd: radius * 0.92,
      length: thickness,
      at: [mesaAt.x + shift, y + thickness / 2, mesaAt.z + shift * 0.6],
      segments: 9,
    });
    y += height;
  });
  if (builder.isFar) {
    return;
  }
  /* A balanced cap rock, and ledges sticking out of the layers */
  addRock(
    builder,
    [mesaAt.x + 0.15, y + 0.22, mesaAt.z - 0.1],
    0.55,
    [1.2, 0.55, 1],
    sandstoneDark,
    0.4,
  );
  [
    { angle: 0.6, y: 0.9, size: 0.35 },
    { angle: -0.9, y: 1.6, size: 0.3 },
    { angle: 2.4, y: 0.4, size: 0.42 },
  ].forEach(({ angle, y: height, size }) => {
    addRock(
      builder,
      [
        mesaAt.x + Math.sin(angle) * 1.2,
        height,
        mesaAt.z + Math.cos(angle) * 1.15,
      ],
      size,
      [1.3, 0.5, 1],
      sandstoneLight,
      angle,
    );
  });
  /* Dark cracks and a hollow where something lives */
  builder.sphere(
    "matte",
    "#3a1c12",
    0.2,
    [mesaAt.x + 0.3, 0.32, mesaAt.z + 1.32],
    [1.4, 0.8, 0.4],
    10,
  );
  [
    [0.7, 1.2],
    [-0.4, 1.9],
  ].forEach(([along, height]) => {
    builder.box(
      "matte",
      "#4a2216",
      [0.04, 0.5, 0.04],
      [mesaAt.x + along, height, mesaAt.z + 1.22],
      [0, 0, 0.25],
    );
  });
};

const buildBoulders = (builder: AttractionBuilder) => {
  /* The flat basking rock, a slab on a slab */
  builder.cylinder("matte", sandstone, {
    radius: baskingRock.radius,
    radiusEnd: baskingRock.radius * 0.88,
    length: baskingRock.height,
    at: [baskingRock.x, baskingRock.height / 2, baskingRock.z],
    segments: 8,
  });
  const boulders: {
    at: Triple;
    radius: number;
    scale: Triple;
    colour: string;
  }[] = [
    {
      at: [1.05, 0.35, -2.2],
      radius: 0.6,
      scale: [1.2, 0.9, 1],
      colour: sandstoneLight,
    },
    {
      at: [-2.5, 0.3, -0.4],
      radius: 0.55,
      scale: [1, 0.85, 1.2],
      colour: sandstone,
    },
    {
      at: [2.6, 0.25, -1.4],
      radius: 0.45,
      scale: [1.1, 0.8, 1],
      colour: sandstoneDark,
    },
    {
      at: [-2.2, 0.2, -2.6],
      radius: 0.4,
      scale: [1.3, 0.7, 1],
      colour: sandstoneLight,
    },
  ];
  boulders.forEach(({ at, radius, scale, colour }, index) => {
    addRock(builder, at, radius, scale, colour, index * 1.3);
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", sandstoneLight, {
    radius: baskingRock.radius * 0.88,
    radiusEnd: baskingRock.radius * 0.7,
    length: 0.06,
    at: [baskingRock.x, baskingRock.height + 0.03, baskingRock.z],
    segments: 8,
  });
  /* Pebbles and small stones scattered over the sand */
  const pebbles: [number, number, number][] = [
    [0.9, 2.1, 0.12],
    [-0.8, 2.4, 0.09],
    [1.6, 1.3, 0.1],
    [-1.5, 0.3, 0.14],
    [0.3, -0.4, 0.11],
    [2.3, 0.9, 0.08],
    [-0.4, 3.2, 0.1],
    [3.1, -0.4, 0.13],
    [-3.2, 0.9, 0.11],
    [0.2, -2.9, 0.15],
  ];
  pebbles.forEach(([x, z, radius], index) => {
    builder.add(
      "matte",
      index % 3 === 0
        ? sandstoneDark
        : index % 3 === 1
          ? sandstoneLight
          : "#c9a57a",
      new DodecahedronGeometry(radius, 0),
      { at: [x, radius * 0.5, z], scale: [1.2, 0.7, 1] },
      0.6,
    );
  });
  /* Scorpion burrows: dark holes with a fan of dug-out sand */
  [
    [-0.6, 1.9],
    [1.0, 0.9],
  ].forEach(([x, z]) => {
    builder.sphere(
      "matte",
      shade(sand, 0.85),
      0.28,
      [x, 0, z + 0.1],
      [1, 0.18, 1],
      10,
    );
    builder.cylinder("matte", "#2a1a10", {
      radius: 0.1,
      length: 0.02,
      at: [x, 0.04, z - 0.08],
      segments: 10,
    });
  });
  /* Little tracks across the sand */
  for (let step = 0; step < 6; step++) {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        shade(sand, 0.8),
        [0.04, 0.01, 0.06],
        [-1.6 + step * 0.22, 0.005, 2.6 + side * 0.07 + Math.sin(step) * 0.05],
      );
    });
  }
};

/* Desert plants: barrel cacti and a dry thorny bush */

const buildPlants = (builder: AttractionBuilder) => {
  [
    { x: -3.1, z: -1.4, size: 1 },
    { x: 3.2, z: 0.2, size: 0.75 },
  ].forEach(({ x, z, size }) => {
    builder.sphere(
      "matte",
      cactusGreen,
      0.35 * size,
      [x, 0.32 * size, z],
      [1, 1.25, 1],
      builder.isFar ? 6 : 12,
    );
    if (builder.isFar) {
      return;
    }
    for (let rib = 0; rib < 6; rib++) {
      const angle = (rib / 6) * Math.PI * 2;
      builder.box(
        "matte",
        shade(cactusGreen, 0.8),
        [0.03, 0.6 * size, 0.03],
        [
          x + Math.sin(angle) * 0.34 * size,
          0.33 * size,
          z + Math.cos(angle) * 0.34 * size,
        ],
        [Math.cos(angle) * 0.25, 0, -Math.sin(angle) * 0.25],
      );
    }
    [0, 2.1, 4.2].forEach((angle) => {
      builder.sphere(
        "paint",
        "#f06a8c",
        0.06 * size,
        [
          x + Math.sin(angle) * 0.1 * size,
          0.73 * size,
          z + Math.cos(angle) * 0.1 * size,
        ],
        [1, 0.6, 1],
        6,
      );
    });
  });
  if (builder.isFar) {
    return;
  }
  const bush: Triple = [-1.8, 0, 3.0];
  for (let twig = 0; twig < 7; twig++) {
    const angle = (twig / 7) * Math.PI * 2;
    const tip: Triple = [
      bush[0] + Math.sin(angle) * 0.35,
      0.45 + (twig % 3) * 0.08,
      bush[2] + Math.cos(angle) * 0.3,
    ];
    builder.bar("matte", "#7a5a3a", bush, tip, 0.03, 4);
    builder.bar(
      "matte",
      "#7a5a3a",
      [(bush[0] + tip[0]) / 2, tip[1] * 0.5, (bush[2] + tip[2]) / 2],
      [
        tip[0] + Math.sin(angle + 1) * 0.15,
        tip[1] * 0.75,
        tip[2] + Math.cos(angle + 1) * 0.15,
      ],
      0.02,
      4,
    );
  }
};

/* The UV torch on its post, and the arthropod board */

const buildTorchPost = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 1.5,
    at: [torchAt.x, 0.75, torchAt.z],
    segments: 8,
  });
  builder.cylinder("matte", palette.darkStone, {
    radius: 0.2,
    length: 0.12,
    at: [torchAt.x, 0.06, torchAt.z],
    segments: 10,
  });
  /* The torch itself, pointing at the scorpions' patch */
  builder.cylinder("paint", "#2c2a3a", {
    radius: 0.09,
    radiusEnd: 0.13,
    length: 0.42,
    at: [torchHead[0] - 0.15, torchHead[1], torchHead[2]],
    axis: "x",
    segments: 12,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", palette.steel, {
    radius: 0.14,
    length: 0.05,
    at: [torchHead[0] + 0.06, torchHead[1], torchHead[2]],
    axis: "x",
    segments: 12,
  });
  builder.box(
    "paint",
    uvViolet,
    [0.1, 0.04, 0.06],
    [torchHead[0] - 0.2, torchHead[1] + 0.1, torchHead[2]],
  );
};

const buildLectern = (builder: AttractionBuilder) => {
  const { x, z } = lecternAt;
  const turn = -0.6;
  [-0.4, 0.4].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 0.8, 0.07],
      [x + Math.cos(turn) * side, 0.4, z - Math.sin(turn) * side],
      [0, turn, 0],
    );
  });
  builder.box(
    "paint",
    shade(signColour, 0.9),
    [1.0, 0.62, 0.05],
    [x, 0.98, z],
    [-0.5, turn, 0],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    boardCream,
    [0.92, 0.54, 0.02],
    [x + Math.sin(turn) * 0.03, 1.0, z + Math.cos(turn) * 0.03],
    [-0.5, turn, 0],
  );
  /* Three pictures: an insect, a spider and a scorpion, with their legs */
  const panelPoint = (across: number, up: number): Triple => {
    const tilt = 0.5;
    const outY = Math.cos(tilt) * up;
    const outZ = 0.05 + Math.sin(tilt) * up;
    return [
      x + Math.cos(turn) * across + Math.sin(turn) * outZ,
      1.0 + outY,
      z - Math.sin(turn) * across + Math.cos(turn) * outZ,
    ];
  };
  [
    { across: -0.3, legs: 3, colour: "#3f7a3a" },
    { across: 0, legs: 4, colour: ink },
    { across: 0.3, legs: 4, colour: scorpionDark },
  ].forEach(({ across, legs, colour }, index) => {
    builder.sphere(
      "paint",
      colour,
      0.055,
      panelPoint(across, 0.02),
      [1, 1.3, 0.3],
      8,
    );
    for (let leg = 0; leg < legs; leg++) {
      const up = 0.07 - leg * (0.14 / Math.max(1, legs - 1));
      [-1, 1].forEach((side) => {
        builder.bar(
          "paint",
          colour,
          panelPoint(across, up * 0.3),
          panelPoint(across + side * 0.1, up),
          0.012,
          3,
        );
      });
    }
    if (index === 2) {
      builder.bar(
        "paint",
        colour,
        panelPoint(across, -0.05),
        panelPoint(across + 0.02, -0.18),
        0.02,
        3,
      );
      [-1, 1].forEach((side) => {
        builder.sphere(
          "paint",
          colour,
          0.025,
          panelPoint(across + side * 0.07, 0.13),
          [1, 1, 0.3],
          6,
        );
      });
    }
  });
  /* A magnifying glass left on the boulder by the board */
  builder.torus(
    "metal",
    palette.brass,
    0.1,
    0.015,
    [2.55, 0.62, -1.35],
    "y",
    14,
  );
  builder.cylinder("glass", palette.glass, {
    radius: 0.1,
    length: 0.01,
    at: [2.55, 0.62, -1.35],
    segments: 14,
  });
  builder.bar(
    "paint",
    palette.darkTimber,
    [2.65, 0.62, -1.3],
    [2.85, 0.62, -1.2],
    0.035,
    6,
  );
};

/* The moving parts */

const buildScorpion = (builder: AttractionBuilder) => {
  const shell = scorpionShell;
  /* Head and body, then the segments of the abdomen */
  builder.sphere("paint", shell, 0.07, [0, 0.06, 0.06], [1, 0.5, 1.15], 10);
  [0, 1, 2, 3].forEach((index) => {
    builder.sphere(
      "paint",
      index % 2 === 0 ? shade(shell, 0.92) : shell,
      0.075 - index * 0.006,
      [0, 0.06, -0.04 - index * 0.06],
      [1, 0.45, 0.6],
      6,
    );
  });
  builder.sphere("paint", palette.black, 0.012, [0, 0.095, 0.1], [1, 1, 1], 5);
  /* The tail curls up and over, ending in a sting */
  const tailSegments = 5;
  const tailAt = (turn: number): Triple => [
    0,
    0.17 - Math.cos(turn) * 0.13,
    -0.2 - Math.sin(turn) * 0.13,
  ];
  for (let index = 0; index < tailSegments; index++) {
    const turn = Math.PI * (0.25 + (index / (tailSegments - 1)) * 0.85);
    builder.sphere(
      "paint",
      index % 2 === 0 ? shell : shade(shell, 0.9),
      0.035 - index * 0.002,
      tailAt(turn),
      [1, 1, 1.1],
      5,
    );
  }
  builder.sphere(
    "paint",
    shade(shell, 1.1),
    0.032,
    tailAt(Math.PI * 1.25),
    [1, 1, 1.2],
    6,
  );
  builder.cylinder("paint", scorpionDark, {
    radius: 0,
    radiusEnd: 0.014,
    length: 0.07,
    at: [0, 0.22, -0.08],
    segments: 5,
  });
  /* Eight legs, four each side */
  [-1, 1].forEach((side) => {
    for (let leg = 0; leg < 4; leg++) {
      const z = 0.06 - leg * 0.055;
      const knee: Triple = [side * 0.13, 0.11, z - leg * 0.02];
      const foot: Triple = [side * 0.2, 0, z - leg * 0.05];
      builder.bar(
        "paint",
        scorpionDark,
        [side * 0.04, 0.06, z],
        knee,
        0.018,
        3,
      );
      builder.bar("paint", scorpionDark, knee, foot, 0.015, 3);
    }
    /* The pincers, held out in front */
    const elbow: Triple = [side * 0.13, 0.08, 0.16];
    builder.bar("paint", shell, [side * 0.04, 0.06, 0.1], elbow, 0.025, 5);
    builder.bar("paint", shell, elbow, [side * 0.1, 0.07, 0.26], 0.03, 5);
    builder.sphere(
      "paint",
      shell,
      0.045,
      [side * 0.1, 0.07, 0.29],
      [0.8, 0.6, 1.2],
      6,
    );
    [-1, 1].forEach((finger) => {
      builder.box(
        "paint",
        scorpionDark,
        [0.015, 0.015, 0.07],
        [side * 0.1 + finger * 0.015, 0.07, 0.35],
        [0, finger * 0.25, 0],
      );
    });
  });
};

const buildLizard = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    lizardSkin,
    0.09,
    [0, 0.07, 0.04],
    [0.8, 0.5, 1.9],
    12,
  );
  builder.sphere(
    "paint",
    lizardSkin,
    0.065,
    [0, 0.1, 0.24],
    [0.9, 0.7, 1.3],
    10,
  );
  builder.sphere(
    "paint",
    shade(lizardSkin, 1.1),
    0.04,
    [0, 0.07, 0.31],
    [1, 0.6, 1.2],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#2a1c10",
      0.018,
      [side * 0.045, 0.13, 0.27],
      [1, 1, 1],
      6,
    );
  });
  /* The tail sweeps round in a curve */
  const tailPieces = 6;
  let previous: Triple = [0, 0.06, -0.12];
  for (let index = 1; index <= tailPieces; index++) {
    const share = index / tailPieces;
    const next: Triple = [
      Math.sin(share * 1.8) * 0.22,
      0.05 - share * 0.03,
      -0.12 - Math.sin(share * 1.4) * 0.3,
    ];
    builder.bar(
      "paint",
      shade(lizardSkin, 1 - share * 0.15),
      previous,
      next,
      0.07 * (1 - share * 0.8),
      6,
    );
    previous = next;
  }
  /* Splayed legs with little toes */
  [-1, 1].forEach((side) => {
    [0.14, -0.06].forEach((z) => {
      const knee: Triple = [side * 0.13, 0.08, z + 0.02];
      const foot: Triple = [side * 0.17, 0.01, z + 0.06];
      builder.bar("paint", lizardSkin, [side * 0.05, 0.06, z], knee, 0.035, 5);
      builder.bar("paint", lizardSkin, knee, foot, 0.03, 5);
      builder.sphere(
        "paint",
        shade(lizardSkin, 0.9),
        0.025,
        foot,
        [1.3, 0.4, 1.3],
        6,
      );
    });
  });
  /* Dark spots down the back */
  [0.12, 0.0, -0.1].forEach((z, index) => {
    builder.sphere(
      "paint",
      lizardSpot,
      0.022,
      [index % 2 === 0 ? 0.03 : -0.03, 0.11, z],
      [1, 0.4, 1],
      6,
    );
  });
};

/** The torch's ultraviolet beam, which lights up as you come near. */
const buildUvBeam = (builder: AttractionBuilder) => {
  builder.cylinder("glow", uvViolet, {
    radius: 0.12,
    length: 0.03,
    at: [0, 0, 0],
    axis: "x",
    segments: 12,
  });
  builder.cylinder("glass", "#c7a6ff", {
    radius: 0.12,
    radiusEnd: 0.6,
    length: 2.2,
    at: [1.1, 0, 0],
    axis: "x",
    segments: 14,
    isOpen: true,
  });
  /* The pool of violet light on the sand */
  builder.cylinder("glow", "#7a3fd6", {
    radius: 0.65,
    length: 0.01,
    at: [2.3, -torchHead[1] + 0.02, -0.05],
    segments: 18,
  });
};

export const scorpionRocksModel: CuriosityModel = {
  kind: "scorpion-rocks",
  islandId: "sunscorch-sands",
  name: "Scorpion Rocks",
  fact: "Scorpions have no bones inside. Instead they wear their skeleton on the outside, a hard shell called an exoskeleton that supports and protects their soft body. They have eight legs and two big pincers, like their spider cousins. Amazingly, a scorpion's shell glows blue-green under ultraviolet light.",
  curriculumLink:
    "Science, Year 3: animals including humans. Identify that humans and some other animals have skeletons and muscles for support, protection and movement.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 1.4, z: 3.6 },
  padColour: sand,
  build: (builder) => {
    buildMesa(builder);
    buildBoulders(builder);
    buildPlants(builder);
    buildTorchPost(builder);
    buildLectern(builder);
    addSignBoard(builder, [1.4, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "lizard",
      pivot: lizardPivot,
      build: buildLizard,
      motion: { kind: "rise", reach: 6, height: 0.34, period: 2.2 },
    },
    {
      name: "UV beam",
      pivot: [torchHead[0] + 0.1, torchHead[1], torchHead[2]],
      build: buildUvBeam,
      motion: { kind: "wake", reach: 5 },
    },
  ],
  wanderers: [
    {
      name: "scorpions",
      build: buildScorpion,
      count: 4,
      centre: scorpionYard,
      radius: 1.3,
      speed: 0.35,
    },
  ],
  blockers: [
    { x: mesaAt.x, z: mesaAt.z, radius: 1.45 },
    { x: baskingRock.x, z: baskingRock.z, radius: baskingRock.radius },
    { x: 1.05, z: -2.2, radius: 0.65 },
    { x: -2.5, z: -0.4, radius: 0.6 },
    { x: 2.6, z: -1.4, radius: 0.5 },
    { x: -2.2, z: -2.6, radius: 0.5 },
    { x: torchAt.x, z: torchAt.z, radius: 0.22 },
    { x: lecternAt.x, z: lecternAt.z, radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Count their legs",
    news: "One, two, three… eight! Each scorpion has eight legs and two big pincers, and a hard shell for a skeleton.",
  },
};
