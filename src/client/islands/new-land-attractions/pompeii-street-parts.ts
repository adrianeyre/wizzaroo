import { LatheGeometry, Vector2 } from "three";
import {
  addGableRoof,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type Triple,
} from "../attractions/attraction-kit.js";

/* The Pompeii Street's colours: dark basalt paving, tuff pavements,
 * Pompeian red and ochre plaster, terracotta tiles and bronze. */
export const pompeiiColours = {
  basalt: "#3a3634",
  basaltLight: "#4f4945",
  rut: "#272322",
  tuff: "#9b8f80",
  kerb: "#6e6660",
  floor: "#a5543f",
  plaster: "#e8dcc2",
  red: "#a8322a",
  darkRed: "#7c241f",
  ochre: "#d9a441",
  black: "#1e1a19",
  marble: "#ece6dc",
  tile: "#b5552f",
  timber: "#6b4428",
  darkTimber: "#4a2e1b",
  terracotta: "#c0673d",
  bronze: "#a0703a",
  ash: "#7d746c",
  lava: "#ff8c1a",
  lavaBright: "#ffd166",
  leaf: "#2f4f2a",
  bread: "#c98a45",
  water: "#4fa8c9",
} as const;

const c = pompeiiColours;

/** Pavements and shop floors stand this high above the road. */
export const floorHeight = 0.3;
export const roadHalf = 1;
export const pavementEdge = 2.3;
export const streetEnd = 8.6;
export const backZ = -5.6;
export const buildingFront = -2.3;

/** The raised stepping stones, three across the road at each crossing. */
export const crossings = [-0.4, 4.6];
export const stoneRows = [-0.6, 0, 0.6];
export const stoneSize = { x: 0.6, z: 0.42 };

export const millAt = { x: -1.2, z: -3.7 };
export const secondMillAt = { x: -2.55, z: -4.9 };
export const ovenAt = { x: 0.85, z: -4.6 };
export const fountainAt = { x: 2.4, z: 1.72 };
export const cartAt = { x: 5.4, z: 4.7 };
export const donkeyAt = { x: 7.2, z: 4.7 };
export const wineShop = { minX: -8, maxX: -4.4, minZ: 2.3, maxZ: 4.8 };
export const statueAt = { x: -3.1, z: 3.6 };
export const cypresses: Triple[] = [
  [-2.5, 0, 6.6],
  [3.4, 0, 6.8],
  [-6.2, 0, 6.9],
];

/** A box between two corners, for walls and slabs. */
export const slab = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  [x0, y0, z0]: Triple,
  [x1, y1, z1]: Triple,
) => {
  const size: Triple = [x1 - x0, y1 - y0, z1 - z0];
  /* Far away, thin small details (paintings, mosaics, rails) are dropped */
  if (builder.isFar && Math.min(...size) <= 0.06 && Math.max(...size) < 1.2) {
    return;
  }
  builder.box(
    finish,
    colour,
    [x1 - x0, y1 - y0, z1 - z0],
    [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
  );
};

/** A tiled roof with ridge tiles and rows of curved cover tiles. */
export const addTiledRoof = (
  builder: AttractionBuilder,
  {
    minX,
    maxX,
    minZ,
    maxZ,
    eave,
    rise,
  }: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    eave: number;
    rise: number;
  },
) => {
  const overhang = 0.25;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const x = (minX + maxX) / 2;
  const z = (minZ + maxZ) / 2;
  addGableRoof(builder, {
    width,
    depth,
    rise,
    at: [x, eave, z],
    colour: c.tile,
    overhang,
    thickness: 0.1,
  });
  builder.cylinder("matte", shade(c.tile, 0.85), {
    radius: 0.09,
    length: width + overhang * 2,
    at: [x, eave + rise + 0.06, z],
    axis: "x",
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  const halfDepth = depth / 2 + overhang;
  const rows = Math.floor(width / 0.75);
  for (let row = 0; row <= rows; row++) {
    const along = minX - overhang + 0.12 + (row / rows) * (width + 0.26);
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        shade(c.tile, 0.9),
        [along, eave + 0.07, z + side * halfDepth],
        [along, eave + rise + 0.07, z],
        0.08,
        3,
      );
    });
  }
};

/** An amphora: a tall two-handled jar with a pointed foot. */
export const addAmphora = (
  builder: AttractionBuilder,
  at: Triple,
  size = 1,
  tilt = 0,
  colour: string = c.terracotta,
) => {
  const profile: [number, number][] = [
    [0, 0],
    [0.04, 0.02],
    [0.06, 0.12],
    [0.15, 0.32],
    [0.17, 0.48],
    [0.13, 0.62],
    [0.05, 0.7],
    [0.045, 0.86],
    [0.06, 0.88],
    [0.04, 0.9],
  ];
  if (builder.isFar) {
    builder.cylinder("matte", colour, {
      radius: 0.05 * size,
      radiusEnd: 0.15 * size,
      length: 0.85 * size,
      at: [at[0], at[1] + 0.43 * size, at[2]],
      segments: 5,
    });
    return;
  }
  builder.add("matte", colour, latheGeometry(profile, size, 8), {
    at,
    rotation: [0, 0, tilt],
  });
  [-1, 1].forEach((side) => {
    const turn = (point: Triple): Triple => {
      const [x, y] = point;
      return [
        at[0] + (x * Math.cos(tilt) - y * Math.sin(tilt)) * size,
        at[1] + (x * Math.sin(tilt) + y * Math.cos(tilt)) * size,
        at[2] + point[2] * size,
      ];
    };
    builder.bar(
      "matte",
      shade(colour, 0.9),
      turn([side * 0.05, 0.8, 0]),
      turn([side * 0.13, 0.66, 0]),
      0.03 * size,
      4,
    );
  });
};

const latheGeometry = (
  profile: readonly (readonly [number, number])[],
  size: number,
  segments: number,
) =>
  new LatheGeometry(
    profile.map(
      ([radius, height]) => new Vector2(radius * size, height * size),
    ),
    segments,
  );

/** A Pompeian mill: a cone of stone with an hourglass stone turning on it. */
export const addMillBase = (
  builder: AttractionBuilder,
  { x, z }: { x: number; z: number },
) => {
  builder.cylinder("matte", c.basaltLight, {
    radius: 0.62,
    radiusEnd: 0.56,
    length: 0.16,
    at: [x, floorHeight + 0.08, z],
    segments: builder.segments(18, 10),
  });
  builder.lathe(
    "matte",
    c.basalt,
    [
      [0.5, 0],
      [0.46, 0.1],
      [0.3, 0.55],
      [0.08, 0.95],
      [0, 1],
    ],
    [x, floorHeight + 0.16, z],
    "y",
    builder.segments(16, 8),
  );
};

/** The hourglass top stone, hollow, with its wooden pushing bars. */
export const buildMillTop = (
  builder: AttractionBuilder,
  isTurning = true,
  [ax, ay, az]: Triple = [0, 0, 0],
) => {
  const p = (x: number, y: number, z: number): Triple => [
    ax + x,
    ay + y,
    az + z,
  ];
  builder.lathe(
    "matte",
    c.basalt,
    [
      [0.44, -0.5],
      [0.4, -0.3],
      [0.24, -0.04],
      [0.22, 0.04],
      [0.38, 0.3],
      [0.44, 0.52],
      [0.36, 0.54],
    ],
    p(0, 0, 0),
    "y",
    builder.segments(18, 8),
  );
  builder.cylinder("matte", c.rut, {
    radius: 0.35,
    length: 0.02,
    at: p(0, 0.5, 0),
    segments: builder.segments(14, 6),
  });
  [0, Math.PI / 2].forEach((turn) => {
    builder.box("matte", c.basaltLight, [0.62, 0.16, 0.16], p(0, 0, 0), [
      0,
      turn,
      0,
    ]);
  });
  if (!isTurning) {
    return;
  }
  builder.box("matte", c.timber, [1.75, 0.09, 0.09], [0, 0.0, 0]);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", c.darkTimber, {
      radius: 0.05,
      length: 0.14,
      at: [side * 0.86, 0, 0],
      axis: "x",
      segments: 6,
    });
    builder.box("metal", c.bronze, [0.04, 0.12, 0.12], [side * 0.36, 0, 0]);
  });
};

/** The thermopolium: a Roman snack bar, its counter set with pots. */
export const buildThermopolium = (builder: AttractionBuilder) => {
  const minX = -8.2;
  const maxX = -3.4;
  const top = 2.9;
  slab(
    builder,
    "matte",
    c.plaster,
    [minX, 0, backZ],
    [minX + 0.3, top, buildingFront],
  );
  slab(builder, "matte", c.plaster, [minX, 0, backZ], [maxX, top, backZ + 0.3]);
  slab(
    builder,
    "matte",
    c.plaster,
    [maxX - 0.15, 0, backZ],
    [maxX + 0.15, top, buildingFront],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [minX + 0.3, 2.3, buildingFront - 0.25],
    [maxX - 0.15, top, buildingFront],
  );
  slab(
    builder,
    "paint",
    c.red,
    [minX - 0.01, 0.3, buildingFront - 0.25],
    [minX + 0.31, 1.4, buildingFront + 0.01],
  );
  slab(
    builder,
    "paint",
    c.ochre,
    [minX + 0.3, 2.3, buildingFront + 0.01],
    [maxX - 0.15, 2.42, buildingFront + 0.03],
  );
  /* The counter, faced with coloured marble and paintings */
  const counterTop = 1.2;
  slab(
    builder,
    "matte",
    c.plaster,
    [-7.9, floorHeight, -3.0],
    [-5.6, counterTop, -2.45],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [-7.9, floorHeight, -4.0],
    [-7.35, counterTop, -3.0],
  );
  slab(
    builder,
    "paint",
    c.marble,
    [-7.95, counterTop, -3.05],
    [-5.55, counterTop + 0.06, -2.4],
  );
  slab(
    builder,
    "paint",
    c.marble,
    [-7.95, counterTop, -4.05],
    [-7.3, counterTop + 0.06, -3.05],
  );
  slab(
    builder,
    "paint",
    c.red,
    [-7.85, floorHeight + 0.05, -2.45],
    [-5.65, counterTop - 0.05, -2.43],
  );
  [-7.25, -6.6, -5.95].forEach((x) => {
    builder.cylinder("matte", c.terracotta, {
      radius: 0.2,
      length: 0.05,
      at: [x, counterTop + 0.06, -2.72],
      segments: builder.segments(12, 6),
    });
    builder.cylinder("matte", c.black, {
      radius: 0.15,
      length: 0.01,
      at: [x, counterTop + 0.086, -2.72],
      segments: builder.segments(14, 6),
    });
  });
  builder.cylinder("matte", c.terracotta, {
    radius: 0.17,
    length: 0.05,
    at: [-7.62, counterTop + 0.06, -3.55],
    segments: builder.segments(12, 6),
  });
  builder.cylinder("matte", c.black, {
    radius: 0.13,
    length: 0.01,
    at: [-7.62, counterTop + 0.086, -3.55],
    segments: builder.segments(12, 6),
  });
  if (!builder.isFar) {
    [-7.4, -6.7, -6.0].forEach((x, index) => {
      slab(
        builder,
        "paint",
        index === 1 ? c.ochre : c.plaster,
        [x - 0.26, 0.5, -2.43],
        [x + 0.26, 1.0, -2.41],
      );
      /* A painted duck and a cockerel, as on the real counters */
      builder.sphere(
        "paint",
        index === 1 ? c.red : "#3d6b48",
        0.07,
        [x, 0.72, -2.4],
        [1.4, 0.8, 0.3],
        8,
      );
    });
    for (let chip = 0; chip < 8; chip++) {
      const x = -7.85 + ((chip * 0.37) % 2.1);
      const y = 0.38 + ((chip * 0.13) % 0.08);
      slab(
        builder,
        "paint",
        chip % 3 === 0 ? c.ochre : chip % 3 === 1 ? "#5d7a8c" : c.marble,
        [x, y, -2.42],
        [x + 0.1, y + 0.07, -2.4],
      );
    }
    /* Jugs on a shelf at the back */
    slab(builder, "matte", c.timber, [-7.8, 1.55, -5.3], [-5.6, 1.6, -5.05]);
    [-7.4, -6.7, -6.0].forEach((x, index) => {
      builder.lathe(
        "matte",
        index % 2 === 0 ? c.terracotta : shade(c.terracotta, 0.8),
        [
          [0, 0],
          [0.08, 0.01],
          [0.1, 0.12],
          [0.05, 0.24],
          [0.06, 0.28],
          [0, 0.28],
        ],
        [x, 1.6, -5.17],
        "y",
        8,
      );
    });
  }
  /* The lararium: a little household shrine painted on the back wall */
  const shrineX = -4.6;
  slab(
    builder,
    "paint",
    c.red,
    [shrineX - 0.5, 1.2, backZ + 0.3],
    [shrineX + 0.5, 2.1, backZ + 0.32],
  );
  slab(
    builder,
    "matte",
    c.marble,
    [shrineX - 0.55, 1.1, backZ + 0.3],
    [shrineX + 0.55, 1.2, backZ + 0.55],
  );
  builder.cylinder("matte", c.marble, {
    radius: 0.62,
    length: 0.2,
    at: [shrineX, 2.25, backZ + 0.36],
    axis: "z",
    segments: 3,
  });
  if (!builder.isFar) {
    [-0.42, 0.42].forEach((side) => {
      builder.cylinder("matte", c.marble, {
        radius: 0.05,
        length: 0.85,
        at: [shrineX + side, 1.62, backZ + 0.45],
        segments: 8,
      });
    });
    [-0.2, 0.2].forEach((side) => {
      builder.box(
        "paint",
        c.ochre,
        [0.1, 0.4, 0.01],
        [shrineX + side, 1.6, backZ + 0.33],
      );
      builder.sphere(
        "paint",
        c.ochre,
        0.05,
        [shrineX + side, 1.85, backZ + 0.33],
        [1, 1, 0.3],
        6,
      );
    });
    builder.lathe(
      "matte",
      c.terracotta,
      [
        [0, 0],
        [0.07, 0.02],
        [0.05, 0.05],
        [0, 0.05],
      ],
      [shrineX - 0.15, 1.2, backZ + 0.45],
      "y",
      8,
    );
    builder.lathe(
      "matte",
      c.terracotta,
      [
        [0, 0],
        [0.07, 0.02],
        [0.05, 0.05],
        [0, 0.05],
      ],
      [shrineX + 0.15, 1.2, backZ + 0.45],
      "y",
      8,
    );
  }
  addTiledRoof(builder, {
    minX,
    maxX,
    minZ: backZ,
    maxZ: buildingFront,
    eave: top,
    rise: 0.7,
  });
  /* A shop sign of a jug over the opening */
  builder.box(
    "paint",
    c.ochre,
    [1.3, 0.38, 0.06],
    [-5.8, 2.62, buildingFront + 0.06],
  );
  builder.lathe(
    "paint",
    c.red,
    [
      [0, 0],
      [0.08, 0.02],
      [0.1, 0.12],
      [0.05, 0.22],
      [0, 0.22],
    ],
    [-5.8, 2.5, buildingFront + 0.1],
    "y",
    8,
  );
};

/** The bakery, with its two mills, a domed oven and fresh loaves. */
export const buildBakery = (builder: AttractionBuilder) => {
  const minX = -3.25;
  const maxX = 1.8;
  const top = 2.9;
  slab(builder, "matte", c.plaster, [minX, 0, backZ], [maxX, top, backZ + 0.3]);
  slab(
    builder,
    "matte",
    c.plaster,
    [minX, 0, buildingFront - 0.25],
    [-2.7, top, buildingFront],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [0.9, 0, buildingFront - 0.25],
    [maxX, top, buildingFront],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [-2.7, 2.3, buildingFront - 0.25],
    [0.9, top, buildingFront],
  );
  slab(
    builder,
    "paint",
    c.ochre,
    [minX - 0.01, 0.3, buildingFront + 0.01],
    [-2.7, 1.3, buildingFront + 0.02],
  );
  slab(
    builder,
    "paint",
    c.ochre,
    [0.9, 0.3, buildingFront + 0.01],
    [maxX, 1.3, buildingFront + 0.02],
  );
  slab(
    builder,
    "paint",
    c.red,
    [-2.7, 2.3, buildingFront + 0.01],
    [0.9, 2.42, buildingFront + 0.03],
  );
  addMillBase(builder, millAt);
  addMillBase(builder, secondMillAt);
  buildMillTop(builder, false, [
    secondMillAt.x,
    floorHeight + 1.05,
    secondMillAt.z,
  ]);
  /* The domed oven, with its chimney up through the roof */
  const { x, z } = ovenAt;
  slab(
    builder,
    "matte",
    c.basaltLight,
    [x - 0.8, floorHeight, z - 0.75],
    [x + 0.8, 1.15, z + 0.7],
  );
  builder.lathe(
    "matte",
    "#8c4b34",
    [
      [0.78, 0],
      [0.74, 0.25],
      [0.6, 0.5],
      [0.36, 0.7],
      [0, 0.78],
    ],
    [x, 1.15, z],
    "y",
    builder.segments(18, 10),
  );
  builder.cylinder("matte", c.black, {
    radius: 0.24,
    length: 0.06,
    at: [x, 1.4, z + 0.72],
    axis: "z",
    segments: builder.segments(12, 6),
  });
  builder.torus("matte", "#8c4b34", 0.26, 0.05, [x, 1.4, z + 0.74], "z", 14);
  slab(
    builder,
    "matte",
    c.basaltLight,
    [x - 0.2, 1.8, z - 0.5],
    [x + 0.2, 3.5, z - 0.1],
  );
  slab(
    builder,
    "matte",
    c.rut,
    [x - 0.24, 3.5, z - 0.54],
    [x + 0.24, 3.6, z - 0.06],
  );
  /* The table of fresh round loaves */
  slab(builder, "matte", c.timber, [1.1, 0.95, -3.7], [1.65, 1.0, -2.65]);
  [
    [1.1, -3.7],
    [1.65, -3.7],
    [1.1, -2.65],
    [1.65, -2.65],
  ].forEach(([legX, legZ]) => {
    slab(
      builder,
      "matte",
      c.darkTimber,
      [
        legX - 0.03 + (legX > 1.3 ? -0.03 : 0.03),
        floorHeight,
        legZ - 0.03 + (legZ > -3 ? -0.03 : 0.03),
      ],
      [
        legX + 0.03 + (legX > 1.3 ? -0.03 : 0.03),
        0.95,
        legZ + 0.03 + (legZ > -3 ? -0.03 : 0.03),
      ],
    );
  });
  [-3.45, -3.15, -2.88].forEach((loafZ, index) => {
    addLoaf(builder, [1.38 + (index % 2) * 0.08, 1.0, loafZ]);
  });
  if (!builder.isFar) {
    /* Sacks of flour and a pile of wood for the oven */
    [
      [-2.85, -3.0],
      [-2.9, -3.45],
    ].forEach(([sackX, sackZ]) => {
      builder.sphere(
        "matte",
        c.plaster,
        0.24,
        [sackX, floorHeight + 0.24, sackZ],
        [1, 1.25, 1],
        8,
      );
      builder.cylinder("matte", c.timber, {
        radius: 0.05,
        length: 0.06,
        at: [sackX, floorHeight + 0.55, sackZ],
        segments: 6,
      });
    });
    for (let log = 0; log < 3; log++) {
      builder.cylinder("matte", log % 2 === 0 ? c.timber : c.darkTimber, {
        radius: 0.07,
        length: 0.9,
        at: [
          x - 0.95 + (log % 3) * 0.15,
          floorHeight + 0.08 + Math.floor(log / 3) * 0.13,
          z + 0.2,
        ],
        axis: "z",
        segments: 6,
      });
    }
    /* A long wooden peel for sliding bread in */
    builder.bar(
      "matte",
      c.timber,
      [x + 0.65, floorHeight, z + 0.95],
      [x + 0.75, 1.9, z + 0.9],
      0.05,
      5,
    );
    builder.box(
      "matte",
      c.timber,
      [0.28, 0.32, 0.03],
      [x + 0.65, floorHeight + 0.2, z + 0.97],
    );
  }
  addTiledRoof(builder, {
    minX,
    maxX,
    minZ: backZ,
    maxZ: buildingFront,
    eave: top,
    rise: 0.7,
  });
  builder.box(
    "paint",
    c.red,
    [1.3, 0.38, 0.06],
    [-0.9, 2.62, buildingFront + 0.06],
  );
  addLoaf(builder, [-0.9, 2.53, buildingFront + 0.1], 1.1);
};

/** A round Roman loaf, scored into eight wedges like the ones found in Pompeii. */
export const addLoaf = (builder: AttractionBuilder, at: Triple, size = 1) => {
  builder.sphere(
    "matte",
    c.bread,
    0.13 * size,
    [at[0], at[1] + 0.03 * size, at[2]],
    [1, 0.5, 1],
    8,
  );
  if (builder.isFar) {
    return;
  }
  [0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4].forEach((turn) => {
    builder.box(
      "matte",
      shade(c.bread, 0.7),
      [0.24 * size, 0.012, 0.012],
      [at[0], at[1] + 0.095 * size, at[2]],
      [0, turn, 0],
    );
  });
};

/** The red-walled house, with its balcony and its CAVE CANEM mosaic. */
export const buildHouse = (builder: AttractionBuilder) => {
  const minX = 1.8;
  const maxX = 8.2;
  const top = 4.3;
  const doorX = 4.6;
  slab(builder, "matte", c.plaster, [minX, 0, backZ], [maxX, top, backZ + 0.3]);
  slab(
    builder,
    "matte",
    c.plaster,
    [maxX - 0.3, 0, backZ],
    [maxX, top, buildingFront],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [minX, 0, backZ],
    [minX + 0.3, top, buildingFront],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [minX, 0, buildingFront - 0.3],
    [doorX - 0.6, top, buildingFront],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [doorX + 0.6, 0, buildingFront - 0.3],
    [maxX, top, buildingFront],
  );
  slab(
    builder,
    "matte",
    c.plaster,
    [doorX - 0.6, 2.3, buildingFront - 0.3],
    [doorX + 0.6, top, buildingFront],
  );
  /* Pompeian red below, with ochre panels above */
  slab(
    builder,
    "paint",
    c.red,
    [minX - 0.01, 0.3, buildingFront + 0.01],
    [doorX - 0.6, 1.55, buildingFront + 0.02],
  );
  slab(
    builder,
    "paint",
    c.red,
    [doorX + 0.6, 0.3, buildingFront + 0.01],
    [maxX + 0.01, 1.55, buildingFront + 0.02],
  );
  slab(
    builder,
    "paint",
    c.darkRed,
    [minX - 0.01, 1.55, buildingFront + 0.01],
    [maxX + 0.01, 1.65, buildingFront + 0.03],
  );
  slab(
    builder,
    "paint",
    c.red,
    [minX - 0.01, top - 0.25, buildingFront + 0.01],
    [maxX + 0.01, top, buildingFront + 0.03],
  );
  slab(
    builder,
    "paint",
    c.red,
    [maxX + 0.01, 0.3, backZ],
    [maxX + 0.02, 1.55, buildingFront],
  );
  /* The doorway: pilasters, a lintel and tall studded doors */
  [-1, 1].forEach((side) => {
    slab(
      builder,
      "paint",
      c.marble,
      [doorX + side * 0.6 - 0.12, floorHeight, buildingFront],
      [doorX + side * 0.6 + 0.12, 2.4, buildingFront + 0.1],
    );
    slab(
      builder,
      "paint",
      c.marble,
      [doorX + side * 0.6 - 0.17, 2.4, buildingFront],
      [doorX + side * 0.6 + 0.17, 2.52, buildingFront + 0.14],
    );
    slab(
      builder,
      "paint",
      c.darkTimber,
      [doorX + (side < 0 ? -0.5 : 0.01), floorHeight, buildingFront - 0.22],
      [doorX + (side < 0 ? -0.01 : 0.5), 2.3, buildingFront - 0.17],
    );
  });
  slab(
    builder,
    "paint",
    c.marble,
    [doorX - 0.8, 2.52, buildingFront],
    [doorX + 0.8, 2.64, buildingFront + 0.16],
  );
  if (!builder.isFar) {
    builder.torus(
      "metal",
      c.bronze,
      0.07,
      0.015,
      [doorX + 0.18, 1.2, buildingFront - 0.15],
      "z",
      10,
    );
    /* Painted panels, and red election slogans on the wall */
    [2.5, 3.4, 5.8, 6.7, 7.5].forEach((panelX) => {
      slab(
        builder,
        "paint",
        c.ochre,
        [panelX - 0.3, 0.5, buildingFront + 0.02],
        [panelX + 0.3, 1.35, buildingFront + 0.03],
      );
      slab(
        builder,
        "paint",
        c.darkRed,
        [panelX - 0.22, 0.58, buildingFront + 0.03],
        [panelX + 0.22, 1.27, buildingFront + 0.035],
      );
    });
    for (let letter = 0; letter < 7; letter++) {
      const letterX = 5.75 + letter * 0.2;
      slab(
        builder,
        "paint",
        c.red,
        [letterX, 1.8, buildingFront + 0.02],
        [letterX + 0.04, 2.1, buildingFront + 0.025],
      );
      slab(
        builder,
        "paint",
        c.red,
        [letterX, letter % 2 === 0 ? 2.06 : 1.8, buildingFront + 0.02],
        [
          letterX + 0.13,
          (letter % 2 === 0 ? 2.06 : 1.8) + 0.04,
          buildingFront + 0.025,
        ],
      );
    }
  }
  /* The CAVE CANEM ("beware of the dog") mosaic at the doorstep */
  const mosaicZ = buildingFront + 0.5;
  slab(
    builder,
    "matte",
    c.marble,
    [doorX - 0.5, floorHeight, mosaicZ - 0.32],
    [doorX + 0.5, floorHeight + 0.012, mosaicZ + 0.32],
  );
  slab(
    builder,
    "matte",
    c.black,
    [doorX - 0.45, floorHeight + 0.012, mosaicZ - 0.27],
    [doorX + 0.45, floorHeight + 0.016, mosaicZ + 0.27],
  );
  slab(
    builder,
    "matte",
    c.marble,
    [doorX - 0.4, floorHeight + 0.016, mosaicZ - 0.22],
    [doorX + 0.4, floorHeight + 0.02, mosaicZ + 0.22],
  );
  if (!builder.isFar) {
    const dog: [number, number, number, number][] = [
      [0, 0, 0.36, 0.1],
      [0.22, 0.06, 0.12, 0.1],
      [0.3, 0.04, 0.08, 0.05],
      [-0.2, 0.06, 0.14, 0.03],
      [-0.13, -0.09, 0.03, 0.12],
      [-0.03, -0.09, 0.03, 0.12],
      [0.09, -0.09, 0.03, 0.12],
      [0.17, -0.09, 0.03, 0.12],
    ];
    dog.forEach(([dx, dz, w, d]) => {
      slab(
        builder,
        "matte",
        c.black,
        [doorX + dx - w / 2, floorHeight + 0.02, mosaicZ - dz - d / 2],
        [doorX + dx + w / 2, floorHeight + 0.025, mosaicZ - dz + d / 2],
      );
    });
    slab(
      builder,
      "matte",
      c.red,
      [doorX + 0.15, floorHeight + 0.025, mosaicZ - 0.12],
      [doorX + 0.18, floorHeight + 0.03, mosaicZ - 0.01],
    );
    for (let letter = 0; letter < 5; letter++) {
      const letterX = doorX - 0.3 + letter * 0.14;
      slab(
        builder,
        "matte",
        c.black,
        [letterX, floorHeight + 0.02, mosaicZ + 0.13],
        [letterX + 0.04, floorHeight + 0.025, mosaicZ + 0.19],
      );
    }
  }
  /* The upstairs balcony, over the pavement */
  const balconyY = 2.7;
  slab(
    builder,
    "matte",
    c.timber,
    [2.4, balconyY, buildingFront],
    [3.9 + 0.01, balconyY + 0.1, -1.45],
  );
  slab(
    builder,
    "matte",
    c.timber,
    [5.3, balconyY, buildingFront],
    [7.6, balconyY + 0.1, -1.45],
  );
  [2.4, 3.9, 5.3, 7.6].forEach((postX) => {
    builder.cylinder("matte", c.darkTimber, {
      radius: 0.05,
      length: 1.25,
      at: [
        postX + (postX === 2.4 || postX === 5.3 ? 0.06 : -0.06),
        balconyY + 0.72,
        -1.5,
      ],
      segments: 6,
    });
  });
  [
    [2.4, 3.9],
    [5.3, 7.6],
  ].forEach(([from, to]) => {
    slab(
      builder,
      "matte",
      c.darkTimber,
      [from, balconyY + 0.6, -1.53],
      [to, balconyY + 0.66, -1.47],
    );
    if (!builder.isFar) {
      for (let rail = from + 0.2; rail < to - 0.1; rail += 0.3) {
        builder.box(
          "matte",
          c.timber,
          [0.03, 0.5, 0.03],
          [rail, balconyY + 0.35, -1.5],
        );
      }
      for (let joist = from + 0.1; joist < to; joist += 0.7) {
        slab(
          builder,
          "matte",
          c.darkTimber,
          [joist - 0.05, balconyY - 0.14, buildingFront],
          [joist + 0.05, balconyY, -1.4],
        );
      }
    }
    builder.box(
      "matte",
      c.tile,
      [to - from + 0.3, 0.06, 1.15],
      [(from + to) / 2, 3.75, -1.85],
      [-0.3, 0, 0],
    );
  });
  /* Small upstairs windows with wooden shutters */
  [2.9, 3.45, 5.8, 6.5, 7.2].forEach((windowX) => {
    slab(
      builder,
      "matte",
      c.black,
      [windowX - 0.16, 3.0, buildingFront + 0.01],
      [windowX + 0.16, 3.4, buildingFront + 0.02],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        c.timber,
        [0.14, 0.42, 0.03],
        [windowX - 0.25, 3.2, buildingFront + 0.04],
        [0, -0.5, 0],
      );
    }
  });
  addTiledRoof(builder, {
    minX,
    maxX,
    minZ: backZ,
    maxZ: buildingFront,
    eave: top,
    rise: 0.9,
  });
};
