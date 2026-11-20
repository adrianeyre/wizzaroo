import { CylinderGeometry } from "three";
import {
  addFence,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const latticeSilver = "#b9c3d1";
const latticeDark = "#5d6878";
const copper = "#c8743c";
const copperDark = "#8e4a22";
const coilDark = "#2a2f4a";
const sparkBlue = "#9fe6ff";
const sparkViolet = "#d6b4ff";
const hazardYellow = "#f2c230";
const plinthGrey = "#6f7787";
const cabinetBlue = "#33457a";
const benchTimber = "#4b3a5c";
const bulbGlass = "#dfe8f5";
const bulbGlow = "#ffe9a0";
const cellRed = "#d2453a";
const signColour = "#3a3f8f";

/* The tower stands at the back; the switch and the bulb bench face visitors. */
const towerAt = { x: 0, z: -1.0 };
const towerHeight = 4.2;
const legBottom = 0.75;
const legTop = 0.26;
const coilTop = 5.35;
const ballAt: Triple = [towerAt.x, 5.95, towerAt.z];
const ballRadius = 0.42;
const fenceRadius = 1.75;
const switchAt = { x: 2.1, z: 0.9 };
const leverAt: Triple = [switchAt.x, 0.95, switchAt.z + 0.27];
const bench = { fromX: -2.95, toX: -0.25, z: 1.55, height: 0.72 };

/** How far each tower leg stands from the middle at a height, as it tapers. */
const legHalfAt = (height: number): number =>
  legBottom + (legTop - legBottom) * (height / towerHeight);

const cornerAt = (height: number, sideX: number, sideZ: number): Triple => [
  towerAt.x + sideX * legHalfAt(height),
  height,
  towerAt.z + sideZ * legHalfAt(height),
];

const buildTower = (builder: AttractionBuilder) => {
  /* A concrete plinth with a hazard-striped skirt */
  builder.box(
    "matte",
    plinthGrey,
    [legBottom * 2 + 0.5, 0.3, legBottom * 2 + 0.5],
    [towerAt.x, 0.15, towerAt.z],
  );
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  corners.forEach(([sideX, sideZ]) => {
    builder.bar(
      "metal",
      latticeSilver,
      cornerAt(0.3, sideX, sideZ),
      cornerAt(towerHeight, sideX, sideZ),
      0.09,
      8,
    );
  });
  /* The coil: a dark former wound with copper, on a platform */
  builder.box(
    "metal",
    latticeDark,
    [legTop * 2 + 0.3, 0.1, legTop * 2 + 0.3],
    [towerAt.x, towerHeight + 0.05, towerAt.z],
  );
  builder.cylinder("paint", coilDark, {
    radius: 0.2,
    length: coilTop - towerHeight,
    at: [towerAt.x, (coilTop + towerHeight) / 2, towerAt.z],
    segments: 16,
  });
  builder.sphere(
    "metal",
    copper,
    ballRadius,
    ballAt,
    [1, 1, 1],
    builder.isFar ? 12 : 20,
  );
  if (builder.isFar) {
    return;
  }
  /* Hazard stripes round the plinth */
  for (let stripe = 0; stripe < 8; stripe++) {
    const along = -legBottom - 0.15 + stripe * 0.27;
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        stripe % 2 === 0 ? hazardYellow : palette.black,
        [0.27, 0.12, 0.02],
        [towerAt.x + along, 0.2, towerAt.z + side * (legBottom + 0.26)],
      );
      builder.box(
        "paint",
        stripe % 2 === 0 ? palette.black : hazardYellow,
        [0.02, 0.12, 0.27],
        [towerAt.x + side * (legBottom + 0.26), 0.2, towerAt.z + along],
      );
    });
  }
  /* Lattice: rings of girders and crossed braces on every face */
  const levels = [0.3, 1.3, 2.3, 3.3, towerHeight];
  levels.forEach((height, level) => {
    corners.forEach(([sideX, sideZ], index) => {
      const [nextX, nextZ] = corners[(index + 1) % corners.length];
      builder.bar(
        "metal",
        latticeDark,
        cornerAt(height, sideX, sideZ),
        cornerAt(height, nextX, nextZ),
        0.06,
        4,
      );
      if (level === levels.length - 1) {
        return;
      }
      const above = levels[level + 1];
      builder.bar(
        "metal",
        latticeSilver,
        cornerAt(height, sideX, sideZ),
        cornerAt(above, nextX, nextZ),
        0.04,
        4,
      );
      builder.bar(
        "metal",
        latticeSilver,
        cornerAt(height, nextX, nextZ),
        cornerAt(above, sideX, sideZ),
        0.04,
        4,
      );
    });
  });
  /* Feet bolted to the plinth */
  corners.forEach(([sideX, sideZ]) => {
    const [x, , z] = cornerAt(0.3, sideX, sideZ);
    builder.box("metal", latticeDark, [0.26, 0.05, 0.26], [x, 0.32, z]);
  });
  /* Copper windings, banded round the coil */
  const bands = 12;
  for (let band = 0; band < bands; band++) {
    const height =
      towerHeight + 0.15 + band * ((coilTop - towerHeight - 0.25) / bands);
    builder.cylinder("metal", band % 2 === 0 ? copper : copperDark, {
      radius: 0.225,
      length: 0.05,
      at: [towerAt.x, height, towerAt.z],
      segments: 16,
      isOpen: true,
    });
  }
  /* The silver top load ring, and the ball's collar */
  builder.torus(
    "metal",
    latticeSilver,
    0.5,
    0.1,
    [towerAt.x, coilTop + 0.12, towerAt.z],
    "y",
    28,
  );
  builder.cylinder("metal", copperDark, {
    radius: 0.14,
    length: 0.3,
    at: [towerAt.x, coilTop + 0.2, towerAt.z],
    segments: 12,
  });
  /* A red beacon on a little mast above the ball */
  builder.bar(
    "metal",
    latticeDark,
    [ballAt[0], ballAt[1] + ballRadius - 0.02, ballAt[2]],
    [ballAt[0], ballAt[1] + ballRadius + 0.35, ballAt[2]],
    0.03,
    4,
  );
  builder.sphere(
    "glow",
    "#ff5a4a",
    0.06,
    [ballAt[0], ballAt[1] + ballRadius + 0.38, ballAt[2]],
    [1, 1, 1],
    8,
  );
  /* An access ladder up one face */
  [-0.18, 0.18].forEach((side) => {
    builder.bar(
      "metal",
      hazardYellow,
      [towerAt.x + side, 0.3, towerAt.z + legBottom + 0.03],
      [towerAt.x + side * 0.7, towerHeight - 0.2, towerAt.z + legTop + 0.12],
      0.035,
      4,
    );
  });
  for (let rung = 0; rung < 11; rung++) {
    const share = (rung + 0.5) / 11;
    const height = 0.3 + share * (towerHeight - 0.5);
    const out = legBottom + 0.03 + (legTop + 0.12 - legBottom - 0.03) * share;
    builder.box(
      "metal",
      hazardYellow,
      [0.36 - share * 0.1, 0.025, 0.025],
      [towerAt.x, height, towerAt.z + out],
    );
  }
};

const buildFenceAndSafety = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const sides = 8;
  for (let side = 0; side < sides; side++) {
    const from = ((side + 0.5) / sides) * Math.PI * 2;
    const to = ((side + 1.5) / sides) * Math.PI * 2;
    addFence(
      builder,
      {
        x: towerAt.x + Math.sin(from) * fenceRadius,
        z: towerAt.z + Math.cos(from) * fenceRadius,
      },
      {
        x: towerAt.x + Math.sin(to) * fenceRadius,
        z: towerAt.z + Math.cos(to) * fenceRadius,
      },
      { colour: hazardYellow, height: 0.75, isPicket: false, spacing: 0.25 },
    );
  }
  /* A yellow warning triangle with a lightning flash, on the fence */
  const warning: Triple = [
    towerAt.x,
    0.62,
    towerAt.z + fenceRadius * 0.93 + 0.05,
  ];
  builder.add(
    "paint",
    hazardYellow,
    new CylinderGeometry(0.24, 0.24, 0.03, 3),
    { at: warning, rotation: [-Math.PI / 2, 0, 0] },
    undefined,
  );
  builder.box(
    "paint",
    palette.black,
    [0.04, 0.16, 0.035],
    [warning[0] + 0.02, warning[1] + 0.03, warning[2]],
    [0, 0, 0.4],
  );
  builder.box(
    "paint",
    palette.black,
    [0.04, 0.14, 0.035],
    [warning[0] - 0.02, warning[1] - 0.07, warning[2]],
    [0, 0, 0.4],
  );
};

const buildSwitchBox = (builder: AttractionBuilder) => {
  const { x, z } = switchAt;
  builder.box("paint", cabinetBlue, [0.75, 1.0, 0.45], [x, 0.7, z]);
  if (builder.isFar) {
    return;
  }
  [-0.3, 0.3].forEach((side) => {
    builder.box("metal", latticeDark, [0.06, 0.25, 0.06], [x + side, 0.12, z]);
  });
  builder.box(
    "paint",
    shade(cabinetBlue, 0.75),
    [0.85, 0.08, 0.55],
    [x, 1.24, z],
  );
  builder.box(
    "paint",
    shade(cabinetBlue, 1.2),
    [0.62, 0.86, 0.02],
    [x, 0.7, z + 0.23],
  );
  /* A voltmeter: a dial with a glowing scale and a needle */
  builder.cylinder("paint", palette.cream, {
    radius: 0.13,
    length: 0.03,
    at: [x - 0.14, 1.0, z + 0.25],
    axis: "z",
    segments: 16,
  });
  builder.box(
    "glow",
    sparkBlue,
    [0.18, 0.02, 0.01],
    [x - 0.14, 1.06, z + 0.27],
  );
  builder.box(
    "paint",
    cellRed,
    [0.012, 0.11, 0.01],
    [x - 0.12, 1.02, z + 0.275],
    [0, 0, -0.5],
  );
  /* Indicator lamps and a hazard band */
  ["#5ee07a", "#ff6a5a"].forEach((colour, index) => {
    builder.sphere(
      "glow",
      colour,
      0.035,
      [x + 0.12 + index * 0.1, 1.08, z + 0.25],
      [1, 1, 0.6],
      8,
    );
  });
  for (let stripe = 0; stripe < 5; stripe++) {
    builder.box(
      "paint",
      stripe % 2 === 0 ? hazardYellow : palette.black,
      [0.124, 0.08, 0.02],
      [x - 0.25 + stripe * 0.124, 0.38, z + 0.245],
    );
  }
  /* The lever's slot and bracket */
  builder.box(
    "paint",
    palette.black,
    [0.08, 0.36, 0.02],
    [leverAt[0], leverAt[1] - 0.05, z + 0.245],
  );
  builder.cylinder("metal", latticeSilver, {
    radius: 0.05,
    length: 0.2,
    at: leverAt,
    axis: "x",
    segments: 10,
  });
};

const buildLever = (builder: AttractionBuilder) => {
  builder.bar("metal", latticeSilver, [0, 0, 0], [0, 0.42, 0.08], 0.04, 6);
  builder.sphere("paint", cellRed, 0.07, [0, 0.45, 0.09], [1, 1, 1], 12);
};

/** Four lamps on a bench, each wired to one more cell than the last. */
const buildBulbBench = (builder: AttractionBuilder) => {
  const { fromX, toX, z, height } = bench;
  const length = toX - fromX;
  const middle = (fromX + toX) / 2;
  builder.box("matte", benchTimber, [length, 0.08, 0.6], [middle, height, z]);
  if (builder.isFar) {
    builder.box(
      "matte",
      shade(benchTimber, 0.8),
      [length - 0.2, height, 0.4],
      [middle, height / 2, z],
    );
    return;
  }
  [fromX + 0.12, toX - 0.12].forEach((x) => {
    [-0.24, 0.24].forEach((dz) => {
      builder.box(
        "matte",
        shade(benchTimber, 0.8),
        [0.07, height, 0.07],
        [x, height / 2, z + dz],
      );
    });
  });
  builder.box(
    "matte",
    shade(benchTimber, 0.8),
    [length - 0.2, 0.05, 0.04],
    [middle, 0.25, z - 0.24],
  );
  [1, 2, 3, 4].forEach((cells, index) => {
    const x = fromX + 0.4 + index * ((length - 0.8) / 3);
    const top = height + 0.04;
    /* The cells in a tray: more cells, more push, a brighter bulb */
    builder.box(
      "paint",
      latticeDark,
      [0.5, 0.04, 0.2],
      [x, top + 0.02, z + 0.12],
    );
    for (let cell = 0; cell < cells; cell++) {
      const cx = x - ((cells - 1) * 0.11) / 2 + cell * 0.11;
      builder.cylinder("paint", cellRed, {
        radius: 0.04,
        length: 0.18,
        at: [cx, top + 0.09, z + 0.12],
        axis: "z",
        segments: 8,
      });
      builder.cylinder("metal", latticeSilver, {
        radius: 0.042,
        length: 0.04,
        at: [cx, top + 0.09, z + 0.2],
        axis: "z",
        segments: 8,
      });
    }
    /* The bulb holder, glass and filament glow */
    builder.cylinder("paint", palette.black, {
      radius: 0.07,
      radiusEnd: 0.05,
      length: 0.1,
      at: [x, top + 0.05, z - 0.12],
      segments: 12,
    });
    builder.cylinder("metal", latticeSilver, {
      radius: 0.045,
      length: 0.08,
      at: [x, top + 0.14, z - 0.12],
      segments: 10,
    });
    builder.sphere(
      "glass",
      bulbGlass,
      0.12,
      [x, top + 0.28, z - 0.12],
      [1, 1.15, 1],
      14,
    );
    builder.sphere(
      "glow",
      bulbGlow,
      0.025 + cells * 0.017,
      [x, top + 0.27, z - 0.12],
      [1, 1, 1],
      10,
    );
    /* Wires from the tray to the lamp */
    builder.bar(
      "paint",
      cellRed,
      [x - 0.2, top + 0.03, z + 0.12],
      [x - 0.05, top + 0.03, z - 0.12],
      0.015,
      4,
    );
    builder.bar(
      "paint",
      palette.black,
      [x + 0.2, top + 0.03, z + 0.12],
      [x + 0.05, top + 0.03, z - 0.12],
      0.015,
      4,
    );
    /* A number plate on the front edge */
    builder.box(
      "paint",
      palette.cream,
      [0.16, 0.1, 0.01],
      [x, height - 0.02, z + 0.305],
    );
    for (let mark = 0; mark < cells; mark++) {
      builder.box(
        "paint",
        palette.black,
        [0.02, 0.06, 0.012],
        [x - ((cells - 1) * 0.03) / 2 + mark * 0.03, height - 0.02, z + 0.31],
      );
    }
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A path up to the switch and the bench */
  builder.box("matte", palette.paving, [1.1, 0.03, 2.6], [1.4, 0.015, 3.0]);
  if (builder.isFar) {
    return;
  }
  /* Cables from the switch to the tower and the bench, in a cable tray */
  builder.box(
    "metal",
    latticeDark,
    [0.12, 0.06, 1.6],
    [switchAt.x, 0.03, switchAt.z - 1.0],
  );
  builder.box(
    "metal",
    latticeDark,
    [1.6, 0.06, 0.12],
    [switchAt.x - 0.8, 0.03, switchAt.z - 1.8],
  );
  builder.box(
    "metal",
    latticeDark,
    [1.6, 0.06, 0.12],
    [switchAt.x - 1.4, 0.03, switchAt.z + 0.05],
  );
  /* A cable drum and a toolbox */
  const drum: Triple = [2.9, 0.4, -1.2];
  [-0.22, 0.22].forEach((side) => {
    builder.cylinder("matte", palette.timber, {
      radius: 0.4,
      length: 0.06,
      at: [drum[0] + side, drum[1], drum[2]],
      axis: "x",
      segments: 20,
    });
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.26,
    length: 0.4,
    at: drum,
    axis: "x",
    segments: 16,
  });
  builder.box("paint", cellRed, [0.5, 0.2, 0.25], [2.9, 0.1, 0.0], [0, 0.4, 0]);
  builder.box(
    "paint",
    shade(cellRed, 0.8),
    [0.52, 0.04, 0.27],
    [2.9, 0.21, 0.0],
    [0, 0.4, 0],
  );
  builder.bar(
    "metal",
    latticeSilver,
    [2.75, 0.24, -0.06],
    [3.05, 0.24, 0.06],
    0.03,
    4,
  );
  /* Little star-shaped lamps along the path */
  [
    [0.75, 2.2],
    [2.05, 2.2],
    [0.75, 3.5],
    [2.05, 3.5],
  ].forEach(([x, z]) => {
    builder.cylinder("metal", latticeDark, {
      radius: 0.03,
      length: 0.35,
      at: [x, 0.17, z],
      segments: 6,
    });
    builder.sphere("glow", sparkBlue, 0.06, [x, 0.38, z], [1, 1, 1], 8);
  });
};

/** Jagged glowing bolts reaching out from the ball. */
const buildArcs = (builder: AttractionBuilder) => {
  const bolts = 6;
  for (let bolt = 0; bolt < bolts; bolt++) {
    const heading = (bolt / bolts) * Math.PI * 2 + 0.3;
    const dip = bolt % 2 === 0 ? -0.35 : 0.15;
    let from: Triple = [
      Math.sin(heading) * ballRadius,
      0,
      Math.cos(heading) * ballRadius,
    ];
    for (let step = 1; step <= 5; step++) {
      const reach = ballRadius + step * 0.32;
      const wobble = ((step * 7 + bolt * 3) % 5) * 0.09 - 0.18;
      const to: Triple = [
        Math.sin(heading + wobble) * reach,
        dip * step * 0.25 + (step % 2 === 0 ? 0.1 : -0.06),
        Math.cos(heading + wobble) * reach,
      ];
      builder.bar(
        "glow",
        bolt % 2 === 0 ? sparkBlue : sparkViolet,
        from,
        to,
        0.045 - step * 0.004,
        4,
      );
      from = to;
    }
  }
};

/** A crackle of short sparks hugging the ball. */
const buildCrackle = (builder: AttractionBuilder) => {
  for (let spark = 0; spark < 10; spark++) {
    const heading = spark * 2.4;
    const tilt = ((spark % 5) - 2) * 0.35;
    const point = (radius: number, twist: number): Triple => [
      Math.sin(heading + twist) * Math.cos(tilt) * radius,
      Math.sin(tilt) * radius,
      Math.cos(heading + twist) * Math.cos(tilt) * radius,
    ];
    builder.bar(
      "glow",
      sparkViolet,
      point(ballRadius + 0.02, 0),
      point(ballRadius + 0.14, 0.15),
      0.03,
      4,
    );
    builder.bar(
      "glow",
      sparkBlue,
      point(ballRadius + 0.14, 0.15),
      point(ballRadius + 0.24, -0.05),
      0.025,
      4,
    );
  }
};

export const lightningTowerModel: CuriosityModel = {
  kind: "lightning-tower",
  islandId: "starfall-isle",
  name: "Lightning Tower",
  fact: "A Tesla coil makes such a high voltage that electricity leaps through the air as crackling sparks, like tiny lightning bolts. In an everyday circuit, adding more cells, or using cells with a higher voltage, pushes more electricity round, so a bulb glows more brightly and a buzzer sounds louder. Look at the four bulbs on the bench: the one with four cells shines brightest!",
  curriculumLink:
    "Science, Year 6: electricity. Associate the brightness of a lamp or the volume of a buzzer with the number and voltage of cells used in the circuit.",
  footprint: 4.8,
  setting: "inland",
  signSpot: { x: -1.6, z: 3.6 },
  build: (builder) => {
    buildTower(builder);
    buildFenceAndSafety(builder);
    buildSwitchBox(builder);
    buildBulbBench(builder);
    buildGrounds(builder);
    if (builder.isFar) {
      builder.box(
        "metal",
        latticeSilver,
        [0.12, 0.6, 0.12],
        [leverAt[0], leverAt[1] + 0.2, leverAt[2]],
      );
    }
    addSignBoard(builder, [-1.6, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "arcs",
      pivot: ballAt,
      build: buildArcs,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "crackle",
      pivot: ballAt,
      build: buildCrackle,
      motion: { kind: "flicker", period: 0.23 },
    },
    {
      name: "big switch",
      pivot: leverAt,
      build: buildLever,
      motion: { kind: "nod", axis: "x", reach: 4, amplitude: 0.7, period: 2.2 },
    },
  ],
  blockers: [
    { x: towerAt.x, z: towerAt.z, radius: fenceRadius + 0.1 },
    { x: switchAt.x, z: switchAt.z, radius: 0.5 },
    { x: 2.9, z: -1.2, radius: 0.45 },
    ...listWallBlockers(
      { x: bench.fromX + 0.15, z: bench.z },
      { x: bench.toX - 0.15, z: bench.z },
      0.35,
      0.5,
    ),
  ] satisfies LocalBlocker[],
  play: {
    label: "Flip the big switch",
    news: "Ker-ZAP! Purple sparks crackled from the copper ball, and the bulb with four cells blazed the brightest of all.",
    tune: [48, 55, 60, 67, 72, 79, 84],
  },
};
