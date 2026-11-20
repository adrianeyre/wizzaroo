import { ConeGeometry, CylinderGeometry } from "three";
import {
  addSignBoard,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addBandedRock,
  addPalm,
  addPot,
  addRock,
  addScrub,
  addSlab,
  buildPerson,
  desert,
  followPath,
  paintBands,
  placeTurned,
} from "./sandstone-arches-parts.js";

/*
 * A Stone Age rock shelter: a great outcrop of banded sandstone with a
 * deep overhang, its curved back wall painted long ago with cattle,
 * giraffes, hunters and hand stencils in red and yellow ochre. Torches
 * light up as you come near, a campfire crackles at the front, a rock
 * hyrax peeps out, and stepping stones lead up and over the top.
 */

const signColour = "#8a3a22";
const signAt: Triple = [2.2, 0, 8.2];
const shelter = { x: 0, z: -1.4, radius: 3.3, height: 3.0 };
const wallFace = "#d9a46a";
const ochreRed = "#a8402a";
const ochreYellow = "#d9a23a";
const chalk = "#f2ead8";

/* ------------------------------------------------------------------ */
/* The outcrop                                                         */
/* ------------------------------------------------------------------ */

/** A point on the shelter's back wall, at an angle round it (π is straight back). */
const onWall = (angle: number, up: number, inset = 0): Triple => [
  shelter.x + Math.sin(angle) * (shelter.radius - inset),
  up,
  shelter.z + Math.cos(angle) * (shelter.radius - inset),
];

const buildOutcrop = (builder: AttractionBuilder) => {
  /* The smooth curved wall the paintings are on, facing in */
  builder.painted(
    new CylinderGeometry(
      shelter.radius,
      shelter.radius,
      shelter.height,
      builder.segments(24, 10),
      builder.isFar ? 2 : 8,
      true,
      Math.PI - 1.45,
      2.9,
    ).scale(-1, 1, 1),
    paintBands([wallFace, shade(wallFace, 0.95), "#cf9860", wallFace], 0.375),
    { at: [shelter.x, shelter.height / 2, shelter.z] },
    "matte",
  );
  /* The great overhang, its underside well above your head */
  addBandedRock(
    builder,
    [shelter.x, 3.3, shelter.z - 0.7],
    [4.4, 0.62, 3.2],
    2.4,
    2,
  );
  addBandedRock(
    builder,
    [shelter.x - 0.6, 3.85, shelter.z - 1.6],
    [3.0, 0.6, 2.2],
    5.1,
    1,
  );
  /* The rock mass all round the back and sides */
  const boulders = builder.isFar ? 6 : 9;
  for (let boulder = 0; boulder < boulders; boulder++) {
    const angle = Math.PI - 1.55 + (boulder / (boulders - 1)) * 3.1;
    const [x, , z] = onWall(angle, 0, -1.25);
    const tall = 1.5 + Math.sin(boulder * 1.9) * 0.25;
    addBandedRock(
      builder,
      [x, tall * 0.85, z],
      [1.45, tall, 1.3],
      boulder * 1.37 + 0.5,
      1,
    );
  }
  /* Fallen blocks at the foot of the cliff, and the floor of the shelter */
  builder.add(
    "matte",
    desert.dampSand,
    new CylinderGeometry(
      shelter.radius + 0.4,
      shelter.radius + 0.6,
      0.04,
      builder.segments(28, 12),
    ),
    { at: [shelter.x, 0.02, shelter.z] },
  );
  addBandedRock(builder, [-3.6, 0.4, 0.3], [0.9, 0.55, 0.8], 7.3);
  addBandedRock(builder, [3.7, 0.3, 0.3], [0.7, 0.5, 0.65], 8.1);
};

/* ------------------------------------------------------------------ */
/* The paintings                                                       */
/* ------------------------------------------------------------------ */

type Painter = (
  colour: string,
  from: [number, number],
  to: [number, number],
  thickness: number,
  out?: number,
) => void;

type Blobber = (
  colour: string,
  at: [number, number],
  size: [number, number],
  out?: number,
) => void;

/** Paints on the wall at an angle round it, with flat strokes in its own [across, up] units. */
const paintOnWall = (
  builder: AttractionBuilder,
  angle: number,
  up: number,
  draw: (stroke: Painter, blob: Blobber) => void,
) => {
  const at = onWall(angle, up, 0.01);
  const turn = angle + Math.PI;
  const point = ([u, v]: [number, number], out = 0): Triple =>
    placeTurned(at, turn, [u, v, out]);
  draw(
    (colour, from, to, thickness, out = 0.01) => {
      const [fromX, fromY, fromZ] = point(from, out);
      const [toX, toY, toZ] = point(to, out);
      const across = Math.hypot(toX - fromX, toZ - fromZ);
      const tilt = Math.atan2(to[1] - from[1], to[0] - from[0]);
      builder.box(
        "matte",
        colour,
        [Math.hypot(across, toY - fromY) + thickness * 0.6, thickness, 0.02],
        [(fromX + toX) / 2, (fromY + toY) / 2, (fromZ + toZ) / 2],
        [0, turn, tilt],
      );
    },
    (colour, centre, [wide, high], out = 0) => {
      builder.sphere(
        "matte",
        colour,
        1,
        point(centre, out),
        [wide, high, 0.012],
        8,
      );
    },
  );
};

const buildPaintings = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    [Math.PI - 0.6, Math.PI, Math.PI + 0.6].forEach((angle) => {
      paintOnWall(builder, angle, 1.6, (_, blob) => {
        blob(ochreRed, [0, 0], [0.5, 0.25]);
      });
    });
    return;
  }
  /* A herd of long-horned cattle across the middle */
  const cow = (angle: number, up: number, colour: string, patch: string) => {
    paintOnWall(builder, angle, up, (stroke, blob) => {
      blob(colour, [0, 0], [0.3, 0.13]);
      blob(patch, [0.08, 0.02], [0.1, 0.07], 0.008);
      blob(colour, [0.33, 0.06], [0.08, 0.06]);
      stroke(colour, [0.33, 0.1], [0.24, 0.26], 0.025);
      stroke(colour, [0.33, 0.1], [0.46, 0.25], 0.025);
      [-0.2, -0.1, 0.12, 0.22].forEach((leg) => {
        stroke(colour, [leg, -0.05], [leg + 0.02, -0.26], 0.035);
      });
      stroke(colour, [-0.29, 0.03], [-0.38, -0.15], 0.02);
    });
  };
  cow(Math.PI - 0.15, 1.45, ochreRed, chalk);
  cow(Math.PI + 0.22, 1.25, ochreRed, ochreYellow);
  cow(Math.PI - 0.5, 1.15, desert.charcoal, chalk);
  /* A tall giraffe */
  paintOnWall(builder, Math.PI + 0.62, 1.4, (stroke, blob) => {
    blob(ochreYellow, [0, 0], [0.22, 0.12]);
    stroke(ochreYellow, [0.15, 0.06], [0.32, 0.62], 0.06);
    blob(ochreYellow, [0.35, 0.66], [0.08, 0.05]);
    [-0.14, -0.06, 0.08, 0.15].forEach((leg) => {
      stroke(ochreYellow, [leg, -0.05], [leg, -0.42], 0.03);
    });
    [
      [-0.06, 0.02],
      [0.07, -0.02],
      [0.2, 0.3],
    ].forEach(([u, v]) => {
      blob(ochreRed, [u, v], [0.035, 0.03], 0.008);
    });
  });
  /* Hunters with bows */
  [-0.95, -0.8].forEach((angle, index) => {
    paintOnWall(
      builder,
      Math.PI + angle,
      1.35 + index * 0.1,
      (stroke, blob) => {
        blob(desert.charcoal, [0, 0.36], [0.045, 0.045]);
        stroke(desert.charcoal, [0, 0.32], [0, 0.08], 0.03);
        stroke(desert.charcoal, [0, 0.08], [-0.08, -0.18], 0.025);
        stroke(desert.charcoal, [0, 0.08], [0.09, -0.18], 0.025);
        stroke(desert.charcoal, [0, 0.26], [0.14, 0.18], 0.02);
        stroke(desert.charcoal, [0.15, 0.32], [0.17, 0.04], 0.015);
      },
    );
  });
  /* Hand stencils: paint blown round a hand pressed to the rock */
  [
    [Math.PI + 1.05, 1.0],
    [Math.PI + 1.18, 1.25],
    [Math.PI - 1.05, 1.1],
    [Math.PI - 0.88, 1.6],
  ].forEach(([angle, up], index) => {
    paintOnWall(builder, angle, up, (stroke, blob) => {
      blob(index % 2 === 0 ? ochreRed : ochreYellow, [0, 0.04], [0.17, 0.2]);
      blob(wallFace, [0, -0.02], [0.065, 0.075], 0.01);
      [-0.06, -0.025, 0.01, 0.045].forEach((finger, digit) => {
        stroke(
          wallFace,
          [finger, 0.03],
          [finger * 1.3, 0.13 + (digit === 1 || digit === 2 ? 0.02 : 0)],
          0.025,
          0.018,
        );
      });
      stroke(wallFace, [0.06, -0.02], [0.11, 0.04], 0.025, 0.018);
    });
  });
  /* Dots and a sun, in chalk white */
  paintOnWall(builder, Math.PI + 0.05, 2.15, (stroke, blob) => {
    blob(chalk, [0, 0], [0.09, 0.09]);
    for (let ray = 0; ray < 8; ray++) {
      const angle = (ray / 8) * Math.PI * 2;
      stroke(
        chalk,
        [Math.cos(angle) * 0.12, Math.sin(angle) * 0.12],
        [Math.cos(angle) * 0.2, Math.sin(angle) * 0.2],
        0.02,
      );
    }
    [-0.6, -0.45, 0.45, 0.6].forEach((u) => {
      blob(ochreRed, [u, -0.1], [0.03, 0.03]);
    });
  });
};

/* ------------------------------------------------------------------ */
/* The fire, the torches and the paint pots                            */
/* ------------------------------------------------------------------ */

const fire = { x: 0.5, z: 1.4 };
const torchAngles = [Math.PI - 0.82, Math.PI + 0.82];
const torchTop = (angle: number): Triple => onWall(angle, 1.95, 0.32);

const buildCamp = (builder: AttractionBuilder) => {
  const stones = builder.isFar ? 6 : 10;
  for (let stone = 0; stone < stones; stone++) {
    const angle = (stone / stones) * Math.PI * 2;
    addRock(
      builder,
      stone % 2 === 0 ? desert.darkSandstone : desert.redSandstone,
      [fire.x + Math.sin(angle) * 0.55, 0.08, fire.z + Math.cos(angle) * 0.55],
      [0.16, 0.12, 0.14],
      stone * 1.9,
      0,
    );
  }
  builder.box(
    "matte",
    desert.charcoal,
    [0.8, 0.03, 0.8],
    [fire.x, 0.02, fire.z],
  );
  [0.4, 1.4, 2.5].forEach((angle) => {
    builder.cylinder("matte", "#5a3a22", {
      radius: 0.06,
      length: 0.8,
      at: [fire.x, 0.08, fire.z],
      axis: "x",
      segments: 6,
    });
    builder.add(
      "matte",
      "#6a4628",
      new CylinderGeometry(0.06, 0.06, 0.8, builder.segments(6, 4))
        .rotateZ(Math.PI / 2)
        .rotateY(angle),
      { at: [fire.x, 0.12, fire.z] },
    );
  });
  /* Torches fixed to the wall beside the paintings */
  torchAngles.forEach((angle) => {
    const top = torchTop(angle);
    const foot = onWall(angle, 1.1, 0.04);
    builder.bar("matte", desert.darkTimber, foot, top, 0.07, 6);
    builder.cylinder("matte", "#3a2a1a", {
      radius: 0.07,
      radiusEnd: 0.09,
      length: 0.14,
      at: top,
      segments: 8,
    });
  });
  /* Grinding stones and shells of ground ochre paint */
  const paints = [ochreRed, ochreYellow, desert.charcoal, chalk];
  paints.forEach((colour, index) => {
    const [x, , z] = onWall(Math.PI - 0.3 + index * 0.22, 0, 0.9);
    builder.cylinder("matte", desert.paleSandstone, {
      radius: 0.16,
      radiusEnd: 0.12,
      length: 0.1,
      at: [x, 0.05, z],
      segments: 10,
    });
    builder.cylinder("matte", colour, {
      radius: 0.11,
      length: 0.02,
      at: [x, 0.1, z],
      segments: 10,
    });
  });
  const [stoneX, , stoneZ] = onWall(Math.PI + 0.45, 0, 1.0);
  builder.box(
    "matte",
    desert.paleSandstone,
    [0.7, 0.12, 0.45],
    [stoneX, 0.06, stoneZ],
    [0, 0.4, 0],
  );
  builder.sphere(
    "matte",
    desert.darkSandstone,
    0.11,
    [stoneX + 0.1, 0.18, stoneZ],
    [1.3, 0.8, 1],
    8,
  );
  builder.sphere(
    "matte",
    ochreRed,
    0.12,
    [stoneX - 0.15, 0.14, stoneZ + 0.05],
    [1, 0.4, 0.8],
    8,
  );
  /* A hide drying on a frame, and pots by the wall */
  builder.bar(
    "matte",
    desert.darkTimber,
    [-3.0, 0, 2.6],
    [-3.0, 1.5, 2.6],
    0.06,
    6,
  );
  builder.bar(
    "matte",
    desert.darkTimber,
    [-1.8, 0, 2.9],
    [-1.8, 1.5, 2.9],
    0.06,
    6,
  );
  builder.bar(
    "matte",
    desert.darkTimber,
    [-3.05, 1.45, 2.6],
    [-1.75, 1.45, 2.9],
    0.05,
    6,
  );
  addSlab(
    builder,
    "matte",
    "#a8784a",
    [-2.95, 1.42, 2.62],
    [-1.85, 1.42, 2.88],
    0.9,
    0.03,
  );
  builder.box(
    "matte",
    "#a8784a",
    [1.0, 0.9, 0.03],
    [-2.4, 0.97, 2.75],
    [0, -0.23, 0],
  );
  addPot(builder, onWall(Math.PI + 1.2, 0, 0.6), 0.45, "#8a5a3a");
  addPot(builder, onWall(Math.PI - 1.25, 0, 0.6), 0.5, "#9a6a42", true);
};

/* ------------------------------------------------------------------ */
/* The grounds and the stepping stones                                 */
/* ------------------------------------------------------------------ */

const steppingStones: { at: Triple; size: Triple }[] = [
  { at: [4.55, 0.25, 0.0], size: [0.55, 0.38, 0.5] },
  { at: [4.85, 0.6, -1.0], size: [0.6, 0.7, 0.6] },
  { at: [4.6, 1.2, -2.1], size: [0.7, 1.1, 0.7] },
  { at: [-4.7, 0.95, -1.9], size: [0.7, 1.0, 0.7] },
  { at: [-4.7, 0.45, -0.7], size: [0.6, 0.55, 0.55] },
];

const hyraxRock = { x: -3.0, z: 4.6 };

const buildGrounds = (builder: AttractionBuilder) => {
  steppingStones.forEach(({ at, size }, index) => {
    addBandedRock(builder, at, size, 11 + index * 1.3);
  });
  addBandedRock(
    builder,
    [hyraxRock.x, 0.2, hyraxRock.z],
    [0.7, 0.45, 0.6],
    3.7,
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      desert.charcoal,
      [0.4, 0.05, 0.1],
      [hyraxRock.x, 0.6, hyraxRock.z + 0.05],
    );
    /* A little cairn of stones on the very top */
    [0.32, 0.25, 0.18].forEach((size, index) => {
      addRock(
        builder,
        desert.paleSandstone,
        [-0.4, 4.45 + index * 0.3, -2.6],
        [size, size * 0.7, size],
        index * 3.1,
        0,
      );
    });
  }
  /* A sandy path from the sign to the shelter */
  addSlab(
    builder,
    "matte",
    desert.paleSand,
    [signAt[0], 0.02, signAt[2] - 0.4],
    [0.8, 0.02, 2.6],
    1.4,
    0.03,
  );
  addPalm(builder, [6.8, 0, 1.4], 3.6, [-0.12, 0.06], 0.4);
  addPalm(builder, [-6.6, 0, 2.4], 3.2, [0.1, -0.06], 1.5);
  addPalm(builder, [-5.6, 0, 6.4], 2.8, [0.08, -0.1], 2.6);
  [
    [5.2, 5.4, 0.45],
    [-1.2, 6.8, 0.38],
    [7.4, -3.2, 0.42],
    [-7.6, -2.0, 0.45],
    [2.0, -7.6, 0.5],
    [-3.2, -7.4, 0.4],
  ].forEach(([x, z, size], index) => {
    addScrub(
      builder,
      [x, 0, z],
      size,
      index % 2 === 0 ? desert.scrub : "#93a052",
    );
  });
  if (!builder.isFar) {
    [
      [3.4, 3.6],
      [-4.6, 4.2],
      [6.2, -1.2],
      [0.6, 5.8],
      [-7.0, 0.4],
    ].forEach(([x, z], index) => {
      addRock(
        builder,
        index % 2 === 0 ? desert.redSandstone : desert.paleSandstone,
        [x, 0.08, z],
        [0.24, 0.16, 0.2],
        index * 2.9 + 4,
      );
    });
  }
  addSignBoard(builder, signAt, signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts and wanderers                                          */
/* ------------------------------------------------------------------ */

const buildFlame = (scale: number) => (builder: AttractionBuilder) => {
  builder.add(
    "glow",
    desert.flame,
    new ConeGeometry(0.16 * scale, 0.5 * scale, builder.segments(8, 4)),
    { at: [0, 0.25 * scale, 0] },
  );
  builder.add(
    "glow",
    "#ffe08a",
    new ConeGeometry(0.09 * scale, 0.32 * scale, builder.segments(8, 4)),
    { at: [0.02 * scale, 0.18 * scale, 0.03 * scale] },
  );
};

const buildCampfireFlames = (builder: AttractionBuilder) => {
  [
    [0, 0, 1.2],
    [-0.15, 0.08, 0.8],
    [0.14, -0.06, 0.85],
  ].forEach(([x, z, scale]) => {
    builder.add(
      "glow",
      desert.flame,
      new ConeGeometry(0.16 * scale, 0.55 * scale, builder.segments(8, 4)),
      { at: [x, 0.27 * scale, z] },
    );
  });
  builder.add(
    "glow",
    "#ffe08a",
    new ConeGeometry(0.1, 0.4, builder.segments(8, 4)),
    { at: [0, 0.2, 0] },
  );
};

const buildHyrax = (builder: AttractionBuilder) => {
  const fur = "#8a6a4a";
  builder.sphere("matte", fur, 0.16, [0, 0.12, 0], [0.9, 0.8, 1.2], 9);
  builder.sphere(
    "matte",
    shade(fur, 1.1),
    0.1,
    [0, 0.22, 0.15],
    [1, 0.95, 1.05],
    9,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      shade(fur, 0.8),
      0.03,
      [side * 0.06, 0.31, 0.12],
      [1, 1, 0.6],
      5,
    );
    builder.sphere(
      "paint",
      desert.charcoal,
      0.018,
      [side * 0.045, 0.25, 0.23],
      [1, 1, 1],
      5,
    );
  });
  builder.sphere(
    "matte",
    desert.charcoal,
    0.014,
    [0, 0.21, 0.25],
    [1, 1, 1],
    4,
  );
};

const buildGoat = (builder: AttractionBuilder) => {
  const coat = "#e8dcc4";
  const sides = builder.isFar ? 5 : 8;
  builder.sphere("matte", coat, 0.2, [0, 0.45, 0], [0.75, 0.7, 1.3], sides);
  builder.sphere("matte", coat, 0.1, [0, 0.62, 0.3], [0.85, 0.9, 1.3], sides);
  builder.bar(
    "matte",
    "#5a4a3a",
    [-0.04, 0.7, 0.28],
    [-0.08, 0.82, 0.18],
    0.03,
    4,
  );
  builder.bar(
    "matte",
    "#5a4a3a",
    [0.04, 0.7, 0.28],
    [0.08, 0.82, 0.18],
    0.03,
    4,
  );
  [
    [-0.08, 0.15],
    [0.08, 0.15],
    [-0.08, -0.15],
    [0.08, -0.15],
  ].forEach(([x, z]) => {
    builder.bar("matte", shade(coat, 0.8), [x, 0.35, z], [x, 0, z], 0.05, 4);
  });
  builder.bar("matte", coat, [0, 0.5, -0.24], [0, 0.6, -0.32], 0.04, 4);
};

/* ------------------------------------------------------------------ */
/* The scramble up and over the outcrop                                */
/* ------------------------------------------------------------------ */

const rideStart = { x: 5.3, z: 0.9 };
const rideFinish = { x: -4.9, z: 0.6 };

const overTheTop: Triple[] = [
  [rideStart.x, 0, rideStart.z],
  [4.55, 0.65, 0.0],
  [4.85, 1.32, -1.0],
  [4.6, 2.32, -2.1],
  [3.4, 3.3, -2.6],
  [1.6, 3.95, -2.9],
  [-0.4, 4.4, -2.9],
  [-2.2, 4.0, -2.8],
  [-3.6, 3.3, -2.5],
  [-4.7, 1.97, -1.9],
  [-4.7, 1.02, -0.7],
  [rideFinish.x, 0, rideFinish.z],
];

const scrambleRide = (progress: number, seconds: number): LocalSpot => {
  /* A pause at the top by the cairn, to look out over the sands */
  const share =
    progress < 0.4
      ? progress * 1.25
      : progress < 0.55
        ? 0.5
        : 0.5 + (progress - 0.55) * (0.5 / 0.45);
  const spot = followPath(overTheTop, share);
  const isLooking = progress >= 0.4 && progress < 0.55;
  return {
    ...spot,
    heading: isLooking ? Math.sin(seconds * 0.8) * 1.2 : spot.heading,
  };
};

const shelterBlockers: LocalBlocker[] = Array.from(
  { length: 9 },
  (_, index) => {
    const angle = Math.PI - 1.55 + (index / 8) * 3.1;
    const [x, , z] = onWall(angle, 0, -0.9);
    return { x, z, radius: 1.0 };
  },
);

export const paintedCaveModel: NewLandAttractionModel = {
  kind: "painted-cave",
  islandId: "sunscorch-sands",
  name: "Painted Cave",
  fact: "Thousands of years ago, Stone Age people painted cattle, giraffes and hunters on the walls of caves and rock shelters. They made paint by grinding coloured rocks such as red and yellow ochre into powder and mixing it with water or fat. Paintings like these in the Sahara show it was once green, with rivers and grassland.",
  curriculumLink:
    "History, Key Stage 2: changes in Britain from the Stone Age to the Iron Age. How Stone Age people lived, hunted and made art.",
  footprint: 10,
  setting: "inland",
  padColour: desert.sand,
  signSpot: { x: signAt[0], z: signAt[2] + 0.9 },
  build: (builder) => {
    buildOutcrop(builder);
    buildPaintings(builder);
    buildCamp(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "campfire",
      pivot: [fire.x, 0.05, fire.z],
      build: buildCampfireFlames,
      motion: { kind: "flicker", period: 0.5 },
    },
    ...torchAngles.map((angle, index): MovingPart => {
      const [x, y, z] = torchTop(angle);
      return {
        name: `torch-${String(index)}`,
        pivot: [x, y + 0.07, z],
        build: buildFlame(1),
        motion: { kind: "wake", reach: 4.5 },
      };
    }),
    {
      name: "hyrax",
      pivot: [hyraxRock.x, 0.12, hyraxRock.z + 0.05],
      build: buildHyrax,
      motion: { kind: "rise", reach: 3.5, height: 0.48, period: 1.5 },
    },
  ],
  wanderers: [
    {
      name: "stone-age-family",
      build: buildPerson({
        skin: "#a8704a",
        top: "#9a6a3a",
        bottom: "#7a5232",
        hair: "#1a1008",
      }),
      count: 2,
      centre: { x: 0.4, z: 4.2 },
      radius: 1.8,
      speed: 0.25,
    },
    {
      name: "goats",
      build: buildGoat,
      count: 2,
      centre: { x: 3.6, z: 5.6 },
      radius: 1.5,
      speed: 0.3,
    },
  ],
  smoke: [
    {
      at: [fire.x, 0.7, fire.z],
      colour: "#cfc8bf",
      puffs: 6,
      size: 0.35,
      rise: 2.6,
      spread: 0.45,
    },
  ],
  blockers: [
    ...shelterBlockers,
    { x: fire.x, z: fire.z, radius: 0.65 },
    { x: hyraxRock.x, z: hyraxRock.z, radius: 0.55 },
  ],
  rides: [
    {
      id: "over-the-top",
      name: "the rocks over the Painted Cave",
      start: rideStart,
      reach: 0.6,
      seconds: 14,
      finish: rideFinish,
      follow: scrambleRide,
    },
  ],
  play: {
    label: "Blow a hand stencil",
    news: "Pfff! You blew red ochre paint all round your hand, and left your handprint on the rock, just as Stone Age artists did.",
  },
};
