import { CylinderGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowBlock = "#e9f0f5";
const snowBlue = "#d3e1ea";
const iceBlue = "#bfe3f2";
const flagRed = "#d23a3a";
const flagYellow = "#f2c43a";
const catapultTimber = "#8a5a35";
const targetRed = "#d0343b";
const scarfGreen = "#3f8a4f";
const signColour = "#2f5d7c";

/* The fort's walls: a U of snow blocks with a gateway facing visitors */
const fort = {
  minX: -2.0,
  maxX: 2.0,
  minZ: -2.9,
  maxZ: 0.3,
  height: 0.95,
  thickness: 0.42,
};
const gateHalf = 0.65;
const towerRadius = 0.58;
const towerHeight = 1.55;
const towers: LocalPoint[] = [
  { x: fort.minX, z: fort.minZ },
  { x: fort.maxX, z: fort.minZ },
];
const flagAt: Triple = [fort.minX, towerHeight + 1.25, fort.minZ];
const catapult = { x: -1.3, z: 2.2 };
const axleAt: Triple = [catapult.x, 0.58, catapult.z];
const targets = [
  { x: 3.3, z: 2.5, turn: -Math.PI / 2 - 0.3 },
  { x: 3.5, z: 0.9, turn: -Math.PI / 2 + 0.1 },
];
const signAt: Triple = [1.0, 0, 4.3];

/* Each wall run, from one end to the other, for blocks and blockers */
const wallRuns: { from: LocalPoint; to: LocalPoint }[] = [
  { from: { x: fort.minX, z: fort.minZ }, to: { x: fort.maxX, z: fort.minZ } },
  { from: { x: fort.minX, z: fort.minZ }, to: { x: fort.minX, z: fort.maxZ } },
  { from: { x: fort.maxX, z: fort.minZ }, to: { x: fort.maxX, z: fort.maxZ } },
  { from: { x: fort.minX, z: fort.maxZ }, to: { x: -gateHalf, z: fort.maxZ } },
  { from: { x: gateHalf, z: fort.maxZ }, to: { x: fort.maxX, z: fort.maxZ } },
];

/** A rounded block with fewer bevel steps than the builder's own, to save triangles. */
const addSoftBlock = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  size: Triple,
  radius: number,
  at: Triple,
  rotation?: Triple,
) => {
  if (builder.isFar) {
    builder.box(finish, colour, size, at, rotation);
    return;
  }
  builder.add(
    finish,
    colour,
    new RoundedBoxGeometry(
      size[0],
      size[1],
      size[2],
      1,
      Math.min(radius, ...size.map((side) => side / 2 - 0.001)),
    ),
    { at, rotation },
  );
};

/** A wall of snow blocks laid like bricks, with merlons along the top. */
const buildWall = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2;
  const at = (share: number, y: number): Triple => [
    from.x + (to.x - from.x) * share,
    y,
    from.z + (to.z - from.z) * share,
  ];
  if (builder.isFar) {
    builder.box(
      "matte",
      snowBlock,
      [length + fort.thickness, fort.height + 0.2, fort.thickness],
      at(0.5, (fort.height + 0.2) / 2),
      [0, turn, 0],
    );
    return;
  }
  const courses = 3;
  const courseHeight = fort.height / courses;
  for (let course = 0; course < courses; course++) {
    const blockLength = 0.52;
    const offset = course % 2 === 0 ? 0 : blockLength / 2;
    const count = Math.ceil((length + offset) / blockLength);
    for (let block = 0; block < count; block++) {
      const start = Math.max(0, block * blockLength - offset);
      const end = Math.min(length, (block + 1) * blockLength - offset);
      if (end - start < 0.05) {
        continue;
      }
      const middle = (start + end) / 2 / length;
      builder.box(
        "matte",
        shade(snowBlock, 0.95 + ((block * 7 + course * 3) % 5) * 0.025),
        [
          end - start - 0.03,
          courseHeight - 0.025,
          fort.thickness - (course === 2 ? 0.04 : 0),
        ],
        at(middle, courseHeight * (course + 0.5)),
        [0, turn, 0],
      );
    }
  }
  /* Merlons: every other block stands up above the wall */
  const merlons = Math.max(1, Math.round(length / 0.6));
  for (let merlon = 0; merlon < merlons; merlon++) {
    const share = (merlon + 0.5) / merlons;
    if (merlon % 2 === 1 && merlons > 2) {
      continue;
    }
    addSoftBlock(
      builder,
      "matte",
      snow,
      [0.42, 0.32, fort.thickness],
      0.06,
      at(share, fort.height + 0.16),
      [0, turn, 0],
    );
  }
  builder.box(
    "matte",
    snowBlue,
    [length, 0.02, fort.thickness + 0.06],
    at(0.5, 0.01),
    [0, turn, 0],
  );
};

const buildTowers = (builder: AttractionBuilder) => {
  towers.forEach(({ x, z }, index) => {
    builder.cylinder("matte", snowBlock, {
      radius: towerRadius,
      radiusEnd: towerRadius - 0.05,
      length: towerHeight,
      at: [x, towerHeight / 2, z],
      segments: builder.isFar ? 10 : 20,
    });
    if (builder.isFar) {
      return;
    }
    /* Rings of block joints, and merlons round the top */
    [0.38, 0.78, 1.18].forEach((height) => {
      builder.cylinder("matte", snowBlue, {
        radius: towerRadius + 0.005 - height * 0.033,
        length: 0.025,
        at: [x, height, z],
        segments: 20,
        isOpen: true,
      });
    });
    for (let merlon = 0; merlon < 6; merlon++) {
      const angle = (merlon / 6) * Math.PI * 2 + index * 0.3;
      addSoftBlock(
        builder,
        "matte",
        snow,
        [0.3, 0.3, 0.2],
        0.06,
        [
          x + Math.sin(angle) * (towerRadius - 0.12),
          towerHeight + 0.13,
          z + Math.cos(angle) * (towerRadius - 0.12),
        ],
        [0, angle, 0],
      );
    }
    /* An arrow slit with a glint of ice */
    builder.box(
      "glass",
      iceBlue,
      [0.08, 0.32, 0.04],
      [x + (index === 0 ? 0.3 : -0.3), 1.0, z + towerRadius - 0.06],
      [0, index === 0 ? 0.5 : -0.5, 0],
    );
  });
  /* The flagpole on the west tower */
  builder.cylinder("paint", palette.darkTimber, {
    radius: 0.035,
    length: 1.45,
    at: [flagAt[0], towerHeight + 0.72, flagAt[2]],
    segments: 6,
  });
  if (!builder.isFar) {
    builder.sphere(
      "metal",
      palette.brass,
      0.06,
      [flagAt[0], towerHeight + 1.47, flagAt[2]],
      [1, 1, 1],
      8,
    );
  }
};

const buildFlag = (builder: AttractionBuilder) => {
  /* A pennant in two colours, hung from the pole at the origin */
  builder.box("paint", flagRed, [0.62, 0.36, 0.02], [0.33, 0, 0]);
  builder.box("paint", flagYellow, [0.62, 0.1, 0.025], [0.33, 0, 0]);
  builder.cylinder("paint", flagYellow, {
    radius: 0.07,
    length: 0.03,
    at: [0.5, 0, 0],
    axis: "z",
    segments: 10,
  });
};

const buildCatapultFrame = (builder: AttractionBuilder) => {
  const { x, z } = catapult;
  [-0.26, 0.26].forEach((side) => {
    builder.box("matte", catapultTimber, [1.2, 0.1, 0.1], [x, 0.22, z + side]);
    if (builder.isFar) {
      return;
    }
    /* An A-frame each side holding the axle, and a wheel at each corner */
    builder.bar(
      "matte",
      shade(catapultTimber, 0.9),
      [x - 0.32, 0.26, z + side],
      [x, axleAt[1] + 0.05, z + side],
      0.07,
      4,
    );
    builder.bar(
      "matte",
      shade(catapultTimber, 0.9),
      [x + 0.32, 0.26, z + side],
      [x, axleAt[1] + 0.05, z + side],
      0.07,
      4,
    );
    builder.bar(
      "matte",
      shade(catapultTimber, 0.9),
      [x + 0.45, 0.26, z + side],
      [x + 0.3, 0.98, z + side],
      0.07,
      4,
    );
    [-0.45, 0.45].forEach((along) => {
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.17,
        length: 0.07,
        at: [x + along, 0.17, z + side * 1.2],
        axis: "z",
        segments: 14,
      });
      builder.cylinder("metal", palette.darkSteel, {
        radius: 0.05,
        length: 0.09,
        at: [x + along, 0.17, z + side * 1.2],
        axis: "z",
        segments: 8,
      });
    });
  });
  if (builder.isFar) {
    return;
  }
  [-0.5, 0.5].forEach((along) => {
    builder.box(
      "matte",
      catapultTimber,
      [0.1, 0.08, 0.62],
      [x + along, 0.22, z],
    );
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.04,
    length: 0.66,
    at: axleAt,
    axis: "z",
    segments: 8,
  });
  /* The padded crossbar the arm strikes as it throws */
  builder.box("matte", catapultTimber, [0.1, 0.1, 0.62], [x + 0.3, 0.98, z]);
  addSoftBlock(builder, "matte", "#7b4a6a", [0.14, 0.14, 0.4], 0.05, [
    x + 0.28,
    1.04,
    z,
  ]);
};

/** The throwing arm, a lever turning on its axle at the origin. */
const buildCatapultArm = (builder: AttractionBuilder) => {
  const rest = 2.25;
  const direction: Triple = [Math.cos(rest), Math.sin(rest), 0];
  const cup: Triple = [direction[0] * 0.95, direction[1] * 0.95, 0];
  builder.bar(
    "matte",
    palette.paleTimber,
    [-direction[0] * 0.25, -direction[1] * 0.25, 0],
    cup,
    0.08,
    6,
  );
  builder.lathe(
    "matte",
    palette.darkTimber,
    [
      [0, -0.06],
      [0.13, -0.02],
      [0.15, 0.05],
      [0.12, 0.06],
      [0.1, 0.0],
      [0, -0.02],
    ],
    cup,
    "y",
    12,
  );
  builder.sphere(
    "matte",
    snow,
    0.1,
    [cup[0], cup[1] + 0.08, cup[2]],
    [1, 1, 1],
    10,
  );
  /* A counterweight box on the short end */
  addSoftBlock(
    builder,
    "matte",
    palette.darkStone,
    [0.22, 0.2, 0.22],
    0.04,
    [-direction[0] * 0.28, -direction[1] * 0.28, 0],
    [0, 0, rest],
  );
};

/** A neat pyramid of snowballs, ready for the battle. */
const addSnowballPile = (
  builder: AttractionBuilder,
  at: Triple,
  rows: number,
) => {
  const radius = 0.1;
  for (let row = 0; row < rows; row++) {
    const across = rows - row;
    for (let column = 0; column < across; column++) {
      for (let line = 0; line < across; line++) {
        if (row === 0 && (column + line) % 2 === 1 && across > 2) {
          continue;
        }
        builder.sphere(
          "matte",
          (column + line + row) % 3 === 0 ? shade(snow, 0.96) : snow,
          radius,
          [
            at[0] + (column - (across - 1) / 2) * radius * 1.9,
            at[1] + radius + row * radius * 1.5,
            at[2] + (line - (across - 1) / 2) * radius * 1.9,
          ],
          [1, 1, 1],
          6,
        );
      }
    }
  }
};

const buildTargets = (builder: AttractionBuilder) => {
  targets.forEach(({ x, z, turn }, index) => {
    const out: Triple = [Math.sin(turn), 0, Math.cos(turn)];
    const face = (distance: number, y: number): Triple => [
      x + out[0] * distance,
      y,
      z + out[2] * distance,
    ];
    /* An easel of three legs holding a round board */
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        palette.darkTimber,
        [x + out[2] * side * 0.35, 0, z - out[0] * side * 0.35],
        face(0.05, 1.3),
        0.06,
        4,
      );
    });
    builder.bar(
      "matte",
      palette.darkTimber,
      face(-0.4, 0),
      face(0, 1.2),
      0.06,
      4,
    );
    const rings = builder.isFar ? 1 : 5;
    for (let ring = 0; ring < rings; ring++) {
      const radius = 0.5 - ring * 0.1;
      builder.add(
        "paint",
        ring % 2 === 0 ? (ring === 4 ? flagYellow : targetRed) : palette.white,
        new CylinderGeometry(radius, radius, 0.04, builder.segments(20, 10))
          .rotateX(Math.PI / 2)
          .rotateY(turn),
        { at: face(0.08 + ring * 0.012, 0.95) },
      );
    }
    if (builder.isFar) {
      return;
    }
    /* Splats where snowballs have hit */
    [
      [0.12, 0.1],
      [-0.25, -0.15],
      [0.3, -0.25],
    ]
      .slice(0, index + 2)
      .forEach(([across, up]) => {
        builder.sphere(
          "matte",
          snow,
          0.08,
          [
            x + out[0] * 0.17 + out[2] * across,
            0.95 + up,
            z + out[2] * 0.17 - out[0] * across,
          ],
          [1.3, 1.3, 0.4],
          8,
        );
      });
  });
};

const buildProps = (builder: AttractionBuilder) => {
  builder.box("matte", snowBlue, [1.3, 0.02, 3.6], [0.5, 0.01, 2.4]);
  if (builder.isFar) {
    return;
  }
  addSnowballPile(builder, [catapult.x + 0.9, 0, catapult.z - 0.75], 3);
  addSnowballPile(builder, [-1.2, 0, -1.9], 3);
  addSnowballPile(builder, [1.25, 0, -2.0], 2);
  /* A block mould and a shovel stuck in the snow, for making more blocks */
  const mould: Triple = [1.2, 0, -0.6];
  builder.box(
    "paint",
    "#3f7fc8",
    [0.42, 0.24, 0.26],
    [mould[0], 0.12, mould[2]],
  );
  builder.box(
    "matte",
    snowBlock,
    [0.36, 0.05, 0.2],
    [mould[0], 0.23, mould[2]],
  );
  builder.bar(
    "matte",
    palette.paleTimber,
    [mould[0] + 0.45, 0.3, mould[2] + 0.1],
    [mould[0] + 0.6, 1.15, mould[2] + 0.25],
    0.04,
    5,
  );
  builder.box(
    "paint",
    flagRed,
    [0.24, 0.3, 0.03],
    [mould[0] + 0.42, 0.18, mould[2] + 0.07],
    [0.15, 0.6, -0.2],
  );
  /* A scarf left hanging over the wall, and a dropped mitten */
  builder.box(
    "matte",
    scarfGreen,
    [0.14, 0.5, 0.04],
    [-0.9, fort.height - 0.1, fort.maxZ + 0.23],
  );
  builder.box(
    "matte",
    flagYellow,
    [0.15, 0.04, 0.05],
    [-0.9, fort.height - 0.2, fort.maxZ + 0.25],
  );
  builder.sphere("matte", flagRed, 0.08, [0.3, 0.04, 1.5], [1.2, 0.45, 1], 8);
  /* Snow drifts */
  [
    [-3.4, -0.4, 0.55],
    [3.0, -2.6, 0.5],
    [-3.1, 2.8, 0.4],
    [2.3, 3.6, 0.35],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
};

export const snowFortModel: CuriosityModel = {
  kind: "snow-fort",
  islandId: "frost-isle",
  name: "Snow Fort",
  fact: "A catapult is a lever: a long arm that turns on a pivot. When you push one end down, the other end swings up fast and throws whatever sits in its cup. The longer the arm, the further the snowball can fly! Seesaws, scissors and bottle openers are levers too.",
  curriculumLink:
    "Design and technology, Key Stage 1: explore and use mechanisms, such as levers, sliders, wheels and axles, in their products.",
  footprint: 4.8,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    wallRuns.forEach(({ from, to }) => {
      buildWall(builder, from, to);
    });
    buildTowers(builder);
    buildCatapultFrame(builder);
    buildTargets(builder);
    buildProps(builder);
    if (builder.isFar) {
      builder.box(
        "paint",
        flagRed,
        [0.62, 0.36, 0.02],
        [flagAt[0] + 0.33, flagAt[1], flagAt[2]],
      );
      builder.bar(
        "matte",
        palette.paleTimber,
        axleAt,
        [axleAt[0] - 0.55, axleAt[1] + 0.7, axleAt[2]],
        0.1,
        4,
      );
    }
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "catapult arm",
      pivot: axleAt,
      build: buildCatapultArm,
      motion: { kind: "nod", axis: "z", reach: 6, amplitude: 0.7, period: 1.6 },
    },
    {
      name: "flag",
      pivot: flagAt,
      build: buildFlag,
      motion: { kind: "swing", axis: "y", amplitude: 0.35, period: 2.6 },
    },
  ],
  blockers: [
    ...wallRuns.flatMap(({ from, to }) =>
      listWallBlockers(from, to, 0.3, 0.35),
    ),
    ...towers.map(({ x, z }) => ({ x, z, radius: towerRadius + 0.05 })),
    { x: catapult.x, z: catapult.z, radius: 0.6 },
    ...targets.map(({ x, z }) => ({ x, z, radius: 0.35 })),
  ] satisfies LocalBlocker[],
  play: {
    label: "Fire a snowball",
    news: "Thwump! You pushed down the lever, the arm swung up, and your snowball sailed through the air. Bullseye!",
  },
};
