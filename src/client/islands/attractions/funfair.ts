import {
  BoxGeometry,
  CylinderGeometry,
  OctahedronGeometry,
  LatheGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  addTree,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "./attraction-kit.js";

const crimson = "#a8232d";
const cream = "#f2e6c9";
const gold = "#d6a93f";
const navy = "#24365f";
const teal = "#1e6f73";
const bottle = "#2c5e3f";
const sawdust = "#cdb98c";
const deckWood = "#a5733f";
const coconut = "#6a4527";

const bulbColours = [
  palette.warmLight,
  "#ff8a5c",
  "#ffe08a",
  "#8fd4ff",
  "#ff7aa8",
  "#b6f28a",
];

const fullTurn = Math.PI * 2;

/** Which of `count` equal slices round a centre an angle falls in. */
const sliceOf = (x: number, z: number, count: number): number => {
  const share = Math.atan2(z, x) / fullTurn;
  return Math.floor((((share % 1) + 1) % 1) * count) % count;
};

const turnPoint = (
  origin: LocalPoint,
  turn: number,
  x: number,
  z: number,
): LocalPoint => ({
  x: origin.x + x * Math.cos(turn) + z * Math.sin(turn),
  z: origin.z - x * Math.sin(turn) + z * Math.cos(turn),
});

const addBulb = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  size = 0.05,
) => {
  builder.add(
    "glow",
    colour,
    new OctahedronGeometry(size, 0),
    { at },
    undefined,
  );
};

/** A sagging string of coloured bulbs from one point to another. */
const addBulbString = (
  builder: AttractionBuilder,
  from: Triple,
  to: Triple,
  sag = 0.4,
) => {
  if (builder.isFar) {
    return;
  }
  const along = (share: number): Triple => [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share - sag * 4 * share * (1 - share),
    from[2] + (to[2] - from[2]) * share,
  ];
  const pieces = 4;
  for (let piece = 0; piece < pieces; piece++) {
    builder.bar(
      "matte",
      palette.black,
      along(piece / pieces),
      along((piece + 1) / pieces),
      0.014,
      3,
    );
  }
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const bulbs = Math.max(4, Math.round(length / 0.5));
  for (let bulb = 1; bulb < bulbs; bulb++) {
    const [x, y, z] = along(bulb / bulbs);
    addBulb(builder, [x, y - 0.05, z], bulbColours[bulb % bulbColours.length]);
  }
};

/* The big wheel */

const wheelAt = { x: 0, z: -5.6 };
const wheelRadius = 3.2;
const hubHeight = 4.5;
const wheelSpeed = 0.22;
const gondolaCount = 8;
const rimSide = 0.42;
const wheelPivot: Triple = [wheelAt.x, hubHeight, wheelAt.z];
const wheelMotion: Motion = { kind: "spin", axis: "z", speed: wheelSpeed };
const gondolaMotion: Motion = {
  kind: "orbit",
  axis: "z",
  radius: wheelRadius,
  count: gondolaCount,
  speed: wheelSpeed,
};
const legSpread = 2.3;
const legTopZ = 0.78;
const legFootZ = 1.15;

const findLegPoint = (height: number, leg: number, side: number): Triple => {
  const share = 1 - height / hubHeight;
  return [
    wheelAt.x + leg * legSpread * share,
    height,
    wheelAt.z + side * (legTopZ + (legFootZ - legTopZ) * share),
  ];
};

const buildWheelFrame = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((leg) => {
      const foot = findLegPoint(0, leg, side);
      builder.bar(
        "paint",
        navy,
        findLegPoint(hubHeight, 0, side),
        foot,
        0.17,
        10,
      );
      builder.box(
        "matte",
        palette.darkStone,
        [0.42, 0.14, 0.42],
        [foot[0], 0.07, foot[2]],
      );
    });
    [1.45, 3.0].forEach((height) => {
      builder.bar(
        "paint",
        cream,
        findLegPoint(height, -1, side),
        findLegPoint(height, 1, side),
        0.08,
        8,
      );
    });
    if (!builder.isFar) {
      builder.bar(
        "paint",
        cream,
        findLegPoint(1.45, -1, side),
        findLegPoint(3.0, 1, side),
        0.06,
        6,
      );
      builder.bar(
        "paint",
        cream,
        findLegPoint(1.45, 1, side),
        findLegPoint(3.0, -1, side),
        0.06,
        6,
      );
    }
    builder.cylinder("paint", crimson, {
      radius: 0.24,
      length: 0.22,
      at: findLegPoint(hubHeight, 0, side),
      axis: "z",
      segments: 14,
    });
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.1,
    length: legTopZ * 2 + 0.3,
    at: wheelPivot,
    axis: "z",
    segments: 12,
  });
  builder.box(
    "matte",
    deckWood,
    [2.6, 0.18, 1.7],
    [wheelAt.x, 0.09, wheelAt.z],
  );
  builder.box(
    "paint",
    crimson,
    [2.64, 0.08, 1.74],
    [wheelAt.x, 0.14, wheelAt.z],
  );
  builder.box(
    "matte",
    shade(deckWood, 0.9),
    [1.3, 0.09, 0.45],
    [wheelAt.x, 0.045, wheelAt.z + 1.05],
  );
  if (!builder.isFar) {
    [-1, 1].forEach((leg) => {
      builder.bar(
        "paint",
        gold,
        [wheelAt.x + leg * 1.25, 0.18, wheelAt.z + 0.8],
        [wheelAt.x + leg * 1.25, 0.95, wheelAt.z + 0.8],
        0.04,
        6,
      );
    });
    builder.bar(
      "paint",
      gold,
      [wheelAt.x - 1.25, 0.95, wheelAt.z + 0.8],
      [wheelAt.x - 0.45, 0.95, wheelAt.z + 0.8],
      0.04,
      6,
    );
    builder.bar(
      "paint",
      gold,
      [wheelAt.x + 0.45, 0.95, wheelAt.z + 0.8],
      [wheelAt.x + 1.25, 0.95, wheelAt.z + 0.8],
      0.04,
      6,
    );
  }
};

const buildWheel = (builder: AttractionBuilder) => {
  [-rimSide, rimSide].forEach((z) => {
    builder.add(
      "paint",
      crimson,
      new TorusGeometry(wheelRadius, 0.06, 4, builder.segments(32, 16)),
      { at: [0, 0, z] },
    );
    builder.add(
      "paint",
      cream,
      new TorusGeometry(wheelRadius * 0.52, 0.035, 3, builder.segments(20, 10)),
      { at: [0, 0, z] },
    );
    const spokes = builder.isFar ? 8 : 12;
    for (let spoke = 0; spoke < spokes; spoke++) {
      const angle = (spoke / spokes) * fullTurn;
      builder.bar(
        "paint",
        cream,
        [Math.cos(angle) * 0.32, Math.sin(angle) * 0.32, z * 0.55],
        [Math.cos(angle) * wheelRadius, Math.sin(angle) * wheelRadius, z],
        0.045,
        4,
      );
    }
    if (!builder.isFar) {
      const bulbs = 16;
      for (let bulb = 0; bulb < bulbs; bulb++) {
        const angle = ((bulb + 0.5) / bulbs) * fullTurn;
        addBulb(
          builder,
          [
            Math.cos(angle) * wheelRadius,
            Math.sin(angle) * wheelRadius,
            z + Math.sign(z) * 0.07,
          ],
          bulb % 2 === 0 ? palette.warmLight : "#ff8a5c",
          0.055,
        );
      }
    }
  });
  for (let seat = 0; seat < gondolaCount; seat++) {
    const angle = (seat / gondolaCount) * fullTurn;
    const x = Math.cos(angle) * wheelRadius;
    const y = Math.sin(angle) * wheelRadius;
    builder.bar(
      "metal",
      palette.steel,
      [x, y, -rimSide - 0.06],
      [x, y, rimSide + 0.06],
      0.06,
      6,
    );
  }
  builder.cylinder("paint", crimson, {
    radius: 0.4,
    length: 0.5,
    at: [0, 0, 0],
    axis: "z",
    segments: 18,
  });
  builder.cylinder("metal", gold, {
    radius: 0.26,
    length: 0.66,
    at: [0, 0, 0],
    axis: "z",
    segments: 14,
  });
  if (!builder.isFar) {
    for (let star = 0; star < 8; star++) {
      const angle = (star / 8) * fullTurn;
      addBulb(
        builder,
        [
          Math.cos(angle) * wheelRadius * 0.52,
          Math.sin(angle) * wheelRadius * 0.52,
          rimSide + 0.05,
        ],
        palette.warmLight,
      );
    }
  }
};

const tubProfile: [number, number][] = [
  [0.001, -1.02],
  [0.26, -1.02],
  [0.35, -0.95],
  [0.38, -0.66],
  [0.35, -0.64],
  [0.32, -0.92],
  [0.001, -0.94],
];

const buildGondola = (builder: AttractionBuilder) => {
  [-0.3, 0.3].forEach((z) => {
    builder.bar("paint", cream, [0, 0, z], [0, -0.7, z * 1.08], 0.045, 6);
  });
  builder.lathe("paint", teal, tubProfile, [0, 0, 0], "y", 8);
  builder.cylinder("paint", gold, {
    radius: 0.385,
    length: 0.07,
    at: [0, -0.68, 0],
    segments: 14,
    isOpen: true,
  });
  builder.painted(
    new LatheGeometry(
      [new Vector2(0.43, 0), new Vector2(0.3, 0.08), new Vector2(0.02, 0.16)],
      builder.segments(8, 6),
    ),
    (centre) => (sliceOf(centre.x, centre.z, 8) % 2 === 0 ? crimson : cream),
    { at: [0, -0.24, 0] },
    "paint",
  );
  if (!builder.isFar) {
    builder.box("paint", navy, [0.5, 0.08, 0.2], [0, -0.82, 0]);
  }
};

/* The gallopers */

const carouselAt = { x: -4.3, z: 1.6 };
const carouselPivot: Triple = [carouselAt.x, 0, carouselAt.z];
const carouselSpeed = -0.7;
const carouselMotion: Motion = {
  kind: "spin",
  axis: "y",
  speed: carouselSpeed,
};
const horseRadius = 1.85;
const horseMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: horseRadius,
  count: 6,
  speed: carouselSpeed,
  isFacingAlong: true,
  bob: 0.12,
};
const platformRadius = 2.45;
const canopyRadius = 2.75;
const canopyHeight = 2.4;

const buildCarouselBase = (builder: AttractionBuilder) => {
  const segments = builder.segments(32, 16);
  builder.cylinder("matte", deckWood, {
    radius: platformRadius + 0.32,
    length: 0.08,
    at: [carouselAt.x, 0.04, carouselAt.z],
    segments,
  });
  builder.cylinder("paint", navy, {
    radius: platformRadius + 0.08,
    length: 0.1,
    at: [carouselAt.x, 0.13, carouselAt.z],
    segments,
  });
};

const buildCarousel = (builder: AttractionBuilder) => {
  const segments = builder.segments(32, 16);
  builder.painted(
    new CylinderGeometry(platformRadius, platformRadius, 0.14, segments),
    (centre, normal) =>
      normal.y > 0.5
        ? sliceOf(centre.x, centre.z, 18) % 2 === 0
          ? deckWood
          : shade(deckWood, 0.86)
        : crimson,
    { at: [0, 0.23, 0] },
    "paint",
  );
  builder.cylinder("metal", gold, {
    radius: platformRadius + 0.01,
    length: 0.035,
    at: [0, 0.28, 0],
    segments,
    isOpen: true,
  });
  builder.painted(
    new CylinderGeometry(0.55, 0.55, 2.0, 12, 1, true),
    (centre) =>
      sliceOf(centre.x, centre.z, 12) % 2 === 0
        ? { colour: "#d9e7ef", finish: "glass" }
        : crimson,
    { at: [0, 1.32, 0] },
    "paint",
  );
  [0.36, 2.3].forEach((height) => {
    builder.cylinder("paint", gold, {
      radius: 0.62,
      length: 0.14,
      at: [0, height, 0],
      segments: 14,
    });
  });
  builder.cylinder("paint", cream, {
    radius: canopyRadius - 0.02,
    length: 0.05,
    at: [0, canopyHeight + 0.02, 0],
    segments,
  });
  builder.painted(
    new CylinderGeometry(canopyRadius, canopyRadius, 0.44, segments, 4, true),
    (centre) => {
      const row = centre.y - canopyHeight;
      if (row < 0.11 || row > 0.33) {
        return gold;
      }
      return Math.floor(sliceOf(centre.x, centre.z, segments) / 2) % 2 === 0
        ? crimson
        : navy;
    },
    { at: [0, canopyHeight + 0.22, 0] },
    "paint",
  );
  builder.painted(
    new CylinderGeometry(
      canopyRadius - 0.01,
      canopyRadius - 0.01,
      0.13,
      segments,
      1,
      true,
    ),
    (centre) =>
      sliceOf(centre.x, centre.z, segments) % 2 === 0 ? cream : crimson,
    { at: [0, canopyHeight - 0.06, 0] },
    "paint",
  );
  builder.painted(
    new LatheGeometry(
      [
        new Vector2(canopyRadius + 0.1, 0),
        new Vector2(1.7, 0.38),
        new Vector2(0.7, 0.78),
        new Vector2(0.1, 1.0),
      ],
      builder.segments(32, 16),
    ),
    (centre) => (sliceOf(centre.x, centre.z, 16) % 2 === 0 ? crimson : cream),
    { at: [0, canopyHeight + 0.44, 0] },
    "paint",
  );
  builder.cylinder("paint", gold, {
    radius: 0.05,
    length: 0.5,
    at: [0, canopyHeight + 1.6, 0],
    segments: 8,
  });
  builder.sphere(
    "paint",
    gold,
    0.13,
    [0, canopyHeight + 1.5, 0],
    [1, 1, 1],
    10,
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    crimson,
    [0.32, 0.18, 0.02],
    [0.17, canopyHeight + 1.72, 0],
  );
  const bulbs = 28;
  for (let bulb = 0; bulb < bulbs; bulb++) {
    const angle = (bulb / bulbs) * fullTurn;
    addBulb(
      builder,
      [
        Math.cos(angle) * (canopyRadius + 0.03),
        canopyHeight + 0.22,
        Math.sin(angle) * (canopyRadius + 0.03),
      ],
      bulb % 2 === 0 ? palette.warmLight : "#ffe08a",
      0.05,
    );
  }
  const ribs = 8;
  for (let rib = 0; rib < ribs; rib++) {
    const angle = ((rib + 0.5) / ribs) * fullTurn;
    [1.6].forEach((reach) => {
      addBulb(
        builder,
        [
          Math.cos(angle) * reach,
          canopyHeight + 0.47 + (1 - reach / canopyRadius) * 0.62,
          Math.sin(angle) * reach,
        ],
        palette.warmLight,
        0.045,
      );
    });
  }
};

const horseCream = "#efe6d2";

/** A galloper on its brass pole, facing local +z (the way it goes). */
const buildHorse = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.brass, {
    radius: 0.035,
    length: 2.6,
    at: [0, 1.45, 0],
    segments: 8,
  });
  builder.sphere("paint", horseCream, 1, [0, 1.0, 0], [0.15, 0.17, 0.37], 9);
  builder.bar("paint", horseCream, [0, 1.06, 0.22], [0, 1.42, 0.38], 0.16, 8);
  builder.bar("paint", horseCream, [0, 1.47, 0.37], [0, 1.31, 0.6], 0.12, 8);
  builder.sphere("paint", horseCream, 0.065, [0, 1.3, 0.61], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      horseCream,
      [side * 0.07, 0.94, 0.22],
      [side * 0.07, 0.64, 0.6],
      0.075,
      6,
    );
    builder.bar(
      "paint",
      horseCream,
      [side * 0.07, 0.94, -0.22],
      [side * 0.07, 0.62, -0.58],
      0.085,
      6,
    );
  });
  builder.box("paint", crimson, [0.33, 0.2, 0.3], [0, 1.06, 0]);
  builder.box("paint", gold, [0.34, 0.04, 0.32], [0, 0.95, 0]);
  if (builder.isFar) {
    return;
  }
  builder.bar("paint", gold, [0, 1.17, 0.18], [0, 1.53, 0.36], 0.06, 4);
  builder.bar(
    "paint",
    palette.darkTimber,
    [0, 1.06, -0.34],
    [0, 0.78, -0.52],
    0.07,
    4,
  );
  builder.box("paint", navy, [0.2, 0.05, 0.28], [0, 1.18, 0]);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.black,
      [0.03, 0.08, 0.05],
      [side * 0.04, 1.53, 0.42],
    );
    builder.box(
      "paint",
      palette.black,
      [0.07, 0.06, 0.08],
      [side * 0.07, 0.62, 0.61],
    );
    builder.box(
      "paint",
      palette.black,
      [0.07, 0.06, 0.08],
      [side * 0.07, 0.6, -0.59],
    );
  });
};

const saddleHeight = 0.9;

const carouselStart = { x: carouselAt.x + 3.1, z: carouselAt.z };
const carouselFinish = { x: carouselAt.x + 2.6, z: carouselAt.z + 2.05 };

const carouselRide = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(horseMotion, seconds, { copy: 0 });
  const [x, y, z] = moveWithPose(
    carouselPivot,
    [carouselPivot[0], carouselPivot[1] + saddleHeight, carouselPivot[2]],
    pose,
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? carouselStart : carouselFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1],
  };
};

/* The coconut shy */

const shyAt = { x: 4.7, z: 1.0 };
const shyTurn = -0.45;
const shyWidth = 3.2;
const shyDepth = 1.8;

const buildCoconutShy = (builder: AttractionBuilder) => {
  const place = (x: number, y: number, z: number): Triple => {
    const { x: placedX, z: placedZ } = turnPoint(shyAt, shyTurn, x, z);
    return [placedX, y, placedZ];
  };
  const rotation: Triple = [0, shyTurn, 0];
  const localX = (worldX: number, worldZ: number): number =>
    (worldX - shyAt.x) * Math.cos(shyTurn) -
    (worldZ - shyAt.z) * Math.sin(shyTurn);
  const stripes = (worldX: number, worldZ: number): string =>
    Math.floor((localX(worldX, worldZ) + shyWidth) / 0.4) % 2 === 0
      ? crimson
      : cream;
  const halfWidth = shyWidth / 2;
  const halfDepth = shyDepth / 2;
  builder.box(
    "matte",
    deckWood,
    [shyWidth, 0.12, shyDepth],
    place(0, 0.06, 0),
    rotation,
  );
  builder.painted(
    new BoxGeometry(shyWidth, 2.2, 0.06, 8, 1, 1),
    (centre) => stripes(centre.x, centre.z),
    { at: place(0, 1.22, -halfDepth), rotation },
    "matte",
  );
  [-1, 1].forEach((side) => {
    builder.painted(
      new BoxGeometry(0.06, 2.2, shyDepth, 1, 1, 4),
      (centre) => {
        const { x, z } = centre;
        const depth =
          (x - shyAt.x) * Math.sin(shyTurn) + (z - shyAt.z) * Math.cos(shyTurn);
        return Math.floor((depth + shyDepth) / 0.45) % 2 === 0
          ? crimson
          : cream;
      },
      { at: place(side * halfWidth, 1.22, 0), rotation },
      "matte",
    );
    builder.cylinder("paint", gold, {
      radius: 0.06,
      length: 2.4,
      at: place(side * (halfWidth + 0.03), 1.2, halfDepth + 0.05),
      segments: 10,
    });
  });
  const awningRise = 0.42;
  const awningReach = shyDepth + 0.5;
  builder.painted(
    new BoxGeometry(
      shyWidth + 0.2,
      0.05,
      Math.hypot(awningReach, awningRise),
      8,
      1,
      1,
    ),
    (centre) => stripes(centre.x, centre.z),
    {
      at: place(
        0,
        2.32 + awningRise / 2 - awningRise,
        -halfDepth + awningReach / 2,
      ),
      rotation: [Math.atan2(awningRise, awningReach), shyTurn, 0],
    },
    "matte",
  );
  builder.painted(
    new BoxGeometry(shyWidth + 0.22, 0.22, 0.03, 16, 1, 1),
    (centre) =>
      Math.floor((localX(centre.x, centre.z) + shyWidth) / 0.2) % 2 === 0
        ? crimson
        : gold,
    { at: place(0, 1.81, -halfDepth + awningReach + 0.01), rotation },
    "matte",
  );
  builder.box(
    "paint",
    bottle,
    [2.3, 0.42, 0.07],
    place(0, 2.62, halfDepth - 0.05),
    rotation,
  );
  builder.box(
    "paint",
    gold,
    [2.1, 0.06, 0.02],
    place(0, 2.7, halfDepth - 0.01),
    rotation,
  );
  builder.box(
    "paint",
    cream,
    [1.6, 0.05, 0.02],
    place(0, 2.57, halfDepth - 0.01),
    rotation,
  );
  builder.box(
    "paint",
    bottle,
    [shyWidth, 0.85, 0.1],
    place(0, 0.54, halfDepth - 0.05),
    rotation,
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [shyWidth + 0.1, 0.06, 0.34],
    place(0, 0.99, halfDepth - 0.1),
    rotation,
  );
  if (builder.isFar) {
    return;
  }
  [-1.2, -0.4, 0.4, 1.2].forEach((x) => {
    builder.box(
      "paint",
      gold,
      [0.5, 0.5, 0.02],
      place(x, 0.56, halfDepth + 0.005),
      rotation,
    );
    builder.box(
      "paint",
      bottle,
      [0.42, 0.42, 0.02],
      place(x, 0.56, halfDepth + 0.012),
      rotation,
    );
  });
  builder.box(
    "matte",
    "#c9b48a",
    [shyWidth - 0.1, 0.9, 0.04],
    place(0, 0.57, -halfDepth + 0.06),
    rotation,
  );
  const posts = [-1.1, -0.55, 0, 0.55, 1.1];
  posts.forEach((x, index) => {
    const [px, , pz] = place(x, 0, -0.25);
    builder.cylinder("paint", cream, {
      radius: 0.025,
      length: 1.15,
      at: [px, 0.12 + 0.575, pz],
      segments: 6,
    });
    builder.lathe(
      "metal",
      palette.steel,
      [
        [0.02, 0],
        [0.09, 0.06],
        [0.08, 0.07],
      ],
      [px, 1.27, pz],
      "y",
      8,
    );
    if (index !== 3) {
      builder.sphere("matte", coconut, 0.11, [px, 1.42, pz], [1, 1.08, 1], 7);
    }
  });
  const fallen = place(0.65, 0.22, 0.25);
  builder.sphere("matte", coconut, 0.11, fallen, [1, 0.95, 1], 7);
  const bucket = place(-1.15, 1.02, halfDepth - 0.1);
  builder.cylinder("paint", teal, {
    radius: 0.13,
    radiusEnd: 0.16,
    length: 0.22,
    at: [bucket[0], bucket[1] + 0.11, bucket[2]],
    segments: 10,
  });
  [
    { dx: 0, dz: 0, colour: palette.postRed },
    { dx: 0.06, dz: 0.05, colour: "#f2b51d" },
    { dx: -0.05, dz: 0.04, colour: palette.white },
  ].forEach(({ dx, dz, colour }) => {
    builder.sphere(
      "paint",
      colour,
      0.055,
      [bucket[0] + dx, bucket[1] + 0.24, bucket[2] + dz],
      [1, 1, 1],
      6,
    );
  });
  const ball = place(1.2, 1.07, halfDepth - 0.12);
  builder.sphere("paint", palette.postRed, 0.055, ball, [1, 1, 1], 6);
  [
    { x: -1.2, colour: "#c98a4b" },
    { x: 1.25, colour: "#e0a6c0" },
  ].forEach(({ x, colour }) => {
    const [tx, , tz] = place(x, 0, halfDepth + 0.2);
    builder.sphere("matte", colour, 0.11, [tx, 1.55, tz], [1, 1.1, 0.85], 6);
    builder.sphere("matte", colour, 0.08, [tx, 1.75, tz], [1, 1, 1], 6);
    builder.bar(
      "matte",
      palette.black,
      [tx, 1.83, tz],
      [tx, 2.12, tz],
      0.01,
      3,
    );
  });
  for (let bulb = 0; bulb < 9; bulb++) {
    const x = -halfWidth - 0.05 + (bulb / 8) * (shyWidth + 0.1);
    addBulb(
      builder,
      place(x, 1.68, -halfDepth + awningReach + 0.02),
      bulbColours[bulb % bulbColours.length],
    );
  }
};

const shyBlockers: LocalBlocker[] = [-1.1, 0, 1.1].map((x) => ({
  ...turnPoint(shyAt, shyTurn, x, 0),
  radius: 1.05,
}));

/* The ticket booth */

const boothAt = { x: 3.0, z: 6.5 };

const buildTicketBooth = (builder: AttractionBuilder) => {
  const { x, z } = boothAt;
  const sides = 8;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.82,
    length: 0.12,
    at: [x, 0.06, z],
    segments: sides,
  });
  builder.painted(
    new CylinderGeometry(0.7, 0.72, 1.0, sides, 1, false),
    (centre, normal) =>
      normal.y > 0.5
        ? cream
        : sliceOf(centre.x - x, centre.z - z, sides) % 2 === 0
          ? crimson
          : navy,
    { at: [x, 0.62, z], rotation: [0, Math.PI / sides, 0] },
    "paint",
  );
  builder.painted(
    new CylinderGeometry(0.68, 0.68, 0.7, sides, 1, true),
    (centre) =>
      centre.z - z > 0.3 ? { colour: palette.glass, finish: "glass" } : cream,
    { at: [x, 1.47, z], rotation: [0, Math.PI / sides, 0] },
    "paint",
  );
  builder.cylinder("paint", gold, {
    radius: 0.76,
    length: 0.1,
    at: [x, 1.15, z],
    segments: sides,
  });
  builder.cylinder("paint", crimson, {
    radius: 0.78,
    length: 0.14,
    at: [x, 1.86, z],
    segments: sides,
  });
  builder.painted(
    new LatheGeometry(
      [
        new Vector2(0.86, 0),
        new Vector2(0.72, 0.28),
        new Vector2(0.38, 0.52),
        new Vector2(0.04, 0.64),
      ],
      builder.segments(16),
    ),
    (centre) =>
      sliceOf(centre.x - x, centre.z - z, 16) % 2 === 0 ? crimson : cream,
    { at: [x, 1.93, z] },
    "paint",
  );
  builder.sphere("paint", gold, 0.08, [x, 2.62, z], [1, 1, 1], 10);
  builder.box("paint", cream, [0.72, 0.2, 0.04], [x, 2.08, z + 0.79]);
  if (builder.isFar) {
    return;
  }
  builder.box("paint", crimson, [0.56, 0.06, 0.02], [x, 2.09, z + 0.815]);
  builder.box(
    "matte",
    palette.paleTimber,
    [0.55, 0.04, 0.2],
    [x, 1.16, z + 0.74],
  );
  for (let bulb = 0; bulb < 12; bulb++) {
    const angle = (bulb / 12) * fullTurn;
    addBulb(
      builder,
      [x + Math.cos(angle) * 0.86, 1.86, z + Math.sin(angle) * 0.86],
      bulbColours[bulb % 3],
    );
  }
};

/* The entrance arch, the high striker and the lights */

const archZ = 8.0;
const archHalf = 1.6;
const archHeight = 2.7;

const buildArch = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", crimson, {
      radius: 0.12,
      length: archHeight,
      at: [side * archHalf, archHeight / 2, archZ],
      segments: 12,
    });
    [0.12, archHeight - 0.1].forEach((height) => {
      builder.cylinder("paint", gold, {
        radius: 0.16,
        length: 0.14,
        at: [side * archHalf, height, archZ],
        segments: 12,
      });
    });
    builder.sphere(
      "paint",
      gold,
      0.15,
      [side * archHalf, archHeight + 0.12, archZ],
      [1, 1, 1],
      8,
    );
  });
  builder.add(
    "paint",
    gold,
    new TorusGeometry(archHalf, 0.07, 4, builder.segments(22, 10), Math.PI),
    { at: [0, archHeight, archZ], scale: [1, 0.45, 1] },
  );
  builder.box(
    "paint",
    crimson,
    [2.4, 0.42, 0.08],
    [0, archHeight + 0.1, archZ],
  );
  builder.box(
    "paint",
    cream,
    [2.0, 0.07, 0.02],
    [0, archHeight + 0.15, archZ + 0.05],
  );
  builder.box(
    "paint",
    cream,
    [1.5, 0.05, 0.02],
    [0, archHeight + 0.02, archZ + 0.05],
  );
  if (builder.isFar) {
    return;
  }
  for (let bulb = 0; bulb <= 12; bulb++) {
    const angle = (bulb / 12) * Math.PI;
    addBulb(
      builder,
      [
        Math.cos(angle) * archHalf,
        archHeight + Math.sin(angle) * archHalf * 0.45,
        archZ + 0.08,
      ],
      bulbColours[bulb % bulbColours.length],
      0.055,
    );
  }
};

const strikerAt = { x: 7.0, z: 4.6 };

const buildHighStriker = (builder: AttractionBuilder) => {
  const { x, z } = strikerAt;
  const turn = -0.9;
  builder.box(
    "matte",
    palette.darkTimber,
    [0.8, 0.16, 0.6],
    [x, 0.08, z],
    [0, turn, 0],
  );
  builder.painted(
    new BoxGeometry(0.26, 3.2, 0.1, 1, 8, 1),
    (centre) => (Math.floor(centre.y / 0.4) % 2 === 0 ? crimson : cream),
    { at: [x, 1.76, z], rotation: [0, turn, 0] },
    "paint",
  );
  builder.lathe(
    "metal",
    gold,
    [
      [0.001, 0.2],
      [0.12, 0.17],
      [0.17, 0],
    ],
    [x, 3.38, z],
    "y",
    12,
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", palette.steel, {
    radius: 0.015,
    length: 3.1,
    at: [x + Math.sin(turn) * 0.08, 1.75, z + Math.cos(turn) * 0.08],
    segments: 4,
  });
  builder.box(
    "paint",
    palette.postRed,
    [0.1, 0.1, 0.06],
    [x + Math.sin(turn) * 0.1, 0.6, z + Math.cos(turn) * 0.1],
    [0, turn, 0],
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.3, 0.06, 0.18],
    [x + Math.sin(turn) * 0.22, 0.2, z + Math.cos(turn) * 0.22],
    [0, turn, 0],
  );
  builder.bar(
    "matte",
    palette.paleTimber,
    [x + 0.6, 0.02, z + 0.25],
    [x + 0.45, 0.8, z + 0.3],
    0.05,
    5,
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.18, 0.12, 0.12],
    [x + 0.44, 0.84, z + 0.3],
  );
};

const stringPoles: LocalPoint[] = [
  { x: -1.4, z: 4.9 },
  { x: 1.5, z: 4.9 },
  { x: -1.6, z: -1.8 },
  { x: 1.7, z: -1.8 },
];
const poleHeight = 3.3;

const buildLights = (builder: AttractionBuilder) => {
  stringPoles.forEach(({ x, z }) => {
    builder.cylinder("paint", navy, {
      radius: 0.055,
      length: poleHeight,
      at: [x, poleHeight / 2, z],
      segments: 8,
    });
    builder.sphere(
      "paint",
      gold,
      0.08,
      [x, poleHeight + 0.05, z],
      [1, 1, 1],
      8,
    );
  });
  const top = (index: number): Triple => [
    stringPoles[index].x,
    poleHeight,
    stringPoles[index].z,
  ];
  addBulbString(builder, [-archHalf, archHeight, archZ], top(0));
  addBulbString(builder, [archHalf, archHeight, archZ], top(1));
  addBulbString(builder, top(0), top(1), 0.3);
  addBulbString(builder, top(0), top(2), 0.6);
  addBulbString(builder, top(1), top(3), 0.6);
  addBulbString(builder, top(2), top(3), 0.35);
  addBulbString(builder, top(2), findLegPoint(3.0, -1, 1), 0.3);
  addBulbString(builder, top(3), findLegPoint(3.0, 1, 1), 0.3);
};

const buildGround = (builder: AttractionBuilder) => {
  builder.cylinder("matte", sawdust, {
    radius: 7.2,
    length: 0.03,
    at: [0, 0.015, 0.3],
    segments: builder.segments(44, 22),
  });
  builder.box("matte", sawdust, [2.8, 0.03, 3.4], [0, 0.015, 8.4]);
  if (!builder.isFar) {
    builder.cylinder("matte", shade(sawdust, 0.92), {
      radius: 3.2,
      length: 0.035,
      at: [0, 0.018, 1.6],
      segments: 30,
    });
  }
};

export const funfairModel: AttractionModel = {
  kind: "funfair",
  name: "Funfair",
  fact: "In Victorian times, travelling fairs went from town to town, and the gallopers were turned by a steam engine in the middle. The first big wheel was built by George Ferris in Chicago in 1893, so big wheels are still called Ferris wheels.",
  curriculumLink:
    "History, Key Stage 1: changes beyond living memory. How Victorian fairs and rides compare with today's.",
  footprint: 10,
  setting: "inland",
  signSpot: { x: -3, z: 9.4 },
  build: (builder) => {
    buildGround(builder);
    buildWheelFrame(builder);
    buildCarouselBase(builder);
    buildCoconutShy(builder);
    buildTicketBooth(builder);
    buildArch(builder);
    buildHighStriker(builder);
    buildLights(builder);
    addBench(builder, [-4.6, 0, 5.9], Math.PI + 0.2);
    addBench(builder, [6.6, 0, -1.9], -1.9);
    addTree(builder, [-7.4, 0, -4.6], 1.2);
    addBush(builder, [7.3, 0, -4.4], 0.6, "#3a7d34");
    addBush(builder, [-6.8, 0, 5.6], 0.5);
    addSignBoard(builder, [-3, 0, 8.5], crimson);
  },
  moving: [
    {
      name: "big-wheel",
      pivot: wheelPivot,
      build: buildWheel,
      motion: wheelMotion,
    },
    {
      name: "big-wheel-gondolas",
      pivot: wheelPivot,
      build: buildGondola,
      motion: gondolaMotion,
    },
    {
      name: "gallopers",
      pivot: carouselPivot,
      build: buildCarousel,
      motion: carouselMotion,
    },
    {
      name: "galloper-horses",
      pivot: carouselPivot,
      build: buildHorse,
      motion: horseMotion,
    },
  ],
  blockers: [
    ...[-1, 1].flatMap((side) =>
      [-1, 1].map((leg) => {
        const [x, , z] = findLegPoint(0, leg, side);
        return { x, z, radius: 0.4 };
      }),
    ),
    { x: wheelAt.x, z: wheelAt.z, radius: 1.3 },
    { x: wheelAt.x - 1.0, z: wheelAt.z, radius: 0.9 },
    { x: wheelAt.x + 1.0, z: wheelAt.z, radius: 0.9 },
    { x: carouselAt.x, z: carouselAt.z, radius: canopyRadius - 0.1 },
    ...shyBlockers,
    { x: boothAt.x, z: boothAt.z, radius: 0.9 },
    { x: -archHalf, z: archZ, radius: 0.22 },
    { x: archHalf, z: archZ, radius: 0.22 },
    { x: strikerAt.x, z: strikerAt.z, radius: 0.5 },
    ...stringPoles.map(({ x, z }) => ({ x, z, radius: 0.15 })),
    { x: -7.4, z: -4.6, radius: 0.4 },
    { x: 7.3, z: -4.4, radius: 0.6 },
  ],
  rides: [
    {
      id: "carousel",
      name: "the carousel",
      start: carouselStart,
      reach: 0.5,
      seconds: 14,
      finish: carouselFinish,
      follow: carouselRide,
    },
  ],
  tune: [67, 72, 76, 79, 76, 72, 74, 77],
};
