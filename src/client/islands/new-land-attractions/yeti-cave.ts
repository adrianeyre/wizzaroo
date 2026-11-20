import {
  CircleGeometry,
  DodecahedronGeometry,
  LatheGeometry,
  OctahedronGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef3f6";
const snowBright = "#fbfdff";
const snowShadow = "#d6e1ea";
const rock = "#7d8a99";
const caveDark = "#2c3646";
const iceBlue = "#bfe3f5";
const iceDeep = "#7cc4e6";
const crystalGlow = "#7fe6ff";
const pine = "#2d5a40";
const yetiFur = "#f2f5f8";
const yetiShade = "#d9e2ec";
const yetiFace = "#8fb0d2";
const signColour = "#4a6fa5";

/* The cave: a great snowy dome, its mouth towards the visitors (+z) */
const cave = { x: 0, z: -2.6 };
const mouthHalfAngle = 0.27;
const lintel = 1.85;
const floorRadius = 3.5;
const floorHeight = 0.06;
const domeProfile: [number, number][] = [
  [4.1, 0],
  [4.1, 0.5],
  [3.95, 1.2],
  [3.6, 1.85],
  [3.1, 2.5],
  [2.3, 3.15],
  [1.2, 3.6],
  [0.01, 3.72],
];

/** Height of the dome's outside at a distance from its middle. */
const domeHeightAt = (radius: number): number => {
  for (let index = domeProfile.length - 1; index > 0; index--) {
    const [fromR, fromY] = domeProfile[index];
    const [toR, toY] = domeProfile[index - 1];
    if (radius <= toR) {
      const share = (radius - fromR) / Math.max(0.001, toR - fromR);
      return fromY + (toY - fromY) * share;
    }
  }
  return 0;
};

const yetiAt: Triple = [-2.5, 0, 1.5];
const yetiHeight = 2.7;
const chimesAt: Triple = [cave.x, lintel - 0.04, cave.z + 3.75];
const crystalsAt: Triple = [cave.x, 0, cave.z];
const fireAt: Triple = [cave.x + 1.3, floorHeight, cave.z - 1.4];

const signAt: Triple = [2.5, 0, 6.5];
const stairSide = -1;
const chuteSide = 1;
const rideStart = { x: cave.x - 6.0, z: cave.z };
const rideFinish = { x: cave.x + 4.4, z: cave.z + 5.5 };

/* ------------------------------------------------------------------ */
/* Rough, rocky shells                                                 */
/* ------------------------------------------------------------------ */

/** Pushes a shape's points in and out a little, so it looks hewn from rock. */
const roughen = (geometry: BufferGeometry, amount: number): BufferGeometry => {
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const radius = Math.hypot(x, z);
    if (y < 0.05 || radius < 0.05) {
      continue;
    }
    const angle = Math.atan2(x, z);
    const bump =
      amount *
      (0.55 * Math.sin(angle * 7 + y * 2.1) +
        0.35 * Math.sin(angle * 13 - y * 3.3) +
        0.25 * Math.sin(y * 5.3 + angle * 3));
    const grown = (radius + bump) / radius;
    positions.setXYZ(index, x * grown, y + bump * 0.25, z * grown);
  }
  return geometry;
};

const buildShell = (
  builder: AttractionBuilder,
  profile: readonly [number, number][],
  colour: string,
  isInside: boolean,
  hasMouth: boolean,
) => {
  const points = (isInside ? [...profile].reverse() : profile).map(
    ([radius, height]) => new Vector2(radius, height),
  );
  const around = builder.segments(44, 18);
  const lathe = hasMouth
    ? new LatheGeometry(
        points,
        around,
        mouthHalfAngle,
        Math.PI * 2 - mouthHalfAngle * 2,
      )
    : new LatheGeometry(points, around);
  builder.add("matte", colour, roughen(lathe, builder.isFar ? 0 : 0.14), {
    at: [cave.x, 0, cave.z],
  });
};

const buildDome = (builder: AttractionBuilder) => {
  const lower = domeProfile.filter(([, height]) => height <= lintel + 0.01);
  const upper = domeProfile.filter(([, height]) => height >= lintel - 0.01);
  /* The rocky walls up to the top of the mouth */
  buildShell(builder, lower, rock, false, true);
  /* Above the mouth, snow all round */
  buildShell(
    builder,
    upper.map(([radius, height]) => [radius + 0.08, height]),
    snowBright,
    false,
    false,
  );
  if (!builder.isFar) {
    const inset = (profile: [number, number][]) =>
      profile.map(([radius, height]): [number, number] => [
        Math.max(0.01, radius - 0.35),
        Math.min(height, 3.35),
      ]);
    buildShell(builder, inset(lower), caveDark, true, true);
    buildShell(builder, inset(upper), shade(caveDark, 1.2), true, false);
  }
  /* Snow lying in drifts round the foot of the walls */
  const drifts = builder.isFar ? 6 : 12;
  for (let drift = 0; drift < drifts; drift++) {
    const angle =
      mouthHalfAngle + 0.35 + (drift / drifts) * (Math.PI * 2 - 1.3);
    builder.sphere(
      "matte",
      drift % 2 === 0 ? snow : snowShadow,
      0.9,
      [cave.x + Math.sin(angle) * 4.1, 0.1, cave.z + Math.cos(angle) * 4.1],
      [1.2, 0.5, 1],
      builder.isFar ? 6 : 10,
    );
  }
  /* Big rocks framing the mouth, and the lintel over it */
  [-1, 1].forEach((side) => {
    const angle = side * (mouthHalfAngle + 0.06);
    builder.add(
      "matte",
      shade(rock, 0.9),
      new DodecahedronGeometry(0.75, 0),
      {
        at: [
          cave.x + Math.sin(angle) * 4.15,
          0.85,
          cave.z + Math.cos(angle) * 4.15,
        ],
        scale: [0.7, 1.4, 0.8],
        rotation: [0, side * 0.7, 0],
      },
      undefined,
    );
  });
  builder.add(
    "matte",
    shade(rock, 0.85),
    new TorusGeometry(
      1.15,
      0.32,
      builder.segments(6, 4),
      builder.segments(14, 6),
      Math.PI,
    ),
    { at: [cave.x, lintel - 0.95, cave.z + 3.85], scale: [1, 1, 1.4] },
  );
  builder.add(
    "matte",
    snowBright,
    new TorusGeometry(
      1.15,
      0.24,
      builder.segments(6, 4),
      builder.segments(14, 6),
      Math.PI,
    ),
    { at: [cave.x, lintel - 0.85, cave.z + 3.9], scale: [1.02, 1, 1.3] },
  );
};

/* Icicles all along the mouth, and frosty blue ice on the walls */
const buildIce = (builder: AttractionBuilder) => {
  /* The ice floor inside, and a frozen path out of the mouth */
  builder.add(
    "paint",
    iceBlue,
    new CircleGeometry(floorRadius, builder.segments(32, 14)),
    { at: [cave.x, floorHeight, cave.z], rotation: [-Math.PI / 2, 0, 0] },
  );
  builder.box(
    "paint",
    iceBlue,
    [2.0, floorHeight, 1.6],
    [cave.x, floorHeight / 2, cave.z + 4.0],
  );
  if (builder.isFar) {
    return;
  }
  for (let icicle = 0; icicle < 9; icicle++) {
    const angle = Math.PI * (0.3 + (icicle / 8) * 0.4);
    const length = 0.16 + ((icicle * 7) % 4) * 0.027;
    builder.cylinder("glass", icicle % 3 === 0 ? iceDeep : iceBlue, {
      radius: 0.05,
      radiusEnd: 0.003,
      length,
      at: [
        cave.x + Math.cos(angle) * 0.92,
        lintel - 0.95 + Math.sin(angle) * 0.86 - length / 2,
        cave.z + 3.85,
      ],
      segments: 6,
    });
  }
  /* Ice patches glinting on the snow */
  [
    [-2.0, 2.4, 0.9],
    [1.4, 2.9, 0.7],
    [3.6, 3.2, 0.5],
  ].forEach(([x, z, size]) => {
    builder.add("glass", iceBlue, new CircleGeometry(size, 14), {
      at: [x, 0.012, z],
      rotation: [-Math.PI / 2, 0, 0],
      scale: [1.4, 1, 1],
    });
  });
};

/* Inside: a cosy yeti nest, a fire, a pot of snow porridge and snowballs */
const buildDen = (builder: AttractionBuilder) => {
  const [fx, , fz] = fireAt;
  builder.torus(
    "matte",
    palette.darkStone,
    0.38,
    0.11,
    [fx, floorHeight + 0.06, fz],
    "y",
    12,
  );
  if (builder.isFar) {
    return;
  }
  [-0.15, 0, 0.15].forEach((offset, log) => {
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.06,
      length: 0.6,
      at: [fx + offset, floorHeight + 0.08, fz],
      axis: log === 1 ? "x" : "z",
      segments: 6,
    });
  });
  /* The nest of straw and furs */
  const nest: Triple = [cave.x - 1.6, floorHeight, cave.z - 1.6];
  builder.torus(
    "matte",
    "#d9b45a",
    0.75,
    0.25,
    [nest[0], nest[1] + 0.15, nest[2]],
    "y",
    18,
  );
  builder.cylinder("matte", "#c79f4a", {
    radius: 0.8,
    length: 0.1,
    at: [nest[0], nest[1] + 0.06, nest[2]],
    segments: 16,
  });
  builder.sphere(
    "matte",
    yetiShade,
    0.35,
    [nest[0] + 0.2, nest[1] + 0.25, nest[2] - 0.1],
    [1.3, 0.5, 1],
    10,
  );
  /* The porridge pot and giant spoon */
  builder.lathe(
    "metal",
    palette.darkSteel,
    [
      [0, 0],
      [0.32, 0.02],
      [0.4, 0.2],
      [0.38, 0.42],
      [0.34, 0.44],
    ],
    [fx, floorHeight, fz + 0.9],
    "y",
    14,
  );
  builder.cylinder("matte", "#efe4c8", {
    radius: 0.33,
    length: 0.02,
    at: [fx, floorHeight + 0.4, fz + 0.9],
    segments: 14,
  });
  builder.bar(
    "matte",
    palette.paleTimber,
    [fx + 0.1, floorHeight + 0.35, fz + 0.9],
    [fx + 0.5, floorHeight + 1.0, fz + 0.75],
    0.06,
    5,
  );
  /* A pile of snowballs, ready for a game */
  [
    [0, 0, 0],
    [0.3, 0, 0.05],
    [0.15, 0, 0.28],
    [0.15, 0.24, 0.1],
  ].forEach(([dx, dy, dz]) => {
    builder.sphere(
      "matte",
      snowBright,
      0.15,
      [cave.x - 2.2 + dx, floorHeight + 0.15 + dy, cave.z + 0.6 + dz],
      [1, 1, 1],
      9,
    );
  });
};

/* Glowing ice crystals that light up the cave as the Character comes in */
const buildCrystals = (builder: AttractionBuilder) => {
  const crystal = new OctahedronGeometry(1, 0);
  [
    [-2.6, -1.4, 0.35, 1.0],
    [-2.9, -0.2, 0.25, 0.7],
    [2.5, -2.0, 0.3, 0.9],
    [1.0, -3.0, 0.4, 1.2],
    [-0.8, -3.1, 0.22, 0.6],
    [2.8, 0.2, 0.2, 0.55],
  ].forEach(([dx, dz, size, height], index) => {
    builder.add(
      "glow",
      index % 2 === 0 ? crystalGlow : "#b8a6ff",
      crystal.clone(),
      {
        at: [dx, height * 0.6, dz],
        scale: [size, height, size],
        rotation: [0.2 * dx, index, 0.15 * dz],
      },
      undefined,
    );
  });
  crystal.dispose();
};

/* A fire flickering in the yeti's den */
const buildFire = (builder: AttractionBuilder) => {
  builder.cylinder("glow", "#ff9a3a", {
    radius: 0.2,
    radiusEnd: 0.02,
    length: 0.55,
    at: [0, 0.3, 0],
    segments: 8,
  });
  builder.cylinder("glow", "#ffd34a", {
    radius: 0.12,
    radiusEnd: 0.01,
    length: 0.4,
    at: [0.04, 0.24, 0.03],
    segments: 7,
  });
};

/* Icicle chimes hanging in the mouth, which swing and tinkle */
const buildChimes = (builder: AttractionBuilder) => {
  builder.box("matte", palette.darkTimber, [1.3, 0.06, 0.06], [0, 0, 0]);
  [-0.5, -0.25, 0, 0.25, 0.5].forEach((along, index) => {
    const length = 0.3 - Math.abs(along) * 0.25;
    builder.cylinder("matte", palette.black, {
      radius: 0.006,
      length: 0.12,
      at: [along, -0.06, 0],
      segments: 3,
    });
    builder.cylinder("glass", index % 2 === 0 ? iceBlue : iceDeep, {
      radius: 0.045,
      radiusEnd: 0.012,
      length,
      at: [along, -0.12 - length / 2, 0],
      segments: 7,
    });
  });
};

/* ------------------------------------------------------------------ */
/* The friendly yeti                                                   */
/* ------------------------------------------------------------------ */

/** A big, fluffy, friendly yeti, waving both arms, feet on y = 0. */
const buildYeti = (builder: AttractionBuilder) => {
  const isNear = !builder.isFar;
  /* Body and legs */
  builder.sphere(
    "matte",
    yetiFur,
    0.75,
    [0, 1.3, 0],
    [1, 1.15, 0.85],
    isNear ? 18 : 10,
  );
  builder.sphere(
    "matte",
    yetiShade,
    0.5,
    [0, 1.15, 0.3],
    [1, 1.1, 0.6],
    isNear ? 14 : 8,
  );
  [-0.35, 0.35].forEach((side) => {
    builder.cylinder("matte", yetiFur, {
      radius: 0.26,
      radiusEnd: 0.3,
      length: 0.6,
      at: [side, 0.35, 0],
      segments: 12,
    });
    builder.sphere(
      "matte",
      yetiFace,
      0.24,
      [side * 1.05, 0.08, 0.15],
      [1.1, 0.45, 1.5],
      10,
    );
  });
  /* Head with a friendly blue face */
  builder.sphere(
    "matte",
    yetiFur,
    0.5,
    [0, 2.25, 0.02],
    [1, 0.95, 0.95],
    isNear ? 18 : 10,
  );
  builder.sphere(
    "matte",
    yetiFace,
    0.36,
    [0, 2.18, 0.26],
    [1, 0.9, 0.6],
    isNear ? 16 : 8,
  );
  /* Arms raised up in a big hello */
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      yetiFur,
      [side * 0.6, 1.75, 0],
      [side * 1.05, 2.35, 0.1],
      0.36,
      isNear ? 10 : 6,
    );
    builder.bar(
      "matte",
      yetiFur,
      [side * 1.05, 2.35, 0.1],
      [side * 1.15, 2.85, 0.15],
      0.32,
      isNear ? 10 : 6,
    );
    builder.sphere(
      "matte",
      yetiFace,
      0.2,
      [side * 1.17, 2.98, 0.16],
      [1, 1.1, 0.8],
      10,
    );
  });
  if (!isNear) {
    return;
  }
  /* Big round eyes, eyebrows, nose and a wide smile */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.1,
      [side * 0.14, 2.28, 0.44],
      [1, 1.1, 0.6],
      12,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.05,
      [side * 0.13, 2.27, 0.5],
      [1, 1, 0.6],
      8,
    );
    builder.sphere(
      "paint",
      palette.white,
      0.015,
      [side * 0.12, 2.3, 0.53],
      [1, 1, 1],
      4,
    );
    builder.box(
      "matte",
      yetiShade,
      [0.16, 0.05, 0.05],
      [side * 0.15, 2.42, 0.42],
      [0, 0, side * -0.25],
    );
    /* Little horns */
    builder.cylinder("matte", "#e8dcc2", {
      radius: 0.07,
      radiusEnd: 0.01,
      length: 0.25,
      at: [side * 0.32, 2.7, 0],
      segments: 8,
    });
  });
  builder.sphere("paint", "#4f6b8f", 0.06, [0, 2.17, 0.5], [1.4, 1, 1], 8);
  builder.add(
    "paint",
    "#3a2f4a",
    new TorusGeometry(0.17, 0.03, 6, 12, Math.PI),
    { at: [0, 2.08, 0.47], rotation: [0, 0, Math.PI] },
  );
  builder.sphere("paint", "#e86b7a", 0.06, [0, 1.97, 0.46], [1.2, 0.6, 0.6], 8);
  /* Shaggy tufts of fur */
  for (let tuft = 0; tuft < 16; tuft++) {
    const angle = (tuft / 16) * Math.PI * 2;
    const up = 0.75 + (tuft % 4) * 0.28;
    builder.sphere(
      "matte",
      tuft % 2 === 0 ? yetiFur : yetiShade,
      0.17,
      [Math.sin(angle) * 0.72, up, Math.cos(angle) * 0.62],
      [1, 1.4, 1],
      7,
    );
  }
  [-0.25, 0, 0.25].forEach((along) => {
    builder.sphere("matte", yetiFur, 0.12, [along, 2.72, 0.05], [1, 1.5, 1], 7);
  });
};

/* Yeti cubs bumbling about in the snow */
const buildCub = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    yetiFur,
    0.28,
    [0, 0.36, 0],
    [1, 1.1, 0.9],
    builder.isFar ? 6 : 12,
  );
  builder.sphere(
    "matte",
    yetiFur,
    0.2,
    [0, 0.74, 0.02],
    [1, 1, 1],
    builder.isFar ? 6 : 12,
  );
  builder.sphere(
    "matte",
    yetiFace,
    0.13,
    [0, 0.72, 0.13],
    [1, 0.9, 0.7],
    builder.isFar ? 5 : 10,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.035,
      [side * 0.06, 0.76, 0.21],
      [1, 1, 0.6],
      6,
    );
    builder.sphere(
      "matte",
      yetiFur,
      0.09,
      [side * 0.26, 0.44, 0.08],
      [0.8, 1.4, 0.8],
      7,
    );
    builder.sphere(
      "matte",
      yetiFace,
      0.09,
      [side * 0.12, 0.06, 0.06],
      [1, 0.5, 1.4],
      7,
    );
  });
  builder.sphere("paint", "#e86b7a", 0.03, [0, 0.67, 0.22], [1.3, 0.7, 0.6], 5);
};

/* ------------------------------------------------------------------ */
/* The ice stair up the left, and the slide down the right             */
/* ------------------------------------------------------------------ */

const stairSteps = 9;
const stairPoint = (step: number): Triple => {
  const share = step / stairSteps;
  const radius = 5.0 - share * 4.3;
  const height = share * 3.72;
  return [
    cave.x + stairSide * radius,
    Math.max(height, domeHeightAt(radius)),
    cave.z,
  ];
};

const buildStair = (builder: AttractionBuilder) => {
  for (let step = 0; step <= stairSteps; step++) {
    const [x, y, z] = stairPoint(step);
    const isOnDome = Math.abs(x - cave.x) < 4.15;
    const bottom = isOnDome ? Math.max(0, y - 0.3) : 0;
    const top = Math.max(0.12, y + 0.1);
    builder.box(
      "paint",
      step % 2 === 0 ? iceBlue : shade(iceBlue, 0.94),
      [0.6, top - bottom, 1.1],
      [x, (top + bottom) / 2, z],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* A rope handrail on posts */
  for (let step = 0; step < stairSteps; step += 2) {
    const [x, y, z] = stairPoint(step);
    const [nx, ny] = stairPoint(step + 2);
    builder.bar(
      "matte",
      palette.darkTimber,
      [x, y + 0.1, z - 0.6],
      [x, y + 1.0, z - 0.6],
      0.06,
      5,
    );
    builder.bar(
      "matte",
      "#c9a26a",
      [x, y + 0.95, z - 0.6],
      [nx, ny + 0.95, z - 0.6],
      0.03,
      4,
    );
  }
};

const chuteSteps = 14;
const chutePoint = (share: number): Triple => {
  const radius = 0.7 + share * 5.3;
  const height = domeHeightAt(Math.min(radius, 3.9)) + 0.3;
  const sweep = share * 0.9;
  return [
    cave.x + chuteSide * Math.cos(sweep) * radius,
    radius > 4.3 ? Math.max(0.05, height * (1 - (radius - 4.3) / 1.7)) : height,
    cave.z + Math.sin(sweep) * radius,
  ];
};

const buildChute = (builder: AttractionBuilder) => {
  const steps = builder.isFar ? 6 : chuteSteps;
  for (let step = 0; step < steps; step++) {
    const from = chutePoint(step / steps);
    const to = chutePoint((step + 1) / steps);
    const length = Math.hypot(
      to[0] - from[0],
      to[1] - from[1],
      to[2] - from[2],
    );
    const turn = Math.atan2(to[0] - from[0], to[2] - from[2]);
    const pitch = -Math.atan2(
      to[1] - from[1],
      Math.hypot(to[0] - from[0], to[2] - from[2]),
    );
    const middle: Triple = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    ];
    builder.box(
      "glass",
      step % 2 === 0 ? iceBlue : iceDeep,
      [0.8, 0.08, length + 0.04],
      middle,
      [pitch, turn, 0],
    );
    if (builder.isFar) {
      continue;
    }
    [-1, 1].forEach((side) => {
      const across: Triple = [
        Math.cos(turn) * side * 0.44,
        0.12,
        -Math.sin(turn) * side * 0.44,
      ];
      builder.bar(
        "glass",
        iceBlue,
        [from[0] + across[0], from[1] + across[1], from[2] + across[2]],
        [to[0] + across[0], to[1] + across[1], to[2] + across[2]],
        0.12,
        6,
      );
    });
  }
};

const pines: [number, number, number][] = [
  [-7.0, -5.6, 1.2],
  [-4.4, -7.8, 1.0],
  [4.8, -7.4, 1.3],
  [7.4, -4.6, 1.0],
  [-7.6, 2.2, 0.9],
];

const addPine = (
  builder: AttractionBuilder,
  [x, z, size]: [number, number, number],
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.13 * size,
    radiusEnd: 0.08 * size,
    length: 0.8 * size,
    at: [x, 0.4 * size, z],
    segments: 7,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (1.0 - share * 0.55) * size;
    const height = (1.35 - share * 0.25) * size;
    const base = (0.55 + share * 1.8) * size;
    builder.cylinder("matte", tier % 2 === 0 ? pine : shade(pine, 1.12), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, base + height / 2, z],
      segments: 9,
    });
    if (!builder.isFar) {
      const cap = height * 0.45;
      builder.cylinder("matte", snow, {
        radius: radius * 0.55,
        radiusEnd: 0.03,
        length: cap,
        at: [x, base + height - cap / 2 + 0.03, z],
        segments: 9,
      });
    }
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  pines.forEach((tree) => {
    addPine(builder, tree);
  });
  /* The drift the yeti hides behind */
  const [yx, , yz] = yetiAt;
  builder.sphere(
    "matte",
    snowBright,
    0.9,
    [yx, 0.05, yz + 0.75],
    [1.5, 0.6, 0.8],
    builder.isFar ? 8 : 14,
  );
  builder.cylinder("matte", "#cfdbe6", {
    radius: 0.9,
    length: 0.02,
    at: [yx, 0.01, yz],
    segments: 16,
  });
  if (builder.isFar) {
    return;
  }
  /* Giant footprints leading into the cave */
  [
    [1.1, 6.0, 0.25],
    [0.4, 5.0, -0.2],
    [1.0, 3.9, 0.15],
    [0.3, 2.9, -0.15],
  ].forEach(([x, z, turn]) => {
    builder.add("matte", "#a9c4dc", new CircleGeometry(0.28, 12), {
      at: [x, 0.012, z],
      rotation: [-Math.PI / 2, 0, turn],
      scale: [1, 1.7, 1],
    });
    [-0.16, -0.05, 0.06, 0.17].forEach((toe) => {
      builder.add("matte", "#a9c4dc", new CircleGeometry(0.08, 8), {
        at: [x + toe, 0.012, z - 0.58],
        rotation: [-Math.PI / 2, 0, 0],
      });
    });
  });
  /* Rocks poking through the snow */
  [
    [5.4, 1.4, 0.45],
    [-5.6, -4.4, 0.55],
    [3.8, 4.8, 0.35],
  ].forEach(([x, z, size]) => {
    builder.add(
      "matte",
      rock,
      new DodecahedronGeometry(size, 0),
      { at: [x, size * 0.4, z], scale: [1.3, 0.8, 1] },
      undefined,
    );
    builder.sphere(
      "matte",
      snow,
      size * 0.8,
      [x, size * 0.8, z],
      [1.4, 0.35, 1.1],
      8,
    );
  });
  /* A little signpost: "This way to the yeti!" */
  builder.box("matte", palette.darkTimber, [0.08, 1.4, 0.08], [-0.9, 0.7, 4.4]);
  builder.box(
    "paint",
    "#e8452f",
    [0.8, 0.22, 0.04],
    [-0.65, 1.2, 4.42],
    [0, 0, 0.1],
  );
  builder.box(
    "paint",
    palette.white,
    [0.5, 0.05, 0.02],
    [-0.65, 1.2, 4.45],
    [0, 0, 0.1],
  );
};

/* ------------------------------------------------------------------ */
/* The ride                                                            */
/* ------------------------------------------------------------------ */

const iceSlide = (progress: number): LocalSpot => {
  if (progress < 0.4) {
    const share = progress / 0.4;
    const [x, y, z] = stairPoint(share * stairSteps);
    const lead = Math.min(1, share * 6);
    return {
      x: rideStart.x + (x - rideStart.x) * lead,
      y: y + 0.12,
      z: rideStart.z + (z - rideStart.z) * lead,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.48) {
    const share = (progress - 0.4) / 0.08;
    const [fromX, fromY, fromZ] = stairPoint(stairSteps);
    const [toX, toY, toZ] = chutePoint(0);
    return {
      x: fromX + (toX - fromX) * share,
      y: Math.max(fromY, toY) + 0.12,
      z: fromZ + (toZ - fromZ) * share,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.94) {
    const share = ((progress - 0.48) / 0.46) ** 1.4;
    const [x, y, z] = chutePoint(share);
    const [aheadX, , aheadZ] = chutePoint(Math.min(1, share + 0.02));
    return {
      x,
      y: y + 0.08,
      z,
      heading: Math.atan2(aheadX - x + 0.0001, aheadZ - z),
    };
  }
  const share = (progress - 0.94) / 0.06;
  const [x, y, z] = chutePoint(1);
  return {
    x: x + (rideFinish.x - x) * share,
    y: (y + 0.08) * (1 - share),
    z: z + (rideFinish.z - z) * share,
    heading: Math.PI / 2,
  };
};

const caveFloor: Deck = ({ x, z }) => {
  const isInside = Math.hypot(x - cave.x, z - cave.z) <= floorRadius;
  const isPath =
    Math.abs(x - cave.x) <= 1.0 && z >= cave.z + 3 && z <= cave.z + 4.8;
  return isInside || isPath ? { height: floorHeight, kind: "ice" } : undefined;
};

export const yetiCaveModel: NewLandAttractionModel = {
  kind: "yeti-cave",
  islandId: "frost-isle",
  name: "Yeti Cave",
  fact: "Snow and ice are made of frozen water, and a cave of snow can be surprisingly cosy, because snow traps lots of air that keeps the warmth in. Ice crystals are see-through and sparkly, and icicles grow drip by drip when melting snow freezes again. Nobody has ever found a real yeti, but this one is very friendly!",
  curriculumLink:
    "Science, Year 2: identify and compare the uses of everyday materials, such as snow and ice, and find out how the shapes of solid objects made from some materials can be changed.",
  footprint: 9.5,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 1.0 },
  build: (builder) => {
    buildDome(builder);
    buildIce(builder);
    buildDen(builder);
    buildStair(builder);
    buildChute(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "friendly yeti",
      pivot: [yetiAt[0], -yetiHeight - 0.4, yetiAt[2]],
      build: buildYeti,
      motion: {
        kind: "rise",
        reach: 4.5,
        height: yetiHeight + 0.4,
        period: 2.2,
      },
    },
    {
      name: "glowing crystals",
      pivot: crystalsAt,
      build: buildCrystals,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "icicle chimes",
      pivot: chimesAt,
      build: buildChimes,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.35,
        period: 1.3,
      },
    },
    {
      name: "den fire",
      pivot: fireAt,
      build: buildFire,
      motion: { kind: "flicker", period: 0.7 },
    },
  ],
  wanderers: [
    {
      name: "yeti cubs",
      build: buildCub,
      count: 2,
      centre: { x: 3.4, z: 3.6 },
      radius: 1.3,
      speed: 0.5,
      bob: 0.08,
    },
  ],
  smoke: [
    {
      at: [cave.x, lintel + 0.2, cave.z + 4.2],
      colour: "#eef6fb",
      puffs: 5,
      size: 0.16,
      rise: 1.0,
      spread: 0.6,
    },
  ],
  blockers: [
    { x: yetiAt[0], z: yetiAt[2] + 0.7, radius: 0.8 },
  ] satisfies LocalBlocker[],
  decks: [caveFloor],
  tune: [76, 79, 83, 88, 83],
  rides: [
    {
      id: "ice-slide",
      name: "the yeti's ice slide",
      start: rideStart,
      reach: 0.7,
      seconds: 13,
      finish: rideFinish,
      follow: iceSlide,
    },
  ],
  play: {
    label: "Say hello to the yeti",
    news: "Hello! The big, fluffy yeti popped up out of the snow, gave you a huge friendly wave and a gentle yeti hug.",
  },
};
