import { BoxGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  addBench,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowShadow = "#d9e3ea";
const deckTimber = "#8b6a4a";
const deckDark = "#5e4430";
const railTimber = "#6f4f34";
const pineGreen = "#2d5640";
const telescopeBlue = "#24406b";
const blanketRed = "#a83a3a";
const blanketTartan = "#2f5a7a";
const auroraGreen = "#3dff9e";
const auroraTeal = "#2fe0d0";
const auroraViolet = "#a35cff";
const auroraPink = "#ff6fc8";
const starGold = "#ffe08a";
const signColour = "#2b3f6b";

const deck = { minX: -2.2, maxX: 2.2, minZ: -2.6, maxZ: 0, height: 0.66 };
const steps = [
  { minZ: 0, maxZ: 0.45, height: 0.44 },
  { minZ: 0.45, maxZ: 0.9, height: 0.22 },
];
const stepHalfWidth = 0.9;
const telescopeAt: Triple = [1.4, deck.height, -1.9];
const telescopeHead: Triple = [
  telescopeAt[0],
  deck.height + 1.0,
  telescopeAt[2],
];
const lanternPost = { x: -1.95, z: 0.25 };
const lanternAt: Triple = [lanternPost.x + 0.42, 1.85, lanternPost.z];
const signAt: Triple = [2.4, 0, 3.8];

/** A rounded block with fewer bevel steps than the builder's own, to save triangles. */
const addSoftBlock = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  size: Triple,
  radius: number,
  at: Triple,
  rotation?: Triple,
) => {
  if (builder.isFar) {
    builder.box(finish, colour, size, at, rotation);
    return;
  }
  builder.add(
    finish,
    colour,
    new RoundedBoxGeometry(
      size[0],
      size[1],
      size[2],
      1,
      Math.min(radius, ...size.map((side) => side / 2 - 0.001)),
    ),
    { at, rotation },
  );
};

/** A snowy spruce: a trunk and tiers of boughs, each capped with snow. */
const addSnowyPine = (builder: AttractionBuilder, at: Triple, size: number) => {
  const [x, y, z] = at;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.12 * size,
    radiusEnd: 0.08 * size,
    length: 0.7 * size,
    at: [x, y + 0.35 * size, z],
    segments: 6,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (0.95 - share * 0.55) * size;
    const base = (0.55 + share * 1.35) * size;
    const height = (1.3 - share * 0.25) * size;
    builder.cylinder("matte", shade(pineGreen, 1 + tier * 0.06), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, y + base + height / 2, z],
      segments: 12,
    });
    if (!builder.isFar) {
      builder.cylinder("matte", snow, {
        radius: radius * 0.62,
        radiusEnd: 0.02,
        length: height * 0.5,
        at: [x, y + base + height * 0.78, z],
        segments: 12,
      });
    }
  }
};

const buildDeck = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ, height } = deck;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const middleZ = (minZ + maxZ) / 2;
  builder.box(
    "matte",
    deckTimber,
    [width, 0.1, depth],
    [0, height - 0.05, middleZ],
  );
  steps.forEach((step) => {
    builder.box(
      "matte",
      shade(deckTimber, 0.95),
      [stepHalfWidth * 2, step.height, step.maxZ - step.minZ],
      [0, step.height / 2, (step.minZ + step.maxZ) / 2],
    );
  });
  /* The rail round the back and sides, open at the steps */
  const railHeight = height + 0.85;
  builder.box(
    "matte",
    railTimber,
    [width, 0.08, 0.1],
    [0, railHeight, minZ + 0.05],
  );
  [minX + 0.05, maxX - 0.05].forEach((x) => {
    builder.box(
      "matte",
      railTimber,
      [0.1, 0.08, depth],
      [x, railHeight, middleZ],
    );
  });
  if (builder.isFar) {
    builder.box(
      "matte",
      deckDark,
      [width - 0.2, height - 0.1, depth - 0.2],
      [0, (height - 0.1) / 2, middleZ],
    );
    return;
  }
  /* Planks across the deck, with gaps between */
  for (let plank = 0; plank < 13; plank++) {
    const z = minZ + 0.1 + plank * ((depth - 0.2) / 12);
    builder.box(
      "matte",
      shade(deckTimber, plank % 3 === 0 ? 1.1 : plank % 3 === 1 ? 0.96 : 1.03),
      [width - 0.04, 0.025, 0.17],
      [0, height + 0.012, z],
    );
  }
  /* Legs and cross-braces under the deck */
  [minX + 0.15, 0, maxX - 0.15].forEach((x) => {
    [minZ + 0.15, maxZ - 0.15].forEach((z) => {
      builder.box(
        "matte",
        deckDark,
        [0.14, height - 0.1, 0.14],
        [x, (height - 0.1) / 2, z],
      );
    });
  });
  builder.box(
    "matte",
    deckDark,
    [width - 0.1, 0.12, 0.1],
    [0, height - 0.16, minZ + 0.1],
  );
  builder.box(
    "matte",
    deckDark,
    [width - 0.1, 0.12, 0.1],
    [0, height - 0.16, maxZ - 0.1],
  );
  [minX + 0.15, maxX - 0.15].forEach((x) => {
    builder.bar(
      "matte",
      deckDark,
      [x, 0.06, minZ + 0.2],
      [x, height - 0.2, maxZ - 0.2],
      0.07,
      4,
    );
  });
  /* Step treads with a pale nosing, dusted with snow */
  steps.forEach((step) => {
    builder.box(
      "matte",
      shade(deckTimber, 1.15),
      [stepHalfWidth * 2 + 0.04, 0.03, 0.06],
      [0, step.height + 0.015, step.maxZ - 0.03],
    );
    builder.box(
      "matte",
      snow,
      [0.5, 0.02, 0.2],
      [-0.45 + step.height, step.height + 0.01, (step.minZ + step.maxZ) / 2],
    );
  });
  /* Rail posts and balusters, snow along the top rail */
  const balusters = (from: Triple, to: Triple, count: number) => {
    for (let index = 0; index <= count; index++) {
      const share = index / count;
      const isPost = index % 4 === 0;
      builder.box(
        "matte",
        isPost ? railTimber : shade(railTimber, 1.12),
        isPost ? [0.1, 0.9, 0.1] : [0.04, 0.82, 0.04],
        [
          from[0] + (to[0] - from[0]) * share,
          height + (isPost ? 0.45 : 0.41),
          from[2] + (to[2] - from[2]) * share,
        ],
      );
    }
  };
  balusters([minX + 0.05, 0, minZ + 0.05], [maxX - 0.05, 0, minZ + 0.05], 20);
  balusters([minX + 0.05, 0, minZ + 0.05], [minX + 0.05, 0, maxZ - 0.05], 12);
  balusters([maxX - 0.05, 0, minZ + 0.05], [maxX - 0.05, 0, maxZ - 0.05], 12);
  builder.box(
    "matte",
    railTimber,
    [width, 0.06, 0.08],
    [0, height + 0.3, minZ + 0.05],
  );
  addSoftBlock(builder, "matte", snow, [width + 0.04, 0.07, 0.16], 0.03, [
    0,
    railHeight + 0.07,
    minZ + 0.05,
  ]);
  [minX + 0.05, maxX - 0.05].forEach((x) => {
    builder.box(
      "matte",
      railTimber,
      [0.08, 0.06, depth],
      [x, height + 0.3, middleZ],
    );
    addSoftBlock(builder, "matte", snow, [0.16, 0.07, depth + 0.04], 0.03, [
      x,
      railHeight + 0.07,
      middleZ,
    ]);
  });
};

const buildSeating = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* Benches facing north, where the lights are, with blankets and a flask */
  addBench(builder, [-1.0, deck.height, -1.2], Math.PI, deckDark);
  addBench(builder, [0.35, deck.height, -1.2], Math.PI, deckDark);
  addSoftBlock(
    builder,
    "matte",
    blanketRed,
    [0.42, 0.08, 0.3],
    0.03,
    [-1.25, deck.height + 0.4, -1.22],
    [0, 0.2, 0],
  );
  addSoftBlock(
    builder,
    "matte",
    blanketTartan,
    [0.4, 0.1, 0.32],
    0.04,
    [0.6, deck.height + 0.41, -1.2],
    [0, -0.3, 0],
  );
  builder.cylinder("paint", "#3d6b4f", {
    radius: 0.06,
    length: 0.28,
    at: [-0.75, deck.height + 0.5, -1.18],
    segments: 10,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.065,
    length: 0.06,
    at: [-0.75, deck.height + 0.67, -1.18],
    segments: 10,
  });
  /* A star chart on a lectern by the steps */
  const chart: Triple = [-1.45, deck.height, -0.45];
  builder.box(
    "matte",
    deckDark,
    [0.08, 0.95, 0.08],
    [chart[0], chart[1] + 0.47, chart[2]],
  );
  builder.box(
    "matte",
    deckDark,
    [0.36, 0.04, 0.3],
    [chart[0], chart[1] + 0.02, chart[2]],
  );
  builder.box(
    "paint",
    "#1c2a4d",
    [0.6, 0.42, 0.03],
    [chart[0], chart[1] + 1.05, chart[2]],
    [-0.6, 0, 0],
  );
  [
    [-0.2, 0.08],
    [-0.1, -0.05],
    [0.05, 0.1],
    [0.15, -0.02],
    [0.22, 0.12],
    [-0.02, -0.12],
  ].forEach(([dx, dy]) => {
    builder.box(
      "glow",
      starGold,
      [0.03, 0.03, 0.01],
      [chart[0] + dx, chart[1] + 1.05 + dy * 0.82, chart[2] + 0.02 + dy * 0.57],
      [-0.6, 0, 0.78],
    );
  });
};

const buildTripod = (builder: AttractionBuilder) => {
  const [x, y, z] = telescopeAt;
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2 + 0.3;
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + Math.sin(angle) * 0.38, y, z + Math.cos(angle) * 0.38],
      [x, telescopeHead[1] - 0.06, z],
      0.035,
      5,
    );
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.07,
    length: 0.12,
    at: [x, telescopeHead[1] - 0.06, z],
    segments: 10,
  });
};

/** The telescope's tube, pointing north and up at the sky. */
const buildTelescope = (builder: AttractionBuilder) => {
  const tilt = 0.55;
  const along = (distance: number): Triple => [
    0,
    Math.sin(tilt) * distance,
    -Math.cos(tilt) * distance,
  ];
  builder.bar("paint", telescopeBlue, along(-0.45), along(0.55), 0.16, 14);
  builder.bar("metal", palette.brass, along(0.5), along(0.66), 0.2, 14);
  builder.bar("metal", palette.brass, along(-0.48), along(-0.38), 0.18, 12);
  builder.bar("metal", palette.black, along(-0.55), along(-0.45), 0.07, 8);
  builder.bar("paint", palette.white, along(-0.05), along(0.05), 0.18, 12);
  /* A little finder scope riding on top */
  const lift: Triple = [0, Math.cos(tilt) * 0.13, Math.sin(tilt) * 0.13];
  builder.bar(
    "metal",
    palette.steel,
    [lift[0], along(-0.2)[1] + lift[1], along(-0.2)[2] + lift[2]],
    [lift[0], along(0.15)[1] + lift[1], along(0.15)[2] + lift[2]],
    0.05,
    8,
  );
  builder.box("metal", palette.darkSteel, [0.05, 0.1, 0.05], [0, 0.0, 0]);
};

/** A curtain of light: a thin strip, rippled along its length. */
const addRibbon = (
  builder: AttractionBuilder,
  colour: string,
  {
    width,
    height,
    lift,
    ripple,
    phase,
  }: {
    width: number;
    height: number;
    lift: number;
    ripple: number;
    phase: number;
  },
) => {
  const geometry = new BoxGeometry(width, height, 0.05, 28, 1, 1);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const fold =
      Math.sin(x * 0.9 + phase) * ripple +
      Math.sin(x * 2.3 + phase * 2) * ripple * 0.25;
    const sag = Math.sin(x * 0.55 + phase) * 0.35;
    positions.setZ(index, positions.getZ(index) + fold);
    positions.setY(index, positions.getY(index) + sag + lift);
  }
  builder.add("glow", colour, geometry);
};

const buildAuroraNear = (builder: AttractionBuilder) => {
  addRibbon(builder, auroraGreen, {
    width: 7.5,
    height: 1.6,
    lift: 0,
    ripple: 0.7,
    phase: 0,
  });
  addRibbon(builder, shade(auroraGreen, 1.2), {
    width: 7.3,
    height: 0.18,
    lift: -0.85,
    ripple: 0.7,
    phase: 0,
  });
  addRibbon(builder, auroraViolet, {
    width: 7.2,
    height: 1.1,
    lift: 1.3,
    ripple: 0.72,
    phase: 0.05,
  });
};

const buildAuroraFar = (builder: AttractionBuilder) => {
  addRibbon(builder, auroraTeal, {
    width: 6,
    height: 1.3,
    lift: 0,
    ripple: 0.6,
    phase: 1.7,
  });
  addRibbon(builder, auroraPink, {
    width: 5.6,
    height: 0.9,
    lift: 1.05,
    ripple: 0.62,
    phase: 1.75,
  });
};

const buildLanternPost = (builder: AttractionBuilder) => {
  const { x, z } = lanternPost;
  builder.cylinder("paint", palette.black, {
    radius: 0.05,
    length: 2.3,
    at: [x, 1.15, z],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "paint",
    palette.black,
    [x, 2.2, z],
    [lanternAt[0] + 0.02, 2.2, z],
    0.035,
    6,
  );
  builder.bar(
    "paint",
    palette.black,
    [x, 1.95, z],
    [x + 0.25, 2.2, z],
    0.025,
    5,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [lanternAt[0], 2.2, z],
    [lanternAt[0], lanternAt[1] + 0.2, z],
    0.012,
    4,
  );
  builder.cylinder("paint", palette.black, {
    radius: 0.09,
    length: 0.3,
    at: [x, 0.15, z],
    segments: 10,
  });
};

/** A five-pointed glowing star lantern that lights as a visitor comes near. */
const buildStarLantern = (builder: AttractionBuilder) => {
  builder.sphere("glow", starGold, 0.1, [0, 0, 0], [1, 1, 0.6], 10);
  for (let point = 0; point < 5; point++) {
    const angle = (point / 5) * Math.PI * 2;
    builder.cylinder("glow", starGold, {
      radius: 0.07,
      radiusEnd: 0.005,
      length: 0.22,
      at: [Math.sin(angle) * 0.17, Math.cos(angle) * 0.17, 0],
      segments: 6,
    });
  }
  builder.sphere(
    "glow",
    shade(starGold, 1.1),
    0.24,
    [0, 0, 0],
    [1, 1, 0.25],
    10,
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", snowShadow, [1.6, 0.02, 2.6], [0, 0.01, 2.3]);
  addSnowyPine(builder, [-4.2, 0, -2.0], 1.15);
  addSnowyPine(builder, [4.3, 0, -1.2], 1.0);
  addSnowyPine(builder, [-3.9, 0, 2.4], 0.75);
  if (builder.isFar) {
    return;
  }
  [
    [-2.7, 1.2, 0.55],
    [2.9, 1.6, 0.5],
    [0.6, -3.6, 0.6],
    [-1.8, 4.1, 0.35],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
  /* Little lanterns marking the path to the steps */
  [-0.95, 0.95].forEach((x) => {
    [1.6, 2.9].forEach((z) => {
      builder.cylinder("matte", palette.darkStone, {
        radius: 0.06,
        length: 0.4,
        at: [x, 0.2, z],
        segments: 6,
      });
      builder.box("glow", palette.warmLight, [0.12, 0.12, 0.12], [x, 0.46, z]);
      builder.cylinder("matte", palette.darkStone, {
        radius: 0.11,
        radiusEnd: 0.01,
        length: 0.1,
        at: [x, 0.57, z],
        segments: 6,
      });
    });
  });
};

const deckSurface: Deck = ({ x, z }) => {
  if (x >= deck.minX && x <= deck.maxX && z >= deck.minZ && z <= deck.maxZ) {
    return { height: deck.height, kind: "bridge" };
  }
  if (Math.abs(x) <= stepHalfWidth) {
    const step = steps.find(({ minZ, maxZ }) => z > minZ && z <= maxZ);
    if (step !== undefined) {
      return { height: step.height, kind: "bridge" };
    }
  }
  return undefined;
};

export const auroraViewpointModel: CuriosityModel = {
  kind: "aurora-viewpoint",
  islandId: "frost-isle",
  name: "Aurora Viewpoint",
  fact: "The northern lights, or aurora, are ribbons of green and purple light that ripple across the night sky. They are seen best in cold places near the North and South Poles, in the long, dark winter nights. They happen when tiny bits blown from the Sun crash into the air high above the Earth and make it glow.",
  curriculumLink:
    "Geography, Key Stage 1: identify seasonal and daily weather patterns in the United Kingdom and the location of hot and cold areas of the world in relation to the Equator and the North and South Poles.",
  footprint: 5.5,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildDeck(builder);
    buildSeating(builder);
    buildTripod(builder);
    buildLanternPost(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "aurora",
      pivot: [0, 7.2, -3.6],
      build: buildAuroraNear,
      motion: { kind: "swing", axis: "y", amplitude: 0.14, period: 11 },
      look: "beam",
    },
    {
      name: "distant aurora",
      pivot: [0.8, 8.6, -4.6],
      build: buildAuroraFar,
      motion: {
        kind: "swing",
        axis: "z",
        amplitude: 0.06,
        period: 8,
        phase: 1.3,
      },
      look: "beam",
    },
    {
      name: "telescope",
      pivot: telescopeHead,
      build: buildTelescope,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.12, period: 4 },
    },
    {
      name: "star lantern",
      pivot: lanternAt,
      build: buildStarLantern,
      motion: { kind: "wake", reach: 7 },
    },
  ],
  decks: [deckSurface],
  blockers: [
    ...listWallBlockers(
      { x: deck.minX + 0.05, z: deck.minZ + 0.05 },
      { x: deck.maxX - 0.05, z: deck.minZ + 0.05 },
      0.15,
      0.3,
    ),
    ...[deck.minX + 0.05, deck.maxX - 0.05].flatMap((x) =>
      listWallBlockers(
        { x, z: deck.minZ + 0.05 },
        { x, z: deck.maxZ - 0.15 },
        0.15,
        0.3,
      ),
    ),
    { x: telescopeAt[0], z: telescopeAt[2], radius: 0.4 },
    { x: lanternPost.x, z: lanternPost.z, radius: 0.15 },
    { x: -4.2, z: -2.0, radius: 0.45 },
    { x: 4.3, z: -1.2, radius: 0.4 },
    { x: -3.9, z: 2.4, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Watch the northern lights",
    news: "Ooh! Green and purple ribbons of light rippled across the sky, and everyone on the deck whispered 'wow'.",
  },
};
