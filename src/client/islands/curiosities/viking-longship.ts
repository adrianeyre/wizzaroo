import { BufferGeometry, Float32BufferAttribute } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ashGround = "#5b4a42";
const hullOak = "#8a5a35";
const hullInside = "#6b452a";
const strakeLine = "#5a3a22";
const deckPlank = "#a07650";
const prowRed = "#b8332a";
const prowGold = "#e3b341";
const sailRed = "#b8332a";
const sailWhite = "#f1e6cc";
const mastTimber = "#6b4a2f";
const ropeColour = "#c9a86a";
const logBark = "#6a4a30";
const logEnd = "#c49a64";
const signColour = "#7a3b22";

/* The ship lies along local x, its dragon prow pointing to +x */
const halfLength = 3.0;
const deckHeight = 0.9;
const mastAt: Triple = [-0.2, deckHeight, 0];
const yardHeight = 4.2;
const sailDrop = 2.3;
const sailWidth = 2.6;
const ramp = { minX: 0.7, maxX: 1.4, foot: 2.75, top: 0.78, topHeight: 1.12 };
const prowHead: Triple = [halfLength + 0.45, 2.75, 0];
const vaneAt: Triple = [mastAt[0], yardHeight + 0.55, 0];

const findHullWidth = (along: number): number =>
  0.82 * Math.pow(Math.max(0, 1 - along * along), 0.55) + 0.02;
const findKeelHeight = (along: number): number => 0.36 + 0.22 * along * along;
const findGunwaleHeight = (along: number): number =>
  1.1 + 0.5 * along * along * along * along;

/** A point on the hull's skin: `along` -1..1 bow to stern, `round` -π/2..π/2 port to starboard. */
const findHullPoint = (along: number, round: number, inset: number): Triple => {
  const keel = findKeelHeight(along) + inset;
  const gunwale = findGunwaleHeight(along);
  return [
    along * halfLength,
    keel + (gunwale - keel) * (1 - Math.cos(round)),
    Math.max(0.005, findHullWidth(along) - inset) * Math.sin(round),
  ];
};

/** The hull's skin as a grid of rings, outside (or inside, facing in). */
const makeHullGeometry = (
  stations: number,
  around: number,
  inset: number,
  isInside: boolean,
): BufferGeometry => {
  const positions: number[] = [];
  for (let station = 0; station <= stations; station++) {
    const along = -1 + (2 * station) / stations;
    for (let point = 0; point <= around; point++) {
      const round = -Math.PI / 2 + (Math.PI * point) / around;
      positions.push(...findHullPoint(along, round, inset));
    }
  }
  const indices: number[] = [];
  const row = around + 1;
  for (let station = 0; station < stations; station++) {
    for (let point = 0; point < around; point++) {
      const here = station * row + point;
      const ahead = here + row;
      if (isInside) {
        indices.push(here, ahead + 1, ahead, here, here + 1, ahead + 1);
      } else {
        indices.push(here, ahead, ahead + 1, here, ahead + 1, here + 1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
};

const buildHull = (builder: AttractionBuilder) => {
  const stations = builder.isFar ? 7 : 18;
  const around = builder.isFar ? 6 : 12;
  builder.add("matte", hullOak, makeHullGeometry(stations, around, 0, false));
  builder.add(
    "matte",
    hullInside,
    makeHullGeometry(stations, around, 0.06, true),
  );
  /* The deck, plank by plank along the hull, where it is wide enough */
  const deckStations = builder.isFar ? 4 : 10;
  for (let step = 0; step < deckStations; step++) {
    const along = -0.82 + (1.64 * (step + 0.5)) / deckStations;
    const keel = findKeelHeight(along) + 0.06;
    const share = Math.min(
      1,
      (deckHeight - keel) / (findGunwaleHeight(along) - keel),
    );
    const halfWidth =
      (findHullWidth(along) - 0.06) * Math.sin(Math.acos(1 - share)) - 0.02;
    builder.box(
      "matte",
      step % 2 === 0 ? deckPlank : shade(deckPlank, 0.92),
      [(1.64 * halfLength) / deckStations + 0.01, 0.05, halfWidth * 2],
      [along * halfLength, deckHeight - 0.025, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Clinker strakes: overlapping planks, each edge a line along the hull */
  [0.45, 0.8, 1.15, 1.48].forEach((round) => {
    [-1, 1].forEach((side) => {
      for (let step = 0; step < 9; step++) {
        const from = -0.97 + (1.94 * step) / 9;
        const to = -0.97 + (1.94 * (step + 1)) / 9;
        const start = findHullPoint(from, side * round, -0.015);
        const end = findHullPoint(to, side * round, -0.015);
        builder.bar(
          "matte",
          round > 1.4 ? shade(strakeLine, 0.8) : strakeLine,
          start,
          end,
          round > 1.4 ? 0.07 : 0.035,
          4,
        );
      }
    });
  });
  /* The keel along the bottom */
  for (let step = 0; step < 6; step++) {
    const from = -1 + step / 3;
    const to = -1 + (step + 1) / 3;
    builder.bar(
      "matte",
      strakeLine,
      findHullPoint(from, 0, -0.04),
      findHullPoint(to, 0, -0.04),
      0.1,
      4,
    );
  }
  /* Cross beams and rowing benches */
  [-1.9, -1.1, 0.5, 1.3, 2.0].forEach((x) => {
    const along = x / halfLength;
    builder.box(
      "matte",
      mastTimber,
      [0.14, 0.08, (findHullWidth(along) - 0.12) * 2],
      [x, findGunwaleHeight(along) - 0.18, 0],
    );
  });
};

/** A round shield, facing out along local +z (or -z). */
const addShield = (
  builder: AttractionBuilder,
  at: Triple,
  side: number,
  colours: readonly [string, string],
) => {
  builder.cylinder("paint", colours[0], {
    radius: 0.24,
    length: 0.03,
    at,
    axis: "z",
    segments: 16,
  });
  /* Two quarters in the second colour, as a painted cross */
  builder.box("paint", colours[1], [0.07, 0.46, 0.035], at);
  builder.box("paint", colours[1], [0.46, 0.07, 0.035], at);
  builder.sphere(
    "metal",
    palette.steel,
    0.06,
    [at[0], at[1], at[2] + side * 0.02],
    [1, 1, 0.6],
    6,
  );
};

const shieldColours: readonly (readonly [string, string])[] = [
  [prowRed, prowGold],
  ["#2f5d8a", sailWhite],
  [prowGold, prowRed],
  ["#2f6b4a", sailWhite],
];

const buildShieldsAndOars = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    for (let shield = 0; shield < 7; shield++) {
      const x = -2.1 + shield * 0.7;
      if (side > 0 && x > ramp.minX - 0.2 && x < ramp.maxX + 0.2) {
        continue;
      }
      const along = x / halfLength;
      const at: Triple = [
        x,
        findGunwaleHeight(along) - 0.12,
        side * (findHullWidth(along) + 0.02),
      ];
      addShield(
        builder,
        at,
        side,
        shieldColours[(shield + (side > 0 ? 0 : 2)) % 4],
      );
    }
    /* Oars run out through the oar holes, their blades resting on the ground */
    [-1.75, -1.05, 0.35, 2.05].forEach((x) => {
      const along = x / halfLength;
      const hole: Triple = [
        x,
        findGunwaleHeight(along) - 0.32,
        side * (findHullWidth(along) - 0.01),
      ];
      builder.cylinder("matte", palette.black, {
        radius: 0.05,
        length: 0.02,
        at: [hole[0], hole[1], hole[2] + side * 0.02],
        axis: "z",
        segments: 8,
      });
      const blade: Triple = [x - 0.3, 0.06, side * 2.1];
      builder.bar("matte", palette.paleTimber, hole, blade, 0.05, 5);
      builder.box(
        "matte",
        shade(palette.paleTimber, 0.9),
        [0.18, 0.03, 0.45],
        [blade[0], 0.03, blade[2] - side * 0.1],
        [0, 0.14, 0],
      );
    });
  });
};

const buildProwAndStern = (builder: AttractionBuilder) => {
  /* The stem post rising and curling up to the dragon's neck */
  const stem: Triple[] = [
    findHullPoint(1, 0, 0),
    [halfLength + 0.05, 1.75, 0],
    [halfLength + 0.22, 2.15, 0],
    [halfLength + 0.3, 2.5, 0],
    [prowHead[0] - 0.08, prowHead[1] - 0.05, 0],
  ];
  const sternPost: Triple[] = [
    findHullPoint(-1, 0, 0),
    [-halfLength - 0.08, 1.8, 0],
    [-halfLength - 0.28, 2.2, 0],
    [-halfLength - 0.3, 2.55, 0],
    [-halfLength - 0.12, 2.75, 0],
    [-halfLength + 0.05, 2.62, 0],
  ];
  [stem, sternPost].forEach((post) => {
    for (let index = 0; index < post.length - 1; index++) {
      builder.bar(
        "matte",
        index % 2 === 0 ? hullOak : shade(hullOak, 0.9),
        post[index],
        post[index + 1],
        0.2 - index * 0.02,
        builder.isFar ? 4 : 8,
      );
    }
  });
  const [x, y] = prowHead;
  builder.sphere(
    "paint",
    prowRed,
    0.22,
    [x, y, 0],
    [1.2, 0.9, 0.8],
    builder.isFar ? 6 : 14,
  );
  if (builder.isFar) {
    return;
  }
  /* The dragon's snout and open jaw, with gold teeth and gold scales */
  builder.sphere(
    "paint",
    prowRed,
    0.15,
    [x + 0.25, y + 0.02, 0],
    [1.4, 0.7, 0.75],
    12,
  );
  builder.box(
    "paint",
    shade(prowRed, 0.8),
    [0.36, 0.06, 0.16],
    [x + 0.26, y - 0.14, 0],
    [0, 0, -0.3],
  );
  for (let tooth = 0; tooth < 4; tooth++) {
    builder.cylinder("paint", sailWhite, {
      radius: 0.02,
      radiusEnd: 0.0,
      length: 0.06,
      at: [
        x + 0.18 + tooth * 0.07,
        y - 0.08,
        (tooth % 2 === 0 ? 1 : -1) * 0.06,
      ],
      segments: 4,
    });
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      prowGold,
      0.05,
      [x + 0.08, y + 0.1, side * 0.13],
      [1, 1, 0.6],
      8,
    );
    builder.bar(
      "paint",
      prowGold,
      [x - 0.08, y + 0.12, side * 0.08],
      [x - 0.32, y + 0.36, side * 0.14],
      0.05,
      5,
    );
    builder.sphere(
      "matte",
      palette.black,
      0.02,
      [x + 0.48, y + 0.06, side * 0.05],
      [1, 1, 1],
      4,
    );
  });
  /* A gold mane down the back of the neck, and gold bands on the stem */
  for (let spike = 0; spike < 5; spike++) {
    const point = stem[4 - Math.min(3, spike)];
    builder.cylinder("paint", prowGold, {
      radius: 0.06,
      radiusEnd: 0.0,
      length: 0.18,
      at: [point[0] - 0.14, point[1] + 0.02, 0],
      axis: "x",
      segments: 5,
    });
  }
  [stem[1], stem[2], sternPost[2], sternPost[3]].forEach((point) => {
    builder.torus("paint", prowGold, 0.1, 0.025, point, "y", 10);
  });
  /* The steering oar at the back, on the right-hand side: the "steer-board" */
  builder.bar(
    "matte",
    mastTimber,
    [-halfLength + 0.45, findGunwaleHeight(-0.85) + 0.3, 0.75],
    [-halfLength + 0.35, 0.25, 0.95],
    0.09,
    6,
  );
  builder.box(
    "matte",
    mastTimber,
    [0.5, 0.7, 0.05],
    [-halfLength + 0.3, 0.45, 0.97],
    [0, 0, 0.1],
  );
};

const buildMast = (builder: AttractionBuilder) => {
  const [x, , z] = mastAt;
  builder.cylinder("matte", mastTimber, {
    radius: 0.09,
    radiusEnd: 0.07,
    length: yardHeight + 0.45 - deckHeight,
    at: [x, (yardHeight + 0.45 + deckHeight) / 2, z],
    segments: builder.isFar ? 5 : 10,
  });
  builder.cylinder("matte", mastTimber, {
    radius: 0.06,
    length: sailWidth + 0.4,
    at: [x, yardHeight, z],
    axis: "z",
    segments: builder.isFar ? 4 : 8,
  });
  if (builder.isFar) {
    builder.box(
      "matte",
      sailRed,
      [0.05, sailDrop, sailWidth],
      [x + 0.1, yardHeight - sailDrop / 2, z],
    );
    return;
  }
  /* Stays from the masthead to the bow and stern */
  builder.bar(
    "matte",
    ropeColour,
    [x, yardHeight + 0.35, 0],
    [halfLength - 0.2, findGunwaleHeight(0.93), 0],
    0.025,
    4,
  );
  builder.bar(
    "matte",
    ropeColour,
    [x, yardHeight + 0.35, 0],
    [-halfLength + 0.2, findGunwaleHeight(-0.93), 0],
    0.025,
    4,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      ropeColour,
      [x, yardHeight + 0.3, 0],
      [x - 0.3, findGunwaleHeight(0) - 0.05, side * 0.8],
      0.02,
      4,
    );
  });
  /* The mast step block on the deck */
  builder.box(
    "matte",
    shade(mastTimber, 0.8),
    [0.45, 0.14, 0.3],
    [x, deckHeight + 0.07, z],
  );
};

/** The square sail, striped red and white, bellying out in the wind. */
const buildSail = (builder: AttractionBuilder) => {
  const strips = 6;
  const rows = 4;
  for (let strip = 0; strip < strips; strip++) {
    const z = -sailWidth / 2 + (sailWidth * (strip + 0.5)) / strips;
    for (let row = 0; row < rows; row++) {
      const down = (sailDrop * (row + 0.5)) / rows;
      const belly =
        0.42 *
        Math.sin((Math.PI * down) / sailDrop) *
        Math.cos((z / sailWidth) * Math.PI * 0.9);
      builder.box(
        "matte",
        strip % 2 === 0 ? sailRed : sailWhite,
        [0.04, sailDrop / rows + 0.02, sailWidth / strips + 0.005],
        [0.1 + belly, -down, z],
        [
          0,
          0,
          (row < rows / 2 ? 1 : -1) *
            0.12 *
            Math.cos((z / sailWidth) * Math.PI),
        ],
      );
    }
  }
  /* The boltrope along the foot, and sheets tied to its corners */
  builder.bar(
    "matte",
    ropeColour,
    [0.12, -sailDrop, -sailWidth / 2],
    [0.12, -sailDrop, sailWidth / 2],
    0.04,
    4,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      ropeColour,
      [0.12, -sailDrop, side * (sailWidth / 2)],
      [0.5, -sailDrop - 0.9, side * 0.75],
      0.02,
      4,
    );
  });
};

/** A gilded weather vane on the masthead, as Viking ships carried. */
const buildVane = (builder: AttractionBuilder) => {
  builder.box("metal", prowGold, [0.5, 0.3, 0.02], [0.28, 0, 0]);
  builder.box("metal", prowGold, [0.04, 0.42, 0.04], [0, 0, 0]);
  for (let tassel = 0; tassel < 4; tassel++) {
    builder.box(
      "metal",
      shade(prowGold, 0.85),
      [0.03, 0.12, 0.02],
      [0.12 + tassel * 0.11, -0.2, 0],
    );
  }
  builder.sphere("metal", prowGold, 0.04, [0, 0.23, 0], [1, 1, 1], 6);
};

/** The dragon's gold eyes, which gleam as the Character comes near. */
const buildProwEyes = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glow",
      "#ffe066",
      0.055,
      [0, 0, side * 0.135],
      [1, 1, 0.5],
      8,
    );
  });
};

const buildSlipway = (builder: AttractionBuilder) => {
  /* Log rollers under the keel, each touching it */
  [-1.4, -0.2, 1.0, 2.1].forEach((x) => {
    const radius = findKeelHeight(x / halfLength) / 2 - 0.02;
    builder.cylinder("matte", logBark, {
      radius,
      length: 1.7,
      at: [x, radius, 0],
      axis: "z",
      segments: builder.isFar ? 6 : 14,
    });
    if (builder.isFar) {
      return;
    }
    [-1, 1].forEach((side) => {
      builder.cylinder("matte", logEnd, {
        radius: radius - 0.02,
        length: 0.02,
        at: [x, radius, side * 0.855],
        axis: "z",
        segments: 12,
      });
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Forked props on each side to keep the hull upright */
  [-2.2, -0.9, 2.3].forEach((x) => {
    [-1, 1].forEach((side) => {
      const along = x / halfLength;
      const touch = findHullPoint(along, side * 0.9, -0.03);
      builder.bar("matte", mastTimber, [x, 0, side * 1.25], touch, 0.09, 5);
    });
  });
  /* The gangplank up to the deck, with cleats for grip */
  const run = ramp.foot - ramp.top;
  const rise = ramp.topHeight - 0.04;
  const tilt = Math.atan2(rise, run);
  const middleX = (ramp.minX + ramp.maxX) / 2;
  builder.box(
    "matte",
    deckPlank,
    [ramp.maxX - ramp.minX, 0.06, Math.hypot(run, rise)],
    [middleX, (rise + 0.04) / 2, (ramp.foot + ramp.top) / 2],
    [tilt, 0, 0],
  );
  for (let cleat = 1; cleat < 7; cleat++) {
    const share = cleat / 7;
    builder.box(
      "matte",
      strakeLine,
      [ramp.maxX - ramp.minX - 0.06, 0.04, 0.05],
      [middleX, 0.07 + rise * share, ramp.foot - run * share],
    );
  }
  /* Ship's gear on the shore: a chest, a barrel, a coil of rope and an anchor */
  builder.box(
    "matte",
    mastTimber,
    [0.7, 0.4, 0.42],
    [-2.5, 0.2, 1.9],
    [0, 0.3, 0],
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.74, 0.05, 0.46],
    [-2.5, 0.37, 1.9],
    [0, 0.3, 0],
  );
  builder.cylinder("matte", palette.timber, {
    radius: 0.24,
    radiusEnd: 0.21,
    length: 0.6,
    at: [-1.75, 0.3, 2.25],
    segments: 14,
  });
  [0.12, 0.48].forEach((height) => {
    builder.torus(
      "metal",
      palette.darkSteel,
      0.235,
      0.015,
      [-1.75, height, 2.25],
      "y",
      14,
    );
  });
  [0, 1, 2].forEach((turn) => {
    builder.torus(
      "matte",
      ropeColour,
      0.24 - turn * 0.02,
      0.035,
      [2.6, 0.04 + turn * 0.06, 1.7],
      "y",
      14,
    );
  });
  builder.bar(
    "metal",
    palette.darkSteel,
    [3.3, 0.05, 1.0],
    [3.3, 0.05, 2.0],
    0.08,
    6,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [3.3, 0.05, 2.0],
    [3.0, 0.05, 2.25],
    0.07,
    6,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [3.3, 0.05, 2.0],
    [3.6, 0.05, 2.25],
    0.07,
    6,
  );
};

const deckHalfWidth = (x: number): number => {
  const along = x / halfLength;
  const keel = findKeelHeight(along) + 0.06;
  const share = Math.min(
    1,
    (deckHeight - keel) / (findGunwaleHeight(along) - keel),
  );
  return (findHullWidth(along) - 0.06) * Math.sin(Math.acos(1 - share)) - 0.1;
};

const shipDeck: Deck = ({ x, z }) => {
  if (Math.abs(x) < halfLength * 0.82 && Math.abs(z) < deckHalfWidth(x)) {
    return { height: deckHeight, kind: "bridge" };
  }
  if (x >= ramp.minX && x <= ramp.maxX && z >= ramp.top && z <= ramp.foot) {
    const share = (ramp.foot - z) / (ramp.foot - ramp.top);
    return { height: 0.04 + (ramp.topHeight - 0.04) * share, kind: "bridge" };
  }
  return undefined;
};

export const vikingLongshipModel: CuriosityModel = {
  kind: "viking-longship",
  islandId: "ember-isle",
  name: "Viking Longship",
  fact: "Vikings sailed from Scandinavia to raid and settle in Britain in longships like this one, starting with a raid on Lindisfarne in 793. Longships were long, narrow and light, with a big square sail and oars for rowing, so they could cross the sea and sail up shallow rivers. Shields were hung along the sides, and a carved dragon often scared enemies from the prow.",
  curriculumLink:
    "History, Key Stage 2: the Viking and Anglo-Saxon struggle for the Kingdom of England to the time of Edward the Confessor.",
  footprint: 5,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: -2.0, z: 3.5 },
  build: (builder) => {
    buildHull(builder);
    buildShieldsAndOars(builder);
    buildProwAndStern(builder);
    buildMast(builder);
    buildSlipway(builder);
    addSignBoard(builder, [-2.0, 0, 3.5], signColour);
  },
  moving: [
    {
      name: "sail",
      pivot: [mastAt[0], yardHeight - 0.05, 0],
      build: buildSail,
      motion: { kind: "nod", axis: "z", reach: 8, amplitude: 0.2, period: 2.6 },
    },
    {
      name: "weather vane",
      pivot: vaneAt,
      build: buildVane,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 2.4, reach: 8 },
    },
    {
      name: "dragon eyes",
      pivot: [prowHead[0] + 0.08, prowHead[1] + 0.1, 0],
      build: buildProwEyes,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  decks: [shipDeck],
  blockers: [
    { x: halfLength, z: 0, radius: 0.35 },
    { x: -halfLength, z: 0, radius: 0.35 },
    { x: halfLength + 0.4, z: 0, radius: 0.3 },
    { x: -halfLength - 0.25, z: 0, radius: 0.3 },
    { x: mastAt[0], z: mastAt[2], radius: 0.15 },
    { x: -2.5, z: 1.9, radius: 0.42 },
    { x: -1.75, z: 2.25, radius: 0.28 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Raise the sail",
    news: "Heave! Up went the striped sail, it filled with wind with a great WHUMP, and the dragon prow seemed to grin at the sea.",
  },
};
