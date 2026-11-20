import { CylinderGeometry, TorusGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ginghamRed = "#c8323a";
const ginghamPink = "#e79a9a";
const ginghamWhite = "#f7f1ea";
const wicker = "#c8955a";
const wickerDark = "#9c6a38";
const bread = "#e9c88a";
const crust = "#b98243";
const lettuce = "#7fb54a";
const tomato = "#d9442e";
const cheese = "#f2cf4a";
const teapotBlue = "#8fc1dc";
const china = "#f8f6f0";
const sponge = "#e8bf73";
const cream = "#fbf4e2";
const jam = "#b8213a";
const strawberry = "#d8283a";
const appleRed = "#c7302a";
const appleGreen = "#8cc04a";
const orange = "#f08a1c";
const grape = "#6b3a7a";
const banana = "#f3d54a";
const lemonade = "#f5e27a";
const bark = "#6a4a30";
const leafGreen = "#4f8f3a";
const bikeBlue = "#3d7fc4";
const strawHat = "#e3c27a";
const signColour = "#b03a3a";

const blanket = { x: 0.3, z: 0.4, width: 2.6, depth: 2.2 };
const blanketTop = 0.03;
const treeAt = { x: -2.3, z: -1.7 };
const hamper = { x: 1.25, z: -0.45, width: 0.72, height: 0.42, depth: 0.5 };
const hingeAt: Triple = [hamper.x, hamper.height, hamper.z - hamper.depth / 2];
const lidRest = -0.5;
const bikeX = -1.82;

/* ------------------------------------------------------------------ */
/* The shady tree and the bicycle leaning on it                        */
/* ------------------------------------------------------------------ */

const buildTree = (builder: AttractionBuilder) => {
  const { x, z } = treeAt;
  builder.lathe(
    "matte",
    bark,
    [
      [0, 0],
      [0.48, 0],
      [0.32, 0.25],
      [0.26, 0.9],
      [0.24, 2.2],
      [0.18, 2.9],
      [0, 2.9],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 8 : 14,
  );
  const clumps: [number, number, number, number][] = builder.isFar
    ? [
        [0, 3.6, 0, 1.6],
        [1.0, 3.2, 0.6, 1.1],
      ]
    : [
        [0, 3.7, 0, 1.45],
        [1.15, 3.25, 0.7, 1.05],
        [-1.0, 3.35, 0.2, 1.0],
        [0.3, 3.2, -1.0, 1.0],
        [0.5, 4.35, 0.4, 0.95],
        [-0.45, 4.2, -0.5, 0.85],
      ];
  clumps.forEach(([dx, dy, dz, size], index) => {
    builder.sphere(
      "matte",
      index % 3 === 0
        ? leafGreen
        : shade(leafGreen, index % 3 === 1 ? 0.86 : 1.12),
      size,
      [x + dx, dy, z + dz],
      [1, 0.82, 1],
      builder.isFar ? 8 : 10,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Boughs reaching out to hold the leaves */
  [
    [0.9, 3.0, 0.55],
    [-0.8, 3.1, 0.15],
    [0.25, 3.0, -0.8],
  ].forEach(([dx, dy, dz]) => {
    builder.bar("matte", bark, [x, 2.4, z], [x + dx, dy, z + dz], 0.16, 6);
  });
  /* Roots spreading over the grass */
  [0.4, 1.9, 3.3, 4.6].forEach((angle) => {
    builder.bar(
      "matte",
      shade(bark, 0.9),
      [x, 0.12, z],
      [x + Math.sin(angle) * 0.75, 0.02, z + Math.cos(angle) * 0.75],
      0.13,
      5,
    );
  });
  /* A knot hole in the trunk */
  builder.sphere(
    "matte",
    "#2a1c12",
    0.08,
    [x + 0.12, 1.5, z + 0.24],
    [1, 1.4, 0.5],
    8,
  );
};

const buildBicycle = (builder: AttractionBuilder) => {
  /* Leaning against the trunk, wheels along local z */
  const wheelZ = [-2.35, -1.25];
  const wheelY = 0.34;
  const lean = 0.12;
  const at = (y: number, z: number): Triple => [bikeX - y * lean, y, z];
  wheelZ.forEach((z) => {
    builder.add("matte", palette.black, new TorusGeometry(0.32, 0.03, 5, 18), {
      at: at(wheelY, z),
      rotation: [0, Math.PI / 2, lean],
    });
    [0, 1, 2].forEach((spoke) => {
      const angle = (spoke / 3) * Math.PI;
      builder.bar(
        "metal",
        palette.steel,
        at(wheelY + Math.cos(angle) * 0.28, z + Math.sin(angle) * 0.28),
        at(wheelY - Math.cos(angle) * 0.28, z - Math.sin(angle) * 0.28),
        0.01,
        3,
      );
    });
  });
  const seat = at(0.82, -2.05);
  const crank = at(0.34, -1.85);
  const head = at(0.88, -1.42);
  [
    [at(wheelY, wheelZ[0]), crank],
    [at(wheelY, wheelZ[0]), seat],
    [crank, seat],
    [crank, head],
    [seat, head],
    [head, at(wheelY, wheelZ[1])],
  ].forEach(([from, to]) => {
    builder.bar("paint", bikeBlue, from, to, 0.045, 6);
  });
  builder.box("matte", "#3a2a20", [0.12, 0.05, 0.24], at(0.88, -2.07));
  const stem = at(1.0, -1.42);
  builder.bar(
    "metal",
    palette.steel,
    [stem[0] - 0.22, stem[1], stem[2]],
    [stem[0] + 0.22, stem[1], stem[2]],
    0.03,
    6,
  );
  /* A wicker basket on the front with a baguette poking out */
  builder.box("matte", wicker, [0.26, 0.18, 0.22], at(0.98, -1.22));
  builder.bar("matte", crust, at(0.98, -1.25), at(1.25, -1.12), 0.06, 8);
  builder.cylinder("paint", palette.black, {
    radius: 0.05,
    length: 0.04,
    at: crank,
    axis: "x",
    segments: 10,
  });
};

/* ------------------------------------------------------------------ */
/* The gingham blanket and the feast on it                             */
/* ------------------------------------------------------------------ */

const buildBlanket = (builder: AttractionBuilder) => {
  const { x, z, width, depth } = blanket;
  builder.box(
    "matte",
    ginghamPink,
    [width, 0.02, depth],
    [x, 0.012, z],
    [0, 0.06, 0],
  );
  if (builder.isFar) {
    return;
  }
  /* Gingham: red where two stripes cross, pink where one does */
  const across = 10;
  const along = 8;
  const turn = 0.06;
  for (let column = 0; column < across; column++) {
    for (let row = 0; row < along; row++) {
      const isColumnStripe = column % 2 === 0;
      const isRowStripe = row % 2 === 0;
      if (isColumnStripe !== isRowStripe) {
        continue;
      }
      const localX = ((column + 0.5) / across - 0.5) * width;
      const localZ = ((row + 0.5) / along - 0.5) * depth;
      builder.box(
        "matte",
        isColumnStripe ? ginghamRed : ginghamWhite,
        [width / across, 0.004, depth / along],
        [
          x + localX * Math.cos(turn) + localZ * Math.sin(turn),
          0.024,
          z - localX * Math.sin(turn) + localZ * Math.cos(turn),
        ],
        [0, turn, 0],
      );
    }
  }
  /* A rumpled corner folded back */
  builder.box(
    "matte",
    ginghamRed,
    [0.5, 0.03, 0.4],
    [x - width / 2 + 0.3, 0.04, z + depth / 2 - 0.15],
    [0.1, 0.8, 0.05],
  );
};

const buildPlate = (builder: AttractionBuilder, at: Triple, radius = 0.17) => {
  builder.cylinder("paint", china, {
    radius,
    radiusEnd: radius * 1.05,
    length: 0.025,
    at: [at[0], blanketTop + 0.012, at[2]],
    segments: 16,
  });
  builder.cylinder("paint", shade(china, 0.94), {
    radius: radius * 0.7,
    length: 0.004,
    at: [at[0], blanketTop + 0.027, at[2]],
    segments: 12,
  });
  builder.cylinder("paint", "#6aa6d6", {
    radius: radius * 0.9,
    length: 0.002,
    at: [at[0], blanketTop + 0.0255, at[2]],
    segments: 12,
  });
};

/** A sandwich cut corner to corner: bread, filling, bread. */
const buildSandwich = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  filling: string,
) => {
  const slice = (colour: string, radius: number, height: number, y: number) =>
    builder.add(
      "matte",
      colour,
      new CylinderGeometry(radius, radius, height, 3),
      { at: [at[0], at[1] + y, at[2]], rotation: [0, turn, 0] },
      undefined,
    );
  slice(crust, 0.105, 0.028, 0.014);
  slice(filling, 0.112, 0.016, 0.036);
  slice(bread, 0.1, 0.004, 0.046);
  slice(crust, 0.105, 0.028, 0.06);
  slice(bread, 0.1, 0.004, 0.075);
};

const buildFeast = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const centre = { x: blanket.x + 0.05, z: blanket.z + 0.1 };
  /* The sandwich plate in the middle, piled high */
  const sandwichPlate: Triple = [centre.x - 0.35, 0, centre.z + 0.25];
  buildPlate(builder, sandwichPlate, 0.24);
  [
    [-0.08, 0, 0.0, lettuce],
    [0.09, 0, 1.2, tomato],
    [0.0, 0.08, 2.1, cheese],
    [-0.02, 0.0, -0.9, lettuce],
  ].forEach(([dx, dy, turn, filling], index) => {
    if (
      typeof dx !== "number" ||
      typeof dy !== "number" ||
      typeof turn !== "number" ||
      typeof filling !== "string"
    ) {
      return;
    }
    buildSandwich(
      builder,
      [
        sandwichPlate[0] + dx,
        blanketTop + 0.028 + dy,
        sandwichPlate[2] + (index === 3 ? 0.1 : -0.03),
      ],
      turn,
      filling,
    );
  });
  /* Everyone's plates, one with a sandwich waiting */
  const places: Triple[] = [
    [centre.x - 0.95, 0, centre.z + 0.75],
    [centre.x + 0.75, 0, centre.z + 0.8],
  ];
  places.forEach((place, index) => {
    buildPlate(builder, place);
    if (index === 0) {
      buildSandwich(
        builder,
        [place[0], blanketTop + 0.028, place[2]],
        0.4,
        tomato,
      );
    }
    /* A cup and saucer by each plate */
    const cup: Triple = [place[0] + 0.24, 0, place[2] - 0.1];
    builder.cylinder("paint", china, {
      radius: 0.075,
      length: 0.012,
      at: [cup[0], blanketTop + 0.006, cup[2]],
      segments: 12,
    });
    builder.lathe(
      "paint",
      china,
      [
        [0, 0],
        [0.035, 0],
        [0.05, 0.03],
        [0.055, 0.07],
        [0.048, 0.07],
        [0.044, 0.035],
        [0, 0.035],
      ],
      [cup[0], blanketTop + 0.012, cup[2]],
      "y",
      10,
    );
    builder.cylinder("matte", "#a86a3c", {
      radius: 0.046,
      length: 0.004,
      at: [cup[0], blanketTop + 0.07, cup[2]],
      segments: 12,
    });
    builder.add(
      "paint",
      china,
      new TorusGeometry(0.022, 0.006, 4, 8, Math.PI),
      {
        at: [cup[0] + 0.055, blanketTop + 0.05, cup[2]],
        rotation: [0, 0, -Math.PI / 2],
      },
    );
  });
  buildTeapot(builder, [centre.x + 0.2, blanketTop, centre.z + 0.15]);
  buildCake(builder, [centre.x + 0.55, blanketTop, centre.z - 0.45]);
  buildFruitBowl(builder, [centre.x - 0.15, blanketTop, centre.z - 0.35]);
  /* A jug of lemonade and a jar of jam with a gingham lid */
  const jug: Triple = [centre.x + 0.8, blanketTop, centre.z + 0.25];
  builder.lathe(
    "glass",
    "#e8f2f4",
    [
      [0, 0],
      [0.08, 0],
      [0.085, 0.18],
      [0.07, 0.24],
      [0.075, 0.27],
      [0, 0.27],
    ],
    jug,
    "y",
    16,
  );
  builder.cylinder("paint", lemonade, {
    radius: 0.075,
    length: 0.17,
    at: [jug[0], jug[1] + 0.09, jug[2]],
    segments: 14,
  });
  builder.sphere(
    "paint",
    "#f4e04a",
    0.03,
    [jug[0], 0.22, jug[2] + 0.05],
    [1, 0.4, 1],
    6,
  );
  const jar: Triple = [centre.x - 0.55, blanketTop, centre.z - 0.15];
  builder.cylinder("glass", jam, {
    radius: 0.05,
    length: 0.1,
    at: [jar[0], jar[1] + 0.05, jar[2]],
    segments: 14,
  });
  builder.cylinder("matte", ginghamRed, {
    radius: 0.065,
    radiusEnd: 0.05,
    length: 0.03,
    at: [jar[0], jar[1] + 0.115, jar[2]],
    segments: 14,
  });
  builder.cylinder("paint", ginghamWhite, {
    radius: 0.04,
    length: 0.06,
    at: [jar[0], jar[1] + 0.05, jar[2] + 0.025],
    segments: 8,
  });
  /* A straw sun hat with a ribbon, dropped on the corner */
  const hat: Triple = [blanket.x + 1.0, blanketTop, blanket.z + 0.95];
  builder.cylinder("matte", strawHat, {
    radius: 0.32,
    length: 0.015,
    at: [hat[0], hat[1] + 0.01, hat[2]],
    segments: 22,
  });
  builder.sphere(
    "matte",
    strawHat,
    0.16,
    [hat[0], hat[1] + 0.02, hat[2]],
    [1, 0.75, 1],
    10,
  );
  builder.cylinder("paint", "#e46f9a", {
    radius: 0.162,
    length: 0.04,
    at: [hat[0], hat[1] + 0.04, hat[2]],
    segments: 16,
  });
  /* A cushion to sit on */
  builder.sphere(
    "matte",
    "#f2c94c",
    0.25,
    [blanket.x - 0.85, blanketTop + 0.05, blanket.z + 0.1],
    [1, 0.22, 1],
    10,
  );
};

const buildTeapot = (builder: AttractionBuilder, at: Triple) => {
  builder.lathe(
    "paint",
    teapotBlue,
    [
      [0, 0],
      [0.09, 0],
      [0.13, 0.05],
      [0.14, 0.1],
      [0.12, 0.17],
      [0.07, 0.2],
      [0, 0.2],
    ],
    at,
    "y",
    16,
  );
  builder.lathe(
    "paint",
    china,
    [
      [0, 0.2],
      [0.075, 0.2],
      [0.06, 0.23],
      [0.02, 0.25],
      [0, 0.26],
    ],
    at,
    "y",
    14,
  );
  builder.sphere(
    "paint",
    china,
    0.022,
    [at[0], at[1] + 0.275, at[2]],
    [1, 1, 1],
    8,
  );
  /* Spout and handle */
  builder.add(
    "paint",
    teapotBlue,
    new CylinderGeometry(0.018, 0.035, 0.18, 10),
    { at: [at[0] + 0.17, at[1] + 0.14, at[2]], rotation: [0, 0, -0.85] },
  );
  builder.add(
    "paint",
    teapotBlue,
    new TorusGeometry(0.065, 0.016, 6, 12, Math.PI * 1.2),
    {
      at: [at[0] - 0.14, at[1] + 0.12, at[2]],
      rotation: [0, 0, Math.PI * 0.4],
    },
  );
  /* A white band round the pot's belly */
  builder.cylinder("paint", china, {
    radius: 0.142,
    length: 0.025,
    at: [at[0], at[1] + 0.1, at[2]],
    segments: 16,
  });
};

const buildCake = (builder: AttractionBuilder, at: Triple) => {
  /* A china cake stand on a stem */
  builder.lathe(
    "paint",
    china,
    [
      [0, 0],
      [0.1, 0],
      [0.08, 0.02],
      [0.03, 0.05],
      [0.03, 0.12],
      [0.24, 0.13],
      [0.24, 0.145],
      [0, 0.145],
    ],
    at,
    "y",
    12,
  );
  const base = at[1] + 0.145;
  /* A Victoria sponge: two sponges with jam and cream between */
  builder.cylinder("matte", sponge, {
    radius: 0.19,
    length: 0.07,
    at: [at[0], base + 0.035, at[2]],
    segments: 16,
  });
  builder.cylinder("paint", jam, {
    radius: 0.185,
    length: 0.02,
    at: [at[0], base + 0.08, at[2]],
    segments: 16,
  });
  builder.cylinder("paint", cream, {
    radius: 0.19,
    length: 0.025,
    at: [at[0], base + 0.1, at[2]],
    segments: 16,
  });
  builder.cylinder("matte", sponge, {
    radius: 0.19,
    length: 0.07,
    at: [at[0], base + 0.148, at[2]],
    segments: 16,
  });
  builder.cylinder("paint", cream, {
    radius: 0.19,
    length: 0.012,
    at: [at[0], base + 0.19, at[2]],
    segments: 16,
  });
  /* Icing sugar dusting, strawberries round the top */
  for (let index = 0; index < 7; index++) {
    const angle = (index / 7) * Math.PI * 2;
    builder.sphere(
      "paint",
      strawberry,
      0.028,
      [
        at[0] + Math.sin(angle) * 0.13,
        base + 0.21,
        at[2] + Math.cos(angle) * 0.13,
      ],
      [1, 1.2, 1],
      6,
    );
  }
  builder.sphere(
    "paint",
    strawberry,
    0.04,
    [at[0], base + 0.22, at[2]],
    [1, 1.2, 1],
    8,
  );
  builder.box(
    "matte",
    leafGreen,
    [0.05, 0.01, 0.02],
    [at[0], base + 0.265, at[2]],
  );
  /* A cake slice on a little plate, ready to share */
  const slicePlate: Triple = [at[0] - 0.35, 0, at[2] + 0.1];
  buildPlate(builder, slicePlate, 0.12);
  [
    [sponge, 0.04, 0.02],
    [jam, 0.012, 0.046],
    [cream, 0.016, 0.06],
    [sponge, 0.04, 0.088],
  ].forEach(([colour, height, y]) => {
    if (
      typeof colour !== "string" ||
      typeof height !== "number" ||
      typeof y !== "number"
    ) {
      return;
    }
    builder.add(
      "matte",
      colour,
      new CylinderGeometry(0.07, 0.07, height, 3),
      {
        at: [slicePlate[0], blanketTop + 0.02 + y, slicePlate[2]],
        rotation: [0, 0.5, 0],
      },
      undefined,
    );
  });
};

const buildFruitBowl = (builder: AttractionBuilder, at: Triple) => {
  builder.lathe(
    "paint",
    "#e9a23b",
    [
      [0, 0],
      [0.09, 0],
      [0.09, 0.02],
      [0.17, 0.06],
      [0.21, 0.12],
      [0.2, 0.125],
      [0.16, 0.07],
      [0, 0.04],
    ],
    at,
    "y",
    14,
  );
  [
    [0.07, 0.11, 0.03, appleRed, 0.06],
    [-0.07, 0.11, 0.04, appleGreen, 0.06],
    [0.0, 0.11, -0.08, orange, 0.062],
    [0.02, 0.18, 0.0, appleRed, 0.058],
  ].forEach(([dx, dy, dz, colour, radius]) => {
    if (
      typeof dx !== "number" ||
      typeof dy !== "number" ||
      typeof dz !== "number" ||
      typeof colour !== "string" ||
      typeof radius !== "number"
    ) {
      return;
    }
    builder.sphere(
      "paint",
      colour,
      radius,
      [at[0] + dx, at[1] + dy, at[2] + dz],
      [1, 0.92, 1],
      8,
    );
    if (colour !== orange) {
      builder.bar(
        "matte",
        bark,
        [at[0] + dx, at[1] + dy + radius * 0.8, at[2] + dz],
        [at[0] + dx + 0.01, at[1] + dy + radius + 0.025, at[2] + dz],
        0.01,
        4,
      );
    }
  });
  /* A bunch of grapes hanging over the rim */
  [
    [0.17, 0.12, 0.05],
    [0.2, 0.1, 0.07],
    [0.19, 0.08, 0.03],
    [0.22, 0.07, 0.06],
    [0.2, 0.05, 0.05],
    [0.17, 0.09, 0.09],
  ].forEach(([dx, dy, dz]) => {
    builder.sphere(
      "paint",
      grape,
      0.022,
      [at[0] + dx, at[1] + dy, at[2] + dz],
      [1, 1, 1],
      6,
    );
  });
  /* A banana curled on top */
  builder.add(
    "paint",
    banana,
    new TorusGeometry(0.12, 0.022, 6, 10, Math.PI * 0.55),
    {
      at: [at[0] - 0.02, at[1] + 0.25, at[2] + 0.02],
      rotation: [Math.PI / 2 - 0.2, 0, 2.6],
    },
  );
};

/* ------------------------------------------------------------------ */
/* The hamper and its lid                                              */
/* ------------------------------------------------------------------ */

const buildHamper = (builder: AttractionBuilder) => {
  const { x, z, width, height, depth } = hamper;
  builder.box("matte", wicker, [width, height, depth], [x, height / 2, z]);
  if (builder.isFar) {
    builder.box(
      "matte",
      wickerDark,
      [width + 0.02, 0.06, depth + 0.02],
      [x, height + 0.03, z],
    );
    return;
  }
  /* Woven bands round the basket */
  [0.07, 0.17, 0.27, 0.37].forEach((y, index) => {
    builder.box(
      "matte",
      index % 2 === 0 ? wickerDark : shade(wicker, 1.1),
      [width + 0.02, 0.045, depth + 0.02],
      [x, y, z],
    );
  });
  /* Upright canes at the corners and along the sides */
  [-1, -0.33, 0.33, 1].forEach((share) => {
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        wickerDark,
        [0.03, height, 0.02],
        [
          x + share * (width / 2 - 0.015),
          height / 2,
          z + side * (depth / 2 + 0.012),
        ],
      );
    });
  });
  /* Leather straps and buckles at the front */
  [-0.2, 0.2].forEach((side) => {
    builder.box(
      "matte",
      "#6a3b22",
      [0.06, 0.3, 0.015],
      [x + side, height - 0.12, z + depth / 2 + 0.02],
    );
    builder.box(
      "metal",
      palette.brass,
      [0.07, 0.05, 0.02],
      [x + side, height - 0.2, z + depth / 2 + 0.03],
    );
  });
  /* A gingham napkin peeping out, and a bottle */
  builder.box(
    "matte",
    ginghamRed,
    [0.3, 0.1, 0.2],
    [x - 0.15, height + 0.02, z + 0.05],
    [0.1, 0.4, 0.2],
  );
  builder.cylinder("glass", "#4f8a5a", {
    radius: 0.04,
    length: 0.3,
    at: [x + 0.2, height + 0.08, z - 0.05],
    segments: 10,
  });
  builder.cylinder("glass", "#4f8a5a", {
    radius: 0.015,
    length: 0.1,
    at: [x + 0.2, height + 0.27, z - 0.05],
    segments: 8,
  });
};

/** A point on the lid, turned open by `lidRest` about its hinge. */
const onLid = (x: number, y: number, z: number): Triple => [
  x,
  y * Math.cos(lidRest) - z * Math.sin(lidRest),
  y * Math.sin(lidRest) + z * Math.cos(lidRest),
];

const buildLid = (builder: AttractionBuilder) => {
  const { width, depth } = hamper;
  const rotation: Triple = [lidRest, 0, 0];
  builder.box(
    "matte",
    wickerDark,
    [width + 0.04, 0.05, depth + 0.04],
    onLid(0, 0.025, depth / 2),
    rotation,
  );
  [-0.2, 0, 0.2].forEach((across) => {
    builder.box(
      "matte",
      shade(wicker, 1.1),
      [width, 0.02, 0.06],
      onLid(0, 0.055, depth / 2 + across),
      rotation,
    );
  });
  /* The carrying handle on top */
  builder.add(
    "matte",
    "#6a3b22",
    new TorusGeometry(0.13, 0.02, 6, 12, Math.PI),
    { at: onLid(0, 0.05, depth / 2), rotation },
  );
};

/* ------------------------------------------------------------------ */
/* Ants and wasps                                                      */
/* ------------------------------------------------------------------ */

const buildAnt = (builder: AttractionBuilder) => {
  [
    [0.02, 0.022, -0.035],
    [0.014, 0.02, 0],
    [0.018, 0.024, 0.032],
  ].forEach(([radius, y, z]) => {
    builder.sphere("paint", "#2a1a14", radius, [0, y, z], [1, 0.8, 1.3], 5);
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#2a1a14",
      [0, 0.02, 0],
      [side * 0.04, 0, 0.01],
      0.005,
      3,
    );
  });
  /* A crumb carried home */
  builder.box("matte", bread, [0.03, 0.02, 0.03], [0, 0.05, 0.045]);
};

const buildWasp = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#f2c21a", 0.05, [0, 0, -0.03], [0.85, 0.85, 1.4], 7);
  [-0.06, -0.02].forEach((z) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.044,
      length: 0.014,
      at: [0, 0, z],
      axis: "z",
      segments: 8,
    });
  });
  builder.sphere("paint", palette.black, 0.03, [0, 0.005, 0.06], [1, 1, 1], 8);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#e6f2fa",
      [0.09, 0.005, 0.04],
      [side * 0.05, 0.04, 0],
      [0, side * 0.3, side * 0.3],
    );
  });
};

export const picnicSpotModel: CuriosityModel = {
  kind: "picnic-spot",
  islandId: "meadow-isle",
  name: "Picnic Spot",
  fact: "A picnic is a meal eaten outdoors. A healthy picnic has some fruit and vegetables, some bread, and a drink of water or milk, with a little cake as a treat. Bread is made from wheat that grows in fields, cheese comes from cows' milk, and apples grow on trees. Ants love crumbs, so keep your food covered!",
  curriculumLink:
    "Design and technology, Key Stage 1: use the basic principles of a healthy and varied diet to prepare dishes, and understand where food comes from.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: 2.0, z: 3.4 },
  build: (builder) => {
    buildTree(builder);
    buildBlanket(builder);
    buildHamper(builder);
    buildFeast(builder);
    if (!builder.isFar) {
      buildBicycle(builder);
    }
    addSignBoard(builder, [2.0, 0, 3.4], signColour);
  },
  moving: [
    {
      name: "hamper lid",
      pivot: hingeAt,
      build: buildLid,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.5, period: 2.2 },
    },
  ],
  wanderers: [
    {
      name: "ants",
      build: buildAnt,
      count: 5,
      centre: { x: blanket.x + 0.4, z: blanket.z - 0.3 },
      radius: 1.1,
      height: blanketTop,
      speed: 0.25,
    },
    {
      name: "wasps",
      build: buildWasp,
      count: 2,
      centre: { x: blanket.x, z: blanket.z },
      radius: 1.3,
      height: 0.9,
      speed: 0.9,
      bob: 0.2,
    },
  ],
  blockers: [
    { x: treeAt.x, z: treeAt.z, radius: 0.5 },
    { x: bikeX, z: -1.8, radius: 0.45 },
    { x: hamper.x, z: hamper.z, radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Share the sandwiches",
    news: "Yum! You shared the sandwiches out fairly: one for you, one for a friend, and a crumb for the ants.",
  },
};
