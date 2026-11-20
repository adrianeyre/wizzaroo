import {
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const peat = "#3f2e22";
const moss = "#7a9a3a";
const redMoss = "#a84a3a";
const trapGreen = "#6fae3a";
const trapRed = "#c8303a";
const toothGreen = "#9ac84a";
const stalkGreen = "#5f8a2a";
const pitcherGreen = "#a8c050";
const pitcherRed = "#a8303a";
const logBark = "#6b4f34";
const signColour = "#6a2a3a";

const bog = { x: 0, z: -0.7, radiusX: 2.7, radiusZ: 1.9 };
const lobeRadius = 0.38;
const lobeStretch = 1.25;
const openTilt = 0.85;

interface Trap {
  x: number;
  z: number;
  height: number;
  turn: number;
  size: number;
}

const heroTraps: readonly Trap[] = [
  { x: -0.9, z: -0.2, height: 0.75, turn: 0, size: 1.15 },
  { x: 1.0, z: -0.5, height: 0.6, turn: 0, size: 1.0 },
];
const sideTraps: readonly Trap[] = [
  { x: -1.6, z: -0.9, height: 0.45, turn: 0.9, size: 0.8 },
  { x: -0.2, z: -1.4, height: 0.55, turn: 2.6, size: 0.85 },
  { x: 1.8, z: -1.3, height: 0.4, turn: -1.6, size: 0.75 },
  { x: 0.2, z: 0.3, height: 0.35, turn: 0.4, size: 0.7 },
];
const pitchers: readonly { x: number; z: number; height: number }[] = [
  { x: -2.1, z: -1.5, height: 1.3 },
  { x: -1.75, z: -1.9, height: 1.0 },
  { x: 1.5, z: -2.1, height: 1.4 },
  { x: 2.05, z: -1.75, height: 1.05 },
  { x: 0.6, z: -2.3, height: 1.15 },
];
const lidPitcher = pitchers[2];

/** Turns a point by a tilt about x then a turn about y, then moves it. */
const orient = (
  point: Triple,
  tilt: number,
  turn: number,
  at: Triple,
): Triple => {
  const turned = new Vector3(...point)
    .applyAxisAngle(new Vector3(1, 0, 0), tilt)
    .applyAxisAngle(new Vector3(0, 1, 0), turn);
  return [turned.x + at[0], turned.y + at[1], turned.z + at[2]];
};

/**
 * One lobe of a trap: a half disc hinged on the midrib along x, red
 * inside, with a fringe of teeth. `side` 1 is the front lobe (+z).
 */
const addLobe = (
  builder: AttractionBuilder,
  at: Triple,
  side: number,
  tilt: number,
  turn: number,
  size: number,
) => {
  const radius = lobeRadius * size;
  const half = (
    colour: string,
    thickness: number,
    lift: number,
    shrink: number,
  ) => {
    builder.add(
      "paint",
      colour,
      new CylinderGeometry(
        radius * shrink,
        radius * shrink,
        thickness,
        builder.segments(12),
        1,
        false,
        side > 0 ? -Math.PI / 2 : Math.PI / 2,
        Math.PI,
      )
        .translate(0, lift, 0)
        .scale(1, 1, lobeStretch)
        .rotateX(tilt)
        .rotateY(turn),
      { at },
    );
  };
  half(trapGreen, 0.04, 0, 1);
  if (builder.isFar) {
    return;
  }
  half(trapRed, 0.01, 0.022, 0.88);
  /* The teeth round the rim, which lock together when the trap snaps shut */
  const teeth = 7;
  for (let tooth = 0; tooth < teeth; tooth++) {
    const angle = -Math.PI / 2 + ((tooth + 0.5) / teeth) * Math.PI;
    const rimX = Math.sin(angle) * radius;
    const rimZ = side * Math.cos(angle) * radius * lobeStretch;
    const out = 1 + 0.32 / size;
    builder.bar(
      "paint",
      toothGreen,
      orient([rimX, 0, rimZ], tilt, turn, at),
      orient([rimX * out, 0.02, rimZ * out], tilt, turn, at),
      0.018,
      3,
    );
  }
  /* Trigger hairs inside */
  [-0.3, 0.3].forEach((across) => {
    builder.bar(
      "paint",
      "#f2c94c",
      orient([across * radius, 0, side * radius * 0.45], tilt, turn, at),
      orient([across * radius, 0.07, side * radius * 0.45], tilt, turn, at),
      0.012,
      3,
    );
  });
};

/** A trap's stalk, the leafy flat petiole spreading from the rosette. */
const addStalk = (builder: AttractionBuilder, trap: Trap) => {
  const { x, z, height, turn } = trap;
  const foot: Triple = [
    x - Math.sin(turn) * 0.3,
    0.05,
    z - Math.cos(turn) * 0.3,
  ];
  builder.bar("matte", stalkGreen, foot, [x, height - 0.02, z], 0.08, 6);
  if (builder.isFar) {
    return;
  }
  builder.add("matte", trapGreen, new SphereGeometry(1, 6, 3), {
    at: [(foot[0] + x) / 2, (height + 0.05) / 2, (foot[2] + z) / 2],
    rotation: [-Math.atan2(height, 0.3), turn, 0],
    scale: [0.09, 0.02, 0.22],
  });
};

/** A whole trap, both lobes open, for the still mesh. */
const addTrap = (builder: AttractionBuilder, trap: Trap, hasFront: boolean) => {
  const at: Triple = [trap.x, trap.height, trap.z];
  addStalk(builder, trap);
  addLobe(builder, at, -1, openTilt, trap.turn, trap.size);
  if (hasFront) {
    addLobe(builder, at, 1, -openTilt, trap.turn, trap.size);
  }
};

const addPitcher = (
  builder: AttractionBuilder,
  at: Triple,
  height: number,
  hasLid: boolean,
) => {
  const [x, , z] = at;
  const scale = height / 1.2;
  builder.lathe(
    "paint",
    pitcherGreen,
    [
      [0, 0],
      [0.1 * scale, 0.02],
      [0.17 * scale, 0.2 * height],
      [0.18 * scale, 0.42 * height],
      [0.14 * scale, 0.7 * height],
      [0.15 * scale, 0.9 * height],
      [0.19 * scale, height],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 8 : 14,
  );
  if (builder.isFar) {
    return;
  }
  /* The slippery red rim, the pool of juice inside, and red veins */
  builder.add(
    "paint",
    pitcherRed,
    new TorusGeometry(0.19 * scale, 0.025, 6, 12).rotateX(Math.PI / 2),
    {
      at: [x, height, z],
    },
  );
  builder.cylinder("water", "#c8b04a", {
    radius: 0.15 * scale,
    length: 0.01,
    at: [x, height * 0.86, z],
    segments: 12,
  });
  for (let vein = 0; vein < 5; vein++) {
    const turn = (vein / 5) * Math.PI * 2;
    builder.bar(
      "paint",
      pitcherRed,
      [
        x + Math.sin(turn) * 0.172 * scale,
        0.22 * height,
        z + Math.cos(turn) * 0.172 * scale,
      ],
      [
        x + Math.sin(turn) * 0.142 * scale,
        0.72 * height,
        z + Math.cos(turn) * 0.142 * scale,
      ],
      0.015,
      3,
    );
  }
  if (hasLid) {
    addLid(builder, [x, height, z], scale, 0.6);
  }
};

/** The hood over a pitcher's mouth, which keeps the rain out. */
const addLid = (
  builder: AttractionBuilder,
  hinge: Triple,
  scale: number,
  open: number,
) => {
  builder.add(
    "paint",
    pitcherGreen,
    new SphereGeometry(0.22 * scale, builder.segments(10), builder.segments(5))
      .scale(1, 0.15, 1.1)
      .translate(0, 0, 0.2 * scale)
      .rotateX(-open),
    { at: [hinge[0], hinge[1] + 0.02, hinge[2] - 0.2 * scale] },
  );
  builder.add(
    "paint",
    pitcherRed,
    new SphereGeometry(0.16 * scale, builder.segments(8), builder.segments(4))
      .scale(1, 0.12, 1.1)
      .translate(0, -0.01, 0.2 * scale)
      .rotateX(-open),
    { at: [hinge[0], hinge[1] + 0.01, hinge[2] - 0.2 * scale] },
  );
};

const buildBog = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    peat,
    new CylinderGeometry(1, 1, 0.06, builder.segments(30)),
    {
      at: [bog.x, 0.03, bog.z],
      scale: [bog.radiusX, 1, bog.radiusZ],
    },
  );
  if (builder.isFar) {
    return;
  }
  /* A ring of mossy logs round the bog */
  builder.add(
    "matte",
    logBark,
    new TorusGeometry(1, 0.12, 6, builder.segments(36)).rotateX(Math.PI / 2),
    {
      at: [bog.x, 0.08, bog.z],
      scale: [bog.radiusX + 0.05, 1, bog.radiusZ + 0.05],
    },
  );
  /* Puddles of bog water, and cushions of sphagnum moss */
  [
    [0.3, -0.9, 0.3],
    [-1.4, 0.3, 0.22],
    [1.6, -0.1, 0.25],
  ].forEach(([x, z, radius]) => {
    builder.cylinder("water", "#5f7a6a", {
      radius,
      length: 0.02,
      at: [x, 0.065, z],
      segments: 12,
    });
  });
  [
    [-2.0, -0.4, 0.3],
    [2.2, -0.7, 0.28],
    [-0.5, 0.6, 0.25],
    [1.1, 0.5, 0.22],
    [0.0, -2.0, 0.3],
    [-1.0, -1.9, 0.24],
  ].forEach(([x, z, radius], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? moss : redMoss,
      radius,
      [x, 0.06, z],
      [1.2, 0.45, 1],
      8,
    );
  });
  /* Little sundews, sticky with dew, in the gaps */
  [
    [-0.4, -0.6],
    [0.6, 0.1],
    [1.3, -1.0],
  ].forEach(([x, z]) => {
    for (let leaf = 0; leaf < 5; leaf++) {
      const turn = (leaf / 5) * Math.PI * 2;
      builder.bar(
        "paint",
        "#c8503a",
        [x, 0.07, z],
        [x + Math.sin(turn) * 0.16, 0.12, z + Math.cos(turn) * 0.16],
        0.03,
        3,
      );
      builder.sphere(
        "glass",
        "#f6e8f0",
        0.02,
        [x + Math.sin(turn) * 0.17, 0.14, z + Math.cos(turn) * 0.17],
        [1, 1, 1],
        4,
      );
    }
  });
};

const buildPlants = (builder: AttractionBuilder) => {
  if (!builder.isFar) {
    sideTraps.forEach((trap) => {
      addTrap(builder, trap, true);
    });
  }
  heroTraps.forEach((trap) => {
    addTrap(builder, trap, builder.isFar);
  });
  pitchers.forEach(({ x, z, height }, index) => {
    if (builder.isFar && index % 2 === 1) {
      return;
    }
    addPitcher(builder, [x, 0, z], height, lidPitcher.x !== x || builder.isFar);
  });
  if (builder.isFar) {
    return;
  }
  /* One trap snapped shut, a fly's wing poking out */
  const shut: Trap = { x: -1.9, z: 0.4, height: 0.4, turn: -0.6, size: 0.7 };
  addStalk(builder, shut);
  addLobe(
    builder,
    [shut.x, shut.height, shut.z],
    -1,
    1.42,
    shut.turn,
    shut.size,
  );
  addLobe(
    builder,
    [shut.x, shut.height, shut.z],
    1,
    -1.42,
    shut.turn,
    shut.size,
  );
  builder.box(
    "glass",
    "#d8eef8",
    [0.08, 0.004, 0.04],
    [shut.x + 0.25, shut.height + 0.02, shut.z + 0.05],
    [0, 0, 0.4],
  );
};

/** The front lobe of a hero trap, open, so it nods shut and open: SNAP! */
const buildFrontLobe = (trap: Trap) => (builder: AttractionBuilder) => {
  addLobe(builder, [0, 0, 0], 1, -openTilt, trap.turn, trap.size);
};

const snapMotion = (index: number): Motion => ({
  kind: "nod",
  axis: "x",
  reach: 5,
  amplitude: 0.42,
  period: 1.2 + index * 0.3,
});

const buildLid = (builder: AttractionBuilder) => {
  addLid(builder, [0, 0, 0], lidPitcher.height / 1.2, 0.6);
};

const buildFly = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#2a2c30", 0.04, [0, 0, 0], [1, 0.9, 1.4], 6);
  builder.sphere("paint", "#a82a2a", 0.018, [-0.02, 0.01, 0.05], [1, 1, 1], 4);
  builder.sphere("paint", "#a82a2a", 0.018, [0.02, 0.01, 0.05], [1, 1, 1], 4);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#d8eef8",
      [0.08, 0.004, 0.04],
      [side * 0.05, 0.03, -0.01],
      [0, side * 0.4, side * 0.3],
    );
  });
};

const buildGround = (builder: AttractionBuilder) => {
  /* A path of log rounds up to the bog's edge */
  [
    [0.9, 3.4],
    [0.6, 2.7],
    [0.85, 2.0],
    [0.5, 1.4],
  ].forEach(([x, z], index) => {
    builder.cylinder(
      "matte",
      index % 2 === 0 ? "#c49a64" : shade("#c49a64", 0.9),
      {
        radius: 0.28,
        length: 0.08,
        at: [x, 0.04, z],
        segments: builder.isFar ? 8 : 14,
      },
    );
  });
  if (builder.isFar) {
    return;
  }
  /* A "Please don't feed the plants" sign, and a jar for watching flies */
  builder.box("matte", palette.darkTimber, [0.06, 0.8, 0.06], [-2.6, 0.4, 1.1]);
  builder.box(
    "paint",
    palette.cream,
    [0.55, 0.28, 0.03],
    [-2.6, 0.78, 1.13],
    [0, 0.4, 0],
  );
  builder.box(
    "paint",
    trapRed,
    [0.42, 0.05, 0.01],
    [-2.6, 0.83, 1.15],
    [0, 0.4, 0],
  );
  builder.box(
    "paint",
    palette.black,
    [0.36, 0.03, 0.01],
    [-2.6, 0.73, 1.15],
    [0, 0.4, 0],
  );
  builder.cylinder("glass", "#e8f4f8", {
    radius: 0.1,
    length: 0.22,
    at: [2.4, 0.11, 1.2],
    segments: 12,
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.105,
    length: 0.04,
    at: [2.4, 0.24, 1.2],
    segments: 12,
  });
  /* Tall grasses beyond the bog */
  [
    [-2.9, -1.8],
    [2.9, -1.9],
    [-0.4, -2.9],
  ].forEach(([x, z]) => {
    for (let blade = 0; blade < 5; blade++) {
      const lean = (blade - 2) * 0.12;
      builder.bar(
        "matte",
        "#7a9a3a",
        [x + blade * 0.06, 0, z],
        [x + blade * 0.06 + lean, 0.8 + (blade % 2) * 0.3, z + lean * 0.4],
        0.035,
        3,
      );
    }
  });
};

export const flytrapPatchModel: CuriosityModel = {
  kind: "flytrap-patch",
  islandId: "jungle-reach",
  name: "Flytrap Patch",
  fact: "Venus flytraps and pitcher plants grow in boggy ground where the soil has very few nutrients. They still make food from sunlight like other plants, but they catch insects to get the extra nutrients they need. A flytrap snaps shut when a fly touches its trigger hairs twice, and a pitcher's slippery rim tips insects into a pool of juice.",
  curriculumLink:
    "Science, Year 4: recognise that living things can be grouped in a variety of ways, such as plants that catch insects for their nutrients.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: -1.2, z: 3.4 },
  build: (builder) => {
    buildGround(builder);
    buildBog(builder);
    buildPlants(builder);
    addSignBoard(builder, [-1.2, 0, 3.4], signColour);
  },
  moving: [
    ...heroTraps.map((trap, index) => ({
      name: `flytrap ${String(index + 1)}`,
      pivot: [trap.x, trap.height, trap.z] satisfies Triple,
      build: buildFrontLobe(trap),
      motion: snapMotion(index),
    })),
    {
      name: "pitcher lid",
      pivot: [lidPitcher.x, lidPitcher.height, lidPitcher.z],
      build: buildLid,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.3, period: 2.6 },
    },
  ],
  wanderers: [
    {
      name: "flies",
      build: buildFly,
      count: 5,
      centre: { x: bog.x, z: bog.z },
      radius: 1.6,
      speed: 1.1,
      height: 0.9,
      bob: 0.2,
    },
  ],
  blockers: [
    { x: bog.x - 1.5, z: bog.z, radius: 1.2 },
    { x: bog.x, z: bog.z - 0.2, radius: 1.5 },
    { x: bog.x + 1.5, z: bog.z, radius: 1.2 },
    { x: -2.6, z: 1.1, radius: 0.15 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Tickle a flytrap",
    news: "You touched a trigger hair once… then twice. SNAP! The trap shut so fast it made you jump!",
  },
};
