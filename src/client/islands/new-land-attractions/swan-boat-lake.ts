import { ConeGeometry, CylinderGeometry } from "three";
import {
  addBench,
  addBush,
  addDoor,
  addGableRoof,
  addLampPost,
  addSignBoard,
  addTree,
  addWindow,
  buildFlatDeck,
  findMotionPose,
  listWallBlockers,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addFlowerClump,
  addGableEnd,
  meadowColours,
} from "./village-fete-parts.js";

const swanWhite = "#f6f3ea";
const beakOrange = "#e8792a";
const boatTeal = "#2f8f8a";
const seatRed = "#c8473a";
const trimGreen = "#2f5d43";
const boathouseCream = "#efe2bf";
const lakeBed = "#2d6a5c";
const lakeWater = "#4fa6b8";
const bankStone = "#a9a08c";
const reedGreen = "#5f8a3a";
const rushBrown = "#6b4423";
const lilyGreen = "#4c8f3c";
const lilyPink = "#f2a7c0";
const jettyPlank = "#a8825a";
const awningBlue = "#3f7fc0";
const signColour = "#2f7d8a";

/* The lake: an oval, its middle a little behind the centre */
const lake = { x: 0, z: -1.2, rx: 5.6, rz: 4.2 };
const waterHeight = 0.07;
const islandAt = { x: 0, z: -1.6 };
const islandRadius = 1.05;

/* The swan boats go round and round the island */
const boatRadius = 3.0;
const boatPivot: Triple = [islandAt.x, waterHeight, islandAt.z];
const boatMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: boatRadius,
  count: 3,
  speed: -0.33,
  isFacingAlong: true,
  bob: 0.03,
};
const seatHeight = 0.24;

/* The jetty reaches out from the front shore to meet them */
const jetty = { minX: -0.6, maxX: 0.6, minZ: 1.85, maxZ: 4.4 };
const jettyHeight = 0.28;
const jettyEnd = { x: 0, z: 2.15 };
const jettyFinish = { x: 0, z: 4.0 };

const boathouse = { x: -5.75, z: -1.3, width: 2.2, depth: 2.6, height: 1.7 };
const kioskAt = { x: 3.7, z: 5.0 };
const fountainAt: Triple = [4.05, waterHeight, -1.3];
const swanAt: Triple = [-0.8, 0.22, -0.9];
const frogAt: Triple = [-1.7, waterHeight + 0.01, 2.05];
const signAt = { x: -2.2, z: 8.4 };

/** A point on the lake's edge, at an angle round it (0 is the front). */
const lakeEdge = (angle: number, out = 0): { x: number; z: number } => ({
  x: lake.x + Math.sin(angle) * (lake.rx + out),
  z: lake.z + Math.cos(angle) * (lake.rz + out),
});

const buildLake = (builder: AttractionBuilder) => {
  const segments = builder.segments(44, 20);
  /* A shallow bed, the water over it, and a low stone kerb round the edge */
  builder.add(
    "matte",
    lakeBed,
    new CylinderGeometry(1, 1, 0.04, segments),
    { at: [lake.x, 0.02, lake.z], scale: [lake.rx, 1, lake.rz] },
    undefined,
  );
  builder.add(
    "water",
    lakeWater,
    new CylinderGeometry(1, 1, 0.03, segments),
    { at: [lake.x, waterHeight, lake.z], scale: [lake.rx, 1, lake.rz] },
    undefined,
  );
  const stones = builder.isFar ? 16 : 40;
  for (let stone = 0; stone < stones; stone++) {
    const angle = (stone / stones) * Math.PI * 2;
    const { x, z } = lakeEdge(angle, 0.1);
    if (Math.abs(x) < 0.85 && z > 0) {
      continue;
    }
    if (x < -4.3 && Math.abs(z - boathouse.z) < boathouse.depth / 2 + 0.1) {
      continue;
    }
    builder.box(
      "matte",
      shade(bankStone, 0.9 + (stone % 3) * 0.07),
      [0.66, 0.16, 0.36],
      [x, 0.08, z],
      [0, angle + Math.PI / 2, 0],
    );
  }
};

const buildIsland = (builder: AttractionBuilder) => {
  const { x, z } = islandAt;
  builder.lathe(
    "matte",
    meadowColours.meadow,
    [
      [0, 0.42],
      [0.5, 0.38],
      [0.85, 0.25],
      [islandRadius, 0.08],
      [islandRadius + 0.1, 0],
    ],
    [x, 0, z],
    "y",
    24,
  );
  /* A weeping willow, its long branches trailing to the water */
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.16,
    radiusEnd: 0.1,
    length: 1.9,
    at: [x + 0.1, 1.3, z - 0.2],
    segments: 8,
  });
  builder.sphere(
    "matte",
    "#7fa84a",
    1.05,
    [x + 0.1, 2.45, z - 0.2],
    [1, 0.6, 1],
    14,
  );
  const fronds = builder.isFar ? 6 : 16;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2;
    const reach = frond % 2 === 0 ? 0.95 : 0.75;
    builder.add(
      "matte",
      frond % 2 === 0 ? "#86b350" : "#6f9a42",
      new ConeGeometry(0.24, 1.9, builder.isFar ? 4 : 5, 1, true),
      {
        at: [
          x + 0.1 + Math.sin(angle) * reach,
          1.5 + (frond % 3) * 0.08,
          z - 0.2 + Math.cos(angle) * reach,
        ],
        rotation: [Math.cos(angle) * 0.18, 0, -Math.sin(angle) * 0.18],
      },
    );
  }
  if (builder.isFar) {
    return;
  }
  /* The swans' nest of sticks, with two fluffy grey cygnets */
  builder.torus(
    "matte",
    "#8a6a45",
    0.22,
    0.08,
    [x + 0.55, 0.42, z + 0.45],
    "y",
    14,
  );
  [-0.08, 0.1].forEach((dx, index) => {
    builder.sphere(
      "matte",
      "#9a958c",
      0.08,
      [x + 0.55 + dx, 0.5, z + 0.45 + index * 0.06],
      [1, 0.8, 1.2],
      8,
    );
    builder.sphere(
      "matte",
      "#9a958c",
      0.045,
      [x + 0.55 + dx, 0.6, z + 0.52 + index * 0.06],
      [1, 1, 1],
      6,
    );
  });
};

const buildJetty = (builder: AttractionBuilder) => {
  const length = jetty.maxZ - jetty.minZ;
  const middleZ = (jetty.minZ + jetty.maxZ) / 2;
  if (builder.isFar) {
    builder.box(
      "matte",
      jettyPlank,
      [1.2, 0.08, length],
      [0, jettyHeight - 0.04, middleZ],
    );
  } else {
    const planks = 14;
    for (let plank = 0; plank < planks; plank++) {
      builder.box(
        "matte",
        shade(jettyPlank, 0.92 + (plank % 3) * 0.06),
        [1.2, 0.06, length / planks - 0.025],
        [0, jettyHeight - 0.03, jetty.minZ + (length / planks) * (plank + 0.5)],
      );
    }
  }
  [-0.55, 0.55].forEach((x) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 0.12, length],
      [x, jettyHeight - 0.12, middleZ],
    );
    [jetty.minZ + 0.1, middleZ, jetty.maxZ - 0.1].forEach((z, index) => {
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.07,
        length: index === 0 ? 0.6 : jettyHeight,
        at: [x, index === 0 ? 0.3 : jettyHeight / 2, z],
        segments: 8,
      });
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Mooring rings, and a red-and-white life ring on a post */
  [-0.55, 0.55].forEach((x) => {
    builder.torus(
      "metal",
      palette.brass,
      0.06,
      0.012,
      [x, 0.52, jetty.minZ + 0.18],
      "z",
      10,
    );
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 1.25,
    at: [-1.0, 0.62, 4.6],
    segments: 8,
  });
  builder.torus(
    "paint",
    palette.white,
    0.18,
    0.05,
    [-1.0, 0.95, 4.66],
    "z",
    16,
  );
  [0, 1, 2, 3].forEach((quarter) => {
    const angle = (quarter * Math.PI) / 2 + Math.PI / 4;
    builder.box(
      "paint",
      palette.postRed,
      [0.07, 0.11, 0.11],
      [-1.0 + Math.cos(angle) * 0.18, 0.95 + Math.sin(angle) * 0.18, 4.66],
      [0, 0, angle],
    );
  });
};

const buildBoathouse = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = boathouse;
  const back = x - width / 2;
  const front = x + width / 2;
  /* Back wall and two side walls; the end facing the lake stands open */
  builder.box(
    "paint",
    boathouseCream,
    [0.12, height, depth],
    [back, height / 2, z],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      boathouseCream,
      [width, height, 0.12],
      [x, height / 2, z + (side * depth) / 2],
    );
    builder.box(
      "paint",
      trimGreen,
      [0.14, height + 0.05, 0.16],
      [front, height / 2, z + (side * depth) / 2],
    );
    if (!builder.isFar) {
      /* Weatherboards along each side */
      for (let board = 1; board < 7; board++) {
        builder.box(
          "paint",
          shade(boathouseCream, 0.88),
          [width - 0.02, 0.03, 0.03],
          [x, (height / 7) * board, z + side * (depth / 2 + 0.06)],
        );
      }
    }
  });
  builder.box(
    "paint",
    trimGreen,
    [0.14, 0.18, depth + 0.1],
    [front, height - 0.05, z],
  );
  [back, front].forEach((end) => {
    addGableEnd(builder, "paint", boathouseCream, {
      at: [end, height, z],
      width: depth,
      rise: 0.85,
    });
  });
  addGableRoof(builder, {
    width: width + 0.1,
    depth,
    rise: 0.85,
    at: [x, height, z],
    colour: palette.roofTile,
    thickness: 0.1,
  });
  builder.box(
    "paint",
    trimGreen,
    [width + 0.5, 0.08, 0.1],
    [x, height + 0.88, z],
  );
  if (builder.isFar) {
    return;
  }
  addWindow(builder, {
    at: [x, 1.0, z + depth / 2 + 0.07],
    width: 0.6,
    height: 0.45,
  });
  addWindow(builder, {
    at: [x, 1.0, z - depth / 2 - 0.07],
    width: 0.6,
    height: 0.45,
    turn: Math.PI,
  });
  addDoor(builder, {
    at: [back - 0.06, 0, z + 0.5],
    colour: trimGreen,
    turn: -Math.PI / 2,
  });
  /* A round window in the gable, over the open boat door */
  builder.cylinder("glass", palette.glass, {
    radius: 0.2,
    length: 0.04,
    at: [front + 0.06, height + 0.35, z],
    axis: "x",
    segments: 14,
  });
  builder.torus(
    "paint",
    palette.white,
    0.2,
    0.04,
    [front + 0.08, height + 0.35, z],
    "x",
    14,
  );
  /* A slipway inside, with the oars racked on the wall */
  builder.box(
    "matte",
    jettyPlank,
    [width - 0.3, 0.06, 0.5],
    [x, jettyHeight - 0.03, z - depth / 2 + 0.4],
  );
  [-0.25, 0, 0.25].forEach((dx) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      [x + dx, 0.4, z - depth / 2 + 0.1],
      [x + dx + 0.1, 1.5, z - depth / 2 + 0.1],
      0.04,
      5,
    );
    builder.box(
      "paint",
      seatRed,
      [0.1, 0.25, 0.02],
      [x + dx + 0.1, 1.45, z - depth / 2 + 0.11],
    );
  });
};

/** One swan boat, facing +z, floating on y = 0, its seat in the middle. */
const buildSwanBoat = (builder: AttractionBuilder) => {
  const far = builder.isFar;
  /* The white hull, a deep, round-ended tub */
  builder.sphere(
    "paint",
    swanWhite,
    0.5,
    [0, 0.12, -0.05],
    [0.82, 0.48, 1.25],
    far ? 8 : 12,
  );
  builder.cylinder("paint", boatTeal, {
    radius: 0.36,
    radiusEnd: 0.4,
    length: 0.1,
    at: [0, 0.32, -0.05],
    segments: far ? 8 : 18,
  });
  /* The tall curved neck and head at the front */
  const neck: Triple[] = [
    [0, 0.3, 0.5],
    [0, 0.6, 0.62],
    [0, 0.9, 0.58],
    [0, 1.08, 0.46],
    [0, 1.12, 0.36],
  ];
  for (let joint = 0; joint < neck.length - 1; joint++) {
    builder.bar(
      "paint",
      swanWhite,
      neck[joint],
      neck[joint + 1],
      0.17 - joint * 0.02,
      far ? 6 : 10,
    );
  }
  builder.sphere(
    "paint",
    swanWhite,
    0.12,
    [0, 1.12, 0.42],
    [0.9, 0.9, 1.25],
    far ? 6 : 12,
  );
  if (!far) {
    builder.add(
      "paint",
      beakOrange,
      new ConeGeometry(0.05, 0.2, 8).rotateX(Math.PI / 2),
      { at: [0, 1.09, 0.6] },
    );
    builder.sphere(
      "paint",
      palette.black,
      0.04,
      [0, 1.12, 0.52],
      [0.8, 1, 1],
      8,
    );
    [-1, 1].forEach((side) => {
      builder.sphere(
        "paint",
        palette.black,
        0.022,
        [side * 0.085, 1.15, 0.47],
        [1, 1, 1],
        6,
      );
    });
  }
  /* Wings swept up round the seat like arms */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      shade(swanWhite, 0.96),
      0.36,
      [side * 0.4, 0.4, -0.2],
      [0.18, 0.55, 1],
      far ? 6 : 9,
    );
    if (!far) {
      [0, 1, 2].forEach((feather) => {
        builder.box(
          "paint",
          shade(swanWhite, 0.9),
          [0.03, 0.06, 0.3],
          [side * 0.46, 0.5 - feather * 0.1, -0.4 + feather * 0.04],
          [0.4 + feather * 0.2, 0, 0],
        );
      });
    }
  });
  /* A tail flicked up at the back */
  builder.add(
    "paint",
    swanWhite,
    new ConeGeometry(0.2, 0.35, far ? 5 : 8).rotateX(-Math.PI / 2 - 0.6),
    { at: [0, 0.42, -0.66] },
  );
  if (far) {
    return;
  }
  /* A red bench seat and the pedals' housing */
  builder.box("paint", seatRed, [0.56, 0.08, 0.3], [0, 0.3, -0.2]);
  builder.box(
    "paint",
    seatRed,
    [0.56, 0.3, 0.07],
    [0, 0.45, -0.36],
    [-0.2, 0, 0],
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.05,
    length: 0.5,
    at: [0, 0.3, 0.2],
    axis: "x",
    segments: 8,
  });
  builder.box("paint", boatTeal, [0.2, 0.04, 0.6], [0, 0.34, 0.1]);
};

/** A real swan by the island, dipping its head; its pivot is at its body. */
const buildSwan = (builder: AttractionBuilder) => {
  builder.sphere("matte", swanWhite, 0.22, [0, 0.1, 0], [0.85, 0.6, 1.3], 12);
  builder.sphere(
    "matte",
    shade(swanWhite, 0.95),
    0.16,
    [0, 0.17, -0.1],
    [1.05, 0.55, 1.2],
    10,
  );
  builder.bar("matte", swanWhite, [0, 0.15, 0.22], [0, 0.42, 0.28], 0.07, 6);
  builder.bar("matte", swanWhite, [0, 0.42, 0.28], [0, 0.56, 0.22], 0.06, 6);
  builder.sphere("matte", swanWhite, 0.055, [0, 0.57, 0.26], [1, 1, 1.3], 8);
  builder.cylinder("matte", beakOrange, {
    radius: 0.025,
    radiusEnd: 0.006,
    length: 0.12,
    at: [0, 0.55, 0.36],
    axis: "z",
    segments: 6,
  });
  builder.box("matte", palette.black, [0.07, 0.04, 0.04], [0, 0.575, 0.31]);
};

/** A fountain jet in the lake, leaping up as the Character comes near. */
const buildFountainJet = (builder: AttractionBuilder) => {
  builder.cylinder("water", "#bfe6f2", {
    radius: 0.08,
    radiusEnd: 0.03,
    length: 2.4,
    at: [0, 1.2, 0],
    segments: 10,
  });
  /* A crown of spray falling back in arcs all round */
  builder.sphere("water", "#e4f5fa", 0.16, [0, 2.4, 0], [1, 1.4, 1], 10);
  const arcs = builder.isFar ? 4 : 8;
  for (let arc = 0; arc < arcs; arc++) {
    const angle = (arc / arcs) * Math.PI * 2;
    const point = (reach: number, drop: number): Triple => [
      Math.sin(angle) * reach,
      2.35 - drop,
      Math.cos(angle) * reach,
    ];
    builder.bar("water", "#d7f0f7", point(0.05, 0), point(0.35, 0.25), 0.05, 4);
    builder.bar(
      "water",
      "#d7f0f7",
      point(0.35, 0.25),
      point(0.5, 1.0),
      0.04,
      4,
    );
    builder.bar(
      "water",
      "#d7f0f7",
      point(0.5, 1.0),
      point(0.55, 2.2),
      0.035,
      4,
    );
  }
  builder.cylinder("water", "#d7f0f7", {
    radius: 0.55,
    radiusEnd: 0.25,
    length: 0.25,
    at: [0, 0.12, 0],
    segments: 14,
    isOpen: true,
  });
};

/** A green frog that pops up onto its lily pad. */
const buildFrog = (builder: AttractionBuilder) => {
  const green = "#5ea83a";
  builder.sphere("paint", green, 0.12, [0, 0.08, 0], [1, 0.7, 1.15], 10);
  builder.sphere("paint", green, 0.08, [0, 0.14, 0.08], [1.2, 0.8, 1], 8);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.035,
      [side * 0.05, 0.2, 0.1],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.018,
      [side * 0.05, 0.21, 0.13],
      [1, 1, 1],
      5,
    );
    builder.sphere(
      "paint",
      shade(green, 0.85),
      0.06,
      [side * 0.11, 0.04, -0.04],
      [0.6, 0.5, 1.4],
      6,
    );
  });
  builder.box("paint", "#c9e07a", [0.1, 0.02, 0.1], [0, 0.03, 0.06]);
};

const buildWeathervane = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.black, {
    radius: 0.02,
    length: 0.5,
    at: [0, 0.25, 0],
    segments: 6,
  });
  builder.box("metal", palette.black, [0.04, 0.03, 0.7], [0, 0.42, 0]);
  builder.add(
    "metal",
    palette.black,
    new ConeGeometry(0.08, 0.16, 4).rotateX(Math.PI / 2),
    { at: [0, 0.42, 0.42] },
  );
  /* A little swan cut out of metal, of course */
  builder.sphere(
    "metal",
    palette.black,
    0.1,
    [0, 0.55, -0.15],
    [0.4, 0.7, 1.3],
  );
  builder.bar("metal", palette.black, [0, 0.55, -0.05], [0, 0.75, 0], 0.04, 5);
  builder.box(
    "metal",
    palette.black,
    [0.02, 0.18, 0.26],
    [0, 0.45, -0.3],
    [0.4, 0, 0],
  );
};

const buildReeds = (builder: AttractionBuilder, at: Triple, seed: number) => {
  const stems = builder.isFar ? 0 : 7;
  if (builder.isFar) {
    builder.add("matte", reedGreen, new ConeGeometry(0.25, 0.9, 5), {
      at: [at[0], 0.45, at[2]],
    });
    return;
  }
  for (let stem = 0; stem < stems; stem++) {
    const angle = stem * 2.4 + seed;
    const reach = 0.08 + (stem % 3) * 0.08;
    const x = at[0] + Math.sin(angle) * reach;
    const z = at[2] + Math.cos(angle) * reach;
    const height = 0.7 + ((stem + seed) % 4) * 0.12;
    const lean = Math.sin(angle) * 0.08;
    builder.bar(
      "matte",
      shade(reedGreen, 0.9 + (stem % 3) * 0.08),
      [x, 0, z],
      [x + lean, height, z],
      0.025,
      3,
    );
    if (stem % 2 === 0) {
      builder.cylinder("matte", rushBrown, {
        radius: 0.035,
        length: 0.16,
        at: [x + lean * 0.9, height - 0.12, z],
        segments: 6,
      });
    }
  }
};

const buildLilies = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const pads: [number, number, number][] = [
    [-1.7, 2.05, 0.26],
    [-1.25, 1.75, 0.16],
    [2.6, -4.3, 0.22],
    [3.1, -3.9, 0.18],
    [-3.8, -3.6, 0.22],
    [1.9, 1.6, 0.18],
  ];
  pads.forEach(([x, z, radius], index) => {
    builder.cylinder("paint", lilyGreen, {
      radius,
      length: 0.015,
      at: [x, waterHeight + 0.02, z],
      segments: 9,
    });
    if (index % 2 === 1) {
      builder.add(
        "paint",
        lilyPink,
        new ConeGeometry(0.07, 0.08, 6).rotateX(Math.PI),
        { at: [x + radius * 0.3, waterHeight + 0.07, z] },
      );
    }
  });
};

const buildKiosk = (builder: AttractionBuilder) => {
  const { x, z } = kioskAt;
  builder.box("paint", palette.cream, [1.5, 1.4, 1.2], [x, 0.7, z]);
  builder.box("paint", trimGreen, [1.6, 0.12, 1.3], [x, 0.06, z]);
  builder.box("paint", trimGreen, [1.62, 0.1, 1.32], [x, 1.45, z]);
  addGableRoof(builder, {
    width: 1.5,
    depth: 1.2,
    rise: 0.5,
    at: [x, 1.45, z],
    colour: palette.roofTile,
    turn: Math.PI / 2,
  });
  /* The serving hatch faces the jetty, under a striped awning */
  builder.box("glass", palette.glass, [0.04, 0.5, 0.8], [x - 0.76, 0.98, z]);
  builder.box("paint", trimGreen, [0.3, 0.06, 0.95], [x - 0.88, 0.7, z]);
  const stripes = builder.isFar ? 1 : 6;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? awningBlue : palette.white,
      [0.6, 0.03, 1.2 / stripes],
      [x - 1.0, 1.3, z - 0.6 + (1.2 / stripes) * (stripe + 0.5)],
      [0, 0, 0.35],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* A price board, and a giant ice cream cone on the roof */
  builder.box(
    "matte",
    palette.black,
    [0.04, 0.5, 0.4],
    [x - 0.12, 0.85, z + 0.62],
  );
  builder.box(
    "paint",
    palette.white,
    [0.3, 0.04, 0.02],
    [x - 0.12, 0.95, z + 0.645],
  );
  builder.box(
    "paint",
    palette.white,
    [0.24, 0.04, 0.02],
    [x - 0.12, 0.82, z + 0.645],
  );
  builder.add(
    "paint",
    "#d9a35a",
    new ConeGeometry(0.15, 0.4, 10).rotateX(Math.PI),
    { at: [x, 2.15, z] },
  );
  builder.sphere("paint", "#f6d6e0", 0.17, [x, 2.4, z], [1, 0.9, 1], 12);
  builder.sphere("paint", "#8a4a2a", 0.05, [x + 0.05, 2.55, z], [1, 1, 1], 6);
  addWindow(builder, {
    at: [x, 0.95, z + 0.61],
    width: 0.45,
    height: 0.4,
    frame: trimGreen,
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A gravel path from the sign down to the jetty, and along the front */
  builder.box("matte", palette.path, [1.5, 0.03, 4.6], [-0.4, 0.015, 6.6]);
  builder.box("matte", palette.path, [7.4, 0.03, 1.3], [0.3, 0.016, 4.95]);
  builder.box("matte", palette.path, [1.2, 0.03, 1.4], [-1.6, 0.017, 8.4]);
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  addTree(builder, [6.4, 0, -5.6], 1.2);
  if (builder.isFar) {
    return;
  }
  addBench(builder, [-2.6, 0, 4.0], Math.PI * 0.95);
  addBench(builder, [2.0, 0, 4.0], Math.PI * 1.05);
  addBench(builder, [6.4, 0, 0.6], -Math.PI / 2);
  addLampPost(builder, [-1.2, 0, 5.8]);
  addLampPost(builder, [1.4, 0, 5.8]);
  addLampPost(builder, [5.9, 0, 3.2]);
  addBush(builder, [5.6, 0, 6.8], 0.55);
  addBush(builder, [-5.2, 0, 6.6], 0.5, "#3a7d34");
  addFlowerClump(
    builder,
    [-3.6, 0, 5.4],
    [meadowColours.rose, meadowColours.butter, palette.white],
  );
  addFlowerClump(
    builder,
    [2.6, 0, 6.6],
    [meadowColours.cornflower, meadowColours.butter],
  );
  addFlowerClump(builder, [6.8, 0, 1.9], [meadowColours.poppy, palette.white]);
  [
    [-4.9, 1.6],
    [-3.2, 2.5],
    [4.6, 0.9],
    [1.7, 2.6],
  ].forEach(([x, z], index) => {
    buildReeds(builder, [x, 0, z], index);
  });
  buildLilies(builder);
  /* The fountain's stone bowl, just showing above the water */
  builder.cylinder("matte", bankStone, {
    radius: 0.42,
    radiusEnd: 0.32,
    length: 0.16,
    at: [fountainAt[0], 0.08, fountainAt[2]],
    segments: 16,
  });
};

/* Hop off the jetty into a swan boat, pedal round the island, and back */
const boatRide = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(boatMotion, seconds, { copy: 0 });
  const [x, y, z] = moveWithPose(
    boatPivot,
    [boatPivot[0], boatPivot[1] + seatHeight, boatPivot[2] - 0.2],
    pose,
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? jettyEnd : jettyFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: jettyHeight + (y - jettyHeight) * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1],
  };
};

const buildDuck = (builder: AttractionBuilder) => {
  const brown = "#8a6a4a";
  builder.sphere("matte", brown, 0.12, [0, 0.06, 0], [0.85, 0.55, 1.25], 8);
  builder.sphere("matte", "#2f6b3a", 0.06, [0, 0.18, 0.11], [1, 1, 1.1], 7);
  builder.box("matte", "#e8b23a", [0.05, 0.02, 0.07], [0, 0.17, 0.18]);
  builder.box(
    "matte",
    shade(brown, 0.75),
    [0.05, 0.05, 0.08],
    [0, 0.1, -0.15],
    [-0.5, 0, 0],
  );
};

export const swanBoatLakeModel: NewLandAttractionModel = {
  kind: "swan-boat-lake",
  islandId: "meadow-isle",
  name: "Swan Boat Lake",
  fact: "A swan is a bird: it has feathers, two wings, two legs and a beak, and it lays eggs. Its webbed feet push the water like paddles, which is just how you pedal a swan boat along. Baby swans are called cygnets and are fluffy and grey.",
  curriculumLink:
    "Science, Year 1: animals, including humans. Identify and name a variety of common animals, including birds, and describe and compare their structure.",
  footprint: 9.5,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildLake(builder);
    buildIsland(builder);
    buildJetty(builder);
    buildBoathouse(builder);
    buildKiosk(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "swan-boats",
      pivot: boatPivot,
      build: buildSwanBoat,
      motion: boatMotion,
    },
    {
      name: "swan",
      pivot: swanAt,
      build: buildSwan,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.45,
        period: 2.2,
      },
    },
    {
      name: "fountain",
      pivot: fountainAt,
      build: buildFountainJet,
      motion: { kind: "splash", reach: 7, period: 1.6 },
    },
    {
      name: "frog",
      pivot: frogAt,
      build: buildFrog,
      motion: { kind: "rise", reach: 4, height: 0.12, period: 0.9 },
    },
    {
      name: "weathervane",
      pivot: [boathouse.x, boathouse.height + 0.92, boathouse.z],
      build: buildWeathervane,
      motion: { kind: "whirl", axis: "y", idle: 0.2, speed: 3, reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "ducks",
      build: buildDuck,
      count: 5,
      centre: { x: lake.x, z: lake.z - 0.3 },
      radius: 3.4,
      speed: 0.3,
      height: waterHeight,
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: boathouse.x - 0.6, z: boathouse.z - 0.9 },
      { x: boathouse.x - 0.6, z: boathouse.z + 0.9 },
      0.75,
      0.6,
    ),
    { x: kioskAt.x, z: kioskAt.z, radius: 0.9 },
    { x: islandAt.x, z: islandAt.z, radius: islandRadius },
  ],
  decks: [
    buildFlatDeck(
      {
        minX: jetty.minX,
        maxX: jetty.maxX,
        minZ: jetty.minZ,
        maxZ: jetty.maxZ,
      },
      jettyHeight,
    ),
  ],
  rides: [
    {
      id: "swan-boats",
      name: "the swan boats",
      start: jettyEnd,
      reach: 0.6,
      seconds: 16,
      finish: jettyFinish,
      follow: boatRide,
    },
  ],
  play: {
    label: "Wave at the swans",
    news: "You waved, and the swans waved back with a flap of their great white wings, while the swan boats pedalled round the island.",
  },
};
