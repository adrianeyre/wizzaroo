import { CylinderGeometry, ExtrudeGeometry, RingGeometry, Shape } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type PlayRide,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

/*
 * A full-size Apollo lunar module standing on a patch of grey Moon
 * dust: the gold-foil descent stage on its four spidery legs, and the
 * silver, many-sided ascent stage on top where two astronauts lived.
 * The Character climbs the ladder to the porch, crawls through the
 * hatch and pops out of the docking hatch on top. Astronauts bounce
 * about, the radar dish spins round as you come near, and the Earth
 * rises over the Moon's horizon behind.
 */

const regolith = "#9a98a2";
const regolithDark = "#76747e";
const bootPrint = "#5e5c66";
const foilGold = "#d9a62e";
const foilDark = "#a87a1c";
const foilBlack = "#2a2a30";
const cabinSilver = "#b8bec8";
const cabinGrey = "#8a909a";
const frameSilver = "#d4d9e2";
const windowGlass = "#2a3a6a";
const thrusterDark = "#3a3d44";
const signColour = "#1f2d5c";
const glowCyan = "#7ff3ff";

const footprint = 9;

const landerZ = -0.6;
const descentBottom = 1.2;
const descentTop = 2.5;
const descentRadius = 1.6;
const legReach = 3.3;
const cabinBottom = descentTop;
const cabinTop = 4.6;

/** A turned shape about the lander's middle, x and z out from it. */
const at = (x: number, y: number, z: number): Triple => [x, y, landerZ + z];

/* The descent stage */

const buildDescentStage = (builder: AttractionBuilder) => {
  builder.add(
    "paint",
    foilGold,
    new CylinderGeometry(
      descentRadius,
      descentRadius,
      descentTop - descentBottom,
      8,
      1,
    ),
    {
      at: at(0, (descentBottom + descentTop) / 2, 0),
      rotation: [0, Math.PI / 8, 0],
    },
  );
  /* Black foil on the top deck, and a dark band round the bottom */
  builder.add(
    "matte",
    foilBlack,
    new CylinderGeometry(descentRadius + 0.02, descentRadius + 0.02, 0.1, 8, 1),
    { at: at(0, descentTop - 0.04, 0), rotation: [0, Math.PI / 8, 0] },
  );
  /* The descent engine's bell underneath */
  builder.lathe(
    "metal",
    thrusterDark,
    [
      [0.25, 0.02],
      [0.55, -0.35],
      [0.7, -0.75],
    ],
    at(0, descentBottom + 0.02, 0),
    "y",
    builder.segments(16, 8),
  );
  /* Four legs, each with a footpad, a strut and braces */
  [0, 1, 2, 3].forEach((leg) => {
    const angle = (leg / 4) * Math.PI * 2;
    const out = (reach: number, y: number): Triple =>
      at(Math.sin(angle) * reach, y, Math.cos(angle) * reach);
    builder.bar(
      "metal",
      frameSilver,
      out(descentRadius - 0.1, descentTop - 0.25),
      out(legReach, 0.4),
      0.16,
      8,
    );
    builder.bar(
      "metal",
      foilGold,
      out(legReach - 0.05, 0.6),
      out(legReach, 0.1),
      0.12,
      8,
    );
    builder.cylinder("metal", frameSilver, {
      radius: 0.42,
      radiusEnd: 0.3,
      length: 0.14,
      at: out(legReach, 0.07),
      segments: 14,
    });
    [-1, 1].forEach((side) => {
      const sideAngle = angle + side * 0.42;
      builder.bar(
        "metal",
        frameSilver,
        at(
          Math.sin(sideAngle) * (descentRadius - 0.05),
          descentBottom + 0.1,
          Math.cos(sideAngle) * (descentRadius - 0.05),
        ),
        out(legReach * 0.72, 0.9),
        0.07,
        6,
      );
    });
    /* Contact probes under three of the pads, but not under the ladder */
    if (leg !== 0 && !builder.isFar) {
      builder.bar(
        "metal",
        frameSilver,
        out(legReach, 0.1),
        out(legReach + 0.5, 0.02),
        0.03,
        4,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Crinkly foil panels in two shades round the sides */
  for (let panel = 0; panel < 8; panel++) {
    const angle = (panel / 8) * Math.PI * 2;
    const reach = descentRadius * Math.cos(Math.PI / 8) + 0.015;
    [0.33, 0.67].forEach((share, row) => {
      builder.box(
        "paint",
        (panel + row) % 2 === 0 ? foilDark : shade(foilGold, 1.12),
        [0.5, 0.42, 0.02],
        at(
          Math.sin(angle) * reach + Math.cos(angle) * (row === 0 ? -0.2 : 0.25),
          descentBottom + (descentTop - descentBottom) * share,
          Math.cos(angle) * reach - Math.sin(angle) * (row === 0 ? -0.2 : 0.25),
        ),
        [0, angle, 0],
      );
    });
  }
  /* The plaque on the ladder leg */
  builder.box(
    "metal",
    "#eceef2",
    [0.4, 0.26, 0.02],
    at(0, 1.65, descentRadius + 0.32),
    [-0.5, 0, 0],
  );
};

/* The porch and ladder down the front leg */

const ladderTop = at(0, descentTop - 0.05, descentRadius + 0.15);
const ladderFoot = at(0, 0.15, legReach - 0.2);

const buildLadder = (builder: AttractionBuilder) => {
  builder.box(
    "metal",
    frameSilver,
    [0.95, 0.06, 0.6],
    [ladderTop[0], ladderTop[1], ladderTop[2] + 0.1],
  );
  [-0.42, 0.42].forEach((side) => {
    builder.bar(
      "metal",
      frameSilver,
      [side, ladderTop[1], ladderTop[2] + 0.38],
      [side, ladderTop[1] + 0.55, ladderTop[2] + 0.38],
      0.035,
      5,
    );
  });
  builder.bar(
    "metal",
    frameSilver,
    [-0.42, ladderTop[1] + 0.55, ladderTop[2] + 0.38],
    [0.42, ladderTop[1] + 0.55, ladderTop[2] + 0.38],
    0.035,
    5,
  );
  [-0.22, 0.22].forEach((side) => {
    builder.bar(
      "metal",
      frameSilver,
      [side, ladderTop[1], ladderTop[2] + 0.35],
      [side, ladderFoot[1], ladderFoot[2]],
      0.045,
      5,
    );
  });
  const rungs = builder.isFar ? 3 : 9;
  for (let rung = 1; rung <= rungs; rung++) {
    const share = rung / (rungs + 1);
    builder.box(
      "metal",
      frameSilver,
      [0.44, 0.035, 0.05],
      [
        0,
        ladderTop[1] + (ladderFoot[1] - ladderTop[1]) * share,
        ladderTop[2] + 0.35 + (ladderFoot[2] - ladderTop[2] - 0.35) * share,
      ],
    );
  }
};

/* The ascent stage, where the two astronauts lived */

const triangleWindow = (
  builder: AttractionBuilder,
  side: number,
  y: number,
  z: number,
) => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(side * 0.5, 0);
  shape.lineTo(side * 0.05, 0.5);
  shape.lineTo(0, 0);
  builder.add(
    "glass",
    windowGlass,
    new ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }),
    { at: [side * 0.12, y, z], rotation: [-0.35, side * 0.25, 0] },
  );
};

const buildAscentStage = (builder: AttractionBuilder) => {
  /* The front cabin, its face angled back, and the hatch below the windows */
  builder.box(
    "paint",
    cabinSilver,
    [1.9, 1.3, 1.3],
    at(0, cabinBottom + 0.95, 0.35),
  );
  builder.box(
    "paint",
    cabinSilver,
    [1.9, 0.9, 0.4],
    at(0, cabinBottom + 1.25, 1.05),
    [-0.35, 0, 0],
  );
  builder.box(
    "paint",
    cabinGrey,
    [1.95, 0.32, 0.5],
    at(0, cabinBottom + 0.16, 0.6),
  );
  /* The rear: the equipment bay, and the round fuel tanks bulging out each side */
  builder.box(
    "paint",
    cabinGrey,
    [1.6, 1.4, 1.2],
    at(0, cabinBottom + 1.0, -0.7),
  );
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", cabinSilver, {
      radius: 0.48,
      length: 1.1,
      at: at(side * 1.0, cabinBottom + 0.95, -0.25),
      axis: "z",
      segments: 14,
    });
    builder.sphere(
      "paint",
      foilGold,
      0.42,
      at(side * 0.95, cabinBottom + 0.55, -1.05),
      [1, 1, 1],
      12,
    );
  });
  builder.box(
    "paint",
    foilBlack,
    [1.4, 0.5, 0.5],
    at(0, cabinBottom + 0.55, -1.35),
  );
  /* The docking tunnel on top, with its hatch */
  builder.cylinder("metal", frameSilver, {
    radius: 0.46,
    length: 0.42,
    at: at(0, cabinTop + 0.05, 0.25),
    segments: 16,
  });
  builder.torus(
    "metal",
    cabinGrey,
    0.46,
    0.05,
    at(0, cabinTop + 0.26, 0.25),
    "y",
    16,
  );
  /* The square front hatch the astronauts crawled out of */
  builder.box(
    "paint",
    cabinGrey,
    [0.72, 0.72, 0.05],
    at(0, cabinBottom + 0.55, 1.02),
  );
  builder.box(
    "matte",
    "#1a1c22",
    [0.56, 0.56, 0.04],
    at(0, cabinBottom + 0.55, 1.04),
  );
  triangleWindow(builder, -1, cabinBottom + 1.15, landerZ + 1.12);
  triangleWindow(builder, 1, cabinBottom + 1.15, landerZ + 1.12);
  /* Four quads of little rocket thrusters for steering */
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const quad = at(sx * 1.15, cabinBottom + 1.2, sz * 0.85 - 0.2);
    builder.box("paint", foilGold, [0.24, 0.24, 0.24], quad);
    if (builder.isFar) {
      return;
    }
    const nozzles: Triple[] = [
      [sx * 0.2, 0, 0],
      [0, 0.2, 0],
      [0, -0.2, 0],
      [0, 0, sz * 0.2],
    ];
    nozzles.forEach(([dx, dy, dz]) => {
      const axis = dy !== 0 ? "y" : dx !== 0 ? "x" : "z";
      builder.cylinder("metal", thrusterDark, {
        radius: 0.05,
        radiusEnd: 0.08,
        length: 0.14,
        at: [quad[0] + dx, quad[1] + dy, quad[2] + dz],
        axis,
        segments: 8,
      });
    });
  });
  /* The steerable S-band dish on its boom, and two thin VHF aerials */
  builder.bar(
    "metal",
    frameSilver,
    at(0.7, cabinTop - 0.1, -0.6),
    at(1.15, cabinTop + 0.55, -0.85),
    0.06,
    6,
  );
  builder.add(
    "metal",
    "#eef0f4",
    new CylinderGeometry(
      0.42,
      0.06,
      0.18,
      builder.segments(16, 8),
      1,
      false,
    ).rotateX(-0.7),
    { at: at(1.2, cabinTop + 0.75, -0.95) },
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      frameSilver,
      at(side * 0.75, cabinTop - 0.2, -1.2),
      at(side * 1.05, cabinTop + 0.7, -1.5),
      0.025,
      4,
    );
  });
  /* Panel seams over the cabin */
  [-0.4, 0.4].forEach((dx) => {
    builder.box(
      "paint",
      shade(cabinSilver, 0.85),
      [0.02, 1.25, 1.32],
      at(dx, cabinBottom + 0.95, 0.35),
    );
  });
  builder.box(
    "paint",
    shade(cabinGrey, 0.85),
    [1.62, 0.02, 1.22],
    at(0, cabinBottom + 1.3, -0.7),
  );
  /* Handrails beside the hatch, gold foil on the rear bulkhead */
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      frameSilver,
      at(side * 0.5, cabinBottom + 0.25, 1.06),
      at(side * 0.5, cabinBottom + 0.9, 1.06),
      0.03,
      4,
    );
    builder.box(
      "paint",
      shade(foilGold, side > 0 ? 1.08 : 0.9),
      [0.7, 0.6, 0.02],
      at(side * 0.4, cabinBottom + 1.15, -1.31),
    );
    builder.box(
      "matte",
      foilBlack,
      [0.02, 0.5, 0.6],
      at(side * 0.81, cabinBottom + 1.25, -0.7),
    );
  });
  builder.cylinder("metal", frameSilver, {
    radius: 0.2,
    length: 0.1,
    at: at(0, cabinTop - 0.12, -0.7),
    segments: 10,
  });
  /* The radar's mount at the front corner */
  builder.cylinder("metal", frameSilver, {
    radius: 0.06,
    length: 0.5,
    at: at(-0.7, cabinTop + 0.2, 0.75),
    segments: 6,
  });
};

/* The Moon's surface round about */

const earthAt = { x: 2.4, z: -6.0 };
const flagAt = { x: -2.6, z: 1.6 };
const cameraAt = { x: 3.4, z: 2.6 };
const reflectorAt = { x: -4.4, z: -1.8 };

const buildSurface = (builder: AttractionBuilder) => {
  /* A darker scorch under the engine, where the dust was blown away */
  builder.add(
    "matte",
    regolithDark,
    new RingGeometry(0.01, 2.2, builder.segments(28, 12), 1).rotateX(
      -Math.PI / 2,
    ),
    { at: at(0, 0.012, 0) },
  );
  /* Craters with raised rims */
  const craters: [number, number, number][] = [
    [-4.6, 2.2, 0.9],
    [4.4, -2.4, 1.1],
    [-2.6, -5.2, 0.7],
    [5.2, 1.6, 0.55],
    [-5.6, -1.4, 0.45],
  ];
  craters.forEach(([x, z, size], index) => {
    if (builder.isFar && index > 2) {
      return;
    }
    builder.torus(
      "matte",
      shade(regolith, 1.06),
      size,
      size * 0.22,
      [x, 0.02, z],
      "y",
      builder.segments(18, 10),
    );
    builder.cylinder("matte", regolithDark, {
      radius: size,
      length: 0.02,
      at: [x, 0.012, z],
      segments: builder.segments(18, 10),
    });
  });
  /* Grey boulders */
  [
    [3.0, 4.4, 0.32],
    [-3.6, 4.0, 0.22],
    [5.4, -0.6, 0.28],
    [-5.0, 0.4, 0.35],
    [1.2, -5.4, 0.26],
  ].forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#86848e" : "#a6a4ae",
      size,
      [x, size * 0.4, z],
      [1.3, 0.75, 1],
      8,
    );
  });
  /* The Earth's pole: the Earth rises up it */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 2.2,
    at: [earthAt.x, 1.1, earthAt.z],
    segments: 6,
  });
  builder.cylinder("matte", regolithDark, {
    radius: 0.35,
    length: 0.15,
    at: [earthAt.x, 0.07, earthAt.z],
    segments: 10,
  });
  /* The flag, held out by a rod along its top */
  builder.cylinder("metal", frameSilver, {
    radius: 0.03,
    length: 2.2,
    at: [flagAt.x, 1.1, flagAt.z],
    segments: 6,
  });
  builder.box(
    "paint",
    palette.white,
    [0.02, 0.6, 0.95],
    [flagAt.x, 1.85, flagAt.z - 0.5],
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", frameSilver, {
    radius: 0.015,
    length: 1.0,
    at: [flagAt.x, 2.16, flagAt.z - 0.5],
    axis: "z",
    segments: 5,
  });
  for (let stripe = 0; stripe < 7; stripe += 2) {
    builder.box(
      "paint",
      "#c8102e",
      [0.025, 0.086, stripe < 4 ? 0.55 : 0.95],
      [flagAt.x, 2.11 - stripe * 0.086, flagAt.z - (stripe < 4 ? 0.7 : 0.5)],
    );
  }
  builder.box(
    "paint",
    "#1f3a8a",
    [0.026, 0.32, 0.4],
    [flagAt.x, 2.0, flagAt.z - 0.22],
  );
  /* A television camera on a tripod, watching */
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      frameSilver,
      [cameraAt.x, 1.0, cameraAt.z],
      [
        cameraAt.x + Math.sin(angle) * 0.4,
        0,
        cameraAt.z + Math.cos(angle) * 0.4,
      ],
      0.03,
      4,
    );
  });
  builder.box(
    "paint",
    palette.black,
    [0.24, 0.2, 0.36],
    [cameraAt.x, 1.1, cameraAt.z],
    [0, -0.6, 0],
  );
  builder.cylinder("glass", "#4a6ac0", {
    radius: 0.06,
    length: 0.08,
    at: [cameraAt.x - 0.12, 1.1, cameraAt.z - 0.1],
    axis: "x",
    segments: 8,
  });
  /* The laser mirror the astronauts left, still used to measure how far away the Moon is */
  builder.box(
    "metal",
    frameSilver,
    [0.7, 0.04, 0.5],
    [reflectorAt.x, 0.35, reflectorAt.z],
    [0.4, 0.3, 0],
  );
  for (let cell = 0; cell < 6; cell++) {
    builder.box(
      "glass",
      "#3a4a8a",
      [0.18, 0.02, 0.18],
      [
        reflectorAt.x - 0.22 + (cell % 3) * 0.22,
        0.39 + (cell < 3 ? 0.06 : -0.06),
        reflectorAt.z - 0.08 + Math.floor(cell / 3) * 0.17,
      ],
      [0.4, 0.3, 0],
    );
  }
  [-0.25, 0.25].forEach((dx) => {
    builder.bar(
      "metal",
      frameSilver,
      [reflectorAt.x + dx, 0, reflectorAt.z],
      [reflectorAt.x + dx, 0.33, reflectorAt.z],
      0.03,
      4,
    );
  });
  /* A seismometer with silver skirt, and its solar panels */
  builder.cylinder("paint", foilGold, {
    radius: 0.18,
    radiusEnd: 0.12,
    length: 0.35,
    at: [4.4, 0.18, 0.6],
    segments: 10,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#2a3a7a",
      [0.55, 0.02, 0.38],
      [4.4 + side * 0.45, 0.38, 0.6],
    );
  });
  /* Boot prints from the ladder out to the flag and the camera */
  const steps: [number, number][] = [
    [0.2, 3.1],
    [-0.3, 3.4],
    [-0.8, 3.0],
    [-1.3, 2.6],
    [-1.8, 2.2],
    [0.7, 3.5],
    [1.4, 3.3],
    [2.1, 3.0],
    [2.7, 2.9],
  ];
  steps.forEach(([x, z], index) => {
    builder.box(
      "matte",
      bootPrint,
      [0.13, 0.012, 0.26],
      [x + (index % 2 === 0 ? -0.08 : 0.08), 0.02, z],
      [0, 0.6, 0],
    );
  });
  /* Pebbles scattered over the dust */
  for (let pebble = 0; pebble < 22; pebble++) {
    const angle = pebble * 2.39996;
    const reach = 2.9 + ((pebble * 37) % 50) / 10;
    const x = Math.sin(angle) * reach;
    const z = Math.cos(angle) * reach;
    if (Math.hypot(x - 0.5, z - 4) < 1.6 || Math.hypot(x - 3, z - 7.2) < 1) {
      continue;
    }
    builder.sphere(
      "matte",
      pebble % 3 === 0 ? "#7e7c86" : "#b2b0ba",
      0.07 + (pebble % 4) * 0.025,
      [x, 0.03, z],
      [1.3, 0.7, 1],
      6,
    );
  }
  /* The central station of the experiments, its aerial pointed at the Earth */
  builder.box("paint", foilGold, [0.6, 0.35, 0.45], [-4.2, 0.18, 1.2]);
  builder.box("metal", frameSilver, [0.66, 0.04, 0.5], [-4.2, 0.6, 1.2]);
  [-0.3, 0.3].forEach((dx) => {
    builder.bar(
      "metal",
      frameSilver,
      [-4.2 + dx, 0.36, 1.0],
      [-4.2 + dx, 0.6, 1.0],
      0.025,
      4,
    );
  });
  builder.bar(
    "metal",
    frameSilver,
    [-4.2, 0.36, 1.2],
    [-4.0, 1.25, 0.9],
    0.03,
    4,
  );
  builder.cylinder("metal", "#e8eaee", {
    radius: 0.06,
    radiusEnd: 0.04,
    length: 0.6,
    at: [-4.0, 1.4, 0.9],
    segments: 8,
  });
  /* Glowing markers round the edge of the landing site */
  for (let marker = 0; marker < 14; marker++) {
    const angle = ((marker + 0.5) / 14) * Math.PI * 2;
    const x = Math.sin(angle) * 8.3;
    const z = Math.cos(angle) * 8.3;
    builder.cylinder("paint", "#2b2f6b", {
      radius: 0.12,
      length: 0.12,
      at: [x, 0.06, z],
      segments: 8,
    });
    builder.cylinder("glow", marker % 2 === 0 ? glowCyan : "#b48cff", {
      radius: 0.08,
      length: 0.04,
      at: [x, 0.13, z],
      segments: 8,
    });
  }
  /* A bag of Moon rocks, and a rake for collecting them */
  builder.box("matte", palette.white, [0.25, 0.3, 0.18], [-1.5, 0.15, 3.2]);
  builder.bar("metal", frameSilver, [-1.9, 0, 3.6], [-1.6, 1.1, 3.0], 0.03, 4);
};

/* Moving parts */

const buildRadar = (builder: AttractionBuilder) => {
  builder.add(
    "metal",
    "#eef0f4",
    new CylinderGeometry(
      0.34,
      0.05,
      0.14,
      builder.segments(14, 8),
      1,
      false,
    ).rotateX(Math.PI / 2 - 0.5),
    { at: [0, 0.12, 0.08] },
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.03,
    length: 0.3,
    at: [0, 0.18, 0.22],
    axis: "z",
    segments: 6,
  });
  builder.box("paint", foilGold, [0.2, 0.2, 0.2], [0, 0, 0]);
};

const buildEarth = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#2f6ad0", 0.75, [0, 0, 0], [1, 1, 1], 20);
  if (builder.isFar) {
    return;
  }
  const lands: [number, number, number, string][] = [
    [0.4, 0.3, 0.32, "#4f9a4a"],
    [-0.3, 0.1, 0.36, "#5fa84a"],
    [0.1, -0.35, 0.28, "#c8a860"],
    [-0.5, -0.3, 0.2, "#4f9a4a"],
  ];
  lands.forEach(([dx, dy, size, colour]) => {
    const length = Math.hypot(dx, dy, 0.6);
    builder.sphere(
      "matte",
      colour,
      size,
      [(dx / length) * 0.62, (dy / length) * 0.62, (0.6 / length) * 0.62],
      [1, 0.8, 0.5],
      8,
    );
  });
  [
    [0.3, 0.55, 0.3],
    [-0.45, 0.35, 0.45],
    [0.55, -0.2, 0.4],
  ].forEach(([dx, dy, dz]) => {
    const length = Math.hypot(dx, dy, dz);
    builder.sphere(
      "matte",
      palette.white,
      0.2,
      [(dx / length) * 0.72, (dy / length) * 0.72, (dz / length) * 0.72],
      [1.4, 0.4, 0.8],
      6,
    );
  });
  builder.sphere("matte", palette.white, 0.3, [0, 0.62, 0], [1, 0.35, 1], 8);
};

const buildLandingLights = (builder: AttractionBuilder) => {
  [0, 1, 2, 3].forEach((leg) => {
    const angle = (leg / 4) * Math.PI * 2 + Math.PI / 4;
    builder.sphere(
      "glow",
      leg % 2 === 0 ? glowCyan : "#ff5a6a",
      0.09,
      [Math.sin(angle) * 1.65, 0, Math.cos(angle) * 1.65],
      [1, 1, 1],
      8,
    );
  });
};

const buildBeacon = (builder: AttractionBuilder) => {
  builder.cylinder("glow", "#ff5a6a", {
    radius: 0.07,
    length: 0.14,
    at: [0, 0, 0],
    segments: 8,
  });
};

/* Wanderers: astronauts, bouncing in the low gravity */

const buildAstronaut = (builder: AttractionBuilder) => {
  const suit = "#f2f1ec";
  builder.cylinder("matte", suit, {
    radius: 0.24,
    radiusEnd: 0.22,
    length: 0.5,
    at: [0, 0.75, 0],
    segments: 10,
  });
  builder.box("matte", "#e2e0d8", [0.42, 0.55, 0.22], [0, 0.85, -0.26]);
  builder.sphere("paint", suit, 0.2, [0, 1.2, 0.02], [1, 1, 1], 12);
  builder.sphere(
    "metal",
    "#d9a62e",
    0.15,
    [0, 1.2, 0.1],
    [1.05, 0.85, 0.8],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      suit,
      [side * 0.1, 0.52, 0],
      [side * 0.12, 0.08, 0.02],
      0.15,
      6,
    );
    builder.box(
      "matte",
      "#cfcdc6",
      [0.15, 0.1, 0.24],
      [side * 0.12, 0.05, 0.05],
    );
    if (!builder.isFar) {
      builder.bar(
        "matte",
        suit,
        [side * 0.26, 0.95, 0],
        [side * 0.32, 0.6, 0.12],
        0.11,
        6,
      );
      builder.sphere(
        "matte",
        "#cfcdc6",
        0.06,
        [side * 0.32, 0.56, 0.13],
        [1, 1, 1],
        6,
      );
    }
  });
  if (!builder.isFar) {
    builder.box("matte", "#c8102e", [0.12, 0.08, 0.01], [0.13, 0.9, 0.24]);
    builder.box("matte", "#9aa0aa", [0.2, 0.1, 0.06], [0, 0.82, 0.24]);
  }
};

/* Up the ladder, through the hatch and out of the top */

const followPath = (
  points: readonly (readonly [number, number, number, number?])[],
  progress: number,
): LocalSpot => {
  const legs = points.slice(1).map((to, index) => {
    const from = points[index];
    return {
      from,
      to,
      length:
        Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) +
        (from[3] ?? 0),
    };
  });
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  let left = Math.min(1, Math.max(0, progress)) * total;
  let heading = 0;
  for (const leg of legs) {
    const flat = Math.hypot(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    if (flat > 0.05) {
      heading = Math.atan2(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    }
    if (left <= leg.length || leg === legs[legs.length - 1]) {
      const wait = leg.from[3] ?? 0;
      const share = Math.min(
        1,
        Math.max(0, (left - wait) / Math.max(0.001, leg.length - wait)),
      );
      return {
        x: leg.from[0] + (leg.to[0] - leg.from[0]) * share,
        y: leg.from[1] + (leg.to[1] - leg.from[1]) * share,
        z: leg.from[2] + (leg.to[2] - leg.from[2]) * share,
        heading,
      };
    }
    left -= leg.length;
  }
  return { x: 0, y: 0, z: 0, heading };
};

const ladderStart = { x: 0.9, z: 3.9 };
const ladderFinish = { x: -1.0, z: 4.2 };
const ladderPath: readonly (readonly [number, number, number, number?])[] = [
  [ladderStart.x, 0, ladderStart.z],
  [0, 0, ladderFoot[2] + 0.45],
  [0, 0.15, ladderFoot[2] + 0.3],
  [0, ladderTop[1] + 0.05, ladderTop[2] + 0.3],
  [0, ladderTop[1] + 0.05, ladderTop[2] - 0.05, 1],
  [0, cabinBottom + 0.3, landerZ + 0.4],
  [0, cabinTop + 0.25, landerZ + 0.25, 3],
  [0, cabinBottom + 0.3, landerZ + 0.4],
  [0, ladderTop[1] + 0.05, ladderTop[2] + 0.3],
  [0, 0.15, ladderFoot[2] + 0.3],
  [0, 0, ladderFoot[2] + 0.6],
  [ladderFinish.x, 0, ladderFinish.z],
];

const ladderRide: PlayRide = {
  id: "ladder",
  name: "the lander's ladder",
  start: ladderStart,
  reach: 0.55,
  seconds: 15,
  finish: ladderFinish,
  follow: (progress) => followPath(ladderPath, progress),
};

export const lunarLanderModel: NewLandAttractionModel = {
  kind: "lunar-lander",
  islandId: "starfall-isle",
  name: "Lunar Lander",
  fact: "The Moon is a ball of rock that travels round the Earth, going all the way round about once every 27 days. The Apollo astronauts took about three days to fly there, then landed in a lunar module like this one. When they left, only the top half took off: the gold bottom half stayed behind as a launch pad, and it is still there today.",
  curriculumLink:
    "Science, Year 5: Earth and space. The movement of the Moon relative to the Earth, and the Sun, Earth and Moon as approximately spherical bodies.",
  footprint,
  setting: "inland",
  signSpot: { x: 3.0, z: 7.6 },
  padColour: regolith,
  build: (builder) => {
    buildSurface(builder);
    buildDescentStage(builder);
    buildLadder(builder);
    buildAscentStage(builder);
    addSignBoard(builder, [3.0, 0, 6.9], signColour, -0.25);
  },
  moving: [
    {
      name: "rendezvous radar",
      pivot: at(-0.7, cabinTop + 0.5, 0.75),
      build: buildRadar,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 4, reach: 4.5 },
    },
    {
      name: "Earth",
      pivot: [earthAt.x, 2.0, earthAt.z],
      build: buildEarth,
      motion: { kind: "rise", reach: 7, height: 2.6, period: 6 },
    },
    {
      name: "landing lights",
      pivot: at(0, descentBottom + 0.05, 0),
      build: buildLandingLights,
      motion: { kind: "wake", reach: 5 },
    },
    {
      name: "beacon",
      pivot: at(0.3, cabinTop + 0.34, 0.25),
      build: buildBeacon,
      motion: { kind: "flicker", period: 0.6 },
    },
  ],
  wanderers: [
    {
      name: "astronauts",
      build: buildAstronaut,
      count: 2,
      centre: { x: 0.5, z: 3.6 },
      radius: 2.6,
      speed: 0.55,
      bob: 0.4,
    },
  ],
  rides: [ladderRide],
  tune: [72, 76, 79, 84, 83, 79, 76, 72],
  play: {
    label: "Count down to lift-off",
    news: "Five, four, three, two, one! The top half of the lunar module blasted off the Moon to meet the spacecraft waiting in orbit, ready for the journey home.",
  },
};
