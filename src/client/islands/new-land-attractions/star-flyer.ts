import {
  ExtrudeGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  OctahedronGeometry,
  Shape,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  findMotionPose,
  moveWithPose,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const midnight = "#1b2350";
const navy = "#26346e";
const silver = "#c7ced9";
const white = "#eef1f6";
const darkMetal = "#3e4450";
const glowCyan = "#62f0ff";
const glowViolet = "#b58cff";
const glowWhite = "#f4f8ff";
const starGold = "#ffd95e";
const chairColours = ["#5b3fa8", "#2fb5d8"];
const paving = "#b9bdc8";

const flyerAt: LocalPoint = { x: 0, z: -0.5 };
const towerHeight = 7.2;
const canopyY = 6.5;
const canopyRadius = 3.15;
const orbitRadius = 3.35;
const chainInward = 0.65;
const chairY = 2.25;
const chainLength = canopyY - 0.25 - chairY;
const flyerSpeed = 1.15;
const fenceRadius = 4.7;
const gateHalf = 0.3;
const signAt: LocalPoint = { x: 2.4, z: 7.2 };

const flyerPivot: Triple = [flyerAt.x, 0, flyerAt.z];
const chairPivot: Triple = [flyerAt.x, chairY, flyerAt.z];
const chairMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: orbitRadius,
  count: 8,
  speed: flyerSpeed,
  isFacingAlong: true,
  bob: 0.12,
};

const around = (angle: number, radius: number, y: number): Triple => [
  flyerAt.x + Math.sin(angle) * radius,
  y,
  flyerAt.z + Math.cos(angle) * radius,
];

const addSparkle = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string,
) => {
  builder.add("glow", colour, new OctahedronGeometry(size, 0), {
    at,
    scale: [1, 1.3, 1],
  });
};

const addBulb = (builder: AttractionBuilder, at: Triple, colour: string) => {
  builder.add("glow", colour, new IcosahedronGeometry(0.055, 0), { at });
};

const starShape = (outer: number, inner: number): Shape => {
  const shape = new Shape();
  for (let point = 0; point < 10; point++) {
    const angle = (point / 10) * Math.PI * 2;
    const radius = point % 2 === 0 ? outer : inner;
    const x = Math.sin(angle) * radius;
    const y = Math.cos(angle) * radius;
    if (point === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
};

/* The tower in the middle */

const buildTower = (builder: AttractionBuilder) => {
  const { x, z } = flyerAt;
  builder.cylinder("paint", navy, {
    radius: 1.2,
    radiusEnd: 1.05,
    length: 0.5,
    at: [x, 0.25, z],
    segments: builder.segments(24, 10),
  });
  builder.cylinder("metal", silver, {
    radius: 1.08,
    length: 0.06,
    at: [x, 0.53, z],
    segments: builder.segments(24, 10),
  });
  builder.cylinder("paint", white, {
    radius: 0.5,
    radiusEnd: 0.32,
    length: towerHeight - 0.5,
    at: [x, 0.5 + (towerHeight - 0.5) / 2, z],
    segments: builder.segments(20, 10),
  });
  const lights = builder.isFar ? 0 : 44;
  for (let light = 0; light < lights; light++) {
    const share = light / lights;
    const y = 0.9 + share * (canopyY - 1.4);
    const radius = 0.5 - 0.18 * ((y - 0.5) / (towerHeight - 0.5)) + 0.03;
    const angle = share * Math.PI * 8;
    addBulb(
      builder,
      around(angle, radius, y),
      light % 2 === 0 ? glowCyan : glowViolet,
    );
  }
  for (let fin = 0; fin < 4; fin++) {
    const angle = (fin / 4) * Math.PI * 2 + Math.PI / 4;
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.62, 0);
    shape.lineTo(0, 2.2);
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: !builder.isFar,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 1,
    });
    geometry.translate(0, 0, -0.05);
    builder.add("paint", fin % 2 === 0 ? "#5b3fa8" : navy, geometry, {
      at: around(angle, 0.45, 0.55),
      rotation: [0, angle - Math.PI / 2, 0],
    });
  }
  builder.box(
    "metal",
    darkMetal,
    [0.5, 0.45, 0.3],
    [x - 1.0, 0.75, z + 0.55],
    [0, -0.6, 0],
  );
};

/* The canopy that spins on top, and the crown star */

const buildCanopy = (builder: AttractionBuilder) => {
  const segments = builder.segments(32, 12);
  builder.add(
    "paint",
    midnight,
    new LatheGeometry(
      [
        [0.001, -0.28],
        [canopyRadius, -0.28],
        [canopyRadius + 0.06, -0.06],
        [2.3, 0.45],
        [0.9, 0.9],
        [0.4, 1.0],
        [0.001, 1.02],
      ].map(([radius, height]) => new Vector2(radius, height)),
      segments,
    ),
    { at: [0, canopyY, 0] },
  );
  builder.cylinder("paint", silver, {
    radius: canopyRadius + 0.08,
    length: 0.22,
    at: [0, canopyY - 0.17, 0],
    segments,
    isOpen: true,
  });
  builder.cylinder("metal", silver, {
    radius: 0.42,
    length: 0.7,
    at: [0, canopyY + 1.25, 0],
    segments: 14,
  });
  builder.cylinder("paint", navy, {
    radius: 0.5,
    radiusEnd: 0.3,
    length: 0.25,
    at: [0, canopyY + 1.72, 0],
    segments: 14,
  });
  for (let arm = 0; arm < 8; arm++) {
    const angle = (arm / 8) * Math.PI * 2;
    const rim: Triple = [
      Math.cos(angle) * (orbitRadius - chainInward),
      canopyY - 0.3,
      -Math.sin(angle) * (orbitRadius - chainInward),
    ];
    builder.bar("metal", silver, [0, canopyY - 0.3, 0], rim, 0.08, 6);
    builder.sphere("metal", silver, 0.07, rim, [1, 1, 1], 6);
  }
  if (builder.isFar) {
    return;
  }
  const bulbs = 24;
  for (let bulb = 0; bulb < bulbs; bulb++) {
    const angle = (bulb / bulbs) * Math.PI * 2;
    addBulb(
      builder,
      [
        Math.sin(angle) * (canopyRadius + 0.1),
        canopyY - 0.17,
        Math.cos(angle) * (canopyRadius + 0.1),
      ],
      bulb % 3 === 0 ? starGold : bulb % 3 === 1 ? glowCyan : glowViolet,
    );
  }
  for (let star = 0; star < 12; star++) {
    const angle = (star / 12) * Math.PI * 2 + 0.2;
    const radius = star % 2 === 0 ? 1.7 : 2.6;
    const lift = star % 2 === 0 ? 0.62 : 0.24;
    addSparkle(
      builder,
      [
        Math.sin(angle) * radius,
        canopyY + lift + 0.06,
        Math.cos(angle) * radius,
      ],
      star % 2 === 0 ? 0.12 : 0.09,
      star % 4 === 0 ? starGold : glowWhite,
    );
  }
  builder.add("glow", glowCyan, new TorusGeometry(1.35, 0.03, 4, 32), {
    at: [0, canopyY + 0.68, 0],
    rotation: [Math.PI / 2, 0, 0],
  });
};

const buildCrownStar = (builder: AttractionBuilder) => {
  const geometry = new ExtrudeGeometry(starShape(0.62, 0.27), {
    depth: 0.14,
    bevelEnabled: !builder.isFar,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -0.07);
  builder.add("glow", starGold, geometry, { at: [0, 0.75, 0] });
  builder.cylinder("metal", silver, {
    radius: 0.05,
    length: 0.5,
    at: [0, 0.2, 0],
    segments: 6,
  });
};

const buildBaseGlow = (builder: AttractionBuilder) => {
  builder.add(
    "glow",
    glowCyan,
    new TorusGeometry(1.25, 0.05, 4, builder.segments(32, 12)),
    {
      rotation: [Math.PI / 2, 0, 0],
    },
  );
  for (let star = 0; star < 6; star++) {
    const angle = (star / 6) * Math.PI * 2;
    addSparkle(
      builder,
      [Math.sin(angle) * 1.25, 0.12, Math.cos(angle) * 1.25],
      0.1,
      star % 2 === 0 ? starGold : glowViolet,
    );
  }
};

/* A swing chair, which the orbit carries round: it faces local -z */

const buildChair = (builder: AttractionBuilder) => {
  const [colour, trim] = chairColours;
  builder.box("paint", colour, [0.5, 0.08, 0.46], [0, 0, 0]);
  builder.box(
    "paint",
    colour,
    [0.5, 0.55, 0.07],
    [0, 0.28, 0.22],
    [-0.15, 0, 0],
  );
  builder.box("paint", trim, [0.52, 0.06, 0.08], [0, 0.03, -0.24]);
  builder.box(
    "paint",
    trim,
    [0.52, 0.06, 0.08],
    [0, 0.52, 0.26],
    [-0.15, 0, 0],
  );
  [-1, 1].forEach((side) => {
    if (builder.isFar) {
      builder.bar(
        "metal",
        silver,
        [side * 0.27, 0.28, 0],
        [-chainInward, chainLength, side * 0.05],
        0.03,
        4,
      );
      return;
    }
    builder.box("metal", silver, [0.04, 0.32, 0.46], [side * 0.27, 0.12, 0]);
    const top: Triple = [-chainInward, chainLength, 0];
    builder.bar(
      "metal",
      silver,
      [side * 0.27, 0.28, 0.2],
      [top[0], top[1], side * 0.05],
      0.025,
      4,
    );
    builder.bar(
      "metal",
      silver,
      [side * 0.27, 0.28, -0.2],
      [top[0], top[1], side * 0.05],
      0.025,
      4,
    );
  });
  builder.bar(
    "metal",
    silver,
    [-0.25, 0.32, -0.26],
    [0.25, 0.32, -0.26],
    0.05,
    6,
  );
  if (builder.isFar) {
    return;
  }
  builder.box("metal", silver, [0.4, 0.03, 0.14], [0, -0.32, -0.3]);
  builder.bar("metal", silver, [0, -0.05, -0.2], [0, -0.32, -0.3], 0.03, 4);
  builder.add("glow", starGold, new OctahedronGeometry(0.06, 0), {
    at: [0, 0.6, 0.25],
  });
};

/* The fence, the gate, the booth and the grounds */

const buildFence = (builder: AttractionBuilder) => {
  const span = Math.PI * 2 - gateHalf * 2;
  const posts = builder.isFar ? 10 : 30;
  for (let post = 0; post <= posts; post++) {
    const angle = gateHalf + (post / posts) * span;
    builder.cylinder("metal", silver, {
      radius: 0.045,
      length: 1.0,
      at: around(angle, fenceRadius, 0.5),
      segments: 6,
    });
  }
  [0.45, 0.95].forEach((y) => {
    builder.add(
      "paint",
      y > 0.9 ? navy : silver,
      new TorusGeometry(fenceRadius, 0.04, 4, builder.segments(40, 16), span)
        .rotateX(Math.PI / 2)
        .rotateY(Math.PI * 1.5 - gateHalf),
      { at: [flyerAt.x, y, flyerAt.z] },
    );
  });
  [-1, 1].forEach((side) => {
    const at = around(side * gateHalf, fenceRadius, 0);
    builder.cylinder("paint", navy, {
      radius: 0.12,
      length: 2.4,
      at: [at[0], 1.2, at[2]],
      segments: 10,
    });
    addSparkle(builder, [at[0], 2.6, at[2]], 0.16, starGold);
  });
  const left = around(-gateHalf, fenceRadius, 0);
  const right = around(gateHalf, fenceRadius, 0);
  builder.add(
    "paint",
    navy,
    new TorusGeometry((right[0] - left[0]) / 2, 0.08, 5, 14, Math.PI),
    { at: [(left[0] + right[0]) / 2, 2.25, left[2]] },
  );
  if (!builder.isFar) {
    for (let bulb = 0; bulb < 7; bulb++) {
      const angle = (bulb / 6) * Math.PI;
      const radius = (right[0] - left[0]) / 2;
      addBulb(
        builder,
        [
          (left[0] + right[0]) / 2 + Math.cos(angle) * radius,
          2.25 + Math.sin(angle) * radius,
          left[2] + 0.09,
        ],
        bulb % 2 === 0 ? glowCyan : glowViolet,
      );
    }
  }
};

const buildBooth = (builder: AttractionBuilder) => {
  const at: LocalPoint = { x: -3.4, z: 5.3 };
  builder.cylinder("paint", white, {
    radius: 0.62,
    length: 1.8,
    at: [at.x, 0.9, at.z],
    segments: 16,
  });
  builder.cylinder("paint", "#5b3fa8", {
    radius: 0.64,
    length: 0.3,
    at: [at.x, 0.15, at.z],
    segments: 16,
  });
  builder.lathe(
    "paint",
    "#5b3fa8",
    [
      [0.001, 1.8],
      [0.85, 1.8],
      [0.82, 1.9],
      [0.25, 2.5],
      [0.001, 2.65],
    ],
    [at.x, 0, at.z],
    "y",
    16,
  );
  addSparkle(builder, [at.x, 2.82, at.z], 0.13, starGold);
  builder.box(
    "glow",
    "#ffe6a8",
    [0.6, 0.42, 0.04],
    [at.x + 0.1, 1.25, at.z + 0.6],
    [0, 0.25, 0],
  );
  builder.box(
    "paint",
    silver,
    [0.7, 0.05, 0.18],
    [at.x + 0.1, 1.0, at.z + 0.64],
    [0, 0.25, 0],
  );
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
  builder.sphere("glow", glowWhite, 0.15, [at.x, 2.55, at.z], [1, 1, 1], 8);
  addSparkle(builder, [at.x, 2.85, at.z], 0.09, starGold);
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.cylinder("matte", paving, {
    radius: fenceRadius + 0.25,
    length: 0.03,
    at: [flyerAt.x, 0.015, flyerAt.z],
    segments: builder.segments(40, 16),
  });
  if (!builder.isFar) {
    builder.add(
      "matte",
      navy,
      new LatheGeometry(
        [
          new Vector2(orbitRadius + 0.35, 0.034),
          new Vector2(orbitRadius - 0.35, 0.034),
        ],
        40,
      ),
      { at: [flyerAt.x, 0, flyerAt.z] },
    );
    for (let star = 0; star < 8; star++) {
      const angle = (star / 8) * Math.PI * 2 + Math.PI / 8;
      const geometry = new ExtrudeGeometry(starShape(0.22, 0.1), {
        depth: 0.02,
        bevelEnabled: false,
      });
      builder.add("paint", starGold, geometry, {
        at: around(angle, orbitRadius, 0.04),
        rotation: [-Math.PI / 2, 0, 0],
      });
    }
  }
  builder.box("matte", paving, [1.8, 0.03, 4.0], [0, 0.015, 6.4]);
  buildTower(builder);
  buildFence(builder);
  buildBooth(builder);
  addStarLamp(builder, { x: -1.3, z: 5.4 });
  addStarLamp(builder, { x: 1.3, z: 7.4 });
  addBench(builder, [5.7, 0, 2.4], -Math.PI / 2 - 0.3, "#7d8fc4");
  addBench(builder, [-5.8, 0, -2.2], Math.PI / 2 + 0.2, "#7d8fc4");
  addBush(builder, [5.6, 0, -3.6], 0.6, "#2f5e46");
  addBush(builder, [-5.2, 0, 2.6], 0.55, "#2f5e46");
  addBush(builder, [-1.6, 0, -6.6], 0.65, "#2f5e46");
  addSignBoard(builder, [signAt.x, 0, signAt.z], navy);
};

/* Visitors, waiting their turn */

const buildVisitor = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((x) => {
    builder.cylinder("paint", navy, {
      radius: 0.06,
      length: 0.46,
      at: [x, 0.23, 0],
      segments: builder.segments(6, 4),
    });
  });
  builder.cylinder("paint", "#d84f9a", {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.42,
    at: [0, 0.66, 0],
    segments: builder.segments(10, 6),
  });
  if (builder.isFar) {
    builder.sphere("paint", "#c98d64", 0.14, [0, 1.0, 0], [1, 1, 1], 6);
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      "#d84f9a",
      [side * 0.17, 0.84, 0],
      [side * 0.22, 0.52, 0.06],
      0.08,
      5,
    );
  });
  builder.sphere("paint", "#c98d64", 0.14, [0, 1.0, 0], [1, 1, 1], 10);
  builder.sphere("paint", "#2b1d16", 0.145, [0, 1.04, -0.02], [1, 0.75, 1], 8);
  builder.add("glow", starGold, new OctahedronGeometry(0.05, 0), {
    at: [0.2, 0.5, 0.12],
  });
};

/* The ride: hop into a swing chair and fly round the tower */

const rideStart: LocalPoint = { x: 0, z: flyerAt.z + fenceRadius - 0.75 };
const rideFinish: LocalPoint = { x: -1.1, z: flyerAt.z + fenceRadius + 1.6 };

const flyerRide = (progress: number, clockSeconds: number): LocalSpot => {
  const pose = findMotionPose(chairMotion, clockSeconds, { copy: 0 });
  const [x, y, z] = moveWithPose(
    chairPivot,
    [chairPivot[0], chairPivot[1] + 0.06, chairPivot[2]],
    pose,
  );
  const share = Math.min(1, progress * 7, (1 - progress) * 7);
  const outside = progress < 0.5 ? rideStart : rideFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1] + Math.PI,
  };
};

export const starFlyerModel: NewLandAttractionModel = {
  kind: "star-flyer",
  islandId: "starfall-isle",
  name: "Star Flyer",
  fact: "The swing chairs fly round in a circle because their chains keep pulling them in towards the tower. In the same way, the pull of the Earth's gravity keeps the Moon travelling round the Earth, once about every 27 days, instead of flying off into space. The Moon is about a quarter as wide as the Earth.",
  curriculumLink:
    "Science, Year 5: Earth and space. Describe the movement of the Moon relative to the Earth.",
  footprint: 9,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: buildGrounds,
  moving: [
    {
      name: "canopy",
      pivot: flyerPivot,
      build: buildCanopy,
      motion: { kind: "spin", axis: "y", speed: flyerSpeed },
    },
    {
      name: "swing-chairs",
      pivot: chairPivot,
      build: buildChair,
      motion: chairMotion,
    },
    {
      name: "crown-star",
      pivot: [flyerAt.x, canopyY + 1.85, flyerAt.z],
      build: buildCrownStar,
      motion: { kind: "whirl", axis: "y", idle: 0.6, speed: 5, reach: 8 },
    },
    {
      name: "base-glow",
      pivot: [flyerAt.x, 0.58, flyerAt.z],
      build: buildBaseGlow,
      motion: { kind: "wake", reach: 7 },
    },
  ],
  blockers: [
    { x: flyerAt.x, z: flyerAt.z, radius: 1.2 },
    { x: -3.4, z: 5.3, radius: 0.7 },
  ] satisfies LocalBlocker[],
  wanderers: [
    {
      name: "visitors",
      build: buildVisitor,
      count: 3,
      centre: { x: 6.0, z: -0.6 },
      radius: 1.0,
      speed: 0.35,
    },
  ],
  rides: [
    {
      id: "star-flyer",
      name: "the star flyer",
      start: rideStart,
      reach: 0.6,
      seconds: 20,
      finish: rideFinish,
      follow: flyerRide,
    },
  ],
  tune: [72, 76, 79, 84, 79, 76, 72, 74, 77, 81],
  play: {
    label: "Spin the Star Flyer faster",
    news: "Wheee! The chairs swung out wide as they whirled round the tower, held in by their chains, just as gravity holds the Moon on its path round the Earth.",
  },
};
