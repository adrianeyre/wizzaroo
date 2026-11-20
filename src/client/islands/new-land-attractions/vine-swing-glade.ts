import { ExtrudeGeometry, Shape } from "three";
import {
  addSignBoard,
  buildFlatDeck,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const bark = "#6b4f3a";
const barkDark = "#4b3627";
const moss = "#5f8f3a";
const liana = "#5b7f2e";
const lianaDark = "#3f5e22";
const leafDeep = "#1f6428";
const leafMid = "#2f8a35";
const leafBright = "#58b043";
const fern = "#3d9a3a";
const mud = "#6e4b2c";
const creek = "#5a8f6e";
const litter = "#7b5b38";
const rope = "#cdb68a";
const plank = "#a7784a";
const heliconiaRed = "#e2392b";
const heliconiaYellow = "#f6c531";
const orchidPink = "#e77ac0";
const bromeliad = "#d8462f";
const frogGreen = "#4cc13f";
const frogEye = "#e03a1e";
const toucanBeak = "#f59a1c";
const fungusGlow = "#9ef0c8";
const morphoBlue = "#2e8fe0";
const signColour = "#2f6b3a";

/* The muddy creek, wiggling across the glade */
const creekZ = (x: number): number => -0.6 + 0.35 * Math.sin(x * 0.6);
const creekHalf = 0.85;

/* The giant tree, and its great bough reaching out over the creek */
const giantAt = { x: -2.0, z: -4.7 };
const boughFrom: Triple = [-1.7, 4.3, -4.3];
const boughTo: Triple = [2.6, 5.0, 1.2];
const alongBough = (share: number): Triple => [
  boughFrom[0] + (boughTo[0] - boughFrom[0]) * share,
  boughFrom[1] + (boughTo[1] - boughFrom[1]) * share,
  boughFrom[2] + (boughTo[2] - boughFrom[2]) * share,
];

/* The vine swing, hanging from the bough above the creek */
const swingShare = (-0.6 - boughFrom[2]) / (boughTo[2] - boughFrom[2]);
const swingPivot: Triple = (() => {
  const [x, y, z] = alongBough(swingShare);
  return [x, y - 0.2, z];
})();
const swingLength = 3.9;
const swingMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.72,
  period: 3.4,
};
const spareShare = 0.42;
const sparePivot: Triple = (() => {
  const [x, y, z] = alongBough(spareShare);
  return [x, y - 0.2, z];
})();
const spareLength = 3.4;

/* The launch platform on the near bank, and the landing on the far one */
const platform = { minX: 0.45, maxX: 1.95, minZ: 1.2, maxZ: 2.4 };
const platformTop = 0.55;
const step = { minX: 0.65, maxX: 1.75, minZ: 2.4, maxZ: 2.9 };
const stepTop = 0.28;
const swingStart = { x: swingPivot[0], z: 3.6 };
const swingFinish = { x: swingPivot[0] + 0.3, z: -3.7 };

/* A fallen log for a bridge, upstream */
const logX = -4.2;
const logFrom = -2.6;
const logTo = 1.4;
const logTop = 0.3;

const signAt = { x: -1.6, z: 7.6 };

/* -------------------------------------------------------------- */
/* Plants                                                          */
/* -------------------------------------------------------------- */

const addLeafClump = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  colour: string,
) => {
  builder.sphere("matte", colour, radius, at, [1, 0.7, 1], 10);
};

/** A fan of fern fronds, arching out from the ground. */
const addFern = (builder: AttractionBuilder, at: Triple, size = 1) => {
  if (builder.isFar) {
    builder.sphere(
      "matte",
      fern,
      0.45 * size,
      [at[0], 0.2, at[2]],
      [1, 0.4, 1],
      6,
    );
    return;
  }
  for (let frond = 0; frond < 7; frond++) {
    const angle = frond * 0.9 + at[0];
    const reach = 0.55 * size;
    builder.box(
      "matte",
      frond % 2 === 0 ? fern : shade(fern, 1.15),
      [0.16 * size, 0.02, reach],
      [
        at[0] + Math.sin(angle) * reach * 0.45,
        0.22 * size,
        at[2] + Math.cos(angle) * reach * 0.45,
      ],
      [-0.55, angle, 0],
    );
  }
};

/** A heliconia: tall leaves and a zigzag of red and yellow bracts. */
const addHeliconia = (builder: AttractionBuilder, at: Triple, size = 1) => {
  const [x, , z] = at;
  [0.3, 2.4, 4.5].forEach((angle) => {
    builder.box(
      "matte",
      leafBright,
      [0.22 * size, 0.9 * size, 0.02],
      [x + Math.sin(angle) * 0.18, 0.5 * size, z + Math.cos(angle) * 0.18],
      [0.25, angle, 0.2],
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.bar("matte", lianaDark, [x, 0, z], [x, 1.15 * size, z], 0.03, 4);
  for (let bract = 0; bract < 4; bract++) {
    const side = bract % 2 === 0 ? 1 : -1;
    builder.cylinder("paint", heliconiaRed, {
      radius: 0.05 * size,
      radiusEnd: 0.005,
      length: 0.22 * size,
      at: [x + side * 0.08 * size, (0.7 + bract * 0.12) * size, z],
      axis: "x",
      segments: 5,
    });
    builder.sphere(
      "paint",
      heliconiaYellow,
      0.025 * size,
      [x + side * 0.17 * size, (0.72 + bract * 0.12) * size, z],
      [1, 1, 1],
      4,
    );
  }
};

/** A bromeliad: a rosette of spiky leaves with a red heart. */
const addBromeliad = (builder: AttractionBuilder, at: Triple, size = 1) => {
  const [x, y, z] = at;
  const leaves = builder.isFar ? 3 : 8;
  for (let leaf = 0; leaf < leaves; leaf++) {
    const angle = (leaf / leaves) * Math.PI * 2;
    builder.box(
      "matte",
      leaf % 2 === 0 ? leafMid : leafBright,
      [0.08 * size, 0.02, 0.38 * size],
      [
        x + Math.sin(angle) * 0.15 * size,
        y + 0.12 * size,
        z + Math.cos(angle) * 0.15 * size,
      ],
      [-0.7, angle, 0],
    );
  }
  builder.cylinder("paint", bromeliad, {
    radius: 0.04 * size,
    radiusEnd: 0.07 * size,
    length: 0.22 * size,
    at: [x, y + 0.18 * size, z],
    segments: 6,
  });
};

/** A curved buttress root, a thin fin flaring out from the trunk. */
const addButtress = (
  builder: AttractionBuilder,
  base: Triple,
  angle: number,
  reach: number,
  height: number,
) => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(reach, 0);
  shape.quadraticCurveTo(reach * 0.22, height * 0.18, 0, height);
  shape.lineTo(0, 0);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: false,
    curveSegments: builder.segments(8, 3),
  });
  geometry.translate(0, 0, -0.09);
  builder.add("matte", bark, geometry, { at: base, rotation: [0, angle, 0] });
};

/** A liana dangling from a bough in a lazy loop, leaves along it. */
const addHangingLiana = (
  builder: AttractionBuilder,
  from: Triple,
  to: Triple,
  sag: number,
) => {
  const points = 5;
  let before = from;
  for (let index = 1; index <= points; index++) {
    const share = index / points;
    const point: Triple = [
      from[0] + (to[0] - from[0]) * share,
      from[1] + (to[1] - from[1]) * share - sag * Math.sin(share * Math.PI),
      from[2] + (to[2] - from[2]) * share,
    ];
    builder.bar("matte", liana, before, point, 0.05, 5);
    if (index < points) {
      builder.sphere("matte", leafBright, 0.09, point, [1.3, 0.35, 0.8], 6);
    }
    before = point;
  }
};

const buildGiantTree = (builder: AttractionBuilder) => {
  const { x, z } = giantAt;
  builder.lathe(
    "matte",
    bark,
    [
      [1.05, 0],
      [0.82, 0.5],
      [0.68, 1.6],
      [0.6, 3.6],
      [0.5, 5.4],
      [0.3, 6.6],
      [0, 6.8],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 8 : 16,
  );
  builder.bar("matte", bark, boughFrom, boughTo, 0.46, builder.isFar ? 6 : 12);
  addLeafClump(
    builder,
    [boughTo[0] + 0.3, boughTo[1] + 0.6, boughTo[2]],
    1.4,
    leafDeep,
  );
  addLeafClump(builder, [x, 7.1, z], 2.4, leafMid);
  if (builder.isFar) {
    addLeafClump(builder, [x + 1.6, 6.1, z + 1.2], 1.6, leafDeep);
    return;
  }
  for (let index = 0; index < 6; index++) {
    addButtress(
      builder,
      [x, 0, z],
      index * 1.05 + 0.3,
      1.5 + (index % 2) * 0.3,
      1.9 + (index % 3) * 0.35,
    );
  }
  builder.cylinder("matte", moss, {
    radius: 0.63,
    radiusEnd: 0.6,
    length: 0.8,
    at: [x, 2.9, z],
    segments: 16,
    isOpen: true,
  });
  /* More boughs up top, each with its own crown of leaves */
  (
    [
      [2.5, 5.6, 2.2, leafDeep],
      [4.2, 6.0, 2.0, leafBright],
      [5.6, 5.2, 1.9, leafMid],
    ] as const
  ).forEach(([angle, height, reach, colour]) => {
    const tip: Triple = [
      x + Math.sin(angle) * reach,
      height + 0.5,
      z + Math.cos(angle) * reach,
    ];
    builder.bar("matte", bark, [x, height - 0.7, z], tip, 0.24, 8);
    addLeafClump(builder, [tip[0], tip[1] + 0.5, tip[2]], 1.35, colour);
  });
  addLeafClump(builder, [x + 1.6, 6.1, z + 1.2], 1.6, leafDeep);
  addLeafClump(builder, [-0.2, 5.7, -2.2], 1.25, leafMid);
  addLeafClump(builder, [1.6, 5.6, -0.2], 1.0, leafBright);
  /* Lianas looping down from the bough */
  addHangingLiana(builder, alongBough(0.15), alongBough(0.3), 1.4);
  addHangingLiana(builder, alongBough(0.78), alongBough(0.96), 1.1);
  /* A liana spiralling up the trunk */
  let before: Triple = [x + 0.8, 0.1, z];
  for (let turn = 1; turn <= 9; turn++) {
    const angle = turn * 1.0;
    const height = turn * 0.56;
    const radius = 0.72 - turn * 0.03;
    const point: Triple = [
      x + Math.cos(angle) * radius,
      height,
      z + Math.sin(angle) * radius,
    ];
    builder.bar("matte", lianaDark, before, point, 0.06, 5);
    if (turn % 2 === 0) {
      builder.sphere("matte", leafBright, 0.12, point, [1.2, 0.4, 0.8], 6);
    }
    before = point;
  }
  /* Orchids clinging to the trunk */
  [
    [0.4, 2.2],
    [2.6, 3.4],
    [5.2, 1.6],
  ].forEach(([angle, height]) => {
    const [ox, oz] = [x + Math.cos(angle) * 0.66, z + Math.sin(angle) * 0.66];
    for (let petal = 0; petal < 5; petal++) {
      const turn = (petal / 5) * Math.PI * 2;
      builder.sphere(
        "paint",
        orchidPink,
        0.06,
        [ox + Math.cos(turn) * 0.07, height + Math.sin(turn) * 0.07, oz],
        [1, 1, 0.4],
        5,
      );
    }
    builder.sphere(
      "paint",
      heliconiaYellow,
      0.035,
      [ox, height, oz + 0.02],
      [1, 1, 1],
      5,
    );
  });
  /* A lantern hanging from the bough */
  const lamp = alongBough(0.58);
  builder.bar(
    "metal",
    palette.darkSteel,
    lamp,
    [lamp[0], lamp[1] - 0.9, lamp[2]],
    0.02,
    4,
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.16, 0.22, 0.16],
    [lamp[0], lamp[1] - 1.05, lamp[2]],
  );
  builder.cylinder("paint", palette.black, {
    radius: 0.14,
    radiusEnd: 0.02,
    length: 0.1,
    at: [lamp[0], lamp[1] - 0.9, lamp[2]],
    segments: 8,
  });
};

/** A smaller rainforest tree with a round crown. */
const addRainforestTree = (
  builder: AttractionBuilder,
  at: { x: number; z: number },
  height: number,
  colour: string,
) => {
  builder.cylinder("matte", barkDark, {
    radius: 0.28,
    radiusEnd: 0.17,
    length: height,
    at: [at.x, height / 2, at.z],
    segments: builder.isFar ? 6 : 10,
  });
  addLeafClump(builder, [at.x, height + 0.4, at.z], 1.5, colour);
  if (builder.isFar) {
    return;
  }
  addLeafClump(
    builder,
    [at.x + 0.9, height - 0.1, at.z + 0.3],
    0.95,
    shade(colour, 1.12),
  );
  addLeafClump(
    builder,
    [at.x - 0.8, height, at.z - 0.4],
    1.0,
    shade(colour, 0.9),
  );
  for (let root = 0; root < 4; root++) {
    const angle = root * 1.6 + at.x;
    builder.bar(
      "matte",
      barkDark,
      [at.x, 0.45, at.z],
      [at.x + Math.sin(angle) * 0.6, 0.02, at.z + Math.cos(angle) * 0.6],
      0.12,
      5,
    );
  }
};

/** A palm, its trunk leaning a little and its fronds drooping. */
const addPalm = (
  builder: AttractionBuilder,
  at: { x: number; z: number },
  height: number,
  lean: number,
) => {
  const top: Triple = [at.x + lean, height, at.z];
  const rings = builder.isFar ? 2 : 4;
  for (let ring = 0; ring < rings; ring++) {
    const from = ring / rings;
    const to = (ring + 1) / rings;
    builder.bar(
      "matte",
      ring % 2 === 0 ? "#8a6d4a" : "#7a5f40",
      [at.x + lean * from * from, height * from, at.z],
      [at.x + lean * to * to, height * to, at.z],
      0.2 - ring * 0.018,
      builder.isFar ? 5 : 8,
    );
  }
  const fronds = builder.isFar ? 4 : 8;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2;
    builder.box(
      "matte",
      frond % 2 === 0 ? leafMid : leafBright,
      [0.32, 0.03, 1.5],
      [
        top[0] + Math.sin(angle) * 0.7,
        height - 0.25,
        top[2] + Math.cos(angle) * 0.7,
      ],
      [0.42, angle, 0],
    );
  }
};

/* -------------------------------------------------------------- */
/* The glade                                                        */
/* -------------------------------------------------------------- */

const buildForestFloor = (builder: AttractionBuilder) => {
  builder.cylinder("matte", litter, {
    radius: 8.6,
    length: 0.03,
    at: [0, 0.015, 0],
    segments: builder.segments(36, 14),
  });
  /* The creek: a ribbon of water between muddy banks */
  const pieces = builder.isFar ? 8 : 18;
  for (let piece = 0; piece < pieces; piece++) {
    const fromX = -8.6 + (piece / pieces) * 17.2;
    const toX = -8.6 + ((piece + 1) / pieces) * 17.2;
    const middleX = (fromX + toX) / 2;
    const turn = Math.atan2(creekZ(toX) - creekZ(fromX), toX - fromX);
    const edge = Math.hypot(middleX, creekZ(middleX)) > 7.6 ? 0.75 : 1;
    builder.box(
      "matte",
      mud,
      [toX - fromX + 0.25, 0.04, (creekHalf + 0.45) * 2 * edge],
      [middleX, 0.035, creekZ(middleX)],
      [0, -turn, 0],
    );
    builder.box(
      "water",
      creek,
      [toX - fromX + 0.25, 0.04, creekHalf * 2 * edge],
      [middleX, 0.06, creekZ(middleX)],
      [0, -turn, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Pebbles and boulders along the banks */
  for (let stone = 0; stone < 15; stone++) {
    const x = -7.4 + stone * 1.05;
    const side = stone % 2 === 0 ? 1 : -1;
    if (Math.abs(x - logX) < 0.6 || Math.abs(x - swingPivot[0]) < 0.8) {
      continue;
    }
    builder.sphere(
      "matte",
      stone % 3 === 0 ? palette.darkStone : palette.stone,
      0.12 + (stone % 4) * 0.04,
      [x, 0.05, creekZ(x) + side * (creekHalf + 0.15)],
      [1.3, 0.55, 1],
      6,
    );
  }
  /* Ripples and a few lily pads */
  [-6.1, -2.4, 3.4, 6.4].forEach((x, index) => {
    builder.cylinder("paint", leafBright, {
      radius: 0.18 + (index % 2) * 0.06,
      length: 0.02,
      at: [x, 0.09, creekZ(x) + (index % 2 === 0 ? 0.3 : -0.3)],
      segments: 10,
    });
  });
  /* Reeds by the water */
  [-7.0, -5.6, -3.0, 2.6, 4.8, 7.0].forEach((x, index) => {
    const z = creekZ(x) + (index % 2 === 0 ? -1 : 1) * (creekHalf + 0.3);
    for (let reed = 0; reed < 4; reed++) {
      builder.bar(
        "matte",
        reed % 2 === 0 ? "#6f9a3a" : "#557d2c",
        [x + reed * 0.07 - 0.14, 0, z + (reed % 3) * 0.05],
        [x + reed * 0.1 - 0.2, 0.7 + (reed % 3) * 0.15, z + (reed % 2) * 0.12],
        0.03,
        4,
      );
    }
  });
  /* Fallen leaves on the floor */
  for (let leaf = 0; leaf < 18; leaf++) {
    const angle = leaf * 2.4;
    const reach = 2.2 + ((leaf * 37) % 60) / 10;
    const x = Math.sin(angle) * reach;
    const z = Math.cos(angle) * reach;
    if (Math.abs(z - creekZ(x)) < creekHalf + 0.5) {
      continue;
    }
    builder.box(
      "matte",
      leaf % 3 === 0 ? "#b5813a" : leaf % 3 === 1 ? "#8d6a2f" : "#a3552d",
      [0.14, 0.01, 0.09],
      [x, 0.04, z],
      [0, angle, 0],
    );
  }
};

const buildPlatform = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = platform;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const middleX = (minX + maxX) / 2;
  const middleZ = (minZ + maxZ) / 2;
  const boards = builder.isFar ? 1 : 6;
  for (let board = 0; board < boards; board++) {
    builder.box(
      "matte",
      board % 2 === 0 ? plank : shade(plank, 0.9),
      [width / boards - 0.02, 0.08, depth],
      [minX + (width / boards) * (board + 0.5), platformTop - 0.04, middleZ],
    );
  }
  /* Log sides, and a stump step up */
  builder.box(
    "matte",
    barkDark,
    [width, platformTop - 0.08, depth - 0.05],
    [middleX, (platformTop - 0.08) / 2, middleZ],
  );
  builder.cylinder("matte", bark, {
    radius: 0.25,
    length: stepTop,
    at: [middleX - 0.27, stepTop / 2, (step.minZ + step.maxZ) / 2],
    segments: 10,
  });
  builder.cylinder("matte", bark, {
    radius: 0.25,
    length: stepTop,
    at: [middleX + 0.27, stepTop / 2, (step.minZ + step.maxZ) / 2],
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.torus(
      "matte",
      shade(bark, 1.25),
      0.17,
      0.03,
      [middleX + side * 0.27, stepTop + 0.005, (step.minZ + step.maxZ) / 2],
      "y",
      12,
    );
  });
  /* Corner posts with rope, leaving the front and back open */
  [minX + 0.06, maxX - 0.06].forEach((x) => {
    [minZ + 0.06, maxZ - 0.06].forEach((z) => {
      builder.cylinder("matte", barkDark, {
        radius: 0.06,
        length: 1.0,
        at: [x, platformTop + 0.5, z],
        segments: 8,
      });
      builder.sphere(
        "matte",
        bark,
        0.08,
        [x, platformTop + 1.02, z],
        [1, 0.6, 1],
        8,
      );
    });
    builder.bar(
      "matte",
      rope,
      [x, platformTop + 0.9, minZ + 0.06],
      [x, platformTop + 0.9, maxZ - 0.06],
      0.035,
      5,
    );
  });
  /* A little flag to say "swing from here" */
  builder.bar(
    "metal",
    palette.steel,
    [maxX - 0.06, platformTop + 1, maxZ - 0.06],
    [maxX - 0.06, platformTop + 1.7, maxZ - 0.06],
    0.03,
    5,
  );
  builder.box(
    "paint",
    heliconiaRed,
    [0.02, 0.24, 0.36],
    [maxX - 0.06, platformTop + 1.55, maxZ - 0.26],
  );
};

const buildLogBridge = (builder: AttractionBuilder) => {
  const length = logTo - logFrom;
  const middle = (logFrom + logTo) / 2;
  builder.cylinder("matte", bark, {
    radius: 0.38,
    length,
    at: [logX, logTop - 0.38, middle],
    axis: "z",
    segments: builder.isFar ? 8 : 14,
  });
  builder.box(
    "matte",
    plank,
    [1.0, 0.05, length],
    [logX, logTop - 0.01, middle],
  );
  if (builder.isFar) {
    return;
  }
  /* The cut end, with its rings, and the roots at the other */
  builder.cylinder("matte", "#c49a64", {
    radius: 0.36,
    length: 0.03,
    at: [logX, logTop - 0.38, logTo + 0.01],
    axis: "z",
    segments: 14,
  });
  builder.torus(
    "matte",
    "#a77d4c",
    0.2,
    0.015,
    [logX, logTop - 0.38, logTo + 0.025],
    "z",
    14,
  );
  for (let root = 0; root < 5; root++) {
    const angle = (root / 5) * Math.PI * 2;
    builder.bar(
      "matte",
      barkDark,
      [logX, logTop - 0.38, logFrom],
      [
        logX + Math.cos(angle) * 0.8,
        logTop - 0.38 + Math.sin(angle) * 0.6,
        logFrom - 0.5,
      ],
      0.1,
      5,
    );
  }
  /* Moss and mushrooms on the log */
  [-1.6, -0.2, 0.9].forEach((z) => {
    builder.sphere(
      "matte",
      moss,
      0.2,
      [logX + 0.28, logTop - 0.2, z],
      [0.6, 0.7, 1.5],
      7,
    );
  });
  [-1.0, 0.4].forEach((z) => {
    builder.cylinder("paint", "#f2e6c8", {
      radius: 0.11,
      radiusEnd: 0.04,
      length: 0.05,
      at: [logX - 0.36, logTop - 0.28, z],
      segments: 8,
    });
  });
  /* Rope handrails on posts */
  [-1, 1].forEach((side) => {
    const x = logX + side * 0.66;
    [logFrom + 0.2, middle, logTo - 0.2].forEach((z) => {
      builder.cylinder("matte", barkDark, {
        radius: 0.05,
        length: 1.25,
        at: [x, 0.62, z],
        segments: 6,
      });
    });
    builder.bar(
      "matte",
      rope,
      [x, 1.15, logFrom + 0.2],
      [x, 1.05, middle],
      0.035,
      5,
    );
    builder.bar(
      "matte",
      rope,
      [x, 1.05, middle],
      [x, 1.15, logTo - 0.2],
      0.035,
      5,
    );
  });
};

/** A low wooden board about lianas, with a leaf painted on. */
const buildInfoBoard = (builder: AttractionBuilder) => {
  const at = { x: 3.4, z: 4.6 };
  [-0.32, 0.32].forEach((side) => {
    builder.cylinder("matte", barkDark, {
      radius: 0.05,
      length: 0.95,
      at: [at.x + side, 0.47, at.z],
      segments: 6,
    });
  });
  builder.roundedBox(
    "paint",
    "#efe4c8",
    [0.85, 0.5, 0.05],
    0.03,
    [at.x, 0.82, at.z],
    [-0.35, -0.3, 0],
  );
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "paint",
    lianaDark,
    [at.x - 0.28, 0.65, at.z + 0.1],
    [at.x + 0.1, 1.0, at.z - 0.02],
    0.025,
    4,
  );
  builder.sphere(
    "paint",
    leafBright,
    0.1,
    [at.x + 0.12, 0.92, at.z + 0.05],
    [1.4, 0.8, 0.3],
    6,
  );
  builder.sphere(
    "paint",
    heliconiaYellow,
    0.06,
    [at.x + 0.24, 1.0, at.z + 0.02],
    [1, 1, 0.3],
    6,
  );
};

const buildLogSeat = (builder: AttractionBuilder) => {
  [-0.5, 0.5].forEach((dx) => {
    builder.cylinder("matte", bark, {
      radius: 0.18,
      length: 0.3,
      at: [5.6 + dx, 0.15, 3.2],
      segments: 8,
    });
  });
  builder.box("matte", plank, [1.5, 0.08, 0.36], [5.6, 0.33, 3.2]);
};

const plantSpots: readonly [
  number,
  number,
  "fern" | "heliconia" | "bromeliad",
  number,
][] = [
  [-6.8, 3.2, "heliconia", 1.1],
  [-5.4, 4.6, "fern", 1.2],
  [-2.8, 4.8, "bromeliad", 1.2],
  [-6.2, -2.4, "fern", 1.0],
  [-4.2, -4.8, "heliconia", 1.2],
  [1.0, -6.4, "fern", 1.3],
  [3.2, -5.6, "heliconia", 1.0],
  [6.2, -2.6, "fern", 1.1],
  [7.2, 1.8, "heliconia", 1.0],
  [4.6, 2.2, "bromeliad", 1.0],
  [-0.6, 2.4, "fern", 0.9],
  [2.6, 6.8, "fern", 1.1],
  [-4.4, 6.2, "heliconia", 0.9],
  [6.0, 5.2, "bromeliad", 1.1],
];

const buildPlants = (builder: AttractionBuilder) => {
  plantSpots.forEach(([x, z, kind, size]) => {
    if (kind === "fern") {
      addFern(builder, [x, 0, z], size);
    } else if (kind === "heliconia") {
      addHeliconia(builder, [x, 0, z], size);
    } else {
      addBromeliad(builder, [x, 0, z], size);
    }
  });
  addRainforestTree(builder, { x: 4.9, z: -3.6 }, 4.4, leafDeep);
  addRainforestTree(builder, { x: -6.0, z: 1.4 }, 3.8, leafMid);
  addPalm(builder, { x: 7.0, z: -0.6 }, 4.2, -0.5);
  addPalm(builder, { x: -7.2, z: -1.9 }, 3.9, 0.45);
  addPalm(builder, { x: 4.6, z: 6.4 }, 3.4, -0.3);
};

/* -------------------------------------------------------------- */
/* Moving parts                                                    */
/* -------------------------------------------------------------- */

const addVine = (builder: AttractionBuilder, length: number) => {
  const pieces = builder.isFar ? 1 : 4;
  for (let piece = 0; piece < pieces; piece++) {
    const from = -(piece / pieces) * length;
    const to = -((piece + 1) / pieces) * length;
    const wiggle = piece % 2 === 0 ? 0.04 : -0.04;
    builder.bar("matte", liana, [wiggle, from, 0], [-wiggle, to, 0], 0.08, 6);
    if (!builder.isFar && piece > 0) {
      builder.sphere(
        "matte",
        leafBright,
        0.12,
        [0.06, from, 0.02],
        [1.4, 0.35, 0.8],
        6,
      );
    }
  }
  /* The knot where the vine wraps round the bough */
  builder.torus("matte", lianaDark, 0.26, 0.06, [0, 0.12, 0], "x", 12);
};

const buildSwingVine = (builder: AttractionBuilder) => {
  addVine(builder, swingLength);
  /* A disc seat, and a fat knot to hold on to */
  builder.sphere(
    "matte",
    lianaDark,
    0.1,
    [0, -swingLength + 0.55, 0],
    [1, 1.3, 1],
    8,
  );
  builder.cylinder("matte", plank, {
    radius: 0.24,
    length: 0.07,
    at: [0, -swingLength, 0],
    segments: 14,
  });
  if (!builder.isFar) {
    builder.torus(
      "matte",
      shade(plank, 0.8),
      0.24,
      0.025,
      [0, -swingLength, 0],
      "y",
      14,
    );
  }
};

const buildSpareVine = (builder: AttractionBuilder) => {
  addVine(builder, spareLength);
  builder.sphere(
    "matte",
    lianaDark,
    0.11,
    [0, -spareLength, 0],
    [1, 1.4, 1],
    8,
  );
};

const toucanBranch: Triple = [4.9 - 0.9, 3.6, -3.6 + 0.6];

const buildToucan = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    palette.black,
    0.16,
    [0, 0.18, 0],
    [0.9, 1.25, 0.9],
    10,
  );
  builder.sphere("paint", "#f7ecb5", 0.1, [0, 0.27, 0.09], [0.9, 1, 0.5], 8);
  builder.sphere("paint", palette.black, 0.12, [0, 0.38, 0.02], [1, 1, 1], 10);
  builder.cylinder("paint", toucanBeak, {
    radius: 0.075,
    radiusEnd: 0.02,
    length: 0.36,
    at: [0, 0.36, 0.28],
    axis: "z",
    segments: 8,
  });
  builder.sphere("paint", heliconiaRed, 0.03, [0, 0.36, 0.46], [1, 1, 1], 5);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#5ab7e8",
      0.032,
      [side * 0.09, 0.4, 0.08],
      [0.5, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.014,
      [side * 0.105, 0.4, 0.09],
      [1, 1, 1],
      4,
    );
  });
  builder.box(
    "paint",
    palette.black,
    [0.1, 0.04, 0.26],
    [0, 0.05, -0.2],
    [0.5, 0, 0],
  );
};

const frogAt: Triple = [3.2, -0.08, 1.1];

const buildFrog = (builder: AttractionBuilder) => {
  addBromeliad(builder, [0, 0, 0], 1.3);
  builder.sphere(
    "paint",
    frogGreen,
    0.12,
    [0, 0.38, 0.02],
    [1.1, 0.8, 1.2],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      frogEye,
      0.05,
      [side * 0.07, 0.46, 0.1],
      [1, 1, 1],
      8,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [side * 0.08, 0.47, 0.14],
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "paint",
      "#2e78c8",
      0.04,
      [side * 0.11, 0.35, -0.02],
      [1, 0.5, 1.4],
      6,
    );
    builder.sphere(
      "paint",
      "#f2913a",
      0.03,
      [side * 0.12, 0.29, 0.14],
      [1, 0.5, 1],
      5,
    );
  });
};

const fungiAt: Triple = [-0.6, 0, -3.3];

const buildFungi = (builder: AttractionBuilder) => {
  [
    [0, 0, 0.32, 0.2],
    [0.3, 0.15, 0.22, 0.14],
    [-0.25, 0.2, 0.26, 0.16],
    [0.1, -0.3, 0.18, 0.11],
    [-0.4, -0.15, 0.15, 0.1],
  ].forEach(([x, z, height, cap]) => {
    builder.cylinder("glow", "#d8fbe8", {
      radius: cap * 0.25,
      length: height,
      at: [x, height / 2, z],
      segments: 6,
    });
    builder.sphere("glow", fungusGlow, cap, [x, height, z], [1, 0.45, 1], 8);
  });
};

const buildButterfly = (builder: AttractionBuilder) => {
  builder.box("matte", palette.black, [0.03, 0.03, 0.14], [0, 0, 0]);
  [-1, 1].forEach((side) => {
    builder.box(
      "glow",
      morphoBlue,
      [0.14, 0.01, 0.13],
      [side * 0.08, 0.02, 0.02],
      [0, 0, side * 0.35],
    );
  });
};

/* -------------------------------------------------------------- */
/* The ride                                                         */
/* -------------------------------------------------------------- */

const platformEdge: Triple = [swingPivot[0], platformTop, platform.minZ + 0.1];

const swingRide = (progress: number, seconds: number): LocalSpot => {
  if (progress < 0.12) {
    const share = progress / 0.12;
    return {
      x: swingStart.x,
      y:
        share < 0.5
          ? stepTop * share * 2
          : stepTop + (platformTop - stepTop) * (share - 0.5) * 2,
      z: swingStart.z + (platformEdge[2] - swingStart.z) * share,
      heading: Math.PI,
    };
  }
  const seat: Triple = [
    swingPivot[0],
    swingPivot[1] - swingLength + 0.05,
    swingPivot[2],
  ];
  const [x, y, z] = moveWithPose(
    swingPivot,
    seat,
    findMotionPose(swingMotion, seconds),
  );
  if (progress < 0.84) {
    const grab = Math.min(1, (progress - 0.12) / 0.07);
    return {
      x: platformEdge[0] + (x - platformEdge[0]) * grab,
      y: platformEdge[1] + (y - platformEdge[1]) * grab,
      z: platformEdge[2] + (z - platformEdge[2]) * grab,
      heading: Math.PI,
    };
  }
  const share = (progress - 0.84) / 0.16;
  return {
    x: x + (swingFinish.x - x) * share,
    y: Math.max(0, y * (1 - share) + Math.sin(share * Math.PI) * 0.6),
    z: z + (swingFinish.z - z) * share,
    heading: Math.PI,
  };
};

export const vineSwingGladeModel: NewLandAttractionModel = {
  kind: "vine-swing-glade",
  islandId: "jungle-reach",
  name: "Vine Swing Glade",
  fact: "Lianas are woody vines that start on the shady forest floor and climb up the trees towards the sunlight. Plants need light to make their food, so climbing is a clever way to reach it. Some lianas grow more than 100 metres long!",
  curriculumLink:
    "Science, Year 3: plants. Explore the requirements of plants for life and growth (light, water and room to grow): why lianas climb towards the sunlight.",
  footprint: 9,
  setting: "inland",
  signSpot: signAt,
  padColour: "#4f7f34",
  build: (builder) => {
    buildForestFloor(builder);
    buildGiantTree(builder);
    buildPlatform(builder);
    buildLogBridge(builder);
    buildPlants(builder);
    buildInfoBoard(builder);
    if (!builder.isFar) {
      buildLogSeat(builder);
    }
    addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  },
  moving: [
    {
      name: "vine swing",
      pivot: swingPivot,
      build: buildSwingVine,
      motion: swingMotion,
    },
    {
      name: "spare vine",
      pivot: sparePivot,
      build: buildSpareVine,
      motion: {
        kind: "swing",
        axis: "x",
        amplitude: 0.3,
        period: 3.9,
        phase: 1.4,
      },
    },
    {
      name: "toucan",
      pivot: toucanBranch,
      build: buildToucan,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.45,
        period: 0.9,
      },
    },
    {
      name: "red-eyed tree frog",
      pivot: frogAt,
      build: buildFrog,
      motion: { kind: "rise", reach: 4.5, height: 0.35, period: 1.4 },
    },
    {
      name: "glowing toadstools",
      pivot: fungiAt,
      build: buildFungi,
      motion: { kind: "wake", reach: 4 },
    },
  ],
  wanderers: [
    {
      name: "blue morpho butterflies",
      build: buildButterfly,
      count: 6,
      centre: { x: 0, z: 0.4 },
      radius: 5,
      height: 1.6,
      bob: 0.35,
      speed: 0.6,
    },
  ],
  decks: [
    buildFlatDeck(platform, platformTop, "bridge"),
    buildFlatDeck(step, stepTop, "bridge"),
    buildFlatDeck(
      { minX: logX - 0.5, maxX: logX + 0.5, minZ: logFrom, maxZ: logTo },
      logTop,
      "bridge",
    ),
  ],
  rides: [
    {
      id: "vine-swing",
      name: "the vine swing",
      start: swingStart,
      reach: 0.6,
      seconds: 11,
      finish: swingFinish,
      follow: swingRide,
    },
  ],
  blockers: [
    { x: giantAt.x, z: giantAt.z, radius: 1.3 },
    { x: 4.9, z: -3.6, radius: 0.4 },
    { x: -6.0, z: 1.4, radius: 0.4 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Swing across the creek",
    news: "Wheee! You grabbed a liana and swung right over the muddy creek, the way the vines themselves climb up the trees to reach the light.",
  },
};
