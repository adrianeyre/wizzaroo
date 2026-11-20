import { ConeGeometry } from "three";
import {
  AttractionBuilder,
  addBench,
  addDoor,
  addGableRoof,
  addSignBoard,
  addTree,
  addWindow,
  buildFlatDeck,
  palette,
  shade,
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

/*
 * A village cricket ground: a striped outfield inside a white boundary
 * rope, the pale pitch with its wickets and creases, a white timber
 * pavilion with a clock, a veranda and a weathervane, the scoreboard,
 * white sightscreens, the heavy roller, an umpire, deckchairs and a
 * tea table. Take guard and run between the wickets.
 */

const outfield = "#6fae48";
const outfieldStripe = "#7dbb55";
const pitchStraw = "#d8cf98";
const creaseWhite = "#f7f5ee";
const stumpWood = "#e8d6a8";
const pavilionWhite = "#f3efe4";
const pavilionGreen = "#2f5d3a";
const scoreBlack = "#25282b";
const rollerGreen = "#2f6b3a";
const signColour = "#2f5d3a";

/* The field */

const boundary = 8.7;

const buildField = (builder: AttractionBuilder) => {
  const stripes = builder.isFar ? 4 : 15;
  const stripeWidth = (boundary * 2) / stripes;
  for (let stripe = 0; stripe < stripes; stripe++) {
    if (stripe % 2 === 1) {
      continue;
    }
    const x = -boundary + stripeWidth * (stripe + 0.5);
    const length =
      2 *
      Math.sqrt(
        Math.max(0, boundary ** 2 - (Math.abs(x) + stripeWidth / 2) ** 2),
      );
    builder.box(
      "matte",
      outfieldStripe,
      [stripeWidth, 0.015, length],
      [x, 0.008, 0],
    );
  }
  /* The white boundary rope */
  builder.lathe(
    "paint",
    creaseWhite,
    [
      [boundary + 0.06, 0],
      [boundary + 0.04, 0.07],
      [boundary - 0.04, 0.07],
      [boundary - 0.06, 0],
    ],
    [0, 0, 0],
    "y",
    builder.segments(64, 24),
  );
};

/* The pitch and wickets */

const pitch = { z: -0.4, half: 3.6, width: 1.4 };
const wicketX = 3.3;
const creaseX = 2.9;
const stumpHeight = 0.72;

const buildPitch = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    pitchStraw,
    [pitch.half * 2, 0.02, pitch.width],
    [0, 0.012, pitch.z],
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((end) => {
    /* Bowling and popping creases, and the return creases */
    builder.box(
      "paint",
      creaseWhite,
      [0.04, 0.005, pitch.width + 0.6],
      [end * creaseX, 0.025, pitch.z],
    );
    builder.box(
      "paint",
      creaseWhite,
      [0.04, 0.005, pitch.width - 0.2],
      [end * wicketX, 0.025, pitch.z],
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        creaseWhite,
        [0.9, 0.005, 0.04],
        [end * (wicketX - 0.05), 0.025, pitch.z + side * 0.5],
      );
    });
    /* Worn patches where the batters stand */
    builder.cylinder("matte", shade(pitchStraw, 0.85), {
      radius: 0.3,
      length: 0.006,
      at: [end * (creaseX - 0.2), 0.024, pitch.z],
      segments: 10,
    });
  });
};

const addStumps = (builder: AttractionBuilder, end: number) => {
  [-0.11, 0, 0.11].forEach((dz) => {
    builder.cylinder("paint", stumpWood, {
      radius: 0.035,
      length: stumpHeight,
      at: [end * wicketX, stumpHeight / 2, pitch.z + dz],
      segments: 8,
    });
  });
};

const buildBails = (builder: AttractionBuilder) => {
  [-0.055, 0.055].forEach((dz) => {
    builder.cylinder("paint", stumpWood, {
      radius: 0.018,
      length: 0.11,
      at: [0, 0.02, dz],
      axis: "z",
      segments: 6,
    });
  });
};

/* The pavilion */

const pavilion = { x: 0, z: -6.9, width: 5.2, depth: 2.4, wall: 2.0 };
const veranda = { minX: -2.7, maxX: 2.7, minZ: -5.7, maxZ: -4.5 };
const verandaTop = 0.3;
const pavilionFront = pavilion.z + pavilion.depth / 2;

const buildPavilion = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = pavilion;
  builder.box(
    "matte",
    palette.brick,
    [width + 0.1, 0.3, depth + 0.1],
    [x, 0.15, z],
  );
  builder.box(
    "paint",
    pavilionWhite,
    [width, wall, depth],
    [x, 0.3 + wall / 2, z],
  );
  addGableRoof(builder, {
    width,
    depth,
    rise: 1.1,
    at: [x, 0.3 + wall, z],
    colour: pavilionGreen,
    overhang: 0.25,
    finish: "paint",
  });
  /* Gable ends */
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      pavilionWhite,
      new ConeGeometry(depth / 2 / Math.SQRT1_2, 1.1, 4)
        .rotateY(Math.PI / 4)
        .scale(0.12 / depth, 1, 1),
      { at: [x + side * (width / 2 - 0.06), 0.3 + wall + 0.55, z] },
    );
  });
  /* The clock gable over the middle, facing the field */
  builder.box(
    "paint",
    pavilionWhite,
    [1.4, 1.0, 0.8],
    [x, 0.3 + wall + 0.3, pavilionFront - 0.1],
  );
  addGableRoof(builder, {
    width: 0.8,
    depth: 1.4,
    rise: 0.6,
    at: [x, 0.3 + wall + 0.8, pavilionFront - 0.1],
    colour: pavilionGreen,
    overhang: 0.12,
    finish: "paint",
    turn: Math.PI / 2,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.36,
    length: 0.06,
    at: [x, 0.3 + wall + 0.35, pavilionFront + 0.32],
    axis: "z",
    segments: 20,
  });
  builder.torus(
    "paint",
    pavilionGreen,
    0.37,
    0.035,
    [x, 0.3 + wall + 0.35, pavilionFront + 0.34],
    "z",
    20,
  );
  /* A little white cupola on the ridge for the weathervane */
  builder.box(
    "paint",
    pavilionWhite,
    [0.5, 0.45, 0.5],
    [x + 1.6, 0.3 + wall + 1.25, z],
  );
  builder.add(
    "paint",
    pavilionGreen,
    new ConeGeometry(0.45, 0.45, 4).rotateY(Math.PI / 4),
    { at: [x + 1.6, 0.3 + wall + 1.7, z] },
  );
  /* Doors and windows along the front */
  addDoor(builder, {
    at: [x, 0.3, pavilionFront],
    width: 0.9,
    height: 1.4,
    colour: pavilionGreen,
  });
  [-1.7, -0.95, 0.95, 1.7].forEach((wx) => {
    addWindow(builder, {
      at: [x + wx, 1.3, pavilionFront + 0.01],
      width: 0.5,
      height: 0.8,
      frame: palette.white,
      isLit: Math.abs(wx) < 1,
    });
  });
  if (!builder.isFar) {
    /* Weatherboards: shadow lines along the walls */
    for (let board = 1; board < 9; board++) {
      builder.box(
        "paint",
        shade(pavilionWhite, 0.88),
        [width + 0.02, 0.02, depth + 0.02],
        [x, 0.3 + board * (wall / 9), z],
      );
    }
    /* Honours boards and a team photo inside, seen through the windows */
    builder.box(
      "paint",
      "#6a3a1e",
      [0.8, 0.6, 0.02],
      [x - 1.3, 1.3, pavilionFront - 0.3],
    );
  }
};

const buildVeranda = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = veranda;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  builder.box(
    "matte",
    palette.paleTimber,
    [width, verandaTop, depth],
    [(minX + maxX) / 2, verandaTop / 2, (minZ + maxZ) / 2],
  );
  /* Two low steps up in the middle */
  builder.box(
    "matte",
    shade(palette.paleTimber, 0.9),
    [1.4, 0.15, 0.35],
    [0, 0.075, maxZ + 0.17],
  );
  /* The lean-to roof on white posts */
  const roofLow = verandaTop + 1.65;
  const roofHigh = verandaTop + pavilion.wall - 0.1;
  const slope = Math.atan2(roofHigh - roofLow, depth + 0.3);
  builder.box(
    "paint",
    pavilionGreen,
    [width + 0.3, 0.06, depth + 0.5],
    [(minX + maxX) / 2, (roofLow + roofHigh) / 2, (minZ + maxZ) / 2 + 0.05],
    [slope, 0, 0],
  );
  const posts = [-2.6, -1.3, 1.3, 2.6];
  posts.forEach((px) => {
    builder.box(
      "paint",
      palette.white,
      [0.1, roofLow - verandaTop, 0.1],
      [px, (roofLow + verandaTop) / 2, maxZ - 0.08],
    );
  });
  /* White railings, open at the steps */
  [
    [minX + 0.05, -0.75],
    [0.75, maxX - 0.05],
  ].forEach(([from, to]) => {
    builder.box(
      "paint",
      palette.white,
      [to - from, 0.06, 0.06],
      [(from + to) / 2, verandaTop + 0.62, maxZ - 0.08],
    );
    if (!builder.isFar) {
      const balusters = Math.round((to - from) / 0.2);
      for (let baluster = 0; baluster <= balusters; baluster++) {
        builder.box(
          "paint",
          palette.white,
          [0.03, 0.6, 0.03],
          [
            from + ((to - from) * baluster) / balusters,
            verandaTop + 0.3,
            maxZ - 0.08,
          ],
        );
      }
    }
  });
  [minX + 0.05, maxX - 0.05].forEach((sx) => {
    builder.box(
      "paint",
      palette.white,
      [0.06, 0.06, depth],
      [sx, verandaTop + 0.62, (minZ + maxZ) / 2],
    );
    if (!builder.isFar) {
      for (let baluster = 0; baluster <= 5; baluster++) {
        builder.box(
          "paint",
          palette.white,
          [0.03, 0.6, 0.03],
          [sx, verandaTop + 0.3, minZ + (depth * baluster) / 5],
        );
      }
    }
  });
  addBench(builder, [-1.7, verandaTop, minZ + 0.35], 0, pavilionGreen);
  addBench(builder, [1.7, verandaTop, minZ + 0.35], 0, pavilionGreen);
  if (!builder.isFar) {
    /* Bunting along the veranda roof */
    addBunting(
      builder,
      [minX, roofLow - 0.05, maxZ + 0.2],
      [maxX, roofLow - 0.05, maxZ + 0.2],
      [meadowColours.poppy, palette.white, meadowColours.cornflower],
      0.18,
    );
  }
};

/* The scoreboard */

const scoreboard = { x: 6.0, z: -4.6, turn: -0.75 };

const placeOnBoard = (dx: number, dy: number, dz: number): Triple => {
  const { x, z, turn } = scoreboard;
  return [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    dy,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
};

const scorePlateAt = placeOnBoard(0.55, 1.55, 0.09);

const buildScoreboard = (builder: AttractionBuilder) => {
  const rotation: Triple = [0, scoreboard.turn, 0];
  builder.box(
    "paint",
    scoreBlack,
    [2.2, 1.3, 0.12],
    placeOnBoard(0, 1.55, 0),
    rotation,
  );
  builder.box(
    "paint",
    pavilionWhite,
    [2.4, 0.12, 0.3],
    placeOnBoard(0, 2.26, 0),
    rotation,
  );
  [-0.95, 0.95].forEach((side) => {
    builder.box(
      "paint",
      pavilionWhite,
      [0.12, 2.3, 0.12],
      placeOnBoard(side, 1.15, -0.1),
      rotation,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* White number plates: the total, wickets and overs */
  [
    [-0.7, 1.85],
    [-0.35, 1.85],
    [0.0, 1.85],
    [-0.7, 1.25],
    [0.55, 1.25],
    [0.85, 1.25],
  ].forEach(([dx, dy]) => {
    builder.box(
      "paint",
      palette.white,
      [0.26, 0.36, 0.02],
      placeOnBoard(dx, dy, 0.07),
      rotation,
    );
    builder.box(
      "paint",
      scoreBlack,
      [0.06, 0.24, 0.01],
      placeOnBoard(dx, dy, 0.085),
      rotation,
    );
  });
  builder.box(
    "paint",
    palette.white,
    [0.7, 0.08, 0.02],
    placeOnBoard(0.65, 1.9, 0.07),
    rotation,
  );
};

const buildScorePlate = (builder: AttractionBuilder) => {
  const rotation: Triple = [0, scoreboard.turn, 0];
  builder.box(
    "paint",
    palette.white,
    [0.26, 0.36, 0.02],
    [0, -0.18, 0],
    rotation,
  );
  builder.box(
    "paint",
    scoreBlack,
    [0.16, 0.05, 0.01],
    [0, -0.1, 0.012],
    rotation,
  );
  builder.box(
    "paint",
    scoreBlack,
    [0.05, 0.24, 0.01],
    [0.05, -0.2, 0.012],
    rotation,
  );
};

/* Sightscreens, the roller and the spectators' things */

const addSightscreen = (builder: AttractionBuilder, end: number) => {
  const x = end * 7.6;
  builder.box("paint", palette.white, [0.12, 1.6, 2.6], [x, 1.05, pitch.z]);
  builder.box(
    "matte",
    palette.darkTimber,
    [0.5, 0.12, 2.4],
    [x + end * 0.15, 0.2, pitch.z],
  );
  [-1.0, 1.0].forEach((dz) => {
    builder.bar(
      "paint",
      palette.white,
      [x, 1.2, pitch.z + dz],
      [x + end * 0.6, 0.2, pitch.z + dz],
      0.06,
      4,
    );
    builder.cylinder("matte", palette.black, {
      radius: 0.14,
      length: 0.08,
      at: [x + end * 0.15, 0.14, pitch.z + dz],
      axis: "z",
      segments: 10,
    });
  });
};

const buildRoller = (builder: AttractionBuilder) => {
  const [x, z] = [-5.6, -4.8];
  builder.cylinder("paint", rollerGreen, {
    radius: 0.42,
    length: 1.3,
    at: [x, 0.42, z],
    axis: "x",
    segments: 16,
  });
  builder.box("paint", rollerGreen, [1.4, 0.5, 0.3], [x, 0.8, z]);
  [-0.55, 0.55].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + side, 0.85, z],
      [x + side * 0.3, 1.05, z + 1.2],
      0.05,
      6,
    );
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.035,
    length: 0.8,
    at: [x, 1.05, z + 1.2],
    axis: "x",
    segments: 6,
  });
};

const addDeckchair = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  colour: string,
) => {
  const [x, , z] = at;
  const place = (dx: number, dy: number, dz: number): Triple => [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    dy,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  builder.box("matte", colour, [0.5, 0.03, 0.9], place(0, 0.4, 0), [
    -0.75,
    turn,
    0,
  ]);
  if (!builder.isFar) {
    builder.box("matte", palette.white, [0.16, 0.035, 0.9], place(0, 0.4, 0), [
      -0.75,
      turn,
      0,
    ]);
  }
  [-0.27, 0.27].forEach((side) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      place(side, 0, 0.35),
      place(side, 0.75, -0.3),
      0.04,
      4,
    );
    builder.bar(
      "matte",
      palette.paleTimber,
      place(side, 0, -0.35),
      place(side, 0.35, 0.15),
      0.04,
      4,
    );
  });
};

const buildSpectators = (builder: AttractionBuilder) => {
  [
    { x: -4.0, z: 6.2, turn: 0.45, colour: meadowColours.poppy },
    { x: -3.0, z: 6.9, turn: 0.25, colour: meadowColours.cornflower },
    { x: 2.6, z: 7.0, turn: -0.25, colour: meadowColours.leaf },
    { x: 3.6, z: 6.4, turn: -0.45, colour: meadowColours.butter },
  ].forEach(({ x, z, turn, colour }) => {
    addDeckchair(builder, [x, 0, z], turn + Math.PI, colour);
  });
  /* The tea table: urn, cups and a cake */
  const [tx, tz] = [-6.0, 3.4];
  builder.box(
    "paint",
    palette.white,
    [1.4, 0.05, 0.7],
    [tx, 0.78, tz],
    [0, 0.6, 0],
  );
  builder.box(
    "matte",
    meadowColours.cream,
    [1.42, 0.35, 0.72],
    [tx, 0.6, tz],
    [0, 0.6, 0],
  );
  builder.cylinder("metal", "#c9ccd0", {
    radius: 0.16,
    length: 0.4,
    at: [tx, 1.0, tz],
    segments: 12,
  });
  if (!builder.isFar) {
    builder.sphere("metal", "#c9ccd0", 0.1, [tx, 1.22, tz], [1, 0.6, 1], 8);
    [0.35, 0.5, -0.4].forEach((along, index) => {
      builder.cylinder(
        "paint",
        index === 2 ? meadowColours.rose : palette.white,
        {
          radius: index === 2 ? 0.16 : 0.04,
          length: index === 2 ? 0.12 : 0.07,
          at: [tx + Math.cos(0.6) * along, 0.85, tz - Math.sin(0.6) * along],
          segments: 10,
        },
      );
    });
  }
};

/** A figure built by its own builder, placed and turned, as one matte part. */
const addFigure = (
  builder: AttractionBuilder,
  build: (inner: AttractionBuilder) => void,
  at: Triple,
  turn: number,
) => {
  const inner = new AttractionBuilder(builder.attractionDetail);
  build(inner);
  const geometry = inner.build();
  geometry.clearGroups();
  geometry.rotateY(turn);
  geometry.translate(...at);
  builder.addPainted("matte", geometry);
};

const buildUmpire = buildVillager({
  top: palette.white,
  legs: palette.black,
  hair: "#8a8a8a",
  hat: palette.white,
});

/* The ground round it */

const buildGrounds = (builder: AttractionBuilder) => {
  addTree(builder, [-7.4, 0, -3.2], 1.2);
  addTree(builder, [7.6, 0, 2.6], 1.05, "#4a9440");
  addTree(builder, [-3.6, 0, -8.0], 0.95);
  if (!builder.isFar) {
    [
      [5.2, 5.6],
      [-5.0, 5.8],
      [3.8, -8.0],
    ].forEach(([x, z], index) => {
      addFlowerClump(
        builder,
        [x, 0, z],
        index % 2 === 0
          ? [meadowColours.butter, palette.white]
          : [meadowColours.rose, meadowColours.cornflower],
        5,
        0.3,
      );
    });
  }
  /* The flagpole by the pavilion */
  builder.cylinder("paint", palette.white, {
    radius: 0.05,
    length: 4.0,
    at: [-3.6, 2.0, -5.2],
    segments: 8,
  });
  builder.sphere(
    "metal",
    palette.brass,
    0.07,
    [-3.6, 4.05, -5.2],
    [1, 1, 1],
    8,
  );
  addSignBoard(builder, [-1.6, 0, 8.2], signColour);
};

/* Moving parts */

const bailsAt = (end: number): Triple => [end * wicketX, stumpHeight, pitch.z];

const vaneAt: Triple = [
  pavilion.x + 1.6,
  0.3 + pavilion.wall + 1.92,
  pavilion.z,
];

const buildVane = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.black, {
    radius: 0.02,
    length: 0.7,
    at: [0, 0.35, 0],
    segments: 6,
  });
  /* A cricket bat for the pointer, and a ball on the tail */
  builder.box("metal", palette.black, [0.03, 0.03, 0.9], [0, 0.55, 0]);
  builder.box("paint", stumpWood, [0.04, 0.12, 0.36], [0, 0.55, 0.36]);
  builder.sphere("paint", "#a3201e", 0.07, [0, 0.55, -0.45], [1, 1, 1], 8);
  builder.sphere("metal", palette.brass, 0.04, [0, 0.72, 0], [1, 1, 1], 6);
};

const flagAt: Triple = [-3.6, 3.6, -5.2];

const buildFlag = (builder: AttractionBuilder) => {
  /* The flag of St George: a red cross on white */
  builder.box("matte", palette.white, [0.9, 0.55, 0.02], [0.47, 0, 0]);
  builder.box("matte", meadowColours.poppy, [0.9, 0.12, 0.025], [0.47, 0, 0]);
  builder.box("matte", meadowColours.poppy, [0.12, 0.55, 0.025], [0.47, 0, 0]);
};

/* Wanderers: the fielders in their whites */

const buildFielder = buildVillager({
  top: palette.white,
  legs: creaseWhite,
  hair: "#5a3a22",
  hat: "#2c3e6b",
});

/* The ride: take guard and run two */

const batStart = { x: -creaseX - 0.9, z: pitch.z + 1.4 };
const batFinish = { x: -creaseX + 0.6, z: pitch.z + 1.8 };
const runLine = pitch.z + 0.35;

const batRide = (progress: number): LocalSpot => {
  if (progress < 0.1) {
    const share = progress / 0.1;
    return {
      x: batStart.x + (-creaseX + 0.1 - batStart.x) * share,
      y: 0,
      z: batStart.z + (runLine - batStart.z) * share,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.22) {
    /* Take guard, and swing at the ball */
    const share = (progress - 0.1) / 0.12;
    return {
      x: -creaseX + 0.1,
      y: 0,
      z: runLine,
      heading: Math.PI / 2 + Math.sin(share * Math.PI) * 1.4,
    };
  }
  if (progress < 0.9) {
    /* Run! Up to the far end and back: two runs */
    const share = (progress - 0.22) / 0.68;
    const leg = share < 0.5 ? share * 2 : 2 - share * 2;
    return {
      x: -creaseX + 0.1 + (creaseX * 2 - 0.2) * leg,
      y: Math.abs(Math.sin(share * 30)) * 0.08,
      z: runLine,
      heading: share < 0.5 ? Math.PI / 2 : -Math.PI / 2,
    };
  }
  const share = (progress - 0.9) / 0.1;
  return {
    x: -creaseX + 0.1 + (batFinish.x + creaseX - 0.1) * share,
    y: 0,
    z: runLine + (batFinish.z - runLine) * share,
    heading: 0,
  };
};

export const cricketPitchModel: NewLandAttractionModel = {
  kind: "cricket-pitch",
  islandId: "meadow-isle",
  name: "Cricket Pitch",
  fact: "Cricket has been played on English village greens for more than 400 years. Two teams of eleven players take turns to bat and to bowl, and a batter scores a run each time they run from one wicket to the other. Running, throwing and catching are skills you can practise for games like this.",
  curriculumLink:
    "Physical Education, Key Stage 1: master basic movements, including running, throwing and catching, and take part in simple team games.",
  footprint: 9.6,
  setting: "inland",
  signSpot: { x: -1.6, z: 9.2 },
  padColour: outfield,
  build: (builder) => {
    buildField(builder);
    buildPitch(builder);
    [-1, 1].forEach((end) => {
      addStumps(builder, end);
      addSightscreen(builder, end);
    });
    buildPavilion(builder);
    buildVeranda(builder);
    buildScoreboard(builder);
    buildRoller(builder);
    buildSpectators(builder);
    addFigure(
      builder,
      buildUmpire,
      [wicketX + 0.6, 0, pitch.z - 0.9],
      -Math.PI / 2,
    );
    buildGrounds(builder);
  },
  moving: [
    ...[-1, 1].map((end) => ({
      name: `bails-${end < 0 ? "striker" : "bowler"}`,
      pivot: bailsAt(end),
      build: buildBails,
      motion: {
        kind: "rise" as const,
        reach: 3,
        height: 0.35,
        period: 0.6,
        phase: end,
      },
    })),
    {
      name: "weathervane",
      pivot: vaneAt,
      build: buildVane,
      motion: { kind: "whirl", axis: "y", idle: 0.15, speed: 3, reach: 7 },
    },
    {
      name: "score-plate",
      pivot: scorePlateAt,
      build: buildScorePlate,
      motion: { kind: "nod", axis: "x", reach: 5, amplitude: 1.2, period: 1.4 },
    },
    {
      name: "flag",
      pivot: flagAt,
      build: buildFlag,
      motion: { kind: "swing", axis: "y", amplitude: 0.35, period: 2.6 },
    },
  ],
  wanderers: [
    {
      name: "fielders",
      build: buildFielder,
      count: 3,
      centre: { x: 1.0, z: 2.8 },
      radius: 3.0,
      speed: 0.4,
    },
  ],
  decks: [buildFlatDeck(veranda, verandaTop, "bridge")],
  rides: [
    {
      id: "batting",
      name: "the batting crease",
      start: batStart,
      reach: 0.55,
      seconds: 9,
      finish: batFinish,
      follow: batRide,
    },
  ],
  play: {
    label: "Bowl a ball",
    news: "Howzat! Your ball whizzed down the pitch and knocked the bails clean off the stumps. Out! Everyone on the boundary clapped.",
  },
};
