import { TorusGeometry } from "three";
import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const oak = "#7a5134";
const oakDark = "#5b3a24";
const oakPale = "#a37a52";
const ironBand = "#3a3b3e";
const rope = "#c9ad7a";
const leather = "#6e4026";
const castleStone = "#8d857a";
const castleDark = "#6a635a";
const targetRed = "#b8322b";
const targetWhite = "#efe6d2";
const banner = "#c8a23a";
const ballStone = "#9b948a";
const signColour = "#6b3a22";
const ashPad = "#5b4a42";

/* The trebuchet stands west, aiming east at a castle wall. */
const frame = { x: -1.3, z: -0.7 };
const axleHeight = 2.75;
const sideGap = 0.62;
const longArm = 3.0;
const shortArm = 0.85;
/* At rest the long arm is pulled down behind, the counterweight raised */
const restAngle = Math.PI + 0.35;
const along: [number, number] = [Math.cos(restAngle), Math.sin(restAngle)];
const axleAt: Triple = [frame.x, axleHeight, frame.z];
const wall = { x: 4.05, fromZ: -2.3, toZ: 0.9, height: 2.3, thick: 0.6 };
const tower = { x: 4.05, z: -2.75, radius: 0.72, height: 3.2 };

/** A square timber from one point to another in an upright x–y plane. */
const addTimber = (
  builder: AttractionBuilder,
  from: [number, number],
  to: [number, number],
  z: number,
  thickness: number,
  colour: string = oak,
) => {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  builder.box(
    "matte",
    colour,
    [length, thickness, thickness],
    [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z],
    [0, 0, Math.atan2(to[1] - from[1], to[0] - from[0])],
  );
};

/** The base frame on its four wheels, and the two A-frames holding the axle. */
const buildFrame = (builder: AttractionBuilder) => {
  const { x, z } = frame;
  [-1, 1].forEach((side) => {
    const sideZ = z + side * sideGap;
    builder.box("matte", oak, [3.4, 0.24, 0.24], [x, 0.56, sideZ]);
    /* Uprights meeting at the axle, with a brace across */
    addTimber(builder, [x - 1.15, 0.6], [x, axleHeight], sideZ, 0.2);
    addTimber(builder, [x + 1.15, 0.6], [x, axleHeight], sideZ, 0.2);
    builder.box(
      "matte",
      oak,
      [0.22, axleHeight - 0.5, 0.2],
      [x, axleHeight / 2 + 0.3, sideZ],
    );
    if (!builder.isFar) {
      builder.box("matte", oakDark, [1.3, 0.14, 0.16], [x, 1.55, sideZ]);
      /* An iron cap where the axle sits */
      builder.box("metal", ironBand, [0.34, 0.3, 0.26], [x, axleHeight, sideZ]);
      [-1.3, 1.3].forEach((dx) => {
        builder.box(
          "metal",
          ironBand,
          [0.06, 0.27, 0.27],
          [x + dx, 0.56, sideZ],
        );
      });
    }
  });
  [-1.45, 0, 1.45].forEach((dx) => {
    builder.box(
      "matte",
      oakDark,
      [0.2, 0.2, sideGap * 2 + 0.3],
      [x + dx, 0.62, z],
    );
  });
  builder.cylinder("metal", ironBand, {
    radius: 0.09,
    length: sideGap * 2 + 0.5,
    at: axleAt,
    axis: "z",
    segments: 12,
  });
  /* Four solid wooden wheels */
  [-1.1, 1.1].forEach((dx) => {
    [-1, 1].forEach((side) => {
      const at: Triple = [x + dx, 0.36, z + side * (sideGap + 0.22)];
      builder.cylinder("matte", oakPale, {
        radius: 0.36,
        length: 0.14,
        at,
        axis: "z",
        segments: builder.isFar ? 6 : 18,
      });
      if (!builder.isFar) {
        builder.add("metal", ironBand, new TorusGeometry(0.36, 0.035, 4, 16), {
          at,
        });
        builder.cylinder("metal", ironBand, {
          radius: 0.08,
          length: 0.2,
          at,
          axis: "z",
          segments: 8,
        });
      }
    });
  });
  if (builder.isFar) {
    return;
  }
  /* The trough the sling drags along before it swings up */
  builder.box("matte", oakPale, [2.0, 0.06, 0.6], [x - 1.4, 0.72, z]);
  [-0.3, 0.3].forEach((dz) => {
    builder.box("matte", oakDark, [2.0, 0.12, 0.05], [x - 1.4, 0.8, z + dz]);
  });
  /* A winch drum to pull the arm back down, with spokes */
  const winch: Triple = [x + 0.75, 1.0, z];
  builder.cylinder("matte", oakDark, {
    radius: 0.14,
    length: sideGap * 2,
    at: winch,
    axis: "z",
    segments: 12,
  });
  [-1, 1].forEach((side) => {
    for (let spoke = 0; spoke < 3; spoke++) {
      const angle = (spoke / 3) * Math.PI;
      builder.box(
        "matte",
        oakPale,
        [0.7, 0.06, 0.06],
        [winch[0], winch[1], winch[2] + side * (sideGap + 0.12)],
        [0, 0, angle],
      );
    }
  });
};

/** The throwing arm, counterweight box and sling, about the axle. */
const buildArm = (builder: AttractionBuilder) => {
  const length = longArm + shortArm;
  const middle = (longArm - shortArm) / 2;
  builder.box(
    "matte",
    oak,
    [length, 0.2, 0.2],
    [along[0] * middle, along[1] * middle, 0],
    [0, 0, restAngle],
  );
  /* Iron bands round the arm */
  [-0.45, 0.4, 1.2, 2.0, 2.7].forEach((distance) => {
    builder.box(
      "metal",
      ironBand,
      [0.06, 0.24, 0.24],
      [along[0] * distance, along[1] * distance, 0],
      [0, 0, restAngle],
    );
  });
  /* The counterweight: a box of rocks hung from the short end */
  const hinge: [number, number] = [-along[0] * shortArm, -along[1] * shortArm];
  const boxY = hinge[1] - 0.72;
  [-0.22, 0.22].forEach((dz) => {
    builder.bar(
      "metal",
      ironBand,
      [hinge[0], hinge[1], dz],
      [hinge[0], boxY + 0.3, dz * 1.6],
      0.05,
      6,
    );
  });
  builder.cylinder("metal", ironBand, {
    radius: 0.06,
    length: 0.5,
    at: [hinge[0], hinge[1], 0],
    axis: "z",
    segments: 8,
  });
  builder.box("matte", oakDark, [0.8, 0.62, 0.85], [hinge[0], boxY, 0]);
  [-0.31, 0.31].forEach((dy) => {
    builder.box(
      "metal",
      ironBand,
      [0.84, 0.06, 0.89],
      [hinge[0], boxY + dy * 0.8, 0],
    );
  });
  [
    [-0.2, -0.18, 0.1],
    [0.15, 0.2, 0.12],
    [0.05, -0.05, 0.13],
    [-0.18, 0.22, 0.09],
  ].forEach(([dx, dz, radius]) => {
    builder.sphere(
      "matte",
      ballStone,
      radius,
      [hinge[0] + dx, boxY + 0.32, dz],
      [1, 0.7, 1],
      8,
    );
  });
  /* The sling hangs from the long end, a stone in its pouch */
  const tip: [number, number] = [along[0] * longArm, along[1] * longArm];
  const pouch: Triple = [tip[0] - 0.05, tip[1] - 0.62, 0];
  builder.cylinder("metal", ironBand, {
    radius: 0.04,
    length: 0.3,
    at: [tip[0], tip[1], 0],
    axis: "z",
    segments: 6,
  });
  [-0.11, 0.11].forEach((dz) => {
    builder.bar(
      "matte",
      rope,
      [tip[0], tip[1], dz * 0.5],
      [pouch[0], pouch[1] + 0.08, dz],
      0.025,
      4,
    );
  });
  builder.sphere("matte", leather, 0.17, pouch, [1, 0.55, 1.1], 10);
  builder.sphere(
    "matte",
    ballStone,
    0.14,
    [pouch[0], pouch[1] + 0.08, 0],
    [1, 1, 1],
    10,
  );
};

/** A pennant on the castle tower, rippling in the wind. */
const buildPennant = (builder: AttractionBuilder) => {
  builder.box("paint", targetRed, [0.03, 0.34, 0.62], [0, -0.17, -0.31]);
  builder.box("paint", banner, [0.035, 0.08, 0.5], [0, -0.17, -0.27]);
};

/** The target: a castle wall with a tower, battlements and a painted target. */
const buildCastle = (builder: AttractionBuilder) => {
  const length = wall.toZ - wall.fromZ;
  const middleZ = (wall.fromZ + wall.toZ) / 2;
  builder.box(
    "matte",
    castleStone,
    [wall.thick, wall.height, length],
    [wall.x, wall.height / 2, middleZ],
  );
  builder.cylinder("matte", castleStone, {
    radius: tower.radius,
    radiusEnd: tower.radius * 0.92,
    length: tower.height,
    at: [tower.x, tower.height / 2, tower.z],
    segments: 18,
  });
  builder.cylinder("paint", targetRed, {
    radius: tower.radius + 0.1,
    radiusEnd: 0.02,
    length: 1.1,
    at: [tower.x, tower.height + 0.55, tower.z],
    segments: 18,
  });
  /* Battlements along the wall */
  const merlons = builder.isFar ? 3 : 6;
  for (let merlon = 0; merlon < merlons; merlon++) {
    const z = wall.fromZ + 0.2 + ((length - 0.4) * merlon) / (merlons - 1);
    builder.box(
      "matte",
      shade(castleStone, 1.05),
      [wall.thick + 0.08, 0.4, 0.36],
      [wall.x, wall.height + 0.2, z],
    );
  }
  builder.bar(
    "matte",
    oakDark,
    [tower.x, tower.height + 1.0, tower.z],
    [tower.x, tower.height + 1.75, tower.z],
    0.05,
    6,
  );
  if (builder.isFar) {
    return;
  }
  /* A darker plinth course and stone joints */
  builder.box(
    "matte",
    castleDark,
    [wall.thick + 0.1, 0.35, length + 0.05],
    [wall.x, 0.17, middleZ],
  );
  [0.75, 1.35, 1.95].forEach((y) => {
    builder.box(
      "matte",
      castleDark,
      [wall.thick + 0.02, 0.035, length + 0.01],
      [wall.x, y, middleZ],
    );
  });
  builder.torus(
    "matte",
    castleDark,
    tower.radius - 0.02,
    0.06,
    [tower.x, 0.25, tower.z],
    "y",
    18,
  );
  builder.torus(
    "matte",
    shade(castleStone, 1.1),
    tower.radius * 0.93,
    0.07,
    [tower.x, tower.height - 0.05, tower.z],
    "y",
    18,
  );
  /* An arrow-slit window and a little door in the tower */
  builder.box(
    "paint",
    palette.black,
    [0.1, 0.5, 0.1],
    [tower.x - tower.radius + 0.03, 2.1, tower.z],
  );
  builder.box(
    "paint",
    oakDark,
    [0.06, 0.95, 0.55],
    [tower.x - tower.radius * 0.9, 0.48, tower.z + 0.3],
  );
  /* The target painted on the wall's face, towards the trebuchet */
  const face = wall.x - wall.thick / 2;
  [
    { radius: 0.6, colour: targetRed },
    { radius: 0.44, colour: targetWhite },
    { radius: 0.28, colour: targetRed },
    { radius: 0.12, colour: banner },
  ].forEach(({ radius, colour }, index) => {
    builder.cylinder("paint", colour, {
      radius,
      length: 0.02,
      at: [face - 0.01 - index * 0.01, 1.35, -0.6],
      axis: "x",
      segments: 22,
    });
  });
  /* A crack where a stone has already hit, and fallen rubble */
  [
    [1.75, -0.05, 0.4, 0.5],
    [1.0, -0.85, 0.35, -0.6],
  ].forEach(([y, z, size, turn]) => {
    builder.box(
      "paint",
      palette.black,
      [0.02, size, 0.04],
      [face - 0.04, y, z],
      [turn, 0, 0],
    );
  });
  [
    [3.45, -0.2, 0.16],
    [3.3, -1.05, 0.13],
    [3.55, 0.45, 0.11],
    [3.2, -0.5, 0.18],
  ].forEach(([x, z, radius], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? ballStone : castleDark,
      radius,
      [x, radius * 0.75, z],
      [1.2, 0.8, 1],
      8,
    );
  });
};

/** A gatehouse tower at the wall's north end, with a gate and a ladder. */
const buildGatehouse = (builder: AttractionBuilder) => {
  const gate = { x: wall.x, z: wall.toZ + 0.35 };
  builder.box("matte", castleStone, [1.0, 2.9, 0.9], [gate.x, 1.45, gate.z]);
  if (builder.isFar) {
    return;
  }
  [-0.36, 0.36].forEach((dx) => {
    [-0.3, 0.3].forEach((dz) => {
      builder.box(
        "matte",
        shade(castleStone, 1.05),
        [0.26, 0.36, 0.26],
        [gate.x + dx, 3.08, gate.z + dz],
      );
    });
  });
  builder.box("matte", castleDark, [1.06, 0.12, 0.96], [gate.x, 2.85, gate.z]);
  /* An arched wooden gate with an iron portcullis half up */
  const face = gate.x - 0.51;
  builder.box("paint", oakDark, [0.04, 1.0, 0.6], [face, 0.5, gate.z]);
  builder.cylinder("paint", oakDark, {
    radius: 0.3,
    length: 0.04,
    at: [face, 1.0, gate.z],
    axis: "x",
    segments: 14,
  });
  for (let bar = 0; bar < 5; bar++) {
    builder.box(
      "metal",
      ironBand,
      [0.03, 0.75, 0.035],
      [face - 0.03, 0.92, gate.z - 0.24 + bar * 0.12],
    );
  }
  [0.7, 1.05].forEach((y) => {
    builder.box(
      "metal",
      ironBand,
      [0.03, 0.035, 0.6],
      [face - 0.035, y, gate.z],
    );
  });
  builder.box("paint", palette.black, [0.06, 0.4, 0.09], [face, 2.2, gate.z]);
  /* A wooden ladder leaning up the wall */
  const foot: Triple = [wall.x - 1.0, 0, -1.7];
  const top: Triple = [wall.x - wall.thick / 2 - 0.02, wall.height, -1.7];
  [-0.22, 0.22].forEach((dz) => {
    builder.bar(
      "matte",
      oakPale,
      [foot[0], foot[1], foot[2] + dz],
      [top[0], top[1], top[2] + dz],
      0.06,
      6,
    );
  });
  for (let rung = 1; rung < 8; rung++) {
    const share = rung / 8;
    builder.bar(
      "matte",
      oakPale,
      [foot[0] + (top[0] - foot[0]) * share, top[1] * share, foot[2] - 0.22],
      [foot[0] + (top[0] - foot[0]) * share, top[1] * share, foot[2] + 0.22],
      0.04,
      5,
    );
  }
};

/** Rope lashings and banners that dress the trebuchet's frame. */
const buildDressing = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const { x, z } = frame;
  [-1, 1].forEach((side) => {
    const sideZ = z + side * sideGap;
    [
      [x - 0.62, 1.55],
      [x + 0.62, 1.55],
      [x - 1.1, 0.66],
      [x + 1.1, 0.66],
    ].forEach(([lashX, lashY]) => {
      builder.add("matte", rope, new TorusGeometry(0.15, 0.03, 4, 10), {
        at: [lashX, lashY, sideZ],
        rotation: [Math.PI / 2, 0, 0],
      });
    });
    /* A striped banner hung on each A-frame */
    builder.box(
      "paint",
      side < 0 ? targetRed : banner,
      [0.42, 0.6, 0.02],
      [x - 0.42, 2.0, sideZ + side * 0.12],
      [0, 0, -0.5],
    );
    builder.box(
      "paint",
      side < 0 ? banner : targetRed,
      [0.44, 0.1, 0.025],
      [x - 0.42, 2.0, sideZ + side * 0.13],
      [0, 0, -0.5],
    );
  });
  /* Pegs and guy ropes holding the frame steady */
  [-1, 1].forEach((side) => {
    const peg: Triple = [x + 0.3, 0.1, z + side * 1.9];
    builder.cylinder("matte", oakDark, {
      radius: 0.04,
      radiusEnd: 0.05,
      length: 0.25,
      at: peg,
      segments: 6,
    });
    builder.bar(
      "matte",
      rope,
      peg,
      [x + 0.2, 2.2, z + side * sideGap],
      0.025,
      4,
    );
  });
};

/** A pile of stone balls ready to throw, a rope coil, a mallet and a bucket. */
const buildAmmunition = (builder: AttractionBuilder) => {
  const pile = { x: -1.0, z: 1.25 };
  const balls: Triple[] = [
    [-0.2, 0.17, -0.15],
    [0.18, 0.17, -0.1],
    [0.0, 0.17, 0.22],
    [0.35, 0.17, 0.28],
    [-0.35, 0.17, 0.2],
    [0.0, 0.45, 0.02],
    [0.62, 0.17, -0.2],
  ];
  balls.forEach(([dx, y, dz], index) => {
    if (builder.isFar && index > 2) {
      return;
    }
    builder.sphere(
      "matte",
      index % 3 === 0 ? shade(ballStone, 0.88) : ballStone,
      0.17,
      [pile.x + dx, y, pile.z + dz],
      [1, 1, 1],
      10,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* A coil of rope */
  [0.04, 0.1].forEach((y, index) => {
    builder.add(
      "matte",
      rope,
      new TorusGeometry(0.26 - index * 0.04, 0.04, 4, 16),
      {
        at: [-2.6, y, 1.4],
        rotation: [Math.PI / 2, 0, 0],
      },
    );
  });
  /* A wooden mallet leaning on a crate */
  builder.box("matte", oakPale, [0.6, 0.5, 0.5], [0.4, 0.25, 1.6], [0, 0.3, 0]);
  builder.box(
    "matte",
    oakDark,
    [0.62, 0.05, 0.52],
    [0.4, 0.45, 1.6],
    [0, 0.3, 0],
  );
  builder.bar(
    "matte",
    oakDark,
    [0.05, 0.05, 1.95],
    [0.25, 0.75, 1.85],
    0.05,
    6,
  );
  builder.cylinder("matte", oak, {
    radius: 0.1,
    length: 0.3,
    at: [0.25, 0.8, 1.85],
    axis: "x",
    segments: 10,
  });
  /* A bucket of water */
  builder.cylinder("matte", oak, {
    radius: 0.2,
    radiusEnd: 0.24,
    length: 0.36,
    at: [-2.9, 0.18, 0.6],
    segments: 14,
  });
  builder.cylinder("water", palette.water, {
    radius: 0.21,
    length: 0.02,
    at: [-2.9, 0.33, 0.6],
    segments: 14,
  });
  [0.08, 0.28].forEach((y) => {
    builder.add(
      "metal",
      ironBand,
      new TorusGeometry(0.22 + y * 0.12, 0.015, 3, 14),
      {
        at: [-2.9, y, 0.6],
        rotation: [Math.PI / 2, 0, 0],
      },
    );
  });
  /* A path of trodden earth from the stones to the trough */
  builder.box(
    "matte",
    shade(palette.soil, 0.75),
    [1.0, 0.03, 2.4],
    [-1.0, 0.015, 2.6],
  );
};

export const trebuchetModel: CuriosityModel = {
  kind: "trebuchet",
  islandId: "ember-isle",
  name: "Trebuchet",
  fact: "A trebuchet is a giant throwing machine from the Middle Ages. Its long arm is a lever that turns on an axle. When the heavy box of rocks on the short end drops, the long end whips up fast and the sling flings a stone a very long way. A small drop at one end makes a big swing at the other.",
  curriculumLink:
    "Science, Year 5: forces. Recognise that some mechanisms, including levers, pulleys and gears, allow a smaller force to have a greater effect.",
  footprint: 6,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: 1.4, z: 4.3 },
  build: (builder) => {
    buildFrame(builder);
    buildCastle(builder);
    buildGatehouse(builder);
    buildDressing(builder);
    buildAmmunition(builder);
    if (builder.isFar) {
      /* The arm at rest, and its counterweight */
      const middle = (longArm - shortArm) / 2;
      builder.box(
        "matte",
        oak,
        [longArm + shortArm, 0.2, 0.2],
        [
          axleAt[0] + along[0] * middle,
          axleAt[1] + along[1] * middle,
          axleAt[2],
        ],
        [0, 0, restAngle],
      );
      builder.box(
        "matte",
        oakDark,
        [0.8, 0.62, 0.85],
        [
          axleAt[0] - along[0] * shortArm,
          axleAt[1] - along[1] * shortArm - 0.72,
          axleAt[2],
        ],
      );
    }
    addSignBoard(builder, [1.4, 0, 4.3], signColour);
  },
  moving: [
    {
      name: "throwing arm",
      pivot: axleAt,
      build: buildArm,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 7,
        amplitude: 0.45,
        period: 3.2,
      },
    },
    {
      name: "pennant",
      pivot: [tower.x, tower.height + 1.72, tower.z],
      build: buildPennant,
      motion: { kind: "swing", axis: "y", amplitude: 0.35, period: 2.1 },
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: frame.x - 1.6, z: frame.z },
      { x: frame.x + 1.6, z: frame.z },
      1.0,
      0.8,
    ),
    ...listWallBlockers(
      { x: wall.x, z: wall.fromZ },
      { x: wall.x, z: wall.toZ },
      0.45,
      0.5,
    ),
    { x: tower.x, z: tower.z, radius: tower.radius + 0.1 },
    { x: wall.x, z: wall.toZ + 0.35, radius: 0.7 },
    { x: -1.0, z: 1.3, radius: 0.6 },
    { x: 0.4, z: 1.6, radius: 0.45 },
  ] satisfies LocalBlocker[],
  tune: [67, 72, 76, 79, 76, 79],
  play: {
    label: "Launch a stone",
    news: "Creak... THWUMP! The counterweight dropped, the long arm whipped up and the stone sailed right onto the target.",
    tune: [60, 67, 72, 79],
  },
};
