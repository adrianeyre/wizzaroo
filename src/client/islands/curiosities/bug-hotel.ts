import { BoxGeometry, CircleGeometry, TorusGeometry } from "three";
import {
  addGableRoof,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const palletTimber = "#c9a06a";
const palletShadow = "#9c7648";
const roofFelt = "#3f6b3a";
const brickRed = "#b5523a";
const holeDark = "#2a1d14";
const logBark = "#6e4b2e";
const logFace = "#dcbc88";
const bamboo = "#d8c27a";
const bambooNode = "#a8924e";
const straw = "#e8cf6a";
const pineCone = "#8a5a32";
const ladybirdRed = "#d7262b";
const leafLitter = "#c9732e";
const barkChip = "#8a6a48";
const beetleBrown = "#3a2418";
const caterpillarGreen = "#7fc24a";
const signColour = "#5e7d2f";

/* The hotel stands at the back, its open front facing visitors */
const hotel = { x: 0, z: -0.8, width: 2.3, depth: 0.9 };
const front = hotel.z + hotel.depth / 2;
const tiers = 4;
const palletThickness = 0.14;
const tierHeight = 0.52;
const hotelTop = tiers * tierHeight;
const roofRise = 0.5;
const holeAt = { x: -0.75, z: 0.45 };
const magnifierAt = { x: 1.45, z: 0.75 };
const stagRise = 0.32;

/** A small steady random, so the meadow is the same every time. */
const makeRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

/* ------------------------------------------------------------------ */
/* The pallet frame and roof                                           */
/* ------------------------------------------------------------------ */

const buildPallet = (builder: AttractionBuilder, base: number) => {
  const { x, z, width, depth } = hotel;
  if (builder.isFar) {
    builder.box(
      "matte",
      palletTimber,
      [width, palletThickness, depth],
      [x, base + palletThickness / 2, z],
    );
    return;
  }
  /* Three stringers run along the front, middle and back */
  [-1, 0, 1].forEach((row) => {
    builder.box(
      "matte",
      palletShadow,
      [width, 0.08, 0.1],
      [x, base + 0.04, z + row * (depth / 2 - 0.05)],
    );
  });
  /* Deck boards across them, their ends showing at the front */
  const boards = 7;
  for (let board = 0; board < boards; board++) {
    builder.box(
      "matte",
      shade(palletTimber, board % 3 === 0 ? 0.92 : board % 3 === 1 ? 1.06 : 1),
      [(width / boards) * 0.82, 0.05, depth + 0.02],
      [
        x - width / 2 + (width / boards) * (board + 0.5),
        base + palletThickness - 0.025,
        z,
      ],
    );
  }
};

const buildFrame = (builder: AttractionBuilder) => {
  const { x, z, width, depth } = hotel;
  for (let tier = 0; tier < tiers; tier++) {
    buildPallet(builder, tier * tierHeight);
  }
  /* A back board, and side boards holding the stack together */
  builder.box(
    "matte",
    palletShadow,
    [width, hotelTop, 0.05],
    [x, hotelTop / 2, z - depth / 2 + 0.025],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palletTimber,
      [0.07, hotelTop + 0.05, depth + 0.04],
      [x + side * (width / 2 + 0.035), (hotelTop + 0.05) / 2, z],
    );
    if (builder.isFar) {
      return;
    }
    [0.3, 1.0, 1.7].forEach((y) => {
      builder.box(
        "matte",
        palletShadow,
        [0.08, 0.12, depth + 0.06],
        [x + side * (width / 2 + 0.04), y, z],
      );
    });
  });
  /* A top board under the roof */
  builder.box(
    "matte",
    palletTimber,
    [width + 0.14, 0.06, depth + 0.04],
    [x, hotelTop + 0.03, z],
  );
  addGableRoof(builder, {
    width: width + 0.1,
    depth: depth + 0.1,
    rise: roofRise,
    at: [x, hotelTop + 0.06, z],
    colour: roofFelt,
    overhang: 0.18,
    thickness: 0.08,
  });
  /* The gable end filled with boards, a diamond prism whose top half shows */
  const halfDiagonal = (depth + 0.1) / 2;
  builder.add(
    "matte",
    palletTimber,
    new BoxGeometry(width, halfDiagonal * Math.SQRT2, halfDiagonal * Math.SQRT2)
      .rotateX(Math.PI / 4)
      .scale(1, (roofRise - 0.02) / halfDiagonal, 1),
    { at: [x, hotelTop + 0.06, z] },
    undefined,
  );
  if (builder.isFar) {
    return;
  }
  /* Little tufts of sedum growing on the roof ridge */
  [-0.8, -0.25, 0.35, 0.9].forEach((along, index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#8fbf4a" : "#c46a8a",
      0.12,
      [x + along, hotelTop + roofRise + 0.1, z],
      [1.3, 0.55, 1],
      7,
    );
  });
};

/* ------------------------------------------------------------------ */
/* What fills each floor                                               */
/* ------------------------------------------------------------------ */

/** The floor space of a tier: its bottom, and the front of its rooms. */
const floorOf = (tier: number) => tier * tierHeight + palletThickness;
const roomHeight = tierHeight - palletThickness;

const buildDivider = (builder: AttractionBuilder, tier: number, x: number) => {
  builder.box(
    "matte",
    palletShadow,
    [0.05, roomHeight, hotel.depth - 0.05],
    [x, floorOf(tier) + roomHeight / 2, hotel.z],
  );
};

/** A flat round face looking out of the front, such as a sawn log end. */
const addDisc = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  radius: number,
  segments: number,
) => {
  builder.add("matte", colour, new CircleGeometry(radius, segments), { at });
};

/** A dark hole facing the front, drilled or hollow. */
const addHole = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  segments = 6,
) => {
  addDisc(builder, holeDark, at, radius, segments);
};

const buildBricks = (
  builder: AttractionBuilder,
  fromX: number,
  toX: number,
) => {
  const floor = floorOf(0);
  const brickWidth = (toX - fromX - 0.04) / 2;
  [0, 1].forEach((column) => {
    [0, 1].forEach((row) => {
      const x = fromX + 0.02 + brickWidth * (column + 0.5);
      const y = floor + 0.09 + row * 0.18;
      builder.box(
        "matte",
        shade(brickRed, row === column ? 1 : 0.88),
        [brickWidth - 0.02, 0.17, 0.5],
        [x, y, front - 0.25],
      );
      [-1, 0, 1].forEach((hole) => {
        addHole(
          builder,
          [x + hole * brickWidth * 0.28, y, front + 0.002],
          0.035,
        );
      });
    });
  });
};

const buildLogs = (
  builder: AttractionBuilder,
  tier: number,
  fromX: number,
  toX: number,
) => {
  const floor = floorOf(tier);
  const radius = 0.11;
  const random = makeRandom(tier * 31 + 7);
  const across = Math.floor((toX - fromX) / (radius * 2));
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < across - row; column++) {
      const x = fromX + radius + row * radius + column * radius * 2;
      const y = floor + radius + row * radius * 1.7;
      const size = radius * (0.9 + random() * 0.1);
      builder.cylinder("matte", logBark, {
        radius: size,
        length: hotel.depth - 0.1,
        at: [x, y, hotel.z + 0.02],
        axis: "z",
        segments: 9,
        isOpen: true,
      });
      addDisc(builder, logFace, [x, y, front - 0.03], size * 0.86, 9);
      addDisc(builder, shade(logBark, 0.8), [x, y, front - 0.031], size, 9);
      /* Drilled holes for solitary bees */
      [
        [0.03, 0.03],
        [-0.04, 0.01],
        [0.0, -0.045],
      ].forEach(([dx, dy]) => {
        addHole(builder, [x + dx, y + dy, front - 0.028], 0.014, 5);
      });
    }
  }
};

const buildBamboo = (
  builder: AttractionBuilder,
  tier: number,
  fromX: number,
  toX: number,
) => {
  const floor = floorOf(tier);
  const random = makeRandom(tier * 13 + 3);
  const radius = 0.064;
  const across = Math.floor((toX - fromX) / (radius * 2));
  for (let row = 0; row < 3; row++) {
    const count = across - (row % 2);
    for (let column = 0; column < count; column++) {
      const x = fromX + radius + (row % 2) * radius + column * radius * 2;
      const y = floor + radius + row * radius * 1.72;
      const size = radius * (0.8 + random() * 0.2);
      const poke = random() * 0.05;
      const colour = shade(bamboo, 0.9 + random() * 0.2);
      builder.cylinder("matte", colour, {
        radius: size,
        length: 0.5,
        at: [x, y, front - 0.25 + poke],
        axis: "z",
        segments: 7,
        isOpen: true,
      });
      addDisc(builder, shade(colour, 1.1), [x, y, front + poke], size, 7);
      addHole(builder, [x, y, front + poke + 0.002], size * 0.7, 6);
    }
  }
  /* A ring of twine round the bundle */
  builder.box(
    "matte",
    bambooNode,
    [toX - fromX, 0.02, 0.03],
    [(fromX + toX) / 2, floor + 0.3, front - 0.1],
  );
};

const buildStraw = (
  builder: AttractionBuilder,
  tier: number,
  fromX: number,
  toX: number,
) => {
  const floor = floorOf(tier);
  const random = makeRandom(tier * 7 + 11);
  for (let stalk = 0; stalk < 16; stalk++) {
    const x = fromX + 0.04 + random() * (toX - fromX - 0.08);
    const y = floor + 0.03 + random() * (roomHeight - 0.06);
    builder.bar(
      "matte",
      shade(straw, 0.85 + random() * 0.3),
      [x - 0.04, y, front - 0.4],
      [x + (random() - 0.5) * 0.12, y + (random() - 0.5) * 0.06, front + 0.03],
      0.025,
      3,
    );
  }
  builder.box(
    "matte",
    shade(straw, 0.9),
    [toX - fromX - 0.02, roomHeight - 0.04, 0.3],
    [(fromX + toX) / 2, floor + roomHeight / 2, front - 0.3],
  );
};

const buildPineCones = (
  builder: AttractionBuilder,
  tier: number,
  fromX: number,
  toX: number,
) => {
  const floor = floorOf(tier);
  const spots: [number, number][] = [
    [0.12, 0.1],
    [0.36, 0.1],
    [0.6, 0.1],
    [0.24, 0.27],
    [0.48, 0.27],
  ];
  spots.forEach(([dx, dy]) => {
    if (fromX + dx > toX - 0.08) {
      return;
    }
    /* Pointing out at the front, its scales in rings */
    builder.lathe(
      "matte",
      pineCone,
      [
        [0, -0.14],
        [0.07, -0.1],
        [0.06, -0.06],
        [0.1, -0.02],
        [0.08, 0.02],
        [0.1, 0.06],
        [0.06, 0.1],
        [0, 0.14],
      ],
      [fromX + dx, floor + dy, front - 0.12],
      "z",
      6,
    );
  });
};

const buildLadybirdHouse = (
  builder: AttractionBuilder,
  tier: number,
  middle: number,
) => {
  const floor = floorOf(tier);
  const width = 0.38;
  builder.box(
    "paint",
    ladybirdRed,
    [width, roomHeight - 0.04, 0.4],
    [middle, floor + (roomHeight - 0.04) / 2, front - 0.2],
  );
  /* Slots to crawl in */
  [-0.1, 0, 0.1].forEach((dx) => {
    builder.box(
      "matte",
      holeDark,
      [0.04, 0.16, 0.02],
      [middle + dx, floor + 0.13, front + 0.005],
    );
  });
  /* A painted ladybird on the door */
  builder.sphere(
    "paint",
    ladybirdRed,
    0.055,
    [middle, floor + 0.28, front + 0.01],
    [1, 1, 0.4],
    8,
  );
  builder.box(
    "paint",
    palette.black,
    [0.006, 0.1, 0.03],
    [middle, floor + 0.28, front + 0.02],
  );
  builder.sphere(
    "paint",
    palette.black,
    0.026,
    [middle, floor + 0.34, front + 0.01],
    [1, 1, 0.5],
    6,
  );
};

const buildLeaves = (
  builder: AttractionBuilder,
  tier: number,
  fromX: number,
  toX: number,
) => {
  const floor = floorOf(tier);
  const random = makeRandom(tier * 5 + 2);
  for (let leaf = 0; leaf < 9; leaf++) {
    builder.box(
      "matte",
      shade(leafLitter, 0.8 + random() * 0.45),
      [0.14, 0.012, 0.1],
      [
        fromX + 0.08 + random() * (toX - fromX - 0.16),
        floor + 0.03 + random() * (roomHeight - 0.08),
        front - 0.06 - random() * 0.1,
      ],
      [random() * 1.4 + 0.6, random() * 3, random() * 0.6],
    );
  }
  builder.box(
    "matte",
    shade(leafLitter, 0.7),
    [toX - fromX - 0.02, roomHeight - 0.06, 0.4],
    [(fromX + toX) / 2, floor + (roomHeight - 0.06) / 2, front - 0.3],
  );
};

const buildSticks = (
  builder: AttractionBuilder,
  tier: number,
  fromX: number,
  toX: number,
) => {
  const floor = floorOf(tier);
  const random = makeRandom(tier * 17 + 5);
  for (let stick = 0; stick < 10; stick++) {
    const x = fromX + 0.05 + random() * (toX - fromX - 0.1);
    const y = floor + 0.04 + random() * (roomHeight - 0.08);
    builder.cylinder("matte", shade(logBark, 0.9 + random() * 0.3), {
      radius: 0.022 + random() * 0.012,
      length: 0.6,
      at: [x, y, front - 0.28],
      axis: "z",
      segments: 5,
    });
    addHole(builder, [x, y, front + 0.021], 0.014, 4);
  }
};

const buildFillings = (builder: AttractionBuilder) => {
  const left = hotel.x - hotel.width / 2;
  const right = hotel.x + hotel.width / 2;
  if (builder.isFar) {
    /* Dark rooms, so the far hotel reads as full of hidey-holes */
    for (let tier = 0; tier < tiers; tier++) {
      builder.box(
        "matte",
        tier % 2 === 0 ? brickRed : bamboo,
        [hotel.width - 0.04, roomHeight - 0.02, 0.1],
        [hotel.x, floorOf(tier) + roomHeight / 2, front - 0.1],
      );
    }
    return;
  }
  /* Ground floor: air bricks and drilled logs */
  buildBricks(builder, left, left + 1.0);
  buildDivider(builder, 0, left + 1.02);
  buildLogs(builder, 0, left + 1.05, right);
  /* First floor: a big bundle of bamboo canes, and straw */
  buildBamboo(builder, 1, left, left + 1.45);
  buildDivider(builder, 1, left + 1.47);
  buildStraw(builder, 1, left + 1.5, right);
  /* Second floor: pine cones, the ladybird house and sticks */
  buildPineCones(builder, 2, left, left + 0.8);
  buildDivider(builder, 2, left + 0.82);
  buildLadybirdHouse(builder, 2, left + 1.06);
  buildDivider(builder, 2, left + 1.3);
  buildSticks(builder, 2, left + 1.33, right);
  /* Top floor: dry leaves and more logs */
  buildLeaves(builder, 3, left, left + 1.1);
  buildDivider(builder, 3, left + 1.12);
  buildLogs(builder, 3, left + 1.15, right);
};

/* ------------------------------------------------------------------ */
/* The wildflower patch, the path and the magnifying glass             */
/* ------------------------------------------------------------------ */

const flowerColours = ["#d8262b", "#4a78d6", "#f7f3e8", "#f2c21a", "#b36ad0"];

const buildMeadow = (builder: AttractionBuilder) => {
  /* A bark-chip path from the sign up to the hotel */
  builder.box("matte", barkChip, [0.9, 0.03, 2.6], [0.1, 0.015, 1.4]);
  builder.box("matte", barkChip, [2.6, 0.03, 0.8], [0, 0.015, front + 0.45]);
  if (builder.isFar) {
    return;
  }
  const random = makeRandom(42);
  for (let flower = 0; flower < 20; flower++) {
    const angle = random() * Math.PI * 2;
    const distance = 1.7 + random() * 2.0;
    const x = Math.sin(angle) * distance;
    const z = Math.cos(angle) * distance;
    /* Keep the path, the hotel and the magnifier clear */
    if (
      (Math.abs(x - 0.1) < 0.7 && z > 0) ||
      (Math.abs(x) < 1.6 && z < 0.2 && z > -1.4) ||
      Math.hypot(x - magnifierAt.x, z - magnifierAt.z) < 0.5
    ) {
      continue;
    }
    const height = 0.3 + random() * 0.35;
    const colour = flowerColours[flower % flowerColours.length];
    builder.bar(
      "matte",
      "#4f8a2e",
      [x, 0, z],
      [x + (random() - 0.5) * 0.1, height, z],
      0.025,
      3,
    );
    if (colour === "#f7f3e8" || colour === "#f2c21a") {
      /* Daisies and buttercups: a flat flower with a yellow eye */
      builder.cylinder("paint", colour, {
        radius: 0.07,
        length: 0.02,
        at: [x, height, z],
        segments: 7,
      });
      builder.cylinder("paint", colour === "#f2c21a" ? "#e0a010" : "#f2c21a", {
        radius: 0.03,
        length: 0.03,
        at: [x, height + 0.01, z],
        segments: 6,
      });
    } else {
      /* Poppies, cornflowers and knapweed: a cupped head */
      builder.cylinder("paint", colour, {
        radius: 0.08,
        radiusEnd: 0.04,
        length: 0.07,
        at: [x, height + 0.02, z],
        segments: 6,
      });
      builder.cylinder("paint", palette.black, {
        radius: 0.025,
        length: 0.02,
        at: [x, height + 0.055, z],
        segments: 5,
      });
    }
  }
  /* Tufts of long grass */
  for (let tuft = 0; tuft < 7; tuft++) {
    const angle = random() * Math.PI * 2;
    const distance = 2.2 + random() * 1.6;
    const x = Math.sin(angle) * distance;
    const z = Math.cos(angle) * distance;
    if (Math.abs(x - 0.1) < 0.7 && z > 0) {
      continue;
    }
    [-1, 0, 1].forEach((blade) => {
      builder.bar(
        "matte",
        "#6fa63e",
        [x + blade * 0.04, 0, z],
        [x + blade * 0.14, 0.45 + random() * 0.15, z + blade * 0.05],
        0.03,
        3,
      );
    });
  }
};

const buildLogPile = (builder: AttractionBuilder) => {
  /* A log pile beside the hotel, a home for beetles and woodlice */
  const at = { x: -2.1, z: -0.3 };
  [
    [-0.18, 0.13, 0],
    [0.18, 0.13, 0.05],
    [0, 0.36, 0.02],
  ].forEach(([dx, y, dz]) => {
    builder.cylinder("matte", logBark, {
      radius: 0.14,
      length: 1.0,
      at: [at.x + dx, y, at.z + dz],
      axis: "z",
      segments: builder.isFar ? 6 : 10,
    });
    if (!builder.isFar) {
      builder.cylinder("matte", logFace, {
        radius: 0.12,
        length: 1.01,
        at: [at.x + dx, y, at.z + dz],
        axis: "z",
        segments: 10,
      });
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Moss on top, and a flat stone to look under */
  builder.sphere(
    "matte",
    "#5d9a3a",
    0.12,
    [at.x, 0.48, at.z - 0.2],
    [1.4, 0.4, 1.6],
    7,
  );
  builder.sphere(
    "matte",
    palette.stone,
    0.3,
    [at.x + 0.2, 0.02, at.z + 0.95],
    [1.2, 0.3, 1],
    9,
  );
  /* A woodlouse taking a walk on the stone */
  builder.sphere(
    "paint",
    "#6e6a70",
    0.05,
    [at.x + 0.2, 0.1, at.z + 0.95],
    [0.8, 0.5, 1.3],
    6,
  );
};

const buildMagnifier = (builder: AttractionBuilder) => {
  const { x, z } = magnifierAt;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.2,
    radiusEnd: 0.16,
    length: 0.08,
    at: [x, 0.04, z],
    segments: 12,
  });
  builder.cylinder("paint", palette.darkTimber, {
    radius: 0.035,
    length: 0.85,
    at: [x, 0.47, z],
    segments: 8,
  });
  /* The lens, tilted to look at the hotel */
  const lensAt: Triple = [x - 0.12, 1.05, z - 0.12];
  const tilt: Triple = [0.35, -Math.PI / 4 + Math.PI, 0];
  builder.add(
    "metal",
    palette.brass,
    new TorusGeometry(
      0.22,
      0.03,
      builder.isFar ? 3 : 6,
      builder.isFar ? 8 : 16,
    ),
    { at: lensAt, rotation: tilt },
  );
  if (builder.isFar) {
    return;
  }
  builder.add(
    "glass",
    "#cfe6f2",
    new BoxGeometry(0.4, 0.4, 0.01),
    { at: lensAt, rotation: tilt },
    undefined,
  );
  builder.bar("metal", palette.brass, [x, 0.9, z], lensAt, 0.04, 6);
  /* A spotter's chart pinned on the post */
  builder.box("paint", palette.white, [0.22, 0.28, 0.02], [x, 0.6, z + 0.045]);
  [0.67, 0.6, 0.53].forEach((y, index) => {
    builder.box(
      "paint",
      [ladybirdRed, "#f2c21a", "#6e6a70"][index],
      [0.04, 0.04, 0.01],
      [x - 0.06, y, z + 0.06],
    );
    builder.box(
      "paint",
      palette.slate,
      [0.09, 0.015, 0.01],
      [x + 0.03, y, z + 0.06],
    );
  });
};

const buildBurrow = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", holeDark, {
    radius: 0.2,
    length: 0.01,
    at: [holeAt.x, 0.035, holeAt.z],
    segments: 12,
  });
  builder.torus(
    "matte",
    palette.soil,
    0.21,
    0.05,
    [holeAt.x, 0.03, holeAt.z],
    "y",
    12,
  );
};

/* ------------------------------------------------------------------ */
/* The minibeasts                                                      */
/* ------------------------------------------------------------------ */

/** A stag beetle, hidden in its burrow until someone comes to look. */
const buildStagBeetle = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    beetleBrown,
    0.13,
    [0, 0.12, -0.04],
    [0.85, 0.6, 1.2],
    10,
  );
  builder.box("paint", palette.black, [0.006, 0.06, 0.26], [0, 0.18, -0.04]);
  builder.sphere(
    "paint",
    palette.black,
    0.07,
    [0, 0.13, 0.13],
    [1.1, 0.7, 0.9],
    8,
  );
  /* The big antler jaws that give it its name */
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      "#6a2e1c",
      [side * 0.04, 0.14, 0.18],
      [side * 0.09, 0.2, 0.3],
      0.03,
      5,
    );
    builder.bar(
      "paint",
      "#6a2e1c",
      [side * 0.09, 0.2, 0.3],
      [side * 0.03, 0.22, 0.38],
      0.025,
      5,
    );
    /* Six legs, three a side */
    [-0.1, 0, 0.1].forEach((along) => {
      builder.bar(
        "paint",
        palette.black,
        [side * 0.07, 0.08, along],
        [side * 0.2, 0.0, along + 0.04],
        0.018,
        4,
      );
    });
    builder.bar(
      "paint",
      palette.black,
      [side * 0.03, 0.17, 0.17],
      [side * 0.09, 0.26, 0.2],
      0.01,
      3,
    );
    builder.sphere(
      "paint",
      palette.white,
      0.018,
      [side * 0.05, 0.17, 0.18],
      [1, 1, 1],
      6,
    );
  });
};

/** A cheerful caterpillar on the ridge, rearing up to say hello. */
const buildCaterpillar = (builder: AttractionBuilder) => {
  /* The front half arches up off the ridge */
  const lift = (segment: number) => Math.max(0, segment - 2) * 0.07;
  for (let segment = 0; segment < 6; segment++) {
    const isHead = segment === 5;
    builder.sphere(
      "paint",
      isHead
        ? shade(caterpillarGreen, 1.1)
        : shade(caterpillarGreen, segment % 2 === 0 ? 1 : 0.88),
      isHead ? 0.11 : 0.09,
      [segment * 0.12, 0.09 + lift(segment) + (isHead ? 0.03 : 0), 0],
      [1, 1, 1],
      7,
    );
    if (!isHead) {
      builder.sphere(
        "paint",
        "#f2c21a",
        0.02,
        [segment * 0.12, 0.17 + lift(segment), 0],
        [1, 1, 1],
        4,
      );
    }
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.03,
      [0.66, 0.37, side * 0.05],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [0.69, 0.37, side * 0.055],
      [1, 1, 1],
      4,
    );
    builder.bar(
      "paint",
      palette.black,
      [0.6, 0.41, side * 0.03],
      [0.62, 0.53, side * 0.07],
      0.012,
      3,
    );
  });
};

/** A garden spider, dangling on its silk from the roof's eave. */
const buildSpider = (builder: AttractionBuilder) => {
  builder.bar("glass", "#f4f4f4", [0, 0, 0], [0, -0.7, 0], 0.006, 3);
  builder.sphere("paint", "#5a3a22", 0.06, [0, -0.78, 0], [1, 1.1, 1], 8);
  builder.sphere("paint", "#3a2418", 0.035, [0, -0.7, 0], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    [-0.03, -0.01, 0.01, 0.03].forEach((along) => {
      builder.bar(
        "paint",
        palette.black,
        [side * 0.02, -0.71, along],
        [side * 0.11, -0.66 - Math.abs(along) * 2, along * 3],
        0.008,
        3,
      );
    });
  });
};

const buildBee = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#f2b51d", 0.06, [0, 0, 0], [0.9, 0.9, 1.3], 8);
  [-0.03, 0.03].forEach((z) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.055,
      length: 0.018,
      at: [0, 0, z],
      axis: "z",
      segments: 8,
    });
  });
  builder.sphere("paint", palette.black, 0.035, [0, 0, 0.08], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#eef6fb",
      [0.08, 0.005, 0.05],
      [side * 0.05, 0.05, -0.01],
      [0, 0, side * 0.4],
    );
  });
};

const buildLadybird = (builder: AttractionBuilder) => {
  builder.sphere("paint", ladybirdRed, 0.05, [0, 0, 0], [1, 0.7, 1.15], 8);
  builder.sphere(
    "paint",
    palette.black,
    0.025,
    [0, -0.005, 0.05],
    [1, 0.8, 1],
    6,
  );
  [
    [0.025, -0.015],
    [-0.025, -0.015],
    [0.02, 0.025],
    [-0.02, 0.025],
  ].forEach(([x, z]) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.012,
      length: 0.01,
      at: [x, 0.033, z],
      segments: 5,
    });
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#eef6fb",
      [0.07, 0.004, 0.04],
      [side * 0.05, 0.04, -0.02],
      [0, 0, side * 0.5],
    );
  });
};

export const bugHotelModel: CuriosityModel = {
  kind: "bug-hotel",
  islandId: "meadow-isle",
  name: "Bug Hotel",
  fact: "A bug hotel gives minibeasts a safe place to hide, rest and sleep through the winter. Solitary bees lay their eggs in hollow canes, ladybirds snuggle into straw, and woodlice and beetles love damp logs. Insects such as bees, beetles and ladybirds have six legs, but spiders have eight, so spiders are not insects!",
  curriculumLink:
    "Science, Year 1: identify and name a variety of common animals, including minibeasts such as insects, spiders and woodlice.",
  footprint: 4.2,
  setting: "inland",
  signSpot: { x: -1.5, z: 3.0 },
  build: (builder) => {
    buildFrame(builder);
    buildFillings(builder);
    buildMeadow(builder);
    buildLogPile(builder);
    buildMagnifier(builder);
    buildBurrow(builder);
    addSignBoard(builder, [-1.5, 0, 3.0], signColour);
  },
  moving: [
    {
      name: "stag beetle",
      pivot: [holeAt.x, 0.03 - stagRise, holeAt.z],
      build: buildStagBeetle,
      motion: { kind: "rise", reach: 6, height: stagRise, period: 1.8 },
    },
    {
      name: "caterpillar",
      pivot: [hotel.x - 0.4, hotelTop + roofRise + 0.06, hotel.z],
      build: buildCaterpillar,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 7,
        amplitude: 0.35,
        period: 1.6,
      },
    },
    {
      name: "spider",
      pivot: [hotel.x + hotel.width / 2 + 0.15, hotelTop + 0.02, front + 0.2],
      build: buildSpider,
      motion: { kind: "bob", height: 0.18, period: 3.2 },
    },
  ],
  wanderers: [
    {
      name: "bees",
      build: buildBee,
      count: 3,
      centre: { x: 0, z: 0.6 },
      radius: 2.6,
      speed: 1.2,
      height: 1.0,
      bob: 0.35,
    },
    {
      name: "ladybirds",
      build: buildLadybird,
      count: 3,
      centre: { x: 0, z: 0.4 },
      radius: 2.2,
      speed: 0.7,
      height: 0.6,
      bob: 0.25,
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: hotel.x - hotel.width / 2 + 0.3, z: hotel.z },
      { x: hotel.x + hotel.width / 2 - 0.3, z: hotel.z },
      0.6,
      0.5,
    ),
    { x: -2.1, z: -0.3, radius: 0.5 },
    { x: magnifierAt.x, z: magnifierAt.z, radius: 0.25 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Look for minibeasts",
    news: "Look closer! You spotted a solitary bee in a cane, two ladybirds in the straw and a woodlouse under a log.",
  },
};
