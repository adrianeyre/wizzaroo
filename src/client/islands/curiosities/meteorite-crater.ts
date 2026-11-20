import { LatheGeometry, Vector2 } from "three";
import {
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const craterRock = "#6f6878";
const craterDust = "#8d8597";
const rimStone = "#5b5466";
const meteorIron = "#3a3440";
const glowViolet = "#c38bff";
const glowCyan = "#7ff3ff";
const auraColour = "#d2b4ff";
const deckTimber = "#6b4a3a";
const signColour = "#3a2a6b";

/* The crater's cross-section, from its middle out: [radius, height]. */
const craterProfile: readonly [number, number][] = [
  [0, 0.03],
  [1.0, 0.04],
  [1.6, 0.1],
  [2.05, 0.3],
  [2.4, 0.58],
  [2.6, 0.62],
  [2.85, 0.55],
  [3.25, 0.28],
  [3.75, 0.02],
];
const deckHeight = 0.66;
const deckArea = { minX: -1.15, maxX: 1.15, minZ: -3.35, maxZ: -2.35 };
const poleAt = { x: 2.0, z: 1.55 };
const rockHeight = 0.5;

/** The crater's ground height at a distance from its middle. */
const craterHeightAt = (distance: number): number | undefined => {
  for (let index = 0; index < craterProfile.length - 1; index++) {
    const [fromRadius, fromHeight] = craterProfile[index];
    const [toRadius, toHeight] = craterProfile[index + 1];
    if (distance >= fromRadius && distance <= toRadius) {
      const share = (distance - fromRadius) / (toRadius - fromRadius);
      return fromHeight + (toHeight - fromHeight) * share;
    }
  }
  return undefined;
};

const craterDeck: Deck = ({ x, z }) => {
  const height = craterHeightAt(Math.hypot(x, z));
  return height === undefined ? undefined : { height, kind: "trail" };
};

const buildCrater = (builder: AttractionBuilder) => {
  const around = builder.isFar ? 16 : 56;
  /* Drawn from the outside in, so the faces look up and into the bowl */
  builder.add(
    "matte",
    craterRock,
    new LatheGeometry(
      [...craterProfile]
        .reverse()
        .map(
          ([radius, height]) => new Vector2(Math.max(0.001, radius), height),
        ),
      around,
    ),
  );
  if (builder.isFar) {
    return;
  }
  /* A paler dusty floor, and rays of thrown-out dust */
  builder.add(
    "matte",
    craterDust,
    new LatheGeometry(
      [
        [1.5, 0.095],
        [0.9, 0.055],
        [0.001, 0.045],
      ].map(([radius, height]) => new Vector2(radius, height)),
      40,
    ),
  );
  for (let ray = 0; ray < 7; ray++) {
    const angle = (ray / 7) * Math.PI * 2 + 0.3;
    if (Math.abs(Math.sin(angle)) < 0.3 && Math.cos(angle) < 0) {
      continue;
    }
    const middle = 4.15;
    builder.box(
      "matte",
      shade(craterDust, 1.08),
      [0.28, 0.02, 0.9],
      [Math.sin(angle) * middle, 0.01, Math.cos(angle) * middle],
      [0, angle, 0],
    );
  }
  /* Boulders heaped along the rim */
  for (let boulder = 0; boulder < 22; boulder++) {
    const angle = (boulder / 22) * Math.PI * 2 + (boulder % 3) * 0.08;
    const radius = 2.55 + ((boulder * 7) % 5) * 0.08;
    const isOnDeck =
      Math.abs(Math.sin(angle) * radius) < 1.3 && Math.cos(angle) * radius < -2;
    if (isOnDeck) {
      continue;
    }
    const size = 0.16 + ((boulder * 5) % 4) * 0.05;
    builder.sphere(
      "matte",
      boulder % 2 === 0 ? rimStone : shade(rimStone, 1.15),
      size,
      [Math.sin(angle) * radius, 0.58 + size * 0.2, Math.cos(angle) * radius],
      [1.3, 0.7, 1.1],
      8,
    );
  }
};

/** The meteorite itself: a lumpy lump of iron with glowing cracks. */
const buildMeteorite = (builder: AttractionBuilder) => {
  builder.sphere(
    "metal",
    meteorIron,
    0.55,
    [0, rockHeight, 0],
    [1.15, 0.85, 1],
    builder.isFar ? 8 : 20,
  );
  if (builder.isFar) {
    return;
  }
  [
    [0.32, 0.65, 0.18, 0.32],
    [-0.35, 0.58, -0.12, 0.34],
    [0.05, 0.8, -0.3, 0.28],
    [-0.12, 0.35, 0.38, 0.26],
  ].forEach(([x, y, z, size], index) => {
    builder.sphere(
      "metal",
      index % 2 === 0 ? shade(meteorIron, 1.2) : meteorIron,
      size,
      [x, y, z],
      [1.1, 0.85, 1],
      12,
    );
  });
  /* Thumbprint dimples melted into it on its way through the air */
  [
    [0.55, 0.5, 0.2],
    [-0.2, 0.62, 0.5],
    [0.25, 0.85, 0.42],
    [-0.58, 0.45, 0.15],
  ].forEach(([x, y, z]) => {
    builder.sphere(
      "metal",
      shade(meteorIron, 0.7),
      0.08,
      [x, y, z],
      [1, 1, 0.5],
      8,
    );
  });
  /* Glowing cracks */
  [
    [
      [0.2, 0.25, 0.48],
      [0.45, 0.62, 0.3],
    ],
    [
      [-0.3, 0.3, 0.42],
      [-0.05, 0.75, 0.35],
    ],
    [
      [-0.5, 0.4, -0.2],
      [-0.25, 0.85, -0.25],
    ],
    [
      [0.3, 0.3, -0.4],
      [0.1, 0.7, -0.45],
    ],
  ].forEach(([from, to], index) => {
    const [fromX, fromY, fromZ] = from;
    const [toX, toY, toZ] = to;
    builder.bar(
      "glow",
      index % 2 === 0 ? glowViolet : glowCyan,
      [fromX, fromY, fromZ],
      [toX, toY, toZ],
      0.04,
      5,
    );
  });
  /* A dark scorched bed round it */
  builder.cylinder("matte", "#2e2934", {
    radius: 1.0,
    radiusEnd: 0.9,
    length: 0.06,
    at: [0, 0.07, 0],
    segments: 28,
  });
};

/** Glowing crystals that grow brighter and bigger as a visitor comes near. */
const buildCrystals = (builder: AttractionBuilder) => {
  [
    [0.35, 0.25, 0.25, 0.3, -0.4, 0.5],
    [-0.3, 0.3, 0.3, 0.26, 0.3, -0.5],
    [0.1, 0.42, -0.35, 0.34, 0.2, 0.3],
    [-0.42, 0.18, -0.15, 0.22, -0.2, -0.6],
    [0.0, 0.5, 0.15, 0.4, 0, 0],
    [0.45, 0.15, -0.2, 0.2, 0.6, 0.2],
  ].forEach(([x, y, z, length, tiltX, tiltZ], index) => {
    builder.cylinder("glow", index % 2 === 0 ? glowViolet : glowCyan, {
      radius: 0.06,
      radiusEnd: 0.005,
      length,
      at: [x, y + length / 2, z],
      segments: 6,
    });
    builder.box(
      "glow",
      index % 2 === 0 ? glowCyan : glowViolet,
      [0.05, 0.05, 0.05],
      [x + tiltX * 0.1, y + length + 0.08, z + tiltZ * 0.1],
      [0.6, 0.6, 0],
    );
  });
};

const buildAura = (builder: AttractionBuilder) => {
  builder.sphere("glow", auraColour, 1.1, [0, 0, 0], [1.2, 0.9, 1.2], 16);
};

const buildSpark = (builder: AttractionBuilder) => {
  builder.box("glow", glowCyan, [0.08, 0.08, 0.08], [0, 0, 0], [0.7, 0.7, 0]);
  builder.box(
    "glow",
    glowViolet,
    [0.05, 0.05, 0.05],
    [0.12, 0.08, 0],
    [0.3, 0.9, 0.2],
  );
};

/** The viewing deck that stands on the far rim, with a rail. */
const buildDeck = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = deckArea;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  builder.box(
    "matte",
    deckTimber,
    [width, 0.08, depth],
    [(minX + maxX) / 2, deckHeight - 0.04, (minZ + maxZ) / 2],
  );
  if (builder.isFar) {
    return;
  }
  for (let plank = 0; plank < 9; plank++) {
    builder.box(
      "matte",
      plank % 2 === 0 ? shade(deckTimber, 1.12) : deckTimber,
      [0.22, 0.02, depth - 0.04],
      [minX + 0.13 + plank * 0.25, deckHeight + 0.005, (minZ + maxZ) / 2],
    );
  }
  [minX + 0.06, maxX - 0.06].forEach((x) => {
    [minZ + 0.06, maxZ - 0.06].forEach((z) => {
      builder.box(
        "matte",
        shade(deckTimber, 0.8),
        [0.1, deckHeight + 0.9, 0.1],
        [x, (deckHeight + 0.9) / 2, z],
      );
    });
  });
  /* A rail along the back and sides, leaving the front open to look in */
  builder.box(
    "paint",
    palette.steel,
    [width, 0.05, 0.05],
    [(minX + maxX) / 2, deckHeight + 0.85, minZ + 0.06],
  );
  builder.box(
    "paint",
    palette.steel,
    [width, 0.04, 0.04],
    [(minX + maxX) / 2, deckHeight + 0.45, minZ + 0.06],
  );
  [minX + 0.06, maxX - 0.06].forEach((x) => {
    builder.box(
      "paint",
      palette.steel,
      [0.05, 0.05, depth],
      [x, deckHeight + 0.85, (minZ + maxZ) / 2],
    );
  });
  /* A coin telescope on the deck, and a little information board */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 0.9,
    at: [0.6, deckHeight + 0.45, minZ + 0.4],
    segments: 8,
  });
  builder.bar(
    "paint",
    "#5b3a8c",
    [0.6, deckHeight + 0.95, minZ + 0.25],
    [0.6, deckHeight + 0.82, minZ + 0.75],
    0.18,
    12,
  );
  builder.box(
    "paint",
    "#24306a",
    [0.6, 0.4, 0.04],
    [-0.5, deckHeight + 0.9, minZ + 0.08],
    [-0.3, 0, 0],
  );
  builder.box(
    "glow",
    glowCyan,
    [0.12, 0.12, 0.01],
    [-0.62, deckHeight + 0.95, minZ + 0.11],
    [-0.3, 0, 0],
  );
};

/** A measuring pole marked every 10 centimetres, red and white. */
const buildPole = (builder: AttractionBuilder) => {
  const { x, z } = poleAt;
  const base = craterHeightAt(Math.hypot(x, z)) ?? 0;
  const length = 1.6;
  builder.cylinder("paint", palette.white, {
    radius: 0.045,
    length,
    at: [x, base + length / 2, z],
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  for (let band = 0; band < 8; band += 2) {
    builder.cylinder("paint", palette.postRed, {
      radius: 0.048,
      length: 0.2,
      at: [x, base + 0.1 + band * 0.2, z],
      segments: 10,
    });
  }
  builder.sphere(
    "paint",
    palette.postRed,
    0.07,
    [x, base + length + 0.04, z],
    [1, 1, 1],
    10,
  );
  builder.box(
    "paint",
    palette.white,
    [0.24, 0.12, 0.02],
    [x, base + 1.2, z + 0.06],
  );
};

const buildFragments = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [
    { x: -1.0, z: 0.6, size: 0.14, isGlowing: true },
    { x: 0.9, z: -0.8, size: 0.12, isGlowing: false },
    { x: 1.2, z: 0.5, size: 0.1, isGlowing: true },
    { x: -0.6, z: -1.15, size: 0.11, isGlowing: false },
    { x: -3.9, z: 1.5, size: 0.16, isGlowing: false },
    { x: 3.6, z: -2.2, size: 0.14, isGlowing: true },
    { x: -2.9, z: -2.7, size: 0.13, isGlowing: false },
  ].forEach(({ x, z, size, isGlowing }, index) => {
    const ground = craterHeightAt(Math.hypot(x, z)) ?? 0;
    builder.sphere(
      "metal",
      index % 2 === 0 ? meteorIron : shade(meteorIron, 1.25),
      size,
      [x, ground + size * 0.5, z],
      [1.2, 0.8, 1],
      8,
    );
    if (isGlowing) {
      builder.box(
        "glow",
        glowViolet,
        [0.05, 0.05, 0.05],
        [x, ground + size * 1.1, z],
        [0.6, 0.6, 0],
      );
    }
  });
  /* A geologist's bucket, trowel and magnifying glass at the foot of the rim */
  const kit: Triple = [-3.9, 0, 0.1];
  builder.cylinder("paint", "#ff8a2a", {
    radius: 0.18,
    radiusEnd: 0.14,
    length: 0.3,
    at: [kit[0], 0.15, kit[2]],
    segments: 14,
  });
  builder.torus(
    "metal",
    palette.steel,
    0.16,
    0.012,
    [kit[0], 0.34, kit[2]],
    "x",
    14,
  );
  builder.box(
    "metal",
    palette.steel,
    [0.08, 0.02, 0.2],
    [kit[0] + 0.3, 0.02, kit[2] + 0.2],
    [0, 0.6, 0],
  );
  builder.box(
    "matte",
    palette.timber,
    [0.04, 0.04, 0.16],
    [kit[0] + 0.38, 0.03, kit[2] + 0.36],
    [0, 0.6, 0],
  );
  builder.torus(
    "metal",
    palette.brass,
    0.09,
    0.015,
    [kit[0] - 0.1, 0.02, kit[2] + 0.35],
    "y",
    14,
  );
};

export const meteoriteCraterModel: CuriosityModel = {
  kind: "meteorite-crater",
  islandId: "starfall-isle",
  name: "Meteorite Crater",
  fact: "A meteorite is a rock from space that falls all the way to the ground. Many are made of iron and nickel, so they are dark, very heavy, and can even stick to a magnet, unlike most rocks on Earth. Big ones hit so hard that they blast out a round crater with a raised rim.",
  curriculumLink:
    "Science, Year 3: rocks. Compare and group together different kinds of rocks on the basis of their appearance and simple physical properties.",
  footprint: 5.4,
  setting: "inland",
  signSpot: { x: 2.3, z: 4.5 },
  build: (builder) => {
    buildCrater(builder);
    buildMeteorite(builder);
    buildDeck(builder);
    buildPole(builder);
    buildFragments(builder);
    addSignBoard(builder, [2.3, 0, 4.5], signColour);
  },
  moving: [
    {
      name: "crystals",
      pivot: [0, rockHeight + 0.2, 0],
      build: buildCrystals,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "aura",
      pivot: [0, rockHeight, 0],
      build: buildAura,
      motion: { kind: "flicker", period: 2.6 },
      look: "halo",
    },
    {
      name: "space-dust",
      pivot: [0, rockHeight + 0.9, 0],
      build: buildSpark,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 1.0,
        count: 4,
        speed: 0.7,
        bob: 0.15,
      },
    },
  ],
  blockers: [
    { x: 0, z: 0, radius: 0.8 },
    { x: poleAt.x, z: poleAt.z, radius: 0.2 },
    { x: -3.9, z: 0.1, radius: 0.3 },
  ] satisfies LocalBlocker[],
  decks: [buildFlatDeck(deckArea, deckHeight, "bridge"), craterDeck],
  play: {
    label: "Touch the space rock",
    news: "Zing! The meteorite's crystals glowed brighter. This rock flew through space for millions of years before it crashed here.",
  },
};
