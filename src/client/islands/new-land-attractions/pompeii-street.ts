import { CircleGeometry } from "three";
import {
  addSignBoard,
  buildFlatDeck,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addAmphora,
  addTiledRoof,
  addLoaf,
  backZ,
  buildBakery,
  buildHouse,
  buildingFront,
  buildMillTop,
  buildThermopolium,
  cartAt,
  crossings,
  cypresses,
  donkeyAt,
  floorHeight,
  fountainAt,
  millAt,
  ovenAt,
  pavementEdge,
  pompeiiColours as c,
  roadHalf,
  secondMillAt,
  slab,
  statueAt,
  stoneRows,
  stoneSize,
  streetEnd,
  wineShop,
} from "./pompeii-street-parts.js";

const signAt = { x: 0, z: 8.6 };
const vesuviusAt = { x: -0.5, z: -7.7 };
const vesuviusHeight = 3.4;
const ashPad = "#6b5f57";

/* ------------------------------------------------------------------ */
/* The street                                                          */
/* ------------------------------------------------------------------ */

const isOnCrossing = (x: number, z: number) =>
  crossings.some(
    (crossing) =>
      Math.abs(x - crossing) < stoneSize.x / 2 + 0.2 && Math.abs(z) < 0.95,
  );

const buildStreet = (builder: AttractionBuilder) => {
  /* The road of big basalt blocks, worn into ruts by cart wheels */
  slab(
    builder,
    "matte",
    c.rut,
    [-streetEnd, 0, -roadHalf],
    [streetEnd, 0.03, roadHalf],
  );
  if (builder.isFar) {
    slab(
      builder,
      "matte",
      c.basalt,
      [-streetEnd, 0.03, -roadHalf + 0.05],
      [streetEnd, 0.05, roadHalf - 0.05],
    );
  } else {
    const columns = 26;
    stoneRows.forEach((row, rowIndex) => {
      for (let column = 0; column < columns; column++) {
        const x =
          -streetEnd +
          0.3 +
          ((column + (rowIndex % 2) * 0.5) / columns) * (streetEnd * 2 - 0.6);
        if (isOnCrossing(x, row)) {
          continue;
        }
        const seed = column * 7 + rowIndex * 3;
        builder.add(
          "matte",
          seed % 3 === 0 ? c.basaltLight : c.basalt,
          new CircleGeometry(0.29 + (seed % 4) * 0.015, 5).rotateX(
            -Math.PI / 2,
          ),
          { at: [x, 0.05, row * 1.1], rotation: [0, seed * 0.7, 0] },
        );
      }
    });
  }
  [-0.3, 0.3].forEach((rut) => {
    slab(
      builder,
      "matte",
      c.rut,
      [-streetEnd, 0.05, rut - 0.04],
      [streetEnd, 0.068, rut + 0.04],
    );
  });
  /* The raised stepping stones, so nobody had to step in the mud */
  crossings.forEach((x) => {
    stoneRows.forEach((z) => {
      builder.box(
        "matte",
        c.basaltLight,
        [stoneSize.x, floorHeight - 0.04, stoneSize.z],
        [x, (floorHeight - 0.04) / 2, z],
      );
      if (builder.isFar) {
        return;
      }
      builder.box(
        "matte",
        shade(c.basaltLight, 1.08),
        [stoneSize.x - 0.08, 0.04, stoneSize.z - 0.08],
        [x, floorHeight - 0.02, z],
      );
    });
  });
  /* The pavements of tuff, edged with kerbstones */
  [-1, 1].forEach((side) => {
    const near = side * roadHalf;
    const far = side * pavementEdge;
    slab(
      builder,
      "matte",
      c.tuff,
      [-streetEnd, 0, Math.min(near, far)],
      [streetEnd, floorHeight, Math.max(near, far)],
    );
    slab(
      builder,
      "matte",
      c.kerb,
      [-streetEnd, 0, near - (side > 0 ? 0 : 0.14)],
      [streetEnd, floorHeight + 0.015, near + (side > 0 ? 0.14 : 0)],
    );
  });
  /* The shop floors, red with crushed pots, as the Romans made them */
  slab(
    builder,
    "matte",
    c.floor,
    [-8.2, 0, backZ],
    [8.2, floorHeight, buildingFront],
  );
  /* The paved way up from the sign */
  slab(
    builder,
    "matte",
    c.tuff,
    [-0.8, 0, pavementEdge],
    [0.8, 0.03, signAt.z - 0.3],
  );
  if (!builder.isFar) {
    for (let joint = pavementEdge + 0.6; joint < signAt.z - 0.4; joint += 0.6) {
      slab(
        builder,
        "matte",
        shade(c.tuff, 0.82),
        [-0.8, 0.03, joint],
        [0.8, 0.036, joint + 0.03],
      );
    }
  }
};

/* ------------------------------------------------------------------ */
/* The fountain, the wine shop and the square                          */
/* ------------------------------------------------------------------ */

const fountainWater = floorHeight + 0.45;

const buildFountain = (builder: AttractionBuilder) => {
  const { x, z } = fountainAt;
  const half = { x: 0.55, z: 0.36 };
  const top = floorHeight + 0.55;
  slab(
    builder,
    "matte",
    c.basaltLight,
    [x - half.x, floorHeight, z - half.z],
    [x + half.x, floorHeight + 0.12, z + half.z],
  );
  [-1, 1].forEach((side) => {
    slab(
      builder,
      "matte",
      c.basalt,
      [x - half.x, floorHeight, z + side * half.z - 0.06],
      [x + half.x, top, z + side * half.z + 0.06],
    );
    slab(
      builder,
      "matte",
      c.basalt,
      [x + side * half.x - 0.06, floorHeight, z - half.z],
      [x + side * half.x + 0.06, top, z + half.z],
    );
  });
  builder.box(
    "water",
    c.water,
    [half.x * 2 - 0.1, 0.03, half.z * 2 - 0.1],
    [x, fountainWater, z],
  );
  /* The spout post, carved with a face */
  slab(
    builder,
    "matte",
    c.basalt,
    [x - 0.17, floorHeight, z + half.z],
    [x + 0.17, floorHeight + 1.15, z + half.z + 0.24],
  );
  builder.sphere(
    "matte",
    c.basaltLight,
    0.14,
    [x, floorHeight + 0.88, z + half.z - 0.01],
    [1, 1.15, 0.5],
    10,
  );
  builder.cylinder("metal", c.bronze, {
    radius: 0.025,
    length: 0.12,
    at: [x, floorHeight + 0.78, z + half.z - 0.08],
    axis: "z",
    segments: 6,
  });
  builder.bar(
    "water",
    c.water,
    [x, floorHeight + 0.78, z + half.z - 0.14],
    [x, fountainWater, z + half.z - 0.3],
    0.05,
    6,
  );
  if (!builder.isFar) {
    [-0.05, 0.05].forEach((eye) => {
      builder.sphere(
        "matte",
        c.rut,
        0.02,
        [x + eye, floorHeight + 0.93, z + half.z - 0.07],
        [1, 1, 1],
        6,
      );
    });
    builder.box(
      "matte",
      c.basaltLight,
      [0.4, 0.06, 0.3],
      [x, floorHeight + 1.18, z + half.z + 0.12],
    );
  }
};

const buildFountainJet = (builder: AttractionBuilder) => {
  builder.cylinder("water", c.water, {
    radius: 0.07,
    radiusEnd: 0.03,
    length: 0.7,
    at: [0, 0.35, 0],
    segments: 8,
  });
  [
    [0, 0.72, 0, 0.07],
    [0.08, 0.6, 0.04, 0.04],
    [-0.07, 0.55, -0.03, 0.045],
  ].forEach(([x, y, z, radius]) => {
    builder.sphere(
      "water",
      shade(c.water, 1.25),
      radius,
      [x, y, z],
      [1, 1.3, 1],
      8,
    );
  });
};

const buildWineShop = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = wineShop;
  const top = 2.7;
  slab(builder, "matte", c.floor, [minX, 0, minZ], [maxX, floorHeight, maxZ]);
  slab(builder, "matte", c.plaster, [minX, 0, maxZ - 0.3], [maxX, top, maxZ]);
  slab(builder, "matte", c.plaster, [minX, 0, minZ], [minX + 0.3, top, maxZ]);
  slab(builder, "matte", c.plaster, [maxX - 0.3, 0, minZ], [maxX, top, maxZ]);
  slab(
    builder,
    "matte",
    c.plaster,
    [minX, 0, minZ],
    [minX + 0.7, top, minZ + 0.3],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [maxX - 0.7, 0, minZ],
    [maxX, top, minZ + 0.3],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [minX + 0.7, 2.15, minZ],
    [maxX - 0.7, top, minZ + 0.3],
  );
  slab(
    builder,
    "paint",
    c.ochre,
    [minX - 0.01, floorHeight, minZ - 0.01],
    [minX + 0.7, 1.3, minZ],
  );
  slab(
    builder,
    "paint",
    c.ochre,
    [maxX - 0.7, floorHeight, minZ - 0.01],
    [maxX + 0.01, 1.3, minZ],
  );
  slab(
    builder,
    "paint",
    c.red,
    [minX + 0.7, 2.15, minZ - 0.03],
    [maxX - 0.7, 2.27, minZ],
  );
  addTiledRoof(builder, { minX, maxX, minZ, maxZ, eave: top, rise: 0.6 });
  /* Racks of wine amphorae along the back */
  slab(
    builder,
    "matte",
    c.timber,
    [minX + 0.4, 1.05, maxZ - 0.75],
    [maxX - 0.4, 1.1, maxZ - 0.3],
  );
  for (let jar = 0; jar < 3; jar++) {
    addAmphora(
      builder,
      [minX + 0.9 + jar * 0.9, floorHeight + 0.05, maxZ - 0.52],
      0.95,
      jar % 2 === 0 ? 0.08 : -0.06,
      jar % 3 === 0 ? shade(c.terracotta, 0.85) : c.terracotta,
    );
  }
};

/** A Roman cart, parked, with its donkey waiting beside it. */
const buildCart = (builder: AttractionBuilder) => {
  const { x, z } = cartAt;
  const axleY = 0.45;
  slab(
    builder,
    "matte",
    c.timber,
    [x - 0.9, axleY + 0.05, z - 0.55],
    [x + 0.9, axleY + 0.15, z + 0.55],
  );
  [-1, 1].forEach((side) => {
    slab(
      builder,
      "matte",
      c.darkTimber,
      [x - 0.9, axleY + 0.15, z + side * 0.55 - 0.04],
      [x + 0.9, axleY + 0.5, z + side * 0.55 + 0.04],
    );
    slab(
      builder,
      "matte",
      c.darkTimber,
      [x + side * 0.88 - 0.04, axleY + 0.15, z - 0.55],
      [x + side * 0.88 + 0.04, axleY + 0.5, z + 0.55],
    );
    const wheelZ = z + side * 0.68;
    builder.torus(
      "matte",
      c.darkTimber,
      0.42,
      0.06,
      [x, axleY, wheelZ],
      "z",
      builder.isFar ? 10 : 14,
    );
    builder.cylinder("matte", c.timber, {
      radius: 0.08,
      length: 0.14,
      at: [x, axleY, wheelZ],
      axis: "z",
      segments: 8,
    });
    if (!builder.isFar) {
      for (let spoke = 0; spoke < 4; spoke++) {
        const angle = (spoke / 4) * Math.PI;
        builder.box(
          "matte",
          c.timber,
          [0.8, 0.04, 0.04],
          [x, axleY, wheelZ],
          [0, 0, angle],
        );
      }
    }
    builder.bar(
      "matte",
      c.timber,
      [x + 0.85, axleY + 0.1, z + side * 0.35],
      [donkeyAt.x - 0.2, 0.8, donkeyAt.z + side * 0.3],
      0.07,
      6,
    );
  });
  builder.cylinder("metal", "#5a5552", {
    radius: 0.04,
    length: 1.5,
    at: [x, axleY, z],
    axis: "z",
    segments: 6,
  });
  /* Its load: amphorae of wine, lying in straw */
  slab(
    builder,
    "matte",
    "#c9a85a",
    [x - 0.8, axleY + 0.15, z - 0.48],
    [x + 0.8, axleY + 0.3, z + 0.48],
  );
  if (!builder.isFar) {
    [-0.2, 0.25].forEach((along, index) => {
      builder.sphere(
        "matte",
        index === 1 ? "#d9cdb4" : c.plaster,
        0.2,
        [x + along * 2, axleY + 0.45, z + (index - 1) * 0.15],
        [1, 0.8, 1.2],
        8,
      );
    });
  }
};

const buildDonkeyBody = (builder: AttractionBuilder) => {
  const { x, z } = donkeyAt;
  const grey = "#8a817a";
  builder.sphere("matte", grey, 0.45, [x, 0.9, z], [1.3, 0.75, 0.7], 12);
  [
    [-0.35, -0.17],
    [-0.35, 0.17],
    [0.35, -0.17],
    [0.35, 0.17],
  ].forEach(([dx, dz]) => {
    builder.cylinder("matte", grey, {
      radius: 0.07,
      radiusEnd: 0.05,
      length: 0.72,
      at: [x + dx, 0.38, z + dz],
      segments: 6,
    });
    if (builder.isFar) {
      return;
    }
    builder.cylinder("matte", c.black, {
      radius: 0.06,
      length: 0.06,
      at: [x + dx, 0.03, z + dz],
      segments: 8,
    });
  });
  builder.bar("matte", grey, [x - 0.55, 1.0, z], [x - 0.75, 0.6, z], 0.05, 5);
  builder.sphere("matte", c.black, 0.06, [x - 0.76, 0.57, z], [1, 1.6, 1], 6);
  /* A saddle blanket, red as the walls */
  builder.box("matte", c.red, [0.5, 0.05, 0.72], [x, 1.22, z], [0, 0, 0]);
  builder.box("matte", c.ochre, [0.52, 0.06, 0.06], [x, 1.2, z + 0.35]);
  builder.box("matte", c.ochre, [0.52, 0.06, 0.06], [x, 1.2, z - 0.35]);
};

const donkeyHeadPivot: Triple = [donkeyAt.x + 0.48, 1.12, donkeyAt.z];

const buildDonkeyHead = (builder: AttractionBuilder) => {
  const grey = "#8a817a";
  builder.bar("matte", grey, [0, 0, 0], [0.25, 0.25, 0], 0.22, 10);
  builder.sphere("matte", grey, 0.16, [0.36, 0.28, 0], [1.6, 0.9, 0.85], 10);
  builder.sphere("matte", "#d8d0c6", 0.11, [0.56, 0.24, 0], [1, 0.9, 1], 8);
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", grey, {
      radius: 0.05,
      radiusEnd: 0.02,
      length: 0.34,
      at: [0.26, 0.52, side * 0.08],
      segments: 6,
    });
    builder.sphere(
      "matte",
      c.black,
      0.025,
      [0.42, 0.34, side * 0.11],
      [1, 1, 1],
      6,
    );
  });
  builder.box(
    "matte",
    c.black,
    [0.3, 0.12, 0.03],
    [0.12, 0.3, 0],
    [0, 0, -0.8],
  );
};

const buildStatue = (builder: AttractionBuilder) => {
  const { x, z } = statueAt;
  slab(
    builder,
    "matte",
    c.marble,
    [x - 0.4, 0, z - 0.4],
    [x + 0.4, 0.12, z + 0.4],
  );
  slab(
    builder,
    "matte",
    c.marble,
    [x - 0.3, 0.12, z - 0.3],
    [x + 0.3, 1.1, z + 0.3],
  );
  slab(
    builder,
    "matte",
    c.marble,
    [x - 0.36, 1.1, z - 0.36],
    [x + 0.36, 1.2, z + 0.36],
  );
  /* A bronze figure in a toga, one arm raised */
  builder.lathe(
    "metal",
    c.bronze,
    [
      [0, 0],
      [0.2, 0],
      [0.19, 0.4],
      [0.16, 0.75],
      [0.18, 0.9],
      [0.08, 0.98],
      [0, 0.98],
    ],
    [x, 1.2, z],
    "y",
    builder.segments(12, 6),
  );
  builder.sphere("metal", c.bronze, 0.11, [x, 2.28, z], [1, 1.1, 1], 8);
  builder.bar(
    "metal",
    c.bronze,
    [x + 0.16, 2.08, z],
    [x + 0.36, 2.45, z + 0.08],
    0.07,
    6,
  );
  builder.bar(
    "metal",
    c.bronze,
    [x - 0.16, 2.08, z],
    [x - 0.22, 1.7, z + 0.05],
    0.07,
    6,
  );
  builder.box(
    "metal",
    shade(c.bronze, 0.85),
    [0.12, 0.7, 0.42],
    [x - 0.12, 1.75, z],
    [0, 0, 0.12],
  );
  if (!builder.isFar) {
    builder.box("paint", c.black, [0.42, 0.18, 0.01], [x, 0.7, z + 0.305]);
  }
};

const addCypress = (builder: AttractionBuilder, [x, , z]: Triple, size = 1) => {
  builder.cylinder("matte", c.darkTimber, {
    radius: 0.08 * size,
    length: 0.5 * size,
    at: [x, 0.25 * size, z],
    segments: 6,
  });
  builder.lathe(
    "matte",
    c.leaf,
    [
      [0, 0.3],
      [0.3, 0.45],
      [0.42, 1.2],
      [0.38, 2.2],
      [0.24, 3.0],
      [0.08, 3.5],
      [0, 3.6],
    ].map(([radius, height]): [number, number] => [
      radius * size,
      height * size,
    ]),
    [x, 0, z],
    "y",
    builder.segments(8, 6),
  );
};

const buildSquare = (builder: AttractionBuilder) => {
  buildFountain(builder);
  buildWineShop(builder);
  buildCart(builder);
  buildDonkeyBody(builder);
  buildStatue(builder);
  cypresses.forEach((at, index) => {
    addCypress(builder, at, 0.9 + (index % 2) * 0.15);
  });
  /* A marble bench by the path */
  slab(builder, "matte", c.marble, [1.3, 0.4, 4.2], [2.7, 0.48, 4.6]);
  [1.45, 2.55].forEach((legX) => {
    slab(
      builder,
      "matte",
      c.marble,
      [legX - 0.08, 0, 4.25],
      [legX + 0.08, 0.4, 4.55],
    );
  });
  /* Amphorae stacked against the pavement at the far end */
  [7.1, 7.5, 7.9].forEach((jarX, index) => {
    addAmphora(
      builder,
      [jarX, floorHeight, 2.0],
      1,
      index === 1 ? 0 : 0.12 * (index - 1),
    );
  });
  addSignBoard(builder, [signAt.x, 0, signAt.z], c.red);
};

/* ------------------------------------------------------------------ */
/* Vesuvius, smoking behind the town                                   */
/* ------------------------------------------------------------------ */

const buildVesuvius = (builder: AttractionBuilder) => {
  const { x, z } = vesuviusAt;
  const segments = builder.segments(20, 12);
  builder.lathe(
    "matte",
    c.ash,
    [
      [2.05, 0],
      [1.85, 0.5],
      [1.45, 1.4],
      [1.0, 2.4],
      [0.62, 3.2],
      [0.5, vesuviusHeight],
      [0.4, vesuviusHeight - 0.05],
      [0.25, vesuviusHeight - 0.3],
      [0, vesuviusHeight - 0.3],
    ],
    [x, 0, z],
    "y",
    segments,
  );
  builder.cylinder("glow", c.lava, {
    radius: 0.3,
    length: 0.04,
    at: [x, vesuviusHeight - 0.27, z],
    segments: builder.segments(14, 8),
  });
  /* Its older, lower neighbour ridge, Monte Somma, and green lower slopes */
  builder.lathe(
    "matte",
    shade(c.ash, 0.85),
    [
      [1.4, 0],
      [1.1, 0.7],
      [0.6, 1.5],
      [0, 1.7],
    ],
    [x - 2.1, 0, z + 0.3],
    "y",
    builder.segments(18, 10),
  );
  builder.lathe(
    "matte",
    shade(c.ash, 0.9),
    [
      [1.2, 0],
      [0.9, 0.6],
      [0.45, 1.25],
      [0, 1.35],
    ],
    [x + 2.2, 0, z + 0.1],
    "y",
    builder.segments(18, 10),
  );
  /* Glowing streams of lava down its sides */
  [
    [0.3, 0.06],
    [-0.5, 0.05],
    [1.0, 0.045],
  ].forEach(([turn, width]) => {
    const along = (radius: number, height: number): Triple => [
      x + Math.sin(turn) * radius,
      height,
      z + Math.cos(turn) * radius,
    ];
    builder.bar(
      "glow",
      c.lava,
      along(0.6, vesuviusHeight - 0.1),
      along(1.1, 2.35),
      width * 2,
      5,
    );
    builder.bar(
      "glow",
      c.lava,
      along(1.1, 2.35),
      along(1.6, 1.25),
      width * 1.6,
      5,
    );
    if (!builder.isFar) {
      builder.bar(
        "glow",
        c.lavaBright,
        along(0.62, vesuviusHeight - 0.08),
        along(0.95, 2.65),
        width,
        4,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  builder.lathe(
    "matte",
    "#56623f",
    [
      [2.12, 0],
      [1.95, 0.35],
      [1.85, 0.5],
    ],
    [x, 0, z],
    "y",
    segments,
  );
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const buildOvenFire = (builder: AttractionBuilder) => {
  builder.sphere("glow", c.lava, 0.2, [0, 0.1, 0], [1.2, 0.8, 0.6], 10);
  builder.sphere(
    "glow",
    c.lavaBright,
    0.12,
    [0, 0.12, 0.05],
    [1.2, 0.9, 0.6],
    8,
  );
  if (!builder.isFar) {
    addLoaf(builder, [0.15, 0.02, -0.05], 0.7);
  }
};

const buildShrineLamps = (builder: AttractionBuilder) => {
  [-0.15, 0.15].forEach((side) => {
    builder.sphere("glow", c.lavaBright, 0.045, [side, 0, 0], [1, 1.6, 1], 8);
  });
  builder.sphere("glow", c.lava, 0.25, [0, 0.35, -0.05], [1.4, 1, 0.3], 10);
};

/* ------------------------------------------------------------------ */
/* Wanderers: townsfolk, and a dog                                     */
/* ------------------------------------------------------------------ */

const buildRoman = (builder: AttractionBuilder) => {
  const skin = "#c99a72";
  builder.lathe(
    "matte",
    c.plaster,
    [
      [0, 0.3],
      [0.22, 0.3],
      [0.2, 0.55],
      [0.16, 0.8],
      [0.19, 0.95],
      [0.1, 1.02],
      [0, 1.02],
    ],
    [0, 0, 0],
    "y",
    builder.segments(8, 6),
  );
  builder.box(
    "matte",
    c.darkRed,
    [0.12, 0.65, 0.36],
    [0.06, 0.7, 0.02],
    [0, 0, 0.35],
  );
  builder.cylinder("matte", c.ochre, {
    radius: 0.18,
    length: 0.04,
    at: [0, 0.6, 0],
    segments: 10,
  });
  builder.sphere("matte", skin, 0.12, [0, 1.13, 0], [1, 1.1, 1], 8);
  builder.sphere(
    "matte",
    c.darkTimber,
    0.12,
    [0, 1.17, -0.02],
    [1.05, 0.8, 1.05],
    8,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      skin,
      [side * 0.08, 0.3, 0],
      [side * 0.08, 0.02, 0.02],
      0.07,
      5,
    );
    builder.box(
      "matte",
      c.darkTimber,
      [0.08, 0.04, 0.16],
      [side * 0.08, 0.02, 0.04],
    );
    builder.bar(
      "matte",
      skin,
      [side * 0.2, 0.92, 0],
      [side * 0.24, 0.6, 0.06],
      0.06,
      5,
    );
  });
};

const buildDog = (builder: AttractionBuilder) => {
  const fur = "#3b302a";
  builder.sphere("matte", fur, 0.16, [0, 0.32, 0], [0.8, 0.7, 1.5], 10);
  builder.sphere("matte", fur, 0.1, [0, 0.45, 0.24], [1, 1, 1.2], 8);
  builder.sphere("matte", fur, 0.05, [0, 0.43, 0.35], [1, 0.8, 1.2], 6);
  builder.torus("matte", c.red, 0.065, 0.015, [0, 0.4, 0.2], "y", 10);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box("matte", fur, [0.03, 0.08, 0.05], [side * 0.05, 0.55, 0.22]);
    [-0.13, 0.13].forEach((along) => {
      builder.cylinder("matte", fur, {
        radius: 0.03,
        length: 0.24,
        at: [side * 0.07, 0.12, along],
        segments: 5,
      });
    });
  });
  builder.bar("matte", fur, [0, 0.36, -0.2], [0, 0.5, -0.36], 0.04, 5);
};

/* ------------------------------------------------------------------ */
/* Pushing the mill round                                               */
/* ------------------------------------------------------------------ */

const millRadius = 1.05;
const millStart = { x: -1.6, z: -1.6 };
const millFinish = { x: 0.4, z: -1.6 };

const lerpSpot = (
  from: { x: number; z: number },
  to: { x: number; z: number },
  share: number,
): LocalSpot => ({
  x: from.x + (to.x - from.x) * share,
  y: floorHeight,
  z: from.z + (to.z - from.z) * share,
  heading: Math.atan2(to.x - from.x, to.z - from.z),
});

const pushMill = (progress: number): LocalSpot => {
  const ring = { x: millAt.x, z: millAt.z + millRadius };
  if (progress < 0.14) {
    return lerpSpot(millStart, ring, progress / 0.14);
  }
  if (progress < 0.86) {
    const angle = ((progress - 0.14) / 0.72) * Math.PI * 4;
    return {
      x: millAt.x + Math.sin(angle) * millRadius,
      y: floorHeight,
      z: millAt.z + Math.cos(angle) * millRadius,
      heading: Math.atan2(Math.cos(angle), -Math.sin(angle)),
    };
  }
  return lerpSpot(ring, millFinish, (progress - 0.86) / 0.14);
};

/* ------------------------------------------------------------------ */
/* Decks and blockers                                                  */
/* ------------------------------------------------------------------ */

const decks: Deck[] = [
  buildFlatDeck(
    { minX: -streetEnd, maxX: streetEnd, minZ: buildingFront, maxZ: -roadHalf },
    floorHeight,
    "trail",
  ),
  buildFlatDeck(
    { minX: -streetEnd, maxX: streetEnd, minZ: roadHalf, maxZ: pavementEdge },
    floorHeight,
    "trail",
  ),
  buildFlatDeck(
    { minX: -8.2, maxX: 8.2, minZ: backZ, maxZ: buildingFront },
    floorHeight,
    "trail",
  ),
  buildFlatDeck(wineShop, floorHeight, "trail"),
  ...crossings.flatMap((x) =>
    stoneRows.map((z) =>
      buildFlatDeck(
        {
          minX: x - stoneSize.x / 2,
          maxX: x + stoneSize.x / 2,
          minZ: z - stoneSize.z / 2,
          maxZ: z + stoneSize.z / 2,
        },
        floorHeight,
        "trail",
      ),
    ),
  ),
];

const blockers: LocalBlocker[] = [
  { x: millAt.x, z: millAt.z, radius: 0.55 },
  { x: secondMillAt.x, z: secondMillAt.z, radius: 0.55 },
  { x: ovenAt.x, z: ovenAt.z, radius: 0.8 },
  { x: fountainAt.x, z: fountainAt.z, radius: 0.55 },
  { x: cartAt.x, z: cartAt.z, radius: 0.9 },
  { x: donkeyAt.x, z: donkeyAt.z, radius: 0.55 },
  { x: statueAt.x, z: statueAt.z, radius: 0.45 },
  ...cypresses.map(([x, , z]) => ({ x, z, radius: 0.4 })),
  { x: vesuviusAt.x, z: vesuviusAt.z, radius: 2 },
];

export const pompeiiStreetModel: NewLandAttractionModel = {
  kind: "pompeii-street",
  islandId: "ember-isle",
  name: "Pompeii Street",
  fact: "In AD 79 the volcano Vesuvius erupted and buried the Roman town of Pompeii under deep ash. The ash kept its streets, shops, paintings and even loaves of bread hidden for over 1,500 years, so archaeologists can see how Romans lived. Its big stepping stones let people cross the road without treading in the mud.",
  curriculumLink:
    "History, Key Stage 2: the Roman Empire. How archaeologists learn about everyday Roman life from towns like Pompeii, buried when Vesuvius erupted in AD 79.",
  footprint: 10,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: signAt.x, z: signAt.z + 0.65 },
  build: (builder) => {
    buildStreet(builder);
    buildThermopolium(builder);
    buildBakery(builder);
    buildHouse(builder);
    buildSquare(builder);
    buildVesuvius(builder);
  },
  moving: [
    {
      name: "millstone",
      pivot: [millAt.x, floorHeight + 1.05, millAt.z],
      build: (builder) => {
        buildMillTop(builder);
      },
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 2.4, reach: 3.5 },
    },
    {
      name: "fountain jet",
      pivot: [fountainAt.x, fountainWater, fountainAt.z - 0.05],
      build: buildFountainJet,
      motion: { kind: "splash", reach: 4, period: 1.3 },
    },
    {
      name: "oven fire",
      pivot: [ovenAt.x, 1.2, ovenAt.z + 0.8],
      build: buildOvenFire,
      motion: { kind: "flicker", period: 0.9 },
    },
    {
      name: "donkey head",
      pivot: donkeyHeadPivot,
      build: buildDonkeyHead,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 4,
        amplitude: 0.35,
        period: 1.4,
      },
    },
    {
      name: "shrine lamps",
      pivot: [-4.6, floorHeight + 0.97, backZ + 0.45],
      build: buildShrineLamps,
      motion: { kind: "wake", reach: 3.5 },
    },
  ],
  wanderers: [
    {
      name: "townsfolk",
      build: buildRoman,
      count: 3,
      centre: { x: 0, z: 5 },
      radius: 2.4,
      speed: 0.45,
    },
    {
      name: "street dog",
      build: buildDog,
      count: 1,
      centre: { x: 0, z: 0 },
      radius: 4,
      speed: 0.9,
    },
  ],
  smoke: [
    {
      at: [vesuviusAt.x, vesuviusHeight - 0.1, vesuviusAt.z],
      colour: "#8a837d",
      puffs: 9,
      size: 0.8,
      rise: 5,
      spread: 1.3,
    },
    {
      at: [ovenAt.x, 3.65, ovenAt.z - 0.3],
      colour: "#d8d2ca",
      puffs: 6,
      size: 0.28,
      rise: 2.2,
      spread: 0.5,
    },
  ],
  blockers,
  decks,
  rides: [
    {
      id: "mill",
      name: "the baker's mill",
      start: millStart,
      reach: 0.6,
      seconds: 10,
      finish: millFinish,
      follow: pushMill,
    },
  ],
  play: {
    label: "Bake a Roman loaf",
    news: "The baker slid a round loaf out of the oven, scored into eight wedges, just like the loaves found in Pompeii's ash!",
  },
};
