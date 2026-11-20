import { CylinderGeometry, TorusGeometry } from "three";
import {
  addFence,
  addTree,
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const plankYellow = "#f2c21d";
const stripeRed = "#d8402e";
const frameBlue = "#2f6fd6";
const seatBlue = "#3a8ad8";
const handleGreen = "#3f9a4a";
const tyreBlack = "#2a2b2e";
const sand = "#ecd49a";
const sandDark = "#d8bc7c";
const frameTimber = "#b07a46";
const brickRed = "#b5523a";
const bucketPink = "#e8508a";
const spadeBlue = "#3a8ad8";
const signColour = "#d8402e";

const seesawZ = -0.4;
const pivotHeight = 0.78;
const pivot: Triple = [0, pivotHeight, seesawZ];
const halfLength = 2.5;
const plankWidth = 0.5;
const seatX = 2.15;
const nodMotion: Motion = {
  kind: "nod",
  axis: "z",
  reach: 8,
  amplitude: 0.2,
  period: 3.2,
};
const sandpit = { x: -1.9, z: 1.9, width: 2.0, depth: 1.5 };
const scaleAt = { x: 1.9, z: 1.6 };

/* ------------------------------------------------------------------ */
/* The pivot, and the plank that rocks on it                           */
/* ------------------------------------------------------------------ */

const buildFulcrum = (builder: AttractionBuilder) => {
  const [x, y, z] = pivot;
  /* Two A-frames either side of the plank */
  [-1, 1].forEach((side) => {
    const frameZ = z + side * (plankWidth / 2 + 0.14);
    [-1, 1].forEach((lean) => {
      builder.bar(
        "paint",
        frameBlue,
        [x + lean * 0.55, 0, frameZ],
        [x + lean * 0.06, y + 0.05, frameZ],
        0.1,
        builder.isFar ? 4 : 8,
      );
    });
    if (builder.isFar) {
      return;
    }
    builder.box(
      "paint",
      shade(frameBlue, 0.8),
      [0.8, 0.06, 0.08],
      [x, 0.3, frameZ],
    );
    builder.cylinder("paint", stripeRed, {
      radius: 0.11,
      length: 0.08,
      at: [x, y, frameZ],
      axis: "z",
      segments: 14,
    });
    [-1, 1].forEach((lean) => {
      builder.cylinder("paint", shade(frameBlue, 0.8), {
        radius: 0.1,
        length: 0.05,
        at: [x + lean * 0.55, 0.025, frameZ],
        segments: 10,
      });
    });
  });
  builder.cylinder("metal", palette.steel, {
    radius: 0.045,
    length: plankWidth + 0.4,
    at: [x, y, z],
    axis: "z",
    segments: builder.isFar ? 6 : 10,
  });
  if (builder.isFar) {
    return;
  }
  /* Old tyres half-buried under each end, for a soft bump */
  [-1, 1].forEach((side) => {
    builder.add(
      "matte",
      tyreBlack,
      new TorusGeometry(0.3, 0.11, 6, 16, Math.PI),
      { at: [x + side * (halfLength - 0.35), 0, z], rotation: [0, 0, 0] },
    );
    builder.add(
      "matte",
      shade(tyreBlack, 1.3),
      new TorusGeometry(0.3, 0.04, 4, 12, Math.PI),
      { at: [x + side * (halfLength - 0.35), 0, z + 0.1], rotation: [0, 0, 0] },
    );
  });
  /* A patch of rubber safety tiles under the seesaw */
  builder.box(
    "matte",
    "#4a8a5a",
    [halfLength * 2 + 0.6, 0.02, 1.4],
    [x, 0.01, z],
  );
};

/** The plank, built about the pivot so it can rock. */
const buildPlank = (builder: AttractionBuilder) => {
  builder.roundedBox(
    "paint",
    plankYellow,
    [halfLength * 2, 0.1, plankWidth],
    0.04,
    [0, 0.11, 0],
  );
  /* Red stripes along the plank, and rounded ends */
  for (let stripe = 0; stripe < 6; stripe++) {
    const x = -1.65 + stripe * 0.66;
    if (Math.abs(x) < 0.3) {
      continue;
    }
    builder.box(
      "paint",
      stripeRed,
      [0.22, 0.104, plankWidth + 0.006],
      [x, 0.11, 0],
    );
  }
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", plankYellow, {
      radius: plankWidth / 2,
      length: 0.1,
      at: [side * halfLength, 0.11, 0],
      segments: 16,
    });
    /* A padded seat */
    builder.box(
      "paint",
      seatBlue,
      [0.5, 0.08, plankWidth - 0.04],
      [side * seatX, 0.2, 0],
    );
    builder.box(
      "paint",
      shade(seatBlue, 0.8),
      [0.06, 0.24, plankWidth - 0.04],
      [side * (seatX + 0.3), 0.28, 0],
    );
    /* A handle to hold on to */
    const handleX = side * (seatX - 0.45);
    [-1, 1].forEach((across) => {
      builder.bar(
        "paint",
        handleGreen,
        [handleX, 0.16, across * 0.17],
        [handleX, 0.6, across * 0.17],
        0.05,
        8,
      );
    });
    builder.bar(
      "paint",
      handleGreen,
      [handleX, 0.6, -0.22],
      [handleX, 0.6, 0.22],
      0.06,
      8,
    );
    [-1, 1].forEach((across) => {
      builder.sphere(
        "paint",
        stripeRed,
        0.045,
        [handleX, 0.6, across * 0.24],
        [1, 1, 1],
        8,
      );
    });
  });
  /* The pivot bracket under the middle */
  builder.box(
    "metal",
    palette.darkSteel,
    [0.36, 0.16, plankWidth + 0.06],
    [0, 0, 0],
  );
  builder.cylinder("paint", frameBlue, {
    radius: 0.08,
    length: plankWidth + 0.08,
    at: [0, 0, 0],
    axis: "z",
    segments: 12,
  });
  /* A stack of bricks on the far seat, to balance a light rider */
  [
    [0, 0.31, 0, 0],
    [0, 0.43, 0.02, 0.15],
    [0.02, 0.55, -0.01, -0.1],
  ].forEach(([dx, y, dz, turn]) => {
    builder.box(
      "matte",
      brickRed,
      [0.36, 0.11, 0.18],
      [-seatX + dx, y, dz],
      [0, turn, 0],
    );
    builder.box(
      "matte",
      shade(brickRed, 0.75),
      [0.1, 0.112, 0.06],
      [-seatX + dx, y, dz],
      [0, turn, 0],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The sandpit and the balance scale                                   */
/* ------------------------------------------------------------------ */

const buildSandpit = (builder: AttractionBuilder) => {
  const { x, z, width, depth } = sandpit;
  builder.box("matte", sand, [width, 0.12, depth], [x, 0.06, z]);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      frameTimber,
      [width + 0.16, 0.22, 0.08],
      [x, 0.11, z + side * (depth / 2 + 0.04)],
    );
    builder.box(
      "matte",
      frameTimber,
      [0.08, 0.22, depth],
      [x + side * (width / 2 + 0.04), 0.11, z],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Corner seats */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "matte",
        shade(frameTimber, 1.12),
        [0.3, 0.04, 0.3],
        [x + sideX * (width / 2 - 0.08), 0.24, z + sideZ * (depth / 2 - 0.08)],
        [0, (sideX * sideZ * Math.PI) / 4, 0],
      );
    });
  });
  /* A sandcastle with three towers and a flag */
  const castle: Triple = [x + 0.2, 0.12, z - 0.1];
  builder.box(
    "matte",
    sandDark,
    [0.5, 0.16, 0.4],
    [castle[0], castle[1] + 0.08, castle[2]],
  );
  [
    [-0.22, -0.17],
    [0.22, -0.17],
    [0, 0.17],
  ].forEach(([dx, dz]) => {
    builder.cylinder("matte", sandDark, {
      radius: 0.09,
      radiusEnd: 0.07,
      length: 0.3,
      at: [castle[0] + dx, castle[1] + 0.15, castle[2] + dz],
      segments: 10,
    });
    builder.cylinder("matte", shade(sandDark, 1.05), {
      radius: 0.085,
      radiusEnd: 0.0,
      length: 0.08,
      at: [castle[0] + dx, castle[1] + 0.34, castle[2] + dz],
      segments: 10,
    });
  });
  builder.bar(
    "matte",
    palette.darkTimber,
    [castle[0], castle[1] + 0.16, castle[2] + 0.17],
    [castle[0], castle[1] + 0.62, castle[2] + 0.17],
    0.012,
    3,
  );
  builder.box(
    "paint",
    stripeRed,
    [0.12, 0.07, 0.005],
    [castle[0] + 0.06, castle[1] + 0.58, castle[2] + 0.17],
  );
  /* A bucket and spade */
  const bucket: Triple = [x - 0.55, 0.12, z + 0.3];
  builder.lathe(
    "paint",
    bucketPink,
    [
      [0, 0],
      [0.1, 0],
      [0.13, 0.22],
      [0.12, 0.22],
      [0.09, 0.02],
      [0, 0.02],
    ],
    bucket,
    "y",
    14,
  );
  builder.add(
    "paint",
    bucketPink,
    new TorusGeometry(0.13, 0.008, 3, 10, Math.PI),
    { at: [bucket[0], bucket[1] + 0.22, bucket[2]], rotation: [0, 0, -0.3] },
  );
  builder.bar(
    "paint",
    spadeBlue,
    [x - 0.3, 0.14, z + 0.5],
    [x - 0.75, 0.2, z - 0.1],
    0.03,
    5,
  );
  builder.box(
    "paint",
    spadeBlue,
    [0.14, 0.02, 0.18],
    [x - 0.24, 0.135, z + 0.58],
    [0, 0.64, 0],
  );
  /* Footprints and scoops in the sand */
  [
    [0.5, 0.4],
    [0.65, 0.2],
    [-0.2, -0.45],
  ].forEach(([dx, dz]) => {
    builder.cylinder("matte", sandDark, {
      radius: 0.08,
      length: 0.01,
      at: [x + dx, 0.12, z + dz],
      segments: 8,
    });
  });
};

const buildBalanceScale = (builder: AttractionBuilder) => {
  const { x, z } = scaleAt;
  /* A big toy pan balance: the brick side is heavier, so it hangs lower */
  builder.box("paint", frameBlue, [0.6, 0.08, 0.3], [x, 0.04, z]);
  builder.cylinder("paint", frameBlue, {
    radius: 0.04,
    length: 0.9,
    at: [x, 0.49, z],
    segments: builder.isFar ? 5 : 10,
  });
  const tilt = 0.25;
  const beamTop = 0.94;
  const ends = [-1, 1].map((side) => ({
    side,
    x: x + side * Math.cos(tilt) * 0.5,
    y: beamTop - side * Math.sin(tilt) * 0.5,
  }));
  builder.box(
    "paint",
    plankYellow,
    [1.04, 0.05, 0.05],
    [x, beamTop, z],
    [0, 0, -tilt],
  );
  if (builder.isFar) {
    return;
  }
  builder.add("paint", stripeRed, new CylinderGeometry(0.06, 0.06, 0.03, 10), {
    at: [x, beamTop, z + 0.04],
    rotation: [Math.PI / 2, 0, 0],
  });
  /* A pointer showing which side is heavier */
  builder.box(
    "paint",
    stripeRed,
    [0.02, 0.24, 0.02],
    [x, beamTop - 0.13, z + 0.05],
    [0, 0, -tilt],
  );
  ends.forEach(({ side, x: endX, y: endY }) => {
    const panY = endY - 0.32;
    [-1, 1].forEach((spread) => {
      builder.bar(
        "metal",
        palette.steel,
        [endX, endY, z],
        [endX + spread * 0.12, panY + 0.03, z],
        0.008,
        3,
      );
    });
    builder.bar(
      "metal",
      palette.steel,
      [endX, endY, z],
      [endX, panY + 0.03, z + 0.12],
      0.008,
      3,
    );
    builder.lathe(
      "metal",
      palette.brass,
      [
        [0, 0],
        [0.16, 0.02],
        [0.18, 0.06],
        [0.17, 0.06],
        [0, 0.02],
      ],
      [endX, panY, z],
      "y",
      14,
    );
    if (side === -1) {
      /* Two bricks: heavy */
      builder.box("matte", brickRed, [0.2, 0.08, 0.1], [endX, panY + 0.09, z]);
      builder.box(
        "matte",
        shade(brickRed, 0.9),
        [0.2, 0.08, 0.1],
        [endX, panY + 0.17, z],
        [0, 0.3, 0],
      );
    } else {
      /* A feather: light */
      builder.box(
        "paint",
        palette.white,
        [0.18, 0.01, 0.05],
        [endX, panY + 0.08, z],
        [0, 0.5, 0.2],
      );
    }
  });
};

/* ------------------------------------------------------------------ */
/* Bunting, a tree, weights and a teddy                                */
/* ------------------------------------------------------------------ */

const buntingColours = [
  stripeRed,
  plankYellow,
  frameBlue,
  handleGreen,
  "#e8508a",
];

const buildExtras = (builder: AttractionBuilder) => {
  /* Bunting strung between two poles behind the seesaw */
  const poles = [-3.0, 3.0];
  const poleZ = -2.0;
  poles.forEach((x) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.04,
      length: 2.3,
      at: [x, 1.15, poleZ],
      segments: 8,
    });
    builder.sphere("paint", stripeRed, 0.07, [x, 2.33, poleZ], [1, 1, 1], 8);
  });
  const sag = (share: number) => 2.15 - Math.sin(share * Math.PI) * 0.45;
  const flags = 16;
  for (let flag = 0; flag < flags; flag++) {
    const share = (flag + 0.5) / flags;
    const x = poles[0] + (poles[1] - poles[0]) * share;
    builder.add(
      "paint",
      buntingColours[flag % buntingColours.length],
      new CylinderGeometry(0.13, 0.13, 0.01, 3),
      {
        at: [x, sag(share) - 0.1, poleZ],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 1.3],
      },
      undefined,
    );
  }
  for (let piece = 0; piece < 8; piece++) {
    const from = piece / 8;
    const to = (piece + 1) / 8;
    builder.bar(
      "matte",
      palette.white,
      [poles[0] + 6 * from, sag(from), poleZ],
      [poles[0] + 6 * to, sag(to), poleZ],
      0.012,
      3,
    );
  }
  addTree(builder, [3.3, 0, -1.1], 0.95);
  /* A set of toy weights by the balance: 1, 2 and 5 */
  [
    [0.1, 0.08, 0.0],
    [0.13, 0.11, 0.25],
    [0.17, 0.15, 0.55],
  ].forEach(([radius, height, dx]) => {
    const at: Triple = [scaleAt.x - 0.35 + dx, 0, scaleAt.z + 0.45];
    builder.cylinder("metal", palette.darkSteel, {
      radius,
      radiusEnd: radius * 0.8,
      length: height,
      at: [at[0], height / 2, at[2]],
      segments: 14,
    });
    builder.cylinder("metal", palette.darkSteel, {
      radius: radius * 0.3,
      length: 0.05,
      at: [at[0], height + 0.025, at[2]],
      segments: 8,
    });
    builder.sphere(
      "metal",
      palette.darkSteel,
      radius * 0.35,
      [at[0], height + 0.07, at[2]],
      [1, 0.8, 1],
      8,
    );
  });
  /* A teddy bear sitting on the sandpit's corner seat */
  const teddy: Triple = [
    sandpit.x + sandpit.width / 2 - 0.08,
    0.26,
    sandpit.z - sandpit.depth / 2 + 0.08,
  ];
  const fur = "#b07a46";
  const muzzle = shade(fur, 1.25);
  const part = (
    colour: string,
    radius: number,
    x: number,
    y: number,
    z: number,
    scale: Triple,
    segments: number,
  ) => {
    builder.sphere(
      colour === palette.black ? "paint" : "matte",
      colour,
      radius,
      [teddy[0] + x, teddy[1] + y, teddy[2] + z],
      scale,
      segments,
    );
  };
  part(fur, 0.13, 0, 0.13, 0, [1, 1.1, 0.9], 10);
  part(muzzle, 0.08, 0, 0.12, 0.08, [1, 1, 0.5], 8);
  part(fur, 0.1, 0, 0.33, 0, [1, 1, 1], 10);
  part(muzzle, 0.045, 0, 0.31, 0.09, [1, 0.8, 0.8], 6);
  part(palette.black, 0.018, 0, 0.32, 0.13, [1, 1, 1], 5);
  [-1, 1].forEach((side) => {
    part(fur, 0.04, side * 0.08, 0.41, 0, [1, 1, 0.6], 6);
    part(palette.black, 0.012, side * 0.035, 0.36, 0.085, [1, 1, 1], 4);
    part(fur, 0.05, side * 0.13, 0.16, 0.03, [0.8, 1.3, 0.8], 7);
    part(fur, 0.055, side * 0.07, 0.03, 0.1, [0.9, 0.8, 1.3], 7);
  });
  builder.box(
    "paint",
    stripeRed,
    [0.16, 0.04, 0.03],
    [teddy[0], teddy[1] + 0.24, teddy[2] + 0.08],
  );
};

export const giantSeesawModel: CuriosityModel = {
  kind: "giant-seesaw",
  islandId: "meadow-isle",
  name: "Giant Seesaw",
  fact: "A seesaw is a balance. The heavier end goes down and the lighter end goes up. If both ends are just as heavy, the seesaw balances and stays level. That is why a grown-up sits nearer the middle, or why you can add bricks to the lighter end to make it balance!",
  curriculumLink:
    "Mathematics, Year 1: measure and begin to record mass and weight, comparing heavy and light, heavier than and lighter than.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 0.4, z: 3.3 },
  build: (builder) => {
    buildFulcrum(builder);
    buildSandpit(builder);
    buildBalanceScale(builder);
    if (builder.isFar) {
      builder.box(
        "paint",
        plankYellow,
        [halfLength * 2, 0.1, plankWidth],
        [pivot[0], pivot[1] + 0.11, pivot[2]],
      );
    } else {
      addFence(
        builder,
        { x: -3.0, z: -2.6 },
        { x: 3.0, z: -2.6 },
        {
          colour: palette.white,
        },
      );
      buildExtras(builder);
    }
    addSignBoard(builder, [0.4, 0, 3.3], signColour);
  },
  moving: [
    {
      name: "seesaw plank",
      pivot,
      build: buildPlank,
      motion: nodMotion,
    },
  ],
  rides: [
    {
      id: "seesaw",
      name: "the giant seesaw",
      start: { x: seatX + 0.2, z: seesawZ + 0.85 },
      reach: 0.6,
      seconds: 9,
      finish: { x: seatX + 0.3, z: seesawZ + 2.0 },
      follow: (progress, seconds) => {
        const seat: Triple = [seatX - 0.05, pivotHeight + 0.24, seesawZ];
        const [x, y, z] = moveWithPose(
          pivot,
          seat,
          findMotionPose(nodMotion, seconds, { nearness: 1 }),
        );
        const share = Math.min(1, progress * 8, (1 - progress) * 8);
        const outside = { x: seatX + 0.2, z: seesawZ + 0.85 };
        return {
          x: outside.x + (x - outside.x) * share,
          y: y * share,
          z: outside.z + (z - outside.z) * share,
          heading: -Math.PI / 2,
        };
      },
    },
  ],
  blockers: [
    { x: 0, z: seesawZ, radius: 0.6 },
    { x: -1.2, z: seesawZ, radius: 0.35 },
    { x: -2.2, z: seesawZ, radius: 0.45 },
    { x: 1.2, z: seesawZ, radius: 0.35 },
    { x: scaleAt.x, z: scaleAt.z, radius: 0.4 },
    { x: 3.3, z: -1.1, radius: 0.3 },
    { x: -3.0, z: -2.0, radius: 0.15 },
    { x: 3.0, z: -2.0, radius: 0.15 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Balance the seesaw",
    news: "Wobble, wobble… level! You added bricks to the lighter end until both ends weighed the same.",
  },
};
