import { TorusGeometry } from "three";
import {
  addBush,
  addGableRoof,
  addSignBoard,
  addTree,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const bamboo = "#b9b04c";
const bambooDark = "#8f8a36";
const thatch = "#c8a25a";
const tigerOrange = "#e8822a";
const tigerWhite = "#f3eee2";
const stripe = "#1f1a16";
const streamBlue = "#3f8fb4";
const bankStone = "#8a857a";
const earth = "#7a5f42";
const grassTall = "#8aa83a";
const leafMid = "#2f8a35";
const leafDeep = "#22662c";
const signColour = "#a0522d";

/* The hide: a low bamboo platform with a thatched roof */
const hide = { x: -2.3, z: 1.4, halfWidth: 0.95, halfDepth: 0.8 };
const floorHeight = 0.6;
const stepHeight = 0.3;
const binocularsAt: Triple = [
  hide.x + 0.35,
  floorHeight + 0.95,
  hide.z - hide.halfDepth + 0.12,
];

/* The tiger, resting on the bank with its head towards +x */
const tiger = { x: 0.7, z: -1.0 };
const headPivot: Triple = [tiger.x + 0.62, 0.32, tiger.z + 0.05];
const tailPivot: Triple = [tiger.x - 0.6, 0.3, tiger.z];

const streamZ = -2.55;

const buildStream = (builder: AttractionBuilder) => {
  const bends: [number, number][] = [
    [-4.6, -1.7],
    [-1.6, -2.6],
    [1.6, -2.4],
    [4.5, -1.7],
  ];
  bends.slice(1).forEach(([x, z], index) => {
    const [fromX, fromZ] = bends[index];
    const length = Math.hypot(x - fromX, z - fromZ);
    const turn = Math.atan2(x - fromX, z - fromZ);
    builder.box(
      "matte",
      earth,
      [1.5, 0.03, length + 0.4],
      [(x + fromX) / 2, 0.015, (z + fromZ) / 2],
      [0, turn, 0],
    );
    builder.box(
      "water",
      streamBlue,
      [0.95, 0.04, length + 0.5],
      [(x + fromX) / 2, 0.05, (z + fromZ) / 2],
      [0, turn, 0],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Stones along the banks, and tall grass where tigers hide */
  for (let stone = 0; stone < 12; stone++) {
    const along = -4.2 + stone * 0.75;
    const side = stone % 2 === 0 ? 1 : -1;
    builder.sphere(
      "matte",
      shade(bankStone, stone % 3 === 0 ? 0.85 : 1.1),
      0.14 + (stone % 3) * 0.04,
      [along, 0.06, streamZ + 0.3 + side * 0.6 + Math.abs(along) * 0.1],
      [1.3, 0.6, 1],
      6,
    );
  }
  [
    [-3.8, -0.6],
    [3.2, -0.3],
    [-0.9, -0.2],
    [2.2, 1.2],
  ].forEach(([x, z]) => {
    for (let blade = 0; blade < 7; blade++) {
      const turn = blade * 0.9;
      builder.bar(
        "matte",
        blade % 2 === 0 ? grassTall : shade(grassTall, 0.85),
        [x + Math.sin(turn) * 0.1, 0, z + Math.cos(turn) * 0.1],
        [
          x + Math.sin(turn) * 0.35,
          0.9 + (blade % 3) * 0.15,
          z + Math.cos(turn) * 0.35,
        ],
        0.03,
        3,
      );
    }
  });
};

/** A stripe wrapped over the tiger's back, a part-ring round the body. */
const addStripe = (
  builder: AttractionBuilder,
  at: Triple,
  across: number,
  up: number,
) => {
  builder.add(
    "matte",
    stripe,
    new TorusGeometry(1, 0.06, 4, builder.segments(10, 4), 2.4)
      .rotateZ(Math.PI / 2 - 1.2)
      .rotateY(Math.PI / 2)
      .scale(1, up, across),
    { at },
  );
};

const buildTigerBody = (builder: AttractionBuilder) => {
  const { x, z } = tiger;
  const body: Triple = [x, 0.3, z];
  builder.sphere(
    "matte",
    tigerOrange,
    0.36,
    body,
    [1.65, 0.85, 0.9],
    builder.isFar ? 8 : 16,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    tigerWhite,
    0.26,
    [x + 0.1, 0.18, z + 0.08],
    [1.8, 0.5, 0.85],
    10,
  );
  /* Haunches, and big front paws stretched out */
  builder.sphere(
    "matte",
    tigerOrange,
    0.24,
    [x - 0.38, 0.26, z + 0.12],
    [1.2, 0.95, 0.9],
    10,
  );
  [-0.13, 0.13].forEach((side) => {
    builder.bar(
      "matte",
      tigerOrange,
      [x + 0.35, 0.14, z + side],
      [x + 0.95, 0.07, z + side + 0.03],
      0.13,
      7,
    );
    builder.sphere(
      "matte",
      tigerWhite,
      0.08,
      [x + 0.98, 0.06, z + side + 0.03],
      [1.3, 0.6, 1],
      7,
    );
  });
  /* Stripes, thinner towards the tail */
  [-0.42, -0.25, -0.08, 0.1, 0.27, 0.42].forEach((along) => {
    const share = Math.sqrt(Math.max(0.05, 1 - (along / 0.6) ** 2));
    addStripe(builder, [x + along, 0.3, z], 0.33 * share, 0.31 * share);
  });
};

const buildTigerHead = (builder: AttractionBuilder) => {
  const head: Triple = [0.16, 0.08, 0.04];
  builder.sphere("matte", tigerOrange, 0.21, head, [1, 0.92, 1.0], 14);
  builder.sphere(
    "matte",
    tigerWhite,
    0.11,
    [head[0] + 0.15, head[1] - 0.06, head[2]],
    [0.9, 0.75, 1.3],
    10,
  );
  builder.sphere(
    "paint",
    "#d77a7a",
    0.03,
    [head[0] + 0.25, head[1] - 0.01, head[2]],
    [0.8, 0.7, 1.2],
    6,
  );
  [-1, 1].forEach((side) => {
    /* Ears with white spots on the back, and a white ruff */
    builder.sphere(
      "matte",
      tigerOrange,
      0.065,
      [head[0] - 0.04, head[1] + 0.18, head[2] + side * 0.13],
      [0.5, 1, 1],
      7,
    );
    builder.sphere(
      "matte",
      tigerWhite,
      0.03,
      [head[0] - 0.07, head[1] + 0.18, head[2] + side * 0.13],
      [0.4, 1, 1],
      5,
    );
    builder.sphere(
      "matte",
      tigerWhite,
      0.09,
      [head[0] + 0.02, head[1] - 0.08, head[2] + side * 0.15],
      [0.9, 0.8, 0.6],
      7,
    );
    builder.sphere(
      "paint",
      "#d8c23a",
      0.03,
      [head[0] + 0.15, head[1] + 0.06, head[2] + side * 0.08],
      [0.6, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.014,
      [head[0] + 0.175, head[1] + 0.06, head[2] + side * 0.08],
      [0.6, 1.3, 0.8],
      5,
    );
    builder.box(
      "matte",
      stripe,
      [0.02, 0.03, 0.09],
      [head[0] + 0.03, head[1] + 0.03, head[2] + side * 0.19],
      [side * 0.4, 0, 0],
    );
  });
  [-0.04, 0.04].forEach((side) => {
    builder.box(
      "matte",
      stripe,
      [0.1, 0.012, 0.018],
      [head[0] + 0.05, head[1] + 0.19, head[2] + side],
      [0, side * 4, 0],
    );
  });
};

const buildTail = (builder: AttractionBuilder) => {
  builder.bar("matte", tigerOrange, [0, 0, 0], [-0.4, -0.22, 0.25], 0.08, 6);
  builder.bar(
    "matte",
    tigerOrange,
    [-0.4, -0.22, 0.25],
    [-0.65, -0.24, 0.5],
    0.07,
    6,
  );
  builder.sphere("matte", stripe, 0.05, [-0.66, -0.24, 0.51], [1, 1, 1], 6);
  [0.3, 0.6].forEach((share) => {
    builder.sphere(
      "matte",
      stripe,
      0.045,
      [-0.4 * share * 1.6, -0.22 * share * 1.6, 0.25 * share * 1.6],
      [0.6, 1, 1],
      5,
    );
  });
};

/** Pug marks: a tiger's paw prints, one big pad and four toes. */
const buildPugMarks = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [
    [-0.6, -2.0, 0.6],
    [-0.15, -1.85, 0.8],
    [0.1, -1.55, 0.7],
    [-1.2, -1.7, 0.7],
    [-1.6, -1.45, 0.6],
  ].forEach(([x, z, turn]) => {
    builder.cylinder("matte", "#4e3a28", {
      radius: 0.07,
      length: 0.012,
      at: [x, 0.035, z],
      segments: 8,
    });
    [-1.5, -0.5, 0.5, 1.5].forEach((toe) => {
      const angle = turn + toe * 0.38;
      builder.cylinder("matte", "#4e3a28", {
        radius: 0.028,
        length: 0.012,
        at: [x + Math.sin(angle) * 0.11, 0.035, z + Math.cos(angle) * 0.11],
        segments: 6,
      });
    });
  });
};

const addBambooPole = (
  builder: AttractionBuilder,
  from: Triple,
  to: Triple,
  thickness = 0.08,
) => {
  builder.bar("matte", bamboo, from, to, thickness, builder.isFar ? 4 : 8);
  if (builder.isFar) {
    return;
  }
  /* The joints (nodes) that make bamboo look like bamboo */
  [0.33, 0.66].forEach((share) => {
    builder.cylinder("matte", bambooDark, {
      radius: thickness * 0.6,
      length: 0.03,
      at: [
        from[0] + (to[0] - from[0]) * share,
        from[1] + (to[1] - from[1]) * share,
        from[2] + (to[2] - from[2]) * share,
      ],
      axis:
        Math.abs(to[1] - from[1]) > 0.5
          ? "y"
          : Math.abs(to[0] - from[0]) > 0.5
            ? "x"
            : "z",
      segments: 8,
    });
  });
};

const buildHide = (builder: AttractionBuilder) => {
  const { x, z, halfWidth, halfDepth } = hide;
  builder.box(
    "matte",
    bambooDark,
    [halfWidth * 2, 0.08, halfDepth * 2],
    [x, floorHeight - 0.04, z],
  );
  /* Corner poles up to the roof */
  const roofBase = floorHeight + 1.55;
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      addBambooPole(
        builder,
        [x + sideX * (halfWidth - 0.05), 0, z + sideZ * (halfDepth - 0.05)],
        [
          x + sideX * (halfWidth - 0.05),
          roofBase,
          z + sideZ * (halfDepth - 0.05),
        ],
        0.1,
      );
    });
  });
  addGableRoof(builder, {
    width: halfWidth * 2,
    depth: halfDepth * 2,
    rise: 0.6,
    at: [x, roofBase, z],
    colour: thatch,
    overhang: 0.25,
    thickness: 0.12,
  });
  /* A step up to the floor */
  builder.box(
    "matte",
    bamboo,
    [0.8, stepHeight, 0.4],
    [x, stepHeight / 2, z + halfDepth + 0.2],
  );
  if (builder.isFar) {
    return;
  }
  /* Slatted floor, and low walls of bamboo on the three sides */
  for (let slat = 0; slat < 9; slat++) {
    builder.cylinder("matte", shade(bamboo, slat % 2 === 0 ? 1 : 0.92), {
      radius: 0.045,
      length: halfWidth * 2,
      at: [x, floorHeight + 0.02, z - halfDepth + 0.09 + slat * 0.18],
      axis: "x",
      segments: 6,
    });
  }
  [0.85, 0.62, 0.4, 0.18].forEach((up, index) => {
    /* The back wall has a gap at eye height for watching */
    if (index !== 0) {
      addBambooPole(
        builder,
        [x - halfWidth, floorHeight + up, z - halfDepth],
        [x + halfWidth, floorHeight + up, z - halfDepth],
        0.07,
      );
    }
    [-1, 1].forEach((side) => {
      addBambooPole(
        builder,
        [x + side * halfWidth, floorHeight + up, z - halfDepth],
        [x + side * halfWidth, floorHeight + up, z + halfDepth - 0.2],
        0.07,
      );
    });
  });
  addBambooPole(
    builder,
    [x - halfWidth, floorHeight + 1.15, z - halfDepth],
    [x + halfWidth, floorHeight + 1.15, z - halfDepth],
    0.07,
  );
  /* Thatch fringe along the eaves */
  for (let tuft = 0; tuft < 8; tuft++) {
    builder.box(
      "matte",
      shade(thatch, tuft % 2 === 0 ? 0.9 : 1.05),
      [0.28, 0.16, 0.05],
      [
        x - halfWidth + 0.1 + tuft * 0.25,
        roofBase - 0.03,
        z + halfDepth + 0.27,
      ],
      [0.2, 0, 0],
    );
  }
};

const buildBinoculars = (builder: AttractionBuilder) => {
  const [x, y, z] = binocularsAt;
  builder.box("matte", bambooDark, [0.06, 0.4, 0.06], [x, y - 0.25, z + 0.05]);
  if (builder.isFar) {
    return;
  }
  [-0.06, 0.06].forEach((side) => {
    builder.cylinder("paint", "#26313a", {
      radius: 0.045,
      radiusEnd: 0.035,
      length: 0.22,
      at: [x + side, y, z],
      axis: "z",
      segments: 10,
    });
    builder.cylinder("glass", palette.glass, {
      radius: 0.04,
      length: 0.01,
      at: [x + side, y, z - 0.115],
      axis: "z",
      segments: 10,
    });
  });
  builder.box("metal", palette.darkSteel, [0.1, 0.03, 0.08], [x, y, z]);
  builder.cylinder("metal", palette.steel, {
    radius: 0.02,
    length: 0.06,
    at: [x, y - 0.03, z + 0.03],
    segments: 6,
  });
};

/** A camera trap strapped to a tree, to count the tigers that pass. */
const buildCameraTrap = (builder: AttractionBuilder) => {
  addTree(builder, [3.3, 0, -0.9], 1.1, leafMid);
  if (builder.isFar) {
    return;
  }
  builder.roundedBox(
    "paint",
    "#4a5a3a",
    [0.18, 0.24, 0.1],
    0.03,
    [3.3, 0.75, -0.72],
  );
  builder.cylinder("glass", "#1a2a3a", {
    radius: 0.04,
    length: 0.02,
    at: [3.3, 0.78, -0.665],
    axis: "z",
    segments: 10,
  });
  builder.torus("matte", "#2a2a2a", 0.19, 0.015, [3.3, 0.7, -0.9], "y", 12);
};

const binocularRide = (progress: number): LocalSpot => {
  const start = { x: hide.x, z: hide.z + hide.halfDepth + 0.75 };
  const look = { x: binocularsAt[0], z: binocularsAt[2] + 0.45 };
  const finish = { x: hide.x + 1.0, z: hide.z + hide.halfDepth + 0.9 };
  if (progress < 0.25) {
    const share = progress / 0.25;
    return {
      x: start.x + (look.x - start.x) * share,
      y: Math.min(floorHeight, share * 3 * floorHeight),
      z: start.z + (look.z - start.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.75) {
    return {
      x: look.x,
      y: floorHeight,
      z: look.z,
      heading: Math.PI + Math.sin(progress * 12) * 0.25,
    };
  }
  const share = (progress - 0.75) / 0.25;
  return {
    x: look.x + (finish.x - look.x) * share,
    y: Math.min(floorHeight, (1 - share) * 3 * floorHeight),
    z: look.z + (finish.z - look.z) * share,
    heading: 0,
  };
};

export const tigerLookoutModel: CuriosityModel = {
  kind: "tiger-lookout",
  islandId: "jungle-reach",
  name: "Tiger Lookout",
  fact: "Tigers are endangered: only a few thousand are left in the wild. When forests are cut down for farms and roads, tigers lose their homes and the animals they hunt. Rangers count tigers by their paw prints, called pug marks, and with hidden cameras. Every tiger's stripes are different, like a fingerprint.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Recognise that environments can change and that this can sometimes pose dangers to living things (endangered tigers).",
  footprint: 5.2,
  setting: "inland",
  signSpot: { x: 0.8, z: 4.3 },
  build: (builder) => {
    buildStream(builder);
    buildTigerBody(builder);
    if (builder.isFar) {
      builder.sphere(
        "matte",
        tigerOrange,
        0.22,
        [headPivot[0] + 0.16, headPivot[1] + 0.08, headPivot[2]],
        [1, 1, 1],
        6,
      );
    }
    buildPugMarks(builder);
    buildHide(builder);
    buildBinoculars(builder);
    buildCameraTrap(builder);
    addBush(builder, [-4.0, 0, 1.0], 0.55, leafDeep);
    addBush(builder, [3.6, 0, 1.8], 0.5, leafMid);
    addSignBoard(builder, [0.8, 0, 4.3], signColour);
  },
  moving: [
    {
      name: "tiger's head",
      pivot: headPivot,
      build: buildTigerHead,
      motion: { kind: "rise", reach: 7, height: 0.22, period: 2.4 },
    },
    {
      name: "tiger's tail",
      pivot: tailPivot,
      build: buildTail,
      motion: { kind: "swing", axis: "y", amplitude: 0.35, period: 2.6 },
    },
  ],
  decks: [
    buildFlatDeck(
      {
        minX: hide.x - hide.halfWidth,
        maxX: hide.x + hide.halfWidth,
        minZ: hide.z - hide.halfDepth,
        maxZ: hide.z + hide.halfDepth,
      },
      floorHeight,
    ),
    buildFlatDeck(
      {
        minX: hide.x - 0.4,
        maxX: hide.x + 0.4,
        minZ: hide.z + hide.halfDepth,
        maxZ: hide.z + hide.halfDepth + 0.4,
      },
      stepHeight,
    ),
  ],
  rides: [
    {
      id: "binoculars",
      name: "the binoculars",
      start: { x: hide.x, z: hide.z + hide.halfDepth + 0.75 },
      reach: 0.5,
      seconds: 8,
      finish: { x: hide.x + 1.0, z: hide.z + hide.halfDepth + 0.9 },
      follow: binocularRide,
    },
  ],
  blockers: [
    { x: tiger.x, z: tiger.z, radius: 0.75 },
    { x: tiger.x + 0.9, z: tiger.z, radius: 0.35 },
    { x: 3.3, z: -0.9, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Look through the binoculars",
    news: "Shh! Through the binoculars you watched the tiger lift its head and sniff the air. Its stripes help it hide in the tall grass.",
  },
};
