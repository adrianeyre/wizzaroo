import { IcosahedronGeometry, LatheGeometry, Vector2 } from "three";
import {
  addDoor,
  addGableRoof,
  addSignBoard,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type SmokeSource,
  type Triple,
} from "./attraction-kit.js";

const snow = "#f3f6fa";
const snowShadow = "#dfe7f0";
const basalt = "#3b3836";
const darkBasalt = "#2c2a29";
const ash = "#6b625a";
const sinter = "#d8d3c4";
const spring = "#36bcc4";
const springFloor = "#86d3cc";
const boardwalk = "#9a6a43";
const boardwalkDark = "#6e4a2d";
const pine = "#2f5a3e";
const logTimber = "#7a4f30";
const hutDoor = "#3f5f6e";
const signBlue = "#2f5566";

const deckHeight = 0.2;

interface Pool {
  x: number;
  z: number;
  radiusX: number;
  radiusZ: number;
  level: number;
  turn: number;
}

/* Three terraced pools, each spilling down to the next. */
const pools: readonly Pool[] = [
  { x: -1.1, z: -3.3, radiusX: 1.9, radiusZ: 1.45, level: 1.1, turn: 0.2 },
  { x: 1.75, z: -0.9, radiusX: 1.45, radiusZ: 1.2, level: 0.55, turn: -0.4 },
  { x: -1.35, z: 0.75, radiusX: 1.55, radiusZ: 1.15, level: 0.26, turn: 0.1 },
];

/* The boardwalk: rectangles of decking at the same height. */
interface Walk {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const walks: readonly Walk[] = [
  { minX: -0.65, maxX: 0.65, minZ: 3.0, maxZ: 7.4 },
  { minX: -4.6, maxX: 4.6, minZ: 2.7, maxZ: 3.9 },
  { minX: 3.45, maxX: 4.6, minZ: -4.55, maxZ: 2.7 },
  { minX: -4.6, maxX: -3.45, minZ: -2.6, maxZ: 2.7 },
];

const hutAt = { x: 4.05, z: -5.55 };
const hutWidth = 2.2;
const hutDepth = 1.7;

const lanterns: readonly Triple[] = [
  [-4.45, deckHeight, 3.75],
  [4.45, deckHeight, 3.75],
  [4.45, deckHeight, -0.9],
  [-4.45, deckHeight, -2.45],
  [-0.5, deckHeight, 7.25],
  [0.5, deckHeight, 7.25],
];

const pines: readonly [number, number, number][] = [
  [-5.6, -5.2, 1.05],
  [-3.4, -6.7, 0.8],
  [6.8, -1.9, 0.9],
  [7.0, 2.4, 0.7],
  [-6.4, 4.6, 0.8],
];

/* Lumpy volcanic rock: an icosahedron pushed about by a little noise. */
const addRock = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  size: Triple,
  seed: number,
): void => {
  const geometry = new IcosahedronGeometry(1, builder.isFar ? 0 : 1);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const lump =
      1 +
      0.16 * Math.sin(x * 4.1 + seed) * Math.cos(z * 3.7 + seed * 1.3) +
      0.09 * Math.sin(y * 5.3 + seed * 0.7);
    positions.setXYZ(index, x * lump, y * lump, z * lump);
  }
  builder.add("matte", colour, geometry, {
    at,
    rotation: [0, seed * 1.9, 0],
    scale: size,
  });
};

/** A soft mound (a dune or a snowdrift), round in plan and stretched along x. */
const addMound = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  size: number,
  height: number,
): void => {
  const profile: readonly [number, number][] = [
    [1, 0],
    [0.82, 0.32],
    [0.55, 0.78],
    [0.25, 0.97],
    [0, 1],
  ];
  builder.add(
    "matte",
    colour,
    new LatheGeometry(
      profile.map(([radius, up]) => new Vector2(radius * size, up * height)),
      builder.segments(14, 8),
    ),
    { at, scale: [1.5, 1, 1] },
  );
};

const addEllipseLathe = (
  builder: AttractionBuilder,
  finish: "matte" | "water",
  colour: string,
  profile: readonly (readonly [number, number])[],
  pool: Pool,
): void => {
  builder.add(
    finish,
    colour,
    new LatheGeometry(
      profile.map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(22, 12),
    ),
    {
      at: [pool.x, 0, pool.z],
      rotation: [0, pool.turn, 0],
      scale: [1, 1, pool.radiusZ / pool.radiusX],
    },
  );
};

const pointOnRim = (pool: Pool, angle: number, out: number): Triple => {
  const along = Math.cos(angle) * (pool.radiusX + out);
  const across = Math.sin(angle) * (pool.radiusZ + out * 0.9);
  return [
    pool.x + along * Math.cos(pool.turn) + across * Math.sin(pool.turn),
    0,
    pool.z - along * Math.sin(pool.turn) + across * Math.cos(pool.turn),
  ];
};

const buildPool = (builder: AttractionBuilder, pool: Pool, index: number) => {
  const radius = pool.radiusX;
  const { level } = pool;
  addEllipseLathe(
    builder,
    "matte",
    index === 0 ? ash : shade(ash, 0.92),
    [
      [radius + 0.75, -0.05],
      [radius + 0.6, level * 0.55],
      [radius + 0.32, level + 0.06],
      [radius + 0.08, level + 0.1],
      [radius - 0.02, level + 0.02],
    ],
    pool,
  );
  addEllipseLathe(
    builder,
    "matte",
    springFloor,
    [
      [radius, level + 0.02],
      [radius * 0.82, level - 0.22],
      [radius * 0.45, level - 0.34],
      [0, level - 0.36],
    ],
    pool,
  );
  addEllipseLathe(
    builder,
    "water",
    spring,
    [
      [radius + 0.02, level],
      [0, level],
    ],
    pool,
  );
  const rocks = builder.isFar ? 7 : 9;
  for (let rock = 0; rock < rocks; rock++) {
    const angle = (rock / rocks) * Math.PI * 2 + index * 0.7;
    const isBig = rock % 3 === 0;
    const size = (isBig ? 0.42 : 0.28) + 0.06 * Math.sin(rock * 2.7 + index);
    const [x, , z] = pointOnRim(pool, angle, 0.22 + size * 0.3);
    const lift = level * 0.85 + size * 0.25;
    addRock(
      builder,
      rock % 2 === 0 ? basalt : darkBasalt,
      [x, lift, z],
      [size * 1.25, size * 0.75, size],
      rock * 3.1 + index,
    );
    if (isBig) {
      builder.sphere(
        "matte",
        snow,
        size * 0.72,
        [x, lift + size * 0.66, z],
        [1.25, 0.24, 1.0],
        10,
      );
    }
  }
  if (builder.isFar) {
    return;
  }
  /* The pale mineral crust where the spring water spills over. */
  for (let crust = 0; crust < 3; crust++) {
    const angle = Math.PI * 0.35 + crust * 0.22 + index;
    const [x, , z] = pointOnRim(pool, angle, 0.05);
    builder.sphere(
      "matte",
      crust % 2 === 0 ? sinter : shade(sinter, 0.93),
      0.22,
      [x, level + 0.03, z],
      [1.3, 0.25, 1],
      10,
    );
  }
};

/* A thin fall of spring water from one pool down to the next. */
const buildSpill = (builder: AttractionBuilder, from: Pool, to: Pool) => {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const start: Triple = [
    from.x + (dx / length) * from.radiusX * 0.92,
    from.level + 0.04,
    from.z + (dz / length) * from.radiusZ * 0.92,
  ];
  const end: Triple = [
    to.x - (dx / length) * to.radiusX * 0.78,
    to.level + 0.02,
    to.z - (dz / length) * to.radiusZ * 0.78,
  ];
  const middle: Triple = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  const run = Math.hypot(end[0] - start[0], end[2] - start[2]);
  const drop = start[1] - end[1];
  builder.box(
    "matte",
    sinter,
    [0.7, 0.08, Math.hypot(run, drop) + 0.1],
    [middle[0], middle[1] - 0.06, middle[2]],
    [Math.atan2(drop, run), Math.atan2(dx, dz), 0],
  );
  builder.box(
    "water",
    shade(spring, 1.08),
    [0.5, 0.03, Math.hypot(run, drop)],
    [middle[0], middle[1] + 0.01, middle[2]],
    [Math.atan2(drop, run), Math.atan2(dx, dz), 0],
  );
};

const buildBoardwalk = (builder: AttractionBuilder) => {
  walks.forEach((walk, index) => {
    const width = walk.maxX - walk.minX;
    const depth = walk.maxZ - walk.minZ;
    const isAlongX = width > depth;
    const centreX = (walk.minX + walk.maxX) / 2;
    const centreZ = (walk.minZ + walk.maxZ) / 2;
    builder.box(
      "matte",
      boardwalkDark,
      [width - 0.1, deckHeight - 0.06, depth - 0.1],
      [centreX, (deckHeight - 0.06) / 2, centreZ],
    );
    if (builder.isFar) {
      builder.box(
        "matte",
        boardwalk,
        [width, 0.06, depth],
        [centreX, deckHeight - 0.03, centreZ],
      );
      return;
    }
    const length = isAlongX ? width : depth;
    const planks = Math.round(length / 0.26);
    for (let plank = 0; plank < planks; plank++) {
      const along = (isAlongX ? walk.minX : walk.minZ) + (plank + 0.5) * 0.26;
      const tint = shade(boardwalk, 0.92 + 0.1 * Math.sin(plank * 2.3 + index));
      builder.box(
        "matte",
        tint,
        isAlongX ? [0.23, 0.06, depth] : [width, 0.06, 0.23],
        isAlongX
          ? [along, deckHeight - 0.03, centreZ]
          : [centreX, deckHeight - 0.03, along],
      );
    }
  });
  /* Handrails along the outer edges. */
  const rails: readonly [number, number, number, number][] = [
    [-4.6, 3.9, -0.65, 3.9],
    [0.65, 3.9, 4.6, 3.9],
    [4.6, 3.9, 4.6, -4.4],
    [-4.6, 3.9, -4.6, -2.6],
    [-0.65, 3.9, -0.65, 7.0],
    [0.65, 3.9, 0.65, 7.0],
  ];
  rails.forEach(([fromX, fromZ, toX, toZ]) => {
    const length = Math.hypot(toX - fromX, toZ - fromZ);
    const posts = Math.max(1, Math.round(length / (builder.isFar ? 3 : 1.2)));
    for (let post = 0; post <= posts; post++) {
      const share = post / posts;
      builder.box(
        "matte",
        boardwalkDark,
        [0.09, 0.7, 0.09],
        [
          fromX + (toX - fromX) * share,
          deckHeight + 0.35,
          fromZ + (toZ - fromZ) * share,
        ],
      );
    }
    builder.bar(
      "matte",
      boardwalk,
      [fromX, deckHeight + 0.68, fromZ],
      [toX, deckHeight + 0.68, toZ],
      0.08,
      6,
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        snow,
        [
          Math.max(Math.abs(toX - fromX) + 0.06, 0.12),
          0.05,
          Math.max(Math.abs(toZ - fromZ) + 0.06, 0.12),
        ],
        [(fromX + toX) / 2, deckHeight + 0.73, (fromZ + toZ) / 2],
      );
    }
  });
};

const addLantern = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.box("matte", boardwalkDark, [0.12, 1.15, 0.12], [x, y + 0.58, z]);
  builder.box("glow", palette.warmLight, [0.17, 0.22, 0.17], [x, y + 1.28, z]);
  builder.box("metal", palette.black, [0.24, 0.04, 0.24], [x, y + 1.16, z]);
  builder.cylinder("metal", palette.black, {
    radius: 0.19,
    radiusEnd: 0.03,
    length: 0.14,
    at: [x, y + 1.46, z],
    segments: 4,
  });
  if (!builder.isFar) {
    [-1, 1].forEach((sideX) => {
      [-1, 1].forEach((sideZ) => {
        builder.box(
          "metal",
          palette.black,
          [0.025, 0.24, 0.025],
          [x + sideX * 0.095, y + 1.28, z + sideZ * 0.095],
        );
      });
    });
    builder.sphere("matte", snow, 0.13, [x, y + 1.52, z], [1.2, 0.35, 1.2], 8);
  }
};

const addPine = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  size: number,
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.14 * size,
    radiusEnd: 0.08 * size,
    length: 1.0 * size,
    at: [x, 0.5 * size, z],
    segments: 6,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (1.25 - share * 0.85) * size;
    const base = (0.55 + share * 2.1) * size;
    const height = (1.25 - share * 0.3) * size;
    builder.lathe(
      "matte",
      tier % 2 === 0 ? pine : shade(pine, 1.1),
      [
        [0, 0],
        [radius, 0.02],
        [0, height],
      ],
      [x, base, z],
      "y",
      11,
    );
    builder.lathe(
      "matte",
      snow,
      [
        [radius * 0.62, height * 0.42],
        [0, height + 0.04],
      ],
      [x, base + 0.02, z],
      "y",
      11,
    );
  }
};

const buildHut = (builder: AttractionBuilder) => {
  const { x, z } = hutAt;
  const halfWidth = hutWidth / 2;
  const halfDepth = hutDepth / 2;
  const courses = builder.isFar ? 1 : 7;
  const logRadius = 0.11;
  builder.box(
    "matte",
    basalt,
    [hutWidth + 0.3, 0.2, hutDepth + 0.3],
    [x, 0.1, z],
  );
  if (builder.isFar) {
    builder.box("matte", logTimber, [hutWidth, 1.5, hutDepth], [x, 0.95, z]);
  } else {
    builder.box(
      "matte",
      shade(logTimber, 0.7),
      [hutWidth - 0.16, 1.5, hutDepth - 0.16],
      [x, 0.95, z],
    );
    for (let course = 0; course < courses; course++) {
      const y = 0.31 + course * 0.205;
      const tint = shade(logTimber, 0.94 + 0.08 * Math.sin(course * 1.9));
      [-1, 1].forEach((side) => {
        const lift = side === 1 ? 0 : 0.1;
        builder.cylinder("matte", tint, {
          radius: logRadius,
          length: hutDepth + 0.3,
          at: [x + side * halfWidth, y + lift, z],
          axis: "z",
          segments: 6,
        });
        const isDoorCourse = side === 1 && course < 5;
        if (isDoorCourse) {
          [-1, 1].forEach((half) => {
            builder.cylinder("matte", tint, {
              radius: logRadius,
              length: halfWidth - 0.15,
              at: [x + half * (halfWidth / 2 + 0.22), y + 0.1, z + halfDepth],
              axis: "x",
              segments: 6,
            });
          });
        } else {
          builder.cylinder("matte", tint, {
            radius: logRadius,
            length: hutWidth + 0.3,
            at: [x, y + 0.1, z + side * halfDepth],
            axis: "x",
            segments: 6,
          });
        }
      });
    }
  }
  addDoor(builder, {
    at: [x, 0.2, z + halfDepth - 0.05],
    width: 0.55,
    height: 1.05,
    colour: hutDoor,
    frame: shade(logTimber, 0.75),
  });
  addWindow(builder, {
    at: [x - halfWidth - 0.08, 1.05, z],
    width: 0.5,
    height: 0.42,
    frame: palette.cream,
    turn: -Math.PI / 2,
    isLit: true,
  });
  addGableRoof(builder, {
    width: hutWidth + 0.2,
    depth: hutDepth,
    rise: 0.75,
    at: [x, 1.72, z],
    colour: palette.darkTimber,
    overhang: 0.3,
    thickness: 0.1,
  });
  addGableRoof(builder, {
    width: hutWidth + 0.24,
    depth: hutDepth,
    rise: 0.75,
    at: [x, 1.8, z],
    colour: snow,
    overhang: 0.26,
    thickness: 0.12,
  });
  builder.cylinder("metal", palette.black, {
    radius: 0.07,
    length: 0.9,
    at: [x + 0.6, 2.35, z - 0.25],
    segments: 8,
  });
  if (!builder.isFar) {
    builder.cylinder("metal", palette.black, {
      radius: 0.12,
      radiusEnd: 0.02,
      length: 0.1,
      at: [x + 0.6, 2.85, z - 0.25],
      segments: 8,
    });
    /* A towel rail and a bucket by the door. */
    builder.bar(
      "matte",
      boardwalk,
      [x - 0.95, deckHeight + 0.75, z + halfDepth + 0.25],
      [x - 0.45, deckHeight + 0.75, z + halfDepth + 0.25],
      0.05,
      6,
    );
    ["#c85a45", "#e8e0cc"].forEach((towel, index) => {
      builder.box(
        "matte",
        towel,
        [0.2, 0.42, 0.03],
        [x - 0.85 + index * 0.28, deckHeight + 0.55, z + halfDepth + 0.26],
      );
    });
    builder.cylinder("matte", boardwalk, {
      radius: 0.16,
      radiusEnd: 0.19,
      length: 0.3,
      at: [x + 0.62, deckHeight + 0.15, z + halfDepth + 0.3],
      segments: 12,
    });
    builder.torus(
      "metal",
      palette.darkSteel,
      0.185,
      0.015,
      [x + 0.62, deckHeight + 0.22, z + halfDepth + 0.3],
      "y",
      12,
    );
    /* Icicles along the front eaves. */
    for (let icicle = 0; icicle < 9; icicle++) {
      builder.cylinder("glass", "#d7ecf6", {
        radius: 0.035,
        radiusEnd: 0.002,
        length: 0.14 + 0.08 * Math.abs(Math.sin(icicle * 2.1)),
        at: [
          x - halfWidth + icicle * (hutWidth / 8),
          1.58,
          z + halfDepth + 0.34,
        ],
        axis: "y",
        segments: 5,
      });
    }
  }
};

const buildSnowfield = (builder: AttractionBuilder) => {
  const drifts: readonly [number, number, number, number][] = [
    [-6.2, -3.4, 1.1, 0.35],
    [-5.4, 1.8, 0.9, 0.28],
    [5.9, 1.1, 1.0, 0.3],
    [6.0, -4.3, 0.9, 0.32],
    [-2.6, 5.6, 1.1, 0.25],
    [2.9, 5.9, 1.0, 0.27],
    [1.9, -3.9, 0.7, 0.26],
  ];
  drifts.forEach(([x, z, size, height], index) => {
    addMound(
      builder,
      index % 2 === 0 ? snow : snowShadow,
      [x, 0, z],
      size,
      height,
    );
  });
  const boulders: readonly [number, number, number][] = [
    [-5.0, -1.0, 0.55],
    [2.2, -5.4, 0.6],
    [-0.1, -5.7, 0.7],
    [5.6, 5.4, 0.5],
    [-5.3, 5.7, 0.5],
    [-2.9, -0.9, 0.38],
  ];
  boulders.forEach(([x, z, size], index) => {
    addRock(
      builder,
      basalt,
      [x, size * 0.4, z],
      [size * 1.2, size * 0.8, size],
      index * 5.3,
    );
    builder.sphere(
      "matte",
      snow,
      size * 0.9,
      [x, size * 0.98, z],
      [1.1, 0.3, 0.95],
      10,
    );
  });
};

const buildHotSprings = (builder: AttractionBuilder) => {
  pools.forEach((pool, index) => {
    buildPool(builder, pool, index);
  });
  buildSpill(builder, pools[0], pools[1]);
  buildSpill(builder, pools[1], pools[2]);
  buildBoardwalk(builder);
  lanterns.forEach((at) => {
    addLantern(builder, at);
  });
  pines.forEach(([x, z, size]) => {
    addPine(builder, x, z, size);
  });
  buildHut(builder);
  buildSnowfield(builder);
  addSignBoard(builder, [-2.1, 0, 6.6], signBlue);
};

const findDeck: Deck = ({ x, z }) =>
  walks.some(
    (walk) =>
      x >= walk.minX && x <= walk.maxX && z >= walk.minZ && z <= walk.maxZ,
  )
    ? { height: deckHeight, kind: "bridge" }
    : undefined;

/* A soak in the middle pool, from the boardwalk and back. */
const soakPool = pools[1];
const soakStart = { x: 4.0, z: -1.1 };
const soakFinish = { x: 4.0, z: 0.9 };
const soakSeat = { x: soakPool.x + 0.3, z: soakPool.z };

const soakRide = (progress: number): LocalSpot => {
  const sitting = soakPool.level - 0.42;
  const facingPool = -Math.PI / 2;
  if (progress < 0.15) {
    const share = progress / 0.15;
    const hop = Math.sin(share * Math.PI) * 0.35;
    return {
      x: soakStart.x + (soakSeat.x - soakStart.x) * share,
      y: deckHeight + (sitting - deckHeight) * share + hop,
      z: soakStart.z + (soakSeat.z - soakStart.z) * share,
      heading: facingPool,
    };
  }
  if (progress < 0.82) {
    const share = (progress - 0.15) / 0.67;
    return {
      x: soakSeat.x,
      y: sitting + 0.03 * Math.sin(share * Math.PI * 6),
      z: soakSeat.z,
      heading: facingPool + Math.PI + 0.4 * Math.sin(share * Math.PI * 2),
    };
  }
  const share = (progress - 0.82) / 0.18;
  const hop = Math.sin(share * Math.PI) * 0.35;
  return {
    x: soakSeat.x + (soakFinish.x - soakSeat.x) * share,
    y: sitting + (deckHeight - sitting) * share + hop,
    z: soakSeat.z + (soakFinish.z - soakSeat.z) * share,
    heading: Math.PI / 2 - share * Math.PI * 0.5,
  };
};

const steam: SmokeSource[] = pools.map((pool) => ({
  at: [pool.x, pool.level + 0.15, pool.z],
  colour: "#f4f7fa",
  puffs: 7,
  size: 0.55,
  rise: 3.2,
  spread: 1.1,
}));

const poolBlockers: LocalBlocker[] = pools.map((pool, index) => ({
  x: pool.x,
  z: pool.z,
  radius: Math.max(pool.radiusX, pool.radiusZ) + (index === 0 ? 0.55 : 0.2),
}));

export const hotSpringsModel: AttractionModel = {
  kind: "hot-springs",
  name: "Hot Springs",
  fact: "Deep under a volcano the rocks are hot. Rainwater soaks down, is heated by the hot rock and bubbles back up as a hot spring: that heat from the Earth is called geothermal energy. The steam is warm water evaporating into the cold air, then condensing into tiny droplets you can see.",
  curriculumLink:
    "Geography, Key Stage 2: physical geography, volcanoes. Science, Year 4: states of matter, evaporation and condensation.",
  footprint: 8.4,
  setting: "inland",
  padColour: snow,
  signSpot: { x: -2.1, z: 7.5 },
  build: buildHotSprings,
  smoke: [
    ...steam,
    {
      at: [hutAt.x + 0.6, 3.0, hutAt.z - 0.25],
      colour: "#d9dde2",
      puffs: 5,
      size: 0.22,
      rise: 2.2,
      spread: 0.5,
    },
  ],
  blockers: [
    ...poolBlockers,
    { x: -0.2, z: -2.2, radius: 0.9 },
    { x: hutAt.x, z: hutAt.z - 0.1, radius: 1.25 },
    ...pines.map(([x, z, size]) => ({ x, z, radius: 0.55 * size })),
    { x: -2.1, z: 6.6, radius: 0.45 },
  ],
  decks: [findDeck],
  rides: [
    {
      id: "soak",
      name: "the hot spring",
      start: soakStart,
      reach: 0.55,
      seconds: 10,
      finish: soakFinish,
      follow: soakRide,
    },
  ],
};
