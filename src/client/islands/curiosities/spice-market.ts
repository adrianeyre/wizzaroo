import { BoxGeometry, ConeGeometry, CylinderGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const paving = "#d8bf94";
const stallTimber = "#7a5232";
const brass = "#d4a63c";
const sackCloth = "#d9c49a";
const signColour = "#8a2a5a";

interface Stall {
  x: number;
  z: number;
  /** Which way its counter faces: 0 faces local +z. */
  turn: number;
  stripe: string;
  spices: string[];
}

const stalls: Stall[] = [
  {
    x: 0,
    z: -2.25,
    turn: 0,
    stripe: "#c0392b",
    spices: ["#e8b520", "#c8361e", "#8a5a2a", "#e8771e", "#5f8a2a", "#3a2a22"],
  },
  {
    x: -2.45,
    z: -0.25,
    turn: Math.PI / 2,
    stripe: "#1f7a8a",
    spices: ["#d8441e", "#f2c12e", "#a8642a", "#7a2a4a", "#e8771e", "#8aa83a"],
  },
  {
    x: 2.45,
    z: -0.25,
    turn: -Math.PI / 2,
    stripe: "#e0882a",
    spices: ["#5f8a2a", "#c8361e", "#e8b520", "#6b3a22", "#b84a2a", "#f2e0a0"],
  },
];
const stallHalfWidth = 1.0;
const stallHalfDepth = 0.55;
const postHeight = 2.05;
const frontHeight = 1.8;
const awningReach = 0.55;
const counterHeight = 0.8;

/** Where a stall-local point is in the market. */
const placeIn = (stall: Stall, x: number, y: number, z: number): Triple => [
  stall.x + x * Math.cos(stall.turn) + z * Math.sin(stall.turn),
  y,
  stall.z - x * Math.sin(stall.turn) + z * Math.cos(stall.turn),
];

/** A box in a stall's own directions, tilted forward by `tilt`. */
const addStallBox = (
  builder: AttractionBuilder,
  stall: Stall,
  finish: AttractionFinish,
  colour: string,
  size: Triple,
  at: Triple,
  tilt = 0,
) => {
  builder.add(
    finish,
    colour,
    new BoxGeometry(...size).rotateX(tilt).rotateY(stall.turn),
    { at: placeIn(stall, ...at) },
    undefined,
  );
};

/** A box laid from one point to another. */
const addSlab = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  from: Triple,
  to: Triple,
  width: number,
  thickness: number,
) => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const level = Math.hypot(dx, dz);
  builder.add(
    finish,
    colour,
    new BoxGeometry(width, thickness, Math.hypot(level, dy))
      .rotateX(Math.atan2(-dy, level))
      .rotateY(Math.atan2(dx, dz)),
    { at: [from[0] + dx / 2, from[1] + dy / 2, from[2] + dz / 2] },
    undefined,
  );
};

/** The awning's slope, from the back of the stall down to its front. */
const awningSlope = Math.atan2(
  postHeight - frontHeight + 0.15,
  stallHalfDepth * 2 + awningReach,
);
const awningLength = Math.hypot(
  stallHalfDepth * 2 + awningReach,
  postHeight - frontHeight + 0.15,
);

/** A striped cloth awning, built in stall directions about `origin`. */
const addAwning = (
  builder: AttractionBuilder,
  stall: Stall,
  origin: Triple,
) => {
  const stripes = builder.isFar ? 1 : 8;
  const width = (stallHalfWidth * 2 + 0.2) / stripes;
  const middleZ = -stallHalfDepth + (stallHalfDepth * 2 + awningReach) / 2;
  const middleY = postHeight + 0.05 - (postHeight - frontHeight + 0.15) / 2;
  for (let stripe = 0; stripe < stripes; stripe++) {
    const x = -stallHalfWidth - 0.1 + (stripe + 0.5) * width;
    const colour =
      stripes === 1 || stripe % 2 === 0 ? stall.stripe : palette.cream;
    builder.add(
      "matte",
      colour,
      new BoxGeometry(width, 0.04, awningLength)
        .rotateX(awningSlope)
        .rotateY(stall.turn),
      { at: offsetIn(stall, origin, x, middleY, middleZ) },
      undefined,
    );
  }
  if (builder.isFar) {
    return;
  }
  /* A scalloped valance along the front edge */
  const frontZ = stallHalfDepth + awningReach;
  const frontY = frontHeight - 0.1;
  for (let scallop = 0; scallop < 9; scallop++) {
    const x =
      -stallHalfWidth -
      0.1 +
      (scallop + 0.5) * ((stallHalfWidth * 2 + 0.2) / 9);
    builder.add(
      "matte",
      scallop % 2 === 0 ? stall.stripe : palette.cream,
      new CylinderGeometry(0.12, 0.12, 0.02, 10, 1, false, Math.PI / 2, Math.PI)
        .rotateX(-Math.PI / 2)
        .rotateY(stall.turn),
      { at: offsetIn(stall, origin, x, frontY, frontZ) },
    );
  }
};

/** A stall-local point measured from `origin`, a point in the market. */
const offsetIn = (
  stall: Stall,
  origin: Triple,
  x: number,
  y: number,
  z: number,
): Triple => {
  const [px, py, pz] = placeIn(stall, x, y, z);
  const [sx, , sz] = placeIn(stall, 0, 0, 0);
  return [origin[0] + px - sx, origin[1] + py, origin[2] + pz - sz];
};

/** A round basket heaped with a mound of ground spice. */
const addSpiceBasket = (
  builder: AttractionBuilder,
  at: Triple,
  spice: string,
  size = 1,
) => {
  builder.cylinder("matte", "#c9a760", {
    radius: 0.17 * size,
    radiusEnd: 0.19 * size,
    length: 0.12 * size,
    at: [at[0], at[1] + 0.06 * size, at[2]],
    segments: builder.isFar ? 5 : 12,
    isOpen: !builder.isFar,
  });
  builder.add(
    "matte",
    spice,
    new ConeGeometry(0.17 * size, 0.2 * size, builder.isFar ? 5 : 12),
    { at: [at[0], at[1] + 0.2 * size, at[2]] },
  );
  if (!builder.isFar) {
    builder.cylinder("matte", shade("#c9a760", 0.8), {
      radius: 0.195 * size,
      length: 0.025,
      at: [at[0], at[1] + 0.12 * size, at[2]],
      segments: 12,
      isOpen: true,
    });
  }
};

const buildStall = (
  builder: AttractionBuilder,
  stall: Stall,
  index: number,
) => {
  const box = (
    finish: AttractionFinish,
    colour: string,
    size: Triple,
    at: Triple,
    tilt = 0,
  ) => {
    addStallBox(builder, stall, finish, colour, size, at, tilt);
  };
  /* Posts, taller at the back so the awning slopes forward */
  [-1, 1].forEach((side) => {
    box(
      "matte",
      stallTimber,
      [0.09, postHeight, 0.09],
      [side * stallHalfWidth, postHeight / 2, -stallHalfDepth],
    );
    box(
      "matte",
      stallTimber,
      [0.09, frontHeight, 0.09],
      [side * stallHalfWidth, frontHeight / 2, stallHalfDepth],
    );
  });
  box(
    "matte",
    stallTimber,
    [stallHalfWidth * 2 + 0.1, 0.1, 0.1],
    [0, frontHeight - 0.05, stallHalfDepth],
  );
  /* The counter, with a cloth hung over its front */
  box(
    "matte",
    palette.paleTimber,
    [stallHalfWidth * 2, 0.08, 0.6],
    [0, counterHeight, stallHalfDepth - 0.3],
  );
  box(
    "matte",
    stall.stripe,
    [stallHalfWidth * 2 - 0.04, counterHeight - 0.08, 0.04],
    [0, (counterHeight - 0.08) / 2 + 0.04, stallHalfDepth - 0.02],
  );
  if (index !== 0 || builder.isFar) {
    addAwning(builder, stall, [stall.x, 0, stall.z]);
  }
  if (builder.isFar) {
    return;
  }
  box(
    "paint",
    palette.cream,
    [stallHalfWidth * 2 - 0.2, 0.06, 0.045],
    [0, counterHeight - 0.25, stallHalfDepth - 0.005],
  );
  /* Six baskets of spices along the counter, and shelves of jars behind */
  stall.spices.forEach((spice, basket) => {
    const x = -stallHalfWidth + 0.2 + basket * 0.32;
    addSpiceBasket(
      builder,
      placeIn(
        stall,
        x,
        counterHeight + 0.04,
        stallHalfDepth - 0.3 + (basket % 2) * 0.08,
      ),
      spice,
      0.85,
    );
  });
  box(
    "matte",
    stallTimber,
    [stallHalfWidth * 2, 0.05, 0.3],
    [0, 1.25, -stallHalfDepth + 0.15],
  );
  for (let jar = 0; jar < 7; jar++) {
    const colour = stall.spices[(jar + 2) % stall.spices.length];
    const [x, , z] = placeIn(
      stall,
      -stallHalfWidth + 0.2 + jar * 0.27,
      0,
      -stallHalfDepth + 0.15,
    );
    builder.cylinder("glass", "#d8ecf0", {
      radius: 0.065,
      length: 0.2,
      at: [x, 1.38, z],
      segments: 8,
    });
    builder.cylinder("matte", colour, {
      radius: 0.058,
      length: 0.14,
      at: [x, 1.35, z],
      segments: 8,
    });
    builder.cylinder("paint", stallTimber, {
      radius: 0.07,
      length: 0.04,
      at: [x, 1.5, z],
      segments: 8,
    });
  }
  /* Bulging sacks on the ground in front, rolled open */
  [-0.6, 0.65].forEach((x, sack) => {
    const at = placeIn(stall, x, 0, stallHalfDepth + 0.35);
    builder.sphere(
      "matte",
      sackCloth,
      0.24,
      [at[0], 0.22, at[2]],
      [1, 1.1, 1],
      10,
    );
    builder.cylinder("matte", shade(sackCloth, 0.9), {
      radius: 0.2,
      length: 0.08,
      at: [at[0], 0.42, at[2]],
      segments: 10,
      isOpen: true,
    });
    builder.add(
      "matte",
      stall.spices[sack * 3],
      new ConeGeometry(0.19, 0.14, 10),
      { at: [at[0], 0.47, at[2]] },
    );
  });
};

/** The back stall's awning lifts and settles in the breeze when someone comes near. */
const awningHinge: Triple = placeIn(
  stalls[0],
  0,
  postHeight + 0.05,
  -stallHalfDepth,
);

const buildFlappingAwning = (builder: AttractionBuilder) => {
  const stall = stalls[0];
  addAwning(builder, stall, [
    stall.x - awningHinge[0],
    -awningHinge[1],
    stall.z - awningHinge[2],
  ]);
};

/** A brass lantern of pierced metal and coloured glass, hanging from its chain. */
const buildLantern = (builder: AttractionBuilder, glass: string) => {
  builder.bar("metal", brass, [0, 0, 0], [0, -0.25, 0], 0.015, 4);
  builder.add("metal", brass, new ConeGeometry(0.1, 0.14, 8), {
    at: [0, -0.32, 0],
  });
  builder.cylinder("glow", glass, {
    radius: 0.085,
    length: 0.24,
    at: [0, -0.51, 0],
    segments: 8,
  });
  for (let bar = 0; bar < 4; bar++) {
    const angle = (bar / 4) * Math.PI * 2 + Math.PI / 4;
    builder.box(
      "metal",
      brass,
      [0.02, 0.26, 0.02],
      [Math.sin(angle) * 0.085, -0.51, Math.cos(angle) * 0.085],
    );
  }
  builder.add(
    "metal",
    brass,
    new ConeGeometry(0.085, 0.1, 8).rotateX(Math.PI),
    { at: [0, -0.68, 0] },
  );
  builder.sphere("metal", brass, 0.025, [0, -0.75, 0], [1, 1, 1], 6);
};

const lanternSpots: { at: Triple; glass: string }[] = [
  {
    at: placeIn(stalls[1], 0.45, frontHeight - 0.1, stallHalfDepth),
    glass: "#ff9a3a",
  },
  {
    at: placeIn(stalls[2], -0.45, frontHeight - 0.1, stallHalfDepth),
    glass: "#ff5a7a",
  },
];

const scale = {
  at: placeIn(stalls[0], 0.55, counterHeight + 0.04, stallHalfDepth - 0.42),
};
const scaleBeam: Triple = [scale.at[0], scale.at[1] + 0.55, scale.at[2]];

const buildScaleStand = (builder: AttractionBuilder) => {
  const [x, y, z] = scale.at;
  builder.cylinder("metal", brass, {
    radius: 0.09,
    length: 0.04,
    at: [x, y + 0.02, z],
    segments: 12,
  });
  builder.cylinder("metal", brass, {
    radius: 0.018,
    length: 0.55,
    at: [x, y + 0.29, z],
    segments: 6,
  });
  builder.sphere("metal", brass, 0.03, [x, y + 0.58, z], [1, 1, 1], 6);
};

/** The balance beam with its two pans, tipping as spice is weighed. */
const buildScaleBeam = (builder: AttractionBuilder) => {
  builder.bar("metal", brass, [-0.24, 0, 0], [0.24, 0, 0], 0.02, 6);
  [-0.22, 0.22].forEach((side, index) => {
    [-1, 1].forEach((corner) => {
      builder.bar(
        "metal",
        palette.steel,
        [side, 0, 0],
        [side + corner * 0.06, -0.3, 0],
        0.006,
        3,
      );
    });
    builder.lathe(
      "metal",
      brass,
      [
        [0, -0.33],
        [0.06, -0.325],
        [0.09, -0.29],
      ],
      [side, 0, 0],
      "y",
      12,
    );
    if (index === 0) {
      builder.add("matte", "#e8b520", new ConeGeometry(0.06, 0.06, 8), {
        at: [side, -0.29, 0],
      });
    } else {
      builder.cylinder("metal", palette.darkSteel, {
        radius: 0.03,
        length: 0.04,
        at: [side, -0.3, 0],
        segments: 8,
      });
    }
  });
};

const buildPlaza = (builder: AttractionBuilder) => {
  builder.cylinder("matte", paving, {
    radius: 3.3,
    length: 0.03,
    at: [0, 0.015, -0.4],
    segments: builder.segments(32, 10),
  });
  if (builder.isFar) {
    return;
  }
  /* A rug laid out in the middle, with a little pyramid of spice for sale */
  builder.box("matte", "#8a2a3a", [1.5, 0.02, 1.0], [0, 0.04, 0.3]);
  builder.box("matte", "#e8b520", [1.36, 0.022, 0.86], [0, 0.041, 0.3]);
  builder.box("matte", "#8a2a3a", [1.24, 0.024, 0.74], [0, 0.042, 0.3]);
  [-0.4, 0, 0.4].forEach((x, index) => {
    builder.box(
      "matte",
      index === 1 ? "#1f5a8a" : "#e8b520",
      [0.22, 0.026, 0.22],
      [x, 0.043, 0.3],
      [0, Math.PI / 4, 0],
    );
  });
  addSpiceBasket(builder, [-0.35, 0.04, 0.25], "#c8361e", 1.3);
  addSpiceBasket(builder, [0.35, 0.04, 0.3], "#e8b520", 1.3);
  /* A brass teapot and glasses on a tray, for haggling over */
  builder.cylinder("metal", brass, {
    radius: 0.18,
    length: 0.02,
    at: [0, 0.06, 0.45],
    segments: 14,
  });
  builder.lathe(
    "metal",
    shade(palette.steel, 1.1),
    [
      [0, 0],
      [0.07, 0],
      [0.09, 0.05],
      [0.08, 0.11],
      [0.04, 0.14],
      [0.05, 0.17],
      [0, 0.2],
    ],
    [0, 0.07, 0.45],
    "y",
    10,
  );
  /* A rug hung over a rail between the side stalls and the back */
  [-1, 1].forEach((side) => {
    const x = side * 1.55;
    builder.box("matte", stallTimber, [0.06, 1.6, 0.06], [x, 0.8, -1.55]);
    builder.box(
      "matte",
      side < 0 ? "#2a5a8a" : "#8a3a1a",
      [0.62, 1.0, 0.03],
      [x + side * -0.35, 1.0, -1.55],
    );
    builder.box(
      "matte",
      "#f2c14e",
      [0.5, 0.06, 0.035],
      [x + side * -0.35, 1.15, -1.55],
    );
    builder.box(
      "matte",
      "#f2c14e",
      [0.5, 0.06, 0.035],
      [x + side * -0.35, 0.8, -1.55],
    );
  });
  /* Strings of little flags from the side stalls to the back stall */
  [stalls[1], stalls[2]].forEach((stall, side) => {
    const from = placeIn(
      stall,
      side === 0 ? -stallHalfWidth : stallHalfWidth,
      postHeight,
      -stallHalfDepth,
    );
    const to = placeIn(
      stalls[0],
      side === 0 ? -stallHalfWidth : stallHalfWidth,
      postHeight,
      stallHalfDepth,
    );
    const flags = 8;
    const pointAt = (share: number): Triple => [
      from[0] + (to[0] - from[0]) * share,
      from[1] + (to[1] - from[1]) * share - 0.3 * Math.sin(share * Math.PI),
      from[2] + (to[2] - from[2]) * share,
    ];
    const turn = Math.atan2(to[0] - from[0], to[2] - from[2]) + Math.PI / 2;
    for (let flag = 0; flag < flags; flag++) {
      addSlab(
        builder,
        "matte",
        palette.cream,
        pointAt(flag / flags),
        pointAt((flag + 1) / flags),
        0.012,
        0.012,
      );
      const [x, y, z] = pointAt((flag + 0.5) / flags);
      builder.add(
        "paint",
        ["#c0392b", "#f2c12e", "#1f7a8a", "#e0882a"][(flag + side) % 4],
        new ConeGeometry(0.08, 0.18, 3).rotateX(Math.PI),
        {
          at: [x, y - 0.1, z],
          rotation: [0, turn, 0],
          scale: [1, 1, 0.15],
        },
      );
    }
  });
  /* A cat asleep on a sack */
  builder.sphere("matte", sackCloth, 0.22, [1.6, 0.16, 1.4], [1.2, 0.7, 1], 10);
  builder.sphere("matte", "#e08a3a", 0.13, [1.6, 0.36, 1.4], [1.3, 0.6, 1], 8);
  builder.sphere("matte", "#e08a3a", 0.07, [1.75, 0.38, 1.45], [1, 0.9, 1], 6);
  [-0.03, 0.03].forEach((side) => {
    builder.add("matte", "#e08a3a", new ConeGeometry(0.025, 0.05, 4), {
      at: [1.78, 0.45, 1.45 + side],
    });
  });
  builder.bar("matte", "#e08a3a", [1.45, 0.33, 1.4], [1.5, 0.3, 1.6], 0.035, 4);
  /* Pots of mint by the way in */
  [-1.4, 1.4].forEach((x) => {
    builder.cylinder("matte", "#b8643a", {
      radius: 0.16,
      radiusEnd: 0.2,
      length: 0.32,
      at: [x, 0.16, 2.6],
      segments: 10,
    });
    builder.sphere("matte", "#4f8a3a", 0.2, [x, 0.42, 2.6], [1.1, 0.8, 1.1], 8);
  });
};

export const spiceMarketModel: CuriosityModel = {
  kind: "spice-market",
  islandId: "sunscorch-sands",
  name: "Spice Market",
  fact: "Spices like cinnamon, pepper, cumin and saffron come from the seeds, bark, roots and flowers of plants. Long ago, traders carried them thousands of miles along trade routes such as the Silk Road and across the desert by camel caravan. Spices were so valuable that they were sometimes used instead of money.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of human geography, including economic activity and trade links.",
  footprint: 4.6,
  setting: "inland",
  padColour: sand,
  signSpot: { x: 0.9, z: 3.8 },
  build: (builder) => {
    buildPlaza(builder);
    stalls.forEach((stall, index) => {
      buildStall(builder, stall, index);
    });
    buildScaleStand(builder);
    addSignBoard(builder, [0.9, 0, 3.8], signColour);
  },
  moving: [
    {
      name: "awning",
      pivot: awningHinge,
      build: buildFlappingAwning,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.08,
        period: 1.8,
      },
    },
    {
      name: "scale beam",
      pivot: scaleBeam,
      build: buildScaleBeam,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 5,
        amplitude: 0.25,
        period: 2.4,
      },
    },
    ...lanternSpots.map(({ at, glass }, index): MovingPart => ({
      name: `lantern ${String(index + 1)}`,
      pivot: at,
      build: (builder) => {
        buildLantern(builder, glass);
      },
      motion: {
        kind: "whirl",
        axis: "y",
        idle: 0.2,
        speed: 2.4,
        reach: 6,
        phase: index * 1.3,
      },
    })),
  ],
  blockers: [
    ...stalls.flatMap((stall) =>
      [-0.65, 0, 0.65].map((x) => {
        const [bx, , bz] = placeIn(stall, x, 0, 0);
        return { x: bx, z: bz, radius: 0.6 };
      }),
    ),
    ...stalls.flatMap((stall) =>
      [-0.6, 0.65].map((x) => {
        const [bx, , bz] = placeIn(stall, x, 0, stallHalfDepth + 0.35);
        return { x: bx, z: bz, radius: 0.25 };
      }),
    ),
    { x: 0, z: 0.3, radius: 0.55 },
    { x: 1.6, z: 1.4, radius: 0.3 },
    { x: -1.55, z: -1.55, radius: 0.1 },
    { x: 1.55, z: -1.55, radius: 0.1 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Smell the spices",
    news: "Sniff! Warm cinnamon, smoky cumin and zingy ginger. The trader weighed you a little bag of saffron, the most costly spice in the world.",
    tune: [62, 63, 66, 67, 69, 70, 73, 74],
  },
};
