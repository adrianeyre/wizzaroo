import { ConeGeometry, CylinderGeometry, LatheGeometry, Vector2 } from "three";
import {
  addBench,
  addDoor,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type MovingPart,
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
  followPath,
  listCurve,
  listTroughSection,
  makeSweep,
  paintBands,
} from "./sandstone-arches-parts.js";

/*
 * A tall striped tower of sandstone and terracotta with a slide that
 * spirals twice round it, from a domed lookout at the top down to a pit
 * of soft sand. Climb the stairs inside and whizz down; climb the big
 * dune beside it; and watch the meerkats pop up from their burrows.
 */

const signColour = "#d08a1e";
const signAt: Triple = [2.4, 0, 8.6];
const towerBands = [
  "#c4673f",
  desert.plaster,
  "#d9a24a",
  desert.plaster,
] as const;
const chuteYellow = "#f2b632";
const chuteEdge = "#2f9fa6";
const domeBlue = "#2f7fae";

const tower = { x: 0.5, z: -1.8, radius: 1.25, top: 5.0 };
const slide = {
  radius: 2.05,
  chute: 0.38,
  high: 4.95,
  low: 0.42,
  sweep: Math.PI * 3.5,
};

/** The middle of the chute, a share of the way down. */
const findChutePoint = (share: number): Triple => {
  const angle = share * slide.sweep;
  return [
    tower.x + Math.sin(angle) * slide.radius,
    slide.high + (slide.low - slide.high) * share,
    tower.z + Math.cos(angle) * slide.radius,
  ];
};

/** The straight run out of the bottom of the chute, towards +z. */
const runOut = {
  x: tower.x - slide.radius,
  fromZ: tower.z,
  toZ: tower.z + 2.4,
  toY: 0.16,
};

const listChutePath = (steps: number): Triple[] => [
  ...listCurve(steps, findChutePoint),
  [runOut.x, (slide.low + runOut.toY) / 2, (runOut.fromZ + runOut.toZ) / 2],
  [runOut.x, runOut.toY, runOut.toZ],
];

/* ------------------------------------------------------------------ */
/* The tower                                                           */
/* ------------------------------------------------------------------ */

const buildTower = (builder: AttractionBuilder) => {
  const { x, z, radius, top } = tower;
  builder.cylinder("matte", desert.paleSandstone, {
    radius: radius + 0.25,
    length: 0.28,
    at: [x, 0.14, z],
    segments: 24,
  });
  const profile: Vector2[] = [];
  const rings = builder.isFar ? 5 : 10;
  for (let ring = 0; ring <= rings; ring++) {
    const y = 0.28 + ((top - 0.28) * ring) / rings;
    profile.push(new Vector2(radius - (ring / rings) * 0.15, y));
  }
  builder.painted(
    new LatheGeometry(profile, builder.segments(24, 10)),
    paintBands(towerBands, (tower.top - 0.28) / 10, -0.28),
    { at: [x, 0, z] },
    "matte",
  );
  /* The door in front, under the chute, and little round windows */
  addDoor(builder, {
    at: [x, 0.28, z + radius - 0.02],
    width: 0.7,
    height: 1.3,
    colour: desert.turquoise,
    frame: desert.paleSandstone,
  });
  if (!builder.isFar) {
    for (let window = 0; window < 7; window++) {
      const angle = 1.2 + window * 1.55;
      const y = 1.1 + window * 0.55;
      const out = radius - (y / top) * 0.15 + 0.01;
      builder.cylinder("glass", palette.glass, {
        radius: 0.14,
        length: 0.06,
        at: [x + Math.sin(angle) * out, y, z + Math.cos(angle) * out],
        axis: "z",
        segments: 10,
      });
    }
  }
  /* The lookout at the top: a round floor, pillars and a blue dome */
  builder.cylinder("matte", desert.paleSandstone, {
    radius: radius + 0.3,
    length: 0.18,
    at: [x, top + 0.09, z],
    segments: 24,
  });
  const pillars = builder.isFar ? 4 : 8;
  for (let pillar = 0; pillar < pillars; pillar++) {
    const angle = (pillar / pillars) * Math.PI * 2 + Math.PI / pillars;
    builder.cylinder("matte", desert.plaster, {
      radius: 0.08,
      length: 1.3,
      at: [
        x + Math.sin(angle) * (radius - 0.05),
        top + 0.83,
        z + Math.cos(angle) * (radius - 0.05),
      ],
      segments: 8,
    });
  }
  builder.cylinder("matte", "#c4673f", {
    radius: radius + 0.15,
    length: 0.22,
    at: [x, top + 1.58, z],
    segments: 24,
  });
  builder.lathe(
    "paint",
    domeBlue,
    [
      [radius + 0.05, 0],
      [radius + 0.12, 0.25],
      [radius - 0.05, 0.75],
      [0.75, 1.15],
      [0.3, 1.45],
      [0.08, 1.7],
      [0.001, 1.78],
    ],
    [x, top + 1.69, z],
    "y",
    builder.isFar ? 10 : 24,
  );
  builder.cylinder("metal", palette.brass, {
    radius: 0.03,
    length: 0.7,
    at: [x, top + 3.6, z],
    segments: 6,
  });
  builder.sphere("metal", palette.brass, 0.1, [x, top + 3.47, z]);
  /* A low wall round the lookout floor, open where the chute starts */
  if (!builder.isFar) {
    for (let panel = 0; panel < 10; panel++) {
      const angle = (panel / 10) * Math.PI * 2 + 0.31;
      if (Math.abs(Math.sin(angle / 2)) < 0.2) {
        continue;
      }
      builder.box(
        "matte",
        desert.plaster,
        [0.7, 0.4, 0.08],
        [
          x + Math.sin(angle) * (radius + 0.25),
          top + 0.38,
          z + Math.cos(angle) * (radius + 0.25),
        ],
        [0, angle, 0],
      );
    }
  }
};

/* ------------------------------------------------------------------ */
/* The slide                                                           */
/* ------------------------------------------------------------------ */

const buildSlide = (builder: AttractionBuilder) => {
  const path = listChutePath(builder.isFar ? 28 : 60);
  builder.add(
    "paint",
    chuteYellow,
    makeSweep({
      path,
      section: listTroughSection(0.8, builder.isFar ? 4 : 6),
      size: () => [slide.chute, slide.chute],
      isCapped: false,
    }),
  );
  if (!builder.isFar) {
    /* Rolled turquoise edges along both lips */
    [-1, 1].forEach((side) => {
      builder.add(
        "paint",
        chuteEdge,
        makeSweep({
          path: path.map(([x, y, z], index): Triple => {
            const [nextX, , nextZ] = path[Math.min(path.length - 1, index + 1)];
            const [lastX, , lastZ] = path[Math.max(0, index - 1)];
            const length = Math.hypot(nextX - lastX, nextZ - lastZ);
            return [
              x + (side * (nextZ - lastZ) * slide.chute * 0.9) / length,
              y + 0.02,
              z - (side * (nextX - lastX) * slide.chute * 0.9) / length,
            ];
          }),
          section: [
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
          ],
          size: () => [0.05, 0.05],
        }),
      );
    });
  }
  /* Arms from the tower out to the chute */
  const arms = builder.isFar ? 6 : 14;
  for (let arm = 0; arm < arms; arm++) {
    const share = (arm + 0.5) / arms;
    const [x, y, z] = findChutePoint(share);
    const angle = share * slide.sweep;
    const inner = tower.radius - 0.1;
    builder.bar(
      "metal",
      palette.steel,
      [
        tower.x + Math.sin(angle) * inner,
        y - slide.chute - 0.25,
        tower.z + Math.cos(angle) * inner,
      ],
      [x, y - slide.chute + 0.02, z],
      0.07,
      6,
    );
  }
  /* Two legs under the run-out */
  builder.box(
    "metal",
    palette.steel,
    [0.06, 0.2, 0.06],
    [runOut.x, 0.1, runOut.toZ - 0.5],
  );
};

/* ------------------------------------------------------------------ */
/* The dune, the landing pit and the burrows                           */
/* ------------------------------------------------------------------ */

const dune = { x: 4.6, z: 2.6, radius: 2.6, height: 0.95, stretch: 1.25 };

const findDuneHeight = (x: number, z: number): number => {
  const distance = Math.hypot((x - dune.x) / dune.stretch, z - dune.z);
  if (distance >= dune.radius) {
    return 0;
  }
  return dune.height * Math.cos((distance / dune.radius) * (Math.PI / 2)) ** 2;
};

const duneDeck: Deck = ({ x, z }) => {
  const height = findDuneHeight(x, z);
  return height > 0.06 ? { height, kind: "ground" } : undefined;
};

const burrows = [
  { x: 5.6, z: -3.4 },
  { x: 6.6, z: -2.2 },
];

const buildGrounds = (builder: AttractionBuilder) => {
  /* The dune, rippled by the wind */
  const steps = builder.isFar ? 5 : 12;
  builder.add(
    "matte",
    desert.paleSand,
    new LatheGeometry(
      Array.from({ length: steps + 1 }, (_, step) => {
        const distance = dune.radius * (1 - step / steps);
        return new Vector2(
          Math.max(0.001, distance),
          dune.height * Math.cos((distance / dune.radius) * (Math.PI / 2)) ** 2,
        );
      }),
      builder.segments(28, 12),
    ),
    { at: [dune.x, 0, dune.z], scale: [dune.stretch, 1, 1] },
  );
  if (!builder.isFar) {
    for (let ripple = 0; ripple < 5; ripple++) {
      const z = dune.z - 1.6 + ripple * 0.7;
      const x = dune.x - 0.6 + Math.sin(ripple) * 0.4;
      addSlab(
        builder,
        "matte",
        desert.dampSand,
        [x - 0.6, findDuneHeight(x - 0.6, z) + 0.02, z],
        [x + 0.6, findDuneHeight(x + 0.6, z + 0.15) + 0.02, z + 0.15],
        0.06,
        0.02,
      );
    }
  }
  /* The soft sand landing pit, edged with timber */
  const pitZ = runOut.toZ + 0.9;
  builder.box(
    "matte",
    desert.paleSand,
    [1.8, 0.08, 2.0],
    [runOut.x, 0.04, pitZ],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      desert.timber,
      [0.1, 0.18, 2.0],
      [runOut.x + side * 0.95, 0.09, pitZ],
    );
  });
  builder.box(
    "matte",
    desert.timber,
    [2.0, 0.18, 0.1],
    [runOut.x, 0.09, pitZ + 1.0],
  );
  /* A path to the tower door */
  addSlab(
    builder,
    "matte",
    desert.paleSandstone,
    [signAt[0], 0.02, signAt[2] - 0.6],
    [tower.x, 0.02, tower.z + tower.radius + 0.2],
    1.3,
    0.03,
  );
  /* Burrow mounds for the meerkats */
  burrows.forEach(({ x, z }) => {
    builder.lathe(
      "matte",
      desert.dampSand,
      [
        [0.7, 0],
        [0.5, 0.15],
        [0.22, 0.24],
        [0.2, 0.2],
        [0.001, 0.05],
      ],
      [x, 0, z],
      "y",
      builder.isFar ? 8 : 16,
    );
    builder.cylinder("matte", desert.charcoal, {
      radius: 0.16,
      length: 0.02,
      at: [x, 0.21, z],
      segments: 10,
    });
  });
  /* A lemonade stall with a striped awning */
  const stall = { x: -4.8, z: 3.4 };
  builder.box(
    "paint",
    desert.plaster,
    [1.6, 0.9, 0.7],
    [stall.x, 0.45, stall.z],
  );
  builder.box("paint", "#c4673f", [1.7, 0.08, 0.8], [stall.x, 0.94, stall.z]);
  [-0.75, 0.75].forEach((dx) => {
    builder.cylinder("matte", desert.darkTimber, {
      radius: 0.04,
      length: 1.3,
      at: [stall.x + dx, 1.6, stall.z - 0.3],
      segments: 6,
    });
  });
  const stripes = builder.isFar ? 1 : 6;
  for (let stripe = 0; stripe < stripes; stripe++) {
    const width = 1.9 / stripes;
    addSlab(
      builder,
      "paint",
      stripe % 2 === 0 ? "#e04a3a" : palette.white,
      [stall.x - 0.95 + width * (stripe + 0.5), 2.25, stall.z - 0.35],
      [stall.x - 0.95 + width * (stripe + 0.5), 1.95, stall.z + 0.65],
      width,
      0.03,
    );
  }
  if (!builder.isFar) {
    [-0.45, 0, 0.45].forEach((dx, index) => {
      builder.cylinder("glass", ["#f5e050", "#f09040", "#e86a8a"][index], {
        radius: 0.09,
        length: 0.24,
        at: [stall.x + dx, 1.1, stall.z + 0.1],
        segments: 10,
      });
    });
  }
  addBench(builder, [2.6, 0, 3.2], Math.PI, desert.timber);
  addBench(builder, [-3.4, 0, -4.8], 0.6, desert.timber);
  addPalm(builder, [-6.6, 0, -1.6], 3.6, [0.12, 0.05], 0.5);
  addPalm(builder, [6.8, 0, -5.4], 3.1, [-0.1, 0.1], 1.6);
  addPalm(builder, [-2.8, 0, 7.4], 3.0, [0.08, -0.12], 2.4);
  addPot(builder, [-1.0, 0, 1.6], 0.5, desert.terracotta, true);
  addPot(builder, [2.2, 0, 1.2], 0.45, desert.paleTerracotta);
  [
    [-7.6, 2.6, 0.45],
    [7.8, 0.8, 0.4],
    [0.6, -7.2, 0.5],
    [-4.6, -7.0, 0.4],
    [5.6, 6.6, 0.35],
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
      [-5.6, -4.4],
      [3.6, -6.4],
      [7.6, 4.2],
      [-7.0, 5.6],
    ].forEach(([x, z], index) => {
      addRock(
        builder,
        index % 2 === 0 ? desert.sandstone : desert.redSandstone,
        [x, 0.08, z],
        [0.26, 0.17, 0.2],
        index * 2.1 + 5,
      );
    });
  }
  addSignBoard(builder, signAt, signColour);
};

/* ------------------------------------------------------------------ */
/* Moving parts and wanderers                                          */
/* ------------------------------------------------------------------ */

const buildSpinner = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#f2b632", 0.14, [0, 0, 0], [1, 1, 0.5], 10);
  const petals = builder.isFar ? 4 : 8;
  for (let petal = 0; petal < petals; petal++) {
    const angle = (petal / petals) * Math.PI * 2;
    builder.add(
      "paint",
      petal % 2 === 0 ? "#e04a3a" : "#f2b632",
      new ConeGeometry(0.12, 0.42, 4).rotateZ(-angle),
      { at: [Math.sin(angle) * 0.32, Math.cos(angle) * 0.32, 0] },
    );
  }
};

const buildMeerkat = (builder: AttractionBuilder) => {
  const fur = "#c9a46c";
  const sides = builder.isFar ? 5 : 9;
  builder.add(
    "matte",
    fur,
    new CylinderGeometry(0.09, 0.12, 0.45, builder.segments(sides, 5)),
    { at: [0, 0.22, 0] },
  );
  builder.sphere("matte", fur, 0.09, [0, 0.5, 0.02], [0.9, 1, 1.1], sides);
  builder.add(
    "matte",
    shade(fur, 0.9),
    new ConeGeometry(0.045, 0.12, 6).rotateX(Math.PI / 2),
    { at: [0, 0.49, 0.13] },
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.sphere(
        "matte",
        desert.charcoal,
        0.03,
        [side * 0.045, 0.52, 0.08],
        [1, 0.8, 0.6],
        5,
      );
      builder.bar(
        "matte",
        fur,
        [side * 0.08, 0.36, 0.05],
        [side * 0.05, 0.28, 0.12],
        0.035,
        4,
      );
    });
    builder.sphere(
      "matte",
      desert.charcoal,
      0.015,
      [0, 0.49, 0.19],
      [1, 1, 1],
      4,
    );
  }
};

/* ------------------------------------------------------------------ */
/* The ride                                                            */
/* ------------------------------------------------------------------ */

const rideStart = { x: tower.x, z: tower.z + 3.1 };
const rideFinish = { x: runOut.x, z: runOut.toZ + 2.3 };
const chuteRidePath = listChutePath(120).map(([x, y, z]): Triple => [
  x,
  y - slide.chute * 0.55,
  z,
]);

const slideRide = (progress: number): LocalSpot => {
  if (progress < 0.3) {
    /* In at the door, and up the stairs inside */
    const share = progress / 0.3;
    const door: Triple = [tower.x, 0, tower.z + tower.radius - 0.2];
    const climb = (share - 0.15) / 0.85;
    if (share < 0.15) {
      return followPath([[rideStart.x, 0, rideStart.z], door], share / 0.15);
    }
    const turn = climb * Math.PI * 4;
    return {
      x: tower.x + Math.sin(turn) * 0.6,
      y: climb * (tower.top + 0.2),
      z: tower.z + Math.cos(turn) * 0.6,
      heading: turn + Math.PI / 2,
    };
  }
  if (progress < 0.36) {
    const share = (progress - 0.3) / 0.06;
    return followPath(
      [[tower.x, tower.top + 0.2, tower.z], chuteRidePath[0]],
      share,
    );
  }
  if (progress < 0.9) {
    /* Whizz round and round, faster and faster */
    const share = ((progress - 0.36) / 0.54) ** 1.3;
    return followPath(chuteRidePath, share);
  }
  const share = (progress - 0.9) / 0.1;
  const [x, y, z] = chuteRidePath[chuteRidePath.length - 1];
  return {
    x: x + (rideFinish.x - x) * share,
    y: Math.max(0, y * (1 - share)),
    z: z + (rideFinish.z - z) * share,
    heading: Math.atan2(rideFinish.x - x, rideFinish.z - z),
  };
};

export const sandSlideTowerModel: NewLandAttractionModel = {
  kind: "sand-slide-tower",
  islandId: "sunscorch-sands",
  name: "Sand Slide Tower",
  fact: "When you whizz down a slide, gravity pulls you down while friction between you and the slide slows you. A smooth, polished slide has less friction, so you go faster; on a rough or sandy slide there is more friction, and you slow down.",
  curriculumLink:
    "Science, Year 3: forces. How gravity pulls things down, and how friction slows things moving over different surfaces.",
  footprint: 10,
  setting: "inland",
  padColour: desert.sand,
  signSpot: { x: signAt[0], z: signAt[2] + 0.9 },
  build: (builder) => {
    buildTower(builder);
    buildSlide(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "sun-spinner",
      pivot: [tower.x, tower.top + 3.0, tower.z + 0.12],
      build: buildSpinner,
      motion: { kind: "whirl", axis: "z", idle: 0.5, speed: 7, reach: 6 },
    },
    ...burrows.map(({ x, z }, index): MovingPart => ({
      name: `meerkat-${String(index)}`,
      pivot: [x, -0.42, z],
      build: buildMeerkat,
      motion: {
        kind: "rise",
        reach: 3.5,
        height: 0.62,
        period: 1.6 + index * 0.3,
        phase: index,
      },
    })),
  ],
  wanderers: [
    {
      name: "children",
      build: buildPerson({
        skin: "#e0b48c",
        top: "#e04a3a",
        bottom: "#2f5f9a",
        hair: "#6a3a1a",
      }),
      count: 3,
      centre: { x: 0.6, z: 4.6 },
      radius: 2.2,
      speed: 0.45,
    },
  ],
  blockers: [
    { x: tower.x, z: tower.z, radius: tower.radius + 0.15 },
    ...burrows.map(({ x, z }): LocalBlocker => ({ x, z, radius: 0.35 })),
  ],
  decks: [duneDeck],
  tune: [79, 76, 74, 71, 67, 64, 60],
  rides: [
    {
      id: "spiral-slide",
      name: "the spiral sand slide",
      start: rideStart,
      reach: 0.6,
      seconds: 14,
      finish: rideFinish,
      follow: slideRide,
    },
  ],
  play: {
    label: "Polish the slide",
    news: "Swish! You polished the slide with wax, so now there's less friction, and everyone whizzes down even faster.",
  },
};
