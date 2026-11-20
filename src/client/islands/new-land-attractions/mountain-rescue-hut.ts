import {
  BoxGeometry,
  ExtrudeGeometry,
  RingGeometry,
  Shape,
  Vector2,
} from "three";
import {
  addBench,
  addDoor,
  addLampPost,
  addSignBoard,
  addWindow,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef3f6";
const snowShadow = "#d6e1ea";
const faluRed = "#9e2b25";
const trim = "#f2efe6";
const roofGrey = "#3b4148";
const pine = "#2d5a40";
const rescueOrange = "#ee6a1f";
const rescueYellow = "#f2c230";
const crossGreen = "#2f9a57";
const towerTimber = "#7a5232";
const signColour = "#c4461f";

/* The hut stands at the back, its porch towards the visitors (+z) */
const hut = { x: -1.6, z: -3.2, width: 5.2, depth: 3.0, wall: 2.0 };
const plinth = 0.2;
const hutFront = hut.z + hut.depth / 2;
const porch = { minX: -4.0, maxX: -1.2, minZ: hutFront, maxZ: hutFront + 1.3 };
const porchHeight = 0.24;

/* The lookout tower on the right, its ladder facing the front */
const tower = { x: 4.4, z: -2.8, half: 0.75, height: 3.2 };
const ladderZ = tower.z + tower.half + 0.12;
const beaconAt: Triple = [tower.x, tower.height + 1.55, tower.z];

/* The helipad and its helicopter at the front right */
const pad = { x: 3.3, z: 2.9, radius: 1.85 };
const rotorAt: Triple = [pad.x, 2.05, pad.z];
const sockAt: Triple = [pad.x + 2.25, 2.4, pad.z + 1.3];

/* The rescue bell on its frame, front left */
const bellFrame = { x: -4.9, z: 1.6 };
const bellAt: Triple = [bellFrame.x, 1.95, bellFrame.z];

const signAt: Triple = [-1.3, 0, 6.1];
const rideStart = { x: tower.x, z: ladderZ + 0.85 };
const rideFinish = { x: tower.x - 1.7, z: ladderZ + 1.3 };

/* ------------------------------------------------------------------ */
/* Snowy pines and drifts                                              */
/* ------------------------------------------------------------------ */

const pines: [number, number, number][] = [
  [-6.6, -4.4, 1.15],
  [-4.6, -6.3, 1.3],
  [-0.4, -6.9, 1.0],
  [2.0, -6.4, 1.2],
  [6.6, -4.6, 1.05],
  [7.2, -1.2, 0.85],
  [-7.6, -1.2, 0.9],
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
  const tiers = builder.isFar ? 2 : 4;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (1.05 - share * 0.62) * size;
    const height = (1.3 - share * 0.3) * size;
    const base = (0.55 + share * 2.1) * size;
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
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      snowShadow,
      0.8 * size,
      [x, 0.02, z],
      [1, 0.2, 1],
      9,
    );
  }
};

/* ------------------------------------------------------------------ */
/* The hut                                                             */
/* ------------------------------------------------------------------ */

const buildHutWalls = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = hut;
  builder.box(
    "matte",
    palette.darkStone,
    [width + 0.16, plinth, depth + 0.16],
    [x, plinth / 2, z],
  );
  const planks = builder.isFar ? 1 : 12;
  builder.painted(
    new BoxGeometry(width, wall, depth, 1, planks, 1),
    (centre) =>
      Math.floor((centre.y - plinth) / (wall / planks)) % 2 === 0
        ? faluRed
        : shade(faluRed, 0.88),
    { at: [x, plinth + wall / 2, z] },
    "matte",
    undefined,
  );
  /* The gable ends, and the roof with its snow */
  const eaves = plinth + wall;
  const rise = 1.35;
  const gable = new Shape([
    new Vector2(-depth / 2, 0),
    new Vector2(depth / 2, 0),
    new Vector2(0, rise),
  ]);
  builder.add(
    "matte",
    shade(faluRed, 0.9),
    new ExtrudeGeometry(gable, { depth: width, bevelEnabled: false }),
    { at: [x - width / 2, eaves, z], rotation: [0, Math.PI / 2, 0] },
  );
  const overhang = 0.35;
  const halfSpan = depth / 2 + overhang;
  const slope = Math.hypot(halfSpan, rise * (halfSpan / (depth / 2)));
  const angle = Math.atan2(rise, depth / 2);
  [1, -1].forEach((side) => {
    const slabZ = z + (side * halfSpan) / 2;
    const slabY = eaves + rise / 2 + 0.02;
    builder.box(
      "matte",
      roofGrey,
      [width + overhang * 2, 0.1, slope],
      [x, slabY, slabZ],
      [side * angle, 0, 0],
    );
    builder.box(
      "matte",
      snow,
      [width + overhang * 2 - 0.1, 0.1, slope - 0.12],
      [x, slabY + 0.09, slabZ + side * 0.02],
      [side * angle, 0, 0],
    );
    if (!builder.isFar) {
      /* Icicles hanging from the eaves */
      for (let index = 0; index < 9; index++) {
        const along = x - width / 2 + 0.2 + index * ((width - 0.4) / 8);
        builder.cylinder("glass", "#cfeaf7", {
          radius: 0.035,
          radiusEnd: 0.002,
          length: 0.18 + (index % 3) * 0.08,
          at: [
            along,
            eaves - 0.12 - (index % 3) * 0.04,
            z + side * (halfSpan - 0.04),
          ],
          segments: 5,
        });
      }
    }
  });
  /* White corner boards and bargeboards */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        trim,
        [0.12, wall, 0.12],
        [x + sideX * (width / 2), plinth + wall / 2, z + sideZ * (depth / 2)],
      );
    });
    if (!builder.isFar) {
      [1, -1].forEach((side) => {
        builder.box(
          "paint",
          trim,
          [0.06, 0.16, slope],
          [
            x + sideX * (width / 2 + overhang - 0.02),
            eaves + rise / 2 - 0.04,
            z + (side * halfSpan) / 2,
          ],
          [side * angle, 0, 0],
        );
      });
    }
  });
  builder.box(
    "paint",
    trim,
    [width + 0.1, 0.1, 0.06],
    [x, eaves, hutFront + 0.04],
  );
};

const buildHutFront = (builder: AttractionBuilder) => {
  const front = hutFront + 0.01;
  /* The garage for the rescue sledges, on the right */
  const garageX = hut.x + 1.3;
  builder.box("paint", trim, [1.9, 1.7, 0.08], [garageX, plinth + 0.85, front]);
  const slats = builder.isFar ? 1 : 7;
  builder.painted(
    new BoxGeometry(1.7, 1.55, 0.06, 1, slats, 1),
    (centre) =>
      Math.floor((centre.y + 0.775) / (1.55 / slats)) % 2 === 0
        ? rescueOrange
        : shade(rescueOrange, 0.86),
    { at: [garageX, plinth + 0.8, front + 0.05] },
    "paint",
    undefined,
  );
  builder.box(
    "paint",
    trim,
    [1.7, 0.16, 0.03],
    [garageX, plinth + 0.95, front + 0.09],
  );
  /* The first-aid sign above it */
  builder.roundedBox("paint", trim, [0.7, 0.7, 0.08], 0.06, [
    garageX,
    plinth + 2.25,
    front + 0.04,
  ]);
  builder.box(
    "paint",
    crossGreen,
    [0.46, 0.14, 0.03],
    [garageX, plinth + 2.25, front + 0.1],
  );
  builder.box(
    "paint",
    crossGreen,
    [0.14, 0.46, 0.03],
    [garageX, plinth + 2.25, front + 0.1],
  );
  /* The door and windows on the left */
  addDoor(builder, {
    at: [hut.x - 0.55, porchHeight, front],
    colour: "#2f4a5f",
    frame: trim,
    height: 1.25,
    width: 0.7,
  });
  addWindow(builder, {
    at: [hut.x - 1.75, plinth + 1.2, front + 0.01],
    width: 0.8,
    height: 0.7,
    frame: trim,
    isLit: true,
  });
  /* Windows down the sides */
  [-1, 1].forEach((side) => {
    addWindow(builder, {
      at: [hut.x + side * (hut.width / 2 + 0.01), plinth + 1.2, hut.z],
      width: 0.7,
      height: 0.6,
      frame: trim,
      turn: (side * Math.PI) / 2,
      isLit: side < 0,
    });
  });
  /* A round gable window */
  builder.cylinder("paint", trim, {
    radius: 0.3,
    length: 0.08,
    at: [hut.x, plinth + hut.wall + 0.55, front - 0.02],
    axis: "z",
    segments: 16,
  });
  builder.cylinder("glow", palette.warmLight, {
    radius: 0.23,
    length: 0.1,
    at: [hut.x, plinth + hut.wall + 0.55, front - 0.02],
    axis: "z",
    segments: 16,
  });
  /* The chimney */
  const chimneyX = hut.x - 1.6;
  builder.box(
    "matte",
    palette.stone,
    [0.4, 1.2, 0.4],
    [chimneyX, plinth + hut.wall + 1.0, hut.z - 0.5],
  );
  builder.box(
    "matte",
    snow,
    [0.48, 0.08, 0.48],
    [chimneyX, plinth + hut.wall + 1.64, hut.z - 0.5],
  );
};

const buildPorch = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = porch;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const boards = builder.isFar ? 1 : 9;
  builder.painted(
    new BoxGeometry(width, porchHeight, depth, boards, 1, 1),
    (centre) =>
      Math.floor((centre.x - minX) / (width / boards)) % 2 === 0
        ? palette.paleTimber
        : shade(palette.paleTimber, 0.9),
    { at: [(minX + maxX) / 2, porchHeight / 2, (minZ + maxZ) / 2] },
    "matte",
    undefined,
  );
  /* Posts holding a little canopy over the door */
  const canopyY = plinth + 1.75;
  [minX + 0.12, maxX - 0.12].forEach((postX) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.12, canopyY - porchHeight, 0.12],
      [postX, (canopyY + porchHeight) / 2, maxZ - 0.12],
    );
  });
  builder.box(
    "matte",
    roofGrey,
    [width + 0.3, 0.08, depth + 0.2],
    [(minX + maxX) / 2, canopyY + 0.14, (minZ + maxZ) / 2],
    [0.18, 0, 0],
  );
  builder.box(
    "matte",
    snow,
    [width + 0.2, 0.08, depth + 0.1],
    [(minX + maxX) / 2, canopyY + 0.22, (minZ + maxZ) / 2 - 0.02],
    [0.18, 0, 0],
  );
  if (builder.isFar) {
    return;
  }
  /* Kit on the porch: skis, a rope coil, a first-aid box and a lantern */
  [-3.85, -3.7, -3.55, -3.4].forEach((skiX, index) => {
    builder.box(
      "paint",
      index % 2 === 0 ? rescueYellow : rescueOrange,
      [0.07, 1.5, 0.03],
      [skiX, porchHeight + 0.75, minZ + 0.1],
      [-0.12, 0, 0],
    );
  });
  builder.torus(
    "matte",
    "#d9483b",
    0.2,
    0.05,
    [-3.0, porchHeight + 0.9, minZ + 0.06],
    "z",
    12,
  );
  builder.torus(
    "matte",
    "#d9483b",
    0.15,
    0.05,
    [-3.0, porchHeight + 0.9, minZ + 0.1],
    "z",
    12,
  );
  builder.box(
    "paint",
    crossGreen,
    [0.42, 0.3, 0.3],
    [-1.55, porchHeight + 0.15, minZ + 0.3],
  );
  builder.box(
    "paint",
    trim,
    [0.24, 0.07, 0.02],
    [-1.55, porchHeight + 0.17, minZ + 0.46],
  );
  builder.box(
    "paint",
    trim,
    [0.07, 0.2, 0.02],
    [-1.55, porchHeight + 0.17, minZ + 0.46],
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.14, 0.2, 0.14],
    [maxX - 0.12, canopyY - 0.2, maxZ - 0.12],
  );
};

/* The rescue sledge, a stretcher on runners, ready by the garage */
const buildRescueSledge = (builder: AttractionBuilder) => {
  const x = hut.x + 1.3;
  const z = porch.maxZ + 0.75;
  builder.roundedBox("paint", rescueOrange, [0.7, 0.18, 1.9], 0.08, [
    x,
    0.24,
    z,
  ]);
  builder.box("matte", "#2c3e50", [0.56, 0.06, 1.6], [x, 0.33, z]);
  [-0.32, 0.32].forEach((side) => {
    builder.box("metal", palette.steel, [0.05, 0.05, 2.1], [x + side, 0.05, z]);
    builder.bar(
      "metal",
      palette.steel,
      [x + side, 0.05, z + 1.05],
      [x + side, 0.2, z + 1.2],
      0.05,
      6,
    );
  });
  if (!builder.isFar) {
    [-0.5, 0.2].forEach((along) => {
      builder.box(
        "matte",
        rescueYellow,
        [0.72, 0.04, 0.08],
        [x, 0.37, z + along],
      );
    });
    builder.sphere(
      "matte",
      "#c33b31",
      0.12,
      [x, 0.38, z - 0.62],
      [1.4, 0.6, 1],
    );
  }
};

/* ------------------------------------------------------------------ */
/* The lookout tower                                                   */
/* ------------------------------------------------------------------ */

const buildTower = (builder: AttractionBuilder) => {
  const { x, z, half, height } = tower;
  const legs: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  legs.forEach(([sideX, sideZ]) => {
    builder.bar(
      "matte",
      towerTimber,
      [x + sideX * (half + 0.12), 0, z + sideZ * (half + 0.12)],
      [x + sideX * half, height, z + sideZ * half],
      0.16,
      6,
    );
    builder.box(
      "matte",
      palette.darkStone,
      [0.34, 0.14, 0.34],
      [x + sideX * (half + 0.12), 0.07, z + sideZ * (half + 0.12)],
    );
  });
  /* Cross braces on the sides and back, leaving the front for the ladder */
  [1.1, 2.2].forEach((level) => {
    [
      [-1, -1, 1, -1],
      [-1, -1, -1, 1],
      [1, -1, 1, 1],
    ].forEach(([ax, az, bx, bz]) => {
      builder.bar(
        "matte",
        shade(towerTimber, 0.85),
        [x + ax * half, level - 0.5, z + az * half],
        [x + bx * half, level + 0.5, z + bz * half],
        0.07,
        5,
      );
    });
  });
  /* The platform, its railing and roof */
  builder.box(
    "matte",
    palette.paleTimber,
    [half * 2 + 0.5, 0.14, half * 2 + 0.5],
    [x, height, z],
  );
  const rail = half + 0.22;
  [
    [-1, -1, 1, -1],
    [-1, -1, -1, 1],
    [1, -1, 1, 1],
    [-1, 1, -0.3, 1],
    [0.3, 1, 1, 1],
  ].forEach(([ax, az, bx, bz]) => {
    builder.bar(
      "paint",
      trim,
      [x + ax * rail, height + 0.85, z + az * rail],
      [x + bx * rail, height + 0.85, z + bz * rail],
      0.06,
      5,
    );
  });
  legs.forEach(([sideX, sideZ]) => {
    builder.box(
      "matte",
      towerTimber,
      [0.1, 1.45, 0.1],
      [x + sideX * rail, height + 0.72, z + sideZ * rail],
    );
  });
  builder.lathe(
    "matte",
    faluRed,
    [
      [0, height + 2.05],
      [rail + 0.35, height + 1.4],
      [rail + 0.35, height + 1.32],
      [0, height + 1.32],
    ],
    [x, 0, z],
    "y",
    4,
  );
  builder.lathe(
    "matte",
    snow,
    [
      [0, height + 2.12],
      [rail + 0.1, height + 1.52],
      [0, height + 1.52],
    ],
    [x, 0, z],
    "y",
    4,
  );
  /* The ladder up the front */
  [-0.28, 0.28].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, height + 0.9, 0.07],
      [x + side, (height + 0.9) / 2, ladderZ],
    );
  });
  const rungs = builder.isFar ? 4 : 11;
  for (let rung = 1; rung <= rungs; rung++) {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.56, 0.05, 0.06],
      [x, (rung / (rungs + 1)) * (height + 0.4), ladderZ],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* A telescope and a radio aerial up top */
  builder.cylinder("metal", palette.brass, {
    radius: 0.05,
    radiusEnd: 0.08,
    length: 0.55,
    at: [x + 0.45, height + 1.05, z + 0.55],
    axis: "z",
    segments: 10,
  });
  builder.bar(
    "metal",
    palette.darkSteel,
    [x + 0.45, height + 0.07, z + 0.5],
    [x + 0.45, height + 1.02, z + 0.55],
    0.04,
    5,
  );
  builder.bar(
    "metal",
    palette.steel,
    [x - rail, height + 1.4, z - rail],
    [x - rail, height + 2.9, z - rail],
    0.03,
    4,
  );
};

/* The beacon on the tower roof, which lights up as the Character comes */
const buildBeacon = (builder: AttractionBuilder) => {
  builder.sphere("glow", "#ffb43a", 0.2, [0, 0.12, 0], [1, 1.2, 1], 12);
  builder.cylinder("glow", "#ffe1a0", {
    radius: 0.08,
    length: 0.5,
    at: [0, 0.12, 0],
    segments: 8,
  });
};

/* ------------------------------------------------------------------ */
/* The helipad and helicopter                                          */
/* ------------------------------------------------------------------ */

const buildHelipad = (builder: AttractionBuilder) => {
  const { x, z, radius } = pad;
  builder.cylinder("matte", "#4a5058", {
    radius,
    length: 0.06,
    at: [x, 0.03, z],
    segments: builder.segments(32, 14),
  });
  builder.add(
    "paint",
    rescueYellow,
    new RingGeometry(radius - 0.22, radius - 0.1, builder.segments(32, 14)),
    { at: [x, 0.065, z], rotation: [-Math.PI / 2, 0, 0] },
  );
  [-0.42, 0.42].forEach((side) => {
    builder.box("paint", trim, [0.16, 0.01, 1.3], [x + side, 0.065, z]);
  });
  builder.box("paint", trim, [0.7, 0.01, 0.16], [x, 0.065, z]);
  if (builder.isFar) {
    return;
  }
  for (let light = 0; light < 8; light++) {
    const angle = (light / 8) * Math.PI * 2;
    builder.sphere(
      "glow",
      light % 2 === 0 ? "#7fe39a" : palette.warmLight,
      0.06,
      [
        x + Math.sin(angle) * (radius + 0.05),
        0.08,
        z + Math.cos(angle) * (radius + 0.05),
      ],
      [1, 0.7, 1],
      6,
    );
  }
};

const buildHelicopter = (builder: AttractionBuilder) => {
  const { x, z } = pad;
  /* Nose towards the front left, tail out to the right */
  const nose = -1;
  builder.sphere(
    "paint",
    "#d5302a",
    0.62,
    [x, 1.0, z],
    [1.45, 0.95, 0.95],
    builder.isFar ? 10 : 18,
  );
  builder.sphere(
    "glass",
    "#9fd0ea",
    0.5,
    [x + nose * 0.42, 1.08, z],
    [1.05, 0.82, 0.9],
    builder.isFar ? 8 : 16,
  );
  builder.box("paint", trim, [1.6, 0.12, 1.2], [x + 0.05, 0.78, z]);
  /* The tail boom, its fin and little rotor */
  builder.cylinder("paint", "#d5302a", {
    radius: 0.2,
    radiusEnd: 0.09,
    length: 2.0,
    at: [x + 1.7, 1.15, z],
    axis: "x",
    segments: 12,
  });
  builder.box("paint", "#d5302a", [0.45, 0.6, 0.06], [x + 2.6, 1.4, z]);
  builder.box("paint", trim, [0.3, 0.06, 0.6], [x + 2.55, 1.15, z]);
  builder.box(
    "metal",
    palette.darkSteel,
    [0.05, 0.6, 0.06],
    [x + 2.6, 1.45, z + 0.08],
  );
  /* Skids */
  [-0.48, 0.48].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [x - 0.9, 0.12, z + side],
      [x + 0.8, 0.12, z + side],
      0.07,
      6,
    );
    [-0.45, 0.45].forEach((along) => {
      builder.bar(
        "metal",
        palette.darkSteel,
        [x + along, 0.12, z + side],
        [x + along, 0.62, z + side * 0.6],
        0.05,
        5,
      );
    });
  });
  /* The mast the rotor turns on */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.09,
    length: 0.42,
    at: [x, 1.8, z],
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  /* Rescue stripes and a winch over the door */
  builder.box("paint", rescueYellow, [0.9, 0.1, 1.205], [x + 0.25, 1.22, z]);
  builder.box("glass", "#9fd0ea", [0.45, 0.32, 1.21], [x + 0.3, 1.0, z]);
  builder.cylinder("metal", palette.steel, {
    radius: 0.08,
    length: 0.3,
    at: [x + 0.2, 1.5, z + 0.62],
    axis: "z",
    segments: 10,
  });
  builder.sphere("glow", "#ff5a4a", 0.05, [x + 2.85, 1.72, z], [1, 1, 1], 6);
};

/* The main rotor, which whirls faster as the Character comes near */
const buildRotor = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.16,
    length: 0.12,
    at: [0, 0, 0],
    segments: 12,
  });
  [0, Math.PI / 2].forEach((turn) => {
    builder.box(
      "paint",
      "#2a2f36",
      [3.6, 0.03, 0.16],
      [0, 0.05, 0],
      [0, turn, 0],
    );
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        builder.box(
          "paint",
          rescueYellow,
          [0.22, 0.035, 0.165],
          [Math.cos(turn) * side * 1.68, 0.05, -Math.sin(turn) * side * 1.68],
          [0, turn, 0],
        );
      });
    }
  });
};

const buildSockPole = (builder: AttractionBuilder) => {
  builder.cylinder("paint", trim, {
    radius: 0.05,
    length: sockAt[1],
    at: [sockAt[0], sockAt[1] / 2, sockAt[2]],
    segments: 8,
  });
  builder.cylinder("paint", rescueOrange, {
    radius: 0.06,
    length: 0.5,
    at: [sockAt[0], 0.55, sockAt[2]],
    segments: 8,
  });
};

/* The windsock, which swings in the mountain breeze */
const buildWindsock = (builder: AttractionBuilder) => {
  const stripes = builder.isFar ? 1 : 4;
  for (let stripe = 0; stripe < stripes; stripe++) {
    const length = 0.9 / stripes;
    const from = 0.16 + stripe * length;
    builder.cylinder("matte", stripe % 2 === 0 ? rescueOrange : trim, {
      radius: 0.16 - (from / 1.1) * 0.08,
      radiusEnd: 0.16 - ((from + length) / 1.1) * 0.08,
      length,
      at: [from + length / 2, -0.05, 0],
      axis: "x",
      segments: 10,
      isOpen: true,
    });
  }
  builder.torus("metal", palette.steel, 0.16, 0.015, [0.16, -0.05, 0], "x", 12);
};

/* ------------------------------------------------------------------ */
/* The rescue bell                                                     */
/* ------------------------------------------------------------------ */

const buildBellFrame = (builder: AttractionBuilder) => {
  const { x, z } = bellFrame;
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      towerTimber,
      [x + side * 0.65, 0, z - 0.3],
      [x + side * 0.42, 2.35, z],
      0.12,
      6,
    );
    builder.bar(
      "matte",
      towerTimber,
      [x + side * 0.65, 0, z + 0.3],
      [x + side * 0.42, 2.35, z],
      0.12,
      6,
    );
  });
  builder.box(
    "matte",
    shade(towerTimber, 0.85),
    [1.2, 0.14, 0.18],
    [x, 2.38, z],
  );
  builder.box("matte", faluRed, [1.4, 0.06, 0.6], [x, 2.6, z], [0, 0, 0]);
  builder.box("matte", snow, [1.36, 0.07, 0.56], [x, 2.66, z]);
  if (!builder.isFar) {
    builder.bar(
      "matte",
      "#c9a26a",
      [x + 0.3, 2.3, z + 0.05],
      [x + 0.3, 0.95, z + 0.1],
      0.03,
      4,
    );
    builder.sphere(
      "matte",
      "#c9a26a",
      0.05,
      [x + 0.3, 0.92, z + 0.1],
      [1, 1.4, 1],
      6,
    );
  }
};

const buildBell = (builder: AttractionBuilder) => {
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0.0, 0.0],
      [0.12, -0.02],
      [0.18, -0.12],
      [0.2, -0.3],
      [0.28, -0.46],
      [0.3, -0.5],
      [0.24, -0.5],
      [0.0, -0.44],
    ],
    [0, 0, 0],
    "y",
    builder.isFar ? 8 : 18,
  );
  builder.sphere("metal", palette.darkSteel, 0.06, [0, -0.5, 0], [1, 1, 1], 8);
  builder.torus("metal", palette.darkSteel, 0.06, 0.02, [0, 0.03, 0], "x", 8);
};

/* ------------------------------------------------------------------ */
/* Grounds                                                             */
/* ------------------------------------------------------------------ */

const buildGrounds = (builder: AttractionBuilder) => {
  /* A gritted path from the sign up to the porch */
  builder.box("matte", "#b9b2a6", [1.3, 0.025, 4.6], [-1.3, 0.012, 3.2]);
  builder.box(
    "matte",
    "#b9b2a6",
    [5.4, 0.025, 1.0],
    [1.4, 0.012, ladderZ + 1.0],
  );
  pines.forEach((tree) => {
    addPine(builder, tree);
  });
  addBench(builder, [-3.1, 0, 3.4], Math.PI / 2, faluRed);
  addLampPost(builder, [-0.2, 0, 5.4]);
  addLampPost(builder, [-2.4, 0, 1.0]);
  if (builder.isFar) {
    return;
  }
  [
    [-5.8, 4.0, 0.55],
    [0.9, 6.4, 0.4],
    [6.4, 2.6, 0.45],
    [-6.6, -3.0, 0.5],
    [1.5, -1.0, 0.35],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, 0, z], [1.6, 0.45, 1.1], 10);
  });
  /* A stack of logs for the stove */
  for (let row = 0; row < 3; row++) {
    for (let log = 0; log < 4 - row; log++) {
      builder.cylinder(
        "matte",
        log % 2 === 0 ? palette.timber : palette.paleTimber,
        {
          radius: 0.1,
          length: 0.9,
          at: [
            hut.x - hut.width / 2 - 0.45,
            0.1 + row * 0.18,
            hut.z - 0.6 + log * 0.2 + row * 0.1,
          ],
          axis: "x",
          segments: 8,
        },
      );
    }
  }
};

/* ------------------------------------------------------------------ */
/* St Bernard dogs                                                     */
/* ------------------------------------------------------------------ */

const dogWhite = "#f4ede2";
const dogBrown = "#9a5426";

const buildStBernard = (builder: AttractionBuilder) => {
  builder.sphere("matte", dogBrown, 0.26, [0, 0.46, 0], [0.85, 0.8, 1.55], 12);
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      dogWhite,
      0.2,
      [0, 0.4, 0.22],
      [0.95, 0.9, 1.1],
      10,
    );
  }
  [-0.12, 0.12].forEach((side) => {
    [-0.24, 0.24].forEach((along) => {
      builder.cylinder("matte", dogWhite, {
        radius: 0.06,
        radiusEnd: 0.055,
        length: 0.32,
        at: [side, 0.16, along],
        segments: 6,
      });
    });
  });
  builder.sphere("matte", dogBrown, 0.16, [0, 0.7, 0.42], [1, 0.95, 1], 10);
  if (builder.isFar) {
    return;
  }
  builder.sphere("matte", dogWhite, 0.1, [0, 0.64, 0.56], [1, 0.85, 1.1], 8);
  builder.sphere("matte", palette.black, 0.035, [0, 0.67, 0.66], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      shade(dogBrown, 0.7),
      0.08,
      [side * 0.14, 0.66, 0.4],
      [0.5, 1.4, 1],
      6,
    );
    builder.sphere(
      "matte",
      palette.black,
      0.022,
      [side * 0.06, 0.75, 0.55],
      [1, 1, 1],
      5,
    );
  });
  builder.bar("matte", dogBrown, [0, 0.55, -0.36], [0, 0.4, -0.58], 0.07, 5);
  /* The famous little barrel at its collar */
  builder.torus("paint", "#c8102e", 0.11, 0.025, [0, 0.58, 0.32], "x", 10);
  builder.cylinder("matte", palette.timber, {
    radius: 0.06,
    length: 0.18,
    at: [0, 0.46, 0.36],
    axis: "x",
    segments: 8,
  });
};

/* ------------------------------------------------------------------ */
/* The ride: up the lookout ladder and round the top                   */
/* ------------------------------------------------------------------ */

const lookoutClimb = (progress: number): LocalSpot => {
  const top = tower.height + 0.07;
  if (progress < 0.1) {
    const share = progress / 0.1;
    return {
      x: tower.x,
      y: 0,
      z: rideStart.z + (ladderZ + 0.3 - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.35) {
    const share = (progress - 0.1) / 0.25;
    return { x: tower.x, y: top * share, z: ladderZ + 0.3, heading: Math.PI };
  }
  if (progress < 0.65) {
    /* A look all round from the top */
    const share = (progress - 0.35) / 0.3;
    const angle = share * Math.PI * 2;
    return {
      x: tower.x + Math.sin(angle) * 0.42,
      y: top,
      z: tower.z + Math.cos(angle) * 0.42,
      heading: angle + Math.PI / 2,
    };
  }
  if (progress < 0.9) {
    const share = (progress - 0.65) / 0.25;
    return {
      x: tower.x,
      y: top * (1 - share),
      z: ladderZ + 0.3,
      heading: Math.PI,
    };
  }
  const share = (progress - 0.9) / 0.1;
  return {
    x: tower.x + (rideFinish.x - tower.x) * share,
    y: 0,
    z: ladderZ + 0.3 + (rideFinish.z - ladderZ - 0.3) * share,
    heading: -Math.PI / 2,
  };
};

const hutBlockers: LocalBlocker[] = [-2.0, -0.6, 0.8].map((offset) => ({
  x: hut.x + offset,
  z: hut.z,
  radius: 1.4,
}));

export const mountainRescueHutModel: NewLandAttractionModel = {
  kind: "mountain-rescue-hut",
  islandId: "frost-isle",
  name: "Mountain Rescue Hut",
  fact: "Mountain rescue teams help people who are lost or hurt in the snowy mountains. They wear bright orange and yellow so they are easy to spot against white snow, and warm, waterproof layers keep them dry and cosy. Some teams even have dogs that can sniff out people buried in the snow.",
  curriculumLink:
    "Science, Year 2: identify and compare the suitability of everyday materials for particular uses, such as warm, waterproof and brightly coloured clothes for the snowy mountains.",
  footprint: 9.5,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 1.0 },
  build: (builder) => {
    buildHutWalls(builder);
    buildHutFront(builder);
    buildPorch(builder);
    buildRescueSledge(builder);
    buildTower(builder);
    buildHelipad(builder);
    buildHelicopter(builder);
    buildSockPole(builder);
    buildBellFrame(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "helicopter rotor",
      pivot: rotorAt,
      build: buildRotor,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 12, reach: 5 },
    },
    {
      name: "rescue bell",
      pivot: bellAt,
      build: buildBell,
      motion: { kind: "nod", axis: "x", reach: 4, amplitude: 0.6, period: 0.9 },
    },
    {
      name: "lookout beacon",
      pivot: beaconAt,
      build: buildBeacon,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "windsock",
      pivot: sockAt,
      build: buildWindsock,
      motion: { kind: "swing", axis: "y", amplitude: 0.5, period: 4.5 },
    },
  ],
  wanderers: [
    {
      name: "St Bernard dogs",
      build: buildStBernard,
      count: 2,
      centre: { x: -2.4, z: 3.6 },
      radius: 1.3,
      speed: 0.5,
    },
  ],
  smoke: [
    {
      at: [hut.x - 1.6, plinth + hut.wall + 1.75, hut.z - 0.5],
      colour: "#d8dcdf",
      puffs: 6,
      size: 0.16,
      rise: 1.8,
      spread: 0.4,
    },
  ],
  blockers: [
    ...hutBlockers,
    { x: pad.x + 0.3, z: pad.z, radius: 0.85 },
    { x: pad.x + 1.9, z: pad.z, radius: 0.35 },
    { x: bellFrame.x, z: bellFrame.z, radius: 0.7 },
  ],
  decks: [
    buildFlatDeck(
      {
        minX: porch.minX,
        maxX: porch.maxX,
        minZ: porch.minZ,
        maxZ: porch.maxZ,
      },
      porchHeight,
    ),
  ],
  rides: [
    {
      id: "lookout-ladder",
      name: "the lookout tower ladder",
      start: rideStart,
      reach: 0.6,
      seconds: 10,
      finish: rideFinish,
      follow: lookoutClimb,
    },
  ],
  play: {
    label: "Ring the rescue bell",
    news: "Clang, clang! The rescue bell rang out over the snow, and the St Bernard dogs came bounding up, ready to help.",
  },
};
