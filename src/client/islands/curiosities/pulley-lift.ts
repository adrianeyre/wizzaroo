import { TorusGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const timber = "#7a5134";
const timberDark = "#553722";
const timberPale = "#b08658";
const rope = "#cfb07a";
const iron = "#3a3b3e";
const crateTimber = "#b8894f";
const stencil = "#5a3a22";
const weightGrey = "#56524e";
const signColour = "#6b4a2a";
const ashPad = "#5b4a42";

const gantry = { z: -0.8, legX: 1.75, beamY: 4.2, spread: 0.9 };
const pulleyY = gantry.beamY - 0.35;
const lift = 1.4;
const crate = { x: 0.35, size: 0.8 };
const blockRestY = crate.size + 0.45;
const weight = { x: -1.15, topY: 2.55, height: 0.6 };
const winch: Triple = [2.45, 1.0, gantry.z];
const strands = [-0.09, 0, 0.09];

/** A rope from one point to another. */
const addRope = (
  builder: AttractionBuilder,
  from: Triple,
  to: Triple,
  thickness = 0.035,
) => {
  builder.bar("matte", rope, from, to, thickness, 5);
};

/** A pulley block: wooden cheeks either side of a grooved iron wheel. */
const addBlock = (builder: AttractionBuilder, at: Triple, size: number) => {
  if (builder.isFar) {
    builder.box("matte", timberPale, [size * 0.75, size * 1.4, 0.2], at);
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      timberPale,
      [size * 0.75, size, 0.05],
      [at[0], at[1], at[2] + side * 0.08],
    );
    [-1, 1].forEach((end) => {
      builder.cylinder("matte", timberPale, {
        radius: size * 0.375,
        length: 0.05,
        at: [at[0], at[1] + end * size * 0.5, at[2] + side * 0.08],
        axis: "z",
        segments: 12,
      });
    });
  });
  builder.cylinder("metal", iron, {
    radius: size * 0.32,
    length: 0.11,
    at,
    axis: "z",
    segments: 14,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.03,
    length: 0.22,
    at,
    axis: "z",
    segments: 6,
  });
};

/** The gantry: two A-frame legs, a top beam and their braces. */
const buildGantry = (builder: AttractionBuilder) => {
  const { z, legX, beamY, spread } = gantry;
  [-legX, legX].forEach((x) => {
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        timber,
        [x, 0, z + side * spread],
        [x, beamY, z],
        0.2,
        builder.isFar ? 4 : 8,
      );
    });
    if (!builder.isFar) {
      builder.box("matte", timberDark, [0.14, 0.14, spread * 1.2], [x, 1.4, z]);
      builder.box("metal", iron, [0.26, 0.3, 0.26], [x, beamY - 0.05, z]);
      [-1, 1].forEach((side) => {
        builder.box(
          "matte",
          timberDark,
          [0.3, 0.12, 0.3],
          [x, 0.06, z + side * spread],
        );
      });
    }
  });
  builder.box(
    "matte",
    timber,
    [legX * 2 + 0.6, 0.26, 0.26],
    [0, beamY + 0.1, z],
  );
  if (builder.isFar) {
    return;
  }
  /* Knee braces from legs to beam, and iron straps */
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      timberDark,
      [side * legX, beamY - 0.9, z],
      [side * (legX - 0.8), beamY, z],
      0.12,
      6,
    );
  });
  [-1.2, -0.4, 0.4, 1.2].forEach((x) => {
    builder.box("metal", iron, [0.05, 0.3, 0.3], [x, beamY + 0.1, z]);
  });
  /* A little lantern hung from the beam's end */
  builder.bar(
    "metal",
    iron,
    [-legX - 0.25, beamY - 0.03, z],
    [-legX - 0.25, beamY - 0.35, z],
    0.02,
    4,
  );
  builder.box(
    "metal",
    iron,
    [0.16, 0.04, 0.16],
    [-legX - 0.25, beamY - 0.36, z],
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.12, 0.18, 0.12],
    [-legX - 0.25, beamY - 0.48, z],
  );
  builder.box(
    "metal",
    iron,
    [0.16, 0.04, 0.16],
    [-legX - 0.25, beamY - 0.59, z],
  );
};

/** The upper pulley blocks, and the ropes that never move. */
const buildRigging = (builder: AttractionBuilder) => {
  const z = gantry.z;
  /* Hangers from the beam down to the upper blocks */
  [crate.x, weight.x, gantry.legX - 0.1].forEach((x) => {
    builder.bar(
      "metal",
      iron,
      [x, gantry.beamY, z],
      [x, pulleyY + 0.2, z],
      0.04,
      5,
    );
    addBlock(builder, [x, pulleyY, z], 0.42);
  });
  if (builder.isFar) {
    addRope(builder, [crate.x, pulleyY, z], [crate.x, blockRestY, z], 0.08);
    return;
  }
  /* The tackle's top strands, down as far as the lower block ever rises */
  strands.forEach((offset) => {
    addRope(
      builder,
      [crate.x + offset, pulleyY, z],
      [crate.x + offset, pulleyY - lift, z],
    );
  });
  addRope(builder, [weight.x, pulleyY, z], [weight.x, pulleyY - lift, z]);
  /* The hauling rope: from the winch up to its pulley, along the beam */
  addRope(
    builder,
    [winch[0] - 0.05, winch[1] + 0.18, z],
    [gantry.legX - 0.1 + 0.14, pulleyY, z],
  );
  addRope(
    builder,
    [gantry.legX - 0.1, pulleyY + 0.14, z + 0.02],
    [crate.x + 0.12, pulleyY + 0.14, z + 0.02],
  );
  addRope(
    builder,
    [crate.x - 0.12, pulleyY + 0.14, z - 0.02],
    [weight.x + 0.12, pulleyY + 0.14, z - 0.02],
  );
};

/** The winch's frame and drum, beside the right-hand leg. */
const buildWinchFrame = (builder: AttractionBuilder) => {
  const [x, y, z] = winch;
  [-0.35, 0.35].forEach((dz) => {
    builder.box(
      "matte",
      timberDark,
      [0.14, y + 0.25, 0.14],
      [x, (y + 0.25) / 2, z + dz],
    );
  });
  builder.box("matte", timberDark, [0.7, 0.14, 0.9], [x, 0.07, z]);
  builder.cylinder("matte", timberPale, {
    radius: 0.17,
    length: 0.5,
    at: [x, y, z],
    axis: "z",
    segments: 14,
  });
  if (builder.isFar) {
    return;
  }
  for (let turn = 0; turn < 4; turn++) {
    builder.add("matte", rope, new TorusGeometry(0.18, 0.025, 4, 14), {
      at: [x, y, z - 0.15 + turn * 0.1],
    });
  }
  /* A ratchet pawl so the load can't run back */
  builder.box(
    "metal",
    iron,
    [0.05, 0.3, 0.04],
    [x - 0.15, y + 0.25, z - 0.4],
    [0, 0, 0.5],
  );
};

/** The big winch wheel, with handles round its rim for turning. */
const buildWinchWheel = (builder: AttractionBuilder) => {
  builder.add("matte", timber, new TorusGeometry(0.62, 0.05, 6, 28), {});
  for (let spoke = 0; spoke < 8; spoke++) {
    const angle = (spoke / 8) * Math.PI * 2;
    const rim: Triple = [Math.cos(angle) * 0.62, Math.sin(angle) * 0.62, 0];
    builder.bar("matte", timberDark, [0, 0, 0], rim, 0.05, 5);
    builder.bar(
      "matte",
      timberPale,
      rim,
      [rim[0] * 1.2, rim[1] * 1.2, 0],
      0.05,
      5,
    );
    builder.sphere(
      "matte",
      timberPale,
      0.04,
      [rim[0] * 1.21, rim[1] * 1.21, 0],
      [1, 1, 1],
      6,
    );
  }
  builder.cylinder("metal", iron, {
    radius: 0.1,
    length: 0.14,
    at: [0, 0, 0],
    axis: "z",
    segments: 12,
  });
};

/** The crate, its lower block, hook and the ropes that rise with it. */
const buildCrate = (builder: AttractionBuilder) => {
  const half = crate.size / 2;
  builder.box(
    "matte",
    crateTimber,
    [crate.size, crate.size, crate.size],
    [0, -blockRestY + half, 0],
  );
  /* Planks and battens on the crate's faces */
  [-1, 1].forEach((side) => {
    [-0.25, 0.25].forEach((y) => {
      builder.box(
        "matte",
        shade(crateTimber, 0.82),
        [crate.size + 0.02, 0.06, 0.04],
        [0, -blockRestY + half + y, side * (half + 0.01)],
      );
    });
    builder.box(
      "matte",
      shade(crateTimber, 0.82),
      [crate.size + 0.02, 0.06, 0.04],
      [0, -blockRestY + half, side * (half + 0.01)],
      [0, 0, 0.78],
    );
  });
  builder.box(
    "paint",
    stencil,
    [0.03, 0.18, 0.3],
    [half + 0.012, -blockRestY + half, 0],
  );
  /* Rope sling round the crate up to the hook */
  [-1, 1].forEach((side) => {
    addRope(
      builder,
      [side * (half - 0.05), -blockRestY + crate.size, side * 0.25],
      [0, -0.42, 0],
      0.03,
    );
    addRope(
      builder,
      [side * (half - 0.05), -blockRestY + crate.size, -side * 0.25],
      [0, -0.42, 0],
      0.03,
    );
  });
  builder.add(
    "metal",
    iron,
    new TorusGeometry(0.08, 0.025, 4, 12, Math.PI * 1.4),
    {
      at: [0, -0.35, 0],
      rotation: [0, 0, Math.PI * 0.8],
    },
  );
  builder.bar("metal", iron, [0, -0.27, 0], [0, -0.15, 0], 0.04, 5);
  addBlock(builder, [0, 0, 0], 0.36);
  /* The tackle's lower strands, long enough to meet the still ones */
  const length = pulleyY - blockRestY - lift;
  strands.forEach((offset) => {
    addRope(builder, [offset, 0.12, 0], [offset, length + 0.02, 0]);
  });
};

/** The counterweight: a stone in an iron cage that sinks as the crate rises. */
const buildWeight = (builder: AttractionBuilder) => {
  builder.cylinder("matte", weightGrey, {
    radius: 0.24,
    length: weight.height,
    at: [0, -weight.height / 2, 0],
    segments: 12,
  });
  [-0.05, -weight.height + 0.05].forEach((y) => {
    builder.add("metal", iron, new TorusGeometry(0.25, 0.025, 4, 14), {
      at: [0, y, 0],
      rotation: [Math.PI / 2, 0, 0],
    });
  });
  [0, 1, 2, 3].forEach((bar) => {
    const angle = (bar / 4) * Math.PI * 2;
    builder.bar(
      "metal",
      iron,
      [Math.cos(angle) * 0.25, -weight.height, Math.sin(angle) * 0.25],
      [0, 0.18, 0],
      0.025,
      4,
    );
  });
  builder.box(
    "paint",
    palette.cream,
    [0.2, 0.12, 0.02],
    [0, -weight.height / 2, 0.245],
  );
  addRope(builder, [0, 0.18, 0], [0, pulleyY - weight.topY, 0]);
};

/** Stacked crates, a barrel and sacks waiting to be lifted. */
const buildCargo = (builder: AttractionBuilder) => {
  [
    { at: [-0.4, 0.35, 1.0] satisfies Triple, size: 0.7, turn: 0.2 },
    { at: [0.35, 0.3, 1.3] satisfies Triple, size: 0.6, turn: -0.3 },
    { at: [-0.25, 1.0, 1.05] satisfies Triple, size: 0.6, turn: 0.5 },
  ].forEach(({ at, size, turn }, index) => {
    builder.box(
      "matte",
      index === 1 ? shade(crateTimber, 0.9) : crateTimber,
      [size, size, size],
      at,
      [0, turn, 0],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        shade(crateTimber, 0.8),
        [size + 0.02, 0.06, size + 0.02],
        [at[0], at[1] + size * 0.3, at[2]],
        [0, turn, 0],
      );
      builder.box(
        "matte",
        shade(crateTimber, 0.8),
        [size + 0.02, 0.06, size + 0.02],
        [at[0], at[1] - size * 0.3, at[2]],
        [0, turn, 0],
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  /* A barrel */
  builder.lathe(
    "matte",
    timber,
    [
      [0, 0],
      [0.26, 0],
      [0.32, 0.35],
      [0.26, 0.7],
      [0, 0.7],
    ],
    [-2.3, 0, 0.6],
    "y",
    16,
  );
  [0.08, 0.62].forEach((y) => {
    builder.add("metal", iron, new TorusGeometry(0.28, 0.02, 3, 16), {
      at: [-2.3, y, 0.6],
      rotation: [Math.PI / 2, 0, 0],
    });
  });
  /* Sacks of grain */
  [
    [1.25, 0.9],
    [1.55, 1.25],
  ].forEach(([x, z], index) => {
    builder.sphere("matte", "#d8c8a0", 0.3, [x, 0.25, z], [1, 0.85, 0.8], 10);
    builder.cylinder("matte", rope, {
      radius: 0.07,
      length: 0.12,
      at: [x, 0.5, z],
      segments: 8,
    });
    builder.sphere("matte", "#d8c8a0", 0.09, [x, 0.6, z], [1, 0.6, 1], 6);
    if (index === 0) {
      builder.box("paint", stencil, [0.18, 0.12, 0.01], [x, 0.3, z + 0.24]);
    }
  });
  /* A chalkboard on an easel: three ropes hold the load, so each pulls a third */
  const board: Triple = [-1.75, 0, 2.3];
  [-0.3, 0.3].forEach((dx) => {
    builder.bar(
      "matte",
      timberDark,
      [board[0] + dx, 0, board[2] + 0.15],
      [board[0] + dx * 0.6, 1.35, board[2]],
      0.05,
      5,
    );
  });
  builder.bar(
    "matte",
    timberDark,
    [board[0], 0, board[2] - 0.35],
    [board[0], 1.3, board[2] - 0.02],
    0.05,
    5,
  );
  builder.box(
    "paint",
    "#2c3a33",
    [0.75, 0.55, 0.03],
    [board[0], 1.0, board[2] + 0.04],
    [-0.12, 0, 0],
  );
  builder.box(
    "matte",
    timberDark,
    [0.8, 0.05, 0.06],
    [board[0], 0.71, board[2] + 0.08],
    [-0.12, 0, 0],
  );
  builder.cylinder("paint", palette.white, {
    radius: 0.06,
    length: 0.01,
    at: [board[0], 1.17, board[2] + 0.07],
    axis: "z",
    segments: 10,
  });
  [-0.05, 0, 0.05].forEach((dx) => {
    builder.box(
      "paint",
      palette.white,
      [0.012, 0.22, 0.01],
      [board[0] + dx, 1.02, board[2] + 0.075],
      [-0.12, 0, 0],
    );
  });
  builder.box(
    "paint",
    palette.white,
    [0.16, 0.1, 0.01],
    [board[0], 0.86, board[2] + 0.09],
    [-0.12, 0, 0],
  );
  builder.box(
    "paint",
    palette.white,
    [0.012, 0.3, 0.01],
    [board[0] + 0.25, 1.0, board[2] + 0.075],
    [-0.12, 0, 0.4],
  );
  /* A coil of spare rope */
  [0.03, 0.08].forEach((y, index) => {
    builder.add(
      "matte",
      rope,
      new TorusGeometry(0.24 - index * 0.04, 0.035, 4, 14),
      {
        at: [-1.6, y, 1.6],
        rotation: [Math.PI / 2, 0, 0],
      },
    );
  });
};

export const pulleyLiftModel: CuriosityModel = {
  kind: "pulley-lift",
  islandId: "ember-isle",
  name: "Pulley Lift",
  fact: "A pulley is a wheel with a rope running round it. With one pulley you pull down to lift up. With a block and tackle, the rope runs round several pulleys, and each extra rope holding the load shares the weight, so a small pull can lift a heavy crate. You just have to pull the rope further.",
  curriculumLink:
    "Science, Year 5: forces. Recognise that some mechanisms, including levers, pulleys and gears, allow a smaller force to have a greater effect.",
  footprint: 4.5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: 1.3, z: 3.3 },
  build: (builder) => {
    buildGantry(builder);
    buildRigging(builder);
    buildWinchFrame(builder);
    buildCargo(builder);
    if (builder.isFar) {
      builder.box(
        "matte",
        crateTimber,
        [crate.size, crate.size, crate.size],
        [crate.x, crate.size / 2, gantry.z],
      );
      builder.cylinder("matte", weightGrey, {
        radius: 0.24,
        length: weight.height,
        at: [weight.x, weight.topY - weight.height / 2, gantry.z],
        segments: 8,
      });
      builder.cylinder("matte", timber, {
        radius: 0.7,
        length: 0.08,
        at: [winch[0], winch[1], winch[2] + 0.36],
        axis: "z",
        segments: 10,
      });
    }
    addSignBoard(builder, [1.3, 0, 3.3], signColour);
  },
  moving: [
    {
      name: "crate",
      pivot: [crate.x, blockRestY, gantry.z],
      build: buildCrate,
      motion: { kind: "rise", reach: 7, height: lift, period: 2.2 },
    },
    {
      /* The counterweight sinks as the crate climbs */
      name: "counterweight",
      pivot: [weight.x, weight.topY, gantry.z],
      build: buildWeight,
      motion: { kind: "rise", reach: 7, height: -lift, period: 2.2 },
    },
    {
      name: "winch wheel",
      pivot: [winch[0], winch[1], winch[2] + 0.36],
      build: buildWinchWheel,
      motion: { kind: "whirl", axis: "z", idle: 0.15, speed: 2.2, reach: 7 },
    },
  ],
  blockers: [
    ...[-gantry.legX, gantry.legX].flatMap((x) => [
      { x, z: gantry.z - gantry.spread, radius: 0.3 },
      { x, z: gantry.z + gantry.spread, radius: 0.3 },
    ]),
    { x: crate.x, z: gantry.z, radius: 0.6 },
    { x: weight.x, z: gantry.z, radius: 0.35 },
    { x: winch[0], z: winch[2], radius: 0.7 },
    { x: -0.3, z: 1.1, radius: 0.6 },
    { x: 0.35, z: 1.3, radius: 0.45 },
    { x: -2.3, z: 0.6, radius: 0.35 },
    { x: 1.4, z: 1.05, radius: 0.5 },
    { x: -1.75, z: 2.2, radius: 0.4 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Haul the crate",
    news: "Heave-ho! The rope ran round the pulleys and the heavy crate floated up as if it weighed almost nothing.",
    tune: [55, 59, 62, 67],
  },
};
