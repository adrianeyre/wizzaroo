import {
  BoxGeometry,
  ExtrudeGeometry,
  RingGeometry,
  Shape,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addLampPost,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef3f6";
const snowShadow = "#d6e1ea";
const trailSnow = "#dde6ee";
const tread = "#c3cfda";
const pine = "#2d5a40";
const faluRed = "#9e2b25";
const trim = "#f2efe6";
const roofGrey = "#3b4148";
const markerOrange = "#f06a1d";
const sledRed = "#d8312b";
const sledYellow = "#f2c230";
const sledBlue = "#2f6fb5";
const signColour = "#2f6fb5";

/* The trail: a ring round a snowy middle, ridden anticlockwise from the front */
const trail = { x: 0, z: -0.8, radius: 6.2, half: 0.75 };
const pivot: Triple = [trail.x, 0.03, trail.z];
const trailPoint = (angle: number, out = 0): Triple => [
  trail.x + Math.sin(angle) * (trail.radius + out),
  0,
  trail.z + Math.cos(angle) * (trail.radius + out),
];
const bumpAngle = Math.PI;

const garage = { x: -2.1, z: 1.6, width: 3.0, depth: 2.2, wall: 1.8 };
const garageFront = garage.z + garage.depth / 2;
const hill = { x: 1.4, z: -3.6, radius: 2.3, height: 1.1 };
const hareHole = { x: 3.1, z: -0.4 };
const gantryZ = trail.z + trail.radius;
const lightsAt: Triple = [-0.12, 2.35, gantryZ];
const flagAt: Triple = [-1.4, 1.55, gantryZ - trail.half - 0.9];

const signAt: Triple = [-3.6, 0, 8.0];
const rideStart = { x: -1.7, z: 7.25 };
const rideFinish = { x: 1.7, z: 7.25 };

/* ------------------------------------------------------------------ */
/* Pines                                                               */
/* ------------------------------------------------------------------ */

const pines: [number, number, number][] = [
  [-8.2, -4.4, 1.15],
  [-5.6, -8.2, 1.3],
  [-1.6, -9.4, 1.0],
  [3.4, -9.0, 1.2],
  [7.0, -6.6, 1.05],
  [8.9, -1.8, 0.9],
  [-9.2, 0.6, 0.95],
  [0.4, -3.4, 0.85],
  [2.4, -4.4, 1.0],
];

const addPine = (
  builder: AttractionBuilder,
  [x, z, size]: [number, number, number],
  ground = 0,
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.13 * size,
    radiusEnd: 0.08 * size,
    length: 0.8 * size,
    at: [x, ground + 0.4 * size, z],
    segments: 7,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (1.0 - share * 0.55) * size;
    const height = (1.35 - share * 0.25) * size;
    const base = ground + (0.55 + share * 1.8) * size;
    builder.cylinder("matte", tier % 2 === 0 ? pine : shade(pine, 1.12), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, base + height / 2, z],
      segments: 9,
    });
    if (!builder.isFar) {
      const cap = height * 0.45;
      builder.cylinder("matte", snow, {
        radius: radius * 0.55,
        radiusEnd: 0.03,
        length: cap,
        at: [x, base + height - cap / 2 + 0.03, z],
        segments: 9,
      });
    }
  }
};

const hillHeightAt = (x: number, z: number): number => {
  const share = Math.hypot(x - hill.x, z - hill.z) / hill.radius;
  return share >= 1 ? 0 : hill.height * (1 - share * share);
};

/* ------------------------------------------------------------------ */
/* A snowmobile, nose towards -z                                       */
/* ------------------------------------------------------------------ */

const addSnowmobile = (
  builder: AttractionBuilder,
  [x, y, z]: Triple,
  colour: string,
) => {
  const isNear = !builder.isFar;
  /* The rubber track under the back, on its wheels */
  builder.box("matte", "#26292e", [0.5, 0.2, 1.05], [x, y + 0.12, z + 0.32]);
  if (isNear) {
    [-0.05, 0.3, 0.65].forEach((along) => {
      builder.cylinder("metal", palette.darkSteel, {
        radius: 0.08,
        length: 0.52,
        at: [x, y + 0.11, z + along],
        axis: "x",
        segments: 10,
      });
    });
  }
  /* The body: a long nose sweeping up into the seat */
  builder.sphere(
    "paint",
    colour,
    0.5,
    [x, y + 0.36, z - 0.3],
    [0.7, 0.42, 1.1],
    isNear ? 14 : 8,
  );
  builder.box("paint", colour, [0.6, 0.18, 0.95], [x, y + 0.32, z + 0.45]);
  builder.cylinder("matte", "#1f2226", {
    radius: 0.2,
    length: 0.75,
    at: [x, y + 0.42, z + 0.42],
    axis: "z",
    segments: isNear ? 10 : 6,
  });
  builder.box(
    "glass",
    "#a8d4ec",
    [0.5, 0.32, 0.03],
    [x, y + 0.66, z - 0.22],
    [0.55, 0, 0],
  );
  builder.box("glow", "#fff4c8", [0.3, 0.08, 0.03], [x, y + 0.4, z - 0.8]);
  /* Handlebars */
  builder.bar(
    "metal",
    palette.darkSteel,
    [x - 0.3, y + 0.62, z - 0.06],
    [x + 0.3, y + 0.62, z - 0.06],
    0.04,
    6,
  );
  /* Two skis out at the front */
  [-0.3, 0.3].forEach((side) => {
    builder.box(
      "metal",
      palette.steel,
      [0.1, 0.04, 0.8],
      [x + side, y + 0.03, z - 0.62],
    );
    builder.box(
      "metal",
      palette.steel,
      [0.1, 0.04, 0.18],
      [x + side, y + 0.09, z - 1.06],
      [-0.7, 0, 0],
    );
    builder.bar(
      "metal",
      palette.darkSteel,
      [x + side, y + 0.05, z - 0.6],
      [x + side * 0.6, y + 0.3, z - 0.5],
      0.04,
      5,
    );
  });
  if (isNear) {
    builder.box(
      "paint",
      trim,
      [0.69, 0.06, 0.6],
      [x, y + 0.36, z - 0.2],
      [-0.16, 0, 0],
    );
    builder.box(
      "paint",
      palette.black,
      [0.5, 0.05, 0.05],
      [x, y + 0.3, z + 0.94],
    );
    builder.box("glow", "#ff5a4a", [0.12, 0.05, 0.02], [x, y + 0.34, z + 0.93]);
  }
};

/* A rider in a bright suit and helmet, sitting astride */
const addRider = (builder: AttractionBuilder, colour: string) => {
  builder.lathe(
    "matte",
    colour,
    [
      [0, 0.56],
      [0.17, 0.58],
      [0.18, 0.8],
      [0.14, 0.98],
      [0.06, 1.02],
      [0, 1.02],
    ],
    [0, 0, 0.32],
    "y",
    10,
  );
  [-0.14, 0.14].forEach((side) => {
    builder.bar(
      "matte",
      "#2b3442",
      [side, 0.55, 0.38],
      [side * 1.4, 0.36, 0.0],
      0.11,
      6,
    );
    builder.bar(
      "matte",
      colour,
      [side * 1.2, 0.92, 0.25],
      [side * 1.6, 0.66, -0.06],
      0.08,
      6,
    );
  });
  builder.sphere(
    "paint",
    sledYellow,
    0.15,
    [0, 1.12, 0.28],
    [1, 1.05, 1.1],
    12,
  );
  builder.box("glass", "#2b3b4a", [0.22, 0.08, 0.05], [0, 1.12, 0.15]);
};

const buildRacer = (builder: AttractionBuilder) => {
  addSnowmobile(builder, [0, 0, 0], sledRed);
  if (builder.isFar) {
    builder.cylinder("matte", sledBlue, {
      radius: 0.17,
      length: 0.5,
      at: [0, 0.8, 0.32],
      segments: 6,
    });
    builder.sphere("paint", sledYellow, 0.15, [0, 1.12, 0.28], [1, 1, 1], 6);
    return;
  }
  addRider(builder, sledBlue);
};

/* ------------------------------------------------------------------ */
/* The trail                                                           */
/* ------------------------------------------------------------------ */

const buildTrail = (builder: AttractionBuilder) => {
  const segments = builder.segments(64, 28);
  builder.add(
    "matte",
    trailSnow,
    new RingGeometry(
      trail.radius - trail.half,
      trail.radius + trail.half,
      segments,
    ),
    { at: [trail.x, 0.02, trail.z], rotation: [-Math.PI / 2, 0, 0] },
  );
  /* Packed-snow banks along both edges */
  [-1, 1].forEach((side) => {
    if (builder.isFar && side < 0) {
      return;
    }
    builder.add(
      "matte",
      snow,
      new TorusGeometry(
        trail.radius + side * (trail.half + 0.12),
        0.2,
        builder.segments(4, 3),
        segments,
      ),
      {
        at: [trail.x, 0.02, trail.z],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 0.6],
      },
    );
  });
  if (!builder.isFar) {
    /* Tracks pressed in by the snowmobiles */
    [-0.3, 0.3].forEach((offset) => {
      builder.add(
        "matte",
        tread,
        new RingGeometry(
          trail.radius + offset - 0.12,
          trail.radius + offset + 0.12,
          segments,
        ),
        { at: [trail.x, 0.026, trail.z], rotation: [-Math.PI / 2, 0, 0] },
      );
    });
  }
  /* A snow kicker on the far side, for a little jump */
  const [kx, , kz] = trailPoint(bumpAngle);
  const ramp = new Shape([
    new Vector2(-0.9, 0),
    new Vector2(0.5, 0),
    new Vector2(0.15, 0.28),
    new Vector2(-0.2, 0.28),
  ]);
  builder.add(
    "matte",
    snow,
    new ExtrudeGeometry(ramp, { depth: trail.half * 2, bevelEnabled: false }),
    { at: [kx - trail.half, 0, kz], rotation: [0, Math.PI / 2, 0] },
  );
  /* Orange marker poles all round, and reflectors */
  const poles = builder.isFar ? 8 : 16;
  for (let pole = 0; pole < poles; pole++) {
    const angle = ((pole + 0.5) / poles) * Math.PI * 2;
    if (Math.abs(angle - Math.PI * 2) < 0.4 || angle < 0.4) {
      continue;
    }
    [-1, 1].forEach((side) => {
      if (builder.isFar && side < 0) {
        return;
      }
      const [px, , pz] = trailPoint(angle, side * (trail.half + 0.45));
      builder.cylinder("paint", markerOrange, {
        radius: 0.035,
        length: 1.1,
        at: [px, 0.55, pz],
        segments: 6,
      });
      if (!builder.isFar) {
        builder.box("paint", palette.black, [0.08, 0.12, 0.08], [px, 0.95, pz]);
      }
    });
  }
};

/* The start and finish gantry over the front straight */
const buildGantry = (builder: AttractionBuilder) => {
  const posts = [gantryZ - trail.half - 0.6, gantryZ + trail.half + 0.6];
  posts.forEach((postZ) => {
    builder.box("paint", palette.black, [0.16, 2.6, 0.16], [0, 1.3, postZ]);
    builder.box(
      "matte",
      palette.darkStone,
      [0.36, 0.16, 0.36],
      [0, 0.08, postZ],
    );
  });
  const span = posts[1] - posts[0] + 0.3;
  const squares = builder.isFar ? 1 : 12;
  builder.painted(
    new BoxGeometry(0.08, 0.5, span, 1, 2, squares),
    (centre) =>
      (Math.floor((centre.z - gantryZ + span / 2) / (span / squares)) +
        (centre.y > 2.3 ? 1 : 0)) %
        2 ===
      0
        ? palette.black
        : trim,
    { at: [0, 2.3, gantryZ] },
    "paint",
    undefined,
  );
  builder.box("paint", sledRed, [0.1, 0.12, span], [0, 2.6, gantryZ]);
  /* The light box the start lights shine from */
  builder.box(
    "paint",
    "#20242a",
    [0.12, 0.16, 0.7],
    [-0.1, 2.35 - 0.3, gantryZ],
  );
};

/* The start lights, which glow green as the Character comes near */
const buildStartLights = (builder: AttractionBuilder) => {
  [-0.24, 0, 0.24].forEach((along, index) => {
    builder.sphere(
      "glow",
      index === 1 ? "#ffd04a" : "#6dff8a",
      0.08,
      [-0.03, -0.3, along],
      [0.6, 1, 1],
      10,
    );
  });
};

/* The marshal's chequered flag, waved as the Character comes near */
const buildFlag = (builder: AttractionBuilder) => {
  builder.cylinder("paint", palette.darkTimber, {
    radius: 0.025,
    length: 1.0,
    at: [0, 0.5, 0],
    segments: 6,
  });
  const squares = builder.isFar ? 1 : 4;
  builder.painted(
    new BoxGeometry(0.6, 0.4, 0.02, squares + 1, squares, 1),
    (centre) =>
      (Math.floor((centre.y - 0.6) / (0.4 / squares)) +
        Math.floor((centre.x - 0.02) / (0.6 / (squares + 1)))) %
        2 ===
      0
        ? palette.black
        : trim,
    { at: [0.32, 0.8, 0] },
    "matte",
    undefined,
  );
};

const buildMarshalPost = (builder: AttractionBuilder) => {
  const [x, , z] = flagAt;
  builder.box("matte", palette.paleTimber, [0.9, 0.2, 0.9], [x, 0.1, z]);
  builder.box("paint", faluRed, [0.08, 1.4, 0.08], [x - 0.4, 0.7, z - 0.4]);
  builder.box("paint", faluRed, [0.08, 1.4, 0.08], [x + 0.4, 0.7, z - 0.4]);
  builder.box("paint", trim, [0.95, 0.06, 0.08], [x, 1.4, z - 0.4]);
  /* The marshal holds the flag up */
  builder.lathe(
    "matte",
    markerOrange,
    [
      [0, 0.5],
      [0.16, 0.52],
      [0.17, 0.8],
      [0.12, 1.0],
      [0, 1.02],
    ],
    [x, 0, z],
    "y",
    10,
  );
  builder.bar(
    "matte",
    "#2b3442",
    [x - 0.07, 0.2, z],
    [x - 0.07, 0.52, z],
    0.1,
    6,
  );
  builder.bar(
    "matte",
    "#2b3442",
    [x + 0.07, 0.2, z],
    [x + 0.07, 0.52, z],
    0.1,
    6,
  );
  builder.sphere("matte", "#f0c8a8", 0.11, [x, 1.12, z], [1, 1, 1], 10);
  builder.sphere("matte", sledBlue, 0.12, [x, 1.18, z], [1, 0.7, 1], 10);
  builder.bar(
    "matte",
    markerOrange,
    [x + 0.12, 0.95, z],
    [x + 0.05, 1.5, z],
    0.07,
    5,
  );
};

/* ------------------------------------------------------------------ */
/* The garage, pump and parked snowmobiles in the middle               */
/* ------------------------------------------------------------------ */

const buildGarage = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = garage;
  builder.box(
    "matte",
    palette.darkStone,
    [width + 0.14, 0.12, depth + 0.14],
    [x, 0.06, z],
  );
  const planks = builder.isFar ? 1 : 10;
  /* Back and side walls, open at the front */
  builder.painted(
    new BoxGeometry(width, wall, 0.12, 1, planks, 1),
    (centre) =>
      Math.floor(centre.y / (wall / planks)) % 2 === 0
        ? faluRed
        : shade(faluRed, 0.88),
    { at: [x, wall / 2 + 0.12, z - depth / 2] },
    "matte",
    undefined,
  );
  [-1, 1].forEach((side) => {
    builder.painted(
      new BoxGeometry(0.12, wall, depth, 1, planks, 1),
      (centre) =>
        Math.floor(centre.y / (wall / planks)) % 2 === 0
          ? faluRed
          : shade(faluRed, 0.88),
      { at: [x + side * (width / 2), wall / 2 + 0.12, z] },
      "matte",
      undefined,
    );
    builder.box(
      "paint",
      trim,
      [0.16, wall, 0.16],
      [x + side * (width / 2), wall / 2 + 0.12, garageFront],
    );
  });
  const eaves = wall + 0.12;
  const rise = 0.9;
  const gable = new Shape([
    new Vector2(-width / 2, 0),
    new Vector2(width / 2, 0),
    new Vector2(0, rise),
  ]);
  builder.add(
    "matte",
    shade(faluRed, 0.9),
    new ExtrudeGeometry(gable, { depth: 0.12, bevelEnabled: false }),
    { at: [x, eaves, garageFront - 0.12] },
  );
  builder.add(
    "matte",
    shade(faluRed, 0.9),
    new ExtrudeGeometry(gable, { depth: 0.12, bevelEnabled: false }),
    { at: [x, eaves, z - depth / 2 - 0.06] },
  );
  const overhang = 0.3;
  const halfSpan = width / 2 + overhang;
  const slope = Math.hypot(halfSpan, rise * (halfSpan / (width / 2)));
  const angle = Math.atan2(rise, width / 2);
  [1, -1].forEach((side) => {
    const slabX = x + (side * halfSpan) / 2;
    builder.box(
      "matte",
      roofGrey,
      [slope, 0.1, depth + overhang * 2],
      [slabX, eaves + rise / 2 + 0.02, z],
      [0, 0, -side * angle],
    );
    builder.box(
      "matte",
      snow,
      [slope - 0.1, 0.1, depth + overhang * 2 - 0.1],
      [slabX + side * 0.02, eaves + rise / 2 + 0.11, z],
      [0, 0, -side * angle],
    );
  });
  builder.box(
    "paint",
    trim,
    [width + 0.1, 0.24, 0.1],
    [x, eaves - 0.1, garageFront],
  );
  /* A dark inside, a workbench and a stove pipe */
  builder.box(
    "matte",
    "#3a2f2a",
    [width - 0.2, 0.02, depth - 0.2],
    [x, 0.13, z],
  );
  builder.box(
    "matte",
    palette.timber,
    [1.2, 0.08, 0.5],
    [x - 0.6, 0.85, z - 0.7],
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.08,
    length: 1.2,
    at: [x + 0.9, eaves + 0.6, z - 0.5],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  addSnowmobile(builder, [x + 0.6, 0.12, z + 0.2], sledYellow);
  /* The trail's name board and tools on the back wall */
  builder.box(
    "paint",
    sledBlue,
    [1.6, 0.3, 0.05],
    [x, eaves + 0.25, garageFront + 0.06],
  );
  builder.box(
    "paint",
    trim,
    [1.3, 0.06, 0.02],
    [x, eaves + 0.27, garageFront + 0.1],
  );
  [-1.1, -0.85, -0.6].forEach((along, index) => {
    builder.box(
      "metal",
      palette.steel,
      [0.05, 0.5 + index * 0.08, 0.03],
      [x + along, 1.3, z - depth / 2 + 0.1],
    );
  });
  [0.2, 0.55].forEach((along, index) => {
    builder.sphere(
      "paint",
      index === 0 ? sledYellow : sledRed,
      0.14,
      [x + along, 1.4, z - depth / 2 + 0.2],
      [1, 1, 1.1],
      10,
    );
  });
};

const buildPump = (builder: AttractionBuilder) => {
  const x = 0.6;
  const z = 2.9;
  builder.box("paint", sledRed, [0.45, 1.2, 0.35], [x, 0.6, z]);
  builder.box("glow", "#fff4c8", [0.3, 0.22, 0.02], [x, 0.95, z + 0.18]);
  builder.box("paint", trim, [0.47, 0.12, 0.37], [x, 1.26, z]);
  if (!builder.isFar) {
    builder.bar(
      "matte",
      palette.black,
      [x + 0.22, 0.8, z],
      [x + 0.36, 0.3, z + 0.1],
      0.04,
      5,
    );
    builder.box(
      "metal",
      palette.darkSteel,
      [0.06, 0.18, 0.08],
      [x + 0.25, 0.75, z + 0.05],
    );
  }
};

const buildHill = (builder: AttractionBuilder) => {
  const steps = builder.isFar ? 4 : 8;
  builder.lathe(
    "matte",
    snow,
    Array.from({ length: steps + 1 }, (_, index): [number, number] => {
      const share = index / steps;
      return [
        hill.radius * Math.sin((share * Math.PI) / 2) + 0.001,
        hill.height * Math.cos((share * Math.PI) / 2),
      ];
    }),
    [hill.x, 0, hill.z],
    "y",
    builder.isFar ? 10 : 24,
  );
  /* The hare's burrow in the snow */
  builder.cylinder("matte", "#3a3f46", {
    radius: 0.24,
    length: 0.03,
    at: [hareHole.x, 0.015, hareHole.z],
    segments: 14,
  });
  builder.torus(
    "matte",
    snowShadow,
    0.28,
    0.07,
    [hareHole.x, 0.03, hareHole.z],
    "y",
    14,
  );
};

/* The arctic hare, popping out of its burrow to watch */
const buildHare = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#f7f9fb", 0.16, [0, 0.16, 0], [0.9, 1.2, 1], 12);
  builder.sphere("matte", "#f7f9fb", 0.1, [0, 0.38, 0.05], [1, 1, 1.05], 10);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      "#f0f2f4",
      0.035,
      [side * 0.04, 0.56, 0.02],
      [1, 3.2, 0.7],
      8,
    );
    builder.sphere(
      "matte",
      palette.black,
      0.02,
      [side * 0.06, 0.41, 0.13],
      [1, 1, 1],
      5,
    );
  });
  builder.sphere("matte", "#e7a2a8", 0.018, [0, 0.37, 0.15], [1, 1, 1], 5);
};

/* ------------------------------------------------------------------ */
/* Reindeer                                                            */
/* ------------------------------------------------------------------ */

const reindeerBrown = "#7d5a40";

const buildReindeer = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    reindeerBrown,
    0.26,
    [0, 0.72, 0],
    [0.8, 0.8, 1.5],
    12,
  );
  builder.sphere("matte", "#efe6d8", 0.16, [0, 0.82, 0.3], [1, 1.1, 0.9], 10);
  [-0.12, 0.12].forEach((side) => {
    [-0.26, 0.24].forEach((along) => {
      builder.cylinder("matte", shade(reindeerBrown, 0.75), {
        radius: 0.045,
        radiusEnd: 0.04,
        length: 0.56,
        at: [side, 0.28, along],
        segments: 6,
      });
    });
  });
  builder.bar(
    "matte",
    reindeerBrown,
    [0, 0.88, 0.32],
    [0, 1.08, 0.48],
    0.14,
    6,
  );
  builder.sphere(
    "matte",
    reindeerBrown,
    0.11,
    [0, 1.12, 0.56],
    [0.9, 0.9, 1.4],
    10,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere("matte", palette.black, 0.04, [0, 1.09, 0.71], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#d9c7a5",
      [side * 0.05, 1.2, 0.52],
      [side * 0.2, 1.48, 0.46],
      0.035,
      4,
    );
    builder.bar(
      "matte",
      "#d9c7a5",
      [side * 0.2, 1.48, 0.46],
      [side * 0.26, 1.62, 0.56],
      0.03,
      4,
    );
    builder.bar(
      "matte",
      "#d9c7a5",
      [side * 0.14, 1.38, 0.48],
      [side * 0.16, 1.48, 0.62],
      0.025,
      4,
    );
    builder.sphere(
      "matte",
      palette.black,
      0.02,
      [side * 0.07, 1.16, 0.64],
      [1, 1, 1],
      5,
    );
  });
  builder.sphere("matte", "#efe6d8", 0.06, [0, 0.82, -0.38], [1, 1, 1], 6);
};

/* ------------------------------------------------------------------ */
/* Grounds                                                             */
/* ------------------------------------------------------------------ */

const buildGrounds = (builder: AttractionBuilder) => {
  pines.forEach((tree) => {
    const [x, z] = tree;
    addPine(builder, tree, hillHeightAt(x, z) - 0.05);
  });
  addBench(builder, [-4.4, 0, 7.4], Math.PI * 0.85, faluRed);
  addBench(builder, [4.6, 0, 7.3], -Math.PI * 0.85, faluRed);
  addLampPost(builder, [-2.6, 0, 7.6]);
  addLampPost(builder, [2.6, 0, 7.6]);
  /* A path in from the sign, and over the trail to the middle */
  builder.box("matte", "#b9b2a6", [5.6, 0.02, 1.2], [0, 0.01, 7.6]);
  if (builder.isFar) {
    return;
  }
  [
    [-6.8, 5.6, 0.5],
    [6.4, 5.8, 0.45],
    [-2.0, -4.6, 0.4],
    [-4.2, -0.6, 0.35],
    [9.0, 1.0, 0.4],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowShadow, size, [x, 0, z], [1.6, 0.45, 1.1], 10);
  });
  /* A snowman watching the racing */
  const [sx, sz] = [-0.6, -1.0];
  builder.sphere("matte", "#f7fafc", 0.36, [sx, 0.3, sz], [1, 0.92, 1], 12);
  builder.sphere("matte", "#f7fafc", 0.26, [sx, 0.8, sz], [1, 1, 1], 11);
  builder.sphere("matte", "#f7fafc", 0.18, [sx, 1.16, sz], [1, 1, 1], 10);
  builder.cylinder("matte", "#e8792b", {
    radius: 0.03,
    radiusEnd: 0.002,
    length: 0.18,
    at: [sx, 1.16, sz + 0.25],
    axis: "z",
    segments: 6,
  });
  builder.torus("matte", sledRed, 0.17, 0.04, [sx, 1.01, sz], "y", 10);
  builder.sphere("matte", sledBlue, 0.15, [sx, 1.3, sz], [1, 0.6, 1], 10);
};

/* ------------------------------------------------------------------ */
/* The ride: once round the trail, over the kicker                     */
/* ------------------------------------------------------------------ */

const enterAngle = -0.28;
const leaveAngle = Math.PI * 2 + 0.28;

const snowmobileRide = (progress: number): LocalSpot => {
  const seat = 0.32;
  if (progress < 0.08) {
    const share = progress / 0.08;
    const [tx, , tz] = trailPoint(enterAngle);
    return {
      x: rideStart.x + (tx - rideStart.x) * share,
      y: seat * share,
      z: rideStart.z + (tz - rideStart.z) * share,
      heading: Math.PI / 2,
    };
  }
  if (progress < 0.92) {
    const share = (progress - 0.08) / 0.84;
    const eased = share * share * (3 - 2 * share);
    const angle = enterAngle + (leaveAngle - enterAngle) * eased;
    const [x, , z] = trailPoint(angle);
    const fromBump = Math.abs((angle % (Math.PI * 2)) - bumpAngle);
    const hop =
      fromBump < 0.3 ? 0.55 * Math.cos((fromBump / 0.3) * (Math.PI / 2)) : 0;
    return {
      x,
      y: seat + hop + 0.03 * Math.sin(angle * 9),
      z,
      heading: Math.atan2(Math.cos(angle), -Math.sin(angle)),
    };
  }
  const share = (progress - 0.92) / 0.08;
  const [tx, , tz] = trailPoint(leaveAngle);
  return {
    x: tx + (rideFinish.x - tx) * share,
    y: seat * (1 - share),
    z: tz + (rideFinish.z - tz) * share,
    heading: Math.PI / 2,
  };
};

export const snowmobileTrailModel: NewLandAttractionModel = {
  kind: "snowmobile-trail",
  islandId: "frost-isle",
  name: "Snowmobile Trail",
  fact: "A snowmobile has skis at the front to steer and a wide rubber track at the back that grips the snow. Wide skis and tracks spread the snowmobile's weight out, so it floats over soft snow instead of sinking in, just like snowshoes do for people.",
  curriculumLink:
    "Science, Year 2: identify and compare the suitability of everyday materials for particular uses, such as rubber tracks that grip and smooth metal skis that slide over snow.",
  footprint: 11,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 1.0 },
  build: (builder) => {
    buildTrail(builder);
    buildGantry(builder);
    buildMarshalPost(builder);
    buildHill(builder);
    buildGarage(builder);
    buildPump(builder);
    addSnowmobile(builder, [1.7, 0, 3.4], sledBlue);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "racing snowmobiles",
      pivot,
      build: buildRacer,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: trail.radius,
        count: 2,
        speed: 0.42,
        isFacingAlong: true,
        bob: 0.03,
      },
    },
    {
      name: "start lights",
      pivot: lightsAt,
      build: buildStartLights,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "chequered flag",
      pivot: flagAt,
      build: buildFlag,
      motion: { kind: "nod", axis: "z", reach: 6, amplitude: 0.7, period: 0.8 },
    },
    {
      name: "arctic hare",
      pivot: [hareHole.x, -0.62, hareHole.z],
      build: buildHare,
      motion: { kind: "rise", reach: 4, height: 0.62, period: 1.6 },
    },
  ],
  wanderers: [
    {
      name: "reindeer",
      build: buildReindeer,
      count: 2,
      centre: { x: -2.4, z: -2.6 },
      radius: 1.3,
      speed: 0.35,
    },
  ],
  smoke: [
    {
      at: [garage.x + 0.9, garage.wall + 1.45, garage.z - 0.5],
      colour: "#d8dcdf",
      puffs: 5,
      size: 0.13,
      rise: 1.4,
      spread: 0.3,
    },
  ],
  blockers: [
    { x: garage.x - 0.7, z: garage.z, radius: 1.1 },
    { x: garage.x + 0.7, z: garage.z, radius: 1.1 },
    { x: hill.x, z: hill.z, radius: 1.4 },
  ] satisfies LocalBlocker[],
  rides: [
    {
      id: "snowmobile",
      name: "the snowmobile trail",
      start: rideStart,
      reach: 0.7,
      seconds: 16,
      finish: rideFinish,
      follow: snowmobileRide,
    },
  ],
  play: {
    label: "Wave the chequered flag",
    news: "Vroom! The marshal waved the chequered flag and the snowmobiles zoomed round the trail, spraying sparkly snow.",
  },
};
