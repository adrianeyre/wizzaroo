import { CylinderGeometry } from "three";
import {
  addSignBoard,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const basalt = "#3a3433";
const basaltTop = "#57504c";
const basaltWet = "#2a2627";
const lavaGlow = "#ff6a1a";
const lavaBright = "#ffc04d";
const seaWater = "#2f7f9a";
const seaweed = "#3f6b3a";
const crabRed = "#d9472b";
const starfish = "#ef8a3a";
const signColour = "#34495e";
const ashPad = "#5b4a42";

/*
 * Columns stand on a hexagonal grid, pointy side to +z. The tallest
 * stand at the back and they step down towards the front, never more
 * than half a metre from a neighbour, so they can be hopped up and down.
 */
const cell = 0.42;
const cluster = { x: -0.7, z: -0.6, rings: 3 };
const peak = { q: 1, r: -3 };
const pool = { x: 2.2, z: 1.5, radius: 1.05 };

interface Column {
  q: number;
  r: number;
  x: number;
  z: number;
  height: number;
}

const cellDistance = (q: number, r: number, otherQ: number, otherR: number) =>
  (Math.abs(q - otherQ) +
    Math.abs(r - otherR) +
    Math.abs(q + r - otherQ - otherR)) /
  2;

/** A small, steady wobble per column, so the steps look natural. */
const wobble = (q: number, r: number): number => {
  const value = Math.sin(q * 12.9898 + r * 78.233) * 43758.5453;
  return value - Math.floor(value) - 0.5;
};

const columns: readonly Column[] = (() => {
  const found: Column[] = [];
  for (let q = -cluster.rings; q <= cluster.rings; q++) {
    for (let r = -cluster.rings; r <= cluster.rings; r++) {
      if (cellDistance(q, r, 0, 0) > cluster.rings) {
        continue;
      }
      const x = cluster.x + cell * Math.sqrt(3) * (q + r / 2);
      const z = cluster.z + cell * 1.5 * r;
      const steps = cellDistance(q, r, peak.q, peak.r);
      const height = Math.max(
        0.15,
        Math.round((2.0 - 0.3 * steps + wobble(q, r) * 0.16) * 20) / 20,
      );
      found.push({ q, r, x, z, height });
    }
  }
  return found;
})();

/** One number for a cell, unique while |r| stays under 500. */
const cellKey = (q: number, r: number): number => q * 1000 + r;

const heightByCell = new Map(
  columns.map(({ q, r, height }) => [cellKey(q, r), height]),
);

/** The column under a local point, by rounding to the nearest hex cell. */
const columnsDeck: Deck = ({ x, z }) => {
  const localX = x - cluster.x;
  const localZ = z - cluster.z;
  const fractionR = ((2 / 3) * localZ) / cell;
  const fractionQ = ((Math.sqrt(3) / 3) * localX - localZ / 3) / cell;
  const fractionS = -fractionQ - fractionR;
  let q = Math.round(fractionQ);
  let r = Math.round(fractionR);
  const s = Math.round(fractionS);
  const missQ = Math.abs(q - fractionQ);
  const missR = Math.abs(r - fractionR);
  const missS = Math.abs(s - fractionS);
  if (missQ > missR && missQ > missS) {
    q = -r - s;
  } else if (missR > missS) {
    r = -q - s;
  }
  const height = heightByCell.get(cellKey(q, r));
  return height === undefined ? undefined : { height, kind: "ground" };
};

const hexPrism = (radius: number, radiusEnd: number, length: number) =>
  new CylinderGeometry(radiusEnd, radius, length, 6);

/** Every column: a hex prism, a paler worn top, and cracks in its sides. */
const buildColumns = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    /* Only the taller columns, over one low slab for the rest */
    builder.add(
      "matte",
      basalt,
      hexPrism(cell * Math.sqrt(3) * 3.1, cell * Math.sqrt(3) * 3.1, 0.3),
      {
        at: [cluster.x, 0.15, cluster.z],
        rotation: [0, Math.PI / 6, 0],
      },
    );
    columns
      .filter(({ height }) => height >= 1.2)
      .forEach(({ x, z, height }) => {
        builder.add(
          "matte",
          basalt,
          hexPrism(cell * 0.97, cell * 0.97, height),
          {
            at: [x, height / 2, z],
          },
        );
      });
    return;
  }
  columns.forEach(({ q, r, x, z, height }, index) => {
    const tint = 0.9 + (wobble(r, q) + 0.5) * 0.22;
    builder.add(
      "matte",
      shade(basalt, tint),
      hexPrism(cell * 0.97, cell * 0.95, height - 0.04),
      {
        at: [x, (height - 0.04) / 2, z],
      },
    );
    builder.add(
      "matte",
      shade(basaltTop, tint),
      hexPrism(cell * 0.93, cell * 0.86, 0.05),
      {
        at: [x, height - 0.02, z],
      },
    );
    /* A band where the column split as it cooled */
    if (height > 0.5) {
      builder.add(
        "matte",
        basaltWet,
        hexPrism(cell * 0.985, cell * 0.985, 0.03),
        {
          at: [x, height * 0.55, z],
        },
      );
    }
    /* A crack across some tops and down some sides */
    if (index % 3 === 0) {
      builder.box(
        "paint",
        basaltWet,
        [cell * 1.2, 0.012, 0.025],
        [x, height + 0.004, z],
        [0, index * 0.7, 0],
      );
    }
    if (index % 4 === 1 && height > 0.6) {
      builder.box(
        "paint",
        basaltWet,
        [0.03, height * 0.5, 0.03],
        [x, height * 0.45, z + cell * 0.82],
        [0, 0, 0.12],
      );
    }
  });
  /* Puffins perched on the tallest columns */
  [...columns]
    .sort((first, second) => second.height - first.height)
    .slice(0, 3)
    .forEach(({ x, z, height }, index) => {
      addPuffin(builder, [x, height, z], 0.4 + index * 0.9);
    });
  /* Broken columns lying at the foot of the cluster */
  [
    { at: [1.6, 0.22, -1.6] satisfies Triple, length: 1.1, turn: 0.4 },
    { at: [-2.9, 0.22, 0.6] satisfies Triple, length: 0.8, turn: -0.9 },
    { at: [0.9, 0.2, -2.9] satisfies Triple, length: 0.7, turn: 1.6 },
  ].forEach(({ at, length, turn }) => {
    builder.add("matte", basalt, hexPrism(0.26, 0.26, length), {
      at,
      rotation: [Math.PI / 2, turn, 0],
    });
  });
};

/** A puffin standing on a column top, looking out to sea. */
const addPuffin = (builder: AttractionBuilder, at: Triple, turn: number) => {
  const spot = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  builder.sphere(
    "paint",
    palette.black,
    0.12,
    spot(0, 0.16, 0),
    [0.9, 1.25, 0.9],
    10,
  );
  builder.sphere(
    "paint",
    palette.white,
    0.1,
    spot(0, 0.15, 0.04),
    [0.8, 1.1, 0.7],
    10,
  );
  builder.sphere(
    "paint",
    palette.black,
    0.08,
    spot(0, 0.33, 0.01),
    [1, 1, 1],
    10,
  );
  builder.sphere(
    "paint",
    palette.white,
    0.05,
    spot(0, 0.33, 0.05),
    [1.3, 0.9, 0.6],
    8,
  );
  /* The bright striped beak, deep and short */
  builder.bar(
    "paint",
    "#e8692a",
    spot(0, 0.32, 0.07),
    spot(0, 0.31, 0.15),
    0.06,
    6,
  );
  builder.bar(
    "paint",
    "#f2c218",
    spot(0, 0.33, 0.08),
    spot(0, 0.33, 0.12),
    0.065,
    6,
  );
  [-0.04, 0.04].forEach((side) => {
    builder.box("paint", "#e8692a", [0.04, 0.02, 0.07], spot(side, 0.01, 0.02));
  });
};

/** A rock pool fed by the sea, with seaweed, a starfish and wet stones. */
const buildPool = (builder: AttractionBuilder) => {
  builder.cylinder("matte", basaltWet, {
    radius: pool.radius + 0.25,
    length: 0.08,
    at: [pool.x, 0.04, pool.z],
    segments: 20,
  });
  builder.cylinder("water", seaWater, {
    radius: pool.radius,
    length: 0.03,
    at: [pool.x, 0.09, pool.z],
    segments: 24,
  });
  if (builder.isFar) {
    return;
  }
  /* Low hexagonal stones round the edge, just showing */
  listRingPoints(pool.radius + 0.18, 12, pool).forEach(({ x, z }, index) => {
    builder.add(
      "matte",
      index % 2 === 0 ? basalt : basaltTop,
      hexPrism(0.2, 0.18, 0.16 + (index % 3) * 0.05),
      {
        at: [x, 0.1, z],
        rotation: [0, index * 0.5, 0],
      },
    );
  });
  /* Seaweed fronds and a starfish under the water */
  [
    [-0.4, -0.3],
    [0.5, 0.2],
    [0.1, 0.55],
  ].forEach(([dx, dz], index) => {
    builder.bar(
      "matte",
      seaweed,
      [pool.x + dx, 0.02, pool.z + dz],
      [pool.x + dx + 0.06, 0.32, pool.z + dz - 0.04],
      0.05,
      5,
    );
    builder.bar(
      "matte",
      shade(seaweed, 1.2),
      [pool.x + dx, 0.02, pool.z + dz],
      [pool.x + dx - 0.08, 0.26 + index * 0.03, pool.z + dz + 0.05],
      0.04,
      5,
    );
  });
  for (let arm = 0; arm < 5; arm++) {
    const angle = (arm / 5) * Math.PI * 2;
    builder.box(
      "paint",
      starfish,
      [0.05, 0.03, 0.16],
      [
        pool.x - 0.2 + Math.sin(angle) * 0.07,
        0.07,
        pool.z + 0.25 + Math.cos(angle) * 0.07,
      ],
      [0, angle, 0],
    );
  }
  /* Mussels clinging to the nearest columns */
  [
    [0.55, 0.9],
    [0.75, 0.55],
    [0.4, 1.25],
  ].forEach(([x, z]) => {
    builder.sphere("paint", "#26324a", 0.07, [x, 0.06, z], [1.4, 0.5, 0.8], 6);
  });
};

/** A fissure in the ground that glows with lava when someone comes close. */
const crackAt: Triple = [-1.6, 0.01, 2.1];
const buildCrack = (builder: AttractionBuilder) => {
  const points: [number, number][] = [
    [-1.3, -0.3],
    [-0.8, -0.1],
    [-0.35, -0.25],
    [0.1, 0.05],
    [0.55, -0.1],
    [1.0, 0.15],
    [1.4, 0.0],
  ];
  points.slice(1).forEach(([x, z], index) => {
    const [fromX, fromZ] = points[index] ?? [x, z];
    const length = Math.hypot(x - fromX, z - fromZ);
    const turn = Math.atan2(x - fromX, z - fromZ);
    builder.box(
      "glow",
      index % 2 === 0 ? lavaGlow : lavaBright,
      [0.09, 0.03, length + 0.04],
      [(x + fromX) / 2, 0.015, (z + fromZ) / 2],
      [0, turn, 0],
    );
    builder.sphere("glow", lavaGlow, 0.09, [x, 0.0, z], [1, 0.4, 1], 6);
  });
  /* A wisp of rising heat over the middle */
  builder.cylinder("glow", lavaBright, {
    radius: 0.05,
    radiusEnd: 0.01,
    length: 0.25,
    at: [0.1, 0.13, 0.05],
    segments: 6,
  });
};

/** The fissure's dark lips, so it shows even when cold. */
const buildFissure = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    basaltWet,
    [2.9, 0.02, 0.32],
    [crackAt[0], 0.012, crackAt[2] - 0.08],
    [0, 0.07, 0],
  );
};

const buildCrab = (builder: AttractionBuilder) => {
  builder.sphere("paint", crabRed, 0.1, [0, 0.07, 0], [1.3, 0.55, 1], 8);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      crabRed,
      0.04,
      [side * 0.13, 0.08, 0.1],
      [1, 0.7, 1.2],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [side * 0.035, 0.13, 0.08],
      [1, 1, 1],
      4,
    );
    [-0.04, 0.03].forEach((dz) => {
      builder.bar(
        "paint",
        shade(crabRed, 0.8),
        [side * 0.08, 0.06, dz],
        [side * 0.17, 0.0, dz - 0.02],
        0.02,
        4,
      );
    });
  });
};

export const basaltColumnsModel: CuriosityModel = {
  kind: "basalt-columns",
  islandId: "ember-isle",
  name: "Basalt Columns",
  fact: "These six-sided columns are made of basalt, a rock that forms when lava cools. As a thick lake of lava slowly cooled and shrank, it cracked into hexagons, like mud drying in the sun. The Giant's Causeway in Northern Ireland has about 40,000 of them, made by volcanoes long ago.",
  curriculumLink:
    "Geography, Key Stage 2: physical geography, including volcanoes and earthquakes, and how rocks such as basalt are formed.",
  footprint: 5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: 0.4, z: 3.6 },
  build: (builder) => {
    buildColumns(builder);
    buildPool(builder);
    if (!builder.isFar) {
      buildFissure(builder);
    }
    addSignBoard(builder, [0.4, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "glowing crack",
      pivot: crackAt,
      build: buildCrack,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "crabs",
      build: buildCrab,
      count: 3,
      centre: { x: pool.x + 0.3, z: pool.z + 0.9 },
      radius: 0.8,
      speed: 0.35,
    },
  ],
  decks: [columnsDeck],
  blockers: [
    { x: pool.x, z: pool.z, radius: pool.radius },
    { x: 1.6, z: -1.6, radius: 0.5 },
    { x: -2.9, z: 0.6, radius: 0.4 },
    { x: 0.9, z: -2.9, radius: 0.4 },
  ] satisfies LocalBlocker[],
  tune: [60, 62, 64, 65, 67, 69, 71, 72],
  play: {
    label: "Hop the hexagons",
    news: "Hop, hop, hop! You leapt from column to column all the way to the top, without touching the ground once.",
  },
};
