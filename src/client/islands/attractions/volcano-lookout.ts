import {
  CylinderGeometry,
  DodecahedronGeometry,
  Shape,
  ShapeGeometry,
} from "three";
import {
  addBench,
  addSignBoard,
  buildFlatDeck,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "./attraction-kit.js";

const ash = "#77716a";
const basalt = "#3a3634";
const basaltDark = "#2a2726";
const scoria = "#6b3a2c";
const steel = "#4b5157";
const steelLight = "#7c858d";
const corten = "#7a4a2e";
const cortenLight = "#8f5a38";
const roofRed = "#7d2e22";
const boards = "#8b6d4e";
const boardsDark = "#755a3f";
const viewerGreen = "#2f5d50";
const warnYellow = "#f2c230";
const lavaGlow = "#ff6a1f";
const lavaCore = "#ffc04a";

const deckHeight = 1.9;
const platform = { minX: -3.1, maxX: 3.1, minZ: -4.4, maxZ: -1.2 };
const rampMinX = 1.65;
const rampMaxX = 2.95;
const rampFoot = 4.9;
const landingFrom = 2.2;
const landingTo = 1.4;
const landingHeight = deckHeight / 2;
const telescopeAt = { x: 0, z: -3.95 };
const telescopeTilt = 0.16;

/** The ramp's height at a distance along z, rising from the foot to the platform. */
const findRampHeight = (z: number): number => {
  if (z >= landingFrom) {
    return (landingHeight * (rampFoot - z)) / (rampFoot - landingFrom);
  }
  if (z >= landingTo) {
    return landingHeight;
  }
  return (
    landingHeight +
    ((deckHeight - landingHeight) * (landingTo - z)) /
      (landingTo - platform.maxZ)
  );
};

const addRailing = (
  builder: AttractionBuilder,
  from: Triple,
  to: Triple,
  isGlass = false,
) => {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const posts = Math.max(1, Math.round(length / 1.1));
  for (let post = 0; post <= posts; post++) {
    const share = post / posts;
    const x = from[0] + (to[0] - from[0]) * share;
    const y = from[1] + (to[1] - from[1]) * share;
    const z = from[2] + (to[2] - from[2]) * share;
    builder.box("metal", steel, [0.06, 0.95, 0.06], [x, y + 0.475, z]);
  }
  builder.bar(
    "metal",
    steelLight,
    [from[0], from[1] + 0.95, from[2]],
    [to[0], to[1] + 0.95, to[2]],
    0.07,
    8,
  );
  if (builder.isFar) {
    return;
  }
  if (isGlass) {
    const turn = Math.atan2(to[0] - from[0], to[2] - from[2]) + Math.PI / 2;
    builder.box(
      "glass",
      "#9fc0cf",
      [length - 0.1, 0.72, 0.03],
      [
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2 + 0.47,
        (from[2] + to[2]) / 2,
      ],
      [0, turn, 0],
    );
    return;
  }
  [0.32, 0.62].forEach((up) => {
    builder.bar(
      "metal",
      steel,
      [from[0], from[1] + up, from[2]],
      [to[0], to[1] + up, to[2]],
      0.03,
      5,
    );
  });
};

const buildPlatform = (builder: AttractionBuilder) => {
  const width = platform.maxX - platform.minX;
  const depth = platform.maxZ - platform.minZ;
  const centreZ = (platform.minZ + platform.maxZ) / 2;
  builder.box(
    "matte",
    corten,
    [width, 0.22, depth],
    [0, deckHeight - 0.15, centreZ],
  );
  const planks = builder.isFar ? 1 : 16;
  for (let plank = 0; plank < planks; plank++) {
    builder.box(
      "matte",
      plank % 2 === 0 ? boards : boardsDark,
      [width / planks - 0.025, 0.05, depth - 0.04],
      [
        platform.minX + (width / planks) * (plank + 0.5),
        deckHeight - 0.02,
        centreZ,
      ],
    );
  }
  const postXs = [platform.minX + 0.12, -1, 1, platform.maxX - 0.12];
  const postZs = [platform.minZ + 0.12, platform.maxZ - 0.12];
  postXs.forEach((x) => {
    postZs.forEach((z) => {
      builder.box(
        "matte",
        corten,
        [0.2, deckHeight - 0.2, 0.2],
        [x, (deckHeight - 0.2) / 2, z],
      );
      builder.box("matte", "#5c5955", [0.42, 0.14, 0.42], [x, 0.07, z]);
    });
  });
  for (let bay = 0; bay < postXs.length - 1; bay++) {
    const from = postXs[bay];
    const to = postXs[bay + 1];
    [platform.minZ + 0.12, platform.maxZ - 0.12].forEach((z) => {
      builder.bar(
        "matte",
        cortenLight,
        [from, 0.2, z],
        [to, deckHeight - 0.3, z],
        0.06,
        5,
      );
      if (!builder.isFar) {
        builder.bar(
          "matte",
          cortenLight,
          [to, 0.2, z],
          [from, deckHeight - 0.3, z],
          0.06,
          5,
        );
      }
    });
  }
  [platform.minX + 0.12, platform.maxX - 0.12].forEach((x) => {
    builder.bar(
      "matte",
      cortenLight,
      [x, 0.2, platform.minZ + 0.12],
      [x, deckHeight - 0.3, platform.maxZ - 0.12],
      0.06,
      5,
    );
  });
  const top = deckHeight;
  addRailing(
    builder,
    [platform.minX, top, platform.minZ],
    [platform.maxX, top, platform.minZ],
    true,
  );
  addRailing(
    builder,
    [platform.minX, top, platform.minZ],
    [platform.minX, top, platform.maxZ],
  );
  addRailing(
    builder,
    [platform.maxX, top, platform.minZ],
    [platform.maxX, top, platform.maxZ],
  );
  addRailing(
    builder,
    [platform.minX, top, platform.maxZ],
    [rampMinX - 0.05, top, platform.maxZ],
  );
};

const buildRamp = (builder: AttractionBuilder) => {
  const width = rampMaxX - rampMinX;
  const centreX = (rampMinX + rampMaxX) / 2;
  const flights: [number, number][] = [
    [rampFoot, landingFrom],
    [landingFrom, landingTo],
    [landingTo, platform.maxZ],
  ];
  flights.forEach(([from, to]) => {
    const fromHeight = findRampHeight(from);
    const toHeight = findRampHeight(to);
    const run = from - to;
    const slope = Math.atan2(toHeight - fromHeight, run);
    const length = Math.hypot(run, toHeight - fromHeight);
    const middle: Triple = [
      centreX,
      (fromHeight + toHeight) / 2 - 0.04,
      (from + to) / 2,
    ];
    builder.box("matte", boards, [width, 0.08, length + 0.02], middle, [
      slope,
      0,
      0,
    ]);
    builder.box(
      "matte",
      corten,
      [width + 0.1, 0.16, length],
      [centreX, middle[1] - 0.11, middle[2]],
      [slope, 0, 0],
    );
    if (!builder.isFar) {
      const cleats = Math.round(length / 0.45);
      for (let cleat = 1; cleat < cleats && toHeight !== fromHeight; cleat++) {
        const share = cleat / cleats;
        builder.box(
          "matte",
          boardsDark,
          [width - 0.06, 0.03, 0.05],
          [
            centreX,
            fromHeight + (toHeight - fromHeight) * share + 0.01,
            from - run * share,
          ],
        );
      }
    }
    [rampMinX, rampMaxX].forEach((x) => {
      addRailing(
        builder,
        [x + (x > centreX ? 0.04 : -0.04), fromHeight, from],
        [x + (x > centreX ? 0.04 : -0.04), toHeight, to],
      );
    });
  });
  [landingFrom, landingTo].forEach((z) => {
    [rampMinX + 0.1, rampMaxX - 0.1].forEach((x) => {
      builder.box(
        "matte",
        corten,
        [0.14, findRampHeight(z), 0.14],
        [x, findRampHeight(z) / 2, z],
      );
    });
  });
  if (!builder.isFar) {
    builder.box(
      "matte",
      corten,
      [0.14, findRampHeight(3.6), 0.14],
      [centreX, findRampHeight(3.6) / 2, 3.6],
    );
  }
};

const buildShelter = (builder: AttractionBuilder) => {
  const fromX = platform.minX + 0.15;
  const toX = -0.7;
  const fromZ = platform.minZ + 0.6;
  const toZ = platform.maxZ - 0.15;
  const low = deckHeight + 2.05;
  const high = deckHeight + 2.4;
  [fromX, toX].forEach((x) => {
    [fromZ, toZ].forEach((z) => {
      const height = z < -2.5 ? high : low;
      builder.box(
        "metal",
        steel,
        [0.1, height - deckHeight, 0.1],
        [x, (height + deckHeight) / 2, z],
      );
    });
  });
  const depth = toZ - fromZ + 0.5;
  const slope = Math.atan2(high - low, toZ - fromZ);
  builder.box(
    "paint",
    roofRed,
    [toX - fromX + 0.5, 0.08, depth],
    [(fromX + toX) / 2, (low + high) / 2 + 0.06, (fromZ + toZ) / 2],
    [slope, 0, 0],
  );
  builder.box(
    "matte",
    boards,
    [toX - fromX + 0.3, 0.14, 0.12],
    [(fromX + toX) / 2, high - 0.02, fromZ],
  );
  builder.box(
    "matte",
    boards,
    [toX - fromX + 0.3, 0.14, 0.12],
    [(fromX + toX) / 2, low - 0.02, toZ],
  );
  if (!builder.isFar) {
    for (let rib = 0; rib < 5; rib++) {
      builder.box(
        "paint",
        shade(roofRed, 0.85),
        [0.05, 0.04, depth],
        [
          fromX - 0.2 + rib * ((toX - fromX + 0.4) / 4),
          (low + high) / 2 + 0.11,
          (fromZ + toZ) / 2,
        ],
        [slope, 0, 0],
      );
    }
    builder.box(
      "matte",
      boardsDark,
      [0.04, 0.9, toZ - fromZ],
      [fromX + 0.02, deckHeight + 1.2, (fromZ + toZ) / 2],
    );
  }
  addBench(
    builder,
    [(fromX + toX) / 2, deckHeight, toZ - 0.35],
    Math.PI,
    boards,
  );
  const lampAt: Triple = [
    (fromX + toX) / 2,
    low - 0.12,
    (fromZ + toZ) / 2 + 0.4,
  ];
  builder.box(
    "metal",
    steel,
    [0.24, 0.05, 0.24],
    [lampAt[0], lampAt[1] + 0.06, lampAt[2]],
  );
  builder.box("glow", palette.warmLight, [0.18, 0.08, 0.18], lampAt);
};

const buildTelescope = (builder: AttractionBuilder) => {
  const { x, z } = telescopeAt;
  const base = deckHeight;
  builder.cylinder("paint", viewerGreen, {
    radius: 0.17,
    radiusEnd: 0.12,
    length: 0.12,
    at: [x, base + 0.06, z],
    segments: 14,
  });
  builder.cylinder("paint", viewerGreen, {
    radius: 0.06,
    length: 0.55,
    at: [x, base + 0.38, z],
    segments: 10,
  });
  const head: Triple = [x, base + 0.68, z];
  builder.roundedBox("paint", viewerGreen, [0.26, 0.2, 0.24], 0.04, head);
  const tubeAt: Triple = [x, head[1] + 0.14, z];
  const along = (distance: number, up = 0): Triple => [
    x,
    tubeAt[1] + Math.sin(telescopeTilt) * distance + up,
    z - Math.cos(telescopeTilt) * distance,
  ];
  builder.bar("paint", "#d9b54a", along(-0.32), along(0.42), 0.17, 14);
  builder.bar("paint", viewerGreen, along(0.3), along(0.5), 0.22, 14);
  builder.bar("glass", "#6f9fbf", along(0.5), along(0.51), 0.19, 14);
  builder.bar("metal", palette.black, along(-0.42), along(-0.3), 0.09, 10);
  if (!builder.isFar) {
    builder.box(
      "metal",
      palette.brass,
      [0.07, 0.02, 0.01],
      [x + 0.08, head[1] + 0.02, z + 0.125],
    );
    builder.box(
      "metal",
      palette.brass,
      [0.03, 0.12, 0.012],
      [x - 0.07, head[1], z + 0.125],
    );
    builder.box(
      "metal",
      steelLight,
      [0.06, 0.18, 0.06],
      [x, head[1] + 0.06, z],
    );
  }
};

const buildLectern = (builder: AttractionBuilder) => {
  const at: Triple = [-1.9, deckHeight, -3.95];
  builder.box(
    "metal",
    steel,
    [0.08, 0.75, 0.08],
    [at[0], at[1] + 0.375, at[2]],
  );
  const tilt = -0.55;
  const face: Triple = [at[0], at[1] + 0.82, at[2] + 0.03];
  builder.box("paint", "#2e4a5a", [0.8, 0.5, 0.04], face, [tilt, 0, 0]);
  if (builder.isFar) {
    return;
  }
  const onFace = (across: number, up: number, out = 0.025): Triple => [
    face[0] + across,
    face[1] + up * Math.cos(tilt) - out * Math.sin(tilt),
    face[2] + up * Math.sin(tilt) + out * Math.cos(tilt),
  ];
  const cone = new Shape();
  cone.moveTo(-0.3, -0.16);
  cone.lineTo(-0.04, 0.13);
  cone.lineTo(0.04, 0.13);
  cone.lineTo(0.3, -0.16);
  cone.lineTo(-0.3, -0.16);
  builder.add("paint", "#8a6a4a", new ShapeGeometry(cone), {
    at: onFace(0, 0),
    rotation: [tilt, 0, 0],
  });
  builder.box("glow", lavaGlow, [0.025, 0.24, 0.01], onFace(0, 0.0, 0.03), [
    tilt,
    0,
    0,
  ]);
  builder.box("glow", lavaGlow, [0.16, 0.05, 0.01], onFace(0, -0.14, 0.03), [
    tilt,
    0,
    0,
  ]);
  builder.box("paint", palette.cream, [0.7, 0.03, 0.01], onFace(0, 0.2, 0.03), [
    tilt,
    0,
    0,
  ]);
};

const addWarningSign = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  post = 1.1,
) => {
  builder.cylinder("metal", steelLight, {
    radius: 0.03,
    length: post,
    at: [at[0], at[1] + post / 2, at[2]],
    segments: 6,
  });
  const face: Triple = [
    at[0] + Math.sin(turn) * 0.04,
    at[1] + post - 0.05,
    at[2] + Math.cos(turn) * 0.04,
  ];
  builder.add(
    "paint",
    warnYellow,
    new CylinderGeometry(0.26, 0.26, 0.03, 3).rotateX(-Math.PI / 2),
    {
      at: face,
      rotation: [0, turn, 0],
    },
  );
  if (!builder.isFar) {
    builder.add(
      "paint",
      palette.black,
      new CylinderGeometry(0.3, 0.3, 0.025, 3).rotateX(-Math.PI / 2),
      {
        at: [
          face[0] - Math.sin(turn) * 0.005,
          face[1],
          face[2] - Math.cos(turn) * 0.005,
        ],
        rotation: [0, turn, 0],
      },
    );
  }
  if (builder.isFar) {
    return;
  }
  const front = (distance: number, up: number): Triple => [
    face[0] + Math.sin(turn) * distance,
    face[1] + up,
    face[2] + Math.cos(turn) * distance,
  ];
  builder.box("paint", palette.black, [0.035, 0.12, 0.01], front(0.02, 0.02), [
    0,
    turn,
    0,
  ]);
  builder.box(
    "paint",
    palette.black,
    [0.035, 0.035, 0.01],
    front(0.02, -0.08),
    [0, turn, 0],
  );
};

const addRock = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string,
  seed: number,
) => {
  builder.add(
    "matte",
    colour,
    new DodecahedronGeometry(size, builder.isFar ? 0 : 1),
    {
      at,
      scale: [1.2 + (seed % 3) * 0.15, 0.62 + (seed % 2) * 0.12, 1],
      rotation: [0.2 * (seed % 2), seed * 1.3, 0.15],
    },
    undefined,
  );
};

const buildGround = (builder: AttractionBuilder) => {
  const rocks: [number, number, number][] = [
    [-5.2, -3.6, 0.7],
    [-4.6, -5.2, 0.5],
    [4.7, -3.2, 0.6],
    [5.6, -1.5, 0.45],
    [-5.6, 1.6, 0.55],
    [-4.4, 4.4, 0.4],
    [5.4, 4.6, 0.5],
    [0.2, -6.3, 0.65],
    [-1.6, -6.0, 0.4],
    [3.0, -5.8, 0.5],
  ];
  rocks.forEach(([x, z, size], index) => {
    addRock(
      builder,
      [x, size * 0.25, z],
      size,
      index % 3 === 0 ? scoria : index % 2 === 0 ? basalt : basaltDark,
      index,
    );
  });
  const ventAt: Triple = [4.3, 0, 2.6];
  builder.add(
    "matte",
    basaltDark,
    new DodecahedronGeometry(0.75, 1),
    { at: ventAt, scale: [1.4, 0.35, 1.1] },
    undefined,
  );
  if (!builder.isFar) {
    [
      [-0.6, 0.5, 0.35],
      [0.7, -0.4, 0.3],
      [0.2, 0.6, 0.25],
    ].forEach(([dx, dz, size], index) => {
      addRock(
        builder,
        [ventAt[0] + dx, 0.1, ventAt[2] + dz],
        size,
        index === 1 ? scoria : basalt,
        index + 20,
      );
    });
    for (let tuft = 0; tuft < 9; tuft++) {
      const angle = tuft * 2.1 + 0.4;
      const reach = 5 + (tuft % 3) * 0.8;
      const at: Triple = [Math.sin(angle) * reach, 0, Math.cos(angle) * reach];
      for (let blade = 0; blade < 4; blade++) {
        const lean = (blade / 4) * Math.PI * 2;
        builder.bar(
          "matte",
          blade % 2 === 0 ? "#8b8a4a" : "#6f7a3a",
          at,
          [
            at[0] + Math.sin(lean) * 0.12,
            0.3 + (blade % 2) * 0.1,
            at[2] + Math.cos(lean) * 0.12,
          ],
          0.035,
          3,
        );
      }
    }
  }
  builder.box(
    "glow",
    lavaGlow,
    [0.9, 0.06, 0.08],
    [ventAt[0] + 0.1, 0.24, ventAt[2]],
    [0, 0.5, 0],
  );
  builder.box(
    "glow",
    lavaCore,
    [0.5, 0.07, 0.05],
    [ventAt[0] + 0.05, 0.25, ventAt[2] + 0.02],
    [0, 0.5, 0],
  );
  if (!builder.isFar) {
    [
      [-2.4, 2.4, 0.9],
      [-3.8, -0.6, 1.3],
      [5.2, 0.6, 2.2],
    ].forEach(([x, z, turn]) => {
      builder.cylinder("matte", shade(ash, 0.82), {
        radius: 0.9,
        length: 0.012,
        at: [x, 0.006, z],
        segments: 12,
      });
      [-1, 0, 1].forEach((step) => {
        const angle =
          turn +
          step * 0.6 * (step % 2 === 0 ? 1 : -1) +
          (step === 0 ? 0 : 0.35);
        const along = step * 0.36;
        const at: Triple = [
          x + Math.sin(turn) * along,
          0.02,
          z + Math.cos(turn) * along,
        ];
        builder.box("matte", basaltDark, [0.12, 0.03, 0.42], at, [0, angle, 0]);
        builder.box(
          "glow",
          step === 0 ? lavaCore : lavaGlow,
          [0.05, 0.035, 0.38],
          at,
          [0, angle, 0],
        );
      });
    });
    for (let pebble = 0; pebble < 14; pebble++) {
      const angle = pebble * 2.4;
      const reach = 4.2 + (pebble % 4) * 0.7;
      builder.sphere(
        "matte",
        pebble % 2 === 0 ? basalt : scoria,
        0.13,
        [Math.sin(angle) * reach, 0.04, Math.cos(angle) * reach],
        [1.3, 0.6, 1],
        5,
      );
    }
  }
  builder.box(
    "matte",
    "#5f5b56",
    [1.6, 0.04, 1.4],
    [(rampMinX + rampMaxX) / 2, 0.02, rampFoot + 0.6],
  );
  builder.box(
    "matte",
    "#5f5b56",
    [1.4, 0.04, 1.4],
    [0.4, 0.02, rampFoot + 1.2],
    [0, 0.6, 0],
  );
  addWarningSign(builder, [3.3, 0, 5.2], 0);
  addWarningSign(builder, [-3.3, 0, -1.1], 0, 0.9);
  addWarningSign(
    builder,
    [platform.maxX + 0.05, deckHeight + 0.2, -2.8],
    Math.PI / 2,
    0.75,
  );
  [3.4, 0.8].forEach((z) => {
    builder.cylinder("metal", steel, {
      radius: 0.07,
      length: 0.5,
      at: [rampMaxX + 0.3, 0.25, z],
      segments: 8,
    });
    builder.cylinder("glow", palette.warmLight, {
      radius: 0.075,
      length: 0.08,
      at: [rampMaxX + 0.3, 0.46, z],
      segments: 8,
    });
  });
  addSignBoard(builder, [-0.6, 0, 6.0], roofRed);
};

const lookOut = (progress: number): LocalSpot => {
  const start = { x: 0, z: -2.6 };
  const eyepiece = { x: telescopeAt.x, z: telescopeAt.z + 0.62 };
  const finish = { x: 0.95, z: -2.0 };
  if (progress < 0.12) {
    const share = progress / 0.12;
    return {
      x: start.x + (eyepiece.x - start.x) * share,
      y: deckHeight,
      z: start.z + (eyepiece.z - start.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.86) {
    const share = (progress - 0.12) / 0.74;
    return {
      x: eyepiece.x,
      y: deckHeight,
      z: eyepiece.z,
      heading: Math.PI + 0.05 * Math.sin(share * Math.PI * 4),
    };
  }
  const share = (progress - 0.86) / 0.14;
  return {
    x: eyepiece.x + (finish.x - eyepiece.x) * share,
    y: deckHeight,
    z: eyepiece.z + (finish.z - eyepiece.z) * share,
    heading: Math.PI - share * 2.4,
  };
};

const rampDeck: Deck = ({ x, z }) =>
  x >= rampMinX && x <= rampMaxX && z <= rampFoot && z >= platform.maxZ - 0.05
    ? { height: findRampHeight(z), kind: "bridge" }
    : undefined;

const edge = 0.18;
const lookoutBlockers: LocalBlocker[] = [
  ...listWallBlockers(
    { x: platform.minX - edge, z: platform.minZ - edge },
    { x: platform.maxX + edge, z: platform.minZ - edge },
    0.2,
    0.32,
  ),
  ...listWallBlockers(
    { x: platform.minX - edge, z: platform.minZ - edge },
    { x: platform.minX - edge, z: platform.maxZ + edge },
    0.2,
    0.32,
  ),
  ...listWallBlockers(
    { x: platform.maxX + edge, z: platform.minZ - edge },
    { x: platform.maxX + edge, z: platform.maxZ + edge },
    0.2,
    0.32,
  ),
  ...listWallBlockers(
    { x: platform.minX - edge, z: platform.maxZ + edge },
    { x: rampMinX - edge, z: platform.maxZ + edge },
    0.2,
    0.32,
  ),
  ...listWallBlockers(
    { x: rampMinX - edge, z: platform.maxZ + edge },
    { x: rampMinX - edge, z: rampFoot - 0.3 },
    0.2,
    0.32,
  ),
  ...listWallBlockers(
    { x: rampMaxX + edge, z: platform.maxZ + edge },
    { x: rampMaxX + edge, z: rampFoot - 0.3 },
    0.2,
    0.32,
  ),
  { x: telescopeAt.x, z: telescopeAt.z, radius: 0.22 },
  { x: -1.9, z: -3.95, radius: 0.25 },
  { x: 4.3, z: 2.6, radius: 0.9 },
  { x: 3.3, z: 5.2, radius: 0.15 },
  { x: -0.6, z: 6.0, radius: 0.45 },
  { x: -5.2, z: -3.6, radius: 0.8 },
  { x: 4.7, z: -3.2, radius: 0.7 },
  { x: -5.6, z: 1.6, radius: 0.6 },
  { x: 0.2, z: -6.3, radius: 0.7 },
];

export const volcanoLookoutModel: AttractionModel = {
  kind: "volcano-lookout",
  name: "Volcano Lookout",
  fact: "Deep underground, rock is so hot that it melts into magma. When a volcano erupts, magma pushes up and spills out as lava, which cools and hardens into new rock, like the dark rocks all around this lookout.",
  curriculumLink:
    "Geography, Key Stage 2: physical geography. Describe and understand volcanoes, and how rocks form.",
  footprint: 7.6,
  setting: "inland",
  padColour: ash,
  signSpot: { x: -0.6, z: 6.7 },
  build: (builder) => {
    buildGround(builder);
    buildPlatform(builder);
    buildRamp(builder);
    buildShelter(builder);
    buildTelescope(builder);
    buildLectern(builder);
  },
  smoke: [
    {
      at: [4.3, 0.3, 2.6],
      colour: "#d9d6d0",
      puffs: 8,
      size: 0.32,
      rise: 2.6,
      spread: 0.6,
    },
  ],
  blockers: lookoutBlockers,
  decks: [buildFlatDeck(platform, deckHeight), rampDeck],
  rides: [
    {
      id: "telescope",
      name: "the telescope",
      start: { x: 0, z: -2.6 },
      reach: 0.5,
      seconds: 7,
      finish: { x: 0.95, z: -2.0 },
      follow: lookOut,
    },
  ],
};
