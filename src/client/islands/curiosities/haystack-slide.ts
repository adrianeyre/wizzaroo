import { ConeGeometry } from "three";
import {
  addBush,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const hayGold = "#e2c069";
const hayEnd = "#c9a24a";
const twine = "#e07a2a";
const slideRed = "#d0453a";
const slideRail = "#f2c12e";
const ladderTimber = "#9a6a3a";
const henBrown = "#b5652e";
const henWhite = "#f4efe2";
const combRed = "#d0302a";
const beakYellow = "#e8a530";
const flagBlue = "#2f7fd0";
const signColour = "#a0702a";

/* Bales are a metre long, half a metre high and deep */
const baleLength = 1.0;
const baleSize = 0.5;
const stack = { minX: -1.5, maxX: 1.5, minZ: -2.25, maxZ: -0.75 };
const stackTop = baleSize * 3;
const slideX = 0.55;
const slideTop: Triple = [slideX, stackTop + 0.05, stack.maxZ];
const slideFoot: Triple = [slideX, 0.32, 1.45];
const runOutEnd = 2.05;
const ladderFoot = { x: -2.25, z: -1.4 };
const roosterAt: Triple = [0, stackTop + baleSize * 2, -2.0];
const flagAt: Triple = [-0.8, stackTop + baleSize, -2.0];

/** A rectangular bale, long along x or z, with its two bands of twine. */
const addBale = (
  builder: AttractionBuilder,
  at: Triple,
  isAlongX: boolean,
  tone: number,
) => {
  const size: Triple = isAlongX
    ? [baleLength - 0.02, baleSize - 0.02, baleSize - 0.02]
    : [baleSize - 0.02, baleSize - 0.02, baleLength - 0.02];
  builder.box("matte", shade(hayGold, tone), size, at);
  if (builder.isFar) {
    return;
  }
  /* Darker cut ends, and bands of twine round the middle */
  [-1, 1].forEach((end) => {
    const offset = (baleLength / 2 - 0.005) * end;
    builder.box(
      "matte",
      shade(hayEnd, tone),
      isAlongX
        ? [0.02, baleSize - 0.06, baleSize - 0.06]
        : [baleSize - 0.06, baleSize - 0.06, 0.02],
      isAlongX
        ? [at[0] + offset, at[1], at[2]]
        : [at[0], at[1], at[2] + offset],
    );
    const band = 0.25 * end;
    builder.box(
      "matte",
      twine,
      isAlongX ? [0.03, baleSize, baleSize] : [baleSize, baleSize, 0.03],
      isAlongX ? [at[0] + band, at[1], at[2]] : [at[0], at[1], at[2] + band],
    );
  });
};

const buildStack = (builder: AttractionBuilder) => {
  /* Three layers, the bales turned each layer like bricks, for strength */
  for (let layer = 0; layer < 3; layer++) {
    const y = baleSize * layer + baleSize / 2;
    const isAlongX = layer % 2 === 0;
    if (isAlongX) {
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
          addBale(
            builder,
            [stack.minX + 0.5 + column, y, stack.minZ + 0.25 + row * 0.5],
            true,
            0.92 + ((row + column + layer) % 3) * 0.06,
          );
        }
      }
    } else {
      for (let column = 0; column < 6; column++) {
        addBale(
          builder,
          [stack.minX + 0.25 + column * 0.5, y, -1.5],
          false,
          0.92 + ((column + layer) % 3) * 0.06,
        );
      }
    }
  }
  /* Two more layers at the back, stepped up like a hill */
  [-0.5, 0.5].forEach((x, index) => {
    addBale(
      builder,
      [x, stackTop + baleSize / 2, -2.0],
      true,
      1 - index * 0.06,
    );
  });
  addBale(builder, [0, stackTop + baleSize * 1.5, -2.0], true, 1.04);
};

/** Round bales lying about, one on its end. */
const buildRoundBales = (builder: AttractionBuilder) => {
  const radius = 0.62;
  const bales: { at: Triple; axis: "x" | "y" | "z" }[] = [
    { at: [2.55, radius, -1.2], axis: "z" },
    { at: [2.5, radius, 0.35], axis: "x" },
    { at: [-2.6, 0.5, 0.6], axis: "y" },
  ];
  bales.forEach(({ at, axis }, index) => {
    builder.cylinder("matte", shade(hayGold, 0.96 + index * 0.04), {
      radius,
      length: 1.0,
      at,
      axis,
      segments: builder.isFar ? 8 : 22,
    });
    if (builder.isFar) {
      return;
    }
    /* The rolled-up spiral showing on each end */
    [-1, 1].forEach((end) => {
      const offset: Triple =
        axis === "x"
          ? [end * 0.5, 0, 0]
          : axis === "y"
            ? [0, end * 0.5, 0]
            : [0, 0, end * 0.5];
      [0.22, 0.42].forEach((ring) => {
        builder.torus(
          "matte",
          hayEnd,
          ring,
          0.025,
          [at[0] + offset[0], at[1] + offset[1], at[2] + offset[2]],
          axis,
          18,
        );
      });
    });
  });
};

/** The slide: a red chute with yellow rails, on legs, with a flat run-out. */
const buildSlide = (builder: AttractionBuilder) => {
  const run = slideFoot[2] - slideTop[2];
  const drop = slideTop[1] - slideFoot[1];
  const length = Math.hypot(run, drop);
  const angle = Math.atan2(drop, run);
  const middle: Triple = [
    slideX,
    (slideTop[1] + slideFoot[1]) / 2,
    (slideTop[2] + slideFoot[2]) / 2,
  ];
  builder.box("paint", slideRed, [0.7, 0.05, length], middle, [angle, 0, 0]);
  builder.box(
    "paint",
    slideRed,
    [0.7, 0.05, runOutEnd - slideFoot[2]],
    [slideX, slideFoot[1] - 0.02, (slideFoot[2] + runOutEnd) / 2],
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    const x = slideX + side * 0.36;
    builder.box(
      "paint",
      slideRail,
      [0.05, 0.18, length],
      [x, middle[1] + 0.08, middle[2]],
      [angle, 0, 0],
    );
    builder.box(
      "paint",
      slideRail,
      [0.05, 0.18, runOutEnd - slideFoot[2]],
      [x, slideFoot[1] + 0.06, (slideFoot[2] + runOutEnd) / 2],
    );
    /* Legs down to the ground */
    [0.45, 0.85].forEach((share) => {
      const z = slideTop[2] + run * share;
      const y = slideTop[1] - drop * share;
      builder.cylinder("metal", palette.steel, {
        radius: 0.03,
        length: y,
        at: [x, y / 2, z],
        segments: 8,
      });
    });
    builder.cylinder("metal", palette.steel, {
      radius: 0.03,
      length: slideFoot[1],
      at: [x, slideFoot[1] / 2, runOutEnd - 0.05],
      segments: 8,
    });
  });
  /* Grab handles at the top */
  [-1, 1].forEach((side) => {
    builder.torus(
      "paint",
      slideRail,
      0.12,
      0.025,
      [slideX + side * 0.38, slideTop[1] + 0.22, slideTop[2] - 0.12],
      "x",
      12,
    );
  });
  /* A soft landing: loose straw at the bottom */
  for (let wisp = 0; wisp < 10; wisp++) {
    const angle = wisp * 2.3;
    const x = slideX + Math.sin(angle) * (0.25 + (wisp % 3) * 0.15);
    const z = runOutEnd + 0.35 + Math.cos(angle) * 0.25;
    builder.box(
      "matte",
      wisp % 2 === 0 ? hayGold : hayEnd,
      [0.3, 0.02, 0.03],
      [x, 0.02, z],
      [0, angle, 0],
    );
  }
};

const buildLadder = (builder: AttractionBuilder) => {
  const top: Triple = [stack.minX - 0.05, stackTop + 0.25, ladderFoot.z];
  const foot: Triple = [ladderFoot.x + 0.2, 0, ladderFoot.z];
  [-0.22, 0.22].forEach((side) => {
    builder.bar(
      "matte",
      ladderTimber,
      [foot[0], foot[1], foot[2] + side],
      [top[0], top[1], top[2] + side],
      0.07,
      builder.isFar ? 4 : 6,
    );
  });
  if (builder.isFar) {
    return;
  }
  const rungs = 6;
  for (let rung = 1; rung <= rungs; rung++) {
    const share = rung / (rungs + 1);
    const x = foot[0] + (top[0] - foot[0]) * share;
    const y = foot[1] + (top[1] - foot[1]) * share;
    builder.cylinder("matte", shade(ladderTimber, 1.1), {
      radius: 0.025,
      length: 0.48,
      at: [x, y, ladderFoot.z],
      axis: "z",
      segments: 6,
    });
  }
};

/** A pitchfork leaning on the stack, and other farm bits. */
const buildProps = (builder: AttractionBuilder) => {
  builder.box("matte", palette.path, [0.9, 0.03, 1.6], [-1.6, 0.015, 2.6]);
  if (builder.isFar) {
    return;
  }
  const forkFoot: Triple = [-1.25, 0, -0.35];
  const forkTop: Triple = [-1.05, 1.35, -0.72];
  builder.bar("matte", palette.paleTimber, forkFoot, forkTop, 0.04, 6);
  builder.box(
    "metal",
    palette.steel,
    [0.24, 0.03, 0.03],
    [forkFoot[0], 0.32, forkFoot[2] + 0.05],
  );
  [-0.1, 0, 0.1].forEach((dx) => {
    builder.bar(
      "metal",
      palette.steel,
      [forkFoot[0] + dx, 0.32, forkFoot[2] + 0.05],
      [forkFoot[0] + dx, 0.02, forkFoot[2] + 0.1],
      0.015,
      4,
    );
  });
  /* A hay rack of loose straw for the hens, and their water dish */
  builder.cylinder("metal", palette.steel, {
    radius: 0.22,
    radiusEnd: 0.26,
    length: 0.08,
    at: [2.1, 0.04, 1.6],
    segments: 14,
  });
  builder.cylinder("water", palette.water, {
    radius: 0.2,
    length: 0.02,
    at: [2.1, 0.07, 1.6],
    segments: 14,
  });
  for (let wisp = 0; wisp < 12; wisp++) {
    const angle = wisp * 1.9;
    const radius = 0.4 + (wisp % 4) * 0.3;
    builder.box(
      "matte",
      wisp % 2 === 0 ? hayGold : hayEnd,
      [0.32, 0.02, 0.03],
      [Math.sin(angle) * radius - 2.0, 0.02, Math.cos(angle) * radius + 1.6],
      [0, angle, 0],
    );
  }
  addBush(builder, [3.3, 0, -2.6], 0.5);
  addBush(builder, [-3.4, 0, -2.4], 0.55, "#3d7a34");
};

/** The cockerel on top of the stack, facing +z, standing on y = 0. */
const buildRooster = (builder: AttractionBuilder) => {
  builder.sphere("paint", henBrown, 0.17, [0, 0.3, 0], [0.85, 0.9, 1.15], 12);
  builder.sphere(
    "paint",
    shade(henBrown, 1.2),
    0.1,
    [0, 0.47, 0.12],
    [1, 1.1, 1],
    10,
  );
  builder.add("paint", combRed, new ConeGeometry(0.035, 0.1, 6), {
    at: [0, 0.6, 0.12],
  });
  builder.add("paint", combRed, new ConeGeometry(0.03, 0.08, 6), {
    at: [0, 0.58, 0.07],
  });
  builder.sphere("paint", combRed, 0.03, [0, 0.4, 0.2], [0.6, 1.3, 0.6], 6);
  builder.add(
    "paint",
    beakYellow,
    new ConeGeometry(0.03, 0.08, 6).rotateX(Math.PI / 2),
    {
      at: [0, 0.47, 0.24],
    },
  );
  /* A proud arched tail of dark green feathers */
  [-0.35, 0, 0.35].forEach((spread, index) => {
    builder.bar(
      "paint",
      index === 1 ? "#2f4a3a" : "#3f6a4a",
      [spread * 0.1, 0.3, -0.15],
      [spread * 0.3, 0.62 - Math.abs(spread) * 0.2, -0.32],
      0.06,
      5,
    );
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [side * 0.07, 0.5, 0.18],
      [1, 1, 1],
      5,
    );
    builder.sphere(
      "paint",
      shade(henBrown, 0.8),
      0.1,
      [side * 0.12, 0.3, -0.02],
      [0.3, 0.6, 1],
      8,
    );
    builder.bar(
      "paint",
      beakYellow,
      [side * 0.05, 0.16, 0],
      [side * 0.05, 0, 0.03],
      0.025,
      4,
    );
  });
};

/** A little red hen, facing +z, standing on y = 0. */
const buildHen = (builder: AttractionBuilder) => {
  builder.sphere("paint", henWhite, 0.12, [0, 0.18, 0], [0.85, 0.85, 1.2], 9);
  builder.sphere("paint", henWhite, 0.07, [0, 0.3, 0.1], [1, 1, 1], 8);
  builder.sphere("paint", combRed, 0.03, [0, 0.38, 0.1], [0.5, 1, 1.2], 5);
  builder.add(
    "paint",
    beakYellow,
    new ConeGeometry(0.02, 0.06, 5).rotateX(Math.PI / 2),
    {
      at: [0, 0.3, 0.18],
    },
  );
  builder.box(
    "paint",
    henWhite,
    [0.08, 0.1, 0.06],
    [0, 0.26, -0.13],
    [-0.5, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.012,
      [side * 0.045, 0.32, 0.14],
      [1, 1, 1],
      4,
    );
    builder.bar(
      "paint",
      beakYellow,
      [side * 0.04, 0.09, 0],
      [side * 0.04, 0, 0.02],
      0.02,
      4,
    );
  });
};

/** A blue pennant on top of the stack. */
const buildFlag = (builder: AttractionBuilder) => {
  builder.add(
    "paint",
    flagBlue,
    new ConeGeometry(0.16, 0.5, 3).rotateZ(Math.PI / 2).scale(1, 1, 0.1),
    { at: [0.25, 0.85, 0] },
  );
};

/* Climb the ladder, walk across the top, and whizz down the slide */
const slideRide = (progress: number): LocalSpot => {
  if (progress < 0.35) {
    const share = progress / 0.35;
    return {
      x: ladderFoot.x + (stack.minX + 0.2 - ladderFoot.x) * share,
      y: stackTop * share,
      z: ladderFoot.z,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.5) {
    const share = (progress - 0.35) / 0.15;
    const fromX = stack.minX + 0.2;
    const toZ = slideTop[2] - 0.15;
    return {
      x: fromX + (slideX - fromX) * share,
      y: stackTop,
      z: ladderFoot.z + (toZ - ladderFoot.z) * share,
      heading: Math.atan2(slideX - fromX, toZ - ladderFoot.z),
    };
  }
  const share = ((progress - 0.5) / 0.5) ** 1.4;
  const z = slideTop[2] - 0.15 + (runOutEnd + 0.15 - slideTop[2]) * share;
  const slope = Math.min(
    1,
    Math.max(0, (z - slideTop[2]) / (slideFoot[2] - slideTop[2])),
  );
  return {
    x: slideX,
    y:
      z > slideFoot[2]
        ? slideFoot[1] + 0.03
        : slideTop[1] + 0.03 - (slideTop[1] - slideFoot[1]) * slope,
    z,
    heading: 0,
  };
};

export const haystackSlideModel: CuriosityModel = {
  kind: "haystack-slide",
  islandId: "meadow-isle",
  name: "Haystack Slide",
  fact: "Hay is dried grass that farmers feed to animals in winter, and straw is the dry, hollow stalks left after wheat is harvested. Straw is light, bendy and scratchy, so it makes good bedding. The ladder and the pitchfork handle are made of wood, which is hard and strong, and the fork's prongs are made of metal.",
  curriculumLink:
    "Science, Year 1: everyday materials. Identify and name a variety of everyday materials, including wood and straw, and describe their simple physical properties.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: -1.6, z: 3.3 },
  build: (builder) => {
    buildStack(builder);
    buildRoundBales(builder);
    buildSlide(builder);
    buildLadder(builder);
    buildProps(builder);
    if (builder.isFar) {
      builder.sphere(
        "paint",
        henBrown,
        0.2,
        [roosterAt[0], roosterAt[1] + 0.3, roosterAt[2]],
        [1, 1, 1],
        6,
      );
    }
    addSignBoard(builder, [-1.6, 0, 3.3], signColour);
  },
  moving: [
    {
      name: "cockerel",
      pivot: roosterAt,
      build: buildRooster,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.35,
        period: 0.9,
      },
    },
    {
      name: "pennant",
      pivot: flagAt,
      build: (builder) => {
        builder.cylinder("matte", palette.darkTimber, {
          radius: 0.025,
          length: 1.1,
          at: [0, 0.55, 0],
          segments: 6,
        });
        buildFlag(builder);
      },
      motion: { kind: "swing", axis: "y", amplitude: 0.4, period: 3.2 },
    },
  ],
  wanderers: [
    {
      name: "hens",
      build: buildHen,
      count: 3,
      centre: { x: -0.9, z: 1.3 },
      radius: 0.8,
      speed: 0.35,
    },
  ],
  blockers: [
    ...listWallBlockers({ x: -1.0, z: -1.5 }, { x: 1.0, z: -1.5 }, 0.85, 0.5),
    ...listWallBlockers(
      { x: slideX, z: -0.4 },
      { x: slideX, z: 1.5 },
      0.35,
      0.4,
    ),
    { x: 2.55, z: -1.2, radius: 0.65 },
    { x: 2.5, z: 0.35, radius: 0.7 },
    { x: -2.6, z: 0.6, radius: 0.65 },
  ] satisfies LocalBlocker[],
  rides: [
    {
      id: "haystack-slide",
      name: "the haystack slide",
      start: { x: ladderFoot.x - 0.15, z: ladderFoot.z },
      reach: 0.6,
      seconds: 7,
      finish: { x: slideX, z: runOutEnd + 0.7 },
      follow: slideRide,
    },
  ],
  play: {
    label: "Slide down the hay",
    news: "Wheee! You climbed the wooden ladder, sat on the slide and whooshed down into a soft, scratchy pile of straw.",
  },
};
