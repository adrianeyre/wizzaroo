import { ConeGeometry, PlaneGeometry } from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
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

const hillGreen = "#6fae48";
const laneOrange = "#f0812a";
const laneGreen = "#2f9a5a";
const bumperBlue = "#2f6fc0";
const gateRed = "#c8302a";
const hayGold = "#e2c069";
const signColour = "#2f9a5a";

/* The hill: flat on top at the back, sloping gently down to the front */
const hillTop = 2.4;
const backFoot = -7.0;
const topBack = -5.0;
const topFront = -3.6;
const frontFoot = 3.0;
const hillHalf = 3.2;
const hillEdge = 1.4;

const smooth = (t: number): number => {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
};

/** How high the hill is at a local point. */
const findHillHeight = (x: number, z: number): number => {
  const along =
    z < topBack
      ? smooth((z - backFoot) / (topBack - backFoot))
      : z <= topFront
        ? 1
        : 1 - smooth((z - topFront) / (frontFoot - topFront));
  const across = 1 - smooth((Math.abs(x) - hillHalf) / hillEdge);
  return hillTop * along * across;
};

/* Two sledge lanes down the front, and wooden steps up beside them */
const lanes = [-1.6, 0.0];
const laneHalf = 0.55;
const laneTop = topFront - 0.2;
const runOutEnd = 4.2;
const stepsX = 2.2;
const rideStart = { x: stepsX, z: 3.8 };
const rideFinish = { x: -3.2, z: 4.3 };

const windsockAt: Triple = [-3.0, 0, -4.4];
const moleAt: Triple = [-3.3, 0, 0.6];
const signAt = { x: 2.6, z: 7.8 };

const onHill = (x: number, z: number, up = 0): Triple => [
  x,
  findHillHeight(x, z) + up,
  z,
];

/** A sheet laid over the hill, from `fromZ` to `toZ`, `width` wide at `x`. */
const addDrape = (
  builder: AttractionBuilder,
  finish: "matte" | "paint",
  colour: string,
  {
    x,
    width,
    fromZ,
    toZ,
    across,
    along,
    lift,
  }: {
    x: number;
    width: number;
    fromZ: number;
    toZ: number;
    across: number;
    along: number;
    lift: number;
  },
) => {
  const geometry = new PlaneGeometry(width, toZ - fromZ, across, along)
    .rotateX(-Math.PI / 2)
    .translate(x, 0, (fromZ + toZ) / 2);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    positions.setY(
      index,
      findHillHeight(positions.getX(index), positions.getZ(index)) + lift,
    );
  }
  geometry.computeVertexNormals();
  builder.add(finish, colour, geometry);
};

const buildHill = (builder: AttractionBuilder) => {
  const far = builder.isFar;
  addDrape(builder, "matte", hillGreen, {
    x: 0,
    width: (hillHalf + hillEdge) * 2 + 0.2,
    fromZ: backFoot - 0.1,
    toZ: frontFoot + 0.1,
    across: far ? 10 : 22,
    along: far ? 12 : 26,
    lift: 0.005,
  });
  /* The plastic lane mats, orange and green, and a soft runout */
  lanes.forEach((x, index) => {
    addDrape(builder, "paint", index === 0 ? laneOrange : laneGreen, {
      x,
      width: laneHalf * 2,
      fromZ: laneTop,
      toZ: runOutEnd,
      across: 1,
      along: far ? 8 : 24,
      lift: 0.035,
    });
    if (far) {
      return;
    }
    /* Foam bumpers either side */
    [-1, 1].forEach((side) => {
      const bx = x + side * (laneHalf + 0.06);
      const pieces = 12;
      for (let piece = 0; piece < pieces; piece++) {
        const z0 = laneTop + ((runOutEnd - laneTop) / pieces) * piece;
        const z1 = laneTop + ((runOutEnd - laneTop) / pieces) * (piece + 1);
        builder.bar(
          "paint",
          bumperBlue,
          onHill(bx, z0, 0.1),
          onHill(bx, z1, 0.1),
          0.16,
          6,
        );
      }
    });
    /* White stripes painted across the mat as it gets steeper */
    for (let stripe = 0; stripe < 6; stripe++) {
      const z = laneTop + 0.8 + stripe * 1.1;
      const [, y] = onHill(x, z, 0.045);
      const slope = Math.atan2(
        findHillHeight(x, z - 0.1) - findHillHeight(x, z + 0.1),
        0.2,
      );
      builder.box(
        "paint",
        palette.white,
        [laneHalf * 2 - 0.1, 0.01, 0.08],
        [x, y, z],
        [slope, 0, 0],
      );
    }
  });
};

const buildSteps = (builder: AttractionBuilder) => {
  /* Railway sleepers set into the grass, with a handrail */
  const steps = builder.isFar ? 0 : 16;
  for (let step = 0; step < steps; step++) {
    const z = frontFoot - 0.2 - ((frontFoot - topFront + 0.3) / steps) * step;
    builder.box(
      "matte",
      palette.darkTimber,
      [1.0, 0.1, 0.22],
      onHill(stepsX, z, 0.04),
    );
  }
  const posts = builder.isFar ? 3 : 7;
  for (let post = 0; post < posts; post++) {
    const z = frontFoot - 0.3 - ((frontFoot - topFront) / (posts - 1)) * post;
    const [x, y] = onHill(stepsX + 0.7, z);
    builder.cylinder("matte", palette.paleTimber, {
      radius: 0.04,
      length: 0.9,
      at: [x, y + 0.45, z],
      segments: 6,
    });
    if (post > 0) {
      const zBefore =
        frontFoot - 0.3 - ((frontFoot - topFront) / (posts - 1)) * (post - 1);
      builder.bar(
        "matte",
        palette.paleTimber,
        onHill(stepsX + 0.7, zBefore, 0.88),
        [x, y + 0.88, z],
        0.05,
        5,
      );
    }
  }
};

const buildStartGate = (builder: AttractionBuilder) => {
  /* A red starting gate across the top of both lanes, with a canopy */
  const z = laneTop - 0.3;
  const y = hillTop;
  const fromX = lanes[0] - laneHalf - 0.25;
  const toX = lanes[1] + laneHalf + 0.25;
  [fromX, (lanes[0] + lanes[1]) / 2, toX].forEach((x) => {
    builder.cylinder("paint", gateRed, {
      radius: 0.06,
      length: 2.0,
      at: [x, y + 1.0, z],
      segments: 8,
    });
  });
  builder.box(
    "paint",
    palette.white,
    [toX - fromX + 0.2, 0.36, 0.06],
    [(fromX + toX) / 2, y + 2.0, z],
  );
  if (!builder.isFar) {
    /* Chequered squares along the board */
    for (let square = 0; square < 14; square++) {
      builder.box(
        "paint",
        palette.black,
        [0.18, 0.18, 0.02],
        [
          fromX + 0.1 + square * 0.2,
          y + 2.0 + (square % 2 === 0 ? 0.09 : -0.09),
          z + 0.04,
        ],
      );
    }
  }
  builder.box(
    "paint",
    gateRed,
    [toX - fromX + 0.4, 0.06, 1.0],
    [(fromX + toX) / 2, y + 2.25, z - 0.3],
    [0.15, 0, 0],
  );
  addBunting(
    builder,
    [fromX, y + 2.0, z],
    onHill(windsockAt[0], windsockAt[2], 2.2),
    [gateRed, palette.white, bumperBlue, "#f2c12e"],
    0.2,
  );
  /* A rack of sledges waiting at the top */
  if (!builder.isFar) {
    [0, 1, 2].forEach((index) => {
      addSledge(
        builder,
        [-2.6 + index * 0.05, y + 0.1 + index * 0.08, -4.9],
        index % 2 === 0 ? laneOrange : laneGreen,
      );
    });
  }
};

/** A plastic grass sledge facing +z, its tail at y. */
function addSledge(builder: AttractionBuilder, at: Triple, colour: string) {
  const [x, y, z] = at;
  builder.box("paint", colour, [0.5, 0.05, 0.85], [x, y + 0.03, z]);
  builder.box(
    "paint",
    colour,
    [0.5, 0.05, 0.25],
    [x, y + 0.12, z + 0.5],
    [-0.7, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      shade(colour, 0.85),
      [0.04, 0.12, 0.85],
      [x + side * 0.25, y + 0.07, z],
    );
  });
  builder.bar(
    "matte",
    palette.white,
    [x - 0.18, y + 0.2, z + 0.58],
    [x + 0.18, y + 0.2, z + 0.58],
    0.025,
    3,
  );
}

const buildBottom = (builder: AttractionBuilder) => {
  /* A wall of straw bales to stop in, and a finish banner */
  for (let bale = 0; bale < 5; bale++) {
    const x = -2.6 + bale * 0.85;
    [0, 1].forEach((layer) => {
      if (layer === 1 && (bale === 0 || bale === 4)) {
        return;
      }
      builder.box(
        "matte",
        shade(hayGold, 0.92 + ((bale + layer) % 3) * 0.06),
        [0.8, 0.45, 0.5],
        [x, 0.23 + layer * 0.46, runOutEnd + 0.75],
      );
    });
  }
  [lanes[0] - laneHalf - 0.6, lanes[1] + laneHalf + 0.6].forEach((x) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.06,
      length: 2.4,
      at: [x, 1.2, frontFoot + 0.4],
      segments: 8,
    });
  });
  builder.box(
    "paint",
    gateRed,
    [lanes[1] - lanes[0] + laneHalf * 2 + 1.3, 0.4, 0.05],
    [(lanes[0] + lanes[1]) / 2, 2.3, frontFoot + 0.4],
  );
  if (builder.isFar) {
    return;
  }
  for (let square = 0; square < 10; square++) {
    builder.box(
      "paint",
      palette.white,
      [0.16, 0.16, 0.02],
      [lanes[0] - 0.9 + square * 0.36, 2.3, frontFoot + 0.43],
    );
  }
  /* Sledges stacked by the hire hut, a bench and a picnic rug */
  [0, 1, 2, 3].forEach((index) => {
    addSledge(
      builder,
      [4.2, 0.06 * index, 3.2],
      index % 2 === 0 ? laneGreen : laneOrange,
    );
  });
  builder.box("paint", palette.cream, [1.2, 1.5, 1.0], [4.4, 0.75, 1.8]);
  builder.box("paint", laneGreen, [1.4, 0.08, 1.2], [4.4, 1.54, 1.8]);
  builder.box("paint", palette.black, [0.04, 0.4, 0.6], [3.79, 1.0, 1.8]);
  addBench(builder, [-4.4, 0, 4.2], Math.PI / 2 + 0.3);
  builder.box(
    "matte",
    "#c8303a",
    [1.4, 0.015, 1.1],
    [1.4, 0.01, 5.6],
    [0, 0.3, 0],
  );
  for (let check = 0; check < 3; check++) {
    builder.box(
      "matte",
      palette.white,
      [1.4, 0.016, 0.12],
      [1.4, 0.012, 5.25 + check * 0.35],
      [0, 0.3, 0],
    );
  }
  builder.box(
    "matte",
    "#a8743a",
    [0.4, 0.22, 0.28],
    [1.2, 0.11, 5.6],
    [0, 0.3, 0],
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    palette.path,
    [1.4, 0.03, 3.4],
    [signAt.x - 0.3, 0.015, 5.8],
  );
  builder.box("matte", palette.path, [7.6, 0.03, 1.2], [0.4, 0.016, 4.7]);
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  addTree(builder, [6.2, 0, -4.6], 1.15);
  addTree(builder, [-6.2, 0, -3.4], 1.05, "#4a9440");
  if (builder.isFar) {
    return;
  }
  addBush(builder, [-6.0, 0, 3.0], 0.55);
  addBush(builder, [6.6, 0, -0.6], 0.5, "#3a7d34");
  addFlowerClump(builder, [-4.8, 0, 6.0], [meadowColours.rose, palette.white]);
  addFlowerClump(
    builder,
    [5.4, 0, 5.4],
    [meadowColours.butter, meadowColours.cornflower],
  );
  /* Daisies scattered on the hill */
  for (let daisy = 0; daisy < 18; daisy++) {
    const angle = daisy * 2.39996;
    const x = Math.sin(angle) * (1 + (daisy % 6) * 0.5) - 2.6;
    const z = Math.cos(angle) * 2.5 - 1.5;
    if (Math.abs(x - lanes[0]) < 0.8) {
      continue;
    }
    builder.add(
      "matte",
      palette.white,
      new ConeGeometry(0.05, 0.03, 5).rotateX(Math.PI),
      {
        at: onHill(x, z, 0.03),
      },
    );
  }
  /* The mole's hill of earth */
  builder.sphere(
    "matte",
    palette.soil,
    0.3,
    onHill(moleAt[0], moleAt[2], -0.05),
    [1, 0.5, 1],
    10,
  );
};

const buildWindsockPole = (builder: AttractionBuilder) => {
  const at = onHill(windsockAt[0], windsockAt[2]);
  builder.cylinder("paint", palette.white, {
    radius: 0.05,
    length: 2.6,
    at: [at[0], at[1] + 1.3, at[2]],
    segments: 8,
  });
};

/** The windsock, which swings round to point downwind as you come near. */
const buildWindsock = (builder: AttractionBuilder) => {
  builder.torus("metal", palette.steel, 0.16, 0.015, [0, 0, 0.05], "z", 12);
  const bands = 5;
  for (let band = 0; band < bands; band++) {
    const from = 0.16 - band * 0.022;
    builder.cylinder("matte", band % 2 === 0 ? laneOrange : palette.white, {
      radius: from,
      radiusEnd: from - 0.022,
      length: 0.24,
      at: [0, -band * 0.03, -0.12 - band * 0.24],
      axis: "z",
      segments: 10,
      isOpen: true,
    });
  }
};

/** A mole, popping up out of its molehill. */
const buildMole = (builder: AttractionBuilder) => {
  const fur = "#2a2628";
  builder.sphere("matte", fur, 0.13, [0, 0.12, 0], [0.9, 1, 1.1], 10);
  builder.sphere("matte", "#e8a0a0", 0.04, [0, 0.16, 0.13], [1, 0.8, 1.2], 6);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      "#e8b8b0",
      0.05,
      [side * 0.12, 0.08, 0.08],
      [1, 0.4, 1.2],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.012,
      [side * 0.04, 0.2, 0.11],
      [1, 1, 1],
      4,
    );
  });
};

const buildChild = buildVillager({
  top: "#f2c12e",
  legs: "#2a3a5a",
  hair: "#a0602a",
  size: 0.72,
});

const hillDeck: Deck = ({ x, z }) => {
  const height = findHillHeight(x, z);
  return height > 0.02 ? { height, kind: "ground" } : undefined;
};

/* Climb the steps, walk to the top of a lane, and whizz down on a sledge */
const sledgeRide = (progress: number): LocalSpot => {
  const climb = 0.32;
  const walk = 0.42;
  const slide = 0.94;
  const lane = lanes[0];
  const top = topFront - 0.1;
  if (progress < climb) {
    const share = progress / climb;
    const z = rideStart.z + (top - rideStart.z) * share;
    return { x: stepsX, y: findHillHeight(stepsX, z), z, heading: Math.PI };
  }
  if (progress < walk) {
    const share = (progress - climb) / (walk - climb);
    const x = stepsX + (lane - stepsX) * share;
    return { x, y: findHillHeight(x, top), z: top, heading: -Math.PI / 2 };
  }
  if (progress < slide) {
    const share = (progress - walk) / (slide - walk);
    const eased =
      share < 0.75
        ? (share / 0.75) ** 1.6 * 0.85
        : 0.85 + (1 - (1 - (share - 0.75) / 0.25) ** 2) * 0.15;
    const z = top + (runOutEnd - 0.2 - top) * eased;
    return { x: lane, y: findHillHeight(lane, z) + 0.1, z, heading: 0 };
  }
  const share = (progress - slide) / (1 - slide);
  return {
    x: lane + (rideFinish.x - lane) * share,
    y: 0,
    z: runOutEnd - 0.2 + (rideFinish.z - (runOutEnd - 0.2)) * share,
    heading: -Math.PI / 2,
  };
};

export const grassSledgeHillModel: NewLandAttractionModel = {
  kind: "grass-sledge-hill",
  islandId: "meadow-isle",
  name: "Grass Sledge Hill",
  fact: "You don't need snow to go sledging! A grass sledge has a smooth, shiny plastic bottom that slips easily over the grass, while a rough, bumpy bottom would rub and slow you down. Plastic is a good material for sledges because it is smooth, light and waterproof.",
  curriculumLink:
    "Science, Year 1: everyday materials. Describe the simple physical properties of a variety of everyday materials, such as smooth, rough, shiny and waterproof.",
  footprint: 9.5,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildHill(builder);
    buildSteps(builder);
    buildStartGate(builder);
    buildBottom(builder);
    buildGrounds(builder);
    buildWindsockPole(builder);
  },
  moving: [
    {
      name: "windsock",
      pivot: onHill(windsockAt[0], windsockAt[2], 2.5),
      build: buildWindsock,
      motion: { kind: "whirl", axis: "y", idle: 0.15, speed: 2.4, reach: 7 },
    },
    {
      name: "mole",
      pivot: onHill(moleAt[0], moleAt[2], -0.25),
      build: buildMole,
      motion: { kind: "rise", reach: 4, height: 0.3, period: 1.2 },
    },
  ],
  wanderers: [
    {
      name: "children",
      build: buildChild,
      count: 3,
      centre: { x: 1.6, z: 5.6 },
      radius: 1.1,
      speed: 0.4,
    },
  ],
  decks: [hillDeck],
  rides: [
    {
      id: "grass-sledge",
      name: "the grass sledges",
      start: rideStart,
      reach: 0.6,
      seconds: 12,
      finish: rideFinish,
      follow: sledgeRide,
    },
  ],
  play: {
    label: "Race down the hill",
    news: "Ready, steady, go! You and a friend whizzed down the grass on your sledges, and you crossed the finish line first!",
  },
};
