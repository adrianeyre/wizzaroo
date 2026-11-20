import { ConeGeometry } from "three";
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
  addBasket,
  addGrassTuft,
  addLump,
  addPalm,
  addPerson,
  addPot,
  addSheet,
  addTaperedBar,
  followMovingSeat,
  sands,
  type Palm,
} from "./date-palm-grove-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const papyrusGreen = "#5f8f34";
const papyrusLight = "#86b04a";
const papyrusSheet = "#ead9a8";
const papyrusStrip = "#d9c98a";
const poolWater = "#2f9fb0";
const nileMud = "#7d6646";
const ink = "#1f1d1b";
const ochreRed = "#b5452c";
const signColour = sands.turquoise;

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const pool = { x: -3.0, z: -2.2, radius: 2.6 };
const islandRadius = 0.85;
const raftLane = 1.75;
const workshop = { minX: 0.8, maxX: 4.8, minZ: -3.6, maxZ: 0.0, floor: 0.2 };
const roofHeight = 2.45;
const pressAt = { x: 3.9, z: -1.5 };
const scribeAt = { x: -4.3, z: 3.4 };
const ibisAt: Triple = [-0.75, 0, -3.7];
const palms: readonly Palm[] = [
  { x: 6.5, z: -2.6, height: 4.0, lean: -0.8, curve: 0.7 },
  { x: -6.7, z: 2.2, height: 3.7, lean: 1.0, curve: 0.8 },
];

/* ------------------------------------------------------------------ */
/* Papyrus reeds                                                       */
/* ------------------------------------------------------------------ */

/** A clump of papyrus stems, each topped with a spray like a firework. */
const addPapyrusClump = (
  builder: AttractionBuilder,
  at: Triple,
  stems: number,
  height: number,
  seed: number,
) => {
  const count = builder.isFar ? Math.ceil(stems / 3) : stems;
  for (let stem = 0; stem < count; stem++) {
    const angle = stem * 2.4 + seed;
    const lean = 0.12 + (stem % 3) * 0.06;
    const tall = height * (0.8 + 0.25 * Math.abs(Math.sin(stem * 1.7 + seed)));
    const top: Triple = [
      at[0] + Math.sin(angle) * lean * tall,
      at[1] + tall,
      at[2] + Math.cos(angle) * lean * tall,
    ];
    builder.bar(
      "matte",
      stem % 2 === 0 ? papyrusGreen : shade(papyrusGreen, 1.1),
      [at[0] + Math.sin(angle) * 0.08, at[1], at[2] + Math.cos(angle) * 0.08],
      top,
      0.035,
      builder.isFar ? 3 : 4,
    );
    builder.add(
      "matte",
      stem % 3 === 0 ? papyrusLight : shade(papyrusLight, 0.9),
      new ConeGeometry(0.28, 0.32, builder.isFar ? 4 : 7, 1, true),
      { at: [top[0], top[1] + 0.12, top[2]], rotation: [Math.PI, angle, 0] },
    );
  }
};

/* ------------------------------------------------------------------ */
/* The pool                                                            */
/* ------------------------------------------------------------------ */

const buildPool = (builder: AttractionBuilder) => {
  const { x, z, radius } = pool;
  builder.lathe(
    "matte",
    sands.paleStone,
    [
      [radius + 0.3, 0.01],
      [radius + 0.25, 0.14],
      [radius, 0.14],
      [radius - 0.05, 0.02],
    ],
    [x, 0, z],
    "y",
    40,
  );
  builder.cylinder("matte", nileMud, {
    radius: radius - 0.04,
    length: 0.02,
    at: [x, 0.0, z],
    segments: 36,
  });
  builder.cylinder("water", poolWater, {
    radius: radius - 0.02,
    length: 0.02,
    at: [x, 0.07, z],
    segments: 36,
  });
  /* The reed island in the middle. */
  builder.cylinder("matte", nileMud, {
    radius: islandRadius,
    radiusEnd: islandRadius - 0.2,
    length: 0.18,
    at: [x, 0.09, z],
    segments: 16,
  });
  addPapyrusClump(builder, [x, 0.16, z], 12, 2.0, 0.3);
  /* Clumps round the edge, leaving the front clear. */
  [2.1, 2.8, 3.5, 4.3, 5.0].forEach((angle, index) => {
    addPapyrusClump(
      builder,
      [
        x + Math.sin(angle) * (radius - 0.35),
        0.06,
        z + Math.cos(angle) * (radius - 0.35),
      ],
      5,
      1.6,
      index * 1.3,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Lotus pads and flowers. */
  [
    [-1.4, 0.6],
    [1.2, 1.3],
    [0.9, -1.3],
    [-1.2, -1.0],
  ].forEach(([dx, dz], index) => {
    builder.cylinder("matte", index % 2 === 0 ? "#4f8236" : "#62953e", {
      radius: 0.2,
      length: 0.02,
      at: [x + dx, 0.09, z + dz],
      segments: 10,
    });
    builder.add(
      "matte",
      index === 1 ? "#f4f0f6" : "#8fb6e6",
      new ConeGeometry(0.08, 0.12, 6, 1, true),
      {
        at: [x + dx + 0.05, 0.16, z + dz],
        rotation: [Math.PI, 0, 0],
      },
    );
  });
  /* A little jetty where the raft calls. */
  builder.box(
    "matte",
    palette.paleTimber,
    [0.9, 0.08, 0.7],
    [x, 0.18, z + radius + 0.05],
  );
};

/* ------------------------------------------------------------------ */
/* The workshop                                                        */
/* ------------------------------------------------------------------ */

/** A column shaped like a bundle of papyrus stems, with a closed bud on top. */
const addBundleColumn = (builder: AttractionBuilder, base: Triple) => {
  const height = roofHeight - base[1];
  builder.lathe(
    "matte",
    sands.paleStone,
    [
      [0, 0],
      [0.2, 0],
      [0.2, 0.08],
      [0.16, 0.14],
      [0.14, height * 0.78],
      [0.2, height * 0.88],
      [0.12, height - 0.08],
      [0.2, height - 0.06],
      [0.2, height],
      [0, height],
    ],
    base,
    "y",
    builder.isFar ? 6 : 12,
  );
  if (builder.isFar) {
    return;
  }
  [0.22, 0.26, 0.3].forEach((share, index) => {
    builder.cylinder("paint", index === 1 ? ochreRed : sands.turquoise, {
      radius: 0.15,
      length: 0.04,
      at: [base[0], base[1] + height * (0.7 + share * 0.2), base[2]],
      segments: 10,
    });
  });
};

const buildWorkshop = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ, floor } = workshop;
  const midX = (minX + maxX) / 2;
  const midZ = (minZ + maxZ) / 2;
  builder.box(
    "matte",
    sands.paleStone,
    [maxX - minX, floor, maxZ - minZ],
    [midX, floor / 2, midZ],
  );
  /* The back wall, painted with a frieze. */
  builder.box(
    "matte",
    sands.sandstone,
    [maxX - minX, roofHeight, 0.3],
    [midX, roofHeight / 2, minZ + 0.15],
  );
  [minX + 0.25, midX, maxX - 0.25].forEach((x) => {
    addBundleColumn(builder, [x, floor, maxZ - 0.3]);
  });
  addBundleColumn(builder, [minX + 0.25, floor, midZ - 0.3]);
  addBundleColumn(builder, [maxX - 0.25, floor, midZ - 0.3]);
  /* A flat roof of beams and palm-frond thatch. */
  builder.box(
    "matte",
    palette.paleTimber,
    [maxX - minX + 0.3, 0.14, maxZ - minZ + 0.3],
    [midX, roofHeight + 0.07, midZ],
  );
  builder.box(
    "matte",
    sands.thatch,
    [maxX - minX + 0.5, 0.1, maxZ - minZ + 0.5],
    [midX, roofHeight + 0.2, midZ],
  );
  if (!builder.isFar) {
    for (let beam = 0; beam < 6; beam++) {
      builder.box(
        "matte",
        palette.timber,
        [0.12, 0.12, maxZ - minZ + 0.6],
        [minX + 0.2 + beam * ((maxX - minX - 0.4) / 5), roofHeight + 0.3, midZ],
      );
    }
    /* Hieroglyphs: an eye, a reed, water and a bird. */
    const glyphs: readonly [string, Triple, Triple][] = [
      [sands.lapis, [0.5, 0.12, 0.02], [0, 0, 0]],
      [ochreRed, [0.08, 0.4, 0.02], [0, 0, 0.2]],
      [sands.turquoise, [0.4, 0.06, 0.02], [0, 0, 0]],
      [ink, [0.18, 0.3, 0.02], [0, 0, -0.3]],
    ];
    for (let row = 0; row < 2; row++) {
      for (let glyph = 0; glyph < 6; glyph++) {
        const [colour, size, rotation] = glyphs[(glyph + row) % glyphs.length];
        builder.box(
          "paint",
          colour,
          size,
          [minX + 0.5 + glyph * 0.62, 1.55 + row * 0.5, minZ + 0.31],
          rotation,
        );
      }
    }
    builder.box(
      "paint",
      sands.gold,
      [maxX - minX - 0.2, 0.06, 0.02],
      [midX, 2.15, minZ + 0.31],
    );
    builder.box(
      "paint",
      sands.lapis,
      [maxX - minX - 0.2, 0.06, 0.02],
      [midX, 1.25, minZ + 0.31],
    );
  }
  /* The long table, where strips are laid in two layers, crossways. */
  const tableAt = { x: 2.1, z: -1.5 };
  builder.box(
    "matte",
    palette.timber,
    [1.7, 0.08, 0.9],
    [tableAt.x, floor + 0.75, tableAt.z],
  );
  [-0.75, 0.75].forEach((dx) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 0.75, 0.8],
      [tableAt.x + dx, floor + 0.37, tableAt.z],
    );
  });
  builder.box(
    "matte",
    papyrusSheet,
    [0.9, 0.02, 0.7],
    [tableAt.x + 0.3, floor + 0.8, tableAt.z],
  );
  if (!builder.isFar) {
    for (let strip = 0; strip < 6; strip++) {
      builder.box(
        "matte",
        strip % 2 === 0 ? papyrusStrip : shade(papyrusStrip, 1.06),
        [0.1, 0.015, 0.72],
        [tableAt.x - 0.45 + strip * 0.11, floor + 0.81, tableAt.z],
      );
    }
    for (let strip = 0; strip < 5; strip++) {
      builder.box(
        "matte",
        shade(papyrusStrip, 0.95),
        [0.6, 0.015, 0.1],
        [tableAt.x - 0.15, floor + 0.83, tableAt.z - 0.28 + strip * 0.13],
      );
    }
    /* A worker laying strips, and a bundle of cut stems. */
    addPerson(builder, [tableAt.x, floor, tableAt.z + 0.75], Math.PI, {
      skin: sands.skin,
      cloth: palette.white,
      head: "hair",
    });
    for (let stem = 0; stem < 7; stem++) {
      builder.cylinder("matte", stem % 2 === 0 ? papyrusGreen : papyrusLight, {
        radius: 0.05,
        length: 1.6,
        at: [1.3, floor + 0.06 + (stem % 3) * 0.09, -2.8 + stem * 0.07],
        axis: "x",
        segments: 5,
      });
    }
  }
  /* The soaking trough. */
  builder.box(
    "matte",
    sands.sandstone,
    [1.3, 0.4, 0.5],
    [3.4, floor + 0.2, -3.0],
  );
  builder.box("water", poolWater, [1.1, 0.02, 0.32], [3.4, floor + 0.39, -3.0]);
  /* The press: boards on a stack of drying sheets, under a heavy stone. */
  builder.box(
    "matte",
    palette.paleTimber,
    [0.9, 0.5, 0.9],
    [pressAt.x, floor + 0.25, pressAt.z],
  );
  builder.box(
    "matte",
    papyrusSheet,
    [0.8, 0.12, 0.8],
    [pressAt.x, floor + 0.56, pressAt.z],
  );
  builder.box(
    "matte",
    palette.timber,
    [0.9, 0.06, 0.9],
    [pressAt.x, floor + 0.65, pressAt.z],
  );
};

const buildPressStone = (builder: AttractionBuilder) => {
  addLump(builder, palette.darkStone, [0, 0.15, 0], [0.32, 0.15, 0.3], 1.3, 1);
  builder.torus("metal", palette.darkSteel, 0.08, 0.02, [0, 0.32, 0], "z", 10);
};

/* ------------------------------------------------------------------ */
/* The scribe and the drying racks                                     */
/* ------------------------------------------------------------------ */

const buildScribe = (builder: AttractionBuilder) => {
  const { x, z } = scribeAt;
  builder.box("matte", "#c9a85e", [1.6, 0.02, 1.2], [x, 0.01, z]);
  builder.box("matte", ochreRed, [1.4, 0.025, 0.08], [x, 0.015, z - 0.45]);
  /* A sunshade on four poles. */
  [-0.85, 0.85].forEach((dx) => {
    [-0.7, 0.7].forEach((dz) => {
      builder.cylinder("matte", palette.paleTimber, {
        radius: 0.04,
        length: 2.0,
        at: [x + dx, 1.0, z + dz],
        segments: 6,
      });
    });
  });
  addSheet(builder, "matte", palette.white, [
    [x - 0.95, 2.0, z - 0.8],
    [x + 0.95, 2.0, z - 0.8],
    [x + 0.95, 1.9, z + 0.8],
    [x - 0.95, 1.9, z + 0.8],
  ]);
  if (builder.isFar) {
    return;
  }
  addPerson(builder, [x, 0, z - 0.1], 0.4, {
    skin: sands.skinDark,
    cloth: palette.white,
    head: "hair",
    isSitting: true,
  });
  /* A scroll across the scribe's lap, a palette and ink pots. */
  builder.cylinder("matte", papyrusSheet, {
    radius: 0.04,
    length: 0.5,
    at: [x + 0.05, 0.3, z + 0.12],
    axis: "x",
    segments: 6,
  });
  builder.box(
    "matte",
    papyrusSheet,
    [0.4, 0.01, 0.28],
    [x + 0.05, 0.28, z + 0.28],
  );
  builder.box(
    "paint",
    palette.paleTimber,
    [0.3, 0.03, 0.08],
    [x + 0.45, 0.03, z + 0.3],
  );
  [ink, ochreRed].forEach((colour, index) => {
    builder.cylinder("paint", colour, {
      radius: 0.025,
      length: 0.02,
      at: [x + 0.38 + index * 0.1, 0.055, z + 0.3],
      segments: 6,
    });
  });
  /* Shelves of rolled scrolls behind. */
  builder.box("matte", palette.timber, [1.2, 1.0, 0.35], [x, 0.5, z - 1.05]);
  for (let shelf = 0; shelf < 3; shelf++) {
    for (let scroll = 0; scroll < 5; scroll++) {
      builder.cylinder(
        "matte",
        scroll % 2 === 0 ? papyrusSheet : shade(papyrusSheet, 0.92),
        {
          radius: 0.06,
          length: 0.3,
          at: [x - 0.45 + scroll * 0.22, 0.2 + shelf * 0.3, z - 0.86],
          axis: "z",
          segments: 6,
        },
      );
    }
  }
};

const buildRacks = (builder: AttractionBuilder) => {
  [
    { x: 2.0, z: 2.6, turn: 0.1 },
    { x: 4.1, z: 2.2, turn: -0.2 },
  ].forEach(({ x, z, turn }) => {
    const across = (along: number, up: number, out: number): Triple => [
      x + Math.cos(turn) * along + Math.sin(turn) * out,
      up,
      z - Math.sin(turn) * along + Math.cos(turn) * out,
    ];
    [-0.75, 0.75].forEach((along) => {
      builder.bar(
        "matte",
        palette.darkTimber,
        across(along, 0, 0.3),
        across(along, 1.4, -0.1),
        0.06,
        5,
      );
      builder.bar(
        "matte",
        palette.darkTimber,
        across(along, 0, -0.5),
        across(along, 1.4, -0.1),
        0.06,
        5,
      );
    });
    builder.bar(
      "matte",
      palette.timber,
      across(-0.85, 1.4, -0.1),
      across(0.85, 1.4, -0.1),
      0.05,
      5,
    );
    /* Sheets leaning in the sun to dry. */
    [-0.38, 0.38].forEach((along, index) => {
      addSheet(
        builder,
        "matte",
        index === 0 ? papyrusSheet : shade(papyrusSheet, 0.95),
        [
          across(along - 0.33, 1.35, -0.08),
          across(along + 0.33, 1.35, -0.08),
          across(along + 0.33, 0.35, 0.22),
          across(along - 0.33, 0.35, 0.22),
        ],
      );
    });
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A path from the sign to the workshop and the pool. */
  builder.box(
    "matte",
    sands.paleSand,
    [1.3, 0.015, 6.5],
    [1.1, 0.008, 3.6],
    [0, 0.15, 0],
  );
  palms.forEach((palm, index) => {
    addPalm(builder, palm, index);
  });
  /* A carved stone with a prayer to Thoth, god of writing. */
  builder.box(
    "matte",
    sands.paleStone,
    [1.0, 1.7, 0.3],
    [6.3, 0.85, 1.4],
    [0, -0.5, 0],
  );
  builder.add(
    "matte",
    sands.paleStone,
    new ConeGeometry(0.71, 0.3, 4).rotateY(Math.PI / 4),
    {
      at: [6.3, 1.85, 1.4],
      rotation: [0, -0.5, 0],
      scale: [1, 1, 0.3],
    },
  );
  if (builder.isFar) {
    return;
  }
  for (let line = 0; line < 4; line++) {
    builder.box(
      "paint",
      line % 2 === 0 ? sands.lapis : ochreRed,
      [0.6, 0.06, 0.02],
      [6.3 - 0.075, 1.4 - line * 0.25, 1.4 + 0.13],
      [0, -0.5, 0],
    );
  }
  addPot(builder, [-0.5, 0, 1.6], 0.16);
  addPot(builder, [-0.15, 0, 1.9], 0.12, sands.deepTerracotta);
  addBasket(builder, [0.5, 0, -4.6], 0.26, papyrusGreen);
  [
    [6.9, -5.3, 0.4],
    [-6.4, -5.6, 0.45],
    [-1.6, 7.0, 0.3],
  ].forEach(([x, z, size], index) => {
    addLump(
      builder,
      sands.sandstone,
      [x, size * 0.3, z],
      [size * 1.3, size * 0.7, size],
      index * 2.2,
    );
  });
  [
    [-7.2, -1.4],
    [5.4, 5.6],
    [-3.2, 6.4],
  ].forEach(([x, z]) => {
    addGrassTuft(builder, [x, 0, z], 1.1);
  });
};

const addIbisLegs = (builder: AttractionBuilder) => {
  [-0.05, 0.05].forEach((dx) => {
    builder.bar(
      "matte",
      ink,
      [ibisAt[0] + dx, 0, ibisAt[2]],
      [ibisAt[0] + dx, 0.5, ibisAt[2]],
      0.02,
      4,
    );
  });
};

const buildPapyrusWorkshop = (builder: AttractionBuilder) => {
  buildGrounds(builder);
  buildPool(builder);
  buildWorkshop(builder);
  buildScribe(builder);
  buildRacks(builder);
  addIbisLegs(builder);
  addSignBoard(builder, [1.6, 0, 7.4], signColour);
};

/* ------------------------------------------------------------------ */
/* The raft, the ibis and the wanderers                                */
/* ------------------------------------------------------------------ */

const buildRaft = (builder: AttractionBuilder) => {
  /* A boat of papyrus bundles tied together, with upturned ends. */
  [-0.18, 0, 0.18].forEach((dx, index) => {
    builder.cylinder("matte", index === 1 ? papyrusLight : papyrusGreen, {
      radius: 0.14,
      length: 1.8,
      at: [dx, 0.16, 0],
      axis: "z",
      segments: 8,
    });
  });
  [-1, 1].forEach((end) => {
    addTaperedBar(
      builder,
      "matte",
      papyrusGreen,
      [0, 0.16, end * 0.85],
      [0, 0.65, end * 1.25],
      0.2,
      0.06,
      8,
    );
  });
  if (builder.isFar) {
    return;
  }
  for (let tie = 0; tie < 5; tie++) {
    builder.torus(
      "matte",
      "#b8894f",
      0.3,
      0.02,
      [0, 0.16, -0.7 + tie * 0.35],
      "z",
      10,
    );
  }
  /* A boatman with a punting pole. */
  addPerson(builder, [0, 0.28, -0.55], 0, {
    skin: sands.skin,
    cloth: palette.white,
    head: "wrap",
    headColour: palette.white,
  });
  builder.bar(
    "matte",
    palette.paleTimber,
    [0.22, -0.3, -0.7],
    [0.3, 2.0, -0.4],
    0.035,
    4,
  );
};

const raftPivot: Triple = [pool.x, 0, pool.z];
const raftMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: raftLane,
  count: 1,
  speed: -0.32,
  isFacingAlong: true,
  bob: 0.03,
};

const buildIbis = (builder: AttractionBuilder) => {
  /* The ibis, bird of Thoth, dipping its long beak for food. */
  builder.sphere(
    "matte",
    palette.white,
    0.18,
    [0, 0.0, 0.05],
    [0.8, 0.75, 1.3],
    10,
  );
  builder.sphere("matte", ink, 0.1, [0, 0.02, -0.18], [0.8, 0.6, 1.2], 8);
  addTaperedBar(
    builder,
    "matte",
    ink,
    [0, 0.08, 0.2],
    [0, 0.35, 0.28],
    0.04,
    0.03,
    5,
  );
  builder.sphere("matte", ink, 0.06, [0, 0.38, 0.3], [1, 1, 1.2], 8);
  addTaperedBar(
    builder,
    "matte",
    ink,
    [0, 0.37, 0.35],
    [0, 0.18, 0.62],
    0.02,
    0.006,
    4,
  );
};

const buildCat = (builder: AttractionBuilder) => {
  const coat = "#c9a46a";
  builder.sphere("matte", coat, 0.12, [0, 0.18, 0], [0.8, 0.85, 1.6], 8);
  builder.sphere("matte", coat, 0.08, [0, 0.3, 0.2], [1, 0.95, 1], 8);
  [-1, 1].forEach((side) => {
    builder.add("matte", coat, new ConeGeometry(0.03, 0.07, 4), {
      at: [side * 0.045, 0.39, 0.2],
    });
    [-1, 1].forEach((end) => {
      builder.bar(
        "matte",
        coat,
        [side * 0.05, 0.14, end * 0.11],
        [side * 0.05, 0, end * 0.12],
        0.03,
        4,
      );
    });
  });
  addTaperedBar(
    builder,
    "matte",
    shade(coat, 0.8),
    [0, 0.22, -0.18],
    [0, 0.42, -0.32],
    0.02,
    0.012,
    4,
  );
  builder.torus("paint", sands.gold, 0.05, 0.01, [0, 0.27, 0.15], "y", 8);
};

const buildDragonfly = (builder: AttractionBuilder) => {
  builder.cylinder("paint", sands.turquoise, {
    radius: 0.012,
    length: 0.16,
    at: [0, 0, 0],
    axis: "z",
    segments: 4,
  });
  [-1, 1].forEach((side) => {
    addSheet(builder, "glass", "#d8f0f4", [
      [0, 0, 0.03],
      [side * 0.12, 0.01, 0.05],
      [side * 0.12, 0.01, 0.0],
    ]);
  });
};

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

const raftStart = { x: pool.x, z: pool.z + pool.radius + 0.75 };
const raftFinish = { x: -0.2, z: -1.0 };

const floorDeck: Deck = ({ x, z }) =>
  x >= workshop.minX &&
  x <= workshop.maxX &&
  z >= workshop.minZ + 0.3 &&
  z <= workshop.maxZ
    ? { height: workshop.floor, kind: "ground" }
    : undefined;

const blockers: LocalBlocker[] = [
  { x: pool.x, z: pool.z, radius: islandRadius + 0.1 },
  ...palms.map((palm) => ({ x: palm.x, z: palm.z, radius: 0.3 })),
];

export const papyrusWorkshopModel: NewLandAttractionModel = {
  kind: "papyrus-workshop",
  islandId: "sunscorch-sands",
  name: "Papyrus Workshop",
  fact: "The Ancient Egyptians made paper from papyrus, a tall reed that grew beside the River Nile. They cut the stems into thin strips, laid them in two layers crossways, then pressed and dried them into smooth sheets. Scribes wrote on them in hieroglyphs with reed pens, and our word 'paper' comes from 'papyrus'.",
  curriculumLink:
    "History, Key Stage 2: the achievements of the earliest civilizations. A depth study of Ancient Egypt: writing, hieroglyphs and papyrus.",
  footprint: 9,
  setting: "inland",
  padColour: sands.sand,
  signSpot: { x: 1.6, z: 8.3 },
  build: buildPapyrusWorkshop,
  moving: [
    {
      name: "papyrus raft",
      pivot: raftPivot,
      build: buildRaft,
      motion: raftMotion,
    },
    {
      name: "press stone",
      pivot: [pressAt.x, workshop.floor + 0.68, pressAt.z],
      build: buildPressStone,
      motion: { kind: "rise", reach: 4, height: 0.6, period: 1.5 },
    },
    {
      name: "ibis",
      pivot: [ibisAt[0], 0.55, ibisAt[2]],
      build: buildIbis,
      motion: { kind: "nod", axis: "x", reach: 4, amplitude: 0.5, period: 1.3 },
    },
  ],
  wanderers: [
    {
      name: "cats",
      build: buildCat,
      count: 2,
      centre: { x: 2.4, z: 1.0 },
      radius: 0.8,
      speed: 0.3,
    },
    {
      name: "dragonflies",
      build: buildDragonfly,
      count: 3,
      centre: { x: pool.x, z: pool.z },
      radius: 2.0,
      speed: 1.0,
      height: 0.9,
      bob: 0.15,
    },
  ],
  blockers,
  decks: [floorDeck],
  rides: [
    {
      id: "papyrus-raft",
      name: "a papyrus raft trip",
      start: raftStart,
      reach: 0.6,
      seconds: 20,
      finish: raftFinish,
      follow: followMovingSeat({
        pivot: raftPivot,
        motion: raftMotion,
        seat: [0, 0.3, 0.35],
        start: raftStart,
        finish: raftFinish,
      }),
    },
  ],
  tune: [62, 65, 69, 72, 69, 65, 62],
  play: {
    label: "Make a sheet of papyrus",
    news: "Squish! You laid the sticky papyrus strips across each other, the heavy stone pressed them flat, and when they dried you had a smooth new sheet to write your name on in hieroglyphs.",
    tune: [62, 65, 69, 74],
  },
};
