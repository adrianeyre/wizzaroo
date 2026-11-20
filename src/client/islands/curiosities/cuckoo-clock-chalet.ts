import { BoxGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  addBench,
  addDoor,
  addGableRoof,
  addSignBoard,
  addWindow,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowShadow = "#d9e3ea";
const chaletTimber = "#8a5532";
const chaletDark = "#5a341e";
const carvedPale = "#d8b384";
const roofShingle = "#4a3a32";
const shutterGreen = "#3f7a4f";
const heartRed = "#c8323a";
const caseBrown = "#6b3a1e";
const dialCream = "#f6efd9";
const cuckooBlue = "#4a6fa8";
const pineGreen = "#2d5640";
const signColour = "#3f7a4f";

const chalet = {
  x: 0,
  z: -1.4,
  width: 2.8,
  depth: 2.4,
  height: 2.0,
  rise: 1.4,
};
const front = chalet.z + chalet.depth / 2;
/* The clock hangs on the gable above the door, its face towards visitors */
const clockCase = { width: 0.72, bottom: 1.93, top: 2.88, depth: 0.22 };
const caseFront = front + clockCase.depth;
const dialAt: Triple = [0, 2.2, caseFront + 0.01];
const dialRadius = 0.22;
const doorway = { left: -0.08, width: 0.16, bottom: 2.62, height: 0.18 };
const doorAt: Triple = [
  doorway.left,
  doorway.bottom + doorway.height / 2,
  caseFront + 0.012,
];
const perch = { y: 2.53, depth: 0.15 };
const cuckooAt: Triple = [0, perch.y - 0.06, caseFront + 0.07];
const pendulumAt: Triple = [0, clockCase.bottom, front + 0.16];
const chimneyAt: Triple = [-0.8, 0, chalet.z - 0.6];
const chimneyTop = 3.7;
const signAt: Triple = [1.6, 0, 3.8];

/** A rounded block with fewer bevel steps than the builder's own, to save triangles. */
const addSoftBlock = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  size: Triple,
  radius: number,
  at: Triple,
  rotation?: Triple,
) => {
  if (builder.isFar) {
    builder.box(finish, colour, size, at, rotation);
    return;
  }
  builder.add(
    finish,
    colour,
    new RoundedBoxGeometry(
      size[0],
      size[1],
      size[2],
      1,
      Math.min(radius, ...size.map((side) => side / 2 - 0.001)),
    ),
    { at, rotation },
  );
};

const buildChalet = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height, rise } = chalet;
  builder.box(
    "matte",
    chaletTimber,
    [width, height, depth],
    [x, height / 2, z],
  );
  addGableRoof(builder, {
    width: depth,
    depth: width,
    rise,
    at: [x, height, z],
    colour: roofShingle,
    overhang: 0.38,
    thickness: 0.12,
    turn: Math.PI / 2,
  });
  /* The gables filled with timber: a diamond prism whose top half shows */
  const side = width / Math.SQRT2;
  builder.add(
    "matte",
    shade(chaletTimber, 1.08),
    new BoxGeometry(side, side, depth - 0.04)
      .rotateZ(Math.PI / 4)
      .scale(1, rise / (width / 2), 1),
    { at: [x, height, z] },
    undefined,
  );
  builder.box(
    "matte",
    palette.brick,
    [0.4, chimneyTop - 2.4, 0.4],
    [chimneyAt[0], (chimneyTop + 2.4) / 2, chimneyAt[2]],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    palette.darkBrick,
    [0.48, 0.1, 0.48],
    [chimneyAt[0], chimneyTop + 0.05, chimneyAt[2]],
  );
  builder.box(
    "matte",
    snow,
    [0.46, 0.06, 0.46],
    [chimneyAt[0], chimneyTop + 0.13, chimneyAt[2]],
  );
  /* A stone footing, and log courses all round */
  builder.box(
    "matte",
    palette.stone,
    [width + 0.12, 0.5, depth + 0.12],
    [x, 0.25, z],
  );
  for (let course = 0; course < 6; course++) {
    builder.box(
      "matte",
      shade(chaletTimber, 0.8),
      [width + 0.02, 0.025, depth + 0.02],
      [x, 0.62 + course * 0.24, z],
    );
  }
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      for (let log = 0; log < 6; log++) {
        builder.box(
          "matte",
          carvedPale,
          [0.12, 0.1, 0.12],
          [
            x + sideX * (width / 2 + 0.03),
            0.62 + log * 0.24,
            z + sideZ * (depth / 2 + 0.03),
          ],
        );
      }
    });
  });
  /* Snow lying on both slopes, thick and soft */
  const slope = Math.atan2(rise, width / 2 + 0.38);
  [1, -1].forEach((sideX) => {
    addSoftBlock(
      builder,
      "matte",
      snow,
      [Math.hypot(width / 2 + 0.38, rise) * 0.9, 0.12, depth + 0.7],
      0.06,
      [x + sideX * ((width / 2 + 0.38) / 2), height + rise / 2 + 0.11, z],
      [0, 0, -sideX * slope],
    );
  });
  /* Carved bargeboards along the front gable, with a row of bobbles */
  const eaveZ = front + 0.4;
  [1, -1].forEach((sideX) => {
    const from: Triple = [x, height + rise + 0.05, eaveZ];
    const to: Triple = [x + sideX * (width / 2 + 0.38), height + 0.05, eaveZ];
    builder.box(
      "paint",
      carvedPale,
      [Math.hypot(to[0] - from[0], to[1] - from[1]), 0.16, 0.05],
      [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 0.08, eaveZ],
      [0, 0, -sideX * slope],
    );
    for (let bobble = 1; bobble < 9; bobble++) {
      const share = bobble / 9;
      builder.sphere(
        "paint",
        bobble % 2 === 0 ? heartRed : carvedPale,
        0.045,
        [
          from[0] + (to[0] - from[0]) * share,
          from[1] + (to[1] - from[1]) * share - 0.2,
          eaveZ,
        ],
        [1, 1.3, 0.6],
        6,
      );
    }
  });
  builder.box(
    "paint",
    carvedPale,
    [0.08, 0.5, 0.08],
    [x, height + rise + 0.1, eaveZ],
  );
  builder.sphere(
    "paint",
    heartRed,
    0.07,
    [x, height + rise + 0.38, eaveZ],
    [1, 1, 1],
    10,
  );
  addDoor(builder, {
    at: [0.8, 0.5, front + 0.01],
    width: 0.62,
    height: 1.4,
    colour: chaletDark,
    frame: carvedPale,
  });
  builder.box(
    "matte",
    palette.stone,
    [0.9, 0.12, 0.4],
    [0.8, 0.44, front + 0.2],
  );
  /* Shuttered windows with heart cut-outs and boxes of red geraniums */
  const windows: { at: Triple; turn: number }[] = [
    { at: [-0.8, 1.3, front + 0.01], turn: 0 },
    { at: [x - width / 2 - 0.01, 1.3, z + 0.3], turn: -Math.PI / 2 },
    { at: [x + width / 2 + 0.01, 1.3, z - 0.2], turn: Math.PI / 2 },
  ];
  windows.forEach(({ at, turn }) => {
    addWindow(builder, {
      at,
      width: 0.55,
      height: 0.6,
      turn,
      frame: carvedPale,
      isLit: true,
    });
    const along: Triple = [Math.cos(turn), 0, -Math.sin(turn)];
    const out: Triple = [Math.sin(turn), 0, Math.cos(turn)];
    [-1, 1].forEach((hand) => {
      const shutter: Triple = [
        at[0] + along[0] * hand * 0.45 + out[0] * 0.04,
        at[1],
        at[2] + along[2] * hand * 0.45 + out[2] * 0.04,
      ];
      builder.box("paint", shutterGreen, [0.28, 0.66, 0.04], shutter, [
        0,
        turn,
        0,
      ]);
      builder.sphere(
        "paint",
        heartRed,
        0.04,
        [
          shutter[0] + out[0] * 0.02,
          shutter[1] + 0.15,
          shutter[2] + out[2] * 0.02,
        ],
        [1, 0.9, 0.4],
        6,
      );
    });
    const box: Triple = [
      at[0] + out[0] * 0.12,
      at[1] - 0.42,
      at[2] + out[2] * 0.12,
    ];
    builder.box("paint", chaletDark, [0.66, 0.14, 0.16], box, [0, turn, 0]);
    for (let flower = 0; flower < 5; flower++) {
      const offset = (flower - 2) * 0.13;
      builder.sphere(
        "matte",
        flower % 2 === 0 ? heartRed : "#e2507a",
        0.06,
        [box[0] + along[0] * offset, box[1] + 0.12, box[2] + along[2] * offset],
        [1, 0.8, 1],
        6,
      );
    }
  });
  /* Icicles along the side eaves */
  [-1, 1].forEach((sideX) => {
    for (let icicle = 0; icicle < 8; icicle++) {
      const length = 0.1 + ((icicle * 5 + (sideX > 0 ? 1 : 0)) % 4) * 0.05;
      builder.cylinder("glass", "#bfe3f2", {
        radius: 0.022,
        radiusEnd: 0.002,
        length,
        at: [
          x + sideX * (width / 2 + 0.33),
          height - 0.3 - length / 2,
          z - depth / 2 + 0.1 + icicle * ((depth - 0.2) / 7),
        ],
        segments: 5,
      });
    }
  });
};

const buildClock = (builder: AttractionBuilder) => {
  const caseMiddle = (clockCase.bottom + clockCase.top) / 2;
  builder.box(
    "paint",
    caseBrown,
    [clockCase.width, clockCase.top - clockCase.bottom, clockCase.depth],
    [0, caseMiddle, front + clockCase.depth / 2],
  );
  addGableRoof(builder, {
    width: clockCase.depth + 0.08,
    depth: clockCase.width,
    rise: 0.2,
    at: [0, clockCase.top, front + clockCase.depth / 2],
    colour: chaletDark,
    overhang: 0.06,
    thickness: 0.05,
    finish: "paint",
    turn: Math.PI / 2,
  });
  builder.cylinder("paint", dialCream, {
    radius: dialRadius,
    length: 0.02,
    at: dialAt,
    axis: "z",
    segments: builder.isFar ? 10 : 28,
  });
  if (builder.isFar) {
    return;
  }
  builder.torus("metal", palette.brass, dialRadius, 0.018, dialAt, "z", 28);
  /* The hours round the dial: long marks at 12, 3, 6 and 9 */
  for (let hour = 0; hour < 12; hour++) {
    const angle = (hour / 12) * Math.PI * 2;
    const isQuarter = hour % 3 === 0;
    builder.box(
      "paint",
      palette.black,
      [0.016, isQuarter ? 0.06 : 0.035, 0.008],
      [
        Math.sin(angle) * (dialRadius - 0.045),
        dialAt[1] + Math.cos(angle) * (dialRadius - 0.045),
        dialAt[2] + 0.014,
      ],
      [0, 0, -angle],
    );
  }
  /* The hands say quarter past three */
  const hand = (angle: number, length: number, thickness: number) => {
    builder.box(
      "paint",
      palette.black,
      [thickness, length, 0.01],
      [
        (Math.sin(angle) * length) / 2,
        dialAt[1] + (Math.cos(angle) * length) / 2,
        dialAt[2] + 0.022,
      ],
      [0, 0, -angle],
    );
  };
  hand(Math.PI / 2, 0.17, 0.018);
  hand((3.25 / 12) * Math.PI * 2, 0.11, 0.03);
  builder.sphere(
    "metal",
    palette.brass,
    0.018,
    [0, dialAt[1], dialAt[2] + 0.03],
    [1, 1, 0.6],
    8,
  );
  /* Carved leaves and a little stag's head crest on top */
  [-1, 1].forEach((sideX) => {
    [0, 1, 2].forEach((leaf) => {
      builder.sphere(
        "paint",
        shade(caseBrown, 0.85 + leaf * 0.1),
        0.07,
        [
          sideX * (clockCase.width / 2 - 0.02),
          clockCase.bottom + 0.15 + leaf * 0.28,
          caseFront + 0.01,
        ],
        [0.8, 1.6, 0.4],
        8,
      );
    });
    builder.bar(
      "paint",
      carvedPale,
      [sideX * 0.04, clockCase.top + 0.28, front + 0.12],
      [sideX * 0.14, clockCase.top + 0.42, front + 0.12],
      0.02,
      4,
    );
  });
  builder.sphere(
    "paint",
    carvedPale,
    0.06,
    [0, clockCase.top + 0.27, front + 0.12],
    [0.9, 1, 0.9],
    8,
  );
  /* The doorway the cuckoo pops out of, and the perch below it */
  builder.box(
    "paint",
    palette.black,
    [doorway.width + 0.02, doorway.height + 0.02, 0.01],
    [
      doorway.left + doorway.width / 2,
      doorway.bottom + doorway.height / 2,
      caseFront + 0.004,
    ],
  );
  builder.box(
    "paint",
    carvedPale,
    [doorway.width + 0.08, 0.025, 0.02],
    [
      doorway.left + doorway.width / 2,
      doorway.bottom + doorway.height + 0.025,
      caseFront + 0.01,
    ],
  );
  builder.box(
    "paint",
    shade(caseBrown, 1.15),
    [0.32, 0.14, perch.depth],
    [0, perch.y, caseFront + perch.depth / 2],
  );
  for (let post = 0; post < 5; post++) {
    builder.box(
      "paint",
      carvedPale,
      [0.02, 0.08, 0.02],
      [-0.14 + post * 0.07, perch.y + 0.11, caseFront + perch.depth - 0.01],
    );
  }
  builder.box(
    "paint",
    carvedPale,
    [0.32, 0.02, 0.02],
    [0, perch.y + 0.15, caseFront + perch.depth - 0.01],
  );
  /* Chains with pine-cone weights, which drive the clock as they sink */
  [-0.18, 0.18].forEach((chainX, index) => {
    const bottom = index === 0 ? 1.05 : 1.3;
    builder.bar(
      "metal",
      palette.brass,
      [chainX, clockCase.bottom, front + 0.05],
      [chainX, bottom + 0.22, front + 0.05],
      0.012,
      4,
    );
    builder.lathe(
      "matte",
      "#6b4526",
      [
        [0, 0],
        [0.035, 0.03],
        [0.055, 0.09],
        [0.05, 0.16],
        [0.03, 0.2],
        [0, 0.22],
      ],
      [chainX, bottom, front + 0.05],
      "y",
      10,
    );
    for (let scale = 0; scale < 3; scale++) {
      builder.torus(
        "matte",
        "#8a5a33",
        0.05 - Math.abs(scale - 1) * 0.008,
        0.012,
        [chainX, bottom + 0.06 + scale * 0.05, front + 0.05],
        "y",
        10,
      );
    }
  });
};

/** The little door over the doorway, hinged on its left edge. */
/** How far the door stands ajar, so its nod swings it open and shut but never into the case. */
const doorAjar = 0.6;

const buildDoor = (builder: AttractionBuilder) => {
  const along = (distance: number, out: number): Triple => [
    distance * Math.cos(doorAjar) - out * Math.sin(doorAjar),
    0,
    distance * Math.sin(doorAjar) + out * Math.cos(doorAjar),
  ];
  builder.box(
    "paint",
    carvedPale,
    [doorway.width, doorway.height, 0.015],
    along(doorway.width / 2, 0),
    [0, -doorAjar, 0],
  );
  builder.sphere(
    "metal",
    palette.brass,
    0.01,
    along(doorway.width - 0.025, 0.012),
    [1, 1, 1],
    6,
  );
};

/** The cuckoo, sitting inside its perch until it pops up to call. */
const buildCuckoo = (builder: AttractionBuilder) => {
  builder.sphere("paint", cuckooBlue, 0.06, [0, 0.05, 0], [0.9, 0.9, 1.25], 10);
  builder.sphere(
    "paint",
    shade(cuckooBlue, 1.15),
    0.045,
    [0, 0.12, 0.04],
    [1, 1, 1],
    10,
  );
  builder.sphere("paint", dialCream, 0.035, [0, 0.04, 0.05], [0.9, 1, 0.6], 8);
  builder.cylinder("paint", "#f2b62e", {
    radius: 0.014,
    radiusEnd: 0.002,
    length: 0.06,
    at: [0, 0.12, 0.1],
    axis: "z",
    segments: 6,
  });
  [-1, 1].forEach((sideX) => {
    builder.sphere(
      "paint",
      palette.black,
      0.009,
      [sideX * 0.03, 0.135, 0.075],
      [1, 1, 1],
      6,
    );
    builder.box(
      "paint",
      shade(cuckooBlue, 0.75),
      [0.015, 0.05, 0.09],
      [sideX * 0.05, 0.05, -0.01],
      [0.3, 0, 0],
    );
  });
  builder.box(
    "paint",
    shade(cuckooBlue, 0.7),
    [0.05, 0.015, 0.08],
    [0, 0.06, -0.09],
    [-0.4, 0, 0],
  );
};

/** The pendulum, ticking to and fro below the case. */
const buildPendulum = (builder: AttractionBuilder) => {
  builder.box("metal", palette.brass, [0.02, 0.62, 0.01], [0, -0.31, 0]);
  builder.sphere("paint", caseBrown, 0.09, [0, -0.66, 0], [1, 1.25, 0.25], 12);
  builder.sphere(
    "paint",
    carvedPale,
    0.05,
    [0, -0.66, 0.02],
    [1, 1.2, 0.2],
    10,
  );
};

const buildYard = (builder: AttractionBuilder) => {
  builder.box("matte", snowShadow, [1.0, 0.02, 3.4], [0.8, 0.01, 1.6]);
  /* A snowy spruce beside the chalet */
  const pine = { x: 2.6, z: -2.4 };
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.1,
    length: 0.6,
    at: [pine.x, 0.3, pine.z],
    segments: 6,
  });
  [0, 1, 2].forEach((tier) => {
    if (builder.isFar && tier === 2) {
      return;
    }
    builder.cylinder("matte", shade(pineGreen, 1 + tier * 0.06), {
      radius: 0.85 - tier * 0.25,
      radiusEnd: 0.02,
      length: 1.3,
      at: [pine.x, 1.1 + tier * 0.75, pine.z],
      segments: 12,
    });
    if (!builder.isFar) {
      builder.cylinder("matte", snow, {
        radius: (0.85 - tier * 0.25) * 0.6,
        radiusEnd: 0.02,
        length: 0.65,
        at: [pine.x, 1.42 + tier * 0.75, pine.z],
        segments: 12,
      });
    }
  });
  if (builder.isFar) {
    return;
  }
  /* A bench to sit and wait for the cuckoo, and a stack of firewood */
  addBench(builder, [-1.4, 0, 1.0], 0.3, chaletDark);
  for (let row = 0; row < 3; row++) {
    for (let log = 0; log < 4 - row; log++) {
      const at: Triple = [
        -chalet.width / 2 - 0.35,
        0.11 + row * 0.19,
        chalet.z - 0.6 + log * 0.21 + row * 0.1,
      ];
      builder.cylinder("matte", palette.timber, {
        radius: 0.1,
        length: 0.6,
        at,
        axis: "x",
        segments: 8,
      });
      builder.cylinder("matte", carvedPale, {
        radius: 0.085,
        length: 0.61,
        at,
        axis: "x",
        segments: 8,
      });
    }
  }
  builder.box(
    "matte",
    snow,
    [0.66, 0.06, 0.9],
    [-chalet.width / 2 - 0.35, 0.64, chalet.z - 0.25],
  );
  [
    [-2.8, -2.0, 0.5],
    [-2.6, 2.4, 0.4],
    [2.9, 0.9, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
};

export const cuckooClockChaletModel: CuriosityModel = {
  kind: "cuckoo-clock-chalet",
  islandId: "frost-isle",
  name: "Cuckoo Clock Chalet",
  fact: "A clock has two hands. The long minute hand goes all the way round once every hour, and the short hour hand creeps from one number to the next. When the minute hand points to 3 it is quarter past, at 6 it is half past and at 9 it is quarter to. This cuckoo clock says quarter past three, and on every hour its little bird calls the time.",
  curriculumLink:
    "Mathematics, Year 2: tell and write the time to five minutes, including quarter past/to the hour, and draw the hands on a clock face to show these times.",
  footprint: 4.6,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildChalet(builder);
    buildClock(builder);
    buildYard(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "cuckoo door",
      pivot: doorAt,
      build: buildDoor,
      motion: {
        kind: "nod",
        axis: "y",
        reach: 7,
        amplitude: doorAjar,
        period: 1.6,
      },
    },
    {
      name: "cuckoo",
      pivot: cuckooAt,
      build: buildCuckoo,
      motion: { kind: "rise", reach: 7, height: 0.17, period: 0.8 },
    },
    {
      name: "pendulum",
      pivot: pendulumAt,
      build: buildPendulum,
      motion: { kind: "swing", axis: "z", amplitude: 0.3, period: 1.4 },
    },
  ],
  smoke: [
    {
      at: [chimneyAt[0], chimneyTop + 0.2, chimneyAt[2]],
      colour: "#e3e6ea",
      puffs: 5,
      size: 0.15,
      rise: 1.7,
      spread: 0.3,
    },
  ],
  tune: [76, 72, 76, 72],
  blockers: [
    ...[-0.6, 0.6].flatMap((offset) =>
      listWallBlockers(
        { x: chalet.x - 0.9, z: chalet.z + offset },
        { x: chalet.x + 0.9, z: chalet.z + offset },
        0.75,
        0.45,
      ),
    ),
    { x: -chalet.width / 2 - 0.35, z: chalet.z - 0.3, radius: 0.45 },
    { x: 2.6, z: -2.4, radius: 0.4 },
    { x: -1.4, z: 1.0, radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Wake the cuckoo",
    news: "Cuckoo! Cuckoo! Cuckoo! The little bird popped out early to practise. The hands say quarter past three, so at four o'clock it will call four times.",
    tune: [76, 72, 76, 72, 76, 72],
  },
};
