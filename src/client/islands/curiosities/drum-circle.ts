import { CylinderGeometry, LatheGeometry, Vector2 } from "three";
import {
  addBush,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const drumWood = "#8a4f2a";
const drumWoodDark = "#5e3218";
const drumWoodLight = "#b0703a";
const skin = "#eedcb6";
const skinRim = "#c9b083";
const cord = "#d8c48e";
const logWood = "#6e4a2e";
const stoolWood = "#a7713f";
const matColours = ["#d9862c", "#b8342a", "#f2c23a", "#2f7a3a", "#1f1d1a"];
const shakerGourd = "#c8a04a";
const signColour = "#b8342a";

const circle = { x: 0, z: -0.2 };
const ringRadius = 1.85;
const stoolRadius = 2.5;
const matRadius = 2.7;

/** A spot on the ring, `degrees` round from the front (+z). */
const ringSpot = (
  degrees: number,
  radius = ringRadius,
): { x: number; z: number; turn: number } => {
  const angle = (degrees * Math.PI) / 180;
  return {
    x: circle.x + Math.sin(angle) * radius,
    z: circle.z + Math.cos(angle) * radius,
    turn: angle,
  };
};

/* Djembes round the ring, open at the front so visitors can walk in */
const djembes = [
  { degrees: 40, size: 1.0, wood: drumWood, isMoving: true },
  { degrees: 85, size: 0.85, wood: drumWoodLight, isMoving: true },
  { degrees: 275, size: 1.12, wood: drumWoodDark, isMoving: false },
  { degrees: 320, size: 0.92, wood: drumWood, isMoving: true },
].map((drum) => ({ ...drum, ...ringSpot(drum.degrees) }));
const talkingDrums = [ringSpot(128), ringSpot(232)];
const logDrum = { x: circle.x, z: circle.z - 2.05, length: 1.7, radius: 0.36 };
const stoolDegrees = [40, 85, 128, 232, 275, 320];

/** How tall a djembe is, to its skin. */
const djembeHeight = (size: number): number => 0.62 * size;

const buildMat = (builder: AttractionBuilder) => {
  const segments = builder.segments(40, 12);
  const rings = builder.isFar ? 1 : matColours.length;
  for (let ring = 0; ring < rings; ring++) {
    builder.cylinder("matte", matColours[ring], {
      radius: matRadius - ring * 0.42,
      length: 0.02 + ring * 0.003,
      at: [circle.x, 0.01 + ring * 0.0015, circle.z],
      segments,
    });
  }
  if (builder.isFar) {
    return;
  }
  /* Woven zig-zags round the outer band */
  for (let mark = 0; mark < 24; mark++) {
    const angle = (mark / 24) * Math.PI * 2;
    builder.box(
      "matte",
      matColours[mark % 2 === 0 ? 4 : 2],
      [0.06, 0.01, 0.22],
      [
        circle.x + Math.sin(angle) * (matRadius - 0.2),
        0.027,
        circle.z + Math.cos(angle) * (matRadius - 0.2),
      ],
      [0, angle + (mark % 2 === 0 ? 0.5 : -0.5), 0],
    );
  }
};

/** A djembe: a goblet carved from one log, with a goatskin laced on top. */
const addDjembe = (
  builder: AttractionBuilder,
  { x, z, size, wood }: { x: number; z: number; size: number; wood: string },
) => {
  const height = djembeHeight(size);
  builder.lathe(
    "matte",
    wood,
    [
      [0.2 * size, 0],
      [0.17 * size, 0.08 * size],
      [0.1 * size, 0.28 * size],
      [0.12 * size, 0.36 * size],
      [0.24 * size, 0.52 * size],
      [0.26 * size, height - 0.02],
      [0, height - 0.02],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 6 : 16,
  );
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "matte",
    skinRim,
    0.26 * size,
    0.022,
    [x, height - 0.04, z],
    "y",
    16,
  );
  builder.torus(
    "matte",
    cord,
    0.11 * size,
    0.015,
    [x, 0.33 * size, z],
    "y",
    10,
  );
  /* Tuning cords laced in a zig-zag from the rim down to the waist */
  const laces = 10;
  for (let lace = 0; lace < laces; lace++) {
    const angle = (lace / laces) * Math.PI * 2;
    const next = angle + Math.PI / laces;
    builder.bar(
      "matte",
      cord,
      [
        x + Math.sin(angle) * 0.265 * size,
        height - 0.06,
        z + Math.cos(angle) * 0.265 * size,
      ],
      [
        x + Math.sin(next) * 0.125 * size,
        0.36 * size,
        z + Math.cos(next) * 0.125 * size,
      ],
      0.012,
      3,
    );
  }
  /* A carved band of triangles round the foot */
  for (let notch = 0; notch < 8; notch++) {
    const angle = (notch / 8) * Math.PI * 2;
    builder.box(
      "matte",
      shade(wood, 0.7),
      [0.05 * size, 0.06 * size, 0.01],
      [
        x + Math.sin(angle) * 0.185 * size,
        0.06 * size,
        z + Math.cos(angle) * 0.185 * size,
      ],
      [0, angle, Math.PI / 4],
    );
  }
};

const buildDjembeSkin = (size: number) => (builder: AttractionBuilder) => {
  builder.cylinder("matte", skin, {
    radius: 0.255 * size,
    length: 0.025,
    at: [0, 0, 0],
    segments: 16,
  });
  builder.cylinder("matte", shade(skin, 0.92), {
    radius: 0.12 * size,
    length: 0.027,
    at: [0, 0, 0],
    segments: 12,
  });
};

/** A talking drum: an hourglass whose cords squeeze to change its note. */
const addTalkingDrum = (
  builder: AttractionBuilder,
  { x, z, turn }: { x: number; z: number; turn: number },
) => {
  const along: Triple = [Math.cos(turn), 0, -Math.sin(turn)];
  const height = 0.42;
  /* A little stand, so it lies across the ring */
  [-0.2, 0.2].forEach((offset) => {
    builder.box(
      "matte",
      drumWoodDark,
      [0.06, height - 0.08, 0.06],
      [x + along[0] * offset, (height - 0.08) / 2, z + along[2] * offset],
    );
  });
  builder.box(
    "matte",
    drumWoodDark,
    [0.5, 0.05, 0.08],
    [x, height - 0.16, z],
    [0, turn, 0],
  );
  builder.add(
    "matte",
    drumWoodLight,
    builder.isFar ? cylinderGeometry(0.12, 0.6, 6) : hourglassGeometry(),
    { at: [x, height, z], rotation: [0, turn, Math.PI / 2] },
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((end) => {
    builder.add("matte", skin, cylinderGeometry(0.15, 0.02, 14), {
      at: [x + along[0] * end * 0.3, height, z + along[2] * end * 0.3],
      rotation: [0, turn, Math.PI / 2],
    });
  });
  /* Cords stretched from head to head */
  for (let string = 0; string < 12; string++) {
    const angle = (string / 12) * Math.PI * 2;
    const offset = (end: number): Triple => [
      x + along[0] * end * 0.29 + Math.cos(angle) * 0.15 * Math.sin(turn),
      height + Math.sin(angle) * 0.15,
      z + along[2] * end * 0.29 + Math.cos(angle) * 0.15 * Math.cos(turn),
    ];
    builder.bar("matte", cord, offset(-1), offset(1), 0.01, 3);
  }
  /* The curved stick it is played with */
  builder.bar(
    "matte",
    drumWoodDark,
    [x - along[2] * 0.3, 0.03, z + along[0] * 0.3],
    [
      x - along[2] * 0.3 + along[0] * 0.3,
      0.05,
      z + along[0] * 0.3 + along[2] * 0.3,
    ],
    0.025,
    4,
  );
};

/* Shapes for the talking drums, which lie turned across the ring */
const cylinderGeometry = (radius: number, length: number, segments: number) =>
  new CylinderGeometry(radius, radius, length, segments);

const hourglassGeometry = () =>
  new LatheGeometry(
    [
      [0.001, -0.3],
      [0.15, -0.3],
      [0.13, -0.2],
      [0.07, -0.04],
      [0.07, 0.04],
      [0.13, 0.2],
      [0.15, 0.3],
      [0.001, 0.3],
    ].map(([radius, height]) => new Vector2(radius, height)),
    16,
  );

/** A slit drum: a hollowed log with tongues of different lengths, for different notes. */
const buildLogDrum = (builder: AttractionBuilder) => {
  const { x, z, length, radius } = logDrum;
  const height = 0.18 + radius;
  builder.cylinder("matte", logWood, {
    radius,
    length,
    at: [x, height, z],
    axis: "x",
    segments: builder.isFar ? 8 : 20,
  });
  if (builder.isFar) {
    return;
  }
  /* The slit along the top, carved ends and two cradle stands */
  builder.box(
    "matte",
    "#1f1510",
    [length * 0.75, 0.02, 0.08],
    [x, height + radius - 0.005, z],
  );
  builder.box(
    "matte",
    "#1f1510",
    [0.03, 0.02, 0.24],
    [x - 0.1, height + radius - 0.005, z],
  );
  [-1, 1].forEach((end) => {
    builder.cylinder("matte", drumWoodLight, {
      radius: radius * 0.8,
      length: 0.02,
      at: [x + end * (length / 2 + 0.005), height, z],
      axis: "x",
      segments: 16,
    });
    builder.torus(
      "matte",
      shade(logWood, 0.7),
      radius * 0.5,
      0.02,
      [x + end * (length / 2 + 0.012), height, z],
      "x",
      14,
    );
    builder.box(
      "matte",
      drumWoodDark,
      [0.12, 0.26, radius * 2],
      [x + end * length * 0.32, 0.13, z],
    );
  });
  /* Painted bands round the log */
  [-0.45, 0.45].forEach((offset) => {
    builder.cylinder("paint", matColours[1], {
      radius: radius + 0.005,
      length: 0.06,
      at: [x + offset, height, z],
      axis: "x",
      segments: 20,
    });
  });
};

const buildBeater = (builder: AttractionBuilder) => {
  builder.bar("matte", drumWoodLight, [0, 0, 0], [0, -0.38, 0.12], 0.035, 5);
  builder.sphere("matte", "#3a2a20", 0.06, [0, -0.4, 0.13], [1, 1, 1], 8);
};

const addStool = (
  builder: AttractionBuilder,
  { x, z }: { x: number; z: number },
) => {
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", stoolWood, {
    radius: 0.22,
    length: 0.06,
    at: [x, 0.36, z],
    segments: 14,
  });
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2 + x;
    builder.bar(
      "matte",
      shade(stoolWood, 0.8),
      [x + Math.sin(angle) * 0.1, 0.34, z + Math.cos(angle) * 0.1],
      [x + Math.sin(angle) * 0.17, 0, z + Math.cos(angle) * 0.17],
      0.05,
      4,
    );
  }
};

/** Shakers and a bell left on the mat for anyone to join in. */
const buildPercussion = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [
    { x: 0.6, z: 0.3 },
    { x: -0.5, z: -0.6 },
  ].forEach(({ x, z }) => {
    builder.sphere("matte", shakerGourd, 0.13, [x, 0.13, z], [1, 1.05, 1], 12);
    builder.cylinder("matte", shade(shakerGourd, 0.85), {
      radius: 0.035,
      length: 0.16,
      at: [x, 0.3, z],
      segments: 6,
    });
    /* A net of beads round the gourd */
    for (let bead = 0; bead < 10; bead++) {
      const angle = (bead / 10) * Math.PI * 2;
      builder.sphere(
        "paint",
        bead % 2 === 0 ? matColours[1] : palette.white,
        0.022,
        [
          x + Math.sin(angle) * 0.13,
          0.12 + (bead % 3) * 0.03,
          z + Math.cos(angle) * 0.13,
        ],
        [1, 1, 1],
        5,
      );
    }
  });
  /* A double bell (agogo) and its stick */
  const bell: Triple = [-0.3, 0.06, 0.6];
  [0, 0.16].forEach((offset, index) => {
    builder.cylinder("metal", palette.brass, {
      radius: index === 0 ? 0.06 : 0.05,
      radiusEnd: 0.015,
      length: 0.2,
      at: [bell[0] + offset, bell[1], bell[2]],
      axis: "z",
      segments: 10,
    });
  });
  builder.bar(
    "metal",
    palette.brass,
    [bell[0], bell[1] + 0.03, bell[2] - 0.1],
    [bell[0] + 0.16, bell[1] + 0.03, bell[2] - 0.1],
    0.015,
    4,
  );
  builder.bar(
    "matte",
    drumWoodLight,
    [bell[0] - 0.1, 0.02, bell[2] + 0.25],
    [bell[0] + 0.15, 0.02, bell[2] + 0.35],
    0.025,
    4,
  );
};

export const drumCircleModel: CuriosityModel = {
  kind: "drum-circle",
  islandId: "jungle-reach",
  name: "Drum Circle",
  fact: "Drums are played all over the world. A djembe from West Africa is carved from one log and played with bare hands: hit the middle for a deep bass, the edge for a sharp slap. A talking drum changes its note when the cords are squeezed, so it can copy the sound of words. Playing together in a circle, everyone keeps the same beat.",
  curriculumLink:
    "Music, Key Stage 2: play and perform in solo and ensemble contexts, using their voices and playing musical instruments with increasing accuracy, fluency, control and expression.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 1.4, z: 3.3 },
  build: (builder) => {
    buildMat(builder);
    djembes.forEach((drum) => {
      addDjembe(builder, drum);
      if (!drum.isMoving) {
        builder.cylinder("matte", skin, {
          radius: 0.255 * drum.size,
          length: 0.025,
          at: [drum.x, djembeHeight(drum.size), drum.z],
          segments: builder.isFar ? 6 : 16,
        });
      }
    });
    talkingDrums.forEach((drum) => {
      addTalkingDrum(builder, drum);
    });
    buildLogDrum(builder);
    stoolDegrees.forEach((degrees) => {
      addStool(builder, ringSpot(degrees, stoolRadius));
    });
    buildPercussion(builder);
    addBush(builder, [-3.4, 0, 1.8], 0.5, "#2f7a35");
    addBush(builder, [3.3, 0, -1.9], 0.55, "#246a2c");
    addSignBoard(builder, [1.4, 0, 3.3], signColour);
  },
  moving: [
    ...djembes
      .filter(({ isMoving }) => isMoving)
      .map(({ x, z, size }, index): MovingPart => ({
        name: "djembe skin",
        pivot: [x, djembeHeight(size), z],
        build: buildDjembeSkin(size),
        motion: {
          kind: "nod",
          axis: index % 2 === 0 ? "x" : "z",
          reach: 6,
          amplitude: 0.14,
          period: 0.45 + index * 0.08,
          phase: index * 1.3,
        },
      })),
    {
      name: "log drum beater",
      pivot: [
        logDrum.x - 0.35,
        0.18 + logDrum.radius * 2 + 0.42,
        logDrum.z - 0.1,
      ],
      build: buildBeater,
      motion: { kind: "swing", axis: "x", amplitude: 0.35, period: 0.9 },
    },
  ],
  tune: [36, 36, 43, 36, 41, 45, 43, 36, 48, 45, 43, 36],
  blockers: [
    ...djembes.map(({ x, z, size }): LocalBlocker => ({
      x,
      z,
      radius: 0.3 * size,
    })),
    ...talkingDrums.map(({ x, z }): LocalBlocker => ({ x, z, radius: 0.35 })),
    { x: logDrum.x - 0.5, z: logDrum.z, radius: 0.45 },
    { x: logDrum.x + 0.5, z: logDrum.z, radius: 0.45 },
  ],
  play: {
    label: "Play the drums",
    news: "Boom, boom, ka-tak! You kept the beat on the djembe while the log drum boomed along. Everyone in the circle played together.",
    tune: [36, 43, 36, 43, 45, 48, 45, 43, 36],
  },
};
