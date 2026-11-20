import { CylinderGeometry } from "three";
import {
  addFence,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const turbineWhite = "#f2f4f8";
const turbineShadow = "#d5dae3";
const tipRed = "#d8453a";
const baseConcrete = "#9a9cad";
const transformerGrey = "#7b8496";
const insulatorBrown = "#8a4a2a";
const kioskBlue = "#2f3f78";
const meterFrame = "#1f2440";
const woolWhite = "#f1eee6";
const sheepFace = "#2e2a2b";
const signColour = "#2c3f86";

interface Turbine {
  x: number;
  z: number;
  height: number;
  blade: number;
}

/* Three turbines of different sizes stand along the back. */
const turbines: readonly Turbine[] = [
  { x: -2.6, z: -2.0, height: 7.2, blade: 2.35 },
  { x: 0.6, z: -3.0, height: 8.4, blade: 2.6 },
  { x: 3.0, z: -0.9, height: 6.6, blade: 2.15 },
];

const hubAt = ({ x, z, height }: Turbine): Triple => [
  x,
  height + 0.36,
  z + 0.6,
];
const substation = { x: -1.7, z: 0.8, width: 2.0, depth: 1.6 };
const meterAt = { x: 1.7, z: 2.4 };
const meterBase: Triple = [meterAt.x - 0.42, 0.62, meterAt.z + 0.06];

const buildTower = (builder: AttractionBuilder, turbine: Turbine) => {
  const { x, z, height } = turbine;
  builder.cylinder("paint", turbineWhite, {
    radius: 0.32,
    radiusEnd: 0.16,
    length: height,
    at: [x, height / 2, z],
    segments: builder.isFar ? 12 : 24,
  });
  /* The nacelle, which holds the gearbox and generator */
  if (builder.isFar) {
    builder.box(
      "paint",
      turbineWhite,
      [0.6, 0.6, 1.6],
      [x, height + 0.36, z - 0.1],
    );
    return;
  }
  builder.roundedBox("paint", turbineWhite, [0.62, 0.66, 1.6], 0.2, [
    x,
    height + 0.36,
    z - 0.1,
  ]);
  builder.box(
    "paint",
    turbineShadow,
    [0.5, 0.04, 1.2],
    [x, height + 0.7, z - 0.2],
  );
  builder.cylinder("paint", turbineShadow, {
    radius: 0.22,
    length: 0.16,
    at: [x, height + 0.04, z],
    segments: 16,
  });
  /* A wind vane and an anemometer on the nacelle's roof */
  builder.bar(
    "metal",
    palette.darkSteel,
    [x, height + 0.7, z - 0.7],
    [x, height + 1.0, z - 0.7],
    0.03,
    4,
  );
  builder.box("paint", tipRed, [0.03, 0.12, 0.22], [x, height + 1.0, z - 0.8]);
  builder.sphere(
    "glow",
    "#ff5a4a",
    0.05,
    [x + 0.18, height + 0.76, z - 0.5],
    [1, 1, 1],
    6,
  );
  /* The concrete foundation, a flange and a door at the foot */
  builder.cylinder("matte", baseConcrete, {
    radius: 0.62,
    radiusEnd: 0.55,
    length: 0.2,
    at: [x, 0.1, z],
    segments: 20,
  });
  builder.torus(
    "metal",
    turbineShadow,
    0.31,
    0.03,
    [x, height * 0.45, z],
    "y",
    18,
  );
  builder.box("paint", turbineShadow, [0.26, 0.56, 0.04], [x, 0.52, z + 0.31]);
  builder.box(
    "metal",
    palette.darkSteel,
    [0.36, 0.04, 0.24],
    [x, 0.22, z + 0.42],
  );
  builder.box("paint", tipRed, [0.12, 0.08, 0.01], [x, 0.9, z + 0.315]);
};

/** One blade, pointing along +y from the hub, twisted a little. */
const bladeGeometry = (length: number, angle: number, segments: number) =>
  new CylinderGeometry(0.03, 0.17, length, segments)
    .scale(1, 1, 0.32)
    .rotateY(0.3)
    .translate(0, 0.2 + length / 2, 0)
    .rotateZ(angle);

const buildRotor = (builder: AttractionBuilder, blade: number) => {
  builder.lathe(
    "paint",
    turbineWhite,
    [
      [0, -0.3],
      [0.28, -0.28],
      [0.3, -0.05],
      [0.22, 0.2],
      [0.1, 0.36],
      [0, 0.4],
    ],
    [0, 0, 0],
    "z",
    16,
  );
  for (let index = 0; index < 3; index++) {
    const angle = (index / 3) * Math.PI * 2;
    builder.add(
      "paint",
      turbineWhite,
      bladeGeometry(blade, angle, 10),
      {},
      1.2,
    );
    /* Red tips so aircraft can see them */
    builder.add(
      "paint",
      tipRed,
      new CylinderGeometry(0.022, 0.05, 0.36, 10)
        .scale(1.05, 1, 0.36)
        .rotateY(0.3)
        .translate(0, 0.2 + blade - 0.2, 0)
        .rotateZ(angle),
      {},
      1.2,
    );
    /* A root collar where each blade bolts on */
    builder.add(
      "metal",
      turbineShadow,
      new CylinderGeometry(0.1, 0.1, 0.12, 10)
        .translate(0, 0.28, 0)
        .rotateZ(angle),
    );
  }
};

const buildSubstation = (builder: AttractionBuilder) => {
  const { x, z, width, depth } = substation;
  builder.box("matte", baseConcrete, [width, 0.12, depth], [x, 0.06, z]);
  /* The transformer: it steps the voltage up to send power a long way */
  builder.box("paint", transformerGrey, [0.9, 0.9, 0.6], [x, 0.57, z - 0.1]);
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    shade(transformerGrey, 0.85),
    [0.96, 0.08, 0.66],
    [x, 1.05, z - 0.1],
  );
  for (let fin = 0; fin < 7; fin++) {
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        shade(transformerGrey, 1.1),
        [0.03, 0.66, 0.16],
        [x - 0.36 + fin * 0.12, 0.55, z - 0.1 + side * 0.38],
      );
    });
  }
  /* Insulators on top, stacked discs, with wires */
  [-0.28, 0, 0.28].forEach((dx) => {
    for (let disc = 0; disc < 4; disc++) {
      builder.cylinder("paint", insulatorBrown, {
        radius: disc % 2 === 0 ? 0.07 : 0.05,
        length: 0.05,
        at: [x + dx, 1.12 + disc * 0.06, z - 0.1],
        segments: 10,
      });
    }
    builder.sphere(
      "metal",
      palette.steel,
      0.03,
      [x + dx, 1.38, z - 0.1],
      [1, 1, 1],
      5,
    );
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + dx, 1.38, z - 0.1],
      [x + dx * 0.4, 1.6, z - 0.6],
      0.012,
      3,
    );
  });
  /* A gantry the wires lead up to */
  [-0.5, 0.5].forEach((dx) => {
    builder.bar(
      "metal",
      palette.steel,
      [x + dx, 0.12, z - 0.6],
      [x + dx, 1.7, z - 0.6],
      0.05,
      4,
    );
  });
  builder.bar(
    "metal",
    palette.steel,
    [x - 0.55, 1.62, z - 0.6],
    [x + 0.55, 1.62, z - 0.6],
    0.05,
    4,
  );
  /* A fence with a gate, and a danger sign */
  const minX = x - width / 2 + 0.05;
  const maxX = x + width / 2 - 0.05;
  const minZ = z - depth / 2 + 0.05;
  const maxZ = z + depth / 2 - 0.05;
  const fenceRuns: [LocalPoint, LocalPoint][] = [
    [
      { x: minX, z: minZ },
      { x: maxX, z: minZ },
    ],
    [
      { x: minX, z: minZ },
      { x: minX, z: maxZ },
    ],
    [
      { x: maxX, z: minZ },
      { x: maxX, z: maxZ },
    ],
    [
      { x: minX, z: maxZ },
      { x: x - 0.3, z: maxZ },
    ],
    [
      { x: x + 0.3, z: maxZ },
      { x: maxX, z: maxZ },
    ],
  ];
  fenceRuns.forEach(([from, to]) => {
    addFence(builder, from, to, {
      colour: palette.steel,
      height: 0.8,
      isPicket: false,
      spacing: 0.15,
      finish: "metal",
    });
  });
  builder.box(
    "paint",
    "#f2c230",
    [0.3, 0.26, 0.02],
    [x + 0.6, 0.55, maxZ + 0.03],
  );
  builder.box(
    "paint",
    palette.black,
    [0.04, 0.16, 0.025],
    [x + 0.6, 0.55, maxZ + 0.035],
    [0, 0, 0.4],
  );
};

const buildCables = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* Buried cables, shown by marker strips and posts, run to the substation */
  turbines.forEach(({ x, z }) => {
    const from: Triple = [x, 0.025, z + 0.5];
    const to: Triple = [
      substation.x,
      0.025,
      substation.z - substation.depth / 2,
    ];
    const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
    const turn = Math.atan2(to[0] - from[0], to[2] - from[2]);
    builder.box(
      "matte",
      shade(palette.soil, 1.1),
      [0.14, 0.03, length],
      [(from[0] + to[0]) / 2, 0.015, (from[2] + to[2]) / 2],
      [0, turn, 0],
    );
    builder.box(
      "paint",
      "#f2c230",
      [0.06, 0.3, 0.06],
      [(from[0] + to[0]) / 2 + 0.12, 0.15, (from[2] + to[2]) / 2],
    );
  });
};

/** A control kiosk and a power meter board for visitors. */
const buildKioskAndMeter = (builder: AttractionBuilder) => {
  const kiosk = { x: 3.4, z: 1.7 };
  builder.box("paint", kioskBlue, [0.9, 1.4, 0.8], [kiosk.x, 0.7, kiosk.z]);
  builder.box(
    "paint",
    shade(kioskBlue, 0.75),
    [1.0, 0.1, 0.9],
    [kiosk.x, 1.45, kiosk.z],
  );
  builder.box(
    "paint",
    meterFrame,
    [1.1, 0.8, 0.08],
    [meterAt.x, 1.0, meterAt.z],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    turbineShadow,
    [0.5, 1.0, 0.03],
    [kiosk.x - 0.1, 0.55, kiosk.z + 0.41],
  );
  builder.box(
    "metal",
    palette.steel,
    [0.06, 0.06, 0.04],
    [kiosk.x + 0.08, 0.6, kiosk.z + 0.43],
  );
  builder.box(
    "glass",
    palette.glass,
    [0.03, 0.4, 0.5],
    [kiosk.x - 0.46, 0.95, kiosk.z],
  );
  builder.sphere(
    "glow",
    "#7fe0a0",
    0.04,
    [kiosk.x + 0.3, 1.25, kiosk.z + 0.41],
    [1, 1, 0.5],
    6,
  );
  /* The meter's legs, its scale and a little lightning bolt badge */
  [-0.5, 0.5].forEach((dx) => {
    builder.box(
      "metal",
      palette.steel,
      [0.06, 1.4, 0.06],
      [meterAt.x + dx, 0.7, meterAt.z - 0.06],
    );
  });
  builder.box(
    "paint",
    shade(meterFrame, 1.6),
    [0.96, 0.66, 0.02],
    [meterAt.x, 1.0, meterAt.z + 0.045],
  );
  for (let step = 0; step < 5; step++) {
    builder.box(
      "paint",
      turbineShadow,
      [0.12, 0.012, 0.01],
      [meterAt.x - 0.33 + step * 0.17, 0.58, meterAt.z + 0.06],
    );
  }
  builder.box(
    "paint",
    "#f2c230",
    [0.06, 0.14, 0.02],
    [meterAt.x + 0.46, 1.45, meterAt.z],
    [0, 0, 0.4],
  );
  builder.cylinder("paint", meterFrame, {
    radius: 0.14,
    length: 0.04,
    at: [meterAt.x + 0.46, 1.45, meterAt.z - 0.01],
    axis: "z",
    segments: 12,
  });
  /* A bench to watch the blades go round */
  builder.box("paint", turbineWhite, [1.2, 0.06, 0.36], [-0.1, 0.44, 2.7]);
  builder.box(
    "paint",
    turbineWhite,
    [1.2, 0.3, 0.05],
    [-0.1, 0.65, 2.53],
    [-0.15, 0, 0],
  );
  [-0.5, 0.5].forEach((dx) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.06, 0.44, 0.34],
      [-0.1 + dx, 0.22, 2.7],
    );
  });
};

/** Glowing bars on the meter that climb as someone comes near. */
const buildMeterBars = (builder: AttractionBuilder) => {
  ["#5ee07a", "#9be05e", "#e8d84a", "#f2a23a", "#ef5a3a"].forEach(
    (colour, step) => {
      const height = 0.12 + step * 0.1;
      builder.box(
        "glow",
        colour,
        [0.13, height, 0.02],
        [0.09 + step * 0.17, height / 2, 0],
      );
    },
  );
};

const buildSheep = (builder: AttractionBuilder) => {
  builder.sphere("matte", woolWhite, 0.26, [0, 0.38, 0], [0.9, 0.8, 1.2], 10);
  builder.sphere(
    "matte",
    shade(woolWhite, 1.05),
    0.13,
    [0, 0.52, 0.12],
    [1, 0.8, 1],
    6,
  );
  builder.sphere(
    "matte",
    sheepFace,
    0.12,
    [0, 0.46, 0.33],
    [0.8, 0.95, 1.1],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      sheepFace,
      [0.1, 0.04, 0.05],
      [side * 0.11, 0.5, 0.3],
      [0, 0, side * 0.4],
    );
    builder.sphere(
      "paint",
      palette.white,
      0.018,
      [side * 0.05, 0.5, 0.42],
      [1, 1, 1],
      4,
    );
    [-0.14, 0.14].forEach((dz) => {
      builder.box(
        "matte",
        sheepFace,
        [0.06, 0.24, 0.06],
        [side * 0.11, 0.12, dz],
      );
    });
  });
};

export const windTurbinesModel: CuriosityModel = {
  kind: "wind-turbines",
  islandId: "starfall-isle",
  name: "Wind Turbines",
  fact: "Wind turbines turn the energy of moving air into electricity. The wind pushes the long blades round, and the spinning shaft turns a generator inside the box at the top, called the nacelle. Cables carry the electricity to a transformer and on to homes and schools. Wind is a renewable energy resource, so it will never run out, and windy places are the best spots for turbines.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of human geography, including the distribution of natural resources including energy.",
  footprint: 5.8,
  setting: "inland",
  signSpot: { x: -1.6, z: 3.9 },
  build: (builder) => {
    turbines.forEach((turbine) => {
      buildTower(builder, turbine);
      if (builder.isFar) {
        const hub = hubAt(turbine);
        [0, 1, 2].forEach((index) => {
          const angle = (index / 3) * Math.PI * 2 + 0.4;
          builder.box(
            "paint",
            turbineWhite,
            [0.18, turbine.blade, 0.06],
            [
              hub[0] - Math.sin(angle) * (turbine.blade / 2 + 0.2),
              hub[1] + Math.cos(angle) * (turbine.blade / 2 + 0.2),
              hub[2],
            ],
            [0, 0, angle],
          );
        });
      }
    });
    buildSubstation(builder);
    buildCables(builder);
    buildKioskAndMeter(builder);
    builder.box("matte", palette.gravel, [1.1, 0.03, 2.0], [-0.3, 0.015, 3.6]);
    addSignBoard(builder, [-1.6, 0, 3.9], signColour);
  },
  moving: [
    ...turbines.map((turbine, index): MovingPart => ({
      name: `rotor ${String(index + 1)}`,
      pivot: hubAt(turbine),
      build: (builder: AttractionBuilder) => {
        buildRotor(builder, turbine.blade);
      },
      motion: {
        kind: "whirl",
        axis: "z",
        idle: 0.5 + index * 0.12,
        speed: 3.2 - index * 0.3,
        reach: 9,
        phase: index * 1.3,
      },
    })),
    {
      name: "power meter",
      pivot: meterBase,
      build: buildMeterBars,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "sheep",
      build: buildSheep,
      count: 3,
      centre: { x: 1.2, z: 0.1 },
      radius: 1.0,
      speed: 0.15,
    },
  ],
  blockers: [
    ...turbines.map(({ x, z }) => ({ x, z, radius: 0.65 })),
    { x: substation.x - 0.5, z: substation.z, radius: 0.75 },
    { x: substation.x + 0.5, z: substation.z, radius: 0.75 },
    { x: 3.4, z: 1.7, radius: 0.6 },
    { x: meterAt.x - 0.5, z: meterAt.z, radius: 0.2 },
    { x: meterAt.x + 0.5, z: meterAt.z, radius: 0.2 },
    { x: -0.1, z: 2.7, radius: 0.5 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Make some power",
    news: "Whoosh! The blades spun faster in the wind and the power meter climbed all the way to the top. That's enough to light a whole street!",
  },
};
