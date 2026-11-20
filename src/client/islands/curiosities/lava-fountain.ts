import { TorusGeometry } from "three";
import {
  addSignBoard,
  listRingPoints,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const basalt = "#2e2726";
const basaltEdge = "#4a3f3b";
const paving = "#4f4440";
const lavaHot = "#ff8c1a";
const lavaWhite = "#ffd166";
const lavaDeep = "#e8461c";
const crust = "#1e1918";
const shimmer = "#ffe2c4";
const pumice = "#9c8f84";
const obsidian = "#141012";
const signColour = "#5a2a1c";
const ashPad = "#5b4a42";

const centre = { x: 0, z: -0.4 };
const basin = { radius: 2.0, wall: 0.55, lava: 0.42 };
const bowl = { radius: 1.05, y: 1.45, depth: 0.32 };
const cup = { radius: 0.55, y: 2.35, depth: 0.24 };
const at = (x: number, y: number, z: number): Triple => [
  centre.x + x,
  y,
  centre.z + z,
];

/** A round stone bowl with a rolled lip, as a lathe profile. */
const addBowl = (
  builder: AttractionBuilder,
  radius: number,
  y: number,
  depth: number,
  segments: number,
) => {
  builder.lathe(
    "matte",
    basalt,
    [
      [0.15, -depth - 0.12],
      [radius * 0.55, -depth - 0.08],
      [radius * 0.92, -depth * 0.4],
      [radius + 0.04, 0],
      [radius + 0.08, 0.08],
      [radius - 0.06, 0.1],
      [radius - 0.1, 0.02],
    ],
    at(0, y, 0),
    "y",
    segments,
  );
  builder.cylinder("glow", lavaHot, {
    radius: radius - 0.08,
    length: 0.03,
    at: at(0, y + 0.02, 0),
    segments,
  });
};

/** The tiered fountain: basin, pedestal, bowl and cup. */
const buildFountain = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 20 : 36;
  /* The bottom basin's thick wall, with a lip to sit on */
  builder.lathe(
    "matte",
    basalt,
    [
      [basin.radius + 0.12, 0],
      [basin.radius + 0.14, basin.wall - 0.08],
      [basin.radius + 0.22, basin.wall],
      [basin.radius + 0.18, basin.wall + 0.08],
      [basin.radius - 0.2, basin.wall + 0.08],
      [basin.radius - 0.22, 0.3],
    ],
    at(0, 0, 0),
    "y",
    segments,
  );
  builder.cylinder("glow", lavaDeep, {
    radius: basin.radius - 0.2,
    length: 0.06,
    at: at(0, basin.lava, 0),
    segments,
  });
  /* The pedestal, with mouldings */
  builder.lathe(
    "matte",
    basaltEdge,
    [
      [0.55, basin.lava],
      [0.48, basin.lava + 0.2],
      [0.3, basin.lava + 0.35],
      [0.26, bowl.y - 0.6],
      [0.32, bowl.y - 0.48],
      [0.2, bowl.y - 0.3],
      [0, bowl.y - 0.3],
    ],
    at(0, 0, 0),
    "y",
    builder.isFar ? 10 : 20,
  );
  addBowl(builder, bowl.radius, bowl.y, bowl.depth, builder.isFar ? 14 : 30);
  builder.cylinder("matte", basaltEdge, {
    radius: 0.14,
    radiusEnd: 0.18,
    length: cup.y - bowl.y - 0.1,
    at: at(0, (cup.y + bowl.y) / 2 - 0.1, 0),
    segments: 12,
  });
  addBowl(builder, cup.radius, cup.y, cup.depth, builder.isFar ? 10 : 22);
  if (builder.isFar) {
    return;
  }
  /* Rolled mouldings round the basin and pedestal foot */
  builder.add(
    "matte",
    basaltEdge,
    new TorusGeometry(basin.radius + 0.14, 0.07, 5, 40),
    {
      at: at(0, 0.1, 0),
      rotation: [Math.PI / 2, 0, 0],
    },
  );
  builder.add(
    "matte",
    shade(basaltEdge, 1.15),
    new TorusGeometry(0.3, 0.05, 5, 16),
    {
      at: at(0, bowl.y - 0.55, 0),
      rotation: [Math.PI / 2, 0, 0],
    },
  );
  /* Lion-head spouts round the basin wall, dribbling lava */
  listRingPoints(basin.radius + 0.18, 6).forEach(({ x, z }, index) => {
    const turn = (index / 6) * Math.PI * 2;
    builder.sphere("matte", basaltEdge, 0.16, at(x, 0.32, z), [1, 1, 0.7], 10);
    builder.sphere(
      "glow",
      lavaWhite,
      0.045,
      at(x * 1.06, 0.3, z * 1.06),
      [1, 1, 1],
      6,
    );
    builder.box(
      "matte",
      crust,
      [0.07, 0.04, 0.02],
      at(x * 1.04, 0.38, z * 1.04),
      [0, turn, 0],
    );
  });
};

/** Lava pouring over the bowl's rim in glowing streams, cooling into crust below. */
const buildFlows = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const streams = 8;
  for (let stream = 0; stream < streams; stream++) {
    const angle = (stream / streams) * Math.PI * 2 + 0.2;
    const top = bowl.radius + 0.08;
    const bottom = bowl.radius + 0.18;
    builder.bar(
      "glow",
      stream % 2 === 0 ? lavaHot : lavaWhite,
      at(Math.sin(angle) * top, bowl.y + 0.08, Math.cos(angle) * top),
      at(Math.sin(angle) * bottom, basin.lava + 0.02, Math.cos(angle) * bottom),
      0.09 - (stream % 2) * 0.02,
      6,
    );
    builder.sphere(
      "glow",
      lavaHot,
      0.13,
      at(Math.sin(angle) * bottom, basin.lava + 0.03, Math.cos(angle) * bottom),
      [1.3, 0.3, 1.3],
      8,
    );
  }
  for (let stream = 0; stream < 5; stream++) {
    const angle = (stream / 5) * Math.PI * 2 + 0.6;
    builder.bar(
      "glow",
      lavaWhite,
      at(
        Math.sin(angle) * (cup.radius + 0.06),
        cup.y + 0.06,
        Math.cos(angle) * (cup.radius + 0.06),
      ),
      at(
        Math.sin(angle) * (cup.radius + 0.15),
        bowl.y + 0.04,
        Math.cos(angle) * (cup.radius + 0.15),
      ),
      0.06,
      5,
    );
  }
  /* Black crust floating on the cooler lava in the basin */
  [
    [1.3, 0.4, 0.35],
    [-1.2, 0.7, 0.3],
    [0.3, -1.45, 0.28],
    [-0.8, -1.1, 0.22],
    [1.1, -0.9, 0.25],
    [-1.5, -0.3, 0.2],
    [0.6, 1.4, 0.24],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? crust : shade(crust, 1.4),
      size,
      at(x, basin.lava + 0.03, z),
      [1.4, 0.18, 1],
      8,
    );
  });
  [
    [0.5, 0.3],
    [-0.4, -0.5],
  ].forEach(([x, z]) => {
    builder.sphere(
      "matte",
      crust,
      0.18,
      at(x, bowl.y + 0.03, z),
      [1.3, 0.2, 1],
      8,
    );
  });
};

/** Hexagonal paving round the fountain, and a display of cooling lava. */
const buildSurrounds = (builder: AttractionBuilder) => {
  builder.cylinder("matte", paving, {
    radius: basin.radius + 0.9,
    length: 0.04,
    at: at(0, 0.02, 0),
    segments: builder.isFar ? 12 : 6,
  });
  if (builder.isFar) {
    return;
  }
  listRingPoints(basin.radius + 0.62, 16).forEach(({ x, z }, index) => {
    builder.cylinder(
      "matte",
      index % 2 === 0 ? basaltEdge : shade(paving, 1.12),
      {
        radius: 0.32,
        length: 0.05,
        at: at(x, 0.045, z),
        segments: 6,
      },
    );
  });
  /* "Melting and freezing": three blocks from runny to solid rock */
  const plinth: Triple = [2.1, 0, 2.15];
  builder.box(
    "matte",
    basaltEdge,
    [1.5, 0.5, 0.5],
    [plinth[0], 0.25, plinth[2]],
    [0, -0.6, 0],
  );
  builder.box(
    "matte",
    shade(basaltEdge, 1.2),
    [1.6, 0.06, 0.58],
    [plinth[0], 0.53, plinth[2]],
    [0, -0.6, 0],
  );
  [lavaWhite, lavaDeep, crust].forEach((colour, index) => {
    const offset = (index - 1) * 0.48;
    const x = plinth[0] + Math.cos(-0.6) * offset;
    const z = plinth[2] - Math.sin(-0.6) * offset;
    if (index === 0) {
      builder.sphere("glow", colour, 0.18, [x, 0.62, z], [1.3, 0.45, 1.3], 10);
    } else {
      builder.roundedBox(
        index === 1 ? "glow" : "matte",
        colour,
        [0.28, 0.24, 0.28],
        0.07,
        [x, 0.68, z],
        [0, index, 0],
      );
    }
  });
  /* Pumice and shiny obsidian, rock that cooled fast */
  [
    { x: -2.6, z: 1.6, size: 0.22, isGlassy: false },
    { x: -2.9, z: 1.1, size: 0.15, isGlassy: false },
    { x: -2.3, z: 2.1, size: 0.17, isGlassy: true },
    { x: 2.9, z: -1.4, size: 0.2, isGlassy: true },
  ].forEach(({ x, z, size, isGlassy }) => {
    builder.sphere(
      isGlassy ? "glass" : "matte",
      isGlassy ? obsidian : pumice,
      size,
      [x, size * 0.6, z],
      [1.2, 0.8, 1],
      8,
    );
  });
};

/** The lava jet that leaps from the top cup when someone comes near. */
const buildJet = (builder: AttractionBuilder) => {
  builder.cylinder("glow", lavaHot, {
    radius: 0.13,
    radiusEnd: 0.05,
    length: 1.2,
    at: [0, 0.6, 0],
    segments: 12,
  });
  builder.cylinder("glow", lavaWhite, {
    radius: 0.07,
    radiusEnd: 0.02,
    length: 1.3,
    at: [0, 0.65, 0],
    segments: 8,
  });
  [
    [0, 1.35, 0, 0.12],
    [0.18, 1.15, 0.05, 0.07],
    [-0.15, 1.05, -0.1, 0.08],
    [0.06, 0.95, 0.2, 0.06],
    [-0.1, 1.25, 0.12, 0.05],
  ].forEach(([x, y, z, radius], index) => {
    builder.sphere(
      "glow",
      index === 0 ? lavaWhite : lavaHot,
      radius,
      [x, y, z],
      [1, 1.2, 1],
      10,
    );
  });
};

/** Little spurts round the middle bowl, leaping with the big jet. */
const buildSpurts = (builder: AttractionBuilder) => {
  listRingPoints(bowl.radius * 0.6, 6).forEach(({ x, z }, index) => {
    builder.cylinder("glow", index % 2 === 0 ? lavaHot : lavaWhite, {
      radius: 0.05,
      radiusEnd: 0.015,
      length: 0.45,
      at: [x, 0.22, z],
      segments: 6,
    });
    builder.sphere("glow", lavaHot, 0.05, [x, 0.47, z], [1, 1.3, 1], 6);
  });
};

/** A tall see-through ripple of hot air over the fountain. */
const buildShimmer = (builder: AttractionBuilder) => {
  builder.cylinder("water", shimmer, {
    radius: 0.75,
    radiusEnd: 0.25,
    length: 1.8,
    at: [0, 0.9, 0],
    segments: 18,
    isOpen: true,
  });
};

const buildHalo = (builder: AttractionBuilder) => {
  builder.sphere("glow", lavaHot, 1.6, [0, 0, 0], [1.4, 0.6, 1.4], 16);
};

export const lavaFountainModel: CuriosityModel = {
  kind: "lava-fountain",
  islandId: "ember-isle",
  name: "Lava Fountain",
  fact: "Lava is rock so hot that it has melted into a runny liquid. As it cools, it turns back into solid rock, so melting and solidifying can be reversed. Lava that cools slowly becomes rock like basalt, and lava that cools very fast can become shiny black glass called obsidian.",
  curriculumLink:
    "Science, Year 5: properties and changes of materials. Demonstrate that dissolving, mixing and changes of state are reversible changes, such as melting and solidifying.",
  footprint: 4,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: -1.3, z: 3.0 },
  build: (builder) => {
    buildSurrounds(builder);
    buildFountain(builder);
    buildFlows(builder);
    if (builder.isFar) {
      builder.cylinder("glow", lavaHot, {
        radius: 0.1,
        radiusEnd: 0.04,
        length: 0.6,
        at: at(0, cup.y + 0.3, 0),
        segments: 8,
      });
    }
    addSignBoard(builder, [-1.3, 0, 3.0], signColour);
  },
  moving: [
    {
      name: "lava jet",
      pivot: at(0, cup.y, 0),
      build: buildJet,
      motion: { kind: "splash", reach: 7, period: 1.1 },
    },
    {
      name: "lava spurts",
      pivot: at(0, bowl.y, 0),
      build: buildSpurts,
      motion: { kind: "splash", reach: 7, period: 0.8, phase: 1.4 },
    },
    {
      name: "heat shimmer",
      pivot: at(0, cup.y + 0.3, 0),
      build: buildShimmer,
      motion: { kind: "bob", height: 0.12, period: 1.7 },
    },
    {
      name: "lava glow",
      pivot: at(0, 1.2, 0),
      build: buildHalo,
      motion: { kind: "wake", reach: 8 },
      look: "halo",
    },
  ],
  blockers: [
    { x: centre.x, z: centre.z, radius: basin.radius + 0.25 },
    { x: 2.1, z: 2.15, radius: 0.75 },
  ] satisfies LocalBlocker[],
  tune: [41, 44, 41, 48],
  play: {
    label: "Feel the heat",
    news: "Whoosh! A wave of heat rolled over you as the lava leapt up, then slowly cooled into a crust of new black rock.",
  },
};
