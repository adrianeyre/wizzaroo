import { CylinderGeometry, ExtrudeGeometry, Shape } from "three";
import {
  addBench,
  addDoor,
  addFence,
  addGableRoof,
  addSignBoard,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type PlayRide,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

/*
 * A 1940s house on the home front, seen from its back garden: a brick
 * and pebble-dash semi with taped windows and blackout curtains, an
 * Anderson shelter dug into the lawn under a mound of earth, a "Dig for
 * Victory" vegetable patch, hens in their run, a rabbit hutch and a
 * washing line of clothes flapping in the breeze. The Character can
 * duck into the shelter, and hear the wireless playing.
 */

const brick = "#9a4a34";
const brickDark = "#7a3626";
const pebbleDash = "#e6dcc4";
const roofTile = "#6e3a2c";
const paintGreen = "#2f5a3a";
const tapeCream = "#f2e8c8";
const soil = "#5e4128";
const soilDark = "#4a321e";
const lawn = "#6aa846";
const corrugated = "#8a9298";
const sandbag = "#c9b48a";
const cabbage = "#6f9a4a";
const signColour = "#3a4a2a";

const footprint = 10;

/* The house stands at the back, its back door facing the garden (+z). */
const houseFrom = -6.3;
const houseTo = -3.1;
const houseHalf = 2.7;
const groundFloor = 2.4;
const eaves = 4.6;
const doorX = 0.9;

/* The Anderson shelter, along x, its door facing +x */
const shelter = { x: -3.5, z: 0.6 };
const shelterLength = 2.0;
const shelterRadius = 0.78;
const shelterDoorX = shelter.x + shelterLength / 2;

const vegFrom = { x: 1.7, z: 0.1 };
const vegTo = { x: 5.1, z: 3.5 };
const henRun = { minX: 3.3, maxX: 5.7, minZ: -3.5, maxZ: -1.2 };
const lineZ = 5.0;
const lineHeight = 2.3;
const hutch = { x: -4.7, z: -2.3 };

/* The house */

const buildHouse = (builder: AttractionBuilder) => {
  const depth = houseTo - houseFrom;
  const middleZ = (houseFrom + houseTo) / 2;
  builder.box(
    "matte",
    brick,
    [houseHalf * 2, groundFloor, depth],
    [0, groundFloor / 2, middleZ],
  );
  builder.box(
    "matte",
    pebbleDash,
    [houseHalf * 2 + 0.04, eaves - groundFloor, depth + 0.04],
    [0, (groundFloor + eaves) / 2, middleZ],
  );
  /* A brick band between the floors, and a plinth of darker brick */
  builder.box(
    "matte",
    brickDark,
    [houseHalf * 2 + 0.1, 0.14, depth + 0.1],
    [0, groundFloor, middleZ],
  );
  builder.box(
    "matte",
    brickDark,
    [houseHalf * 2 + 0.06, 0.3, depth + 0.06],
    [0, 0.15, middleZ],
  );
  addGableRoof(builder, {
    width: houseHalf * 2,
    depth,
    rise: 1.7,
    at: [0, eaves, middleZ],
    colour: roofTile,
    overhang: 0.3,
    thickness: 0.12,
  });
  /* Gable ends filling the triangle under the roof */
  [-1, 1].forEach((side) => {
    const gable = new Shape();
    gable.moveTo(-depth / 2, 0);
    gable.lineTo(depth / 2, 0);
    gable.lineTo(0, 1.7);
    gable.lineTo(-depth / 2, 0);
    builder.add(
      "matte",
      pebbleDash,
      new ExtrudeGeometry(gable, { depth: 0.1, bevelEnabled: false }),
      {
        at: [side * (houseHalf - 0.05) - 0.05, eaves, middleZ],
        rotation: [0, Math.PI / 2, 0],
      },
    );
  });
  /* Two chimney stacks with pots */
  [-1, 1].forEach((side) => {
    const x = side * (houseHalf - 0.45);
    builder.box("matte", brick, [0.6, 1.6, 0.5], [x, eaves + 1.5, middleZ]);
    builder.box(
      "matte",
      brickDark,
      [0.7, 0.1, 0.6],
      [x, eaves + 2.32, middleZ],
    );
    [-0.14, 0.14].forEach((dx) => {
      builder.cylinder("matte", "#b8643e", {
        radius: 0.08,
        radiusEnd: 0.1,
        length: 0.3,
        at: [x + dx, eaves + 2.52, middleZ],
        segments: 8,
      });
    });
  });
  /* Windows criss-crossed with tape against bomb blasts, and the back door */
  const face = houseTo + 0.02;
  const lower = [{ x: -1.2, y: 1.35, width: 1.3, height: 1.0 }];
  const upper = [{ x: -1.4, y: 3.55, width: 1.0, height: 0.85 }];
  [...lower, ...upper].forEach(({ x, y, width, height }) => {
    addWindow(builder, {
      at: [x, y, face],
      width,
      height,
      frame: palette.white,
    });
    if (!builder.isFar) {
      [-1, 1].forEach((slant) => {
        builder.box(
          "matte",
          tapeCream,
          [Math.hypot(width, height) * 0.92, 0.05, 0.01],
          [x, y, face + 0.05],
          [0, 0, slant * Math.atan2(height, width)],
        );
      });
    }
  });
  /* The upstairs window whose light comes on, with dark blackout curtains */
  builder.box("glass", "#1f2440", [1.0, 0.85, 0.04], [1.25, 3.55, face]);
  builder.box(
    "paint",
    palette.white,
    [1.1, 0.06, 0.08],
    [1.25, 3.0, face + 0.04],
  );
  builder.box(
    "paint",
    palette.white,
    [1.1, 0.06, 0.08],
    [1.25, 4.0, face + 0.04],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.white,
      [0.06, 1.0, 0.08],
      [1.25 + side * 0.53, 3.52, face + 0.04],
    );
    builder.box(
      "matte",
      "#1e1c2c",
      [0.24, 0.8, 0.03],
      [1.25 + side * 0.36, 3.55, face + 0.08],
    );
  });
  addDoor(builder, {
    at: [doorX, 0.12, face],
    width: 0.72,
    height: 1.9,
    colour: paintGreen,
  });
  /* The back step, gutter and downpipe */
  builder.box(
    "matte",
    palette.stone,
    [1.1, 0.12, 0.45],
    [doorX, 0.06, houseTo + 0.22],
  );
  builder.cylinder("paint", palette.black, {
    radius: 0.06,
    length: houseHalf * 2 + 0.5,
    at: [0, eaves - 0.05, houseTo + 0.38],
    axis: "x",
    segments: 6,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.045,
    length: eaves,
    at: [-houseHalf + 0.15, eaves / 2, houseTo + 0.1],
    segments: 6,
  });
  if (builder.isFar) {
    return;
  }
  /* A porch hood over the back door */
  builder.box(
    "paint",
    palette.white,
    [1.2, 0.08, 0.6],
    [doorX, 2.25, houseTo + 0.3],
    [0.15, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      palette.white,
      [doorX + side * 0.55, 1.95, houseTo + 0.02],
      [doorX + side * 0.55, 2.22, houseTo + 0.55],
      0.04,
      4,
    );
  });
  /* Courses of brick picked out on the ground floor */
  for (let course = 1; course < 8; course++) {
    builder.box(
      "matte",
      shade(brick, 0.88),
      [houseHalf * 2 + 0.01, 0.025, 0.01],
      [0, 0.3 + course * 0.28, houseTo + 0.005],
    );
  }
  /* Sandbags piled by the back door */
  for (let bag = 0; bag < 5; bag++) {
    const row = bag < 3 ? 0 : 1;
    const along = row === 0 ? bag : bag - 3 + 0.5;
    builder.sphere(
      "matte",
      bag % 2 === 0 ? sandbag : shade(sandbag, 0.9),
      0.2,
      [0.25 - along * 0.27, 0.11 + row * 0.18, houseTo + 0.25],
      [0.75, 0.55, 1.1],
      6,
    );
  }
  /* A stirrup pump and a bucket of water, ready for any fire */
  builder.cylinder("paint", "#c8102e", {
    radius: 0.14,
    radiusEnd: 0.17,
    length: 0.32,
    at: [doorX + 0.75, 0.16, houseTo + 0.35],
    segments: 10,
  });
  builder.cylinder("water", palette.water, {
    radius: 0.15,
    length: 0.02,
    at: [doorX + 0.75, 0.3, houseTo + 0.35],
    segments: 10,
  });
  builder.bar(
    "metal",
    palette.darkSteel,
    [doorX + 0.75, 0.2, houseTo + 0.35],
    [doorX + 0.78, 0.85, houseTo + 0.3],
    0.03,
    4,
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.25, 0.03, 0.03],
    [doorX + 0.78, 0.85, houseTo + 0.3],
  );
};

/* The Anderson shelter, half dug in and covered with earth */

const buildShelter = (builder: AttractionBuilder) => {
  const { x, z } = shelter;
  /* The mound of earth heaped over it, with vegetables growing on top */
  builder.sphere(
    "matte",
    soil,
    1,
    [x - 0.5, 0, z],
    [1.3, shelterRadius + 0.38, shelterRadius + 0.55],
    builder.segments(18, 10),
  );
  builder.sphere(
    "matte",
    lawn,
    0.7,
    [x - 0.2, shelterRadius + 0.05, z],
    [1.2, 0.35, 0.9],
    builder.segments(12, 6),
  );
  /* The curved steel front, poking out of the earth, with its little doorway */
  builder.add(
    "metal",
    corrugated,
    new CylinderGeometry(
      shelterRadius,
      shelterRadius,
      0.7,
      builder.segments(14, 6),
      1,
      true,
      0,
      Math.PI,
    ).rotateZ(Math.PI / 2),
    { at: [shelterDoorX - 0.15, 0, z] },
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      shade(corrugated, 0.9),
      [0.06, shelterRadius + 0.05, 0.3],
      [shelterDoorX + 0.18, (shelterRadius + 0.05) / 2, z + side * 0.48],
    );
  });
  builder.box(
    "metal",
    shade(corrugated, 0.9),
    [0.06, 0.2, 1.3],
    [shelterDoorX + 0.18, shelterRadius - 0.05, z],
  );
  /* The dark way in, and a step down */
  builder.box(
    "matte",
    "#1a1612",
    [0.04, 0.62, 0.62],
    [shelterDoorX + 0.16, 0.31, z],
  );
  builder.box(
    "matte",
    soilDark,
    [0.6, 0.06, 0.7],
    [shelterDoorX + 0.5, 0.03, z],
  );
  if (builder.isFar) {
    return;
  }
  /* Ridges of corrugated steel round the front */
  for (let rib = 0; rib < 4; rib++) {
    builder.add(
      "metal",
      shade(corrugated, 1.08),
      new CylinderGeometry(
        shelterRadius + 0.02,
        shelterRadius + 0.02,
        0.04,
        12,
        1,
        true,
        0,
        Math.PI,
      ).rotateZ(Math.PI / 2),
      { at: [shelterDoorX - 0.45 + rib * 0.15, 0, z] },
    );
  }
  /* Sandbags either side of the door */
  [-1, 1].forEach((side) => {
    [0, 1, 2].forEach((layer) => {
      builder.sphere(
        "matte",
        layer % 2 === 0 ? sandbag : shade(sandbag, 0.9),
        0.2,
        [
          shelterDoorX + 0.42,
          0.1 + layer * 0.17,
          z + side * (0.62 + (layer % 2) * 0.05),
        ],
        [1.1, 0.5, 0.7],
        6,
      );
    });
  });
  /* Marrows and nasturtiums growing on the roof of earth */
  const crops: [number, number, string][] = [
    [-0.5, 0.15, "#4f7a2a"],
    [0.1, -0.25, "#e8822a"],
    [0.4, 0.3, "#d9442a"],
    [-0.9, -0.3, "#e8822a"],
  ];
  crops.forEach(([dx, dz, colour]) => {
    builder.sphere(
      "matte",
      colour,
      0.13,
      [x + dx, shelterRadius + 0.24, z + dz],
      [1.6, 0.8, 1],
      6,
    );
  });
};

/* Dig for Victory: rows of vegetables, bean poles and a bird scarer */

const buildVegPatch = (builder: AttractionBuilder) => {
  const width = vegTo.x - vegFrom.x;
  const depth = vegTo.z - vegFrom.z;
  builder.box(
    "matte",
    soil,
    [width, 0.1, depth],
    [(vegFrom.x + vegTo.x) / 2, 0.05, (vegFrom.z + vegTo.z) / 2],
  );
  /* Edging boards */
  [vegFrom.z, vegTo.z].forEach((z) => {
    builder.box(
      "matte",
      palette.timber,
      [width + 0.1, 0.16, 0.06],
      [(vegFrom.x + vegTo.x) / 2, 0.08, z],
    );
  });
  [vegFrom.x, vegTo.x].forEach((x) => {
    builder.box(
      "matte",
      palette.timber,
      [0.06, 0.16, depth],
      [x, 0.08, (vegFrom.z + vegTo.z) / 2],
    );
  });
  const rows = builder.isFar ? 3 : 6;
  for (let row = 0; row < rows; row++) {
    const z = vegFrom.z + 0.35 + (row * (depth - 0.7)) / (rows - 1);
    if (builder.isFar) {
      builder.box(
        "matte",
        cabbage,
        [width - 0.4, 0.2, 0.25],
        [(vegFrom.x + vegTo.x) / 2, 0.2, z],
      );
      continue;
    }
    builder.box(
      "matte",
      soilDark,
      [width - 0.3, 0.04, 0.22],
      [(vegFrom.x + vegTo.x) / 2, 0.11, z],
    );
    const kind = row % 3;
    for (let plant = 0; plant < 6; plant++) {
      const x = vegFrom.x + 0.4 + plant * ((width - 0.8) / 5);
      if (kind === 0) {
        /* Cabbages */
        builder.sphere("matte", cabbage, 0.18, [x, 0.22, z], [1, 0.8, 1], 8);
        builder.sphere(
          "matte",
          shade(cabbage, 1.25),
          0.11,
          [x, 0.3, z],
          [1, 0.8, 1],
          6,
        );
      } else if (kind === 1) {
        /* Carrots: feathery tops */
        [-0.4, 0.4].forEach((lean) => {
          builder.cylinder("matte", "#4f9a3a", {
            radius: 0.06,
            radiusEnd: 0.01,
            length: 0.32,
            at: [x + lean * 0.08, 0.26, z],
            segments: 4,
          });
        });
        builder.cylinder("matte", "#e8822a", {
          radius: 0.04,
          length: 0.04,
          at: [x, 0.12, z],
          segments: 5,
        });
      } else {
        /* Lettuces and onions */
        builder.sphere(
          "matte",
          plant % 2 === 0 ? "#9ac85a" : "#d9c8a0",
          0.13,
          [x, 0.17, z],
          [1, plant % 2 === 0 ? 0.6 : 0.9, 1],
          6,
        );
      }
    }
  }
  /* Runner beans climbing a wigwam of canes, with red flowers */
  const wigwam: Triple = [vegTo.x - 0.5, 0, vegTo.z + 0.6];
  for (let cane = 0; cane < 5; cane++) {
    const angle = (cane / 5) * Math.PI * 2;
    builder.bar(
      "matte",
      palette.paleTimber,
      [
        wigwam[0] + Math.sin(angle) * 0.45,
        0,
        wigwam[2] + Math.cos(angle) * 0.45,
      ],
      [wigwam[0], 2.0, wigwam[2]],
      0.035,
      4,
    );
    if (builder.isFar) {
      continue;
    }
    [0.5, 1.0, 1.4].forEach((up, index) => {
      const reach = 0.45 * (1 - up / 2.0);
      builder.sphere(
        "matte",
        index === 1 ? "#d9302a" : "#3f8a3a",
        0.1,
        [
          wigwam[0] + Math.sin(angle + 0.3) * reach,
          up,
          wigwam[2] + Math.cos(angle + 0.3) * reach,
        ],
        [1, 0.8, 1],
        5,
      );
    });
  }
  /* The stick of the bird scarer */
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.03,
    length: 1.6,
    at: [vegFrom.x + 0.25, 0.8, vegTo.z - 0.25],
    segments: 5,
  });
  /* A little painted board: Dig for Victory */
  builder.box(
    "matte",
    palette.darkTimber,
    [0.05, 0.8, 0.05],
    [vegFrom.x + 0.2, 0.4, vegFrom.z - 0.15],
  );
  builder.box(
    "paint",
    "#c8102e",
    [0.7, 0.3, 0.04],
    [vegFrom.x + 0.2, 0.85, vegFrom.z - 0.13],
  );
  builder.box(
    "paint",
    tapeCream,
    [0.55, 0.05, 0.01],
    [vegFrom.x + 0.2, 0.9, vegFrom.z - 0.105],
  );
  builder.box(
    "paint",
    tapeCream,
    [0.45, 0.05, 0.01],
    [vegFrom.x + 0.2, 0.8, vegFrom.z - 0.105],
  );
};

/* The hen run and hen house */

const buildHenRun = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = henRun;
  /* The hen house on legs, with a sloping felt roof */
  const coop: Triple = [maxX - 0.6, 0, minZ + 0.55];
  builder.box("paint", "#7a5a3a", [0.95, 0.65, 0.75], [coop[0], 0.75, coop[2]]);
  builder.box(
    "matte",
    "#2a2a2a",
    [1.1, 0.06, 0.95],
    [coop[0], 1.13, coop[2]],
    [0.18, 0, 0],
  );
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.07, 0.45, 0.07],
        [coop[0] + sx * 0.4, 0.22, coop[2] + sz * 0.3],
      );
    });
  });
  builder.box(
    "matte",
    "#1a1612",
    [0.25, 0.25, 0.02],
    [coop[0] - 0.15, 0.7, coop[2] + 0.38],
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [0.2, 0.03, 0.8],
    [coop[0] - 0.15, 0.25, coop[2] + 0.7],
    [-0.6, 0, 0],
  );
  /* Chicken wire round the run, on posts */
  const corners = [
    { x: minX, z: minZ },
    { x: minX, z: maxZ },
    { x: maxX, z: maxZ },
    { x: maxX, z: minZ },
  ];
  corners.forEach((from, index) => {
    if (index === 3) {
      return;
    }
    const to = corners[index + 1];
    addFence(builder, from, to, {
      colour: palette.darkTimber,
      height: 0.9,
      isPicket: false,
      spacing: 0.3,
      finish: "matte",
    });
    if (builder.isFar) {
      return;
    }
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const wires = Math.round(length / 0.2);
    for (let wire = 1; wire < wires; wire++) {
      const share = wire / wires;
      builder.box(
        "metal",
        palette.steel,
        [0.012, 0.8, 0.012],
        [
          from.x + (to.x - from.x) * share,
          0.42,
          from.z + (to.z - from.z) * share,
        ],
      );
    }
  });
  /* Straw underfoot and a water dish */
  builder.box(
    "matte",
    "#d9c07a",
    [maxX - minX - 0.1, 0.03, maxZ - minZ - 0.1],
    [(minX + maxX) / 2, 0.015, (minZ + maxZ) / 2],
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.16,
    length: 0.08,
    at: [minX + 0.5, 0.04, maxZ - 0.5],
    segments: 10,
  });
};

/* Garden things: washing line posts, hutch, bench, water butt, wheelbarrow */

const buildGarden = (builder: AttractionBuilder) => {
  /* Crazy-paving path from the back door down the garden */
  builder.box(
    "matte",
    palette.paving,
    [0.95, 0.03, 10.6],
    [doorX, 0.015, 2.25],
  );
  if (!builder.isFar) {
    for (let slab = 0; slab < 18; slab++) {
      builder.box(
        "matte",
        shade(palette.paving, slab % 2 === 0 ? 0.88 : 1.06),
        [0.4, 0.035, 0.5],
        [doorX + (slab % 2 === 0 ? -0.22 : 0.22), 0.02, -2.6 + slab * 0.58],
        [0, slab * 0.4, 0],
      );
    }
  }
  /* Washing line posts and the clothes prop */
  [-3.3, 3.5].forEach((x) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.12, lineHeight + 0.2, 0.12],
      [x, (lineHeight + 0.2) / 2, lineZ],
    );
    builder.box(
      "matte",
      palette.paleTimber,
      [0.4, 0.08, 0.08],
      [x, lineHeight + 0.1, lineZ],
    );
  });
  builder.bar(
    "matte",
    palette.white,
    [-3.3, lineHeight + 0.05, lineZ],
    [3.5, lineHeight + 0.05, lineZ],
    0.02,
    3,
  );
  builder.bar(
    "matte",
    palette.paleTimber,
    [-0.4, 0, lineZ + 0.5],
    [-0.35, lineHeight + 0.08, lineZ],
    0.05,
    5,
  );
  /* The rabbit hutch, raised on legs, with its little run and burrow */
  const { x, z } = hutch;
  builder.box("paint", "#8a6a4a", [1.3, 0.7, 0.7], [x, 0.85, z]);
  builder.box(
    "matte",
    "#2a2a2a",
    [1.4, 0.06, 0.85],
    [x, 1.24, z],
    [0.12, 0, 0],
  );
  builder.box("matte", "#3a2a1a", [0.55, 0.5, 0.02], [x - 0.3, 0.85, z + 0.36]);
  [-0.6, 0.6].forEach((dx) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 0.5, 0.07],
      [x + dx, 0.25, z + 0.28],
    );
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 0.5, 0.07],
      [x + dx, 0.25, z - 0.28],
    );
  });
  builder.cylinder("matte", soilDark, {
    radius: 0.22,
    length: 0.03,
    at: [x + 0.2, 0.015, z + 0.95],
    segments: 10,
  });
  builder.torus("matte", soil, 0.24, 0.07, [x + 0.2, 0.02, z + 0.95], "y", 10);
  addBench(builder, [-1.3, 0, -2.6], 0, "#4a6a4a");
  if (builder.isFar) {
    return;
  }
  builder.box("matte", "#3a2a1a", [0.5, 0.42, 0.02], [x + 0.3, 0.85, z + 0.36]);
  for (let bar = 0; bar < 5; bar++) {
    builder.box(
      "metal",
      palette.steel,
      [0.015, 0.42, 0.015],
      [x + 0.12 + bar * 0.09, 0.85, z + 0.375],
    );
  }
  /* A water butt by the downpipe, and a watering can */
  builder.cylinder("paint", "#2f4a3a", {
    radius: 0.32,
    length: 0.9,
    at: [-houseHalf + 0.2, 0.45, houseTo + 0.45],
    segments: 12,
  });
  builder.cylinder("water", palette.water, {
    radius: 0.28,
    length: 0.02,
    at: [-houseHalf + 0.2, 0.9, houseTo + 0.45],
    segments: 12,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.12,
    length: 0.26,
    at: [vegTo.x + 0.45, 0.13, vegFrom.z + 0.5],
    segments: 8,
  });
  builder.bar(
    "metal",
    palette.steel,
    [vegTo.x + 0.55, 0.15, vegFrom.z + 0.5],
    [vegTo.x + 0.85, 0.32, vegFrom.z + 0.5],
    0.03,
    4,
  );
  /* A wheelbarrow with a spade and a fork */
  const barrow: Triple = [vegTo.x - 0.1, 0, vegFrom.z - 0.75];
  builder.box(
    "paint",
    "#5a7a8a",
    [0.9, 0.3, 0.55],
    [barrow[0], 0.42, barrow[2]],
    [0, 0, -0.15],
  );
  builder.torus(
    "matte",
    palette.black,
    0.16,
    0.05,
    [barrow[0] + 0.55, 0.18, barrow[2]],
    "x",
    10,
  );
  [-0.22, 0.22].forEach((dz) => {
    builder.bar(
      "matte",
      palette.timber,
      [barrow[0] + 0.5, 0.3, barrow[2] + dz * 0.5],
      [barrow[0] - 0.8, 0.55, barrow[2] + dz],
      0.04,
      4,
    );
  });
  builder.bar(
    "matte",
    palette.paleTimber,
    [barrow[0] - 0.2, 0.5, barrow[2]],
    [barrow[0] + 0.3, 1.2, barrow[2] - 0.1],
    0.04,
    4,
  );
  builder.box(
    "metal",
    palette.steel,
    [0.18, 0.24, 0.02],
    [barrow[0] + 0.33, 1.3, barrow[2] - 0.1],
  );
  /* A bicycle leaning on the house wall */
  const bike: Triple = [2.0, 0, houseTo + 0.3];
  [-0.45, 0.45].forEach((dx) => {
    builder.torus(
      "matte",
      palette.black,
      0.3,
      0.025,
      [bike[0] + dx, 0.32, bike[2]],
      "z",
      14,
    );
  });
  builder.bar(
    "paint",
    "#1f2d5c",
    [bike[0] - 0.45, 0.32, bike[2]],
    [bike[0], 0.62, bike[2]],
    0.04,
    4,
  );
  builder.bar(
    "paint",
    "#1f2d5c",
    [bike[0], 0.62, bike[2]],
    [bike[0] + 0.45, 0.32, bike[2]],
    0.04,
    4,
  );
  builder.bar(
    "paint",
    "#1f2d5c",
    [bike[0] - 0.1, 0.8, bike[2]],
    [bike[0] + 0.35, 0.85, bike[2]],
    0.04,
    4,
  );
  builder.box(
    "matte",
    palette.black,
    [0.22, 0.05, 0.1],
    [bike[0] - 0.1, 0.84, bike[2]],
  );
  /* Bushes and a row of hollyhocks along the house */
  [-2.4, -2.0].forEach((dx, index) => {
    builder.cylinder("matte", "#3f8a3a", {
      radius: 0.03,
      length: 1.3,
      at: [dx, 0.65, houseTo + 0.35],
      segments: 4,
    });
    [0.7, 0.9, 1.1, 1.3].forEach((up) => {
      builder.sphere(
        "matte",
        index === 0 ? "#e86a9a" : "#f2c84a",
        0.07,
        [dx, up, houseTo + 0.37],
        [1, 1, 1],
        5,
      );
    });
  });
  /* A coal bunker */
  builder.box("matte", "#6a6a66", [0.8, 0.7, 0.6], [-3.4, 0.35, houseTo + 0.4]);
  builder.box(
    "matte",
    "#55554f",
    [0.86, 0.06, 0.66],
    [-3.4, 0.72, houseTo + 0.4],
    [0.1, 0, 0],
  );
};

/* Moving parts */

const addShirt = (builder: AttractionBuilder, x: number, colour: string) => {
  builder.box("matte", colour, [0.5, 0.55, 0.03], [x, -0.33, 0]);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      colour,
      [0.2, 0.25, 0.03],
      [x + side * 0.3, -0.18, 0],
      [0, 0, side * 0.6],
    );
  });
  builder.box("matte", palette.white, [0.18, 0.06, 0.035], [x, -0.07, 0]);
};

const addPeg = (builder: AttractionBuilder, x: number) => {
  if (!builder.isFar) {
    builder.box("matte", palette.paleTimber, [0.03, 0.1, 0.05], [x, -0.02, 0]);
  }
};

const buildWashingLeft = (builder: AttractionBuilder) => {
  /* A white sheet, a striped shirt and a pair of grey trousers */
  builder.box("matte", "#f4f1ea", [1.2, 0.8, 0.02], [-2.3, -0.42, 0]);
  addPeg(builder, -2.85);
  addPeg(builder, -1.75);
  addShirt(builder, -1.15, "#8ab0d8");
  addPeg(builder, -1.35);
  addPeg(builder, -0.95);
  [-0.1, 0.1].forEach((dx) => {
    builder.box("matte", "#6a6a72", [0.17, 0.75, 0.03], [-0.45 + dx, -0.42, 0]);
  });
  builder.box("matte", "#6a6a72", [0.38, 0.12, 0.035], [-0.45, -0.07, 0]);
  addPeg(builder, -0.6);
  addPeg(builder, -0.3);
};

const buildWashingRight = (builder: AttractionBuilder) => {
  /* A frock, socks, a tea towel and a little jumper */
  builder.box("matte", "#d86a7a", [0.4, 0.5, 0.03], [0.4, -0.3, 0]);
  builder.cylinder("matte", "#d86a7a", {
    radius: 0.22,
    radiusEnd: 0.42,
    length: 0.4,
    at: [0.4, -0.72, 0],
    segments: 8,
  });
  addPeg(builder, 0.25);
  addPeg(builder, 0.55);
  [1.0, 1.2].forEach((x, index) => {
    builder.box(
      "matte",
      index === 0 ? "#3a4a7a" : "#7a3a3a",
      [0.1, 0.3, 0.03],
      [x, -0.17, 0],
    );
    builder.box(
      "matte",
      index === 0 ? "#3a4a7a" : "#7a3a3a",
      [0.16, 0.08, 0.03],
      [x + 0.04, -0.3, 0],
    );
    addPeg(builder, x);
  });
  builder.box("matte", "#f2e8c8", [0.45, 0.55, 0.02], [1.75, -0.3, 0]);
  if (!builder.isFar) {
    builder.box("matte", "#c8102e", [0.46, 0.05, 0.025], [1.75, -0.2, 0]);
    builder.box("matte", "#c8102e", [0.46, 0.05, 0.025], [1.75, -0.45, 0]);
  }
  addPeg(builder, 1.55);
  addPeg(builder, 1.95);
  addShirt(builder, 2.55, "#e8c84a");
  addPeg(builder, 2.35);
  addPeg(builder, 2.75);
};

const buildPinwheel = (builder: AttractionBuilder) => {
  const colours = ["#c8102e", "#f4f1ea", "#1f3a8a", "#f2c84a"];
  colours.forEach((colour, index) => {
    const angle = (index / 4) * Math.PI * 2;
    builder.box(
      "paint",
      colour,
      [0.32, 0.14, 0.015],
      [Math.cos(angle) * 0.17, Math.sin(angle) * 0.17, 0],
      [0, 0.4, angle],
    );
  });
  builder.sphere("metal", palette.brass, 0.04, [0, 0, 0.02], [1, 1, 1], 6);
};

const buildRabbit = (builder: AttractionBuilder) => {
  const fur = "#b89a7a";
  builder.sphere("matte", fur, 0.16, [0, 0.12, -0.04], [1, 0.95, 1.2], 10);
  builder.sphere("matte", fur, 0.11, [0, 0.28, 0.1], [1, 1, 1], 10);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      fur,
      0.05,
      [side * 0.05, 0.45, 0.07],
      [0.6, 2.2, 0.45],
      6,
    );
    builder.sphere(
      "matte",
      "#f2b8b8",
      0.03,
      [side * 0.05, 0.45, 0.085],
      [0.5, 1.9, 0.3],
      5,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [side * 0.06, 0.31, 0.19],
      [1, 1, 1],
      5,
    );
  });
  builder.sphere("matte", "#f2b8b8", 0.018, [0, 0.27, 0.21], [1, 1, 1], 4);
  builder.sphere("matte", palette.white, 0.05, [0, 0.12, -0.22], [1, 1, 1], 6);
};

const buildLitWindow = (builder: AttractionBuilder) => {
  builder.box("glow", palette.warmLight, [0.5, 0.78, 0.02], [0, 0, 0]);
};

/* Wanderers: hens, and cabbage white butterflies over the vegetables */

const buildHen = (builder: AttractionBuilder) => {
  const feather = "#a8582a";
  builder.sphere("matte", feather, 0.16, [0, 0.24, 0], [0.8, 0.85, 1.15], 10);
  builder.sphere("matte", feather, 0.08, [0, 0.4, 0.15], [1, 1, 1], 8);
  builder.box(
    "matte",
    shade(feather, 0.8),
    [0.06, 0.14, 0.12],
    [0, 0.32, -0.2],
    [0.5, 0, 0],
  );
  if (builder.isFar) {
    return;
  }
  builder.box("matte", "#d9302a", [0.025, 0.07, 0.08], [0, 0.48, 0.15]);
  builder.cylinder("matte", "#e8b03a", {
    radius: 0.025,
    radiusEnd: 0,
    length: 0.06,
    at: [0, 0.39, 0.24],
    axis: "z",
    segments: 4,
  });
  [-0.05, 0.05].forEach((dx) => {
    builder.bar("matte", "#e8b03a", [dx, 0.14, 0], [dx, 0, 0.02], 0.025, 3);
  });
};

const buildButterfly = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#f6f4ec",
      [0.1, 0.008, 0.08],
      [side * 0.055, 0, 0],
      [0, 0, side * 0.5],
    );
  });
  builder.box("matte", "#3a3a3a", [0.015, 0.015, 0.07], [0, 0, 0]);
};

/* The way into the shelter */

const followPath = (
  points: readonly (readonly [number, number, number, number?])[],
  progress: number,
): LocalSpot => {
  const legs = points.slice(1).map((to, index) => {
    const from = points[index];
    return {
      from,
      to,
      length:
        Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) +
        (from[3] ?? 0),
    };
  });
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  let left = Math.min(1, Math.max(0, progress)) * total;
  let heading = 0;
  for (const leg of legs) {
    const flat = Math.hypot(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    if (flat > 0.05) {
      heading = Math.atan2(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    }
    if (left <= leg.length || leg === legs[legs.length - 1]) {
      const wait = leg.from[3] ?? 0;
      const share = Math.min(
        1,
        Math.max(0, (left - wait) / Math.max(0.001, leg.length - wait)),
      );
      return {
        x: leg.from[0] + (leg.to[0] - leg.from[0]) * share,
        y: leg.from[1] + (leg.to[1] - leg.from[1]) * share,
        z: leg.from[2] + (leg.to[2] - leg.from[2]) * share,
        heading,
      };
    }
    left -= leg.length;
  }
  return { x: 0, y: 0, z: 0, heading };
};

const shelterStart = { x: shelterDoorX + 1.3, z: shelter.z };
const shelterFinish = { x: shelterDoorX + 1.5, z: shelter.z + 1.5 };
const shelterPath: readonly (readonly [number, number, number, number?])[] = [
  [shelterStart.x, 0, shelterStart.z],
  [shelterDoorX + 0.5, 0, shelter.z],
  [shelterDoorX, -0.25, shelter.z],
  [shelter.x - 0.2, -0.5, shelter.z, 4],
  [shelter.x - 0.25, -0.5, shelter.z + 0.01],
  [shelterDoorX, -0.25, shelter.z],
  [shelterDoorX + 0.5, 0, shelter.z],
  [shelterFinish.x, 0, shelterFinish.z],
];

const shelterRide: PlayRide = {
  id: "anderson-shelter",
  name: "the Anderson shelter",
  start: shelterStart,
  reach: 0.5,
  seconds: 10,
  finish: shelterFinish,
  follow: (progress) => followPath(shelterPath, progress),
};

export const homeFrontHouseModel: NewLandAttractionModel = {
  kind: "home-front-house",
  islandId: "starfall-isle",
  name: "Home Front House",
  fact: "In the Second World War, millions of British families dug an Anderson shelter into the garden: curved steel sheets half buried under earth, to keep them safe during air raids. Food was rationed, so the Dig for Victory campaign asked everyone to grow vegetables in gardens, parks and even on top of their shelters.",
  curriculumLink:
    "History, Key Stage 2: a study of an aspect or theme in British history that extends pupils' chronological knowledge beyond 1066 (Britain in the Second World War: life on the home front).",
  footprint,
  setting: "inland",
  signSpot: { x: 2.3, z: 8.9 },
  padColour: lawn,
  build: (builder) => {
    buildHouse(builder);
    buildShelter(builder);
    buildVegPatch(builder);
    buildHenRun(builder);
    buildGarden(builder);
    addSignBoard(builder, [2.3, 0, 8.2], signColour);
  },
  moving: [
    {
      name: "washing (left)",
      pivot: [0, lineHeight + 0.05, lineZ],
      build: buildWashingLeft,
      motion: { kind: "swing", axis: "x", amplitude: 0.22, period: 2.6 },
    },
    {
      name: "washing (right)",
      pivot: [0, lineHeight + 0.05, lineZ],
      build: buildWashingRight,
      motion: {
        kind: "swing",
        axis: "x",
        amplitude: 0.26,
        period: 2.2,
        phase: 1.3,
      },
    },
    {
      name: "bird scarer",
      pivot: [vegFrom.x + 0.25, 1.62, vegTo.z - 0.2],
      build: buildPinwheel,
      motion: { kind: "whirl", axis: "z", idle: 0.6, speed: 9, reach: 4 },
    },
    {
      name: "rabbit",
      pivot: [hutch.x + 0.2, -0.5, hutch.z + 0.95],
      build: buildRabbit,
      motion: { kind: "rise", reach: 3.5, height: 0.5, period: 1.4 },
    },
    {
      name: "lit window",
      pivot: [1.25, 3.55, houseTo + 0.05],
      build: buildLitWindow,
      motion: { kind: "wake", reach: 7 },
    },
  ],
  wanderers: [
    {
      name: "hens",
      build: buildHen,
      count: 3,
      centre: {
        x: (henRun.minX + henRun.maxX) / 2 - 0.2,
        z: (henRun.minZ + henRun.maxZ) / 2 + 0.2,
      },
      radius: 0.75,
      speed: 0.4,
    },
    {
      name: "cabbage white butterflies",
      build: buildButterfly,
      count: 3,
      centre: { x: (vegFrom.x + vegTo.x) / 2, z: (vegFrom.z + vegTo.z) / 2 },
      radius: 1.6,
      speed: 0.8,
      height: 0.7,
      bob: 0.25,
    },
  ],
  smoke: [
    {
      at: [-(houseHalf - 0.45) - 0.14, eaves + 2.7, (houseFrom + houseTo) / 2],
      colour: "#d8d4cc",
      puffs: 6,
      size: 0.3,
      rise: 2.2,
      spread: 0.5,
    },
  ],
  rides: [shelterRide],
  tune: [67, 67, 69, 67, 64, 67, 72, 71, 69, 67],
  play: {
    label: "Listen to the wireless",
    news: "The wireless crackled into life with the evening news and a jolly dance band, just as families gathered round to listen in the 1940s.",
  },
};
