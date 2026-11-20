import { ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape } from "three";
import {
  addBench,
  addDoor,
  addFence,
  addGableRoof,
  addLampPost,
  addSignBoard,
  addTree,
  addWindow,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import { addFlowerClump, meadowColours } from "./village-fete-parts.js";

/*
 * A canal climbing a little hill with a lock: a raised upper level
 * with the lock-keeper's cottage, a towpath ramp with brick ridges for
 * the horses' hooves, the lock chamber with its black-and-white gates
 * and balance beams, a painted narrowboat that floats up as the lock
 * fills, and a red-brick humpback bridge over the lower canal.
 */

const brick = "#a9523a";
const coping = "#cfc6b4";
const gateBlack = "#1f2124";
const gateWhite = "#f2efe6";
const boatGreen = "#1f5a3c";
const boatRed = "#b0302a";
const boatCream = "#f1e2b8";
const boatYellow = "#e8b83a";
const towpath = "#b9a888";
const canalWater = "#4f8f8a";
const signColour = "#1f5a3c";

/* Levels */

/** The upper level: everything west of the lock stands on it. */
const upperEdge = -2.6;
const upperHeight = 0.8;
const upperRadius = 9.4;
const upperWater = 0.7;
const lowerWater = 0.1;

const canal = { north: -3.4, south: -1.4 };
const canalMiddle = (canal.north + canal.south) / 2;
const chamber = { from: upperEdge, to: 2.6, north: -3.0, south: -1.8 };
const chamberWallTop = 0.98;
const riseHeight = upperWater - lowerWater + 0.02;

/* The towpath ramp up beside the lock */

const ramp = { from: 0.5, to: upperEdge, south: 0.6, north: -0.9 };
const rampSteps = 8;
const rampStepLength = (ramp.from - ramp.to) / rampSteps;

const findRampHeight = (x: number): number => {
  const step = Math.min(
    rampSteps - 1,
    Math.max(0, Math.floor((ramp.from - x) / rampStepLength)),
  );
  return (upperHeight * (step + 1)) / rampSteps;
};

/* The humpback bridge over the lower canal */

const bridge = { x: 5.6, halfWidth: 0.85, from: 0.9, to: -5.7 };
const bridgeRise = 0.62;

const findBridgeHeight = (z: number): number => {
  const share = (z - bridge.from) / (bridge.to - bridge.from);
  return bridgeRise * Math.sin(Math.max(0, Math.min(1, share)) * Math.PI);
};

const upperDeck: Deck = ({ x, z }) => {
  if (x > upperEdge || Math.hypot(x, z) > upperRadius) {
    return undefined;
  }
  return {
    height: z > canal.north && z < canal.south ? upperWater : upperHeight,
    kind: "ground",
  };
};

const rampDeck: Deck = ({ x, z }) =>
  x <= ramp.from && x > ramp.to && z <= ramp.south && z >= ramp.north
    ? { height: findRampHeight(x), kind: "trail" }
    : undefined;

const bridgeDeck: Deck = ({ x, z }) =>
  Math.abs(x - bridge.x) <= bridge.halfWidth - 0.12 &&
  z <= bridge.from &&
  z >= bridge.to
    ? { height: findBridgeHeight(z), kind: "bridge" }
    : undefined;

/* Shapes */

/** The part of the upper level between two z lines, as a flat shape. */
const listUpperOutline = (minZ: number, maxZ: number): Shape => {
  const reach = Math.sqrt(upperRadius ** 2 - upperEdge ** 2);
  const from = Math.max(minZ, -reach);
  const to = Math.min(maxZ, reach);
  const shape = new Shape();
  /* Drawn in (x, -z), so it lies flat once turned */
  shape.moveTo(upperEdge, -from);
  shape.lineTo(upperEdge, -to);
  const steps = 10;
  for (let step = 0; step <= steps; step++) {
    const z = to + ((from - to) * step) / steps;
    shape.lineTo(-Math.sqrt(upperRadius ** 2 - z ** 2), -z);
  }
  shape.closePath();
  return shape;
};

const addUpperSlab = (
  builder: AttractionBuilder,
  minZ: number,
  maxZ: number,
  height: number,
  colour: string,
) => {
  builder.add(
    "matte",
    colour,
    new ExtrudeGeometry(listUpperOutline(minZ, maxZ), {
      depth: height,
      bevelEnabled: false,
      curveSegments: 1,
    }).rotateX(-Math.PI / 2),
    {},
    undefined,
  );
};

const buildUpperLevel = (builder: AttractionBuilder) => {
  /* Brick retaining walls, topped with grass either side of the canal */
  addUpperSlab(builder, -upperRadius, canal.north, upperHeight - 0.06, brick);
  addUpperSlab(builder, canal.south, upperRadius, upperHeight - 0.06, brick);
  addUpperSlab(builder, canal.north, canal.south, upperWater - 0.12, brick);
  builder.add(
    "matte",
    meadowColours.meadow,
    new ExtrudeGeometry(listUpperOutline(-upperRadius, canal.north), {
      depth: 0.06,
      bevelEnabled: false,
    })
      .rotateX(-Math.PI / 2)
      .translate(0, upperHeight - 0.06, 0),
    {},
    undefined,
  );
  builder.add(
    "matte",
    meadowColours.meadow,
    new ExtrudeGeometry(listUpperOutline(canal.south, upperRadius), {
      depth: 0.06,
      bevelEnabled: false,
    })
      .rotateX(-Math.PI / 2)
      .translate(0, upperHeight - 0.06, 0),
    {},
    undefined,
  );
  /* The upper canal */
  const upperLength =
    Math.sqrt(upperRadius ** 2 - canalMiddle ** 2) + upperEdge;
  builder.box(
    "water",
    canalWater,
    [upperLength, 0.1, canal.south - canal.north],
    [upperEdge - upperLength / 2, upperWater - 0.05, canalMiddle],
  );
  /* Stone copings along the retaining wall's edge and the canal */
  builder.box(
    "matte",
    coping,
    [0.24, 0.08, 2 * Math.sqrt(upperRadius ** 2 - upperEdge ** 2)],
    [upperEdge + 0.1, upperHeight + 0.01, 0],
  );
  [canal.north - 0.12, canal.south + 0.12].forEach((z) => {
    builder.box(
      "matte",
      coping,
      [upperLength, 0.1, 0.24],
      [upperEdge - upperLength / 2, upperHeight + 0.02, z],
    );
  });
  /* The towpath along the upper canal */
  builder.box(
    "matte",
    towpath,
    [upperLength - 0.6, 0.02, 1.2],
    [upperEdge - upperLength / 2 - 0.3, upperHeight + 0.01, canal.south + 0.85],
  );
  if (builder.isFar) {
    return;
  }
  /* Brick courses along the long retaining wall */
  [0.25, 0.5].forEach((height) => {
    builder.box(
      "matte",
      shade(brick, 0.82),
      [0.02, 0.03, 2 * Math.sqrt(upperRadius ** 2 - upperEdge ** 2) - 0.2],
      [upperEdge + 0.005, height, 0],
    );
  });
};

const buildRamp = (builder: AttractionBuilder) => {
  const width = ramp.south - ramp.north;
  for (let step = 0; step < rampSteps; step++) {
    const height = (upperHeight * (step + 1)) / rampSteps;
    const x = ramp.from - rampStepLength * (step + 0.5);
    builder.box(
      "matte",
      towpath,
      [rampStepLength + 0.01, height, width],
      [x, height / 2, (ramp.south + ramp.north) / 2],
    );
    builder.box(
      "matte",
      brick,
      [rampStepLength + 0.01, height, 0.03],
      [x, height / 2, ramp.south + 0.01],
    );
    if (!builder.isFar) {
      /* A brick ridge across each step for the horses' hooves */
      builder.box(
        "matte",
        brick,
        [0.08, 0.02, width - 0.1],
        [
          x - rampStepLength / 2 + 0.05,
          height + 0.01,
          (ramp.south + ramp.north) / 2,
        ],
      );
    }
  }
  /* A white handrail along the open side */
  builder.bar(
    "paint",
    gateWhite,
    [ramp.from, 0.95, ramp.south + 0.1],
    [ramp.to, upperHeight + 0.95, ramp.south + 0.1],
    0.06,
    6,
  );
  [0, 0.5, 1].forEach((share) => {
    const x = ramp.from + (ramp.to - ramp.from) * share;
    const base = share === 0 ? 0 : findRampHeight(x + 0.01);
    builder.cylinder("paint", gateWhite, {
      radius: 0.04,
      length: 0.95 + upperHeight * share - base,
      at: [x, (0.95 + upperHeight * share + base) / 2, ramp.south + 0.1],
      segments: 6,
    });
  });
};

/* The lock */

const buildLock = (builder: AttractionBuilder) => {
  const length = chamber.to - chamber.from;
  const middleX = (chamber.from + chamber.to) / 2;
  /* The chamber's brick walls, with stone copings */
  [
    [canal.north, chamber.north],
    [chamber.south, canal.south],
  ].forEach(([from, to]) => {
    builder.box(
      "matte",
      brick,
      [length, chamberWallTop, to - from],
      [middleX, chamberWallTop / 2, (from + to) / 2],
    );
    builder.box(
      "matte",
      coping,
      [length + 0.1, 0.08, to - from + 0.1],
      [middleX, chamberWallTop + 0.04, (from + to) / 2],
    );
    if (!builder.isFar) {
      [0.3, 0.6].forEach((height) => {
        builder.box(
          "matte",
          shade(brick, 0.82),
          [length - 0.1, 0.03, to - from + 0.02],
          [middleX, height, (from + to) / 2],
        );
      });
    }
  });
  /* The chamber floor, and its wet, dark inside walls */
  builder.box(
    "matte",
    "#3e4a44",
    [length, 0.06, chamber.south - chamber.north],
    [middleX, 0.03, canalMiddle],
  );
  /* The top gate holds back the upper canal */
  builder.box(
    "paint",
    gateBlack,
    [0.16, upperWater + 0.3, chamber.south - chamber.north],
    [chamber.from + 0.1, (upperWater + 0.3) / 2, canalMiddle],
  );
  builder.box(
    "paint",
    gateWhite,
    [0.18, 0.08, chamber.south - chamber.north],
    [chamber.from + 0.1, upperWater + 0.3, canalMiddle],
  );
  /* The bottom gates: a mitred pair, the south one moving */
  buildGateLeaf(builder, [chamber.to, 0, chamber.north], 1);
  if (!builder.isFar) {
    /* Paddle gear: a rack and pinion on a post by each gate */
    [
      [chamber.from - 0.35, canal.south + 0.25, upperHeight],
      [chamber.to + 0.35, canal.north - 0.25, 0],
    ].forEach(([x, z, base]) => {
      builder.box("paint", gateBlack, [0.2, 0.55, 0.2], [x, base + 0.28, z]);
      builder.box(
        "metal",
        palette.darkSteel,
        [0.08, 0.35, 0.08],
        [x, base + 0.72, z],
      );
      builder.cylinder("paint", gateWhite, {
        radius: 0.08,
        length: 0.24,
        at: [x, base + 0.62, z],
        axis: "z",
        segments: 10,
      });
    });
  }
};

const gateHeight = 1.0;
const gateLeafWidth = 0.66;
const beamLength = 2.4;

/**
 * One bottom-gate leaf with its balance beam, hinged at its heel post.
 * `side` 1 is the north leaf, -1 the south.
 */
const buildGateLeaf = (
  builder: AttractionBuilder,
  heel: Triple,
  side: 1 | -1,
) => {
  const [x, , z] = heel;
  /* The leaf reaches into the canal, pointing a little upstream */
  const leafTo: Triple = [x - 0.12, 0, z + side * gateLeafWidth];
  const middle: Triple = [(x + leafTo[0]) / 2, 0, (z + leafTo[2]) / 2];
  const leafTurn = Math.atan2(leafTo[0] - x, leafTo[2] - z);
  builder.box(
    "paint",
    gateBlack,
    [0.14, gateHeight - 0.05, gateLeafWidth],
    [middle[0], (gateHeight + 0.05) / 2, middle[2]],
    [0, leafTurn, 0],
  );
  builder.box(
    "paint",
    gateWhite,
    [0.16, 0.08, gateLeafWidth + 0.04],
    [middle[0], gateHeight, middle[2]],
    [0, leafTurn, 0],
  );
  /* The balance beam over the bank, white-tipped */
  const beamTo: Triple = [x + 0.6, gateHeight - 0.05, z - side * beamLength];
  builder.bar(
    "matte",
    palette.darkTimber,
    [x, gateHeight - 0.05, z],
    beamTo,
    0.16,
    6,
  );
  const tipShare = 0.82;
  builder.bar(
    "paint",
    gateWhite,
    [x + 0.6 * tipShare, gateHeight - 0.05, z - side * beamLength * tipShare],
    [beamTo[0] + 0.03, beamTo[1], beamTo[2] - side * 0.06],
    0.17,
    6,
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      gateBlack,
      [0.06, 0.4, 0.1],
      [middle[0], gateHeight + 0.24, middle[2]],
    );
    builder.cylinder("paint", gateWhite, {
      radius: 0.06,
      length: 0.18,
      at: [middle[0], gateHeight + 0.4, middle[2]],
      axis: "z",
      segments: 8,
    });
  }
};

/** The south bottom gate swings, its beam over the towpath. */
const southGatePivot: Triple = [chamber.to, 0, chamber.south];
const southGateMotion: Motion = {
  kind: "swing",
  axis: "y",
  amplitude: 0.45,
  period: 9,
};

const buildSouthGate = (builder: AttractionBuilder) => {
  buildGateLeaf(builder, [0, 0, 0], -1);
  builder.cylinder("paint", gateBlack, {
    radius: 0.09,
    length: gateHeight + 0.1,
    at: [0, (gateHeight + 0.1) / 2, 0],
    segments: 8,
  });
};

/* The water in the chamber, and the narrowboat on it */

const chamberWaterAt: Triple = [
  (chamber.from + chamber.to) / 2,
  lowerWater,
  canalMiddle,
];
const boatLength = 4.2;
const boatWidth = 0.86;
const boatDeck = 0.28;
const cabinTop = 0.78;

/** The hull seen from above, its pointed bow towards -x. */
const listHullOutline = (): Shape => {
  const half = boatLength / 2;
  const side = boatWidth / 2;
  const shape = new Shape();
  /* Drawn in (x, -z), so it lies flat once turned */
  shape.moveTo(half, -side);
  shape.lineTo(half, side);
  shape.lineTo(-half + 1.0, side);
  shape.lineTo(-half + 0.45, side * 0.62);
  shape.lineTo(-half, 0);
  shape.lineTo(-half + 0.45, -side * 0.62);
  shape.lineTo(-half + 1.0, -side);
  shape.closePath();
  return shape;
};

const addHullBand = (
  builder: AttractionBuilder,
  bottom: number,
  top: number,
  colour: string,
  grow = 1,
) => {
  builder.add(
    "paint",
    colour,
    new ExtrudeGeometry(listHullOutline(), {
      depth: top - bottom,
      bevelEnabled: false,
    })
      .rotateX(-Math.PI / 2)
      .scale(grow, 1, grow)
      .translate(0, bottom, 0),
    {},
    undefined,
  );
};

const buildBoat = (builder: AttractionBuilder) => {
  const length = chamber.to - chamber.from - 0.32;
  builder.box(
    "water",
    canalWater,
    [length, 0.08, chamber.south - chamber.north - 0.02],
    [0, -0.04, 0],
  );
  /* The hull: black below the water line, green, a red gunwale */
  const half = boatLength / 2;
  addHullBand(builder, -0.14, 0.04, gateBlack);
  addHullBand(builder, 0.04, boatDeck - 0.06, boatGreen, 1.005);
  addHullBand(builder, boatDeck - 0.06, boatDeck, boatRed, 1.02);
  /* The cabin, cream-framed windows and a red roof */
  const cabinFrom = -half + 1.1;
  const cabinTo = half - 0.6;
  const cabinLength = cabinTo - cabinFrom;
  const cabinMiddle = (cabinFrom + cabinTo) / 2;
  const cabinSide = (boatWidth - 0.12) / 2;
  builder.box(
    "paint",
    boatGreen,
    [cabinLength, cabinTop - boatDeck, cabinSide * 2],
    [cabinMiddle, (cabinTop + boatDeck) / 2, 0],
  );
  builder.box(
    "paint",
    boatRed,
    [cabinLength + 0.06, 0.05, boatWidth - 0.04],
    [cabinMiddle, cabinTop + 0.02, 0],
  );
  /* Doors at each end of the cabin */
  [cabinFrom - 0.01, cabinTo + 0.01].forEach((x) => {
    builder.box("paint", boatRed, [0.02, 0.4, 0.4], [x, boatDeck + 0.22, 0]);
  });
  /* The stove chimney */
  builder.cylinder("paint", gateBlack, {
    radius: 0.05,
    length: 0.34,
    at: [cabinFrom + 0.25, cabinTop + 0.19, 0.15],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "metal",
    palette.brass,
    0.055,
    0.015,
    [cabinFrom + 0.25, cabinTop + 0.3, 0.15],
    "y",
    8,
  );
  [-1, 1].forEach((side) => {
    for (let window = 0; window < 4; window++) {
      const x = cabinFrom + 0.4 + window * 0.62;
      builder.box(
        "paint",
        boatCream,
        [0.34, 0.24, 0.02],
        [x, 0.55, side * cabinSide],
      );
      builder.box(
        "glass",
        palette.glass,
        [0.28, 0.18, 0.02],
        [x, 0.55, side * (cabinSide + 0.006)],
      );
    }
    /* A yellow coach line, and roses painted at the stern end */
    builder.box(
      "paint",
      boatYellow,
      [cabinLength - 0.1, 0.03, 0.02],
      [cabinMiddle, 0.38, side * (cabinSide + 0.006)],
    );
    builder.sphere(
      "paint",
      meadowColours.rose,
      0.06,
      [cabinTo - 0.18, 0.55, side * (cabinSide + 0.01)],
      [1, 1, 0.3],
      6,
    );
    builder.sphere(
      "paint",
      boatYellow,
      0.06,
      [cabinFrom + 0.15, 0.55, side * (cabinSide + 0.01)],
      [1, 1, 0.3],
      6,
    );
  });
  /* Potted plants on the roof */
  [cabinFrom + 0.8, cabinFrom + 1.6].forEach((x, index) => {
    builder.cylinder("paint", index === 0 ? boatRed : boatYellow, {
      radius: 0.08,
      radiusEnd: 0.1,
      length: 0.14,
      at: [x, cabinTop + 0.11, 0],
      segments: 8,
    });
    builder.sphere(
      "matte",
      meadowColours.leaf,
      0.1,
      [x, cabinTop + 0.24, 0],
      [1, 0.8, 1],
      6,
    );
    builder.sphere(
      "paint",
      meadowColours.poppy,
      0.04,
      [x + 0.03, cabinTop + 0.33, 0.03],
      [1, 1, 1],
      5,
    );
  });
  /* The tiller at the stern, a fender at the bow */
  builder.bar(
    "metal",
    palette.brass,
    [half - 0.05, boatDeck + 0.05, 0],
    [half + 0.3, boatDeck + 0.5, 0],
    0.05,
    6,
  );
  builder.bar(
    "paint",
    gateWhite,
    [half + 0.3, boatDeck + 0.5, 0],
    [half - 0.4, boatDeck + 0.5, 0],
    0.04,
    6,
  );
  builder.cylinder("matte", "#c9b07a", {
    radius: 0.08,
    length: 0.24,
    at: [-half - 0.04, 0.16, 0],
    segments: 8,
  });
};

/* The lock-keeper's cottage, up on the upper level */

const cottage = { x: -6.2, z: 2.6, width: 3.0, depth: 2.0, wall: 1.75 };

const buildCottage = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = cottage;
  const base = upperHeight;
  builder.box("matte", brick, [width, wall, depth], [x, base + wall / 2, z]);
  addGableRoof(builder, {
    width: width + 0.1,
    depth,
    rise: 0.9,
    at: [x, base + wall, z],
    colour: palette.slate,
    overhang: 0.2,
  });
  [-1, 1].forEach((side) => {
    builder.add(
      "matte",
      brick,
      new ConeGeometry(depth / 2 / Math.SQRT1_2, 0.9, 4)
        .rotateY(Math.PI / 4)
        .scale(0.2 / depth, 1, 1),
      { at: [x + side * (width / 2 - 0.1), base + wall + 0.45, z] },
    );
  });
  /* A tall chimney stack at one end */
  builder.box(
    "matte",
    shade(brick, 0.9),
    [0.45, 1.1, 0.4],
    [x - width / 2 + 0.3, base + wall + 0.8, z],
  );
  builder.cylinder("matte", "#b8643a", {
    radius: 0.09,
    length: 0.25,
    at: [x - width / 2 + 0.3, base + wall + 1.45, z],
    segments: 8,
  });
  addDoor(builder, {
    at: [x + 0.5, base, z + depth / 2],
    colour: boatGreen,
    frame: palette.cream,
    height: 1.15,
  });
  addWindow(builder, {
    at: [x - 0.7, base + 1.0, z + depth / 2 + 0.01],
    width: 0.6,
    height: 0.55,
    frame: palette.cream,
    isLit: true,
  });
  addWindow(builder, {
    at: [x + width / 2 + 0.01, base + 1.0, z],
    width: 0.6,
    height: 0.55,
    frame: palette.cream,
    turn: Math.PI / 2,
  });
  if (builder.isFar) {
    return;
  }
  /* A porch hood over the door and a bench by it */
  addGableRoof(builder, {
    width: 0.9,
    depth: 0.6,
    rise: 0.25,
    at: [x + 0.5, base + 1.35, z + depth / 2 + 0.3],
    colour: palette.slate,
    overhang: 0.05,
  });
  addBench(builder, [x - 0.7, base, z + depth / 2 + 0.55], 0, boatGreen);
  /* A picket fence round the front garden, gate open on the towpath side */
  addFence(
    builder,
    { x: x - 1.4, z: z + 2.2 },
    { x: x - 0.1, z: z + 2.2 },
    { colour: gateWhite },
  );
  addFence(
    builder,
    { x: x - 1.4, z: z + 2.2 },
    { x: x - 1.4, z: z + 1.0 },
    { colour: gateWhite },
  );
  [
    [x - 1.2, z + 1.9],
    [x - 0.4, z + 2.0],
  ].forEach(([fx, fz], index) => {
    addFlowerClump(
      builder,
      [fx, base, fz],
      index === 0
        ? [meadowColours.rose, meadowColours.butter]
        : [meadowColours.cornflower, palette.white],
      5,
      0.3,
    );
  });
};

/* The bridge */

const buildBridge = (builder: AttractionBuilder) => {
  const { x, halfWidth, from, to } = bridge;
  const steps = builder.segments(16, 8);
  const stations = Array.from({ length: steps + 1 }, (_, step) => {
    const z = from + ((to - from) * step) / steps;
    const top = findBridgeHeight(z);
    return {
      z,
      points: [
        [x - halfWidth, top + 0.5] as const,
        [x - halfWidth, -0.02] as const,
        [x + halfWidth, -0.02] as const,
        [x + halfWidth, top + 0.5] as const,
        [x + halfWidth - 0.16, top + 0.5] as const,
        [x + halfWidth - 0.16, top] as const,
        [x - halfWidth + 0.16, top] as const,
        [x - halfWidth + 0.16, top + 0.5] as const,
      ],
    };
  });
  builder.loft({
    stations,
    paint: (centre) =>
      centre.y > 0.02 &&
      Math.abs(centre.x - x) < halfWidth - 0.17 &&
      centre.y <= bridgeRise + 0.02
        ? { colour: towpath, finish: "matte" }
        : { colour: brick, finish: "matte" },
    capStart: false,
    capEnd: false,
  });
  /* Piers at each end of the parapets */
  [from, to].forEach((z) => {
    [x - halfWidth + 0.08, x + halfWidth - 0.08].forEach((px) => {
      builder.box("matte", brick, [0.2, 0.62, 0.22], [px, 0.29, z]);
    });
  });
  /* The arch over the water, dark underneath */
  [x - halfWidth - 0.01, x + halfWidth + 0.01].forEach((faceX) => {
    builder.add(
      "matte",
      "#2b2f2c",
      new CylinderGeometry(
        0.95,
        0.95,
        0.02,
        builder.segments(16, 8),
        1,
        false,
        -Math.PI / 2,
        Math.PI,
      )
        .rotateZ(Math.PI / 2)
        .rotateX(0),
      { at: [faceX, 0, canalMiddle], scale: [1, 0.62, 1] },
    );
  });
  if (!builder.isFar) {
    /* Stone copings along the parapets */
    const pieces = 8;
    for (let piece = 0; piece < pieces; piece++) {
      const z0 = from + ((to - from) * piece) / pieces;
      const z1 = from + ((to - from) * (piece + 1)) / pieces;
      [x - halfWidth + 0.08, x + halfWidth - 0.08].forEach((px) => {
        builder.bar(
          "matte",
          coping,
          [px, findBridgeHeight(z0) + 0.53, z0],
          [px, findBridgeHeight(z1) + 0.53, z1],
          0.2,
          4,
        );
      });
    }
  }
};

/* The lower canal and the towpath */

const buildLowerCanal = (builder: AttractionBuilder) => {
  const from = chamber.to;
  const to = Math.sqrt(upperRadius ** 2 - canalMiddle ** 2);
  const length = to - from;
  builder.box(
    "water",
    canalWater,
    [length, 0.06, canal.south - canal.north],
    [from + length / 2, lowerWater - 0.03, canalMiddle],
  );
  [canal.north - 0.1, canal.south + 0.1].forEach((z) => {
    builder.box(
      "matte",
      coping,
      [length, 0.16, 0.22],
      [from + length / 2, 0.08, z],
    );
  });
  /* The towpath, from the ramp along the lock and on under the bridge */
  builder.box(
    "matte",
    towpath,
    [to - ramp.from + 0.2, 0.025, 1.3],
    [(to + ramp.from) / 2, 0.012, canal.south + 0.85],
  );
  if (!builder.isFar) {
    /* Mooring bollards and rings along the towpath */
    [3.4, 7.4].forEach((bx) => {
      builder.cylinder("paint", gateBlack, {
        radius: 0.1,
        radiusEnd: 0.13,
        length: 0.3,
        at: [bx, 0.15, canal.south + 0.3],
        segments: 10,
      });
      builder.sphere(
        "paint",
        gateBlack,
        0.14,
        [bx, 0.32, canal.south + 0.3],
        [1, 0.5, 1],
        10,
      );
    });
    /* Reeds and yellow flag irises along the far bank */
    for (let reed = 0; reed < 9; reed++) {
      const rx = 3.0 + reed * 0.62;
      if (Math.abs(rx - bridge.x) < 1.0) {
        continue;
      }
      builder.add(
        "matte",
        reed % 2 === 0 ? "#5a8a3a" : "#6f9a42",
        new ConeGeometry(0.05, 0.7, 4),
        {
          at: [rx, 0.35, canal.north - 0.32 - (reed % 3) * 0.1],
        },
      );
      if (reed % 3 === 0) {
        builder.sphere(
          "matte",
          meadowColours.butter,
          0.06,
          [rx + 0.05, 0.6, canal.north - 0.35],
          [1, 0.7, 1],
          6,
        );
      }
    }
  }
};

/* Moving parts beyond the boat */

const windlassAt: Triple = [chamber.to + 0.35, 0.62, canal.north - 0.25 + 0.12];

const buildWindlass = (builder: AttractionBuilder) => {
  /* The L-shaped handle that winds the paddles up */
  builder.bar("metal", palette.steel, [0, 0, 0], [0, 0.32, 0], 0.04, 6);
  builder.bar("metal", palette.steel, [0, 0.32, 0], [0.18, 0.32, 0], 0.04, 6);
  builder.cylinder("paint", boatRed, {
    radius: 0.035,
    length: 0.14,
    at: [0.2, 0.32, 0.0],
    axis: "z",
    segments: 6,
  });
};

const heronAt: Triple = [7.6, 0, canal.north - 0.8];

const buildHeron = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#9aa3ad", 0.16, [0, 0.62, 0], [0.8, 0.9, 1.4], 10);
  builder.bar("matte", "#cfd4d8", [0, 0.68, 0.14], [0, 0.98, 0.2], 0.06, 5);
  builder.sphere("matte", palette.white, 0.06, [0, 1.0, 0.22], [1, 1, 1.2], 8);
  builder.add(
    "matte",
    boatYellow,
    new ConeGeometry(0.02, 0.2, 4).rotateX(Math.PI / 2),
    {
      at: [0, 0.99, 0.37],
    },
  );
  builder.box("matte", palette.black, [0.02, 0.02, 0.14], [0, 1.04, 0.16]);
  [-0.05, 0.05].forEach((side) => {
    builder.bar("matte", "#c9a24a", [side, 0.5, 0], [side, 0, 0.02], 0.025, 4);
  });
  builder.box(
    "matte",
    "#6b7480",
    [0.2, 0.06, 0.3],
    [0, 0.6, -0.25],
    [0.4, 0, 0],
  );
};

/* Wanderers */

const buildDuck = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#8a6a48", 0.1, [0, 0.06, 0], [0.9, 0.7, 1.4], 8);
  builder.sphere("matte", "#2e6b3a", 0.06, [0, 0.16, 0.11], [1, 1, 1.1], 8);
  builder.add(
    "matte",
    boatYellow,
    new ConeGeometry(0.022, 0.07, 4).rotateX(Math.PI / 2),
    {
      at: [0, 0.15, 0.19],
    },
  );
  if (!builder.isFar) {
    builder.box("matte", palette.white, [0.07, 0.015, 0.02], [0, 0.12, 0.1]);
  }
};

const buildHorse = (builder: AttractionBuilder) => {
  const coat = "#6b4a32";
  builder.sphere("matte", coat, 0.42, [0, 1.0, 0], [0.7, 0.72, 1.35], 12);
  builder.bar("matte", coat, [0, 1.15, 0.45], [0, 1.6, 0.75], 0.26, 8);
  builder.sphere("matte", coat, 0.16, [0, 1.62, 0.85], [0.8, 0.9, 1.6], 10);
  builder.box(
    "matte",
    palette.black,
    [0.06, 0.3, 0.5],
    [0, 1.5, 0.55],
    [0.6, 0, 0],
  );
  builder.bar("matte", palette.black, [0, 1.05, -0.55], [0, 0.6, -0.7], 0.1, 5);
  [-1, 1].forEach((side) => {
    [-0.35, 0.35].forEach((end) => {
      builder.bar(
        "matte",
        shade(coat, 0.85),
        [side * 0.16, 0.85, end],
        [side * 0.16, 0.08, end],
        0.11,
        6,
      );
      builder.cylinder("matte", palette.white, {
        radius: 0.08,
        length: 0.16,
        at: [side * 0.16, 0.08, end],
        segments: 8,
      });
    });
    builder.add("matte", coat, new ConeGeometry(0.05, 0.14, 4), {
      at: [side * 0.07, 1.82, 0.78],
    });
  });
  /* Painted harness with brasses */
  builder.box("paint", boatRed, [0.62, 0.1, 0.12], [0, 1.18, 0.4], [0.5, 0, 0]);
  if (!builder.isFar) {
    builder.sphere("metal", palette.brass, 0.05, [0, 1.2, 0.5], [1, 1, 0.4], 6);
  }
};

/* Rides */

const beamEndLocal: Triple = [0.6, 0, beamLength];
const beamDirection = {
  x: 0.6 / Math.hypot(0.6, beamLength),
  z: beamLength / Math.hypot(0.6, beamLength),
};
const pushSpotLocal: Triple = [
  beamEndLocal[0] + beamDirection.x * 0.4,
  0,
  beamEndLocal[2] + beamDirection.z * 0.4,
];
const gateStart = {
  x: southGatePivot[0] + beamEndLocal[0] + beamDirection.x * 1.0,
  z: southGatePivot[2] + beamEndLocal[2] + beamDirection.z * 1.0,
};
const gateFinish = { x: gateStart.x + 1.4, z: gateStart.z + 0.5 };

const gateRide = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(southGateMotion, seconds);
  const [x, , z] = moveWithPose([0, 0, 0], pushSpotLocal, pose);
  const spot = { x: southGatePivot[0] + x, z: southGatePivot[2] + z };
  const into = Math.min(1, progress * 8);
  const out = Math.min(1, (1 - progress) * 8);
  const share = Math.min(into, out);
  const outside = progress < 0.5 ? gateStart : gateFinish;
  return {
    x: outside.x + (spot.x - outside.x) * share,
    y: 0,
    z: outside.z + (spot.z - outside.z) * share,
    heading: pose.rotation[1] + Math.PI,
  };
};

const boatStart = { x: 1.8, z: canal.south + 1.0 };
const boatFinish = { x: upperEdge - 1.0, z: -0.3 };
const boatTop = lowerWater + riseHeight;

const boatRide = (progress: number): LocalSpot => {
  const half = boatLength / 2;
  if (progress < 0.15) {
    /* Hop over the lock side and down onto the stern */
    const share = progress / 0.15;
    return {
      x: boatStart.x + (half - 0.25 - boatStart.x) * share,
      y: boatTop + boatDeck + Math.sin(share * Math.PI) * 0.7,
      z: boatStart.z + (canalMiddle - boatStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.8) {
    /* Along the cabin roof from stern to bow */
    const share = (progress - 0.15) / 0.65;
    const along = half - 0.25 - share * (boatLength - 0.5);
    const onRoof = along < half - 0.6 && along > -half + 1.1;
    return {
      x: along,
      y: boatTop + (onRoof ? cabinTop + 0.04 : boatDeck),
      z: canalMiddle,
      heading: -Math.PI / 2,
    };
  }
  /* Jump off the bow onto the upper level */
  const share = (progress - 0.8) / 0.2;
  const fromX = -half + 0.25;
  return {
    x: fromX + (boatFinish.x - fromX) * share,
    y:
      boatTop +
      boatDeck +
      (upperHeight - boatTop - boatDeck) * share +
      Math.sin(share * Math.PI) * 0.6,
    z: canalMiddle + (boatFinish.z - canalMiddle) * share,
    heading: -Math.PI / 2 + share,
  };
};

/* Everything round about */

const buildSurroundings = (builder: AttractionBuilder) => {
  addTree(builder, [-5.6, upperHeight, -6.4], 1.15);
  addTree(builder, [-3.6, upperHeight, 6.0], 1.0, "#4a9440");
  addTree(builder, [7.2, 0, -5.2], 1.1);
  addLampPost(builder, [1.4, 0, 0.9], 2.3);
  addBench(builder, [0.2, 0, 2.8], Math.PI, boatGreen);
  if (!builder.isFar) {
    [
      [3.0, 4.8],
      [6.8, 3.2],
      [-7.0, -1.0],
    ].forEach(([x, z], index) => {
      addFlowerClump(
        builder,
        [x, x < upperEdge ? upperHeight : 0, z],
        index % 2 === 0
          ? [meadowColours.butter, palette.white]
          : [meadowColours.rose, meadowColours.sky],
        5,
        0.3,
      );
    });
    /* A white-painted mile post by the towpath */
    builder.box("paint", gateWhite, [0.18, 0.7, 0.12], [2.2, 0.35, 6.4]);
    builder.box("paint", gateBlack, [0.2, 0.08, 0.14], [2.2, 0.66, 6.4]);
  }
  addSignBoard(builder, [2.4, 0, 7.4], signColour);
};

export const canalLockModel: NewLandAttractionModel = {
  kind: "canal-lock",
  islandId: "meadow-isle",
  name: "Canal Lock",
  fact: "Canals are waterways dug by people about 250 years ago, so that horses could pull heavy loads like coal along them on narrowboats. A lock is like a water lift: when its gates are shut and water flows in, a boat floats up to the higher canal, and when the water flows out it floats back down.",
  curriculumLink:
    "Geography, Key Stage 1: human and physical geography. Use basic geographical vocabulary to refer to key human features, such as a canal, a lock and a bridge.",
  footprint: 10,
  setting: "inland",
  signSpot: { x: 2.4, z: 8.4 },
  build: (builder) => {
    buildUpperLevel(builder);
    buildRamp(builder);
    buildLock(builder);
    buildLowerCanal(builder);
    buildBridge(builder);
    buildCottage(builder);
    buildSurroundings(builder);
  },
  moving: [
    {
      name: "narrowboat",
      pivot: chamberWaterAt,
      build: buildBoat,
      motion: { kind: "rise", reach: 7, height: riseHeight, period: 3 },
    },
    {
      name: "south-gate",
      pivot: southGatePivot,
      build: buildSouthGate,
      motion: southGateMotion,
    },
    {
      name: "windlass",
      pivot: windlassAt,
      build: buildWindlass,
      motion: { kind: "whirl", axis: "z", idle: 0, speed: 5, reach: 4 },
    },
    {
      name: "heron",
      pivot: heronAt,
      build: buildHeron,
      motion: { kind: "nod", axis: "x", reach: 4, amplitude: 0.5, period: 1.6 },
    },
  ],
  wanderers: [
    {
      name: "ducks",
      build: buildDuck,
      count: 3,
      centre: { x: 7.9, z: canalMiddle },
      radius: 0.75,
      speed: 0.3,
      height: lowerWater,
    },
    {
      name: "towpath-horse",
      build: buildHorse,
      count: 1,
      centre: { x: 6.2, z: 3.6 },
      radius: 1.4,
      speed: 0.25,
    },
  ],
  smoke: [
    {
      at: [
        cottage.x - cottage.width / 2 + 0.3,
        upperHeight + cottage.wall + 1.65,
        cottage.z,
      ],
      colour: "#d8d4cc",
      puffs: 5,
      size: 0.24,
      rise: 2.4,
      spread: 0.35,
    },
  ],
  decks: [upperDeck, rampDeck, bridgeDeck],
  rides: [
    {
      id: "narrowboat",
      name: "the narrowboat",
      start: boatStart,
      reach: 0.55,
      seconds: 10,
      finish: boatFinish,
      follow: boatRide,
    },
    {
      id: "balance-beam",
      name: "the balance beam",
      start: gateStart,
      reach: 0.55,
      seconds: 9,
      finish: gateFinish,
      follow: gateRide,
    },
  ],
  play: {
    label: "Open the paddles",
    news: "Whoosh! The paddles opened, water rushed into the lock, and the narrowboat floated gently up to the higher canal.",
  },
};
