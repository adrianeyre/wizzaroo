import { LatheGeometry, Vector2 } from "three";
import {
  addSignBoard,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e6c98f";
const castleSand = "#e0b877";
const castleLight = "#ecc98c";
const castleDark = "#c79a5c";
const wetSand = "#b88f5a";
const moatBlue = "#4aa6c8";
const lollyStick = "#e8d2a0";
const flagRed = "#e0453a";
const flagBlue = "#3a7ae0";
const flagYellow = "#f2c230";
const bucketColours = ["#e0453a", "#3a7ae0", "#2fae6a"];
const signColour = "#c0603a";

const moundRadius = 2.2;
const moundTop = 0.25;
const moatOuter = 3.1;
const bankOuter = 3.55;
const bankTop = 0.14;
const waterLevel = 0.07;
const towers: LocalPoint[] = [
  { x: -1.25, z: 0.9 },
  { x: 1.25, z: 0.9 },
  { x: 1.25, z: -1.35 },
  { x: -1.25, z: -1.35 },
];
const keepAt: LocalPoint = { x: 0, z: -0.25 };
const keepTop = moundTop + 1.45;
const upperTop = keepTop + 0.85;
const gateZ = 0.9 + 0.18;
const drawbridgeHinge: Triple = [0, moundTop + 0.02, gateZ + 0.02];
const bridge = { halfWidth: 0.45, fromZ: 1.85, toZ: 3.75, height: 0.22 };
const flagPivot: Triple = [keepAt.x, upperTop + 0.95, keepAt.z];

/** A bucket-shaped tower, wider at the bottom, with battlements round its top. */
const addBucketTower = (
  builder: AttractionBuilder,
  { x, z }: LocalPoint,
  base: number,
  radius: number,
  height: number,
  colour: string,
  merlons: number,
) => {
  builder.cylinder("matte", colour, {
    radius,
    radiusEnd: radius * 0.85,
    length: height,
    at: [x, base + height / 2, z],
    segments: builder.isFar ? 10 : 22,
  });
  if (builder.isFar) {
    return;
  }
  /* The ridges a bucket leaves, and the battlements */
  [0.22, 0.78].forEach((share) => {
    builder.cylinder("matte", shade(colour, 0.9), {
      radius: radius * (1 - share * 0.15) + 0.015,
      length: 0.05,
      at: [x, base + height * share, z],
      segments: 22,
      isOpen: true,
    });
  });
  const top = base + height;
  const rim = radius * 0.85;
  listRingPoints(rim - 0.07, merlons, { x, z }).forEach((point, index) => {
    builder.box(
      "matte",
      shade(colour, 1.05),
      [0.16, 0.18, 0.13],
      [point.x, top + 0.09, point.z],
      [0, (index / merlons) * Math.PI * 2, 0],
    );
  });
  /* Arrow slits all the way round */
  [0.5, 2.6, 4.7].forEach((angle) => {
    const out = radius * (1 - 0.55 * 0.15) + 0.005;
    builder.box(
      "matte",
      "#5a3e22",
      [0.06, 0.24, 0.03],
      [
        x + Math.sin(angle) * out,
        base + height * 0.55,
        z + Math.cos(angle) * out,
      ],
      [0, angle, 0],
    );
  });
};

/** A pointed turret roof with a pennant on top. */
const addTurret = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  colour: string,
  flag: string,
) => {
  const [x, y, z] = at;
  builder.cylinder("matte", colour, {
    radius,
    radiusEnd: 0,
    length: radius * 1.6,
    at: [x, y + radius * 0.8, z],
    segments: builder.isFar ? 8 : 18,
  });
  if (builder.isFar) {
    return;
  }
  const top = y + radius * 1.6;
  builder.bar(
    "matte",
    palette.darkTimber,
    [x, top - 0.05, z],
    [x, top + 0.45, z],
    0.025,
    5,
  );
  builder.box(
    "paint",
    flag,
    [0.02, 0.16, 0.26],
    [x, top + 0.36, z + 0.13],
    [0, 0, 0],
  );
};

/* The castle on its mound */

const buildCastle = (builder: AttractionBuilder) => {
  builder.cylinder("matte", wetSand, {
    radius: moundRadius,
    radiusEnd: moundRadius - 0.1,
    length: moundTop,
    at: [0, moundTop / 2, 0],
    segments: builder.isFar ? 14 : 36,
  });
  /* Walls between the towers, with battlements */
  const wallHeight = 0.75;
  towers.forEach((from, index) => {
    const to = towers[(index + 1) % towers.length];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const turn = Math.atan2(to.x - from.x, to.z - from.z);
    const middle: Triple = [
      (from.x + to.x) / 2,
      moundTop + wallHeight / 2,
      (from.z + to.z) / 2,
    ];
    builder.box("matte", castleSand, [0.3, wallHeight, length], middle, [
      0,
      turn,
      0,
    ]);
    if (builder.isFar) {
      return;
    }
    const merlons = Math.round(length / 0.34);
    for (let merlon = 1; merlon < merlons; merlon += 2) {
      const share = merlon / merlons;
      builder.box(
        "matte",
        castleLight,
        [0.3, 0.16, 0.17],
        [
          from.x + (to.x - from.x) * share,
          moundTop + wallHeight + 0.08,
          from.z + (to.z - from.z) * share,
        ],
        [0, turn, 0],
      );
    }
    /* Shell decorations pressed into the outside of the wall */
    const outward =
      Math.sign(Math.cos(turn) * middle[0] - Math.sin(turn) * middle[2]) || 1;
    [0.3, 0.7].forEach((share) => {
      builder.sphere(
        "paint",
        index % 2 === 0 ? "#f4d6c8" : "#f2efe6",
        0.07,
        [
          from.x + (to.x - from.x) * share + Math.cos(turn) * 0.15 * outward,
          moundTop + wallHeight * 0.55,
          from.z + (to.z - from.z) * share - Math.sin(turn) * 0.15 * outward,
        ],
        [1, 1, 0.5],
        8,
      );
    });
  });
  /* The four corner towers and the keep */
  towers.forEach((point, index) => {
    const height = index < 2 ? 1.2 : 1.45;
    addBucketTower(
      builder,
      point,
      moundTop,
      0.5,
      height,
      index % 2 === 0 ? castleSand : castleLight,
      8,
    );
    if (index >= 2) {
      addTurret(
        builder,
        [point.x, moundTop + height, point.z],
        0.36,
        castleDark,
        index === 2 ? flagBlue : flagYellow,
      );
    }
  });
  addBucketTower(
    builder,
    keepAt,
    moundTop,
    0.95,
    keepTop - moundTop,
    castleLight,
    12,
  );
  addBucketTower(
    builder,
    keepAt,
    keepTop,
    0.6,
    upperTop - keepTop,
    castleSand,
    9,
  );
  builder.bar(
    "matte",
    palette.darkTimber,
    [flagPivot[0], upperTop, flagPivot[2]],
    [flagPivot[0], flagPivot[1] + 0.35, flagPivot[2]],
    0.04,
    6,
  );
  if (builder.isFar) {
    builder.box(
      "matte",
      castleDark,
      [0.5, 0.6, 0.05],
      [0, moundTop + 0.3, gateZ + 0.02],
    );
    return;
  }
  /* The gatehouse arch, dark inside, with a portcullis */
  builder.box(
    "matte",
    castleLight,
    [0.95, 1.0, 0.36],
    [0, moundTop + 0.5, 0.9],
  );
  builder.box(
    "matte",
    "#4a3420",
    [0.5, 0.45, 0.04],
    [0, moundTop + 0.24, gateZ + 0.01],
  );
  builder.cylinder("matte", "#4a3420", {
    radius: 0.25,
    length: 0.04,
    at: [0, moundTop + 0.46, gateZ + 0.01],
    axis: "z",
    segments: 14,
  });
  [-0.15, 0, 0.15].forEach((x) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.025, 0.55, 0.02],
      [x, moundTop + 0.4, gateZ + 0.03],
    );
  });
  builder.box(
    "metal",
    palette.darkSteel,
    [0.48, 0.025, 0.02],
    [0, moundTop + 0.35, gateZ + 0.03],
  );
  [-1, 0, 1].forEach((step) => {
    builder.box(
      "matte",
      castleLight,
      [0.18, 0.16, 0.36],
      [step * 0.33, moundTop + 1.08, 0.9],
    );
  });
  /* Windows in the keep */
  [-0.5, 0.5].forEach((angle) => {
    const out = 0.9;
    builder.cylinder("matte", "#4a3420", {
      radius: 0.1,
      length: 0.04,
      at: [
        keepAt.x + Math.sin(angle) * out,
        moundTop + 1.0,
        keepAt.z + Math.cos(angle) * out,
      ],
      axis: "z",
      segments: 10,
    });
  });
  /* A spiral of shells up the keep's upper tier */
  for (let shell = 0; shell < 6; shell++) {
    const angle = shell * 1.1;
    builder.sphere(
      "paint",
      shell % 2 === 0 ? "#f6c6b8" : "#fff4e0",
      0.06,
      [
        keepAt.x + Math.sin(angle) * 0.57,
        keepTop + 0.15 + shell * 0.11,
        keepAt.z + Math.cos(angle) * 0.57,
      ],
      [1, 0.8, 0.5],
      7,
    );
  }
};

/* The moat, its bank, and the lolly-stick bridge */

const buildMoat = (builder: AttractionBuilder) => {
  builder.cylinder("water", moatBlue, {
    radius: moatOuter,
    length: 0.03,
    at: [0, waterLevel, 0],
    segments: builder.isFar ? 14 : 40,
  });
  builder.cylinder("matte", wetSand, {
    radius: moatOuter,
    length: 0.03,
    at: [0, 0.02, 0],
    segments: builder.isFar ? 14 : 40,
  });
  /* The heaped-up bank round the outside */
  builder.add(
    "matte",
    castleDark,
    new LatheGeometry(
      [
        [moatOuter - 0.05, 0],
        [moatOuter + 0.1, bankTop],
        [bankOuter - 0.15, bankTop + 0.02],
        [bankOuter, 0],
      ].map(([radius, height]) => new Vector2(radius, height)),
      builder.isFar ? 14 : 40,
    ),
    {},
    0.9,
  );
  /* The bridge of lolly sticks over the moat */
  builder.box(
    "matte",
    lollyStick,
    [bridge.halfWidth * 2, 0.04, bridge.toZ - bridge.fromZ],
    [0, bridge.height - 0.02, (bridge.fromZ + bridge.toZ) / 2],
  );
  if (builder.isFar) {
    return;
  }
  const sticks = 11;
  for (let stick = 0; stick < sticks; stick++) {
    const z =
      bridge.fromZ +
      0.08 +
      stick * ((bridge.toZ - bridge.fromZ - 0.16) / (sticks - 1));
    const colour = stick % 2 === 0 ? lollyStick : shade(lollyStick, 0.94);
    builder.box(
      "matte",
      colour,
      [bridge.halfWidth * 2, 0.03, 0.14],
      [0, bridge.height + 0.015, z],
    );
    /* Each stick's rounded ends */
    [-1, 1].forEach((end) => {
      builder.cylinder("matte", colour, {
        radius: 0.07,
        length: 0.03,
        at: [end * bridge.halfWidth, bridge.height + 0.015, z],
        segments: 6,
      });
    });
  }
  [-1, 1].forEach((side) => {
    [
      bridge.fromZ + 0.1,
      (bridge.fromZ + bridge.toZ) / 2,
      bridge.toZ - 0.1,
    ].forEach((z) => {
      builder.box(
        "matte",
        lollyStick,
        [0.05, 0.42, 0.05],
        [side * (bridge.halfWidth + 0.02), bridge.height + 0.21, z],
      );
    });
    builder.box(
      "matte",
      shade(lollyStick, 0.92),
      [0.05, 0.05, bridge.toZ - bridge.fromZ],
      [
        side * (bridge.halfWidth + 0.02),
        bridge.height + 0.42,
        (bridge.fromZ + bridge.toZ) / 2,
      ],
    );
    /* Pillars under the bridge, standing in the water */
    builder.box(
      "matte",
      lollyStick,
      [0.06, bridge.height, 0.06],
      [side * (bridge.halfWidth - 0.05), bridge.height / 2, 2.65],
    );
  });
  /* Ripples on the water */
  [0.6, 2.4, 4.1].forEach((angle) => {
    builder.torus(
      "water",
      "#bfe6f2",
      0.16,
      0.012,
      [Math.sin(angle) * 2.65, waterLevel + 0.02, Math.cos(angle) * 2.65],
      "y",
      12,
    );
  });
};

/* Buckets, spades, shells and a starfish on the sand */

const addBucket = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  isUpsideDown: boolean,
) => {
  const [x, y, z] = at;
  const profile: [number, number][] = isUpsideDown
    ? [
        [0, 0.36],
        [0.15, 0.36],
        [0.2, 0.02],
        [0.22, 0],
        [0.18, 0],
      ]
    : [
        [0, 0],
        [0.15, 0],
        [0.2, 0.34],
        [0.22, 0.36],
        [0.19, 0.36],
        [0.15, 0.03],
      ];
  builder.lathe("paint", colour, profile, [x, y, z], "y", 16);
  if (isUpsideDown) {
    return;
  }
  builder.cylinder("matte", castleSand, {
    radius: 0.17,
    length: 0.02,
    at: [x, y + 0.3, z],
    segments: 14,
  });
  builder.torus(
    "paint",
    shade(colour, 0.8),
    0.2,
    0.012,
    [x, y + 0.36, z],
    "x",
    12,
  );
};

const addSpade = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  colour: string,
) => {
  const [x, y, z] = at;
  const along = (distance: number, up: number): Triple => [
    x + Math.sin(turn) * distance,
    y + up,
    z + Math.cos(turn) * distance,
  ];
  builder.bar("paint", colour, along(-0.4, 0.03), along(0.15, 0.03), 0.04, 6);
  builder.box("paint", colour, [0.14, 0.03, 0.06], along(-0.42, 0.03), [
    0,
    turn + Math.PI / 2,
    0,
  ]);
  builder.box("metal", palette.steel, [0.16, 0.02, 0.2], along(0.25, 0.02), [
    0,
    turn,
    0,
  ]);
};

const buildBeach = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  addBucket(builder, [-2.7, 0, 2.9], bucketColours[0], false);
  addBucket(builder, [3.5, 0, 1.6], bucketColours[1], true);
  addBucket(builder, [-3.9, 0, -0.6], bucketColours[2], true);
  addSpade(builder, [-2.15, 0, 3.3], 0.6, flagYellow);
  addSpade(builder, [3.1, 0, -2.6], -1.2, flagBlue);
  /* A little bucket-shaped castle, freshly turned out */
  builder.cylinder("matte", castleLight, {
    radius: 0.2,
    radiusEnd: 0.16,
    length: 0.34,
    at: [3.95, 0.17, 1.15],
    segments: 14,
  });
  /* Scallop shells with ribs, and a twisty whelk */
  [
    { x: 2.2, z: 3.6, turn: 0.3, colour: "#f6c6b8" },
    { x: -1.4, z: 4.2, turn: -0.8, colour: "#fff0d8" },
    { x: -4.0, z: 1.5, turn: 1.4, colour: "#f2b48c" },
  ].forEach(({ x, z, turn, colour }) => {
    builder.sphere("paint", colour, 0.14, [x, 0.02, z], [1, 0.35, 0.9], 10);
    for (let rib = -2; rib <= 2; rib++) {
      builder.box(
        "paint",
        shade(colour, 0.85),
        [0.015, 0.02, 0.22],
        [
          x + Math.sin(turn + rib * 0.3) * 0.04,
          0.05,
          z + Math.cos(turn + rib * 0.3) * 0.04,
        ],
        [0, turn + rib * 0.3, 0],
      );
    }
  });
  builder.cylinder("paint", "#f0d8b0", {
    radius: 0.09,
    radiusEnd: 0,
    length: 0.26,
    at: [3.9, 0.08, -1.0],
    axis: "x",
    segments: 10,
  });
  builder.torus("paint", "#c89a6a", 0.06, 0.02, [3.85, 0.08, -1.0], "x", 10);
  /* A starfish */
  const star: Triple = [-3.3, 0.03, 2.3];
  for (let arm = 0; arm < 5; arm++) {
    const angle = (arm / 5) * Math.PI * 2;
    builder.box(
      "paint",
      "#f07a3a",
      [0.07, 0.04, 0.2],
      [
        star[0] + Math.sin(angle) * 0.09,
        star[1],
        star[2] + Math.cos(angle) * 0.09,
      ],
      [0, angle, 0],
    );
  }
  builder.sphere("paint", "#f07a3a", 0.06, star, [1, 0.5, 1], 8);
  /* A heap of dug-out sand by the moat, and footprints */
  builder.sphere("matte", castleDark, 0.5, [-3.6, 0, -2.2], [1, 0.45, 0.8], 12);
  [
    [0.5, 4.2],
    [0.75, 4.55],
    [0.45, 4.85],
  ].forEach(([x, z]) => {
    builder.sphere(
      "matte",
      shade(sand, 0.86),
      0.09,
      [x, 0, z],
      [0.75, 0.12, 1.35],
      6,
    );
  });
};

/* The moving parts */

const buildDrawbridge = (builder: AttractionBuilder) => {
  /* Hinged at its bottom edge and raised a little way, it nods up and down */
  const tilt = -0.55;
  const length = 0.55;
  const along = (distance: number, up: number): Triple => [
    0,
    Math.sin(-tilt) * distance + Math.cos(-tilt) * up,
    Math.cos(-tilt) * distance - Math.sin(-tilt) * up,
  ];
  builder.box(
    "matte",
    palette.timber,
    [0.5, 0.04, length],
    along(length / 2, 0.02),
    [tilt, 0, 0],
  );
  [0.1, 0.25, 0.4].forEach((distance) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.52, 0.02, 0.04],
      along(distance, 0.05),
      [tilt, 0, 0],
    );
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [side * 0.22, along(length, 0.04)[1], along(length, 0.04)[2]],
      [side * 0.22, 0.75, -0.05],
      0.015,
      4,
    );
  });
};

const buildFlag = (builder: AttractionBuilder) => {
  builder.sphere("paint", flagYellow, 0.06, [0, 0.4, 0], [1, 1, 1], 8);
  builder.box("paint", flagRed, [0.02, 0.3, 0.5], [0, 0.18, 0.27]);
  builder.box("paint", flagYellow, [0.025, 0.08, 0.5], [0, 0.18, 0.27]);
  builder.cylinder("paint", flagRed, {
    radius: 0.15,
    radiusEnd: 0.0,
    length: 0.25,
    at: [0, 0.18, 0.64],
    axis: "z",
    segments: 4,
  });
};

const buildCrab = (builder: AttractionBuilder) => {
  const shell = "#e0603a";
  builder.sphere("paint", shell, 0.1, [0, 0.07, 0], [1.3, 0.55, 1], 10);
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      shell,
      [side * 0.03, 0.12, 0.06],
      [side * 0.03, 0.17, 0.07],
      0.015,
      4,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.018,
      [side * 0.03, 0.18, 0.07],
      [1, 1, 1],
      5,
    );
    for (let leg = 0; leg < 3; leg++) {
      const z = 0.04 - leg * 0.05;
      builder.bar(
        "paint",
        shade(shell, 0.85),
        [side * 0.1, 0.06, z],
        [side * 0.2, 0, z - 0.02],
        0.02,
        3,
      );
    }
    builder.bar(
      "paint",
      shell,
      [side * 0.1, 0.07, 0.04],
      [side * 0.15, 0.08, 0.13],
      0.03,
      4,
    );
    builder.sphere(
      "paint",
      shade(shell, 1.1),
      0.045,
      [side * 0.15, 0.09, 0.16],
      [1, 0.7, 1.2],
      6,
    );
  });
};

const decks: Deck[] = [
  ({ x, z }) =>
    Math.abs(x) <= bridge.halfWidth && z >= bridge.fromZ && z <= bridge.toZ
      ? { height: bridge.height, kind: "bridge" }
      : undefined,
  ({ x, z }) =>
    Math.hypot(x, z) <= moundRadius
      ? { height: moundTop, kind: "ground" }
      : undefined,
];

const castleBlockers: LocalBlocker[] = [
  { x: keepAt.x, z: keepAt.z, radius: 1.0 },
  ...towers.map(({ x, z }) => ({ x, z, radius: 0.55 })),
  ...towers.flatMap((from, index) => {
    const to = towers[(index + 1) % towers.length];
    return Array.from({ length: 5 }, (_, step) => ({
      x: from.x + ((to.x - from.x) * (step + 1)) / 6,
      z: from.z + ((to.z - from.z) * (step + 1)) / 6,
      radius: 0.3,
    }));
  }),
];

export const giantSandcastleModel: CuriosityModel = {
  kind: "giant-sandcastle",
  islandId: "sunscorch-sands",
  name: "Giant Sandcastle",
  fact: "Sand is made of tiny grains of rock, worn down by wind, rain and waves over thousands of years. Most sand grains are a mineral called quartz. Dry sand runs through your fingers, but a little water sticks the grains together, which is why sandcastles need damp sand. Soil is rock grains like these mixed with rotted plants and animals.",
  curriculumLink:
    "Science, Year 3: rocks. Recognise that soils are made from rocks and organic matter, and compare and group different kinds of rocks.",
  footprint: 5,
  setting: "inland",
  signSpot: { x: 1.9, z: 4.1 },
  padColour: sand,
  build: (builder) => {
    buildMoat(builder);
    buildCastle(builder);
    buildBeach(builder);
    if (builder.isFar) {
      builder.box(
        "paint",
        flagRed,
        [0.02, 0.3, 0.5],
        [flagPivot[0], flagPivot[1] + 0.18, flagPivot[2] + 0.27],
      );
    }
    addSignBoard(builder, [1.9, 0, 4.1], signColour);
  },
  moving: [
    {
      name: "drawbridge",
      pivot: drawbridgeHinge,
      build: buildDrawbridge,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.45,
        period: 2.6,
      },
    },
    {
      name: "flag",
      pivot: flagPivot,
      build: buildFlag,
      motion: { kind: "whirl", axis: "y", idle: 0.4, speed: 3, reach: 8 },
    },
  ],
  wanderers: [
    {
      name: "crabs",
      build: buildCrab,
      count: 3,
      centre: { x: -3.5, z: 1.2 },
      radius: 1.0,
      speed: 0.5,
    },
  ],
  decks,
  blockers: castleBlockers satisfies LocalBlocker[],
  play: {
    label: "Add a tower",
    news: "Pat, pat, flip! You turned out a bucket of damp sand, and a brand-new tower stood up tall beside the moat.",
  },
};
