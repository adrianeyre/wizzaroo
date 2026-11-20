import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addPalm,
  addPot,
  addRock,
  addScrub,
  addSlab,
  buildPerson,
  desert,
  paintBands,
} from "./sandstone-arches-parts.js";

/*
 * A potters' yard round a great beehive kiln of terracotta bricks,
 * its fire glowing as you come near and smoke curling from its top.
 * Under a palm-leaf shelter the potter's wheel spins faster as you
 * watch, pots dry in the sun on a mud-brick terrace, and you can climb
 * into the tub and stomp the clay soft with your feet.
 */

const signColour = "#9e3f22";
const signAt: Triple = [1.2, 0, 7.6];
const brickBands = ["#b9583a", "#c4673f", "#a84d32", "#c96e48"] as const;
const clayGrey = "#9a8a78";
const wetClay = "#8a6a52";
const palmThatch = "#b8a060";

/* ------------------------------------------------------------------ */
/* The kiln                                                            */
/* ------------------------------------------------------------------ */

const kiln = { x: -2.4, z: -2.2, radius: 1.75, height: 2.7 };
const mouth = { x: kiln.x, z: kiln.z + kiln.radius - 0.05 };

const listKilnProfile = (steps: number): Vector2[] => {
  const points: Vector2[] = [];
  for (let step = 0; step <= steps; step++) {
    const share = step / steps;
    const y = share * kiln.height;
    const radius = 0.38 + (kiln.radius - 0.38) * (1 - share ** 2.4) ** 0.55;
    points.push(new Vector2(radius, y));
  }
  points.push(new Vector2(0.44, kiln.height + 0.25));
  points.push(new Vector2(0.3, kiln.height + 0.25));
  return points;
};

const buildKiln = (builder: AttractionBuilder) => {
  builder.painted(
    new LatheGeometry(
      listKilnProfile(builder.isFar ? 5 : 14),
      builder.segments(28, 12),
    ),
    paintBands(brickBands, 0.2),
    { at: [kiln.x, 0, kiln.z] },
    "matte",
  );
  /* A dark chimney mouth at the top */
  builder.cylinder("matte", desert.charcoal, {
    radius: 0.3,
    length: 0.04,
    at: [kiln.x, kiln.height + 0.23, kiln.z],
    segments: 12,
  });
  /* The firemouth: a round-topped arch, black with soot inside */
  builder.box(
    "matte",
    desert.charcoal,
    [0.9, 0.55, 0.3],
    [mouth.x, 0.28, mouth.z],
  );
  builder.add(
    "matte",
    desert.charcoal,
    new CylinderGeometry(
      0.45,
      0.45,
      0.3,
      builder.segments(14, 6),
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    ).rotateX(Math.PI / 2),
    { at: [mouth.x, 0.55, mouth.z] },
  );
  builder.add(
    "matte",
    desert.paleTerracotta,
    new TorusGeometry(
      0.55,
      0.1,
      builder.segments(6, 4),
      builder.segments(14, 6),
      Math.PI,
    ),
    { at: [mouth.x, 0.55, mouth.z + 0.12] },
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      desert.paleTerracotta,
      [0.2, 0.55, 0.22],
      [mouth.x + side * 0.55, 0.28, mouth.z + 0.12],
    );
  });
  /* Glowing embers on the hearth */
  builder.box(
    "glow",
    desert.ember,
    [0.7, 0.06, 0.25],
    [mouth.x, 0.05, mouth.z + 0.02],
  );
  if (builder.isFar) {
    return;
  }
  /* Spy-holes round the dome, glowing from the fire inside */
  [-0.9, 0.9, 2.4, -2.4].forEach((angle) => {
    builder.sphere(
      "glow",
      desert.flame,
      0.07,
      [kiln.x + Math.sin(angle) * 1.66, 1.2, kiln.z + Math.cos(angle) * 1.66],
      [1, 1, 0.6],
      6,
    );
  });
  /* Sticks of firewood stacked by the mouth, and a bellows */
  for (let log = 0; log < 9; log++) {
    const row = Math.floor(log / 4);
    const x = -4.8 + (log % 4) * 0.2 + row * 0.1;
    builder.cylinder("matte", log % 2 === 0 ? "#7a5634" : "#8a6440", {
      radius: 0.08,
      length: 1.1,
      at: [x, 0.09 + row * 0.15, -0.1],
      axis: "z",
      segments: 6,
    });
  }
  builder.sphere(
    "matte",
    "#6a4a2a",
    0.22,
    [-1.1, 0.2, -0.05],
    [1.2, 0.5, 1],
    8,
  );
  addSlab(
    builder,
    "matte",
    desert.darkTimber,
    [-1.1, 0.2, 0.1],
    [-1.3, 0.25, 0.65],
    0.12,
    0.06,
  );
};

/* ------------------------------------------------------------------ */
/* The drying terrace                                                  */
/* ------------------------------------------------------------------ */

const terrace = { x: 3.0, z: -3.0, halfX: 1.6, halfZ: 1.0, top: 0.5 };
const stepDepth = 0.3;
const stepHalf = 0.65;

const buildTerrace = (builder: AttractionBuilder) => {
  builder.painted(
    new BoxGeometry(terrace.halfX * 2, terrace.top, terrace.halfZ * 2, 3, 2, 2),
    paintBands([desert.mudBrick, shade(desert.mudBrick, 0.9)], 0.125),
    { at: [terrace.x, terrace.top / 2, terrace.z] },
    "matte",
    undefined,
  );
  builder.box(
    "matte",
    desert.plaster,
    [terrace.halfX * 2 + 0.06, 0.04, terrace.halfZ * 2 + 0.06],
    [terrace.x, terrace.top + 0.02, terrace.z],
  );
  builder.box(
    "matte",
    shade(desert.mudBrick, 1.05),
    [stepHalf * 2, 0.25, stepDepth],
    [terrace.x, 0.125, terrace.z + terrace.halfZ + stepDepth / 2],
  );
  /* Rows of pots drying in the sun, and a rack of tall jars */
  const pots = builder.isFar ? 3 : 7;
  for (let pot = 0; pot < pots; pot++) {
    addPot(
      builder,
      [
        terrace.x - 1.3 + pot * (2.6 / (pots - 1)),
        terrace.top,
        terrace.z - 0.65,
      ],
      0.32 + (pot % 3) * 0.05,
      pot % 2 === 0 ? clayGrey : "#b0a088",
      pot % 3 === 1,
    );
  }
  if (!builder.isFar) {
    [-0.85, 0.85].forEach((dx, index) => {
      addPot(
        builder,
        [terrace.x + dx, terrace.top, terrace.z + 0.1],
        0.26,
        index % 2 === 0 ? desert.terracotta : desert.paleTerracotta,
      );
    });
  }
};

const terraceDeck: Deck = ({ x, z }) => {
  if (
    Math.abs(x - terrace.x) <= terrace.halfX &&
    Math.abs(z - terrace.z) <= terrace.halfZ
  ) {
    return { height: terrace.top, kind: "ground" };
  }
  if (
    Math.abs(x - terrace.x) <= stepHalf &&
    z > terrace.z + terrace.halfZ &&
    z <= terrace.z + terrace.halfZ + stepDepth
  ) {
    return { height: 0.25, kind: "ground" };
  }
  return undefined;
};

/* ------------------------------------------------------------------ */
/* The potter's shelter                                                */
/* ------------------------------------------------------------------ */

const shelter = { x: 3.1, z: 1.4, halfX: 1.7, halfZ: 1.3, eaves: 2.15 };
const wheelAt = { x: 3.1, z: 1.55 };

const buildShelter = (builder: AttractionBuilder) => {
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.cylinder("matte", desert.palmTrunk, {
        radius: 0.08,
        length: shelter.eaves + (sideZ < 0 ? 0.3 : 0),
        at: [
          shelter.x + sideX * shelter.halfX,
          (shelter.eaves + (sideZ < 0 ? 0.3 : 0)) / 2,
          shelter.z + sideZ * shelter.halfZ,
        ],
        segments: 8,
      });
    });
  });
  /* A sloping roof of palm leaves, ragged at the edge */
  addSlab(
    builder,
    "matte",
    palmThatch,
    [shelter.x, shelter.eaves + 0.38, shelter.z - shelter.halfZ - 0.3],
    [shelter.x, shelter.eaves + 0.02, shelter.z + shelter.halfZ + 0.3],
    shelter.halfX * 2 + 0.5,
    0.12,
  );
  if (!builder.isFar) {
    for (let frond = 0; frond < 8; frond++) {
      const x = shelter.x - shelter.halfX - 0.1 + frond * 0.5;
      addSlab(
        builder,
        "matte",
        frond % 2 === 0 ? "#a08a50" : palmThatch,
        [x, shelter.eaves + 0.05, shelter.z + shelter.halfZ + 0.2],
        [x + 0.1, shelter.eaves - 0.15, shelter.z + shelter.halfZ + 0.6],
        0.4,
        0.03,
      );
    }
  }
  /* The wheel's stand, and the potter sitting at it */
  builder.cylinder("matte", desert.darkTimber, {
    radius: 0.12,
    length: 0.5,
    at: [wheelAt.x, 0.25, wheelAt.z],
    segments: 10,
  });
  builder.cylinder("matte", desert.timber, {
    radius: 0.45,
    length: 0.06,
    at: [wheelAt.x, 0.04, wheelAt.z],
    segments: 16,
  });
  builder.cylinder("matte", desert.timber, {
    radius: 0.2,
    length: 0.35,
    at: [wheelAt.x, 0.18, wheelAt.z - 0.75],
    segments: 10,
  });
  const skin = "#b8805a";
  builder.cylinder("matte", "#e8e0d0", {
    radius: 0.18,
    radiusEnd: 0.15,
    length: 0.5,
    at: [wheelAt.x, 0.62, wheelAt.z - 0.75],
    segments: 10,
  });
  builder.sphere(
    "matte",
    skin,
    0.14,
    [wheelAt.x, 1.02, wheelAt.z - 0.72],
    [1, 1.05, 1],
    10,
  );
  builder.sphere(
    "matte",
    "#2a1a10",
    0.145,
    [wheelAt.x, 1.06, wheelAt.z - 0.75],
    [1, 0.9, 1],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      skin,
      [wheelAt.x + side * 0.17, 0.78, wheelAt.z - 0.72],
      [wheelAt.x + side * 0.12, 0.62, wheelAt.z - 0.25],
      0.07,
      6,
    );
    builder.bar(
      "matte",
      "#7a6a50",
      [wheelAt.x + side * 0.1, 0.4, wheelAt.z - 0.65],
      [wheelAt.x + side * 0.15, 0.36, wheelAt.z - 0.25],
      0.1,
      6,
    );
    builder.bar(
      "matte",
      "#7a6a50",
      [wheelAt.x + side * 0.15, 0.36, wheelAt.z - 0.25],
      [wheelAt.x + side * 0.15, 0.03, wheelAt.z - 0.25],
      0.08,
      6,
    );
  });
  /* A work bench of finished bowls and a bucket of slip */
  builder.box(
    "matte",
    desert.timber,
    [0.5, 0.08, 1.6],
    [shelter.x + 1.3, 0.75, shelter.z],
  );
  [-0.6, 0.6].forEach((dz) => {
    builder.box(
      "matte",
      desert.darkTimber,
      [0.4, 0.75, 0.08],
      [shelter.x + 1.3, 0.375, shelter.z + dz],
    );
  });
  if (!builder.isFar) {
    [-0.5, 0, 0.5].forEach((dz, index) => {
      builder.lathe(
        "matte",
        index === 1 ? desert.turquoise : desert.terracotta,
        [
          [0.001, 0],
          [0.1, 0.01],
          [0.17, 0.1],
          [0.15, 0.1],
          [0.001, 0.03],
        ],
        [shelter.x + 1.3, 0.79, shelter.z + dz],
        "y",
        12,
      );
    });
    builder.cylinder("matte", desert.darkTimber, {
      radius: 0.2,
      radiusEnd: 0.24,
      length: 0.4,
      at: [shelter.x - 1.2, 0.2, shelter.z + 0.6],
      segments: 12,
    });
    builder.cylinder("matte", "#c8b8a0", {
      radius: 0.21,
      length: 0.02,
      at: [shelter.x - 1.2, 0.39, shelter.z + 0.6],
      segments: 12,
    });
  }
};

/* ------------------------------------------------------------------ */
/* The clay tub, the clay pit and the yard                             */
/* ------------------------------------------------------------------ */

const tub = { x: -3.2, z: 2.8, radius: 0.85, rim: 0.42 };

const buildTub = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    desert.timber,
    new CylinderGeometry(
      tub.radius,
      tub.radius - 0.06,
      tub.rim,
      builder.segments(24, 10),
      1,
      true,
    ),
    { at: [tub.x, tub.rim / 2, tub.z] },
  );
  builder.add(
    "matte",
    desert.darkTimber,
    new CylinderGeometry(
      tub.radius - 0.08,
      tub.radius - 0.12,
      tub.rim,
      builder.segments(24, 10),
      1,
      true,
    ).scale(-1, 1, 1),
    { at: [tub.x, tub.rim / 2, tub.z] },
  );
  builder.cylinder("matte", wetClay, {
    radius: tub.radius - 0.08,
    length: 0.04,
    at: [tub.x, 0.22, tub.z],
    segments: 20,
  });
  [0.1, 0.32].forEach((y) => {
    builder.torus(
      "metal",
      "#4a4a4e",
      tub.radius + 0.01,
      0.025,
      [tub.x, y, tub.z],
      "y",
      24,
    );
  });
  /* A step up to it, and its clay-spattered sides */
  builder.box(
    "matte",
    desert.paleSandstone,
    [0.5, 0.2, 0.35],
    [tub.x + 1.1, 0.1, tub.z - 0.2],
  );
  if (!builder.isFar) {
    [0.3, 1.5, 2.6, 4.0, 5.2].forEach((angle) => {
      builder.sphere(
        "matte",
        wetClay,
        0.06,
        [
          tub.x + Math.sin(angle) * (tub.radius + 0.01),
          0.25 + (angle % 1) * 0.1,
          tub.z + Math.cos(angle) * (tub.radius + 0.01),
        ],
        [1, 1, 0.4],
        5,
      );
    });
  }
};

const pit = { x: -0.6, z: 4.6 };

const buildYard = (builder: AttractionBuilder) => {
  /* A trodden path from the sign */
  addSlab(
    builder,
    "matte",
    desert.paleSand,
    [1.2, 0.02, 7.6],
    [0.6, 0.02, 2.4],
    1.4,
    0.03,
  );
  addSlab(
    builder,
    "matte",
    desert.paleSand,
    [0.6, 0.02, 2.4],
    [-1.6, 0.02, 0.4],
    1.3,
    0.03,
  );
  /* The clay pit, dug out of the riverbank clay */
  builder.add(
    "matte",
    wetClay,
    new CylinderGeometry(1, 1, 0.05, builder.segments(20, 10)),
    { at: [pit.x, 0.03, pit.z], scale: [1.2, 1, 0.8] },
  );
  builder.add(
    "water",
    "#7a8a8a",
    new CylinderGeometry(1, 1, 0.03, builder.segments(16, 8)),
    { at: [pit.x + 0.3, 0.06, pit.z - 0.1], scale: [0.5, 1, 0.35] },
  );
  [-1.4, 1.4].forEach((dx, index) => {
    builder.sphere(
      "matte",
      clayGrey,
      0.35,
      [pit.x + dx, 0.12, pit.z + (index === 0 ? 0.3 : -0.2)],
      [1, 0.45, 0.8],
      builder.isFar ? 6 : 10,
    );
  });
  if (!builder.isFar) {
    /* A spade stuck in the clay, and a basket of clay balls */
    builder.bar(
      "matte",
      desert.timber,
      [pit.x - 0.9, 0.05, pit.z - 0.3],
      [pit.x - 1.0, 1.1, pit.z - 0.35],
      0.05,
      6,
    );
    builder.box(
      "metal",
      palette.darkSteel,
      [0.22, 0.28, 0.03],
      [pit.x - 0.9, 0.12, pit.z - 0.3],
    );
    builder.cylinder("matte", "#c8a868", {
      radius: 0.3,
      radiusEnd: 0.24,
      length: 0.3,
      at: [pit.x + 1.3, 0.15, pit.z + 0.6],
      segments: 12,
    });
    [0, 1, 2].forEach((ball) => {
      builder.sphere(
        "matte",
        clayGrey,
        0.1,
        [pit.x + 1.25 + ball * 0.06, 0.32, pit.z + 0.55 + (ball % 2) * 0.1],
        [1, 1, 1],
        6,
      );
    });
  }
  /* Pots, big and small, all round the yard */
  addPot(builder, [-5.4, 0, -0.9], 0.7, desert.terracotta, true);
  addPot(builder, [-5.8, 0, -0.2], 0.5, desert.paleTerracotta, true);
  addPot(builder, [-0.2, 0, -1.2], 0.45, desert.terracotta);
  addPot(builder, [5.6, 0, 2.6], 0.55, desert.turquoise);
  addPot(builder, [-1.6, 0, 6.2], 0.5, desert.paleTerracotta, true);
  addPot(builder, [2.6, 0, 5.6], 0.4, desert.terracotta);
  /* A water trough */
  builder.box("matte", desert.paleSandstone, [1.3, 0.4, 0.6], [-6.0, 0.2, 3.9]);
  builder.box("water", desert.water, [1.1, 0.04, 0.42], [-6.0, 0.38, 3.9]);
  addPalm(builder, [-6.4, 0, -3.8], 3.5, [0.1, 0.1], 0.5);
  addPalm(builder, [6.6, 0, -1.4], 3.2, [-0.12, 0.06], 1.4);
  addPalm(builder, [-6.0, 0, 5.6], 2.9, [0.08, -0.1], 2.2);
  [
    [6.0, 5.0, 0.4],
    [0.4, -5.6, 0.45],
    [-7.4, 1.6, 0.4],
    [5.4, -5.6, 0.35],
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
      [-3.6, -5.6],
      [1.6, -6.4],
      [7.0, 2.0],
      [-7.2, -1.6],
    ].forEach(([x, z], index) => {
      addRock(
        builder,
        index % 2 === 0 ? desert.sandstone : desert.paleSandstone,
        [x, 0.08, z],
        [0.25, 0.16, 0.2],
        index * 1.7 + 3,
      );
    });
    /* Broken bits of pot, thrown on the heap */
    for (let shard = 0; shard < 8; shard++) {
      builder.box(
        "matte",
        shard % 2 === 0 ? desert.terracotta : desert.paleTerracotta,
        [0.18, 0.03, 0.12],
        [
          -0.4 + Math.sin(shard * 2.3) * 0.5,
          0.03 + (shard % 3) * 0.02,
          -4.8 + Math.cos(shard * 1.7) * 0.4,
        ],
        [0.2 * (shard % 3), shard, 0.15],
      );
    }
  }
  addSignBoard(builder, signAt, signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts and wanderers                                          */
/* ------------------------------------------------------------------ */

const buildPottersWheel = (builder: AttractionBuilder) => {
  builder.cylinder("matte", desert.timber, {
    radius: 0.36,
    length: 0.08,
    at: [0, 0.04, 0],
    segments: 20,
  });
  /* A pot being thrown, wet and shining */
  builder.lathe(
    "paint",
    wetClay,
    [
      [0.001, 0.08],
      [0.18, 0.08],
      [0.24, 0.22],
      [0.2, 0.38],
      [0.12, 0.46],
      [0.14, 0.5],
      [0.1, 0.5],
      [0.001, 0.2],
    ],
    [0, 0, 0],
    "y",
    16,
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      shade(desert.timber, 0.8),
      [0.08, 0.02, 0.3],
      [0.2, 0.08, 0],
    );
  }
};

const buildFlames = (builder: AttractionBuilder) => {
  [
    [-0.18, 0.4, 0.14],
    [0.05, 0.55, 0.17],
    [0.22, 0.38, 0.12],
  ].forEach(([x, height, radius], index) => {
    builder.add(
      "glow",
      index === 1 ? "#ffd27a" : desert.flame,
      new ConeGeometry(radius, height, builder.segments(8, 4)),
      { at: [x, height / 2, 0] },
    );
  });
};

const buildGlow = (builder: AttractionBuilder) => {
  builder.sphere("glow", "#ff9a40", 0.5, [0, 0.35, 0.1], [1.1, 0.7, 0.3], 12);
};

const buildHen = (builder: AttractionBuilder) => {
  const feathers = "#c8783a";
  builder.sphere("matte", feathers, 0.16, [0, 0.2, 0], [0.8, 0.85, 1.15], 8);
  builder.sphere("matte", feathers, 0.09, [0, 0.38, 0.13], [1, 1, 1], 8);
  builder.box("matte", "#d02a2a", [0.03, 0.07, 0.08], [0, 0.48, 0.13]);
  builder.box("matte", "#e8b030", [0.04, 0.03, 0.07], [0, 0.37, 0.24]);
  builder.sphere(
    "matte",
    shade(feathers, 0.7),
    0.08,
    [0, 0.28, -0.18],
    [0.6, 1.2, 0.8],
    6,
  );
  [-0.05, 0.05].forEach((x) => {
    builder.bar("matte", "#e8b030", [x, 0.1, 0], [x, 0, 0.02], 0.025, 4);
  });
};

/* ------------------------------------------------------------------ */
/* The clay stomp                                                      */
/* ------------------------------------------------------------------ */

const rideStart = { x: tub.x + 1.45, z: tub.z + 0.35 };
const rideFinish = { x: tub.x - 1.4, z: tub.z - 0.6 };

const stompRide = (progress: number, seconds: number): LocalSpot => {
  const floor = 0.24;
  if (progress < 0.12) {
    const share = progress / 0.12;
    return {
      x: rideStart.x + (tub.x + 0.45 - rideStart.x) * share,
      y: floor * share + Math.sin(share * Math.PI) * 0.5,
      z: rideStart.z + (tub.z - rideStart.z) * share,
      heading: -Math.PI / 2,
    };
  }
  if (progress < 0.88) {
    /* Round and round, stamping the clay soft */
    const share = (progress - 0.12) / 0.76;
    const angle = share * Math.PI * 4;
    return {
      x: tub.x + Math.cos(angle) * 0.45,
      y: floor + Math.abs(Math.sin(seconds * 9)) * 0.12,
      z: tub.z - Math.sin(angle) * 0.45,
      heading: Math.PI - angle,
    };
  }
  const share = (progress - 0.88) / 0.12;
  return {
    x: tub.x + 0.45 + (rideFinish.x - tub.x - 0.45) * share,
    y: floor * (1 - share) + Math.sin(share * Math.PI) * 0.55,
    z: tub.z + (rideFinish.z - tub.z) * share,
    heading: -Math.PI / 2,
  };
};

const shelterPosts: LocalBlocker[] = [-1, 1].flatMap((sideX) =>
  [-1, 1].map((sideZ) => ({
    x: shelter.x + sideX * shelter.halfX,
    z: shelter.z + sideZ * shelter.halfZ,
    radius: 0.2,
  })),
);

export const potteryKilnModel: NewLandAttractionModel = {
  kind: "pottery-kiln",
  islandId: "sunscorch-sands",
  name: "Pottery Kiln",
  fact: "Clay is a kind of soil made of tiny, sticky grains. When it is wet you can squeeze it into any shape, and when it is baked in a very hot kiln it changes for ever into hard pottery that can hold water. People have been making pots like this since the Stone Age.",
  curriculumLink:
    "Science, Year 3: rocks and soils. How soils such as clay are made from rocks, and how clay changes when it is fired.",
  footprint: 9,
  setting: "inland",
  padColour: desert.sand,
  signSpot: { x: signAt[0], z: signAt[2] + 0.9 },
  build: (builder) => {
    buildKiln(builder);
    buildTerrace(builder);
    buildShelter(builder);
    buildTub(builder);
    buildYard(builder);
  },
  moving: [
    {
      name: "potters-wheel",
      pivot: [wheelAt.x, 0.5, wheelAt.z],
      build: buildPottersWheel,
      motion: { kind: "whirl", axis: "y", idle: 0.6, speed: 9, reach: 4.5 },
    },
    {
      name: "fire",
      pivot: [mouth.x, 0.06, mouth.z + 0.02],
      build: buildFlames,
      motion: { kind: "flicker", period: 0.6 },
    },
    {
      name: "fire-glow",
      pivot: [mouth.x, 0.05, mouth.z + 0.1],
      build: buildGlow,
      motion: { kind: "wake", reach: 5 },
    },
  ],
  wanderers: [
    {
      name: "hens",
      build: buildHen,
      count: 3,
      centre: { x: 0.2, z: 2.6 },
      radius: 1.6,
      speed: 0.35,
    },
    {
      name: "apprentices",
      build: buildPerson({
        skin: "#a8704a",
        top: "#e8e0d0",
        bottom: "#8a6a50",
        hair: "#1a1008",
      }),
      count: 1,
      centre: { x: -1.2, z: -4.8 },
      radius: 1.0,
      speed: 0.25,
    },
  ],
  smoke: [
    {
      at: [kiln.x, kiln.height + 0.3, kiln.z],
      colour: "#d8d0c4",
      puffs: 8,
      size: 0.5,
      rise: 3.2,
      spread: 0.7,
    },
  ],
  blockers: [
    { x: kiln.x, z: kiln.z, radius: kiln.radius + 0.1 },
    { x: tub.x, z: tub.z, radius: tub.radius + 0.1 },
    { x: wheelAt.x, z: wheelAt.z - 0.3, radius: 0.6 },
    ...shelterPosts,
  ],
  decks: [terraceDeck],
  rides: [
    {
      id: "clay-tub",
      name: "the clay tub",
      start: rideStart,
      reach: 0.55,
      seconds: 10,
      finish: rideFinish,
      follow: stompRide,
    },
  ],
  play: {
    label: "Fire up the kiln",
    news: "Whoosh! You fed the fire with sticks, and the kiln glowed orange-hot to bake the soft clay pots hard for ever.",
  },
};
