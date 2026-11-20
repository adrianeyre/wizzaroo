import { ConeGeometry } from "three";
import {
  addGableRoof,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const towerTimber = "#4a3a5c";
const deckTimber = "#6a5478";
const railSilver = "#c9d0dc";
const lampNavy = "#1f2a5a";
const lensGlass = "#cfe6ff";
const flashGlow = "#fff2b0";
const canopyPurple = "#5b3f8c";
const canopyCream = "#efe8d6";
const deskTimber = "#7a5a3c";
const keyBrass = "#d0a84a";
const boardNavy = "#25306a";
const codeCream = "#efe8d6";
const codeGlow = "#ffe27a";
const pennantRed = "#d8453a";
const signColour = "#33408a";

/* The signal tower at the back left, the telegraph desk at the front right. */
const tower = { x: -1.4, z: -1.5, half: 0.6, top: 0.38, height: 3.0 };
const lampAt: Triple = [tower.x, tower.height + 0.85, tower.z];
const lensAt: Triple = [lampAt[0], lampAt[1], lampAt[2] + 0.33];
const desk = { x: 1.3, z: 0.4 };
const deskTop = 0.74;
const keyPivot: Triple = [desk.x + 0.05, deskTop + 0.09, desk.z + 0.05];
const board = { x: 2.0, z: -1.9, width: 1.8, height: 1.35, bottom: 0.55 };
const ladderFoot = { x: tower.x, z: tower.z + tower.half + 0.55 };
const ladderTopZ = tower.z + 0.7;
const rideStart: LocalPoint = { x: ladderFoot.x, z: ladderFoot.z + 0.2 };
const rideFinish: LocalPoint = { x: tower.x + 1.0, z: ladderFoot.z + 0.45 };

/** Each letter's Morse code, from A to Z. */
const morseAlphabet = [
  ".-",
  "-...",
  "-.-.",
  "-..",
  ".",
  "..-.",
  "--.",
  "....",
  "..",
  ".---",
  "-.-",
  ".-..",
  "--",
  "-.",
  "---",
  ".--.",
  "--.-",
  ".-.",
  "...",
  "-",
  "..-",
  "...-",
  ".--",
  "-..-",
  "-.--",
  "--..",
];

/** How far a tower leg is from the middle at a height, as it tapers. */
const legHalfAt = (height: number): number =>
  tower.half + (tower.top - tower.half) * (height / tower.height);

const legAt = (height: number, sideX: number, sideZ: number): Triple => [
  tower.x + sideX * legHalfAt(height),
  height,
  tower.z + sideZ * legHalfAt(height),
];

const buildTower = (builder: AttractionBuilder) => {
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  corners.forEach(([sideX, sideZ]) => {
    builder.bar(
      "matte",
      towerTimber,
      legAt(0, sideX, sideZ),
      legAt(tower.height, sideX, sideZ),
      0.13,
      builder.isFar ? 4 : 8,
    );
  });
  /* The platform, wider than the top of the tower */
  builder.box(
    "matte",
    deckTimber,
    [1.3, 0.1, 1.3],
    [tower.x, tower.height + 0.05, tower.z],
  );
  /* The lamp's pedestal, body and hood */
  builder.cylinder("metal", lampNavy, {
    radius: 0.12,
    radiusEnd: 0.08,
    length: 0.55,
    at: [lampAt[0], tower.height + 0.37, lampAt[2]],
    segments: 12,
  });
  builder.cylinder("paint", lampNavy, {
    radius: 0.3,
    length: 0.62,
    at: lampAt,
    axis: "z",
    segments: builder.isFar ? 12 : 26,
  });
  if (builder.isFar) {
    builder.cylinder("glass", lensGlass, {
      radius: 0.26,
      length: 0.04,
      at: lensAt,
      axis: "z",
      segments: 12,
    });
    return;
  }
  /* Braces across the tower's faces */
  [0.1, 1.5].forEach((low) => {
    const high = low + 1.4;
    corners.forEach(([sideX, sideZ], index) => {
      const [nextX, nextZ] = corners[(index + 1) % corners.length];
      builder.bar(
        "matte",
        shade(towerTimber, 1.15),
        legAt(low, sideX, sideZ),
        legAt(high, nextX, nextZ),
        0.06,
        4,
      );
      builder.bar(
        "matte",
        shade(towerTimber, 1.15),
        legAt(high, sideX, sideZ),
        legAt(high, nextX, nextZ),
        0.07,
        4,
      );
    });
  });
  /* Railings round the platform */
  const edge = 0.62;
  corners.forEach(([sideX, sideZ], index) => {
    const [nextX, nextZ] = corners[(index + 1) % corners.length];
    const from: Triple = [
      tower.x + sideX * edge,
      tower.height + 0.75,
      tower.z + sideZ * edge,
    ];
    const to: Triple = [
      tower.x + nextX * edge,
      tower.height + 0.75,
      tower.z + nextZ * edge,
    ];
    builder.bar("metal", railSilver, from, to, 0.04, 6);
    builder.bar(
      "metal",
      railSilver,
      [from[0], from[1] - 0.35, from[2]],
      [to[0], to[1] - 0.35, to[2]],
      0.03,
      4,
    );
    builder.bar(
      "metal",
      railSilver,
      [from[0], tower.height + 0.1, from[2]],
      from,
      0.05,
      6,
    );
  });
  /* Planks on the platform */
  for (let plank = 0; plank < 6; plank++) {
    builder.box(
      "matte",
      shade(deckTimber, plank % 2 === 0 ? 1.1 : 0.92),
      [1.28, 0.01, 0.16],
      [tower.x, tower.height + 0.105, tower.z - 0.55 + plank * 0.22],
    );
  }
  /* The ladder up the front */
  const ladderTop = ladderTopZ;
  [-0.22, 0.22].forEach((dx) => {
    builder.bar(
      "matte",
      deckTimber,
      [tower.x + dx, 0, ladderFoot.z],
      [tower.x + dx, tower.height + 0.6, ladderTop],
      0.06,
      6,
    );
  });
  for (let rung = 1; rung < 12; rung++) {
    const share = rung / 12;
    builder.box(
      "matte",
      deckTimber,
      [0.44, 0.04, 0.05],
      [
        tower.x,
        share * (tower.height + 0.1),
        ladderFoot.z + (ladderTop - ladderFoot.z) * share,
      ],
    );
  }
  /* The Aldis lamp: yoke, hood, front bezel, sighting telescope and handle */
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      railSilver,
      [0.04, 0.38, 0.1],
      [lampAt[0] + side * 0.33, lampAt[1] - 0.12, lampAt[2]],
    );
    builder.cylinder("metal", railSilver, {
      radius: 0.05,
      length: 0.06,
      at: [lampAt[0] + side * 0.31, lampAt[1], lampAt[2]],
      axis: "x",
      segments: 10,
    });
  });
  builder.cylinder("metal", railSilver, {
    radius: 0.36,
    length: 0.04,
    at: [lampAt[0], lampAt[1] - 0.3, lampAt[2]],
    segments: 18,
  });
  builder.torus(
    "metal",
    railSilver,
    0.29,
    0.04,
    [lensAt[0], lensAt[1], lensAt[2] - 0.02],
    "z",
    26,
  );
  builder.cylinder("glass", lensGlass, {
    radius: 0.27,
    length: 0.02,
    at: [lensAt[0], lensAt[1], lensAt[2] - 0.03],
    axis: "z",
    segments: 24,
  });
  builder.cylinder("paint", shade(lampNavy, 1.2), {
    radius: 0.32,
    radiusEnd: 0.3,
    length: 0.1,
    at: [lampAt[0], lampAt[1], lampAt[2] + 0.36],
    axis: "z",
    segments: 26,
    isOpen: true,
  });
  builder.cylinder("metal", railSilver, {
    radius: 0.05,
    length: 0.5,
    at: [lampAt[0], lampAt[1] + 0.36, lampAt[2]],
    axis: "z",
    segments: 10,
  });
  builder.box(
    "metal",
    railSilver,
    [0.04, 0.1, 0.04],
    [lampAt[0], lampAt[1] + 0.31, lampAt[2]],
  );
  builder.cylinder("metal", palette.black, {
    radius: 0.03,
    length: 0.3,
    at: [lampAt[0], lampAt[1] - 0.18, lampAt[2] - 0.35],
    axis: "z",
    segments: 8,
  });
  builder.sphere(
    "paint",
    lampNavy,
    0.3,
    [lampAt[0], lampAt[1], lampAt[2] - 0.31],
    [1, 1, 0.4],
    16,
  );
  /* Shutter slats across the lens, open */
  for (let slat = 0; slat < 5; slat++) {
    builder.box(
      "metal",
      shade(lampNavy, 1.4),
      [0.5, 0.015, 0.08],
      [lensAt[0], lensAt[1] - 0.2 + slat * 0.1, lensAt[2] + 0.02],
    );
  }
  /* A flagpole on the platform's back corner */
  builder.bar(
    "metal",
    railSilver,
    [tower.x - 0.55, tower.height + 0.1, tower.z - 0.55],
    [tower.x - 0.55, tower.height + 2.0, tower.z - 0.55],
    0.04,
    6,
  );
  builder.sphere(
    "metal",
    keyBrass,
    0.05,
    [tower.x - 0.55, tower.height + 2.03, tower.z - 0.55],
    [1, 1, 1],
    8,
  );
};

const buildPennant = (builder: AttractionBuilder) => {
  builder.add(
    "paint",
    pennantRed,
    new ConeGeometry(0.16, 0.7, 4)
      .rotateZ(-Math.PI / 2)
      .translate(0.35, 0, 0)
      .scale(1, 1, 0.15),
  );
  builder.box("paint", palette.white, [0.12, 0.05, 0.03], [0.18, 0, 0]);
};

/** The bright flash from the lens, which shines out as someone comes near. */
const buildFlash = (builder: AttractionBuilder) => {
  builder.cylinder("glow", flashGlow, {
    radius: 0.26,
    length: 0.03,
    at: [0, 0, 0],
    axis: "z",
    segments: 24,
  });
  builder.sphere("glow", flashGlow, 0.24, [0, 0, 0.02], [1, 1, 0.35], 14);
};

/** A long beam out of the lamp after dark. */
const buildBeam = (builder: AttractionBuilder) => {
  builder.add(
    "glow",
    flashGlow,
    new ConeGeometry(0.9, 5, 20, 1, true)
      .rotateX(-Math.PI / 2)
      .translate(0, 0, 2.5),
  );
};

const buildCanopyAndDesk = (builder: AttractionBuilder) => {
  const { x, z } = desk;
  const posts: [number, number][] = [
    [-0.9, -0.7],
    [0.9, -0.7],
    [0.9, 0.7],
    [-0.9, 0.7],
  ];
  posts.forEach(([dx, dz]) => {
    builder.box("paint", canopyCream, [0.08, 2.0, 0.08], [x + dx, 1.0, z + dz]);
  });
  addGableRoof(builder, {
    width: 1.9,
    depth: 1.5,
    rise: 0.5,
    at: [x, 2.0, z],
    colour: canopyPurple,
    finish: "matte",
    overhang: 0.12,
    thickness: 0.05,
  });
  builder.box("matte", deskTimber, [1.2, 0.06, 0.6], [x, deskTop - 0.03, z]);
  if (builder.isFar) {
    builder.box(
      "matte",
      deskTimber,
      [1.1, deskTop - 0.06, 0.5],
      [x, (deskTop - 0.06) / 2, z],
    );
    return;
  }
  /* Scalloped cream trim along the canopy's front and back */
  [-1, 1].forEach((side) => {
    for (let scallop = 0; scallop < 7; scallop++) {
      builder.cylinder("matte", canopyCream, {
        radius: 0.13,
        length: 0.03,
        at: [x - 0.81 + scallop * 0.27, 1.95, z + side * 0.86],
        axis: "z",
        segments: 10,
      });
    }
  });
  /* Desk legs and a drawer */
  [-0.55, 0.55].forEach((dx) => {
    [-0.25, 0.25].forEach((dz) => {
      builder.box(
        "matte",
        shade(deskTimber, 0.8),
        [0.06, deskTop - 0.06, 0.06],
        [x + dx, (deskTop - 0.06) / 2, z + dz],
      );
    });
  });
  builder.box(
    "matte",
    shade(deskTimber, 1.1),
    [0.5, 0.12, 0.02],
    [x - 0.25, deskTop - 0.12, z + 0.3],
  );
  builder.sphere(
    "metal",
    keyBrass,
    0.02,
    [x - 0.25, deskTop - 0.12, z + 0.32],
    [1, 1, 1],
    6,
  );
  /* The key's wooden base, contacts and the brass anvil */
  builder.box(
    "matte",
    palette.darkTimber,
    [0.36, 0.04, 0.2],
    [keyPivot[0] + 0.04, deskTop + 0.02, keyPivot[2]],
  );
  builder.cylinder("metal", keyBrass, {
    radius: 0.025,
    length: 0.05,
    at: [keyPivot[0] + 0.15, deskTop + 0.065, keyPivot[2]],
    segments: 10,
  });
  [-0.06, 0.06].forEach((dz) => {
    builder.box(
      "metal",
      keyBrass,
      [0.03, 0.06, 0.02],
      [keyPivot[0] - 0.05, deskTop + 0.07, keyPivot[2] + dz],
    );
  });
  /* The sounder, which clicks out the message, and its two coils */
  const sounder: Triple = [x - 0.35, deskTop, z - 0.08];
  builder.box(
    "matte",
    palette.darkTimber,
    [0.3, 0.04, 0.2],
    [sounder[0], sounder[1] + 0.02, sounder[2]],
  );
  [-0.06, 0.06].forEach((dx) => {
    builder.cylinder("paint", "#8a2a2a", {
      radius: 0.04,
      length: 0.1,
      at: [sounder[0] + dx, sounder[1] + 0.09, sounder[2]],
      segments: 10,
    });
  });
  builder.box(
    "metal",
    keyBrass,
    [0.24, 0.02, 0.03],
    [sounder[0], sounder[1] + 0.16, sounder[2]],
  );
  /* Paper tape on a reel, headphones and a candle lamp */
  builder.cylinder("paint", palette.white, {
    radius: 0.07,
    length: 0.04,
    at: [x + 0.4, deskTop + 0.08, z - 0.15],
    axis: "x",
    segments: 12,
  });
  builder.box(
    "paint",
    palette.white,
    [0.035, 0.005, 0.35],
    [x + 0.4, deskTop + 0.005, z + 0.05],
  );
  for (let mark = 0; mark < 5; mark++) {
    builder.box(
      "paint",
      palette.black,
      [0.02, 0.006, mark % 2 === 0 ? 0.015 : 0.04],
      [x + 0.4, deskTop + 0.008, z - 0.05 + mark * 0.05],
    );
  }
  builder.torus(
    "paint",
    palette.black,
    0.08,
    0.012,
    [x + 0.15, deskTop + 0.05, z - 0.2],
    "z",
    12,
  );
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.035,
      length: 0.03,
      at: [x + 0.15 + side * 0.08, deskTop + 0.035, z - 0.2],
      axis: "x",
      segments: 10,
    });
  });
  builder.cylinder("metal", keyBrass, {
    radius: 0.06,
    length: 0.03,
    at: [x - 0.48, deskTop + 0.015, z + 0.18],
    segments: 12,
  });
  builder.cylinder("glass", lensGlass, {
    radius: 0.035,
    length: 0.12,
    at: [x - 0.48, deskTop + 0.09, z + 0.18],
    segments: 10,
  });
  builder.sphere(
    "glow",
    palette.warmLight,
    0.02,
    [x - 0.48, deskTop + 0.09, z + 0.18],
    [1, 1.4, 1],
    6,
  );
  /* A stool */
  builder.cylinder("matte", deskTimber, {
    radius: 0.2,
    length: 0.05,
    at: [x, 0.45, z + 0.65],
    segments: 14,
  });
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "matte",
      shade(deskTimber, 0.8),
      [x + Math.sin(angle) * 0.1, 0.43, z + 0.65 + Math.cos(angle) * 0.1],
      [x + Math.sin(angle) * 0.18, 0, z + 0.65 + Math.cos(angle) * 0.18],
      0.04,
      5,
    );
  }
};

const buildKeyLever = (builder: AttractionBuilder) => {
  builder.box("metal", keyBrass, [0.28, 0.025, 0.04], [0.05, 0, 0]);
  builder.cylinder("paint", palette.black, {
    radius: 0.035,
    radiusEnd: 0.04,
    length: 0.035,
    at: [0.17, 0.03, 0],
    segments: 12,
  });
  builder.cylinder("metal", keyBrass, {
    radius: 0.012,
    length: 0.03,
    at: [0.17, 0.0, 0],
    segments: 6,
  });
};

/** A line of signal flags from the flagpole down to the canopy. */
const buildBunting = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const from: Triple = [tower.x - 0.55, tower.height + 1.95, tower.z - 0.55];
  const to: Triple = [desk.x - 0.95, 2.5, desk.z];
  builder.bar("paint", palette.black, from, to, 0.012, 3);
  const flags = 9;
  const colours = [pennantRed, codeGlow, "#3a6ad8", palette.white, "#4ab86a"];
  for (let flag = 1; flag <= flags; flag++) {
    const share = flag / (flags + 1);
    const sag = Math.sin(share * Math.PI) * 0.25;
    const at: Triple = [
      from[0] + (to[0] - from[0]) * share,
      from[1] + (to[1] - from[1]) * share - sag - 0.12,
      from[2] + (to[2] - from[2]) * share,
    ];
    builder.add(
      "matte",
      colours[flag % colours.length],
      new ConeGeometry(0.1, 0.24, 3)
        .rotateX(Math.PI)
        .scale(1, 1, 0.2)
        .rotateY(-0.8),
      { at },
    );
  }
};

const buildWires = (builder: AttractionBuilder) => {
  const poleAt = { x: 0.0, z: -0.7 };
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.06,
    radiusEnd: 0.045,
    length: 2.6,
    at: [poleAt.x, 1.3, poleAt.z],
    segments: builder.isFar ? 4 : 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    palette.darkTimber,
    [0.6, 0.06, 0.06],
    [poleAt.x, 2.45, poleAt.z],
    [0, 0.6, 0],
  );
  [-0.22, 0.22].forEach((along) => {
    const at: Triple = [
      poleAt.x + Math.cos(0.6) * along,
      2.53,
      poleAt.z - Math.sin(0.6) * along,
    ];
    builder.cylinder("glass", "#8fd8c8", {
      radius: 0.03,
      radiusEnd: 0.02,
      length: 0.08,
      at,
      segments: 6,
    });
    /* Wires to the tower and to the desk */
    builder.bar(
      "paint",
      palette.black,
      at,
      [tower.x + 0.35, tower.height + 0.4, tower.z + 0.35],
      0.01,
      3,
    );
    builder.bar(
      "paint",
      palette.black,
      at,
      [desk.x - 0.85, 1.6, desk.z - 0.68],
      0.01,
      3,
    );
  });
};

const buildAlphabetBoard = (builder: AttractionBuilder) => {
  const { x, z, width, height, bottom } = board;
  builder.box(
    "paint",
    boardNavy,
    [width, height, 0.06],
    [x, bottom + height / 2, z],
  );
  if (builder.isFar) {
    return;
  }
  [-width / 2 + 0.08, width / 2 - 0.08].forEach((dx) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, bottom + height, 0.08],
      [x + dx, (bottom + height) / 2, z - 0.07],
    );
  });
  builder.box(
    "paint",
    railSilver,
    [width + 0.08, 0.06, 0.1],
    [x, bottom + height + 0.02, z],
  );
  const face = z + 0.035;
  const rows = 13;
  morseAlphabet.forEach((code, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    const left = x - width / 2 + 0.14 + column * (width / 2);
    const y = bottom + height - 0.1 - row * 0.092;
    /* S and O are lit, so SOS stands out */
    const isSos = index === 14 || index === 18;
    builder.box(
      "paint",
      isSos ? codeGlow : shade(codeCream, 0.9),
      [0.06, 0.06, 0.01],
      [left, y, face],
    );
    builder.box(
      "paint",
      boardNavy,
      [0.02, 0.03, 0.012],
      [left, y, face + 0.002],
    );
    let along = left + 0.1;
    for (let place = 0; place < code.length; place++) {
      const symbol = code.charAt(place);
      const length = symbol === "-" ? 0.09 : 0.03;
      builder.box(
        isSos ? "glow" : "paint",
        isSos ? codeGlow : codeCream,
        [length, 0.03, 0.01],
        [along + length / 2, y, face],
      );
      along += length + 0.03;
    }
  });
};

/** Up the ladder, a look out from the platform, and back down. */
const climbRide = (progress: number): LocalSpot => {
  const deckY = tower.height + 0.11;
  if (progress < 0.35) {
    const share = progress / 0.35;
    return {
      x: tower.x,
      y: share * deckY,
      z: rideStart.z + (ladderTopZ - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.62) {
    const share = (progress - 0.35) / 0.27;
    return {
      x: tower.x + Math.sin(share * Math.PI) * 0.35,
      y: deckY,
      z: ladderTopZ - 0.3,
      heading: share * Math.PI * 2,
    };
  }
  if (progress < 0.9) {
    const share = (progress - 0.62) / 0.28;
    return {
      x: tower.x,
      y: deckY * (1 - share),
      z: ladderTopZ + (rideStart.z - ladderTopZ) * share,
      heading: Math.PI,
    };
  }
  const share = (progress - 0.9) / 0.1;
  return {
    x: rideStart.x + (rideFinish.x - rideStart.x) * share,
    y: 0,
    z: rideStart.z + (rideFinish.z - rideStart.z) * share,
    heading: Math.PI / 2,
  };
};

export const morseCodeLampModel: CuriosityModel = {
  kind: "morse-code-lamp",
  islandId: "starfall-isle",
  name: "Morse Code Lamp",
  fact: "Morse code sends messages as short and long signals called dots and dashes. Every letter has its own pattern: S is three dots and O is three dashes, so the call for help, SOS, is dot-dot-dot, dash-dash-dash, dot-dot-dot. Telegraph operators tapped it along wires as pulses of electricity, and ships flashed it to each other with signal lamps like this one.",
  curriculumLink:
    "Computing, Key Stage 2: understand computer networks, including the internet, and the opportunities they offer for communication and collaboration.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: -1.3, z: 3.5 },
  build: (builder) => {
    buildTower(builder);
    buildCanopyAndDesk(builder);
    buildWires(builder);
    buildBunting(builder);
    buildAlphabetBoard(builder);
    if (!builder.isFar) {
      builder.box("matte", palette.gravel, [1.0, 0.03, 2.4], [0.2, 0.015, 2.6]);
    }
    addSignBoard(builder, [-1.3, 0, 3.5], signColour);
  },
  moving: [
    {
      name: "lamp flash",
      pivot: lensAt,
      build: buildFlash,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "lamp beam",
      pivot: lensAt,
      build: buildBeam,
      motion: { kind: "flicker", period: 0.6 },
      look: "beam",
    },
    {
      name: "telegraph key",
      pivot: keyPivot,
      build: buildKeyLever,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 4,
        amplitude: 0.12,
        period: 0.45,
      },
    },
    {
      name: "pennant",
      pivot: [tower.x - 0.55, tower.height + 1.85, tower.z - 0.55],
      build: buildPennant,
      motion: { kind: "swing", axis: "y", amplitude: 0.35, period: 2.6 },
    },
  ],
  rides: [
    {
      id: "signal-tower",
      name: "the signal tower",
      start: rideStart,
      reach: 0.55,
      seconds: 10,
      finish: rideFinish,
      follow: climbRide,
    },
  ],
  blockers: [
    { x: tower.x, z: tower.z, radius: tower.half + 0.3 },
    { x: desk.x - 0.4, z: desk.z, radius: 0.45 },
    { x: desk.x + 0.4, z: desk.z, radius: 0.45 },
    { x: 0.0, z: -0.7, radius: 0.2 },
    { x: board.x - board.width / 2 + 0.08, z: board.z, radius: 0.2 },
    { x: board.x + board.width / 2 - 0.08, z: board.z, radius: 0.2 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Send an SOS",
    news: "Beep beep beep, beeeep beeeep beeeep, beep beep beep! The lamp flashed SOS across the sky, and a ship far away flashed back: MESSAGE RECEIVED.",
    tune: [84, 84, 84, 79, 79, 79, 84, 84, 84],
  },
};
