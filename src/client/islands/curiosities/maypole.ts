import { ConeGeometry, OctahedronGeometry } from "three";
import {
  addBush,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const poleWhite = "#f6f1e4";
const stripeRed = "#c8323a";
const garlandGreen = "#4f8f3a";
const ribbonColours = ["#d8344a", "#2f7fd0", "#f2c12e"];
const flowerColours = ["#f6f2e8", "#f2a6c4", "#f2d24a", "#b48ad8"];
const buntingColours = ["#d8344a", "#f2c12e", "#2f7fd0", "#4f9a3a", "#f6f2e8"];
const trodden = "#a7b86a";
const signColour = "#b8344a";

const poleHeight = 5.2;
const poleRadius = 0.11;
const crownHeight = 4.5;
const hoopRadius = 0.5;
const ribbonReach = 2.0;
const ribbonEndHeight = 1.15;
const danceSpeed = 0.55;
const postRing = 3.9;
const posts = 6;

/** Each ribbon colour circles as a pair, spread round the pole. */
const ribbonMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: ribbonReach,
  count: 2,
  speed: danceSpeed,
  isFacingAlong: true,
};

/*
 * A copy of an orbiting part faces along the circle, so the pole is
 * always at local (-reach, 0, 0). Turning by `offset` about the pole
 * spreads the pairs of ribbons round it.
 */
const aboutPole = (offset: number, out: number, height: number): Triple => [
  -ribbonReach + Math.cos(offset) * out,
  height,
  -Math.sin(offset) * out,
];

/** One ribbon from the crown to its end, with a bow and a fluttering tail. */
const buildRibbon =
  (colour: string, offset: number) => (builder: AttractionBuilder) => {
    const top = aboutPole(offset, hoopRadius, crownHeight - 0.1);
    const end = aboutPole(offset, ribbonReach, ribbonEndHeight);
    const middle = aboutPole(
      offset,
      ribbonReach * 0.62,
      ribbonEndHeight + 1.25,
    );
    builder.bar("paint", colour, top, middle, 0.05, 4);
    builder.bar("paint", colour, middle, end, 0.05, 4);
    /* A bow where a dancer holds it, and a tail streaming behind */
    [-1, 1].forEach((side) => {
      builder.add(
        "paint",
        shade(colour, 1.1),
        new OctahedronGeometry(1).scale(0.09, 0.06, 0.02),
        { at: [end[0] + side * 0.08, end[1], end[2]] },
      );
    });
    builder.sphere("paint", shade(colour, 0.8), 0.035, end, [1, 1, 1], 6);
    builder.bar(
      "paint",
      colour,
      end,
      [end[0] - 0.05, end[1] - 0.45, end[2] - 0.25],
      0.04,
      4,
    );
  };

/** The crown at the top: a flowery hoop with arches, turning round the pole. */
const buildCrown = (builder: AttractionBuilder) => {
  builder.torus("matte", garlandGreen, hoopRadius, 0.06, [0, 0, 0], "y", 28);
  /* Two arches crossing over the top */
  [0, Math.PI / 2].forEach((turn) => {
    for (let step = 0; step < 8; step++) {
      const from = (step / 8) * Math.PI;
      const to = ((step + 1) / 8) * Math.PI;
      const point = (angle: number): Triple => [
        Math.cos(angle) * hoopRadius * Math.cos(turn),
        Math.sin(angle) * 0.55,
        Math.cos(angle) * hoopRadius * Math.sin(turn),
      ];
      builder.bar(
        "matte",
        shade(garlandGreen, 1.1),
        point(from),
        point(to),
        0.07,
        5,
      );
    }
  });
  /* Flowers threaded all round the hoop and up the arches */
  for (let flower = 0; flower < 16; flower++) {
    const angle = (flower / 16) * Math.PI * 2;
    builder.sphere(
      "paint",
      flowerColours[flower % flowerColours.length],
      0.075,
      [Math.sin(angle) * hoopRadius, 0.04, Math.cos(angle) * hoopRadius],
      [1, 0.75, 1],
      7,
    );
  }
  [0.25, 0.6, 0.9].forEach((share, index) => {
    const angle = share * Math.PI;
    [0, Math.PI / 2].forEach((turn) => {
      builder.sphere(
        "paint",
        flowerColours[(index + 1) % flowerColours.length],
        0.06,
        [
          Math.cos(angle) * hoopRadius * Math.cos(turn),
          Math.sin(angle) * 0.55 + 0.04,
          Math.cos(angle) * hoopRadius * Math.sin(turn),
        ],
        [1, 1, 1],
        6,
      );
    });
  });
  /* Knots where each ribbon is tied on */
  for (let knot = 0; knot < 6; knot++) {
    const angle = (knot / 6) * Math.PI * 2;
    builder.sphere(
      "paint",
      ribbonColours[knot % ribbonColours.length],
      0.05,
      [Math.sin(angle) * hoopRadius, -0.08, Math.cos(angle) * hoopRadius],
      [1, 1, 1],
      6,
    );
  }
};

const buildPole = (builder: AttractionBuilder) => {
  builder.cylinder("paint", poleWhite, {
    radius: poleRadius,
    radiusEnd: poleRadius * 0.75,
    length: poleHeight,
    at: [0, poleHeight / 2, 0],
    segments: builder.isFar ? 8 : 14,
  });
  builder.sphere(
    "metal",
    palette.brass,
    0.16,
    [0, poleHeight + 0.1, 0],
    [1, 1, 1],
    builder.isFar ? 6 : 14,
  );
  /* A stone step round the foot, ringed with flower tubs */
  builder.cylinder("matte", palette.stone, {
    radius: 0.55,
    radiusEnd: 0.5,
    length: 0.2,
    at: [0, 0.1, 0],
    segments: builder.isFar ? 8 : 20,
  });
  if (builder.isFar) {
    builder.torus(
      "matte",
      garlandGreen,
      hoopRadius,
      0.08,
      [0, crownHeight, 0],
      "y",
      10,
    );
    return;
  }
  /* The red stripe spiralling up the pole */
  const turns = 7;
  const steps = turns * 7;
  const bottom = 0.25;
  const top = crownHeight - 0.2;
  const point = (step: number): Triple => {
    const share = step / steps;
    const angle = share * turns * Math.PI * 2;
    const height = bottom + (top - bottom) * share;
    const radius = poleRadius * (1 - 0.25 * (height / poleHeight)) + 0.005;
    return [Math.sin(angle) * radius, height, Math.cos(angle) * radius];
  };
  for (let step = 0; step < steps; step++) {
    builder.bar("paint", stripeRed, point(step), point(step + 1), 0.07, 4);
  }
  builder.torus(
    "metal",
    palette.brass,
    poleRadius * 0.9,
    0.025,
    [0, poleHeight - 0.05, 0],
    "y",
    14,
  );
  for (let tub = 0; tub < 5; tub++) {
    const angle = (tub / 5) * Math.PI * 2 + 0.3;
    const at: Triple = [Math.sin(angle) * 0.75, 0, Math.cos(angle) * 0.75];
    builder.cylinder("matte", palette.timber, {
      radius: 0.14,
      radiusEnd: 0.17,
      length: 0.22,
      at: [at[0], 0.11, at[2]],
      segments: 10,
    });
    builder.sphere(
      "matte",
      garlandGreen,
      0.14,
      [at[0], 0.26, at[2]],
      [1, 0.6, 1],
      7,
    );
    builder.sphere(
      "paint",
      flowerColours[tub % flowerColours.length],
      0.05,
      [at[0], 0.34, at[2]],
      [1, 0.7, 1],
      6,
    );
  }
};

/** Posts round the green, with bunting strung between them. */
const buildBunting = (builder: AttractionBuilder) => {
  const postHeight = 1.9;
  const spot = (index: number) => {
    const angle = (index / posts) * Math.PI * 2 + Math.PI / posts;
    return { x: Math.sin(angle) * postRing, z: Math.cos(angle) * postRing };
  };
  for (let index = 0; index < posts; index++) {
    const { x, z } = spot(index);
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.05,
      length: postHeight,
      at: [x, postHeight / 2, z],
      segments: builder.isFar ? 4 : 8,
    });
    if (builder.isFar) {
      continue;
    }
    builder.sphere(
      "paint",
      ribbonColours[index % 3],
      0.07,
      [x, postHeight + 0.04, z],
      [1, 1, 1],
      6,
    );
    /* The line sags between posts, with a flag every so often */
    const next = spot(index + 1);
    const links = 4;
    const sagAt = (share: number): Triple => [
      x + (next.x - x) * share,
      postHeight - 0.05 - Math.sin(share * Math.PI) * 0.3,
      z + (next.z - z) * share,
    ];
    for (let link = 0; link < links; link++) {
      builder.bar(
        "matte",
        palette.cream,
        sagAt(link / links),
        sagAt((link + 1) / links),
        0.015,
        3,
      );
    }
    const along = Math.atan2(next.x - x, next.z - z);
    for (let flag = 1; flag < 9; flag++) {
      const [fx, fy, fz] = sagAt(flag / 9);
      builder.add(
        "paint",
        buntingColours[(flag + index) % buntingColours.length],
        new ConeGeometry(0.11, 0.24, 3)
          .rotateX(Math.PI)
          .scale(1, 1, 0.12)
          .rotateY(along + Math.PI / 2),
        { at: [fx, fy - 0.13, fz] },
      );
    }
  }
};

const buildGreen = (builder: AttractionBuilder) => {
  /* The ring of grass worn by dancing feet, and a path in */
  builder.torus(
    "matte",
    trodden,
    ribbonReach + 0.2,
    0.35,
    [0, -0.3, 0],
    "y",
    builder.isFar ? 12 : 40,
  );
  builder.box("matte", palette.path, [0.9, 0.03, 1.6], [-0.3, 0.015, 3.5]);
  if (builder.isFar) {
    return;
  }
  /* A basket of garlands and a fiddler's stool with its fiddle */
  const basket: Triple = [-3.0, 0, 0.6];
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.3,
    radiusEnd: 0.24,
    length: 0.24,
    at: [basket[0], 0.12, basket[2]],
    segments: 14,
  });
  builder.torus(
    "matte",
    palette.timber,
    0.27,
    0.02,
    [basket[0], 0.25, basket[2]],
    "x",
    14,
  );
  [0, 1, 2].forEach((garland) => {
    builder.torus(
      "matte",
      garlandGreen,
      0.15,
      0.03,
      [basket[0] - 0.08 + garland * 0.08, 0.27 + garland * 0.03, basket[2]],
      "y",
      12,
    );
    builder.sphere(
      "paint",
      flowerColours[garland],
      0.04,
      [basket[0] + garland * 0.08, 0.32, basket[2] + 0.12],
      [1, 1, 1],
      5,
    );
  });
  const stool: Triple = [3.0, 0, -0.9];
  builder.cylinder("matte", palette.timber, {
    radius: 0.24,
    length: 0.06,
    at: [stool[0], 0.45, stool[2]],
    segments: 14,
  });
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "matte",
      palette.darkTimber,
      [
        stool[0] + Math.sin(angle) * 0.14,
        0.43,
        stool[2] + Math.cos(angle) * 0.14,
      ],
      [stool[0] + Math.sin(angle) * 0.22, 0, stool[2] + Math.cos(angle) * 0.22],
      0.04,
      4,
    );
  });
  builder.sphere(
    "paint",
    "#8a3f1e",
    0.11,
    [stool[0], 0.52, stool[2]],
    [1.3, 0.35, 0.8],
    10,
  );
  builder.box(
    "paint",
    palette.black,
    [0.36, 0.02, 0.04],
    [stool[0] + 0.25, 0.53, stool[2]],
  );
  /* Bushes and wild flowers round the edge */
  addBush(builder, [-3.4, 0, -1.6], 0.5);
  addBush(builder, [3.3, 0, 1.4], 0.45, "#3d7a34");
  for (let flower = 0; flower < 10; flower++) {
    const angle = flower * 0.63 + 0.2;
    const radius = 3.0 + (flower % 3) * 0.25;
    builder.sphere(
      "paint",
      flowerColours[flower % flowerColours.length],
      0.05,
      [Math.sin(angle) * radius, 0.06, Math.cos(angle) * radius - 0.5],
      [1, 0.5, 1],
      5,
    );
  }
};

/* The dance: join on, skip round the pole holding the first red ribbon, and step off */
const danceStart = { x: -0.6, z: 2.7 };
const danceFinish = { x: 0.8, z: 2.4 };

const danceRide = (progress: number, seconds: number): LocalSpot => {
  const angle = seconds * danceSpeed;
  const out = ribbonReach + 0.25;
  const hop = Math.abs(Math.sin(seconds * Math.PI * 2.2)) * 0.18;
  const onRibbon = {
    x: Math.cos(angle) * out,
    y: hop,
    z: -Math.sin(angle) * out,
    heading: Math.atan2(-Math.sin(angle), -Math.cos(angle)),
  };
  const joining = Math.min(1, progress * 8);
  const leaving = Math.min(1, (1 - progress) * 8);
  const from = progress < 0.5 ? danceStart : danceFinish;
  const share = progress < 0.5 ? joining : leaving;
  return {
    x: from.x + (onRibbon.x - from.x) * share,
    y: onRibbon.y * share,
    z: from.z + (onRibbon.z - from.z) * share,
    heading: onRibbon.heading,
  };
};

export const maypoleModel: CuriosityModel = {
  kind: "maypole",
  islandId: "meadow-isle",
  name: "Maypole",
  fact: "For hundreds of years, villages in England have danced round a maypole on May Day, the first day of May, to welcome the summer. Each dancer holds a long ribbon. As they skip in and out round each other, the ribbons weave a pretty pattern down the pole. A May Queen is often crowned with flowers.",
  curriculumLink:
    "History, Key Stage 1: events beyond living memory that are significant nationally, such as May Day celebrations, and how people lived long ago.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 1.0, z: 3.2 },
  build: (builder) => {
    buildGreen(builder);
    buildPole(builder);
    buildBunting(builder);
    if (builder.isFar) {
      ribbonColours.forEach((colour, index) => {
        const angle = (index / ribbonColours.length) * Math.PI * 2;
        builder.bar(
          "paint",
          colour,
          [
            Math.cos(angle) * hoopRadius,
            crownHeight,
            Math.sin(angle) * hoopRadius,
          ],
          [
            Math.cos(angle) * ribbonReach,
            ribbonEndHeight,
            Math.sin(angle) * ribbonReach,
          ],
          0.06,
          3,
        );
      });
    }
    addSignBoard(builder, [1.0, 0, 3.2], signColour);
  },
  moving: [
    {
      name: "crown",
      pivot: [0, crownHeight, 0],
      build: buildCrown,
      motion: { kind: "whirl", axis: "y", idle: 0.25, speed: 1.4, reach: 8 },
    },
    ...ribbonColours.map((colour, index) => ({
      name: `ribbons ${String(index + 1)}`,
      pivot: [0, 0, 0] satisfies Triple,
      build: buildRibbon(colour, (index / ribbonColours.length) * Math.PI),
      motion: ribbonMotion,
    })),
  ],
  blockers: [{ x: 0, z: 0, radius: 0.6 }] satisfies LocalBlocker[],
  rides: [
    {
      id: "maypole-dance",
      name: "the maypole dance",
      start: danceStart,
      reach: 0.6,
      seconds: 12,
      finish: danceFinish,
      follow: danceRide,
    },
  ],
  tune: [67, 72, 72, 74, 76, 74, 72, 71, 69, 71, 72, 67],
  play: {
    label: "Dance round the maypole",
    news: "Skip, hop, twirl! Round and round you danced with the ribbons, weaving red, blue and yellow down the pole.",
    tune: [72, 76, 79, 76, 74, 77, 76, 72],
  },
};
