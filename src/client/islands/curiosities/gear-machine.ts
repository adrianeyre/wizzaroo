import {
  CylinderGeometry,
  ExtrudeGeometry,
  Path,
  Shape,
  TorusGeometry,
} from "three";
import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ironPanel = "#3a3532";
const ironDark = "#2a2624";
const brass = "#d1a646";
const copper = "#b8693d";
const bronze = "#9c7a3c";
const basalt = "#3d3533";
const crankRed = "#b3322a";
const gaugeFace = "#f2e8cf";
const lampGlow = "#ffb85c";
const signColour = "#7a4a2a";
const ashPad = "#5b4a42";

/*
 * Three gears stacked up one axle line, so each meshes with the next and
 * turns the other way. Their sizes follow one tooth size (module 0.1), so
 * the pitch radius is a tenth of the teeth, halved.
 */
const toothSize = 0.1;
const gearZ = -0.95;
const panelZ = -1.22;
const bigTeeth = 24;
const smallTeeth = 12;
const middleTeeth = 18;
const pitchRadius = (teeth: number): number => (toothSize * teeth) / 2;
const bigY = 1.62;
const smallY = bigY + pitchRadius(bigTeeth) + pitchRadius(smallTeeth);
const middleY = smallY + pitchRadius(smallTeeth) + pitchRadius(middleTeeth);
const panelTop = middleY + pitchRadius(middleTeeth) + 0.55;
const postX = 1.95;
const gaugeAt: Triple = [postX, 1.95, -0.86];
const bigIdle = 0.3;
const bigSpeed = 1.5;

/** A toothed gear wheel facing +z, centred on its axle, with lightening holes. */
const gearGeometry = (
  teeth: number,
  depth: number,
  holes: number,
  detail: number,
): ExtrudeGeometry => {
  const radius = pitchRadius(teeth);
  const root = radius - toothSize * 1.1;
  const tip = radius + toothSize;
  const pitch = (Math.PI * 2) / teeth;
  const outline = new Shape();
  for (let tooth = 0; tooth < teeth; tooth++) {
    const middle = tooth * pitch;
    const points: [number, number][] = [
      [root, middle - pitch * 0.32],
      [tip, middle - pitch * 0.15],
      [tip, middle + pitch * 0.15],
      [root, middle + pitch * 0.32],
    ];
    points.forEach(([distance, angle], index) => {
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      if (tooth === 0 && index === 0) {
        outline.moveTo(x, y);
      } else {
        outline.lineTo(x, y);
      }
    });
  }
  outline.closePath();
  for (let hole = 0; hole < holes; hole++) {
    const angle = (hole / holes) * Math.PI * 2 + Math.PI / holes;
    const ring = new Path();
    ring.absarc(
      Math.cos(angle) * radius * 0.56,
      Math.sin(angle) * radius * 0.56,
      radius * 0.2,
      0,
      Math.PI * 2,
      true,
    );
    outline.holes.push(ring);
  }
  const geometry = new ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: false,
    curveSegments: detail,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
};

/** One gear with its hub, bolts and rim, for a moving part. */
const buildGear = (
  builder: AttractionBuilder,
  teeth: number,
  colour: string,
  holes: number,
) => {
  const radius = pitchRadius(teeth);
  builder.add("metal", colour, gearGeometry(teeth, 0.16, holes, 5));
  /* A raised rim inside the teeth and a boss round the axle */
  builder.add(
    "metal",
    shade(colour, 0.82),
    new TorusGeometry(radius - 0.2, 0.04, 4, Math.max(14, teeth)),
    { at: [0, 0, 0.08] },
  );
  builder.cylinder("metal", shade(colour, 1.12), {
    radius: radius * 0.24,
    length: 0.26,
    at: [0, 0, 0.02],
    axis: "z",
    segments: 18,
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.08,
    length: 0.34,
    at: [0, 0, 0.04],
    axis: "z",
    segments: 10,
  });
  for (let bolt = 0; bolt < 4; bolt++) {
    const angle = (bolt / 4) * Math.PI * 2 + Math.PI / 4;
    builder.cylinder("metal", ironDark, {
      radius: 0.028,
      length: 0.06,
      at: [
        Math.cos(angle) * radius * 0.17,
        Math.sin(angle) * radius * 0.17,
        0.17,
      ],
      axis: "z",
      segments: 6,
    });
  }
};

/** The big gear, with the crank handle bolted to its face. */
const buildBigGear = (builder: AttractionBuilder) => {
  buildGear(builder, bigTeeth, brass, 6);
  builder.bar("metal", ironDark, [0, 0, 0.24], [0.82, 0, 0.24], 0.1, 8);
  builder.sphere("metal", ironDark, 0.08, [0.82, 0, 0.24], [1, 1, 1], 10);
  builder.cylinder("metal", palette.steel, {
    radius: 0.03,
    length: 0.42,
    at: [0.82, 0, 0.45],
    axis: "z",
    segments: 8,
  });
  builder.cylinder("paint", crankRed, {
    radius: 0.07,
    radiusEnd: 0.06,
    length: 0.32,
    at: [0.82, 0, 0.5],
    axis: "z",
    segments: 14,
  });
  builder.sphere("paint", crankRed, 0.07, [0.82, 0, 0.67], [1, 1, 0.6], 10);
};

const buildSmallGear = (builder: AttractionBuilder) => {
  buildGear(builder, smallTeeth, copper, 4);
};

const buildMiddleGear = (builder: AttractionBuilder) => {
  buildGear(builder, middleTeeth, bronze, 5);
};

const buildNeedle = (builder: AttractionBuilder) => {
  builder.box("paint", crankRed, [0.025, 0.24, 0.015], [0, 0.1, 0]);
  builder.cylinder("metal", brass, {
    radius: 0.035,
    length: 0.03,
    at: [0, 0, 0.01],
    axis: "z",
    segments: 10,
  });
};

/** The iron wall the gears turn on: plinth, panel, posts and top beam. */
const buildFrame = (builder: AttractionBuilder) => {
  builder.box("matte", basalt, [4.6, 0.45, 1.6], [0, 0.22, -1.1]);
  builder.box("matte", shade(basalt, 1.2), [4.75, 0.1, 1.75], [0, 0.48, -1.1]);
  builder.box(
    "paint",
    ironPanel,
    [3.7, panelTop - 0.5, 0.14],
    [0, (panelTop + 0.5) / 2, panelZ],
  );
  [-postX, postX].forEach((x) => {
    builder.cylinder("metal", ironDark, {
      radius: 0.15,
      length: panelTop - 0.5,
      at: [x, (panelTop + 0.5) / 2, panelZ + 0.05],
      segments: 14,
    });
    builder.sphere(
      "metal",
      brass,
      0.2,
      [x, panelTop + 0.35, panelZ + 0.05],
      [1, 1, 1],
      10,
    );
  });
  builder.box(
    "metal",
    ironDark,
    [4.2, 0.26, 0.3],
    [0, panelTop + 0.1, panelZ + 0.05],
  );
  if (builder.isFar) {
    return;
  }
  /* The gears' axles stand out of the panel on stout brackets */
  [bigY, smallY, middleY].forEach((y) => {
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.13,
      length: 0.3,
      at: [0, y, panelZ + 0.15],
      axis: "z",
      segments: 12,
    });
  });
  /* Riveted edges round the panel */
  [-1.82, 1.82].forEach((x) => {
    builder.box(
      "metal",
      shade(ironPanel, 0.8),
      [0.08, panelTop - 0.5, 0.18],
      [x, (panelTop + 0.5) / 2, panelZ],
    );
  });
  for (let rivet = 0; rivet < 8; rivet++) {
    const y = 0.8 + ((panelTop - 1.0) * rivet) / 7;
    [-1.62, 1.62].forEach((x) => {
      builder.cylinder("metal", brass, {
        radius: 0.035,
        length: 0.04,
        at: [x, y, panelZ + 0.08],
        axis: "z",
        segments: 6,
      });
    });
  }
  [-1, 1].forEach((side) => {
    builder.torus(
      "metal",
      brass,
      0.17,
      0.03,
      [side * postX, panelTop - 0.2, panelZ + 0.05],
      "y",
      16,
    );
    builder.torus(
      "metal",
      brass,
      0.17,
      0.03,
      [side * postX, 0.75, panelZ + 0.05],
      "y",
      16,
    );
  });
  /* A brass name plate on the top beam */
  builder.box(
    "metal",
    brass,
    [1.4, 0.18, 0.04],
    [0, panelTop + 0.1, panelZ + 0.22],
  );
  builder.box(
    "paint",
    ironDark,
    [1.1, 0.05, 0.02],
    [0, panelTop + 0.1, panelZ + 0.245],
  );
};

/** Two still gears in the panel's corners, part of the works behind. */
const buildStillGears = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [
    { at: [-1.4, 2.95, panelZ + 0.12] satisfies Triple, teeth: 8 },
    { at: [1.38, 3.05, panelZ + 0.12] satisfies Triple, teeth: 7 },
    { at: [-1.38, 4.7, panelZ + 0.12] satisfies Triple, teeth: 6 },
  ].forEach(({ at, teeth }, index) => {
    builder.add(
      "metal",
      index === 1 ? copper : shade(brass, 0.85),
      gearGeometry(teeth, 0.08, 0, 6),
      { at, rotation: [0, 0, index * 0.4] },
    );
    builder.cylinder("metal", ironDark, {
      radius: 0.06,
      length: 0.14,
      at,
      axis: "z",
      segments: 8,
    });
  });
};

/** The pressure gauge on the right-hand post, fed by a copper pipe. */
const buildGauge = (builder: AttractionBuilder) => {
  const [x, y, z] = gaugeAt;
  builder.cylinder("metal", brass, {
    radius: 0.3,
    length: 0.1,
    at: [x, y, z - 0.04],
    axis: "z",
    segments: 24,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("paint", gaugeFace, {
    radius: 0.25,
    length: 0.02,
    at: [x, y, z + 0.02],
    axis: "z",
    segments: 24,
  });
  builder.torus(
    "metal",
    shade(brass, 1.1),
    0.27,
    0.035,
    [x, y, z + 0.03],
    "z",
    20,
  );
  /* Ticks round the dial, with the top ones red for "too much!" */
  for (let tick = 0; tick < 9; tick++) {
    const angle = Math.PI * 1.25 - (tick / 8) * Math.PI * 1.5;
    builder.box(
      "paint",
      tick > 6 ? crankRed : ironDark,
      [0.018, 0.06, 0.01],
      [x + Math.cos(angle) * 0.19, y + Math.sin(angle) * 0.19, z + 0.035],
      [0, 0, angle - Math.PI / 2],
    );
  }
  builder.cylinder("glass", palette.glass, {
    radius: 0.25,
    length: 0.02,
    at: [x, y, z + 0.06],
    axis: "z",
    segments: 24,
  });
  /* The pipe from the boiler tank to the gauge */
  builder.bar(
    "metal",
    copper,
    [x, y - 0.3, z - 0.02],
    [x, 1.0, z - 0.02],
    0.08,
    10,
  );
  builder.sphere("metal", copper, 0.06, [x, 1.0, z - 0.02], [1, 1, 1], 8);
};

/** A copper boiler tank at the wall's foot, with pipes, valve and a lamp. */
const buildTank = (builder: AttractionBuilder) => {
  const tank: Triple = [-2.65, 0, -0.75];
  builder.cylinder("metal", copper, {
    radius: 0.5,
    length: 1.3,
    at: [tank[0], 0.65, tank[2]],
    segments: 20,
  });
  builder.sphere(
    "metal",
    copper,
    0.5,
    [tank[0], 1.3, tank[2]],
    [1, 0.55, 1],
    12,
  );
  if (builder.isFar) {
    return;
  }
  [0.25, 1.05].forEach((y) => {
    builder.add("metal", brass, new TorusGeometry(0.51, 0.035, 4, 18), {
      at: [tank[0], y, tank[2]],
      rotation: [Math.PI / 2, 0, 0],
    });
  });
  /* Pipes from the tank up the panel and across to the gauge */
  builder.bar(
    "metal",
    copper,
    [tank[0], 1.5, tank[2]],
    [tank[0], 2.4, tank[2]],
    0.1,
    10,
  );
  builder.sphere("metal", copper, 0.08, [tank[0], 2.4, tank[2]], [1, 1, 1], 8);
  builder.bar(
    "metal",
    copper,
    [tank[0], 2.4, tank[2]],
    [-postX - 0.05, 2.4, -0.95],
    0.1,
    10,
  );
  builder.bar(
    "metal",
    copper,
    [tank[0] + 0.5, 0.9, tank[2]],
    [gaugeAt[0], 1.0, gaugeAt[2] - 0.02],
    0.07,
    10,
  );
  /* A red valve wheel on the rising pipe */
  builder.add("paint", crankRed, new TorusGeometry(0.14, 0.025, 5, 16), {
    at: [tank[0] + 0.12, 1.9, tank[2]],
    rotation: [0, Math.PI / 2, 0],
  });
  builder.bar(
    "paint",
    crankRed,
    [tank[0] + 0.12, 1.76, tank[2]],
    [tank[0] + 0.12, 2.04, tank[2]],
    0.025,
    6,
  );
  /* A caged glowing lamp on the left post */
  const lamp: Triple = [-postX, 3.6, panelZ + 0.32];
  builder.bar("metal", ironDark, [-postX, 3.6, panelZ + 0.1], lamp, 0.05, 6);
  builder.sphere("glow", lampGlow, 0.12, lamp, [1, 1.3, 1], 12);
  for (let bar = 0; bar < 4; bar++) {
    const angle = (bar / 4) * Math.PI * 2;
    builder.bar(
      "metal",
      ironDark,
      [
        lamp[0] + Math.cos(angle) * 0.14,
        lamp[1] - 0.17,
        lamp[2] + Math.sin(angle) * 0.14,
      ],
      [
        lamp[0] + Math.cos(angle) * 0.14,
        lamp[1] + 0.17,
        lamp[2] + Math.sin(angle) * 0.14,
      ],
      0.02,
      4,
    );
  }
};

/** A short chain hanging from the beam with a brass weight on its hook. */
const buildChain = (builder: AttractionBuilder) => {
  const chainX = 1.45;
  const top = panelTop - 0.05;
  const links = 10;
  const linkStep = 0.13;
  if (builder.isFar) {
    builder.bar(
      "metal",
      ironDark,
      [chainX, top, -0.95],
      [chainX, top - links * linkStep, -0.95],
      0.05,
      4,
    );
  } else {
    for (let link = 0; link < links; link++) {
      builder.add(
        "metal",
        link % 2 === 0 ? ironDark : palette.darkSteel,
        new TorusGeometry(0.055, 0.016, 3, 8),
        {
          at: [chainX, top - link * linkStep, -0.95],
          rotation: [0, link % 2 === 0 ? 0 : Math.PI / 2, 0],
          scale: [1, 1.45, 1],
        },
      );
    }
  }
  const weightY = top - links * linkStep - 0.25;
  builder.cylinder("metal", brass, {
    radius: 0.16,
    radiusEnd: 0.11,
    length: 0.36,
    at: [chainX, weightY, -0.95],
    segments: 14,
  });
  if (!builder.isFar) {
    builder.torus(
      "metal",
      shade(brass, 0.8),
      0.07,
      0.02,
      [chainX, weightY + 0.23, -0.95],
      "z",
      10,
    );
  }
};

/** A workbench of spare cogs, a spanner and an oil can. */
const buildWorkbench = (builder: AttractionBuilder) => {
  const bench: Triple = [2.75, 0, 0.35];
  builder.box(
    "matte",
    palette.timber,
    [1.3, 0.08, 0.7],
    [bench[0], 0.78, bench[2]],
  );
  if (builder.isFar) {
    return;
  }
  [-0.55, 0.55].forEach((dx) => {
    [-0.28, 0.28].forEach((dz) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.08, 0.74, 0.08],
        [bench[0] + dx, 0.37, bench[2] + dz],
      );
    });
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [1.2, 0.05, 0.6],
    [bench[0], 0.2, bench[2]],
  );
  /* Spare cogs, flat on the bench and in a box below */
  [
    { x: -0.3, z: -0.1, teeth: 10 },
    { x: 0.05, z: 0.15, teeth: 8 },
  ].forEach(({ x, z, teeth }) => {
    builder.add("metal", brass, gearGeometry(teeth, 0.06, 0, 6), {
      at: [bench[0] + x, 0.85, bench[2] + z],
      rotation: [-Math.PI / 2, 0, 0],
    });
  });
  builder.box(
    "matte",
    palette.paleTimber,
    [0.5, 0.22, 0.36],
    [bench[0] - 0.2, 0.33, bench[2]],
  );
  builder.add("metal", copper, gearGeometry(9, 0.05, 0, 6), {
    at: [bench[0] - 0.2, 0.47, bench[2]],
    rotation: [-Math.PI / 2, 0, 0.3],
  });
  /* A spanner */
  builder.box(
    "metal",
    palette.steel,
    [0.42, 0.02, 0.05],
    [bench[0] + 0.32, 0.83, bench[2] - 0.15],
    [0, 0.5, 0],
  );
  builder.add(
    "metal",
    palette.steel,
    new TorusGeometry(0.045, 0.018, 4, 10, Math.PI * 1.5),
    {
      at: [bench[0] + 0.5, 0.83, bench[2] - 0.26],
      rotation: [Math.PI / 2, 0, 0.5],
    },
  );
  /* An oil can with a long spout */
  const can: Triple = [bench[0] + 0.35, 0.82, bench[2] + 0.15];
  builder.add("metal", copper, new CylinderGeometry(0.05, 0.12, 0.18, 14), {
    at: [can[0], can[1] + 0.09, can[2]],
  });
  builder.bar(
    "metal",
    brass,
    [can[0], can[1] + 0.17, can[2]],
    [can[0] - 0.22, can[1] + 0.3, can[2]],
    0.02,
    5,
  );
  /* Loose cogs and bolts dropped on the ground */
  [
    [-1.2, 0.9],
    [1.0, 1.3],
  ].forEach(([x, z], index) => {
    builder.add(
      "metal",
      index === 1 ? copper : shade(brass, 0.9),
      gearGeometry(7, 0.04, 0, 6),
      { at: [x, 0.02, z], rotation: [-Math.PI / 2, 0, index] },
    );
  });
};

export const gearMachineModel: CuriosityModel = {
  kind: "gear-machine",
  islandId: "ember-isle",
  name: "Gear Machine",
  fact: "Gears are wheels with teeth that fit together. When one gear turns, it turns the next one the other way. A small gear turned by a big one spins faster, and a big gear turned by a small one turns slower but more strongly. Gears, levers and pulleys let a small push do a big job.",
  curriculumLink:
    "Science, Year 5: forces. Recognise that some mechanisms, including levers, pulleys and gears, allow a smaller force to have a greater effect.",
  footprint: 5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: -1.5, z: 3.7 },
  build: (builder) => {
    buildFrame(builder);
    buildStillGears(builder);
    buildGauge(builder);
    buildTank(builder);
    buildChain(builder);
    buildWorkbench(builder);
    if (builder.isFar) {
      /* Still discs where the turning gears are */
      [
        { y: bigY, radius: pitchRadius(bigTeeth), colour: brass },
        { y: smallY, radius: pitchRadius(smallTeeth), colour: copper },
        { y: middleY, radius: pitchRadius(middleTeeth), colour: bronze },
      ].forEach(({ y, radius, colour }) => {
        builder.cylinder("metal", colour, {
          radius: radius + 0.05,
          length: 0.16,
          at: [0, y, gearZ],
          axis: "z",
          segments: 16,
        });
      });
    }
    addSignBoard(builder, [-1.5, 0, 3.7], signColour);
  },
  moving: [
    {
      name: "big gear",
      pivot: [0, bigY, gearZ],
      build: buildBigGear,
      motion: {
        kind: "whirl",
        axis: "z",
        idle: bigIdle,
        speed: bigSpeed,
        reach: 8,
        phase: 0,
      },
    },
    {
      /* Turns twice as fast the other way; half a tooth on so they mesh */
      name: "small gear",
      pivot: [0, smallY, gearZ],
      build: buildSmallGear,
      motion: {
        kind: "whirl",
        axis: "z",
        idle: (-bigIdle * bigTeeth) / smallTeeth,
        speed: (-bigSpeed * bigTeeth) / smallTeeth,
        reach: 8,
        phase: Math.PI / smallTeeth,
      },
    },
    {
      name: "middle gear",
      pivot: [0, middleY, gearZ],
      build: buildMiddleGear,
      motion: {
        kind: "whirl",
        axis: "z",
        idle: (bigIdle * bigTeeth) / middleTeeth,
        speed: (bigSpeed * bigTeeth) / middleTeeth,
        reach: 8,
        phase: Math.PI / middleTeeth,
      },
    },
    {
      name: "gauge needle",
      pivot: [gaugeAt[0], gaugeAt[1], gaugeAt[2] + 0.045],
      build: buildNeedle,
      motion: { kind: "nod", axis: "z", reach: 7, amplitude: 0.9, period: 1.3 },
    },
  ],
  blockers: [
    ...listWallBlockers({ x: -2.1, z: -1.1 }, { x: 2.1, z: -1.1 }, 0.75, 0.7),
    { x: -2.65, z: -0.75, radius: 0.6 },
    { x: 2.75, z: 0.35, radius: 0.75 },
  ] satisfies LocalBlocker[],
  tune: [43, 47, 50, 55],
  play: {
    label: "Turn the crank",
    news: "Clank, whirr! One easy turn of the crank set every gear spinning, the small ones whizzing round twice as fast.",
    tune: [48, 52, 55, 52, 48],
  },
};
