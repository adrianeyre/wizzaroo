import {
  addFence,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const jacketBlue = "#4f6f9a";
const trouserBrown = "#8a6a3e";
const sackCloth = "#d9c08e";
const straw = "#e3c35a";
const strawDark = "#c79f3c";
const hatStraw = "#e8cf7a";
const ribbonRed = "#c2412f";
const patchColours = ["#c84b3a", "#e0b23c", "#6a9a4a", "#9a5fa8"];
const soil = "#6b4a2f";
const soilDark = "#553a24";
const cabbageGreen = "#7fae4f";
const carrotLeaf = "#4f9a3a";
const wheatGold = "#d8b45a";
const crowBlack = "#24252b";
const beakYellow = "#e2a530";
const signColour = "#6a8a3a";

/* The scarecrow stands on its pole in the middle of the patch */
const poleAt = { x: 0, z: -0.4 };
const waistHeight = 1.15;
const bodyPivot: Triple = [poleAt.x, waistHeight, poleAt.z];
const fenceZ = -3.2;
const crowPostX = 1.6;
const crowPivot: Triple = [crowPostX, 0.65, fenceZ];

/* A small, steady random, so the wheat looks the same every time */
const makeRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

/** A tuft of straw: thin cones splayed out from a point along a direction. */
const addStrawTuft = (
  builder: AttractionBuilder,
  at: Triple,
  direction: Triple,
  count: number,
) => {
  for (let index = 0; index < count; index++) {
    const spread = (index - (count - 1) / 2) * 0.07;
    builder.bar(
      "matte",
      index % 2 === 0 ? straw : strawDark,
      at,
      [
        at[0] + direction[0] + spread * (direction[2] === 0 ? 0 : 1),
        at[1] + direction[1] + spread * (direction[1] === 0 ? 1 : 0.4),
        at[2] + direction[2] + spread * (direction[2] === 0 ? 1 : 0),
      ],
      0.03,
      4,
    );
  }
};

/** The waving top half: jacket, arms, head and hat, about the waist. */
const buildScarecrowTop = (builder: AttractionBuilder) => {
  /* The upper pole and the crossbar the arms are tied to */
  builder.cylinder("matte", palette.timber, {
    radius: 0.06,
    length: 1.2,
    at: [0, 0.6, 0],
    segments: 8,
  });
  builder.box("matte", palette.timber, [1.9, 0.09, 0.09], [0, 0.62, -0.05]);
  /* The patched jacket */
  builder.roundedBox(
    "matte",
    jacketBlue,
    [0.66, 0.78, 0.36],
    0.12,
    [0, 0.42, 0],
  );
  builder.box(
    "matte",
    shade(jacketBlue, 0.75),
    [0.04, 0.7, 0.02],
    [0, 0.42, 0.185],
  );
  [0.62, 0.45, 0.28].forEach((y) => {
    builder.cylinder("paint", palette.brass, {
      radius: 0.035,
      length: 0.02,
      at: [0.06, y, 0.19],
      axis: "z",
      segments: 8,
    });
  });
  /* Patches sewn on, each with big cross stitches */
  [
    { at: [-0.18, 0.28, 0.185], size: 0.18, colour: patchColours[0] },
    { at: [0.2, 0.6, 0.185], size: 0.14, colour: patchColours[1] },
    { at: [-0.16, 0.6, -0.185], size: 0.2, colour: patchColours[2] },
  ].forEach(({ at, size, colour }) => {
    const [x, y, z] = at;
    builder.box("matte", colour, [size, size, 0.02], [x, y, z]);
    [-1, 1].forEach((slant) => {
      builder.box(
        "matte",
        palette.cream,
        [size * 0.5, 0.015, 0.025],
        [x + size * 0.35, y, z],
        [0, 0, slant * 0.6],
      );
    });
  });
  /* A rope belt with straw poking out below */
  builder.torus("matte", strawDark, 0.27, 0.025, [0, 0.06, 0], "y", 20);
  for (let index = 0; index < 9; index++) {
    const angle = (index / 9) * Math.PI * 2;
    builder.bar(
      "matte",
      index % 2 === 0 ? straw : strawDark,
      [Math.sin(angle) * 0.24, 0.05, Math.cos(angle) * 0.14],
      [Math.sin(angle) * 0.34, -0.18, Math.cos(angle) * 0.22],
      0.03,
      4,
    );
  }
  /* Sleeves along the crossbar, one patched, with straw hands */
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", shade(jacketBlue, side < 0 ? 1 : 0.92), {
      radius: 0.12,
      radiusEnd: 0.1,
      length: 0.6,
      at: [side * 0.6, 0.62, -0.02],
      axis: "x",
      segments: 12,
    });
    builder.torus(
      "matte",
      shade(jacketBlue, 0.7),
      0.1,
      0.025,
      [side * 0.9, 0.62, -0.02],
      "x",
      12,
    );
    addStrawTuft(builder, [side * 0.92, 0.62, -0.02], [side * 0.22, 0, 0], 5);
  });
  builder.box(
    "matte",
    patchColours[3],
    [0.16, 0.12, 0.02],
    [0.6, 0.66, 0.11],
    [0.15, 0, 0],
  );
  /* A red neckerchief */
  builder.cylinder("matte", ribbonRed, {
    radius: 0.13,
    radiusEnd: 0.17,
    length: 0.1,
    at: [0, 0.85, 0],
    segments: 14,
  });
  builder.bar(
    "matte",
    ribbonRed,
    [0.05, 0.84, 0.15],
    [0.12, 0.66, 0.22],
    0.07,
    4,
  );
  /* The sack head, tied at the neck, with a stitched smile */
  builder.sphere("matte", sackCloth, 0.27, [0, 1.13, 0], [1, 1.05, 0.95], 16);
  builder.torus("matte", strawDark, 0.12, 0.02, [0, 0.9, 0], "y", 12);
  [-0.09, 0.09].forEach((x) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.045,
      length: 0.03,
      at: [x, 1.18, 0.245],
      axis: "z",
      segments: 10,
    });
    builder.box(
      "matte",
      palette.cream,
      [0.05, 0.012, 0.012],
      [x, 1.18, 0.262],
      [0, 0, 0.8],
    );
  });
  builder.cylinder("paint", "#e07a2a", {
    radius: 0.04,
    radiusEnd: 0.005,
    length: 0.16,
    at: [0, 1.09, 0.3],
    axis: "z",
    segments: 8,
  });
  for (let stitch = 0; stitch < 7; stitch++) {
    const angle = ((stitch - 3) / 3) * 0.75;
    builder.box(
      "matte",
      palette.black,
      [0.035, 0.012, 0.012],
      [Math.sin(angle) * 0.14, 1.0 + (1 - Math.cos(angle)) * 0.12, 0.24],
      [0, 0, angle],
    );
  }
  /* Straw hair poking out under the hat */
  [-1, 1].forEach((side) => {
    addStrawTuft(builder, [side * 0.22, 1.26, 0], [side * 0.12, -0.14, 0], 4);
  });
  /* The straw hat with a ribbon band and a flower */
  builder.cylinder("matte", hatStraw, {
    radius: 0.46,
    radiusEnd: 0.43,
    length: 0.035,
    at: [0, 1.31, 0],
    segments: 24,
  });
  builder.torus(
    "matte",
    shade(hatStraw, 0.85),
    0.45,
    0.018,
    [0, 1.31, 0],
    "y",
    24,
  );
  builder.lathe(
    "matte",
    hatStraw,
    [
      [0.22, 0],
      [0.21, 0.12],
      [0.17, 0.22],
      [0, 0.25],
    ],
    [0, 1.32, 0],
    "y",
    18,
  );
  builder.cylinder("matte", ribbonRed, {
    radius: 0.222,
    length: 0.06,
    at: [0, 1.36, 0],
    segments: 18,
  });
  builder.sphere(
    "paint",
    palette.white,
    0.05,
    [0.2, 1.38, 0.09],
    [1, 0.6, 1],
    8,
  );
  builder.sphere("paint", "#f2c430", 0.025, [0.23, 1.39, 0.1], [1, 1, 1], 6);
};

/** A crow, facing +z, standing on y = 0. */
const buildCrow = (builder: AttractionBuilder) => {
  builder.sphere("matte", crowBlack, 0.12, [0, 0.13, 0], [0.85, 0.8, 1.3], 8);
  builder.sphere("matte", crowBlack, 0.075, [0, 0.24, 0.12], [1, 1, 1], 8);
  builder.cylinder("paint", beakYellow, {
    radius: 0.03,
    radiusEnd: 0.002,
    length: 0.09,
    at: [0, 0.23, 0.22],
    axis: "z",
    segments: 6,
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.white,
      0.016,
      [side * 0.05, 0.26, 0.17],
      [1, 1, 1],
      4,
    );
    builder.box(
      "matte",
      shade(crowBlack, 1.3),
      [0.03, 0.09, 0.2],
      [side * 0.095, 0.15, -0.02],
      [0.3, 0, side * 0.15],
    );
    builder.bar(
      "paint",
      beakYellow,
      [side * 0.04, 0.06, 0.02],
      [side * 0.04, 0, 0.04],
      0.015,
      4,
    );
  });
  builder.box(
    "matte",
    crowBlack,
    [0.12, 0.03, 0.16],
    [0, 0.13, -0.18],
    [-0.4, 0, 0],
  );
};

/** The crow on the fence, flapping its wings as it lifts off. */
const buildFenceCrow = (builder: AttractionBuilder) => {
  buildCrow(builder);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      crowBlack,
      [0.26, 0.02, 0.14],
      [side * 0.2, 0.2, -0.02],
      [0, 0, side * 0.5],
    );
  });
};

const buildPole = (builder: AttractionBuilder) => {
  builder.cylinder("matte", palette.timber, {
    radius: 0.07,
    length: waistHeight,
    at: [poleAt.x, waistHeight / 2, poleAt.z],
    segments: builder.isFar ? 6 : 10,
  });
  builder.cylinder("matte", soilDark, {
    radius: 0.35,
    radiusEnd: 0.2,
    length: 0.12,
    at: [poleAt.x, 0.06, poleAt.z],
    segments: builder.isFar ? 8 : 16,
  });
  if (builder.isFar) {
    /* Still stand-ins for the waving top half */
    builder.box(
      "matte",
      jacketBlue,
      [0.66, 0.78, 0.36],
      [poleAt.x, waistHeight + 0.42, poleAt.z],
    );
    builder.box(
      "matte",
      jacketBlue,
      [1.9, 0.2, 0.2],
      [poleAt.x, waistHeight + 0.62, poleAt.z],
    );
    builder.sphere(
      "matte",
      sackCloth,
      0.27,
      [poleAt.x, waistHeight + 1.13, poleAt.z],
      [1, 1, 1],
      8,
    );
    builder.cylinder("matte", hatStraw, {
      radius: 0.46,
      radiusEnd: 0.15,
      length: 0.25,
      at: [poleAt.x, waistHeight + 1.42, poleAt.z],
      segments: 10,
    });
    return;
  }
  /* Baggy trousers dangling from the waist, with straw at the ankles */
  [-1, 1].forEach((side) => {
    const x = poleAt.x + side * 0.15;
    builder.cylinder(
      "matte",
      side < 0 ? trouserBrown : shade(trouserBrown, 0.9),
      {
        radius: 0.13,
        radiusEnd: 0.15,
        length: 0.62,
        at: [x, waistHeight - 0.32, poleAt.z],
        segments: 12,
      },
    );
    addStrawTuft(builder, [x, waistHeight - 0.64, poleAt.z], [0, -0.2, 0], 4);
  });
  builder.box(
    "matte",
    patchColours[1],
    [0.14, 0.14, 0.02],
    [poleAt.x - 0.16, waistHeight - 0.4, poleAt.z + 0.15],
  );
  [-0.12, 0.12].forEach((x) => {
    builder.box(
      "matte",
      shade(trouserBrown, 0.7),
      [0.04, 0.5, 0.02],
      [poleAt.x + x, waistHeight + 0.15, poleAt.z + 0.19],
    );
  });
};

/* Raised beds of vegetables on the west, the wheat on the east */
const bedRows = [-1.5, -0.6, 0.3, 1.2];

const buildPatch = (builder: AttractionBuilder) => {
  bedRows.forEach((z) => {
    builder.box("matte", soil, [2.0, 0.16, 0.55], [-2.2, 0.08, z]);
    if (!builder.isFar) {
      builder.box("matte", soilDark, [2.0, 0.05, 0.12], [-2.2, 0.17, z]);
    }
  });
  /* The wheat stands as a golden block from afar */
  builder.box("matte", wheatGold, [1.9, 0.75, 2.6], [2.25, 0.375, -0.3]);
  builder.box("matte", palette.path, [0.9, 0.03, 3.4], [0, 0.015, 2.4]);
  if (builder.isFar) {
    return;
  }
  /* Cabbages on two rows, carrots on the others */
  bedRows.forEach((z, row) => {
    for (let index = 0; index < 4; index++) {
      const x = -3.0 + index * 0.52;
      if (row % 2 === 0) {
        builder.sphere(
          "matte",
          index % 2 === 0 ? cabbageGreen : shade(cabbageGreen, 0.88),
          0.18,
          [x, 0.26, z],
          [1, 0.75, 1],
          9,
        );
        builder.sphere(
          "matte",
          shade(cabbageGreen, 1.18),
          0.1,
          [x, 0.33, z],
          [1, 0.8, 1],
          7,
        );
      } else {
        builder.cylinder("paint", "#e07a2a", {
          radius: 0.05,
          length: 0.04,
          at: [x, 0.18, z],
          segments: 8,
        });
        [-1, 0, 1].forEach((lean) => {
          builder.bar(
            "matte",
            carrotLeaf,
            [x, 0.18, z],
            [x + lean * 0.08, 0.42, z + lean * 0.03],
            0.03,
            4,
          );
        });
      }
    }
  });
  /* Wheat: stalks with plump ears, standing above the block */
  const random = makeRandom(7);
  for (let index = 0; index < 30; index++) {
    const x = 1.4 + random() * 1.7;
    const z = -1.5 + random() * 2.4;
    const top = 0.95 + random() * 0.3;
    const lean = (random() - 0.5) * 0.15;
    builder.bar(
      "matte",
      shade(wheatGold, 0.9),
      [x, 0.7, z],
      [x + lean, top, z],
      0.02,
      3,
    );
    builder.sphere(
      "matte",
      index % 3 === 0 ? shade(wheatGold, 1.12) : wheatGold,
      0.035,
      [x + lean * 1.1, top + 0.07, z],
      [1, 2.4, 1],
      5,
    );
  }
  /* A trug of picked vegetables and a watering can by the path */
  const trug: Triple = [-0.9, 0, 1.8];
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.32,
    radiusEnd: 0.22,
    length: 0.18,
    at: [trug[0], 0.09, trug[2]],
    segments: 14,
  });
  builder.torus(
    "matte",
    palette.timber,
    0.26,
    0.02,
    [trug[0], 0.22, trug[2]],
    "x",
    14,
  );
  [
    { dx: -0.1, dz: 0.06, colour: cabbageGreen },
    { dx: 0.12, dz: -0.04, colour: "#e07a2a" },
    { dx: 0.02, dz: -0.12, colour: "#b8344a" },
  ].forEach(({ dx, dz, colour }) => {
    builder.sphere(
      "matte",
      colour,
      0.09,
      [trug[0] + dx, 0.2, trug[2] + dz],
      [1, 0.8, 1],
      8,
    );
  });
  const can: Triple = [0.85, 0, 1.7];
  builder.cylinder("metal", "#4f8a5a", {
    radius: 0.14,
    length: 0.3,
    at: [can[0], 0.15, can[2]],
    segments: 14,
  });
  builder.bar(
    "metal",
    "#4f8a5a",
    [can[0] + 0.1, 0.12, can[2]],
    [can[0] + 0.38, 0.32, can[2]],
    0.04,
    6,
  );
  builder.torus(
    "metal",
    "#4f8a5a",
    0.11,
    0.018,
    [can[0], 0.32, can[2]],
    "z",
    12,
  );
  /* A seed tray the crows are after */
  builder.box(
    "matte",
    palette.paleTimber,
    [0.5, 0.08, 0.35],
    [-0.7, 0.04, -1.9],
  );
  for (let seed = 0; seed < 6; seed++) {
    builder.box(
      "matte",
      wheatGold,
      [0.05, 0.02, 0.03],
      [-0.88 + seed * 0.07, 0.09, -1.92 + (seed % 2) * 0.08],
    );
  }
};

const buildFence = (builder: AttractionBuilder) => {
  addFence(
    builder,
    { x: -3.2, z: fenceZ },
    { x: 3.2, z: fenceZ },
    {
      colour: palette.timber,
      height: 0.6,
      spacing: 0.4,
      isPicket: false,
      finish: "matte",
    },
  );
};

export const scarecrowModel: CuriosityModel = {
  kind: "scarecrow",
  islandId: "meadow-isle",
  name: "Scarecrow",
  fact: "Farmers put scarecrows in their fields to frighten away birds such as crows, which love to eat seeds and young plants. Crows are clever birds with black feathers, a strong beak and two legs. A scarecrow looks a bit like a person, so the birds think someone is watching them!",
  curriculumLink:
    "Science, Year 1: animals, including humans. Identify and name a variety of common animals including birds, and describe and compare their structure.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: 1.7, z: 3.4 },
  build: (builder) => {
    buildPatch(builder);
    buildPole(builder);
    buildFence(builder);
    addSignBoard(builder, [1.7, 0, 3.4], signColour);
  },
  moving: [
    {
      name: "scarecrow",
      pivot: bodyPivot,
      build: buildScarecrowTop,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 7,
        amplitude: 0.22,
        period: 1.4,
      },
    },
    {
      name: "crow on the fence",
      pivot: crowPivot,
      build: buildFenceCrow,
      motion: { kind: "rise", reach: 6, height: 1.1, period: 0.6 },
    },
  ],
  wanderers: [
    {
      name: "crows",
      build: buildCrow,
      count: 3,
      centre: { x: -0.4, z: -2.1 },
      radius: 0.9,
      speed: 0.3,
    },
  ],
  blockers: [
    { x: poleAt.x, z: poleAt.z, radius: 0.5 },
    { x: -2.2, z: -0.15, radius: 1.0 },
    { x: -2.2, z: -1.2, radius: 0.6 },
    { x: -2.2, z: 0.9, radius: 0.6 },
    { x: 2.25, z: -0.3, radius: 1.1 },
    { x: 2.25, z: -1.2, radius: 0.6 },
    { x: 2.25, z: 0.6, radius: 0.6 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Scare the crows",
    news: "Caw! Caw! The scarecrow flapped its arms and the crows flew off the seeds in a flurry of black feathers.",
  },
};
