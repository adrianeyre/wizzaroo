import { BoxGeometry, ConeGeometry, CylinderGeometry } from "three";
import {
  addBench,
  addDoor,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addPalm,
  addPot,
  addRock,
  addScrub,
  addSlab,
  buildPerson,
  desert,
  paintBands,
} from "./sandstone-arches-parts.js";

/*
 * A cool, plastered mud-brick house with a tall windcatcher tower on
 * its roof, catching the breeze high above the hot sand and sending it
 * down into the rooms. Climb the outside stairs to the roof terrace,
 * watch the wind vane whirl, and the fountain leaps in the courtyard
 * pool as you pass, while lanterns glow by the door.
 */

const signColour = "#2f6f9a";
const signAt: Triple = [-2.4, 0, 7.0];
const plaster = "#ecd9b4";
const plasterShadow = "#d9c39a";
const lattice = "#7a4e2a";
const tileBlue = "#2f8fae";
const tileWhite = "#f2ece0";
const doorBlue = "#2f7f9a";

const house = { minX: -3.2, maxX: 2.2, minZ: -4.6, maxZ: -1.4, roof: 2.4 };
const tower = { x: -2.25, z: -3.65, half: 0.6, top: 5.5 };
const stairs = { minX: 2.25, maxX: 3.7, bottomZ: 0.4, rise: 0.24, tread: 0.5 };
const stairSteps = Math.round(house.roof / stairs.rise);
const stairTopZ = stairs.bottomZ - stairSteps * stairs.tread;
const parapet = 0.45;

/* ------------------------------------------------------------------ */
/* The house                                                           */
/* ------------------------------------------------------------------ */

const buildHouse = (builder: AttractionBuilder) => {
  const width = house.maxX - house.minX;
  const depth = house.maxZ - house.minZ;
  const middleX = (house.minX + house.maxX) / 2;
  const middleZ = (house.minZ + house.maxZ) / 2;
  builder.painted(
    new BoxGeometry(width, house.roof, depth, 3, 4, 2),
    paintBands([desert.mudBrick, plaster, plaster, plaster], house.roof / 4),
    { at: [middleX, house.roof / 2, middleZ] },
    "matte",
    undefined,
  );
  /* The roof, and a parapet round it with an opening for the stairs */
  builder.box(
    "matte",
    plasterShadow,
    [width + 0.1, 0.06, depth + 0.1],
    [middleX, house.roof + 0.03, middleZ],
  );
  const addParapet = (from: [number, number], to: [number, number]) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    builder.box(
      "matte",
      plaster,
      [
        Math.abs(to[0] - from[0]) + 0.16,
        parapet,
        Math.abs(to[1] - from[1]) + 0.16,
      ],
      [(from[0] + to[0]) / 2, house.roof + parapet / 2, (from[1] + to[1]) / 2],
    );
    if (builder.isFar) {
      return;
    }
    /* Little stepped merlons along its top */
    const merlons = Math.floor(length / 0.6);
    for (let merlon = 0; merlon <= merlons; merlon++) {
      const share = merlons === 0 ? 0.5 : merlon / merlons;
      builder.box(
        "matte",
        plaster,
        [0.2, 0.16, 0.2],
        [
          from[0] + (to[0] - from[0]) * share,
          house.roof + parapet + 0.08,
          from[1] + (to[1] - from[1]) * share,
        ],
      );
    }
  };
  addParapet([house.minX, house.maxZ], [house.maxX, house.maxZ]);
  addParapet([house.minX, house.minZ], [house.maxX, house.minZ]);
  addParapet([house.minX, house.minZ], [house.minX, house.maxZ]);
  addParapet([house.maxX, house.maxZ], [house.maxX, -3.0]);
  /* Palm-trunk beams poking out under the roof */
  if (!builder.isFar) {
    for (let beam = 0; beam < 8; beam++) {
      const x = house.minX + 0.4 + beam * ((width - 0.8) / 7);
      builder.cylinder("matte", desert.palmTrunkDark, {
        radius: 0.07,
        length: 0.4,
        at: [x, house.roof - 0.22, house.maxZ + 0.1],
        axis: "z",
        segments: 6,
      });
    }
  }
  /* The front door, arched, and windows behind wooden lattices */
  addDoor(builder, {
    at: [-0.5, 0, house.maxZ + 0.01],
    width: 0.8,
    height: 1.45,
    colour: doorBlue,
    frame: desert.paleSandstone,
  });
  builder.add(
    "matte",
    desert.paleSandstone,
    new CylinderGeometry(
      0.5,
      0.5,
      0.1,
      builder.segments(14, 6),
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    ).rotateX(Math.PI / 2),
    { at: [-0.5, 1.5, house.maxZ + 0.05] },
  );
  [-2.2, 1.3].forEach((x) => {
    addLattice(builder, [x, 1.2, house.maxZ], 0.8, 0.95);
  });
  addLattice(builder, [-0.5, 2.0, house.maxZ], 0.6, 0.35);
  addLattice(builder, [house.minX, 1.3, -3.0], 0.8, 0.9, -Math.PI / 2);
};

/** A window screened by a wooden lattice (a mashrabiya), facing +z. */
const addLattice = (
  builder: AttractionBuilder,
  at: Triple,
  width: number,
  height: number,
  turn = 0,
) => {
  const out = (along: number, up: number, forward: number): Triple => [
    at[0] + along * Math.cos(turn) + forward * Math.sin(turn),
    at[1] + up,
    at[2] - along * Math.sin(turn) + forward * Math.cos(turn),
  ];
  builder.box(
    "matte",
    desert.charcoal,
    [width, height, 0.04],
    out(0, 0, 0.01),
    [0, turn, 0],
  );
  builder.box(
    "matte",
    lattice,
    [width + 0.16, 0.08, 0.16],
    out(0, -height / 2 - 0.04, 0.08),
    [0, turn, 0],
  );
  builder.box(
    "matte",
    lattice,
    [width + 0.12, 0.08, 0.1],
    out(0, height / 2 + 0.04, 0.05),
    [0, turn, 0],
  );
  if (builder.isFar) {
    return;
  }
  const bars = 5;
  for (let bar = 0; bar <= bars; bar++) {
    builder.box(
      "matte",
      lattice,
      [0.035, height, 0.04],
      out(-width / 2 + (bar * width) / bars, 0, 0.06),
      [0, turn, 0],
    );
    builder.box(
      "matte",
      lattice,
      [width, 0.035, 0.04],
      out(0, -height / 2 + (bar * height) / bars, 0.06),
      [0, turn, 0],
    );
  }
};

/* ------------------------------------------------------------------ */
/* The windcatcher                                                     */
/* ------------------------------------------------------------------ */

const buildWindcatcher = (builder: AttractionBuilder) => {
  const { x, z, half, top } = tower;
  const height = top - house.roof;
  builder.painted(
    new BoxGeometry(half * 2, height, half * 2, 1, 4, 1),
    paintBands(
      [plaster, plaster, plasterShadow, plaster],
      height / 4,
      -house.roof,
    ),
    { at: [x, house.roof + height / 2, z] },
    "matte",
    undefined,
  );
  /* Tall vents on every side, with slats to keep out the sand */
  for (let side = 0; side < 4; side++) {
    const turn = (side * Math.PI) / 2;
    const out = (along: number, up: number, forward: number): Triple => [
      x + along * Math.cos(turn) + forward * Math.sin(turn),
      up,
      z - along * Math.sin(turn) + forward * Math.cos(turn),
    ];
    builder.box(
      "matte",
      desert.charcoal,
      [0.7, 1.3, 0.04],
      out(0, top - 0.95, half + 0.01),
      [0, turn, 0],
    );
    if (!builder.isFar) {
      for (let slat = 0; slat < 5; slat++) {
        builder.box(
          "matte",
          lattice,
          [0.72, 0.04, 0.1],
          out(0, top - 1.5 + slat * 0.27, half + 0.04),
          [0.4, turn, 0],
        );
      }
      [-0.38, 0.38].forEach((along) => {
        builder.box(
          "matte",
          plaster,
          [0.08, 1.35, 0.08],
          out(along, top - 0.95, half + 0.02),
          [0, turn, 0],
        );
      });
    }
  }
  /* A flat cap with a cornice */
  builder.box(
    "matte",
    plasterShadow,
    [half * 2 + 0.24, 0.12, half * 2 + 0.24],
    [x, top + 0.06, z],
  );
  builder.box(
    "matte",
    plaster,
    [half * 2 + 0.12, 0.16, half * 2 + 0.12],
    [x, top + 0.2, z],
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.03,
    length: 0.6,
    at: [x, top + 0.58, z],
    segments: 6,
  });
};

/* ------------------------------------------------------------------ */
/* The stairs and the roof terrace                                     */
/* ------------------------------------------------------------------ */

const stairsMiddleX = (stairs.minX + stairs.maxX) / 2;
const stairsWidth = stairs.maxX - stairs.minX;

const buildStairs = (builder: AttractionBuilder) => {
  for (let step = 1; step <= stairSteps; step++) {
    const top = step * stairs.rise;
    const front = stairs.bottomZ - (step - 1) * stairs.tread;
    const back = step === stairSteps ? house.minZ : front - stairs.tread;
    builder.box(
      "matte",
      step % 2 === 0 ? plaster : plasterShadow,
      [stairsWidth, top, front - back],
      [stairsMiddleX, top / 2, (front + back) / 2],
    );
  }
  /* A sloping wall along the outside of the stairs */
  addSlab(
    builder,
    "matte",
    plaster,
    [stairs.maxX + 0.06, 0.45, stairs.bottomZ],
    [stairs.maxX + 0.06, house.roof + 0.45, stairTopZ],
    0.12,
    0.5,
  );
  builder.box(
    "matte",
    plaster,
    [0.12, parapet, house.minZ - stairTopZ + 0.4],
    [
      stairs.maxX + 0.06,
      house.roof + parapet / 2,
      (house.minZ + stairTopZ) / 2,
    ],
  );
  builder.box(
    "matte",
    plaster,
    [stairsWidth + 0.12, parapet, 0.12],
    [stairsMiddleX, house.roof + parapet / 2, house.minZ - 0.06],
  );
};

const buildRoofTerrace = (builder: AttractionBuilder) => {
  const y = house.roof + 0.06;
  /* A striped rug, cushions, a low table with a tea pot, and plants */
  builder.box("matte", "#a8302a", [2.0, 0.02, 1.4], [0.2, y + 0.01, -2.6]);
  if (!builder.isFar) {
    [-0.6, 0, 0.6].forEach((dx, index) => {
      builder.box(
        "matte",
        index === 1 ? desert.ochreYellow : desert.indigo,
        [0.3, 0.021, 1.38],
        [0.2 + dx, y + 0.012, -2.6],
      );
    });
    [-0.5, 0.9].forEach((dx, index) => {
      builder.roundedBox(
        "matte",
        index === 0 ? desert.ochreYellow : desert.turquoise,
        [0.6, 0.18, 0.5],
        0.06,
        [0.2 + dx, y + 0.11, -3.05],
      );
    });
    builder.cylinder("matte", desert.timber, {
      radius: 0.3,
      length: 0.28,
      at: [0.2, y + 0.14, -2.4],
      segments: 14,
    });
    builder.sphere(
      "metal",
      palette.brass,
      0.1,
      [0.2, y + 0.36, -2.4],
      [1, 0.9, 1],
      10,
    );
    builder.bar(
      "metal",
      palette.brass,
      [0.28, y + 0.38, -2.4],
      [0.4, y + 0.44, -2.4],
      0.03,
      5,
    );
  }
  addPot(builder, [-1.4, y, -1.9], 0.5, desert.terracotta);
  builder.sphere(
    "matte",
    desert.frond,
    0.32,
    [-1.4, y + 0.6, -1.9],
    [1, 0.8, 1],
    10,
  );
  addPot(builder, [-0.9, y, -4.2], 0.45, desert.turquoise);
  builder.sphere(
    "matte",
    desert.frondDark,
    0.3,
    [-0.9, y + 0.55, -4.2],
    [1, 0.8, 1],
    10,
  );
  /* A washing line between the tower and the parapet */
  if (!builder.isFar) {
    builder.bar(
      "matte",
      desert.rope,
      [tower.x + tower.half, y + 2.0, tower.z + 0.3],
      [1.9, y + 1.8, -3.9],
      0.015,
      4,
    );
    const clothes: [number, string][] = [
      [0.4, "#e04a3a"],
      [0.6, palette.white],
      [0.8, desert.ochreYellow],
    ];
    clothes.forEach(([s, colour]) => {
      builder.box(
        "matte",
        colour,
        [0.35, 0.4, 0.02],
        [
          tower.x + tower.half + (1.9 - tower.x - tower.half) * s,
          y + 2.0 - 0.2 * s - 0.22,
          tower.z + 0.3 + (-3.9 - tower.z - 0.3) * s,
        ],
        [0, 0.1, 0],
      );
    });
  }
};

const roofDeck: Deck = ({ x, z }) => {
  if (
    x >= house.minX &&
    x <= house.maxX &&
    z >= house.minZ &&
    z <= house.maxZ
  ) {
    return { height: house.roof + 0.06, kind: "ground" };
  }
  if (
    x > house.maxX &&
    x <= stairs.maxX &&
    z <= stairs.bottomZ &&
    z >= house.minZ
  ) {
    const step = Math.min(
      stairSteps,
      Math.floor((stairs.bottomZ - z) / stairs.tread) + 1,
    );
    return {
      height: step >= stairSteps ? house.roof + 0.06 : step * stairs.rise,
      kind: "ground",
    };
  }
  return undefined;
};

/* ------------------------------------------------------------------ */
/* The courtyard                                                       */
/* ------------------------------------------------------------------ */

const pool = { x: -0.5, z: 1.6, half: 1.0 };

const buildCourtyard = (builder: AttractionBuilder) => {
  /* A tiled courtyard floor in front of the house */
  const tiles = builder.isFar ? 1 : 6;
  const size = 5.6 / tiles;
  for (let row = 0; row < tiles; row++) {
    for (let column = 0; column < tiles; column++) {
      builder.box(
        "matte",
        (row + column) % 2 === 0 ? tileWhite : shade(tileBlue, 1.5),
        [size, 0.04, size * 0.8],
        [
          pool.x - 2.8 + size * (column + 0.5),
          0.02,
          house.maxZ + 0.15 + size * 0.8 * (row + 0.5),
        ],
      );
    }
  }
  /* The pool, edged in blue tiles, with a fountain in the middle */
  builder.box(
    "matte",
    tileBlue,
    [pool.half * 2 + 0.36, 0.28, pool.half * 2 + 0.36],
    [pool.x, 0.14, pool.z],
  );
  builder.box(
    "water",
    desert.water,
    [pool.half * 2, 0.04, pool.half * 2],
    [pool.x, 0.27, pool.z],
  );
  builder.lathe(
    "matte",
    tileWhite,
    [
      [0.25, 0],
      [0.18, 0.3],
      [0.12, 0.42],
      [0.38, 0.5],
      [0.4, 0.58],
      [0.001, 0.58],
    ],
    [pool.x, 0.2, pool.z],
    "y",
    builder.isFar ? 8 : 16,
  );
  /* Wind chimes hanging from a beam end, by the door */
  builder.cylinder("matte", desert.timber, {
    radius: 0.16,
    length: 0.04,
    at: [1.0, 2.0, house.maxZ + 0.3],
    segments: 12,
  });
  builder.bar(
    "metal",
    palette.black,
    [1.0, 2.0, house.maxZ + 0.3],
    [1.0, 2.18, house.maxZ + 0.1],
    0.02,
    4,
  );
  if (!builder.isFar) {
    [0.45, 0.38, 0.32, 0.27, 0.22].forEach((length, chime) => {
      const angle = (chime / 5) * Math.PI * 2;
      builder.cylinder("metal", palette.brass, {
        radius: 0.018,
        length,
        at: [
          1.0 + Math.sin(angle) * 0.11,
          1.94 - length / 2,
          house.maxZ + 0.3 + Math.cos(angle) * 0.11,
        ],
        segments: 6,
      });
    });
  }
  /* Lantern hooks by the door */
  [-1.2, 0.2].forEach((x) => {
    builder.bar(
      "metal",
      palette.black,
      [x, 1.95, house.maxZ],
      [x, 1.95, house.maxZ + 0.3],
      0.03,
      5,
    );
  });
  /* Benches, pots and palms */
  addBench(builder, [-3.6, 0, 1.2], Math.PI / 2, desert.timber);
  addBench(builder, [1.4, 0, 3.6], Math.PI, desert.timber);
  addPot(builder, [-3.4, 0, -0.8], 0.6, desert.terracotta, true);
  addPot(builder, [1.6, 0, -0.9], 0.55, desert.paleTerracotta, true);
  addPot(builder, [1.9, 0, 3.6], 0.5, desert.turquoise);
  addPalm(builder, [-5.6, 0, -2.0], 3.8, [0.1, 0.08], 0.7);
  addPalm(builder, [5.2, 0, -3.8], 3.4, [-0.12, 0.06], 1.8);
  addPalm(builder, [4.6, 0, 3.6], 3.0, [-0.08, -0.1], 2.6);
  [
    [-6.4, 2.2, 0.45],
    [6.2, 0.4, 0.4],
    [-1.4, -6.2, 0.5],
    [3.8, 6.2, 0.35],
    [-5.0, 5.4, 0.4],
  ].forEach(([x, z, scrub], index) => {
    addScrub(
      builder,
      [x, 0, z],
      scrub,
      index % 2 === 0 ? desert.scrub : "#93a052",
    );
  });
  if (!builder.isFar) {
    [
      [-4.8, -4.6],
      [3.6, -6.0],
      [6.8, 2.6],
      [-6.8, -0.4],
    ].forEach(([x, z], index) => {
      addRock(
        builder,
        index % 2 === 0 ? desert.sandstone : desert.paleSandstone,
        [x, 0.08, z],
        [0.24, 0.16, 0.2],
        index * 2.7 + 1,
      );
    });
  }
  /* A sandy path to the sign */
  addSlab(
    builder,
    "matte",
    desert.paleSand,
    [signAt[0], 0.02, signAt[2] - 0.4],
    [-0.5, 0.02, 4.3],
    1.3,
    0.03,
  );
  addSignBoard(builder, signAt, signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts and wanderers                                          */
/* ------------------------------------------------------------------ */

const buildWindVane = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.brass, {
    radius: 0.05,
    length: 0.12,
    at: [0, 0, 0],
    segments: 8,
  });
  for (let arm = 0; arm < 3; arm++) {
    const angle = (arm / 3) * Math.PI * 2;
    const tip: Triple = [Math.sin(angle) * 0.42, 0.02, Math.cos(angle) * 0.42];
    builder.bar("metal", palette.brass, [0, 0.02, 0], tip, 0.025, 5);
    builder.add(
      "metal",
      palette.brass,
      new ConeGeometry(0.1, 0.16, builder.segments(10, 5), 1, true)
        .rotateZ(Math.PI / 2)
        .rotateY(angle),
      { at: tip },
    );
  }
};

const buildFountain = (builder: AttractionBuilder) => {
  builder.cylinder("water", "#c8f0ff", {
    radius: 0.05,
    radiusEnd: 0.02,
    length: 1.0,
    at: [0, 0.5, 0],
    segments: 8,
  });
  builder.add(
    "water",
    "#a8e0f0",
    new ConeGeometry(0.36, 0.7, builder.segments(12, 6), 1, true),
    { at: [0, 0.65, 0], rotation: [Math.PI, 0, 0] },
  );
};

const buildLantern = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.brass, {
    radius: 0.1,
    radiusEnd: 0.02,
    length: 0.12,
    at: [0, -0.06, 0],
    segments: 8,
  });
  builder.add(
    "glow",
    palette.warmLight,
    new CylinderGeometry(0.1, 0.07, 0.24, builder.segments(8, 4)),
    { at: [0, -0.24, 0] },
  );
  builder.add(
    "glow",
    "#ff9a40",
    new ConeGeometry(0.07, 0.12, builder.segments(8, 4)).rotateX(Math.PI),
    { at: [0, -0.42, 0] },
  );
};

const buildCat = (builder: AttractionBuilder) => {
  const fur = "#c8a070";
  builder.sphere("matte", fur, 0.12, [0, 0.18, 0], [0.75, 0.75, 1.5], 8);
  builder.sphere("matte", fur, 0.08, [0, 0.3, 0.18], [1, 1, 1], 8);
  [-1, 1].forEach((side) => {
    builder.add("matte", fur, new ConeGeometry(0.03, 0.07, 4), {
      at: [side * 0.045, 0.39, 0.18],
    });
    builder.bar(
      "matte",
      fur,
      [side * 0.05, 0.12, 0.1],
      [side * 0.05, 0, 0.1],
      0.03,
      4,
    );
    builder.bar(
      "matte",
      fur,
      [side * 0.05, 0.12, -0.1],
      [side * 0.05, 0, -0.1],
      0.03,
      4,
    );
  });
  builder.bar(
    "matte",
    shade(fur, 0.8),
    [0, 0.2, -0.17],
    [0, 0.42, -0.3],
    0.03,
    4,
  );
};

const stairBlockers: LocalBlocker[] = [
  { x: stairs.maxX + 0.25, z: stairs.bottomZ - 0.3, radius: 0.12 },
];

export const windcatcherHouseModel: NewLandAttractionModel = {
  kind: "windcatcher-house",
  islandId: "sunscorch-sands",
  name: "Windcatcher House",
  fact: "A windcatcher is a tall tower on a roof with openings that catch the breeze high above the hot ground. The wind is pushed down the tower into the rooms below and warm air flows out, so the house stays cool without any electricity. Ancient Egyptian houses had wind scoops like this over 3,000 years ago.",
  curriculumLink:
    "History, Key Stage 2: the achievements of the earliest civilizations, a depth study of Ancient Egypt, including how people kept their homes cool.",
  footprint: 9,
  setting: "inland",
  padColour: desert.sand,
  signSpot: { x: signAt[0], z: signAt[2] + 0.9 },
  build: (builder) => {
    buildHouse(builder);
    buildWindcatcher(builder);
    buildStairs(builder);
    buildRoofTerrace(builder);
    buildCourtyard(builder);
  },
  moving: [
    {
      name: "wind-vane",
      pivot: [tower.x, tower.top + 0.9, tower.z],
      build: buildWindVane,
      motion: { kind: "whirl", axis: "y", idle: 0.8, speed: 8, reach: 7 },
    },
    {
      name: "fountain",
      pivot: [pool.x, 0.78, pool.z],
      build: buildFountain,
      motion: { kind: "splash", reach: 5, period: 1.8 },
    },
    ...[-1.2, 0.2].map((x, index): MovingPart => ({
      name: `lantern-${String(index)}`,
      pivot: [x, 1.95, house.maxZ + 0.3],
      build: buildLantern,
      motion: { kind: "wake", reach: 4.5 },
    })),
  ],
  wanderers: [
    {
      name: "cats",
      build: buildCat,
      count: 3,
      centre: { x: 1.2, z: 3.6 },
      radius: 1.8,
      speed: 0.3,
    },
    {
      name: "family",
      build: buildPerson({
        skin: "#b8805a",
        top: "#2f7f9a",
        bottom: "#e8e0d0",
        hair: "#1a1008",
        hat: palette.white,
      }),
      count: 1,
      centre: { x: -2.6, z: 3.2 },
      radius: 1.2,
      speed: 0.25,
    },
  ],
  blockers: [
    { x: pool.x, z: pool.z, radius: pool.half + 0.3 },
    ...stairBlockers,
  ],
  decks: [roofDeck],
  /* Wind chimes on the roof, tinkling as you come near */
  tune: [72, 76, 79, 84, 79, 76],
  play: {
    label: "Open the wind vents",
    news: "Whoosh! You opened the vents at the top of the windcatcher, and a cool breeze swept down the tower into the rooms below.",
  },
};
