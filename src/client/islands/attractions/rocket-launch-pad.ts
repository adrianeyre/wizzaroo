import {
  BoxGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  Vector2,
} from "three";
import {
  addSignBoard,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "./attraction-kit.js";

const concrete = "#b9b6ae";
const concreteDark = "#8f8c85";
const soot = "#3a3836";
const girder = "#d4572a";
const girderDark = "#a8401d";
const grating = "#6d737a";
const rocketWhite = "#f1f0ec";
const bandBlack = "#1f2124";
const silver = "#c4c9cf";
const tankWhite = "#e9e8e2";
const pipe = "#9aa1a8";
const buildingWhite = "#e4e2dc";
const roofGrey = "#6e7378";
const steelGrey = "#8a9198";

const padTop = 0.7;
const rocketAt = { x: 0, z: -1 };
const mountHeight = 0.55;
const rocketBase = padTop + mountHeight;
const rocketPivot: Triple = [rocketAt.x, rocketBase, rocketAt.z];
const rocketRadius = 0.56;
const towerAt = { x: -2.45, z: -1 };
const towerHalf = 0.7;
const towerHeight = 11.6;
const trenchHalf = 0.8;
const padHalfX = 3.4;
const padFrontZ = 1.6;
const padBackZ = -3.6;
const controlAt = { x: 6.2, z: 3.3 };

const launchPeriod = 75;
const launchHeight = 70;
const bodyMotion: Motion = {
  kind: "launch",
  period: launchPeriod,
  height: launchHeight,
  role: "body",
};
const engineMotion: Motion = {
  kind: "launch",
  period: launchPeriod,
  height: launchHeight,
  role: "engine",
};

const buildPad = (builder: AttractionBuilder) => {
  const { z } = rocketAt;
  const blocks: [number, number][] = [
    [padBackZ, z - trenchHalf],
    [z + trenchHalf, padFrontZ],
  ];
  blocks.forEach(([from, to]) => {
    builder.box(
      "matte",
      concrete,
      [padHalfX * 2, padTop, to - from],
      [0, padTop / 2, (from + to) / 2],
    );
    builder.box(
      "matte",
      concreteDark,
      [padHalfX * 2 + 0.2, 0.12, to - from + 0.2],
      [0, 0.06, (from + to) / 2],
    );
  });
  builder.box(
    "matte",
    soot,
    [padHalfX * 2 + 2.4, 0.04, trenchHalf * 2],
    [0, 0.02, z],
  );
  const deflectorSteps = builder.isFar ? 2 : 6;
  for (let step = 0; step < deflectorSteps; step++) {
    const share = step / deflectorSteps;
    const width = (1 - share) * 2.4;
    builder.box(
      "metal",
      step % 2 === 0 ? "#55585c" : "#4a4d51",
      [width, padTop / deflectorSteps, trenchHalf * 2 - 0.04],
      [0, (padTop / deflectorSteps) * (step + 0.5), z],
    );
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      concreteDark,
      [1.2, 0.35, 0.25],
      [side * (padHalfX + 0.6), 0.18, z - trenchHalf - 0.12],
    );
    builder.box(
      "matte",
      concreteDark,
      [1.2, 0.35, 0.25],
      [side * (padHalfX + 0.6), 0.18, z + trenchHalf + 0.12],
    );
  });
  builder.cylinder("matte", soot, {
    radius: 1.6,
    length: 0.012,
    at: [0, padTop + 0.006, z],
    segments: builder.segments(24, 12),
  });
  builder.cylinder("metal", "#5d6166", {
    radius: 1.05,
    radiusEnd: 0.95,
    length: 0.16,
    at: [0, padTop + 0.08, z],
    segments: 20,
    isOpen: false,
  });
  for (let arm = 0; arm < 4; arm++) {
    const angle = (arm / 4) * Math.PI * 2 + Math.PI / 4;
    const out: Triple = [
      Math.sin(angle) * 0.85,
      padTop + 0.16,
      z + Math.cos(angle) * 0.85,
    ];
    builder.box(
      "metal",
      "#5d6166",
      [0.26, mountHeight, 0.26],
      [out[0], padTop + mountHeight / 2 + 0.08, out[2]],
      [0, angle, 0],
    );
    builder.box(
      "metal",
      silver,
      [0.22, 0.1, 0.36],
      [out[0] * 0.78, rocketBase + 0.08, z + (out[2] - z) * 0.78],
      [0, angle, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    const edgeZ = side > 0 ? padFrontZ : padBackZ;
    for (let post = 0; post <= 8; post++) {
      const x = -padHalfX + 0.1 + (post / 8) * (padHalfX * 2 - 0.2);
      builder.box(
        "paint",
        "#e8c234",
        [0.05, 0.5, 0.05],
        [x, padTop + 0.25, edgeZ - side * 0.08],
      );
    }
    builder.box(
      "paint",
      "#e8c234",
      [padHalfX * 2 - 0.2, 0.05, 0.05],
      [0, padTop + 0.48, edgeZ - side * 0.08],
    );
  });
  for (let stripe = 0; stripe < 7; stripe++) {
    builder.box(
      "paint",
      stripe % 2 === 0 ? "#e8c234" : palette.black,
      [0.6, 0.012, 0.18],
      [-padHalfX + 0.3 + stripe * 0.6, padTop + 0.006, padFrontZ - 0.25],
    );
  }
};

const buildTower = (builder: AttractionBuilder) => {
  const { x, z } = towerAt;
  const base = padTop;
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  corners.forEach(([sideX, sideZ]) => {
    builder.box(
      "paint",
      girder,
      [0.14, towerHeight, 0.14],
      [x + sideX * towerHalf, base + towerHeight / 2, z + sideZ * towerHalf],
    );
  });
  const bay = 1.3;
  const bays = Math.floor(towerHeight / bay);
  for (let level = 0; level <= bays; level++) {
    const y = base + Math.min(towerHeight, level * bay);
    builder.box(
      "paint",
      girderDark,
      [towerHalf * 2, 0.1, 0.1],
      [x, y, z - towerHalf],
    );
    builder.box(
      "paint",
      girderDark,
      [towerHalf * 2, 0.1, 0.1],
      [x, y, z + towerHalf],
    );
    builder.box(
      "paint",
      girderDark,
      [0.1, 0.1, towerHalf * 2],
      [x - towerHalf, y, z],
    );
    builder.box(
      "paint",
      girderDark,
      [0.1, 0.1, towerHalf * 2],
      [x + towerHalf, y, z],
    );
    if (level === bays) {
      continue;
    }
    const low = base + level * bay;
    const high = low + bay;
    const flip = level % 2 === 0 ? 1 : -1;
    const faces: [Triple, Triple][] = [
      [
        [x - towerHalf * flip, low, z + towerHalf],
        [x + towerHalf * flip, high, z + towerHalf],
      ],
      [
        [x - towerHalf * flip, low, z - towerHalf],
        [x + towerHalf * flip, high, z - towerHalf],
      ],
      [
        [x - towerHalf, low, z - towerHalf * flip],
        [x - towerHalf, high, z + towerHalf * flip],
      ],
      [
        [x + towerHalf, low, z - towerHalf * flip],
        [x + towerHalf, high, z + towerHalf * flip],
      ],
    ];
    faces.forEach(([from, to]) => {
      builder.bar("paint", girder, from, to, 0.07, 4);
    });
    if (!builder.isFar) {
      faces.forEach(([from, to]) => {
        const crossFrom: Triple = [
          from[0] === to[0] ? from[0] : to[0],
          low,
          from[2] === to[2] ? from[2] : to[2],
        ];
        const crossTo: Triple = [
          from[0] === to[0] ? from[0] : from[0],
          high,
          from[2] === to[2] ? from[2] : from[2],
        ];
        builder.bar("paint", girder, crossFrom, crossTo, 0.05, 4);
      });
    }
  }
  builder.cylinder("metal", silver, {
    radius: 0.05,
    radiusEnd: 0.02,
    length: 2.6,
    at: [x, base + towerHeight + 1.3, z],
    segments: 6,
  });
  builder.sphere(
    "glow",
    "#ff3b30",
    0.09,
    [x, base + towerHeight + 2.65, z],
    [1, 1, 1],
    8,
  );
  const levels = [3.9, 6.5, 8.6];
  levels.forEach((up, index) => {
    const y = base + up;
    builder.box(
      "metal",
      grating,
      [towerHalf * 2 + 0.7, 0.08, towerHalf * 2 + 0.7],
      [x, y, z],
    );
    if (!builder.isFar) {
      const rail = y + 0.5;
      builder.box(
        "paint",
        "#e8c234",
        [towerHalf * 2 + 0.7, 0.04, 0.04],
        [x, rail, z - towerHalf - 0.35],
      );
      builder.box(
        "paint",
        "#e8c234",
        [towerHalf * 2 + 0.7, 0.04, 0.04],
        [x, rail, z + towerHalf + 0.35],
      );
      builder.box(
        "paint",
        "#e8c234",
        [0.04, 0.04, towerHalf * 2 + 0.7],
        [x - towerHalf - 0.35, rail, z],
      );
    }
    const armFrom = x + towerHalf + 0.35;
    const armTo =
      rocketAt.x - rocketRadius - (index === levels.length - 1 ? 0.55 : 0.12);
    builder.box(
      "metal",
      grating,
      [armTo - armFrom, 0.1, 0.7],
      [(armFrom + armTo) / 2, y, z],
    );
    builder.box(
      "paint",
      girderDark,
      [armTo - armFrom, 0.12, 0.08],
      [(armFrom + armTo) / 2, y - 0.1, z - 0.35],
    );
    builder.box(
      "paint",
      girderDark,
      [armTo - armFrom, 0.12, 0.08],
      [(armFrom + armTo) / 2, y - 0.1, z + 0.35],
    );
    if (!builder.isFar) {
      [-0.33, 0.33].forEach((side) => {
        builder.box(
          "paint",
          "#e8c234",
          [armTo - armFrom, 0.04, 0.04],
          [(armFrom + armTo) / 2, y + 0.5, z + side],
        );
      });
    }
  });
  const roomY = base + levels[2];
  const roomX = rocketAt.x - rocketRadius - 0.3;
  builder.box("paint", rocketWhite, [0.6, 1.1, 0.9], [roomX, roomY + 0.6, z]);
  builder.box("paint", roofGrey, [0.66, 0.08, 0.96], [roomX, roomY + 1.18, z]);
  if (!builder.isFar) {
    builder.box(
      "glass",
      palette.glass,
      [0.02, 0.3, 0.4],
      [roomX - 0.31, roomY + 0.75, z],
    );
    builder.bar(
      "metal",
      pipe,
      [x + towerHalf, base + 0.4, z - 0.4],
      [x + towerHalf, base + levels[1] - 0.2, z - 0.4],
      0.09,
      8,
    );
    builder.bar(
      "metal",
      pipe,
      [x + towerHalf, base + levels[1] - 0.2, z - 0.4],
      [rocketAt.x - rocketRadius - 0.05, base + levels[1] - 0.2, z - 0.4],
      0.09,
      8,
    );
  }
};

const buildRocket = (builder: AttractionBuilder) => {
  const radius = rocketRadius;
  const segments = builder.segments(28, 14);
  const nozzleTop = 0.62;
  builder.lathe(
    "paint",
    rocketWhite,
    [
      [0, nozzleTop - 0.02],
      [radius * 0.82, nozzleTop],
      [radius, nozzleTop + 0.35],
      [radius, 5.6],
      [radius * 0.99, 5.62],
      [radius * 0.99, 8.3],
      [radius * 0.96, 8.85],
      [radius * 0.84, 9.35],
      [radius * 0.62, 9.85],
      [radius * 0.34, 10.3],
      [radius * 0.1, 10.6],
      [0, 10.66],
    ],
    [0, 0, 0],
    "y",
    segments,
  );
  const bands: [number, number, string][] = [
    [1.25, 0.32, bandBlack],
    [5.45, 0.4, bandBlack],
    [5.72, 0.08, silver],
    [8.32, 0.12, silver],
  ];
  bands.forEach(([up, height, colour]) => {
    builder.cylinder(colour === silver ? "metal" : "paint", colour, {
      radius: radius + 0.012,
      length: height,
      at: [0, up, 0],
      segments,
      isOpen: true,
    });
  });
  if (!builder.isFar) {
    for (let mark = 0; mark < 4; mark++) {
      const angle = (mark / 4) * Math.PI * 2;
      builder.box(
        "paint",
        bandBlack,
        [0.2, 0.2, 0.02],
        [
          Math.sin(angle) * (radius + 0.005),
          2.6 + (mark % 2) * 0.2,
          Math.cos(angle) * (radius + 0.005),
        ],
        [0, angle, 0],
      );
    }
    builder.box(
      "paint",
      "#2c4f9a",
      [0.04, 1.8, 0.02],
      [0.18, 3.6, radius + 0.004],
    );
    builder.box(
      "paint",
      "#c8102e",
      [0.04, 1.8, 0.02],
      [0.26, 3.6, radius - 0.002],
    );
  }
  const windowAt: Triple = [-(radius * 0.93), 9.05, 0];
  builder.cylinder("metal", silver, {
    radius: 0.17,
    length: 0.06,
    at: windowAt,
    axis: "x",
    segments: 16,
  });
  builder.cylinder("glass", "#3e6f9a", {
    radius: 0.12,
    length: 0.08,
    at: [windowAt[0] - 0.01, windowAt[1], windowAt[2]],
    axis: "x",
    segments: 16,
  });
  for (let fin = 0; fin < 4; fin++) {
    const angle = (fin / 4) * Math.PI * 2 + Math.PI / 4;
    const out = (distance: number, up: number): Triple => [
      Math.sin(angle) * distance,
      up,
      Math.cos(angle) * distance,
    ];
    builder.add("paint", bandBlack, finGeometry(), {
      at: out(radius - 0.02, 0),
      rotation: [0, angle - Math.PI / 2, 0],
    });
  }
  [-1, 1].forEach((side) => {
    const z = side * (radius + 0.3);
    builder.lathe(
      "paint",
      rocketWhite,
      [
        [0, 0.5],
        [0.24, 0.52],
        [0.3, 0.75],
        [0.3, 4.3],
        [0.26, 4.75],
        [0.14, 5.1],
        [0, 5.25],
      ],
      [0, 0, z],
      "y",
      builder.segments(16, 8),
    );
    builder.cylinder("paint", bandBlack, {
      radius: 0.31,
      length: 0.3,
      at: [0, 1.1, z],
      segments: builder.segments(16, 8),
      isOpen: true,
    });
    builder.cylinder("metal", silver, {
      radius: 0.31,
      length: 0.06,
      at: [0, 4.2, z],
      segments: builder.segments(16, 8),
      isOpen: true,
    });
    builder.lathe(
      "metal",
      "#4a4e54",
      [
        [0.1, 0.52],
        [0.2, 0.05],
        [0.22, 0],
        [0.08, 0.5],
      ],
      [0, 0, z],
      "y",
      builder.segments(12, 6),
    );
    builder.bar(
      "metal",
      silver,
      [0, 3.9, side * (radius - 0.02)],
      [0, 3.9, side * (radius + 0.06)],
      0.08,
      6,
    );
  });
  builder.lathe(
    "metal",
    "#4a4e54",
    [
      [0.15, nozzleTop],
      [0.17, nozzleTop - 0.12],
      [0.34, 0.05],
      [0.36, 0],
      [0.32, 0],
      [0.14, nozzleTop - 0.14],
    ],
    [0, 0, 0],
    "y",
    builder.segments(16, 8),
  );
};

const finGeometry = (): ExtrudeGeometry => {
  const shape = new Shape();
  shape.moveTo(0, 0.15);
  shape.lineTo(0.62, -0.05);
  shape.lineTo(0.66, 0.35);
  shape.lineTo(0, 2.2);
  shape.lineTo(0, 0.15);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSize: 0.015,
    bevelThickness: 0.015,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -0.025);
  return geometry;
};

const buildEngineFlame = (builder: AttractionBuilder) => {
  const segments = builder.segments(16, 8);
  builder.lathe(
    "glow",
    "#ff7a1c",
    [
      [0, -3.6],
      [0.3, -2.4],
      [0.42, -1.0],
      [0.33, -0.1],
      [0.2, 0.02],
      [0, 0.02],
    ],
    [0, 0, 0],
    "y",
    segments,
  );
  builder.lathe(
    "glow",
    "#ffe08a",
    [
      [0, -1.9],
      [0.2, -1.0],
      [0.24, -0.3],
      [0.17, 0.04],
      [0, 0.04],
    ],
    [0, 0.01, 0],
    "y",
    segments,
  );
  if (builder.isFar) {
    return;
  }
  builder.lathe(
    "glow",
    "#ffd2a0",
    [
      [0, -5.2],
      [0.5, -4.0],
      [0.62, -2.6],
      [0.5, -1.4],
      [0.42, -0.9],
      [0, -0.9],
    ],
    [0, 0, 0],
    "y",
    segments,
  );
};

const buildFlameHalo = (builder: AttractionBuilder) => {
  builder.sphere("glow", "#ff9a3c", 1.2, [0, -2.3, 0], [0.9, 2, 0.9], 14);
};

const addTank = (
  builder: AttractionBuilder,
  at: Triple,
  length: number,
  radius: number,
  colour: string,
) => {
  const [x, y, z] = at;
  builder.cylinder("paint", colour, {
    radius,
    length,
    at: [x, y, z],
    axis: "x",
    segments: 20,
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      colour,
      radius,
      [x + (side * length) / 2, y, z],
      [0.45, 1, 1],
      16,
    );
    builder.box(
      "matte",
      concreteDark,
      [0.3, y - radius * 0.4, radius * 1.5],
      [x + side * length * 0.32, (y - radius * 0.4) / 2, z],
    );
  });
  if (!builder.isFar) {
    [-0.2, 0.2].forEach((share) => {
      builder.cylinder("metal", silver, {
        radius: radius + 0.01,
        length: 0.07,
        at: [x + share * length, y, z],
        axis: "x",
        segments: 20,
        isOpen: true,
      });
    });
    builder.bar(
      "metal",
      pipe,
      [x, y + radius, z],
      [x, y + radius + 0.25, z],
      0.08,
      6,
    );
  }
};

const buildTanks = (builder: AttractionBuilder) => {
  addTank(builder, [6.1, 1.05, -4.6], 3.4, 0.75, tankWhite);
  addTank(builder, [6.1, 1.05, -2.6], 3.4, 0.75, shade(tankWhite, 0.96));
  const sphereAt: Triple = [-6.4, 2.2, -4.2];
  builder.sphere(
    "paint",
    tankWhite,
    1.3,
    sphereAt,
    [1, 1, 1],
    builder.segments(22, 12),
  );
  builder.cylinder("metal", silver, {
    radius: 1.31,
    length: 0.08,
    at: sphereAt,
    segments: builder.segments(22, 12),
    isOpen: true,
  });
  for (let leg = 0; leg < 6; leg++) {
    const angle = (leg / 6) * Math.PI * 2;
    builder.bar(
      "paint",
      girderDark,
      [
        sphereAt[0] + Math.sin(angle) * 1.25,
        sphereAt[1] - 0.2,
        sphereAt[2] + Math.cos(angle) * 1.25,
      ],
      [
        sphereAt[0] + Math.sin(angle) * 1.35,
        0,
        sphereAt[2] + Math.cos(angle) * 1.35,
      ],
      0.12,
      6,
    );
  }
  const pipeY = 0.25;
  const pipes: Triple[][] = [
    [
      [4.4, pipeY, -3.6],
      [padHalfX + 0.2, pipeY, -3.0],
    ],
    [
      [-5.2, pipeY, -3.8],
      [-padHalfX - 0.2, pipeY, -2.6],
    ],
  ];
  pipes.forEach(([from, to]) => {
    builder.bar("metal", pipe, from, to, 0.16, 8);
    builder.bar(
      "metal",
      pipe,
      [from[0], pipeY + 0.05, from[2] + 0.3],
      [to[0], pipeY + 0.05, to[2] + 0.3],
      0.12,
      8,
    );
  });
};

const addDish = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  turn: number,
) => {
  const [x, y, z] = at;
  builder.cylinder("metal", pipe, {
    radius: 0.06 * size,
    length: 0.5 * size,
    at: [x, y + 0.25 * size, z],
    segments: 8,
  });
  const tilt = 0.75;
  const centre: Triple = [x, y + 0.6 * size, z];
  builder.add(
    "paint",
    "#f2f2ee",
    new LatheGeometry(
      [
        [0, 0],
        [0.2, 0.02],
        [0.38, 0.08],
        [0.5, 0.17],
        [0.48, 0.18],
        [0, 0.03],
      ].map(([radius, height]) => new Vector2(radius * size, height * size)),
      builder.segments(18, 10),
    ),
    { at: centre, rotation: [tilt, turn, 0] },
  );
  const facing: Triple = [
    Math.sin(turn) * Math.sin(tilt),
    Math.cos(tilt),
    Math.cos(turn) * Math.sin(tilt),
  ];
  builder.bar(
    "metal",
    pipe,
    centre,
    [
      centre[0] + facing[0] * 0.42 * size,
      centre[1] + facing[1] * 0.42 * size,
      centre[2] + facing[2] * 0.42 * size,
    ],
    0.03 * size,
    5,
  );
};

const buildMissionControl = (builder: AttractionBuilder) => {
  const { x, z } = controlAt;
  const width = 3.4;
  const depth = 2.4;
  const height = 2.0;
  builder.box(
    "paint",
    buildingWhite,
    [width, height, depth],
    [x, height / 2, z],
  );
  builder.box(
    "matte",
    concreteDark,
    [width + 0.1, 0.2, depth + 0.1],
    [x, 0.1, z],
  );
  builder.box(
    "paint",
    roofGrey,
    [width + 0.3, 0.14, depth + 0.3],
    [x, height + 0.07, z],
  );
  builder.box(
    "paint",
    "#2c4f9a",
    [width + 0.02, 0.16, depth + 0.02],
    [x, height - 0.2, z],
  );
  [-1.05, 1.05].forEach((along) => {
    addWindow(builder, {
      at: [x + along, 1.15, z + depth / 2 + 0.01],
      width: 0.8,
      height: 0.55,
      frame: roofGrey,
      isLit: true,
    });
  });
  addWindow(builder, {
    at: [x - width / 2 - 0.01, 1.15, z],
    width: 1.2,
    height: 0.55,
    frame: roofGrey,
    turn: -Math.PI / 2,
  });
  builder.box(
    "glass",
    "#5d86a8",
    [0.6, 1.05, 0.04],
    [x, 0.53 + 0.2, z + depth / 2 + 0.01],
  );
  builder.box(
    "paint",
    roofGrey,
    [0.72, 0.08, 0.08],
    [x, 1.3, z + depth / 2 + 0.03],
  );
  addDish(builder, [x - 0.8, height + 0.14, z - 0.3], 1.6, -2.2);
  addDish(builder, [x + 1.1, height + 0.14, z + 0.4], 0.9, -2.6);
  builder.cylinder("metal", silver, {
    radius: 0.03,
    length: 1.6,
    at: [x + 1.4, height + 0.9, z - 0.8],
    segments: 6,
  });
  if (!builder.isFar) {
    [0.6, 1.0, 1.4].forEach((up) => {
      builder.box(
        "metal",
        silver,
        [0.4, 0.02, 0.02],
        [x + 1.4, height + 0.14 + up, z - 0.8],
      );
    });
  }
};

const floodlights = [
  { x: -4.6, z: 2.6 },
  { x: 4.2, z: -6.6 },
];

const addFloodlight = (
  builder: AttractionBuilder,
  { x, z }: { x: number; z: number },
) => {
  const height = 5.2;
  builder.box("matte", concreteDark, [0.5, 0.2, 0.5], [x, 0.1, z]);
  builder.cylinder("metal", steelGrey, {
    radius: 0.09,
    radiusEnd: 0.06,
    length: height,
    at: [x, height / 2, z],
    segments: 8,
  });
  const turn = Math.atan2(rocketAt.x - x, rocketAt.z - z);
  const across = (distance: number, up: number, out = 0): Triple => [
    x + Math.cos(turn) * distance + Math.sin(turn) * out,
    up,
    z - Math.sin(turn) * distance + Math.cos(turn) * out,
  ];
  builder.box("metal", steelGrey, [1.1, 0.06, 0.08], across(0, height + 0.05), [
    0,
    turn,
    0,
  ]);
  [-0.38, 0, 0.38].forEach((distance) => {
    [height + 0.28, height - 0.18].forEach((up) => {
      builder.add(
        "paint",
        "#2f3338",
        new BoxGeometry(0.32, 0.3, 0.16).rotateX(0.35),
        {
          at: across(distance, up),
          rotation: [0, turn, 0],
        },
      );
      builder.add(
        "glow",
        "#fff4d8",
        new BoxGeometry(0.26, 0.24, 0.02).translate(0, 0, 0.085).rotateX(0.35),
        {
          at: across(distance, up),
          rotation: [0, turn, 0],
        },
      );
    });
  });
};

const buildSite = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    "#9c998f",
    [2.2, 0.03, 6.4],
    [0, 0.015, padFrontZ + 3.4],
  );
  builder.box(
    "matte",
    "#9c998f",
    [controlAt.x - 0.6, 0.03, 1.4],
    [(controlAt.x + 1.1) / 2, 0.016, controlAt.z + 1.9],
  );
  builder.box("matte", concreteDark, [5.6, 0.03, 3.6], [6.1, 0.015, -3.6]);
  builder.cylinder("matte", concreteDark, {
    radius: 1.9,
    length: 0.03,
    at: [-6.4, 0.015, -4.2],
    segments: builder.segments(24, 12),
  });
  floodlights.forEach((at) => {
    addFloodlight(builder, at);
  });
  addSignBoard(builder, [-1.9, 0, 8.6], "#2c4f9a");
};

const padBlockers: LocalBlocker[] = [-2.4, -0.8, 0.8, 2.4].flatMap((x) =>
  [padBackZ + 1, rocketAt.z, padFrontZ - 0.9].map((z) => ({
    x,
    z,
    radius: 1.1,
  })),
);

export const rocketLaunchPadModel: AttractionModel = {
  kind: "rocket-launch-pad",
  name: "Rocket Launch Pad",
  fact: "A rocket's engines burn fuel and push hot gas down very fast. That push, called thrust, has to be stronger than gravity pulling the rocket down, so the rocket can climb away from the Earth and into space.",
  curriculumLink:
    "Science, Year 5: forces, and Earth and space. Gravity pulls things towards the Earth, and thrust pushes a rocket up.",
  footprint: 10.2,
  setting: "inland",
  signSpot: { x: -1.9, z: 9.3 },
  build: (builder) => {
    buildSite(builder);
    buildPad(builder);
    buildTower(builder);
    buildTanks(builder);
    buildMissionControl(builder);
  },
  moving: [
    {
      name: "rocket",
      pivot: rocketPivot,
      build: buildRocket,
      motion: bodyMotion,
    },
    {
      name: "rocket-flame",
      pivot: rocketPivot,
      build: buildEngineFlame,
      motion: engineMotion,
    },
    {
      name: "rocket-glow",
      pivot: rocketPivot,
      build: buildFlameHalo,
      motion: engineMotion,
      look: "halo",
    },
  ],
  blockers: [
    ...padBlockers,
    { x: towerAt.x - 0.6, z: towerAt.z, radius: 1.1 },
    { x: 6.1, z: -4.6, radius: 1.0 },
    { x: 4.8, z: -4.6, radius: 0.9 },
    { x: 7.4, z: -4.6, radius: 0.9 },
    { x: 6.1, z: -2.6, radius: 1.0 },
    { x: 4.8, z: -2.6, radius: 0.9 },
    { x: 7.4, z: -2.6, radius: 0.9 },
    { x: -6.4, z: -4.2, radius: 1.5 },
    { x: controlAt.x - 1, z: controlAt.z, radius: 1.3 },
    { x: controlAt.x + 1, z: controlAt.z, radius: 1.3 },
    ...floodlights.map(({ x, z }) => ({ x, z, radius: 0.35 })),
  ],
};
