import { ConeGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addBasket,
  addGrassTuft,
  addLump,
  addPalm,
  addPalmCrown,
  addPalmTrunk,
  addPerson,
  addPot,
  addSheet,
  addTaperedBar,
  findTrunkPoint,
  sands,
  type Palm,
} from "./date-palm-grove-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const groveSoil = "#c9a874";
const dampSoil = "#9c7a4e";
const channelWater = "#3a9fb5";
const awningRed = "#c23b2e";
const awningCream = "#f1e4c4";
const oxCoat = "#8a6440";
const donkeyGrey = "#9d948a";
const signColour = "#4f8236";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const palms: readonly Palm[] = [
  { x: -4.6, z: -2.4, height: 4.3, lean: 0.4, curve: 0.6 },
  { x: -1.7, z: -2.8, height: 3.8, lean: -0.5, curve: 0.5 },
  { x: 1.7, z: -2.6, height: 4.5, lean: 0.6, curve: 0.7 },
  { x: 4.6, z: -2.3, height: 3.9, lean: -0.3, curve: 0.6 },
  { x: -4.5, z: 0.8, height: 3.6, lean: 1.2, curve: 0.8 },
  { x: 4.4, z: 1.0, height: 4.1, lean: -1.4, curve: 0.7 },
];
const climbPalm: Palm = { x: -1.5, z: 1.4, height: 4.2, lean: 0, curve: 0 };
const mainChannelZ = -4.5;
const branchX = 3.05;
const channelFront = 3.6;
const wheelAt: Triple = [0, 1.0, -6.3];
const wheelRadius = 1.3;
const gearAt = { x: 2.7, z: -6.1 };
const stall = { x: 3.0, z: 4.7 };
const scalesPivot: Triple = [stall.x - 0.45, 1.12, stall.z + 0.05];

/* ------------------------------------------------------------------ */
/* Channels and the water wheel                                        */
/* ------------------------------------------------------------------ */

const addChannel = (
  builder: AttractionBuilder,
  from: { x: number; z: number },
  to: { x: number; z: number },
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z);
  const middle: Triple = [(from.x + to.x) / 2, 0, (from.z + to.z) / 2];
  builder.box(
    "matte",
    dampSoil,
    [0.7, 0.02, length + 0.2],
    [middle[0], 0.01, middle[2]],
    [0, turn, 0],
  );
  builder.box(
    "water",
    channelWater,
    [0.4, 0.03, length],
    [middle[0], 0.03, middle[2]],
    [0, turn, 0],
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(dampSoil, 1.12),
      [0.14, 0.08, length + 0.1],
      [
        middle[0] + Math.cos(turn) * side * 0.28,
        0.04,
        middle[2] - Math.sin(turn) * side * 0.28,
      ],
      [0, turn, 0],
    );
  });
};

const buildChannels = (builder: AttractionBuilder) => {
  addChannel(builder, { x: 0, z: wheelAt[2] + 0.6 }, { x: 0, z: mainChannelZ });
  addChannel(
    builder,
    { x: -branchX - 0.2, z: mainChannelZ },
    { x: branchX + 0.2, z: mainChannelZ },
  );
  [-1, 1].forEach((side) => {
    addChannel(
      builder,
      { x: side * branchX, z: mainChannelZ },
      { x: side * branchX, z: channelFront },
    );
  });
  /* Little channels to each palm's basin. */
  [...palms, climbPalm].forEach((palm) => {
    builder.cylinder("matte", dampSoil, {
      radius: 0.7,
      length: 0.02,
      at: [palm.x, 0.012, palm.z],
      segments: 16,
    });
  });
  /* A plank bridge over the main channel. */
  builder.box(
    "matte",
    palette.paleTimber,
    [1.4, 0.06, 0.9],
    [0, 0.07, mainChannelZ],
  );
  if (builder.isFar) {
    return;
  }
  /* Wooden sluice gates where the channels branch. */
  [-1, 1].forEach((side) => {
    const x = side * branchX;
    [-0.3, 0.3].forEach((dx) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.08, 0.55, 0.08],
        [x + dx, 0.27, mainChannelZ + 0.5],
      );
    });
    builder.box(
      "matte",
      palette.timber,
      [0.5, 0.25, 0.05],
      [x, 0.3, mainChannelZ + 0.5],
    );
  });
};

const buildWheelHouse = (builder: AttractionBuilder) => {
  const [x, y, z] = wheelAt;
  /* The pit the wheel dips into. */
  builder.box(
    "matte",
    sands.sandstone,
    [1.0, 0.4, 3.0],
    [x, 0.2, z],
    undefined,
  );
  builder.box("water", "#2a7d84", [0.7, 0.03, 2.7], [x, 0.41, z]);
  /* Posts and the axle. */
  [-0.6, 0.6].forEach((dx) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.16, y + 0.3, 0.2],
      [x + dx, (y + 0.3) / 2, z],
    );
  });
  builder.cylinder("matte", palette.timber, {
    radius: 0.07,
    length: 2.2,
    at: [x + 0.7, y, z],
    axis: "x",
    segments: 8,
  });
  /* The ox's gear wheel and its round track. */
  builder.cylinder("matte", shade(groveSoil, 0.9), {
    radius: 1.65,
    length: 0.02,
    at: [gearAt.x, 0.012, gearAt.z],
    segments: 24,
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.15,
    length: 1.3,
    at: [gearAt.x, 0.65, gearAt.z],
    segments: 8,
  });
  builder.torus(
    "matte",
    palette.timber,
    0.6,
    0.06,
    [gearAt.x, 0.6, gearAt.z],
    "y",
    16,
  );
  if (builder.isFar) {
    return;
  }
  for (let cog = 0; cog < 10; cog++) {
    const angle = (cog / 10) * Math.PI * 2;
    builder.box(
      "matte",
      palette.paleTimber,
      [0.08, 0.14, 0.08],
      [gearAt.x + Math.sin(angle) * 0.6, 0.7, gearAt.z + Math.cos(angle) * 0.6],
    );
  }
};

const buildWaterWheel = (builder: AttractionBuilder) => {
  /* A saqiya: a wheel of clay pots that scoops water up to the channel. */
  [-0.25, 0.25].forEach((dx) => {
    builder.torus(
      "matte",
      palette.timber,
      wheelRadius,
      0.05,
      [dx, 0, 0],
      "x",
      builder.segments(22, 10),
    );
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.16,
    length: 0.6,
    at: [0, 0, 0],
    axis: "x",
    segments: 10,
  });
  const spokes = builder.isFar ? 3 : 6;
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = (spoke / spokes) * Math.PI;
    [-0.25, 0.25].forEach((dx) => {
      builder.bar(
        "matte",
        palette.paleTimber,
        [dx, Math.cos(angle) * wheelRadius, Math.sin(angle) * wheelRadius],
        [dx, -Math.cos(angle) * wheelRadius, -Math.sin(angle) * wheelRadius],
        0.06,
        4,
      );
    });
  }
  const pots = builder.isFar ? 5 : 10;
  for (let pot = 0; pot < pots; pot++) {
    const angle = (pot / pots) * Math.PI * 2;
    builder.cylinder(
      "matte",
      pot % 2 === 0 ? sands.terracotta : sands.deepTerracotta,
      {
        radius: 0.11,
        radiusEnd: 0.14,
        length: 0.3,
        at: [
          0,
          Math.cos(angle) * (wheelRadius + 0.08),
          Math.sin(angle) * (wheelRadius + 0.08),
        ],
        segments: 7,
      },
    );
  }
};

/* ------------------------------------------------------------------ */
/* The climbing palm, the stall and the grounds                        */
/* ------------------------------------------------------------------ */

const buildClimbPalm = (builder: AttractionBuilder) => {
  addPalmTrunk(builder, climbPalm, 1);
  addPalmCrown(builder, findTrunkPoint(climbPalm, 1), 7, {
    size: 1.1,
    bunches: 4,
  });
  if (builder.isFar) {
    return;
  }
  /* Notches cut for climbing, and a rope with a pulley. */
  for (let notch = 0; notch < 8; notch++) {
    builder.box(
      "matte",
      sands.palmTrunkDark,
      [0.32, 0.04, 0.05],
      [climbPalm.x, 0.6 + notch * 0.42, climbPalm.z + 0.17],
    );
  }
  builder.torus(
    "metal",
    palette.steel,
    0.08,
    0.02,
    [climbPalm.x + 0.3, 3.9, climbPalm.z],
    "z",
    10,
  );
  builder.bar(
    "matte",
    "#d8c9a6",
    [climbPalm.x + 0.38, 3.9, climbPalm.z],
    [climbPalm.x + 0.42, 0.9, climbPalm.z],
    0.015,
    3,
  );
  builder.bar(
    "matte",
    palette.darkTimber,
    [climbPalm.x, 3.92, climbPalm.z],
    [climbPalm.x + 0.32, 3.92, climbPalm.z],
    0.04,
    4,
  );
};

const buildHoistBasket = (builder: AttractionBuilder) => {
  addBasket(builder, [0, 0, 0], 0.22, sands.dates);
  builder.bar("matte", "#d8c9a6", [-0.18, 0.18, 0], [0, 0.45, 0], 0.012, 3);
  builder.bar("matte", "#d8c9a6", [0.18, 0.18, 0], [0, 0.45, 0], 0.012, 3);
};

const buildStall = (builder: AttractionBuilder) => {
  const { x, z } = stall;
  [-1.1, 1.1].forEach((dx) => {
    [-0.6, 0.6].forEach((dz) => {
      builder.cylinder("matte", palette.paleTimber, {
        radius: 0.05,
        length: 2.1,
        at: [x + dx, 1.05, z + dz],
        segments: 6,
      });
    });
  });
  const stripes = builder.isFar ? 1 : 6;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? awningRed : awningCream,
      [2.5 / stripes, 0.05, 1.6],
      [x - 1.25 + (2.5 / stripes) * (stripe + 0.5), 2.12, z],
      [0.08, 0, 0],
    );
  }
  /* The table, heaped with baskets of dates. */
  builder.box("matte", palette.timber, [1.9, 0.08, 0.7], [x, 0.8, z - 0.1]);
  builder.box("matte", awningCream, [1.95, 0.5, 0.02], [x, 0.55, z + 0.25]);
  if (builder.isFar) {
    return;
  }
  [-0.75, -0.05, 0.6].forEach((dx, index) => {
    addBasket(
      builder,
      [x + dx, 0.84, z - 0.15],
      0.2,
      index === 1 ? "#7a3a1d" : sands.dates,
    );
  });
  /* The balance post. */
  builder.cylinder("metal", palette.brass, {
    radius: 0.02,
    length: 0.3,
    at: [scalesPivot[0], 0.98, scalesPivot[2]],
    segments: 6,
  });
  /* Crates, sacks and the stallholder on a stool. */
  [
    [x + 1.5, z + 0.5],
    [x + 1.55, z - 0.1],
  ].forEach(([cx, cz], index) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.5, 0.4, 0.5],
      [cx, 0.2 + index * 0.0, cz],
      [0, index * 0.4, 0],
    );
    builder.sphere("matte", sands.dates, 0.2, [cx, 0.4, cz], [1, 0.4, 1], 8);
  });
  builder.sphere(
    "matte",
    "#d9c9a6",
    0.24,
    [x - 1.5, 0.22, z - 0.4],
    [1, 0.9, 0.8],
    8,
  );
  builder.cylinder("matte", palette.timber, {
    radius: 0.18,
    length: 0.4,
    at: [x + 0.2, 0.2, z - 0.85],
    segments: 8,
  });
  addPerson(builder, [x + 0.2, 0.4, z - 0.85], 0, {
    skin: sands.skin,
    cloth: sands.lapis,
    head: "wrap",
    headColour: palette.white,
    isSitting: true,
  });
};

const buildScales = (builder: AttractionBuilder) => {
  builder.box("metal", palette.brass, [0.6, 0.025, 0.025], [0, 0, 0]);
  [-0.28, 0.28].forEach((dx, index) => {
    builder.bar("metal", palette.brass, [dx, 0, 0], [dx, -0.16, 0], 0.008, 3);
    builder.cylinder("metal", palette.brass, {
      radius: 0.1,
      radiusEnd: 0.12,
      length: 0.03,
      at: [dx, -0.17, 0],
      segments: 10,
    });
    builder.sphere(
      "matte",
      index === 0 ? sands.dates : palette.darkStone,
      0.05,
      [dx, -0.13, 0],
      [1, 0.7, 1],
      6,
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A path up the middle of the grove to the water wheel. */
  builder.box("matte", sands.paleSand, [1.2, 0.015, 9.6], [0, 0.008, 0.1]);
  if (builder.isFar) {
    return;
  }
  /* Young palms (offshoots) planted in a nursery row. */
  [-5.6, -4.8, -4.0].forEach((x, index) => {
    for (let leaf = 0; leaf < 5; leaf++) {
      const angle = leaf * 1.26 + index;
      addTaperedBar(
        builder,
        "matte",
        leaf % 2 === 0 ? sands.frond : sands.frondLight,
        [x, 0, 4.4],
        [x + Math.sin(angle) * 0.4, 0.75, 4.4 + Math.cos(angle) * 0.4],
        0.05,
        0.01,
        4,
      );
    }
  });
  /* Water jars, a heap of cut fronds and stones. */
  addPot(builder, [-0.9, 0, -5.0], 0.16);
  addPot(builder, [-1.25, 0, -5.25], 0.13, sands.deepTerracotta);
  [0, 1, 2, 3].forEach((frond) => {
    addSheet(builder, "matte", sands.frondDry, [
      [5.4 + frond * 0.05, 0.03 + frond * 0.03, 3.4],
      [6.6, 0.03 + frond * 0.03, 3.1 + frond * 0.1],
      [6.6, 0.03 + frond * 0.03, 3.5 + frond * 0.1],
    ]);
  });
  [
    [-6.4, -4.6, 0.4],
    [6.6, -4.2, 0.45],
    [7.2, 0.4, 0.3],
  ].forEach(([x, z, size], index) => {
    addLump(
      builder,
      sands.sandstone,
      [x, size * 0.3, z],
      [size * 1.3, size * 0.7, size],
      index * 1.9,
    );
  });
  [
    [-7.0, 2.4],
    [6.8, 2.8],
    [-3.2, 6.9],
    [1.0, 7.6],
  ].forEach(([x, z]) => {
    addGrassTuft(builder, [x, 0, z], 1.1);
  });
};

const buildGrove = (builder: AttractionBuilder) => {
  buildGrounds(builder);
  buildChannels(builder);
  buildWheelHouse(builder);
  palms.forEach((palm, index) => {
    addPalm(builder, palm, index);
  });
  buildClimbPalm(builder);
  buildStall(builder);
  addSignBoard(builder, [-2.8, 0, 7.1], signColour);
};

/* ------------------------------------------------------------------ */
/* Wanderers and the ox                                                */
/* ------------------------------------------------------------------ */

const buildOx = (builder: AttractionBuilder) => {
  const segments = builder.segments(9, 5);
  builder.sphere(
    "matte",
    oxCoat,
    0.36,
    [0, 0.72, 0],
    [0.75, 0.7, 1.35],
    segments,
  );
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      addTaperedBar(
        builder,
        "matte",
        shade(oxCoat, 0.85),
        [side * 0.17, 0.6, end * 0.3],
        [side * 0.17, 0.02, end * 0.32],
        0.08,
        0.05,
        5,
      );
    });
  });
  builder.sphere(
    "matte",
    oxCoat,
    0.17,
    [0, 0.82, 0.55],
    [0.85, 0.85, 1.2],
    segments,
  );
  /* The beam from its yoke to the gear post. */
  builder.box("matte", palette.paleTimber, [0.1, 0.1, 0.5], [0, 1.05, 0.25]);
  builder.bar("matte", palette.timber, [0, 1.0, 0.2], [-1.3, 0.75, 0], 0.08, 5);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#e8dcc0",
      [side * 0.1, 0.95, 0.55],
      [side * 0.28, 1.12, 0.48],
      0.035,
      4,
    );
    builder.sphere(
      "matte",
      palette.black,
      0.02,
      [side * 0.09, 0.86, 0.72],
      [1, 1, 1],
      4,
    );
  });
  addTaperedBar(
    builder,
    "matte",
    shade(oxCoat, 0.7),
    [0, 0.8, -0.45],
    [0, 0.35, -0.55],
    0.03,
    0.02,
    4,
  );
};

const buildDonkey = (builder: AttractionBuilder) => {
  const segments = builder.segments(9, 5);
  builder.sphere(
    "matte",
    donkeyGrey,
    0.28,
    [0, 0.62, 0],
    [0.75, 0.7, 1.3],
    segments,
  );
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      addTaperedBar(
        builder,
        "matte",
        shade(donkeyGrey, 0.85),
        [side * 0.12, 0.5, end * 0.24],
        [side * 0.12, 0.02, end * 0.25],
        0.06,
        0.035,
        5,
      );
    });
    /* Panniers full of dates. */
    builder.box("matte", "#b8894f", [0.14, 0.26, 0.38], [side * 0.27, 0.6, 0]);
  });
  addTaperedBar(
    builder,
    "matte",
    donkeyGrey,
    [0, 0.7, 0.3],
    [0, 0.95, 0.48],
    0.11,
    0.08,
    6,
  );
  builder.sphere(
    "matte",
    donkeyGrey,
    0.12,
    [0, 0.98, 0.6],
    [0.8, 0.85, 1.4],
    segments,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      shade(donkeyGrey, 0.8),
      0.04,
      [side * 0.06, 1.18, 0.52],
      [0.6, 2.4, 0.5],
      6,
    );
    builder.sphere(
      "matte",
      sands.dates,
      0.08,
      [side * 0.27, 0.75, 0],
      [0.6, 0.4, 1.5],
      6,
    );
  });
};

const buildBird = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#8a6a4a", 0.06, [0, 0, 0], [0.8, 0.8, 1.4], 6);
  builder.add("matte", "#e08a20", new ConeGeometry(0.015, 0.05, 4), {
    at: [0, 0.01, 0.1],
    rotation: [Math.PI / 2, 0, 0],
  });
  [-1, 1].forEach((side) => {
    addSheet(builder, "matte", "#6b4f35", [
      [side * 0.03, 0.02, 0.04],
      [side * 0.22, 0.06, -0.02],
      [side * 0.03, 0.02, -0.06],
    ]);
  });
};

/* ------------------------------------------------------------------ */
/* The palm climb                                                      */
/* ------------------------------------------------------------------ */

const climbStart = { x: -0.5, z: 2.6 };
const climbFinish = { x: -0.4, z: 0.1 };
const climbTop = 3.3;

const followClimb = (progress: number): LocalSpot => {
  const foot = { x: climbPalm.x, z: climbPalm.z + 0.35 };
  if (progress < 0.08) {
    const share = progress / 0.08;
    return {
      x: climbStart.x + (foot.x - climbStart.x) * share,
      y: 0,
      z: climbStart.z + (foot.z - climbStart.z) * share,
      heading: Math.atan2(foot.x - climbStart.x, foot.z - climbStart.z),
    };
  }
  if (progress < 0.45) {
    /* Hitching the climbing belt up the trunk, a jerk at a time. */
    const share = (progress - 0.08) / 0.37;
    const hitch = share - Math.sin(share * Math.PI * 12) / (Math.PI * 12);
    return { x: foot.x, y: climbTop * hitch, z: foot.z, heading: Math.PI };
  }
  if (progress < 0.75) {
    /* Working round the trunk, picking dates. */
    const share = (progress - 0.45) / 0.3;
    const angle = share * Math.PI * 2;
    return {
      x: climbPalm.x + Math.sin(angle) * 0.35,
      y: climbTop,
      z: climbPalm.z + Math.cos(angle) * 0.35,
      heading: angle + Math.PI,
    };
  }
  if (progress < 0.9) {
    const share = (progress - 0.75) / 0.15;
    return {
      x: foot.x,
      y: climbTop * (1 - share * share),
      z: foot.z,
      heading: Math.PI,
    };
  }
  const share = (progress - 0.9) / 0.1;
  return {
    x: foot.x + (climbFinish.x - foot.x) * share,
    y: 0,
    z: foot.z + (climbFinish.z - foot.z) * share,
    heading: Math.atan2(climbFinish.x - foot.x, climbFinish.z - foot.z),
  };
};

const blockers: LocalBlocker[] = [
  ...palms.map((palm) => ({ x: palm.x, z: palm.z, radius: 0.3 })),
  { x: climbPalm.x, z: climbPalm.z, radius: 0.25 },
  { x: gearAt.x, z: gearAt.z, radius: 0.3 },
];

export const datePalmGroveModel: NewLandAttractionModel = {
  kind: "date-palm-grove",
  islandId: "sunscorch-sands",
  name: "Date Palm Grove",
  fact: "Date palms grow in hot deserts, but they still need plenty of water, so farmers dig channels to carry water to their roots. The roots take in the water, and the tall trunk carries it all the way up to the leaves. A date palm can live for over 100 years and give more than 50 kilograms of sweet dates every year.",
  curriculumLink:
    "Science, Year 3: plants. What plants need to live and grow, and how water is carried from the roots up through the plant.",
  footprint: 9,
  setting: "inland",
  padColour: groveSoil,
  signSpot: { x: -2.8, z: 8.0 },
  build: buildGrove,
  moving: [
    {
      name: "water wheel",
      pivot: wheelAt,
      build: buildWaterWheel,
      motion: { kind: "whirl", axis: "x", idle: 0.35, speed: 2.2, reach: 5 },
    },
    {
      name: "ox",
      pivot: [gearAt.x, 0, gearAt.z],
      build: buildOx,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 1.3,
        count: 1,
        speed: -0.35,
        isFacingAlong: true,
      },
    },
    {
      name: "basket of dates",
      pivot: [climbPalm.x + 0.42, 0.05, climbPalm.z],
      build: buildHoistBasket,
      motion: { kind: "rise", reach: 4, height: 2.7, period: 2.4 },
    },
    {
      name: "scales",
      pivot: scalesPivot,
      build: buildScales,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 4,
        amplitude: 0.25,
        period: 2.0,
      },
    },
  ],
  wanderers: [
    {
      name: "donkeys",
      build: buildDonkey,
      count: 2,
      centre: { x: 2.4, z: 1.6 },
      radius: 0.9,
      speed: 0.22,
    },
    {
      name: "sparrows",
      build: buildBird,
      count: 4,
      centre: { x: 0, z: -1.0 },
      radius: 4.0,
      speed: 1.4,
      height: 4.0,
      bob: 0.25,
    },
  ],
  blockers,
  rides: [
    {
      id: "palm-climb",
      name: "the palm climb",
      start: climbStart,
      reach: 0.6,
      seconds: 16,
      finish: climbFinish,
      follow: followClimb,
    },
  ],
  play: {
    label: "Pick some dates",
    news: "Up you went! You climbed the tall palm with a rope belt, picked a bunch of sticky brown dates and lowered them down in a basket. They taste like toffee!",
    tune: [67, 71, 74, 72, 76],
  },
};
