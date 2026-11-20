import { CylinderGeometry, Shape } from "three";
import {
  addGableRoof,
  shade,
  type AttractionBuilder,
  type Triple,
} from "../attractions/attraction-kit.js";

export const marble = "#e8e0d0";
export const marbleShadow = "#cfc5b1";
export const ivory = "#f1e6cc";
export const gold = "#d9a93a";
export const bronze = "#b5793a";
export const terracotta = "#b5532e";
export const greekBlue = "#2d4a78";
export const greekRed = "#9c3b2a";
export const basalt = "#3a3532";
export const lava = "#ff6a1f";
export const lavaCore = "#ffc04a";

/** The stylobate, the top step the columns stand on. */
export const stylobate = { minX: -3, maxX: 3, minZ: -5, maxZ: 3 };
export const stepRise = 0.2;
export const stepTread = 0.35;
export const floorHeight = stepRise * 3;
export const templeMiddleZ = (stylobate.minZ + stylobate.maxZ) / 2;
const templeWidth = stylobate.maxX - stylobate.minX;
const templeDepth = stylobate.maxZ - stylobate.minZ;

export const columnRadius = 0.22;
const shaftHeight = 2.25;
export const columnTop = floorHeight + 2.5;
const architraveTop = columnTop + 0.3;
const friezeTop = architraveTop + 0.36;
export const corniceTop = friezeTop + 0.14;
export const roofRise = 0.95;

const frontRowZ = stylobate.maxZ - 0.35;
const backRowZ = stylobate.minZ + 0.35;
const sideRowX = stylobate.maxX - 0.35;
const rowXs = [-sideRowX, -1.8, -1, 1, 1.8, sideRowX];

/** Every column's spot: six at each end and seven more down each side. */
export const columnSpots: readonly { x: number; z: number }[] = [
  ...rowXs.flatMap((x) => [
    { x, z: frontRowZ },
    { x, z: backRowZ },
  ]),
  ...[-1, 1].flatMap((side) =>
    Array.from({ length: 7 }, (_, index) => ({
      x: side * sideRowX,
      z: frontRowZ - ((index + 1) * (frontRowZ - backRowZ)) / 8,
    })),
  ),
];

/** The cella, the room inside that holds the goddess's statue. */
export const cella = {
  minX: -1.9,
  maxX: 1.9,
  minZ: -4.1,
  maxZ: 1.0,
  wall: 0.25,
  doorHalf: 0.75,
};

/* The steps */

export const buildCrepidoma = (builder: AttractionBuilder) => {
  [2, 1, 0].forEach((step) => {
    const grow = step * stepTread * 2;
    const colour = step === 0 ? marble : shade(marble, 0.96 - step * 0.03);
    builder.box(
      "matte",
      colour,
      [templeWidth + grow, stepRise, templeDepth + grow],
      [0, floorHeight - stepRise * (step + 0.5), templeMiddleZ],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Marble floor slabs, laid in a grid */
  for (let x = stylobate.minX + 0.75; x < stylobate.maxX; x += 1.5) {
    builder.box(
      "matte",
      marbleShadow,
      [0.03, 0.012, templeDepth - 0.1],
      [x, floorHeight + 0.004, templeMiddleZ],
    );
  }
  for (let z = stylobate.minZ + 1; z < stylobate.maxZ; z += 1) {
    builder.box(
      "matte",
      marbleShadow,
      [templeWidth - 0.1, 0.012, 0.03],
      [0, floorHeight + 0.004, z],
    );
  }
};

/* The Doric columns */

const addColumn = (builder: AttractionBuilder, x: number, z: number) => {
  /* Sixteen flat facets read as the column's flutes */
  builder.add(
    "matte",
    marble,
    new CylinderGeometry(
      columnRadius * 0.8,
      columnRadius,
      shaftHeight,
      builder.segments(16, 8),
      1,
      true,
    ),
    { at: [x, floorHeight + shaftHeight / 2, z] },
    undefined,
  );
  if (!builder.isFar) {
    builder.lathe(
      "matte",
      marble,
      [
        [columnRadius * 0.78, 0],
        [columnRadius * 1.05, 0.06],
        [columnRadius * 1.22, 0.13],
      ],
      [x, floorHeight + shaftHeight, z],
      "y",
      8,
    );
  }
  builder.box(
    "matte",
    shade(marble, 1.02),
    [columnRadius * 2.6, 0.12, columnRadius * 2.6],
    [x, columnTop - 0.06, z],
  );
};

export const buildColumns = (builder: AttractionBuilder) => {
  columnSpots.forEach(({ x, z }) => {
    addColumn(builder, x, z);
  });
};

/* The cella */

const addWall = (
  builder: AttractionBuilder,
  size: Triple,
  at: Triple,
  colour = marble,
) => {
  builder.box("matte", colour, size, at);
};

export const buildCella = (builder: AttractionBuilder) => {
  const height = columnTop - floorHeight;
  const y = floorHeight + height / 2;
  const { minX, maxX, minZ, maxZ, wall, doorHalf } = cella;
  const sideLength = maxZ - minZ;
  [-1, 1].forEach((side) => {
    addWall(
      builder,
      [wall, height, sideLength],
      [side * (maxX - wall / 2), y, (minZ + maxZ) / 2],
    );
    /* The front wall, either side of the great doorway */
    const panel = maxX - doorHalf;
    addWall(
      builder,
      [panel, height, wall],
      [side * (doorHalf + panel / 2), y, maxZ - wall / 2],
    );
    /* An anta, a thickened wall end */
    builder.box(
      "matte",
      shade(marble, 1.03),
      [wall + 0.12, height, 0.3],
      [side * (maxX - wall / 2), y, maxZ - 0.15],
    );
  });
  addWall(builder, [maxX - minX, height, wall], [0, y, minZ + wall / 2]);
  /* Over the door, a lintel */
  builder.box(
    "matte",
    shade(marble, 0.97),
    [doorHalf * 2 + 0.1, height - 2.05, wall + 0.04],
    [0, floorHeight + 2.05 + (height - 2.05) / 2, maxZ - wall / 2],
  );
  /* A painted band round the cella's top */
  builder.box(
    "paint",
    greekBlue,
    [maxX - minX + 0.04, 0.12, 0.02],
    [0, columnTop - 0.25, maxZ + 0.01],
  );
  if (builder.isFar) {
    return;
  }
  /* Its floor, a darker polished marble inside */
  builder.box(
    "paint",
    shade(marble, 0.9),
    [maxX - minX - wall * 2, 0.02, maxZ - minZ - wall],
    [0, floorHeight + 0.01, (minZ + maxZ) / 2 - wall / 2],
  );
  /* The bronze doors, swung open against the walls inside */
  [-1, 1].forEach((side) => {
    const x = side * (doorHalf + 0.06);
    builder.box(
      "metal",
      bronze,
      [0.06, 1.95, doorHalf],
      [x, floorHeight + 1.0, maxZ - wall - doorHalf / 2 - 0.02],
    );
    [0.5, 1.0, 1.5].forEach((up) => {
      builder.sphere(
        "metal",
        gold,
        0.04,
        [x - side * 0.04, floorHeight + up, maxZ - wall - doorHalf / 2],
        [1, 1, 1],
        5,
      );
    });
  });
  /* A key pattern painted along the doorway */
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      greekRed,
      [0.08, 2.0, 0.02],
      [side * (doorHalf + 0.04), floorHeight + 1.0, maxZ + 0.01],
    );
  });
};

/* The entablature: architrave, triglyph frieze and cornice */

export const buildEntablature = (builder: AttractionBuilder) => {
  const width = templeWidth - 0.1;
  const depth = templeDepth - 0.1;
  builder.box(
    "matte",
    marble,
    [width, architraveTop - columnTop, depth],
    [0, (columnTop + architraveTop) / 2, templeMiddleZ],
  );
  builder.box(
    "paint",
    greekRed,
    [width - 0.04, friezeTop - architraveTop, depth - 0.04],
    [0, (architraveTop + friezeTop) / 2, templeMiddleZ],
  );
  builder.box(
    "matte",
    shade(marble, 1.03),
    [width + 0.36, corniceTop - friezeTop, depth + 0.36],
    [0, (friezeTop + corniceTop) / 2, templeMiddleZ],
  );
  if (builder.isFar) {
    return;
  }
  /* A painted band between architrave and frieze */
  builder.box(
    "paint",
    greekBlue,
    [width + 0.04, 0.05, depth + 0.04],
    [0, architraveTop - 0.02, templeMiddleZ],
  );
  const triglyphY = (architraveTop + friezeTop) / 2;
  const triglyphSize: Triple = [0.24, friezeTop - architraveTop - 0.02, 0.05];
  const spacing = 0.46;
  const frontCount = Math.round(width / spacing);
  for (let index = 0; index <= frontCount; index++) {
    const x = -width / 2 + 0.12 + ((width - 0.24) * index) / frontCount;
    [-1, 1].forEach((end) => {
      const z = templeMiddleZ + end * (depth / 2 - 0.0);
      builder.box("paint", greekBlue, triglyphSize, [x, triglyphY, z]);
      if (index < frontCount && end === 1) {
        /* A carved metope between each pair */
        builder.box(
          "matte",
          ivory,
          [0.18, 0.2, 0.03],
          [x + (width - 0.24) / frontCount / 2, triglyphY, z],
        );
      }
    });
  }
  const sideCount = Math.round(depth / spacing);
  for (let index = 1; index < sideCount; index++) {
    const z = templeMiddleZ - depth / 2 + (depth * index) / sideCount;
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        greekBlue,
        [0.05, triglyphSize[1], 0.24],
        [side * (width / 2), triglyphY, z],
      );
    });
  }
  /* Gold guttae drops under the cornice, along the front */
  for (let index = 0; index <= frontCount; index++) {
    const x = -width / 2 + 0.12 + ((width - 0.24) * index) / frontCount;
    builder.box(
      "metal",
      gold,
      [0.2, 0.03, 0.04],
      [x, architraveTop + 0.01, templeMiddleZ + depth / 2 + 0.02],
    );
  }
};

/* The pediments and the tiled roof */

const pedimentShape = (
  halfWidth: number,
  rise: number,
  base: number,
): Shape => {
  const shape = new Shape();
  shape.moveTo(-halfWidth, base);
  shape.lineTo(halfWidth, base);
  shape.lineTo(0, base + rise);
  shape.lineTo(-halfWidth, base);
  return shape;
};

/** A small robed figure for the pediment, its feet at `at`. */
const addFigure = (
  builder: AttractionBuilder,
  at: Triple,
  height: number,
  robe: string,
) => {
  const [x, y, z] = at;
  builder.lathe(
    "paint",
    robe,
    [
      [0, 0],
      [height * 0.2, 0],
      [height * 0.15, height * 0.6],
      [height * 0.1, height * 0.78],
      [0, height * 0.8],
    ],
    [x, y, z],
    "y",
    7,
  );
  builder.sphere(
    "matte",
    ivory,
    height * 0.1,
    [x, y + height * 0.88, z],
    [1, 1, 1],
    6,
  );
};

const addReclining = (
  builder: AttractionBuilder,
  at: Triple,
  side: number,
  robe: string,
) => {
  const [x, y, z] = at;
  builder.sphere("paint", robe, 0.12, [x, y + 0.08, z], [3, 0.8, 0.9], 8);
  builder.sphere(
    "matte",
    ivory,
    0.06,
    [x + side * 0.38, y + 0.2, z],
    [1, 1, 1],
    8,
  );
};

export const buildRoof = (builder: AttractionBuilder) => {
  const halfWidth = templeWidth / 2 + 0.15;
  const front = templeMiddleZ + templeDepth / 2 + 0.1;
  const back = templeMiddleZ - templeDepth / 2 - 0.1;
  /* The tympanum, painted blue, at each end */
  [front, back].forEach((z) => {
    builder.endPlate(
      "paint",
      greekBlue,
      pedimentShape(halfWidth, roofRise, corniceTop),
      z - 0.18,
      z - 0.02,
    );
  });
  /* Raking cornices along the pediments' slopes */
  const slope = Math.hypot(halfWidth, roofRise);
  const angle = Math.atan2(roofRise, halfWidth);
  [front, back].forEach((z) => {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        shade(marble, 1.03),
        [slope + 0.1, 0.14, 0.22],
        [(side * halfWidth) / 2, corniceTop + roofRise / 2 + 0.05, z - 0.08],
        [0, 0, -side * angle],
      );
    });
  });
  addGableRoof(builder, {
    width: templeDepth + 0.2,
    depth: templeWidth + 0.1,
    rise: roofRise,
    at: [0, corniceTop + 0.04, templeMiddleZ],
    colour: terracotta,
    overhang: 0.2,
    thickness: 0.12,
    turn: Math.PI / 2,
  });
  /* Acroteria: gold palmettes at the apex and corners */
  [front - 0.05, back + 0.05].forEach((z) => {
    builder.lathe(
      "metal",
      gold,
      [
        [0.001, 0],
        [0.1, 0.05],
        [0.16, 0.22],
        [0.001, 0.36],
      ],
      [0, corniceTop + roofRise + 0.05, z],
      "y",
      builder.segments(10, 5),
    );
    [-1, 1].forEach((side) => {
      builder.sphere(
        "metal",
        gold,
        0.1,
        [side * (halfWidth + 0.02), corniceTop + 0.12, z],
        [1, 1.4, 0.4],
        8,
      );
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Ridge and cover tiles running down the roof */
  builder.cylinder("matte", shade(terracotta, 0.85), {
    radius: 0.07,
    length: templeDepth + 0.5,
    at: [0, corniceTop + roofRise + 0.1, templeMiddleZ],
    axis: "z",
    segments: 8,
  });
  const eave = halfWidth + 0.2;
  for (let z = back + 0.25; z < front - 0.1; z += (front - back - 0.3) / 14) {
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        shade(terracotta, 0.88),
        [side * (eave - 0.05), corniceTop + 0.06, z],
        [side * 0.08, corniceTop + roofRise + 0.08, z],
        0.07,
        4,
      );
      /* An antefix tile end along the eave */
      builder.box(
        "matte",
        shade(terracotta, 1.08),
        [0.04, 0.14, 0.1],
        [side * (eave + 0.01), corniceTop + 0.08, z],
      );
    });
  }
  /* The gods on the front pediment, painted bright */
  const figureZ = front - 0.12;
  const base = corniceTop + 0.02;
  addFigure(builder, [0, base, figureZ], 0.78, gold);
  addFigure(builder, [-0.75, base, figureZ], 0.56, greekRed);
  addFigure(builder, [0.75, base, figureZ], 0.56, ivory);
  addFigure(builder, [-1.4, base, figureZ], 0.36, "#4f7a3a");
  addFigure(builder, [1.4, base, figureZ], 0.36, greekRed);
  addReclining(builder, [-2.2, base, figureZ], -1, ivory);
  addReclining(builder, [2.2, base, figureZ], 1, "#4f7a3a");
  /* A little owl in the corner of the back pediment */
  builder.sphere(
    "metal",
    bronze,
    0.14,
    [0, base + 0.2, back + 0.12],
    [1, 1.3, 0.8],
    10,
  );
};

/* Athena, gold and ivory, in the cella */

export const athenaAt = { x: 0, z: -3.15 };

export const buildAthena = (builder: AttractionBuilder) => {
  const { x, z } = athenaAt;
  builder.box("matte", basalt, [0.95, 0.38, 0.95], [x, floorHeight + 0.19, z]);
  builder.box("metal", gold, [0.99, 0.05, 0.99], [x, floorHeight + 0.36, z]);
  const foot = floorHeight + 0.38;
  builder.lathe(
    "metal",
    gold,
    [
      [0, 0],
      [0.38, 0],
      [0.36, 0.3],
      [0.3, 0.85],
      [0.25, 1.15],
      [0.22, 1.3],
      [0.1, 1.42],
      [0, 1.43],
    ],
    [x, foot, z],
    "y",
    builder.segments(16, 8),
  );
  builder.sphere(
    "matte",
    ivory,
    0.14,
    [x, foot + 1.55, z],
    [1, 1.1, 1],
    builder.segments(14, 8),
  );
  /* Her helmet with its tall red crest */
  builder.sphere(
    "metal",
    gold,
    0.155,
    [x, foot + 1.6, z - 0.01],
    [1, 0.75, 1.05],
    12,
  );
  builder.sphere(
    "paint",
    greekRed,
    0.1,
    [x, foot + 1.78, z - 0.02],
    [0.35, 1, 2.0],
    10,
  );
  /* Her shield, at her side */
  builder.cylinder("metal", gold, {
    radius: 0.42,
    length: 0.05,
    at: [x - 0.5, foot + 0.48, z + 0.08],
    axis: "x",
    segments: builder.segments(20, 8),
  });
  /* Her spear */
  builder.bar(
    "metal",
    gold,
    [x + 0.45, foot, z + 0.05],
    [x + 0.45, foot + 2.05, z + 0.05],
    0.05,
    6,
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("paint", greekBlue, {
    radius: 0.34,
    length: 0.02,
    at: [x - 0.54, foot + 0.48, z + 0.08],
    axis: "x",
    segments: 20,
  });
  builder.sphere(
    "metal",
    gold,
    0.09,
    [x - 0.56, foot + 0.48, z + 0.08],
    [0.5, 1, 1],
    10,
  );
  builder.lathe(
    "metal",
    gold,
    [
      [0.001, 0.16],
      [0.05, 0.1],
      [0.03, 0],
    ],
    [x + 0.45, foot + 2.02, z + 0.05],
    "y",
    8,
  );
  /* Ivory arms: one holds the spear, one reaches out with a little Nike */
  builder.bar(
    "matte",
    ivory,
    [x + 0.2, foot + 1.3, z],
    [x + 0.43, foot + 1.15, z + 0.05],
    0.08,
    6,
  );
  builder.bar(
    "matte",
    ivory,
    [x - 0.2, foot + 1.3, z],
    [x - 0.15, foot + 1.05, z + 0.32],
    0.08,
    6,
  );
  builder.sphere(
    "metal",
    gold,
    0.06,
    [x - 0.15, foot + 1.12, z + 0.38],
    [1, 1, 1],
    6,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      gold,
      [0.12, 0.05, 0.02],
      [x - 0.15 + side * 0.08, foot + 1.16, z + 0.38],
      [0, 0, side * 0.5],
    );
  });
  /* A friendly face: eyes and a smile */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#3b2a20",
      0.018,
      [x + side * 0.05, foot + 1.57, z + 0.13],
      [1, 1, 1],
      6,
    );
  });
  builder.box(
    "paint",
    "#b4544a",
    [0.06, 0.012, 0.01],
    [x, foot + 1.49, z + 0.145],
  );
  /* A gold necklace and belt */
  builder.torus("metal", gold, 0.14, 0.015, [x, foot + 1.36, z], "y", 14);
  builder.torus(
    "metal",
    shade(gold, 0.85),
    0.29,
    0.02,
    [x, foot + 0.95, z],
    "y",
    18,
  );
};

/* Things round about */

export const addOliveTree = (
  builder: AttractionBuilder,
  at: Triple,
  size = 1,
) => {
  const [x, y, z] = at;
  const trunk = "#6a5a48";
  builder.bar(
    "matte",
    trunk,
    [x, y, z],
    [x + 0.2 * size, y + 0.9 * size, z + 0.1 * size],
    0.3 * size,
    6,
  );
  builder.bar(
    "matte",
    trunk,
    [x + 0.2 * size, y + 0.9 * size, z + 0.1 * size],
    [x - 0.25 * size, y + 1.6 * size, z],
    0.2 * size,
    5,
  );
  builder.bar(
    "matte",
    trunk,
    [x + 0.2 * size, y + 0.9 * size, z + 0.1 * size],
    [x + 0.55 * size, y + 1.5 * size, z - 0.15 * size],
    0.18 * size,
    5,
  );
  const leaf = "#7d8f5a";
  const clumps: [number, number, number, number][] = builder.isFar
    ? [[0.1, 1.8, 0, 1.1]]
    : [
        [-0.3, 1.85, 0, 0.75],
        [0.55, 1.75, -0.15, 0.7],
        [0.1, 2.15, 0.1, 0.7],
        [0.2, 1.7, 0.45, 0.55],
        [-0.15, 1.65, -0.45, 0.55],
      ];
  clumps.forEach(([dx, dy, dz, scale], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? leaf : shade(leaf, 1.15),
      0.75 * size * scale,
      [x + dx * size, y + dy * size, z + dz * size],
      [1.1, 0.75, 1.1],
      6,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* A few black olives */
  [
    [0.4, 1.45, 0.4],
    [-0.5, 1.5, 0.3],
    [0.6, 1.55, -0.45],
    [-0.1, 1.4, -0.55],
  ].forEach(([dx, dy, dz]) => {
    builder.sphere(
      "paint",
      "#2b2a30",
      0.05 * size,
      [x + dx * size, y + dy * size, z + dz * size],
      [1, 1.3, 1],
      6,
    );
  });
};

export const addAmphora = (
  builder: AttractionBuilder,
  at: Triple,
  size = 1,
) => {
  const [x, y, z] = at;
  builder.lathe(
    "paint",
    terracotta,
    [
      [0.001, 0],
      [0.08 * size, 0.02 * size],
      [0.2 * size, 0.3 * size],
      [0.22 * size, 0.45 * size],
      [0.13 * size, 0.62 * size],
      [0.07 * size, 0.72 * size],
      [0.09 * size, 0.8 * size],
    ],
    [x, y, z],
    "y",
    builder.segments(10, 6),
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("paint", "#1f1b1a", {
    radius: 0.222 * size,
    length: 0.06 * size,
    at: [x, y + 0.4 * size, z],
    segments: 10,
    isOpen: true,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      terracotta,
      [x + side * 0.08 * size, y + 0.74 * size, z],
      [x + side * 0.17 * size, y + 0.56 * size, z],
      0.03 * size,
      4,
    );
  });
};

/** A bronze tripod holding a fire bowl, its top `height` up. */
export const addTripod = (
  builder: AttractionBuilder,
  at: Triple,
  height = 1.1,
  isLit = true,
) => {
  const [x, y, z] = at;
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      bronze,
      [x + Math.sin(angle) * 0.3, y, z + Math.cos(angle) * 0.3],
      [
        x + Math.sin(angle) * 0.12,
        y + height - 0.1,
        z + Math.cos(angle) * 0.12,
      ],
      0.05,
      4,
    );
  });
  builder.lathe(
    "metal",
    bronze,
    [
      [0.001, 0],
      [0.14, 0.02],
      [0.24, 0.14],
      [0.26, 0.18],
    ],
    [x, y + height - 0.14, z],
    "y",
    builder.segments(10, 6),
  );
  if (isLit) {
    builder.sphere(
      "glow",
      lava,
      0.18,
      [x, y + height + 0.02, z],
      [1, 0.45, 1],
      8,
    );
  }
};

/** A friendly little flame: an orange teardrop with a yellow heart. */
export const buildFlame = (builder: AttractionBuilder, size = 1) => {
  builder.lathe(
    "glow",
    lava,
    [
      [0.001, 0],
      [0.16 * size, 0.08 * size],
      [0.17 * size, 0.2 * size],
      [0.1 * size, 0.42 * size],
      [0.001, 0.62 * size],
    ],
    [0, 0, 0],
    "y",
    builder.segments(12, 6),
  );
  builder.lathe(
    "glow",
    lavaCore,
    [
      [0.001, 0.02],
      [0.09 * size, 0.1 * size],
      [0.07 * size, 0.26 * size],
      [0.001, 0.4 * size],
    ],
    [0, 0.01, 0],
    "y",
    builder.segments(10, 5),
  );
};
