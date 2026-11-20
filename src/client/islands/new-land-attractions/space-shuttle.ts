import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
} from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  findMotionPose,
  moveWithPose,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const tileBlack = "#24262b";
const shuttleWhite = "#f1f2f4";
const bayLining = "#565c68";
const navy = "#26346e";
const midnight = "#1b2350";
const silver = "#c7ced9";
const darkMetal = "#3e4450";
const foilGold = "#d9a53a";
const glowCyan = "#62f0ff";
const glowViolet = "#b58cff";
const starGold = "#ffd95e";
const flame = "#ff9a3c";
const paving = "#b9bdc8";
const tankOrange = "#c8692e";

/* The orbiter lies along local z, its nose towards +z. */
const belly = 1.5;
const sill = 2.45;
const halfWidth = 0.7;
const tailZ = -3.6;
const bayBack = -2.6;
const bayFront = 1.4;
const noseZ = 3.75;

const gantry = { minX: -3.85, maxX: -2.6, minZ: -2.8, maxZ: 1.6 };
const gantryHeight = 2.0;
const rampEnd = 6.6;
const signAt: LocalPoint = { x: 3.3, z: 7.6 };

const doorRest = 1.25;
const doorMotion = (phase: number): Motion => ({
  kind: "nod",
  axis: "z",
  reach: 8,
  amplitude: 0.32,
  period: 3.4,
  phase,
});

const armPivot: Triple = [-0.6, sill + 0.08, 1.15];
const armMotion: Motion = {
  kind: "swing",
  axis: "y",
  amplitude: 0.42,
  period: 9,
};
const effector: Triple = [-3.22, 3.42, -0.55];

const satellitePivot: Triple = [0, 1.75, -0.7];

/* The orbiter's body */

const rightSide: [number, number][] = [
  [0.48, 1.5],
  [0.57, 1.53],
  [0.64, 1.64],
  [0.68, 1.8],
  [0.7, 2.0],
  [0.71, 2.2],
  [halfWidth, sill],
];

const leftSide: [number, number][] = rightSide
  .map(([x, y]): [number, number] => [-x, y])
  .reverse();

const roofArc: [number, number][] = Array.from({ length: 7 }, (_, index) => {
  const angle = ((index + 1) / 8) * Math.PI;
  return [Math.cos(angle) * halfWidth, sill + Math.sin(angle) * 0.45];
});

const fullSection = (scale: number, drop: number): [number, number][] =>
  [...rightSide, ...roofArc, ...leftSide].map(([x, y]) => [
    x * scale,
    2.05 + (y - 2.05) * scale - drop,
  ]);

const baySection: [number, number][] = [
  ...rightSide,
  [0.56, sill],
  [0.56, 1.72],
  [-0.56, 1.72],
  [-0.56, sill],
  ...leftSide,
];

const shuttlePaint = (
  { y }: { y: number },
  normal: { y: number },
): string | undefined => {
  if (normal.y < -0.55 || y < belly + 0.07) {
    return tileBlack;
  }
  return shuttleWhite;
};

const buildBody = (builder: AttractionBuilder) => {
  builder.loft({
    stations: [
      { z: tailZ, points: fullSection(0.92, -0.03) },
      { z: tailZ + 0.3, points: fullSection(1, 0) },
      { z: bayBack, points: fullSection(1, 0) },
    ],
    paint: shuttlePaint,
  });
  builder.loft({
    stations: [
      { z: bayBack, points: baySection },
      { z: bayFront, points: baySection },
    ],
    paint: ({ x, y }, normal) => {
      if (Math.abs(x) < 0.57 && y > 1.7 && normal.y > -0.5) {
        return bayLining;
      }
      return shuttlePaint({ y }, normal);
    },
  });
  const nose = builder.isFar
    ? [
        [bayFront, 1, 0],
        [2.6, 0.92, 0.04],
        [3.4, 0.55, 0.2],
        [noseZ, 0.08, 0.38],
      ]
    : [
        [bayFront, 1, 0],
        [2.0, 1, 0],
        [2.6, 0.92, 0.04],
        [3.05, 0.76, 0.12],
        [3.4, 0.55, 0.2],
        [3.62, 0.32, 0.3],
        [noseZ, 0.08, 0.38],
      ];
  builder.loft({
    stations: nose.map(([z, scale, drop]) => ({
      z,
      points: fullSection(scale, drop),
    })),
    paint: ({ y, z }, normal) => {
      if (z > 3.45) {
        return tileBlack;
      }
      return shuttlePaint({ y }, normal);
    },
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#2a3a52",
      [0.3, 0.16, 0.04],
      [side * 0.2, 2.72, 2.38],
      [-0.75, 0, 0],
    );
    builder.box(
      "glass",
      "#2a3a52",
      [0.04, 0.14, 0.26],
      [side * 0.56, 2.62, 2.2],
      [0, 0, side * 0.5],
    );
  });
  builder.box(
    "glass",
    "#2a3a52",
    [0.16, 0.16, 0.04],
    [0, 2.74, 2.4],
    [-0.75, 0, 0],
  );
};

const wingShape = (side: number): Shape => {
  const shape = new Shape();
  const points: [number, number][] = [
    [0.5, -3.4],
    [2.55, -3.4],
    [2.6, -2.85],
    [1.5, -0.9],
    [0.8, 0.6],
    [0.55, 1.6],
  ];
  points.forEach(([x, z], index) => {
    if (index === 0) {
      shape.moveTo(x * side, z);
    } else {
      shape.lineTo(x * side, z);
    }
  });
  shape.closePath();
  return shape;
};

const buildWings = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    const geometry = new ExtrudeGeometry(wingShape(side), {
      depth: 0.12,
      bevelEnabled: !builder.isFar,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 1,
    });
    geometry.rotateX(Math.PI / 2);
    builder.painted(
      geometry,
      ({ x, z }, normal) => {
        if (normal.y < -0.3) {
          return tileBlack;
        }
        const along = 2.6 - Math.abs(x);
        if (z < -3.0 && normal.y > 0.3) {
          return "#9aa1ad";
        }
        if (normal.y > 0.3 && z > -0.4 - along * 0.2 && along < 2.2) {
          return z > -2.85 + (2.6 - Math.abs(x)) * 1.6
            ? tileBlack
            : shuttleWhite;
        }
        return shuttleWhite;
      },
      { at: [0, belly + 0.17, 0] },
      "paint",
    );
  });
  const fin = new Shape();
  fin.moveTo(-0.2, 0);
  fin.lineTo(1.0, 0);
  fin.lineTo(0.2, 1.65);
  fin.lineTo(-0.35, 1.65);
  fin.lineTo(-0.45, 1.4);
  fin.closePath();
  const finGeometry = new ExtrudeGeometry(fin, {
    depth: 0.12,
    bevelEnabled: !builder.isFar,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 1,
  });
  finGeometry.translate(0, 0, -0.06);
  finGeometry.rotateY(-Math.PI / 2);
  builder.add("paint", shuttleWhite, finGeometry, {
    at: [0, 2.82, tailZ + 0.25],
  });
  builder.box("paint", tileBlack, [0.15, 0.08, 0.5], [0, 4.47, tailZ - 0.05]);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      shuttleWhite,
      0.24,
      [side * 0.48, 2.7, tailZ + 0.55],
      [1, 0.85, 3.2],
      12,
    );
    builder.cylinder("metal", darkMetal, {
      radius: 0.08,
      radiusEnd: 0.12,
      length: 0.2,
      at: [side * 0.48, 2.7, tailZ - 0.25],
      axis: "z",
      segments: 10,
    });
  });
};

const engineSpots: [number, number][] = [
  [0, 2.42],
  [-0.32, 1.95],
  [0.32, 1.95],
];

const buildEngines = (builder: AttractionBuilder) => {
  builder.box("paint", shuttleWhite, [1.3, 1.25, 0.1], [0, 2.15, tailZ - 0.02]);
  engineSpots.forEach(([x, y]) => {
    builder.lathe(
      "metal",
      "#7d8592",
      [
        [0.08, -0.06],
        [0.18, -0.45],
        [0.22, -0.62],
        [0.25, -0.62],
        [0.22, -0.45],
        [0.12, -0.08],
        [0.09, 0.02],
      ],
      [x, y, tailZ - 0.04],
      "z",
      builder.segments(16, 8),
    );
  });
};

/* The payload bay doors, which open and close as you come near */

const buildDoor = (side: number) => (builder: AttractionBuilder) => {
  const toward = -side;
  const shape = new Shape();
  const steps = builder.isFar ? 3 : 6;
  for (let step = 0; step <= steps; step++) {
    const angle = (step / steps) * (Math.PI / 2);
    shape.lineTo(
      toward * Math.sin(angle) * halfWidth,
      0.02 + Math.sin(angle) * 0.4 - (1 - Math.cos(angle)) * 0.05,
    );
  }
  for (let step = steps; step >= 0; step--) {
    const angle = (step / steps) * (Math.PI / 2);
    shape.lineTo(
      toward * Math.sin(angle) * (halfWidth - 0.05),
      -0.03 + Math.sin(angle) * 0.37 - (1 - Math.cos(angle)) * 0.05,
    );
  }
  const length = bayFront - bayBack - 0.06;
  const geometry = new ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.translate(0, 0, bayBack + 0.03);
  geometry.rotateZ(toward * doorRest);
  builder.add("paint", shuttleWhite, geometry);
  if (builder.isFar) {
    return;
  }
  const radiator = new BoxGeometry(0.42, 0.02, length - 0.4)
    .rotateZ(toward * 0.55)
    .translate(toward * 0.36, 0.13, (bayBack + bayFront) / 2)
    .rotateZ(toward * doorRest);
  builder.add("paint", "#b8c9dc", radiator);
  const seam = new BoxGeometry(0.04, 0.03, length)
    .translate(toward * (halfWidth - 0.02), 0.03, (bayBack + bayFront) / 2)
    .rotateZ(toward * doorRest);
  builder.add("paint", bayLining, seam);
};

/* The robot arm, which swings along the bay: hold on to its hand! */

const buildArm = (builder: AttractionBuilder) => {
  const elbow: Triple = [-1.35, 1.75, -0.95];
  const wrist: Triple = [
    effector[0] - armPivot[0],
    effector[1] - armPivot[1] + 0.28,
    effector[2] - armPivot[2],
  ];
  builder.cylinder("metal", silver, {
    radius: 0.13,
    length: 0.24,
    at: [0, 0.12, 0],
    segments: 12,
  });
  builder.sphere("paint", shuttleWhite, 0.13, [0, 0.3, 0], [1, 1, 1], 10);
  builder.bar("paint", shuttleWhite, [0, 0.3, 0], elbow, 0.12, 10);
  builder.sphere("paint", darkMetal, 0.12, elbow, [1, 1, 1], 10);
  builder.bar("paint", shuttleWhite, elbow, wrist, 0.11, 10);
  builder.sphere("paint", darkMetal, 0.11, wrist, [1, 1, 1], 10);
  builder.cylinder("metal", silver, {
    radius: 0.12,
    length: 0.26,
    at: [wrist[0], wrist[1] - 0.15, wrist[2]],
    segments: 12,
  });
  builder.torus(
    "paint",
    starGold,
    0.12,
    0.03,
    [wrist[0], wrist[1] - 0.3, wrist[2]],
    "y",
    14,
  );
  if (builder.isFar) {
    return;
  }
  [0.35, 0.65].forEach((share) => {
    builder.cylinder("paint", navy, {
      radius: 0.125,
      length: 0.12,
      at: [elbow[0] * share, 0.3 + (elbow[1] - 0.3) * share, elbow[2] * share],
      axis: "x",
      segments: 10,
    });
  });
  builder.sphere(
    "glow",
    glowCyan,
    0.04,
    [wrist[0] + 0.12, wrist[1] - 0.1, wrist[2]],
    [1, 1, 1],
    6,
  );
};

/* The satellite in the bay, which lifts out as you come near */

const buildSatellite = (builder: AttractionBuilder) => {
  const segments = builder.segments(18, 8);
  builder.cylinder("metal", silver, {
    radius: 0.38,
    length: 2.1,
    at: [0, 0.42, 0],
    axis: "z",
    segments,
  });
  builder.cylinder("paint", foilGold, {
    radius: 0.39,
    length: 0.6,
    at: [0, 0.42, -0.65],
    axis: "z",
    segments,
    isOpen: true,
  });
  builder.cylinder("paint", tileBlack, {
    radius: 0.36,
    length: 0.05,
    at: [0, 0.42, 1.07],
    axis: "z",
    segments,
  });
  builder.box("paint", silver, [0.06, 0.1, 0.5], [0, 0.82, 1.0], [0.4, 0, 0]);
  [-1, 1].forEach((side) => {
    builder.box("metal", silver, [0.06, 0.06, 0.06], [side * 0.42, 0.42, 0]);
    builder.box("paint", "#2a3f8a", [0.02, 0.6, 1.5], [side * 0.47, 0.5, 0.1]);
    if (!builder.isFar) {
      for (let line = 0; line < 4; line++) {
        builder.box(
          "metal",
          "#8fa0d8",
          [0.025, 0.6, 0.012],
          [side * 0.47, 0.5, -0.5 + line * 0.4],
        );
      }
    }
  });
  builder.cylinder("glass", "#62a8d8", {
    radius: 0.2,
    length: 0.04,
    at: [0, 0.42, 1.1],
    axis: "z",
    segments: 12,
  });
  if (!builder.isFar) {
    builder.sphere("glow", starGold, 0.05, [0, 0.82, -0.9], [1, 1, 1], 6);
  }
};

const buildEngineFire = (builder: AttractionBuilder) => {
  engineSpots.forEach(([x, y], index) => {
    builder.add(
      "glow",
      index === 0 ? "#ffe08a" : flame,
      new ConeGeometry(0.24, 1.3, builder.segments(12, 6), 1, true).rotateX(
        -Math.PI / 2,
      ),
      { at: [x, y - engineSpots[0][1], -0.62] },
    );
    builder.add(
      "glow",
      glowCyan,
      new CylinderGeometry(0.2, 0.2, 0.04, builder.segments(12, 6)).rotateX(
        Math.PI / 2,
      ),
      { at: [x, y - engineSpots[0][1], 0] },
    );
  });
};

/* The stands, the gantry and the grounds */

const buildStands = (builder: AttractionBuilder) => {
  [-2.0, 1.0].forEach((z) => {
    [-1, 1].forEach((side) => {
      builder.bar(
        "paint",
        navy,
        [side * 0.9, 0, z],
        [side * 0.35, belly, z],
        0.16,
        8,
      );
    });
    builder.box("paint", navy, [0.9, 0.12, 0.3], [0, belly - 0.06, z]);
    builder.box("matte", "#9da2b0", [2.2, 0.12, 0.5], [0, 0.06, z]);
  });
  builder.cylinder("paint", navy, {
    radius: 0.12,
    length: belly,
    at: [1.8, belly / 2, -2.4],
    segments: 10,
  });
  builder.cylinder("paint", navy, {
    radius: 0.12,
    length: belly,
    at: [-1.8, belly / 2, -2.4],
    segments: 10,
  });
};

const gantryDeck: Deck = ({ x, z }) => {
  if (x < gantry.minX || x > gantry.maxX || z < gantry.minZ || z > rampEnd) {
    return undefined;
  }
  if (z <= gantry.maxZ) {
    return { height: gantryHeight, kind: "bridge" };
  }
  return {
    height: (gantryHeight * (rampEnd - z)) / (rampEnd - gantry.maxZ),
    kind: "bridge",
  };
};

const buildGantry = (builder: AttractionBuilder) => {
  const width = gantry.maxX - gantry.minX;
  const midX = (gantry.minX + gantry.maxX) / 2;
  const length = gantry.maxZ - gantry.minZ;
  builder.box(
    "metal",
    "#7d8592",
    [width, 0.1, length],
    [midX, gantryHeight - 0.05, (gantry.minZ + gantry.maxZ) / 2],
  );
  const rampLength = rampEnd - gantry.maxZ;
  const slope = Math.atan2(gantryHeight, rampLength);
  const slabs = 10;
  const slabLength = rampLength / slabs;
  for (let slab = 0; slab < slabs; slab++) {
    const z = gantry.maxZ + (slab + 0.5) * slabLength;
    const y = gantryDeck({ x: midX, z })?.height ?? 0;
    builder.box(
      "metal",
      slab % 2 === 0 ? "#7d8592" : "#737b88",
      [width, 0.08, Math.hypot(slabLength, gantryHeight / slabs) + 0.01],
      [midX, y - 0.04, z],
      [slope, 0, 0],
    );
  }
  const posts: number[] = [gantry.minZ + 0.1, -0.8, gantry.maxZ - 0.1, 3.0];
  posts.forEach((z) => {
    const deck = gantryDeck({ x: midX, z })?.height ?? 0;
    [gantry.minX + 0.08, gantry.maxX - 0.08].forEach((x) => {
      builder.box("paint", navy, [0.12, deck, 0.12], [x, deck / 2, z]);
    });
  });
  const rail = (x: number, from: number, to: number) => {
    const fromY = (gantryDeck({ x: midX, z: from })?.height ?? 0) + 1.0;
    const toY = (gantryDeck({ x: midX, z: to })?.height ?? 0) + 1.0;
    builder.bar("paint", starGold, [x, fromY, from], [x, toY, to], 0.06, 6);
    builder.bar(
      "metal",
      silver,
      [x, fromY - 0.5, from],
      [x, toY - 0.5, to],
      0.04,
      4,
    );
    const steps = builder.isFar
      ? 1
      : Math.max(1, Math.round(Math.abs(to - from) / 0.9));
    for (let step = 0; step <= steps; step++) {
      const z = from + ((to - from) * step) / steps;
      const y = (gantryDeck({ x: midX, z })?.height ?? 0) + 0.5;
      builder.box("metal", silver, [0.05, 1.0, 0.05], [x, y, z]);
    }
  };
  rail(gantry.minX + 0.03, gantry.minZ, gantry.maxZ);
  rail(gantry.minX + 0.03, gantry.maxZ, rampEnd - 0.2);
  rail(gantry.maxX - 0.03, gantry.maxZ, rampEnd - 0.2);
  rail(gantry.maxX - 0.03, gantry.minZ, gantry.maxZ);
  builder.box(
    "paint",
    starGold,
    [width, 0.06, 0.06],
    [midX, gantryHeight + 1.0, gantry.minZ + 0.03],
  );
  builder.box(
    "metal",
    silver,
    [width, 0.05, 0.05],
    [midX, gantryHeight + 0.5, gantry.minZ + 0.03],
  );
  if (!builder.isFar) {
    for (let light = 0; light < 6; light++) {
      builder.sphere(
        "glow",
        light % 2 === 0 ? glowCyan : glowViolet,
        0.05,
        [
          gantry.minX + 0.05,
          gantryHeight + 1.08,
          gantry.minZ + 0.4 + light * 0.75,
        ],
        [1, 1, 1],
        6,
      );
    }
  }
};

/** A solid rocket booster, standing up as an exhibit. */
const buildBooster = (builder: AttractionBuilder) => {
  const at: LocalPoint = { x: 4.6, z: -3.4 };
  builder.cylinder("matte", "#9da2b0", {
    radius: 0.8,
    length: 0.2,
    at: [at.x, 0.1, at.z],
    segments: 12,
  });
  builder.lathe(
    "paint",
    shuttleWhite,
    [
      [0.001, 0.2],
      [0.5, 0.2],
      [0.42, 0.7],
      [0.38, 0.75],
      [0.38, 6.0],
      [0.3, 6.6],
      [0.12, 7.0],
      [0.001, 7.1],
    ],
    [at.x, 0, at.z],
    "y",
    builder.segments(18, 9),
  );
  [1.6, 3.4, 5.0].forEach((y) => {
    builder.cylinder("paint", tileBlack, {
      radius: 0.39,
      length: 0.1,
      at: [at.x, y, at.z],
      segments: builder.segments(18, 9),
      isOpen: true,
    });
  });
  const tankAt: LocalPoint = { x: 5.65, z: -3.1 };
  builder.lathe(
    "matte",
    tankOrange,
    [
      [0.001, 0.2],
      [0.55, 0.2],
      [0.6, 0.5],
      [0.6, 5.2],
      [0.45, 6.0],
      [0.2, 6.6],
      [0.001, 6.75],
    ],
    [tankAt.x, 0, tankAt.z],
    "y",
    builder.segments(18, 9),
  );
  builder.cylinder("matte", "#9da2b0", {
    radius: 0.75,
    length: 0.2,
    at: [tankAt.x, 0.1, tankAt.z],
    segments: 12,
  });
};

const addStarLamp = (builder: AttractionBuilder, at: LocalPoint) => {
  builder.cylinder("paint", midnight, {
    radius: 0.09,
    length: 0.3,
    at: [at.x, 0.15, at.z],
    segments: 8,
  });
  builder.cylinder("metal", silver, {
    radius: 0.04,
    radiusEnd: 0.03,
    length: 2.3,
    at: [at.x, 1.3, at.z],
    segments: 6,
  });
  builder.sphere("glow", "#f4f8ff", 0.15, [at.x, 2.55, at.z], [1, 1, 1], 8);
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", paving, [5.2, 0.03, 8.4], [0, 0.015, -0.6]);
  if (!builder.isFar) {
    for (let line = 0; line < 9; line++) {
      builder.box(
        "paint",
        line % 2 === 0 ? starGold : "#3a3f4a",
        [0.5, 0.034, 0.12],
        [0, 0.017, -4.4 + line * 0.95],
      );
    }
  }
  builder.box("matte", paving, [1.8, 0.03, 3.8], [1.2, 0.015, 5.6]);
  buildStands(builder);
  buildBody(builder);
  buildWings(builder);
  buildEngines(builder);
  buildGantry(builder);
  buildBooster(builder);
  buildCountdown(builder);
  addFlag(builder, { x: 1.2, z: 3.6 }, navy);
  addFlag(builder, { x: -1.0, z: 3.6 }, "#5b3fa8");
  addStarLamp(builder, { x: 2.6, z: 3.8 });
  addStarLamp(builder, { x: -4.4, z: 4.4 });
  addBench(builder, [4.6, 0, 2.4], -Math.PI / 2, "#7d8fc4");
  addBench(builder, [-1.4, 0, 6.2], Math.PI, "#7d8fc4");
  addBush(builder, [-5.6, 0, -3.6], 0.65, "#2f5e46");
  addBush(builder, [5.8, 0, 5.4], 0.55, "#2f5e46");
  addBush(builder, [-0.6, 0, -6.6], 0.6, "#2f5e46");
  addSignBoard(builder, [signAt.x, 0, signAt.z], navy, -0.3);
};

/** The countdown clock, as at the launch site. */
const buildCountdown = (builder: AttractionBuilder) => {
  const at: LocalPoint = { x: 3.6, z: 1.4 };
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", navy, {
      radius: 0.07,
      length: 1.6,
      at: [at.x + side * 0.9, 0.8, at.z],
      segments: 8,
    });
  });
  builder.box(
    "paint",
    midnight,
    [2.1, 0.8, 0.14],
    [at.x, 1.9, at.z],
    [0, -0.35, 0],
  );
  builder.box(
    "metal",
    silver,
    [2.2, 0.06, 0.18],
    [at.x, 2.33, at.z],
    [0, -0.35, 0],
  );
  const digits = builder.isFar ? 0 : 6;
  for (let digit = 0; digit < digits; digit++) {
    const along = -0.75 + digit * 0.3;
    builder.box(
      "glow",
      digit < 2 ? glowCyan : starGold,
      [0.18, 0.4, 0.02],
      [
        at.x + Math.cos(-0.35) * along,
        1.9,
        at.z - Math.sin(-0.35) * along + 0.08,
      ],
      [0, -0.35, 0],
    );
  }
};

const addFlag = (
  builder: AttractionBuilder,
  at: LocalPoint,
  colour: string,
) => {
  builder.cylinder("metal", silver, {
    radius: 0.04,
    length: 3.4,
    at: [at.x, 1.7, at.z],
    segments: 6,
  });
  builder.sphere("metal", starGold, 0.07, [at.x, 3.44, at.z], [1, 1, 1], 6);
  builder.box("matte", colour, [0.02, 0.55, 0.85], [at.x, 3.05, at.z + 0.44]);
  if (!builder.isFar) {
    builder.add(
      "glow",
      starGold,
      new ConeGeometry(0.12, 0.03, 5).rotateZ(Math.PI / 2),
      {
        at: [at.x + 0.02, 3.05, at.z + 0.44],
      },
    );
  }
};

/* Visitors, gazing up at the shuttle */

const buildVisitor = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((x) => {
    builder.cylinder("paint", navy, {
      radius: 0.06,
      length: 0.46,
      at: [x, 0.23, 0],
      segments: builder.segments(6, 4),
    });
  });
  builder.cylinder("paint", "#2fb5a8", {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.42,
    at: [0, 0.66, 0],
    segments: builder.segments(10, 6),
  });
  if (builder.isFar) {
    builder.sphere("paint", "#e9b48a", 0.14, [0, 1.0, 0], [1, 1, 1], 6);
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      "#2fb5a8",
      [side * 0.17, 0.84, 0],
      [side * 0.22, 0.52, 0.06],
      0.08,
      5,
    );
  });
  builder.sphere("paint", "#e9b48a", 0.14, [0, 1.0, 0], [1, 1, 1], 10);
  builder.sphere("paint", "#6b3a1f", 0.145, [0, 1.04, -0.02], [1, 0.75, 1], 8);
  builder.cylinder("paint", starGold, {
    radius: 0.16,
    radiusEnd: 0.14,
    length: 0.06,
    at: [0, 1.13, 0],
    segments: 10,
  });
};

/* Hold on to the robot arm's hand and swing along the bay */

const rideStart: LocalPoint = { x: effector[0], z: effector[2] };
const rideFinish: LocalPoint = { x: -3.22, z: 1.25 };
const hangDrop = 1.15;

const armRide = (progress: number, clockSeconds: number): LocalSpot => {
  const pose = findMotionPose(armMotion, clockSeconds);
  const [x, y, z] = moveWithPose(armPivot, effector, pose);
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? rideStart : rideFinish;
  const hang = y - hangDrop;
  return {
    x: outside.x + (x - outside.x) * share,
    y: gantryHeight + (hang - gantryHeight) * share,
    z: outside.z + (z - outside.z) * share,
    heading: Math.PI / 2 + pose.rotation[1],
  };
};

export const spaceShuttleModel: NewLandAttractionModel = {
  kind: "space-shuttle",
  islandId: "starfall-isle",
  name: "Space Shuttle",
  fact: "The Space Shuttle was the first spacecraft that could fly into space and then land on a runway like a glider, ready to fly again. Its long robot arm worked like a giant lever, with a shoulder, an elbow and a wrist, so a small push from a motor could move a heavy satellite in and out of its cargo bay.",
  curriculumLink:
    "Science, Year 5: forces. Recognise that some mechanisms, including levers, pulleys and gears, allow a smaller force to have a greater effect.",
  footprint: 10,
  setting: "inland",
  signSpot: { x: signAt.x + 0.2, z: signAt.z + 0.65 },
  build: buildGrounds,
  moving: [
    {
      name: "left-bay-door",
      pivot: [-halfWidth, sill, 0],
      build: buildDoor(-1),
      motion: doorMotion(0),
    },
    {
      name: "right-bay-door",
      pivot: [halfWidth, sill, 0],
      build: buildDoor(1),
      motion: doorMotion(Math.PI),
    },
    {
      name: "robot-arm",
      pivot: armPivot,
      build: buildArm,
      motion: armMotion,
    },
    {
      name: "satellite",
      pivot: satellitePivot,
      build: buildSatellite,
      motion: { kind: "rise", reach: 7, height: 1.7, period: 4 },
    },
    {
      name: "engine-fire",
      pivot: [0, engineSpots[0][1], tailZ - 0.66],
      build: buildEngineFire,
      motion: { kind: "wake", reach: 5 },
    },
  ],
  blockers: [
    { x: 4.6, z: -3.4, radius: 0.6 },
    { x: 5.65, z: -3.1, radius: 0.7 },
  ] satisfies LocalBlocker[],
  wanderers: [
    {
      name: "visitors",
      build: buildVisitor,
      count: 3,
      centre: { x: 2.0, z: 5.2 },
      radius: 1.3,
      speed: 0.35,
    },
  ],
  decks: [gantryDeck],
  rides: [
    {
      id: "robot-arm",
      name: "the robot arm",
      start: rideStart,
      reach: 0.55,
      seconds: 16,
      finish: rideFinish,
      follow: armRide,
    },
  ],
  play: {
    label: "Open the cargo bay",
    news: "The great doors swung open, the robot arm stretched out and a satellite lifted gently out of the bay, ready to go round the Earth.",
  },
};
