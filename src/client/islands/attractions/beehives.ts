import { CylinderGeometry } from "three";
import {
  addBench,
  addGableRoof,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "./attraction-kit.js";

const hiveWhite = "#f2efe6";
const hiveShadow = "#d9d4c6";
const roofGrey = "#9ea3a6";
const entranceDark = "#2a2622";
const stallTimber = "#a77b4f";
const honey = "#d98e1c";
const canopyYellow = "#e8b931";
const hedgeGreen = "#3d6e31";
const mownLight = "#86b553";
const mownDark = "#76a64a";
const meadowGrass = "#6f9a40";
const signColour = "#7a5a1e";

const benchAt = { x: -3.3, z: -0.9 };
const smokerAt: Triple = [benchAt.x + 0.85, 0, benchAt.z + 0.05];
const stallAt = { x: 3.2, z: 1.6 };
const stallTurn = -Math.PI / 2;

/* A small, steady random, so the meadow looks the same every time */

const makeRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

/* The hives */

const hiveSpots: { x: number; z: number; supers: number }[] = [
  { x: -3.3, z: -3.7, supers: 1 },
  { x: -1.1, z: -3.9, supers: 2 },
  { x: 1.1, z: -3.9, supers: 2 },
  { x: 3.3, z: -3.7, supers: 1 },
];
const hiveWidth = 0.5;
const standHeight = 0.42;

const buildHive = (
  builder: AttractionBuilder,
  { x, z, supers }: { x: number; z: number; supers: number },
) => {
  builder.box("matte", palette.paving, [0.9, 0.05, 0.9], [x, 0.045, z]);
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.06, standHeight, 0.06],
        [x + sideX * 0.2, standHeight / 2, z + sideZ * 0.2],
      );
    });
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [0.56, 0.06, 0.56],
    [x, standHeight - 0.03, z],
  );
  const floorTop = standHeight + 0.06;
  builder.box(
    "paint",
    hiveShadow,
    [hiveWidth, 0.06, hiveWidth],
    [x, floorTop - 0.03, z],
  );
  builder.box(
    "paint",
    hiveWhite,
    [hiveWidth - 0.04, 0.025, 0.2],
    [x, floorTop - 0.07, z + hiveWidth / 2 + 0.06],
    [0.35, 0, 0],
  );
  const boxes = [0.3, ...Array.from({ length: supers }, () => 0.18)];
  let bottom = floorTop;
  boxes.forEach((height, index) => {
    builder.box(
      "paint",
      hiveWhite,
      [hiveWidth, height - 0.012, hiveWidth],
      [x, bottom + height / 2, z],
    );
    builder.box(
      "paint",
      hiveShadow,
      [hiveWidth - 0.02, 0.014, hiveWidth - 0.02],
      [x, bottom + height - 0.006, z],
    );
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        builder.box(
          "matte",
          hiveShadow,
          [0.012, 0.035, 0.16],
          [x + side * (hiveWidth / 2 + 0.002), bottom + height * 0.72, z],
        );
      });
      if (index === 0) {
        builder.box(
          "matte",
          entranceDark,
          [0.3, 0.03, 0.02],
          [x, bottom + 0.025, z + hiveWidth / 2 + 0.002],
        );
      }
    }
    bottom += height;
  });
  builder.box(
    "paint",
    hiveShadow,
    [hiveWidth + 0.02, 0.025, hiveWidth + 0.02],
    [x, bottom + 0.012, z],
  );
  bottom += 0.025;
  builder.box(
    "paint",
    hiveWhite,
    [hiveWidth + 0.1, 0.13, hiveWidth + 0.1],
    [x, bottom + 0.065, z],
  );
  addGableRoof(builder, {
    width: hiveWidth + 0.06,
    depth: hiveWidth + 0.06,
    rise: 0.12,
    at: [x, bottom + 0.13, z],
    colour: roofGrey,
    overhang: 0.03,
    thickness: 0.03,
    finish: "metal",
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      hiveWhite,
      [0.03, 0.1, hiveWidth + 0.1],
      [x + side * (hiveWidth / 2 + 0.06), bottom + 0.16, z],
    );
  });
  if (supers === 1 && x < 0 && !builder.isFar) {
    builder.sphere(
      "matte",
      palette.darkStone,
      0.1,
      [x + 0.05, bottom + 0.29, z],
      [1.3, 0.7, 1],
      8,
    );
  }
};

/* The hedge and path */

const hedgeAngles = Array.from(
  { length: 11 },
  (_, index) => 2.25 + index * 0.178,
);
const hedgeRadius = 7.5;

const buildMownStrip = (
  builder: AttractionBuilder,
  {
    x,
    z,
    width,
    length,
  }: { x: number; z: number; width: number; length: number },
  isAlongX: boolean,
) => {
  const stripes = builder.isFar ? 1 : Math.max(1, Math.round(width / 0.4));
  for (let stripe = 0; stripe < stripes; stripe++) {
    const offset = -width / 2 + (width * (stripe + 0.5)) / stripes;
    const size: Triple = isAlongX
      ? [length, 0.03, width / stripes]
      : [width / stripes, 0.03, length];
    builder.box(
      "matte",
      stripe % 2 === 0 ? mownLight : mownDark,
      size,
      isAlongX ? [x, 0.03, z + offset] : [x + offset, 0.03, z],
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  buildMownStrip(builder, { x: 0, z: 3.0, width: 1.6, length: 12.0 }, false);
  buildMownStrip(builder, { x: 0, z: -2.5, width: 1.2, length: 9.2 }, true);
  hedgeAngles.forEach((angle, index) => {
    const x = Math.sin(angle) * hedgeRadius;
    const z = Math.cos(angle) * hedgeRadius;
    builder.sphere(
      "matte",
      index % 2 === 0 ? hedgeGreen : shade(hedgeGreen, 1.1),
      0.85,
      [x, 0.62, z],
      [1.1, 1.0, 0.85],
      builder.isFar ? 6 : 8,
    );
  });
  addTree(builder, [-6.6, 0, -2.8], 1.0, "#4a8a3c");
  addSignBoard(builder, [-1.6, 0, 7.6], signColour);
};

/* The wildflower meadow */

type Flower = "poppy" | "cornflower" | "daisy" | "foxglove";

interface Bloom {
  at: LocalPoint;
  flower: Flower;
  size: number;
}

const isClearOfMeadow = (x: number, z: number): boolean => {
  const isPath = Math.abs(x) < 1.2 && z > -3.4;
  const isApron = z < -1.6 && z > -3.4 && Math.abs(x) < 4.9;
  const isHives = z < -3.0 && Math.abs(x) < 4.4;
  const isHedge = Math.hypot(x, z) > hedgeRadius - 1.1 && z < -3.2;
  const isBench = Math.hypot(x - benchAt.x, z - benchAt.z) < 1.2;
  const isStall = Math.hypot(x - stallAt.x, z - stallAt.z) < 1.4;
  const isSign = Math.hypot(x + 1.6, z - 7.9) < 1.0;
  const isTree = Math.hypot(x + 6.6, z + 2.8) < 0.7;
  const isEdge = Math.hypot(x, z) > 8.4;
  return !(
    isPath ||
    isApron ||
    isHives ||
    isHedge ||
    isBench ||
    isStall ||
    isSign ||
    isTree ||
    isEdge
  );
};

const flowerKinds: Flower[] = ["poppy", "daisy", "cornflower", "foxglove"];

const listMeadow = (): {
  blooms: Bloom[];
  tufts: (LocalPoint & { size: number })[];
} => {
  const random = makeRandom(7);
  const blooms: Bloom[] = [];
  const tufts: (LocalPoint & { size: number })[] = [];
  for (let drift = 0; drift < 60 && blooms.length < 168; drift++) {
    const angle = random() * Math.PI * 2;
    const reach = 1.6 + Math.sqrt(random()) * 6.6;
    const centre = { x: Math.sin(angle) * reach, z: Math.cos(angle) * reach };
    if (!isClearOfMeadow(centre.x, centre.z)) {
      continue;
    }
    tufts.push({ ...centre, size: 0.45 + random() * 0.25 });
    const main = flowerKinds[drift % 3];
    const count = 5 + Math.floor(random() * 4);
    for (let index = 0; index < count; index++) {
      const x = centre.x + (random() - 0.5) * 1.3;
      const z = centre.z + (random() - 0.5) * 1.3;
      if (!isClearOfMeadow(x, z)) {
        continue;
      }
      const pick = random();
      const flower =
        pick < 0.62
          ? main
          : pick < 0.72
            ? "foxglove"
            : flowerKinds[Math.floor(random() * 3)];
      blooms.push({ at: { x, z }, flower, size: 0.85 + random() * 0.35 });
    }
  }
  return { blooms, tufts };
};

const meadow = listMeadow();

const addStem = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  height: number,
) => {
  builder.add(
    "matte",
    "#56803a",
    new CylinderGeometry(0.012, 0.016, height, 3, 1, true),
    { at: [x, height / 2, z] },
  );
};

const buildFlower = (
  builder: AttractionBuilder,
  { at, flower, size }: Bloom,
) => {
  const { x, z } = at;
  if (flower === "foxglove") {
    const height = 0.95 * size;
    addStem(builder, x, z, height);
    const bells = builder.isFar ? 2 : 4;
    for (let bell = 0; bell < bells; bell++) {
      const y = height * (0.55 + (bell / bells) * 0.42);
      builder.cylinder("matte", bell % 2 === 0 ? "#b4558f" : "#c56aa0", {
        radius: 0.065 - bell * 0.009,
        radiusEnd: 0.025,
        length: 0.1,
        at: [x + (bell % 2 === 0 ? 0.035 : -0.035), y, z],
        segments: 5,
      });
    }
    return;
  }
  const height = (flower === "poppy" ? 0.55 : 0.46) * size;
  addStem(builder, x, z, height);
  if (flower === "poppy") {
    builder.cylinder("matte", "#d1322a", {
      radius: 0.09,
      radiusEnd: 0.045,
      length: 0.06,
      at: [x, height, z],
      segments: 6,
    });
    if (!builder.isFar) {
      builder.cylinder("matte", "#1f1a17", {
        radius: 0.025,
        length: 0.02,
        at: [x, height + 0.035, z],
        segments: 4,
      });
    }
    return;
  }
  if (flower === "cornflower") {
    builder.cylinder("matte", "#4268cf", {
      radius: 0.065,
      radiusEnd: 0.03,
      length: 0.07,
      at: [x, height, z],
      segments: 6,
    });
    return;
  }
  builder.cylinder("matte", "#f7f4ec", {
    radius: 0.085,
    length: 0.015,
    at: [x, height, z],
    segments: 7,
  });
  if (!builder.isFar) {
    builder.cylinder("matte", "#eab52a", {
      radius: 0.03,
      length: 0.03,
      at: [x, height + 0.012, z],
      segments: 5,
    });
  }
};

const buildMeadow = (builder: AttractionBuilder) => {
  if (!builder.isFar) {
    const random = makeRandom(53);
    meadow.tufts.forEach(({ x, z, size }) => {
      for (let blade = 0; blade < 5; blade++) {
        const bladeX = x + (random() - 0.5) * size * 2.4;
        const bladeZ = z + (random() - 0.5) * size * 2.4;
        if (!isClearOfMeadow(bladeX, bladeZ)) {
          continue;
        }
        const height = 0.25 + random() * 0.2;
        builder.add(
          "matte",
          blade % 2 === 0 ? meadowGrass : shade(meadowGrass, 1.15),
          new CylinderGeometry(0, 0.06, height, 3, 1, true),
          { at: [bladeX, height / 2, bladeZ], rotation: [0, random() * 2, 0] },
        );
      }
    });
  }
  meadow.blooms.forEach((bloom, index) => {
    if (builder.isFar && index % 3 !== 0) {
      return;
    }
    buildFlower(builder, bloom);
  });
};

/* The beekeeper's bench, smoker and veil */

const buildBeekeeping = (builder: AttractionBuilder) => {
  addBench(builder, [benchAt.x, 0, benchAt.z], 0, palette.timber);
  const [x, , z] = smokerAt;
  builder.cylinder("metal", "#b9b2a4", {
    radius: 0.09,
    length: 0.26,
    at: [x, 0.13, z],
    segments: builder.segments(12, 6),
  });
  builder.cylinder("metal", "#a8a194", {
    radius: 0.092,
    radiusEnd: 0.04,
    length: 0.09,
    at: [x, 0.305, z],
    segments: builder.segments(12, 6),
  });
  builder.bar(
    "metal",
    "#a8a194",
    [x, 0.34, z],
    [x + 0.05, 0.42, z + 0.03],
    0.04,
    6,
  );
  builder.box(
    "matte",
    "#6b4a2f",
    [0.05, 0.2, 0.14],
    [x - 0.13, 0.17, z],
    [0, 0, -0.15],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.02, 0.21, 0.15],
      [x - 0.17, 0.17, z],
      [0, 0, -0.25],
    );
  }
  const hat: Triple = [benchAt.x - 0.25, 0.36, benchAt.z - 0.02];
  builder.cylinder("matte", "#ece6d6", {
    radius: 0.2,
    length: 0.015,
    at: [hat[0], hat[1] + 0.2, hat[2]],
    segments: builder.segments(14, 8),
  });
  builder.cylinder("matte", "#ece6d6", {
    radius: 0.09,
    radiusEnd: 0.08,
    length: 0.09,
    at: [hat[0], hat[1] + 0.25, hat[2]],
    segments: builder.segments(12, 6),
  });
  builder.cylinder("matte", "#3b3e40", {
    radius: 0.2,
    radiusEnd: 0.17,
    length: 0.2,
    at: [hat[0], hat[1] + 0.1, hat[2]],
    segments: builder.segments(14, 8),
    isOpen: true,
  });
  builder.box(
    "matte",
    "#ece6d6",
    [0.4, 0.04, 0.26],
    [benchAt.x + 0.25, 0.38, benchAt.z - 0.05],
    [0, 0.2, 0],
  );
};

/* The honey stall */

const buildStall = (builder: AttractionBuilder) => {
  const place = (x: number, y: number, z: number): Triple => [
    stallAt.x + x * Math.cos(stallTurn) + z * Math.sin(stallTurn),
    y,
    stallAt.z - x * Math.sin(stallTurn) + z * Math.cos(stallTurn),
  ];
  const turn: Triple = [0, stallTurn, 0];
  builder.box("matte", stallTimber, [1.5, 0.8, 0.6], place(0, 0.4, 0), turn);
  if (!builder.isFar) {
    for (let plank = 0; plank < 4; plank++) {
      builder.box(
        "matte",
        shade(stallTimber, 0.82),
        [1.52, 0.02, 0.02],
        place(0, 0.12 + plank * 0.19, 0.305),
        turn,
      );
    }
  }
  builder.box(
    "matte",
    shade(stallTimber, 1.1),
    [1.62, 0.05, 0.7],
    place(0, 0.825, 0.02),
    turn,
  );
  [-0.72, 0.72].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 2.05, 0.07],
      place(side, 1.02, -0.25),
      turn,
    );
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 1.85, 0.07],
      place(side, 0.92, 0.25),
      turn,
    );
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [1.5, 0.04, 0.22],
    place(0, 1.35, -0.25),
    turn,
  );
  const stripes = 8;
  for (let stripe = 0; stripe < stripes; stripe++) {
    const along = -0.8 + (1.6 * (stripe + 0.5)) / stripes;
    builder.box(
      "matte",
      stripe % 2 === 0 ? canopyYellow : palette.cream,
      [1.6 / stripes + 0.002, 0.03, 0.95],
      place(along, 1.97, 0.1),
      [0, stallTurn, 0],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        stripe % 2 === 0 ? canopyYellow : palette.cream,
        [1.6 / stripes + 0.002, 0.16, 0.02],
        place(along, 1.88, 0.57),
        turn,
      );
    }
  }
  const jar = (x: number, y: number, z: number) => {
    builder.cylinder("paint", honey, {
      radius: 0.055,
      length: 0.13,
      at: place(x, y + 0.065, z),
      segments: builder.segments(8, 5),
    });
    if (!builder.isFar) {
      builder.cylinder("matte", "#c23b30", {
        radius: 0.065,
        length: 0.025,
        at: place(x, y + 0.14, z),
        segments: 8,
      });
    }
  };
  [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].forEach((x, index) => {
    jar(x, 0.85, index % 2 === 0 ? 0.12 : -0.02);
  });
  [-0.45, -0.25, -0.05, 0.15, 0.35].forEach((x) => {
    jar(x, 1.37, -0.25);
  });
  builder.cylinder("paint", canopyYellow, {
    radius: 0.22,
    length: 0.04,
    at: place(0.6, 2.25, 0.5),
    axis: "z",
    segments: 6,
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [0.04, 0.3, 0.04],
    place(0.6, 2.05, 0.5),
    turn,
  );
};

/* Bees */

const buildBee = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#e3a81f", 0.04, [0, 0, 0], [0.85, 0.85, 1.3], 6);
  builder.cylinder("matte", "#2a2116", {
    radius: 0.036,
    length: 0.014,
    at: [0, 0, -0.012],
    axis: "z",
    segments: 6,
  });
  builder.sphere("matte", "#2a2116", 0.025, [0, 0.003, 0.05], [1, 1, 1], 5);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#e6eef2",
      [0.06, 0.004, 0.035],
      [side * 0.035, 0.035, -0.005],
      [0, side * -0.3, side * 0.35],
    );
  });
};

const hiveBlockers: LocalBlocker[] = hiveSpots.map(({ x, z }) => ({
  x,
  z,
  radius: 0.45,
}));

export const beehivesModel: AttractionModel = {
  kind: "beehives",
  name: "Beehives",
  fact: "Bees visit flowers to drink sweet nectar. As they go, yellow pollen sticks to their furry bodies and is carried from flower to flower, and that pollen helps the plants make seeds. Honeybees turn the nectar into honey to feed their colony through the winter.",
  curriculumLink:
    "Science, Year 3: plants. The part flowers play in the life cycle of flowering plants, including pollination and seed formation.",
  footprint: 8.9,
  setting: "inland",
  signSpot: { x: -1.6, z: 8.4 },
  build: (builder) => {
    buildGrounds(builder);
    hiveSpots.forEach((spot) => {
      buildHive(builder, spot);
    });
    buildMeadow(builder);
    buildBeekeeping(builder);
    buildStall(builder);
  },
  wanderers: [
    {
      name: "hive bees",
      build: buildBee,
      count: 7,
      centre: { x: 0, z: -2.4 },
      radius: 3.6,
      speed: 1.8,
      height: 0.9,
      bob: 0.45,
    },
    {
      name: "meadow bees",
      build: buildBee,
      count: 4,
      centre: { x: -4.2, z: 3.2 },
      radius: 2.6,
      speed: 1.4,
      height: 0.7,
      bob: 0.35,
    },
    {
      name: "clover bees",
      build: buildBee,
      count: 3,
      centre: { x: 4.6, z: 5.0 },
      radius: 2.2,
      speed: 1.4,
      height: 0.65,
      bob: 0.35,
    },
  ],
  smoke: [
    {
      at: [smokerAt[0] + 0.06, 0.44, smokerAt[2] + 0.04],
      colour: "#e4e2dc",
      puffs: 6,
      size: 0.12,
      rise: 1.2,
      spread: 0.25,
    },
  ],
  blockers: [
    ...hiveBlockers,
    { x: benchAt.x - 0.35, z: benchAt.z, radius: 0.35 },
    { x: benchAt.x + 0.35, z: benchAt.z, radius: 0.35 },
    { x: smokerAt[0], z: smokerAt[2], radius: 0.18 },
    { x: stallAt.x, z: stallAt.z - 0.5, radius: 0.5 },
    { x: stallAt.x, z: stallAt.z + 0.5, radius: 0.5 },
    { x: -6.6, z: -2.8, radius: 0.35 },
    ...hedgeAngles.map((angle) => ({
      x: Math.sin(angle) * hedgeRadius,
      z: Math.cos(angle) * hedgeRadius,
      radius: 0.7,
    })),
  ],
};
