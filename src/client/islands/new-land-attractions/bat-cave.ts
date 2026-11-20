import {
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  LatheGeometry,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
} from "three";
import {
  addBench,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const rock = "#6f6a60";
const darkRock = "#4d4943";
const caveInside = "#3a3530";
const caveFloor = "#5a4c3c";
const moss = "#4f8a3a";
const deepMoss = "#3a6e2e";
const leafDeep = "#256b2a";
const leafMid = "#2f8a35";
const leafBright = "#4fa83c";
const vine = "#3f7a2c";
const batBrown = "#4a3a32";
const batWing = "#2e2622";
const fruitBatFur = "#8a5a32";
const timber = "#7a5232";
const plank = "#a8774a";
const glowGreen = "#bff7c8";
const glowBlue = "#9fe8ff";
const mushroomGlow = "#7ef0d8";
const signColour = "#3b2f5a";

/* The hill and its cave: a rocky dome, open at the front */

const cave = { x: 0, z: -1.5 };
const mouthGap = 0.92;
const lintelHeight = 2.4;

const outerLower: [number, number][] = [
  [4.8, -0.05],
  [4.8, 0.5],
  [4.62, 1.25],
  [4.32, 1.95],
  [4.0, lintelHeight],
];
const outerUpper: [number, number][] = [
  [4.0, lintelHeight],
  [3.55, 2.9],
  [2.95, 3.35],
  [2.1, 3.7],
  [1.1, 3.92],
  [0, 3.98],
];
const innerLower: [number, number][] = [
  [3.72, lintelHeight - 0.05],
  [4.02, 1.85],
  [4.22, 1.1],
  [4.3, 0.4],
  [4.32, -0.05],
];
const innerUpper: [number, number][] = [
  [0, 3.6],
  [1.0, 3.54],
  [1.9, 3.34],
  [2.75, 2.98],
  [3.3, 2.65],
  [3.72, lintelHeight - 0.05],
];

const aroundCave = (angle: number, radius: number, y: number): Triple => [
  cave.x + Math.sin(angle) * radius,
  y,
  cave.z + Math.cos(angle) * radius,
];

const upright = new Vector3(0, 1, 0);

/** A round bar that tapers from `fromRadius` to `toRadius`. */
const addTaperedBar = (
  builder: AttractionBuilder,
  colour: string,
  from: Triple,
  to: Triple,
  fromRadius: number,
  toRadius: number,
  segments = 8,
) => {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(upright, direction.clone().normalize()),
  );
  const middle = start.add(direction.clone().multiplyScalar(0.5));
  builder.add(
    "matte",
    colour,
    new CylinderGeometry(
      toRadius,
      fromRadius,
      direction.length(),
      builder.segments(segments, Math.max(4, Math.round(segments / 2))),
    ),
    { at: [middle.x, middle.y, middle.z], rotation: [turn.x, turn.y, turn.z] },
  );
};

const addShell = (
  builder: AttractionBuilder,
  colour: string,
  profile: readonly [number, number][],
  gap: number,
) => {
  builder.add(
    "matte",
    colour,
    new LatheGeometry(
      profile.map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(24, 14),
      gap / 2,
      Math.PI * 2 - gap,
    ),
    { at: [cave.x, 0, cave.z] },
  );
};

const boulders: [number, number, number, number, number][] = [
  /* angle, reach, y, radius, squash */
  [mouthGap / 2 + 0.06, 4.55, 0.45, 0.62, 1.1],
  [mouthGap / 2 + 0.1, 4.35, 1.35, 0.55, 1.2],
  [mouthGap / 2 + 0.08, 4.1, 2.15, 0.5, 1],
  [-mouthGap / 2 - 0.06, 4.55, 0.45, 0.64, 1.1],
  [-mouthGap / 2 - 0.1, 4.35, 1.35, 0.55, 1.2],
  [-mouthGap / 2 - 0.08, 4.1, 2.15, 0.5, 1],
  [1.2, 4.9, 0.3, 0.55, 0.8],
  [2.3, 4.95, 0.35, 0.7, 0.75],
  [3.3, 4.95, 0.3, 0.6, 0.8],
  [4.3, 4.9, 0.3, 0.75, 0.7],
  [5.2, 4.95, 0.3, 0.55, 0.8],
  [2.0, 3.0, 3.35, 0.7, 0.6],
  [4.1, 2.6, 3.5, 0.8, 0.55],
  [5.6, 3.4, 3.0, 0.6, 0.6],
  [0.2, 1.4, 3.85, 0.65, 0.5],
];

const buildHill = (builder: AttractionBuilder) => {
  addShell(builder, rock, outerLower, mouthGap);
  addShell(builder, rock, outerUpper, 0);
  if (!builder.isFar) {
    addShell(builder, caveInside, innerLower, mouthGap);
    addShell(builder, caveInside, innerUpper, 0);
  }
  /* The lintel over the mouth */
  builder.sphere(
    "matte",
    darkRock,
    0.6,
    aroundCave(0, 4.05, lintelHeight + 0.1),
    [3.4, 0.75, 1.1],
    builder.isFar ? 12 : 16,
  );
  (builder.isFar ? boulders.slice(0, 11) : boulders).forEach(
    ([angle, reach, y, radius, squash], index) => {
      builder.sphere(
        "matte",
        index % 3 === 0 ? darkRock : shade(rock, 0.92 + (index % 4) * 0.05),
        radius,
        aroundCave(angle, reach, y),
        [1.15, squash, 1],
        8,
      );
    },
  );
  /* Moss and ferns on the hill */
  const mossPatches: [number, number, number, number][] = [
    [0.9, 3.3, 3.25, 0.9],
    [2.6, 2.4, 3.55, 1.0],
    [3.6, 3.6, 2.85, 0.8],
    [5.0, 2.0, 3.65, 0.9],
    [-0.8, 3.2, 3.25, 0.85],
    [1.7, 4.2, 2.05, 0.7],
    [4.6, 4.3, 1.9, 0.7],
  ];
  (builder.isFar ? mossPatches.slice(0, 4) : mossPatches).forEach(
    ([angle, reach, y, radius], index) => {
      builder.sphere(
        "matte",
        index % 2 === 0 ? moss : deepMoss,
        radius,
        aroundCave(angle, reach, y),
        [1.2, 0.35, 1.2],
        builder.isFar ? 6 : 8,
      );
    },
  );
  if (!builder.isFar) {
    /* Vines dangling over the mouth, high enough to walk under */
    const vines = 9;
    for (let index = 0; index < vines; index++) {
      const across = -1.5 + (index / (vines - 1)) * 3;
      const drop = 0.35 + ((index * 37) % 5) * 0.12;
      const [x, , z] = aroundCave(0, 4.45, 0);
      builder.bar(
        "matte",
        vine,
        [x + across, lintelHeight + 0.1, z],
        [x + across * 1.02, lintelHeight - drop, z + 0.04],
        0.04,
        4,
      );
      builder.sphere(
        "matte",
        index % 2 === 0 ? leafBright : leafMid,
        0.09,
        [x + across * 1.02, lintelHeight - drop, z + 0.05],
        [1.2, 0.6, 0.6],
        6,
      );
    }
    /* Stalactites inside, hanging well above the Character's head */
    const stalactites: [number, number, number][] = [
      [0.3, 1.2, 0.7],
      [1.5, 1.9, 0.6],
      [2.6, 1.6, 0.5],
      [3.6, 2.2, 0.55],
      [4.6, 1.5, 0.65],
      [5.5, 2.0, 0.5],
      [-0.6, 2.4, 0.45],
      [2.0, 0.6, 0.6],
      [4.0, 0.9, 0.55],
      [5.0, 2.8, 0.4],
    ];
    stalactites.forEach(([angle, reach, length], index) => {
      const ceiling = 3.5 - reach * 0.18;
      const [x, , z] = aroundCave(angle, reach, 0);
      builder.cylinder("matte", index % 2 === 0 ? "#8c857a" : "#a39b8d", {
        radius: 0.12,
        radiusEnd: 0.012,
        length,
        at: [x, ceiling - length / 2 + 0.05, z],
        segments: 7,
      });
    });
    /* Stalagmites rising from the floor, by the walls */
    const stalagmites: [number, number, number, number][] = [
      [2.0, 3.55, 0.9, 0.2],
      [2.3, 3.75, 0.55, 0.15],
      [3.4, 3.6, 1.2, 0.24],
      [3.15, 3.2, 0.5, 0.14],
      [4.1, 3.6, 0.8, 0.2],
      [-1.8, 3.6, 0.7, 0.18],
      [-1.55, 3.8, 1.05, 0.22],
    ];
    stalagmites.forEach(([angle, reach, height, radius], index) => {
      const [x, , z] = aroundCave(angle, reach, 0);
      builder.cylinder("matte", index % 2 === 0 ? "#9a9284" : "#b2a998", {
        radius,
        radiusEnd: 0.02,
        length: height,
        at: [x, height / 2, z],
        segments: 8,
      });
    });
  }
  /* The cave floor */
  builder.cylinder("matte", caveFloor, {
    radius: 4.3,
    length: 0.04,
    at: [cave.x, 0.02, cave.z],
    segments: builder.segments(28, 12),
  });
};

/* Glowing toadstools in the cave and by the door */

const buildMushrooms = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const clusters: [number, number][] = [
    [3.0, 3.1],
    [-2.3, 3.4],
    [0.6, 4.95],
  ];
  clusters.forEach(([angle, reach], cluster) => {
    const [cx, , cz] = aroundCave(angle, reach, 0);
    [
      [0, 0, 1],
      [0.18, 0.1, 0.7],
      [-0.14, 0.16, 0.6],
    ].forEach(([dx, dz, size]) => {
      builder.cylinder("matte", palette.cream, {
        radius: 0.035 * size,
        length: 0.22 * size,
        at: [cx + dx, 0.11 * size, cz + dz],
        segments: 6,
      });
      builder.sphere(
        "glow",
        cluster % 2 === 0 ? mushroomGlow : glowBlue,
        0.1 * size,
        [cx + dx, 0.22 * size, cz + dz],
        [1, 0.5, 1],
        6,
      );
    });
  });
};

/* The stream that runs out of the cave to a pool */

const streamPoints: [number, number][] = [
  [-1.6, -4.6],
  [-1.9, -3.2],
  [-1.5, -1.6],
  [-1.9, 0.2],
  [-1.6, 1.8],
  [-1.9, 3.4],
  [-2.6, 4.6],
  [-3.4, 5.4],
];
const pool = { x: -3.7, z: 5.9, radius: 1.45 };

const buildStream = (builder: AttractionBuilder) => {
  for (let index = 1; index < streamPoints.length; index++) {
    const [fromX, fromZ] = streamPoints[index - 1];
    const [toX, toZ] = streamPoints[index];
    const length = Math.hypot(toX - fromX, toZ - fromZ);
    const heading = Math.atan2(toX - fromX, toZ - fromZ);
    builder.box(
      "water",
      palette.water,
      [0.62, 0.03, length + 0.3],
      [(fromX + toX) / 2, 0.05, (fromZ + toZ) / 2],
      [0, heading, 0],
    );
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        const across = side * 0.4;
        [0.5].forEach((share, step) => {
          builder.sphere(
            "matte",
            (index + step) % 2 === 0 ? palette.stone : "#8d867a",
            0.13,
            [
              fromX + (toX - fromX) * share + Math.cos(heading) * across,
              0.06,
              fromZ + (toZ - fromZ) * share - Math.sin(heading) * across,
            ],
            [1.2, 0.6, 1],
            5,
          );
        });
      });
    }
  }
  builder.cylinder("water", palette.water, {
    radius: pool.radius,
    length: 0.03,
    at: [pool.x, 0.05, pool.z],
    segments: builder.segments(24, 12),
  });
  builder.torus(
    "matte",
    palette.darkStone,
    pool.radius + 0.08,
    0.12,
    [pool.x, 0.04, pool.z],
    "y",
    builder.isFar ? 14 : 28,
  );
  if (!builder.isFar) {
    [
      [0.5, 0.3, 0.3],
      [-0.6, -0.4, 0.24],
      [0.1, -0.7, 0.2],
    ].forEach(([dx, dz, radius], index) => {
      builder.cylinder("matte", index === 1 ? leafMid : leafBright, {
        radius,
        length: 0.02,
        at: [pool.x + dx, 0.075, pool.z + dz],
        segments: 12,
      });
    });
    builder.sphere(
      "paint",
      "#f2a0c0",
      0.07,
      [pool.x + 0.5, 0.11, pool.z + 0.3],
      [1, 0.7, 1],
      8,
    );
    /* A little green frog on a lily pad */
    builder.sphere(
      "paint",
      "#5fbf3a",
      0.09,
      [pool.x - 0.6, 0.13, pool.z - 0.4],
      [1, 0.7, 1.2],
      8,
    );
    [-1, 1].forEach((side) => {
      builder.sphere(
        "paint",
        palette.black,
        0.025,
        [pool.x - 0.6 + side * 0.04, 0.19, pool.z - 0.33],
        [1, 1, 1],
        5,
      );
    });
  }
};

/* The bat tunnel: a narrow way in through the side of the hill */

const tunnelAngle = Math.PI / 2;
const tunnelMouth = aroundCave(tunnelAngle, 4.82, 0);

const buildTunnelMouth = (builder: AttractionBuilder) => {
  const [x, , z] = tunnelMouth;
  builder.sphere(
    "matte",
    "#15120f",
    1,
    [x - 0.05, 0.1, z],
    [0.18, 0.95, 0.68],
    builder.isFar ? 8 : 14,
  );
  builder.torus(
    "matte",
    darkRock,
    0.78,
    0.2,
    [x + 0.05, 0.05, z],
    "x",
    builder.isFar ? 10 : 22,
  );
  /* An old timber frame, like a mine's, round the way in */
  [-0.62, 0.62].forEach((side) => {
    builder.box("matte", timber, [0.14, 1.0, 0.14], [x + 0.25, 0.5, z + side]);
  });
  builder.box("matte", timber, [0.16, 0.14, 1.5], [x + 0.25, 1.02, z]);
  if (!builder.isFar) {
    builder.box("paint", "#e9c34a", [0.03, 0.18, 0.7], [x + 0.34, 1.02, z]);
    builder.box("paint", batBrown, [0.02, 0.06, 0.24], [x + 0.36, 1.03, z]);
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        batBrown,
        [0.02, 0.04, 0.16],
        [x + 0.36, 1.05, z + side * 0.16],
        [side * 0.4, 0, 0],
      );
    });
  }
};

/* By the entrance: lanterns, a bench, a bat box and an information board */

const addLantern = (builder: AttractionBuilder, at: Triple) => {
  const [x, , z] = at;
  builder.cylinder("matte", timber, {
    radius: 0.06,
    length: 1.7,
    at: [x, 0.85, z],
    segments: 8,
  });
  builder.box("glow", palette.warmLight, [0.18, 0.24, 0.18], [x, 1.84, z]);
  builder.cylinder("metal", palette.black, {
    radius: 0.16,
    radiusEnd: 0.02,
    length: 0.14,
    at: [x, 2.03, z],
    segments: 8,
  });
  if (!builder.isFar) {
    builder.box("metal", palette.black, [0.2, 0.03, 0.2], [x, 1.71, z]);
    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sz) => {
        builder.box(
          "metal",
          palette.black,
          [0.025, 0.24, 0.025],
          [x + sx * 0.09, 1.84, z + sz * 0.09],
        );
      });
    });
  }
};

const buildEntrance = (builder: AttractionBuilder) => {
  const [mx, , mz] = aroundCave(0, 4.9, 0);
  /* A path of stepping stones from the sign to the mouth */
  const stones: [number, number][] = [
    [0.5, 4.0],
    [0.7, 4.8],
    [0.9, 5.6],
    [1.3, 6.4],
    [1.8, 7.1],
  ];
  stones.forEach(([x, z], index) => {
    builder.cylinder(
      "matte",
      index % 2 === 0 ? palette.stone : shade(palette.stone, 0.9),
      {
        radius: 0.34,
        length: 0.06,
        at: [x, 0.03, z],
        segments: builder.segments(10, 6),
      },
    );
  });
  addLantern(builder, [mx - 2.25, 0, mz + 0.35]);
  addLantern(builder, [mx + 2.25, 0, mz + 0.35]);
  addBench(builder, [3.6, 0, 5.4], -0.7, plank);
  /* A bat box on a pole */
  const box: Triple = [5.6, 0, 3.4];
  builder.cylinder("matte", timber, {
    radius: 0.07,
    length: 2.6,
    at: [box[0], 1.3, box[2]],
    segments: 8,
  });
  builder.box("matte", plank, [0.42, 0.55, 0.26], [box[0], 2.55, box[2] + 0.1]);
  builder.box(
    "matte",
    timber,
    [0.5, 0.05, 0.36],
    [box[0], 2.86, box[2] + 0.1],
    [0.25, 0, 0],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      "#1d1a17",
      [0.3, 0.04, 0.02],
      [box[0], 2.3, box[2] + 0.24],
    );
    /* An information board about bats and echoes */
    const board: Triple = [-5.3, 0, 2.6];
    [-0.5, 0.5].forEach((side) => {
      builder.box(
        "matte",
        timber,
        [0.08, 1.4, 0.08],
        [board[0] + side * 0.8, 0.7, board[2] + side * 0.6],
        [0, 0.65, 0],
      );
    });
    builder.box(
      "paint",
      signColour,
      [1.2, 0.75, 0.05],
      [board[0], 1.2, board[2]],
      [0, 0.65, 0],
    );
    /* A bat, and its call's echo rings, painted on the board */
    builder.sphere(
      "paint",
      palette.cream,
      0.08,
      [board[0] + 0.03, 1.22, board[2] + 0.04],
      [1.6, 0.7, 0.3],
      6,
    );
    [0.16, 0.26, 0.36].forEach((ring) => {
      builder.add(
        "paint",
        "#e9c34a",
        new CylinderGeometry(ring, ring, 0.01, 12, 1, true, 0.6, 1.2)
          .rotateX(Math.PI / 2)
          .rotateY(0.65),
        { at: [board[0] + 0.05, 1.22, board[2] + 0.06] },
      );
    });
  }
};

/* Jungle round the hill */

const addFern = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string,
) => {
  if (builder.isFar) {
    builder.sphere(
      "matte",
      colour,
      0.5 * size,
      [at[0], 0.3 * size, at[2]],
      [1.3, 0.6, 1.3],
      6,
    );
    return;
  }
  const fronds = 5;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2 + size;
    builder.box(
      "matte",
      frond % 2 === 0 ? colour : shade(colour, 1.15),
      [0.22 * size, 0.02, 0.9 * size],
      [
        at[0] + Math.sin(angle) * 0.38 * size,
        0.28 * size,
        at[2] + Math.cos(angle) * 0.38 * size,
      ],
      [-0.55, angle, 0],
    );
  }
};

const addJungleTree = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
) => {
  const [x, , z] = at;
  addTaperedBar(
    builder,
    "#5e4630",
    [x, 0, z],
    [x + 0.2 * size, 4.2 * size, z],
    0.24 * size,
    0.12 * size,
    9,
  );
  const clumps: [number, number, number, number][] = builder.isFar
    ? [[0.2, 4.5, 0, 1.5]]
    : [
        [0.2, 4.6, 0, 1.3],
        [1.0, 4.2, 0.3, 0.95],
        [-0.7, 4.3, -0.2, 1.0],
        [0.0, 5.3, 0.3, 0.85],
      ];
  clumps.forEach(([dx, dy, dz, radius], index) => {
    builder.sphere(
      "matte",
      [leafDeep, leafMid, leafBright][index % 3],
      radius * size,
      [x + dx * size, dy * size, z + dz * size],
      [1, 0.75, 1],
      builder.isFar ? 10 : 9,
    );
  });
};

const buildJungle = (builder: AttractionBuilder) => {
  addJungleTree(builder, [-6.4, 0, -4.2], 1);
  addJungleTree(builder, [6.2, 0, -4.6], 1.1);
  const ferns: [number, number, number, string][] = [
    [-5.4, -1.8, 1, leafMid],
    [5.6, -1.2, 0.9, leafBright],
    [-4.4, -5.6, 1.1, leafDeep],
    [4.0, -6.3, 1, leafMid],
    [-2.4, 7.2, 0.8, leafBright],
    [4.9, 6.2, 0.9, leafMid],
    [-5.8, 0.6, 0.8, leafDeep],
    [6.3, 1.4, 0.7, leafMid],
  ];
  (builder.isFar ? ferns.slice(0, 4) : ferns).forEach(
    ([x, z, size, colour]) => {
      addFern(builder, [x, 0, z], size, colour);
    },
  );
  if (!builder.isFar) {
    /* Bright jungle flowers */
    const flowers: [number, number, string][] = [
      [-4.9, 1.9, "#e8457a"],
      [-4.6, 2.2, "#f2a33a"],
      [5.1, 0.4, "#e8457a"],
      [5.4, 0.8, "#f6e05a"],
      [-1.5, 7.6, "#f2a33a"],
      [3.2, 7.4, "#e8457a"],
    ];
    flowers.forEach(([x, z, colour]) => {
      builder.cylinder("matte", leafMid, {
        radius: 0.02,
        length: 0.5,
        at: [x, 0.25, z],
        segments: 4,
      });
      builder.sphere("paint", colour, 0.12, [x, 0.52, z], [1, 0.7, 1], 7);
    });
  }
};

/* The bats */

const addBatWing = (
  builder: AttractionBuilder,
  side: number,
  span: number,
  at: Triple,
  colour: string,
) => {
  const shape = new Shape();
  shape.moveTo(0, 0.06);
  shape.quadraticCurveTo(span * 0.5, 0.2, span, 0.08);
  shape.quadraticCurveTo(span * 0.86, -0.04, span * 0.78, -0.14);
  shape.quadraticCurveTo(span * 0.66, -0.06, span * 0.52, -0.16);
  shape.quadraticCurveTo(span * 0.4, -0.07, span * 0.26, -0.15);
  shape.quadraticCurveTo(span * 0.14, -0.06, 0, -0.1);
  shape.lineTo(0, 0.06);
  const wing = new ExtrudeGeometry(shape, {
    depth: 0.015,
    bevelEnabled: false,
    curveSegments: builder.segments(3, 1),
  });
  wing.rotateX(-Math.PI / 2);
  if (side < 0) {
    wing.scale(-1, 1, 1);
  }
  builder.add("matte", colour, wing, { at, rotation: [0, 0, side * 0.18] });
};

/** A bat in flight, facing local -z (the way an orbit carries it). */
const buildFlyingBat = (builder: AttractionBuilder) => {
  builder.sphere("matte", batBrown, 0.11, [0, 0, 0], [0.8, 0.75, 1.35], 8);
  builder.sphere("matte", batBrown, 0.08, [0, 0.03, -0.15], [1, 1, 1], 8);
  [-1, 1].forEach((side) => {
    addBatWing(builder, side, 0.5, [side * 0.05, 0.02, 0], batWing);
    if (!builder.isFar) {
      builder.cylinder("matte", batBrown, {
        radius: 0.03,
        radiusEnd: 0.005,
        length: 0.1,
        at: [side * 0.04, 0.12, -0.16],
        segments: 5,
      });
      builder.sphere(
        "glow",
        "#ffe08a",
        0.012,
        [side * 0.03, 0.05, -0.225],
        [1, 1, 1],
        5,
      );
    }
  });
};

/** A bat hanging upside down, wings wrapped round it, feet at y = 0. */
const addHangingBat = (builder: AttractionBuilder, at: Triple, size = 1) => {
  const [x, y, z] = at;
  builder.sphere(
    "matte",
    batWing,
    0.12 * size,
    [x, y - 0.17 * size, z],
    [0.85, 1.5, 0.8],
    builder.isFar ? 6 : 8,
  );
  builder.sphere(
    "matte",
    batBrown,
    0.07 * size,
    [x, y - 0.36 * size, z + 0.03 * size],
    [1, 1, 1],
    builder.isFar ? 5 : 7,
  );
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "matte",
    "#2a2420",
    [x - 0.03 * size, y, z],
    [x - 0.03 * size, y - 0.05 * size, z],
    0.015,
    4,
  );
  builder.bar(
    "matte",
    "#2a2420",
    [x + 0.03 * size, y, z],
    [x + 0.03 * size, y - 0.05 * size, z],
    0.015,
    4,
  );
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", batBrown, {
      radius: 0.025 * size,
      radiusEnd: 0.004,
      length: 0.08 * size,
      at: [x + side * 0.035 * size, y - 0.44 * size, z + 0.03 * size],
      segments: 5,
    });
  });
};

const roostPivot: Triple = [0.9, 3.38, cave.z - 1.2];

const buildRoost = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    darkRock,
    0.32,
    [0, 0.12, 0],
    [1.6, 0.5, 1.3],
    builder.isFar ? 8 : 12,
  );
  const bats: [number, number, number][] = [
    [0, 0, 0],
    [0.26, 0.04, 0.12],
    [-0.24, 0.03, 0.1],
    [0.12, 0.02, -0.24],
    [-0.16, 0.05, -0.22],
  ];
  (builder.isFar ? bats.slice(0, 3) : bats).forEach(([x, y, z], index) => {
    addHangingBat(
      builder,
      [x, y, z],
      index === 0 ? 1.15 : 0.9 + (index % 3) * 0.06,
    );
  });
};

const glowPivot: Triple = [cave.x, 3.2, cave.z];

const buildGlowWorms = (builder: AttractionBuilder) => {
  const count = builder.isFar ? 3 : 13;
  for (let index = 0; index < count; index++) {
    const angle = index * 2.399;
    const reach = 0.7 + ((index * 0.61) % 1) * 2.4;
    const ceiling = 3.5 - reach * 0.18 - 3.2;
    const x = Math.sin(angle) * reach;
    const z = Math.cos(angle) * reach;
    const drop = 0.12 + (index % 4) * 0.08;
    if (!builder.isFar) {
      builder.bar(
        "glass",
        "#dff7ff",
        [x, ceiling, z],
        [x, ceiling - drop, z],
        0.008,
        3,
      );
    }
    builder.sphere(
      "glow",
      index % 3 === 0 ? glowBlue : glowGreen,
      0.035,
      [x, ceiling - drop, z],
      [1, 1, 1],
      6,
    );
  }
};

const fruitBatPivot: Triple = [cave.x + 0.5, 2.62, cave.z - 3.15];

/** A big fruit bat, wings out, peeking over the top of the hill. */
const buildFruitBat = (builder: AttractionBuilder) => {
  builder.sphere("matte", fruitBatFur, 0.2, [0, 0.32, 0], [0.9, 1.3, 0.8], 12);
  builder.sphere("matte", fruitBatFur, 0.15, [0, 0.66, 0.04], [1, 1, 1], 12);
  builder.sphere(
    "matte",
    shade(fruitBatFur, 0.8),
    0.07,
    [0, 0.62, 0.17],
    [0.9, 0.8, 1.3],
    8,
  );
  [-1, 1].forEach((side) => {
    if (!builder.isFar) {
      builder.cylinder("matte", fruitBatFur, {
        radius: 0.05,
        radiusEnd: 0.008,
        length: 0.14,
        at: [side * 0.08, 0.82, 0.02],
        segments: 6,
      });
      builder.sphere(
        "paint",
        palette.black,
        0.025,
        [side * 0.06, 0.7, 0.15],
        [1, 1, 1],
        6,
      );
    }
    const wing = new Shape();
    wing.moveTo(0, 0.5);
    wing.quadraticCurveTo(0.35, 0.72, 0.72, 0.62);
    wing.quadraticCurveTo(0.66, 0.4, 0.6, 0.18);
    wing.quadraticCurveTo(0.48, 0.28, 0.4, 0.08);
    wing.quadraticCurveTo(0.26, 0.2, 0.12, 0.05);
    wing.lineTo(0, 0.1);
    wing.lineTo(0, 0.5);
    const geometry = new ExtrudeGeometry(wing, {
      depth: 0.02,
      bevelEnabled: false,
      curveSegments: builder.segments(5, 2),
    });
    if (side < 0) {
      geometry.scale(-1, 1, 1);
    }
    builder.add("matte", batWing, geometry, {
      at: [side * 0.1, 0, -0.04],
      rotation: [0, -side * 0.35, 0],
    });
  });
};

/* The explorers, with head torches */

const buildExplorer = (builder: AttractionBuilder) => {
  [-0.07, 0.07].forEach((side) => {
    builder.box("matte", "#3e4a5e", [0.09, 0.42, 0.1], [side, 0.21, 0]);
    if (!builder.isFar) {
      builder.box("matte", "#2a2420", [0.1, 0.07, 0.16], [side, 0.035, 0.03]);
    }
  });
  builder.cylinder("matte", "#e0703a", {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.4,
    at: [0, 0.62, 0],
    segments: 10,
  });
  builder.box("matte", "#4f7a3a", [0.22, 0.28, 0.1], [0, 0.64, -0.17]);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#e0703a",
      [side * 0.17, 0.78, 0],
      [side * 0.22, 0.5, 0.05],
      0.07,
      5,
    );
  });
  builder.sphere("matte", "#c98d63", 0.13, [0, 0.95, 0], [1, 1.05, 1], 10);
  builder.sphere("paint", "#f2c230", 0.14, [0, 1.0, 0], [1, 0.7, 1], 10);
  builder.cylinder("glow", palette.warmLight, {
    radius: 0.035,
    length: 0.04,
    at: [0, 1.02, 0.13],
    axis: "z",
    segments: 8,
  });
};

/* The ride through the bat tunnel */

const tunnelStart = { x: 6.1, z: cave.z };
const tunnelFinish = { x: 0.9, z: 5.1 };
const tunnelPath: Triple[] = [
  [tunnelStart.x, 0, tunnelStart.z],
  [5.0, 0, cave.z],
  [3.7, 0, cave.z + 0.1],
  [2.6, 0, cave.z - 1.1],
  [1.0, 0, cave.z - 2.4],
  [-0.4, 0, cave.z - 2.2],
  [-0.9, 0, cave.z - 0.6],
  [-0.3, 0, cave.z + 1.4],
  [0.4, 0, cave.z + 3.4],
  [0.7, 0, cave.z + 5.0],
  [tunnelFinish.x, 0, tunnelFinish.z],
];

const followPath =
  (points: readonly Triple[]) =>
  (progress: number): LocalSpot => {
    const lengths = points
      .slice(1)
      .map((point, index) =>
        Math.hypot(point[0] - points[index][0], point[2] - points[index][2]),
      );
    const total = lengths.reduce((sum, length) => sum + length, 0);
    let left = Math.min(1, Math.max(0, progress)) * total;
    for (let index = 0; index < lengths.length; index++) {
      const [fromX, fromY, fromZ] = points[index];
      const [toX, toY, toZ] = points[index + 1];
      if (left <= lengths[index] || index === lengths.length - 1) {
        const share =
          lengths[index] > 0 ? Math.min(1, left / lengths[index]) : 1;
        return {
          x: fromX + (toX - fromX) * share,
          y: fromY + (toY - fromY) * share,
          z: fromZ + (toZ - fromZ) * share,
          heading: Math.atan2(toX - fromX, toZ - fromZ),
        };
      }
      left -= lengths[index];
    }
    const [x, y, z] = points[points.length - 1];
    return { x, y, z, heading: 0 };
  };

export const batCaveModel: NewLandAttractionModel = {
  kind: "bat-cave",
  islandId: "jungle-reach",
  name: "Bat Cave",
  fact: "Bats find their way in the dark using echoes. A bat calls out squeaks so high that people cannot hear them, and the sound bounces back off insects, trees and cave walls. Sound travels through the air as vibrations, and by listening to the echoes a bat can tell where things are and catch a moth in mid-air.",
  curriculumLink:
    "Science, Year 4: sound. Identify how sounds are made, associating some of them with something vibrating, and recognise that vibrations from sounds travel through a medium to the ear (bats hear the echoes of their own calls).",
  footprint: 9,
  setting: "inland",
  signSpot: { x: 2.6, z: 7.9 },
  build: (builder) => {
    buildHill(builder);
    buildMushrooms(builder);
    buildStream(builder);
    buildTunnelMouth(builder);
    buildEntrance(builder);
    buildJungle(builder);
    addSignBoard(builder, [2.6, 0, 7.1], signColour, -0.2);
  },
  moving: [
    {
      name: "bats flying round the hill",
      pivot: [cave.x, 4.7, cave.z],
      build: buildFlyingBat,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 3.3,
        count: 4,
        speed: 0.9,
        isFacingAlong: true,
        bob: 0.3,
      },
    },
    {
      name: "roosting bats",
      pivot: roostPivot,
      build: buildRoost,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 5,
        amplitude: 0.16,
        period: 1.6,
      },
    },
    {
      name: "glow-worms",
      pivot: glowPivot,
      build: buildGlowWorms,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "fruit bat",
      pivot: fruitBatPivot,
      build: buildFruitBat,
      motion: { kind: "rise", reach: 7, height: 1.25, period: 2.4 },
    },
  ],
  wanderers: [
    {
      name: "cave explorers",
      build: buildExplorer,
      count: 3,
      centre: { x: 2.4, z: 5.6 },
      radius: 1.6,
      speed: 0.5,
    },
  ],
  rides: [
    {
      id: "bat-tunnel",
      name: "the bat tunnel",
      start: tunnelStart,
      reach: 0.6,
      seconds: 16,
      finish: tunnelFinish,
      follow: followPath(tunnelPath),
    },
  ],
  play: {
    label: "Clap for an echo",
    news: "Clap... clap... clap! Your clap bounced off the cave walls and came back as an echo, just like a bat's squeak.",
    tune: [79, 79, 79],
  },
};
