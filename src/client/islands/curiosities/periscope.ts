import { RingGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sandbag = "#b9a77e";
const sandbagDark = "#9a8963";
const hullGrey = "#56627a";
const hullDark = "#3a4458";
const brassTrim = "#d1a84a";
const mirrorSilver = "#dfe6f0";
const boardNavy = "#1f2a5c";
const rayGold = "#ffe27a";
const pondBlue = "#3d6fc2";
const stepTimber = "#7a5a3a";
const signColour = "#2b2f6b";

const wallZ = -0.55;
const wallLength = 4.4;
const wallHeight = 1.55;
const scopeAt = { x: 0.55, z: wallZ + 0.42 };
const housingTop = wallHeight - 0.05;
const eyeHeight = 1.02;
const stepHeight = 0.18;
const boardAt = { x: -1.85, z: 1.2 };
const boardHeight = 1.35;
const pondAt = { x: 0.2, z: -2.6 };

/** Rows of squashed sandbags, laid like bricks. */
const buildWall = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    builder.box(
      "matte",
      sandbag,
      [wallLength, wallHeight, 0.55],
      [0, wallHeight / 2, wallZ],
    );
    return;
  }
  const rows = 5;
  const rowHeight = wallHeight / rows;
  for (let row = 0; row < rows; row++) {
    const count = row % 2 === 0 ? 8 : 7;
    const width = wallLength / 8;
    for (let bag = 0; bag < count; bag++) {
      const x =
        -wallLength / 2 +
        width / 2 +
        bag * width +
        (row % 2 === 0 ? 0 : width / 2);
      builder.sphere(
        "matte",
        (row + bag) % 3 === 0
          ? sandbagDark
          : (row + bag) % 3 === 1
            ? sandbag
            : shade(sandbag, 1.08),
        0.5,
        [x, rowHeight * (row + 0.5), wallZ + ((bag + row) % 2) * 0.03],
        [width * 1.08, rowHeight * 1.35, 0.6],
        8,
      );
    }
  }
  /* A core behind the bags so no gaps show */
  builder.box(
    "matte",
    sandbagDark,
    [wallLength - 0.2, wallHeight - 0.1, 0.36],
    [0, (wallHeight - 0.1) / 2, wallZ],
  );
  /* Wooden posts at each end, holding the wall up */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.14, wallHeight + 0.3, 0.14],
      [side * (wallLength / 2 + 0.05), (wallHeight + 0.3) / 2, wallZ + 0.3],
    );
  });
};

/** The fixed housing with its eyepiece, handles and the crank's boss. */
const buildHousing = (builder: AttractionBuilder) => {
  const { x, z } = scopeAt;
  const segments = builder.isFar ? 8 : 24;
  builder.cylinder("paint", hullGrey, {
    radius: 0.2,
    length: housingTop,
    at: [x, housingTop / 2, z],
    segments,
  });
  builder.box("paint", hullGrey, [0.42, 0.34, 0.42], [x, eyeHeight, z + 0.1]);
  if (builder.isFar) {
    return;
  }
  builder.cylinder("paint", hullDark, {
    radius: 0.32,
    radiusEnd: 0.26,
    length: 0.14,
    at: [x, 0.07, z],
    segments,
  });
  [0.4, housingTop - 0.04].forEach((height) => {
    builder.cylinder("metal", brassTrim, {
      radius: 0.225,
      length: 0.06,
      at: [x, height, z],
      segments,
    });
  });
  /* The eyepiece with its rubber eyecup, at a child's eye height */
  builder.cylinder("paint", palette.black, {
    radius: 0.1,
    radiusEnd: 0.12,
    length: 0.16,
    at: [x, eyeHeight, z + 0.38],
    axis: "z",
    segments: 16,
  });
  builder.cylinder("glass", "#8fb8ff", {
    radius: 0.07,
    length: 0.01,
    at: [x, eyeHeight, z + 0.46],
    axis: "z",
    segments: 14,
  });
  /* Fold-down training handles either side */
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + side * 0.21, eyeHeight, z + 0.2],
      [x + side * 0.42, eyeHeight, z + 0.28],
      0.05,
      6,
    );
    builder.cylinder("paint", palette.black, {
      radius: 0.045,
      length: 0.22,
      at: [x + side * 0.45, eyeHeight - 0.08, z + 0.28],
      segments: 10,
    });
  });
  /* Rivets round the box */
  for (let rivet = 0; rivet < 6; rivet++) {
    builder.sphere(
      "metal",
      brassTrim,
      0.02,
      [
        x - 0.17 + (rivet % 3) * 0.17,
        eyeHeight + (rivet < 3 ? 0.14 : -0.14),
        z + 0.32,
      ],
      [1, 1, 1],
      6,
    );
  }
  /* The crank's boss on the side */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.06,
    length: 0.1,
    at: [x + 0.25, 0.7, z],
    axis: "x",
    segments: 10,
  });
};

const crankPivot: Triple = [scopeAt.x + 0.32, 0.7, scopeAt.z];
const buildCrank = (builder: AttractionBuilder) => {
  builder.torus("paint", palette.postRed, 0.2, 0.03, [0, 0, 0], "x", 24);
  for (let spoke = 0; spoke < 4; spoke++) {
    const angle = (spoke / 4) * Math.PI * 2;
    builder.bar(
      "metal",
      palette.steel,
      [0, 0, 0],
      [0, Math.cos(angle) * 0.2, Math.sin(angle) * 0.2],
      0.03,
      5,
    );
  }
  builder.cylinder("metal", brassTrim, {
    radius: 0.04,
    length: 0.06,
    at: [0, 0, 0],
    axis: "x",
    segments: 10,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.025,
    length: 0.12,
    at: [0.06, 0.2, 0],
    axis: "x",
    segments: 8,
  });
};

/** The inner tube and head that rise up above the wall to look over it. */
const buildScope = (builder: AttractionBuilder) => {
  builder.cylinder("metal", mirrorSilver, {
    radius: 0.13,
    length: 1.3,
    at: [0, -0.45, 0],
    segments: 18,
  });
  [0.0, 0.12].forEach((height) => {
    builder.cylinder("metal", brassTrim, {
      radius: 0.145,
      length: 0.04,
      at: [0, height, 0],
      segments: 18,
    });
  });
  /* The head, its window looking out over the wall to the back */
  builder.cylinder("paint", hullGrey, {
    radius: 0.17,
    length: 0.42,
    at: [0, 0.42, 0],
    segments: 18,
  });
  builder.sphere("paint", hullGrey, 0.17, [0, 0.63, 0], [1, 0.6, 1], 14);
  builder.box("paint", hullDark, [0.24, 0.2, 0.12], [0, 0.45, -0.17]);
  builder.box("glass", "#8fb8ff", [0.18, 0.14, 0.02], [0, 0.45, -0.235]);
  builder.box("paint", hullDark, [0.28, 0.03, 0.18], [0, 0.57, -0.18]);
  /* A little aerial and a lamp on top */
  builder.cylinder("metal", palette.steel, {
    radius: 0.012,
    length: 0.4,
    at: [0.08, 0.9, 0],
    segments: 5,
  });
  builder.sphere("glow", "#ff4a5a", 0.03, [0.08, 1.1, 0], [1, 1, 1], 6);
};

/** The cutaway diagram: how two mirrors send the light down the tube. */
const buildBoard = (builder: AttractionBuilder) => {
  const { x, z } = boardAt;
  builder.box("paint", boardNavy, [1.1, 1.3, 0.06], [x, boardHeight, z]);
  [-0.45, 0.45].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, boardHeight + 0.7, 0.08],
      [x + side, (boardHeight + 0.7) / 2, z - 0.06],
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    palette.darkTimber,
    [1.2, 0.08, 0.12],
    [x, boardHeight + 0.68, z - 0.02],
  );
  /* The periscope drawn in white: a tall tube with a bend at each end */
  const front = z + 0.035;
  const tube = (from: [number, number], to: [number, number]) => {
    builder.bar(
      "paint",
      palette.white,
      [x + from[0], boardHeight + from[1], front],
      [x + to[0], boardHeight + to[1], front],
      0.02,
      4,
    );
  };
  tube([-0.05, -0.45], [-0.05, 0.35]);
  tube([0.15, -0.25], [0.15, 0.45]);
  tube([-0.05, 0.35], [-0.35, 0.35]);
  tube([0.15, 0.45], [-0.35, 0.45]);
  tube([0.15, -0.25], [0.45, -0.25]);
  tube([-0.05, -0.45], [0.45, -0.45]);
  /* The two mirrors, each at 45 degrees */
  [
    [0.05, 0.4, -1],
    [0.05, -0.35, -1],
  ].forEach(([mx, my, tilt]) => {
    builder.box(
      "metal",
      mirrorSilver,
      [0.3, 0.03, 0.02],
      [x + mx, boardHeight + my, front + 0.01],
      [0, 0, (tilt * Math.PI) / 4],
    );
  });
  /* An eye looking in at the bottom, and a ship to spy at the top */
  builder.sphere(
    "paint",
    palette.white,
    0.06,
    [x + 0.42, boardHeight - 0.35, front + 0.01],
    [1.4, 1, 0.3],
    10,
  );
  builder.sphere(
    "paint",
    "#2f74c8",
    0.03,
    [x + 0.4, boardHeight - 0.35, front + 0.02],
    [1, 1, 0.3],
    8,
  );
  builder.box(
    "paint",
    palette.postRed,
    [0.16, 0.05, 0.01],
    [x - 0.42, boardHeight + 0.4, front + 0.01],
  );
  builder.box(
    "paint",
    palette.white,
    [0.02, 0.1, 0.01],
    [x - 0.42, boardHeight + 0.47, front + 0.01],
  );
};

/** The path of the light on the diagram, which lights up as a visitor comes near. */
const buildRay = (builder: AttractionBuilder) => {
  const points: [number, number][] = [
    [-0.4, 0.4],
    [0.05, 0.4],
    [0.05, -0.35],
    [0.4, -0.35],
  ];
  for (let index = 0; index < points.length - 1; index++) {
    const [fromX, fromY] = points[index];
    const [toX, toY] = points[index + 1];
    builder.bar("glow", rayGold, [fromX, fromY, 0], [toX, toY, 0], 0.035, 5);
  }
  /* Arrowheads showing which way the light goes */
  builder.cylinder("glow", rayGold, {
    radius: 0.05,
    radiusEnd: 0.0,
    length: 0.1,
    at: [-0.15, 0.4, 0],
    axis: "x",
    segments: 6,
  });
  builder.cylinder("glow", rayGold, {
    radius: 0.05,
    radiusEnd: 0.0,
    length: 0.1,
    at: [0.05, 0.0, 0],
    segments: 6,
  });
  builder.add(
    "glow",
    rayGold,
    new RingGeometry(0.0, 0.05, 6).rotateZ(Math.PI),
    { at: [0.3, -0.35, 0.005] },
  );
};

/** A pond behind the wall with a toy boat to spy on. */
const buildPond = (builder: AttractionBuilder) => {
  const { x, z } = pondAt;
  builder.cylinder("matte", palette.darkStone, {
    radius: 1.35,
    radiusEnd: 1.45,
    length: 0.12,
    at: [x, 0.06, z],
    segments: builder.isFar ? 10 : 32,
  });
  builder.cylinder("water", pondBlue, {
    radius: 1.2,
    length: 0.04,
    at: [x, 0.12, z],
    segments: builder.isFar ? 10 : 32,
  });
  if (builder.isFar) {
    return;
  }
  for (let stone = 0; stone < 12; stone++) {
    const angle = (stone / 12) * Math.PI * 2;
    builder.sphere(
      "matte",
      stone % 2 === 0 ? palette.stone : shade(palette.stone, 0.85),
      0.14,
      [x + Math.sin(angle) * 1.32, 0.13, z + Math.cos(angle) * 1.32],
      [1.3, 0.6, 1],
      6,
    );
  }
  /* Reeds */
  [
    [-1.0, -0.4],
    [1.05, 0.2],
    [0.7, -0.85],
  ].forEach(([dx, dz]) => {
    [0, 0.06, -0.05].forEach((offset, index) => {
      builder.bar(
        "matte",
        "#3f7a3a",
        [x + dx + offset, 0.1, z + dz],
        [x + dx + offset * 2, 0.55 + index * 0.1, z + dz + offset],
        0.025,
        4,
      );
    });
  });
};

const boatPivot: Triple = [pondAt.x - 0.2, 0.14, pondAt.z + 0.1];
const buildBoat = (builder: AttractionBuilder) => {
  builder.box("paint", palette.postRed, [0.55, 0.14, 0.22], [0, 0.07, 0]);
  builder.box("paint", palette.white, [0.28, 0.14, 0.16], [-0.04, 0.21, 0]);
  builder.cylinder("paint", palette.black, {
    radius: 0.04,
    length: 0.14,
    at: [0.06, 0.34, 0],
    segments: 8,
  });
  builder.cylinder("paint", palette.postRed, {
    radius: 0.11,
    radiusEnd: 0.0,
    length: 0.1,
    at: [0.3, 0.07, 0],
    axis: "x",
    segments: 4,
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    palette.gravel,
    [1.2, 0.03, 3.6],
    [scopeAt.x, 0.015, 2.1],
  );
  builder.box(
    "matte",
    stepTimber,
    [0.8, stepHeight, 0.5],
    [scopeAt.x, stepHeight / 2, scopeAt.z + 0.9],
  );
  if (builder.isFar) {
    return;
  }
  /* Planks on the step */
  [-0.25, 0, 0.25].forEach((offset) => {
    builder.box(
      "matte",
      shade(stepTimber, 1.15),
      [0.24, 0.02, 0.48],
      [scopeAt.x + offset, stepHeight + 0.01, scopeAt.z + 0.9],
    );
  });
  /* Ammunition-style storage boxes and a coil of rope */
  builder.box("paint", "#4a6a3a", [0.6, 0.35, 0.4], [2.1, 0.175, 0.2]);
  builder.box("paint", "#3a5a2e", [0.62, 0.06, 0.42], [2.1, 0.37, 0.2]);
  builder.box(
    "paint",
    "#4a6a3a",
    [0.5, 0.3, 0.35],
    [2.2, 0.55, 0.15],
    [0, 0.3, 0],
  );
  builder.torus("matte", "#c8b48a", 0.22, 0.05, [1.6, 0.05, 0.9], "y", 18);
  builder.torus("matte", "#c8b48a", 0.17, 0.05, [1.6, 0.13, 0.9], "y", 18);
  /* A flag on the end post */
  builder.cylinder("metal", palette.steel, {
    radius: 0.025,
    length: 1.2,
    at: [-wallLength / 2 - 0.05, wallHeight + 0.6, wallZ + 0.3],
    segments: 6,
  });
  builder.box(
    "paint",
    "#5b3a8c",
    [0.5, 0.3, 0.02],
    [-wallLength / 2 + 0.22, wallHeight + 1.05, wallZ + 0.3],
  );
  builder.sphere(
    "glow",
    rayGold,
    0.05,
    [-wallLength / 2 + 0.22, wallHeight + 1.05, wallZ + 0.32],
    [1, 1, 0.3],
    8,
  );
};

const stepDeck: Deck = ({ x, z }) =>
  Math.abs(x - scopeAt.x) <= 0.4 && Math.abs(z - (scopeAt.z + 0.9)) <= 0.25
    ? { height: stepHeight, kind: "ground" }
    : undefined;

export const periscopeModel: CuriosityModel = {
  kind: "periscope",
  islandId: "starfall-isle",
  name: "Periscope",
  fact: "A periscope lets you see over a wall without being seen. Light travels in straight lines, so it needs help to go round corners. A mirror at the top bounces the light down the tube, and a second mirror at the bottom bounces it into your eye. Submarines use periscopes to look above the waves.",
  curriculumLink:
    "Science, Year 6: light. Use the idea that light travels in straight lines to explain that objects are seen because they give out or reflect light into the eye, as the mirrors in a periscope do.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: -1.2, z: 3.8 },
  build: (builder) => {
    buildWall(builder);
    buildHousing(builder);
    buildBoard(builder);
    buildPond(builder);
    buildGrounds(builder);
    if (builder.isFar) {
      builder.cylinder("metal", mirrorSilver, {
        radius: 0.13,
        length: 0.5,
        at: [scopeAt.x, housingTop + 0.2, scopeAt.z],
        segments: 6,
      });
    }
    addSignBoard(builder, [-1.2, 0, 3.8], signColour);
  },
  moving: [
    {
      name: "scope",
      pivot: [scopeAt.x, housingTop, scopeAt.z],
      build: buildScope,
      motion: { kind: "rise", reach: 6, height: 0.9, period: 2.4 },
    },
    {
      name: "crank",
      pivot: crankPivot,
      build: buildCrank,
      motion: { kind: "whirl", axis: "x", idle: 0, speed: 4, reach: 6 },
    },
    {
      name: "light-ray",
      pivot: [boardAt.x, boardHeight, boardAt.z + 0.05],
      build: buildRay,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "boat",
      pivot: boatPivot,
      build: buildBoat,
      motion: { kind: "bob", height: 0.03, period: 2.2 },
    },
  ],
  blockers: [
    ...Array.from({ length: 6 }, (_, index) => ({
      x: -wallLength / 2 + 0.35 + (index * (wallLength - 0.7)) / 5,
      z: wallZ,
      radius: 0.45,
    })),
    { x: scopeAt.x, z: scopeAt.z + 0.1, radius: 0.3 },
    { x: boardAt.x, z: boardAt.z, radius: 0.5 },
    { x: pondAt.x, z: pondAt.z, radius: 1.4 },
    { x: 2.15, z: 0.2, radius: 0.4 },
  ] satisfies LocalBlocker[],
  decks: [stepDeck],
  play: {
    label: "Up periscope!",
    news: "Up periscope! The top mirror caught the light from behind the wall and the bottom mirror bounced it into your eye. You can see the little boat!",
  },
};
