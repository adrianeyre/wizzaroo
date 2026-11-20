import { BoxGeometry } from "three";
import {
  addBush,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const boardTimber = "#b88a56";
const laneLine = "#f4f1ea";
const startGreen = "#3f9a4a";
const snailSkin = "#9a8a72";
const lettuce = "#8cc65a";
const gold = "#e3b53a";
const silver = "#c9ccd1";
const bronze = "#c07a3e";
const bannerRed = "#d0453a";
const signColour = "#7a4a8a";

/* The board runs along z, finishing towards the visitors */
const board = { minX: -0.8, maxX: 0.8, minZ: -1.9, maxZ: 1.1 };
const boardHeight = 0.28;
const lanes = 4;
const laneWidth = (board.maxX - board.minX) / lanes;
const startZ = -1.55;
const finishZ = 0.75;
const bannerZ = finishZ + 0.05;
const podiumAt = { x: -2.25, z: 0.6 };
const flagPivot: Triple = [1.2, 0, finishZ];
const startFlagPivot: Triple = [-1.2, 0, startZ];

/** The snails, by lane: their shell colour, number, and how far they've crept. */
const snails: { number: number; shell: string; along: number }[] = [
  { number: 1, shell: "#e0563a", along: 0.35 },
  { number: 2, shell: "#3f8fd0", along: 0.82 },
  { number: 3, shell: "#f2c12e", along: 0.6 },
  { number: 4, shell: "#9a5fc8", along: 0.18 },
];

const laneX = (lane: number) => board.minX + laneWidth * (lane + 0.5);
const snailSpot = (lane: number): Triple => [
  laneX(lane),
  boardHeight,
  startZ + (finishZ - startZ) * snails[lane].along,
];

/** A checked strip of `count` squares along x. */
const addChecks = (
  builder: AttractionBuilder,
  at: Triple,
  count: number,
  size: number,
  height: number,
  rows = 2,
) => {
  for (let row = 0; row < rows; row++) {
    for (let square = 0; square < count; square++) {
      builder.box(
        "paint",
        (square + row) % 2 === 0 ? palette.black : palette.white,
        [size, height, size],
        [
          at[0] + (square - (count - 1) / 2) * size,
          at[1],
          at[2] + (row - (rows - 1) / 2) * size,
        ],
      );
    }
  }
};

const buildBoard = (builder: AttractionBuilder) => {
  const width = board.maxX - board.minX;
  const length = board.maxZ - board.minZ;
  const middleZ = (board.minZ + board.maxZ) / 2;
  builder.box(
    "matte",
    boardTimber,
    [width, 0.08, length],
    [0, boardHeight - 0.04, middleZ],
  );
  /* A raised rim round the edge, so no snail wanders off */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(boardTimber, 0.8),
      [0.08, 0.1, length + 0.08],
      [side * (width / 2 + 0.02), boardHeight + 0.01, middleZ],
    );
    builder.box(
      "matte",
      shade(boardTimber, 0.8),
      [width + 0.12, 0.1, 0.08],
      [0, boardHeight + 0.01, middleZ + side * (length / 2 + 0.02)],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Legs, painted lane lines, a green start and a chequered finish */
  [-1, 1].forEach((sideX) => {
    [board.minZ + 0.2, middleZ, board.maxZ - 0.2].forEach((z) => {
      builder.box(
        "matte",
        shade(boardTimber, 0.7),
        [0.1, boardHeight - 0.08, 0.1],
        [sideX * (width / 2 - 0.1), (boardHeight - 0.08) / 2, z],
      );
    });
  });
  for (let line = 1; line < lanes; line++) {
    builder.box(
      "paint",
      laneLine,
      [0.025, 0.01, length - 0.2],
      [board.minX + line * laneWidth, boardHeight + 0.005, middleZ],
    );
  }
  builder.box(
    "paint",
    startGreen,
    [width - 0.04, 0.012, 0.06],
    [0, boardHeight + 0.006, startZ],
  );
  addChecks(builder, [0, boardHeight + 0.006, finishZ], 16, 0.1, 0.012);
  /* Lane numbers painted at the start, as dots from one to four */
  for (let lane = 0; lane < lanes; lane++) {
    for (let dot = 0; dot <= lane; dot++) {
      builder.cylinder("paint", palette.white, {
        radius: 0.025,
        length: 0.012,
        at: [
          laneX(lane) + (dot - lane / 2) * 0.07,
          boardHeight + 0.006,
          startZ - 0.15,
        ],
        segments: 8,
      });
    }
  }
  /* Lettuce leaves waiting past the finish, the snails' prize */
  for (let lane = 0; lane < lanes; lane++) {
    builder.sphere(
      "matte",
      lane % 2 === 0 ? lettuce : shade(lettuce, 0.88),
      0.12,
      [laneX(lane), boardHeight + 0.03, finishZ + 0.18],
      [1.1, 0.25, 0.8],
      8,
    );
  }
};

/** The banner over the finish, on two striped posts, with little flags. */
const buildBanner = (builder: AttractionBuilder) => {
  const postX = 1.0;
  const height = 1.6;
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.045,
      length: height,
      at: [side * postX, height / 2, bannerZ],
      segments: builder.isFar ? 6 : 10,
    });
    if (!builder.isFar) {
      [0.3, 0.7, 1.1].forEach((y) => {
        builder.cylinder("paint", bannerRed, {
          radius: 0.05,
          length: 0.15,
          at: [side * postX, y, bannerZ],
          segments: 10,
        });
      });
      builder.sphere(
        "metal",
        gold,
        0.07,
        [side * postX, height + 0.05, bannerZ],
        [1, 1, 1],
        10,
      );
    }
  });
  builder.box(
    "paint",
    bannerRed,
    [postX * 2 - 0.1, 0.34, 0.03],
    [0, height - 0.22, bannerZ],
  );
  if (builder.isFar) {
    return;
  }
  /* A chequered band along the banner, and pennants hanging below */
  addChecks(builder, [0, height - 0.22, bannerZ + 0.02], 18, 0.1, 0.1, 1);
  for (let pennant = 0; pennant < 9; pennant++) {
    const x = -0.8 + pennant * 0.2;
    builder.add(
      "paint",
      snails[pennant % 4].shell,
      new BoxGeometry(0.12, 0.12, 0.012).rotateZ(Math.PI / 4).scale(1, 1.4, 1),
      { at: [x, height - 0.48, bannerZ] },
    );
  }
};

/** The podium for first, second and third, with rosettes. */
const buildPodium = (builder: AttractionBuilder) => {
  const places: { dx: number; height: number; colour: string; dots: number }[] =
    [
      { dx: 0, height: 0.45, colour: gold, dots: 1 },
      { dx: -0.45, height: 0.3, colour: silver, dots: 2 },
      { dx: 0.45, height: 0.18, colour: bronze, dots: 3 },
    ];
  places.forEach(({ dx, height, colour, dots }) => {
    const x = podiumAt.x + dx;
    builder.box(
      "paint",
      palette.white,
      [0.44, height, 0.44],
      [x, height / 2, podiumAt.z],
    );
    if (builder.isFar) {
      return;
    }
    builder.box(
      "paint",
      colour,
      [0.46, 0.05, 0.46],
      [x, height + 0.01, podiumAt.z],
    );
    /* A rosette on the front, and dots for its place */
    builder.cylinder("paint", colour, {
      radius: 0.1,
      length: 0.02,
      at: [x, height * 0.55 + 0.04, podiumAt.z + 0.23],
      axis: "z",
      segments: 12,
    });
    builder.torus(
      "paint",
      shade(colour, 0.8),
      0.1,
      0.02,
      [x, height * 0.55 + 0.04, podiumAt.z + 0.24],
      "z",
      12,
    );
    for (let dot = 0; dot < dots; dot++) {
      builder.cylinder("paint", palette.black, {
        radius: 0.018,
        length: 0.012,
        at: [
          x + (dot - (dots - 1) / 2) * 0.05,
          height * 0.55 + 0.04,
          podiumAt.z + 0.245,
        ],
        axis: "z",
        segments: 6,
      });
    }
  });
  if (builder.isFar) {
    return;
  }
  /* A golden cup on the top step */
  const cup: Triple = [podiumAt.x, 0.48, podiumAt.z];
  builder.lathe(
    "metal",
    gold,
    [
      [0.08, 0],
      [0.03, 0.04],
      [0.025, 0.12],
      [0.1, 0.18],
      [0.11, 0.3],
      [0.1, 0.3],
    ],
    cup,
    "y",
    14,
  );
  [-1, 1].forEach((side) => {
    builder.torus(
      "metal",
      gold,
      0.05,
      0.012,
      [cup[0] + side * 0.11, cup[1] + 0.23, cup[2]],
      "z",
      10,
    );
  });
};

/** A snail, facing +z, on y = 0, with its painted, numbered shell. */
const buildSnail = (builder: AttractionBuilder, lane: number) => {
  const { number, shell } = snails[lane];
  const [x, , z] = snailSpot(lane);
  const place = (dx: number, dy: number, dz: number): Triple => [
    x + dx,
    boardHeight + dy,
    z + dz,
  ];
  /* The soft foot and head */
  builder.sphere(
    "matte",
    snailSkin,
    0.08,
    place(0, 0.035, 0),
    [0.75, 0.45, 2.1],
    10,
  );
  builder.sphere(
    "matte",
    shade(snailSkin, 1.08),
    0.06,
    place(0, 0.08, 0.13),
    [0.85, 0.9, 1],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      snailSkin,
      place(side * 0.02, 0.11, 0.15),
      place(side * 0.05, 0.22, 0.2),
      0.018,
      4,
    );
    builder.sphere(
      "matte",
      snailSkin,
      0.022,
      place(side * 0.05, 0.225, 0.2),
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.012,
      place(side * 0.05, 0.23, 0.215),
      [1, 1, 1],
      4,
    );
  });
  /* The shell: a painted round coil, with its spiral picked out */
  builder.sphere("paint", shell, 0.12, place(0, 0.16, -0.04), [0.8, 1, 1], 12);
  builder.torus(
    "paint",
    shade(shell, 0.75),
    0.08,
    0.018,
    place(0.075, 0.16, -0.04),
    "x",
    14,
  );
  builder.torus(
    "paint",
    shade(shell, 0.75),
    0.08,
    0.018,
    place(-0.075, 0.16, -0.04),
    "x",
    14,
  );
  /* Its race number, as dots on a white disc on each side */
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.055,
      length: 0.01,
      at: place(side * 0.097, 0.16, -0.04),
      axis: "x",
      segments: 12,
    });
    for (let dot = 0; dot < number; dot++) {
      const angle = (dot / number) * Math.PI * 2;
      const spread = number === 1 ? 0 : 0.025;
      builder.cylinder("paint", palette.black, {
        radius: 0.012,
        length: 0.012,
        at: place(
          side * 0.103,
          0.16 + Math.cos(angle) * spread,
          -0.04 + Math.sin(angle) * spread,
        ),
        axis: "x",
        segments: 6,
      });
    }
  });
  /* A shiny trail behind it */
  builder.box("glass", "#dfe8f0", [0.06, 0.004, 0.5], place(0, 0.003, -0.4));
};

/** Two snails creeping together. */
const buildSnailPair =
  (lanesInPair: number[]) => (builder: AttractionBuilder) => {
    lanesInPair.forEach((lane) => {
      buildSnail(builder, lane);
    });
  };

/** A flag on a pole: chequered, or all one colour when given one. */
const buildFlag =
  (colour: string | undefined) => (builder: AttractionBuilder) => {
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.03,
      length: 1.3,
      at: [0, 0.65, 0],
      segments: 8,
    });
    builder.sphere("metal", gold, 0.045, [0, 1.32, 0], [1, 1, 1], 8);
    if (colour === undefined) {
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 4; column++) {
          builder.box(
            "paint",
            (row + column) % 2 === 0 ? palette.black : palette.white,
            [0.1, 0.1, 0.015],
            [0.07 + column * 0.1, 1.17 - row * 0.1, 0],
          );
        }
      }
      return;
    }
    builder.box("paint", colour, [0.4, 0.28, 0.015], [0.22, 1.12, 0]);
  };

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.path, [0.9, 0.03, 1.6], [0, 0.015, 2.6]);
  if (builder.isFar) {
    return;
  }
  /* A bucket of lettuce, some pebbles, and bushes behind */
  builder.cylinder("metal", palette.steel, {
    radius: 0.18,
    radiusEnd: 0.22,
    length: 0.3,
    at: [1.6, 0.15, -1.4],
    segments: 14,
  });
  builder.sphere("matte", lettuce, 0.2, [1.6, 0.32, -1.4], [1, 0.6, 1], 9);
  for (let pebble = 0; pebble < 8; pebble++) {
    const angle = pebble * 0.8 + 3.6;
    builder.sphere(
      "matte",
      shade(palette.stone, 0.85 + (pebble % 3) * 0.1),
      0.08,
      [Math.sin(angle) * 1.25, 0.03, -0.4 + Math.cos(angle) * 1.9],
      [1.2, 0.5, 1],
      6,
    );
  }
  addBush(builder, [-1.9, 0, -2.4], 0.55);
  addBush(builder, [2.0, 0, -2.5], 0.5, "#3d7a34");
};

export const snailRaceModel: CuriosityModel = {
  kind: "snail-race",
  islandId: "meadow-isle",
  name: "Snail Race",
  fact: "Snails are very slow: a garden snail takes about a quarter of an hour to creep one metre! The snail that crosses the finish line first comes first, the next one is second, then third and fourth. Snails glide on a slimy trail and carry their shells on their backs, curling up inside to stay safe.",
  curriculumLink:
    "Mathematics, Year 1: number and place value. Read and write numbers in words, and use the language of ordinal numbers: first, second, third.",
  footprint: 3.9,
  setting: "inland",
  signSpot: { x: 1.5, z: 2.9 },
  build: (builder) => {
    buildGrounds(builder);
    buildBoard(builder);
    buildBanner(builder);
    buildPodium(builder);
    if (builder.isFar) {
      [flagPivot, startFlagPivot].forEach(([x, , z]) => {
        builder.box(
          "matte",
          palette.darkTimber,
          [0.06, 1.3, 0.06],
          [x, 0.65, z],
        );
      });
    }
    addSignBoard(builder, [1.5, 0, 2.9], signColour);
  },
  moving: [
    {
      name: "snails one and three",
      pivot: [0, 0, 0],
      build: buildSnailPair([0, 2]),
      motion: { kind: "bob", height: 0.025, period: 1.3 },
    },
    {
      name: "snails two and four",
      pivot: [0, 0, 0],
      build: buildSnailPair([1, 3]),
      motion: { kind: "bob", height: 0.025, period: 1.3, phase: Math.PI },
    },
    {
      name: "chequered flag",
      pivot: flagPivot,
      build: buildFlag(undefined),
      motion: { kind: "nod", axis: "z", reach: 6, amplitude: 0.5, period: 0.8 },
    },
    {
      name: "start flag",
      pivot: startFlagPivot,
      build: buildFlag(startGreen),
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.4,
        period: 1.1,
        phase: 1,
      },
    },
  ],
  blockers: [
    ...listWallBlockers({ x: 0, z: -1.5 }, { x: 0, z: 0.7 }, 0.85, 0.4),
    { x: podiumAt.x, z: podiumAt.z, radius: 0.75 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Cheer on the snails",
    news: "Go, snails, go! Blue number 2 slid over the line first, yellow number 3 came second and red number 1 was third.",
  },
};
