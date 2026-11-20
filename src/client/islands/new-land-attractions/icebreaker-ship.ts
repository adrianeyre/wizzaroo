import {
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  type Vector2,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type MovingPart,
  type Triple,
  type Wanderers,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef4f8";
const frostWhite = "#f8fbfd";
const seaIce = "#d9eef7";
const leadWater = "#1f4f73";
const hullRed = "#c42f26";
const bootBlack = "#24282d";
const superWhite = "#f2f2ee";
const deckGreen = "#4f6b58";
const funnelYellow = "#f0b62e";
const lifeboatOrange = "#f07c2a";
const heliRed = "#d8342c";
const signColour = "#c42f26";

/* The ship lies along x, bow to +x, frozen into a sheet of sea ice */
const shipZ = -1.0;
const half = 1.7;
const sternX = -6.0;
const deckY = 1.7;
const layers: { from: number; to: number; bowX: number; colour: string }[] = [
  { from: 0, to: 0.4, bowX: 5.2, colour: bootBlack },
  { from: 0.4, to: 0.8, bowX: 5.6, colour: hullRed },
  { from: 0.8, to: 1.25, bowX: 6.0, colour: hullRed },
  { from: 1.25, to: deckY, bowX: 6.4, colour: hullRed },
];
const topBowX = 6.4;
const superstructure = { minX: -2.6, maxX: 0.6, half: 1.25 };
const helideck = { x: -4.4 };
const gangway = { minX: 2.0, maxX: 3.2, fromZ: shipZ + half - 0.05, toZ: 3.8 };
const rideStart = { x: -4.4, z: 2.4 };
const rideFinish = { x: 5.2, z: 3.6 };
const signAt: Triple = [-1.6, 0, 6.2];

/* ------------------------------------------------------------------ */
/* The hull's outline, seen from above                                 */
/* ------------------------------------------------------------------ */

const hullShape = (bowX: number, inset = 0): Shape => {
  const width = half - inset;
  const shoulder = bowX - 2.6;
  const stern = sternX + inset;
  const shape = new Shape();
  shape.moveTo(stern, -width * 0.9);
  shape.lineTo(shoulder, -width);
  shape.quadraticCurveTo(bowX - 0.7 - inset, -width, bowX - inset, 0);
  shape.quadraticCurveTo(bowX - 0.7 - inset, width, shoulder, width);
  shape.lineTo(stern, width * 0.9);
  shape.quadraticCurveTo(stern - 0.45, 0, stern, -width * 0.9);
  return shape;
};

const topOutline: Vector2[] = hullShape(topBowX).getSpacedPoints(64);
const deckOutline: Vector2[] = hullShape(topBowX, 0.12).getSpacedPoints(48);

/** Whether a local point is inside an outline (shape y is -z from the ship's middle). */
const isInside = (
  outline: readonly Vector2[],
  { x, z }: LocalPoint,
): boolean => {
  const y = shipZ - z;
  let inside = false;
  for (
    let index = 0, last = outline.length - 1;
    index < outline.length;
    last = index++
  ) {
    const a = outline[index];
    const b = outline[last];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
};

/** Extrudes the hull outline upwards from `from` to `to`. */
const addHullLayer = (
  builder: AttractionBuilder,
  shape: Shape,
  from: number,
  to: number,
  colour: string,
  finish: AttractionFinish = "paint",
) => {
  builder.add(
    finish,
    colour,
    new ExtrudeGeometry(shape, {
      depth: to - from,
      bevelEnabled: false,
      curveSegments: builder.segments(10, 4),
    }).rotateX(-Math.PI / 2),
    { at: [0, from, shipZ] },
  );
};

/* ------------------------------------------------------------------ */
/* The hull                                                            */
/* ------------------------------------------------------------------ */

const isGangwayGap = (x: number, z: number) =>
  x > gangway.minX && x < gangway.maxX && z > shipZ;

const buildHull = (builder: AttractionBuilder) => {
  layers.forEach(({ from, to, bowX, colour }) => {
    addHullLayer(builder, hullShape(bowX), from, to, colour);
  });
  /* The deck, painted green, and a white stripe below the rail */
  addHullLayer(
    builder,
    hullShape(topBowX, 0.05),
    deckY,
    deckY + 0.04,
    deckGreen,
    "matte",
  );
  /* Bulwarks round the deck's edge, open for the gangway */
  const step = builder.isFar ? 4 : 1;
  for (let index = 0; index < topOutline.length - 1; index += step) {
    const a = topOutline[index];
    const b = topOutline[Math.min(topOutline.length - 1, index + step)];
    const x = (a.x + b.x) / 2;
    const z = shipZ - (a.y + b.y) / 2;
    if (isGangwayGap(x, z)) {
      continue;
    }
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const turn = Math.atan2(-(b.y - a.y), b.x - a.x);
    builder.box(
      "paint",
      superWhite,
      [length + 0.04, 0.5, 0.07],
      [x, deckY + 0.25, z],
      [0, -turn, 0],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        hullRed,
        [length + 0.05, 0.08, 0.09],
        [x, deckY + 0.52, z],
        [0, -turn, 0],
      );
    }
  }
  if (builder.isFar) {
    return;
  }
  /* A white band at the waterline-ice, and the ship's name board */
  addHullLayer(builder, hullShape(5.25, -0.02), 0.38, 0.46, superWhite);
  [1, -1].forEach((side) => {
    builder.box(
      "paint",
      superWhite,
      [1.6, 0.26, 0.02],
      [-3.6, 1.2, shipZ + side * (half * 0.95 + 0.02)],
    );
    [0, 1, 2, 3, 4].forEach((letter) => {
      builder.box(
        "paint",
        bootBlack,
        [0.16, 0.14, 0.02],
        [-4.2 + letter * 0.3, 1.2, shipZ + side * (half * 0.95 + 0.03)],
      );
    });
  });
  /* Anchors at the bow, and draught marks */
  [1, -1].forEach((side) => {
    const z = shipZ + side * 1.15;
    builder.box(
      "metal",
      palette.darkSteel,
      [0.4, 0.14, 0.06],
      [4.65, 1.35, z + side * 0.25],
      [0, side * 0.5, 0],
    );
    builder.box(
      "metal",
      palette.darkSteel,
      [0.06, 0.4, 0.06],
      [4.65, 1.15, z + side * 0.28],
    );
    for (let mark = 0; mark < 4; mark++) {
      builder.box(
        "paint",
        superWhite,
        [0.12, 0.04, 0.02],
        [
          5.0 + mark * 0.04,
          0.5 + mark * 0.25,
          shipZ + side * (0.95 - mark * 0.06),
        ],
      );
    }
  });
  /* Portholes along the hull */
  [1, -1].forEach((side) => {
    for (let hole = 0; hole < 8; hole++) {
      builder.cylinder("glass", palette.glass, {
        radius: 0.09,
        length: 0.04,
        at: [-2.4 + hole * 0.45, 1.05, shipZ + side * (half + 0.005)],
        axis: "z",
        segments: 8,
      });
    }
  });
};

/* ------------------------------------------------------------------ */
/* The superstructure, funnel and mast                                 */
/* ------------------------------------------------------------------ */

const tiers = [
  { from: deckY, height: 1.2, inset: 0 },
  { from: deckY + 1.2, height: 1.0, inset: 0.25 },
  { from: deckY + 2.2, height: 0.9, inset: 0.15 },
];
const bridgeTop = deckY + 3.1;

const buildSuperstructure = (builder: AttractionBuilder) => {
  const { minX, maxX } = superstructure;
  tiers.forEach(({ from, height, inset }, index) => {
    const tierMinX = index === 2 ? -0.6 : minX + inset * 2;
    const tierMaxX = maxX - inset;
    const width = tierMaxX - tierMinX;
    const tierHalf = superstructure.half - (index === 1 ? 0.15 : 0);
    builder.box(
      "paint",
      superWhite,
      [width, height, tierHalf * 2],
      [(tierMinX + tierMaxX) / 2, from + height / 2, shipZ],
    );
    builder.box(
      "paint",
      shade(superWhite, 0.85),
      [width + 0.1, 0.06, tierHalf * 2 + 0.1],
      [(tierMinX + tierMaxX) / 2, from + height, shipZ],
    );
    if (builder.isFar) {
      return;
    }
    /* Rows of windows round each tier: the bridge has big ones */
    const windows = Math.floor(width / 0.42);
    [1, -1].forEach((side) => {
      for (let window = 0; window < windows; window++) {
        builder.box(
          index === 2 ? "glass" : "glow",
          index === 2 ? "#3a5f7f" : "#cfe8f6",
          [0.26, index === 2 ? 0.42 : 0.24, 0.02],
          [
            tierMinX + 0.25 + window * 0.42,
            from + height * 0.58,
            shipZ + side * (tierHalf + 0.01),
          ],
        );
      }
    });
    const rows = Math.floor((tierHalf * 2) / 0.42);
    for (let window = 0; window < rows; window++) {
      builder.box(
        index === 2 ? "glass" : "glow",
        index === 2 ? "#3a5f7f" : "#cfe8f6",
        [0.02, index === 2 ? 0.46 : 0.24, 0.28],
        [
          tierMaxX + 0.01,
          from + height * 0.58,
          shipZ - tierHalf + 0.25 + window * 0.42,
        ],
      );
    }
  });
  /* The bridge wings, reaching out over the sides */
  builder.box(
    "paint",
    superWhite,
    [0.6, 0.12, half * 2 + 0.3],
    [0.2, deckY + 2.2, shipZ],
  );
  /* The funnel, red with a yellow band and a black top */
  const funnel = { x: -1.9, y: deckY + 2.2 };
  builder.box(
    "paint",
    hullRed,
    [1.0, 1.3, 1.1],
    [funnel.x, funnel.y + 0.65, shipZ],
  );
  builder.box(
    "paint",
    funnelYellow,
    [1.02, 0.3, 1.12],
    [funnel.x, funnel.y + 0.85, shipZ],
  );
  builder.box(
    "paint",
    bootBlack,
    [1.02, 0.25, 1.12],
    [funnel.x, funnel.y + 1.18, shipZ],
  );
  /* The mast on the bridge roof */
  builder.cylinder("paint", superWhite, {
    radius: 0.07,
    radiusEnd: 0.05,
    length: 1.8,
    at: [0.0, bridgeTop + 0.9, shipZ],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    superWhite,
    [0.08, 0.06, 1.2],
    [0.0, bridgeTop + 1.3, shipZ],
  );
  [-0.55, 0.55].forEach((dz) => {
    builder.sphere(
      "glow",
      dz < 0 ? "#ff5a4a" : "#59f07a",
      0.05,
      [0.0, bridgeTop + 1.36, shipZ + dz],
      [1, 1, 1],
      6,
    );
  });
  builder.sphere(
    "glow",
    palette.warmLight,
    0.06,
    [0.0, bridgeTop + 1.85, shipZ],
    [1, 1, 1],
    6,
  );
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      bootBlack,
      [0.72, 0.2, 0.04],
      [funnel.x, funnel.y + 0.85, shipZ + side * 0.57],
    );
    builder.box(
      "matte",
      hullRed,
      [0.24, 0.14, 0.045],
      [funnel.x, funnel.y + 0.85, shipZ + side * 0.57],
    );
  });
  /* Orange lifeboats on davits either side */
  [1, -1].forEach((side) => {
    const z = shipZ + side * (superstructure.half + 0.22);
    builder.sphere(
      "paint",
      lifeboatOrange,
      0.28,
      [-1.2, deckY + 1.4, z],
      [2.6, 0.9, 1],
      12,
    );
    builder.box("paint", superWhite, [1.0, 0.1, 0.36], [-1.2, deckY + 1.62, z]);
    [-1.8, -0.6].forEach((x) => {
      builder.bar(
        "metal",
        palette.darkSteel,
        [x, deckY + 1.2, shipZ + side * superstructure.half],
        [x, deckY + 1.85, z],
        0.05,
        4,
      );
    });
  });
  /* A rail round the bridge roof */
  [1, -1].forEach((side) => {
    builder.box(
      "paint",
      superWhite,
      [1.3, 0.04, 0.04],
      [-0.05, bridgeTop + 0.5, shipZ + side * 1.0],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The foredeck and helideck                                           */
/* ------------------------------------------------------------------ */

const buildDecks = (builder: AttractionBuilder) => {
  /* The helideck: a raised pad with a big H */
  builder.box(
    "matte",
    palette.darkSteel,
    [2.6, 0.06, 2.6],
    [helideck.x, deckY + 0.07, shipZ],
  );
  builder.box(
    "paint",
    funnelYellow,
    [2.4, 0.01, 0.06],
    [helideck.x, deckY + 0.105, shipZ + 1.16],
  );
  /* A crane on the foredeck */
  builder.cylinder("paint", funnelYellow, {
    radius: 0.16,
    length: 1.6,
    at: [3.1, deckY + 0.8, shipZ - 0.9],
    segments: 10,
  });
  builder.bar(
    "paint",
    funnelYellow,
    [3.1, deckY + 1.5, shipZ - 0.9],
    [4.6, deckY + 2.4, shipZ - 0.4],
    0.12,
    6,
  );
  /* Hatch covers */
  builder.box("paint", "#3f6f8f", [1.2, 0.3, 1.4], [1.4, deckY + 0.15, shipZ]);
  if (builder.isFar) {
    return;
  }
  /* The H and the ring round it */
  builder.box(
    "paint",
    superWhite,
    [0.12, 0.01, 0.9],
    [helideck.x - 0.3, deckY + 0.105, shipZ],
  );
  builder.box(
    "paint",
    superWhite,
    [0.12, 0.01, 0.9],
    [helideck.x + 0.3, deckY + 0.105, shipZ],
  );
  builder.box(
    "paint",
    superWhite,
    [0.6, 0.01, 0.12],
    [helideck.x, deckY + 0.105, shipZ],
  );
  builder.torus(
    "paint",
    funnelYellow,
    0.95,
    0.03,
    [helideck.x, deckY + 0.1, shipZ],
    "y",
    24,
  );
  /* The crane's hook, cab and the hatch's ribs */
  builder.bar(
    "matte",
    bootBlack,
    [4.6, deckY + 2.4, shipZ - 0.4],
    [4.6, deckY + 1.3, shipZ - 0.4],
    0.015,
    3,
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.12, 0.16, 0.06],
    [4.6, deckY + 1.25, shipZ - 0.4],
  );
  builder.box(
    "glass",
    palette.glass,
    [0.35, 0.3, 0.35],
    [3.1, deckY + 1.75, shipZ - 0.9],
  );
  for (let rib = 0; rib < 4; rib++) {
    builder.box(
      "paint",
      shade("#3f6f8f", 0.8),
      [0.05, 0.32, 1.42],
      [0.9 + rib * 0.33, deckY + 0.16, shipZ],
    );
  }
  /* Anchor winches, bollards and a ship's bell at the bow */
  [1, -1].forEach((side) => {
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.2,
      length: 0.3,
      at: [4.9, deckY + 0.25, shipZ + side * 0.45],
      axis: "z",
      segments: 10,
    });
    [2.4, 4.2].forEach((x) => {
      builder.cylinder("metal", bootBlack, {
        radius: 0.08,
        length: 0.25,
        at: [x, deckY + 0.13, shipZ + side * 1.35],
        segments: 8,
      });
    });
  });
  builder.box(
    "paint",
    superWhite,
    [0.06, 0.8, 0.06],
    [5.5, deckY + 0.4, shipZ],
  );
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0.02, 0.2],
      [0.08, 0.18],
      [0.1, 0.05],
      [0.13, 0],
    ],
    [5.5, deckY + 0.55, shipZ + 0.1],
    "y",
    10,
  );
  /* Coils of rope */
  [-1.4, 1.4].forEach((dz) => {
    builder.torus(
      "matte",
      "#c8a46a",
      0.16,
      0.05,
      [-5.4, deckY + 0.06, shipZ + dz * 0.75],
      "y",
      10,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The gangway                                                         */
/* ------------------------------------------------------------------ */

const gangwayHeightAt = (z: number): number =>
  deckY *
  Math.min(1, Math.max(0, (gangway.toZ - z) / (gangway.toZ - gangway.fromZ)));

const buildGangway = (builder: AttractionBuilder) => {
  const length = gangway.toZ - gangway.fromZ;
  const slope = Math.hypot(length, deckY);
  const angle = Math.atan2(deckY, length);
  const x = (gangway.minX + gangway.maxX) / 2;
  builder.box(
    "metal",
    palette.steel,
    [gangway.maxX - gangway.minX - 0.1, 0.08, slope],
    [x, deckY / 2 - 0.04, (gangway.fromZ + gangway.toZ) / 2],
    [angle, 0, 0],
  );
  [gangway.minX, gangway.maxX].forEach((railX) => {
    builder.bar(
      "paint",
      superWhite,
      [railX, deckY + 0.9, gangway.fromZ],
      [railX, 0.9, gangway.toZ],
      0.05,
      6,
    );
    builder.box(
      "paint",
      superWhite,
      [0.05, 0.9, 0.05],
      [railX, 0.45, gangway.toZ],
    );
    builder.box(
      "paint",
      superWhite,
      [0.05, 0.9, 0.05],
      [railX, deckY + 0.45, gangway.fromZ],
    );
  });
  if (builder.isFar) {
    return;
  }
  for (let tread = 1; tread < 8; tread++) {
    const z = gangway.fromZ + (length * tread) / 8;
    builder.box(
      "metal",
      palette.darkSteel,
      [gangway.maxX - gangway.minX - 0.15, 0.03, 0.05],
      [x, gangwayHeightAt(z) + 0.02, z],
    );
  }
  [gangway.minX, gangway.maxX].forEach((railX) => {
    builder.bar(
      "paint",
      superWhite,
      [railX, deckY + 0.45, gangway.fromZ],
      [railX, 0.45, gangway.toZ],
      0.03,
      4,
    );
    builder.box(
      "paint",
      superWhite,
      [0.05, 0.9, 0.05],
      [railX, gangwayHeightAt(2.3) + 0.45, 2.3],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The sea ice                                                         */
/* ------------------------------------------------------------------ */

const buildSeaIce = (builder: AttractionBuilder) => {
  builder.add(
    "glass",
    seaIce,
    new CylinderGeometry(1, 1, 0.04, builder.segments(28, 14)),
    { at: [0, 0.02, shipZ], scale: [8.2, 1, 4.6] },
  );
  /* An open lead of dark water behind the ship, where it broke through */
  builder.box(
    "water",
    leadWater,
    [3.2, 0.03, 1.6],
    [-7.1, 0.03, shipZ],
    [0, 0.1, 0],
  );
  if (builder.isFar) {
    return;
  }
  /* Broken floes in the lead, and cracks across the ice */
  [
    [-7.4, -0.4, 0.5, 0.3],
    [-6.6, 0.3, 0.4, 1.1],
    [-7.9, 0.1, 0.35, 2.0],
  ].forEach(([x, dz, size, turn]) => {
    builder.box(
      "paint",
      frostWhite,
      [size * 1.4, 0.08, size],
      [x, 0.05, shipZ + dz],
      [0, turn, 0],
    );
  });
  [
    [5.6, 1.6, 2.2, 0.6],
    [-2.6, 2.2, 2.6, -0.3],
    [1.0, -3.8, 2.4, 0.2],
    [6.2, -2.4, 1.6, -0.7],
  ].forEach(([x, z, length, turn]) => {
    builder.box(
      "water",
      leadWater,
      [length, 0.01, 0.06],
      [x, 0.045, z],
      [0, turn, 0],
    );
  });
  /* Pressure ridges: blocks of ice pushed up where the floes meet */
  [
    [6.6, -0.4, 0.4],
    [-1.6, -4.4, 0.0],
    [3.6, 2.6, 1.2],
  ].forEach(([x, z, turn]) => {
    for (let block = 0; block < 4; block++) {
      builder.box(
        "glass",
        "#c9e6f3",
        [0.45, 0.24, 0.32],
        [
          x + Math.cos(turn) * block * 0.36,
          0.1 + (block % 2) * 0.06,
          z - Math.sin(turn) * block * 0.36,
        ],
        [0.25 * block, turn + block * 0.3, 0.2],
      );
    }
  });
  /* Snow drifted against the hull */
  [
    [-3.0, 1.0],
    [0.8, 1.0],
    [-1.0, -1.0],
  ].forEach(([x, side]) => {
    builder.sphere(
      "matte",
      frostWhite,
      0.5,
      [x, 0, shipZ + side * (half + 0.15)],
      [2.4, 0.6, 0.6],
      10,
    );
  });
  /* A snowman the crew built on the ice */
  const snowman = { x: 6.6, z: 2.4 };
  builder.sphere(
    "matte",
    frostWhite,
    0.32,
    [snowman.x, 0.3, snowman.z],
    [1, 0.9, 1],
    10,
  );
  builder.sphere(
    "matte",
    frostWhite,
    0.22,
    [snowman.x, 0.72, snowman.z],
    [1, 1, 1],
    10,
  );
  builder.cylinder("paint", hullRed, {
    radius: 0.14,
    radiusEnd: 0.04,
    length: 0.3,
    at: [snowman.x, 1.06, snowman.z],
    segments: 8,
  });
  builder.add(
    "paint",
    lifeboatOrange,
    new ConeGeometry(0.03, 0.14, 5).rotateX(Math.PI / 2),
    {
      at: [snowman.x, 0.75, snowman.z + 0.24],
    },
  );
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const heliAt: Triple = [helideck.x, deckY + 0.1, shipZ];

/** The ship's little helicopter, used to scout for a way through the ice. */
const buildHelicopter = (builder: AttractionBuilder) => {
  const [x, y, z] = heliAt;
  builder.sphere(
    "paint",
    heliRed,
    0.42,
    [x + 0.15, y + 0.55, z],
    [1.5, 0.95, 0.9],
    14,
  );
  builder.sphere(
    "glass",
    "#3a5f7f",
    0.3,
    [x + 0.55, y + 0.62, z],
    [1, 0.95, 1],
    10,
  );
  builder.bar(
    "paint",
    heliRed,
    [x - 0.4, y + 0.62, z],
    [x - 1.5, y + 0.78, z],
    0.12,
    8,
  );
  builder.box("paint", heliRed, [0.24, 0.42, 0.05], [x - 1.5, y + 0.92, z]);
  builder.box("paint", superWhite, [0.9, 0.08, 0.86], [x + 0.15, y + 0.5, z]);
  [1, -1].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [x - 0.3, y + 0.04, z + side * 0.4],
      [x + 0.65, y + 0.04, z + side * 0.4],
      0.05,
      5,
    );
    builder.bar(
      "metal",
      palette.darkSteel,
      [x - 0.1, y + 0.04, z + side * 0.4],
      [x - 0.05, y + 0.3, z + side * 0.25],
      0.04,
      4,
    );
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + 0.45, y + 0.04, z + side * 0.4],
      [x + 0.4, y + 0.3, z + side * 0.25],
      0.04,
      4,
    );
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 0.25,
    at: [x + 0.1, y + 1.0, z],
    segments: 6,
  });
};

const rotorAt: Triple = [heliAt[0] + 0.1, heliAt[1] + 1.13, heliAt[2]];

const buildRotor = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.08,
    length: 0.08,
    at: [0, 0, 0],
    segments: 8,
  });
  [0, Math.PI / 2].forEach((turn) => {
    builder.box(
      "paint",
      bootBlack,
      [2.4, 0.03, 0.12],
      [0, 0.02, 0],
      [0, turn, 0],
    );
  });
};

const radarAt: Triple = [0.0, bridgeTop + 1.55, shipZ];

const buildRadar = (builder: AttractionBuilder) => {
  builder.box("paint", superWhite, [0.08, 0.1, 1.1], [0, 0, 0]);
  builder.box("paint", bootBlack, [0.06, 0.05, 1.12], [0.02, 0.07, 0]);
};

const lampAt: Triple = [0.62, deckY + 2.7, shipZ];

/** The searchlight on the bridge, switched on as you come aboard. */
const buildSearchlight = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.14,
    length: 0.26,
    at: [0, 0, 0],
    axis: "x",
    segments: 10,
  });
  builder.cylinder("glow", "#fff3c4", {
    radius: 0.12,
    length: 0.02,
    at: [0.14, 0, 0],
    axis: "x",
    segments: 10,
  });
};

const flagAt: Triple = [sternX + 0.25, deckY + 0.5, shipZ];

const buildEnsign = (builder: AttractionBuilder) => {
  builder.cylinder("paint", superWhite, {
    radius: 0.03,
    length: 1.4,
    at: [0, 0.7, 0],
    segments: 6,
  });
  builder.box("matte", "#1f4f8f", [0.6, 0.38, 0.02], [-0.3, 1.2, 0]);
  builder.box("matte", frostWhite, [0.6, 0.08, 0.025], [-0.3, 1.2, 0]);
  builder.box("matte", frostWhite, [0.08, 0.38, 0.025], [-0.3, 1.2, 0]);
};

const moving: MovingPart[] = [
  {
    name: "helicopter rotor",
    pivot: rotorAt,
    build: buildRotor,
    motion: { kind: "whirl", axis: "y", idle: 0.15, speed: 14, reach: 6 },
  },
  {
    name: "radar",
    pivot: radarAt,
    build: buildRadar,
    motion: { kind: "spin", axis: "y", speed: 1.6 },
  },
  {
    name: "searchlight",
    pivot: lampAt,
    build: buildSearchlight,
    motion: { kind: "wake", reach: 7 },
  },
  {
    name: "ensign",
    pivot: flagAt,
    build: buildEnsign,
    motion: { kind: "nod", axis: "y", reach: 8, amplitude: 0.4, period: 1.5 },
  },
];

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

/** A polar bear, padding about on the ice to see what the ship is. */
const buildPolarBear = (builder: AttractionBuilder) => {
  const fur = "#f3efe2";
  builder.sphere("matte", fur, 0.36, [0, 0.55, -0.05], [0.85, 0.8, 1.45], 12);
  builder.sphere("matte", fur, 0.24, [0, 0.62, 0.42], [0.9, 0.85, 1.1], 10);
  builder.sphere("matte", fur, 0.15, [0, 0.66, 0.66], [0.85, 0.8, 1.1], 10);
  builder.sphere(
    "matte",
    shade(fur, 0.95),
    0.08,
    [0, 0.6, 0.8],
    [0.9, 0.8, 1.1],
    8,
  );
  builder.sphere(
    "paint",
    palette.black,
    0.035,
    [0, 0.62, 0.88],
    [1.2, 0.9, 1],
    6,
  );
  [-1, 1].forEach((side) => {
    builder.sphere("matte", fur, 0.05, [side * 0.1, 0.8, 0.6], [1, 1, 0.6], 6);
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [side * 0.07, 0.7, 0.76],
      [1, 1, 1],
      4,
    );
    [-0.3, 0.3].forEach((z) => {
      builder.cylinder("matte", fur, {
        radius: 0.1,
        radiusEnd: 0.09,
        length: 0.42,
        at: [side * 0.17, 0.21, z],
        segments: 8,
      });
      if (!builder.isFar) {
        builder.sphere(
          "matte",
          shade(fur, 0.95),
          0.1,
          [side * 0.17, 0.03, z + 0.04],
          [1, 0.4, 1.3],
          6,
        );
      }
    });
  });
};

const buildSailor = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((side) => {
    builder.box("matte", bootBlack, [0.1, 0.1, 0.18], [side, 0.05, 0.02]);
    builder.cylinder("matte", "#2b3442", {
      radius: 0.05,
      length: 0.34,
      at: [side, 0.27, 0],
      segments: 6,
    });
  });
  builder.lathe(
    "matte",
    lifeboatOrange,
    [
      [0, 0.42],
      [0.17, 0.44],
      [0.17, 0.62],
      [0.14, 0.76],
      [0.06, 0.82],
      [0, 0.82],
    ],
    [0, 0, 0],
    "y",
    8,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      lifeboatOrange,
      [side * 0.14, 0.76, 0],
      [side * 0.24, 0.5, 0.05],
      0.07,
      5,
    );
  });
  builder.box("paint", superWhite, [0.3, 0.05, 0.02], [0, 0.6, 0.17]);
  builder.sphere("matte", "#e8b894", 0.11, [0, 0.93, 0], [1, 1, 1], 9);
  builder.lathe(
    "matte",
    "#1f4f8f",
    [
      [0, 1.05],
      [0.08, 1.03],
      [0.115, 0.95],
      [0.118, 0.93],
    ],
    [0, 0, 0],
    "y",
    8,
  );
};

const wanderers: Wanderers[] = [
  {
    name: "a polar bear",
    build: buildPolarBear,
    count: 1,
    centre: { x: 4.6, z: 4.8 },
    radius: 1.3,
    speed: 0.4,
    height: 0.04,
  },
  {
    name: "sailors on the foredeck",
    build: buildSailor,
    count: 2,
    centre: { x: 3.4, z: shipZ },
    radius: 0.6,
    speed: 0.3,
    height: deckY + 0.04,
  },
];

/* ------------------------------------------------------------------ */
/* The ride and decks                                                  */
/* ------------------------------------------------------------------ */

const flightHeight = 5.2;
const flightRadius = 6.6;

const heliRide = (progress: number): LocalSpot => {
  const seat = { x: heliAt[0] + 0.3, y: heliAt[1] + 0.3, z: heliAt[2] };
  if (progress < 0.14) {
    const share = progress / 0.14;
    return {
      x: rideStart.x + (seat.x - rideStart.x) * share,
      y: seat.y * share,
      z: rideStart.z + (seat.z - rideStart.z) * share,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.86) {
    /* Up, once round the ship over the ice, and down by the bow */
    const share = (progress - 0.14) / 0.72;
    const rise = Math.sin(Math.min(1, share * 4) * (Math.PI / 2));
    const angle = Math.PI + share * Math.PI * 1.8;
    const reach = flightRadius * Math.min(1, share * 3);
    const lower = share > 0.8 ? (share - 0.8) / 0.2 : 0;
    const x = seat.x * (1 - Math.min(1, share * 3)) + Math.cos(angle) * reach;
    const z =
      seat.z * (1 - Math.min(1, share * 3)) +
      shipZ * Math.min(1, share * 3) -
      Math.sin(angle) * reach * 0.62;
    return {
      x,
      y:
        seat.y +
        (flightHeight - seat.y) * rise * (1 - lower) +
        0.6 * lower * (1 - lower),
      z,
      heading: angle + Math.PI,
    };
  }
  const end = heliRide(0.8599);
  const share = (progress - 0.86) / 0.14;
  return {
    x: end.x + (rideFinish.x - end.x) * share,
    y: end.y * (1 - share),
    z: end.z + (rideFinish.z - end.z) * share,
    heading: end.heading,
  };
};

const shipDeck: Deck = (point) => {
  if (isInside(deckOutline, point)) {
    return { height: deckY + 0.04, kind: "bridge" };
  }
  if (
    point.x >= gangway.minX &&
    point.x <= gangway.maxX &&
    point.z >= gangway.fromZ - 0.2 &&
    point.z <= gangway.toZ
  ) {
    return { height: gangwayHeightAt(point.z), kind: "bridge" };
  }
  if ((point.x / 8.2) ** 2 + ((point.z - shipZ) / 4.6) ** 2 <= 1) {
    return { height: 0.04, kind: "ice" };
  }
  return undefined;
};

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

const firs: [number, number, number][] = [
  [-8.0, 4.0, 0.9],
  [8.4, -4.2, 1.0],
];

const addFir = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  size: number,
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.1 * size,
    length: 0.5 * size,
    at: [x, 0.25 * size, z],
    segments: 6,
  });
  for (let tier = 0; tier < 3; tier++) {
    const radius = (0.85 - tier * 0.22) * size;
    const y = (0.5 + tier * 0.55) * size;
    builder.add(
      "matte",
      shade("#2d5a40", 1 + tier * 0.07),
      new ConeGeometry(radius, 0.95 * size, builder.segments(9, 6)),
      {
        at: [x, y + 0.45 * size, z],
      },
    );
    if (!builder.isFar) {
      builder.add(
        "matte",
        frostWhite,
        new ConeGeometry(radius * 0.55, 0.34 * size, 9),
        {
          at: [x, y + 0.78 * size, z],
        },
      );
    }
  }
};

const build = (builder: AttractionBuilder) => {
  buildSeaIce(builder);
  buildHull(builder);
  buildSuperstructure(builder);
  buildDecks(builder);
  buildGangway(builder);
  buildHelicopter(builder);
  firs.forEach(([x, z, size]) => {
    addFir(builder, x, z, size);
  });
  addSignBoard(builder, signAt, signColour);
};

export const icebreakerShipModel: NewLandAttractionModel = {
  kind: "icebreaker-ship",
  islandId: "frost-isle",
  name: "Icebreaker Ship",
  fact: "In 1915 the explorer Ernest Shackleton's ship, Endurance, became stuck fast in the frozen sea near Antarctica and was slowly crushed by the ice, but Shackleton led every one of his crew home safely. Today, icebreaker ships have extra-strong steel hulls and sloping bows that ride up onto the ice and crack it with their weight.",
  curriculumLink:
    "History, Key Stage 1: the lives of significant individuals in the past who have contributed to national and international achievements, such as the polar explorer Ernest Shackleton.",
  footprint: 10,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 0.8 },
  build,
  moving,
  wanderers,
  smoke: [
    {
      at: [-1.9, deckY + 3.6, shipZ],
      colour: "#5a5f66",
      puffs: 7,
      size: 0.22,
      rise: 2.2,
      spread: 0.45,
    },
  ],
  decks: [shipDeck],
  rides: [
    {
      id: "helicopter",
      name: "the helicopter",
      start: rideStart,
      reach: 0.7,
      seconds: 10,
      finish: rideFinish,
      follow: heliRide,
    },
  ],
  blockers: firs.map(([x, z, size]) => ({
    x,
    z,
    radius: 0.35 * size,
  })) satisfies LocalBlocker[],
  tune: [45, 45, 52],
  play: {
    label: "Sound the ship's horn",
    news: "Toot, toooot! The icebreaker's deep horn boomed across the frozen sea, and its strong red bow got ready to crunch a path through the ice.",
    tune: [45, 52, 45],
  },
};
