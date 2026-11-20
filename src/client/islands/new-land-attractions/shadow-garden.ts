import { ExtrudeGeometry, Shape } from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type PlayRide,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

/*
 * A garden all about light and shadow. A great sundial's gnomon casts
 * a shadow that swings round as the Sun crosses the sky. Silver
 * cut-outs of a star, a rocket and a cat stand on posts, each with its
 * own dark shadow, the very same shape, lying on the lawn. On the
 * shadow stage a lamp shines on a big white screen where shadow
 * puppets dance; the Character can step up and put on a shadow show.
 * A slatted pergola paints stripes of shade across the path, and a
 * zoetrope spins up as you come near.
 */

const midnight = "#1b2350";
const silver = "#c9cfd8";
const shadowInk = "#20223a";
const dialStone = "#d9d4c8";
const paving = "#b9bccb";
const screenWhite = "#f6f3ea";
const glowCyan = "#7ff3ff";
const glowViolet = "#b48cff";
const sunGold = "#ffc84a";
const hedge = "#2f6b3c";
const signColour = "#2b2f6b";

const footprint = 9;

/* The sundial */
const dial = { x: -2.7, z: -1.4 };
const dialRadius = 1.45;
const dialTop = 0.4;
const sunReach = 3.0;
const sunSouth = 1.4;
const sunSwing = 0.9;
const sunPeriod = 16;

/* The shadow stage */
const stage = { minX: 1.2, maxX: 4.6, minZ: -5.2, maxZ: -3.0 };
const stageTop = 0.45;
const stageMiddle = (stage.minX + stage.maxX) / 2;

/* The pergola over the path */
const pergola = { x: 0.6, fromZ: 1.4, toZ: 5.0 };
const pergolaHalf = 0.85;

const flatShape = (points: readonly (readonly [number, number])[]): Shape => {
  const shape = new Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  });
  return shape;
};

const starShape = (): Shape =>
  flatShape(
    Array.from({ length: 11 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2;
      const reach = index % 2 === 0 ? 0.55 : 0.24;
      return [Math.sin(angle) * reach, Math.cos(angle) * reach] as const;
    }),
  );

const rocketShape = (): Shape =>
  flatShape([
    [0, 0.75],
    [0.18, 0.45],
    [0.2, -0.25],
    [0.38, -0.5],
    [0.2, -0.45],
    [0.12, -0.6],
    [-0.12, -0.6],
    [-0.2, -0.45],
    [-0.38, -0.5],
    [-0.2, -0.25],
    [-0.18, 0.45],
    [0, 0.75],
  ]);

const catShape = (): Shape =>
  flatShape([
    [-0.4, -0.5],
    [-0.35, 0.05],
    [-0.25, 0.3],
    [-0.3, 0.6],
    [-0.15, 0.42],
    [0.0, 0.45],
    [0.15, 0.42],
    [0.3, 0.6],
    [0.25, 0.3],
    [0.32, 0.0],
    [0.4, -0.5],
    [0.55, -0.4],
    [0.62, -0.1],
    [0.5, -0.55],
    [-0.4, -0.5],
  ]);

const rabbitShape = (): Shape =>
  flatShape([
    [-0.3, -0.3],
    [-0.35, 0.0],
    [-0.15, 0.15],
    [-0.2, 0.55],
    [-0.08, 0.6],
    [-0.02, 0.22],
    [0.05, 0.6],
    [0.17, 0.55],
    [0.08, 0.15],
    [0.25, 0.05],
    [0.32, -0.3],
    [-0.3, -0.3],
  ]);

const birdShape = (): Shape =>
  flatShape([
    [-0.5, 0.05],
    [-0.2, 0.1],
    [0.0, 0.4],
    [0.1, 0.12],
    [0.4, 0.15],
    [0.5, 0.05],
    [0.4, 0.0],
    [0.1, -0.05],
    [-0.1, -0.15],
    [-0.5, 0.05],
  ]);

const addCutout = (
  builder: AttractionBuilder,
  finish: "metal" | "matte" | "paint",
  colour: string,
  shape: Shape,
  at: Triple,
  rotation: Triple,
  scale: Triple = [1, 1, 1],
  depth = 0.04,
) => {
  builder.add(
    finish,
    colour,
    new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 4,
    }).translate(0, 0, -depth / 2),
    { at, rotation, scale },
  );
};

/* The sundial */

const buildSundial = (builder: AttractionBuilder) => {
  const { x, z } = dial;
  builder.cylinder("matte", shade(dialStone, 0.85), {
    radius: dialRadius + 0.15,
    length: 0.18,
    at: [x, 0.09, z],
    segments: builder.segments(32, 14),
  });
  builder.cylinder("matte", dialStone, {
    radius: dialRadius,
    length: dialTop - 0.18,
    at: [x, 0.18 + (dialTop - 0.18) / 2, z],
    segments: builder.segments(32, 14),
  });
  /* The gnomon: a tall triangle of brass pointing north, towards -z */
  addCutout(
    builder,
    "metal",
    palette.brass,
    flatShape([
      [0, 0],
      [1.2, 0],
      [0, 1.4],
      [0, 0],
    ]),
    [x, dialTop, z + 0.35],
    [0, Math.PI / 2, 0],
    [1, 1, 1],
    0.08,
  );
  if (builder.isFar) {
    return;
  }
  /* Hour marks and numbers round the dial */
  for (let hour = 0; hour < 13; hour++) {
    const angle = -Math.PI / 2 - 0.4 + (hour / 12) * (Math.PI + 0.8);
    const reach = dialRadius - 0.18;
    builder.box(
      "paint",
      midnight,
      [0.05, 0.015, hour % 3 === 0 ? 0.26 : 0.16],
      [
        x + Math.sin(angle) * reach,
        dialTop + 0.005,
        z - Math.cos(angle) * reach,
      ],
      [0, -angle, 0],
    );
    if (hour % 3 === 0) {
      builder.sphere(
        "metal",
        palette.brass,
        0.05,
        [
          x + Math.sin(angle) * (reach - 0.26),
          dialTop + 0.01,
          z - Math.cos(angle) * (reach - 0.26),
        ],
        [1, 0.3, 1],
        6,
      );
    }
  }
  builder.torus(
    "metal",
    palette.brass,
    dialRadius - 0.04,
    0.025,
    [x, dialTop, z],
    "y",
    32,
  );
  /* Four steps of paving round about */
  for (let slab = 0; slab < 12; slab++) {
    const angle = (slab / 12) * Math.PI * 2;
    builder.box(
      "matte",
      slab % 2 === 0 ? paving : shade(paving, 0.92),
      [0.62, 0.03, 0.42],
      [
        x + Math.sin(angle) * (dialRadius + 0.5),
        0.015,
        z + Math.cos(angle) * (dialRadius + 0.5),
      ],
      [0, angle, 0],
    );
  }
};

/* Cut-out shapes and their shadows */

interface Cutout {
  x: number;
  z: number;
  turn: number;
  shape: () => Shape;
  colour: string;
}

const cutouts: readonly Cutout[] = [
  { x: -4.4, z: 4.6, turn: 0.5, shape: starShape, colour: sunGold },
  { x: -2.6, z: 3.6, turn: 0.1, shape: rocketShape, colour: silver },
  { x: 4.9, z: 1.0, turn: -0.6, shape: catShape, colour: "#3a3a4a" },
];

const buildCutouts = (builder: AttractionBuilder) => {
  cutouts.forEach(({ x, z, turn, shape, colour }) => {
    const height = 1.7;
    builder.cylinder("metal", silver, {
      radius: 0.04,
      length: height,
      at: [x, height / 2, z],
      segments: 6,
    });
    builder.cylinder("matte", palette.darkStone, {
      radius: 0.2,
      length: 0.12,
      at: [x, 0.06, z],
      segments: 8,
    });
    addCutout(
      builder,
      colour === silver ? "metal" : "paint",
      colour,
      shape(),
      [x, height + 0.55, z],
      [0, turn, 0],
      [1.2, 1.2, 1],
      0.06,
    );
    /* Its shadow: the very same shape, stretched out on the lawn to the north */
    builder.box("matte", shadowInk, [0.07, 0.01, 2.0], [x, 0.02, z - 1.0]);
    addCutout(
      builder,
      "matte",
      shadowInk,
      shape(),
      [x, 0.02, z - 2.9],
      [-Math.PI / 2, 0, 0],
      [1.2 * Math.max(0.5, Math.abs(Math.cos(turn))), 1.6, 1],
      0.01,
    );
  });
};

/* The shadow stage */

const buildStage = (builder: AttractionBuilder) => {
  const width = stage.maxX - stage.minX;
  const depth = stage.maxZ - stage.minZ;
  const middleZ = (stage.minZ + stage.maxZ) / 2;
  builder.box(
    "paint",
    midnight,
    [width, stageTop, depth],
    [stageMiddle, stageTop / 2, middleZ],
  );
  builder.box(
    "matte",
    "#8a6a4a",
    [width + 0.06, 0.05, depth + 0.06],
    [stageMiddle, stageTop, middleZ],
  );
  /* Steps up at the side */
  builder.box(
    "matte",
    "#8a6a4a",
    [0.5, stageTop / 2, 1.2],
    [stage.minX - 0.25, stageTop / 4, middleZ],
  );
  /* The big white screen across the front, in a frame of silver posts */
  const screenFrom = stage.minX + 0.35;
  const screenTo = stage.maxX - 0.35;
  builder.box(
    "paint",
    screenWhite,
    [screenTo - screenFrom, 1.9, 0.05],
    [stageMiddle, stageTop + 0.15 + 0.95, stage.maxZ - 0.15],
  );
  [screenFrom - 0.06, screenTo + 0.06].forEach((x) => {
    builder.cylinder("metal", silver, {
      radius: 0.06,
      length: 2.4,
      at: [x, stageTop + 1.2, stage.maxZ - 0.15],
      segments: 8,
    });
    builder.sphere(
      "glow",
      glowViolet,
      0.1,
      [x, stageTop + 2.46, stage.maxZ - 0.15],
      [1, 1, 1],
      8,
    );
  });
  builder.box(
    "metal",
    silver,
    [screenTo - screenFrom + 0.2, 0.08, 0.08],
    [stageMiddle, stageTop + 2.1, stage.maxZ - 0.15],
  );
  /* A curtain swag along the top */
  builder.box(
    "matte",
    "#6a2a5a",
    [screenTo - screenFrom + 0.3, 0.3, 0.06],
    [stageMiddle, stageTop + 2.25, stage.maxZ - 0.1],
  );
  /* The great lamp at the back, on its stand */
  const lampAt: Triple = [stageMiddle, stageTop + 1.4, stage.minZ + 0.35];
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 1.2,
    at: [lampAt[0], stageTop + 0.6, lampAt[2]],
    segments: 6,
  });
  builder.cylinder("paint", midnight, {
    radius: 0.32,
    radiusEnd: 0.22,
    length: 0.5,
    at: [lampAt[0], lampAt[1], lampAt[2] - 0.1],
    axis: "z",
    segments: 14,
  });
  builder.torus(
    "metal",
    silver,
    0.33,
    0.04,
    [lampAt[0], lampAt[1], lampAt[2] + 0.15],
    "z",
    14,
  );
  if (builder.isFar) {
    return;
  }
  /* The real puppets, waiting on hooks behind the screen */
  addCutout(
    builder,
    "paint",
    "#c86a4a",
    rabbitShape(),
    [stage.minX + 0.4, stageTop + 1.6, stage.minZ + 0.1],
    [0, 0, 0],
    [0.8, 0.8, 1],
  );
  addCutout(
    builder,
    "paint",
    "#4a8ac8",
    birdShape(),
    [stage.maxX - 0.5, stageTop + 1.7, stage.minZ + 0.1],
    [0, 0, 0],
    [0.8, 0.8, 1],
  );
  /* Footlights along the front edge */
  for (let light = 0; light < 6; light++) {
    builder.sphere(
      "glow",
      light % 2 === 0 ? glowCyan : sunGold,
      0.06,
      [
        stage.minX + 0.3 + light * ((width - 0.6) / 5),
        stageTop + 0.06,
        stage.maxZ + 0.02,
      ],
      [1, 0.6, 1],
      6,
    );
  }
};

/* The pergola, with its stripes of shade */

const buildPergola = (builder: AttractionBuilder) => {
  const length = pergola.toZ - pergola.fromZ;
  const middleZ = (pergola.fromZ + pergola.toZ) / 2;
  builder.box(
    "matte",
    paving,
    [pergolaHalf * 2 + 0.2, 0.03, 8.2],
    [pergola.x, 0.015, 3.4],
  );
  const posts = builder.isFar ? 2 : 4;
  for (let post = 0; post < posts; post++) {
    const z = pergola.fromZ + (post / (posts - 1)) * length;
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        palette.white,
        [0.14, 2.4, 0.14],
        [pergola.x + side * pergolaHalf, 1.2, z],
      );
    });
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.white,
      [0.12, 0.16, length + 0.4],
      [pergola.x + side * pergolaHalf, 2.45, middleZ],
    );
  });
  const slats = builder.isFar ? 4 : 11;
  for (let slat = 0; slat < slats; slat++) {
    const z = pergola.fromZ - 0.1 + (slat / (slats - 1)) * (length + 0.2);
    builder.box(
      "paint",
      palette.white,
      [pergolaHalf * 2 + 0.5, 0.1, 0.12],
      [pergola.x, 2.58, z],
    );
    if (!builder.isFar) {
      /* Its stripe of shade on the path below, shifted by the slanting Sun */
      builder.box(
        "matte",
        shade(paving, 0.62),
        [pergolaHalf * 2 - 0.1, 0.008, 0.14],
        [pergola.x + 0.15, 0.035, z + 0.25],
      );
    }
  }
  if (builder.isFar) {
    return;
  }
  /* Climbing roses and wisteria on the posts */
  [pergola.fromZ, pergola.toZ].forEach((z) => {
    [-1, 1].forEach((side) => {
      [0.6, 1.2, 1.8, 2.4].forEach((up, index) => {
        builder.sphere(
          "matte",
          index % 2 === 0 ? hedge : "#9a6ad0",
          0.16,
          [pergola.x + side * (pergolaHalf + 0.08), up, z + 0.1],
          [1, 1.2, 1],
          6,
        );
      });
    });
  });
};

/* The rest of the garden */

const zoetropeAt = { x: 4.3, z: 3.6 };

const buildGarden = (builder: AttractionBuilder) => {
  /* The zoetrope's pedestal */
  builder.cylinder("paint", midnight, {
    radius: 0.25,
    radiusEnd: 0.32,
    length: 0.9,
    at: [zoetropeAt.x, 0.45, zoetropeAt.z],
    segments: 12,
  });
  /* Benches for watching the shadow show */
  addBench(builder, [stageMiddle - 0.8, 0, -1.2], Math.PI, midnight);
  addBench(builder, [stageMiddle + 0.9, 0, -1.2], Math.PI, midnight);
  /* Clipped topiary: a ball and a cone, each with its shadow */
  const topiary: [number, number, "ball" | "cone"][] = [
    [-5.4, -2.8, "ball"],
    [-0.6, -4.6, "cone"],
    [5.8, -1.6, "cone"],
  ];
  topiary.forEach(([x, z, kind]) => {
    builder.cylinder("matte", "#7a5a3a", {
      radius: 0.22,
      radiusEnd: 0.18,
      length: 0.3,
      at: [x, 0.15, z],
      segments: 8,
    });
    if (kind === "ball") {
      builder.sphere("matte", hedge, 0.6, [x, 0.9, z], [1, 1, 1], 12);
      builder.cylinder("matte", shadowInk, {
        radius: 0.6,
        length: 0.01,
        at: [x - 0.5, 0.02, z - 0.6],
        segments: 12,
      });
    } else {
      builder.cylinder("matte", hedge, {
        radius: 0.55,
        radiusEnd: 0.05,
        length: 1.8,
        at: [x, 1.2, z],
        segments: 12,
      });
      builder.add(
        "matte",
        shadowInk,
        new ExtrudeGeometry(
          flatShape([
            [-0.5, 0],
            [0.5, 0],
            [0, 1.9],
            [-0.5, 0],
          ]),
          { depth: 0.01, bevelEnabled: false },
        ),
        { at: [x, 0.02, z], rotation: [-Math.PI / 2, 0, 0] },
      );
    }
  });
  addBush(builder, [-5.8, 0, 3.4], 0.55, hedge);
  addBush(builder, [5.6, 0, 4.4], 0.5, shade(hedge, 1.15));
  if (builder.isFar) {
    return;
  }
  /* Glowing path lights shaped like little moons */
  [
    [-0.6, 6.4],
    [1.8, 6.4],
    [-0.6, 0.6],
    [1.8, 0.6],
  ].forEach(([x, z]) => {
    builder.cylinder("paint", midnight, {
      radius: 0.06,
      length: 0.6,
      at: [x, 0.3, z],
      segments: 6,
    });
    builder.sphere("glow", glowCyan, 0.13, [x, 0.66, z], [1, 1, 1], 8);
  });
  /* A sign of the compass on the paving: N, E, S, W points */
  [0, 1, 2, 3].forEach((point) => {
    const angle = (point / 4) * Math.PI * 2;
    builder.box(
      "paint",
      point === 2 ? "#c8102e" : midnight,
      [0.08, 0.012, 0.36],
      [
        dial.x + Math.sin(angle) * (dialRadius + 1.0),
        0.035,
        dial.z + Math.cos(angle) * (dialRadius + 1.0),
      ],
      [0, angle, 0],
    );
  });
};

/* Which things let light through? A lamp shines on three panes */

const panes = { x: -5.2, z: -0.4 };

const buildPanes = (builder: AttractionBuilder) => {
  const { x, z } = panes;
  /* A bench-top on legs, with a torch-lamp at one end */
  builder.box("matte", "#8a6a4a", [0.9, 0.08, 2.6], [x, 0.7, z]);
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      builder.box(
        "matte",
        "#5a3a22",
        [0.07, 0.66, 0.07],
        [x + sx * 0.38, 0.33, z + sz * 1.2],
      );
    });
  });
  builder.cylinder("paint", midnight, {
    radius: 0.14,
    radiusEnd: 0.09,
    length: 0.34,
    at: [x, 0.92, z - 1.1],
    axis: "z",
    segments: 10,
  });
  builder.cylinder("glow", "#fff4c8", {
    radius: 0.13,
    length: 0.02,
    at: [x, 0.92, z - 0.92],
    axis: "z",
    segments: 10,
  });
  /* Clear glass, frosted paper and solid wood, each with the shadow it makes */
  const kinds: {
    along: number;
    finish: "glass" | "matte";
    colour: string;
    shadow: number;
  }[] = [
    { along: -0.45, finish: "glass", colour: "#cfe6f2", shadow: 0.96 },
    { along: 0.25, finish: "matte", colour: "#f2eee0", shadow: 0.75 },
    { along: 0.95, finish: "matte", colour: "#8a5a35", shadow: 0.25 },
  ];
  kinds.forEach(({ along, finish, colour, shadow }) => {
    builder.box(finish, colour, [0.5, 0.42, 0.03], [x, 0.98, z + along]);
    builder.box("metal", silver, [0.56, 0.04, 0.06], [x, 0.76, z + along]);
    if (!builder.isFar) {
      builder.box(
        "matte",
        shade("#8a6a4a", shadow),
        [0.5, 0.006, 0.24],
        [x, 0.745, z + along + 0.17],
      );
    }
  });
};

/* Lamps round the garden, each with a long shadow, and borders of hedge */

const buildBorders = (builder: AttractionBuilder) => {
  const lamps: [number, number][] = [
    [-3.4, 5.4],
    [3.0, 5.6],
    [-6.2, 1.0],
    [6.4, -0.4],
  ];
  lamps.forEach(([x, z]) => {
    builder.cylinder("paint", midnight, {
      radius: 0.05,
      length: 2.2,
      at: [x, 1.1, z],
      segments: 8,
    });
    builder.cylinder("paint", midnight, {
      radius: 0.13,
      length: 0.25,
      at: [x, 0.12, z],
      segments: 8,
    });
    builder.sphere("glow", glowViolet, 0.18, [x, 2.32, z], [1, 1.2, 1], 10);
    builder.cylinder("metal", silver, {
      radius: 0.22,
      radiusEnd: 0.05,
      length: 0.12,
      at: [x, 2.56, z],
      segments: 10,
    });
  });
  /* Low clipped hedges along the back, with white moonflowers */
  const hedges: [number, number, number, number][] = [
    [-4.2, -5.6, 3.2, 0.3],
    [-6.4, -3.2, 2.2, 1.2],
    [6.6, 2.4, 2.4, 1.4],
  ];
  hedges.forEach(([x, z, length, turn]) => {
    builder.box(
      "matte",
      hedge,
      [length, 0.7, 0.55],
      [x, 0.35, z],
      [0, turn, 0],
    );
    const half = length / 2;
    builder.bar(
      "matte",
      shade(hedge, 1.08),
      [x - Math.cos(turn) * half, 0.7, z + Math.sin(turn) * half],
      [x + Math.cos(turn) * half, 0.7, z - Math.sin(turn) * half],
      0.56,
      8,
    );
    if (!builder.isFar) {
      for (let flower = 0; flower < 6; flower++) {
        const along = (flower / 5 - 0.5) * (length - 0.4);
        builder.sphere(
          "matte",
          flower % 2 === 0 ? palette.white : "#e8e0ff",
          0.08,
          [x + Math.cos(turn) * along, 0.99, z - Math.sin(turn) * along],
          [1, 0.6, 1],
          6,
        );
      }
    }
  });
};

/* Moving parts */

const buildSun = (builder: AttractionBuilder) => {
  builder.sphere("glow", sunGold, 0.42, [0, sunReach, sunSouth], [1, 1, 1], 16);
  if (builder.isFar) {
    return;
  }
  for (let ray = 0; ray < 8; ray++) {
    const angle = (ray / 8) * Math.PI * 2;
    builder.cylinder("glow", "#ffe08a", {
      radius: 0.07,
      radiusEnd: 0,
      length: 0.3,
      at: [Math.sin(angle) * 0.6, sunReach + Math.cos(angle) * 0.6, sunSouth],
      segments: 5,
    });
  }
};

const buildGnomonShadow = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    shadowInk,
    new ExtrudeGeometry(
      flatShape([
        [-0.05, 0],
        [0.05, 0],
        [0.0, 1.25],
        [-0.05, 0],
      ]),
      { depth: 0.01, bevelEnabled: false },
    ),
    { rotation: [-Math.PI / 2, 0, 0] },
  );
};

const buildPuppetShadows = (builder: AttractionBuilder) => {
  addCutout(
    builder,
    "matte",
    shadowInk,
    rabbitShape(),
    [-0.5, 0, 0],
    [0, 0, 0],
    [1.4, 1.4, 1],
    0.01,
  );
  addCutout(
    builder,
    "matte",
    shadowInk,
    birdShape(),
    [0.6, 0.45, 0],
    [0, 0, 0.2],
    [1.3, 1.3, 1],
    0.01,
  );
  builder.box("matte", shadowInk, [0.04, 0.9, 0.01], [-0.5, -0.8, 0]);
};

const buildZoetrope = (builder: AttractionBuilder) => {
  builder.cylinder("paint", "#c8302a", {
    radius: 0.5,
    length: 0.42,
    at: [0, 0.21, 0],
    segments: 20,
    isOpen: true,
  });
  builder.cylinder("paint", midnight, {
    radius: 0.52,
    length: 0.04,
    at: [0, 0.0, 0],
    segments: 20,
  });
  if (builder.isFar) {
    return;
  }
  /* Slits round the drum, and a galloping horse drawn inside */
  for (let slit = 0; slit < 12; slit++) {
    const angle = (slit / 12) * Math.PI * 2;
    builder.box(
      "matte",
      "#1a1a22",
      [0.04, 0.16, 0.02],
      [Math.sin(angle) * 0.505, 0.32, Math.cos(angle) * 0.505],
      [0, angle, 0],
    );
    builder.box(
      "matte",
      "#f2e8c8",
      [0.1, 0.08, 0.01],
      [Math.sin(angle + 0.26) * 0.48, 0.14, Math.cos(angle + 0.26) * 0.48],
      [0, angle + 0.26, slit % 2 === 0 ? 0.2 : -0.2],
    );
  }
  builder.cylinder("metal", palette.brass, {
    radius: 0.04,
    length: 0.6,
    at: [0, 0.3, 0],
    segments: 6,
  });
};

const buildStageLamp = (builder: AttractionBuilder) => {
  builder.cylinder("glow", "#fff4c8", {
    radius: 0.27,
    length: 0.04,
    at: [0, 0, 0],
    axis: "z",
    segments: 14,
  });
};

/* Wanderers: fireflies */

const buildFirefly = (builder: AttractionBuilder) => {
  builder.sphere("glow", "#e8ff8a", 0.05, [0, 0, 0], [1, 1, 1], 6);
  if (!builder.isFar) {
    builder.box("glass", "#c8d8f0", [0.12, 0.005, 0.04], [0, 0.03, 0]);
  }
};

/* The shadow show */

const followPath = (
  points: readonly (readonly [number, number, number, number?])[],
  progress: number,
): LocalSpot => {
  const legs = points.slice(1).map((to, index) => {
    const from = points[index];
    return {
      from,
      to,
      length:
        Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) +
        (from[3] ?? 0),
    };
  });
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  let left = Math.min(1, Math.max(0, progress)) * total;
  let heading = 0;
  for (const leg of legs) {
    const flat = Math.hypot(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    if (flat > 0.05) {
      heading = Math.atan2(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    }
    if (left <= leg.length || leg === legs[legs.length - 1]) {
      const wait = leg.from[3] ?? 0;
      const share = Math.min(
        1,
        Math.max(0, (left - wait) / Math.max(0.001, leg.length - wait)),
      );
      return {
        x: leg.from[0] + (leg.to[0] - leg.from[0]) * share,
        y: leg.from[1] + (leg.to[1] - leg.from[1]) * share,
        z: leg.from[2] + (leg.to[2] - leg.from[2]) * share,
        heading,
      };
    }
    left -= leg.length;
  }
  return { x: 0, y: 0, z: 0, heading };
};

const showStart = { x: stage.minX - 1.0, z: -2.4 };
const showFinish = { x: stage.maxX + 0.9, z: -2.4 };
const showZ = stage.maxZ - 0.7;
const showPath: readonly (readonly [number, number, number, number?])[] = [
  [showStart.x, 0, showStart.z],
  [stage.minX - 0.6, 0, -4.1],
  [stage.minX - 0.25, stageTop / 2, -4.1],
  [stage.minX + 0.3, stageTop, -4.1],
  [stageMiddle - 0.6, stageTop, showZ],
  [stageMiddle - 0.6, stageTop + 0.5, showZ - 0.01],
  [stageMiddle - 0.5, stageTop, showZ, 1],
  [stageMiddle + 0.5, stageTop + 0.5, showZ + 0.01],
  [stageMiddle + 0.6, stageTop, showZ, 1],
  [stage.maxX - 0.1, stageTop, -4.1],
  [stage.maxX + 0.5, 0, -3.6],
  [showFinish.x, 0, showFinish.z],
];

const showRide: PlayRide = {
  id: "shadow-show",
  name: "the shadow stage",
  start: showStart,
  reach: 0.5,
  seconds: 12,
  finish: showFinish,
  follow: (progress) => followPath(showPath, progress),
};

export const shadowGardenModel: NewLandAttractionModel = {
  kind: "shadow-garden",
  islandId: "starfall-isle",
  name: "Shadow Garden",
  fact: "Light travels in straight lines, so when something solid blocks it, a dark shadow forms behind. The shadow has the same outline as the object that casts it, which is how shadow puppets work. As the Sun moves across the sky, shadows move round and change length, so a sundial's shadow can tell the time.",
  curriculumLink:
    "Science, Year 6: light. Light travels in straight lines, which explains why shadows have the same shape as the objects that cast them.",
  footprint,
  setting: "inland",
  signSpot: { x: -2.4, z: 7.6 },
  build: (builder) => {
    buildSundial(builder);
    buildCutouts(builder);
    buildStage(builder);
    buildPergola(builder);
    buildGarden(builder);
    buildPanes(builder);
    buildBorders(builder);
    addSignBoard(builder, [-2.4, 0, 6.9], signColour, 0.2);
  },
  moving: [
    {
      name: "Sun",
      pivot: [dial.x, 0, dial.z],
      build: buildSun,
      motion: {
        kind: "swing",
        axis: "z",
        amplitude: sunSwing,
        period: sunPeriod,
      },
    },
    {
      name: "gnomon's shadow",
      pivot: [dial.x, dialTop + 0.01, dial.z + 0.35],
      build: buildGnomonShadow,
      motion: {
        kind: "swing",
        axis: "y",
        amplitude: 0.95,
        period: sunPeriod,
        phase: Math.PI,
      },
    },
    {
      name: "puppet shadows",
      pivot: [stageMiddle, stageTop + 1.1, stage.maxZ - 0.11],
      build: buildPuppetShadows,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 4.5,
        amplitude: 0.3,
        period: 1.4,
      },
    },
    {
      name: "zoetrope",
      pivot: [zoetropeAt.x, 0.92, zoetropeAt.z],
      build: buildZoetrope,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 7, reach: 3.5 },
    },
    {
      name: "stage lamp",
      pivot: [stageMiddle, stageTop + 1.4, stage.minZ + 0.6],
      build: buildStageLamp,
      motion: { kind: "wake", reach: 5 },
    },
  ],
  wanderers: [
    {
      name: "fireflies",
      build: buildFirefly,
      count: 6,
      centre: { x: 0, z: 1.0 },
      radius: 4.5,
      speed: 0.6,
      height: 1.5,
      bob: 0.35,
    },
  ],
  decks: [
    buildFlatDeck(
      {
        minX: stage.minX + 0.05,
        maxX: stage.maxX - 0.05,
        minZ: stage.minZ + 0.05,
        maxZ: stage.maxZ - 0.25,
      },
      stageTop,
    ),
    buildFlatDeck(
      {
        minX: stage.minX - 0.5,
        maxX: stage.minX,
        minZ: (stage.minZ + stage.maxZ) / 2 - 0.6,
        maxZ: (stage.minZ + stage.maxZ) / 2 + 0.6,
      },
      stageTop / 2,
    ),
  ],
  rides: [showRide],
  play: {
    label: "Make a shadow puppet",
    news: "You held up your hands in the lamplight and a shadow rabbit hopped across the screen, the very same shape as your fingers!",
  },
};
