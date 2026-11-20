import { CylinderGeometry, SphereGeometry } from "three";
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

const mud = "#6d4c2f";
const wetMud = "#54402a";
const creekWater = "#5f8f6a";
const crocGreen = "#566f3a";
const crocDark = "#3e5229";
const crocBelly = "#c9c08a";
const mouthPink = "#e39a96";
const tooth = "#f4f1e0";
const eyeYellow = "#e8c43a";
const boardTimber = "#9a6d43";
const reedGreen = "#6e8f3a";
const signColour = "#3c6b2f";

const creek = { x: 1.2, z: -1.7, radiusX: 2.6, radiusZ: 1.5 };
const waterLevel = 0.1;
const boardwalk = { minX: -3.3, maxX: 2.9, minZ: 0.55, maxZ: 1.35 };
const platform = { minX: 0.45, maxX: 1.65, minZ: -0.55, maxZ: 0.55 };
const deckHeight = 0.32;

/* The basking crocodile lies on the bank, nose to the water, mouth agape */
const basker = { x: -2.5, z: -1.55 };
const hinge: Triple = [basker.x + 0.82, 0.3, basker.z];
const restGape = 0.32;
const lurker = { x: 2.1, z: -2.0 };

/** A flat oval, such as the creek's water or its muddy bank. */
const addOval = (
  builder: AttractionBuilder,
  finish: "matte" | "water",
  colour: string,
  grow: number,
  height: number,
  thickness: number,
) => {
  builder.add(
    finish,
    colour,
    new CylinderGeometry(1, 1, thickness, builder.segments(32)),
    {
      at: [creek.x, height, creek.z],
      scale: [creek.radiusX + grow, 1, creek.radiusZ + grow],
    },
  );
};

/** A squashed sphere turned about y, the crocodile's building block. */
const addLump = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  scale: Triple,
  turn = 0,
  segments = 12,
) => {
  builder.add(
    "matte",
    colour,
    new SphereGeometry(
      1,
      builder.segments(segments),
      builder.segments(Math.round(segments * 0.6)),
    ),
    { at, rotation: [0, turn, 0], scale },
  );
};

/** A long snout or jaw tapering along +x from `from`. */
const addSnout = (
  builder: AttractionBuilder,
  colour: string,
  from: Triple,
  length: number,
  wide: number,
  tip: number,
  flat: number,
  tilt = 0,
) => {
  builder.add(
    "matte",
    colour,
    new CylinderGeometry(tip, wide, length, builder.segments(12)),
    {
      at: [
        from[0] + (Math.cos(tilt) * length) / 2,
        from[1] + (Math.sin(tilt) * length) / 2,
        from[2],
      ],
      rotation: [0, 0, tilt - Math.PI / 2],
      scale: [flat, 1, 1],
    },
  );
};

const buildCreek = (builder: AttractionBuilder) => {
  addOval(builder, "matte", mud, 1.05, 0.02, 0.04);
  if (!builder.isFar) {
    addOval(builder, "matte", wetMud, 0.35, 0.045, 0.03);
  }
  addOval(builder, "water", creekWater, 0, waterLevel, 0.04);
  if (builder.isFar) {
    return;
  }
  /* Reeds round the water's edge, with bulrush heads */
  [
    [-0.9, -3.0],
    [3.8, -2.4],
    [3.5, -0.4],
    [-1.4, -0.6],
    [1.9, -3.4],
  ].forEach(([x, z], clump) => {
    for (let reed = 0; reed < 5; reed++) {
      const lean = (reed - 2) * 0.1;
      const top: Triple = [
        x + reed * 0.07 + lean,
        0.8 + ((reed + clump) % 3) * 0.18,
        z + lean * 0.5,
      ];
      builder.bar("matte", reedGreen, [x + reed * 0.07, 0, z], top, 0.03, 4);
      if (reed % 2 === 0) {
        builder.cylinder("matte", "#5a3b22", {
          radius: 0.035,
          length: 0.16,
          at: [top[0], top[1] - 0.1, top[2]],
          segments: 6,
        });
      }
    }
  });
  /* Lily pads and a water lily */
  [
    [0.4, -2.2],
    [2.9, -1.2],
    [1.4, -2.9],
  ].forEach(([x, z], index) => {
    builder.cylinder("matte", "#4f8a3a", {
      radius: 0.24 - index * 0.03,
      length: 0.02,
      at: [x, waterLevel + 0.03, z],
      segments: 12,
    });
  });
  builder.sphere(
    "paint",
    "#f6f0f2",
    0.07,
    [0.45, waterLevel + 0.08, -2.2],
    [1, 0.6, 1],
    8,
  );
  /* Claw prints in the mud, where the crocodile slid in */
  for (let print = 0; print < 5; print++) {
    builder.box(
      "matte",
      shade(wetMud, 0.8),
      [0.12, 0.01, 0.1],
      [-1.4 + print * 0.25, 0.05, -1.0 - (print % 2) * 0.25],
    );
  }
};

/** A nest mound of mud and leaves, with eggs peeping out. */
const buildNest = (builder: AttractionBuilder) => {
  const at: Triple = [-3.2, 0, 0.4];
  builder.sphere(
    "matte",
    "#6b5434",
    0.65,
    at,
    [1, 0.5, 1],
    builder.isFar ? 8 : 14,
  );
  if (builder.isFar) {
    return;
  }
  [0.3, 1.5, 2.7, 4.0, 5.2].forEach((turn, index) => {
    builder.box(
      "matte",
      index % 2 === 0 ? "#8a7a3a" : "#5f6f2a",
      [0.3, 0.02, 0.12],
      [
        at[0] + Math.sin(turn) * 0.5,
        0.18 + (index % 2) * 0.05,
        at[2] + Math.cos(turn) * 0.5,
      ],
      [0.3, turn, 0],
    );
  });
  [
    [0, 0.08],
    [0.13, -0.05],
    [-0.12, -0.03],
  ].forEach(([dx, dz]) => {
    builder.sphere(
      "paint",
      "#f1ead6",
      0.09,
      [at[0] + dx, 0.3, at[2] + dz],
      [0.8, 1, 0.8],
      8,
    );
  });
};

const buildBoardwalk = (builder: AttractionBuilder) => {
  const parts = [boardwalk, platform];
  parts.forEach(({ minX, maxX, minZ, maxZ }) => {
    builder.box(
      "matte",
      boardTimber,
      [maxX - minX, 0.08, maxZ - minZ],
      [(minX + maxX) / 2, deckHeight - 0.04, (minZ + maxZ) / 2],
    );
  });
  /* Stilts under the deck */
  const stilts: [number, number][] = [
    [boardwalk.minX + 0.1, boardwalk.minZ + 0.1],
    [boardwalk.minX + 0.1, boardwalk.maxZ - 0.1],
    [boardwalk.maxX - 0.1, boardwalk.minZ + 0.1],
    [boardwalk.maxX - 0.1, boardwalk.maxZ - 0.1],
    [platform.minX + 0.08, platform.minZ + 0.08],
    [platform.maxX - 0.08, platform.minZ + 0.08],
  ];
  if (builder.isFar) {
    return;
  }
  stilts.forEach(([x, z]) => {
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.07,
      length: deckHeight,
      at: [x, deckHeight / 2, z],
      segments: 8,
    });
  });
  /* Planks across the boardwalk, and along the platform */
  const planks = 22;
  for (let plank = 0; plank < planks; plank++) {
    builder.box(
      "matte",
      shade(boardTimber, plank % 2 === 0 ? 1.1 : 0.92),
      [0.24, 0.02, boardwalk.maxZ - boardwalk.minZ - 0.04],
      [
        boardwalk.minX +
          0.15 +
          plank * ((boardwalk.maxX - boardwalk.minX - 0.3) / (planks - 1)),
        deckHeight + 0.01,
        (boardwalk.minZ + boardwalk.maxZ) / 2,
      ],
    );
  }
  for (let plank = 0; plank < 5; plank++) {
    builder.box(
      "matte",
      shade(boardTimber, plank % 2 === 0 ? 0.92 : 1.1),
      [platform.maxX - platform.minX - 0.04, 0.02, 0.18],
      [
        (platform.minX + platform.maxX) / 2,
        deckHeight + 0.01,
        platform.minZ + 0.12 + plank * 0.2,
      ],
    );
  }
  /* A rail round the viewing platform, to keep everyone safe */
  const railHeight = deckHeight + 0.75;
  const railPosts: Triple[] = [
    [platform.minX + 0.04, 0, boardwalk.minZ],
    [platform.minX + 0.04, 0, platform.minZ + 0.04],
    [(platform.minX + platform.maxX) / 2, 0, platform.minZ + 0.04],
    [platform.maxX - 0.04, 0, platform.minZ + 0.04],
    [platform.maxX - 0.04, 0, boardwalk.minZ],
    [boardwalk.minX + 0.05, 0, boardwalk.minZ + 0.04],
    [-1.4, 0, boardwalk.minZ + 0.04],
    [-0.4, 0, boardwalk.minZ + 0.04],
    [2.3, 0, boardwalk.minZ + 0.04],
    [boardwalk.maxX - 0.05, 0, boardwalk.minZ + 0.04],
  ];
  railPosts.forEach(([x, , z]) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 0.75, 0.07],
      [x, deckHeight + 0.37, z],
    );
  });
  const rail = (from: Triple, to: Triple) => {
    [railHeight, deckHeight + 0.4].forEach((y) => {
      builder.bar(
        "matte",
        palette.paleTimber,
        [from[0], y, from[2]],
        [to[0], y, to[2]],
        0.05,
        5,
      );
    });
  };
  rail(railPosts[0], railPosts[1]);
  rail(railPosts[1], railPosts[3]);
  rail(railPosts[3], railPosts[4]);
  rail(railPosts[5], railPosts[0]);
  rail(railPosts[4], railPosts[9]);
  /* Steps up at each end */
  [boardwalk.minX - 0.15, boardwalk.maxX + 0.15].forEach((x) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.3, 0.16, boardwalk.maxZ - boardwalk.minZ],
      [x, 0.08, (boardwalk.minZ + boardwalk.maxZ) / 2],
    );
  });
  /* A pair of binoculars left on the rail */
  [-0.05, 0.05].forEach((dx) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.04,
      length: 0.14,
      at: [1.05 + dx, railHeight + 0.05, platform.minZ + 0.04],
      axis: "z",
      segments: 8,
    });
  });
};

/** The warning sign: a red-edged board with a crocodile on it. */
const buildWarningSign = (builder: AttractionBuilder) => {
  const at: Triple = [3.6, 0, 0.9];
  builder.box(
    "matte",
    palette.darkTimber,
    [0.09, 1.7, 0.09],
    [at[0], 0.85, at[2]],
  );
  builder.box(
    "paint",
    palette.postRed,
    [0.9, 0.62, 0.05],
    [at[0], 1.45, at[2] + 0.06],
    [0, -0.3, 0],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    "#f4e9c8",
    [0.78, 0.5, 0.02],
    [at[0] + 0.01, 1.45, at[2] + 0.09],
    [0, -0.3, 0],
  );
  /* A little crocodile picture, and a line of writing */
  builder.box(
    "paint",
    crocDark,
    [0.46, 0.08, 0.02],
    [at[0] + 0.02, 1.5, at[2] + 0.1],
    [0, -0.3, 0.05],
  );
  builder.box(
    "paint",
    crocDark,
    [0.16, 0.04, 0.02],
    [at[0] + 0.24, 1.55, at[2] + 0.04],
    [0, -0.3, 0.3],
  );
  builder.box(
    "paint",
    palette.black,
    [0.5, 0.04, 0.02],
    [at[0] + 0.01, 1.32, at[2] + 0.1],
    [0, -0.3, 0],
  );
  /* An exclamation mark on a triangle above */
  builder.cylinder("paint", "#f2c94c", {
    radius: 0.2,
    length: 0.03,
    at: [at[0], 1.98, at[2] + 0.05],
    axis: "z",
    segments: 3,
  });
  builder.box(
    "paint",
    palette.black,
    [0.03, 0.12, 0.02],
    [at[0], 2.0, at[2] + 0.08],
  );
};

/** The parts of a crocodile behind its head: body, legs, tail and scutes. */
const addCrocBody = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  isLurking: boolean,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  addLump(builder, crocGreen, place(0, 0.24, 0), [0.85, 0.24, 0.42], turn, 14);
  addLump(builder, crocBelly, place(0.05, 0.17, 0), [0.8, 0.14, 0.4], turn, 10);
  addLump(
    builder,
    crocGreen,
    place(0.72, 0.24, 0),
    [0.32, 0.17, 0.27],
    turn,
    10,
  );
  /* The tail, swishing to one side and tapering to a point */
  const tail: Triple[] = [
    place(-0.7, 0.22, 0),
    place(-1.15, 0.18, 0.12),
    place(-1.6, 0.14, 0.3),
    place(-2.0, 0.1, 0.5),
    place(-2.35, 0.07, 0.62),
  ];
  for (let index = 0; index < tail.length - 1; index++) {
    builder.bar(
      "matte",
      index % 2 === 0 ? crocGreen : shade(crocGreen, 0.94),
      tail[index],
      tail[index + 1],
      0.36 - index * 0.08,
      8,
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Legs splayed out, with clawed feet */
  if (!isLurking) {
    [
      [0.45, 1],
      [0.45, -1],
      [-0.45, 1],
      [-0.45, -1],
    ].forEach(([x, side]) => {
      const foot = place(x + 0.15, 0.04, side * 0.62);
      builder.bar("matte", crocDark, place(x, 0.18, side * 0.3), foot, 0.13, 6);
      addLump(builder, crocDark, foot, [0.12, 0.04, 0.1], turn, 8);
      [-0.05, 0, 0.05].forEach((toe) => {
        builder.box(
          "matte",
          tooth,
          [0.04, 0.02, 0.02],
          place(x + 0.28, 0.03, side * 0.62 + toe),
          [0, turn, 0],
        );
      });
    });
  }
  /* Two rows of bony scutes along the back, meeting on the tail */
  for (let scute = 0; scute < 10; scute++) {
    const x = 0.6 - scute * 0.28;
    const swing = x < -0.7 ? (-0.7 - x) * 0.3 : 0;
    const height = 0.46 - Math.max(0, -x - 0.5) * 0.12;
    [-1, 1].forEach((side) => {
      if (x < -1.2 && side === 1) {
        return;
      }
      const spread = x < -1.2 ? 0 : 0.11;
      builder.cylinder("matte", crocDark, {
        radius: 0.05,
        radiusEnd: 0.005,
        length: 0.1,
        at: place(x, height, side * spread + swing),
        segments: 4,
      });
    });
  }
};

/** The head, but for the upper jaw, built along +x from the hinge. */
const addLowerJaw = (builder: AttractionBuilder, from: Triple) => {
  addSnout(builder, crocBelly, from, 1.0, 0.24, 0.1, 0.32, 0);
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    mouthPink,
    [0.85, 0.02, 0.24],
    [from[0] + 0.45, from[1] + 0.06, from[2]],
  );
  for (let index = 0; index < 7; index++) {
    [-1, 1].forEach((side) => {
      const along = 0.15 + index * 0.12;
      const width = 0.2 - along * 0.09;
      builder.cylinder("paint", tooth, {
        radius: 0.022,
        radiusEnd: 0.003,
        length: 0.07,
        at: [from[0] + along, from[1] + 0.1, from[2] + side * width],
        segments: 4,
      });
    });
  }
};

const buildBasker = (builder: AttractionBuilder) => {
  addCrocBody(builder, [basker.x, 0, basker.z], 0, false);
  addLowerJaw(builder, [hinge[0], hinge[1] - 0.12, hinge[2]]);
  if (builder.isFar) {
    /* The upper jaw, standing still */
    addSnout(builder, crocGreen, hinge, 1.0, 0.25, 0.11, 0.35, restGape);
  }
};

/** The upper jaw, built open a little, so it nods wide and nearly shut. */
const buildUpperJaw = (builder: AttractionBuilder) => {
  const gape = restGape;
  const along = (x: number, y: number, z: number): Triple => [
    x * Math.cos(gape) - y * Math.sin(gape),
    x * Math.sin(gape) + y * Math.cos(gape),
    z,
  ];
  addSnout(builder, crocGreen, [0, 0, 0], 1.05, 0.26, 0.11, 0.38, gape);
  /* The skull behind, the eyes on top, and the nostrils at the tip */
  builder.add("matte", crocGreen, new SphereGeometry(1, 12, 7), {
    at: along(-0.05, 0.05, 0),
    rotation: [0, 0, gape],
    scale: [0.3, 0.16, 0.26],
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      eyeYellow,
      0.075,
      along(0.06, 0.16, side * 0.11),
      [1, 1, 1],
      10,
    );
    builder.box(
      "paint",
      palette.black,
      [0.02, 0.07, 0.02],
      along(0.1, 0.17, side * 0.13),
    );
    builder.sphere(
      "matte",
      crocDark,
      0.08,
      along(0.04, 0.19, side * 0.11),
      [1, 0.45, 1.05],
      8,
    );
    builder.sphere(
      "matte",
      crocDark,
      0.03,
      along(1.0, 0.07, side * 0.04),
      [1, 1, 1],
      6,
    );
  });
  builder.box("paint", mouthPink, [0.85, 0.02, 0.24], along(0.5, -0.05, 0), [
    0,
    0,
    gape,
  ]);
  /* Teeth along both sides, pointing down; count them! */
  for (let index = 0; index < 8; index++) {
    [-1, 1].forEach((side) => {
      const x = 0.12 + index * 0.115;
      const width = 0.22 - x * 0.1;
      builder.add("paint", tooth, new CylinderGeometry(0.003, 0.024, 0.08, 4), {
        at: along(x, -0.08, side * width),
        rotation: [0, 0, gape + Math.PI],
      });
    });
  }
};

const buildLurker = (builder: AttractionBuilder) => {
  addCrocBody(builder, [0, 0, 0], Math.PI, true);
  /* Its head and snout, with eyes and nostrils up out of the water */
  addSnout(builder, crocGreen, [-0.8, 0.34, 0], 1.0, 0.25, 0.11, 0.38, Math.PI);
  addLump(builder, crocGreen, [-0.85, 0.36, 0], [0.28, 0.15, 0.24], 0, 10);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      eyeYellow,
      0.07,
      [-0.9, 0.47, side * 0.1],
      [1, 1, 1],
      10,
    );
    builder.box(
      "paint",
      palette.black,
      [0.02, 0.06, 0.02],
      [-0.96, 0.48, side * 0.12],
    );
    builder.sphere(
      "matte",
      crocDark,
      0.075,
      [-0.88, 0.5, side * 0.1],
      [1, 0.45, 1.05],
      8,
    );
    builder.sphere(
      "matte",
      crocDark,
      0.03,
      [-1.74, 0.42, side * 0.04],
      [1, 1, 1],
      6,
    );
  });
  /* A wide toothy grin along the side */
  for (let index = 0; index < 6; index++) {
    [-1, 1].forEach((side) => {
      builder.cylinder("paint", tooth, {
        radius: 0.02,
        radiusEnd: 0.003,
        length: 0.06,
        at: [-1.0 - index * 0.13, 0.27, side * (0.18 - index * 0.015)],
        segments: 4,
      });
    });
  }
};

const buildFish = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#d9a640", 0.07, [0, 0, 0], [0.6, 0.8, 1.6], 8);
  builder.box("paint", "#c07a2a", [0.01, 0.08, 0.06], [0, 0, -0.13]);
};

const buildDragonfly = (builder: AttractionBuilder) => {
  builder.cylinder("paint", "#2f8fd0", {
    radius: 0.012,
    length: 0.18,
    at: [0, 0, 0],
    axis: "z",
    segments: 5,
  });
  builder.sphere("paint", "#2a6fa8", 0.025, [0, 0, 0.1], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#d8eef8",
      [0.14, 0.004, 0.035],
      [side * 0.075, 0.01, 0.05],
    );
    builder.box(
      "glass",
      "#d8eef8",
      [0.12, 0.004, 0.03],
      [side * 0.065, 0.01, 0.0],
    );
  });
};

const decks: Deck[] = [boardwalk, platform].map((area) =>
  buildFlatDeck(area, deckHeight),
);

export const crocodileCreekModel: CuriosityModel = {
  kind: "crocodile-creek",
  islandId: "jungle-reach",
  name: "Crocodile Creek",
  fact: "A crocodile is a predator at the top of its food chain. Water plants are producers; insects eat them, fish eat the insects, and the crocodile eats the fish, so they are its prey. Crocodiles bask in the sun with their mouths open to cool down, and can grow thousands of new teeth in a lifetime.",
  curriculumLink:
    "Science, Year 4: construct and interpret a variety of food chains, identifying producers, predators and prey.",
  footprint: 5.4,
  setting: "inland",
  signSpot: { x: -1.6, z: 4.3 },
  build: (builder) => {
    buildCreek(builder);
    buildNest(builder);
    buildBoardwalk(builder);
    buildWarningSign(builder);
    buildBasker(builder);
    if (builder.isFar) {
      addSnout(
        builder,
        crocGreen,
        [lurker.x - 0.85, waterLevel, lurker.z],
        1.0,
        0.2,
        0.1,
        0.3,
        Math.PI,
      );
    }
    addSignBoard(builder, [-1.6, 0, 4.3], signColour);
  },
  moving: [
    {
      name: "upper jaw",
      pivot: hinge,
      build: buildUpperJaw,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.28,
        period: 1.5,
      },
    },
    {
      name: "lurking crocodile",
      pivot: [lurker.x, -0.38, lurker.z],
      build: buildLurker,
      motion: { kind: "rise", reach: 6, height: 0.26, period: 2.4 },
    },
  ],
  wanderers: [
    {
      name: "fish",
      build: buildFish,
      count: 4,
      centre: { x: creek.x - 0.4, z: creek.z - 0.2 },
      radius: 1.1,
      speed: 0.35,
      height: waterLevel - 0.05,
    },
    {
      name: "dragonflies",
      build: buildDragonfly,
      count: 4,
      centre: { x: creek.x, z: creek.z },
      radius: 2.0,
      speed: 0.9,
      height: 0.9,
      bob: 0.15,
    },
  ],
  decks,
  blockers: [
    { x: creek.x - 1.3, z: creek.z - 0.1, radius: 1.25 },
    { x: creek.x, z: creek.z - 0.3, radius: 1.2 },
    { x: creek.x + 1.3, z: creek.z - 0.1, radius: 1.25 },
    { x: basker.x, z: basker.z, radius: 0.6 },
    { x: basker.x - 1.5, z: basker.z + 0.3, radius: 0.4 },
    { x: basker.x + 1.2, z: basker.z, radius: 0.35 },
    { x: -3.2, z: 0.4, radius: 0.55 },
    { x: 3.6, z: 0.9, radius: 0.15 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Count its teeth",
    news: "One, two, three… sixteen on top! The crocodile snapped its jaws shut, so you counted from a very safe distance.",
  },
};
