import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addGableRoof,
  addLampPost,
  addSignBoard,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addGlassblower,
  addVase,
  ash,
  ashPad,
  basalt,
  basaltDark,
  brick,
  bronze,
  buildVisitor,
  fireBrick,
  flagstone,
  glassColours,
  hash,
  iron,
  lava,
  lavaCore,
  sand,
  signColour,
  steel,
  timber,
  timberDark,
  verdigris,
} from "./glassblowing-studio-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const studio = { minX: -3.6, maxX: 3.6, minZ: -4.7, maxZ: 0.6, eaves: 3.1 };
const studioMidZ = (studio.minZ + studio.maxZ) / 2;
const studioWidth = studio.maxX - studio.minX;
const studioDepth = studio.maxZ - studio.minZ;
const roofRise = 1.5;
const wallZ = studio.minZ + 0.2;
const wallHeight = 2.9;
const furnaceAt = { x: -1.7, z: -3.3 };
const gloryHole: Triple = [furnaceAt.x, 0.9, furnaceAt.z + 1.0];
const chimneyTop = 5.4;
const benchAt = { x: 0.9, z: -1.7 };
const pipePivot: Triple = [0.6, 0.88, -1.2];
const marverAt = { x: 2.6, z: -2.4 };
const bubbleStandAt = { x: -2.7, z: -0.9 };
const bubblePivot: Triple = [bubbleStandAt.x, 1.5, bubbleStandAt.z + 0.95];
const pedestalAt = { x: 0, z: 3.4 };
const pedestalTop = 0.95;
const vanePivot: Triple = [2.6, 5.45, studioMidZ];
const lehr = { x: -6.3, minZ: -4.4, maxZ: 2.0, half: 0.7, belt: 0.36 };
const hood = { minZ: -3.4, maxZ: 1.4, radius: 0.85 };
const gallery = { minX: 4.9, maxX: 7.5, minZ: -3.6, maxZ: 0.4, height: 0.6 };
const steps = { minX: 5.5, maxX: 6.7, depth: 0.4, count: 3 };
const canopyTop = gallery.height + 2.3;
const glassTreeAt = { x: 4.3, z: 4.7 };
const rideStart = { x: lehr.x, z: 3.3 };
const rideFinish = { x: lehr.x, z: -5.9 };

/* The studio: floor, walls, posts and a copper roof */

const buildFloor = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    flagstone,
    [studioWidth + 0.2, 0.06, studioDepth],
    [0, 0.03, studioMidZ],
  );
  if (!builder.isFar) {
    for (let x = studio.minX + 0.9; x < studio.maxX; x += 1.8) {
      builder.box(
        "matte",
        basaltDark,
        [0.03, 0.065, studioDepth],
        [x, 0.03, studioMidZ],
      );
    }
    for (let z = studio.minZ + 0.88; z < studio.maxZ; z += 0.88) {
      builder.box(
        "matte",
        basaltDark,
        [studioWidth + 0.2, 0.065, 0.03],
        [0, 0.03, z],
      );
    }
  }
  /* The front yard: a path and a round plaza round the bauble */
  builder.box("matte", ash, [1.7, 0.04, 8.0], [0, 0.02, 4.6]);
  builder.cylinder("matte", ash, {
    radius: 1.7,
    length: 0.045,
    at: [pedestalAt.x, 0.022, pedestalAt.z],
    segments: builder.segments(32, 14),
  });
};

const buildBackWall = (builder: AttractionBuilder) => {
  const rows = builder.isFar ? 1 : 5;
  const columns = builder.isFar ? 1 : 10;
  builder.painted(
    new BoxGeometry(studioWidth + 0.2, wallHeight, 0.4, columns, rows, 1),
    (centre) => {
      const row = Math.floor(centre.y / 0.48);
      const column = Math.floor((centre.x + (row % 2) * 0.3 + 10) / 0.6);
      return shade(basalt, 0.85 + hash(row, column) * 0.3);
    },
    { at: [0, wallHeight / 2, wallZ] },
    "matte",
  );
  /* Low side walls at the back, the front left open */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      basalt,
      [0.32, 1.1, 2.1],
      [side * (studio.maxX - 0.05), 0.55, studio.minZ + 1.25],
    );
    builder.box(
      "matte",
      shade(basalt, 1.2),
      [0.4, 0.08, 2.15],
      [side * (studio.maxX - 0.05), 1.14, studio.minZ + 1.25],
    );
  });
  builder.box(
    "matte",
    shade(basalt, 1.2),
    [studioWidth + 0.3, 0.1, 0.48],
    [0, wallHeight + 0.05, wallZ],
  );
};

const postSpots = [
  { x: studio.minX, z: studio.maxZ - 0.1 },
  { x: studio.maxX, z: studio.maxZ - 0.1 },
  { x: studio.minX, z: -1.85 },
  { x: studio.maxX, z: -1.85 },
];

const buildFrame = (builder: AttractionBuilder) => {
  postSpots.forEach(({ x, z }) => {
    builder.box("matte", basaltDark, [0.4, 0.3, 0.4], [x, 0.15, z]);
    builder.box(
      "matte",
      timber,
      [0.24, studio.eaves, 0.24],
      [x, studio.eaves / 2, z],
    );
    if (!builder.isFar) {
      const inward = x < 0 ? 1 : -1;
      builder.bar(
        "matte",
        timberDark,
        [x, studio.eaves - 0.7, z],
        [x + inward * 0.6, studio.eaves - 0.08, z],
        0.12,
        4,
      );
    }
  });
  /* Wall plates and tie beams */
  builder.box(
    "matte",
    timberDark,
    [studioWidth + 0.3, 0.26, 0.26],
    [0, studio.eaves, studio.maxZ - 0.1],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      timberDark,
      [0.26, 0.26, studioDepth],
      [side * studio.maxX, studio.eaves, studioMidZ],
    );
  });
  [-1.8, 1.8].forEach((x) => {
    builder.box(
      "matte",
      timberDark,
      [0.2, 0.22, studioDepth],
      [x, studio.eaves, studioMidZ],
    );
    builder.box(
      "matte",
      timber,
      [0.14, roofRise - 0.1, 0.14],
      [x, studio.eaves + (roofRise - 0.1) / 2, studioMidZ],
    );
  });
};

const buildRoof = (builder: AttractionBuilder) => {
  const overhang = 0.3;
  addGableRoof(builder, {
    width: studioWidth,
    depth: studioDepth,
    rise: roofRise,
    at: [0, studio.eaves + 0.12, studioMidZ],
    colour: bronze,
    overhang,
    thickness: 0.1,
    finish: "metal",
  });
  const ridgeY = studio.eaves + 0.12 + roofRise;
  builder.cylinder("metal", verdigris, {
    radius: 0.09,
    length: studioWidth + 0.8,
    at: [0, ridgeY + 0.05, studioMidZ],
    axis: "x",
    segments: 10,
  });
  /* Gable ends, filled with timber boarding */
  const gable = new Shape();
  const halfSpan = studioDepth / 2;
  gable.moveTo(-halfSpan, 0);
  gable.lineTo(halfSpan, 0);
  gable.lineTo(0, roofRise);
  gable.lineTo(-halfSpan, 0);
  [-1, 1].forEach((side) => {
    builder.add(
      "matte",
      timber,
      new ExtrudeGeometry(gable, { depth: 0.08, bevelEnabled: false }),
      {
        at: [side * studio.maxX - 0.04, studio.eaves + 0.12, studioMidZ],
        rotation: [0, Math.PI / 2, 0],
      },
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Standing seams down the copper */
  const halfDepth = studioDepth / 2 + overhang;
  for (let x = studio.minX; x <= studio.maxX + 0.01; x += 1.2) {
    [-1, 1].forEach((side) => {
      builder.bar(
        "metal",
        shade(bronze, 0.82),
        [x, ridgeY + 0.07, studioMidZ],
        [x, studio.eaves + 0.19, studioMidZ + side * halfDepth],
        0.04,
        4,
      );
    });
  }
};

/* The furnace, its chimney and the glory hole */

const buildFurnace = (builder: AttractionBuilder) => {
  const { x, z } = furnaceAt;
  builder.box("matte", basaltDark, [2.4, 0.25, 2.2], [x, 0.125, z]);
  const profile = [
    [0.001, 0],
    [1.05, 0],
    [1.08, 0.3],
    [1.02, 0.9],
    [0.85, 1.4],
    [0.55, 1.75],
    [0.3, 1.9],
    [0.001, 1.92],
  ].map(([radius, height]) => new Vector2(radius, height));
  builder.painted(
    new LatheGeometry(profile, builder.segments(16, 8)),
    (centre) => {
      const row = Math.floor(centre.y / 0.18);
      const angle = Math.atan2(centre.x - x, centre.z - z);
      const column = Math.floor(angle * 3 + (row % 2) * 0.5);
      return shade(brick, 0.85 + hash(row, column) * 0.3);
    },
    { at: [x, 0.25, z] },
    "matte",
  );
  /* Iron bands */
  builder.torus("metal", iron, 1.08, 0.045, [x, 0.55, z], "y", 14);
  /* The glory hole: a firebrick ring round a white-hot opening */
  const [holeX, holeY, holeZ] = gloryHole;
  builder.torus(
    "matte",
    fireBrick,
    0.32,
    0.09,
    [holeX, holeY, holeZ - 0.02],
    "z",
    14,
  );
  builder.cylinder("glow", lavaCore, {
    radius: 0.3,
    length: 0.08,
    at: [holeX, holeY, holeZ - 0.06],
    axis: "z",
    segments: 18,
  });
  builder.add(
    "metal",
    bronze,
    new CylinderGeometry(
      0.5,
      0.5,
      0.5,
      builder.segments(14, 6),
      1,
      true,
      -Math.PI / 2,
      Math.PI,
    ),
    { at: [holeX, holeY + 0.38, holeZ - 0.2], rotation: [Math.PI / 2, 0, 0] },
  );
  /* A second, smaller glowing door for the pot of melted glass */
  builder.box(
    "metal",
    iron,
    [0.5, 0.42, 0.08],
    [x + 0.7, 0.55, z + 0.82],
    [0, 0.6, 0],
  );
  builder.box(
    "glow",
    lava,
    [0.32, 0.08, 0.02],
    [x + 0.73, 0.6, z + 0.87],
    [0, 0.6, 0],
  );
  /* The chimney */
  builder.cylinder("matte", brick, {
    radius: 0.3,
    radiusEnd: 0.26,
    length: chimneyTop - 1.9,
    at: [x, 1.9 + (chimneyTop - 1.9) / 2, z],
    segments: 12,
  });
  builder.cylinder("metal", bronze, {
    radius: 0.36,
    length: 0.18,
    at: [x, chimneyTop, z],
    segments: 12,
  });
  if (!builder.isFar) {
    builder.cylinder("metal", iron, {
      radius: 0.42,
      length: 0.05,
      at: [x, chimneyTop + 0.35, z],
      segments: 12,
    });
    [0, 1, 2, 3].forEach((leg) => {
      const angle = (leg / 4) * Math.PI * 2 + 0.4;
      builder.bar(
        "metal",
        iron,
        [
          x + Math.sin(angle) * 0.3,
          chimneyTop + 0.08,
          z + Math.cos(angle) * 0.3,
        ],
        [
          x + Math.sin(angle) * 0.3,
          chimneyTop + 0.34,
          z + Math.cos(angle) * 0.3,
        ],
        0.03,
        4,
      );
    });
    /* Logs and a coal scuttle by the furnace */
    [0, 1, 2].forEach((log) => {
      builder.cylinder("matte", log === 1 ? timber : timberDark, {
        radius: 0.09,
        length: 0.7,
        at: [
          x - 1.4,
          0.1 + (log === 2 ? 0.16 : 0),
          z + 0.9 + log * 0.12 - (log === 2 ? 0.18 : 0),
        ],
        axis: "x",
        segments: 8,
      });
    });
  }
};

const buildFlame = (builder: AttractionBuilder) => {
  builder.lathe(
    "glow",
    lava,
    [
      [0.001, -0.02],
      [0.2, 0.03],
      [0.16, 0.16],
      [0.08, 0.3],
      [0.001, 0.42],
    ],
    [0, -0.12, 0],
    "y",
    12,
  );
  builder.lathe(
    "glow",
    lavaCore,
    [
      [0.001, 0],
      [0.12, 0.04],
      [0.08, 0.16],
      [0.001, 0.28],
    ],
    [0, -0.08, 0.06],
    "y",
    10,
  );
};

/* The bench, the blowpipe and the marver */

const buildBench = (builder: AttractionBuilder) => {
  const { x, z } = benchAt;
  builder.box("matte", timber, [1.6, 0.09, 0.46], [x, 0.52, z]);
  (builder.isFar ? [] : [-0.7, 0.7]).forEach((dx) => {
    [-0.17, 0.17].forEach((dz) => {
      builder.box(
        "matte",
        timberDark,
        [0.08, 0.5, 0.08],
        [x + dx, 0.25, z + dz],
      );
    });
  });
  /* The two long arms the pipe is rolled along */
  [-0.6, 0.6].forEach((dx) => {
    builder.box("metal", steel, [0.07, 0.07, 1.2], [x + dx, 0.8, z + 0.4]);
    builder.box(
      "matte",
      timberDark,
      [0.08, 0.3, 0.08],
      [x + dx, 0.65, z - 0.1],
    );
    builder.box(
      "matte",
      timberDark,
      [0.08, 0.8, 0.08],
      [x + dx, 0.4, z + 0.95],
    );
  });
  addGlassblower(builder, [x, 0.56, z - 0.05]);
  if (builder.isFar) {
    return;
  }
  /* The wet wooden block and a bucket under the hot end */
  builder.cylinder("paint", timber, {
    radius: 0.22,
    radiusEnd: 0.25,
    length: 0.4,
    at: [-0.85, 0.2, -1.65],
    segments: 12,
  });
  builder.cylinder("water", "#3f6f80", {
    radius: 0.2,
    length: 0.02,
    at: [-0.85, 0.39, -1.65],
    segments: 12,
  });
  builder.torus("metal", iron, 0.235, 0.015, [-0.85, 0.3, -1.65], "y", 14);
  builder.box("matte", timberDark, [0.32, 0.12, 0.18], [-0.6, 0.06, -0.8]);
};

const buildBlowpipe = (builder: AttractionBuilder) => {
  builder.cylinder("metal", steel, {
    radius: 0.025,
    length: 2.6,
    at: [0, 0, 0],
    axis: "x",
    segments: 8,
  });
  builder.cylinder("matte", timber, {
    radius: 0.045,
    length: 0.6,
    at: [0.85, 0, 0],
    axis: "x",
    segments: 8,
  });
  builder.cylinder("metal", bronze, {
    radius: 0.035,
    length: 0.08,
    at: [1.32, 0, 0],
    axis: "x",
    segments: 8,
  });
  /* The glowing gather of melted glass, with canes of colour in it */
  builder.sphere("glow", lava, 0.17, [-1.38, 0, 0], [1.35, 1, 1], 14);
  if (builder.isFar) {
    return;
  }
  builder.sphere("glow", lavaCore, 0.11, [-1.45, 0.07, 0.04], [1.3, 1, 1], 8);
  [0, 1, 2].forEach((cane) => {
    const angle = (cane / 3) * Math.PI * 2;
    builder.sphere(
      "glass",
      glassColours[cane * 2],
      0.05,
      [-1.32, Math.sin(angle) * 0.15, Math.cos(angle) * 0.15],
      [1.6, 1, 1],
      6,
    );
  });
};

const buildMarver = (builder: AttractionBuilder) => {
  const { x, z } = marverAt;
  builder.box("metal", steel, [1.1, 0.1, 0.7], [x, 0.84, z]);
  (builder.isFar ? [] : [-0.45, 0.45]).forEach((dx) => {
    [-0.25, 0.25].forEach((dz) => {
      builder.box("metal", iron, [0.07, 0.8, 0.07], [x + dx, 0.4, z + dz]);
    });
  });
  builder.box("metal", iron, [1.0, 0.05, 0.6], [x, 0.2, z]);
  if (builder.isFar) {
    return;
  }
  /* Jacks, shears and a paddle on the table */
  builder.bar(
    "metal",
    iron,
    [x - 0.3, 0.91, z - 0.1],
    [x + 0.2, 0.91, z + 0.05],
    0.025,
    4,
  );
  builder.bar(
    "metal",
    iron,
    [x - 0.3, 0.91, z - 0.05],
    [x + 0.2, 0.91, z + 0.12],
    0.025,
    4,
  );
  builder.box("matte", timber, [0.4, 0.03, 0.14], [x + 0.25, 0.905, z - 0.2]);
  addVase(builder, [x - 0.1, 0.89, z + 0.2], glassColours[3], 0, 0.9);
  /* Tongs and paddles hung on the back wall */
  for (let tool = 0; tool < 5; tool++) {
    const toolX = 0.55 + tool * 0.24;
    builder.bar(
      "metal",
      iron,
      [toolX, 0.9, wallZ + 0.22],
      [toolX, 0.35, wallZ + 0.22],
      0.03,
      4,
    );
    builder.sphere(
      "metal",
      iron,
      0.04,
      [toolX, 0.92, wallZ + 0.22],
      [1, 1, 1],
      6,
    );
  }
};

/* Shelves of glass on the back wall */

const buildShelves = (builder: AttractionBuilder) => {
  const shelfZ = wallZ + 0.36;
  [1.25, 1.8, 2.35].forEach((y, row) => {
    builder.box("matte", timber, [2.9, 0.05, 0.34], [1.85, y, shelfZ]);
    builder.box(
      "matte",
      timberDark,
      [0.05, 0.18, 0.3],
      [0.45, y - 0.1, shelfZ],
    );
    builder.box(
      "matte",
      timberDark,
      [0.05, 0.18, 0.3],
      [3.25, y - 0.1, shelfZ],
    );
    const count = builder.isFar ? 0 : 3;
    for (let index = 0; index < count; index++) {
      addVase(
        builder,
        [0.65 + (index * 2.5) / Math.max(1, count - 1), y + 0.025, shelfZ],
        glassColours[(index + row * 2) % glassColours.length],
        index + row,
        0.95,
      );
    }
  });
  /* Blowpipes leaning in a rack by the left wall */
  builder.box(
    "matte",
    timberDark,
    [0.2, 0.12, 1.3],
    [studio.minX + 0.35, 0.1, -2.1],
  );
  const pipes = builder.isFar ? 0 : 6;
  for (let pipe = 0; pipe < pipes; pipe++) {
    const z = -2.65 + pipe * 0.22;
    builder.bar(
      "metal",
      steel,
      [studio.minX + 0.35, 0.15, z],
      [studio.minX + 0.2, 1.75, z + 0.04],
      0.04,
      5,
    );
  }
  if (pipes > 0) {
    builder.box(
      "matte",
      timberDark,
      [0.12, 0.08, 1.3],
      [studio.minX + 0.22, 1.55, -2.1],
    );
  }
};

/* The bubble stand, where a bubble grows on the end of a pipe */

const buildBubbleStand = (builder: AttractionBuilder) => {
  const { x, z } = bubbleStandAt;
  (builder.isFar ? [] : [0, 1, 2]).forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      iron,
      [x + Math.sin(angle) * 0.35, 0.02, z + Math.cos(angle) * 0.35],
      [x, 0.95, z],
      0.05,
      5,
    );
  });
  builder.torus("metal", iron, 0.1, 0.025, [x, 0.98, z + 0.05], "x", 10);
  builder.bar(
    "metal",
    steel,
    [x, 0.75, z - 0.6],
    [x, 1.42, bubblePivot[2] - 0.22],
    0.045,
    6,
  );
  builder.sphere(
    "glow",
    lava,
    0.07,
    [x, 1.43, bubblePivot[2] - 0.2],
    [1, 1, 1.4],
    8,
  );
};

const buildBubble = (builder: AttractionBuilder) => {
  builder.sphere("glass", "#ffb43a", 0.32, [0, 0, 0], [1, 0.95, 1.05], 14);
  builder.torus("glow", lava, 0.29, 0.03, [0, 0, -0.08], "z", 20);
  builder.sphere("glow", lavaCore, 0.08, [0, 0, -0.27], [1, 1, 0.6], 8);
};

/* The cooling tunnel (a lehr), which carries the glass, and you */

const buildLehr = (builder: AttractionBuilder) => {
  const length = lehr.maxZ - lehr.minZ;
  const midZ = (lehr.minZ + lehr.maxZ) / 2;
  builder.box(
    "metal",
    iron,
    [lehr.half * 2, 0.22, length],
    [lehr.x, 0.11, midZ],
  );
  builder.box(
    "matte",
    "#2b2b2e",
    [lehr.half * 2 - 0.25, 0.05, length + 0.1],
    [lehr.x, lehr.belt - 0.02, midZ],
  );
  [lehr.minZ, lehr.maxZ].forEach((z) => {
    builder.cylinder("metal", steel, {
      radius: 0.13,
      length: lehr.half * 2 - 0.1,
      at: [lehr.x, 0.24, z],
      axis: "x",
      segments: 12,
    });
  });
  if (!builder.isFar) {
    for (let z = lehr.minZ + 0.6; z < lehr.maxZ; z += 1.6) {
      [-1, 1].forEach((side) => {
        builder.box(
          "metal",
          iron,
          [0.1, 0.3, 0.1],
          [lehr.x + side * (lehr.half - 0.05), 0.15, z],
        );
      });
    }
  }
  /* The hood: hot at the front, cooler towards the back */
  const hoodLength = hood.maxZ - hood.minZ;
  builder.painted(
    new CylinderGeometry(
      hood.radius,
      hood.radius,
      hoodLength,
      builder.segments(18, 8),
      builder.isFar ? 1 : 3,
      true,
      Math.PI / 2,
      Math.PI,
    ),
    (centre) => {
      const share = (centre.z - hood.minZ) / hoodLength;
      return share > 0.66
        ? shade(bronze, 0.95)
        : share > 0.33
          ? bronze
          : shade(bronze, 1.15);
    },
    {
      at: [lehr.x, lehr.belt, (hood.minZ + hood.maxZ) / 2],
      rotation: [Math.PI / 2, 0, 0],
    },
    "metal",
  );
  (builder.isFar ? [hood.maxZ] : [hood.minZ, hood.maxZ]).forEach((z) => {
    builder.add(
      "metal",
      iron,
      new TorusGeometry(hood.radius, 0.07, 3, builder.segments(12, 6), Math.PI),
      { at: [lehr.x, lehr.belt, z] },
    );
  });
  /* A warm glow inside the mouth */
  builder.add(
    "glow",
    lava,
    new TorusGeometry(
      hood.radius - 0.12,
      0.05,
      4,
      builder.segments(14, 6),
      Math.PI,
    ),
    { at: [lehr.x, lehr.belt, hood.maxZ - 0.05] },
  );
  if (builder.isFar) {
    return;
  }
  for (let hoop = 1; hoop < 4; hoop++) {
    const z = hood.minZ + (hoodLength * hoop) / 4;
    builder.add(
      "metal",
      shade(bronze, 0.75),
      new TorusGeometry(hood.radius + 0.02, 0.03, 3, 10, Math.PI),
      { at: [lehr.x, lehr.belt, z] },
    );
  }
  /* Portholes: orange at the hot end, fading as the glass cools */
  const portholeColours = [lavaCore, "#ffd98a", "#cfe8f0"];
  portholeColours.forEach((colour, index) => {
    const z = hood.maxZ - 0.8 - index * 1.6;
    [-1, 1].forEach((side) => {
      builder.cylinder(index < 2 ? "glow" : "glass", colour, {
        radius: 0.13,
        length: 0.06,
        at: [
          lehr.x + side * (hood.radius * 0.7),
          lehr.belt + hood.radius * 0.7,
          z,
        ],
        axis: "x",
        segments: 8,
      });
    });
  });
  /* A dial on the side, and glass riding along the belt */
  builder.cylinder("paint", "#f4f1ea", {
    radius: 0.16,
    length: 0.04,
    at: [lehr.x + hood.radius + 0.02, 0.7, 0.9],
    axis: "x",
    segments: 14,
  });
  builder.box(
    "paint",
    "#c8102e",
    [0.02, 0.12, 0.02],
    [lehr.x + hood.radius + 0.05, 0.74, 0.92],
    [0.6, 0, 0],
  );
  [1.7, -4.0].forEach((z, index) => {
    addVase(
      builder,
      [lehr.x + (index - 1) * 0.3, lehr.belt + 0.01, z],
      glassColours[index + 2],
      index,
      1.1,
    );
  });
};

/* The gallery: a raised deck under a canopy of coloured glass */

const buildGallery = (builder: AttractionBuilder) => {
  const width = gallery.maxX - gallery.minX;
  const depth = gallery.maxZ - gallery.minZ;
  const midX = (gallery.minX + gallery.maxX) / 2;
  const midZ = (gallery.minZ + gallery.maxZ) / 2;
  builder.box(
    "matte",
    basalt,
    [width, gallery.height - 0.08, depth],
    [midX, (gallery.height - 0.08) / 2, midZ],
  );
  builder.box(
    "matte",
    timber,
    [width + 0.1, 0.08, depth + 0.1],
    [midX, gallery.height - 0.04, midZ],
  );
  if (!builder.isFar) {
    for (let x = gallery.minX + 0.3; x < gallery.maxX; x += 0.3) {
      builder.box(
        "matte",
        timberDark,
        [0.02, 0.085, depth + 0.1],
        [x, gallery.height - 0.04, midZ],
      );
    }
  }
  for (let step = 0; step < steps.count; step++) {
    const height = (gallery.height * (steps.count - step)) / (steps.count + 1);
    builder.box(
      "matte",
      step % 2 === 0 ? ash : shade(ash, 0.9),
      [steps.maxX - steps.minX, height, steps.depth],
      [
        (steps.minX + steps.maxX) / 2,
        height / 2,
        gallery.maxZ + steps.depth * (step + 0.5),
      ],
    );
  }
  /* Railings, with a gap for the steps */
  const railTop = gallery.height + 0.9;
  const runs: [number, number, number, number][] = [
    [gallery.minX, gallery.minZ, gallery.minX, gallery.maxZ],
    [gallery.maxX, gallery.minZ, gallery.maxX, gallery.maxZ],
    [gallery.minX, gallery.minZ, gallery.maxX, gallery.minZ],
    [gallery.minX, gallery.maxZ, steps.minX, gallery.maxZ],
    [steps.maxX, gallery.maxZ, gallery.maxX, gallery.maxZ],
  ];
  runs.forEach(([fromX, fromZ, toX, toZ]) => {
    const inset = (value: number, low: number, high: number) =>
      Math.min(high - 0.06, Math.max(low + 0.06, value));
    const from: Triple = [
      inset(fromX, gallery.minX, gallery.maxX),
      railTop,
      inset(fromZ, gallery.minZ, gallery.maxZ),
    ];
    const to: Triple = [
      inset(toX, gallery.minX, gallery.maxX),
      railTop,
      inset(toZ, gallery.minZ, gallery.maxZ),
    ];
    builder.bar("metal", bronze, from, to, 0.07, 6);
    if (!builder.isFar) {
      builder.bar(
        "metal",
        iron,
        [from[0], gallery.height + 0.45, from[2]],
        [to[0], gallery.height + 0.45, to[2]],
        0.035,
        4,
      );
    }
    const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
    const posts = Math.max(
      1,
      Math.round(length / (builder.isFar ? 1.6 : 0.85)),
    );
    for (let post = 0; post <= posts; post++) {
      const share = post / posts;
      const x = from[0] + (to[0] - from[0]) * share;
      const z = from[2] + (to[2] - from[2]) * share;
      builder.box(
        "metal",
        iron,
        [0.06, 0.9, 0.06],
        [x, gallery.height + 0.45, z],
      );
    }
  });
  /* The canopy of coloured glass on four posts */
  const corners: [number, number][] = [
    [gallery.minX + 0.12, gallery.minZ + 0.12],
    [gallery.maxX - 0.12, gallery.minZ + 0.12],
    [gallery.minX + 0.12, gallery.maxZ - 0.12],
    [gallery.maxX - 0.12, gallery.maxZ - 0.12],
  ];
  corners.forEach(([x, z]) => {
    builder.box(
      "matte",
      timber,
      [0.16, canopyTop - gallery.height, 0.16],
      [x, (canopyTop + gallery.height) / 2, z],
    );
  });
  builder.box(
    "matte",
    timberDark,
    [width + 0.2, 0.14, 0.16],
    [midX, canopyTop, gallery.minZ + 0.12],
  );
  builder.box(
    "matte",
    timberDark,
    [width + 0.2, 0.14, 0.16],
    [midX, canopyTop, gallery.maxZ - 0.12],
  );
  builder.box(
    "matte",
    timberDark,
    [0.16, 0.14, depth],
    [gallery.minX + 0.12, canopyTop, midZ],
  );
  builder.box(
    "matte",
    timberDark,
    [0.16, 0.14, depth],
    [gallery.maxX - 0.12, canopyTop, midZ],
  );
  const tilesX = builder.isFar ? 1 : 3;
  const tilesZ = builder.isFar ? 1 : 4;
  for (let column = 0; column < tilesX; column++) {
    for (let row = 0; row < tilesZ; row++) {
      builder.box(
        "glass",
        builder.isFar
          ? glassColours[0]
          : glassColours[(column * 2 + row * 3) % glassColours.length],
        [width / tilesX - 0.04, 0.04, depth / tilesZ - 0.04],
        [
          gallery.minX + (width / tilesX) * (column + 0.5),
          canopyTop + 0.09,
          gallery.minZ + (depth / tilesZ) * (row + 0.5),
        ],
      );
    }
  }
  /* Plinths with the biggest vases, and a bench */
  const plinths: [number, number][] = [
    [7.0, -1.9],
    [7.0, -0.55],
    [5.4, -3.1],
  ];
  plinths.forEach(([x, z], index) => {
    builder.box(
      "matte",
      shade(ash, 1.1),
      [0.46, 0.8, 0.46],
      [x, gallery.height + 0.4, z],
    );
    builder.box(
      "metal",
      bronze,
      [0.5, 0.05, 0.5],
      [x, gallery.height + 0.82, z],
    );
    addVase(
      builder,
      [x, gallery.height + 0.845, z],
      glassColours[(index * 2 + 1) % glassColours.length],
      index + 1,
      2.4,
    );
  });
  addBench(builder, [6.4, gallery.height, -3.15], 0, timber);
};

/* The yard: the bauble's pedestal, a glass tree, sacks of sand */

const buildPedestal = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    basalt,
    [
      [0.001, 0],
      [0.62, 0],
      [0.62, 0.12],
      [0.48, 0.2],
      [0.4, 0.78],
      [0.5, 0.86],
      [0.52, pedestalTop],
      [0.001, pedestalTop],
    ],
    [pedestalAt.x, 0, pedestalAt.z],
    "y",
    8,
  );
  builder.torus(
    "metal",
    bronze,
    0.47,
    0.035,
    [pedestalAt.x, 0.84, pedestalAt.z],
    "y",
    16,
  );
  builder.box(
    "metal",
    bronze,
    [0.36, 0.22, 0.02],
    [pedestalAt.x, 0.5, pedestalAt.z + 0.45],
    [-0.13, 0, 0],
  );
};

const buildBauble = (builder: AttractionBuilder) => {
  builder.sphere(
    "glass",
    glassColours[0],
    0.48,
    [0, 0.5, 0],
    [1, 1, 1],
    builder.isFar ? 10 : 16,
  );
  const ribbons: [number, number, string][] = [
    [0.4, 0.2, lava],
    [-0.5, 1.2, glassColours[1]],
  ];
  ribbons.forEach(([tilt, turn, colour]) => {
    builder.add(
      colour === glassColours[1] ? "glass" : "glow",
      colour,
      new TorusGeometry(0.485, 0.025, 4, builder.segments(16, 8)),
      { at: [0, 0.5, 0], rotation: [Math.PI / 2 + tilt, turn, 0] },
    );
  });
  builder.cylinder("metal", bronze, {
    radius: 0.1,
    radiusEnd: 0.07,
    length: 0.12,
    at: [0, 1.0, 0],
    segments: 10,
  });
  builder.torus("metal", bronze, 0.07, 0.018, [0, 1.12, 0], "x", 10);
};

const buildVane = (builder: AttractionBuilder) => {
  builder.cylinder("metal", iron, {
    radius: 0.025,
    length: 0.3,
    at: [0, 0.1, 0],
    segments: 6,
  });
  builder.bar("metal", bronze, [0, 0.2, -0.55], [0, 0.2, 0.55], 0.035, 5);
  builder.lathe(
    "metal",
    bronze,
    [
      [0.001, 0],
      [0.08, 0],
      [0.001, 0.2],
    ],
    [0, 0.2, 0.55],
    "z",
    6,
  );
  /* A glass fish for the arrow's tail */
  builder.sphere(
    "glass",
    glassColours[1],
    0.16,
    [0, 0.2, -0.45],
    [0.45, 1, 1.6],
    10,
  );
  builder.lathe(
    "glass",
    glassColours[5],
    [
      [0.001, 0],
      [0.16, 0.18],
      [0.001, 0.2],
    ],
    [0, 0.2, -0.65],
    "z",
    6,
  );
};

const buildYard = (builder: AttractionBuilder) => {
  buildPedestal(builder);
  /* The glass tree: a bronze tree hung with glass fruit */
  const { x, z } = glassTreeAt;
  builder.cylinder("matte", basaltDark, {
    radius: 0.5,
    length: 0.2,
    at: [x, 0.1, z],
    segments: 10,
  });
  builder.cylinder("metal", bronze, {
    radius: 0.12,
    radiusEnd: 0.08,
    length: 1.9,
    at: [x, 1.15, z],
    segments: 8,
  });
  const branches = builder.isFar ? 3 : 5;
  for (let branch = 0; branch < branches; branch++) {
    const angle = (branch / branches) * Math.PI * 2 + 0.3;
    const tip: Triple = [
      x + Math.sin(angle) * 0.85,
      2.15 + (branch % 2) * 0.35,
      z + Math.cos(angle) * 0.85,
    ];
    builder.bar(
      "metal",
      bronze,
      [x, 1.65 + (branch % 3) * 0.2, z],
      tip,
      0.06,
      5,
    );
    builder.sphere(
      "glass",
      glassColours[branch % glassColours.length],
      0.17,
      [tip[0], tip[1] - 0.2, tip[2]],
      [1, 1.1, 1],
      8,
    );
    if (!builder.isFar) {
      builder.bar(
        "metal",
        iron,
        tip,
        [tip[0], tip[1] - 0.05, tip[2]],
        0.015,
        4,
      );
    }
  }
  builder.sphere("glass", glassColours[2], 0.22, [x, 2.2, z], [1, 1.2, 1], 12);
  /* Sacks of sand, soda and lime: what glass is made from */
  const sacks: [number, number, string][] = [
    [-3.9, 1.8, "#d9c08a"],
    [-3.4, 2.15, "#f1ede4"],
    [-4.0, 2.5, "#e4dccb"],
  ];
  sacks.forEach(([sackX, sackZ, colour]) => {
    builder.box(
      "matte",
      colour,
      [0.45, 0.5, 0.35],
      [sackX, 0.25, sackZ],
      [0, sackX, 0],
    );
    if (!builder.isFar) {
      builder.cylinder("matte", "#8a6a3a", {
        radius: 0.07,
        length: 0.06,
        at: [sackX, 0.52, sackZ],
        segments: 6,
      });
    }
  });
  builder.lathe(
    "matte",
    sand,
    [
      [0.001, 0],
      [0.75, 0],
      [0.5, 0.2],
      [0.001, 0.38],
    ],
    [-4.6, 0, 1.0],
    "y",
    12,
  );
  if (!builder.isFar) {
    builder.bar("matte", timber, [-4.55, 0.2, 1.0], [-4.0, 1.0, 0.7], 0.05, 5);
    builder.box(
      "metal",
      steel,
      [0.25, 0.04, 0.3],
      [-4.6, 0.25, 1.15],
      [0.4, 0.5, 0],
    );
  }
  /* A crate of bottles by the gallery steps */
  builder.box("matte", timber, [0.7, 0.4, 0.5], [4.3, 0.2, 2.1]);
  if (!builder.isFar) {
    for (let bottle = 0; bottle < 3; bottle++) {
      addVase(
        builder,
        [4.1 + bottle * 0.2, 0.4, 2.1],
        glassColours[bottle],
        2,
        0.8,
      );
    }
  }
  /* Basalt boulders */
  const boulders: [number, number, number][] = [
    [-7.8, 4.6, 0.5],
    [7.6, 3.4, 0.6],
    [-2.6, 8.1, 0.4],
    [8.4, -3.6, 0.45],
    [-1.8, -6.6, 0.55],
  ];
  (builder.isFar ? [] : boulders).forEach(
    ([boulderX, boulderZ, size], index) => {
      builder.sphere(
        "matte",
        index % 2 === 0 ? basalt : basaltDark,
        size,
        [boulderX, size * 0.35, boulderZ],
        [1.2, 0.75, 1],
        6,
      );
    },
  );
  addLampPost(builder, [-2.2, 0, 1.4]);
  addLampPost(builder, [2.2, 0, 1.4]);
  addBench(builder, [-2.5, 0, 4.4], Math.PI / 2, timber);
  addSignBoard(builder, [3.0, 0, 7.8], signColour);
};

/* The ride through the cooling tunnel */

const ease = (share: number): number => share * share * (3 - 2 * share);

const rideOn = 0.1;
const rideOff = 0.9;
const beltTop = lehr.belt + 0.03;
const beltEntry = lehr.maxZ - 0.3;
const beltExit = lehr.minZ + 0.1;

const coolingTunnelRide = (progress: number, seconds: number): LocalSpot => {
  if (progress < rideOn) {
    const share = ease(progress / rideOn);
    return {
      x: lehr.x,
      y: beltTop * share + 0.25 * Math.sin(share * Math.PI),
      z: rideStart.z + (beltEntry - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress > rideOff) {
    const share = ease((progress - rideOff) / (1 - rideOff));
    return {
      x: lehr.x,
      y: beltTop * (1 - share) + 0.25 * Math.sin(share * Math.PI),
      z: beltExit + (rideFinish.z - beltExit) * share,
      heading: Math.PI,
    };
  }
  const share = (progress - rideOn) / (rideOff - rideOn);
  return {
    x: lehr.x + 0.03 * Math.sin(seconds * 3),
    y: beltTop + 0.01 * Math.abs(Math.sin(seconds * 9)),
    z: beltEntry + (beltExit - beltEntry) * share,
    heading: Math.PI + 0.05 * Math.sin(seconds * 1.3),
  };
};

const galleryDeck: Deck = ({ x, z }) => {
  if (
    x >= gallery.minX &&
    x <= gallery.maxX &&
    z >= gallery.minZ &&
    z <= gallery.maxZ
  ) {
    return { height: gallery.height, kind: "bridge" };
  }
  const stepsEnd = gallery.maxZ + steps.depth * steps.count;
  if (x < steps.minX || x > steps.maxX || z <= gallery.maxZ || z > stepsEnd) {
    return undefined;
  }
  const step = Math.min(
    steps.count - 1,
    Math.floor((z - gallery.maxZ) / steps.depth),
  );
  return {
    height: (gallery.height * (steps.count - step)) / (steps.count + 1),
    kind: "ground",
  };
};

export const glassblowingStudioModel: NewLandAttractionModel = {
  kind: "glassblowing-studio",
  islandId: "ember-isle",
  name: "Glassblowing Studio",
  fact: "Glass is made by heating sand, soda and lime in a furnace until they melt into a glowing, runny liquid. A glassblower gathers a blob on a long pipe, blows it into shape and lets it cool slowly so it doesn't crack. It is an irreversible change: the glass can never turn back into sand.",
  curriculumLink:
    "Science, Year 5: properties and changes of materials. Melting sand into glass is a change that cannot be reversed.",
  footprint: 9.5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: 3.0, z: 8.6 },
  build: (builder) => {
    buildFloor(builder);
    buildBackWall(builder);
    buildFrame(builder);
    buildRoof(builder);
    buildFurnace(builder);
    buildBench(builder);
    buildMarver(builder);
    buildShelves(builder);
    buildBubbleStand(builder);
    buildLehr(builder);
    buildGallery(builder);
    buildYard(builder);
  },
  moving: [
    {
      name: "giant glass bauble",
      pivot: [pedestalAt.x, pedestalTop, pedestalAt.z],
      build: buildBauble,
      motion: { kind: "rise", reach: 5, height: 1.3, period: 2.4 },
    },
    {
      name: "blowpipe",
      pivot: pipePivot,
      build: buildBlowpipe,
      motion: { kind: "whirl", axis: "x", idle: 1.2, speed: 7, reach: 5 },
    },
    {
      name: "glass bubble",
      pivot: bubblePivot,
      build: buildBubble,
      motion: { kind: "wake", reach: 4.5 },
    },
    {
      name: "glory hole flame",
      pivot: [gloryHole[0], gloryHole[1], gloryHole[2] + 0.02],
      build: buildFlame,
      motion: { kind: "flicker", period: 0.6 },
    },
    {
      name: "glass fish weathervane",
      pivot: vanePivot,
      build: buildVane,
      motion: { kind: "spin", axis: "y", speed: 0.5 },
    },
  ],
  wanderers: [
    {
      name: "visitors",
      build: buildVisitor("#3d6fb6", "#4a4f5a", "#3a2a1e"),
      count: 3,
      centre: { x: 0.4, z: 6.0 },
      radius: 2.2,
      speed: 0.4,
    },
  ],
  smoke: [
    {
      at: [furnaceAt.x, chimneyTop + 0.5, furnaceAt.z],
      colour: "#9a9490",
      puffs: 6,
      size: 0.3,
      rise: 2.6,
      spread: 0.5,
    },
  ],
  blockers: [
    { x: pedestalAt.x, z: pedestalAt.z, radius: 0.7 },
    { x: furnaceAt.x, z: furnaceAt.z, radius: 1.1 },
    { x: glassTreeAt.x, z: glassTreeAt.z, radius: 0.5 },
  ] satisfies LocalBlocker[],
  decks: [galleryDeck],
  rides: [
    {
      id: "cooling-tunnel",
      name: "the cooling tunnel",
      start: rideStart,
      reach: 0.7,
      seconds: 12,
      finish: rideFinish,
      follow: coolingTunnelRide,
    },
  ],
  play: {
    label: "Blow a glass bubble",
    news: "You puffed down the blowpipe and the glowing blob swelled into a shiny glass bubble, ready to cool slowly in the tunnel.",
    tune: [84, 88, 91, 96],
  },
};
