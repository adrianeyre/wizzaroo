import {
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Vector2,
  type BufferGeometry,
} from "three";
import {
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const marsDust = "#b8653d";
const darkDust = "#8f4a2c";
const rockRed = "#9a4b30";
const habWhite = "#eef0f4";
const panelGrey = "#c9ced8";
const silver = "#c7ced9";
const darkMetal = "#3e4450";
const navy = "#26346e";
const glowCyan = "#62f0ff";
const glowViolet = "#b58cff";
const glowGreen = "#8dffb0";
const warning = "#f2b531";
const solarBlue = "#23306e";
const leafGreen = "#3f9a4c";

const habAt: LocalPoint = { x: 0, z: -0.9 };
const habRadius = 2.1;
const trackRadius = 3.75;
const greenhouseAt: LocalPoint = { x: -6.3, z: -1.6 };
const solarAt: LocalPoint = { x: 6.4, z: -1.8 };
const dishAt: LocalPoint = { x: 4.7, z: -6.6 };
const padAt: LocalPoint = { x: -4.6, z: -6.7 };
const padRadius = 1.9;
const padHeight = 0.24;
const signAt: LocalPoint = { x: -2.3, z: 8.5 };

const roverPivot: Triple = [habAt.x, 0, habAt.z];
const roverMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: trackRadius,
  count: 1,
  speed: 0.32,
  isFacingAlong: true,
};
const roverSeat = 0.98;
const rideStart: LocalPoint = { x: 1.1, z: habAt.z + trackRadius + 1.35 };
const rideFinish: LocalPoint = { x: -1.3, z: habAt.z + trackRadius + 1.45 };

const flatFaced = (geometry: BufferGeometry): BufferGeometry => {
  geometry.deleteAttribute("normal");
  return geometry;
};

/* The habitat: a geodesic dome with an airlock */

const buildHab = (builder: AttractionBuilder) => {
  builder.painted(
    flatFaced(new IcosahedronGeometry(habRadius, builder.isFar ? 1 : 2)),
    ({ x, y, z }, normal) => {
      if (y < 0.05) {
        return undefined;
      }
      if (normal.y > 0.97) {
        return { colour: silver, finish: "metal" };
      }
      if (y > 0.55 && y < 1.0 && Math.abs(x - habAt.x) > 0.5) {
        return { colour: "#9ff4ff", finish: "glow" };
      }
      const tile = Math.round(x * 3 + z * 5 + y * 7) % 3;
      return tile === 0 ? panelGrey : habWhite;
    },
    { at: [habAt.x, 0, habAt.z] },
    "paint",
    undefined,
  );
  builder.cylinder("matte", shade(marsDust, 0.75), {
    radius: habRadius + 0.15,
    radiusEnd: habRadius - 0.05,
    length: 0.22,
    at: [habAt.x, 0.11, habAt.z],
    segments: builder.segments(28, 12),
  });
  const tunnelFront = habAt.z + habRadius + 0.6;
  builder.cylinder("paint", habWhite, {
    radius: 0.62,
    length: 1.5,
    at: [habAt.x, 0.62, tunnelFront - 0.75],
    axis: "z",
    segments: builder.segments(16, 8),
  });
  builder.box(
    "paint",
    habWhite,
    [1.24, 0.62, 1.5],
    [habAt.x, 0.31, tunnelFront - 0.75],
  );
  builder.roundedBox("paint", panelGrey, [1.6, 1.7, 0.5], 0.12, [
    habAt.x,
    0.85,
    tunnelFront,
  ]);
  builder.box(
    "paint",
    darkMetal,
    [0.82, 1.25, 0.06],
    [habAt.x, 0.68, tunnelFront + 0.26],
  );
  builder.box(
    "glass",
    "#6fb7d8",
    [0.4, 0.3, 0.04],
    [habAt.x, 1.0, tunnelFront + 0.3],
  );
  builder.cylinder("glow", "#ff5a4a", {
    radius: 0.06,
    length: 0.1,
    at: [habAt.x + 0.62, 1.48, tunnelFront + 0.26],
    axis: "z",
    segments: 8,
  });
  builder.cylinder("glow", glowGreen, {
    radius: 0.06,
    length: 0.1,
    at: [habAt.x - 0.62, 1.48, tunnelFront + 0.26],
    axis: "z",
    segments: 8,
  });
  if (!builder.isFar) {
    for (let stripe = 0; stripe < 6; stripe++) {
      builder.box(
        "paint",
        stripe % 2 === 0 ? warning : palette.black,
        [0.27, 0.08, 0.02],
        [habAt.x - 0.67 + stripe * 0.27, 0.12, tunnelFront + 0.26],
      );
    }
    [-0.6, 0, 0.6].forEach((along) => {
      builder.torus(
        "metal",
        silver,
        0.63,
        0.03,
        [habAt.x, 0.62, tunnelFront - 0.75 + along],
        "z",
        16,
      );
    });
    builder.cylinder("metal", silver, {
      radius: 0.03,
      length: 1.3,
      at: [habAt.x + 0.9, habRadius + 0.5, habAt.z - 0.4],
      segments: 6,
    });
    builder.sphere(
      "glow",
      "#ff5a4a",
      0.06,
      [habAt.x + 0.9, habRadius + 1.18, habAt.z - 0.4],
      [1, 1, 1],
      6,
    );
  }
  builder.cylinder("metal", silver, {
    radius: 0.42,
    radiusEnd: 0.36,
    length: 0.2,
    at: [habAt.x, habRadius + 0.02, habAt.z],
    segments: 14,
  });
};

const buildBeacon = (builder: AttractionBuilder) => {
  builder.sphere("glow", glowCyan, 0.32, [0, 0, 0], [1, 1, 1], 12);
};

/* The greenhouse: a long glass tunnel full of growing food */

const buildGreenhouse = (builder: AttractionBuilder) => {
  const { x, z } = greenhouseAt;
  const length = 3.6;
  const radius = 1.15;
  builder.box(
    "matte",
    darkDust,
    [radius * 2 + 0.3, 0.12, length + 0.3],
    [x, 0.06, z],
  );
  builder.add(
    "glass",
    "#a6e6ff",
    new CylinderGeometry(
      radius,
      radius,
      length,
      builder.segments(18, 8),
      1,
      true,
      -Math.PI / 2,
      Math.PI,
    ).rotateX(Math.PI / 2),
    { at: [x, 0.12, z] },
  );
  const hoops = builder.isFar ? 2 : 5;
  for (let hoop = 0; hoop < hoops; hoop++) {
    const along = z - length / 2 + (hoop / (hoops - 1)) * length;
    builder.add(
      "metal",
      silver,
      new LatheGeometry(
        [new Vector2(radius + 0.04, -0.06), new Vector2(radius + 0.04, 0.06)],
        builder.segments(18, 8),
        -Math.PI / 2,
        Math.PI,
      ).rotateX(Math.PI / 2),
      { at: [x, 0.12, along] },
    );
  }
  [-1, 1].forEach((end) => {
    builder.add(
      "glass",
      "#a6e6ff",
      new CylinderGeometry(
        radius,
        radius,
        0.04,
        builder.segments(18, 8),
        1,
        false,
        -Math.PI / 2,
        Math.PI,
      ).rotateX(Math.PI / 2),
      { at: [x, 0.12, z + (end * length) / 2] },
    );
  });
  [-0.5, 0.5].forEach((across) => {
    builder.box(
      "matte",
      "#6b3f25",
      [0.55, 0.32, length - 0.4],
      [x + across, 0.28, z],
    );
    if (builder.isFar) {
      builder.box(
        "matte",
        leafGreen,
        [0.5, 0.3, length - 0.5],
        [x + across, 0.55, z],
      );
      return;
    }
    for (let plant = 0; plant < 6; plant++) {
      const along = z - length / 2 + 0.5 + plant * 0.52;
      builder.sphere(
        "matte",
        plant % 2 === 0 ? leafGreen : shade(leafGreen, 1.2),
        0.2,
        [x + across, 0.58, along],
        [1, 0.8, 1],
        7,
      );
      if (plant % 2 === 1) {
        builder.sphere(
          "paint",
          "#e8433a",
          0.06,
          [x + across + 0.1, 0.68, along + 0.08],
          [1, 1, 1],
          5,
        );
      }
    }
  });
  if (!builder.isFar) {
    builder.box(
      "glow",
      "#d58cff",
      [0.06, 0.04, length - 0.4],
      [x, radius - 0.05, z],
    );
  }
};

/* The solar panels, which tip towards you as you come near */

const buildSolarFrame = (builder: AttractionBuilder) => {
  const { x, z } = solarAt;
  builder.box("matte", darkDust, [3.4, 0.08, 3.2], [x, 0.04, z]);
  [-1, 1].forEach((side) => {
    builder.cylinder("metal", silver, {
      radius: 0.07,
      length: 1.3,
      at: [x + side * 1.2, 0.65, z],
      segments: 8,
    });
    builder.box("metal", darkMetal, [0.3, 0.1, 0.3], [x + side * 1.2, 0.05, z]);
  });
  builder.box("metal", darkMetal, [0.4, 0.5, 0.3], [x, 0.25, z + 1.3]);
  if (!builder.isFar) {
    builder.box(
      "glow",
      glowGreen,
      [0.08, 0.08, 0.02],
      [x - 0.1, 0.4, z + 1.46],
    );
    builder.box("glow", warning, [0.08, 0.08, 0.02], [x + 0.1, 0.4, z + 1.46]);
    builder.bar(
      "metal",
      palette.black,
      [x, 0.1, z + 1.3],
      [habAt.x + 2.4, 0.06, habAt.z + 0.8],
      0.05,
      4,
    );
  }
};

const buildSolarPanels = (builder: AttractionBuilder) => {
  builder.cylinder("metal", silver, {
    radius: 0.06,
    length: 3.0,
    at: [0, 0, 0],
    axis: "x",
    segments: 8,
  });
  [-1, 1].forEach((side) => {
    builder.box("metal", silver, [2.9, 0.06, 1.25], [0, 0.02, side * 0.68]);
    builder.box("paint", solarBlue, [2.8, 0.03, 1.15], [0, 0.065, side * 0.68]);
    if (builder.isFar) {
      return;
    }
    for (let line = 1; line < 6; line++) {
      builder.box(
        "metal",
        "#8fa0d8",
        [0.015, 0.012, 1.12],
        [-1.4 + line * (2.8 / 6), 0.085, side * 0.68],
      );
    }
    builder.box(
      "metal",
      "#8fa0d8",
      [2.78, 0.012, 0.015],
      [0, 0.085, side * 0.68],
    );
  });
};

/* The dish that talks to Earth */

const buildDishMast = (builder: AttractionBuilder) => {
  const { x, z } = dishAt;
  builder.box("matte", darkDust, [1.6, 0.12, 1.6], [x, 0.06, z]);
  builder.cylinder("metal", silver, {
    radius: 0.16,
    radiusEnd: 0.12,
    length: 2.2,
    at: [x, 1.1, z],
    segments: 10,
  });
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      darkMetal,
      [x + Math.sin(angle) * 0.75, 0.05, z + Math.cos(angle) * 0.75],
      [x, 1.3, z],
      0.07,
      6,
    );
  }
  builder.box("paint", habWhite, [0.8, 0.9, 0.6], [x + 0.7, 0.45, z + 0.45]);
  if (!builder.isFar) {
    builder.box("glow", glowCyan, [0.4, 0.15, 0.02], [x + 0.7, 0.6, z + 0.76]);
  }
};

const buildDish = (builder: AttractionBuilder) => {
  builder.cylinder("metal", darkMetal, {
    radius: 0.2,
    length: 0.3,
    at: [0, 0.15, 0],
    segments: 10,
  });
  builder.add(
    "paint",
    habWhite,
    new LatheGeometry(
      [
        [0.001, 0],
        [0.4, 0.04],
        [0.8, 0.18],
        [1.0, 0.32],
        [0.97, 0.34],
        [0.001, 0.05],
      ].map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(20, 10),
    ),
    { at: [0, 0.5, 0], rotation: [0.8, 0, 0] },
  );
  builder.bar("metal", silver, [0, 0.55, 0], [0, 1.15, 0.5], 0.04, 5);
  builder.sphere("glow", glowViolet, 0.08, [0, 1.17, 0.52], [1, 1, 1], 8);
};

/* The landing pad, with the ship that brought the crew */

const padDeck: Deck = ({ x, z }) =>
  Math.hypot(x - padAt.x, z - padAt.z) <= padRadius
    ? { height: padHeight, kind: "bridge" }
    : undefined;

const buildLandingPad = (builder: AttractionBuilder) => {
  const { x, z } = padAt;
  builder.cylinder("matte", "#8b8f98", {
    radius: padRadius,
    radiusEnd: padRadius + 0.1,
    length: padHeight,
    at: [x, padHeight / 2, z],
    segments: 6,
  });
  if (!builder.isFar) {
    builder.torus(
      "paint",
      warning,
      padRadius - 0.35,
      0.05,
      [x, padHeight + 0.005, z],
      "y",
      6,
    );
    for (let light = 0; light < 6; light++) {
      const angle = (light / 6) * Math.PI * 2 + Math.PI / 6;
      builder.sphere(
        "glow",
        light % 2 === 0 ? glowCyan : glowViolet,
        0.06,
        [
          x + Math.sin(angle) * (padRadius - 0.12),
          padHeight + 0.03,
          z + Math.cos(angle) * (padRadius - 0.12),
        ],
        [1, 0.6, 1],
        6,
      );
    }
  }
  const shipZ = z - 0.75;
  builder.lathe(
    "paint",
    habWhite,
    [
      [0.001, 0.7],
      [0.42, 0.7],
      [0.52, 1.0],
      [0.52, 2.5],
      [0.4, 3.0],
      [0.18, 3.35],
      [0.001, 3.45],
    ],
    [x, padHeight, shipZ],
    "y",
    builder.segments(18, 9),
  );
  builder.cylinder("paint", navy, {
    radius: 0.525,
    length: 0.3,
    at: [x, padHeight + 1.6, shipZ],
    segments: builder.segments(18, 9),
    isOpen: true,
  });
  builder.lathe(
    "metal",
    darkMetal,
    [
      [0.18, 0.72],
      [0.34, 0.42],
      [0.3, 0.42],
      [0.12, 0.72],
    ],
    [x, padHeight, shipZ],
    "y",
    12,
  );
  for (let leg = 0; leg < 4; leg++) {
    const angle = (leg / 4) * Math.PI * 2 + Math.PI / 4;
    const foot: Triple = [
      x + Math.sin(angle) * 0.95,
      padHeight + 0.05,
      shipZ + Math.cos(angle) * 0.95,
    ];
    builder.bar(
      "metal",
      silver,
      [
        x + Math.sin(angle) * 0.45,
        padHeight + 1.2,
        shipZ + Math.cos(angle) * 0.45,
      ],
      foot,
      0.07,
      6,
    );
    builder.cylinder("metal", darkMetal, {
      radius: 0.14,
      length: 0.06,
      at: foot,
      segments: 8,
    });
  }
  builder.cylinder("glass", "#3e6f9a", {
    radius: 0.14,
    length: 0.06,
    at: [x, padHeight + 2.65, shipZ + 0.47],
    axis: "z",
    segments: 12,
  });
};

/* Rocks, crates and tanks round the base */

const rocks: [number, number, number][] = [
  [8.2, 3.6, 0.5],
  [-8.4, 3.2, 0.6],
  [-7.6, -5.4, 0.45],
  [2.6, -8.6, 0.55],
  [8.6, -4.6, 0.4],
  [-3.6, 6.9, 0.35],
  [4.4, 7.4, 0.45],
  [-8.9, -1.2, 0.3],
];

const buildRocks = (builder: AttractionBuilder) => {
  rocks.forEach(([x, z, size], index) => {
    builder.add(
      "matte",
      index % 2 === 0 ? rockRed : shade(rockRed, 0.82),
      flatFaced(new DodecahedronGeometry(size, 0)),
      {
        at: [x, size * 0.45, z],
        rotation: [index * 0.7, index * 1.3, 0],
        scale: [1.2, 0.75, 1],
      },
      undefined,
    );
  });
  if (builder.isFar) {
    return;
  }
  for (let pebble = 0; pebble < 18; pebble++) {
    const angle = pebble * 2.399963;
    const distance = 5.2 + (pebble % 5) * 0.8;
    builder.add(
      "matte",
      shade(rockRed, 0.9 + (pebble % 3) * 0.08),
      flatFaced(new DodecahedronGeometry(0.12 + (pebble % 3) * 0.04, 0)),
      {
        at: [Math.sin(angle) * distance, 0.04, Math.cos(angle) * distance],
        rotation: [pebble, pebble * 0.5, 0],
      },
      undefined,
    );
  }
};

const buildStores = (builder: AttractionBuilder) => {
  const tankAt: LocalPoint = { x: 6.4, z: 3.1 };
  [-0.55, 0.55].forEach((along) => {
    builder.cylinder("paint", habWhite, {
      radius: 0.45,
      length: 1.6,
      at: [tankAt.x, 0.8, tankAt.z + along],
      segments: builder.segments(14, 8),
    });
    builder.sphere(
      "paint",
      habWhite,
      0.45,
      [tankAt.x, 1.6, tankAt.z + along],
      [1, 0.5, 1],
      12,
    );
    builder.cylinder("paint", along < 0 ? glowCyan : warning, {
      radius: 0.46,
      length: 0.14,
      at: [tankAt.x, 1.1, tankAt.z + along],
      segments: builder.segments(14, 8),
      isOpen: true,
    });
  });
  const crates: [number, number, number, number][] = [
    [-6.4, 3.2, 0, 0.7],
    [-5.6, 3.6, 0.4, 0.55],
    [-6.2, 3.3, 0, 0.5],
  ];
  crates.forEach(([x, z, turn, size], index) => {
    const y = index === 2 ? 0.7 + size / 2 : size / 2;
    builder.box(
      "paint",
      index === 1 ? "#d6d9e0" : "#e6e1d6",
      [size, size, size],
      [x, y, z],
      [0, turn, 0],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        navy,
        [size + 0.01, 0.08, size + 0.01],
        [x, y + size * 0.25, z],
        [0, turn, 0],
      );
    }
  });
};

/* The track the rover drives round, and its charging bay */

const buildTrack = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    darkDust,
    new LatheGeometry(
      [
        new Vector2(trackRadius + 0.7, 0.012),
        new Vector2(trackRadius - 0.7, 0.012),
      ],
      builder.segments(48, 20),
    ),
    { at: [habAt.x, 0, habAt.z] },
  );
  if (builder.isFar) {
    return;
  }
  [-0.38, 0.38].forEach((offset) => {
    builder.add(
      "matte",
      shade(darkDust, 0.8),
      new LatheGeometry(
        [
          new Vector2(trackRadius + offset + 0.09, 0.02),
          new Vector2(trackRadius + offset - 0.09, 0.02),
        ],
        48,
      ),
      { at: [habAt.x, 0, habAt.z] },
    );
  });
  for (let marker = 0; marker < 8; marker++) {
    const angle = (marker / 8) * Math.PI * 2 + Math.PI / 8;
    const out = trackRadius + 0.95;
    const at: Triple = [
      habAt.x + Math.sin(angle) * out,
      0,
      habAt.z + Math.cos(angle) * out,
    ];
    builder.cylinder("paint", warning, {
      radius: 0.05,
      length: 0.5,
      at: [at[0], 0.25, at[2]],
      segments: 6,
    });
    builder.sphere(
      "glow",
      marker % 2 === 0 ? glowCyan : glowViolet,
      0.07,
      [at[0], 0.55, at[2]],
      [1, 1, 1],
      6,
    );
  }
  builder.box(
    "matte",
    "#8b8f98",
    [2.4, 0.04, 1.1],
    [0, 0.02, rideStart.z + 0.15],
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    shade(marsDust, 1.08),
    [1.8, 0.03, 4.4],
    [-0.8, 0.015, 6.6],
  );
  buildTrack(builder);
  buildHab(builder);
  buildGreenhouse(builder);
  buildSolarFrame(builder);
  buildDishMast(builder);
  buildLandingPad(builder);
  buildStores(builder);
  buildRocks(builder);
  addSignBoard(builder, [signAt.x, 0, signAt.z], navy);
};

/* The rover, which drives round the base: front towards local -z */

const buildRover = (builder: AttractionBuilder) => {
  const wheels: [number, number][] = [
    [-0.62, -0.62],
    [0.62, -0.62],
    [-0.66, 0],
    [0.66, 0],
    [-0.62, 0.62],
    [0.62, 0.62],
  ];
  wheels.forEach(([x, z]) => {
    builder.cylinder("matte", "#2a2c31", {
      radius: 0.22,
      length: 0.18,
      at: [x, 0.22, z],
      axis: "x",
      segments: builder.segments(12, 6),
    });
    builder.cylinder("metal", silver, {
      radius: 0.12,
      length: 0.2,
      at: [x, 0.22, z],
      axis: "x",
      segments: 8,
    });
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      silver,
      [side * 0.55, 0.22, -0.62],
      [side * 0.5, 0.5, -0.1],
      0.06,
      5,
    );
    builder.bar(
      "metal",
      silver,
      [side * 0.55, 0.22, 0.62],
      [side * 0.5, 0.5, -0.1],
      0.06,
      5,
    );
  });
  builder.roundedBox("paint", habWhite, [0.92, 0.32, 1.5], 0.06, [0, 0.62, 0]);
  builder.box("paint", navy, [0.94, 0.06, 1.52], [0, 0.55, 0]);
  builder.box("paint", solarBlue, [1.1, 0.04, 0.7], [0, 0.82, 0.45]);
  builder.box("metal", silver, [1.14, 0.03, 0.74], [0, 0.8, 0.45]);
  builder.box("paint", panelGrey, [0.5, 0.08, 0.5], [0, 0.82, -0.15]);
  builder.cylinder("metal", silver, {
    radius: 0.04,
    length: 0.8,
    at: [0.3, 1.2, -0.6],
    segments: 6,
  });
  builder.box("paint", habWhite, [0.32, 0.18, 0.2], [0.3, 1.66, -0.6]);
  builder.box("glow", glowCyan, [0.22, 0.08, 0.02], [0.3, 1.66, -0.71]);
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", silver, {
    radius: 0.015,
    length: 0.9,
    at: [-0.35, 1.25, 0.65],
    segments: 4,
  });
  builder.sphere("glow", "#ff5a4a", 0.04, [-0.35, 1.72, 0.65], [1, 1, 1], 6);
  [-0.3, 0.3].forEach((x) => {
    builder.box("glow", "#fff4d8", [0.16, 0.08, 0.02], [x, 0.66, -0.76]);
  });
  builder.bar("metal", silver, [-0.4, 0.78, -0.3], [-0.6, 1.0, -0.85], 0.04, 4);
  builder.sphere("metal", darkMetal, 0.06, [-0.6, 1.0, -0.85], [1, 1, 1], 6);
};

/* The crew, in spacesuits, out for a walk */

const buildAstronaut = (builder: AttractionBuilder) => {
  const suit = habWhite;
  [-0.09, 0.09].forEach((x) => {
    builder.cylinder("paint", suit, {
      radius: 0.07,
      length: 0.42,
      at: [x, 0.21, 0],
      segments: 6,
    });
    builder.box("paint", darkMetal, [0.12, 0.07, 0.18], [x, 0.035, 0.03]);
  });
  builder.cylinder("paint", suit, {
    radius: 0.17,
    radiusEnd: 0.19,
    length: 0.44,
    at: [0, 0.63, 0],
    segments: builder.segments(10, 6),
  });
  builder.box("paint", panelGrey, [0.3, 0.38, 0.14], [0, 0.66, -0.18]);
  builder.box("glow", glowCyan, [0.1, 0.06, 0.02], [0.06, 0.7, 0.125]);
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      suit,
      [side * 0.2, 0.78, 0],
      [side * 0.24, 0.48, 0.05],
      0.09,
      5,
    );
  });
  builder.sphere("paint", suit, 0.17, [0, 1.0, 0], [1, 1, 1], 10);
  builder.sphere("glass", "#e0a43a", 0.13, [0, 1.0, 0.07], [1, 0.85, 0.8], 8);
};

/* A ride on the rover */

const roverRide = (progress: number, clockSeconds: number): LocalSpot => {
  const pose = findMotionPose(roverMotion, clockSeconds, { copy: 0 });
  const [x, y, z] = moveWithPose(
    roverPivot,
    [roverPivot[0], roverPivot[1] + roverSeat, roverPivot[2] + 0.1],
    pose,
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? rideStart : rideFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1] + Math.PI,
  };
};

export const marsBaseModel: NewLandAttractionModel = {
  kind: "mars-base",
  islandId: "starfall-isle",
  name: "Mars Base",
  fact: "Mars is the fourth planet from the Sun. It looks red because its dusty ground is full of iron oxide, which is rust. A day on Mars lasts only about 40 minutes longer than a day on Earth, but Mars is further from the Sun, so it takes 687 Earth days to travel all the way round it.",
  curriculumLink:
    "Science, Year 5: Earth and space. Describe the movement of the Earth and other planets relative to the Sun in the solar system.",
  footprint: 10,
  setting: "inland",
  padColour: marsDust,
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: buildGrounds,
  moving: [
    {
      name: "mars-rover",
      pivot: roverPivot,
      build: buildRover,
      motion: roverMotion,
    },
    {
      name: "solar-panels",
      pivot: [solarAt.x, 1.32, solarAt.z],
      build: buildSolarPanels,
      motion: { kind: "nod", axis: "x", reach: 7, amplitude: 0.45, period: 4 },
    },
    {
      name: "dish",
      pivot: [dishAt.x, 2.2, dishAt.z],
      build: buildDish,
      motion: { kind: "whirl", axis: "y", idle: 0.15, speed: 1.6, reach: 8 },
    },
    {
      name: "hab-beacon",
      pivot: [habAt.x, habRadius + 0.25, habAt.z],
      build: buildBeacon,
      motion: { kind: "wake", reach: 8 },
    },
  ],
  wanderers: [
    {
      name: "astronauts",
      build: buildAstronaut,
      count: 3,
      centre: { x: 2.6, z: 6.4 },
      radius: 1.8,
      speed: 0.45,
      bob: 0.05,
    },
  ],
  blockers: [
    { x: habAt.x, z: habAt.z, radius: habRadius - 0.1 },
    { x: greenhouseAt.x, z: greenhouseAt.z - 1, radius: 1.1 },
    { x: greenhouseAt.x, z: greenhouseAt.z + 1, radius: 1.1 },
    { x: dishAt.x, z: dishAt.z, radius: 0.8 },
    { x: 6.4, z: 3.1, radius: 0.9 },
    { x: padAt.x, z: padAt.z - 0.75, radius: 0.6 },
  ] satisfies LocalBlocker[],
  decks: [padDeck],
  rides: [
    {
      id: "mars-rover",
      name: "the Mars rover",
      start: rideStart,
      reach: 0.6,
      seconds: 22,
      finish: rideFinish,
      follow: roverRide,
    },
  ],
  play: {
    label: "Call Mission Control",
    news: "Beep beep! Your message zipped across space to Earth. Mars can be so far away that a message takes up to 20 minutes to get there!",
  },
};
