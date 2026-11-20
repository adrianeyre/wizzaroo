import { CylinderGeometry, ExtrudeGeometry, Shape } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  addBush,
  addFence,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type AttractionModel,
  type LocalBlocker,
  type LocalPoint,
  type Motion,
  type Triple,
} from "./attraction-kit.js";

const barnRed = "#9b3a2c";
const trim = "#f1ece0";
const barnRoof = "#4f565f";
const tractorRed = "#b8322a";
const hay = "#d8b25a";
const galvanised = "#a9b1b8";

const softBox = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  size: Triple,
  radius: number,
  at: Triple,
  rotation: Triple = [0, 0, 0],
) => {
  builder.add(
    finish,
    colour,
    new RoundedBoxGeometry(size[0], size[1], size[2], 1, radius),
    { at, rotation },
  );
};

const extrudeAlongZ = (
  builder: AttractionBuilder,
  finish: "matte" | "paint",
  colour: string,
  shape: Shape,
  at: Triple,
  depth: number,
) => {
  builder.add(
    finish,
    colour,
    new ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
    { at },
  );
};

const polygon = (points: readonly (readonly [number, number])[]): Shape => {
  const shape = new Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  });
  shape.closePath();
  return shape;
};

/* The barn */

const barn = { x: -4.0, z: -4.3, halfWidth: 2.5, length: 5.4, wall: 2.6 };
const barnFront = barn.z + barn.length / 2;
const barnBack = barn.z - barn.length / 2;
const gambrel: readonly (readonly [number, number])[] = [
  [-2.5, 0],
  [2.5, 0],
  [2.5, 2.6],
  [1.7, 3.95],
  [0, 4.65],
  [-1.7, 3.95],
  [-2.5, 2.6],
];
const ridgeHeight = 4.65;
const weathervanePivot: Triple = [barn.x, ridgeHeight + 1.05, barn.z];
const weathervaneMotion: Motion = {
  kind: "swing",
  axis: "y",
  amplitude: 0.7,
  period: 11,
};

const buildBarn = (builder: AttractionBuilder) => {
  const { x, halfWidth, length } = barn;
  builder.box(
    "matte",
    palette.darkStone,
    [halfWidth * 2 + 0.12, 0.3, length + 0.12],
    [x, 0.15, barn.z],
  );
  extrudeAlongZ(
    builder,
    "matte",
    barnRed,
    polygon(gambrel.map(([px, py]) => [px, py + 0.3])),
    [x, 0, barnBack],
    length,
  );
  const roof = polygon([
    [-2.82, 2.66],
    [-1.86, 4.12],
    [0, 4.86],
    [1.86, 4.12],
    [2.82, 2.66],
    [2.62, 2.62],
    [1.74, 3.95],
    [0, 4.66],
    [-1.74, 3.95],
    [-2.62, 2.62],
  ]);
  extrudeAlongZ(
    builder,
    "matte",
    barnRoof,
    roof,
    [x, 0.3, barnBack - 0.25],
    length + 0.5,
  );
  [barnFront + 0.25, barnBack - 0.25].forEach((endZ) => {
    const isFront = endZ > barn.z;
    const trimBand = polygon([
      [-2.84, 2.62],
      [-1.88, 4.1],
      [0, 4.86],
      [1.88, 4.1],
      [2.84, 2.62],
      [2.7, 2.58],
      [1.8, 3.98],
      [0, 4.7],
      [-1.8, 3.98],
      [-2.7, 2.58],
    ]);
    extrudeAlongZ(
      builder,
      "paint",
      trim,
      trimBand,
      [x, 0.3, isFront ? endZ - 0.02 : endZ - 0.04],
      0.06,
    );
  });
  [-1, 1].forEach((side) => {
    [barnFront, barnBack].forEach((endZ) => {
      builder.box(
        "paint",
        trim,
        [0.12, barn.wall, 0.12],
        [x + side * halfWidth, 0.3 + barn.wall / 2, endZ],
      );
    });
  });
  buildBarnFront(builder);
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      [-1.3, 1.3].forEach((along) => {
        const windowAt: Triple = [
          x + side * (halfWidth + 0.01),
          1.75,
          barn.z + along,
        ];
        builder.box("glass", "#5d7f96", [0.03, 0.6, 0.6], windowAt);
        builder.box(
          "paint",
          trim,
          [0.06, 0.72, 0.08],
          [windowAt[0] + side * 0.02, windowAt[1], windowAt[2]],
        );
        builder.box(
          "paint",
          trim,
          [0.06, 0.08, 0.72],
          [windowAt[0] + side * 0.02, windowAt[1], windowAt[2]],
        );
        [-0.33, 0.33].forEach((edge) => {
          builder.box(
            "paint",
            trim,
            [0.06, 0.72, 0.06],
            [windowAt[0] + side * 0.02, windowAt[1], windowAt[2] + edge],
          );
          builder.box(
            "paint",
            trim,
            [0.06, 0.06, 0.72],
            [windowAt[0] + side * 0.02, windowAt[1] + edge, windowAt[2]],
          );
        });
      });
    });
  }
  buildBarnCupola(builder);
};

const buildBarnFront = (builder: AttractionBuilder) => {
  const front = barnFront + 0.01;
  const doorWidth = 1.25;
  const doorHeight = 2.15;
  const x = barn.x;
  builder.box(
    "paint",
    trim,
    [doorWidth * 2 + 0.3, doorHeight + 0.15, 0.04],
    [x, 0.3 + (doorHeight + 0.15) / 2, front],
  );
  [-1, 1].forEach((side) => {
    const doorX = x + (side * doorWidth) / 2;
    builder.box(
      "paint",
      shade(barnRed, 0.92),
      [doorWidth - 0.1, doorHeight - 0.1, 0.06],
      [doorX, 0.3 + doorHeight / 2, front + 0.02],
    );
    const brace = Math.hypot(doorWidth - 0.2, doorHeight - 0.2);
    const angle = Math.atan2(doorWidth - 0.2, doorHeight - 0.2);
    [-1, 1].forEach((lean) => {
      builder.box(
        "paint",
        trim,
        [0.1, brace, 0.04],
        [doorX, 0.3 + doorHeight / 2, front + 0.06],
        [0, 0, lean * angle],
      );
    });
    [0.08, doorHeight - 0.08].forEach((railY) => {
      builder.box(
        "paint",
        trim,
        [doorWidth - 0.1, 0.1, 0.04],
        [doorX, 0.3 + railY, front + 0.06],
      );
    });
    builder.box(
      "paint",
      trim,
      [0.1, doorHeight - 0.1, 0.04],
      [
        doorX + (side * (doorWidth - 0.15)) / 2,
        0.3 + doorHeight / 2,
        front + 0.06,
      ],
    );
  });
  builder.box(
    "metal",
    palette.darkSteel,
    [doorWidth * 2 + 1.2, 0.08, 0.08],
    [x, 0.3 + doorHeight + 0.15, front + 0.07],
  );
  const loftY = 3.35;
  builder.box("paint", trim, [1.1, 0.95, 0.04], [x, loftY, front]);
  builder.box("matte", "#3a2a1f", [0.9, 0.75, 0.05], [x, loftY, front + 0.01]);
  builder.box("matte", hay, [0.9, 0.35, 0.06], [x, loftY - 0.2, front + 0.02]);
  if (!builder.isFar) {
    [-0.2, 0.15].forEach((strawX) => {
      builder.sphere(
        "matte",
        shade(hay, 1.05),
        0.16,
        [x + strawX, loftY - 0.05, front + 0.04],
        [1.3, 0.6, 0.5],
        6,
      );
    });
  }
  builder.box(
    "matte",
    palette.darkTimber,
    [0.14, 0.14, 0.9],
    [x, ridgeHeight + 0.05, front + 0.35],
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [x, ridgeHeight - 0.02, front + 0.72],
    [x, loftY + 0.55, front + 0.72],
    0.02,
    4,
  );
};

const buildBarnCupola = (builder: AttractionBuilder) => {
  const [x, , z] = weathervanePivot;
  const base = ridgeHeight + 0.2;
  builder.box("paint", trim, [0.62, 0.55, 0.62], [x, base + 0.1, z]);
  if (!builder.isFar) {
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((turn) => {
      for (let louvre = 0; louvre < 3; louvre++) {
        builder.box(
          "matte",
          "#3a2a1f",
          [0.4, 0.05, 0.02],
          [
            x + Math.sin(turn) * 0.315,
            base + louvre * 0.12,
            z + Math.cos(turn) * 0.315,
          ],
          [0, turn, 0],
        );
      }
    });
  }
  builder.lathe(
    "matte",
    barnRoof,
    [
      [0.5, 0],
      [0.48, 0.03],
      [0, 0.38],
    ],
    [x, base + 0.37, z],
    "y",
    4,
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.02,
    length: 0.5,
    at: [x, base + 0.95, z],
    segments: 5,
  });
  if (!builder.isFar) {
    [0, Math.PI / 2].forEach((turn) => {
      builder.box(
        "metal",
        palette.darkSteel,
        [0.5, 0.02, 0.02],
        [x, base + 0.85, z],
        [0, turn, 0],
      );
    });
  }
};

const buildWeathervane = (builder: AttractionBuilder) => {
  const black = "#24262a";
  builder.box("metal", black, [0.8, 0.025, 0.025], [0, 0, 0]);
  const tail = polygon([
    [-0.42, -0.1],
    [-0.28, 0],
    [-0.42, 0.1],
    [-0.3, 0.1],
    [-0.2, 0],
    [-0.3, -0.1],
  ]);
  builder.add(
    "metal",
    black,
    new ExtrudeGeometry(tail, { depth: 0.015, bevelEnabled: false }),
    { at: [0, 0, -0.0075] },
  );
  const rooster = polygon([
    [-0.18, 0.02],
    [0.12, 0.02],
    [0.2, 0.12],
    [0.2, 0.22],
    [0.26, 0.24],
    [0.18, 0.28],
    [0.12, 0.22],
    [0.06, 0.12],
    [-0.08, 0.14],
    [-0.2, 0.32],
    [-0.24, 0.18],
  ]);
  builder.add(
    "metal",
    black,
    new ExtrudeGeometry(rooster, { depth: 0.02, bevelEnabled: false }),
    { at: [0.05, 0, -0.01] },
  );
  builder.box(
    "metal",
    black,
    [0.06, 0.06, 0.05],
    [0.4, 0, 0],
    [0, 0, Math.PI / 4],
  );
};

/* The silo and hay */

const silo = { x: -0.2, z: -6.0, radius: 0.95, height: 5.2 };

const buildSilo = (builder: AttractionBuilder) => {
  const { x, z, radius, height } = silo;
  builder.cylinder("matte", palette.stone, {
    radius: radius + 0.12,
    length: 0.3,
    at: [x, 0.15, z],
    segments: builder.segments(18, 10),
  });
  builder.cylinder("matte", "#cfc8b8", {
    radius,
    length: height,
    at: [x, 0.3 + height / 2, z],
    segments: builder.segments(18, 10),
  });
  const bands = builder.isFar ? 2 : 6;
  for (let band = 1; band <= bands; band++) {
    builder.cylinder("paint", galvanised, {
      radius: radius + 0.025,
      length: 0.07,
      at: [x, 0.3 + (band / (bands + 1)) * height, z],
      segments: builder.segments(18, 10),
      isOpen: true,
    });
  }
  builder.lathe(
    "paint",
    "#b9c0c6",
    [
      [0, radius * 0.9],
      [radius * 0.35, radius * 0.82],
      [radius * 0.75, radius * 0.5],
      [radius + 0.08, 0.04],
      [radius + 0.08, 0],
    ],
    [x, 0.3 + height, z],
    "y",
    builder.segments(18, 10),
  );
  builder.cylinder("paint", galvanised, {
    radius: 0.12,
    length: 0.2,
    at: [x, 0.3 + height + radius * 0.92, z],
    segments: 8,
  });
  if (!builder.isFar) {
    const ladderX = x + 0.22;
    const ladderZ = z + radius + 0.08;
    [-0.18, 0.18].forEach((side) => {
      builder.box(
        "metal",
        palette.darkSteel,
        [0.04, height - 0.3, 0.04],
        [ladderX + side, 0.3 + (height - 0.3) / 2 + 0.3, ladderZ],
      );
    });
    for (let rung = 0; rung < 12; rung++) {
      builder.box(
        "metal",
        palette.darkSteel,
        [0.36, 0.03, 0.03],
        [ladderX, 0.7 + rung * 0.4, ladderZ],
      );
    }
  }
  builder.bar(
    "metal",
    galvanised,
    [x - radius * 0.6, 0.3 + height + 0.4, z + 0.3],
    [barn.x + barn.halfWidth - 0.4, 4.0, z + 0.3],
    0.16,
    8,
  );
};

const bales: Triple[] = [
  [-7.35, 0.55, -0.9],
  [-7.15, 0.55, 0.35],
  [-7.3, 1.45, -0.27],
];

const buildHay = (builder: AttractionBuilder) => {
  bales.forEach(([x, y, z], index) => {
    builder.cylinder("matte", index === 2 ? shade(hay, 0.93) : hay, {
      radius: 0.55,
      length: 1.0,
      at: [x, y, z],
      axis: "x",
      segments: builder.segments(16, 8),
    });
    if (!builder.isFar) {
      [-0.505, 0.505].forEach((face) => {
        builder.torus(
          "matte",
          shade(hay, 0.8),
          0.3,
          0.03,
          [x + face, y, z],
          "x",
          12,
        );
      });
    }
  });
};

/* The tractor */

const tractor = { x: -1.3, z: 0.9, turn: 0.55 };

const buildTractor = (builder: AttractionBuilder) => {
  const { turn } = tractor;
  const place = (x: number, y: number, z: number): Triple => [
    tractor.x + x * Math.cos(turn) + z * Math.sin(turn),
    y,
    tractor.z - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const facing: Triple = [0, turn, 0];
  const wheel = (
    x: number,
    z: number,
    radius: number,
    width: number,
    isRear: boolean,
  ) => {
    const at = place(x, radius, z);
    builder.add(
      "matte",
      "#26282b",
      new CylinderGeometry(radius, radius, width, builder.segments(18, 10)),
      { at, rotation: [0, turn, Math.PI / 2] },
    );
    builder.add(
      "paint",
      palette.cream,
      new CylinderGeometry(
        radius * 0.58,
        radius * 0.58,
        width + 0.03,
        builder.segments(14, 8),
      ),
      { at, rotation: [0, turn, Math.PI / 2] },
    );
    builder.add(
      "paint",
      tractorRed,
      new CylinderGeometry(radius * 0.24, radius * 0.24, width + 0.07, 8),
      { at, rotation: [0, turn, Math.PI / 2] },
    );
    if (!builder.isFar) {
      const lugs = isRear ? 14 : 10;
      for (let lug = 0; lug < lugs; lug++) {
        const angle = (lug / lugs) * Math.PI * 2;
        builder.box(
          "matte",
          "#26282b",
          [width * 0.9, 0.05, radius * 0.22],
          place(
            x,
            radius + Math.cos(angle) * radius,
            z + Math.sin(angle) * radius,
          ),
          [angle, turn, lug % 2 === 0 ? 0.35 : -0.35],
        );
      }
    }
  };
  wheel(-0.62, -0.55, 0.62, 0.36, true);
  wheel(0.62, -0.55, 0.62, 0.36, true);
  wheel(-0.5, 1.05, 0.33, 0.22, false);
  wheel(0.5, 1.05, 0.33, 0.22, false);
  builder.box(
    "matte",
    "#3a3c40",
    [0.82, 0.08, 0.08],
    place(0, 0.33, 1.05),
    facing,
  );
  builder.box(
    "paint",
    "#3a3c40",
    [0.46, 0.34, 2.1],
    place(0, 0.5, 0.25),
    facing,
  );
  softBox(
    builder,
    "paint",
    tractorRed,
    [0.6, 0.55, 1.2],
    0.08,
    place(0, 0.9, 0.72),
    facing,
  );
  builder.box(
    "paint",
    "#1e1f22",
    [0.52, 0.4, 0.04],
    place(0, 0.88, 1.33),
    facing,
  );
  if (!builder.isFar) {
    for (let slat = 0; slat < 4; slat++) {
      builder.box(
        "metal",
        palette.steel,
        [0.48, 0.03, 0.02],
        place(0, 0.74 + slat * 0.09, 1.355),
        facing,
      );
    }
    [-0.22, 0.22].forEach((side) => {
      builder.box(
        "glow",
        palette.warmLight,
        [0.1, 0.08, 0.03],
        place(side, 1.07, 1.33),
        facing,
      );
    });
    builder.box(
      "paint",
      palette.cream,
      [0.62, 0.05, 1.22],
      place(0, 1.0, 0.72),
      facing,
    );
  }
  builder.bar(
    "paint",
    "#1e1f22",
    place(0.18, 1.1, 1.0),
    place(0.18, 1.8, 1.0),
    0.07,
    6,
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.045,
    length: 0.12,
    at: place(0.18, 1.85, 1.0),
    segments: 6,
  });
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      tractorRed,
      new CylinderGeometry(
        0.7,
        0.7,
        0.42,
        builder.segments(14, 8),
        1,
        true,
        -Math.PI / 2 - 0.2,
        Math.PI * 0.75,
      ),
      { at: place(side * 0.62, 0.62, -0.55), rotation: [0, turn, Math.PI / 2] },
    );
  });
  builder.box(
    "paint",
    "#2b2d31",
    [1.15, 0.08, 1.05],
    place(0, 0.98, -0.55),
    facing,
  );
  const cabCorners: [number, number][] = [
    [-0.5, -1.0],
    [0.5, -1.0],
    [-0.5, -0.12],
    [0.5, -0.12],
  ];
  cabCorners.forEach(([cx, cz]) => {
    builder.bar(
      "paint",
      "#1e1f22",
      place(cx, 1.0, cz),
      place(cx, 2.05, cz),
      0.06,
      6,
    );
  });
  builder.box(
    "glass",
    palette.glass,
    [0.96, 0.85, 0.03],
    place(0, 1.55, -0.12),
    facing,
  );
  builder.box(
    "glass",
    palette.glass,
    [0.96, 0.85, 0.03],
    place(0, 1.55, -1.0),
    facing,
  );
  [-0.5, 0.5].forEach((side) => {
    builder.box(
      "glass",
      palette.glass,
      [0.03, 0.85, 0.85],
      place(side, 1.55, -0.56),
      facing,
    );
  });
  softBox(
    builder,
    "paint",
    tractorRed,
    [1.2, 0.12, 1.12],
    0.05,
    place(0, 2.1, -0.56),
    facing,
  );
  softBox(
    builder,
    "paint",
    palette.cream,
    [1.1, 0.05, 1.0],
    0.02,
    place(0, 2.18, -0.56),
    facing,
  );
  if (!builder.isFar) {
    builder.torus(
      "matte",
      "#1e1f22",
      0.13,
      0.02,
      place(0, 1.42, -0.34),
      "z",
      12,
    );
    builder.box(
      "glow",
      "#f29b2a",
      [0.08, 0.06, 0.08],
      place(0.42, 2.25, -0.95),
      facing,
    );
  }
};

/* The fields */

const sheepField = { minX: 1.4, maxX: 8.2, minZ: -6.6, maxZ: -0.8 };
const cowField = { minX: 1.4, maxX: 8.2, minZ: 0.8, maxZ: 6.6 };
const fieldGrass = "#6aa143";

const buildFieldFence = (
  builder: AttractionBuilder,
  field: { minX: number; maxX: number; minZ: number; maxZ: number },
  gateFrom: number,
  gateTo: number,
) => {
  const rail: Parameters<typeof addFence>[3] = {
    colour: palette.paleTimber,
    height: 0.9,
    isPicket: false,
    spacing: 0.42,
    finish: "matte",
  };
  const corner = (x: number, z: number): LocalPoint => ({ x, z });
  addFence(
    builder,
    corner(field.minX, field.maxZ),
    corner(field.maxX, field.maxZ),
    rail,
  );
  addFence(
    builder,
    corner(field.maxX, field.maxZ),
    corner(field.maxX, field.minZ),
    rail,
  );
  addFence(
    builder,
    corner(field.maxX, field.minZ),
    corner(field.minX, field.minZ),
    rail,
  );
  addFence(
    builder,
    corner(field.minX, field.minZ),
    corner(field.minX, gateFrom),
    rail,
  );
  addFence(
    builder,
    corner(field.minX, gateTo),
    corner(field.minX, field.maxZ),
    rail,
  );
  const gateX = field.minX;
  [gateFrom, gateTo].forEach((postZ) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.16, 1.15, 0.16],
      [gateX, 0.57, postZ],
    );
  });
  const gateLength = Math.abs(gateTo - gateFrom) - 0.1;
  const middle = (gateFrom + gateTo) / 2;
  const bars = builder.isFar ? 2 : 5;
  for (let bar = 0; bar < bars; bar++) {
    builder.box(
      "metal",
      galvanised,
      [0.04, 0.04, gateLength],
      [gateX, 0.2 + (bar / (bars - 1)) * 0.75, middle],
    );
  }
  if (!builder.isFar) {
    builder.bar(
      "metal",
      galvanised,
      [gateX, 0.2, middle - gateLength / 2],
      [gateX, 0.95, middle + gateLength / 2],
      0.04,
      4,
    );
    [-1, 1].forEach((end) => {
      builder.box(
        "metal",
        galvanised,
        [0.05, 0.8, 0.05],
        [gateX, 0.57, middle + (end * gateLength) / 2],
      );
    });
  }
};

const buildFields = (builder: AttractionBuilder) => {
  [sheepField, cowField].forEach((field) => {
    builder.box(
      "matte",
      fieldGrass,
      [field.maxX - field.minX, 0.03, field.maxZ - field.minZ],
      [(field.minX + field.maxX) / 2, 0.015, (field.minZ + field.maxZ) / 2],
    );
  });
  buildFieldFence(builder, sheepField, -3.0, -4.6);
  buildFieldFence(builder, cowField, 2.4, 4.0);
  const trough: Triple = [7.35, 0, 5.7];
  softBox(builder, "paint", galvanised, [1.3, 0.45, 0.5], 0.04, [
    trough[0],
    0.23,
    trough[2],
  ]);
  builder.box(
    "water",
    palette.water,
    [1.2, 0.02, 0.4],
    [trough[0], 0.42, trough[2]],
  );
  const rack: Triple = [7.4, 0, -1.6];
  builder.box(
    "matte",
    palette.timber,
    [1.2, 0.08, 0.6],
    [rack[0], 0.55, rack[2]],
  );
  builder.box("matte", hay, [1.1, 0.35, 0.5], [rack[0], 0.78, rack[2]]);
  [-0.55, 0.55].forEach((side) => {
    [-0.25, 0.25].forEach((end) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.07, 0.95, 0.07],
        [rack[0] + side, 0.47, rack[2] + end],
      );
    });
  });
  if (!builder.isFar) {
    for (let slat = 0; slat < 6; slat++) {
      builder.box(
        "matte",
        palette.timber,
        [0.04, 0.4, 0.04],
        [rack[0] - 0.5 + slat * 0.2, 0.85, rack[2] + 0.28],
      );
    }
  }
};

/* The farmyard round it */

const pond = { x: -5.6, z: 5.1, radius: 1.7 };

const buildYard = (builder: AttractionBuilder) => {
  builder.box("matte", palette.gravel, [8.6, 0.04, 4.6], [-3.4, 0.02, 0.6]);
  builder.box("matte", palette.path, [1.8, 0.04, 8.0], [-1.0, 0.021, 6.9]);
  builder.cylinder("matte", "#6b5a3f", {
    radius: pond.radius + 0.2,
    length: 0.06,
    at: [pond.x, 0.03, pond.z],
    segments: builder.segments(24, 12),
  });
  builder.cylinder("water", "#4a8fae", {
    radius: pond.radius,
    length: 0.04,
    at: [pond.x, 0.06, pond.z],
    segments: builder.segments(24, 12),
  });
  if (!builder.isFar) {
    const reeds: [number, number][] = [
      [-1.5, 0.6],
      [-1.2, 1.1],
      [1.4, -0.9],
      [1.6, -0.4],
    ];
    reeds.forEach(([dx, dz]) => {
      [-0.08, 0, 0.09].forEach((offset, stem) => {
        const top = 0.75 + stem * 0.15;
        builder.bar(
          "matte",
          "#5e8a3a",
          [pond.x + dx + offset, 0.05, pond.z + dz],
          [pond.x + dx + offset * 2, top, pond.z + dz + offset],
          0.03,
          4,
        );
        if (stem === 1) {
          builder.cylinder("matte", "#5a3a22", {
            radius: 0.035,
            length: 0.16,
            at: [pond.x + dx + offset * 2, top - 0.1, pond.z + dz + offset],
            segments: 5,
          });
        }
      });
    });
  }
  addTree(builder, [-8.4, 0, -4.4], 1.2);
  addTree(builder, [-7.8, 0, 3.4], 1.0, "#4a9440");
  addTree(builder, [9.4, 0, 0.0], 1.05, "#3c8237");
  addBush(builder, [-3.6, 0, 7.6], 0.55);
  addBush(builder, [2.2, 0, 8.2], 0.5, "#3a7d34");
  addBush(builder, [-8.6, 0, 0.9], 0.5, "#3a7d34");
  addSignBoard(builder, [-2.7, 0, 8.6], barnRed);
};

/* The animals */

const buildSheep = (builder: AttractionBuilder) => {
  const fleece = "#eee8d8";
  const face = "#2b2622";
  builder.sphere("matte", fleece, 0.3, [0, 0.52, 0], [0.92, 0.82, 1.25], 9);
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      shade(fleece, 0.96),
      0.2,
      [0, 0.7, -0.12],
      [1, 0.8, 1.2],
      7,
    );
    builder.sphere(
      "matte",
      shade(fleece, 1.03),
      0.18,
      [0, 0.66, 0.18],
      [1.1, 0.85, 1],
      7,
    );
  }
  builder.sphere("matte", face, 0.12, [0, 0.66, 0.42], [0.8, 0.95, 1.3], 8);
  builder.sphere("matte", fleece, 0.09, [0, 0.77, 0.36], [1.1, 0.8, 1], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      face,
      [0.12, 0.04, 0.06],
      [side * 0.12, 0.7, 0.36],
      [0, 0, side * -0.4],
    );
    [-0.2, 0.2].forEach((legZ) => {
      builder.cylinder("matte", face, {
        radius: 0.04,
        length: 0.32,
        at: [side * 0.12, 0.16, legZ],
        segments: 5,
      });
    });
  });
};

const buildCow = (builder: AttractionBuilder) => {
  const white = "#f3f1ec";
  const black = "#1f2023";
  softBox(builder, "matte", white, [0.72, 0.68, 1.45], 0.2, [0, 0.98, 0]);
  const patches: [number, number, number, number][] = [
    [1, 1.05, 0.25, 0.3],
    [1, 0.9, -0.4, 0.24],
    [-1, 1.0, -0.1, 0.32],
    [-1, 0.85, 0.45, 0.2],
  ];
  patches.forEach(([side, y, z, size]) => {
    builder.sphere(
      "matte",
      black,
      size,
      [side * 0.33, y, z],
      [0.25, 0.85, 1.1],
      6,
    );
  });
  builder.sphere("matte", black, 0.28, [0, 1.3, -0.25], [0.95, 0.18, 1.2], 5);
  softBox(
    builder,
    "matte",
    black,
    [0.34, 0.38, 0.5],
    0.1,
    [0, 1.15, 0.88],
    [0.35, 0, 0],
  );
  builder.box("matte", white, [0.12, 0.3, 0.04], [0, 1.18, 1.12], [0.35, 0, 0]);
  builder.box(
    "matte",
    "#d99a8f",
    [0.3, 0.17, 0.16],
    [0, 0.98, 1.12],
    [0.35, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      black,
      [0.16, 0.05, 0.1],
      [side * 0.24, 1.3, 0.78],
      [0, 0, side * -0.3],
    );
    builder.cylinder("matte", "#e8dcc2", {
      radius: 0.03,
      radiusEnd: 0.008,
      length: 0.12,
      at: [side * 0.13, 1.4, 0.8],
      axis: "x",
      segments: 5,
    });
    [-0.5, 0.5].forEach((legZ) => {
      builder.cylinder("matte", white, {
        radius: 0.075,
        radiusEnd: 0.065,
        length: 0.7,
        at: [side * 0.22, 0.35, legZ],
        segments: 5,
      });
    });
  });
  builder.sphere("matte", "#e6a79c", 0.13, [0, 0.62, -0.38], [1.1, 0.8, 1], 5);
  builder.bar("matte", white, [0, 1.2, -0.72], [0, 0.55, -0.8], 0.04, 4);
  builder.box("matte", black, [0.08, 0.14, 0.08], [0, 0.5, -0.8]);
};

const buildDuck = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#f4f1ea", 0.13, [0, 0.1, 0], [0.85, 0.7, 1.25], 8);
  builder.sphere("matte", "#f4f1ea", 0.075, [0, 0.24, 0.12], [1, 1, 1], 7);
  builder.box("matte", "#e8962f", [0.06, 0.025, 0.08], [0, 0.23, 0.21]);
  builder.cylinder("matte", "#f4f1ea", {
    radius: 0.04,
    radiusEnd: 0.005,
    length: 0.1,
    at: [0, 0.16, -0.17],
    axis: "z",
    segments: 5,
  });
};

const blockers: LocalBlocker[] = [
  ...[-1.6, 0, 1.6].flatMap((along) => [
    { x: barn.x - 1.2, z: barn.z + along, radius: 1.45 },
    { x: barn.x + 1.2, z: barn.z + along, radius: 1.45 },
  ]),
  { x: silo.x, z: silo.z, radius: silo.radius + 0.15 },
  ...bales.slice(0, 2).map(([x, , z]) => ({ x, z, radius: 0.6 })),
  { x: tractor.x, z: tractor.z, radius: 0.85 },
  {
    x: tractor.x + Math.sin(tractor.turn) * 1.0,
    z: tractor.z + Math.cos(tractor.turn) * 1.0,
    radius: 0.55,
  },
  {
    x: tractor.x - Math.sin(tractor.turn) * 0.6,
    z: tractor.z - Math.cos(tractor.turn) * 0.6,
    radius: 0.8,
  },
  { x: pond.x, z: pond.z, radius: pond.radius },
  { x: -8.4, z: -4.4, radius: 0.32 },
  { x: -7.8, z: 3.4, radius: 0.3 },
  { x: 9.4, z: 0.0, radius: 0.3 },
];

export const farmModel: AttractionModel = {
  kind: "farm",
  name: "Farm",
  fact: "Cows and sheep are herbivores: they eat only plants, mostly grass and hay. A cow chews its food again and again to get all the goodness out of it, and a sheep's woolly fleece is clipped off each summer to make warm clothes.",
  curriculumLink:
    "Science, Years 1 and 2: animals, including humans. Common animals and what they eat (herbivores, carnivores and omnivores), and what animals need to survive.",
  footprint: 11,
  setting: "inland",
  signSpot: { x: -2.7, z: 9.5 },
  build: (builder) => {
    buildYard(builder);
    buildFields(builder);
    buildBarn(builder);
    buildSilo(builder);
    buildHay(builder);
    buildTractor(builder);
  },
  moving: [
    {
      name: "weathervane",
      pivot: weathervanePivot,
      build: buildWeathervane,
      motion: weathervaneMotion,
    },
  ],
  wanderers: [
    {
      name: "sheep",
      build: buildSheep,
      count: 5,
      centre: {
        x: (sheepField.minX + sheepField.maxX) / 2,
        z: (sheepField.minZ + sheepField.maxZ) / 2,
      },
      radius: 2.0,
      speed: 0.25,
    },
    {
      name: "cows",
      build: buildCow,
      count: 3,
      centre: {
        x: (cowField.minX + cowField.maxX) / 2 - 0.3,
        z: (cowField.minZ + cowField.maxZ) / 2,
      },
      radius: 1.8,
      speed: 0.18,
    },
    {
      name: "ducks",
      build: buildDuck,
      count: 3,
      centre: { x: pond.x, z: pond.z },
      radius: 0.95,
      speed: 0.3,
      height: 0.02,
      bob: 0.02,
    },
  ],
  blockers,
};
