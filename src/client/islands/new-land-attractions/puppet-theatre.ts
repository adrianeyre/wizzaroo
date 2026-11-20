import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  TorusGeometry,
} from "three";
import {
  addBench,
  addBush,
  addLampPost,
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

/*
 * A travelling puppet show set up on the village green: a striped
 * booth on a low wooden stage, telling The Three Little Pigs, rows of
 * benches for the audience, bunting, lamps, and the puppeteers' painted
 * show wagon with its stove smoking. There is a trapdoor in the stage
 * to drop through and pop up out of, just like a puppet.
 */

const stripeRed = "#c8342e";
const stripeCream = "#f4ead2";
const gilt = "#d8a93a";
const curtainRed = "#9c1f2a";
const backdropSky = "#8cc7ea";
const hillGreen = "#6fae4a";
const stageTimber = "#a87a4c";
const wagonGreen = "#2f6b4f";
const wagonRed = "#b8342c";
const wheelYellow = "#e8b83a";
const signColour = "#9c1f2a";
const pigPink = "#f2a6b4";
const wolfGrey = "#7d8088";

/* The stage */

const stageTop = 0.3;
const stage = { minX: -3.8, maxX: 3.8, minZ: -5.0, maxZ: -1.8 };
const booth = { x: 0, z: -3.7, width: 2.6, depth: 1.4 };
const boothBody = 1.6;
const openingBottom = stageTop + boothBody;
const openingTop = openingBottom + 0.95;
const trapdoorAt = { x: 2.6, z: -2.7 };

const buildStage = (builder: AttractionBuilder) => {
  const width = stage.maxX - stage.minX;
  const depth = stage.maxZ - stage.minZ;
  const centreX = (stage.minX + stage.maxX) / 2;
  const centreZ = (stage.minZ + stage.maxZ) / 2;
  builder.box(
    "matte",
    stageTimber,
    [width, stageTop, depth],
    [centreX, stageTop / 2, centreZ],
  );
  /* A painted skirt round the front */
  builder.box(
    "paint",
    wagonGreen,
    [width + 0.04, 0.2, 0.04],
    [centreX, 0.12, stage.maxZ + 0.01],
  );
  if (!builder.isFar) {
    const boards = Math.round(width / 0.4);
    for (let board = 1; board < boards; board++) {
      builder.box(
        "matte",
        shade(stageTimber, 0.8),
        [0.03, 0.01, depth],
        [stage.minX + board * 0.4, stageTop + 0.003, centreZ],
      );
    }
    /* Gold dots along the skirt */
    for (let dot = 0; dot < 12; dot++) {
      builder.sphere(
        "paint",
        gilt,
        0.035,
        [stage.minX + 0.35 + dot * 0.64, 0.12, stage.maxZ + 0.03],
        [1, 1, 0.4],
        6,
      );
    }
    /* The trapdoor, hinged, with a ring to lift it */
    builder.box(
      "matte",
      shade(stageTimber, 0.65),
      [0.9, 0.012, 0.9],
      [trapdoorAt.x, stageTop + 0.006, trapdoorAt.z],
    );
    builder.box(
      "matte",
      shade(stageTimber, 1.12),
      [0.82, 0.014, 0.82],
      [trapdoorAt.x, stageTop + 0.008, trapdoorAt.z],
    );
    builder.torus(
      "metal",
      palette.brass,
      0.06,
      0.012,
      [trapdoorAt.x, stageTop + 0.02, trapdoorAt.z + 0.3],
      "y",
      10,
    );
  }
  /* A low step at each front corner */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(stageTimber, 0.9),
      [1.0, 0.15, 0.4],
      [side * 3.0, 0.075, stage.maxZ + 0.2],
    );
  });
};

/* The booth */

const buildBooth = (builder: AttractionBuilder) => {
  const { x, z, width, depth } = booth;
  const front = z + depth / 2;
  const stripes = 8;
  const stripeWidth = width / stripes;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? stripeRed : stripeCream,
      [stripeWidth, boothBody, depth],
      [
        x - width / 2 + stripeWidth * (stripe + 0.5),
        stageTop + boothBody / 2,
        z,
      ],
    );
  }
  /* The playboard: the shelf the puppets lean on */
  builder.box(
    "paint",
    gilt,
    [width + 0.1, 0.1, 0.36],
    [x, openingBottom, front + 0.08],
  );
  /* Pillars each side of the opening, and the header above */
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      stripeRed,
      [0.38, openingTop - openingBottom, depth],
      [x + side * (width / 2 - 0.19), (openingBottom + openingTop) / 2, z],
    );
    builder.box(
      "paint",
      gilt,
      [0.06, openingTop - openingBottom, 0.06],
      [x + side * (width / 2 - 0.4), (openingBottom + openingTop) / 2, front],
    );
    /* Gathered curtains, tied back */
    builder.cylinder("matte", curtainRed, {
      radius: 0.1,
      radiusEnd: 0.17,
      length: openingTop - openingBottom - 0.05,
      at: [
        x + side * (width / 2 - 0.55),
        (openingBottom + openingTop) / 2,
        front - 0.06,
      ],
      segments: 8,
    });
    if (!builder.isFar) {
      builder.torus(
        "paint",
        gilt,
        0.11,
        0.02,
        [x + side * (width / 2 - 0.55), openingBottom + 0.4, front - 0.06],
        "y",
        10,
      );
      /* Gold tassels hanging from the playboard */
      for (let tassel = 0; tassel < 3; tassel++) {
        builder.add("paint", gilt, new ConeGeometry(0.04, 0.16, 5), {
          at: [
            x + side * (0.25 + tassel * 0.35),
            openingBottom - 0.12,
            front + 0.24,
          ],
        });
      }
    }
  });
  const headerHeight = 0.55;
  builder.box(
    "paint",
    stripeCream,
    [width, headerHeight, depth],
    [x, openingTop + headerHeight / 2, z],
  );
  builder.box(
    "paint",
    gilt,
    [width + 0.08, 0.07, depth + 0.08],
    [x, openingTop + 0.03, z],
  );
  /* An arched pediment with a gold star */
  builder.cylinder("paint", stripeRed, {
    radius: 0.8,
    length: 0.12,
    at: [x, openingTop + headerHeight, front - 0.06],
    axis: "z",
    segments: 20,
  });
  builder.box(
    "paint",
    gilt,
    [width + 0.08, 0.07, depth + 0.08],
    [x, openingTop + headerHeight, z],
  );
  builder.add(
    "paint",
    gilt,
    new ConeGeometry(0.22, 0.06, 5).rotateX(Math.PI / 2),
    { at: [x, openingTop + headerHeight + 0.35, front + 0.02] },
  );
  /* Finials on top */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      gilt,
      0.1,
      [
        x + side * (width / 2 - 0.12),
        openingTop + headerHeight + 0.12,
        front - 0.1,
      ],
      [1, 1, 1],
      10,
    );
  });
  /* The scenery behind the opening: sky, hills and the three houses */
  const back = z - depth / 2 + 0.25;
  builder.box(
    "matte",
    backdropSky,
    [width - 0.8, openingTop - openingBottom, 0.05],
    [x, (openingBottom + openingTop) / 2, back],
  );
  builder.cylinder("matte", hillGreen, {
    radius: 0.7,
    length: 0.05,
    at: [x - 0.35, openingBottom, back + 0.04],
    axis: "z",
    segments: 16,
  });
  builder.cylinder("matte", shade(hillGreen, 0.88), {
    radius: 0.55,
    length: 0.05,
    at: [x + 0.45, openingBottom, back + 0.05],
    axis: "z",
    segments: 16,
  });
  if (builder.isFar) {
    return;
  }
  [
    {
      at: -0.55,
      wall: meadowColours.thatch,
      roof: shade(meadowColours.thatch, 0.85),
    },
    { at: 0, wall: palette.paleTimber, roof: palette.darkTimber },
    { at: 0.55, wall: meadowColours.redBrick, roof: palette.slate },
  ].forEach(({ at, wall, roof }) => {
    builder.box(
      "matte",
      wall,
      [0.24, 0.2, 0.04],
      [x + at, openingBottom + 0.42, back + 0.09],
    );
    builder.add(
      "matte",
      roof,
      new ConeGeometry(0.19, 0.16, 4).rotateY(Math.PI / 4).scale(1, 1, 0.2),
      { at: [x + at, openingBottom + 0.6, back + 0.09] },
    );
  });
  builder.sphere(
    "glow",
    meadowColours.butter,
    0.1,
    [x + 0.6, openingTop - 0.18, back + 0.06],
    [1, 1, 0.3],
    10,
  );
};

/* The audience */

const benchRows = [0.8, 2.2, 3.6];

const buildAudience = (builder: AttractionBuilder) => {
  benchRows.forEach((z) => {
    [-1, 1].forEach((side) => {
      addBench(builder, [side * 1.7, 0, z], Math.PI, meadowColours.cream);
    });
  });
  /* Cushions on the front benches */
  if (!builder.isFar) {
    [-2.1, -1.4, 1.4, 2.1].forEach((x, index) => {
      builder.box(
        "matte",
        index % 2 === 0 ? meadowColours.sky : meadowColours.rose,
        [0.3, 0.06, 0.26],
        [x, 0.39, benchRows[0] + 0.1],
      );
    });
  }
};

/* The show wagon */

const wagonAt = { x: -6.0, z: -1.2, turn: 0.35 };

const buildWagon = (builder: AttractionBuilder) => {
  const { x, z, turn } = wagonAt;
  const place = (dx: number, dy: number, dz: number): Triple => [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    dy,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  const rotation: Triple = [0, turn, 0];
  const length = 2.8;
  const width = 1.4;
  const floor = 0.75;
  const wall = 1.15;
  builder.box(
    "paint",
    wagonGreen,
    [width, wall, length],
    place(0, floor + wall / 2, 0),
    rotation,
  );
  /* A rounded roof over it */
  builder.add(
    "paint",
    wagonRed,
    new CylinderGeometry(
      width / 2 + 0.12,
      width / 2 + 0.12,
      length + 0.2,
      builder.segments(16, 8),
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    ).rotateX(-Math.PI / 2),
    { at: place(0, floor + wall, 0), rotation },
  );
  /* The chassis and the big spoked wheels */
  builder.box(
    "matte",
    palette.darkTimber,
    [width - 0.2, 0.18, length + 0.3],
    place(0, floor - 0.09, 0),
    rotation,
  );
  [-1, 1].forEach((side) => {
    [-0.95, 0.95].forEach((end) => {
      const radius = end > 0 ? 0.42 : 0.5;
      const hub = place(side * (width / 2 + 0.05), radius, end);
      builder.add(
        "paint",
        wheelYellow,
        new TorusGeometry(radius, 0.045, 6, builder.segments(18, 10)).rotateY(
          Math.PI / 2 + turn,
        ),
        { at: hub },
      );
      builder.sphere("paint", wagonRed, 0.08, hub, [1, 1, 1], 8);
      const spokes = builder.isFar ? 2 : 4;
      for (let spoke = 0; spoke < spokes; spoke++) {
        const angle = (spoke / spokes) * Math.PI;
        builder.add(
          "paint",
          wheelYellow,
          new BoxGeometry(0.035, radius * 2, 0.035)
            .rotateX(angle)
            .rotateY(turn),
          { at: hub },
          undefined,
        );
      }
    });
  });
  /* The back door, its steps, windows with flowers, and the stove pipe */
  builder.box(
    "paint",
    wagonRed,
    [0.6, 0.95, 0.04],
    place(0, floor + 0.5, length / 2 + 0.02),
    rotation,
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.6, 0.06, 0.3],
    place(0, 0.5, length / 2 + 0.3),
    rotation,
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.6, 0.06, 0.3],
    place(0, 0.25, length / 2 + 0.55),
    rotation,
  );
  [-0.6, 0.6].forEach((along) => {
    builder.box(
      "glow",
      palette.warmLight,
      [0.04, 0.4, 0.5],
      place(width / 2 + 0.01, floor + 0.65, along),
      rotation,
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        wheelYellow,
        [0.06, 0.5, 0.6],
        place(width / 2, floor + 0.65, along),
        rotation,
      );
      builder.box(
        "matte",
        meadowColours.rose,
        [0.12, 0.1, 0.5],
        place(width / 2 + 0.08, floor + 0.38, along),
        rotation,
      );
    }
  });
  if (!builder.isFar) {
    /* Swirls painted along the side */
    for (let swirl = 0; swirl < 5; swirl++) {
      builder.sphere(
        "paint",
        wheelYellow,
        0.05,
        place(width / 2 + 0.01, floor + 1.02, -1.2 + swirl * 0.6),
        [0.3, 1, 1],
        6,
      );
    }
  }
  builder.cylinder("metal", palette.black, {
    radius: 0.06,
    length: 0.6,
    at: place(-0.35, floor + wall + 0.85, -0.8),
    segments: 8,
  });
};

const chimneyTop = (): Triple => {
  const { x, z, turn } = wagonAt;
  return [
    x - 0.35 * Math.cos(turn) - 0.8 * Math.sin(turn),
    0.75 + 1.15 + 1.2,
    z + 0.35 * Math.sin(turn) - 0.8 * Math.cos(turn),
  ];
};

/* The green round it all */

const buildGreen = (builder: AttractionBuilder) => {
  /* A gravel aisle down the middle to the stage */
  builder.box("matte", palette.gravel, [1.8, 0.03, 9.6], [0, 0.015, 3.0]);
  addLampPost(builder, [-1.2, 0, 6.6], 2.3);
  addLampPost(builder, [1.2, 0, 6.6], 2.3);
  /* Bunting from the booth to two poles */
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.06,
      length: 3.2,
      at: [side * 4.4, 1.6, -1.2],
      segments: 8,
    });
    builder.sphere("paint", gilt, 0.09, [side * 4.4, 3.25, -1.2], [1, 1, 1], 8);
    addBunting(
      builder,
      [side * 1.2, openingTop + 0.5, booth.z + 0.6],
      [side * 4.4, 3.1, -1.2],
      [stripeRed, meadowColours.butter, meadowColours.sky, palette.white],
      0.3,
    );
    addBunting(
      builder,
      [side * 4.4, 3.1, -1.2],
      [side * 2.6, 2.6, 6.0],
      [meadowColours.rose, meadowColours.butter, meadowColours.cornflower],
      0.35,
    );
  });
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.05,
      length: 2.7,
      at: [side * 2.6, 1.35, 6.0],
      segments: 8,
    });
  });
  addTree(builder, [5.8, 0, -5.2], 1.15, "#4a9440");
  addTree(builder, [-4.6, 0, -6.4], 1.05);
  addBush(builder, [6.6, 0, 1.8], 0.55);
  addBush(builder, [-6.8, 0, 3.6], 0.5, "#3a7d34");
  if (!builder.isFar) {
    [
      [3.6, 5.2],
      [-3.8, 5.6],
      [5.4, -1.0],
      [-3.0, -6.0],
    ].forEach(([x, z], index) => {
      addFlowerClump(
        builder,
        [x, 0, z],
        index % 2 === 0
          ? [meadowColours.poppy, meadowColours.butter]
          : [meadowColours.cornflower, palette.white],
        5,
        0.32,
      );
    });
    /* A wicker hamper of spare puppets by the steps */
    builder.box("matte", "#b98d4f", [0.7, 0.4, 0.5], [-3.0, 0.2, -1.2]);
    builder.box(
      "matte",
      shade("#b98d4f", 0.8),
      [0.74, 0.06, 0.54],
      [-3.0, 0.42, -1.2],
    );
    builder.sphere(
      "matte",
      meadowColours.butter,
      0.11,
      [-2.85, 0.5, -1.2],
      [1, 1, 1],
      8,
    );
  }
  addSignBoard(builder, [-2.6, 0, 7.6], signColour);
};

/* The puppets */

const playboardFront = booth.z + booth.depth / 2;
const pigAt: Triple = [-0.35, openingBottom - 0.55, playboardFront - 0.2];
const wolfAt: Triple = [0.45, openingBottom - 0.1, playboardFront - 0.2];

const addGlove = (builder: AttractionBuilder, colour: string) => {
  /* The puppet's frock, worn over the puppeteer's hand */
  builder.cylinder("matte", colour, {
    radius: 0.1,
    radiusEnd: 0.16,
    length: 0.5,
    at: [0, 0.25, 0],
    segments: 10,
  });
};

const buildPig = (builder: AttractionBuilder) => {
  addGlove(builder, meadowColours.sky);
  builder.sphere("matte", pigPink, 0.15, [0, 0.62, 0], [1, 0.95, 0.95], 12);
  builder.cylinder("matte", shade(pigPink, 0.9), {
    radius: 0.06,
    length: 0.06,
    at: [0, 0.6, 0.15],
    axis: "z",
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.add("matte", pigPink, new ConeGeometry(0.05, 0.1, 4), {
      at: [side * 0.09, 0.78, 0],
      rotation: [0.3, 0, -side * 0.4],
    });
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [side * 0.06, 0.68, 0.13],
      [1, 1, 1],
      5,
    );
    builder.sphere(
      "matte",
      pigPink,
      0.04,
      [side * 0.17, 0.45, 0.06],
      [1, 1, 1],
      6,
    );
  });
  builder.box(
    "matte",
    meadowColours.butter,
    [0.2, 0.04, 0.02],
    [0, 0.42, 0.12],
  );
};

const buildWolf = (builder: AttractionBuilder) => {
  addGlove(builder, palette.darkTimber);
  builder.sphere("matte", wolfGrey, 0.15, [0, 0.62, 0], [1, 0.95, 1], 12);
  builder.add(
    "matte",
    wolfGrey,
    new ConeGeometry(0.08, 0.22, 8).rotateX(Math.PI / 2),
    {
      at: [0, 0.58, 0.2],
    },
  );
  builder.sphere("paint", palette.black, 0.03, [0, 0.58, 0.31], [1, 1, 1], 6);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.add(
      "matte",
      shade(wolfGrey, 0.8),
      new ConeGeometry(0.05, 0.16, 4),
      {
        at: [side * 0.09, 0.8, -0.02],
        rotation: [0, 0, -side * 0.2],
      },
    );
    builder.sphere(
      "paint",
      meadowColours.butter,
      0.025,
      [side * 0.06, 0.68, 0.13],
      [1, 1, 1],
      5,
    );
    builder.sphere(
      "matte",
      wolfGrey,
      0.04,
      [side * 0.17, 0.45, 0.06],
      [1, 1, 1],
      6,
    );
  });
  builder.box("matte", palette.white, [0.08, 0.02, 0.02], [0, 0.52, 0.27]);
};

const pinwheelAt: Triple = [
  0,
  openingTop + 0.55 + 0.95,
  booth.z + booth.depth / 2 - 0.05,
];

const buildPinwheel = (builder: AttractionBuilder) => {
  [
    stripeRed,
    meadowColours.butter,
    meadowColours.sky,
    meadowColours.rose,
  ].forEach((colour, blade) => {
    const angle = (blade / 4) * Math.PI * 2;
    builder.add(
      "paint",
      colour,
      new ConeGeometry(0.12, 0.34, 3).scale(1, 1, 0.12),
      {
        at: [Math.sin(angle) * 0.17, Math.cos(angle) * 0.17, 0],
        rotation: [0, 0, -angle],
      },
    );
  });
  builder.sphere("paint", gilt, 0.05, [0, 0, 0.03], [1, 1, 1], 8);
};

/** The pole the pinwheel turns on, on top of the booth. */
const addPinwheelPole = (builder: AttractionBuilder) => {
  builder.cylinder("paint", palette.white, {
    radius: 0.03,
    length: 1.0,
    at: [pinwheelAt[0], pinwheelAt[1] - 0.5, pinwheelAt[2] - 0.06],
    segments: 6,
  });
};

/* Wanderers */

const children = [
  buildVillager({
    top: meadowColours.rose,
    legs: meadowColours.navy,
    hair: "#6a4426",
    size: 0.72,
  }),
  buildVillager({
    top: meadowColours.butter,
    legs: meadowColours.sky,
    hair: "#2a1d14",
    size: 0.7,
    isDress: true,
  }),
];

/* The trapdoor */

const trapStart = { x: trapdoorAt.x, z: stage.maxZ + 0.9 };
const trapFinish = { x: trapdoorAt.x + 1.0, z: stage.maxZ + 1.3 };

const trapdoorRide = (progress: number): LocalSpot => {
  if (progress < 0.2) {
    /* Up onto the stage and over to the trapdoor */
    const share = progress / 0.2;
    return {
      x: trapdoorAt.x,
      y: Math.min(stageTop, share * 1.6 * stageTop),
      z: trapStart.z + (trapdoorAt.z - trapStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.45) {
    /* Down through the trapdoor, out of sight a moment */
    const share = (progress - 0.2) / 0.25;
    return {
      x: trapdoorAt.x,
      y: stageTop - Math.min(1, share * 2) * 1.3,
      z: trapdoorAt.z,
      heading: Math.PI + share * Math.PI,
    };
  }
  if (progress < 0.8) {
    /* Pop! Up and out like a jack-in-the-box, with a twirl */
    const share = (progress - 0.45) / 0.35;
    return {
      x: trapdoorAt.x,
      y: stageTop - 1.0 + 2.6 * Math.sin(share * Math.PI) + share * 1.0,
      z: trapdoorAt.z,
      heading: share * Math.PI * 2,
    };
  }
  const share = (progress - 0.8) / 0.2;
  return {
    x: trapdoorAt.x + (trapFinish.x - trapdoorAt.x) * share,
    y: stageTop * (1 - share) + 0.3 * Math.sin(share * Math.PI),
    z: trapdoorAt.z + (trapFinish.z - trapdoorAt.z) * share,
    heading: 0,
  };
};

export const puppetTheatreModel: NewLandAttractionModel = {
  kind: "puppet-theatre",
  islandId: "meadow-isle",
  name: "Puppet Theatre",
  fact: "Puppet shows are one of the oldest ways of telling stories. A glove puppet is worked by a hand inside it, and a marionette hangs from strings and is moved from above. Acting out a traditional tale like The Three Little Pigs helps you remember its beginning, middle and end.",
  curriculumLink:
    "English, Year 1: reading. Become very familiar with key stories, fairy stories and traditional tales, retelling them and considering their particular characteristics.",
  footprint: 9.2,
  setting: "inland",
  signSpot: { x: -2.6, z: 8.6 },
  build: (builder) => {
    buildGreen(builder);
    buildStage(builder);
    buildBooth(builder);
    addPinwheelPole(builder);
    buildAudience(builder);
    buildWagon(builder);
  },
  moving: [
    {
      name: "pig",
      pivot: pigAt,
      build: buildPig,
      motion: { kind: "rise", reach: 6, height: 0.5, period: 0.9 },
    },
    {
      name: "wolf",
      pivot: wolfAt,
      build: buildWolf,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.35,
        period: 1.1,
      },
    },
    {
      name: "pinwheel",
      pivot: pinwheelAt,
      build: buildPinwheel,
      motion: { kind: "whirl", axis: "z", idle: 0.6, speed: 7, reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "children",
      build: children[0],
      count: 2,
      centre: { x: -4.4, z: 3.4 },
      radius: 1.6,
      speed: 0.45,
    },
    {
      name: "more-children",
      build: children[1],
      count: 2,
      centre: { x: 4.6, z: 3.0 },
      radius: 1.6,
      speed: 0.4,
    },
  ],
  smoke: [
    {
      at: chimneyTop(),
      colour: "#d8d4cc",
      puffs: 5,
      size: 0.22,
      rise: 2.2,
      spread: 0.3,
    },
  ],
  decks: [buildFlatDeck(stage, stageTop, "bridge")],
  rides: [
    {
      id: "trapdoor",
      name: "the trapdoor",
      start: trapStart,
      reach: 0.55,
      seconds: 7,
      finish: trapFinish,
      follow: trapdoorRide,
    },
  ],
  tune: [67, 67, 69, 69, 71, 74, 71, 67, 67, 67, 69, 69, 71, 67, 62, 67],
  play: {
    label: "Raise the curtain",
    news: "Ta-da! The puppets acted out The Three Little Pigs, and the big bad wolf huffed and puffed but couldn't blow the brick house down.",
    tune: [67, 67, 69, 69, 71, 74, 71, 67],
  },
};
