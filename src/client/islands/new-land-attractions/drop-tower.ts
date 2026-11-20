import { ConeGeometry, ExtrudeGeometry, Shape, TorusGeometry } from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  findMotionPose,
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
const concrete = "#a9adb8";
const glowCyan = "#62f0ff";
const glowViolet = "#b58cff";
const glowWhite = "#f4f8ff";
const starGold = "#ffd95e";
const seatViolet = "#5b3fa8";
const harnessYellow = "#f2c531";
const queueRed = "#d4443a";

const towerAt: LocalPoint = { x: 0, z: -0.6 };
const towerRadius = 0.5;
const towerHeight = 12.4;
const plinthRadius = 1.15;
const plinthHeight = 0.45;
const ringInner = 0.62;
const ringOuter = 1.45;
const seatCount = 8;
const seatOut = 1.62;
const fenceRadius = 3.5;
const gateHalf = 0.42;

const ringBob = 4.7;
const ringPivot: Triple = [towerAt.x, plinthHeight + 0.35 + ringBob, towerAt.z];
const ringMotion: Motion = {
  kind: "bob",
  height: ringBob,
  period: 9,
  phase: -Math.PI / 2,
};
const seatHeight = 0.08;

const signAt: LocalPoint = { x: -2.3, z: 6.4 };
const heightPostAt: LocalPoint = { x: 1.25, z: 3.4 };

const around = (angle: number, radius: number, y: number): Triple => [
  towerAt.x + Math.sin(angle) * radius,
  y,
  towerAt.z + Math.cos(angle) * radius,
];

/* The tower */

const buildTower = (builder: AttractionBuilder) => {
  const { x, z } = towerAt;
  builder.cylinder("matte", concrete, {
    radius: plinthRadius,
    radiusEnd: plinthRadius - 0.1,
    length: plinthHeight,
    at: [x, plinthHeight / 2, z],
    segments: 8,
  });
  builder.cylinder("paint", navy, {
    radius: plinthRadius - 0.08,
    length: 0.06,
    at: [x, plinthHeight + 0.03, z],
    segments: 8,
  });
  for (let fin = 0; fin < 4; fin++) {
    const angle = (fin / 4) * Math.PI * 2;
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.75, 0);
    shape.lineTo(0.7, 0.35);
    shape.lineTo(0, 2.6);
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: !builder.isFar,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 1,
    });
    geometry.translate(0, 0, -0.06);
    builder.add("paint", fin % 2 === 0 ? navy : seatViolet, geometry, {
      at: around(angle, towerRadius - 0.05, plinthHeight),
      rotation: [0, angle - Math.PI / 2, 0],
    });
  }
  builder.cylinder("paint", white, {
    radius: towerRadius,
    radiusEnd: towerRadius * 0.86,
    length: towerHeight,
    at: [x, towerHeight / 2, z],
    segments: builder.segments(24, 12),
  });
  const bands = builder.isFar ? 4 : 12;
  for (let band = 0; band < bands; band++) {
    const y = 1.4 + (band / bands) * (towerHeight - 1.8);
    const radius = towerRadius * (1 - (0.14 * y) / towerHeight) + 0.012;
    builder.cylinder("glow", band % 2 === 0 ? glowCyan : glowViolet, {
      radius,
      length: 0.09,
      at: [x, y, z],
      segments: builder.segments(24, 12),
      isOpen: true,
    });
  }
  for (let stripe = 0; stripe < 4; stripe++) {
    const angle = (stripe / 4) * Math.PI * 2 + Math.PI / 4;
    builder.box(
      "paint",
      navy,
      [0.12, towerHeight - 1.2, 0.05],
      around(angle, towerRadius * 0.95, towerHeight / 2 + 0.4),
      [0, angle, 0],
    );
    if (!builder.isFar) {
      builder.box(
        "metal",
        silver,
        [0.04, towerHeight - 1.2, 0.07],
        around(angle + 0.12, towerRadius * 0.93, towerHeight / 2 + 0.4),
        [0, angle, 0],
      );
    }
  }
  builder.lathe(
    "paint",
    navy,
    [
      [towerRadius * 0.86, towerHeight - 0.1],
      [1.25, towerHeight + 0.25],
      [1.3, towerHeight + 0.55],
      [0.9, towerHeight + 0.75],
      [0.25, towerHeight + 0.85],
      [0.001, towerHeight + 0.86],
    ],
    [x, 0, z],
    "y",
    builder.segments(24, 12),
  );
  builder.cylinder("glow", glowCyan, {
    radius: 1.31,
    length: 0.1,
    at: [x, towerHeight + 0.4, z],
    segments: builder.segments(24, 12),
    isOpen: true,
  });
  builder.cylinder("metal", silver, {
    radius: 0.06,
    radiusEnd: 0.03,
    length: 1.1,
    at: [x, towerHeight + 1.35, z],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  for (let bulb = 0; bulb < 16; bulb++) {
    const angle = (bulb / 16) * Math.PI * 2;
    builder.sphere(
      "glow",
      bulb % 2 === 0 ? glowWhite : starGold,
      0.06,
      around(angle, 1.33, towerHeight + 0.25),
      [1, 1, 1],
      6,
    );
  }
  for (let rung = 0; rung < 22; rung++) {
    builder.box(
      "metal",
      silver,
      [0.3, 0.03, 0.03],
      [x, 1.0 + rung * 0.5, z - towerRadius - 0.12],
    );
  }
  [-0.15, 0.15].forEach((side) => {
    builder.box(
      "metal",
      silver,
      [0.03, 11, 0.03],
      [x + side, 6.5, z - towerRadius - 0.12],
    );
  });
  builder.box("metal", darkMetal, [0.5, 0.6, 0.35], [x + 0.9, 0.3, z - 0.75]);
  builder.box(
    "glow",
    "#7dff9a",
    [0.08, 0.08, 0.02],
    [x + 0.85, 0.45, z - 0.565],
  );
  builder.box(
    "glow",
    "#ff5a4a",
    [0.08, 0.08, 0.02],
    [x + 1.0, 0.45, z - 0.565],
  );
};

/** The great ring of seats that climbs the tower and drops back down. */
const buildRing = (builder: AttractionBuilder) => {
  builder.add(
    "paint",
    midnight,
    new TorusGeometry(
      (ringInner + ringOuter) / 2,
      0.16,
      6,
      builder.segments(32, 12),
    ),
    { rotation: [Math.PI / 2, 0, 0], at: [0, -0.32, 0] },
  );
  builder.cylinder("metal", silver, {
    radius: ringInner,
    length: 0.7,
    at: [0, -0.1, 0],
    segments: builder.segments(20, 10),
    isOpen: true,
  });
  builder.cylinder("metal", darkMetal, {
    radius: ringInner + 0.02,
    radiusEnd: ringOuter,
    length: 0.18,
    at: [0, -0.5, 0],
    segments: builder.segments(32, 12),
  });
  builder.cylinder("glow", glowCyan, {
    radius: ringOuter + 0.01,
    length: 0.06,
    at: [0, -0.48, 0],
    segments: builder.segments(32, 12),
    isOpen: true,
  });
  for (let seat = 0; seat < seatCount; seat++) {
    const angle = (seat / seatCount) * Math.PI * 2;
    const place = (side: number, y: number, out: number): Triple => [
      Math.sin(angle) * out + Math.cos(angle) * side,
      y,
      Math.cos(angle) * out - Math.sin(angle) * side,
    ];
    const rotation: Triple = [0, angle, 0];
    builder.box(
      "paint",
      seatViolet,
      [0.5, 0.1, 0.42],
      place(0, seatHeight - 0.05, seatOut - 0.05),
      rotation,
    );
    builder.box(
      "paint",
      seatViolet,
      [0.5, 0.9, 0.1],
      place(0, seatHeight + 0.38, seatOut - 0.3),
      rotation,
    );
    builder.box(
      "paint",
      white,
      [0.2, 0.2, 0.1],
      place(0, seatHeight + 0.9, seatOut - 0.3),
      rotation,
    );
    if (builder.isFar) {
      continue;
    }
    [-0.17, 0.17].forEach((side) => {
      builder.bar(
        "paint",
        harnessYellow,
        place(side, seatHeight + 0.85, seatOut - 0.2),
        place(side, seatHeight + 0.62, seatOut + 0.06),
        0.07,
        5,
      );
      builder.bar(
        "paint",
        harnessYellow,
        place(side, seatHeight + 0.62, seatOut + 0.06),
        place(side, seatHeight + 0.2, seatOut + 0.1),
        0.07,
        5,
      );
    });
    builder.box(
      "paint",
      harnessYellow,
      [0.4, 0.08, 0.08],
      place(0, seatHeight + 0.22, seatOut + 0.1),
      rotation,
    );
    builder.box(
      "metal",
      silver,
      [0.44, 0.04, 0.22],
      place(0, seatHeight - 0.42, seatOut + 0.16),
      rotation,
    );
    builder.bar(
      "metal",
      silver,
      place(0, seatHeight - 0.1, seatOut - 0.25),
      place(0, seatHeight - 0.42, seatOut + 0.08),
      0.05,
      4,
    );
    builder.sphere(
      "glow",
      seat % 2 === 0 ? glowViolet : glowCyan,
      0.05,
      place(0.28, seatHeight + 0.75, seatOut - 0.3),
      [1, 1, 1],
      5,
    );
  }
};

const buildStar = (builder: AttractionBuilder) => {
  const shape = new Shape();
  for (let point = 0; point < 10; point++) {
    const angle = (point / 10) * Math.PI * 2;
    const radius = point % 2 === 0 ? 0.6 : 0.26;
    const px = Math.sin(angle) * radius;
    const py = Math.cos(angle) * radius;
    if (point === 0) {
      shape.moveTo(px, py);
    } else {
      shape.lineTo(px, py);
    }
  }
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: !builder.isFar,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -0.07);
  builder.add("glow", starGold, geometry, { at: [0, 0.6, 0] });
  builder.cylinder("metal", silver, {
    radius: 0.05,
    length: 0.5,
    at: [0, 0.1, 0],
    segments: 6,
  });
};

const buildBeam = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.add(
      "glow",
      glowCyan,
      new ConeGeometry(0.9, 9, 12, 1, true).translate(0, -4.5, 0),
      { rotation: [0, 0, side * 2.7] },
    );
  });
};

/* The fence, the queue, the gate and the operator's booth */

const buildFence = (builder: AttractionBuilder) => {
  const posts = builder.isFar ? 12 : 28;
  const start = gateHalf;
  const span = Math.PI * 2 - gateHalf * 2;
  for (let post = 0; post <= posts; post++) {
    const angle = start + (post / posts) * span;
    builder.cylinder("metal", silver, {
      radius: 0.045,
      length: 1.05,
      at: around(angle, fenceRadius, 0.525),
      segments: 6,
    });
  }
  [0.5, 1.0].forEach((y) => {
    builder.add(
      "paint",
      y > 0.9 ? navy : silver,
      new TorusGeometry(fenceRadius, 0.04, 4, builder.segments(40, 16), span)
        .rotateX(Math.PI / 2)
        .rotateY(Math.PI * 1.5 - gateHalf),
      { at: [towerAt.x, y, towerAt.z] },
    );
  });
  [-1, 1].forEach((side) => {
    const at = around(side * gateHalf, fenceRadius, 0);
    builder.cylinder("paint", navy, {
      radius: 0.12,
      length: 2.6,
      at: [at[0], 1.3, at[2]],
      segments: 10,
    });
    builder.sphere(
      "glow",
      side < 0 ? glowCyan : glowViolet,
      0.14,
      [at[0], 2.72, at[2]],
      [1, 1, 1],
      8,
    );
  });
  const left = around(-gateHalf, fenceRadius, 0);
  const right = around(gateHalf, fenceRadius, 0);
  builder.box(
    "paint",
    navy,
    [right[0] - left[0] + 0.3, 0.42, 0.12],
    [(left[0] + right[0]) / 2, 2.45, left[2]],
  );
  if (!builder.isFar) {
    for (let bulb = 0; bulb < 7; bulb++) {
      builder.sphere(
        "glow",
        bulb % 2 === 0 ? starGold : glowWhite,
        0.05,
        [
          left[0] + 0.2 + bulb * ((right[0] - left[0] - 0.4) / 6),
          2.45,
          left[2] + 0.08,
        ],
        [1, 1, 1],
        5,
      );
    }
  }
};

const buildQueue = (builder: AttractionBuilder) => {
  const lanes: [LocalPoint, LocalPoint][] = [
    [
      { x: 2.4, z: 3.9 },
      { x: 4.4, z: 3.9 },
    ],
    [
      { x: 2.4, z: 4.9 },
      { x: 4.4, z: 4.9 },
    ],
    [
      { x: 2.4, z: 5.9 },
      { x: 4.4, z: 5.9 },
    ],
  ];
  lanes.forEach(([from, to]) => {
    [from, to].forEach(({ x, z }) => {
      builder.cylinder("metal", silver, {
        radius: 0.05,
        length: 0.9,
        at: [x, 0.45, z],
        segments: 6,
      });
      builder.cylinder("metal", silver, {
        radius: 0.12,
        length: 0.04,
        at: [x, 0.02, z],
        segments: 8,
      });
    });
    builder.box(
      "paint",
      queueRed,
      [to.x - from.x, 0.08, 0.02],
      [(from.x + to.x) / 2, 0.8, from.z],
    );
  });
  builder.box("matte", "#b9bdc8", [2.8, 0.03, 3.0], [3.4, 0.015, 4.9]);
};

const buildBooth = (builder: AttractionBuilder) => {
  const at: LocalPoint = { x: -3.6, z: 2.6 };
  builder.box("paint", white, [1.4, 1.9, 1.2], [at.x, 0.95, at.z]);
  builder.box("paint", navy, [1.6, 0.14, 1.4], [at.x, 1.97, at.z]);
  builder.box("glass", "#7fb6dc", [1.0, 0.6, 0.04], [at.x, 1.3, at.z + 0.61]);
  builder.box("glass", "#7fb6dc", [0.04, 0.6, 0.8], [at.x + 0.71, 1.3, at.z]);
  builder.box("paint", navy, [1.42, 0.1, 1.22], [at.x, 0.05, at.z]);
  if (!builder.isFar) {
    builder.box(
      "metal",
      darkMetal,
      [0.7, 0.08, 0.3],
      [at.x + 0.2, 0.95, at.z + 0.65],
    );
    builder.box(
      "glow",
      "#ff5a4a",
      [0.1, 0.05, 0.1],
      [at.x + 0.05, 1.0, at.z + 0.7],
    );
    builder.box(
      "glow",
      "#7dff9a",
      [0.1, 0.05, 0.1],
      [at.x + 0.3, 1.0, at.z + 0.7],
    );
    builder.cylinder("metal", silver, {
      radius: 0.02,
      length: 0.8,
      at: [at.x - 0.5, 2.4, at.z - 0.3],
      segments: 4,
    });
    builder.sphere(
      "glow",
      "#ff5a4a",
      0.07,
      [at.x - 0.5, 2.82, at.z - 0.3],
      [1, 1, 1],
      6,
    );
  }
};

const buildHeightPost = (builder: AttractionBuilder) => {
  const { x, z } = heightPostAt;
  builder.box("paint", white, [0.3, 1.7, 0.08], [x, 0.85, z]);
  for (let mark = 0; mark < 8; mark++) {
    builder.box(
      "paint",
      mark % 2 === 0 ? glowViolet : navy,
      [0.3, 0.12, 0.09],
      [x, 0.3 + mark * 0.17, z],
    );
  }
};

const buildHeightStar = (builder: AttractionBuilder) => {
  builder.box("glow", starGold, [0.36, 0.08, 0.12], [0, 0, 0]);
  builder.add(
    "glow",
    starGold,
    new ConeGeometry(0.1, 0.16, 3).rotateZ(Math.PI / 2),
    { at: [-0.25, 0, 0] },
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#b9bdc8", {
    radius: fenceRadius + 0.2,
    length: 0.03,
    at: [towerAt.x, 0.015, towerAt.z],
    segments: builder.segments(40, 16),
  });
  if (!builder.isFar) {
    for (let ring = 1; ring <= 3; ring++) {
      builder.cylinder("matte", ring % 2 === 0 ? navy : "#9da2b0", {
        radius: plinthRadius + ring * 0.6,
        length: 0.034,
        at: [towerAt.x, 0.017, towerAt.z],
        segments: 40,
        isOpen: true,
      });
    }
  }
  builder.box("matte", "#b9bdc8", [1.8, 0.03, 4.4], [0, 0.015, 5.0]);
  buildTower(builder);
  buildFence(builder);
  buildQueue(builder);
  buildBooth(builder);
  buildHeightPost(builder);
  addBench(builder, [-4.6, 0, -2.0], Math.PI / 2, "#7d8fc4");
  addBench(builder, [4.6, 0, -2.2], -Math.PI / 2, "#7d8fc4");
  addBush(builder, [-5.0, 0, 5.2], 0.55, "#2f5e46");
  addBush(builder, [5.4, 0, 1.0], 0.6, "#2f5e46");
  addBush(builder, [0.4, 0, -5.6], 0.7, "#2f5e46");
  addSignBoard(builder, [signAt.x, 0, signAt.z], navy);
};

/* Visitors, looking up at the tower */

const shirt = "#3c8fe0";

const buildVisitor = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((x) => {
    builder.cylinder("paint", navy, {
      radius: 0.06,
      length: 0.46,
      at: [x, 0.23, 0],
      segments: builder.segments(6, 4),
    });
  });
  builder.cylinder("paint", shirt, {
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
      shirt,
      [side * 0.17, 0.84, 0],
      [side * 0.22, 0.52, 0.06],
      0.08,
      5,
    );
  });
  builder.sphere("paint", "#e9b48a", 0.14, [0, 1.0, 0], [1, 1, 1], 10);
  builder.sphere("paint", "#4a2f22", 0.145, [0, 1.04, -0.02], [1, 0.75, 1], 8);
  builder.cylinder("glow", glowCyan, {
    radius: 0.16,
    length: 0.03,
    at: [0, 1.12, 0],
    segments: 10,
    isOpen: true,
  });
};

/* The ride: strap into the front seat, climb to the top, and drop! */

const rideStart: LocalPoint = { x: 0, z: towerAt.z + fenceRadius - 0.9 };
const rideFinish: LocalPoint = { x: -0.9, z: towerAt.z + fenceRadius + 1.7 };
const frontSeat = { x: towerAt.x, z: towerAt.z + seatOut - 0.1 };

const dropRide = (progress: number, clockSeconds: number): LocalSpot => {
  const pose = findMotionPose(ringMotion, clockSeconds);
  const seatY = ringPivot[1] + pose.position[1] + seatHeight;
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? rideStart : rideFinish;
  return {
    x: outside.x + (frontSeat.x - outside.x) * share,
    y: seatY * share,
    z: outside.z + (frontSeat.z - outside.z) * share,
    heading: 0,
  };
};

export const dropTowerModel: NewLandAttractionModel = {
  kind: "drop-tower",
  islandId: "starfall-isle",
  name: "Drop Tower",
  fact: "Everything falls because gravity pulls it towards the middle of the Earth. Without air to push against them, a hammer and a feather fall at exactly the same speed, as astronaut David Scott showed on the Moon in 1971. On Earth, air resistance pushes up against falling things and slows them down.",
  curriculumLink:
    "Science, Year 5: forces. Explain that unsupported objects fall towards the Earth because of the force of gravity, and identify the effects of air resistance.",
  footprint: 8,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: buildGrounds,
  moving: [
    {
      name: "seat-ring",
      pivot: ringPivot,
      build: buildRing,
      motion: ringMotion,
    },
    {
      name: "top-star",
      pivot: [towerAt.x, towerHeight + 1.75, towerAt.z],
      build: buildStar,
      motion: { kind: "whirl", axis: "y", idle: 0.5, speed: 4.5, reach: 7 },
    },
    {
      name: "height-star",
      pivot: [heightPostAt.x + 0.32, 0.5, heightPostAt.z],
      build: buildHeightStar,
      motion: { kind: "rise", reach: 3, height: 0.75, period: 2.4 },
    },
    {
      name: "sky-beams",
      pivot: [towerAt.x, towerHeight + 0.9, towerAt.z],
      build: buildBeam,
      motion: { kind: "spin", axis: "y", speed: 0.9 },
      look: "beam",
    },
  ],
  blockers: [
    { x: towerAt.x, z: towerAt.z, radius: plinthRadius },
    { x: -3.6, z: 2.6, radius: 0.85 },
  ] satisfies LocalBlocker[],
  wanderers: [
    {
      name: "visitors",
      build: buildVisitor,
      count: 3,
      centre: { x: 4.3, z: -4.5 },
      radius: 1.3,
      speed: 0.4,
    },
  ],
  rides: [
    {
      id: "drop-tower",
      name: "the drop tower",
      start: rideStart,
      reach: 0.6,
      seconds: 20,
      finish: rideFinish,
      follow: dropRide,
    },
  ],
  play: {
    label: "Press the big drop button",
    news: "Whoosh! The seats shot up the tower and fell back down. Gravity pulled them towards the Earth, and the brakes slowed them gently at the bottom.",
  },
};
