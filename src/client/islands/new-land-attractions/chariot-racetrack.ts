import { ConeGeometry, CylinderGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addArcLathe,
  addLump,
  addPalm,
  addPerson,
  addPot,
  addSheet,
  addTaperedBar,
  followMovingSeat,
  placeBy,
  sands,
  type Palm,
} from "./date-palm-grove-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const raked = "#ead3a0";
const trackEdge = "#cfae74";
const royalRed = "#b8352a";
const royalBlue = sands.lapis;
const horseBay = "#7a4a2a";
const horseGrey = "#d8d0c4";
const signColour = royalBlue;

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const centre = { x: 0, z: -0.5 };
const lane = 5.0;
const trackInner = 4.1;
const trackOuter = 5.9;
const islandWall = 3.55;
const islandGap = 0.8;
const standFrom = 6.5;
const standDepth = 0.72;
const standTiers = 3;
const standRise = 0.3;
const standArc = 0.85;
const pylonZ = 7.3;
const gateHalf = 0.9;

const at = (x: number, y: number, z: number): Triple => [
  centre.x + x,
  y,
  centre.z + z,
];

/* ------------------------------------------------------------------ */
/* The track and the island in the middle                              */
/* ------------------------------------------------------------------ */

const buildTrack = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    raked,
    [
      [trackOuter + 0.25, 0.012],
      [trackOuter, 0.025],
      [trackInner, 0.025],
      [trackInner - 0.15, 0.012],
    ],
    at(0, 0, 0),
    "y",
    48,
  );
  if (builder.isFar) {
    return;
  }
  /* Wheel ruts round the lane, and white lines at the start. */
  [lane - 0.45, lane + 0.45].forEach((radius) => {
    builder.lathe(
      "matte",
      trackEdge,
      [
        [radius + 0.08, 0.03],
        [radius - 0.08, 0.03],
      ],
      at(0, 0, 0),
      "y",
      48,
    );
  });
  builder.box(
    "paint",
    palette.white,
    [trackOuter - trackInner, 0.01, 0.12],
    at(lane, 0.035, 0),
  );
  builder.box(
    "paint",
    palette.white,
    [trackOuter - trackInner, 0.01, 0.12],
    at(lane, 0.035, 0.3),
  );
};

const buildIsland = (builder: AttractionBuilder) => {
  /* A low wall round the island, open at the front. */
  const gap = Math.asin(islandGap / islandWall);
  addArcLathe(
    builder,
    "matte",
    sands.paleStone,
    [
      [islandWall + 0.2, 0],
      [islandWall + 0.2, 0.55],
      [islandWall + 0.25, 0.6],
      [islandWall - 0.25, 0.6],
      [islandWall - 0.2, 0.55],
      [islandWall - 0.2, 0],
    ],
    at(0, 0, 0),
    40,
    gap,
    Math.PI * 2 - gap * 2,
  );
  if (!builder.isFar) {
    addArcLathe(
      builder,
      "paint",
      royalBlue,
      [
        [islandWall + 0.205, 0.42],
        [islandWall + 0.205, 0.5],
      ],
      at(0, 0, 0),
      40,
      gap,
      Math.PI * 2 - gap * 2,
    );
  }
  builder.cylinder("matte", shade(sands.sand, 0.96), {
    radius: islandWall - 0.2,
    length: 0.03,
    at: at(0, 0.015, 0),
    segments: 32,
  });
  /* The obelisk, tipped with gold to catch the sun. */
  builder.box("matte", sands.paleStone, [1.2, 0.3, 1.2], at(0, 0.15, -0.6));
  builder.add(
    "matte",
    sands.paleStone,
    new CylinderGeometry(0.28, 0.42, 4.2, 4, 1),
    { at: at(0, 2.4, -0.6), rotation: [0, Math.PI / 4, 0] },
  );
  builder.add("paint", sands.gold, new ConeGeometry(0.28, 0.45, 4), {
    at: at(0, 4.72, -0.6),
    rotation: [0, Math.PI / 4, 0],
  });
  if (!builder.isFar) {
    /* Hieroglyphs carved down its face. */
    for (let glyph = 0; glyph < 7; glyph++) {
      builder.box(
        "matte",
        glyph % 3 === 0 ? sands.darkStone : shade(sands.darkStone, 1.15),
        [glyph % 2 === 0 ? 0.16 : 0.1, 0.14, 0.02],
        at(0, 0.9 + glyph * 0.45, -0.6 + 0.4 - glyph * 0.016),
      );
    }
  }
  /* Turning posts at each end of the island, three cones on a plinth. */
  [1, -1].forEach((side) => {
    const z = side * 2.5;
    builder.box("matte", sands.sandstone, [1.1, 0.4, 0.5], at(0, 0.2, z));
    [-0.35, 0, 0.35].forEach((x) => {
      builder.add(
        "paint",
        side === 1 ? royalRed : sands.gold,
        new ConeGeometry(0.15, 1.15, builder.segments(10, 6)),
        { at: at(x, 0.97, z) },
      );
      if (!builder.isFar) {
        builder.sphere("paint", sands.gold, 0.07, at(x, 1.6, z), [1, 1, 1], 8);
      }
    });
  });
  /* A sphinx keeping watch on each side. */
  [-1, 1].forEach((side) => {
    addSphinx(builder, at(side * 1.9, 0, 0.6), side * -0.5);
  });
};

const addSphinx = (builder: AttractionBuilder, base: Triple, turn: number) => {
  const place = placeBy(base, turn);
  const rotation: Triple = [0, turn, 0];
  builder.box(
    "matte",
    sands.sandstone,
    [0.75, 0.3, 1.5],
    place(0, 0.15, 0),
    rotation,
  );
  builder.sphere(
    "matte",
    sands.paleStone,
    0.32,
    place(0, 0.5, -0.15),
    [0.85, 0.65, 1.7],
    builder.segments(12, 6),
  );
  builder.box(
    "matte",
    sands.paleStone,
    [0.5, 0.75, 0.42],
    place(0, 0.68, 0.3),
    rotation,
  );
  builder.sphere(
    "matte",
    sands.paleStone,
    0.17,
    place(0, 1.2, 0.36),
    [1, 1.1, 1],
    builder.segments(12, 6),
  );
  if (builder.isFar) {
    return;
  }
  /* Its striped headcloth and its great paws. */
  builder.add(
    "paint",
    sands.gold,
    new CylinderGeometry(0.16, 0.27, 0.5, 4, 1),
    {
      at: place(0, 1.1, 0.3),
      rotation: [0, turn + Math.PI / 4, 0],
    },
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      royalBlue,
      [0.06, 0.3, 0.1],
      place(side * 0.17, 0.98, 0.42),
      rotation,
    );
    builder.box(
      "matte",
      sands.paleStone,
      [0.14, 0.12, 0.5],
      place(side * 0.14, 0.36, 0.7),
      rotation,
    );
  });
  builder.sphere(
    "matte",
    palette.black,
    0.02,
    place(-0.06, 1.24, 0.52),
    [1, 1, 1],
    4,
  );
  builder.sphere(
    "matte",
    palette.black,
    0.02,
    place(0.06, 1.24, 0.52),
    [1, 1, 1],
    4,
  );
};

/* ------------------------------------------------------------------ */
/* The grandstand and the royal canopy                                 */
/* ------------------------------------------------------------------ */

const standStart = Math.PI - standArc;
const standLength = standArc * 2;

const buildStand = (builder: AttractionBuilder) => {
  for (let tier = 0; tier < standTiers; tier++) {
    const inner = standFrom + tier * standDepth;
    const top = (tier + 1) * standRise;
    addArcLathe(
      builder,
      "matte",
      tier % 2 === 0 ? sands.sandstone : shade(sands.sandstone, 1.08),
      [
        [standFrom + standTiers * standDepth + 0.15, top],
        [inner, top],
        [inner, 0],
      ],
      at(0, 0, 0),
      28,
      standStart,
      standLength,
    );
    if (!builder.isFar) {
      /* Coloured cushions along each tier's edge. */
      addArcLathe(
        builder,
        "matte",
        tier === 1 ? royalRed : royalBlue,
        [
          [inner + 0.28, top + 0.03],
          [inner + 0.08, top + 0.03],
        ],
        at(0, 0, 0),
        28,
        standStart + 0.05,
        standLength - 0.1,
      );
    }
  }
  /* End walls of the stand. */
  [standStart, standStart + standLength].forEach((angle) => {
    const middle = standFrom + (standTiers * standDepth) / 2;
    builder.box(
      "matte",
      shade(sands.sandstone, 0.9),
      [0.2, standTiers * standRise + 0.15, standTiers * standDepth + 0.2],
      at(
        Math.sin(angle) * middle,
        (standTiers * standRise + 0.15) / 2,
        Math.cos(angle) * middle,
      ),
      [0, angle, 0],
    );
  });
};

const canopyAt = at(0, standTiers * standRise, -(standFrom + 1.9));

const addLotusColumn = (
  builder: AttractionBuilder,
  base: Triple,
  height: number,
) => {
  builder.lathe(
    "matte",
    sands.paleStone,
    [
      [0, 0],
      [0.16, 0],
      [0.16, 0.08],
      [0.12, 0.12],
      [0.11, height * 0.75],
      [0.15, height * 0.85],
      [0.22, height * 0.97],
      [0.22, height],
      [0, height],
    ],
    base,
    "y",
    10,
  );
  if (builder.isFar) {
    return;
  }
  [0.25, 0.5, 0.72].forEach((share, index) => {
    builder.cylinder("paint", index === 1 ? royalRed : royalBlue, {
      radius: 0.118,
      length: 0.06,
      at: [base[0], base[1] + height * share, base[2]],
      segments: 8,
    });
  });
};

const buildCanopy = (builder: AttractionBuilder) => {
  const [x, y, z] = canopyAt;
  builder.box("matte", sands.paleStone, [3.0, 0.25, 1.6], [x, y + 0.12, z]);
  [-1.3, 1.3].forEach((dx) => {
    [-0.6, 0.6].forEach((dz) => {
      addLotusColumn(builder, [x + dx, y + 0.25, z + dz], 2.0);
    });
  });
  builder.box("paint", palette.white, [3.0, 0.12, 1.6], [x, y + 2.3, z]);
  const stripes = builder.isFar ? 1 : 7;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? royalBlue : palette.white,
      [3.2 / stripes, 0.06, 1.75],
      [x - 1.6 + (3.2 / stripes) * (stripe + 0.5), y + 2.4, z],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* A painted frieze and two golden thrones with the king and queen. */
  builder.box("paint", sands.gold, [3.0, 0.08, 0.04], [x, y + 2.2, z + 0.82]);
  [-0.4, 0.4].forEach((dx, index) => {
    builder.box("paint", sands.gold, [0.5, 0.42, 0.45], [x + dx, y + 0.46, z]);
    builder.box(
      "paint",
      sands.gold,
      [0.5, 0.65, 0.08],
      [x + dx, y + 0.9, z - 0.22],
    );
    addPerson(builder, [x + dx, y + 0.42, z + 0.05], 0, {
      skin: sands.skin,
      cloth: palette.white,
      head: index === 0 ? "nemes" : "hair",
      isSitting: true,
    });
  });
  addPerson(builder, [x - 1.0, y + 0.25, z + 0.2], 0.3, {
    skin: sands.skinDark,
    cloth: palette.white,
    head: "wrap",
    headColour: palette.white,
  });
};

const buildFan = (builder: AttractionBuilder) => {
  /* A tall ostrich-feather fan, wafted over the king. */
  builder.cylinder("paint", sands.gold, {
    radius: 0.03,
    length: 1.3,
    at: [0, 0.65, 0],
    segments: 6,
  });
  const feathers = builder.isFar ? 3 : 7;
  for (let feather = 0; feather < feathers; feather++) {
    const angle = -0.9 + (feather / (feathers - 1)) * 1.8;
    builder.sphere(
      "matte",
      feather % 2 === 0 ? palette.white : "#e8d9b0",
      0.16,
      [Math.sin(angle) * 0.25, 1.35 + Math.cos(angle) * 0.22, 0],
      [0.5, 1.4, 0.15],
      6,
    );
  }
};

/* ------------------------------------------------------------------ */
/* The way in, the stables and the palms                               */
/* ------------------------------------------------------------------ */

const addPylon = (builder: AttractionBuilder, x: number) => {
  const height = 3.1;
  builder.add(
    "matte",
    sands.paleStone,
    new CylinderGeometry(
      1.05 / Math.SQRT2,
      1.45 / Math.SQRT2,
      height,
      4,
      1,
    ).rotateY(Math.PI / 4),
    {
      at: [x, height / 2, pylonZ],
      scale: [1.6, 1, 0.55],
    },
  );
  builder.box(
    "matte",
    shade(sands.paleStone, 1.06),
    [1.55 * 1.06, 0.18, 0.62],
    [x, height + 0.09, pylonZ],
  );
  if (builder.isFar) {
    return;
  }
  /* A painted relief of a chariot and a flagpole in a niche. */
  builder.box("paint", royalBlue, [0.9, 0.12, 0.02], [x, 2.6, pylonZ + 0.42]);
  builder.box("paint", royalRed, [0.7, 0.5, 0.02], [x, 1.7, pylonZ + 0.47]);
  builder.cylinder("paint", sands.gold, {
    radius: 0.16,
    length: 0.03,
    at: [x - 0.12, 1.55, pylonZ + 0.49],
    axis: "z",
    segments: 10,
  });
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.04,
    length: 4.4,
    at: [x + Math.sign(x) * 0.62, 2.2, pylonZ + 0.5],
    segments: 6,
  });
  addSheet(builder, "matte", Math.sign(x) > 0 ? royalRed : royalBlue, [
    [x + Math.sign(x) * 0.62, 4.35, pylonZ + 0.5],
    [x + Math.sign(x) * 1.4, 4.2, pylonZ + 0.55],
    [x + Math.sign(x) * 0.62, 3.9, pylonZ + 0.5],
  ]);
};

const palms: readonly Palm[] = [
  { x: -7.3, z: 4.2, height: 3.8, lean: 0.6, curve: 0.7 },
  { x: 7.4, z: 3.6, height: 4.2, lean: -0.8, curve: 0.8 },
];

const buildStables = (builder: AttractionBuilder) => {
  /* A water trough, hay and a spare chariot wheel. */
  builder.box(
    "matte",
    sands.sandstone,
    [1.4, 0.4, 0.5],
    [5.4, 0.2, 6.2],
    [0, -0.6, 0],
  );
  builder.box(
    "water",
    palette.water,
    [1.2, 0.03, 0.34],
    [5.4, 0.37, 6.2],
    [0, -0.6, 0],
  );
  builder.sphere(
    "matte",
    "#d8b85c",
    0.45,
    [-5.2, 0.25, 6.2],
    [1.3, 0.6, 1],
    10,
  );
  if (builder.isFar) {
    return;
  }
  builder.torus("paint", royalRed, 0.42, 0.04, [6.5, 0.44, 5.0], "x", 16);
  builder.cylinder("paint", sands.gold, {
    radius: 0.08,
    length: 0.14,
    at: [6.5, 0.44, 5.0],
    axis: "x",
    segments: 8,
  });
  addPot(builder, [-4.4, 0, 6.6], 0.14);
  addPot(builder, [-4.1, 0, 6.9], 0.11, sands.deepTerracotta);
  addLump(builder, sands.sandstone, [7.8, 0.2, -3.6], [0.45, 0.25, 0.35], 2.4);
};

const buildRacetrack = (builder: AttractionBuilder) => {
  buildTrack(builder);
  buildIsland(builder);
  buildStand(builder);
  buildCanopy(builder);
  [-1, 1].forEach((side) => {
    addPylon(builder, side * (gateHalf + 1.1));
  });
  palms.forEach((palm, index) => {
    addPalm(builder, palm, index);
  });
  buildStables(builder);
  addSignBoard(builder, [2.6, 0, 8.6], signColour);
};

/* ------------------------------------------------------------------ */
/* The chariots                                                        */
/* ------------------------------------------------------------------ */

const addWheel = (builder: AttractionBuilder, x: number) => {
  const radius = 0.42;
  builder.torus("paint", royalRed, radius, 0.035, [x, radius, 0], "x", 12);
  builder.cylinder("paint", sands.gold, {
    radius: 0.07,
    length: 0.16,
    at: [x, radius, 0],
    axis: "x",
    segments: 8,
  });
  const spokes = builder.isFar ? 0 : 6;
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = (spoke / spokes) * Math.PI * 2;
    builder.bar(
      "paint",
      sands.gold,
      [x, radius, 0],
      [x, radius + Math.cos(angle) * radius, Math.sin(angle) * radius],
      0.035,
      4,
    );
  }
};

const addHorse = (builder: AttractionBuilder, x: number, coat: string) => {
  const segments = builder.segments(8, 5);
  builder.sphere(
    "matte",
    coat,
    0.3,
    [x, 0.95, 1.55],
    [0.75, 0.75, 1.45],
    segments,
  );
  addTaperedBar(
    builder,
    "matte",
    coat,
    [x, 1.05, 1.9],
    [x, 1.45, 2.15],
    0.15,
    0.1,
    7,
  );
  builder.sphere(
    "matte",
    coat,
    0.12,
    [x, 1.48, 2.3],
    [0.8, 0.85, 1.6],
    segments,
  );
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      const z = 1.55 + end * 0.3;
      addTaperedBar(
        builder,
        "matte",
        shade(coat, 0.85),
        [x + side * 0.1, 0.85, z],
        [x + side * 0.1, 0.02, z + end * 0.04],
        0.06,
        0.04,
        5,
      );
    });
  });
  addTaperedBar(
    builder,
    "matte",
    "#2b211b",
    [x, 1.05, 1.1],
    [x, 0.6, 0.98],
    0.05,
    0.02,
    5,
  );
  if (builder.isFar) {
    return;
  }
  /* Mane, a nodding plume and a bright saddle cloth. */
  builder.box(
    "matte",
    "#2b211b",
    [0.05, 0.12, 0.42],
    [x, 1.42, 2.05],
    [0.75, 0, 0],
  );
  builder.sphere("paint", royalRed, 0.07, [x, 1.72, 2.2], [0.7, 1.6, 0.7], 8);
  builder.box("matte", royalBlue, [0.46, 0.22, 0.5], [x, 1.1, 1.5]);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      palette.black,
      0.02,
      [x + side * 0.08, 1.54, 2.4],
      [1, 1, 1],
      4,
    );
  });
};

const buildChariot = (builder: AttractionBuilder) => {
  /* The car: a floor, a curved front and gilded sides. */
  builder.box("paint", palette.paleTimber, [0.9, 0.06, 0.6], [0, 0.42, 0]);
  builder.add(
    "paint",
    royalRed,
    new CylinderGeometry(
      0.45,
      0.45,
      0.55,
      builder.segments(12, 6),
      1,
      true,
      -Math.PI / 2,
      Math.PI,
    ),
    { at: [0, 0.72, 0.05] },
  );
  builder.torus("paint", sands.gold, 0.45, 0.03, [0, 1.0, 0.05], "y", 10);
  [-1, 1].forEach((side) => {
    addWheel(builder, side * 0.55);
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.04,
    length: 1.2,
    at: [0, 0.42, 0],
    axis: "x",
    segments: 6,
  });
  /* The pole and yoke to the horses. */
  builder.bar(
    "paint",
    palette.paleTimber,
    [0, 0.42, 0.3],
    [0, 1.0, 1.9],
    0.07,
    6,
  );
  builder.bar(
    "paint",
    palette.paleTimber,
    [-0.4, 1.12, 1.85],
    [0.4, 1.12, 1.85],
    0.06,
    6,
  );
  addHorse(builder, -0.32, horseBay);
  addHorse(builder, 0.32, horseGrey);
  if (builder.isFar) {
    return;
  }
  addPerson(builder, [-0.2, 0.45, -0.05], 0, {
    skin: sands.skin,
    cloth: palette.white,
    head: "cap",
    headColour: royalBlue,
  });
  /* Reins from the charioteer's hands to the horses. */
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#5a3a22",
      [-0.2 + side * 0.15, 1.05, 0.1],
      [side * 0.32, 1.35, 2.2],
      0.015,
      3,
    );
  });
};

const chariotPivot = at(0, 0, 0);
const chariotMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: lane,
  count: 2,
  speed: -0.5,
  isFacingAlong: true,
};

/* ------------------------------------------------------------------ */
/* The crowd                                                           */
/* ------------------------------------------------------------------ */

const crowdColours = [
  royalRed,
  palette.white,
  sands.turquoise,
  sands.ochre,
  royalBlue,
];

const buildCrowd = (builder: AttractionBuilder) => {
  const people = builder.isFar ? 0 : 10;
  for (let person = 0; person < people; person++) {
    const tier = person % standTiers;
    const angle =
      standStart + 0.12 + ((person + 0.5) / people) * (standLength - 0.24);
    if (Math.abs(angle - Math.PI) < 0.22) {
      continue;
    }
    const radius = standFrom + tier * standDepth + 0.45;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const y = (tier + 1) * standRise;
    const cloth = crowdColours[person % crowdColours.length];
    builder.sphere(
      "matte",
      cloth,
      0.17,
      [x, y + 0.35, z],
      [1, 1.5, 0.8],
      builder.segments(7, 5),
    );
    builder.sphere(
      "matte",
      person % 3 === 0 ? sands.skinDark : sands.skin,
      0.1,
      [x, y + 0.7, z],
      [1, 1, 1],
      builder.segments(7, 4),
    );
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        builder.bar(
          "matte",
          person % 3 === 0 ? sands.skinDark : sands.skin,
          [x + side * 0.12, y + 0.5, z],
          [x + side * 0.2, y + 0.85, z + 0.08],
          0.05,
          4,
        );
      });
    }
  }
};

/* ------------------------------------------------------------------ */
/* Geese                                                               */
/* ------------------------------------------------------------------ */

const buildGoose = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#e9e4d8", 0.14, [0, 0.22, 0], [0.8, 0.75, 1.3], 8);
  addTaperedBar(
    builder,
    "matte",
    "#e9e4d8",
    [0, 0.25, 0.12],
    [0, 0.48, 0.2],
    0.05,
    0.035,
    5,
  );
  builder.sphere("matte", "#e9e4d8", 0.05, [0, 0.5, 0.22], [1, 1, 1.2], 6);
  builder.add("matte", "#e08a20", new ConeGeometry(0.025, 0.08, 4), {
    at: [0, 0.49, 0.3],
    rotation: [Math.PI / 2, 0, 0],
  });
  builder.box("matte", "#e08a20", [0.05, 0.1, 0.03], [0, 0.05, 0]);
};

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

const raceStart = { x: 1.3, z: 6.3 };
const raceFinish = { x: -1.3, z: 6.3 };

const standDeck: Deck = ({ x, z }) => {
  const dx = x - centre.x;
  const dz = z - centre.z;
  const radius = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const turned = angle < 0 ? angle + Math.PI * 2 : angle;
  if (
    radius < standFrom ||
    radius > standFrom + standTiers * standDepth + 0.1 ||
    turned < standStart + 0.04 ||
    turned > standStart + standLength - 0.04
  ) {
    return undefined;
  }
  const tier = Math.min(
    standTiers,
    Math.floor((radius - standFrom) / standDepth) + 1,
  );
  return { height: tier * standRise, kind: "ground" };
};

const blockers: LocalBlocker[] = [
  { x: centre.x, z: centre.z - 0.6, radius: 0.75 },
  ...palms.map((palm) => ({ x: palm.x, z: palm.z, radius: 0.3 })),
];

export const chariotRacetrackModel: NewLandAttractionModel = {
  kind: "chariot-racetrack",
  islandId: "sunscorch-sands",
  name: "Chariot Racetrack",
  fact: "Ancient Egyptian chariots were light and fast, made of wood and leather, with two spoked wheels and two horses to pull them. A charioteer drove while a soldier stood beside him. The young pharaoh Tutankhamun was buried with six chariots, and his gilded ones can still be seen today.",
  curriculumLink:
    "History, Key Stage 2: the achievements of the earliest civilizations. A depth study of Ancient Egypt: pharaohs, horses and chariots.",
  footprint: 10,
  setting: "inland",
  padColour: sands.sand,
  signSpot: { x: 2.6, z: 9.5 },
  build: buildRacetrack,
  moving: [
    {
      name: "chariots",
      pivot: chariotPivot,
      build: buildChariot,
      motion: chariotMotion,
    },
    {
      name: "cheering crowd",
      pivot: at(0, 0, 0),
      build: buildCrowd,
      motion: { kind: "rise", reach: 7, height: 0.22, period: 0.6 },
    },
    {
      name: "feather fan",
      pivot: [canopyAt[0] + 0.85, canopyAt[1] + 0.9, canopyAt[2] + 0.35],
      build: buildFan,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.35,
        period: 1.8,
      },
    },
  ],
  wanderers: [
    {
      name: "geese",
      build: buildGoose,
      count: 3,
      centre: { x: -5.8, z: 6.6 },
      radius: 0.8,
      speed: 0.3,
    },
  ],
  blockers,
  decks: [standDeck],
  rides: [
    {
      id: "chariot-race",
      name: "a chariot race",
      start: raceStart,
      reach: 0.6,
      seconds: 16,
      finish: raceFinish,
      follow: followMovingSeat({
        pivot: chariotPivot,
        motion: chariotMotion,
        seat: [0.2, 0.45, -0.05],
        start: raceStart,
        finish: raceFinish,
      }),
    },
  ],
  tune: [60, 67, 72, 67, 72, 76, 79],
  play: {
    label: "Start the race",
    news: "Ta-ra-ra! The trumpets sounded, the charioteers cracked their reins, and the horses thundered round the track while the crowd cheered for the red chariot.",
    tune: [60, 67, 72, 76],
  },
};
