import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  addDoor,
  addGableRoof,
  addSignBoard,
  addWindow,
  findMotionPose,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowShadow = "#d9e3ea";
const pylonYellow = "#e8b52c";
const cableSteel = "#3a3f45";
const chairRed = "#c8323a";
const chairSeat = "#2f3a4a";
const hutTimber = "#9a5b34";
const hutRoof = "#5a2e24";
const pineGreen = "#2d5640";
const markerOrange = "#f06a1d";
const signColour = "#b8322f";
const skiColours = ["#2f7fd0", "#e2402f", "#3fae5a", "#f2c12e"];

/* The cable runs round a tall loop between two pylons, over the loading spot. */
const loopAt: Triple = [-0.6, 3.4, 0];
const loopRadius = 2.0;
const chairHang = 0.95;
const pylonX = -1.65;
const hut = { x: 2.3, z: -1.7, width: 1.9, depth: 1.4, height: 1.75 };
const wheelAt: Triple = [hut.x - 0.4, 1.15, hut.z + hut.depth / 2 + 0.08];
const rack = { x: 2.4, z: 1.2 };
const rideStart: LocalPoint = { x: 0.15, z: 0 };
const rideFinish: LocalPoint = { x: 0.6, z: 2.0 };
const signAt: Triple = [1.5, 0, 4.2];

const chairMotion: Motion = {
  kind: "orbit",
  axis: "x",
  radius: loopRadius,
  count: 6,
  speed: 0.35,
};

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

/** A snowy spruce: a trunk and tiers of boughs, each capped with snow. */
const addSnowyPine = (builder: AttractionBuilder, at: Triple, size: number) => {
  const [x, y, z] = at;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.12 * size,
    radiusEnd: 0.08 * size,
    length: 0.7 * size,
    at: [x, y + 0.35 * size, z],
    segments: 6,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (0.95 - share * 0.55) * size;
    const base = (0.55 + share * 1.35) * size;
    const height = (1.3 - share * 0.25) * size;
    builder.cylinder("matte", shade(pineGreen, 1 + tier * 0.06), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, y + base + height / 2, z],
      segments: 12,
    });
    if (!builder.isFar) {
      builder.cylinder("matte", snow, {
        radius: radius * 0.62,
        radiusEnd: 0.02,
        length: height * 0.5,
        at: [x, y + base + height * 0.78, z],
        segments: 12,
      });
    }
  }
};

/** A pylon: a tapering steel mast with an arm out to the cable and its sheave wheels. */
const buildPylon = (builder: AttractionBuilder, side: number) => {
  const z = side * loopRadius;
  const top = loopAt[1] + 0.35;
  builder.cylinder("paint", pylonYellow, {
    radius: 0.17,
    radiusEnd: 0.11,
    length: top,
    at: [pylonX, top / 2, z],
    segments: builder.isFar ? 6 : 12,
  });
  builder.box(
    "paint",
    pylonYellow,
    [loopAt[0] - pylonX + 0.3, 0.14, 0.14],
    [(pylonX + loopAt[0]) / 2 + 0.1, top, z],
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", palette.darkStone, {
    radius: 0.32,
    radiusEnd: 0.26,
    length: 0.3,
    at: [pylonX, 0.15, z],
    segments: 12,
  });
  builder.bar(
    "paint",
    pylonYellow,
    [pylonX, top - 0.7, z],
    [(pylonX + loopAt[0]) / 2, top - 0.05, z],
    0.06,
    6,
  );
  /* Sheave wheels the cable runs past, just outside the loop */
  const wheelZ = z + side * 0.14;
  [-0.32, 0.32].forEach((offset) => {
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.13,
      length: 0.07,
      at: [loopAt[0], loopAt[1] + offset, wheelZ],
      axis: "x",
      segments: 14,
    });
    builder.cylinder("paint", palette.black, {
      radius: 0.05,
      length: 0.1,
      at: [loopAt[0], loopAt[1] + offset, wheelZ],
      axis: "x",
      segments: 8,
    });
  });
  builder.box(
    "paint",
    pylonYellow,
    [0.06, 0.9, 0.05],
    [loopAt[0] + 0.07, loopAt[1], wheelZ],
  );
  builder.box(
    "paint",
    pylonYellow,
    [0.06, 0.9, 0.05],
    [loopAt[0] - 0.07, loopAt[1], wheelZ],
  );
  builder.bar(
    "paint",
    pylonYellow,
    [loopAt[0], top, z],
    [loopAt[0], loopAt[1] + 0.45, wheelZ],
    0.06,
    6,
  );
  /* Rungs up the mast and a little service platform */
  for (let rung = 0; rung < 8; rung++) {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.04, 0.03, 0.26],
      [pylonX + 0.2, 0.5 + rung * 0.35, z],
    );
  }
  builder.box(
    "metal",
    palette.darkSteel,
    [0.03, 2.6, 0.03],
    [pylonX + 0.2, 1.75, z - 0.13],
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.03, 2.6, 0.03],
    [pylonX + 0.2, 1.75, z + 0.13],
  );
  builder.box(
    "matte",
    snow,
    [0.5, 0.06, 0.2],
    [(pylonX + loopAt[0]) / 2 + 0.1, top + 0.1, z],
  );
};

const buildCable = (builder: AttractionBuilder) => {
  builder.torus(
    "metal",
    cableSteel,
    loopRadius,
    builder.isFar ? 0.06 : 0.03,
    loopAt,
    "x",
    builder.isFar ? 14 : 56,
  );
};

/** One chair, hanging from its grip on the cable at the origin, facing +x. */
const buildChair = (builder: AttractionBuilder) => {
  const seatY = -chairHang;
  builder.box("metal", palette.darkSteel, [0.12, 0.1, 0.16], [0, -0.02, 0]);
  builder.bar(
    "metal",
    palette.darkSteel,
    [0, -0.05, 0],
    [0, seatY + 0.75, 0],
    0.045,
    6,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [0, seatY + 0.75, 0],
    [-0.24, seatY + 0.5, 0],
    0.04,
    6,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [-0.24, seatY + 0.5, 0],
    [-0.24, seatY, 0],
    0.04,
    6,
  );
  addSoftBlock(builder, "paint", chairSeat, [0.42, 0.08, 0.72], 0.03, [
    -0.02,
    seatY + 0.04,
    0,
  ]);
  addSoftBlock(
    builder,
    "paint",
    chairRed,
    [0.07, 0.42, 0.72],
    0.03,
    [-0.24, seatY + 0.28, 0],
    [0, 0, 0.12],
  );
  [-0.37, 0.37].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [-0.22, seatY + 0.25, side],
      [0.18, seatY + 0.25, side],
      0.03,
      5,
    );
  });
  /* The safety bar, lowered, with a footrest */
  builder.bar(
    "metal",
    palette.steel,
    [-0.2, seatY + 0.55, 0.38],
    [0.22, seatY + 0.3, 0.38],
    0.03,
    5,
  );
  builder.bar(
    "metal",
    palette.steel,
    [0.22, seatY + 0.3, 0.38],
    [0.22, seatY + 0.3, -0.38],
    0.03,
    5,
  );
  builder.bar(
    "metal",
    palette.steel,
    [0.22, seatY + 0.3, 0],
    [0.32, seatY - 0.3, 0],
    0.03,
    5,
  );
  builder.box(
    "metal",
    palette.steel,
    [0.12, 0.03, 0.5],
    [0.33, seatY - 0.3, 0],
  );
};

const buildHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = hut;
  builder.box("matte", hutTimber, [width, height, depth], [x, height / 2, z]);
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.7,
    at: [x, height, z],
    colour: hutRoof,
    overhang: 0.2,
    thickness: 0.1,
  });
  if (builder.isFar) {
    return;
  }
  /* Snow lying thick on both slopes of the roof */
  const slope = Math.atan2(0.7, depth / 2 + 0.2);
  [1, -1].forEach((side) => {
    addSoftBlock(
      builder,
      "matte",
      snow,
      [width + 0.44, 0.1, Math.hypot(depth / 2 + 0.2, 0.7) * 0.92],
      0.05,
      [x, height + 0.42, z + side * (depth / 4 + 0.08)],
      [side * slope, 0, 0],
    );
  });
  builder.box(
    "matte",
    shade(hutTimber, 0.75),
    [width + 0.06, 0.2, depth + 0.06],
    [x, 0.1, z],
  );
  for (let board = 0; board < 6; board++) {
    builder.box(
      "matte",
      shade(hutTimber, board % 2 === 0 ? 0.88 : 1.08),
      [0.03, height - 0.25, 0.02],
      [
        x - width / 2 - 0.01,
        0.2 + (height - 0.25) / 2,
        z - depth / 2 + 0.15 + board * 0.22,
      ],
    );
  }
  addDoor(builder, {
    at: [x + 0.45, 0, z + depth / 2 + 0.01],
    width: 0.6,
    height: 1.3,
    colour: "#2f5a7a",
  });
  addWindow(builder, {
    at: [x - width / 2 - 0.01, 1.15, z + 0.1],
    width: 0.6,
    height: 0.45,
    turn: -Math.PI / 2,
    isLit: true,
  });
  /* The drive wheel's housing, with the control lever and a timetable board */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.12,
    length: 0.16,
    at: [wheelAt[0], wheelAt[1], wheelAt[2] - 0.08],
    axis: "z",
    segments: 10,
  });
  builder.box(
    "paint",
    palette.darkSteel,
    [0.3, 0.42, 0.2],
    [x + 0.95, 0.65, z + depth / 2 + 0.25],
  );
  builder.bar(
    "metal",
    palette.steel,
    [x + 0.95, 0.85, z + depth / 2 + 0.25],
    [x + 1.0, 1.15, z + depth / 2 + 0.38],
    0.03,
    5,
  );
  builder.sphere(
    "paint",
    chairRed,
    0.05,
    [x + 1.0, 1.17, z + depth / 2 + 0.39],
    [1, 1, 1],
    8,
  );
  builder.box(
    "glow",
    "#7dff8a",
    [0.06, 0.06, 0.02],
    [x + 0.88, 0.75, z + depth / 2 + 0.36],
  );
  builder.box(
    "paint",
    palette.cream,
    [0.5, 0.2, 0.03],
    [x + 0.45, 1.6, z + depth / 2 + 0.02],
  );
  [0.05, -0.04].forEach((dy) => {
    builder.box(
      "paint",
      palette.slate,
      [0.38, 0.025, 0.01],
      [x + 0.45, 1.6 + dy, z + depth / 2 + 0.04],
    );
  });
  /* Icicles under the eaves at the front */
  for (let icicle = 0; icicle < 8; icicle++) {
    const length = 0.1 + ((icicle * 5) % 4) * 0.05;
    builder.cylinder("glass", "#bfe3f2", {
      radius: 0.022,
      radiusEnd: 0.002,
      length,
      at: [
        x - width / 2 + 0.05 + icicle * ((width - 0.1) / 7),
        height - length / 2 - 0.02,
        z + depth / 2 + 0.18,
      ],
      segments: 5,
    });
  }
};

/** The big drive wheel on the hut: a bullwheel turning the cable, like a pulley. */
const buildDriveWheel = (builder: AttractionBuilder) => {
  builder.torus("paint", chairRed, 0.42, 0.045, [0, 0, 0], "z", 28);
  builder.torus("metal", cableSteel, 0.47, 0.02, [0, 0, 0], "z", 28);
  for (let spoke = 0; spoke < 6; spoke++) {
    const angle = (spoke / 6) * Math.PI * 2;
    builder.bar(
      "paint",
      palette.darkSteel,
      [0, 0, 0],
      [Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0],
      0.04,
      5,
    );
  }
  builder.cylinder("paint", pylonYellow, {
    radius: 0.09,
    length: 0.1,
    at: [0, 0, 0.03],
    axis: "z",
    segments: 12,
  });
};

const buildRack = (builder: AttractionBuilder) => {
  const { x, z } = rack;
  /* An A-frame rack with skis leaning on it, tips curled up */
  builder.box("matte", palette.darkTimber, [1.5, 0.08, 0.08], [x, 1.0, z]);
  [-0.7, 0.7].forEach((along) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + along, 0, z - 0.35],
      [x + along, 1.02, z],
      0.07,
      4,
    );
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + along, 0, z + 0.35],
      [x + along, 1.02, z],
      0.07,
      4,
    );
  });
  if (builder.isFar) {
    return;
  }
  skiColours.forEach((colour, index) => {
    const along = x - 0.55 + index * 0.36;
    const side = index % 2 === 0 ? 1 : -1;
    [-0.06, 0.06].forEach((offset) => {
      builder.box(
        "paint",
        colour,
        [0.08, 1.35, 0.025],
        [along + offset, 0.66, z + side * 0.22],
        [side * -0.3, 0, 0],
      );
      builder.box(
        "paint",
        shade(colour, 0.8),
        [0.08, 0.1, 0.025],
        [along + offset, 1.33, z + side * 0.04],
        [side * -0.9, 0, 0],
      );
    });
    builder.box(
      "paint",
      palette.black,
      [0.2, 0.05, 0.05],
      [along, 0.62, z + side * 0.26],
      [side * -0.3, 0, 0],
    );
  });
  /* Ski poles in the snow, with their baskets */
  [
    [x + 0.95, z - 0.1],
    [x + 1.05, z + 0.05],
  ].forEach(([poleX, poleZ]) => {
    builder.bar(
      "metal",
      palette.steel,
      [poleX, 0, poleZ],
      [poleX + 0.05, 1.05, poleZ],
      0.025,
      5,
    );
    builder.torus(
      "paint",
      palette.black,
      0.05,
      0.01,
      [poleX + 0.005, 0.12, poleZ],
      "y",
      8,
    );
    builder.box(
      "paint",
      chairRed,
      [0.04, 0.12, 0.04],
      [poleX + 0.05, 1.08, poleZ],
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* The loading mat under the bottom of the loop */
  builder.box(
    "matte",
    snowShadow,
    [2.2, 0.02, 1.4],
    [loopAt[0] + 0.3, 0.01, 0],
  );
  builder.box("matte", snowShadow, [1.4, 0.02, 2.4], [0.6, 0.01, 2.9]);
  addSnowyPine(builder, [-3.6, 0, -2.6], 1.05);
  addSnowyPine(builder, [-3.4, 0, 2.0], 0.85);
  addSnowyPine(builder, [4.1, 0, -0.2], 0.8);
  if (builder.isFar) {
    return;
  }
  builder.box("paint", pylonYellow, [0.1, 0.022, 1.1], [0.05, 0.02, 0]);
  /* Piste markers: orange and black striped poles */
  [
    [-2.6, 3.4],
    [0.0, -3.8],
    [3.6, 2.8],
  ].forEach(([x, z]) => {
    for (let band = 0; band < 4; band++) {
      builder.cylinder("paint", band % 2 === 0 ? markerOrange : palette.black, {
        radius: 0.04,
        length: 0.3,
        at: [x, 0.15 + band * 0.3, z],
        segments: 6,
      });
    }
  });
  [
    [-2.4, -1.0, 0.5],
    [3.3, -3.4, 0.45],
    [-1.4, 4.0, 0.4],
    [4.2, 1.6, 0.35],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
};

const rideSpot = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(chairMotion, seconds, { copy: 0 });
  const seat: Triple = [
    loopAt[0] + pose.position[0],
    loopAt[1] + pose.position[1] - chairHang + 0.09,
    loopAt[2] + pose.position[2],
  ];
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? rideStart : rideFinish;
  return {
    x: outside.x + (seat[0] - outside.x) * share,
    y: seat[1] * share,
    z: outside.z + (seat[2] - outside.z) * share,
    heading: Math.PI / 2,
  };
};

export const skiLiftModel: CuriosityModel = {
  kind: "ski-lift",
  islandId: "frost-isle",
  name: "Ski Lift",
  fact: "A chairlift carries skiers up a snowy mountain. A strong steel cable runs in a loop round big wheels called pulleys, and a motor in the station turns the biggest wheel. As the wheel turns on its axle it pulls the cable along, and the chairs hanging from it go up, over the top and back down again.",
  curriculumLink:
    "Design and technology, Key Stage 1: explore and use mechanisms, such as levers, sliders, wheels and axles, in their products.",
  footprint: 5,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildPylon(builder, -1);
    buildPylon(builder, 1);
    buildCable(builder);
    buildHut(builder);
    buildRack(builder);
    buildGrounds(builder);
    if (builder.isFar) {
      builder.cylinder("paint", chairRed, {
        radius: 0.45,
        length: 0.1,
        at: wheelAt,
        axis: "z",
        segments: 8,
      });
    }
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "chairs",
      pivot: loopAt,
      build: buildChair,
      motion: chairMotion,
    },
    {
      name: "drive wheel",
      pivot: wheelAt,
      build: buildDriveWheel,
      motion: { kind: "whirl", axis: "z", idle: 0.7, speed: 3, reach: 7 },
    },
  ],
  rides: [
    {
      id: "chairlift",
      name: "the chairlift",
      start: rideStart,
      reach: 0.6,
      seconds: (Math.PI * 2) / 0.35,
      finish: rideFinish,
      follow: rideSpot,
    },
  ],
  blockers: [
    { x: pylonX, z: -loopRadius, radius: 0.35 },
    { x: pylonX, z: loopRadius, radius: 0.35 },
    { x: hut.x - 0.5, z: hut.z, radius: 0.75 },
    { x: hut.x + 0.4, z: hut.z, radius: 0.75 },
    { x: rack.x - 0.4, z: rack.z, radius: 0.45 },
    { x: rack.x + 0.4, z: rack.z, radius: 0.45 },
    { x: -3.6, z: -2.6, radius: 0.45 },
    { x: -3.4, z: 2.0, radius: 0.35 },
    { x: 4.1, z: -0.2, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Ride the chairlift",
    news: "Whirr! The big wheel turned, the cable pulled, and your chair swung you up and over the snowy treetops.",
  },
};
