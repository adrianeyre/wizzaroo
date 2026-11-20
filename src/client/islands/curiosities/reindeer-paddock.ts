import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snow = "#f4f8fb";
const snowShadow = "#dbe5ec";
const logTimber = "#7a5534";
const logEnd = "#c9a272";
const coatBrown = "#8a6446";
const coatPale = "#e9dfcf";
const antlerBone = "#d9c8a4";
const hoofDark = "#3a2e26";
const lichen = "#b8c48a";
const moss = "#7f9a52";
const sleighRed = "#b5232e";
const gold = "#d9a93c";
const pineGreen = "#2f5a40";
const iceBlue = "#a9d3e6";
const signColour = "#7a2e2a";

const paddock = { x: 0, z: -0.6, radius: 3.6 };
const postCount = 14;
const trough = { x: 1.5, z: -1.4 };
const eater = { x: 1.5, z: -2.55 };
const tub = { x: 2.55, z: -0.15 };
const shed = { x: -0.4, z: -3.25, width: 2.3, depth: 1.0 };
const sleighAt: Triple = [-2.9, 0, 3.45];
const signAt: Triple = [2.2, 0, 4.7];
const neckAt: Triple = [eater.x, 0.84, eater.z + 0.3];

/** The fence posts round the paddock, with the gate's gap facing visitors. */
const fencePosts: LocalPoint[] = Array.from(
  { length: postCount },
  (_, index) => {
    const angle = ((index + 0.5) / postCount) * Math.PI * 2;
    return {
      x: paddock.x + Math.sin(angle) * paddock.radius,
      z: paddock.z + Math.cos(angle) * paddock.radius,
    };
  },
);

/** A rounded block with fewer bevel steps than the builder's own, to save triangles. */
const addSoftBlock = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  size: Triple,
  radius: number,
  at: Triple,
  rotation?: Triple,
) => {
  if (builder.isFar) {
    builder.box(finish, colour, size, at, rotation);
    return;
  }
  builder.add(
    finish,
    colour,
    new RoundedBoxGeometry(
      size[0],
      size[1],
      size[2],
      1,
      Math.min(radius, ...size.map((side) => side / 2 - 0.001)),
    ),
    { at, rotation },
  );
};

/** A snowy spruce: a trunk and three tiers of boughs, each capped with snow. */
const addSnowyPine = (builder: AttractionBuilder, at: Triple, size: number) => {
  const [x, y, z] = at;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.12 * size,
    radiusEnd: 0.08 * size,
    length: 0.7 * size,
    at: [x, y + 0.35 * size, z],
    segments: 8,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (0.95 - share * 0.55) * size;
    const base = (0.55 + share * 1.35) * size;
    const height = (1.3 - share * 0.25) * size;
    builder.cylinder("matte", shade(pineGreen, 1 + tier * 0.06), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, y + base + height / 2, z],
      segments: 12,
    });
    if (!builder.isFar) {
      builder.cylinder("matte", snow, {
        radius: radius * 0.62,
        radiusEnd: 0.02,
        length: height * 0.5,
        at: [x, y + base + height * 0.78, z],
        segments: 12,
      });
    }
  }
};

/** The reindeer's head and neck, from the neck's root at the origin, looking +z. */
const addReindeerHead = (
  builder: AttractionBuilder,
  origin: Triple,
  dip: number,
) => {
  const [x, y, z] = origin;
  const lift = 0.36 * Math.cos(dip);
  const reach = 0.24 + 0.36 * Math.sin(dip);
  const head: Triple = [x, y + lift, z + reach];
  builder.bar("matte", coatPale, origin, head, 0.2, 6);
  builder.sphere(
    "matte",
    coatBrown,
    0.14,
    [head[0], head[1], head[2] + 0.06],
    [0.85, 0.85, 1.4],
    8,
  );
  builder.sphere(
    "matte",
    hoofDark,
    0.05,
    [head[0], head[1] - 0.04, head[2] + 0.24],
    [1, 0.8, 1],
    6,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      coatBrown,
      [0.13, 0.05, 0.07],
      [head[0] + side * 0.14, head[1] + 0.07, head[2] - 0.03],
      [0, 0, side * 0.4],
    );
    builder.sphere(
      "paint",
      palette.black,
      0.022,
      [head[0] + side * 0.085, head[1] + 0.05, head[2] + 0.12],
      [1, 1, 1],
      6,
    );
    /* Antlers: a curved beam sweeping back and up, with tines off it */
    const root: Triple = [head[0] + side * 0.06, head[1] + 0.1, head[2] - 0.02];
    const bend: Triple = [root[0] + side * 0.16, root[1] + 0.2, root[2] - 0.1];
    const tip: Triple = [bend[0] + side * 0.06, bend[1] + 0.24, bend[2] + 0.08];
    builder.bar("matte", antlerBone, root, bend, 0.04, 4);
    builder.bar("matte", antlerBone, bend, tip, 0.035, 4);
    builder.bar(
      "matte",
      antlerBone,
      bend,
      [bend[0] - side * 0.02, bend[1] + 0.12, bend[2] + 0.14],
      0.03,
      4,
    );
    builder.bar(
      "matte",
      antlerBone,
      tip,
      [tip[0] + side * 0.1, tip[1] + 0.06, tip[2] - 0.04],
      0.028,
      4,
    );
    builder.bar(
      "matte",
      antlerBone,
      root,
      [root[0] + side * 0.03, root[1] + 0.06, root[2] + 0.13],
      0.03,
      4,
    );
  });
};

/** A reindeer's body, legs and tail, standing at `at` and facing +z. */
const addReindeerBody = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.sphere(
    "matte",
    coatBrown,
    0.3,
    [x, y + 0.72, z],
    [0.82, 0.84, 1.55],
    10,
  );
  builder.sphere(
    "matte",
    coatPale,
    0.2,
    [x, y + 0.62, z + 0.18],
    [0.95, 0.8, 1.3],
    8,
  );
  builder.sphere(
    "matte",
    palette.white,
    0.07,
    [x, y + 0.8, z - 0.46],
    [1, 0.8, 0.8],
    6,
  );
  [-1, 1].forEach((side) => {
    [-0.3, 0.3].forEach((along) => {
      builder.bar(
        "matte",
        shade(coatBrown, 0.85),
        [x + side * 0.13, y + 0.6, z + along],
        [x + side * 0.13, y + 0.07, z + along],
        0.085,
        5,
      );
      builder.box(
        "matte",
        hoofDark,
        [0.1, 0.08, 0.12],
        [x + side * 0.13, y + 0.04, z + along + 0.01],
      );
    });
  });
};

const buildWanderingReindeer = (builder: AttractionBuilder) => {
  addReindeerBody(builder, [0, 0, 0]);
  addReindeerHead(builder, [0, 0.82, 0.32], 0.35);
};

const buildFence = (builder: AttractionBuilder) => {
  fencePosts.forEach((post, index) => {
    if (builder.isFar) {
      /* Far off, a plain rail between every other post is enough */
      if (index % 2 === 0 && index < postCount - 1) {
        const next = fencePosts[index + 1];
        builder.box(
          "matte",
          logTimber,
          [0.1, 0.9, Math.hypot(next.x - post.x, next.z - post.z)],
          [(post.x + next.x) / 2, 0.45, (post.z + next.z) / 2],
          [0, Math.atan2(next.x - post.x, next.z - post.z), 0],
        );
      }
      return;
    }
    builder.cylinder("matte", logTimber, {
      radius: 0.09,
      length: 1.05,
      at: [post.x, 0.52, post.z],
      segments: 8,
    });
    builder.cylinder("matte", snow, {
      radius: 0.1,
      radiusEnd: 0.05,
      length: 0.06,
      at: [post.x, 1.08, post.z],
      segments: 7,
    });
    if (index === postCount - 1) {
      return;
    }
    const next = fencePosts[index + 1];
    [0.42, 0.85].forEach((height) => {
      builder.bar(
        "matte",
        shade(logTimber, 1.1),
        [post.x, height, post.z],
        [next.x, height, next.z],
        0.1,
        6,
      );
    });
    builder.bar(
      "matte",
      snow,
      [post.x, 0.92, post.z],
      [next.x, 0.92, next.z],
      0.05,
      4,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* The gate, swung open on its post */
  const hinge = fencePosts[0];
  const end: Triple = [hinge.x - 0.5, 0, hinge.z + 1.3];
  [0.3, 0.6, 0.9].forEach((height) => {
    builder.bar(
      "matte",
      logEnd,
      [hinge.x, height, hinge.z],
      [end[0], height, end[2]],
      0.06,
      5,
    );
  });
  builder.bar(
    "matte",
    logEnd,
    [hinge.x, 0.3, hinge.z],
    [end[0], 0.9, end[2]],
    0.05,
    5,
  );
  builder.bar(
    "matte",
    logEnd,
    [end[0], 0.2, end[2]],
    [end[0], 1.0, end[2]],
    0.07,
    5,
  );
};

const buildShed = (builder: AttractionBuilder) => {
  const { x, z, width, depth } = shed;
  const front = 1.55;
  const back = 1.2;
  /* Plank walls on three sides, open to the front */
  builder.box(
    "matte",
    palette.timber,
    [width, back, 0.08],
    [x, back / 2, z - depth / 2],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(palette.timber, 0.92),
      [0.08, front, depth],
      [x + side * (width / 2), front / 2, z],
    );
  });
  /* A lean-to roof sloping to the back, thick with snow */
  const slope = Math.atan2(front - back, depth);
  builder.box(
    "matte",
    palette.darkTimber,
    [width + 0.3, 0.08, depth + 0.4],
    [x, (front + back) / 2 + 0.05, z],
    [slope, 0, 0],
  );
  addSoftBlock(
    builder,
    "matte",
    snow,
    [width + 0.34, 0.16, depth + 0.42],
    0.07,
    [x, (front + back) / 2 + 0.16, z],
    [slope, 0, 0],
  );
  if (builder.isFar) {
    return;
  }
  for (let plank = 0; plank < 7; plank++) {
    builder.box(
      "matte",
      shade(palette.timber, plank % 2 === 0 ? 0.85 : 1.08),
      [0.025, back - 0.05, 0.02],
      [
        x - width / 2 + 0.2 + plank * ((width - 0.4) / 6),
        back / 2,
        z - depth / 2 + 0.05,
      ],
    );
  }
  /* A hay rack on the back wall, and straw on the floor */
  builder.box(
    "matte",
    palette.darkTimber,
    [1.2, 0.05, 0.05],
    [x + 0.3, 0.95, z - depth / 2 + 0.2],
  );
  for (let slat = 0; slat < 7; slat++) {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x - 0.3 + slat * 0.2, 0.55, z - depth / 2 + 0.06],
      [x - 0.3 + slat * 0.2, 0.95, z - depth / 2 + 0.2],
      0.025,
      4,
    );
  }
  builder.sphere(
    "matte",
    palette.thatch,
    0.38,
    [x + 0.3, 0.72, z - depth / 2 + 0.14],
    [1.5, 0.45, 0.4],
    8,
  );
  builder.box(
    "matte",
    shade(palette.thatch, 0.9),
    [width - 0.2, 0.04, depth - 0.1],
    [x, 0.02, z],
  );
  /* Icicles hanging from the front of the roof */
  for (let icicle = 0; icicle < 9; icicle++) {
    const length = 0.12 + ((icicle * 7) % 5) * 0.04;
    builder.cylinder("glass", iceBlue, {
      radius: 0.025,
      radiusEnd: 0.002,
      length,
      at: [
        x - width / 2 + 0.1 + icicle * ((width - 0.2) / 8),
        front + 0.02 - length / 2,
        z + depth / 2 + 0.17,
      ],
      segments: 5,
    });
  }
};

const buildTroughs = (builder: AttractionBuilder) => {
  /* The feeding trough, heaped with lichen and moss */
  const { x, z } = trough;
  builder.box("matte", palette.timber, [1.3, 0.3, 0.5], [x, 0.5, z]);
  builder.box(
    "matte",
    shade(palette.timber, 0.75),
    [1.2, 0.04, 0.4],
    [x, 0.63, z],
  );
  [-0.55, 0.55].forEach((along) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 0.36, 0.5],
      [x + along, 0.18, z],
    );
  });
  if (!builder.isFar) {
    [
      { along: -0.4, across: 0.04, colour: lichen },
      { along: -0.1, across: -0.06, colour: moss },
      { along: 0.2, across: 0.05, colour: lichen },
      { along: 0.45, across: -0.04, colour: shade(lichen, 0.9) },
    ].forEach(({ along, across, colour }) => {
      builder.sphere(
        "matte",
        colour,
        0.17,
        [x + along, 0.66, z + across],
        [1.1, 0.5, 0.9],
        8,
      );
    });
    builder.box(
      "matte",
      palette.darkTimber,
      [1.36, 0.05, 0.06],
      [x, 0.66, z + 0.25],
    );
    builder.box(
      "matte",
      palette.darkTimber,
      [1.36, 0.05, 0.06],
      [x, 0.66, z - 0.25],
    );
  }
  /* A round water tub, its edge rimed with ice */
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.42,
    radiusEnd: 0.36,
    length: 0.5,
    at: [tub.x, 0.25, tub.z],
    segments: 16,
  });
  builder.cylinder("water", palette.water, {
    radius: 0.37,
    length: 0.03,
    at: [tub.x, 0.47, tub.z],
    segments: 16,
  });
  if (builder.isFar) {
    return;
  }
  [0.12, 0.38].forEach((height) => {
    builder.torus(
      "metal",
      palette.darkSteel,
      0.4 - height * 0.08,
      0.018,
      [tub.x, height, tub.z],
      "y",
      14,
    );
  });
  builder.torus("glass", iceBlue, 0.35, 0.03, [tub.x, 0.49, tub.z], "y", 18);
  builder.cylinder("glass", "#d7eef7", {
    radius: 0.12,
    length: 0.02,
    at: [tub.x + 0.12, 0.49, tub.z - 0.1],
    segments: 7,
  });
};

/** The red sleigh, built along its own +z and turned to face along the yard. */
const buildSleigh = (builder: AttractionBuilder) => {
  const turn = Math.PI / 2 - 0.25;
  const place = (x: number, y: number, z: number): Triple => [
    sleighAt[0] + x * Math.cos(turn) + z * Math.sin(turn),
    sleighAt[1] + y,
    sleighAt[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const rotation: Triple = [0, turn, 0];
  addSoftBlock(
    builder,
    "paint",
    sleighRed,
    [0.8, 0.42, 1.2],
    0.12,
    place(0, 0.58, -0.1),
    rotation,
  );
  addSoftBlock(
    builder,
    "paint",
    sleighRed,
    [0.8, 0.5, 0.32],
    0.12,
    place(0, 0.98, -0.6),
    rotation,
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    "#3b2a4f",
    [0.66, 0.1, 0.5],
    place(0, 0.82, -0.3),
    rotation,
  );
  builder.box("paint", gold, [0.84, 0.05, 1.22], place(0, 0.8, -0.1), rotation);
  builder.box(
    "paint",
    gold,
    [0.84, 0.05, 0.34],
    place(0, 1.24, -0.6),
    rotation,
  );
  /* The swan-necked front curling up over the runners */
  builder.add(
    "paint",
    sleighRed,
    new RoundedBoxGeometry(0.7, 0.36, 0.3, 1, 0.1).rotateX(0.5).rotateY(turn),
    { at: place(0, 0.62, 0.55) },
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      gold,
      0.07,
      place(side * 0.42, 0.72, 0.1),
      [0.4, 1, 1],
      8,
    );
    /* Runners: a long blade on struts, curling up at the front */
    builder.box(
      "metal",
      palette.darkSteel,
      [0.05, 0.04, 1.5],
      place(side * 0.34, 0.05, 0),
      rotation,
    );
    builder.torus(
      "metal",
      palette.darkSteel,
      0.18,
      0.025,
      place(side * 0.34, 0.23, 0.75),
      "x",
      12,
    );
    [-0.45, 0.05, 0.45].forEach((along) => {
      builder.box(
        "metal",
        palette.darkSteel,
        [0.04, 0.34, 0.04],
        place(side * 0.34, 0.22, along),
        rotation,
      );
    });
  });
  /* A sack of lichen and a lantern for the journey */
  builder.sphere(
    "matte",
    palette.cream,
    0.2,
    place(0.12, 0.98, -0.05),
    [1, 1.15, 1],
    8,
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.12, 0.04, 0.12],
    place(0.12, 1.2, -0.05),
    rotation,
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.1, 0.14, 0.1],
    place(-0.25, 1.0, 0.2),
    rotation,
  );
};

const buildYard = (builder: AttractionBuilder) => {
  builder.box("matte", snowShadow, [1.5, 0.02, 2.0], [0, 0.01, 3.9]);
  addSnowyPine(builder, [-4.4, 0, -1.5], 1.05);
  addSnowyPine(builder, [4.2, 0, -2.3], 0.95);
  addSnowyPine(builder, [3.9, 0, 2.3], 0.8);
  if (builder.isFar) {
    return;
  }
  /* Drifts of snow, lichen-crusted rocks and hoof prints */
  [
    [-3.6, 1.7, 0.6],
    [1.2, 4.2, 0.4],
    [-1.5, -4.6, 0.5],
    [4.6, 0.2, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snow, size, [x, 0, z], [1.5, 0.45, 1], 8);
  });
  [
    [-2.4, -2.4, 0.3],
    [2.7, -2.6, 0.24],
  ].forEach(([x, z, size]) => {
    builder.sphere(
      "matte",
      palette.stone,
      size,
      [x, size * 0.4, z],
      [1.2, 0.8, 1],
      8,
    );
    builder.sphere(
      "matte",
      lichen,
      size * 0.5,
      [x + size * 0.3, size * 0.8, z],
      [1.2, 0.4, 1],
      6,
    );
  });
  for (let step = 0; step < 6; step++) {
    const x = -0.3 + step * 0.32;
    const z = 1.6 - step * 0.35;
    [-0.06, 0.06].forEach((offset) => {
      builder.box(
        "matte",
        snowShadow,
        [0.05, 0.012, 0.09],
        [x + offset, 0.006, z],
        [0, 0.7, 0],
      );
    });
  }
  /* A bucket and a little wooden stool by the trough */
  builder.cylinder("metal", palette.steel, {
    radius: 0.14,
    radiusEnd: 0.11,
    length: 0.26,
    at: [0.55, 0.13, -0.8],
    segments: 12,
  });
  builder.torus(
    "metal",
    palette.darkSteel,
    0.13,
    0.01,
    [0.55, 0.3, -0.8],
    "x",
    12,
  );
};

export const reindeerPaddockModel: CuriosityModel = {
  kind: "reindeer-paddock",
  islandId: "frost-isle",
  name: "Reindeer Paddock",
  fact: "Reindeer, like all animals, need food, water and air to stay alive. In the snowy north they dig through the snow with their wide hooves to find a lichen called reindeer moss to eat, and they nibble snow for water. Their thick hairy coat traps air to keep them warm. They are the only deer where the females grow antlers too.",
  curriculumLink:
    "Science, Year 2: animals, including humans. Find out about and describe the basic needs of animals for survival (water, food and air).",
  footprint: 5.5,
  setting: "inland",
  padColour: "#e8eef2",
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildFence(builder);
    buildShed(builder);
    buildTroughs(builder);
    buildSleigh(builder);
    buildYard(builder);
    if (builder.isFar) {
      builder.sphere(
        "matte",
        coatBrown,
        0.3,
        [eater.x, 0.72, eater.z],
        [0.82, 0.84, 1.55],
        6,
      );
    } else {
      addReindeerBody(builder, [eater.x, 0, eater.z]);
    }
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "grazing reindeer's head",
      pivot: neckAt,
      build: (builder) => {
        addReindeerHead(builder, [0, 0, 0], 1.25);
      },
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.3, period: 1.8 },
    },
  ],
  wanderers: [
    {
      name: "reindeer",
      build: buildWanderingReindeer,
      count: 2,
      centre: { x: -1.3, z: -0.3 },
      radius: 1.3,
      speed: 0.3,
    },
  ],
  blockers: [
    ...fencePosts
      .slice(0, -1)
      .flatMap((post, index) =>
        listWallBlockers(post, fencePosts[index + 1], 0.2, 0.4),
      ),
    ...listWallBlockers(
      { x: shed.x - shed.width / 2, z: shed.z - 0.1 },
      { x: shed.x + shed.width / 2, z: shed.z - 0.1 },
      0.5,
      0.5,
    ),
    { x: trough.x, z: trough.z, radius: 0.7 },
    { x: eater.x, z: eater.z, radius: 0.45 },
    { x: tub.x, z: tub.z, radius: 0.45 },
    { x: sleighAt[0], z: sleighAt[2], radius: 0.85 },
    { x: -4.4, z: -1.5, radius: 0.45 },
    { x: 4.2, z: -2.3, radius: 0.4 },
    { x: 3.9, z: 2.3, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Feed the reindeer",
    news: "Crunch! The reindeer munched the lichen from your hand, slurped some water and snorted a puff of frosty breath.",
  },
};
