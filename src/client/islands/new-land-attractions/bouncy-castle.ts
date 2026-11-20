import { ConeGeometry } from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  addTree,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addBunting,
  addFlowerClump,
  buildVillager,
  meadowColours,
} from "./village-fete-parts.js";

const red = "#d94a3a";
const yellow = "#f4c430";
const blue = "#3a7fd0";
const green = "#4fae4f";
const mesh = "#2a2d33";
const matBlue = "#2f5fa8";
const stripePink = "#e86a9a";
const signColour = "#d94a3a";

/* The castle: a quilted floor to bounce on, walls and four turrets */
const castle = { minX: -2.2, maxX: 2.2, minZ: -3.2, maxZ: 1.0 };
const floorTop = 0.45;
const wallTop = 1.95;
const turretRadius = 0.55;
const turretHeight = 2.7;
const turrets: { x: number; z: number }[] = [
  { x: castle.minX, z: castle.minZ },
  { x: castle.maxX, z: castle.minZ },
  { x: castle.minX, z: castle.maxZ },
  { x: castle.maxX, z: castle.maxZ },
];
const stepTop = 0.25;
const step = { minZ: castle.maxZ + 0.05, maxZ: castle.maxZ + 0.6 };
const castleEntry = { x: 0, z: 2.2 };
const castleExit = { x: -1.3, z: 2.9 };

/* The inflatable slide beside it */
const slideX = 4.7;
const slideHalf = 0.75;
const platformTop = 2.2;
const platform = { minZ: -4.0, maxZ: -3.0 };
const slopeFoot = 0.6;
const runOutEnd = 1.8;
const runOutTop = 0.35;
const stepsFoot = -5.2;
const slideStart = { x: slideX, z: -5.8 };
const slideFinish = { x: slideX, z: 2.7 };

const blowerAt: Triple = [-3.6, 0, -3.9];
const signAt = { x: -2.6, z: 7.6 };

/** A fat inflated tube lying from one point to another. */
const addBolster = (
  builder: AttractionBuilder,
  colour: string,
  from: Triple,
  to: Triple,
  thickness: number,
  isCapped = true,
) => {
  builder.bar("paint", colour, from, to, thickness, builder.isFar ? 6 : 10);
  if (!builder.isFar && isCapped) {
    [from, to].forEach((end) => {
      builder.sphere("paint", colour, thickness / 2, end, [1, 1, 1], 10);
    });
  }
};

const buildFloor = (builder: AttractionBuilder) => {
  const width = castle.maxX - castle.minX;
  const depth = castle.maxZ - castle.minZ;
  const middleZ = (castle.minZ + castle.maxZ) / 2;
  builder.box(
    "paint",
    blue,
    [width + 0.2, floorTop - 0.06, depth + 0.2],
    [0, (floorTop - 0.06) / 2, middleZ],
  );
  builder.box(
    "paint",
    red,
    [width, 0.06, depth],
    [0, floorTop - 0.03, middleZ],
  );
  if (!builder.isFar) {
    /* The quilted seams that make the floor so springy */
    for (let seam = 1; seam < 5; seam++) {
      builder.box(
        "paint",
        shade(red, 0.82),
        [0.05, 0.015, depth - 0.1],
        [castle.minX + (width / 5) * seam, floorTop + 0.005, middleZ],
      );
      builder.box(
        "paint",
        shade(red, 0.82),
        [width - 0.1, 0.015, 0.05],
        [0, floorTop + 0.005, castle.minZ + (depth / 5) * seam],
      );
    }
  }
  /* A soft step up at the front */
  builder.box(
    "paint",
    yellow,
    [width - 0.6, stepTop, step.maxZ - step.minZ],
    [0, stepTop / 2, (step.minZ + step.maxZ) / 2],
  );
  addBolster(
    builder,
    blue,
    [castle.minX + 0.5, stepTop, step.maxZ - 0.05],
    [castle.maxX - 0.5, stepTop, step.maxZ - 0.05],
    0.1,
  );
};

const buildWalls = (builder: AttractionBuilder) => {
  const wallHeight = wallTop - floorTop;
  const middleZ = (castle.minZ + castle.maxZ) / 2;
  /* The back wall, solid and bright, with a row of battlements */
  builder.box(
    "paint",
    yellow,
    [castle.maxX - castle.minX, wallHeight, 0.35],
    [0, floorTop + wallHeight / 2, castle.minZ],
  );
  addBolster(
    builder,
    blue,
    [castle.minX + 0.3, wallTop, castle.minZ],
    [castle.maxX - 0.3, wallTop, castle.minZ],
    0.36,
  );
  const merlons = builder.isFar ? 0 : 5;
  for (let merlon = 0; merlon < merlons; merlon++) {
    const x = castle.minX + 0.75 + merlon * 0.72;
    builder.cylinder("paint", merlon % 2 === 0 ? red : green, {
      radius: 0.17,
      length: 0.4,
      at: [x, wallTop + 0.3, castle.minZ],
      segments: 10,
    });
    builder.sphere(
      "paint",
      merlon % 2 === 0 ? red : green,
      0.17,
      [x, wallTop + 0.5, castle.minZ],
      [1, 0.6, 1],
      8,
    );
  }
  /* The sides: a bolster low down, see-through netting above */
  [castle.minX, castle.maxX].forEach((x) => {
    builder.box(
      "paint",
      yellow,
      [0.3, 0.5, castle.maxZ - castle.minZ],
      [x, floorTop + 0.25, middleZ],
    );
    addBolster(
      builder,
      blue,
      [x, wallTop, castle.minZ + 0.4],
      [x, wallTop, castle.maxZ - 0.4],
      0.3,
    );
    if (builder.isFar) {
      return;
    }
    const posts = 6;
    for (let post = 1; post < posts; post++) {
      const z = castle.minZ + ((castle.maxZ - castle.minZ) / posts) * post;
      builder.bar(
        "matte",
        mesh,
        [x, floorTop + 0.5, z],
        [x, wallTop, z],
        0.02,
        3,
      );
    }
    [0.85, 1.25, 1.65].forEach((height) => {
      builder.bar(
        "matte",
        mesh,
        [x, floorTop + height - 0.45, castle.minZ + 0.3],
        [x, floorTop + height - 0.45, castle.maxZ - 0.3],
        0.02,
        3,
      );
    });
  });
  /* A big rainbow arch across the front, high over the door */
  const archSteps = builder.isFar ? 4 : 10;
  const archHeight = turretHeight - 0.15;
  for (let piece = 0; piece < archSteps; piece++) {
    const from = (piece / archSteps) * Math.PI;
    const to = ((piece + 1) / archSteps) * Math.PI;
    const point = (angle: number): Triple => [
      Math.cos(angle) * (castle.maxX - turretRadius),
      archHeight + Math.sin(angle) * 0.7,
      castle.maxZ,
    ];
    builder.bar(
      "paint",
      [red, yellow, green, blue][piece % 4],
      point(from),
      point(to),
      0.32,
      builder.isFar ? 6 : 10,
    );
  }
};

const buildTurrets = (builder: AttractionBuilder) => {
  const far = builder.isFar;
  turrets.forEach(({ x, z }, index) => {
    const colour = index % 2 === 0 ? red : blue;
    builder.cylinder("paint", colour, {
      radius: turretRadius,
      length: turretHeight,
      at: [x, turretHeight / 2, z],
      segments: far ? 8 : 16,
    });
    if (!far) {
      [0.7, 1.6].forEach((height) => {
        builder.cylinder("paint", yellow, {
          radius: turretRadius + 0.03,
          length: 0.16,
          at: [x, height, z],
          segments: 16,
        });
      });
    }
    /* A rounded top with battlements, and a pennant on a pole */
    builder.cylinder("paint", yellow, {
      radius: turretRadius + 0.1,
      length: 0.3,
      at: [x, turretHeight + 0.15, z],
      segments: far ? 8 : 16,
    });
    builder.sphere(
      "paint",
      green,
      turretRadius * 0.95,
      [x, turretHeight + 0.3, z],
      [1, 0.9, 1],
      far ? 8 : 12,
    );
    if (far) {
      return;
    }
    for (let merlon = 0; merlon < 6; merlon++) {
      const angle = (merlon / 6) * Math.PI * 2;
      builder.box(
        "paint",
        yellow,
        [0.16, 0.18, 0.12],
        [
          x + Math.sin(angle) * (turretRadius + 0.05),
          turretHeight + 0.38,
          z + Math.cos(angle) * (turretRadius + 0.05),
        ],
        [0, angle, 0],
      );
    }
    builder.cylinder("metal", palette.steel, {
      radius: 0.02,
      length: 0.7,
      at: [x, turretHeight + 0.95, z],
      segments: 6,
    });
    builder.add(
      "paint",
      [yellow, red, blue, green][index],
      new ConeGeometry(0.14, 0.4, 3).rotateZ(-Math.PI / 2).scale(1, 1, 0.12),
      { at: [x + 0.2, turretHeight + 1.18, z] },
    );
    /* Guy ropes pegged into the grass */
    const outX = Math.sign(x) * 0.9;
    const outZ = z < 0 ? -0.9 : 0.9;
    builder.bar(
      "matte",
      palette.white,
      [x, turretHeight - 0.2, z],
      [x + outX, 0.02, z + outZ],
      0.015,
      3,
    );
    builder.cylinder("metal", palette.steel, {
      radius: 0.025,
      length: 0.12,
      at: [x + outX, 0.06, z + outZ],
      segments: 6,
    });
  });
  addBunting(
    builder,
    [castle.minX, turretHeight + 0.3, castle.maxZ + 0.3],
    [-5.5, 1.6, 3.8],
    [red, yellow, blue, green],
    0.3,
  );
};

const slopeHeight = (z: number): number => {
  if (z <= platform.maxZ) {
    return platformTop;
  }
  if (z >= slopeFoot) {
    return runOutTop;
  }
  const share = (z - platform.maxZ) / (slopeFoot - platform.maxZ);
  const eased = share < 0.5 ? 2 * share * share : 1 - 2 * (1 - share) ** 2;
  return platformTop - (platformTop - runOutTop) * eased;
};

const buildSlide = (builder: AttractionBuilder) => {
  const far = builder.isFar;
  /* The back tower, its platform and the steps up behind */
  builder.box(
    "paint",
    blue,
    [slideHalf * 2 + 0.3, platformTop, platform.maxZ - platform.minZ],
    [slideX, platformTop / 2, (platform.minZ + platform.maxZ) / 2],
  );
  const steps = 5;
  for (let stair = 0; stair < steps; stair++) {
    const top = (platformTop / (steps + 1)) * (stair + 1);
    const z0 = stepsFoot + ((platform.minZ - stepsFoot) / steps) * stair;
    const z1 = platform.minZ;
    builder.box(
      "paint",
      stair % 2 === 0 ? yellow : red,
      [slideHalf * 2 - 0.1, top, z1 - z0],
      [slideX, top / 2, (z0 + z1) / 2],
    );
  }
  [-1, 1].forEach((side) => {
    const x = slideX + side * (slideHalf + 0.15);
    /* Tall side bolsters, down the slope and up the steps */
    addBolster(
      builder,
      red,
      [x, platformTop + 0.9, platform.minZ],
      [x, platformTop + 0.9, platform.maxZ],
      0.32,
    );
    addBolster(
      builder,
      yellow,
      [x, 0.5, stepsFoot + 0.2],
      [x, platformTop + 0.7, platform.minZ],
      0.26,
    );
    builder.cylinder("paint", green, {
      radius: 0.3,
      length: platformTop + 1.5,
      at: [x, (platformTop + 1.5) / 2, platform.minZ],
      segments: far ? 8 : 14,
    });
    builder.sphere(
      "paint",
      yellow,
      0.32,
      [x, platformTop + 1.55, platform.minZ],
      [1, 1, 1],
      far ? 6 : 12,
    );
    const pieces = far ? 3 : 7;
    for (let piece = 0; piece < pieces; piece++) {
      const z0 = platform.maxZ + ((runOutEnd - platform.maxZ) / pieces) * piece;
      const z1 =
        platform.maxZ + ((runOutEnd - platform.maxZ) / pieces) * (piece + 1);
      addBolster(
        builder,
        red,
        [x, slopeHeight(z0) + 0.35, z0],
        [x, slopeHeight(z1) + 0.35, z1],
        0.34,
        piece === pieces - 1,
      );
    }
  });
  /* The slide bed, a stepped run of quilted panels */
  const pieces = far ? 4 : 12;
  for (let piece = 0; piece < pieces; piece++) {
    const z0 = platform.maxZ + ((runOutEnd - platform.maxZ) / pieces) * piece;
    const z1 =
      platform.maxZ + ((runOutEnd - platform.maxZ) / pieces) * (piece + 1);
    const y0 = slopeHeight(z0);
    const y1 = slopeHeight(z1);
    const length = Math.hypot(z1 - z0, y1 - y0);
    const angle = Math.atan2(y0 - y1, z1 - z0);
    builder.box(
      "paint",
      piece % 2 === 0 ? yellow : shade(yellow, 0.92),
      [slideHalf * 2, 0.12, length + 0.02],
      [slideX, (y0 + y1) / 2 - 0.06, (z0 + z1) / 2],
      [angle, 0, 0],
    );
    builder.box(
      "paint",
      blue,
      [slideHalf * 2, Math.max(0.1, (y0 + y1) / 2 - 0.12), length],
      [slideX, Math.max(0.05, ((y0 + y1) / 2 - 0.12) / 2), (z0 + z1) / 2],
    );
  }
  /* A rainbow hoop over the top of the slide */
  const hoop = far ? 4 : 8;
  for (let piece = 0; piece < hoop; piece++) {
    const point = (share: number): Triple => [
      slideX + Math.cos(share * Math.PI) * (slideHalf + 0.15),
      platformTop + 1.6 + Math.sin(share * Math.PI) * 0.55,
      platform.minZ,
    ];
    builder.bar(
      "paint",
      [red, yellow, green, blue][piece % 4],
      point(piece / hoop),
      point((piece + 1) / hoop),
      0.24,
      far ? 6 : 10,
    );
  }
};

const buildBlowerHousing = (builder: AttractionBuilder) => {
  const [x, , z] = blowerAt;
  /* The blower's round housing and the long tube puffing air in */
  builder.cylinder("paint", "#d24a2a", {
    radius: 0.42,
    length: 0.36,
    at: [x, 0.5, z],
    axis: "x",
    segments: 16,
  });
  builder.box("paint", palette.darkSteel, [0.3, 0.1, 0.7], [x, 0.05, z]);
  builder.bar(
    "paint",
    palette.darkSteel,
    [x, 0.1, z - 0.25],
    [x, 0.3, z - 0.15],
    0.06,
    6,
  );
  builder.bar(
    "paint",
    palette.darkSteel,
    [x, 0.1, z + 0.25],
    [x, 0.3, z + 0.15],
    0.06,
    6,
  );
  const tube: Triple[] = [
    [x + 0.2, 0.5, z],
    [x + 0.9, 0.35, z + 0.1],
    [castle.minX + 0.2, 0.3, castle.minZ - 0.15],
  ];
  for (let piece = 0; piece < tube.length - 1; piece++) {
    builder.bar("paint", red, tube[piece], tube[piece + 1], 0.32, 10);
  }
  if (!builder.isFar) {
    /* Its cable to a weatherproof plug box on a post */
    builder.bar(
      "matte",
      palette.black,
      [x - 0.2, 0.3, z],
      [x - 0.9, 0.02, z + 0.8],
      0.02,
      3,
    );
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.05,
      length: 0.8,
      at: [x - 0.9, 0.4, z + 0.85],
      segments: 6,
    });
    builder.box(
      "paint",
      "#f0c020",
      [0.2, 0.24, 0.12],
      [x - 0.9, 0.7, z + 0.92],
    );
  }
};

/** The fan inside the blower, which whirrs faster as you come near. */
const buildFan = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.steel, {
    radius: 0.08,
    length: 0.08,
    at: [0, 0, 0],
    axis: "x",
    segments: 10,
  });
  for (let blade = 0; blade < 5; blade++) {
    const angle = (blade / 5) * Math.PI * 2;
    builder.box(
      "metal",
      palette.steel,
      [0.02, 0.3, 0.1],
      [0, Math.cos(angle) * 0.18, Math.sin(angle) * 0.18],
      [angle, 0, 0.3],
    );
  }
  builder.torus("metal", palette.darkSteel, 0.36, 0.02, [0.02, 0, 0], "x", 18);
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [0.03, side * 0.36, 0],
      [0.03, -side * 0.36, 0],
      0.015,
      3,
    );
    builder.bar(
      "metal",
      palette.darkSteel,
      [0.03, 0, side * 0.36],
      [0.03, 0, -side * 0.36],
      0.015,
      3,
    );
  });
};

/** A smiling inflatable dragon on top of the back wall, who nods hello. */
const buildDragon = (builder: AttractionBuilder) => {
  const far = builder.isFar;
  builder.bar("paint", green, [0, 0, 0], [0, 0.8, 0.15], 0.34, far ? 6 : 12);
  builder.sphere(
    "paint",
    green,
    0.32,
    [0, 0.95, 0.25],
    [1, 0.9, 1.2],
    far ? 8 : 14,
  );
  builder.sphere(
    "paint",
    shade(green, 1.2),
    0.2,
    [0, 0.86, 0.55],
    [1.1, 0.75, 1],
    far ? 6 : 12,
  );
  if (far) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.09,
      [side * 0.14, 1.08, 0.48],
      [1, 1, 1],
      10,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.045,
      [side * 0.14, 1.09, 0.56],
      [1, 1, 1],
      8,
    );
    builder.sphere(
      "paint",
      shade(green, 0.7),
      0.035,
      [side * 0.07, 0.9, 0.73],
      [1, 1, 1],
      6,
    );
    builder.add("paint", yellow, new ConeGeometry(0.07, 0.25, 8), {
      at: [side * 0.18, 1.3, 0.2],
      rotation: [0, 0, -side * 0.3],
    });
  });
  [0, 1, 2].forEach((spike) => {
    builder.add("paint", red, new ConeGeometry(0.08, 0.18, 6), {
      at: [0, 1.22 - spike * 0.25, 0.05 - spike * 0.08],
      rotation: [-0.5, 0, 0],
    });
  });
  builder.box("paint", "#b8283a", [0.2, 0.03, 0.04], [0, 0.78, 0.7]);
};

/** A grown-up's shoes off, and a little rack for everyone's shoes. */
const buildShoeRack = (builder: AttractionBuilder) => {
  const at = { x: 1.8, z: 3.3 };
  addBench(builder, [at.x, 0, at.z], Math.PI, palette.paleTimber);
  if (builder.isFar) {
    return;
  }
  const shoeColours = [red, blue, "#f2f2f2", stripePink, yellow, green];
  shoeColours.forEach((colour, index) => {
    const x = at.x - 0.5 + index * 0.2;
    [-0.035, 0.035].forEach((dx) => {
      builder.box(
        "paint",
        colour,
        [0.06, 0.05, 0.14],
        [x + dx, 0.03, at.z + 0.45],
      );
    });
  });
  /* "Shoes off!" sign */
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.04,
    length: 1.1,
    at: [at.x + 0.9, 0.55, at.z],
    segments: 6,
  });
  builder.box(
    "paint",
    palette.white,
    [0.5, 0.36, 0.04],
    [at.x + 0.9, 1.15, at.z + 0.03],
  );
  builder.box(
    "paint",
    red,
    [0.12, 0.06, 0.02],
    [at.x + 0.8, 1.15, at.z + 0.06],
  );
  builder.box(
    "paint",
    red,
    [0.12, 0.06, 0.02],
    [at.x + 1.0, 1.15, at.z + 0.06],
  );
};

/** A striped deckchair facing +z. */
const addDeckchair = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  colour: string,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  [-0.27, 0.27].forEach((side) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.04, 0.04, 0.9],
      place(side, 0.4, -0.05),
      [0.75, turn, 0],
    );
    builder.box(
      "matte",
      palette.paleTimber,
      [0.04, 0.04, 0.6],
      place(side, 0.25, 0.2),
      [-0.5, turn, 0],
    );
  });
  const stripes = builder.isFar ? 1 : 5;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? colour : palette.white,
      [0.5 / stripes, 0.02, 0.8],
      place(-0.25 + (0.5 / stripes) * (stripe + 0.5), 0.38, -0.08),
      [0.85, turn, 0],
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A soft blue mat all along the front, and a path to the sign */
  builder.box("matte", matBlue, [5.6, 0.04, 1.8], [0, 0.02, 2.4]);
  builder.box("matte", matBlue, [2.2, 0.04, 9.4], [slideX, 0.021, -2.0]);
  builder.box("matte", palette.path, [1.4, 0.03, 4.2], [-1.4, 0.015, 5.2]);
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  addTree(builder, [-6.0, 0, -4.4], 1.15);
  addBush(builder, [7.0, 0, -3.0], 0.7, "#3a7d34");
  if (builder.isFar) {
    return;
  }
  addDeckchair(builder, [-4.4, 0, 2.6], Math.PI * 0.85, stripePink);
  addDeckchair(builder, [-5.4, 0, 1.5], Math.PI * 0.7, blue);
  /* A bunting pole, and a small table with a jug of squash */
  builder.cylinder("matte", palette.white, {
    radius: 0.05,
    length: 1.7,
    at: [-5.5, 0.85, 3.8],
    segments: 8,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.4,
    length: 0.05,
    at: [-4.9, 0.7, 1.7],
    segments: 16,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.03,
    length: 0.68,
    at: [-4.9, 0.34, 1.7],
    segments: 6,
  });
  builder.cylinder("glass", "#f0a040", {
    radius: 0.08,
    length: 0.22,
    at: [-4.85, 0.84, 1.65],
    segments: 10,
  });
  [0, 1, 2].forEach((cup) => {
    builder.cylinder("paint", [red, yellow, blue][cup], {
      radius: 0.04,
      radiusEnd: 0.05,
      length: 0.1,
      at: [-5.05 + cup * 0.12, 0.78, 1.85],
      segments: 8,
    });
  });
  addBush(builder, [6.6, 0, 3.6], 0.55);
  addBush(builder, [-6.4, 0, -1.2], 0.5, "#3a7d34");
  addBush(builder, [2.6, 0, -5.6], 0.5);
  addFlowerClump(
    builder,
    [-3.2, 0, 4.6],
    [meadowColours.rose, palette.white, meadowColours.butter],
  );
  addFlowerClump(
    builder,
    [3.4, 0, 5.4],
    [meadowColours.cornflower, meadowColours.poppy],
  );
  addFlowerClump(builder, [6.2, 0, 1.0], [meadowColours.butter, palette.white]);
};

/* Hop up the step, bounce, bounce, bounce, and hop back off */
const castleRide = (progress: number): LocalSpot => {
  const inside = { x: 0, z: -0.8 };
  if (progress < 0.12) {
    const share = progress / 0.12;
    return {
      x: castleEntry.x + (inside.x - castleEntry.x) * share,
      y: Math.min(floorTop, share * 2 * floorTop),
      z: castleEntry.z + (inside.z - castleEntry.z) * share,
      heading: Math.PI,
    };
  }
  if (progress > 0.88) {
    const share = (progress - 0.88) / 0.12;
    return {
      x: inside.x + (castleExit.x - inside.x) * share,
      y: floorTop * Math.min(1, 2 - share * 2),
      z: inside.z + (castleExit.z - inside.z) * share,
      heading: 0,
    };
  }
  const share = (progress - 0.12) / 0.76;
  const bounces = 7;
  const hop = Math.abs(Math.sin(share * bounces * Math.PI));
  const wander = Math.sin(share * Math.PI * 2);
  return {
    x: inside.x + wander * 1.1,
    y: floorTop + hop * (0.6 + 0.4 * Math.sin(share * Math.PI)),
    z: inside.z - Math.sin(share * Math.PI) * 0.9,
    heading: Math.PI + wander * 0.8,
  };
};

/* Up the inflatable steps, along the top, and whoosh down the slide */
const slideRide = (progress: number): LocalSpot => {
  const top = platform.minZ + 0.3;
  if (progress < 0.35) {
    const share = progress / 0.35;
    return {
      x: slideX,
      y: platformTop * Math.min(1, Math.max(0, share * 1.15 - 0.1)),
      z: slideStart.z + (top - slideStart.z) * share,
      heading: 0,
    };
  }
  if (progress < 0.45) {
    const share = (progress - 0.35) / 0.1;
    return {
      x: slideX,
      y: platformTop,
      z: top + (platform.maxZ - top) * share,
      heading: 0,
    };
  }
  const share = ((progress - 0.45) / 0.55) ** 1.5;
  const z = platform.maxZ + (slideFinish.z - platform.maxZ) * share;
  return {
    x: slideX,
    y:
      z > runOutEnd
        ? runOutTop * (1 - (z - runOutEnd) / (slideFinish.z - runOutEnd))
        : slopeHeight(z) + 0.02,
    z,
    heading: 0,
  };
};

/** Children bouncing away in their socks. */
const buildBouncer = buildVillager({
  top: red,
  legs: blue,
  hair: "#5a3a22",
  size: 0.7,
});

export const bouncyCastleModel: NewLandAttractionModel = {
  kind: "bouncy-castle",
  islandId: "meadow-isle",
  name: "Bouncy Castle",
  fact: "A bouncy castle is made of a thick plastic fabric that is strong, bendy and waterproof, so it can be squashed and spring back. A fan blows air into it all the time to keep it firm. Air is all around us, even though we cannot see it!",
  curriculumLink:
    "Science, Year 1: everyday materials. Describe the simple physical properties of a variety of everyday materials, such as plastic that is bendy, strong and waterproof.",
  footprint: 9,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildFloor(builder);
    buildWalls(builder);
    buildTurrets(builder);
    buildSlide(builder);
    buildBlowerHousing(builder);
    buildShoeRack(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "blower-fan",
      pivot: [blowerAt[0] - 0.2, 0.5, blowerAt[2]],
      build: buildFan,
      motion: { kind: "whirl", axis: "x", idle: 2, speed: 18, reach: 6 },
    },
    {
      name: "dragon",
      pivot: [0, wallTop + 0.15, castle.minZ],
      build: buildDragon,
      motion: { kind: "nod", axis: "x", reach: 7, amplitude: 0.3, period: 1.4 },
    },
  ],
  wanderers: [
    {
      name: "bouncing children",
      build: buildBouncer,
      count: 3,
      centre: { x: 0, z: (castle.minZ + castle.maxZ) / 2 },
      radius: 1.3,
      speed: 0.6,
      height: floorTop,
      bob: 0.5,
    },
  ],
  decks: [
    buildFlatDeck(
      {
        minX: castle.minX + 0.15,
        maxX: castle.maxX - 0.15,
        minZ: castle.minZ + 0.2,
        maxZ: castle.maxZ,
      },
      floorTop,
      "ground",
    ),
    buildFlatDeck(
      {
        minX: castle.minX + 0.3,
        maxX: castle.maxX - 0.3,
        minZ: step.minZ,
        maxZ: step.maxZ,
      },
      stepTop,
      "ground",
    ),
  ],
  rides: [
    {
      id: "bouncy-castle",
      name: "the bouncy castle",
      start: castleEntry,
      reach: 0.6,
      seconds: 9,
      finish: castleExit,
      follow: castleRide,
    },
    {
      id: "inflatable-slide",
      name: "the inflatable slide",
      start: slideStart,
      reach: 0.6,
      seconds: 6,
      finish: slideFinish,
      follow: slideRide,
    },
  ],
  play: {
    label: "Switch on the blower",
    news: "Whirr! The blower puffed the bouncy castle up big and firm, and everyone bounced higher than ever before.",
  },
};
