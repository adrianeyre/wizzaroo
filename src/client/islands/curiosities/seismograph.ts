import {
  addDoor,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ashGround = "#5b4a42";
const hutWall = "#d9e2d6";
const hutTrim = "#2f6f8a";
const roofMetal = "#8a949c";
const concrete = "#b3aca2";
const concreteDark = "#8d877e";
const paper = "#f6f2e8";
const ink = "#2a2d33";
const screenDark = "#123a3a";
const screenLine = "#5dffa0";
const beaconRed = "#ff3b2f";
const panelBlue = "#1f3f78";
const crackDark = "#2a2320";
const signColour = "#2f6f8a";

const hut = { x: -1.55, z: -1.35, width: 2.1, depth: 1.7, height: 2.0 };
const hutFront = hut.z + hut.depth / 2;
const plinthAt = { x: 1.1, z: -0.35 };
const plinthHeight = 0.75;
const drumAt: Triple = [plinthAt.x, plinthHeight + 0.26, plinthAt.z + 0.05];
const drumRadius = 0.22;
const drumLength = 0.9;
const armPivot: Triple = [
  plinthAt.x + 0.1,
  plinthHeight + 0.4,
  plinthAt.z - 0.42,
];
const vaneAt = { x: 2.75, z: -2.1 };
const vaneHeight = 2.5;
const beaconAt: Triple = [hut.x + 0.6, hut.height + 0.32, hut.z + 0.2];
const panelAt = { x: -2.0, z: 1.35 };

const buildHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = hut;
  builder.box("paint", hutWall, [width, height, depth], [x, height / 2, z]);
  builder.box(
    "matte",
    concreteDark,
    [width + 0.14, 0.18, depth + 0.14],
    [x, 0.09, z],
  );
  /* A shallow sloping metal roof */
  builder.box(
    "metal",
    roofMetal,
    [width + 0.4, 0.08, depth + 0.45],
    [x, height + 0.12, z],
    [0.1, 0, 0],
  );
  if (builder.isFar) {
    return;
  }
  /* Ribs on the corrugated roof */
  for (let rib = 0; rib < 9; rib++) {
    builder.box(
      "metal",
      shade(roofMetal, 1.12),
      [0.04, 0.04, depth + 0.45],
      [x - width / 2 - 0.1 + rib * ((width + 0.2) / 8), height + 0.18, z],
      [0.1, 0, 0],
    );
  }
  /* Blue trim at the corners and along the eaves */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        hutTrim,
        [0.08, height, 0.08],
        [x + sideX * (width / 2), height / 2, z + sideZ * (depth / 2)],
      );
    });
  });
  builder.box(
    "paint",
    hutTrim,
    [width + 0.08, 0.1, 0.08],
    [x, height - 0.05, hutFront],
  );
  addDoor(builder, {
    at: [x + 0.55, 0.18, hutFront + 0.01],
    width: 0.65,
    height: 1.45,
    colour: hutTrim,
  });
  /* The outdoor screen, showing the latest wiggly trace */
  const screenX = x - 0.45;
  builder.box(
    "paint",
    palette.black,
    [0.9, 0.62, 0.06],
    [screenX, 1.35, hutFront + 0.03],
  );
  builder.box(
    "glow",
    screenDark,
    [0.8, 0.52, 0.02],
    [screenX, 1.35, hutFront + 0.065],
  );
  const trace = [
    0, 0.02, -0.03, 0.04, -0.12, 0.16, -0.08, 0.05, -0.02, 0.01, 0,
  ];
  for (let step = 0; step < trace.length - 1; step++) {
    const fromX = screenX - 0.35 + step * 0.07;
    builder.bar(
      "glow",
      screenLine,
      [fromX, 1.35 + trace[step], hutFront + 0.08],
      [fromX + 0.07, 1.35 + trace[step + 1], hutFront + 0.08],
      0.015,
      3,
    );
  }
  builder.box(
    "paint",
    palette.black,
    [1.0, 0.05, 0.2],
    [screenX, 1.7, hutFront + 0.1],
  );
  /* A radio mast and dish on the roof, for sending the readings */
  builder.cylinder("metal", palette.steel, {
    radius: 0.025,
    length: 1.3,
    at: [x - 0.75, height + 0.8, z - 0.4],
    segments: 6,
  });
  builder.lathe(
    "paint",
    palette.white,
    [
      [0, 0],
      [0.12, 0.02],
      [0.22, 0.08],
      [0.24, 0.1],
    ],
    [x - 0.75, height + 1.2, z - 0.32],
    "z",
    14,
  );
  /* The beacon's housing */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.1,
    length: 0.12,
    at: [beaconAt[0], hut.height + 0.22, beaconAt[2]],
    segments: 12,
  });
  builder.cylinder("glass", "#f2b0a8", {
    radius: 0.08,
    length: 0.16,
    at: [beaconAt[0], beaconAt[1], beaconAt[2]],
    segments: 12,
  });
  /* An air-conditioning box and a cable reel on the side wall */
  builder.box(
    "paint",
    palette.steel,
    [0.12, 0.4, 0.5],
    [x + width / 2 + 0.06, 0.6, z - 0.2],
  );
  for (let fin = 0; fin < 5; fin++) {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.01, 0.3, 0.02],
      [x + width / 2 + 0.125, 0.6, z - 0.4 + fin * 0.1],
    );
  }
};

const buildSeismograph = (builder: AttractionBuilder) => {
  const { x, z } = plinthAt;
  /* The heavy concrete plinth, sunk deep so it feels the ground shake */
  builder.box(
    "matte",
    concrete,
    [1.4, plinthHeight, 1.0],
    [x, plinthHeight / 2, z],
  );
  builder.box("matte", concreteDark, [1.5, 0.08, 1.1], [x, 0.04, z]);
  /* A little glass canopy on four posts to keep the rain off */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "metal",
        palette.darkSteel,
        [0.05, 1.05, 0.05],
        [x + sideX * 0.66, plinthHeight + 0.52, z + sideZ * 0.46],
      );
    });
  });
  builder.box(
    "glass",
    palette.glass,
    [1.45, 0.04, 1.05],
    [x, plinthHeight + 1.06, z],
  );
  if (builder.isFar) {
    builder.cylinder("paint", paper, {
      radius: drumRadius,
      length: drumLength,
      at: drumAt,
      axis: "x",
      segments: 8,
    });
    return;
  }
  builder.box(
    "metal",
    palette.darkSteel,
    [1.5, 0.05, 0.05],
    [x, plinthHeight + 1.03, z + 0.5],
  );
  /* Brackets holding the drum's axle */
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.05, 0.3, 0.08],
      [
        drumAt[0] + side * (drumLength / 2 + 0.07),
        plinthHeight + 0.15,
        drumAt[2],
      ],
    );
  });
  /* The pendulum frame: a heavy weight hanging still while the ground moves */
  const frameZ = armPivot[2];
  [-0.45, 0.45].forEach((side) => {
    builder.box(
      "metal",
      hutTrim,
      [0.06, 0.85, 0.06],
      [x + side, plinthHeight + 0.42, frameZ],
    );
  });
  builder.box(
    "metal",
    hutTrim,
    [0.96, 0.06, 0.06],
    [x, plinthHeight + 0.85, frameZ],
  );
  builder.bar(
    "metal",
    palette.steel,
    [x - 0.2, plinthHeight + 0.85, frameZ],
    [x - 0.2, plinthHeight + 0.5, frameZ],
    0.015,
    4,
  );
  builder.cylinder("metal", palette.brass, {
    radius: 0.12,
    length: 0.2,
    at: [x - 0.2, plinthHeight + 0.4, frameZ],
    segments: 14,
  });
  builder.box("metal", palette.darkSteel, [0.08, 0.1, 0.08], armPivot);
  /* A spare paper roll, and paper spooling out with yesterday's trace */
  builder.cylinder("paint", paper, {
    radius: 0.1,
    length: 0.5,
    at: [x + 0.48, plinthHeight + 0.1, z + 0.38],
    axis: "x",
    segments: 12,
  });
  builder.box(
    "paint",
    paper,
    [0.5, 0.01, 0.6],
    [x - 0.25, plinthHeight + 0.005, z + 0.28],
  );
  const squiggle = [0, 0.03, -0.02, 0.08, -0.1, 0.06, -0.03, 0.01];
  for (let step = 0; step < squiggle.length - 1; step++) {
    builder.bar(
      "matte",
      ink,
      [x - 0.25 + squiggle[step], plinthHeight + 0.012, z + 0.02 + step * 0.07],
      [
        x - 0.25 + squiggle[step + 1],
        plinthHeight + 0.012,
        z + 0.09 + step * 0.07,
      ],
      0.012,
      3,
    );
  }
  /* A cable running across to the hut */
  builder.bar(
    "matte",
    ink,
    [x - 0.7, 0.3, z - 0.3],
    [hut.x + hut.width / 2, 0.3, hut.z + 0.3],
    0.03,
    4,
  );
};

/** The paper drum, slowly turning under the pen. */
const buildDrum = (builder: AttractionBuilder) => {
  builder.cylinder("paint", paper, {
    radius: drumRadius,
    length: drumLength,
    at: [0, 0, 0],
    axis: "x",
    segments: 24,
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.03,
    length: drumLength + 0.2,
    at: [0, 0, 0],
    axis: "x",
    segments: 8,
  });
  [-1, 1].forEach((side) => {
    builder.cylinder("metal", palette.steel, {
      radius: drumRadius + 0.015,
      length: 0.03,
      at: [side * (drumLength / 2), 0, 0],
      axis: "x",
      segments: 24,
    });
  });
  /* Wiggly lines of trace round the drum */
  for (let line = 0; line < 4; line++) {
    for (let tick = 0; tick < 12; tick++) {
      const angle = (tick / 12) * Math.PI * 2;
      const wiggle = (tick + line) % 4 === 0 ? 0.12 : 0.04;
      builder.box(
        "matte",
        ink,
        [wiggle, 0.012, 0.01],
        [
          -0.3 + line * 0.2,
          Math.sin(angle) * (drumRadius + 0.003),
          Math.cos(angle) * (drumRadius + 0.003),
        ],
        [-angle, 0, 0],
      );
    }
  }
};

/** The pen arm, which scribbles when the Character's footsteps shake the ground. */
const buildArm = (builder: AttractionBuilder) => {
  const reach = drumAt[2] - armPivot[2] + drumRadius - 0.02;
  const drop = drumAt[1] - armPivot[1];
  builder.bar(
    "metal",
    palette.steel,
    [0, 0, 0],
    [0, drop * 0.5, reach * 0.95],
    0.025,
    5,
  );
  builder.bar(
    "metal",
    palette.steel,
    [0, drop * 0.5, reach * 0.95],
    [0, drop + 0.02, reach],
    0.02,
    4,
  );
  builder.cylinder("paint", beaconRed, {
    radius: 0.025,
    radiusEnd: 0.005,
    length: 0.06,
    at: [0, drop + 0.04, reach],
    segments: 6,
  });
  builder.sphere("metal", palette.brass, 0.04, [0, 0, 0], [1, 1, 1], 8);
};

const buildWeatherPole = (builder: AttractionBuilder) => {
  const { x, z } = vaneAt;
  builder.cylinder("metal", palette.steel, {
    radius: 0.04,
    length: vaneHeight,
    at: [x, vaneHeight / 2, z],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.box("matte", concrete, [0.4, 0.15, 0.4], [x, 0.075, z]);
  /* The compass arms, N S E W */
  const arms: [number, number][] = [
    [0, -1],
    [0, 1],
    [1, 0],
    [-1, 0],
  ];
  arms.forEach(([armX, armZ]) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [x, vaneHeight - 0.35, z],
      [x + armX * 0.32, vaneHeight - 0.35, z + armZ * 0.32],
      0.02,
      4,
    );
    builder.box(
      "paint",
      palette.black,
      [0.08, 0.1, 0.02],
      [x + armX * 0.36, vaneHeight - 0.35, z + armZ * 0.36],
      [0, Math.atan2(armX, armZ), 0],
    );
  });
  /* A rain gauge and a thermometer screen on the pole */
  builder.cylinder("glass", "#e8f4f8", {
    radius: 0.06,
    length: 0.3,
    at: [x + 0.12, 1.2, z],
    segments: 10,
  });
  builder.box(
    "paint",
    palette.white,
    [0.35, 0.4, 0.3],
    [x - 0.24, 1.4, z],
    [0, 0.3, 0],
  );
  for (let slat = 0; slat < 4; slat++) {
    builder.box(
      "paint",
      shade(palette.white, 0.88),
      [0.36, 0.02, 0.31],
      [x - 0.24, 1.25 + slat * 0.1, z],
      [0, 0.3, 0],
    );
  }
};

/** The weather vane's arrow, turning in the wind. */
const buildVane = (builder: AttractionBuilder) => {
  builder.box("metal", palette.black, [0.03, 0.03, 0.8], [0, 0, 0]);
  builder.cylinder("metal", palette.black, {
    radius: 0.07,
    radiusEnd: 0.0,
    length: 0.16,
    at: [0, 0, 0.46],
    axis: "z",
    segments: 4,
  });
  builder.box(
    "metal",
    palette.black,
    [0.02, 0.22, 0.22],
    [0, 0, -0.38],
    [Math.PI / 4, 0, 0],
  );
  builder.sphere("metal", palette.brass, 0.05, [0, 0, 0], [1, 1, 1], 8);
};

const buildSolarPanel = (builder: AttractionBuilder) => {
  const { x, z } = panelAt;
  const tilt = -0.55;
  builder.box("glass", panelBlue, [1.3, 0.04, 0.8], [x, 0.85, z], [tilt, 0, 0]);
  [-0.5, 0.5].forEach((side) => {
    builder.box(
      "metal",
      palette.steel,
      [0.05, 0.95, 0.05],
      [x + side, 0.45, z - 0.2],
    );
    builder.box(
      "metal",
      palette.steel,
      [0.05, 0.55, 0.05],
      [x + side, 0.27, z + 0.2],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* The silver grid between the cells */
  for (let line = 0; line < 5; line++) {
    builder.box(
      "metal",
      palette.steel,
      [0.015, 0.045, 0.8],
      [x - 0.52 + line * 0.26, 0.86, z],
      [tilt, 0, 0],
    );
  }
  for (let line = 0; line < 3; line++) {
    const along = -0.27 + line * 0.27;
    builder.box(
      "metal",
      palette.steel,
      [1.3, 0.045, 0.015],
      [x, 0.85 - Math.sin(tilt) * along, z + Math.cos(tilt) * along],
      [tilt, 0, 0],
    );
  }
  builder.box(
    "metal",
    palette.steel,
    [1.34, 0.05, 0.84],
    [x, 0.84, z],
    [tilt, 0, 0],
  );
  builder.box(
    "paint",
    palette.steel,
    [0.25, 0.3, 0.15],
    [x + 0.75, 0.15, z - 0.1],
  );
};

/** A zig-zag crack where the ground has split along a fault. */
const buildFaultCrack = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const points: [number, number][] = [
    [-3.7, 0.2],
    [-3.1, 0.55],
    [-2.6, 0.35],
    [-2.0, 0.9],
    [-1.4, 0.75],
    [-0.8, 1.35],
    [-0.4, 1.2],
    [0.0, 1.8],
    [0.5, 1.75],
    [0.9, 2.4],
  ];
  for (let step = 0; step < points.length - 1; step++) {
    const [fromX, fromZ] = points[step];
    const [toX, toZ] = points[step + 1];
    builder.box(
      "matte",
      crackDark,
      [0.14 - step * 0.008, 0.02, Math.hypot(toX - fromX, toZ - fromZ) + 0.06],
      [(fromX + toX) / 2, 0.01, (fromZ + toZ) / 2],
      [0, Math.atan2(toX - fromX, toZ - fromZ), 0],
    );
  }
  /* Broken lumps of rock along the crack */
  [
    [-3.0, 0.85, 0.2],
    [-1.6, 1.1, 0.16],
    [0.3, 2.1, 0.14],
  ].forEach(([x, z, size]) => {
    builder.sphere(
      "matte",
      "#4a403b",
      size,
      [x, size * 0.4, z],
      [1.3, 0.7, 1],
      7,
    );
  });
};

/** A red beacon on the hut, which flashes on as the Character comes near. */
const buildBeacon = (builder: AttractionBuilder) => {
  builder.sphere("glow", beaconRed, 0.07, [0, 0, 0], [1, 1.1, 1], 10);
  builder.box("glow", "#ffb0a0", [0.24, 0.03, 0.03], [0, 0, 0]);
};

const tableAt = { x: 2.6, z: 1.1 };
const gpsAt = { x: -0.3, z: -2.9 };

/** A shake table with model buildings, a GPS pillar and the scientists' kit. */
const buildFieldKit = (builder: AttractionBuilder) => {
  const { x, z } = tableAt;
  builder.box("paint", palette.steel, [1.1, 0.06, 0.75], [x, 0.72, z]);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "metal",
        palette.darkSteel,
        [0.05, 0.7, 0.05],
        [x + sideX * 0.5, 0.35, z + sideZ * 0.32],
      );
    });
  });
  /* The shaking plate, on springs, with model towers on it */
  builder.box("paint", "#f2c230", [0.8, 0.04, 0.5], [x, 0.8, z]);
  [-0.3, 0.3].forEach((side) => {
    builder.cylinder("metal", palette.steel, {
      radius: 0.03,
      length: 0.05,
      at: [x + side, 0.765, z],
      segments: 6,
    });
  });
  [
    { dx: -0.25, dz: 0.05, floors: 4, colour: "#e06a4a" },
    { dx: 0.0, dz: -0.1, floors: 6, colour: "#4a8ae0" },
    { dx: 0.25, dz: 0.08, floors: 3, colour: "#5aa860" },
  ].forEach(({ dx, dz, floors, colour }) => {
    for (let floor = 0; floor < floors; floor++) {
      builder.box(
        "paint",
        floor % 2 === 0 ? colour : shade(colour, 1.2),
        [0.14, 0.08, 0.14],
        [x + dx, 0.86 + floor * 0.085, z + dz],
      );
    }
    /* Cross bracing that helps a building stand up to shaking */
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + dx - 0.07, 0.82, z + dz + 0.072],
      [x + dx + 0.07, 0.82 + floors * 0.085, z + dz + 0.072],
      0.012,
      3,
    );
  });
  /* A laptop showing the readings */
  builder.box(
    "paint",
    palette.darkSteel,
    [0.3, 0.02, 0.22],
    [x - 0.3, 0.76, z + 0.25],
  );
  builder.box(
    "paint",
    palette.darkSteel,
    [0.3, 0.2, 0.02],
    [x - 0.3, 0.86, z + 0.15],
    [-0.25, 0, 0],
  );
  builder.box(
    "glow",
    screenDark,
    [0.26, 0.16, 0.01],
    [x - 0.3, 0.86, z + 0.165],
    [-0.25, 0, 0],
  );
  builder.bar(
    "glow",
    screenLine,
    [x - 0.42, 0.86, z + 0.172],
    [x - 0.18, 0.88, z + 0.172],
    0.008,
    3,
  );
  /* A GPS pillar that measures how far the ground creeps each year */
  const gps = gpsAt;
  builder.cylinder("matte", concrete, {
    radius: 0.16,
    length: 1.1,
    at: [gps.x, 0.55, gps.z],
    segments: 12,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.14,
    length: 0.06,
    at: [gps.x, 1.13, gps.z],
    segments: 14,
  });
  builder.sphere(
    "paint",
    palette.white,
    0.13,
    [gps.x, 1.16, gps.z],
    [1, 0.6, 1],
    12,
  );
  /* Equipment cases and a coil of cable */
  [
    [-0.3, 0.65],
    [0.25, 0.85],
  ].forEach(([dx, dz], index) => {
    builder.box(
      "paint",
      index === 0 ? "#e8902a" : palette.darkSteel,
      [0.55, 0.3, 0.38],
      [hut.x + hut.width / 2 + 0.45 + dx, 0.15 + index * 0.3, hut.z + dz],
      [0, 0.2 * index, 0],
    );
    builder.box(
      "metal",
      palette.steel,
      [0.12, 0.03, 0.05],
      [hut.x + hut.width / 2 + 0.45 + dx, 0.31 + index * 0.3, hut.z + dz],
    );
  });
  [0, 1, 2].forEach((turn) => {
    builder.torus(
      "matte",
      ink,
      0.2 - turn * 0.02,
      0.025,
      [-3.0, 0.03 + turn * 0.045, -0.4],
      "y",
      14,
    );
  });
  /* Gravel stepping stones up to the hut door */
  for (let stone = 0; stone < 5; stone++) {
    builder.cylinder("matte", stone % 2 === 0 ? concrete : concreteDark, {
      radius: 0.24,
      length: 0.04,
      at: [hut.x + 0.55 + stone * 0.22, 0.02, hutFront + 0.4 + stone * 0.55],
      segments: 10,
    });
  }
  /* Ash-grey boulders */
  [
    [3.6, -0.7, 0.35],
    [-3.6, -2.0, 0.4],
    [3.4, 2.7, 0.25],
    [-2.9, 2.6, 0.3],
  ].forEach(([rockX, rockZ, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#4a403b" : "#5e524b",
      size,
      [rockX, size * 0.45, rockZ],
      [1.2, 0.8, 1],
      9,
    );
  });
};

export const seismographModel: CuriosityModel = {
  kind: "seismograph",
  islandId: "ember-isle",
  name: "Earthquake Station",
  fact: "An earthquake happens when huge pieces of the Earth's crust, called plates, suddenly slip past each other and make the ground shake. A seismograph records the shaking: a heavy weight hangs still while the ground and the drum move under its pen, drawing a wiggly line. The bigger the wiggles, the stronger the earthquake.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of physical geography, including volcanoes and earthquakes.",
  footprint: 4.6,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: 1.7, z: 3.5 },
  build: (builder) => {
    buildHut(builder);
    buildSeismograph(builder);
    buildWeatherPole(builder);
    buildSolarPanel(builder);
    buildFaultCrack(builder);
    buildFieldKit(builder);
    addSignBoard(builder, [1.7, 0, 3.5], signColour);
  },
  moving: [
    {
      name: "paper drum",
      pivot: drumAt,
      build: buildDrum,
      motion: { kind: "spin", axis: "x", speed: 0.25 },
    },
    {
      name: "pen arm",
      pivot: armPivot,
      build: buildArm,
      motion: {
        kind: "nod",
        axis: "y",
        reach: 6,
        amplitude: 0.18,
        period: 0.35,
      },
    },
    {
      name: "weather vane",
      pivot: [vaneAt.x, vaneHeight + 0.05, vaneAt.z],
      build: buildVane,
      motion: { kind: "whirl", axis: "y", idle: 0.4, speed: 3, reach: 7 },
    },
    {
      name: "beacon",
      pivot: beaconAt,
      build: buildBeacon,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  blockers: [
    { x: hut.x - 0.5, z: hut.z, radius: 0.95 },
    { x: hut.x + 0.5, z: hut.z, radius: 0.95 },
    { x: plinthAt.x - 0.35, z: plinthAt.z, radius: 0.6 },
    { x: plinthAt.x + 0.35, z: plinthAt.z, radius: 0.6 },
    { x: vaneAt.x, z: vaneAt.z, radius: 0.3 },
    { x: tableAt.x - 0.3, z: tableAt.z, radius: 0.45 },
    { x: tableAt.x + 0.3, z: tableAt.z, radius: 0.45 },
    { x: gpsAt.x, z: gpsAt.z, radius: 0.2 },
    { x: panelAt.x - 0.4, z: panelAt.z, radius: 0.45 },
    { x: panelAt.x + 0.4, z: panelAt.z, radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Feel for tremors",
    news: "You stamped your feet and the pen went scribble-scribble-scribble! The seismograph drew a big wiggly line of your tremor.",
  },
};
