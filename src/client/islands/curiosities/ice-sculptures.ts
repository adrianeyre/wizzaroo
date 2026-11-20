import {
  CatmullRomCurve3,
  ConeGeometry,
  ExtrudeGeometry,
  OctahedronGeometry,
  Shape,
  TubeGeometry,
  Vector3,
} from "three";
import {
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowWhite = "#fbfdff";
const snowShadow = "#d5e1ea";
const ice = "#d6f0fb";
const iceDeep = "#a6d6ee";
const sparkle = "#f2fbff";
const lanternGlow = "#ffd890";
const ropeRed = "#c8342c";
const signColour = "#2f6f9a";

const plinthHeight = 0.8;
const plinthSize = 0.95;

interface Pedestal {
  name: "swan" | "star" | "bear" | "castle";
  x: number;
  z: number;
}

/* Four plinths in an arc, the carvings all facing the visitors (+z) */
const arrangement: readonly (readonly [Pedestal["name"], number])[] = [
  ["swan", -60],
  ["star", -20],
  ["bear", 20],
  ["castle", 60],
];
const pedestals: readonly Pedestal[] = arrangement.map(([name, degrees]) => {
  const angle = (degrees * Math.PI) / 180;
  return { name, x: 2.65 * Math.sin(angle), z: 0.45 - 2.65 * Math.cos(angle) };
});

const lanterns: readonly { x: number; z: number }[] = [
  { x: -1.95, z: -1.95 },
  { x: 1.95, z: -1.95 },
  { x: -1.15, z: 2.75 },
  { x: 1.15, z: 2.75 },
];
const floor = { minX: -1.7, maxX: 1.7, minZ: -1.1, maxZ: 1.9 };
const signAt: Triple = [2.0, 0, 3.75];

/* ------------------------------------------------------------------ */
/* Plinths, lanterns and floor                                         */
/* ------------------------------------------------------------------ */

const buildPlinth = (builder: AttractionBuilder, { x, z }: Pedestal) => {
  builder.box(
    "matte",
    snowWhite,
    [plinthSize, plinthHeight, plinthSize],
    [x, plinthHeight / 2, z],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    snowShadow,
    [plinthSize + 0.14, 0.12, plinthSize + 0.14],
    [x, 0.06, z],
  );
  builder.box(
    "matte",
    snowShadow,
    [plinthSize + 0.1, 0.08, plinthSize + 0.1],
    [x, plinthHeight - 0.02, z],
  );
  /* A little brass name plate on the front */
  builder.box(
    "metal",
    palette.brass,
    [0.42, 0.12, 0.02],
    [x, plinthHeight * 0.55, z + plinthSize / 2 + 0.01],
  );
  builder.box(
    "paint",
    palette.darkTimber,
    [0.32, 0.03, 0.01],
    [x, plinthHeight * 0.55, z + plinthSize / 2 + 0.025],
  );
};

const buildLantern = (
  builder: AttractionBuilder,
  { x, z }: { x: number; z: number },
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 1.6,
    at: [x, 0.8, z],
    segments: 8,
  });
  builder.box("glow", lanternGlow, [0.18, 0.24, 0.18], [x, 1.78, z]);
  if (builder.isFar) {
    return;
  }
  builder.box("metal", palette.black, [0.24, 0.03, 0.24], [x, 1.65, z]);
  builder.add(
    "metal",
    palette.black,
    new ConeGeometry(0.18, 0.16, 4).rotateY(Math.PI / 4),
    { at: [x, 1.98, z] },
  );
  builder.torus("metal", palette.black, 0.04, 0.01, [x, 2.09, z], "z", 10);
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "metal",
        palette.black,
        [0.02, 0.26, 0.02],
        [x + sideX * 0.09, 1.78, z + sideZ * 0.09],
      );
    });
  });
  builder.sphere("matte", snowWhite, 0.14, [x, 2.0, z], [1.1, 0.35, 1.1], 8);
};

const buildFloor = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = floor;
  builder.box(
    "glass",
    "#cfe8f4",
    [maxX - minX, 0.04, maxZ - minZ],
    [(minX + maxX) / 2, 0.02, (minZ + maxZ) / 2],
  );
  if (builder.isFar) {
    return;
  }
  /* A rim of packed snow round the ice floor, and scratches from skates */
  builder.box(
    "matte",
    snowShadow,
    [maxX - minX + 0.2, 0.06, 0.12],
    [(minX + maxX) / 2, 0.03, maxZ + 0.04],
  );
  [
    [-0.6, 0.2, 0.4],
    [0.5, 0.9, -0.3],
    [0.2, -0.4, 1.1],
  ].forEach(([x, z, turn]) => {
    builder.box(
      "matte",
      "#e9f6fc",
      [0.8, 0.003, 0.015],
      [x, 0.042, z],
      [0, turn, 0],
    );
  });
  /* Rope barriers on little posts in front of each plinth */
  pedestals.forEach(({ x, z }) => {
    const toCentre = Math.atan2(-x, 0.45 - z);
    const front = {
      x: x + Math.sin(toCentre) * 0.85,
      z: z + Math.cos(toCentre) * 0.85,
    };
    const across = {
      x: Math.cos(toCentre) * 0.45,
      z: -Math.sin(toCentre) * 0.45,
    };
    [-1, 1].forEach((side) => {
      const post: Triple = [
        front.x + across.x * side,
        0,
        front.z + across.z * side,
      ];
      builder.cylinder("metal", palette.brass, {
        radius: 0.025,
        length: 0.55,
        at: [post[0], 0.275, post[2]],
        segments: 8,
      });
      builder.sphere(
        "metal",
        palette.brass,
        0.04,
        [post[0], 0.57, post[2]],
        [1, 1, 1],
        8,
      );
    });
    builder.bar(
      "matte",
      ropeRed,
      [front.x - across.x, 0.5, front.z - across.z],
      [front.x, 0.42, front.z],
      0.03,
      5,
    );
    builder.bar(
      "matte",
      ropeRed,
      [front.x, 0.42, front.z],
      [front.x + across.x, 0.5, front.z + across.z],
      0.03,
      5,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The carvings                                                        */
/* ------------------------------------------------------------------ */

const swanAt = (): Triple => {
  const { x, z } = pedestals[0];
  return [x, plinthHeight, z];
};

/** A swan side on to the visitors, wings raised, neck in an S. */
const buildSwan = (builder: AttractionBuilder) => {
  const [x, y, z] = swanAt();
  builder.sphere(
    "glass",
    ice,
    0.3,
    [x, y + 0.28, z],
    [1.45, 0.8, 0.85],
    builder.isFar ? 8 : 18,
  );
  if (builder.isFar) {
    builder.bar(
      "glass",
      ice,
      [x + 0.3, y + 0.35, z],
      [x + 0.3, y + 0.95, z],
      0.12,
      4,
    );
    return;
  }
  /* A swirl of ice waves under her */
  builder.cylinder("glass", iceDeep, {
    radius: 0.42,
    radiusEnd: 0.36,
    length: 0.1,
    at: [x, y + 0.05, z],
    segments: 18,
  });
  const neck = new CatmullRomCurve3([
    new Vector3(0.28, 0.32, 0),
    new Vector3(0.44, 0.5, 0),
    new Vector3(0.38, 0.72, 0),
    new Vector3(0.3, 0.9, 0),
    new Vector3(0.38, 1.02, 0),
  ]);
  builder.add("glass", ice, new TubeGeometry(neck, 16, 0.06, 8, false), {
    at: [x, y, z],
  });
  builder.sphere(
    "glass",
    ice,
    0.09,
    [x + 0.42, y + 1.03, z],
    [1.3, 0.9, 0.85],
    12,
  );
  builder.add(
    "glass",
    iceDeep,
    new ConeGeometry(0.04, 0.16, 8).rotateZ(-Math.PI / 2),
    {
      at: [x + 0.56, y + 1.0, z],
    },
  );
  /* Wings raised in a curve, each in three layers of feathers */
  [-1, 1].forEach((side) => {
    for (let layer = 0; layer < 3; layer++) {
      builder.sphere(
        "glass",
        layer === 1 ? iceDeep : ice,
        0.24 - layer * 0.04,
        [x - 0.06 - layer * 0.08, y + 0.5 + layer * 0.08, z + side * 0.18],
        [1.5, 0.55, 0.18],
        12,
      );
    }
  });
  /* The tail, a little upturned point */
  builder.add(
    "glass",
    ice,
    new ConeGeometry(0.1, 0.25, 8).rotateZ(Math.PI / 2 + 0.5),
    {
      at: [x - 0.48, y + 0.38, z],
    },
  );
};

/** A five-pointed star standing on a short stem. */
const buildStar = (builder: AttractionBuilder) => {
  const { x, z } = pedestals[1];
  const y = plinthHeight;
  const star = new Shape();
  for (let point = 0; point < 10; point++) {
    const radius = point % 2 === 0 ? 0.48 : 0.2;
    const angle = (point / 10) * Math.PI * 2;
    const px = Math.sin(angle) * radius;
    const py = Math.cos(angle) * radius;
    if (point === 0) {
      star.moveTo(px, py);
    } else {
      star.lineTo(px, py);
    }
  }
  star.closePath();
  builder.add(
    "glass",
    ice,
    new ExtrudeGeometry(star, {
      depth: 0.12,
      bevelEnabled: !builder.isFar,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 2,
    }).translate(0, 0, -0.06),
    { at: [x, y + 0.75, z] },
  );
  builder.cylinder("glass", iceDeep, {
    radius: 0.07,
    radiusEnd: 0.12,
    length: 0.32,
    at: [x, y + 0.16, z],
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("glass", ice, {
    radius: 0.26,
    length: 0.06,
    at: [x, y + 0.03, z],
    segments: 6,
  });
};

/** A bear sitting up, its paws on its tummy. */
const buildBear = (builder: AttractionBuilder) => {
  const { x, z } = pedestals[2];
  const y = plinthHeight;
  builder.sphere(
    "glass",
    ice,
    0.3,
    [x, y + 0.32, z],
    [1, 1.1, 0.9],
    builder.isFar ? 8 : 18,
  );
  builder.sphere(
    "glass",
    ice,
    0.18,
    [x, y + 0.78, z + 0.03],
    [1, 0.95, 1],
    builder.isFar ? 6 : 16,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "glass",
    iceDeep,
    0.08,
    [x, y + 0.74, z + 0.19],
    [1, 0.8, 1.1],
    10,
  );
  builder.sphere(
    "glass",
    shade(iceDeep, 0.8),
    0.03,
    [x, y + 0.76, z + 0.27],
    [1.2, 0.8, 1],
    6,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glass",
      ice,
      0.06,
      [x + side * 0.13, y + 0.93, z],
      [1, 1, 0.6],
      8,
    );
    builder.sphere(
      "glass",
      iceDeep,
      0.022,
      [side * 0.06 + x, y + 0.83, z + 0.16],
      [1, 1, 0.7],
      6,
    );
    /* Arms folded in front, and big feet stuck out */
    builder.sphere(
      "glass",
      ice,
      0.09,
      [x + side * 0.16, y + 0.42, z + 0.2],
      [0.9, 1.6, 0.9],
      10,
    );
    builder.sphere(
      "glass",
      ice,
      0.1,
      [x + side * 0.16, y + 0.08, z + 0.24],
      [0.9, 0.6, 1.4],
      10,
    );
  });
};

/** A castle with four turrets, a keep and a gateway. */
const buildCastle = (builder: AttractionBuilder) => {
  const { x, z } = pedestals[3];
  const y = plinthHeight;
  builder.box("glass", ice, [0.6, 0.32, 0.5], [x, y + 0.16, z]);
  builder.cylinder("glass", ice, {
    radius: 0.14,
    length: 0.7,
    at: [x, y + 0.35, z - 0.05],
    segments: builder.isFar ? 6 : 14,
  });
  builder.add(
    "glass",
    iceDeep,
    new ConeGeometry(0.18, 0.3, builder.segments(14)),
    { at: [x, y + 0.85, z - 0.05] },
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      const tower: Triple = [x + sideX * 0.3, y, z + sideZ * 0.25];
      builder.cylinder("glass", ice, {
        radius: 0.08,
        length: 0.46,
        at: [tower[0], y + 0.23, tower[2]],
        segments: 10,
      });
      builder.add("glass", iceDeep, new ConeGeometry(0.1, 0.2, 10), {
        at: [tower[0], y + 0.56, tower[2]],
      });
    });
  });
  /* Battlements along the front wall, and the gateway */
  for (let merlon = 0; merlon < 5; merlon++) {
    builder.box(
      "glass",
      ice,
      [0.07, 0.07, 0.07],
      [x - 0.2 + merlon * 0.1, y + 0.355, z + 0.22],
    );
  }
  builder.box("glass", iceDeep, [0.14, 0.18, 0.02], [x, y + 0.09, z + 0.255]);
  builder.cylinder("glass", iceDeep, {
    radius: 0.07,
    length: 0.02,
    at: [x, y + 0.18, z + 0.255],
    axis: "z",
    segments: 10,
  });
  builder.box("glass", ice, [0.02, 0.12, 0.08], [x, y + 1.06, z - 0.01]);
  builder.box(
    "glass",
    iceDeep,
    [0.12, 0.07, 0.01],
    [x + 0.06, y + 1.08, z - 0.01],
  );
};

/** Glints of light round a carving, appearing as you come near. */
const buildSparkles = (seed: number) => (builder: AttractionBuilder) => {
  for (let glint = 0; glint < 7; glint++) {
    const angle = (glint / 7) * Math.PI * 2 + seed;
    const radius = 0.45 + (glint % 3) * 0.08;
    builder.add(
      "glow",
      sparkle,
      new OctahedronGeometry(0.045 + (glint % 2) * 0.02, 0),
      {
        at: [
          Math.sin(angle) * radius,
          0.25 + ((glint * 0.37 + seed) % 0.8),
          Math.cos(angle) * radius,
        ],
        scale: [0.6, 1.6, 0.6],
      },
    );
  }
};

/* ------------------------------------------------------------------ */
/* The carver's corner                                                 */
/* ------------------------------------------------------------------ */

const buildWorkshop = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* A fresh block of ice waiting to be carved, with tools beside it */
  const block: Triple = [-2.9, 0, 1.6];
  builder.box(
    "glass",
    ice,
    [0.6, 0.6, 0.6],
    [block[0], 0.3, block[2]],
    [0, 0.3, 0],
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [0.8, 0.08, 0.8],
    [block[0], 0.04, block[2]],
    [0, 0.3, 0],
  );
  builder.box(
    "metal",
    palette.steel,
    [0.45, 0.12, 0.01],
    [block[0] + 0.55, 0.3, block[2] + 0.2],
    [0, 0.4, 1.2],
  );
  builder.box(
    "paint",
    ropeRed,
    [0.08, 0.12, 0.04],
    [block[0] + 0.48, 0.52, block[2] + 0.17],
    [0, 0.4, 1.2],
  );
  [0, 1].forEach((tool) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      [block[0] - 0.2 + tool * 0.12, 0.62, block[2] + 0.1],
      [block[0] - 0.05 + tool * 0.12, 0.64, block[2] + 0.45],
      0.035,
      5,
    );
    builder.box(
      "metal",
      palette.steel,
      [0.04, 0.012, 0.12],
      [block[0] - 0.24 + tool * 0.12, 0.615, block[2] - 0.0],
    );
  });
  /* Chips of ice on the snow */
  for (let chip = 0; chip < 6; chip++) {
    builder.add("glass", ice, new OctahedronGeometry(0.05, 0), {
      at: [
        block[0] + 0.35 - chip * 0.12,
        0.03,
        block[2] + 0.45 + (chip % 2) * 0.1,
      ],
      scale: [1.4, 0.6, 1],
    });
  }
  /* Snow drifts round the gallery */
  [
    [-3.5, -1.4, 0.6],
    [3.4, 1.4, 0.55],
    [0.3, -3.9, 0.7],
    [-3.0, 3.0, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowWhite, size, [x, 0, z], [1.5, 0.45, 1], 10);
  });
};

export const iceSculpturesModel: CuriosityModel = {
  kind: "ice-sculptures",
  islandId: "frost-isle",
  name: "Ice Sculptures",
  fact: "Ice sculptors carve big blocks of clear ice into swans, stars, animals and even castles. They plan a shape, then cut it out with saws and chisels and polish it until it sparkles. Ice is a hard material that can be carved, but it melts when it gets warm, so ice sculptures are made in the coldest part of winter.",
  curriculumLink:
    "Art and design, Key Stage 1: use a range of materials creatively to design and make products, and develop techniques using shape, form and texture.",
  footprint: 4.5,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    pedestals.forEach((pedestal) => {
      buildPlinth(builder, pedestal);
    });
    buildSwan(builder);
    buildStar(builder);
    buildBear(builder);
    buildCastle(builder);
    lanterns.forEach((lantern) => {
      buildLantern(builder, lantern);
    });
    buildFloor(builder);
    buildWorkshop(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: pedestals.map(({ name, x, z }, index): MovingPart => ({
    name: `${name} sparkles`,
    pivot: [x, plinthHeight, z],
    build: buildSparkles(index * 1.3),
    motion: { kind: "wake", reach: 4 },
  })),
  decks: [buildFlatDeck(floor, 0.04, "ice")],
  blockers: [
    ...pedestals.map(({ x, z }) => ({ x, z, radius: 0.62 })),
    ...lanterns.map(({ x, z }) => ({ x, z, radius: 0.15 })),
    { x: -2.9, z: 1.6, radius: 0.5 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Polish the swan",
    news: "Squeak, squeak! You polished the ice swan until it shone, and the light made it sparkle like diamonds.",
    tune: [79, 84, 88, 91, 96],
  },
};
