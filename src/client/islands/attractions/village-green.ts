import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
} from "three";
import {
  addBench,
  addBush,
  addGableRoof,
  addLampPost,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "./attraction-kit.js";

const greenSign = "#2d4a3a";
const gold = "#c9a24a";
const reed = "#6f8f3a";
const pondBed = "#3a4630";
const pondWater = "#4d8c95";
const pondStone = "#9d968a";

/* The duck pond */

const pondAt = { x: -2.6, z: -1.8 };
const pondHalf = { x: 3.5, z: 2.5 };
const waterHeight = 0.11;

const findPondEdge = (angle: number, scale = 1): LocalPoint => {
  const wobble =
    1 + 0.1 * Math.sin(2 * angle + 0.6) + 0.07 * Math.sin(3 * angle + 1.9);
  return {
    x: pondAt.x + Math.cos(angle) * pondHalf.x * wobble * scale,
    z: pondAt.z + Math.sin(angle) * pondHalf.z * wobble * scale,
  };
};

const pondShape = (count: number, scale: number, offset = 0): Shape => {
  const shape = new Shape();
  for (let step = 0; step < count; step++) {
    const angle = (step / count) * Math.PI * 2;
    const edge = findPondEdge(angle, scale);
    const outX = edge.x + Math.cos(angle) * offset;
    const outZ = edge.z + Math.sin(angle) * offset;
    if (step === 0) {
      shape.moveTo(outX, -outZ);
    } else {
      shape.lineTo(outX, -outZ);
    }
  }
  shape.closePath();
  return shape;
};

const flat: Triple = [-Math.PI / 2, 0, 0];

const buildPond = (builder: AttractionBuilder) => {
  const count = builder.segments(44, 22);
  builder.add(
    "matte",
    pondBed,
    new ShapeGeometry(pondShape(count, 1.02)),
    { at: [0, 0.035, 0], rotation: flat },
    undefined,
  );
  builder.add(
    "water",
    pondWater,
    new ShapeGeometry(pondShape(count, 1.01)),
    { at: [0, waterHeight, 0], rotation: flat },
    undefined,
  );
  const rim = pondShape(count, 1, 0.42);
  rim.holes.push(pondShape(count, 1, 0.02));
  builder.add(
    "matte",
    pondStone,
    new ExtrudeGeometry(rim, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 1,
    }),
    { at: [0, 0.03, 0], rotation: flat },
  );
  if (builder.isFar) {
    return;
  }
  const stones = 22;
  for (let stone = 0; stone < stones; stone++) {
    const angle = (stone / stones) * Math.PI * 2 + Math.sin(stone * 3.1) * 0.08;
    const edge = findPondEdge(angle, 1);
    const size = 0.13 + 0.05 * Math.abs(Math.sin(stone * 1.7));
    builder.add(
      "matte",
      shade(pondStone, 0.86 + 0.18 * Math.abs(Math.sin(stone * 2.3))),
      new IcosahedronGeometry(size, 0),
      {
        at: [
          edge.x + Math.cos(angle) * 0.22,
          0.13,
          edge.z + Math.sin(angle) * 0.22,
        ],
        rotation: [stone, stone * 0.7, 0],
        scale: [1.3, 0.55, 1],
      },
      undefined,
    );
  }
  [0.5, 1.4, 2.9, 4.1, 5.3].forEach((angle, index) => {
    const spot = findPondEdge(angle, 0.66 + (index % 2) * 0.12);
    builder.cylinder("matte", index % 2 === 0 ? "#4f7f35" : "#5e8f3d", {
      radius: 0.2,
      length: 0.02,
      at: [spot.x, waterHeight + 0.012, spot.z],
      segments: 10,
    });
    if (index % 2 === 0) {
      builder.sphere(
        "matte",
        "#f2c6d6",
        0.06,
        [spot.x + 0.05, waterHeight + 0.05, spot.z],
        [1, 0.6, 1],
        6,
      );
    }
  });
  buildReeds(builder, 3.6, 7);
  buildReeds(builder, 0.2, 6);
  buildReeds(builder, 2.25, 5);
};

const buildReeds = (
  builder: AttractionBuilder,
  angle: number,
  blades: number,
) => {
  const centre = findPondEdge(angle, 0.93);
  for (let blade = 0; blade < blades; blade++) {
    const spread = Math.sin(blade * 2.7) * 0.35;
    const across = Math.cos(blade * 1.9) * 0.18;
    const height = 0.75 + 0.35 * Math.abs(Math.sin(blade * 1.3));
    const foot: Triple = [
      centre.x +
        Math.cos(angle + Math.PI / 2) * spread +
        Math.cos(angle) * across,
      0.02,
      centre.z +
        Math.sin(angle + Math.PI / 2) * spread +
        Math.sin(angle) * across,
    ];
    builder.bar(
      "matte",
      blade % 2 === 0 ? reed : shade(reed, 1.15),
      foot,
      [foot[0] + spread * 0.25, height, foot[2] + across * 0.3],
      0.035,
      4,
    );
    if (blade % 3 === 0) {
      builder.cylinder("matte", "#5a3a22", {
        radius: 0.035,
        length: 0.18,
        at: [foot[0] + spread * 0.22, height - 0.12, foot[2] + across * 0.27],
        segments: 6,
      });
    }
  }
};

/* Ducks */

const buildDuck =
  ({
    head,
    body,
    breast,
    isDrake,
  }: {
    head: string;
    body: string;
    breast: string;
    isDrake: boolean;
  }) =>
  (builder: AttractionBuilder) => {
    const segments = 10;
    builder.sphere(
      "matte",
      body,
      0.13,
      [0, 0.03, -0.01],
      [0.82, 0.62, 1.3],
      segments,
    );
    builder.sphere(
      "matte",
      breast,
      0.09,
      [0, 0.05, 0.09],
      [0.95, 0.85, 0.9],
      8,
    );
    builder.sphere(
      "matte",
      shade(body, 0.8),
      0.1,
      [0, 0.07, -0.04],
      [0.9, 0.45, 1.25],
      8,
    );
    builder.sphere(
      "matte",
      head,
      0.068,
      [0, 0.19, 0.12],
      [0.9, 1, 1.1],
      segments,
    );
    builder.cylinder("matte", head, {
      radius: 0.045,
      length: 0.1,
      at: [0, 0.13, 0.1],
      segments: 8,
    });
    builder.box("paint", "#e2b13c", [0.05, 0.025, 0.09], [0, 0.18, 0.2]);
    builder.box(
      "matte",
      palette.black,
      [0.07, 0.05, 0.08],
      [0, 0.08, -0.18],
      [-0.5, 0, 0],
    );
    if (!builder.isFar && isDrake) {
      builder.cylinder("matte", palette.white, {
        radius: 0.047,
        length: 0.015,
        at: [0, 0.115, 0.098],
        segments: 8,
      });
      [-1, 1].forEach((side) => {
        builder.box(
          "paint",
          "#2f4fa0",
          [0.01, 0.025, 0.06],
          [side * 0.1, 0.07, -0.06],
        );
        builder.sphere(
          "paint",
          palette.black,
          0.012,
          [side * 0.05, 0.21, 0.15],
          [1, 1, 1],
          4,
        );
      });
    }
  };

/* The K6 telephone box */

const boxAt = { x: 4.4, z: -2.0 };
const boxHalf = 0.4;
const boxBody = 1.66;

const turnPoint = (turn: number, x: number, y: number, z: number): Triple => [
  boxAt.x + x * Math.cos(turn) + z * Math.sin(turn),
  y,
  boxAt.z - x * Math.sin(turn) + z * Math.cos(turn),
];

const buildPhoneBox = (builder: AttractionBuilder) => {
  const red = palette.postRed;
  const plinth = 0.12;
  builder.box(
    "paint",
    shade(red, 0.85),
    [0.92, plinth, 0.92],
    [boxAt.x, plinth / 2, boxAt.z],
  );
  builder.box(
    "matte",
    "#2a2a2a",
    [0.7, boxBody, 0.7],
    [boxAt.x, plinth + boxBody / 2, boxAt.z],
  );
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        red,
        [0.11, boxBody + 0.2, 0.11],
        [
          boxAt.x + sideX * (boxHalf - 0.03),
          plinth + (boxBody + 0.2) / 2,
          boxAt.z + sideZ * (boxHalf - 0.03),
        ],
      );
    });
  });
  const headerY = plinth + boxBody + 0.1;
  builder.box(
    "paint",
    red,
    [boxHalf * 2 + 0.04, 0.05, boxHalf * 2 + 0.04],
    [boxAt.x, headerY + 0.13, boxAt.z],
  );
  const dome = new LatheGeometry(
    (
      [
        [0.64, 0],
        [0.62, 0.05],
        [0.54, 0.13],
        [0.4, 0.2],
        [0.2, 0.25],
        [0, 0.26],
      ] as const
    ).map(([radius, height]) => new Vector2(radius, height)),
    4,
  );
  builder.add("paint", red, dome, {
    at: [boxAt.x, headerY + 0.155, boxAt.z],
    rotation: [0, Math.PI / 4, 0],
  });
  const glassHigh = 1.32;
  const glassY = plinth + 0.2 + glassHigh / 2;
  const paneWidth = 0.54;
  [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((turn) => {
    const rotation: Triple = [0, turn, 0];
    const face = boxHalf - 0.04;
    builder.box(
      "paint",
      red,
      [paneWidth + 0.04, boxBody, 0.05],
      turnPoint(turn, 0, plinth + boxBody / 2, face - 0.03),
      rotation,
    );
    builder.box(
      "glass",
      "#6b8ea8",
      [paneWidth, glassHigh, 0.03],
      turnPoint(turn, 0, glassY, face),
      rotation,
    );
    builder.box(
      "paint",
      red,
      [paneWidth + 0.06, 0.06, 0.07],
      turnPoint(turn, 0, glassY + glassHigh / 2 + 0.02, face),
      rotation,
    );
    builder.box(
      "paint",
      red,
      [paneWidth + 0.06, 0.06, 0.07],
      turnPoint(turn, 0, glassY - glassHigh / 2 - 0.02, face),
      rotation,
    );
    builder.box(
      "glow",
      "#f1e8c8",
      [paneWidth, 0.13, 0.04],
      turnPoint(turn, 0, headerY + 0.02, boxHalf - 0.01),
      rotation,
    );
    const pediment = new CylinderGeometry(
      0.37,
      0.37,
      0.06,
      builder.segments(14, 6),
      1,
      false,
      Math.PI / 2,
      Math.PI,
    );
    pediment.rotateX(Math.PI / 2);
    builder.add("paint", palette.postRed, pediment, {
      at: turnPoint(turn, 0, headerY + 0.15, boxHalf - 0.02),
      rotation,
      scale: [1, 0.42, 1],
    });
    if (builder.isFar) {
      return;
    }
    const lettering = new PlaneGeometry(0.42, 0.05, 17, 1);
    builder.painted(
      lettering,
      (centre) => {
        const along =
          (centre.x - boxAt.x) * Math.cos(turn) -
          (centre.z - boxAt.z) * Math.sin(turn);
        const slot = Math.floor((along + 0.21) / (0.42 / 17));
        return slot % 2 === 0 ? "#2a2a2a" : "#f1e8c8";
      },
      { at: turnPoint(turn, 0, headerY + 0.02, boxHalf + 0.012), rotation },
      "matte",
      undefined,
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        red,
        [0.025, glassHigh, 0.045],
        turnPoint(turn, (side * paneWidth) / 6, glassY, face + 0.01),
        rotation,
      );
    });
    for (let row = 1; row < 8; row++) {
      builder.box(
        "paint",
        red,
        [paneWidth, 0.022, 0.045],
        turnPoint(
          turn,
          0,
          glassY - glassHigh / 2 + (glassHigh * row) / 8,
          face + 0.01,
        ),
        rotation,
      );
    }
    builder.box(
      "paint",
      shade(red, 0.9),
      [paneWidth - 0.08, 0.1, 0.02],
      turnPoint(turn, 0, plinth + 0.1, face + 0.01),
      rotation,
    );
    if (turn === 0) {
      builder.box(
        "metal",
        palette.brass,
        [0.025, 0.24, 0.04],
        turnPoint(turn, -paneWidth / 2 + 0.04, glassY, face + 0.05),
        rotation,
      );
    }
  });
  if (!builder.isFar) {
    builder.box(
      "paint",
      palette.black,
      [0.24, 0.3, 0.12],
      [boxAt.x, 1.15, boxAt.z - 0.25],
    );
    builder.box(
      "matte",
      palette.paleTimber,
      [0.5, 0.03, 0.2],
      [boxAt.x, 0.88, boxAt.z - 0.24],
    );
  }
};

/* The maypole */

const maypoleAt = { x: 5.4, z: 3.2 };
const maypoleHigh = 3.4;
const ribbonColours = [
  "#c8102e",
  "#2f5fae",
  "#f2c230",
  "#f4f1ea",
  "#3f8a3a",
  "#e58fb0",
];

const buildMaypole = (builder: AttractionBuilder) => {
  const { x, z } = maypoleAt;
  const pole = new CylinderGeometry(
    0.05,
    0.075,
    maypoleHigh,
    builder.segments(10, 6),
    builder.isFar ? 1 : 22,
  );
  builder.painted(
    pole,
    (centre) => {
      const around = Math.atan2(centre.z - z, centre.x - x) / (Math.PI * 2);
      return Math.floor(around * 2 + centre.y * 1.3) % 2 === 0
        ? palette.white
        : "#c8102e";
    },
    { at: [x, maypoleHigh / 2, z] },
    "paint",
  );
  builder.sphere("metal", gold, 0.1, [x, maypoleHigh + 0.08, z], [1, 1, 1], 10);
  builder.torus(
    "matte",
    "#3f7f3a",
    0.32,
    0.06,
    [x, maypoleHigh - 0.25, z],
    "y",
    16,
  );
  const ribbons = builder.isFar ? 6 : 12;
  for (let ribbon = 0; ribbon < ribbons; ribbon++) {
    const angle = (ribbon / ribbons) * Math.PI * 2;
    const colour = ribbonColours[ribbon % ribbonColours.length];
    const top: Triple = [
      x + Math.cos(angle) * 0.1,
      maypoleHigh - 0.2,
      z + Math.sin(angle) * 0.1,
    ];
    const peg: Triple = [
      x + Math.cos(angle) * 1.45,
      0.06,
      z + Math.sin(angle) * 1.45,
    ];
    const sag: Triple = [
      x + Math.cos(angle + 0.12) * 1.0,
      0.85,
      z + Math.sin(angle + 0.12) * 1.0,
    ];
    builder.bar("matte", colour, top, sag, 0.045, 4);
    builder.bar("matte", colour, sag, peg, 0.045, 4);
    if (!builder.isFar) {
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.03,
        length: 0.12,
        at: [peg[0], 0.06, peg[2]],
        segments: 4,
      });
      builder.sphere(
        "matte",
        ribbon % 2 === 0 ? "#f4f1ea" : "#e58fb0",
        0.05,
        [
          x + Math.cos(angle) * 0.32,
          maypoleHigh - 0.2,
          z + Math.sin(angle) * 0.32,
        ],
        [1, 1, 1],
        6,
      );
    }
  }
};

/* The village sign */

const villageSignAt = { x: 2.7, z: 7.4 };

const buildVillageSign = (builder: AttractionBuilder) => {
  const { x, z } = villageSignAt;
  builder.box("matte", palette.brick, [0.6, 0.32, 0.6], [x, 0.16, z]);
  builder.box("matte", palette.stone, [0.66, 0.06, 0.66], [x, 0.35, z]);
  builder.box("paint", "#5b3e26", [0.13, 2.4, 0.13], [x, 1.5, z]);
  const boardY = 2.35;
  builder.box("paint", greenSign, [1.05, 0.72, 0.07], [x, boardY, z]);
  builder.box("paint", gold, [1.13, 0.05, 0.09], [x, boardY + 0.38, z]);
  builder.box("paint", gold, [1.13, 0.05, 0.09], [x, boardY - 0.38, z]);
  [-1, 1].forEach((side) => {
    builder.box("paint", gold, [0.05, 0.8, 0.09], [x + side * 0.55, boardY, z]);
  });
  addGableRoof(builder, {
    width: 1.1,
    depth: 0.22,
    rise: 0.16,
    at: [x, boardY + 0.42, z],
    colour: "#5b3e26",
    overhang: 0.08,
    thickness: 0.05,
  });
  builder.box("paint", palette.cream, [0.9, 0.16, 0.05], [x, boardY - 0.55, z]);
  if (builder.isFar) {
    return;
  }
  [1, -1].forEach((side) => {
    const faceZ = z + side * 0.04;
    builder.box(
      "paint",
      "#a9cbe0",
      [0.95, 0.36, 0.01],
      [x, boardY + 0.14, faceZ],
    );
    builder.box(
      "paint",
      "#6aa846",
      [0.95, 0.27, 0.01],
      [x, boardY - 0.18, faceZ + side * 0.002],
    );
    builder.box(
      "paint",
      palette.cream,
      [0.2, 0.16, 0.012],
      [x - 0.12, boardY - 0.01, faceZ + side * 0.004],
    );
    builder.box(
      "paint",
      palette.cream,
      [0.09, 0.3, 0.012],
      [x + 0.03, boardY + 0.06, faceZ + side * 0.004],
    );
    builder.cylinder("paint", palette.slate, {
      radius: 0.06,
      radiusEnd: 0,
      length: 0.18,
      at: [x + 0.03, boardY + 0.3, faceZ + side * 0.004],
      segments: 4,
    });
    builder.box(
      "paint",
      palette.slate,
      [0.22, 0.04, 0.014],
      [x - 0.12, boardY + 0.085, faceZ + side * 0.004],
    );
    builder.sphere(
      "paint",
      "#f0d36a",
      0.05,
      [x + 0.32, boardY + 0.22, faceZ + side * 0.004],
      [1, 1, 0.2],
      8,
    );
    [-0.3, -0.18, -0.06, 0.06, 0.18, 0.3].forEach((step) => {
      builder.box(
        "paint",
        greenSign,
        [0.08, 0.04, 0.01],
        [x + step, boardY - 0.55, z + side * 0.03],
      );
    });
  });
};

/* The green */

const ribbon = (
  points: readonly LocalPoint[],
  width: number,
  height: number,
  steps: number,
): BufferGeometry => {
  const curve = new CatmullRomCurve3(
    points.map((point) => new Vector3(point.x, height, point.z)),
  );
  const samples = curve.getPoints(steps);
  const positions: number[] = [];
  samples.forEach((sample, index) => {
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const before = samples[Math.max(0, index - 1)];
    const along = new Vector3().subVectors(next, before).normalize();
    positions.push(
      sample.x + (along.z * width) / 2,
      height,
      sample.z - (along.x * width) / 2,
      sample.x - (along.z * width) / 2,
      height,
      sample.z + (along.x * width) / 2,
    );
  });
  const indices: number[] = [];
  for (let index = 0; index < samples.length - 1; index++) {
    const left = index * 2;
    indices.push(left, left + 1, left + 2, left + 1, left + 3, left + 2);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setIndex(indices);
  return geometry;
};

const pathPoints: readonly LocalPoint[] = [
  { x: 0.3, z: 9.95 },
  { x: 0.5, z: 7 },
  { x: 1.3, z: 3.6 },
  { x: 3.0, z: 0.4 },
  { x: 4.4, z: -1.35 },
];

const willowAt = { x: -7.3, z: 1.9 };

const buildWillow = (builder: AttractionBuilder) => {
  const { x, z } = willowAt;
  builder.cylinder("matte", "#5f4a36", {
    radius: 0.24,
    radiusEnd: 0.15,
    length: 2.4,
    at: [x, 1.2, z],
    segments: 8,
  });
  if (!builder.isFar) {
    [0.4, 2.5, 4.4].forEach((angle) => {
      builder.bar(
        "matte",
        "#5f4a36",
        [x, 2.1, z],
        [x + Math.cos(angle) * 0.9, 2.9, z + Math.sin(angle) * 0.9],
        0.12,
        6,
      );
    });
  }
  const canopy = new LatheGeometry(
    (
      [
        [0.01, 4.15],
        [0.6, 4.08],
        [1.1, 3.88],
        [1.55, 3.5],
        [2.0, 2.85],
        [2.25, 2.05],
        [2.32, 1.25],
        [2.34, 0.45],
      ] as const
    ).map(([radius, height]) => new Vector2(radius, height)),
    builder.segments(24, 12),
  );
  const positions = canopy.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const pointY = positions.getY(index);
    if (pointY < 1.3) {
      const angle = Math.atan2(positions.getX(index), positions.getZ(index));
      positions.setY(
        index,
        pointY +
          (1.3 - pointY) *
            (0.55 * (0.5 + 0.5 * Math.sin(angle * 13)) +
              0.25 * (0.5 + 0.5 * Math.sin(angle * 5 + 1))),
      );
    }
  }
  builder.painted(
    canopy,
    (centre) => {
      const angle = Math.atan2(centre.x - x, centre.z - z);
      const band = Math.floor(
        ((angle + Math.PI) / (Math.PI * 2)) * builder.segments(24, 12),
      );
      const darker = centre.y < 2.2 ? 0.9 : 1;
      const top = centre.y > 3.7 ? 1.06 : 1;
      return shade(band % 2 === 0 ? "#7a9e3c" : "#6a8d33", darker * top);
    },
    { at: [x, 0, z] },
    "matte",
  );
};

const buildGreen = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    palette.path,
    ribbon(pathPoints, 1.0, 0.04, builder.segments(40, 16)),
    {},
    undefined,
  );
  builder.add(
    "matte",
    palette.path,
    ribbon(
      [
        { x: 1.0, z: 4.6 },
        { x: 0.6, z: 2.6 },
        { x: 0.3, z: 1.2 },
      ],
      0.7,
      0.038,
      builder.segments(10, 4),
    ),
    {},
    undefined,
  );
  addBench(builder, [0.3, 0, 1.2], -2.3);
  addBench(builder, [5.7, 0, -4.4], -0.5);
  addLampPost(builder, [1.3, 0, 8.8]);
  addTree(builder, [6.2, 0, -6.0], 1.3);
  addTree(builder, [-3.6, 0, -6.9], 1.35, "#4a8a3c");
  buildWillow(builder);
  const hedgeStep = builder.isFar ? 12 : 6;
  for (let degrees = 118; degrees <= 242; degrees += hedgeStep) {
    const angle = (degrees * Math.PI) / 180;
    const wobble = Math.sin(degrees * 0.37);
    builder.sphere(
      "matte",
      shade("#3d7a35", 1 + wobble * 0.07),
      builder.isFar ? 0.9 : 0.55,
      [Math.sin(angle) * 9.1, 0.45, Math.cos(angle) * 9.1],
      [1.25, 1 + wobble * 0.12, 0.9],
      7,
    );
  }
  addBush(builder, [-7.7, 0, -4.6], 0.6);
  addBush(builder, [7.6, 0, -1.6], 0.55, "#3a7d34");
  addBush(builder, [-5.2, 0, 6.6], 0.5, "#3a7d34");
  if (!builder.isFar) {
    [
      [-4.6, 5.4],
      [-6.0, 4.6],
      [3.9, 5.8],
      [7.2, 0.6],
      [-0.9, -5.6],
    ].forEach(([fx, fz], clump) => {
      for (let flower = 0; flower < 3; flower++) {
        const dx = Math.sin(clump + flower * 2.1) * 0.22;
        const dz = Math.cos(clump * 1.3 + flower * 2.1) * 0.22;
        builder.bar(
          "matte",
          "#4f8a34",
          [fx + dx, 0, fz + dz],
          [fx + dx, 0.24, fz + dz],
          0.025,
          3,
        );
        builder.sphere(
          "matte",
          clump % 2 === 0 ? "#f5d33c" : palette.white,
          0.06,
          [fx + dx, 0.27, fz + dz],
          [1, 0.6, 1],
          5,
        );
      }
    });
  }
  const bollards = [-50, -40, -30, -22, 22, 30, 40, 50, 60, 70, 80];
  bollards.forEach((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    const bx = Math.sin(angle) * 9.4;
    const bz = Math.cos(angle) * 9.4;
    builder.box(
      "paint",
      palette.white,
      [0.13, 0.5, 0.13],
      [bx, 0.25, bz],
      [0, angle, 0],
    );
    builder.cylinder("paint", palette.white, {
      radius: 0.11,
      radiusEnd: 0,
      length: 0.1,
      at: [bx, 0.55, bz],
      segments: 4,
    });
  });
  addSignBoard(builder, [-2.2, 0, 8.4], greenSign);
};

const pondBlockers = (): LocalBlocker[] => {
  const ring = Array.from({ length: 22 }, (_, step) => {
    const edge = findPondEdge((step / 22) * Math.PI * 2, 0.97);
    return { x: edge.x, z: edge.z, radius: 0.55 };
  });
  return [
    ...ring,
    { x: pondAt.x, z: pondAt.z, radius: 1.9 },
    { x: pondAt.x - 1.6, z: pondAt.z, radius: 1.3 },
    { x: pondAt.x + 1.6, z: pondAt.z, radius: 1.3 },
  ];
};

export const villageGreenModel: AttractionModel = {
  kind: "village-green",
  name: "Village Green",
  fact: "A pond is a habitat: ducks, frogs, newts, water snails and dragonflies all find food and shelter there. Mallard ducks dabble, tipping head-down to nibble plants under the water.",
  curriculumLink:
    "Science, Year 2: living things and their habitats. A pond is a habitat that gives animals food and shelter.",
  footprint: 10,
  setting: "inland",
  signSpot: { x: -2.2, z: 9.2 },
  padColour: palette.lawn,
  build: (builder) => {
    buildGreen(builder);
    buildPond(builder);
    buildPhoneBox(builder);
    buildMaypole(builder);
    buildVillageSign(builder);
  },
  wanderers: [
    {
      name: "drakes",
      build: buildDuck({
        head: "#1f5e3a",
        body: "#9b968c",
        breast: "#7a4a2e",
        isDrake: true,
      }),
      count: 2,
      centre: pondAt,
      radius: 1.6,
      speed: 0.35,
      height: waterHeight - 0.02,
      bob: 0.015,
    },
    {
      name: "mallard hens",
      build: buildDuck({
        head: "#7a5a3a",
        body: "#8a6a48",
        breast: "#94704a",
        isDrake: false,
      }),
      count: 2,
      centre: pondAt,
      radius: 1.5,
      speed: 0.3,
      height: waterHeight - 0.02,
      bob: 0.015,
    },
  ],
  blockers: [
    ...pondBlockers(),
    { x: boxAt.x, z: boxAt.z - 0.08, radius: 0.52 },
    { x: maypoleAt.x, z: maypoleAt.z, radius: 0.25 },
    { x: villageSignAt.x, z: villageSignAt.z, radius: 0.4 },
    { x: willowAt.x, z: willowAt.z, radius: 0.4 },
    { x: 6.2, z: -6.0, radius: 0.4 },
    { x: -3.6, z: -6.9, radius: 0.4 },
    ...Array.from({ length: 13 }, (_, step) => {
      const angle = ((118 + step * 10.3) * Math.PI) / 180;
      return {
        x: Math.sin(angle) * 9.1,
        z: Math.cos(angle) * 9.1,
        radius: 0.6,
      };
    }),
  ],
};
