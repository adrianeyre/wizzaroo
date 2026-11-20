import { TorusGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const engineGreen = "#2f5a3a";
const greenLining = "#d9b44a";
const smokeboxBlack = "#25231f";
const wheelRed = "#9e2a22";
const brass = "#d4aa48";
const copper = "#b8693d";
const canopyCream = "#e9dfc6";
const coal = "#1c1b1d";
const tenderTimber = "#6a4529";
const signColour = "#2f5a3a";
const ashPad = "#5b4a42";

/* The engine faces +x; its own coordinates are moved to here. */
const engine = { x: 0.4, z: -0.5 };
const rearAxle = { x: -1.0, y: 0.85, radius: 0.85, out: 0.82 };
const frontAxle = { x: 1.45, y: 0.5, radius: 0.5, out: 0.62 };
const boiler = { from: -0.6, to: 1.5, y: 1.3, radius: 0.48 };
const footplateY = 0.62;
const canopyY = 2.8;
const flywheelAt: Triple = [engine.x + 0.15, 1.95, engine.z + 0.66];
const governorAt: Triple = [engine.x + 0.95, 2.05, engine.z + 0.22];
const whistleAt: Triple = [engine.x - 0.85, 2.18, engine.z];

/** A point in the engine's own coordinates, moved to where it stands. */
const onEngine = (x: number, y: number, z: number): Triple => [
  engine.x + x,
  y,
  engine.z + z,
];

/** A wheel with a tyre, strakes for grip on muddy fields, spokes and a hub. */
const addWheel = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  width: number,
  spokes: number,
) => {
  if (builder.isFar) {
    builder.cylinder("paint", wheelRed, {
      radius,
      length: width,
      at,
      axis: "z",
      segments: 16,
    });
    return;
  }
  builder.cylinder("metal", palette.darkSteel, {
    radius,
    length: width,
    at,
    axis: "z",
    segments: 24,
    isOpen: true,
  });
  builder.cylinder("paint", wheelRed, {
    radius: radius * 0.24,
    length: width + 0.06,
    at,
    axis: "z",
    segments: 14,
  });
  builder.add(
    "paint",
    wheelRed,
    new TorusGeometry(radius * 0.93, 0.045, 4, 24),
    { at },
  );
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = (spoke / spokes) * Math.PI * 2;
    builder.bar(
      "paint",
      wheelRed,
      at,
      [
        at[0] + Math.cos(angle) * radius * 0.92,
        at[1] + Math.sin(angle) * radius * 0.92,
        at[2],
      ],
      0.06,
      5,
    );
  }
  const strakes = Math.round(radius * 18);
  for (let strake = 0; strake < strakes; strake++) {
    const angle = (strake / strakes) * Math.PI * 2;
    builder.box(
      "metal",
      shade(palette.darkSteel, 0.8),
      [0.05, 0.035, width * 1.05],
      [
        at[0] + Math.cos(angle) * (radius + 0.01),
        at[1] + Math.sin(angle) * (radius + 0.01),
        at[2],
      ],
      [0.35, 0, angle],
    );
  }
};

/** The boiler, smokebox, firebox and chimney. */
const buildBody = (builder: AttractionBuilder) => {
  const length = boiler.to - boiler.from;
  builder.cylinder("paint", engineGreen, {
    radius: boiler.radius,
    length,
    at: onEngine((boiler.from + boiler.to) / 2, boiler.y, 0),
    axis: "x",
    segments: 24,
  });
  builder.cylinder("paint", smokeboxBlack, {
    radius: boiler.radius + 0.04,
    length: 0.32,
    at: onEngine(boiler.to + 0.15, boiler.y, 0),
    axis: "x",
    segments: 24,
  });
  builder.box(
    "paint",
    engineGreen,
    [0.7, 1.25, 1.0],
    onEngine(-0.9, footplateY + 0.62, 0),
  );
  builder.cylinder("paint", smokeboxBlack, {
    radius: 0.13,
    radiusEnd: 0.16,
    length: 1.25,
    at: onEngine(1.65, boiler.y + 1.0, 0),
    segments: 16,
  });
  builder.cylinder("metal", copper, {
    radius: 0.22,
    radiusEnd: 0.17,
    length: 0.14,
    at: onEngine(1.65, boiler.y + 1.68, 0),
    segments: 16,
  });
  /* The frame and footplate under it all */
  builder.box(
    "paint",
    smokeboxBlack,
    [3.0, 0.14, 0.7],
    onEngine(0.25, 0.68, 0),
  );
  builder.box(
    "matte",
    tenderTimber,
    [0.5, 0.08, 1.3],
    onEngine(-1.45, footplateY, 0),
  );
  if (builder.isFar) {
    return;
  }
  /* Brass bands and green lining round the boiler */
  [-0.45, 0.2, 0.85, 1.42].forEach((x) => {
    builder.add(
      "metal",
      brass,
      new TorusGeometry(boiler.radius + 0.01, 0.022, 4, 24),
      {
        at: onEngine(x, boiler.y, 0),
        rotation: [0, Math.PI / 2, 0],
      },
    );
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      greenLining,
      [0.02, 1.0, 0.75],
      onEngine(-0.9 + side * 0.36, footplateY + 0.65, 0),
    );
  });
  builder.box(
    "paint",
    greenLining,
    [0.6, 0.02, 1.01],
    onEngine(-0.9, footplateY + 1.2, 0),
  );
  /* The smokebox door, with its dart handles and hinge straps */
  const door = onEngine(boiler.to + 0.32, boiler.y, 0);
  builder.cylinder("paint", shade(smokeboxBlack, 1.3), {
    radius: boiler.radius - 0.04,
    radiusEnd: boiler.radius - 0.12,
    length: 0.08,
    at: door,
    axis: "x",
    segments: 24,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.05,
    length: 0.1,
    at: [door[0] + 0.06, door[1], door[2]],
    axis: "x",
    segments: 8,
  });
  builder.box(
    "metal",
    palette.steel,
    [0.03, 0.03, 0.3],
    [door[0] + 0.1, door[1], door[2]],
  );
  [-0.2, 0.2].forEach((dy) => {
    builder.box(
      "metal",
      palette.steel,
      [0.02, 0.04, 0.6],
      [door[0] + 0.04, door[1] + dy, door[2]],
    );
  });
  /* A brass number plate, and lamps */
  builder.box(
    "metal",
    brass,
    [0.02, 0.14, 0.32],
    onEngine(boiler.to + 0.32, boiler.y + 0.55, 0),
  );
  [-0.32, 0.32].forEach((dz) => {
    builder.box(
      "paint",
      smokeboxBlack,
      [0.14, 0.18, 0.14],
      onEngine(1.95, 0.88, dz),
    );
    builder.box(
      "glow",
      palette.warmLight,
      [0.02, 0.1, 0.1],
      onEngine(2.03, 0.88, dz),
    );
  });
  /* The steam dome, safety valves and whistle on the boiler and firebox */
  builder.lathe(
    "metal",
    brass,
    [
      [0.22, 0],
      [0.21, 0.12],
      [0.16, 0.26],
      [0.08, 0.32],
      [0, 0.34],
    ],
    onEngine(0.3, boiler.y + 0.42, 0),
    "y",
    18,
  );
  [-0.1, 0.1].forEach((dz) => {
    builder.cylinder("metal", brass, {
      radius: 0.05,
      radiusEnd: 0.035,
      length: 0.22,
      at: onEngine(-0.7, footplateY + 1.36, dz),
      segments: 10,
    });
  });
  builder.cylinder("metal", brass, {
    radius: 0.04,
    length: 0.18,
    at: [whistleAt[0], whistleAt[1] - 0.24, whistleAt[2]],
    segments: 8,
  });
  builder.cylinder("metal", brass, {
    radius: 0.07,
    length: 0.2,
    at: [whistleAt[0], whistleAt[1] - 0.06, whistleAt[2]],
    segments: 12,
  });
  builder.sphere(
    "metal",
    brass,
    0.07,
    [whistleAt[0], whistleAt[1] + 0.04, whistleAt[2]],
    [1, 0.6, 1],
    10,
  );
  /* The cylinder and slide bars on top, driving the crank and flywheel */
  builder.roundedBox(
    "paint",
    engineGreen,
    [0.55, 0.3, 0.36],
    0.06,
    onEngine(1.05, boiler.y + 0.6, 0.15),
  );
  builder.cylinder("metal", palette.steel, {
    radius: 0.03,
    length: 0.85,
    at: onEngine(0.45, boiler.y + 0.6, 0.15),
    axis: "x",
    segments: 8,
  });
  [-0.06, 0.06].forEach((dy) => {
    builder.box(
      "metal",
      palette.steel,
      [0.7, 0.025, 0.04],
      onEngine(0.45, boiler.y + 0.6 + dy, 0.3),
    );
  });
  builder.box(
    "paint",
    smokeboxBlack,
    [0.25, 0.55, 0.12],
    onEngine(0.15, boiler.y + 0.35, 0.52),
  );
  /* Copper pipes and a pressure gauge on the firebox back */
  builder.bar(
    "metal",
    copper,
    onEngine(-0.4, boiler.y + 0.45, 0.3),
    onEngine(0.95, boiler.y + 0.45, 0.3),
    0.05,
    8,
  );
  builder.cylinder("metal", brass, {
    radius: 0.1,
    length: 0.05,
    at: onEngine(-1.27, footplateY + 1.0, 0.25),
    axis: "x",
    segments: 14,
  });
  builder.cylinder("paint", palette.cream, {
    radius: 0.08,
    length: 0.02,
    at: onEngine(-1.3, footplateY + 1.0, 0.25),
    axis: "x",
    segments: 14,
  });
  /* The fire door, glowing round its edges */
  builder.box(
    "glow",
    "#ff8a2a",
    [0.02, 0.34, 0.44],
    onEngine(-1.26, footplateY + 0.42, -0.1),
  );
  builder.box(
    "paint",
    smokeboxBlack,
    [0.03, 0.28, 0.38],
    onEngine(-1.28, footplateY + 0.42, -0.1),
  );
  /* The steering wheel on the footplate */
  builder.bar(
    "metal",
    palette.darkSteel,
    onEngine(-1.35, footplateY, 0.45),
    onEngine(-1.35, footplateY + 0.95, 0.45),
    0.05,
    6,
  );
  builder.add(
    "metal",
    palette.darkSteel,
    new TorusGeometry(0.2, 0.025, 4, 16),
    {
      at: onEngine(-1.35, footplateY + 0.95, 0.45),
      rotation: [Math.PI / 2, 0, 0],
    },
  );
};

/** The four wheels, with their axles. */
const buildWheels = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    addWheel(
      builder,
      onEngine(rearAxle.x, rearAxle.y, side * rearAxle.out),
      rearAxle.radius,
      0.32,
      10,
    );
    addWheel(
      builder,
      onEngine(frontAxle.x, frontAxle.y, side * frontAxle.out),
      frontAxle.radius,
      0.22,
      8,
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.07,
    length: rearAxle.out * 2,
    at: onEngine(rearAxle.x, rearAxle.y, 0),
    axis: "z",
    segments: 10,
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: frontAxle.out * 2,
    at: onEngine(frontAxle.x, frontAxle.y, 0),
    axis: "z",
    segments: 10,
  });
};

/** The canopy roof on its twisted posts. */
const buildCanopy = (builder: AttractionBuilder) => {
  builder.box(
    "paint",
    canopyCream,
    [3.15, 0.08, 1.5],
    onEngine(-0.22, canopyY, 0),
  );
  [-1.65, 1.2].forEach((x) => {
    [-0.62, 0.62].forEach((z) => {
      builder.cylinder("metal", brass, {
        radius: 0.035,
        length: canopyY - footplateY,
        at: onEngine(x, (canopyY + footplateY) / 2, z),
        segments: 8,
      });
    });
  });
  if (builder.isFar) {
    return;
  }
  /* A scalloped valance round the edge */
  builder.box(
    "paint",
    engineGreen,
    [3.2, 0.14, 0.04],
    onEngine(-0.22, canopyY - 0.08, 0.76),
  );
  builder.box(
    "paint",
    engineGreen,
    [3.2, 0.14, 0.04],
    onEngine(-0.22, canopyY - 0.08, -0.76),
  );
  for (let scallop = 0; scallop < 12; scallop++) {
    const x = -1.7 + scallop * 0.27;
    [-0.77, 0.77].forEach((z) => {
      builder.cylinder("paint", greenLining, {
        radius: 0.07,
        length: 0.03,
        at: onEngine(x, canopyY - 0.17, z),
        axis: "z",
        segments: 8,
      });
    });
  }
};

/** The coal tender behind, heaped with coal, and a shovel. */
const buildTender = (builder: AttractionBuilder) => {
  const at = onEngine(-2.15, 0, 0);
  builder.box("matte", tenderTimber, [0.85, 0.65, 1.2], [at[0], 0.75, at[2]]);
  builder.sphere(
    "matte",
    coal,
    0.5,
    [at[0], 1.08, at[2]],
    [0.8, 0.35, 1.1],
    10,
  );
  if (builder.isFar) {
    return;
  }
  [-0.6, 0.6].forEach((dz) => {
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.3,
      length: 0.1,
      at: [at[0], 0.3, at[2] + dz],
      axis: "z",
      segments: 14,
    });
  });
  [0.5, 0.95].forEach((y) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.88, 0.04, 1.23],
      [at[0], y, at[2]],
    );
  });
  [
    [-0.15, 1.25, 0.2],
    [0.2, 1.2, -0.3],
    [0.05, 1.3, -0.05],
    [0.6, 0.06, 0.8],
    [0.85, 0.05, 0.6],
  ].forEach(([dx, y, dz]) => {
    builder.box(
      "matte",
      coal,
      [0.12, 0.1, 0.11],
      [at[0] + dx, y, at[2] + dz],
      [dx, dz, 0.3],
    );
  });
  /* A coal shovel stuck in the heap */
  builder.bar(
    "matte",
    tenderTimber,
    [at[0] + 0.1, 1.2, at[2] + 0.1],
    [at[0] + 0.25, 1.9, at[2] + 0.2],
    0.04,
    5,
  );
  builder.box(
    "metal",
    palette.steel,
    [0.2, 0.02, 0.24],
    [at[0] + 0.07, 1.12, at[2] + 0.08],
    [0.2, 0, -0.3],
  );
  /* A water butt and an oil can by the engine */
  builder.cylinder("matte", tenderTimber, {
    radius: 0.25,
    radiusEnd: 0.22,
    length: 0.6,
    at: [2.6, 0.3, -1.5],
    segments: 14,
  });
  [0.12, 0.48].forEach((y) => {
    builder.add(
      "metal",
      palette.darkSteel,
      new TorusGeometry(0.25, 0.015, 3, 14),
      {
        at: [2.6, y, -1.5],
        rotation: [Math.PI / 2, 0, 0],
      },
    );
  });
};

/** The flywheel: a heavy rim on six spokes, turned by the crank. */
const buildFlywheel = (builder: AttractionBuilder) => {
  builder.add(
    "metal",
    palette.darkSteel,
    new TorusGeometry(0.56, 0.07, 6, 28),
    {},
  );
  builder.add("paint", wheelRed, new TorusGeometry(0.5, 0.03, 4, 28), {
    at: [0, 0, 0.03],
  });
  for (let spoke = 0; spoke < 6; spoke++) {
    const angle = (spoke / 6) * Math.PI * 2;
    builder.bar(
      "paint",
      wheelRed,
      [0, 0, 0],
      [Math.cos(angle) * 0.52, Math.sin(angle) * 0.52, 0],
      0.06,
      6,
    );
  }
  builder.cylinder("metal", brass, {
    radius: 0.1,
    length: 0.14,
    at: [0, 0, 0],
    axis: "z",
    segments: 14,
  });
  /* The crank pin and a red counterweight, so you can see it turn */
  builder.box("paint", wheelRed, [0.3, 0.18, 0.06], [0, -0.32, 0], [0, 0, 0]);
};

/** The governor: two brass balls whirling round to keep the speed steady. */
const buildGovernor = (builder: AttractionBuilder) => {
  builder.cylinder("metal", brass, {
    radius: 0.025,
    length: 0.4,
    at: [0, 0.2, 0],
    segments: 8,
  });
  [-1, 1].forEach((side) => {
    builder.bar("metal", brass, [0, 0.38, 0], [side * 0.16, 0.18, 0], 0.02, 5);
    builder.sphere("metal", brass, 0.06, [side * 0.16, 0.18, 0], [1, 1, 1], 10);
  });
  builder.sphere("metal", brass, 0.04, [0, 0.42, 0], [1, 1, 1], 8);
};

/** A puff of steam from the whistle, when someone comes close. */
const buildWhistlePuff = (builder: AttractionBuilder) => {
  [
    [0, 0.12, 0, 0.14],
    [0.08, 0.3, 0.03, 0.17],
    [-0.06, 0.48, -0.02, 0.2],
  ].forEach(([x, y, z, radius]) => {
    builder.sphere("matte", "#f2f0ec", radius, [x, y, z], [1, 0.85, 1], 10);
  });
};

/* The ride: up onto the footplate, a moment at the controls, and off. */
const rideStart = { x: -1.6, z: 1.3 };
const rideFinish = { x: 0.9, z: 1.35 };
const footplateSpot: Triple = [
  engine.x - 1.45,
  footplateY + 0.04,
  engine.z + 0.05,
];

const followFootplate = (progress: number, seconds: number): LocalSpot => {
  const step = (
    share: number,
    from: Triple,
    to: Triple,
    lift: number,
  ): Triple => {
    const ease = share * share * (3 - 2 * share);
    return [
      from[0] + (to[0] - from[0]) * ease,
      from[1] + (to[1] - from[1]) * ease + Math.sin(share * Math.PI) * lift,
      from[2] + (to[2] - from[2]) * ease,
    ];
  };
  const start: Triple = [rideStart.x, 0, rideStart.z];
  const finish: Triple = [rideFinish.x, 0, rideFinish.z];
  if (progress < 0.2) {
    const [x, y, z] = step(progress / 0.2, start, footplateSpot, 0.9);
    return { x, y, z, heading: Math.PI };
  }
  if (progress < 0.8) {
    /* The engine chuffs and shakes under your feet */
    const shake = 0.02 * Math.sin(seconds * 18);
    return {
      x: footplateSpot[0] + shake,
      y: footplateSpot[1] + Math.abs(shake),
      z: footplateSpot[2],
      heading: Math.PI / 2,
    };
  }
  const [x, y, z] = step((progress - 0.8) / 0.2, footplateSpot, finish, 0.9);
  return { x, y, z, heading: 0.6 };
};

export const steamEngineModel: CuriosityModel = {
  kind: "steam-engine",
  islandId: "ember-isle",
  name: "Steam Engine",
  fact: "Steam engines changed Britain in the Industrial Revolution. Burning coal boils water into steam, and the steam pushes a piston that turns the big flywheel. Victorian traction engines like this one pulled ploughs, threshed corn and hauled heavy loads along the roads, doing the work of many horses.",
  curriculumLink:
    "History, Key Stage 2: a significant turning point in British history, such as the Industrial Revolution and the coming of steam power.",
  footprint: 4.5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: -0.4, z: 3.4 },
  build: (builder) => {
    buildBody(builder);
    buildWheels(builder);
    buildCanopy(builder);
    buildTender(builder);
    if (builder.isFar) {
      builder.cylinder("paint", wheelRed, {
        radius: 0.6,
        length: 0.08,
        at: flywheelAt,
        axis: "z",
        segments: 12,
      });
    }
    addSignBoard(builder, [-0.4, 0, 3.4], signColour);
  },
  moving: [
    {
      name: "flywheel",
      pivot: flywheelAt,
      build: buildFlywheel,
      motion: { kind: "whirl", axis: "z", idle: -0.8, speed: -5, reach: 8 },
    },
    {
      name: "governor",
      pivot: governorAt,
      build: buildGovernor,
      motion: { kind: "whirl", axis: "y", idle: 1.2, speed: 7, reach: 8 },
    },
    {
      name: "whistle steam",
      pivot: [whistleAt[0], whistleAt[1] + 0.1, whistleAt[2]],
      build: buildWhistlePuff,
      motion: { kind: "wake", reach: 5 },
    },
  ],
  smoke: [
    {
      at: [engine.x + 1.65, boiler.y + 1.8, engine.z],
      colour: "#bdb7ad",
      puffs: 6,
      size: 0.2,
      rise: 2.0,
      spread: 0.35,
    },
  ],
  rides: [
    {
      id: "footplate",
      name: "the footplate",
      start: rideStart,
      reach: 0.6,
      seconds: 9,
      finish: rideFinish,
      follow: followFootplate,
    },
  ],
  blockers: [
    { x: engine.x + rearAxle.x, z: engine.z, radius: 1.15 },
    { x: engine.x + 0.3, z: engine.z, radius: 0.85 },
    { x: engine.x + 1.5, z: engine.z, radius: 0.9 },
    { x: engine.x - 2.15, z: engine.z, radius: 0.75 },
    { x: 2.6, z: -1.5, radius: 0.35 },
  ] satisfies LocalBlocker[],
  tune: [79, 79, 76, 79, 84],
  play: {
    label: "Blow the whistle",
    news: "Toot-toooot! The whistle shrieked, steam puffed from the chimney and the flywheel spun faster and faster.",
    tune: [84, 84, 79, 84, 88],
  },
};
