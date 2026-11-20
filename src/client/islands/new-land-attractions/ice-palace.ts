import {
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  OctahedronGeometry,
  Vector3,
} from "three";
import {
  addSignBoard,
  buildFlatDeck,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type LocalSpot,
  type MovingPart,
  type Triple,
  type Wanderers,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef4f8";
const snowShadow = "#d6e3ec";
const ice = "#bfe3f2";
const deepIce = "#86c4e2";
const paleIce = "#e3f4fb";
const frostWhite = "#f7fbfe";
const aurora = "#6ff0c0";
const auroraViolet = "#a98bff";
const royal = "#5b3fa8";
const silver = "#c9d6e2";
const pine = "#2d5a40";
const signColour = "#3d5fa8";

/* The courtyard: ice walls round a sheet of ice, the keep at the back */
const wallHeight = 1.5;
const wallThick = 0.4;
const yard = { minX: -3.6, maxX: 3.6, frontZ: 1.2, backZ: -3.2 };
const gateHalf = 0.8;
const tower = { radius: 0.75, height: 3.0 };
const towers: [number, number][] = [
  [yard.minX, yard.frontZ],
  [yard.maxX, yard.frontZ],
  [yard.minX, yard.backZ],
  [yard.maxX, yard.backZ],
];
const keep = { halfWidth: 2.4, frontZ: yard.backZ, backZ: -5.4, height: 3.2 };
const spire = { x: 0, z: -4.3, radius: 0.9, height: 5.0 };
const iceFloor = 0.06;
const fountainAt = { x: 0, z: -1.1 };
const signAt: Triple = [-2.4, 0, 6.2];

/* The slide winds down from the front right tower, out to the front */
const slideTop = new Vector3(yard.maxX + 0.75, 2.75, yard.frontZ - 0.3);
const slideCurve = new CatmullRomCurve3([
  slideTop,
  new Vector3(5.6, 2.3, 0.4),
  new Vector3(6.6, 1.7, 1.5),
  new Vector3(6.45, 1.05, 3.0),
  new Vector3(5.4, 0.5, 4.05),
  new Vector3(4.1, 0.18, 4.6),
]);
const slideStart = { x: 2.55, z: 2.7 };
const slideFinish = { x: 2.3, z: 5.3 };

/* ------------------------------------------------------------------ */
/* Little helpers                                                      */
/* ------------------------------------------------------------------ */

/** A box laid from one point to another, `side` across and `lift` up. */
const addSlab = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  from: Vector3,
  to: Vector3,
  [width, thickness]: [number, number],
  side = 0,
  lift = 0,
) => {
  const flat = Math.hypot(to.x - from.x, to.z - from.z);
  const length = Math.hypot(flat, to.y - from.y);
  const yaw = Math.atan2(to.x - from.x, to.z - from.z);
  const pitch = Math.atan2(from.y - to.y, flat);
  builder.add(
    finish,
    colour,
    new BoxGeometry(width, thickness, length + 0.03)
      .rotateX(pitch)
      .rotateY(yaw),
    {
      at: [
        (from.x + to.x) / 2 + Math.cos(yaw) * side,
        (from.y + to.y) / 2 + lift,
        (from.z + to.z) / 2 - Math.sin(yaw) * side,
      ],
    },
    undefined,
  );
};

const addFir = (builder: AttractionBuilder, x: number, z: number, size = 1) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.1 * size,
    length: 0.5 * size,
    at: [x, 0.25 * size, z],
    segments: 6,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const radius = (0.85 - tier * 0.22) * size;
    const y = (0.5 + tier * 0.55) * size;
    builder.add(
      "matte",
      shade(pine, 1 + tier * 0.07),
      new ConeGeometry(radius, 0.95 * size, builder.segments(9, 6)),
      { at: [x, y + 0.45 * size, z] },
    );
    if (!builder.isFar) {
      builder.add(
        "matte",
        frostWhite,
        new ConeGeometry(radius * 0.55, 0.34 * size, 9),
        { at: [x, y + 0.78 * size, z] },
      );
    }
  }
};

/* ------------------------------------------------------------------ */
/* Walls and towers                                                    */
/* ------------------------------------------------------------------ */

/** A wall of ice blocks from one point to another, with battlements. */
const addIceWall = (
  builder: AttractionBuilder,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
) => {
  const length = Math.hypot(toX - fromX, toZ - fromZ);
  const turn = Math.atan2(toZ - fromZ, toX - fromX);
  const rotation: Triple = [0, -turn, 0];
  const along = (share: number, up: number): Triple => [
    fromX + (toX - fromX) * share,
    up,
    fromZ + (toZ - fromZ) * share,
  ];
  builder.box(
    "glass",
    ice,
    [length, wallHeight, wallThick],
    along(0.5, wallHeight / 2),
    rotation,
  );
  builder.box(
    "matte",
    frostWhite,
    [length + 0.04, 0.1, wallThick + 0.1],
    along(0.5, wallHeight + 0.05),
    rotation,
  );
  if (builder.isFar) {
    return;
  }
  /* The joints between the blocks, and snow drifted at the foot */
  [0.5, 1.0].forEach((up) => {
    builder.box(
      "matte",
      paleIce,
      [length, 0.04, wallThick + 0.03],
      along(0.5, up),
      rotation,
    );
  });
  const blocks = Math.max(1, Math.round(length / 0.8));
  for (let block = 1; block < blocks; block++) {
    const offset = (block % 2) * 0.4;
    builder.box(
      "matte",
      paleIce,
      [0.04, 0.48, wallThick + 0.03],
      along(
        Math.min(1, (block * 0.8 - offset) / length),
        0.26 + (block % 3) * 0.5,
      ),
      rotation,
    );
  }
  const merlons = Math.max(1, Math.floor(length / 0.55));
  for (let merlon = 0; merlon < merlons; merlon++) {
    builder.box(
      "glass",
      shade(ice, merlon % 2 === 0 ? 1.04 : 0.97),
      [0.3, 0.32, wallThick],
      along((merlon + 0.5) / merlons, wallHeight + 0.26),
      rotation,
    );
  }
  builder.box(
    "matte",
    snowShadow,
    [length, 0.14, 0.3],
    along(0.5, 0.07),
    rotation,
  );
};

const addTower = (builder: AttractionBuilder, x: number, z: number) => {
  const segments = builder.segments(14, 8);
  builder.cylinder("glass", ice, {
    radius: tower.radius,
    length: tower.height,
    at: [x, tower.height / 2, z],
    segments,
  });
  builder.cylinder("matte", frostWhite, {
    radius: tower.radius + 0.12,
    length: 0.18,
    at: [x, tower.height + 0.09, z],
    segments,
  });
  builder.add(
    "glass",
    deepIce,
    new ConeGeometry(tower.radius + 0.05, 1.7, segments),
    { at: [x, tower.height + 1.03, z] },
  );
  builder.sphere(
    "metal",
    silver,
    0.1,
    [x, tower.height + 1.95, z],
    [1, 1, 1],
    8,
  );
  if (builder.isFar) {
    return;
  }
  /* Rings of frost, glowing slit windows, and a snowy cap on the spire */
  [0.06, 1.55].forEach((up) => {
    builder.cylinder("matte", paleIce, {
      radius: tower.radius + 0.03,
      length: 0.06,
      at: [x, up, z],
      segments,
    });
  });
  for (let window = 0; window < 4; window++) {
    const angle = (window / 4) * Math.PI * 2 + Math.PI / 4;
    builder.box(
      "glow",
      window % 2 === 0 ? aurora : auroraViolet,
      [0.16, 0.45, 0.05],
      [
        x + Math.sin(angle) * (tower.radius + 0.01),
        2.2,
        z + Math.cos(angle) * (tower.radius + 0.01),
      ],
      [0, angle, 0],
    );
  }
  for (let merlon = 0; merlon < 8; merlon++) {
    const angle = (merlon / 8) * Math.PI * 2;
    builder.box(
      "glass",
      ice,
      [0.22, 0.22, 0.16],
      [
        x + Math.sin(angle) * (tower.radius + 0.05),
        tower.height + 0.28,
        z + Math.cos(angle) * (tower.radius + 0.05),
      ],
      [0, angle, 0],
    );
  }
  builder.add("matte", frostWhite, new ConeGeometry(0.32, 0.4, 8), {
    at: [x, tower.height + 1.62, z],
  });
};

const buildWalls = (builder: AttractionBuilder) => {
  const towerEdge = tower.radius - 0.1;
  /* The front wall, open at the gate */
  addIceWall(
    builder,
    yard.minX + towerEdge,
    yard.frontZ,
    -gateHalf - 0.25,
    yard.frontZ,
  );
  addIceWall(
    builder,
    gateHalf + 0.25,
    yard.frontZ,
    yard.maxX - towerEdge,
    yard.frontZ,
  );
  /* The sides, and the back between the towers and the keep */
  [yard.minX, yard.maxX].forEach((x) => {
    addIceWall(builder, x, yard.frontZ - towerEdge, x, yard.backZ + towerEdge);
  });
  addIceWall(
    builder,
    yard.minX + towerEdge,
    yard.backZ,
    -keep.halfWidth,
    yard.backZ,
  );
  addIceWall(
    builder,
    keep.halfWidth,
    yard.backZ,
    yard.maxX - towerEdge,
    yard.backZ,
  );
  towers.forEach(([x, z]) => {
    addTower(builder, x, z);
  });
};

/** The gate: two pillars and an arch high enough to walk under. */
const buildGate = (builder: AttractionBuilder) => {
  const z = yard.frontZ;
  [-1, 1].forEach((side) => {
    const x = side * (gateHalf + 0.15);
    builder.box("glass", deepIce, [0.32, 2.3, 0.6], [x, 1.15, z]);
    builder.add(
      "glass",
      ice,
      new ConeGeometry(0.24, 0.5, builder.segments(8, 4)),
      {
        at: [x, 2.55, z],
      },
    );
  });
  const steps = builder.isFar ? 4 : 9;
  for (let step = 0; step < steps; step++) {
    const from = (step / steps) * Math.PI;
    const to = ((step + 1) / steps) * Math.PI;
    const radius = gateHalf + 0.15;
    builder.bar(
      "glass",
      step % 2 === 0 ? paleIce : ice,
      [Math.cos(from) * radius, 2.15 + Math.sin(from) * 0.6, z],
      [Math.cos(to) * radius, 2.15 + Math.sin(to) * 0.6, z],
      0.26,
      6,
    );
  }
  if (builder.isFar) {
    return;
  }
  /* A glowing crest in the arch, and icicles hanging from it */
  builder.add("glow", aurora, new OctahedronGeometry(0.2, 0), {
    at: [0, 2.78, z + 0.16],
    scale: [1, 1.3, 0.4],
  });
  for (let icicle = 0; icicle < 7; icicle++) {
    const x = -0.6 + icicle * 0.2;
    const top = 2.15 + Math.sqrt(Math.max(0, 1 - (x / 0.95) ** 2)) * 0.6 - 0.1;
    builder.add(
      "glass",
      paleIce,
      new ConeGeometry(0.035, 0.22 + (icicle % 3) * 0.08, 5).rotateX(Math.PI),
      { at: [x, top - 0.12, z + 0.12] },
    );
  }
};

/* ------------------------------------------------------------------ */
/* The keep and its spire                                              */
/* ------------------------------------------------------------------ */

const buildKeep = (builder: AttractionBuilder) => {
  const depth = keep.frontZ - keep.backZ;
  const middleZ = (keep.frontZ + keep.backZ) / 2;
  builder.box(
    "glass",
    ice,
    [keep.halfWidth * 2, keep.height, depth],
    [0, keep.height / 2, middleZ],
  );
  builder.box(
    "matte",
    frostWhite,
    [keep.halfWidth * 2 + 0.2, 0.16, depth + 0.2],
    [0, keep.height + 0.08, middleZ],
  );
  /* Two little turrets on the keep's front corners */
  [-1, 1].forEach((side) => {
    const x = side * (keep.halfWidth - 0.15);
    builder.cylinder("glass", deepIce, {
      radius: 0.4,
      length: keep.height + 0.8,
      at: [x, (keep.height + 0.8) / 2, keep.frontZ + 0.05],
      segments: builder.segments(10, 6),
    });
    builder.add(
      "glass",
      ice,
      new ConeGeometry(0.48, 1.2, builder.segments(10, 6)),
      { at: [x, keep.height + 1.4, keep.frontZ + 0.05] },
    );
  });
  /* The great spire, its onion dome, and a lantern under the star */
  builder.cylinder("glass", deepIce, {
    radius: spire.radius,
    radiusEnd: spire.radius * 0.8,
    length: spire.height - 0.6,
    at: [spire.x, (spire.height - 0.6) / 2, spire.z],
    segments: builder.segments(14, 8),
  });
  builder.lathe(
    "glass",
    ice,
    [
      [0, 0],
      [spire.radius * 0.95, 0],
      [spire.radius * 1.15, 0.35],
      [spire.radius * 1.0, 0.75],
      [spire.radius * 0.5, 1.05],
      [0.12, 1.3],
      [0.06, 1.5],
      [0, 1.5],
    ],
    [spire.x, spire.height - 0.62, spire.z],
    "y",
    14,
  );
  /* The great door, glowing like the northern lights inside */
  builder.box(
    "glow",
    auroraViolet,
    [1.1, 1.5, 0.05],
    [0, 0.75, keep.frontZ + 0.03],
  );
  builder.cylinder("glow", auroraViolet, {
    radius: 0.55,
    length: 0.05,
    at: [0, 1.5, keep.frontZ + 0.03],
    axis: "z",
    segments: 12,
  });
  if (builder.isFar) {
    return;
  }
  builder.lathe(
    "matte",
    frostWhite,
    [
      [0.1, 0],
      [0.25, 0.1],
      [0.1, 0.2],
    ],
    [spire.x, spire.height + 0.65, spire.z],
    "y",
    10,
  );
  builder.cylinder("metal", silver, {
    radius: 0.03,
    length: 0.5,
    at: [spire.x, spire.height + 1.1, spire.z],
    segments: 6,
  });
  /* The door's frame, steps and studs */
  builder.box(
    "glass",
    paleIce,
    [1.4, 0.12, 0.12],
    [0, 0.06, keep.frontZ + 0.4],
  );
  builder.box("glass", paleIce, [1.6, 0.08, 0.5], [0, 0.04, keep.frontZ + 0.3]);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      deepIce,
      [0.16, 1.6, 0.16],
      [side * 0.65, 0.8, keep.frontZ + 0.08],
    );
    for (let stud = 0; stud < 3; stud++) {
      builder.sphere(
        "metal",
        silver,
        0.035,
        [side * 0.25, 0.4 + stud * 0.4, keep.frontZ + 0.07],
        [1, 1, 1],
        5,
      );
    }
  });
  /* Tall glowing windows along the keep and round the spire */
  [-1.55, -0.95, 0.95, 1.55].forEach((x, index) => {
    builder.box(
      "glow",
      index % 2 === 0 ? aurora : "#9fe8ff",
      [0.3, 0.8, 0.04],
      [x, 2.0, keep.frontZ + 0.02],
    );
    builder.cylinder("glow", index % 2 === 0 ? aurora : "#9fe8ff", {
      radius: 0.15,
      length: 0.04,
      at: [x, 2.4, keep.frontZ + 0.02],
      axis: "z",
      segments: 8,
    });
    builder.box(
      "matte",
      frostWhite,
      [0.42, 0.06, 0.12],
      [x, 1.57, keep.frontZ + 0.06],
    );
  });
  for (let window = 0; window < 6; window++) {
    const angle = (window / 6) * Math.PI * 2;
    builder.box(
      "glow",
      window % 2 === 0 ? auroraViolet : aurora,
      [0.2, 0.6, 0.04],
      [
        spire.x + Math.sin(angle) * (spire.radius * 0.84),
        3.9,
        spire.z + Math.cos(angle) * (spire.radius * 0.84),
      ],
      [0, angle, 0],
    );
  }
  /* A balcony over the door, with a royal banner either side */
  builder.box("glass", paleIce, [1.6, 0.1, 0.5], [0, 2.55, keep.frontZ + 0.25]);
  for (let post = 0; post < 7; post++) {
    builder.box(
      "glass",
      ice,
      [0.06, 0.32, 0.06],
      [-0.75 + post * 0.25, 2.76, keep.frontZ + 0.47],
    );
  }
  builder.box(
    "glass",
    paleIce,
    [1.6, 0.06, 0.08],
    [0, 2.94, keep.frontZ + 0.47],
  );
  [-1.25, 1.25].forEach((x) => {
    builder.box(
      "matte",
      royal,
      [0.4, 1.0, 0.03],
      [x, 2.75, keep.frontZ + 0.04],
    );
    builder.box(
      "matte",
      silver,
      [0.4, 0.06, 0.035],
      [x, 2.5, keep.frontZ + 0.05],
    );
    builder.add(
      "matte",
      royal,
      new ConeGeometry(0.2, 0.25, 3).rotateX(Math.PI),
      {
        at: [x, 2.13, keep.frontZ + 0.04],
        scale: [1, 1, 0.12],
      },
    );
  });
  /* Icicles all along the keep's eaves */
  for (let icicle = 0; icicle < 16; icicle++) {
    builder.add(
      "glass",
      paleIce,
      new ConeGeometry(0.04, 0.2 + (icicle % 4) * 0.07, 5).rotateX(Math.PI),
      {
        at: [
          -keep.halfWidth + 0.3 + icicle * 0.28,
          keep.height - 0.15,
          keep.frontZ + 0.04,
        ],
      },
    );
  }
};

/* ------------------------------------------------------------------ */
/* The courtyard                                                       */
/* ------------------------------------------------------------------ */

const yardFloor = {
  minX: yard.minX + wallThick / 2,
  maxX: yard.maxX - wallThick / 2,
  minZ: yard.backZ + wallThick / 2,
  maxZ: yard.frontZ - wallThick / 2,
};

const buildCourtyard = (builder: AttractionBuilder) => {
  builder.box(
    "glass",
    paleIce,
    [
      yardFloor.maxX - yardFloor.minX,
      iceFloor,
      yardFloor.maxZ - yardFloor.minZ,
    ],
    [0, iceFloor / 2, (yardFloor.minZ + yardFloor.maxZ) / 2],
  );
  /* A frozen fountain: tiers of ice, frozen mid-splash */
  const { x, z } = fountainAt;
  builder.lathe(
    "glass",
    ice,
    [
      [0, 0],
      [0.75, 0],
      [0.8, 0.35],
      [0.68, 0.38],
      [0.2, 0.42],
      [0.16, 1.1],
      [0.45, 1.15],
      [0.42, 1.3],
      [0.1, 1.32],
      [0.08, 1.75],
      [0, 1.8],
    ],
    [x, 0, z],
    "y",
    16,
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("water", "#9fd6ec", {
    radius: 0.66,
    length: 0.04,
    at: [x, 0.34, z],
    segments: 16,
  });
  for (let spout = 0; spout < 6; spout++) {
    const angle = (spout / 6) * Math.PI * 2;
    builder.add(
      "glass",
      paleIce,
      new ConeGeometry(0.05, 0.6, 5).rotateX(Math.PI),
      {
        at: [x + Math.sin(angle) * 0.42, 0.95, z + Math.cos(angle) * 0.42],
      },
    );
  }
  builder.add("glow", aurora, new OctahedronGeometry(0.12, 0), {
    at: [x, 1.95, z],
  });
  /* An ice swan sculpture and an ice throne by the keep */
  const swan = { x: -2.2, z: -2.2 };
  builder.box("glass", paleIce, [0.6, 0.3, 0.6], [swan.x, 0.15, swan.z]);
  builder.sphere(
    "glass",
    ice,
    0.32,
    [swan.x, 0.5, swan.z],
    [0.9, 0.7, 1.3],
    10,
  );
  builder.bar(
    "glass",
    ice,
    [swan.x, 0.55, swan.z + 0.3],
    [swan.x, 1.05, swan.z + 0.42],
    0.1,
    6,
  );
  builder.sphere(
    "glass",
    ice,
    0.09,
    [swan.x, 1.08, swan.z + 0.48],
    [1, 1, 1.4],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glass",
      paleIce,
      0.22,
      [swan.x + side * 0.25, 0.6, swan.z - 0.08],
      [0.3, 0.75, 1.1],
      8,
    );
  });
  const throne = { x: 2.2, z: -2.4 };
  builder.box("glass", paleIce, [1.0, 0.16, 0.8], [throne.x, 0.08, throne.z]);
  builder.box("glass", ice, [0.6, 0.45, 0.5], [throne.x, 0.38, throne.z]);
  builder.box(
    "glass",
    deepIce,
    [0.7, 1.1, 0.12],
    [throne.x, 0.9, throne.z - 0.25],
  );
  builder.add("glass", ice, new ConeGeometry(0.16, 0.35, 6), {
    at: [throne.x, 1.62, throne.z - 0.25],
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      ice,
      [0.1, 0.25, 0.45],
      [throne.x + side * 0.33, 0.72, throne.z],
    );
    builder.add("glass", paleIce, new ConeGeometry(0.08, 0.25, 6), {
      at: [throne.x + side * 0.3, 1.55, throne.z - 0.25],
    });
  });
  builder.box(
    "matte",
    royal,
    [0.5, 0.05, 0.42],
    [throne.x, 0.63, throne.z + 0.02],
  );
  /* Ice lanterns standing round the yard */
  [
    [-2.8, 0.4],
    [2.8, 0.4],
    [-2.8, -1.4],
    [2.8, -1.4],
  ].forEach(([lx, lz], index) => {
    builder.cylinder("glass", ice, {
      radius: 0.12,
      length: 0.9,
      at: [lx, 0.45, lz],
      segments: 6,
    });
    builder.box(
      "glow",
      index % 2 === 0 ? aurora : auroraViolet,
      [0.18, 0.2, 0.18],
      [lx, 1.0, lz],
    );
    builder.add("glass", paleIce, new ConeGeometry(0.16, 0.2, 6), {
      at: [lx, 1.2, lz],
    });
  });
};

/* ------------------------------------------------------------------ */
/* The ice slide                                                       */
/* ------------------------------------------------------------------ */

const buildSlide = (builder: AttractionBuilder) => {
  const steps = builder.isFar ? 8 : 22;
  const points = slideCurve.getSpacedPoints(steps);
  for (let index = 0; index < steps; index++) {
    const from = points[index];
    const to = points[index + 1];
    addSlab(
      builder,
      "glass",
      index % 2 === 0 ? paleIce : frostWhite,
      from,
      to,
      [0.8, 0.08],
    );
    [-1, 1].forEach((side) => {
      addSlab(
        builder,
        "glass",
        deepIce,
        from,
        to,
        [0.07, 0.34],
        side * 0.42,
        0.14,
      );
    });
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        addSlab(
          builder,
          "paint",
          index % 2 === 0 ? royal : silver,
          from,
          to,
          [0.1, 0.06],
          side * 0.42,
          0.33,
        );
      });
    }
  }
  /* Ice pillars holding it up */
  [4, 9, 14, 18].forEach((index) => {
    const point = slideCurve.getPointAt(index / 22);
    builder.cylinder("glass", ice, {
      radius: 0.12,
      length: point.y,
      at: [point.x, point.y / 2, point.z],
      segments: 6,
    });
  });
  /* Icy rungs up the tower to the top of the slide */
  builder.box(
    "glass",
    paleIce,
    [0.9, 0.1, 0.7],
    [slideTop.x - 0.15, slideTop.y - 0.05, slideTop.z],
  );
  if (builder.isFar) {
    return;
  }
  for (let rung = 0; rung < 9; rung++) {
    builder.box(
      "glass",
      paleIce,
      [0.5, 0.06, 0.12],
      [yard.maxX, 0.3 + rung * 0.28, yard.frontZ + tower.radius + 0.06],
    );
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      deepIce,
      [0.06, 2.7, 0.08],
      [yard.maxX + side * 0.27, 1.35, yard.frontZ + tower.radius + 0.06],
    );
  });
  /* A soft heap of snow to land in at the bottom */
  const end = slideCurve.getPointAt(1);
  builder.sphere(
    "matte",
    frostWhite,
    0.5,
    [end.x - 0.6, 0, end.z + 0.2],
    [1.6, 0.4, 1.3],
    10,
  );
};

const slideRide = (progress: number): LocalSpot => {
  if (progress < 0.22) {
    const share = progress / 0.22;
    return {
      x: slideStart.x + (slideTop.x - slideStart.x) * share,
      y: slideTop.y * share,
      z: slideStart.z + (slideTop.z - slideStart.z) * share,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.9) {
    const share = ((progress - 0.22) / 0.68) ** 1.25;
    const point = slideCurve.getPointAt(share);
    const tangent = slideCurve.getTangentAt(share);
    return {
      x: point.x,
      y: point.y + 0.06,
      z: point.z,
      heading: Math.atan2(tangent.x, tangent.z),
    };
  }
  const share = (progress - 0.9) / 0.1;
  const end = slideCurve.getPointAt(1);
  return {
    x: end.x + (slideFinish.x - end.x) * share,
    y: (end.y + 0.06) * (1 - share),
    z: end.z + (slideFinish.z - end.z) * share,
    heading: -Math.PI / 2,
  };
};

/* ------------------------------------------------------------------ */
/* The grounds                                                         */
/* ------------------------------------------------------------------ */

const firs: [number, number, number][] = [
  [-6.2, -3.8, 1.2],
  [5.6, -5.4, 1.1],
  [-5.6, -6.2, 0.9],
  [-6.6, 1.2, 0.85],
  [6.9, -2.0, 0.8],
];

const buildGrounds = (builder: AttractionBuilder) => {
  firs.forEach(([x, z, size], index) => {
    if (!builder.isFar || index < 3) {
      addFir(builder, x, z, size);
    }
  });
  /* A path of packed snow to the gate, lined with glowing ice posts */
  builder.box("matte", snowShadow, [1.6, 0.02, 4.6], [0, 0.01, 3.6]);
  if (builder.isFar) {
    return;
  }
  [1.9, 3.3, 4.7].forEach((z) => {
    [-1, 1].forEach((side) => {
      builder.cylinder("glass", ice, {
        radius: 0.09,
        radiusEnd: 0.07,
        length: 0.5,
        at: [side * 1.05, 0.25, z],
        segments: 6,
      });
      builder.sphere(
        "glow",
        side < 0 ? aurora : "#9fe8ff",
        0.09,
        [side * 1.05, 0.58, z],
        [1, 1, 1],
        6,
      );
    });
  });
  /* Snow drifts and a snowman guard by the gate */
  [
    [-5.2, 3.6, 0.6],
    [5.8, -0.4, 0.5],
    [-4.4, -6.4, 0.55],
    [2.8, -6.6, 0.65],
    [-4.8, 5.4, 0.4],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", frostWhite, size, [x, 0, z], [1.6, 0.45, 1.1], 10);
  });
  const guard = { x: -1.7, z: 2.2 };
  builder.sphere(
    "matte",
    frostWhite,
    0.36,
    [guard.x, 0.32, guard.z],
    [1, 0.9, 1],
    10,
  );
  builder.sphere(
    "matte",
    frostWhite,
    0.26,
    [guard.x, 0.8, guard.z],
    [1, 1, 1],
    10,
  );
  builder.sphere(
    "matte",
    frostWhite,
    0.18,
    [guard.x, 1.15, guard.z],
    [1, 1, 1],
    10,
  );
  builder.cylinder("paint", royal, {
    radius: 0.14,
    radiusEnd: 0.12,
    length: 0.26,
    at: [guard.x, 1.38, guard.z],
    segments: 8,
  });
  builder.cylinder("paint", royal, {
    radius: 0.22,
    length: 0.03,
    at: [guard.x, 1.26, guard.z],
    segments: 8,
  });
  builder.add(
    "paint",
    "#e8762c",
    new ConeGeometry(0.035, 0.18, 6).rotateX(Math.PI / 2),
    {
      at: [guard.x, 1.15, guard.z + 0.25],
    },
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [guard.x + side * 0.06, 1.2, guard.z + 0.16],
      [1, 1, 1],
      4,
    );
  });
  builder.bar(
    "matte",
    palette.darkTimber,
    [guard.x + 0.25, 0.8, guard.z],
    [guard.x + 0.4, 1.7, guard.z],
    0.04,
    5,
  );
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const starAt: Triple = [spire.x, spire.height + 1.45, spire.z];

/** A snowflake star on the spire that spins as you come near. */
const buildStar = (builder: AttractionBuilder) => {
  builder.add("glow", "#d7fff2", new OctahedronGeometry(0.22, 0), {});
  for (let arm = 0; arm < 6; arm++) {
    const angle = (arm / 6) * Math.PI * 2;
    const end: Triple = [Math.sin(angle) * 0.6, Math.cos(angle) * 0.6, 0];
    builder.bar("glass", paleIce, [0, 0, 0], end, 0.07, 5);
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        const twig = angle + side * 0.6;
        builder.bar(
          "glass",
          paleIce,
          [end[0] * 0.6, end[1] * 0.6, 0],
          [
            end[0] * 0.6 + Math.sin(twig) * 0.18,
            end[1] * 0.6 + Math.cos(twig) * 0.18,
            0,
          ],
          0.05,
          4,
        );
      });
      builder.sphere("glow", aurora, 0.06, end, [1, 1, 1], 6);
    }
  }
};

const lanternAt = (side: number): Triple => [
  side * (gateHalf + 0.15),
  1.75,
  yard.frontZ + 0.45,
];

/** A glowing lantern on each gate pillar, lit as you walk up. */
const buildLantern = (builder: AttractionBuilder) => {
  builder.box("glow", "#bdf7ff", [0.22, 0.28, 0.22], [0, 0, 0]);
  builder.cylinder("metal", silver, {
    radius: 0.17,
    radiusEnd: 0.03,
    length: 0.16,
    at: [0, 0.22, 0],
    segments: 8,
  });
  builder.box("metal", silver, [0.26, 0.04, 0.26], [0, -0.16, 0]);
};

const bannerAt: Triple = [yard.minX, tower.height + 2.0, yard.frontZ];

/** A royal pennant on a tower, which flutters as you come near. */
const buildBanner = (builder: AttractionBuilder) => {
  builder.cylinder("metal", silver, {
    radius: 0.025,
    length: 1.0,
    at: [0, 0.5, 0],
    segments: 6,
  });
  builder.add(
    "matte",
    royal,
    new ConeGeometry(0.2, 0.9, 3).rotateZ(-Math.PI / 2),
    {
      at: [0.45, 0.8, 0],
      scale: [1, 1, 0.12],
    },
  );
  builder.add(
    "matte",
    aurora,
    new ConeGeometry(0.1, 0.4, 3).rotateZ(-Math.PI / 2),
    {
      at: [0.3, 0.8, 0.012],
      scale: [1, 1, 0.12],
    },
  );
};

const moving: MovingPart[] = [
  {
    name: "snowflake star",
    pivot: starAt,
    build: buildStar,
    motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 3, reach: 8 },
  },
  ...[-1, 1].map((side): MovingPart => ({
    name: side < 0 ? "left gate lantern" : "right gate lantern",
    pivot: lanternAt(side),
    build: buildLantern,
    motion: { kind: "wake", reach: 5 },
  })),
  {
    name: "royal pennant",
    pivot: bannerAt,
    build: buildBanner,
    motion: { kind: "nod", axis: "y", reach: 8, amplitude: 0.5, period: 1.4 },
  },
];

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

const buildChild =
  (coat: string, hat: string) =>
  (builder: AttractionBuilder): void => {
    [-0.07, 0.07].forEach((side) => {
      if (!builder.isFar) {
        builder.box("metal", silver, [0.02, 0.03, 0.22], [side, 0.015, 0.02]);
      }
      builder.box("matte", frostWhite, [0.08, 0.12, 0.16], [side, 0.09, 0.02]);
      builder.cylinder("matte", "#2b3442", {
        radius: 0.045,
        length: 0.28,
        at: [side, 0.29, 0],
        segments: 6,
      });
    });
    builder.lathe(
      "matte",
      coat,
      [
        [0, 0.4],
        [0.14, 0.42],
        [0.14, 0.56],
        [0.12, 0.67],
        [0.06, 0.73],
        [0, 0.73],
      ],
      [0, 0, 0],
      "y",
      8,
    );
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        coat,
        [side * 0.11, 0.67, 0],
        [side * 0.34, 0.55, 0.04],
        0.06,
        5,
      );
      if (!builder.isFar) {
        builder.sphere(
          "matte",
          hat,
          0.035,
          [side * 0.35, 0.545, 0.04],
          [1, 1, 1],
          6,
        );
      }
    });
    builder.torus("matte", hat, 0.07, 0.03, [0, 0.74, 0], "y", 8);
    builder.sphere("matte", "#f0c8a8", 0.1, [0, 0.84, 0], [1, 1, 1], 9);
    builder.lathe(
      "matte",
      hat,
      [
        [0, 0.96],
        [0.07, 0.94],
        [0.105, 0.87],
        [0.108, 0.85],
      ],
      [0, 0, 0],
      "y",
      8,
    );
    if (!builder.isFar) {
      builder.sphere("matte", frostWhite, 0.04, [0, 0.98, 0], [1, 1, 1], 6);
    }
  };

/** An arctic fox, white for winter, with a big bushy tail. */
const buildFox = (builder: AttractionBuilder) => {
  builder.sphere("matte", frostWhite, 0.16, [0, 0.2, 0], [0.8, 0.75, 1.4], 9);
  builder.sphere("matte", frostWhite, 0.1, [0, 0.3, 0.22], [1, 0.9, 1], 9);
  builder.add(
    "matte",
    frostWhite,
    new ConeGeometry(0.05, 0.12, 6).rotateX(Math.PI / 2),
    {
      at: [0, 0.28, 0.33],
    },
  );
  builder.sphere("paint", palette.black, 0.018, [0, 0.29, 0.39], [1, 1, 1], 4);
  builder.sphere("matte", snowShadow, 0.1, [0, 0.22, -0.3], [0.8, 0.8, 2], 8);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.add("matte", frostWhite, new ConeGeometry(0.04, 0.09, 4), {
      at: [side * 0.05, 0.42, 0.2],
    });
    builder.sphere(
      "paint",
      palette.black,
      0.014,
      [side * 0.045, 0.33, 0.3],
      [1, 1, 1],
      4,
    );
    [-0.12, 0.12].forEach((z) => {
      builder.cylinder("matte", frostWhite, {
        radius: 0.03,
        length: 0.14,
        at: [side * 0.06, 0.07, z],
        segments: 5,
      });
    });
  });
};

const wanderers: Wanderers[] = [
  {
    name: "children sliding on the ice",
    build: buildChild("#5b3fa8", "#6ff0c0"),
    count: 2,
    centre: { x: 0.4, z: -0.2 },
    radius: 1.6,
    speed: 0.9,
    height: iceFloor,
  },
  {
    name: "arctic foxes",
    build: buildFox,
    count: 2,
    centre: { x: -4.6, z: 4.4 },
    radius: 1.1,
    speed: 0.6,
    bob: 0.05,
  },
];

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

const build = (builder: AttractionBuilder) => {
  buildWalls(builder);
  buildGate(builder);
  buildKeep(builder);
  buildCourtyard(builder);
  buildSlide(builder);
  buildGrounds(builder);
  addSignBoard(builder, signAt, signColour);
};

const blockers: LocalBlocker[] = [
  ...firs.map(([x, z, size]) => ({ x, z, radius: 0.35 * size })),
  ...listWallBlockers(
    { x: keep.halfWidth, z: keep.frontZ - 0.3 },
    { x: -keep.halfWidth, z: keep.frontZ - 0.3 },
    0.3,
    0.5,
  ),
];

export const icePalaceModel: NewLandAttractionModel = {
  kind: "ice-palace",
  islandId: "frost-isle",
  name: "Ice Palace",
  fact: "Every winter in Sweden, builders cut huge blocks of ice from a frozen river to build a real ice hotel, with ice beds, ice chairs and even ice glasses. Ice is hard, strong and see-through, so it makes a beautiful building material, but only where it stays cold. In spring the whole hotel melts and flows back into the river.",
  curriculumLink:
    "Science, Year 2: identify and compare the suitability of a variety of everyday materials for particular uses, including how ice melts when it warms.",
  footprint: 9,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 0.8 },
  build,
  moving,
  wanderers,
  decks: [buildFlatDeck(yardFloor, iceFloor, "ice")],
  rides: [
    {
      id: "ice-slide",
      name: "the ice slide",
      start: slideStart,
      reach: 0.7,
      seconds: 6,
      finish: slideFinish,
      follow: slideRide,
    },
  ],
  blockers,
  tune: [76, 79, 83, 88, 83, 88],
  play: {
    label: "Ring the ice bells",
    news: "Tinkle, tinkle! The ice bells rang out across the courtyard, and the snowflake star on the spire twinkled with northern lights.",
    tune: [88, 84, 81, 76, 81, 84, 88],
  },
};
