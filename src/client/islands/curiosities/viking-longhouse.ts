import { BoxGeometry } from "three";
import {
  addGableRoof,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ashGround = "#5e5046";
const plankTimber = "#7a5232";
const plankDark = "#5a3a22";
const footingStone = "#6f6660";
const turf = "#5f7a3c";
const turfDark = "#4a6230";
const earth = "#5a4030";
const carvingRed = "#a8402e";
const carvingOchre = "#d9a441";
const hearthStone = "#7d746c";
const ember = "#ff6a1f";
const emberCore = "#ffc04a";
const wool = ["#e9dcc0", "#a8402e", "#2f5d8a", "#d9a441"];
const signColour = "#5a3a22";

const house = { length: 5.4, width: 2.6, wall: 1.5, rise: 1.55 };
const halfLength = house.length / 2;
const halfWidth = house.width / 2;
const door = { width: 0.8, height: 1.3, x: 0.3 };
const doorHinge: Triple = [door.x - door.width / 2, 0, halfWidth + 0.02];
const doorRest = 0.55;
const hearthAt: Triple = [0.2, 0, 0.1];
const loomAt: Triple = [2.0, 0, 2.05];
const smokeHole: Triple = [-0.6, house.wall + house.rise + 0.15, 0];

const buildWalls = (builder: AttractionBuilder) => {
  const { wall } = house;
  /* A low footing of stones under the timber walls */
  builder.box(
    "matte",
    footingStone,
    [house.length + 0.12, 0.25, house.width + 0.12],
    [0, 0.125, 0],
  );
  /* The back wall and the two end walls, all of upright planks */
  builder.box(
    "matte",
    plankTimber,
    [house.length, wall, 0.18],
    [0, wall / 2, -halfWidth + 0.09],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      plankTimber,
      [0.18, wall, house.width],
      [side * (halfLength - 0.09), wall / 2, 0],
    );
  });
  /* The front wall, in pieces round the doorway */
  const doorLeft = door.x - door.width / 2;
  const doorRight = door.x + door.width / 2;
  const frontZ = halfWidth - 0.09;
  builder.box(
    "matte",
    plankTimber,
    [doorLeft + halfLength, wall, 0.18],
    [(doorLeft - halfLength) / 2, wall / 2, frontZ],
  );
  builder.box(
    "matte",
    plankTimber,
    [halfLength - doorRight, wall, 0.18],
    [(doorRight + halfLength) / 2, wall / 2, frontZ],
  );
  builder.box(
    "matte",
    plankTimber,
    [door.width, wall - door.height, 0.18],
    [door.x, (wall + door.height) / 2, frontZ],
  );
  addGableRoof(builder, {
    width: house.length,
    depth: house.width,
    rise: house.rise,
    at: [0, wall, 0],
    colour: turfDark,
    overhang: 0.35,
    thickness: 0.34,
  });
  /* The gable ends and the loft, a triangular prism under the roof */
  const halfDiagonal = halfWidth;
  builder.add(
    "matte",
    shade(plankTimber, 0.92),
    new BoxGeometry(
      house.length - 0.02,
      halfDiagonal * Math.SQRT2,
      halfDiagonal * Math.SQRT2,
    )
      .rotateX(Math.PI / 4)
      .scale(1, (house.rise - 0.05) / halfDiagonal, 1),
    { at: [0, wall, 0] },
    undefined,
  );
  if (builder.isFar) {
    return;
  }
  /* Lines between the planks on the long walls */
  for (let plank = 0; plank < 16; plank++) {
    const x = -halfLength + 0.25 + plank * 0.33;
    if (Math.abs(x - door.x) < door.width / 2 + 0.05) {
      continue;
    }
    builder.box(
      "matte",
      plankDark,
      [0.03, wall - 0.3, 0.01],
      [x, wall / 2 + 0.1, halfWidth + 0.005],
    );
  }
  /* The doorway's carved posts and lintel */
  [door.x - door.width / 2 - 0.06, door.x + door.width / 2 + 0.06].forEach(
    (x) => {
      builder.box(
        "matte",
        plankDark,
        [0.12, door.height + 0.1, 0.24],
        [x, (door.height + 0.1) / 2, halfWidth - 0.08],
      );
      for (let band = 0; band < 4; band++) {
        builder.box(
          "paint",
          band % 2 === 0 ? carvingRed : carvingOchre,
          [0.13, 0.05, 0.25],
          [x, 0.3 + band * 0.28, halfWidth - 0.08],
        );
      }
    },
  );
  builder.box(
    "matte",
    plankDark,
    [door.width + 0.3, 0.14, 0.26],
    [door.x, door.height + 0.08, halfWidth - 0.08],
  );
  /* A turf skin on the roof, with tufts of grass and wild flowers */
  const slope = Math.atan2(house.rise, halfWidth + 0.35);
  [-1, 1].forEach((side) => {
    for (let tuft = 0; tuft < 9; tuft++) {
      const share = 0.2 + ((tuft * 0.37) % 0.65);
      const x = -halfLength + 0.3 + tuft * 0.6;
      builder.sphere(
        "matte",
        tuft % 3 === 0 ? shade(turf, 1.15) : turf,
        0.18 + (tuft % 2) * 0.05,
        [
          x,
          house.wall + house.rise * (1 - share) + 0.2,
          side * (halfWidth + 0.35) * share,
        ],
        [1.6, 0.5, 1.1],
        7,
      );
    }
  });
  [
    { along: -1.6, up: 0.55, colour: "#f2d64b" },
    { along: 0.9, up: 0.35, colour: "#e9dcc0" },
    { along: 2.0, up: 0.7, colour: "#c86ad0" },
  ].forEach(({ along, up, colour }) => {
    builder.sphere(
      "matte",
      colour,
      0.05,
      [
        along,
        house.wall + house.rise * (1 - up) + 0.24,
        (halfWidth + 0.35) * up,
      ],
      [1, 0.6, 1],
      5,
    );
  });
  /* The turf's ragged edge along the eaves */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      earth,
      [house.length + 0.7, 0.18, 0.12],
      [0, house.wall - 0.15, side * (halfWidth + 0.38)],
      [side * slope, 0, 0],
    );
  });
  /* A louvred smoke hole on the ridge */
  builder.box(
    "matte",
    plankDark,
    [0.5, 0.2, 0.4],
    [smokeHole[0], smokeHole[1] - 0.1, 0],
  );
};

/** Crossed barge boards at each gable, carved into dragon heads. */
const buildGableCarvings = (builder: AttractionBuilder) => {
  const apexY = house.wall + house.rise + 0.2;
  const eaveZ = halfWidth + 0.4;
  const eaveY = house.wall - 0.05;
  [-1, 1].forEach((end) => {
    const x = end * (halfLength + 0.36);
    [-1, 1].forEach((side) => {
      const top: Triple = [x, apexY + 0.45, -side * 0.3];
      builder.bar(
        "matte",
        plankDark,
        [x, eaveY, side * eaveZ],
        top,
        0.14,
        builder.isFar ? 4 : 6,
      );
      if (builder.isFar) {
        return;
      }
      /* A dragon's head on the end of each board, curling outwards */
      builder.sphere("paint", carvingRed, 0.11, top, [1, 1, 1.4], 8);
      builder.bar(
        "paint",
        carvingRed,
        top,
        [x, top[1] + 0.05, top[2] - side * 0.22],
        0.08,
        5,
      );
      builder.sphere(
        "paint",
        carvingOchre,
        0.03,
        [x + end * 0.06, top[1] + 0.04, top[2]],
        [1, 1, 1],
        4,
      );
      for (let notch = 1; notch < 5; notch++) {
        const share = notch / 5;
        builder.box(
          "paint",
          carvingOchre,
          [0.16, 0.04, 0.04],
          [
            x,
            eaveY + (top[1] - eaveY) * share,
            side * eaveZ + (top[2] - side * eaveZ) * share,
          ],
        );
      }
    });
  });
};

/** Inside, seen through the door: a long hearth and benches along the walls. */
const buildInside = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const [x, , z] = hearthAt;
  builder.box("matte", hearthStone, [1.6, 0.12, 0.7], [x, 0.06, z]);
  builder.box("matte", "#2a2522", [1.4, 0.04, 0.5], [x, 0.13, z]);
  for (let lump = 0; lump < 6; lump++) {
    builder.sphere(
      lump % 2 === 0 ? "glow" : "matte",
      lump % 2 === 0 ? ember : "#2a2522",
      0.08,
      [x - 0.4 + lump * 0.16, 0.16, z + (lump % 2) * 0.1 - 0.05],
      [1, 0.6, 1],
      6,
    );
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      plankDark,
      [house.length - 0.6, 0.4, 0.45],
      [0, 0.2, side * (halfWidth - 0.4)],
    );
  });
  /* A cooking pot hanging over the fire from the roof beam */
  builder.bar(
    "metal",
    palette.darkSteel,
    [x, house.wall + 0.3, z],
    [x, 0.75, z],
    0.02,
    4,
  );
  builder.sphere("metal", palette.black, 0.18, [x, 0.6, z], [1, 0.8, 1], 10);
};

const buildDoor = (builder: AttractionBuilder) => {
  const { width, height } = door;
  const turn = doorRest;
  const along = (distance: number, up: number, out = 0): Triple => [
    Math.cos(turn) * distance + Math.sin(turn) * out,
    up,
    -Math.sin(turn) * distance + Math.cos(turn) * out,
  ];
  builder.box(
    "matte",
    shade(plankTimber, 1.1),
    [width, height - 0.02, 0.06],
    along(width / 2, height / 2),
    [0, turn, 0],
  );
  /* Iron straps and a ring handle */
  [0.25, height - 0.25].forEach((up) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [width * 0.85, 0.06, 0.02],
      along(width * 0.45, up, 0.04),
      [0, turn, 0],
    );
  });
  builder.torus(
    "metal",
    palette.darkSteel,
    0.05,
    0.012,
    along(width - 0.12, height / 2, 0.05),
    "z",
    10,
  );
  [0.2, 0.4, 0.6].forEach((share) => {
    builder.box(
      "matte",
      plankDark,
      [0.02, height - 0.1, 0.065],
      along(width * share + 0.07, height / 2),
      [0, turn, 0],
    );
  });
};

/** The fire's glow, which flares up inside as the Character comes near. */
const buildHearthGlow = (builder: AttractionBuilder) => {
  [
    [0, 0, 0.2, 0.55],
    [-0.35, 0.05, 0.14, 0.4],
    [0.35, -0.05, 0.15, 0.42],
  ].forEach(([x, z, radius, height], index) => {
    builder.cylinder("glow", index === 0 ? ember : emberCore, {
      radius,
      radiusEnd: 0.0,
      length: height,
      at: [x, height / 2, z],
      segments: 8,
    });
  });
  builder.sphere("glow", emberCore, 0.12, [0, 0.1, 0], [2.4, 0.6, 1.6], 10);
};

const buildLoom = (builder: AttractionBuilder) => {
  const [x, , z] = loomAt;
  const lean = 0.25;
  /* Two uprights leaning back against a cross beam */
  [-0.6, 0.6].forEach((side) => {
    builder.bar(
      "matte",
      plankDark,
      [x + side, 0, z],
      [x + side, 1.7, z - lean * 1.7],
      0.08,
      6,
    );
  });
  builder.cylinder("matte", plankTimber, {
    radius: 0.06,
    length: 1.4,
    at: [x, 1.62, z - lean * 1.62],
    axis: "x",
    segments: builder.isFar ? 4 : 10,
  });
  if (builder.isFar) {
    return;
  }
  /* The woven cloth at the top, striped in dyed wool */
  for (let stripe = 0; stripe < 5; stripe++) {
    const up = 1.5 - stripe * 0.1;
    builder.box(
      "matte",
      wool[stripe % wool.length],
      [1.1, 0.1, 0.02],
      [x, up, z - lean * up + 0.02],
      [-lean, 0, 0],
    );
  }
  /* Warp threads hanging down to their stone loom weights */
  for (let thread = 0; thread < 10; thread++) {
    const threadX = x - 0.5 + thread * 0.11;
    builder.bar(
      "matte",
      wool[0],
      [threadX, 1.0, z - lean + 0.02],
      [threadX, 0.32, z - lean * 0.32 + 0.02],
      0.012,
      3,
    );
    builder.torus(
      "matte",
      hearthStone,
      0.04,
      0.025,
      [threadX, 0.27, z - lean * 0.27 + 0.03],
      "z",
      8,
    );
  }
  /* A basket of wool balls beside it */
  builder.cylinder("matte", "#b08a52", {
    radius: 0.22,
    radiusEnd: 0.26,
    length: 0.25,
    at: [x + 0.95, 0.125, z + 0.2],
    segments: 12,
  });
  [0, 1, 2].forEach((ball) => {
    builder.sphere(
      "matte",
      wool[ball + 1],
      0.09,
      [x + 0.88 + ball * 0.08, 0.28, z + 0.15 + (ball % 2) * 0.1],
      [1, 1, 1],
      7,
    );
  });
};

/** The heddle rod, which the weaver pulls to and fro to change the shed. */
const buildHeddle = (builder: AttractionBuilder) => {
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.03,
    length: 1.3,
    at: [0, 0, 0],
    axis: "x",
    segments: 8,
  });
  /* The shuttle wound with red wool */
  builder.box(
    "matte",
    palette.paleTimber,
    [0.3, 0.05, 0.05],
    [0.2, -0.12, 0.04],
  );
  builder.sphere("matte", wool[1], 0.05, [0.2, -0.12, 0.04], [1.8, 1, 1], 6);
};

const buildYard = (builder: AttractionBuilder) => {
  /* A woodpile against the west end */
  const pileX = -halfLength - 0.85;
  builder.box("matte", plankDark, [0.75, 0.06, 1.8], [pileX, 0.03, 0]);
  if (builder.isFar) {
    builder.box("matte", plankTimber, [0.7, 0.8, 1.7], [pileX, 0.45, 0]);
    return;
  }
  for (let log = 0; log < 15; log++) {
    const row = Math.floor(log / 5);
    const along = -0.68 + (log % 5) * 0.34 + (row % 2) * 0.1;
    builder.cylinder("matte", log % 3 === 0 ? "#8a6240" : "#a07850", {
      radius: 0.14,
      length: 0.7,
      at: [pileX, 0.2 + row * 0.27, along],
      axis: "x",
      segments: 7,
    });
    builder.cylinder("matte", "#d9b98a", {
      radius: 0.11,
      length: 0.01,
      at: [pileX + 0.355, 0.2 + row * 0.27, along],
      axis: "x",
      segments: 7,
    });
  }
  /* A chopping block with an axe in it */
  builder.cylinder("matte", "#8a6240", {
    radius: 0.25,
    length: 0.42,
    at: [-2.4, 0.21, 2.15],
    segments: 12,
  });
  builder.bar(
    "matte",
    palette.paleTimber,
    [-2.4, 0.44, 2.1],
    [-2.15, 0.85, 2.3],
    0.05,
    5,
  );
  builder.box(
    "metal",
    palette.steel,
    [0.06, 0.16, 0.2],
    [-2.42, 0.48, 2.07],
    [0.6, 0, 0.3],
  );
  /* A carved rune stone with a painted serpent band */
  const runeAt: Triple = [3.55, 0, 1.2];
  builder.roundedBox(
    "matte",
    "#8d847c",
    [0.55, 1.3, 0.25],
    0.1,
    [runeAt[0], 0.65, runeAt[2]],
    [0, -0.4, 0],
  );
  [0.35, 0.6, 0.85, 1.1].forEach((up, index) => {
    builder.box(
      "paint",
      index % 2 === 0 ? carvingRed : "#2f2a28",
      [0.36, 0.05, 0.02],
      [
        runeAt[0] + Math.sin(-0.4) * 0.13,
        up,
        runeAt[2] + Math.cos(-0.4) * 0.13,
      ],
      [0, -0.4, 0],
    );
  });
  /* Shields propped by the door */
  [
    { x: door.x + 0.85, colour: carvingRed },
    { x: door.x + 1.35, colour: "#2f5d8a" },
  ].forEach(({ x, colour }) => {
    builder.cylinder("paint", colour, {
      radius: 0.3,
      length: 0.04,
      at: [x, 0.33, halfWidth + 0.15],
      axis: "z",
      segments: 16,
    });
    builder.sphere(
      "metal",
      palette.steel,
      0.07,
      [x, 0.33, halfWidth + 0.18],
      [1, 1, 0.6],
      6,
    );
  });
};

const buildGoat = (builder: AttractionBuilder) => {
  const coat = "#efe8dc";
  builder.sphere("matte", coat, 0.22, [0, 0.45, 0], [0.85, 0.8, 1.35], 9);
  builder.sphere("matte", coat, 0.12, [0, 0.62, 0.32], [0.85, 0.95, 1.2], 8);
  builder.sphere("matte", "#d9cbb8", 0.06, [0, 0.58, 0.45], [1, 0.8, 1], 6);
  [
    [-0.1, 0.18],
    [0.1, 0.18],
    [-0.1, -0.18],
    [0.1, -0.18],
  ].forEach(([x, z]) => {
    builder.box("matte", "#5a4a3a", [0.05, 0.3, 0.05], [x, 0.15, z]);
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#8a7a68",
      [side * 0.04, 0.72, 0.3],
      [side * 0.08, 0.82, 0.18],
      0.03,
      4,
    );
    builder.box("matte", coat, [0.1, 0.03, 0.05], [side * 0.11, 0.66, 0.3]);
  });
  builder.box("matte", "#d9cbb8", [0.03, 0.08, 0.03], [0, 0.48, 0.45]);
  builder.box("matte", coat, [0.04, 0.1, 0.04], [0, 0.6, -0.3]);
};

const buildChicken = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#b8743a", 0.1, [0, 0.16, 0], [0.9, 0.85, 1.2], 7);
  builder.sphere("matte", "#b8743a", 0.06, [0, 0.27, 0.08], [1, 1, 1], 6);
  builder.box("paint", carvingRed, [0.02, 0.05, 0.05], [0, 0.34, 0.08]);
  builder.box("paint", carvingOchre, [0.03, 0.02, 0.05], [0, 0.27, 0.15]);
  builder.box(
    "matte",
    "#5a3a22",
    [0.05, 0.08, 0.06],
    [0, 0.22, -0.12],
    [0.6, 0, 0],
  );
  [-0.04, 0.04].forEach((x) => {
    builder.box("paint", carvingOchre, [0.015, 0.08, 0.015], [x, 0.04, 0]);
  });
};

export const vikingLonghouseModel: CuriosityModel = {
  kind: "viking-longhouse",
  islandId: "ember-isle",
  name: "Viking Longhouse",
  fact: "Viking families who settled in Britain lived in longhouses. The whole family lived in one long room with a fire in the middle for warmth, cooking and light, and the smoke drifted out of a hole in the roof. Roofs were often covered in turf to keep the heat in. Vikings wove their own wool cloth on tall looms with stone weights.",
  curriculumLink:
    "History, Key Stage 2: the Viking and Anglo-Saxon struggle for the Kingdom of England, including Viking raids, invasion and settlement.",
  footprint: 5.2,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: -1.4, z: 4.3 },
  build: (builder) => {
    buildWalls(builder);
    buildGableCarvings(builder);
    buildInside(builder);
    buildLoom(builder);
    buildYard(builder);
    if (builder.isFar) {
      builder.box(
        "matte",
        plankTimber,
        [door.width, door.height, 0.06],
        [door.x, door.height / 2, halfWidth - 0.05],
      );
    }
    addSignBoard(builder, [-1.4, 0, 4.3], signColour);
  },
  moving: [
    {
      name: "door",
      pivot: doorHinge,
      build: buildDoor,
      motion: {
        kind: "nod",
        axis: "y",
        reach: 6,
        amplitude: doorRest,
        period: 3.2,
      },
    },
    {
      name: "hearth glow",
      pivot: [hearthAt[0], 0.14, hearthAt[2]],
      build: buildHearthGlow,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "heddle rod",
      pivot: [loomAt[0], 0.85, loomAt[2] - 0.25 * 0.85 + 0.08],
      build: buildHeddle,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.25,
        period: 1.6,
      },
    },
  ],
  wanderers: [
    {
      name: "goats",
      build: buildGoat,
      count: 2,
      centre: { x: 1.6, z: 3.4 },
      radius: 1.1,
      speed: 0.35,
    },
    {
      name: "chickens",
      build: buildChicken,
      count: 3,
      centre: { x: -2.6, z: 3.0 },
      radius: 0.9,
      speed: 0.5,
      bob: 0.03,
    },
  ],
  smoke: [
    {
      at: smokeHole,
      colour: "#b9b4ae",
      puffs: 6,
      size: 0.22,
      rise: 2.2,
      spread: 0.4,
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: -halfLength + 0.9, z: 0 },
      { x: halfLength - 0.9, z: 0 },
      1.35,
      0.6,
    ),
    { x: -halfLength + 0.4, z: 0.6, radius: 0.75 },
    { x: -halfLength + 0.4, z: -0.6, radius: 0.75 },
    { x: halfLength - 0.4, z: 0.6, radius: 0.75 },
    { x: halfLength - 0.4, z: -0.6, radius: 0.75 },
    { x: -halfLength - 0.85, z: 0.45, radius: 0.5 },
    { x: -halfLength - 0.85, z: -0.45, radius: 0.5 },
    { x: loomAt[0] - 0.4, z: loomAt[2] - 0.2, radius: 0.35 },
    { x: loomAt[0] + 0.4, z: loomAt[2] - 0.2, radius: 0.35 },
    { x: 3.55, z: 1.2, radius: 0.35 },
    { x: -2.4, z: 2.15, radius: 0.28 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Warm up by the hearth",
    news: "You sat by the crackling longhouse fire, warmed your hands and listened to a Viking saga about brave sailors and sea serpents.",
  },
};
