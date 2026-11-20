import { LatheGeometry, TorusGeometry, Vector2 } from "three";
import {
  addDoor,
  addLampPost,
  addSignBoard,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const dishWhite = "#eef1f6";
const dishBack = "#aeb6c4";
const mountGrey = "#7c8596";
const concrete = "#b9b8bf";
const cabinBlue = "#2c3a72";
const cabinTrim = "#c9cfd8";
const screenGreen = "#7dffb2";
const screenCyan = "#7ff3ff";
const warnYellow = "#f2c230";
const signalGlow = "#b88cff";
const signColour = "#24306a";

const mountAt = { x: -0.7, z: -0.9 };
const pedestalHeight = 1.9;
const hingeUp = 0.75;
const dishRadius = 2.0;
const focal = 1.05;
const elevation = 0.75;
const tilt = Math.PI / 2 - elevation;
const cabin = { x: 2.75, z: -2.0, width: 2.0, depth: 1.6, height: 1.7 };
const littleDishPivot: Triple = [cabin.x + 0.4, cabin.height + 0.62, cabin.z];

/** A point in the dish's own frame (axis +y) turned up to its elevation. */
const tiltPoint = ([x, y, z]: Triple, lift = hingeUp): Triple => [
  x,
  lift + y * Math.cos(tilt) - z * Math.sin(tilt),
  y * Math.sin(tilt) + z * Math.cos(tilt),
];

/** The bowl's height above its middle, `radius` from the middle. */
const bowlHeight = (radius: number) => (radius * radius) / (4 * focal);

const bowlProfile = (offset: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, index) => {
    const radius = (dishRadius * index) / steps;
    return new Vector2(Math.max(0.001, radius), bowlHeight(radius) + offset);
  });

/** The big dish on its yoke, all of which turns on the turntable. */
const buildDish = (builder: AttractionBuilder) => {
  /* The turntable and the yoke */
  builder.cylinder("metal", mountGrey, {
    radius: 0.85,
    length: 0.18,
    at: [0, 0.09, 0],
    segments: 28,
  });
  builder.cylinder("paint", warnYellow, {
    radius: 0.87,
    length: 0.05,
    at: [0, 0.2, 0],
    segments: 28,
  });
  [-1, 1].forEach((side) => {
    builder.box("paint", dishBack, [0.16, 0.95, 0.5], [side * 0.62, 0.62, 0]);
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.14,
      length: 0.12,
      at: [side * 0.74, hingeUp, 0],
      axis: "x",
      segments: 12,
    });
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.09,
    length: 1.3,
    at: [0, hingeUp, 0],
    axis: "x",
    segments: 10,
  });
  /* The bowl: a white face and a grey back */
  const rotation: Triple = [tilt, 0, 0];
  const at = tiltPoint([0, 0.35, 0]);
  builder.add(
    "paint",
    dishWhite,
    new LatheGeometry(bowlProfile(0, 8).reverse(), 36),
    { at, rotation },
  );
  builder.add("metal", dishBack, new LatheGeometry(bowlProfile(-0.05, 6), 30), {
    at,
    rotation,
  });
  builder.add("metal", cabinTrim, new TorusGeometry(dishRadius, 0.05, 5, 36), {
    at: tiltPoint([0, 0.35 + bowlHeight(dishRadius), 0]),
    rotation: [tilt - Math.PI / 2, 0, 0],
  });
  /* The hub behind the bowl and the truss that holds its back */
  builder.cylinder("metal", mountGrey, {
    radius: 0.42,
    radiusEnd: 0.3,
    length: 0.4,
    at: tiltPoint([0, 0.15, 0]),
    segments: 16,
  });
  for (let spoke = 0; spoke < 8; spoke++) {
    const angle = (spoke / 8) * Math.PI * 2;
    const reach = dishRadius * 0.92;
    builder.bar(
      "metal",
      palette.darkSteel,
      tiltPoint([Math.sin(angle) * 0.35, 0.1, Math.cos(angle) * 0.35]),
      tiltPoint([
        Math.sin(angle) * reach,
        0.3 + bowlHeight(reach),
        Math.cos(angle) * reach,
      ]),
      0.05,
      5,
    );
  }
  /* A counterweight behind the hinge */
  builder.box(
    "paint",
    shade(mountGrey, 0.8),
    [0.7, 0.4, 0.4],
    tiltPoint([0, -0.4, 0]),
    rotation,
  );
  /* Four struts up to the receiver horn at the focus */
  const focus: Triple = [0, 0.35 + focal, 0];
  [0, 1, 2, 3].forEach((index) => {
    const angle = Math.PI / 4 + (index / 4) * Math.PI * 2;
    const reach = dishRadius * 0.85;
    builder.bar(
      "metal",
      cabinTrim,
      tiltPoint([
        Math.sin(angle) * reach,
        0.37 + bowlHeight(reach),
        Math.cos(angle) * reach,
      ]),
      tiltPoint([focus[0], focus[1] - 0.15, focus[2]]),
      0.05,
      6,
    );
  });
  builder.cylinder("paint", warnYellow, {
    radius: 0.2,
    radiusEnd: 0.1,
    length: 0.35,
    at: tiltPoint(focus),
    segments: 14,
  });
  builder.add(
    "metal",
    palette.darkSteel,
    new LatheGeometry(
      [
        new Vector2(0.001, -0.25),
        new Vector2(0.14, -0.25),
        new Vector2(0.14, -0.1),
        new Vector2(0.05, 0.05),
      ],
      14,
    ),
    { at: tiltPoint(focus), rotation },
  );
  builder.sphere(
    "glow",
    "#ff4a5a",
    0.05,
    tiltPoint([0, focus[1] + 0.2, 0]),
    [1, 1, 1],
    8,
  );
};

const buildMount = (builder: AttractionBuilder) => {
  const { x, z } = mountAt;
  const segments = builder.isFar ? 8 : 24;
  builder.cylinder("matte", concrete, {
    radius: 1.35,
    radiusEnd: 1.25,
    length: 0.25,
    at: [x, 0.125, z],
    segments,
  });
  builder.cylinder("paint", dishBack, {
    radius: 0.62,
    radiusEnd: 0.48,
    length: pedestalHeight - 0.25,
    at: [x, 0.25 + (pedestalHeight - 0.25) / 2, z],
    segments,
  });
  if (builder.isFar) {
    /* A still dish in place of the turning one */
    builder.add(
      "paint",
      dishWhite,
      new LatheGeometry(bowlProfile(0, 3).reverse(), 8),
      {
        at: [
          x,
          pedestalHeight + tiltPoint([0, 0.35, 0])[1],
          z + tiltPoint([0, 0.35, 0])[2],
        ],
        rotation: [tilt, 0, 0],
      },
    );
    builder.add(
      "metal",
      dishBack,
      new LatheGeometry(bowlProfile(-0.05, 2), 8),
      {
        at: [
          x,
          pedestalHeight + tiltPoint([0, 0.35, 0])[1],
          z + tiltPoint([0, 0.35, 0])[2],
        ],
        rotation: [tilt, 0, 0],
      },
    );
    return;
  }
  /* A service door and a ladder up the pedestal */
  addDoor(builder, {
    at: [x, 0.25, z + 0.6],
    width: 0.42,
    height: 0.9,
    colour: cabinBlue,
    frame: cabinTrim,
  });
  [-0.18, 0.18].forEach((side) => {
    builder.bar(
      "metal",
      cabinTrim,
      [x - 0.62, 0.25, z + side],
      [x - 0.5, pedestalHeight, z + side],
      0.04,
      5,
    );
  });
  for (let rung = 0; rung < 6; rung++) {
    const up = 0.45 + rung * 0.25;
    const out = 0.62 - (0.12 * (up - 0.25)) / (pedestalHeight - 0.25);
    builder.box("metal", cabinTrim, [0.03, 0.03, 0.36], [x - out, up, z]);
  }
  /* Bolts round the plinth */
  for (let bolt = 0; bolt < 10; bolt++) {
    const angle = (bolt / 10) * Math.PI * 2;
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.05,
      length: 0.08,
      at: [x + Math.sin(angle) * 1.05, 0.28, z + Math.cos(angle) * 1.05],
      segments: 6,
    });
  }
  builder.cylinder("paint", warnYellow, {
    radius: 1.36,
    length: 0.06,
    at: [x, 0.22, z],
    segments: 32,
    isOpen: true,
  });
};

/** The control cabin, its screens glowing through the windows. */
const buildCabin = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = cabin;
  builder.box(
    "paint",
    cabinBlue,
    [width, height, depth],
    [x, height / 2 + 0.1, z],
  );
  builder.box(
    "matte",
    concrete,
    [width + 0.2, 0.12, depth + 0.2],
    [x, 0.06, z],
  );
  builder.box(
    "paint",
    cabinTrim,
    [width + 0.16, 0.12, depth + 0.16],
    [x, height + 0.16, z],
  );
  if (builder.isFar) {
    return;
  }
  /* Two windows on the front, glowing screens inside */
  [-0.48, 0.48].forEach((offset, index) => {
    addWindow(builder, {
      at: [x + offset, 1.15, z + depth / 2 + 0.01],
      width: 0.6,
      height: 0.46,
      frame: cabinTrim,
      glass: "#3b4a8a",
    });
    builder.box(
      "glow",
      index === 0 ? screenGreen : screenCyan,
      [0.42, 0.28, 0.02],
      [x + offset, 1.12, z + depth / 2 - 0.06],
    );
  });
  /* A wavy trace on the screens, drawn as little bars */
  [-0.48, 0.48].forEach((offset) => {
    for (let step = 0; step < 6; step++) {
      builder.box(
        "paint",
        "#0d3a2a",
        [0.05, 0.02 + Math.abs(Math.sin(step * 1.3 + offset * 4)) * 0.16, 0.01],
        [x + offset - 0.16 + step * 0.064, 1.12, z + depth / 2 - 0.045],
      );
    }
  });
  addDoor(builder, {
    at: [x + width / 2 + 0.01, 0.1, z + 0.1],
    width: 0.55,
    height: 1.25,
    colour: shade(cabinBlue, 1.3),
    frame: cabinTrim,
    turn: Math.PI / 2,
  });
  /* Steps to the door */
  builder.box(
    "matte",
    concrete,
    [0.4, 0.1, 0.7],
    [x + width / 2 + 0.22, 0.05, z + 0.1],
  );
  /* An air conditioning unit on the side, and stripes on the roof edge */
  builder.box(
    "metal",
    cabinTrim,
    [0.15, 0.5, 0.6],
    [x - width / 2 - 0.08, 0.9, z - 0.2],
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.18,
    length: 0.03,
    at: [x - width / 2 - 0.16, 0.9, z - 0.2],
    axis: "x",
    segments: 14,
  });
  for (let stripe = 0; stripe < 5; stripe++) {
    builder.box(
      "paint",
      stripe % 2 === 0 ? warnYellow : palette.black,
      [width / 5, 0.06, 0.02],
      [
        x - width / 2 + width / 10 + (stripe * width) / 5,
        height + 0.16,
        z + depth / 2 + 0.09,
      ],
    );
  }
  /* A mast on the roof with an aircraft light */
  builder.cylinder("metal", cabinTrim, {
    radius: 0.03,
    length: 0.9,
    at: [x - 0.7, height + 0.6, z - 0.5],
    segments: 6,
  });
  builder.sphere(
    "glow",
    "#ff4a5a",
    0.06,
    [x - 0.7, height + 1.08, z - 0.5],
    [1, 1, 1],
    8,
  );
  /* The little dish's post */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.06,
    length: 0.42,
    at: [littleDishPivot[0], height + 0.4, littleDishPivot[2]],
    segments: 8,
  });
};

const buildLittleDish = (builder: AttractionBuilder) => {
  const rotation: Triple = [0.9, 0, 0];
  builder.add(
    "paint",
    dishWhite,
    new LatheGeometry(
      Array.from({ length: 5 }, (_, index) => {
        const radius = 0.4 - index * 0.08;
        return new Vector2(radius, radius * radius * 0.9);
      }),
      18,
    ),
    { rotation },
  );
  builder.add(
    "metal",
    dishBack,
    new LatheGeometry(
      Array.from({ length: 5 }, (_, index) => {
        const radius = 0.08 + index * 0.08;
        return new Vector2(radius, radius * radius * 0.9 - 0.02);
      }),
      18,
    ),
    { rotation },
  );
  builder.bar(
    "metal",
    cabinTrim,
    [0, 0, 0],
    [0, 0.32 * Math.cos(0.9), 0.32 * Math.sin(0.9)],
    0.025,
    5,
  );
  builder.sphere(
    "paint",
    warnYellow,
    0.05,
    [0, 0.32 * Math.cos(0.9), 0.32 * Math.sin(0.9)],
    [1, 1, 1],
    8,
  );
};

/** Rings of radio waves, shown arriving as a visitor comes near. */
const buildSignal = (builder: AttractionBuilder) => {
  [0.35, 0.65, 0.95].forEach((radius, index) => {
    builder.add(
      "glow",
      index === 1 ? screenCyan : signalGlow,
      new TorusGeometry(radius, 0.025, 4, 20, Math.PI * 0.7),
      {
        at: [0, index * 0.12, 0],
        rotation: [0.2, 0, Math.PI * 0.15],
      },
    );
  });
};

/** A covered trench carrying the cables from the dish to the cabin. */
const buildTrench = (builder: AttractionBuilder) => {
  const from = { x: mountAt.x + 1.3, z: mountAt.z - 0.3 };
  const to = { x: cabin.x - cabin.width / 2 - 0.1, z: cabin.z + 0.4 };
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const angle = Math.atan2(to.x - from.x, to.z - from.z);
  const middle: Triple = [(from.x + to.x) / 2, 0.015, (from.z + to.z) / 2];
  builder.box("matte", "#3a3d4a", [0.4, 0.03, length], middle, [0, angle, 0]);
  if (builder.isFar) {
    return;
  }
  const covers = 4;
  for (let cover = 0; cover < covers; cover++) {
    const along = (cover + 0.5) / covers;
    builder.box(
      "metal",
      shade(mountGrey, 1.1),
      [0.42, 0.04, length / covers - 0.06],
      [
        from.x + (to.x - from.x) * along,
        0.04,
        from.z + (to.z - from.z) * along,
      ],
      [0, angle, 0],
    );
  }
  /* A cable drum by the cabin */
  builder.cylinder("matte", palette.timber, {
    radius: 0.38,
    length: 0.08,
    at: [1.4, 0.38, -3.5],
    axis: "x",
    segments: 16,
  });
  builder.cylinder("matte", palette.timber, {
    radius: 0.38,
    length: 0.08,
    at: [1.8, 0.38, -3.5],
    axis: "x",
    segments: 16,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.25,
    length: 0.32,
    at: [1.6, 0.38, -3.5],
    axis: "x",
    segments: 16,
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.gravel, [1.2, 0.03, 3.0], [0.6, 0.015, 3.0]);
  if (builder.isFar) {
    return;
  }
  addLampPost(builder, [1.6, 0, 2.2], 2.1);
  /* Warning signs on posts */
  [
    [-2.9, 1.2],
    [2.9, 0.8],
  ].forEach(([x, z]) => {
    builder.cylinder("metal", cabinTrim, {
      radius: 0.03,
      length: 1.0,
      at: [x, 0.5, z],
      segments: 6,
    });
    builder.cylinder("paint", warnYellow, {
      radius: 0.2,
      length: 0.03,
      at: [x, 1.05, z + 0.03],
      axis: "z",
      segments: 3,
    });
    builder.box(
      "paint",
      palette.black,
      [0.03, 0.12, 0.01],
      [x, 1.03, z + 0.05],
    );
  });
  /* A bench to sit and listen, and a little rack of radio gear */
  builder.box("paint", cabinBlue, [1.2, 0.08, 0.4], [-2.6, 0.45, 2.3]);
  [-0.5, 0.5].forEach((side) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.06, 0.45, 0.36],
      [-2.6 + side, 0.22, 2.3],
    );
  });
  builder.box("paint", palette.black, [0.5, 0.6, 0.35], [-3.4, 0.3, -2.8]);
  [0.15, 0.32, 0.48].forEach((up, index) => {
    builder.box(
      "glow",
      index === 1 ? "#ff7ad9" : screenGreen,
      [0.3, 0.04, 0.01],
      [-3.4, up, -2.62],
    );
  });
};

export const satelliteDishModel: CuriosityModel = {
  kind: "satellite-dish",
  islandId: "starfall-isle",
  name: "Satellite Dish",
  fact: "A satellite dish catches radio signals from space and bounces them onto a receiver in the middle. Computers then share the information over networks such as the internet. Dishes like this bring us television, weather pictures, phone calls and messages from space probes far away.",
  curriculumLink:
    "Computing, Key Stage 2: understand computer networks, including the internet, and how they can provide multiple services, such as the World Wide Web, and the opportunities they offer for communication.",
  footprint: 5,
  setting: "inland",
  signSpot: { x: -0.7, z: 4.2 },
  build: (builder) => {
    buildMount(builder);
    buildCabin(builder);
    buildTrench(builder);
    buildGrounds(builder);
    addSignBoard(builder, [-0.7, 0, 4.2], signColour);
  },
  moving: [
    {
      name: "dish",
      pivot: [mountAt.x, pedestalHeight, mountAt.z],
      build: buildDish,
      motion: { kind: "whirl", axis: "y", idle: 0.06, speed: 0.5, reach: 8 },
    },
    {
      name: "little-dish",
      pivot: littleDishPivot,
      build: buildLittleDish,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.35,
        period: 3.2,
      },
    },
    {
      name: "signal",
      pivot: [
        littleDishPivot[0],
        littleDishPivot[1] + 0.7,
        littleDishPivot[2] + 0.5,
      ],
      build: buildSignal,
      motion: { kind: "wake", reach: 7 },
    },
  ],
  blockers: [
    { x: mountAt.x, z: mountAt.z, radius: 1.45 },
    { x: cabin.x - 0.5, z: cabin.z, radius: 0.95 },
    { x: cabin.x + 0.5, z: cabin.z, radius: 0.95 },
    { x: -2.6, z: 2.3, radius: 0.55 },
    { x: -3.4, z: -2.8, radius: 0.4 },
    { x: 1.6, z: -3.5, radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Listen to space",
    news: "Beep... boop... crackle! The dish caught a radio signal from a space probe, and the computers passed it on round the world.",
  },
};
