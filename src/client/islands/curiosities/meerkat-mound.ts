import { ConeGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const moundSand = "#d9b678";
const dugSand = "#c79f63";
const fur = "#c9a26a";
const belly = "#ead5a8";
const mask = "#4a3420";
const rockColour = "#b08a62";
const signColour = "#a0522d";

const mound = { x: 0, z: -0.6, radius: 2.3, height: 0.75 };
const surfaceAt = (x: number, z: number): number => {
  const share = Math.hypot(x - mound.x, z - mound.z) / mound.radius;
  return share >= 1 ? 0 : mound.height * (1 - share * share);
};

interface Burrow {
  x: number;
  z: number;
  /** Whether a meerkat pops out of it. */
  hasMeerkat: boolean;
  phase: number;
  lift: number;
  turn: number;
}

const burrows: Burrow[] = [
  { x: -0.25, z: -0.4, hasMeerkat: true, phase: 0, lift: 0.66, turn: 0.2 },
  { x: 0.75, z: -1.15, hasMeerkat: true, phase: 2.1, lift: 0.6, turn: -0.4 },
  { x: -1.1, z: -1.3, hasMeerkat: true, phase: 4.2, lift: 0.7, turn: 0.6 },
  { x: 0.55, z: 0.45, hasMeerkat: false, phase: 0, lift: 0, turn: 0 },
  { x: -1.25, z: 0.3, hasMeerkat: false, phase: 0, lift: 0, turn: 0 },
];
const rimHeight = 0.06;
const burrowMouth = (burrow: Burrow): Triple => [
  burrow.x,
  surfaceAt(burrow.x, burrow.z) + rimHeight,
  burrow.z,
];
const rock = { x: 1.95, z: 1.05, top: 0.78 };
const lookoutNeck: Triple = [
  rock.x,
  rock.top - 0.05 + 0.53 * 1.1,
  rock.z + 0.022,
];

/** A meerkat standing up tall on its back legs and tail, facing +z (turned by `turn`), feet at `at`. */
const addMeerkat = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  size = 1,
  withHead = true,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + (x * Math.cos(turn) + z * Math.sin(turn)) * size,
    at[1] + y * size,
    at[2] + (-x * Math.sin(turn) + z * Math.cos(turn)) * size,
  ];
  const far = builder.isFar;
  builder.sphere(
    "matte",
    fur,
    0.13 * size,
    place(0, 0.28, -0.01),
    [0.95, 1.9, 0.85],
    far ? 6 : 12,
  );
  if (far) {
    builder.sphere(
      "matte",
      fur,
      0.08 * size,
      place(0, 0.58, 0.02),
      [1, 1, 1.2],
      5,
    );
    return;
  }
  builder.sphere(
    "matte",
    belly,
    0.1 * size,
    place(0, 0.27, 0.04),
    [0.9, 1.8, 0.7],
    10,
  );
  /* Back legs, crouched, and big feet */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      shade(fur, 0.95),
      0.06 * size,
      place(side * 0.08, 0.07, 0.0),
      [0.9, 1.2, 1.2],
      6,
    );
    builder.sphere(
      "matte",
      shade(fur, 0.8),
      0.035 * size,
      place(side * 0.08, 0.015, 0.06),
      [1, 0.5, 1.6],
      5,
    );
    /* Little arms held in front, paws dangling */
    builder.bar(
      "matte",
      fur,
      place(side * 0.08, 0.42, 0.06),
      place(side * 0.06, 0.32, 0.12),
      0.035 * size,
      5,
    );
    builder.sphere(
      "matte",
      mask,
      0.022 * size,
      place(side * 0.06, 0.31, 0.125),
      [1, 1, 1],
      4,
    );
  });
  /* The tail, propping it up from behind, with a dark tip */
  builder.bar(
    "matte",
    fur,
    place(0, 0.12, -0.1),
    place(0, 0.015, -0.32),
    0.04 * size,
    5,
  );
  builder.sphere(
    "matte",
    mask,
    0.025 * size,
    place(0, 0.015, -0.34),
    [1, 1, 1.4],
    4,
  );
  if (withHead) {
    addMeerkatHead(builder, place(0, 0.53, 0.02), turn, size);
  }
};

/** A meerkat's head: a pointed face, dark eye patches and little ears. */
const addMeerkatHead = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  size = 1,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + (x * Math.cos(turn) + z * Math.sin(turn)) * size,
    at[1] + y * size,
    at[2] + (-x * Math.sin(turn) + z * Math.cos(turn)) * size,
  ];
  builder.sphere(
    "matte",
    fur,
    0.075 * size,
    place(0, 0.05, 0),
    [1, 0.95, 1.05],
    10,
  );
  builder.add(
    "matte",
    shade(fur, 1.06),
    new ConeGeometry(0.045 * size, 0.11 * size, 7),
    {
      at: place(0, 0.035, 0.1),
      rotation: [Math.PI / 2 - 0.25, turn, 0],
    },
  );
  builder.sphere(
    "matte",
    palette.black,
    0.014 * size,
    place(0, 0.02, 0.155),
    [1, 1, 1],
    4,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      mask,
      0.03 * size,
      place(side * 0.035, 0.07, 0.055),
      [1.1, 0.8, 0.5],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.013 * size,
      place(side * 0.035, 0.07, 0.068),
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "matte",
      mask,
      0.018 * size,
      place(side * 0.065, 0.1, -0.02),
      [0.6, 1, 0.8],
      4,
    );
  });
};

const buildMound = (builder: AttractionBuilder) => {
  const steps = 8;
  const profile = Array.from(
    { length: steps + 1 },
    (_, step): [number, number] => {
      const share = step / steps;
      return [
        mound.radius * (1 - share) + 0.001,
        mound.height * (1 - (1 - share) ** 2) - 0.02,
      ];
    },
  );
  builder.lathe(
    "matte",
    moundSand,
    profile,
    [mound.x, 0, mound.z],
    "y",
    builder.segments(36, 10),
  );
  burrows.forEach((burrow) => {
    const [x, y, z] = burrowMouth(burrow);
    builder.lathe(
      "matte",
      dugSand,
      [
        [0.42, -0.08],
        [0.3, 0.0],
        [0.2, 0.0],
        [0.16, -0.02],
      ],
      [x, y - rimHeight + 0.02, z],
      "y",
      builder.isFar ? 6 : 16,
    );
    builder.cylinder("matte", "#2a1d12", {
      radius: 0.17,
      length: 0.02,
      at: [x, y - 0.03, z],
      segments: builder.isFar ? 6 : 16,
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Kicked-out sand in fans below the burrows, and pebbles */
  burrows.forEach((burrow, index) => {
    const outX = burrow.x - mound.x;
    const outZ = burrow.z - mound.z;
    const length = Math.hypot(outX, outZ) || 1;
    const x = burrow.x + (outX / length) * 0.45;
    const z = burrow.z + (outZ / length) * 0.45;
    builder.sphere(
      "matte",
      shade(dugSand, 1.05),
      0.28,
      [x, surfaceAt(x, z) - 0.02, z],
      [1.2, 0.18, 0.9],
      8,
    );
    builder.sphere(
      "matte",
      palette.stone,
      0.05,
      [x + 0.2, surfaceAt(x + 0.2, z) + 0.01, z + (index % 2) * 0.1],
      [1.2, 0.7, 1],
      5,
    );
  });
};

const buildLookout = (builder: AttractionBuilder) => {
  const { x, z } = rock;
  builder.sphere(
    "matte",
    rockColour,
    0.62,
    [x, 0.3, z],
    [1.15, 0.8, 1],
    builder.isFar ? 6 : 12,
  );
  builder.sphere(
    "matte",
    shade(rockColour, 0.88),
    0.45,
    [x - 0.55, 0.15, z + 0.25],
    [1, 0.7, 1],
    builder.isFar ? 5 : 10,
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      shade(rockColour, 1.1),
      0.3,
      [x + 0.45, 0.1, z - 0.3],
      [1, 0.6, 1.1],
      8,
    );
    builder.box(
      "matte",
      shade(rockColour, 0.75),
      [0.5, 0.02, 0.03],
      [x + 0.1, 0.55, z + 0.5],
      [0.3, 0.4, 0.2],
    );
  }
  addMeerkat(builder, [x, rock.top - 0.05, z], 0, 1.1, false);
  if (builder.isFar) {
    builder.sphere(
      "matte",
      fur,
      0.09,
      [lookoutNeck[0], lookoutNeck[1] + 0.07, lookoutNeck[2]],
      [1, 1, 1.2],
      5,
    );
  }
};

const buildPups = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* Two pups sitting at the open burrows */
  [burrows[3], burrows[4]].forEach((burrow, index) => {
    const [x, y, z] = burrowMouth(burrow);
    addMeerkat(
      builder,
      [x + 0.28, y - 0.03, z + 0.15],
      index === 0 ? 0.5 : -0.7,
      0.62,
    );
  });
};

/** A thorny camelthorn bush, a seedpod or two, and a dry log. */
const buildGrounds = (builder: AttractionBuilder) => {
  const bush = { x: -2.6, z: -2.0 };
  builder.bar(
    "matte",
    palette.darkTimber,
    [bush.x, 0, bush.z],
    [bush.x + 0.1, 0.9, bush.z],
    0.1,
    5,
  );
  builder.sphere(
    "matte",
    "#7a8a3a",
    0.75,
    [bush.x + 0.1, 1.15, bush.z],
    [1.3, 0.45, 1.1],
    builder.isFar ? 6 : 12,
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "matte",
    "#8a9a4a",
    0.5,
    [bush.x + 0.45, 1.3, bush.z + 0.2],
    [1.2, 0.4, 1],
    10,
  );
  [-0.4, 0.5].forEach((dx) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [bush.x + 0.1, 0.8, bush.z],
      [bush.x + dx, 1.08, bush.z + dx * 0.3],
      0.05,
      4,
    );
  });
  [
    [-2.2, -1.5],
    [-2.9, -1.6],
    [-2.4, -2.5],
  ].forEach(([x, z], index) => {
    builder.add(
      "matte",
      "#8a6a3a",
      new ConeGeometry(0.035, 0.22, 5).rotateZ(Math.PI / 2),
      {
        at: [x, 0.025, z],
        rotation: [0, index * 1.3, 0],
        scale: [1, 1, 0.5],
      },
    );
  });
  builder.cylinder("matte", "#a0866a", {
    radius: 0.1,
    length: 1.1,
    at: [-1.9, 0.1, 1.9],
    axis: "x",
    segments: 8,
  });
  builder.cylinder("matte", "#a0866a", {
    radius: 0.06,
    length: 0.4,
    at: [-1.4, 0.18, 1.95],
    axis: "z",
    segments: 6,
  });
  /* A little food chain post: sun, grass, beetle, meerkat, eagle */
  const post = { x: 1.15, z: 2.5 };
  builder.box(
    "matte",
    palette.darkTimber,
    [0.07, 0.95, 0.07],
    [post.x, 0.47, post.z],
  );
  builder.box(
    "paint",
    palette.cream,
    [0.85, 0.3, 0.04],
    [post.x, 0.85, post.z + 0.04],
  );
  ["#f2c12e", "#5f9a3c", palette.black, fur, "#6b4a2a"].forEach(
    (colour, index) => {
      const iconX = post.x - 0.34 + index * 0.17;
      builder.cylinder("paint", colour, {
        radius: 0.05,
        length: 0.02,
        at: [iconX, 0.85, post.z + 0.07],
        axis: "z",
        segments: 8,
      });
      if (index < 4) {
        builder.box(
          "paint",
          "#c0392b",
          [0.05, 0.012, 0.012],
          [iconX + 0.085, 0.85, post.z + 0.075],
        );
      }
    },
  );
};

/** A shiny dung beetle, scuttling about. */
const buildBeetle = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#2a2a38", 0.05, [0, 0.03, 0], [1, 0.6, 1.3], 6);
  builder.sphere(
    "paint",
    "#1f1f28",
    0.025,
    [0, 0.03, 0.065],
    [1.2, 0.8, 0.8],
    4,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.black,
      [0.1, 0.008, 0.008],
      [side * 0.03, 0.012, 0],
      [0, side * 0.4, 0],
    );
  });
};

/** A tawny eagle circling overhead, which is why someone keeps watch. */
const buildEagle = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#6b4a2a", 0.12, [0, 0, 0], [0.8, 0.6, 1.8], 8);
  builder.sphere("paint", "#8a6a48", 0.07, [0, 0.04, 0.22], [1, 1, 1.1], 6);
  builder.add(
    "paint",
    "#e8b93a",
    new ConeGeometry(0.025, 0.07, 4).rotateX(Math.PI / 2),
    { at: [0, 0.03, 0.3] },
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      "#5a3d22",
      [0.55, 0.025, 0.24],
      [side * 0.32, 0.03, 0],
      [0, 0, side * 0.12],
    );
    builder.box(
      "paint",
      "#3a2716",
      [0.22, 0.02, 0.18],
      [side * 0.68, 0.06, -0.03],
      [0, side * 0.2, side * 0.2],
    );
  });
  builder.box("paint", "#5a3d22", [0.16, 0.02, 0.2], [0, 0, -0.26]);
};

export const meerkatMoundModel: CuriosityModel = {
  kind: "meerkat-mound",
  islandId: "sunscorch-sands",
  name: "Meerkat Mound",
  fact: "Meerkats live in groups in the Kalahari Desert and dig burrows to escape the heat. They can't make their own food, so they hunt for beetles, grubs, scorpions and lizards to get the nutrition they need. While the others hunt, one meerkat stands guard on a rock and gives a sharp bark if it spots an eagle.",
  curriculumLink:
    "Science, Year 3: identify that animals, including humans, need the right types and amount of nutrition, and that they cannot make their own food; they get nutrition from what they eat.",
  footprint: 4.2,
  setting: "inland",
  padColour: sand,
  signSpot: { x: -0.9, z: 3.45 },
  build: (builder) => {
    buildMound(builder);
    buildLookout(builder);
    buildPups(builder);
    buildGrounds(builder);
    addSignBoard(builder, [-0.9, 0, 3.45], signColour);
  },
  moving: [
    ...burrows
      .filter((burrow) => burrow.hasMeerkat)
      .map((burrow, index): MovingPart => ({
        name: `meerkat ${String(index + 1)}`,
        pivot: burrowMouth(burrow),
        build: (builder) => {
          addMeerkat(builder, [0, -burrow.lift, 0], burrow.turn);
        },
        motion: {
          kind: "rise",
          reach: 6,
          height: burrow.lift,
          period: 1.4 + index * 0.35,
          phase: burrow.phase,
        },
      })),
    {
      name: "lookout head",
      pivot: lookoutNeck,
      build: (builder) => {
        addMeerkatHead(builder, [0, 0, 0], 0, 1.1);
      },
      motion: { kind: "nod", axis: "y", reach: 7, amplitude: 0.9, period: 3.2 },
    },
  ],
  wanderers: [
    {
      name: "beetles",
      build: buildBeetle,
      count: 4,
      centre: { x: 0.2, z: 1.9 },
      radius: 1.2,
      speed: 0.25,
    },
    {
      name: "eagle",
      build: buildEagle,
      count: 1,
      centre: { x: 0, z: -0.5 },
      radius: 3.2,
      speed: 1.4,
      height: 5.5,
      bob: 0.15,
    },
  ],
  blockers: [
    { x: mound.x, z: mound.z, radius: 1.8 },
    { x: rock.x, z: rock.z, radius: 0.7 },
    { x: rock.x - 0.55, z: rock.z + 0.25, radius: 0.45 },
    { x: -2.6, z: -2.0, radius: 0.2 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Stand guard with them",
    news: "You stood up tall beside the lookout and scanned the sky. Bark! An eagle! Every meerkat dived down its burrow.",
  },
};
