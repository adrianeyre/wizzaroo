import {
  CylinderGeometry,
  ExtrudeGeometry,
  RingGeometry,
  Shape,
  TorusGeometry,
} from "three";
import {
  addLampPost,
  addSignBoard,
  addWindow,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type Motion,
  type PlayRide,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

/*
 * A Victorian hall of famous inventions under a glass and iron roof.
 * Inside stand a giant light bulb whose filament glows as you come
 * near, a candlestick telephone whose receiver rattles as it rings, a
 * wooden printing press, a giant circuit and a phonograph. Outside, a
 * steam engine's flywheel whirls and puffs, and the Character can ride
 * a penny-farthing bicycle round the forecourt.
 */

const stone = "#e6ddc8";
const stoneDark = "#c9bea6";
const brick = "#8a4a3a";
const iron = "#2b2f6b";
const ironDark = "#1b2350";
const glassBlue = "#9ec4e0";
const brass = "#d4b04a";
const copper = "#c27a4a";
const oak = "#8a5a35";
const oakDark = "#5a3a22";
const tileDark = "#2b2f45";
const tileLight = "#e8e4da";
const signColour = "#2b2f6b";
const glowWarm = "#ffd27a";
const glowCyan = "#7ff3ff";

const footprint = 10;

/* The hall, its open front facing +z */
const hallHalf = 4.2;
const hallBack = -5.6;
const hallFront = -0.6;
const wallTop = 3.4;
const vaultRadius = (hallFront - hallBack) / 2;
const vaultZ = (hallFront + hallBack) / 2;
const columnXs = [-4.05, -1.6, 1.6, 4.05];

/* The forecourt's bicycle loop */
const loop = { x: -0.6, z: 3.4 };
const loopRadius = 2.2;

/* Exhibits */
const bulbAt = { x: -3.0, z: -4.3 };
const phoneAt = { x: -1.0, z: -4.85 };
const circuitAt = { x: 1.1, z: -4.85 };
const pressAt = { x: 3.0, z: -4.0 };
const phonographAt = { x: -3.2, z: -1.6 };
const engineAt = { x: 5.6, z: 1.8 };

/* The hall */

const buildHall = (builder: AttractionBuilder) => {
  const depth = hallFront - hallBack;
  /* Back and side walls of cream stone on a brick plinth */
  builder.box(
    "matte",
    stone,
    [hallHalf * 2 + 0.3, wallTop, 0.3],
    [0, wallTop / 2, hallBack],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      stone,
      [0.3, wallTop, depth],
      [side * hallHalf, wallTop / 2, vaultZ],
    );
  });
  builder.box(
    "matte",
    brick,
    [hallHalf * 2 + 0.36, 0.5, 0.36],
    [0, 0.25, hallBack],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      brick,
      [0.36, 0.5, depth],
      [side * hallHalf, 0.25, vaultZ],
    );
  });
  /* The cornice along the top of the walls */
  builder.box(
    "matte",
    stoneDark,
    [hallHalf * 2 + 0.5, 0.2, 0.5],
    [0, wallTop + 0.1, hallBack],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      stoneDark,
      [0.5, 0.2, depth + 0.4],
      [side * hallHalf, wallTop + 0.1, vaultZ],
    );
  });
  /* Tall windows down the sides */
  [-1, 1].forEach((side) => {
    [-4.4, -3.0, -1.6].forEach((z) => {
      addWindow(builder, {
        at: [side * (hallHalf + 0.16), 2.0, z],
        width: 0.7,
        height: 1.6,
        frame: palette.white,
        glass: glassBlue,
        turn: side * (Math.PI / 2),
      });
    });
  });
  /* The front: four iron columns and the beam they hold up */
  columnXs.forEach((x) => {
    builder.cylinder("paint", iron, {
      radius: 0.16,
      radiusEnd: 0.13,
      length: wallTop,
      at: [x, wallTop / 2, hallFront],
      segments: 12,
    });
    builder.box("paint", iron, [0.42, 0.25, 0.42], [x, 0.12, hallFront]);
    builder.box(
      "paint",
      brass,
      [0.36, 0.14, 0.36],
      [x, wallTop - 0.07, hallFront],
    );
  });
  builder.box(
    "paint",
    iron,
    [hallHalf * 2 + 0.3, 0.4, 0.3],
    [0, wallTop + 0.2, hallFront],
  );
  /* The barrel-vaulted glass roof */
  builder.add(
    "glass",
    glassBlue,
    new CylinderGeometry(
      vaultRadius,
      vaultRadius,
      hallHalf * 2 + 0.2,
      builder.segments(20, 8),
      1,
      true,
      0,
      Math.PI,
    ).rotateZ(Math.PI / 2),
    { at: [0, wallTop + 0.2, vaultZ] },
  );
  /* The half-round ends of the vault, glass in an iron fan */
  [-1, 1].forEach((side) => {
    builder.add(
      "glass",
      shade(glassBlue, 0.9),
      new CylinderGeometry(
        vaultRadius,
        vaultRadius,
        0.06,
        builder.segments(20, 8),
        1,
        false,
        0,
        Math.PI,
      ).rotateZ(Math.PI / 2),
      { at: [side * (hallHalf + 0.05), wallTop + 0.2, vaultZ] },
    );
  });
  /* Iron ribs over the vault */
  const ribs = builder.isFar ? 3 : 7;
  for (let rib = 0; rib < ribs; rib++) {
    const x = -hallHalf + (rib / (ribs - 1)) * hallHalf * 2;
    builder.add(
      "paint",
      ironDark,
      new TorusGeometry(
        vaultRadius + 0.03,
        0.06,
        4,
        builder.segments(18, 8),
        Math.PI,
      ).rotateY(Math.PI / 2),
      { at: [x, wallTop + 0.2, vaultZ] },
    );
  }
  /* A ridge vent along the top, and a flag */
  builder.box(
    "paint",
    ironDark,
    [hallHalf * 2 + 0.2, 0.18, 0.4],
    [0, wallTop + 0.2 + vaultRadius + 0.05, vaultZ],
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.04,
    length: 1.6,
    at: [0, wallTop + vaultRadius + 1.0, vaultZ],
    segments: 6,
  });
  builder.box(
    "paint",
    "#c8102e",
    [0.9, 0.5, 0.03],
    [0.47, wallTop + vaultRadius + 1.5, vaultZ],
  );
  /* The pediment over the entrance, with a clock */
  const pediment = new Shape();
  pediment.moveTo(-2.0, 0);
  pediment.lineTo(2.0, 0);
  pediment.lineTo(0, 1.2);
  pediment.lineTo(-2.0, 0);
  builder.add(
    "matte",
    stone,
    new ExtrudeGeometry(pediment, { depth: 0.3, bevelEnabled: false }),
    { at: [0, wallTop + 0.4, hallFront - 0.15] },
  );
  builder.cylinder("glow", "#fff8e8", {
    radius: 0.36,
    length: 0.04,
    at: [0, wallTop + 0.82, hallFront + 0.17],
    axis: "z",
    segments: 18,
  });
  if (!builder.isFar) {
    builder.torus(
      "metal",
      brass,
      0.37,
      0.04,
      [0, wallTop + 0.82, hallFront + 0.18],
      "z",
      18,
    );
  }
  /* The floor: black and white tiles */
  builder.box(
    "matte",
    tileLight,
    [hallHalf * 2, 0.04, depth],
    [0, 0.02, vaultZ],
  );
  if (builder.isFar) {
    return;
  }
  for (let row = 0; row < 6; row++) {
    for (let column = 0; column < 10; column++) {
      if ((row + column) % 2 === 0) {
        continue;
      }
      builder.box(
        "matte",
        tileDark,
        [0.82, 0.01, 0.82],
        [-hallHalf + 0.42 + column * 0.84, 0.045, hallBack + 0.45 + row * 0.82],
      );
    }
  }
  /* Letters across the beam: INVENTORS HALL in gold */
  for (let letter = 0; letter < 13; letter++) {
    if (letter === 9) {
      continue;
    }
    builder.box(
      "metal",
      brass,
      [0.16, 0.22, 0.02],
      [-1.65 + letter * 0.275, wallTop + 0.2, hallFront + 0.16],
    );
  }
  /* Portraits of inventors on the back wall */
  const portraits = ["#7a4a5a", "#4a6a7a", "#6a5a3a", "#3a5a4a"];
  portraits.forEach((colour, index) => {
    const x = -3.0 + index * 2.0;
    builder.box("metal", brass, [0.8, 1.0, 0.04], [x, 2.6, hallBack + 0.17]);
    builder.box("matte", colour, [0.64, 0.84, 0.02], [x, 2.6, hallBack + 0.2]);
    builder.sphere(
      "matte",
      "#e8c8a8",
      0.13,
      [x, 2.72, hallBack + 0.22],
      [1, 1.2, 0.3],
      8,
    );
    builder.box(
      "matte",
      "#2a2a2a",
      [0.36, 0.3, 0.02],
      [x, 2.38, hallBack + 0.22],
    );
  });
};

/* The exhibits */

const plinth = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  width: number,
  height: number,
  depth = width,
) => {
  builder.box("paint", ironDark, [width, height, depth], [x, height / 2, z]);
  builder.box(
    "metal",
    brass,
    [width + 0.06, 0.05, depth + 0.06],
    [x, height, z],
  );
  builder.box(
    "metal",
    brass,
    [width * 0.5, 0.12, 0.02],
    [x, height * 0.6, z + depth / 2 + 0.01],
  );
};

const bulbBase = 1.0;

const buildBulb = (builder: AttractionBuilder) => {
  const { x, z } = bulbAt;
  plinth(builder, x, z, 0.95, 0.8);
  /* The brass screw cap, the glass neck and the great round bulb */
  builder.cylinder("metal", brass, {
    radius: 0.24,
    length: 0.3,
    at: [x, bulbBase - 0.05, z],
    segments: 14,
  });
  if (!builder.isFar) {
    for (let thread = 0; thread < 3; thread++) {
      builder.torus(
        "metal",
        shade(brass, 0.85),
        0.25,
        0.025,
        [x, bulbBase - 0.15 + thread * 0.09, z],
        "y",
        14,
      );
    }
  }
  builder.lathe(
    "glass",
    "#e8f2ff",
    [
      [0.22, 0],
      [0.26, 0.25],
      [0.5, 0.55],
      [0.66, 0.95],
      [0.62, 1.3],
      [0.42, 1.58],
      [0.001, 1.68],
    ],
    [x, bulbBase + 0.1, z],
    "y",
    builder.segments(20, 10),
  );
  /* The glass stem holding up the filament's wires */
  builder.cylinder("glass", "#f4f8ff", {
    radius: 0.05,
    length: 0.5,
    at: [x, bulbBase + 0.4, z],
    segments: 8,
  });
  [-0.12, 0.12].forEach((dx) => {
    builder.bar(
      "metal",
      copper,
      [x + dx * 0.3, bulbBase + 0.6, z],
      [x + dx * 2.5, bulbBase + 1.0, z],
      0.02,
      4,
    );
  });
};

const buildPhone = (builder: AttractionBuilder) => {
  const { x, z } = phoneAt;
  plinth(builder, x, z, 0.8, 0.7);
  /* The candlestick: a round foot, a tall stem and a mouthpiece */
  builder.cylinder("paint", palette.black, {
    radius: 0.28,
    radiusEnd: 0.18,
    length: 0.12,
    at: [x, 0.76, z],
    segments: 16,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.06,
    length: 1.0,
    at: [x, 1.3, z],
    segments: 10,
  });
  builder.cylinder("metal", brass, {
    radius: 0.07,
    length: 0.06,
    at: [x, 1.8, z],
    segments: 10,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.08,
    radiusEnd: 0.16,
    length: 0.2,
    at: [x, 1.92, z + 0.12],
    axis: "z",
    segments: 12,
  });
  /* The hook the receiver hangs on, and its curly cord */
  builder.bar("metal", brass, [x + 0.06, 1.62, z], [x + 0.2, 1.62, z], 0.03, 4);
  if (!builder.isFar) {
    for (let loop = 0; loop < 6; loop++) {
      builder.torus(
        "paint",
        "#3a2a1a",
        0.04,
        0.012,
        [x + 0.12, 0.9 + loop * 0.07, z + 0.12],
        "y",
        6,
      );
    }
  }
};

const buildCircuit = (builder: AttractionBuilder) => {
  const { x, z } = circuitAt;
  /* A big table with a giant circuit on it */
  builder.box("matte", oak, [1.9, 0.08, 0.9], [x, 0.8, z]);
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      builder.box(
        "matte",
        oakDark,
        [0.08, 0.76, 0.08],
        [x + sx * 0.85, 0.38, z + sz * 0.38],
      );
    });
  });
  if (builder.isFar) {
    builder.box("paint", ironDark, [1.4, 0.8, 0.04], [x, 1.85, z - 0.4]);
    return;
  }
  /* Two cells, end to end */
  [-0.65, -0.2].forEach((dx) => {
    builder.cylinder("paint", "#c8302a", {
      radius: 0.14,
      length: 0.42,
      at: [x + dx, 0.98, z - 0.15],
      axis: "x",
      segments: 12,
    });
    builder.cylinder("paint", palette.black, {
      radius: 0.145,
      length: 0.12,
      at: [x + dx - 0.15, 0.98, z - 0.15],
      axis: "x",
      segments: 12,
    });
    builder.cylinder("metal", palette.steel, {
      radius: 0.04,
      length: 0.05,
      at: [x + dx + 0.23, 0.98, z - 0.15],
      axis: "x",
      segments: 8,
    });
  });
  /* A buzzer, a switch with its lever and a little bulb */
  builder.cylinder("paint", "#2a2a2a", {
    radius: 0.12,
    length: 0.12,
    at: [x + 0.55, 0.9, z - 0.15],
    segments: 12,
  });
  builder.box("matte", oakDark, [0.3, 0.05, 0.14], [x + 0.2, 0.86, z + 0.22]);
  builder.bar(
    "metal",
    copper,
    [x + 0.08, 0.9, z + 0.22],
    [x + 0.3, 1.0, z + 0.22],
    0.025,
    4,
  );
  builder.cylinder("metal", brass, {
    radius: 0.06,
    length: 0.08,
    at: [x + 0.65, 0.88, z + 0.22],
    segments: 10,
  });
  builder.sphere(
    "glow",
    glowWarm,
    0.09,
    [x + 0.65, 1.0, z + 0.22],
    [1, 1.2, 1],
    10,
  );
  /* Copper wires joining them all in one loop */
  const wire: Triple[] = [
    [x - 0.88, 0.86, z - 0.15],
    [x - 0.88, 0.86, z + 0.3],
    [x + 0.08, 0.86, z + 0.3],
    [x + 0.32, 0.86, z + 0.3],
    [x + 0.65, 0.86, z + 0.3],
    [x + 0.8, 0.86, z + 0.22],
    [x + 0.8, 0.86, z - 0.15],
    [x + 0.67, 0.86, z - 0.15],
  ];
  wire.slice(1).forEach((to, index) => {
    builder.bar("metal", copper, wire[index], to, 0.03, 4);
  });
  /* A board of circuit symbols on a stand behind */
  builder.box("paint", ironDark, [1.4, 0.8, 0.04], [x, 1.85, z - 0.4]);
  builder.box("metal", brass, [1.48, 0.06, 0.06], [x, 2.28, z - 0.4]);
  /* Chalk symbols: a cell, a switch, a bulb and a buzzer, joined by lines */
  builder.box("paint", palette.white, [1.1, 0.025, 0.01], [x, 2.1, z - 0.375]);
  builder.box("paint", palette.white, [1.1, 0.025, 0.01], [x, 1.6, z - 0.375]);
  [-0.55, 0.55].forEach((dx) => {
    builder.box(
      "paint",
      palette.white,
      [0.025, 0.5, 0.01],
      [x + dx, 1.85, z - 0.375],
    );
  });
  builder.box(
    "paint",
    palette.white,
    [0.025, 0.2, 0.012],
    [x - 0.25, 2.1, z - 0.37],
  );
  builder.box(
    "paint",
    palette.white,
    [0.025, 0.12, 0.012],
    [x - 0.2, 2.1, z - 0.37],
  );
  builder.torus(
    "paint",
    palette.white,
    0.09,
    0.012,
    [x + 0.25, 2.1, z - 0.37],
    "z",
    12,
  );
  builder.box(
    "paint",
    palette.white,
    [0.16, 0.022, 0.012],
    [x + 0.25, 2.1, z - 0.365],
    [0, 0, Math.PI / 4],
  );
  builder.box(
    "paint",
    palette.white,
    [0.16, 0.022, 0.012],
    [x + 0.25, 2.1, z - 0.365],
    [0, 0, -Math.PI / 4],
  );
  builder.box(
    "paint",
    palette.white,
    [0.2, 0.022, 0.012],
    [x, 1.62, z - 0.365],
    [0, 0, 0.4],
  );
};

const buildPress = (builder: AttractionBuilder) => {
  const { x, z } = pressAt;
  /* Two great oak uprights, a head beam and the bed the type sits on */
  [-0.5, 0.5].forEach((dx) => {
    builder.box("matte", oak, [0.18, 2.3, 0.22], [x + dx, 1.15, z]);
  });
  builder.box("matte", oakDark, [1.3, 0.25, 0.3], [x, 2.2, z]);
  builder.box("matte", oakDark, [1.3, 0.2, 0.3], [x, 1.45, z]);
  builder.box("matte", oak, [0.85, 0.12, 1.4], [x, 0.85, z + 0.2]);
  builder.box("matte", oakDark, [0.95, 0.75, 0.3], [x, 0.4, z + 0.75]);
  /* The great screw and the flat platen it presses down */
  builder.cylinder("metal", brass, {
    radius: 0.07,
    length: 0.75,
    at: [x, 1.75, z],
    segments: 10,
  });
  builder.box("matte", oak, [0.7, 0.1, 0.55], [x, 1.08, z]);
  if (builder.isFar) {
    return;
  }
  for (let thread = 0; thread < 5; thread++) {
    builder.torus(
      "metal",
      shade(brass, 0.85),
      0.075,
      0.018,
      [x, 1.5 + thread * 0.1, z],
      "y",
      10,
    );
  }
  /* Rows of metal type on the bed, and a printed sheet hung up to dry */
  for (let row = 0; row < 4; row++) {
    builder.box(
      "metal",
      "#5a5e66",
      [0.55, 0.04, 0.06],
      [x, 0.93, z + 0.45 + row * 0.1],
    );
  }
  builder.box("matte", "#f6f1e2", [0.55, 0.7, 0.01], [x + 1.0, 1.8, z + 0.2]);
  builder.bar(
    "matte",
    oakDark,
    [x + 0.5, 2.2, z + 0.2],
    [x + 1.4, 2.2, z + 0.2],
    0.03,
    4,
  );
  for (let line = 0; line < 6; line++) {
    builder.box(
      "matte",
      "#2a2a2a",
      [0.42, 0.025, 0.012],
      [x + 1.0, 2.05 - line * 0.09, z + 0.21],
    );
  }
  /* The ink balls and the ink */
  builder.sphere(
    "matte",
    "#3a2a1a",
    0.1,
    [x - 0.65, 0.97, z + 0.7],
    [1, 0.7, 1],
    8,
  );
  builder.box("metal", "#1a1a22", [0.25, 0.04, 0.25], [x - 0.65, 0.9, z + 0.4]);
};

const buildPhonograph = (builder: AttractionBuilder) => {
  const { x, z } = phonographAt;
  plinth(builder, x, z, 0.8, 0.75);
  builder.box("matte", oak, [0.55, 0.28, 0.4], [x, 0.92, z]);
  builder.cylinder("paint", palette.black, {
    radius: 0.2,
    length: 0.03,
    at: [x, 1.08, z],
    segments: 16,
  });
  builder.lathe(
    "metal",
    brass,
    [
      [0.04, 0],
      [0.06, 0.25],
      [0.14, 0.55],
      [0.32, 0.8],
      [0.55, 0.95],
    ],
    [x + 0.15, 1.15, z + 0.0],
    "y",
    builder.segments(18, 8),
  );
};

const buildEngine = (builder: AttractionBuilder) => {
  const { x, z } = engineAt;
  /* A brick base, the long green boiler and its tall chimney */
  builder.box("matte", brick, [1.2, 0.5, 2.6], [x, 0.25, z]);
  builder.cylinder("paint", "#2f5a3a", {
    radius: 0.48,
    length: 2.2,
    at: [x, 1.0, z],
    axis: "z",
    segments: 16,
  });
  if (!builder.isFar) {
    [-0.7, 0, 0.7].forEach((dz) => {
      builder.torus("metal", brass, 0.49, 0.03, [x, 1.0, z + dz], "z", 16);
    });
  }
  builder.cylinder("paint", palette.black, {
    radius: 0.15,
    radiusEnd: 0.12,
    length: 1.6,
    at: [x, 2.1, z + 0.9],
    segments: 10,
  });
  builder.cylinder("metal", copper, {
    radius: 0.2,
    length: 0.12,
    at: [x, 2.92, z + 0.9],
    segments: 10,
  });
  /* The cylinder and piston rod driving the flywheel's crank */
  builder.cylinder("metal", palette.steel, {
    radius: 0.16,
    length: 0.6,
    at: [x - 0.55, 1.2, z - 0.55],
    axis: "z",
    segments: 10,
  });
  builder.bar(
    "metal",
    palette.steel,
    [x - 0.55, 1.2, z - 0.25],
    [x - 0.68, 1.25, z + 0.6],
    0.05,
    6,
  );
  builder.box("matte", brick, [0.3, 0.9, 0.5], [x - 1.0, 0.45, z + 0.75]);
  if (builder.isFar) {
    return;
  }
  builder.sphere("metal", brass, 0.14, [x, 1.55, z - 0.4], [1, 1, 1], 10);
  builder.cylinder("metal", brass, {
    radius: 0.04,
    length: 0.3,
    at: [x, 1.6, z + 0.3],
    segments: 6,
  });
  builder.cylinder("glow", glowCyan, {
    radius: 0.06,
    length: 0.25,
    at: [x + 0.48, 1.2, z - 0.4],
    segments: 8,
  });
};

/* The forecourt */

const buildForecourt = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    palette.paving,
    new RingGeometry(
      loopRadius - 0.55,
      loopRadius + 0.55,
      builder.segments(40, 16),
      1,
    ).rotateX(-Math.PI / 2),
    { at: [loop.x, 0.015, loop.z] },
  );
  builder.cylinder("matte", "#5f9a3c", {
    radius: loopRadius - 0.55,
    length: 0.03,
    at: [loop.x, 0.015, loop.z],
    segments: builder.segments(24, 12),
  });
  /* A fountain-like stand of Victorian lamps in the middle */
  builder.cylinder("matte", stoneDark, {
    radius: 0.5,
    length: 0.3,
    at: [loop.x, 0.15, loop.z],
    segments: 12,
  });
  addLampPost(builder, [loop.x, 0.3, loop.z], 2.0);
  /* A path to the hall */
  builder.box("matte", palette.paving, [2.4, 0.02, 1.6], [0, 0.01, 0.4]);
  if (builder.isFar) {
    return;
  }
  addLampPost(builder, [-4.6, 0, 1.0], 2.3);
  addLampPost(builder, [3.6, 0, 6.2], 2.3);
  /* Flower tubs either side of the entrance */
  [-2.6, 2.6].forEach((x) => {
    builder.cylinder("paint", iron, {
      radius: 0.3,
      radiusEnd: 0.24,
      length: 0.45,
      at: [x, 0.22, 0.2],
      segments: 12,
    });
    for (let flower = 0; flower < 5; flower++) {
      const angle = (flower / 5) * Math.PI * 2;
      builder.sphere(
        "matte",
        flower % 2 === 0 ? "#e86a9a" : "#f2c84a",
        0.1,
        [x + Math.sin(angle) * 0.14, 0.52, 0.2 + Math.cos(angle) * 0.14],
        [1, 0.8, 1],
        6,
      );
    }
  });
  /* Kerb stones round the loop */
  for (let stone = 0; stone < 20; stone++) {
    const angle = (stone / 20) * Math.PI * 2;
    builder.box(
      "matte",
      stoneDark,
      [0.4, 0.1, 0.12],
      [
        loop.x + Math.sin(angle) * (loopRadius + 0.6),
        0.05,
        loop.z + Math.cos(angle) * (loopRadius + 0.6),
      ],
      [0, angle + Math.PI / 2, 0],
    );
  }
};

/* Moving parts */

const buildFilament = (builder: AttractionBuilder) => {
  /* A zig-zag of glowing filament, and a soft glow filling the bulb */
  const points: Triple[] = [
    [-0.3, 0, 0],
    [-0.2, 0.18, 0],
    [-0.1, 0, 0],
    [0, 0.18, 0],
    [0.1, 0, 0],
    [0.2, 0.18, 0],
    [0.3, 0, 0],
  ];
  points.slice(1).forEach((to, index) => {
    builder.bar("glow", "#fff1b8", points[index], to, 0.035, 5);
  });
  builder.sphere("glow", glowWarm, 0.36, [0, 0.1, 0], [1, 1, 1], 12);
};

const buildReceiver = (builder: AttractionBuilder) => {
  builder.cylinder("paint", palette.black, {
    radius: 0.05,
    length: 0.34,
    at: [0, -0.17, 0],
    segments: 10,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.07,
    radiusEnd: 0.11,
    length: 0.1,
    at: [0, -0.38, 0],
    segments: 12,
  });
  builder.cylinder("metal", brass, {
    radius: 0.055,
    length: 0.04,
    at: [0, 0.0, 0],
    segments: 10,
  });
};

const buildPressBar = (builder: AttractionBuilder) => {
  builder.bar("metal", palette.darkSteel, [0, 0, 0], [0.9, 0, 0.25], 0.06, 6);
  builder.sphere("matte", oak, 0.07, [0.9, 0, 0.25], [1, 1, 1], 8);
};

const buildFlywheel = (builder: AttractionBuilder) => {
  builder.torus(
    "paint",
    "#c8302a",
    0.8,
    0.07,
    [0, 0, 0],
    "x",
    builder.segments(28, 12),
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.12,
    length: 0.22,
    at: [0, 0, 0],
    axis: "x",
    segments: 10,
  });
  const spokes = builder.isFar ? 3 : 6;
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = (spoke / spokes) * Math.PI * 2;
    builder.bar(
      "paint",
      "#c8302a",
      [0, 0, 0],
      [0, Math.cos(angle) * 0.78, Math.sin(angle) * 0.78],
      0.06,
      5,
    );
  }
};

const buildClockHands = (builder: AttractionBuilder) => {
  builder.box("paint", palette.black, [0.03, 0.26, 0.02], [0, 0.11, 0]);
  builder.box(
    "paint",
    palette.black,
    [0.03, 0.18, 0.02],
    [0.06, -0.06, 0],
    [0, 0, 0.8],
  );
};

/* The penny-farthing, facing its own +z */

const bikeMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: loopRadius,
  count: 1,
  speed: -0.4,
  isFacingAlong: true,
};
const bigWheel = 0.72;
const seatOffset: Triple = [0, 1.25, -0.15];

const buildPennyFarthing = (builder: AttractionBuilder) => {
  const black = "#1a1a22";
  builder.torus(
    "paint",
    black,
    bigWheel,
    0.035,
    [0, bigWheel, 0.15],
    "x",
    builder.segments(26, 12),
  );
  builder.torus(
    "metal",
    palette.steel,
    bigWheel - 0.04,
    0.012,
    [0, bigWheel, 0.15],
    "x",
    builder.segments(26, 12),
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.05,
    length: 0.16,
    at: [0, bigWheel, 0.15],
    axis: "x",
    segments: 8,
  });
  if (!builder.isFar) {
    for (let spoke = 0; spoke < 10; spoke++) {
      const angle = (spoke / 10) * Math.PI * 2;
      builder.bar(
        "metal",
        palette.steel,
        [0, bigWheel, 0.15],
        [
          0,
          bigWheel + Math.cos(angle) * (bigWheel - 0.04),
          0.15 + Math.sin(angle) * (bigWheel - 0.04),
        ],
        0.012,
        3,
      );
    }
    [-1, 1].forEach((side) => {
      builder.bar(
        "metal",
        palette.steel,
        [side * 0.08, bigWheel, 0.15],
        [side * 0.2, bigWheel - 0.05, 0.25],
        0.03,
        4,
      );
      builder.box(
        "paint",
        black,
        [0.08, 0.03, 0.14],
        [side * 0.2, bigWheel - 0.05, 0.25],
      );
    });
  }
  /* The small back wheel and the curved backbone */
  builder.torus("paint", black, 0.2, 0.03, [0, 0.2, -0.75], "x", 14);
  const backbone: Triple[] = [
    [0, bigWheel * 2 - 0.02, 0.12],
    [0, bigWheel * 2 - 0.1, -0.2],
    [0, 1.05, -0.5],
    [0, 0.55, -0.7],
    [0, 0.2, -0.75],
  ];
  backbone.slice(1).forEach((to, index) => {
    builder.bar("paint", "#2b2f6b", backbone[index], to, 0.06, 6);
  });
  /* The saddle and the handlebars */
  builder.box(
    "matte",
    "#5a3a22",
    [0.16, 0.06, 0.3],
    [0, bigWheel * 2 + 0.02, -0.12],
  );
  builder.bar(
    "metal",
    palette.steel,
    [-0.3, bigWheel * 2 + 0.12, 0.2],
    [0.3, bigWheel * 2 + 0.12, 0.2],
    0.03,
    4,
  );
  builder.bar(
    "metal",
    palette.steel,
    [0, bigWheel * 2 - 0.02, 0.15],
    [0, bigWheel * 2 + 0.12, 0.2],
    0.04,
    4,
  );
};

/* Wanderers: clockwork mice */

const buildMouse = (builder: AttractionBuilder) => {
  builder.sphere(
    "metal",
    palette.steel,
    0.12,
    [0, 0.09, 0],
    [0.8, 0.7, 1.3],
    10,
  );
  builder.sphere("metal", palette.steel, 0.05, [0, 0.12, 0.16], [1, 1, 1], 6);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.cylinder("metal", brass, {
      radius: 0.04,
      length: 0.01,
      at: [side * 0.04, 0.2, 0.08],
      axis: "z",
      segments: 8,
    });
  });
  builder.box("metal", brass, [0.12, 0.08, 0.015], [0, 0.22, -0.08]);
  builder.bar("matte", "#5a5e66", [0, 0.06, -0.15], [0, 0.03, -0.35], 0.012, 3);
  builder.sphere("paint", palette.black, 0.015, [0, 0.12, 0.21], [1, 1, 1], 4);
};

/* The ride */

const bikeStart = { x: loop.x + loopRadius + 0.95, z: loop.z };
const bikeFinish = { x: loop.x + loopRadius + 0.8, z: loop.z + 1.6 };
const loopPivot: Triple = [loop.x, 0, loop.z];

const bikeRide: PlayRide = {
  id: "penny-farthing",
  name: "the penny-farthing",
  start: bikeStart,
  reach: 0.55,
  seconds: 16,
  finish: bikeFinish,
  follow: (progress, clockSeconds) => {
    const local: Triple = [
      loop.x + seatOffset[0],
      seatOffset[1],
      loop.z + seatOffset[2],
    ];
    const pose = findMotionPose(bikeMotion, clockSeconds);
    const [x, y, z] = moveWithPose(loopPivot, local, pose);
    const share = Math.min(1, progress * 8, (1 - progress) * 8);
    const outside = progress < 0.5 ? bikeStart : bikeFinish;
    return {
      x: outside.x + (x - outside.x) * share,
      y: y * share,
      z: outside.z + (z - outside.z) * share,
      heading: pose.rotation[1],
    };
  },
};

export const inventorsHallModel: NewLandAttractionModel = {
  kind: "inventors-hall",
  islandId: "starfall-isle",
  name: "Inventors' Hall",
  fact: "In 1880 the British inventor Joseph Swan lit his house in Gateshead with electric light bulbs, one of the first homes in the world to have them. A bulb only lights when it is part of a complete circuit, with no gaps; a switch works by opening a gap to turn it off and closing it to turn it back on.",
  curriculumLink:
    "Science, Year 6: electricity. How a switch opens and closes a circuit, how cells make a bulb light, and the symbols used to draw a simple circuit.",
  footprint,
  setting: "inland",
  signSpot: { x: -3.6, z: 8.3 },
  build: (builder) => {
    buildHall(builder);
    buildBulb(builder);
    buildPhone(builder);
    buildCircuit(builder);
    buildPress(builder);
    buildPhonograph(builder);
    buildEngine(builder);
    buildForecourt(builder);
    addSignBoard(builder, [-3.6, 0, 7.6], signColour, 0.25);
  },
  moving: [
    {
      name: "filament",
      pivot: [bulbAt.x, bulbBase + 0.9, bulbAt.z],
      build: buildFilament,
      motion: { kind: "wake", reach: 4 },
    },
    {
      name: "receiver",
      pivot: [phoneAt.x + 0.2, 1.62, phoneAt.z],
      build: buildReceiver,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 3.5,
        amplitude: 0.35,
        period: 0.25,
      },
    },
    {
      name: "press bar",
      pivot: [pressAt.x, 1.9, pressAt.z],
      build: buildPressBar,
      motion: { kind: "swing", axis: "y", amplitude: 0.8, period: 5 },
    },
    {
      name: "flywheel",
      pivot: [engineAt.x - 0.75, 1.05, engineAt.z + 0.75],
      build: buildFlywheel,
      motion: { kind: "whirl", axis: "x", idle: 0.6, speed: 6, reach: 4.5 },
    },
    {
      name: "penny-farthing",
      pivot: loopPivot,
      build: buildPennyFarthing,
      motion: bikeMotion,
    },
    {
      name: "clock hands",
      pivot: [0, wallTop + 0.82, hallFront + 0.21],
      build: buildClockHands,
      motion: { kind: "spin", axis: "z", speed: -0.1 },
    },
  ],
  wanderers: [
    {
      name: "clockwork mice",
      build: buildMouse,
      count: 3,
      centre: { x: 0, z: -2.4 },
      radius: 1.4,
      speed: 0.7,
    },
  ],
  smoke: [
    {
      at: [engineAt.x, 3.05, engineAt.z + 0.9],
      colour: "#eef0f4",
      puffs: 6,
      size: 0.3,
      rise: 2.2,
      spread: 0.5,
    },
  ],
  rides: [bikeRide],
  tune: [72, 72, 74, 76, 79, 76, 74, 72, 67],
  play: {
    label: "Flick the big switch",
    news: "Click! The switch closed the gap in the circuit, the electricity flowed all the way round, and the giant bulb lit up the whole hall.",
  },
};
