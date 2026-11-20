import { ExtrudeGeometry, Path, Shape, TorusGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  addBench,
  addBush,
  addDoor,
  addGableRoof,
  addLampPost,
  addSignBoard,
  addTree,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Deck,
  type Triple,
} from "./attraction-kit.js";

const brick = "#a4553d";
const mortarBand = "#c9b49a";
const portland = "#ddd3bf";
const slate = "#4a525d";
const frame = "#f1ece0";
const doorGreen = "#23452f";
const interior = "#d9a35a";
const bookColours = [
  "#8c2f39",
  "#2c4a6e",
  "#3f6b4a",
  "#c79a3b",
  "#6b3f6e",
  "#e3d6b4",
  "#2f6f73",
  "#a8552f",
  "#3a3f58",
];

/* The hall */

const hall = { minX: -3.5, maxX: 3.5, minZ: -4.2, maxZ: 0.4 };
const hallCentreZ = (hall.minZ + hall.maxZ) / 2;
const hallWidth = hall.maxX - hall.minX;
const hallDepth = hall.maxZ - hall.minZ;
const floorHeight = 0.36;
const eavesHeight = 3.56;
const roofRise = 1.45;

/** Where a point on a wall lands: `across` along the wall, `up`, `out` of it. */
const onWall =
  (at: Triple, turn: number) =>
  (across: number, up: number, out: number): Triple => [
    at[0] + across * Math.cos(turn) + out * Math.sin(turn),
    at[1] + up,
    at[2] - across * Math.sin(turn) + out * Math.cos(turn),
  ];

const archOutline = (
  halfWidth: number,
  springHeight: number,
  bottom = 0,
): Shape => {
  const outline = new Shape();
  outline.moveTo(-halfWidth, bottom);
  outline.lineTo(halfWidth, bottom);
  outline.lineTo(halfWidth, springHeight);
  outline.absarc(0, springHeight, halfWidth, 0, Math.PI, false);
  outline.lineTo(-halfWidth, bottom);
  return outline;
};

const extrudeOnWall = (
  builder: AttractionBuilder,
  finish: "matte" | "paint" | "glow",
  colour: string,
  shape: Shape,
  depth: number,
  at: Triple,
  turn: number,
) => {
  builder.add(
    finish,
    colour,
    new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: builder.segments(6, 3),
    }),
    { at, rotation: [0, turn, 0] },
  );
};

/** A tall arched window with bookshelves seen inside, lit warmly. */
const addLibraryWindow = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  seed: number,
  hasBooks = true,
) => {
  const width = 1.0;
  const half = width / 2;
  const spring = 1.45;
  const place = onWall(at, turn);
  extrudeOnWall(
    builder,
    "glow",
    interior,
    archOutline(half, spring),
    0.02,
    place(0, 0, 0),
    turn,
  );
  const surround = archOutline(half + 0.14, spring, -0.1);
  surround.holes.push(
    new Path(archOutline(half, spring).getPoints(builder.segments(6, 3))),
  );
  extrudeOnWall(
    builder,
    "matte",
    portland,
    surround,
    0.12,
    place(0, 0, 0),
    turn,
  );
  builder.box(
    "matte",
    portland,
    [0.2, 0.26, 0.16],
    place(0, spring + half + 0.08, 0.06),
    [0, turn, 0],
  );
  builder.box(
    "matte",
    portland,
    [width + 0.42, 0.09, 0.22],
    place(0, -0.12, 0.1),
    [0, turn, 0],
  );
  if (builder.isFar) {
    return;
  }
  const shelves = [0.06, 0.52, 0.98];
  shelves.forEach((shelfY, shelf) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [width, 0.04, 0.05],
      place(0, shelfY, 0.04),
      [0, turn, 0],
    );
    if (!hasBooks) {
      return;
    }
    let across = -half + 0.03;
    let book = 0;
    while (across < half - 0.1) {
      const pick = (seed * 7 + shelf * 5 + book * 3) % bookColours.length;
      const thick = 0.085 + ((pick * 13 + book) % 4) * 0.014;
      const tall = 0.26 + ((pick * 7 + book * 5) % 5) * 0.025;
      const isLeaning = (seed + shelf + book) % 7 === 3;
      builder.box(
        "matte",
        bookColours[pick],
        [thick, tall, 0.06],
        place(across + thick / 2, shelfY + 0.02 + tall / 2, 0.05),
        [0, turn, isLeaning ? -0.22 : 0],
      );
      across += thick + 0.008 + (isLeaning ? 0.06 : 0);
      book += 1;
    }
  });
  const bar = 0.04;
  builder.box(
    "paint",
    frame,
    [bar, spring + half, 0.04],
    place(0, (spring + half) / 2, 0.1),
    [0, turn, 0],
  );
  [0.75, spring].forEach((barY) => {
    builder.box("paint", frame, [width, bar, 0.04], place(0, barY, 0.1), [
      0,
      turn,
      0,
    ]);
  });
  builder.add(
    "paint",
    frame,
    new TorusGeometry(half * 0.55, bar / 2, 4, 10, Math.PI),
    { at: place(0, spring, 0.1), rotation: [0, turn, 0] },
  );
};

const buildHall = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    portland,
    [hallWidth + 0.3, floorHeight, hallDepth + 0.3],
    [0, floorHeight / 2, hallCentreZ],
  );
  const wallHeight = eavesHeight - floorHeight;
  builder.box(
    "matte",
    brick,
    [hallWidth, wallHeight, hallDepth],
    [0, floorHeight + wallHeight / 2, hallCentreZ],
  );
  [0.95, 2.5].forEach((bandY) => {
    builder.box(
      "matte",
      mortarBand,
      [hallWidth + 0.04, 0.08, hallDepth + 0.04],
      [0, bandY, hallCentreZ],
    );
  });
  builder.box(
    "matte",
    portland,
    [hallWidth + 0.3, 0.2, hallDepth + 0.3],
    [0, eavesHeight + 0.06, hallCentreZ],
  );
  if (!builder.isFar) {
    [hall.minX, hall.maxX].forEach((cornerX) => {
      [hall.minZ, hall.maxZ].forEach((cornerZ) => {
        for (let block = 0; block < 6; block++) {
          const isWide = block % 2 === 0;
          builder.box(
            "matte",
            portland,
            [isWide ? 0.42 : 0.28, 0.24, isWide ? 0.28 : 0.42],
            [
              cornerX + Math.sign(cornerX) * 0.02,
              floorHeight + 0.2 + block * 0.52,
              cornerZ + Math.sign(cornerZ - hallCentreZ) * 0.02,
            ],
          );
        }
      });
    });
  }
  addGableRoof(builder, {
    width: hallWidth,
    depth: hallDepth,
    rise: roofRise,
    at: [0, eavesHeight + 0.14, hallCentreZ],
    colour: slate,
    overhang: 0.28,
    thickness: 0.12,
  });
  const gable = new Shape();
  gable.moveTo(-hallDepth / 2, 0);
  gable.lineTo(hallDepth / 2, 0);
  gable.lineTo(0, roofRise);
  gable.lineTo(-hallDepth / 2, 0);
  [hall.minX, hall.maxX].forEach((gableX) => {
    const geometry = new ExtrudeGeometry(gable, {
      depth: 0.3,
      bevelEnabled: false,
    });
    geometry.translate(0, 0, -0.15);
    builder.add("matte", brick, geometry, {
      at: [gableX - Math.sign(gableX) * 0.15, eavesHeight + 0.14, hallCentreZ],
      rotation: [0, Math.PI / 2, 0],
    });
  });
  builder.box(
    "matte",
    shade(slate, 0.8),
    [hallWidth + 0.6, 0.1, 0.16],
    [0, eavesHeight + 0.14 + roofRise + 0.06, hallCentreZ],
  );
  buildCupola(builder, [0, eavesHeight + 0.14 + roofRise, hallCentreZ]);
  const windows: [number, number, number][] = [
    [-2.45, hall.maxZ, 0],
    [2.45, hall.maxZ, 0],
    [hall.maxX, -0.95, Math.PI / 2],
    [hall.maxX, -3.0, Math.PI / 2],
    [hall.minX, -0.95, -Math.PI / 2],
    [hall.minX, -3.0, -Math.PI / 2],
    [-2.2, hall.minZ, Math.PI],
    [0, hall.minZ, Math.PI],
    [2.2, hall.minZ, Math.PI],
  ];
  windows.forEach(([x, z, turn], index) => {
    addLibraryWindow(builder, [x, 1.05, z], turn, index, turn !== Math.PI);
  });
};

const buildCupola = (builder: AttractionBuilder, base: Triple) => {
  const [x, y, z] = base;
  builder.box("paint", frame, [0.78, 0.5, 0.78], [x, y + 0.1, z]);
  builder.box("paint", frame, [0.9, 0.08, 0.9], [x, y + 0.38, z]);
  builder.cylinder("paint", frame, {
    radius: 0.3,
    length: 0.5,
    at: [x, y + 0.66, z],
    segments: builder.segments(12, 8),
  });
  if (!builder.isFar) {
    for (let side = 0; side < 4; side++) {
      const angle = (side / 4) * Math.PI * 2;
      builder.box(
        "glow",
        interior,
        [0.16, 0.3, 0.02],
        [x + Math.sin(angle) * 0.29, y + 0.66, z + Math.cos(angle) * 0.29],
        [0, angle, 0],
      );
    }
  }
  builder.lathe(
    "paint",
    "#7fa595",
    [
      [0, 0.62],
      [0.08, 0.56],
      [0.22, 0.38],
      [0.34, 0.12],
      [0.36, 0],
    ],
    [x, y + 0.9, z],
    "y",
    builder.segments(16, 8),
  );
  builder.cylinder("metal", palette.brass, {
    radius: 0.025,
    length: 0.4,
    at: [x, y + 1.65, z],
    segments: 6,
  });
  builder.sphere("metal", palette.brass, 0.06, [x, y + 1.55, z], [1, 1, 1], 8);
};

/* The portico */

const porch = { minX: -1.65, maxX: 1.65, minZ: hall.maxZ, maxZ: 2.1 };
const columnXs = [-1.35, -0.45, 0.45, 1.35];
const columnZ = 1.82;
const entablatureY = 2.95;

const buildPortico = (builder: AttractionBuilder) => {
  const porchDepth = porch.maxZ - porch.minZ;
  const porchCentreZ = (porch.minZ + porch.maxZ) / 2;
  builder.box(
    "matte",
    portland,
    [porch.maxX - porch.minX, floorHeight, porchDepth],
    [0, floorHeight / 2, porchCentreZ],
  );
  [
    [0.24, 2.4, porch.maxZ + 0.15],
    [0.12, 2.6, porch.maxZ + 0.45],
  ].forEach(([height, width, z]) => {
    builder.box(
      "matte",
      shade(portland, 0.95),
      [width, height, 0.3],
      [0, height / 2, z],
    );
  });
  const columnHeight = entablatureY - floorHeight - 0.15;
  columnXs.forEach((columnX) => {
    builder.lathe(
      "matte",
      portland,
      [
        [0, 0],
        [0.2, 0],
        [0.2, 0.08],
        [0.16, 0.14],
        [0.15, 0.22],
        [0.12, columnHeight - 0.22],
        [0.14, columnHeight - 0.14],
        [0.2, columnHeight - 0.06],
        [0.2, columnHeight],
        [0, columnHeight],
      ],
      [columnX, floorHeight, columnZ],
      "y",
      builder.segments(14, 8),
    );
  });
  [-1.35, 1.35].forEach((pilasterX) => {
    builder.box(
      "matte",
      portland,
      [0.32, columnHeight, 0.08],
      [pilasterX, floorHeight + columnHeight / 2, hall.maxZ + 0.04],
    );
  });
  builder.box(
    "matte",
    portland,
    [porch.maxX - porch.minX + 0.2, 0.34, porchDepth + 0.1],
    [0, entablatureY, porchCentreZ - 0.05],
  );
  builder.box(
    "paint",
    doorGreen,
    [2.0, 0.16, 0.02],
    [0, entablatureY, porch.maxZ + 0.01],
  );
  if (!builder.isFar) {
    [-0.6, -0.3, 0, 0.3, 0.6].forEach((letterX) => {
      builder.box(
        "paint",
        palette.brass,
        [0.18, 0.09, 0.02],
        [letterX, entablatureY, porch.maxZ + 0.025],
      );
    });
  }
  const rise = 0.75;
  const halfSpan = (porch.maxX - porch.minX) / 2 + 0.1;
  const pediment = new Shape();
  pediment.moveTo(-halfSpan, 0);
  pediment.lineTo(halfSpan, 0);
  pediment.lineTo(0, rise);
  pediment.lineTo(-halfSpan, 0);
  builder.add(
    "matte",
    portland,
    new ExtrudeGeometry(pediment, { depth: porchDepth, bevelEnabled: false }),
    { at: [0, entablatureY + 0.17, porch.minZ] },
  );
  const slope = Math.hypot(halfSpan + 0.12, rise);
  const angle = Math.atan2(rise, halfSpan + 0.12);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      slate,
      [slope, 0.09, porchDepth + 0.2],
      [
        (side * (halfSpan + 0.12)) / 2,
        entablatureY + 0.21 + rise / 2,
        porchCentreZ + 0.05,
      ],
      [0, 0, -side * angle],
    );
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.2,
    length: 0.04,
    at: [0, entablatureY + 0.42, porch.maxZ + 0.02],
    axis: "z",
    segments: builder.segments(16, 8),
  });
  builder.cylinder("paint", palette.cream, {
    radius: 0.16,
    length: 0.02,
    at: [0, entablatureY + 0.42, porch.maxZ + 0.04],
    axis: "z",
    segments: builder.segments(16, 8),
  });
  if (!builder.isFar) {
    [0, 2.1].forEach((angle) => {
      builder.box(
        "paint",
        palette.black,
        [0.02, 0.12, 0.01],
        [
          Math.sin(angle) * 0.05,
          entablatureY + 0.42 + Math.cos(angle) * 0.05,
          porch.maxZ + 0.055,
        ],
        [0, 0, -angle],
      );
    });
  }
  addDoor(builder, {
    at: [-0.24, floorHeight, hall.maxZ],
    width: 0.48,
    height: 1.6,
    colour: doorGreen,
    frame,
  });
  addDoor(builder, {
    at: [0.24, floorHeight, hall.maxZ],
    width: 0.48,
    height: 1.6,
    colour: doorGreen,
    frame,
  });
  extrudeOnWall(
    builder,
    "glow",
    interior,
    archOutline(0.5, 0, 0),
    0.03,
    [0, floorHeight + 1.66, hall.maxZ],
    0,
  );
};

/* The grounds */

const addHedge = (builder: AttractionBuilder, size: Triple, at: Triple) => {
  builder.add(
    "matte",
    palette.hedge,
    new RoundedBoxGeometry(size[0], size[1], size[2], 1, 0.16),
    { at },
  );
};

const buildBookReturn = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  const plum = "#5b2f4a";
  builder.box("matte", portland, [0.66, 0.1, 0.56], [x, y + 0.05, z]);
  builder.roundedBox("paint", plum, [0.56, 0.78, 0.46], 0.06, [x, y + 0.49, z]);
  builder.roundedBox(
    "paint",
    shade(plum, 1.15),
    [0.62, 0.06, 0.54],
    0.03,
    [x, y + 0.92, z - 0.02],
    [0.22, 0, 0],
  );
  builder.box(
    "paint",
    palette.black,
    [0.36, 0.05, 0.02],
    [x, y + 0.72, z + 0.235],
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      palette.cream,
      [0.34, 0.16, 0.02],
      [x, y + 0.5, z + 0.235],
    );
    [0.53, 0.47].forEach((lineY) => {
      builder.box(
        "paint",
        plum,
        [0.24, 0.025, 0.01],
        [x, y + lineY, z + 0.247],
      );
    });
  }
};

const gardenAt = { x: 5.9, z: -0.6 };

const buildReadingGarden = (builder: AttractionBuilder) => {
  builder.cylinder("matte", palette.paving, {
    radius: 1.75,
    length: 0.05,
    at: [gardenAt.x, 0.025, gardenAt.z],
    segments: builder.segments(28, 14),
  });
  builder.cylinder("matte", shade(palette.paving, 0.88), {
    radius: 1.85,
    length: 0.04,
    at: [gardenAt.x, 0.02, gardenAt.z],
    segments: builder.segments(28, 14),
  });
  builder.lathe(
    "matte",
    palette.stone,
    [
      [0, 0],
      [0.22, 0],
      [0.2, 0.08],
      [0.1, 0.16],
      [0.08, 0.6],
      [0.14, 0.68],
      [0.32, 0.74],
      [0.34, 0.8],
      [0, 0.8],
    ],
    [gardenAt.x, 0.04, gardenAt.z],
    "y",
    builder.segments(14, 8),
  );
  builder.cylinder("water", palette.water, {
    radius: 0.27,
    length: 0.02,
    at: [gardenAt.x, 0.83, gardenAt.z],
    segments: builder.segments(14, 8),
  });
  addBench(builder, [gardenAt.x + 1.25, 0.04, gardenAt.z], -Math.PI / 2);
  addBench(builder, [gardenAt.x, 0.04, gardenAt.z - 1.25], 0);
  const flowerColours = ["#d9577a", "#f2c14e", "#9b6fc9", "#f4f1ea", "#e8743b"];
  const beds: [number, number, number, number][] = [
    [gardenAt.x + 1.3, gardenAt.z + 1.6, 1.4, 0.5],
    [gardenAt.x - 0.4, gardenAt.z + 2.1, 1.4, 0.5],
    [gardenAt.x + 1.5, gardenAt.z - 1.8, 1.2, 0.5],
  ];
  beds.forEach(([x, z, length, width], bed) => {
    builder.box(
      "matte",
      palette.stone,
      [length + 0.12, 0.16, width + 0.12],
      [x, 0.08, z],
    );
    builder.box("matte", palette.soil, [length, 0.04, width], [x, 0.16, z]);
    if (builder.isFar) {
      return;
    }
    const plants = 5;
    for (let plant = 0; plant < plants; plant++) {
      const along =
        -length / 2 + 0.14 + (plant / (plants - 1)) * (length - 0.28);
      const offset = plant % 2 === 0 ? -0.1 : 0.1;
      builder.sphere(
        "matte",
        "#4d8a3b",
        0.13,
        [x + along, 0.26, z + offset],
        [1, 0.8, 1],
        6,
      );
      builder.sphere(
        "matte",
        flowerColours[(plant + bed * 2) % flowerColours.length],
        0.075,
        [x + along, 0.36, z + offset],
        [1, 0.8, 1],
        6,
      );
    }
  });
  addTree(builder, [gardenAt.x + 0.2, 0, gardenAt.z - 3.6], 1.15, "#4a9440");
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.paving, [1.9, 0.05, 5.8], [0, 0.025, 5.6]);
  builder.box("matte", palette.paving, [3.6, 0.05, 1.0], [0, 0.025, 3.1]);
  builder.box("matte", palette.paving, [2.6, 0.05, 1.0], [3.4, 0.025, 1.2]);
  if (!builder.isFar) {
    for (let edge = 0; edge < 9; edge++) {
      builder.box(
        "matte",
        shade(palette.paving, 0.85),
        [1.9, 0.055, 0.03],
        [0, 0.028, 3.6 + edge * 0.6],
      );
    }
  }
  [-1, 1].forEach((side) => {
    addHedge(builder, [3.4, 0.6, 0.55], [side * 3.0, 0.3, 4.9]);
    addLampPost(builder, [side * 1.25, 0, 4.2], 2.3);
  });
  buildBookReturn(builder, [1.95, 0, 3.0]);
  addBench(builder, [-2.6, 0, 3.0], 0);
  addTree(builder, [-6.0, 0, -2.4], 1.25);
  addBush(builder, [-4.7, 0, -5.4], 0.6, "#3c8237");
  addBush(builder, [-4.2, 0, 0.6], 0.5);
  addBush(builder, [-4.3, 0, -1.4], 0.45, "#3a7d34");
  addBush(builder, [3.9, 0, -4.4], 0.5, "#3a7d34");
  addBush(builder, [-6.2, 0, 2.8], 0.55);
  addSignBoard(builder, [-2.4, 0, 6.2], doorGreen);
};

/* Where the Character can walk */

const porchDeck: Deck = ({ x, z }) => {
  if (x < porch.minX || x > porch.maxX) {
    return undefined;
  }
  if (z >= porch.minZ && z <= porch.maxZ) {
    return { height: floorHeight, kind: "trail" };
  }
  if (z > porch.maxZ && z <= porch.maxZ + 0.3 && Math.abs(x) <= 1.2) {
    return { height: 0.24, kind: "trail" };
  }
  if (z > porch.maxZ + 0.3 && z <= porch.maxZ + 0.6 && Math.abs(x) <= 1.3) {
    return { height: 0.12, kind: "trail" };
  }
  return undefined;
};

export const libraryModel: AttractionModel = {
  kind: "library",
  name: "Library",
  fact: "A library lends books for free, so anyone can borrow a story, read it at home and bring it back for someone else. Fiction books are stories from an author's imagination, and they are kept in alphabetical order by the author's surname.",
  curriculumLink:
    "English, Key Stage 1 and 2: reading. Listening to, reading and choosing a wide range of stories, poems and information books.",
  footprint: 8.4,
  setting: "inland",
  signSpot: { x: -2.4, z: 7.1 },
  build: (builder) => {
    buildHall(builder);
    buildPortico(builder);
    buildReadingGarden(builder);
    buildGrounds(builder);
  },
  blockers: [
    ...listWallBlockers(
      { x: hall.minX, z: hall.maxZ },
      { x: -0.7, z: hall.maxZ },
      0.5,
    ),
    ...listWallBlockers(
      { x: 0.7, z: hall.maxZ },
      { x: hall.maxX, z: hall.maxZ },
      0.5,
    ),
    { x: 0, z: hall.maxZ - 0.3, radius: 0.45 },
    ...listWallBlockers(
      { x: hall.maxX, z: hall.maxZ },
      { x: hall.maxX, z: hall.minZ },
      0.5,
    ),
    ...listWallBlockers(
      { x: hall.maxX, z: hall.minZ },
      { x: hall.minX, z: hall.minZ },
      0.5,
    ),
    ...listWallBlockers(
      { x: hall.minX, z: hall.minZ },
      { x: hall.minX, z: hall.maxZ },
      0.5,
    ),
    { x: -1.75, z: -1.9, radius: 1.8 },
    { x: 1.75, z: -1.9, radius: 1.8 },
    ...columnXs.map((columnX) => ({ x: columnX, z: columnZ, radius: 0.22 })),
    { x: 1.95, z: 3.0, radius: 0.38 },
    { x: gardenAt.x, z: gardenAt.z, radius: 0.4 },
    ...listWallBlockers({ x: -4.4, z: 4.9 }, { x: -1.6, z: 4.9 }, 0.32),
    ...listWallBlockers({ x: 1.6, z: 4.9 }, { x: 4.4, z: 4.9 }, 0.32),
    { x: -6.0, z: -2.4, radius: 0.35 },
    { x: gardenAt.x + 0.2, z: gardenAt.z - 3.6, radius: 0.32 },
  ],
  decks: [porchDeck],
};
