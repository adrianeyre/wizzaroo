import { ExtrudeGeometry, Shape } from "three";
import {
  addBush,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const bark = "#7a6250";
const barkDark = "#54412f";
const leafDeep = "#22662c";
const leafMid = "#2f8a35";
const leafBright = "#55aa3e";
const nestTwig = "#7a5a34";
const orangutanFur = "#c2581f";
const orangutanDark = "#99421a";
const orangutanFace = "#5e4a40";
const muzzle = "#a88a74";
const ropeColour = "#c9b07e";
const stumpWood = "#d8b47a";
const fruitRed = "#c8322e";
const fruitYellow = "#d8b43a";
const hornbillBlack = "#222226";
const signColour = "#7a4a2a";

const tree = { x: 0.2, z: -1.1 };
const nestAt: Triple = [1.35, 3.6, -0.55];
const nestRadius = 0.85;
const babyPivot: Triple = [nestAt[0] + 0.3, nestAt[1] - 0.4, nestAt[2] + 0.25];
const motherArmPivot: Triple = [
  nestAt[0] + 0.28,
  nestAt[1] + 0.68,
  nestAt[2] - 0.05,
];

/* The rope ladder, hanging from the nest's rim down to the ground */
const ladderTop: Triple = [
  nestAt[0] + 0.1,
  nestAt[1] + 0.05,
  nestAt[2] + nestRadius - 0.05,
];
const ladderFoot: Triple = [nestAt[0] + 0.1, 0, 1.25];
const ladderStart = { x: ladderFoot[0], z: ladderFoot[2] + 0.45 };
const ladderFinish = { x: ladderFoot[0] + 1.0, z: ladderFoot[2] + 0.55 };

const stumps = [
  { x: -2.7, z: 0.9, radius: 0.4 },
  { x: -3.3, z: -0.8, radius: 0.32 },
  { x: -1.9, z: 2.5, radius: 0.28 },
];
const saplingAt = { x: -2.2, z: -0.1 };

const addLeafClump = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  colour: string,
) => {
  builder.sphere("matte", colour, radius, at, [1, 0.72, 1], 12);
};

const addButtress = (builder: AttractionBuilder, angle: number) => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.95, 0);
  shape.quadraticCurveTo(0.2, 0.25, 0, 1.3);
  shape.lineTo(0, 0);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: false,
    curveSegments: builder.segments(7, 3),
  });
  geometry.translate(0, 0, -0.07);
  builder.add("matte", bark, geometry, {
    at: [tree.x, 0, tree.z],
    rotation: [0, angle, 0],
  });
};

const buildTree = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    bark,
    [
      [0.7, 0],
      [0.5, 0.4],
      [0.42, 1.2],
      [0.36, 4.0],
      [0.3, 6.4],
      [0, 6.6],
    ],
    [tree.x, 0, tree.z],
    "y",
    builder.isFar ? 8 : 14,
  );
  if (builder.isFar) {
    addLeafClump(builder, [tree.x, 7.0, tree.z], 2.3, leafMid);
    return;
  }
  for (let index = 0; index < 4; index++) {
    addButtress(builder, index * 1.57 + 0.6);
  }
  /* The fork that holds the nest, and boughs up into the canopy */
  const forks: Triple[] = [
    [nestAt[0] + 0.5, nestAt[1] - 0.1, nestAt[2] - 0.3],
    [nestAt[0] - 0.2, nestAt[1] - 0.15, nestAt[2] + 0.5],
  ];
  forks.forEach((tip) => {
    builder.bar("matte", bark, [tree.x, nestAt[1] - 0.7, tree.z], tip, 0.16, 7);
  });
  const crown: [number, number, number, number][] = [
    [0, 7.1, 0, 1.7],
    [1.4, 6.5, 0.3, 1.1],
    [-1.3, 6.6, -0.4, 1.15],
    [0.3, 6.4, -1.4, 1.0],
    [-0.5, 5.6, 1.0, 0.85],
  ];
  crown.forEach(([dx, y, dz, radius], index) => {
    builder.bar(
      "matte",
      bark,
      [tree.x, 5.2, tree.z],
      [tree.x + dx * 0.8, y - 0.4, tree.z + dz * 0.8],
      0.14,
      6,
    );
    addLeafClump(
      builder,
      [tree.x + dx, y, tree.z + dz],
      radius,
      index % 2 === 0 ? leafMid : index === 1 ? leafDeep : leafBright,
    );
  });
  /* Bunches of wild fruit, the orangutans' favourite food */
  [
    [tree.x - 1.0, 5.0, tree.z + 0.9],
    [tree.x + 1.5, 5.6, tree.z + 0.6],
  ].forEach(([x, y, z]) => {
    [
      [0, 0, 0],
      [0.08, -0.06, 0.03],
      [-0.07, -0.05, -0.02],
      [0.01, -0.12, 0.05],
    ].forEach(([dx, dy, dz], fruit) => {
      builder.sphere(
        "paint",
        fruit % 2 === 0 ? fruitRed : fruitYellow,
        0.07,
        [x + dx, y + dy, z + dz],
        [1, 1, 1],
        6,
      );
    });
  });
};

const buildNest = (builder: AttractionBuilder) => {
  const [x, y, z] = nestAt;
  builder.lathe(
    "matte",
    nestTwig,
    [
      [0, -0.3],
      [nestRadius * 0.6, -0.25],
      [nestRadius, 0],
      [nestRadius * 1.02, 0.12],
      [nestRadius * 0.9, 0.15],
      [nestRadius * 0.75, -0.05],
      [0, -0.08],
    ],
    [x, y, z],
    "y",
    builder.isFar ? 8 : 18,
  );
  if (builder.isFar) {
    return;
  }
  /* Twigs woven round, and fresh leaves tucked in for a soft bed */
  for (let twig = 0; twig < 12; twig++) {
    const angle = (twig / 12) * Math.PI * 2;
    const next = angle + 1.1;
    builder.bar(
      "matte",
      shade(nestTwig, twig % 2 === 0 ? 0.85 : 1.1),
      [
        x + Math.sin(angle) * nestRadius,
        y + 0.06 + (twig % 3) * 0.03,
        z + Math.cos(angle) * nestRadius,
      ],
      [
        x + Math.sin(next) * nestRadius * 0.95,
        y + 0.1,
        z + Math.cos(next) * nestRadius * 0.95,
      ],
      0.035,
      4,
    );
  }
  for (let leaf = 0; leaf < 8; leaf++) {
    const angle = (leaf / 8) * Math.PI * 2 + 0.2;
    builder.sphere(
      "matte",
      leaf % 2 === 0 ? leafBright : leafMid,
      0.18,
      [
        x + Math.sin(angle) * nestRadius * 0.95,
        y + 0.12,
        z + Math.cos(angle) * nestRadius * 0.95,
      ],
      [1.2, 0.45, 0.8],
      7,
    );
  }
};

/** The mother, sitting in her nest with long shaggy arms. */
const buildMother = (builder: AttractionBuilder) => {
  const [x, y, z] = nestAt;
  const body: Triple = [x - 0.15, y + 0.3, z - 0.1];
  builder.sphere(
    "matte",
    orangutanFur,
    0.36,
    body,
    [1, 1.05, 0.85],
    builder.isFar ? 8 : 14,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    shade(orangutanFur, 1.12),
    0.24,
    [body[0], body[1] - 0.02, body[2] + 0.16],
    [1, 1, 0.6],
    10,
  );
  const head: Triple = [body[0], body[1] + 0.42, body[2] + 0.06];
  builder.sphere("matte", orangutanFur, 0.2, head, [1, 0.95, 0.95], 12);
  builder.sphere(
    "matte",
    orangutanFace,
    0.15,
    [head[0], head[1] - 0.02, head[2] + 0.1],
    [1, 1.05, 0.6],
    10,
  );
  builder.sphere(
    "matte",
    muzzle,
    0.08,
    [head[0], head[1] - 0.08, head[2] + 0.19],
    [1.2, 0.8, 0.7],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [head[0] + side * 0.05, head[1] + 0.03, head[2] + 0.2],
      [1, 1, 1],
      5,
    );
    builder.sphere(
      "matte",
      orangutanDark,
      0.07,
      [head[0] + side * 0.17, head[1] + 0.05, head[2] - 0.02],
      [0.6, 1.2, 1],
      6,
    );
  });
  /* Her left arm drapes over the rim, holding on */
  builder.bar(
    "matte",
    orangutanDark,
    [body[0] - 0.28, body[1] + 0.2, body[2]],
    [body[0] - 0.62, body[1] - 0.08, body[2] + 0.35],
    0.14,
    6,
  );
  builder.bar(
    "matte",
    orangutanDark,
    [body[0] - 0.62, body[1] - 0.08, body[2] + 0.35],
    [body[0] - 0.55, body[1] - 0.4, body[2] + 0.62],
    0.12,
    6,
  );
  builder.sphere(
    "matte",
    orangutanFace,
    0.07,
    [body[0] - 0.55, body[1] - 0.43, body[2] + 0.64],
    [1, 0.7, 1.2],
    6,
  );
  /* Shaggy tufts of hair */
  [0.4, 1.6, 2.8, 4.2, 5.4].forEach((angle) => {
    builder.sphere(
      "matte",
      orangutanDark,
      0.1,
      [
        body[0] + Math.sin(angle) * 0.32,
        body[1] - 0.05 + (angle % 1) * 0.2,
        body[2] + Math.cos(angle) * 0.27,
      ],
      [0.6, 1.4, 0.6],
      6,
    );
  });
};

const buildMotherArm = (builder: AttractionBuilder) => {
  /* Her right arm, reaching up to pick fruit */
  builder.bar("matte", orangutanDark, [0, 0, 0], [0.35, 0.45, 0.15], 0.13, 6);
  builder.bar(
    "matte",
    orangutanDark,
    [0.35, 0.45, 0.15],
    [0.3, 0.95, 0.2],
    0.11,
    6,
  );
  builder.sphere(
    "matte",
    orangutanFace,
    0.07,
    [0.3, 1.0, 0.2],
    [1, 1.2, 0.8],
    6,
  );
  builder.sphere("paint", fruitRed, 0.08, [0.3, 1.08, 0.26], [1, 1, 1], 8);
};

const buildBaby = (builder: AttractionBuilder) => {
  builder.sphere("matte", orangutanFur, 0.15, [0, 0.15, 0], [1, 1.1, 0.9], 10);
  const head: Triple = [0, 0.37, 0.03];
  builder.sphere("matte", orangutanFur, 0.12, head, [1, 1, 1], 10);
  builder.sphere(
    "matte",
    muzzle,
    0.09,
    [head[0], head[1] - 0.01, head[2] + 0.06],
    [1, 1.05, 0.65],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [head[0] + side * 0.04, head[1] + 0.02, head[2] + 0.13],
      [1, 1, 1],
      5,
    );
    builder.bar(
      "matte",
      orangutanDark,
      [side * 0.1, 0.25, 0.02],
      [side * 0.22, 0.42, 0.08],
      0.06,
      5,
    );
  });
  /* Tufty hair that sticks straight up */
  builder.sphere(
    "matte",
    orangutanDark,
    0.05,
    [0, 0.46, 0],
    [0.7, 1.4, 0.7],
    6,
  );
};

const buildLadder = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [-0.22, 0.22].forEach((side) => {
    builder.bar(
      "matte",
      ropeColour,
      [ladderTop[0] + side, ladderTop[1], ladderTop[2]],
      [ladderFoot[0] + side, ladderFoot[1], ladderFoot[2]],
      0.04,
      5,
    );
  });
  const rungs = 12;
  for (let rung = 1; rung < rungs; rung++) {
    const share = rung / rungs;
    builder.cylinder("matte", shade(nestTwig, 1.15), {
      radius: 0.03,
      length: 0.5,
      at: [
        ladderTop[0],
        ladderTop[1] + (ladderFoot[1] - ladderTop[1]) * share,
        ladderTop[2] + (ladderFoot[2] - ladderTop[2]) * share,
      ],
      axis: "x",
      segments: 6,
    });
  }
  /* Pegs holding the ladder's feet in the ground */
  [-0.22, 0.22].forEach((side) => {
    builder.box(
      "matte",
      barkDark,
      [0.06, 0.2, 0.06],
      [ladderFoot[0] + side, 0.1, ladderFoot[2] + 0.08],
    );
  });
};

/** Stumps where trees were cut down, and a sapling planted to grow back. */
const buildClearing = (builder: AttractionBuilder) => {
  stumps.forEach(({ x, z, radius }) => {
    builder.cylinder("matte", bark, {
      radius: radius + 0.05,
      radiusEnd: radius,
      length: 0.45,
      at: [x, 0.225, z],
      segments: builder.isFar ? 6 : 14,
    });
    if (builder.isFar) {
      return;
    }
    builder.cylinder("matte", stumpWood, {
      radius: radius - 0.02,
      length: 0.02,
      at: [x, 0.455, z],
      segments: 14,
    });
    [0.35, 0.65].forEach((share) => {
      builder.torus(
        "matte",
        shade(stumpWood, 0.8),
        radius * share,
        0.01,
        [x, 0.465, z],
        "y",
        12,
      );
    });
    builder.cylinder("matte", "#c9b48a", {
      radius: radius + 0.35,
      length: 0.02,
      at: [x, 0.01, z],
      segments: 12,
    });
  });
  if (builder.isFar) {
    return;
  }
  /* The young tree, tied to a stake to keep it straight */
  const { x, z } = saplingAt;
  builder.cylinder("matte", "#5a3d26", {
    radius: 0.3,
    length: 0.06,
    at: [x, 0.03, z],
    segments: 12,
  });
  builder.bar("matte", bark, [x, 0, z], [x, 0.9, z], 0.05, 5);
  builder.box("matte", stumpWood, [0.04, 1.0, 0.04], [x + 0.1, 0.5, z]);
  builder.torus("matte", "#4a8a3a", 0.06, 0.012, [x + 0.05, 0.6, z], "y", 8);
  [
    [0, 1.0, 0, 0.28],
    [0.15, 0.85, 0.08, 0.2],
    [-0.14, 0.88, -0.05, 0.2],
  ].forEach(([dx, y, dz, radius]) => {
    builder.sphere(
      "matte",
      leafBright,
      radius,
      [x + dx, y, z + dz],
      [1, 0.8, 1],
      8,
    );
  });
  /* A watering can left beside it */
  builder.cylinder("paint", "#2f7ab8", {
    radius: 0.12,
    radiusEnd: 0.1,
    length: 0.24,
    at: [x + 0.45, 0.12, z + 0.3],
    segments: 12,
  });
  builder.bar(
    "paint",
    "#2f7ab8",
    [x + 0.55, 0.12, z + 0.3],
    [x + 0.75, 0.3, z + 0.3],
    0.03,
    5,
  );
  builder.torus(
    "paint",
    "#2f7ab8",
    0.08,
    0.015,
    [x + 0.45, 0.28, z + 0.3],
    "z",
    10,
  );
};

const buildGround = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#4f3b29", {
    radius: 2.2,
    length: 0.03,
    at: [tree.x + 0.4, 0.015, tree.z + 0.4],
    segments: builder.segments(26, 10),
  });
  if (builder.isFar) {
    return;
  }
  /* Fruit dropped by the orangutans, peel and all */
  [
    [2.1, 0.4],
    [1.9, 0.9],
    [2.4, 0.7],
  ].forEach(([x, z], index) => {
    builder.sphere(
      "paint",
      index === 1 ? fruitYellow : fruitRed,
      0.08,
      [x, 0.07, z],
      [1, 0.85, 1],
      7,
    );
  });
  addBush(builder, [3.4, 0, -1.6], 0.6, leafDeep);
  addBush(builder, [3.2, 0, 1.8], 0.45, leafMid);
  addBush(builder, [-0.8, 0, -3.0], 0.55, leafBright);
};

const buildHornbill = (builder: AttractionBuilder) => {
  builder.sphere("paint", hornbillBlack, 0.13, [0, 0, 0], [0.75, 0.7, 1.5], 8);
  builder.sphere("paint", hornbillBlack, 0.08, [0, 0.04, 0.2], [1, 1, 1], 6);
  builder.cylinder("paint", "#f2c84a", {
    radius: 0.04,
    radiusEnd: 0.006,
    length: 0.22,
    at: [0, 0.03, 0.35],
    axis: "z",
    segments: 6,
  });
  builder.box("paint", fruitRed, [0.04, 0.05, 0.14], [0, 0.1, 0.3]);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      hornbillBlack,
      [0.5, 0.02, 0.22],
      [side * 0.3, 0.03, 0],
      [0, 0, side * 0.15],
    );
    builder.box(
      "paint",
      palette.white,
      [0.16, 0.021, 0.1],
      [side * 0.5, 0.06, -0.05],
      [0, 0, side * 0.15],
    );
  });
  builder.box("paint", palette.white, [0.16, 0.02, 0.3], [0, 0, -0.32]);
  builder.box("paint", hornbillBlack, [0.16, 0.021, 0.08], [0, 0.002, -0.38]);
};

const ladderRide = (progress: number): LocalSpot => {
  const climb = progress < 0.5 ? progress / 0.5 : (1 - progress) / 0.5;
  const share = Math.min(0.88, Math.max(0, (climb - 0.1) / 0.9));
  const outside = progress < 0.5 ? ladderStart : ladderFinish;
  const onLadder = Math.min(1, climb / 0.1);
  const x = ladderFoot[0];
  const z = ladderFoot[2] + 0.2 + (ladderTop[2] - ladderFoot[2] - 0.2) * share;
  return {
    x: outside.x + (x - outside.x) * onLadder,
    y: (ladderTop[1] - 0.6) * share,
    z: outside.z + (z - outside.z) * onLadder,
    heading: Math.PI,
  };
};

export const orangutanNestModel: CuriosityModel = {
  kind: "orangutan-nest",
  islandId: "jungle-reach",
  name: "Orangutan Nest",
  fact: "Orangutans live in the rainforests of Borneo and Sumatra. Every evening they bend branches into a fresh, leafy nest high in the trees to sleep in. A baby stays with its mother for about eight years. When people cut down the forest, orangutans lose their homes, so planting new trees helps them.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Recognise that environments can change and that this can sometimes pose dangers to living things (deforestation).",
  footprint: 5,
  setting: "inland",
  signSpot: { x: -0.5, z: 4.1 },
  build: (builder) => {
    buildGround(builder);
    buildTree(builder);
    buildNest(builder);
    buildMother(builder);
    buildLadder(builder);
    buildClearing(builder);
    addSignBoard(builder, [-0.5, 0, 4.1], signColour);
  },
  moving: [
    {
      name: "baby orangutan",
      pivot: babyPivot,
      build: buildBaby,
      motion: { kind: "rise", reach: 7, height: 0.45, period: 1.6 },
    },
    {
      name: "mother's arm",
      pivot: motherArmPivot,
      build: buildMotherArm,
      motion: { kind: "swing", axis: "x", amplitude: 0.25, period: 3.4 },
    },
  ],
  wanderers: [
    {
      name: "hornbills",
      build: buildHornbill,
      count: 2,
      centre: { x: tree.x, z: tree.z },
      radius: 3.0,
      speed: 1.1,
      height: 5.2,
      bob: 0.2,
    },
  ],
  rides: [
    {
      id: "rope-ladder",
      name: "the rope ladder",
      start: ladderStart,
      reach: 0.5,
      seconds: 9,
      finish: ladderFinish,
      follow: ladderRide,
    },
  ],
  blockers: [
    { x: tree.x, z: tree.z, radius: 1.0 },
    ...stumps.map(({ x, z, radius }): LocalBlocker => ({
      x,
      z,
      radius: radius + 0.1,
    })),
    { x: saplingAt.x, z: saplingAt.z, radius: 0.3 },
  ],
  play: {
    label: "Spot the baby",
    news: "Peekaboo! A baby orangutan popped its tufty head up out of the nest. It will stay with its mum for years, learning which fruits to eat.",
  },
};
