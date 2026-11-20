import { BoxGeometry } from "three";
import {
  palette,
  shade,
  type AttractionBuilder,
  type Triple,
} from "../attractions/attraction-kit.js";

/** The Chilli Farm's colours: volcanic soil and basalt, with hot chillies. */
export const chilliColours = {
  ash: "#5b4a42",
  basalt: "#2e2726",
  basaltEdge: "#4a3f3b",
  soil: "#2a201c",
  track: "#6e625a",
  leaf: "#3f7d2c",
  darkLeaf: "#2f6322",
  red: "#d7261e",
  deepRed: "#9e1a14",
  orange: "#f07a1a",
  yellow: "#f4c430",
  green: "#4f9a2a",
  flower: "#f6f3ea",
  tractor: "#c8321e",
  tractorDark: "#8e2215",
  hub: "#f2b632",
  tyre: "#1d1b1b",
  straw: "#d9b45a",
  sign: "#b3261e",
} as const;

export const chilliShades = [
  chilliColours.red,
  chilliColours.orange,
  chilliColours.yellow,
  chilliColours.red,
  chilliColours.green,
  chilliColours.deepRed,
] as const;

/** One chilli hanging point down, its stalk end at `at`. */
export const addChilli = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  length = 0.2,
) => {
  builder.cylinder("paint", colour, {
    radius: 0.012,
    radiusEnd: 0.045,
    length,
    at: [at[0], at[1] - length / 2, at[2]],
    segments: 5,
    isOpen: true,
  });
};

/* ------------------------------------------------------------------ */
/* The tractor and its trailer, which go round the farm track          */
/* ------------------------------------------------------------------ */

/** Where a rider sits in the trailer, in the tractor's own units. */
export const trailerSeat: Triple = [0, 0.62, -1.45];

const addWheel = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  width: number,
) => {
  builder.cylinder("matte", chilliColours.tyre, {
    radius,
    length: width,
    at,
    axis: "x",
    segments: 14,
  });
  builder.cylinder("paint", chilliColours.hub, {
    radius: radius * 0.6,
    length: width + 0.02,
    at,
    axis: "x",
    segments: 10,
  });
  if (builder.isFar || radius < 0.3) {
    return;
  }
  builder.cylinder("metal", palette.steel, {
    radius: radius * 0.22,
    length: width + 0.06,
    at,
    axis: "x",
    segments: 8,
  });
  for (let tread = 0; tread < 8; tread++) {
    const angle = (tread / 8) * Math.PI * 2;
    builder.box(
      "matte",
      shade(chilliColours.tyre, 1.3),
      [width + 0.02, 0.05, radius * 0.22],
      [
        at[0],
        at[1] + Math.sin(angle) * radius,
        at[2] + Math.cos(angle) * radius,
      ],
      [angle, 0, 0],
    );
  }
};

const buildTrailer = (builder: AttractionBuilder) => {
  /* The drawbar and the trailer behind */
  builder.bar(
    "metal",
    palette.darkSteel,
    [0, 0.38, -0.5],
    [0, 0.38, -0.75],
    0.06,
    6,
  );
  [-0.55, 0.55].forEach((side) => {
    addWheel(builder, [side, 0.25, -1.5], 0.25, 0.14);
  });
  builder.box("metal", palette.darkSteel, [0.9, 0.08, 1.7], [0, 0.4, -1.55]);
  builder.box("paint", palette.paleTimber, [1.0, 0.06, 1.8], [0, 0.47, -1.55]);
  const sides: [Triple, Triple][] = [
    [
      [0.06, 0.28, 1.8],
      [-0.5, 0.64, -1.55],
    ],
    [
      [0.06, 0.28, 1.8],
      [0.5, 0.64, -1.55],
    ],
    [
      [1.0, 0.28, 0.06],
      [0, 0.64, -2.43],
    ],
    [
      [1.0, 0.28, 0.06],
      [0, 0.64, -0.67],
    ],
  ];
  sides.forEach(([size, at]) => {
    builder.box("paint", chilliColours.tractor, size, at);
  });
  /* A hay bale to sit on, and crates of chillies */
  builder.box("matte", chilliColours.straw, [0.8, 0.26, 0.42], [0, 0.63, -2.1]);
  builder.box(
    "matte",
    shade(chilliColours.straw, 0.9),
    [0.4, 0.22, 0.32],
    [0.22, 0.61, -0.88],
  );
  builder.box("paint", palette.timber, [0.36, 0.2, 0.3], [-0.2, 0.6, -0.9]);
  if (builder.isFar) {
    return;
  }
  [0.25, 0.5, 0.75].forEach((share) => {
    builder.box(
      "paint",
      chilliColours.tractorDark,
      [1.02, 0.02, 0.02],
      [0, 0.5 + share * 0.28, -0.66],
    );
  });
  [-0.28, 0, 0.28].forEach((x) => {
    builder.box(
      "matte",
      shade(chilliColours.straw, 0.82),
      [0.02, 0.27, 0.43],
      [x, 0.63, -2.1],
    );
  });
  for (let index = 0; index < 6; index++) {
    builder.sphere(
      "paint",
      chilliShades[index],
      0.05,
      [-0.3 + (index % 3) * 0.1, 0.72, -0.98 + Math.floor(index / 3) * 0.12],
      [0.7, 0.7, 1.6],
      4,
    );
  }
};

export const buildTractor = (builder: AttractionBuilder) => {
  /* The tractor, at the front */
  [-0.52, 0.52].forEach((side) => {
    addWheel(builder, [side, 0.46, -0.1], 0.46, 0.26);
    addWheel(builder, [side * 0.82, 0.26, 1.15], 0.26, 0.16);
    builder.box(
      "paint",
      chilliColours.tractor,
      [0.32, 0.06, 0.9],
      [side, 0.96, -0.1],
    );
  });
  builder.box("metal", palette.darkSteel, [0.5, 0.26, 1.7], [0, 0.42, 0.45]);
  builder.box(
    "paint",
    chilliColours.tractor,
    [0.56, 0.3, 1.0],
    [0, 0.68, 0.85],
  );
  builder.cylinder("paint", chilliColours.tractor, {
    radius: 0.28,
    length: 1.0,
    at: [0, 0.83, 0.85],
    axis: "z",
    segments: 12,
  });
  builder.box(
    "paint",
    chilliColours.tractorDark,
    [0.62, 0.36, 0.5],
    [0, 0.7, 0.15],
  );
  builder.box("metal", palette.black, [0.46, 0.34, 0.04], [0, 0.76, 1.36]);
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.045,
    length: 0.7,
    at: [0.16, 1.32, 0.95],
    segments: 8,
  });
  builder.cylinder("metal", palette.black, {
    radius: 0.06,
    length: 0.08,
    at: [0.16, 1.7, 0.95],
    segments: 8,
  });
  [-0.18, 0.18].forEach((side) => {
    builder.sphere(
      "glow",
      palette.warmLight,
      0.06,
      [side, 0.86, 1.36],
      [1, 1, 0.6],
      8,
    );
  });
  /* The seat, the cab's roll bar and roof */
  builder.box("paint", palette.black, [0.4, 0.08, 0.36], [0, 0.92, -0.1]);
  builder.box("paint", palette.black, [0.4, 0.34, 0.08], [0, 1.1, -0.28]);
  [
    [-0.36, -0.36],
    [0.36, -0.36],
    [-0.36, 0.3],
    [0.36, 0.3],
  ].forEach(([x, z]) => {
    builder.bar("metal", palette.darkSteel, [x, 0.9, z], [x, 1.85, z], 0.05, 6);
  });
  builder.box("paint", chilliColours.hub, [0.86, 0.08, 0.8], [0, 1.88, -0.03]);
  /* Steering wheel and the farmer driving */
  if (builder.isFar) {
    buildTrailer(builder);
    return;
  }
  builder.bar("metal", palette.black, [0, 0.95, 0.4], [0, 1.2, 0.22], 0.04, 6);
  builder.torus("paint", palette.black, 0.12, 0.018, [0, 1.22, 0.2], "y", 14);
  builder.cylinder("paint", "#3c6aa8", {
    radius: 0.16,
    radiusEnd: 0.13,
    length: 0.42,
    at: [0, 1.17, -0.1],
    segments: 10,
  });
  builder.sphere("matte", "#e0b089", 0.12, [0, 1.48, -0.08], [1, 1, 1], 12);
  builder.cylinder("matte", chilliColours.straw, {
    radius: 0.22,
    length: 0.02,
    at: [0, 1.57, -0.08],
    segments: 14,
  });
  builder.cylinder("matte", chilliColours.straw, {
    radius: 0.11,
    radiusEnd: 0.09,
    length: 0.12,
    at: [0, 1.63, -0.08],
    segments: 10,
  });
  builder.cylinder("matte", chilliColours.red, {
    radius: 0.111,
    length: 0.03,
    at: [0, 1.6, -0.08],
    segments: 10,
    isOpen: true,
  });
  [-0.17, 0.17].forEach((side) => {
    builder.bar(
      "paint",
      "#3c6aa8",
      [side, 1.3, -0.08],
      [side * 0.6, 1.2, 0.18],
      0.07,
      6,
    );
  });
  builder.box("paint", palette.white, [0.3, 0.06, 0.02], [0, 0.98, 1.39]);
  buildTrailer(builder);
};

/* ------------------------------------------------------------------ */
/* The farm stand                                                      */
/* ------------------------------------------------------------------ */

export const addFarmStand = (builder: AttractionBuilder, at: Triple) => {
  const [x, , z] = at;
  const width = 2.4;
  builder.box("paint", palette.paleTimber, [width, 0.85, 0.7], [x, 0.425, z]);
  builder.box(
    "paint",
    chilliColours.red,
    [width + 0.02, 0.5, 0.02],
    [x, 0.45, z + 0.36],
  );
  builder.box(
    "paint",
    chilliColours.yellow,
    [width + 0.04, 0.08, 0.03],
    [x, 0.78, z + 0.36],
  );
  builder.box(
    "paint",
    palette.darkTimber,
    [width + 0.12, 0.06, 0.82],
    [x, 0.88, z],
  );
  [
    [-1.15, -0.32],
    [1.15, -0.32],
    [-1.15, 0.32],
    [1.15, 0.32],
  ].forEach(([dx, dz]) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, dz < 0 ? 2.25 : 1.95, 0.08],
      [x + dx, dz < 0 ? 1.125 : 0.975, z + dz],
    );
  });
  /* The striped awning, sloping down to the front */
  const stripes = builder.isFar ? 2 : 8;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? chilliColours.red : palette.cream,
      [width / stripes + 0.005, 0.04, 1.1],
      [x - width / 2 + (stripe + 0.5) * (width / stripes), 2.1, z + 0.05],
      [0.28, 0, 0],
    );
  }
  for (let flap = 0; flap < (builder.isFar ? 0 : stripes); flap++) {
    builder.box(
      "matte",
      flap % 2 === 0 ? chilliColours.red : palette.cream,
      [width / stripes, 0.16, 0.02],
      [x - width / 2 + (flap + 0.5) * (width / stripes), 1.89, z + 0.6],
    );
  }
  /* A back board with the farm's name */
  builder.box("paint", palette.timber, [width, 0.9, 0.06], [x, 1.55, z - 0.34]);
  builder.box(
    "paint",
    chilliColours.yellow,
    [1.4, 0.26, 0.04],
    [x, 1.75, z - 0.3],
  );
  /* The stallholder */
  builder.cylinder("paint", chilliColours.green, {
    radius: 0.17,
    radiusEnd: 0.13,
    length: 0.6,
    at: [x - 0.5, 1.05, z - 0.05],
    segments: 10,
  });
  builder.sphere(
    "matte",
    "#a8724a",
    0.13,
    [x - 0.5, 1.48, z - 0.05],
    [1, 1, 1],
    12,
  );
  builder.cylinder("paint", chilliColours.red, {
    radius: 0.135,
    radiusEnd: 0.07,
    length: 0.14,
    at: [x - 0.5, 1.6, z - 0.05],
    segments: 10,
  });
  /* Baskets of chillies and bottles of hot sauce on the counter */
  [-0.95, 0.15, 0.75].forEach((dx, basket) => {
    builder.lathe(
      "matte",
      chilliColours.straw,
      [
        [0.01, 0],
        [0.2, 0.01],
        [0.26, 0.14],
        [0.24, 0.15],
      ],
      [x + dx, 0.91, z + 0.1],
      "y",
      12,
    );
    if (!builder.isFar) {
      for (let chilli = 0; chilli < 5; chilli++) {
        const angle = (chilli / 5) * Math.PI * 2;
        builder.sphere(
          "paint",
          chilliShades[(basket * 2 + (chilli % 2)) % chilliShades.length],
          0.06,
          [
            x + dx + Math.sin(angle) * 0.12,
            1.06,
            z + 0.1 + Math.cos(angle) * 0.12,
          ],
          [0.7, 0.6, 1.8],
          4,
        );
      }
    }
  });
  if (builder.isFar) {
    return;
  }
  const sauces = [
    chilliColours.red,
    chilliColours.orange,
    chilliColours.green,
    chilliColours.deepRed,
    chilliColours.yellow,
  ];
  for (let bottle = 0; bottle < 10; bottle++) {
    const bx = x - 1.05 + bottle * 0.23;
    const shelfY = 1.25;
    builder.cylinder("glass", sauces[bottle % sauces.length], {
      radius: 0.05,
      length: 0.2,
      at: [bx, shelfY + 0.1, z - 0.24],
      segments: 6,
    });
    builder.box(
      "paint",
      palette.white,
      [0.04, 0.08, 0.04],
      [bx, shelfY + 0.24, z - 0.24],
    );
  }
  builder.box(
    "paint",
    palette.darkTimber,
    [width - 0.1, 0.04, 0.2],
    [x, 1.23, z - 0.24],
  );
  builder.box(
    "paint",
    palette.black,
    [0.5, 0.36, 0.03],
    [x + 0.9, 1.15, z + 0.42],
  );
  [0.06, -0.04].forEach((dy, line) => {
    builder.box(
      "paint",
      palette.cream,
      [0.36 - line * 0.1, 0.03, 0.01],
      [x + 0.9, 1.2 + dy, z + 0.44],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The weathervane chilli, the scarecrow and the "How hot?" board      */
/* ------------------------------------------------------------------ */

export const buildVaneChilli = (builder: AttractionBuilder) => {
  builder.lathe(
    "paint",
    chilliColours.red,
    [
      [0, -0.3],
      [0.03, -0.27],
      [0.07, -0.12],
      [0.09, 0.08],
      [0.085, 0.22],
      [0.06, 0.3],
      [0, 0.32],
    ],
    [0, 0.12, 0],
    "z",
    12,
  );
  builder.sphere(
    "paint",
    chilliColours.green,
    0.07,
    [0, 0.12, 0.31],
    [1, 1, 0.6],
    8,
  );
  builder.bar(
    "paint",
    chilliColours.green,
    [0, 0.12, 0.34],
    [0, 0.2, 0.44],
    0.03,
    5,
  );
  builder.box(
    "paint",
    chilliColours.yellow,
    [0.02, 0.18, 0.16],
    [0, 0.12, -0.36],
  );
  builder.cylinder("metal", palette.brass, {
    radius: 0.02,
    length: 0.14,
    at: [0, 0.03, 0],
    segments: 6,
  });
};

export const addVanePost = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.cylinder("metal", palette.black, {
    radius: 0.025,
    length: 0.5,
    at: [x, y + 0.25, z],
    segments: 6,
  });
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "metal",
    palette.black,
    [x - 0.25, y + 0.32, z],
    [x + 0.25, y + 0.32, z],
    0.02,
    4,
  );
  builder.bar(
    "metal",
    palette.black,
    [x, y + 0.32, z - 0.25],
    [x, y + 0.32, z + 0.25],
    0.02,
    4,
  );
  [
    [0.25, 0],
    [-0.25, 0],
    [0, 0.25],
    [0, -0.25],
  ].forEach(([dx, dz]) => {
    builder.sphere(
      "metal",
      palette.brass,
      0.035,
      [x + dx, y + 0.32, z + dz],
      [1, 1, 1],
      6,
    );
  });
};

export const addScarecrow = (builder: AttractionBuilder, at: Triple) => {
  const [x, , z] = at;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 1.95,
    at: [x, 0.975, z],
    segments: 6,
  });
  [-0.1, 0.1].forEach((side) => {
    builder.cylinder("matte", "#4a5f8a", {
      radius: 0.07,
      radiusEnd: 0.08,
      length: 0.6,
      at: [x + side, 0.72, z],
      segments: 8,
    });
    builder.cylinder("matte", chilliColours.straw, {
      radius: 0.07,
      radiusEnd: 0.02,
      length: 0.14,
      at: [x + side, 0.36, z],
      segments: 6,
    });
  });
  builder.box("matte", "#c8473a", [0.42, 0.5, 0.24], [x, 1.28, z]);
  if (!builder.isFar) {
    builder.box("matte", "#e6c84a", [0.43, 0.06, 0.25], [x, 1.08, z]);
    [-0.12, 0.12].forEach((side) => {
      builder.box(
        "matte",
        palette.cream,
        [0.09, 0.09, 0.02],
        [x + side, 1.36, z + 0.13],
      );
    });
  }
};

export const buildScarecrowTop = (builder: AttractionBuilder) => {
  builder.bar(
    "matte",
    palette.darkTimber,
    [-0.72, 0, 0],
    [0.72, 0, 0],
    0.06,
    6,
  );
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", "#c8473a", {
      radius: 0.085,
      radiusEnd: 0.1,
      length: 0.5,
      at: [side * 0.35, 0, 0],
      axis: "x",
      segments: 8,
    });
    builder.cylinder("matte", chilliColours.straw, {
      radius: 0.07,
      radiusEnd: 0.01,
      length: 0.2,
      at: [side * 0.72, 0, 0],
      axis: "x",
      segments: 6,
    });
  });
  builder.sphere("matte", "#d8c49a", 0.19, [0, 0.3, 0], [1, 1.05, 1], 12);
  builder.cylinder("matte", "#6b4a2f", {
    radius: 0.3,
    length: 0.03,
    at: [0, 0.44, 0],
    segments: 14,
  });
  builder.cylinder("matte", "#6b4a2f", {
    radius: 0.16,
    radiusEnd: 0.05,
    length: 0.3,
    at: [0, 0.6, 0],
    segments: 10,
  });
  if (builder.isFar) {
    return;
  }
  [-0.07, 0.07].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [side, 0.34, 0.17],
      [1, 1, 1],
      6,
    );
  });
  builder.cylinder("paint", chilliColours.orange, {
    radius: 0.035,
    radiusEnd: 0.005,
    length: 0.14,
    at: [0, 0.27, 0.22],
    axis: "z",
    segments: 6,
  });
  builder.box("paint", palette.black, [0.14, 0.02, 0.02], [0, 0.2, 0.18]);
  addChilli(builder, [0.08, 0.5, 0.05], chilliColours.red, 0.16);
};

export const addHowHotBoard = (builder: AttractionBuilder, at: Triple) => {
  const [x, , z] = at;
  [-0.38, 0.38].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 2.6, 0.08],
      [x + side, 1.3, z - 0.06],
    );
  });
  builder.box("paint", palette.cream, [0.72, 2.0, 0.06], [x, 1.45, z]);
  const bands = [
    chilliColours.green,
    chilliColours.yellow,
    chilliColours.orange,
    chilliColours.red,
    chilliColours.deepRed,
  ];
  bands.forEach((colour, band) => {
    builder.box(
      "paint",
      colour,
      [0.66, 0.34, 0.02],
      [x, 0.7 + band * 0.36 + 0.17, z + 0.035],
    );
    if (!builder.isFar) {
      for (let pepper = 0; pepper <= band; pepper++) {
        builder.cylinder(
          "paint",
          band < 2 ? chilliColours.red : palette.cream,
          {
            radius: 0.012,
            radiusEnd: 0.035,
            length: 0.14,
            at: [x + 0.29 - pepper * 0.06, 0.7 + band * 0.36 + 0.17, z + 0.05],
            segments: 5,
            isOpen: true,
          },
        );
      }
    }
  });
  builder.box("paint", chilliColours.sign, [0.9, 0.3, 0.08], [x, 2.6, z]);
  builder.box("paint", palette.cream, [0.6, 0.06, 0.02], [x, 2.62, z + 0.045]);
  builder.cylinder("glass", "#f1f4f7", {
    radius: 0.05,
    length: 1.65,
    at: [x - 0.12, 1.47, z + 0.09],
    segments: 10,
  });
  builder.box(
    "metal",
    palette.steel,
    [0.2, 0.46, 0.2],
    [x - 0.12, 0.38, z + 0.09],
  );
  builder.sphere(
    "glow",
    chilliColours.red,
    0.1,
    [x - 0.12, 0.66, z + 0.09],
    [1, 1, 1],
    12,
  );
};

export const buildMercury = (builder: AttractionBuilder) => {
  builder.cylinder("glow", chilliColours.red, {
    radius: 0.032,
    length: 1.6,
    at: [0, -0.8, 0],
    segments: 8,
  });
  builder.sphere("glow", chilliColours.orange, 0.04, [0, 0, 0], [1, 1, 1], 8);
};

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

export const buildBee = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    builder.box("paint", chilliColours.yellow, [0.1, 0.1, 0.16], [0, 0, 0]);
    return;
  }
  builder.sphere(
    "paint",
    chilliColours.yellow,
    0.07,
    [0, 0, 0],
    [0.85, 0.85, 1.25],
    7,
  );
  builder.sphere("paint", palette.black, 0.045, [0, 0.01, 0.09], [1, 1, 1], 5);
  [-0.02, 0.04].forEach((dz) => {
    builder.box("paint", palette.black, [0.12, 0.122, 0.025], [0, 0, dz]);
  });
  [-1, 1].forEach((side) => {
    builder.add("glass", "#e8f2fb", new BoxGeometry(0.1, 0.008, 0.06), {
      at: [side * 0.07, 0.07, 0.01],
      rotation: [0, 0, side * 0.4],
    });
  });
};

export const buildCrow = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#1c1c22", 0.13, [0, 0, 0], [0.8, 0.75, 1.5], 8);
  builder.sphere("paint", "#1c1c22", 0.08, [0, 0.07, 0.2], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.add("paint", "#26262e", new BoxGeometry(0.36, 0.02, 0.16), {
      at: [side * 0.22, 0.04, 0],
      rotation: [0, 0, side * 0.3],
    });
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("paint", "#3a3530", {
    radius: 0.03,
    radiusEnd: 0.002,
    length: 0.1,
    at: [0, 0.06, 0.31],
    axis: "z",
    segments: 5,
  });
  builder.add("paint", "#26262e", new BoxGeometry(0.12, 0.02, 0.16), {
    at: [0, 0, -0.24],
    rotation: [0.2, 0, 0],
  });
};
