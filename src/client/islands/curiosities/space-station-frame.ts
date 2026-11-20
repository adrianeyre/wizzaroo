import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const frameSilver = "#c9d0dc";
const frameDark = "#6a7488";
const walkwayNavy = "#26306a";
const moduleWhite = "#eef0f4";
const moduleBand = "#b9c0cc";
const panelBlue = "#2a4ab8";
const panelGold = "#d8b04a";
const holdColours = ["#f2a23a", "#5ee07a", "#e8d84a", "#ef5a8a", "#6ab8ff"];
const softFall = "#3a4a9a";
const capsuleWhite = "#f4f4f6";
const heatShield = "#3a3030";
const signColour = "#2c3a86";

/* The truss runs along x above the modules, which run along z. */
const truss = { z: -0.4, bottom: 1.85, top: 2.2, half: 2.9, width: 0.4 };
const trussMiddleY = (truss.bottom + truss.top) / 2;
const legXs = [-2.3, -0.9, 0.9, 2.3];
const moduleY = 0.95;
const moduleRadius = 0.42;
const moduleFront = 1.35;
const moduleBack = -1.9;
const capsuleRest: Triple = [0, 0.3, moduleFront + 0.65];
const capsuleLift = moduleY - capsuleRest[1];
const ladder = { x: -1.6, footZ: 0.65 };
const pole = { x: 1.6, z: 0.15 };
const rideStart: LocalPoint = { x: ladder.x, z: ladder.footZ + 0.3 };
const rideFinish: LocalPoint = { x: pole.x, z: pole.z + 0.85 };

const buildSoftFall = (builder: AttractionBuilder) => {
  builder.cylinder("matte", softFall, {
    radius: 3.3,
    length: 0.04,
    at: [0, 0.02, -0.3],
    segments: builder.isFar ? 16 : 40,
  });
  if (builder.isFar) {
    return;
  }
  /* Painted stars on the soft-fall */
  [
    [-2.4, 1.4],
    [2.2, 1.6],
    [-0.8, 2.1],
    [2.7, -1.8],
    [-2.6, -1.9],
  ].forEach(([x, z]) => {
    builder.cylinder("paint", "#ffe27a", {
      radius: 0.14,
      length: 0.01,
      at: [x, 0.045, z],
      segments: 5,
    });
  });
};

const buildTruss = (builder: AttractionBuilder) => {
  const { z, bottom, top, half, width } = truss;
  if (builder.isFar) {
    builder.box(
      "metal",
      frameSilver,
      [half * 2, top - bottom, width],
      [0, trussMiddleY, z],
    );
    legXs.forEach((x) => {
      builder.box("metal", frameDark, [0.1, bottom, 0.1], [x, bottom / 2, z]);
    });
    return;
  }
  /* Four long chords at the corners */
  [bottom, top].forEach((y) => {
    [z - width / 2, z + width / 2].forEach((chordZ) => {
      builder.bar(
        "metal",
        frameSilver,
        [-half, y, chordZ],
        [half, y, chordZ],
        0.07,
        8,
      );
    });
  });
  /* Bays of crossed bracing */
  const bays = 12;
  for (let bay = 0; bay <= bays; bay++) {
    const x = -half + (bay / bays) * half * 2;
    builder.bar(
      "metal",
      frameDark,
      [x, bottom, z - width / 2],
      [x, top, z - width / 2],
      0.045,
      4,
    );
    builder.bar(
      "metal",
      frameDark,
      [x, bottom, z + width / 2],
      [x, top, z + width / 2],
      0.045,
      4,
    );
    builder.bar(
      "metal",
      frameDark,
      [x, bottom, z - width / 2],
      [x, bottom, z + width / 2],
      0.045,
      4,
    );
    if (bay === bays) {
      continue;
    }
    const next = x + (half * 2) / bays;
    [z - width / 2, z + width / 2].forEach((faceZ) => {
      builder.bar(
        "metal",
        frameSilver,
        [x, bottom, faceZ],
        [next, top, faceZ],
        0.035,
        4,
      );
    });
  }
  /* A grippy walkway on top, with a rail at the back */
  builder.box(
    "paint",
    walkwayNavy,
    [half * 2 - 0.2, 0.05, width + 0.1],
    [0, top + 0.05, z],
  );
  for (let dot = 0; dot < 14; dot++) {
    builder.box(
      "paint",
      shade(walkwayNavy, 1.5),
      [0.18, 0.012, 0.3],
      [-2.4 + dot * 0.37, top + 0.08, z],
    );
  }
  builder.bar(
    "paint",
    holdColours[0],
    [-half + 0.2, top + 0.65, z - width / 2 - 0.02],
    [half - 0.2, top + 0.65, z - width / 2 - 0.02],
    0.05,
    6,
  );
  for (let post = 0; post < 7; post++) {
    const x = -half + 0.2 + post * ((half * 2 - 0.4) / 6);
    builder.bar(
      "paint",
      holdColours[0],
      [x, top + 0.05, z - width / 2 - 0.02],
      [x, top + 0.65, z - width / 2 - 0.02],
      0.045,
      6,
    );
  }
  /* A-frame legs, padded at the foot */
  legXs.forEach((x) => {
    [-0.55, 0.55].forEach((spread) => {
      builder.bar(
        "paint",
        frameDark,
        [x, 0.05, z + spread],
        [x, bottom, z + spread * 0.25],
        0.09,
        8,
      );
      builder.cylinder("paint", softFall, {
        radius: 0.11,
        length: 0.4,
        at: [x, 0.25, z + spread * 0.95],
        segments: 10,
      });
    });
    builder.bar(
      "paint",
      frameDark,
      [x, 0.9, z - 0.38],
      [x, 0.9, z + 0.38],
      0.06,
      6,
    );
  });
};

/** One solar wing: blue panels either side of a mast, which turns to face the Sun. */
const buildSolarWing = (builder: AttractionBuilder, side: number) => {
  builder.cylinder("metal", frameSilver, {
    radius: 0.09,
    length: 0.3,
    at: [side * 0.15, 0, 0],
    axis: "x",
    segments: 12,
  });
  builder.bar(
    "metal",
    frameDark,
    [side * 0.3, 0, -1.75],
    [side * 0.3, 0, 1.75],
    0.05,
    6,
  );
  [-1, 1].forEach((end) => {
    [0.12, 0.62].forEach((offset) => {
      const x = side * (0.3 + offset + 0.0);
      const z = end * 1.0;
      builder.box("glass", panelBlue, [0.42, 0.025, 1.4], [x, 0, z]);
      /* Gold frame and cell lines */
      builder.box(
        "metal",
        panelGold,
        [0.44, 0.03, 0.03],
        [x, 0, z - end * 0.7],
      );
      builder.box(
        "metal",
        panelGold,
        [0.44, 0.03, 0.03],
        [x, 0, z + end * 0.7],
      );
      for (let line = 1; line < 5; line++) {
        builder.box(
          "metal",
          shade(panelBlue, 1.5),
          [0.42, 0.03, 0.012],
          [x, 0, z - 0.7 + line * 0.28],
        );
      }
      builder.box(
        "metal",
        shade(panelBlue, 1.5),
        [0.012, 0.03, 1.4],
        [x, 0, z],
      );
    });
  });
};

const buildModules = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 12 : 22;
  const length = moduleFront - moduleBack;
  builder.cylinder("paint", moduleWhite, {
    radius: moduleRadius,
    length,
    at: [0, moduleY, (moduleFront + moduleBack) / 2],
    axis: "z",
    segments,
  });
  if (builder.isFar) {
    return;
  }
  /* Bands where the modules join, and hatch rings */
  [moduleBack + 0.05, -0.8, 0.3, moduleFront - 0.05].forEach((z) => {
    builder.cylinder("metal", moduleBand, {
      radius: moduleRadius + 0.03,
      length: 0.1,
      at: [0, moduleY, z],
      axis: "z",
      segments,
    });
  });
  /* Round end caps */
  builder.sphere(
    "paint",
    moduleWhite,
    moduleRadius,
    [0, moduleY, moduleBack],
    [1, 1, 0.5],
    18,
  );
  /* The docking port at the front, with a target */
  builder.cylinder("metal", moduleBand, {
    radius: 0.28,
    length: 0.2,
    at: [0, moduleY, moduleFront + 0.1],
    axis: "z",
    segments: 18,
  });
  builder.torus(
    "paint",
    holdColours[0],
    0.26,
    0.03,
    [0, moduleY, moduleFront + 0.2],
    "z",
    18,
  );
  builder.box(
    "paint",
    palette.black,
    [0.03, 0.18, 0.01],
    [0, moduleY, moduleFront + 0.21],
  );
  builder.box(
    "paint",
    palette.black,
    [0.18, 0.03, 0.01],
    [0, moduleY, moduleFront + 0.21],
  );
  /* Portholes down both sides */
  [-1, 1].forEach((sideX) => {
    [-1.4, -0.3, 0.8].forEach((z) => {
      builder.cylinder("glass", "#8fb8ff", {
        radius: 0.08,
        length: 0.03,
        at: [sideX * moduleRadius, moduleY + 0.1, z],
        axis: "x",
        segments: 12,
      });
      builder.torus(
        "metal",
        moduleBand,
        0.085,
        0.015,
        [sideX * (moduleRadius + 0.005), moduleY + 0.1, z],
        "x",
        12,
      );
    });
  });
  /* The Cupola: a domed window to look down at Earth */
  builder.cylinder("metal", moduleBand, {
    radius: 0.24,
    length: 0.14,
    at: [0, moduleY - moduleRadius - 0.02, -0.25],
    segments: 8,
  });
  builder.sphere(
    "glass",
    "#8fb8ff",
    0.2,
    [0, moduleY - moduleRadius - 0.1, -0.25],
    [1, 0.7, 1],
    10,
  );
  /* Legs holding the modules up */
  [moduleBack + 0.4, moduleFront - 0.4].forEach((z) => {
    [-1, 1].forEach((sideX) => {
      builder.bar(
        "paint",
        frameDark,
        [sideX * 0.45, 0.04, z],
        [sideX * 0.2, moduleY - 0.3, z],
        0.07,
        6,
      );
    });
  });
  /* Little flags of the partner countries */
  ["#3a6ad8", "#d8453a", "#f2f2f2", "#e8c23a"].forEach((colour, index) => {
    builder.box(
      "paint",
      colour,
      [0.02, 0.1, 0.16],
      [moduleRadius + 0.005, moduleY + 0.28, -1.1 + index * 0.2],
    );
  });
};

const buildRadiatorsAndArm = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* White radiator panels hanging below the truss */
  [-2.6, 2.6].forEach((x) => {
    builder.bar(
      "metal",
      frameDark,
      [x, truss.bottom, truss.z],
      [x, truss.bottom - 0.25, truss.z],
      0.04,
      4,
    );
    builder.box(
      "paint",
      palette.white,
      [0.7, 0.03, 0.5],
      [x, truss.bottom - 0.27, truss.z + 0.0],
      [0.25, 0, 0],
    );
    for (let line = 0; line < 4; line++) {
      builder.box(
        "paint",
        moduleBand,
        [0.02, 0.035, 0.5],
        [x - 0.27 + line * 0.18, truss.bottom - 0.27, truss.z],
        [0.25, 0, 0],
      );
    }
  });
  /* The robot arm folded on the truss, with its elbow joint */
  const shoulder: Triple = [1.95, truss.top + 0.12, truss.z - 0.1];
  const elbow: Triple = [2.4, truss.top + 0.75, truss.z - 0.1];
  const hand: Triple = [2.8, truss.top + 0.25, truss.z - 0.1];
  builder.bar("paint", palette.white, shoulder, elbow, 0.1, 10);
  builder.bar("paint", palette.white, elbow, hand, 0.09, 10);
  [shoulder, elbow, hand].forEach((joint) => {
    builder.sphere("metal", frameDark, 0.08, joint, [1, 1, 1], 10);
  });
};

/** A climbing ladder up to the truss, and a fire pole down the other end. */
const buildLadderAndPole = (builder: AttractionBuilder) => {
  const topZ = truss.z + truss.width / 2 + 0.05;
  [-0.25, 0.25].forEach((dx) => {
    builder.bar(
      "paint",
      holdColours[1],
      [ladder.x + dx, 0.04, ladder.footZ],
      [ladder.x + dx, truss.top + 0.6, topZ],
      0.06,
      builder.isFar ? 4 : 8,
    );
  });
  builder.bar(
    "metal",
    frameSilver,
    [pole.x, 0.04, pole.z],
    [pole.x, truss.top + 0.7, pole.z],
    0.07,
    builder.isFar ? 4 : 10,
  );
  if (builder.isFar) {
    return;
  }
  const rungs = 9;
  for (let rung = 1; rung <= rungs; rung++) {
    const share = rung / (rungs + 1);
    builder.bar(
      "paint",
      holdColours[2],
      [
        ladder.x - 0.25,
        share * (truss.top + 0.05),
        ladder.footZ + (topZ - ladder.footZ) * share,
      ],
      [
        ladder.x + 0.25,
        share * (truss.top + 0.05),
        ladder.footZ + (topZ - ladder.footZ) * share,
      ],
      0.04,
      6,
    );
  }
  builder.bar(
    "metal",
    frameSilver,
    [pole.x, truss.top + 0.7, pole.z],
    [pole.x, truss.top + 0.7, truss.z],
    0.06,
    6,
  );
  /* A climbing wall on the end leg, studded with holds */
  const wallX = -2.3;
  builder.box(
    "paint",
    walkwayNavy,
    [0.06, 1.6, 0.9],
    [wallX - 0.05, 1.0, truss.z],
  );
  for (let hold = 0; hold < 12; hold++) {
    builder.sphere(
      "paint",
      holdColours[hold % holdColours.length],
      0.06,
      [
        wallX - 0.1,
        0.35 + (hold % 6) * 0.25,
        truss.z - 0.3 + Math.floor(hold / 6) * 0.45 + (hold % 2) * 0.12,
      ],
      [0.6, 1, 1.2],
      6,
    );
  }
};

/** A little crew capsule, nose towards the docking port (-z). */
const buildCapsule = (builder: AttractionBuilder) => {
  builder.lathe(
    "paint",
    capsuleWhite,
    [
      [0, 0.45],
      [0.38, 0.42],
      [0.4, 0.3],
      [0.3, -0.12],
      [0.14, -0.3],
      [0.14, -0.4],
      [0, -0.4],
    ],
    [0, 0, 0],
    "z",
    18,
  );
  builder.cylinder("paint", heatShield, {
    radius: 0.39,
    length: 0.06,
    at: [0, 0, 0.45],
    axis: "z",
    segments: 18,
  });
  builder.torus("metal", moduleBand, 0.15, 0.03, [0, 0, -0.4], "z", 14);
  [-1, 1].forEach((side) => {
    builder.cylinder("glass", "#8fb8ff", {
      radius: 0.06,
      length: 0.03,
      at: [side * 0.24, 0.12, 0.0],
      axis: "x",
      segments: 10,
    });
  });
  builder.box("paint", holdColours[0], [0.5, 0.06, 0.01], [0, -0.05, 0.2]);
};

const buildCradle = (builder: AttractionBuilder) => {
  const [x, , z] = capsuleRest;
  if (builder.isFar) {
    builder.cylinder("paint", capsuleWhite, {
      radius: 0.38,
      length: 0.8,
      at: capsuleRest,
      axis: "z",
      segments: 8,
    });
    return;
  }
  builder.box("paint", frameDark, [0.8, 0.06, 0.9], [x, 0.06, z + 0.05]);
  [-0.3, 0.3].forEach((dz) => {
    builder.box("paint", holdColours[0], [0.7, 0.08, 0.08], [x, 0.12, z + dz]);
  });
};

/** Up the ladder, along the truss, and down the pole. */
const climbRide = (progress: number): LocalSpot => {
  const walkY = truss.top + 0.08;
  const topZ = truss.z + 0.02;
  if (progress < 0.35) {
    const share = progress / 0.35;
    return {
      x: ladder.x,
      y: share * walkY,
      z: rideStart.z + (topZ - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.8) {
    const share = (progress - 0.35) / 0.45;
    return {
      x: ladder.x + (pole.x - ladder.x) * share,
      y: walkY,
      z: topZ,
      heading: Math.PI / 2,
    };
  }
  const share = (progress - 0.8) / 0.2;
  const fall = share * share;
  return {
    x: pole.x,
    y: walkY * (1 - fall),
    z: topZ + (rideFinish.z - topZ) * share,
    heading: 0,
  };
};

export const spaceStationFrameModel: CuriosityModel = {
  kind: "space-station-frame",
  islandId: "starfall-isle",
  name: "Space Station Climbing Frame",
  fact: "The International Space Station orbits the Earth about 400 kilometres up, going all the way round about every 90 minutes. Its long metal backbone is a truss: a frame of triangles, which makes it strong and stiff without being heavy. Big blue solar panels turn to face the Sun and make electricity, and spacecraft dock at its ports to bring astronauts and supplies.",
  curriculumLink:
    "Design and technology, Key Stage 2: apply their understanding of how to strengthen, stiffen and reinforce more complex structures.",
  footprint: 5.0,
  setting: "inland",
  signSpot: { x: -1.8, z: 3.9 },
  build: (builder) => {
    buildSoftFall(builder);
    buildTruss(builder);
    buildModules(builder);
    buildRadiatorsAndArm(builder);
    buildLadderAndPole(builder);
    buildCradle(builder);
    if (builder.isFar) {
      [-1, 1].forEach((side) => {
        builder.box(
          "glass",
          panelBlue,
          [0.95, 0.03, 3.4],
          [side * (truss.half + 0.75), trussMiddleY, truss.z],
        );
      });
    }
    addSignBoard(builder, [-1.8, 0, 3.9], signColour);
  },
  moving: [
    {
      name: "left solar wing",
      pivot: [-truss.half, trussMiddleY, truss.z],
      build: (builder) => {
        buildSolarWing(builder, -1);
      },
      motion: { kind: "nod", axis: "x", reach: 8, amplitude: 0.6, period: 4 },
    },
    {
      name: "right solar wing",
      pivot: [truss.half, trussMiddleY, truss.z],
      build: (builder) => {
        buildSolarWing(builder, 1);
      },
      motion: {
        kind: "nod",
        axis: "x",
        reach: 8,
        amplitude: 0.6,
        period: 4,
        phase: 0.4,
      },
    },
    {
      name: "capsule",
      pivot: capsuleRest,
      build: buildCapsule,
      motion: { kind: "rise", reach: 5, height: capsuleLift, period: 3 },
    },
  ],
  rides: [
    {
      id: "station-climb",
      name: "the space station climb",
      start: rideStart,
      reach: 0.55,
      seconds: 9,
      finish: rideFinish,
      follow: climbRide,
    },
  ],
  blockers: [
    ...legXs.map((x) => ({ x, z: truss.z, radius: 0.5 })),
    ...listWallBlockers(
      { x: 0, z: moduleBack },
      { x: 0, z: moduleFront },
      0.5,
      0.6,
    ),
    { x: 0, z: capsuleRest[2], radius: 0.5 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Dock the capsule",
    news: "Clunk! The capsule lined up with the docking port, latched on tight, and the astronauts floated aboard the space station.",
    tune: [67, 72, 76, 79, 84],
  },
};
