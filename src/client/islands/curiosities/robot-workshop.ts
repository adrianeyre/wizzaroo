import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const floorGrey = "#8a8ea0";
const wallNavy = "#2a3366";
const roofSilver = "#c9d0dc";
const postDark = "#4a5266";
const armOrange = "#f08a2a";
const jointViolet = "#6a4ab8";
const pegboard = "#c9a878";
const toolSteel = "#9aa3ad";
const robotWhite = "#eef1f6";
const robotBlue = "#4a7ad8";
const eyeGlow = "#7fe9ff";
const screenDark = "#141a33";
const cardboard = "#c9955a";
const belt = "#2a2d3a";
const blockColours = ["#f2c230", "#4a8ad8", "#9a5ad8", "#4ab86a", "#f28a3a"];
const signColour = "#2f3c88";

/* An open-fronted workshop: a back wall, a flat roof on posts. */
const shop = { minX: -2.7, maxX: 2.7, back: -2.6, front: 0.9, height: 2.75 };
const conveyor = { x: -0.95, z: -0.8, radius: 0.85, height: 0.75 };
const armBase: Triple = [conveyor.x, conveyor.height + 0.1, conveyor.z];
const robot = { x: 1.55, z: -0.5 };
const cogAt: Triple = [-2.2, 1.9, shop.back + 0.12];
const screen = { x: 1.0, y: 1.6, width: 1.7, height: 1.05 };

const buildShell = (builder: AttractionBuilder) => {
  const width = shop.maxX - shop.minX;
  const depth = shop.front - shop.back;
  const middleZ = (shop.front + shop.back) / 2;
  builder.box("matte", floorGrey, [width, 0.04, depth], [0, 0.02, middleZ]);
  builder.box(
    "paint",
    wallNavy,
    [width, shop.height, 0.16],
    [0, shop.height / 2, shop.back],
  );
  builder.box(
    "metal",
    roofSilver,
    [width + 0.4, 0.14, depth + 0.5],
    [0, shop.height + 0.07, middleZ + 0.1],
  );
  [shop.minX + 0.08, shop.maxX - 0.08].forEach((x) => {
    builder.box(
      "paint",
      postDark,
      [0.14, shop.height, 0.14],
      [x, shop.height / 2, shop.front],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Yellow safety lines on the floor and a fascia with lights */
  [shop.minX + 0.2, shop.maxX - 0.2].forEach((x) => {
    builder.box(
      "paint",
      "#f2c230",
      [0.08, 0.006, depth - 0.4],
      [x, 0.043, middleZ],
    );
  });
  builder.box(
    "paint",
    "#f2c230",
    [width - 0.4, 0.006, 0.08],
    [0, 0.043, shop.front - 0.2],
  );
  builder.box(
    "paint",
    wallNavy,
    [width + 0.42, 0.22, 0.06],
    [0, shop.height - 0.02, shop.front + 0.35],
  );
  for (let light = 0; light < 7; light++) {
    builder.sphere(
      "glow",
      light % 2 === 0 ? eyeGlow : "#c79bff",
      0.05,
      [-2.4 + light * 0.8, shop.height - 0.02, shop.front + 0.39],
      [1, 1, 0.5],
      6,
    );
  }
  /* Panel lines on the wall, and lamps hanging under the roof */
  for (let panel = 1; panel < 6; panel++) {
    builder.box(
      "paint",
      shade(wallNavy, 0.8),
      [0.03, shop.height, 0.01],
      [shop.minX + panel * 0.9, shop.height / 2, shop.back + 0.085],
    );
  }
  [-1.2, 1.2].forEach((x) => {
    builder.bar(
      "metal",
      postDark,
      [x, shop.height, -0.8],
      [x, shop.height - 0.45, -0.8],
      0.02,
      3,
    );
    builder.cylinder("metal", roofSilver, {
      radius: 0.2,
      radiusEnd: 0.05,
      length: 0.15,
      at: [x, shop.height - 0.5, -0.8],
      segments: 12,
    });
    builder.box(
      "glow",
      palette.warmLight,
      [0.5, 0.02, 0.12],
      [x, shop.height - 0.585, -0.8],
    );
  });
};

const buildToolBoards = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const face = shop.back + 0.09;
  const boardX = -0.9;
  builder.box("matte", pegboard, [1.6, 1.0, 0.03], [boardX, 1.6, face]);
  /* Peg holes */
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 8; column++) {
      if ((row + column) % 2 === 0) {
        builder.box(
          "matte",
          shade(pegboard, 0.6),
          [0.025, 0.025, 0.005],
          [boardX - 0.7 + column * 0.2, 1.2 + row * 0.2, face + 0.016],
        );
      }
    }
  }
  /* Spanners, a hammer, screwdrivers and pliers */
  [-0.6, -0.42].forEach((x, index) => {
    builder.box(
      "metal",
      toolSteel,
      [0.04, 0.4 - index * 0.08, 0.02],
      [boardX + x, 1.65, face + 0.03],
    );
    builder.torus(
      "metal",
      toolSteel,
      0.045,
      0.015,
      [boardX + x, 1.88 - index * 0.04, face + 0.03],
      "z",
      10,
    );
  });
  builder.box(
    "matte",
    palette.timber,
    [0.04, 0.4, 0.03],
    [boardX - 0.15, 1.6, face + 0.03],
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.2, 0.08, 0.05],
    [boardX - 0.15, 1.82, face + 0.04],
  );
  ["#d8453a", "#f2c230", "#4a8ad8"].forEach((colour, index) => {
    const x = boardX + 0.12 + index * 0.13;
    builder.cylinder("paint", colour, {
      radius: 0.03,
      length: 0.14,
      at: [x, 1.75, face + 0.035],
      segments: 8,
    });
    builder.cylinder("metal", toolSteel, {
      radius: 0.008,
      length: 0.2,
      at: [x, 1.58, face + 0.035],
      segments: 4,
    });
  });
  builder.bar(
    "metal",
    toolSteel,
    [boardX + 0.55, 1.85, face + 0.03],
    [boardX + 0.6, 1.45, face + 0.03],
    0.025,
    4,
  );
  builder.bar(
    "metal",
    toolSteel,
    [boardX + 0.65, 1.85, face + 0.03],
    [boardX + 0.6, 1.45, face + 0.03],
    0.025,
    4,
  );
  /* A shelf of spare robot parts */
  builder.box(
    "matte",
    palette.paleTimber,
    [1.2, 0.05, 0.3],
    [-2.0, 0.95, shop.back + 0.24],
  );
  (
    [
      [-2.4, robotBlue],
      [-2.05, armOrange],
      [-1.7, robotWhite],
    ] satisfies [number, string][]
  ).forEach(([x, colour], index) => {
    if (index === 1) {
      builder.cylinder("paint", colour, {
        radius: 0.1,
        length: 0.06,
        at: [x, 1.05, shop.back + 0.24],
        axis: "z",
        segments: 14,
      });
    } else {
      builder.sphere(
        "paint",
        colour,
        0.09,
        [x, 1.06, shop.back + 0.24],
        [1, 1, 1],
        10,
      );
    }
  });
};

/** The big screen: a program built from coloured code blocks. */
const buildScreen = (builder: AttractionBuilder) => {
  const face = shop.back + 0.09;
  builder.box(
    "paint",
    postDark,
    [screen.width + 0.12, screen.height + 0.12, 0.06],
    [screen.x, screen.y, face],
  );
  builder.box(
    "glow",
    screenDark,
    [screen.width, screen.height, 0.02],
    [screen.x, screen.y, face + 0.035],
  );
  if (builder.isFar) {
    return;
  }
  /* when started, repeat 4 [move, turn, grab], beep */
  const blocks: [number, number, number][] = [
    [0, 0.5, 0],
    [1, 0.42, 0],
    [2, 0.36, 1],
    [3, 0.4, 1],
    [4, 0.3, 1],
    [1, 0.08, 0],
    [0, 0.3, 0],
  ];
  blocks.forEach(([colour, width, indent], row) => {
    const left = screen.x - screen.width / 2 + 0.12 + indent * 0.12;
    builder.box(
      "glow",
      blockColours[colour],
      [width, 0.1, 0.01],
      [
        left + width / 2,
        screen.y + screen.height / 2 - 0.12 - row * 0.125,
        face + 0.05,
      ],
    );
    builder.box(
      "glow",
      shade(blockColours[colour], 0.6),
      [0.06, 0.03, 0.012],
      [
        left + 0.08,
        screen.y + screen.height / 2 - 0.08 - row * 0.125,
        face + 0.05,
      ],
    );
  });
  /* The repeat block's arm */
  builder.box(
    "glow",
    blockColours[1],
    [0.08, 0.38, 0.01],
    [
      screen.x - screen.width / 2 + 0.16,
      screen.y + screen.height / 2 - 0.42,
      face + 0.05,
    ],
  );
  /* A little robot map on the right of the screen */
  builder.box(
    "glow",
    "#2a3a6a",
    [0.55, 0.55, 0.012],
    [screen.x + 0.5, screen.y - 0.05, face + 0.05],
  );
  for (let step = 0; step < 4; step++) {
    builder.box(
      "glow",
      eyeGlow,
      [0.05, 0.05, 0.014],
      [
        screen.x + 0.32 + (step % 2) * 0.36,
        screen.y + 0.13 - Math.floor(step / 2) * 0.36,
        face + 0.055,
      ],
    );
  }
};

const buildConveyor = (builder: AttractionBuilder) => {
  const { x, z, radius, height } = conveyor;
  builder.cylinder("paint", postDark, {
    radius: radius + 0.2,
    length: 0.12,
    at: [x, height - 0.06, z],
    segments: builder.isFar ? 12 : 32,
  });
  if (builder.isFar) {
    builder.cylinder("paint", postDark, {
      radius: radius * 0.6,
      length: height - 0.12,
      at: [x, (height - 0.12) / 2, z],
      segments: 8,
    });
    return;
  }
  /* The belt: a dark ring with slats, on legs */
  builder.torus("matte", belt, radius, 0.14, [x, height + 0.01, z], "y", 36);
  for (let slat = 0; slat < 24; slat++) {
    const angle = (slat / 24) * Math.PI * 2;
    builder.box(
      "metal",
      toolSteel,
      [0.3, 0.02, 0.03],
      [
        x + Math.sin(angle) * radius,
        height + 0.1,
        z + Math.cos(angle) * radius,
      ],
      [0, angle + Math.PI / 2, 0],
    );
  }
  for (let leg = 0; leg < 4; leg++) {
    const angle = (leg / 4) * Math.PI * 2 + Math.PI / 4;
    builder.box(
      "paint",
      postDark,
      [0.08, height - 0.12, 0.08],
      [
        x + Math.sin(angle) * (radius + 0.05),
        (height - 0.12) / 2,
        z + Math.cos(angle) * (radius + 0.05),
      ],
    );
  }
  /* The arm's pedestal in the middle */
  builder.cylinder("metal", toolSteel, {
    radius: 0.24,
    radiusEnd: 0.2,
    length: 0.2,
    at: [x, height + 0.0, z],
    segments: 16,
  });
  builder.cylinder("paint", "#f2c230", {
    radius: 0.28,
    length: 0.04,
    at: [x, height - 0.1, z],
    segments: 16,
  });
  /* A crate of finished parcels beside it */
  builder.box(
    "matte",
    palette.timber,
    [0.6, 0.35, 0.45],
    [x - 1.3, 0.175, z + 0.6],
  );
  [-0.12, 0.14].forEach((dx) => {
    builder.box(
      "matte",
      cardboard,
      [0.22, 0.18, 0.2],
      [x - 1.3 + dx, 0.44, z + 0.6],
    );
  });
};

/** The robot arm, which sweeps to and fro over the belt. */
const buildArm = (builder: AttractionBuilder) => {
  builder.cylinder("paint", armOrange, {
    radius: 0.18,
    length: 0.16,
    at: [0, 0.08, 0],
    segments: 18,
  });
  const shoulder: Triple = [0, 0.22, 0];
  const elbow: Triple = [0, 0.85, 0.25];
  const wrist: Triple = [0, 0.55, 0.78];
  builder.sphere("paint", jointViolet, 0.12, shoulder, [1, 1, 1], 14);
  builder.bar("paint", armOrange, shoulder, elbow, 0.15, 12);
  builder.sphere("paint", jointViolet, 0.1, elbow, [1, 1, 1], 12);
  builder.bar("paint", armOrange, elbow, wrist, 0.12, 12);
  builder.sphere("paint", jointViolet, 0.08, wrist, [1, 1, 1], 12);
  /* Cables along the arm */
  builder.bar(
    "paint",
    palette.black,
    [0.09, 0.28, 0.02],
    [0.08, 0.82, 0.22],
    0.025,
    4,
  );
  builder.bar(
    "paint",
    palette.black,
    [0.07, 0.82, 0.3],
    [0.06, 0.56, 0.72],
    0.025,
    4,
  );
  /* The gripper */
  builder.cylinder("metal", toolSteel, {
    radius: 0.06,
    length: 0.12,
    at: [wrist[0], wrist[1] - 0.1, wrist[2]],
    segments: 10,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.03, 0.16, 0.06],
      [side * 0.06, wrist[1] - 0.24, wrist[2]],
      [0, 0, side * 0.2],
    );
  });
  builder.sphere("glow", "#5ee07a", 0.025, [0, 0.28, 0.15], [1, 1, 1], 6);
};

/** A large cog on the wall, turning faster when someone is near. */
const buildCog = (builder: AttractionBuilder) => {
  builder.cylinder("paint", armOrange, {
    radius: 0.32,
    length: 0.06,
    at: [0, 0, 0],
    axis: "z",
    segments: 24,
  });
  builder.cylinder("metal", toolSteel, {
    radius: 0.08,
    length: 0.1,
    at: [0, 0, 0.02],
    axis: "z",
    segments: 12,
  });
  for (let tooth = 0; tooth < 12; tooth++) {
    const angle = (tooth / 12) * Math.PI * 2;
    builder.box(
      "paint",
      armOrange,
      [0.1, 0.1, 0.06],
      [Math.sin(angle) * 0.36, Math.cos(angle) * 0.36, 0],
      [0, 0, -angle],
    );
  }
  for (let hole = 0; hole < 4; hole++) {
    const angle = (hole / 4) * Math.PI * 2;
    builder.cylinder("paint", shade(armOrange, 0.7), {
      radius: 0.06,
      length: 0.065,
      at: [Math.sin(angle) * 0.19, Math.cos(angle) * 0.19, 0],
      axis: "z",
      segments: 10,
    });
  }
};

const buildParcel = (builder: AttractionBuilder) => {
  builder.box("matte", cardboard, [0.22, 0.16, 0.18], [0, 0.08, 0]);
  builder.box("matte", "#e8d8a8", [0.23, 0.02, 0.04], [0, 0.161, 0]);
  builder.box("paint", palette.white, [0.08, 0.05, 0.005], [0.04, 0.09, 0.091]);
};

const buildRobot = (builder: AttractionBuilder) => {
  const { x, z } = robot;
  /* The charging pad, glowing round its edge */
  builder.cylinder("paint", postDark, {
    radius: 0.6,
    length: 0.06,
    at: [x, 0.07, z],
    segments: builder.isFar ? 10 : 28,
  });
  if (builder.isFar) {
    builder.box("paint", robotWhite, [0.6, 1.1, 0.5], [x, 0.65, z]);
    return;
  }
  builder.torus("glow", eyeGlow, 0.55, 0.025, [x, 0.1, z], "y", 28);
  /* Treads */
  [-0.24, 0.24].forEach((dx) => {
    builder.roundedBox("matte", belt, [0.14, 0.2, 0.55], 0.07, [
      x + dx,
      0.2,
      z,
    ]);
  });
  /* Body with a chest panel, and a neck */
  builder.roundedBox("paint", robotWhite, [0.56, 0.55, 0.44], 0.12, [
    x,
    0.6,
    z,
  ]);
  builder.box("paint", robotBlue, [0.34, 0.24, 0.02], [x, 0.62, z + 0.225]);
  ["#5ee07a", "#f2c230", "#ef5a3a"].forEach((colour, index) => {
    builder.sphere(
      "glow",
      colour,
      0.025,
      [x - 0.08 + index * 0.08, 0.68, z + 0.24],
      [1, 1, 0.6],
      6,
    );
  });
  builder.box("paint", palette.white, [0.2, 0.03, 0.01], [x, 0.56, z + 0.237]);
  builder.cylinder("metal", toolSteel, {
    radius: 0.07,
    length: 0.12,
    at: [x, 0.93, z],
    segments: 10,
  });
  /* Head with a dark face screen */
  builder.roundedBox("paint", robotWhite, [0.5, 0.36, 0.38], 0.12, [
    x,
    1.15,
    z,
  ]);
  builder.box("paint", screenDark, [0.38, 0.22, 0.02], [x, 1.15, z + 0.19]);
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", robotBlue, {
      radius: 0.07,
      length: 0.06,
      at: [x + side * 0.27, 1.15, z],
      axis: "x",
      segments: 12,
    });
    /* Arms waving hello */
    builder.bar(
      "paint",
      robotBlue,
      [x + side * 0.3, 0.72, z],
      [x + side * 0.42, 0.5, z + 0.12],
      0.08,
      8,
    );
    builder.sphere(
      "metal",
      toolSteel,
      0.06,
      [x + side * 0.43, 0.48, z + 0.13],
      [1, 1, 1],
      8,
    );
  });
  builder.bar("metal", toolSteel, [x, 1.33, z], [x + 0.05, 1.55, z], 0.02, 4);
  builder.sphere("glow", "#ef5a3a", 0.04, [x + 0.05, 1.57, z], [1, 1, 1], 8);
  /* Its cable back to the wall socket */
  builder.bar(
    "paint",
    palette.black,
    [x + 0.4, 0.06, z - 0.3],
    [x + 0.9, 0.06, shop.back + 0.2],
    0.03,
    4,
  );
  builder.box(
    "paint",
    palette.white,
    [0.16, 0.16, 0.03],
    [x + 0.9, 0.35, shop.back + 0.1],
  );
};

/** The robot's eyes and smile, which light up as someone comes near. */
const buildFace = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glow",
      eyeGlow,
      0.05,
      [side * 0.09, 0.03, 0],
      [1, 1.2, 0.4],
      10,
    );
  });
  for (let dot = 0; dot < 5; dot++) {
    const angle = ((dot - 2) / 2) * 0.8;
    builder.box(
      "glow",
      eyeGlow,
      [0.03, 0.02, 0.01],
      [Math.sin(angle) * 0.08, -0.04 - Math.cos(angle) * 0.03 + 0.03, 0],
    );
  }
};

export const robotWorkshopModel: CuriosityModel = {
  kind: "robot-workshop",
  islandId: "starfall-isle",
  name: "Robot Workshop",
  fact: "A robot is a machine that follows a program: a list of exact instructions in the right order, called an algorithm. Programmers use blocks such as repeat and if to make programs shorter and smarter. When a robot does something unexpected, they hunt for the mistake, called a bug, and fix it. This is called debugging.",
  curriculumLink:
    "Computing, Key Stage 2: design, write and debug programs that accomplish specific goals, including controlling or simulating physical systems.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: 1.5, z: 3.4 },
  build: (builder) => {
    buildShell(builder);
    buildToolBoards(builder);
    buildScreen(builder);
    buildConveyor(builder);
    buildRobot(builder);
    if (builder.isFar) {
      builder.box(
        "paint",
        armOrange,
        [0.15, 0.8, 0.15],
        [armBase[0], armBase[1] + 0.4, armBase[2] + 0.2],
      );
    } else {
      builder.box("matte", palette.paving, [1.1, 0.03, 2.2], [0.3, 0.015, 2.2]);
    }
    addSignBoard(builder, [1.5, 0, 3.4], signColour);
  },
  moving: [
    {
      name: "robot arm",
      pivot: armBase,
      build: buildArm,
      motion: { kind: "nod", axis: "y", reach: 6, amplitude: 1.3, period: 3.2 },
    },
    {
      name: "wall cog",
      pivot: cogAt,
      build: buildCog,
      motion: { kind: "whirl", axis: "z", idle: 0.3, speed: 2.4, reach: 6 },
    },
    {
      name: "robot face",
      pivot: [robot.x, 1.15, robot.z + 0.205],
      build: buildFace,
      motion: { kind: "wake", reach: 5 },
    },
    {
      name: "parcels",
      pivot: [conveyor.x, conveyor.height + 0.11, conveyor.z],
      build: buildParcel,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: conveyor.radius,
        count: 3,
        speed: 0.6,
        isFacingAlong: true,
      },
    },
  ],
  blockers: [
    { x: conveyor.x, z: conveyor.z, radius: conveyor.radius + 0.3 },
    { x: robot.x, z: robot.z, radius: 0.55 },
    { x: conveyor.x - 1.3, z: conveyor.z + 0.6, radius: 0.4 },
    { x: shop.minX + 0.08, z: shop.front, radius: 0.2 },
    { x: shop.maxX - 0.08, z: shop.front, radius: 0.2 },
    ...Array.from({ length: 7 }, (_, index) => ({
      x: shop.minX + 0.3 + index * 0.85,
      z: shop.back,
      radius: 0.35,
    })),
  ] satisfies LocalBlocker[],
  play: {
    label: "Program the robot",
    news: "Beep boop! The arm followed your program step by step: move, turn, grab, repeat. Every parcel landed in the crate. No bugs!",
    tune: [84, 79, 88, 76, 91],
  },
};
