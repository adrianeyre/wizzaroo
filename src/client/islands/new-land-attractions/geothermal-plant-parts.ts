import { BoxGeometry, CylinderGeometry, LatheGeometry, Vector2 } from "three";
import {
  addWindow,
  shade,
  type AttractionBuilder,
  type Triple,
} from "../attractions/attraction-kit.js";

/* The Geothermal Plant's colours, in Ember Isle's style */

export const ashPad = "#6f6862";
export const basalt = "#3a3532";
export const basaltDark = "#2a2624";
export const ash = "#8e8780";
export const concrete = "#b9b2a8";
export const cladding = "#cfc8ba";
export const trim = "#e0662a";
export const roofSteel = "#4b5259";
export const steel = "#9aa3ad";
export const darkSteel = "#4b5259";
export const pipeSilver = "#c8ccd0";
export const brinePipe = "#5b6770";
export const valveRed = "#c8102e";
export const wellGreen = "#3f7d5a";
export const generatorGreen = "#2f7a6a";
export const bronze = "#b5793a";
export const lava = "#ff6a1f";
export const lavaCore = "#ffc04a";
export const warmLight = "#ffd27a";
export const hiVis = "#ff8a1f";
export const hatYellow = "#ffd23a";
export const skin = "#e0b08a";
export const silica = "#6fd3e0";
export const sinter = "#e9e4d6";
export const signColour = "#2f6f7a";

export const hall = {
  minX: -3.2,
  maxX: 3.2,
  minZ: -7.0,
  maxZ: -3.4,
  height: 3.2,
};
export const hallMidZ = (hall.minZ + hall.maxZ) / 2;
export const opening = { minX: -2.4, maxX: 2.4, bottom: 1.4, top: 2.8 };
export const turbineY = 1.95;
export const rotorPivot: Triple = [-1.3, turbineY, hallMidZ];

const corrugated = (colour: string) => (centre: { x: number; z: number }) =>
  Math.floor((centre.x + centre.z + 20) / 0.32) % 2 === 0
    ? colour
    : shade(colour, 0.9);

/** A wall of corrugated cladding from one corner to another, its bottom at y. */
const addCladding = (
  builder: AttractionBuilder,
  size: Triple,
  at: Triple,
  along: "x" | "z",
) => {
  const ribs = builder.isFar
    ? 1
    : Math.max(1, Math.round((along === "x" ? size[0] : size[2]) / 0.32));
  builder.painted(
    new BoxGeometry(
      size[0],
      size[1],
      size[2],
      along === "x" ? ribs : 1,
      1,
      along === "z" ? ribs : 1,
    ),
    corrugated(cladding),
    { at },
    "paint",
  );
};

/* The turbine hall, with a big window onto the turbine */

export const buildHall = (builder: AttractionBuilder): void => {
  const width = hall.maxX - hall.minX;
  const depth = hall.maxZ - hall.minZ;
  const thick = 0.2;
  /* A basalt plinth and a dark floor */
  builder.box(
    "matte",
    basalt,
    [width + 0.3, 0.3, depth + 0.3],
    [0, 0.15, hallMidZ],
  );
  builder.box(
    "matte",
    "#3a3d40",
    [width - 0.2, 0.04, depth - 0.2],
    [0, 0.32, hallMidZ],
  );
  /* Back and side walls */
  addCladding(
    builder,
    [width, hall.height, thick],
    [0, hall.height / 2, hall.minZ + thick / 2],
    "x",
  );
  [hall.minX + thick / 2, hall.maxX - thick / 2].forEach((x) => {
    addCladding(
      builder,
      [thick, hall.height, depth],
      [x, hall.height / 2, hallMidZ],
      "z",
    );
  });
  /* The front wall, round the window */
  const frontZ = hall.maxZ - thick / 2;
  addCladding(
    builder,
    [width, opening.bottom, thick],
    [0, opening.bottom / 2, frontZ],
    "x",
  );
  addCladding(
    builder,
    [width, hall.height - opening.top, thick],
    [0, (hall.height + opening.top) / 2, frontZ],
    "x",
  );
  [-1, 1].forEach((side) => {
    const pierWidth = hall.maxX - opening.maxX;
    addCladding(
      builder,
      [pierWidth, opening.top - opening.bottom, thick],
      [
        side * (opening.maxX + pierWidth / 2),
        (opening.top + opening.bottom) / 2,
        frontZ,
      ],
      "x",
    );
  });
  /* Orange trims: corners, eaves and round the window */
  [hall.minX, hall.maxX].forEach((x) => {
    [hall.minZ, hall.maxZ].forEach((z) => {
      builder.box(
        "paint",
        trim,
        [0.16, hall.height, 0.16],
        [x, hall.height / 2, z],
      );
    });
  });
  builder.box(
    "paint",
    trim,
    [width + 0.16, 0.14, 0.16],
    [0, hall.height, hall.maxZ],
  );
  builder.box(
    "paint",
    trim,
    [opening.maxX - opening.minX + 0.2, 0.1, 0.24],
    [0, opening.bottom, hall.maxZ],
  );
  builder.box(
    "paint",
    trim,
    [opening.maxX - opening.minX + 0.2, 0.1, 0.24],
    [0, opening.top, hall.maxZ],
  );
  /* A shallow roof */
  const roofRise = 0.55;
  [-1, 1].forEach((side) => {
    const halfDepth = depth / 2 + 0.25;
    const slope = Math.hypot(halfDepth, roofRise);
    builder.box(
      "metal",
      roofSteel,
      [width + 0.4, 0.08, slope],
      [0, hall.height + roofRise / 2, hallMidZ + (side * halfDepth) / 2],
      [side * Math.atan2(roofRise, halfDepth), 0, 0],
    );
  });
  builder.box(
    "metal",
    darkSteel,
    [width + 0.45, 0.1, 0.18],
    [0, hall.height + roofRise, hallMidZ],
  );
  /* Roof vents */
  [-2.0, 2.0].forEach((x) => {
    builder.cylinder("metal", steel, {
      radius: 0.18,
      length: 0.6,
      at: [x, hall.height + 0.75, hallMidZ - 0.6],
      segments: 10,
    });
    builder.cylinder("metal", darkSteel, {
      radius: 0.28,
      radiusEnd: 0.05,
      length: 0.18,
      at: [x, hall.height + 1.12, hallMidZ - 0.6],
      segments: 10,
    });
  });
  /* A lightning bolt over the window, glowing after dark */
  const bolt: [Triple, Triple][] = [
    [
      [0.12, 3.05, hall.maxZ + 0.06],
      [-0.1, 2.9, hall.maxZ + 0.06],
    ],
    [
      [-0.1, 2.9, hall.maxZ + 0.06],
      [0.08, 2.88, hall.maxZ + 0.06],
    ],
  ];
  if (!builder.isFar) {
    bolt.forEach(([from, to]) => {
      builder.bar("glow", hatYellow, from, to, 0.06, 4);
    });
    /* Lit windows high on the sides */
    [-1.2, 1.2].forEach((z) => {
      [-1, 1].forEach((side) => {
        addWindow(builder, {
          at: [side * (hall.maxX + 0.01), 2.5, hallMidZ + z * 0.6],
          width: 0.6,
          height: 0.45,
          frame: trim,
          turn: (side * Math.PI) / 2,
          isLit: true,
        });
      });
    });
    /* A door in the east wall */
    builder.box(
      "paint",
      darkSteel,
      [0.05, 1.3, 0.8],
      [hall.maxX + 0.02, 0.95, hall.maxZ - 0.8],
    );
    builder.box(
      "paint",
      trim,
      [0.06, 0.1, 0.9],
      [hall.maxX + 0.03, 1.62, hall.maxZ - 0.8],
    );
  }
};

/* The turbine and generator inside */

export const buildTurbine = (builder: AttractionBuilder): void => {
  const [rotorX] = rotorPivot;
  /* The casing behind the rotor, and the long shaft */
  builder.cylinder("metal", steel, {
    radius: 0.55,
    radiusEnd: 0.8,
    length: 0.9,
    at: [rotorX - 0.6, turbineY, hallMidZ],
    axis: "x",
    segments: 16,
  });
  builder.cylinder("metal", darkSteel, {
    radius: 0.1,
    length: 3.0,
    at: [0.2, turbineY, hallMidZ],
    axis: "x",
    segments: 8,
  });
  /* The generator, which turns spinning into electricity */
  builder.cylinder("paint", generatorGreen, {
    radius: 0.7,
    length: 1.6,
    at: [1.5, turbineY, hallMidZ],
    axis: "x",
    segments: 18,
  });
  builder.box(
    "paint",
    shade(generatorGreen, 0.8),
    [1.7, 1.1, 1.3],
    [1.5, 0.9, hallMidZ],
  );
  if (builder.isFar) {
    return;
  }
  [1.0, 1.9].forEach((x) => {
    builder.torus("metal", steel, 0.71, 0.04, [x, turbineY, hallMidZ], "x", 14);
  });
  builder.cylinder("metal", bronze, {
    radius: 0.3,
    length: 0.1,
    at: [2.35, turbineY, hallMidZ],
    axis: "x",
    segments: 12,
  });
  /* Cables up to the roof, and a control desk */
  builder.bar(
    "matte",
    "#222222",
    [2.2, 2.5, hallMidZ - 0.3],
    [2.6, hall.height, hallMidZ - 0.9],
    0.08,
    5,
  );
  builder.box(
    "paint",
    darkSteel,
    [0.9, 0.8, 0.5],
    [-2.3, 0.72, hall.maxZ - 0.6],
  );
  builder.box(
    "glow",
    "#7fe0a0",
    [0.7, 0.3, 0.02],
    [-2.3, 1.0, hall.maxZ - 0.34],
    [-0.3, 0, 0],
  );
};

export const buildRotor = (builder: AttractionBuilder): void => {
  builder.cylinder("metal", bronze, {
    radius: 0.24,
    length: 0.4,
    at: [0, 0, 0],
    axis: "x",
    segments: 12,
  });
  builder.sphere("metal", bronze, 0.2, [0.22, 0, 0], [0.7, 1, 1], 8);
  const blades = builder.isFar ? 6 : 14;
  for (let blade = 0; blade < blades; blade++) {
    const angle = (blade / blades) * Math.PI * 2;
    builder.box(
      "metal",
      blade === 0 ? valveRed : steel,
      [0.05, 0.58, 0.16],
      [0, Math.cos(angle) * 0.5, Math.sin(angle) * 0.5],
      [angle, 0.35, 0],
    );
  }
  builder.torus(
    "metal",
    darkSteel,
    0.8,
    0.04,
    [0, 0, 0],
    "x",
    builder.isFar ? 12 : 20,
  );
};

/* Cooling towers */

export const addCoolingTower = (
  builder: AttractionBuilder,
  at: { x: number; z: number },
  radius: number,
  height: number,
): void => {
  const profile = [
    [radius, 0.25],
    [radius * 0.86, height * 0.3],
    [radius * 0.68, height * 0.66],
    [radius * 0.7, height * 0.86],
    [radius * 0.76, height],
  ].map(([r, h]) => new Vector2(r, h));
  builder.painted(
    new LatheGeometry(profile, builder.segments(20, 10)),
    (centre) =>
      centre.y > height * 0.8 && centre.y < height * 0.93
        ? trim
        : shade(concrete, 0.94 + (centre.y / height) * 0.1),
    { at: [at.x, 0, at.z] },
    "matte",
  );
  /* The dark inside, seen over the rim */
  builder.add(
    "matte",
    "#2b2a29",
    new CylinderGeometry(
      radius * 0.74,
      radius * 0.74,
      0.05,
      builder.segments(16, 8),
    ),
    { at: [at.x, height - 0.25, at.z] },
  );
  builder.torus(
    "matte",
    shade(concrete, 1.08),
    radius * 0.76,
    0.05,
    [at.x, height, at.z],
    "y",
    builder.isFar ? 8 : 14,
  );
  /* The ring of legs at the bottom, where air is drawn in */
  const legs = builder.isFar ? 0 : 10;
  for (let leg = 0; leg < legs; leg++) {
    const angle = (leg / legs) * Math.PI * 2;
    const next = angle + Math.PI / legs;
    builder.bar(
      "matte",
      shade(concrete, 0.85),
      [
        at.x + Math.sin(angle) * radius * 1.02,
        0,
        at.z + Math.cos(angle) * radius * 1.02,
      ],
      [at.x + Math.sin(next) * radius, 0.3, at.z + Math.cos(next) * radius],
      0.08,
      4,
    );
  }
  builder.cylinder("water", "#3f6f80", {
    radius: radius * 0.95,
    length: 0.04,
    at: [at.x, 0.06, at.z],
    segments: builder.segments(16, 8),
  });
};

/* The engineers who look after it */

export const buildEngineer = (builder: AttractionBuilder): void => {
  if (builder.isFar) {
    builder.cylinder("matte", "#2f3b52", {
      radius: 0.12,
      length: 0.45,
      at: [0, 0.23, 0],
      segments: 6,
    });
    builder.box("matte", hiVis, [0.3, 0.38, 0.2], [0, 0.62, 0]);
    builder.sphere("paint", hatYellow, 0.14, [0, 0.98, 0], [1, 0.8, 1], 8);
    return;
  }
  [-0.07, 0.07].forEach((x) => {
    builder.cylinder("matte", "#2f3b52", {
      radius: 0.055,
      radiusEnd: 0.06,
      length: 0.42,
      at: [x, 0.23, 0],
      segments: 6,
    });
    builder.box("paint", "#2b2522", [0.1, 0.07, 0.18], [x, 0.035, 0.03]);
  });
  builder.box("matte", "#2f3b52", [0.3, 0.38, 0.2], [0, 0.62, 0]);
  builder.box("paint", hiVis, [0.32, 0.3, 0.22], [0, 0.66, 0]);
  builder.box("glow", "#f4f1ea", [0.33, 0.03, 0.23], [0, 0.6, 0]);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#2f3b52",
      [side * 0.17, 0.76, 0],
      [side * 0.21, 0.5, 0.04],
      0.075,
      6,
    );
    builder.sphere(
      "matte",
      skin,
      0.045,
      [side * 0.21, 0.46, 0.05],
      [1, 1, 1],
      5,
    );
  });
  /* A clipboard */
  builder.box(
    "matte",
    bronze,
    [0.14, 0.18, 0.02],
    [0.2, 0.52, 0.1],
    [0.4, 0, 0],
  );
  builder.sphere("matte", skin, 0.12, [0, 0.95, 0], [1, 1.05, 1], 8);
  [-0.045, 0.045].forEach((x) => {
    builder.sphere("paint", "#1f2023", 0.017, [x, 0.96, 0.11], [1, 1, 1], 4);
  });
  builder.box("paint", "#b4523e", [0.06, 0.015, 0.01], [0, 0.9, 0.115]);
  /* A yellow hard hat with a brim */
  builder.sphere("paint", hatYellow, 0.135, [0, 1.02, 0], [1, 0.75, 1.05], 8);
  builder.cylinder("paint", hatYellow, {
    radius: 0.17,
    length: 0.02,
    at: [0, 1.0, 0.02],
    segments: 10,
  });
};
