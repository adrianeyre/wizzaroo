import {
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Quaternion,
  Shape,
  Vector3,
} from "three";
import {
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type Triple,
} from "../attractions/attraction-kit.js";

/* The Dragon Hatchery's dragons: the great mother dragon on her rock,
 * her wings and nodding head, the hatchling in its egg and the little
 * ones toddling round their pen. */

export const dragonRed = "#b3322a";
export const dragonDark = "#7c1f1b";
export const dragonBelly = "#e2a43c";
export const hornIvory = "#efe0bf";
export const wingSkin = "#8f2a22";
export const wingBone = "#4f1a15";
export const emberEye = "#ffcf3a";
export const flameOrange = "#ff8a1f";
export const flameYellow = "#ffe08a";
export const saddleLeather = "#5a3220";
export const bronze = "#b07a3a";
export const shellCream = "#efe3c9";

/** Where the mother dragon sits, on her rock, facing local +z. */
export const motherAt = { x: -4.6, z: -3.0 };
export const rockTop = 0.7;
const bodyY = 1.55;
/** Where a rider sits on the saddle between her wings. */
export const saddleSeat: Triple = [motherAt.x, 2.3, motherAt.z + 0.05];
export const headPivot: Triple = [motherAt.x, 2.95, motherAt.z + 1.85];
export const mouthAt: Triple = [motherAt.x, 2.88, motherAt.z + 2.75];
export const wingPivot = (side: 1 | -1): Triple => [
  motherAt.x + side * 0.42,
  2.15,
  motherAt.z + 0.4,
];

/** A tapering cone (or tube) from one point to another. */
export const addCone = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  from: Triple,
  to: Triple,
  radiusFrom: number,
  radiusTo: number,
  segments = 8,
): AttractionBuilder => {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.clone().normalize(),
    ),
  );
  const middle = start.add(direction.clone().multiplyScalar(0.5));
  builder.add(
    finish,
    colour,
    new CylinderGeometry(
      radiusTo,
      radiusFrom,
      direction.length(),
      builder.segments(segments, Math.max(4, Math.round(segments / 2))),
    ),
    {
      at: [middle.x, middle.y, middle.z],
      rotation: [turn.x, turn.y, turn.z],
    },
  );
  return builder;
};

/** Points along the mother dragon's tail, from her rump to its spade. */
export const tailPoints: readonly { at: Triple; radius: number }[] = Array.from(
  { length: 9 },
  (_, index) => {
    const share = index / 8;
    return {
      at: [
        motherAt.x + 1.7 * share * share,
        1.35 - 1.05 * share,
        motherAt.z - 1.15 - 2.9 * share,
      ],
      radius: 0.42 - 0.32 * share,
    };
  },
);

const neckPoints: readonly { at: Triple; radius: number }[] = [
  { at: [motherAt.x, 1.9, motherAt.z + 0.95], radius: 0.46 },
  { at: [motherAt.x, 2.2, motherAt.z + 1.3], radius: 0.38 },
  { at: [motherAt.x, 2.52, motherAt.z + 1.55], radius: 0.33 },
  { at: [motherAt.x, 2.8, motherAt.z + 1.75], radius: 0.29 },
];

const addLeg = (
  builder: AttractionBuilder,
  side: 1 | -1,
  along: number,
  isHind: boolean,
) => {
  const x = motherAt.x + side * (isHind ? 0.62 : 0.5);
  const z = motherAt.z + along;
  const hip: Triple = [x, isHind ? 1.35 : 1.45, z];
  const knee: Triple = [x + side * 0.12, rockTop + 0.42, z + 0.2];
  const foot: Triple = [x + side * 0.1, rockTop + 0.1, z + 0.32];
  builder.sphere(
    "paint",
    dragonRed,
    isHind ? 0.46 : 0.32,
    hip,
    isHind ? [0.7, 1, 1.15] : [0.8, 1, 0.9],
    8,
  );
  addCone(builder, "paint", dragonRed, hip, knee, isHind ? 0.26 : 0.2, 0.15);
  addCone(builder, "paint", dragonDark, knee, foot, 0.15, 0.12);
  builder.sphere("paint", dragonDark, 0.2, foot, [1, 0.5, 1.3], 8);
  if (builder.isFar) {
    return;
  }
  [-0.09, 0, 0.09].forEach((toe) => {
    addCone(
      builder,
      "paint",
      hornIvory,
      [foot[0] + toe, foot[1], foot[2] + 0.18],
      [foot[0] + toe * 1.3, foot[1] - 0.06, foot[2] + 0.36],
      0.04,
      0.005,
      5,
    );
  });
};

/** The mother dragon's body, legs, neck and tail (her head and wings move). */
export const buildMotherDragon = (builder: AttractionBuilder) => {
  const { x, z } = motherAt;
  builder.sphere(
    "paint",
    dragonRed,
    0.9,
    [x, bodyY, z],
    [0.85, 0.8, 1.45],
    builder.segments(16, 10),
  );
  builder.sphere(
    "paint",
    dragonBelly,
    0.82,
    [x, bodyY - 0.12, z + 0.12],
    [0.78, 0.72, 1.38],
    builder.segments(12, 8),
  );
  neckPoints.forEach(({ at, radius }, index) => {
    builder.sphere("paint", dragonRed, radius, at, [1, 1, 1], 8);
    if (index > 0) {
      addCone(
        builder,
        "paint",
        dragonRed,
        neckPoints[index - 1].at,
        at,
        neckPoints[index - 1].radius * 0.92,
        radius * 0.92,
        8,
      );
    }
  });
  ([1, -1] as const).forEach((side) => {
    addLeg(builder, side, 0.85, false);
    addLeg(builder, side, -0.75, true);
  });
  tailPoints.forEach(({ at, radius }, index) => {
    if (index === 0) {
      return;
    }
    const before = tailPoints[index - 1];
    addCone(
      builder,
      "paint",
      index % 2 === 0 ? dragonRed : shade(dragonRed, 0.94),
      before.at,
      at,
      before.radius,
      radius,
      8,
    );
    if (!builder.isFar) {
      builder.sphere("paint", dragonRed, radius, at, [1, 1, 1], 6);
    }
  });
  const tip = tailPoints[tailPoints.length - 1].at;
  builder.sphere(
    "paint",
    dragonDark,
    0.3,
    [tip[0] + 0.12, tip[1], tip[2] - 0.22],
    [1, 0.18, 1.3],
    builder.segments(8, 4),
  );
  const spike = (at: Triple, size: number) => ({ at, size });
  const spine = [
    ...[-0.95, 0.9].map((along) =>
      spike(
        [x, bodyY + 0.72 * Math.sqrt(1 - (along / 1.3) ** 2), z + along],
        0.24,
      ),
    ),
    ...neckPoints
      .slice(1)
      .map(({ at, radius }) =>
        spike([at[0], at[1] + radius * 0.9, at[2] - radius * 0.3], 0.17),
      ),
    ...tailPoints
      .slice(1, -1)
      .map(({ at, radius }) =>
        spike([at[0], at[1] + radius * 0.9, at[2]], 0.1 + radius * 0.35),
      ),
  ];
  /* The saddle, its blanket and stirrups, and a rope ladder up her side */
  builder.sphere(
    "paint",
    saddleLeather,
    0.36,
    [saddleSeat[0], saddleSeat[1] - 0.1, saddleSeat[2]],
    [0.9, 0.22, 1],
    10,
  );
  builder.box(
    "matte",
    "#2f5c8a",
    [0.78, 0.04, 0.82],
    [saddleSeat[0], saddleSeat[1] - 0.16, saddleSeat[2]],
    [0.06, 0, 0],
  );
  builder.cylinder("metal", bronze, {
    radius: 0.05,
    length: 0.24,
    at: [saddleSeat[0], saddleSeat[1] + 0.06, saddleSeat[2] + 0.33],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    "#f2c14e",
    [0.8, 0.03, 0.06],
    [saddleSeat[0], saddleSeat[1] - 0.15, saddleSeat[2] + 0.4],
  );
  [1, -1].forEach((side) => {
    builder.bar(
      "matte",
      saddleLeather,
      [saddleSeat[0] + side * 0.36, saddleSeat[1] - 0.16, saddleSeat[2]],
      [saddleSeat[0] + side * 0.62, saddleSeat[1] - 0.75, saddleSeat[2]],
      0.04,
      4,
    );
    builder.torus(
      "metal",
      bronze,
      0.07,
      0.015,
      [saddleSeat[0] + side * 0.64, saddleSeat[1] - 0.82, saddleSeat[2]],
      "z",
      10,
    );
  });
  spine.forEach(({ at, size }) => {
    addCone(
      builder,
      "paint",
      dragonBelly,
      at,
      [at[0], at[1] + size, at[2] - size * 0.35],
      size * 0.38,
      0.005,
      6,
    );
  });
};

/** The mother dragon's head, about its pivot at the top of her neck. */
export const buildMotherHead = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    dragonRed,
    0.36,
    [0, 0.04, 0.1],
    [0.92, 0.82, 1.2],
    12,
  );
  builder.cylinder("paint", dragonRed, {
    radius: 0.2,
    radiusEnd: 0.16,
    length: 0.62,
    at: [0, -0.02, 0.56],
    axis: "z",
    segments: 10,
  });
  if (builder.isFar) {
    builder.sphere("glow", emberEye, 0.06, [0, 0.15, 0.36], [3.6, 0.9, 1], 4);
    return;
  }
  builder.sphere(
    "paint",
    dragonRed,
    0.17,
    [0, -0.02, 0.86],
    [1.05, 0.85, 0.6],
    10,
  );
  builder.box(
    "paint",
    dragonBelly,
    [0.3, 0.08, 0.54],
    [0, -0.2, 0.48],
    [0.22, 0, 0],
  );
  [1, -1].forEach((side) => {
    builder.sphere(
      "glow",
      emberEye,
      0.075,
      [side * 0.2, 0.15, 0.32],
      [0.8, 1, 1],
      7,
    );
    builder.box(
      "paint",
      "#1a1210",
      [0.02, 0.1, 0.03],
      [side * 0.258, 0.15, 0.34],
      [0, side * 0.6, 0],
    );
    builder.box(
      "paint",
      dragonDark,
      [0.16, 0.06, 0.2],
      [side * 0.17, 0.24, 0.3],
      [0.2, 0, side * 0.25],
    );
    addCone(
      builder,
      "paint",
      hornIvory,
      [side * 0.15, 0.24, 0.0],
      [side * 0.3, 0.58, -0.42],
      0.07,
      0.008,
      8,
    );
    addCone(
      builder,
      "paint",
      hornIvory,
      [side * 0.26, 0.05, -0.05],
      [side * 0.5, 0.08, -0.3],
      0.045,
      0.005,
      6,
    );
    builder.sphere(
      "glow",
      flameOrange,
      0.035,
      [side * 0.08, 0.06, 0.98],
      [1, 0.7, 1],
      4,
    );
  });
  [-0.12, -0.04, 0.04, 0.12].forEach((across) => {
    addCone(
      builder,
      "paint",
      "#fbf7ec",
      [across, -0.12, 0.72],
      [across, -0.2, 0.73],
      0.022,
      0.002,
      4,
    );
  });
  [-0.1, -0.24, -0.38].forEach((back, index) => {
    addCone(
      builder,
      "paint",
      dragonBelly,
      [0, 0.28 - index * 0.04, back],
      [0, 0.44 - index * 0.06, back - 0.12],
      0.06,
      0.004,
      5,
    );
  });
};

/** One wing, spread out to `side`, about its pivot at the shoulder. */
export const buildWing = (side: 1 | -1) => (builder: AttractionBuilder) => {
  const sweep = 0.32;
  const point = (out: number, up: number): Triple => [
    side * out * Math.cos(sweep),
    up,
    -out * Math.sin(sweep),
  ];
  const elbow = [0.95, 0.85] as const;
  const wrist = [2.0, 1.45] as const;
  const fingers = [
    [2.75, 1.25],
    [2.6, 0.35],
    [1.95, -0.25],
    [1.05, -0.4],
  ] as const;
  const shape = new Shape();
  const at = (out: number) => side * out;
  shape.moveTo(at(0), 0.12);
  shape.lineTo(at(elbow[0]), elbow[1]);
  shape.lineTo(at(wrist[0]), wrist[1]);
  shape.lineTo(at(fingers[0][0]), fingers[0][1]);
  let last: readonly [number, number] = fingers[0];
  [...fingers.slice(1), [0.15, -0.28] as const].forEach((next) => {
    const control = [
      (last[0] + next[0]) / 2 + (wrist[0] - (last[0] + next[0]) / 2) * 0.32,
      (last[1] + next[1]) / 2 + (wrist[1] - (last[1] + next[1]) / 2) * 0.32,
    ];
    shape.quadraticCurveTo(at(control[0]), control[1], at(next[0]), next[1]);
    last = next;
  });
  shape.lineTo(at(0), 0.12);
  const membrane = new ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: false,
    curveSegments: builder.segments(5, 2),
  });
  membrane.translate(0, 0, -0.0175);
  builder.add("paint", wingSkin, membrane, {
    rotation: [0, side * sweep, 0],
  });
  const bone = (
    from: readonly [number, number],
    to: readonly [number, number],
    thick: number,
    tip = thick * 0.5,
  ) =>
    addCone(
      builder,
      "paint",
      wingBone,
      point(from[0], from[1]),
      point(to[0], to[1]),
      thick,
      tip,
      builder.isFar ? 4 : 8,
    );
  bone([0, 0.1], elbow, 0.1, 0.08);
  bone(elbow, wrist, 0.08, 0.06);
  if (builder.isFar) {
    return;
  }
  fingers.forEach((finger) => {
    bone(wrist, finger, 0.045, 0.012);
  });
  builder.sphere("paint", wingBone, 0.11, point(...elbow), [1, 1, 1], 8);
  builder.sphere("paint", wingBone, 0.08, point(...wrist), [1, 1, 1], 8);
  addCone(
    builder,
    "paint",
    hornIvory,
    point(...wrist),
    point(wrist[0] + 0.05, wrist[1] + 0.3),
    0.05,
    0.004,
    6,
  );
};

/** A puff of fire she breathes when someone comes close. */
export const buildBreath = (builder: AttractionBuilder) => {
  const segments = builder.segments(10, 6);
  builder.lathe(
    "glow",
    flameOrange,
    [
      [0, 0.05],
      [0.07, 0.2],
      [0.15, 0.55],
      [0.22, 0.95],
      [0.16, 1.2],
      [0, 1.32],
    ],
    [0, 0, 0],
    "z",
    segments,
  );
  builder.lathe(
    "glow",
    flameYellow,
    [
      [0, -0.04],
      [0.1, 0.08],
      [0.12, 0.3],
      [0.06, 0.5],
      [0, 0.56],
    ],
    [0, 0, 0.02],
    "z",
    segments,
  );
};

/** An egg's outline, as a lathe profile of [radius, height] points. */
export const listEggProfile = (
  radius: number,
  height: number,
  from = 0,
  to = 1,
  steps = 10,
): [number, number][] =>
  Array.from({ length: steps + 1 }, (_, index) => {
    const share = from + ((to - from) * index) / steps;
    const round = Math.sin(Math.PI * share) ** 0.75;
    return [
      Math.max(0.001, radius * round * (1.08 - 0.22 * share)),
      height * share,
    ];
  });

export const eggRadius = 0.42;
export const eggHeight = 1.12;
/** Where the hatching egg's shell is broken, as a share of its height. */
export const crackShare = 0.55;

/** The hatchling, wearing its egg's top as a hat, about the crack. */
export const buildHatchling = (builder: AttractionBuilder) => {
  const crackY = eggHeight * crackShare;
  builder.lathe(
    "paint",
    shellCream,
    listEggProfile(eggRadius, eggHeight, crackShare, 1, 5).map(
      ([radius, height]) => [radius, height - crackY + 0.32],
    ),
    [0, 0, 0],
    "y",
    builder.segments(14, 8),
  );
  if (!builder.isFar) {
    for (let tooth = 0; tooth < 8; tooth++) {
      const angle = (tooth / 8) * Math.PI * 2;
      addCone(
        builder,
        "paint",
        shellCream,
        [Math.sin(angle) * 0.36, 0.34, Math.cos(angle) * 0.36],
        [Math.sin(angle) * 0.37, 0.24, Math.cos(angle) * 0.37],
        0.06,
        0.004,
        3,
      );
    }
  }
  builder.sphere("paint", "#2e9e6a", 0.22, [0, 0.06, 0.02], [1, 0.95, 1], 10);
  if (builder.isFar) {
    return;
  }
  builder.sphere("paint", "#2e9e6a", 0.17, [0, -0.2, 0], [1, 1.2, 1], 8);
  builder.sphere("paint", "#3fbf84", 0.11, [0, 0.0, 0.22], [1, 0.65, 1], 10);
  [1, -1].forEach((side) => {
    builder.sphere(
      "glass",
      "#16120f",
      0.065,
      [side * 0.1, 0.1, 0.17],
      [1, 1.1, 1],
      7,
    );
    builder.sphere(
      "glow",
      "#ffffff",
      0.018,
      [side * 0.11, 0.13, 0.225],
      [1, 1, 1],
      4,
    );
    addCone(
      builder,
      "paint",
      hornIvory,
      [side * 0.09, 0.22, -0.02],
      [side * 0.13, 0.33, -0.08],
      0.035,
      0.004,
      5,
    );
  });
};

/** A little hatchling toddling about, facing +z, standing on y = 0. */
export const buildToddler =
  (colour: string) => (builder: AttractionBuilder) => {
    const belly = shade(colour, 1.35);
    builder.sphere("paint", colour, 0.17, [0, 0.24, 0], [0.9, 0.85, 1.25], 8);
    builder.sphere("paint", colour, 0.12, [0, 0.42, 0.2], [1, 0.95, 1.05], 8);
    if (builder.isFar) {
      return;
    }
    builder.sphere("paint", belly, 0.13, [0, 0.2, 0.08], [0.8, 0.75, 1.1], 5);
    builder.sphere("paint", belly, 0.065, [0, 0.39, 0.31], [1, 0.75, 1], 5);
    addCone(
      builder,
      "paint",
      colour,
      [0, 0.24, -0.18],
      [0.04, 0.1, -0.5],
      0.08,
      0.015,
      6,
    );
    [1, -1].forEach((side) => {
      builder.sphere(
        "glass",
        "#16120f",
        0.035,
        [side * 0.06, 0.46, 0.28],
        [1, 1.1, 1],
        4,
      );
      builder.cylinder("paint", shade(colour, 0.8), {
        radius: 0.045,
        length: 0.14,
        at: [side * 0.08, 0.07, 0.04],
        segments: 6,
      });
      if (!builder.isFar) {
        const wing = new Shape();
        wing.moveTo(0, 0);
        wing.lineTo(side * 0.2, 0.14);
        wing.lineTo(side * 0.18, -0.02);
        wing.lineTo(0, 0);
        builder.add(
          "paint",
          shade(colour, 0.75),
          new ExtrudeGeometry(wing, { depth: 0.02, bevelEnabled: false }),
          { at: [side * 0.1, 0.32, -0.02], rotation: [0, 0, 0] },
        );
        addCone(
          builder,
          "paint",
          hornIvory,
          [side * 0.05, 0.5, 0.17],
          [side * 0.07, 0.58, 0.12],
          0.02,
          0.003,
          4,
        );
      }
    });
  };
