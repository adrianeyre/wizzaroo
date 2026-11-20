import { BoxGeometry } from "three";
import {
  addBush,
  addDoor,
  addGableRoof,
  addSignBoard,
  addWindow,
  buildFlatDeck,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const millStone = "#b9ab93";
const millStoneDark = "#8f826c";
const quoin = "#d8ccb4";
const roofTile = "#8c3f2b";
const wheelTimber = "#6b4a2f";
const wheelIron = "#3b3f44";
const raceStone = "#8e877b";
const streamBlue = "#3f8fb4";
const foam = "#e8f4f8";
const gateTimber = "#5a3d26";
const signColour = "#2f5d7c";

/* The mill house stands west of the race; the wheel turns in the race. */
const house = { x: -1.75, z: -0.6, width: 3.3, depth: 3.6, height: 3.1 };
const houseEast = house.x + house.width / 2;
const raceWest = 0.2;
const raceEast = 1.35;
const raceMiddle = (raceWest + raceEast) / 2;
const raceEnd = 5.4;
const raceWall = 0.42;
const waterLevel = 0.16;
const wheelRadius = 1.55;
const wheelAt: Triple = [raceMiddle, wheelRadius + 0.05, house.z];
const bridge = { minZ: 2.55, maxZ: 3.45 };
const bridgeHeight = raceWall + 0.06;
const gateAt: Triple = [raceMiddle, 0.05, -3.4];

const buildHouse = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = house;
  builder.box("matte", millStone, [width, height, depth], [x, height / 2, z]);
  /* A plinth, and dressed corner stones to show the walls' thickness */
  builder.box(
    "matte",
    millStoneDark,
    [width + 0.1, 0.3, depth + 0.1],
    [x, 0.15, z],
  );
  if (!builder.isFar) {
    for (let course = 0; course < 7; course++) {
      const y = 0.45 + course * 0.4;
      const isLong = course % 2 === 0;
      [-1, 1].forEach((sideX) => {
        [-1, 1].forEach((sideZ) => {
          builder.box(
            "matte",
            quoin,
            [isLong ? 0.42 : 0.24, 0.3, isLong ? 0.24 : 0.42],
            [
              x + sideX * (width / 2 - (isLong ? 0.19 : 0.1)),
              y,
              z + sideZ * (depth / 2 - (isLong ? 0.1 : 0.19)),
            ],
          );
        });
      });
    }
    /* Stone courses picked out in a darker mortar line */
    [1.05, 2.05].forEach((y) => {
      builder.box(
        "matte",
        millStoneDark,
        [width + 0.02, 0.04, depth + 0.02],
        [x, y, z],
      );
    });
  }
  addGableRoof(builder, {
    width,
    depth,
    rise: 1.35,
    at: [x, height, z],
    colour: roofTile,
    overhang: 0.25,
    thickness: 0.12,
  });
  /* The gable ends filled in with stone, a diamond prism whose top half shows */
  const halfDiagonal = depth / 2;
  builder.add(
    "matte",
    millStone,
    new BoxGeometry(
      width - 0.04,
      halfDiagonal * Math.SQRT2,
      halfDiagonal * Math.SQRT2,
    )
      .rotateX(Math.PI / 4)
      .scale(1, 1.33 / halfDiagonal, 1),
    { at: [x, height, z] },
    undefined,
  );
  /* A brick chimney at the back */
  builder.box(
    "matte",
    palette.brick,
    [0.5, 1.6, 0.5],
    [x - 0.9, height + 1.1, z - 0.9],
  );
  builder.box(
    "matte",
    palette.darkBrick,
    [0.6, 0.12, 0.6],
    [x - 0.9, height + 1.95, z - 0.9],
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", palette.darkBrick, {
    radius: 0.1,
    length: 0.25,
    at: [x - 0.9, height + 2.1, z - 0.9],
    segments: 10,
  });
  addDoor(builder, {
    at: [x + 0.5, 0.3, z + depth / 2 + 0.01],
    width: 0.85,
    height: 1.55,
    colour: gateTimber,
  });
  addWindow(builder, {
    at: [x - 0.85, 1.6, z + depth / 2 + 0.01],
    width: 0.6,
    height: 0.7,
  });
  addWindow(builder, {
    at: [x - 0.3, 2.55, z + depth / 2 + 0.01],
    width: 0.5,
    height: 0.55,
  });
  addWindow(builder, {
    at: [x - 0.9, 1.7, z - depth / 2 - 0.01],
    width: 0.6,
    height: 0.7,
    turn: Math.PI,
  });
  addWindow(builder, {
    at: [x - width / 2 - 0.01, 1.8, z + 0.6],
    width: 0.55,
    height: 0.65,
    turn: -Math.PI / 2,
  });
  /* The lucam: a little hoist house jutting from the gable, with a sack on its rope */
  const lucam: Triple = [x - 0.4, height + 0.35, z + depth / 2 + 0.35];
  builder.box("matte", palette.paleTimber, [0.8, 0.7, 0.7], lucam);
  addGableRoof(builder, {
    width: 0.8,
    depth: 0.7,
    rise: 0.35,
    at: [lucam[0], lucam[1] + 0.35, lucam[2]],
    colour: roofTile,
    turn: Math.PI / 2,
    overhang: 0.08,
  });
  builder.bar(
    "metal",
    palette.darkSteel,
    [lucam[0], lucam[1] - 0.35, lucam[2] + 0.2],
    [lucam[0], 1.3, lucam[2] + 0.2],
    0.02,
    4,
  );
  builder.roundedBox("matte", palette.cream, [0.36, 0.5, 0.3], 0.12, [
    lucam[0],
    1.05,
    lucam[2] + 0.2,
  ]);
};

const buildRace = (builder: AttractionBuilder) => {
  /* Stone walls either side of the mill race, with the stream between */
  [raceWest - 0.12, raceEast + 0.12].forEach((x) => {
    builder.box(
      "matte",
      raceStone,
      [0.24, raceWall, raceEnd * 2],
      [x, raceWall / 2, 0],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        shade(raceStone, 1.12),
        [0.3, 0.06, raceEnd * 2],
        [x, raceWall + 0.03, 0],
      );
    }
  });
  builder.box(
    "water",
    streamBlue,
    [raceEast - raceWest, 0.04, raceEnd * 2],
    [raceMiddle, waterLevel, 0],
  );
  builder.box(
    "matte",
    shade(raceStone, 0.7),
    [raceEast - raceWest, 0.04, raceEnd * 2],
    [raceMiddle, 0.04, 0],
  );
  /* Where the stream comes out of, and goes back into, the bank */
  [-1, 1].forEach((end) => {
    const z = end * (raceEnd + 0.1);
    builder.box("matte", raceStone, [2.2, 1.0, 0.3], [raceMiddle, 0.5, z]);
    if (!builder.isFar) {
      builder.box(
        "matte",
        palette.black,
        [raceEast - raceWest - 0.1, 0.5, 0.31],
        [raceMiddle, 0.3, z],
      );
      builder.cylinder("matte", palette.black, {
        radius: (raceEast - raceWest) / 2 - 0.05,
        length: 0.31,
        at: [raceMiddle, 0.55, z],
        axis: "z",
        segments: 16,
      });
      builder.box(
        "matte",
        shade(raceStone, 1.1),
        [2.4, 0.12, 0.4],
        [raceMiddle, 1.06, z],
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Foam where the wheel churns the water, and ripples downstream */
  [0.4, 0.9, 1.5, 2.2].forEach((along, index) => {
    builder.box(
      "water",
      foam,
      [0.5 - index * 0.08, 0.02, 0.18],
      [
        raceMiddle + (index % 2 === 0 ? -0.15 : 0.15),
        waterLevel + 0.025,
        house.z + along,
      ],
    );
  });
  /* The sluice gate's frame upstream */
  [raceWest - 0.02, raceEast + 0.02].forEach((x) => {
    builder.box("matte", gateTimber, [0.12, 1.5, 0.14], [x, 0.75, gateAt[2]]);
  });
  builder.box(
    "matte",
    gateTimber,
    [raceEast - raceWest + 0.3, 0.14, 0.16],
    [raceMiddle, 1.5, gateAt[2]],
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.12,
    length: 0.06,
    at: [raceMiddle, 1.62, gateAt[2] + 0.12],
    axis: "z",
    segments: 14,
  });
};

const buildBridge = (builder: AttractionBuilder) => {
  const width = bridge.maxZ - bridge.minZ;
  const middle = (bridge.minZ + bridge.maxZ) / 2;
  const from = raceWest - 0.6;
  const to = raceEast + 0.6;
  builder.box(
    "matte",
    palette.timber,
    [to - from, 0.08, width],
    [(from + to) / 2, bridgeHeight - 0.04, middle],
  );
  if (builder.isFar) {
    return;
  }
  for (let plank = 0; plank < 10; plank++) {
    const x = from + 0.1 + plank * ((to - from - 0.2) / 9);
    builder.box(
      "matte",
      shade(palette.timber, plank % 2 === 0 ? 1.08 : 0.94),
      [0.12, 0.02, width - 0.04],
      [x, bridgeHeight + 0.01, middle],
    );
  }
  [bridge.minZ + 0.04, bridge.maxZ - 0.04].forEach((z) => {
    [from + 0.05, raceMiddle, to - 0.05].forEach((x) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.07, 0.6, 0.07],
        [x, bridgeHeight + 0.3, z],
      );
    });
    builder.box(
      "matte",
      palette.darkTimber,
      [to - from, 0.06, 0.07],
      [(from + to) / 2, bridgeHeight + 0.58, z],
    );
  });
};

const buildWheel = (builder: AttractionBuilder) => {
  const width = raceEast - raceWest - 0.25;
  const segments = 32;
  /* Two rims, with the floats (paddles) between */
  [-1, 1].forEach((side) => {
    builder.torus(
      "matte",
      wheelTimber,
      wheelRadius - 0.06,
      0.06,
      [side * (width / 2), 0, 0],
      "x",
      segments,
    );
    builder.torus(
      "matte",
      wheelTimber,
      wheelRadius * 0.62,
      0.045,
      [side * (width / 2), 0, 0],
      "x",
      24,
    );
    for (let spoke = 0; spoke < 8; spoke++) {
      const angle = (spoke / 8) * Math.PI * 2;
      builder.bar(
        "matte",
        wheelTimber,
        [side * (width / 2), 0, 0],
        [
          side * (width / 2),
          Math.cos(angle) * (wheelRadius - 0.08),
          Math.sin(angle) * (wheelRadius - 0.08),
        ],
        0.07,
        6,
      );
    }
  });
  const floats = 16;
  for (let index = 0; index < floats; index++) {
    const angle = (index / floats) * Math.PI * 2;
    builder.box(
      "matte",
      shade(wheelTimber, 1.15),
      [width + 0.04, 0.32, 0.05],
      [
        0,
        Math.cos(angle) * (wheelRadius - 0.14),
        Math.sin(angle) * (wheelRadius - 0.14),
      ],
      [angle, 0, 0],
    );
  }
  /* The axle and its iron hub */
  builder.cylinder("metal", wheelIron, {
    radius: 0.12,
    length: width + 0.9,
    at: [-0.25, 0, 0],
    axis: "x",
    segments: 14,
  });
  builder.cylinder("metal", wheelIron, {
    radius: 0.24,
    length: width * 0.4,
    at: [0, 0, 0],
    axis: "x",
    segments: 16,
  });
};

const buildGate = (builder: AttractionBuilder) => {
  const width = raceEast - raceWest - 0.08;
  builder.box("matte", gateTimber, [width, 0.7, 0.08], [0, 0.35, 0]);
  [0.15, 0.35, 0.55].forEach((y) => {
    builder.box(
      "matte",
      shade(gateTimber, 0.8),
      [width + 0.02, 0.04, 0.1],
      [0, y, 0],
    );
  });
  builder.box("metal", palette.darkSteel, [0.06, 1.2, 0.06], [0, 1.25, 0]);
};

const pond = { x: 3.5, z: -0.8, radius: 1.6 };

const buildPond = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 12 : 32;
  builder.cylinder("matte", raceStone, {
    radius: pond.radius + 0.18,
    length: 0.14,
    at: [pond.x, 0.07, pond.z],
    segments,
  });
  builder.cylinder("water", streamBlue, {
    radius: pond.radius,
    length: 0.06,
    at: [pond.x, 0.12, pond.z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  /* Lily pads, one in flower */
  [
    [0.6, 0.4],
    [-0.7, 0.5],
    [0.2, -0.9],
    [-0.3, -0.2],
  ].forEach(([dx, dz], index) => {
    builder.cylinder("matte", "#4f8a3a", {
      radius: 0.2 - index * 0.02,
      length: 0.02,
      at: [pond.x + dx, 0.16, pond.z + dz],
      segments: 12,
    });
  });
  builder.sphere(
    "paint",
    "#f2b6c8",
    0.07,
    [pond.x + 0.6, 0.2, pond.z + 0.4],
    [1, 0.6, 1],
    8,
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  buildPond(builder);
  builder.box(
    "matte",
    palette.path,
    [1.2, 0.03, 3.2],
    [house.x + 0.5, 0.015, house.z + house.depth / 2 + 1.6],
  );
  builder.box(
    "matte",
    palette.path,
    [3.6, 0.03, 0.9],
    [raceMiddle + 1.3, 0.015, (bridge.minZ + bridge.maxZ) / 2],
  );
  if (builder.isFar) {
    return;
  }
  /* An old millstone leaning against the wall, with its grooves */
  const stoneAt: Triple = [
    house.x - 1.0,
    0.62,
    house.z + house.depth / 2 + 0.25,
  ];
  builder.cylinder("matte", "#a39a8d", {
    radius: 0.6,
    length: 0.22,
    at: stoneAt,
    axis: "z",
    segments: 28,
  });
  builder.cylinder("matte", "#6f685e", {
    radius: 0.12,
    length: 0.24,
    at: stoneAt,
    axis: "z",
    segments: 12,
  });
  for (let groove = 0; groove < 8; groove++) {
    const angle = (groove / 8) * Math.PI * 2;
    builder.box(
      "matte",
      "#8a8276",
      [0.03, 0.42, 0.02],
      [
        stoneAt[0] + Math.sin(angle) * 0.33,
        stoneAt[1] + Math.cos(angle) * 0.33,
        stoneAt[2] + 0.115,
      ],
      [0, 0, -angle],
    );
  }
  /* Sacks of flour by the door */
  [
    [house.x + 1.35, 0.3, house.z + house.depth / 2 + 0.35],
    [house.x + 1.25, 0.3, house.z + house.depth / 2 + 0.8],
  ].forEach(([x, y, z], index) => {
    builder.roundedBox(
      "matte",
      palette.cream,
      [0.42, 0.6, 0.34],
      0.13,
      [x, y, z],
      [0, index * 0.6, 0],
    );
  });
  /* Reeds and bushes along the stream */
  [
    [raceEast + 0.6, -4.6],
    [raceEast + 0.7, -1.2],
    [raceWest - 0.55, 4.6],
    [raceEast + 0.9, 4.4],
  ].forEach(([x, z], index) => {
    for (let reed = 0; reed < 5; reed++) {
      const lean = (reed - 2) * 0.12;
      builder.bar(
        "matte",
        "#6e8f3a",
        [x + reed * 0.06, 0, z],
        [x + reed * 0.06 + lean, 0.75 + (reed % 2) * 0.2, z + lean * 0.5],
        0.03,
        4,
      );
    }
    builder.box(
      "matte",
      "#5a3b22",
      [0.05, 0.16, 0.05],
      [x + 0.1, 0.8 + (index % 2) * 0.15, z],
    );
  });
  addBush(builder, [4.9, 0, 1.4], 0.55);
  addBush(builder, [-4.6, 0, -2.4], 0.5);
  addBush(builder, [-3.4, 0, 3.6], 0.45, "#3d7a34");
};

const buildDuck = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#f3efe2", 0.13, [0, 0.08, 0], [1, 0.7, 1.4], 10);
  builder.sphere("paint", "#2f6b3a", 0.07, [0, 0.2, 0.14], [1, 1, 1], 8);
  builder.box("paint", "#e29a2c", [0.05, 0.03, 0.08], [0, 0.19, 0.22]);
};

export const waterMillModel: CuriosityModel = {
  kind: "water-mill",
  islandId: "meadow-isle",
  name: "Water Mill",
  fact: "A water mill uses a flowing stream to grind grain into flour. The stream is led along a channel called a mill race, where it pushes the paddles of a big wooden wheel. The wheel turns an axle that turns the millstones inside. Water mills were working in England when the Domesday Book was written, over 900 years ago.",
  curriculumLink:
    "Geography, Key Stage 1: use basic geographical vocabulary to refer to key physical and human features, including river and stream.",
  footprint: 6.2,
  setting: "inland",
  signSpot: { x: 3.2, z: 4.4 },
  build: (builder) => {
    buildHouse(builder);
    buildRace(builder);
    buildBridge(builder);
    buildGrounds(builder);
    if (builder.isFar) {
      builder.cylinder("matte", wheelTimber, {
        radius: wheelRadius,
        length: 0.5,
        at: wheelAt,
        axis: "x",
        segments: 12,
      });
    }
    addSignBoard(builder, [3.2, 0, 4.4], signColour);
  },
  moving: [
    {
      name: "wheel",
      pivot: wheelAt,
      build: buildWheel,
      motion: { kind: "whirl", axis: "x", idle: 0.45, speed: 1.4, reach: 8 },
    },
    {
      name: "sluice gate",
      pivot: gateAt,
      build: buildGate,
      motion: { kind: "rise", reach: 6, height: 0.55, period: 2.4 },
    },
  ],
  wanderers: [
    {
      name: "ducks",
      build: buildDuck,
      count: 3,
      centre: { x: pond.x, z: pond.z },
      radius: 1.1,
      height: 0.12,
      speed: 0.4,
    },
  ],
  smoke: [
    {
      at: [house.x - 0.9, house.height + 2.25, house.z - 0.9],
      colour: "#d8d4cc",
      puffs: 5,
      size: 0.14,
      rise: 1.6,
      spread: 0.3,
    },
  ],
  decks: [
    buildFlatDeck(
      {
        minX: raceWest - 0.6,
        maxX: raceEast + 0.6,
        minZ: bridge.minZ,
        maxZ: bridge.maxZ,
      },
      bridgeHeight,
    ),
  ],
  blockers: [
    ...[-0.75, 0.75].flatMap((offset) =>
      listWallBlockers(
        { x: house.x - 0.6, z: house.z + offset },
        { x: houseEast - 1.0, z: house.z + offset },
        1.05,
        0.5,
      ),
    ),
    { x: pond.x, z: pond.z, radius: pond.radius },
    ...[raceWest - 0.12, raceEast + 0.12].flatMap((x) => [
      ...listWallBlockers(
        { x, z: -raceEnd },
        { x, z: bridge.minZ - 0.05 },
        0.22,
        0.35,
      ),
      ...listWallBlockers(
        { x, z: bridge.maxZ + 0.05 },
        { x, z: raceEnd },
        0.22,
        0.35,
      ),
    ]),
    { x: raceMiddle, z: house.z, radius: 0.5 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Open the sluice gate",
    news: "Splash! The water rushed down the mill race and the great wheel turned faster and faster.",
  },
};
