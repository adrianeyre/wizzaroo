import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBush,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "./attraction-kit.js";

const rope = "#d8cdb2";
const pegMetal = "#8a9096";
const logBark = "#5e4130";
const logEnd = "#c9a46a";
const ember = "#ff7a1a";
const flameYellow = "#ffd23a";

/** Places points in a frame turned by `turn` about y and moved to `at`. */
const framed =
  (at: { x: number; z: number }, turn: number) =>
  (x: number, y: number, z: number): Triple => [
    at.x + x * Math.cos(turn) + z * Math.sin(turn),
    y,
    at.z - x * Math.sin(turn) + z * Math.cos(turn),
  ];

const addGuyRope = (builder: AttractionBuilder, from: Triple, to: Triple) => {
  if (builder.isFar) {
    return;
  }
  builder.bar("matte", rope, from, to, 0.015, 3);
  builder.cylinder("metal", pegMetal, {
    radius: 0.02,
    length: 0.12,
    at: [to[0], 0.04, to[2]],
    segments: 4,
  });
};

/* The campfire */

const fire = { x: 0, z: 0.5 };
const fireBase: Triple = [fire.x, 0.1, fire.z];
const flameMotion: Motion = { kind: "flicker", period: 0.9 };
const haloMotion: Motion = { kind: "flicker", period: 1.7, phase: 1.1 };

const buildFireRing = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#3b3430", {
    radius: 0.62,
    length: 0.05,
    at: [fire.x, 0.025, fire.z],
    segments: builder.segments(16, 8),
  });
  const stones = builder.isFar ? 8 : 11;
  for (let stone = 0; stone < stones; stone++) {
    const angle = (stone / stones) * Math.PI * 2;
    builder.sphere(
      "matte",
      stone % 3 === 0
        ? palette.darkStone
        : shade(palette.stone, 0.9 + (stone % 2) * 0.12),
      0.2,
      [fire.x + Math.sin(angle) * 0.75, 0.08, fire.z + Math.cos(angle) * 0.75],
      [1.15, 0.7, 0.95],
      builder.segments(7, 5),
    );
  }
  [0.3, 1.9, 3.6].forEach((angle) => {
    builder.add(
      "matte",
      logBark,
      new CylinderGeometry(0.07, 0.08, 0.95, builder.segments(7, 4)),
      {
        at: [
          fire.x + Math.sin(angle) * 0.22,
          0.28,
          fire.z + Math.cos(angle) * 0.22,
        ],
        rotation: [0, angle, 0.9],
      },
    );
  });
  builder.sphere(
    "glow",
    "#ff5a1a",
    0.32,
    [fire.x, 0.08, fire.z],
    [1, 0.25, 1],
    10,
  );
};

const buildFlames = (builder: AttractionBuilder) => {
  const flames: [number, number, number, number][] = [
    [0, 0, 1, 0],
    [0.14, 0.06, 0.72, 1.1],
    [-0.13, 0.08, 0.68, 2.4],
    [0.02, -0.14, 0.62, 4.1],
  ];
  flames.forEach(([dx, dz, size, twist]) => {
    builder.lathe(
      "glow",
      ember,
      [
        [0, 0],
        [0.2 * size, 0.1 * size],
        [0.17 * size, 0.32 * size],
        [0.08 * size, 0.58 * size],
        [0, 0.78 * size],
      ],
      [dx, 0, dz],
      "y",
      builder.segments(8, 5),
    );
    builder.lathe(
      "glow",
      flameYellow,
      [
        [0, 0.02],
        [0.12 * size, 0.1 * size],
        [0.1 * size, 0.26 * size],
        [0.04 * size, 0.44 * size],
        [0, 0.55 * size],
      ],
      [dx + Math.sin(twist) * 0.02, 0.03, dz + 0.04 * size],
      "y",
      builder.segments(7, 4),
    );
  });
};

const buildHalo = (builder: AttractionBuilder) => {
  const layers: [number, string][] = [
    [0.9, "#6a3210"],
    [1.45, "#3e1d08"],
    [2.1, "#241105"],
  ];
  layers.forEach(([radius, colour]) => {
    builder.sphere(
      "glow",
      colour,
      radius,
      [0, 0.3, 0],
      [1, 0.6, 1],
      builder.segments(14, 8),
    );
  });
};

const buildKettle = (builder: AttractionBuilder) => {
  const apex: Triple = [fire.x, 1.75, fire.z];
  [0.5, 2.6, 4.7].forEach((angle) => {
    builder.bar(
      "metal",
      "#3a3c40",
      [fire.x + Math.sin(angle) * 1.0, 0, fire.z + Math.cos(angle) * 1.0],
      [
        apex[0] + Math.sin(angle) * 0.05,
        apex[1] + 0.12,
        apex[2] + Math.cos(angle) * 0.05,
      ],
      0.04,
      5,
    );
  });
  builder.bar("metal", "#3a3c40", apex, [apex[0], 1.12, apex[2]], 0.02, 4);
  const kettleAt: Triple = [fire.x, 0.84, fire.z];
  const enamel = "#2f5a7a";
  builder.lathe(
    "paint",
    enamel,
    [
      [0, 0],
      [0.15, 0],
      [0.19, 0.06],
      [0.2, 0.14],
      [0.15, 0.24],
      [0.07, 0.27],
      [0.07, 0.29],
      [0, 0.3],
    ],
    kettleAt,
    "y",
    builder.segments(14, 8),
  );
  builder.sphere(
    "paint",
    palette.black,
    0.035,
    [kettleAt[0], kettleAt[1] + 0.32, kettleAt[2]],
    [1, 1, 1],
    6,
  );
  builder.bar(
    "paint",
    enamel,
    [kettleAt[0] + 0.15, kettleAt[1] + 0.08, kettleAt[2]],
    [kettleAt[0] + 0.3, kettleAt[1] + 0.22, kettleAt[2]],
    0.045,
    6,
  );
  builder.add(
    "metal",
    "#3a3c40",
    new TorusGeometry(0.15, 0.012, 4, builder.segments(12, 6), Math.PI),
    {
      at: [kettleAt[0], kettleAt[1] + 0.22, kettleAt[2]],
      rotation: [0, Math.PI / 2, 0],
    },
  );
};

const smokeAt: Triple = [fire.x + 0.05, 1.3, fire.z - 0.05];

/* Seats round the fire */

const logSeatAngles = [1.25, -1.25, Math.PI];
const logSeatRadius = 2.0;

const buildLogSeats = (builder: AttractionBuilder) => {
  logSeatAngles.forEach((angle) => {
    const at: Triple = [
      fire.x + Math.sin(angle) * logSeatRadius,
      0.21,
      fire.z + Math.cos(angle) * logSeatRadius,
    ];
    builder.add(
      "matte",
      logBark,
      new CylinderGeometry(0.22, 0.24, 1.4, builder.segments(12, 6)),
      { at, rotation: [0, angle, Math.PI / 2] },
    );
    if (!builder.isFar) {
      [-0.705, 0.705].forEach((end) => {
        builder.add(
          "matte",
          logEnd,
          new CylinderGeometry(0.205, 0.205, 0.02, 12),
          {
            at: [
              at[0] + Math.cos(angle) * end,
              at[1],
              at[2] - Math.sin(angle) * end,
            ],
            rotation: [0, angle, Math.PI / 2],
          },
        );
      });
    }
  });
  const bucket: Triple = [1.35, 0, 1.95];
  builder.cylinder("paint", "#c8302a", {
    radius: 0.16,
    radiusEnd: 0.2,
    length: 0.36,
    at: [bucket[0], 0.18, bucket[2]],
    segments: builder.segments(12, 6),
  });
  builder.cylinder("water", palette.water, {
    radius: 0.18,
    length: 0.02,
    at: [bucket[0], 0.33, bucket[2]],
    segments: builder.segments(12, 6),
  });
  if (!builder.isFar) {
    builder.box(
      "paint",
      palette.cream,
      [0.18, 0.08, 0.02],
      [bucket[0], 0.2, bucket[2] + 0.18],
    );
    builder.add(
      "metal",
      pegMetal,
      new TorusGeometry(0.19, 0.01, 4, 10, Math.PI),
      { at: [bucket[0], 0.36, bucket[2]] },
    );
  }
  const woodpile = { x: -2.9, z: 2.6 };
  for (let row = 0; row < 3; row++) {
    const count = 4 - row;
    for (let log = 0; log < count; log++) {
      builder.cylinder(
        "matte",
        log % 2 === 0 ? logBark : shade(logBark, 1.15),
        {
          radius: 0.1,
          length: 0.75,
          at: [
            woodpile.x + (log - (count - 1) / 2) * 0.2,
            0.1 + row * 0.17,
            woodpile.z,
          ],
          axis: "z",
          segments: builder.segments(7, 4),
        },
      );
    }
  }
};

/* The tents */

interface RidgeTent {
  x: number;
  z: number;
  turn: number;
  halfWidth: number;
  height: number;
  length: number;
  canvas: string;
}

const ridgeTent: RidgeTent = {
  x: -4.3,
  z: -1.7,
  turn: 1.15,
  halfWidth: 0.95,
  height: 1.25,
  length: 2.3,
  canvas: "#d9732f",
};
const pupTent: RidgeTent = {
  x: -5.3,
  z: 2.9,
  turn: 2.0,
  halfWidth: 0.7,
  height: 0.95,
  length: 1.7,
  canvas: "#5b7f4a",
};

const buildRidgeTent = (builder: AttractionBuilder, tent: RidgeTent) => {
  const { turn, canvas } = tent;
  const place = framed(tent, turn);
  const inner = "#f0cf8a";
  const { halfWidth, height, length } = tent;
  const slope = Math.hypot(halfWidth, height);
  const angle = Math.atan2(height, halfWidth);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      canvas,
      [slope, 0.03, length],
      place((side * halfWidth) / 2, height / 2, 0),
      [0, turn, -side * angle],
    );
    builder.box(
      "matte",
      shade(canvas, 0.78),
      [0.04, 0.14, length + 0.02],
      place(side * (halfWidth - 0.02), 0.07, 0),
      [0, turn, -side * angle],
    );
  });
  const gable = new Shape();
  gable.moveTo(-halfWidth + 0.03, 0);
  gable.lineTo(halfWidth - 0.03, 0);
  gable.lineTo(0, height - 0.04);
  gable.closePath();
  [-1, 1].forEach((end) => {
    const geometry = new ExtrudeGeometry(gable, {
      depth: 0.03,
      bevelEnabled: false,
    });
    builder.add("matte", end === 1 ? inner : canvas, geometry, {
      at: place(0, 0, end * (length / 2 - 0.03)),
      rotation: [0, turn, 0],
    });
  });
  const door = new Shape();
  door.moveTo(-halfWidth * 0.4, 0);
  door.lineTo(halfWidth * 0.4, 0);
  door.lineTo(0, height * 0.76);
  door.closePath();
  builder.add(
    "matte",
    "#3a2f26",
    new ExtrudeGeometry(door, { depth: 0.02, bevelEnabled: false }),
    { at: place(0, 0, length / 2 + 0.005), rotation: [0, turn, 0] },
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.add(
        "matte",
        shade(canvas, 0.9),
        new CylinderGeometry(0.07, 0.05, height * 0.76, 6),
        {
          at: place(side * halfWidth * 0.28, height * 0.36, length / 2 + 0.06),
          rotation: [0, turn, side * 0.38],
        },
      );
    });
  }
  builder.bar(
    "metal",
    palette.steel,
    place(0, height + 0.02, -length / 2 - 0.12),
    place(0, height + 0.02, length / 2 + 0.12),
    0.035,
    5,
  );
  [-1, 1].forEach((end) => {
    builder.bar(
      "metal",
      palette.steel,
      place(0, 0, end * (length / 2 + 0.05)),
      place(0, height + 0.12, end * (length / 2 + 0.05)),
      0.035,
      5,
    );
    addGuyRope(
      builder,
      place(0, height + 0.1, end * (length / 2 + 0.08)),
      place(0, 0, end * (length / 2 + 1.0)),
    );
    [-1, 1].forEach((side) => {
      addGuyRope(
        builder,
        place(side * halfWidth * 0.45, height * 0.55, end * length * 0.32),
        place(side * (halfWidth + 0.7), 0, end * length * 0.4),
      );
    });
  });
};

const domeTent = { x: 4.3, z: -2.2, turn: -1.05 };
const dome = { radius: 1.25, height: 1.1 };

const buildDomeTent = (builder: AttractionBuilder) => {
  const { turn } = domeTent;
  const place = framed(domeTent, turn);
  const canvas = "#2f7f9a";
  const segments = builder.segments(16, 8);
  const profile = Array.from({ length: 7 }, (_, step) => {
    const angle = (step / 6) * (Math.PI / 2);
    return new Vector2(
      Math.cos(angle) * dome.radius,
      Math.sin(angle) * dome.height,
    );
  });
  builder.add("matte", canvas, new LatheGeometry(profile, segments), {
    at: [domeTent.x, 0, domeTent.z],
  });
  builder.cylinder("matte", "#4b4f55", {
    radius: dome.radius + 0.04,
    length: 0.12,
    at: [domeTent.x, 0.06, domeTent.z],
    segments,
  });
  [-1, 1].forEach((side) => {
    const arc = new TorusGeometry(
      dome.radius + 0.02,
      0.022,
      4,
      builder.segments(18, 8),
      Math.PI,
    );
    arc.scale(1, dome.height / dome.radius, 1);
    arc.rotateY((side * Math.PI) / 4 + turn);
    builder.add("metal", "#3a3c40", arc, { at: [domeTent.x, 0, domeTent.z] });
  });
  const doorGeometry = new SphereGeometry(
    dome.radius + 0.015,
    builder.segments(8, 4),
    builder.segments(6, 3),
    Math.PI / 2 - 0.36,
    0.72,
    Math.PI / 2 - 0.75,
    0.75,
  );
  doorGeometry.scale(1, dome.height / dome.radius, 1);
  doorGeometry.rotateY(turn);
  builder.add("matte", "#1d4554", doorGeometry, {
    at: [domeTent.x, 0, domeTent.z],
  });
  const vent = new BoxGeometry(0.8, 0.16, 0.03);
  vent.rotateX(-1.0);
  vent.rotateY(turn);
  builder.add("matte", shade(canvas, 1.25), vent, {
    at: place(0, 0.88, 0.8),
  });
  [0.785, 2.356, 3.927, 5.498].forEach((angle) => {
    addGuyRope(
      builder,
      place(Math.sin(angle) * 0.85, 0.82, Math.cos(angle) * 0.85),
      place(Math.sin(angle) * 2.0, 0, Math.cos(angle) * 2.0),
    );
  });
};

const bellTent = { x: -0.7, z: -5.0, turn: 0.1 };
const bell = { radius: 1.75, wall: 0.85, apex: 2.85 };

const buildBellTent = (builder: AttractionBuilder) => {
  const { turn } = bellTent;
  const place = framed(bellTent, turn);
  const canvas = "#efe4c8";
  const segments = builder.segments(18, 10);
  builder.lathe(
    "matte",
    canvas,
    [
      [bell.radius, 0],
      [bell.radius, bell.wall],
      [bell.radius + 0.08, bell.wall - 0.04],
      [bell.radius * 0.55, (bell.wall + bell.apex) / 2 + 0.05],
      [0.1, bell.apex],
      [0, bell.apex],
    ],
    [bellTent.x, 0, bellTent.z],
    "y",
    segments,
  );
  builder.cylinder("matte", shade(canvas, 0.85), {
    radius: bell.radius + 0.01,
    length: 0.1,
    at: [bellTent.x, bell.wall - 0.02, bellTent.z],
    segments,
    isOpen: true,
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.035,
    length: 0.45,
    at: [bellTent.x, bell.apex + 0.18, bellTent.z],
    segments: 5,
  });
  builder.box(
    "matte",
    "#c8302a",
    [0.02, 0.16, 0.3],
    [bellTent.x, bell.apex + 0.32, bellTent.z + 0.16],
  );
  builder.box(
    "matte",
    "#3a2f26",
    [0.72, 1.05, 0.03],
    place(0, 0.52, bell.radius + 0.005),
    [0, turn, 0],
  );
  builder.box(
    "matte",
    shade(canvas, 0.9),
    [0.84, 0.14, 0.14],
    place(0, 1.0, bell.radius + 0.05),
    [0, turn, 0],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      "#8a6a48",
      [0.9, 0.02, 0.6],
      place(0, 0.01, bell.radius + 0.35),
      [0, turn, 0],
    );
  }
  const ropes = builder.isFar ? 0 : 8;
  for (let guy = 0; guy < ropes; guy++) {
    const angle = (guy / ropes) * Math.PI * 2 + Math.PI / 8;
    addGuyRope(
      builder,
      place(
        Math.sin(angle) * (bell.radius + 0.06),
        bell.wall,
        Math.cos(angle) * (bell.radius + 0.06),
      ),
      place(
        Math.sin(angle) * (bell.radius + 0.95),
        0,
        Math.cos(angle) * (bell.radius + 0.95),
      ),
    );
  }
};

/* The lanterns */

const addLantern = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.cylinder("metal", "#2f3a33", {
    radius: 0.09,
    length: 0.04,
    at: [x, y + 0.02, z],
    segments: 8,
  });
  builder.cylinder("glow", palette.warmLight, {
    radius: 0.065,
    length: 0.2,
    at: [x, y + 0.14, z],
    segments: 8,
  });
  builder.lathe(
    "metal",
    "#2f3a33",
    [
      [0.1, 0],
      [0.06, 0.08],
      [0.02, 0.1],
      [0, 0.1],
    ],
    [x, y + 0.24, z],
    "y",
    8,
  );
  if (!builder.isFar) {
    builder.add(
      "metal",
      "#2f3a33",
      new TorusGeometry(0.05, 0.008, 4, 8, Math.PI),
      {
        at: [x, y + 0.34, z],
      },
    );
  }
};

const lanternPost = { x: -2.6, z: -2.9 };

const buildLanterns = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.black, {
    radius: 0.025,
    length: 1.7,
    at: [lanternPost.x, 0.85, lanternPost.z],
    segments: 5,
  });
  builder.add(
    "metal",
    palette.black,
    new TorusGeometry(0.16, 0.022, 4, builder.segments(10, 5), Math.PI),
    {
      at: [lanternPost.x + 0.16, 1.7, lanternPost.z],
    },
  );
  addLantern(builder, [lanternPost.x + 0.32, 1.22, lanternPost.z]);
  builder.bar(
    "metal",
    palette.black,
    [lanternPost.x + 0.32, 1.7, lanternPost.z],
    [lanternPost.x + 0.32, 1.56, lanternPost.z],
    0.015,
    3,
  );
};

/* The picnic pitch */

const pitch = { x: 4.4, z: 3.3 };

const buildPicnicPitch = (builder: AttractionBuilder) => {
  const { x, z } = pitch;
  builder.box("matte", "#78ae4e", [3.4, 0.02, 2.8], [x, 0.01, z]);
  const wood = palette.paleTimber;
  const turn = 0.2;
  const place = framed(pitch, turn);
  builder.box("matte", wood, [1.7, 0.06, 0.75], place(0, 0.72, 0), [
    0,
    turn,
    0,
  ]);
  [-1, 1].forEach((side) => {
    builder.box("matte", wood, [1.7, 0.05, 0.28], place(0, 0.42, side * 0.68), [
      0,
      turn,
      0,
    ]);
    [-0.6, 0.6].forEach((along) => {
      builder.box(
        "matte",
        shade(wood, 0.85),
        [0.07, 0.95, 0.07],
        place(along, 0.38, side * 0.32),
        [-side * 0.62, turn, 0],
      );
    });
  });
  [-0.6, 0.6].forEach((along) => {
    builder.box(
      "matte",
      shade(wood, 0.85),
      [0.06, 0.06, 1.55],
      place(along, 0.33, 0),
      [0, turn, 0],
    );
  });
  if (!builder.isFar) {
    for (let slat = -1; slat <= 1; slat++) {
      builder.box(
        "matte",
        shade(wood, 0.8),
        [1.7, 0.062, 0.015],
        place(0, 0.721, slat * 0.24 + 0.12),
        [0, turn, 0],
      );
    }
    builder.box("paint", "#c8302a", [0.7, 0.012, 0.5], place(0.35, 0.756, 0), [
      0,
      turn,
      0.0,
    ]);
    builder.box(
      "paint",
      palette.cream,
      [0.12, 0.013, 0.5],
      place(0.35, 0.757, 0),
      [0, turn, 0],
    );
    builder.cylinder("paint", "#e9e4d8", {
      radius: 0.05,
      length: 0.1,
      at: place(-0.3, 0.8, 0.1),
      segments: 8,
    });
  }
  addLantern(builder, place(0.6, 0.75, -0.15));
  const postAt: Triple = [x - 1.55, 0, z + 1.25];
  builder.box(
    "matte",
    palette.darkTimber,
    [0.1, 0.7, 0.1],
    [postAt[0], 0.35, postAt[2]],
  );
  builder.box(
    "paint",
    palette.cream,
    [0.12, 0.12, 0.02],
    [postAt[0], 0.58, postAt[2] + 0.055],
  );
  builder.box(
    "paint",
    palette.black,
    [0.03, 0.08, 0.01],
    [postAt[0], 0.58, postAt[2] + 0.066],
  );
};

/* Round the edge */

const addPine = (
  builder: AttractionBuilder,
  at: { x: number; z: number },
  size: number,
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.12 * size,
    length: 1.0 * size,
    at: [at.x, 0.5 * size, at.z],
    segments: 6,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    builder.lathe(
      "matte",
      tier % 2 === 0 ? "#2f5e36" : "#386b3c",
      [
        [0, 0],
        [(1.25 - share * 0.7) * size, 0.05 * size],
        [0, (1.5 - share * 0.4) * size],
      ],
      [at.x, (0.7 + share * 1.9) * size, at.z],
      "y",
      builder.segments(10, 6),
    );
  }
};

const pines: [number, number, number][] = [
  [-6.9, -4.0, 1.25],
  [6.4, -5.2, 1.1],
  [-7.6, 1.4, 1.0],
  [2.9, -6.9, 1.15],
];

const buildEdges = (builder: AttractionBuilder) => {
  builder.box("matte", palette.path, [1.4, 0.03, 5.6], [0, 0.015, 6.2]);
  builder.cylinder("matte", palette.path, {
    radius: 1.2,
    length: 0.03,
    at: [0, 0.015, 3.2],
    segments: builder.segments(16, 8),
  });
  pines.forEach(([x, z, size]) => {
    addPine(builder, { x, z }, size);
  });
  addBush(builder, [-4.0, 0, 5.3], 0.55);
  addBush(builder, [7.2, 0, 0.8], 0.5, "#3a7d34");
  addBush(builder, [-3.8, 0, -6.6], 0.5, "#3a7d34");
  addSignBoard(builder, [-2.3, 0, 6.8], "#2f5e36");
};

const blockers: LocalBlocker[] = [
  { x: fire.x, z: fire.z, radius: 1.05 },
  ...logSeatAngles.map((angle) => ({
    x: fire.x + Math.sin(angle) * logSeatRadius,
    z: fire.z + Math.cos(angle) * logSeatRadius,
    radius: 0.45,
  })),
  ...[-0.6, 0.6].map((along) => ({
    x: ridgeTent.x + Math.sin(ridgeTent.turn) * along,
    z: ridgeTent.z + Math.cos(ridgeTent.turn) * along,
    radius: 1.0,
  })),
  { x: pupTent.x, z: pupTent.z, radius: 0.95 },
  { x: domeTent.x, z: domeTent.z, radius: dome.radius + 0.1 },
  { x: bellTent.x, z: bellTent.z, radius: bell.radius + 0.1 },
  { x: pitch.x, z: pitch.z, radius: 1.0 },
  { x: -2.9, z: 2.6, radius: 0.45 },
  { x: 1.35, z: 1.95, radius: 0.22 },
  { x: lanternPost.x, z: lanternPost.z, radius: 0.2 },
  ...pines.map(([x, z]) => ({ x, z, radius: 0.35 })),
];

export const campsiteModel: AttractionModel = {
  kind: "campsite",
  name: "Campsite",
  fact: "A campfire is a light source: it makes its own light, just like the Sun, a torch or a lantern. The Moon is not a light source, because it only reflects light from the Sun. Campers always keep a bucket of water by the fire to stay safe.",
  curriculumLink:
    "Science, Year 3: light. Recognising that we need light to see things, that dark is the absence of light, and which things are light sources.",
  footprint: 9,
  setting: "inland",
  signSpot: { x: -2.3, z: 7.7 },
  build: (builder) => {
    buildEdges(builder);
    buildFireRing(builder);
    buildKettle(builder);
    buildLogSeats(builder);
    buildRidgeTent(builder, ridgeTent);
    buildRidgeTent(builder, pupTent);
    buildDomeTent(builder);
    buildBellTent(builder);
    buildLanterns(builder);
    buildPicnicPitch(builder);
  },
  moving: [
    {
      name: "flames",
      pivot: fireBase,
      build: buildFlames,
      motion: flameMotion,
    },
    {
      name: "fire-glow",
      pivot: [fire.x, 0.1, fire.z],
      build: buildHalo,
      motion: haloMotion,
      look: "halo",
    },
  ],
  smoke: [
    {
      at: smokeAt,
      colour: "#c9c4bc",
      puffs: 8,
      size: 0.22,
      rise: 3.2,
      spread: 0.7,
    },
  ],
  blockers,
};
