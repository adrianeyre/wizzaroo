import { SphereGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const batteryOrange = "#e07a2a";
const batteryBlack = "#26282b";
const copper = "#c7773a";
const wireRed = "#d23a2f";
const wireBlack = "#2a2c30";
const postTimber = "#7a5634";
const insulator = "#e9e2cf";
const bulbGlass = "#e8f0ee";
const bulbGlow = "#ffe27a";
const boardGreen = "#2f5a3c";
const solarBlue = "#24467a";
const bark = "#7a5a3c";
const fernGreen = "#3f9a3a";
const signColour = "#2b5f8a";

const wireHeight = 1.05;
const battery: Triple = [-2.6, 0, -0.8];
const switchAt: Triple = [0.2, 0, 0.75];
const buzzer: Triple = [2.6, 0, -0.8];
const bulbs: readonly Triple[] = [
  [-0.95, 0, -2.25],
  [0.95, 0, -2.25],
];
const bulbHeight = 1.55;
const bulbRadius = 0.3;
const corners: readonly Triple[] = [
  [-2.6, 0, -2.25],
  [2.6, 0, -2.25],
  [2.6, 0, 0.75],
  [-2.6, 0, 0.75],
];
const solar = { x: 3.3, z: 1.9 };
const fanAt: Triple = [solar.x - 0.9, 1.15, solar.z - 0.1];
const leverOpen = 0.55;
const leverHinge: Triple = [switchAt[0] - 0.32, 0.62, switchAt[2]];
const glowMotion: Motion = { kind: "wake", reach: 6 };

/** A wire that sags a little between two points, as a real cable does. */
const addWire = (
  builder: AttractionBuilder,
  from: Triple,
  to: Triple,
  colour: string,
) => {
  const sag: Triple = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2 - 0.1,
    (from[2] + to[2]) / 2,
  ];
  if (builder.isFar) {
    return;
  }
  builder.bar("paint", colour, from, sag, 0.07, 6);
  builder.bar("paint", colour, sag, to, 0.07, 6);
  builder.sphere("paint", colour, 0.035, sag, [1, 1, 1], 6);
};

/** A timber post with a white insulator on top to carry the wire. */
const addPost = (builder: AttractionBuilder, at: Triple) => {
  builder.cylinder("matte", postTimber, {
    radius: 0.07,
    radiusEnd: 0.06,
    length: wireHeight,
    at: [at[0], wireHeight / 2, at[2]],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.lathe(
    "paint",
    insulator,
    [
      [0, 0],
      [0.1, 0],
      [0.1, 0.04],
      [0.07, 0.06],
      [0.09, 0.09],
      [0.05, 0.13],
      [0, 0.14],
    ],
    [at[0], wireHeight - 0.05, at[2]],
    "y",
    10,
  );
};

const buildBattery = (builder: AttractionBuilder) => {
  const [x, , z] = battery;
  builder.box("matte", palette.paleTimber, [1.2, 0.18, 1.2], [x, 0.09, z]);
  builder.cylinder("paint", batteryBlack, {
    radius: 0.45,
    length: 0.8,
    at: [x, 0.58, z],
    segments: 24,
  });
  builder.cylinder("paint", batteryOrange, {
    radius: 0.45,
    length: 0.62,
    at: [x, 1.29, z],
    segments: 24,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", palette.steel, {
    radius: 0.42,
    length: 0.08,
    at: [x, 1.64, z],
    segments: 24,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.14,
    length: 0.14,
    at: [x, 1.74, z],
    segments: 14,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.43,
    length: 0.05,
    at: [x, 0.2, z],
    segments: 24,
  });
  /* Big plus and minus signs, so everyone knows which end is which */
  builder.box(
    "paint",
    palette.white,
    [0.26, 0.07, 0.02],
    [x + 0.12, 1.32, z + 0.43],
    [0, 0.27, 0],
  );
  builder.box(
    "paint",
    palette.white,
    [0.07, 0.26, 0.02],
    [x + 0.12, 1.32, z + 0.43],
    [0, 0.27, 0],
  );
  builder.box(
    "paint",
    palette.white,
    [0.26, 0.07, 0.02],
    [x + 0.12, 0.62, z + 0.43],
    [0, 0.27, 0],
  );
  /* A band of writing round the middle, and the volts */
  builder.cylinder("paint", shade(batteryOrange, 0.8), {
    radius: 0.455,
    length: 0.05,
    at: [x, 0.98, z],
    segments: 24,
  });
  builder.box(
    "paint",
    batteryBlack,
    [0.3, 0.06, 0.02],
    [x - 0.2, 1.12, z + 0.4],
    [0, -0.45, 0],
  );
  /* The terminals the wires are clamped to */
  builder.cylinder("metal", palette.brass, {
    radius: 0.05,
    length: 0.12,
    at: [x + 0.3, 1.74, z],
    segments: 8,
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.05,
    length: 0.12,
    at: [x + 0.48, 0.32, z],
    axis: "x",
    segments: 8,
  });
};

/** The knife switch's base: a board with the hinge and the contact clip. */
const buildSwitchBase = (builder: AttractionBuilder) => {
  const [x, , z] = switchAt;
  builder.box(
    "matte",
    palette.darkTimber,
    [0.14, 0.5, 0.14],
    [x - 0.3, 0.25, z],
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.14, 0.5, 0.14],
    [x + 0.3, 0.25, z],
  );
  builder.box("paint", "#3a3a3e", [1.0, 0.08, 0.5], [x, 0.54, z]);
  if (builder.isFar) {
    builder.box(
      "metal",
      copper,
      [0.75, 0.05, 0.08],
      [x, 0.9, z],
      [0, 0, leverOpen],
    );
    return;
  }
  builder.box(
    "paint",
    shade("#3a3a3e", 1.3),
    [1.04, 0.03, 0.54],
    [x, 0.595, z],
  );
  /* The hinge's two cheeks and the contact clip's two jaws */
  [-0.05, 0.05].forEach((dz) => {
    builder.box("metal", copper, [0.08, 0.14, 0.02], [x - 0.32, 0.65, z + dz]);
    builder.box("metal", copper, [0.08, 0.16, 0.02], [x + 0.38, 0.66, z + dz]);
  });
  builder.box(
    "paint",
    palette.postRed,
    [0.18, 0.03, 0.1],
    [x - 0.42, 0.62, z + 0.18],
  );
  builder.box(
    "paint",
    palette.white,
    [0.12, 0.02, 0.02],
    [x + 0.38, 0.62, z + 0.18],
  );
  builder.box(
    "paint",
    palette.white,
    [0.02, 0.02, 0.12],
    [x - 0.42, 0.63, z + 0.18],
  );
  /* Words painted on the board: OFF above, ON below */
  builder.box("paint", "#f2c94c", [0.3, 0.02, 0.06], [x, 0.6, z - 0.18]);
};

/** The switch lever, built open, so it nods shut and open again. */
const buildLever = (builder: AttractionBuilder) => {
  const angle = leverOpen;
  const along = (distance: number, up: number): Triple => [
    distance * Math.cos(angle) - up * Math.sin(angle),
    distance * Math.sin(angle) + up * Math.cos(angle),
    0,
  ];
  builder.box("metal", copper, [0.78, 0.035, 0.08], along(0.39, 0), [
    0,
    0,
    angle,
  ]);
  builder.cylinder("metal", palette.brass, {
    radius: 0.04,
    length: 0.14,
    at: [0, 0, 0],
    axis: "z",
    segments: 10,
  });
  builder.cylinder("paint", palette.postRed, {
    radius: 0.06,
    length: 0.26,
    at: along(0.82, 0.12),
    segments: 12,
  });
  builder.sphere(
    "paint",
    palette.postRed,
    0.07,
    along(0.82, 0.26),
    [1, 1, 1],
    10,
  );
  builder.box("metal", copper, [0.04, 0.12, 0.04], along(0.8, 0.04), [
    0,
    0,
    angle,
  ]);
};

const buildBuzzer = (builder: AttractionBuilder) => {
  const [x, , z] = buzzer;
  builder.box("matte", postTimber, [0.14, 0.8, 0.14], [x, 0.4, z]);
  builder.box("paint", "#2a2c30", [0.6, 0.5, 0.4], [x, 1.05, z]);
  if (builder.isFar) {
    return;
  }
  builder.cylinder("paint", "#f2c94c", {
    radius: 0.2,
    length: 0.06,
    at: [x - 0.3, 1.07, z],
    axis: "x",
    segments: 18,
  });
  for (let ring = 0; ring < 3; ring++) {
    builder.torus(
      "paint",
      "#2a2c30",
      0.05 + ring * 0.05,
      0.012,
      [x - 0.335, 1.07, z],
      "x",
      12,
    );
  }
  /* Sound waves drawn coming out of it */
  [0.32, 0.46].forEach((reach, index) => {
    builder.torus(
      "paint",
      "#f2c94c",
      reach,
      0.015,
      [x - 0.4 - index * 0.05, 1.07, z],
      "x",
      16,
    );
  });
};

/** A giant light bulb on a stand, unlit until its circuit is closed. */
const addBulb = (builder: AttractionBuilder, at: Triple) => {
  const [x, , z] = at;
  builder.cylinder("matte", postTimber, {
    radius: 0.09,
    radiusEnd: 0.07,
    length: bulbHeight - 0.4,
    at: [x, (bulbHeight - 0.4) / 2, z],
    segments: 8,
  });
  builder.sphere(
    "glass",
    bulbGlass,
    bulbRadius,
    [x, bulbHeight, z],
    [1, 1.12, 1],
    builder.isFar ? 10 : 18,
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.28,
    radiusEnd: 0.22,
    length: 0.14,
    at: [x, 0.07, z],
    segments: 12,
  });
  /* The screw cap, with its ridges */
  builder.cylinder("metal", palette.steel, {
    radius: 0.14,
    length: 0.26,
    at: [x, bulbHeight - 0.38, z],
    segments: 14,
  });
  [0.3, 0.38, 0.46].forEach((drop) => {
    builder.torus(
      "metal",
      palette.steel,
      0.145,
      0.02,
      [x, bulbHeight - drop, z],
      "y",
      14,
    );
  });
  builder.cylinder("paint", batteryBlack, {
    radius: 0.07,
    length: 0.05,
    at: [x, bulbHeight - 0.53, z],
    segments: 10,
  });
  /* The filament on its two wires, seen through the glass */
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + side * 0.05, bulbHeight - 0.25, z + bulbRadius * 0.9],
      [x + side * 0.08, bulbHeight + 0.05, z + bulbRadius * 1.02],
      0.015,
      4,
    );
  });
  builder.box(
    "metal",
    palette.darkSteel,
    [0.18, 0.02, 0.02],
    [x, bulbHeight + 0.06, z + bulbRadius * 1.04],
  );
};

/** The glow of a lit bulb: it wakes when someone comes to close the switch. */
const buildBulbGlow = (builder: AttractionBuilder) => {
  builder.sphere(
    "glow",
    bulbGlow,
    bulbRadius + 0.025,
    [0, 0, 0],
    [1, 1.12, 1],
    18,
  );
};

const buildCircuit = (builder: AttractionBuilder) => {
  corners.forEach((corner) => {
    addPost(builder, corner);
  });
  const top = (at: Triple): Triple => [at[0], wireHeight + 0.06, at[2]];
  const bulbTerminal = (at: Triple, side: number): Triple => [
    at[0] + side * 0.12,
    bulbHeight - 0.5,
    at[2],
  ];
  /* Battery + to the switch, through the bulbs and buzzer, back to battery − */
  addWire(
    builder,
    [battery[0] + 0.3, 1.8, battery[2]],
    top(corners[3]),
    wireRed,
  );
  addWire(
    builder,
    top(corners[3]),
    [switchAt[0] - 0.36, 0.64, switchAt[2]],
    wireRed,
  );
  addWire(
    builder,
    [switchAt[0] + 0.42, 0.64, switchAt[2]],
    top(corners[2]),
    wireRed,
  );
  addWire(builder, top(corners[2]), [buzzer[0], 1.3, buzzer[2] + 0.1], wireRed);
  addWire(
    builder,
    [buzzer[0], 1.3, buzzer[2] - 0.1],
    top(corners[1]),
    wireBlack,
  );
  addWire(builder, top(corners[1]), bulbTerminal(bulbs[1], 1), wireBlack);
  addWire(
    builder,
    bulbTerminal(bulbs[1], -1),
    bulbTerminal(bulbs[0], 1),
    wireBlack,
  );
  addWire(builder, bulbTerminal(bulbs[0], -1), top(corners[0]), wireBlack);
  addWire(
    builder,
    top(corners[0]),
    [battery[0] + 0.55, 0.32, battery[2]],
    wireBlack,
  );
  bulbs.forEach((bulb) => {
    addBulb(builder, bulb);
  });
};

const buildSolarPanel = (builder: AttractionBuilder) => {
  const { x, z } = solar;
  builder.box("metal", palette.darkSteel, [0.08, 1.0, 0.08], [x, 0.5, z]);
  builder.box("paint", solarBlue, [1.1, 0.05, 0.8], [x, 1.1, z], [-0.6, 0, 0]);
  if (builder.isFar) {
    return;
  }
  builder.box(
    "metal",
    palette.steel,
    [1.16, 0.04, 0.86],
    [x, 1.08, z - 0.01],
    [-0.6, 0, 0],
  );
  /* The grid of cells */
  for (let line = 1; line < 4; line++) {
    builder.box(
      "paint",
      shade(solarBlue, 1.5),
      [0.012, 0.012, 0.8],
      [x - 0.55 + line * 0.275, 1.13, z + 0.01],
      [-0.6, 0, 0],
    );
  }
  [-0.13, 0.13].forEach((along) => {
    builder.box(
      "paint",
      shade(solarBlue, 1.5),
      [1.1, 0.012, 0.012],
      [x, 1.13 + along * Math.sin(0.6), z + along * Math.cos(0.6) + 0.01],
      [-0.6, 0, 0],
    );
  });
  /* A little motor on a post, worked by the panel, and its wires */
  builder.box(
    "metal",
    palette.darkSteel,
    [0.06, fanAt[1] - 0.1, 0.06],
    [fanAt[0], (fanAt[1] - 0.1) / 2, fanAt[2]],
  );
  builder.cylinder("paint", "#c8c8cc", {
    radius: 0.09,
    length: 0.2,
    at: [fanAt[0], fanAt[1], fanAt[2] - 0.12],
    axis: "z",
    segments: 12,
  });
  addWire(
    builder,
    [x - 0.3, 0.85, z],
    [fanAt[0], fanAt[1] - 0.05, fanAt[2] - 0.2],
    wireRed,
  );
};

const buildFan = (builder: AttractionBuilder) => {
  builder.sphere("paint", palette.white, 0.05, [0, 0, 0.02], [1, 1, 1], 8);
  for (let blade = 0; blade < 3; blade++) {
    const angle = (blade / 3) * Math.PI * 2;
    builder.box(
      "paint",
      ["#e85a4f", "#f2c94c", "#4f9ae8"][blade] ?? palette.white,
      [0.08, 0.26, 0.015],
      [Math.sin(angle) * 0.15, Math.cos(angle) * 0.15, 0],
      [0.25, 0, -angle],
    );
  }
};

/** A chalkboard showing the circuit drawn with its symbols. */
const buildDiagramBoard = (builder: AttractionBuilder) => {
  const at: Triple = [-3.4, 0, 1.9];
  const turn = 0.5;
  const place = (x: number, y: number, z = 0.05): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  [-0.55, 0.55].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 1.6, 0.08],
      place(side, 0.8, 0),
      [0, turn, 0],
    );
  });
  builder.box("matte", boardGreen, [1.2, 0.8, 0.05], place(0, 1.15, 0), [
    0,
    turn,
    0,
  ]);
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    palette.paleTimber,
    [1.28, 0.06, 0.08],
    place(0, 1.56, 0),
    [0, turn, 0],
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [1.28, 0.06, 0.12],
    place(0, 0.74, 0.02),
    [0, turn, 0],
  );
  /* Chalk lines: a loop with a cell, a switch, a bulb (a circle with a cross) and a buzzer */
  const chalk = palette.white;
  builder.box("paint", chalk, [0.9, 0.02, 0.01], place(0, 1.42), [0, turn, 0]);
  builder.box("paint", chalk, [0.9, 0.02, 0.01], place(0, 0.88), [0, turn, 0]);
  builder.box("paint", chalk, [0.02, 0.54, 0.01], place(-0.45, 1.15), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", chalk, [0.02, 0.54, 0.01], place(0.45, 1.15), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", boardGreen, [0.12, 0.05, 0.012], place(-0.1, 1.42), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", chalk, [0.02, 0.14, 0.012], place(-0.14, 1.42, 0.056), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", chalk, [0.02, 0.08, 0.012], place(-0.06, 1.42, 0.056), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", boardGreen, [0.14, 0.05, 0.012], place(0.05, 0.88), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", chalk, [0.16, 0.02, 0.012], place(0.04, 0.92, 0.056), [
    0,
    turn,
    0.4,
  ]);
  builder.torus("paint", chalk, 0.07, 0.01, place(0.45, 1.15, 0.055), "z", 12);
  builder.box("paint", chalk, [0.13, 0.015, 0.012], place(0.45, 1.15, 0.058), [
    0,
    turn,
    Math.PI / 4,
  ]);
  builder.box("paint", chalk, [0.13, 0.015, 0.012], place(0.45, 1.15, 0.058), [
    0,
    turn,
    -Math.PI / 4,
  ]);
  /* A stub of chalk on the ledge */
  builder.box("paint", chalk, [0.08, 0.025, 0.025], place(0.3, 0.79, 0.05), [
    0,
    turn,
    0,
  ]);
};

const addFern = (builder: AttractionBuilder, at: Triple, size: number) => {
  const fronds = builder.isFar ? 0 : 6;
  for (let index = 0; index < fronds; index++) {
    const turn = (index / fronds) * Math.PI * 2 + size;
    builder.add(
      "matte",
      index % 2 === 0 ? fernGreen : shade(fernGreen, 0.8),
      new SphereGeometry(1, 6, 3),
      {
        at: [
          at[0] + Math.sin(turn) * 0.35 * size,
          0.25 * size,
          at[2] + Math.cos(turn) * 0.35 * size,
        ],
        rotation: [-0.5, turn, 0],
        scale: [0.12 * size, 0.03, 0.45 * size],
      },
    );
  }
};

const buildGarden = (builder: AttractionBuilder) => {
  /* A bark-chip floor inside the circuit, and a path from the visitors */
  builder.cylinder("matte", bark, {
    radius: 3.2,
    length: 0.03,
    at: [0, 0.015, -0.75],
    segments: builder.isFar ? 16 : 36,
  });
  builder.box("matte", palette.path, [1.1, 0.035, 3.0], [-1.4, 0.0175, 2.9]);
  if (builder.isFar) {
    return;
  }
  /* A drum of spare wire, and a toolbox of crocodile clips */
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.32,
    length: 0.06,
    at: [1.6, 0.32, 1.9],
    axis: "x",
    segments: 16,
  });
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.32,
    length: 0.06,
    at: [1.98, 0.32, 1.9],
    axis: "x",
    segments: 16,
  });
  builder.cylinder("paint", wireRed, {
    radius: 0.22,
    length: 0.34,
    at: [1.79, 0.32, 1.9],
    axis: "x",
    segments: 16,
  });
  builder.box(
    "paint",
    "#2f6fb8",
    [0.55, 0.26, 0.3],
    [-0.3, 0.13, 2.0],
    [0, 0.3, 0],
  );
  builder.box(
    "metal",
    palette.steel,
    [0.3, 0.04, 0.04],
    [-0.3, 0.3, 2.0],
    [0, 0.3, 0],
  );
  builder.box(
    "paint",
    wireRed,
    [0.12, 0.03, 0.04],
    [-0.1, 0.02, 2.3],
    [0, 0.8, 0],
  );
  builder.box(
    "paint",
    wireBlack,
    [0.12, 0.03, 0.04],
    [-0.02, 0.02, 2.2],
    [0, -0.4, 0],
  );
  addFern(builder, [-3.5, 0, -1.9], 1.1);
  addFern(builder, [3.6, 0, -1.6], 1.0);
  addFern(builder, [0, 0, -3.8], 1.2);
  addFern(builder, [-2.0, 0, -3.5], 0.9);
  addFern(builder, [2.2, 0, -3.4], 0.8);
};

export const circuitGardenModel: CuriosityModel = {
  kind: "circuit-garden",
  islandId: "jungle-reach",
  name: "Circuit Garden",
  fact: "Electricity flows only round a complete loop called a circuit. This giant series circuit joins a cell to a switch, a buzzer and two bulbs, one after another. Close the switch and the loop is complete, so the bulbs light and the buzzer buzzes. Open it, and there is a gap, so everything stops.",
  curriculumLink:
    "Science, Year 4: construct a simple series electrical circuit, and recognise that a switch opens and closes a circuit and is associated with whether or not a lamp lights.",
  footprint: 5.1,
  setting: "inland",
  signSpot: { x: -1.5, z: 4.4 },
  build: (builder) => {
    buildGarden(builder);
    buildBattery(builder);
    buildSwitchBase(builder);
    buildBuzzer(builder);
    buildCircuit(builder);
    buildSolarPanel(builder);
    buildDiagramBoard(builder);
    addSignBoard(builder, [-1.5, 0, 4.4], signColour);
  },
  moving: [
    {
      name: "switch lever",
      pivot: leverHinge,
      build: buildLever,
      motion: { kind: "nod", axis: "z", reach: 5, amplitude: 0.5, period: 3 },
    },
    ...bulbs.map((bulb, index) => ({
      name: `bulb glow ${String(index + 1)}`,
      pivot: [bulb[0], bulbHeight, bulb[2]] satisfies Triple,
      build: buildBulbGlow,
      motion: glowMotion,
    })),
    {
      name: "solar fan",
      pivot: fanAt,
      build: buildFan,
      motion: { kind: "whirl", axis: "z", idle: 2, speed: 9, reach: 6 },
    },
  ],
  blockers: [
    { x: battery[0], z: battery[2], radius: 0.7 },
    { x: switchAt[0], z: switchAt[2], radius: 0.5 },
    { x: buzzer[0], z: buzzer[2], radius: 0.4 },
    ...bulbs.map(([x, , z]): LocalBlocker => ({ x, z, radius: 0.35 })),
    ...corners.map(([x, , z]): LocalBlocker => ({ x, z, radius: 0.15 })),
    { x: solar.x, z: solar.z, radius: 0.35 },
    { x: -3.4, z: 1.9, radius: 0.5 },
    { x: 1.8, z: 1.9, radius: 0.35 },
  ],
  play: {
    label: "Close the switch",
    news: "Click! The circuit is complete: the bulbs glow, the buzzer buzzes and the electricity flows all the way round.",
  },
};
