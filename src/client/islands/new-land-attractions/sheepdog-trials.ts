import { ConeGeometry, CylinderGeometry } from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  addTree,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalPoint,
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

const hurdleTimber = "#b08a5a";
const hutGreen = "#3f6a4a";
const hutRoof = "#8a9096";
const wheelRed = "#a8302a";
const standTimber = "#8a5a35";
const stoneGrey = "#a8a294";
const hedgeGreen = "#2f6b2c";
const flagRed = "#c8302a";
const flagBlue = "#2f5fa8";
const signColour = "#3f6a4a";

/* The course: drive gates either side, fetch gates at the back, and the pen */
const postAt = { x: 0, z: 4.6 };
const leftGates = { x: -3.2, z: -0.5 };
const rightGates = { x: 3.2, z: -0.5 };
const fetchGates = { x: 0, z: -4.4 };
const pen = { minX: 2.6, maxX: 4.2, minZ: 2.4, maxZ: 4.0 };
const gateHinge: Triple = [pen.minX, 0, pen.maxZ];

/* The grandstand down the left side, two steps high */
const stand = { minZ: -1.2, maxZ: 3.0, front: -4.8, middle: -5.6, back: -6.4 };
const tierOne = 0.35;
const tierTwo = 0.7;

const hutAt = { x: -4.4, z: -5.0 };
const hutTurn = 0.35;
const shepherdAt: Triple = [0.9, 0, 4.5];
const signAt = { x: -2.8, z: 8.1 };

/* Run the course as the sheepdog would */
const coursePath: readonly LocalPoint[] = [
  { x: 0, z: 3.9 },
  { x: -2.4, z: 2.4 },
  { x: -3.2, z: 0.9 },
  { x: -3.2, z: -1.9 },
  { x: -1.6, z: -4.4 },
  { x: 1.6, z: -4.4 },
  { x: 3.2, z: -1.9 },
  { x: 3.2, z: 0.9 },
  { x: 1.6, z: 2.2 },
  { x: 1.6, z: 3.2 },
  { x: 3.5, z: 3.2 },
  { x: 1.7, z: 3.0 },
  { x: 1.1, z: 1.6 },
];

/** A hurdle: a gate-like panel of timber rails, from one point to another. */
const addHurdle = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
  height = 0.8,
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2;
  const rails = builder.isFar ? 2 : 4;
  for (let rail = 0; rail < rails; rail++) {
    builder.box(
      "matte",
      shade(hurdleTimber, 0.95 + (rail % 2) * 0.08),
      [length, 0.06, 0.04],
      [
        (from.x + to.x) / 2,
        0.2 + ((height - 0.25) / (rails - 1)) * rail,
        (from.z + to.z) / 2,
      ],
      [0, turn, 0],
    );
  }
  [from, to].forEach(({ x, z }) => {
    builder.box(
      "matte",
      shade(hurdleTimber, 0.8),
      [0.07, height + 0.1, 0.07],
      [x, (height + 0.1) / 2, z],
    );
  });
  if (!builder.isFar) {
    builder.bar(
      "matte",
      hurdleTimber,
      [from.x, 0.2, from.z],
      [to.x, height - 0.05, to.z],
      0.04,
      4,
    );
  }
};

/** A pair of gates the sheep must go through, with a little flag on each. */
const addGatePair = (
  builder: AttractionBuilder,
  at: LocalPoint,
  isAlongZ: boolean,
) => {
  [-0.7, 0.7].forEach((offset, index) => {
    const from = isAlongZ
      ? { x: at.x + offset, z: at.z - 0.55 }
      : { x: at.x - 0.55, z: at.z + offset };
    const to = isAlongZ
      ? { x: at.x + offset, z: at.z + 0.55 }
      : { x: at.x + 0.55, z: at.z + offset };
    addHurdle(builder, from, to);
    if (builder.isFar) {
      return;
    }
    builder.cylinder("matte", palette.white, {
      radius: 0.02,
      length: 0.5,
      at: [from.x, 1.1, from.z],
      segments: 5,
    });
    builder.add(
      "matte",
      index === 0 ? flagRed : flagBlue,
      new ConeGeometry(0.1, 0.26, 3).rotateZ(-Math.PI / 2).scale(1, 1, 0.12),
      { at: [from.x + 0.13, 1.28, from.z] },
    );
  });
};

const buildCourse = (builder: AttractionBuilder) => {
  addGatePair(builder, leftGates, true);
  addGatePair(builder, rightGates, true);
  addGatePair(builder, fetchGates, false);
  /* The pen: three fixed hurdles; the gate swings on its own */
  addHurdle(
    builder,
    { x: pen.minX, z: pen.minZ },
    { x: pen.maxX, z: pen.minZ },
  );
  addHurdle(
    builder,
    { x: pen.maxX, z: pen.minZ },
    { x: pen.maxX, z: pen.maxZ },
  );
  addHurdle(
    builder,
    { x: pen.maxX, z: pen.maxZ },
    { x: pen.minX, z: pen.maxZ },
  );
  /* The shepherd's post, a ring of white marks for shedding, and the pen's straw */
  builder.cylinder("paint", palette.white, {
    radius: 0.06,
    length: 1.1,
    at: [postAt.x, 0.55, postAt.z],
    segments: 8,
  });
  builder.box(
    "matte",
    "#e2c069",
    [1.3, 0.02, 1.3],
    [(pen.minX + pen.maxX) / 2, 0.01, (pen.minZ + pen.maxZ) / 2],
  );
  if (builder.isFar) {
    return;
  }
  const marks = 16;
  for (let mark = 0; mark < marks; mark++) {
    const angle = (mark / marks) * Math.PI * 2;
    builder.box(
      "matte",
      palette.white,
      [0.3, 0.012, 0.08],
      [Math.sin(angle) * 1.6, 0.008, -1.4 + Math.cos(angle) * 1.6],
      [0, angle + Math.PI / 2, 0],
    );
  }
  /* A mown line from the post out to the fetch gates */
  builder.box(
    "matte",
    shade(meadowColours.meadow, 1.08),
    [0.6, 0.01, 8.4],
    [0, 0.006, 0.2],
  );
};

const buildHut = (builder: AttractionBuilder) => {
  const far = builder.isFar;
  const width = 2.4;
  const depth = 1.3;
  const floor = 0.55;
  const wall = 1.15;
  const cos = Math.cos(hutTurn);
  const sin = Math.sin(hutTurn);
  const place = (x: number, y: number, z: number): Triple => [
    hutAt.x + x * cos + z * sin,
    y,
    hutAt.z - x * sin + z * cos,
  ];
  const rotation: Triple = [0, hutTurn, 0];
  /* A shepherd's hut: a wooden room on iron wheels, with a curved tin roof */
  builder.box(
    "paint",
    hutGreen,
    [width, wall, depth],
    place(0, floor + wall / 2, 0),
    rotation,
  );
  builder.add(
    "metal",
    hutRoof,
    new CylinderGeometry(
      0.85,
      0.85,
      width + 0.2,
      far ? 8 : 16,
      1,
      true,
      Math.PI / 2 - 1.0,
      2.0,
    ).rotateZ(Math.PI / 2),
    { at: place(0, floor + wall - 0.5, 0), rotation },
  );
  [-1, 1].forEach((end) => {
    builder.add(
      "paint",
      shade(hutGreen, 1.1),
      new CylinderGeometry(
        0.84,
        0.84,
        0.06,
        far ? 8 : 16,
        1,
        false,
        Math.PI / 2 - 1.0,
        2.0,
      ).rotateZ(Math.PI / 2),
      { at: place((end * width) / 2, floor + wall - 0.5, 0), rotation },
    );
    [-1, 1].forEach((side) => {
      builder.add(
        "paint",
        wheelRed,
        new CylinderGeometry(0.3, 0.3, 0.08, far ? 8 : 14).rotateX(Math.PI / 2),
        { at: place(end * 0.8, 0.3, side * (depth / 2 + 0.06)), rotation },
      );
    });
  });
  builder.box(
    "paint",
    palette.darkSteel,
    [width - 0.2, 0.1, 0.1],
    place(0, 0.3, 0),
    rotation,
  );
  /* The stove's chimney through the roof */
  builder.cylinder("metal", palette.black, {
    radius: 0.06,
    length: 0.7,
    at: place(-0.7, floor + wall + 0.45, -0.2),
    segments: 8,
  });
  if (far) {
    return;
  }
  builder.cylinder("metal", palette.black, {
    radius: 0.1,
    length: 0.05,
    at: place(-0.7, floor + wall + 0.82, -0.2),
    segments: 10,
  });
  /* A stable door, windows and wooden steps up */
  builder.box(
    "paint",
    "#c8a050",
    [0.5, 0.95, 0.04],
    place(0.5, floor + 0.5, depth / 2 + 0.02),
    rotation,
  );
  builder.box(
    "paint",
    shade("#c8a050", 0.85),
    [0.52, 0.04, 0.06],
    place(0.5, floor + 0.5, depth / 2 + 0.04),
    rotation,
  );
  addWindow(builder, {
    at: place(-0.45, floor + 0.7, depth / 2 + 0.03),
    width: 0.5,
    height: 0.4,
    frame: palette.cream,
    turn: hutTurn,
  });
  addWindow(builder, {
    at: place(-width / 2 - 0.03, floor + 0.7, 0),
    width: 0.4,
    height: 0.35,
    frame: palette.cream,
    turn: hutTurn - Math.PI / 2,
  });
  [0, 1, 2].forEach((step) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.6, 0.05, 0.25],
      place(0.5, floor - 0.12 - step * 0.16, depth / 2 + 0.15 + step * 0.22),
      rotation,
    );
  });
  /* Vertical boards on the walls */
  for (let board = 0; board < 9; board++) {
    builder.box(
      "paint",
      shade(hutGreen, 0.85),
      [0.02, wall - 0.05, 0.02],
      place(
        -width / 2 + 0.15 + board * 0.27,
        floor + wall / 2,
        -depth / 2 - 0.01,
      ),
      rotation,
    );
  }
};

const buildGrandstand = (builder: AttractionBuilder) => {
  const length = stand.maxZ - stand.minZ;
  const middleZ = (stand.minZ + stand.maxZ) / 2;
  /* Two timber tiers, each a bench's step up from the last */
  [
    [stand.front, stand.middle, tierOne],
    [stand.middle, stand.back, tierTwo],
  ].forEach(([front, back, height]) => {
    builder.box(
      "matte",
      standTimber,
      [front - back, height, length],
      [(front + back) / 2, height / 2, middleZ],
    );
    builder.box(
      "matte",
      palette.paleTimber,
      [front - back, 0.04, length],
      [(front + back) / 2, height + 0.02, middleZ],
    );
  });
  /* A canopy over the top, and the bunting on its edge */
  const roofHeight = 2.6;
  [stand.minZ, middleZ, stand.maxZ].forEach((z) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.05,
      length: roofHeight - tierTwo,
      at: [stand.back + 0.1, (roofHeight + tierTwo) / 2, z],
      segments: 8,
    });
  });
  builder.box(
    "paint",
    palette.white,
    [1.9, 0.06, length + 0.4],
    [stand.back + 0.75, roofHeight, middleZ],
    [0, 0, -0.2],
  );
  builder.box(
    "paint",
    flagRed,
    [1.92, 0.04, length + 0.42],
    [stand.back + 0.75, roofHeight + 0.05, middleZ],
    [0, 0, -0.2],
  );
  addBunting(
    builder,
    [stand.front + 0.3, roofHeight - 0.25, stand.minZ - 0.2],
    [stand.front + 0.3, roofHeight - 0.25, stand.maxZ + 0.2],
    [flagRed, palette.white, flagBlue],
    0.15,
  );
  if (builder.isFar) {
    return;
  }
  addBench(
    builder,
    [stand.back + 0.45, tierTwo, middleZ - 1.0],
    Math.PI / 2,
    palette.paleTimber,
  );
  addBench(
    builder,
    [stand.back + 0.45, tierTwo, middleZ + 1.0],
    Math.PI / 2,
    palette.paleTimber,
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.06, 0.6, length],
    [stand.back + 0.03, tierTwo + 0.3, middleZ],
  );
  /* A board of rosettes for the winners */
  builder.box(
    "paint",
    palette.cream,
    [0.05, 0.7, 1.0],
    [stand.back - 0.05, 1.4, middleZ],
  );
  [flagBlue, flagRed, "#f2c12e"].forEach((colour, index) => {
    builder.cylinder("paint", colour, {
      radius: 0.12,
      length: 0.03,
      at: [stand.back - 0.09, 1.5, middleZ - 0.3 + index * 0.3],
      axis: "x",
      segments: 12,
    });
    builder.box(
      "paint",
      colour,
      [0.02, 0.22, 0.06],
      [stand.back - 0.09, 1.3, middleZ - 0.3 + index * 0.3],
    );
  });
};

const buildBoundary = (builder: AttractionBuilder) => {
  /* A hedge along the back, and a dry-stone wall down the right */
  builder.box("matte", hedgeGreen, [11, 1.2, 0.9], [0.4, 0.6, -7.0]);
  const stones = builder.isFar ? 0 : 26;
  builder.box("matte", stoneGrey, [0.55, 0.8, 9.0], [7.1, 0.4, -1.4]);
  for (let stone = 0; stone < stones; stone++) {
    const row = stone % 2;
    const z = -5.6 + Math.floor(stone / 2) * 0.66 + row * 0.33;
    builder.box(
      "matte",
      shade(stoneGrey, 0.85 + (stone % 4) * 0.06),
      [0.6, 0.18, 0.6],
      [7.1, 0.25 + row * 0.3, z],
      [0, stone * 0.4, 0],
    );
  }
  builder.box(
    "matte",
    shade(stoneGrey, 0.8),
    [0.65, 0.1, 9.0],
    [7.1, 0.85, -1.4],
  );
  if (builder.isFar) {
    return;
  }
  for (let bump = 0; bump < 11; bump++) {
    builder.sphere(
      "matte",
      shade(hedgeGreen, 1 + (bump % 3) * 0.06),
      0.55,
      [-4.6 + bump * 1.0, 1.2, -7.0],
      [1, 0.6, 1],
      7,
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    palette.path,
    [1.4, 0.03, 3.4],
    [signAt.x + 0.2, 0.015, 6.6],
  );
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  addTree(builder, [-7.0, 0, -4.0], 1.15);
  addTree(builder, [6.6, 0, -5.8], 1.0, "#4a9440");
  if (builder.isFar) {
    return;
  }
  addBush(builder, [-6.8, 0, 4.4], 0.55);
  addBush(builder, [3.6, 0, 6.4], 0.5, "#3a7d34");
  addFlowerClump(builder, [-4.4, 0, 6.0], [meadowColours.poppy, palette.white]);
  addFlowerClump(
    builder,
    [1.8, 0, 6.6],
    [meadowColours.butter, meadowColours.cornflower],
  );
  /* A water bowl for the working dogs */
  builder.cylinder("metal", palette.steel, {
    radius: 0.2,
    radiusEnd: 0.24,
    length: 0.08,
    at: [-1.2, 0.04, 5.0],
    segments: 12,
  });
  builder.cylinder("water", palette.water, {
    radius: 0.18,
    length: 0.02,
    at: [-1.2, 0.07, 5.0],
    segments: 12,
  });
};

/** The pen's gate, hinged at its corner, which swings open as you come near. */
const buildPenGate = (builder: AttractionBuilder) => {
  const length = pen.maxZ - pen.minZ;
  /* It rests half open, swung out towards the field */
  addHurdle(
    builder,
    { x: 0, z: 0 },
    { x: -length * Math.SQRT1_2, z: -length * Math.SQRT1_2 },
    0.85,
  );
};

/** The shepherd, crook raised; it waves as you come near. Pivot at the feet. */
const buildShepherd = (builder: AttractionBuilder) => {
  buildVillager({
    top: "#6a7a4a",
    legs: "#4a4038",
    hair: "#8a8a8a",
    hat: "#5a4a3a",
  })(builder);
  builder.bar(
    "matte",
    palette.darkTimber,
    [0.24, 0, 0.1],
    [0.24, 1.55, 0.1],
    0.04,
    6,
  );
  builder.torus(
    "matte",
    palette.darkTimber,
    0.08,
    0.02,
    [0.32, 1.55, 0.1],
    "z",
    10,
  );
};

const buildSheep = (builder: AttractionBuilder) => {
  const fleece = "#eee8d8";
  const face = "#2b2622";
  builder.sphere("matte", fleece, 0.28, [0, 0.48, 0], [0.92, 0.82, 1.25], 9);
  builder.sphere(
    "matte",
    shade(fleece, 1.03),
    0.17,
    [0, 0.62, 0.16],
    [1.1, 0.85, 1],
    7,
  );
  builder.sphere("matte", face, 0.11, [0, 0.62, 0.4], [0.8, 0.95, 1.3], 8);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      face,
      [0.11, 0.04, 0.05],
      [side * 0.11, 0.66, 0.34],
      [0, 0, side * -0.4],
    );
    [-0.18, 0.18].forEach((legZ) => {
      builder.cylinder("matte", face, {
        radius: 0.035,
        length: 0.3,
        at: [side * 0.11, 0.15, legZ],
        segments: 5,
      });
    });
  });
};

/** A black-and-white sheepdog, low and ready to run. */
const buildDog = (builder: AttractionBuilder) => {
  const black = "#222326";
  const white = "#f2efe8";
  builder.sphere("matte", black, 0.16, [0, 0.36, 0], [0.75, 0.75, 1.6], 9);
  builder.sphere("matte", white, 0.1, [0, 0.33, 0.18], [0.9, 0.9, 1], 7);
  builder.sphere("matte", black, 0.1, [0, 0.5, 0.3], [0.9, 0.9, 1.1], 8);
  builder.sphere("matte", white, 0.05, [0, 0.46, 0.4], [0.9, 0.8, 1.4], 6);
  builder.sphere("matte", black, 0.025, [0, 0.47, 0.47], [1, 1, 1], 4);
  [-1, 1].forEach((side) => {
    builder.add("matte", black, new ConeGeometry(0.035, 0.08, 4), {
      at: [side * 0.05, 0.6, 0.28],
      rotation: [0, 0, -side * 0.3],
    });
    [-0.16, 0.16].forEach((legZ) => {
      builder.cylinder("matte", legZ > 0 ? white : black, {
        radius: 0.03,
        length: 0.26,
        at: [side * 0.07, 0.13, legZ],
        segments: 5,
      });
    });
  });
  builder.bar("matte", black, [0, 0.38, -0.24], [0, 0.3, -0.48], 0.06, 5);
  builder.sphere("matte", white, 0.035, [0, 0.29, -0.5], [1, 1, 1], 5);
};

const segmentLengths = coursePath
  .slice(1)
  .map((point, index) =>
    Math.hypot(point.x - coursePath[index].x, point.z - coursePath[index].z),
  );
const courseLength = segmentLengths.reduce((sum, length) => sum + length, 0);

/* Dash round the course like a sheepdog: through the gates and into the pen */
const courseRide = (progress: number): LocalSpot => {
  let left = Math.min(1, Math.max(0, progress)) * courseLength;
  for (let index = 0; index < segmentLengths.length; index++) {
    const length = segmentLengths[index];
    const from = coursePath[index];
    const to = coursePath[index + 1];
    if (left <= length || index === segmentLengths.length - 1) {
      const share = Math.min(1, left / length);
      return {
        x: from.x + (to.x - from.x) * share,
        y: 0,
        z: from.z + (to.z - from.z) * share,
        heading: Math.atan2(to.x - from.x, to.z - from.z),
      };
    }
    left -= length;
  }
  return { x: coursePath[0].x, y: 0, z: coursePath[0].z, heading: 0 };
};

const standDeck: Deck = ({ x, z }) => {
  if (z < stand.minZ || z > stand.maxZ || x < stand.back || x > stand.front) {
    return undefined;
  }
  return { height: x > stand.middle ? tierOne : tierTwo, kind: "bridge" };
};

export const sheepdogTrialsModel: NewLandAttractionModel = {
  kind: "sheepdog-trials",
  islandId: "meadow-isle",
  name: "Sheepdog Trials",
  fact: "Sheep are herbivores, which means they eat only plants, mostly grass. A sheepdog listens for its shepherd's whistles: one whistle means go left, another means go right, and a long one means lie down. Sheep and dogs are both mammals, with wool or fur to keep them warm.",
  curriculumLink:
    "Science, Year 1: animals, including humans. Identify and name a variety of common animals that are carnivores, herbivores and omnivores.",
  footprint: 9.5,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildCourse(builder);
    buildHut(builder);
    buildGrandstand(builder);
    buildBoundary(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "shepherd",
      pivot: shepherdAt,
      build: buildShepherd,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.12,
        period: 1.2,
      },
    },
    {
      name: "pen-gate",
      pivot: gateHinge,
      build: buildPenGate,
      motion: { kind: "nod", axis: "y", reach: 5, amplitude: 0.6, period: 3.2 },
    },
  ],
  wanderers: [
    {
      name: "sheep",
      build: buildSheep,
      count: 5,
      centre: { x: 0, z: -1.6 },
      radius: 2.2,
      speed: 0.25,
    },
    {
      name: "sheepdogs",
      build: buildDog,
      count: 2,
      centre: { x: 0, z: -1.2 },
      radius: 3.4,
      speed: 1.1,
    },
  ],
  smoke: [
    {
      at: [
        hutAt.x - 0.7 * Math.cos(hutTurn) - 0.2 * Math.sin(hutTurn),
        2.6,
        hutAt.z + 0.7 * Math.sin(hutTurn) - 0.2 * Math.cos(hutTurn),
      ],
      colour: "#d8d8d8",
      puffs: 6,
      size: 0.25,
      rise: 1.6,
      spread: 0.3,
    },
  ],
  decks: [standDeck],
  rides: [
    {
      id: "sheepdog-course",
      name: "the sheepdog course",
      start: coursePath[0],
      reach: 0.6,
      seconds: 16,
      finish: coursePath[coursePath.length - 1],
      follow: courseRide,
    },
  ],
  play: {
    label: "Whistle for the dog",
    news: "Wheet-wheeoo! The sheepdog raced out wide, gathered the sheep, and trotted them neatly through the gates into the pen.",
    tune: [84, 88, 84, 91],
  },
};
