import { RingGeometry, Shape } from "three";
import {
  addBush,
  addDoor,
  addSignBoard,
  addTree,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type MovingPart,
  type Triple,
} from "./attraction-kit.js";

const stone = "#b8ad99";
const stoneDark = "#968c7a";
const stoneLight = "#cfc6b3";
const slitDark = "#26231f";
const oak = "#6b4a2e";
const oakDark = "#4c3320";
const iron = "#2f3033";
const bannerRed = "#a3242c";
const bannerBlue = "#2d4e8a";
const heraldGold = "#d9a93a";
const moatWater = "#3f7f86";
const moatBed = "#2c4a3c";
const yardEarth = "#b9a682";

const half = 5.4;
const wallHeight = 2.8;
const wallThick = 0.7;
const towerRadius = 1.2;
const towerHeight = 4.1;
const gateHalf = 1.9;
const gateFront = 8.7;
const gateBack = half - 1;
const archHalf = 0.8;
const archSpring = 1.6;
const gateHeight = 3.7;
const moatInner = 9.05;
const moatOuter = 11.95;
const kerb = 0.24;
const bridgeHalf = 0.95;
const bridgeTop = 0.3;
const bridgeEnd = 12.5;
const rampEnd = 13.3;
const keepAt = { x: 0, z: -1.7 };
const keepHalf = 2;
const keepHeight = 5.6;
const wellAt = { x: 3.1, z: 2.3 };
const drumAt = { x: 2.1, z: 7.75 };
const drumRadius = 0.92;
const corners: readonly LocalPoint[] = [
  { x: -half, z: -half },
  { x: half, z: -half },
  { x: -half, z: half },
  { x: half, z: half },
];

/** Battlements: merlons along a line, the line's outside to the left. */
const addMerlons = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
  y: number,
  colour = stone,
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2;
  const count = Math.max(1, Math.round(length / 0.66));
  for (let index = 0; index < count; index++) {
    const share = (index + 0.5) / count;
    builder.box(
      "matte",
      index % 3 === 1 ? shade(colour, 0.95) : colour,
      [0.36, 0.44, 0.24],
      [
        from.x + (to.x - from.x) * share,
        y + 0.22,
        from.z + (to.z - from.z) * share,
      ],
      [0, turn, 0],
    );
  }
};

/** A cross-shaped arrow slit on a face looking out along `turn`. */
const addArrowSlit = (builder: AttractionBuilder, at: Triple, turn: number) => {
  if (builder.isFar) {
    return;
  }
  const rotation: Triple = [0, turn, 0];
  builder.box("matte", slitDark, [0.08, 0.56, 0.06], at, rotation);
  builder.box(
    "matte",
    slitDark,
    [0.26, 0.07, 0.06],
    [at[0], at[1] + 0.06, at[2]],
    rotation,
  );
};

/** A round tower, batter at the foot, corbels and battlements on top. */
const addRoundTower = (
  builder: AttractionBuilder,
  at: LocalPoint,
  radius: number,
  height: number,
  slitTurns: readonly number[],
  base = 0,
) => {
  const segments = builder.segments(
    radius < 0.6 ? 10 : 18,
    radius < 0.6 ? 8 : 12,
  );
  builder.lathe(
    "matte",
    base > 0 ? stoneLight : stone,
    [
      ...(base > 0
        ? [[radius * 0.4, base] as const, [radius, base + 0.4] as const]
        : [
            [radius + 0.24, 0] as const,
            [radius + 0.02, 0.75] as const,
            [radius, 0.8] as const,
          ]),
      [radius, height - 0.3],
      [radius + 0.16, height - 0.08],
      [radius + 0.16, height],
      [0, height],
    ],
    [at.x, 0, at.z],
    "y",
    segments,
  );
  if (!builder.isFar && base === 0) {
    builder.cylinder("matte", stoneLight, {
      radius: radius + 0.03,
      length: 0.12,
      at: [at.x, height * 0.48, at.z],
      segments,
      isOpen: true,
    });
  }
  const merlons = Math.max(4, Math.round(radius * 6.5));
  for (let index = 0; index < merlons; index++) {
    const angle = (index / merlons) * Math.PI * 2;
    builder.box(
      "matte",
      stone,
      [0.36, 0.44, 0.22],
      [
        at.x + Math.sin(angle) * (radius + 0.04),
        height + 0.22,
        at.z + Math.cos(angle) * (radius + 0.04),
      ],
      [0, angle, 0],
    );
  }
  slitTurns.forEach((turn) => {
    [1.5, 2.8].forEach((up) => {
      addArrowSlit(
        builder,
        [
          at.x + Math.sin(turn) * (radius - 0.01),
          up,
          at.z + Math.cos(turn) * (radius - 0.01),
        ],
        turn,
      );
    });
  });
};

/** A flag on a pole, flying towards +x. */
const addFlag = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  trim: string,
) => {
  builder.cylinder("paint", oakDark, {
    radius: 0.04,
    length: 1.7,
    at: [at[0], at[1] + 0.85, at[2]],
    segments: 6,
  });
  builder.sphere(
    "metal",
    heraldGold,
    0.07,
    [at[0], at[1] + 1.74, at[2]],
    [1, 1, 1],
    8,
  );
  builder.box(
    "matte",
    colour,
    [0.9, 0.52, 0.03],
    [at[0] + 0.47, at[1] + 1.38, at[2]],
    [0, 0.12, -0.04],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      trim,
      [0.9, 0.1, 0.035],
      [at[0] + 0.47, at[1] + 1.38, at[2]],
      [0, 0.12, -0.04],
    );
  }
};

const buildMoat = (builder: AttractionBuilder) => {
  const segments = builder.segments(48, 40);
  const ring = (
    inner: number,
    outer: number,
    y: number,
    colour: string,
    finish: "matte" | "water",
  ) => {
    builder.add(finish, colour, new RingGeometry(inner, outer, segments, 1), {
      at: [0, y, 0],
      rotation: [-Math.PI / 2, 0, 0],
    });
  };
  ring(moatInner, moatOuter, 0.035, moatBed, "matte");
  ring(moatInner + 0.1, moatOuter - 0.1, 0.11, moatWater, "water");
  [
    [moatInner - 0.28, moatInner + 0.02],
    [moatOuter - 0.02, moatOuter + 0.28],
  ].forEach(([inner, outer]) => {
    builder.lathe(
      "matte",
      stoneDark,
      [
        [outer, 0],
        [outer, kerb - 0.04],
        [outer - 0.04, kerb],
        [inner + 0.04, kerb],
        [inner, kerb - 0.04],
        [inner, 0],
      ],
      [0, 0, 0],
      "y",
      segments,
    );
  });
};

const buildDrawbridge = (builder: AttractionBuilder) => {
  const length = bridgeEnd - gateFront;
  const middle = (bridgeEnd + gateFront) / 2;
  builder.box(
    "matte",
    oakDark,
    [bridgeHalf * 2, 0.12, length],
    [0, bridgeTop - 0.1, middle],
  );
  const planks = builder.isFar ? 1 : 12;
  for (let plank = 0; plank < planks; plank++) {
    const size = length / planks;
    builder.box(
      "matte",
      plank % 2 === 0 ? oak : shade(oak, 0.9),
      [bridgeHalf * 2 - 0.04, 0.05, size - 0.03],
      [0, bridgeTop - 0.025, gateFront + size * (plank + 0.5)],
    );
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      iron,
      [0.08, 0.1, length],
      [side * (bridgeHalf - 0.04), bridgeTop - 0.02, middle],
    );
    builder.box(
      "matte",
      oakDark,
      [0.18, 0.22, length],
      [side * (bridgeHalf - 0.12), bridgeTop - 0.2, middle],
    );
    const anchor: Triple = [
      side * (bridgeHalf - 0.06),
      bridgeTop + 0.04,
      bridgeEnd - 0.2,
    ];
    const pulley: Triple = [side * 1.3, 3.05, gateFront + 0.04];
    builder.bar("metal", iron, anchor, pulley, 0.035, 4);
    if (!builder.isFar) {
      const links = 15;
      for (let link = 0; link < links; link += 2) {
        const from = link / links;
        const to = (link + 1) / links;
        builder.bar(
          "metal",
          iron,
          [
            anchor[0] + (pulley[0] - anchor[0]) * from,
            anchor[1] + (pulley[1] - anchor[1]) * from,
            anchor[2] + (pulley[2] - anchor[2]) * from,
          ],
          [
            anchor[0] + (pulley[0] - anchor[0]) * to,
            anchor[1] + (pulley[1] - anchor[1]) * to,
            anchor[2] + (pulley[2] - anchor[2]) * to,
          ],
          0.075,
          4,
        );
      }
      builder.box("metal", iron, [0.16, 0.08, 0.14], anchor);
      builder.cylinder("metal", iron, {
        radius: 0.12,
        length: 0.08,
        at: pulley,
        axis: "x",
        segments: 10,
      });
    }
  });
  builder.box(
    "matte",
    stoneDark,
    [bridgeHalf * 2 + 0.5, bridgeTop, 0.5],
    [0, bridgeTop / 2, bridgeEnd - 0.1],
  );
  const rampLength = rampEnd - bridgeEnd;
  builder.box(
    "matte",
    palette.gravel,
    [bridgeHalf * 2 + 0.3, 0.08, Math.hypot(rampLength, bridgeTop)],
    [0, bridgeTop / 2 - 0.03, (bridgeEnd + rampEnd) / 2],
    [Math.atan2(bridgeTop, rampLength), 0, 0],
  );
  builder.box(
    "matte",
    palette.path,
    [1.7, 0.03, 0.9],
    [0, 0.015, rampEnd + 0.4],
  );
};

const archShape = (): Shape => {
  const shape = new Shape();
  shape.moveTo(-gateHalf, 0);
  shape.lineTo(-archHalf, 0);
  shape.lineTo(-archHalf, archSpring);
  shape.absarc(0, archSpring, archHalf, Math.PI, 0, true);
  shape.lineTo(archHalf, 0);
  shape.lineTo(gateHalf, 0);
  shape.lineTo(gateHalf, gateHeight);
  shape.lineTo(-gateHalf, gateHeight);
  shape.lineTo(-gateHalf, 0);
  return shape;
};

const buildGatehouse = (builder: AttractionBuilder) => {
  builder.endPlate("matte", stone, archShape(), gateBack, gateFront);
  builder.box(
    "matte",
    palette.paving,
    [archHalf * 2, 0.04, gateFront - gateBack],
    [0, 0.02, (gateFront + gateBack) / 2],
  );
  addMerlons(
    builder,
    { x: gateHalf, z: gateFront - 0.12 },
    { x: -gateHalf, z: gateFront - 0.12 },
    gateHeight,
  );
  addMerlons(
    builder,
    { x: -gateHalf, z: gateBack + 0.12 },
    { x: gateHalf, z: gateBack + 0.12 },
    gateHeight,
  );
  [-1, 1].forEach((side) => {
    addMerlons(
      builder,
      {
        x: side * (gateHalf - 0.12),
        z: side > 0 ? gateFront - 0.5 : gateBack + 0.5,
      },
      {
        x: side * (gateHalf - 0.12),
        z: side > 0 ? gateBack + 0.5 : gateFront - 0.5,
      },
      gateHeight,
    );
  });
  [-1, 1].forEach((side) => {
    addRoundTower(
      builder,
      { x: side * drumAt.x, z: drumAt.z },
      drumRadius,
      4.4,
      [side * 0.9, side * 1.9],
    );
  });
  if (builder.isFar) {
    return;
  }
  const blocks = 11;
  for (let block = 0; block < blocks; block++) {
    const angle = Math.PI - (block / (blocks - 1)) * Math.PI;
    builder.box(
      "matte",
      block % 2 === 0 ? stoneLight : shade(stoneLight, 0.94),
      [0.2, 0.3, 0.08],
      [
        Math.cos(angle) * (archHalf + 0.13),
        archSpring + Math.sin(angle) * (archHalf + 0.13),
        gateFront + 0.03,
      ],
      [0, 0, angle - Math.PI / 2],
    );
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      stoneLight,
      [0.24, archSpring, 0.08],
      [side * (archHalf + 0.13), archSpring / 2, gateFront + 0.03],
    );
  });
  const portcullisZ = gateFront - 0.35;
  for (let bar = -3; bar <= 3; bar++) {
    builder.box(
      "metal",
      iron,
      [0.06, 0.62, 0.06],
      [bar * 0.21, archSpring + 0.35, portcullisZ],
    );
    builder.cylinder("metal", iron, {
      radius: 0.035,
      radiusEnd: 0.001,
      length: 0.12,
      at: [bar * 0.21, archSpring - 0.02, portcullisZ],
      segments: 5,
    });
  }
  [archSpring + 0.18, archSpring + 0.5].forEach((up) => {
    builder.box(
      "metal",
      iron,
      [archHalf * 2, 0.05, 0.05],
      [0, up, portcullisZ],
    );
  });
  builder.box(
    "matte",
    slitDark,
    [archHalf * 2 + 0.02, 0.06, 0.1],
    [0, archSpring + 0.82, portcullisZ],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      oak,
      [0.07, archSpring + 0.6, archHalf * 0.95],
      [side * (archHalf - 0.06), (archSpring + 0.6) / 2, gateBack + 0.7],
    );
  });
  builder.roundedBox("paint", bannerBlue, [0.62, 0.72, 0.06], 0.03, [
    0,
    2.95,
    gateFront + 0.04,
  ]);
  builder.box(
    "paint",
    heraldGold,
    [0.08, 0.6, 0.02],
    [0, 2.95, gateFront + 0.08],
  );
  builder.box(
    "paint",
    heraldGold,
    [0.5, 0.08, 0.02],
    [0, 3.05, gateFront + 0.08],
  );
  [-1, 1].forEach((side) => {
    const x = side * 1.38;
    builder.box(
      "matte",
      bannerRed,
      [0.46, 1.3, 0.03],
      [x, 2.45, gateFront + 0.06],
    );
    builder.box(
      "matte",
      heraldGold,
      [0.08, 1.3, 0.035],
      [x, 2.45, gateFront + 0.065],
    );
    builder.cylinder("paint", oakDark, {
      radius: 0.025,
      length: 0.6,
      at: [x, 3.12, gateFront + 0.08],
      axis: "x",
      segments: 6,
    });
    builder.cylinder("matte", bannerRed, {
      radius: 0.23,
      radiusEnd: 0.001,
      length: 0.25,
      at: [x, 1.68, gateFront + 0.06],
      segments: 3,
    });
    const torch = torchSpot(side);
    builder.bar(
      "metal",
      iron,
      [torch[0], torch[1] - 0.35, gateFront + 0.02],
      [torch[0], torch[1] - 0.08, torch[2]],
      0.04,
      5,
    );
    builder.cylinder("metal", iron, {
      radius: 0.07,
      radiusEnd: 0.04,
      length: 0.12,
      at: [torch[0], torch[1] - 0.04, torch[2]],
      segments: 8,
    });
  });
};

const torchSpot = (side: number): Triple => [
  side * 1.05,
  1.78,
  gateFront + 0.26,
];

const buildTorchFlame = (builder: AttractionBuilder) => {
  builder.cylinder("glow", "#ff8a2a", {
    radius: 0.075,
    radiusEnd: 0.005,
    length: 0.26,
    at: [0, 0.13, 0],
    segments: 8,
  });
  builder.sphere("glow", "#ffd36a", 0.055, [0, 0.07, 0], [1, 1.3, 1], 8);
};

const buildWalls = (builder: AttractionBuilder) => {
  const outer = half + wallThick / 2 - 0.12;
  builder.box(
    "matte",
    stone,
    [half * 2, wallHeight, wallThick],
    [0, wallHeight / 2, -half],
  );
  addMerlons(
    builder,
    { x: half, z: -outer },
    { x: -half, z: -outer },
    wallHeight,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      stone,
      [wallThick, wallHeight, half * 2],
      [side * half, wallHeight / 2, 0],
    );
    const length = half - gateHalf;
    builder.box(
      "matte",
      stone,
      [length, wallHeight, wallThick],
      [side * (gateHalf + length / 2), wallHeight / 2, half],
    );
    addMerlons(
      builder,
      { x: side * outer, z: side > 0 ? half : -half },
      { x: side * outer, z: side > 0 ? -half : half },
      wallHeight,
    );
    addMerlons(
      builder,
      { x: side > 0 ? gateHalf : -half, z: outer },
      { x: side > 0 ? half : -gateHalf, z: outer },
      wallHeight,
    );
  });
  const plinth = 0.5;
  builder.box(
    "matte",
    stoneDark,
    [half * 2, plinth, wallThick + 0.2],
    [0, plinth / 2, -half],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      stoneDark,
      [wallThick + 0.2, plinth, half * 2],
      [side * half, plinth / 2, 0],
    );
    builder.box(
      "matte",
      stoneDark,
      [half - gateHalf, plinth, wallThick + 0.2],
      [(side * (half + gateHalf)) / 2, plinth / 2, half],
    );
  });
  builder.box(
    "matte",
    stoneDark,
    [gateHalf * 2 + 0.2, plinth, gateFront - gateBack + 0.1],
    [0, plinth / 2 - 0.001, (gateFront + gateBack) / 2],
  );
  corners.forEach((corner) => {
    const outward = Math.atan2(corner.x, corner.z);
    addRoundTower(builder, corner, towerRadius, towerHeight, [
      outward - 0.75,
      outward + 0.75,
    ]);
    if (corner.z < 0) {
      addFlag(
        builder,
        [corner.x, towerHeight, corner.z],
        corner.x < 0 ? bannerRed : bannerBlue,
        heraldGold,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      stoneLight,
      [half * 2, 0.1, wallThick + 0.04],
      [0, wallHeight * 0.55, -half],
    );
    builder.box(
      "matte",
      stoneLight,
      [wallThick + 0.04, 0.1, half * 2],
      [side * half, wallHeight * 0.55, 0],
    );
    builder.box(
      "matte",
      stoneLight,
      [half - gateHalf, 0.1, wallThick + 0.04],
      [(side * (half + gateHalf)) / 2, wallHeight * 0.55, half],
    );
    builder.box(
      "matte",
      stoneDark,
      [0.12, 0.14, half * 2 - 2],
      [side * (half - wallThick / 2 + 0.06), wallHeight + 0.07, 0],
    );
    [-2.4, 0, 2.4].forEach((along) => {
      addArrowSlit(
        builder,
        [side * (half + wallThick / 2 + 0.005), 1.75, along],
        side * (Math.PI / 2),
      );
      addArrowSlit(
        builder,
        [along, 1.75, -half - wallThick / 2 - 0.005],
        Math.PI,
      );
    });
    addArrowSlit(builder, [side * 3.7, 1.75, half + wallThick / 2 + 0.005], 0);
  });
  builder.box(
    "matte",
    stoneDark,
    [half * 2 - 2, 0.14, 0.12],
    [0, wallHeight + 0.07, -half + wallThick / 2 - 0.06],
  );
  const steps = 9;
  for (let step = 0; step < steps; step++) {
    const rise = ((step + 1) / steps) * wallHeight;
    builder.box(
      "matte",
      step % 2 === 0 ? stoneDark : shade(stoneDark, 1.06),
      [0.7, rise, 0.36],
      [-half + wallThick / 2 + 0.35, rise / 2, 1.6 - step * 0.36],
    );
  }
};

const buildKeep = (builder: AttractionBuilder) => {
  const { x, z } = keepAt;
  const size = keepHalf * 2;
  builder.box("matte", stone, [size, keepHeight, size], [x, keepHeight / 2, z]);
  builder.box("matte", stoneDark, [size + 0.3, 0.6, size + 0.3], [x, 0.3, z]);
  const outer = keepHalf - 0.12;
  const top = keepHeight;
  addMerlons(
    builder,
    { x: x + outer, z: z + outer },
    { x: x - outer, z: z + outer },
    top,
  );
  addMerlons(
    builder,
    { x: x - outer, z: z - outer },
    { x: x + outer, z: z - outer },
    top,
  );
  addMerlons(
    builder,
    { x: x - outer, z: z + outer },
    { x: x - outer, z: z - outer },
    top,
  );
  addMerlons(
    builder,
    { x: x + outer, z: z - outer },
    { x: x + outer, z: z + outer },
    top,
  );
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      const cornerX = x + sideX * (keepHalf - 0.05);
      const cornerZ = z + sideZ * (keepHalf - 0.05);
      builder.box(
        "matte",
        stoneLight,
        [0.5, keepHeight, 0.5],
        [cornerX, keepHeight / 2, cornerZ],
      );
      addRoundTower(
        builder,
        { x: x + sideX * (keepHalf - 0.1), z: z + sideZ * (keepHalf - 0.1) },
        0.42,
        keepHeight + 0.9,
        [],
        keepHeight - 0.4,
      );
    });
  });
  addFlag(builder, [x, top, z], bannerRed, heraldGold);
  if (builder.isFar) {
    builder.box(
      "matte",
      slitDark,
      [0.5, 0.9, 0.04],
      [x, 0.65 + 0.45, z + keepHalf + 0.01],
    );
    return;
  }
  [1.3, 2.9].forEach((up) => {
    builder.box(
      "matte",
      stoneLight,
      [size + 0.06, 0.1, size + 0.06],
      [x, up, z],
    );
  });
  const windowAt = (turn: number, along: number, up: number, isLit = false) => {
    const pane = isLit ? "#e9a94e" : slitDark;
    const finish = isLit ? "glow" : "matte";
    const out = keepHalf + 0.005;
    const at: Triple = [
      x + Math.sin(turn) * out + Math.cos(turn) * along,
      up,
      z + Math.cos(turn) * out - Math.sin(turn) * along,
    ];
    builder.box(finish, pane, [0.3, 0.5, 0.04], at, [0, turn, 0]);
    builder.cylinder(finish, pane, {
      radius: 0.15,
      length: 0.04,
      at: [at[0], up + 0.25, at[2]],
      axis: Math.abs(Math.sin(turn)) > 0.5 ? "x" : "z",
      segments: 8,
    });
    builder.box(
      "matte",
      stoneLight,
      [0.44, 0.07, 0.08],
      [at[0], up - 0.27, at[2]],
      [0, turn, 0],
    );
  };
  [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((turn) => {
    [-0.8, 0.8].forEach((along) => {
      windowAt(turn, along, 3.6, turn === 0 && along > 0);
    });
    if (turn !== 0) {
      windowAt(turn, 0, 2.15);
    }
  });
  windowAt(0, 0, 4.6, true);
  addDoor(builder, {
    at: [x, 0.6, z + keepHalf + 0.01],
    width: 0.62,
    height: 1.1,
    colour: oak,
    frame: stoneLight,
  });
  for (let step = 0; step < 4; step++) {
    builder.box(
      "matte",
      stoneDark,
      [1.3 - step * 0.05, 0.15, 0.32],
      [x, 0.075 + step * 0.15, z + keepHalf + 1.2 - step * 0.3],
    );
  }
};

const buildYard = (builder: AttractionBuilder) => {
  const inner = half - wallThick / 2;
  builder.box("matte", yardEarth, [inner * 2, 0.03, inner * 2], [0, 0.015, 0]);
  builder.box(
    "matte",
    palette.paving,
    [1.5, 0.035, gateBack - keepAt.z - keepHalf - 1.3],
    [0, 0.03, (gateBack + keepAt.z + keepHalf + 1.3) / 2],
  );
  const { x, z } = wellAt;
  builder.lathe(
    "matte",
    stoneDark,
    [
      [0.62, 0],
      [0.62, 0.55],
      [0.48, 0.6],
      [0.46, 0.2],
    ],
    [x, 0, z],
    "y",
    16,
  );
  builder.cylinder("water", moatWater, {
    radius: 0.47,
    length: 0.02,
    at: [x, 0.3, z],
    segments: 14,
  });
  [-1, 1].forEach((side) => {
    builder.box("matte", oak, [0.08, 1.35, 0.08], [x + side * 0.55, 0.68, z]);
  });
  if (!builder.isFar) {
    builder.cylinder("matte", oak, {
      radius: 0.06,
      length: 1.2,
      at: [x, 1.05, z],
      axis: "x",
      segments: 8,
    });
    builder.bar("matte", "#b39c6e", [x, 1.0, z], [x, 0.62, z], 0.015, 4);
    builder.cylinder("matte", oakDark, {
      radius: 0.09,
      radiusEnd: 0.11,
      length: 0.16,
      at: [x, 0.58, z],
      segments: 8,
    });
  }
  builder.box(
    "matte",
    palette.roofTile,
    [1.5, 0.05, 0.7],
    [x, 1.5, z + 0.24],
    [0.6, 0, 0],
  );
  builder.box(
    "matte",
    palette.roofTile,
    [1.5, 0.05, 0.7],
    [x, 1.5, z - 0.24],
    [-0.6, 0, 0],
  );
  if (builder.isFar) {
    return;
  }
  const barrels: Triple[] = [
    [-3.7, 0, -4.2],
    [-3.15, 0, -4.35],
    [-3.45, 0, -3.75],
    [3.9, 0, -3.9],
  ];
  barrels.forEach(([barrelX, , barrelZ], index) => {
    builder.lathe(
      "matte",
      index % 2 === 0 ? oak : shade(oak, 1.1),
      [
        [0, 0],
        [0.2, 0],
        [0.25, 0.25],
        [0.2, 0.5],
        [0, 0.5],
      ],
      [barrelX, 0, barrelZ],
      "y",
      10,
    );
    builder.cylinder("metal", iron, {
      radius: 0.235,
      length: 0.04,
      at: [barrelX, 0.12, barrelZ],
      segments: 10,
      isOpen: true,
    });
    builder.cylinder("metal", iron, {
      radius: 0.235,
      length: 0.04,
      at: [barrelX, 0.38, barrelZ],
      segments: 10,
      isOpen: true,
    });
  });
  builder.box(
    "matte",
    "#d8bd6a",
    [0.9, 0.5, 0.55],
    [3.6, 0.25, -3.3],
    [0, 0.4, 0],
  );
  builder.box(
    "matte",
    "#cdb060",
    [0.9, 0.5, 0.55],
    [3.75, 0.72, -3.35],
    [0, 0.2, 0],
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  addTree(builder, [-9.4, 0, -9.4], 1.2);
  addTree(builder, [10.4, 0, -7.9], 1.05, "#4a9440");
  addBush(builder, [-12.2, 0, 4.4], 0.6, "#3c8237");
  addBush(builder, [-11.6, 0, 5.5], 0.42);
  addBush(builder, [12.4, 0, 3.8], 0.55);
  addBush(builder, [-4.6, 0, 12.6], 0.5, "#3a7d34");
  addBush(builder, [5.4, 0, 12.4], 0.45);
  addBush(builder, [-2.9, 0, 13.1], 0.38, "#3a7d34");
  if (!builder.isFar) {
    [
      [-7.3, 9.4],
      [8.9, 6.9],
      [-11.2, -6.5],
    ].forEach(([rockX, rockZ], index) => {
      builder.sphere(
        "matte",
        index === 1 ? stoneDark : "#8e8676",
        0.32,
        [rockX, 0.08, rockZ],
        [1.3, 0.6, 1],
        8,
      );
    });
  }
  addSignBoard(builder, [2.3, 0, 12.9], bannerBlue);
};

const buildSwan = (builder: AttractionBuilder) => {
  const white = "#f3f1ec";
  builder.sphere("matte", white, 0.2, [0, 0.12, 0], [0.85, 0.6, 1.3], 10);
  builder.sphere(
    "matte",
    shade(white, 0.95),
    0.15,
    [0, 0.2, -0.08],
    [1.05, 0.55, 1.2],
    8,
  );
  builder.bar("matte", white, [0, 0.18, 0.2], [0, 0.42, 0.24], 0.07, 6);
  builder.bar("matte", white, [0, 0.42, 0.24], [0, 0.56, 0.18], 0.06, 6);
  builder.sphere("matte", white, 0.055, [0, 0.57, 0.22], [1, 1, 1.3], 8);
  builder.cylinder("matte", "#e07a26", {
    radius: 0.025,
    radiusEnd: 0.005,
    length: 0.11,
    at: [0, 0.55, 0.32],
    axis: "z",
    segments: 6,
  });
  builder.box("matte", palette.black, [0.07, 0.04, 0.04], [0, 0.575, 0.27]);
};

const towerBlockers: LocalBlocker[] = corners.map((corner) => ({
  x: corner.x,
  z: corner.z,
  radius: towerRadius + 0.15,
}));

const moatBlockers: LocalBlocker[] = Array.from({ length: 44 }, (_, index) => {
  const angle = (index / 44) * Math.PI * 2;
  return { x: Math.sin(angle) * 10.5, z: Math.cos(angle) * 10.5, radius: 1.3 };
}).filter((blocker) => blocker.z < 0 || Math.abs(blocker.x) > bridgeHalf + 1.4);

const castleBlockers: LocalBlocker[] = [
  ...listWallBlockers({ x: -half, z: -half }, { x: half, z: -half }, 0.55, 0.7),
  ...listWallBlockers({ x: -half, z: -half }, { x: -half, z: half }, 0.55, 0.7),
  ...listWallBlockers({ x: half, z: -half }, { x: half, z: half }, 0.55, 0.7),
  ...listWallBlockers(
    { x: -half, z: half },
    { x: -gateHalf, z: half },
    0.55,
    0.7,
  ),
  ...listWallBlockers(
    { x: gateHalf, z: half },
    { x: half, z: half },
    0.55,
    0.7,
  ),
  ...listWallBlockers(
    { x: -1.4, z: gateBack },
    { x: -1.4, z: gateFront },
    0.5,
    0.6,
  ),
  ...listWallBlockers(
    { x: 1.4, z: gateBack },
    { x: 1.4, z: gateFront },
    0.5,
    0.6,
  ),
  ...listWallBlockers({ x: -4.35, z: 1.6 }, { x: -4.35, z: -1.3 }, 0.4, 0.6),
  ...towerBlockers,
  { x: -drumAt.x, z: drumAt.z, radius: drumRadius + 0.1 },
  { x: drumAt.x, z: drumAt.z, radius: drumRadius + 0.1 },
  { x: keepAt.x - 1, z: keepAt.z - 1, radius: 1.45 },
  { x: keepAt.x + 1, z: keepAt.z - 1, radius: 1.45 },
  { x: keepAt.x - 1, z: keepAt.z + 1, radius: 1.45 },
  { x: keepAt.x + 1, z: keepAt.z + 1, radius: 1.45 },
  { x: wellAt.x, z: wellAt.z, radius: 0.7 },
  ...[8.9, 9.8, 10.7, 11.6, 12.4].flatMap((z) => [
    { x: -(bridgeHalf + 0.6), z, radius: 0.5 },
    { x: bridgeHalf + 0.6, z, radius: 0.5 },
  ]),
  ...moatBlockers,
];

const drawbridgeDeck: Deck = ({ x, z }) => {
  if (Math.abs(x) > bridgeHalf || z < gateFront - 0.05 || z > rampEnd) {
    return undefined;
  }
  if (z <= bridgeEnd) {
    return { height: bridgeTop, kind: "bridge" };
  }
  return {
    height: (bridgeTop * (rampEnd - z)) / (rampEnd - bridgeEnd),
    kind: "bridge",
  };
};

const keepStepsDeck: Deck = ({ x, z }) => {
  const front = keepAt.z + keepHalf;
  const foot = front + 1.36;
  if (Math.abs(x - keepAt.x) > 0.6 || z < front || z > foot) {
    return undefined;
  }
  const step = Math.min(4, Math.floor((foot - z) / 0.3) + 1);
  return { height: step * 0.15, kind: "ground" };
};

const torches: MovingPart[] = [-1, 1].map((side) => ({
  name: `gate-torch-${side < 0 ? "left" : "right"}`,
  pivot: torchSpot(side),
  build: buildTorchFlame,
  motion: { kind: "flicker", period: 0.7 + side * 0.08, phase: side },
}));

export const castleModel: AttractionModel = {
  kind: "castle",
  name: "Castle",
  fact: "After 1066 the Normans built castles all over England. The first were wooden, but many were rebuilt in stone, with thick walls, tall towers and a strong keep in the middle. A water-filled moat and a drawbridge that could be pulled up helped keep enemies out.",
  curriculumLink:
    "History, Key Stage 2: a study of British history beyond 1066. The Norman Conquest and the castles the Normans built.",
  footprint: 14,
  setting: "inland",
  signSpot: { x: 2.3, z: 13.5 },
  build: (builder) => {
    buildMoat(builder);
    buildYard(builder);
    buildWalls(builder);
    buildGatehouse(builder);
    buildDrawbridge(builder);
    buildKeep(builder);
    buildGrounds(builder);
  },
  moving: torches,
  wanderers: [
    {
      name: "swans",
      build: buildSwan,
      count: 2,
      centre: { x: -7.42, z: -7.42 },
      radius: 0.9,
      speed: 0.25,
      height: 0.11,
    },
  ],
  blockers: castleBlockers,
  decks: [drawbridgeDeck, keepStepsDeck],
};
