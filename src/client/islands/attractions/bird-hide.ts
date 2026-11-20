import { CylinderGeometry, Shape } from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  addTree,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "./attraction-kit.js";

const cladding = "#7d5c3e";
const batten = "#5c4029";
const trim = "#3d4a3b";
const turf = "#5f8139";
const felt = "#2f3230";
const barkChip = "#9a7650";
const mud = "#4a4632";
const reed = "#7f9a4a";
const bulrush = "#5a3a22";
const boardFace = "#f1e8d0";

/* The pond */

const pond = { x: 0, z: -3.3, rx: 3.3, rz: 2.3 };

const buildPond = (builder: AttractionBuilder) => {
  const segments = builder.segments(40, 20);
  builder.add(
    "matte",
    "#6f6a48",
    new CylinderGeometry(1, 1.04, 0.06, segments),
    { at: [pond.x, 0.03, pond.z], scale: [pond.rx + 0.35, 1, pond.rz + 0.35] },
  );
  builder.add("matte", mud, new CylinderGeometry(1, 1, 0.05, segments), {
    at: [pond.x, 0.05, pond.z],
    scale: [pond.rx, 1, pond.rz],
  });
  builder.add("water", "#4f8f8a", new CylinderGeometry(1, 1, 0.04, segments), {
    at: [pond.x, 0.1, pond.z],
    scale: [pond.rx - 0.05, 1, pond.rz - 0.05],
  });
  const pads: [number, number, number][] = [
    [-1.6, -3.9, 0.22],
    [-1.2, -4.4, 0.16],
    [1.7, -4.2, 0.2],
    [2.1, -3.6, 0.15],
    [-0.4, -5.0, 0.18],
    [0.9, -2.5, 0.14],
  ];
  pads.forEach(([x, z, radius], index) => {
    builder.cylinder("matte", index % 2 === 0 ? "#4f7f34" : "#5b8c3a", {
      radius,
      length: 0.02,
      at: [x, 0.125, z],
      segments: 10,
    });
    if (index % 3 === 0 && !builder.isFar) {
      builder.sphere(
        "matte",
        "#f6eef2",
        0.06,
        [x + radius * 0.3, 0.15, z],
        [1, 0.6, 1],
        6,
      );
      builder.sphere("matte", "#f2c94c", 0.025, [x + radius * 0.3, 0.18, z]);
    }
  });
  const clumps = builder.isFar ? 9 : 16;
  for (let clump = 0; clump < clumps; clump++) {
    const angle = (clump / clumps) * Math.PI * 2 + 0.2;
    const edgeX = pond.x + Math.sin(angle) * pond.rx;
    const edgeZ = pond.z + Math.cos(angle) * pond.rz;
    if (Math.abs(edgeX) < 2.2 && edgeZ > -2) {
      continue;
    }
    const stems = builder.isFar ? 3 : 6;
    for (let stem = 0; stem < stems; stem++) {
      const spread = (stem - stems / 2) * 0.09;
      const across = angle + Math.PI / 2;
      const baseX = edgeX + Math.sin(across) * spread;
      const baseZ = edgeZ + Math.cos(across) * spread;
      const height = 0.75 + ((stem * 37 + clump * 11) % 7) * 0.08;
      const lean = 0.08 * Math.sin(stem * 2.3 + clump);
      builder.bar(
        "matte",
        stem % 2 === 0 ? reed : shade(reed, 0.85),
        [baseX, 0.05, baseZ],
        [baseX + lean, height, baseZ + lean * 0.6],
        0.035,
        3,
      );
      if (stem % 3 === 1) {
        builder.cylinder("matte", bulrush, {
          radius: 0.032,
          length: 0.17,
          at: [baseX + lean * 0.9, height - 0.1, baseZ + lean * 0.55],
          segments: 6,
        });
      }
    }
  }
};

const pondBlockers: LocalBlocker[] = [
  { x: pond.x, z: pond.z, radius: 2.1 },
  { x: pond.x - 1.6, z: pond.z, radius: 1.85 },
  { x: pond.x + 1.6, z: pond.z, radius: 1.85 },
  { x: pond.x - 2.6, z: pond.z, radius: 1.25 },
  { x: pond.x + 2.6, z: pond.z, radius: 1.25 },
];

/* The hide */

const hide = { halfWidth: 1.6, halfDepth: 0.95, floor: 0.3 };
const backTop = 1.8;
const frontTop = 2.3;
const slot = { bottom: 0.88, top: 1.12, halfWidth: 1.25 };
const doorway = { from: 0.55, to: 1.15, top: 1.45 };
const rampLength = 1.5;
const rampEnd = hide.halfDepth + rampLength;
const scopeAt = { x: -0.8, z: -0.55 };

const buildWallPanel = (
  builder: AttractionBuilder,
  {
    fromX,
    toX,
    bottom,
    top,
    z,
  }: { fromX: number; toX: number; bottom: number; top: number; z: number },
) => {
  builder.box(
    "matte",
    cladding,
    [toX - fromX, top - bottom, 0.08],
    [(fromX + toX) / 2, (bottom + top) / 2, z],
  );
  if (builder.isFar) {
    return;
  }
  const outward = z > 0 ? 0.05 : -0.05;
  const count = Math.max(1, Math.round((toX - fromX) / 0.22));
  for (let board = 1; board < count; board++) {
    const x = fromX + ((toX - fromX) * board) / count;
    builder.box(
      "matte",
      batten,
      [0.04, top - bottom, 0.03],
      [x, (bottom + top) / 2, z + outward],
    );
  }
};

const buildHide = (builder: AttractionBuilder) => {
  const { halfWidth, halfDepth, floor } = hide;
  const posts: [number, number][] = [
    [-1.5, -0.85],
    [1.5, -0.85],
    [-1.5, 0.85],
    [1.5, 0.85],
    [0, -0.85],
    [0, 0.85],
  ];
  posts.forEach(([x, z]) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.14, floor, 0.14],
      [x, floor / 2, z],
    );
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [halfWidth * 2 + 0.1, 0.12, halfDepth * 2 + 0.1],
    [0, floor - 0.06, 0],
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [halfWidth * 2 - 0.1, 0.02, halfDepth * 2 - 0.1],
    [0, floor + 0.01, 0],
  );

  const front = halfDepth;
  buildWallPanel(builder, {
    fromX: -halfWidth,
    toX: doorway.from,
    bottom: floor,
    top: frontTop,
    z: front,
  });
  buildWallPanel(builder, {
    fromX: doorway.to,
    toX: halfWidth,
    bottom: floor,
    top: frontTop,
    z: front,
  });
  buildWallPanel(builder, {
    fromX: doorway.from,
    toX: doorway.to,
    bottom: doorway.top,
    top: frontTop,
    z: front,
  });
  const back = -halfDepth;
  buildWallPanel(builder, {
    fromX: -halfWidth,
    toX: halfWidth,
    bottom: floor,
    top: slot.bottom,
    z: back,
  });
  buildWallPanel(builder, {
    fromX: -halfWidth,
    toX: halfWidth,
    bottom: slot.top,
    top: backTop + 0.02,
    z: back,
  });
  [-1, 1].forEach((side) => {
    buildWallPanel(builder, {
      fromX: side < 0 ? -halfWidth : slot.halfWidth,
      toX: side < 0 ? -slot.halfWidth : halfWidth,
      bottom: slot.bottom,
      top: slot.top,
      z: back,
    });
  });

  const sideShape = new Shape();
  sideShape.moveTo(halfDepth, floor);
  sideShape.lineTo(-halfDepth, floor);
  sideShape.lineTo(-halfDepth, frontTop);
  sideShape.lineTo(halfDepth, backTop);
  sideShape.closePath();
  [-1, 1].forEach((side) => {
    builder.sidePlate("matte", cladding, sideShape, side * halfWidth, 0.08);
    if (!builder.isFar) {
      for (let board = 1; board < 8; board++) {
        const z = -halfDepth + (halfDepth * 2 * board) / 8;
        const top =
          backTop + ((z + halfDepth) / (halfDepth * 2)) * (frontTop - backTop);
        builder.box(
          "matte",
          batten,
          [0.03, top - floor, 0.04],
          [side * (halfWidth + 0.05), (top + floor) / 2, z],
        );
      }
    }
  });

  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      const top = sideZ > 0 ? frontTop : backTop;
      builder.box(
        "matte",
        trim,
        [0.1, top - floor + 0.04, 0.1],
        [
          sideX * (halfWidth + 0.01),
          (top + floor) / 2,
          sideZ * (halfDepth + 0.01),
        ],
      );
    });
  });
  builder.box(
    "matte",
    trim,
    [doorway.to - doorway.from + 0.14, 0.08, 0.1],
    [(doorway.from + doorway.to) / 2, doorway.top + 0.04, front + 0.03],
  );
  [doorway.from, doorway.to].forEach((x) => {
    builder.box(
      "matte",
      trim,
      [0.07, doorway.top - floor, 0.1],
      [x, (doorway.top + floor) / 2, front + 0.03],
    );
  });
  builder.box(
    "paint",
    trim,
    [0.05, doorway.top - floor - 0.04, doorway.to - doorway.from - 0.04],

    [doorway.to + 0.06, (doorway.top + floor) / 2, front + 0.32],
  );
  if (!builder.isFar) {
    builder.sphere("metal", palette.brass, 0.025, [
      doorway.to + 0.1,
      floor + 0.6,
      front + 0.55,
    ]);
  }
  addWindow(builder, {
    at: [-0.75, 1.55, front + 0.06],
    width: 0.8,
    height: 0.42,
    frame: trim,
  });

  builder.box(
    "matte",
    "#1d1c19",
    [slot.halfWidth * 2, slot.top - slot.bottom, 0.02],
    [0, (slot.top + slot.bottom) / 2, -halfDepth + 0.3],
  );
  const flapAngle = 0.95;
  const flapDepth = 0.4;
  builder.box(
    "matte",
    batten,
    [slot.halfWidth * 2 + 0.1, 0.04, flapDepth],
    [
      0,
      slot.top + Math.sin(flapAngle) * (flapDepth / 2) * 0.3 + 0.02,
      back - 0.04 - Math.cos(flapAngle * 0.3) * (flapDepth / 2),
    ],
    [-0.3, 0, 0],
  );
  builder.box(
    "matte",
    trim,
    [slot.halfWidth * 2 + 0.1, 0.06, 0.12],
    [0, slot.bottom - 0.03, back - 0.05],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      palette.paleTimber,
      [slot.halfWidth * 2, 0.04, 0.24],
      [0, slot.bottom - 0.02, back + 0.15],
    );
    [-0.4, 0.4].forEach((x) => {
      builder.box(
        "matte",
        palette.paleTimber,
        [0.06, 0.32, 0.26],
        [0.3 + x, floor + 0.16, back + 0.24],
      );
    });
    builder.box(
      "matte",
      palette.paleTimber,
      [1.2, 0.05, 0.3],
      [0.3, floor + 0.34, back + 0.24],
    );
  }

  const angle = Math.atan2(frontTop - backTop, halfDepth * 2);
  const overhangBack = 0.4;
  const overhangFront = 0.25;
  const slope =
    (halfDepth * 2 + overhangBack + overhangFront) / Math.cos(angle);
  const middleZ = (overhangFront - overhangBack) / 2;
  const middleY = (frontTop + backTop) / 2 + Math.tan(angle) * middleZ;
  const onRoof = (x: number, along: number, lift: number): Triple => [
    x,
    middleY + Math.sin(angle) * along + Math.cos(angle) * lift,
    middleZ + Math.cos(angle) * along - Math.sin(angle) * lift,
  ];
  builder.box(
    "matte",
    felt,
    [halfWidth * 2 + 0.4, 0.08, slope],
    onRoof(0, 0, 0.04),
    [-angle, 0, 0],
  );
  builder.roundedBox(
    "matte",
    turf,
    [halfWidth * 2 + 0.3, 0.16, slope - 0.1],
    0.07,
    onRoof(0, 0, 0.15),
    [-angle, 0, 0],
  );
  [-1, 1].forEach((end) => {
    builder.box(
      "matte",
      trim,
      [halfWidth * 2 + 0.44, 0.18, 0.05],
      onRoof(0, end * (slope / 2 + 0.02), 0.06),
      [-angle, 0, 0],
    );
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      trim,
      [0.05, 0.18, slope + 0.08],
      onRoof(side * (halfWidth + 0.22), 0, 0.06),
      [-angle, 0, 0],
    );
  });
  if (!builder.isFar) {
    const tufts: [number, number, string][] = [
      [-1.3, -0.6, "#6f9441"],
      [-0.6, 0.4, "#7aa04a"],
      [0.4, -0.3, "#6f9441"],
      [1.2, 0.5, "#8aaa52"],
      [0.9, -0.8, "#7aa04a"],
      [-1.0, 1.0, "#8aaa52"],
      [0.1, 0.9, "#6f9441"],
    ];
    tufts.forEach(([x, along, colour], index) => {
      for (let blade = 0; blade < 5; blade++) {
        const spin = blade * 1.26 + index;
        const [bladeX, bladeY, bladeZ] = onRoof(
          x + Math.sin(spin) * 0.12,
          along + Math.cos(spin) * 0.12,
          0.3,
        );
        builder.add(
          "matte",
          blade % 2 === 0 ? colour : shade(colour, 0.85),
          new CylinderGeometry(0, 0.05, 0.28, 3, 1, true),
          { at: [bladeX, bladeY, bladeZ], rotation: [-angle, spin, 0] },
        );
      }
      builder.sphere(
        "matte",
        index % 2 === 0 ? "#e8c43a" : "#f3efe4",
        0.035,
        onRoof(x + 0.2, along - 0.15, 0.24),
        [1, 0.7, 1],
        5,
      );
    });
  }

  const rampX = (doorway.from + doorway.to) / 2;
  const rampAngle = Math.atan2(floor, rampLength);
  builder.box(
    "matte",
    palette.timber,
    [doorway.to - doorway.from + 0.1, 0.06, Math.hypot(rampLength, floor)],
    [rampX, floor / 2 - 0.03, halfDepth + rampLength / 2],
    [rampAngle, 0, 0],
  );
  if (!builder.isFar) {
    for (let cleat = 1; cleat < 6; cleat++) {
      const z = halfDepth + (rampLength * cleat) / 6;
      builder.box(
        "matte",
        palette.darkTimber,
        [0.6, 0.025, 0.04],
        [rampX, floor * (1 - (z - halfDepth) / rampLength) + 0.01, z],
      );
    }
  }
  const railX = doorway.from - 0.08;
  [halfDepth + 0.1, halfDepth + rampLength - 0.1].forEach((z) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 0.8, 0.07],
      [railX, 0.4, z],
    );
  });
  builder.bar(
    "matte",
    palette.paleTimber,
    [railX, floor + 0.62, halfDepth + 0.1],
    [railX, 0.8, halfDepth + rampLength - 0.1],
    0.06,
    6,
  );
};

const buildTelescope = (builder: AttractionBuilder) => {
  const head: Triple = [scopeAt.x, hide.floor + 0.62, scopeAt.z];
  [0, 2.1, 4.2].forEach((turn) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      head,
      [
        scopeAt.x + Math.sin(turn) * 0.2,
        hide.floor,
        scopeAt.z + Math.cos(turn) * 0.2,
      ],
      0.025,
      5,
    );
  });
  builder.cylinder("paint", "#2f4a36", {
    radius: 0.05,
    radiusEnd: 0.065,
    length: 0.42,
    at: [scopeAt.x, head[1] + 0.07, scopeAt.z - 0.05],
    axis: "z",
    segments: 12,
  });
  builder.cylinder("metal", palette.black, {
    radius: 0.025,
    length: 0.08,
    at: [scopeAt.x, head[1] + 0.07, scopeAt.z + 0.2],
    axis: "z",
    segments: 8,
  });
};

/* The nature trail */

const loopCentre = { x: 0, z: -2.6 };
const findLoopPoint = (angle: number): LocalPoint => {
  const wobble = 0.35 * Math.sin(angle * 3);
  return {
    x: loopCentre.x + (5.2 + wobble) * Math.sin(angle),
    z: loopCentre.z + (4.4 + wobble) * Math.cos(angle),
  };
};
const loopFrom = 0.6;
const loopTo = Math.PI * 2 - 0.6;
const loopPoints = Array.from({ length: 27 }, (_, step) =>
  findLoopPoint(loopFrom + ((loopTo - loopFrom) * step) / 26),
);
const fork = { x: 0.6, z: 4.1 };
const rampFoot = { x: (doorway.from + doorway.to) / 2, z: rampEnd + 0.2 };
const trails: LocalPoint[][] = [
  [{ x: 0, z: 9.4 }, { x: -0.5, z: 7.6 }, { x: 0.4, z: 5.8 }, fork],
  [fork, rampFoot],
  [fork, { x: 1.9, z: 3.1 }, loopPoints[0]],
  [fork, { x: -1.3, z: 3.2 }, loopPoints[loopPoints.length - 1]],
  loopPoints,
];

const buildTrails = (builder: AttractionBuilder) => {
  const width = 0.8;
  const joint = builder.segments(8, 6);
  trails.forEach((trail) => {
    trail.forEach((point, index) => {
      const colour = barkChip;
      builder.cylinder("matte", colour, {
        radius: width / 2,
        length: 0.04,
        at: [point.x, 0.035, point.z],
        segments: joint,
      });
      const next = trail.at(index + 1);
      if (next === undefined) {
        return;
      }
      builder.box(
        "matte",
        colour,
        [width, 0.04, Math.hypot(next.x - point.x, next.z - point.z)],
        [(point.x + next.x) / 2, 0.035, (point.z + next.z) / 2],
        [0, Math.atan2(next.x - point.x, next.z - point.z), 0],
      );
    });
  });
};

/* The spot-the-wildlife boards */

type Picture = "bird" | "butterfly" | "frog" | "hedgehog";

interface Mark {
  colour: string;
  at: [number, number];
  size: [number, number];
  turn?: number;
  sides?: number;
}

const pictureMarks: Record<Picture, Mark[]> = {
  bird: [
    { colour: "#7a5a3a", at: [0.02, -0.01], size: [0.11, 0.08], turn: -0.2 },
    { colour: "#7a5a3a", at: [-0.12, 0.02], size: [0.06, 0.025], turn: 0.4 },
    { colour: "#d9622b", at: [0.06, 0.0], size: [0.055, 0.055] },
    { colour: "#7a5a3a", at: [0.09, 0.07], size: [0.045, 0.045] },
    { colour: "#d9622b", at: [0.095, 0.06], size: [0.03, 0.03] },
    { colour: "#2b2b2b", at: [0.15, 0.075], size: [0.025, 0.012], sides: 3 },
    { colour: "#2b2b2b", at: [0.1, 0.08], size: [0.008, 0.008] },
    { colour: "#2b2b2b", at: [0.0, -0.1], size: [0.006, 0.03] },
    { colour: "#2b2b2b", at: [0.04, -0.1], size: [0.006, 0.03] },
  ],
  butterfly: [
    { colour: "#b8432f", at: [-0.07, 0.04], size: [0.07, 0.055], turn: 0.4 },
    { colour: "#b8432f", at: [0.07, 0.04], size: [0.07, 0.055], turn: -0.4 },
    { colour: "#8a3a2a", at: [-0.05, -0.05], size: [0.045, 0.04], turn: -0.4 },
    { colour: "#8a3a2a", at: [0.05, -0.05], size: [0.045, 0.04], turn: 0.4 },
    { colour: "#3f6fb0", at: [-0.09, 0.06], size: [0.022, 0.022] },
    { colour: "#3f6fb0", at: [0.09, 0.06], size: [0.022, 0.022] },
    { colour: "#2b2b2b", at: [0, 0], size: [0.012, 0.08] },
    { colour: "#2b2b2b", at: [-0.025, 0.1], size: [0.005, 0.03], turn: 0.4 },
    { colour: "#2b2b2b", at: [0.025, 0.1], size: [0.005, 0.03], turn: -0.4 },
  ],
  frog: [
    { colour: "#5f9a3c", at: [0, -0.02], size: [0.11, 0.07] },
    { colour: "#4f8434", at: [-0.1, -0.07], size: [0.06, 0.025], turn: 0.3 },
    { colour: "#4f8434", at: [0.1, -0.07], size: [0.06, 0.025], turn: -0.3 },
    { colour: "#5f9a3c", at: [-0.05, 0.06], size: [0.035, 0.035] },
    { colour: "#5f9a3c", at: [0.05, 0.06], size: [0.035, 0.035] },
    { colour: "#2b2b2b", at: [-0.05, 0.065], size: [0.015, 0.015] },
    { colour: "#2b2b2b", at: [0.05, 0.065], size: [0.015, 0.015] },
    { colour: "#d9c27a", at: [0, -0.03], size: [0.06, 0.035] },
  ],
  hedgehog: [
    { colour: "#4a3424", at: [-0.02, 0], size: [0.12, 0.075] },
    { colour: "#4a3424", at: [-0.1, 0.06], size: [0.03, 0.03], sides: 3 },
    { colour: "#4a3424", at: [-0.02, 0.08], size: [0.03, 0.03], sides: 3 },
    { colour: "#4a3424", at: [0.06, 0.06], size: [0.03, 0.03], sides: 3 },
    { colour: "#c9a77a", at: [0.1, -0.03], size: [0.06, 0.04], turn: -0.3 },
    { colour: "#2b2b2b", at: [0.16, -0.045], size: [0.015, 0.015] },
    { colour: "#2b2b2b", at: [0.1, -0.015], size: [0.01, 0.01] },
    { colour: "#3a2a1c", at: [-0.06, -0.08], size: [0.012, 0.025] },
    { colour: "#3a2a1c", at: [0.05, -0.08], size: [0.012, 0.025] },
  ],
};

const wildlifeBoards: { angle: number; picture: Picture }[] = [
  { angle: 1.25, picture: "frog" },
  { angle: 2.5, picture: "butterfly" },
  { angle: 3.85, picture: "bird" },
  { angle: 5.1, picture: "hedgehog" },
];

const buildWildlifeBoard = (
  builder: AttractionBuilder,
  at: LocalPoint,
  turn: number,
  picture: Picture,
) => {
  const right = { x: Math.cos(turn), z: -Math.sin(turn) };
  const out = { x: Math.sin(turn), z: Math.cos(turn) };
  const faceHeight = 0.82;
  builder.box(
    "matte",
    palette.darkTimber,
    [0.08, 0.95, 0.08],
    [at.x - out.x * 0.04, 0.47, at.z - out.z * 0.04],
  );
  builder.box(
    "paint",
    trim,
    [0.5, 0.42, 0.05],

    [at.x, faceHeight, at.z],
    [0, turn, 0],
  );
  builder.box(
    "matte",
    boardFace,
    [0.44, 0.36, 0.02],
    [at.x + out.x * 0.03, faceHeight, at.z + out.z * 0.03],
    [0, turn, 0],
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.56, 0.05, 0.12],
    [at.x, faceHeight + 0.23, at.z],
    [0, turn, 0],
  );
  if (builder.isFar) {
    return;
  }
  pictureMarks[picture].forEach((mark, index) => {
    const geometry = new CylinderGeometry(1, 1, 0.012, mark.sides ?? 8)
      .rotateX(Math.PI / 2)
      .scale(mark.size[0], mark.size[1], 1)
      .rotateZ(mark.turn ?? 0);
    const lift = 0.045 + index * 0.0015;
    builder.add("matte", mark.colour, geometry, {
      at: [
        at.x + right.x * mark.at[0] + out.x * lift,
        faceHeight + 0.02 + mark.at[1],
        at.z + right.z * mark.at[0] + out.z * lift,
      ],
      rotation: [0, turn, 0],
    });
  });
};

const boardSpots = wildlifeBoards.map(({ angle, picture }) => {
  const onPath = findLoopPoint(angle);
  const away = {
    x: Math.sin(angle) * 0.75,
    z: Math.cos(angle) * 0.75,
  };
  const at = { x: onPath.x + away.x, z: onPath.z + away.z };
  return { at, turn: Math.atan2(-away.x, -away.z), picture };
});

/* Bird boxes */

const birdBoxSpots: { at: LocalPoint; turn: number }[] = [
  { at: { x: -5.4, z: 4.4 }, turn: 0.6 },
  { at: { x: 5.5, z: 4.0 }, turn: -0.7 },
  { at: { x: 3.6, z: -8.0 }, turn: Math.PI - 0.3 },
];

const buildBirdBox = (
  builder: AttractionBuilder,
  at: LocalPoint,
  turn: number,
) => {
  const height = 1.55;
  builder.box(
    "matte",
    palette.darkTimber,
    [0.09, height, 0.09],
    [at.x, height / 2, at.z],
  );
  const out = { x: Math.sin(turn), z: Math.cos(turn) };
  const box: Triple = [at.x + out.x * 0.08, height + 0.12, at.z + out.z * 0.08];
  builder.box("matte", palette.paleTimber, [0.24, 0.32, 0.22], box, [
    0,
    turn,
    0,
  ]);
  builder.box(
    "matte",
    "#4f6a46",
    [0.32, 0.03, 0.32],
    [box[0], box[1] + 0.18, box[2]],
    [0.25, turn, 0],
  );
  builder.add(
    "matte",
    "#1d1c19",
    new CylinderGeometry(0.035, 0.035, 0.02, builder.segments(10, 6)).rotateX(
      Math.PI / 2,
    ),
    {
      at: [box[0] + out.x * 0.115, box[1] + 0.05, box[2] + out.z * 0.115],
      rotation: [0, turn, 0],
    },
  );
};

/* The ground round it */

const buildGrounds = (builder: AttractionBuilder) => {
  addTree(builder, [-6.6, 0, -5.0], 1.1);
  addTree(builder, [6.3, 0, -5.6], 1.05, "#4a9440");
  addTree(builder, [-7.3, 0, 1.4], 0.95, "#3c8237");
  addTree(builder, [7.0, 0, 1.6], 1.0, "#467f36");
  addBush(builder, [-3.0, 0, 6.6], 0.5);
  addBush(builder, [2.8, 0, 6.2], 0.45, "#3a7d34");
  addBush(builder, [-6.4, 0, -1.8], 0.45, "#3a7d34");
  addBush(builder, [6.6, 0, -2.4], 0.5);
  addBush(builder, [-2.2, 0, -8.0], 0.45);
  addBush(builder, [-2.6, 0, 1.6], 0.4, "#3a7d34");
  addBush(builder, [2.9, 0, 1.9], 0.38);
  addBench(builder, [-4.7, 0, -7.0], 0.7);
  addSignBoard(builder, [1.6, 0, 7.9], trim);
};

/* Wildlife */

const buildDuck = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#a49d90", 0.1, [0, 0.06, 0], [1, 0.7, 1.6], 8);
  builder.sphere("matte", "#6b3f2a", 0.075, [0, 0.08, 0.1], [1, 0.9, 1], 8);
  builder.sphere("matte", "#1f5a3a", 0.06, [0, 0.2, 0.15], [0.9, 1, 1.1], 8);
  builder.box(
    "matte",
    "#e0b43a",
    [0.05, 0.02, 0.07],

    [0, 0.19, 0.22],
  );
  builder.sphere("matte", "#2b2b2b", 0.045, [0, 0.1, -0.15], [1, 0.8, 1], 6);
};

const buildSwallow = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#1f2a44", 0.06, [0, 0, 0], [0.8, 0.75, 1.9], 8);
  builder.sphere(
    "matte",
    "#efe4c8",
    0.045,
    [0, -0.02, 0.03],
    [0.8, 0.6, 1.6],
    6,
  );
  builder.sphere("matte", "#a3402a", 0.035, [0, 0, 0.11], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#1f2a44",
      [0.24, 0.012, 0.07],
      [side * 0.13, 0.02, -0.01],
      [0, side * 0.45, side * 0.18],
    );
    builder.box(
      "matte",
      "#1f2a44",
      [0.015, 0.01, 0.13],
      [side * 0.03, 0, -0.15],
      [0, side * 0.3, 0],
    );
  });
};

/* The look through the telescope */

const lookSpot = { x: scopeAt.x, z: scopeAt.z + 0.4 };
const insideDoor = { x: rampFoot.x, z: hide.halfDepth - 0.35 };
const lookStart = { x: -0.7, z: 0.35 };

const findRampHeight = (z: number): number =>
  z <= hide.halfDepth
    ? hide.floor
    : Math.max(0, hide.floor * (1 - (z - hide.halfDepth) / rampLength));

const walkBetween = (
  from: LocalPoint,
  to: LocalPoint,
  share: number,
): LocalSpot => {
  const x = from.x + (to.x - from.x) * share;
  const z = from.z + (to.z - from.z) * share;
  return {
    x,
    y: findRampHeight(z),
    z,
    heading: Math.atan2(to.x - from.x, to.z - from.z),
  };
};

const telescopeRide = (progress: number, seconds: number): LocalSpot => {
  if (progress < 0.12) {
    return walkBetween(lookStart, lookSpot, progress / 0.12);
  }
  if (progress < 0.72) {
    return {
      x: lookSpot.x,
      y: hide.floor,
      z: lookSpot.z,
      heading: Math.PI + 0.25 * Math.sin(seconds * 0.9),
    };
  }
  if (progress < 0.82) {
    return walkBetween(lookSpot, insideDoor, (progress - 0.72) / 0.1);
  }
  return walkBetween(insideDoor, rampFoot, (progress - 0.82) / 0.18);
};

const hideDecks: Deck[] = [
  ({ x, z }) =>
    Math.abs(x) <= hide.halfWidth - 0.05 &&
    z >= -hide.halfDepth + 0.05 &&
    z <= hide.halfDepth
      ? { height: hide.floor, kind: "bridge" }
      : undefined,
  ({ x, z }) =>
    x >= doorway.from - 0.02 &&
    x <= doorway.to + 0.02 &&
    z > hide.halfDepth &&
    z <= rampEnd
      ? { height: findRampHeight(z), kind: "bridge" }
      : undefined,
];

const wallBlockers = (): LocalBlocker[] => {
  const { halfWidth, halfDepth } = hide;
  const spots: LocalBlocker[] = [];
  const radius = 0.18;
  const along = (fromX: number, toX: number, z: number) => {
    const count = Math.max(1, Math.ceil((toX - fromX) / 0.3));
    for (let step = 0; step <= count; step++) {
      spots.push({ x: fromX + ((toX - fromX) * step) / count, z, radius });
    }
  };
  along(-halfWidth, halfWidth, -halfDepth);
  along(-halfWidth, doorway.from - 0.12, halfDepth);
  along(doorway.to + 0.12, halfWidth, halfDepth);
  [-halfWidth, halfWidth].forEach((x) => {
    for (let step = 1; step < 6; step++) {
      spots.push({ x, z: -halfDepth + (halfDepth * 2 * step) / 6, radius });
    }
  });
  spots.push({ x: 0.3, z: -halfDepth + 0.3, radius: 0.3 });
  spots.push({ x: doorway.to + 0.08, z: halfDepth + 0.35, radius: 0.16 });
  return spots;
};

export const birdHideModel: AttractionModel = {
  kind: "bird-hide",
  name: "Bird Hide",
  fact: "A bird hide lets you watch wild animals without frightening them away. The pond is a habitat: ducks, frogs, dragonflies and reeds all find the food, water and shelter they need to live here.",
  curriculumLink:
    "Science, Year 2: living things and their habitats. Most living things live in habitats that suit them and give them what they need.",
  footprint: 9.5,
  setting: "inland",
  signSpot: { x: 1.6, z: 8.7 },
  build: (builder) => {
    buildTrails(builder);
    buildPond(builder);
    buildHide(builder);
    buildTelescope(builder);
    boardSpots.forEach(({ at, turn, picture }) => {
      buildWildlifeBoard(builder, at, turn, picture);
    });
    birdBoxSpots.forEach(({ at, turn }) => {
      buildBirdBox(builder, at, turn);
    });
    buildGrounds(builder);
  },
  wanderers: [
    {
      name: "ducks",
      build: buildDuck,
      count: 3,
      centre: { x: pond.x, z: pond.z - 0.3 },
      radius: 1.6,
      speed: 0.3,
      height: 0.06,
    },
    {
      name: "swallows",
      build: buildSwallow,
      count: 4,
      centre: { x: 0, z: -1.5 },
      radius: 6,
      speed: 2.2,
      height: 3.2,
      bob: 0.5,
    },
  ],
  blockers: [
    ...pondBlockers,
    ...wallBlockers(),
    ...boardSpots.map(({ at }) => ({ x: at.x, z: at.z, radius: 0.3 })),
    ...birdBoxSpots.map(({ at }) => ({ x: at.x, z: at.z, radius: 0.2 })),
    { x: -6.6, z: -5.0, radius: 0.35 },
    { x: 6.3, z: -5.6, radius: 0.35 },
    { x: -7.3, z: 1.4, radius: 0.35 },
    { x: 7.0, z: 1.6, radius: 0.35 },
  ],
  decks: hideDecks,
  rides: [
    {
      id: "telescope",
      name: "the telescope",
      start: lookStart,
      reach: 0.45,
      seconds: 9,
      finish: { x: rampFoot.x, z: rampFoot.z + 0.3 },
      follow: telescopeRide,
    },
  ],
};
