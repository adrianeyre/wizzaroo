import { ConeGeometry, Shape } from "three";
import {
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowWhite = "#fbfdff";
const snowShadow = "#d5e1ea";
const iceBlue = "#c4e4f3";
const deckTimber = "#9a6a3e";
const hay = "#d9b45a";
const firGreen = "#2f5e45";
const signColour = "#2f6f9a";

/* The run comes down the hill towards the visitors (+z) */
const hill = { minX: -0.5, maxX: 1.7, topZ: -2.4, bottomZ: 2.5, height: 1.6 };
const runX = 0.6;
const platform = { minX: -0.3, maxX: 1.5, minZ: -3.5, maxZ: hill.topZ };
const stepWidth = 0.4;
const stepHeights = [0.4, 0.8, 1.2];
const balesZ = 3.25;
const signAt: Triple = [-2.4, 0, 3.3];
const startFlagAt: Triple = [
  platform.maxX - 0.05,
  hill.height + 1.6,
  platform.minZ + 0.15,
];
const lightAt: Triple = [
  platform.minX + 0.12,
  hill.height + 1.5,
  platform.minZ + 0.12,
];
const rideStart = { x: runX, z: (platform.minZ + platform.maxZ) / 2 };
const rideFinish = { x: runX + 1.6, z: 2.6 };

/** The hill's height, steep at the top and running out flat at the bottom. */
const hillHeightAt = (z: number): number => {
  const share = Math.min(
    1,
    Math.max(0, (z - hill.topZ) / (hill.bottomZ - hill.topZ)),
  );
  return hill.height * (1 - share) ** 1.7;
};

const profileSteps = 14;
const listProfile = (steps: number): [number, number][] =>
  Array.from({ length: steps + 1 }, (_, index) => {
    const z = hill.topZ + ((hill.bottomZ - hill.topZ) * index) / steps;
    return [z, hillHeightAt(z)];
  });

/* ------------------------------------------------------------------ */
/* The hill and its run                                                */
/* ------------------------------------------------------------------ */

const buildHill = (builder: AttractionBuilder) => {
  const profile = listProfile(builder.isFar ? 5 : profileSteps);
  /* Drawn side on (shape x is -z) and pushed across the hill's width */
  const side = new Shape();
  side.moveTo(-hill.bottomZ, 0);
  profile
    .slice()
    .reverse()
    .forEach(([z, height]) => {
      side.lineTo(-z, height);
    });
  side.lineTo(-hill.topZ, 0);
  side.closePath();
  builder.sidePlate(
    "matte",
    snowWhite,
    side,
    (hill.minX + hill.maxX) / 2,
    hill.maxX - hill.minX,
  );
  if (builder.isFar) {
    return;
  }
  /* The icy groove, and the packed snow banks that keep the sledges in */
  for (let index = 0; index < profile.length - 1; index++) {
    const [fromZ, fromY] = profile[index];
    const [toZ, toY] = profile[index + 1];
    const length = Math.hypot(toZ - fromZ, toY - fromY);
    const angle = Math.atan2(fromY - toY, toZ - fromZ);
    builder.box(
      "glass",
      index % 2 === 0 ? iceBlue : shade(iceBlue, 1.04),
      [0.62, 0.03, length + 0.02],
      [runX, (fromY + toY) / 2 + 0.015, (fromZ + toZ) / 2],
      [angle, 0, 0],
    );
    [-1, 1].forEach((sideX) => {
      builder.bar(
        "matte",
        snowShadow,
        [runX + sideX * 0.42, fromY + 0.06, fromZ],
        [runX + sideX * 0.42, toY + 0.06, toZ],
        0.2,
        8,
      );
    });
  }
  /* Soft drifts against the hill's sides */
  [hill.minX, hill.maxX].forEach((x, index) => {
    [-1.2, 0.6].forEach((z) => {
      builder.sphere(
        "matte",
        snowShadow,
        0.55,
        [x + (index === 0 ? -0.1 : 0.1), hillHeightAt(z) * 0.45, z],
        [0.6, Math.max(0.4, hillHeightAt(z) * 0.9), 1.6],
        10,
      );
    });
  });
};

/* ------------------------------------------------------------------ */
/* The starting platform and its steps                                 */
/* ------------------------------------------------------------------ */

const buildPlatform = (builder: AttractionBuilder) => {
  const width = platform.maxX - platform.minX;
  const depth = platform.maxZ - platform.minZ;
  const middleX = (platform.minX + platform.maxX) / 2;
  const middleZ = (platform.minZ + platform.maxZ) / 2;
  builder.box(
    "matte",
    deckTimber,
    [width, 0.12, depth],
    [middleX, hill.height - 0.06, middleZ],
  );
  /* The steps, solid timber blocks up the left-hand side */
  stepHeights.forEach((height, index) => {
    const maxX = platform.minX - (stepHeights.length - 1 - index) * stepWidth;
    builder.box(
      "matte",
      index % 2 === 0 ? deckTimber : shade(deckTimber, 0.9),
      [stepWidth, height, depth],
      [maxX - stepWidth / 2, height / 2, middleZ],
    );
  });
  [platform.minX + 0.08, platform.maxX - 0.08].forEach((x) => {
    [platform.minZ + 0.08, platform.maxZ - 0.08].forEach((z) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.14, hill.height, 0.14],
        [x, hill.height / 2, z],
      );
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Boards across the deck and the treads */
  for (let board = 0; board < 6; board++) {
    builder.box(
      "matte",
      shade(deckTimber, board % 2 === 0 ? 1.1 : 0.95),
      [width + 0.02, 0.02, depth / 6 - 0.02],
      [
        middleX,
        hill.height + 0.005,
        platform.minZ + (board + 0.5) * (depth / 6),
      ],
    );
  }
  stepHeights.forEach((height, index) => {
    const maxX = platform.minX - (stepHeights.length - 1 - index) * stepWidth;
    builder.box(
      "matte",
      snowWhite,
      [stepWidth - 0.04, 0.04, depth - 0.1],
      [maxX - stepWidth / 2, height + 0.02, middleZ],
    );
  });
  /* Cross braces underneath */
  [platform.minZ + 0.08, platform.maxZ - 0.08].forEach((z) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [platform.minX + 0.1, 0.2, z],
      [platform.maxX - 0.1, hill.height - 0.2, z],
      0.07,
      5,
    );
  });
  /* A rail round the back and right-hand side */
  const railHeight = hill.height + 0.75;
  [
    [platform.minX, platform.minZ, platform.maxX, platform.minZ],
    [platform.maxX, platform.minZ, platform.maxX, platform.maxZ],
  ].forEach(([fromX, fromZ, toX, toZ]) => {
    builder.bar(
      "paint",
      "#c8342c",
      [fromX, railHeight, fromZ],
      [toX, railHeight, toZ],
      0.06,
      6,
    );
    builder.bar(
      "paint",
      "#c8342c",
      [fromX, railHeight - 0.35, fromZ],
      [toX, railHeight - 0.35, toZ],
      0.04,
      6,
    );
    for (let post = 0; post <= 3; post++) {
      const share = post / 3;
      const x = fromX + (toX - fromX) * share;
      const z = fromZ + (toZ - fromZ) * share;
      builder.box(
        "paint",
        palette.white,
        [0.06, 0.75, 0.06],
        [x, hill.height + 0.375, z],
      );
    }
  });
  /* A toboggan waiting at the top, curled at the front */
  const sledge: Triple = [runX - 0.55, hill.height, platform.minZ + 0.55];
  for (let slat = 0; slat < 4; slat++) {
    builder.box(
      "paint",
      "#d8342c",
      [0.09, 0.03, 0.9],
      [sledge[0] - 0.15 + slat * 0.1, sledge[1] + 0.05, sledge[2]],
    );
  }
  builder.bar(
    "paint",
    "#d8342c",
    [sledge[0], sledge[1] + 0.05, sledge[2] + 0.45],
    [sledge[0], sledge[1] + 0.25, sledge[2] + 0.55],
    0.38,
    8,
  );
  /* The starting light's post */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.04,
    length: 1.45,
    at: [lightAt[0], hill.height + 0.72, lightAt[2]],
    segments: 8,
  });
  builder.box(
    "paint",
    palette.black,
    [0.22, 0.3, 0.16],
    [lightAt[0], lightAt[1], lightAt[2] - 0.02],
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.04,
    length: 1.6,
    at: [startFlagAt[0], startFlagAt[1] - 0.8, startFlagAt[2]],
    segments: 8,
  });
};

/** The starter's chequered flag, waved as you come near. */
const buildStartFlag = (builder: AttractionBuilder) => {
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 4; column++) {
      builder.box(
        "paint",
        (row + column) % 2 === 0 ? palette.black : palette.white,
        [0.02, 0.14, 0.14],
        [0, -0.15 - row * 0.14, 0.12 + column * 0.14],
      );
    }
  }
  builder.sphere("metal", palette.brass, 0.05, [0, 0.02, 0], [1, 1, 1], 8);
};

const buildStartLight = (builder: AttractionBuilder) => {
  builder.sphere("glow", "#59f07a", 0.08, [0, 0, 0.1], [1, 1, 0.6], 12);
};

/* ------------------------------------------------------------------ */
/* Flags, bales and trees                                              */
/* ------------------------------------------------------------------ */

const flagPoles = [-1.0, 0.4, 1.7].flatMap((z) => [
  { x: hill.minX - 0.15, z },
  { x: hill.maxX + 0.15, z },
]);

const buildFlagPoles = (builder: AttractionBuilder) => {
  flagPoles.forEach(({ x, z }, index) => {
    const base = hillHeightAt(z) * 0.3;
    builder.cylinder("paint", palette.white, {
      radius: 0.03,
      length: 1.5,
      at: [x, base + 0.75, z],
      segments: 6,
    });
    if (builder.isFar) {
      return;
    }
    /* A pennant streaming out from the hill, in red, blue and yellow */
    const out = x < runX ? -1 : 1;
    builder.add(
      "paint",
      ["#d8342c", "#2f6fb8", "#f0b62e"][index % 3],
      new ConeGeometry(0.13, 0.45, 3)
        .rotateZ((out * -Math.PI) / 2)
        .scale(1, 1, 0.15),
      { at: [x + out * 0.24, base + 1.38, z] },
    );
  });
};

/** Bunting strung across the run between each pair of poles. */
const buildBunting = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [-1.0, 0.4, 1.7].forEach((z, row) => {
    const y = hillHeightAt(z) * 0.3 + 1.45;
    const fromX = hill.minX - 0.15;
    const toX = hill.maxX + 0.15;
    builder.bar("matte", palette.white, [fromX, y, z], [toX, y, z], 0.015, 4);
    for (let flag = 0; flag < 8; flag++) {
      const x = fromX + 0.2 + flag * ((toX - fromX - 0.4) / 7);
      const sag = 0.1 * Math.sin(((x - fromX) / (toX - fromX)) * Math.PI);
      builder.add(
        "paint",
        ["#d8342c", "#f0b62e", "#2f6fb8", "#3f9a4a"][(flag + row) % 4],
        new ConeGeometry(0.08, 0.2, 3).rotateX(Math.PI).scale(1, 1, 0.2),
        { at: [x, y - sag - 0.1, z] },
      );
    }
  });
};

/** An arctic hare, white for winter, with black-tipped ears. */
const buildHare = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    "#f7f8fa",
    0.16,
    [0, 0.17, 0],
    [0.85, 0.85, 1.25],
    10,
  );
  builder.sphere("matte", "#f7f8fa", 0.1, [0, 0.3, 0.16], [0.9, 0.95, 1], 10);
  builder.sphere("matte", "#ffffff", 0.05, [0, 0.2, -0.19], [1, 1, 1], 6);
  builder.sphere("paint", "#d9a0a8", 0.015, [0, 0.29, 0.26], [1, 1, 1], 4);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      "#f2f2f4",
      0.035,
      [side * 0.04, 0.45, 0.12],
      [0.8, 3, 0.6],
      6,
    );
    builder.sphere(
      "matte",
      palette.black,
      0.02,
      [side * 0.04, 0.54, 0.12],
      [0.9, 1.4, 0.7],
      4,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [side * 0.06, 0.33, 0.23],
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "matte",
      "#eceef1",
      0.05,
      [side * 0.07, 0.04, -0.06],
      [0.7, 0.5, 1.8],
      6,
    );
  });
};

const buildBales = (builder: AttractionBuilder) => {
  /* A wall of hay bales to stop at, two rows high in the middle */
  [-0.9, 0, 0.9, 1.8].forEach((offset, index) => {
    const x = runX - 0.45 + offset;
    builder.box("matte", hay, [0.85, 0.45, 0.5], [x, 0.225, balesZ]);
    if (builder.isFar) {
      return;
    }
    builder.box(
      "matte",
      shade(hay, 0.92),
      [0.86, 0.04, 0.51],
      [x, 0.36, balesZ],
    );
    builder.box(
      "matte",
      "#8a6a3a",
      [0.02, 0.46, 0.52],
      [x - 0.2, 0.225, balesZ],
    );
    builder.box(
      "matte",
      "#8a6a3a",
      [0.02, 0.46, 0.52],
      [x + 0.2, 0.225, balesZ],
    );
    if (index === 1 || index === 2) {
      builder.box(
        "matte",
        shade(hay, 1.06),
        [0.85, 0.45, 0.5],
        [x, 0.675, balesZ + 0.02],
        [0, 0.05, 0],
      );
      builder.box(
        "paint",
        "#d8342c",
        [0.86, 0.08, 0.02],
        [x, 0.7, balesZ + 0.28],
      );
    }
  });
};

const addFir = (builder: AttractionBuilder, at: Triple, size: number) => {
  const [x, , z] = at;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.09 * size,
    length: 0.5 * size,
    at: [x, 0.25 * size, z],
    segments: 6,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const radius = (0.75 - tier * 0.2) * size;
    const y = (0.45 + tier * 0.5) * size;
    builder.add(
      "matte",
      shade(firGreen, 1 + tier * 0.06),
      new ConeGeometry(radius, 0.85 * size, builder.segments(10)),
      {
        at: [x, y + 0.42 * size, z],
      },
    );
    if (!builder.isFar) {
      builder.add(
        "matte",
        snowWhite,
        new ConeGeometry(radius * 0.55, 0.32 * size, 10),
        {
          at: [x, y + 0.72 * size, z],
        },
      );
    }
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  addFir(builder, [-2.7, 0, -1.8], 1.15);
  addFir(builder, [3.0, 0, -2.4], 1.0);
  if (builder.isFar) {
    return;
  }
  addFir(builder, [-3.4, 0, 0.6], 0.8);
  addFir(builder, [3.6, 0, 0.2], 0.7);
  /* A timing board at the bottom: the best time today */
  const board: Triple = [3.0, 0, 2.4];
  [-0.35, 0.35].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 1.4, 0.07],
      [board[0] + side, 0.7, board[2]],
    );
  });
  builder.box(
    "paint",
    "#1f3b57",
    [0.9, 0.5, 0.05],
    [board[0], 1.2, board[2]],
    [0, -0.5, 0],
  );
  [0, 1, 2].forEach((digit) => {
    builder.box(
      "glow",
      "#ffd27a",
      [0.16, 0.24, 0.01],
      [board[0] - 0.22 + digit * 0.22, 1.2, board[2] + 0.03],
      [0, -0.5, 0],
    );
  });
  /* Snow drifts, and a spare plastic sledge leaning on the bales */
  [
    [-3.6, -2.6, 0.6],
    [1.6, -3.9, 0.6],
    [-1.3, 3.8, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowWhite, size, [x, 0, z], [1.5, 0.45, 1], 10);
  });
  builder.box(
    "paint",
    "#2f6fb8",
    [0.55, 0.85, 0.05],
    [runX + 1.75, 0.45, balesZ - 0.35],
    [-0.35, 0.2, 0],
  );
};

/* ------------------------------------------------------------------ */
/* The ride and decks                                                  */
/* ------------------------------------------------------------------ */

const sledgeRide = (progress: number): LocalSpot => {
  if (progress < 0.15) {
    /* Sitting down on the sledge at the top */
    return {
      x: runX,
      y: hill.height,
      z: rideStart.z + progress * 2,
      heading: 0,
    };
  }
  if (progress < 0.85) {
    const share = ((progress - 0.15) / 0.7) ** 1.6;
    const startZ = rideStart.z + 0.3;
    const z = startZ + (balesZ - 0.55 - startZ) * share;
    return {
      x: runX,
      y: (z < hill.topZ ? hill.height : hillHeightAt(z)) + 0.05,
      z,
      heading: 0,
    };
  }
  const share = (progress - 0.85) / 0.15;
  return {
    x: runX + (rideFinish.x - runX) * share,
    y: 0.05 * (1 - share),
    z: balesZ - 0.55 + (rideFinish.z - balesZ + 0.55) * share,
    heading: Math.PI / 2,
  };
};

const hillDeck: Deck = ({ x, z }) =>
  x >= hill.minX && x <= hill.maxX && z >= hill.topZ && z <= hill.bottomZ
    ? { height: hillHeightAt(z), kind: "trail" }
    : undefined;

const stepDecks: Deck[] = stepHeights.map((height, index) => {
  const maxX = platform.minX - (stepHeights.length - 1 - index) * stepWidth;
  return buildFlatDeck(
    { minX: maxX - stepWidth, maxX, minZ: platform.minZ, maxZ: platform.maxZ },
    height,
  );
});

export const tobogganRunModel: CuriosityModel = {
  kind: "toboggan-run",
  islandId: "frost-isle",
  name: "Toboggan Run",
  fact: "A toboggan is a sledge for sliding down snowy hills. Sledges are made of smooth materials like wood, plastic and metal, because smooth things slide easily over snow and ice, while rough things grip and slow down. At the bottom, soft and squashy hay bales make a safe place to stop.",
  curriculumLink:
    "Science, Year 2: identify and compare the suitability of a variety of everyday materials, including wood, metal and plastic, for particular uses.",
  footprint: 4.7,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildHill(builder);
    buildPlatform(builder);
    buildFlagPoles(builder);
    buildBales(builder);
    buildBunting(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "starter's flag",
      pivot: startFlagAt,
      build: buildStartFlag,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.5, period: 0.9 },
    },
    {
      name: "starting light",
      pivot: lightAt,
      build: buildStartLight,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "arctic hares",
      build: buildHare,
      count: 2,
      centre: { x: -2.7, z: 1.6 },
      radius: 0.9,
      speed: 0.5,
      bob: 0.12,
    },
  ],
  decks: [
    buildFlatDeck(
      {
        minX: platform.minX,
        maxX: platform.maxX,
        minZ: platform.minZ,
        maxZ: platform.maxZ + 0.01,
      },
      hill.height,
    ),
    ...stepDecks,
    hillDeck,
  ],
  rides: [
    {
      id: "toboggan",
      name: "the toboggan run",
      start: rideStart,
      reach: 0.6,
      seconds: 7,
      finish: rideFinish,
      follow: sledgeRide,
    },
  ],
  blockers: [
    ...[-0.9, 0, 0.9, 1.8].map((offset) => ({
      x: runX - 0.45 + offset,
      z: balesZ,
      radius: 0.42,
    })),
    { x: -2.7, z: -1.8, radius: 0.35 },
    { x: 3.0, z: -2.4, radius: 0.3 },
    { x: -3.4, z: 0.6, radius: 0.25 },
    { x: 3.6, z: 0.2, radius: 0.25 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Race down the run",
    news: "Wheee! Your smooth sledge slid down the icy run and bumped to a stop in the soft hay bales.",
  },
};
